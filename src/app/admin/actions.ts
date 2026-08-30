'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CATALOG_TAG } from '@/lib/catalog';
import { ORDER_STATUSES, STATUS_MESSAGE, type OrderStatus } from '@/lib/order-status';
import { getAdminIdentity, type AdminIdentity } from '@/lib/admin-auth';
import { logAdminAction } from '@/lib/audit-log';

/**
 * Guard: redirects unless the caller is a full admin. Returns the full
 * identity (not just the id) so callers can write it straight into the
 * audit log without a second lookup.
 */
async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect('/admin/login');
  if (identity.role !== 'admin') redirect('/admin/products?error=admin-only');
  return identity;
}

/**
 * Guard for product operations: allows admin OR staff. Returns the full
 * identity for the same reason as requireAdmin.
 */
async function requireProductManager(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) redirect('/admin/login');
  // Both 'admin' and 'staff' may manage products.
  return identity;
}

export async function signOut() {
  const sb = createClient();
  await sb.auth.signOut();
  redirect('/admin/login');
}

/** Toggle a product's visibility on the storefront. */
export async function setProductActive(productId: string, isActive: boolean) {
  const actor = await requireProductManager();
  const svc = createServiceClient();
  const { error } = await svc.from('products').update({ is_active: isActive }).eq('id', productId);
  if (error) return { ok: false, message: error.message };
  await logAdminAction({
    actor,
    action: 'product.visibility',
    entityType: 'product',
    entityId: productId,
    summary: isActive ? 'Made a product visible' : 'Hid a product from the shop',
    detail: { is_active: isActive },
  });
  revalidatePath('/admin/products');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
  return { ok: true };
}

/** Update a product's price (whole rupees). */
export async function setProductPrice(productId: string, price: number) {
  const actor = await requireProductManager();
  if (!Number.isFinite(price) || price < 0) return { ok: false, message: 'Invalid price' };
  const svc = createServiceClient();
  const { data: before } = await svc.from('products').select('price').eq('id', productId).maybeSingle();
  const { error } = await svc
    .from('products')
    .update({ price: Math.round(price) })
    .eq('id', productId);
  if (error) return { ok: false, message: error.message };
  await logAdminAction({
    actor,
    action: 'product.price',
    entityType: 'product',
    entityId: productId,
    summary: `Changed price ₹${before?.price ?? '?'} → ₹${Math.round(price)}`,
    detail: { from: before?.price ?? null, to: Math.round(price) },
  });
  revalidatePath('/admin/products');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
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
  const actor = await requireProductManager();
  if (!input.sku?.trim() || !input.name?.trim() || !input.category?.trim() || !input.sub_category?.trim()) {
    return { ok: false, message: 'SKU, name, category and sub-category are required.' };
  }
  const svc = createServiceClient();
  const row = buildRow(input);
  const { data, error } = await svc.from('products').insert(row).select('id').single();
  if (error) return { ok: false, message: error.message };
  await ensureCollectionRows(row.category, row.category_slug, row.sub_category, row.sub_category_slug, row.image_url);
  await logAdminAction({
    actor,
    action: 'product.create',
    entityType: 'product',
    entityId: data.id,
    summary: `Created "${row.name}" (${row.sku})`,
    detail: { sku: row.sku, category: row.category, sub_category: row.sub_category, price: row.price },
  });
  revalidatePath('/admin/products');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
  return { ok: true, id: data.id };
}

/** Update an existing product. */
export async function updateProduct(input: ProductInput) {
  const actor = await requireProductManager();
  if (!input.id) return { ok: false, message: 'Missing product id.' };
  const svc = createServiceClient();
  const row = buildRow(input);
  const { error } = await svc.from('products').update(row).eq('id', input.id);
  if (error) return { ok: false, message: error.message };
  await ensureCollectionRows(row.category, row.category_slug, row.sub_category, row.sub_category_slug, row.image_url);
  await logAdminAction({
    actor,
    action: 'product.update',
    entityType: 'product',
    entityId: input.id,
    summary: `Edited "${row.name}" (${row.sku})`,
    detail: { sku: row.sku, category: row.category, sub_category: row.sub_category, price: row.price },
  });
  revalidatePath('/admin/products');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
  return { ok: true, id: input.id };
}

/** Delete a product. */
export async function deleteProduct(productId: string) {
  const actor = await requireProductManager();
  const svc = createServiceClient();
  // Fetched before the delete purely so the log line names the product —
  // once it's gone there is nothing left to join against.
  const { data: existing } = await svc.from('products').select('sku, name').eq('id', productId).maybeSingle();
  const { error } = await svc.from('products').delete().eq('id', productId);
  if (error) return { ok: false, message: error.message };
  await logAdminAction({
    actor,
    action: 'product.delete',
    entityType: 'product',
    entityId: productId,
    summary: existing ? `Deleted "${existing.name}" (${existing.sku})` : 'Deleted a product',
  });
  revalidatePath('/admin/products');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  revalidatePath('/shop/[id]', 'page');
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
  const actor = await requireAdmin();
  if (!input.label?.trim()) return { ok: false, message: 'Label is required.' };
  const svc = createServiceClient();
  const slug = input.slug || slugify(input.label);
  const isNew = !input.slug;
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
  await logAdminAction({
    actor,
    action: isNew ? 'collection.create' : 'collection.update',
    entityType: 'collection',
    entityId: slug,
    summary: `${isNew ? 'Created' : 'Edited'} collection "${input.label.trim()}"`,
  });
  revalidatePath('/admin/collections');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  return { ok: true, slug };
}

export async function deleteCollection(slug: string) {
  const actor = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('collections').delete().eq('slug', slug);
  if (error) return { ok: false, message: error.message };
  await logAdminAction({
    actor,
    action: 'collection.delete',
    entityType: 'collection',
    entityId: slug,
    summary: `Deleted collection "${slug}"`,
  });
  revalidatePath('/admin/collections');
  revalidateTag(CATALOG_TAG);
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
  const actor = await requireAdmin();
  if (!input.label?.trim() || !input.collection_slug) {
    return { ok: false, message: 'Label and parent collection are required.' };
  }
  const svc = createServiceClient();
  const slug = input.slug || slugify(input.label);
  const isNew = !input.slug;
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
  await logAdminAction({
    actor,
    action: isNew ? 'sub_collection.create' : 'sub_collection.update',
    entityType: 'sub_collection',
    entityId: slug,
    summary: `${isNew ? 'Created' : 'Edited'} sub-collection "${input.label.trim()}"`,
  });
  revalidatePath('/admin/collections');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  return { ok: true, slug };
}

export async function deleteSubCollection(slug: string) {
  const actor = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('sub_collections').delete().eq('slug', slug);
  if (error) return { ok: false, message: error.message };
  await logAdminAction({
    actor,
    action: 'sub_collection.delete',
    entityType: 'sub_collection',
    entityId: slug,
    summary: `Deleted sub-collection "${slug}"`,
  });
  revalidatePath('/admin/collections');
  revalidateTag(CATALOG_TAG);
  revalidatePath('/shop');
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────
// Orders — status updates + customer notification
// ──────────────────────────────────────────────────────────────────


/** Admin updates an order's status and notifies the customer in-site. */
export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const actor = await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) return { ok: false, message: 'Invalid status' };
  const svc = createServiceClient();

  const { data: before } = await svc.from('orders').select('status').eq('id', orderId).maybeSingle();

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

  await logAdminAction({
    actor,
    action: 'order.status',
    entityType: 'order',
    entityId: order.id,
    summary: `Order #${order.id.slice(0, 8)}: ${before?.status ?? '?'} → ${status}`,
    detail: { from: before?.status ?? null, to: status },
  });

  revalidatePath('/admin/orders');
  return { ok: true };
}

/** Change the signed-in admin/staff user's own password. */
export async function changePassword(newPassword: string) {
  const actor = await requireProductManager();
  if (!newPassword || newPassword.length < 4) {
    return { ok: false, message: 'Password must be at least 4 characters.' };
  }
  const sb = createClient();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: error.message };
  // Never logs the password itself — only that a change happened, by whom.
  await logAdminAction({
    actor,
    action: 'account.password_change',
    entityType: 'user',
    entityId: actor.userId,
    summary: `${actor.email} changed their password`,
  });
  return { ok: true };
}
