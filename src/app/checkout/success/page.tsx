import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';

export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams?: { order?: string };
}) {
  const orderId = searchParams?.order;
  if (!orderId) redirect('/');

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: order } = await sb
    .from('orders')
    .select('id, amount, status, full_name, created_at, order_items(name, quantity, price)')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) redirect('/');

  const items = (order.order_items as { name: string; quantity: number; price: number }[]) ?? [];

  return (
    <main className="container" style={{ padding: '9rem 0 5rem', minHeight: '70svh', maxWidth: 620 }}>
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: '1.5px solid var(--gold)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 1.5rem',
            color: 'var(--gold)',
            fontSize: '1.8rem',
          }}
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 2.8rem)', margin: 0 }}>
          {order.status === 'paid' ? 'Thank you — order confirmed' : 'Order received'}
        </h1>
        <p style={{ color: 'var(--ink-soft)', marginTop: '0.75rem' }}>
          {order.full_name ? `${order.full_name}, your` : 'Your'} order is {order.status}.
          A confirmation is on its way.
        </p>
      </div>

      <div style={{ marginTop: '2.5rem', border: '1px solid var(--line)', borderRadius: 12, padding: '1.75rem' }}>
        <p style={{ fontSize: '0.74rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: 0 }}>
          Order #{order.id.slice(0, 8)}
        </p>
        <ul style={{ listStyle: 'none', margin: '1.25rem 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
              <span>
                {it.quantity} × {it.name}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
            Total paid
          </span>
          <span style={{ color: 'var(--gold)', fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>
            {formatINR(order.amount)}
          </span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <Link
          href="/shop"
          data-hover
          style={{
            display: 'inline-block',
            padding: '0.9rem 2.2rem',
            borderRadius: 999,
            border: '1px solid var(--line-strong)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontSize: '0.8rem',
          }}
        >
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
