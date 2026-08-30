import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import AdminProductsTable, { type ProductRow } from '@/components/admin/AdminProductsTable';

export const metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

const BASE_COLUMNS =
  'id, sku, name, category, sub_category, price, image_url, is_active, created_at';

export default async function AdminProductsPage({
  searchParams,
}: {
  // Populated by the "View products" / sub-collection links on
  // /admin/collections, so a click there lands pre-filtered here.
  searchParams: { category?: string; sub?: string };
}) {
  const svc = createServiceClient();

  // updated_at arrives with supabase/migration-10-product-updated-at.sql.
  // Ask for it, but fall back if the migration has not been applied yet —
  // an unapplied migration should not take the whole admin page down.
  let { data, error } = await svc
    .from('products')
    .select(`${BASE_COLUMNS}, updated_at`)
    .order('name', { ascending: true });

  if (error) {
    ({ data } = await svc
      .from('products')
      .select(BASE_COLUMNS)
      .order('name', { ascending: true }));
  }

  const products = (data ?? []) as ProductRow[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <h1 style={{ fontStyle: 'italic', fontSize: '2rem', margin: 0 }}>Products</h1>
        <Link
          href="/admin/products/new"
          style={{
            padding: '0.7rem 1.4rem', borderRadius: 8, background: 'var(--gold)', color: '#0e0e0e',
            fontWeight: 600, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}
        >
          + New product
        </Link>
      </div>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
        Filter by category, sub-category, name or item number. Prices and visibility
        can be edited inline.
      </p>
      <AdminProductsTable
        products={products}
        initialCategory={searchParams.category ?? ''}
        initialSubCategory={searchParams.sub ?? ''}
      />
    </div>
  );
}
