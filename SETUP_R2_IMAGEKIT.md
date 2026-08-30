# Media setup — Cloudflare R2 + ImageKit

This replaces **Cloudinary** as Homeera's media pipeline.

```
Admin uploads a photo
        │
        ▼
  Cloudflare R2  ──(pull origin)──►  ImageKit  ──►  Browser
  (raw originals,                    (resize, AVIF/WebP,
   $0 egress)                         global CDN cache)
```

R2 holds the original file forever and never charges egress. ImageKit reads from
R2 once, then serves every visitor a resized, AVIF-converted, CDN-cached copy.

Nothing below breaks the live site: until you paste the keys, the code keeps
serving the existing Cloudinary URLs. The switch happens the moment
`NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` is set.

---

## Step 1 — Create the Cloudflare R2 bucket

1. Sign up at **https://dash.cloudflare.com/sign-up** (free, no card for R2's free tier).
2. Left sidebar → **R2 Object Storage** → **Create bucket**.
   - **Name:** `homeera-media`
   - **Location:** *Automatic*, or **Asia-Pacific (APAC)** since your customers are in India.
   - Click **Create bucket**.
3. Open the bucket → **Settings** tab → **Public access** → **R2.dev subdomain** →
   **Allow access**. Confirm.
   Copy the URL it shows — it looks like:
   ```
   
   ```
   > This public URL is only used by ImageKit as its origin. Visitors never see it.

### Get the R2 API keys

4. Back on the **R2 Object Storage** overview page → right sidebar → **Manage API tokens**
   → **Create API token**.
   - **Token name:** `homeera-uploads`
   - **Permissions:** **Object Read & Write**
   - **Specify bucket:** `homeera-media`
   - **TTL:** Forever
   - **Create Account API token**
5. The next screen shows these **once** — copy all three now:
   - **Access Key ID**
   - **Secret Access Key**
   - **Endpoint** — `https://704f6246854c1f64c681165b38a27f6b.r2.cloudflarestorage.com`
     (the `<ACCOUNT_ID>` part is your **Account ID**)

---

## Step 2 — Create the ImageKit account and point it at R2

1. Sign up at **https://imagekit.io/registration** (free tier: 20 GB bandwidth/month).
2. During onboarding it asks for an **ImageKit ID**. Yours is `tggbtkbmp`, so
   the delivery endpoint is `https://ik.imagekit.io/tggbtkbmp`.
3. Left sidebar → **External storage** (older UI: *Settings → External storage*) →
   **Add new origin**.
   - **Origin type:** **Web server / Web folder**
   - **Origin name:** `r2`
   - **Base URL:** paste the R2 public URL from Step 1.3
     (e.g. `https://pub-2a4f9c8b….r2.dev`)
   - Leave **Forward query params** off.
   - **Submit**.
4. Left sidebar → **URL-endpoints** → **Add new URL-endpoint** (or edit the default).
   - **Endpoint identifier:** leave blank so it stays `https://ik.imagekit.io/tggbtkbmp`
   - **Origin preference:** move the **`r2`** origin you just made into the list
     (it must be listed, above *Media library* is fine).
   - **Save**.
5. Left sidebar → **Developer options → API keys**. Copy:
   - **Public key** (`public_…`)
   - **Private key** (`private_…`)  ← SECRET. Paste it into `.env.local`, never
     into this file — this file is committed to git.
   - **URL-endpoint** (`https://ik.imagekit.io/tggbtkbmp`)

> **Sanity check before moving on:** upload any test file to the R2 bucket via the
> Cloudflare dashboard (say `test.jpg`), then open
> `https://ik.imagekit.io/tggbtkbmp/test.jpg?tr=w-200` in a browser.
> If the resized image loads, the R2 → ImageKit link works. Delete the test file after.

---

## Step 3 — Paste the keys

Add these to **`.env.local`** (local) and to **Vercel → Project → Settings →
Environment Variables** (production). Values marked SECRET must never be
prefixed `NEXT_PUBLIC_`.

> **Paste them into `.env.local`, not into `.env.example` or this file.** Both
> of those are committed to git; `.env.local` is the only one `.gitignore`
> covers. Keep each value alone on its line — a trailing `# comment` after a
> value is read as part of the value by some parsers, which turns a 32-character
> key into a 45-character one and fails every upload.
>
> `.env.local` is local only. Vercel never sees it, so the same values must be
> entered in the Vercel dashboard separately for the live site.

```bash
# ---- ImageKit (delivery) ----
# Setting this one variable switches all delivery over to ImageKit.
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/tggbtkbmp
IMAGEKIT_PUBLIC_KEY=public_xxxxxxxxxxxxxxxxxxxxxxxx
# SECRET — server only
IMAGEKIT_PRIVATE_KEY=private_xxxxxxxxxxxxxxxxxxxxxx

# ---- Cloudflare R2 (storage) ----
# Account id and access key id are 32 hex characters; the secret is 64.
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# SECRET — server only
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# SECRET — server only
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=homeera-media
# The r2.dev public URL from Step 1.3 — used by the migration script only.
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxx.r2.dev
```

Keep the existing `CLOUDINARY_*` vars in place until Step 4 finishes — the
migration script reads from Cloudinary.

---

## Step 3b — Allow the admin panel to upload to the bucket

**Required, or every upload in the admin panel fails.**

Product photos and video go from the browser straight to R2, not through the
app. A serverless function on Vercel caps its request body at 4.5 MB and
rejects anything larger with a plain-text error before our code runs, so a
video could never be uploaded through it. Instead the app signs a short-lived
URL and the browser PUTs the file to R2 itself.

A browser will only do that if the bucket allows the origin, so R2 needs a
CORS rule. Cloudflare dashboard → **R2** → your bucket → **Settings** →
**CORS policy** → **Add CORS policy**, and paste:

```json
[
  {
    "AllowedOrigins": [
      "https://www.homeraa.com",
      "https://homeraa.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

Only `PUT` is needed — reads are served by ImageKit, not the browser. Keep
`localhost:3000` so uploads work while developing; drop it if you would
rather they did not.

**Symptom if this is missing:** the upload fails immediately with a message
about CORS, and the browser console shows a blocked cross-origin request. The
file is never written.

---

## Step 4 — Move the existing media across

With the keys in `.env.local`, from the project root:

```bash
node scripts/migrate-media-to-r2.mjs --dry-run   # shows what will move, changes nothing
node scripts/migrate-media-to-r2.mjs             # does it
```

The script:
- reads every `image_url`, `gallery_urls[]` and `video_url` in the `products`
  table plus `collections.image_url`,
- downloads each Cloudinary asset,
- uploads it to R2 under `products/<filename>`,
- rewrites the database rows to the new ImageKit URLs,
- skips anything already migrated, so it is safe to re-run.

It prints a summary and writes `scripts/data/media-migration.json` as a record of
every old → new URL, so the change can be reversed if needed.

**Hero videos** live at `homeera/hero/clip.mp4` and `homeera/hero/slim.mp4` on
Cloudinary; the script moves those too and they are served from
`https://ik.imagekit.io/tggbtkbmp/hero/…` afterwards.

---

## Step 5 — Verify, then retire Cloudinary

1. `npm run build && npm run start`, open the shop, and confirm in DevTools →
   Network that image requests go to `ik.imagekit.io` and come back as
   `image/avif` at roughly the size of the box they render in.
2. Push to Vercel with the same env vars set.
3. Once production looks right, run `npm uninstall cloudinary` and delete the
   `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` vars. Keep
   `CLOUDINARY_CLOUD_NAME` until you retire the account — the migration script
   uses it to reach the old assets, and it is not a secret.
   **Done.** The app no longer depends on the Cloudinary package at all:
   uploads go straight to R2 via `src/lib/r2.ts`.

> Leave the Cloudinary account itself alone for a couple of weeks — it costs
> nothing and is your rollback if anything went wrong in the migration.

---

## What ImageKit does automatically once connected

| Behaviour | How |
|---|---|
| AVIF / WebP by browser | `f-auto` on every URL this app builds |
| Quality tuned per image | `q-auto` |
| Right size per device | `srcset` with `w-320 … w-1600`, so phones fetch ~30 KB, not 300 KB |
| Never re-fetches R2 | ImageKit caches the origin pull; R2 egress is $0 anyway |
| Video posters | `?tr=so-0` grabs frame 0 of a video as a still image |

## Free-tier ceilings to watch

| Service | Free | What blows it |
|---|---|---|
| R2 | 10 GB storage, 1M writes/mo | ~10,000 product photos. Not a concern. |
| ImageKit | 20 GB bandwidth/mo | At ~40 KB per optimized image that is ~500,000 image views/mo. |
| Supabase | 500 MB database | Only text/URLs live there. Not a concern. |
| Vercel | 100 GB bandwidth/mo | HTML only now that media is off-platform. |

The single biggest saving: video. A 3 MB hero clip served to 10,000 visitors is
30 GB — over the ImageKit free tier alone. That is why the hero uses
`preload="metadata"` and a poster image, so the clip only downloads for people
who actually stay on the page.
