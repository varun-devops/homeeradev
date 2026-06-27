import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { verifyPaymentSignature } from '@/lib/razorpay';

/**
 * POST /api/razorpay/verify
 *
 * Called by the browser after the Razorpay modal reports success.
 *   1. Verify the HMAC signature with the key secret.
 *   2. On success: mark the local order 'paid', store payment id +
 *      signature, and clear the user's cart.
 *   3. On failure: mark the order 'failed' and reject.
 *
 * The signature check is what makes this trustworthy — a forged callback
 * can't produce a valid HMAC without the secret.
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
      .update({ status: 'failed' })
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id);
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
  }

  // Mark paid (scoped to this user's matching order).
  const { data: order, error } = await svc
    .from('orders')
    .update({
      status: 'paid',
      razorpay_payment_id,
      razorpay_signature,
    })
    .eq('razorpay_order_id', razorpay_order_id)
    .eq('user_id', user.id)
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Clear the cart now that it's purchased.
  await svc.from('cart_items').delete().eq('user_id', user.id);

  return NextResponse.json({ ok: true, orderId: order.id });
}
