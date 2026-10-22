'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useOpenSettings } from '@/components/app-shell';
import { SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { RACE } from '@/lib/plan/athlete';
import { usePlan } from '@/lib/plan/coach-data';
import { DAYS, PLAN_START, WEEKS, fmtD, osloDate, parseYmd, today, ymd } from '@/lib/plan/dates';
import { hm, nf, pace } from '@/lib/plan/library';
import { ICONS, SP, TINT, type Sport } from '@/lib/plan/sports';
import { drawCard, renderPng, type Bg, type Card, type Stat } from '@/lib/some/draw';

type Act = { key: string; date: string; title: string; sport: string; km: number; min: number; watt: number | null; hr: number | null; elev: number };

const daysLeft = () => {
  const t = new Date();
  return Math.max(0, Math.round((RACE.getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5));
};

/** "SoMe": pick sessions → story/post image for Instagram and TikTok (prototype: SOME). */
export function Some() {
  const { supabase, athleteId } = usePlan();
  const openSettings = useOpenSettings();
  const [acts, setActs] = useState<Act[] | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState<'pick' | 'edit'>('pick');
  const [kind, setKind] = useState<'acts' | 'plan'>('acts');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('kind') === 'plan') {
      setKind('plan');
      setStep('edit');
    }
  }, []);

  useEffect(() => {
    (async () => {
      const since = new Date(Math.min(Date.now() - 60 * 864e5, PLAN_START.getTime()));
      const [a, o] = await Promise.all([
        supabase
          .from('activities')
          .select('id, name, sport, start_time, distance_m, duration_s, avg_power, avg_hr, elevation_m')
          .eq('athlete_id', athleteId)
          .gte('start_time', since.toISOString())
          .order('start_time', { ascending: false })
          .limit(200),
        supabase.from('own_sessions').select('id, date, sport, title, duration_min, distance_km').eq('athlete_id', athleteId).gte('date', ymd(since)).order('date', { ascending: false }),
      ]);
      const list: Act[] = [
        ...(a.data ?? []).map((x) => ({
          key: 'a' + x.id,
          date: osloDate(x.start_time),
          title: x.name || 'Aktivitet',
          sport: x.sport ?? 'other',
          km: Number(x.distance_m ?? 0) / 1000,
          min: (x.duration_s ?? 0) / 60,
          watt: x.avg_power,
          hr: x.avg_hr,
          elev: x.elevation_m ?? 0,
        })),
        ...(o.data ?? []).map((x) => ({
          key: 'o' + x.id,
          date: x.date,
          title: x.title || (x.sport in SP ? `Egen ${SP[x.sport as Sport].label.toLowerCase()}økt` : 'Annet'),
          sport: x.sport,
          km: Number(x.distance_km ?? 0),
          min: x.duration_min ?? 0,
          watt: null,
          hr: null,
          elev: 0,
        })),
      ].filter((x) => x.date <= ymd(new Date()));
      list.sort((p, q) => q.date.localeCompare(p.date));
      setActs(list);
    })();
  }, [supabase, athleteId]);

  const picked = (acts ?? []).filter((a) => sel[a.key]);

  if (step === 'edit') return <Editor kind={kind} picked={picked} all={acts ?? []} onBack={() => setStep('pick')} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 className="page-title">SoMe</h1>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>Velg én eller flere økter. Flere økter slås sammen.</span>
        </span>
        <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
          <span />
        </button>
      </div>
      <div className="chips sm">
        {[
          {
            t: 'Siste dag',
            go: () => {
              if (!acts?.length) return;
              const d = acts[0].date;
              setSel(Object.fromEntries(acts.filter((a) => a.date === d).map((a) => [a.key, true])));
            },
          },
          {
            t: 'Siste 7 dager',
            go: () => {
              const lim = ymd(new Date(Date.now() - 6 * 864e5));
              setSel(Object.fromEntries((acts ?? []).filter((a) => a.date >= lim).map((a) => [a.key, true])));
            },
          },
          { t: 'Nullstill', go: () => setSel({}) },
        ].map((q) => (
          <button key={q.t} className="pill" style={{ padding: '8px 14px', fontSize: 14, minHeight: 0 }} onClick={q.go}>
            {q.t}
          </button>
        ))}
      </div>
      <div className="card" style={{ padding: '2px 16px' }}>
        {acts?.map((a, i) => {
          const on = !!sel[a.key];
          const sp = a.sport in SP ? (a.sport as Sport) : null;
          const c = sp ? SP[sp].c : 'var(--muted)';
          const d = parseYmd(a.date);
          return (
            <button
              key={a.key}
              onClick={() => setSel((s) => ({ ...s, [a.key]: !s[a.key] }))}
              aria-pressed={on}
              style={{ width: '100%', border: 0, background: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--line)' : 'none', cursor: 'pointer', textAlign: 'left', minHeight: 56 }}
            >
              <span style={{ width: 24, height: 24, flexShrink: 0, borderRadius: '50%', border: `2px solid ${on ? 'var(--ink)' : 'var(--faint)'}`, background: on ? 'var(--ink)' : 'transparent', color: 'var(--bg)', fontSize: 13, fontWeight: 700, display: 'grid', placeItems: 'center', boxSizing: 'border-box' }}>
                {on ? '✓' : ''}
              </span>
              <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: sp ? TINT(c) : 'var(--card2)', display: 'grid', placeItems: 'center' }}>
                <SportIcon icon={sp ? ICONS[sp] : ICONS.other} color={c} size={18} />
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{[`${DAYS[(d.getDay() + 6) % 7].slice(0, 3)} ${fmtD(d)}`, a.km ? `${nf(a.km)} km` : '', a.min ? hm(a.min) : ''].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          );
        })}
        {acts && !acts.length && <div style={{ padding: '18px 0', fontSize: 15, color: 'var(--muted)', lineHeight: 1.4 }}>Ingen økter ennå. Koble til Strava under Innstillinger, eller del planen under.</div>}
        {!acts && <div style={{ padding: '18px 0', fontSize: 15, color: 'var(--muted)' }}>Henter økter …</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 14, color: 'var(--muted)', alignItems: 'center' }}>
        <span>Eller del:</span>
        <button
          onClick={() => {
            setKind('plan');
            setStep('edit');
          }}
          style={{ border: 0, background: 'none', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', padding: '6px 4px' }}
        >
          Mot Jesolo – planen hittil
        </button>
      </div>
      <div className="some-next">
        <button
          className="btn-ink"
          disabled={!picked.length}
          onClick={() => {
            setKind('acts');
            setStep('edit');
          }}
          style={{ width: '100%', height: 54, borderRadius: 16, fontSize: 17, fontWeight: 700, opacity: picked.length ? 1 : 0.4, boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}
        >
          {picked.length ? `Lag bilde av ${picked.length} ${picked.length === 1 ? 'økt' : 'økter'}` : 'Velg økter'}
        </button>
      </div>
    </div>
  );
}

function cardData(kind: 'acts' | 'plan', picked: Act[], all: Act[]) {
  const dl = `${daysLeft()} DAGER TIL JESOLO`;
  if (kind === 'plan') {
    const since = ymd(PLAN_START);
    const done = all.filter((a) => a.date >= since);
    const km = done.reduce((s, a) => s + a.km, 0);
    const h = done.reduce((s, a) => s + a.min, 0) / 60;
    const w = today().w;
    const items: (Stat & { k: string })[] = [
      { k: 'km', label: 'Km siden start', val: nf(km, 0), unit: 'km' },
      { k: 'hours', label: 'Timer trent', val: nf(h, 0), unit: 't' },
      { k: 'sess', label: 'Økter', val: String(done.length), unit: '' },
      { k: 'bike', label: 'Sykkel', val: nf(done.filter((a) => a.sport === 'bike').reduce((s, a) => s + a.km, 0), 0), unit: 'km' },
      { k: 'run', label: 'Løp', val: nf(done.filter((a) => a.sport === 'run').reduce((s, a) => s + a.km, 0), 0), unit: 'km' },
    ];
    return { title: 'Mot Jesolo', sub: w < 1 ? 'Planen starter 26. oktober' : `Uke ${Math.min(WEEKS, w)} av ${WEEKS}`, items, dl, defOn: ['km', 'hours', 'sess'] };
  }
  const km = picked.reduce((s, a) => s + a.km, 0);
  const min = picked.reduce((s, a) => s + a.min, 0);
  const bikeMin = picked.filter((a) => a.watt).reduce((s, a) => s + a.min, 0);
  const watt = bikeMin ? Math.round(picked.filter((a) => a.watt).reduce((s, a) => s + a.watt! * a.min, 0) / bikeMin) : null;
  const runs = picked.filter((a) => a.sport === 'run' && a.km);
  const runKm = runs.reduce((s, a) => s + a.km, 0);
  const paceS = runKm ? (runs.reduce((s, a) => s + a.min, 0) * 60) / runKm : null;
  const hrMin = picked.filter((a) => a.hr).reduce((s, a) => s + a.min, 0);
  const hr = hrMin ? Math.round(picked.filter((a) => a.hr).reduce((s, a) => s + a.hr! * a.min, 0) / hrMin) : null;
  const elev = picked.reduce((s, a) => s + a.elev, 0);
  const dates = picked.map((a) => a.date).sort();
  const same = dates.length > 0 && dates[0] === dates[dates.length - 1];
  const sports = new Set(picked.map((a) => a.sport));
  const title = picked.length === 1 ? picked[0].title : same && sports.has('bike') && sports.has('run') ? 'Brick' : `${picked.length} økter`;
  const d0 = dates.length ? parseYmd(dates[0]) : null;
  const sub = !d0 ? '' : same ? `${DAYS[(d0.getDay() + 6) % 7]} ${fmtD(d0)}` : `${fmtD(d0)} – ${fmtD(parseYmd(dates[dates.length - 1]))}`;
  const items: (Stat & { k: string })[] = [
    ...(km > 0 ? [{ k: 'km', label: 'Distanse', val: nf(km), unit: 'km' }] : []),
    { k: 'time', label: 'Tid', val: hm(min), unit: '' },
    ...(watt ? [{ k: 'watt', label: 'Snittwatt', val: String(watt), unit: 'W' }] : []),
    ...(paceS ? [{ k: 'pace', label: 'Snittempo', val: pace(paceS), unit: '/km' }] : []),
    ...(km > 0 && min > 0 ? [{ k: 'speed', label: 'Snittfart', val: nf(km / (min / 60)), unit: 'km/t' }] : []),
    ...(hr ? [{ k: 'hr', label: 'Snittpuls', val: String(hr), unit: 'bpm' }] : []),
    ...(elev > 0 ? [{ k: 'elev', label: 'Høydemeter', val: nf(elev, 0), unit: 'm' }] : []),
  ];
  return { title, sub, items, dl, defOn: ['km', 'time', 'watt', 'pace', 'hr'] };
}

function Editor({ kind, picked, all, onBack }: { kind: 'acts' | 'plan'; picked: Act[]; all: Act[]; onBack: () => void }) {
  const toast = useToast();
  const D = useMemo(() => cardData(kind, picked, all), [kind, picked, all]);
  const [fmt, setFmt] = useState<'story' | 'post'>('story');
  const [bg, setBg] = useState<Bg>('night');
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries([...D.defOn, 'days'].map((k) => [k, true])));
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 1080;
  const H = fmt === 'story' ? 1920 : 1350;
  const slab = useMemo(() => {
    if (typeof window === 'undefined') return 'Georgia, serif';
    const v = getComputedStyle(document.documentElement).getPropertyValue('--font-slab').trim();
    return v ? `${v}, Georgia, serif` : 'Georgia, serif';
  }, []);
  const card: Card = { title: D.title, sub: D.sub, stats: D.items.filter((i) => on[i.k]), days: on.days ? D.dl : '', bg };

  useEffect(() => {
    const draw = () => {
      const cv = ref.current;
      if (cv) drawCard(cv.getContext('2d')!, W, H, card, slab);
    };
    draw();
    document.fonts?.ready.then(draw);
  });

  const out = async (mode: 'share' | 'save') => {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await renderPng(W, H, card, slab);
      if (!blob) throw new Error();
      const file = new File([blob], `ironman-${fmt}.png`, { type: 'image/png' });
      if (mode === 'share' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'IRONMAN' });
        } catch (e) {
          if ((e as Error)?.name !== 'AbortError') throw e;
        }
      } else {
        const u = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = u;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 5000);
        toast(mode === 'share' ? 'Deling er ikke tilgjengelig her – bildet er lagret' : 'Bildet er lagret');
      }
    } catch {
      toast('Kunne ikke lage bildet');
    }
    setBusy(false);
  };

  const toggles = [...D.items.map((i) => ({ k: i.k, label: i.label, val: `${i.val}${i.unit ? ' ' + i.unit : ''}` })), { k: 'days', label: 'Dager til Jesolo', val: D.dl.toLowerCase() }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
      <button className="back-link" style={{ fontSize: 17, color: 'var(--ink)', alignSelf: 'flex-start' }} onClick={onBack}>
        ‹ Tilbake
      </button>
      <div className="some-edit">
        <div className="some-preview" style={{ background: bg === 'none' ? 'repeating-conic-gradient(#bdb6aa 0% 25%, #d9d3c8 0% 50%) 0 0 / 20px 20px' : 'transparent' }}>
          <canvas ref={ref} width={W} height={H} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 18, boxShadow: 'var(--shadow)' }} aria-label="Forhåndsvisning av bildet" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="field">
            <span className="lbl">Format</span>
            <div className="seg-n" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button aria-pressed={fmt === 'story'} onClick={() => setFmt('story')}>
                Story 9:16
              </button>
              <button aria-pressed={fmt === 'post'} onClick={() => setFmt('post')}>
                Innlegg 4:5
              </button>
            </div>
          </div>
          <div className="field">
            <span className="lbl">Bakgrunn</span>
            <div className="seg-n" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
              {(
                [
                  ['night', 'Natt'],
                  ['cream', 'Krem'],
                  ['navy', 'Navy'],
                  ['none', 'Ingen'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} aria-pressed={bg === k} onClick={() => setBg(k)}>
                  {l}
                </button>
              ))}
            </div>
            {bg === 'none' && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Gjennomsiktig – legg bildet oppå et eget foto i Instagram.</span>}
          </div>
          <div className="field">
            <span className="lbl">Innhold</span>
            <div className="card" style={{ padding: '2px 14px' }}>
              {toggles.map((g, i) => (
                <button
                  key={g.k}
                  onClick={() => setOn((o) => ({ ...o, [g.k]: !o[g.k] }))}
                  aria-pressed={!!on[g.k]}
                  style={{ width: '100%', border: 0, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderTop: i ? '1px solid var(--line)' : 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{g.label}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g.val}</span>
                  </span>
                  <span style={{ width: 42, height: 26, borderRadius: 13, background: on[g.k] ? 'var(--ok)' : 'var(--card2)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                    <span style={{ position: 'absolute', top: 2, left: 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: on[g.k] ? 'translateX(16px)' : 'none', transition: 'transform .15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="two">
            <button className="btn-row" disabled={busy} onClick={() => out('save')}>
              Lagre bilde
            </button>
            <button className="btn-ink" disabled={busy} onClick={() => out('share')}>
              Del ↗
            </button>
          </div>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center' }}>På iPhone: Del → Instagram → Historie, eller TikTok.</span>
        </div>
      </div>
    </div>
  );
}
