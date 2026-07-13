-- ============================================================================
-- Marjos Designs — Tanda 10+12: Nóminas + Vista Empleado
-- Depends on 0001..0010. Run once via the Supabase Management API.
--
-- Salary is PRIVATE to Marjos — it lives in employee_payroll (super_admin
-- only), NEVER on profiles (which an employee can read their own row of).
-- Employees change ONLY their own orders' stage, via a SECURITY DEFINER
-- function with internal checks — they get NO table grants on orders.
-- ============================================================================

-- ───────────── Payroll config (salary is here, not on profiles) ───────────
create table if not exists public.employee_payroll (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  weekly_salary   numeric(12,2) not null default 0 check (weekly_salary >= 0),
  employment_type text not null default 'fijo' check (employment_type in ('fijo', 'pasante')),
  can_sell_pos    boolean not null default false,  -- prepared: employee POS selling
  updated_by      uuid references auth.users (id) on delete set null,
  updated_at      timestamptz not null default now()
);

drop trigger if exists employee_payroll_set_updated_at on public.employee_payroll;
create trigger employee_payroll_set_updated_at before update on public.employee_payroll
  for each row execute function public.set_updated_at();

-- ─────────────── Payroll payments (append-only, weekly) ────────────────────
create table if not exists public.payroll_payments (
  id          bigint generated always as identity primary key,
  profile_id  uuid not null references public.profiles (id) on delete restrict,
  week_start  date not null,
  week_end    date not null,
  amount      numeric(12,2) not null check (amount >= 0),
  deduction   numeric(12,2) not null default 0 check (deduction >= 0),
  net_amount  numeric(12,2) not null check (net_amount >= 0),
  method      text not null check (method in ('efectivo', 'transferencia', 'debito', 'credito')),
  note        text,
  expense_id  bigint references public.expenses (id) on delete set null, -- Gastos hook
  paid_by     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists payroll_payments_profile_idx on public.payroll_payments (profile_id, week_start desc);
create index if not exists payroll_payments_created_idx  on public.payroll_payments (created_at desc);

drop trigger if exists payroll_payments_no_update on public.payroll_payments;
drop trigger if exists payroll_payments_no_delete on public.payroll_payments;
create trigger payroll_payments_no_update before update on public.payroll_payments
  for each row execute function public.prevent_change();
create trigger payroll_payments_no_delete before delete on public.payroll_payments
  for each row execute function public.prevent_change();

-- ─────────────────────── Vacations (simple, relaxed) ──────────────────────
create table if not exists public.employee_vacations (
  id         bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  note       text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists employee_vacations_profile_idx on public.employee_vacations (profile_id, start_date desc);

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.employee_payroll   enable row level security;
alter table public.employee_payroll   force  row level security;
alter table public.payroll_payments   enable row level security;
alter table public.payroll_payments   force  row level security;
alter table public.employee_vacations enable row level security;
alter table public.employee_vacations force  row level security;

-- Everything payroll = super_admin ONLY (employees never see their own salary).
drop policy if exists employee_payroll_all on public.employee_payroll;
create policy employee_payroll_all on public.employee_payroll for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists payroll_payments_select on public.payroll_payments;
create policy payroll_payments_select on public.payroll_payments for select to authenticated
  using (private.is_super_admin());
drop policy if exists payroll_payments_insert on public.payroll_payments;
create policy payroll_payments_insert on public.payroll_payments for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists employee_vacations_all on public.employee_vacations;
create policy employee_vacations_all on public.employee_vacations for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.employee_payroll, public.payroll_payments, public.employee_vacations from anon;
revoke update, delete, truncate on public.payroll_payments from authenticated;

-- ─────── Employee stage changes: NOT via a DB function ─────────────────────
-- Employees never get UPDATE on orders (orders_update is super_admin-only).
-- The employee's "advance my order" action runs on the SERVER: it verifies
-- the caller's session (requireAuth) AND that the order is assigned to them
-- AND that the target stage is allowed, then writes with the service_role.
-- Keeping this in the app layer (no SECURITY DEFINER function exposed to
-- authenticated) avoids granting privileged execution to employees while the
-- write path stays gated by the verified session. See lib/empleado/actions.ts.
