import dynamic from 'next/dynamic';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

const EmblemHero3D = dynamic(() => import('@/components/EmblemHero3D'), {
  ssr: false,
});

export default function HomePage() {
  return (
    <>
      <section
        style={{
          minHeight: '100svh',
          display: 'grid',
          padding:
            'clamp(6rem, 12vh, 9rem) var(--pad-x) clamp(2.5rem, 7vh, 5rem)',
          position: 'relative',
          overflow: 'hidden',
          // transparent — the global ShardBackground shows through
          background: 'transparent',
          alignContent: 'end',
          justifyItems: 'center',
        }}
      >
        {/* Full-screen interactive 3D emblem */}
        <EmblemHero3D />

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
          <h1
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              textShadow: '0 2px 40px rgba(0,0,0,0.65)',
            }}
          >
              HOME ERA <br /> SINCE 1960 
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 'var(--gap)',
              flexWrap: 'wrap',
              justifyContent: 'center',
              marginTop: 'clamp(1.25rem, 4vw, 2rem)',
              pointerEvents: 'auto',
            }}
          >
            <Link
              href="/shop"
              data-hover
              style={{
                padding: 'clamp(0.8rem, 2.6vw, 0.95rem) clamp(1.3rem, 5vw, 1.8rem)',
                background: 'var(--gold)',
                color: 'var(--bg-deep)',
                borderRadius: 999,
                fontSize: 'clamp(0.74rem, 2.4vw, 0.82rem)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'transform 280ms var(--ease-out), background 280ms var(--ease-out)',
              }}
            >
              Browse the shop
            </Link>
            <Link
              href="/journal"
              data-hover
              style={{
                padding: 'clamp(0.8rem, 2.6vw, 0.95rem) clamp(1.3rem, 5vw, 1.8rem)',
                border: '1px solid var(--line-strong)',
                color: 'var(--ink)',
                borderRadius: 999,
                fontSize: 'clamp(0.74rem, 2.4vw, 0.82rem)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              Read the journal
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div
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
        </div>
      </section>

      <section className="container section">
        <Reveal>
          <p
            style={{
              fontSize: '0.78rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              marginBottom: '1rem',
            }}
          >
            Categories
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 style={{ maxWidth: 780, marginBottom: 'var(--gap-lg)' }}>
            Four corners of a slower home.
          </h2>
        </Reveal>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))',
            gap: 'var(--gap)',
          }}
        >
          {[
            { label: 'Living', desc: 'Sofas, throws, soft places to land.', tone: 'rgba(212,181,116,0.07)' },
            { label: 'Decor', desc: 'Vessels, mirrors, framed quiet.', tone: 'rgba(212,181,116,0.11)' },
            { label: 'Lighting', desc: 'Lamps that hold the evening.', tone: 'rgba(212,181,116,0.15)' },
            { label: 'Outdoor', desc: 'Garden objects and patio calm.', tone: 'rgba(212,181,116,0.09)' },
          ].map((c, i) => (
            <Reveal key={c.label} delay={i * 90}>
              <Link
                href={`/shop?cat=${c.label.toLowerCase()}`}
                data-hover
                style={{
                  display: 'block',
                  borderRadius: 'var(--radius)',
                  aspectRatio: '4 / 5',
                  padding: '1.5rem',
                  background: c.tone,
                  border: '1px solid var(--line)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 600ms var(--ease-out)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                  }}
                >
                  0{i + 1}
                </span>
                <div
                  style={{
                    position: 'absolute',
                    inset: 'auto 1.5rem 1.5rem',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--ink)' }}>
                    {c.label}
                  </div>
                  <div style={{ color: 'var(--ink-soft)', fontSize: '0.92rem' }}>
                    {c.desc}
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

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
