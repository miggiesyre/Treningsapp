'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dateOf, ymd } from './dates';
import type { Prog, Template } from './library';

export type Block = { name: string; goal: string | null; week_from: number; week_to: number };
export type PlanSettings = { plan_start: string; swim_paused_until: string | null };
export type Planned = {
  id: string;
  template_id: string;
  date: string;
  position: number;
  time_label: string | null;
  status: 'planned' | 'done' | 'missed';
  value_override: number | null;
  note_override: string | null;
  indoor_alt_override: string | null;
};
export type Change = { planned_session_id: string; kind: 'moved' | 'shortened' | 'indoor' | 'skipped'; reason: string | null; to_date: string | null; created_at: string };
export type Own = { id: string; date: string; sport: string; title: string | null; duration_min: number | null; distance_km: number | null; comment: string | null };
export type WeekData = { planned: Planned[]; changes: Change[]; focus: Record<string, string>; own: Own[] };

type Ctx = {
  supabase: ReturnType<typeof createClient>;
  athleteId: string;
  coachId: string;
  templates: Template[];
  byId: Record<string, Template>;
  prog: Record<number, Prog>;
  blocks: Block[];
  settings: PlanSettings | null;
  ready: boolean;
  reloadTemplates: () => Promise<void>;
  reloadProg: () => Promise<void>;
  loadWeek: (w: number) => Promise<WeekData>;
};

const CoachCtx = createContext<Ctx | null>(null);
export const useCoach = () => {
  const c = useContext(CoachCtx);
  if (!c) throw new Error('useCoach outside CoachProvider');
  return c;
};

export const blockOf = (blocks: Block[], w: number) => blocks.find((b) => w >= b.week_from && w <= b.week_to);

export function CoachProvider({ athleteId, coachId, children }: { athleteId: string; coachId: string; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [prog, setProg] = useState<Record<number, Prog>>({});
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [ready, setReady] = useState(false);

  const reloadTemplates = useCallback(async () => {
    const { data } = await supabase.from('session_templates').select('*').eq('coach_id', coachId).order('created_at');
    setTemplates((data ?? []) as Template[]);
  }, [supabase, coachId]);

  const reloadProg = useCallback(async () => {
    const { data } = await supabase.from('progression').select('week, param, value').eq('athlete_id', athleteId);
    const p: Record<number, Prog> = {};
    (data ?? []).forEach((r) => ((p[r.week] ??= {})[r.param] = Number(r.value)));
    setProg(p);
  }, [supabase, athleteId]);

  useEffect(() => {
    (async () => {
      const [, , b, s] = await Promise.all([
        reloadTemplates(),
        reloadProg(),
        supabase.from('blocks').select('name, goal, week_from, week_to').eq('athlete_id', athleteId).order('week_from'),
        supabase.from('settings').select('plan_start, swim_paused_until').eq('athlete_id', athleteId).maybeSingle(),
      ]);
      setBlocks((b.data ?? []) as Block[]);
      setSettings(s.data as PlanSettings | null);
      setReady(true);
    })();
  }, [supabase, athleteId, reloadTemplates, reloadProg]);

  const loadWeek = useCallback(
    async (w: number): Promise<WeekData> => {
      const from = ymd(dateOf(w, 0));
      const to = ymd(dateOf(w, 6));
      const [p, f, o] = await Promise.all([
        supabase.from('planned_sessions').select('*').eq('athlete_id', athleteId).gte('date', from).lte('date', to).order('position'),
        supabase.from('day_focus').select('date, text').eq('athlete_id', athleteId).gte('date', from).lte('date', to),
        supabase.from('own_sessions').select('id, date, sport, title, duration_min, distance_km, comment').eq('athlete_id', athleteId).gte('date', from).lte('date', to),
      ]);
      const planned = (p.data ?? []) as Planned[];
      const ids = planned.map((r) => r.id);
      const c = ids.length
        ? await supabase.from('session_changes').select('planned_session_id, kind, reason, to_date, created_at').in('planned_session_id', ids).order('created_at')
        : { data: [] };
      return {
        planned,
        changes: (c.data ?? []) as Change[],
        focus: Object.fromEntries((f.data ?? []).map((r) => [r.date, r.text])),
        own: (o.data ?? []) as Own[],
      };
    },
    [supabase, athleteId],
  );

  const byId = useMemo(() => Object.fromEntries(templates.map((t) => [t.id, t])), [templates]);

  return (
    <CoachCtx.Provider value={{ supabase, athleteId, coachId, templates, byId, prog, blocks, settings, ready, reloadTemplates, reloadProg, loadWeek }}>
      {children}
    </CoachCtx.Provider>
  );
}
