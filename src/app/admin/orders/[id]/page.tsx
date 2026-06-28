import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';
import OrderStatusControl from '@/components/admin/OrderStatusControl';
import OrderStatusSteps from '@/components/OrderStatusSteps';

export const metadata = { title: 'Order detail' };
export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const svc = createServiceClient();
  const { data } = await svc
    .from('orders')
    .select(
      'id, user_id, email, full_name, phone, shipping_address, amount, status, razorpay_order_id, razorpay_payment_id, created_at, order_items(name, sku, quantity, price)',
    )
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();

  const o = data as {
    id: string;
    user_id: string | null;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    shipping_address: string | null;
    amount: number;
    status: string;
    razorpay_order_id: string | null;
    razorpay_payment_id: string | null;
    created_at: string;
    order_items: { name: string; sku: string | null; quantity: number; price: number }[];
  };

  return (
    <div>
      <Link href="/admin/orders" data-hover style={{ fontSize: '0.78rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        ← All orders
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontStyle: 'italic', fontSize: '2rem', margin: 0 }}>Order #{o.id.slice(0, 8)}</h1>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>
            {new Date(o.created_at).toLocaleString('en-IN')}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <p style={{ margin: 0, fontSize: '1.4rem', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(o.amount)}</p>
          <OrderStatusControl orderId={o.id} status={o.status} />
        </div>
      </div>

      {/* Status tracker */}
      <div style={{ margin: '2rem 0', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
        <OrderStatusSteps status={o.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
        {/* Customer */}
        <section style={card}>
          <h2 style={cardH}>Customer</h2>
          <p style={{ margin: 0, fontWeight: 500 }}>{o.full_name || 'Guest'}</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>{o.email}</p>
          {o.phone && <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>{o.phone}</p>}
          {o.user_id && (
            <Link href={`/admin/users/${o.user_id}`} data-hover style={linkBtn}>
              View customer →
            </Link>
          )}
        </section>

        {/* Shipping */}
        <section style={card}>
          <h2 style={cardH}>Ship to</h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>
            {o.shipping_address || '—'}
          </p>
        </section>

        {/* Payment */}
        <section style={card}>
          <h2 style={cardH}>Payment</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Razorpay order: {o.razorpay_order_id || '—'}
          </p>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Payment id: {o.razorpay_payment_id || '—'}
          </p>
        </section>
      </div>

      {/* Items */}
      <section style={{ ...card, marginTop: '1.5rem' }}>
        <h2 style={cardH}>Items</h2>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {o.order_items.map((it, i) => (
            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--ink-soft)' }}>
              <span>
                {it.quantity} × {it.name}
                {it.sku ? <span style={{ color: 'var(--ink-mute)' }}> · Item No. {it.sku}</span> : null}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '1.25rem 1.5rem',
  background: 'rgba(255,255,255,0.02)',
};
const cardH: React.CSSProperties = {
  fontSize: '0.7rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  marginTop: 0,
  marginBottom: '0.75rem',
};
const linkBtn: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '0.85rem',
  fontSize: '0.74rem',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--ink)',
  borderBottom: '1px solid var(--ink)',
  paddingBottom: '0.15rem',
};
