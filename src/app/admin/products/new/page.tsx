import Link from 'next/link';
import { getCollections, getSubCollections } from '@/lib/collections';
import ProductForm from '@/components/admin/ProductForm';

export const metadata = { title: 'New product' };
export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const [collections, subCollections] = await Promise.all([getCollections(), getSubCollections()]);

  return (
    <div>
      <Link href="/admin/products" style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        ← Products
      </Link>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', margin: '0.75rem 0 1.5rem' }}>New product</h1>
      <ProductForm
        collections={collections.map((c) => ({ slug: c.slug, label: c.label }))}
        subCollections={subCollections.map((s) => ({ slug: s.slug, label: s.label, collection_slug: s.collection_slug }))}
      />
    </div>
  );
}
