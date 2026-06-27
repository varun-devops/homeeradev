import Link from 'next/link';
import Reveal from '@/components/Reveal';
// Imported as a normal client component — it's small and uses no heavy
// browser-only deps, so there's nothing to gain from a lazy chunk and
// avoiding `next/dynamic` here sidesteps the webpack chunk-init race
// that produced the "Cannot read properties of undefined" runtime
// error after the file was first added.
import ShopCategoryDeck from '@/components/ShopCategoryDeck';

export default function HomePage() {
  return (
    <>
      <section
        style={{
          minHeight: '100svh',
          display: 'grid',
          // Three-row layout: top CTA · flexible middle (the emblem) · bottom caption.
          // The emblem image is absolutely positioned across the whole
          // section (the `inset: 0` wrapper just below), so the rows only
          // govern where the text / link blocks sit.
          gridTemplateRows: 'auto 1fr auto',
          padding:
            'clamp(6rem, 12vh, 9rem) var(--pad-x) clamp(2.5rem, 7vh, 5rem)',
          position: 'relative',
          overflow: 'hidden',
          // transparent — the global ShardBackground shows through
          background: 'transparent',
          justifyItems: 'center',
        }}
      >
        {/* Static brand emblem — no 3D, no animation, no effects.
            Centred across the whole hero (inset:0 wrapper) exactly where
            the old interactive canvas sat, but it is just a plain image. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon.png"
            alt="Home Era"
            style={{
              width: 'clamp(180px, 42vw, 460px)',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Top CTA — bare transparent link with an underline, sits in
            row 1 above the emblem. `position: relative` + zIndex keeps
            it above the canvas; pointerEvents on the wrapper is none so
            the canvas stays draggable, but the link itself opts back in
            so it remains clickable. */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <Link
            href="/shop"
            data-hover
            style={{
              pointerEvents: 'auto',
              display: 'inline-block',
              background: 'transparent',
              border: 'none',
              padding: '0.4rem 0.1rem',
              color: 'var(--ink)',
              fontSize: 'clamp(0.72rem, 2vw, 0.82rem)',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--ink)',
              textShadow: '0 2px 18px rgba(0,0,0,0.55)',
              transition: 'opacity 240ms var(--ease-out)',
            }}
          >
            Browse shop
          </Link>
        </div>

        {/* Middle row is the emblem's visual home — kept empty so the
            grid reserves space for the absolutely-positioned canvas. */}
        <div aria-hidden="true" />

        {/* Quiet hero caption — small, centred, in the bottom row.
            No CTA buttons; the visitor is invited into the scrollable
            shop deck below. */}
        <div
          style={{
            textAlign: 'center',
            width: '100%',
            maxWidth: 980,
            position: 'relative',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(1.5rem, 2.6vw, 1.4rem)',
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              marginBottom: 10,
              lineHeight: 1.4,
              textShadow: '0 2px 24px rgba(0,0,0,0.55)',
            }}
          >
            HOME ERA · SINCE 1960
          </p>
        </div>

        {/* Scroll cue */}
        {/* <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 'clamp(1.25rem, 4vh, 2rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            fontSize: '0.62rem',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            pointerEvents: 'none',
          }}
        >
          Scroll
        </div> */}
      </section>

      {/* Full-screen, vertically-swipeable category cards. The deck takes
          over the viewport while it's in view and snaps one card per
          screen as the visitor scrolls. */}
      <ShopCategoryDeck />

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
              We work with a tight circle of makers across linen, timber,
              ceramic and brass — and we name them on every page.
            </p>
            <Link
              href="/about"
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
              Our story →
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
