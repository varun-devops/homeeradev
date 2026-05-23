'use client';

import { useEffect, useRef } from 'react';
import { EMBLEM_SVG } from './emblemSvg';

/**
 * Interactive 3D "HOME ERA" emblem for the hero section.
 *
 * Ports the extruded-emblem scene from the standalone 3D asset:
 * the traced logo SVG is extruded into a metallic white solid, lit
 * with a warm key/gold-rim setup and bloom, then revealed petal by
 * petal on mount. Drag (or touch-drag) rotates; scroll/pinch zooms.
 *
 * Fills its parent edge to edge (no border, no sizing box) so it can
 * act as a full-screen hero background — responsive on mobile, tablet
 * and desktop via a ResizeObserver and an aspect-aware camera.
 */
export default function EmblemHero3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | null = null;

    (async () => {
      const THREE = await import('three');
      const { OrbitControls } = await import(
        'three/examples/jsm/controls/OrbitControls.js'
      );
      const { EffectComposer } = await import(
        'three/examples/jsm/postprocessing/EffectComposer.js'
      );
      const { RenderPass } = await import(
        'three/examples/jsm/postprocessing/RenderPass.js'
      );
      const { UnrealBloomPass } = await import(
        'three/examples/jsm/postprocessing/UnrealBloomPass.js'
      );
      const { OutputPass } = await import(
        'three/examples/jsm/postprocessing/OutputPass.js'
      );
      const { RoomEnvironment } = await import(
        'three/examples/jsm/environments/RoomEnvironment.js'
      );
      const { SVGLoader } = await import(
        'three/examples/jsm/loaders/SVGLoader.js'
      );

      if (disposed) return;

      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;

      const sizeOf = () => {
        const r = wrap.getBoundingClientRect();
        return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
      };
      let { w, h } = sizeOf();

      // On phones, transmission + dispersion glass is too GPU-heavy —
      // run a lighter material there.
      const isMobile = window.matchMedia('(max-width: 760px)').matches;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      renderer.setSize(w, h, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      // Pulled down so the emblem reads as a calm cut gem rather than a
      // bright, sparkling object. Light comes from the facets, not from
      // overall scene brightness.
      renderer.toneMappingExposure = 0.72;
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      scene.background = null;

      const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
      camera.position.set(0, 0, 9);

      // The emblem's world span is known and fixed (see `targetHeight`
      // below). `fitDistance` computes — geometrically, not by guesswork —
      // the exact camera distance that frames that span at the current
      // aspect ratio, so the emblem stays perfectly centred and fully
      // visible on any screen: tall phones, tablets, ultrawide desktops.
      const EMBLEM_SPAN = 2.4; // matches `targetHeight`
      // Slightly more breathing room: the bulkier diamond extrusion adds
      // visual depth, so we pull the camera back a touch to keep the
      // emblem comfortably framed during rotation.
      const FRAME_PAD = 1.42;
      const fitDistance = () => {
        const aspect = w / h;
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
        // Distance needed to fit the span vertically vs. horizontally;
        // take the larger so the emblem fits on the *tighter* axis —
        // that is what keeps portrait phones from cropping it.
        const distV = EMBLEM_SPAN / (2 * Math.tan(vFov / 2));
        const distH = EMBLEM_SPAN / (2 * Math.tan(hFov / 2));
        const d = Math.max(distV, distH) * FRAME_PAD;
        return THREE.MathUtils.clamp(d, 6.5, 18);
      };

      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

      // Cut-gem lighting: a single firm key, a tight cool rim that
      // catches the bevel edges, and very low ambient. This is what
      // makes each facet read as its own plane of light instead of the
      // whole emblem glowing uniformly.
      const key = new THREE.DirectionalLight(0xffffff, 1.1);
      key.position.set(3.5, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xdde2ea, 0.65);
      rim.position.set(-4, 2.5, -3);
      scene.add(rim);
      scene.add(new THREE.AmbientLight(0x14161a, 0.45));

      // Transparent diamond PBR.
      //
      // The goal is a clear, broken-glass / cut-diamond look:
      //  • You can see *through* the emblem, but light bends inside it
      //    (high IOR + thick body = visible internal refraction).
      //  • As the emblem rotates, prismatic colour splits flicker along
      //    the refractive edges — the "dispersion" of a real diamond.
      //  • Each flat face is a discrete reflective plane (flatShading
      //    + sharp non-bevelled corners), so light snaps from facet to
      //    facet rather than smoothly sliding across a curve.
      //
      // Notes:
      //  • `dispersion` is a real MeshPhysicalMaterial property only in
      //    three r167+. This project is on r160, so we approximate the
      //    same prismatic edge using a thin-film `iridescence` layer
      //    tuned to the visible spectrum. The visual result reads the
      //    same: a coloured colour-split that rides the refractive edges
      //    as the emblem turns.
      //  • Mobile gets a lighter spec because transmission + iridescence
      //    is GPU-heavy — the dispersion still reads clearly, just less
      //    saturated.
      const whiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        // Very low roughness → crisp mirror-bright refractive edges,
        // which is what carries the dispersion colour split.
        roughness: isMobile ? 0.04 : 0.02,

        // ——— Transmission stack: the "see-through diamond" ———
        transmission: 1,
        // IOR 2.4 is real diamond. The high value is what creates the
        // strong internal bend / TIR sparkle as the emblem rotates.
        ior: 2.42,
        // Thick body so refraction travels visibly inside the emblem
        // instead of looking like a thin glass shell.
        thickness: isMobile ? 1.8 : 3.2,
        attenuationColor: new THREE.Color(0xffffff),
        attenuationDistance: 4.5,
        envMapIntensity: 1.4,

        // ——— Surface coat for facet highlights ———
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        reflectivity: 0.6,

        // ——— Prismatic dispersion (r160 stand-in for `dispersion`) ——
        // Thin-film iridescence with a wide thickness range yields the
        // rainbow colour-split along refractive edges that reads as the
        // diamond's spectral dispersion.
        iridescence: isMobile ? 0.55 : 0.9,
        iridescenceIOR: 1.5,
        iridescenceThicknessRange: [100, 720],

        // Per-face flat shading → every triangle of the extrusion is its
        // own reflective plane. Combined with no bevel (see extrude
        // settings) this gives a sharp-cornered, faceted diamond body.
        flatShading: true,

        // Transmission renders via its own pass; alpha-blend transparent
        // would re-sort the overlapping petals every frame and flicker.
        transparent: false,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
      });

      // Parse traced SVG and build the extruded 3D group.
      const svgData = new SVGLoader().parse(EMBLEM_SVG);

      // Per-path reveal timing: center petal first, side petals mid,
      // inner tips last, stem early-ish.
      const revealDelays = [0.05, 0.3, 0.3, 0.5, 0.5, 0.15];

      // Sharp-cornered diamond extrusion.
      //
      // bevelEnabled is OFF: bevels round the silhouette and soften the
      // refractive edges — the opposite of what a cut-diamond profile
      // should do. With no bevel the SVG's vector corners stay razor-
      // sharp and every edge becomes a hard refractive boundary, which
      // is exactly where the iridescent dispersion splits the colour.
      //
      // curveSegments is kept moderate so any curved parts of the SVG
      // still tessellate into discrete short straight segments — those
      // become the diamond's "facets" when combined with flatShading.
      const extrudeSettings = {
        depth: 28,
        bevelEnabled: false,
        curveSegments: 5,
      };

      const rawGroup = new THREE.Group();
      svgData.paths.forEach((path, pi) => {
        SVGLoader.createShapes(path).forEach((shape) => {
          const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const mesh = new THREE.Mesh(geom, whiteMat);
          mesh.userData.delay = revealDelays[pi] ?? 0.5;
          rawGroup.add(mesh);
        });
      });

      // SVGLoader produces Y-down geometry; flip the whole group once.
      const orientGroup = new THREE.Group();
      orientGroup.scale.y = -1;
      orientGroup.add(rawGroup);

      const emblemGroup = new THREE.Group();
      emblemGroup.add(orientGroup);
      scene.add(emblemGroup);

      // Recenter + scale to a fixed world height.
      const box = new THREE.Box3().setFromObject(emblemGroup);
      const size = box.getSize(new THREE.Vector3());
      const ctr = box.getCenter(new THREE.Vector3());
      rawGroup.position.x -= ctr.x;
      rawGroup.position.y += ctr.y;
      rawGroup.position.z -= ctr.z;

      const targetHeight = 2.4;
      emblemGroup.scale.setScalar(targetHeight / Math.max(size.x, size.y));
      emblemGroup.position.y = 0;

      rawGroup.children.forEach((child) => {
        child.userData.basePos = child.position.clone();
      });

      // Post-processing: bloom is intentionally near-zero strength so
      // the emblem doesn't glow or sparkle — diamond cuts read by hard
      // facet contrast, not by haze. The pass is kept in the chain so
      // future tuning (or a "shine" mode) can dial it back up cheaply.
      const composer = new EffectComposer(renderer);
      composer.setSize(w, h);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        0.0,   // strength
        0.4,   // radius
        1.0    // threshold — high enough that nothing bloom-qualifies
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;
      controls.enablePan = false;
      // Zoom bounds bracket the full `fitDistance` range (6.5–18) so the
      // auto-fit framing is never clamped on extreme aspect ratios.
      controls.minDistance = 5.5;
      controls.maxDistance = 19;
      controls.target.set(0, 0, 0);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.rotateSpeed = 0.7;
      // Keep page scroll usable on touch — drag rotates, two-finger scrolls.
      controls.enableZoom = true;
      controls.zoomSpeed = 0.6;

      // Frame the emblem for the starting aspect ratio.
      camera.position.set(0, 0, fitDistance());
      let userZoomed = false;
      controls.addEventListener('start', () => {
        // mark a manual zoom so resize stops overriding the user
        userZoomed = true;
      });

      // Reveal animation.
      const REVEAL_DURATION = 4.5;
      let progress = 0;
      let playing = true;
      let lastTs = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };

      const applyReveal = (p: number) => {
        rawGroup.children.forEach((child) => {
          const dN = child.userData.delay as number;
          const span = 0.32;
          const local = THREE.MathUtils.clamp((p - dN) / span, 0, 1);
          const t = easeOutCubic(local);
          const tBack = easeOutBack(local);
          child.scale.setScalar(0.001 + tBack);
          child.visible = t > 0.001;
          const basePos = child.userData.basePos as THREE.Vector3;
          child.position.y = basePos.y + (1 - t) * 30;
        });
        emblemGroup.rotation.y = (1 - easeOutCubic(p)) * 0.4;
      };
      applyReveal(0);

      // Respect reduced-motion: snap to finished state, no auto-rotate.
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (reduceMotion) {
        progress = 1;
        playing = false;
        controls.autoRotate = false;
        applyReveal(1);
      }

      const resize = () => {
        const next = sizeOf();
        w = next.w;
        h = next.h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        bloomPass.setSize(w, h);
        // Re-frame on viewport changes (rotation, breakpoint) until the
        // visitor takes manual control of the zoom.
        if (!userZoomed) {
          const d = fitDistance();
          const dir = camera.position.clone().sub(controls.target).normalize();
          camera.position.copy(controls.target).addScaledVector(dir, d);
        }
      };
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);
      window.addEventListener('resize', resize);

      // If the visitor navigates away and comes back, the canvas can be
      // remounted while inline transforms from the page-transition
      // timeline are still on the element. Clear them and force a
      // re-fit on the next two frames so the camera frames the emblem
      // dead-centre in the freshly-mounted section regardless of any
      // residual CSS state.
      canvas.style.transform = '';
      canvas.style.opacity = '';
      requestAnimationFrame(() => {
        requestAnimationFrame(resize);
      });

      const onVisibility = () => {
        // Pause heavy work when the tab is hidden.
        lastTs = performance.now();
      };
      document.addEventListener('visibilitychange', onVisibility);

      const animate = (ts: number) => {
        if (disposed) return;
        raf = requestAnimationFrame(animate);
        if (document.hidden) {
          lastTs = ts;
          return;
        }
        const dt = Math.min(0.05, (ts - lastTs) / 1000);
        lastTs = ts;
        if (playing) {
          progress += dt / REVEAL_DURATION;
          if (progress >= 1) {
            progress = 1;
            playing = false;
          }
          applyReveal(progress);
        }
        if (progress > 0.95 && !playing) {
          emblemGroup.position.y = Math.sin(ts * 0.0009) * 0.04;
        }
        controls.update();
        composer.render();
      };
      raf = requestAnimationFrame(animate);

      cleanup = () => {
        ro.disconnect();
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', onVisibility);
        controls.dispose();
        composer.dispose();
        pmrem.dispose();
        renderer.dispose();
        scene.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
        });
        whiteMat.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      data-hover
      aria-label="Interactive 3D Home Era emblem — drag to rotate, scroll to zoom"
      role="img"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        cursor: 'grab',
        touchAction: 'pan-y',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
