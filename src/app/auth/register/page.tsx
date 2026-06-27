import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthForm from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <main className="container" style={{ padding: '9rem 0 5rem', minHeight: '70svh' }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <h1 style={{ fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 2.8rem)', textAlign: 'center' }}>
          Create your account
        </h1>
        <Suspense>
          <AuthForm mode="register" />
        </Suspense>
      </div>
    </main>
  );
}
