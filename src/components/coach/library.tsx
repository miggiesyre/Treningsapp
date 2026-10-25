'use client';

import { useState } from 'react';
import { PageTitle, useOpenSettings } from '@/components/app-shell';
import { Chips, Sheet, SheetHead, SportIcon } from '@/components/sheet';
import { useToast } from '@/components/toast';
import { saveTemplateText, type Draft } from '@/lib/plan/actions';
import { useCoach } from '@/lib/plan/coach-data';
import { currentWeek } from '@/lib/plan/dates';
import { ALT, defaultParts, describe, type BuiltExercise, type Template } from '@/lib/plan/library';
import { ICONS, SP, SPORTS } from '@/lib/plan/sports';
import { Builder, DeleteTemplate } from './builder';

/** "Økter": the coach's library grouped by sport (prototype: TRENER: BIBLIOTEK). */
export function Library() {
  const { templates, prog, ready, reloadTemplates } = useCoach();
  const openSettings = useOpenSettings();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [text, setText] = useState<Template | null>(null);
  const p = prog[currentWeek()] ?? {};

  if (!ready) return <PageTitle title="Økter" />;

  const open = (t: Template) =>
    t.builtin
      ? setText(t)
      : setDraft({
          mode: 'lib',
          sport: t.sport,
          id: t.id,
          name: t.name,
          parts: t.parts.map((x) => ({ ...x })),
          exs: (t.exercises as BuiltExercise[]).map((x) => ({ ...x })),
          note: t.note ?? '',
          alt: t.indoor_alt ?? '',
        });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <h1 className="page-title">Økter</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="btn-ink"
            style={{ height: 'auto', borderRadius: 999, padding: '10px 16px', fontSize: 15, minHeight: 40 }}
            onClick={() => setDraft({ mode: 'lib', sport: 'bike', name: '', parts: defaultParts('bike'), exs: [], note: '', alt: '' })}
          >
            + Ny økt
          </button>
          <button className="gear" onClick={openSettings} title="Innstillinger" aria-label="Innstillinger">
            <span />
          </button>
        </div>
      </div>
      {SPORTS.map((k) => {
        const items = templates.filter((t) => t.sport === k && !t.hidden);
        return (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: SP[k].c, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              <SportIcon icon={ICONS[k]} color={SP[k].c} />
              {SP[k].label}
            </span>
            <div style={{ background: 'var(--card)', boxShadow: 'var(--shadow)', borderRadius: 18, padding: '2px 16px' }}>
              {items.map((t, i) => (
                <button key={t.id} className="lib-row" onClick={() => open(t)} style={{ borderTop: i ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{t.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{describe(t, p).meta}</span>
                  </span>
                  <span style={{ fontSize: 20, color: 'var(--faint)' }}>›</span>
                </button>
              ))}
              {!items.length && <div style={{ padding: '14px 0', fontSize: 15, color: 'var(--muted)' }}>Ingen økter ennå.</div>}
            </div>
          </div>
        );
      })}
      {draft && (
        <Builder
          draft={draft}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null);
            await reloadTemplates();
          }}
        />
      )}
      {text && <TextSheet t={text} onClose={() => setText(null)} onSaved={reloadTemplates} />}
    </div>
  );
}

/** Built-in sessions: only the note and indoor alternative are editable (prototype: BIBLIOTEK-ARK). */
function TextSheet({ t, onClose, onSaved }: { t: Template; onClose: () => void; onSaved: () => Promise<void> }) {
  const { supabase } = useCoach();
  const toast = useToast();
  const [note, setNote] = useState(t.note ?? '');
  const [alt, setAlt] = useState(t.indoor_alt ?? '');
  const [busy, setBusy] = useState(false);
  const alts: string[] = [];
  [alt, ...(ALT[t.sport] ?? []), ''].forEach((a) => !alts.includes(a) && alts.push(a));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveTemplateText(supabase, t.id, note, alt);
      await onSaved();
      toast('Lagret');
      onClose();
    } catch {
      toast('Noe gikk galt – prøv igjen');
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} label={t.name}>
      <SheetHead title={t.name} sub={`${SP[t.sport].label} · ${t.tag ?? ''}`} onClose={onClose} />
      <div className="field">
        <span className="lbl">Beskrivelse og notat</span>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1000} />
      </div>
      {alts.length > 1 && (
        <div className="field">
          <span className="lbl">Innendørsalternativ</span>
          <div className="chips">
            <Chips options={alts} value={alt} onPick={setAlt} label={(a) => a || 'Ingen'} />
          </div>
        </div>
      )}
      <button className="btn-ink" style={{ fontSize: 17 }} disabled={busy} onClick={save}>
        Lagre
      </button>
      <DeleteTemplate
        id={t.id}
        name={t.name}
        onDone={async () => {
          await onSaved();
          onClose();
        }}
      />
    </Sheet>
  );
}
