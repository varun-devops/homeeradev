'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { Category, Product, Collection, SubCollection } from '@/lib/products';

/**
 * Resn-style filter deck for the shop page, now driven by the two-tier
 * collection model.
 *
 * Layers:
 *  • Header — a "COLLECTION" eyebrow, a giant headline showing the active
 *    sub-collection (or "All Pieces") with a chevron, and a top-right
 *    "Close" hint. Clicking the headline opens a full-page dropdown that
 *    lists every collection grouped under its parent (HOME DECOR /
 *    HOME & GARDEN) in muted display type.
 *  • Card deck — full-bleed product cards in a 2-up grid (1-up on mobile).
 *
 * Selecting a collection performs a smooth full-screen *card swipe*: a
 * panel sweeps across the viewport, the route swaps behind it, then it
 * sweeps off — so changing collection reads as one fluid swipe rather
 * than a hard reload. (This is separate from the site-wide curtain, which
 * only intercepts ordinary link clicks; the dropdown navigates
 * programmatically, so it owns its own swipe here.)
 */

type Props = {
  active: Category | null;
  categories: { slug: Category; label: string; copy: string }[];
  groups: { collection: Collection; children: SubCollection[] }[];
  products: Product[];
};

const ACTIVE_LABEL_ALL = 'All Pieces';

export default function ShopFilterDeck({
  active,
  categories,
  groups,
  products,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<Category | 'all' | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef<HTMLDivElement>(null);
  const swiping = useRef(false);

  const activeLabel = active
    ? categories.find((c) => c.slug === active)?.label ?? ACTIVE_LABEL_ALL
    : ACTIVE_LABEL_ALL;

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

  /**
   * Smooth full-screen card swipe → navigate → swipe away.
   *
   * The panel starts off the right edge, sweeps left to cover the screen,
   * the route is pushed behind it, then it continues off the left edge
   * revealing the freshly-filtered grid. Reduced-motion users just get a
   * plain navigation.
   */
  const swipeTo = (href: string) => {
    setOpen(false);
    const panel = swipeRef.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!panel || reduce) {
      router.push(href);
      return;
    }
    if (swiping.current) return;
    swiping.current = true;

    gsap.killTweensOf(panel);
    gsap.set(panel, {
      display: 'block',
      xPercent: 100,
      clipPath: 'inset(0% 0% 0% 0%)',
    });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(panel, { display: 'none' });
        swiping.current = false;
      },
    });
    // sweep in to cover
    tl.to(panel, {
      xPercent: 0,
      duration: 0.42,
      ease: 'power3.inOut',
    });
    // swap the route while the screen is covered, reset scroll
    tl.add(() => {
      router.push(href);
      window.scrollTo(0, 0);
    });
    // hold a beat so the new grid is painted underneath, then sweep off
    tl.to(panel, {
      xPercent: -100,
      duration: 0.5,
      ease: 'power3.inOut',
    }, '+=0.08');
  };

  // Side arrows — scroll one card row at a time.
  const stepBy = (dir: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstCard = scroller.querySelector<HTMLElement>('[data-card-row]');
    const step = firstCard
      ? firstCard.getBoundingClientRect().height + 32
      : window.innerHeight * 0.6;
    window.scrollBy({ top: dir * step, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative', minHeight: '100svh' }}>
      <style>{`
        /* ============================================================
           HEADER LAYER
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
          display: inline-flex;
          align-items: center;
          gap: clamp(0.75rem, 2vw, 1.5rem);
          padding: 0; margin: 0;
          background: transparent; border: none;
          color: var(--ink);
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(2.5rem, 9vw, 6rem);
          line-height: 0.95;
          letter-spacing: -0.02em;
          cursor: pointer; text-align: left;
        }
        .heShop-chevron {
          width: clamp(1.6rem, 3.5vw, 2.4rem);
          height: clamp(1.6rem, 3.5vw, 2.4rem);
          transition: transform 360ms var(--ease-out);
        }
        .heShop-headline[aria-expanded='true'] .heShop-chevron { transform: rotate(180deg); }
        .heShop-close {
          font-size: 0.82rem;
          letter-spacing: 0.16em;
          text-transform: capitalize;
          color: var(--ink);
          align-self: end;
          padding-bottom: 0.5rem;
          opacity: 0; pointer-events: none;
          transition: opacity 240ms var(--ease-out);
        }
        .heShop-close[data-on='true'] { opacity: 1; pointer-events: auto; }

        /* ============================================================
           DROPDOWN PANEL — grouped by collection
           ============================================================ */
        .heShop-dropdown {
          position: relative;
          z-index: 25;
          padding: 0 var(--pad-x);
          max-height: 0; opacity: 0; overflow: hidden;
          transition:
            max-height 520ms cubic-bezier(0.83, 0, 0.17, 1),
            opacity 320ms var(--ease-out);
        }
        .heShop-dropdown[data-open='true'] { max-height: 88svh; opacity: 1; }
        .heShop-list { list-style: none; margin: 0; padding: 0 0 clamp(2rem, 6vh, 4rem); }

        .heShop-groupLabel {
          font-size: 0.72rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: var(--gold);
          margin: clamp(1.25rem, 3vw, 2rem) 0 0.5rem;
        }
        .heShop-groupLabel:first-child { margin-top: 0; }

        .heShop-listItem {
          display: block;
          width: max-content;
          color: var(--ink-mute);
          font-family: var(--font-display);
          font-weight: 400;
          font-size: clamp(1.7rem, 6vw, 4rem);
          line-height: 1.08;
          letter-spacing: -0.01em;
          cursor: pointer;
          background: transparent; border: none;
          padding: 0.1rem 0;
          text-align: left;
          transform: translateY(18px);
          opacity: 0;
          transition:
            color 240ms var(--ease-out),
            transform 480ms var(--ease-out),
            opacity 320ms var(--ease-out);
        }
        .heShop-listItem:hover, .heShop-listItem:focus-visible { color: var(--ink); }
        .heShop-dropdown[data-open='true'] .heShop-listItem,
        .heShop-dropdown[data-open='true'] .heShop-groupLabel {
          transform: translateY(0); opacity: 1;
        }
        /* Stagger items in (up to ~8 rows incl. group labels). */
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(1) { transition-delay: 70ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(2) { transition-delay: 120ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(3) { transition-delay: 170ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(4) { transition-delay: 220ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(5) { transition-delay: 270ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(6) { transition-delay: 320ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(7) { transition-delay: 370ms; }
        .heShop-dropdown[data-open='true'] .heShop-row:nth-child(8) { transition-delay: 420ms; }

        /* group labels share the lift-in too */
        .heShop-groupLabel { transform: translateY(18px); opacity: 0;
          transition: transform 480ms var(--ease-out), opacity 320ms var(--ease-out); }

        .heShop-scrim {
          position: fixed; inset: 0; z-index: 20;
          background: rgba(5, 5, 5, 0.72);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          opacity: 0; pointer-events: none;
          transition: opacity 320ms var(--ease-out);
        }
        .heShop-scrim[data-on='true'] { opacity: 1; pointer-events: auto; }

        /* ============================================================
           FULL-SCREEN SWIPE PANEL (collection change)
           ============================================================ */
        .heShop-swipe {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: none;
          background: linear-gradient(135deg, #161616 0%, #050505 100%);
          will-change: transform;
          pointer-events: none;
        }
        .heShop-swipe::after {
          /* champagne edge-glow on the leading edge of the swipe */
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(
            100deg,
            transparent 0%,
            rgba(212,181,116,0.10) 46%,
            rgba(212,181,116,0.30) 50%,
            transparent 54%);
        }
        .heShop-swipeMark {
          position: absolute; inset: 0;
          display: grid; place-items: center;
        }
        .heShop-swipeMark img {
          width: clamp(48px, 8vw, 84px); height: auto;
          filter: drop-shadow(0 0 24px rgba(212,181,116,0.35));
        }

        /* ============================================================
           CARD DECK
           ============================================================ */
        .heShop-deck { position: relative; padding: 0 var(--pad-x) clamp(4rem, 10vh, 7rem); }
        .heShop-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem);
        }
        @media (max-width: 720px) { .heShop-grid { grid-template-columns: 1fr; } }

        .heShop-card { display: block; }
        .heShop-cardImg {
          aspect-ratio: 16 / 10;
          border-radius: 6px;
          position: relative; overflow: hidden;
          transition: transform 600ms var(--ease-out);
        }
        .heShop-card:hover .heShop-cardImg { transform: translateY(-4px); }
        .heShop-cardMeta { margin-top: 1.25rem; text-align: center; }
        .heShop-cardTitle {
          font-size: 0.84rem; letter-spacing: 0.22em; text-transform: uppercase;
          color: var(--ink); margin: 0;
        }
        .heShop-cardSub { margin-top: 0.5rem; font-size: 0.92rem; color: var(--ink-soft); }

        .heShop-arrow {
          position: fixed; top: 50%; transform: translateY(-50%);
          z-index: 60; width: 44px; height: 44px;
          display: grid; place-items: center;
          background: transparent; border: none; cursor: pointer;
          color: var(--ink); opacity: 0.7;
          transition: opacity 240ms var(--ease-out);
        }
        .heShop-arrow:hover { opacity: 1; }
        .heShop-arrow[data-side='left']  { left:  clamp(0.5rem, 1.2vw, 1.25rem); }
        .heShop-arrow[data-side='right'] { right: clamp(0.5rem, 1.2vw, 1.25rem); }
        @media (max-width: 860px) { .heShop-arrow { display: none; } }

        .heShop-empty {
          padding: clamp(2rem, 6vh, 4rem) 0; text-align: center;
          color: var(--ink-soft); font-size: 0.95rem;
          letter-spacing: 0.18em; text-transform: uppercase;
        }
      `}</style>

      {/* ============ HEADER ============ */}
      <div className="heShop-head">
        <div>
          <p className="heShop-eyebrow">Collection</p>
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
          Close
        </button>
      </div>

      {/* ============ DROPDOWN (grouped) ============ */}
      <div
        id="heShop-dropdown"
        className="heShop-dropdown"
        data-open={open}
        aria-hidden={!open}
      >
        <ul className="heShop-list" role="menu">
          {/* "All Pieces" always available to reset the filter. */}
          <li className="heShop-row" role="none">
            <button
              type="button"
              role="menuitem"
              className="heShop-listItem"
              data-hover
              onMouseEnter={() => setHoveredSlug('all')}
              onMouseLeave={() => setHoveredSlug(null)}
              onClick={() => swipeTo('/shop')}
              style={hoveredSlug === 'all' || active === null ? { color: 'var(--ink)' } : undefined}
            >
              {ACTIVE_LABEL_ALL}
            </button>
          </li>

          {groups.map((g) => (
            <li key={g.collection.slug} role="none">
              <p className="heShop-groupLabel heShop-row">{g.collection.label}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.children.map((c) => (
                  <li key={c.slug} className="heShop-row" role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="heShop-listItem"
                      data-hover
                      onMouseEnter={() => setHoveredSlug(c.slug)}
                      onMouseLeave={() => setHoveredSlug(null)}
                      onClick={() => swipeTo(`/shop?cat=${c.slug}`)}
                      style={
                        hoveredSlug === c.slug || active === c.slug
                          ? { color: 'var(--ink)' }
                          : undefined
                      }
                    >
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      {/* Backdrop */}
      <div
        className="heShop-scrim"
        data-on={open}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* ============ FULL-SCREEN SWIPE PANEL ============ */}
      <div ref={swipeRef} className="heShop-swipe" aria-hidden="true">
        <div className="heShop-swipeMark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={84} height={84} />
        </div>
      </div>

      {/* ============ CARD DECK ============ */}
      <div className="heShop-deck" ref={scrollerRef}>
        {products.length === 0 ? (
          <div className="heShop-empty">No pieces in this collection yet.</div>
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

      {/* Side step arrows */}
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
// Inline icons
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
