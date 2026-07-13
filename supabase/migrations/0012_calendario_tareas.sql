-- ============================================================================
-- Marjos Designs — Mejora del Calendario: tareas/pendientes + recurrencia +
-- recordatorios de pago con monto (enganche con Gastos).
-- Depends on 0001..0011. Run once via the Supabase Management API.
--
-- Recurring notes are stored as a SINGLE series row (calendar_notes) with a
-- recurrence rule; occurrences are COMPUTED per visible range (no duplicate
-- rows). Per-occurrence state (done/paid, skip, or "solo esta" override) lives
-- in calendar_note_occurrences. All super_admin-only (Marjos's private notes).
-- ============================================================================

-- Expand note kinds and add amount + recurrence to the series.
alter table public.calendar_notes drop constraint if exists calendar_notes_kind_check;
alter table public.calendar_notes add constraint calendar_notes_kind_check
  check (kind in ('nota', 'tarea', 'pago', 'evento', 'feriado'));

alter table public.calendar_notes add column if not exists amount numeric(12,2) check (amount is null or amount >= 0);
alter table public.calendar_notes add column if not exists recurrence text not null default 'once'
  check (recurrence in ('once', 'weekly', 'monthly'));
alter table public.calendar_notes add column if not exists recurrence_end date;

-- Per-occurrence state (only rows for occurrences that were acted on/overridden).
create table if not exists public.calendar_note_occurrences (
  id              bigint generated always as identity primary key,
  note_id         bigint not null references public.calendar_notes (id) on delete cascade,
  occurrence_date date not null,
  done            boolean not null default false,
  done_at         timestamptz,
  skipped         boolean not null default false,        -- "eliminar solo esta"
  override_title  text,                                   -- "editar solo esta"
  override_amount numeric(12,2) check (override_amount is null or override_amount >= 0),
  expense_id      bigint references public.expenses (id) on delete set null, -- Gastos hook
  created_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (note_id, occurrence_date)
);
create index if not exists calendar_note_occ_idx on public.calendar_note_occurrences (note_id, occurrence_date);

drop trigger if exists calendar_note_occ_set_updated_at on public.calendar_note_occurrences;
create trigger calendar_note_occ_set_updated_at before update on public.calendar_note_occurrences
  for each row execute function public.set_updated_at();

alter table public.calendar_note_occurrences enable row level security;
alter table public.calendar_note_occurrences force  row level security;

-- Same protection as calendar_notes: super_admin only (employees never see them).
drop policy if exists calendar_note_occ_all on public.calendar_note_occurrences;
create policy calendar_note_occ_all on public.calendar_note_occurrences for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.calendar_note_occurrences from anon;
