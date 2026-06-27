-- ============================================================
--  Migration 02 — product media (gallery + video) + collections
-- ============================================================
-- Run in the Supabase SQL editor AFTER schema.sql.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- ---- Product media -------------------------------------------------
alter table public.products
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists video_url    text;

-- A description edit field already exists; ensure it's there.
alter table public.products
  add column if not exists description text;

-- ---- Collections (top level) ---------------------------------------
create table if not exists public.collections (
  slug        text primary key,
  label       text not null,
  copy        text,
  image_url   text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ---- Sub-collections (belong to a collection) ----------------------
create table if not exists public.sub_collections (
  slug             text primary key,
  label            text not null,
  collection_slug  text not null references public.collections(slug) on delete cascade,
  copy             text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists sub_collections_parent_idx
  on public.sub_collections(collection_slug);

-- ---- Seed collections from the existing product taxonomy -----------
-- Pulls distinct category/sub_category already present on products so the
-- manager starts populated. Image is the first product image per group.
insert into public.collections (slug, label, image_url, sort_order)
select
  p.category_slug,
  max(p.category)                              as label,
  (array_agg(p.image_url) filter (where p.image_url is not null))[1] as image_url,
  0
from public.products p
group by p.category_slug
on conflict (slug) do nothing;

insert into public.sub_collections (slug, label, collection_slug, sort_order)
select
  p.sub_category_slug,
  max(p.sub_category) as label,
  p.category_slug,
  0
from public.products p
group by p.sub_category_slug, p.category_slug
on conflict (slug) do nothing;

-- ---- RLS -----------------------------------------------------------
alter table public.collections     enable row level security;
alter table public.sub_collections enable row level security;

drop policy if exists "collections public read" on public.collections;
drop policy if exists "collections admin all"   on public.collections;
create policy "collections public read" on public.collections for select using (true);
create policy "collections admin all"   on public.collections for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "subcollections public read" on public.sub_collections;
drop policy if exists "subcollections admin all"   on public.sub_collections;
create policy "subcollections public read" on public.sub_collections for select using (true);
create policy "subcollections admin all"   on public.sub_collections for all
  using (public.is_admin()) with check (public.is_admin());
