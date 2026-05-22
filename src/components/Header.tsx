'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

  // Lock body scroll while the mobile drawer is open, and close it on Escape.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Breakpoint-driven show/hide + drawer animation — scoped here */}
      <style>{`
        .heHeader-desktop { display: flex; }
        .heHeader-burger { display: none; }
        @media (max-width: 860px) {
          .heHeader-desktop { display: none !important; }
          .heHeader-burger { display: inline-flex !important; }
        }
        /* Full-page drawer: starts clipped to a circle at the top-right
           corner, expands to cover the whole viewport. */
        .heHeader-drawer {
          position: fixed;
          inset: 0;
          z-index: 95;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--bg-deep, #0a0a0a);
          clip-path: circle(0% at calc(100% - 2.5rem) 2.25rem);
          transition: clip-path 560ms cubic-bezier(0.83, 0, 0.17, 1);
          pointer-events: none;
        }
        .heHeader-drawer[data-open=true] {
          clip-path: circle(150% at calc(100% - 2.5rem) 2.25rem);
          pointer-events: auto;
        }
        /* Stagger each link in once the panel has opened. */
        .heHeader-link {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 420ms var(--ease-out), transform 420ms var(--ease-out);
        }
        .heHeader-drawer[data-open=true] .heHeader-link {
          opacity: 1;
          transform: translateY(0);
        }
        .heHeader-drawer[data-open=true] .heHeader-link:nth-child(1) { transition-delay: 220ms; }
        .heHeader-drawer[data-open=true] .heHeader-link:nth-child(2) { transition-delay: 290ms; }
        .heHeader-drawer[data-open=true] .heHeader-link:nth-child(3) { transition-delay: 360ms; }
        .heHeader-drawer[data-open=true] .heHeader-link:nth-child(4) { transition-delay: 430ms; }
      `}</style>

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
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          gap: '1rem',
          // fully transparent — the page shows straight through
          background: 'transparent',
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
              width: 32,
              height: 32,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.png"
              alt="Homeera logo"
              width={32}
              height={32}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </span>
          Homeera
        </Link>

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
          aria-controls="heHeader-drawer"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            gridColumn: 2,
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
            position: 'relative',
            zIndex: 110,
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
      </header>

      {/* Full-page mobile drawer — rendered as a sibling of <header> so it
          is never affected by the header's grid layout. */}
      <div
        id="heHeader-drawer"
        className="heHeader-drawer heHeader-burger"
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      >
        <nav
          aria-label="Mobile"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.75rem',
          }}
        >
          {primary.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              data-hover
              className="heHeader-link"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 9vw, 2.6rem)',
                letterSpacing: '0.04em',
                color: 'var(--ink)',
              }}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
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
