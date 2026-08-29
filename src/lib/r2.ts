import { createHash, createHmac } from 'node:crypto';

/**
 * Cloudflare R2 uploads over the S3 API. SERVER ONLY.
 *
 * Signed by hand rather than with @aws-sdk/client-s3: this needs exactly one
 * operation (PUT object), and the SDK is ~3 MB of dependency for it. AWS
 * SigV4 is well specified and the single-PUT case is its simplest form.
 *
 * See SETUP_R2_IMAGEKIT.md for where each env var comes from.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
const BUCKET = process.env.R2_BUCKET ?? '';
// R2 has no regions; the S3 API still requires a region in the credential
// scope and expects the literal "auto".
const REGION = 'auto';

export function r2Configured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY && SECRET_KEY && BUCKET);
}

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest();

/** RFC 3986 encoding. encodeURIComponent leaves !'()* alone; SigV4 does not. */
function uriEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Encode an object key for the URL path, keeping the slashes as separators. */
function encodeKey(key: string): string {
  return key.split('/').map(uriEncode).join('/');
}

/**
 * PUT one object into the bucket. Returns the object key on success.
 * Throws with R2's error body on failure so the caller can surface it.
 */
export async function r2Put(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (!r2Configured()) throw new Error('R2 is not configured');

  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeKey(BUCKET)}/${encodeKey(key)}`;
  const url = `https://${host}${canonicalUri}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20240101T000000Z
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);

  // Objects are content-addressed by key and never rewritten in place, so they
  // are safe to cache forever. ImageKit honours this on its origin pull.
  const cacheControl = 'public, max-age=31536000, immutable';

  // Canonical headers must be lowercase, trimmed, and sorted by name.
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
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${SECRET_KEY}`, dateStamp), REGION), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const res = await fetch(url, {
    method: 'PUT',
    body: new Uint8Array(body),
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'Cache-Control': cacheControl,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`R2 upload failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  return key;
}

/**
 * A collision-free object key. The random suffix means re-uploading a file
 * with the same name never overwrites the old one — important because objects
 * are served with an immutable cache header.
 */
export function r2Key(folder: string, filename: string): string {
  const dot = filename.lastIndexOf('.');
  const ext = dot > 0 ? filename.slice(dot).toLowerCase() : '';
  const stem = (dot > 0 ? filename.slice(0, dot) : filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${folder}/${stem}-${suffix}${ext}`;
}
