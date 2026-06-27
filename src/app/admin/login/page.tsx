import type { Metadata } from 'next';
import { Suspense } from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export const metadata: Metadata = { title: 'Admin · Sign in', robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: '#0b0b0a',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.72rem',
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            marginBottom: '0.5rem',
          }}
        >
          Homeera
        </p>
        <h1 style={{ fontStyle: 'italic', fontSize: '2rem', textAlign: 'center', margin: 0 }}>
          Admin
        </h1>
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </div>
    </main>
  );
}
