import { createServiceClient } from '@/lib/supabase/server';
import type { AdminIdentity } from '@/lib/admin-auth';

/**
 * Records one admin action to admin_audit_log (supabase/migration-11-audit-log.sql).
 *
 * Best-effort: a logging failure must never fail the admin action it is
 * describing — a product save should not 500 because the audit insert did.
 * Failures are only logged to the server console, which is enough to notice
 * a real problem (e.g. the migration hasn't been applied yet) without
 * surfacing it to whoever clicked Save.
 *
 * `detail` is for anything worth being able to look back at later: the
 * before/after price, the fields that changed, an order's old and new
 * status. Keep it small — this is an audit trail, not a full row dump.
 */
export async function logAdminAction(params: {
  actor: AdminIdentity;
  action: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    const { error } = await svc.from('admin_audit_log').insert({
      actor_id: params.actor.userId,
      actor_email: params.actor.email,
      actor_role: params.actor.role,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      summary: params.summary ?? null,
      detail: params.detail ?? null,
    });
    if (error) console.error('[audit-log] insert failed:', error.message);
  } catch (err) {
    console.error('[audit-log] insert threw:', err instanceof Error ? err.message : err);
  }
}
