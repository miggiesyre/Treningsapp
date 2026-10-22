// Coach writes to the plan. All calls run in the browser as Ruben, so RLS decides what is allowed.
import type { createClient } from '@/lib/supabase/client';
import { dateOf, ymd } from './dates';
import type { BuiltExercise, MainDef, Part, Prog, Template } from './library';
import type { Sport } from './sports';

type DB = ReturnType<typeof createClient>;

const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error;
  return r;
};

/** Next free position on a day. */
async function nextPos(db: DB, athleteId: string, date: string) {
  const { data } = await db.from('planned_sessions').select('position').eq('athlete_id', athleteId).eq('date', date).order('position', { ascending: false }).limit(1);
  return data?.length ? data[0].position + 1 : 0;
}

export async function addSession(db: DB, athleteId: string, templateId: string, w: number, d: number) {
  const date = ymd(dateOf(w, d));
  const position = await nextPos(db, athleteId, date);
  check(await db.from('planned_sessions').insert({ athlete_id: athleteId, template_id: templateId, date, position }));
}

export async function moveSession(db: DB, athleteId: string, id: string, w: number, d: number) {
  const date = ymd(dateOf(w, d));
  const position = await nextPos(db, athleteId, date);
  check(await db.from('planned_sessions').update({ date, position }).eq('id', id));
}

export async function removeSession(db: DB, id: string) {
  check(await db.from('planned_sessions').delete().eq('id', id));
}

export async function saveFocus(db: DB, athleteId: string, date: string, text: string) {
  const t = text.trim();
  if (t) check(await db.from('day_focus').upsert({ athlete_id: athleteId, date, text: t.slice(0, 200) }));
  else check(await db.from('day_focus').delete().eq('athlete_id', athleteId).eq('date', date));
}

export async function copyWeek(db: DB, athleteId: string, from: number, to: number[]) {
  const { data } = check(await db.rpc('copy_plan_week', { p_athlete: athleteId, p_from: from, p_to: to }));
  return Number(data ?? 0);
}

/** Set a progression value for a list of weeks. */
async function setProg(db: DB, athleteId: string, param: string, rows: [number, number][]) {
  if (!rows.length) return;
  check(await db.from('progression').upsert(rows.map(([week, value]) => ({ athlete_id: athleteId, week, param, value }))));
}

export type EditInput = {
  planned: { id: string; template_id: string };
  template: Template;
  w: number;
  d: number;
  moveTo: number;
  main: MainDef | undefined;
  prog: Prog;
  val: number | null;
  inc: number;
  note: string;
  alt: string;
};

/**
 * Session edit panel. "Bare denne dagen" stores overrides on the one planned session;
 * "Alle kommende uker" changes the template and the progression from this week on.
 * "Øk hver uke med" fills weeks w+1 … 23 either way (prototype: saveEdit).
 */
export async function saveEdit(db: DB, athleteId: string, scope: 'day' | 'all', e: EditInput) {
  const { planned, template: t, main: m } = e;
  const upd: Record<string, unknown> = {};
  if (scope === 'day') {
    upd.note_override = e.note === (t.note ?? '') ? null : e.note;
    upd.indoor_alt_override = e.alt === (t.indoor_alt ?? '') ? null : e.alt;
    upd.value_override = m && e.val != null && e.val !== e.prog[m.k] ? e.val : null;
  } else {
    check(await db.from('session_templates').update({ note: e.note || null, indoor_alt: e.alt || null }).eq('id', t.id));
    upd.note_override = null;
    upd.indoor_alt_override = null;
    upd.value_override = null;
    if (m && e.val != null) {
      const rows: [number, number][] = [];
      for (let w = e.w; w <= 26; w++) rows.push([w, e.val]);
      await setProg(db, athleteId, m.k, rows);
    }
  }
  if (m && e.val != null && e.inc) {
    const vs = m.values;
    const rows: [number, number][] = [];
    for (let w = e.w + 1; w <= 23; w++) {
      const v = e.val + e.inc * (w - e.w);
      rows.push([w, Math.max(vs[0], Math.min(vs[vs.length - 1], Math.round(v * 10) / 10))]);
    }
    await setProg(db, athleteId, m.k, rows);
  }
  if (e.moveTo !== e.d) {
    const date = ymd(dateOf(e.w, e.moveTo));
    upd.date = date;
    upd.position = await nextPos(db, athleteId, date);
  }
  check(await db.from('planned_sessions').update(upd).eq('id', planned.id));
}

// ---------- Builder ----------
export type Draft = {
  mode: 'new' | 'edit' | 'lib';
  sport: Sport;
  id?: string; // template being edited
  plannedId?: string; // edit mode: the day's session
  w?: number;
  d?: number;
  name: string;
  parts: Part[];
  exs: BuiltExercise[];
  note: string;
  alt: string;
};

export const draftName = (b: Draft) =>
  b.name.trim() || (b.sport === 'strength' ? 'Egen styrkeøkt' : `Egen ${{ bike: 'sykkel', run: 'løpe', swim: 'svømme', strength: 'styrke' }[b.sport]}økt`);

/** Saves a builder draft. Returns the toast text (prototype: saveBuilder). */
export async function saveDraft(db: DB, coachId: string, athleteId: string, b: Draft, target: 'day' | 'lib' | 'all') {
  const row = {
    coach_id: coachId,
    sport: b.sport,
    name: draftName(b).slice(0, 120),
    parts: b.sport === 'strength' ? [] : b.parts,
    exercises: b.sport === 'strength' ? b.exs : [],
    note: b.note.trim() || null,
    indoor_alt: b.alt.trim() || null,
  };
  const insert = async (hidden: boolean) => {
    const { data } = check(await db.from('session_templates').insert({ ...row, hidden }).select('id').single());
    return (data as { id: string }).id;
  };

  if (b.mode === 'edit' && target === 'all' && b.id) {
    check(await db.from('session_templates').update(row).eq('id', b.id));
    return 'Oppdatert for alle uker';
  }
  if (b.mode === 'edit' && b.plannedId) {
    const id = await insert(true);
    check(await db.from('planned_sessions').update({ template_id: id }).eq('id', b.plannedId));
    return 'Endret for denne dagen';
  }
  if (b.mode === 'lib') {
    if (b.id) check(await db.from('session_templates').update(row).eq('id', b.id));
    else await insert(false);
    return 'Lagret i mine økter';
  }
  const id = await insert(target === 'day');
  await addSession(db, athleteId, id, b.w!, b.d!);
  return target === 'day' ? `Lagt til ${['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'][b.d!]}` : 'Lagt til og lagret i mine økter';
}

export async function saveTemplateText(db: DB, id: string, note: string, alt: string) {
  check(await db.from('session_templates').update({ note: note.trim() || null, indoor_alt: alt || null }).eq('id', id));
}

export async function addComment(db: DB, athleteId: string, authorId: string, plannedId: string, body: string) {
  check(await db.from('comments').insert({ athlete_id: athleteId, author_id: authorId, planned_session_id: plannedId, body: body.slice(0, 2000) }));
}

// ---------- Varsler: Ruben decides on Miguel's changes ----------
export type Alert = {
  id: string;
  planned_session_id: string;
  kind: 'moved' | 'shortened' | 'indoor' | 'skipped';
  reason: string | null;
  to_date: string | null;
  coach_decision: string | null;
  decided_at: string | null;
  created_at: string;
  planned: { id: string; date: string; template_id: string } | null;
};

export async function loadAlerts(db: DB, athleteId: string, limit = 60): Promise<Alert[]> {
  const { data } = await db
    .from('session_changes')
    .select('id, planned_session_id, kind, reason, to_date, coach_decision, decided_at, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Omit<Alert, 'planned'>[];
  const ids = [...new Set(rows.map((r) => r.planned_session_id))];
  const ps = ids.length ? ((await db.from('planned_sessions').select('id, date, template_id').in('id', ids)).data ?? []) : [];
  const byId = Object.fromEntries(ps.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, planned: byId[r.planned_session_id] ?? null }));
}

export async function countOpenAlerts(db: DB, athleteId: string) {
  const { count } = await db.from('session_changes').select('id', { count: 'exact', head: true }).eq('athlete_id', athleteId).is('decided_at', null);
  return count ?? 0;
}

/** accept: just mark handled. drop: the session is off. move/double: new day. replace: another template. */
export async function resolveAlert(
  db: DB,
  athleteId: string,
  a: Alert,
  action: 'accept' | 'drop' | 'move' | 'double' | 'replace',
  arg?: { date?: string; templateId?: string },
) {
  if ((action === 'move' || action === 'double') && arg?.date) {
    const position = await nextPos(db, athleteId, arg.date);
    check(await db.from('planned_sessions').update({ date: arg.date, position }).eq('id', a.planned_session_id));
  }
  if (action === 'replace' && arg?.templateId) {
    check(await db.from('planned_sessions').update({ template_id: arg.templateId, value_override: null }).eq('id', a.planned_session_id));
  }
  check(
    await db
      .from('session_changes')
      .update({
        coach_decision: action === 'accept' ? null : action,
        decision_data: arg ?? null,
        decided_at: new Date().toISOString(),
      })
      .eq('id', a.id),
  );
}
