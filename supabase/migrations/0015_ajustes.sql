-- ============================================================================
-- Marjos Designs — Módulo Ajustes: configuración del sistema (singleton).
-- Depends on 0001..0014. Run once via the Supabase Management API.
--
-- Una sola FILA de configuración (id = 1). Reúne los datos del negocio (que
-- alimentan los documentos/PDF — una sola fuente) y los parámetros que otros
-- módulos ya usan: días de anticipación de entregas y umbral de sobrecarga del
-- calendario. Solo Marjos (super_admin) la ve o edita (RLS + FORCE). Cada
-- cambio se audita desde el server action (audit_log).
-- ============================================================================

create table if not exists public.app_settings (
  id             smallint primary key default 1 check (id = 1),
  -- Datos del negocio (fuente única para recibos / cotizaciones / reportes)
  business_name  text    not null default 'Marjos Designs',
  legal_name     text,
  rnc            text,
  address        text,
  phone          text,
  whatsapp       text,
  email          text,
  instagram      text,
  -- Alertas / notificaciones
  notify_days    smallint[] not null default '{3,1,0}',   -- anticipación de entregas
  overload_warn  smallint not null default 5 check (overload_warn between 1 and 50),
  overload_heavy smallint not null default 8 check (overload_heavy between 1 and 50),
  -- Preferencias
  default_theme  text not null default 'system' check (default_theme in ('light','dark','system')),
  updated_by     uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now(),
  constraint app_settings_overload_order check (overload_heavy >= overload_warn)
);

-- La fila única. Si ya existe, no la toca.
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
alter table public.app_settings force  row level security;

-- Solo super_admin lee/escribe la configuración.
drop policy if exists app_settings_all on public.app_settings;
create policy app_settings_all on public.app_settings for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.app_settings from anon;
