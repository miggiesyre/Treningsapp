'use client';

import { useState } from 'react';
import { Chips, CloseBtn, Sheet, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { saveDraft, type Draft } from '@/lib/plan/actions';
import { useCoach } from '@/lib/plan/coach-data';
import { DAYS, dateOf, fmtD } from '@/lib/plan/dates';
import {
  KINDS,
  TARGETS,
  TDEF,
  defaultParts,
  exSum,
  exerciseNames,
  hm,
  measureDef,
  nf,
  partSum,
  partsTotal,
  range,
  targetDef,
  type BuiltExercise,
  type Part,
  type Target,
} from '@/lib/plan/library';
import { ICONS, SP, SPORTS } from '@/lib/plan/sports';

const WH = 132;

/** "Ny økt" builder (prototype: TRENER: BYGG ØKT). Endurance parts or strength exercises, all on wheels. */
export function Builder({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const { supabase, coachId, athleteId, templates } = useCoach();
  const toast = useToast();
  const [b, setB] = useState<Draft>(draft);
  const [openIdx, setOpenIdx] = useState<number | null>(draft.mode === 'new' && draft.sport !== 'strength' ? 1 : null);
  const [newEx, setNewEx] = useState('');
  const [busy, setBusy] = useState(false);
  const sp = b.sport;
  const st = sp === 'strength';
  const swim = sp === 'swim';
  const n = st ? b.exs.length : b.parts.length;

  const up = (o: Partial<Draft>) => setB((x) => ({ ...x, ...o }));
  const setPart = (i: number, o: Partial<Part>) => setB((x) => ({ ...x, parts: x.parts.map((p, j) => (j === i ? { ...p, ...o } : p)) }));
  const setX = (i: number, o: Partial<BuiltExercise>) => setB((x) => ({ ...x, exs: x.exs.map((p, j) => (j === i ? { ...p, ...o } : p)) }));
  const addEx = (name: string) => {
    setB((x) => ({ ...x, exs: [...x.exs, { name, sets: 3, reps: 8, rir: 2, rest: 90 }] }));
    setOpenIdx(b.exs.length);
    setNewEx('');
  };

  const save = async (target: 'day' | 'lib' | 'all') => {
    if (!n || busy) return;
    setBusy(true);
    try {
      const msg = await saveDraft(supabase, coachId, athleteId, b, target);
      toast(msg);
      onSaved();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  const c = SP[sp].c;
  const op = n ? 1 : 0.4;
  return (
    <Sheet onClose={onClose} label="Bygg økt" width={520} z={32}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 700, color: c }}>
            <SportIcon icon={ICONS[sp]} color={c} />
            {SP[sp].label}
          </span>
          <span style={{ fontSize: 24, fontWeight: 700 }}>{b.mode === 'edit' || b.id ? 'Endre økt' : 'Ny økt'}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{b.d != null && b.w != null ? `${DAYS[b.d]} ${fmtD(dateOf(b.w, b.d))} · Uke ${b.w}` : 'Mine økter'}</span>
        </span>
        <CloseBtn onClick={onClose} />
      </div>

      {b.mode === 'lib' && !b.id && (
        <div className="chips">
          <Chips
            options={SPORTS}
            value={sp}
            label={(k) => SP[k].label}
            onPick={(k) => {
              up({ sport: k, parts: k === 'strength' ? [] : defaultParts(k), exs: [] });
              setOpenIdx(k === 'strength' ? null : 1);
            }}
          />
        </div>
      )}

      <input className="input" value={b.name} onChange={(e) => up({ name: e.target.value })} placeholder="Navn på økta" maxLength={120} style={{ fontSize: 17, fontWeight: 600, minHeight: 50 }} />

      {!st && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="lbl">Deler</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Ca. {hm(partsTotal(b.parts, sp))} totalt</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {b.parts.map((p, i) => {
              const open = openIdx === i;
              const mv = measureDef(p.measure, sp);
              return (
                <div key={i} style={{ background: 'var(--row)', borderRadius: 14, overflow: 'hidden' }}>
                  <button onClick={() => setOpenIdx(open ? null : i)} aria-expanded={open} className="fold-btn">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: p.kind === 'Drag' ? c : 'var(--faint)' }} />
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{p.kind}</span>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{partSum(p, sp)}</span>
                    </span>
                    <span style={{ color: 'var(--faint)', fontSize: 16 }}>{open ? '⌃' : '⌄'}</span>
                  </button>
                  {open && (
                    <div style={{ padding: '0 14px 14px', display: 'grid', gap: 12 }}>
                      <div className="chips sm">
                        <Chips small off="var(--card2)" options={KINDS} value={p.kind} onPick={(k) => setPart(i, k === 'Pause' ? { kind: k, target: 'Ingen', tval: null, reps: 1, rest: 0 } : { kind: k })} />
                      </div>
                      <div className="chips sm">
                        <Chips
                          small
                          off="var(--card2)"
                          options={['Tid', 'Distanse'] as const}
                          value={p.measure === 'tid' ? 'Tid' : 'Distanse'}
                          onPick={(m) => setPart(i, { measure: m === 'Tid' ? 'tid' : 'dist', val: m === 'Tid' ? 10 : swim ? 400 : sp === 'bike' ? 20 : 2 })}
                        />
                        {p.kind !== 'Pause' && (
                          <>
                            <span style={{ width: 1, background: 'var(--line)', margin: '0 4px' }} />
                            <Chips small off="var(--card2)" options={TARGETS[sp]} value={p.target} onPick={(t: Target) => setPart(i, { target: t, tval: TDEF[t](sp) })} />
                          </>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10 }}>
                        <WheelBox label={mv.label ?? ''}>
                          <Wheel key={`v${p.measure}`} h={WH} values={mv.values} value={p.val} format={mv.fmt} unit={mv.unit} onChange={(v) => setPart(i, { val: v })} />
                        </WheelBox>
                        {p.target !== 'Ingen' && <TargetWheel key={`t${p.target}`} part={p} sport={sp} onChange={(v) => setPart(i, { tval: v })} />}
                        {p.reps > 1 && (
                          <>
                            <WheelBox label="Antall">
                              <Wheel h={WH} values={range(2, 30, 1)} value={p.reps} format={(v) => v + '×'} onChange={(v) => setPart(i, { reps: v })} />
                            </WheelBox>
                            <WheelBox label="Rolig mellom">
                              <Wheel h={WH} values={range(0, 10, 0.5)} value={p.rest} format={(v) => nf(v)} unit="min" onChange={(v) => setPart(i, { rest: v })} />
                            </WheelBox>
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {p.kind === 'Drag' && (
                          <button
                            onClick={() => setPart(i, p.reps > 1 ? { reps: 1, rest: 0 } : { reps: 4, rest: 2 })}
                            style={{ border: 0, background: 'var(--card2)', borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                          >
                            {p.reps > 1 ? 'Ikke gjenta' : 'Gjenta ×'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            up({ parts: b.parts.filter((_, j) => j !== i) });
                            setOpenIdx(null);
                          }}
                          style={{ border: 0, background: 'none', color: 'var(--bad)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 6px' }}
                        >
                          Fjern del
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <button
              className="dashed"
              onClick={() => {
                const t = TARGETS[sp][1] ?? 'Ingen';
                up({ parts: [...b.parts, { kind: 'Drag', measure: 'tid', val: 5, target: t, tval: TDEF[t](sp), reps: 1, rest: 0 }] });
                setOpenIdx(b.parts.length);
              }}
            >
              + Del
            </button>
          </div>
        </>
      )}

      {st && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="lbl">Øvelser</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{b.exs.length} øvelser</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {b.exs.map((x, i) => {
              const open = openIdx === i;
              return (
                <div key={i} style={{ background: 'var(--row)', borderRadius: 14, overflow: 'hidden' }}>
                  <button onClick={() => setOpenIdx(open ? null : i)} aria-expanded={open} className="fold-btn">
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{x.name}</span>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{exSum(x)}</span>
                    </span>
                    <span style={{ color: 'var(--faint)', fontSize: 16 }}>{open ? '⌃' : '⌄'}</span>
                  </button>
                  {open && (
                    <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 8 }}>
                        <WheelBox label="Sett">
                          <Wheel h={WH} values={range(1, 8, 1)} value={x.sets} onChange={(v) => setX(i, { sets: v })} />
                        </WheelBox>
                        <WheelBox label="Reps">
                          <Wheel h={WH} values={range(1, 30, 1)} value={x.reps} onChange={(v) => setX(i, { reps: v })} />
                        </WheelBox>
                        <WheelBox label="RiR">
                          <Wheel h={WH} values={range(0, 5, 1)} value={x.rir} onChange={(v) => setX(i, { rir: v })} />
                        </WheelBox>
                        <WheelBox label="Pause">
                          <Wheel h={WH} values={range(30, 300, 15)} value={x.rest} unit="s" onChange={(v) => setX(i, { rest: v })} />
                        </WheelBox>
                      </div>
                      <button
                        onClick={() => {
                          up({ exs: b.exs.filter((_, j) => j !== i) });
                          setOpenIdx(null);
                        }}
                        style={{ justifySelf: 'start', border: 0, background: 'none', color: 'var(--bad)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '6px 0' }}
                      >
                        Fjern øvelse
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Legg til øvelse</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 150, overflow: 'auto' }}>
            {exerciseNames(templates)
              .filter((nm) => !b.exs.some((x) => x.name === nm))
              .map((nm) => (
                <button key={nm} onClick={() => addEx(nm)} style={{ border: 0, background: 'var(--row)', borderRadius: 999, padding: '8px 12px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
                  + {nm}
                </button>
              ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              value={newEx}
              maxLength={80}
              onChange={(e) => setNewEx(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newEx.trim() && addEx(newEx.trim())}
              placeholder="Ny øvelse"
              style={{ borderRadius: 12, minHeight: 44 }}
            />
            <button
              onClick={() => newEx.trim() && addEx(newEx.trim())}
              style={{ border: 0, background: 'var(--card2)', borderRadius: 12, padding: '0 16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 44 }}
            >
              Legg til
            </button>
          </div>
        </>
      )}

      <div className="field">
        <span className="lbl">Valgfritt</span>
        <textarea className="textarea" value={b.note} onChange={(e) => up({ note: e.target.value })} rows={2} maxLength={1000} placeholder="Notat til Miguel" />
        <input className="input" value={b.alt} onChange={(e) => up({ alt: e.target.value })} maxLength={200} placeholder="Innendørsalternativ, f.eks. Trainer i Zwift" />
      </div>

      {b.mode === 'new' && (
        <div className="two" style={{ opacity: op }}>
          <button className="btn-row" disabled={busy || !n} onClick={() => save('day')}>
            Bare denne dagen
          </button>
          <button className="btn-ink" disabled={busy || !n} onClick={() => save('lib')}>
            Lagre i mine økter
          </button>
        </div>
      )}
      {b.mode === 'edit' && (
        <>
          <span className="lbl">Lagre for</span>
          <div className="two" style={{ opacity: op, marginTop: -8 }}>
            <button className="btn-row" disabled={busy || !n} onClick={() => save('day')}>
              Bare denne dagen
            </button>
            <button className="btn-ink" disabled={busy || !n} onClick={() => save('all')}>
              Alle kommende uker
            </button>
          </div>
        </>
      )}
      {b.mode === 'lib' && (
        <button className="btn-ink" disabled={busy || !n} onClick={() => save('lib')} style={{ fontSize: 17, opacity: op }}>
          Lagre i mine økter
        </button>
      )}
    </Sheet>
  );
}

function WheelBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="wheel-lbl">{label}</span>
      {children}
    </div>
  );
}

function TargetWheel({ part, sport, onChange }: { part: Part; sport: Draft['sport']; onChange: (v: number) => void }) {
  const tv = targetDefSafe(part.target, sport);
  if (!tv) return null;
  return (
    <WheelBox label={part.target}>
      <Wheel h={WH} values={tv.values} value={part.tval} format={tv.fmt} unit={tv.unit} onChange={onChange} />
    </WheelBox>
  );
}

const targetDefSafe = (t: Target, sp: Draft['sport']) => (t === 'Ingen' ? null : targetDef(t, sp));
