// Plan calendar. Week 1 starts Monday 26 Oct 2026; the plan has 26 weeks.
export const PLAN_START = new Date(2026, 9, 26);
export const WEEKS = 26;
export const DAYS = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'];
export const SD = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
export const MON = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

export const dateOf = (w: number, d: number) => new Date(2026, 9, 26 + (w - 1) * 7 + d);

export const ymd = (dt: Date) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

export const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const fmtD = (dt: Date) => `${dt.getDate()}. ${MON[dt.getMonth()]}`;

/** Plan week (1-based, may be <1 before start or >26 after) and weekday (0 = Monday) of a date. */
export function weekDay(dt: Date) {
  const t = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const di = Math.round((t.getTime() - PLAN_START.getTime()) / 864e5);
  return { w: Math.floor(di / 7) + 1, d: ((di % 7) + 7) % 7 };
}

export const today = () => weekDay(new Date());
/** The week to show by default: today's week, clamped to the plan. */
export const currentWeek = () => Math.max(1, Math.min(WEEKS, today().w));
