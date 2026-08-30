-- Migration 10 — track when a product was last edited.
--
-- products already had created_at but nothing recorded an edit, so the admin
-- table could not show when a price or description last changed. A trigger
-- keeps it correct no matter what does the writing: the admin panel, the
-- catalogue import script, or a hand-edit in the Supabase dashboard.
--
-- Safe to re-run.

alter table public.products
  add column if not exists updated_at timestamptz not null default now();

-- Existing rows have never been edited through the app, so the best available
-- answer is when they were created.
update public.products
set updated_at = coalesce(created_at, now())
where updated_at is null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at
  before update on public.products
  for each row
  execute function public.touch_updated_at();

-- The admin list sorts by these, and the storefront never reads them.
create index if not exists products_updated_at_idx on public.products (updated_at desc);
create index if not exists products_created_at_idx on public.products (created_at desc);
