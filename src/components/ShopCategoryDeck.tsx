'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Full-screen, vertically-snapping shop category deck.
 *
 * Replaces the four small category cards on the home page with a stack
 * of full-viewport panels. Each panel is one category, and the visitor
 * moves through them by swiping / scrolling vertically — the container
 * uses CSS scroll-snap so each card locks into place one screen at a
 * time with the smooth-scroll behaviour CSS provides natively.
 *
 * The intersection observer tracks which card is in view so we can
 * advance the side index dot and apply the active-card parallax.
 */

type Card = {
  slug: string;
  label: string;
  caption: string;
  copy: string;
  tone: string;
  accent: string;
};

const cards: Card[] = [
  {
    slug: 'living',
    label: 'Living',
    caption: 'Soft places to land',
    copy: 'Sofas, throws, and the quiet textiles that hold the room together.',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.16), rgba(20,20,20,0.95))',
    accent: '#d4b574',
  },
  {
    slug: 'decor',
    label: 'Decor',
    caption: 'Framed quiet',
    copy: 'Vessels, mirrors, and small objects that mark a slower kind of attention.',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.22), rgba(20,20,20,0.95))',
    accent: '#e8c885',
  },
  {
    slug: 'lighting',
    label: 'Lighting',
    caption: 'How the evening lands',
    copy: 'Lamps that warm a corner instead of flooding the room.',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.28), rgba(20,20,20,0.95))',
    accent: '#f0d090',
  },
  {
    slug: 'outdoor',
    label: 'Outdoor',
    caption: 'Patio calm',
    copy: 'Garden objects, planters, and pieces that weather slowly.',
    tone: 'linear-gradient(140deg, rgba(212,181,116,0.20), rgba(20,20,20,0.95))',
    accent: '#cba36a',
  },
];

export default function ShopCategoryDeck() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Track which card is currently centred in the scroller so the side
  // index and parallax can react to it.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const panels = Array.from(
      root.querySelectorAll<HTMLElement>('[data-card]'),
    );
    if (panels.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the largest intersection ratio — that is
        // the card currently snapped into the viewport.
        let bestIdx = -1;
        let bestRatio = 0;
        entries.forEach((e) => {
          if (e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            const idx = Number((e.target as HTMLElement).dataset.idx);
            if (Number.isFinite(idx)) bestIdx = idx;
          }
        });
        if (bestIdx >= 0) setActive(bestIdx);
      },
      {
        root,
        // fire as cards cross the middle of the viewport
        threshold: [0.5, 0.7, 0.9],
      },
    );
    panels.forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, []);

  const scrollToCard = (idx: number) => {
    const root = scrollerRef.current;
    if (!root) return;
    const panel = root.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      aria-label="Shop by category"
      style={{
        position: 'relative',
        width: '100%',
        // The deck is one screen tall — visitors scroll *inside* it
        // through the cards, then the page continues below.
      }}
    >
      <style>{`
        .heDeck-scroller {
          height: 100svh;
          overflow-y: scroll;
          overflow-x: hidden;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          /* Hide the scrollbar — the side index is the indicator instead. */
          scrollbar-width: none;
          -ms-overflow-style: none;
          /* Keep momentum scrolling on touch devices smooth. */
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }
        .heDeck-scroller::-webkit-scrollbar { display: none; }

        .heDeck-card {
          height: 100svh;
          width: 100%;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          position: relative;
          display: grid;
          place-items: center;
          padding: clamp(2rem, 6vw, 4rem) var(--pad-x);
          overflow: hidden;
        }

        /* The contents lift in as the card enters the viewport — the
           IntersectionObserver toggles data-active on the panel. */
        .heDeck-content {
          opacity: 0;
          transform: translateY(28px);
          transition:
            opacity 700ms var(--ease-out),
            transform 900ms var(--ease-out);
          transition-delay: 60ms;
          will-change: opacity, transform;
        }
        .heDeck-card[data-active='true'] .heDeck-content {
          opacity: 1;
          transform: translateY(0);
        }

        /* Index rail — desktop right side, mobile bottom. */
        .heDeck-rail {
          position: absolute;
          right: clamp(0.75rem, 2.5vw, 1.75rem);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          z-index: 4;
        }
        .heDeck-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 1px solid var(--line-strong);
          background: transparent;
          padding: 0;
          cursor: pointer;
          transition: background 280ms var(--ease-out), transform 280ms var(--ease-out);
        }
        .heDeck-dot[data-on='true'] {
          background: var(--gold);
          transform: scale(1.25);
        }

        @media (max-width: 720px) {
          .heDeck-rail {
            top: auto;
            bottom: clamp(1rem, 4vh, 2rem);
            right: 50%;
            transform: translateX(50%);
            flex-direction: row;
          }
        }
      `}</style>

      <div ref={scrollerRef} className="heDeck-scroller">
        {cards.map((c, i) => (
          <article
            key={c.slug}
            data-card
            data-idx={i}
            data-active={active === i}
            className="heDeck-card"
            style={{ background: c.tone }}
          >
            <div
              className="heDeck-content"
              style={{
                maxWidth: 820,
                textAlign: 'center',
                position: 'relative',
                zIndex: 2,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.72rem',
                  letterSpacing: '0.32em',
                  textTransform: 'uppercase',
                  color: c.accent,
                  marginBottom: '1rem',
                }}
              >
                {String(i + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
                {'  ·  '}
                {c.caption}
              </span>
              <h2
                style={{
                  fontStyle: 'italic',
                  fontSize: 'clamp(2.8rem, 11vw, 6.5rem)',
                  margin: 0,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {c.label}
              </h2>
              <p
                style={{
                  color: 'var(--ink-soft)',
                  fontSize: 'clamp(1rem, 2.4vw, 1.2rem)',
                  margin: '1.5rem auto 2.25rem',
                  maxWidth: 560,
                }}
              >
                {c.copy}
              </p>
              <Link
                href={`/shop?cat=${c.slug}`}
                data-hover
                style={{
                  display: 'inline-block',
                  padding: 'clamp(0.8rem, 2vw, 0.95rem) clamp(1.4rem, 4vw, 2rem)',
                  border: `1px solid ${c.accent}`,
                  color: 'var(--ink)',
                  borderRadius: 999,
                  fontSize: 'clamp(0.74rem, 2vw, 0.82rem)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  transition:
                    'background 280ms var(--ease-out), color 280ms var(--ease-out)',
                }}
              >
                Browse {c.label.toLowerCase()}
              </Link>
            </div>

            {/* faint edge vignette so each card reads as its own room */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse 90% 60% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
                pointerEvents: 'none',
              }}
            />
          </article>
        ))}

        {/* Side / bottom index — also clickable to jump between cards. */}
        <nav
          className="heDeck-rail"
          aria-label="Category index"
        >
          {cards.map((c, i) => (
            <button
              key={c.slug}
              type="button"
              className="heDeck-dot"
              data-on={active === i}
              aria-label={`Go to ${c.label}`}
              onClick={() => scrollToCard(i)}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}
