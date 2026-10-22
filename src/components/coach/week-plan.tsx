'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageTitle, useOpenSettings } from '@/components/app-shell';
import { SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { moveSession, saveFocus } from '@/lib/plan/actions';
import { blockOf, useCoach, type Change, type Planned, type WeekData } from '@/lib/plan/coach-data';
import { DAYS, SD, WEEKS, currentWeek, dateOf, fmtD, parseYmd, today, ymd } from '@/lib/plan/dates';
import { ICONS, SP, TINT } from '@/lib/plan/sports';
import { defaultParts } from '@/lib/plan/library';
import { activityStats } from '@/lib/plan/athlete';
import { chipView, isPaused } from '@/lib/plan/view';
import { AddSheet } from './add-sheet';
import { AlertModal } from './alert-modal';
import { loadAlerts, type Alert } from '@/lib/plan/actions';
import { Builder } from './builder';
import { CopySheet } from './copy-sheet';
import { EditSheet } from './edit-sheet';
import { Guide, useGuide } from './guide';
import type { Draft } from '@/lib/plan/actions';

const EMPTY: WeekData = { planned: [], changes: [], focus: {}, own: [], activities: [] };

export function WeekPlan() {
  const { supabase, athleteId, byId, prog, blocks, settings, ready, loadWeek, reloadTemplates } = useCoach();
  const toast = useToast();
  const [cw, setCw] = useState(currentWeek);
  const [data, setData] = useState<WeekData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [addDay, setAddDay] = useState<number | null>(null);
  const [edit, setEdit] = useState<Planned | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [overDay, setOverDay] = useState<number | null>(null);
  const drag = useRef<Planned | null>(null);
  const guide = useGuide();
  const openSettings = useOpenSettings();
  // Unhandled changes from Miguel pop up once per login session (prototype: alertOpen at login).
  const [alert, setAlert] = useState<Alert | null>(null);
  const nextAlert = useCallback(async () => {
    const open = (await loadAlerts(supabase, athleteId)).filter((a) => !a.decided_at);
    setAlert(open[0] ?? null);
  }, [supabase, athleteId]);
  useEffect(() => {
    try {
      if (sessionStorage.getItem('alerts-later')) return;
    } catch {}
    nextAlert();
  }, [nextAlert]);

  const reload = useCallback(async () => {
    const d = await loadWeek(cw);
    setData(d);
    setLoaded(true);
  }, [loadWeek, cw]);

  useEffect(() => {
    setLoaded(false);
    reload();
  }, [reload]);

  // Swipe between weeks on the phone.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = (w: number) => setCw(Math.max(1, Math.min(WEEKS, w)));

  const swimBack = settings?.swim_paused_until ? parseYmd(settings.swim_paused_until) : null;
  const p = prog[cw] ?? {};
  const b = blockOf(blocks, cw);
  const t = today();

  const lastChange = useMemo(() => {
    const m: Record<string, Change> = {};
    data.changes.forEach((c) => (m[c.planned_session_id] = c));
    return m;
  }, [data.changes]);

  const days = Array.from({ length: 7 }, (_, d) => {
    const date = ymd(dateOf(cw, d));
    return {
      d,
      date,
      items: data.planned.filter((x) => x.date === date && byId[x.template_id] && !isPaused(byId[x.template_id], date, swimBack)),
      own: data.own.filter((x) => x.date === date),
      extra: data.activities.filter((x) => x.date === date && !x.matched_session_id),
    };
  });
  const hasPaused = !!swimBack && dateOf(cw, 0) < swimBack && data.planned.some((x) => byId[x.template_id]?.sport === 'swim');

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok);
    } catch {
      toast('Noe gikk galt – prøv igjen');
    }
    await reload();
  };

  const onDrop = (d: number) => {
    const x = drag.current;
    drag.current = null;
    setOverDay(null);
    if (!x || x.date === ymd(dateOf(cw, d))) return;
    run(() => moveSession(supabase, athleteId, x.id, cw, d), `Flyttet til ${SD[d].toLowerCase()}`);
  };

  if (!ready) return <PageTitle title="Ukeplan" />;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s || (e.target as HTMLElement).closest('input,textarea')) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cw + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="plan-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button className="round" onClick={() => go(cw - 1)} disabled={cw <= 1} aria-label="Forrige uke">
            ‹
          </button>
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            Uke {cw}
            {b ? ` · ${b.name}` : ''} · {fmtD(dateOf(cw, 0))} – {fmtD(dateOf(cw, 6))}
          </span>
          <button className="round" onClick={() => go(cw + 1)} disabled={cw >= WEEKS} aria-label="Neste uke">
            ›
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pill" onClick={() => setCopyOpen(true)}>
            Kopier uke til…
          </button>
          <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
            <span />
          </button>
        </div>
      </div>

      {hasPaused && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--muted)' }}>
          <SportIcon icon={ICONS.swim} color="var(--swim)" size={14} />
          Svømming pauset til januar (skulder)
        </span>
      )}

      <div className="plan-days" style={{ opacity: loaded ? 1 : 0.5, transition: 'opacity .15s' }}>
        {days.map(({ d, date, items, own, extra }) => {
          const isT = cw === t.w && d === t.d;
          const fg = isT ? 'var(--bike)' : 'var(--ink)';
          return (
            <div
              key={date}
              className="plan-day"
              onDragOver={(e) => {
                e.preventDefault();
                if (overDay !== d) setOverDay(d);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverDay(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(d);
              }}
              style={{ background: overDay === d ? 'var(--card2)' : 'var(--card)', outline: overDay === d ? '2px dashed var(--ink)' : 'none' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 4px 0' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: fg }}>{SD[d]}</span>
                <span style={{ fontSize: 13, color: fg }}>{dateOf(cw, d).getDate()}.</span>
              </div>
              <FocusInput key={date} value={data.focus[date] ?? ''} onSave={(v) => saveFocus(supabase, athleteId, date, v).catch(() => toast('Fokus ble ikke lagret'))} />
              {items.map((x) => {
                const tp = byId[x.template_id];
                const v = chipView(x, tp, p, lastChange[x.id]);
                return (
                  <div
                    key={x.id}
                    draggable
                    onDragStart={(e) => {
                      drag.current = x;
                      try {
                        e.dataTransfer.setData('text/plain', x.id);
                        e.dataTransfer.effectAllowed = 'move';
                      } catch {}
                    }}
                    onClick={() => setEdit(x)}
                    onKeyDown={(e) => e.key === 'Enter' && setEdit(x)}
                    role="button"
                    tabIndex={0}
                    className="plan-chip"
                    style={{ background: v.ctint }}
                  >
                    <SportIcon icon={ICONS[tp.sport]} color={v.ic} style={{ marginTop: 1 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25, overflowWrap: 'anywhere', color: v.titleFg, textDecoration: v.deco }}>{v.title}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.3 }}>{v.meta}</span>
                      {v.flag && <span style={{ fontSize: 11.5, fontWeight: 600, color: v.flagFg }}>{v.flag}</span>}
                    </span>
                  </div>
                );
              })}
              {own.map((o) => {
                const sp = o.sport in SP ? (o.sport as keyof typeof SP) : null;
                const c = sp ? SP[sp].c : 'var(--muted)';
                return (
                  <div key={o.id} className="plan-chip" style={{ background: sp ? TINT(c) : 'var(--card2)', cursor: 'default' }}>
                    <SportIcon icon={sp ? ICONS[sp] : ICONS.other} color={c} style={{ marginTop: 1 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{o.title || (sp ? `Egen ${SP[sp].label.toLowerCase()}økt` : 'Annet')}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.3 }}>
                        {[o.distance_km ? `${o.distance_km} km` : '', o.duration_min ? `${o.duration_min} min` : '', o.comment].filter(Boolean).join(' · ')}
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>Egen</span>
                    </span>
                  </div>
                );
              })}
              {extra.map((a) => {
                const sp = a.sport && a.sport in SP ? (a.sport as keyof typeof SP) : null;
                const c = sp ? SP[sp].c : 'var(--muted)';
                return (
                  <div key={a.id} className="plan-chip" style={{ background: sp ? TINT(c) : 'var(--card2)', cursor: 'default' }}>
                    <SportIcon icon={sp ? ICONS[sp] : ICONS.other} color={c} style={{ marginTop: 1 }} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{a.name || 'Aktivitet'}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.3 }}>{activityStats(a)}</span>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ok)' }}>Ekstra · Strava</span>
                    </span>
                  </div>
                );
              })}
              <button className="plan-add" onClick={() => setAddDay(d)} title="Legg til økt" aria-label={`Legg til økt ${DAYS[d].toLowerCase()}`}>
                +
              </button>
            </div>
          );
        })}
      </div>

      {cw !== currentWeek() && (
        <button className="fab" onClick={() => setCw(currentWeek())}>
          I dag
        </button>
      )}
      <button onClick={guide.open} style={{ alignSelf: 'center', border: 0, background: 'none', color: 'var(--faint)', fontSize: 13, cursor: 'pointer', padding: 8 }}>
        Slik bruker du planen
      </button>

      {addDay != null && (
        <AddSheet
          w={cw}
          d={addDay}
          onClose={() => setAddDay(null)}
          onBuild={(sport) => {
            setDraft({ mode: 'new', sport, w: cw, d: addDay, name: '', parts: sport === 'strength' ? [] : defaultParts(sport), exs: [], note: '', alt: '' });
            setAddDay(null);
          }}
          onAdded={reload}
        />
      )}
      {edit && byId[edit.template_id] && (
        <EditSheet
          planned={edit}
          w={cw}
          changes={data.changes.filter((c) => c.planned_session_id === edit.id)}
          onClose={() => setEdit(null)}
          onSaved={reload}
          onEditContent={(dr) => {
            setEdit(null);
            setDraft(dr);
          }}
        />
      )}
      {draft && (
        <Builder
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null);
            await reloadTemplates();
            await reload();
          }}
        />
      )}
      {copyOpen && <CopySheet from={cw} onClose={() => setCopyOpen(false)} onDone={reload} />}
      {alert && !edit && addDay == null && !draft && (
        <AlertModal
          alert={alert}
          onClose={() => {
            try {
              sessionStorage.setItem('alerts-later', '1');
            } catch {}
            setAlert(null);
          }}
          onDone={async () => {
            await nextAlert();
            await reload();
          }}
        />
      )}
      {guide.show && !alert && !edit && addDay == null && !draft && <Guide onDone={guide.done} />}
    </div>
  );
}

/** "Dagens fokus" inline input. Saves on blur and after a short pause in typing. */
function FocusInput({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const saved = useRef(value);
  const cur = useRef(value);
  const save = useRef(onSave);
  save.current = onSave;
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    setV(value);
    saved.current = value;
    cur.current = value;
  }, [value]);
  const flush = (x: string) => {
    clearTimeout(timer.current);
    if (x.trim() === saved.current.trim()) return;
    saved.current = x;
    save.current(x);
  };
  // Leaving the week mid-typing still saves.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (cur.current.trim() !== saved.current.trim()) save.current(cur.current);
    },
    [],
  );
  return (
    <input
      value={v}
      maxLength={200}
      onChange={(e) => {
        const x = e.target.value;
        setV(x);
        cur.current = x;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => flush(x), 900);
      }}
      onBlur={() => flush(v)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      placeholder="Dagens fokus"
      title="Dagens fokus"
      style={{ border: 0, background: 'transparent', fontSize: 12, color: 'var(--muted)', padding: '0 4px 4px', minWidth: 0, width: '100%', boxSizing: 'border-box' }}
    />
  );
}
