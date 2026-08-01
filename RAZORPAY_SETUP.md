# Razorpay — account setup & going live

Everything in the code is already built. This is the part only you can do:
creating the account and pasting the keys.

---

## 1. Create the Razorpay account

1. Go to **https://dashboard.razorpay.com/signup**
2. Sign up with your business email + phone (OTP).
3. Pick **"Accept payments for my business"** → business type
   (Proprietorship / Private Limited / Individual — whatever Homeera is).
4. You land in the dashboard in **Test Mode**. You can build and test the
   entire checkout right now — no KYC needed yet.

## 2. Get your TEST keys (do this first)

1. Dashboard → toggle to **Test Mode** (switch at the top).
2. **Account & Settings → API Keys → Generate Test Key**.
3. A dialog shows **Key Id** (`rzp_test_…`) and **Key Secret**.
   The secret is shown **once** — download or copy it now.
4. Paste both into `.env.local`:

   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_here
   ```

5. Restart the dev server (`npm run dev`) — env vars are only read at boot.

Check **/admin/payments** — the Gateway card should now show
**Test mode** with green ticks for Key ID and Key secret.

## 3. Set up the webhook (this is what confirms payments)

Without a webhook, a payment is only recorded if the customer keeps the
checkout tab open until it finishes. If they close it, or pay through a UPI
app that never returns to the browser, the money is taken but your panel
still says "created". The webhook closes that hole.

1. Dashboard → **Account & Settings → Webhooks → Add New Webhook**.
2. **Webhook URL** — the exact URL is printed on your **/admin/payments**
   page. In production it is:

   ```
   https://your-domain.com/api/razorpay/webhook
   ```

3. **Secret** — type any strong random string (you invent it). Put the same
   string in `.env.local`:

   ```
   RAZORPAY_WEBHOOK_SECRET=the_same_string
   ```

4. **Active Events** — tick these four:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.processed`
5. Save. Restart the dev server.

### Testing the webhook locally

`localhost` isn't reachable from Razorpay's servers. Either test on a
deployed preview URL, or tunnel:

```bash
npx localtunnel --port 3000     # or: ngrok http 3000
```

Use the public URL it prints + `/api/razorpay/webhook` as the webhook URL.

## 4. Run the database migration

In **Supabase → SQL Editor**, paste and run:

```
supabase/migration-07-payments.sql
```

This adds the payment columns and the `payment_events` audit table. It is
safe to re-run.

## 5. Test a payment end to end

1. Add something to the bag → **Checkout** → **Pay**.
2. In the Razorpay modal use a test instrument:

   | Method | Value |
   |---|---|
   | Card | `4111 1111 1111 1111`, any future expiry, any CVV |
   | UPI (success) | `success@razorpay` |
   | UPI (failure) | `failure@razorpay` |
   | OTP | `1111` |

3. You land on the success page.
4. Open **/admin/payments** → the payment appears under **Confirmed
   payments** with the method used.
5. Open the order → the **Payment** card shows "Payment confirmed", the
   instrument, the payment id, and who confirmed it (webhook / browser
   callback / admin sync).

Deliberately close the tab mid-payment once — the order will show under
**Needs attention** until the webhook lands (a second or two), which proves
the safety net works.

## 6. Going live

1. Complete **KYC** in the dashboard: PAN, GST (if registered), bank
   account, address proof, business proof. Approval usually takes 2–4
   working days.
2. Once approved, switch the dashboard to **Live Mode**.
3. **Account & Settings → API Keys → Generate Live Key** → `rzp_live_…`.
4. Put the live keys in your **production** environment variables (Vercel →
   Project → Settings → Environment Variables) — not in `.env.local`.
5. Add a **second webhook** in Live Mode pointing at your production URL
   with a live webhook secret.
6. Set `NEXT_PUBLIC_SITE_URL` to your real domain in production.
7. **/admin/payments** will show a green **Live mode** badge. Run one real
   ₹1 order and refund it from the order page to confirm both directions.

---

## What the admin panel gives you

| Where | What |
|---|---|
| **/admin/payments** | Captured / refunded / net totals, gateway health, unconfirmed & failed orders, live webhook feed |
| **Reconcile with Razorpay** | Asks Razorpay directly about every unconfirmed order and fixes the local status |
| **Order detail → Payment** | Instrument used, payer contact, payment & refund ids, how it was confirmed, per-order re-check, full or partial refund |
| **Order detail → Payment activity** | Every webhook event received for that order, with timestamps |

## Notes on trust

- Totals are always recomputed server-side from database prices. The
  browser never tells the server what to charge.
- The browser callback is accepted only if its HMAC signature matches your
  key secret; webhooks only if they match your webhook secret.
- Webhook events are deduplicated on Razorpay's event id, so retries can't
  double-apply.
- A shipped or delivered order is never moved backwards by a late event.
