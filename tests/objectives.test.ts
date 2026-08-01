import { describe, expect, it } from 'vitest';
import { buildLoopPlan, ObjectiveTracker } from '../src/play/data/objectives';

const prog = (over: Partial<{ loopsCompleted: number; memories: string[]; rescued: string[]; routes: string[]; hiddenObjectiveDone: boolean }> = {}) => ({
  loopsCompleted: 0,
  memories: [] as string[],
  rescued: [] as string[],
  routes: [] as string[],
  hiddenObjectiveDone: false,
  ...over,
});

describe('objective tracker', () => {
  it('loop 1 keeps a lean chain and no side objectives', () => {
    const plan = buildLoopPlan(prog());
    expect(plan.chain.map((o) => o.id)).toEqual(['garageExit', 'rescueA', 'stabilizeRelay', 'enterCore', 'defeatGuardian']);
    expect(plan.side).toHaveLength(0);
  });

  it('later loops add optional objectives and skip completed rescues', () => {
    const plan = buildLoopPlan(
      prog({ loopsCompleted: 1, rescued: ['capsuleA'], routes: ['tram'], memories: [] }),
    );
    expect(plan.chain.map((o) => o.id)).toEqual(['garageExit', 'stabilizeRelay', 'enterCore', 'defeatGuardian']);
    expect(plan.side.map((o) => o.id)).toContain('rescueEli');
  });

  it('hidden objectives appear only after the maintenance route unlocks', () => {
    const plan = buildLoopPlan(prog({ loopsCompleted: 2, routes: ['maintenance'] }));
    expect(plan.side.map((o) => o.id)).toContain('hiddenCapsules');
  });

  it('completing current objective advances the pointer', () => {
    const plan = buildLoopPlan(prog());
    const t = new ObjectiveTracker(plan);
    expect(t.current?.id).toBe('garageExit');
    expect(t.complete('garageExit')).toBe(true);
    expect(t.current?.id).toBe('rescueA');
    expect(t.complete('stabilizeRelay')).toBe(false); // not current yet
    expect(t.current?.id).toBe('rescueA');
  });

  it('out-of-order optional completions do not skip the chain', () => {
    const plan = buildLoopPlan(prog({ loopsCompleted: 1 }));
    const t = new ObjectiveTracker(plan);
    t.complete('memoryService');
    expect(t.current?.id).toBe('garageExit');
  });

  it('tracks allDone', () => {
    const plan = buildLoopPlan(prog());
    const t = new ObjectiveTracker(plan);
    for (const o of plan.chain) t.complete(o.id);
    expect(t.allDone).toBe(true);
    expect(t.current).toBeNull();
  });
});
