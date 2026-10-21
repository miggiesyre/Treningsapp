-- Treningsapp – Supabase schema + Row Level Security (Phase 1)
-- Run in Supabase SQL editor. Idempotent-ish for a fresh project.

create extension if not exists "pgcrypto";

-- ---------- Core ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('athlete','coach')),
  full_name text not null,
  created_at timestamptz not null default now()
);

create table public.coach_athlete (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  primary key (coach_id, athlete_id)
);

-- Helper functions (security definer so they can read coach_athlete under RLS)
create or replace function public.is_coach_of(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from coach_athlete where coach_id = auth.uid() and athlete_id = a);
$$;

create or replace function public.can_access(a uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() = a or public.is_coach_of(a);
$$;

create or replace function public.is_coach() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'coach');
$$;

-- ---------- Plan ----------
create table public.settings (
  athlete_id uuid primary key references public.profiles(id) on delete cascade,
  race_name text not null default 'Ironman 70.3 Venice-Jesolo',
  race_date date not null default '2027-04-24',
  plan_start date not null default '2026-10-26',
  swim_paused_until date default '2027-01-01',
  garmin_status text default 'ok',
  theme text not null default 'dark' check (theme in ('dark','light','system'))
);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  goal text,
  week_from int not null check (week_from between 1 and 26),
  week_to int not null check (week_to between 1 and 26)
);

create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null check (sport in ('bike','run','swim','strength')),
  name text not null,
  parts jsonb not null default '[]',        -- [{kind,measure,val,target,tval,reps,rest}]
  exercises jsonb not null default '[]',    -- [{name,sets,reps,rir,rest}]
  main_param text,                           -- e.g. 'longBike','z3','thrPace','sets'
  indoor_alt text,
  short_version boolean not null default true,
  note text,
  hidden boolean not null default false,     -- "Bare denne dagen" one-offs
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.planned_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.session_templates(id),
  date date not null,
  position int not null default 0,
  time_label text,                 -- 'Morgen' / 'Kveld'
  value_override numeric,          -- main_param value for this day only
  note_override text,
  indoor_alt_override text,
  created_at timestamptz not null default now()
);
create index on public.planned_sessions (athlete_id, date);

create table public.progression (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  week int not null check (week between 1 and 26),
  param text not null,
  value numeric not null,
  primary key (athlete_id, week, param)
);

create table public.day_focus (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  text text not null,
  primary key (athlete_id, date)
);

create table public.session_changes (
  id uuid primary key default gen_random_uuid(),
  planned_session_id uuid not null references public.planned_sessions(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('moved','shortened','indoor','skipped')),
  reason text check (reason in ('Vær','Syk','Sliten','Skade','Ikke tid')),
  to_date date,
  coach_decision text check (coach_decision in ('drop','move','double','replace')),
  decision_data jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

-- ---------- Athlete data ----------
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  source text not null default 'manual' check (source in ('manual','garmin')),
  weight_kg numeric(5,1), sleep_score int check (sleep_score between 1 and 100),
  sleep_hours numeric(3,1), vo2max numeric(4,1), hrv int, resting_hr int,
  unique (athlete_id, date, source)
);

create table public.strength_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  planned_session_id uuid references public.planned_sessions(id) on delete set null,
  exercise text not null, set_no int not null, weight_kg numeric(5,1), reps int,
  logged_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('strava','garmin')),
  external_id text not null,
  sport text, name text, start_time timestamptz not null,
  distance_m numeric, duration_s int, avg_power int, avg_hr int,
  matched_session_id uuid references public.planned_sessions(id) on delete set null,
  unique (source, external_id)
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('ftp','vo2max')),
  value numeric not null, date date not null,
  source text not null default 'coach' check (source in ('coach','checkin','garmin'))
);

create table public.goals (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null check (sport in ('bike','run','swim')),
  km_per_week numeric not null,
  primary key (athlete_id, sport)
);

create table public.injuries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  body_part text not null,
  status text not null check (status in ('Vondt','Under behandling','Bedre','Bra')),
  comment text
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  planned_session_id uuid not null references public.planned_sessions(id) on delete cascade,
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Service-role only (no policies = no access for users)
create table public.integration_secrets (
  athlete_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('strava','garmin')),
  ciphertext text not null,      -- AES-GCM with TOKEN_ENC_KEY (env var)
  updated_at timestamptz not null default now(),
  primary key (athlete_id, provider)
);

-- ---------- RLS ----------
do $$ declare t text; begin
  foreach t in array array['profiles','coach_athlete','settings','blocks','session_templates','planned_sessions',
    'progression','day_focus','session_changes','checkins','strength_logs','activities','tests','goals',
    'injuries','comments','integration_secrets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop; end $$;

-- profiles: see yourself and your linked people; update only your name
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_coach_of(id)
         or exists (select 1 from coach_athlete ca where ca.athlete_id = auth.uid() and ca.coach_id = profiles.id));
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- users may only change their name, never their role
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

create policy ca_select on public.coach_athlete for select using (coach_id = auth.uid() or athlete_id = auth.uid());

-- Read for athlete + linked coach on all athlete-scoped tables
do $$ declare t text; begin
  foreach t in array array['settings','blocks','planned_sessions','progression','day_focus','session_changes',
    'checkins','strength_logs','activities','tests','goals','injuries','comments'] loop
    execute format('create policy %I on public.%I for select using (public.can_access(athlete_id))', t||'_select', t);
  end loop; end $$;

-- Coach writes the plan
do $$ declare t text; begin
  foreach t in array array['blocks','planned_sessions','progression','day_focus','tests','goals'] loop
    execute format('create policy %I on public.%I for all using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id))', t||'_coach_write', t);
  end loop; end $$;
create policy settings_coach_update on public.settings for update using (public.is_coach_of(athlete_id));
create policy settings_athlete_theme on public.settings for update using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Athlete writes own data
do $$ declare t text; begin
  foreach t in array array['checkins','strength_logs','injuries'] loop
    execute format('create policy %I on public.%I for all using (athlete_id = auth.uid()) with check (athlete_id = auth.uid())', t||'_athlete_write', t);
  end loop; end $$;
create policy tests_athlete_checkin on public.tests for insert with check (athlete_id = auth.uid() and source = 'checkin');

-- Session changes: athlete creates, coach decides
create policy changes_athlete_insert on public.session_changes for insert
  with check (athlete_id = auth.uid() and coach_decision is null);
create policy changes_athlete_delete on public.session_changes for delete
  using (athlete_id = auth.uid() and coach_decision is null);
create policy changes_coach_update on public.session_changes for update
  using (public.is_coach_of(athlete_id)) with check (public.is_coach_of(athlete_id));

-- Comments: either party, as themselves
create policy comments_insert on public.comments for insert
  with check (author_id = auth.uid() and public.can_access(athlete_id));
create policy comments_delete_own on public.comments for delete using (author_id = auth.uid());

-- Templates: coach owns; athlete can read templates used in their plan
create policy templates_coach on public.session_templates for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid() and public.is_coach());
create policy templates_athlete_read on public.session_templates for select
  using (exists (select 1 from planned_sessions ps where ps.template_id = session_templates.id and ps.athlete_id = auth.uid()));

-- activities: written only by server (service role). integration_secrets: no policies at all.

-- ---------- After inviting users (fill in UUIDs from Auth → Users) ----------
-- insert into profiles (id, role, full_name) values ('<miguel-uuid>','athlete','Miguel'), ('<ruben-uuid>','coach','Ruben');
-- insert into coach_athlete values ('<ruben-uuid>','<miguel-uuid>');
-- insert into settings (athlete_id) values ('<miguel-uuid>');
-- insert into blocks (athlete_id,name,goal,week_from,week_to) values
--  ('<miguel-uuid>','Grunnlag 1','Aerob base og teknikk',1,4), ('<miguel-uuid>','Grunnlag 2','Lengre langturer',5,8),
--  ('<miguel-uuid>','Kraft','Tung gir og styrke',9,11), ('<miguel-uuid>','Bygg 1','Svømming tilbake, terskel',12,15),
--  ('<miguel-uuid>','Bygg 2','Racefart og brick',16,19), ('<miguel-uuid>','Spesifikk','70.3-spesifikt',20,23),
--  ('<miguel-uuid>','Taper','Formtopp til Jesolo',24,26);
