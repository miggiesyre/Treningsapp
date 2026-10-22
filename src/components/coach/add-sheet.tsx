'use client';

import { useState } from 'react';
import { Sheet, SheetHead, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { addSession } from '@/lib/plan/actions';
import { useCoach } from '@/lib/plan/coach-data';
import { DAYS, dateOf, fmtD } from '@/lib/plan/dates';
import { describe } from '@/lib/plan/library';
import { ICONS, SP, SPORTS, TINT, type Sport } from '@/lib/plan/sports';

/** "+" on a day: pick sport → "Velg fra mine økter" or "Ny økt". */
export function AddSheet({ w, d, onClose, onBuild, onAdded }: { w: number; d: number; onClose: () => void; onBuild: (s: Sport) => void; onAdded: () => void }) {
  const { supabase, athleteId, templates, prog } = useCoach();
  const toast = useToast();
  const [sport, setSport] = useState<Sport | null>(null);
  const [step, setStep] = useState<'choice' | 'list'>('choice');
  const [busy, setBusy] = useState(false);
  const lib = sport ? templates.filter((t) => t.sport === sport && !t.hidden) : [];
  const p = prog[w] ?? {};

  const add = async (id: string, name: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await addSession(supabase, athleteId, id, w, d);
      toast(`${name} lagt til ${DAYS[d].toLowerCase()}`);
      onAdded();
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label="Legg til økt" width={440}>
      <SheetHead title={sport ? SP[sport].label : 'Legg til økt'} sub={`${DAYS[d]} ${fmtD(dateOf(w, d))} · Uke ${w}`} onClose={onClose} />
      {!sport && (
        <div className="two" style={{ gap: 10 }}>
          {SPORTS.map((k) => (
            <button
              key={k}
              onClick={() => {
                setSport(k);
                setStep('choice');
              }}
              style={{ border: 0, background: TINT(SP[k].c), borderRadius: 16, padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start', cursor: 'pointer', minHeight: 100 }}
            >
              <SportIcon icon={ICONS[k]} color={SP[k].c} size={28} />
              <span style={{ fontSize: 17, fontWeight: 700, color: SP[k].c }}>{SP[k].label}</span>
            </button>
          ))}
        </div>
      )}
      {sport && step === 'choice' && (
        <>
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="big-choice" onClick={() => setStep('list')} style={{ background: TINT(SP[sport].c) }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>Velg fra mine økter</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{lib.length} økter</span>
              </span>
              <span style={{ fontSize: 22, color: 'var(--faint)' }}>›</span>
            </button>
            <button className="big-choice" onClick={() => onBuild(sport)} style={{ background: 'var(--row)' }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>Ny økt</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>Bygg økta selv</span>
              </span>
              <span style={{ fontSize: 22, color: 'var(--faint)' }}>›</span>
            </button>
          </div>
          <button className="back-link" onClick={() => setSport(null)}>
            ‹ Velg annen sport
          </button>
        </>
      )}
      {sport && step === 'list' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lib.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                onClick={() => add(t.id, t.name)}
                style={{ textAlign: 'left', border: 0, background: TINT(SP[sport].c), borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              >
                <SportIcon icon={ICONS[sport]} color={SP[sport].c} size={18} />
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{describe(t, p).meta}</span>
                </span>
                <span style={{ fontSize: 22, color: 'var(--muted)' }}>+</span>
              </button>
            ))}
            {!lib.length && <span style={{ fontSize: 15, color: 'var(--muted)' }}>Ingen lagrede økter for {SP[sport].label.toLowerCase()} ennå.</span>}
          </div>
          <button className="back-link" onClick={() => setStep('choice')}>
            ‹ Tilbake
          </button>
        </>
      )}
    </Sheet>
  );
}
