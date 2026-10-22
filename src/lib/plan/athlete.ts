// The athlete's view of the plan (prototype: weekEntries, sv, weekVol). Miguel's changes live in
// session_changes; the planned row itself is never touched by him.
import type { Activity, Change, Planned, WeekData } from './coach-data';
import { DAYS, SD, WEEKS, dateOf, parseYmd, weekDay, ymd } from './dates';
import { describe, hm, nf, pace, volOf, type Prog, type Template } from './library';
import { SP, SST, TINT, type Sport, type VisualState } from './sports';
import { DECISION_TEXT, effKind } from './changes';
import { isPaused } from './view';

export const RACE = new Date(2027, 3, 24);
export const MONL = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
export const REASONS = ['Vær', 'Syk', 'Sliten', 'Skade', 'Ikke tid'] as const;

export type Entry = {
  p: Planned;
  t: Template;
  /** Day the session is shown on (to_date when Miguel moved it). */
  date: string;
  change?: Change;
  /** Struck-through placeholder on the day a session was moved away from. */
  ghost?: boolean;
  logged: number;
};

export type AthleteWeek = WeekData & { logged: Record<string, number> };

/** Seven day lists for a week, with moved sessions on their new day. */
export function weekEntries(w: number, data: AthleteWeek, byId: Record<string, Template>): Entry[][] {
  const days: Entry[][] = [[], [], [], [], [], [], []];
  if (w < 1 || w > WEEKS) return days;
  const last: Record<string, Change> = {};
  data.changes.forEach((c) => (last[c.planned_session_id] = c));
  for (const p of data.planned) {
    const t = byId[p.template_id];
    if (!t) continue;
    const change = last[p.id];
    const e = { p, t, change, logged: data.logged[p.id] ?? 0 };
    const from = weekDay(parseYmd(p.date));
    if (from.w !== w) continue;
    if (effKind(change) === 'moved' && change?.to_date) {
      const to = weekDay(parseYmd(change.to_date));
      if (to.w === w) {
        days[to.d].push({ ...e, date: change.to_date });
        days[from.d].push({ ...e, date: p.date, ghost: true });
        continue;
      }
    }
    days[from.d].push({ ...e, date: p.date });
  }
  return days;
}

const ord = (date: string) => {
  const x = weekDay(parseYmd(date));
  return (x.w - 1) * 7 + x.d;
};
export const todayOrd = () => {
  const x = weekDay(new Date());
  return (x.w - 1) * 7 + x.d;
};

export function sessionView(e: Entry, prog: Prog, swimBack: Date | null) {
  const { p, t, change } = e;
  const c = SP[t.sport].c;
  const paused = isPaused(t, p.date, swimBack);
  const kind = effKind(change);
  const decided = change?.coach_decision ? DECISION_TEXT[change.coach_decision] : '';
  const skipped = kind === 'skipped';
  const short = kind === 'shortened';
  const indoor = kind === 'indoor';
  const f = short ? 0.6 : 1;
  const altText = p.indoor_alt_override ?? t.indoor_alt ?? '';
  const done = !paused && !skipped && !e.ghost && (p.status === 'done' || e.logged > 0);
  const o = ord(e.date);
  const now = todayOrd();
  const past = o < now;
  const d = describe(t, prog, { f, valueOverride: p.value_override });
  const from = weekDay(parseYmd(p.date)).d;

  let statusText = 'Planlagt';
  let statusFg = 'var(--faint)';
  if (e.ghost) statusText = `→ ${SD[weekDay(parseYmd(change!.to_date!)).d].toLowerCase()}`;
  else if (paused) statusText = 'Pause – skulder';
  else if (skipped) statusText = 'Hoppet over';
  else if (done) {
    statusText = p.status === 'done' ? '✓ Strava' : '✓ Logget';
    statusFg = 'var(--ok)';
  } else if (t.is_optional) statusText = 'Valgfri';
  else if (o === now) {
    statusText = 'I dag';
    statusFg = 'var(--ink)';
  }
  const vst: VisualState = done ? 'done' : skipped || e.ghost ? 'missed' : paused || past ? 'off' : 'planned';
  const variant = indoor ? 'Innendørs' : short ? 'Kort (60 %)' : kind === 'moved' && !e.ghost ? `Flyttet fra ${SD[from].toLowerCase()}` : '';
  const meta = paused ? 'Svømming pauset til januar' : [variant, d.meta, p.time_label].filter(Boolean).join(' · ');
  const banner = paused
    ? 'Svømming er pauset til januar (skulder).'
    : skipped
      ? `${change?.coach_decision === 'drop' ? 'Droppet av Ruben' : 'Hoppet over'}${change?.reason ? ' · ' + change.reason : ''}`
      : indoor
        ? `Innendørs: ${altText}`
        : short
          ? 'Kort versjon – 60 % av volumet'
          : kind === 'moved'
            ? `Flyttet fra ${DAYS[from].toLowerCase()}`
            : decided && change?.coach_decision !== 'drop'
              ? decided
              : '';
  return {
    ...SST(c, vst),
    ...d,
    title: indoor && altText ? altText : t.name,
    tagLine: `${SP[t.sport].label}${d.tag ? ' · ' + d.tag : ''}`,
    meta,
    color: c,
    tint: TINT(c),
    f,
    paused,
    skipped,
    done,
    past,
    altText,
    statusText,
    statusFg: skipped ? 'var(--faint)' : statusFg,
    banner,
    bannerColor: skipped ? 'var(--bad)' : c,
    note: p.note_override ?? t.note ?? '',
    canSwap: !done && !paused && !change && !e.ghost && o >= now,
    canUndo: !!kind && !done && !change?.coach_decision,
    optional: t.is_optional,
  };
}

/** Planned vs done km per sport, plus strength sessions (prototype: weekVol). */
export function weekVolume(days: Entry[][], prog: Prog, swimBack: Date | null, own: WeekData['own'], activities: Activity[] = []) {
  const plan: Record<Sport, number> = { bike: 0, run: 0, swim: 0, strength: 0 };
  const act: Record<Sport, number> = { bike: 0, run: 0, swim: 0, strength: 0 };
  days.flat().forEach((e) => {
    if (e.ghost) return;
    const v = sessionView(e, prog, swimBack);
    if (v.paused || v.skipped) return;
    const vol = volOf(e.t, prog, e.p.value_override);
    (Object.keys(vol) as Sport[]).forEach((k) => {
      if (!v.optional) plan[k] += (vol[k] ?? 0) * v.f;
      if (v.done && k === 'strength') act.strength += 1;
    });
  });
  activities.forEach((a) => {
    if (a.sport === 'strength') {
      if (!a.matched_session_id) act.strength += 1;
    } else if (a.sport && a.sport in act && a.distance_m) act[a.sport as Sport] += a.distance_m / 1000;
  });
  own.forEach((o) => {
    if (o.sport === 'strength') act.strength += 1;
    else if (o.sport in act && o.distance_km) act[o.sport as Sport] += Number(o.distance_km);
  });
  return { plan, act };
}

export const dayKey = (w: number, d: number) => ymd(dateOf(w, d));

/** "62,3 km · 2:05 · 168 W" – the Strava line on a session (prototype: strava()). */
export function activityStats(a: Activity) {
  const km = (a.distance_m ?? 0) / 1000;
  const min = (a.duration_s ?? 0) / 60;
  if (a.sport === 'swim') return [`${Math.round(a.distance_m ?? 0).toLocaleString('nb-NO')} m`, hm(min)].join(' · ');
  if (a.sport === 'run' && km > 0) return [`${nf(km)} km`, hm(min), `${pace((min * 60) / km)} /km`].join(' · ');
  if (a.sport === 'bike' && km > 0) return [`${nf(km)} km`, hm(min), a.avg_power ? `${a.avg_power} W` : ''].filter(Boolean).join(' · ');
  return [km > 0 ? `${nf(km)} km` : '', `${Math.round(min)} min`, a.avg_hr ? `${a.avg_hr} bpm` : ''].filter(Boolean).join(' · ');
}
