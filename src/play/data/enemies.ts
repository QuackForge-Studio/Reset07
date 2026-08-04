/**
 * RESET//07 — enemy balance configuration (data-driven).
 */

export type EnemyKind = 'drone' | 'hunter' | 'shield' | 'detonator';

export interface EnemyStats {
  hp: number;
  speed: number;
  radius: number;
  scale: number; // sprite + hitbox scale multiplier (visual size bump)
  touchDamage: number;
  overdriveMultiplier: number; // damage taken during overdrive mark
  weight: number; // separation mass
}

export const ENEMY_STATS: Record<EnemyKind, EnemyStats> = {
  drone: { hp: 26, speed: 138, radius: 13, scale: 1.5, touchDamage: 8, overdriveMultiplier: 1.5, weight: 1 },
  hunter: { hp: 44, speed: 262, radius: 14, scale: 1.5, touchDamage: 20, overdriveMultiplier: 1.5, weight: 1.2 },
  shield: { hp: 78, speed: 64, radius: 15, scale: 1.4, touchDamage: 12, overdriveMultiplier: 1.5, weight: 2 },
  detonator: { hp: 14, speed: 208, radius: 11, scale: 1.6, touchDamage: 10, overdriveMultiplier: 1.5, weight: 0.8 },
};

export interface BossStats {
  hp: number;
  phase2At: number; // fraction
  phase3At: number;
  moveSpeed: number;
  coreHp: number; // exposed core hp in phase 3
}

export const BOSS_STATS: BossStats = {
  hp: 1050,
  phase2At: 0.66,
  phase3At: 0.33,
  moveSpeed: 70,
  coreHp: 900,
};

/** Spawn table weights per district + loop phase. */
export const SPAWN_WEIGHTS: Record<string, Record<EnemyKind, number>> = {
  service: { drone: 3, hunter: 1, shield: 0.4, detonator: 0.3 },
  power: { drone: 2.5, hunter: 0.8, shield: 1.6, detonator: 0.8 },
  transit: { drone: 2, hunter: 1.2, shield: 0.8, detonator: 1.6 },
  yard: { drone: 2.4, hunter: 0.6, shield: 1, detonator: 1.2 },
};

/** Max concurrent ambient enemies per district (by loop phase). */
export const DISTRICT_CAPS: Record<string, [number, number, number, number]> = {
  // [CALM, RISING, DANGER, FINAL]
  service: [3, 4, 6, 7],
  power: [3, 4, 6, 8],
  transit: [3, 4, 6, 8],
  yard: [2, 3, 4, 5],
};

/** Enemy escalation: stronger enemies appear later in the loop / later loops. */
export function enemyUnlocked(kind: EnemyKind, phase: number, loop: number): boolean {
  switch (kind) {
    case 'drone':
      return true;
    case 'hunter':
      return loop >= 1 || phase >= 1;
    case 'shield':
      return loop >= 1 || phase >= 2;
    case 'detonator':
      return loop >= 2 || phase >= 2;
  }
}
