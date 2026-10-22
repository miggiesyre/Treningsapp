'use client';

import { useState } from 'react';
import { useToast } from '@/components/toast';
import { resolveAlert, type Alert } from '@/lib/plan/actions';
import { useCoach } from '@/lib/plan/coach-data';
import { DAYS, SD, dateOf, fmtD, parseYmd, today, weekDay, ymd } from '@/lib/plan/dates';
import { SP } from '@/lib/plan/sports';

const HEAD: Record<Alert['kind'], string> = {
  skipped: 'hoppet over en økt',
  indoor: 'byttet til innendørs',
  shortened: 'valgte kort versjon',
  moved: 'flyttet en økt',
};

export const notifyAlerts = () => window.dispatchEvent(new Event('alerts-changed'));

/** "Varsel fra Miguel": Dropp / Flytt / Dobbeløkt / Erstatt (prototype: TRENER: VARSEL). */
export function AlertModal({ alert: a, onClose, onDone }: { alert: Alert; onClose: () => void; onDone: () => void }) {
  const { supabase, athleteId, byId, templates } = useCoach();
  const toast = useToast();
  const [step, setStep] = useState<'menu' | 'move' | 'double' | 'replace'>('menu');
  const [busy, setBusy] = useState(false);
  const t = a.planned ? byId[a.planned.template_id] : undefined;
  const date = a.planned?.date ?? a.created_at.slice(0, 10);
  const wd = weekDay(parseYmd(date));
  const now = today();
  // The rest of that week, never back in time.
  const days = Array.from({ length: 7 }, (_, i) => i).filter((i) => i !== wd.d && (wd.w - 1) * 7 + i >= (now.w - 1) * 7 + now.d);

  const go = async (action: 'accept' | 'drop' | 'move' | 'double' | 'replace', arg?: { date?: string; templateId?: string }, msg = 'Lagret. Miguel ser endringen.') => {
    if (busy) return;
    setBusy(true);
    try {
      await resolveAlert(supabase, athleteId, a, action, arg);
      toast(msg);
      notifyAlerts();
      onDone();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  const skip = a.kind === 'skipped';
  const options = skip
    ? [
        { t: 'Dropp den', s: 'Økta utgår', go: () => go('drop') },
        { t: 'Flytt den', s: 'Til en annen dag denne uka', go: () => setStep('move'), off: !days.length },
        { t: 'Legg til som dobbeløkt', s: 'Sammen med en annen økt', go: () => setStep('double'), off: !days.length },
        { t: 'Erstatt', s: 'Med en annen økt fra biblioteket', go: () => setStep('replace') },
      ]
    : [
        { t: 'OK', s: 'Greit for meg', go: () => go('accept', undefined, 'Lagret') },
        { t: 'Dropp den', s: 'Økta utgår', go: () => go('drop') },
      ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 35, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Varsel fra Miguel"
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--sheet)', width: '100%', maxWidth: 420, maxHeight: '90vh', overflow: 'auto', borderRadius: 22, padding: 22, boxSizing: 'border-box', display: 'grid', alignContent: 'start', gap: 16, animation: 'up .25s ease both' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="lbl">Varsel fra Miguel</span>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Miguel {HEAD[a.kind]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--row)', borderRadius: 14, padding: '12px 14px 12px 0', overflow: 'hidden' }}>
          <span style={{ width: 4, alignSelf: 'stretch', borderRadius: '0 2px 2px 0', background: t ? SP[t.sport].c : 'var(--faint)' }} />
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{t ? (t.sport === 'strength' ? t.name : `${SP[t.sport].label} · ${t.name}`) : 'Økt'}</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              {DAYS[wd.d]} {fmtD(parseYmd(date))} · Uke {wd.w}
              {a.kind === 'moved' && a.to_date ? ` → ${DAYS[weekDay(parseYmd(a.to_date)).d].toLowerCase()}` : ''}
            </span>
          </span>
        </div>
        {a.reason && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 15, color: 'var(--muted)' }}>Grunn</span>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{a.reason}</span>
          </div>
        )}
        {step === 'menu' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((o) => (
              <button key={o.t} className="swap-opt" disabled={busy || o.off} style={{ opacity: o.off ? 0.4 : 1, padding: '13px 16px' }} onClick={o.go}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{o.t}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{o.s}</span>
                </span>
                <span style={{ fontSize: 20, color: 'var(--faint)' }}>›</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <span style={{ fontSize: 15, color: 'var(--muted)' }}>{step === 'replace' ? 'Erstatt med' : step === 'double' ? 'Legg til som dobbeløkt' : 'Flytt til'}</span>
            <div className="chips" style={{ marginTop: -6 }}>
              {step === 'replace'
                ? templates
                    .filter((x) => !x.hidden && x.id !== t?.id && x.sport !== 'swim')
                    .map((x) => (
                      <button key={x.id} className="chip" disabled={busy} style={{ background: 'var(--row)', display: 'flex', alignItems: 'center', gap: 7 }} onClick={() => go('replace', { templateId: x.id }, `Erstattet med ${x.name}`)}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: SP[x.sport].c }} />
                        {x.name}
                      </button>
                    ))
                : days.map((i) => (
                    <button
                      key={i}
                      className="chip"
                      disabled={busy}
                      style={{ background: 'var(--row)' }}
                      onClick={() => go(step, { date: ymd(dateOf(wd.w, i)) }, step === 'double' ? `Dobbeløkt ${DAYS[i].toLowerCase()}` : `Flyttet til ${DAYS[i].toLowerCase()}`)}
                    >
                      {SD[i]} {dateOf(wd.w, i).getDate()}.
                    </button>
                  ))}
            </div>
            <button className="back-link" onClick={() => setStep('menu')}>
              ‹ Tilbake
            </button>
          </>
        )}
        <button onClick={onClose} style={{ border: 0, background: 'none', color: 'var(--muted)', fontSize: 15, cursor: 'pointer', padding: 6 }}>
          Senere
        </button>
      </div>
    </div>
  );
}
