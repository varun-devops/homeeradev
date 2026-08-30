/**
 * Apply the CORS policy the admin panel's uploads need.
 *
 *   node scripts/set-r2-cors.mjs          # apply, then verify
 *   node scripts/set-r2-cors.mjs --show   # print the current policy only
 *
 * Product media goes from the browser straight to R2 (see
 * SETUP_R2_IMAGEKIT.md step 3b), and a browser will only send that request if
 * the bucket names the origin. Without this every upload fails with
 * "Upload failed — check the connection, or the bucket's CORS rules."
 *
 * Uses the S3 PutBucketCors API with the credentials in .env.local.
 *
 * NOTE ON PERMISSIONS: changing a bucket's configuration is not an object
 * operation, so the usual "Object Read & Write" R2 token is refused with 403
 * here even though it uploads files perfectly well. This needs a token with
 * "Admin Read & Write". If you would rather not issue one, set the policy in
 * the dashboard instead — SETUP_R2_IMAGEKIT.md step 3b has the JSON.
 */
import { createHash, createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadEnv, r2Configured, r2CredentialProblems, R2_CREDENTIAL_HELP } from './r2-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv(join(__dirname, '..', '.env.local'));

if (!r2Configured()) {
  console.error('\nR2 is not configured. See SETUP_R2_IMAGEKIT.md.\n');
  process.exit(1);
}
const problems = r2CredentialProblems();
if (problems.length) {
  console.error('\nR2 credentials are not the right shape:\n');
  for (const p of problems) console.error('    ' + p);
  console.error('\n' + R2_CREDENTIAL_HELP + '\n');
  process.exit(1);
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;
const REGION = 'auto';
const HOST = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * Origins allowed to upload. localhost is kept so uploads work while
 * developing; drop it here if you would rather they did not.
 */
const ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL,
  'https://www.homeraa.com',
  'https://homeraa.com',
  'http://localhost:3000',
].filter((o) => o && /^https?:\/\//.test(o));

const uniqueOrigins = [...new Set(ORIGINS)];

const CORS_XML =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">' +
  '<CORSRule>' +
  uniqueOrigins.map((o) => `<AllowedOrigin>${o}</AllowedOrigin>`).join('') +
  // PUT is what the presigned upload uses. GET/HEAD cost nothing to allow and
  // keep direct r2.dev reads working from a browser if they are ever needed.
  '<AllowedMethod>PUT</AllowedMethod>' +
  '<AllowedMethod>GET</AllowedMethod>' +
  '<AllowedMethod>HEAD</AllowedMethod>' +
  '<AllowedHeader>content-type</AllowedHeader>' +
  '<MaxAgeSeconds>3600</MaxAgeSeconds>' +
  '</CORSRule>' +
  '</CORSConfiguration>';

const sha256 = (d) => createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => createHmac('sha256', k).update(d).digest();

/** Sign one request against the bucket with a `?cors` subresource. */
function signed(method, body) {
  const canonicalUri = `/${encodeURIComponent(BUCKET)}`;
  const canonicalQuery = 'cors=';
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body ?? '');

  const headers = { host: HOST, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  if (body) {
    // S3 requires Content-MD5 on PutBucketCors.
    headers['content-md5'] = createHash('md5').update(body).digest('base64');
    headers['content-type'] = 'application/xml';
  }

  const names = Object.keys(headers).sort();
  const signedHeaders = names.join(';');
  const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join('');

  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${SECRET_KEY}`, dateStamp), REGION), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return {
    url: `https://${HOST}${canonicalUri}?cors`,
    headers: {
      ...Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [
          k === 'content-md5' ? 'Content-MD5' : k === 'content-type' ? 'Content-Type' : k,
          v,
        ]),
      ),
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

async function show() {
  const { url, headers } = signed('GET', '');
  const res = await fetch(url, { method: 'GET', headers });
  const text = await res.text();
  console.log(`\nGET  bucket CORS -> ${res.status}`);
  console.log(text.trim() || '(no policy set)');
}

if (process.argv.includes('--show')) {
  await show();
  process.exit(0);
}

console.log(`\nBucket: ${BUCKET}`);
console.log('Allowing uploads from:');
for (const o of uniqueOrigins) console.log(`  ${o}`);

const { url, headers } = signed('PUT', CORS_XML);
const res = await fetch(url, { method: 'PUT', headers, body: CORS_XML });
if (!res.ok) {
  console.error(`\n[x] PUT bucket CORS failed (${res.status}):`);
  console.error((await res.text()).slice(0, 400));
  if (res.status === 403) {
    console.error(
      '\nThat is a token scope, not a wrong key. Bucket configuration is not an\n' +
        'object operation, so an "Object Read & Write" token is refused here even\n' +
        'though it uploads files perfectly well.\n\n' +
        'Either issue a token with "Admin Read & Write" and re-run this, or set\n' +
        'the policy in the dashboard: R2 -> your bucket -> Settings -> CORS policy.\n' +
        'The JSON is in SETUP_R2_IMAGEKIT.md step 3b.\n',
    );
  } else {
    console.error('\nSet it by hand instead — SETUP_R2_IMAGEKIT.md step 3b.\n');
  }
  process.exit(1);
}
console.log(`\nPUT  bucket CORS -> ${res.status} applied`);

// Verify the way a browser actually asks: a preflight for the real upload.
const origin = uniqueOrigins.find((o) => o.includes('homeraa')) ?? uniqueOrigins[0];
const pre = await fetch(`https://${HOST}/${encodeURIComponent(BUCKET)}/preflight-probe.mp4`, {
  method: 'OPTIONS',
  headers: {
    Origin: origin,
    'Access-Control-Request-Method': 'PUT',
    'Access-Control-Request-Headers': 'content-type',
  },
});
const allowOrigin = pre.headers.get('access-control-allow-origin');
const allowMethods = pre.headers.get('access-control-allow-methods');
console.log(`\nPreflight from ${origin}: ${pre.status}`);
console.log(`  access-control-allow-origin:  ${allowOrigin ?? '(none)'}`);
console.log(`  access-control-allow-methods: ${allowMethods ?? '(none)'}`);

const good = pre.ok && allowOrigin && /PUT/i.test(allowMethods ?? '');
console.log(good ? '\nUploads from the browser are allowed.\n' : '\n[!] Preflight did not confirm PUT — check the policy above.\n');
process.exit(good ? 0 : 1);
