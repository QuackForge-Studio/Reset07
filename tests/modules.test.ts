import { describe, expect, it } from 'vitest';
import { canEquip, equipModule, unequipModule, MAX_EQUIPPED, MODULES } from '../src/play/data/modules';

describe('module equipping rules', () => {
  it('requires ownership', () => {
    expect(canEquip([], [], 'arc')).toBe(false);
    expect(canEquip(['arc'], [], 'arc')).toBe(true);
  });

  it('caps at two equipped', () => {
    let e = equipModule(['arc', 'cooling', 'pulse'], [], 'arc');
    e = equipModule(['arc', 'cooling', 'pulse'], e, 'cooling');
    expect(e).toEqual(['arc', 'cooling']);
    e = equipModule(['arc', 'cooling', 'pulse'], e, 'pulse');
    expect(e).toEqual(['arc', 'cooling']); // unchanged
  });

  it('refuses duplicates', () => {
    const e = equipModule(['arc'], [], 'arc');
    expect(equipModule(['arc'], e, 'arc')).toEqual(['arc']);
  });

  it('unequips', () => {
    expect(unequipModule(['arc', 'cooling'], 'arc')).toEqual(['cooling']);
    expect(unequipModule(['arc'], 'pulse')).toEqual(['arc']);
  });

  it('is immutable (no shared mutation)', () => {
    const owned = ['arc', 'cooling'];
    const e1 = equipModule(owned, [], 'arc');
    const e2 = equipModule(owned, e1, 'cooling');
    expect(e1).toEqual(['arc']);
    expect(e2).toEqual(['arc', 'cooling']);
  });

  it('defines all five modules with ids matching the module set', () => {
    expect(Object.keys(MODULES).sort()).toEqual(['arc', 'breach', 'cooling', 'pulse', 'rescue']);
    expect(MAX_EQUIPPED).toBe(2);
  });
});
