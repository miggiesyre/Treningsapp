-- Starting plan from Ruben's spreadsheet (Miguel_Syre.xlsx, "Ukeplan" + session sheets).
-- Run once after 0002_coach_plan.sql. Safe to re-run: it skips what already exists.
-- Uses the single coach and the single athlete in `profiles`.

do $$
declare
  coach uuid := (select id from public.profiles where role = 'coach' limit 1);
  athlete uuid := (select id from public.profiles where role = 'athlete' limit 1);
  start date;
begin
  if coach is null or athlete is null then raise exception 'Run seed_users.sql first'; end if;
  select plan_start into start from public.settings where athlete_id = athlete;

  -- Blocks
  if not exists (select 1 from public.blocks where athlete_id = athlete) then
    insert into public.blocks (athlete_id, name, goal, week_from, week_to) values
      (athlete, 'Grunnlag 1', 'Aerob base og teknikk', 1, 4),
      (athlete, 'Grunnlag 2', 'Lengre langturer', 5, 8),
      (athlete, 'Kraft', 'Tung gir og styrke', 9, 11),
      (athlete, 'Bygg 1', 'Svømming tilbake, terskel', 12, 15),
      (athlete, 'Bygg 2', 'Racefart og brick', 16, 19),
      (athlete, 'Spesifikk', '70.3-spesifikt', 20, 23),
      (athlete, 'Taper', 'Formtopp til Jesolo', 24, 26);
  end if;

  -- Built-in sessions ("Mine økter")
  insert into public.session_templates (coach_id, builtin, sport, tag, name, main_param, indoor_alt, note, is_optional, exercises)
  values
    (coach, 'b1', 'bike', 'Økt 1', 'Rolig langtur', 'longBike', 'Trainer: 2 t sone 2 i Zwift', 'Fueling hvert 20. minutt. Test racenæringen du skal bruke i Jesolo.', false, '[]'),
    (coach, 'b2', 'bike', 'Økt 2', '8×3 min tung gir', null, 'Trainer: samme økt i ERG-modus', 'Rolig overkropp. Press gjennom hele tråkket.', false, '[]'),
    (coach, 'b3', 'bike', 'Økt 3', '4×8 min lav Z3', 'z3', 'Trainer: samme økt i ERG-modus', 'Lav Z3, ikke terskel. Skal føles kontrollert hele veien.', false, '[]'),
    (coach, 'r1', 'run', 'Økt 1', 'Brick – rolig løp', 'brickRun', 'Mølle: samme distanse', 'Korte, raske steg de første 2 km.', false, '[]'),
    (coach, 'r2', 'run', 'Økt 2', '3×2 km terskel', 'thrPace', 'Mølle: 3×2 km på 1 % stigning', 'Start i øvre del av tempoet og jobb deg ned.', false, '[]'),
    (coach, 'r3', 'run', 'Økt 3', 'Brickrun spesial', null, 'Trainer + mølle', 'Øv på raske overganger. Ha skoene klare.', false, '[]'),
    (coach, 'r4', 'run', 'Økt 4', 'Restitusjonsløp', null, 'Mølle 35 min rolig', 'Skal føles for lett.', false, '[]'),
    (coach, 's1', 'swim', 'Økt 1', '15×100 m', null, null, 'Lang glidefase. Tell tak per lengde.', false, '[]'),
    (coach, 's2', 'swim', 'Økt 2', 'Teknikk og 400-drag', null, null, 'Rolig skulder. Stopp ved smerte.', false, '[]'),
    (coach, 'st1', 'strength', 'Økt 1', 'Styrke 1', 'sets', 'Hjemme: strikk og kroppsvekt', 'Stopp med reps i reserve. Teknikk før vekt.', false,
      '[{"code":"A1","name":"Hexmark","rir":4,"reps":"5–8","kg":100,"repsNum":6},
        {"code":"A2","name":"Utfall bakover fra trinn","rir":3,"reps":"8 per ben","kg":16,"repsNum":8},
        {"code":"A3","name":"Skråbenk med hantler","rir":3,"reps":"8–10","kg":24,"repsNum":8},
        {"code":"A4","name":"Pullups","rir":3,"reps":"5–8","kg":0,"repsNum":6},
        {"code":"B1","name":"Deadbug med strikk","rir":null,"reps":"10","kg":0,"repsNum":10},
        {"code":"B2","name":"Clamshell","rir":null,"reps":"15","kg":0,"repsNum":15},
        {"code":"B3","name":"Stående tåhev","rir":null,"reps":"12","kg":40,"repsNum":12},
        {"code":"B4","name":"Helhev","rir":null,"reps":"15","kg":0,"repsNum":15}]'),
    (coach, 'st2', 'strength', 'Økt 2', 'Styrke 2', 'sets', 'Hjemme: strikk og kroppsvekt', 'Stopp med reps i reserve. Teknikk før vekt.', false,
      '[{"code":"A1","name":"Beinpress/Knebøy","rir":3,"reps":"6–8","kg":140,"repsNum":8},
        {"code":"A2","name":"Benkpress","rir":3,"reps":"6–8","kg":70,"repsNum":6},
        {"code":"A3","name":"Lårcurl/RDL","rir":3,"reps":"8–10","kg":60,"repsNum":10},
        {"code":"B1","name":"Rollouts","rir":null,"reps":"8","kg":0,"repsNum":8},
        {"code":"B2","name":"Lat prayer","rir":null,"reps":"12","kg":25,"repsNum":12},
        {"code":"B3","name":"Sittende tåhev","rir":null,"reps":"15","kg":40,"repsNum":15},
        {"code":"B4","name":"Helhev","rir":null,"reps":"15","kg":0,"repsNum":15}]'),
    (coach, 'st3', 'strength', 'Valgfri', 'Styrke 3', null, 'Hjemme: strikk og kroppsvekt', 'Valgfri økt. Hopp over hvis kroppen trenger hvile – det teller ikke som tapt.', true,
      '[{"code":"A1","name":"Beinspark","rir":null,"reps":"10–12","kg":50,"repsNum":12},
        {"code":"A2","name":"Lårcurl","rir":null,"reps":"10–12","kg":40,"repsNum":12},
        {"code":"A3","name":"Rygghev","rir":null,"reps":"12","kg":0,"repsNum":12},
        {"code":"A4","name":"Tåhev","rir":null,"reps":"15","kg":40,"repsNum":15},
        {"code":"A5","name":"Helhev","rir":null,"reps":"15","kg":0,"repsNum":15},
        {"code":"B1","name":"Reversed squat i kabel","rir":null,"reps":"12","kg":20,"repsNum":12},
        {"code":"B2","name":"Sittende roing","rir":null,"reps":"10–12","kg":50,"repsNum":12},
        {"code":"B3","name":"Flies i kabel","rir":null,"reps":"12","kg":10,"repsNum":12},
        {"code":"B4","name":"Sidehev i kabel","rir":null,"reps":"12–15","kg":5,"repsNum":15},
        {"code":"B5","name":"Triceps over hode","rir":null,"reps":"12","kg":15,"repsNum":12},
        {"code":"B6","name":"Bicepscurl skråbenk","rir":null,"reps":"10–12","kg":10,"repsNum":12}]')
  on conflict (coach_id, builtin) where builtin is not null do nothing;

  -- Progression per week (same formulas as the prototype)
  insert into public.progression (athlete_id, week, param, value)
  select athlete, w, p.param, p.value
  from generate_series(1, 26) w
  cross join lateral (
    select w in (4, 8, 11, 15, 19, 23) as rec
  ) r
  cross join lateral (values
    ('longBike', case when w >= 24 then (array[80, 60, 30])[w - 23]
                      when r.rec then round((70 + (w - 1) * 2.5) * 0.8 / 5) * 5
                      else least(120, round((70 + (w - 1) * 2.5) / 5) * 5) end),
    ('brickRun', case when w >= 24 then (array[8, 6, 4])[w - 23]
                      when r.rec then 8 else least(14, 8 + floor((w - 1) / 3.0)) end),
    ('z3',       case when w >= 24 then (array[240, 238, 235])[w - 23]
                      else round(215 + (w - 1) * 1.2) - case when r.rec then 8 else 0 end end),
    ('sets',     case when w >= 24 then (array[2, 2, 1])[w - 23]
                      when r.rec then 2 when w between 9 and 11 then 4 else 3 end),
    ('thrPace',  greatest(240, 270 - floor((w - 1) / 6.0) * 5))
  ) as p(param, value)
  on conflict do nothing;

  -- Base week from the "Ukeplan" sheet, every week 1–26
  if not exists (select 1 from public.planned_sessions where athlete_id = athlete) then
    insert into public.planned_sessions (athlete_id, template_id, date, position, time_label)
    select athlete, t.id, start + (w - 1) * 7 + b.d, b.pos, b.time_label
    from generate_series(1, 26) w
    cross join (values
      (0, 0, 'b1', null), (0, 1, 'r1', null),
      (1, 0, 'st1', 'Morgen'), (1, 1, 's1', 'Kveld'),
      (2, 0, 'r2', null),
      (3, 0, 'r3', null),
      (4, 0, 's2', 'Morgen'), (4, 1, 'st2', 'Kveld'),
      (5, 0, 'b3', null),
      (6, 0, 'b2', null), (6, 1, 'r4', null), (6, 2, 'st3', null)
    ) as b(d, pos, builtin, time_label)
    join public.session_templates t on t.coach_id = coach and t.builtin = b.builtin;
  end if;

  -- "Dagens fokus" per weekday from the prototype. Ruben overwrites them in Ukeplan.
  insert into public.day_focus (athlete_id, date, text)
  select athlete, start + (w - 1) * 7 + f.d, f.text
  from generate_series(1, 26) w
  cross join (values
    (0, 'Fueling og utholdenhet'), (1, 'Styrke og teknikk'), (2, 'Terskel med kontroll'),
    (3, 'Overganger og racefølelse'), (4, 'Styrke og stabilitet'), (5, 'Kraft på sykkelen'),
    (6, 'Tung gir og restitusjon')
  ) as f(d, text)
  on conflict do nothing;
end $$;

select
  (select count(*) from public.session_templates) as templates,
  (select count(*) from public.planned_sessions) as planned,
  (select count(*) from public.progression) as progression_rows,
  (select count(*) from public.blocks) as blocks,
  (select count(*) from public.day_focus) as focus_days;
