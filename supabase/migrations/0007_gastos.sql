-- ============================================================================
-- Marjos Designs — Tanda 8: Gastos y recibos (lo que SALE)
-- Depends on 0001..0006. Run once via the Supabase Management API.
--
-- The other half of profit. Super_admin-only, whole-peso exact, inviolable
-- history (no silent DELETE; corrections are audited soft-voids). Receipts
-- live in a PRIVATE bucket (service_role + signed URLs only).
-- ============================================================================

do $$ begin
  create type public.expense_group as enum ('produccion', 'negocio', 'personal');
exception when duplicate_object then null; end $$;

-- ───────────────────────────── Categories ─────────────────────────────────
create table if not exists public.expense_categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  grp        public.expense_group not null,
  status     text not null default 'activo' check (status in ('activo', 'inactivo')),
  is_system  boolean not null default false,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.expense_categories (name, grp, is_system, position) values
  ('Lona',                     'produccion', true, 1),
  ('Vinil',                    'produccion', true, 2),
  ('Tazas en blanco',          'produccion', true, 3),
  ('Camisetas en blanco',      'produccion', true, 4),
  ('Tinta',                    'produccion', true, 5),
  ('Otros insumos',            'produccion', true, 6),
  ('Alquiler',                 'negocio',    true, 10),
  ('Servicios (luz/agua/internet)', 'negocio', true, 11),
  ('Combustible',              'negocio',    true, 12),
  ('Mantenimiento',            'negocio',    true, 13),
  ('Equipos',                  'negocio',    true, 14),
  ('Salarios / Nómina',        'negocio',    true, 15),
  ('Otros del negocio',        'negocio',    true, 16),
  ('Gasto personal',           'personal',   true, 20)
on conflict do nothing;

-- ────────────────────────────── Expenses ──────────────────────────────────
create table if not exists public.expenses (
  id           bigint generated always as identity primary key,
  category_id  uuid not null references public.expense_categories (id) on delete restrict,
  description  text not null,
  amount       numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  method       text not null check (method in ('efectivo', 'transferencia', 'debito', 'credito')),
  vendor       text,
  notes        text,
  is_recurring boolean not null default false,
  receipt_path text,
  product_id   uuid references public.products (id) on delete set null,  -- margin hook (optional)
  status       text not null default 'activo' check (status in ('activo', 'anulado')),
  void_reason  text,
  voided_by    uuid references auth.users (id) on delete set null,
  voided_at    timestamptz,
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists expenses_date_idx     on public.expenses (expense_date desc);
create index if not exists expenses_category_idx  on public.expenses (category_id);
create index if not exists expenses_recurring_idx on public.expenses (is_recurring) where is_recurring;

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();

-- Append-only for DELETE: a gasto is never silently removed (soft-void instead).
-- UPDATE is allowed but every edit is audited by the server action.
drop trigger if exists expenses_no_delete on public.expenses;
create trigger expenses_no_delete before delete on public.expenses
  for each row execute function public.prevent_change();

-- ───────────── Caja hook: an efectivo expense can leave the drawer ─────────
alter table public.cash_movements drop constraint if exists cash_movements_source_check;
alter table public.cash_movements add constraint cash_movements_source_check
  check (source in ('order_payment', 'order_reverso', 'pos_sale', 'pos_void', 'manual', 'expense'));
alter table public.cash_movements add column if not exists expense_id bigint references public.expenses (id) on delete set null;

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.expenses           enable row level security;
alter table public.expenses           force  row level security;
alter table public.expense_categories enable row level security;
alter table public.expense_categories force  row level security;

drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists expense_categories_all on public.expense_categories;
create policy expense_categories_all on public.expense_categories for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.expenses, public.expense_categories from anon;
revoke delete, truncate on public.expenses from authenticated;

-- ─────────────────────── Private receipts bucket ──────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-receipts', 'expense-receipts', false, 10485760,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;
-- Private: all access via service_role + short-lived signed URLs (never public).
