-- ================================================================
-- Migration 08 — one collection, real sub-collections, structured
--                delivery addresses
-- ----------------------------------------------------------------
-- Three things happen here:
--
--   1. The catalogue collapses to a SINGLE top-level collection,
--      "Home Décor". Everything that used to be its own category
--      (Bar & Entertaining, Lighting, Home & Garden, Home & Kitchen)
--      becomes a sub-collection of it instead. No products are lost —
--      only the taxonomy above them changes.
--
--   2. collections / sub_collections are re-seeded from the products
--      table so the admin Collections screen and the storefront deck
--      agree with the sheet.
--
--   3. Delivery addresses become structured (pin code, locality, city,
--      state, …) on both profiles and orders, so checkout can collect
--      them field by field and admin can read them back. The old
--      free-text `address` / `shipping_address` columns stay put and
--      are kept in sync as a single formatted string.
--
-- Run in the Supabase SQL editor AFTER migration-07. Safe to re-run.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Collapse every product into the Home Décor collection
-- ----------------------------------------------------------------
update public.products
set category      = 'Home Décor',
    category_slug = 'home-decor'
where category_slug is distinct from 'home-decor';

-- The sheet's two planter sizes were separate sub-categories; they are one
-- sub-collection on the storefront.
update public.products
set sub_category      = 'Planters',
    sub_category_slug = 'planters'
where sub_category_slug in ('planter-b', 'planter-s', 'planter-b-', 'planter-s-');

-- ----------------------------------------------------------------
-- 2. Re-seed the collection tree from the (now normalised) products
-- ----------------------------------------------------------------

-- Drop sub-collections that no longer have any product behind them.
delete from public.sub_collections sc
where not exists (
  select 1 from public.products p where p.sub_category_slug = sc.slug
);

-- Drop collections that are no longer referenced by any product.
delete from public.collections c
where not exists (
  select 1 from public.products p where p.category_slug = c.slug
);

insert into public.collections (slug, label, image_url, sort_order)
select
  p.category_slug,
  max(p.category),
  (array_agg(p.image_url) filter (where p.image_url is not null))[1],
  0
from public.products p
group by p.category_slug
on conflict (slug) do update
  set label     = excluded.label,
      image_url = coalesce(public.collections.image_url, excluded.image_url);

insert into public.sub_collections (slug, label, collection_slug, sort_order)
select
  p.sub_category_slug,
  max(p.sub_category),
  max(p.category_slug),
  0
from public.products p
group by p.sub_category_slug
on conflict (slug) do update
  set label           = excluded.label,
      collection_slug = excluded.collection_slug;

-- A stable display order for the sub-collections. Anything not listed
-- keeps sort_order 0 and falls back to alphabetical.
update public.sub_collections set sort_order = v.ord
from (values
  ('sculptures', 1),
  ('ornaments', 2),
  ('table-clocks', 3),
  ('flower-pots', 4),
  ('planters', 5),
  ('utility-living', 6),
  ('brass-drinkware', 7),
  ('floor-lamps', 8),
  ('trays', 9)
) as v(slug, ord)
where public.sub_collections.slug = v.slug;

-- Give each sub-collection a representative image if the column exists.
alter table public.sub_collections add column if not exists image_url text;

update public.sub_collections sc
set image_url = sub.img
from (
  select sub_category_slug,
         (array_agg(image_url) filter (where image_url is not null))[1] as img
  from public.products
  group by sub_category_slug
) sub
where sc.slug = sub.sub_category_slug
  and sc.image_url is null;

-- ----------------------------------------------------------------
-- 3. Structured delivery addresses
-- ----------------------------------------------------------------
alter table public.profiles
  add column if not exists pin_code  text,
  add column if not exists locality  text,
  add column if not exists city      text,
  add column if not exists state     text,
  add column if not exists address_line text;

alter table public.orders
  add column if not exists pin_code  text,
  add column if not exists locality  text,
  add column if not exists city      text,
  add column if not exists state     text,
  add column if not exists address_line text;

-- Backfill: existing single-line addresses stay readable in the new
-- fields rather than disappearing from the checkout form.
update public.profiles
set address_line = address
where address_line is null and address is not null;

update public.orders
set address_line = shipping_address
where address_line is null and shipping_address is not null;

-- Serviceable pin codes. Empty table = everywhere is serviceable, so the
-- store keeps working until the merchant loads their courier's list.
create table if not exists public.serviceable_pincodes (
  pin_code   text primary key,
  city       text,
  state      text,
  cod        boolean not null default false,
  eta_days   integer,
  created_at timestamptz not null default now()
);

alter table public.serviceable_pincodes enable row level security;
drop policy if exists "pincodes public read" on public.serviceable_pincodes;
drop policy if exists "pincodes admin all"   on public.serviceable_pincodes;
create policy "pincodes public read" on public.serviceable_pincodes for select using (true);
create policy "pincodes admin all"   on public.serviceable_pincodes for all
  using (public.is_admin()) with check (public.is_admin());
