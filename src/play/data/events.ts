export type LoopEventKind = 'supply' | 'ambush';
export type DistrictId = 'service' | 'power' | 'transit' | 'yard';

export interface LoopEvent {
  district: DistrictId;
  kind: LoopEventKind;
}

export const MAX_EVENTS = 2;
export const SUPPLY_REWARD = { heat: 0, overdrive: 0.4 };
export const AMBUSH_REWARD = { overdrive: 0.3 };

/** Districts that can host loop events (garage excluded; core is the boss arena). */
export const LOOP_EVENT_DISTRICTS: DistrictId[] = ['service', 'power', 'transit', 'yard'];

/**
 * Hand-verified event spawn tiles per district (walkable, prop-free, not arena,
 * not within 2 tiles of a gate). Sourced from a grid scan of cityData.
 */
export const EVENT_SLOTS: Record<DistrictId, Array<[number, number]>> = {
  service: [[30, 69], [44, 57]],
  power: [[70, 87], [124, 87]],
  transit: [[70, 21], [124, 21]],
  yard: [[120, 56], [96, 56]],
};

/** mulberry32 — deterministic PRNG for a given integer seed. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickLoopEvents(seed: number, reachable: DistrictId[], opts?: { last?: LoopEvent }): LoopEvent[] {
  const pool = LOOP_EVENT_DISTRICTS.filter((d) => reachable.includes(d));
  if (pool.length === 0) return [];
  const last = opts?.last;
  const cands = last ? pool.filter((d) => d !== last.district) : pool;
  if (cands.length === 0) return [];

  const rng = seededRng(seed);
  const count = 1 + Math.floor(rng() * Math.min(MAX_EVENTS, cands.length));

  // shuffle candidates deterministically
  const order = [...cands];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out: LoopEvent[] = [];
  for (let i = 0; i < count; i++) {
    const district = order[i];
    const kind: LoopEventKind = rng() < 0.5 ? 'supply' : 'ambush';
    out.push({ district, kind });
  }
  return out;
}
