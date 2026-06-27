import { getCollections, getSubCollections } from '@/lib/collections';
import CollectionsManager from '@/components/admin/CollectionsManager';

export const metadata = { title: 'Collections' };
export const dynamic = 'force-dynamic';

export default async function AdminCollectionsPage() {
  const [collections, subCollections] = await Promise.all([getCollections(), getSubCollections()]);

  return (
    <div>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Collections</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        Create and manage the top-level collections and their sub-collections shown in the shop.
      </p>
      <CollectionsManager collections={collections} subCollections={subCollections} />
    </div>
  );
}
