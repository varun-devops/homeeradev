import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import AdminProductsTable from '@/components/admin/AdminProductsTable';

export const metadata = { title: 'Products' };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from('products')
    .select('id, sku, name, category, sub_category, price, image_url, is_active')
    .order('category', { ascending: true })
    .order('sub_category', { ascending: true })
    .order('name', { ascending: true });

  const products = (data ?? []) as {
    id: string;
    sku: string;
    name: string;
    category: string;
    sub_category: string;
    price: number;
    image_url: string | null;
    is_active: boolean;
  }[];

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
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        {products.length} products · click a row to edit, or toggle visibility / price inline.
      </p>
      <AdminProductsTable products={products} />
    </div>
  );
}
