import createMDX from '@next/mdx';

/**
 * Media is served from ImageKit (backed by Cloudflare R2) — see
 * SETUP_R2_IMAGEKIT.md. Cloudinary stays listed while the migration runs.
 */
const mediaHosts = [
  'ik.imagekit.io',
  'res.cloudinary.com',
  // R2's public bucket subdomain, e.g. pub-<hash>.r2.dev
  '*.r2.dev',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // No browser source maps in prod — smaller, faster deploys.
  productionBrowserSourceMaps: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // The storefront uses <Img> (plain img + ImageKit srcset), so Vercel's
    // optimizer is not on the hot path. These are here so next/image still
    // works anywhere it is reached for.
    remotePatterns: mediaHosts.map((hostname) => ({ protocol: 'https', hostname })),
    // Match the widths lib/media.ts asks ImageKit for.
    deviceSizes: [320, 480, 640, 828, 1080, 1440, 1920],
    minimumCacheTTL: 31536000,
  },
  // Tree-shake heavy libraries to barrel-import only what's used, which
  // trims the client bundle and speeds up first load. framer-motion is the
  // big one here — it is pulled in by the header, the page transition and
  // both shop decks.
  experimental: {
    optimizePackageImports: ['framer-motion', 'lenis'],
  },
  async headers() {
    return [
      {
        // Long-lived immutable cache for static media + fonts.
        source: '/(.*)\.(mp4|webm|webp|avif|woff2|jpe?g|png|svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Hashed Next build assets are safe to cache forever.
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

export default withMDX(nextConfig);
