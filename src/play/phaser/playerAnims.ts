/**
 * RESET//07 — K-07 player animation registration.
 *
 * Sheet layout: 6 cols × 3 rows of 64px cells. Rows: 0 down, 1 side
 * (right; left is flipX), 2 up. Cols: 0-1 idle, 2-3 walk, 4-5 shoot.
 * 9 looping animations, idempotent, safe to call every boot.
 */
import Phaser from 'phaser';

const ROWS: ReadonlyArray<readonly [name: string, index: number]> = [
  ['down', 0],
  ['side', 1],
  ['up', 2],
];
const STATES: ReadonlyArray<readonly [name: string, col: number, delayMs: number]> = [
  ['idle', 0, 450],
  ['walk', 2, 140],
  ['shoot', 4, 90],
];

export function createPlayerAnims(scene: Phaser.Scene): void {
  if (!scene.textures.exists('player-sheet')) return;
  for (const [rowName, row] of ROWS) {
    for (const [state, col, delay] of STATES) {
      const key = `p-${state}-${rowName}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers('player-sheet', {
          start: row * 6 + col,
          end: row * 6 + col + 1,
        }),
        frameRate: 1000 / delay,
        repeat: -1,
      });
    }
  }
}
