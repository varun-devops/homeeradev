'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * Framer Motion page transition.
 *
 * Replaces the old GSAP curtain/wipe choreography with a single, simple
 * cross-fade keyed on the pathname. Next handles routing; Framer Motion owns
 * the fade in/out. `mode="wait"` lets the outgoing page finish fading before
 * the new one fades in, so there's no overlap flash.
 *
 * This is the ONLY route-level animation now — no GSAP, no link interception.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
