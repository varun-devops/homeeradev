import type { Metadata } from 'next';
import { getShopProducts, buildCollections } from '@/lib/catalog';
import { getCollections, getSubCollections } from '@/lib/collections';
import ShopCollectionDeck from '@/components/ShopCollectionDeck';

export const metadata: Metadata = {
  title: 'Shop — Considered objects for the home',
  description:
    'Browse Homeera brass, wood and marble pieces — sculptures, ornaments, table clocks, flower pots, planters and more. Hand-made, small-batch.',
  alternates: { canonical: '/shop' },
};

// Rendered once and served from the edge. Admin writes call
// revalidateTag(CATALOG_TAG), so show/hide and price edits still appear
// immediately — without every visitor paying a Supabase round trip. The
// hourly revalidate is only a backstop for changes made outside the app.
export const revalidate = 3600;

/**
 * Shop page — a three-level browser built from the live Supabase catalogue:
 * collections → sub-collections → products. The deck itself is a client
 * component; this page only shapes the data it needs.
 */
export default async function ShopPage() {
  const [products, collectionRows, subCollectionRows] = await Promise.all([
    getShopProducts(),
    getCollections(),
    getSubCollections(),
  ]);

  // Card art an admin curated in /admin/collections. Without this the deck
  // falls back to the first product photo in each group, which is why a
  // sub-collection image set in the admin panel never showed up here.
  const collections = buildCollections(products, {
    collections: Object.fromEntries(collectionRows.map((c) => [c.slug, c.image_url])),
    subCollections: Object.fromEntries(subCollectionRows.map((s) => [s.slug, s.image_url])),
  });

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
