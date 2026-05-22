import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: number;
  tags: string[];
  body: string;
};

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export function getAllPosts(): Post[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
      const { data, content } = matter(raw);
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      return {
        slug: file.replace(/\.mdx?$/, ''),
        title: String(data.title ?? 'Untitled'),
        excerpt: String(data.excerpt ?? ''),
        date: String(data.date ?? ''),
        readTime: Math.max(1, Math.round(wordCount / 220)),
        tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
        body: content,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null;
}
