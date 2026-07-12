-- ============================================================================
-- Marjos Designs — Tanda 5A: Órdenes de trabajo (crear + ver)
-- Depends on 0001 (private.is_super_admin, set_updated_at), 0002 (clients),
-- 0003 (products/calc_type). Run once via the Supabase Management API.
--
-- The column names here intentionally match what the Dashboard (tanda 2) and
-- client stats (tanda 3) already query, so those views light up automatically.
-- ============================================================================

do $$ begin
  create type public.order_stage as enum
    ('recibida', 'en_produccion', 'lista', 'entregada', 'cancelada');
exception when duplicate_object then null; end $$;

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  number          bigint generated always as identity,   -- consecutivo #0001
  client_id       uuid references public.clients (id) on delete set null,
  client_name     text,                                  -- snapshot
  assigned_to     uuid references auth.users (id) on delete set null,
  assigned_name   text,                                  -- snapshot
  description     text,                                  -- resumen de ítems
  subtotal        numeric(12,2) not null default 0,
  discount_type   text not null default 'none' check (discount_type in ('none','amount','percent')),
  discount_value  numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  deposit         numeric(12,2) not null default 0,      -- 50% inicial
  amount_paid     numeric(12,2) not null default 0,      -- pagos → tanda 5B
  stage           public.order_stage not null default 'recibida',
  delivery_date   date,                                  -- entrega prometida
  notes           text,
  source          text not null default 'directa' check (source in ('directa','cotizacion')),
  quote_id        uuid references public.quotes (id) on delete set null,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  delivered_at    timestamptz
);

create table if not exists public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  description text not null,
  calc_type   public.calc_type not null,
  width_in    numeric(10,2),
  height_in   numeric(10,2),
  sqft        numeric(12,4),
  quantity    numeric(12,2),
  unit_price  numeric(12,2) not null,
  subtotal    numeric(12,2) not null,
  position    int not null default 0
);

create index if not exists orders_client_idx on public.orders (client_id, created_at desc);
create index if not exists orders_assigned_idx on public.orders (assigned_to);
create index if not exists orders_delivery_idx on public.orders (delivery_date);
create index if not exists orders_stage_idx on public.orders (stage);
create index if not exists order_items_order_idx on public.order_items (order_id);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.orders      enable row level security;
alter table public.orders      force  row level security;
alter table public.order_items enable row level security;
alter table public.order_items force  row level security;

-- super_admin sees/manages everything. An assigned employee may READ their own
-- orders (prepares the employee view for a later tanda) but cannot create/edit.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select to authenticated
  using (private.is_super_admin() or assigned_to = auth.uid());

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());
-- (no DELETE policy: orders are never hard-deleted — history is permanent)

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
  for select to authenticated
  using (
    private.is_super_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.assigned_to = auth.uid()
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert to authenticated
  with check (private.is_super_admin());

revoke all on public.orders, public.order_items from anon;
revoke delete, truncate on public.orders from authenticated;
