-- ============================================================================
-- Marjos Designs — Tanda 4: Cotizador (productos/precios, cotizaciones)
-- Depends on 0001 (private.is_super_admin, set_updated_at, prevent_change)
-- and 0002 (clients). Run once via the Supabase Management API.
-- ============================================================================

do $$ begin
  create type public.calc_type as enum ('area', 'quantity');
exception when duplicate_object then null; end $$;

-- ─────────────────────────── Products / price list ────────────────────────
create table if not exists public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  calc_type  public.calc_type not null,
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  unit_label text not null default 'unidad',        -- 'pie²' | 'unidad'
  status     text not null default 'activo' check (status in ('activo','inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only price change log (who changed a price and when)
create table if not exists public.price_history (
  id           bigint generated always as identity primary key,
  product_id   uuid references public.products (id) on delete set null,
  product_name text,
  old_price    numeric(12,2),
  new_price    numeric(12,2),
  changed_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────── Quotes + lines ───────────────────────────────
create table if not exists public.quotes (
  id              uuid primary key default gen_random_uuid(),
  number          bigint generated always as identity,   -- human: COT-0001
  client_id       uuid references public.clients (id) on delete set null,
  client_name     text,                                  -- snapshot
  subtotal        numeric(12,2) not null default 0,
  discount_type   text not null default 'none' check (discount_type in ('none','amount','percent')),
  discount_value  numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total           numeric(12,2) not null default 0,
  deposit         numeric(12,2) not null default 0,      -- 50% inicial
  status          text not null default 'guardada' check (status in ('guardada','convertida','anulada')),
  notes           text,
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.quote_lines (
  id          bigint generated always as identity primary key,
  quote_id    uuid not null references public.quotes (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  description text not null,                             -- snapshot of product name
  calc_type   public.calc_type not null,
  width_in    numeric(10,2),
  height_in   numeric(10,2),
  sqft        numeric(12,4),
  quantity    numeric(12,2),
  unit_price  numeric(12,2) not null,                    -- price used (may be overridden)
  subtotal    numeric(12,2) not null,
  position    int not null default 0
);

create index if not exists quote_lines_quote_idx on public.quote_lines (quote_id);
create index if not exists quotes_client_idx on public.quotes (client_id, created_at desc);

-- updated_at triggers (function from 0001)
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- price_history is append-only (prevent_change from 0001)
drop trigger if exists price_history_no_update on public.price_history;
drop trigger if exists price_history_no_delete on public.price_history;
create trigger price_history_no_update before update on public.price_history
  for each row execute function public.prevent_change();
create trigger price_history_no_delete before delete on public.price_history
  for each row execute function public.prevent_change();

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.products      enable row level security;
alter table public.products      force  row level security;
alter table public.price_history enable row level security;
alter table public.price_history force  row level security;
alter table public.quotes        enable row level security;
alter table public.quotes        force  row level security;
alter table public.quote_lines   enable row level security;
alter table public.quote_lines   force  row level security;

-- All Cotizador data is managerial: super_admin only.
drop policy if exists products_all on public.products;
create policy products_all on public.products for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists price_history_select on public.price_history;
create policy price_history_select on public.price_history for select to authenticated
  using (private.is_super_admin());
drop policy if exists price_history_insert on public.price_history;
create policy price_history_insert on public.price_history for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists quotes_all on public.quotes;
create policy quotes_all on public.quotes for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists quote_lines_all on public.quote_lines;
create policy quote_lines_all on public.quote_lines for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.products, public.price_history, public.quotes, public.quote_lines from anon;
revoke delete, truncate on public.price_history from authenticated;

-- ──────────────────────────── Seed base price list ────────────────────────
insert into public.products (name, calc_type, base_price, unit_label)
select * from (values
  ('Banner (lona)',            'area'::public.calc_type,     150, 'pie²'),
  ('Vinil impreso',           'area'::public.calc_type,     180, 'pie²'),
  ('Impresión gran formato',  'area'::public.calc_type,     200, 'pie²'),
  ('Taza sublimada',          'quantity'::public.calc_type, 180, 'unidad'),
  ('Camiseta DTF',            'quantity'::public.calc_type, 350, 'unidad'),
  ('Gorra bordada',           'quantity'::public.calc_type, 250, 'unidad'),
  ('Hoodie',                  'quantity'::public.calc_type, 750, 'unidad'),
  ('Llavero',                 'quantity'::public.calc_type,  60, 'unidad'),
  ('Bolígrafo personalizado', 'quantity'::public.calc_type,  35, 'unidad'),
  ('Letrero',                 'quantity'::public.calc_type, 500, 'unidad')
) as v(name, calc_type, base_price, unit_label)
where not exists (select 1 from public.products);
