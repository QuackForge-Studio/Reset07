/**
 * RESET//07 — pure animation/body geometry logic for the player sprite
 * sheet and scaled enemy hitboxes. No Phaser imports (runs under node
 * unit tests). Sheet layout: 6 cols × 3 rows of 64px cells —
 * cols 0-1 idle, 2-3 walk, 4-5 shoot; rows 0 down, 1 side (right), 2 up.
 */

import { ENEMY_STATS, type EnemyKind } from '../data/enemies';

export type FacingRow = 'down' | 'side' | 'up';
export type PlayerAnimState = 'idle' | 'walk' | 'shoot';

export interface PlayerAnimChoice {
  state: PlayerAnimState;
  row: FacingRow;
  flipX: boolean;
}

export interface PickPlayerAnimOpts {
  firing: boolean;
  moving: boolean;
  aimAngle: number;
  moveX: number;
  moveY: number;
  last: PlayerAnimChoice;
}

export function pickPlayerAnim(opts: PickPlayerAnimOpts): PlayerAnimChoice {
  const { firing, moving, aimAngle, moveX, moveY, last } = opts;

  // state priority: standing-and-firing → shoot; moving → walk; else idle
  let state: PlayerAnimState;
  if (firing && !moving) state = 'shoot';
  else if (moving) state = 'walk';
  else state = 'idle';

  // facing: aim while firing, movement while moving, otherwise keep last
  const ang = firing ? aimAngle : moving ? Math.atan2(moveY, moveX) : null;
  if (ang === null) {
    return { state, row: last.row, flipX: last.flipX };
  }
  const ax = Math.cos(ang);
  const ay = Math.sin(ang);
  // >= : horizontal wins ties (pure diagonals face side, matching the tests)
  if (Math.abs(ax) >= Math.abs(ay)) {
    return { state, row: 'side', flipX: ax < 0 };
  }
  return { state, row: ay < 0 ? 'up' : 'down', flipX: false };
}

export interface EnemyBodyParams {
  scale: number;
  radius: number;
  offsetX: number;
  offsetY: number;
}

export function enemyBodyParams(kind: EnemyKind, frameWidth: number): EnemyBodyParams {
  const stats = ENEMY_STATS[kind];
  const scale = stats.scale;
  const radius = stats.radius * scale;
  const offset = Math.round(((frameWidth / 2) * scale - radius) * 100) / 100;
  return { scale, radius, offsetX: offset, offsetY: offset };
}
