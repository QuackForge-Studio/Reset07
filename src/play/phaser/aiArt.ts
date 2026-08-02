/**
 * RESET//07 — AI-generated art override.
 *
 * Sprites dropped into `public/art/sprites/<key>.png` override the procedural
 * texgen texture of the same key. Loaded from the BootScene before the world
 * starts. Canvas sizes are load-bearing (physics bodies are setCircle offsets
 * relative to the frame), so this only applies when the source image matches
 * the expected size — otherwise it is skipped and the procedural texture is
 * used.
 */

export interface AiSpriteSpec {
  /** Phaser texture key this sprite replaces. */
  key: string;
  /** Path under public/art/sprites/. */
  file: string;
  /** Expected canvas size in px (must match texgen + physics bodies). */
  width: number;
  height: number;
}

export const AI_SPRITES: ReadonlyArray<AiSpriteSpec> = [
  { key: 'player', file: 'player.png', width: 64, height: 64 },
  { key: 'enemy-drone', file: 'enemy-drone.png', width: 40, height: 40 },
  { key: 'enemy-hunter', file: 'enemy-hunter.png', width: 40, height: 40 },
  { key: 'enemy-shield', file: 'enemy-shield.png', width: 44, height: 44 },
  { key: 'enemy-detonator', file: 'enemy-detonator.png', width: 32, height: 32 },
  { key: 'boss', file: 'boss.png', width: 160, height: 160 },
  { key: 'boss-core', file: 'boss-core.png', width: 80, height: 80 },
  { key: 'gate', file: 'gate.png', width: 64, height: 64 },
  { key: 'core', file: 'core.png', width: 96, height: 96 },
];

/**
 * Queue every AI sprite for loading under temporary keys, then register a
 * handler that swaps each successfully loaded image into the texture manager
 * under its real key (replacing the procedural texture). Call once, then
 * `scene.load.start()` and wait for `complete` before starting the world.
 */
export function queueAiSprites(scene: Phaser.Scene): void {
  // Register a single filecomplete handler (not per-file) so every queued
  // file is processed; then queue all files.
  const files = AI_SPRITES.map((s) => ({ tmp: `aix_${s.key}`, spec: s }));
  for (const { tmp, spec } of files) {
    scene.load.image(tmp, `art/sprites/${spec.file}`);
  }
  scene.load.on('filecomplete', (key: string) => {
    const hit = files.find((f) => f.tmp === key);
    if (!hit) return;
    const { spec } = hit;
    const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const ok = img && img.width === spec.width && img.height === spec.height;
    if (!ok) {
      if (import.meta.env.DEV) console.warn(`[ai-art] skip ${spec.key}: size mismatch`);
      scene.textures.remove(key);
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = spec.width;
    canvas.height = spec.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    scene.textures.remove(key);
    scene.textures.remove(spec.key);
    scene.textures.addCanvas(spec.key, canvas);
    if (import.meta.env.DEV) console.log(`[ai-art] applied ${spec.key} (${spec.width}x${spec.height})`);
  });
}
