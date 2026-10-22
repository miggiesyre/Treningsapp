-- Phase 2: coach plan. Built-in sessions from Ruben's spreadsheet live in session_templates
-- with a `builtin` key; the app holds their formulas (meta/steps) in src/lib/plan/library.ts.

alter table public.session_templates
  add column if not exists builtin text,   -- 'b1','b2','b3','r1'…'r4','s1','s2','st1','st2','st3'
  add column if not exists tag text;       -- 'Økt 1', 'Valgfri', 'Egen økt'

create unique index if not exists session_templates_builtin_uniq
  on public.session_templates (coach_id, builtin) where builtin is not null;

create index if not exists session_templates_coach on public.session_templates (coach_id, sport);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists session_templates_touch on public.session_templates;
create trigger session_templates_touch before update on public.session_templates
  for each row execute function public.touch_updated_at();

-- Copy a week of planned sessions to other weeks in one transaction.
-- Target weeks are replaced. Runs with the caller's rights, so RLS still decides.
create or replace function public.copy_plan_week(p_athlete uuid, p_from int, p_to int[])
returns int language plpgsql security invoker set search_path = public as $$
declare
  start date;
  w int;
  n int := 0;
  c int;
begin
  if not public.is_coach_of(p_athlete) then raise exception 'not allowed'; end if;
  select plan_start into start from settings where athlete_id = p_athlete;
  foreach w in array p_to loop
    if w < 1 or w > 26 or w = p_from then continue; end if;
    delete from planned_sessions
      where athlete_id = p_athlete
        and date between start + (w - 1) * 7 and start + (w - 1) * 7 + 6;
    insert into planned_sessions (athlete_id, template_id, date, position, time_label, note_override, indoor_alt_override)
      select athlete_id, template_id, date + (w - p_from) * 7, position, time_label, note_override, indoor_alt_override
      from planned_sessions
      where athlete_id = p_athlete
        and date between start + (p_from - 1) * 7 and start + (p_from - 1) * 7 + 6;
    get diagnostics c = row_count;
    n := n + c;
  end loop;
  return n;
end $$;

revoke execute on function public.copy_plan_week(uuid, int, int[]) from anon, public;
grant execute on function public.copy_plan_week(uuid, int, int[]) to authenticated;
