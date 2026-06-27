'use client';

import { useState, useTransition } from 'react';
import { changePassword } from '@/app/admin/actions';

export default function ChangePasswordForm() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (pw !== pw2) {
      setMsg({ ok: false, text: 'Passwords do not match.' });
      return;
    }
    start(async () => {
      const res = await changePassword(pw);
      if (res.ok) {
        setMsg({ ok: true, text: 'Password updated.' });
        setPw('');
        setPw2('');
      } else {
        setMsg({ ok: false, text: res.message ?? 'Could not update password.' });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="password"
        placeholder="New password"
        required
        minLength={4}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        style={input}
        autoComplete="new-password"
      />
      <input
        type="password"
        placeholder="Confirm new password"
        required
        minLength={4}
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        style={input}
        autoComplete="new-password"
      />
      {msg && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: msg.ok ? 'var(--gold)' : '#e08a8a' }}>{msg.text}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        style={{
          padding: '0.85rem',
          borderRadius: 8,
          background: 'var(--gold)',
          color: '#0e0e0e',
          fontWeight: 600,
          fontSize: '0.8rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}

const input: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '0.85rem 1rem',
  color: 'var(--ink)',
  fontSize: '0.95rem',
};
