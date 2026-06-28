'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatINR } from '@/lib/format';

type Item = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

type Props = {
  items: Item[];
  total: number;
  defaults: { full_name: string; phone: string; address: string; email: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** Loads the Razorpay checkout script once, resolving when ready. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CheckoutClient({ items, total, defaults }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: defaults.full_name,
    phone: defaults.phone,
    address: defaults.address,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // 1. Create the order server-side (recomputes total from DB).
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start checkout');

      // 2. Load Razorpay and open the modal.
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) throw new Error('Could not load Razorpay');

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Homeera',
        description: 'Order payment',
        order_id: data.orderId,
        prefill: {
          name: form.full_name,
          email: defaults.email,
          contact: form.phone,
        },
        theme: { color: '#d4b574' },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 3. Verify + capture server-side.
          const v = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resp),
          });
          const vData = await v.json();
          if (v.ok) {
            router.push(`/checkout/success?order=${vData.orderId}`);
          } else {
            setError(vData.error || 'Payment could not be verified.');
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  };

  return (
    <main className="container" style={{ padding: '8rem 0 4rem', minHeight: '70svh' }}>
      <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Checkout</h1>

      <div
        style={{
          marginTop: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '3rem',
          alignItems: 'start',
        }}
      >
        {/* Shipping form */}
        <form onSubmit={pay} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Shipping details
          </h2>
          <Field label="Full name">
            <input required value={form.full_name} onChange={set('full_name')} style={input} autoComplete="name" />
          </Field>
          <Field label="Phone">
            <input required value={form.phone} onChange={set('phone')} style={input} autoComplete="tel" inputMode="tel" />
          </Field>
          <Field label="Delivery address">
            <textarea required value={form.address} onChange={set('address')} rows={4} style={{ ...input, resize: 'vertical' }} />
          </Field>

          {error && <p style={{ color: '#e08a8a', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={busy}
            data-hover
            style={{
              marginTop: '0.5rem',
              padding: '1rem',
              borderRadius: 999,
              background: 'var(--gold)',
              color: '#0e0e0e',
              fontWeight: 600,
              fontSize: '0.82rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              border: 'none',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Processing…' : `Pay ${formatINR(total)}`}
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--ink-mute)', textAlign: 'center', margin: 0 }}>
            Secure checkout. Cards, UPI, netbanking &amp; wallets.
          </p>
        </form>

        {/* Order summary */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '1.75rem' }}>
          <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 0 }}>
            Your order
          </h2>
          <ul style={{ listStyle: 'none', margin: '1.25rem 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((it) => (
              <li key={it.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: 54, height: 66, borderRadius: 5, overflow: 'hidden', background: '#15140f', flexShrink: 0 }}>
                  {it.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div style={{ flex: 1, fontSize: '0.86rem' }}>
                  <p style={{ margin: 0 }}>{it.name}</p>
                  <p style={{ margin: '0.2rem 0 0', color: 'var(--ink-soft)' }}>Qty {it.quantity}</p>
                </div>
                <span style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.1rem',
            }}
          >
            <span style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
              Total
            </span>
            <span style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(total)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '0.8rem 1rem',
  color: 'var(--ink)',
  fontSize: '0.95rem',
  width: '100%',
};
