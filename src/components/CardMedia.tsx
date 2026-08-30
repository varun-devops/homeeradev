'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import Img from '@/components/Img';
import { videoUrl } from '@/lib/media';

/**
 * A collection card's background: a still, with an optional silent clip
 * looping over it once it can actually play.
 *
 * The image is not a fallback, it is the first frame of the experience. It
 * paints immediately, and the video fades in on top only after `canplay`, so
 * a slow connection shows the photograph rather than a black rectangle. If
 * the clip never loads, or autoplay is refused, or the visitor has asked for
 * reduced motion, the card is simply the photograph and nothing is missing.
 *
 * Only the card in view plays. A deck of five autoplaying clips would pull
 * megabytes for four panels nobody is looking at, so playback follows an
 * IntersectionObserver and pauses off-screen.
 */
export default function CardMedia({
  image,
  video,
  className,
  priority = false,
  sizes = '100vw',
  ...rest
}: {
  image: string | null;
  video: string | null;
  className?: string;
  priority?: boolean;
  sizes?: string;
  [key: string]: unknown;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();

  const useVideo = Boolean(video) && !reduce;

  // Play only while on screen.
  useEffect(() => {
    if (!useVideo) return;
    const el = wrapRef.current;
    const v = videoRef.current;
    if (!el || !v) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can still be refused; the poster is already showing.
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [useVideo]);

  return (
    <span ref={wrapRef} className={className} style={{ position: 'absolute', inset: 0, display: 'block' }} {...rest}>
      {image && (
        <Img
          src={image}
          alt=""
          sizes={sizes}
          priority={priority}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      {useVideo && (
        <video
          ref={videoRef}
          src={videoUrl(video)}
          muted
          loop
          playsInline
          // Not autoPlay: playback is driven by the observer above, so a card
          // off screen never starts downloading in the first place.
          preload="none"
          onCanPlay={() => setReady(true)}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Cross-fade in, so there is no hard cut from photo to frame one.
            opacity: ready ? 1 : 0,
            transition: 'opacity 700ms ease',
          }}
        />
      )}
    </span>
  );
}
