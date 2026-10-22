'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOpenSettings } from '@/components/app-shell';
import { LineChart } from '@/components/line-chart';
import { Chips, Sheet, SheetHead } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { weekEntries, weekVolume } from '@/lib/plan/athlete';
import { loadAthleteWeek, loadCheckins, type CiRow } from '@/lib/plan/athlete-actions';
import { usePlan } from '@/lib/plan/coach-data';
import { WEEKS, currentWeek, fmtD, parseYmd, today } from '@/lib/plan/dates';
import { nf, range } from '@/lib/plan/library';
import {
  INJ_COLOR,
  INJ_PARTS,
  INJ_STATUS,
  PACK_CATS,
  PACK_ST,
  deleteGear,
  deleteInjury,
  kr,
  loadGear,
  loadInjuries,
  loadTests,
  loadZones,
  saveGear,
  saveInjury,
  seedGear,
  setGearStatus,
  type Gear,
  type Injury,
  type Test,
} from '@/lib/plan/profile';
import { SP, type Sport } from '@/lib/plan/sports';

type Metric = 'ftp' | 'kg' | 'vo2' | 'sleep';
const short = (s: string) => fmtD(parseYmd(s));

/** "Progresjon": Plan (metrics, weekly volume, injuries) and Pakkeliste (prototype: PROGRESJON). */
export function Progress() {
  const openSettings = useOpenSettings();
  const [view, setView] = useState<'plan' | 'pack'>(() => {
    try {
      return sessionStorage.getItem('prog-view') === 'pack' ? 'pack' : 'plan';
    } catch {
      return 'plan';
    }
  });
  const pick = (v: 'plan' | 'pack') => {
    setView(v);
    try {
      sessionStorage.setItem('prog-view', v);
    } catch {}
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <h1 className="page-title">Progresjon</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/some?kind=plan" className="pill" style={{ textDecoration: 'none', color: 'var(--ink)', display: 'inline-flex', alignItems: 'center' }}>
            Del ↗
          </Link>
          <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
            <span />
          </button>
        </div>
      </div>
      <div className="seg-n" style={{ gridTemplateColumns: '1fr 1fr', maxWidth: 300, width: '100%' }}>
        <button aria-pressed={view === 'plan'} onClick={() => pick('plan')} style={{ padding: 8, fontSize: 14 }}>
          Plan
        </button>
        <button aria-pressed={view === 'pack'} onClick={() => pick('pack')} style={{ padding: 8, fontSize: 14 }}>
          Pakkeliste
        </button>
      </div>
      {view === 'plan' ? <PlanView /> : <PackView />}
    </div>
  );
}

function PlanView() {
  const { supabase, athleteId, loadWeek, byId, prog, settings, ready } = usePlan();
  const [metric, setMetric] = useState<Metric>('ftp');
  const [sport, setSport] = useState<Exclude<Sport, 'strength'>>('bike');
  const [tests, setTests] = useState<Test[]>([]);
  const [ci, setCi] = useState<CiRow[]>([]);
  const [ftpNow, setFtpNow] = useState<number | null>(null);
  const [vols, setVols] = useState<{ w: number; plan: Record<Sport, number>; act: Record<Sport, number> }[]>([]);
  const [inj, setInj] = useState<Injury[]>([]);
  const [injEdit, setInjEdit] = useState<Injury | 'new' | null>(null);
  const cw = currentWeek();
  const tw = today().w;
  const from = Math.max(1, Math.min(WEEKS - 7, cw - 6));
  const swimBack = settings?.swim_paused_until ? parseYmd(settings.swim_paused_until) : null;

  const loadInj = useCallback(async () => setInj(await loadInjuries(supabase, athleteId)), [supabase, athleteId]);
  useEffect(() => {
    (async () => {
      const [t, c, z] = await Promise.all([loadTests(supabase, athleteId), loadCheckins(supabase, athleteId), loadZones(supabase, athleteId)]);
      setTests(t);
      setCi(c);
      setFtpNow(z.ftp);
    })();
    loadInj();
  }, [supabase, athleteId, loadInj]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const ws = Array.from({ length: 8 }, (_, i) => from + i);
      const data = await Promise.all(ws.map((w) => loadAthleteWeek(supabase, loadWeek, w)));
      setVols(data.map((d, i) => ({ w: ws[i], ...weekVolume(weekEntries(ws[i], d, byId), prog[ws[i]] ?? {}, swimBack, d.own, d.activities) })));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, from, byId, prog]);

  const series = useMemo(() => {
    const asc = [...ci].sort((a, b) => a.date.localeCompare(b.date));
    const fromCi = (k: keyof CiRow, n: number) => {
      const m = new Map<string, number>();
      asc.forEach((r) => r[k] != null && m.set(r.date, Number(r[k])));
      return [...m.entries()].slice(-n).map(([d, v]) => [short(d), v] as [string, number]);
    };
    const ftp = tests.filter((t) => t.type === 'ftp').map((t) => [short(t.date), t.value] as [string, number]);
    const vo2 = new Map<string, number>();
    tests.filter((t) => t.type === 'vo2max').forEach((t) => vo2.set(t.date, t.value));
    asc.forEach((r) => r.vo2max != null && vo2.set(r.date, r.vo2max));
    return {
      ftp: ftp.length ? ftp : ftpNow ? ([['Nå', ftpNow]] as [string, number][]) : [],
      kg: fromCi('weight_kg', 30),
      vo2: [...vo2.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([d, v]) => [short(d), v] as [string, number]),
      sleep: fromCi('sleep_score', 14),
    };
  }, [tests, ci, ftpNow]);

  const set = {
    ftp: { u: 'W', f: (v: number) => String(Math.round(v)), c: 'var(--bike)' },
    kg: { u: 'kg', f: (v: number) => nf(v), c: 'var(--ink)' },
    vo2: { u: 'ml/kg/min', f: (v: number) => nf(v, 0), c: 'var(--run)' },
    sleep: { u: 'score', f: (v: number) => String(Math.round(v)), c: 'var(--swim)' },
  }[metric];
  const pts = series[metric];
  const first = pts[0];
  const last = pts[pts.length - 1];
  const delta = !last
    ? metric === 'ftp'
      ? 'Ruben legger inn FTP-tester'
      : 'Legg inn verdier i Dagens innsjekk'
    : metric === 'sleep'
      ? `Snitt ${pts.length} dager: ${Math.round(pts.reduce((a, b) => a + b[1], 0) / pts.length)}`
      : pts.length < 2
        ? `Fra ${last[0]}`
        : `${last[1] - first[1] >= 0 ? '+' : '−'}${set.f(Math.abs(last[1] - first[1]))} ${set.u} siden ${first[0]}`;

  const mx = Math.max(1, ...vols.map((v) => Math.max(v.plan[sport], v.act[sport]))) * 1.05;
  const prev = vols.find((v) => v.w === tw - 1);

  return (
    <>
      <div className="prog-cols">
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="seg-n" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
            {(
              [
                ['ftp', 'FTP'],
                ['kg', 'Vekt'],
                ['vo2', 'VO2 maks'],
                ['sleep', 'Søvn'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} aria-pressed={metric === k} onClick={() => setMetric(k)}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="big-num" style={{ fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {last ? set.f(last[1]) : '–'}
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--muted)', marginLeft: 5 }}>{set.u}</span>
            </span>
            <span style={{ fontSize: 14, color: 'var(--muted)' }}>{delta}</span>
          </div>
          <LineChart key={metric} pts={pts} fmt={set.f} color={set.c} />
        </div>

        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="h2">Volum per uke</span>
            <div className="seg-n" style={{ gridTemplateColumns: 'repeat(3,auto)' }}>
              {(['bike', 'run', 'swim'] as const).map((k) => (
                <button key={k} aria-pressed={sport === k} onClick={() => setSport(k)} style={{ padding: '6px 12px' }}>
                  {SP[k].label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gap: 6, height: 170, alignItems: 'end' }}>
            {vols.map((v) => (
              <div key={v.w} title={`Uke ${v.w}: plan ${nf(v.plan[sport])} km · faktisk ${nf(v.act[sport])} km`} style={{ height: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ width: '40%', maxWidth: 16, height: `${(v.plan[sport] / mx) * 100}%`, background: 'var(--card2)', borderRadius: 4 }} />
                <div style={{ width: '40%', maxWidth: 16, height: `${(v.act[sport] / mx) * 100}%`, background: SP[sport].c, borderRadius: 4 }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gap: 6, marginTop: -8 }}>
            {vols.map((v) => (
              <span key={v.w} style={{ textAlign: 'center', fontSize: 12, color: v.w === tw ? 'var(--ink)' : 'var(--muted)', fontWeight: v.w === tw ? 700 : 400 }}>
                U{v.w}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 13, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', gap: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--card2)' }} />
                Planlagt
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: SP[sport].c }} />
                Gjennomført
              </span>
            </span>
            <span>
              {sport === 'swim' && swimBack && new Date() < swimBack
                ? 'Pause – skulder til januar'
                : tw < 2
                  ? 'Planen startet 26. okt'
                  : prev
                    ? `Uke ${prev.w}: ${nf(prev.act[sport], 0)} av ${nf(prev.plan[sport], 0)} km`
                    : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="h2">Skadelogg</span>
          <button onClick={() => setInjEdit('new')} style={{ border: 0, background: 'var(--card2)', borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 36 }}>
            + Ny
          </button>
        </div>
        {inj.map((j) => (
          <button key={j.id} onClick={() => setInjEdit(j)} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 0', borderWidth: '1px 0 0', borderStyle: 'solid', borderColor: 'var(--line)', background: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{j.body_part}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: INJ_COLOR[j.status] }} />
                {j.status}
              </span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{short(j.date)}</span>
            {j.comment && <span style={{ fontSize: 15, lineHeight: 1.4 }}>{j.comment}</span>}
          </button>
        ))}
        {!inj.length && <span style={{ fontSize: 15, color: 'var(--muted)', padding: '10px 0' }}>Ingen skader. Bra!</span>}
      </div>
      {injEdit && <InjurySheet inj={injEdit === 'new' ? undefined : injEdit} onClose={() => setInjEdit(null)} onSaved={loadInj} />}
    </>
  );
}

function InjurySheet({ inj, onClose, onSaved }: { inj?: Injury; onClose: () => void; onSaved: () => void }) {
  const { supabase, athleteId } = usePlan();
  const toast = useToast();
  const known = INJ_PARTS as readonly string[];
  const [part, setPart] = useState<string | null>(inj ? (known.includes(inj.body_part) ? inj.body_part : 'Annet') : null);
  const [other, setOther] = useState(inj && !known.includes(inj.body_part) ? inj.body_part : '');
  const [status, setStatus] = useState<Injury['status'] | null>(inj?.status ?? null);
  const [comment, setComment] = useState(inj?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const ok = !!part && !!status;
  const run = async (fn: () => Promise<void>, msg: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast(msg);
      onSaved();
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };
  return (
    <Sheet onClose={onClose} label="Skade">
      <SheetHead title={inj ? 'Skade' : 'Ny skade'} sub="Ruben ser skadeloggen" onClose={onClose} />
      <span style={{ fontSize: 15, fontWeight: 600 }}>Kroppsdel</span>
      <div className="chips" style={{ marginTop: -6 }}>
        <Chips options={INJ_PARTS} value={part as (typeof INJ_PARTS)[number] | null} onPick={setPart} />
      </div>
      {part === 'Annet' && <input className="input" value={other} onChange={(e) => setOther(e.target.value)} maxLength={60} placeholder="Hvor?" />}
      <span style={{ fontSize: 15, fontWeight: 600 }}>Status</span>
      <div className="chips" style={{ marginTop: -6 }}>
        <Chips options={INJ_STATUS} value={status} onPick={setStatus} />
      </div>
      <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} placeholder="Kommentar (valgfritt)" />
      <button
        className="btn-ink"
        style={{ fontSize: 17, opacity: ok ? 1 : 0.4 }}
        disabled={!ok || busy}
        onClick={() =>
          run(
            () => saveInjury(supabase, athleteId, { id: inj?.id, body_part: part === 'Annet' && other.trim() ? other.trim() : part!, status: status!, comment: comment.trim() || null }),
            inj ? 'Lagret' : 'Lagt til i skadeloggen',
          )
        }
      >
        Lagre
      </button>
      {inj && (
        <button className="link-bad" disabled={busy} onClick={() => run(() => deleteInjury(supabase, inj.id), 'Slettet')}>
          Slett
        </button>
      )}
    </Sheet>
  );
}

// ---------- Pakkeliste ----------
function PackView() {
  const { supabase, athleteId } = usePlan();
  const toast = useToast();
  const [items, setItems] = useState<Gear[] | null>(null);
  const [filter, setFilter] = useState<'all' | Gear['status']>('all');
  const [edit, setEdit] = useState<Gear | 'new' | null>(null);
  const load = useCallback(async () => setItems(await loadGear(supabase, athleteId)), [supabase, athleteId]);
  useEffect(() => {
    load();
  }, [load]);

  if (!items) return <div className="skeleton" style={{ height: 120 }} />;
  const buy = items.filter((x) => x.status === 'Må kjøpe');
  const setSt = async (g: Gear, status: Gear['status']) => {
    setItems((xs) => xs!.map((x) => (x.id === g.id ? { ...x, status } : x)));
    try {
      await setGearStatus(supabase, g.id, status);
    } catch {
      toast('Ble ikke lagret');
      load();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 760, width: '100%' }}>
      <div className="card" style={{ padding: '16px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Må kjøpe før Jesolo</span>
          <span className="big-num" style={{ fontSize: 32, lineHeight: 1.1 }}>
            {kr(buy.reduce((a, x) => a + (x.price ?? 0), 0))}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {buy.length} ting · {buy.some((x) => !x.price) ? 'noen uten pris' : 'alle med pris'}
          </span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Pakket</span>
          <span className="big-num" style={{ fontSize: 22 }}>
            {items.filter((x) => x.status === 'Pakket').length} / {items.length}
          </span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {([['all', 'Alle'], ...PACK_ST.map((s) => [s.v, s.v])] as [typeof filter, string][]).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{ border: 0, background: filter === k ? 'var(--ink)' : 'var(--card)', color: filter === k ? 'var(--bg)' : 'var(--ink)', boxShadow: 'var(--shadow)', borderRadius: 999, padding: '8px 13px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 36, display: 'flex', gap: 6, alignItems: 'center' }}
          >
            {l}
            <span style={{ fontSize: 12, opacity: 0.6 }}>{k === 'all' ? items.length : items.filter((x) => x.status === k).length}</span>
          </button>
        ))}
        <button onClick={() => setEdit('new')} className="btn-ink" style={{ marginLeft: 'auto', height: 'auto', borderRadius: 999, padding: '8px 14px', fontSize: 14, minHeight: 36 }}>
          + Legg til
        </button>
      </div>
      {!items.length && (
        <div className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 15, color: 'var(--muted)' }}>Pakkelista er tom.</span>
          <button
            className="btn-row"
            onClick={async () => {
              try {
                await seedGear(supabase, athleteId);
                load();
              } catch {
                toast('Noe gikk galt – prøv igjen');
              }
            }}
          >
            Bruk standardlista for triatlon
          </button>
        </div>
      )}
      {PACK_CATS.map((c) => {
        const all = items.filter((x) => x.group_name === c);
        const its = all.filter((x) => filter === 'all' || x.status === filter);
        if (!its.length) return null;
        return (
          <div key={c} className="card" style={{ padding: '2px 16px 4px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '13px 0 9px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{c}</span>
              <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>
                {all.filter((x) => x.status !== 'Må kjøpe').length} / {all.length}
              </span>
            </div>
            {its.map((x) => (
              <div key={x.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <button onClick={() => setEdit(x)} style={{ border: 0, background: 'transparent', padding: '4px 0', textAlign: 'left', cursor: 'pointer', fontSize: 15.5, fontWeight: 600, color: x.status === 'Pakket' ? 'var(--muted)' : 'var(--ink)', minHeight: 30, overflowWrap: 'anywhere' }}>
                    {x.name}
                  </button>
                  {(x.price || x.link) && (
                    <span style={{ display: 'flex', gap: 8, fontSize: 12.5, color: 'var(--muted)', marginTop: -3 }}>
                      {x.price ? <span>{kr(x.price)}</span> : null}
                      {x.link && (
                        <a href={x.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--swim)', textDecoration: 'none', fontWeight: 600 }}>
                          Lenke ↗
                        </a>
                      )}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', background: 'var(--row)', borderRadius: 10, padding: 2, gap: 2 }}>
                  {PACK_ST.map((s) => (
                    <button
                      key={s.v}
                      onClick={() => setSt(x, s.v)}
                      aria-pressed={x.status === s.v}
                      style={{ border: 0, cursor: 'pointer', borderRadius: 8, padding: '7px 9px', fontSize: 12.5, fontWeight: 600, background: x.status === s.v ? s.bg : 'transparent', color: x.status === s.v ? '#141414' : 'var(--muted)', minHeight: 34 }}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
      {items.length > 0 && filter !== 'all' && !items.some((x) => x.status === filter) && <span style={{ textAlign: 'center', fontSize: 15, color: 'var(--muted)', padding: '24px 0' }}>Ingen ting her.</span>}
      {edit && <GearSheet g={edit === 'new' ? undefined : edit} onClose={() => setEdit(null)} onSaved={load} />}
    </div>
  );
}

function GearSheet({ g, onClose, onSaved }: { g?: Gear; onClose: () => void; onSaved: () => void }) {
  const { supabase, athleteId } = usePlan();
  const toast = useToast();
  const [name, setName] = useState(g?.name ?? '');
  const [cat, setCat] = useState<string>(g?.group_name ?? 'Svøm');
  const [status, setStatus] = useState<Gear['status']>(g?.status ?? 'Må kjøpe');
  const [price, setPrice] = useState(g?.price ?? 0);
  const [link, setLink] = useState(g?.link ?? '');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>, msg?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      if (msg) toast(msg);
      onSaved();
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };
  const save = () => {
    if (!name.trim()) return toast('Skriv inn navn');
    let l = link.trim();
    if (l && !/^https?:\/\//i.test(l)) l = 'https://' + l;
    run(() => saveGear(supabase, athleteId, { id: g?.id, group_name: cat, name: name.trim(), status, price: price || null, link: l || null }));
  };
  return (
    <Sheet onClose={onClose} label="Pakkeliste" width={440} gap={14}>
      <SheetHead title={g ? 'Rediger' : 'Ny ting'} onClose={onClose} />
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Hva skal med?" style={{ fontSize: 16 }} />
      <div className="chips">
        <Chips options={PACK_CATS} value={cat as (typeof PACK_CATS)[number]} onPick={setCat} />
      </div>
      <div className="seg-n" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', background: 'var(--row)' }}>
        {PACK_ST.map((s) => (
          <button key={s.v} aria-pressed={status === s.v} onClick={() => setStatus(s.v)} style={{ padding: '9px 4px', fontSize: 14, minHeight: 40 }}>
            {s.v}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="wheel-lbl">Pris (valgfritt)</span>
        <Wheel h={132} values={range(0, 5000, 10)} value={price} format={(v) => (v ? kr(v) : '–')} onChange={setPrice} />
      </div>
      <input className="input" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} inputMode="url" placeholder="Lenke (valgfritt)" style={{ fontSize: 16 }} />
      <button className="btn-ink" style={{ fontSize: 17 }} disabled={busy} onClick={save}>
        Lagre
      </button>
      {g && (
        <button className="link-bad" disabled={busy} onClick={() => run(() => deleteGear(supabase, g.id), 'Slettet')}>
          Slett
        </button>
      )}
    </Sheet>
  );
}
