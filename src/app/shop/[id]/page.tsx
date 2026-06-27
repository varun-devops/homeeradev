import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getAllProductSlugs, formatINR } from '@/lib/catalog';
import AddToCart from '@/components/AddToCart';

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((id) => ({ id }));
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const p = await getProductBySlug(params.id);
  if (!p) return { title: 'Not found' };
  return {
    title: p.name,
    description: p.description ?? p.name,
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: {
      title: p.name,
      description: p.description ?? p.name,
      images: p.image_url ? [p.image_url] : [],
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const p = await getProductBySlug(params.id);
  if (!p) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description ?? p.name,
    sku: p.sku,
    image: p.image_url ?? undefined,
    brand: { '@type': 'Brand', name: 'Homeera' },
    category: `${p.category} / ${p.sub_category}`,
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'INR',
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
            background: '#15140f',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {p.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.image_url}
              alt={p.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </div>

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
            {p.sub_category}
            {p.vendor ? ` · ${p.vendor}` : ''}
          </p>
          <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            {p.name}
          </h1>
          <div
            style={{
              marginTop: '1.25rem',
              fontSize: '1.5rem',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--gold)',
            }}
          >
            {formatINR(p.price)}
          </div>

          {(p.material || p.size || p.variant) && (
            <dl
              style={{
                marginTop: '1.75rem',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '0.5rem 1.5rem',
                fontSize: '0.92rem',
                color: 'var(--ink-soft)',
              }}
            >
              {p.material && (
                <>
                  <dt style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.72rem' }}>Material</dt>
                  <dd style={{ margin: 0 }}>{p.material}</dd>
                </>
              )}
              {p.variant && (
                <>
                  <dt style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.72rem' }}>Finish</dt>
                  <dd style={{ margin: 0 }}>{p.variant}</dd>
                </>
              )}
              {p.size && (
                <>
                  <dt style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.72rem' }}>Size</dt>
                  <dd style={{ margin: 0 }}>{p.size} cm</dd>
                </>
              )}
            </dl>
          )}

          <div style={{ marginTop: '2rem' }}>
            <AddToCart productId={p.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
