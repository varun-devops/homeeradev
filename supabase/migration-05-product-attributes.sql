-- ================================================================
-- Product attributes for storefront filters + product options.
-- Adds brand, colors, sizes, style, discount, new-arrival flag,
-- stock/availability, and customization notes to products.
-- Safe to re-run (IF NOT EXISTS on every column).
-- ================================================================

alter table public.products
  add column if not exists brand            text,
  add column if not exists style            text,
  add column if not exists colors           text[]  not null default '{}',
  add column if not exists sizes            text[]  not null default '{}',
  add column if not exists discount_percent integer not null default 0,   -- 0..90
  add column if not exists is_new           boolean not null default false,
  add column if not exists stock            integer not null default 0,    -- units on hand
  add column if not exists customizable     boolean not null default false,
  add column if not exists customization_note text;

-- Availability is derived from stock; index the common filter columns.
create index if not exists products_brand_idx    on public.products(brand);
create index if not exists products_is_new_idx    on public.products(is_new);
create index if not exists products_discount_idx  on public.products(discount_percent);
create index if not exists products_stock_idx     on public.products(stock);

-- status comment kept in sync with the app's status set.
comment on column public.orders.status is
  'created|paid|processing|shipped|delivered|cancelled|failed';
