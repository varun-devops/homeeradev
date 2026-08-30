'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { formatINR } from '@/lib/format';
import SubCollectionDeck from '@/components/SubCollectionDeck';
import Img from '@/components/Img';
import { lockScroll } from '@/lib/scroll-lock';

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
  const router = useRouter();
  const params = useSearchParams();
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  // Which level is open lives in the URL, not in state. Held in state it
  // produced no history entries, so browser Back skipped every level and
  // returning from a product page always dumped you at the top of the
  // deck. As query params each level is a real history entry, and a
  // product page can link back to the exact sub-collection it came from.
  const openSlug = params.get('c');
  const openSub = params.get('s');

  const openCol = collections.find((c) => c.slug === openSlug) ?? null;
  const openSubCol = openCol?.subCollections.find((s) => s.slug === openSub) ?? null;

  const productsFor = (subSlug: string) =>
    products.filter((p) => p.sub_category_slug === subSlug);

  // ---- navigation ----------------------------------------------------
  // scroll: false — the overlay is fixed, so letting the router scroll to
  // the top would move the deck behind it for no reason.
  const go = (href: string) => router.push(href, { scroll: false });
  const openCollection = (slug: string) => go(`/shop?c=${encodeURIComponent(slug)}`);
  const openSubCollection = (slug: string) =>
    go(`/shop?c=${encodeURIComponent(openSlug ?? "")}&s=${encodeURIComponent(slug)}`);
  /** Step back one level: products → sub-collections → deck. */
  const back = () => {
    if (openSub && openSlug) go(`/shop?c=${encodeURIComponent(openSlug)}`);
    else go('/shop');
  };

  // Fold direction is derived from how deep we just moved, so it is right
  // for browser Back and Forward too — a stored direction only knew about
  // clicks on our own controls.
  const depth = openSub ? 2 : openSlug ? 1 : 0;
  const prevDepth = useRef(depth);
  const dirRef = useRef<1 | -1>(1);
  if (prevDepth.current !== depth) {
    dirRef.current = depth > prevDepth.current ? 1 : -1;
    prevDepth.current = depth;
  }
  const dir = dirRef.current;

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
    if (!openSlug) return;
    // Reference-counted: see lib/scroll-lock.ts. Clicking a product card
    // navigates away while this overlay is still "open" (openSlug is only
    // cleared by Escape or the back button, not by following a Link), so
    // this lock must release cleanly on unmount rather than assume it owns
    // document.body.style.overflow outright.
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      back();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlock();
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
    <section
      ref={rootRef}
      aria-label="Shop collections"
      className="heShop"
      // Lenis binds the wheel globally; its smoothing overrides CSS
      // scroll-snap, so this scroller takes its own wheel events.
      data-lenis-prevent
    >
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
              animate={{ opacity: openSlug === c.slug ? 0 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* A CSS background-image cannot be lazy-loaded or given a
                  srcset, so a phone was fetching the full-size original for
                  every one of these full-screen panels. */}
              <Img
                src={c.image}
                alt=""
                className="heShop-bgPhoto"
                sizes="100vw"
                priority={i === 0}
              />
            </motion.div>
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

          {/* Scroll cue. Every collection is a full-height panel, so without
              this the visitor has no way of knowing four more sit below the
              fold — the card itself carries nothing but the name. Shows the
              position in the deck, and on any panel but the last a chevron
              that jumps to the next one. */}
          {collections.length > 1 && (
            <div className="heShop-cue">
              <span className="heShop-cueIdx">
                {String(i + 1).padStart(2, '0')} / {String(collections.length).padStart(2, '0')}
              </span>
              {i < collections.length - 1 && (
                <button
                  type="button"
                  className="heShop-cueBtn"
                  aria-label={`Next collection: ${collections[i + 1].label}`}
                  onClick={(e) => {
                    // The panel itself opens the collection on click, so this
                    // must not bubble up to it.
                    e.stopPropagation();
                    scrollToPanel(i + 1);
                  }}
                >
                  <span className="heShop-cueNext">{collections[i + 1].label}</span>
                  <svg
                    className="heShop-cueChev"
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              )}
            </div>
          )}
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
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            >
              <Img src={openCol.image} alt="" className="heShop-bgPhoto" sizes="100vw" priority />
            </motion.div>
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
                                <Img
                                  src={p.image_url}
                                  alt={p.name}
                                  className="heShop-cardPhoto"
                                  // 3 columns inside a 1100px rail above
                                  // 980px, 2 columns of the viewport below.
                                  sizes="(max-width: 980px) 50vw, 340px"
                                  widths={[240, 320, 480, 640, 828]}
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
  /* One collection per screen. The panels were already a viewport tall, but
     the page scrolled through them freely, so a scroll could stop halfway
     between two and show neither. Snapping makes each card a stop.

     A scroll container of its own rather than snapping the page: Lenis owns
     the window scroll site-wide and its smoothing fights CSS snap, so the
     deck opts out with data-lenis-prevent and snaps natively -- the same
     arrangement SubCollectionDeck already uses one level down. */
  .heShop {
    position: relative; width: 100%;
    height: 100svh;
    overflow-y: auto;
    overscroll-behavior: contain;
    scroll-snap-type: y mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .heShop::-webkit-scrollbar { display: none; }
  .heShop-panel {
    position: relative; height: 100svh; width: 100%;
    scroll-snap-align: start;
    /* Same reservation as the sub-collection cards, so the header never
       sits on a card's own title. */
    padding-top: var(--header-h);
    overflow: hidden; display: grid; place-items: center; cursor: pointer;
  }
  .heShop-panel:focus-visible { outline: 2px solid var(--gold); outline-offset: -6px; }
  .heShop-bgWrap { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
  .heShop-bg {
    position: absolute; inset: 0; height: 100%; width: 100%;
    background: #1a1916; z-index: 0;
  }
  .heShop-bgPhoto {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: center; display: block;
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

  /* ---------- scroll cue ---------- */
  .heShop-cue {
    position: absolute; z-index: 3;
    left: 50%; transform: translateX(-50%);
    bottom: clamp(1.5rem, 5vh, 3rem);
    display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
    pointer-events: none;
  }
  .heShop-cueIdx {
    font-size: 0.68rem; letter-spacing: 0.28em; color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }
  .heShop-cueBtn {
    pointer-events: auto;
    display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
    background: none; border: none; padding: 0.35rem 0.75rem; cursor: pointer;
    color: var(--ink-soft);
    transition: color 240ms var(--ease-out);
  }
  .heShop-cueBtn:hover { color: var(--gold); }
  .heShop-cueBtn:focus-visible { outline: 1px solid var(--gold); outline-offset: 4px; border-radius: 8px; }
  .heShop-cueNext {
    font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase;
  }
  /* A slow bob — enough to read as "there is more below" without nagging. */
  .heShop-cueChev { animation: heShopBob 2.1s ease-in-out infinite; }
  @keyframes heShopBob {
    0%, 100% { transform: translateY(0); opacity: 0.75; }
    50%      { transform: translateY(5px); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .heShop-cueChev { animation: none; }
  }

  .heShop-rail {
    position: fixed; right: clamp(0.75rem, 2.5vw, 1.75rem); top: 50%;
    transform: translateY(-50%); display: flex; flex-direction: column; gap: 0.7rem; z-index: 40;
  }
  .heShop-dot {
    width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--ink-soft);
    background: transparent; padding: 0; cursor: pointer;
    transition: background 280ms var(--ease-out), transform 280ms var(--ease-out),
                border-color 280ms var(--ease-out);
  }
  .heShop-dot:hover { border-color: var(--gold); }
  .heShop-dot[data-on='true'] { background: var(--gold); border-color: var(--gold); transform: scale(1.35); }
  @media (max-width: 720px) {
    /* The cue owns the bottom centre on mobile, so the rail tucks in below it. */
    .heShop-rail { top: auto; bottom: 0.85rem; right: 50%; transform: translateX(50%); flex-direction: row; }
    .heShop-cue { bottom: 3.25rem; }
    .heShop-cueNext { display: none; }
  }

  .heShop-overlay { position: fixed; inset: 0; z-index: 90; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .heShop-overlay[data-level='subs'] { overflow: hidden; }
  .heShop-overlayBg { position: fixed; inset: 0; z-index: 0; background: #1a1916; }
  .heShop-overlayTint {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background: linear-gradient(180deg, rgba(8,8,8,0.80), rgba(8,8,8,0.93) 42%, #080808 80%);
  }
  .heShop-overlayInner {
    position: relative; z-index: 2; min-height: 100svh;  }
  /* The sub-collection deck sizes itself to 100svh, so the inner wrapper
     only supplies the side gutter — vertical padding would push it past
     the fold and reintroduce a scrollbar. */
  .heShop-overlay[data-level='subs'] .heShop-overlayInner {
    min-height: 0;  }

  /* Back arrow — parked under the logo, at the page gutter.
     top MUST clear the fixed header (~74px tall at z-index 100), which
     otherwise sits over this button and eats the click. */
  .heShop-back {
    position: fixed; top: 5.25rem; left: var(--pad-x); z-index: 95;
    width: 44px; height: 44px; display: grid; place-items: center; 
    color: var(--ink); border-radius: 999px; cursor: pointer; padding: 0;
    transition: background 240ms var(--ease-out), border-color 240ms var(--ease-out),
                transform 240ms var(--ease-out);
  }
  .heShop-back:hover { background: rgba(212,181,116,0.16); transform: translateX(-2px); }
  .heShop-back:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }

  /* Level 2 (the sub-collection card stack) styles itself — see
     SubCollectionDeck.tsx. */

  /* ---------- level 3: products ---------- */
  .heShop-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem); max-width: 1100px; margin: 0 auto;
  }
  @media (max-width: 980px) { .heShop-grid { grid-template-columns: repeat(2, 1fr); } }
  /* Two columns all the way down to the narrowest phone. A single column
     showed one product per screen and made a 22-piece sub-collection feel
     endless. The gutters and type tighten here so two cards still breathe
     at 360px — the uppercase title especially, whose 0.2em tracking wraps
     badly in a half-width column. */
  @media (max-width: 620px) {
    .heShop-grid { grid-template-columns: repeat(2, 1fr); gap: 1.6rem 0.9rem; }
    .heShop-cardMeta { margin-top: 0.7rem; }
    .heShop-cardTitle { font-size: 0.68rem; letter-spacing: 0.1em; line-height: 1.35; }
    .heShop-cardPrice { margin-top: 0.25rem; font-size: 0.8rem; }
  }

  .heShop-card { display: block; }
  .heShop-cardImg {
    aspect-ratio: 1 / 1; border-radius: 6px; position: relative; overflow: hidden;
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
