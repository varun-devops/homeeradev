'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Cart server actions. All operate on the logged-in user's cart_items
 * rows under RLS (a user can only touch their own). They return a small
 * status object so client components can react (e.g. redirect to login).
 */

type Result = { ok: boolean; reason?: 'auth' | 'error'; message?: string };

export async function addToCart(productId: string, quantity = 1): Promise<Result> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: 'auth' };

  // Upsert: if the product is already in the cart, bump the quantity.
  const { data: existing } = await sb
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) return { ok: false, reason: 'error', message: error.message };
  } else {
    const { error } = await sb
      .from('cart_items')
      .insert({ user_id: user.id, product_id: productId, quantity });
    if (error) return { ok: false, reason: 'error', message: error.message };
  }

  revalidatePath('/cart');
  return { ok: true };
}

/**
 * Set the ABSOLUTE quantity of a product in the cart by product id.
 * 0 (or less) removes it. Used by the product-page stepper which syncs the
 * cart live. Returns the new quantity.
 */
export async function setCartQuantity(
  productId: string,
  quantity: number,
): Promise<Result & { quantity?: number }> {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: 'auth' };

  const { data: existing } = await sb
    .from('cart_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (quantity <= 0) {
    if (existing) await sb.from('cart_items').delete().eq('id', existing.id);
    revalidatePath('/cart');
    return { ok: true, quantity: 0 };
  }

  if (existing) {
    const { error } = await sb.from('cart_items').update({ quantity }).eq('id', existing.id);
    if (error) return { ok: false, reason: 'error', message: error.message };
  } else {
    const { error } = await sb.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity });
    if (error) return { ok: false, reason: 'error', message: error.message };
  }
  revalidatePath('/cart');
  return { ok: true, quantity };
}

export async function updateQuantity(itemId: string, quantity: number): Promise<Result> {
  const sb = createClient();
  if (quantity <= 0) return removeFromCart(itemId);
  const { error } = await sb.from('cart_items').update({ quantity }).eq('id', itemId);
  if (error) return { ok: false, reason: 'error', message: error.message };
  revalidatePath('/cart');
  return { ok: true };
}

export async function removeFromCart(itemId: string): Promise<Result> {
  const sb = createClient();
  const { error } = await sb.from('cart_items').delete().eq('id', itemId);
  if (error) return { ok: false, reason: 'error', message: error.message };
  revalidatePath('/cart');
  return { ok: true };
}
