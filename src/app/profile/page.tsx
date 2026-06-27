import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';
import ProfileForm from '@/components/ProfileForm';

export const metadata: Metadata = { title: 'Your profile' };
export const dynamic = 'force-dynamic';

const statusColor: Record<string, string> = {
  paid: 'var(--gold)',
  processing: '#7fb5e0',
  shipped: '#7fb5e0',
  delivered: '#8fce8f',
  created: 'var(--ink-soft)',
  failed: '#e08a8a',
  cancelled: 'var(--ink-mute)',
};

export default async function ProfilePage() {
  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/auth/login?next=/profile');

  const [{ data: profile }, { data: orders }] = await Promise.all([
    sb.from('profiles').select('full_name, phone, address, email').eq('id', user.id).maybeSingle(),
    sb
      .from('orders')
      .select('id, amount, status, created_at, order_items(name, quantity)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const orderList = (orders as {
    id: string;
    amount: number;
    status: string;
    created_at: string;
    order_items: { name: string; quantity: number }[];
  }[]) ?? [];

  return (
    <main className="container" style={{ padding: '8rem 0 4rem', minHeight: '70svh' }}>
      <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Your profile</h1>

      <div
        style={{
          marginTop: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: 'clamp(2rem, 5vw, 4rem)',
          alignItems: 'start',
        }}
      >
        {/* Account details */}
        <section>
          <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Account</h2>
          <ProfileForm
            email={profile?.email ?? user.email ?? ''}
            defaults={{
              full_name: profile?.full_name ?? '',
              phone: profile?.phone ?? '',
              address: profile?.address ?? '',
            }}
          />
        </section>

        {/* Order history */}
        <section>
          <h2 style={{ fontSize: '1.1rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Orders</h2>
          {orderList.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', marginTop: '1rem' }}>No orders yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: '1.25rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orderList.map((o) => (
                <li key={o.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--ink-mute)' }}>
                      #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: statusColor[o.status] ?? 'var(--ink-soft)',
                      }}
                    >
                      {o.status}
                    </span>
                  </div>
                  <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                    {o.order_items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                  </p>
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(o.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/favourites" data-hover style={{ display: 'inline-block', marginTop: '1.5rem', fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', borderBottom: '1px solid var(--ink)', paddingBottom: '0.2rem' }}>
            View favourites →
          </Link>
        </section>
      </div>
    </main>
  );
}
