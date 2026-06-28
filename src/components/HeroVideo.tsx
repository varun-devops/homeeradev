'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Single full-screen hero with an autoplaying, looping background video.
 *
 * Two clips live on Cloudinary (folder `homeera/hero`):
 *   • clip  — landscape, shown on desktop / laptop
 *   • slim  — portrait, shown on tablet & mobile (fits tall screens better)
 * We pick the source from a media query after mount so only one video ever
 * loads. Delivered with `q_auto,f_auto` for fast, well-compressed streaming.
 *
 * The centred favicon emblem + wordmark ("HOME ERA / SINCE 1960") appear on
 * load and, after 15s, slowly fade away together (a soft 1.4s fade + blur).
 * A tap/click toggles them: it brings the intro back with the same smooth
 * fade-in (and restarts the 15s timer), or hides it again. The video keeps
 * playing underneath.
 *
 * Fully responsive: sized in svh/dvh, video covers via object-fit, fluid type.
 */

const CLOUD_NAME = 'dcdchbc8p';
const base = (id: string) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto/homeera/hero/${id}.mp4`;

const DESKTOP_URL = base('clip');
const MOBILE_URL = base('slim');

/** Logo + wordmark stay this long, then slowly fade away together. */
const REVEAL_MS = 15000;

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  // Decide the source from the viewport. Default to desktop for SSR; corrected
  // on mount before paint so phones/tablets get the portrait `slim` clip.
  const [src, setSrc] = useState(DESKTOP_URL);

  // Pick the right clip for this device (≤ 1024px → mobile/tablet portrait).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const apply = () => setSrc(mq.matches ? MOBILE_URL : DESKTOP_URL);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Autoplay handling: fade the video in once it can play.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    const onCanPlay = () => {
      setReady(true);
      tryPlay();
    };
    if (v.readyState >= 3) onCanPlay();
    v.addEventListener('canplay', onCanPlay);
    return () => v.removeEventListener('canplay', onCanPlay);
  }, [src]);

  // Whenever the intro is showing, arm a fresh 15s timer to fade it away.
  // Re-runs each time it's brought back (by tap), restarting the countdown.
  useEffect(() => {
    if (!showIntro) return;
    const t = setTimeout(() => setShowIntro(false), REVEAL_MS);
    return () => clearTimeout(t);
  }, [showIntro]);

  // A tap/click toggles the intro: bring it back (slow fade-in) if hidden,
  // or fade it away if it's currently showing.
  const toggleIntro = () => setShowIntro((v) => !v);

  return (
    <section
      className="heHero"
      aria-label="Home Era"
      onClick={toggleIntro}
    >
      <style>{`
        .heHero {
          position: relative;
          width: 100%;
          /* Exactly one viewport tall and always fully visible on mobile.
             Fallback chain: vh → dvh → svh (guaranteed-visible area). */
          height: 100vh;
          height: 100dvh;
          height: 100svh;
          overflow: hidden;
          display: grid;
          place-items: center;
          cursor: pointer;
          background: radial-gradient(120% 120% at 50% 30%, #1a1916, #0b0b0a 70%);
        }
        .heHero-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center center;
          opacity: 0;
          transition: opacity 600ms ease;
          z-index: 0;
        }
        .heHero-video[data-ready='true'] { opacity: 1; }
        .heHero-scrim {
          position: absolute; inset: 0; z-index: 1; pointer-events: none;
          background:
            radial-gradient(ellipse 90% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.5) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.4), transparent 35%, transparent 60%, rgba(0,0,0,0.55));
        }
        /* Persistent centred stack (logo always; wordmark below it). */
        .heHero-center {
          position: relative; z-index: 2;
          width: min(92vw, 760px);
          padding: clamp(1rem, 5vw, 2rem);
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
          pointer-events: none;
        }
        .heHero-emblem {
          width: clamp(104px, 22vw, 280px);
          height: auto;
          filter: drop-shadow(0 6px 34px rgba(0,0,0,0.55));
          margin-bottom: clamp(1rem, 3.5vh, 2.1rem);
        }
        .heHero-inner {
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
          max-width: 100%;
        }
        /* Wordmark */
        .heHero-mark {
          font-family: var(--font-display, Georgia, serif);
          font-weight: 700;
          font-size: clamp(3rem, 13vw, 11rem);
          letter-spacing: clamp(0.12em, 1.4vw, 0.5em);
          text-transform: uppercase;
          color: var(--ink, #f2ede3);
          text-shadow: 0 4px 40px rgba(0,0,0,0.6);
          margin: 0;
          line-height: 1.05;
          white-space: nowrap;
          /* compensate the trailing letter-spacing so it stays optically centred */
          text-indent: clamp(0.12em, 1.4vw, 0.5em);
        }
        /* aesthetic rule with a centred diamond */
        .heHero-rule {
          display: flex; align-items: center; justify-content: center;
          gap: clamp(0.6rem, 2vw, 1.25rem);
          width: min(72%, 360px);
          margin: clamp(0.85rem, 3vh, 1.6rem) 0;
        }
        .heHero-rule span {
          height: 1px; flex: 1;
          background: linear-gradient(90deg, transparent, var(--gold, #d4b574), transparent);
        }
        .heHero-rule i {
          width: 6px; height: 6px; flex: 0 0 auto;
          transform: rotate(45deg);
          background: var(--gold, #d4b574);
          box-shadow: 0 0 12px rgba(212,181,116,0.6);
        }
        .heHero-since {
          font-family: var(--font-sans, system-ui), sans-serif;
          font-weight: 700;
          font-size: clamp(1rem, 3.6vw, 1.9rem);
          letter-spacing: clamp(0.22em, 1.2vw, 0.55em);
          text-transform: uppercase;
          color: var(--ink-soft, #d8d2c4);
          text-shadow: 0 2px 18px rgba(0,0,0,0.6);
          margin: 0;
          text-indent: clamp(0.22em, 1.2vw, 0.55em);
        }
        /* Phones: firmly cap sizes + tighten spacing so nothing overflows. */
        @media (max-width: 480px) {
          .heHero-center { width: 96vw; padding: 0.5rem; }
          .heHero-emblem { width: 98px; margin-bottom: 0.95rem; }
          .heHero-mark { font-size: 2.7rem; letter-spacing: 0.09em; text-indent: 0.09em; }
          .heHero-rule { width: 68%; margin: 0.95rem 0; }
          .heHero-since { font-size: 0.98rem; letter-spacing: 0.18em; text-indent: 0.18em; }
        }
        @media (max-width: 360px) {
          .heHero-emblem { width: 84px; }
          .heHero-mark { font-size: 2.2rem; letter-spacing: 0.07em; text-indent: 0.07em; }
          .heHero-since { font-size: 0.82rem; letter-spacing: 0.15em; text-indent: 0.15em; }
        }
        @media (prefers-reduced-motion: reduce) {
          .heHero-video { transition: none; }
        }
      `}</style>

      <video
        ref={videoRef}
        key={src}
        className="heHero-video"
        data-ready={ready}
        src={src}
        poster="/images/parallax/home-decor.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <div className="heHero-scrim" aria-hidden="true" />

      {/* Logo + wordmark — appear on load, fade away together after 15s, and
          a tap brings them back with a slow, smooth fade-in. One wrapper so
          they enter/leave as a single group. */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="heHero-center"
            initial={{ opacity: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 1.4, ease: 'easeInOut' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              className="heHero-emblem"
              src="/favicon.png"
              alt="Home Era"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            />

            <div className="heHero-inner">
              <motion.h1
                className="heHero-mark"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              >
                Home Era
              </motion.h1>

              <motion.div
                className="heHero-rule"
                aria-hidden="true"
                initial={{ opacity: 0, scaleX: 0.4 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
              >
                <span /> <i /> <span />
              </motion.div>

              <motion.p
                className="heHero-since"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
              >
                Since 1960
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
