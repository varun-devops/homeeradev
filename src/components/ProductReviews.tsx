'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { submitReview } from '@/app/shop/review-actions';
import type { Review } from '@/lib/catalog';

/** Read-only star row. */
export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= Math.round(value)} size={size} />
      ))}
    </span>
  );
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.4" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

type Props = {
  productId: string;
  slug: string;
  reviews: Review[];
  average: number;
  count: number;
  canReview: boolean;     // user bought it (paid)
  myRating?: number;      // existing review, if any
  myBody?: string;
  signedIn: boolean;
};

export default function ProductReviews({ productId, slug, reviews, average, count, canReview, myRating, myBody, signedIn }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rating, setRating] = useState(myRating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(myBody ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (rating < 1) { setMsg({ ok: false, text: 'Please select a star rating.' }); return; }
    start(async () => {
      const res = await submitReview({ productId, slug, rating, body });
      if (res.ok) { setMsg({ ok: true, text: 'Thanks for your review!' }); router.refresh(); }
      else if (res.reason === 'auth') router.push(`/auth/login?next=/shop/${slug}`);
      else setMsg({ ok: false, text: res.message ?? 'Could not submit review.' });
    });
  };

  return (
    <section style={{ marginTop: 'clamp(3rem, 8vw, 5rem)', borderTop: '1px solid var(--line)', paddingTop: 'clamp(2rem, 5vw, 3rem)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontStyle: 'italic', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: 0 }}>Reviews</h2>
        {count > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink-soft)' }}>
            <Stars value={average} /> {average.toFixed(1)} · {count} review{count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Write form — only for verified buyers */}
      {canReview ? (
        <form onSubmit={submit} style={{ marginTop: '1.75rem', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
            {myRating ? 'Update your review' : 'Rate this product'}
          </p>
          <div style={{ display: 'flex', gap: 4 }} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <button key={i} type="button" onClick={() => setRating(i)} onMouseEnter={() => setHover(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <Star filled={i <= (hover || rating)} size={28} />
              </button>
            ))}
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Share what you think (optional)" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '0.8rem 1rem', color: 'var(--ink)', fontSize: '0.95rem', resize: 'vertical' }} />
          {msg && <p style={{ margin: 0, fontSize: '0.85rem', color: msg.ok ? 'var(--gold)' : '#e08a8a' }}>{msg.text}</p>}
          <button type="submit" disabled={pending} style={{ alignSelf: 'flex-start', padding: '0.8rem 1.8rem', borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)', fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', border: 'none', cursor: 'pointer' }}>
            {pending ? 'Submitting…' : myRating ? 'Update review' : 'Submit review'}
          </button>
        </form>
      ) : (
        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--ink-mute)' }}>
          {signedIn ? 'Only verified buyers can review this product.' : 'Sign in and purchase to leave a review.'}
        </p>
      )}

      {/* Review list */}
      {count > 0 && (
        <ul style={{ listStyle: 'none', margin: '2.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {reviews.map((r) => (
            <li key={r.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Stars value={r.rating} size={14} />
                <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>{r.author_name || 'Customer'}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--ink-mute)', marginLeft: 'auto' }}>
                  {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {r.body && <p style={{ margin: '0.6rem 0 0', color: 'var(--ink-soft)', fontSize: '0.92rem' }}>{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
