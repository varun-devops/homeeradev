'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatINR } from '@/lib/format';
import { syncPayment, refundOrder } from '@/app/admin/payment-actions';

export type PaymentInfo = {
  orderId: string;
  status: string;
  amount: number;
  amountPaid: number | null;
  amountRefunded: number | null;
  method: string | null;
  detail: string | null;
  paymentEmail: string | null;
  paymentContact: string | null;
  paidAt: string | null;
  paymentError: string | null;
  confirmedVia: string | null;
  lastSyncedAt: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  refundId: string | null;
};

/**
 * The payment card on an order. Shows how the money actually moved, and
 * gives the admin the two operations that matter: re-check against
 * Razorpay (source of truth) and issue a refund.
 */
export default function PaymentPanel({ info }: { info: PaymentInfo }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const paid = info.amountPaid ?? 0;
  const refunded = info.amountRefunded ?? 0;
  const outstanding = Math.max(0, (info.amountPaid ?? info.amount) - refunded);
  const [refundAmount, setRefundAmount] = useState(String(outstanding));

  const isPaid = Boolean(info.razorpayPaymentId) && info.status !== 'failed' && paid > 0;
  const isFailed = info.status === 'failed' || Boolean(info.paymentError);

  const badge = isFailed
    ? { text: 'Payment failed', color: '#e08a8a' }
    : isPaid
      ? { text: refunded > 0 && refunded >= paid ? 'Refunded' : 'Payment confirmed', color: refunded >= paid && refunded > 0 ? '#c9a227' : '#8fce8f' }
      : { text: 'Awaiting confirmation', color: 'var(--ink-mute)' };

  const runSync = () =>
    start(async () => {
      const res = await syncPayment(info.orderId);
      setNote({ ok: res.ok, text: res.message ?? (res.ok ? 'Synced.' : 'Sync failed.') });
      if (res.ok) router.refresh();
    });

  const runRefund = () =>
    start(async () => {
      const amount = Number(refundAmount);
      const res = await refundOrder(info.orderId, amount);
      setNote({ ok: res.ok, text: res.message });
      if (res.ok) {
        setRefundOpen(false);
        router.refresh();
      }
    });

  return (
    <section style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <h2 style={{ ...cardH, margin: 0 }}>Payment</h2>
        <span
          style={{
            fontSize: '0.68rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: badge.color,
            border: `1px solid ${badge.color}`,
            borderRadius: 999,
            padding: '0.25rem 0.7rem',
            whiteSpace: 'nowrap',
          }}
        >
          {badge.text}
        </span>
      </div>

      {/* Money */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.25rem' }}>
        <Figure label="Charged" value={formatINR(info.amount)} />
        <Figure label="Captured" value={info.amountPaid == null ? '—' : formatINR(paid)} accent={paid > 0} />
        {refunded > 0 && <Figure label="Refunded" value={formatINR(refunded)} warn />}
      </div>

      <Row label="Method" value={info.detail ?? info.method ?? '—'} />
      <Row label="Paid at" value={info.paidAt ? new Date(info.paidAt).toLocaleString('en-IN') : '—'} />
      <Row label="Payer" value={[info.paymentEmail, info.paymentContact].filter(Boolean).join(' · ') || '—'} />
      <Row label="Razorpay order" value={info.razorpayOrderId ?? '—'} mono />
      <Row label="Payment id" value={info.razorpayPaymentId ?? '—'} mono />
      {info.refundId && <Row label="Refund id" value={info.refundId} mono />}
      <Row
        label="Confirmed by"
        value={
          info.confirmedVia === 'webhook'
            ? 'Razorpay webhook'
            : info.confirmedVia === 'checkout'
              ? 'Browser callback (signature verified)'
              : info.confirmedVia === 'manual'
                ? 'Admin sync'
                : '—'
        }
      />
      {info.lastSyncedAt && (
        <Row label="Last checked" value={new Date(info.lastSyncedAt).toLocaleString('en-IN')} />
      )}
      {info.paymentError && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: '#e08a8a' }}>{info.paymentError}</p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
        <button type="button" onClick={runSync} disabled={pending} style={btn}>
          {pending ? 'Checking…' : 'Re-check with Razorpay'}
        </button>
        {isPaid && outstanding > 0 && (
          <button
            type="button"
            onClick={() => setRefundOpen((v) => !v)}
            disabled={pending}
            style={{ ...btn, borderColor: 'rgba(224,138,138,0.5)', color: '#e08a8a' }}
          >
            Refund
          </button>
        )}
      </div>

      {refundOpen && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid rgba(224,138,138,0.3)', borderRadius: 10 }}>
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
            Refund amount in rupees (max {formatINR(outstanding)}). Money leaves your Razorpay
            balance immediately and reaches the customer in 5–7 working days.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="number"
              min={1}
              max={outstanding}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--line-strong)',
                borderRadius: 7,
                padding: '0.5rem 0.7rem',
                color: 'var(--ink)',
                width: 130,
              }}
            />
            <button type="button" onClick={runRefund} disabled={pending} style={{ ...btn, borderColor: '#e08a8a', color: '#e08a8a' }}>
              {pending ? 'Refunding…' : 'Confirm refund'}
            </button>
          </div>
        </div>
      )}

      {note && (
        <p style={{ margin: '0.85rem 0 0', fontSize: '0.8rem', color: note.ok ? 'var(--gold)' : '#e08a8a' }}>
          {note.text}
        </p>
      )}
    </section>
  );
}

function Figure({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
        {label}
      </p>
      <p
        style={{
          margin: '0.25rem 0 0',
          fontSize: '1.15rem',
          fontVariantNumeric: 'tabular-nums',
          color: warn ? '#e08a8a' : accent ? 'var(--gold)' : 'var(--ink)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.28rem 0', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--ink-mute)', whiteSpace: 'nowrap' }}>{label}</span>
      <span
        style={{
          color: 'var(--ink-soft)',
          textAlign: 'right',
          wordBreak: 'break-all',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
          fontSize: mono ? '0.74rem' : undefined,
        }}
      >
        {value}
      </span>
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
const btn: React.CSSProperties = {
  padding: '0.55rem 1rem',
  borderRadius: 999,
  border: '1px solid var(--line-strong)',
  background: 'transparent',
  color: 'var(--ink)',
  fontSize: '0.72rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};
