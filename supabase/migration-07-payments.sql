-- ============================================================
-- Migration 07 — Payment confirmation
--
-- Adds the fields the admin panel needs to *confirm* a payment rather
-- than just record that one was attempted, plus an append-only log of
-- everything Razorpay tells us via webhook.
--
-- Safe to re-run.
-- ============================================================

-- ---- Orders: richer payment facts ---------------------------------
alter table public.orders
  add column if not exists payment_method      text,          -- card | upi | netbanking | wallet | emi
  add column if not exists payment_detail      text,          -- "HDFC •••• 4242" / "user@okaxis"
  add column if not exists payment_email       text,
  add column if not exists payment_contact     text,
  add column if not exists amount_paid         integer,       -- rupees actually captured
  add column if not exists paid_at             timestamptz,
  add column if not exists payment_error       text,          -- Razorpay failure description
  add column if not exists confirmed_via       text,          -- checkout | webhook | manual
  add column if not exists refund_id           text,
  add column if not exists amount_refunded     integer default 0,
  add column if not exists refunded_at         timestamptz,
  add column if not exists last_synced_at      timestamptz;

-- Looking an order up by its Razorpay id is the hot path for both the
-- webhook and the admin reconcile button.
create unique index if not exists orders_rzp_order_idx
  on public.orders(razorpay_order_id)
  where razorpay_order_id is not null;

create index if not exists orders_rzp_payment_idx
  on public.orders(razorpay_payment_id)
  where razorpay_payment_id is not null;

-- ---- Payment events (webhook audit + idempotency) -----------------
-- Razorpay retries webhooks until it gets a 2xx, so the same event can
-- arrive several times. `event_id` is unique: a duplicate insert fails,
-- which is how the handler knows to skip the work.
create table if not exists public.payment_events (
  id           uuid primary key default gen_random_uuid(),
  event_id     text unique,                 -- x-razorpay-event-id header
  event        text not null,               -- payment.captured, payment.failed, refund.processed…
  order_id     uuid references public.orders(id) on delete set null,
  rzp_order_id text,
  rzp_payment_id text,
  amount       integer,                     -- rupees
  payload      jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists payment_events_order_idx on public.payment_events(order_id, created_at desc);
create index if not exists payment_events_event_idx on public.payment_events(event, created_at desc);

-- Written only by the service role (webhook + admin actions), read only
-- through the admin panel's service client, so RLS stays fully closed.
alter table public.payment_events enable row level security;
