'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { formatINR } from '@/lib/format';
import { updateQuantity, removeFromCart } from '@/app/cart/actions';

export type CartItem = {
  id: string;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  vendor: string | null;
};

export default function CartList({ items }: { items: CartItem[] }) {
  const [pending, startTransition] = useTransition();

  const setQty = (id: string, q: number) =>
    startTransition(() => updateQuantity(id, q).then(() => {}));
  const remove = (id: string) =>
    startTransition(() => removeFromCart(id).then(() => {}));

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '2rem 0 0',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        opacity: pending ? 0.6 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      {items.map((it) => (
        <li
          key={it.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '88px 1fr auto',
            gap: '1.25rem',
            alignItems: 'center',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '1.5rem',
          }}
        >
          <Link href={`/shop/${it.slug}`} data-hover>
            <div
              style={{
                width: 88,
                height: 110,
                borderRadius: 6,
                overflow: 'hidden',
                background: '#15140f',
              }}
            >
              {it.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image_url}
                  alt={it.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
          </Link>

          <div>
            <Link href={`/shop/${it.slug}`} data-hover>
              <p style={{ margin: 0, fontSize: '0.92rem', letterSpacing: '0.04em' }}>{it.name}</p>
            </Link>
            {it.vendor && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                {it.vendor}
              </p>
            )}
            <div style={{ marginTop: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
              <button type="button" aria-label="Decrease" onClick={() => setQty(it.id, it.quantity - 1)} style={qtyBtn}>
                −
              </button>
              <span style={{ minWidth: 20, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {it.quantity}
              </span>
              <button type="button" aria-label="Increase" onClick={() => setQty(it.id, it.quantity + 1)} style={qtyBtn}>
                +
              </button>
              <button
                type="button"
                onClick={() => remove(it.id)}
                style={{
                  marginLeft: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--ink-soft)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                Remove
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(it.price * it.quantity)}
          </div>
        </li>
      ))}
    </ul>
  );
}

const qtyBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: '1px solid var(--line-strong)',
  background: 'transparent',
  color: 'var(--ink)',
  cursor: 'pointer',
  fontSize: '1rem',
  lineHeight: 1,
};
