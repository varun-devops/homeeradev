'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/** Guard: throws/redirects unless the caller is an admin. Returns user id. */
async function requireAdmin(): Promise<string> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect('/admin/login?error=not-admin');
  return user.id;
}

export async function signOut() {
  const sb = createClient();
  await sb.auth.signOut();
  redirect('/admin/login');
}

/** Toggle a product's visibility on the storefront. */
export async function setProductActive(productId: string, isActive: boolean) {
  await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('products').update({ is_active: isActive }).eq('id', productId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true };
}

/** Update a product's price (whole rupees). */
export async function setProductPrice(productId: string, price: number) {
  await requireAdmin();
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: 'Invalid price' };
  const svc = createServiceClient();
  const { error } = await svc
    .from('products')
    .update({ price: Math.round(price) })
    .eq('id', productId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────
// Product CRUD
// ──────────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export type ProductInput = {
  id?: string;
  sku: string;
  name: string;
  description?: string | null;
  vendor?: string | null;
  category: string;
  sub_category: string;
  material?: string | null;
  variant?: string | null;
  size?: string | null;
  weight_kg?: number | null;
  price: number;
  image_url?: string | null;
  gallery_urls?: string[];
  video_url?: string | null;
  is_active?: boolean;
  // migration-05 attributes
  brand?: string | null;
  style?: string | null;
  colors?: string[];
  sizes?: string[];
  discount_percent?: number | null;
  is_new?: boolean;
  stock?: number | null;
  customizable?: boolean;
  customization_note?: string | null;
};

function buildRow(input: ProductInput) {
  const category_slug = slugify(input.category);
  const sub_category_slug = slugify(input.sub_category);
  return {
    sku: input.sku.trim(),
    name: input.name.trim(),
    slug: `${slugify(input.name)}-${slugify(input.sku)}`,
    description: input.description ?? null,
    vendor: input.vendor ?? null,
    category: input.category.trim(),
    category_slug,
    sub_category: input.sub_category.trim(),
    sub_category_slug,
    material: input.material ?? null,
    variant: input.variant ?? null,
    size: input.size ?? null,
    weight_kg: input.weight_kg ?? null,
    price: Math.round(input.price || 0),
    image_url: input.image_url ?? null,
    gallery_urls: input.gallery_urls ?? [],
    video_url: input.video_url ?? null,
    is_active: input.is_active ?? true,
    // migration-05 attributes
    brand: input.brand?.trim() || null,
    style: input.style?.trim() || null,
    colors: input.colors ?? [],
    sizes: input.sizes ?? [],
    discount_percent: Math.max(0, Math.min(90, Math.round(input.discount_percent || 0))),
    is_new: input.is_new ?? false,
    stock: Math.max(0, Math.round(input.stock || 0)),
    customizable: input.customizable ?? false,
    customization_note: input.customization_note?.trim() || null,
  };
}

/** Create a new product. */
export async function createProduct(input: ProductInput) {
  await requireAdmin();
  if (!input.sku?.trim() || !input.name?.trim() || !input.category?.trim() || !input.sub_category?.trim()) {
    return { ok: false, message: 'SKU, name, category and sub-category are required.' };
  }
  const svc = createServiceClient();
  const row = buildRow(input);
  const { data, error } = await svc.from('products').insert(row).select('id').single();
  if (error) return { ok: false, message: error.message };
  await ensureCollectionRows(row.category, row.category_slug, row.sub_category, row.sub_category_slug, row.image_url);
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true, id: data.id };
}

/** Update an existing product. */
export async function updateProduct(input: ProductInput) {
  await requireAdmin();
  if (!input.id) return { ok: false, message: 'Missing product id.' };
  const svc = createServiceClient();
  const row = buildRow(input);
  const { error } = await svc.from('products').update(row).eq('id', input.id);
  if (error) return { ok: false, message: error.message };
  await ensureCollectionRows(row.category, row.category_slug, row.sub_category, row.sub_category_slug, row.image_url);
  revalidatePath('/admin/products');
  revalidatePath(`/shop`);
  return { ok: true, id: input.id };
}

/** Delete a product. */
export async function deleteProduct(productId: string) {
  await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('products').delete().eq('id', productId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  return { ok: true };
}

/** Make sure a (sub)collection referenced by a product exists. */
async function ensureCollectionRows(
  category: string,
  categorySlug: string,
  subCategory: string,
  subCategorySlug: string,
  image: string | null,
) {
  const svc = createServiceClient();
  await svc.from('collections').upsert(
    { slug: categorySlug, label: category, image_url: image },
    { onConflict: 'slug', ignoreDuplicates: true },
  );
  await svc.from('sub_collections').upsert(
    { slug: subCategorySlug, label: subCategory, collection_slug: categorySlug },
    { onConflict: 'slug', ignoreDuplicates: true },
  );
}

// ──────────────────────────────────────────────────────────────────
// Collections CRUD
// ──────────────────────────────────────────────────────────────────

export async function saveCollection(input: {
  slug?: string;
  label: string;
  copy?: string | null;
  image_url?: string | null;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.label?.trim()) return { ok: false, message: 'Label is required.' };
  const svc = createServiceClient();
  const slug = input.slug || slugify(input.label);
  const { error } = await svc.from('collections').upsert(
    {
      slug,
      label: input.label.trim(),
      copy: input.copy ?? null,
      image_url: input.image_url ?? null,
      sort_order: input.sort_order ?? 0,
    },
    { onConflict: 'slug' },
  );
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/collections');
  revalidatePath('/shop');
  return { ok: true, slug };
}

export async function deleteCollection(slug: string) {
  await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('collections').delete().eq('slug', slug);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/collections');
  revalidatePath('/shop');
  return { ok: true };
}

export async function saveSubCollection(input: {
  slug?: string;
  label: string;
  collection_slug: string;
  copy?: string | null;
  sort_order?: number;
}) {
  await requireAdmin();
  if (!input.label?.trim() || !input.collection_slug) {
    return { ok: false, message: 'Label and parent collection are required.' };
  }
  const svc = createServiceClient();
  const slug = input.slug || slugify(input.label);
  const { error } = await svc.from('sub_collections').upsert(
    {
      slug,
      label: input.label.trim(),
      collection_slug: input.collection_slug,
      copy: input.copy ?? null,
      sort_order: input.sort_order ?? 0,
    },
    { onConflict: 'slug' },
  );
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/collections');
  revalidatePath('/shop');
  return { ok: true, slug };
}

export async function deleteSubCollection(slug: string) {
  await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('sub_collections').delete().eq('slug', slug);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/admin/collections');
  revalidatePath('/shop');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────
// Orders — status updates + customer notification
// ──────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = [
  'created',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const STATUS_MESSAGE: Record<OrderStatus, string> = {
  created: 'Your order has been placed.',
  paid: 'Payment received — thank you!',
  processing: 'Your order is being prepared.',
  shipped: 'Your order has shipped.',
  delivered: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
};

/** Admin updates an order's status and notifies the customer in-site. */
export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) return { ok: false, message: 'Invalid status' };
  const svc = createServiceClient();

  const { data: order, error } = await svc
    .from('orders')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select('id, user_id')
    .single();
  if (error) return { ok: false, message: error.message };

  // Create an in-site notification for the customer.
  if (order.user_id) {
    await svc.from('notifications').insert({
      user_id: order.user_id,
      title: `Order #${order.id.slice(0, 8)} — ${status}`,
      body: STATUS_MESSAGE[status],
      order_id: order.id,
    });
  }

  revalidatePath('/admin/orders');
  return { ok: true };
}

/** Change the signed-in admin's password. */
export async function changePassword(newPassword: string) {
  await requireAdmin();
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, message: 'Password must be at least 4 characters.' };
  }
  const sb = createClient();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
