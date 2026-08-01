'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { setCartQuantity } from '@/app/cart/actions';

/**
 * Product purchase block.
 *
 * The quantity stepper writes straight to the cart: the first "+" (or "Add
 * to bag") adds the item; further +/- update the line quantity live; taking
 * it to 0 removes it from the cart. A centred status line shows "Adding…"
 * then a "View bag →" link.
 *
 * "Buy now" ensures at least one is in the cart and jumps to checkout. A
 * guest is sent to sign in first, carrying BOTH where to come back to and
 * what they were trying to do — so after signing in they land back on this
 * product with the item added and checkout already open, rather than on a
 * cold product page having forgotten why they logged in.
 */
export default function AddToCart({
  productId,
  initialQty = 0,
  signedIn = false,
}: {
  productId: string;
  initialQty?: number;
  signedIn?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [qty, setQty] = useState(initialQty);
  const [err, setErr] = useState<string | null>(null);

  // Send a guest to sign in, remembering the page AND the pending intent.
  const goLogin = (intent?: 'buy' | 'bag') => {
    const next = new URL(location.pathname, location.origin);
    if (intent) next.searchParams.set('intent', intent);
    router.push(`/auth/login?next=${encodeURIComponent(next.pathname + next.search)}`);
  };

  // Persist a target quantity to the cart (0 = remove).
  const sync = (next: number, intent: 'buy' | 'bag', then?: () => void) => {
    setErr(null);
    setQty(next);
    start(async () => {
      const res = await setCartQuantity(productId, next);
      if (res.ok) {
        router.refresh();
        then?.();
      } else if (res.reason === 'auth') {
        setQty(initialQty);
        goLogin(intent);
      } else {
        setErr(res.message ?? 'Could not update bag');
      }
    });
  };

  const buyNow = () => sync(Math.max(1, qty), 'buy', () => router.push('/checkout'));

  // Resume the intent the visitor was sent to sign in for. `?intent=buy`
  // means they pressed Buy now as a guest: add the piece and carry straight
  // on to checkout so signing in doesn't cost them the click. Guarded by a
  // ref because React 18 mounts effects twice in dev.
  const resumed = useRef(false);
  const intent = params.get('intent');
  useEffect(() => {
    if (!signedIn || resumed.current) return;
    if (intent !== 'buy' && intent !== 'bag') return;
    resumed.current = true;

    // Drop the marker first, so a refresh or a Back doesn't replay it.
    const url = new URL(window.location.href);
    url.searchParams.delete('intent');
    window.history.replaceState({}, '', url.pathname + url.search);

    sync(Math.max(1, initialQty), intent, intent === 'buy' ? () => router.push('/checkout') : undefined);
    // `sync` is stable enough for this one-shot resume; re-running on every
    // render would re-add the item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, intent]);

  const inBag = qty > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Quantity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={stepper}>
          <button type="button" aria-label="Decrease" disabled={pending || qty === 0} onClick={() => sync(qty - 1, 'bag')} style={{ ...stepBtn, opacity: qty === 0 ? 0.35 : 1 }}>−</button>
          <span style={{ minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{qty}</span>
          <button type="button" aria-label="Increase" disabled={pending} onClick={() => sync(qty + 1, 'bag')} style={stepBtn}>+</button>
        </div>
      </div>

      {/* Primary actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => sync(Math.max(1, qty), 'bag')}
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

const stepper: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: 48, border: '1px solid var(--line-strong)', borderRadius: 999, padding: '0 0.4rem' };
const stepBtn: React.CSSProperties = { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: '1.25rem', lineHeight: 1, cursor: 'pointer' };
const actionBtn: React.CSSProperties = { height: 52, padding: '0 1.75rem', borderRadius: 999, fontSize: '0.82rem', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' };
