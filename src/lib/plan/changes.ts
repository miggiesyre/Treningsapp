// Miguel's change + Ruben's decision on it (session_changes). Ruben applies "move", "double" and
// "replace" to the planned row itself, so those changes stop affecting how the session is shown.
import type { Change } from './coach-data';

export type Kind = Change['kind'];

/** The change's effect after Ruben's decision. */
export function effKind(c: Pick<Change, 'kind' | 'coach_decision'> | undefined | null): Kind | null {
  if (!c) return null;
  if (c.coach_decision === 'drop') return 'skipped';
  if (c.coach_decision === 'move' || c.coach_decision === 'double' || c.coach_decision === 'replace') return null;
  return c.kind;
}

export const DECISION_TEXT: Record<string, string> = {
  drop: 'Droppet',
  move: 'Flyttet av Ruben',
  double: 'Dobbeløkt – lagt inn av Ruben',
  replace: 'Erstattet av Ruben',
};

export const KIND_TEXT: Record<Kind, string> = {
  skipped: 'Hoppet over',
  indoor: 'Byttet til innendørs',
  shortened: 'Valgte kort versjon',
  moved: 'Flyttet økt',
};
