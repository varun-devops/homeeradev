import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getAllProductSlugs, formatINR } from '@/lib/catalog';
import AddToCart from '@/components/AddToCart';
import ProductGallery from '@/components/ProductGallery';
import ProductOptions from '@/components/ProductOptions';

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((id) => ({ id }));
}

// Prerendered per product and served from the edge. Nothing on this render
// path reads cookies any more — the visitor's bag quantity is fetched by
// AddToCart on the client — so the HTML is identical for everyone and fully
// cacheable. Admin edits flush it through revalidateTag(CATALOG_TAG).
export const revalidate = 3600;
// A product added after the last build still renders, on first request.
export const dynamicParams = true;

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

  const price = (p.discount_percent ?? 0) > 0
    ? Math.round(p.price * (1 - (p.discount_percent ?? 0) / 100))
    : p.price;

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
      price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <article className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem' }}>
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
        ← Back to collections
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
        <ProductGallery
          name={p.name}
          image={p.image_url}
          gallery={p.gallery_urls ?? []}
          video={p.video_url}
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
            {p.sub_category}
          </p>
          <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
            {p.name}
          </h1>

          {(p.is_new || (p.discount_percent ?? 0) > 0) && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {p.is_new && (
                <span style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 999, padding: '0.25rem 0.6rem' }}>
                  New arrival
                </span>
              )}
              {(p.discount_percent ?? 0) > 0 && (
                <span style={{ fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0e0e0e', background: 'var(--gold)', borderRadius: 999, padding: '0.25rem 0.6rem', fontWeight: 700 }}>
                  {p.discount_percent}% off
                </span>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: '1.25rem',
              fontSize: '1.5rem',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.75rem',
            }}
          >
            {(p.discount_percent ?? 0) > 0 ? (
              <>
                {formatINR(price)}
                <span style={{ fontSize: '1rem', color: 'var(--ink-mute)', textDecoration: 'line-through' }}>
                  {formatINR(p.price)}
                </span>
              </>
            ) : (
              formatINR(p.price)
            )}
          </div>

          {/* About this piece — the written description is the product copy.
              It already covers what the object is made of and how it is
              finished, which is why there is no separate spec table. */}
          {p.description && (
            <section style={{ marginTop: '1.75rem' }}>
              <h2
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 400,
                  margin: '0 0 0.7rem',
                }}
              >
                About this piece
              </h2>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.98rem', lineHeight: 1.75 }}>
                {p.description}
              </p>
            </section>
          )}

          <ProductOptions
            colors={p.colors ?? []}
            sizes={p.sizes ?? []}
            customizable={p.customizable ?? false}
            customizationNote={p.customization_note}
          />

          <div style={{ marginTop: '2rem' }}>
            {/* AddToCart reads ?intent= to resume a Buy-now that was
                interrupted by sign-in, so it needs a Suspense boundary. */}
            <Suspense fallback={null}>
              <AddToCart productId={p.id} />
            </Suspense>
          </div>
        </div>
      </div>
    </article>
  );
}
