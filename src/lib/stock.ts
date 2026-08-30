import { createServiceClient } from '@/lib/supabase/server';

/**
 * Take an order's items out of stock, exactly once.
 *
 * Payment gets confirmed by two independent paths — the browser callback at
 * /api/razorpay/verify and Razorpay's webhook, which also retries on any
 * non-2xx — and both can run for the same order. So this claims
 * `orders.stock_consumed_at` in a conditional update first: the row only
 * comes back for whoever set it, and everyone else returns having done
 * nothing. Without that claim a retried webhook would decrement a second
 * time and quietly destroy inventory.
 *
 * Best-effort by design. A failure here must never fail a payment that has
 * already succeeded — the money is taken and the order is real either way.
 * It logs instead, which is recoverable; refusing the request is not.
 *
 * Products with stock = null are not tracked and are skipped by the SQL
 * function (see supabase/migration-12-stock-enforcement.sql).
 */
export async function consumeOrderStock(orderId: string): Promise<void> {
  const svc = createServiceClient();
  try {
    // Claim it. No row back means another path already did this.
    const { data: claimed, error: claimErr } = await svc
      .from('orders')
      .update({ stock_consumed_at: new Date().toISOString() })
      .eq('id', orderId)
      .is('stock_consumed_at', null)
      .select('id')
      .maybeSingle();

    if (claimErr) {
      // Most likely the migration has not been applied yet; the order still
      // stands, stock simply is not being tracked.
      console.error('[stock] could not claim order', orderId, claimErr.message);
      return;
    }
    if (!claimed) return; // already consumed

    const { error } = await svc.rpc('consume_order_stock', { p_order_id: orderId });
    if (error) {
      // The check constraint rejecting this means the sale outran the
      // shelf — worth a loud log, since it needs a human to reconcile.
      console.error('[stock] decrement failed for order', orderId, error.message);
      // Release the claim so a retry can try again.
      await svc.from('orders').update({ stock_consumed_at: null }).eq('id', orderId);
    }
  } catch (err) {
    console.error('[stock] unexpected failure for order', orderId, err);
  }
}
