/**
 * Moves Homeera's media from Cloudinary to Cloudflare R2, and rewrites every
 * database row to the new ImageKit delivery URL.
 *
 *   node scripts/migrate-media-to-r2.mjs --dry-run   # report only
 *   node scripts/migrate-media-to-r2.mjs             # do it
 *
 * Covers products.image_url, products.gallery_urls[], products.video_url,
 * collections.image_url, sub_collections.image_url, and the two hero clips.
 *
 * Idempotent. Object keys are derived from the Cloudinary public_id, so a
 * re-run produces the same keys; anything already pointing at ImageKit or R2
 * is skipped, so once the migration has run this reports zero product and
 * collection rows -- a cheap way to confirm the catalogue is fully moved.
 * The two hero clips are keyed by a fixed override rather than read from the
 * database, so they are always listed; re-uploading them overwrites the same
 * objects and is harmless.
 *
 * Every old -> new pair is written to scripts/data/media-migration.json so
 * the change can be reversed.
 *
 * Setup and env vars: SETUP_R2_IMAGEKIT.md
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  loadEnv,
  r2Configured,
  r2CredentialProblems,
  R2_CREDENTIAL_HELP,
  r2Put,
  contentTypeFor,
  deliveryUrl,
} from './r2-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
loadEnv(join(root, '.env.local'));

const DRY = process.argv.includes('--dry-run');

function die(msg) {
  console.error(`\n[x] ${msg}\n`);
  process.exit(1);
}

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  die('Supabase env missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
}

if (!DRY) {
  if (!r2Configured()) {
    die(
      'R2 env missing. Fill R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / ' +
        'R2_BUCKET — see SETUP_R2_IMAGEKIT.md step 1.',
    );
  }
  // Catch a malformed key here rather than as one opaque 400 per file.
  const problems = r2CredentialProblems();
  if (problems.length) {
    console.error('\n[x] These R2 credentials are not the right shape:\n');
    for (const problem of problems) console.error(`    ${problem}`);
    console.error(`\n${R2_CREDENTIAL_HELP}\n`);
    process.exit(1);
  }
}

const IK = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '').replace(/\/+$/, '');
const R2_PUB = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
if (!IK && !R2_PUB) {
  die('Set NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT (preferred) or R2_PUBLIC_URL so the new URLs can be built.');
}
if (!IK) {
  console.warn(
    '[!] NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not set - rows will point straight at R2.\n' +
      '    That works, but images will not be resized or converted until you set it.\n',
  );
}

const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  // Node has no native WebSocket here; only REST is used, so stub the
  // realtime transport rather than let its constructor throw on init.
  realtime: { transport: function () {} },
});

// -------------------------------------------------------------------
// URL helpers
// -------------------------------------------------------------------
const isCloudinary = (u) => typeof u === 'string' && u.includes('res.cloudinary.com');
const alreadyMigrated = (u) =>
  typeof u === 'string' && ((IK && u.startsWith(IK)) || (R2_PUB && u.startsWith(R2_PUB)));

/**
 * Object key for a Cloudinary URL, derived from its public_id so re-runs are
 * stable. Drops the version segment and any inline transformations:
 *   .../upload/q_auto,f_auto/v123/homeera/products/SKU.jpg -> products/SKU.jpg
 */
function keyForCloudinaryUrl(url) {
  const after = url.split('/upload/')[1];
  if (!after) return null;
  const segments = after.split('/');
  // Leading segments are transformations (a_b,c_d) or a version (v123).
  while (segments.length > 1 && /^(v\d+|[a-z]{1,3}_[^/]*)$/.test(segments[0])) segments.shift();
  // Everything already lives under a "homeera/" prefix on Cloudinary; the
  // bucket is Homeera's, so that level is redundant.
  const key = segments.join('/').replace(/^homeera\//, '');
  return key || null;
}

// -------------------------------------------------------------------
// Transfer, memoised so a URL shared by several rows moves once.
// -------------------------------------------------------------------
const moved = new Map(); // old URL -> new URL
const failures = [];
let bytes = 0;

async function transfer(url, keyOverride) {
  if (!url || alreadyMigrated(url)) return url;
  // Local /images/... or a third party - not ours to move.
  if (!isCloudinary(url)) return url;
  if (moved.has(url)) return moved.get(url);

  const key = keyOverride || keyForCloudinaryUrl(url);
  if (!key) {
    failures.push({ url, error: 'could not derive an object key' });
    return url;
  }

  const next = deliveryUrl(key);

  if (DRY) {
    moved.set(url, next);
    console.log(`  would move  ${key}`);
    return next;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await r2Put(key, buf, contentTypeFor(key, res.headers.get('content-type')));
    bytes += buf.length;
    moved.set(url, next);
    console.log(`  ok  ${key}  (${(buf.length / 1024).toFixed(0)} KB)`);
    return next;
  } catch (err) {
    failures.push({ url, error: err.message });
    console.error(`  FAILED  ${key}: ${err.message}`);
    // Leave the row pointing at Cloudinary rather than breaking the image.
    return url;
  }
}

// -------------------------------------------------------------------
// Run
// -------------------------------------------------------------------
console.log(DRY ? '\nDRY RUN - nothing will be uploaded or written.\n' : '\nMigrating media to R2...\n');

// ---- products ----
const { data: products, error: pErr } = await sb
  .from('products')
  .select('id, sku, image_url, gallery_urls, video_url');
if (pErr) die(`Reading products failed: ${pErr.message}`);

console.log(`Products: ${products.length}`);
let productUpdates = 0;

for (const p of products) {
  const nextImage = await transfer(p.image_url);
  const nextGallery = [];
  for (const g of p.gallery_urls ?? []) nextGallery.push(await transfer(g));
  const nextVideo = await transfer(p.video_url);

  const changed =
    nextImage !== p.image_url ||
    nextVideo !== p.video_url ||
    JSON.stringify(nextGallery) !== JSON.stringify(p.gallery_urls ?? []);
  if (!changed) continue;
  productUpdates++;

  if (!DRY) {
    const { error } = await sb
      .from('products')
      .update({ image_url: nextImage, gallery_urls: nextGallery, video_url: nextVideo })
      .eq('id', p.id);
    if (error) failures.push({ url: p.sku, error: `row update: ${error.message}` });
  }
}

// ---- collections + sub_collections ----
let collectionUpdates = 0;
for (const table of ['collections', 'sub_collections']) {
  const { data, error } = await sb.from(table).select('slug, image_url');
  // sub_collections predates the image column in some schema versions.
  if (error) {
    console.log(`${table}: skipped (${error.message})`);
    continue;
  }
  console.log(`${table}: ${data.length}`);
  for (const row of data) {
    const next = await transfer(row.image_url);
    if (next === row.image_url) continue;
    collectionUpdates++;
    if (!DRY) {
      const { error: uErr } = await sb.from(table).update({ image_url: next }).eq('slug', row.slug);
      if (uErr) failures.push({ url: row.slug, error: `row update: ${uErr.message}` });
    }
  }
}

// ---- hero clips ----
// Fixed keys: src/lib/media.ts resolves the hero to hero/<name>.mp4.
const cloud = process.env.CLOUDINARY_CLOUD_NAME;
if (cloud) {
  console.log('Hero clips:');
  for (const name of ['clip', 'slim']) {
    await transfer(
      `https://res.cloudinary.com/${cloud}/video/upload/homeera/hero/${name}.mp4`,
      `hero/${name}.mp4`,
    );
  }
} else {
  console.log('Hero clips: skipped (CLOUDINARY_CLOUD_NAME not set)');
}

// ---- record ----
if (!DRY && moved.size) {
  writeFileSync(
    join(root, 'scripts/data/media-migration.json'),
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        endpoint: IK || R2_PUB,
        moved: Object.fromEntries(moved),
        failures,
      },
      null,
      2,
    ),
  );
}

console.log(
  `\n${DRY ? 'Would move' : 'Moved'} ${moved.size} file(s)` +
    (DRY ? '' : ` - ${(bytes / 1024 / 1024).toFixed(1)} MB`) +
    ` - ${productUpdates} product row(s) - ${collectionUpdates} collection row(s)` +
    ` - ${failures.length} failure(s)`,
);
if (!moved.size && !failures.length) {
  console.log('Nothing left to migrate — every row already points at the CDN.');
}
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f.url} - ${f.error}`);
  console.log('\nThose rows still point at Cloudinary and keep working. Re-run to retry.');
}
if (DRY && moved.size) console.log('\nRe-run without --dry-run to perform the migration.');
