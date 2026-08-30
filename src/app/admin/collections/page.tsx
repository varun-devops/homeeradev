import { getCollections, getSubCollections } from '@/lib/collections';
import { createServiceClient } from '@/lib/supabase/server';
import CollectionsManager from '@/components/admin/CollectionsManager';

export const metadata = { title: 'Collections' };
export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  const [collections, subCollections] = await Promise.all([getCollections(), getSubCollections()]);

  // Product counts per sub-category, so each row can show "12 products"
  // and link straight into a pre-filtered /admin/products.
  const svc = createServiceClient();
  const { data: rows } = await svc.from('products').select('category, sub_category');
  const counts = new Map<string, number>();
  for (const r of rows ?? []) {
    const key = `${r.category}␟${r.sub_category}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Collections</h1>

      <CollectionsManager collections={collections} subCollections={subCollections} counts={Object.fromEntries(counts)} />
    </div>
  );
}
