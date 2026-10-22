// How a planned session looks in the coach's week (prototype: the `plan.days[].items` mapping).
import type { Change, Planned } from './coach-data';
import { SD, parseYmd, weekDay } from './dates';
import { describe, type Prog, type Template } from './library';
import { SP, SST, type VisualState } from './sports';

/** Swim sessions before this date are paused (settings.swim_paused_until). */
export const isPaused = (t: Template, date: string, swimBack: Date | null) => t.sport === 'swim' && !!swimBack && parseYmd(date) < swimBack;

export function chipView(p: Planned, t: Template, prog: Prog, change: Change | undefined) {
  const c = SP[t.sport].c;
  const now = weekDay(new Date());
  const at = weekDay(parseYmd(p.date));
  const past = (at.w - 1) * 7 + at.d < (now.w - 1) * 7 + now.d;
  const done = p.status === 'done';
  const kind = change?.kind;
  const flag =
    kind === 'skipped'
      ? `Hoppet over${change?.reason ? ` · ${change.reason}` : ''}`
      : kind === 'moved' && change?.to_date
        ? `→ ${SD[weekDay(parseYmd(change.to_date)).d]}`
        : kind === 'indoor'
          ? 'Innendørs'
          : kind === 'shortened'
            ? 'Kort 60 %'
            : done
              ? '✓ Strava'
              : t.is_optional
                ? 'Valgfri'
                : '';
  const st: VisualState = done ? 'done' : kind === 'skipped' ? 'missed' : past && kind !== 'moved' ? 'off' : 'planned';
  return {
    ...SST(c, st),
    title: t.name,
    meta: describe(t, prog, { valueOverride: p.value_override }).meta,
    color: c,
    flag,
    flagFg: kind === 'skipped' ? 'var(--faint)' : done ? 'var(--ok)' : 'var(--muted)',
  };
}
