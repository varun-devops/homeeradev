/**
 * Regenerates the whole Homeera catalogue straight from the source
 * spreadsheet — "list of items (1).xlsx" in the project root.
 *
 * It writes two things:
 *   • scripts/data/import.json  — one record per sheet row
 *   • scripts/data/media/<SKU>.jpg — the photo embedded in that row
 *
 * Catalogue model produced here (matches the storefront):
 *   • ONE top-level collection: "Home Décor". Every product sits inside it.
 *   • The sub-collection is the sheet's "Sub category" column, normalised
 *     to a clean plural label (ORNAMENT → Ornaments, FLOWER POT → Flower
 *     Pots, FLOOX LAMP → Floor Lamps, TREY → Trays, …).
 *   • `description` is written prose about the object, not an attribute
 *     dump — the product page shows it as the "About this piece" copy.
 *
 * The .xlsx is read directly (it is just a zip of XML + JPEGs), so there is
 * no spreadsheet dependency to install.
 *
 * Run:  node scripts/build-catalog.mjs
 * Then: node scripts/import-catalog.mjs   (pushes to Supabase + Cloudinary)
 *
 * Idempotent — safe to re-run whenever the sheet changes.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const XLSX = join(root, 'list of items (1).xlsx');
const OUT_JSON = join(root, 'scripts/data/import.json');
const OUT_MEDIA = join(root, 'scripts/data/media');

const CATEGORY = 'Home Décor';
const CATEGORY_SLUG = 'home-decor';

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
// 1. Unzip the workbook into a temp dir and pull out the bits we need
// ──────────────────────────────────────────────────────────────────
if (!existsSync(XLSX)) {
  console.error(`Source sheet not found: ${XLSX}`);
  process.exit(1);
}
const tmp = mkdtempSync(join(tmpdir(), 'homeera-xlsx-'));
try {
  execFileSync('unzip', ['-o', '-q', XLSX, '-d', tmp], { stdio: 'inherit' });
} catch {
  console.error('Could not unzip the workbook — is `unzip` on PATH?');
  rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

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
for (const m of readFileSync(join(tmp, 'xl/sharedStrings.xml'), 'utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)) {
  let text = '';
  for (const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += t[1];
  shared.push(decode(text));
}

// Cells, row by row. Note the `<c .../>` self-closing form has to be matched
// too, otherwise an empty cell swallows the next cell's value.
const rows = new Map();
const sheetXml = readFileSync(join(tmp, 'xl/worksheets/sheet1.xml'), 'utf8');
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
for (const m of readFileSync(join(tmp, 'xl/drawings/_rels/drawing1.xml.rels'), 'utf8').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
  relMap[m[1]] = m[2].replace('../', '');
}
const imageForRow = new Map();
for (const m of readFileSync(join(tmp, 'xl/drawings/drawing1.xml'), 'utf8').matchAll(/<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g)) {
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

function describe(p) {
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
let lastPlanterName = 'Wooden Planter';

for (const rowNum of [...rows.keys()].filter((r) => r > 1).sort((a, b) => a - b)) {
  const c = rows.get(rowNum);

  const rawSub = c[9];
  if (!rawSub) continue;                    // not a product row
  const sub_category = SUB_LABEL[rawSub] ?? titleCase(rawSub);
  const sub_category_slug = slugify(sub_category);

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
    category: CATEGORY,
    category_slug: CATEGORY_SLUG,
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
  const src = join(tmp, 'xl/media', p.image_file);
  if (!existsSync(src)) {
    p.image_file = null;
    continue;
  }
  copyFileSync(src, join(OUT_MEDIA, `${p.sku}.jpg`));
  copied++;
}

writeFileSync(OUT_JSON, JSON.stringify(products, null, 2) + '\n');
rmSync(tmp, { recursive: true, force: true });

// ──────────────────────────────────────────────────────────────────
const bySub = new Map();
for (const p of products) bySub.set(p.sub_category, (bySub.get(p.sub_category) ?? 0) + 1);

console.log(`\n${products.length} products → ${OUT_JSON}`);
console.log(`${copied} photos → ${OUT_MEDIA}\n`);
console.log(`Collection: ${CATEGORY}`);
for (const [label, n] of [...bySub].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${String(n).padStart(3)}  ${label}`);
}
console.log(`\nExample:\n  ${products[0].name} (${products[0].sku})\n  ${products[0].description}`);
