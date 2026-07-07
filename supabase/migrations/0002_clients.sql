-- ============================================================================
-- Marjos Designs — Tanda 3: Clientes / CRM
-- Depends on 0001 (private.is_super_admin, public.set_updated_at, audit_log).
-- Run once via the Supabase Management API.
-- ============================================================================

do $$ begin
  create type public.client_type as enum ('persona', 'empresa');
exception when duplicate_object then null; end $$;

create table if not exists public.clients (
  id             uuid primary key default gen_random_uuid(),
  type           public.client_type not null default 'persona',
  name           text not null,                    -- nombre / razón social
  phone          text,
  whatsapp       text,
  email          text,
  address        text,
  notes          text,                             -- notas internas
  cedula         text,                             -- persona (opcional)
  rnc            text,                             -- empresa (opcional)
  contact_person text,                             -- empresa (opcional)
  status         text not null default 'activo'
                   check (status in ('activo', 'inactivo')),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Fast search by name / phone / whatsapp
create index if not exists clients_name_idx on public.clients (lower(name));
create index if not exists clients_phone_idx on public.clients (phone);
create index if not exists clients_status_idx on public.clients (status);

-- keep updated_at fresh (function defined in 0001)
drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ──────────────────────── RLS + FORCE ─────────────────────────────────────
alter table public.clients enable row level security;
alter table public.clients force  row level security;

-- Managerial data: super_admin only (employees never see Clientes). Uses the
-- hardened private helper from 0001. No DELETE policy — deactivation is a
-- soft-delete via `status` so history is never lost.
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (private.is_super_admin());

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (private.is_super_admin())
  with check (private.is_super_admin());

revoke all on public.clients from anon;
revoke delete, truncate on public.clients from authenticated;
