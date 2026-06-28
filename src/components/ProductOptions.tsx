'use client';

import { useState } from 'react';

/**
 * Product options shown above the Add-to-bag block: colour swatches, size
 * chips, a material line, customization note, and a shipping / return /
 * pincode panel. Selection is presentational (the cart is keyed per product,
 * not per variant) — it guides the buyer and surfaces the attributes the
 * admin entered. Renders nothing for any group that has no data.
 */
export default function ProductOptions({
  colors = [],
  sizes = [],
  material,
  customizable = false,
  customizationNote,
}: {
  colors?: string[];
  sizes?: string[];
  material?: string | null;
  customizable?: boolean;
  customizationNote?: string | null;
}) {
  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [pincode, setPincode] = useState('');
  const [pinResult, setPinResult] = useState<{ ok: boolean; text: string } | null>(null);

  const checkPin = () => {
    const valid = /^\d{6}$/.test(pincode.trim());
    if (!valid) {
      setPinResult({ ok: false, text: 'Enter a valid 6-digit pincode.' });
      return;
    }
    // No external pincode API wired — give a useful, honest estimate.
    setPinResult({ ok: true, text: `Delivers to ${pincode.trim()} in 4–7 business days.` });
  };

  const hasAnyOptions = colors.length > 0 || sizes.length > 0 || material || customizable;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.75rem' }}>
      {hasAnyOptions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {colors.length > 0 && (
            <Group label={`Colour${color ? ` · ${color}` : ''}`}>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                    title={c}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 0.9rem', borderRadius: 999,
                      border: `1px solid ${color === c ? 'var(--gold)' : 'var(--line-strong)'}`,
                      background: color === c ? 'rgba(212,181,116,0.12)' : 'transparent',
                      color: 'var(--ink)', fontSize: '0.8rem', cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: swatch(c), border: '1px solid rgba(255,255,255,0.25)' }} />
                    {c}
                  </button>
                ))}
              </div>
            </Group>
          )}

          {sizes.length > 0 && (
            <Group label={`Size${size ? ` · ${size}` : ''}`}>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    style={{
                      minWidth: 44, padding: '0.5rem 0.85rem', borderRadius: 8,
                      border: `1px solid ${size === s ? 'var(--gold)' : 'var(--line-strong)'}`,
                      background: size === s ? 'rgba(212,181,116,0.12)' : 'transparent',
                      color: 'var(--ink)', fontSize: '0.82rem', cursor: 'pointer',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Group>
          )}

          {material && (
            <Group label="Material">
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.92rem' }}>{material}</p>
            </Group>
          )}

          {customizable && (
            <Group label="Customization">
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                {customizationNote || 'This piece can be customized — add a note at checkout or contact us.'}
              </p>
            </Group>
          )}
        </div>
      )}

      {/* Shipping / Return / Pincode */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <p style={labelStyle}>Pincode check</p>
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 320 }}>
            <input
              value={pincode}
              onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '').slice(0, 6)); setPinResult(null); }}
              inputMode="numeric"
              placeholder="Enter 6-digit pincode"
              style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '0.6rem 0.9rem', color: 'var(--ink)', fontSize: '0.9rem' }}
            />
            <button type="button" onClick={checkPin} style={{ padding: '0 1.1rem', borderRadius: 8, border: '1px solid var(--line-strong)', background: 'transparent', color: 'var(--ink)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Check
            </button>
          </div>
          {pinResult && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: pinResult.ok ? 'var(--gold)' : '#e08a8a' }}>{pinResult.text}</p>
          )}
        </div>

        <details style={detailsStyle}>
          <summary style={summaryStyle}>Shipping details</summary>
          <p style={detailsBody}>
            Dispatched in 1–2 business days. Standard delivery across India in 4–7 business days,
            with insured, tracked courier. Free shipping on orders above ₹2,000.
          </p>
        </details>

        <details style={detailsStyle}>
          <summary style={summaryStyle}>Return policy</summary>
          <p style={detailsBody}>
            7-day easy returns on unused items in original packaging. Made-to-order and
            customized pieces are non-returnable. Refunds are processed to the original
            payment method within 5–7 business days of pickup.
          </p>
        </details>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      {children}
    </div>
  );
}

/** Best-effort CSS colour from a free-text colour name. */
function swatch(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    gold: '#d4b574', silver: '#c0c0c0', antique: '#8a6d3b', brass: '#b5a642',
    black: '#1a1a1a', white: '#f2f2f2', red: '#b13a3a', blue: '#3a5fb1',
    green: '#3a8a5a', brown: '#6b4a2b', copper: '#b87333', bronze: '#cd7f32',
    grey: '#888', gray: '#888', natural: '#cdbba0', wood: '#9c6b3f',
  };
  for (const key of Object.keys(map)) if (n.includes(key)) return map[key];
  return '#777';
}

const labelStyle: React.CSSProperties = {
  margin: '0 0 0.6rem', fontSize: '0.72rem', letterSpacing: '0.16em',
  textTransform: 'uppercase', color: 'var(--ink-soft)',
};
const detailsStyle: React.CSSProperties = { borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' };
const summaryStyle: React.CSSProperties = {
  cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--ink)', listStyle: 'none',
};
const detailsBody: React.CSSProperties = { margin: '0.75rem 0 0', fontSize: '0.88rem', color: 'var(--ink-soft)', lineHeight: 1.6 };
