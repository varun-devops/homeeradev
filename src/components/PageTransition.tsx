'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { forceUnlockScroll } from '@/lib/scroll-lock';

/**
 * Directional page-fold route transition.
 *
 * On every route change the `key` flips, which remounts the wrapper — a
 * brand-new DOM node, so the CSS animation runs again from the top. We use a
 * keyed remount rather than an exit animation because in the Next App Router
 * the router swaps children before an exit could run, making an enter-only
 * transition the reliable, always-visible choice.
 *
 * Direction mirrors the navigation, so the motion tells you which way you
 * just moved:
 *   • forward (a link) → folds in from the RIGHT, hinged on its right edge;
 *   • back (browser Back / Alt+←) → folds in from the LEFT, hinged left.
 *
 * Back is detected via `popstate`, which fires before the pathname updates —
 * so it sets a flag that the next path change consumes.
 *
 * ── Why plain CSS rather than a JS animation library ───────────────────
 * Any element carrying a `transform` (or `perspective`) becomes the
 * containing block for its `position: fixed` descendants — which would pin
 * the shop's full-screen overlay to this wrapper instead of the viewport
 * and quietly break it. A JS library leaves its final transform on the node
 * forever; a CSS animation with `animation-fill-mode: backwards` applies the
 * starting frame before it runs and then releases the element entirely when
 * it ends, leaving `transform: none` behind. The fold is visible, and
 * nothing lingers.
 *
 * Renders a plain <div> (not <main>) so pages that supply their own <main>
 * landmark don't end up with an invalid nested <main>.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Set by popstate, consumed by the next pathname change.
  const poppedRef = useRef(false);
  // The direction the CURRENT pathname was arrived at.
  const dirRef = useRef<'fwd' | 'back'>('fwd');
  const lastPathRef = useRef(pathname);

  useEffect(() => {
    const onPop = () => {
      poppedRef.current = true;
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Safety net: an overlay open on the page being left (the shop deck, the
  // header's mobile drawer) locks body scroll and releases it on unmount —
  // but a stuck lock reads, on the new page, as "this page doesn't scroll
  // on mobile", and it isn't obvious from there which earlier overlay is
  // responsible. Every real navigation lands here, so force scroll open
  // on each one rather than trust every current and future overlay to
  // release its lock in every case.
  useEffect(() => {
    forceUnlockScroll();
  }, [pathname]);

  // Derived during render so the class is correct on the very first frame of
  // the new page — a useEffect would run a frame too late and the fold would
  // start in the wrong direction. Idempotent: re-renders on the same
  // pathname leave both refs untouched.
  if (lastPathRef.current !== pathname) {
    dirRef.current = poppedRef.current ? 'back' : 'fwd';
    poppedRef.current = false;
    lastPathRef.current = pathname;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* A soft drift rather than a door swing.
           The old 62deg rotateY threw the whole page edge-on and snapped it
           flat in 720ms, which on a photography-led site distorted the very
           images it was revealing. This keeps the directional read -- forward
           enters from the right, back from the left -- with a shallow angle
           and a small slide, over a longer, gentler curve. */
        @keyframes hePageFoldFwd {
          from { opacity: 0; transform: perspective(2200px) translate3d(3.5%, 0, 0) rotateY(7deg) scale(0.985); }
          to   { opacity: 1; transform: perspective(2200px) translate3d(0, 0, 0) rotateY(0deg) scale(1); }
        }
        @keyframes hePageFoldBack {
          from { opacity: 0; transform: perspective(2200px) translate3d(-3.5%, 0, 0) rotateY(-7deg) scale(0.985); }
          to   { opacity: 1; transform: perspective(2200px) translate3d(0, 0, 0) rotateY(0deg) scale(1); }
        }

        .hePageFold {
          backface-visibility: hidden;
          /* Fill mode "backwards", NOT "both": the first frame is applied
             during the delay, and the element is released the moment the
             run ends — so no transform is left on the node. */
          animation-duration: 900ms;
          /* Long tail, no overshoot: most of the motion happens early and
             the last of it settles slowly, which is what reads as smooth
             rather than merely slow. */
          animation-timing-function: cubic-bezier(0.22, 0.61, 0.24, 1);
          animation-fill-mode: backwards;
        }
        .hePageFold--fwd {
          transform-origin: right center;
          animation-name: hePageFoldFwd;
        }
        .hePageFold--back {
          transform-origin: left center;
          animation-name: hePageFoldBack;
        }

        /* The globals clamp transitions under reduced motion, but an
           animation needs saying explicitly. */
        @media (prefers-reduced-motion: reduce) {
          .hePageFold { animation: none; }
        }
      ` }} />
      <div key={pathname} className={`hePageFold hePageFold--${dirRef.current}`}>
        {children}
      </div>
    </>
  );
}
