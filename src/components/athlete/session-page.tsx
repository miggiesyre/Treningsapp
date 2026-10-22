'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { when } from '@/components/coach/edit-sheet';
import { Sheet, SheetHead, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { REASONS, activityStats, sessionView, todayOrd } from '@/lib/plan/athlete';
import { addChange, undoChange } from '@/lib/plan/athlete-actions';
import { addComment } from '@/lib/plan/actions';
import { DECISION_TEXT } from '@/lib/plan/changes';
import { blockOf, usePlan, type Change } from '@/lib/plan/coach-data';
import { DAYS, SD, dateOf, fmtD, parseYmd, weekDay, ymd } from '@/lib/plan/dates';
import { exerciseRows } from '@/lib/plan/library';
import { ICONS } from '@/lib/plan/sports';
import { StrengthLog } from './strength-log';
import { useAthleteWeek } from './use-week';

type Msg = { id: string; author_id: string; body: string; created_at: string };

const CHANGE_TEXT: Record<Change['kind'], string> = {
  skipped: 'hoppet over økta',
  indoor: 'byttet til innendørsversjon',
  shortened: 'valgte kort versjon',
  moved: 'flyttet økta',
};

/** Session page (prototype: ØKT). */
export function SessionPage({ id }: { id: string }) {
  const { supabase, athleteId, blocks, ready } = usePlan();
  const router = useRouter();
  const toast = useToast();
  const [date, setDate] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [swap, setSwap] = useState<'menu' | 'move' | 'skip' | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('planned_sessions')
      .select('date')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => (data ? setDate(data.date) : setMissing(true)));
  }, [supabase, id]);

  const w = date ? weekDay(parseYmd(date)).w : 0;
  const wk = useAthleteWeek(w);
  const e = wk.days.flat().find((x) => x.p.id === id && !x.ghost);

  const loadMsgs = useCallback(async () => {
    const { data } = await supabase.from('comments').select('id, author_id, body, created_at').eq('planned_session_id', id).order('created_at');
    setMsgs((data ?? []) as Msg[]);
  }, [supabase, id]);
  // New comments show up without reloading: refresh every 10 s while the page is visible.
  useEffect(() => {
    loadMsgs();
    const t = setInterval(() => document.visibilityState === 'visible' && loadMsgs(), 10000);
    const onVis = () => document.visibilityState === 'visible' && loadMsgs();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadMsgs]);

  const back = () => (window.history.length > 1 ? router.back() : router.push('/hjem'));

  if (missing)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button className="back-link" style={{ fontSize: 17, color: 'var(--ink)' }} onClick={() => router.push('/hjem')}>
          ‹ Tilbake
        </button>
        <span style={{ color: 'var(--muted)' }}>Fant ikke økta. Ruben kan ha fjernet den.</span>
      </div>
    );
  if (!ready || !e || !wk.loaded) return <div className="skeleton" style={{ height: 240, maxWidth: 680 }} />;

  const v = sessionView(e, wk.prog, wk.swimBack);
  const d = weekDay(parseYmd(e.date)).d;
  const b = blockOf(blocks, w);
  const isStrength = e.t.sport === 'strength';
  const exs = isStrength ? exerciseRows(e.t, wk.prog, v.f) : [];
  const matched = wk.data.activities.find((a) => a.matched_session_id === id);

  const thread = [
    ...wk.data.changes.filter((c) => c.planned_session_id === id).map((c) => ({ key: c.id, sys: true, mine: false, text: `Miguel ${CHANGE_TEXT[c.kind]}${c.reason ? ' · ' + c.reason : ''}`, at: c.created_at })),
    ...wk.data.changes
      .filter((c) => c.planned_session_id === id && c.decided_at)
      .map((c) => ({ key: c.id + 'd', sys: true, mine: false, text: `Ruben: ${c.coach_decision ? DECISION_TEXT[c.coach_decision] : 'OK'}`, at: c.decided_at! })),
    ...msgs.map((x) => ({ key: x.id, sys: false, mine: x.author_id === athleteId, text: x.body, at: x.created_at })),
  ].sort((a, b2) => a.at.localeCompare(b2.at));

  const change = async (kind: Change['kind'], extra: { reason?: string; to_date?: string } = {}) => {
    if (busy) return;
    setBusy(true);
    try {
      await addChange(supabase, athleteId, id, kind, extra);
      toast('Ruben har fått beskjed');
      setSwap(null);
      await wk.reload();
    } catch {
      toast('Noe gikk galt – prøv igjen');
    }
    setBusy(false);
  };

  const undo = async () => {
    if (!e.change || busy) return;
    setBusy(true);
    try {
      await undoChange(supabase, e.change.id);
      toast('Endringen er angret');
      await wk.reload();
    } catch {
      toast('Noe gikk galt – prøv igjen');
    }
    setBusy(false);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      await addComment(supabase, athleteId, athleteId, id, body);
      await loadMsgs();
    } catch {
      setDraft(body);
      toast('Kommentaren ble ikke sendt');
    }
  };

  // "Flytt til annen dag": the rest of this week, from today.
  const t0 = todayOrd();
  const moveDays = Array.from({ length: 7 }, (_, i) => i).filter((i) => i !== d && (w - 1) * 7 + i >= t0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 680 }}>
      <button onClick={back} style={{ alignSelf: 'flex-start', border: 0, background: 'none', color: 'var(--ink)', fontSize: 17, padding: '6px 0', cursor: 'pointer' }}>
        ‹ Tilbake
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, color: v.color }}>
          <SportIcon icon={ICONS[e.t.sport]} color={v.color} size={20} />
          {v.tagLine}
        </span>
        <h1 className="page-title">{v.title}</h1>
        <span style={{ fontSize: 15, color: 'var(--muted)' }}>
          {DAYS[d]} {fmtD(parseYmd(e.date))} · Uke {w}
          {b ? ` · ${b.name}` : ''}
          {e.p.time_label ? ` · ${e.p.time_label}` : ''}
        </span>
      </div>

      {v.banner && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 14, padding: '12px 14px', fontSize: 15 }}>
          <span style={{ width: 4, height: 22, borderRadius: 2, background: v.bannerColor, flexShrink: 0 }} />
          {v.banner}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
        {v.keys.map((k, i) => (
          <div key={i} style={{ background: v.tint, boxShadow: 'var(--shadow)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--num)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, overflowWrap: 'anywhere' }}>{k.v}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k.u}</span>
          </div>
        ))}
      </div>

      {matched && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 16, padding: '14px 16px' }}>
          <span style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', background: 'var(--ok)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>✓</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>Matchet fra Strava</span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>
              {matched.name ? `${matched.name} · ` : ''}
              {activityStats(matched)}
            </span>
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Program</span>
        {v.steps.map((st, i) => (
          <div key={i} className="step-row">
            <span style={{ fontSize: 15, fontWeight: 600 }}>{st.h}</span>
            <span style={{ fontSize: 15, lineHeight: 1.45 }}>{st.t}</span>
          </div>
        ))}
      </div>

      {isStrength && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>Øvelser</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{e.logged ? `${e.logged} sett logget` : 'Logging er valgfritt'}</span>
          </div>
          {exs.map((x, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,1fr) auto', gap: 10, alignItems: 'baseline', padding: '12px 0', borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--strength)' }}>{x.block}</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{x.name}</span>
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                {x.rir != null ? `RiR ${x.rir} · ` : ''}
                {x.sets} × {x.repsText}
              </span>
            </div>
          ))}
          {!v.paused && !v.skipped && (
            <button className="btn-ink" style={{ marginTop: 12, fontSize: 17 }} onClick={() => setLogOpen(true)}>
              {e.logged ? 'Endre styrkelogg' : 'Start styrkelogg'}
            </button>
          )}
        </div>
      )}

      {v.note && (
        <div style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Fra Ruben</span>
          <span style={{ fontSize: 16, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{v.note}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {v.canSwap && (
          <button onClick={() => setSwap('menu')} style={{ height: 50, border: 0, borderRadius: 14, background: 'var(--card)', boxShadow: 'var(--shadow)', color: 'var(--ink)', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}>
            Bytt økt
          </button>
        )}
        {v.canUndo && (
          <button onClick={undo} disabled={busy} style={{ height: 44, border: 0, background: 'none', color: 'var(--muted)', fontSize: 15, cursor: 'pointer' }}>
            Angre endring
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>Kommentarer</span>
        {thread.map((x) => (
          <div
            key={x.key}
            style={{
              alignSelf: x.sys ? 'center' : x.mine ? 'flex-end' : 'flex-start',
              maxWidth: '84%',
              background: x.sys ? 'transparent' : x.mine ? 'var(--ink)' : 'var(--card)',
              color: x.sys ? 'var(--muted)' : x.mine ? 'var(--bg)' : 'var(--ink)',
              boxShadow: x.sys || x.mine ? 'none' : 'var(--shadow)',
              padding: '10px 14px',
              borderRadius: 18,
              fontSize: x.sys ? 13 : 15,
              lineHeight: 1.4,
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
            }}
          >
            {x.text}
            <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 3 }}>{x.sys ? when(x.at) : `${x.mine ? 'Miguel' : 'Ruben'} · ${when(x.at)}`}</div>
          </div>
        ))}
        {!thread.length && <span style={{ fontSize: 15, color: 'var(--muted)' }}>Ingen kommentarer ennå.</span>}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            className="input"
            value={draft}
            maxLength={2000}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => ev.key === 'Enter' && send()}
            placeholder="Skriv til Ruben …"
            style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 999, padding: '12px 18px', fontSize: 16, minHeight: 44 }}
          />
          <button
            onClick={send}
            aria-label="Send"
            style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', border: 0, background: 'var(--ink)', color: 'var(--bg)', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
          >
            ↑
          </button>
        </div>
      </div>

      {swap && (
        <Sheet onClose={() => setSwap(null)} label="Bytt økt" gap={14}>
          <SheetHead
            title={swap === 'move' ? 'Flytt til' : swap === 'skip' ? 'Hvorfor?' : 'Bytt økt'}
            sub={swap === 'skip' ? 'Ruben får beskjed' : v.title}
            onClose={() => setSwap(null)}
          />
          {swap === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { t: 'Innendørsversjon', s: v.altText || 'Ruben har ikke lagt inn et alternativ', ok: !!v.altText, go: () => change('indoor') },
                { t: 'Flytt til annen dag', s: 'Denne uka', ok: moveDays.length > 0, go: () => setSwap('move') },
                { t: 'Kort versjon', s: '60 % av volumet', ok: true, go: () => change('shortened') },
                { t: 'Hopp over', s: 'Vær, syk, sliten, skade, ikke tid', ok: true, go: () => setSwap('skip') },
              ].map((o) => (
                <button key={o.t} className="swap-opt" disabled={!o.ok || busy} onClick={o.go} style={{ opacity: o.ok ? 1 : 0.4 }}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 17, fontWeight: 600 }}>{o.t}</span>
                    <span style={{ fontSize: 14, color: 'var(--muted)' }}>{o.s}</span>
                  </span>
                  <span style={{ fontSize: 20, color: 'var(--faint)' }}>›</span>
                </button>
              ))}
            </div>
          )}
          {swap !== 'menu' && (
            <>
              <div className="chips">
                {swap === 'move'
                  ? moveDays.map((i) => (
                      <button key={i} className="chip" disabled={busy} style={{ background: 'var(--row)', padding: '12px 18px', fontSize: 16, minHeight: 44 }} onClick={() => change('moved', { to_date: ymd(dateOf(w, i)) })}>
                        {SD[i]} {dateOf(w, i).getDate()}.
                      </button>
                    ))
                  : REASONS.map((r) => (
                      <button key={r} className="chip" disabled={busy} style={{ background: 'var(--row)', padding: '12px 18px', fontSize: 16, minHeight: 44 }} onClick={() => change('skipped', { reason: r })}>
                        {r}
                      </button>
                    ))}
              </div>
              <button className="back-link" onClick={() => setSwap('menu')}>
                ‹ Tilbake
              </button>
            </>
          )}
        </Sheet>
      )}

      {logOpen && (
        <StrengthLog
          plannedId={id}
          title={v.title}
          exercises={exs}
          onClose={() => setLogOpen(false)}
          onSaved={async () => {
            setLogOpen(false);
            await wk.reload();
          }}
        />
      )}
    </div>
  );
}
