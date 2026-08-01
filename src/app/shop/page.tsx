import type { Metadata } from 'next';
import { getActiveProducts, buildCollections } from '@/lib/catalog';
import ShopCollectionDeck from '@/components/ShopCollectionDeck';

export const metadata: Metadata = {
  title: 'Shop — Considered objects for the home',
  description:
    'Browse Homeera brass, wood and marble pieces — sculptures, ornaments, table clocks, flower pots, planters and more. Hand-made, small-batch.',
  alternates: { canonical: '/shop' },
};

// Always reflect the live catalogue (admin show/hide, price edits).
export const dynamic = 'force-dynamic';

/**
 * Shop page — a three-level browser built from the live Supabase catalogue:
 * collections → sub-collections → products. The deck itself is a client
 * component; this page only shapes the data it needs.
 */
export default async function ShopPage() {
  const products = await getActiveProducts();
  const collections = buildCollections(products);

  // Shape the products for the client deck — only what the grid renders.
  const lite = products.map((p) => {
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
      discount_percent: discount,
      is_new: p.is_new ?? false,
    };
  });

  return <ShopCollectionDeck collections={collections} products={lite} />;
}
