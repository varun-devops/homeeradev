import Razorpay from 'razorpay';
import crypto from 'node:crypto';

/**
 * Server-only Razorpay helpers.
 *
 * Keys come from env. Until real test keys are pasted into .env.local the
 * client is still constructed, but any live API call will fail with a
 * clear auth error — `isConfigured()` lets routes return a friendly 503
 * instead so the rest of the app keeps working.
 */

export function isConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      process.env.RAZORPAY_KEY_ID !== 'rzp_test_xxxxx',
  );
}

export function razorpay(): Razorpay {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
  });
}

/**
 * Verify the signature Razorpay sends back to the browser after a
 * successful payment. Returns true only if the HMAC of
 * `${order_id}|${payment_id}` with the key secret matches.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  // Constant-time compare to avoid timing leaks.
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
