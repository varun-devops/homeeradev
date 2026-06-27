'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addToCart } from '@/app/cart/actions';

/**
 * Add-to-cart button. Calls the server action; if the user isn't signed
 * in it redirects to login (preserving where they came from). Shows a
 * brief "Added ✓" confirmation on success.
 */
export default function AddToCart({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onAdd = () => {
    setErr(null);
    startTransition(async () => {
      const res = await addToCart(productId, 1);
      if (res.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      } else if (res.reason === 'auth') {
        router.push(`/auth/login?next=${encodeURIComponent(location.pathname)}`);
      } else {
        setErr(res.message ?? 'Could not add to cart');
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <button
        type="button"
        data-hover
        onClick={onAdd}
        disabled={pending}
        style={{
          padding: '1rem 2rem',
          borderRadius: 999,
          background: done ? 'var(--gold)' : 'var(--ink)',
          color: done ? '#0e0e0e' : 'var(--bg)',
          fontSize: '0.82rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.7 : 1,
          transition: 'background 240ms ease, color 240ms ease',
        }}
      >
        {done ? 'Added ✓' : pending ? 'Adding…' : 'Add to bag'}
      </button>
      {err && <p style={{ color: '#e08a8a', fontSize: '0.82rem' }}>{err}</p>}
      <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
        Secure checkout with Razorpay.
      </p>
    </div>
  );
}
