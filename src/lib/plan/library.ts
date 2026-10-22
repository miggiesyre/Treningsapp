// Session formulas ported from the v8 prototype (LIB, MAIN, makeBuilt). Templates are rows in
// `session_templates`; built-ins carry a `builtin` key whose text depends on the week's progression.
import type { Sport } from './sports';

export type PartKind = 'Oppvarming' | 'Drag' | 'Pause' | 'Nedkjøling';
export type Target = 'Ingen' | 'Watt' | 'Tempo' | 'Sone' | 'Kadens';
export type Part = { kind: PartKind; measure: 'tid' | 'dist'; val: number; target: Target; tval: number | null; reps: number; rest: number };
/** Exercise in a coach-built strength session. */
export type BuiltExercise = { name: string; sets: number; reps: number; rir: number; rest: number };
/** Exercise in a built-in strength session (from the spreadsheet). */
export type BuiltinExercise = { code: string; name: string; rir: number | null; reps: string; kg: number; repsNum: number };

export type Template = {
  id: string;
  builtin: string | null;
  sport: Sport;
  tag: string | null;
  name: string;
  parts: Part[];
  exercises: (BuiltExercise | BuiltinExercise)[];
  main_param: string | null;
  indoor_alt: string | null;
  note: string | null;
  hidden: boolean;
  is_optional: boolean;
};

export type Prog = Record<string, number>;
export type Step = { h: string; t: string };
export type Key = { v: string | number; u: string };

export const nf = (n: number, d = 1) => Number(n).toLocaleString('nb-NO', { maximumFractionDigits: d });
export const hm = (min: number) => {
  const m = Math.round(min);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};
export const pace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
export const range = (a: number, b: number, st: number) => {
  const o: number[] = [];
  for (let x = a; x <= b + 1e-9; x += st) o.push(Math.round(x * 10) / 10);
  return o;
};

// ---------- Built-in formulas ----------
type Formula = { meta: (p: Prog, f: number) => string; keys: (p: Prog, f: number) => Key[]; steps: (p: Prog, f: number) => Step[] };
const R = Math.round;

const BUILTIN: Record<string, Formula> = {
  b1: {
    meta: (p, f) => `${R(p.longBike * f)} km · sone 1–2`,
    keys: (p, f) => [{ v: R(p.longBike * f), u: 'km' }, { v: '136–186', u: 'watt' }, { v: '1–2', u: 'sone' }],
    steps: (p, f) => [
      { h: 'Oppvarming', t: '15 min rolig, gradvis opp i sone 2.' },
      { h: 'Hoveddel', t: `${R(p.longBike * f)} km jevnt i sone 1–2 (136–186 W). 60–80 g karbo i timen.` },
      { h: 'Nedkjøling', t: '10 min lett tråkk.' },
    ],
  },
  b2: {
    meta: (_p, f) => `${R(8 * f)}×3 min · 55–60 rpm`,
    keys: (_p, f) => [{ v: `${R(8 * f)}×3`, u: 'min' }, { v: '55–60', u: 'rpm' }, { v: R(50 * f), u: 'km' }],
    steps: (_p, f) => [
      { h: 'Oppvarming', t: '20 min, med 3×30 s høy kadens.' },
      { h: 'Hoveddel', t: `${R(8 * f)}×3 min tung gir, 55–60 rpm, sittende. 3 min rolig mellom.` },
      { h: 'Etterpå', t: 'Restitusjonsløp, se egen økt.' },
    ],
  },
  b3: {
    meta: (p, f) => `${Math.max(2, R(4 * f))}×8 min @ ${p.z3} W`,
    keys: (p, f) => [{ v: `${Math.max(2, R(4 * f))}×8`, u: 'min' }, { v: p.z3, u: 'watt' }, { v: R(60 * f), u: 'km' }],
    steps: (p, f) => [
      { h: 'Oppvarming', t: '20 min med 3 korte stigninger.' },
      { h: 'Hoveddel', t: `${Math.max(2, R(4 * f))}×8 min @ ${p.z3} W, 4 min rolig mellom.` },
      { h: 'Nedkjøling', t: '15 min rolig.' },
    ],
  },
  r1: {
    meta: (p, f) => `${R(p.brickRun * f)} km · rett etter sykkel`,
    keys: (p, f) => [{ v: R(p.brickRun * f), u: 'km' }, { v: '5:20–5:40', u: 'per km' }, { v: '2', u: 'sone' }],
    steps: (p, f) => [
      { h: 'Overgang', t: 'Rett fra sykkelen. Skift på under 3 min.' },
      { h: 'Hoveddel', t: `${R(p.brickRun * f)} km rolig i sone 2.` },
    ],
  },
  r2: {
    meta: (p, f) => `${f < 1 ? 2 : 3}×2 km · ${pace(p.thrPace)}–${pace(p.thrPace + 30)} /km`,
    keys: (p, f) => [
      { v: `${f < 1 ? 2 : 3}×2`, u: 'km' },
      { v: `${pace(p.thrPace)}–${pace(p.thrPace + 30)}`, u: 'per km' },
      { v: R(12 * f), u: 'km totalt' },
    ],
    steps: (p, f) => [
      { h: 'Oppvarming', t: '3 km rolig + 4 stigningsløp.' },
      { h: 'Hoveddel', t: `${f < 1 ? 2 : 3}×2 km på ${pace(p.thrPace)}–${pace(p.thrPace + 30)} /km, 2 min jogg mellom.` },
      { h: 'Nedjogg', t: '2 km rolig.' },
    ],
  },
  r3: {
    meta: (_p, f) => `${f < 1 ? 2 : 4}× (1 km løp + 4 km sykkel)`,
    keys: (_p, f) => [{ v: `${f < 1 ? 2 : 4}×`, u: 'runder' }, { v: '1', u: 'km løp' }, { v: '4', u: 'km sykkel' }],
    steps: (_p, f) => [
      { h: 'Oppvarming', t: '15 min rolig sykkel.' },
      { h: 'Hoveddel', t: `${f < 1 ? 2 : 4} runder: 1 km løp i racefart + 4 km sykkel.` },
      { h: 'Nedjogg', t: '10 min rolig.' },
    ],
  },
  r4: {
    meta: (_p, f) => `${R(7 * f)} km · sone 1`,
    keys: (_p, f) => [{ v: R(7 * f), u: 'km' }, { v: '1', u: 'sone' }, { v: '30–40', u: 'min' }],
    steps: () => [{ h: 'Hoveddel', t: '30–40 min helt rolig.' }],
  },
  s1: {
    meta: (_p, f) => `${R(15 * f)}×100 m · 20 s pause`,
    keys: (_p, f) => [{ v: `${R(15 * f)}×100`, u: 'meter' }, { v: '20', u: 's pause' }, { v: nf((R(15 * f) * 100 + 500) / 1000), u: 'km' }],
    steps: (_p, f) => [
      { h: 'Innsvømming', t: '300 m rolig.' },
      { h: 'Hoveddel', t: `${R(15 * f)}×100 m, 20 s pause.` },
      { h: 'Utsvømming', t: '200 m rolig.' },
    ],
  },
  s2: {
    meta: () => '10×50 m drill · 4×400 m',
    keys: () => [{ v: '10×50', u: 'drill' }, { v: '4×400', u: 'meter' }, { v: '2,4', u: 'km' }],
    steps: () => [
      { h: 'Drill', t: '10×50 m catch-up og pullbuoy.' },
      { h: 'Hoveddel', t: '4×400 m jevnt, 30 s pause.' },
    ],
  },
};

const strengthFormula = (t: Template): Formula => {
  const ex = t.exercises as BuiltinExercise[];
  const opt = t.is_optional;
  const sets = (p: Prog, f: number) => Math.max(1, R((p.sets ?? 3) * f));
  const names = (b: string) => ex.filter((x) => x.code.startsWith(b)).map((x) => x.name).join(', ') + '.';
  return {
    meta: (p, f) => (opt ? `${ex.length} øvelser · valgfri` : `${ex.length} øvelser · ${sets(p, f)} sett i A`),
    keys: (p, f) => [
      { v: ex.length, u: 'øvelser' },
      opt ? { v: 2, u: 'sett per øvelse' } : { v: sets(p, f), u: 'sett i A-blokk' },
      { v: R(45 * f), u: 'min' },
    ],
    steps: () => [
      { h: 'Oppvarming', t: '10 min sykkel og mobilitet.' },
      { h: 'Blokk A', t: names('A') },
      { h: 'Blokk B', t: names('B') },
    ],
  };
};

// ---------- Main value per built-in ("Øk hver uke med") ----------
export type MainDef = { k: string; label: string; unit: string; values: number[]; fmt?: (v: number) => string; incs: number[]; incFmt: (i: number) => string };
export const MAIN: Record<string, MainDef> = {
  b1: { k: 'longBike', label: 'Distanse', unit: 'km', values: range(20, 200, 5), incs: [0, 2, 5, 10], incFmt: (i) => `+${i} km` },
  r1: { k: 'brickRun', label: 'Distanse', unit: 'km', values: range(2, 25, 1), incs: [0, 1, 2], incFmt: (i) => `+${i} km` },
  b3: { k: 'z3', label: 'Watt', unit: 'W', values: range(150, 320, 1), incs: [0, 2, 5], incFmt: (i) => `+${i} W` },
  r2: { k: 'thrPace', label: 'Tempo fra', unit: '/km', values: range(225, 330, 5), fmt: pace, incs: [0, -5, -10], incFmt: (i) => `−${Math.abs(i)} s` },
  st1: { k: 'sets', label: 'Sett i A-blokk', unit: 'sett', values: range(1, 6, 1), incs: [0, 1], incFmt: (i) => `+${i} sett` },
  st2: { k: 'sets', label: 'Sett i A-blokk', unit: 'sett', values: range(1, 6, 1), incs: [0, 1], incFmt: (i) => `+${i} sett` },
};
export const mainOf = (t: Template) => (t.builtin ? MAIN[t.builtin] : undefined);

export const ALT: Record<Sport, string[]> = {
  bike: ['Trainer: samme økt i ERG-modus', 'Trainer: 2 t sone 2 i Zwift', 'Spinning 60 min'],
  run: ['Mølle: samme økt', 'Mølle: 45 min rolig', 'Ellipse 45 min'],
  swim: [],
  strength: ['Hjemme: strikk og kroppsvekt'],
};

// ---------- Builder (coach-made sessions) ----------
export const KINDS: PartKind[] = ['Oppvarming', 'Drag', 'Pause', 'Nedkjøling'];
export const TARGETS: Record<Sport, Target[]> = {
  bike: ['Ingen', 'Watt', 'Sone', 'Kadens'],
  run: ['Ingen', 'Tempo', 'Sone'],
  swim: ['Ingen', 'Tempo', 'Sone'],
  strength: ['Ingen'],
};
export const TDEF: Record<Target, (sp: Sport) => number | null> = {
  Watt: () => 200,
  Tempo: (sp) => (sp === 'swim' ? 110 : 300),
  Sone: () => 2,
  Kadens: () => 90,
  Ingen: () => null,
};

type WheelDef = { label?: string; values: number[]; unit: string; fmt?: (v: number) => string };
export const measureDef = (m: Part['measure'], sp: Sport): WheelDef =>
  m === 'tid'
    ? { label: 'Varighet', values: range(1, 240, 1), unit: 'min' }
    : sp === 'swim'
      ? { label: 'Distanse', values: range(25, 4000, 25), unit: 'm' }
      : sp === 'bike'
        ? { label: 'Distanse', values: range(1, 200, 1), unit: 'km' }
        : { label: 'Distanse', values: range(0.5, 42, 0.5), fmt: (v) => nf(v), unit: 'km' };

export const targetDef = (t: Target, sp: Sport): WheelDef =>
  t === 'Watt'
    ? { values: range(80, 450, 1), unit: 'W' }
    : t === 'Tempo'
      ? sp === 'swim'
        ? { values: range(70, 180, 1), fmt: pace, unit: '/100m' }
        : { values: range(180, 480, 5), fmt: pace, unit: '/km' }
      : t === 'Sone'
        ? { values: range(1, 5, 1), fmt: (v) => 'Sone ' + v, unit: '' }
        : { values: range(50, 120, 1), unit: 'rpm' };

const partAmt = (p: Part, sp: Sport) => (p.measure === 'tid' ? `${p.val} min` : sp === 'swim' ? `${p.val} m` : `${nf(p.val)} km`);
const partTgt = (p: Part, sp: Sport) =>
  p.target === 'Watt'
    ? `@ ${p.tval} W`
    : p.target === 'Tempo'
      ? `@ ${pace(p.tval ?? 0)} ${sp === 'swim' ? '/100 m' : '/km'}`
      : p.target === 'Sone'
        ? `sone ${p.tval}`
        : p.target === 'Kadens'
          ? `${p.tval} rpm`
          : '';
export const partSum = (p: Part, sp: Sport) => {
  if (p.kind === 'Pause') return `${partAmt(p, sp)} rolig`;
  const core = [partAmt(p, sp), partTgt(p, sp)].filter(Boolean).join(' ');
  return p.reps > 1 ? `${p.reps}× [${core}${p.rest ? ` + ${nf(p.rest)} min rolig` : ''}]` : core;
};
const partMin = (p: Part, sp: Sport) => {
  const one = p.measure === 'tid' ? p.val : sp === 'bike' ? (p.val / 30) * 60 : sp === 'run' ? p.val * 5.5 : (p.val / 100) * 2;
  return one * (p.reps || 1) + (p.rest || 0) * Math.max(0, (p.reps || 1) - 1);
};
export const partsTotal = (parts: Part[], sp: Sport) => parts.reduce((a, p) => a + partMin(p, sp), 0);
export const partsKm = (parts: Part[], sp: Sport) =>
  Math.round(
    parts.reduce((a, p) => {
      const r = p.reps || 1;
      if (p.measure === 'dist') return a + (sp === 'swim' ? p.val / 1000 : p.val) * r;
      return a + ((p.val * r) / 60) * ({ bike: 28, run: 11, swim: 2.4, strength: 0 }[sp] || 0);
    }, 0) * 10,
  ) / 10;
export const exSum = (x: BuiltExercise) => `${x.sets} × ${x.reps} · RiR ${x.rir} · ${x.rest} s`;

export const defaultParts = (sp: Sport): Part[] => {
  const t = TARGETS[sp][1];
  return [
    { kind: 'Oppvarming', measure: 'tid', val: 15, target: 'Sone', tval: 2, reps: 1, rest: 0 },
    { kind: 'Drag', measure: 'tid', val: sp === 'swim' ? 2 : 8, target: t, tval: sp === 'bike' ? 223 : TDEF[t](sp), reps: 4, rest: 2 },
    { kind: 'Nedkjøling', measure: 'tid', val: 10, target: 'Sone', tval: 1, reps: 1, rest: 0 },
  ];
};

const builtFormula = (t: Template): Formula => {
  const sp = t.sport;
  if (sp === 'strength') {
    const exs = t.exercises as BuiltExercise[];
    const tot = exs.reduce((a, x) => a + x.sets * (1 + x.rest / 60), 0);
    return {
      meta: () => `${exs.length} øvelser · ca. ${R(tot)} min`,
      keys: () => [{ v: exs.length, u: 'øvelser' }, { v: exs.reduce((a, x) => a + x.sets, 0), u: 'sett totalt' }, { v: R(tot), u: 'min' }],
      steps: () => exs.map((x) => ({ h: x.name, t: exSum(x) })),
    };
  }
  const tot = partsTotal(t.parts, sp);
  const drag = t.parts.filter((p) => p.kind === 'Drag').map((p) => partSum(p, sp))[0];
  return {
    meta: () => [hm(tot), drag].filter(Boolean).join(' · '),
    keys: () => [{ v: hm(tot), u: 'tid' }, { v: t.parts.length, u: 'deler' }, { v: nf(partsKm(t.parts, sp)), u: 'km (ca.)' }],
    steps: () => t.parts.map((p) => ({ h: p.kind, t: partSum(p, sp) })),
  };
};

const formulaOf = (t: Template): Formula =>
  t.builtin && BUILTIN[t.builtin] ? BUILTIN[t.builtin] : t.builtin && t.sport === 'strength' ? strengthFormula(t) : builtFormula(t);

/** Text for a session in a given week. `valueOverride` replaces the main value for one day. */
export function describe(t: Template, prog: Prog, opts: { f?: number; valueOverride?: number | null } = {}) {
  const f = opts.f ?? 1;
  const main = mainOf(t);
  const p = main && opts.valueOverride != null ? { ...prog, [main.k]: opts.valueOverride } : prog;
  const fm = formulaOf(t);
  return {
    title: t.name,
    tag: t.tag ?? (t.builtin ? '' : 'Egen økt'),
    meta: fm.meta(p, f),
    keys: fm.keys(p, f),
    steps: fm.steps(p, f),
  };
}

/** All exercise names known in the library, for the strength builder's chips. */
export const exerciseNames = (templates: Template[]) => {
  const o: string[] = [];
  templates.forEach((t) => t.exercises.forEach((x) => !o.includes(x.name) && o.push(x.name)));
  return o;
};

// ---------- Volume (km per sport) for "Denne uka" (prototype: LIB[].vol) ----------
export type Vol = Partial<Record<Sport, number>>;
const BUILTIN_VOL: Record<string, (p: Prog) => Vol> = {
  b1: (p) => ({ bike: p.longBike ?? 0 }),
  b2: () => ({ bike: 50 }),
  b3: () => ({ bike: 60 }),
  r1: (p) => ({ run: p.brickRun ?? 0 }),
  r2: () => ({ run: 12 }),
  r3: () => ({ run: 4, bike: 16 }),
  r4: () => ({ run: 7 }),
  s1: () => ({ swim: 2 }),
  s2: () => ({ swim: 2.4 }),
};
export function volOf(t: Template, p: Prog, valueOverride?: number | null): Vol {
  if (t.sport === 'strength') return { strength: 1 };
  const m = mainOf(t);
  const pp = m && valueOverride != null ? { ...p, [m.k]: valueOverride } : p;
  if (t.builtin && BUILTIN_VOL[t.builtin]) return BUILTIN_VOL[t.builtin](pp);
  return { [t.sport]: partsKm(t.parts, t.sport) };
}

// ---------- Strength exercises as the athlete sees them ----------
export type ExerciseRow = { block: string; name: string; sets: number; reps: number; repsText: string; rir: number | null; kg: number };
export function exerciseRows(t: Template, p: Prog, f = 1): ExerciseRow[] {
  if (t.builtin) {
    return (t.exercises as BuiltinExercise[]).map((x) => ({
      block: x.code,
      name: x.name,
      sets: t.is_optional ? 2 : x.code.startsWith('A') ? Math.max(1, Math.round((p.sets ?? 3) * f)) : 3,
      reps: x.repsNum,
      repsText: x.reps,
      rir: x.rir,
      kg: x.kg,
    }));
  }
  return (t.exercises as BuiltExercise[]).map((x, i) => ({
    block: String(i + 1),
    name: x.name,
    sets: Math.max(1, Math.round(x.sets * f)),
    reps: x.reps,
    repsText: String(x.reps),
    rir: x.rir,
    kg: 0,
  }));
}
