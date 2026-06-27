'use client';

import { useEffect } from 'react';

export default function SmoothScroll() {
  useEffect(() => {
    let rafId = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;

    (async () => {
      const mod = await import('lenis');
      const Lenis = mod.default;
      // Tuned for a soft, weighty glide site-wide (the "make the whole
      // website feel smooth" ask). A slightly longer duration + a gentle
      // exponential ease give momentum without feeling sluggish; a small
      // wheelMultiplier keeps fast flicks from overshooting. Touch is left
      // on the browser's native momentum (smoothing touch tends to fight
      // the finger) — the home deck's parallax reads raw scroll position
      // each frame, so it stays smooth on mobile regardless.
      lenis = new Lenis({
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.4,
      }) as unknown as { raf: (t: number) => void; destroy: () => void };

      const raf = (time: number) => {
        lenis?.raf(time);
        rafId = requestAnimationFrame(raf);
      };
      rafId = requestAnimationFrame(raf);
    })();

    return () => {
      cancelAnimationFrame(rafId);
      lenis?.destroy();
    };
  }, []);

  return null;
}
