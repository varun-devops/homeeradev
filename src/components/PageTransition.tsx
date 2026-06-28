'use client';

import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Framer Motion page transition.
 *
 * On every route change the `key` flips, which remounts the wrapper and
 * replays its `initial → animate` enter animation. We use a keyed remount
 * rather than `AnimatePresence` exit, because in the Next App Router the
 * router swaps children before an exit can run — so an enter-only transition
 * is the reliable, always-visible choice.
 *
 * The entrance is chosen from the destination route:
 *   • /shop and /shop/*  → swipe-left: the new page slides in from the right
 *     edge (so "View all collections" feels like swiping into the shop).
 *   • everything else     → a soft fade + rise.
 *
 * Renders a plain <div> (not <main>) so pages that supply their own <main>
 * landmark don't end up with an invalid nested <main>. Respects
 * prefers-reduced-motion.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  const isShop = pathname === '/shop' || pathname.startsWith('/shop/');

  // Slide in from the right for the shop ("swipe left" into it); fade+rise
  // for every other route.
  const initial: TargetAndTransition | false = reduce
    ? false
    : isShop
      ? { opacity: 0, x: '100%' }
      : { opacity: 0, y: 14 };

  const animate: TargetAndTransition = isShop
    ? { opacity: 1, x: 0 }
    : { opacity: 1, y: 0 };

  return (
    <motion.div
      key={pathname}
      initial={initial}
      animate={animate}
      transition={{
        duration: isShop ? 0.6 : 0.5,
        ease: [0.16, 1, 0.3, 1],
      }}
      // keep the off-screen incoming page from spilling a horizontal scrollbar
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}
