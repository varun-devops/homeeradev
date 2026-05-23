'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Category, Product } from '@/lib/products';

/**
 * Resn-style filter deck for the shop page.
 *
 * Two stacked layers:
 *  • Header layer — a "FILTER" eyebrow, a giant headline with the
 *    active category name + chevron, and a top-right "Close All
 *    Projects" hint. Clicking the headline (or chevron) toggles a
 *    full-page dropdown listing every other category in muted
 *    display type; hover an item to preview, click to navigate.
 *  • Card layer — full-bleed product cards laid out in a 2-column
 *    grid (1 on mobile), each card a large image area + title +
 *    maker. Side arrows step the viewport up/down through the rows.
 *
 * The dropdown animates with a smooth max-height + opacity reveal;
 * the body's content slides + dims while the dropdown is open so it
 * reads as a takeover panel — the behaviour shown in the reference.
 */

type CategoryEntry = {
  slug: Category;
  label: string;
  copy: string;
};

type Props = {
  active: Category | null;
  categories: CategoryEntry[];
  products: Product[];
};

const ACTIVE_LABEL_ALL = 'All Projects';

export default function ShopFilterDeck({
  active,
  categories,
  products,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<Category | 'all' | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const activeLabel = active
    ? categories.find((c) => c.slug === active)?.label ?? ACTIVE_LABEL_ALL
    : ACTIVE_LABEL_ALL;

  // The dropdown lists every category that is *not* currently active.
  // The active one is already in the heading, so hiding it from the
  // list keeps the takeover panel uncluttered (mirrors the reference).
  const otherCategories = categories.filter((c) => c.slug !== active);
  const showAllInDropdown = active !== null;

  // Close on Escape, lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goTo = (href: string) => {
    setOpen(false);
    // small delay so the close animation runs before the route swaps
    window.setTimeout(() => router.push(href), 160);
  };

  // Side arrows — scroll one card row at a time. We measure the first
  // card so the step size matches the actual rendered row height.
  const stepBy = (dir: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstCard = scroller.querySelector<HTMLElement>('[data-card-row]');
    const step = firstCard
      ? firstCard.getBoundingClientRect().height + 32
      : window.innerHeight * 0.6;
    scroller.scrollBy({ top: dir * step, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative', minHeight: '100svh' }}>
      <style>{`
        /* ============================================================
           HEADER LAYER — filter eyebrow, big headline, top-right hint
           ============================================================ */
        .heShop-head {
          position: relative;
          padding: clamp(6rem, 12vh, 9rem) var(--pad-x) clamp(1.5rem, 4vh, 2.5rem);
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: start;
          gap: clamp(1rem, 4vw, 3rem);
          z-index: 30;
        }
        .heShop-eyebrow {
          font-size: 0.74rem;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 0.6rem;
        }
        .heShop-headline {
          /* The headline doubles as the dropdown toggle — large,
             clickable, with a chevron that rotates when open. */
          display: inline-flex;
          align-items: center;
          gap: clamp(0.75rem, 2vw, 1.5rem);
          padding: 0;
          margin: 0;
          background: transparent;
          border: none;
          color: var(--ink);
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(2.5rem, 9vw, 6rem);
          line-height: 0.95;
          letter-spacing: -0.02em;
          cursor: pointer;
          text-align: left;
        }
        .heShop-chevron {
          width: clamp(1.6rem, 3.5vw, 2.4rem);
          height: clamp(1.6rem, 3.5vw, 2.4rem);
          transition: transform 360ms var(--ease-out);
        }
        .heShop-headline[aria-expanded='true'] .heShop-chevron {
          transform: rotate(180deg);
        }
        .heShop-close {
          font-size: 0.82rem;
          letter-spacing: 0.16em;
          text-transform: capitalize;
          color: var(--ink);
          align-self: end;
          padding-bottom: 0.5rem;
          opacity: 0;
          pointer-events: none;
          transition: opacity 240ms var(--ease-out);
        }
        .heShop-close[data-on='true'] {
          opacity: 1;
          pointer-events: auto;
        }

        /* ============================================================
           DROPDOWN PANEL — full-width takeover under the headline
           ============================================================ */
        .heShop-dropdown {
          position: relative;
          z-index: 25;
          padding: 0 var(--pad-x);
          /* Collapsed by default — animated on toggle. */
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition:
            max-height 520ms cubic-bezier(0.83, 0, 0.17, 1),
            opacity 320ms var(--ease-out);
        }
        .heShop-dropdown[data-open='true'] {
          /* A generous ceiling so any number of categories fits.
             The true stopping point is the content's natural height,
             so the transition reads as a smooth open regardless. */
          max-height: 80svh;
          opacity: 1;
        }
        .heShop-list {
          list-style: none;
          margin: 0;
          padding: 0 0 clamp(2rem, 6vh, 4rem);
          display: grid;
          gap: clamp(0.25rem, 1vw, 0.75rem);
        }
        .heShop-listItem {
          display: block;
          width: max-content;
          color: var(--ink-mute);
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(2rem, 7vw, 5rem);
          line-height: 1.05;
          letter-spacing: -0.01em;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 0.25rem 0;
          text-align: left;
          transform: translateY(18px);
          opacity: 0;
          transition:
            color 240ms var(--ease-out),
            transform 480ms var(--ease-out),
            opacity 320ms var(--ease-out);
        }
        .heShop-listItem:hover,
        .heShop-listItem:focus-visible {
          color: var(--ink);
        }
        /* Stagger each list item in once the dropdown opens. */
        .heShop-dropdown[data-open='true'] .heShop-listItem {
          transform: translateY(0);
          opacity: 1;
        }
        .heShop-dropdown[data-open='true'] .heShop-listItem:nth-child(1) { transition-delay: 80ms; }
        .heShop-dropdown[data-open='true'] .heShop-listItem:nth-child(2) { transition-delay: 140ms; }
        .heShop-dropdown[data-open='true'] .heShop-listItem:nth-child(3) { transition-delay: 200ms; }
        .heShop-dropdown[data-open='true'] .heShop-listItem:nth-child(4) { transition-delay: 260ms; }
        .heShop-dropdown[data-open='true'] .heShop-listItem:nth-child(5) { transition-delay: 320ms; }

        /* Backdrop — dims the cards underneath while the dropdown is
           open so the takeover reads cleanly. Click anywhere on it
           to close, like a real overlay panel. */
        .heShop-scrim {
          position: fixed;
          inset: 0;
          z-index: 20;
          background: rgba(5, 5, 5, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 320ms var(--ease-out);
        }
        .heShop-scrim[data-on='true'] {
          opacity: 1;
          pointer-events: auto;
        }

        /* ============================================================
           CARD DECK — full-bleed scroller with side arrows
           ============================================================ */
        .heShop-deck {
          position: relative;
          padding: 0 var(--pad-x) clamp(4rem, 10vh, 7rem);
        }
        .heShop-scroller {
          /* The deck doesn't enforce its own height — it grows with
             content and uses the page's normal scroll. The side arrows
             call scrollBy on the *page* container, which is the body. */
        }
        .heShop-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem);
        }
        @media (max-width: 720px) {
          .heShop-grid { grid-template-columns: 1fr; }
        }

        .heShop-card { display: block; }
        .heShop-cardImg {
          aspect-ratio: 16 / 10;
          border-radius: 6px;
          position: relative;
          overflow: hidden;
          transition: transform 600ms var(--ease-out);
        }
        .heShop-card:hover .heShop-cardImg {
          transform: translateY(-4px);
        }
        .heShop-cardMeta {
          margin-top: 1.25rem;
          text-align: center;
        }
        .heShop-cardTitle {
          font-size: 0.84rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink);
          margin: 0;
        }
        .heShop-cardSub {
          margin-top: 0.5rem;
          font-size: 0.92rem;
          color: var(--ink-soft);
        }

        /* Side step arrows — fixed at vertical centre, hidden on small
           screens (touch users scroll normally). */
        .heShop-arrow {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          z-index: 60;
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--ink);
          opacity: 0.7;
          transition: opacity 240ms var(--ease-out);
        }
        .heShop-arrow:hover { opacity: 1; }
        .heShop-arrow[data-side='left']  { left:  clamp(0.5rem, 1.2vw, 1.25rem); }
        .heShop-arrow[data-side='right'] { right: clamp(0.5rem, 1.2vw, 1.25rem); }
        @media (max-width: 860px) {
          .heShop-arrow { display: none; }
        }

        /* Empty state */
        .heShop-empty {
          padding: clamp(2rem, 6vh, 4rem) 0;
          text-align: center;
          color: var(--ink-soft);
          font-size: 0.95rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
      `}</style>

      {/* ============ HEADER ============ */}
      <div className="heShop-head">
        <div>
          <p className="heShop-eyebrow">Filter</p>
          <button
            type="button"
            className="heShop-headline"
            aria-expanded={open}
            aria-controls="heShop-dropdown"
            data-hover
            onClick={() => setOpen((v) => !v)}
          >
            <span>{activeLabel}</span>
            <Chevron className="heShop-chevron" />
          </button>
        </div>

        <button
          type="button"
          className="heShop-close"
          data-on={open}
          data-hover
          onClick={() => setOpen(false)}
        >
          Close {activeLabel}
        </button>
      </div>

      {/* ============ DROPDOWN ============ */}
      <div
        id="heShop-dropdown"
        className="heShop-dropdown"
        data-open={open}
        aria-hidden={!open}
      >
        <ul className="heShop-list" role="menu">
          {showAllInDropdown && (
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="heShop-listItem"
                data-hover
                onMouseEnter={() => setHoveredSlug('all')}
                onMouseLeave={() => setHoveredSlug(null)}
                onClick={() => goTo('/shop')}
                style={hoveredSlug === 'all' ? { color: 'var(--ink)' } : undefined}
              >
                {ACTIVE_LABEL_ALL}
              </button>
            </li>
          )}
          {otherCategories.map((c) => (
            <li key={c.slug} role="none">
              <button
                type="button"
                role="menuitem"
                className="heShop-listItem"
                data-hover
                onMouseEnter={() => setHoveredSlug(c.slug)}
                onMouseLeave={() => setHoveredSlug(null)}
                onClick={() => goTo(`/shop?cat=${c.slug}`)}
                style={hoveredSlug === c.slug ? { color: 'var(--ink)' } : undefined}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Backdrop — only catches clicks while the dropdown is open. */}
      <div
        className="heShop-scrim"
        data-on={open}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* ============ CARD DECK ============ */}
      <div className="heShop-deck" ref={scrollerRef}>
        {products.length === 0 ? (
          <div className="heShop-empty">No pieces in this category yet.</div>
        ) : (
          <div className="heShop-grid">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/shop/${p.id}`}
                data-hover
                data-card-row
                className="heShop-card"
              >
                <div
                  className="heShop-cardImg"
                  style={{
                    background: `linear-gradient(140deg, ${p.tone} 0%, rgba(20,20,20,0.4) 100%)`,
                  }}
                />
                <div className="heShop-cardMeta">
                  <p className="heShop-cardTitle">{p.name}</p>
                  <p className="heShop-cardSub">{p.maker}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Side step arrows — keyboard-callable via aria-label */}
      <button
        type="button"
        className="heShop-arrow"
        data-side="left"
        aria-label="Previous row"
        onClick={() => stepBy(-1)}
      >
        <ArrowUp />
      </button>
      <button
        type="button"
        className="heShop-arrow"
        data-side="right"
        aria-label="Next row"
        onClick={() => stepBy(1)}
      >
        <ArrowDown />
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Inline icons — kept here so the component is fully self-contained.
// ──────────────────────────────────────────────────────────────────

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowUp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}
