import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { getAllPosts, getPost } from '@/lib/blog';

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getPost(params.slug);
  if (!p) return { title: 'Not found' };
  return {
    title: p.title,
    description: p.excerpt,
    alternates: { canonical: `/journal/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.excerpt,
      type: 'article',
      publishedTime: p.date,
      tags: p.tags,
    },
  };
}

async function renderMdx(source: string) {
  const compiled = await compile(source, { outputFormat: 'function-body' });
  const { default: Content } = await run(String(compiled), {
    ...(runtime as unknown as Record<string, unknown>),
    baseUrl: import.meta.url,
  } as never);
  return Content as () => JSX.Element;
}

export default async function JournalArticle({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const Content = await renderMdx(post.body);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    keywords: post.tags.join(', '),
    author: { '@type': 'Organization', name: 'Homeera' },
    publisher: { '@type': 'Organization', name: 'Homeera' },
  };

  return (
    <article className="container" style={{ padding: '8rem 0 4rem', maxWidth: 720 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/journal"
        data-hover
        style={{
          fontSize: '0.78rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-soft)',
        }}
      >
        ← Journal
      </Link>

      <header style={{ marginTop: '2rem', marginBottom: '3rem' }}>
        <time
          dateTime={post.date}
          style={{
            fontSize: '0.78rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--ink-soft)',
          }}
        >
          {post.date.slice(0, 10)} · {post.readTime} min read
        </time>
        <h1 style={{ fontStyle: 'italic', marginTop: '1rem' }}>{post.title}</h1>
        {post.tags.length > 0 && (
          <div
            style={{
              marginTop: '1.5rem',
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
            }}
          >
            {post.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  padding: '0.3rem 0.7rem',
                  borderRadius: 999,
                  border: '1px solid var(--line)',
                  color: 'var(--ink-soft)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <div
        className="prose"
        style={{
          fontSize: '1.1rem',
          lineHeight: 1.75,
          color: 'var(--ink)',
        }}
      >
        <Content />
      </div>
    </article>
  );
}
