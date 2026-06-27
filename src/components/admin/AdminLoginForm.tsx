'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Admin sign-in. Authenticates with Supabase, then verifies the profile
 * has is_admin = true before sending the user into the panel (the
 * middleware enforces this too, but checking here gives a clear message).
 */
export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    params.get('error') === 'not-admin' ? 'That account is not an administrator.' : null,
  );
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .maybeSingle();
      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        throw new Error('That account is not an administrator.');
      }
      router.push(next);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="email"
        placeholder="admin@homeera.com"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={input}
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={input}
        autoComplete="current-password"
      />
      {error && <p style={{ color: '#e08a8a', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
      <button
        type="submit"
        disabled={busy}
        style={{
          padding: '0.9rem',
          borderRadius: 8,
          background: 'var(--gold)',
          color: '#0e0e0e',
          fontWeight: 600,
          fontSize: '0.82rem',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Signing in…' : 'Sign in'}
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
