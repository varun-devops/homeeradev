'use client';

import { usePathname } from 'next/navigation';

/**
 * Page-flip route transition.
 *
 * On every route change the `key` flips, which remounts the wrapper — a
 * brand-new DOM node, so the CSS animation runs again from the top. We use a
 * keyed remount rather than an exit animation because in the Next App Router
 * the router swaps children before an exit could run, making an enter-only
 * transition the reliable, always-visible choice.
 *
 * The new page swings in like a turning leaf: hinged on its left edge,
 * rotating out of depth to flat.
 *
 * ── Why plain CSS rather than Framer Motion ────────────────────────────
 * Any element carrying a `transform` (or `perspective`) becomes the
 * containing block for its `position: fixed` descendants — which would pin
 * the shop's full-screen overlay to this wrapper instead of the viewport
 * and quietly break it. A JS animation library leaves its final transform
 * on the node forever; a CSS animation with `animation-fill-mode: backwards`
 * applies the *starting* frame before it runs and then releases the element
 * entirely when it ends, leaving `transform: none` behind. The flip is
 * visible, and nothing lingers.
 *
 * Renders a plain <div> (not <main>) so pages that supply their own <main>
 * landmark don't end up with an invalid nested <main>.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style>{`
        @keyframes hePageFlip {
          from {
            opacity: 0;
            transform: perspective(1800px) rotateY(-58deg);
          }
          60% { opacity: 1; }
          to {
            opacity: 1;
            transform: perspective(1800px) rotateY(0deg);
          }
        }

        .hePageFlip {
          /* Hinged on the left edge — that is what makes it read as a page
             being turned rather than a card being spun. */
          transform-origin: left center;
          backface-visibility: hidden;
          /* Fill mode "backwards", NOT "both": the first frame is applied
             during the delay, and the element is released the moment the
             run ends — so no transform is left on the node. */
          animation: hePageFlip 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }

        /* The globals already clamp transitions under reduced motion, but an
           animation needs saying explicitly — drop the rotation, keep a
           short fade so the page change is still legible. */
        @media (prefers-reduced-motion: reduce) {
          .hePageFlip { animation: none; }
        }
      `}</style>
      <div key={pathname} className="hePageFlip">
        {children}
      </div>
    </>
  );
}
