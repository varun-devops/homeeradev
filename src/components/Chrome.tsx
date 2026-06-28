'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import LoadingGate from '@/components/LoadingGate';
import PageTransition from '@/components/PageTransition';

// Smooth scroll is the one remaining decorative client-only piece.
const SmoothScroll = dynamic(() => import('@/components/SmoothScroll'));

/**
 * Wraps page content with the storefront chrome (header, smooth scroll,
 * Framer Motion page transition) — EXCEPT under /admin, which is a
 * self-contained dashboard with its own layout and must not inherit the
 * marketing chrome.
 *
 * Animation is Framer-Motion-only now: the GSAP curtain transition and the
 * canvas decorations (sparkle/shard background, film grain, custom cursor)
 * have been removed. The page cross-fade lives in PageTransition.
 */
export default function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    // Bare: the admin layout supplies its own full-screen shell.
    return <>{children}</>;
  }

  return (
    <>
      <LoadingGate />
      <SmoothScroll />
      <Header />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
