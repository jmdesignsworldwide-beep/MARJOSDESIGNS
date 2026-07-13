-- ============================================================================
-- Marjos Designs — Mejora POS: productos por ÁREA en la venta rápida.
-- Depends on 0001..0012. Run once via the Supabase Management API.
--
-- Hasta ahora el POS trataba TODA línea como cantidad × precio. Los productos
-- por área (banner, impresión, vinil) necesitan ancho × alto para calcular el
-- precio por pie² — igual que el Cotizador. Estas columnas guardan el desglose
-- para que el recibo y el historial muestren "24 × 36 pulg = 6 pie²".
--
-- Las dimensiones SIEMPRE se guardan en pulgadas (pulg es el default de la UI);
-- pies es solo una comodidad de captura que se convierte a pulgadas.
-- pos_sale_items sigue siendo append-only (heredado de 0006).
-- ============================================================================

alter table public.pos_sale_items
  add column if not exists calc_type text not null default 'quantity'
    check (calc_type in ('area', 'quantity'));

alter table public.pos_sale_items
  add column if not exists width_in numeric(12,2) check (width_in is null or width_in >= 0);

alter table public.pos_sale_items
  add column if not exists height_in numeric(12,2) check (height_in is null or height_in >= 0);

alter table public.pos_sale_items
  add column if not exists sqft numeric(12,4) check (sqft is null or sqft >= 0);
