'use client';

import { useState, useTransition } from 'react';
import { setOrderStatus, ORDER_STATUSES, type OrderStatus } from '@/app/admin/actions';

const COLORS: Record<string, string> = {
  paid: 'var(--gold)',
  processing: '#7fb5e0',
  shipped: '#7fb5e0',
  delivered: '#8fce8f',
  created: 'var(--ink-soft)',
  failed: '#e08a8a',
  cancelled: 'var(--ink-mute)',
};

/**
 * Admin control to change an order's status. On change it persists and
 * the server action also drops an in-site notification to the customer.
 */
export default function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const onChange = (next: string) => {
    setValue(next);
    start(async () => {
      const res = await setOrderStatus(orderId, next as OrderStatus);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--line-strong)',
          borderRadius: 7,
          padding: '0.4rem 0.6rem',
          color: COLORS[value] ?? 'var(--ink)',
          fontSize: '0.74rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s} style={{ color: '#000' }}>
            {s}
          </option>
        ))}
      </select>
      {saved && <span style={{ color: 'var(--gold)', fontSize: '0.74rem' }}>✓</span>}
    </div>
  );
}
