-- ============================================================================
-- Marjos Designs — PIN de seguridad (reusable) + borrado inteligente de
-- empleados. Depends on 0001..0016. Run once via the Supabase Management API.
--
-- 1) PIN: un PIN de 4 dígitos de Marjos para acciones destructivas. Se guarda
--    HASHEADO (scrypt) en app_settings — nunca en texto plano. Con protección
--    contra fuerza bruta (intentos fallidos + bloqueo temporal).
-- 2) ARCHIVAR: un tercer estado 'archivado' para empleados con historial real
--    (se ocultan pero su rastro en órdenes/nómina se conserva inviolable). Los
--    de prueba sin historial se borran de verdad (a nivel de app).
--
-- NOTA: `alter type ... add value` debe correrse en su propia sentencia (no en
-- la misma transacción donde se usaría). Aquí no se usa en esta migración.
-- ============================================================================

alter type public.user_status add value if not exists 'archivado';

-- PIN de seguridad (hasheado) + anti fuerza bruta. Vive en la fila única.
alter table public.app_settings add column if not exists pin_hash text;
alter table public.app_settings add column if not exists pin_set_at timestamptz;
alter table public.app_settings add column if not exists pin_failed_attempts smallint not null default 0;
alter table public.app_settings add column if not exists pin_locked_until timestamptz;
