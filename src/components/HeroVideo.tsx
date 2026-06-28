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
          min-height: 100svh;
          min-height: 100dvh;
          width: 100%;
          overflow: hidden;
          display: grid;
          place-items: center;
          /* tonal fallback shown before the video paints */
          background: radial-gradient(120% 120% at 50% 30%, #1a1916, #0b0b0a 70%);
        }
        .heHero-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
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
        .heHero-cta {
          display: inline-block;
          margin-top: 0.25rem;
          padding: clamp(0.7rem, 2.5vw, 0.85rem) clamp(1.4rem, 6vw, 2rem);
          border: 1px solid var(--ink, #f2ede3);
          border-radius: 999px;
          color: var(--ink, #f2ede3);
          font-size: clamp(0.68rem, 2.6vw, 0.82rem);
          letter-spacing: 0.22em; text-transform: uppercase;
          background: rgba(0,0,0,0.18);
          transition: background 280ms ease, border-color 280ms ease;
        }
        .heHero-cta:hover { background: rgba(212,181,116,0.16); border-color: var(--gold, #d4b574); }
        .heHero-scroll {
          position: absolute; bottom: max(env(safe-area-inset-bottom), clamp(1rem, 4vh, 2.25rem));
          left: 50%; transform: translateX(-50%); z-index: 2;
          font-size: clamp(0.55rem, 2vw, 0.62rem); letter-spacing: 0.4em; text-transform: uppercase;
          color: var(--ink-mute, rgba(242,237,227,0.6));
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

      <div className="heHero-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          className="heHero-emblem"
          src="/favicon.png"
          alt="Home Era"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        />
        <motion.p
          className="heHero-word"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        >
          Home Era · Since 1960
        </motion.p>
        <motion.a
          href="/shop"
          data-hover
          className="heHero-cta"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        >
          Enter the shop
        </motion.a>
      </div>

      <motion.span
        className="heHero-scroll"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{
          opacity: { duration: 0.8, delay: 0.8 },
          y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        Scroll
      </motion.span>
    </section>
  );
}
