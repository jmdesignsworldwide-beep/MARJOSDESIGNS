-- ============================================================================
-- Marjos Designs — Tanda 6: Calendario (notas/eventos personales)
-- Depends on 0001..0008. Run once via the Supabase Management API.
--
-- Orders already power the calendar (read via existing policies). The only new
-- table is Marjos's personal notes/events — super_admin-only, and DELETABLE
-- (they're hers, not an inviolable business record).
-- ============================================================================

create table if not exists public.calendar_notes (
  id         bigint generated always as identity primary key,
  note_date  date not null,
  kind       text not null default 'nota' check (kind in ('nota', 'evento', 'feriado')),
  title      text not null,
  body       text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_notes_date_idx on public.calendar_notes (note_date);

drop trigger if exists calendar_notes_set_updated_at on public.calendar_notes;
create trigger calendar_notes_set_updated_at before update on public.calendar_notes
  for each row execute function public.set_updated_at();

alter table public.calendar_notes enable row level security;
alter table public.calendar_notes force  row level security;

-- Personal notes: super_admin only (full CRUD — deletable).
drop policy if exists calendar_notes_all on public.calendar_notes;
create policy calendar_notes_all on public.calendar_notes for all to authenticated
  using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.calendar_notes from anon;
