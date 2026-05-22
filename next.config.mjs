import createMDX from '@next/mdx';

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
  },
  // Tree-shake heavy libraries to barrel-import only what's used, which
  // trims the client bundle and speeds up first load.
  experimental: {
    optimizePackageImports: ['gsap', 'three', 'lenis'],
  },
  async headers() {
    return [
      {
        // Long-lived immutable cache for static media + fonts.
        source: '/(.*)\\.(mp4|webm|webp|avif|woff2|jpe?g|png|svg)',
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
