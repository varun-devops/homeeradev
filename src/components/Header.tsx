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

  // Lock body scroll while the mobile drawer is open, close it on Escape,
  // and flag <html> so the hero text can hide itself (see the global
  // [data-menu-open=true] rule in the scoped <style> block below).
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (menuOpen) document.documentElement.dataset.menuOpen = 'true';
    else delete document.documentElement.dataset.menuOpen;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      delete document.documentElement.dataset.menuOpen;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Breakpoint-driven show/hide + drawer animation — scoped here */}
      <style>{`
        /* Hamburger drawer is the navigation at every breakpoint.
           The inline desktop link row is permanently hidden, so the
           hamburger button + full-page drawer are shown on every
           viewport size. */
        .heHeader-desktop { display: none !important; }
        .heHeader-burger { display: inline-flex !important; }

        /* Brand mark — favicon + collapsed wordmark.
           The wordmark is hidden by default (max-width: 0, opacity 0)
           and slides out from behind the logo on hover/focus.
           Width is animated rather than display so the slide feels
           continuous; visibility flips to hidden at rest so screen
           readers don't double-announce the brand. */
        .heHeader-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          height: 38px;
          color: var(--ink);
          text-decoration: none;
        }
        .heHeader-brand-mark {
          display: inline-flex;
          flex: 0 0 38px;
          width: 38px;
          height: 38px;
        }
        .heHeader-brand-word {
          font-family: var(--font-display);
          font-size: 1.45rem;
          letter-spacing: 0.02em;
          line-height: 1;
          white-space: nowrap;
          /* Collapsed state — fully hidden, no layout footprint, and
             marked visibility:hidden so screen readers don't read
             a phantom node and so the collapsed letters can't trap
             focus or selection. */
          max-width: 0;
          opacity: 0;
          transform: translateX(-10px);
          overflow: hidden;
          visibility: hidden;
          /* All three properties share the same easing + duration so
             they finish on the same frame — that is what makes the
             reveal feel like one motion rather than three layered
             transitions. Visibility has its own short transition
             so the element flips visible the instant the reveal
             starts and only flips hidden once the close has finished. */
          transition:
            max-width 480ms var(--ease-out),
            opacity 480ms var(--ease-out),
            transform 480ms var(--ease-out),
            visibility 0s linear 480ms;
        }
        .heHeader-brand:hover .heHeader-brand-word,
        .heHeader-brand:focus-visible .heHeader-brand-word {
          /* Generous ceiling — content is one short word, so any
             value past its natural width is fine. The animation reads
             as a smooth reveal because the actual word width is the
             true stopping point. */
          max-width: 12rem;
          opacity: 1;
          transform: translateX(0);
          visibility: visible;
          /* Visibility flips on at the START of the open transition. */
          transition:
            max-width 480ms var(--ease-out),
            opacity 480ms var(--ease-out),
            transform 480ms var(--ease-out),
            visibility 0s linear 0s;
        }

        .heHeader-drawer {
          position: fixed;
          inset: 0;
          z-index: 95;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: transparent;
          backdrop-filter: blur(5px) saturate(230%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          clip-path: circle(0% at calc(100% - var(--pad-x) - 21px) 2.25rem);
          transition: clip-path 560ms cubic-bezier(0.83, 0, 0.17, 1);
          pointer-events: none;
        }

        /* While the drawer is open, hide the hero caption underneath so
           it doesn't bleed through the transparent panel and crowd the
           menu links. Selector is namespaced to the home hero only —
           it targets the first <p> of the first <section>, which is
           where the HOME ERA · SINCE 1960 caption lives. */
        html[data-menu-open='true'] main > section:first-of-type p {
          opacity: 0;
          transition: opacity 220ms var(--ease-out);
        }
        main > section:first-of-type p {
          transition: opacity 360ms var(--ease-out) 240ms;
        }
        .heHeader-drawer[data-open=true] {
          clip-path: circle(150% at calc(100% - var(--pad-x) - 21px) 2.25rem);
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
          padding: '1rem var(--pad-x)',
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
        {/* Logo mark with a hidden wordmark that slides in on hover.
            The wordmark is collapsed (`max-width: 0`, opacity 0) by
            default, then expands on hover/focus of the brand link
            (see the `.heHeader-brand` rule in the scoped <style> block
            above). The link itself stays narrow when at rest so it
            doesn't push other layout. */}
        <Link
          href="/"
          aria-label="Homeera home"
          className="heHeader-brand"
        >
          <span className="heHeader-brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.png"
              alt=""
              width={38}
              height={38}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </span>
          <span className="heHeader-brand-word" aria-hidden="true">
            Homeera
          </span>
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
            // bare icon — no border, no background, fully transparent
            background: 'transparent',
            border: 'none',
            borderRadius: 0,
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
