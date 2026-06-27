import { createServiceClient } from '@/lib/supabase/server';

export type Collection = {
  slug: string;
  label: string;
  copy: string | null;
  image_url: string | null;
  sort_order: number;
};

export type SubCollection = {
  slug: string;
  label: string;
  collection_slug: string;
  copy: string | null;
  sort_order: number;
};

/** All collections, ordered. Falls back to empty if the table is absent. */
export async function getCollections(): Promise<Collection[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('collections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  if (error) return [];
  return (data ?? []) as Collection[];
}

export async function getSubCollections(): Promise<SubCollection[]> {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('sub_collections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });
  if (error) return [];
  return (data ?? []) as SubCollection[];
}
