import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyPaymentSignature, fetchPayment } from '@/lib/razorpay';

/**
 * POST /api/razorpay/verify
 *
 * Called by the browser after the Razorpay modal reports success.
 *   1. Verify the HMAC signature with the key secret.
 *   2. On success: mark the local order 'paid', store payment id +
 *      signature + instrument details, and clear the user's cart.
 *   3. On failure: mark the order 'failed' and reject.
 *
 * The signature check is what makes this trustworthy — a forged callback
 * can't produce a valid HMAC without the secret.
 *
 * This is the *fast* confirmation path, not the authoritative one: it only
 * runs if the customer's tab survives the payment. /api/razorpay/webhook
 * backstops it, and both are idempotent.
 */
export async function POST(req: Request) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
  }

  const svc = createServiceClient();
  const ok = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!ok) {
    await svc
      .from('orders')
      .update({
        status: 'failed',
        status_updated_at: new Date().toISOString(),
        payment_error: 'Signature verification failed',
        confirmed_via: 'checkout',
      })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  }

  // Pull the instrument details so the admin panel can show *how* they paid
  // right away. Best-effort: a hiccup here must not fail a real payment —
  // the webhook fills these in moments later.
  let facts = null;
  try {
    facts = await fetchPayment(razorpay_payment_id);
  } catch {
    /* non-fatal */
  }

  // Mark paid (scoped to this user's matching order).
  const { data: order, error } = await svc
    .from('orders')
    .update({
      status: 'paid',
      status_updated_at: new Date().toISOString(),
      razorpay_payment_id,
      razorpay_signature,
      payment_method: facts?.method ?? null,
      payment_detail: facts?.detail ?? null,
      payment_email: facts?.email ?? null,
      payment_contact: facts?.contact ?? null,
      amount_paid: facts ? Math.round(facts.amount / 100) : null,
      paid_at: new Date().toISOString(),
      payment_error: null,
      confirmed_via: 'checkout',
      last_synced_at: new Date().toISOString(),
    })
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('user_id', user.id)
    .select('id, user_id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clear the cart now that it's purchased.
  await svc.from('cart_items').delete().eq('user_id', user.id);

  // In-site confirmation for the customer (same shape the admin status
  // control produces, so the bell reads consistently).
  await svc.from('notifications').insert({
    user_id: user.id,
    title: `Order #${order.id.slice(0, 8)} — paid`,
    body: 'Payment received — thank you!',
    order_id: order.id,
  });

  return NextResponse.json({ ok: true, orderId: order.id });
}
