/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useOpenSettings } from '@/components/app-shell';
import { Sheet, SheetHead, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { MONL, RACE, sessionView, weekVolume, type Entry } from '@/lib/plan/athlete';
import { loadCheckins, saveCheckin, type CiKey, type CiRow } from '@/lib/plan/athlete-actions';
import { blockOf, usePlan, type Own } from '@/lib/plan/coach-data';
import { DAYS, PLAN_START, SD, WEEKS, currentWeek, dateOf, fmtD, today, ymd } from '@/lib/plan/dates';
import { nf, range } from '@/lib/plan/library';
import { ICONS, SP, TINT, type Sport } from '@/lib/plan/sports';
import { OwnSheet, ownTitle } from './own-sheet';
import { useAthleteWeek } from './use-week';

const CI: { k: CiKey; label: string; unit: string; values: number[]; fmt: (v: number) => string; def: number; color: string }[] = [
  { k: 'weight_kg', label: 'Vekt', unit: 'kg', values: range(50, 110, 0.1), fmt: (v) => nf(v), def: 75, color: 'var(--c-teal)' },
  { k: 'sleep_score', label: 'Søvnscore', unit: '', values: range(1, 100, 1), fmt: (v) => String(Math.round(v)), def: 80, color: 'var(--c-purple)' },
  { k: 'sleep_hours', label: 'Søvn', unit: 't', values: range(0, 12, 0.5), fmt: (v) => nf(v), def: 7.5, color: 'var(--c-indigo)' },
  { k: 'vo2max', label: 'VO2 maks', unit: 'ml/kg', values: range(30, 80, 1), fmt: (v) => String(Math.round(v)), def: 50, color: 'var(--c-coral)' },
];

/** Latest values per check-in field; a manual value wins over Garmin on the same day. */
function history(rows: CiRow[], k: CiKey) {
  const byDate = new Map<string, { v: number; manual: boolean }>();
  rows.forEach((r) => {
    const v = r[k];
    if (v == null) return;
    const cur = byDate.get(r.date);
    if (!cur || (r.source === 'manual' && !cur.manual)) byDate.set(r.date, { v, manual: r.source === 'manual' });
  });
  return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, x]) => ({ date, ...x }));
}

const shortDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return fmtD(new Date(y, m - 1, d));
};

export function Home() {
  const { supabase, athleteId, blocks } = usePlan();
  const openSettings = useOpenSettings();
  const toast = useToast();
  const now = new Date();
  const t = today();
  const pre = t.w < 1;
  const post = t.w > WEEKS;
  const hw = currentWeek();
  const cur = useAthleteWeek(hw);
  const needNext = !pre && !post && t.d === 6 && hw < WEEKS;
  const next = useAthleteWeek(needNext ? hw + 1 : 0);
  const [ci, setCi] = useState<CiRow[]>([]);
  const [ciOpen, setCiOpen] = useState<CiKey | null>(null);
  const [own, setOwn] = useState<Own | 'new' | null>(null);
  const todayKey = ymd(now);

  const loadCi = useCallback(async () => setCi(await loadCheckins(supabase, athleteId)), [supabase, athleteId]);
  useEffect(() => {
    loadCi();
  }, [loadCi]);

  const daysLeft = Math.max(0, Math.round((RACE.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5));
  const pct = Math.min(1, Math.max(0, (now.getTime() - PLAN_START.getTime()) / (RACE.getTime() - PLAN_START.getTime())));
  const b = blockOf(blocks, t.w);

  const view = (e: Entry, prog = cur.prog) => sessionView(e, prog, cur.swimBack);
  const sessions = pre || post ? [] : cur.days[t.d].filter((e) => !e.ghost);
  const ownToday = cur.data.own.filter((o) => o.date === todayKey);
  const tomorrow: Entry | undefined = pre
    ? cur.days.flat().find((e) => !e.ghost)
    : post
      ? undefined
      : t.d < 6
        ? cur.days[t.d + 1].find((e) => !e.ghost)
        : next.days[0].find((e) => !e.ghost);
  const tv = tomorrow ? sessionView(tomorrow, t.d === 6 && !pre ? next.prog : cur.prog, cur.swimBack) : null;
  const focus = cur.data.focus[todayKey];

  const vol = weekVolume(cur.days, cur.prog, cur.swimBack, pre ? [] : cur.data.own);
  const swimPaused = !!cur.swimBack && dateOf(hw, 6) < cur.swimBack;

  return (
    <div className="home">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {DAYS[(now.getDay() + 6) % 7]} {now.getDate()}. {MONL[now.getMonth()]}
          </span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>
            {pre ? 'Planen starter mandag 26. oktober' : post ? 'Planen er fullført' : `Uke ${t.w} av ${WEEKS}${b ? ' · ' + b.name : ''}`}
          </span>
        </div>
        <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
          <span />
        </button>
      </div>

      <div className="home-brand">
        <img src="/logo.svg" alt="Tri 70.3" className="home-logo" />
        <div className="home-ring">
          <Ring pct={pct} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Jesolo</span>
            <span className="ring-num">{daysLeft}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>dager</span>
          </div>
        </div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Dagens innsjekk</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Valgfritt</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
          {CI.map((c) => {
            const h = history(ci, c.k);
            const last = h[0];
            const prev = h[1];
            const diff = last && prev ? last.v - prev.v : 0;
            const saved = !!last && last.date === todayKey && last.manual;
            return (
              <button key={c.k} className="ci-tile" onClick={() => setCiOpen(c.k)} style={{ background: TINT(c.color) }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 14 }}>{c.label}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 2, minWidth: 0, flexWrap: 'wrap' }}>
                  <span className="ci-val" style={{ color: c.color }}>
                    {last ? c.fmt(last.v) : '–'}
                  </span>
                  {last && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)' }}>{c.unit}</span>}
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {!last ? (
                    'Legg inn'
                  ) : !prev ? (
                    shortDate(last.date)
                  ) : Math.abs(diff) < 1e-9 ? (
                    <>
                      → <span className="wide-only">som {shortDate(prev.date)}</span>
                      <span className="narrow-only">lik</span>
                    </>
                  ) : (
                    <>
                      {diff > 0 ? '↑' : '↓'} {c.fmt(Math.abs(diff))}
                      <span className="wide-only"> fra {shortDate(prev.date)}</span>
                    </>
                  )}
                </span>
                {saved && (
                  <span style={{ position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: c.color, color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center' }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>I dag</span>
            <button className="pill" style={{ padding: '7px 14px', fontSize: 14, minHeight: 34 }} onClick={() => setOwn('new')}>
              + Egen økt
            </button>
          </span>
          {sessions.length > 0 && focus && (
            <span style={{ fontSize: 15, color: 'var(--muted)' }}>
              Dagens fokus: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{focus}</span>
            </span>
          )}
        </div>
        {!cur.loaded && <div className="skeleton" style={{ height: 96 }} />}
        {cur.loaded &&
          sessions.map((e) => {
            const v = view(e);
            const st = v.statusText === 'I dag' ? '' : v.statusText;
            return (
              <Link key={e.p.id + e.date} href={`/okt/${e.p.id}`} className="today-card" style={{ background: v.ctint }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: v.ic }}>
                    <SportIcon icon={ICONS[e.t.sport]} color={v.ic} size={18} />
                    {v.tagLine}
                  </span>
                  <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.15, color: v.titleFg, textDecoration: v.deco }}>{v.title}</span>
                  <span style={{ fontSize: 15, color: 'var(--muted)' }}>{v.meta}</span>
                </span>
                {st && <span style={{ fontSize: 13, fontWeight: 600, color: v.statusFg, whiteSpace: 'nowrap' }}>{st}</span>}
                <span style={{ fontSize: 22, color: 'var(--faint)' }}>›</span>
              </Link>
            );
          })}
        {ownToday.map((o) => (
          <OwnCard key={o.id} o={o} onOpen={() => setOwn(o)} big />
        ))}
        {cur.loaded && !sessions.length && (
          <div style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontFamily: 'var(--num)', fontSize: 28, fontWeight: 700 }}>Hviledag</span>
            {tomorrow && tv ? (
              <Link href={`/okt/${tomorrow.p.id}`} className="tomorrow" style={{ background: tv.tint }}>
                <SportIcon icon={ICONS[tomorrow.t.sport]} color={tv.color} />
                <span style={{ flex: 1, fontSize: 15 }}>
                  <span style={{ color: 'var(--muted)' }}>{pre ? 'Første økt: ' : 'I morgen: '}</span>
                  <span style={{ fontWeight: 600 }}>
                    {SP[tomorrow.t.sport].label} · {tv.title}
                    {pre ? ` · ${SD[0].toLowerCase()} ${fmtD(dateOf(1, 0))}` : ''}
                  </span>
                </span>
                <span style={{ color: 'var(--faint)', fontSize: 18 }}>›</span>
              </Link>
            ) : (
              <div className="tomorrow" style={{ background: 'var(--card2)', cursor: 'default' }}>
                <span style={{ flex: 1, fontSize: 15 }}>
                  <span style={{ color: 'var(--muted)' }}>I morgen: </span>
                  <span style={{ fontWeight: 600 }}>Hvile</span>
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{pre ? 'Første uke' : 'Denne uka'}</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 8 }}>
          {(['bike', 'run', 'swim', 'strength'] as Sport[]).map((k) => {
            const paused = k === 'swim' && swimPaused;
            const st = k === 'strength';
            return (
              <div key={k} className="week-tile" style={{ background: TINT(SP[k].c), opacity: paused ? 0.55 : 1 }}>
                <SportIcon icon={ICONS[k]} color={SP[k].c} size={18} />
                <span style={{ fontFamily: 'var(--num)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{paused ? '–' : st ? String(vol.act.strength) : nf(vol.act[k], 0)}</span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {paused ? 'Pause' : st ? `av ${vol.plan.strength} økter` : `av ${nf(vol.plan[k], 0)} km`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {ciOpen && (
        <CheckinSheet
          k={ciOpen}
          rows={ci}
          onClose={() => setCiOpen(null)}
          onSave={async (k, v) => {
            try {
              await saveCheckin(supabase, athleteId, todayKey, k, v);
              toast(`${CI.find((c) => c.k === k)!.label} lagret`);
              setCiOpen(null);
              await loadCi();
            } catch {
              toast('Noe gikk galt – prøv igjen');
            }
          }}
        />
      )}
      {own && <OwnSheet own={own === 'new' ? undefined : own} onClose={() => setOwn(null)} onSaved={cur.reload} />}
    </div>
  );
}

function CheckinSheet({ k, rows, onClose, onSave }: { k: CiKey; rows: CiRow[]; onClose: () => void; onSave: (k: CiKey, v: number) => Promise<void> }) {
  const c = CI.find((x) => x.k === k)!;
  const last = history(rows, k)[0];
  const [v, setV] = useState(last?.v ?? c.def);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet onClose={onClose} label={c.label} width={420}>
      <SheetHead title={c.label} sub={last ? `Sist: ${c.fmt(last.v)} ${c.unit} · ${shortDate(last.date)}` : 'Ingen verdi ennå'} onClose={onClose} />
      <Wheel values={c.values} value={v} format={c.fmt} unit={c.unit} onChange={setV} />
      <button
        className="btn-ink"
        style={{ fontSize: 17 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSave(k, v);
          setBusy(false);
        }}
      >
        Lagre
      </button>
    </Sheet>
  );
}

export function OwnCard({ o, onOpen, big }: { o: Own; onOpen: () => void; big?: boolean }) {
  const sp = o.sport in SP ? (o.sport as Sport) : null;
  const c = sp ? SP[sp].c : 'var(--muted)';
  const meta = [o.distance_km ? `${nf(Number(o.distance_km))} km` : '', o.duration_min ? `${Math.floor(o.duration_min / 60)}:${String(o.duration_min % 60).padStart(2, '0')}` : '', o.comment].filter(Boolean).join(' · ');
  return (
    <button onClick={onOpen} className={big ? 'today-card' : 'train-row'} style={{ background: sp ? TINT(c) : 'var(--card2)' }}>
      {!big && <SportIcon icon={sp ? ICONS[sp] : ICONS.other} color={c} size={18} />}
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: big ? 6 : 2, minWidth: 0 }}>
        {big && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: c }}>
            <SportIcon icon={sp ? ICONS[sp] : ICONS.other} color={c} size={18} />
            {sp ? `${SP[sp].label} · Egen` : 'Egen'}
          </span>
        )}
        <span style={{ fontSize: big ? 19 : 16, fontWeight: big ? 700 : 600 }}>{ownTitle(o)}</span>
        {meta && <span style={{ fontSize: big ? 15 : 13.5, color: 'var(--muted)' }}>{meta}</span>}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: c, whiteSpace: 'nowrap' }}>✓ Egen</span>
    </button>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 48;
  const C = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 112 112" style={{ display: 'block', width: '100%', height: '100%', transform: 'rotate(-90deg)' }} aria-hidden>
      <defs>
        <linearGradient id="jesoloRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#12E5C4" />
        </linearGradient>
      </defs>
      <circle cx={56} cy={56} r={r} fill="none" strokeWidth={11} style={{ stroke: 'var(--ringTrack)' }} />
      <circle cx={56} cy={56} r={r} fill="none" stroke="url(#jesoloRing)" strokeWidth={11} strokeLinecap="round" strokeDasharray={`${Math.max(0.01, pct * C)} ${C}`} />
    </svg>
  );
}
