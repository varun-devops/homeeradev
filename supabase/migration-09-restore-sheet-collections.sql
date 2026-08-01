-- ================================================================
-- Migration 09 — restore the spreadsheet's own collections
-- ----------------------------------------------------------------
-- Migration 08 collapsed every product into a single "Home Décor"
-- collection. That was wrong: the catalogue is meant to follow the
-- sheet's Category column, which carries five collections —
--
--     Home Décor          Ornaments, Sculptures, Table Clocks,
--                         Flower Pots, Utility & Living
--     Home & Garden       Planters
--     Bar & Entertaining  Brass Drinkware
--     Home & Kitchen      Trays
--     Lighting            Floor Lamps
--
-- The authoritative fix is to re-run the catalogue build + import, which
-- writes the correct category onto every product row:
--
--     node scripts/build-catalog.mjs
--     node scripts/import-catalog.mjs
--
-- The import re-seeds the collection tables itself, so in the normal case
-- this migration has nothing left to do. It exists so a database that ran
-- migration 08 can be corrected directly, and so the collection tables can
-- be rebuilt at any time without a full re-import.
--
-- Safe to re-run, and safe to run either before or after the import.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Undo the sub-category merge that migration 08 applied
-- ----------------------------------------------------------------
-- Migration 08 folded the sheet's two planter sizes into one
-- sub-collection. That part was correct and is kept — "Planter B." and
-- "Planter S." are body sizes of the same product, not two ranges. But
-- they belong under Home & Garden, which is where the sheet puts them.
update public.products
set category      = 'Home & Garden',
    category_slug = 'home-garden'
where sub_category_slug = 'planters';

-- ----------------------------------------------------------------
-- 2. Rebuild the collection tree from whatever the products now say
-- ----------------------------------------------------------------
-- Orphans first: a sub-collection or collection with no products behind
-- it would otherwise show up on the shop deck as an empty card.
delete from public.sub_collections sc
where not exists (
  select 1 from public.products p
  where p.sub_category_slug = sc.slug and p.is_active
);

delete from public.collections c
where not exists (
  select 1 from public.products p
  where p.category_slug = c.slug and p.is_active
);

insert into public.collections (slug, label, image_url, sort_order)
select
  p.category_slug,
  max(p.category),
  (array_agg(p.image_url) filter (where p.image_url is not null))[1],
  0
from public.products p
where p.is_active
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
where p.is_active
group by p.sub_category_slug
on conflict (slug) do update
  set label           = excluded.label,
      collection_slug = excluded.collection_slug;

-- ----------------------------------------------------------------
-- 3. Display order
-- ----------------------------------------------------------------
-- Richest collection leads the deck; the single-product ranges trail.
update public.collections set sort_order = v.ord
from (values
  ('home-decor', 1),
  ('home-garden', 2),
  ('bar-entertaining', 3),
  ('home-kitchen', 4),
  ('lighting', 5)
) as v(slug, ord)
where public.collections.slug = v.slug;

update public.sub_collections set sort_order = v.ord
from (values
  ('sculptures', 1),
  ('ornaments', 2),
  ('table-clocks', 3),
  ('flower-pots', 4),
  ('utility-living', 5),
  ('planters', 6),
  ('brass-drinkware', 7),
  ('trays', 8),
  ('floor-lamps', 9)
) as v(slug, ord)
where public.sub_collections.slug = v.slug;

-- Representative image per sub-collection, for the sub-collection deck.
alter table public.sub_collections add column if not exists image_url text;

update public.sub_collections sc
set image_url = sub.img
from (
  select sub_category_slug,
         (array_agg(image_url) filter (where image_url is not null))[1] as img
  from public.products
  where is_active
  group by sub_category_slug
) sub
where sc.slug = sub.sub_category_slug;
