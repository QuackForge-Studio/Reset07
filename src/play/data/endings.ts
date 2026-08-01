/**
 * RESET//07 — ending definitions + requirement evaluation (pure, testable).
 *
 * Endings:
 *   preserve — maintain the reset. Safe but unsettling. Always available.
 *   break    — destroy the city core. Largest explosion. Always available.
 *   release  — separate Mara from the system, evacuate, shut down safely.
 *              Hardest: requires Eli, key memories, a hidden objective and
 *              challenging both Mara and the Core Guardian.
 */

export type EndingId = 'preserve' | 'break' | 'release';

export interface EndingDef {
  id: EndingId;
  titleKey: string;
  order: 1 | 2 | 3;
  description: string;
  requires?: (p: EndingProgress) => boolean;
}

export interface EndingProgress {
  savedEli: boolean; // persistent
  memories: string[]; // persistent memory ids
  hiddenObjectiveDone: boolean; // current loop (or persistent)
  challengedMara: boolean; // persistent (dialogue flag)
  challengedGuardian: boolean; // persistent
}

export const ENDINGS: EndingDef[] = [
  {
    id: 'preserve',
    titleKey: 'end.preserve.title',
    order: 1,
    description: 'Keep the reset running. Everyone lives inside the loop — forever.',
  },
  {
    id: 'break',
    titleKey: 'end.break.title',
    order: 2,
    description: 'Destroy the city core. The loop ends. The city burns free.',
  },
  {
    id: 'release',
    titleKey: 'end.release.title',
    order: 3,
    description:
      'Separate Mara from the system, evacuate the survivors, and shut the loop down safely. The truth is the only way out.',
    requires: (p) =>
      p.savedEli &&
      p.memories.includes('maraOrigin') &&
      p.memories.includes('decommission') &&
      p.memories.includes('eliChip') &&
      p.hiddenObjectiveDone &&
      p.challengedMara &&
      p.challengedGuardian,
  },
];

export function evaluateEndings(p: EndingProgress): Record<EndingId, boolean> {
  const out: Record<EndingId, boolean> = { preserve: true, break: true, release: false };
  for (const e of ENDINGS) {
    if (e.id === 'release' && e.requires) out[e.id] = e.requires(p);
  }
  return out;
}

/** What's still missing for the Release ending (for UI hints). */
export function releaseRequirements(p: EndingProgress): string[] {
  const missing: string[] = [];
  if (!p.savedEli) missing.push('SAVE ELI — TRANSIT PLATFORM');
  if (!p.memories.includes('eliChip')) missing.push('RECOVER ELI\u2019S MEMORY CHIP');
  if (!p.memories.includes('decommission')) missing.push('FIND THE DECOMMISSION ORDER');
  if (!p.memories.includes('maraOrigin')) missing.push('DISCOVER MARA\u2019S ORIGIN');
  if (!p.hiddenObjectiveDone) missing.push('OPEN THE EVACUATION CAPSULES');
  if (!p.challengedMara) missing.push('CHALLENGE MARA\u2019S CLAIMS');
  if (!p.challengedGuardian) missing.push('CONFRONT THE GUARDIAN\u2019S WARNING');
  return missing;
}
