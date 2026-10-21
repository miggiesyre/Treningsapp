-- RLS proof. Run in the SQL Editor after seed_users.sql. Changes nothing (everything is rolled back).
-- Each row in the result should say PASS.

begin;

create temp table rls_results (test text, result text) on commit drop;
grant insert on rls_results to authenticated, anon;

-- A fake third athlete that nobody is linked to
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000aa', 'fremmed@example.com', 'authenticated', 'authenticated');
insert into public.profiles (id, role, full_name) values ('00000000-0000-0000-0000-0000000000aa', 'athlete', 'Fremmed');
insert into public.checkins (athlete_id, date, weight_kg) values ('00000000-0000-0000-0000-0000000000aa', current_date, 80);

-- ---------- As Miguel ----------
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where full_name = 'Miguel'), 'role', 'authenticated')::text, true);
set local role authenticated;

insert into rls_results select 'Miguel sees only Miguel + Ruben in profiles',
  case when (select count(*) from public.profiles) = 2 then 'PASS' else 'FAIL' end;
insert into rls_results select 'Miguel cannot see the stranger''s check-ins',
  case when (select count(*) from public.checkins where athlete_id = '00000000-0000-0000-0000-0000000000aa') = 0 then 'PASS' else 'FAIL' end;
insert into rls_results select 'Miguel reads 0 integration_secrets',
  case when (select count(*) from public.integration_secrets) = 0 then 'PASS' else 'FAIL' end;
insert into rls_results select 'Miguel reads 0 login_attempts',
  case when (select count(*) from public.login_attempts) = 0 then 'PASS' else 'FAIL' end;

do $$ begin
  update public.profiles set role = 'coach' where id = auth.uid();
  insert into rls_results values ('Miguel cannot make himself coach', 'FAIL');
exception when others then
  insert into rls_results values ('Miguel cannot make himself coach', 'PASS');
end $$;

do $$ begin
  insert into public.checkins (athlete_id, date, weight_kg) values ('00000000-0000-0000-0000-0000000000aa', current_date - 1, 70);
  insert into rls_results values ('Miguel cannot write another athlete''s data', 'FAIL');
exception when others then
  insert into rls_results values ('Miguel cannot write another athlete''s data', 'PASS');
end $$;

-- ---------- As Ruben ----------
reset role;
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where full_name = 'Ruben'), 'role', 'authenticated')::text, true);
set local role authenticated;

insert into rls_results select 'Ruben sees Miguel''s settings',
  case when (select count(*) from public.settings) = 1 then 'PASS' else 'FAIL' end;
insert into rls_results select 'Ruben cannot see the stranger',
  case when (select count(*) from public.profiles where id = '00000000-0000-0000-0000-0000000000aa') = 0 then 'PASS' else 'FAIL' end;

-- ---------- Logged out ----------
reset role;
set local role anon;
do $$ begin
  perform count(*) from public.profiles;
  insert into rls_results values ('Logged-out visitor cannot read profiles', 'FAIL');
exception when others then
  insert into rls_results values ('Logged-out visitor cannot read profiles', 'PASS');
end $$;

reset role;
select * from rls_results;

rollback;
