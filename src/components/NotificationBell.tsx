'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { markAllRead } from '@/app/notifications/actions';

type Notif = {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Header notification bell. Polls /api/notifications every 30s for the
 * signed-in user. Shows an unread badge; opening the panel marks all read.
 * Renders nothing for guests (the API returns empty, so the badge stays 0
 * and the bell is hidden until there is at least one notification).
 */
export default function NotificationBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
      setSignedIn((data.items ?? []).length > 0 || data.unread > 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      setItems((its) => its.map((n) => ({ ...n, is_read: true })));
      start(() => markAllRead().then(() => {}));
    }
  };

  // Hide entirely until we know there's something (keeps guest header clean).
  if (!signedIn) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        style={{ position: 'relative', width: 38, height: 38, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--gold)', color: '#0e0e0e', fontSize: '0.62rem', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, zIndex: 200,
            width: 'min(86vw, 320px)', maxHeight: '60vh', overflowY: 'auto',
            background: 'rgba(14,14,14,0.98)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--line-strong)', borderRadius: 12,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', padding: '0.5rem',
          }}
        >
          {items.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--ink-soft)', fontSize: '0.85rem', margin: 0 }}>No notifications yet.</p>
          ) : (
            items.map((n) => (
              <div key={n.id} style={{ padding: '0.75rem 0.85rem', borderRadius: 8, display: 'block' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--ink)' }}>{n.title}</p>
                {n.body && <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>{n.body}</p>}
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: 'var(--ink-mute)' }}>
                  {new Date(n.created_at).toLocaleString('en-IN')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
