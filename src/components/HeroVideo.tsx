'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Single full-screen hero with an autoplaying, muted, looping background
 * video. The video sits behind a dark scrim so the brand mark + caption
 * stay legible.
 *
 * Smooth load: the <video> is muted + playsInline + autoPlay (the only
 * combination browsers allow to start without a user gesture). A poster
 * frame and a tonal background show instantly while the video streams in,
 * and we fade the video in once it can actually play through, so there's
 * no flash of an empty/black box on slower connections.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Some browsers ignore the autoPlay attribute until JS nudges them.
    const tryPlay = () => v.play().catch(() => {});
    if (v.readyState >= 3) {
      setReady(true);
      tryPlay();
    }
    const onCanPlay = () => {
      setReady(true);
      tryPlay();
    };
    v.addEventListener('canplay', onCanPlay);
    return () => v.removeEventListener('canplay', onCanPlay);
  }, []);

  return (
    <section className="heHero" aria-label="Homeera">
      <style>{`
        .heHero {
          position: relative;
          min-height: 100svh;
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
          transition: opacity 1200ms var(--ease-out);
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
          padding: var(--pad-x);
          display: flex; flex-direction: column; align-items: center;
          gap: clamp(1.25rem, 3vh, 2rem);
        }
        .heHero-emblem {
          width: clamp(96px, 18vw, 168px);
          height: auto;
          filter: drop-shadow(0 6px 30px rgba(0,0,0,0.5));
        }
        .heHero-word {
          font-family: var(--font-display);
          font-style: italic; font-weight: 500;
          font-size: clamp(1.4rem, 3.4vw, 2.1rem);
          letter-spacing: 0.34em; text-transform: uppercase;
          color: var(--ink);
          text-shadow: 0 2px 24px rgba(0,0,0,0.6);
          margin: 0;
        }
        .heHero-cta {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 0.85rem 2rem;
          border: 1px solid var(--ink);
          border-radius: 999px;
          color: var(--ink);
          font-size: clamp(0.72rem, 2vw, 0.82rem);
          letter-spacing: 0.24em; text-transform: uppercase;
          background: rgba(0,0,0,0.18);
          transition: background 280ms var(--ease-out), border-color 280ms var(--ease-out);
        }
        .heHero-cta:hover { background: rgba(212,181,116,0.16); border-color: var(--gold); }
        .heHero-scroll {
          position: absolute; bottom: clamp(1.25rem, 4vh, 2.25rem);
          left: 50%; transform: translateX(-50%); z-index: 2;
          font-size: 0.62rem; letter-spacing: 0.4em; text-transform: uppercase;
          color: var(--ink-mute);
        }
      `}</style>

      <video
        ref={videoRef}
        className="heHero-video"
        data-ready={ready}
        src="/video/hero.mp4"
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
        <img className="heHero-emblem" src="/favicon.png" alt="Home Era" />
        <p className="heHero-word">Home Era · Since 1960</p>
        <a href="/shop" data-hover className="heHero-cta">
          Enter the shop
        </a>
      </div>

      <span className="heHero-scroll" aria-hidden="true">
        Scroll
      </span>
    </section>
  );
}
