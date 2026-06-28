'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setCartQuantity } from '@/app/cart/actions';
import { toggleFavourite } from '@/app/favourites/actions';

/**
 * Product purchase block.
 *
 * The quantity stepper writes straight to the cart: the first "+" (or "Add
 * to bag") adds the item; further +/- update the line quantity live; taking
 * it to 0 removes it from the cart. A centred status line shows "Adding…"
 * then a "View bag →" link. "Buy now" ensures at least one is in the cart
 * and jumps to checkout. Guests are routed to login.
 */
export default function AddToCart({
  productId,
  favourited = false,
  initialQty = 0,
}: {
  productId: string;
  favourited?: boolean;
  initialQty?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(initialQty);
  const [fav, setFav] = useState(favourited);
  const [err, setErr] = useState<string | null>(null);

  const goLogin = () => router.push(`/auth/login?next=${encodeURIComponent(location.pathname)}`);

  // Persist a target quantity to the cart (0 = remove).
  const sync = (next: number, then?: () => void) => {
    setErr(null);
    setQty(next);
    start(async () => {
      const res = await setCartQuantity(productId, next);
      if (res.ok) {
        router.refresh();
        then?.();
      } else if (res.reason === 'auth') {
        setQty(initialQty);
        goLogin();
      } else {
        setErr(res.message ?? 'Could not update bag');
      }
    });
  };

  const buyNow = () => sync(Math.max(1, qty), () => router.push('/checkout'));

  const toggleFav = () => {
    const next = !fav;
    setFav(next);
    start(async () => {
      const res = await toggleFavourite(productId);
      if (!res.ok) {
        setFav(!next);
        if (res.reason === 'auth') goLogin();
      } else setFav(res.favourited ?? next);
    });
  };

  const inBag = qty > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Quantity + Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={stepper}>
          <button type="button" aria-label="Decrease" disabled={pending || qty === 0} onClick={() => sync(qty - 1)} style={{ ...stepBtn, opacity: qty === 0 ? 0.35 : 1 }}>−</button>
          <span style={{ minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{qty}</span>
          <button type="button" aria-label="Increase" disabled={pending} onClick={() => sync(qty + 1)} style={stepBtn}>+</button>
        </div>

        <button
          type="button"
          onClick={toggleFav}
          disabled={pending}
          aria-pressed={fav}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem', height: 48, padding: '0 1.25rem',
            borderRadius: 999, background: 'transparent', border: '1px solid var(--line-strong)',
            color: fav ? 'var(--gold)' : 'var(--ink)', fontSize: '0.78rem', letterSpacing: '0.14em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          <Heart filled={fav} /> {fav ? 'Saved' : 'Save'}
        </button>
      </div>

      {/* Primary actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => sync(Math.max(1, qty))}
          disabled={pending}
          data-hover
          style={{ ...actionBtn, flex: '1 1 180px', background: inBag ? 'var(--gold)' : 'transparent', color: inBag ? '#0e0e0e' : 'var(--ink)', border: '1px solid var(--line-strong)' }}
        >
          {pending ? 'Adding…' : inBag ? `In bag · ${qty}` : 'Add to bag'}
        </button>
        <button type="button" onClick={buyNow} disabled={pending} data-hover style={{ ...actionBtn, flex: '1 1 180px', background: 'var(--ink)', color: 'var(--bg)', border: 'none' }}>
          Buy now
        </button>
      </div>

      {/* Centred status */}
      <div style={{ textAlign: 'center', minHeight: '1.2rem' }}>
        {pending ? (
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', letterSpacing: '0.1em' }}>Adding…</span>
        ) : inBag ? (
          <button type="button" onClick={() => router.push('/cart')} style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
            View bag →
          </button>
        ) : null}
      </div>

      {err && <p style={{ color: '#e08a8a', fontSize: '0.82rem', margin: 0, textAlign: 'center' }}>{err}</p>}
      <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0, textAlign: 'center' }}>Secure checkout.</p>
    </div>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'var(--gold)' : 'none'} stroke={filled ? 'var(--gold)' : 'currentColor'} strokeWidth="1.6" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const stepper: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: 48, border: '1px solid var(--line-strong)', borderRadius: 999, padding: '0 0.4rem' };
const stepBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: '1.25rem', lineHeight: 1, cursor: 'pointer' };
const actionBtn: React.CSSProperties = { height: 52, padding: '0 1.75rem', borderRadius: 999, fontSize: '0.82rem', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' };
