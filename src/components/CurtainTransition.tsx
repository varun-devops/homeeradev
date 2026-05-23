'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * GSAP per-route page transition — the Barba.js choreography pattern
 * (leave → swap → enter) rebuilt to work with Next's router, with a
 * different transition style per destination:
 *
 *   • home           → fade + scale push (soft, premium, no overlay)
 *   • shop / shop/*   → curtain panels (vertical panels sweep)
 *   • about/contact/  → clip-path wipe (angled editorial wipe)
 *     journal/*
 *
 * Next does the routing; GSAP owns all choreography and timing. Timings
 * are deliberately short (~0.3–0.45s a side) so navigation feels fast
 * and smooth rather than heavy.
 */

const PANEL_COUNT = 5;

type Variant = 'panels' | 'wipe' | 'fade';

/** Pick a transition style from the destination route. */
function variantForPath(pathname: string): Variant {
  const seg = pathname.split('/').filter(Boolean)[0] ?? '';
  if (seg === '' ) return 'fade'; // home
  if (seg === 'shop') return 'panels';
  return 'wipe'; // about, contact, journal, anything else
}

export default function CurtainTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const layerRef = useRef<HTMLDivElement>(null);
  const wipeRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  const commitResolve = useRef<(() => void) | null>(null);
  const running = useRef(false);
  const targetPath = useRef<string | null>(null);

  // release the leave timeline once the new route has committed
  useEffect(() => {
    if (
      targetPath.current &&
      pathname === targetPath.current.split(/[?#]/)[0]
    ) {
      commitResolve.current?.();
      commitResolve.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const layer = layerRef.current;
    const wipe = wipeRef.current;
    const mark = markRef.current;
    if (!layer || !wipe || !mark) return;

    const panels = Array.from(
      layer.querySelectorAll<HTMLElement>('.curtain__panel')
    );

    // The hero canvas is intentionally excluded from transition tweens.
    // Three.js owns its own size + camera framing through a ResizeObserver,
    // and CSS-scaling the canvas during the leave/enter timeline causes
    // it to remount at a stale transform — that was the "emblem drifts
    // after navigation" bug. Animations now run on <main> only; the
    // canvas handles its own visibility through the main wrapper.
    const heroCanvases = (): HTMLElement[] => [];

    /** Wait for the route to commit, then for one paint. */
    const swapRoute = async (href: string) => {
      const committed = new Promise<void>((resolve) => {
        commitResolve.current = resolve;
        // safety net only — a prefetched route commits in well under
        // this, so the timeout almost never fires.
        window.setTimeout(resolve, 700);
      });
      router.push(href);
      window.scrollTo(0, 0);
      await committed;
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
    };

    // ---- speed knobs (seconds) — short = fast & smooth ----
    const D = reduce
      ? { lead: 0.12, trail: 0.12, stagger: 0 }
      : { lead: 0.34, trail: 0.4, stagger: 0.05 };

    // ============ VARIANT: curtain panels ============
    const runPanels = async (href: string, canvases: HTMLElement[]) => {
      gsap.set(layer, { display: 'grid' });
      gsap.set(panels, { scaleY: 0, transformOrigin: 'bottom' });

      const leave = gsap.timeline();
      leave.to(panels, {
        scaleY: 1,
        duration: D.lead,
        ease: 'power3.inOut',
        stagger: D.stagger,
      });
      if (canvases.length) {
        leave.to(
          canvases,
          { scale: 0.94, opacity: 0, duration: D.lead, ease: 'power2.in' },
          0
        );
      }
      leave.to(
        mark,
        { opacity: 1, duration: 0.2, ease: 'power2.out' },
        D.lead * 0.55
      );
      await leave.then();

      await swapRoute(href);

      const fresh = heroCanvases();
      const enter = gsap.timeline();
      enter.to(mark, { opacity: 0, duration: 0.16, ease: 'power2.in' });
      enter.to(
        panels,
        {
          scaleY: 0,
          transformOrigin: 'top',
          duration: D.trail,
          ease: 'power3.inOut',
          stagger: D.stagger,
        },
        0.06
      );
      if (fresh.length) {
        gsap.set(fresh, { scale: 1.05, opacity: 0 });
        enter.to(
          fresh,
          { scale: 1, opacity: 1, duration: D.trail + 0.15, ease: 'power2.out' },
          0.12
        );
      }
      await enter.then();
      gsap.set(layer, { display: 'none' });
    };

    // ============ VARIANT: clip-path wipe ============
    const runWipe = async (href: string, canvases: HTMLElement[]) => {
      gsap.set(wipe, { display: 'block' });
      // angled wipe sweeps in from the right
      gsap.set(wipe, {
        clipPath: 'polygon(100% 0, 100% 0, 110% 100%, 100% 100%)',
      });

      const leave = gsap.timeline();
      leave.to(wipe, {
        clipPath: 'polygon(-12% 0, 100% 0, 100% 100%, 0% 100%)',
        duration: D.lead,
        ease: 'power3.inOut',
      });
      if (canvases.length) {
        leave.to(
          canvases,
          { xPercent: -6, opacity: 0, duration: D.lead, ease: 'power2.in' },
          0
        );
      }
      leave.to(
        mark,
        { opacity: 1, duration: 0.2, ease: 'power2.out' },
        D.lead * 0.5
      );
      await leave.then();

      await swapRoute(href);

      const fresh = heroCanvases();
      const enter = gsap.timeline();
      enter.to(mark, { opacity: 0, duration: 0.16, ease: 'power2.in' });
      // wipe continues sweeping off to the left
      enter.to(
        wipe,
        {
          clipPath: 'polygon(-12% 0, -12% 0, 0% 100%, 0% 100%)',
          duration: D.trail,
          ease: 'power3.inOut',
        },
        0.04
      );
      if (fresh.length) {
        gsap.set(fresh, { xPercent: 6, opacity: 0 });
        enter.to(
          fresh,
          { xPercent: 0, opacity: 1, duration: D.trail + 0.15, ease: 'power2.out' },
          0.1
        );
      }
      await enter.then();
      gsap.set(wipe, { display: 'none' });
    };

    // ============ VARIANT: fade + scale push ============
    const runFade = async (href: string, canvases: HTMLElement[]) => {
      const main = document.querySelector('main');
      const leave = gsap.timeline();
      if (main) {
        leave.to(main, {
          scale: 0.97,
          opacity: 0,
          duration: D.lead,
          ease: 'power2.in',
          transformOrigin: '50% 40%',
        });
      }
      if (canvases.length) {
        leave.to(
          canvases,
          { scale: 0.96, opacity: 0, duration: D.lead, ease: 'power2.in' },
          0
        );
      }
      await leave.then();

      await swapRoute(href);

      const fresh = heroCanvases();
      const freshMain = document.querySelector('main');
      const enter = gsap.timeline({
        onComplete: () => {
          if (freshMain) gsap.set(freshMain, { clearProps: 'all' });
        },
      });
      if (freshMain) {
        gsap.set(freshMain, { scale: 1.03, opacity: 0 });
        enter.to(freshMain, {
          scale: 1,
          opacity: 1,
          duration: D.trail + 0.1,
          ease: 'power2.out',
        });
      }
      if (fresh.length) {
        gsap.set(fresh, { scale: 1.04, opacity: 0 });
        enter.to(
          fresh,
          { scale: 1, opacity: 1, duration: D.trail + 0.15, ease: 'power2.out' },
          0
        );
      }
      await enter.then();
    };

    /** Run the full leave → swap → enter choreography. */
    const navigate = async (href: string) => {
      if (running.current) return;
      running.current = true;
      document.documentElement.dataset.transition = 'active';
      targetPath.current = href;

      const variant = variantForPath(new URL(href, location.href).pathname);
      const canvases = heroCanvases();

      try {
        if (variant === 'panels') await runPanels(href, canvases);
        else if (variant === 'wipe') await runWipe(href, canvases);
        else await runFade(href, canvases);
      } finally {
        // always reset shared state, even if a timeline was interrupted
        gsap.set([...heroCanvases()], { clearProps: 'all' });
        gsap.set(mark, { opacity: 0 });
        gsap.set(panels, { scaleY: 0, transformOrigin: 'bottom' });
        gsap.set(layer, { display: 'none' });
        gsap.set(wipe, { display: 'none' });
        delete document.documentElement.dataset.transition;
        running.current = false;
        targetPath.current = null;
      }
    };

    // ---- click interception ----
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement)?.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      if (anchor.dataset.noTransition !== undefined) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      void navigate(url.pathname + url.search + url.hash);
    };

    // ---- prefetch on intent ----
    // Warm the destination route the moment the visitor hovers / focuses
    // / starts touching a same-origin link, so by the time they click the
    // page is already in the router cache and the curtain swap is instant.
    const prefetched = new Set<string>();
    const prefetchFromEvent = (e: Event) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      if (anchor.dataset.noTransition !== undefined) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const path = url.pathname + url.search;
      if (prefetched.has(path)) return;
      prefetched.add(path);
      router.prefetch(path);
    };

    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('mouseover', prefetchFromEvent, { passive: true });
    document.addEventListener('focusin', prefetchFromEvent, { passive: true });
    document.addEventListener('touchstart', prefetchFromEvent, {
      passive: true,
    });
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('mouseover', prefetchFromEvent);
      document.removeEventListener('focusin', prefetchFromEvent);
      document.removeEventListener('touchstart', prefetchFromEvent);
      commitResolve.current?.();
    };
  }, [router]);

  return (
    <>
      {/* curtain panels (shop) */}
      <div
        ref={layerRef}
        className="curtain"
        aria-hidden="true"
        style={{
          display: 'none',
          gridTemplateColumns: `repeat(${PANEL_COUNT}, 1fr)`,
        }}
      >
        {Array.from({ length: PANEL_COUNT }).map((_, i) => (
          <div key={i} className="curtain__panel" />
        ))}
      </div>

      {/* clip-path wipe sheet (about / contact / journal) */}
      <div
        ref={wipeRef}
        className="curtain-wipe"
        aria-hidden="true"
        style={{ display: 'none' }}
      />

      {/* brand mark shown while the overlay covers the screen */}
      <div ref={markRef} className="curtain__mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.png" alt="" width={96} height={96} />
      </div>
    </>
  );
}
