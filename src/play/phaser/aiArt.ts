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

export interface AiSheetSpec {
  /** Phaser texture key this sheet replaces (a sprite-sheet texture). */
  key: string;
  /** Path under public/art/sprites/. */
  file: string;
  /** Grid cell size — must equal texgen canvas / physics expectations. */
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
}

export const AI_SHEETS: ReadonlyArray<AiSheetSpec> = [
  { key: 'player-sheet', file: 'player-sheet.png', frameWidth: 64, frameHeight: 64, cols: 6, rows: 3 },
];

/**
 * Queue every AI sprite/sheet for loading under temporary keys, then register
 * a handler that swaps each successfully loaded image into the texture manager
 * under its real key (replacing the procedural texture). Call once, then
 * `scene.load.start()` and wait for `complete` before starting the world.
 *
 * Async: sheet files are probed (Image element) before queueing so a missing
 * sheet file is never queued — a queued-but-missing file makes the loader log
 * `Failed to process file` (console error) at every boot. Image load failures
 * (404, SPA-fallback HTML, decode errors) are silent in the console, and the
 * probe is skipped while offline (where no AI asset can load anyway).
 * Sprite files are queued unconditionally (they exist in public/art/sprites/).
 */
export async function queueAiSprites(scene: Phaser.Scene): Promise<void> {
  // Register a single filecomplete handler (not per-file) so every queued
  // file is processed; then queue all files.
  const specs: Array<{ tmp: string; sprite?: AiSpriteSpec; sheet?: AiSheetSpec }> = [
    ...AI_SPRITES.map((s) => ({ tmp: `aix_${s.key}`, sprite: s })),
    ...AI_SHEETS.map((s) => ({ tmp: `aix_${s.key}`, sheet: s })),
  ];
  const sheetOk = new Map<string, boolean>();
  await Promise.all(
    AI_SHEETS.map(
      (sheet) =>
        new Promise<void>((resolve) => {
          // Offline there are no AI assets (the missing sheet file never
          // produced a cacheable response), so skip probing entirely: a failed
          // network request logs `Failed to load resource` to the console no
          // matter how it is issued.
          if (!navigator.onLine) {
            sheetOk.set(sheet.key, false);
            resolve();
            return;
          }
          // Probe with an Image element: load failures (404, SPA-fallback
          // HTML, decode errors) are silent in the console — unlike fetch/XHR
          // resource errors — and onload validates the file is a decodable
          // image of exactly the expected grid size.
          const img = new Image();
          img.onload = () => {
            sheetOk.set(sheet.key, img.width === sheet.cols * sheet.frameWidth && img.height === sheet.rows * sheet.frameHeight);
            resolve();
          };
          img.onerror = () => {
            sheetOk.set(sheet.key, false);
            resolve();
          };
          img.src = `art/sprites/${sheet.file}`;
        }),
    ),
  );
  // The probe resolves asynchronously; the scene may have been torn down in
  // the meantime (React StrictMode dev double-mounts the game shell, so the
  // first game is destroyed while this promise is pending). A destroyed
  // LoaderPlugin must not be touched — bail out.
  if (scene.load.state === Phaser.Loader.LOADER_DESTROYED) return;
  for (const { tmp, sprite, sheet } of specs) {
    const file = sprite ? sprite.file : sheet?.file;
    if (!file) continue;
    if (sheet && !sheetOk.get(sheet.key)) continue;
    scene.load.image(tmp, `art/sprites/${file}`);
  }
  scene.load.on('filecomplete', (key: string) => {
    const hit = specs.find((f) => f.tmp === key);
    if (!hit) return;
    if (hit.sprite) {
      const { sprite } = hit;
      const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const ok = img && img.width === sprite.width && img.height === sprite.height;
      if (!ok) {
        if (import.meta.env.DEV) console.warn(`[ai-art] skip ${sprite.key}: size mismatch`);
        scene.textures.remove(key);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = sprite.width;
      canvas.height = sprite.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      scene.textures.remove(key);
      scene.textures.remove(sprite.key);
      scene.textures.addCanvas(sprite.key, canvas);
      if (import.meta.env.DEV) console.log(`[ai-art] applied ${sprite.key} (${sprite.width}x${sprite.height})`);
      return;
    }
    if (hit.sheet) {
      const { sheet } = hit;
      const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
      const ok = img && img.width === sheet.cols * sheet.frameWidth && img.height === sheet.rows * sheet.frameHeight;
      if (!ok) {
        if (import.meta.env.DEV) console.warn(`[ai-art] skip ${sheet.key}: size mismatch`);
        scene.textures.remove(key);
        return;
      }
      scene.textures.remove(key);
      if (scene.textures.exists(sheet.key)) scene.textures.remove(sheet.key);
      scene.textures.addSpriteSheet(sheet.key, img, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
      if (import.meta.env.DEV) console.log(`[ai-art] applied ${sheet.key} (${img.width}x${img.height}, ${sheet.cols}x${sheet.rows})`);
      return;
    }
  });
}
