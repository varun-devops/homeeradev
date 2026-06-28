/**
 * Visual order-status tracker.
 *
 * Renders the happy-path progression (Placed → Paid → Processing → Shipped →
 * Delivered) as a stepper, filling in every step up to and including the
 * order's current status. Cancelled / failed orders render a single muted
 * "Cancelled" / "Payment failed" state instead of the progress line.
 *
 * Pure presentational + server-safe (no client hooks) so it can be dropped
 * into both the customer profile and the admin order pages.
 */

// The happy-path steps shown in the tracker, in order.
const STEPS: { key: string; label: string }[] = [
  { key: 'created', label: 'Placed' },
  { key: 'paid', label: 'Paid' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

const GOLD = 'var(--gold)';
const MUTE = 'var(--ink-mute)';
const SOFT = 'var(--ink-soft)';

export default function OrderStatusSteps({
  status,
  size = 'md',
}: {
  status: string;
  size?: 'sm' | 'md';
}) {
  // Off-path terminal states get a simple banner, not the stepper.
  if (status === 'cancelled' || status === 'failed') {
    const text = status === 'cancelled' ? 'Order cancelled' : 'Payment failed';
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.9rem',
          borderRadius: 999,
          border: '1px solid var(--line-strong)',
          color: status === 'cancelled' ? MUTE : '#e08a8a',
          fontSize: '0.74rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        ✕ {text}
      </div>
    );
  }

  // Index of the current status within the happy path. Unknown → 0.
  const currentIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === status),
  );

  const dot = size === 'sm' ? 18 : 24;
  const labelSize = size === 'sm' ? '0.6rem' : '0.68rem';

  return (
    <div
      role="list"
      aria-label="Order progress"
      style={{ display: 'flex', alignItems: 'flex-start', width: '100%', maxWidth: 560 }}
    >
      {STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const lineDone = i < currentIndex;
        return (
          <div
            key={step.key}
            role="listitem"
            aria-current={isCurrent ? 'step' : undefined}
            style={{ flex: i === STEPS.length - 1 ? '0 0 auto' : 1, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {/* dot */}
              <span
                style={{
                  flexShrink: 0,
                  width: dot,
                  height: dot,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: done ? GOLD : 'transparent',
                  border: `1px solid ${done ? GOLD : 'var(--line-strong)'}`,
                  color: done ? '#0e0e0e' : MUTE,
                  fontSize: size === 'sm' ? '0.6rem' : '0.7rem',
                  boxShadow: isCurrent ? `0 0 0 4px rgba(212,181,116,0.18)` : 'none',
                  transition: 'all 200ms ease',
                }}
              >
                {done ? '✓' : i + 1}
              </span>
              {/* connector line (not after the last dot) */}
              {i < STEPS.length - 1 && (
                <span
                  style={{
                    flex: 1,
                    height: 1,
                    background: lineDone ? GOLD : 'var(--line-strong)',
                    margin: '0 6px',
                    transition: 'background 200ms ease',
                  }}
                />
              )}
            </div>
            {/* label */}
            <span
              style={{
                marginTop: 6,
                fontSize: labelSize,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: done ? (isCurrent ? GOLD : SOFT) : MUTE,
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
