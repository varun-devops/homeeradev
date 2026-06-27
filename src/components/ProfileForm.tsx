'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { updateProfile, changeMyPassword, signOutCustomer } from '@/app/profile/actions';

export default function ProfileForm({
  email,
  defaults,
}: {
  email: string;
  defaults: { full_name: string; phone: string; address: string };
}) {
  const router = useRouter();
  const [f, setF] = useState(defaults);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const res = await updateProfile(f);
      setMsg(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.message ?? 'Save failed' });
      if (res.ok) router.refresh();
    });
  };

  const updatePw = () => {
    setMsg(null);
    start(async () => {
      const res = await changeMyPassword(pw);
      if (res.ok) {
        setPw('');
        setMsg({ ok: true, text: 'Password updated.' });
      } else {
        setMsg({ ok: false, text: res.message ?? 'Could not update password.' });
      }
    });
  };

  const logout = () =>
    start(async () => {
      await signOutCustomer();
      router.push('/');
      router.refresh();
    });

  return (
    <form onSubmit={save} style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Field label="Email (login)">
        <input value={email} disabled style={{ ...input, opacity: 0.6 }} />
      </Field>
      <Field label="Full name">
        <input value={f.full_name} onChange={set('full_name')} style={input} autoComplete="name" />
      </Field>
      <Field label="Phone number">
        <input value={f.phone} onChange={set('phone')} style={input} autoComplete="tel" inputMode="tel" />
      </Field>
      <Field label="Saved delivery address">
        <textarea value={f.address} onChange={set('address')} rows={3} style={{ ...input, resize: 'vertical' }} />
      </Field>

      {msg && <p style={{ margin: 0, fontSize: '0.85rem', color: msg.ok ? 'var(--gold)' : '#e08a8a' }}>{msg.text}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="submit" disabled={pending} style={primary}>
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={logout} disabled={pending} style={ghost}>
          Sign out
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', marginTop: '0.5rem', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <Field label="Change password">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" minLength={4} style={input} autoComplete="new-password" />
        </Field>
        <button type="button" onClick={updatePw} disabled={pending || pw.length < 4} style={{ ...ghost, alignSelf: 'flex-start', opacity: pw.length < 4 ? 0.5 : 1 }}>
          Update password
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={{ fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>{label}</span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-strong)', borderRadius: 8,
  padding: '0.75rem 1rem', color: 'var(--ink)', fontSize: '0.95rem', width: '100%',
};
const primary: React.CSSProperties = {
  padding: '0.8rem 1.6rem', borderRadius: 999, background: 'var(--ink)', color: 'var(--bg)',
  fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', border: 'none', cursor: 'pointer',
};
const ghost: React.CSSProperties = {
  padding: '0.8rem 1.6rem', borderRadius: 999, background: 'transparent', color: 'var(--ink)',
  border: '1px solid var(--line-strong)', fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer',
};
