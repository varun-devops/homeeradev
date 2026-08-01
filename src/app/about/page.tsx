import type { Metadata } from 'next';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'About us — The workshop behind Homeera',
  description:
    'Homeera makes brass, wood, aluminium and marble objects for the home, in small batches, with the workshops we have bought from for sixty years.',
  alternates: { canonical: '/about' },
};

/**
 * About us — an editorial page using the same hairline-band rhythm as
 * /contact, so the two read as a pair. Content is static; nothing here
 * touches the catalogue.
 */

const chapters = [
  {
    label: 'The house',
    title: 'Sixty years of the same trade',
    body: [
      'Homeera began as a family trading house dealing in metalware — brass first, then aluminium, wood and marble as the workshops around us grew into them. We have been buying from some of the same families since 1960.',
      'What we sell has never been mass-produced. Every piece is cast, spun, turned or hammered by a person, then filed, polished and finished by hand. That is slower and less consistent than a machine, and it is the entire point.',
    ],
  },
  {
    label: 'The makers',
    title: 'Five workshops, named on every order',
    body: [
      'Our catalogue comes from a small group of workshops in and around Moradabad. Each one has its own speciality: the brass ships and marine instruments, the plated aluminium sculpture, the hammered flower pots, the wood-and-metal planters, the turned floor lamps.',
      'We buy in small, repeatable batches rather than in container loads. It keeps the work steady for the workshop and it means a piece you liked is usually still available a season later.',
    ],
  },
  {
    label: 'The making',
    title: 'Hand-finished, so never identical',
    body: [
      'A polished brass surface is brought up by hand on a wheel. An antique finish is chemically aged and then cut back, again by hand, until the highlights sit where they should. Plating is done in small tanks, a few pieces at a time.',
      'The consequence is that two of the same piece will differ slightly in tone, in the depth of the patina, in the exact weight. We do not treat that as a defect and we would ask you not to either.',
    ],
  },
  {
    label: 'Buying from us',
    title: 'What you can expect',
    body: [
      'Everything on the site is in stock and dispatched from our own godown within one to two working days, insured and tracked across India. Prices are inclusive and there are no surprises at checkout.',
      'If a piece arrives damaged or is not what you expected, tell us within seven days and we will collect it and refund you. Made-to-order and customised pieces are the one exception.',
    ],
  },
];

export default function AboutPage() {
  return (
    <article
      className="container"
      style={{
        paddingTop: 'clamp(7rem, 14vh, 11rem)',
        paddingBottom: 'clamp(3rem, 6vh, 5rem)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        .heAbout-row {
          display: grid;
          grid-template-columns: minmax(160px, 1fr) minmax(0, 1.6fr);
          align-items: start;
          gap: clamp(1.25rem, 4vw, 3rem);
        }
        @media (max-width: 760px) {
          .heAbout-row { grid-template-columns: 1fr; gap: 1rem; }
        }
        .heAbout-rule { border: none; height: 1px; background: var(--line); margin: 0; }
        .heAbout-label {
          font-size: 0.72rem;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }
        .heAbout-title {
          margin: 0 0 1.1rem;
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 3.4vw, 2.3rem);
          font-style: italic;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--ink);
        }
        .heAbout-body {
          margin: 0 0 1rem;
          color: var(--ink-soft);
          font-size: clamp(0.98rem, 1.6vw, 1.06rem);
          line-height: 1.75;
          max-width: 62ch;
        }
        .heAbout-body:last-child { margin-bottom: 0; }
        .heAbout-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          font-size: 0.76rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--ink);
          border: 1px solid var(--line-strong);
          border-radius: 999px;
          padding: 0.85rem 1.6rem;
          transition: background 260ms var(--ease-out), border-color 260ms var(--ease-out);
        }
        .heAbout-cta:hover { background: rgba(212,181,116,0.14); border-color: var(--gold); }
      ` }} />

      {/* ============ HEAD ============ */}
      <Reveal>
        <div className="heAbout-row" style={{ paddingBottom: 'clamp(3rem, 8vh, 5.5rem)' }}>
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
            About us
          </h1>
          <p
            style={{
              alignSelf: 'end',
              margin: 0,
              color: 'var(--ink-soft)',
              fontSize: 'clamp(1.05rem, 2.2vw, 1.35rem)',
              lineHeight: 1.6,
              maxWidth: '48ch',
            }}
          >
            We make quiet, weighty objects for the home — brass, wood, aluminium and
            marble, finished by hand in small batches by workshops we have known for
            three generations.
          </p>
        </div>
      </Reveal>

      <hr className="heAbout-rule" />

      {/* ============ CHAPTERS ============ */}
      {chapters.map((c, i) => (
        <Reveal key={c.label} delay={100 + i * 80}>
          <div className="heAbout-row" style={{ paddingBlock: 'clamp(2.25rem, 6vh, 4rem)' }}>
            <div className="heAbout-label">{c.label}</div>
            <div>
              <h2 className="heAbout-title">{c.title}</h2>
              {c.body.map((para) => (
                <p key={para.slice(0, 40)} className="heAbout-body">
                  {para}
                </p>
              ))}
            </div>
          </div>
          <hr className="heAbout-rule" />
        </Reveal>
      ))}

      {/* ============ FOOT ============ */}
      <Reveal delay={100 + chapters.length * 80}>
        <div
          className="heAbout-row"
          style={{ paddingBlock: 'clamp(2.5rem, 7vh, 4rem)', alignItems: 'center' }}
        >
          <div className="heAbout-label">Next</div>
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <Link href="/shop" data-hover className="heAbout-cta">
              See the collection
            </Link>
            <Link href="/contact" data-hover className="heAbout-cta">
              Talk to the studio
            </Link>
          </div>
        </div>
      </Reveal>
    </article>
  );
}
