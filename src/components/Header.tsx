'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const categories = [
  { label: 'Living', href: '/shop?cat=living' },
  { label: 'Decor', href: '/shop?cat=decor' },
  { label: 'Lighting', href: '/shop?cat=lighting' },
  { label: 'Outdoor', href: '/shop?cat=outdoor' },
];

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 80 && y > lastY.current);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-hidden={hidden}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '1rem clamp(1rem, 3vw, 2.5rem)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '1rem',
        backdropFilter: 'blur(14px) saturate(140%)',
        WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        background: 'rgba(10, 10, 10, 0.72)',
        borderBottom: '1px solid var(--line)',
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        transition: 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
      }}
    >
      <Link
        href="/"
        aria-label="Homeera home"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.55rem',
          fontFamily: 'var(--font-display)',
          fontSize: '1.45rem',
          letterSpacing: '0.02em',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            width: 30,
            height: 30,
            borderRadius: '50%',
            overflow: 'hidden',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpeg"
            alt="Homeera logo"
            width={30}
            height={30}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </span>
        Homeera
      </Link>

      <nav
        aria-label="Categories"
        style={{
          display: 'flex',
          gap: 'clamp(0.75rem, 2vw, 1.75rem)',
          justifyContent: 'center',
          fontSize: '0.82rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {categories.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            data-hover
            style={{
              padding: '0.45rem 0.2rem',
              position: 'relative',
              color: 'var(--ink-soft)',
              transition: 'color 240ms var(--ease-out)',
            }}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Primary"
        style={{
          display: 'flex',
          gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          justifyContent: 'flex-end',
          fontSize: '0.82rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        <Link href="/shop" data-hover>Shop</Link>
        <Link href="/about" data-hover>About</Link>
        <Link href="/journal" data-hover>Journal</Link>
        <Link href="/contact" data-hover>Contact</Link>
      </nav>
    </header>
  );
}
