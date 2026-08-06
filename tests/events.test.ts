import { describe, expect, it } from 'vitest';
import { seededRng, pickLoopEvents, MAX_EVENTS, SUPPLY_REWARD, AMBUSH_REWARD } from '../src/play/data/events';

describe('seededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRng(42); const b = seededRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('produces different sequences for different seeds', () => {
    const a = seededRng(1); const b = seededRng(2);
    expect(a()).not.toBe(b());
  });
});

describe('pickLoopEvents', () => {
  it('is deterministic for a seed', () => {
    const a = pickLoopEvents(7, ['service', 'power']);
    const b = pickLoopEvents(7, ['service', 'power']);
    expect(a).toEqual(b);
  });

  it('returns 1–2 events, never 0 when districts reachable', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['service', 'power', 'transit', 'yard']);
      expect(ev.length).toBeGreaterThanOrEqual(1);
      expect(ev.length).toBeLessThanOrEqual(MAX_EVENTS);
    }
  });

  it('returns 0 events when no districts are reachable', () => {
    expect(pickLoopEvents(5, [])).toEqual([]);
  });

  it('never places two events in the same district', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['service', 'power', 'transit', 'yard']);
      const districts = ev.map((e) => e.district);
      expect(new Set(districts).size).toBe(districts.length);
    }
  });

  it('only uses reachable districts', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['power', 'yard']);
      for (const e of ev) expect(['power', 'yard']).toContain(e.district);
    }
  });

  it('avoids repeating the last district immediately', () => {
    const last = { district: 'power', kind: 'ambush' as const };
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['service', 'power'], last);
      expect(ev.find((e) => e.district === 'power')).toBeUndefined();
    }
  });

  it('a supply and an ambush can coexist in the same loop', () => {
    // find a seed that yields both kinds across a sweep
    let both = false;
    for (let seed = 0; seed < 500; seed++) {
      const kinds = pickLoopEvents(seed, ['service', 'power', 'transit', 'yard']).map((e) => e.kind);
      if (kinds.includes('supply') && kinds.includes('ambush')) { both = true; break; }
    }
    expect(both).toBe(true);
  });
});

describe('rewards', () => {
  it('supply resets heat and grants 40% overdrive', () => {
    expect(SUPPLY_REWARD).toEqual({ heat: 0, overdrive: 0.4 });
  });
  it('ambush grants 30% overdrive', () => {
    expect(AMBUSH_REWARD).toEqual({ overdrive: 0.3 });
  });
});
