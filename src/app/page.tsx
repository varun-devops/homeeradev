import Link from 'next/link';
import Reveal from '@/components/Reveal';
import HeroVideo from '@/components/HeroVideo';
import ParallaxSections from '@/components/ParallaxSections';

/**
 * Home page.
 *
 *   1. A single hero section — full-screen autoplaying background video.
 *   2. Full-screen parallax scroll sections that zoom "into the screen"
 *      as you scroll, each carrying a collection name.
 *   3. A quiet closing band.
 *
 * The old "shop by collection" deck has been removed in favour of the
 * video hero + parallax storytelling above.
 */
export default function HomePage() {
  return (
    <>
      <HeroVideo />

      <ParallaxSections />

      <section className="container section">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
            gap: 'var(--gap-lg)',
            alignItems: 'center',
          }}
        >
          <Reveal>
            <h2 style={{ fontStyle: 'italic' }}>
              Made by hand,<br />kept for life.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p style={{ color: 'var(--ink-soft)', fontSize: '1.05rem' }}>
              Every object is small-batch and built to repair, not replace.
              We work with a tight circle of makers in brass, wood, marble
              and glass — and we name them on every page.
            </p>
            <Link
              href="/shop"
              data-hover
              style={{
                marginTop: '1.5rem',
                display: 'inline-block',
                fontSize: '0.82rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--ink)',
                paddingBottom: '0.2rem',
              }}
            >
              Browse the shop →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
