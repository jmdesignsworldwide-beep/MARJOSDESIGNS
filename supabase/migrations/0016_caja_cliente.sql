-- ============================================================================
-- Marjos Designs — Arreglo Caja: enlazar el movimiento manual a un CLIENTE real.
-- Depends on 0001..0015. Run once via the Supabase Management API.
--
-- El "Cliente" del movimiento manual era texto libre suelto que no quedaba
-- guardado como cliente real. Ahora se elige un cliente REGISTRADO; guardamos
-- el enlace (client_id) además del nombre (client_name, que ya existía).
-- cash_movements sigue append-only: agregar una columna nullable no cambia eso.
-- ============================================================================

alter table public.cash_movements
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists cash_movements_client_idx
  on public.cash_movements (client_id) where client_id is not null;
