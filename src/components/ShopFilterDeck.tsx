'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  formatINR,
  type Collection,
  type SubCollection,
  type Product,
  type CollectionSlug,
} from '@/lib/products';

// Price sort options shown inside an expanded collection.
type SortMode = 'featured' | 'price-asc' | 'price-desc';
const SORTS: { value: SortMode; label: string }[] = [
  { value: 'featured', label: 'All' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

/**
 * Full-screen collection deck for the shop.
 *
 * The shop landing is just the two top-level collections — Home Decor and
 * Home & Garden — each a full-bleed photo card filling the viewport. The
 * cards are swiped vertically (up→down / down→up) one screen at a time,
 * with the same Resn-style parallax the home deck uses (background drifts
 * slower than the foreground).
 *
 * Tapping a collection card *expands it in place*: the photo card grows to
 * fill the screen and its products fade up as a grid of cards underneath
 * the title — no route change. Tapping "Close" (or the title again) sends
 * it back to the swipe deck.
 *
 * No category/sub-collection dropdown and no per-category product page:
 * the only two things shown at the top level are the collections; the
 * products live one tap inside each.
 */

type Group = { collection: Collection; children: SubCollection[] };

type Props = {
  groups: Group[];
  products: Product[];
};

export default function ShopCollectionDeck({ groups, products }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openSlug, setOpenSlug] = useState<CollectionSlug | null>(null);
  const [active, setActive] = useState(0);
  const [sort, setSort] = useState<SortMode>('featured');

  // Which sub-collection slugs belong to each collection — used to pick the
  // products shown inside an expanded card.
  const childSlugsByCollection = new Map<CollectionSlug, Set<string>>(
    groups.map((g) => [
      g.collection.slug,
      new Set(g.children.map((c) => c.slug)),
    ]),
  );

  const productsFor = (slug: CollectionSlug) => {
    const slugs = childSlugsByCollection.get(slug);
    const items = slugs ? products.filter((p) => slugs.has(p.category)) : [];
    // Apply the active price sort. 'featured' keeps the authored order.
    if (sort === 'price-asc') return [...items].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...items].sort((a, b) => b.price - a.price);
    return items;
  };

  // Reset the sort back to "All" whenever a different collection is opened,
  // so each collection starts from its featured order.
  useEffect(() => {
    setSort('featured');
  }, [openSlug]);

  // Parallax + active-panel tracking — one rAF loop reading each panel's
  // offset from viewport centre, so it rides on top of Lenis. Paused while
  // a card is expanded (the deck isn't scrolling then).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || openSlug) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>('[data-panel]'),
    );
    const bgs = sections.map((s) => s.querySelector<HTMLElement>('[data-bg]'));
    const contents = sections.map((s) =>
      s.querySelector<HTMLElement>('[data-content]'),
    );

    let raf = 0;
    let lastActive = -1;

    const update = () => {
      const vh = window.innerHeight;
      const mid = vh / 2;
      let bestIdx = 0;
      let bestDist = Infinity;

      sections.forEach((section, i) => {
        const rect = section.getBoundingClientRect();
        const sectionMid = rect.top + rect.height / 2;
        const phase = (sectionMid - mid) / vh; // -1 above, 0 centre, +1 below

        const dist = Math.abs(phase);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }

        if (reduce) return;

        const bg = bgs[i];
        if (bg) {
          const drift = phase * vh * 0.16;
          bg.style.transform = `translate3d(0, ${(-drift).toFixed(2)}px, 0) scale(1.12)`;
        }
        const content = contents[i];
        if (content) {
          const lift = phase * vh * 0.06;
          const visible = 1 - Math.min(1, Math.abs(phase) / 0.8);
          content.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0)`;
          content.style.opacity = String(Math.max(0, visible));
        }
      });

      if (bestIdx !== lastActive) {
        lastActive = bestIdx;
        setActive(bestIdx);
      }
      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [openSlug, groups.length]);

  // Lock page scroll + close on Escape while a card is expanded.
  useEffect(() => {
    document.body.style.overflow = openSlug ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenSlug(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [openSlug]);

  const scrollToPanel = (idx: number) => {
    const panel = rootRef.current?.querySelector<HTMLElement>(
      `[data-idx="${idx}"]`,
    );
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={rootRef} aria-label="Shop collections" className="heShop">
      <style>{`
        .heShop { position: relative; width: 100%; }

        /* ============ FULL-SCREEN COLLECTION PANEL ============ */
        .heShop-panel {
          position: relative;
          height: 100svh;
          width: 100%;
          overflow: hidden;
          display: grid;
          place-items: center;
          cursor: pointer;
        }
        .heShop-bg {
          position: absolute;
          inset: -14% 0;
          height: 128%;
          width: 100%;
          background-size: cover;
          background-position: center;
          will-change: transform;
          z-index: 0;
        }
        .heShop-panel::after {
          content: '';
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 95% 70% at 50% 50%, transparent 45%, rgba(0,0,0,0.62) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.35), transparent 28%, transparent 64%, rgba(0,0,0,0.55));
        }

        .heShop-content {
          position: relative; z-index: 2;
          max-width: 820px; text-align: center;
          padding: clamp(2rem, 6vw, 4rem) var(--pad-x);
          will-change: transform, opacity;
          pointer-events: none;
        }
        .heShop-kicker {
          display: inline-block;
          font-size: 0.72rem; letter-spacing: 0.36em; text-transform: uppercase;
          color: var(--ink-soft); margin-bottom: 0.9rem;
        }
        .heShop-index { color: var(--gold); }
        .heShop-title {
          font-style: italic; margin: 0;
          font-size: clamp(2.8rem, 11vw, 6.5rem);
          line-height: 0.98; letter-spacing: -0.02em;
        }
        .heShop-copy {
          color: var(--ink-soft); margin: 1.3rem auto 1.9rem; max-width: 540px;
          font-size: clamp(1rem, 2.4vw, 1.2rem);
        }
        .heShop-open {
          display: inline-block; pointer-events: auto;
          padding: clamp(0.8rem, 2vw, 0.95rem) clamp(1.5rem, 4vw, 2.1rem);
          border: 1px solid var(--line-strong); color: var(--ink);
          border-radius: 999px;
          font-size: clamp(0.74rem, 2vw, 0.82rem);
          letter-spacing: 0.2em; text-transform: uppercase;
          background: rgba(0,0,0,0.18);
          transition: background 280ms var(--ease-out), border-color 280ms var(--ease-out);
        }
        .heShop-open:hover { background: rgba(212,181,116,0.16); border-color: var(--gold); }

        /* ============ INDEX RAIL ============ */
        .heShop-rail {
          position: fixed; right: clamp(0.75rem, 2.5vw, 1.75rem);
          top: 50%; transform: translateY(-50%);
          display: flex; flex-direction: column; gap: 0.8rem;
          z-index: 40;
        }
        .heShop-dot {
          width: 8px; height: 8px; border-radius: 50%;
          border: 1px solid var(--line-strong); background: transparent;
          padding: 0; cursor: pointer;
          transition: background 280ms var(--ease-out), transform 280ms var(--ease-out);
        }
        .heShop-dot[data-on='true'] { background: var(--gold); transform: scale(1.3); }
        @media (max-width: 720px) {
          .heShop-rail {
            top: auto; bottom: clamp(1rem, 4vh, 2rem);
            right: 50%; transform: translateX(50%); flex-direction: row;
          }
        }

        /* ============ EXPANDED OVERLAY (products) ============ */
        .heShop-overlay {
          position: fixed; inset: 0; z-index: 90;
          overflow-y: auto; -webkit-overflow-scrolling: touch;
          opacity: 0; visibility: hidden;
          transition: opacity 460ms var(--ease-out), visibility 0s linear 460ms;
        }
        .heShop-overlay[data-open='true'] {
          opacity: 1; visibility: visible;
          transition: opacity 460ms var(--ease-out), visibility 0s linear 0s;
        }
        .heShop-overlayBg {
          position: fixed; inset: 0; z-index: 0;
          background-size: cover; background-position: center;
          transform: scale(1.06);
        }
        .heShop-overlayBg::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(8,8,8,0.78), rgba(8,8,8,0.92) 40%, #080808 78%);
        }
        .heShop-overlayInner {
          position: relative; z-index: 1;
          min-height: 100svh;
          padding: clamp(6rem, 14vh, 9rem) var(--pad-x) clamp(4rem, 10vh, 7rem);
        }
        .heShop-overlayHead {
          text-align: center; margin-bottom: clamp(2.5rem, 6vh, 4rem);
        }
        .heShop-overlayTitle {
          font-style: italic; margin: 0.4rem 0 0;
          font-size: clamp(2.4rem, 9vw, 5rem);
          line-height: 1; letter-spacing: -0.02em;
        }
        .heShop-back {
          position: fixed; top: clamp(1.1rem, 3vh, 1.6rem);
          left: 50%; transform: translateX(-50%);
          z-index: 5;
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(0,0,0,0.3); border: 1px solid var(--line-strong);
          color: var(--ink); border-radius: 999px;
          padding: 0.6rem 1.2rem; cursor: pointer;
          font-size: 0.74rem; letter-spacing: 0.2em; text-transform: uppercase;
          transition: background 240ms var(--ease-out), border-color 240ms var(--ease-out);
        }
        .heShop-back:hover { background: rgba(212,181,116,0.16); border-color: var(--gold); }

        /* products grid inside the expanded card */
        .heShop-grid {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem);
          max-width: 1100px; margin: 0 auto;
        }
        @media (max-width: 980px) { .heShop-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 620px) { .heShop-grid { grid-template-columns: 1fr; } }

        .heShop-card { display: block; opacity: 0; transform: translateY(22px); }
        .heShop-overlay[data-open='true'] .heShop-card {
          opacity: 1; transform: translateY(0);
          transition: opacity 520ms var(--ease-out), transform 600ms var(--ease-out);
        }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(1) { transition-delay: 120ms; }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(2) { transition-delay: 180ms; }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(3) { transition-delay: 240ms; }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(4) { transition-delay: 300ms; }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(5) { transition-delay: 360ms; }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(6) { transition-delay: 420ms; }
        .heShop-overlay[data-open='true'] .heShop-card:nth-child(n+7) { transition-delay: 480ms; }

        .heShop-cardImg {
          aspect-ratio: 4 / 5; border-radius: 6px;
          position: relative; overflow: hidden;
          transition: transform 600ms var(--ease-out);
        }
        .heShop-card:hover .heShop-cardImg { transform: translateY(-4px); }
        .heShop-cardPhoto {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; display: block;
          transition: transform 900ms var(--ease-out);
        }
        .heShop-card:hover .heShop-cardPhoto { transform: scale(1.05); }

        /* ============ PRICE FILTER BAR ============ */
        .heShop-filter {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 0.5rem clamp(0.5rem, 1.5vw, 0.9rem);
          margin: 0 auto clamp(2.5rem, 6vh, 3.5rem);
        }
        .heShop-filterBtn {
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--line-strong);
          color: var(--ink-soft);
          border-radius: 999px;
          padding: 0.55rem 1.1rem;
          cursor: pointer;
          font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
          transition: color 240ms var(--ease-out), border-color 240ms var(--ease-out),
            background 240ms var(--ease-out);
        }
        .heShop-filterBtn:hover { color: var(--ink); border-color: var(--gold); }
        .heShop-filterBtn[data-on='true'] {
          color: #0e0e0e; background: var(--gold); border-color: var(--gold);
        }
        .heShop-cardMeta { margin-top: 1rem; text-align: center; }
        .heShop-cardTitle {
          font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--ink); margin: 0;
        }
        .heShop-cardSub { margin-top: 0.4rem; font-size: 0.9rem; color: var(--ink-soft); }
        .heShop-cardPrice { margin-top: 0.3rem; font-size: 0.86rem; color: var(--gold); }

        .heShop-empty {
          text-align: center; color: var(--ink-soft);
          letter-spacing: 0.18em; text-transform: uppercase; font-size: 0.95rem;
          padding: clamp(2rem, 6vh, 4rem) 0;
        }
      `}</style>

      {/* ============ COLLECTION SWIPE DECK ============ */}
      {groups.map((g, i) => (
        <article
          key={g.collection.slug}
          data-panel
          data-idx={i}
          className="heShop-panel"
          onClick={() => setOpenSlug(g.collection.slug)}
        >
          <div
            data-bg
            className="heShop-bg"
            style={{ backgroundImage: `url(${g.collection.image})` }}
          />
          <div data-content className="heShop-content">
            <span className="heShop-kicker">
              <span className="heShop-index">
                {String(i + 1).padStart(2, '0')} /{' '}
                {String(groups.length).padStart(2, '0')}
              </span>
              {'  ·  '}Collection
            </span>
            <h2 className="heShop-title">{g.collection.label}</h2>
            <p className="heShop-copy">{g.collection.copy}</p>
            <span className="heShop-open">View collection</span>
          </div>
        </article>
      ))}

      {/* Index rail */}
      <nav className="heShop-rail" aria-label="Collection index">
        {groups.map((g, i) => (
          <button
            key={g.collection.slug}
            type="button"
            className="heShop-dot"
            data-on={active === i && !openSlug}
            aria-label={`Go to ${g.collection.label}`}
            onClick={() => scrollToPanel(i)}
          />
        ))}
      </nav>

      {/* ============ EXPANDED PRODUCT OVERLAYS ============ */}
      {groups.map((g) => {
        const items = productsFor(g.collection.slug);
        const isOpen = openSlug === g.collection.slug;
        return (
          <div
            key={`ov-${g.collection.slug}`}
            className="heShop-overlay"
            data-open={isOpen}
            aria-hidden={!isOpen}
          >
            <div
              className="heShop-overlayBg"
              style={{ backgroundImage: `url(${g.collection.image})` }}
            />
            <button
              type="button"
              className="heShop-back"
              onClick={() => setOpenSlug(null)}
            >
              ← Collections
            </button>

            <div className="heShop-overlayInner">
              <div className="heShop-overlayHead">
                <span className="heShop-kicker">
                  <span className="heShop-index">Collection</span>
                </span>
                <h2 className="heShop-overlayTitle">{g.collection.label}</h2>
              </div>

              {/* Price filter — All / Low→High / High→Low.
                  Only rendered for the open collection so its buttons
                  don't steal focus while hidden. */}
              {isOpen && items.length > 0 && (
                <div className="heShop-filter" role="group" aria-label="Sort by price">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      className="heShop-filterBtn"
                      data-on={sort === s.value}
                      onClick={() => setSort(s.value)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {items.length === 0 ? (
                <div className="heShop-empty">No pieces in this collection yet.</div>
              ) : (
                <div className="heShop-grid">
                  {items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/shop/${p.id}`}
                      data-hover
                      className="heShop-card"
                    >
                      <div
                        className="heShop-cardImg"
                        style={{ backgroundColor: p.tone }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          className="heShop-cardPhoto"
                        />
                      </div>
                      <div className="heShop-cardMeta">
                        <p className="heShop-cardTitle">{p.name}</p>
                        <p className="heShop-cardSub">{p.maker}</p>
                        <p className="heShop-cardPrice">{formatINR(p.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
