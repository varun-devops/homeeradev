/**
 * What a product actually costs, after any discount.
 *
 * One function because the arithmetic used to be inlined in four places —
 * the shop grid, the product page, the cart, and order creation — and they
 * had drifted: the first two applied `discount_percent`, the last two did
 * not. A customer was shown "20% off" with a struck-through price and then
 * charged the full amount, and the order_items snapshot recorded the full
 * amount too, so nothing downstream could tell the discount had been
 * promised at all.
 *
 * Rupees in, rupees out. Rounded once, here, so the displayed total and the
 * charged total cannot disagree by a rupee.
 */
export function effectivePrice(price: number, discountPercent?: number | null): number {
  const discount = discountPercent ?? 0;
  if (!Number.isFinite(price) || price <= 0) return 0;
  // Mirrors the 0–90 clamp the admin form applies on the way in, so a bad
  // value in the column can never produce a free or negative product.
  const safe = Math.max(0, Math.min(90, discount));
  if (safe <= 0) return Math.round(price);
  return Math.round(price * (1 - safe / 100));
}

/** True when this product is being sold below its list price. */
export function isDiscounted(discountPercent?: number | null): boolean {
  return (discountPercent ?? 0) > 0;
}
