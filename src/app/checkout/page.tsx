import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CheckoutClient from '@/components/CheckoutClient';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false } };
export const dynamic = 'force-dynamic';

type CartRow = {
  id: string;
  quantity: number;
  product: { id: string; name: string; price: number; image_url: string | null } | null;
};

export default async function CheckoutPage() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=/checkout');

  const { data } = await sb
    .from('cart_items')
    .select('id, quantity, product:products(id, name, price, image_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const rows = ((data as unknown) as CartRow[]) ?? [];
  const items = rows
    .filter((r) => r.product)
    .map((r) => ({
      id: r.product!.id,
      cartItemId: r.id,
      name: r.product!.name,
      price: r.product!.price,
      image_url: r.product!.image_url,
      quantity: r.quantity,
    }));

  if (items.length === 0) redirect('/cart');

  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, phone, address')
    .eq('id', user.id)
    .maybeSingle();

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CheckoutClient
      items={items}
      total={total}
      defaults={{
        full_name: profile?.full_name ?? '',
        phone: profile?.phone ?? '',
        address: profile?.address ?? '',
        email: user.email ?? '',
      }}
    />
  );
}
