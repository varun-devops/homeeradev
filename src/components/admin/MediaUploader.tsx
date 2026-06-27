'use client';

import { useRef, useState } from 'react';

/**
 * Uploads images/videos to Cloudinary via /api/admin/upload and reports
 * back the secure URLs. Used for:
 *   - product main image (single image)
 *   - product gallery (multiple images)
 *   - product video (single video)
 *   - collection image (single image)
 *
 * Props let the parent control accept type + multiplicity. The component
 * is presentational over a list of URLs the parent owns.
 */
type Props = {
  label: string;
  accept: 'image' | 'video';
  multiple?: boolean;
  value: string[];
  onChange: (urls: string[]) => void;
};

export default function MediaUploader({ label, accept, multiple = false, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptAttr = accept === 'image' ? 'image/*' : 'video/*';

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        uploaded.push(data.url);
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded.slice(0, 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <span style={labelStyle}>{label}</span>

      {/* Previews */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {value.map((url, i) => (
            <div key={url + i} style={{ position: 'relative', width: 84, height: 100, borderRadius: 6, overflow: 'hidden', background: '#15140f', border: '1px solid var(--line-strong)' }}>
              {accept === 'video' ? (
                <video src={url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Remove"
                style={{
                  position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          style={{
            padding: '0.55rem 1rem',
            border: '1px solid var(--line-strong)',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--ink)',
            fontSize: '0.78rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: busy ? 'wait' : 'pointer',
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? 'Uploading…' : multiple ? `Add ${accept}s` : `Upload ${accept}`}
        </button>
        {value.length > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--ink-mute)' }}>{value.length} file{value.length > 1 ? 's' : ''}</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple={multiple}
        onChange={(e) => handleFiles(e.target.files)}
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
