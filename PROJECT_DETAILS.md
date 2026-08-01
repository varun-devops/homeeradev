# Homeera — Project Details & Handoff

A production-ready e-commerce site for Homeera (brass / wood / marble home décor).
Built on **Next.js 14 (App Router)**, **Supabase** (Postgres + Auth), **Cloudinary**
(product images), and **Razorpay** (payments).

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

> Rebuilding the catalogue after the sheet changes:
> ```
> node scripts/build-catalog.mjs     # sheet  → import.json + media/
> node scripts/import-catalog.mjs    # import.json → Supabase + Cloudinary
> ```
> Products no longer in the sheet are deactivated, not deleted, so past
> orders keep resolving.

---

## 3. Services & credentials

All secrets live in `.env.local` (git-ignored). **Never commit this file.**

```
NEXT_PUBLIC_SUPABASE_URL=https://fbyslpmwppbqoxixseus.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # public, safe in browser
SUPABASE_SERVICE_ROLE_KEY=...            # SECRET — server only
CLOUDINARY_CLOUD_NAME=dcdchbc8p
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...                # SECRET
RAZORPAY_KEY_ID=rzp_test_xxxxx           # paste real key to enable payments
RAZORPAY_KEY_SECRET=...                  # SECRET
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- **Supabase project:** `fbyslpmwppbqoxixseus` (dashboard → SQL ran from `supabase/schema.sql`)
- **Cloudinary folder:** `homeera/products/<SKU>`
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

## 8. Responsiveness

- Global side gutter is the `--pad-x` token (`clamp(1.75rem, 5.5vw, 5rem)`) — every page
  uses it via `.container` or component padding, so left/right spacing adapts to mobile.
- **Admin panel:** desktop sidebar collapses into a fixed top bar + slide-in drawer below
  860px; tables scroll horizontally rather than overflow.
- Shop deck, product grid, cart, checkout and parallax all reflow to single-column on phones.
```
