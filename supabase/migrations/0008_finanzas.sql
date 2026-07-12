-- ============================================================================
-- Marjos Designs — Tanda 11: Finanzas / Contabilidad
-- Depends on 0001..0007. Run once via the Supabase Management API.
--
-- Finanzas is READ-ONLY over existing money tables (payments, pos_sales,
-- expenses, orders). No new tables/views → no new attack surface; all
-- aggregation happens server-side in TypeScript, gated by super_admin.
--
-- The ONLY schema change: an optional per-product cost to compute real margin.
-- products RLS is already super_admin-only (0003), so cost never leaks to an
-- employee.
-- ============================================================================

alter table public.products
  add column if not exists unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0);

comment on column public.products.unit_cost is
  'Optional production cost per unit (or per ft² for area products). NULL = no margin computed. Super_admin only.';
