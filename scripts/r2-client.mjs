/**
 * Cloudflare R2 uploads for the one-off scripts, over the S3 API.
 *
 * Mirrors src/lib/r2.ts, which the running app uses. Kept separate because
 * the scripts are plain .mjs run by node directly and cannot import the app's
 * TypeScript. Signed by hand rather than with @aws-sdk/client-s3: this needs
 * exactly one operation (PUT object), and the SDK is ~3 MB for it.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';

/**
 * Load .env.local into process.env. No dotenv dependency.
 *
 * Strips an unquoted trailing comment, because a line written as
 *   R2_ACCESS_KEY_ID=<32 hex>   # SECRET
 * otherwise yields a 45-character "key" that R2 rejects on every request.
 */
export function loadEnv(envPath) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let value = m[2].replace(/\s+#.*$/, '').trim();
    const q = value[0];
    if (value.length > 1 && (q === '"' || q === "'") && value[value.length - 1] === q) {
      value = value.slice(1, -1);
    }
    process.env[m[1]] = value;
  }
}

const sha256 = (d) => createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => createHmac('sha256', k).update(d).digest();
const uriEncode = (s) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const encodeKey = (k) => k.split('/').map(uriEncode).join('/');

/** True when every R2 variable needed to upload is present. */
export function r2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

/**
 * Check the credentials look right before the first upload, so a malformed
 * key surfaces as one clear message instead of one opaque 400 per file.
 * Returns an array of human-readable problems; empty means good.
 */
export function r2CredentialProblems() {
  const checks = [
    ['R2_ACCOUNT_ID', process.env.R2_ACCOUNT_ID, 32],
    ['R2_ACCESS_KEY_ID', process.env.R2_ACCESS_KEY_ID, 32],
    ['R2_SECRET_ACCESS_KEY', process.env.R2_SECRET_ACCESS_KEY, 64],
  ];
  return checks
    .filter(([, v, len]) => !new RegExp(`^[0-9a-f]{${len}}$`).test(v || ''))
    .map(([name, v, len]) => `${name}: got ${(v || '').length} chars, expected ${len} hex characters`);
}

export const R2_CREDENTIAL_HELP =
  'Cloudflare dashboard -> R2 -> Manage API tokens -> your token.\n' +
  'Copy "Access Key ID" (32 hex) and "Secret Access Key" (64 hex).\n' +
  'NOT the "Token value", which is longer and is only for Bearer auth.\n' +
  'Keep each value alone on its line in .env.local, with no trailing comment.';

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

/** Best-guess MIME type from an object key's extension. */
export function contentTypeFor(key, headerValue) {
  if (headerValue) return headerValue;
  const ext = (key.split('.').pop() || '').toLowerCase();
  return EXT_TYPES[ext] || 'application/octet-stream';
}

/** PUT one object into the bucket. Throws with R2's error body on failure. */
export async function r2Put(key, body, contentType) {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeKey(bucket)}/${encodeKey(key)}`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  // Objects are never rewritten in place, so they are safe to cache forever.
  // ImageKit honours this on its origin pull.
  const cacheControl = 'public, max-age=31536000, immutable';
  const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';

  const canonicalHeaders =
    `cache-control:${cacheControl}\n` +
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  // R2 has no regions; the S3 API still expects the literal "auto" in scope.
  const scope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), 'auto'), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    body,
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
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
  return key;
}

/**
 * The URL to store in the database for an uploaded object: the ImageKit
 * endpoint when configured (so it can be resized and format-converted),
 * otherwise the bucket's public URL.
 */
export function deliveryUrl(key) {
  const ik = (process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '').replace(/\/+$/, '');
  if (ik) return `${ik}/${key}`;
  const pub = (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');
  return pub ? `${pub}/${key}` : `/${key}`;
}
