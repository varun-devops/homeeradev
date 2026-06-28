'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Submit (or update) a star rating + review for a product. Only allowed if
 * the signed-in user has a PAID order containing this product (enforced
 * again by RLS). One review per user per product (upsert).
 */
export async function submitReview(input: {
  productId: string;
  slug: string;
  rating: number;
  body: string;
}) {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: 'auth' as const };

  if (input.rating < 1 || input.rating > 5) {
    return { ok: false, message: 'Please choose a rating from 1 to 5 stars.' };
  }

  // Verify a paid purchase of this product.
  const { data: bought } = await sb
    .from('order_items')
    .select('id, orders!inner(user_id, status)')
    .eq('product_id', input.productId)
    .eq('orders.user_id', user.id)
    .eq('orders.status', 'paid')
    .limit(1);
  if (!bought || bought.length === 0) {
    return { ok: false, message: 'Only verified buyers can review this product.' };
  }

  // Author name from profile (falls back to email handle).
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();
  const authorName = profile?.full_name || user.email?.split('@')[0] || 'Customer';

  const { error } = await sb.from('reviews').upsert(
    {
      product_id: input.productId,
      user_id: user.id,
      rating: input.rating,
      body: input.body.trim() || null,
      author_name: authorName,
    },
    { onConflict: 'product_id,user_id' },
  );
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/shop/${input.slug}`);
  return { ok: true };
}
