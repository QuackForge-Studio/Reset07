/**
 * RESET//07 — BootScene: generates every texture, then starts the world.
 */

import Phaser from 'phaser';
import { generateAllTextures } from './texgen';
import { queueAiSprites } from './aiArt';
import { WorldScene } from '../scenes/WorldScene';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const t0 = performance.now();
    generateAllTextures(this);
    queueAiSprites(this);
    this.load.once('complete', () => {
      if (import.meta.env.DEV) console.log(`[boot] textures generated in ${Math.round(performance.now() - t0)}ms`);
      this.scene.start('world');
    });
    this.load.start();
  }
}

export function registerScenes(game: Phaser.Game): void {
  game.scene.add('boot', BootScene);
  game.scene.add('world', WorldScene);
}
