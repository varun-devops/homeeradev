'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Email/password auth form for customers. Handles both sign-in and
 * sign-up against Supabase Auth (browser client). On success it routes to
 * the `next` param (or home). Registration also captures a full name into
 * user metadata, which the DB trigger copies into the profile row.
 */
export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        // If email confirmation is OFF, a session is returned and we can go
        // straight in. If it's ON, there's no session yet.
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setInfo('Check your email to confirm your account, then sign in.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {mode === 'register' && (
        <Field label="Full name">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            autoComplete="name"
          />
        </Field>
      )}
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          minLength={4}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </Field>

      {error && <p style={{ color: '#e08a8a', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
      {info && <p style={{ color: 'var(--gold)', fontSize: '0.85rem', margin: 0 }}>{info}</p>}

      <button
        type="submit"
        disabled={busy}
        data-hover
        style={{
          marginTop: '0.5rem',
          padding: '0.95rem',
          borderRadius: 999,
          background: 'var(--ink)',
          color: 'var(--bg)',
          fontSize: '0.82rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.5rem' }}>
        {mode === 'login' ? (
          <>
            New here?{' '}
            <Link href={`/auth/register?next=${encodeURIComponent(next)}`} data-hover style={linkStyle}>
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href={`/auth/login?next=${encodeURIComponent(next)}`} data-hover style={linkStyle}>
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '0.8rem 1rem',
  color: 'var(--ink)',
  fontSize: '0.95rem',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--ink)',
  borderBottom: '1px solid var(--ink)',
  paddingBottom: '1px',
};
