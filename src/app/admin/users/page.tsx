import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const svc = createServiceClient();

  // Profiles (registered users) joined with their cart + order activity.
  const [{ data: profiles }, { data: carts }, { data: orders }] = await Promise.all([
    svc.from('profiles').select('id, email, full_name, phone, is_admin, created_at').order('created_at', { ascending: false }),
    svc.from('cart_items').select('user_id, quantity'),
    svc.from('orders').select('user_id, status'),
  ]);

  const cartByUser = new Map<string, number>();
  (carts ?? []).forEach((c: { user_id: string; quantity: number }) => {
    cartByUser.set(c.user_id, (cartByUser.get(c.user_id) ?? 0) + c.quantity);
  });
  const ordersByUser = new Map<string, { total: number; paid: number }>();
  (orders ?? []).forEach((o: { user_id: string | null; status: string }) => {
    if (!o.user_id) return;
    const e = ordersByUser.get(o.user_id) ?? { total: 0, paid: 0 };
    e.total += 1;
    if (o.status === 'paid') e.paid += 1;
    ordersByUser.set(o.user_id, e);
  });

  const rows = (profiles ?? []) as {
    id: string;
    email: string | null;
    full_name: string | null;
    phone: string | null;
    is_admin: boolean;
    created_at: string;
  }[];

  return (
    <div>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Users</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        {rows.length} registered · cart and order activity per user.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: 720 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-soft)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.12em' }}>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Joined</th>
              <th style={{ ...th, textAlign: 'center' }}>In cart</th>
              <th style={{ ...th, textAlign: 'center' }}>Orders</th>
              <th style={{ ...th, textAlign: 'center' }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const cart = cartByUser.get(u.id) ?? 0;
              const ord = ordersByUser.get(u.id) ?? { total: 0, paid: 0 };
              return (
                <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <td style={td}>{u.full_name || '—'}</td>
                  <td style={{ ...td, color: 'var(--ink-soft)' }}>{u.email}</td>
                  <td style={{ ...td, color: 'var(--ink-mute)' }}>
                    {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>{cart || '—'}</td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {ord.total ? (
                      <span>
                        {ord.total}
                        {ord.paid > 0 && <span style={{ color: 'var(--gold)' }}> ({ord.paid} paid)</span>}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'center' }}>
                    {u.is_admin ? (
                      <span style={{ color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Admin
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-mute)', fontSize: '0.72rem' }}>Customer</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ color: 'var(--ink-soft)', padding: '2rem 0', textAlign: 'center' }}>No users yet.</p>}
      </div>
    </div>
  );
}

const th: React.CSSProperties = { padding: '0.6rem 0.75rem' };
const td: React.CSSProperties = { padding: '0.7rem 0.75rem', verticalAlign: 'middle' };
