import type { Metadata } from 'next';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'About — The studio behind Homeera',
  description:
    'Homeera is a small studio making considered objects for a slower home. Meet the makers, materials and intent behind the work.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <article className="container" style={{ padding: '8rem 0 4rem', maxWidth: 880 }}>
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
          About
        </p>
      </Reveal>
      <Reveal delay={80}>
        <h1 style={{ fontStyle: 'italic' }}>
          A small studio,<br />a long horizon.
        </h1>
      </Reveal>

      <Reveal delay={160}>
        <p style={{ fontSize: '1.18rem', color: 'var(--ink-soft)', marginTop: '2rem', lineHeight: 1.7 }}>
          Homeera began with a simple question: what would a home feel like
          if every object in it had been chosen slowly? We answer it one
          piece at a time — in linen, oak, brass, stoneware, paper.
        </p>
      </Reveal>

      <div style={{ marginTop: '4rem', display: 'grid', gap: '3rem' }}>
        <Reveal>
          <h2 style={{ fontSize: '2rem', fontStyle: 'italic' }}>The makers</h2>
          <p style={{ marginTop: '0.75rem', color: 'var(--ink-soft)' }}>
            Eight workshops across four countries. Named on every product
            page. Paid before the customer pays us.
          </p>
        </Reveal>
        <Reveal>
          <h2 style={{ fontSize: '2rem', fontStyle: 'italic' }}>The materials</h2>
          <p style={{ marginTop: '0.75rem', color: 'var(--ink-soft)' }}>
            Solid timber over veneer. Natural fibre over blend. Brass and
            steel chosen because they patina well, not because they hide.
          </p>
        </Reveal>
        <Reveal>
          <h2 style={{ fontSize: '2rem', fontStyle: 'italic' }}>The intent</h2>
          <p style={{ marginTop: '0.75rem', color: 'var(--ink-soft)' }}>
            Built to repair, not replace. Every object ships with a repair
            note and a path back to the workshop that made it.
          </p>
        </Reveal>
      </div>
    </article>
  );
}
