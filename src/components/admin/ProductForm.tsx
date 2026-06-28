'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import MediaUploader from '@/components/admin/MediaUploader';
import { createProduct, updateProduct, deleteProduct, type ProductInput } from '@/app/admin/actions';

type Collection = { slug: string; label: string };
type SubCollection = { slug: string; label: string; collection_slug: string };

type Props = {
  product?: Partial<ProductInput> & { id?: string };
  collections: Collection[];
  subCollections: SubCollection[];
};

export default function ProductForm({ product, collections, subCollections }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isEdit = Boolean(product?.id);

  const [f, setF] = useState({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? (collections[0]?.label ?? ''),
    sub_category: product?.sub_category ?? '',
    material: product?.material ?? '',
    variant: product?.variant ?? '',
    size: product?.size ?? '',
    weight_kg: product?.weight_kg ?? ('' as number | ''),
    price: product?.price ?? ('' as number | ''),
    is_active: product?.is_active ?? true,
    // migration-05 attributes
    brand: product?.brand ?? '',
    style: product?.style ?? '',
    colors: (product?.colors ?? []).join(', '),
    sizes: (product?.sizes ?? []).join(', '),
    discount_percent: product?.discount_percent ?? ('' as number | ''),
    stock: product?.stock ?? ('' as number | ''),
    is_new: product?.is_new ?? false,
    customizable: product?.customizable ?? false,
    customization_note: product?.customization_note ?? '',
  });
  const [mainImage, setMainImage] = useState<string[]>(product?.image_url ? [product.image_url] : []);
  const [gallery, setGallery] = useState<string[]>(product?.gallery_urls ?? []);
  const [video, setVideo] = useState<string[]>(product?.video_url ? [product.video_url] : []);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  // Sub-collections filtered to the chosen category (matched by label).
  const selectedCollectionSlug = collections.find((c) => c.label === f.category)?.slug;
  const subOptions = subCollections.filter((s) => s.collection_slug === selectedCollectionSlug);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const input: ProductInput = {
      id: product?.id,
      sku: f.sku,
      name: f.name,
      description: f.description || null,
      category: f.category,
      sub_category: f.sub_category,
      material: f.material || null,
      variant: f.variant || null,
      size: f.size || null,
      weight_kg: f.weight_kg === '' ? null : Number(f.weight_kg),
      price: f.price === '' ? 0 : Number(f.price),
      image_url: mainImage[0] ?? null,
      gallery_urls: gallery,
      video_url: video[0] ?? null,
      is_active: f.is_active,
      // migration-05 attributes
      brand: f.brand || null,
      style: f.style || null,
      colors: splitList(f.colors),
      sizes: splitList(f.sizes),
      discount_percent: f.discount_percent === '' ? 0 : Number(f.discount_percent),
      stock: f.stock === '' ? 0 : Number(f.stock),
      is_new: f.is_new,
      customizable: f.customizable,
      customization_note: f.customization_note || null,
    };
    start(async () => {
      const res = isEdit ? await updateProduct(input) : await createProduct(input);
      if (res.ok) {
        router.push('/admin/products');
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.message ?? 'Save failed' });
      }
    });
  };

  const remove = () => {
    if (!product?.id) return;
    if (!confirm('Delete this product permanently?')) return;
    start(async () => {
      const res = await deleteProduct(product.id!);
      if (res.ok) {
        router.push('/admin/products');
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.message ?? 'Delete failed' });
      }
    });
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={grid2}>
        <Field label="Product name*"><input required value={f.name} onChange={set('name')} style={input} /></Field>
        <Field label="Item No.*"><input required value={f.sku} onChange={set('sku')} style={input} /></Field>
      </div>

      <div style={grid2}>
        <Field label="Category*">
          <select value={f.category} onChange={(e) => { set('category')(e); setF((s) => ({ ...s, sub_category: '' })); }} style={input}>
            {collections.map((c) => <option key={c.slug} value={c.label}>{c.label}</option>)}
            {!collections.some((c) => c.label === f.category) && f.category && <option value={f.category}>{f.category}</option>}
          </select>
        </Field>
        <Field label="Sub-category*">
          <input
            list="subcats"
            required
            value={f.sub_category}
            onChange={set('sub_category')}
            placeholder="Pick or type a new one"
            style={input}
          />
          <datalist id="subcats">
            {subOptions.map((s) => <option key={s.slug} value={s.label} />)}
          </datalist>
        </Field>
      </div>

      <div style={grid2}>
        <Field label="Price (₹)*"><input required type="number" min="0" value={f.price} onChange={set('price')} style={input} /></Field>
      </div>

      <div style={grid3}>
        <Field label="Material"><input value={f.material} onChange={set('material')} style={input} /></Field>
        <Field label="Finish / variant"><input value={f.variant} onChange={set('variant')} style={input} /></Field>
        <Field label="Size (cm)"><input value={f.size} onChange={set('size')} style={input} /></Field>
      </div>

      {/* Storefront attributes (filters + product options) */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          Attributes &amp; options
        </p>
        <div style={grid3}>
          <Field label="Brand"><input value={f.brand} onChange={set('brand')} style={input} /></Field>
          <Field label="Style"><input value={f.style} onChange={set('style')} style={input} /></Field>
          <Field label="Stock (units)"><input type="number" min="0" value={f.stock} onChange={set('stock')} style={input} /></Field>
        </div>
        <div style={grid2}>
          <Field label="Colors (comma-separated)"><input value={f.colors} onChange={set('colors')} placeholder="Gold, Silver, Antique" style={input} /></Field>
          <Field label="Sizes (comma-separated)"><input value={f.sizes} onChange={set('sizes')} placeholder="S, M, L / 10, 20, 30 cm" style={input} /></Field>
        </div>
        <div style={grid3}>
          <Field label="Discount %"><input type="number" min="0" max="90" value={f.discount_percent} onChange={set('discount_percent')} style={input} /></Field>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={f.is_new} onChange={(e) => setF((s) => ({ ...s, is_new: e.target.checked }))} />
          Mark as New arrival
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={f.customizable} onChange={(e) => setF((s) => ({ ...s, customizable: e.target.checked }))} />
          Customization available
        </label>
        {f.customizable && (
          <Field label="Customization note (shown to customer)">
            <textarea value={f.customization_note} onChange={set('customization_note')} rows={2} style={{ ...input, resize: 'vertical' }} />
          </Field>
        )}
      </div>

      <Field label="Description">
        <textarea value={f.description} onChange={set('description')} rows={3} style={{ ...input, resize: 'vertical' }} />
      </Field>

      {/* Media */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <MediaUploader label="Main image" accept="image" value={mainImage} onChange={setMainImage} />
        <MediaUploader label="Gallery images (extra photos)" accept="image" multiple value={gallery} onChange={setGallery} />
        <MediaUploader label="Product video" accept="video" value={video} onChange={setVideo} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
        <input type="checkbox" checked={f.is_active} onChange={(e) => setF((s) => ({ ...s, is_active: e.target.checked }))} />
        Visible in the shop
      </label>

      {msg && <p style={{ color: msg.ok ? 'var(--gold)' : '#e08a8a', fontSize: '0.85rem', margin: 0 }}>{msg.text}</p>}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="submit" disabled={pending} style={primaryBtn}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </button>
        <button type="button" onClick={() => router.push('/admin/products')} style={ghostBtn}>Cancel</button>
        {isEdit && (
          <button type="button" onClick={remove} disabled={pending} style={{ ...ghostBtn, marginLeft: 'auto', color: '#e08a8a', borderColor: 'rgba(224,138,138,0.4)' }}>
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

/** Parse a comma-separated input into a trimmed, de-duped string array. */
function splitList(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' };
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem' };
const input: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-strong)', borderRadius: 8,
  padding: '0.7rem 0.9rem', color: 'var(--ink)', fontSize: '0.92rem', width: '100%',
};
const primaryBtn: React.CSSProperties = {
  padding: '0.8rem 1.6rem', borderRadius: 8, background: 'var(--gold)', color: '#0e0e0e',
  fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
};
const ghostBtn: React.CSSProperties = {
  padding: '0.8rem 1.6rem', borderRadius: 8, background: 'transparent', color: 'var(--ink)',
  border: '1px solid var(--line-strong)', fontSize: '0.8rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
};
