-- ============================================================================
-- Marjos Designs — Tanda 7: Caja + POS (venta rápida)
-- Depends on 0001..0005. Run once via the Supabase Management API.
--
-- The money of the day lands here. Everything is super_admin-only (employees
-- never see totals/finances), whole-peso exact, and INVIOLABLE:
--   · cash_movements  → append-only ledger (no UPDATE/DELETE ever)
--   · pos_sales       → append-only except the completada→anulada void
--   · cash_registers  → locked forever once cerrada
-- ============================================================================

-- ─────────────────────────── Cash register (día) ──────────────────────────
create table if not exists public.cash_registers (
  id            uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  opening_float numeric(12,2) not null default 0 check (opening_float >= 0),
  status        text not null default 'abierta' check (status in ('abierta','cerrada')),
  opened_by     uuid references auth.users (id) on delete set null,
  opened_at     timestamptz not null default now(),
  counted_cash  numeric(12,2) check (counted_cash is null or counted_cash >= 0),
  expected_cash numeric(12,2),
  difference    numeric(12,2),
  closing_note  text,
  closed_by     uuid references auth.users (id) on delete set null,
  closed_at     timestamptz
);
-- At most ONE open register at a time.
create unique index if not exists cash_registers_one_open
  on public.cash_registers (status) where status = 'abierta';

-- ──────────────────────── POS sales (venta rápida) ─────────────────────────
create table if not exists public.pos_sales (
  id             uuid primary key default gen_random_uuid(),
  number         bigint generated always as identity,
  register_id    uuid not null references public.cash_registers (id) on delete restrict,
  client_name    text,
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  discount_type  text not null default 'none' check (discount_type in ('none','amount','percent')),
  discount_value numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total          numeric(12,2) not null check (total >= 0),
  method         text not null check (method in ('efectivo','transferencia','debito','credito')),
  reference      text,
  cash_received  numeric(12,2) check (cash_received is null or cash_received >= 0),
  change_given   numeric(12,2) check (change_given is null or change_given >= 0),
  status         text not null default 'completada' check (status in ('completada','anulada')),
  void_reason    text,
  voided_by      uuid references auth.users (id) on delete set null,
  voided_at      timestamptz,
  sold_by        uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists pos_sales_register_idx on public.pos_sales (register_id, created_at);
create index if not exists pos_sales_created_idx  on public.pos_sales (created_at desc);

create table if not exists public.pos_sale_items (
  id         bigint generated always as identity primary key,
  sale_id    uuid not null references public.pos_sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity   numeric(12,2) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  subtotal   numeric(12,2) not null check (subtotal >= 0),
  position   int not null default 0
);
create index if not exists pos_sale_items_sale_idx on public.pos_sale_items (sale_id, position);

-- ───────────────────── Cash movements (append-only ledger) ─────────────────
-- One row per money event in a register. Order payments and POS sales flow in
-- here AUTOMATICALLY (cero recaptura); manual entries too. Voids are new
-- 'salida' rows — the ledger is never edited.
create table if not exists public.cash_movements (
  id          bigint generated always as identity primary key,
  register_id uuid not null references public.cash_registers (id) on delete restrict,
  direction   text not null default 'entrada' check (direction in ('entrada','salida')),
  source      text not null check (source in ('order_payment','order_reverso','pos_sale','pos_void','manual')),
  amount      numeric(12,2) not null check (amount > 0),
  method      text not null check (method in ('efectivo','transferencia','debito','credito')),
  reference   text,
  concept     text,
  client_name text,
  order_id    uuid references public.orders (id) on delete set null,
  payment_id  bigint references public.payments (id) on delete set null,
  pos_sale_id uuid references public.pos_sales (id) on delete set null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists cash_movements_register_idx on public.cash_movements (register_id, created_at);

-- ─────────────────────────── Inviolability guards ─────────────────────────
-- Ledger: fully append-only.
drop trigger if exists cash_movements_no_update on public.cash_movements;
drop trigger if exists cash_movements_no_delete on public.cash_movements;
create trigger cash_movements_no_update before update on public.cash_movements
  for each row execute function public.prevent_change();
create trigger cash_movements_no_delete before delete on public.cash_movements
  for each row execute function public.prevent_change();

-- Registers: block DELETE always; block UPDATE once cerrada (closing is final).
create or replace function public.guard_register_closed()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'cerrada' then
    raise exception 'caja cerrada (%): no se puede modificar un cierre', old.business_date;
  end if;
  return new;
end;
$$;
drop trigger if exists cash_registers_lock_closed on public.cash_registers;
drop trigger if exists cash_registers_no_delete on public.cash_registers;
create trigger cash_registers_lock_closed before update on public.cash_registers
  for each row execute function public.guard_register_closed();
create trigger cash_registers_no_delete before delete on public.cash_registers
  for each row execute function public.prevent_change();

-- POS sales: only the completada→anulada void transition is allowed; no DELETE.
create or replace function public.guard_pos_sale_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'completada' and new.status = 'anulada'
     and new.subtotal = old.subtotal and new.total = old.total
     and new.method = old.method and new.created_at = old.created_at then
    return new;  -- audited void, amounts untouched
  end if;
  raise exception 'venta POS inviolable: solo se permite anular (con motivo)';
end;
$$;
drop trigger if exists pos_sales_guard_update on public.pos_sales;
drop trigger if exists pos_sales_no_delete on public.pos_sales;
create trigger pos_sales_guard_update before update on public.pos_sales
  for each row execute function public.guard_pos_sale_change();
create trigger pos_sales_no_delete before delete on public.pos_sales
  for each row execute function public.prevent_change();

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.cash_registers enable row level security;
alter table public.cash_registers force  row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_movements force  row level security;
alter table public.pos_sales      enable row level security;
alter table public.pos_sales      force  row level security;
alter table public.pos_sale_items enable row level security;
alter table public.pos_sale_items force  row level security;

-- Caja + POS are gerencial money: SUPER_ADMIN ONLY. Employees see nothing here.
-- (sold_by keeps the venta→empleado link ready for the employee view, tanda 12.)
drop policy if exists cash_registers_all on public.cash_registers;
create policy cash_registers_all on public.cash_registers for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists cash_movements_select on public.cash_movements;
create policy cash_movements_select on public.cash_movements for select to authenticated
  using (private.is_super_admin());
drop policy if exists cash_movements_insert on public.cash_movements;
create policy cash_movements_insert on public.cash_movements for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists pos_sales_all on public.pos_sales;
create policy pos_sales_all on public.pos_sales for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists pos_sale_items_all on public.pos_sale_items;
create policy pos_sale_items_all on public.pos_sale_items for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.cash_registers, public.cash_movements, public.pos_sales, public.pos_sale_items from anon;
revoke update, delete, truncate on public.cash_movements from authenticated;
revoke delete, truncate on public.cash_registers from authenticated;
revoke delete, truncate on public.pos_sales from authenticated;
