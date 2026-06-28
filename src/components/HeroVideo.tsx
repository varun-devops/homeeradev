'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Single full-screen hero with an autoplaying, looping background video.
 *
 * The clip lives on Cloudinary (folder `homeera/hero`, public id `clip`). It is
 * delivered with `q_auto,f_auto` so the browser gets a well-compressed,
 * fast-starting file. A poster frame + tonal gradient show instantly while the
 * video streams in, and the video fades in once it can play so there's no flash
 * of an empty/black box on slower connections.
 *
 * Fully responsive: the section is sized in svh/dvh units, the video covers via
 * object-fit, and all typography/spacing is fluid (clamp), so it works from
 * small phones up to large desktops. `muted + playsInline + autoPlay` is the
 * only combination browsers allow to start without a user gesture.
 */

const CLOUD_NAME = 'dcdchbc8p';

/** Cloudinary delivery URL with auto format + quality for fast streaming. */
const CLIP_URL = `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/q_auto,f_auto/homeera/hero/clip.mp4`;

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

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
  }, []);

  return (
    <section className="heHero" aria-label="Home Era">
      <style>{`
        .heHero {
          position: relative;
          width: 100%;
          /* Exactly one viewport tall and always fully visible on mobile.
             Fallback chain: vh (universal) → dvh (dynamic) → svh (small —
             the guaranteed-visible area with the toolbar shown). Using svh
             last means the hero never gets hidden behind mobile browser UI,
             so there's no gap or partial scroll. */
          height: 100vh;
          height: 100dvh;
          height: 100svh;
          overflow: hidden;
          display: grid;
          place-items: center;
          /* tonal fallback shown before the video paints */
          background: radial-gradient(120% 120% at 50% 30%, #1a1916, #0b0b0a 70%);
        }
        .heHero-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          /* cover the whole box, keep the subject centred, no letterboxing */
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
            radial-gradient(ellipse 90% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.45), transparent 30%, transparent 60%, rgba(0,0,0,0.6));
        }
        .heHero-inner {
          position: relative; z-index: 2;
          text-align: center;
          width: min(92vw, 720px);
          padding: clamp(1rem, 5vw, 2rem);
          display: flex; flex-direction: column; align-items: center;
          gap: clamp(1rem, 3vh, 2rem);
        }
        .heHero-emblem {
          width: clamp(84px, 18vw, 168px);
          height: auto;
          filter: drop-shadow(0 6px 30px rgba(0,0,0,0.5));
        }
        .heHero-word {
          font-family: var(--font-display, Georgia, serif);
          font-style: italic; font-weight: 500;
          font-size: clamp(1.15rem, 4.5vw, 2.1rem);
          letter-spacing: clamp(0.18em, 1vw, 0.34em); text-transform: uppercase;
          color: var(--ink, #f2ede3);
          text-shadow: 0 2px 24px rgba(0,0,0,0.6);
          margin: 0;
          line-height: 1.3;
        }
        /* Top CTA — sits just below the top edge, centred, underlined. */
        .heHero-topcta {
          position: absolute;
          top: max(env(safe-area-inset-top), clamp(1.5rem, 5vh, 3rem));
          left: 50%; transform: translateX(-50%);
          z-index: 3;
        }
        .heHero-cta {
          display: inline-block;
          color: var(--ink, #f2ede3);
          font-size: clamp(0.7rem, 2.6vw, 0.85rem);
          letter-spacing: 0.22em; text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 6px;
          text-decoration-thickness: 1px;
          text-shadow: 0 2px 18px rgba(0,0,0,0.55);
          transition: color 280ms ease, text-underline-offset 280ms ease;
        }
        .heHero-cta:hover {
          color: var(--gold, #d4b574);
          text-underline-offset: 9px;
        }
        @media (prefers-reduced-motion: reduce) {
          .heHero-video { transition: none; }
        }
      `}</style>

      <video
        ref={videoRef}
        className="heHero-video"
        data-ready={ready}
        src={CLIP_URL}
        poster="/images/parallax/home-decor.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <div className="heHero-scrim" aria-hidden="true" />

      {/* Top CTA into the shop */}
      <div className="heHero-topcta">
        <motion.a
          href="/shop"
          data-hover
          className="heHero-cta"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          View all collections
        </motion.a>
      </div>

      <div className="heHero-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          className="heHero-emblem"
          src="/favicon.png"
          alt="Home Era"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        />
        <motion.p
          className="heHero-word"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        >
          Home Era · Since 1960
        </motion.p>
      </div>
    </section>
  );
}
