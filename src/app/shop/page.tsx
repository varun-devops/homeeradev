import type { Metadata } from 'next';
import Link from 'next/link';
import { products, categoriesList, type Category } from '@/lib/products';

export const metadata: Metadata = {
  title: 'Shop — Considered objects for the home',
  description:
    'Browse Homeera living, decor, lighting and outdoor pieces. Small-batch, slow-made, built to repair.',
  alternates: { canonical: '/shop' },
};

type SearchParams = { cat?: string };

export default function ShopPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const active = (searchParams?.cat as Category | undefined) ?? null;
  const visible = active ? products.filter((p) => p.category === active) : products;

  return (
    <section className="container" style={{ padding: '8rem 0 4rem' }}>
      <header style={{ marginBottom: '3rem', maxWidth: 720 }}>
        <p
          style={{
            fontSize: '0.78rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
            marginBottom: '0.75rem',
          }}
        >
          Shop · {visible.length} pieces
        </p>
        <h1 style={{ fontStyle: 'italic' }}>
          {active
            ? categoriesList.find((c) => c.slug === active)?.label
            : 'Everything in the studio.'}
        </h1>
        {active && (
          <p style={{ color: 'var(--ink-soft)', marginTop: '1rem', fontSize: '1.05rem' }}>
            {categoriesList.find((c) => c.slug === active)?.copy}
          </p>
        )}
      </header>

      <nav
        aria-label="Filter by category"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '3rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <FilterLink href="/shop" active={!active}>All</FilterLink>
        {categoriesList.map((c) => (
          <FilterLink key={c.slug} href={`/shop?cat=${c.slug}`} active={active === c.slug}>
            {c.label}
          </FilterLink>
        ))}
      </nav>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '2rem 1.5rem',
        }}
      >
        {visible.map((p) => (
          <Link
            key={p.id}
            href={`/shop/${p.id}`}
            data-hover
            style={{ display: 'block' }}
          >
            <div
              style={{
                aspectRatio: '4 / 5',
                background: p.tone,
                borderRadius: 'var(--radius)',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 600ms var(--ease-out)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  fontSize: '0.7rem',
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                }}
              >
                {p.category}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>
                  {p.name}
                </div>
                <div style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>{p.maker}</div>
              </div>
              <div style={{ fontVariantNumeric: 'tabular-nums' }}>${p.price}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-hover
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--bg)' : 'var(--ink-soft)',
        fontSize: '0.78rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        transition: 'background 240ms var(--ease-out), color 240ms var(--ease-out)',
      }}
    >
      {children}
    </Link>
  );
}
