'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { lastLifts, loadSessionLogs, saveStrength, type SetLog } from '@/lib/plan/athlete-actions';
import { usePlan } from '@/lib/plan/coach-data';
import { nf, type ExerciseRow } from '@/lib/plan/library';

const KG = Array.from({ length: 81 }, (_, i) => i * 2.5);
const REPS = Array.from({ length: 30 }, (_, i) => i + 1);

/** Gym mode: one exercise at a time, kg and reps on wheels (prototype: STYRKELOGG). */
export function StrengthLog({ plannedId, title, exercises, onClose, onSaved }: { plannedId: string; title: string; exercises: ExerciseRow[]; onClose: () => void; onSaved: () => void }) {
  const { supabase, athleteId } = usePlan();
  const toast = useToast();
  const [ex, setEx] = useState(0);
  const [sets, setSets] = useState<Record<string, SetLog[]>>({});
  const [last, setLast] = useState<Record<string, SetLog>>({});
  const [kg, setKg] = useState(0);
  const [reps, setReps] = useState(8);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const prefill = (i: number, lst = last, logged = sets) => {
    const x = exercises[i];
    const mine = logged[x.name];
    const l = mine?.length ? mine[mine.length - 1] : lst[x.name];
    setKg(l ? l.kg : x.kg);
    setReps(l ? l.reps : x.reps || 8);
  };

  useEffect(() => {
    (async () => {
      const [l, s] = await Promise.all([lastLifts(supabase, athleteId), loadSessionLogs(supabase, plannedId)]);
      setLast(l);
      setSets(s);
      prefill(0, l, s);
      setReady(true);
    })();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (i: number) => {
    clearTimeout(timer.current);
    if (i < 0) return;
    if (i >= exercises.length) {
      setFinished(true);
      return;
    }
    setFinished(false);
    setEx(i);
    prefill(i);
  };

  const x = exercises[ex];
  const done = sets[x?.name] ?? [];
  const allDone = done.length >= (x?.sets ?? 0);
  const total = Object.values(sets).reduce((a, b) => a + b.length, 0);
  const nEx = Object.values(sets).filter((s) => s.length).length;

  const primary = () => {
    if (allDone) return go(ex + 1);
    const nxt = [...done, { kg, reps }];
    setSets((s) => ({ ...s, [x.name]: nxt }));
    if (nxt.length >= x.sets) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => go(ex + 1), 650);
    }
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveStrength(supabase, athleteId, plannedId, sets);
      toast('Styrkeøkt lagret');
      onSaved();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  return (
    <div className="sl-bg">
      <div
        className="sl"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s || finished || (e.target as HTMLElement).closest('[role="slider"]')) return;
          const dx = e.changedTouches[0].clientX - s.x;
          const dy = e.changedTouches[0].clientY - s.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0 && ex < exercises.length - 1) go(ex + 1);
            if (dx > 0) go(ex - 1);
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Styrkelogg"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button className="round" style={{ boxShadow: 'none' }} onClick={onClose} aria-label="Lukk">
            ×
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, textAlign: 'center' }}>{title}</span>
          <span style={{ fontSize: 15, color: 'var(--muted)', minWidth: 40, textAlign: 'right' }}>{finished ? '' : `${ex + 1}/${exercises.length}`}</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {exercises.map((e, i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: (sets[e.name] ?? []).length ? 'var(--strength)' : i === ex && !finished ? 'var(--ink)' : 'var(--card2)' }} />
          ))}
        </div>

        {!finished && x && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--strength)' }}>{x.block}</span>
              <span style={{ fontFamily: 'var(--num)', fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{x.name}</span>
              <span style={{ fontSize: 17, color: 'var(--muted)' }}>
                {x.rir != null ? `RiR ${x.rir} · ` : ''}
                {x.sets} × {x.repsText}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Array.from({ length: Math.max(x.sets, done.length) }, (_, i) => {
                const s = done[i];
                return (
                  <span
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 600,
                      background: s ? 'var(--strength)' : i === done.length ? 'var(--card2)' : 'var(--card)',
                      color: s ? '#fff' : i === done.length ? 'var(--ink)' : 'var(--faint)',
                    }}
                  >
                    {s ? `✓ ${s.kg ? nf(s.kg) + ' kg × ' : ''}${s.reps}` : `Sett ${i + 1}`}
                  </span>
                );
              })}
            </div>
            <div style={{ flex: '1 0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignContent: 'center', opacity: ready ? 1 : 0.4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="sl-lbl">kg</span>
                <Wheel key={'kg' + ex} values={KG} value={kg} format={(v) => nf(v)} onChange={setKg} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="sl-lbl">reps</span>
                <Wheel key={'r' + ex} values={REPS} value={reps} onChange={setReps} />
              </div>
            </div>
            <button className="btn-ink" style={{ flexShrink: 0, height: 60, borderRadius: 16, fontSize: 19, fontWeight: 700 }} disabled={!ready} onClick={primary}>
              {allDone ? (ex < exercises.length - 1 ? 'Neste øvelse ›' : 'Avslutt') : `✓ Sett ${done.length + 1} ferdig`}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button className="sl-nav" onClick={() => go(ex - 1)} disabled={ex === 0} style={{ textAlign: 'left' }}>
                ‹ Forrige
              </button>
              <span className="narrow-only" style={{ fontSize: 13, color: 'var(--faint)' }}>
                Sveip for å bytte øvelse
              </span>
              <button className="sl-nav" onClick={() => go(ex + 1)} style={{ textAlign: 'right' }}>
                {ex < exercises.length - 1 ? 'Neste ›' : 'Ferdig ›'}
              </button>
            </div>
          </>
        )}

        {finished && (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
              <span style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--ok)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 36, fontWeight: 700 }}>✓</span>
              <span style={{ fontFamily: 'var(--num)', fontSize: 30, fontWeight: 700 }}>Styrke ferdig</span>
              <span style={{ fontSize: 17, color: 'var(--muted)' }}>
                {total} sett logget på {nEx} øvelser
              </span>
              <button className="back-link" onClick={() => go(exercises.length - 1)} style={{ justifySelf: 'center' }}>
                ‹ Tilbake til øvelsene
              </button>
            </div>
            <button className="btn-ink" style={{ flexShrink: 0, height: 60, borderRadius: 16, fontSize: 19, fontWeight: 700 }} disabled={busy} onClick={save}>
              Lagre og lukk
            </button>
          </>
        )}
      </div>
    </div>
  );
}
