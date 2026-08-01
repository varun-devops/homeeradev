import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, toPaymentFacts } from '@/lib/razorpay';

/**
 * POST /api/razorpay/webhook
 *
 * The authoritative payment-confirmation path. The browser callback
 * (/api/razorpay/verify) only fires if the customer keeps the tab open —
 * they may close it, lose signal, or pay via a UPI app that never returns.
 * Razorpay always sends this webhook, and retries until it gets a 2xx, so
 * this is what makes "paid" in the admin panel trustworthy.
 *
 * Handles: payment.captured, order.paid, payment.failed,
 *          refund.processed / refund.created.
 *
 * Security: HMAC of the RAW body against RAZORPAY_WEBHOOK_SECRET. No auth
 * cookie is involved — the signature is the entire proof.
 */

// Razorpay needs the byte-exact body to verify, so no caching/parsing tricks.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Never move a fulfilled order backwards to 'paid'. */
const PRE_FULFILMENT = new Set(['created', 'failed', 'pending']);

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const eventId = req.headers.get('x-razorpay-event-id') ?? null;

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    // Misconfiguration, not a bad request. 500 makes Razorpay retry, so
    // events aren't silently lost while the secret is being added.
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }

  const event: string = body?.event ?? '';
  const paymentEntity = body?.payload?.payment?.entity;
  const refundEntity = body?.payload?.refund?.entity;
  const orderEntity = body?.payload?.order?.entity;

  const rzpOrderId: string | null = paymentEntity?.order_id ?? orderEntity?.id ?? null;
  // Refund payloads carry the payment, not the order — that's our handle.
  const rzpPaymentId: string | null = paymentEntity?.id ?? refundEntity?.payment_id ?? null;

  const svc = createServiceClient();

  // ---- Idempotency ------------------------------------------------
  // Razorpay retries on any non-2xx, and occasionally double-sends. The
  // unique index on event_id turns a replay into an insert conflict.
  if (eventId) {
    const { error: dupErr } = await svc
      .from('payment_events')
      .insert({
        event_id: eventId,
        event,
        rzp_order_id: rzpOrderId,
        rzp_payment_id: rzpPaymentId,
        amount: paymentEntity?.amount ? Math.round(paymentEntity.amount / 100) : null,
        payload: body,
      });
    // 23505 = unique_violation → we've already handled this exact event.
    if (dupErr && (dupErr as { code?: string }).code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  // Resolve the local order: by Razorpay order id for payment events, by
  // payment id for refund events (which carry no order reference).
  if (!rzpOrderId && !rzpPaymentId) {
    return NextResponse.json({ ok: true, ignored: 'no order or payment id' });
  }

  const lookup = svc.from('orders').select('id, user_id, status, amount');
  const { data: order } = rzpOrderId
    ? await lookup.eq('razorpay_order_id', rzpOrderId).maybeSingle()
    : await lookup.eq('razorpay_payment_id', rzpPaymentId!).maybeSingle();

  if (!order) {
    // Not one of ours (or created against a different environment's keys).
    // 200 so Razorpay stops retrying an event we can never resolve.
    return NextResponse.json({ ok: true, ignored: 'unknown order' });
  }

  // Backfill the link on the event row now that we know the local order.
  if (eventId) {
    await svc.from('payment_events').update({ order_id: order.id }).eq('event_id', eventId);
  }

  switch (event) {
    case 'payment.captured':
    case 'order.paid': {
      if (!paymentEntity) break;
      const facts = toPaymentFacts(paymentEntity);

      await svc
        .from('orders')
        .update({
          // A shipped order stays shipped — only confirm the money.
          ...(PRE_FULFILMENT.has(order.status) ? { status: 'paid', status_updated_at: new Date().toISOString() } : {}),
          razorpay_payment_id: facts.id,
          payment_method: facts.method,
          payment_detail: facts.detail,
          payment_email: facts.email,
          payment_contact: facts.contact,
          amount_paid: Math.round(facts.amount / 100),
          paid_at: facts.capturedAt ?? new Date().toISOString(),
          payment_error: null,
          confirmed_via: 'webhook',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // The cart may still be sitting there if the customer bailed before
      // the browser callback ran.
      if (order.user_id) {
        await svc.from('cart_items').delete().eq('user_id', order.user_id);

        if (PRE_FULFILMENT.has(order.status)) {
          await svc.from('notifications').insert({
            user_id: order.user_id,
            title: `Order #${order.id.slice(0, 8)} — paid`,
            body: 'Payment received — thank you!',
            order_id: order.id,
          });
        }
      }
      break;
    }

    case 'payment.failed': {
      if (!paymentEntity) break;
      const facts = toPaymentFacts(paymentEntity);
      // A later attempt may already have succeeded — never overwrite that.
      if (order.status === 'paid' || !PRE_FULFILMENT.has(order.status)) break;

      await svc
        .from('orders')
        .update({
          status: 'failed',
          status_updated_at: new Date().toISOString(),
          razorpay_payment_id: facts.id,
          payment_method: facts.method,
          payment_error: facts.errorDescription ?? 'Payment failed',
          confirmed_via: 'webhook',
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      break;
    }

    case 'refund.created':
    case 'refund.processed': {
      if (!refundEntity) break;
      const refunded = Math.round(Number(refundEntity.amount ?? 0) / 100);
      await svc
        .from('orders')
        .update({
          refund_id: refundEntity.id,
          amount_refunded: refunded,
          refunded_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (order.user_id) {
        await svc.from('notifications').insert({
          user_id: order.user_id,
          title: `Order #${order.id.slice(0, 8)} — refund issued`,
          body: `A refund of ₹${refunded.toLocaleString('en-IN')} is on its way to your account.`,
          order_id: order.id,
        });
      }
      break;
    }

    default:
      // Subscribed to something we don't act on yet — still logged above.
      break;
  }

  return NextResponse.json({ ok: true });
}

/** Razorpay pings the URL on save; answer so the dashboard shows it as live. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'razorpay-webhook' });
}
