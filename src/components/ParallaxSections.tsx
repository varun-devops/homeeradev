'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * Immersive zoom-scroll collection sections (Framer Motion).
 *
 * Each section pins a full-bleed image. As the section scrolls through the
 * viewport, `useScroll` gives a 0→1 progress that we map with
 * `useTransform` into:
 *   • a scale that grows toward the centre (the "zoom into the screen" feel)
 *   • a vertical drift (parallax depth)
 *   • caption opacity + lift that peaks at centre
 * Everything composes with the global Lenis smooth-scroll for a buttery feel.
 */

type Panel = { slug: string; label: string; eyebrow: string; image: string; href: string };

const panels: Panel[] = [
  { slug: 'home-decor', label: 'Home Décor', eyebrow: 'The collection', image: '/images/parallax/home-decor.jpg', href: '/shop' },
  { slug: 'ornaments', label: 'Ornaments', eyebrow: 'Brass, antiqued', image: '/images/parallax/ornaments.jpg', href: '/shop' },
  { slug: 'table-clock', label: 'Table Clocks', eyebrow: 'How the hours land', image: '/images/parallax/table-clock.jpg', href: '/shop' },
  { slug: 'sculptures', label: 'Sculptures', eyebrow: 'Form, held still', image: '/images/parallax/sculptures.jpg', href: '/shop' },
  { slug: 'bar-entertaining', label: 'Bar & Entertaining', eyebrow: 'For the long evening', image: '/images/parallax/bar-entertaining.jpg', href: '/shop' },
  { slug: 'home-garden', label: 'Home & Garden', eyebrow: 'Indoors and out', image: '/images/parallax/home-garden.jpg', href: '/shop' },
];

export default function ParallaxSections() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {panels.map((p) => (
        <ZoomSection key={p.slug} panel={p} />
      ))}
    </div>
  );
}

function ZoomSection({ panel }: { panel: Panel }) {
  const ref = useRef<HTMLElement>(null);
  // Progress from when the section enters the bottom to when it leaves the top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Image: zoom up toward centre (progress 0.5), drift vertically.
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 1.32, 1.15]);
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  // Caption: rise + fade, peaking at centre.
  const capOpacity = useTransform(scrollYProgress, [0.15, 0.5, 0.85], [0, 1, 0]);
  const capY = useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, -60]);

  return (
    <section
      ref={ref}
      style={{
        position: 'relative',
        height: '100svh',
        width: '100%',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <motion.div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-10% 0',
          height: '120%',
          width: '100%',
          backgroundImage: `url(${panel.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          scale,
          y,
          zIndex: 0,
          willChange: 'transform',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'radial-gradient(ellipse 90% 70% at 50% 50%, transparent 42%, rgba(0,0,0,0.6) 100%), linear-gradient(180deg, rgba(0,0,0,0.3), transparent 30%, transparent 65%, rgba(0,0,0,0.45))',
        }}
      />
      <motion.div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: 'var(--pad-x)', opacity: capOpacity, y: capY }}>
        <span style={{ display: 'inline-block', fontSize: '0.72rem', letterSpacing: '0.36em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.9rem' }}>
          {panel.eyebrow}
        </span>
        <h2 style={{ fontStyle: 'italic', margin: 0, fontSize: 'clamp(2.8rem, 12vw, 7rem)', lineHeight: 0.96, letterSpacing: '-0.02em', textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>
          {panel.label}
        </h2>
        <Link href={panel.href} data-hover style={{ display: 'inline-block', marginTop: '1.8rem', fontSize: '0.8rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink)', borderBottom: '1px solid var(--ink)', paddingBottom: '0.25rem' }}>
          Explore
        </Link>
      </motion.div>
    </section>
  );
}
