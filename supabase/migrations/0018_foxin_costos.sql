-- ============================================================================
-- Marjos Designs — Costo → venta → margen: cargar catálogo de suplidor (Foxin)
-- y cotizar viendo el margen. Depends on 0001..0017. Run once via the Mgmt API.
--
-- El catálogo de Foxin REUSA las tablas de Proveedores (tanda 9): suppliers +
-- materials (unit_cost) + supplier_prices + supplier_price_history. No hace
-- falta tabla nueva para los productos del suplidor.
--
-- Lo que sí agregamos: el COSTO en la línea de cotización/orden, para que el
-- margen fluya a Finanzas SIN recaptura, y un margen sugerido por defecto.
-- ============================================================================

-- Costo unitario en la línea (lo que le costó a Marjos), junto al precio de
-- venta que ya existe. Nullable: líneas sin costo conocido siguen igual.
alter table public.quote_lines add column if not exists unit_cost numeric(12,2)
  check (unit_cost is null or unit_cost >= 0);
alter table public.order_items add column if not exists unit_cost numeric(12,2)
  check (unit_cost is null or unit_cost >= 0);

-- Margen sugerido por defecto (%). Marjos lo puede cambiar; siempre editable
-- en cada línea. 50% arranca como sugerencia.
alter table public.app_settings add column if not exists default_margin_pct numeric(6,2)
  not null default 50 check (default_margin_pct >= 0 and default_margin_pct <= 1000);
