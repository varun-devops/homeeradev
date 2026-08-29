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
 * is skipped. Every old -> new pair is written to
 * scripts/data/media-migration.json so the change can be reversed.
 *
 * Setup and env vars: SETUP_R2_IMAGEKIT.md
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env.local manually (no dotenv dependency) - same as import-catalog.mjs.
const envPath = join(root, '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const DRY = process.argv.includes('--dry-run');

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

function die(msg) {
  console.error(`\n[x] ${msg}\n`);
  process.exit(1);
}

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  die('Supabase env missing (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
}
if (!DRY && (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET)) {
  die(
    'R2 env missing. Fill R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET ' +
      '- see SETUP_R2_IMAGEKIT.md step 1.',
  );
}

const IK = (NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '').replace(/\/+$/, '');
const R2_PUB = (R2_PUBLIC_URL || '').replace(/\/+$/, '');
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
// R2 upload (AWS SigV4, single PUT). Mirrors src/lib/r2.ts.
// -------------------------------------------------------------------
const sha256 = (d) => createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => createHmac('sha256', k).update(d).digest();
const uriEncode = (s) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encodeKey = (k) => k.split('/').map(uriEncode).join('/');

async function r2Put(key, body, contentType) {
  const host = `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeKey(R2_BUCKET)}/${encodeKey(key)}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const cacheControl = 'public, max-age=31536000, immutable';
  const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalHeaders =
    `cache-control:${cacheControl}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${R2_SECRET_ACCESS_KEY}`, dateStamp), 'auto'), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    body,
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'Cache-Control': cacheControl,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`R2 PUT ${res.status} ${detail.slice(0, 200)}`);
  }
}

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
  let key = segments.join('/');
  // Everything already lives under a "homeera/" prefix on Cloudinary; the
  // bucket is Homeera's, so that level is redundant.
  key = key.replace(/^homeera\//, '');
  return key || null;
}

const deliveryUrl = (key) => (IK ? `${IK}/${key}` : `${R2_PUB}/${key}`);

const EXT_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

function contentTypeFor(key, headerValue) {
  if (headerValue) return headerValue;
  const ext = key.split('.').pop();
  return EXT_TYPES[(ext || '').toLowerCase()] || 'application/octet-stream';
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
if (!DRY) {
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
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  ${f.url} - ${f.error}`);
  console.log('\nThose rows still point at Cloudinary and keep working. Re-run to retry.');
}
if (DRY) console.log('\nRe-run without --dry-run to perform the migration.');
