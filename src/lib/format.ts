/**
 * Client-safe formatting helpers (no server-only imports — safe to use
 * from client components).
 */

/** Format a whole-rupee price with the ₹ symbol + Indian digit grouping. */
export function formatINR(price: number): string {
  return `₹${Number(price || 0).toLocaleString('en-IN')}`;
}
