'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/** Toggle a product in the signed-in user's favourites. */
export async function toggleFavourite(productId: string) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: 'auth' as const };

  const { data: existing } = await sb
    .from('favourites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing) {
    await sb.from('favourites').delete().eq('id', existing.id);
    revalidatePath('/favourites');
    return { ok: true, favourited: false };
  }
  const { error } = await sb
    .from('favourites')
    .insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, reason: 'error' as const, message: error.message };
  revalidatePath('/favourites');
  return { ok: true, favourited: true };
}
