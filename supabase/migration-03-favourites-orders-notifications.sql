-- ============================================================
--  Migration 03 — favourites, addresses, order status, notifications
-- ============================================================
-- Run in the Supabase SQL editor AFTER migration-02.
-- Safe to re-run.
-- ============================================================

-- ---- Profile: phone already exists in base schema; ensure address ----
alter table public.profiles
  add column if not exists phone   text,
  add column if not exists address text;

-- ---- Favourites (wishlist) -----------------------------------------
create table if not exists public.favourites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

alter table public.favourites enable row level security;
drop policy if exists "favourites owner all" on public.favourites;
create policy "favourites owner all" on public.favourites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Orders: richer status + tracking ------------------------------
-- status flow: created → paid → processing → shipped → delivered
--              (or cancelled / failed)
alter table public.orders
  add column if not exists status_updated_at timestamptz default now();

-- ---- Notifications (in-site bell) ----------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text,
  order_id    uuid references public.orders(id) on delete set null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

alter table public.notifications enable row level security;
drop policy if exists "notifications owner read"   on public.notifications;
drop policy if exists "notifications owner update" on public.notifications;
create policy "notifications owner read"   on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications owner update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Inserts happen server-side with the service role (admin status changes),
-- which bypasses RLS, so no insert policy is needed.
