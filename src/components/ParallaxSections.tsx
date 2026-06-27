'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

/**
 * Full-screen parallax scroll sections for the home page.
 *
 * Each section is a full-bleed image with its collection name. As the
 * visitor scrolls, the image *scales up and drifts* — reading as though
 * you're moving into the screen / into the room — while the title rises
 * and fades. One rAF loop reads each section's offset from the viewport
 * centre and writes transforms directly, so it composes with the global
 * Lenis smooth scroll.
 *
 * The names come from the real catalogue taxonomy. Each links into the
 * shop filtered to that collection/sub-collection.
 */

type Panel = {
  slug: string;
  label: string;
  eyebrow: string;
  image: string;
  href: string;
};

const panels: Panel[] = [
  {
    slug: 'home-decor',
    label: 'Home Décor',
    eyebrow: 'The collection',
    image: '/images/parallax/home-decor.jpg',
    href: '/shop',
  },
  {
    slug: 'ornaments',
    label: 'Ornaments',
    eyebrow: 'Brass, antiqued',
    image: '/images/parallax/ornaments.jpg',
    href: '/shop',
  },
  {
    slug: 'table-clock',
    label: 'Table Clocks',
    eyebrow: 'How the hours land',
    image: '/images/parallax/table-clock.jpg',
    href: '/shop',
  },
  {
    slug: 'sculptures',
    label: 'Sculptures',
    eyebrow: 'Form, held still',
    image: '/images/parallax/sculptures.jpg',
    href: '/shop',
  },
  {
    slug: 'bar-entertaining',
    label: 'Bar & Entertaining',
    eyebrow: 'For the long evening',
    image: '/images/parallax/bar-entertaining.jpg',
    href: '/shop',
  },
  {
    slug: 'home-garden',
    label: 'Home & Garden',
    eyebrow: 'Indoors and out',
    image: '/images/parallax/home-garden.jpg',
    href: '/shop',
  },
];

export default function ParallaxSections() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>('[data-px]'),
    );
    const imgs = sections.map((s) => s.querySelector<HTMLElement>('[data-px-img]'));
    const caps = sections.map((s) => s.querySelector<HTMLElement>('[data-px-cap]'));

    let raf = 0;
    const update = () => {
      const vh = window.innerHeight;
      const mid = vh / 2;

      sections.forEach((section, i) => {
        const rect = section.getBoundingClientRect();
        const sectionMid = rect.top + rect.height / 2;
        const phase = (sectionMid - mid) / vh; // -1 above … 0 centre … +1 below

        if (reduce) return;

        // Image: zoom from 1.0 → ~1.28 as it passes through centre, and
        // drift vertically — the "moving into the screen" feel.
        const img = imgs[i];
        if (img) {
          const zoom = 1.12 + (0.18 * (1 - Math.min(1, Math.abs(phase))));
          const drift = phase * vh * 0.12;
          img.style.transform = `translate3d(0, ${(-drift).toFixed(2)}px, 0) scale(${zoom.toFixed(3)})`;
        }

        // Caption: rise + fade as it leaves the centre band.
        const cap = caps[i];
        if (cap) {
          const lift = phase * vh * 0.16;
          const vis = 1 - Math.min(1, Math.abs(phase) / 0.7);
          cap.style.transform = `translate3d(0, ${lift.toFixed(2)}px, 0)`;
          cap.style.opacity = String(Math.max(0, vis));
        }
      });

      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={rootRef} className="hePx">
      <style>{`
        .hePx { position: relative; width: 100%; }
        .hePx-sec {
          position: relative;
          height: 100svh; width: 100%;
          overflow: hidden;
          display: grid; place-items: center;
        }
        .hePx-img {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          background-size: cover; background-position: center;
          will-change: transform;
          z-index: 0;
        }
        .hePx-sec::after {
          content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 90% 70% at 50% 50%, transparent 42%, rgba(0,0,0,0.6) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.3), transparent 30%, transparent 65%, rgba(0,0,0,0.45));
        }
        .hePx-cap {
          position: relative; z-index: 2; text-align: center;
          padding: var(--pad-x); will-change: transform, opacity;
        }
        .hePx-eyebrow {
          display: inline-block;
          font-size: 0.72rem; letter-spacing: 0.36em; text-transform: uppercase;
          color: var(--gold); margin-bottom: 0.9rem;
        }
        .hePx-title {
          font-style: italic; margin: 0;
          font-size: clamp(2.8rem, 12vw, 7rem); line-height: 0.96; letter-spacing: -0.02em;
          text-shadow: 0 4px 40px rgba(0,0,0,0.5);
        }
        .hePx-link {
          display: inline-block; margin-top: 1.8rem;
          font-size: 0.8rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--ink); border-bottom: 1px solid var(--ink);
          padding-bottom: 0.25rem;
        }
      `}</style>

      {panels.map((p) => (
        <section key={p.slug} data-px className="hePx-sec">
          <div
            data-px-img
            className="hePx-img"
            style={{ backgroundImage: `url(${p.image})` }}
          />
          <div data-px-cap className="hePx-cap">
            <span className="hePx-eyebrow">{p.eyebrow}</span>
            <h2 className="hePx-title">{p.label}</h2>
            <Link href={p.href} data-hover className="hePx-link">
              Explore
            </Link>
          </div>
        </section>
      ))}
    </div>
  );
}
