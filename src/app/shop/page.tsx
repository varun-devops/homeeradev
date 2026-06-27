import type { Metadata } from 'next';
import { getActiveProducts, buildCollections } from '@/lib/catalog';
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

  // Shape the products for the client deck (only what it needs).
  const lite = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    image_url: p.image_url,
    category_slug: p.category_slug,
    sub_category: p.sub_category,
    sub_category_slug: p.sub_category_slug,
    vendor: p.vendor,
  }));

  return <ShopCollectionDeck collections={collections} products={lite} />;
}
