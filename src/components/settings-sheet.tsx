'use client';

import { useEffect, useState, useTransition } from 'react';
import { saveTheme, signOut } from '@/app/actions/auth';
import type { Theme } from '@/lib/roles';

const THEMES: { v: Theme; label: string }[] = [
  { v: 'light', label: 'Lys' },
  { v: 'dark', label: 'Mørk' },
  { v: 'system', label: 'System' },
];

export function SettingsSheet({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  const [current, setCurrent] = useState(theme);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pick = (t: Theme) => {
    setCurrent(t);
    document.documentElement.dataset.theme = t;
    startTransition(() => saveTheme(t));
  };

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Innstillinger" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">Innstillinger</span>
          <button className="sheet-done" onClick={onClose}>
            Ferdig
          </button>
        </div>
        <div className="group">
          <span className="group-label">Utseende</span>
          <div className="seg">
            {THEMES.map((t) => (
              <button key={t.v} aria-pressed={current === t.v} onClick={() => pick(t.v)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="group">
          <span className="group-label">Tilkoblinger</span>
          <div className="rows">
            <div>
              <span style={{ fontSize: 16 }}>Strava</span>
              <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>Kommer i fase 4</span>
            </div>
            <div>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 16 }}>Garmin</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Vekt og søvn synkes automatisk</span>
              </span>
              <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>Kommer i fase 4</span>
            </div>
          </div>
        </div>
        <form action={signOut}>
          <button className="logout">Logg ut</button>
        </form>
      </div>
    </div>
  );
}
