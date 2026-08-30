import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
// Lenis needs its own stylesheet to work: it sets `html.lenis body { height:
// auto }` and the `[data-lenis-prevent]` escape hatch that lets an inner
// scroll container (the sub-collection deck) keep its own wheel events.
// Without this import Lenis captures the wheel and the page does not move.
import 'lenis/dist/lenis.css';
import '../styles/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Chrome from '@/components/Chrome';
import { mediaOrigins } from '@/lib/media';

/**
 * Fallback for Helvetica Now, which is a licensed Monotype face and cannot
 * be bundled here. globals.css builds the real stack on top of this: if the
 * licensed woff2 files are present in public/fonts they win, otherwise the
 * page renders in Inter, then the system Helvetica/Arial. Inter is the
 * closest free grotesque, so the fallback is not a jarring one.
 *
 * Cormorant Garamond is gone: the brief is one face everywhere, and keeping
 * a serif loaded that nothing renders is a download for nothing.
 */
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  // 300 matters — the whole site is set Light.
  weight: ['300', '400', '500', '600'],
  preload: true,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://homeera.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Homeera — Quiet, considered home objects',
    template: '%s · Homeera',
  },
  description:
    'Homeera designs calm, considered objects for the home. Home decor and home & garden pieces — built to last, made to breathe.',
  keywords: [
    'home decor',
    'sustainable home goods',
    'minimalist living',
    'lighting',
    'outdoor decor',
    'Homeera',
  ],
  authors: [{ name: 'Homeera' }],
  creator: 'Homeera',
  publisher: 'Homeera',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Homeera',
    title: 'Homeera — Quiet, considered home objects',
    description:
      'Calm, considered objects for the home. Home decor, home & garden.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Homeera' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Homeera',
    description: 'Quiet, considered home objects.',
    images: ['/og.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: { canonical: siteUrl },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Homeera',
  url: siteUrl,
  logo: `${siteUrl}/favicon.png`,
  sameAs: [] as string[],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={sans.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
         * Every product photo comes from the media CDN, so the TLS handshake
         * to it is on the critical path of the first image. Opening it during
         * HTML parse takes that round trip off the visitor's LCP.
         */}
        {mediaOrigins().map((origin) => (
          <link key={origin} rel="preconnect" href={origin} crossOrigin="" />
        ))}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>
        <Chrome>{children}</Chrome>
        {/*
         * Vercel page analytics and Core Web Vitals reporting. Both inject a
         * small script that loads after the page is interactive, so neither
         * competes with the hero or the product images for bandwidth.
         *
         * They only report from a Vercel deployment with the corresponding
         * feature enabled in the project dashboard; locally they no-op.
         */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
