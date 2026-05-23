'use client';

import { useEffect, useRef, useState } from 'react';

export default function LoadingGate() {
  const ref = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('homeera-seen')) {
      setDone(true);
      return;
    }

    const v = videoRef.current;
    if (!v) return;

    let finished = false;
    let safety: number | undefined;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (safety !== undefined) window.clearTimeout(safety);
      sessionStorage.setItem('homeera-seen', '1');
      const el = ref.current;
      if (!el) {
        setDone(true);
        return;
      }
      el.style.transition = 'opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 800ms cubic-bezier(0.16, 1, 0.3, 1)';
      el.style.opacity = '0';
      el.style.transform = 'scale(1.04)';
      window.setTimeout(() => setDone(true), 650);
    };

    const armSafety = () => {
      if (safety !== undefined) window.clearTimeout(safety);
      const remaining = Number.isFinite(v.duration) && v.duration > 0
        ? Math.max(0, v.duration - v.currentTime)
        : 8;
      // give the video its full remaining runtime plus a 1.5s buffer
      safety = window.setTimeout(finish, (remaining + 1.5) * 1000);
    };

    const onMeta = () => armSafety();
    const onEnded = () => finish();
    const onError = () => finish();

    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('ended', onEnded);
    v.addEventListener('error', onError);

    // fallback safety in case metadata never loads (e.g. video missing)
    safety = window.setTimeout(finish, 15000);

    v.play().catch(() => finish());

    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('error', onError);
      if (safety !== undefined) window.clearTimeout(safety);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        zIndex: 99999,
        display: 'grid',
        placeItems: 'center',
        willChange: 'opacity, transform',
      }}
    >
      {/* Cropped frame — the video is over-sized then scaled inside this
          square viewport so the empty margins around the logo are clipped
          away (a CSS-only zoom-in crop, no re-encode needed). */}
      <div
        style={{
          width: 'min(56vw, 520px)',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          preload="auto"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Scale > 1 zooms into the centre of the frame, cropping the
            // surrounding negative space so the logo fills the viewport.
            transform: 'scale(1.55)',
            transformOrigin: 'center center',
            // `screen` blend drops black pixels; raising contrast and
            // pulling brightness down first crushes the video's dark-grey
            // backing to true black so no box shows behind the logo.
            mixBlendMode: 'screen',
            filter: 'brightness(1.05) contrast(1.5) saturate(1.1)',
          }}
        >
          <source src="/video/loading.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
