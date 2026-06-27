'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { signOut } from '@/app/admin/actions';

const links = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/account', label: 'Account' },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const navLinks = links.map((l) => {
    const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        className="adminNav-link"
        data-active={active}
        onClick={() => setOpen(false)}
      >
        {l.label}
      </Link>
    );
  });

  return (
    <>
      <style>{`
        /* ---------- shared link styles ---------- */
        .adminNav-link {
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-soft);
          transition: background 200ms ease, color 200ms ease;
        }
        .adminNav-link[data-active='true'] { color: #0e0e0e; background: var(--gold); }
        .adminNav-link:not([data-active='true']):hover { color: var(--ink); background: rgba(255,255,255,0.04); }

        /* ---------- desktop sidebar ---------- */
        .adminNav-side {
          border-right: 1px solid rgba(255,255,255,0.08);
          padding: 1.75rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          position: sticky;
          top: 0;
          height: 100svh;
        }

        /* ---------- mobile top bar (hidden on desktop) ---------- */
        .adminNav-bar { display: none; }
        .adminNav-scrim { display: none; }

        @media (max-width: 860px) {
          .adminNav-side { display: none; }

          .adminNav-bar {
            position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 60;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 1rem;
            background: rgba(11,11,10,0.92);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .adminNav-burger {
            width: 40px; height: 40px; display: grid; place-items: center;
            border: 1px solid var(--line-strong); border-radius: 8px; background: transparent;
            color: var(--ink);
          }
          .adminNav-scrim {
            display: block; position: fixed; inset: 0; z-index: 70;
            background: rgba(0,0,0,0.6); opacity: 0; pointer-events: none;
            transition: opacity 240ms ease;
          }
          .adminNav-scrim[data-open='true'] { opacity: 1; pointer-events: auto; }
          .adminNav-drawer {
            position: fixed; top: 0; left: 0; bottom: 0; z-index: 80;
            width: min(78vw, 280px);
            background: #0d0d0c; border-right: 1px solid rgba(255,255,255,0.08);
            padding: 1.5rem 1.25rem;
            display: flex; flex-direction: column; gap: 0.25rem;
            transform: translateX(-100%);
            transition: transform 320ms cubic-bezier(0.16,1,0.3,1);
          }
          .adminNav-drawer[data-open='true'] { transform: translateX(0); }
        }
      `}</style>

      {/* ===== Mobile top bar ===== */}
      <div className="adminNav-bar">
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={24} height={24} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>Homeera</span>
        </Link>
        <button
          type="button"
          className="adminNav-burger"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* ===== Mobile drawer + scrim ===== */}
      <div className="adminNav-scrim" data-open={open} onClick={() => setOpen(false)} />
      <aside className="adminNav-drawer" data-open={open}>
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={26} height={26} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Homeera</span>
        </Link>
        {navLinks}
        <Footer email={email} pending={pending} onSignOut={() => start(() => signOut())} />
      </aside>

      {/* ===== Desktop sidebar ===== */}
      <aside className="adminNav-side">
        <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.png" alt="" width={26} height={26} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.04em' }}>Homeera</span>
        </Link>
        {navLinks}
        <Footer email={email} pending={pending} onSignOut={() => start(() => signOut())} />
      </aside>
    </>
  );
}

function Footer({
  email,
  pending,
  onSignOut,
}: {
  email: string;
  pending: boolean;
  onSignOut: () => void;
}) {
  return (
    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ fontSize: '0.72rem', color: 'var(--ink-mute)', wordBreak: 'break-all', marginBottom: '0.6rem' }}>{email}</p>
      <button
        type="button"
        onClick={onSignOut}
        disabled={pending}
        style={{
          width: '100%',
          padding: '0.6rem',
          borderRadius: 8,
          border: '1px solid var(--line-strong)',
          background: 'transparent',
          color: 'var(--ink)',
          fontSize: '0.74rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--ink-mute)' }}>
        ← View store
      </Link>
    </div>
  );
}
