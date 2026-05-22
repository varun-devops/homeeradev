'use client';

import { useEffect, useRef } from 'react';

/**
 * Interactive water-surface ripple layer for the hero.
 *
 * A WebGL fragment shader maintains a height field that is disturbed
 * where the pointer moves or touches the screen. Disturbances propagate
 * outward as rings and decay over time — a light "water surface" the
 * cursor pushes through. The surface itself is near-invisible; what you
 * see is the caustic shimmer and a faint refraction of the dark
 * background, so it reads as a subtle wet sheen rather than a literal
 * pool.
 *
 * On mobile (or without WebGL) it falls back to a cheap Canvas2D ripple
 * so low-end phones stay smooth.
 */
export default function WaterRipple() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const isMobile = window.matchMedia('(max-width: 760px)').matches;

    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    // ---- mobile / reduced-motion: lightweight Canvas2D ripple ----
    const runLite = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      type Ring = { x: number; y: number; t: number; strength: number };
      let rings: Ring[] = [];
      const start = performance.now();

      const resize = () => {
        const r = wrap.getBoundingClientRect();
        canvas.width = r.width;
        canvas.height = r.height;
      };
      resize();
      window.addEventListener('resize', resize);

      const addRing = (cx: number, cy: number, strength: number) => {
        if (rings.length > 14) rings.shift();
        rings.push({
          x: cx,
          y: cy,
          t: (performance.now() - start) / 1000,
          strength,
        });
      };
      // Listen on window — the wrapper itself is pointer-events:none so
      // events still reach the 3D emblem below.
      const onPointer = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        if (x < 0 || y < 0 || x > r.width || y > r.height) return;
        addRing(x, y, 1);
      };
      window.addEventListener('pointerdown', onPointer);
      // occasional auto-ripple so it feels alive
      const idle = window.setInterval(() => {
        if (document.hidden) return;
        addRing(
          canvas.width * (0.3 + Math.random() * 0.4),
          canvas.height * (0.3 + Math.random() * 0.4),
          0.4
        );
      }, 3600);

      const draw = () => {
        if (disposed) return;
        const now = (performance.now() - start) / 1000;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        rings = rings.filter((r) => now - r.t < 2.6);
        for (const ring of rings) {
          const age = now - ring.t;
          const radius = age * 220;
          const alpha = Math.max(0, 1 - age / 2.6) * 0.22 * ring.strength;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(212,181,116,${alpha})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
        raf = requestAnimationFrame(draw);
      };
      if (!reduce) raf = requestAnimationFrame(draw);

      cleanup = () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointerdown', onPointer);
        window.clearInterval(idle);
      };
    };

    // ---- desktop: WebGL ripple height-field ----
    const runWebGL = async () => {
      const { Renderer, Program, Mesh, Triangle, Vec2 } = await import('ogl');
      if (disposed) return;

      let renderer: InstanceType<typeof Renderer>;
      try {
        renderer = new Renderer({
          canvas,
          alpha: true,
          dpr: Math.min(window.devicePixelRatio || 1, 2),
        });
      } catch {
        runLite();
        return;
      }
      const gl = renderer.gl;
      gl.clearColor(0, 0, 0, 0);

      const vertex = /* glsl */ `
        attribute vec2 position;
        attribute vec2 uv;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      // Up to 10 active ripples; each ring expands and decays.
      const fragment = /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 uRes;
        uniform float uTime;
        uniform vec4 uRipples[10]; // xy = center, z = startTime, w = strength

        void main() {
          vec2 uv = vUv;
          // aspect-correct so rings stay circular
          vec2 aspect = vec2(uRes.x / uRes.y, 1.0);

          float height = 0.0;
          for (int i = 0; i < 10; i++) {
            vec4 r = uRipples[i];
            if (r.w <= 0.0) continue;
            float age = uTime - r.z;
            if (age < 0.0 || age > 2.8) continue;
            vec2 d = (uv - r.xy) * aspect;
            float dist = length(d);
            // expanding ring with a soft falloff and time decay
            float ring = sin(dist * 26.0 - age * 7.0);
            float envelope = exp(-age * 1.6) * exp(-dist * 3.2);
            height += ring * envelope * r.w;
          }

          // derive a surface normal from the height field for shading
          float shimmer = height * 0.5 + 0.5;
          // caustic-style gold sheen on the wave crests
          float crest = pow(max(0.0, height), 2.0);
          vec3 col = vec3(0.83, 0.71, 0.45) * crest * 0.5;
          // faint cool fill in the troughs
          col += vec3(0.05, 0.06, 0.08) * max(0.0, -height) * 0.6;

          float alpha = clamp(abs(height) * 0.5, 0.0, 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `;

      const ripples = new Float32Array(10 * 4);
      const program = new Program(gl, {
        vertex,
        fragment,
        transparent: true,
        uniforms: {
          uRes: { value: new Vec2(1, 1) },
          uTime: { value: 0 },
          uRipples: { value: ripples },
        },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

      const resize = () => {
        const r = wrap.getBoundingClientRect();
        renderer.setSize(r.width, r.height);
        program.uniforms.uRes.value.set(r.width, r.height);
      };
      resize();
      window.addEventListener('resize', resize);

      const start = performance.now();
      let slot = 0;
      const addRipple = (x: number, y: number, strength: number) => {
        const i = slot * 4;
        ripples[i] = x;
        ripples[i + 1] = y;
        ripples[i + 2] = (performance.now() - start) / 1000;
        ripples[i + 3] = strength;
        slot = (slot + 1) % 10;
      };

      // Listen on window so the surface reacts everywhere while pointer
      // events still pass through to the 3D emblem (wrapper is
      // pointer-events:none). Coordinates are clamped to the hero box.
      const inBox = (e: PointerEvent) => {
        const r = wrap.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = 1 - (e.clientY - r.top) / r.height;
        if (x < 0 || x > 1 || y < 0 || y > 1) return null;
        return { x, y };
      };
      // throttle move-ripples so we don't spawn one every pixel
      let lastMove = 0;
      const onMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastMove < 70) return;
        lastMove = now;
        const p = inBox(e);
        if (p) addRipple(p.x, p.y, 0.5);
      };
      const onDown = (e: PointerEvent) => {
        const p = inBox(e);
        if (p) addRipple(p.x, p.y, 1);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerdown', onDown);

      // gentle auto-ripples so the surface is never fully still
      const idle = window.setInterval(() => {
        if (document.hidden) return;
        addRipple(
          0.25 + Math.random() * 0.5,
          0.25 + Math.random() * 0.5,
          0.35
        );
      }, 3200);

      const loop = () => {
        if (disposed) return;
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        program.uniforms.uTime.value = (performance.now() - start) / 1000;
        renderer.render({ scene: mesh });
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerdown', onDown);
        window.clearInterval(idle);
        const ext = gl.getExtension('WEBGL_lose_context');
        ext?.loseContext();
      };
    };

    if (isMobile || reduce) {
      runLite();
    } else {
      runWebGL();
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        // sits above the shard background, below the 3D emblem; lets
        // pointer events through to the emblem canvas underneath
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
