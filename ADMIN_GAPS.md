# What's still missing — admin panel & e-commerce

An audit of the Homeera admin against what a live Indian D2C store needs.
Everything below was checked against the actual code, not assumed.

**What already works well:** product CRUD with inline price/visibility editing,
collections management, order list + detail with a status tracker, in-site
customer notifications on status change, a real Razorpay integration
(order → verify → webhook → reconcile → refund), a staff role scoped to
products, and a payments screen with gateway health and an audit feed. That is
a genuinely solid base — the gaps below are what sits between it and trading.

---

## P0 — blocks going live

### 1. Stock is decorative
`products.stock` is editable in the admin form and stored, but **nothing ever
decrements it.** There is no stock write anywhere in `src/app/api/razorpay/`,
so:

- the same last unit can be sold to unlimited buyers simultaneously;
- an out-of-stock piece stays purchasable;
- the number in the admin only ever means what someone last typed.

**Needed:** decrement in the payment-verify/webhook path inside a transaction,
block add-to-cart at zero, show an "Out of stock" state on the product page and
grid, and a low-stock list on the dashboard.

### 2. No invoice, no tax model
There is no GST anywhere — no GSTIN, no HSN codes, no CGST/SGST/IGST split, no
place-of-supply logic, and no tax lines on `orders` or `order_items`. Prices are
flat integers.

For an Indian store selling ₹3,000–₹8,000 handicrafts this is a legal
requirement, not a nicety. **Needed:** tax fields on products (HSN, rate),
computed tax lines at checkout keyed on the delivery state vs. your state, and a
downloadable tax invoice per order.

### 3. Policy pages are linked but don't exist
`/privacy` and `/journal` are linked from the Contact footer and both **404**.
`/terms`, `/returns` and `/shipping` don't exist either — yet the product page
promises "7-day easy returns" and "free shipping above ₹2,000".

Razorpay requires reachable Terms, Privacy, Refund/Cancellation, Shipping and
Contact pages before it will activate a live account. This is the cheapest item
on this list and it is currently blocking activation.

### 4. Nothing is emailed, ever
No email integration exists (no nodemailer/Resend/SendGrid in `package.json` or
`src/`). Order confirmation, payment receipt, shipping notice and delivery
notice are all **in-site only**, via the notifications bell. A customer who
buys and closes the tab receives nothing at all.

**Needed:** transactional email on order placed / paid / shipped / delivered /
refunded, at minimum.

### 5. Credentials
`scripts/seed-admin.mjs` sets the admin password to `1234`, `changePassword()`
enforces a 4-character minimum, and **`PROJECT_DETAILS.md` publishes the live
admin email and password in the repo.** There is no 2FA and no rate limiting on
the admin login.

**Needed:** strip the credentials from the docs, raise the minimum to 10+
characters, and rate-limit `/admin/login`.

---

## P1 — needed within the first weeks of trading

### 6. Shipping is hardcoded free
Checkout always shows "Delivery — Free" and adds ₹0. There are no shipping
rules: no weight bands, no zone pricing, no free-shipping threshold (despite the
copy claiming one at ₹2,000). `products.weight_kg` is collected and never used.

### 7. No courier integration or tracking
An order's status is whatever an admin last picked from a dropdown. There is no
AWB/tracking number field, no carrier, no label or manifest, no packing slip,
and no automatic status from carrier events. The customer has no way to track a
parcel.

### 8. Order list will not scale
`/admin/orders` selects **every order with no limit, no pagination, no search
and no filters**, and joins `order_items` on each. It is fine at 20 orders and
unusable at 2,000. Same shape on `/admin/users`.

**Needed:** server-side pagination, search by id/email/phone, and filters by
status and date range.

### 9. No returns/cancellation workflow
`refundOrder()` exists and works (including partial amounts), but it is
admin-initiated only. A customer cannot request a return or cancel an order;
there is no RMA record, no reason codes, and no reverse-pickup step. The
`cancelled` status exists with nothing driving it.

### 10. COD is half-built
`serviceable_pincodes` carries a `cod` flag (migration 08) but nothing reads it
and there is no cash-on-delivery payment path. For this price band in India, COD
is typically a large share of orders.

### 11. No coupons or promotions
The only discount mechanism is `discount_percent` on a single product. There are
no promo codes, no cart-level or order-value discounts, no first-order offer,
and no scheduled sale windows.

---

## P2 — operational maturity

### 12. Dashboard is six counters
Revenue, orders, users, products, cart items — all lifetime totals with no date
range. Missing: revenue over time, average order value, conversion rate,
best-selling products, low stock, recent orders, and abandoned carts (the
`cart_items` data to compute that is already there and unused).

### 13. Catalogue management gaps
- Bulk import/export is CLI-only (`scripts/build-catalog.mjs` +
  `import-catalog.mjs`). No CSV upload from the admin, so the merchant cannot
  update prices in bulk without a developer.
- No gallery image reordering, no alt text.
- No "duplicate product".
- No per-product SEO fields — meta is derived from name/description.
- No draft or scheduled publishing; `is_active` is the only lever.

### 14. Customers are read-only
The Users screen lists profiles and their cart/order counts. There is no
customer detail beyond that: no saved addresses view, no admin-triggered
password reset, no disable/block, no notes or tags, and no lifetime-value
figure.

### 15. Content is hardcoded
Home hero video, About Us copy, Contact addresses and the shipping/returns text
on the product page are all in the source. The merchant cannot change a word
without a deploy. There is no banner or homepage-promo manager.

### 16. No audit log
Nothing records which admin changed a price, hid a product, refunded an order or
moved a status — and there are now two privilege levels (admin, staff) sharing
the panel. `payment_events` covers gateway activity only.

### 17. Reviews are dead code in the DB
The reviews UI has been removed from the storefront, but `public.reviews` and
its RLS policies (migration 04) still exist and nothing reads or writes them.
Either drop the table or plan to bring the feature back — leaving it is a trap
for the next person.

---

## Quick wins, in order

1. Write the five policy pages (half a day, unblocks Razorpay live mode).
2. Delete the credentials from `PROJECT_DETAILS.md` and raise the password floor.
3. Decrement stock on payment confirmation and gate add-to-cart on it.
4. Add transactional email on the four order events.
5. Paginate and filter the orders and users lists.
6. Put shipping rules and the ₹2,000 free-shipping threshold behind real logic.
