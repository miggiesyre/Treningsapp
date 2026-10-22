// Miguel's writes. RLS lets him write his own check-ins, strength logs, own sessions,
// comments and session changes – never the plan itself.
import type { createClient } from '@/lib/supabase/client';
import type { AthleteWeek } from './athlete';
import type { Change, WeekData } from './coach-data';

type DB = ReturnType<typeof createClient>;

const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error;
  return r;
};

export async function loadAthleteWeek(db: DB, loadWeek: (w: number) => Promise<WeekData>, w: number): Promise<AthleteWeek> {
  const data = await loadWeek(w);
  const ids = data.planned.map((p) => p.id);
  const logged: Record<string, number> = {};
  if (ids.length) {
    const { data: rows } = await db.from('strength_logs').select('planned_session_id').in('planned_session_id', ids);
    (rows ?? []).forEach((r) => (logged[r.planned_session_id] = (logged[r.planned_session_id] ?? 0) + 1));
  }
  return { ...data, logged };
}

// ---------- Check-in ----------
export type CiKey = 'weight_kg' | 'sleep_score' | 'sleep_hours' | 'vo2max';
export type CiRow = { date: string; source: string } & Record<CiKey, number | null>;

export async function loadCheckins(db: DB, athleteId: string) {
  const { data } = await db
    .from('checkins')
    .select('date, source, weight_kg, sleep_score, sleep_hours, vo2max')
    .eq('athlete_id', athleteId)
    .order('date', { ascending: false })
    .limit(120);
  return ((data ?? []) as CiRow[]).map((r) => ({
    ...r,
    weight_kg: r.weight_kg == null ? null : Number(r.weight_kg),
    sleep_hours: r.sleep_hours == null ? null : Number(r.sleep_hours),
    vo2max: r.vo2max == null ? null : Number(r.vo2max),
  }));
}

/** Upserts one value on today's manual row; other columns on the row are kept. */
export async function saveCheckin(db: DB, athleteId: string, date: string, key: CiKey, value: number) {
  check(await db.from('checkins').upsert({ athlete_id: athleteId, date, source: 'manual', [key]: value }, { onConflict: 'athlete_id,date,source' }));
}

// ---------- Bytt økt ----------
export async function addChange(
  db: DB,
  athleteId: string,
  plannedId: string,
  kind: Change['kind'],
  extra: { reason?: string; to_date?: string } = {},
) {
  check(await db.from('session_changes').insert({ athlete_id: athleteId, planned_session_id: plannedId, kind, reason: extra.reason ?? null, to_date: extra.to_date ?? null }));
}

export async function undoChange(db: DB, id: string) {
  check(await db.from('session_changes').delete().eq('id', id));
}

// ---------- Strength log ----------
export type SetLog = { kg: number; reps: number };

/** Last kg × reps per exercise name, for prefilling the wheels. */
export async function lastLifts(db: DB, athleteId: string) {
  const { data } = await db.from('strength_logs').select('exercise, weight_kg, reps').eq('athlete_id', athleteId).order('logged_at', { ascending: false }).limit(400);
  const o: Record<string, SetLog> = {};
  (data ?? []).forEach((r) => {
    if (!o[r.exercise]) o[r.exercise] = { kg: Number(r.weight_kg ?? 0), reps: r.reps ?? 0 };
  });
  return o;
}

export async function loadSessionLogs(db: DB, plannedId: string) {
  const { data } = await db.from('strength_logs').select('exercise, set_no, weight_kg, reps').eq('planned_session_id', plannedId).order('set_no');
  const o: Record<string, SetLog[]> = {};
  (data ?? []).forEach((r) => (o[r.exercise] ??= []).push({ kg: Number(r.weight_kg ?? 0), reps: r.reps ?? 0 }));
  return o;
}

/** Replaces the logged sets for one session. */
export async function saveStrength(db: DB, athleteId: string, plannedId: string, sets: Record<string, SetLog[]>) {
  check(await db.from('strength_logs').delete().eq('planned_session_id', plannedId));
  const rows = Object.entries(sets).flatMap(([exercise, list]) =>
    list.map((s, i) => ({ athlete_id: athleteId, planned_session_id: plannedId, exercise, set_no: i + 1, weight_kg: s.kg, reps: s.reps })),
  );
  if (rows.length) check(await db.from('strength_logs').insert(rows));
}

// ---------- Egen økt ----------
export type OwnInput = { id?: string; date: string; sport: 'bike' | 'run' | 'swim' | 'strength' | 'other'; title: string | null; duration_min: number; comment: string | null };

export async function saveOwn(db: DB, athleteId: string, x: OwnInput) {
  const row = { athlete_id: athleteId, date: x.date, sport: x.sport, title: x.title, duration_min: x.duration_min, comment: x.comment };
  if (x.id) check(await db.from('own_sessions').update(row).eq('id', x.id));
  else check(await db.from('own_sessions').insert(row));
}

export async function deleteOwn(db: DB, id: string) {
  check(await db.from('own_sessions').delete().eq('id', id));
}
