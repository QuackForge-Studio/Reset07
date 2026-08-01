/**
 * RESET//07 — pure combat math + chain-reaction propagation rules.
 * No Phaser imports; unit-testable.
 */

export interface DamageContext {
  base: number;
  overdriveMarked?: boolean; // marked enemies take +50%
  blockedByShield?: boolean; // fully absorbed
  armor?: number; // flat reduction, min 1
  multiplier?: number; // e.g. module/overdrive bonuses
}

export function calcDamage(ctx: DamageContext): number {
  if (ctx.blockedByShield) return 0;
  let dmg = ctx.base;
  if (ctx.overdriveMarked) dmg *= 1.5;
  if (ctx.multiplier) dmg *= ctx.multiplier;
  if (ctx.armor) dmg = Math.max(1, dmg - ctx.armor);
  return Math.max(0, Math.round(dmg));
}

export interface ChainRule {
  maxDepth: number; // how many hops one initial detonation may propagate
  maxPerFrame: number; // staggered detonations per frame
  staggerMinMs: number;
  staggerMaxMs: number;
  maxSimultaneous: number; // active explosion instances globally
}

export const DEFAULT_CHAIN_RULES: ChainRule = {
  maxDepth: 12,
  maxPerFrame: 4,
  staggerMinMs: 90,
  staggerMaxMs: 240,
  maxSimultaneous: 40,
};

/**
 * Tracks chain propagation: prevents loops, caps depth and rate.
 * An "instance" is one source explosion; each explosive object can only
 * be detonated once per instance (no infinite ping-pong).
 */
export class ChainTracker {
  private rules: ChainRule;
  private seen = new Set<number>(); // object ids detonated in current instance
  private depth = 0;
  activeExplosions = 0;

  constructor(rules: Partial<ChainRule> = {}) {
    this.rules = { ...DEFAULT_CHAIN_RULES, ...rules };
  }

  beginInstance(): void {
    this.seen.clear();
    this.depth = 0;
  }

  /** May this object detonate now, as part of the current instance? */
  canPropagate(objId: number): boolean {
    if (this.depth >= this.rules.maxDepth) return false;
    if (this.seen.has(objId)) return false;
    this.seen.add(objId);
    this.depth++;
    return true;
  }

  get depthReached(): number {
    return this.depth;
  }

  /** Stagger delay for the next hop in the chain (ms). */
  nextStaggerMs(): number {
    const { staggerMinMs, staggerMaxMs } = this.rules;
    return staggerMinMs + Math.random() * (staggerMaxMs - staggerMinMs);
  }

  acquireExplosion(): boolean {
    if (this.activeExplosions >= this.rules.maxSimultaneous) return false;
    this.activeExplosions++;
    return true;
  }

  releaseExplosion(): void {
    this.activeExplosions = Math.max(0, this.activeExplosions - 1);
  }
}
