'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Admin sign-in. Authenticates with Supabase, then verifies the profile is
 * a member of staff (admin or staff role) before sending the user into the
 * panel (the middleware enforces this too, but checking here gives a clear
 * message). Staff land on /admin/products, which is all they can access.
 */
const ERROR_MESSAGES: Record<string, string> = {
  'not-admin': 'That account does not have admin access.',
  'admin-only': 'That section is restricted to administrators.',
  'auth-unavailable': 'Sign-in is temporarily unavailable. Please try again.',
};

export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    ERROR_MESSAGES[params.get('error') ?? ''] ?? null,
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
        .select('is_admin, role')
        .eq('id', data.user.id)
        .maybeSingle();
      const isAdmin = profile?.is_admin === true || profile?.role === 'admin';
      const isStaff = profile?.role === 'staff';
      if (!isAdmin && !isStaff) {
        await supabase.auth.signOut();
        throw new Error('That account does not have admin access.');
      }
      // Staff can only reach /admin/products; ignore any deep `next`.
      router.push(isStaff && !isAdmin ? '/admin/products' : next);
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
          fontWeight: 300,
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
