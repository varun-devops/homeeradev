import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, getAllProductSlugs, getReviews, formatINR } from '@/lib/catalog';
import { createClient } from '@/lib/supabase/server';
import AddToCart from '@/components/AddToCart';
import ProductGallery from '@/components/ProductGallery';
import ProductOptions from '@/components/ProductOptions';
import ProductReviews, { Stars } from '@/components/ProductReviews';

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

  // Is this product already in the signed-in user's favourites?
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  let isFav = false;
  let canReview = false;
  let cartQty = 0;
  let myReview: { rating: number; body: string | null } | null = null;
  if (user) {
    const [{ data: fav }, { data: bought }, { data: mine }, { data: cartItem }] = await Promise.all([
      sb.from('favourites').select('id').eq('user_id', user.id).eq('product_id', p.id).maybeSingle(),
      sb
        .from('order_items')
        .select('id, orders!inner(user_id, status)')
        .eq('product_id', p.id)
        .eq('orders.user_id', user.id)
        .eq('orders.status', 'paid')
        .limit(1),
      sb.from('reviews').select('rating, body').eq('user_id', user.id).eq('product_id', p.id).maybeSingle(),
      sb.from('cart_items').select('quantity').eq('user_id', user.id).eq('product_id', p.id).maybeSingle(),
    ]);
    isFav = Boolean(fav);
    canReview = Boolean(bought && bought.length > 0);
    myReview = mine ?? null;
    cartQty = cartItem?.quantity ?? 0;
  }

  const { reviews, average, count } = await getReviews(p.id);

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
          {count > 0 && (
            <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
              <Stars value={average} size={15} /> {average.toFixed(1)} ({count})
            </div>
          )}
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
                {formatINR(Math.round(p.price * (1 - (p.discount_percent ?? 0) / 100)))}
                <span style={{ fontSize: '1rem', color: 'var(--ink-mute)', textDecoration: 'line-through' }}>
                  {formatINR(p.price)}
                </span>
              </>
            ) : (
              formatINR(p.price)
            )}
          </div>

          {(p.sku || p.material || p.size || p.variant) && (
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
              {p.sku && (
                <>
                  <dt style={{ textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.72rem' }}>Item No.</dt>
                  <dd style={{ margin: 0 }}>{p.sku}</dd>
                </>
              )}
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

          <ProductOptions
            colors={p.colors ?? []}
            sizes={p.sizes ?? []}
            material={p.material}
            customizable={p.customizable ?? false}
            customizationNote={p.customization_note}
          />

          <div style={{ marginTop: '2rem' }}>
            <AddToCart productId={p.id} favourited={isFav} initialQty={cartQty} />
          </div>
        </div>
      </div>

      <ProductReviews
        productId={p.id}
        slug={p.slug}
        reviews={reviews}
        average={average}
        count={count}
        canReview={canReview}
        myRating={myReview?.rating}
        myBody={myReview?.body ?? ''}
        signedIn={Boolean(user)}
      />
    </article>
  );
}
