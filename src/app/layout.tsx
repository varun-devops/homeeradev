import type { Metadata, Viewport } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import '../styles/globals.css';
import Chrome from '@/components/Chrome';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
});

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-display',
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
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <head>
        {/*
         * The loading video is intentionally NOT preloaded here: it plays
         * only on the first visit of a session, so an eager <link preload>
         * would force a ~300 KB high-priority download on every page for
         * nothing. The <video preload="auto"> in LoadingGate fetches it
         * exactly when the gate actually renders.
         */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  );
}
