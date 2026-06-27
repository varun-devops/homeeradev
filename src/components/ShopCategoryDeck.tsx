'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { collectionsWithChildren, type SubCollection } from '@/lib/products';

/**
 * Full-screen collection deck with Resn-style parallax + staggered scroll.
 *
 * (Reference: the mobile scroll feel of resn.co.nz/#!/work/.)
 *
 * Each browsable sub-collection (Ornaments, Table Clock, Sculpture,
 * Pots & Planter) becomes a full-viewport panel. As the visitor scrolls:
 *
 *   • The full-bleed background translates *slower* than the page
 *     (a classic depth-parallax — the image drifts up as you scroll past).
 *   • The foreground content (eyebrow → title → copy → CTA) is offset and
 *     fades/lifts in with a per-element stagger as the panel reaches centre.
 *   • A subtle scale-settle on the active panel makes the swipe between
 *     cards read as one continuous motion rather than discrete slides.
 *
 * All movement is driven from a single rAF loop that reads each panel's
 * position relative to the viewport, so it rides on top of the global
 * Lenis smooth-scroll seamlessly (no scroll-jacking, no nested scroller).
 *
 * The deck is full-screen on every breakpoint — on mobile the panel image
 * fills the entire viewport behind the content, which is what the brief
 * asks for ("show full screen … the category project image is fullscreen").
 */

// Flatten the grouped collections into an ordered list of panels, tagging
// each with its parent collection so we can show the collection name as a
// small kicker above the sub-collection title.
type Panel = SubCollection & { collectionLabel: string };

const panels: Panel[] = collectionsWithChildren.flatMap(({ collection, children }) =>
  children.map((child) => ({ ...child, collectionLabel: collection.label })),
);

export default function ShopCategoryDeck() {
  // <section> is a plain HTMLElement (no dedicated DOM interface), so the
  // ref must be typed HTMLElement — typing it HTMLDivElement would not be
  // assignable to the section's ref prop.
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  // Parallax + reveal driver. One rAF loop reads every panel's offset from
  // the viewport centre and writes transforms straight to the DOM — cheap,
  // and it composes with Lenis because we only read layout, never scroll.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

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
        // -1 when the panel sits a full viewport above centre, 0 at centre,
        // +1 a viewport below. This is the panel's scroll "phase".
        const phase = (sectionMid - mid) / vh;

        // Nearest-to-centre panel drives the index rail + active styling.
        const dist = Math.abs(phase);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }

        if (reduce) return;

        // ——— Background parallax ———
        // The image is over-sized (height 120%) so it can drift within the
        // panel without exposing an edge. Move it opposite to the scroll so
        // it reads as deeper than the foreground.
        const bg = bgs[i];
        if (bg) {
          const drift = phase * vh * 0.18; // px
          bg.style.transform = `translate3d(0, ${(-drift).toFixed(2)}px, 0) scale(1.08)`;
        }

        // ——— Foreground reveal + counter-parallax ———
        // Content rises slightly faster than scroll and fades as it leaves
        // the centre band, so each card "presents" itself at centre.
        const content = contents[i];
        if (content) {
          const lift = phase * vh * 0.06; // px, opposite drift → depth
          const visible = 1 - Math.min(1, Math.abs(phase) / 0.72);
          content.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0)`;
          content.style.opacity = String(Math.max(0, visible));
        }
      });

      if (bestIdx !== lastActive) {
        lastActive = bestIdx;
        setActive(bestIdx);
      }

      // The index rail is position:fixed, so it must only show while the
      // deck actually occupies the viewport — otherwise it would float over
      // the sections above and below. Fade it out once the deck has scrolled
      // past in either direction.
      const rail = railRef.current;
      if (rail) {
        const deckRect = root.getBoundingClientRect();
        const inView = deckRect.top < vh * 0.5 && deckRect.bottom > vh * 0.5;
        rail.style.opacity = inView ? '1' : '0';
        rail.style.pointerEvents = inView ? 'auto' : 'none';
      }

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scrollToPanel = (idx: number) => {
    const root = rootRef.current;
    const panel = root?.querySelector<HTMLElement>(`[data-idx="${idx}"]`);
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section ref={rootRef} aria-label="Shop by collection" className="heDeck">
      <style>{`
        .heDeck { position: relative; width: 100%; }

        .heDeck-panel {
          position: relative;
          height: 100svh;
          width: 100%;
          overflow: hidden;
          display: grid;
          place-items: center;
          /* Each panel fills a full screen, so scrolling moves one card per
             viewport — the swipe-per-card feel. We deliberately do NOT use
             CSS scroll-snap here: the page is driven by Lenis smooth-scroll,
             and mandatory snap fights Lenis (and would trap the hero and the
             sections below the deck). The full-height panels + parallax give
             the one-card-per-screen rhythm without scroll-jacking. */
        }

        /* Full-bleed background — over-sized so the parallax drift never
           uncovers an edge. This is the layer that becomes a photo later. */
        .heDeck-bg {
          position: absolute;
          inset: -12% 0;
          height: 124%;
          width: 100%;
          will-change: transform;
          z-index: 0;
        }
        /* Edge vignette so each panel reads as its own room and the text
           stays legible over any future photo. */
        .heDeck-panel::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(ellipse 90% 65% at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.25), transparent 30%, transparent 70%, rgba(0,0,0,0.35));
        }

        .heDeck-content {
          position: relative;
          z-index: 2;
          max-width: 820px;
          text-align: center;
          padding: clamp(2rem, 6vw, 4rem) var(--pad-x);
          will-change: transform, opacity;
        }
        .heDeck-kicker {
          display: inline-block;
          font-size: 0.7rem;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 0.9rem;
        }
        .heDeck-index {
          color: var(--gold);
        }
        .heDeck-title {
          font-style: italic;
          font-size: clamp(2.8rem, 12vw, 6.5rem);
          margin: 0;
          line-height: 0.98;
          letter-spacing: -0.02em;
        }
        .heDeck-copy {
          color: var(--ink-soft);
          font-size: clamp(1rem, 2.4vw, 1.2rem);
          margin: 1.4rem auto 2.1rem;
          max-width: 540px;
        }
        .heDeck-cta {
          display: inline-block;
          padding: clamp(0.8rem, 2vw, 0.95rem) clamp(1.5rem, 4vw, 2.1rem);
          border: 1px solid var(--line-strong);
          color: var(--ink);
          border-radius: 999px;
          font-size: clamp(0.74rem, 2vw, 0.82rem);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          transition: background 280ms var(--ease-out), border-color 280ms var(--ease-out);
        }
        .heDeck-cta:hover { background: rgba(212,181,116,0.12); border-color: var(--gold); }

        /* Index rail — right side on desktop, bottom-centre on mobile. */
        .heDeck-rail {
          position: fixed;
          right: clamp(0.75rem, 2.5vw, 1.75rem);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          z-index: 40;
          pointer-events: auto;
          /* Faded in/out by the rAF loop depending on whether the deck is
             in view (it is position:fixed, so it must not float over the
             sections above/below the deck). */
          opacity: 0;
          transition: opacity 300ms var(--ease-out);
        }
        .heDeck-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          border: 1px solid var(--line-strong);
          background: transparent;
          padding: 0; cursor: pointer;
          transition: background 280ms var(--ease-out), transform 280ms var(--ease-out);
        }
        .heDeck-dot[data-on='true'] { background: var(--gold); transform: scale(1.3); }

        @media (max-width: 720px) {
          .heDeck-rail {
            top: auto;
            bottom: clamp(1rem, 4vh, 2rem);
            right: 50%;
            transform: translateX(50%);
            flex-direction: row;
          }
        }
      `}</style>

      {panels.map((p, i) => (
        <article
          key={p.slug}
          data-panel
          data-idx={i}
          className="heDeck-panel"
        >
          <div data-bg className="heDeck-bg" style={{ background: p.tone }} />

          <div data-content className="heDeck-content">
            <span className="heDeck-kicker">
              <span className="heDeck-index">
                {String(i + 1).padStart(2, '0')} / {String(panels.length).padStart(2, '0')}
              </span>
              {'  ·  '}
              {p.collectionLabel}
            </span>
            <h2 className="heDeck-title">{p.label}</h2>
            <p className="heDeck-copy">{p.copy}</p>
            <Link href={`/shop?cat=${p.slug}`} data-hover className="heDeck-cta">
              View {p.label.toLowerCase()}
            </Link>
          </div>
        </article>
      ))}

      {/* Index — also clickable to jump between panels. */}
      <nav ref={railRef} className="heDeck-rail" aria-label="Collection index">
        {panels.map((p, i) => (
          <button
            key={p.slug}
            type="button"
            className="heDeck-dot"
            data-on={active === i}
            aria-label={`Go to ${p.label}`}
            onClick={() => scrollToPanel(i)}
          />
        ))}
      </nav>
    </section>
  );
}
