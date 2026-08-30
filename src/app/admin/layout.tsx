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

        /* ---- saving indicator (components/admin/SavingBar.tsx) ----
           Defined here so the keyframes exist once, however many bars are
           on screen: the route loading boundary and an in-page form can
           both be showing one at the same moment, and they overlap exactly. */
        @keyframes adminSavingSlide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .adminSaving {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          z-index: 200;
          overflow: hidden;
          background: rgba(212, 181, 116, 0.15);
          pointer-events: none;
        }
        .adminSaving::after {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 25%;
          background: var(--gold);
          animation: adminSavingSlide 1.1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          /* No travelling bar; hold a static fill so the state still shows. */
          .adminSaving::after { animation: none; width: 100%; opacity: 0.5; }
        }

        /* ---- form controls ----
           color-scheme:dark is doing the heavy lifting here. A <select>'s
           popup list is drawn by the OS, not the page, so no amount of CSS on
           <option> reliably themes it — the list was rendering light-on-light
           against this dark panel and reading as an unstyled control. This
           tells the browser the surface is dark, and it themes the popup,
           the caret, scrollbars and focus rings to match. */
        .adminShell { color-scheme: dark; }

        .adminShell select,
        .adminShell input,
        .adminShell textarea {
          font: inherit;
          font-size: 0.88rem;
          color: var(--ink);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          padding: 0.65rem 0.9rem;
          width: 100%;
          min-width: 0;
          transition: border-color 150ms ease, background 150ms ease;
        }
        .adminShell textarea { resize: vertical; }

        /* Native caret replaced with our own, so the control matches the rest
           of the panel instead of the OS. appearance:none removes the stock
           arrow; the padding-right reserves room for the SVG. */
        .adminShell select {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          padding-right: 2.2rem;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath fill='none' stroke='%23b8b2a3' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1.5 6 6.5l5-5'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.85rem center;
          background-size: 11px 7px;
          cursor: pointer;
        }

        /* Firefox and Windows Chrome do honour these on the list items, so
           set them as a belt-and-braces fallback where color-scheme alone
           leaves an option row light. */
        .adminShell select option,
        .adminShell select optgroup {
          background-color: #17160f;
          color: var(--ink);
        }

        .adminShell select:hover { border-color: rgba(212, 181, 116, 0.55); }
        .adminShell select:focus-visible,
        .adminShell input:focus-visible,
        .adminShell textarea:focus-visible {
          outline: none;
          border-color: var(--gold);
          background: rgba(255, 255, 255, 0.06);
        }
        .adminShell select:disabled,
        .adminShell input:disabled { opacity: 0.55; cursor: not-allowed; }

        .adminShell input::placeholder,
        .adminShell textarea::placeholder { color: var(--ink-mute); }

        /* Checkboxes keep the native control but pick up the brand colour. */
        .adminShell input[type='checkbox'] {
          width: auto;
          min-width: 0;
          padding: 0;
          accent-color: var(--gold);
          cursor: pointer;
        }
        /* Search inputs get the native clear affordance in the right colour. */
        .adminShell input[type='search']::-webkit-search-cancel-button {
          filter: invert(0.7);
          cursor: pointer;
        }
      ` }} />
      <AdminNav email={identity.email} role={identity.role} />
      <div className="adminShell-main">{children}</div>
    </div>
  );
}
