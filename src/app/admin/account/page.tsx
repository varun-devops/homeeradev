import ChangePasswordForm from '@/components/admin/ChangePasswordForm';

export const metadata = { title: 'Account' };
export const dynamic = 'force-dynamic';

export default function AdminAccountPage() {
  return (
    <div style={{ maxWidth: 460 }}>
      <h1 style={{ fontStyle: 'italic', fontSize: '2rem', marginBottom: '0.5rem' }}>Account</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>Change your admin password.</p>
      <ChangePasswordForm />
    </div>
  );
}
