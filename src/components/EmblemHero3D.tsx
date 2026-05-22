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
      renderer.toneMappingExposure = 0.95;
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
      const FRAME_PAD = 1.32;  // breathing room around the emblem
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

      // Neutral, cool-white lighting so the emblem reads as bright
      // silver-white (no warm/brown cast).
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xeef0f4, 0.55);
      rim.position.set(-4, 3, -3);
      scene.add(rim);
      const fillLight = new THREE.PointLight(0xffffff, 0.7, 14);
      fillLight.position.set(0, -2, 4);
      scene.add(fillLight);
      scene.add(new THREE.AmbientLight(0x202024, 0.35));

      // Glass dispersion material — the emblem reads as a solid block
      // of clear glass. Light refracts through it (high IOR + thickness)
      // and a faint inner emissive makes it glow from within without the
      // glow escaping the surface — the total-internal-reflection look.
      //
      // The spectral "dispersion" colour split at the edges is produced
      // by `iridescence` (three r160 has no native `dispersion`; a thin-
      // film iridescent edge reads the same prismatic way). Mobile gets
      // a lighter variant so the costly transmission pass stays cheap.
      //
      // Kept fully neutral: no warm attenuation, emissive or sheen tint,
      // so the emblem reads as clean clear/white glass with no brown
      // cast as it revolves.
      const whiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: isMobile ? 0.1 : 0.06,
        // transmission turns the solid into refractive glass
        transmission: 1,
        ior: 1.7,
        thickness: isMobile ? 1.4 : 2.6,
        // neutral attenuation — no warm cream tint through the glass
        attenuationColor: new THREE.Color(0xffffff),
        attenuationDistance: 3.5,
        envMapIntensity: 2.0,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        // thin-film iridescence → the prismatic spectral edge ("dispersion")
        iridescence: isMobile ? 0.4 : 0.85,
        iridescenceIOR: 1.45,
        iridescenceThicknessRange: [120, 560],
        // faint neutral inner glow — trapped light, no brown tint
        emissive: new THREE.Color(0x2a2a2e),
        emissiveIntensity: 0.5,
        // a touch of cool-white sheen at grazing angles (no gold cast)
        sheen: 0.5,
        sheenColor: new THREE.Color(0xeef0f4),
        sheenRoughness: 0.4,
        // NOT `transparent`: refraction comes from the transmission pass,
        // not alpha blending. Flagging it transparent makes WebGL re-sort
        // and blend the overlapping extruded petals every frame, and the
        // sort order keeps swapping — that is the flicker. An opaque
        // material with normal depth-write keeps each petal stable.
        transparent: false,
        depthWrite: true,
        depthTest: true,
      });

      // Parse traced SVG and build the extruded 3D group.
      const svgData = new SVGLoader().parse(EMBLEM_SVG);

      // Per-path reveal timing: center petal first, side petals mid,
      // inner tips last, stem early-ish.
      const revealDelays = [0.05, 0.3, 0.3, 0.5, 0.5, 0.15];

      const extrudeSettings = {
        depth: 18,
        bevelEnabled: true,
        bevelThickness: 4,
        bevelSize: 3,
        bevelSegments: 4,
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

      // Post-processing: bloom for the metallic shimmer.
      const composer = new EffectComposer(renderer);
      composer.setSize(w, h);
      composer.addPass(new RenderPass(scene, camera));
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        0.35,
        0.7,
        0.25
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
