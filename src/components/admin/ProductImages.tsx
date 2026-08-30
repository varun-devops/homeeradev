'use client';

import { useRef, useState } from 'react';
import Img from '@/components/Img';
import { isVideoUrl, videoPoster } from '@/lib/media';
import { uploadFile } from '@/lib/upload-client';
import UploadProgress from '@/components/admin/UploadProgress';

/**
 * One ordered list of product media, replacing the old split between a
 * "Main image" field, a separate "Gallery images" field, and a separate
 * video uploader.
 *
 * The order IS the meaning: position 1 is the main image the shop and the
 * admin table show, the rest become the gallery in the order given. That
 * removes the step where a photo had to be uploaded into the right box, and
 * makes promoting a different shot a drag instead of a re-upload.
 *
 * Existing photos are passed in by the parent and render exactly like newly
 * uploaded ones, so editing a product shows what it already has.
 *
 * Drag-and-drop is the native HTML5 API rather than a library: files dropped
 * from the desktop upload, and cards dragged within the grid reorder. The two
 * are told apart by whether the drag carries files.
 */
type Props = {
  value: string[];
  onChange: (urls: string[]) => void;
  /** Cap to keep a product page reasonable. */
  max?: number;
};

export default function ProductImages({ value, onChange, max = 12 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; fraction: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const upload = async (files: File[]) => {
    const images = files.filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/'),
    );
    if (images.length === 0) {
      setError('Only image or video files can be added here.');
      return;
    }
    const room = max - value.length;
    if (room <= 0) {
      setError(`Maximum ${max} photos.`);
      return;
    }
    const batch = images.slice(0, room);

    setError(images.length > room ? `Only ${room} more photo(s) could be added.` : null);
    setBusy(true);
    setProgress({ done: 0, total: batch.length, fraction: 0 });

    const uploaded: string[] = [];
    try {
      for (const file of batch) {
        // Straight to R2 — see lib/upload-client.ts for why this cannot
        // go through our own route.
        const res = await uploadFile(file, (fraction) =>
          setProgress({ done: uploaded.length, total: batch.length, fraction }),
        );
        uploaded.push(res.url);
        setProgress({ done: uploaded.length, total: batch.length, fraction: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      // Keep whatever did upload before the failure rather than losing it.
      if (uploaded.length) onChange([...value, ...uploaded]);
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  /** A drag carrying files is an upload; anything else is a reorder. */
  const isFileDrag = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={labelStyle}>Photos &amp; video</span>
        <span style={{ fontSize: '0.76rem', color: 'var(--ink-mute)' }}>
          Drag to reorder — the first photo is the main image. {value.length}/{max}
        </span>
      </div>

      {/* ---------- ordered grid ---------- */}
      {value.length > 0 && (
        <div style={grid}>
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable={!busy}
              onDragStart={(e) => {
                dragIndex.current = i;
                e.dataTransfer.effectAllowed = 'move';
                // Firefox will not start a drag without payload.
                e.dataTransfer.setData('text/plain', String(i));
              }}
              onDragEnd={() => {
                dragIndex.current = null;
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                if (isFileDrag(e) || dragIndex.current === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setOverIndex(i);
              }}
              onDrop={(e) => {
                if (isFileDrag(e) || dragIndex.current === null) return;
                e.preventDefault();
                e.stopPropagation();
                move(dragIndex.current, i);
                dragIndex.current = null;
                setOverIndex(null);
              }}
              style={{
                ...card,
                borderColor: overIndex === i ? 'var(--gold)' : 'var(--line-strong)',
                transform: overIndex === i ? 'translateY(-2px)' : 'none',
              }}
            >
              {/* A video tile shows its own still frame — loading the clip
                  itself just to fill a 140px square was megabytes each. */}
              <Img
                src={isVideoUrl(url) ? videoPoster(url, 280) || url : url}
                alt=""
                sizes="140px"
                widths={[140, 280, 420]}
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              />
              {isVideoUrl(url) && (
                <span style={videoMark} aria-hidden="true">
                  ▶
                </span>
              )}

              {/* Position, and what position 1 means. */}
              <span style={i === 0 ? mainBadge : orderBadge}>{i === 0 ? 'Main' : i + 1}</span>

              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove photo ${i + 1}`}
                style={removeBtn}
              >
                ×
              </button>

              {/* Keyboard and touch fallback — dragging is not reachable for
                  everyone, and does not work well on a phone. */}
              <div style={nudgeRow}>
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  aria-label={`Move photo ${i + 1} earlier`}
                  style={{ ...nudgeBtn, opacity: i === 0 ? 0.3 : 1 }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Move photo ${i + 1} later`}
                  style={{ ...nudgeBtn, opacity: i === value.length - 1 ? 0.3 : 1 }}
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- drop zone ---------- */}
      <div
        onDragOver={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={(e) => {
          if (!isFileDrag(e)) return;
          e.preventDefault();
          setFileOver(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        style={{
          ...dropZone,
          borderColor: fileOver ? 'var(--gold)' : 'var(--line-strong)',
          background: fileOver ? 'rgba(212,181,116,0.08)' : 'rgba(255,255,255,0.03)',
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? (
          <div style={{ width: 'min(320px, 100%)' }}>
            <UploadProgress
              done={progress?.done ?? 0}
              total={progress?.total ?? 1}
              fraction={progress?.fraction ?? 0}
            />
          </div>
        ) : (
          <>
            <span style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>
              Drop photos or video here, or click to choose
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--ink-mute)' }}>
              JPG, PNG, WebP up to 10 MB · MP4 or WebM up to 200 MB
            </span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => upload(Array.from(e.target.files ?? []))}
        style={{ display: 'none' }}
      />

      {error && <p style={{ color: '#e08a8a', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
};
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: '0.75rem',
};
const card: React.CSSProperties = {
  position: 'relative',
  aspectRatio: '1 / 1',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#15140f',
  border: '1px solid var(--line-strong)',
  cursor: 'grab',
  transition: 'border-color 150ms ease, transform 150ms ease',
};
const badgeBase: React.CSSProperties = {
  position: 'absolute',
  top: 5,
  left: 5,
  minWidth: 20,
  height: 20,
  padding: '0 6px',
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  fontSize: '0.66rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
};
const orderBadge: React.CSSProperties = {
  ...badgeBase,
  background: 'rgba(0,0,0,0.75)',
  color: '#fff',
};
const mainBadge: React.CSSProperties = {
  ...badgeBase,
  background: 'var(--gold)',
  color: '#0e0e0e',
  textTransform: 'uppercase',
};
const removeBtn: React.CSSProperties = {
  position: 'absolute',
  top: 5,
  right: 5,
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.75)',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.95rem',
  lineHeight: 1,
};
const nudgeRow: React.CSSProperties = {
  position: 'absolute',
  bottom: 5,
  left: 5,
  right: 5,
  display: 'flex',
  justifyContent: 'space-between',
  gap: 4,
};
// Icon only: the filled pills sat on top of the photo and were the
// loudest thing in the grid. A drop-shadow keeps the chevron legible
// over a light image without painting a box behind it.
const nudgeBtn: React.CSSProperties = {
  width: 24,
  height: 22,
  background: 'transparent',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1.25rem',
  lineHeight: 1,
  padding: 0,
  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
};
const videoMark: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  fontSize: '1.4rem',
  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
  pointerEvents: 'none',
};
const dropZone: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  padding: '1.5rem 1rem',
  border: '1px dashed var(--line-strong)',
  borderRadius: 10,
  textAlign: 'center',
  transition: 'border-color 150ms ease, background 150ms ease',
};
