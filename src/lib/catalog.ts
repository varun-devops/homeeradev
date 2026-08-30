import { unstable_cache } from 'next/cache';
import { CATALOG_TAG } from '@/lib/cache-tags';
import { createCatalogClient } from '@/lib/supabase/server';
export { formatINR } from '@/lib/format';

/**
 * Server-side catalogue data access.
 *
 * Reads products from Supabase. The public storefront only ever shows
 * `is_active = true` rows; admin views use the service client to see all.
 * These helpers run on the server (Server Components / route handlers).
 *
 * Reads are cached and tagged. Admin writes call `revalidateTag(CATALOG_TAG)`,
 * which is what makes caching safe here: a price edit or a show/hide flips the
 * storefront immediately rather than waiting out a timer.
 *
 * The individual Supabase fetches stay `cache: 'no-store'` (see
 * lib/supabase/server.ts) — not a contradiction. The implicit Next Data Cache
 * is what served a stale catalogue before, because nothing could name it to
 * invalidate it. Caching here is explicit, tagged, and invalidated by name.
 */
export { CATALOG_TAG };

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
  gallery_urls: string[] | null;
  video_url: string | null;
  is_active: boolean;
  // Attributes for storefront filters + product options (migration-05).
  // Optional so the app keeps working before the migration is applied.
  brand?: string | null;
  style?: string | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  discount_percent?: number | null;
  is_new?: boolean | null;
  stock?: number | null;
  customizable?: boolean | null;
  customization_note?: string | null;
};

/**
 * The columns the shop grid actually renders. Selecting these instead of `*`
 * keeps `description` and `gallery_urls` — by far the heaviest columns — out
 * of a payload that gets serialized to the browser for every product at once.
 */
const SHOP_COLUMNS =
  'id, slug, name, price, image_url, category, category_slug, sub_category, sub_category_slug, discount_percent, is_new';

export type ShopProduct = Pick<
  DBProduct,
  | 'id'
  | 'slug'
  | 'name'
  | 'price'
  | 'image_url'
  | 'category'
  | 'category_slug'
  | 'sub_category'
  | 'sub_category_slug'
  | 'discount_percent'
  | 'is_new'
>;

export type SubCollectionGroup = {
  slug: string;
  label: string;
  image: string | null;
  /** Optional looping clip; `image` is its poster frame. */
  video: string | null;
  count: number;
};

export type CollectionGroup = {
  slug: string;
  label: string;
  image: string | null;
  video: string | null;
  count: number;
  subCollections: SubCollectionGroup[];
};

/**
 * All active products as full rows, ordered for stable grouping.
 * Prefer `getShopProducts` for the storefront grid — it needs far less.
 */
export const getActiveProducts = unstable_cache(
  async (): Promise<DBProduct[]> => {
    const sb = createCatalogClient();
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sub_category', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DBProduct[];
  },
  ['active-products'],
  // Tag invalidation is the fast path; this TTL is the backstop for rows
  // edited outside the admin panel, which cannot call revalidateTag.
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** Active products with only the columns the storefront grid renders. */
export const getShopProducts = unstable_cache(
  async (): Promise<ShopProduct[]> => {
    const sb = createCatalogClient();
    const { data, error } = await sb
      .from('products')
      .select(SHOP_COLUMNS)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('sub_category', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ShopProduct[];
  },
  ['shop-products'],
  // Tag invalidation is the fast path; this TTL is the backstop for rows
  // edited outside the admin panel, which cannot call revalidateTag.
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** One product by its URL slug (active only). */
export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<DBProduct | null> => {
    const sb = createCatalogClient();
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return (data as DBProduct) ?? null;
  },
  ['product-by-slug'],
  // Tag invalidation is the fast path; this TTL is the backstop for rows
  // edited outside the admin panel, which cannot call revalidateTag.
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/** Active product slugs — for generateStaticParams. */
export const getAllProductSlugs = unstable_cache(
  async (): Promise<string[]> => {
    const sb = createCatalogClient();
    const { data, error } = await sb
      .from('products')
      .select('slug')
      .eq('is_active', true);
    if (error) throw error;
    return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
  },
  ['product-slugs'],
  // Tag invalidation is the fast path; this TTL is the backstop for rows
  // edited outside the admin panel, which cannot call revalidateTag.
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

/**
 * Curated card art, keyed by slug, from the collections / sub_collections
 * tables. Whatever an admin sets there wins over the fallback below.
 */
export type CollectionArt = {
  collections?: Record<string, { image: string | null; video: string | null }>;
  subCollections?: Record<string, { image: string | null; video: string | null }>;
};

/**
 * Build the collection → sub-collection tree from the active products.
 *
 * Card images prefer `art` — the image an admin set on the collection or
 * sub-collection row — and fall back to the first product photo in that
 * group. The fallback used to be the only source, which meant setting a
 * sub-collection's image in the admin panel had no visible effect: the
 * shop went on showing whichever product happened to sort first.
 */
export function buildCollections(
  products: ShopProduct[],
  art: CollectionArt = {},
): CollectionGroup[] {
  const byCat = new Map<string, ShopProduct[]>();
  for (const p of products) {
    if (!byCat.has(p.category_slug)) byCat.set(p.category_slug, []);
    byCat.get(p.category_slug)!.push(p);
  }

  const groups: CollectionGroup[] = [];
  for (const [catSlug, items] of byCat) {
    const label = items[0].category;
    const curated = art.collections?.[catSlug];
    const image =
      curated?.image ?? items.find((p) => p.image_url)?.image_url ?? null;
    const video = curated?.video ?? null;

    const subMap = new Map<string, ShopProduct[]>();
    for (const p of items) {
      if (!subMap.has(p.sub_category_slug)) subMap.set(p.sub_category_slug, []);
      subMap.get(p.sub_category_slug)!.push(p);
    }
    const subCollections = [...subMap.entries()]
      .map(([slug, sItems]) => ({
        slug,
        label: sItems[0].sub_category,
        image:
          art.subCollections?.[slug]?.image ??
          sItems.find((p) => p.image_url)?.image_url ??
          null,
        video: art.subCollections?.[slug]?.video ?? null,
        count: sItems.length,
      }))
      // Richest sub-collections lead, so the grid opens on real depth.
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    groups.push({
      slug: catSlug,
      label,
      image,
      video,
      count: items.length,
      subCollections,
    });
  }

  // Largest collections first so the deck leads with the richest content.
  groups.sort((a, b) => b.count - a.count);
  return groups;
}
