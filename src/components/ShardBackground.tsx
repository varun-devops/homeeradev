'use client';

import { useEffect, useRef } from 'react';
import { EMBLEM_SVG } from './emblemSvg';

/**
 * Global site background.
 *
 * Layered like resn.co.nz's `js-background`:
 *  - pure black base;
 *  - a champagne gold/silver sparkle field, densest at the top and
 *    fading toward the middle;
 *  - slow-drifting crystalline "shards" — faint translucent gold
 *    polygons that catch light, like the resn shard canvas;
 *  - a faint repeating emblem watermark anchored to the bottom.
 *
 * On mobile the shard canvas is skipped and only the (cheap) sparkle
 * field + watermark run, to keep things smooth.
 */
export default function ShardBackground() {
  const sparkleRef = useRef<HTMLCanvasElement>(null);
  const shardRef = useRef<HTMLCanvasElement>(null);

  // faint repeated-emblem watermark, built once
  const watermarkUrl = (() => {
    const svg = EMBLEM_SVG.replace(
      /<path /g,
      '<path fill="#ffffff" opacity="0.9" '
    );
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  })();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isMobile = window.matchMedia('(max-width: 760px)').matches;

    let raf = 0;

    // ---------- sparkle field ----------
    const sCanvas = sparkleRef.current;
    const sCtx = sCanvas?.getContext('2d') ?? null;

    type Sparkle = {
      x: number;
      y: number;
      r: number;
      baseAlpha: number;
      phase: number;
      speed: number;
      gold: boolean;
    };
    let sparkles: Sparkle[] = [];

    // ---------- crystalline shards (desktop only) ----------
    type Shard = {
      x: number;
      y: number;
      size: number;
      rot: number;
      spin: number;
      vx: number;
      vy: number;
      alpha: number;
      sides: number;
    };
    let shards: Shard[] = [];
    const shCanvas = shardRef.current;
    const shCtx = !isMobile ? shCanvas?.getContext('2d') ?? null : null;

    const build = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (sCanvas) {
        sCanvas.width = w;
        sCanvas.height = h;
      }
      sparkles = [];
      const count = Math.floor((w * h) / (isMobile ? 3400 : 2200));
      for (let i = 0; i < count; i++) {
        const yFactor = Math.pow(Math.random(), 2.3);
        sparkles.push({
          x: Math.random() * w,
          y: yFactor * h * 0.62,
          r: Math.random() * 1.1 + 0.3,
          baseAlpha: Math.random() * 0.7 + 0.2,
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.005,
          gold: Math.random() > 0.32,
        });
      }

      if (shCanvas && shCtx) {
        shCanvas.width = w;
        shCanvas.height = h;
        shards = [];
        const shardCount = Math.round((w * h) / 150000);
        for (let i = 0; i < shardCount; i++) {
          shards.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: 40 + Math.random() * 150,
            rot: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.0008,
            vx: (Math.random() - 0.5) * 0.12,
            vy: (Math.random() - 0.5) * 0.12,
            alpha: 0.015 + Math.random() * 0.04,
            sides: 3 + Math.floor(Math.random() * 3),
          });
        }
      }
    };
    build();

    const drawSparkles = (t: number) => {
      if (!sCanvas || !sCtx) return;
      const w = sCanvas.width;
      const h = sCanvas.height;
      sCtx.clearRect(0, 0, w, h);
      for (const s of sparkles) {
        const flicker = reduce
          ? 1
          : 0.45 + 0.55 * Math.sin(t * s.speed + s.phase);
        const a = s.baseAlpha * flicker;
        sCtx.beginPath();
        sCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        sCtx.fillStyle = s.gold
          ? `rgba(212, 181, 116, ${a})`
          : `rgba(235, 235, 240, ${a * 0.6})`;
        sCtx.fill();
      }
    };

    const drawShards = () => {
      if (!shCanvas || !shCtx) return;
      const w = shCanvas.width;
      const h = shCanvas.height;
      shCtx.clearRect(0, 0, w, h);
      for (const s of shards) {
        if (!reduce) {
          s.x += s.vx;
          s.y += s.vy;
          s.rot += s.spin;
        }
        // wrap around the viewport
        if (s.x < -s.size) s.x = w + s.size;
        if (s.x > w + s.size) s.x = -s.size;
        if (s.y < -s.size) s.y = h + s.size;
        if (s.y > h + s.size) s.y = -s.size;

        shCtx.save();
        shCtx.translate(s.x, s.y);
        shCtx.rotate(s.rot);
        shCtx.beginPath();
        for (let i = 0; i < s.sides; i++) {
          const ang = (i / s.sides) * Math.PI * 2;
          const px = Math.cos(ang) * s.size;
          const py = Math.sin(ang) * s.size * 0.62;
          if (i === 0) shCtx.moveTo(px, py);
          else shCtx.lineTo(px, py);
        }
        shCtx.closePath();
        const grad = shCtx.createLinearGradient(
          -s.size,
          -s.size,
          s.size,
          s.size
        );
        grad.addColorStop(0, `rgba(212, 181, 116, ${s.alpha})`);
        grad.addColorStop(1, `rgba(232, 200, 133, 0)`);
        shCtx.fillStyle = grad;
        shCtx.fill();
        shCtx.strokeStyle = `rgba(212, 181, 116, ${s.alpha * 1.4})`;
        shCtx.lineWidth = 0.6;
        shCtx.stroke();
        shCtx.restore();
      }
    };

    const loop = (t: number) => {
      drawSparkles(t);
      drawShards();
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      build();
      if (reduce) loop(0);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        // pure-black base with a faint cool lift toward the middle
        background:
          'radial-gradient(ellipse 95% 60% at 50% 42%, #141414 0%, #0a0a0a 55%, #000000 100%)',
        overflow: 'hidden',
      }}
    >
      {/* crystalline shard layer */}
      <canvas
        ref={shardRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* champagne sparkle field — top */}
      <canvas
        ref={sparkleRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {/* faint repeating emblem watermark — bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '50%',
          opacity: 0.05,
          backgroundImage: watermarkUrl,
          backgroundRepeat: 'repeat',
          backgroundSize: '110px 104px',
          maskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
        }}
      />
    </div>
  );
}
