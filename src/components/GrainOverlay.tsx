'use client';

import { useEffect, useRef } from 'react';

/**
 * Global film-grain overlay.
 *
 * A small noise tile is generated, then painted repeatedly across a
 * full-viewport canvas via a canvas pattern and re-randomised a few
 * times a second so the grain shimmers — the same touch resn.co.nz
 * uses with its `grain_canvas`. Kept very low opacity so it only adds
 * texture, never noise you actively notice.
 *
 * Disabled for reduced-motion users; runs at a reduced rate on mobile.
 */
export default function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduce) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const TILE = 128;

    // offscreen tile that holds one patch of noise
    const tile = document.createElement('canvas');
    tile.width = TILE;
    tile.height = TILE;
    const tileCtx = tile.getContext('2d')!;

    let raf = 0;
    let last = 0;
    // grain needn't run at 60fps — ~12fps desktop, ~7fps mobile
    const interval = isMobile ? 140 : 80;

    const resize = () => {
      // a coarse DPR keeps the grain chunky and cheap
      canvas.width = Math.ceil(window.innerWidth / 1.5);
      canvas.height = Math.ceil(window.innerHeight / 1.5);
    };
    resize();

    const refreshTile = () => {
      const img = tileCtx.createImageData(TILE, TILE);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      tileCtx.putImageData(img, 0, 0);
    };

    const paint = () => {
      refreshTile();
      const pattern = ctx.createPattern(tile, 'repeat');
      if (!pattern) return;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    paint();

    const loop = (t: number) => {
      if (t - last >= interval) {
        paint();
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      resize();
      paint();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 9500,
        pointerEvents: 'none',
        opacity: 0.05,
        mixBlendMode: 'overlay',
      }}
    />
  );
}
