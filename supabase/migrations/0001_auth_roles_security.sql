-- ============================================================================
-- Marjos Designs — Tanda 1B: Auth + Roles + Fort Knox security
-- Idempotent-ish migration. Run once via the Supabase Management API.
-- ============================================================================

-- ───────────────────────────── Enums ──────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('super_admin', 'empleado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_status as enum ('activo', 'inactivo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.access_event as enum (
    'login_success', 'login_failed', 'logout', 'login_blocked_inactive'
  );
exception when duplicate_object then null; end $$;

-- ──────────────────────────── Tables ──────────────────────────────────────

-- Profiles: 1:1 with auth.users. Only what auth/roles need (salary & sensitive
-- payroll data are deferred to the Nóminas tanda).
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null,
  role       public.user_role   not null default 'empleado',
  position   text,                       -- cargo
  status     public.user_status not null default 'activo',
  phone      text,
  hire_date  date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Access history: append-only login audit (success / failed / logout / blocked)
create table if not exists public.access_history (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users (id) on delete set null,
  email_attempted text,
  event_type      public.access_event not null,
  ip              text,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists access_history_email_time_idx
  on public.access_history (lower(email_attempted), created_at desc);
create index if not exists access_history_user_idx
  on public.access_history (user_id, created_at desc);

-- Audit log: append-only "who did what" (user create / edit / deactivate, ...)
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_time_idx on public.audit_log (created_at desc);

-- ───────────────────── Helper function (hardened) ─────────────────────────
-- SECURITY DEFINER so RLS policies can check the super_admin role without
-- recursing on profiles. Lives in a PRIVATE schema (NOT exposed by PostgREST)
-- so it can't be invoked as an RPC by signed-in users — this closes the
-- Supabase "SECURITY DEFINER function executable by authenticated" advisor
-- warning while the RLS policies can still call it. Fixed search_path.
create schema if not exists private;
grant usage on schema private to authenticated;
revoke all on schema private from anon, public;

create or replace function private.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and status = 'activo'
  );
$$;

revoke all on function private.is_super_admin() from public, anon;
grant execute on function private.is_super_admin() to authenticated;

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- NOTE: profiles are created explicitly by the server using the service_role
-- client (which has BYPASSRLS), NOT by an on-auth-insert trigger. Under FORCE
-- ROW LEVEL SECURITY a SECURITY DEFINER trigger owned by `postgres` (no
-- BYPASSRLS) would be blocked by the profiles INSERT policy, breaking user
-- creation. Doing the insert with service_role is deterministic and keeps
-- FORCE RLS intact.

-- Append-only guard: block UPDATE/DELETE at the base level, for EVERY role
-- (triggers fire even for the table owner / service_role).
create or replace function public.prevent_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'append-only table (%): % is not allowed', tg_table_name, tg_op;
end;
$$;

drop trigger if exists access_history_no_update on public.access_history;
drop trigger if exists access_history_no_delete on public.access_history;
create trigger access_history_no_update before update on public.access_history
  for each row execute function public.prevent_change();
create trigger access_history_no_delete before delete on public.access_history
  for each row execute function public.prevent_change();

drop trigger if exists audit_log_no_update on public.audit_log;
drop trigger if exists audit_log_no_delete on public.audit_log;
create trigger audit_log_no_update before update on public.audit_log
  for each row execute function public.prevent_change();
create trigger audit_log_no_delete before delete on public.audit_log
  for each row execute function public.prevent_change();

-- ──────────────────────── RLS + FORCE (all tables) ────────────────────────
alter table public.profiles       enable row level security;
alter table public.profiles       force  row level security;
alter table public.access_history enable row level security;
alter table public.access_history force  row level security;
alter table public.audit_log      enable row level security;
alter table public.audit_log      force  row level security;

-- profiles: a user sees only their own row; super_admin sees all.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_super_admin());

-- Only super_admin may create / modify profiles from the client.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());
-- (no DELETE policy: nobody deletes profiles from the client)

-- access_history: employees can read NOTHING here; super_admin reads all.
-- Inserts are performed server-side with the service_role (bypasses RLS).
drop policy if exists access_history_select on public.access_history;
create policy access_history_select on public.access_history
  for select to authenticated
  using (private.is_super_admin());

-- audit_log: same — super_admin read only, inserts via service_role.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (private.is_super_admin());

-- Extra hardening: strip UPDATE/DELETE/TRUNCATE grants from client roles.
revoke update, delete, truncate on public.access_history from anon, authenticated;
revoke update, delete, truncate on public.audit_log      from anon, authenticated;
revoke all on public.access_history from anon;
revoke all on public.audit_log      from anon;
revoke all on public.profiles       from anon;
