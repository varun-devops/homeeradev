-- ================================================================
-- Migration 06 — staff role
-- ----------------------------------------------------------------
-- Adds a coarse role to profiles so we can grant a "staff" login that
-- manages PRODUCTS only, separate from full admins.
--
--   role = 'admin'    → full admin (unchanged behaviour)
--   role = 'staff'    → products CRUD + read-only everything the
--                       app chooses to show; no orders/collections write
--   role = 'customer' → normal shopper (default)
--
-- `is_admin` is kept in sync for backward compatibility: everywhere the
-- app still reads is_admin (public.is_admin(), older policies) an admin
-- stays an admin. Staff are NOT is_admin.
--
-- Safe to re-run.
-- ================================================================

-- 1. Column ------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'customer'
  check (role in ('customer', 'staff', 'admin'));

-- Backfill: any existing admins get role='admin' to match is_admin.
update public.profiles set role = 'admin' where is_admin = true and role <> 'admin';

-- 2. Helper: can the current user manage products? --------------
-- True for both staff and admin. Used by product RLS + server guards.
create or replace function public.can_manage_products()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select role in ('staff', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Keep is_admin() as-is (admins only). Staff must never satisfy it.

-- 3. Product RLS: allow staff to write, not just admins ----------
-- Public still reads active products; product mutation now open to
-- anyone who can_manage_products(). (Server actions use the service
-- key and bypass RLS, but this keeps the DB itself correct.)
drop policy if exists "products admin all"     on public.products;
drop policy if exists "products manage"         on public.products;
create policy "products manage" on public.products
  for all using (public.can_manage_products())
  with check (public.can_manage_products());

-- 4. Profiles: staff may read all profiles (read-only Users page) -
drop policy if exists "profiles staff read" on public.profiles;
create policy "profiles staff read" on public.profiles
  for select using (public.can_manage_products());

-- Note: orders, collections, sub_collections, and profile WRITES remain
-- admin-only (public.is_admin()), so staff cannot touch them.
