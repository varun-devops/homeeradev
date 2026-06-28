import type { Metadata } from 'next';
import { getActiveProducts, buildCollections } from '@/lib/catalog';
import { createServiceClient } from '@/lib/supabase/server';
import ShopCollectionDeck from '@/components/ShopFilterDeck';

export const metadata: Metadata = {
  title: 'Shop — Considered objects for the home',
  description:
    'Browse Homeera brass, wood and marble pieces — ornaments, table clocks, sculptures, flower pots, planters and more. Hand-made, small-batch.',
  alternates: { canonical: '/shop' },
};

// Always reflect the live catalogue (admin show/hide, price edits).
export const dynamic = 'force-dynamic';

/**
 * Shop page — full-screen, vertically-swiped deck of collection cards
 * built from the live Supabase catalogue. Tapping a collection morphs it
 * to full screen (Framer Motion) and reveals its products with a
 * price-sort dropdown.
 */
export default async function ShopPage() {
  const products = await getActiveProducts();
  const collections = buildCollections(products);

  // Average rating per product (one query, aggregated in memory) for the
  // Rating filter + Customer-rating sort.
  const svc = createServiceClient();
  const { data: reviewRows } = await svc.from('reviews').select('product_id, rating');
  const ratingAgg = new Map<string, { sum: number; n: number }>();
  (reviewRows ?? []).forEach((r: { product_id: string; rating: number }) => {
    const e = ratingAgg.get(r.product_id) ?? { sum: 0, n: 0 };
    e.sum += r.rating;
    e.n += 1;
    ratingAgg.set(r.product_id, e);
  });

  // Shape the products for the client deck.
  const lite = products.map((p) => {
    const agg = ratingAgg.get(p.id);
    const discount = p.discount_percent ?? 0;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      effective_price: discount > 0 ? Math.round(p.price * (1 - discount / 100)) : p.price,
      image_url: p.image_url,
      category_slug: p.category_slug,
      sub_category: p.sub_category,
      sub_category_slug: p.sub_category_slug,
      sku: p.sku,
      brand: p.brand ?? null,
      style: p.style ?? null,
      material: p.material ?? null,
      colors: p.colors ?? [],
      sizes: p.sizes ?? [],
      discount_percent: discount,
      is_new: p.is_new ?? false,
      in_stock: (p.stock ?? 0) > 0,
      rating: agg ? agg.sum / agg.n : 0,
      review_count: agg ? agg.n : 0,
    };
  });

  return <ShopCollectionDeck collections={collections} products={lite} />;
}
