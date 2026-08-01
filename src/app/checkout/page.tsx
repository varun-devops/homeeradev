import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CheckoutClient from '@/components/CheckoutClient';
import { EMPTY_ADDRESS, type Address } from '@/lib/address';

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

  // The structured address columns arrived in migration-08. Select them
  // defensively so checkout still renders on a database that hasn't run it
  // yet — it just opens on an empty form instead of erroring.
  const { data: profile } = await sb
    .from('profiles')
    .select('full_name, phone, address, pin_code, locality, city, state, address_line')
    .eq('id', user.id)
    .maybeSingle();

  const p = (profile ?? {}) as Partial<Record<keyof Address | 'address', string | null>>;
  const saved: Address = {
    ...EMPTY_ADDRESS,
    full_name: p.full_name ?? '',
    phone: p.phone ?? '',
    pin_code: p.pin_code ?? '',
    locality: p.locality ?? '',
    city: p.city ?? '',
    state: p.state ?? '',
    address_line: p.address_line ?? '',
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return <CheckoutClient items={items} total={total} email={user.email ?? ''} saved={saved} />;
}
