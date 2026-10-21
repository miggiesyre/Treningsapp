export type Role = 'athlete' | 'coach';
export type Theme = 'dark' | 'light' | 'system';

export const HOME: Record<Role, string> = { athlete: '/hjem', coach: '/ukeplan' };

export const NAV: Record<Role, { href: string; label: string }[]> = {
  athlete: [
    { href: '/hjem', label: 'Hjem' },
    { href: '/trening', label: 'Trening' },
    { href: '/soner', label: 'Soner' },
    { href: '/progresjon', label: 'Progresjon' },
    { href: '/some', label: 'SoMe' },
  ],
  coach: [
    { href: '/ukeplan', label: 'Ukeplan' },
    { href: '/okter', label: 'Økter' },
    { href: '/varsler', label: 'Varsler' },
    { href: '/miguel', label: 'Miguel' },
  ],
};

// Routes each role may open. Anything else redirects to the role's home.
const ALLOWED: Record<Role, string[]> = {
  athlete: ['/hjem', '/trening', '/soner', '/progresjon', '/some', '/okt'],
  coach: ['/ukeplan', '/okter', '/varsler', '/miguel'],
};
const SHARED = ['/nytt-passord'];

export function isAllowed(role: Role, path: string) {
  return [...ALLOWED[role], ...SHARED].some((p) => path === p || path.startsWith(p + '/'));
}

export function isTheme(v: unknown): v is Theme {
  return v === 'dark' || v === 'light' || v === 'system';
}
