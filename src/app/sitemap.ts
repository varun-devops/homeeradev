import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { products } from '@/lib/products';

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://homeera.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    '', '/shop', '/about', '/contact', '/journal',
  ].map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '' ? 1 : 0.8,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/shop/${p.id}`,
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
