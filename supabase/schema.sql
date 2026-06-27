-- ============================================================
--  Homeera e-commerce schema
-- ============================================================
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
-- BEFORE running the import script. Safe to re-run (idempotent-ish:
-- uses IF NOT EXISTS / drops policies before recreate).
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------
-- PROFILES  (one row per auth user; admin flag lives here)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  sku               text unique not null,
  name              text not null,
  slug              text unique not null,
  description       text,
  vendor            text,
  category          text not null,
  category_slug     text not null,
  sub_category      text not null,
  sub_category_slug text not null,
  material          text,
  variant           text,
  size              text,
  weight_kg         numeric,
  price             integer not null default 0,   -- INR, whole rupees
  image_url         text,                          -- Cloudinary secure URL
  is_active         boolean not null default true, -- admin show/hide toggle
  created_at        timestamptz not null default now()
);

create index if not exists products_category_idx     on public.products(category_slug);
create index if not exists products_sub_category_idx on public.products(sub_category_slug);
create index if not exists products_active_idx       on public.products(is_active);

-- ----------------------------------------------------------------
-- CART ITEMS  (per user; one row per product in a user's cart)
-- ----------------------------------------------------------------
create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ----------------------------------------------------------------
-- ORDERS  +  ORDER ITEMS
-- ----------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  email               text,
  full_name           text,
  phone               text,
  shipping_address    text,
  amount              integer not null,            -- INR total, whole rupees
  currency            text not null default 'INR',
  status              text not null default 'created', -- created|paid|failed|cancelled
  razorpay_order_id   text,
  razorpay_payment_id text,
  razorpay_signature  text,
  created_at          timestamptz not null default now()
);

create index if not exists orders_user_idx   on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  name        text not null,   -- snapshot at purchase time
  sku         text,
  price       integer not null,
  quantity    integer not null
);

-- ============================================================
--  Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  Row Level Security
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---- PROFILES ----
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
drop policy if exists "profiles admin read"  on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);
create policy "profiles admin read"  on public.profiles for select using (public.is_admin());

-- ---- PRODUCTS ----  (everyone can read active; admins read/write all)
drop policy if exists "products public read" on public.products;
drop policy if exists "products admin all"   on public.products;
create policy "products public read" on public.products for select using (is_active or public.is_admin());
create policy "products admin all"   on public.products for all using (public.is_admin()) with check (public.is_admin());

-- ---- CART ITEMS ----  (owner only)
drop policy if exists "cart owner all" on public.cart_items;
create policy "cart owner all" on public.cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- ORDERS ----  (owner reads own; admin reads all; insert by owner)
drop policy if exists "orders owner read"   on public.orders;
drop policy if exists "orders owner insert" on public.orders;
drop policy if exists "orders admin read"   on public.orders;
create policy "orders owner read"   on public.orders for select using (auth.uid() = user_id);
create policy "orders owner insert" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders admin read"   on public.orders for select using (public.is_admin());

-- ---- ORDER ITEMS ----  (visible if you can see the parent order)
drop policy if exists "order_items read" on public.order_items;
create policy "order_items read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);

-- NOTE: the import + payment-capture run server-side with the
-- service_role key, which bypasses RLS, so no insert policy is needed
-- for those paths.
