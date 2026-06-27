import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="container" style={{ padding: '9rem 0 5rem', minHeight: '70svh' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 2.8rem)', textAlign: 'center' }}>
          Welcome back
        </h1>
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  );
}
