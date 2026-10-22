'use client';

import { useState } from 'react';

/** Small SVG line chart with a tap-to-select tooltip (prototype: chart()). */
export function LineChart({ pts, fmt, color, narrow }: { pts: [string, number][]; fmt: (v: number) => string; color: string; narrow?: boolean }) {
  const [sel, setSel] = useState<number | null>(null);
  if (!pts.length) return <div style={{ height: 120, display: 'grid', placeItems: 'center', fontSize: 14, color: 'var(--muted)' }}>Ingen data ennå</div>;
  const W = 360;
  const H = 170;
  const L = 32;
  const R = 12;
  const T = 24;
  const B = 22;
  const n = pts.length;
  let y0 = Math.min(...pts.map((p) => p[1]));
  let y1 = Math.max(...pts.map((p) => p[1]));
  const pad = (y1 - y0) * 0.35 || 1;
  y0 -= pad;
  y1 += pad;
  const X = (i: number) => (n === 1 ? (L + W - R) / 2 : L + (i / (n - 1)) * (W - L - R));
  const Y = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  const maxL = narrow ? 4 : 6;
  const step = Math.max(1, Math.ceil((n - 1) / (maxL - 1)));
  const shown: number[] = [];
  for (let i = 0; i < n; i += step) shown.push(i);
  if (shown[shown.length - 1] !== n - 1) {
    if (shown.length > 1 && n - 1 - shown[shown.length - 1] < step * 0.6) shown.pop();
    shown.push(n - 1);
  }
  const si = sel != null && sel < n ? sel : n - 1;
  const sp = pts[si];
  const tx = `${sp[0]} · ${fmt(sp[1])}`;
  const tw = tx.length * 6.2 + 16;
  const bx = Math.max(2, Math.min(W - tw - 2, X(si) - tw / 2));
  const by = Math.max(0, Y(sp[1]) - 30);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible', touchAction: 'manipulation' }} role="img" aria-label={`Siste: ${tx}`}>
      {[0, 1, 2].map((i) => {
        const v = y0 + ((y1 - y0) * (i + 0.5)) / 3;
        const y = Y(v);
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y} y2={y} strokeWidth={1} style={{ stroke: 'var(--line)' }} />
            <text x={L - 6} y={y + 3.5} textAnchor="end" fontSize={10} style={{ fill: 'var(--faint)' }}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {shown.map((i) => (
        <text key={'x' + i} x={X(i)} y={H - 5} textAnchor={n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'} fontSize={10} style={{ fill: 'var(--faint)' }}>
          {pts[i][0]}
        </text>
      ))}
      <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join(' ')} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" style={{ stroke: color }} />
      {pts.map((p, i) => (
        <circle key={'c' + i} cx={X(i)} cy={Y(p[1])} r={i === si ? 5 : 3} strokeWidth={2} style={{ fill: i === si ? color : 'var(--card)', stroke: color }} />
      ))}
      <rect x={bx} y={by} width={tw} height={20} rx={6} style={{ fill: 'var(--ink)' }} />
      <text x={bx + tw / 2} y={by + 14} textAnchor="middle" fontSize={11} fontWeight={600} style={{ fill: 'var(--bg)' }}>
        {tx}
      </text>
      {pts.map((p, i) => (
        <circle key={'h' + i} cx={X(i)} cy={Y(p[1])} r={Math.max(12, (W - L - R) / n / 2)} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => setSel(i)} />
      ))}
    </svg>
  );
}
