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
