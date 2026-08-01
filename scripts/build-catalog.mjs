/**
 * Regenerates the whole Homeera catalogue straight from the source
 * spreadsheet — "list of items (1).xlsx" in the project root.
 *
 * It writes two things:
 *   • scripts/data/import.json  — one record per sheet row
 *   • scripts/data/media/<SKU>.jpg — the photo embedded in that row
 *
 * Catalogue model produced here (matches the storefront):
 *   • The collection is the sheet's "Category" column — Home Décor,
 *     Bar & Entertaining, Lighting, Home & Garden, Home & Kitchen.
 *   • The sub-collection is the sheet's "Sub category" column, normalised
 *     to a clean plural label (ORNAMENT → Ornaments, FLOWER POT → Flower
 *     Pots, FLOOX LAMP → Floor Lamps, TREY → Trays, …).
 *   • Both are taken verbatim from the sheet; nothing is merged.
 *   • `description` is written prose about the object, not an attribute
 *     dump — the product page shows it as the "About this piece" copy.
 *
 * The .xlsx is read directly — it is just a ZIP of XML + JPEGs, unpacked
 * in-process with Node's zlib. Nothing to install, and no reliance on an
 * `unzip` binary being on PATH (it isn't, on stock Windows).
 *
 * Run:  node scripts/build-catalog.mjs
 * Then: node scripts/import-catalog.mjs   (pushes to Supabase + Cloudinary)
 * PowerShell one-liner for both:
 *   node scripts/build-catalog.mjs; if ($?) { node scripts/import-catalog.mjs }
 *
 * Idempotent — safe to re-run whenever the sheet changes.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRODUCT_COPY } from './product-copy.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = join(root, 'list of items (1).xlsx');
const OUT_JSON = join(root, 'scripts/data/import.json');
const OUT_MEDIA = join(root, 'scripts/data/media');

// Sheet category → storefront collection label. The sheet shouts in caps
// and has one typo ("LIGHTNING"), so the display label is mapped rather
// than title-cased blindly.
const CATEGORY_LABEL = {
  'HOME DÉCOR': 'Home Décor',
  'HOME DECOR': 'Home Décor',
  'BAR & ENTERTAINING': 'Bar & Entertaining',
  LIGHTNING: 'Lighting',            // sheet typo for LIGHTING
  'HOME & GARDEN': 'Home & Garden',
  'HOME & KITCHEN': 'Home & Kitchen',
};

// Order the collections appear in on the shop deck. Anything unlisted
// falls to the end, alphabetically.
const CATEGORY_ORDER = [
  'Home Décor',
  'Home & Garden',
  'Bar & Entertaining',
  'Home & Kitchen',
  'Lighting',
];

// ── the sheet carries no prices, so these are the standing list prices
//    per sub-collection (whole rupees, unchanged from the live catalogue).
const PRICE = {
  Ornaments: 4100,
  'Table Clocks': 5100,
  Sculptures: 7100,
  'Flower Pots': 3400,
  'Utility & Living': 3200,
  'Brass Drinkware': 3100,
  'Floor Lamps': 8100,
  Planters: 3800,
  Trays: 3000,
};

// Sheet sub-category → storefront sub-collection label.
const SUB_LABEL = {
  ORNAMENT: 'Ornaments',
  'TABLE CLOCK': 'Table Clocks',
  SCULPTURES: 'Sculptures',
  'FLOWER POT': 'Flower Pots',
  'UTILITY & LIVING': 'Utility & Living',
  'BRASS DRINK WARE': 'Brass Drinkware',
  'FLOOX LAMP': 'Floor Lamps',   // sheet typo for FLOOR LAMP
  'PLANTER B.': 'Planters',
  'PLANTER S.': 'Planters',
  TREY: 'Trays',
};

// ──────────────────────────────────────────────────────────────────
// 1. Read the workbook
// ──────────────────────────────────────────────────────────────────

/**
 * Minimal ZIP reader — an .xlsx is a ZIP archive.
 *
 * Implemented in-process with zlib rather than shelling out to `unzip`,
 * because `unzip` is not present on a stock Windows PATH (it exists in Git
 * Bash but not in PowerShell or cmd), and this script has to run wherever
 * the merchant runs it. Returns a Map of entry name → Buffer.
 *
 * Only the two things a spreadsheet uses are handled: stored (method 0) and
 * deflate (method 8). Anything else in the archive is skipped rather than
 * throwing, since we only ever ask for a handful of known entries.
 */
function readZip(file) {
  const buf = readFileSync(file);

  // The End Of Central Directory record lives in the last 64KB, after a
  // comment of unknown length — so scan backwards for its signature.
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 65557; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a ZIP archive (no end-of-central-directory record)');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16); // offset of the central directory

  const files = new Map();
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break; // central file header
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // The local header repeats the name and extra fields, and its extra
    // field length often differs from the central one — so the data offset
    // must be computed from the LOCAL header, not the central directory.
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, inflateRawSync(raw));

    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

if (!existsSync(XLSX)) {
  console.error(`Source sheet not found: ${XLSX}`);
  process.exit(1);
}

let zip;
try {
  zip = readZip(XLSX);
} catch (err) {
  console.error(`Could not read the workbook: ${err.message}`);
  process.exit(1);
}

/** Read one entry out of the workbook as text. */
const zipText = (name) => {
  const b = zip.get(name);
  if (!b) throw new Error(`Missing "${name}" inside the workbook`);
  return b.toString('utf8');
};

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&');

const colToNum = (col) => [...col].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);

// Shared string table.
const shared = [];
for (const m of zipText('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  let text = '';
  for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
  shared.push(decode(text));
}

// Cells, row by row. Note the `<c .../>` self-closing form has to be matched
// too, otherwise an empty cell swallows the next cell's value.
const rows = new Map();
const sheetXml = zipText('xl/worksheets/sheet1.xml');
for (const rm of sheetXml.matchAll(/<row[^>]*\sr="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
  const cells = {};
  for (const cm of rm[2].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const ref = /r="([A-Z]+)\d+"/.exec(cm[1])?.[1];
    if (!ref) continue;
    const type = /t="([^"]+)"/.exec(cm[1])?.[1];
    let v = /<v>([\s\S]*?)<\/v>/.exec(cm[2] ?? '')?.[1];
    if (type === 's' && v != null) v = shared[+v];
    else if (v != null) v = decode(v);
    if (v != null && String(v).trim() !== '') cells[colToNum(ref)] = String(v).trim().replace(/\s+/g, ' ');
  }
  rows.set(+rm[1], cells);
}

// Which embedded JPEG is anchored to which sheet row.
const relMap = {};
for (const m of zipText('xl/drawings/_rels/drawing1.xml.rels').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2].replace('../', '');
}
const imageForRow = new Map();
for (const m of zipText('xl/drawings/drawing1.xml').matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g)) {
  const row = /<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/.exec(m[0])?.[1];
  const embed = /r:embed="([^"]+)"/.exec(m[0])?.[1];
  if (row != null && embed && relMap[embed]) imageForRow.set(+row + 1, relMap[embed]);
}

// ──────────────────────────────────────────────────────────────────
// 2. Shape each row into a product record
// ──────────────────────────────────────────────────────────────────
const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// The sheet is hand-typed and its misspellings would otherwise land on the
// storefront verbatim. Only unambiguous corrections belong here.
const SPELLING = {
  gentelmen: 'Gentlemen',
  metel: 'Metal',
  embose: 'Embossed',
  wate: 'Watch',
  campus: 'Compass',
  dear: 'Deer',
  angle: 'Angel',
  trey: 'Tray',
  anitique: 'Antique',
  planted: 'Plated',
  floox: 'Floor',
  aluminium: 'Aluminium',
};

const titleCase = (s) =>
  s
    .toLowerCase()
    // Split on spaces AND slashes so "water/compass" capitalises both halves.
    .split(/(\s+|\/)/)
    .map((w) => {
      if (!w || /^(\s+|\/)$/.test(w)) return w;
      const fixed = SPELLING[w.replace(/[^a-z]/g, '')];
      if (fixed) return w.replace(/[a-z]+/, fixed);
      return w[0].toUpperCase() + w.slice(1);
    })
    .join('')
    .replace(/\bWith Out\b/i, 'Without')
    .replace(/\bSet Of 2\b/i, 'Set of Two')
    .replace(/\bSet 2\b/i, 'Set of Two')
    .replace(/\bS\/2\b/i, 'Set of Two')
    .trim();

// Vendor short code used inside the SKU, derived from the sheet's own
// item numbers (HE-**ASH**-HD-ORN-1001).
const vendorCode = (vendor) => {
  const v = vendor.toUpperCase();
  if (v.includes('A / S') || v.includes('A/S')) return 'ASH';
  if (v.includes('HEIM')) return 'HOC';
  if (v.includes('F.K')) return 'FKB';
  if (v.includes('S .A') || v.includes('S.A')) return 'SAH';
  if (v.includes('AZMI')) return 'AZH';
  return 'HE';
};
const SUB_CODE = {
  Ornaments: 'ORN',
  'Table Clocks': 'TC',
  Sculptures: 'SCL',
  'Flower Pots': 'FLP',
  'Utility & Living': 'UL',
  'Brass Drinkware': 'BDW',
  'Floor Lamps': 'FL',
  Planters: 'PL',
  Trays: 'TR',
};

// Description copy building blocks, keyed by sub-collection slug.
const SUB_COPY = {
  ornaments: {
    noun: 'ornament',
    line: 'Made to be picked up and turned over — a small, deliberate object for a shelf, console or desk.',
  },
  'table-clocks': {
    noun: 'table clock',
    line: 'A working timepiece built the old way: a quartz movement set into a solid, weighted case.',
  },
  sculptures: {
    noun: 'sculpture',
    line: 'Cast, hand-worked and mounted — a piece with enough presence to anchor a room on its own.',
  },
  'flower-pots': {
    noun: 'flower pot',
    line: 'Sized for cut stems or a single plant, and sealed inside so it can be used as well as looked at.',
  },
  'utility-living': {
    noun: 'piece',
    line: 'Made to be handled every day, and to look better for it.',
  },
  'brass-drinkware': {
    noun: 'drinking vessel',
    line: 'Food-safe lacquered inside, so it moves from the bar cart to the table and back.',
  },
  'floor-lamps': {
    noun: 'floor lamp',
    line: 'A tall, quiet light source, wired to Indian standards and supplied ready to plug in.',
  },
  planters: {
    noun: 'planter',
    line: 'Built around a removable liner, so the outer body never sits in water.',
  },
  trays: {
    noun: 'tray',
    line: 'Deep enough to carry a full service, light enough to move one-handed.',
  },
};

const finishCopy = (finish) => {
  const f = finish.toLowerCase();
  if (f.includes('antique')) return 'given an antiqued finish that only deepens with age';
  if (f.includes('polish')) return 'hand-polished to a warm, even shine';
  if (f.includes('matte')) return 'brought down to a soft matte finish';
  if (f.includes('powder')) return 'powder-coated to a hard, even surface';
  if (f.includes('plated') || f.includes('planted') || f.includes('plating')) {
    const metal = f.replace(/\s*(plated|planted|plating)\s*/g, '').trim();
    return metal ? `plated in ${metal}` : 'metal-plated';
  }
  if (f.includes('gloss red')) return 'lacquered in a high-gloss red';
  if (f.includes('gloss black')) return 'lacquered in a high-gloss black';
  if (f.includes('black gold')) return 'finished in black with gold detailing';
  if (f.includes('green gold')) return 'finished in verdigris green over gold';
  if (f.includes('gold')) return 'finished in gold';
  if (f.includes('black')) return 'finished in a deep black';
  if (f.includes('grey')) return 'finished in a soft grey';
  if (f.includes('white') || f.includes('ivory')) return 'finished in ivory white';
  return `finished in ${f}`;
};

const dimensionLine = (size) => {
  if (!size) return '';
  if (!/^[\d.x× &]+$/i.test(size)) return `Available in ${size.toLowerCase()}.`;
  const parts = size.split(/\s*&\s*/).map((s) => s.replace(/x/gi, ' × ').replace(/\s+/g, ' ').trim());
  return parts.length > 1
    ? `Measures ${parts.join(' cm and ')} cm.`
    : `Measures ${parts[0]} cm.`;
};

/**
 * Product description.
 *
 * Prefers the hand-written copy in product-copy.mjs, which says what the
 * object actually is. Falls back to a generated line built from the sheet's
 * own material/finish/sub-category columns, so a row added to the
 * spreadsheet still produces a usable page before anyone writes copy for it.
 * Either way the dimensions from the sheet are appended.
 */
function describe(p) {
  const written = PRODUCT_COPY[p.sku];
  if (written) return [written, dimensionLine(p.size)].filter(Boolean).join(' ');

  const sub = SUB_COPY[p.sub_category_slug] ?? { noun: 'piece', line: '' };
  const material = (p.material || '').replace(/\s*\/\s*/g, ' and ').toLowerCase();
  const opening = material
    ? `${p.name} — a hand-made ${sub.noun} in ${material}`
    : `${p.name} — a hand-made ${sub.noun}`;
  return [
    opening + (p.variant ? `, ${finishCopy(p.variant)}.` : '.'),
    sub.line,
    'Produced in small batches and finished by hand, so no two pieces are exactly alike.',
    dimensionLine(p.size),
  ]
    .filter(Boolean)
    .join(' ');
}

const products = [];
const usedSku = new Set();
let lastVendor = '';
let lastCategory = '';
let lastPlanterName = 'Wooden Planter';

for (const rowNum of [...rows.keys()].filter((r) => r > 1).sort((a, b) => a - b)) {
  const c = rows.get(rowNum);

  const rawSub = c[9];
  if (!rawSub) continue;                    // not a product row
  const sub_category = SUB_LABEL[rawSub] ?? titleCase(rawSub);
  const sub_category_slug = slugify(sub_category);

  // Collection straight from the sheet's Category column. Like the vendor,
  // it carries down the sheet's merged-looking blocks so a colourway row
  // that leaves the cell blank still lands in the right collection.
  const rawCat = (c[6] ?? '').toUpperCase();
  const category = rawCat ? CATEGORY_LABEL[rawCat] ?? titleCase(rawCat) : lastCategory;
  if (category) lastCategory = category;
  const category_slug = slugify(category);

  // Vendor carries down the sheet's merged-looking blocks.
  const vendor = c[4] ? c[4].replace(/\s*\[.*?\]\s*/g, ' ').replace(/\s+/g, ' ').trim() : lastVendor;
  if (vendor) lastVendor = vendor;

  // Column H is "MATERIAL / FINISH"; column G is a spare variant note.
  const [rawMaterial, rawFinish] = (c[8] ?? '').split('/').map((s) => (s ?? '').trim());
  const material = rawMaterial ? titleCase(rawMaterial.replace(/&/g, ' & ')).replace(/\s+/g, ' ') : null;
  const variant = titleCase(c[7] || rawFinish || '') || null;

  // Size lives in column K; anything non-numeric there is a note, not a size.
  const size = c[11] && !/^\d{9,}$/.test(c[11]) ? c[11] : null;

  // Name: the sheet leaves the planter colourway rows unnamed, so build a
  // readable one from the colourway + body size instead of "Black".
  let name;
  if (sub_category === 'Planters') {
    // The colourway is in the variant cell on the sibling rows and only in
    // the "MATERIAL / FINISH" cell on the first row of each set.
    const colour =
      titleCase(c[7] || rawFinish || '').replace(/\s*Polished$/i, '') || 'Natural';
    const bodySize = rawSub === 'PLANTER S.' ? 'Small' : 'Large';
    name = `Wooden Planter — ${colour}, ${bodySize}`;
    lastPlanterName = name;
  } else {
    name = titleCase((c[3] || lastPlanterName).replace(/\.$/, ''));
  }

  // SKU: prefer the sheet's own item number; otherwise derive one in the
  // same shape from the vendor code, sub-collection code and barcode tail.
  let sku = c[5] && /^HE-/i.test(c[5]) ? c[5].toUpperCase() : null;
  if (!sku) {
    const tail = (c[12] ?? String(rowNum)).slice(-4);
    const code = rawSub === 'PLANTER S.' ? 'PLS' : rawSub === 'PLANTER B.' ? 'PLB' : SUB_CODE[sub_category] ?? 'GEN';
    sku = `HE-${vendorCode(vendor)}-HD-${code}-${tail}`;
  }
  // The sheet reuses one item number across two Ashoka pillars — keep both.
  let unique = sku;
  let n = 2;
  while (usedSku.has(unique)) unique = `${sku}-${n++}`;
  usedSku.add(unique);
  sku = unique;

  // Photo: rows without their own anchor are colourway siblings of the row
  // above, so they inherit that photo.
  const image_file = imageForRow.get(rowNum) ?? products[products.length - 1]?.image_file ?? null;

  const record = {
    sku,
    name,
    vendor: vendor || null,
    category,
    category_slug,
    sub_category,
    sub_category_slug,
    material,
    variant,
    size,
    // Several rows are shifted in the source and carry the barcode in the
    // weight column, so only accept a plausible parcel weight.
    weight_kg:
      c[10] && /^[\d.]+$/.test(c[10]) && Number(c[10]) > 0 && Number(c[10]) < 500
        ? Number(c[10])
        : null,
    price: PRICE[sub_category] ?? 3500,
    image_file: image_file ? image_file.replace('media/', '') : null,
  };
  record.description = describe(record);
  products.push(record);
}

// ──────────────────────────────────────────────────────────────────
// 3. Write import.json + copy every photo out as <SKU>.jpg
// ──────────────────────────────────────────────────────────────────
mkdirSync(OUT_MEDIA, { recursive: true });
for (const f of readdirSync(OUT_MEDIA)) unlinkSync(join(OUT_MEDIA, f));

let copied = 0;
for (const p of products) {
  if (!p.image_file) continue;
  // Straight out of the workbook in memory — no temp directory involved.
  const bytes = zip.get(`xl/media/${p.image_file}`);
  if (!bytes) {
    p.image_file = null;
    continue;
  }
  writeFileSync(join(OUT_MEDIA, `${p.sku}.jpg`), bytes);
  copied++;
}

writeFileSync(OUT_JSON, JSON.stringify(products, null, 2) + '\n');

// ──────────────────────────────────────────────────────────────────
// Collection → sub-collection tree, in deck order.
const tree = new Map();
for (const p of products) {
  if (!tree.has(p.category)) tree.set(p.category, new Map());
  const subs = tree.get(p.category);
  subs.set(p.sub_category, (subs.get(p.sub_category) ?? 0) + 1);
}

const rank = (label) => {
  const i = CATEGORY_ORDER.indexOf(label);
  return i === -1 ? CATEGORY_ORDER.length : i;
};

console.log(`\n${products.length} products → ${OUT_JSON}`);
console.log(`${copied} photos → ${OUT_MEDIA}\n`);
console.log(`${tree.size} collections:`);
for (const [label, subs] of [...tree].sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))) {
  const total = [...subs.values()].reduce((s, n) => s + n, 0);
  console.log(`\n  ${label}  (${total})`);
  for (const [sub, n] of [...subs].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(3)}  ${sub}`);
  }
}
console.log(`\nExample:\n  ${products[0].name} (${products[0].sku})\n  ${products[0].description}`);
