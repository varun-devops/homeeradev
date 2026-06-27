'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoadingGate from '@/components/LoadingGate';
import CurtainTransition from '@/components/CurtainTransition';

// Decorative client-only pieces, loaded after first paint.
const SmoothScroll = dynamic(() => import('@/components/SmoothScroll'));
const Cursor = dynamic(() => import('@/components/Cursor'));
const ShardBackground = dynamic(() => import('@/components/ShardBackground'));
const GrainOverlay = dynamic(() => import('@/components/GrainOverlay'));

/**
 * Wraps page content with the storefront chrome (header, footer, smooth
 * scroll, cursor, background, transitions) — EXCEPT under /admin, which is
 * a self-contained dashboard with its own layout and must not inherit the
 * marketing chrome or the smooth-scroll / custom-cursor behaviour.
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
      <ShardBackground />
      <LoadingGate />
      <SmoothScroll />
      <Cursor />
      <CurtainTransition />
      <Header />
      <main>{children}</main>
      <Footer />
      <GrainOverlay />
    </>
  );
}
