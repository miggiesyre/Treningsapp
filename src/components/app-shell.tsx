/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { NAV, type Role, type Theme } from '@/lib/roles';
import { SettingsSheet } from './settings-sheet';
import { ToastProvider } from './toast';

const SettingsCtx = createContext<() => void>(() => {});
export const useOpenSettings = () => useContext(SettingsCtx);

export function AppShell({ role, name, theme, children }: { role: Role; name: string; theme: Theme; children: React.ReactNode }) {
  const path = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const items = NAV[role].map((n) => ({ ...n, active: path === n.href || path.startsWith(n.href + '/') }));
  const open = () => setSettingsOpen(true);

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
              {n.label}
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
