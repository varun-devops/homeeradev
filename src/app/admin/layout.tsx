import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getAdminIdentity, staffMayAccess } from '@/lib/admin-auth';
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

  const identity = await getAdminIdentity();
  if (!identity) redirect('/admin/login?error=not-admin');

  // Staff are scoped to products (+ read-only Users/Dashboard). Guard the
  // admin-only sections here too, so a typed URL can't slip past the nav.
  if (identity.role === 'staff' && !staffMayAccess(pathname)) {
    redirect('/admin/products?error=admin-only');
  }

  return (
    <div className="adminShell">
      <style dangerouslySetInnerHTML={{ __html: `
        .adminShell {
          display: grid;
          /* The sidebar column is fixed-width; the content column is
             minmax(0, 1fr) rather than 1fr so a wide table inside it
             scrolls in its own container instead of stretching the grid
             track and pushing the page sideways. */
          grid-template-columns: 240px minmax(0, 1fr);
          min-height: 100svh;
          background: #0b0b0a;
        }
        .adminShell-main {
          padding: clamp(1.25rem, 3vw, 2.75rem);
          min-width: 0;
          /* Dashboards read badly at 2000px wide — cap the measure and
             keep it left-aligned against the sidebar. */
          max-width: 1500px;
          width: 100%;
        }

        /* Narrower desktops: give the content back some room. */
        @media (max-width: 1180px) {
          .adminShell { grid-template-columns: 200px minmax(0, 1fr); }
        }

        /* On tablet/mobile the sidebar becomes a fixed slide-in drawer and
           the content takes the full width with a top bar offset. */
        @media (max-width: 860px) {
          .adminShell { grid-template-columns: minmax(0, 1fr); }
          .adminShell-main { padding-top: calc(56px + 1.25rem); }
        }

        /* ---- shared admin primitives ----
           Tables live inside .adminScroll so they scroll horizontally on a
           narrow viewport rather than blowing out the layout. */
        .adminScroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          /* Room for the scrollbar so it never sits on top of the last row. */
          padding-bottom: 0.25rem;
        }
        .adminShell-main table { width: 100%; border-collapse: collapse; }

        /* Any grid of stat cards / panels collapses cleanly on its own. */
        .adminGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
          gap: 1.25rem;
        }
      ` }} />
      <AdminNav email={identity.email} role={identity.role} />
      <div className="adminShell-main">{children}</div>
    </div>
  );
}
