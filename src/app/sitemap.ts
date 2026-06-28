import type { MetadataRoute } from 'next';
import { getAllProductSlugs } from '@/lib/catalog';

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://homeera.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = ['', '/shop', '/contact'].map((p) => ({
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

  return [...staticRoutes, ...productRoutes];
}
