-- Migration 12 — make stock mean something.
--
-- `stock` was written by the admin form and read nowhere else: every product
-- sat at 0 and every one was still purchasable, without limit.
--
-- The catch is that 0 was never a deliberate answer — it is the column
-- default, and no one has ever set a real number. Enforcing "0 means none
-- left" against the data as it stands would take all 73 products off sale
-- the moment this deploys. So stock becomes nullable with a clear meaning:
--
--   NULL      -> not tracked; sells freely, which is today's behaviour
--   0 or more -> tracked; the order route refuses to oversell it
--
-- Existing zeros migrate to NULL, so nothing changes until someone actually
-- sets a number. Turning stock control on becomes a per-product decision
-- made in the admin panel, not a switch this migration throws for you.
--
-- Safe to re-run.

alter table public.products alter column stock drop not null;
alter table public.products alter column stock drop default;

-- Every current 0 is "never set", not "sold out".
update public.products set stock = null where stock = 0;

-- Negative stock is always a bug. This is the backstop that makes
-- overselling impossible rather than merely unlikely: two people buying the
-- last item at the same moment is a race no amount of application-level
-- checking wins, and this turns the loser into a failed write instead of a
-- negative balance.
alter table public.products drop constraint if exists products_stock_non_negative;
alter table public.products
  add constraint products_stock_non_negative check (stock is null or stock >= 0);

-- An order's stock must come off exactly once. Two paths confirm payment --
-- the browser callback (/api/razorpay/verify) and Razorpay's webhook, which
-- also retries -- and both can fire for the same order. Claiming this column
-- in a conditional update is what makes the decrement idempotent: whoever
-- sets it first wins, everyone else sees no row and does nothing.
alter table public.orders
  add column if not exists stock_consumed_at timestamptz;

/*
 * Decrement stock for every tracked line on an order, in one statement.
 *
 * Called once the payment is confirmed. Untracked products (stock is null)
 * are skipped. If any line would go negative the check constraint above
 * aborts the whole statement, so an order can never leave stock inconsistent
 * with what was sold.
 *
 * SECURITY DEFINER because it is invoked with the service-role key from the
 * payment path; the search_path is pinned so the definer's rights cannot be
 * redirected at a table of someone else's choosing.
 */
create or replace function public.consume_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.products p
  set stock = p.stock - oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = p.id
    and p.stock is not null;
end;
$$;

revoke all on function public.consume_order_stock(uuid) from public, anon, authenticated;

-- Products the shop lists are read constantly; stock is now part of that read.
create index if not exists products_stock_idx on public.products (stock) where stock is not null;
