import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/catalog';
import { effectivePrice } from '@/lib/pricing';
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
    discount_percent: number | null;
    image_url: string | null;
    sku: string | null;
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
      'id, quantity, product:products(id, name, slug, price, discount_percent, image_url, sku)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const rows = ((data as unknown) as CartRow[]) ?? [];
  const items = rows.filter((r) => r.product);
  // The discounted price, so the bag total matches what checkout will bill.
  const total = items.reduce(
    (s, r) => s + effectivePrice(r.product!.price, r.product!.discount_percent) * r.quantity,
    0,
  );

  return (
    <main className="container" style={{ paddingTop: '8rem', paddingBottom: '4rem', minHeight: '70svh' }}>
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
              price: effectivePrice(r.product!.price, r.product!.discount_percent),
              list_price: r.product!.price,
              discount_percent: r.product!.discount_percent ?? 0,
              image_url: r.product!.image_url,
              sku: r.product!.sku,
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
