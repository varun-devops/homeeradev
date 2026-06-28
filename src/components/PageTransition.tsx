'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Framer Motion page transition.
 *
 * On every route change the `key` flips, which remounts the wrapper and
 * replays its `initial → animate` enter animation (a soft fade + rise). We use
 * a keyed remount rather than `AnimatePresence` exit, because in the Next App
 * Router the router swaps children before an exit can run — so an enter-only
 * transition is the reliable, always-visible choice.
 *
 * Renders a plain <div> (not <main>) so pages that supply their own <main>
 * landmark don't end up with an invalid nested <main>.
 *
 * This is the only route-level animation. Respects prefers-reduced-motion.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
