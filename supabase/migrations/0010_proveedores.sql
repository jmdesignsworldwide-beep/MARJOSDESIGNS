-- ============================================================================
-- Marjos Designs — Tanda 9: Proveedores + Inventario ligero
-- Depends on 0001..0009. Run once via the Supabase Management API.
--
-- Suppliers are the protagonist (who to buy from, at what price). Inventory is
-- LIGHT: materials list with OPTIONAL, soft stock — never auto-deducted. The
-- schema (track_stock/stock/min_stock/unit_cost) already permits a future
-- "strict mode" (auto-deduct per order + valorización) WITHOUT a rebuild.
-- Everything super_admin-only; price changes are audited & append-only.
-- ============================================================================

-- ───────────────────────────── Suppliers ──────────────────────────────────
create table if not exists public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text,
  whatsapp       text,
  email          text,
  address        text,
  contact_person text,
  notes          text,
  balance_owed   numeric(12,2) not null default 0 check (balance_owed >= 0),
  status         text not null default 'activo' check (status in ('activo', 'inactivo')),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ───────────────────────── Materials (light) ──────────────────────────────
create table if not exists public.materials (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text,
  unit                text not null default 'unidad',        -- unidad de medida
  default_supplier_id uuid references public.suppliers (id) on delete set null,
  product_id          uuid references public.products (id) on delete set null, -- margin link (optional)
  unit_cost           numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  -- Soft, OPTIONAL stock. track_stock=false → just a listed material (no count).
  track_stock         boolean not null default false,
  stock               numeric(12,2) check (stock is null or stock >= 0),
  min_stock           numeric(12,2) check (min_stock is null or min_stock >= 0),
  last_purchase_at    date,
  status              text not null default 'activo' check (status in ('activo', 'inactivo')),
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists materials_supplier_idx on public.materials (default_supplier_id);

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at before update on public.materials
  for each row execute function public.set_updated_at();

-- ─────────────── Supplier price list (per supplier × material) ─────────────
create table if not exists public.supplier_prices (
  id          bigint generated always as identity primary key,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  price       numeric(12,2) not null check (price >= 0),
  created_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (supplier_id, material_id)
);
create index if not exists supplier_prices_material_idx on public.supplier_prices (material_id, price);

drop trigger if exists supplier_prices_set_updated_at on public.supplier_prices;
create trigger supplier_prices_set_updated_at before update on public.supplier_prices
  for each row execute function public.set_updated_at();

-- ────────── Price change history (append-only, who + when) ─────────────────
create table if not exists public.supplier_price_history (
  id          bigint generated always as identity primary key,
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  old_price   numeric(12,2),
  new_price   numeric(12,2) not null,
  changed_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists supplier_price_history_idx on public.supplier_price_history (supplier_id, material_id, created_at desc);

drop trigger if exists supplier_price_history_no_update on public.supplier_price_history;
drop trigger if exists supplier_price_history_no_delete on public.supplier_price_history;
create trigger supplier_price_history_no_update before update on public.supplier_price_history
  for each row execute function public.prevent_change();
create trigger supplier_price_history_no_delete before delete on public.supplier_price_history
  for each row execute function public.prevent_change();

-- ─────────── Purchases → Gastos hook (no duplicate table) ──────────────────
-- A purchase to a supplier IS a production expense; tag it with the supplier so
-- the supplier's purchase history = expenses where supplier_id = X.
alter table public.expenses add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.suppliers             enable row level security;
alter table public.suppliers             force  row level security;
alter table public.materials             enable row level security;
alter table public.materials             force  row level security;
alter table public.supplier_prices       enable row level security;
alter table public.supplier_prices       force  row level security;
alter table public.supplier_price_history enable row level security;
alter table public.supplier_price_history force  row level security;

-- All supplier/material/price data is sensitive business info: super_admin only.
drop policy if exists suppliers_all on public.suppliers;
create policy suppliers_all on public.suppliers for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists materials_all on public.materials;
create policy materials_all on public.materials for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists supplier_prices_all on public.supplier_prices;
create policy supplier_prices_all on public.supplier_prices for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists supplier_price_history_select on public.supplier_price_history;
create policy supplier_price_history_select on public.supplier_price_history for select to authenticated
  using (private.is_super_admin());
drop policy if exists supplier_price_history_insert on public.supplier_price_history;
create policy supplier_price_history_insert on public.supplier_price_history for insert to authenticated
  with check (private.is_super_admin());

revoke all on public.suppliers, public.materials, public.supplier_prices, public.supplier_price_history from anon;
revoke update, delete, truncate on public.supplier_price_history from authenticated;
