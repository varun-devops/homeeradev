'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toggleFavourite } from '@/app/favourites/actions';

/**
 * Heart toggle. Optimistically flips state; if the user isn't signed in it
 * routes to login. Used on product cards and the product detail page.
 */
export default function FavouriteButton({
  productId,
  initial = false,
  variant = 'detail',
}: {
  productId: string;
  initial?: boolean;
  variant?: 'detail' | 'icon';
}) {
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !fav;
    setFav(nextState);
    start(async () => {
      const res = await toggleFavourite(productId);
      if (!res.ok) {
        setFav(!nextState); // revert
        if (res.reason === 'auth') {
          router.push(`/auth/login?next=${encodeURIComponent(location.pathname)}`);
        }
      } else {
        setFav(res.favourited ?? nextState);
      }
    });
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
        aria-pressed={fav}
        disabled={pending}
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid var(--line-strong)',
          cursor: 'pointer',
        }}
      >
        <Heart filled={fav} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      data-hover
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '1rem 1.6rem',
        borderRadius: 999,
        background: 'transparent',
        border: '1px solid var(--line-strong)',
        color: fav ? 'var(--gold)' : 'var(--ink)',
        fontSize: '0.82rem',
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        cursor: pending ? 'wait' : 'pointer',
      }}
    >
      <Heart filled={fav} />
      {fav ? 'Saved' : 'Save'}
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? 'var(--gold)' : 'none'}
      stroke={filled ? 'var(--gold)' : 'currentColor'}
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
