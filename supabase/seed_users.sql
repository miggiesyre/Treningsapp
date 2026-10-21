-- Run AFTER you have invited Miguel and Ruben (Authentication → Users → Invite user).
-- Replace the two e-mail addresses below, then run the whole file in the SQL Editor.

with ids as (
  select
    (select id from auth.users where email = lower('MIGUEL_EPOST_HER')) as miguel,
    (select id from auth.users where email = lower('RUBEN_EPOST_HER'))  as ruben
), p as (
  insert into public.profiles (id, role, full_name)
  select miguel, 'athlete', 'Miguel' from ids
  union all
  select ruben, 'coach', 'Ruben' from ids
  on conflict (id) do nothing
  returning id
)
select count(*) as profiles_created from p;

insert into public.coach_athlete (coach_id, athlete_id)
select r.id, m.id
from auth.users r, auth.users m
where r.email = lower('RUBEN_EPOST_HER') and m.email = lower('MIGUEL_EPOST_HER')
on conflict do nothing;

insert into public.settings (athlete_id)
select id from auth.users where email = lower('MIGUEL_EPOST_HER')
on conflict do nothing;

insert into public.zones (athlete_id)
select id from auth.users where email = lower('MIGUEL_EPOST_HER')
on conflict do nothing;

-- Check: should list Miguel (athlete) and Ruben (coach)
select p.full_name, p.role, u.email from public.profiles p join auth.users u on u.id = p.id;
