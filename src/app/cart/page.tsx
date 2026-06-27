import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/catalog';
import CartList from '@/components/CartList';

export const metadata: Metadata = { title: 'Your bag' };
export const dynamic = 'force-dynamic';

type CartRow = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    image_url: string | null;
    vendor: string | null;
  } | null;
};

export default async function CartPage() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=/cart');

  const { data } = await sb
    .from('cart_items')
    .select(
      'id, quantity, product:products(id, name, slug, price, image_url, vendor)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const rows = ((data as unknown) as CartRow[]) ?? [];
  const items = rows.filter((r) => r.product);
  const total = items.reduce((s, r) => s + (r.product!.price * r.quantity), 0);

  return (
    <main className="container" style={{ padding: '8rem 0 4rem', minHeight: '70svh' }}>
      <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Your bag</h1>

      {items.length === 0 ? (
        <div style={{ marginTop: '2rem', color: 'var(--ink-soft)' }}>
          <p>Your bag is empty.</p>
          <Link
            href="/shop"
            data-hover
            style={{
              marginTop: '1rem',
              display: 'inline-block',
              borderBottom: '1px solid var(--ink)',
              paddingBottom: '0.2rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              fontSize: '0.82rem',
            }}
          >
            Browse the shop →
          </Link>
        </div>
      ) : (
        <>
          <CartList
            items={items.map((r) => ({
              id: r.id,
              quantity: r.quantity,
              name: r.product!.name,
              slug: r.product!.slug,
              price: r.product!.price,
              image_url: r.product!.image_url,
              vendor: r.product!.vendor,
            }))}
          />

          <div
            style={{
              marginTop: '2.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--line)',
              paddingTop: '1.5rem',
            }}
          >
            <span style={{ color: 'var(--ink-soft)', letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '0.82rem' }}>
              Total
            </span>
            <span style={{ fontSize: '1.5rem', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
              {formatINR(total)}
            </span>
          </div>

          <Link
            href="/checkout"
            data-hover
            style={{
              marginTop: '1.5rem',
              display: 'inline-block',
              padding: '1rem 2.5rem',
              borderRadius: 999,
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: '0.82rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Checkout →
          </Link>
        </>
      )}
    </main>
  );
}
