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

// Price sort options shown inside an expanded collection.
type SortMode = 'featured' | 'price-asc' | 'price-desc';
const SORTS: { value: SortMode; label: string }[] = [
  { value: 'featured', label: 'All' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export type LiteProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image_url: string | null;
  category_slug: string;
  sub_category: string;
  sub_category_slug: string;
  sku: string | null;
};

export type Collection = {
  slug: string;
  label: string;
  image: string | null;
  count: number;
  subCollections: { slug: string; label: string; count: number }[];
};

type Props = {
  collections: Collection[];
  products: LiteProduct[];
};

/**
 * Full-screen collection deck for the shop, driven by the live catalogue.
 *
 * Landing = the top-level collections, each a full-bleed photo card filling
 * the viewport, swiped vertically with parallax. Tapping a collection
 * morphs it to full screen (Framer-Motion shared-element `layoutId`) and
 * reveals its products with a price-sort dropdown + staggered reveal.
 */
export default function ShopCollectionDeck({ collections, products }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const [sort, setSort] = useState<SortMode>('featured');
  const reduce = useReducedMotion();

  const openCol = collections.find((c) => c.slug === openSlug) ?? null;

  const productsFor = (catSlug: string) => {
    const items = products.filter((p) => p.category_slug === catSlug);
    if (sort === 'price-asc') return [...items].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') return [...items].sort((a, b) => b.price - a.price);
    return items;
  };

  useEffect(() => {
    setSort('featured');
  }, [openSlug]);

  // Parallax + active-panel tracking — paused while expanded.
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

  // Lock scroll + Escape close while expanded.
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
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${idx}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const items = openCol ? productsFor(openCol.slug) : [];

  return (
    <section ref={rootRef} aria-label="Shop collections" className="heShop">
      <style>{styles}</style>

      {/* ============ COLLECTION SWIPE DECK ============ */}
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
                <span className="heShop-index">
                  {String(i + 1).padStart(2, '0')} / {String(collections.length).padStart(2, '0')}
                </span>
                {'  ·  '}
                {c.count} pieces
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

      {/* Index rail */}
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

      {/* ============ EXPANDED FULL-SCREEN VIEW ============ */}
      <AnimatePresence>
        {openCol && (
          <motion.div
            key={`ov-${openCol.slug}`}
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
              onClick={() => setOpenSlug(null)}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: 0.15 }}
            >
              ← Collections
            </motion.button>

            <div className="heShop-overlayInner">
              <motion.div
                className="heShop-overlayHead"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                <span className="heShop-kicker">
                  <span className="heShop-index">{openCol.count} pieces</span>
                </span>
                <h2 className="heShop-overlayTitle">{openCol.label}</h2>
              </motion.div>

              {items.length > 0 && (
                <motion.div
                  className="heShop-filterRow"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  <SortDropdown value={sort} onChange={setSort} />
                </motion.div>
              )}

              {items.length === 0 ? (
                <div className="heShop-empty">No pieces in this collection yet.</div>
              ) : (
                <motion.div
                  className="heShop-grid"
                  key={sort}
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.04, delayChildren: 0.22 } },
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
                          {p.sku && <p className="heShop-cardSub">Item No. {p.sku}</p>}
                          <p className="heShop-cardPrice">{formatINR(p.price)}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
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
  .heShop-index { color: var(--gold); }
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
  .heShop-overlayHead { text-align: center; margin-bottom: clamp(1.5rem, 4vh, 2.25rem); }
  .heShop-overlayTitle {
    font-style: italic; margin: 0.4rem 0 0; font-size: clamp(2.4rem, 9vw, 5rem);
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

  .heShop-filterRow { display: flex; justify-content: center; margin: 0 auto clamp(2.5rem, 6vh, 3.5rem); }
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
  .heShop-cardSub { margin-top: 0.4rem; font-size: 0.84rem; color: var(--ink-soft); }
  .heShop-cardPrice { margin-top: 0.3rem; font-size: 0.86rem; color: var(--gold); }

  .heShop-empty {
    text-align: center; color: var(--ink-soft); letter-spacing: 0.18em;
    text-transform: uppercase; font-size: 0.95rem; padding: clamp(2rem, 6vh, 4rem) 0;
  }
`;
