'use client';

/**
 * Upload progress for the admin panel: a filled bar and a percentage.
 *
 * The number is real bytes acknowledged by Cloudflare, reported by
 * XMLHttpRequest's upload.onprogress (see lib/upload-client.ts) — not a file
 * counter, and not a fake timer. That matters most for video, where a 90 MB
 * file with only an "Uploading…" label is indistinguishable from a hang, and
 * the honest question is whether it is going to finish at all.
 *
 * When several files are queued, the bar shows overall progress across the
 * batch rather than restarting per file, so it only ever moves forwards.
 */
export default function UploadProgress({
  done,
  total,
  fraction,
  name,
}: {
  /** Files fully uploaded so far. */
  done: number;
  /** Files in this batch. */
  total: number;
  /** 0–1 through the file currently uploading. */
  fraction: number;
  /** Name of the file in flight, if worth showing. */
  name?: string;
}) {
  // Overall, so a batch of five does not snap back to 0% five times.
  const overall = total > 0 ? Math.min(1, (done + fraction) / total) : 0;
  const percent = Math.round(overall * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Upload progress"
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: 'var(--gold)',
            borderRadius: 999,
            // Short transition so the bar glides between progress events
            // instead of stepping; upload.onprogress fires irregularly.
            transition: 'width 200ms ease-out',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.74rem', color: 'var(--ink-mute)' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {total > 1 ? `Uploading ${Math.min(done + 1, total)} of ${total}` : 'Uploading'}
          {name ? ` — ${name}` : ''}
        </span>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-soft)', flexShrink: 0 }}>
          {percent}%
        </span>
      </div>
    </div>
  );
}
