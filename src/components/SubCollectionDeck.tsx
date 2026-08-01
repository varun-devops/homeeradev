'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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

// How many cards are drawn behind the front one. Three is enough to read as
// a stack; more just costs paint for edges nobody can see.
const STACK_DEPTH = 3;
// Wheel/swipe cooldown. The card takes ~520ms to settle, so anything shorter
// lets a single flick of a trackpad skip several cards at once.
const STEP_LOCK_MS = 620;

/**
 * Full-screen sub-collection deck — a stack of cards you move through by
 * scrolling.
 *
 * The front card carries the sub-collection photo; two or three more sit
 * behind it, inset and lifted, so the stack reads as "there is more here".
 * Beneath it sits the index, the name, a line of copy, and prev/next.
 *
 * Scrolling advances the stack rather than the page: the level fills the
 * viewport and the wheel is captured, which is why the parent overlay sets
 * `overflow: hidden` while this is the active level. The wheel handler is
 * attached with `{ passive: false }` because it calls preventDefault — React's
 * onWheel prop is registered passively and cannot.
 */
export default function SubCollectionDeck({ collectionLabel, subs, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const lockedUntil = useRef(0);
  const reduce = useReducedMotion();

  const total = subs.length;
  const clamp = useCallback((i: number) => Math.max(0, Math.min(total - 1, i)), [total]);

  const step = useCallback(
    (delta: number) => {
      const now = Date.now();
      if (now < lockedUntil.current) return;
      setIndex((i) => {
        const next = clamp(i + delta);
        // Only start the cooldown if we actually moved, so a blocked step at
        // either end doesn't make the deck feel stuck.
        if (next !== i) lockedUntil.current = now + STEP_LOCK_MS;
        return next;
      });
    },
    [clamp],
  );

  // ---- wheel ----------------------------------------------------------
  useEffect(() => {
    const el = rootRef.current;
    if (!el || total < 2) return;
    const onWheel = (e: WheelEvent) => {
      // Ignore horizontal-dominant gestures — those are back/forward swipes.
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return;
      step(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [step, total]);

  // ---- touch ----------------------------------------------------------
  useEffect(() => {
    const el = rootRef.current;
    if (!el || total < 2) return;
    let startY = 0;
    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 45) step(dy > 0 ? 1 : -1);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [step, total]);

  // ---- keyboard -------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const active = subs[index];
  if (!active) return null;

  return (
    <div className="heSub" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <p className="heSub-eyebrow">{collectionLabel}</p>

      {/* ---------------- the stack ---------------- */}
      <div className="heSub-stage">
        {subs.map((s, i) => {
          const offset = i - index;
          // Only the front card and the few behind it are drawn. Cards
          // already passed are pushed forward and faded so a step back
          // brings them in from the right place.
          if (offset < -1 || offset > STACK_DEPTH) return null;
          const behind = Math.max(0, offset);
          const isFront = offset === 0;

          return (
            <motion.div
              key={s.slug}
              className="heSub-card"
              data-front={isFront}
              style={{ zIndex: 10 - behind }}
              animate={{
                y: offset < 0 ? 40 : -behind * 20,
                scale: offset < 0 ? 1.02 : 1 - behind * 0.045,
                opacity: offset < 0 ? 0 : behind >= STACK_DEPTH ? 0 : 1,
              }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 }
              }
              aria-hidden={!isFront}
            >
              <button
                type="button"
                className="heSub-cardBtn"
                tabIndex={isFront ? 0 : -1}
                onClick={() => isFront && onOpen(s.slug)}
                aria-label={`Open ${s.label}`}
              >
                {s.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" className="heSub-photo" loading={isFront ? 'eager' : 'lazy'} />
                ) : (
                  <span className="heSub-photo heSub-noimg" />
                )}
                <span className="heSub-photoScrim" aria-hidden="true" />
                <span className="heSub-badge">{collectionLabel}</span>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* ---------------- caption row ---------------- */}
      <div className="heSub-meta">
        <span className="heSub-count">
          {String(index + 1).padStart(3, '0')}/{String(total).padStart(3, '0')}
        </span>

        <motion.h2
          key={`t-${active.slug}`}
          className="heSub-name"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          {active.label}
        </motion.h2>

        <motion.p
          key={`c-${active.slug}`}
          className="heSub-copy"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          {SUB_COLLECTION_COPY[active.slug] ?? ''}
        </motion.p>

        <div className="heSub-nav">
          <button
            type="button"
            className="heSub-navBtn"
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label="Previous"
          >
            <Chevron dir="up" />
          </button>
          <button
            type="button"
            className="heSub-navBtn"
            onClick={() => step(1)}
            disabled={index === total - 1}
            aria-label="Next"
          >
            <Chevron dir="down" />
          </button>
          <button type="button" className="heSub-enter" onClick={() => onOpen(active.slug)}>
            View
          </button>
        </div>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: dir === 'up' ? 'rotate(180deg)' : undefined }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────
const styles = `
  .heSub {
    height: 100svh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(0.75rem, 2vh, 1.5rem);
    /* The stack is driven by the wheel, so the browser must not also try to
       scroll or rubber-band this area. */
    overscroll-behavior: contain;
    touch-action: pan-x;
  }

  .heSub-eyebrow {
    margin: 0;
    font-size: 0.7rem;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }

  /* ---------- stack ---------- */
  .heSub-stage {
    position: relative;
    width: min(100%, 900px);
    /* Room above the front card for the peeking edges. */
    padding-top: 46px;
    aspect-ratio: 16 / 9;
    max-height: 52svh;
  }
  .heSub-card {
    position: absolute;
    inset: 46px 0 0 0;
    transform-origin: center top;
    will-change: transform, opacity;
  }
  .heSub-cardBtn {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    overflow: hidden;
    background: #15140f;
    cursor: pointer;
  }
  .heSub-card[data-front='false'] .heSub-cardBtn { cursor: default; }
  .heSub-card[data-front='true'] .heSub-cardBtn:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 3px;
  }
  .heSub-photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 900ms var(--ease-out);
  }
  .heSub-card[data-front='true'] .heSub-cardBtn:hover .heSub-photo { transform: scale(1.04); }
  .heSub-noimg { background: linear-gradient(140deg, #2a2820, #14130f); }
  .heSub-photoScrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.5));
  }
  .heSub-badge {
    position: absolute;
    top: 0; left: 0;
    padding: 0.7rem 1.15rem;
    background: rgba(10,10,10,0.72);
    backdrop-filter: blur(6px);
    border-bottom-right-radius: 12px;
    color: var(--ink);
    font-size: 0.68rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  /* ---------- caption ---------- */
  .heSub-meta {
    display: grid;
    grid-template-columns: auto minmax(0, 1.1fr) minmax(0, 1.4fr) auto;
    align-items: center;
    gap: clamp(1rem, 3vw, 2.5rem);
    width: min(100%, 900px);
  }
  .heSub-count {
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    color: var(--ink-mute);
    font-variant-numeric: tabular-nums;
  }
  .heSub-name {
    margin: 0;
    font-family: var(--font-display);
    font-style: italic;
    font-size: clamp(1.8rem, 4.5vw, 3.2rem);
    line-height: 1;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .heSub-copy {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.6;
    color: var(--ink-soft);
  }
  .heSub-nav { display: flex; align-items: center; gap: 0.5rem; }
  .heSub-navBtn {
    width: 42px; height: 42px;
    display: grid; place-items: center;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
    transition: background 220ms var(--ease-out), border-color 220ms var(--ease-out), opacity 220ms;
  }
  .heSub-navBtn:hover:not(:disabled) { background: rgba(212,181,116,0.16); border-color: var(--gold); }
  .heSub-navBtn:disabled { opacity: 0.3; cursor: default; }
  .heSub-enter {
    margin-left: 0.25rem;
    padding: 0 1.4rem;
    height: 42px;
    border: none;
    border-radius: 999px;
    background: var(--gold);
    color: #0e0e0e;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    cursor: pointer;
  }

  /* ---------- narrow ---------- */
  @media (max-width: 860px) {
    .heSub-meta {
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
      gap: 0.6rem;
    }
    .heSub-copy { display: none; }
    .heSub-stage { max-height: 42svh; }
  }
`;
