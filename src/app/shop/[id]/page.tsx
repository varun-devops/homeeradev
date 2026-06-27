import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { products, getSubCollection } from '@/lib/products';

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const p = products.find((x) => x.id === params.id);
  if (!p) return { title: 'Not found' };
  return {
    title: `${p.name}`,
    description: p.blurb,
    alternates: { canonical: `/shop/${p.id}` },
    openGraph: { title: p.name, description: p.blurb },
  };
}

export default function ProductPage({ params }: { params: { id: string } }) {
  const p = products.find((x) => x.id === params.id);
  if (!p) notFound();

  const subLabel = getSubCollection(p.category)?.label ?? p.category;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.blurb,
    brand: { '@type': 'Brand', name: 'Homeera' },
    category: p.category,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <article className="container" style={{ padding: '8rem 0 4rem' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/shop"
        data-hover
        style={{
          fontSize: '0.78rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
        }}
      >
        ← Back to shop
      </Link>

      <div
        style={{
          marginTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '3rem',
          alignItems: 'start',
        }}
      >
        <div
          style={{
            aspectRatio: '4 / 5',
            background: p.tone,
            borderRadius: 'var(--radius)',
          }}
        />
        <div>
          <p
            style={{
              fontSize: '0.78rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              marginBottom: '0.5rem',
            }}
          >
            {subLabel} · made by {p.maker}
          </p>
          <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            {p.name}
          </h1>
          <div
            style={{
              marginTop: '1.25rem',
              fontSize: '1.5rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${p.price}
          </div>
          <p style={{ marginTop: '1.5rem', color: 'var(--ink-soft)', fontSize: '1.05rem' }}>
            {p.blurb}
          </p>
          <button
            data-hover
            style={{
              marginTop: '2rem',
              padding: '1rem 2rem',
              borderRadius: 999,
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: '0.82rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Add to bag
          </button>
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            Showcase only — checkout opens later this season.
          </p>
        </div>
      </div>
    </article>
  );
}
