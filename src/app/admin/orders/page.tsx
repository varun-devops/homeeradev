import { createServiceClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';

export const metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

const statusColor: Record<string, string> = {
  paid: 'var(--gold)',
  created: 'var(--ink-soft)',
  failed: '#e08a8a',
  cancelled: 'var(--ink-mute)',
};

export default async function AdminOrdersPage() {
  const svc = createServiceClient();
  const { data } = await svc
    .from('orders')
    .select('id, email, full_name, phone, amount, status, razorpay_payment_id, created_at, order_items(name, quantity, price)')
    .order('created_at', { ascending: false });

  const orders = (data ?? []) as {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    amount: number;
    status: string;
    razorpay_payment_id: string | null;
    created_at: string;
    order_items: { name: string; quantity: number; price: number }[];
  }[];

  return (
    <div>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Orders</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        {orders.length} orders · who bought what, and payment status.
      </p>

      {orders.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)' }}>No orders yet. They appear here after checkout.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((o) => (
            <div
              key={o.id}
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>{o.full_name || o.email || 'Guest'}</p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                    {o.email}
                    {o.phone ? ` · ${o.phone}` : ''}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.74rem', color: 'var(--ink-mute)' }}>
                    {new Date(o.created_at).toLocaleString('en-IN')}
                    {o.razorpay_payment_id ? ` · ${o.razorpay_payment_id}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(o.amount)}
                  </p>
                  <p
                    style={{
                      margin: '0.3rem 0 0',
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: statusColor[o.status] ?? 'var(--ink-soft)',
                    }}
                  >
                    {o.status}
                  </p>
                </div>
              </div>

              {o.order_items?.length > 0 && (
                <ul style={{ margin: '1rem 0 0', padding: 0, listStyle: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '0.75rem' }}>
                  {o.order_items.map((it, i) => (
                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--ink-soft)', padding: '0.15rem 0' }}>
                      <span>
                        {it.quantity} × {it.name}
                      </span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(it.price * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
