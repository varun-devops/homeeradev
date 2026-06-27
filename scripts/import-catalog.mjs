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
      description: [p.material, p.variant, p.size && `Size ${p.size} cm`]
        .filter(Boolean)
        .join(' · '),
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

console.log(
  `\nDone. Imported ${imported}/${products.length} · images uploaded ${uploaded} · failed ${failed}`,
);
process.exit(failed ? 1 : 0);
