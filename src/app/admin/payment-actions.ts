'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminIdentity, type AdminIdentity } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/audit-log';
import {
  fetchPaymentForOrder,
  refundPayment,
  isConfigured,
  type PaymentFacts,
} from '@/lib/razorpay';

/**
 * Payment operations for the admin panel.
 *
 * Everything here talks to Razorpay's API as the source of truth and writes
 * the answer back to our `orders` row — so an admin can always establish
 * whether money actually moved, regardless of what the browser reported.
 *
 * Admin-only: staff manage products and must not touch money.
 */

async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect('/admin/login');
  if (identity.role !== 'admin') redirect('/admin/products?error=admin-only');
  return identity;
}

export type SyncResult = {
  ok: boolean;
  message?: string;
  status?: string;
  method?: string | null;
  detail?: string | null;
  amountPaid?: number;
  changed?: boolean;
};

/** Map a Razorpay payment status onto our order status vocabulary. */
function orderStatusFor(facts: PaymentFacts, current: string): string | null {
  // Never walk a fulfilled order backwards.
  if (!['created', 'failed', 'pending', 'paid'].includes(current)) return null;
  if (facts.status === 'captured') return 'paid';
  if (facts.status === 'refunded') return 'paid'; // still paid; refund tracked separately
  if (facts.status === 'failed') return current === 'paid' ? null : 'failed';
  return null; // created / authorized → leave alone, not money in the bank yet
}

/**
 * Ask Razorpay what really happened to this order and write it back.
 *
 * This is the fix for the classic gap: customer pays, closes the tab before
 * the callback fires, and the order sits at 'created' while the money is
 * captured. One click here resolves it — as does the webhook, automatically.
 */
export async function syncPayment(orderId: string): Promise<SyncResult> {
  await requireAdmin();
  if (!isConfigured()) {
    return { ok: false, message: 'Razorpay keys are not configured yet.' };
  }

  const svc = createServiceClient();
  const { data: order } = await svc
    .from('orders')
    .select('id, user_id, status, amount, razorpay_order_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { ok: false, message: 'Order not found.' };
  if (!order.razorpay_order_id) {
    return { ok: false, message: 'This order has no Razorpay order attached.' };
  }

  let facts: PaymentFacts | null;
  try {
    facts = await fetchPaymentForOrder(order.razorpay_order_id);
  } catch (err: any) {
    return { ok: false, message: err?.error?.description || 'Could not reach Razorpay.' };
  }

  const now = new Date().toISOString();

  if (!facts) {
    await svc.from('orders').update({ last_synced_at: now }).eq('id', order.id);
    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath('/admin/payments');
    return { ok: true, message: 'No payment attempts yet on this order.', changed: false };
  }

  const nextStatus = orderStatusFor(facts, order.status);
  const changed = Boolean(nextStatus && nextStatus !== order.status);

  await svc
    .from('orders')
    .update({
      ...(nextStatus ? { status: nextStatus, status_updated_at: now } : {}),
      razorpay_payment_id: facts.id,
      payment_method: facts.method,
      payment_detail: facts.detail,
      payment_email: facts.email,
      payment_contact: facts.contact,
      amount_paid: facts.status === 'captured' || facts.status === 'refunded'
        ? Math.round(facts.amount / 100)
        : null,
      amount_refunded: Math.round(facts.amountRefunded / 100),
      paid_at: facts.status === 'captured' ? facts.capturedAt : null,
      payment_error: facts.status === 'failed' ? facts.errorDescription : null,
      confirmed_via: 'manual',
      last_synced_at: now,
    })
    .eq('id', order.id);

  // If the sync is what discovered the payment, the customer never got a
  // confirmation — send it now, and clear the cart they abandoned.
  if (changed && nextStatus === 'paid' && order.user_id) {
    await svc.from('cart_items').delete().eq('user_id', order.user_id);
    await svc.from('notifications').insert({
      user_id: order.user_id,
      title: `Order #${order.id.slice(0, 8)} — paid`,
      body: 'Payment received — thank you!',
      order_id: order.id,
    });
  }

  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath('/admin/payments');
  revalidatePath('/admin/orders');

  return {
    ok: true,
    status: nextStatus ?? order.status,
    method: facts.method,
    detail: facts.detail,
    amountPaid: Math.round(facts.amount / 100),
    changed,
    message: changed
      ? `Updated — Razorpay reports "${facts.status}".`
      : `Already in sync — Razorpay reports "${facts.status}".`,
  };
}

/** Reconcile every order that isn't in a settled state. Returns a summary. */
export async function syncPendingPayments(): Promise<{
  ok: boolean;
  message: string;
  checked: number;
  updated: number;
}> {
  await requireAdmin();
  if (!isConfigured()) {
    return { ok: false, message: 'Razorpay keys are not configured yet.', checked: 0, updated: 0 };
  }

  const svc = createServiceClient();
  const { data: pending } = await svc
    .from('orders')
    .select('id')
    .in('status', ['created', 'failed'])
    .not('razorpay_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50); // keep one click well inside the request budget

  const ids = (pending ?? []).map((o: { id: string }) => o.id);
  let updated = 0;
  for (const id of ids) {
    const res = await syncPayment(id);
    if (res.ok && res.changed) updated += 1;
  }

  revalidatePath('/admin/payments');
  revalidatePath('/admin/orders');
  return {
    ok: true,
    checked: ids.length,
    updated,
    message: `Checked ${ids.length} unconfirmed order${ids.length === 1 ? '' : 's'} · ${updated} updated.`,
  };
}

/**
 * Refund a captured payment, fully or partially. `amountRupees` omitted ⇒
 * refund whatever is still outstanding.
 */
export async function refundOrder(
  orderId: string,
  amountRupees?: number,
): Promise<{ ok: boolean; message: string }> {
  const actor = await requireAdmin();
  if (!isConfigured()) return { ok: false, message: 'Razorpay keys are not configured yet.' };

  const svc = createServiceClient();
  const { data: order } = await svc
    .from('orders')
    .select('id, user_id, amount, amount_paid, amount_refunded, razorpay_payment_id')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { ok: false, message: 'Order not found.' };
  if (!order.razorpay_payment_id) {
    return { ok: false, message: 'No captured payment to refund.' };
  }

  const paid = order.amount_paid ?? order.amount;
  const alreadyRefunded = order.amount_refunded ?? 0;
  const outstanding = paid - alreadyRefunded;
  if (outstanding <= 0) return { ok: false, message: 'This payment is already fully refunded.' };

  const amount = amountRupees == null ? outstanding : Math.round(amountRupees);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: 'Enter a refund amount greater than zero.' };
  }
  if (amount > outstanding) {
    return { ok: false, message: `Cannot refund more than ₹${outstanding.toLocaleString('en-IN')}.` };
  }

  try {
    const refund = (await refundPayment(order.razorpay_payment_id, amount * 100)) as unknown as {
      id: string;
    };
    const now = new Date().toISOString();
    await svc
      .from('orders')
      .update({
        refund_id: refund.id,
        amount_refunded: alreadyRefunded + amount,
        refunded_at: now,
        last_synced_at: now,
        // A fully refunded order is effectively cancelled for fulfilment.
        ...(alreadyRefunded + amount >= paid
          ? { status: 'cancelled', status_updated_at: now }
          : {}),
      })
      .eq('id', order.id);

    // Logged after the refund actually succeeds at Razorpay, with the
    // amount and the gateway's own refund id — this is the one action in
    // the admin panel that moves real money, so it gets the most detail.
    await logAdminAction({
      actor,
      action: 'order.refund',
      entityType: 'order',
      entityId: order.id,
      summary: `Refunded ₹${amount.toLocaleString('en-IN')} on order #${order.id.slice(0, 8)}`,
      detail: {
        amount_rupees: amount,
        razorpay_refund_id: refund.id,
        razorpay_payment_id: order.razorpay_payment_id,
        total_refunded_after: alreadyRefunded + amount,
      },
    });

    if (order.user_id) {
      await svc.from('notifications').insert({
        user_id: order.user_id,
        title: `Order #${order.id.slice(0, 8)} — refund issued`,
        body: `A refund of ₹${amount.toLocaleString('en-IN')} is on its way to your account.`,
        order_id: order.id,
      });
    }

    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath('/admin/payments');
    revalidatePath('/admin/orders');
    return { ok: true, message: `Refund of ₹${amount.toLocaleString('en-IN')} initiated.` };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.error?.description || 'Razorpay rejected the refund.',
    };
  }
}
