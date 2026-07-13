-- ============================================================================
-- Marjos Designs — Mejora de Gastos: subcategorías + lectura de factura (OCR).
-- Depends on 0001..0013. Run once via the Supabase Management API.
--
-- 1) SUBCATEGORÍAS: el modelo ya es Grupo (producción/negocio/personal) →
--    "categoría" (expense_categories). Esas categorías SON las subcategorías.
--    El hueco real era PERSONAL, que solo tenía una categoría genérica. Aquí
--    sembramos subcategorías personales concretas (supermercado, comida, casa,
--    luz…) + un par que faltaban en negocio, para que Marjos vea "cuánto gasté
--    en supermercado este mes". Un solo lugar de gestión (expense_categories).
--
-- 2) LECTURA DE FACTURA: expense_receipt_items guarda EXACTO lo que la visión
--    de IA transcribió del recibo (nombre, cantidad, precio). Solo Marjos lo ve
--    (RLS + FORCE super_admin). La imagen sigue en el bucket privado.
-- ============================================================================

-- ─────────────── Subcategorías nuevas (idempotente por name+grp) ───────────
insert into public.expense_categories (name, grp, is_system, position)
select v.name, v.grp::public.expense_group, true, v.position
from (values
  -- Personal (el grupo que estaba genérico)
  ('Supermercado',                'personal', 21),
  ('Comida / Restaurante',        'personal', 22),
  ('Casa / Alquiler',             'personal', 23),
  ('Servicios (luz/agua/internet)','personal', 24),
  ('Transporte / Combustible',    'personal', 25),
  ('Salud',                       'personal', 26),
  ('Educación',                   'personal', 27),
  ('Ropa',                        'personal', 28),
  ('Entretenimiento',             'personal', 29),
  ('Otros personales',            'personal', 30),
  -- Faltantes en negocio / producción
  ('Publicidad',                  'negocio',  17),
  ('Textiles en blanco (gorras/hoodies)', 'produccion', 7)
) as v(name, grp, position)
where not exists (
  select 1 from public.expense_categories c
  where c.name = v.name and c.grp = v.grp::public.expense_group
);

-- ───────────────── Resumen de lectura en el gasto ──────────────────────────
alter table public.expenses add column if not exists receipt_read boolean not null default false;
alter table public.expenses add column if not exists receipt_total numeric(12,2)
  check (receipt_total is null or receipt_total >= 0);

-- ─────────────────── Ítems transcritos del recibo (OCR) ────────────────────
create table if not exists public.expense_receipt_items (
  id         bigint generated always as identity primary key,
  expense_id bigint not null references public.expenses (id) on delete cascade,
  name       text not null,
  quantity   numeric(12,3) check (quantity is null or quantity >= 0),
  unit_price numeric(12,2) check (unit_price is null or unit_price >= 0),
  line_total numeric(12,2) check (line_total is null or line_total >= 0),
  position   int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists expense_receipt_items_expense_idx
  on public.expense_receipt_items (expense_id, position);

alter table public.expense_receipt_items enable row level security;
alter table public.expense_receipt_items force  row level security;

-- Solo Marjos (super_admin) — los ítems del recibo son privados como el gasto.
drop policy if exists expense_receipt_items_all on public.expense_receipt_items;
create policy expense_receipt_items_all on public.expense_receipt_items for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.expense_receipt_items from anon;
