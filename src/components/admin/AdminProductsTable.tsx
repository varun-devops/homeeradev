'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { setProductActive, setProductPrice } from '@/app/admin/actions';
import Img from '@/components/Img';

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  sub_category: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  created_at?: string | null;
  /** Present once supabase/migration-10-product-updated-at.sql is applied. */
  updated_at?: string | null;
};

type Sort = 'name' | 'newest' | 'edited' | 'price-desc' | 'price-asc';

/**
 * Admin product list: filter, then edit price and visibility inline.
 *
 * Every filter narrows the same array in memory. The whole catalogue is a few
 * dozen rows, so filtering client-side keeps it instant and avoids a server
 * round trip per keystroke; if the catalogue ever outgrows that, this is the
 * place to move to a server query.
 */
export default function AdminProductsTable({
  products,
  initialCategory = '',
  initialSubCategory = '',
}: {
  products: ProductRow[];
  /** Seeds the filters from a link on /admin/collections, e.g. "View products". */
  initialCategory?: string;
  initialSubCategory?: string;
}) {
  const [rows, setRows] = useState(products);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [subCategory, setSubCategory] = useState(initialSubCategory);
  const [visibility, setVisibility] = useState<'' | 'visible' | 'hidden'>('');
  const [sort, setSort] = useState<Sort>('name');
  const [pending, start] = useTransition();

  // Options come from the data itself, so a category that exists only on
  // products still appears even if its collections row was never created.
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter(Boolean))].sort(),
    [rows],
  );
  const subCategories = useMemo(() => {
    const scoped = category ? rows.filter((r) => r.category === category) : rows;
    return [...new Set(scoped.map((r) => r.sub_category).filter(Boolean))].sort();
  }, [rows, category]);

  const anyEditedDates = rows.some((r) => r.updated_at);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (category && r.category !== category) return false;
      if (subCategory && r.sub_category !== subCategory) return false;
      if (visibility === 'visible' && !r.is_active) return false;
      if (visibility === 'hidden' && r.is_active) return false;
      if (!q) return true;
      // Name and item number are what anyone actually searches by.
      return r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
    });

    const time = (v?: string | null) => (v ? new Date(v).getTime() : 0);
    const sorted = [...out];
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => time(b.created_at) - time(a.created_at));
        break;
      case 'edited':
        sorted.sort((a, b) => time(b.updated_at ?? b.created_at) - time(a.updated_at ?? a.created_at));
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price);
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [rows, query, category, subCategory, visibility, sort]);

  const activeFilters = Boolean(query || category || subCategory || visibility);

  const clearAll = () => {
    setQuery('');
    setCategory('');
    setSubCategory('');
    setVisibility('');
  };

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
      {/* ---------- filters ---------- */}
      <div style={filterBar}>
        <input
          type="search"
          placeholder="Search product name or item number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...control, flex: '2 1 260px' }}
        />

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            // The chosen sub-category may not exist under the new category.
            setSubCategory('');
          }}
          style={{ ...control, flex: '1 1 170px' }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={subCategory}
          onChange={(e) => setSubCategory(e.target.value)}
          style={{ ...control, flex: '1 1 170px' }}
        >
          <option value="">All sub-categories</option>
          {subCategories.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as '' | 'visible' | 'hidden')}
          style={{ ...control, flex: '0 1 140px' }}
        >
          <option value="">Any status</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          style={{ ...control, flex: '0 1 170px' }}
        >
          <option value="name">Sort: name (A–Z)</option>
          <option value="newest">Sort: newest added</option>
          <option value="edited">Sort: recently edited</option>
          <option value="price-desc">Sort: price, high → low</option>
          <option value="price-asc">Sort: price, low → high</option>
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', margin: '0 0 1.25rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> of {rows.length}
        </span>
        {activeFilters && (
          <button type="button" onClick={clearAll} style={clearBtn}>
            Clear filters
          </button>
        )}
      </div>

      {/* ---------- table ---------- */}
      <div className="adminScroll" style={{ opacity: pending ? 0.7 : 1, transition: 'opacity 150ms' }}>
        <table style={{ fontSize: '0.86rem', minWidth: 880 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-soft)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.12em' }}>
              <th style={th}>Product</th>
              <th style={th}>Category</th>
              <th style={th}>Item No.</th>
              <th style={{ ...th, textAlign: 'right' }}>Price ₹</th>
              <th style={th}>Added</th>
              <th style={th}>Edited</th>
              <th style={{ ...th, textAlign: 'center' }}>Visible</th>
              <th style={{ ...th, textAlign: 'center' }}>Edit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 5, overflow: 'hidden', background: '#15140f', flexShrink: 0 }}>
                      {r.image_url && (
                        <Img src={r.image_url} alt="" sizes="56px" widths={[56, 112, 168]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <td style={dateTd} title={fullDate(r.created_at)}>{shortDate(r.created_at)}</td>
                <td style={dateTd} title={fullDate(r.updated_at)}>
                  {anyEditedDates ? shortDate(r.updated_at) : '—'}
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
          <p style={{ color: 'var(--ink-soft)', padding: '2rem 0', textAlign: 'center' }}>
            No products match these filters.
          </p>
        )}
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>
        Tip: edit a price and press Enter (or click away) to save. Toggling visibility hides a product from the shop instantly.
        {!anyEditedDates && ' The Edited column fills in once migration-10 is applied in Supabase.'}
      </p>
    </div>
  );
}

/** "12 Mar 2026" — compact enough for a table cell. */
function shortDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Full timestamp, shown on hover. */
function fullDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB');
}

const filterBar: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  marginBottom: '0.9rem',
};
// Appearance (background, border, caret, focus ring) lives in the admin
// layout's stylesheet so every control matches; an inline 
// here would be a shorthand that wipes the select's custom caret image.
const control: React.CSSProperties = { minWidth: 0 };
const clearBtn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line-strong)',
  borderRadius: 999,
  padding: '0.35rem 0.9rem',
  color: 'var(--ink-soft)',
  fontSize: '0.72rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
const th: React.CSSProperties = { padding: '0.6rem 0.75rem' };
const td: React.CSSProperties = { padding: '0.7rem 0.75rem', verticalAlign: 'middle' };
const dateTd: React.CSSProperties = {
  ...td,
  color: 'var(--ink-mute)',
  fontSize: '0.76rem',
  whiteSpace: 'nowrap',
};
