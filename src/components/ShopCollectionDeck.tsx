'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { formatINR } from '@/lib/format';

// Shared scroll-reveal item: fade + rise, used for the staggered collection
// headline content.
const revealItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

// Sort options shown inside an open sub-collection.
type SortMode = 'featured' | 'price-asc' | 'price-desc' | 'newest';
const SORTS: { value: SortMode; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest' },
];

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
 * Three-level shop browser, driven by the live catalogue.
 *
 *   1. DECK          — each collection is a full-bleed photo card filling the
 *                      viewport, swiped vertically with parallax.
 *   2. SUB-COLLECTIONS — tapping a collection morphs its card to full screen
 *                      (Framer Motion shared-element `layoutId`) and reveals
 *                      the sub-collections inside it.
 *   3. PRODUCTS      — tapping a sub-collection reveals its products.
 *
 * Levels 2 and 3 live in the same fixed overlay, so stepping between them is
 * a content swap rather than a route change and the background photo stays
 * put. A single back control walks the visitor out one level at a time.
 */
export default function ShopCollectionDeck({ collections, products }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [sort, setSort] = useState<SortMode>('featured');
  const reduce = useReducedMotion();

  const openCol = collections.find((c) => c.slug === openSlug) ?? null;
  const openSubCol = openCol?.subCollections.find((s) => s.slug === openSub) ?? null;

  const productsFor = (subSlug: string) => {
    const items = products.filter((p) => p.sub_category_slug === subSlug);
    switch (sort) {
      case 'price-asc':
        return [...items].sort((a, b) => a.effective_price - b.effective_price);
      case 'price-desc':
        return [...items].sort((a, b) => b.effective_price - a.effective_price);
      case 'newest':
        return [...items].sort((a, b) => Number(b.is_new) - Number(a.is_new));
      default:
        return items;
    }
  };

  // Reset the sort whenever a different sub-collection opens.
  useEffect(() => {
    setSort('featured');
  }, [openSub]);

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

  // Step back one level: products → sub-collections → deck.
  const back = () => {
    if (openSub) setOpenSub(null);
    else setOpenSlug(null);
  };

  // Lock scroll + Escape close while the overlay is up. `back` is re-read
  // from a ref-free closure each time the effect re-runs, so Escape always
  // steps back from the CURRENT level.
  useEffect(() => {
    document.body.style.overflow = openSlug ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openSub) setOpenSub(null);
      else setOpenSlug(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [openSlug, openSub]);

  // Opening a sub-collection should start the product grid at the top.
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    overlayRef.current?.scrollTo({ top: 0 });
  }, [openSub]);

  const scrollToPanel = (idx: number) => {
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const items = openSubCol ? productsFor(openSubCol.slug) : [];

  return (
    <section ref={rootRef} aria-label="Shop collections" className="heShop">
      <style>{styles}</style>

      {/* ============ LEVEL 1 — COLLECTION SWIPE DECK ============ */}
      {collections.map((c, i) => (
        <article
          key={c.slug}
          data-panel
          data-idx={i}
          className="heShop-panel"
          onClick={() => setOpenSlug(c.slug)}
        >
          {/* Entrance "blast in" wrapper — runs once when the shop mounts
              (i.e. right after the page transition from the hero), staggered
              per card. The RAF parallax doesn't touch this layer, so the two
              never fight. */}
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
            <motion.div
              className="heShop-contentInner"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.5 }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
              }}
            >
              <motion.span className="heShop-kicker" variants={revealItem}>
                The Collection
              </motion.span>
              <motion.h2 className="heShop-title" variants={revealItem}>{c.label}</motion.h2>
              <motion.p className="heShop-copy" variants={revealItem}>
                {c.subCollections.map((s) => s.label).join(' · ')}
              </motion.p>
              <motion.span className="heShop-open" variants={revealItem}>View collection</motion.span>
            </motion.div>
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

            <motion.button
              type="button"
              className="heShop-back"
              onClick={back}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.15 }}
            >
              ← Back to collections
            </motion.button>

            <div className="heShop-overlayInner">
              <AnimatePresence mode="wait">
                {/* ---------- LEVEL 2 — sub-collections ---------- */}
                {!openSubCol ? (
                  <motion.div
                    key="subs"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="heShop-overlayHead">
                      <h2 className="heShop-overlayTitle">{openCol.label}</h2>
                    </div>

                    <motion.div
                      className="heShop-subGrid"
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.06, delayChildren: 0.14 } },
                      }}
                    >
                      {openCol.subCollections.map((s) => (
                        <motion.button
                          key={s.slug}
                          type="button"
                          className="heShop-subCard"
                          onClick={() => setOpenSub(s.slug)}
                          variants={{
                            hidden: { opacity: 0, y: 24 },
                            show: { opacity: 1, y: 0 },
                          }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="heShop-subImg">
                            {s.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.image} alt="" loading="lazy" className="heShop-subPhoto" />
                            ) : (
                              <div className="heShop-subPhoto heShop-cardNoimg" />
                            )}
                            <span className="heShop-subScrim" aria-hidden="true" />
                            <span className="heShop-subLabel">{s.label}</span>
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                ) : (
                  /* ---------- LEVEL 3 — products ---------- */
                  <motion.div
                    key={`items-${openSubCol.slug}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="heShop-overlayHead">
                      <h2 className="heShop-overlayTitle">{openSubCol.label}</h2>
                    </div>

                    <div className="heShop-sortRow">
                      <SortDropdown value={sort} onChange={setSort} />
                    </div>

                    {items.length === 0 ? (
                      <div className="heShop-empty">Nothing in this collection yet.</div>
                    ) : (
                      <motion.div
                        className="heShop-grid"
                        key={sort}
                        initial="hidden"
                        animate="show"
                        variants={{
                          hidden: {},
                          show: { transition: { staggerChildren: 0.04, delayChildren: 0.12 } },
                        }}
                      >
                        {items.map((p) => (
                          <motion.div
                            key={p.id}
                            variants={{
                              hidden: { opacity: 0, y: 24 },
                              show: { opacity: 1, y: 0 },
                            }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          >
                            <Link href={`/shop/${p.slug}`} data-hover className="heShop-card">
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
                          </motion.div>
                        ))}
                      </motion.div>
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
function SortDropdown({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORTS.find((s) => s.value === value) ?? SORTS[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="heSort" ref={ref}>
      <span className="heSort-label">Sort</span>
      <button
        type="button"
        className="heSort-toggle"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current.label}</span>
        <svg
          className="heSort-chev"
          data-open={open}
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            className="heSort-menu"
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {SORTS.map((s) => (
              <li key={s.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={s.value === value}
                  className="heSort-item"
                  data-on={s.value === value}
                  onClick={() => {
                    onChange(s.value);
                    setOpen(false);
                  }}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
const styles = `
  .heShop { position: relative; width: 100%; }
  .heShop-panel {
    position: relative; height: 100svh; width: 100%;
    overflow: hidden; display: grid; place-items: center; cursor: pointer;
  }
  .heShop-bgWrap {
    position: absolute; inset: 0; z-index: 0; overflow: hidden;
  }
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
    will-change: transform, opacity; pointer-events: none;
  }
  .heShop-contentInner {
    display: flex; flex-direction: column; align-items: center;
  }
  .heShop-kicker {
    display: inline-block; font-size: 0.72rem; letter-spacing: 0.36em;
    text-transform: uppercase; color: var(--ink-soft); margin-bottom: 0.9rem;
  }
  .heShop-title {
    font-style: italic; margin: 0; font-size: clamp(2.8rem, 11vw, 6.5rem);
    line-height: 0.98; letter-spacing: -0.02em;
  }
  .heShop-copy {
    color: var(--ink-soft); margin: 1.3rem auto 1.9rem; max-width: 600px;
    font-size: clamp(0.9rem, 2.2vw, 1.05rem); letter-spacing: 0.04em;
  }
  .heShop-open {
    display: inline-block; pointer-events: auto;
    padding: clamp(0.8rem, 2vw, 0.95rem) clamp(1.5rem, 4vw, 2.1rem);
    border: 1px solid var(--line-strong); color: var(--ink); border-radius: 999px;
    font-size: clamp(0.74rem, 2vw, 0.82rem); letter-spacing: 0.2em; text-transform: uppercase;
    background: rgba(0,0,0,0.18);
    transition: background 280ms var(--ease-out), border-color 280ms var(--ease-out);
  }
  .heShop-open:hover { background: rgba(212,181,116,0.16); border-color: var(--gold); }

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
  .heShop-overlayBg { position: fixed; inset: 0; z-index: 0; background-size: cover; background-position: center; }
  .heShop-overlayTint {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background: linear-gradient(180deg, rgba(8,8,8,0.80), rgba(8,8,8,0.93) 42%, #080808 80%);
  }
  .heShop-overlayInner {
    position: relative; z-index: 2; min-height: 100svh;
    padding: clamp(6rem, 14vh, 9rem) var(--pad-x) clamp(4rem, 10vh, 7rem);
  }
  .heShop-overlayHead { text-align: center; margin-bottom: clamp(1.75rem, 5vh, 3rem); }
  .heShop-overlayTitle {
    font-style: italic; margin: 0; font-size: clamp(2.4rem, 9vw, 5rem);
    line-height: 1; letter-spacing: -0.02em;
  }
  .heShop-back {
    position: fixed; top: clamp(1.1rem, 3vh, 1.6rem); left: 50%; transform: translateX(-50%); z-index: 5;
    display: inline-flex; align-items: center; gap: 0.5rem;
    background: rgba(0,0,0,0.35); border: 1px solid var(--line-strong); color: var(--ink);
    border-radius: 999px; padding: 0.6rem 1.2rem; cursor: pointer;
    font-size: 0.74rem; letter-spacing: 0.2em; text-transform: uppercase;
    transition: background 240ms var(--ease-out), border-color 240ms var(--ease-out);
  }
  .heShop-back:hover { background: rgba(212,181,116,0.16); border-color: var(--gold); }

  /* ---------- level 2: sub-collection cards ---------- */
  .heShop-subGrid {
    display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(1.25rem, 3vw, 2rem); max-width: 1100px; margin: 0 auto;
  }
  @media (max-width: 900px) { .heShop-subGrid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .heShop-subGrid { grid-template-columns: 1fr; } }

  .heShop-subCard {
    display: block; width: 100%; padding: 0; border: none; background: none;
    cursor: pointer; text-align: left;
  }
  .heShop-subImg {
    position: relative; aspect-ratio: 4 / 3; border-radius: 8px; overflow: hidden;
    background: #15140f; transition: transform 600ms var(--ease-out);
  }
  .heShop-subCard:hover .heShop-subImg { transform: translateY(-4px); }
  .heShop-subPhoto {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
    transition: transform 900ms var(--ease-out);
  }
  .heShop-subCard:hover .heShop-subPhoto { transform: scale(1.06); }
  .heShop-subScrim {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.72));
  }
  .heShop-subLabel {
    position: absolute; left: 0; right: 0; bottom: 0;
    padding: 1.1rem 1.25rem; color: var(--ink);
    font-family: var(--font-display); font-size: clamp(1.15rem, 2.6vw, 1.6rem);
    font-style: italic; letter-spacing: 0.01em; line-height: 1.1;
  }

  /* ---------- level 3: products ---------- */
  .heShop-sortRow {
    display: flex; justify-content: center;
    margin: 0 auto clamp(1.75rem, 5vh, 2.75rem); max-width: 1100px;
  }
  .heSort { position: relative; display: inline-flex; align-items: center; gap: 0.75rem; }
  .heSort-label { font-size: 0.7rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-soft); }
  .heSort-toggle {
    display: inline-flex; align-items: center; gap: 0.6rem; min-width: 200px; justify-content: space-between;
    background: rgba(0,0,0,0.3); border: 1px solid var(--line-strong); color: var(--ink);
    border-radius: 999px; padding: 0.6rem 1.1rem; cursor: pointer;
    font-size: 0.74rem; letter-spacing: 0.14em; text-transform: uppercase;
    transition: border-color 240ms var(--ease-out), background 240ms var(--ease-out);
  }
  .heSort-toggle:hover { border-color: var(--gold); }
  .heSort-chev { transition: transform 260ms var(--ease-out); }
  .heSort-chev[data-open='true'] { transform: rotate(180deg); }
  .heSort-menu {
    position: absolute; top: calc(100% + 0.5rem); right: 0; z-index: 6; min-width: 220px;
    list-style: none; margin: 0; padding: 0.35rem;
    background: rgba(14,14,14,0.96); backdrop-filter: blur(10px);
    border: 1px solid var(--line-strong); border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform-origin: top right;
  }
  .heSort-item {
    display: block; width: 100%; text-align: left; background: transparent; border: none;
    color: var(--ink-soft); padding: 0.7rem 0.9rem; border-radius: 8px; cursor: pointer;
    font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase;
    transition: background 200ms var(--ease-out), color 200ms var(--ease-out);
  }
  .heSort-item:hover { background: rgba(255,255,255,0.05); color: var(--ink); }
  .heSort-item[data-on='true'] { color: var(--gold); }

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
