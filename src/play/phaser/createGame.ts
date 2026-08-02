/**
 * RESET//07 — Phaser game factory.
 *
 * - Responsive: Scale.RESIZE tracks the container, DPR capped for mobile.
 * - The world scene is started on demand (title screen first).
 */

import Phaser from 'phaser';
import { registerScenes } from './BootScene';
import { bus } from '../bridge';

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#070A0F',
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || 960,
      height: parent.clientHeight || 600,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
        fps: 60,
      },
    },
    // `target` alone does nothing in rAF mode — on 120/144Hz displays the
    // browser fires rAF at display rate and Phaser renders every tick, so
    // the GPU works 2-2.4x harder than a 60fps game needs. `limit` (Phaser
    // 3.60+) caps update+render to 60Hz regardless of display refresh.
    // Gameplay is unchanged: logic/tweens are delta-based and arcade
    // physics already steps at its own fixed 60Hz.
    fps: { target: 60, limit: 75 },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    audio: { noAudio: true }, // we synthesize our own WebAudio graph
    input: {
      gamepad: true,
      activePointers: 3,
    },
    callbacks: {
      postBoot: () => {
        bus.emit('consoleWarn', 'boot');
      },
    },
  });
  registerScenes(game);
  game.scene.start('boot');
  return game;
}
