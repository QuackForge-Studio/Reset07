import { describe, expect, it } from 'vitest';
import { evaluateEndings, releaseRequirements, type EndingProgress } from '../src/play/data/endings';

const base = (): EndingProgress => ({
  savedEli: false,
  memories: [],
  hiddenObjectiveDone: false,
  challengedMara: false,
  challengedGuardian: false,
});

describe('ending requirements', () => {
  it('preserve and break are always available', () => {
    const e = evaluateEndings(base());
    expect(e.preserve).toBe(true);
    expect(e.break).toBe(true);
    expect(e.release).toBe(false);
  });

  it('release stays locked until every requirement is met', () => {
    const p = base();
    const steps: Array<Partial<EndingProgress>> = [
      { savedEli: true },
      { savedEli: true, memories: ['eliChip'] },
      { savedEli: true, memories: ['eliChip', 'decommission'] },
      { savedEli: true, memories: ['eliChip', 'decommission', 'maraOrigin'] },
      { savedEli: true, memories: ['eliChip', 'decommission', 'maraOrigin'], hiddenObjectiveDone: true },
      { savedEli: true, memories: ['eliChip', 'decommission', 'maraOrigin'], hiddenObjectiveDone: true, challengedMara: true },
    ];
    for (const s of steps) {
      expect(evaluateEndings({ ...p, ...s }).release, JSON.stringify(s)).toBe(false);
    }
    const full = evaluateEndings({ ...p, ...steps.at(-1)!, challengedGuardian: true });
    expect(full.release).toBe(true);
  });

  it('releaseRequirements reports exactly the missing pieces', () => {
    const missing = releaseRequirements(base());
    expect(missing.length).toBe(7);
    const p = base();
    p.savedEli = true;
    p.memories = ['eliChip', 'decommission', 'maraOrigin'];
    p.hiddenObjectiveDone = true;
    p.challengedMara = true;
    const still = releaseRequirements(p);
    expect(still).toEqual(['CONFRONT THE GUARDIAN\u2019S WARNING']);
  });
});
