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
