export type Sport = 'bike' | 'run' | 'swim' | 'strength';
export const SPORTS: Sport[] = ['bike', 'run', 'swim', 'strength'];

export const SP: Record<Sport, { label: string; c: string }> = {
  bike: { label: 'Sykkel', c: 'var(--bike)' },
  run: { label: 'Løp', c: 'var(--run)' },
  swim: { label: 'Svøm', c: 'var(--swim)' },
  strength: { label: 'Styrke', c: 'var(--strength)' },
};

const svgI = (p: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${p}</svg>`,
  )}") center / contain no-repeat`;

export const ICONS: Record<Sport | 'other', string> = {
  bike: svgI("<circle cx='5.5' cy='16.5' r='3.5'/><circle cx='18.5' cy='16.5' r='3.5'/><path d='M5.5 16.5 9 9h7l2.5 7.5M9 9l3.5 7.5h-7M14.5 5.5h2.5l-1 3.5'/>"),
  run: svgI("<circle cx='15' cy='4.5' r='2'/><path d='M6 20.5l3.5-4.5 3 1.5 1.5-4 3 2.5h3M9 10.5l3-3 3.5 1.5-1.5 4.5'/>"),
  swim: svgI("<circle cx='17' cy='7' r='2'/><path d='M3 17.5c1.5 0 2.25 1 3.75 1s2.25-1 3.75-1 2.25 1 3.75 1 2.25-1 3.75-1 2.25 1 3 1M6 13.5l4.5-4 4 3'/>"),
  strength: svgI("<path d='M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11'/>"),
  other: svgI("<path d='M3 12h4l3-7 4 14 3-7h4'/>"),
};

export const TINT = (c: string) => `color-mix(in oklch, ${c} 14%, var(--card))`;

export type VisualState = 'done' | 'missed' | 'off' | 'planned';

/** Session colour states (chip tint, icon colour, title colour, strike-through). */
export const SST = (c: string, st: VisualState) =>
  st === 'done'
    ? { ctint: `color-mix(in oklch, ${c} 6%, var(--card))`, ic: `color-mix(in oklch, ${c} 45%, var(--card))`, titleFg: 'var(--muted)', deco: 'none' }
    : st === 'missed'
      ? { ctint: 'var(--card2)', ic: 'var(--faint)', titleFg: 'var(--faint)', deco: 'line-through' }
      : st === 'off'
        ? { ctint: 'var(--card2)', ic: 'var(--faint)', titleFg: 'var(--muted)', deco: 'none' }
        : { ctint: `color-mix(in oklch, ${c} 26%, var(--card))`, ic: c, titleFg: 'var(--ink)', deco: 'none' };
