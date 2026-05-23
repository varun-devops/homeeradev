import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Contact — Write to the studio',
  description:
    'Get in touch with Homeera about products, trade enquiries, repairs and press.',
  alternates: { canonical: '/contact' },
};

/**
 * Editorial contact page — Resn-style.
 *
 * Layout (desktop):
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Contact                  newbusiness@homeera.com        │
 *   │                           careers@homeera.com            │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  WELLINGTON               +64 · address · …              │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  AMSTERDAM                +31 · address · …              │
 *   ├──────────────────────────────────────────────────────────┤
 *   │  GAZETTE / SOCIAL   PRIVACY            LinkedIn · …      │
 *   └──────────────────────────────────────────────────────────┘
 *
 * On narrow viewports the two columns collapse to a single column and
 * each block stacks vertically with the same hairline rhythm.
 */

const offices = [
  {
    city: 'Wellington',
    phone: '+64 4 385 0705',
    lines: ['Level 7 / 138', 'Wakefield Street', 'Wellington 6011', 'New Zealand'],
  },
  {
    city: 'Amsterdam',
    phone: '+31 20 2610299',
    lines: ['Keizersgracht 482', 'Amsterdam', 'The Netherlands'],
  },
];

export default function ContactPage() {
  return (
    <article
      className="container"
      style={{
        // Generous top padding so the headline sits clear of the fixed
        // header; bottom padding keeps the footer row breathing.
        padding: 'clamp(7rem, 14vh, 11rem) 0 clamp(3rem, 6vh, 5rem)',
      }}
    >
      <style>{`
        /* Two-column row used for every band: label / address on the
           left, content on the right. Collapses to one column under 760px. */
        .heContact-row {
          display: grid;
          grid-template-columns: minmax(160px, 1fr) minmax(0, 1.6fr);
          align-items: start;
          gap: clamp(1.25rem, 4vw, 3rem);
        }
        @media (max-width: 760px) {
          .heContact-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
        }

        /* Hairline divider between bands — the editorial rhythm of the
           reference. Uses the same gold line tokens as the rest of the
           site so it sits in the existing palette. */
        .heContact-rule {
          border: none;
          height: 1px;
          background: var(--line);
          margin: 0;
        }

        /* Email links — large, underlined, no other affordance. */
        .heContact-mail {
          display: inline-block;
          color: var(--ink);
          font-family: var(--font-display);
          font-size: clamp(1.4rem, 3.6vw, 2.4rem);
          line-height: 1.15;
          letter-spacing: -0.01em;
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 0.18em;
          transition: opacity 240ms var(--ease-out);
        }
        .heContact-mail:hover { opacity: 0.7; }

        /* Section labels (WELLINGTON, AMSTERDAM, GAZETTE) */
        .heContact-label {
          font-size: 0.72rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }

        /* Footer link row — sits flush with the bottom rule, columns
           collapse on mobile. */
        .heContact-foot {
          display: grid;
          grid-template-columns: minmax(160px, 1fr) minmax(160px, 1fr) minmax(0, 1.6fr);
          align-items: center;
          gap: clamp(1rem, 4vw, 3rem);
          padding-block: 1.75rem;
        }
        @media (max-width: 760px) {
          .heContact-foot {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }
        .heContact-arrow {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.74rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink-soft);
          transition: color 240ms var(--ease-out);
        }
        .heContact-arrow:hover { color: var(--ink); }
        .heContact-arrow::before {
          content: '→';
          font-size: 1.1em;
          line-height: 1;
        }
      `}</style>

      {/* ============ HEAD ROW — display headline + primary emails ============ */}
      <Reveal>
        <div className="heContact-row" style={{ paddingBottom: 'clamp(3rem, 8vh, 5.5rem)' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.5rem, 11vw, 8rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              fontWeight: 400,
              color: 'var(--ink)',
            }}
          >
            Contact
          </h1>

          <div style={{ display: 'grid', gap: '0.85rem', alignSelf: 'end' }}>
            <a
              href="mailto:newbusiness@homeera.com"
              data-hover
              className="heContact-mail"
            >
              newbusiness@homeera.com
            </a>
            <a
              href="mailto:careers@homeera.com"
              data-hover
              className="heContact-mail"
            >
              careers@homeera.com
            </a>
          </div>
        </div>
      </Reveal>

      <hr className="heContact-rule" />

      {/* ============ OFFICE BANDS ============ */}
      {offices.map((o, i) => (
        <Reveal key={o.city} delay={120 + i * 90}>
          <div
            className="heContact-row"
            style={{ paddingBlock: 'clamp(2.25rem, 6vh, 4rem)' }}
          >
            <div className="heContact-label">{o.city}</div>

            <div
              style={{
                display: 'grid',
                gap: '1.6rem',
                fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                color: 'var(--ink)',
              }}
            >
              <a
                href={`tel:${o.phone.replace(/\s+/g, '')}`}
                data-hover
                style={{ color: 'var(--ink)' }}
              >
                {o.phone}
              </a>
              <address
                style={{
                  fontStyle: 'normal',
                  color: 'var(--ink-soft)',
                  lineHeight: 1.5,
                  display: 'grid',
                  gap: '0.15rem',
                }}
              >
                {o.lines.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
            </div>
          </div>
          <hr className="heContact-rule" />
        </Reveal>
      ))}

      {/* ============ FOOTER ROW — gazette / privacy / social ============ */}
      <Reveal delay={120 + offices.length * 90}>
        <div className="heContact-foot">
          <Link href="/journal" data-hover className="heContact-arrow">
            Gazette / Social
          </Link>
          <Link href="/privacy" data-hover className="heContact-arrow">
            Privacy
          </Link>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'clamp(1rem, 3vw, 2rem)',
              justifyContent: 'flex-end',
              fontSize: '0.92rem',
              color: 'var(--ink-soft)',
            }}
          >
            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              data-hover
              style={{ color: 'var(--ink)' }}
            >
              LinkedIn
            </a>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              data-hover
              style={{ color: 'var(--ink)' }}
            >
              Instagram
            </a>
            <a
              href="mailto:hello@homeera.com"
              data-hover
              style={{ color: 'var(--ink)' }}
            >
              hello@homeera.com
            </a>
          </div>
        </div>
      </Reveal>
    </article>
  );
}
