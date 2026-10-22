'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOpenSettings } from '@/components/app-shell';
import { Sheet, SheetHead, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { usePlan } from '@/lib/plan/coach-data';
import { fmtD } from '@/lib/plan/dates';
import { pace, range } from '@/lib/plan/library';
import { loadZones, saveZone, type ZoneKey, type Zones } from '@/lib/plan/profile';
import { ICONS } from '@/lib/plan/sports';

const ZCOL = ['#8E9AAF', 'var(--swim)', 'var(--ok)', 'var(--bike)', 'var(--run)'];
const ZNAME = ['Rolig', 'Utholdenhet', 'Tempo', 'Terskel', 'VO2'];
const ZW = ['58%', '67%', '76%', '86%', '100%'];

const ZDEF: Record<ZoneKey, { label: string; unit: string; values: number[]; def: number; fmt?: (v: number) => string }> = {
  max_hr: { label: 'Maks puls', unit: 'bpm', values: range(150, 215, 1), def: 188 },
  resting_hr: { label: 'Hvilepuls', unit: 'bpm', values: range(35, 80, 1), def: 50 },
  ftp: { label: 'FTP', unit: 'W', values: range(150, 400, 1), def: 246 },
  threshold_pace_s: { label: 'Terskelpace', unit: '/km', values: range(180, 420, 1), def: 270, fmt: pace },
  vo2max: { label: 'VO2 maks', unit: 'ml/kg/min', values: range(30, 80, 1), def: 52 },
};

/** Bands from fractions of a threshold (prototype: cons()). `inv` for pace, where lower is faster. */
const bands = (xs: string[], unit: string, inv?: boolean) =>
  (inv
    ? [`> ${xs[0]}`, `${xs[0]}–${xs[1]}`, `${xs[1]}–${xs[2]}`, `${xs[2]}–${xs[3]}`, `< ${xs[3]}`]
    : [`< ${xs[0]}`, `${xs[0]}–${xs[1]}`, `${xs[1]}–${xs[2]}`, `${xs[2]}–${xs[3]}`, `${xs[3]}+`]
  ).map((s) => `${s} ${unit}`);

/** "Soner": heart rate, power and pace zones from Miguel's numbers. Ruben sees and can edit them too. */
export function ZonesPage() {
  const { supabase, athleteId } = usePlan();
  const openSettings = useOpenSettings();
  const toast = useToast();
  const [z, setZ] = useState<Zones | null>(null);
  const [edit, setEdit] = useState<ZoneKey | null>(null);
  const load = useCallback(async () => setZ(await loadZones(supabase, athleteId)), [supabase, athleteId]);
  useEffect(() => {
    load();
  }, [load]);
  if (!z) return <div className="skeleton" style={{ height: 200, maxWidth: 760 }} />;

  const hr = z.max_hr
    ? (() => {
        const base = z.resting_hr ?? 0;
        const span = z.max_hr - base;
        const p = [0.5, 0.6, 0.7, 0.8, 0.9];
        return p.map((x, i) => `${Math.round(base + x * span)}–${i < 4 ? Math.round(base + p[i + 1] * span) - 1 : z.max_hr} bpm`);
      })()
    : [];
  const cards = [
    {
      title: 'Puls',
      color: 'var(--run)',
      icon: ICONS.run,
      basis: z.max_hr ? (z.resting_hr ? `Pulsreserve · ${z.resting_hr}–${z.max_hr}` : `% av maks ${z.max_hr}`) : '',
      rows: hr,
      empty: 'Legg inn maks puls for å regne ut pulssoner',
      key: 'max_hr' as ZoneKey,
    },
    {
      title: 'Watt · sykkel',
      color: 'var(--bike)',
      icon: ICONS.bike,
      basis: z.ftp ? `FTP ${z.ftp} W` : '',
      rows: z.ftp ? bands([0.56, 0.76, 0.91, 1.06].map((p) => String(Math.round(p * z.ftp!))), 'W') : [],
      empty: 'Legg inn FTP for å regne ut wattsoner',
      key: 'ftp' as ZoneKey,
    },
    {
      title: 'Pace · løp',
      color: 'var(--run)',
      icon: ICONS.run,
      basis: z.threshold_pace_s ? `Terskel ${pace(z.threshold_pace_s)} /km` : '',
      rows: z.threshold_pace_s ? bands([1.29, 1.14, 1.06, 0.99].map((p) => pace(Math.round(p * z.threshold_pace_s!))), '/km', true) : [],
      empty: 'Legg inn terskelpace for å regne ut tempo-soner',
      key: 'threshold_pace_s' as ZoneKey,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 className="page-title">Soner</h1>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{z.vo2max ? `VO2 maks ${z.vo2max} ml/kg/min` : 'Legg inn verdiene dine'}</span>
        </span>
        <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
          <span />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 10 }}>
          {(Object.keys(ZDEF) as ZoneKey[]).map((k) => {
            const d = ZDEF[k];
            const v = z[k];
            return (
              <button key={k} onClick={() => setEdit(k)} aria-label={`Endre ${d.label}`} className="zone-in">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: 10, right: 10, color: 'var(--muted)', pointerEvents: 'none' }}>
                  <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                  <path d="M13.5 6.5l4 4" />
                </svg>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16 }}>{d.label}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 3, minWidth: 0 }}>
                  <span className="big-num" style={{ fontSize: 22, color: v == null ? 'var(--faint)' : 'var(--ink)' }}>{v == null ? '–' : d.fmt ? d.fmt(v) : v}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{v == null ? 'Legg inn' : d.unit}</span>
                </span>
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {z.updated_at ? `Sist oppdatert ${fmtD(new Date(z.updated_at))} ${new Date(z.updated_at).getFullYear()} · ` : ''}Ruben ser sonene dine
        </span>
      </div>
      {cards.map((cd) => (
        <div key={cd.title} className="card" style={{ padding: '16px 18px 8px', display: 'flex', flexDirection: 'column' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: cd.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <SportIcon icon={cd.icon} color={cd.color} />
              {cd.title}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'right' }}>{cd.basis}</span>
          </span>
          {cd.rows.length ? (
            cd.rows.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 12, alignItems: 'center', padding: '5px 0' }}>
                <div style={{ width: ZW[i], height: 34, borderRadius: 9, background: ZCOL[i], color: '#141414', display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', boxSizing: 'border-box', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <span style={{ fontWeight: 800 }}>Z{i + 1}</span>
                  <span style={{ fontWeight: 600 }}>{ZNAME[i]}</span>
                </div>
                <span className="big-num" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>
                  {r}
                </span>
              </div>
            ))
          ) : (
            <button onClick={() => setEdit(cd.key)} style={{ border: '1.5px dashed var(--line)', background: 'transparent', borderRadius: 14, padding: 14, marginBottom: 8, fontSize: 15, color: 'var(--muted)', cursor: 'pointer', textAlign: 'left' }}>
              {cd.empty}
            </button>
          )}
        </div>
      ))}
      {edit && (
        <ZoneSheet
          k={edit}
          value={z[edit]}
          onClose={() => setEdit(null)}
          onSave={async (v) => {
            try {
              await saveZone(supabase, athleteId, edit, v);
              toast('Soner oppdatert');
              setEdit(null);
              load();
            } catch {
              toast('Noe gikk galt – prøv igjen');
            }
          }}
        />
      )}
    </div>
  );
}

function ZoneSheet({ k, value, onClose, onSave }: { k: ZoneKey; value: number | null; onClose: () => void; onSave: (v: number) => Promise<void> }) {
  const d = ZDEF[k];
  const [v, setV] = useState(value ?? d.def);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet onClose={onClose} label={d.label} width={420}>
      <SheetHead title={d.label} sub={value != null ? `Nå: ${d.fmt ? d.fmt(value) : value} ${d.unit}` : d.unit} onClose={onClose} />
      <Wheel values={d.values} value={v} format={d.fmt} unit={d.unit} onChange={setV} />
      <button
        className="btn-ink"
        style={{ fontSize: 17 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onSave(v);
          setBusy(false);
        }}
      >
        Lagre
      </button>
    </Sheet>
  );
}
