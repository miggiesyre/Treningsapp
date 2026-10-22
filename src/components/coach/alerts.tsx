'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageTitle } from '@/components/app-shell';
import { loadAlerts, type Alert } from '@/lib/plan/actions';
import { DECISION_TEXT, KIND_TEXT } from '@/lib/plan/changes';
import { useCoach } from '@/lib/plan/coach-data';
import { DAYS, fmtD, parseYmd, weekDay } from '@/lib/plan/dates';
import { SP } from '@/lib/plan/sports';
import { AlertModal } from './alert-modal';

/** "Varsler": Miguel's changes with reason; open ones get "Håndter" (prototype: TRENER: INNBOKS). */
export function Alerts() {
  const { supabase, athleteId, byId, ready } = useCoach();
  const [list, setList] = useState<Alert[] | null>(null);
  const [open, setOpen] = useState<Alert | null>(null);
  const load = useCallback(async () => setList(await loadAlerts(supabase, athleteId)), [supabase, athleteId]);
  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener('alerts-changed', on);
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 30000);
    return () => {
      window.removeEventListener('alerts-changed', on);
      clearInterval(t);
    };
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}>
      <PageTitle title="Varsler" />
      <div style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 20, padding: '4px 18px' }}>
        {list?.map((a, i) => {
          const t = a.planned ? byId[a.planned.template_id] : undefined;
          const date = a.planned?.date;
          const wd = date ? weekDay(parseYmd(date)) : null;
          const done = !!a.decided_at;
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: t ? SP[t.sport].c : 'var(--faint)' }} />
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {KIND_TEXT[a.kind]}: {t?.name ?? 'Økt'}
                </span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {date && wd ? `${DAYS[wd.d]} ${fmtD(parseYmd(date))} · Uke ${wd.w}` : ''}
                  {a.reason ? ` · ${a.reason}` : ''}
                </span>
              </span>
              {done ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ok)', textAlign: 'right' }}>{a.coach_decision ? DECISION_TEXT[a.coach_decision] : 'OK'}</span>
              ) : (
                <button className="btn-ink" style={{ height: 'auto', borderRadius: 999, padding: '9px 16px', fontSize: 14 }} onClick={() => setOpen(a)}>
                  Håndter
                </button>
              )}
            </div>
          );
        })}
        {list && !list.length && <div style={{ padding: '18px 0', fontSize: 15, color: 'var(--muted)' }}>Ingen endringer fra Miguel.</div>}
        {(!list || !ready) && <div style={{ padding: '18px 0', fontSize: 15, color: 'var(--muted)' }}>Henter …</div>}
      </div>
      {open && (
        <AlertModal
          alert={open}
          onClose={() => setOpen(null)}
          onDone={() => {
            setOpen(null);
            load();
          }}
        />
      )}
    </div>
  );
}
