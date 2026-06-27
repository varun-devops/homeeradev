import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import AdminNav from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Homeera Admin' },
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Admin shell. The login page lives at /admin/login and must render
 * WITHOUT this chrome, so we detect it via the request path and pass the
 * children straight through. Every other /admin/* route requires an
 * authenticated admin (middleware guards it; we re-check here for safety).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-pathname') || '';
  const isLogin = pathname.endsWith('/admin/login');

  if (isLogin) return <>{children}</>;

  const sb = createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: profile } = await sb
    .from('profiles')
    .select('is_admin, email, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect('/admin/login?error=not-admin');

  return (
    <div className="adminShell">
      <style>{`
        .adminShell {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: 100svh;
          background: #0b0b0a;
        }
        .adminShell-main {
          padding: clamp(1.25rem, 4vw, 3rem);
          padding-top: clamp(1.25rem, 4vw, 3rem);
          min-width: 0;            /* lets inner tables scroll instead of pushing width */
        }
        /* On tablet/mobile the sidebar becomes a fixed slide-in drawer and
           the content takes the full width with a top bar offset. */
        @media (max-width: 860px) {
          .adminShell { grid-template-columns: 1fr; }
          .adminShell-main { padding-top: calc(56px + 1.25rem); }
        }
      `}</style>
      <AdminNav email={profile.email ?? user.email ?? ''} />
      <div className="adminShell-main">{children}</div>
    </div>
  );
}
