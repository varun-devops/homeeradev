'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { formatINR } from '@/lib/format';
import { updateQuantity, removeFromCart } from '@/app/cart/actions';
import Img from '@/components/Img';

export type CartItem = {
  id: string;
  quantity: number;
  name: string;
  slug: string;
  /** What this line is actually charged, after any discount. */
  price: number;
  /** Pre-discount price, shown struck through when the two differ. */
  list_price: number;
  discount_percent: number;
  image_url: string | null;
  sku: string | null;
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
                <Img
                  src={it.image_url}
                  alt={it.name}
                  sizes="88px"
                  widths={[88, 176, 264]}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>
          </Link>

          <div>
            <Link href={`/shop/${it.slug}`} data-hover>
              <p style={{ margin: 0, fontSize: '0.92rem', letterSpacing: '0.04em' }}>{it.name}</p>
            </Link>
            {it.sku && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                Item No. {it.sku}
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

          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            <div style={{ color: 'var(--gold)' }}>{formatINR(it.price * it.quantity)}</div>
            {it.discount_percent > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-mute)', marginTop: '0.15rem' }}>
                <s>{formatINR(it.list_price * it.quantity)}</s>{' '}
                <span style={{ color: 'var(--gold)' }}>-{it.discount_percent}%</span>
              </div>
            )}
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
