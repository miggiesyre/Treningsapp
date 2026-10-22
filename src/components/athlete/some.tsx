'use client';

import { Component, createRef, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { useOpenSettings } from '@/components/app-shell';
import { SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { RACE } from '@/lib/plan/athlete';
import { loadCheckins } from '@/lib/plan/athlete-actions';
import { usePlan } from '@/lib/plan/coach-data';
import { DAYS, PLAN_START, SD, WEEKS, fmtD, osloDate, parseYmd, today, ymd } from '@/lib/plan/dates';
import { hm, nf, pace } from '@/lib/plan/library';
import { ICONS, SP, TINT, type Sport } from '@/lib/plan/sports';
import { EL_NAMES, INKS, SOME_FMT, SOME_TPL, autoInk, bgColor, lum, mkScene, renderScene, sceneBlob, sceneVideo, setFonts } from '@/lib/some/scene';

/* eslint-disable @typescript-eslint/no-explicit-any */
type El = any;
type Opts = { bg: string; ink: string; paper: string; paperInk: string; prText: string };
type Act = { key: string; actId: string | null; date: string; title: string; sport: string; km: number; min: number; watt: number | null; hr: number | null; elev: number };
type Item = { k: string; label: string; val: string; unit: string };
type Src = { kind: 'acts' | 'plan' };
type Fmt = keyof typeof SOME_FMT;
type Ov = Record<string, { dx: number; dy: number; s: number }>;

const daysLeft = () => {
  const t = new Date();
  return Math.max(0, Math.round((RACE.getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 864e5));
};

/** "SoMe": pick sessions → share card editor (prototype: SOME: VELG + SOME: REDIGER). */
export function Some() {
  const { supabase, athleteId } = usePlan();
  const openSettings = useOpenSettings();
  const [acts, setActs] = useState<Act[] | null>(null);
  const [common, setCommon] = useState<Item[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [src, setSrc] = useState<Src | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('kind') === 'plan') setSrc({ kind: 'plan' });
  }, []);

  useEffect(() => {
    (async () => {
      const since = new Date(Math.min(Date.now() - 60 * 864e5, PLAN_START.getTime()));
      const [a, o, ci] = await Promise.all([
        supabase
          .from('activities')
          .select('id, source, name, sport, start_time, distance_m, duration_s, avg_power, avg_hr, elevation_m')
          .eq('athlete_id', athleteId)
          .gte('start_time', since.toISOString())
          .order('start_time', { ascending: false })
          .limit(300),
        supabase.from('own_sessions').select('id, date, sport, title, duration_min, distance_km').eq('athlete_id', athleteId).gte('date', ymd(since)).order('date', { ascending: false }),
        loadCheckins(supabase, athleteId),
      ]);
      const list: Act[] = [
        ...(a.data ?? []).map((x) => ({
          key: 'a' + x.id,
          actId: x.source === 'strava' ? x.id : null,
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
          actId: null,
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
      const latest = (k: 'weight_kg' | 'vo2max' | 'sleep_score') => ci.find((r) => r[k] != null)?.[k] ?? null;
      const plan = list.filter((x) => x.date >= ymd(PLAN_START));
      const w = latest('weight_kg');
      const v = latest('vo2max');
      const sl = latest('sleep_score');
      setCommon([
        ...(w != null ? [{ k: 'weight', label: 'Vekt', val: nf(Number(w)), unit: 'kg' }] : []),
        ...(v != null ? [{ k: 'vo2', label: 'VO2 maks', val: nf(Number(v), 0), unit: '' }] : []),
        ...(sl != null ? [{ k: 'sleep', label: 'Søvnscore', val: String(sl), unit: '' }] : []),
        { k: 'swimH', label: 'Svømmetimer', val: nf(plan.filter((x) => x.sport === 'swim').reduce((s, x) => s + x.min, 0) / 60), unit: 't' },
        { k: 'totalKm', label: 'Km siden start', val: nf(plan.reduce((s, x) => s + x.km, 0), 0), unit: 'km' },
      ]);
    })();
  }, [supabase, athleteId]);

  const picked = (acts ?? []).filter((a) => sel[a.key]);

  if (src) return <Editor src={src} picked={picked} common={common} onBack={() => setSrc(null)} />;

  const n = picked.length;
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
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{[`${SD[(d.getDay() + 6) % 7]} ${fmtD(d)}`, a.km ? `${nf(a.km)} km` : '', a.min ? hm(a.min) : ''].filter(Boolean).join(' · ')}</span>
              </span>
            </button>
          );
        })}
        {acts && !acts.length && <div style={{ padding: '18px 0', fontSize: 15, color: 'var(--muted)', lineHeight: 1.4 }}>Ingen fullførte økter ennå. Legg til en egen økt, eller del planen under.</div>}
        {!acts && <div style={{ padding: '18px 0', fontSize: 15, color: 'var(--muted)' }}>Henter økter …</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 14, color: 'var(--muted)', alignItems: 'center' }}>
        <span>Eller del:</span>
        <button onClick={() => setSrc({ kind: 'plan' })} style={{ border: 0, background: 'none', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', padding: '6px 4px' }}>
          Planen hittil
        </button>
      </div>
      <div className="some-next">
        <button
          className="btn-ink"
          disabled={!n}
          onClick={() => setSrc({ kind: 'acts' })}
          style={{ width: '100%', height: 54, borderRadius: 16, fontSize: 17, fontWeight: 700, opacity: n ? 1 : 0.4, boxShadow: '0 8px 24px rgba(0,0,0,.25)' }}
        >
          {n ? `Lag bilde av ${n} ${n === 1 ? 'økt' : 'økter'}` : 'Velg økter'}
        </button>
      </div>
    </div>
  );
}

/** Card data (prototype: someData). */
function someData(src: Src, picked: Act[], common: Item[]) {
  const dl = `${daysLeft()} DAGER TIL JESOLO`;
  if (src.kind === 'plan') {
    const w = today().w;
    return { title: 'Mot Jesolo', sub: w < 1 ? 'Planen starter 26. oktober' : `Uke ${Math.min(WEEKS, w)} av ${WEEKS}`, items: common, daysText: dl, word: 'TRENING', defOn: ['weight', 'vo2', 'sleep', 'totalKm', 'days'] };
  }
  const km = picked.reduce((s, a) => s + a.km, 0);
  const min = picked.reduce((s, a) => s + a.min, 0);
  const sports = [...new Set(picked.map((a) => a.sport))];
  const bikes = picked.filter((a) => a.sport === 'bike' && a.watt);
  const runs = picked.filter((a) => a.sport === 'run' && a.km);
  const watt = sports.length === 1 && bikes.length ? Math.round(bikes.reduce((s, a) => s + a.watt! * a.min, 0) / bikes.reduce((s, a) => s + a.min, 0)) : null;
  const paceSec = sports.length === 1 && runs.length ? Math.round(runs.reduce((s, a) => s + a.min * 60, 0) / runs.reduce((s, a) => s + a.km, 0)) : null;
  const hrs = picked.filter((a) => a.hr);
  const hrMin = hrs.reduce((s, a) => s + a.min, 0);
  const hr = hrMin ? Math.round(hrs.reduce((s, a) => s + a.hr! * a.min, 0) / hrMin) : null;
  const elev = picked.reduce((s, a) => s + a.elev, 0);
  const dates = picked.map((a) => a.date).sort();
  const same = !!dates.length && dates[0] === dates[dates.length - 1];
  const title = picked.length === 1 ? picked[0].title : same && sports.includes('bike') && sports.includes('run') ? 'Brick' : `${picked.length} økter`;
  const d0 = dates.length ? parseYmd(dates[0]) : null;
  const sub = !d0 ? '' : same ? `${DAYS[(d0.getDay() + 6) % 7]} ${fmtD(d0)}` : `${fmtD(d0)} – ${fmtD(parseYmd(dates[dates.length - 1]))}`;
  const items: Item[] = [
    ...(km > 0 ? [{ k: 'km', label: 'Distanse', val: nf(km), unit: 'km' }] : []),
    { k: 'time', label: 'Tid', val: hm(min), unit: '' },
    ...(watt || paceSec ? [{ k: 'eff', label: watt ? 'Snittwatt' : 'Snittempo', val: watt ? String(watt) : pace(paceSec!), unit: watt ? 'W' : '/km' }] : []),
    ...(km > 0 && min > 0 ? [{ k: 'speed', label: 'Snittfart', val: nf(km / (min / 60)), unit: 'km/t' }] : []),
    ...(hr ? [{ k: 'hr', label: 'Snittpuls', val: String(hr), unit: 'bpm' }] : []),
    ...(elev > 0 ? [{ k: 'elev', label: 'Høydemeter', val: nf(elev, 0), unit: 'm' }] : []),
    ...common,
  ];
  const WORD: Record<string, string> = { swim: 'SVØMMING', bike: 'SYKKEL', run: 'LØPING', strength: 'STYRKE' };
  const word = sports.length === 1 ? WORD[sports[0]] ?? 'TRENING' : sports.includes('bike') && sports.includes('run') ? 'BRICK' : 'TRENING';
  return { title, sub, items, daysText: dl, word, defOn: ['km', 'time', 'eff', 'hr', 'days'] };
}

function Editor({ src, picked, common, onBack }: { src: Src; picked: Act[]; common: Item[]; onBack: () => void }) {
  const toast = useToast();
  const D = useMemo(() => someData(src, picked, common), [src, picked, common]);
  const [fmt, setFmt] = useState<Fmt>('story');
  const [tpl, setTpl] = useState('badge');
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(D.defOn.map((k) => [k, true])));
  const [bg, setBg] = useState('cream');
  const [ink, setInk] = useState('auto');
  const [custom, setCustom] = useState('#3E5C6E');
  const [ov, setOv] = useState<Ov>({});
  const [order, setOrder] = useState<string[] | null>(null);
  const [selEl, setSelEl] = useState<string | null>(null);
  const [panel, setPanel] = useState<'format' | 'mal' | 'innhold' | 'farger' | 'lag'>('mal');
  const [out, setOut] = useState<'png' | 'video' | 'both'>('png');
  const [playKey, setPlayKey] = useState(0);
  const [busy, setBusy] = useState('');
  const [route, setRoute] = useState<number[][] | null>(null);
  const [fontsReady, setFontsReady] = useState(0);
  const cache = useRef<{ sig: string; files: File[] } | null>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    setFonts();
    document.fonts?.ready.then(() => {
      setFonts();
      setFontsReady((n) => n + 1);
    });
    const mq = window.matchMedia('(min-width: 900px)');
    const f = () => setWide(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  // The real GPS route of the first Strava session, for the "Rute" template.
  const routeId = src.kind === 'acts' ? (picked.find((a) => a.actId && (a.sport === 'bike' || a.sport === 'run'))?.actId ?? null) : null;
  useEffect(() => {
    if (!routeId) return;
    fetch(`/api/strava/route?id=${routeId}`)
      .then((r) => r.json())
      .then((j) => setRoute(j.pts ?? null))
      .catch(() => setRoute(null));
  }, [routeId]);

  const tpls = SOME_TPL.filter(([k]) => k !== 'route' || route);
  const F = SOME_FMT[fmt];
  const W = F.W;
  const H = F.H;
  const inkC = ink === 'auto' ? autoInk(bg) : ink;
  const paper = bg === 'navy' ? '#24384A' : '#FBF8F1';
  const paperInk = lum(paper) > 0.5 ? (lum(inkC) > 0.6 ? '#3E5C6E' : inkC) : lum(inkC) < 0.45 ? '#F2EEE6' : inkC;
  const o: Opts = { bg, ink: inkC, paper, paperInk, prText: bgColor(bg) || (lum(inkC) > 0.5 ? '#1B2A33' : '#F2EEE6') };
  const dd = { title: D.title, sub: D.sub, word: D.word, stats: D.items.filter((i) => on[i.k]), zones: null, pr: false, days: on.days ? D.daysText : '', route };
  const ordered = (els: El[]) => {
    if (!order) return els;
    const ix = (id: string) => {
      const i = order.indexOf(id);
      return i < 0 ? 999 : i;
    };
    return els.slice().sort((a, b) => ix(a.id) - ix(b.id));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = useMemo(() => mkScene(tpl, W, H, dd), [tpl, W, H, JSON.stringify(dd), fontsReady]);
  const els: El[] = ordered(base).map((e: El) => ({ ...e, ...(ov[e.id] || {}) }));
  const ids = els.map((e) => e.id);
  const mv = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const o2 = ids.slice();
    [o2[i], o2[j]] = [o2[j], o2[i]];
    setOrder(o2);
  };
  const resetLayout = () => {
    setOv({});
    setOrder(null);
    setSelEl(null);
  };

  const exportFiles = async (mode: 'ig' | 'snap' | 'save' | 'more') => {
    if (busy) return;
    const sig = JSON.stringify([W, H, out, o, els.map((e) => [e.id, e.x, e.y, e.dx, e.dy, e.s, e.p?.text, e.p?.items?.length])]);
    const deliver = async (files: File[]) => {
      if (mode !== 'save' && navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, title: 'IRONMAN' });
          return;
        } catch (e) {
          if ((e as Error)?.name === 'AbortError') return;
          if ((e as Error)?.name === 'NotAllowedError') {
            toast('Filen er klar – trykk igjen for å dele');
            return;
          }
        }
      }
      files.forEach((f) => {
        const u = URL.createObjectURL(f);
        const a = document.createElement('a');
        a.href = u;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(u), 5000);
      });
      toast(mode === 'save' ? 'Lagret' : 'Deling ikke tilgjengelig her – lagret i stedet');
    };
    if (cache.current?.sig === sig) return deliver(cache.current.files);
    const files: File[] = [];
    try {
      if (out !== 'video') {
        setBusy('Lager bilde …');
        const b = (await sceneBlob(W, H, els, o)) as Blob | null;
        if (b) files.push(new File([b], 'ironman.png', { type: 'image/png' }));
      }
      if (out !== 'png') {
        setBusy('Lager video … (5 s)');
        const v = (await sceneVideo(W, H, els, o)) as { blob: Blob; ext: string; type: string } | null;
        if (v) files.push(new File([v.blob], 'ironman.' + v.ext, { type: v.type }));
        else toast('Video støttes ikke i denne nettleseren');
      }
      cache.current = { sig, files };
      setBusy('');
      if (files.length) {
        if (mode === 'ig') toast('Velg Instagram → Historie');
        if (mode === 'snap') toast('Velg Snapchat i menyen');
        await deliver(files);
      }
    } catch {
      setBusy('');
      toast('Kunne ikke lage filen');
    }
  };

  const phv = wide ? 'min(72vh, 700px)' : '46vh';
  const checker = bg === 'none' ? 'repeating-conic-gradient(#bdb6aa 0% 25%, #d9d3c8 0% 50%) 0 0 / 20px 20px' : 'transparent';
  const toggles = [
    ...D.items.map((i) => ({ k: i.k, label: i.label, val: `${i.val}${i.unit ? ' ' + i.unit : ''}` })),
    { k: 'days', label: 'Dager til Jesolo', val: D.daysText.toLowerCase() },
  ];

  return (
    <div className="some-grid" style={{ gridTemplateColumns: wide ? 'minmax(0,1fr) 380px' : 'minmax(0,1fr)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 10 }}>
          <button onClick={onBack} style={{ border: 0, background: 'none', color: 'var(--ink)', fontSize: 16, padding: '6px 0', cursor: 'pointer' }}>
            ‹ {src.kind === 'acts' ? 'Velg økter' : 'Tilbake'}
          </button>
          <button
            className="pill"
            style={{ padding: '8px 14px', fontSize: 14, minHeight: 0 }}
            onClick={() => {
              setSelEl(null);
              setPlayKey((k) => k + 1);
            }}
          >
            ▶ Spill av
          </button>
        </div>
        <div style={{ width: `min(100%, calc(${phv} * ${(W / H).toFixed(4)}))`, aspectRatio: `${W} / ${H}`, borderRadius: 14, overflow: 'hidden', background: checker, boxShadow: '0 10px 36px rgba(0,0,0,.28)' }}>
          <SoMeCanvas key={'ed' + fmt} W={W} H={H} els={els} o={o} sel={selEl} playKey={playKey} onSelect={setSelEl} onCommit={(id, v) => setOv((x) => ({ ...x, [id]: v }))} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--muted)' }}>
          <span>{selEl ? `${(EL_NAMES as Record<string, string>)[selEl] || selEl} · dra eller klyp` : 'Trykk et element for å flytte det'}</span>
          {selEl && (
            <button onClick={() => setSelEl(null)} style={{ border: 0, background: 'none', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', padding: 4 }}>
              Ferdig
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div className="seg-n" style={{ gridTemplateColumns: 'repeat(5,minmax(0,1fr))', borderRadius: 12, padding: 3 }}>
          {(
            [
              ['format', 'Format'],
              ['mal', 'Mal'],
              ['innhold', 'Innhold'],
              ['farger', 'Farger'],
              ['lag', 'Lag'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} aria-pressed={panel === k} onClick={() => setPanel(k)} style={{ padding: '9px 2px' }}>
              {l}
            </button>
          ))}
        </div>

        {panel === 'format' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
            {(Object.keys(SOME_FMT) as Fmt[]).map((k) => {
              const f = SOME_FMT[k];
              const s = 26 / Math.max(f.W, f.H);
              return (
                <button
                  key={k}
                  onClick={() => {
                    setFmt(k);
                    resetLayout();
                  }}
                  style={{ border: fmt === k ? '2px solid var(--ink)' : '1px solid var(--line)', background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 14, padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                >
                  <span style={{ height: 30, display: 'grid', placeItems: 'center' }}>
                    <span style={{ width: f.W * s, height: f.H * s, border: '2px solid var(--ink)', borderRadius: 3, display: 'block' }} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.l}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: -6 }}>{f.r}</span>
                </button>
              );
            })}
          </div>
        )}

        {panel === 'mal' && (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', padding: '4px 2px 8px' }}>
            {tpls.map(([k, l]) => {
              const tw = W > H ? 190 : 108;
              return (
                <button
                  key={k}
                  onClick={() => {
                    setTpl(k);
                    resetLayout();
                  }}
                  style={{ flex: '0 0 auto', scrollSnapAlign: 'start', border: 0, background: 'none', display: 'flex', flexDirection: 'column', gap: 7, alignItems: 'center', cursor: 'pointer', padding: 2 }}
                >
                  <span style={{ width: tw, height: Math.round((tw * H) / W), borderRadius: 10, overflow: 'hidden', outline: tpl === k ? '3px solid var(--ink)' : '1px solid var(--line)', outlineOffset: 2, display: 'block', background: checker }}>
                    <Thumb tpl={k} W={W} H={H} d={dd} o={o} tw={tw} v={fontsReady} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
                </button>
              );
            })}
          </div>
        )}

        {panel === 'innhold' && (
          <div className="card" style={{ borderRadius: 16, padding: '0 14px' }}>
            {toggles.map((g, i) => (
              <button
                key={g.k}
                onClick={() => setOn((x) => ({ ...x, [g.k]: !x[g.k] }))}
                aria-pressed={!!on[g.k]}
                style={{ width: '100%', border: 0, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderTop: i ? '1px solid var(--line)' : 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{g.label}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.val}</span>
                </span>
                <span style={{ width: 44, height: 26, borderRadius: 13, background: on[g.k] ? 'var(--ok)' : 'var(--card2)', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                  <span style={{ position: 'absolute', top: 2, left: 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transform: on[g.k] ? 'translateX(18px)' : 'none', transition: 'transform .2s' }} />
                </span>
              </button>
            ))}
          </div>
        )}

        {panel === 'farger' && (
          <>
            <span className="lbl">Bakgrunn</span>
            <div className="seg-n" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', marginTop: -6 }}>
              {(
                [
                  ['cream', 'Krem'],
                  ['navy', 'Navy'],
                  ['anim', 'Animert'],
                  ['none', 'Transparent'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} aria-pressed={bg === k} onClick={() => setBg(k)} style={{ padding: '9px 2px' }}>
                  {l}
                </button>
              ))}
            </div>
            <span className="lbl">Farge på kortet</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: -6 }}>
              {[{ t: 'Auto', c: 'var(--card)', fg: 'var(--ink)', k: 'auto' }, ...INKS.map((c: string) => ({ t: '', c, fg: 'transparent', k: c }))].map((d) => (
                <button
                  key={d.k}
                  onClick={() => setInk(d.k)}
                  aria-label={d.k === 'auto' ? 'Automatisk farge' : `Farge ${d.k}`}
                  aria-pressed={ink === d.k}
                  style={{ width: 38, height: 38, borderRadius: '50%', background: d.c, border: ink === d.k ? '3px solid var(--ink)' : '1px solid var(--line)', color: d.fg, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', padding: 0, boxSizing: 'border-box' }}
                >
                  {d.t}
                </button>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer' }}>
                <input
                  type="color"
                  value={custom}
                  onChange={(e) => {
                    setCustom(e.target.value);
                    setInk(e.target.value);
                  }}
                  style={{ width: 38, height: 38, border: 0, padding: 0, borderRadius: '50%', background: 'none', cursor: 'pointer' }}
                />
                Egen
              </label>
            </div>
          </>
        )}

        {panel === 'lag' && (
          <>
            <div className="card" style={{ borderRadius: 16, padding: '0 6px 0 14px' }}>
              {els
                .map((e, i) => ({ id: e.id as string, i }))
                .reverse()
                .map((l, j) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderTop: j ? '1px solid var(--line)' : 'none' }}>
                    <button onClick={() => setSelEl(l.id)} style={{ flex: 1, textAlign: 'left', border: 0, background: selEl === l.id ? 'var(--card2)' : 'transparent', borderRadius: 8, padding: '9px 8px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                      {(EL_NAMES as Record<string, string>)[l.id] || l.id}
                    </button>
                    <button onClick={() => mv(l.i, 1)} title="Opp" aria-label="Flytt opp" style={{ width: 36, height: 36, border: 0, background: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--muted)' }}>
                      ↑
                    </button>
                    <button onClick={() => mv(l.i, -1)} title="Ned" aria-label="Flytt ned" style={{ width: 36, height: 36, border: 0, background: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--muted)' }}>
                      ↓
                    </button>
                  </div>
                ))}
            </div>
            <button className="pill" style={{ alignSelf: 'flex-start', padding: '9px 16px', fontSize: 14 }} onClick={resetLayout}>
              Tilbakestill
            </button>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6, borderTop: '1px solid var(--line)' }}>
          <div className="seg-n" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 8 }}>
            {(
              [
                ['png', 'Bilde'],
                ['video', 'Video'],
                ['both', 'Begge'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} aria-pressed={out === k} onClick={() => setOut(k)} style={{ padding: '9px 4px', fontSize: 14 }}>
                {l}
              </button>
            ))}
          </div>
          {bg === 'none' && out !== 'png' && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Transparent video lagres som WebM (Chrome). På iPhone får videoen bakgrunn.</span>}
          <div className="two" style={{ opacity: busy ? 0.5 : 1 }}>
            <button className="btn-ink" style={{ height: 50, fontSize: 15, fontWeight: 700 }} onClick={() => exportFiles('ig')}>
              Instagram-historie
            </button>
            <button onClick={() => exportFiles('snap')} style={{ height: 50, border: 0, borderRadius: 14, background: '#FFFC00', color: '#111', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Snapchat
            </button>
            <button className="btn-row" style={{ height: 50, fontSize: 15, background: 'var(--card)', boxShadow: 'var(--shadow)' }} onClick={() => exportFiles('save')}>
              Lagre
            </button>
            <button className="btn-row" style={{ height: 50, fontSize: 15, background: 'var(--card)', boxShadow: 'var(--shadow)' }} onClick={() => exportFiles('more')}>
              Mer ↗
            </button>
          </div>
          {busy && <span style={{ textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>{busy}</span>}
        </div>
      </div>
    </div>
  );
}

function Thumb({ tpl, W, H, d, o, tw, v }: { tpl: string; W: number; H: number; d: unknown; o: Opts; tw: number; v: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (c) renderScene(c.getContext('2d'), W, H, mkScene(tpl, W, H, d), o, 99, null, (tw * 2) / W);
  });
  return <canvas ref={ref} width={tw * 2} height={Math.round((tw * 2 * H) / W)} style={{ width: '100%', height: '100%', display: 'block' }} data-v={v} />;
}

type CanvasProps = { W: number; H: number; els: El[]; o: Opts; sel: string | null; playKey: number; onSelect: (id: string | null) => void; onCommit: (id: string, v: { dx: number; dy: number; s: number }) => void };
type Pt = { x: number; y: number };
type Live = { id: string; dx: number; dy: number; s: number };
type Mode =
  | { type: 'pinch'; id: string; d0: number; s0: number }
  | { type: 'resize'; id: string; s0: number; r0: number; cx: number; cy: number }
  | { type: 'drag'; id: string; p0: Pt; dx0: number; dy0: number }
  | null;

/** Interactive card: tap to select, drag to move, pinch or corner-drag to scale (prototype: SoMeEditor). */
class SoMeCanvas extends Component<CanvasProps> {
  ref = createRef<HTMLCanvasElement>();
  ptrs = new Map<number, Pt>();
  live: Live | null = null;
  mode: Mode = null;
  raf = 0;
  playing = false;

  componentDidMount() {
    this.draw();
    this.ref.current?.addEventListener('wheel', this.onWheel, { passive: false });
    document.fonts?.ready.then(() => this.draw());
  }
  componentWillUnmount() {
    cancelAnimationFrame(this.raf);
    this.ref.current?.removeEventListener('wheel', this.onWheel);
  }
  componentDidUpdate(pp: CanvasProps) {
    if (this.props.playKey && pp.playKey !== this.props.playKey) this.play();
    else if (!this.playing) this.draw();
  }
  els() {
    const L = this.live;
    return L ? this.props.els.map((e) => (e.id === L.id ? { ...e, dx: L.dx, dy: L.dy, s: L.s } : e)) : this.props.els;
  }
  draw(t?: number) {
    const c = this.ref.current;
    if (!c) return;
    renderScene(c.getContext('2d'), this.props.W, this.props.H, this.els(), this.props.o, t == null ? 99 : t, t == null ? this.props.sel : null, 1);
  }
  play() {
    cancelAnimationFrame(this.raf);
    this.playing = true;
    const t0 = performance.now();
    const loop = () => {
      const t = (performance.now() - t0) / 1000;
      this.draw(t);
      if (t < 5.4) this.raf = requestAnimationFrame(loop);
      else {
        this.playing = false;
        this.draw();
      }
    };
    this.raf = requestAnimationFrame(loop);
  }
  pt(e: { clientX: number; clientY: number }): Pt {
    const r = this.ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * this.props.W) / r.width, y: ((e.clientY - r.top) * this.props.H) / r.height };
  }
  cur(id: string) {
    const e = this.props.els.find((x) => x.id === id);
    return e ? { dx: e.dx || 0, dy: e.dy || 0, s: e.s || 1, el: e } : null;
  }
  hit(p: Pt) {
    const els = this.props.els;
    for (let i = els.length - 1; i >= 0; i--) {
      const e = els[i];
      const s = e.s || 1;
      const cx = e.x + (e.dx || 0);
      const cy = e.y + (e.dy || 0);
      if (Math.abs(p.x - cx) <= (e.w * s) / 2 + 12 && Math.abs(p.y - cy) <= (e.h * s) / 2 + 12) return e.id as string;
    }
    return null;
  }
  onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    const p = this.pt(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    this.ptrs.set(e.pointerId, p);
    const sel = this.props.sel;
    const u = Math.min(this.props.W, this.props.H) / 1080;
    if (this.ptrs.size === 2 && sel) {
      const [a, b] = [...this.ptrs.values()];
      const c = this.cur(sel);
      if (!c) return;
      const L = this.live && this.live.id === sel ? this.live : { id: sel, dx: c.dx, dy: c.dy, s: c.s };
      this.live = L;
      this.mode = { type: 'pinch', id: sel, d0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), s0: L.s };
      return;
    }
    if (this.ptrs.size > 1) return;
    if (sel) {
      const c = this.cur(sel);
      if (c) {
        const E = c.el;
        const cx = E.x + c.dx;
        const cy = E.y + c.dy;
        const hw = (E.w * c.s) / 2;
        const hh = (E.h * c.s) / 2;
        const hs = 44 * u;
        for (const [qx, qy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ]) {
          if (Math.abs(p.x - (cx + qx * hw)) < hs && Math.abs(p.y - (cy + qy * hh)) < hs) {
            this.mode = { type: 'resize', id: sel, s0: c.s, r0: Math.max(1, Math.hypot(p.x - cx, p.y - cy)), cx, cy };
            this.live = { id: sel, dx: c.dx, dy: c.dy, s: c.s };
            return;
          }
        }
      }
    }
    const id = this.hit(p);
    if (id !== sel) this.props.onSelect(id);
    if (id) {
      const c = this.cur(id)!;
      this.mode = { type: 'drag', id, p0: p, dx0: c.dx, dy0: c.dy };
      this.live = { id, dx: c.dx, dy: c.dy, s: c.s };
    } else {
      this.mode = null;
      this.live = null;
    }
  };
  onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (!this.ptrs.has(e.pointerId)) return;
    const p = this.pt(e);
    this.ptrs.set(e.pointerId, p);
    const m = this.mode;
    if (!m || !this.live) return;
    if (m.type === 'pinch') {
      if (this.ptrs.size < 2) return;
      const [a, b] = [...this.ptrs.values()];
      this.live = { ...this.live, s: Math.max(0.25, Math.min(4, (m.s0 * Math.hypot(a.x - b.x, a.y - b.y)) / m.d0)) };
    } else if (m.type === 'resize') this.live = { ...this.live, s: Math.max(0.25, Math.min(4, (m.s0 * Math.hypot(p.x - m.cx, p.y - m.cy)) / m.r0)) };
    else this.live = { ...this.live, dx: m.dx0 + p.x - m.p0.x, dy: m.dy0 + p.y - m.p0.y };
    this.draw();
  };
  onUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size === 0) {
      const L = this.live;
      this.live = null;
      this.mode = null;
      if (L) this.props.onCommit(L.id, { dx: L.dx, dy: L.dy, s: L.s });
    } else if (this.mode?.type === 'pinch') this.mode = null;
  };
  onWheel = (e: WheelEvent) => {
    const sel = this.props.sel;
    if (!sel || !e.ctrlKey) return;
    e.preventDefault();
    const c = this.cur(sel);
    if (!c) return;
    this.props.onCommit(sel, { dx: c.dx, dy: c.dy, s: Math.max(0.25, Math.min(4, c.s * Math.exp(-e.deltaY * 0.01))) });
  };
  render() {
    return (
      <canvas
        ref={this.ref}
        width={this.props.W}
        height={this.props.H}
        onPointerDown={this.onDown}
        onPointerMove={this.onMove}
        onPointerUp={this.onUp}
        onPointerCancel={this.onUp}
        aria-label="Delekort – trykk og dra for å flytte"
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'grab' }}
      />
    );
  }
}
