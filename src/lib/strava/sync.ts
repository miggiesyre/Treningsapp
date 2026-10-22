import 'server-only';
import { osloDate, parseYmd, weekDay, ymd } from '@/lib/plan/dates';
import { volOf, type Prog, type Template } from '@/lib/plan/library';
import type { Sport } from '@/lib/plan/sports';
import { createAdminClient } from '@/lib/supabase/admin';
import { accessToken, getActivity, listActivities, type StravaActivity } from './client';

const SPORT: Record<string, Sport> = {
  Ride: 'bike', VirtualRide: 'bike', EBikeRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike', Velomobile: 'bike', Handcycle: 'bike',
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Swim: 'swim',
  WeightTraining: 'strength', Workout: 'strength', Crossfit: 'strength',
};
export const sportOf = (a: Pick<StravaActivity, 'sport_type' | 'type'>) => SPORT[a.sport_type ?? ''] ?? SPORT[a.type ?? ''] ?? 'other';

const shift = (date: string, days: number) => {
  const d = parseYmd(date);
  return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
};

async function upsert(athleteId: string, a: StravaActivity) {
  const db = createAdminClient();
  const { error } = await db.from('activities').upsert(
    {
      athlete_id: athleteId,
      source: 'strava',
      external_id: String(a.id),
      sport: sportOf(a),
      name: a.name?.slice(0, 200) ?? null,
      start_time: a.start_date,
      distance_m: a.distance ?? null,
      duration_s: a.moving_time ?? a.elapsed_time ?? null,
      avg_power: a.average_watts != null ? Math.round(a.average_watts) : null,
      avg_hr: a.average_heartrate != null ? Math.round(a.average_heartrate) : null,
      elevation_m: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : null,
    },
    { onConflict: 'source,external_id' },
  );
  if (error) throw error;
  return osloDate(a.start_date);
}

/**
 * Re-matches one day: each activity gets the planned session of the same sport whose planned
 * distance is closest. Skipped sessions are never matched; moved ones count on their new day.
 * Matched sessions get status 'done'; unmatched activities show as "Ekstra økt".
 */
export async function matchDay(athleteId: string, date: string) {
  const db = createAdminClient();
  const [acts, planned] = await Promise.all([
    db
      .from('activities')
      .select('id, sport, distance_m, start_time, matched_session_id')
      .eq('athlete_id', athleteId)
      .gte('start_time', `${shift(date, -1)}T20:00:00Z`)
      .lte('start_time', `${shift(date, 1)}T04:00:00Z`)
      .order('start_time'),
    db.from('planned_sessions').select('id, template_id, date, status, value_override').eq('athlete_id', athleteId).gte('date', shift(date, -6)).lte('date', shift(date, 6)),
  ]);
  const dayActs = (acts.data ?? []).filter((a) => osloDate(a.start_time) === date);
  const ps = planned.data ?? [];
  const ids = ps.map((p) => p.id);
  const changes = ids.length
    ? ((await db.from('session_changes').select('planned_session_id, kind, to_date, created_at').in('planned_session_id', ids).order('created_at')).data ?? [])
    : [];
  const last: Record<string, { kind: string; to_date: string | null }> = {};
  changes.forEach((c) => (last[c.planned_session_id] = c));
  const effective = (p: (typeof ps)[number]) => (last[p.id]?.kind === 'moved' && last[p.id]?.to_date ? last[p.id].to_date! : p.date);
  const cands = ps.filter((p) => effective(p) === date && last[p.id]?.kind !== 'skipped');
  if (!dayActs.length && !cands.some((p) => p.status === 'done')) return;

  const tIds = [...new Set(cands.map((p) => p.template_id))];
  const tpl: Record<string, Template> = {};
  if (tIds.length) ((await db.from('session_templates').select('*').in('id', tIds)).data ?? []).forEach((t) => (tpl[t.id] = t as Template));
  const w = weekDay(parseYmd(date)).w;
  const prog: Prog = {};
  ((await db.from('progression').select('param, value').eq('athlete_id', athleteId).eq('week', w)).data ?? []).forEach((r) => (prog[r.param] = Number(r.value)));

  const assign = new Map<string, string>(); // activity id → planned id
  const used = new Set<string>();
  for (const a of dayActs) {
    const km = Number(a.distance_m ?? 0) / 1000;
    let best: string | null = null;
    let bestD = Infinity;
    for (const p of cands) {
      const t = tpl[p.template_id];
      if (!t || used.has(p.id) || t.sport !== a.sport) continue;
      const planKm = volOf(t, prog, p.value_override)[t.sport] ?? 0;
      const d = t.sport === 'strength' ? 0 : Math.abs(planKm - km);
      if (d < bestD) {
        bestD = d;
        best = p.id;
      }
    }
    if (best) {
      used.add(best);
      assign.set(a.id, best);
    }
  }

  for (const a of dayActs) {
    const m = assign.get(a.id) ?? null;
    if (a.matched_session_id !== m) await db.from('activities').update({ matched_session_id: m }).eq('id', a.id);
  }
  for (const p of cands) {
    const status = used.has(p.id) ? 'done' : 'planned';
    if (p.status !== status) await db.from('planned_sessions').update({ status }).eq('id', p.id);
  }
}

/** Webhook: create/update. */
export async function syncOne(athleteId: string, activityId: number) {
  const token = await accessToken(athleteId);
  if (!token) return;
  const a = await getActivity(token, activityId);
  if (!a) return removeOne(athleteId, activityId);
  const db = createAdminClient();
  const { data: prev } = await db.from('activities').select('start_time').eq('source', 'strava').eq('external_id', String(activityId)).maybeSingle();
  const date = await upsert(athleteId, a);
  await matchDay(athleteId, date);
  if (prev && osloDate(prev.start_time) !== date) await matchDay(athleteId, osloDate(prev.start_time));
}

/** Webhook: delete (or the activity was made private / removed). */
export async function removeOne(athleteId: string, activityId: number) {
  const db = createAdminClient();
  const { data } = await db.from('activities').select('id, start_time').eq('athlete_id', athleteId).eq('source', 'strava').eq('external_id', String(activityId)).maybeSingle();
  if (!data) return;
  await db.from('activities').delete().eq('id', data.id);
  await matchDay(athleteId, osloDate(data.start_time));
}

/** Pulls the last `days` days (first connect and "Synk nå"). Returns the number of activities. */
export async function syncRecent(athleteId: string, days = 30) {
  const token = await accessToken(athleteId);
  if (!token) return 0;
  const list = await listActivities(token, Math.floor(Date.now() / 1000) - days * 86400);
  const dates = new Set<string>();
  for (const a of list) dates.add(await upsert(athleteId, a));
  for (const d of dates) await matchDay(athleteId, d);
  return list.length;
}
