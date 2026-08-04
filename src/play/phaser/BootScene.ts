/**
 * RESET//07 — BootScene: generates every texture, then starts the world.
 */

import Phaser from 'phaser';
import { generateAllTextures, generatePlayerSheetFallback } from './texgen';
import { createPlayerAnims } from './playerAnims';
import { queueAiSprites } from './aiArt';
import { WorldScene } from '../scenes/WorldScene';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const t0 = performance.now();
    generateAllTextures(this);
    this.load.once('complete', () => {
      if (import.meta.env.DEV) console.log(`[boot] textures generated in ${Math.round(performance.now() - t0)}ms`);
      // guarantee the player sheet + animations exist (AI art wins when provided)
      if (!this.textures.exists('player-sheet')) {
        generatePlayerSheetFallback(this);
      }
      createPlayerAnims(this);
      this.scene.start('world');
    });
    // queueAiSprites probes sheet-file availability (async) before queueing,
    // so a missing sheet file is never queued and cannot produce a loader
    // console error. Start the loader only once the queue is finalised, and
    // only if the scene is still alive (React StrictMode dev destroys the
    // first game while the probe is pending).
    void queueAiSprites(this).then(() => {
      if (this.load.state !== Phaser.Loader.LOADER_DESTROYED) this.load.start();
    });
  }
}

export function registerScenes(game: Phaser.Game): void {
  game.scene.add('boot', BootScene);
  game.scene.add('world', WorldScene);
}
