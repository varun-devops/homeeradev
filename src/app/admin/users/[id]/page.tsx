import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';
import OrderStatusSteps from '@/components/OrderStatusSteps';

export const metadata = { title: 'Customer' };
export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const svc = createServiceClient();

  const [{ data: profile }, { data: orders }] = await Promise.all([
    svc.from('profiles').select('id, email, full_name, phone, address, is_admin, created_at').eq('id', params.id).maybeSingle(),
    svc
      .from('orders')
      .select('id, amount, status, created_at, order_items(name, quantity)')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!profile) notFound();

  const u = profile as {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    address: string | null;
    is_admin: boolean;
    created_at: string;
  };

  const orderList = (orders ?? []) as {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    order_items: { name: string; quantity: number }[];
  }[];

  const totalSpent = orderList.filter((o) => o.status !== 'cancelled' && o.status !== 'failed').reduce((s, o) => s + o.amount, 0);

  return (
    <div>
      <Link href="/admin/users" data-hover style={{ fontSize: '0.78rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        ← All users
      </Link>

      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', margin: '1rem 0 0' }}>
        {u.full_name || u.email || 'Customer'}
        {u.is_admin && <span style={{ color: 'var(--gold)', fontSize: '0.8rem', marginLeft: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Admin</span>}
      </h1>
      <p style={{ margin: '0.3rem 0 0', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
        {u.email}
        {u.phone ? ` · ${u.phone}` : ''} · joined {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>
      {u.address && (
        <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: 'var(--ink-mute)', whiteSpace: 'pre-wrap' }}>{u.address}</p>
      )}

      <div style={{ display: 'flex', gap: '2rem', margin: '1.75rem 0', flexWrap: 'wrap' }}>
        <Stat label="Orders" value={String(orderList.length)} />
        <Stat label="Lifetime value" value={formatINR(totalSpent)} />
      </div>

      <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Order history</h2>
      {orderList.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', marginTop: '1rem' }}>No orders yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: '1.25rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orderList.map((o) => (
            <li key={o.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/admin/orders/${o.id}`} data-hover style={{ fontSize: '0.8rem' }}>
                  #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} →
                </Link>
                <span style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(o.amount)}</span>
              </div>
              <div style={{ margin: '1.1rem 0 0.25rem' }}>
                <OrderStatusSteps status={o.status} size="sm" />
              </div>
              <p style={{ margin: '0.6rem 0 0', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                {o.order_items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '1.4rem', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      <p style={{ margin: '0.2rem 0 0', fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</p>
    </div>
  );
}
