'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const categories = [
  { label: 'Living', href: '/shop?cat=living' },
  { label: 'Decor', href: '/shop?cat=decor' },
  { label: 'Lighting', href: '/shop?cat=lighting' },
  { label: 'Outdoor', href: '/shop?cat=outdoor' },
];

// Primary links — shown inline on desktop, inside the hamburger drawer
// on mobile.
const primary = [
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Journal', href: '/journal' },
];

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

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
      {/* Breakpoint-driven show/hide — scoped to this component */}
      <style>{`
        .heHeader-desktop { display: flex; }
        .heHeader-burger { display: none; }
        @media (max-width: 860px) {
          .heHeader-desktop { display: none !important; }
          .heHeader-burger { display: inline-flex !important; }
        }
      `}</style>

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

      {/* Center category nav — desktop only */}
      <nav
        aria-label="Categories"
        className="heHeader-desktop"
        style={{
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

      {/* Primary nav — desktop only */}
      <nav
        aria-label="Primary"
        className="heHeader-desktop"
        style={{
          gap: 'clamp(0.75rem, 2vw, 1.5rem)',
          justifyContent: 'flex-end',
          fontSize: '0.82rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        {primary.map((p) => (
          <Link key={p.label} href={p.href} data-hover>
            {p.label}
          </Link>
        ))}
      </nav>

      {/* Hamburger button — mobile only, sits in the right grid column */}
      <button
        type="button"
        className="heHeader-burger"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        style={{
          gridColumn: 3,
          justifySelf: 'end',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 10,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'relative',
            display: 'block',
            width: 18,
            height: 12,
          }}
        >
          {/* Top / middle / bottom bars — animate into an X when open */}
          <span style={burgerBar(menuOpen ? 'top-open' : 'top')} />
          <span style={burgerBar(menuOpen ? 'mid-open' : 'mid')} />
          <span style={burgerBar(menuOpen ? 'bot-open' : 'bot')} />
        </span>
      </button>

      {/* Mobile drawer */}
      <div
        className="heHeader-burger"
        aria-hidden={!menuOpen}
        style={{
          position: 'fixed',
          inset: 0,
          top: 0,
          zIndex: 99,
          background: 'rgba(8, 8, 8, 0.96)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.75rem',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 320ms var(--ease-out)',
        }}
        onClick={() => setMenuOpen(false)}
      >
        <nav
          aria-label="Mobile"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          {primary.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              data-hover
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.9rem',
                letterSpacing: '0.04em',
                color: 'var(--ink)',
              }}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

// Bar styles for the animated hamburger icon.
function burgerBar(state: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: 1.5,
    background: 'var(--ink)',
    borderRadius: 2,
    transition: 'transform 280ms var(--ease-out), opacity 200ms var(--ease-out)',
  };
  switch (state) {
    case 'top':
      return { ...base, top: 0 };
    case 'mid':
      return { ...base, top: '50%', transform: 'translateY(-50%)' };
    case 'bot':
      return { ...base, bottom: 0 };
    case 'top-open':
      return { ...base, top: '50%', transform: 'translateY(-50%) rotate(45deg)' };
    case 'mid-open':
      return { ...base, top: '50%', transform: 'translateY(-50%)', opacity: 0 };
    case 'bot-open':
      return { ...base, top: '50%', transform: 'translateY(-50%) rotate(-45deg)' };
    default:
      return base;
  }
}
