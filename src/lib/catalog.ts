import { createServiceClient } from '@/lib/supabase/server';
export { formatINR } from '@/lib/format';

/**
 * Server-side catalogue data access.
 *
 * Reads products from Supabase. The public storefront only ever shows
 * `is_active = true` rows; admin views use the service client to see all.
 * These helpers run on the server (Server Components / route handlers).
 */

export type DBProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  vendor: string | null;
  category: string;
  category_slug: string;
  sub_category: string;
  sub_category_slug: string;
  material: string | null;
  variant: string | null;
  size: string | null;
  weight_kg: number | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
};

export type CollectionGroup = {
  slug: string;
  label: string;
  image: string | null;
  count: number;
  subCollections: { slug: string; label: string; count: number }[];
};

/** All active products, newest first by category for stable grouping. */
export async function getActiveProducts(): Promise<DBProduct[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sub_category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DBProduct[];
}

/** One product by its URL slug (active only). */
export async function getProductBySlug(slug: string): Promise<DBProduct | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return (data as DBProduct) ?? null;
}

/** Active product slugs — for generateStaticParams. */
export async function getAllProductSlugs(): Promise<string[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('products')
    .select('slug')
    .eq('is_active', true);
  if (error) throw error;
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

/**
 * Build the collection → sub-collection tree from the active products,
 * with a representative image (first product image) per top-level
 * collection. Used by the storefront's collection deck.
 */
export function buildCollections(products: DBProduct[]): CollectionGroup[] {
  const byCat = new Map<string, DBProduct[]>();
  for (const p of products) {
    if (!byCat.has(p.category_slug)) byCat.set(p.category_slug, []);
    byCat.get(p.category_slug)!.push(p);
  }

  const groups: CollectionGroup[] = [];
  for (const [catSlug, items] of byCat) {
    const label = items[0].category;
    const image = items.find((p) => p.image_url)?.image_url ?? null;

    const subMap = new Map<string, DBProduct[]>();
    for (const p of items) {
      if (!subMap.has(p.sub_category_slug)) subMap.set(p.sub_category_slug, []);
      subMap.get(p.sub_category_slug)!.push(p);
    }
    const subCollections = [...subMap.entries()].map(([slug, sItems]) => ({
      slug,
      label: sItems[0].sub_category,
      count: sItems.length,
    }));

    groups.push({
      slug: catSlug,
      label,
      image,
      count: items.length,
      subCollections,
    });
  }

  // Largest collections first so the deck leads with the richest content.
  groups.sort((a, b) => b.count - a.count);
  return groups;
}
