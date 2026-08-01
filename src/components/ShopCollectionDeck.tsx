'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { formatINR } from '@/lib/format';
import SubCollectionDeck from '@/components/SubCollectionDeck';

export type LiteProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  effective_price: number;
  image_url: string | null;
  category_slug: string;
  sub_category: string;
  sub_category_slug: string;
  discount_percent: number;
  is_new: boolean;
};

export type SubCollection = {
  slug: string;
  label: string;
  image: string | null;
  count: number;
};

export type Collection = {
  slug: string;
  label: string;
  image: string | null;
  count: number;
  subCollections: SubCollection[];
};

type Props = {
  collections: Collection[];
  products: LiteProduct[];
};

/**
 * Page-fold between levels of the deck.
 *
 * Direction is mirrored so the motion tells you which way you are moving:
 *   going deeper (+1) folds in from the RIGHT, hinged on its right edge;
 *   going back  (−1) folds in from the LEFT, hinged on its left edge.
 * The outgoing panel always folds away toward the opposite side.
 *
 * `originX` is animated rather than set in CSS because the same element
 * needs one hinge on the way in and the other on the way out.
 */
const fold: Variants = {
  enter: (d: number) => ({
    opacity: 0,
    rotateY: d > 0 ? 62 : -62,
    originX: d > 0 ? 1 : 0,
    transformPerspective: 1700,
  }),
  center: (d: number) => ({
    opacity: 1,
    rotateY: 0,
    originX: d > 0 ? 1 : 0,
    transformPerspective: 1700,
    transition: {
      rotateY: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.3, ease: 'easeOut' },
    },
  }),
  exit: (d: number) => ({
    opacity: 0,
    rotateY: d > 0 ? -62 : 62,
    originX: d > 0 ? 0 : 1,
    transformPerspective: 1700,
    transition: {
      rotateY: { duration: 0.42, ease: [0.7, 0, 0.84, 0] },
      opacity: { duration: 0.28, ease: 'easeIn' },
    },
  }),
};

/**
 * Three-level shop browser, driven by the live catalogue.
 *
 *   1. DECK            — each collection is a full-bleed photo card filling
 *                        the viewport. Only its name is set over the photo;
 *                        the whole card is the control.
 *   2. SUB-COLLECTIONS — tapping a collection morphs its card to full screen
 *                        (Framer shared-element `layoutId`) and folds in the
 *                        sub-collections inside it.
 *   3. PRODUCTS        — tapping a sub-collection folds in its products.
 *
 * Levels 2 and 3 share one fixed overlay, so stepping between them is a
 * content swap rather than a route change and the background photo stays put.
 *
 * The only chrome is a back arrow, parked under the site logo. It has to sit
 * BELOW the header's box: the header is a full-width fixed bar at z-index
 * 100 and this overlay is at 90, so anything placed in the top ~74px is
 * covered by the header and cannot be clicked, however high its own z-index.
 */
export default function ShopCollectionDeck({ collections, products }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  const openCol = collections.find((c) => c.slug === openSlug) ?? null;
  const openSubCol = openCol?.subCollections.find((s) => s.slug === openSub) ?? null;

  const productsFor = (subSlug: string) =>
    products.filter((p) => p.sub_category_slug === subSlug);

  // ---- navigation ----------------------------------------------------
  const openCollection = (slug: string) => {
    setDir(1);
    setOpenSlug(slug);
  };
  const openSubCollection = (slug: string) => {
    setDir(1);
    setOpenSub(slug);
  };
  /** Step back one level: products → sub-collections → deck. */
  const back = () => {
    setDir(-1);
    if (openSub) setOpenSub(null);
    else setOpenSlug(null);
  };

  // Leaving a collection must also drop the sub-collection, or reopening the
  // collection would land straight back on the old product grid.
  useEffect(() => {
    if (!openSlug) setOpenSub(null);
  }, [openSlug]);

  // Parallax + active-panel tracking — paused while the overlay is up.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || openSlug) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-panel]'));
    const contents = sections.map((s) => s.querySelector<HTMLElement>('[data-content]'));

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
        const phase = (sectionMid - mid) / vh;
        const dist = Math.abs(phase);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
        if (reduce) return;
        const content = contents[i];
        if (content) {
          // Parallax lift only — opacity is owned by Framer Motion
          // (whileInView) so the two systems don't fight.
          const lift = phase * vh * 0.06;
          content.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0)`;
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
  }, [openSlug, reduce]);

  // Lock scroll + Escape steps back one level.
  useEffect(() => {
    document.body.style.overflow = openSlug ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setDir(-1);
      if (openSub) setOpenSub(null);
      else setOpenSlug(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [openSlug, openSub]);

  // Each new level starts at the top of the overlay.
  useEffect(() => {
    overlayRef.current?.scrollTo({ top: 0 });
  }, [openSub, openSlug]);

  const scrollToPanel = (idx: number) => {
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const items = openSubCol ? productsFor(openSubCol.slug) : [];

  return (
    <section ref={rootRef} aria-label="Shop collections" className="heShop">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* ============ LEVEL 1 — COLLECTION DECK ============ */}
      {collections.map((c, i) => (
        <article
          key={c.slug}
          data-panel
          data-idx={i}
          className="heShop-panel"
          role="button"
          tabIndex={0}
          aria-label={`Open ${c.label}`}
          onClick={() => openCollection(c.slug)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openCollection(c.slug);
            }
          }}
        >
          {/* Entrance "blast in" wrapper — runs once when the shop mounts,
              staggered per card. The RAF parallax doesn't touch this layer,
              so the two never fight. */}
          <motion.div
            className="heShop-bgWrap"
            initial={reduce ? false : { opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.05 + i * 0.12 }}
          >
            <motion.div
              layoutId={`card-bg-${c.slug}`}
              className="heShop-bg"
              style={c.image ? { backgroundImage: `url(${c.image})` } : { background: '#1a1916' }}
              animate={{ opacity: openSlug === c.slug ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
          <div className="heShop-scrim" aria-hidden="true" />
          <div data-content className="heShop-content">
            {/* Nothing but the collection name — the photo carries the rest. */}
            <motion.h2
              className="heShop-title"
              initial={reduce ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            >
              {c.label}
            </motion.h2>
          </div>
        </article>
      ))}

      {/* Index rail — only meaningful with more than one collection. */}
      {collections.length > 1 && (
        <nav className="heShop-rail" aria-label="Collection index">
          {collections.map((c, i) => (
            <button
              key={c.slug}
              type="button"
              className="heShop-dot"
              data-on={active === i && !openSlug}
              aria-label={`Go to ${c.label}`}
              onClick={() => scrollToPanel(i)}
            />
          ))}
        </nav>
      )}

      {/* ============ LEVELS 2 + 3 — FULL-SCREEN OVERLAY ============ */}
      <AnimatePresence>
        {openCol && (
          <motion.div
            key={`ov-${openCol.slug}`}
            ref={overlayRef}
            className="heShop-overlay"
            // The sub-collection deck owns the wheel and fills the viewport,
            // so the overlay must not scroll behind it. The product grid does
            // need to scroll.
            data-level={openSubCol ? 'items' : 'subs'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              layoutId={`card-bg-${openCol.slug}`}
              className="heShop-overlayBg"
              style={
                openCol.image
                  ? { backgroundImage: `url(${openCol.image})` }
                  : { background: '#1a1916' }
              }
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            />
            <div className="heShop-overlayTint" aria-hidden="true" />

            {/* The only chrome: a back arrow under the logo. */}
            <motion.button
              type="button"
              className="heShop-back"
              onClick={back}
              aria-label={openSubCol ? `Back to ${openCol.label}` : 'Back to collections'}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ delay: 0.15 }}
            >
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </motion.button>

            <div className="heShop-overlayInner">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                {/* ---------- LEVEL 2 — sub-collections ---------- */}
                {!openSubCol ? (
                  <motion.div
                    key="subs"
                    custom={dir}
                    variants={fold}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <SubCollectionDeck
                      collectionLabel={openCol.label}
                      subs={openCol.subCollections}
                      onOpen={openSubCollection}
                    />
                  </motion.div>
                ) : (
                  /* ---------- LEVEL 3 — products ---------- */
                  <motion.div
                    key={`items-${openSubCol.slug}`}
                    custom={dir}
                    variants={fold}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    {items.length === 0 ? (
                      <div className="heShop-empty">Nothing in this collection yet.</div>
                    ) : (
                      <div className="heShop-grid">
                        {items.map((p) => (
                          <Link key={p.id} href={`/shop/${p.slug}`} data-hover className="heShop-card">
                            <div className="heShop-cardImg">
                              {p.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={p.image_url}
                                  alt={p.name}
                                  loading="lazy"
                                  className="heShop-cardPhoto"
                                />
                              ) : (
                                <div className="heShop-cardPhoto heShop-cardNoimg" />
                              )}
                            </div>
                            <div className="heShop-cardMeta">
                              <p className="heShop-cardTitle">{p.name}</p>
                              <p className="heShop-cardPrice">{formatINR(p.effective_price)}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
const styles = `
  .heShop { position: relative; width: 100%; }
  .heShop-panel {
    position: relative; height: 100svh; width: 100%;
    overflow: hidden; display: grid; place-items: center; cursor: pointer;
  }
  .heShop-panel:focus-visible { outline: 2px solid var(--gold); outline-offset: -6px; }
  .heShop-bgWrap { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
  .heShop-bg {
    position: absolute; inset: 0; height: 100%; width: 100%;
    background-size: cover; background-position: center; z-index: 0;
  }
  .heShop-scrim {
    position: absolute; inset: 0; z-index: 1; pointer-events: none;
    background:
      radial-gradient(ellipse 95% 70% at 50% 50%, transparent 45%, rgba(0,0,0,0.62) 100%),
      linear-gradient(180deg, rgba(0,0,0,0.35), transparent 28%, transparent 64%, rgba(0,0,0,0.55));
  }
  .heShop-content {
    position: relative; z-index: 2; max-width: 820px; text-align: center;
    padding: clamp(2rem, 6vw, 4rem) var(--pad-x);
    will-change: transform; pointer-events: none;
  }
  .heShop-title {
    font-style: italic; margin: 0; font-size: clamp(2.8rem, 11vw, 6.5rem);
    line-height: 0.98; letter-spacing: -0.02em;
  }

  .heShop-rail {
    position: fixed; right: clamp(0.75rem, 2.5vw, 1.75rem); top: 50%;
    transform: translateY(-50%); display: flex; flex-direction: column; gap: 0.8rem; z-index: 40;
  }
  .heShop-dot {
    width: 8px; height: 8px; border-radius: 50%; border: 1px solid var(--line-strong);
    background: transparent; padding: 0; cursor: pointer;
    transition: background 280ms var(--ease-out), transform 280ms var(--ease-out);
  }
  .heShop-dot[data-on='true'] { background: var(--gold); transform: scale(1.3); }
  @media (max-width: 720px) {
    .heShop-rail { top: auto; bottom: clamp(1rem, 4vh, 2rem); right: 50%; transform: translateX(50%); flex-direction: row; }
  }

  .heShop-overlay { position: fixed; inset: 0; z-index: 90; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .heShop-overlay[data-level='subs'] { overflow: hidden; }
  .heShop-overlayBg { position: fixed; inset: 0; z-index: 0; background-size: cover; background-position: center; }
  .heShop-overlayTint {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background: linear-gradient(180deg, rgba(8,8,8,0.80), rgba(8,8,8,0.93) 42%, #080808 80%);
  }
  .heShop-overlayInner {
    position: relative; z-index: 2; min-height: 100svh;
    padding: clamp(7.5rem, 16vh, 10rem) var(--pad-x) clamp(4rem, 10vh, 7rem);
  }
  /* The sub-collection deck sizes itself to 100svh, so the inner wrapper
     only supplies the side gutter — vertical padding would push it past
     the fold and reintroduce a scrollbar. */
  .heShop-overlay[data-level='subs'] .heShop-overlayInner {
    min-height: 0;
    padding: 0 var(--pad-x);
  }

  /* Back arrow — parked under the logo, at the page gutter.
     top MUST clear the fixed header (~74px tall at z-index 100), which
     otherwise sits over this button and eats the click. */
  .heShop-back {
    position: fixed; top: 5.25rem; left: var(--pad-x); z-index: 95;
    width: 44px; height: 44px; display: grid; place-items: center;
    background: rgba(0,0,0,0.35); border: 1px solid var(--line-strong);
    color: var(--ink); border-radius: 999px; cursor: pointer; padding: 0;
    transition: background 240ms var(--ease-out), border-color 240ms var(--ease-out),
                transform 240ms var(--ease-out);
  }
  .heShop-back:hover { background: rgba(212,181,116,0.16); border-color: var(--gold); transform: translateX(-2px); }
  .heShop-back:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

  /* Level 2 (the sub-collection card stack) styles itself — see
     SubCollectionDeck.tsx. */

  /* ---------- level 3: products ---------- */
  .heShop-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem); max-width: 1100px; margin: 0 auto;
  }
  @media (max-width: 980px) { .heShop-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 620px) { .heShop-grid { grid-template-columns: 1fr; } }

  .heShop-card { display: block; }
  .heShop-cardImg {
    aspect-ratio: 4 / 5; border-radius: 6px; position: relative; overflow: hidden;
    background: #15140f; transition: transform 600ms var(--ease-out);
  }
  .heShop-card:hover .heShop-cardImg { transform: translateY(-4px); }
  .heShop-cardPhoto {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 900ms var(--ease-out);
  }
  .heShop-cardNoimg { background: linear-gradient(140deg, #2a2820, #14130f); }
  .heShop-card:hover .heShop-cardPhoto { transform: scale(1.05); }
  .heShop-cardMeta { margin-top: 1rem; text-align: center; }
  .heShop-cardTitle { font-size: 0.82rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink); margin: 0; }
  .heShop-cardPrice { margin-top: 0.4rem; font-size: 0.86rem; color: var(--gold); }

  .heShop-empty {
    text-align: center; color: var(--ink-soft); letter-spacing: 0.18em;
    text-transform: uppercase; font-size: 0.95rem; padding: clamp(2rem, 6vh, 4rem) 0;
  }
`;
