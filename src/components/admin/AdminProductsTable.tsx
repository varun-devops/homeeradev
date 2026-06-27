'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { formatINR } from '@/lib/format';
import { setProductActive, setProductPrice } from '@/app/admin/actions';

type Row = {
  id: string;
  sku: string;
  name: string;
  category: string;
  sub_category: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
};

export default function AdminProductsTable({ products }: { products: Row[] }) {
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState('');
  const [pending, start] = useTransition();

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.sku.toLowerCase().includes(query.toLowerCase()) ||
      r.category.toLowerCase().includes(query.toLowerCase()),
  );

  const toggle = (id: string, next: boolean) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, is_active: next } : r)));
    start(() => setProductActive(id, next).then(() => {}));
  };

  const savePrice = (id: string, value: string) => {
    const price = parseInt(value.replace(/[^0-9]/g, ''), 10);
    if (!Number.isFinite(price)) return;
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, price } : r)));
    start(() => setProductPrice(id, price).then(() => {}));
  };

  return (
    <div>
      <input
        type="search"
        placeholder="Search name, SKU, category…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 360,
          marginBottom: '1.25rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--line-strong)',
          borderRadius: 8,
          padding: '0.7rem 1rem',
          color: 'var(--ink)',
          fontSize: '0.9rem',
        }}
      />

      <div style={{ overflowX: 'auto', opacity: pending ? 0.7 : 1, transition: 'opacity 150ms' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: 680 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-soft)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.12em' }}>
              <th style={th}>Product</th>
              <th style={th}>Category</th>
              <th style={th}>SKU</th>
              <th style={{ ...th, textAlign: 'right' }}>Price ₹</th>
              <th style={{ ...th, textAlign: 'center' }}>Visible</th>
              <th style={{ ...th, textAlign: 'center' }}>Edit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 42, height: 52, borderRadius: 5, overflow: 'hidden', background: '#15140f', flexShrink: 0 }}>
                      {r.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>
                    <span>{r.name}</span>
                  </div>
                </td>
                <td style={{ ...td, color: 'var(--ink-soft)' }}>
                  {r.category}
                  <br />
                  <span style={{ fontSize: '0.76rem', color: 'var(--ink-mute)' }}>{r.sub_category}</span>
                </td>
                <td style={{ ...td, color: 'var(--ink-mute)', fontSize: '0.76rem' }}>{r.sku}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <input
                    type="text"
                    defaultValue={r.price}
                    onBlur={(e) => savePrice(r.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    style={{
                      width: 90,
                      textAlign: 'right',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--line-strong)',
                      borderRadius: 6,
                      padding: '0.4rem 0.5rem',
                      color: 'var(--gold)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.is_active}
                    onClick={() => toggle(r.id, !r.is_active)}
                    title={r.is_active ? 'Visible — click to hide' : 'Hidden — click to show'}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background: r.is_active ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
                      position: 'relative',
                      transition: 'background 200ms ease',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: 3,
                        left: r.is_active ? 23 : 3,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: '#0e0e0e',
                        transition: 'left 200ms ease',
                      }}
                    />
                  </button>
                </td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <Link
                    href={`/admin/products/${r.id}`}
                    style={{
                      display: 'inline-block',
                      padding: '0.4rem 0.85rem',
                      borderRadius: 6,
                      border: '1px solid var(--line-strong)',
                      color: 'var(--ink)',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ color: 'var(--ink-soft)', padding: '2rem 0', textAlign: 'center' }}>No matches.</p>
        )}
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>
        Tip: edit a price and press Enter (or click away) to save. Toggling visibility hides a product from the shop instantly.
      </p>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.6rem 0.75rem' };
const td: React.CSSProperties = { padding: '0.7rem 0.75rem', verticalAlign: 'middle' };
