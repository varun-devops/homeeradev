import Razorpay from 'razorpay';
import crypto from 'node:crypto';

/**
 * Server-only Razorpay helpers.
 *
 * Keys come from env. Until real keys are pasted into .env.local the client
 * is still constructed, but any live API call would fail with an opaque auth
 * error — `configStatus()` lets routes return a friendly 503, and lets the
 * admin panel show exactly which piece is missing.
 */

export type KeyMode = 'test' | 'live' | 'unknown';

export type ConfigStatus = {
  ready: boolean;          // can we talk to Razorpay at all?
  mode: KeyMode;           // test keys or live keys?
  hasKeyId: boolean;
  hasKeySecret: boolean;
  hasWebhookSecret: boolean;
  keyIdMasked: string | null;
};

/** A real key id looks like `rzp_test_1DP5mmOlF5G5ag` — the placeholder doesn't. */
function looksLikeKeyId(v: string | undefined): boolean {
  return Boolean(v && /^rzp_(test|live)_[A-Za-z0-9]{10,}$/.test(v));
}

export function configStatus(): ConfigStatus {
  const id = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhook = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  const hasKeyId = looksLikeKeyId(id);
  const hasKeySecret = Boolean(secret && secret.length >= 10);

  return {
    ready: hasKeyId && hasKeySecret,
    mode: id?.startsWith('rzp_live_') ? 'live' : id?.startsWith('rzp_test_') ? 'test' : 'unknown',
    hasKeyId,
    hasKeySecret,
    hasWebhookSecret: Boolean(webhook && webhook.length >= 6),
    // Safe to render in the admin UI: prefix + last 4 only.
    keyIdMasked: id ? `${id.slice(0, 12)}…${id.slice(-4)}` : null,
  };
}

export function isConfigured(): boolean {
  return configStatus().ready;
}

export function razorpay(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  });
}

/** Constant-time HMAC compare — avoids leaking the secret through timing. */
function hmacMatches(payload: string, secret: string, signature: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verify the signature Razorpay sends back to the *browser* after a
 * successful payment. Returns true only if the HMAC of
 * `${order_id}|${payment_id}` with the key secret matches.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  return hmacMatches(
    `${params.orderId}|${params.paymentId}`,
    process.env.RAZORPAY_KEY_SECRET || '',
    params.signature,
  );
}

/**
 * Verify a *webhook* callback. Note this uses RAZORPAY_WEBHOOK_SECRET (the
 * value you type into the Razorpay dashboard when creating the webhook) and
 * the RAW request body — not the key secret, and not re-serialised JSON.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  return hmacMatches(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET || '', signature);
}

// ──────────────────────────────────────────────────────────────────
// Reading payments back from Razorpay (used by admin reconcile)
// ──────────────────────────────────────────────────────────────────

/** The subset of a Razorpay payment we persist. Amounts are in PAISE. */
export type PaymentFacts = {
  id: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  amount: number;
  amountRefunded: number;
  method: string | null;
  detail: string | null;
  email: string | null;
  contact: string | null;
  capturedAt: string | null;
  errorDescription: string | null;
};

/** Human label for the instrument used, e.g. "HDFC •••• 4242" or "abc@okicici". */
function describeMethod(p: Record<string, any>): string | null {
  switch (p.method) {
    case 'card': {
      const c = p.card ?? {};
      const bits = [c.network, c.last4 ? `•••• ${c.last4}` : null].filter(Boolean);
      return bits.length ? bits.join(' ') : 'Card';
    }
    case 'upi':
      return p.vpa || 'UPI';
    case 'netbanking':
      return p.bank ? `Netbanking · ${p.bank}` : 'Netbanking';
    case 'wallet':
      return p.wallet ? `Wallet · ${p.wallet}` : 'Wallet';
    case 'emi':
      return p.bank ? `EMI · ${p.bank}` : 'EMI';
    default:
      return p.method ?? null;
  }
}

export function toPaymentFacts(p: Record<string, any>): PaymentFacts {
  return {
    id: p.id,
    status: p.status,
    amount: Number(p.amount ?? 0),
    amountRefunded: Number(p.amount_refunded ?? 0),
    method: p.method ?? null,
    detail: describeMethod(p),
    email: p.email ?? null,
    contact: p.contact ?? null,
    capturedAt: p.created_at ? new Date(p.created_at * 1000).toISOString() : null,
    errorDescription: p.error_description ?? null,
  };
}

/** Fetch one payment by id. */
export async function fetchPayment(paymentId: string): Promise<PaymentFacts> {
  const p = await razorpay().payments.fetch(paymentId);
  return toPaymentFacts(p as unknown as Record<string, any>);
}

/**
 * Find the payment that settled a Razorpay order. An order can have several
 * attempts (a failed card, then a successful UPI) — prefer the captured one,
 * then any authorized one, else the most recent attempt.
 */
export async function fetchPaymentForOrder(rzpOrderId: string): Promise<PaymentFacts | null> {
  const res = (await razorpay().orders.fetchPayments(rzpOrderId)) as unknown as {
    items?: Record<string, any>[];
  };
  const items = res?.items ?? [];
  if (items.length === 0) return null;
  const best =
    items.find((p) => p.status === 'captured') ??
    items.find((p) => p.status === 'authorized') ??
    items[items.length - 1];
  return toPaymentFacts(best);
}

/** Refund a captured payment. `amountPaise` omitted ⇒ full refund. */
export async function refundPayment(paymentId: string, amountPaise?: number) {
  return razorpay().payments.refund(paymentId, {
    ...(amountPaise ? { amount: amountPaise } : {}),
    speed: 'normal',
  });
}
