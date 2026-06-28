'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Aesthetic, simple login / signup popup.
 *
 * Opened from anywhere a signed-out action is attempted (e.g. "Write a
 * review"). Authenticates against Supabase in-place — no page navigation —
 * and calls `onSuccess` so the caller can refresh once a session exists.
 * The login ↔ signup toggle happens inside the same modal.
 *
 * Animation is Framer-Motion-only (the site's single animation library):
 * a backdrop fade + a soft card lift/scale.
 */
export default function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const submit = async (e: React.FormEvent) => {
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
        if (data.session) {
          router.refresh();
          onSuccess?.();
          onClose();
        } else {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.refresh();
        onSuccess?.();
        onClose();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="heAuth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'login' ? 'Sign in' : 'Create account'}
        >
          <style>{`
            .heAuth-backdrop {
              position: fixed; inset: 0; z-index: 10000;
              display: grid; place-items: center;
              padding: 1.25rem;
              background: rgba(8, 8, 7, 0.66);
              backdrop-filter: blur(6px);
              -webkit-backdrop-filter: blur(6px);
            }
            .heAuth-card {
              position: relative;
              width: min(100%, 420px);
              background: linear-gradient(180deg, #16150f, #0d0d0b);
              border: 1px solid var(--line-strong, rgba(212,181,116,0.18));
              border-radius: 16px;
              padding: clamp(1.75rem, 5vw, 2.5rem);
              box-shadow: 0 30px 80px rgba(0,0,0,0.55);
            }
            .heAuth-close {
              position: absolute; top: 0.9rem; right: 0.9rem;
              width: 34px; height: 34px; border-radius: 999px;
              background: rgba(255,255,255,0.05);
              border: 1px solid var(--line, rgba(255,255,255,0.08));
              color: var(--ink, #f2ede3); font-size: 1.1rem; line-height: 1;
              cursor: pointer; display: grid; place-items: center;
              transition: background 200ms ease;
            }
            .heAuth-close:hover { background: rgba(255,255,255,0.1); }
            .heAuth-title {
              font-family: var(--font-display, Georgia, serif);
              font-style: italic; font-size: clamp(1.6rem, 5vw, 2.1rem);
              text-align: center; margin: 0 0 0.4rem;
              color: var(--ink, #f2ede3);
            }
            .heAuth-sub {
              text-align: center; margin: 0 0 1.5rem;
              font-size: 0.82rem; color: var(--ink-soft, #b8b2a4);
            }
            .heAuth-form { display: flex; flex-direction: column; gap: 1rem; }
            .heAuth-label { display: flex; flex-direction: column; gap: 0.4rem; }
            .heAuth-label > span {
              font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase;
              color: var(--ink-soft, #b8b2a4);
            }
            .heAuth-input {
              background: rgba(255,255,255,0.04);
              border: 1px solid var(--line-strong, rgba(212,181,116,0.18));
              border-radius: 8px; padding: 0.8rem 1rem;
              color: var(--ink, #f2ede3); font-size: 0.95rem;
              transition: border-color 200ms ease;
            }
            .heAuth-input:focus { outline: none; border-color: var(--gold, #d4b574); }
            .heAuth-submit {
              margin-top: 0.25rem; padding: 0.95rem; border-radius: 999px;
              background: var(--ink, #f2ede3); color: var(--bg, #0b0b0a);
              font-size: 0.8rem; letter-spacing: 0.18em; text-transform: uppercase;
              border: none; cursor: pointer;
            }
            .heAuth-submit:disabled { opacity: 0.7; cursor: wait; }
            .heAuth-toggle {
              text-align: center; margin: 1rem 0 0;
              font-size: 0.82rem; color: var(--ink-soft, #b8b2a4);
            }
            .heAuth-toggle button {
              background: none; border: none; cursor: pointer; padding: 0;
              color: var(--ink, #f2ede3); border-bottom: 1px solid currentColor;
              font-size: inherit;
            }
          `}</style>

          <motion.div
            className="heAuth-card"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            // stop clicks inside the card from closing the modal
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button type="button" className="heAuth-close" aria-label="Close" onClick={onClose}>
              ×
            </button>

            <h2 className="heAuth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
            <p className="heAuth-sub">
              {mode === 'login'
                ? 'Sign in to write your review.'
                : 'Sign up to write your review.'}
            </p>

            <form className="heAuth-form" onSubmit={submit}>
              {mode === 'register' && (
                <label className="heAuth-label">
                  <span>Full name</span>
                  <input
                    className="heAuth-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="heAuth-label">
                <span>Email</span>
                <input
                  className="heAuth-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              <label className="heAuth-label">
                <span>Password</span>
                <input
                  className="heAuth-input"
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>

              {error && <p style={{ color: '#e08a8a', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
              {info && <p style={{ color: 'var(--gold)', fontSize: '0.85rem', margin: 0 }}>{info}</p>}

              <button type="submit" className="heAuth-submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className="heAuth-toggle">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <button type="button" onClick={() => { setMode('register'); setError(null); setInfo(null); }}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(null); }}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
