import { unstable_cache } from 'next/cache';
import { createCatalogClient } from '@/lib/supabase/server';
import { CATALOG_TAG } from '@/lib/cache-tags';

export type Collection = {
  slug: string;
  label: string;
  copy: string | null;
  image_url: string | null;
  /** Optional looping clip (migration-13); image_url is its poster. */
  video_url: string | null;
  sort_order: number;
};

export type SubCollection = {
  slug: string;
  label: string;
  collection_slug: string;
  copy: string | null;
  /** Added by migration-08/09; the shop card's background image. */
  image_url: string | null;
  /** Optional looping clip (migration-13); image_url is its poster. */
  video_url: string | null;
  sort_order: number;
};

/** All collections, ordered. Falls back to empty if the table is absent.
 *  Cached under the catalogue tag — admin edits invalidate it immediately. */
export const getCollections = unstable_cache(
  async (): Promise<Collection[]> => {
    const svc = createCatalogClient();
    const { data, error } = await svc
      .from('collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });
    if (error) return [];
    return (data ?? []) as Collection[];
  },
  ['collections'],
  // Tag invalidation is the fast path; this TTL is the backstop for rows
  // edited outside the admin panel, which cannot call revalidateTag.
  { tags: [CATALOG_TAG], revalidate: 3600 },
);

export const getSubCollections = unstable_cache(
  async (): Promise<SubCollection[]> => {
    const svc = createCatalogClient();
    const { data, error } = await svc
      .from('sub_collections')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });
    if (error) return [];
    return (data ?? []) as SubCollection[];
  },
  ['sub-collections'],
  // Tag invalidation is the fast path; this TTL is the backstop for rows
  // edited outside the admin panel, which cannot call revalidateTag.
  { tags: [CATALOG_TAG], revalidate: 3600 },
);
