'use client';

import { useState } from 'react';

/**
 * Product media gallery: a large active view (image or video) with a row
 * of thumbnails beneath. Combines the main image, any gallery images, and
 * an optional video into one switchable set.
 */
type Media = { type: 'image' | 'video'; url: string };

export default function ProductGallery({
  name,
  image,
  gallery,
  video,
}: {
  name: string;
  image: string | null;
  gallery: string[];
  video: string | null;
}) {
  const media: Media[] = [
    ...(image ? [{ type: 'image' as const, url: image }] : []),
    ...gallery.map((url) => ({ type: 'image' as const, url })),
    ...(video ? [{ type: 'video' as const, url: video }] : []),
  ];

  const [active, setActive] = useState(0);

  if (media.length === 0) {
    return <div style={{ aspectRatio: '4 / 5', background: '#15140f', borderRadius: 'var(--radius)' }} />;
  }

  const current = media[Math.min(active, media.length - 1)];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ aspectRatio: '4 / 5', background: '#15140f', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        {current.type === 'video' ? (
          <video
            src={current.url}
            controls
            autoPlay
            muted
            loop
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
      </div>

      {media.length > 1 && (
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {media.map((m, i) => (
            <button
              key={m.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View ${m.type} ${i + 1}`}
              style={{
                width: 64,
                height: 78,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#15140f',
                border: i === active ? '2px solid var(--gold)' : '1px solid var(--line-strong)',
                padding: 0,
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {m.type === 'video' ? (
                <>
                  <video src={m.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      fontSize: '1.1rem',
                      background: 'rgba(0,0,0,0.25)',
                    }}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
