'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { formatINR } from '@/lib/format';
import { removeFromCart } from '@/app/cart/actions';
import { saveAddress } from '@/app/checkout/actions';
import Img from '@/components/Img';
import {
  EMPTY_ADDRESS,
  INDIAN_STATES,
  isAddressComplete,
  validateAddress,
  type Address,
} from '@/lib/address';

type Item = {
  id: string;
  cartItemId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

type Props = {
  items: Item[];
  total: number;
  email: string;
  /** Whatever address the customer has on file — may be blank. */
  saved: Address;
};

type Serviceability =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok'; etaDays: number; city?: string | null; stateName?: string | null }
  | { state: 'blocked'; message: string };

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

/**
 * Checkout: address on the left, order summary on the right.
 *
 * The address is collected field by field — pin code, locality, city,
 * state, name, street, mobile — laid out in columns, because that is what a
 * courier actually needs and what a customer can correct without retyping
 * the whole thing.
 *
 * Payment is gated on a SERVICEABLE address: the pin code is checked
 * against /api/serviceability as soon as six digits are entered, and
 * "Continue to payment" stays disabled until a complete, deliverable
 * address is selected. That mirrors how Indian storefronts behave and
 * stops orders being taken for places we cannot ship to.
 */
export default function CheckoutClient({ items, total, email, saved }: Props) {
  const router = useRouter();

  const hasSaved = isAddressComplete(saved);
  // Start on the saved address when there is one, otherwise straight into
  // the form — a first-time buyer shouldn't have to press "add address".
  const [editing, setEditing] = useState(!hasSaved);
  const [address, setAddress] = useState<Address>(hasSaved ? saved : EMPTY_ADDRESS);
  const [draft, setDraft] = useState<Address>(hasSaved ? saved : EMPTY_ADDRESS);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const [service, setService] = useState<Serviceability>({ state: 'idle' });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();

  // The pin code being shown in the summary is the selected address's when
  // one is confirmed, and the draft's while the form is open.
  const activePin = (editing ? draft.pin_code : address.pin_code).trim();

  // ---- serviceability -------------------------------------------------
  // Re-checked whenever the active pin code becomes six digits. The request
  // id guards against an older, slower response overwriting a newer one.
  const reqId = useRef(0);
  const checkPin = useCallback(async (pin: string) => {
    const id = ++reqId.current;
    setService({ state: 'checking' });
    try {
      const res = await fetch(`/api/serviceability?pin=${encodeURIComponent(pin)}`);
      const data = await res.json();
      if (id !== reqId.current) return;
      if (data.serviceable) {
        setService({
          state: 'ok',
          etaDays: data.etaDays ?? 7,
          city: data.city,
          stateName: data.state,
        });
        // Fill city/state from the pin code when we know them and the
        // customer hasn't typed their own.
        if (data.city || data.state) {
          setDraft((d) => ({
            ...d,
            city: d.city || data.city || '',
            state: d.state || data.state || '',
          }));
        }
      } else {
        setService({ state: 'blocked', message: data.message ?? 'We don’t deliver there yet.' });
      }
    } catch {
      if (id !== reqId.current) return;
      // Network trouble must not wedge checkout — treat as deliverable.
      setService({ state: 'ok', etaDays: 7 });
    }
  }, []);

  useEffect(() => {
    if (!/^[1-9]\d{5}$/.test(activePin)) {
      reqId.current++;
      setService({ state: 'idle' });
      return;
    }
    checkPin(activePin);
  }, [activePin, checkPin]);

  // ---- address form ---------------------------------------------------
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    const value =
      k === 'pin_code' ? raw.replace(/\D/g, '').slice(0, 6)
      : k === 'phone' ? raw.replace(/[^\d+ ]/g, '').slice(0, 14)
      : raw;
    setDraft((d) => ({ ...d, [k]: value }));
    setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));
  };

  const onSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateAddress(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    startSave(async () => {
      const res = await saveAddress(draft);
      if (res.ok) {
        setAddress(res.address);
        setEditing(false);
        router.refresh();
      } else if (res.reason === 'auth') {
        router.push('/auth/login?next=/checkout');
      } else if (res.reason === 'invalid') {
        setErrors(res.errors ?? {});
      } else {
        setError(res.message ?? 'Could not save the address.');
      }
    });
  };

  // Remove an item from the cart. When the cart empties, the server page
  // redirects back to /cart, which router.refresh() picks up.
  const remove = (cartItemId: string) =>
    startRemove(async () => {
      await removeFromCart(cartItemId);
      router.refresh();
    });

  // ---- payment --------------------------------------------------------
  const canPay = !editing && isAddressComplete(address) && service.state === 'ok';

  const pay = async () => {
    if (!canPay) return;
    setError(null);
    setBusy(true);
    try {
      // 1. Create the order server-side (recomputes total from DB).
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(address),
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
        prefill: { name: address.full_name, email, contact: address.phone },
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
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setBusy(false);
    }
  };

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <main className="container heCo" style={{ paddingTop: '8rem', paddingBottom: '4rem', minHeight: '70svh' }}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Checkout</h1>

      <div className="heCo-grid">
        {/* ================= LEFT — address ================= */}
        <section>
          {/* --- saved address, when one is confirmed --- */}
          {!editing && (
            <div className="heCo-card">
              <div className="heCo-cardHead">
                <h2 className="heCo-h2">Deliver to</h2>
                <button type="button" className="heCo-link" onClick={() => { setDraft(address); setEditing(true); }}>
                  Change
                </button>
              </div>
              <p className="heCo-addrName">{address.full_name}</p>
              <p className="heCo-addrBody">
                {address.address_line}
                <br />
                {address.locality}
                <br />
                {address.city}, {address.state} — {address.pin_code}
              </p>
              <p className="heCo-addrPhone">Mobile: {address.phone}</p>
              <ServiceNote service={service} />
            </div>
          )}

          {/* --- the column-wise address form --- */}
          {editing && (
            <form onSubmit={onSaveAddress} className="heCo-card">
              <h2 className="heCo-h2" style={{ marginBottom: '1.5rem' }}>
                {hasSaved ? 'Edit address' : 'Add new address'}
              </h2>

              <div className="heCo-fields">
                <Field className="heCo-col-half" label="Pin Code" required error={errors.pin_code}>
                  <input
                    value={draft.pin_code}
                    onChange={set('pin_code')}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className="heCo-input"
                    data-bad={Boolean(errors.pin_code)}
                  />
                </Field>

                <Field className="heCo-col-full" label="Locality / Town" required error={errors.locality}>
                  <input
                    value={draft.locality}
                    onChange={set('locality')}
                    autoComplete="address-level3"
                    className="heCo-input"
                    data-bad={Boolean(errors.locality)}
                  />
                </Field>

                <Field className="heCo-col-half" label="City / District" required error={errors.city}>
                  <input
                    value={draft.city}
                    onChange={set('city')}
                    autoComplete="address-level2"
                    className="heCo-input"
                    data-bad={Boolean(errors.city)}
                  />
                </Field>

                <Field className="heCo-col-half" label="State" required error={errors.state}>
                  <select
                    value={draft.state}
                    onChange={set('state')}
                    autoComplete="address-level1"
                    className="heCo-input"
                    data-bad={Boolean(errors.state)}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <Field className="heCo-col-full" label="Name" required error={errors.full_name}>
                  <input
                    value={draft.full_name}
                    onChange={set('full_name')}
                    autoComplete="name"
                    className="heCo-input"
                    data-bad={Boolean(errors.full_name)}
                  />
                </Field>

                <Field
                  className="heCo-col-full"
                  label="Address"
                  required
                  error={errors.address_line}
                  hint="Flat / house no., building, street, area"
                >
                  <textarea
                    value={draft.address_line}
                    onChange={set('address_line')}
                    rows={3}
                    autoComplete="street-address"
                    className="heCo-input"
                    style={{ resize: 'vertical' }}
                    data-bad={Boolean(errors.address_line)}
                  />
                </Field>

                <Field className="heCo-col-half" label="Mobile No" required error={errors.phone}>
                  <input
                    value={draft.phone}
                    onChange={set('phone')}
                    inputMode="tel"
                    autoComplete="tel"
                    className="heCo-input"
                    data-bad={Boolean(errors.phone)}
                  />
                </Field>
              </div>

              <ServiceNote service={service} />

              <div className="heCo-formActions">
                <button type="submit" disabled={saving} className="heCo-save">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {hasSaved && (
                  <button
                    type="button"
                    className="heCo-link"
                    onClick={() => { setDraft(address); setErrors({}); setEditing(false); }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* ================= RIGHT — summary ================= */}
        <aside className="heCo-summary">
          <div className="heCo-card">
            <h2 className="heCo-kicker">Delivery speed</h2>
            <div className="heCo-speed">
              <p className="heCo-speedName">Standard delivery</p>
              <p className="heCo-speedSub">
                {service.state === 'ok'
                  ? `Free delivery · arrives in about ${service.etaDays} days`
                  : 'Free delivery'}
              </p>
            </div>
          </div>

          <div className="heCo-card" style={{ marginTop: '1rem' }}>
            <h2 className="heCo-kicker">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </h2>

            <ul className="heCo-items" style={{ opacity: removing ? 0.6 : 1 }}>
              {items.map((it) => (
                <li key={it.cartItemId} className="heCo-item">
                  <div className="heCo-thumb">
                    {it.image_url && (
                      <Img src={it.image_url} alt="" sizes="72px" widths={[72, 144, 216]} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="heCo-itemName">{it.name}</p>
                    <p className="heCo-itemQty">Qty {it.quantity}</p>
                  </div>
                  <span className="heCo-itemPrice">{formatINR(it.price * it.quantity)}</span>
                  <button
                    type="button"
                    onClick={() => remove(it.cartItemId)}
                    disabled={removing}
                    aria-label={`Remove ${it.name}`}
                    title="Remove"
                    className="heCo-remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            <Link href="/shop" data-hover className="heCo-addMore">
              + Add more items
            </Link>

            <dl className="heCo-totals">
              <dt>Order total</dt>
              <dd>{formatINR(total)}</dd>
              <dt>Delivery</dt>
              <dd className="heCo-free">Free</dd>
            </dl>

            <div className="heCo-payable">
              <span>Total payable</span>
              <span>{formatINR(total)}</span>
            </div>

            {error && <p className="heCo-error">{error}</p>}

            <button
              type="button"
              onClick={pay}
              disabled={!canPay || busy}
              data-hover
              className="heCo-pay"
              data-on={canPay && !busy}
            >
              {busy ? 'Processing…' : 'Continue to payment'}
            </button>

            {!canPay && (
              <p className="heCo-gate">
                {editing
                  ? 'Please save a delivery address to proceed'
                  : service.state === 'blocked'
                    ? service.message
                    : service.state === 'checking'
                      ? 'Checking serviceability…'
                      : 'Please select a serviceable address to proceed'}
              </p>
            )}

            <p className="heCo-secure">Secure checkout. Cards, UPI, netbanking &amp; wallets.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────
function ServiceNote({ service }: { service: Serviceability }) {
  if (service.state === 'idle') return null;
  if (service.state === 'checking') {
    return <p className="heCo-note">Checking delivery to this pin code…</p>;
  }
  if (service.state === 'blocked') {
    return <p className="heCo-note heCo-note--bad">{service.message}</p>;
  }
  return (
    <p className="heCo-note heCo-note--ok">
      Delivers here in about {service.etaDays} business days.
    </p>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`heCo-field ${className ?? ''}`}>
      <span className="heCo-label">
        {label}
        {required && <span className="heCo-req">*</span>}
      </span>
      {children}
      {hint && !error && <span className="heCo-hint">{hint}</span>}
      {error && <span className="heCo-err">{error}</span>}
    </label>
  );
}

// ──────────────────────────────────────────────────────────────────
const styles = `
  .heCo-grid {
    margin-top: 2.5rem;
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
    gap: clamp(1.5rem, 3vw, 3rem);
    align-items: start;
  }
  @media (max-width: 900px) {
    .heCo-grid { grid-template-columns: 1fr; }
  }

  .heCo-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: clamp(1.25rem, 3vw, 1.9rem);
    background: rgba(255,255,255,0.02);
  }
  .heCo-cardHead {
    display: flex; align-items: center; justify-content: space-between;
    gap: 1rem; margin-bottom: 1rem;
  }
  .heCo-h2 {
    font-size: 0.78rem; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink); margin: 0; font-family: var(--font-sans); font-weight: 300;
  }
  .heCo-kicker {
    font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--ink-soft); margin: 0 0 1rem; font-family: var(--font-sans); font-weight: 300;
  }
  .heCo-link {
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--gold); font-size: 0.74rem; letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  /* ---------- saved address ---------- */
  .heCo-addrName { margin: 0 0 0.4rem; font-size: 1rem; color: var(--ink); }
  .heCo-addrBody { margin: 0; color: var(--ink-soft); font-size: 0.92rem; line-height: 1.7; }
  .heCo-addrPhone { margin: 0.6rem 0 0; color: var(--ink-soft); font-size: 0.88rem; }

  /* ---------- the column-wise form ---------- */
  .heCo-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.15rem 1.25rem;
  }
  .heCo-col-full { grid-column: 1 / -1; }
  .heCo-col-half { grid-column: span 1; }
  @media (max-width: 560px) {
    .heCo-fields { grid-template-columns: 1fr; }
    .heCo-col-half { grid-column: 1 / -1; }
  }

  .heCo-field { display: flex; flex-direction: column; gap: 0.4rem; min-width: 0; }
  .heCo-label {
    font-size: 0.68rem; letter-spacing: 0.16em; text-transform: uppercase;
    color: var(--ink-soft);
  }
  .heCo-req { color: var(--gold); margin-left: 0.15rem; }
  .heCo-hint { font-size: 0.72rem; color: var(--ink-mute); }
  .heCo-err { font-size: 0.74rem; color: #e08a8a; }

  .heCo-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    padding: 0.75rem 0.95rem;
    color: var(--ink);
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 200ms var(--ease-out);
  }
  .heCo-input:focus { outline: none; border-color: var(--gold); }
  .heCo-input[data-bad='true'] { border-color: #e08a8a; }
  select.heCo-input { appearance: none; cursor: pointer; }
  select.heCo-input option { background: #141414; color: var(--ink); }

  .heCo-formActions {
    margin-top: 1.75rem; display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
  }
  .heCo-save {
    padding: 0.9rem 2.75rem; border-radius: 999px; border: none;
    background: var(--gold); color: #0e0e0e; cursor: pointer;
    font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 300;
  }
  .heCo-save:disabled { opacity: 0.6; cursor: wait; }

  .heCo-note { margin: 1.1rem 0 0; font-size: 0.82rem; color: var(--ink-soft); }
  .heCo-note--ok { color: var(--gold); }
  .heCo-note--bad { color: #e08a8a; }

  /* ---------- summary ---------- */
  .heCo-summary { position: sticky; top: 6rem; }
  @media (max-width: 900px) { .heCo-summary { position: static; } }

  .heCo-speed {
    border: 1px solid var(--line-strong); border-radius: 10px;
    padding: 0.9rem 1.1rem; background: rgba(212,181,116,0.06);
  }
  .heCo-speedName { margin: 0; color: var(--ink); font-size: 0.95rem; }
  .heCo-speedSub { margin: 0.2rem 0 0; color: var(--ink-soft); font-size: 0.82rem; }

  .heCo-items { list-style: none; margin: 0 0 1rem; padding: 0; display: flex; flex-direction: column; gap: 1rem; transition: opacity 200ms ease; }
  .heCo-item { display: flex; gap: 0.85rem; align-items: center; }
  .heCo-thumb { width: 48px; height: 58px; border-radius: 5px; overflow: hidden; background: #15140f; flex-shrink: 0; }
  .heCo-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .heCo-itemName { margin: 0; font-size: 0.85rem; color: var(--ink); }
  .heCo-itemQty { margin: 0.15rem 0 0; font-size: 0.78rem; color: var(--ink-soft); }
  .heCo-itemPrice { color: var(--gold); font-variant-numeric: tabular-nums; font-size: 0.88rem; white-space: nowrap; }
  .heCo-remove {
    flex-shrink: 0; width: 26px; height: 26px; display: grid; place-items: center;
    border-radius: 999px; border: 1px solid var(--line-strong); background: transparent;
    color: var(--ink-soft); cursor: pointer; font-size: 1rem; line-height: 1;
  }
  .heCo-addMore {
    display: inline-block; font-size: 0.74rem; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--ink);
    border-bottom: 1px solid var(--ink); padding-bottom: 0.15rem;
  }

  .heCo-totals {
    display: grid; grid-template-columns: 1fr auto; gap: 0.5rem 1rem;
    margin: 1.5rem 0 0; padding-top: 1.1rem; border-top: 1px solid var(--line);
    font-size: 0.88rem;
  }
  .heCo-totals dt { color: var(--ink-soft); }
  .heCo-totals dd { margin: 0; text-align: right; color: var(--ink); font-variant-numeric: tabular-nums; }
  .heCo-free { color: #8fce8f !important; letter-spacing: 0.1em; text-transform: uppercase; font-size: 0.78rem; }

  .heCo-payable {
    display: flex; justify-content: space-between; align-items: baseline;
    margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--line);
    font-size: 1.05rem; color: var(--ink);
  }
  .heCo-payable span:last-child { color: var(--gold); font-variant-numeric: tabular-nums; }

  .heCo-pay {
    width: 100%; margin-top: 1.4rem; padding: 1rem; border-radius: 999px; border: none;
    background: rgba(212,181,116,0.25); color: rgba(14,14,14,0.55);
    font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 300;
    cursor: not-allowed; transition: background 240ms var(--ease-out), color 240ms var(--ease-out);
  }
  .heCo-pay[data-on='true'] { background: var(--gold); color: #0e0e0e; cursor: pointer; }

  .heCo-gate { margin: 0.75rem 0 0; text-align: center; font-size: 0.78rem; color: #e0a58a; }
  .heCo-error { margin: 1rem 0 0; font-size: 0.85rem; color: #e08a8a; }
  .heCo-secure { margin: 0.85rem 0 0; text-align: center; font-size: 0.74rem; color: var(--ink-mute); }
`;
