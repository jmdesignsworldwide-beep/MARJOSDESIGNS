-- ============================================================================
-- Marjos Designs — Tanda 5B: pagos, etapas, adjuntos, notificaciones
-- Depends on 0001..0004. Run once via the Supabase Management API.
-- Payments and stage history are APPEND-ONLY (inviolable financial trail).
-- ============================================================================

-- New stage between "recibida" and "en_produccion".
alter type public.order_stage add value if not exists 'en_diseno' before 'en_produccion';

-- Cancellation reason on the order.
alter table public.orders add column if not exists cancel_reason text;

-- ─────────────────────────── Payments (append-only) ───────────────────────
create table if not exists public.payments (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  method     text not null check (method in ('efectivo','transferencia','debito','credito')),
  reference  text,                                    -- voucher / referencia
  kind       text not null default 'pago' check (kind in ('pago','reverso')),
  note       text,                                    -- reason for a reverso
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments (order_id, created_at);

-- ────────────────────── Stage history (append-only) ───────────────────────
create table if not exists public.order_stage_history (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders (id) on delete cascade,
  from_stage public.order_stage,
  to_stage   public.order_stage not null,
  reason     text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stage_history_order_idx on public.order_stage_history (order_id, created_at);

-- ────────────────────────────── Attachments ───────────────────────────────
create table if not exists public.order_attachments (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  mime         text,
  size_bytes   bigint,
  uploaded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists attachments_order_idx on public.order_attachments (order_id, created_at);

-- ───────────── Append-only guards (payments + stage history) ───────────────
drop trigger if exists payments_no_update on public.payments;
drop trigger if exists payments_no_delete on public.payments;
create trigger payments_no_update before update on public.payments
  for each row execute function public.prevent_change();
create trigger payments_no_delete before delete on public.payments
  for each row execute function public.prevent_change();

drop trigger if exists stage_history_no_update on public.order_stage_history;
drop trigger if exists stage_history_no_delete on public.order_stage_history;
create trigger stage_history_no_update before update on public.order_stage_history
  for each row execute function public.prevent_change();
create trigger stage_history_no_delete before delete on public.order_stage_history
  for each row execute function public.prevent_change();

-- ──────────────────────────── RLS + FORCE ─────────────────────────────────
alter table public.payments            enable row level security;
alter table public.payments            force  row level security;
alter table public.order_stage_history enable row level security;
alter table public.order_stage_history force  row level security;
alter table public.order_attachments   enable row level security;
alter table public.order_attachments   force  row level security;

-- Payments are MONEY: super_admin only (employees never see amounts).
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
  using (private.is_super_admin());
drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
  with check (private.is_super_admin());

-- Stage history + attachments: super_admin all; assigned employee may READ
-- their own orders' rows (prepares the employee view).
drop policy if exists stage_history_select on public.order_stage_history;
create policy stage_history_select on public.order_stage_history for select to authenticated
  using (
    private.is_super_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.assigned_to = auth.uid())
  );
drop policy if exists stage_history_insert on public.order_stage_history;
create policy stage_history_insert on public.order_stage_history for insert to authenticated
  with check (private.is_super_admin());

drop policy if exists attachments_all on public.order_attachments;
create policy attachments_select on public.order_attachments for select to authenticated
  using (
    private.is_super_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.assigned_to = auth.uid())
  );
drop policy if exists attachments_write on public.order_attachments;
create policy attachments_write on public.order_attachments for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.payments, public.order_stage_history, public.order_attachments from anon;
revoke update, delete, truncate on public.payments from authenticated;
revoke update, delete, truncate on public.order_stage_history from authenticated;

-- ─────────────────────── Private storage bucket ───────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-attachments', 'order-attachments', false, 10485760,
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;
-- No storage.objects policies: the bucket is private and ALL access is via
-- the service_role (uploads) + short-lived signed URLs. anon/authenticated
-- cannot read it directly (default deny), so a file link is never public.
