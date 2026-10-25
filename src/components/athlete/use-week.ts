'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { weekEntries, type AthleteWeek } from '@/lib/plan/athlete';
import { loadAthleteWeek } from '@/lib/plan/athlete-actions';
import { usePlan } from '@/lib/plan/coach-data';
import { WEEKS } from '@/lib/plan/dates';
import { parseYmd } from '@/lib/plan/dates';
import { isPaused } from '@/lib/plan/view';

const EMPTY: AthleteWeek = { planned: [], changes: [], focus: {}, own: [], activities: [], logged: {} };

/** One plan week for Miguel, with moved sessions on their new day. */
export function useAthleteWeek(w: number) {
  const { supabase, loadWeek, byId, prog, settings, ready } = usePlan();
  const [data, setData] = useState<AthleteWeek>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const valid = w >= 1 && w <= WEEKS;

  const reload = useCallback(async () => {
    if (!valid) {
      setData(EMPTY);
      setLoaded(true);
      return;
    }
    const d = await loadAthleteWeek(supabase, loadWeek, w);
    setData(d);
    setLoaded(true);
  }, [supabase, loadWeek, w, valid]);

  useEffect(() => {
    setLoaded(false);
    reload();
  }, [reload]);

  const swimBack = settings?.swim_paused_until ? parseYmd(settings.swim_paused_until) : null;
  // Paused swim sessions stay in the plan for Ruben but are not shown to Miguel until swimming starts.
  const days = useMemo(() => weekEntries(w, data, byId).map((l) => l.filter((e) => !isPaused(e.t, e.date, swimBack))), [w, data, byId, swimBack]);
  return { data, days, loaded: loaded && ready, reload, prog: prog[w] ?? {}, swimBack };
}
