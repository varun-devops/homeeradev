'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Route-level error boundary.
 *
 * Without this file any thrown error renders Next's unstyled crash page —
 * "Application error: a server-side exception has occurred" plus a digest,
 * on a white background, with no way out but the browser's Back button.
 * That is what a customer saw for any failure, and it gave them nothing to
 * act on and us nothing to correlate.
 *
 * The digest is the one useful thing on that page: it is the id to match
 * against the server log for this exact error, so it is surfaced here for
 * anyone reporting a problem.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Reaches the platform log (Vercel) with the digest attached, so a
    // reported digest can be traced back to a stack.
    console.error('[route error]', error.digest ?? '(no digest)', error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: '70svh',
        display: 'grid',
        placeItems: 'center',
        padding: '6rem var(--pad-x) 4rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '32rem' }}>
        <p
          style={{
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            marginBottom: '1rem',
          }}
        >
          Something went wrong
        </p>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 3rem)', marginBottom: '1rem' }}>
          This page didn&rsquo;t load
        </h1>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
          The problem is on our side, not yours. Trying again often works — if it
          doesn&rsquo;t, the reference below helps us find what happened.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={reset} style={primary}>
            Try again
          </button>
          <Link href="/shop" style={ghost}>
            Back to the shop
          </Link>
        </div>

        {error.digest && (
          <p style={{ marginTop: '2rem', fontSize: '0.72rem', color: 'var(--ink-mute)', fontFamily: 'monospace' }}>
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}

const primary: React.CSSProperties = {
  padding: '0.8rem 1.6rem',
  borderRadius: 8,
  background: 'var(--gold)',
  color: '#0e0e0e',
  fontWeight: 600,
  fontSize: '0.78rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  border: 'none',
  cursor: 'pointer',
};
const ghost: React.CSSProperties = {
  padding: '0.8rem 1.6rem',
  borderRadius: 8,
  border: '1px solid var(--line-strong)',
  color: 'var(--ink)',
  fontSize: '0.78rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};
