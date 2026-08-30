-- Migration 11 — admin audit log.
--
-- The site takes payments and holds customer data, so every admin action
-- that changes money, order state, or the catalogue needs a record of who
-- did it and when — not just the current state after the change.
--
-- Written only by server actions using the service-role key (same pattern
-- as every other admin write in this app), so there is no insert policy —
-- the service role bypasses RLS entirely. The select policy below is what
-- keeps the log itself from being readable by anyone but an admin.
--
-- Safe to re-run.

create table if not exists public.admin_audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid references auth.users(id) on delete set null,
  actor_email  text,
  actor_role   text,
  action       text not null,        -- e.g. 'product.update', 'order.status'
  entity_type  text,                 -- e.g. 'product', 'order', 'collection'
  entity_id    text,
  summary      text,                 -- short human-readable line for the list view
  detail       jsonb,                -- structured before/after or extra context
  created_at   timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor_id);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admins read audit log" on public.admin_audit_log;
create policy "admins read audit log"
  on public.admin_audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and (profiles.is_admin = true or profiles.role = 'admin')
    )
  );

-- No insert/update/delete policy: writes go through the service-role key
-- only (see src/lib/audit-log.ts), and the log is never edited or deleted
-- from the app. Nobody can tamper with it through the anon/authenticated
-- roles even with a bug elsewhere in the app.
