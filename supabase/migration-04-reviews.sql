-- ============================================================
--  Migration 04 — product reviews & ratings
-- ============================================================
-- Run in the Supabase SQL editor AFTER migration-03. Safe to re-run.
-- ============================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  author_name text,
  created_at  timestamptz not null default now(),
  -- one review per user per product
  unique (product_id, user_id)
);

create index if not exists reviews_product_idx on public.reviews(product_id);

alter table public.reviews enable row level security;

-- Anyone can read reviews.
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews for select using (true);

-- A user may write a review ONLY for a product they have a PAID order for,
-- and only as themselves. (Verified-purchase reviews.)
drop policy if exists "reviews buyer write"  on public.reviews;
drop policy if exists "reviews owner update" on public.reviews;
drop policy if exists "reviews owner delete" on public.reviews;

create policy "reviews buyer write" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      where o.user_id = auth.uid()
        and o.status = 'paid'
        and oi.product_id = reviews.product_id
    )
  );

create policy "reviews owner update" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reviews owner delete" on public.reviews
  for delete using (auth.uid() = user_id);
