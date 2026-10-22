'use client';

import { useEffect, useState, useTransition } from 'react';
import { saveTheme, signOut } from '@/app/actions/auth';
import type { Role, Theme } from '@/lib/roles';
import { useToast } from './toast';

const THEMES: { v: Theme; label: string }[] = [
  { v: 'light', label: 'Lys' },
  { v: 'dark', label: 'Mørk' },
  { v: 'system', label: 'System' },
];

export function SettingsSheet({ theme, role, onClose }: { theme: Theme; role: Role; onClose: () => void }) {
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
            {role === 'athlete' ? (
              <StravaRow />
            ) : (
              <div>
                <span style={{ fontSize: 16 }}>Strava</span>
                <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>Kobles til av Miguel</span>
              </div>
            )}
            <div>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 16 }}>Garmin</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Søvn, vekt og HRV</span>
              </span>
              <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>Kommer senere</span>
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

/** Strava: connect, sync now, disconnect. Tokens never reach the browser. */
function StravaRow() {
  const toast = useToast();
  const [state, setState] = useState<'loading' | 'on' | 'off'>('loading');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch('/api/strava/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setState(j.connected ? 'on' : 'off'))
      .catch(() => setState('off'));
  }, []);
  const post = async (path: string) => {
    setBusy(true);
    try {
      const r = await fetch(path, { method: 'POST' });
      if (!r.ok) throw new Error();
      return await r.json();
    } finally {
      setBusy(false);
    }
  };
  const sync = async () => {
    try {
      const j = await post('/api/strava/sync');
      toast(`Synket ${j.count} ${j.count === 1 ? 'aktivitet' : 'aktiviteter'}`);
    } catch {
      toast('Synk feilet – prøv igjen');
    }
  };
  const off = async () => {
    if (!confirm('Koble fra Strava? Øktene som allerede er hentet blir liggende.')) return;
    try {
      await post('/api/strava/disconnect');
      setState('off');
      toast('Strava er koblet fra');
    } catch {
      toast('Noe gikk galt – prøv igjen');
    }
  };
  return (
    <div style={{ flexWrap: 'wrap', gap: 8 }}>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 16 }}>Strava</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{state === 'on' ? 'Øktene hentes automatisk' : 'Henter øktene dine automatisk'}</span>
      </span>
      {state === 'loading' && <span style={{ fontSize: 15, color: 'var(--muted)' }}>…</span>}
      {state === 'off' && (
        <a href="/api/strava/connect" style={{ fontSize: 15, fontWeight: 700, color: '#FC4C02', textDecoration: 'none' }}>
          Koble til
        </a>
      )}
      {state === 'on' && (
        <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ fontSize: 15, color: 'var(--ok)', fontWeight: 600 }}>✓ Tilkoblet</span>
          <button onClick={sync} disabled={busy} style={{ border: 0, background: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
            Synk nå
          </button>
          <button onClick={off} disabled={busy} style={{ border: 0, background: 'none', fontSize: 15, color: 'var(--muted)', cursor: 'pointer', padding: 0 }}>
            Koble fra
          </button>
        </span>
      )}
    </div>
  );
}
