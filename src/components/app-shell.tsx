/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { NAV, type Role, type Theme } from '@/lib/roles';
import { createClient } from '@/lib/supabase/client';
import { SettingsSheet } from './settings-sheet';
import { ToastProvider } from './toast';

const SettingsCtx = createContext<() => void>(() => {});
export const useOpenSettings = () => useContext(SettingsCtx);

export function AppShell({ role, name, theme, children }: { role: Role; name: string; theme: Theme; children: React.ReactNode }) {
  const path = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const items = NAV[role].map((n) => ({ ...n, active: path === n.href || path.startsWith(n.href + '/') }));
  const open = () => setSettingsOpen(true);
  const alerts = useOpenAlerts(role === 'coach');

  // The saved profile theme wins over the cookie (e.g. on a new device).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <SettingsCtx.Provider value={open}>
      <ToastProvider>
      <div className="shell">
        <aside className="side">
          <div className="side-logo">
            <img src="/logo.svg" alt="Tri 70.3" />
          </div>
          <nav>
            {items.map((n) => (
              <Link key={n.href} href={n.href} className="side-item" aria-current={n.active ? 'page' : undefined}>
                {n.label}
                {n.href === '/varsler' && alerts > 0 && <span className="badge">{alerts}</span>}
              </Link>
            ))}
          </nav>
          <button className="side-me" onClick={open}>
            <span className="avatar">{name.charAt(0).toUpperCase()}</span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Innstillinger</span>
            </span>
          </button>
        </aside>

        <main className="main">
          <div className="page" data-role={role}>
            {children}
          </div>
        </main>

        <nav className="tabs">
          {items.map((n) => (
            <Link key={n.href} href={n.href} className="tab" aria-current={n.active ? 'page' : undefined}>
              <span className="tab-ic">
                <NavIcon href={n.href} />
              </span>
              {n.label}
              {n.href === '/varsler' && alerts > 0 && <span className="badge tab-badge">{alerts}</span>}
            </Link>
          ))}
        </nav>
      </div>
      {settingsOpen && <SettingsSheet theme={theme} role={role} onClose={() => setSettingsOpen(false)} />}
      </ToastProvider>
    </SettingsCtx.Provider>
  );
}

export function PageTitle({ title }: { title: string }) {
  const open = useOpenSettings();
  return (
    <div className="page-head">
      <h1 className="page-title">{title}</h1>
      <button className="gear" onClick={open} title="Innstillinger" aria-label="Innstillinger">
        <span />
      </button>
    </div>
  );
}

/** Unhandled changes from Miguel (RLS limits the count to Ruben's athletes). */
function useOpenAlerts(on: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const db = createClient();
    const load = () =>
      db
        .from('session_changes')
        .select('id', { count: 'exact', head: true })
        .is('decided_at', null)
        .then(({ count }) => setN(count ?? 0));
    load();
    window.addEventListener('alerts-changed', load);
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    return () => {
      window.removeEventListener('alerts-changed', load);
      clearInterval(t);
    };
  }, [on]);
  return n;
}

const ICON: Record<string, string> = {
  '/hjem': 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  '/trening': 'M3 12h4l3-8 4 16 3-8h4',
  '/soner': 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  '/progresjon': 'M3 20h18M5 16l4-5 4 3 6-8',
  '/some': 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  '/ukeplan': 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  '/okter': 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  '/varsler': 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  '/miguel': 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
};

function NavIcon({ href }: { href: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICON[href] ?? ICON['/hjem']} />
    </svg>
  );
}
