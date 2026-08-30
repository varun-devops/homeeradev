import { createServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

type AuditRow = {
  id: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Read-only history of every admin write: who did what, to which record,
 * and when. Written by src/lib/audit-log.ts from the server actions in
 * src/app/admin/actions.ts and payment-actions.ts.
 *
 * Admin-only — the nav link and RLS policy both enforce this (see
 * supabase/migration-11-audit-log.sql) — staff manage products and should
 * not see, for instance, who refunded which order.
 */
export default async function AdminAuditPage() {
  const svc = createServiceClient();
  const { data, error } = await svc
    .from('admin_audit_log')
    .select('id, actor_email, actor_role, action, entity_type, entity_id, summary, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  const rows = (data ?? []) as AuditRow[];

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Audit log</h1>

      {error && (
        <p style={{ color: '#e08a8a', marginBottom: '1.5rem' }}>
          Could not load the log ({error.message}). If this is the first time you're seeing
          this page, run supabase/migration-11-audit-log.sql in the Supabase SQL editor.
        </p>
      )}

      {!error && rows.length === 0 && (
        <p style={{ color: 'var(--ink-mute)' }}>
          Nothing logged yet — this fills in as admin actions happen from here on.
        </p>
      )}

      {rows.length > 0 && (
        <div className="adminScroll">
          <table style={{ fontSize: '0.86rem', minWidth: 760, width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-soft)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.12em' }}>
                <th style={th}>When</th>
                <th style={th}>Who</th>
                <th style={th}>Action</th>
                <th style={th}>What happened</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', verticalAlign: 'top' }}>
                  <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--ink-mute)' }} title={r.created_at}>
                    {formatWhen(r.created_at)}
                  </td>
                  <td style={td}>
                    {r.actor_email ?? '—'}
                    {r.actor_role && (
                      <span style={{ marginLeft: 6, fontSize: '0.68rem', color: 'var(--ink-mute)', textTransform: 'uppercase' }}>
                        {r.actor_role}
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, color: 'var(--ink-soft)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {r.action}
                  </td>
                  <td style={td}>{r.summary ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === PAGE_SIZE && (
        <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>
          Showing the most recent {PAGE_SIZE} entries.
        </p>
      )}
    </div>
  );
}

/** "12 Mar, 4:05 PM" — enough to place an action in time at a glance. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const th: React.CSSProperties = { padding: '0.6rem 0.75rem' };
const td: React.CSSProperties = { padding: '0.7rem 0.75rem' };
