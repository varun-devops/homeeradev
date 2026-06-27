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
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Products</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        {products.length} products · toggle visibility or edit the price inline.
      </p>
      <AdminProductsTable products={products} />
    </div>
  );
}
