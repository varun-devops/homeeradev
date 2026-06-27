import { createServiceClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';

export const dynamic = 'force-dynamic';

async function counts() {
  const svc = createServiceClient();
  const [products, activeProducts, users, orders, paidOrders, cartItems] = await Promise.all([
    svc.from('products').select('id', { count: 'exact', head: true }),
    svc.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    svc.from('profiles').select('id', { count: 'exact', head: true }),
    svc.from('orders').select('id', { count: 'exact', head: true }),
    svc.from('orders').select('amount').eq('status', 'paid'),
    svc.from('cart_items').select('id', { count: 'exact', head: true }),
  ]);
  const revenue = (paidOrders.data ?? []).reduce((s: number, o: { amount: number }) => s + o.amount, 0);
  return {
    products: products.count ?? 0,
    activeProducts: activeProducts.count ?? 0,
    users: users.count ?? 0,
    orders: orders.count ?? 0,
    paid: (paidOrders.data ?? []).length,
    revenue,
    cartItems: cartItems.count ?? 0,
  };
}

export default async function AdminDashboard() {
  const c = await counts();
  const cards = [
    { label: 'Revenue (paid)', value: formatINR(c.revenue), accent: true },
    { label: 'Orders', value: c.orders, sub: `${c.paid} paid` },
    { label: 'Registered users', value: c.users },
    { label: 'Products', value: c.products, sub: `${c.activeProducts} visible` },
    { label: 'Items in carts', value: c.cartItems },
  ];

  return (
    <div>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Dashboard</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2.5rem' }}>Store at a glance.</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '1.5rem',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <p style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: 0 }}>
              {card.label}
            </p>
            <p style={{ fontSize: '2rem', margin: '0.6rem 0 0', color: card.accent ? 'var(--gold)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {card.value}
            </p>
            {card.sub && <p style={{ fontSize: '0.8rem', color: 'var(--ink-mute)', margin: '0.3rem 0 0' }}>{card.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
