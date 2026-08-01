import { describe, expect, it } from 'vitest';
import { calcDamage, ChainTracker, DEFAULT_CHAIN_RULES } from '../src/play/systems/combat';

describe('damage calculation', () => {
  it('applies overdrive mark bonus', () => {
    expect(calcDamage({ base: 10 })).toBe(10);
    expect(calcDamage({ base: 10, overdriveMarked: true })).toBe(15);
  });

  it('shield blocks fully', () => {
    expect(calcDamage({ base: 50, blockedByShield: true })).toBe(0);
  });

  it('armor reduces with a 1-damage floor', () => {
    expect(calcDamage({ base: 10, armor: 3 })).toBe(7);
    expect(calcDamage({ base: 2, armor: 5 })).toBe(1);
  });

  it('multiplier stacks', () => {
    expect(calcDamage({ base: 10, multiplier: 1.5 })).toBe(15);
    expect(calcDamage({ base: 10, overdriveMarked: true, multiplier: 1.5 })).toBe(23); // rounds
  });
});

describe('chain reaction propagation limits', () => {
  it('caps depth', () => {
    const c = new ChainTracker({ maxDepth: 3 });
    c.beginInstance();
    expect(c.canPropagate(1)).toBe(true);
    expect(c.canPropagate(2)).toBe(true);
    expect(c.canPropagate(3)).toBe(true);
    expect(c.canPropagate(4)).toBe(false);
  });

  it('never detonates the same object twice in one instance', () => {
    const c = new ChainTracker();
    c.beginInstance();
    expect(c.canPropagate(7)).toBe(true);
    expect(c.canPropagate(7)).toBe(false);
  });

  it('new instance resets the seen set', () => {
    const c = new ChainTracker();
    c.beginInstance();
    c.canPropagate(7);
    c.beginInstance();
    expect(c.canPropagate(7)).toBe(true);
  });

  it('stagger delays stay within bounds', () => {
    const c = new ChainTracker();
    for (let i = 0; i < 200; i++) {
      const d = c.nextStaggerMs();
      expect(d).toBeGreaterThanOrEqual(DEFAULT_CHAIN_RULES.staggerMinMs);
      expect(d).toBeLessThanOrEqual(DEFAULT_CHAIN_RULES.staggerMaxMs);
    }
  });

  it('caps simultaneous explosion instances', () => {
    const c = new ChainTracker({ maxSimultaneous: 4 });
    for (let i = 0; i < 4; i++) expect(c.acquireExplosion()).toBe(true);
    expect(c.acquireExplosion()).toBe(false);
    c.releaseExplosion();
    expect(c.acquireExplosion()).toBe(true);
  });

  it('depth is isolated per instance', () => {
    const c = new ChainTracker({ maxDepth: 2 });
    c.beginInstance();
    c.canPropagate(1);
    c.canPropagate(2);
    expect(c.depthReached).toBe(2);
  });
});
