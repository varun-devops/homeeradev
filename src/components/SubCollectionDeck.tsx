'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { SUB_COLLECTION_COPY } from '@/lib/collection-copy';

export type SubCollectionItem = {
  slug: string;
  label: string;
  image: string | null;
  count: number;
};

type Props = {
  collectionLabel: string;
  subs: SubCollectionItem[];
  onOpen: (slug: string) => void;
};

/**
 * Full-screen sub-collection cards, scrolled vertically.
 *
 * One card holds the screen at a time. Each sits in its own 100svh slide with
 * scroll-snap, and a rAF loop scales and fades it by its distance from the
 * viewport centre — so a card grows into focus as it arrives and recedes as
 * it leaves.
 *
 * ── Why this scrolls natively ─────────────────────────────────────────
 * The previous version hijacked the wheel and stepped an index by hand,
 * which meant no momentum, no trackpad feel, no scrollbar and nothing for
 * a screen reader to move through. This is a real scroll container instead,
 * so the browser does all of that for free.
 *
 * `data-lenis-prevent` is essential: Lenis binds the wheel globally and
 * would otherwise steal these events to scroll the window behind the
 * overlay. That attribute is Lenis's own opt-out for nested scrollers.
 */
export default function SubCollectionDeck({ collectionLabel, subs, onOpen }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  // Scale/fade each card by how far its centre is from the viewport centre,
  // and track which one is currently in focus for the counter.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(scroller.querySelectorAll<HTMLElement>('[data-card]'));
    let raf = 0;
    let lastIndex = -1;

    const update = () => {
      const box = scroller.getBoundingClientRect();
      const mid = box.top + box.height / 2;
      let bestIdx = 0;
      let bestDist = Infinity;

      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const cardMid = r.top + r.height / 2;
        // -1 = one screen above centre, 0 = centred, 1 = one screen below.
        const phase = (cardMid - mid) / box.height;
        const dist = Math.abs(phase);

        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }

        if (!reduce) {
          // Ease the falloff so the focused card stays crisp and only the
          // neighbours drop away.
          const t = Math.min(1, dist);
          card.style.transform = `scale(${(1 - t * 0.16).toFixed(4)})`;
          card.style.opacity = String((1 - t * 0.75).toFixed(3));
        }
      });

      if (bestIdx !== lastIndex) {
        lastIndex = bestIdx;
        setIndex(bestIdx);
      }
      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [reduce, subs.length]);

  const goTo = (i: number) => {
    const scroller = scrollerRef.current;
    const target = scroller?.querySelectorAll<HTMLElement>('[data-slide]')[i];
    target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const total = subs.length;

  return (
    <div className="heSub">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* Fixed chrome — sits above the scroller, never scrolls with it. */}
      <div className="heSub-hud" aria-hidden="true">
        <span className="heSub-hudCol">{collectionLabel}</span>
        <span className="heSub-hudIdx">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <div
        className="heSub-scroller"
        ref={scrollerRef}
        // Lenis binds the wheel globally; without this it steals these
        // events and scrolls the page behind the overlay instead.
        data-lenis-prevent
      >
        {subs.map((s, i) => (
          <section key={s.slug} data-slide className="heSub-slide">
            <article data-card className="heSub-card">
              <button
                type="button"
                className="heSub-cardBtn"
                onClick={() => onOpen(s.slug)}
                aria-label={`Open ${s.label}`}
              >
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image}
                    alt=""
                    className="heSub-photo"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <span className="heSub-photo heSub-noimg" />
                )}
                <span className="heSub-scrim" aria-hidden="true" />

                <span className="heSub-body">
                  <span className="heSub-name">{s.label}</span>
                  {SUB_COLLECTION_COPY[s.slug] && (
                    <span className="heSub-copy">{SUB_COLLECTION_COPY[s.slug]}</span>
                  )}
                  <span className="heSub-cta">View collection</span>
                </span>

                <span className="heSub-count">
                  {s.count} {s.count === 1 ? 'piece' : 'pieces'}
                </span>
              </button>
            </article>
          </section>
        ))}
      </div>

      {/* Dot rail — jumps straight to a card. */}
      {total > 1 && (
        <nav className="heSub-rail" aria-label="Sub-collections">
          {subs.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              className="heSub-dot"
              data-on={i === index}
              aria-label={`Go to ${s.label}`}
              onClick={() => goTo(i)}
            />
          ))}
        </nav>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
const styles = `
  .heSub { position: relative; height: 100svh; }

  /* ---------- fixed HUD ---------- */
  .heSub-hud {
    position: absolute; z-index: 4;
    top: clamp(1rem, 3vh, 1.75rem); left: 0; right: 0;
    display: flex; align-items: center; justify-content: center;
    gap: 1rem; pointer-events: none;
  }
  .heSub-hudCol {
    font-size: 0.7rem; letter-spacing: 0.34em; text-transform: uppercase;
    color: var(--ink-soft);
  }
  .heSub-hudIdx {
    font-size: 0.7rem; letter-spacing: 0.2em; color: var(--gold);
    font-variant-numeric: tabular-nums;
  }

  /* ---------- the scroller ---------- */
  .heSub-scroller {
    height: 100svh;
    overflow-y: auto;
    overscroll-behavior: contain;
    scroll-snap-type: y mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .heSub-scroller::-webkit-scrollbar { display: none; }

  .heSub-slide {
    height: 100svh;
    scroll-snap-align: center;
    display: grid;
    place-items: center;
  }

  /* ---------- the card ---------- */
  .heSub-card {
    width: min(100%, 780px);
    height: 100%;
    max-height: 68svh;
    /* transform/opacity are written each frame by the rAF loop */
    will-change: transform, opacity;
  }
  .heSub-cardBtn {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 22px;
    overflow: hidden;
    background: #15140f;
    cursor: pointer;
    text-align: left;
  }
  .heSub-cardBtn:focus-visible { outline: 2px solid var(--gold); outline-offset: 4px; }
  .heSub-photo {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    transition: transform 900ms var(--ease-out);
  }
  .heSub-cardBtn:hover .heSub-photo { transform: scale(1.04); }
  .heSub-noimg { background: linear-gradient(140deg, #2a2820, #14130f); }
  .heSub-scrim {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.88) 100%);
  }

  .heSub-body {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; flex-direction: column; align-items: flex-start;
    gap: 0.7rem;
    padding: clamp(1.25rem, 4vw, 2.25rem);
  }
  .heSub-name {
    font-family: var(--font-display);
    font-style: italic;
    font-size: clamp(1.9rem, 5.5vw, 3.4rem);
    line-height: 1;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .heSub-copy {
    max-width: 46ch;
    font-size: 0.86rem;
    line-height: 1.55;
    color: var(--ink-soft);
  }
  .heSub-cta {
    margin-top: 0.35rem;
    display: inline-block;
    padding: 0.7rem 1.5rem;
    border-radius: 999px;
    background: var(--gold);
    color: #0e0e0e;
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    transition: background 240ms var(--ease-out);
  }
  .heSub-cardBtn:hover .heSub-cta { background: var(--gold-bright); }

  .heSub-count {
    position: absolute;
    top: clamp(1rem, 3vw, 1.5rem);
    right: clamp(1rem, 3vw, 1.5rem);
    padding: 0.4rem 0.9rem;
    border-radius: 999px;
    background: rgba(10,10,10,0.6);
    backdrop-filter: blur(6px);
    color: var(--ink);
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  /* ---------- dot rail ---------- */
  .heSub-rail {
    position: absolute; z-index: 4;
    right: clamp(0.6rem, 2vw, 1.4rem); top: 50%;
    transform: translateY(-50%);
    display: flex; flex-direction: column; gap: 0.65rem;
  }
  .heSub-dot {
    width: 9px; height: 9px; border-radius: 50%;
    border: 1px solid var(--ink-soft);
    background: transparent; padding: 0; cursor: pointer;
    transition: background 260ms var(--ease-out), transform 260ms var(--ease-out),
                border-color 260ms var(--ease-out);
  }
  .heSub-dot:hover { border-color: var(--gold); }
  .heSub-dot[data-on='true'] { background: var(--gold); border-color: var(--gold); transform: scale(1.35); }

  @media (max-width: 720px) {
    .heSub-card { max-height: 75svh; }
    .heSub-copy { display: none; }
    .heSub-rail { right: 0.5rem; }
  }
`;
