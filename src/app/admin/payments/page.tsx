import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';
import { configStatus } from '@/lib/razorpay';
import SyncPaymentsButton from '@/components/admin/SyncPaymentsButton';

export const metadata = { title: 'Payments' };
export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  amount: number;
  amount_paid: number | null;
  amount_refunded: number | null;
  status: string;
  payment_detail: string | null;
  payment_method: string | null;
  payment_error: string | null;
  confirmed_via: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
};

export default async function AdminPaymentsPage() {
  const cfg = configStatus();
  const svc = createServiceClient();

  const [{ data: allOrders }, { data: events }] = await Promise.all([
    svc
      .from('orders')
      .select(
        'id, email, full_name, amount, amount_paid, amount_refunded, status, payment_detail, payment_method, payment_error, confirmed_via, razorpay_payment_id, created_at, paid_at',
      )
      .order('created_at', { ascending: false })
      .limit(200),
    svc
      .from('payment_events')
      .select('event, amount, rzp_payment_id, created_at, order_id')
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const orders = (allOrders ?? []) as OrderRow[];

  const captured = orders.reduce((s, o) => s + (o.amount_paid ?? 0), 0);
  const refunded = orders.reduce((s, o) => s + (o.amount_refunded ?? 0), 0);
  const unconfirmed = orders.filter((o) => o.status === 'created' && o.razorpay_payment_id === null);
  const failed = orders.filter((o) => o.status === 'failed');
  const paidOrders = orders.filter((o) => (o.amount_paid ?? 0) > 0);

  // The URL to paste into the Razorpay dashboard's webhook screen.
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://your-domain.com';
  const webhookUrl = `${site}/api/razorpay/webhook`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Payments</h1>
  
        </div>
        <SyncPaymentsButton disabled={!cfg.ready} />
      </div>

      {/* ---- Money ---- */}
      <div className="adminGrid" style={{ margin: '2rem 0' }}>
        <Stat label="Captured" value={formatINR(captured)} accent />
        <Stat label="Refunded" value={formatINR(refunded)} warn={refunded > 0} />
        <Stat label="Net received" value={formatINR(captured - refunded)} />
        <Stat label="Successful payments" value={String(paidOrders.length)} />
        <Stat label="Unconfirmed" value={String(unconfirmed.length)} warn={unconfirmed.length > 0} />
        <Stat label="Failed" value={String(failed.length)} warn={failed.length > 0} />
      </div>

      {/* ---- Gateway health ---- */}
      <section style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ ...cardH, margin: 0 }}>Gateway</h2>
          <span
            style={{
              fontSize: '0.66rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              padding: '0.25rem 0.7rem',
              borderRadius: 999,
              border: `1px solid ${cfg.mode === 'live' ? '#8fce8f' : 'var(--gold)'}`,
              color: cfg.mode === 'live' ? '#8fce8f' : 'var(--gold)',
            }}
          >
            {cfg.mode === 'live' ? 'Live mode' : cfg.mode === 'test' ? 'Test mode' : 'Not configured'}
          </span>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Check ok={cfg.hasKeyId} label="Key ID" hint={cfg.keyIdMasked ?? 'Add RAZORPAY_KEY_ID to .env.local'} />
          <Check ok={cfg.hasKeySecret} label="Key secret" hint={cfg.hasKeySecret ? 'Stored server-side' : 'Add RAZORPAY_KEY_SECRET to .env.local'} />
          <Check
            ok={cfg.hasWebhookSecret}
            label="Webhook secret"
            hint={
              cfg.hasWebhookSecret
                ? 'Automatic confirmation is active'
                : 'Add RAZORPAY_WEBHOOK_SECRET — without it, payments are only confirmed when the customer’s tab stays open'
            }
          />
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ margin: 0, fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
            Webhook URL — paste this into the Razorpay dashboard
          </p>
          <p
            style={{
              margin: '0.4rem 0 0',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.8rem',
              color: 'var(--ink-soft)',
              wordBreak: 'break-all',
            }}
          >
            {webhookUrl}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--ink-mute)' }}>
            Subscribe to: payment.captured · payment.failed · order.paid · refund.processed
          </p>
        </div>
      </section>

      {/* ---- Needs attention ---- */}
      {(unconfirmed.length > 0 || failed.length > 0) && (
        <section style={{ ...card, marginTop: '1.5rem' }}>
          <h2 style={cardH}>Needs attention</h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--ink-mute)' }}>
            Orders where no payment was confirmed. Reconcile to ask Razorpay directly —
            a customer who closed the tab mid-payment shows up here until then.
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[...unconfirmed, ...failed].slice(0, 25).map((o) => (
              <li key={o.id} style={rowStyle}>
                <div>
                  <Link href={`/admin/orders/${o.id}`} data-hover style={{ fontSize: '0.86rem' }}>
                    {o.full_name || o.email || 'Guest'}
                    <span style={{ color: 'var(--ink-mute)' }}> · #{o.id.slice(0, 8)} →</span>
                  </Link>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: 'var(--ink-mute)' }}>
                    {new Date(o.created_at).toLocaleString('en-IN')}
                    {o.payment_error ? ` · ${o.payment_error}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{formatINR(o.amount)}</span>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: o.status === 'failed' ? '#e08a8a' : 'var(--ink-mute)' }}>
                    {o.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Confirmed payments ---- */}
      <section style={{ ...card, marginTop: '1.5rem' }}>
        <h2 style={cardH}>Confirmed payments</h2>
        {paidOrders.length === 0 ? (
          <p style={{ color: 'var(--ink-mute)', fontSize: '0.85rem', margin: 0 }}>
            No payments captured yet.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {paidOrders.slice(0, 40).map((o) => (
              <li key={o.id} style={rowStyle}>
                <div>
                  <Link href={`/admin/orders/${o.id}`} data-hover style={{ fontSize: '0.86rem' }}>
                    {o.full_name || o.email || 'Guest'}
                    <span style={{ color: 'var(--ink-mute)' }}> · #{o.id.slice(0, 8)} →</span>
                  </Link>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: 'var(--ink-mute)' }}>
                    {o.payment_detail || o.payment_method || 'Payment'}
                    {o.paid_at ? ` · ${new Date(o.paid_at).toLocaleString('en-IN')}` : ''}
                    {o.confirmed_via === 'webhook' ? ' · webhook' : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatINR(o.amount_paid ?? o.amount)}
                  </span>
                  {(o.amount_refunded ?? 0) > 0 && (
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: '#e08a8a' }}>
                      −{formatINR(o.amount_refunded ?? 0)} refunded
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Webhook feed ---- */}
      {events && events.length > 0 && (
        <section style={{ ...card, marginTop: '1.5rem' }}>
          <h2 style={cardH}>Recent gateway events</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {(events as { event: string; amount: number | null; created_at: string; order_id: string | null }[]).map((e, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                <span>
                  {e.order_id ? (
                    <Link href={`/admin/orders/${e.order_id}`} data-hover>
                      {e.event}
                    </Link>
                  ) : (
                    e.event
                  )}
                </span>
                <span style={{ color: 'var(--ink-mute)', fontSize: '0.74rem', whiteSpace: 'nowrap' }}>
                  {e.amount != null ? `${formatINR(e.amount)} · ` : ''}
                  {new Date(e.created_at).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div style={card}>
      <p style={{ fontSize: '0.7rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: 0 }}>
        {label}
      </p>
      <p
        style={{
          fontSize: '1.7rem',
          margin: '0.5rem 0 0',
          fontVariantNumeric: 'tabular-nums',
          color: warn ? '#e08a8a' : accent ? 'var(--gold)' : 'var(--ink)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
      <span style={{ color: ok ? '#8fce8f' : '#e08a8a', fontSize: '0.9rem', lineHeight: 1.4 }}>{ok ? '✓' : '✕'}</span>
      <div>
        <p style={{ margin: 0, fontSize: '0.84rem' }}>{label}</p>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.76rem', color: 'var(--ink-mute)' }}>{hint}</p>
      </div>
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
const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  // Wraps rather than overflowing once the sidebar squeezes the column.
  flexWrap: 'wrap',
  gap: '0.5rem 1rem',
  paddingBottom: '0.6rem',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};
