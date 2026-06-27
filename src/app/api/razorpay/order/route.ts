import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { razorpay, isConfigured } from '@/lib/razorpay';

/**
 * POST /api/razorpay/order
 *
 * Creates an order from the signed-in user's cart:
 *   1. Auth check.
 *   2. Recompute the total SERVER-SIDE from DB prices (never trust the
 *      client) over the user's current cart.
 *   3. Create a Razorpay order (amount in paise).
 *   4. Insert a local `orders` row (status 'created') + `order_items`
 *      snapshot, storing the razorpay_order_id.
 *
 * Returns { orderId, amount, currency, keyId, dbOrderId } for the browser
 * checkout. If Razorpay keys aren't configured yet, returns 503.
 */
export async function POST(req: Request) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: { full_name?: string; phone?: string; address?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }

  const svc = createServiceClient();

  // Cart with live prices (service client so the join is reliable).
  const { data: cart, error: cartErr } = await svc
    .from('cart_items')
    .select('quantity, product:products(id, name, sku, price, is_active)')
    .eq('user_id', user.id);
  if (cartErr) {
    return NextResponse.json({ error: cartErr.message }, { status: 500 });
  }

  type CartJoin = {
    quantity: number;
    product: { id: string; name: string; sku: string; price: number; is_active: boolean } | null;
  };
  const items = ((cart ?? []) as unknown as CartJoin[])
    .map((r) => ({ quantity: r.quantity, product: r.product }))
    .filter(
      (r): r is { quantity: number; product: NonNullable<CartJoin['product']> } =>
        Boolean(r.product && r.product.is_active),
    );

  if (items.length === 0) {
    return NextResponse.json({ error: 'Your bag is empty' }, { status: 400 });
  }

  const amount = items.reduce(
    (sum, r) => sum + r.product.price * r.quantity,
    0,
  ); // whole rupees

  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Payments are not configured yet. Please add Razorpay keys.' },
      { status: 503 },
    );
  }

  // 1. Create the Razorpay order (amount in paise).
  let rzpOrder;
  try {
    rzpOrder = await razorpay().orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: `he_${Date.now()}`,
      notes: { user_id: user.id },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.error?.description || 'Could not create payment order' },
      { status: 502 },
    );
  }

  // 2. Insert the local order + items.
  const { data: order, error: orderErr } = await svc
    .from('orders')
    .insert({
      user_id: user.id,
      email: user.email,
      full_name: body.full_name ?? null,
      phone: body.phone ?? null,
      shipping_address: body.address ?? null,
      amount,
      currency: 'INR',
      status: 'created',
      razorpay_order_id: rzpOrder.id,
    })
    .select('id')
    .single();
  if (orderErr) {
    return NextResponse.json({ error: orderErr.message }, { status: 500 });
  }

  const orderItems = items.map((r) => ({
    order_id: order.id,
    product_id: r.product.id,
    name: r.product.name,
    sku: r.product.sku,
    price: r.product.price,
    quantity: r.quantity,
  }));
  await svc.from('order_items').insert(orderItems);

  return NextResponse.json({
    orderId: rzpOrder.id,
    dbOrderId: order.id,
    amount: amount * 100,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
