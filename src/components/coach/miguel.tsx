'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageTitle } from '@/components/app-shell';
import { Sheet, SheetHead } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { ownTitle } from '@/components/athlete/own-sheet';
import { RACE } from '@/lib/plan/athlete';
import { loadCheckins, type CiRow } from '@/lib/plan/athlete-actions';
import { useCoach, type Own } from '@/lib/plan/coach-data';
import { SD, WEEKS, dateOf, fmtD, parseYmd, today, weekDay, ymd } from '@/lib/plan/dates';
import { hm, nf, pace, range } from '@/lib/plan/library';
import { INJ_COLOR, addTest, loadGoals, loadInjuries, loadTests, loadZones, saveGoal, type Goals, type Injury, type Test, type Zones } from '@/lib/plan/profile';
import { SP, TINT } from '@/lib/plan/sports';
import { when } from './edit-sheet';

type Comment = { id: string; author_id: string; body: string; created_at: string; planned_session_id: string };

const shortDate = (s: string) => fmtD(parseYmd(s));

/** "Miguel" for Ruben: zones, check-ins, tests, weekly goals, comments, own sessions, injuries. */
export function Miguel() {
  const { supabase, athleteId, coachId, byId } = useCoach();
  const toast = useToast();
  const [zones, setZones] = useState<Zones | null>(null);
  const [ci, setCi] = useState<CiRow[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [goals, setGoals] = useState<Goals>({});
  const [comments, setComments] = useState<(Comment & { title: string })[]>([]);
  const [own, setOwn] = useState<Own[]>([]);
  const [inj, setInj] = useState<Injury[]>([]);
  const [testOpen, setTestOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const load = useCallback(async () => {
    const [z, c, t, g, i, cm, o] = await Promise.all([
      loadZones(supabase, athleteId),
      loadCheckins(supabase, athleteId),
      loadTests(supabase, athleteId),
      loadGoals(supabase, athleteId),
      loadInjuries(supabase, athleteId),
      supabase.from('comments').select('id, author_id, body, created_at, planned_session_id').eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(8),
      supabase.from('own_sessions').select('id, date, sport, title, duration_min, distance_km, comment').eq('athlete_id', athleteId).order('date', { ascending: false }).limit(6),
    ]);
    const cms = (cm.data ?? []) as Comment[];
    const pids = [...new Set(cms.map((x) => x.planned_session_id))];
    const ps = pids.length ? ((await supabase.from('planned_sessions').select('id, date, template_id').in('id', pids)).data ?? []) : [];
    const pmap = Object.fromEntries(ps.map((p) => [p.id, p]));
    setZones(z);
    setCi(c);
    setTests(t);
    setGoals(g);
    setInj(i);
    setOwn((o.data ?? []) as Own[]);
    setComments(
      cms.map((x) => {
        const p = pmap[x.planned_session_id];
        const tp = p ? byId[p.template_id] : undefined;
        const wd = p ? weekDay(parseYmd(p.date)) : null;
        return { ...x, title: tp && wd ? `${tp.name} · ${SD[wd.d].toLowerCase()} uke ${wd.w}` : '' };
      }),
    );
  }, [supabase, athleteId, byId]);
  useEffect(() => {
    load();
  }, [load]);

  const t0 = new Date();
  const daysLeft = Math.round((RACE.getTime() - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()).getTime()) / 864e5);
  const latest = (k: keyof CiRow) => {
    const r = ci.find((x) => x[k] != null);
    return r ? { v: Number(r[k]), date: r.date } : null;
  };
  const ciTiles = [
    { label: 'Vekt', k: 'weight_kg' as const, u: 'kg', f: (v: number) => nf(v) },
    { label: 'Søvnscore', k: 'sleep_score' as const, u: '', f: (v: number) => String(Math.round(v)) },
    { label: 'Søvn', k: 'sleep_hours' as const, u: 't', f: (v: number) => nf(v) },
    { label: 'VO2 maks', k: 'vo2max' as const, u: 'ml/kg', f: (v: number) => String(Math.round(v)) },
  ];
  const zn = [
    { label: 'Maks puls', v: zones?.max_hr, u: 'bpm' },
    { label: 'Hvilepuls', v: zones?.resting_hr, u: 'bpm' },
    { label: 'FTP', v: zones?.ftp, u: 'W' },
    { label: 'Terskelpace', v: zones?.threshold_pace_s, u: '/km', f: pace },
    { label: 'VO2 maks', v: zones?.vo2max, u: 'ml/kg/min' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 820 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageTitle title="Miguel" />
        <span style={{ fontSize: 15, color: 'var(--muted)' }}>Ironman 70.3 Venice-Jesolo · {daysLeft} dager igjen</span>
      </div>

      <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <span className="h2">Soner</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{zones?.updated_at ? `Sist oppdatert ${fmtD(new Date(zones.updated_at))}` : ''}</span>
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 12 }}>
          {zn.map((z) => (
            <span key={z.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{z.label}</span>
              <span className="big-num" style={{ fontSize: 20 }}>
                {z.v == null ? '–' : z.f ? z.f(z.v) : z.v}
                {z.v != null && <span className="unit" style={{ fontSize: 12 }}>{z.u}</span>}
              </span>
            </span>
          ))}
        </div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="h2">Innsjekk</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
          {ciTiles.map((c) => {
            const l = latest(c.k);
            return (
              <div key={c.k} className="card" style={{ borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{c.label}</span>
                <span className="big-num" style={{ fontSize: 28 }}>
                  {l ? c.f(l.v) : '–'}
                  {l && <span className="unit">{c.u}</span>}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{l ? shortDate(l.date) : 'Ikke lagt inn'}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="h2">Tester</span>
          <button className="pill" style={{ padding: '8px 14px', fontSize: 14, minHeight: 36 }} onClick={() => setTestOpen(true)}>
            + Ny test
          </button>
        </div>
        <div className="card" style={{ padding: '2px 18px' }}>
          {tests
            .slice()
            .reverse()
            .slice(0, 8)
            .map((t) => (
              <div key={t.id} className="list-row">
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{t.type === 'ftp' ? 'FTP-test' : 'VO2 maks'}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {shortDate(t.date)}
                    {t.source === 'checkin' ? ' · fra innsjekk' : ''}
                  </span>
                </span>
                <span className="big-num" style={{ fontSize: 20 }}>
                  {nf(t.value)} {t.type === 'ftp' ? 'W' : 'ml/kg/min'}
                </span>
              </div>
            ))}
          {!tests.length && <div style={{ padding: '16px 0', fontSize: 15, color: 'var(--muted)' }}>Ingen tester ennå.</div>}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="h2">Ukentlige mål</span>
          <button className="pill" style={{ padding: '8px 14px', fontSize: 14, minHeight: 36 }} onClick={() => setGoalsOpen(true)}>
            Endre
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
          {(['bike', 'run', 'swim'] as const).map((k) => (
            <div key={k} style={{ background: TINT(SP[k].c), boxShadow: 'var(--shadow)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: SP[k].c }}>{SP[k].label}</span>
              <span className="big-num" style={{ fontSize: 26 }}>
                {goals[k] != null ? nf(goals[k]!) : '–'}
                <span className="unit">km/uke</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="h2">Kommentarer</span>
        <div className="card" style={{ padding: '2px 18px' }}>
          {comments.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '13px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, color: 'var(--muted)' }}>
                <span>
                  {c.author_id === coachId ? 'Du' : 'Miguel'}
                  {c.title ? ` · ${c.title}` : ''}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>{when(c.created_at)}</span>
              </span>
              <span style={{ fontSize: 15, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.body}</span>
            </div>
          ))}
          {!comments.length && <div style={{ padding: '16px 0', fontSize: 15, color: 'var(--muted)' }}>Ingen kommentarer ennå.</div>}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="h2">Egne økter</span>
        <div className="card" style={{ padding: '2px 18px' }}>
          {own.map((o) => (
            <div key={o.id} className="list-row">
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{ownTitle(o)}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{[o.duration_min ? hm(o.duration_min) : '', o.comment].filter(Boolean).join(' · ')}</span>
              </span>
              <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{shortDate(o.date)}</span>
            </div>
          ))}
          {!own.length && <div style={{ padding: '16px 0', fontSize: 15, color: 'var(--muted)' }}>Ingen egne økter.</div>}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="h2">Skadelogg</span>
        <div className="card" style={{ padding: '2px 18px' }}>
          {inj.map((j, i) => (
            <div key={j.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '13px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{j.body_part}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: INJ_COLOR[j.status] }} />
                  {j.status}
                </span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{shortDate(j.date)}</span>
              {j.comment && <span style={{ fontSize: 15, lineHeight: 1.4 }}>{j.comment}</span>}
            </div>
          ))}
          {!inj.length && <div style={{ padding: '16px 0', fontSize: 15, color: 'var(--muted)' }}>Ingen skader registrert.</div>}
        </div>
      </section>

      {testOpen && (
        <TestSheet
          onClose={() => setTestOpen(false)}
          last={tests}
          onSave={async (type, value, date) => {
            try {
              await addTest(supabase, athleteId, type, value, date);
              toast('Test lagret');
              setTestOpen(false);
              load();
            } catch {
              toast('Noe gikk galt – prøv igjen');
            }
          }}
        />
      )}
      {goalsOpen && (
        <GoalsSheet
          goals={goals}
          onClose={() => {
            setGoalsOpen(false);
            load();
          }}
          onSave={async (sport, km) => {
            try {
              await saveGoal(supabase, athleteId, sport, km);
            } catch {
              toast('Målet ble ikke lagret');
            }
          }}
        />
      )}
    </div>
  );
}

function TestSheet({ last, onClose, onSave }: { last: Test[]; onClose: () => void; onSave: (t: Test['type'], v: number, date: string) => Promise<void> }) {
  const [type, setType] = useState<Test['type']>('ftp');
  const lastOf = (t: Test['type']) => [...last].reverse().find((x) => x.type === t)?.value;
  const [val, setVal] = useState(lastOf('ftp') ?? 246);
  const [week, setWeek] = useState(Math.max(0, Math.min(WEEKS, today().w)));
  const [busy, setBusy] = useState(false);
  const isF = type === 'ftp';
  const dateFor = (w: number) => (w === today().w || w < 1 ? ymd(new Date()) : ymd(dateOf(w, 0)));
  return (
    <Sheet onClose={onClose} label="Ny test" width={440}>
      <SheetHead title="Ny test" onClose={onClose} />
      <div className="seg-n" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {(['ftp', 'vo2max'] as const).map((t) => (
          <button
            key={t}
            aria-pressed={type === t}
            onClick={() => {
              setType(t);
              setVal(lastOf(t) ?? (t === 'ftp' ? 246 : 52));
            }}
          >
            {t === 'ftp' ? 'FTP' : 'VO2 maks'}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="wheel-lbl">{isF ? 'FTP (W)' : 'VO2 maks (ml/kg/min)'}</span>
          <Wheel key={type} values={isF ? range(150, 400, 1) : range(30, 80, 1)} value={val} onChange={setVal} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="wheel-lbl">Uke</span>
          <Wheel values={range(0, WEEKS, 1)} value={week} format={(v) => (v < 1 ? 'Før' : 'U' + v)} onChange={setWeek} />
        </div>
      </div>
      <button
        className="btn-ink"
        style={{ fontSize: 17 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSave(type, val, dateFor(week));
          setBusy(false);
        }}
      >
        Lagre test
      </button>
    </Sheet>
  );
}

function GoalsSheet({ goals, onClose, onSave }: { goals: Goals; onClose: () => void; onSave: (s: 'bike' | 'run' | 'swim', km: number) => Promise<void> }) {
  return (
    <Sheet onClose={onClose} label="Ukentlige mål" width={480}>
      <div className="sheet-head">
        <span className="sheet-title">Ukentlige mål</span>
        <button className="sheet-done" onClick={onClose}>
          Ferdig
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
        {(
          [
            ['bike', range(0, 500, 10), 200],
            ['run', range(0, 100, 1), 30],
            ['swim', range(0, 20, 0.5), 4],
          ] as const
        ).map(([k, values, def]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: SP[k].c }}>{SP[k].label}</span>
            <Wheel values={[...values]} value={goals[k] ?? def} format={(v) => nf(v)} unit="km" onChange={(v) => onSave(k, v)} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}

