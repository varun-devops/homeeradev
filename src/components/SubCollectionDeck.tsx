'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { SUB_COLLECTION_COPY } from '@/lib/collection-copy';
import CardMedia from '@/components/CardMedia';
import ScrollHint from '@/components/ScrollHint';

export type SubCollectionItem = {
  slug: string;
  label: string;
  image: string | null;
  /** Optional looping clip; `image` is its poster frame. */
  video: string | null;
  count: number;
};

type Props = {
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
export default function SubCollectionDeck({ subs, onOpen }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();
  // Still needed by the dot rail, which hides itself for a single card.
  const total = subs.length;

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
          // The card is full-bleed now, so scaling the whole thing would
          // expose the page behind its edges. Move the photo and the copy
          // independently instead: the image drifts slower than the scroll
          // (held oversized so it never uncovers a corner), and the caption
          // lifts and fades as its slide leaves the middle of the screen.
          const photo = card.querySelector<HTMLElement>('[data-photo]');
          const body = card.querySelector<HTMLElement>('[data-body]');
          if (photo) {
            photo.style.transform = `translate3d(0, ${(phase * -9).toFixed(2)}%, 0) scale(1.16)`;
          }
          if (body) {
            const t = Math.min(1, dist * 1.6);
            body.style.opacity = (1 - t).toFixed(3);
            body.style.transform = `translate3d(0, ${(phase * 46).toFixed(1)}px, 0)`;
          }
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



  return (
    <div className="heSub">
      <style dangerouslySetInnerHTML={{ __html: styles }} />


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
                {s.image || s.video ? (
                  <CardMedia
                    image={s.image}
                    video={s.video}
                    data-photo
                    className="heSub-photo"
                    // Each card is a full-screen panel.
                    sizes="100vw"
                    priority={i === 0}
                  />
                ) : (
                  <span data-photo className="heSub-photo heSub-noimg" />
                )}
                <span className="heSub-scrim" aria-hidden="true" />

                <span data-body className="heSub-body">
                  <span className="heSub-name">{s.label}</span>
                  {SUB_COLLECTION_COPY[s.slug] && (
                    <span className="heSub-copy">{SUB_COLLECTION_COPY[s.slug]}</span>
                  )}
                </span>

              </button>
            </article>
          </section>
        ))}
      </div>

      {/* Position in the deck, matching the collection level: the same
          counter in the same place, so moving between levels does not
          move the chrome around. */}
      {total > 1 && (
        <span className="heSub-idx" aria-hidden="true">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      )}
      {total > 1 && <ScrollHint />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
const styles = `
  .heSub { position: relative; height: 100svh; }

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
    /* svh, deliberately not dvh: dvh grows and shrinks as the mobile URL
       bar hides, which resizes every slide mid-scroll and fights snapping. */
    height: 100svh;
    /* Reserve the fixed header. Without it the card ran to the very top and
       the logo and menu button sat directly on the photograph. box-sizing is
       border-box globally, so the slide still measures one viewport. */
    padding-top: var(--header-h);
    scroll-snap-align: start;
    display: grid;
    /* stretch, not center: centring sizes the card to its content and
       left the photo short of the viewport edges. */
    place-items: stretch;
  }

  /* ---------- the card ----------
     Full-bleed: the sub-collection fills the viewport exactly like a
     collection panel does one level up, so the two levels read as the same
     kind of surface. No rounded corner, border or max-height — anything
     inset would letterbox the photo against the overlay behind it. */
  .heSub-card {
    width: 100%;
    height: 100%;
  }
  .heSub-cardBtn {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 0;
    overflow: hidden;
    background: #15140f;
    cursor: pointer;
    text-align: left;
  }
  .heSub-cardBtn:focus-visible { outline: 2px solid var(--gold); outline-offset: -4px; }
  .heSub-photo {
    position: absolute; inset: 0;
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    /* transform is written every frame by the rAF loop — a CSS transition
       here would lag behind the scroll and judder. */
    will-change: transform;
  }
  .heSub-noimg { background: linear-gradient(140deg, #2a2820, #14130f); }
  .heSub-scrim {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0.92) 100%);
  }

  .heSub-body {
    position: absolute; left: 0; right: 0; bottom: 0;
    display: flex; flex-direction: column; align-items: flex-start;
    gap: 0.8rem;
    padding: clamp(2rem, 6vw, 4.5rem) var(--pad-x) clamp(3.5rem, 10vh, 6rem);
    max-width: 900px;
    will-change: transform, opacity;
  }
  .heSub-name {
    font-family: var(--font-display);
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
  /* No CTA pill. The whole card is the button — it always was, so the
     pill was a second target for the same action, and a filled gold
     shape competing with the photograph it sat on. */


  /* ---------- position counter ---------- */
  .heSub-idx {
    position: fixed; z-index: 4;
    left: var(--pad-x);
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.68rem;
    letter-spacing: 0.28em;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
    /* Vertical, as on the collection deck — horizontal text in the left
       gutter runs into the card title on a narrow screen. */
    writing-mode: vertical-rl;
    rotate: 180deg;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0,0,0,0.7);
  }
  @media (max-width: 640px) {
    .heSub-idx { left: 0.6rem; font-size: 0.62rem; letter-spacing: 0.22em; }
  }

  @media (max-width: 720px) {
    /* The card is full-bleed at every size now, so the old max-height cap
       no longer applies. Copy stays — there is room for it on a full
       screen, unlike in the inset card it used to be hidden in. */
    .heSub-copy { font-size: 0.82rem; }
    .heSub-body { padding-bottom: clamp(4rem, 12vh, 6rem); }
  }

  /* ---------- scroll hint ---------- */
  .heScrollHint {
    position: fixed; z-index: 4;
    right: var(--pad-x);
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-soft);
    opacity: 0.65;
    pointer-events: none;
    filter: drop-shadow(0 1px 3px rgba(0,0,0,0.7));
  }
  @media (max-width: 640px) {
    .heScrollHint { right: 0.5rem; }
    .heScrollHint svg { height: 36px; }
  }
`;
