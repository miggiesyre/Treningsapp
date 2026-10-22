'use client';

import { useCallback, useEffect, useState } from 'react';
import { Chips, CloseBtn, Sheet, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { addComment, removeSession, saveEdit, type Draft } from '@/lib/plan/actions';
import { DECISION_TEXT } from '@/lib/plan/changes';
import { useCoach, type Change, type Planned } from '@/lib/plan/coach-data';
import { DAYS, SD, dateOf, fmtD, parseYmd, weekDay } from '@/lib/plan/dates';
import { ALT, mainOf, type BuiltExercise } from '@/lib/plan/library';
import { ICONS, SP } from '@/lib/plan/sports';

type Msg = { id: string; author_id: string; body: string; created_at: string };

const CHANGE_TEXT: Record<Change['kind'], string> = {
  skipped: 'hoppet over økta',
  indoor: 'byttet til innendørsversjon',
  shortened: 'valgte kort versjon',
  moved: 'flyttet økta',
};

export const when = (iso: string) => {
  const t = new Date(iso);
  const hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return t.toDateString() === new Date().toDateString() ? hm : `${fmtD(t)} ${hm}`;
};

/** Session edit panel (prototype: TRENER: ØKTREDIGERING). Docks right on desktop. */
export function EditSheet({
  planned,
  w,
  changes,
  onClose,
  onSaved,
  onEditContent,
}: {
  planned: Planned;
  w: number;
  changes: Change[];
  onClose: () => void;
  onSaved: () => void;
  onEditContent: (d: Draft) => void;
}) {
  const { supabase, athleteId, coachId, byId, prog, reloadProg, reloadTemplates } = useCoach();
  const toast = useToast();
  const t = byId[planned.template_id];
  const d = weekDay(parseYmd(planned.date)).d;
  const m = mainOf(t);
  const p = prog[w] ?? {};
  const [val, setVal] = useState<number | null>(m ? (planned.value_override ?? p[m.k] ?? null) : null);
  const [inc, setInc] = useState(0);
  const [note, setNote] = useState(planned.note_override ?? t.note ?? '');
  const [alt, setAlt] = useState(planned.indoor_alt_override ?? t.indoor_alt ?? '');
  const [moveTo, setMoveTo] = useState(d);
  const [showC, setShowC] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const loadMsgs = useCallback(async () => {
    const { data } = await supabase.from('comments').select('id, author_id, body, created_at').eq('planned_session_id', planned.id).order('created_at');
    setMsgs((data ?? []) as Msg[]);
  }, [supabase, planned.id]);
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

  const alts: string[] = [];
  [alt, ...(ALT[t.sport] ?? []), ''].forEach((a) => !alts.includes(a) && alts.push(a));

  const thread = [
    ...changes.map((c) => ({ key: 'c' + c.created_at, sys: true, mine: false, text: `Miguel ${CHANGE_TEXT[c.kind]}${c.reason ? ' · ' + c.reason : ''}`, at: c.created_at })),
    ...changes
      .filter((c) => c.decided_at)
      .map((c) => ({ key: 'd' + c.id, sys: true, mine: false, text: `Du: ${c.coach_decision ? DECISION_TEXT[c.coach_decision] : 'OK'}`, at: c.decided_at! })),
    ...msgs.map((x) => ({ key: x.id, sys: false, mine: x.author_id === coachId, text: x.body, at: x.created_at })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const save = async (scope: 'day' | 'all') => {
    if (busy) return;
    setBusy(true);
    try {
      await saveEdit(supabase, athleteId, scope, { planned, template: t, w, d, moveTo, main: m, prog: p, val, inc, note, alt });
      await Promise.all([reloadProg(), scope === 'all' ? reloadTemplates() : null]);
      toast(scope === 'all' ? 'Lagret for alle kommende uker' : 'Lagret for denne dagen');
      onSaved();
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await removeSession(supabase, planned.id);
      toast('Fjernet');
      onSaved();
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      await addComment(supabase, athleteId, coachId, planned.id, body);
      await loadMsgs();
    } catch {
      setDraft(body);
      toast('Kommentaren ble ikke sendt');
    }
  };

  const c = SP[t.sport].c;
  return (
    <Sheet onClose={onClose} label="Rediger økt" dock gap={18}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: c }}>
            <SportIcon icon={ICONS[t.sport]} color={c} />
            {SP[t.sport].label} · {t.tag ?? (t.builtin ? '' : 'Egen økt')}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}>{t.name}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>
            {DAYS[d]} {fmtD(dateOf(w, d))} · Uke {w}
          </span>
        </span>
        <CloseBtn onClick={onClose} />
      </div>

      {m && (
        <>
          <div className="field">
            <span className="lbl">
              {m.label} · uke {w}
            </span>
            <Wheel values={m.values} value={val} format={m.fmt} unit={m.unit} onChange={setVal} />
          </div>
          <div className="field">
            <span className="lbl">Øk hver uke med</span>
            <div className="chips">
              <Chips options={m.incs} value={inc} onPick={setInc} label={(i) => (i === 0 ? 'Ingen' : m.incFmt(i))} />
            </div>
            {inc !== 0 && w < 23 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Fyller uke {w + 1}–23 automatisk. Du kan fortsatt endre enkeltuker.</span>}
          </div>
        </>
      )}

      <div className="field">
        <span className="lbl">Notat til Miguel</span>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
      </div>

      {alts.length > 1 && (
        <div className="field">
          <span className="lbl">Innendørsalternativ</span>
          <div className="chips">
            <Chips options={alts} value={alt} onPick={setAlt} label={(a) => a || 'Ingen'} />
          </div>
        </div>
      )}

      <div className="field">
        <span className="lbl">Dag</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4 }}>
          {SD.map((nm, i) => (
            <button
              key={nm}
              aria-pressed={moveTo === i}
              onClick={() => setMoveTo(i)}
              style={{ border: 0, background: moveTo === i ? 'var(--ink)' : 'var(--row)', color: moveTo === i ? 'var(--bg)' : 'var(--ink)', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {nm}
            </button>
          ))}
        </div>
      </div>

      <button className="row-btn" onClick={() => setShowC(!showC)} aria-expanded={showC}>
        Kommentarer ({thread.length})<span style={{ color: 'var(--faint)', fontSize: 18 }}>{showC ? '⌃' : '⌄'}</span>
      </button>
      {showC && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {thread.map((x) => (
            <div
              key={x.key}
              style={{
                alignSelf: x.sys ? 'center' : x.mine ? 'flex-end' : 'flex-start',
                maxWidth: '84%',
                background: x.sys ? 'transparent' : x.mine ? 'var(--ink)' : 'var(--card2)',
                color: x.sys ? 'var(--muted)' : x.mine ? 'var(--bg)' : 'var(--ink)',
                padding: '10px 14px',
                borderRadius: 18,
                fontSize: x.sys ? 13 : 15,
                lineHeight: 1.4,
                overflowWrap: 'anywhere',
                whiteSpace: 'pre-wrap',
              }}
            >
              {x.text}
              <div style={{ fontSize: 11.5, opacity: 0.65, marginTop: 3 }}>{x.sys ? when(x.at) : `${x.mine ? 'Ruben' : 'Miguel'} · ${when(x.at)}`}</div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Skriv til Miguel …"
              style={{ borderRadius: 999, padding: '12px 18px', minHeight: 44 }}
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
      )}

      {!t.builtin && (
        <button
          className="row-btn"
          onClick={() =>
            onEditContent({
              mode: 'edit',
              sport: t.sport,
              id: t.id,
              plannedId: planned.id,
              w,
              d,
              name: t.name,
              parts: t.parts.map((x) => ({ ...x })),
              exs: (t.exercises as BuiltExercise[]).map((x) => ({ ...x })),
              note: t.note ?? '',
              alt: t.indoor_alt ?? '',
            })
          }
        >
          Endre innhold<span style={{ color: 'var(--faint)', fontSize: 18 }}>›</span>
        </button>
      )}

      <span className="lbl">Lagre for</span>
      <div className="two" style={{ marginTop: -8 }}>
        <button className="btn-row" disabled={busy} onClick={() => save('day')}>
          Bare denne dagen
        </button>
        <button className="btn-ink" disabled={busy} onClick={() => save('all')}>
          Alle kommende uker
        </button>
      </div>
      <button className="link-bad" disabled={busy} onClick={remove}>
        Fjern fra uka
      </button>
    </Sheet>
  );
}
