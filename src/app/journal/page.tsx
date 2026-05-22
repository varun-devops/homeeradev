import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import Reveal from '@/components/Reveal';

export const metadata: Metadata = {
  title: 'Journal — Notes from the studio',
  description:
    'Notes on materials, light, repair and slow living from the Homeera studio.',
  alternates: { canonical: '/journal' },
};

export default function JournalPage() {
  const posts = getAllPosts();

  return (
    <section className="container" style={{ padding: '8rem 0 4rem', maxWidth: 920 }}>
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
          Journal · {posts.length} entries
        </p>
      </Reveal>
      <Reveal delay={80}>
        <h1 style={{ fontStyle: 'italic', marginBottom: '3rem' }}>
          Notes from the studio.
        </h1>
      </Reveal>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 0 }}>
        {posts.map((p, i) => (
          <Reveal key={p.slug} delay={i * 70}>
            <li
              style={{
                borderTop: '1px solid var(--line)',
                paddingTop: '2rem',
                paddingBottom: '2rem',
                ...(i === posts.length - 1 ? { borderBottom: '1px solid var(--line)' } : {}),
              }}
            >
              <Link
                href={`/journal/${p.slug}`}
                data-hover
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '2rem',
                  alignItems: 'baseline',
                }}
              >
                <time
                  dateTime={p.date}
                  style={{
                    fontSize: '0.78rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {p.date.slice(0, 10)}
                </time>
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.5rem, 3vw, 2.4rem)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                    }}
                  >
                    {p.title}
                  </h2>
                  <p style={{ marginTop: '0.5rem', color: 'var(--ink-soft)' }}>{p.excerpt}</p>
                </div>
                <span
                  style={{
                    fontSize: '0.78rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.readTime} min →
                </span>
              </Link>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
