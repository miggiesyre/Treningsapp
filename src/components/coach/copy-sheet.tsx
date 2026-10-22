'use client';

import { useState } from 'react';
import { Sheet, SheetHead } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { copyWeek } from '@/lib/plan/actions';
import { blockOf, useCoach } from '@/lib/plan/coach-data';
import { WEEKS } from '@/lib/plan/dates';

/** "Kopier uke til…": quick picks plus a U-number grid. Target weeks are replaced. */
export function CopySheet({ from, onClose, onDone }: { from: number; onClose: () => void; onDone: () => void }) {
  const { supabase, athleteId, blocks } = useCoach();
  const toast = useToast();
  const [sel, setSel] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const ws = Array.from({ length: WEEKS - from }, (_, i) => from + 1 + i);
  const picked = ws.filter((w) => sel[w]);
  const b = blockOf(blocks, from);
  const range = (a: number, z: number) => {
    const o: Record<number, boolean> = {};
    for (let w = a; w <= z; w++) o[w] = true;
    setSel(o);
  };
  const quick = ws.length
    ? [
        ...(b && from < b.week_to ? [{ t: 'Resten av blokken', go: () => range(from + 1, b.week_to) }] : []),
        { t: 'Neste uke', go: () => range(from + 1, from + 1) },
        { t: 'Alle resterende', go: () => range(from + 1, WEEKS) },
      ]
    : [];

  const save = async () => {
    if (!picked.length || busy) return;
    setBusy(true);
    try {
      await copyWeek(supabase, athleteId, from, picked);
      toast(`Kopiert til ${picked.length} ${picked.length === 1 ? 'uke' : 'uker'}`);
      onDone();
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label="Kopier uke" width={440}>
      <SheetHead title={`Kopier uke ${from} til…`} sub="Øktene kopieres og erstatter det som ligger i ukene du velger. Mengde følger progresjonen." onClose={onClose} />
      {!!quick.length && (
        <div className="chips">
          {quick.map((q) => (
            <button key={q.t} onClick={q.go} style={{ border: '1.5px solid var(--line)', background: 'transparent', borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {q.t}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 6 }}>
        {ws.map((w) => (
          <button
            key={w}
            aria-pressed={!!sel[w]}
            onClick={() => setSel((s) => ({ ...s, [w]: !s[w] }))}
            style={{ border: 0, background: sel[w] ? 'var(--ink)' : 'var(--row)', color: sel[w] ? 'var(--bg)' : 'var(--ink)', borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            U{w}
          </button>
        ))}
      </div>
      <button className="btn-ink" style={{ fontSize: 17, opacity: picked.length ? 1 : 0.4 }} disabled={busy || !picked.length} onClick={save}>
        {picked.length ? `Kopier til ${picked.length} ${picked.length === 1 ? 'uke' : 'uker'}` : ws.length ? 'Velg uker' : 'Siste uke i planen'}
      </button>
    </Sheet>
  );
}
