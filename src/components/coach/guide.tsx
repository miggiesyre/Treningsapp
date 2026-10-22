'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'tri-coach-guide-v1';
const STEPS = [
  { t: 'Velg uke', s: 'Bla med ‹ › øverst.' },
  { t: 'Trykk +', s: 'Velg sport og økt for dagen.' },
  { t: 'Lagre', s: 'Trykk på en økt for å justere mengde, notat og alternativ.' },
];

/** First-time guide: shown until dismissed once on this device. */
export function useGuide() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(!localStorage.getItem(KEY));
    } catch {}
  }, []);
  const done = useCallback(() => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    setShow(false);
  }, []);
  return { show, done, open: useCallback(() => setShow(true), []) };
}

export function Guide({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 36, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div role="dialog" aria-modal="true" aria-label="Slik lager du en uke" style={{ background: 'var(--sheet)', width: '100%', maxWidth: 400, borderRadius: 22, padding: 24, boxSizing: 'border-box', display: 'grid', gap: 20, animation: 'up .25s ease both' }}>
        <span style={{ fontSize: 24, fontWeight: 700 }}>Slik lager du en uke</span>
        {STEPS.map((g, i) => (
          <div key={g.t} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bg)', display: 'grid', placeItems: 'center', fontFamily: 'var(--num)', fontSize: 17, fontWeight: 700 }}>
              {i + 1}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 17, fontWeight: 600 }}>{g.t}</span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>{g.s}</span>
            </span>
          </div>
        ))}
        <button className="btn-ink" style={{ fontSize: 17 }} onClick={onDone}>
          Kom i gang
        </button>
      </div>
    </div>
  );
}
