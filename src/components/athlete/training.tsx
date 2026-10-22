'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useOpenSettings } from '@/components/app-shell';
import { SportIcon } from '@/components/sheet';
import { sessionView, weekVolume } from '@/lib/plan/athlete';
import { blockOf, usePlan, type Own } from '@/lib/plan/coach-data';
import { SD, WEEKS, currentWeek, dateOf, fmtD, today, ymd } from '@/lib/plan/dates';
import { nf } from '@/lib/plan/library';
import { ICONS, SP, TINT, type Sport } from '@/lib/plan/sports';
import { OwnCard } from './home';
import { OwnSheet } from './own-sheet';
import { useAthleteWeek } from './use-week';

/** "Trening": the week day by day, ‹ › and swipe (prototype: TRENING). */
export function Training() {
  const { blocks } = usePlan();
  const openSettings = useOpenSettings();
  const [w, setW] = useState(currentWeek);
  const wk = useAthleteWeek(w);
  const [own, setOwn] = useState<Own | 'new' | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const t = today();
  const go = (x: number) => setW(Math.max(1, Math.min(WEEKS, x)));
  const b = blockOf(blocks, w);
  const vol = weekVolume(wk.days, wk.prog, wk.swimBack, wk.data.own);
  const swimPaused = !!wk.swimBack && dateOf(w, 6) < wk.swimBack;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 760 }}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(w + (dx < 0 ? 1 : -1));
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <h1 className="page-title">Trening</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pill" style={{ padding: '9px 14px', fontSize: 14 }} onClick={() => setOwn('new')}>
            + Egen økt
          </button>
          <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
            <span />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button className="round" style={{ width: 44, height: 44, fontSize: 20 }} onClick={() => go(w - 1)} disabled={w <= 1} aria-label="Forrige uke">
          ‹
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 700 }}>Uke {w}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center' }}>
            {fmtD(dateOf(w, 0))} – {fmtD(dateOf(w, 6))}
            {b ? ` · ${b.name}` : ''}
          </span>
        </div>
        <button className="round" style={{ width: 44, height: 44, fontSize: 20 }} onClick={() => go(w + 1)} disabled={w >= WEEKS} aria-label="Neste uke">
          ›
        </button>
      </div>
      {w !== currentWeek() && (
        <button className="fab" onClick={() => setW(currentWeek())}>
          I dag
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
        {(['bike', 'run', 'swim'] as Sport[]).map((k) => {
          const paused = k === 'swim' && swimPaused;
          const pct = vol.plan[k] ? Math.min(100, (vol.act[k] / vol.plan[k]) * 100) : 0;
          return (
            <div key={k} style={{ background: TINT(SP[k].c), boxShadow: 'var(--shadow)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, opacity: paused ? 0.5 : 1, minWidth: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: SP[k].c, fontWeight: 700 }}>
                <SportIcon icon={ICONS[k]} color={SP[k].c} />
                {SP[k].label}
              </span>
              <span style={{ fontFamily: 'var(--num)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
                {nf(vol.act[k], 0)}
                <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 600 }}> / {paused ? 'pause' : `${nf(vol.plan[k], 0)} km`}</span>
              </span>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--card2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: SP[k].c }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 20, padding: '2px 18px', opacity: wk.loaded ? 1 : 0.5, transition: 'opacity .15s' }}>
        {wk.days.map((list, d) => {
          const isT = w === t.w && d === t.d;
          const key = ymd(dateOf(w, d));
          const owns = wk.data.own.filter((o) => o.date === key);
          const fg = isT ? 'var(--bike)' : 'var(--ink)';
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr)', gap: 12, padding: '14px 0', borderTop: d ? '1px solid var(--line)' : 'none' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: fg }}>{SD[d]}</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: fg }}>{dateOf(w, d).getDate()}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, justifyContent: 'center' }}>
                {list.map((e) => {
                  const v = sessionView(e, wk.prog, wk.swimBack);
                  return (
                    <Link key={e.p.id + (e.ghost ? 'g' : '')} href={`/okt/${e.p.id}`} className="train-row" style={{ background: v.ctint, opacity: e.ghost ? 0.6 : 1 }}>
                      <SportIcon icon={ICONS[e.t.sport]} color={v.ic} size={18} />
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, textDecoration: v.deco, color: v.titleFg }}>{v.title}</span>
                        <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{v.meta}</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: v.statusFg, whiteSpace: 'nowrap' }}>{v.statusText}</span>
                    </Link>
                  );
                })}
                {owns.map((o) => (
                  <OwnCard key={o.id} o={o} onOpen={() => setOwn(o)} />
                ))}
                {!list.length && !owns.length && <span style={{ fontSize: 15, color: 'var(--faint)' }}>Hvile</span>}
              </span>
            </div>
          );
        })}
      </div>
      <span className="narrow-only" style={{ textAlign: 'center', fontSize: 13, color: 'var(--faint)' }}>
        Sveip for å bytte uke
      </span>
      {own && <OwnSheet own={own === 'new' ? undefined : own} onClose={() => setOwn(null)} onSaved={wk.reload} />}
    </div>
  );
}
