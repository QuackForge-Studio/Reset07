/**
 * RESET//07 — objectives: pure tracker + mission plan builder.
 * The scene asks `complete(id)` / reads `current` for the HUD + pointer.
 */

export type ObjectiveType =
  | 'reach'
  | 'rescue'
  | 'interact'
  | 'destroy'
  | 'boss'
  | 'memory'
  | 'choice'
  | 'hidden';

export interface ObjectiveDef {
  id: string;
  type: ObjectiveType;
  descKey: string; // string table key
  district: 'garage' | 'service' | 'power' | 'transit' | 'core' | 'yard';
  tile: readonly [number, number]; // target tile for the HUD pointer
  optional?: boolean;
  targetId?: string; // e.g. capsule id / object id this objective tracks
}

export interface LoopPlan {
  chain: ObjectiveDef[]; // main objectives in order
  side: ObjectiveDef[]; // optional objectives (shown when relevant)
}

export interface LoopProgress {
  loopsCompleted: number; // resets witnessed
  memories: string[];
  rescued: string[];
  routes: string[];
  hiddenObjectiveDone: boolean;
}

const O = (o: ObjectiveDef): ObjectiveDef => o;

export function buildLoopPlan(p: LoopProgress): LoopPlan {
  const first = p.loopsCompleted === 0;
  const chain: ObjectiveDef[] = [];
  const side: ObjectiveDef[] = [];

  // ── Main chain: garage → service → power → core → boss
  chain.push(O({ id: 'garageExit', type: 'reach', descKey: 'obj.reachService', district: 'garage', tile: [16, 91] }));
  if (!p.rescued.includes('capsuleA')) {
    chain.push(O({ id: 'rescueA', type: 'rescue', descKey: 'obj.rescueCapsuleA', district: 'service', tile: [38, 84], targetId: 'capsuleA' }));
  }
  chain.push(O({ id: 'stabilizeRelay', type: 'interact', descKey: 'obj.stabilizeRelay', district: 'power', tile: [92, 92], targetId: 'relay' }));
  chain.push(O({ id: 'enterCore', type: 'reach', descKey: 'obj.enterCore', district: 'core', tile: [96, 46] }));
  chain.push(O({ id: 'defeatGuardian', type: 'boss', descKey: 'obj.defeatGuardian', district: 'core', tile: [96, 52] }));

  // ── Optional / knowledge objectives
  side.push(O({ id: 'memoryService', type: 'memory', descKey: 'obj.memory', district: 'service', tile: [38, 60], targetId: 'memory:serviceGrid', optional: true }));
  side.push(O({ id: 'memoryPower', type: 'memory', descKey: 'obj.memory', district: 'power', tile: [120, 92], targetId: 'memory:powerSpikes', optional: true }));
  side.push(O({ id: 'memoryTransit', type: 'memory', descKey: 'obj.memory', district: 'transit', tile: [76, 16], targetId: 'memory:transitHalt', optional: true }));
  if (!p.rescued.includes('eli') && p.routes.includes('tram')) {
    side.push(O({ id: 'rescueEli', type: 'rescue', descKey: 'obj.rescueEli', district: 'transit', tile: [100, 30], targetId: 'eli', optional: true }));
  }
  if (p.routes.includes('maintenance') && !p.hiddenObjectiveDone) {
    side.push(O({ id: 'memoryYard', type: 'memory', descKey: 'obj.memory', district: 'yard', tile: [64, 58], targetId: 'memory:decommission', optional: true }));
    side.push(O({ id: 'hiddenCapsules', type: 'hidden', descKey: 'obj.hiddenCapsules', district: 'core', tile: [84, 56], optional: true }));
  }
  if (first) side.length = 0; // loop 1 stays lean — no side objectives yet

  return { chain, side };
}

export class ObjectiveTracker {
  plan: LoopPlan;
  index = 0;
  completed = new Set<string>();

  constructor(plan: LoopPlan) {
    this.plan = plan;
  }

  get current(): ObjectiveDef | null {
    return this.plan.chain[this.index] ?? null;
  }

  get allDone(): boolean {
    return this.current === null;
  }

  complete(id: string): boolean {
    if (this.completed.has(id)) return false;
    const cur = this.current;
    this.completed.add(id);
    if (cur && cur.id === id) {
      this.index++;
      return true;
    }
    return false;
  }

  /** Optional side objective visibility (shown if within reach of its district). */
  isSideActive(id: string): boolean {
    const side = this.plan.side.find((o) => o.id === id);
    return !!side && !this.completed.has(id);
  }

  isOptional(id: string): boolean {
    return this.plan.chain.some((o) => o.id === id && o.optional) || this.plan.side.some((o) => o.id === id);
  }

  remainingChain(): ObjectiveDef[] {
    return this.plan.chain.slice(this.index);
  }
}
