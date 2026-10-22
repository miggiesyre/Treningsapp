'use client';

import { useState } from 'react';
import { Chips, Sheet, SheetHead } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { Wheel } from '@/components/wheel';
import { deleteOwn, saveOwn, type OwnInput } from '@/lib/plan/athlete-actions';
import { usePlan, type Own } from '@/lib/plan/coach-data';
import { SD, fmtD, parseYmd, ymd } from '@/lib/plan/dates';
import { hm, range } from '@/lib/plan/library';

const TYPES = ['Sykkel', 'Løp', 'Svøm', 'Styrke', 'Annet'] as const;
type Type = (typeof TYPES)[number];
const TO_SPORT: Record<Type, OwnInput['sport']> = { Sykkel: 'bike', Løp: 'run', Svøm: 'swim', Styrke: 'strength', Annet: 'other' };
const FROM_SPORT = Object.fromEntries(Object.entries(TO_SPORT).map(([k, v]) => [v, k])) as Record<string, Type>;

const dayOff = (off: number) => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + off);
};
const offLabel = (o: number) => {
  if (o === 0) return 'I dag';
  if (o === -1) return 'I går';
  if (o === 1) return 'I morgen';
  const d = dayOff(o);
  return `${SD[(d.getDay() + 6) % 7]} ${fmtD(d)}`;
};

/** "+ Egen økt": training outside the plan. Ruben sees it in Ukeplan (prototype: EGEN ØKT). */
export function OwnSheet({ own, onClose, onSaved }: { own?: Own; onClose: () => void; onSaved: () => void }) {
  const { supabase, athleteId } = usePlan();
  const toast = useToast();
  const t0 = new Date();
  const initOff = own ? Math.round((parseYmd(own.date).getTime() - new Date(t0.getFullYear(), t0.getMonth(), t0.getDate()).getTime()) / 864e5) : 0;
  const initType: Type = own ? (FROM_SPORT[own.sport] ?? 'Annet') : 'Løp';
  const [type, setType] = useState<Type>(initType);
  const [other, setOther] = useState(own && initType === 'Annet' ? (own.title ?? '') : '');
  const [off, setOff] = useState(Math.max(-30, Math.min(7, initOff)));
  const [dur, setDur] = useState(own?.duration_min ?? 60);
  const [comment, setComment] = useState(own?.comment ?? '');
  const [busy, setBusy] = useState(false);

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

  const save = () =>
    run(
      () =>
        saveOwn(supabase, athleteId, {
          id: own?.id,
          date: ymd(dayOff(off)),
          sport: TO_SPORT[type],
          title: type === 'Annet' ? other.trim().slice(0, 80) || 'Annet' : (own?.title ?? null),
          duration_min: dur,
          comment: comment.trim().slice(0, 500) || null,
        }),
      own ? 'Lagret' : 'Egen økt lagt til',
    );

  return (
    <Sheet onClose={onClose} label="Egen økt" width={440}>
      <SheetHead title={own ? 'Egen økt' : 'Ny egen økt'} sub="Utenfor planen · Ruben ser den" onClose={onClose} />
      <div className="chips">
        <Chips options={TYPES} value={type} onPick={setType} />
      </div>
      {type === 'Annet' && <input className="input" value={other} onChange={(e) => setOther(e.target.value)} maxLength={80} placeholder="Hva slags aktivitet?" />}
      <div className="two" style={{ gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="wheel-lbl">Dag</span>
          <Wheel h={132} values={range(-30, 7, 1)} value={off} format={offLabel} onChange={setOff} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="wheel-lbl">Varighet</span>
          <Wheel h={132} values={range(5, 360, 5)} value={dur} format={hm} onChange={setDur} />
        </div>
      </div>
      <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} placeholder="Kommentar (valgfritt)" />
      <button className="btn-ink" style={{ fontSize: 17 }} disabled={busy} onClick={save}>
        Lagre
      </button>
      {own && (
        <button className="link-bad" disabled={busy} onClick={() => run(() => deleteOwn(supabase, own.id), 'Slettet')}>
          Slett
        </button>
      )}
    </Sheet>
  );
}

export const ownTitle = (o: Own) => o.title || (o.sport in TO_SPORT_REV ? `Egen ${TO_SPORT_REV[o.sport]}økt` : 'Annet');
const TO_SPORT_REV: Record<string, string> = { bike: 'sykkel', run: 'løpe', swim: 'svømme', strength: 'styrke' };
