/**
 * Imports the Homeera catalogue into Supabase + Cloudinary.
 *
 *   1. Reads scripts/data/import.json (66 products, parsed from the xlsx).
 *   2. Uploads each product's photo (scripts/data/media/<SKU>.jpg) to
 *      Cloudinary under folder "homeera/products", public_id = SKU.
 *   3. Upserts each product row into public.products with the returned
 *      secure image URL.
 *
 * Run AFTER applying supabase/schema.sql:
 *   node scripts/import-catalog.mjs
 *
 * Idempotent: re-running upserts on `sku` and reuses Cloudinary public_ids
 * (overwrite=true), so it's safe to run again.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

// Load .env.local manually (no dotenv dependency).
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    // Node 20 has no native WebSocket; we only use REST here, so stub the
    // realtime transport to avoid its constructor blowing up on init.
    realtime: { transport: function () {} },
  },
);

const slugify = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const products = JSON.parse(
  readFileSync(join(root, 'scripts/data/import.json'), 'utf8'),
);

console.log(`Importing ${products.length} products…\n`);

let uploaded = 0;
let imported = 0;
let failed = 0;

for (const p of products) {
  try {
    // 1. Upload image (if present) -------------------------------------
    let imageUrl = null;
    const imgPath = join(root, 'scripts/data/media', `${p.sku}.jpg`);
    if (p.image_file && existsSync(imgPath)) {
      const res = await cloudinary.uploader.upload(imgPath, {
        folder: 'homeera/products',
        public_id: p.sku,
        overwrite: true,
        resource_type: 'image',
      });
      imageUrl = res.secure_url;
      uploaded++;
    }

    // 2. Upsert product row --------------------------------------------
    const slug = `${slugify(p.name)}-${p.sku.toLowerCase()}`;
    const row = {
      sku: p.sku,
      name: p.name,
      slug,
      vendor: p.vendor || null,
      category: p.category,
      category_slug: p.category_slug,
      sub_category: p.sub_category,
      sub_category_slug: p.sub_category_slug,
      material: p.material || null,
      variant: p.variant || null,
      size: p.size || null,
      weight_kg: p.weight_kg ?? null,
      price: p.price,
      // Written prose about the object, produced by build-catalog.mjs. The
      // product page renders this as "About this piece".
      description: p.description ?? null,
      image_url: imageUrl,
      is_active: true,
    };

    const { error } = await sb.from('products').upsert(row, { onConflict: 'sku' });
    if (error) throw error;
    imported++;
    process.stdout.write(
      `✓ ${p.sku.padEnd(22)} ${p.name}${imageUrl ? '' : '  (no image)'}\n`,
    );
  } catch (err) {
    failed++;
    console.error(`✗ ${p.sku}: ${err.message || err}`);
  }
}

// ------------------------------------------------------------------
// Prune: hide anything in the DB that is no longer in the sheet.
//
// Rebuilding the catalogue can re-key a product (a vendor code changing,
// say), which would otherwise leave the old row behind as a duplicate on
// the storefront. We deactivate rather than delete so historical orders
// keep resolving their product_id.
// ------------------------------------------------------------------
const liveSkus = products.map((p) => p.sku);
const { data: stale, error: staleErr } = await sb
  .from('products')
  .select('id, sku')
  .eq('is_active', true)
  .not('sku', 'in', `(${liveSkus.map((s) => `"${s}"`).join(',')})`);

if (staleErr) {
  console.error(`\nCould not check for stale products: ${staleErr.message}`);
} else if (stale?.length) {
  await sb
    .from('products')
    .update({ is_active: false })
    .in('id', stale.map((r) => r.id));
  console.log(`\nDeactivated ${stale.length} product(s) no longer in the sheet:`);
  for (const r of stale) console.log(`  – ${r.sku}`);
}

// ------------------------------------------------------------------
// Re-seed the collection tree from what we just imported.
//
// The storefront deck reads `collections` / `sub_collections`, so if the
// sheet's taxonomy changes those tables have to follow or the shop shows
// stale or empty cards. Doing it here means the tables are always correct
// after an import, without anyone remembering to run a migration.
// ------------------------------------------------------------------
const collections = new Map();
const subCollections = new Map();
for (const p of products) {
  if (!collections.has(p.category_slug)) {
    collections.set(p.category_slug, { slug: p.category_slug, label: p.category, image_url: null });
  }
  if (!subCollections.has(p.sub_category_slug)) {
    subCollections.set(p.sub_category_slug, {
      slug: p.sub_category_slug,
      label: p.sub_category,
      collection_slug: p.category_slug,
      image_url: null,
    });
  }
}

// Give each one a representative photo — the first product image in it.
const { data: imaged } = await sb
  .from('products')
  .select('category_slug, sub_category_slug, image_url')
  .eq('is_active', true)
  .not('image_url', 'is', null);
for (const row of imaged ?? []) {
  const c = collections.get(row.category_slug);
  if (c && !c.image_url) c.image_url = row.image_url;
  const s = subCollections.get(row.sub_category_slug);
  if (s && !s.image_url) s.image_url = row.image_url;
}

const { error: colErr } = await sb
  .from('collections')
  .upsert([...collections.values()], { onConflict: 'slug' });
const { error: subErr } = await sb
  .from('sub_collections')
  .upsert([...subCollections.values()], { onConflict: 'slug' });

// Drop collection rows the sheet no longer has, so the deck can't show a
// card with nothing behind it.
await sb.from('sub_collections').delete().not('slug', 'in', `(${[...subCollections.keys()].map((s) => `"${s}"`).join(',')})`);
await sb.from('collections').delete().not('slug', 'in', `(${[...collections.keys()].map((s) => `"${s}"`).join(',')})`);

if (colErr || subErr) {
  console.error(`\nCollection re-seed failed: ${(colErr ?? subErr).message}`);
  console.error('Run supabase/migration-09-restore-sheet-collections.sql to fix it.');
} else {
  console.log(`\nCollections: ${collections.size} · sub-collections: ${subCollections.size}`);
  for (const c of collections.values()) {
    const subs = [...subCollections.values()].filter((s) => s.collection_slug === c.slug);
    console.log(`  ${c.label} → ${subs.map((s) => s.label).join(', ')}`);
  }
}

console.log(
  `\nDone. Imported ${imported}/${products.length} · images uploaded ${uploaded} · failed ${failed}`,
);
process.exit(failed ? 1 : 0);
