import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getCollections, getSubCollections } from '@/lib/collections';
import ProductForm from '@/components/admin/ProductForm';

export const metadata = { title: 'Edit product' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const svc = createServiceClient();
  const [{ data: product }, collections, subCollections] = await Promise.all([
    svc.from('products').select('*').eq('id', params.id).maybeSingle(),
    getCollections(),
    getSubCollections(),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        ← Products
      </Link>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', margin: '0.75rem 0 1.5rem' }}>{product.name}</h1>
      <ProductForm
        product={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          vendor: product.vendor,
          category: product.category,
          sub_category: product.sub_category,
          material: product.material,
          variant: product.variant,
          size: product.size,
          weight_kg: product.weight_kg,
          price: product.price,
          image_url: product.image_url,
          gallery_urls: product.gallery_urls ?? [],
          video_url: product.video_url,
          is_active: product.is_active,
          // migration-05 attributes
          brand: product.brand ?? null,
          style: product.style ?? null,
          colors: product.colors ?? [],
          sizes: product.sizes ?? [],
          discount_percent: product.discount_percent ?? 0,
          stock: product.stock ?? 0,
          is_new: product.is_new ?? false,
          customizable: product.customizable ?? false,
          customization_note: product.customization_note ?? null,
        }}
        collections={collections.map((c) => ({ slug: c.slug, label: c.label }))}
        subCollections={subCollections.map((s) => ({ slug: s.slug, label: s.label, collection_slug: s.collection_slug }))}
      />
    </div>
  );
}
