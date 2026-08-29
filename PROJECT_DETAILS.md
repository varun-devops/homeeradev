# Homeera — Project Details & Handoff

A production-ready e-commerce site for Homeera (brass / wood / marble home décor).
Built on **Next.js 14 (App Router)**, **Supabase** (Postgres + Auth),
**Cloudflare R2 + ImageKit** (product media), and **Razorpay** (payments).

Media setup and the Cloudinary migration: **[SETUP_R2_IMAGEKIT.md](SETUP_R2_IMAGEKIT.md)**.

---

## 1. Admin access

| | |
|---|---|
| **Admin URL** | `/admin/login` (e.g. http://localhost:3000/admin/login) |
| **Email** | `admin@homeera.com` |
| **Password** | `1234` |

> Change the password after first login: **Admin → Account**.
> To create another admin, set `is_admin = true` on their `profiles` row in Supabase,
> or re-run `node scripts/seed-admin.mjs` (edit the email/password at the top first).

### Admin panel sections
- **Dashboard** — revenue (paid), orders, registered users, products, cart items
- **Products** — search, inline **price edit**, **show/hide** toggle (hides from shop instantly)
- **Orders** — every order, customer, items, payment status (`created`/`paid`/`failed`)
- **Users** — everyone registered, with their cart + order activity
- **Account** — change admin password

---

## 2. Storefront

| Page | Route |
|---|---|
| Home (video hero) | `/` |
| Shop (collections → sub-collections → products) | `/shop` |
| Product detail | `/shop/<slug>` |
| About us | `/about` |
| Contact | `/contact` |
| Cart | `/cart` (login required) |
| Checkout (Razorpay) | `/checkout` |
| Order confirmation | `/checkout/success` |
| Customer account + orders | `/profile` (login required) |
| Customer sign in / up | `/auth/login`, `/auth/register` |

- **Catalogue:** 66 products built from `list of items (1).xlsx` by
  `scripts/build-catalog.mjs`. **One** top-level collection — Home Décor —
  with the sheet's sub-categories as its sub-collections (Sculptures,
  Ornaments, Table Clocks, Flower Pots, Planters, Utility & Living,
  Brass Drinkware, Floor Lamps, Trays). Every product has a photo pulled
  straight out of the workbook and a written description.
- **Prices** are in **INR (₹)**, set per sub-collection in
  `scripts/build-catalog.mjs` because the spreadsheet's price columns are
  empty — **edit them in Admin → Products**.
- **Checkout** collects a structured address (pin code, locality, city,
  state, name, street, mobile) and will not enable payment until the pin
  code passes `/api/serviceability`.

> Rebuilding the catalogue after the sheet changes — **PowerShell**:
> ```powershell
> node scripts/build-catalog.mjs; if ($?) { node scripts/import-catalog.mjs }
> ```
> (Windows PowerShell 5.1 has no `&&`. In bash/zsh the usual
> `node scripts/build-catalog.mjs && node scripts/import-catalog.mjs` works.)
>
> Step 1 reads the workbook and writes `scripts/data/import.json` plus one
> `<SKU>.jpg` per product. Step 2 uploads the images and upserts Supabase.
> Products no longer in the sheet are deactivated, not deleted, so past
> orders keep resolving. Product copy lives in `scripts/product-copy.mjs`,
> keyed by SKU — edit it there, not in `import.json`, which is regenerated.
>
> No external tools are needed: the `.xlsx` is unpacked in-process with
> Node's zlib, so there is no dependency on `unzip` being on PATH.

---

## 3. Services & credentials

All secrets live in `.env.local` (git-ignored). **Never commit this file.**

```
NEXT_PUBLIC_SUPABASE_URL=https://fbyslpmwppbqoxixseus.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # public, safe in browser
SUPABASE_SERVICE_ROLE_KEY=...            # SECRET — server only
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=       # https://ik.imagekit.io/<id> — switches delivery on
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=                    # SECRET
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=                        # SECRET
R2_SECRET_ACCESS_KEY=                    # SECRET
R2_BUCKET=homeera-media
R2_PUBLIC_URL=                           # the bucket's r2.dev URL (ImageKit's origin)
CLOUDINARY_CLOUD_NAME=dcdchbc8p          # legacy, migration script only
RAZORPAY_KEY_ID=rzp_test_xxxxx           # paste real key to enable payments
RAZORPAY_KEY_SECRET=...                  # SECRET
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- **Supabase project:** `fbyslpmwppbqoxixseus` (dashboard → SQL ran from `supabase/schema.sql`)
- **R2 bucket:** `homeera-media`, keys `products/<SKU>.jpg`, `uploads/…`, `hero/clip.mp4`
- **Cloudinary:** retired. The npm package is uninstalled and all media has been
  migrated to R2; only `CLOUDINARY_CLOUD_NAME` remains, for the migration script.
- **Razorpay:** Test mode until real keys + business KYC for live mode.

> ⚠️ The keys above were shared in chat during the build. **Rotate the
> service-role key, Cloudinary secret, and Razorpay secret** before going public.

---

## 4. Still to do before going live

1. **Apply the migrations** in `supabase/` in order. `migration-08-single-collection-and-addresses.sql`
   is required by the current storefront — it collapses the catalogue to one
   collection and adds the structured address columns checkout reads.
2. **Rebuild + re-import the catalogue** (see section 2) so product
   descriptions and the sub-collection tree match the sheet.
3. **Razorpay keys** — paste `RAZORPAY_KEY_ID` (`rzp_test_…`) + `RAZORPAY_KEY_SECRET`
   into `.env.local`, restart. Test card `4111 1111 1111 1111`, any future expiry/CVV.
4. **Disable email confirmation** (so customers log in instantly):
   Supabase → **Authentication → Sign In / Providers → Email → turn off "Confirm email" → Save**.
5. **Review prices** in Admin → Products.
6. **Rotate the secrets** listed above, and change the admin password —
   it is currently documented in this file in plain text.

See **[ADMIN_GAPS.md](ADMIN_GAPS.md)** for the full audit of what the admin
panel still needs (stock enforcement, GST invoicing, policy pages,
transactional email, shipping rules, pagination).

---

## 5. Run / build

```bash
npm install
npm run dev      # dev server on :3000
npm run build    # production build
npm run start    # serve the production build
```

Helper scripts (one-offs, already run):
```bash
node scripts/import-catalog.mjs   # re-import products + images (idempotent)
node scripts/seed-admin.mjs       # (re)create the default admin
```

---

## 6. Database schema (Supabase)

`supabase/schema.sql` — tables: `profiles`, `products`, `cart_items`, `orders`,
`order_items`. RLS is on everywhere:
- products: public reads active rows; admins read/write all
- cart: each user only their own
- orders: owner reads own, admin reads all
- a trigger auto-creates a `profiles` row on signup
Server-side writes (import, payment capture, admin edits) use the service-role key,
which bypasses RLS.

---

## 7. Deploy (recommended: Vercel)

1. Push the repo to GitHub.
2. Import into **Vercel** → it auto-detects Next.js.
3. Add every var from `.env.local` into **Vercel → Project → Settings → Environment Variables**
   (set `NEXT_PUBLIC_SITE_URL` to your real domain).
4. In **Supabase → Authentication → URL Configuration**, add your production URL to
   **Site URL** and **Redirect URLs**.
5. Switch Razorpay to **Live** keys once KYC is approved.

---

## 8. Performance model

| Layer | How it is fast |
|---|---|
| **Shop + product pages** | Prerendered and served from Vercel's edge. Nothing on the render path reads cookies, so the HTML is identical for every visitor. |
| **Catalogue reads** | `unstable_cache` in `src/lib/catalog.ts`, tagged `catalog`. Every admin write calls `revalidateTag(CATALOG_TAG)`, so a price edit or show/hide is live immediately — no visitor pays a Supabase round trip in the meantime. A 1-hour TTL backstops rows edited straight in the Supabase dashboard. |
| **Images** | `src/components/Img.tsx` emits a `srcset` and ImageKit resizes on the fly (`f-auto` → AVIF/WebP, `q-auto`). A phone fetches ~30 KB per card instead of the 1600px original. |
| **Video** | `preload="metadata"` plus a CDN-generated poster frame, so the hero paints as an image and the clip only downloads for visitors who stay. |
| **Bag quantity** | Fetched by `AddToCart` on the client (`getCartQuantity`), which is what keeps the product page cacheable. |

> **If you add a new storefront read**, cache it the same way — `unstable_cache(fn, [key], { tags: [CATALOG_TAG], revalidate: 3600 })` — and make sure whatever writes it calls `revalidateTag(CATALOG_TAG)`. An uncached read silently reintroduces a per-request database call on every page view.

---

## 9. Responsiveness

- Global side gutter is the `--pad-x` token (`clamp(1.75rem, 5.5vw, 5rem)`) — every page
  uses it via `.container` or component padding, so left/right spacing adapts to mobile.
- **Admin panel:** desktop sidebar collapses into a fixed top bar + slide-in drawer below
  860px; tables scroll horizontally rather than overflow.
- Shop deck, product grid, cart, checkout and parallax all reflow to single-column on phones.
```
