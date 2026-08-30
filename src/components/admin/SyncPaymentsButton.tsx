'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { syncPendingPayments } from '@/app/admin/payment-actions';

/**
 * Re-checks every unconfirmed order against Razorpay in one go. Useful
 * after a webhook outage, or before the keys/webhook were set up.
 */
export default function SyncPaymentsButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      const res = await syncPendingPayments();
      setNote(res.message);
      if (res.ok) router.refresh();
    });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button
        type="button"
        onClick={run}
        disabled={pending || disabled}
        style={{
          padding: '0.6rem 1.2rem',
          borderRadius: 999,
          border: 'none',
          background: disabled ? 'rgba(255,255,255,0.08)' : 'var(--gold)',
          color: disabled ? 'var(--ink-mute)' : '#0e0e0e',
          fontSize: '0.72rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          fontWeight: 300,
          cursor: pending || disabled ? 'not-allowed' : 'pointer',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Checking…' : 'Reconcile with Razorpay'}
      </button>
      {note && <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{note}</span>}
    </div>
  );
}
