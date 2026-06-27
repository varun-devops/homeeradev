import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { getAllProductSlugs } from '@/lib/catalog';

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://homeera.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    '', '/shop', '/about', '/contact', '/journal',
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.8,
  }));

  const slugs = await getAllProductSlugs();
  const productRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/shop/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${base}/journal/${p.slug}`,
    lastModified: new Date(p.date),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...postRoutes];
}
