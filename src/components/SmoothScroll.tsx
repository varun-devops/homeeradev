'use client';

import { useEffect } from 'react';

export default function SmoothScroll() {
  useEffect(() => {
    let rafId = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;

    (async () => {
      const mod = await import('lenis');
      const Lenis = mod.default;
      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
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
