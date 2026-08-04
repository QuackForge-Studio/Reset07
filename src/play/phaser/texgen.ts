/**
 * RESET//07 — procedural texture factory.
 *
 * Every texture in the game is generated at boot from vector drawing
 * commands. No image files, no missing assets, no hotlinks.
 *
 * Art direction: silhouette-first. Every entity must be recognizable as
 * what it is from a glance — player = trooper with rifle, drone = quadcopter,
 * hunter = dart, shield = walker with front plate, detonator = mine/bomb,
 * boss = hex war machine, vehicles = top-down cars with wheels + glass.
 * Canvas sizes are fixed per key (physics body offsets depend on them).
 */

import Phaser from 'phaser';
import { PAL } from '../palette';

type G = Phaser.GameObjects.Graphics;

function mk(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: G) => void): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** radial gradient glow (white) — tint at runtime */
function glow(scene: Phaser.Scene, key: string, size = 64, inner = 1, outer = 0): void {
  mk(scene, key, size, size, (g) => {
    const r = size / 2;
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      g.fillStyle(PAL.white, inner + (outer - inner) * t);
      g.fillCircle(r, r, r * (1 - t * 0.94));
    }
  });
}

const TILE = 32;

/** filled polygon helper (points: [x, y][]). */
function poly(g: G, pts: Array<[number, number]>, close = true): void {
  g.fillPoints(
    pts.map(([x, y]) => ({ x, y })),
    close
  );
}

/** filled hexagon centered at (cx, cy), pointy-top by default. */
function hex(g: G, cx: number, cy: number, r: number, rot = Math.PI / 6): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  poly(g, pts);
}

/** stroked hexagon (uses current lineStyle). */
function hexStroke(g: G, cx: number, cy: number, r: number, rot = Math.PI / 6): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (i / 6) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  g.strokePoints(
    pts.map(([x, y]) => ({ x, y })),
    true
  );
}

/**
 * K-07 trooper (facing UP), pose 0-5: idle A, idle B, walk A, walk B,
 * shoot A, shoot B. Placeholder poses for the player sprite sheet —
 * the AI sheet (when provided) replaces the whole sheet texture.
 */
function paintPlayer(g: G, pose = 0): void {
  const bobY = pose === 1 || pose === 3 ? 1 : 0;
  const swayX = pose === 2 ? -2 : pose === 3 ? 2 : 0;
  const recoilY = pose === 4 ? 2 : pose === 5 ? 1 : 0;
  g.save();
  g.translateCanvas(swayX, bobY + recoilY);
  // backpack
  g.fillStyle(PAL.surfaceHi, 1);
  g.fillRoundedRect(26, 40, 12, 8, 2);
  g.lineStyle(1, PAL.metalHi, 1);
  g.strokeRoundedRect(26, 40, 12, 8, 2);
  // torso armor
  g.fillStyle(PAL.navy, 1);
  g.fillRoundedRect(17, 26, 30, 20, 6);
  g.lineStyle(2, PAL.metalHi, 1);
  g.strokeRoundedRect(17, 26, 30, 20, 6);
  // chest core
  g.fillStyle(PAL.cyan, 1);
  g.fillCircle(32, 34, 3);
  g.fillStyle(PAL.white, 0.9);
  g.fillCircle(33, 33, 1);
  // side arms
  g.fillStyle(PAL.metalHi, 1);
  g.fillRect(13, 30, 4, 10);
  g.fillRect(47, 30, 4, 10);
  // shoulder pads
  g.fillStyle(PAL.surfaceHi, 1);
  g.fillCircle(18, 28, 6);
  g.fillCircle(46, 28, 6);
  g.lineStyle(1.5, PAL.cyan, 0.9);
  g.strokeCircle(18, 28, 6);
  g.strokeCircle(46, 28, 6);
  // rifle (points up, carried on the right)
  g.fillStyle(PAL.metalHi, 1);
  g.fillRect(39.5, 5, 3.5, 13);
  g.fillStyle(PAL.cyan, 1);
  g.fillRect(39.5, 3.5, 3.5, 2.5); // muzzle
  g.fillStyle(PAL.white, 0.9);
  g.fillRect(40, 4, 1.5, 1.5);
  g.fillStyle(PAL.navy, 1);
  g.fillRect(42.5, 13, 2.5, 6); // stock
  g.fillStyle(PAL.surfaceHi, 1);
  g.fillCircle(41.5, 17.5, 2.5); // hand
  // helmet + visor
  g.fillStyle(PAL.navy, 1);
  g.fillCircle(32, 19, 8.5);
  g.lineStyle(2, PAL.cyan, 0.95);
  g.strokeCircle(32, 19, 8.5);
  g.fillStyle(PAL.cyan, 1);
  g.fillRoundedRect(25.5, 16.5, 13, 4, 2); // visor band
  g.fillStyle(PAL.white, 0.9);
  g.fillRect(27.5, 17.5, 3, 1.5); // visor glint
  // muzzle flash on shoot poses
  if (pose === 4 || pose === 5) {
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(41.5, 3, pose === 4 ? 3 : 2);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillCircle(41.5, 3, pose === 4 ? 1.6 : 1.1);
  }
  g.restore();
}

/**
 * Procedural placeholder K-07 sprite sheet (6×3 grid of 64px cells:
 * rows down/side/up, cols idle/walk/shoot). Generated at boot only when
 * the AI sheet is absent, so the animation state machine always has
 * frames. The real `player-sheet.png` (aiArt) replaces this texture.
 */
export function generatePlayerSheetFallback(scene: Phaser.Scene): boolean {
  if (scene.textures.exists('player-sheet')) return false;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      g.save();
      g.translateCanvas(col * 64, row * 64);
      paintPlayer(g, col); // pose == column index
      g.restore();
    }
  }
  g.generateTexture('player-sheet', 384, 192);
  g.destroy();
  // Re-register as a sprite sheet so frames are 64×64 cells. Phaser 3.60+
  // `addSpriteSheet` accepts a Texture source and only runs the frame parser,
  // reusing the texture as-is. Do NOT remove + addCanvas: `textures.remove`
  // destroys the texture, which returns the pooled canvas to CanvasPool
  // (reset to 1×1), so the re-registered sheet would parse zero frames.
  scene.textures.addSpriteSheet('player-sheet', scene.textures.get('player-sheet'), { frameWidth: 64, frameHeight: 64 });
  if (import.meta.env.DEV) console.log('[boot] procedural player sheet fallback generated');
  return true;
}

export function generateAllTextures(scene: Phaser.Scene): void {
  const s = scene;

  // ── Ground tiles ─────────────────────────────────────────
  mk(s, 't-sidewalk', TILE, TILE, (g) => {
    g.fillStyle(PAL.sidewalk, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(PAL.roadLine, 0.5);
    g.fillRect(0, 0, TILE, 1);
    g.fillRect(0, 0, 1, TILE);
    g.fillStyle(PAL.sidewalk, 1);
    g.fillRect(1, 1, TILE - 2, TILE - 2);
    g.lineStyle(1, PAL.roadLine, 0.7);
    g.strokeRect(1.5, 1.5, TILE - 3, TILE - 3);
  });
  mk(s, 't-roadH', TILE, TILE, (g) => {
    g.fillStyle(PAL.road, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, PAL.roadLine, 0.9);
    g.lineBetween(0, 2, TILE, 2); // top curb
    g.lineBetween(0, TILE - 2, TILE, TILE - 2);
    g.fillStyle(PAL.cyan, 0.5); // center dashes
    g.fillRect(0, TILE / 2 - 1, TILE, 2);
  });
  mk(s, 't-roadV', TILE, TILE, (g) => {
    g.fillStyle(PAL.road, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, PAL.roadLine, 0.9);
    g.lineBetween(2, 0, 2, TILE);
    g.lineBetween(TILE - 2, 0, TILE - 2, TILE);
    g.fillStyle(PAL.cyan, 0.5);
    g.fillRect(TILE / 2 - 1, 0, 2, TILE);
  });
  mk(s, 't-crosswalk', TILE, TILE, (g) => {
    g.fillStyle(PAL.road, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(PAL.roadLine, 1);
    for (let i = 0; i < 4; i++) g.fillRect(i * 8 + 1, 2, 5, TILE - 4);
  });
  mk(s, 't-plaza', TILE, TILE, (g) => {
    g.fillStyle(PAL.surface, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, PAL.roadLine, 0.55);
    g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.fillStyle(PAL.roadLine, 0.25);
    g.fillRect(8, 8, 2, 2);
    g.fillRect(22, 18, 2, 2);
  });
  mk(s, 't-garage', TILE, TILE, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, PAL.metalHi, 0.8);
    g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.lineStyle(1, PAL.roadLine, 0.6);
    g.lineBetween(0, 8, TILE, 8);
    g.lineBetween(0, 24, TILE, 24);
    g.fillStyle(PAL.cyan, 0.18);
    g.fillRect(1, 1, TILE - 2, 2);
  });
  // ground shown under an OPEN gate — lit passage, blends garage/road look
  mk(s, 't-door', TILE, TILE, (g) => {
    g.fillStyle(PAL.road, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, PAL.roadLine, 0.5);
    g.strokeRect(1.5, 1.5, TILE - 3, TILE - 3);
    g.lineStyle(1, PAL.roadLine, 0.35);
    g.lineBetween(0, TILE / 2, TILE, TILE / 2);
    g.fillStyle(PAL.cyan, 0.16);
    g.fillRect(1, 1, TILE - 2, 2);
    g.fillRect(1, TILE - 3, TILE - 2, 2);
  });
  // bright doorway marker over transit cross-passages
  mk(s, 't-passage', TILE, TILE, (g) => {
    g.fillStyle(PAL.surface, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(2, PAL.cyan, 0.85);
    g.strokeRect(1, 1, TILE - 2, TILE - 2);
    g.fillStyle(PAL.cyan, 0.22);
    g.fillRect(4, 4, TILE - 8, TILE - 8);
    g.fillStyle(PAL.cyan, 0.55);
    g.fillRect(TILE / 2 - 1, 7, 2, TILE - 14);
  });
  mk(s, 't-arena', TILE, TILE, (g) => {
    g.fillStyle(PAL.navy, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.lineStyle(1, PAL.magenta, 0.3);
    g.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
    g.lineStyle(1, PAL.magenta, 0.14);
    g.lineBetween(0, 16, TILE, 16);
    g.lineBetween(16, 0, 16, TILE);
  });
  // hazard-marked tile (warning strips) for yard edges
  mk(s, 't-hazard', TILE, TILE, (g) => {
    g.fillStyle(PAL.surface, 1);
    g.fillRect(0, 0, TILE, TILE);
    g.fillStyle(PAL.amber, 0.5);
    g.fillRect(0, 0, 12, 4);
    g.fillRect(16, 0, 12, 4);
    g.fillRect(8, 28, 12, 4);
  });

  // tileable rooftop variants (used via TileSprite — no per-building textures)
  const roofBase = (g: G, clutter: Array<[number, number, number, number]>) => {
    g.fillStyle(PAL.building, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, PAL.buildingEdge, 0.5);
    g.strokeRect(0.5, 0.5, 63, 63);
    g.lineStyle(1, PAL.buildingEdge, 0.22);
    g.lineBetween(0, 16, 64, 16);
    g.lineBetween(0, 32, 64, 32);
    g.lineBetween(0, 48, 64, 48);
    g.lineBetween(16, 0, 16, 64);
    g.lineBetween(32, 0, 32, 64);
    g.lineBetween(48, 0, 48, 64);
    for (const [cx, cy, w, h] of clutter) {
      g.fillStyle(PAL.metalHi, 0.9);
      g.fillRect(cx, cy, w, h);
      g.fillStyle(PAL.black, 0.5);
      g.fillCircle(cx + w / 2, cy + h / 2, Math.min(w, h) * 0.18);
    }
  };
  mk(s, 'roof-1', 64, 64, (g) => roofBase(g, [[20, 20, 10, 10], [44, 36, 8, 8], [8, 46, 12, 6]]));
  mk(s, 'roof-2', 64, 64, (g) => roofBase(g, [[12, 12, 8, 8], [34, 30, 14, 10], [50, 8, 6, 6], [20, 50, 10, 8]]));
  mk(s, 'roof-3', 64, 64, (g) => roofBase(g, [[40, 14, 12, 8], [10, 28, 16, 6], [28, 46, 8, 8], [54, 44, 6, 14]]));
  mk(s, 'roof-edge', 32, 4, (g) => {
    g.fillStyle(PAL.white, 1);
    g.fillRect(0, 0, 32, 4);
  });

  // ── Player K-07: trooper with rifle, facing UP ───────────
  mk(s, 'player', 64, 64, (g) => {
    paintPlayer(g);
  });
  mk(s, 'player-od', 64, 64, (g) => {
    g.fillStyle(PAL.white, 0.35);
    g.fillCircle(32, 32, 19);
    g.lineStyle(2, PAL.white, 0.85);
    g.strokeCircle(32, 32, 19);
  });

  // ── Enemies (front = +X; sprites rotate to face the player) ──
  mk(s, 'enemy-drone', 40, 40, (g) => {
    const c = 20;
    // rotor arms (diagonals)
    g.lineStyle(2, PAL.metalHi, 0.9);
    g.lineBetween(c - 5, c - 5, 7, 7);
    g.lineBetween(c + 5, c - 5, 33, 7);
    g.lineBetween(c - 5, c + 5, 7, 33);
    g.lineBetween(c + 5, c + 5, 33, 33);
    // rotor disks
    for (const [rx, ry] of [[7, 7], [33, 7], [7, 33], [33, 33]] as const) {
      g.fillStyle(PAL.navy, 1);
      g.fillCircle(rx, ry, 4);
      g.lineStyle(1.5, PAL.cyan, 0.8);
      g.strokeCircle(rx, ry, 4);
      g.fillStyle(PAL.cyan, 0.5);
      g.fillCircle(rx, ry, 1.5);
    }
    // central body
    g.fillStyle(PAL.navy, 1);
    g.fillRoundedRect(c - 9, c - 9, 18, 18, 4);
    g.lineStyle(2, PAL.cyan, 0.85);
    g.strokeRoundedRect(c - 9, c - 9, 18, 18, 4);
    g.lineStyle(1, PAL.metalHi, 0.7);
    g.lineBetween(c - 5, c - 4, c + 5, c - 4);
    // eye (magenta — hostile)
    g.fillStyle(PAL.magenta, 1);
    g.fillCircle(c - 1, c + 1, 3);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c - 2, c, 1);
    // gun pods (forward = right)
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(c + 8, c - 5, 5, 3);
    g.fillRect(c + 8, c + 2, 5, 3);
    g.fillStyle(PAL.orange, 0.9);
    g.fillRect(c + 11, c - 5, 2, 3);
    g.fillRect(c + 11, c + 2, 2, 3);
  });
  mk(s, 'enemy-hunter', 40, 40, (g) => {
    // rear fins
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(3, 6, 7, 3);
    g.fillRect(3, 31, 7, 3);
    // dart hull (forward = right)
    g.fillStyle(PAL.navy, 1);
    poly(g, [[7, 9], [7, 31], [34, 20]]);
    g.lineStyle(2, PAL.danger, 0.9);
    g.strokePoints([{ x: 7, y: 9 }, { x: 7, y: 31 }, { x: 34, y: 20 }], true);
    // center spine
    g.lineStyle(2, PAL.metalHi, 0.9);
    g.lineBetween(11, 20, 26, 20);
    // danger core
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(18, 20, 4.5);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(17, 19, 1.8);
  });
  mk(s, 'enemy-shield', 44, 44, (g) => {
    const c = 22;
    // rear wheels
    g.fillStyle(PAL.black, 0.9);
    g.fillCircle(11, 35, 3);
    g.fillCircle(29, 35, 3);
    g.lineStyle(1, PAL.metalHi, 0.8);
    g.strokeCircle(11, 35, 3);
    g.strokeCircle(29, 35, 3);
    // armored hull (hex)
    g.fillStyle(PAL.navy, 1);
    hex(g, c, c - 2, 13.5);
    g.lineStyle(2, PAL.amber, 0.9);
    hexStroke(g, c, c - 2, 13.5);
    g.lineStyle(1, PAL.metalHi, 0.7);
    hexStroke(g, c, c - 2, 8.5);
    // amber eye
    g.fillStyle(PAL.amber, 1);
    g.fillCircle(c - 2, c - 2, 3);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c - 3, c - 3, 1.2);
    // front shield plate (forward = right)
    g.fillStyle(PAL.cyan, 0.35);
    g.fillRoundedRect(c + 8, c - 16, 9, 32, 3);
    g.lineStyle(2, PAL.cyan, 0.95);
    g.strokeRoundedRect(c + 8, c - 16, 9, 32, 3);
    g.lineStyle(1, PAL.white, 0.5);
    g.lineBetween(c + 11, c - 12, c + 11, c + 12);
  });
  mk(s, 'enemy-detonator', 32, 32, (g) => {
    const c = 16;
    // fuse antenna
    g.lineStyle(1.5, PAL.metalHi, 1);
    g.lineBetween(c, 8, c, 3);
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(c, 3, 1.8);
    // body
    g.fillStyle(PAL.navy, 1);
    g.fillCircle(c, c, 10.5);
    g.lineStyle(2, PAL.danger, 1);
    g.strokeCircle(c, c, 10.5);
    // hazard chevrons (top / bottom)
    g.fillStyle(PAL.amber, 0.9);
    poly(g, [[c - 4, 9], [c + 4, 9], [c, 13.5]]);
    poly(g, [[c - 4, 23], [c + 4, 23], [c, 18.5]]);
    // ticking core
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(c, c, 4.5);
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(c - 1, c - 1, 2);
    // feet
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(c - 6, 26, 4, 3);
    g.fillRect(c + 2, 26, 4, 3);
  });
  // shield arc (runtime rotated)
  mk(s, 'shield-arc', 64, 64, (g) => {
    g.lineStyle(6, PAL.cyan, 0.85);
    g.beginPath();
    g.arc(32, 32, 26, -1.1, 1.1);
    g.strokePath();
    g.lineStyle(3, PAL.white, 0.6);
    g.beginPath();
    g.arc(32, 32, 26, -0.9, 0.9);
    g.strokePath();
  });
  // boss: Core Guardian — hex war machine (does not rotate)
  mk(s, 'boss', 160, 160, (g) => {
    const c = 80;
    // hull
    g.fillStyle(PAL.navy, 1);
    hex(g, c, c, 58);
    g.lineStyle(6, PAL.magenta, 0.95);
    hexStroke(g, c, c, 58);
    // radial armor wedges
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      g.fillStyle(PAL.magenta, 0.09);
      poly(g, [
        [c, c],
        [c + Math.cos(a) * 34, c + Math.sin(a) * 34],
        [c + Math.cos(a + Math.PI / 3) * 34, c + Math.sin(a + Math.PI / 3) * 34],
      ]);
    }
    // armor panel lines
    g.lineStyle(3, PAL.magenta, 0.4);
    hexStroke(g, c, c, 46);
    g.lineStyle(2, PAL.magenta, 0.28);
    hexStroke(g, c, c, 33);
    // bolt dots on inner ring
    g.fillStyle(PAL.metalHi, 1);
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      g.fillCircle(c + Math.cos(a) * 46, c + Math.sin(a) * 46, 2);
    }
    // rim turret pods
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      const px = c + Math.cos(a) * 48;
      const py = c + Math.sin(a) * 48;
      g.fillStyle(PAL.metalHi, 1);
      g.fillCircle(px, py, 9);
      g.lineStyle(2, PAL.magenta, 0.85);
      g.strokeCircle(px, py, 9);
      g.fillStyle(PAL.danger, 0.95);
      g.fillCircle(px, py, 3.5);
      g.fillStyle(PAL.white, 0.85);
      g.fillCircle(px - 1, py - 1, 1.2);
    }
    // central core eye
    g.fillStyle(PAL.magenta, 0.22);
    g.fillCircle(c, c, 18);
    g.lineStyle(3, PAL.magenta, 0.9);
    g.strokeCircle(c, c, 18);
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(c, c, 8);
    g.fillStyle(PAL.magenta, 1);
    g.fillCircle(c, c, 4.5);
  });
  mk(s, 'boss-core', 80, 80, (g) => {
    const c = 40;
    // pulse rings
    g.lineStyle(3, PAL.magenta, 0.4);
    g.strokeCircle(c, c, 30);
    g.lineStyle(2, PAL.magenta, 0.65);
    g.strokeCircle(c, c, 22);
    // glow + orb
    g.fillStyle(PAL.magenta, 0.2);
    g.fillCircle(c, c, 19);
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(c, c, 11);
    g.fillStyle(PAL.magenta, 1);
    g.fillCircle(c, c, 6);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c - 2.5, c - 2.5, 2.5);
    // quadrant ticks
    g.fillStyle(PAL.magenta, 0.8);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
      g.fillCircle(c + Math.cos(a) * 30, c + Math.sin(a) * 30, 2);
    }
  });

  // ── Projectiles ──────────────────────────────────────────
  mk(s, 'bullet', 24, 10, (g) => {
    g.fillStyle(PAL.cyan, 1);
    g.fillRoundedRect(0, 1, 22, 8, 4);
    g.fillStyle(PAL.white, 1);
    g.fillRoundedRect(0, 2, 14, 6, 3);
  });
  mk(s, 'bullet-enemy', 16, 8, (g) => {
    g.fillStyle(PAL.orange, 1);
    g.fillRoundedRect(0, 0, 14, 8, 4);
    g.fillStyle(PAL.white, 0.9);
    g.fillRoundedRect(0, 1, 8, 6, 3);
  });
  mk(s, 'bullet-heavy', 28, 14, (g) => {
    g.fillStyle(PAL.magenta, 1);
    g.fillRoundedRect(0, 0, 26, 14, 6);
    g.fillStyle(PAL.white, 0.9);
    g.fillRoundedRect(0, 2, 16, 10, 5);
  });

  // ── Pickups / interactables ──────────────────────────────
  mk(s, 'memory', 32, 36, (g) => {
    g.fillStyle(PAL.cyan, 0.35);
    poly(g, [[16, 2], [28, 18], [16, 34], [4, 18]]);
    g.fillStyle(PAL.cyan, 1);
    poly(g, [[16, 5], [25, 18], [16, 31], [7, 18]]);
    // circuit traces
    g.lineStyle(1, PAL.white, 0.7);
    g.lineBetween(16, 5, 16, 12);
    g.lineBetween(10, 18, 16, 18);
    g.lineBetween(16, 18, 22, 18);
    // core + base pins
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(16, 18, 3.5);
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(12, 33, 3, 3);
    g.fillRect(17, 33, 3, 3);
  });
  mk(s, 'capsule', 56, 72, (g) => {
    // pod body
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(4, 4, 48, 64, 10);
    g.lineStyle(3, PAL.cyan, 0.9);
    g.strokeRoundedRect(4, 4, 48, 64, 10);
    // top fixture + side pipes
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRect(24, 0, 8, 6);
    g.fillRect(2, 18, 3, 20);
    g.fillRect(51, 18, 3, 20);
    // glass window
    g.fillStyle(PAL.cyan, 0.14);
    g.fillRoundedRect(12, 12, 32, 48, 6);
    g.lineStyle(1.5, PAL.cyan, 0.5);
    g.strokeRoundedRect(12, 12, 32, 48, 6);
    // occupant silhouette
    g.fillStyle(PAL.cyan, 0.85);
    g.fillCircle(28, 25, 5); // head
    g.fillRect(25, 32, 6, 15); // body
    g.fillRect(22.5, 34, 3, 8); // left arm
    g.fillRect(32.5, 34, 3, 8); // right arm
    g.fillStyle(PAL.cyan, 0.4);
    g.fillRect(26, 47, 4, 4);
    // base pads
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(8, 68, 8, 4);
    g.fillRect(40, 68, 8, 4);
  });
  mk(s, 'evac', 48, 56, (g) => {
    // beacon head
    g.fillStyle(PAL.teal, 0.25);
    g.fillCircle(24, 12, 10);
    g.fillStyle(PAL.teal, 1);
    g.fillCircle(24, 12, 6.5);
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(24, 12, 3);
    // pole
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(22, 18, 4, 24);
    // base with up-chevrons (evac = escape upward)
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(10, 42, 28, 11, 3);
    g.lineStyle(2, PAL.teal, 0.9);
    g.strokeRoundedRect(10, 42, 28, 11, 3);
    g.fillStyle(PAL.teal, 0.95);
    poly(g, [[24, 45], [21, 49], [27, 49]]);
    poly(g, [[24, 49.5], [21, 53.5], [27, 53.5]]);
  });
  mk(s, 'relay', 56, 72, (g) => {
    // mast
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(25, 8, 6, 48);
    // crossbars at top
    g.lineStyle(2, PAL.metalHi, 1);
    g.lineBetween(15, 10, 41, 10);
    g.lineBetween(24, 4, 32, 4);
    g.fillStyle(PAL.amber, 1);
    g.fillCircle(28, 4, 2);
    // dish (facing up-right)
    g.lineStyle(2.5, PAL.orange, 0.9);
    g.beginPath();
    g.arc(42, 18, 8, -0.9, 0.9);
    g.strokePath();
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(42, 18, 2.2);
    // signal ripples
    g.lineStyle(1.5, PAL.orange, 0.35);
    g.strokeCircle(42, 18, 11);
    g.strokeCircle(42, 18, 14.5);
    // base
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(14, 56, 28, 11, 3);
    g.lineStyle(2, PAL.orange, 0.9);
    g.strokeRoundedRect(14, 56, 28, 11, 3);
    g.fillStyle(PAL.orange, 0.5);
    g.fillCircle(28, 61.5, 3.5);
  });
  mk(s, 'uplink', 56, 88, (g) => {
    // tapered tower
    g.fillStyle(PAL.metal, 1);
    poly(g, [[24, 10], [32, 10], [35, 82], [21, 82]]);
    g.lineStyle(1, PAL.metalHi, 1);
    g.strokePoints([{ x: 24, y: 10 }, { x: 32, y: 10 }, { x: 35, y: 82 }, { x: 21, y: 82 }], true);
    // cross braces
    g.lineStyle(1.5, PAL.metalHi, 0.75);
    g.lineBetween(22.5, 30, 33.5, 30);
    g.lineBetween(21.8, 48, 34.2, 48);
    g.lineBetween(21, 66, 35, 66);
    g.lineStyle(1, PAL.metalHi, 0.35);
    g.lineBetween(24, 30, 30.5, 48);
    g.lineBetween(30.5, 30, 24, 48);
    g.lineBetween(23, 48, 32, 66);
    g.lineBetween(32, 48, 23, 66);
    // dishes (left = cyan, right = magenta)
    g.lineStyle(2.5, PAL.cyan, 0.75);
    g.beginPath();
    g.arc(10, 27, 9, 1.2, 4.4);
    g.strokePath();
    g.fillStyle(PAL.cyan, 1);
    g.fillCircle(10, 27, 2.2);
    g.lineStyle(2.5, PAL.magenta, 0.75);
    g.beginPath();
    g.arc(46, 41, 10, -1.0, 1.0);
    g.strokePath();
    g.fillStyle(PAL.magenta, 1);
    g.fillCircle(46, 41, 2.4);
    // beacon
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(28, 7, 2.5);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(28, 7, 1);
    // base
    g.fillStyle(PAL.metalHi, 1);
    g.fillRoundedRect(10, 82, 36, 6, 2);
  });

  // ── Vehicles (top-down, front = +X) ──────────────────────
  const vehicleBase = (g: G, w: number, h: number) => {
    // 4 tires
    g.fillStyle(PAL.black, 1);
    g.fillRoundedRect(3, 2, 7, 4, 1);
    g.fillRoundedRect(w - 10, 2, 7, 4, 1);
    g.fillRoundedRect(3, h - 6, 7, 4, 1);
    g.fillRoundedRect(w - 10, h - 6, 7, 4, 1);
    // body
    g.fillStyle(PAL.surfaceHi, 1);
    g.fillRoundedRect(3, 5, w - 6, h - 10, 4);
    g.lineStyle(1.5, PAL.metalHi, 1);
    g.strokeRoundedRect(3, 5, w - 6, h - 10, 4);
  };
  mk(s, 'vehicle-car', 44, 24, (g) => {
    vehicleBase(g, 44, 24);
    // rear window + windshield (front = right)
    g.fillStyle(PAL.cyan, 0.2);
    g.fillRect(7, 7, 8, 10);
    g.fillStyle(PAL.cyan, 0.4);
    g.fillRect(30, 7, 8, 10);
    // roof panel
    g.fillStyle(PAL.surface, 1);
    g.fillRoundedRect(17, 8, 10, 8, 2);
    g.lineStyle(1, PAL.metalHi, 0.7);
    g.strokeRoundedRect(17, 8, 10, 8, 2);
    // lights
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRect(40, 10, 3, 4);
    g.fillStyle(PAL.danger, 0.85);
    g.fillRect(1, 10, 3, 4);
  });
  mk(s, 'vehicle-van', 56, 28, (g) => {
    vehicleBase(g, 56, 28);
    // cargo box (van rear)
    g.fillStyle(PAL.surface, 1);
    g.fillRoundedRect(6, 8, 36, 12, 2);
    g.lineStyle(1, PAL.metalHi, 0.7);
    g.strokeRoundedRect(6, 8, 36, 12, 2);
    // cargo ribs
    g.lineStyle(1, PAL.metalHi, 0.5);
    for (let i = 1; i < 4; i++) g.lineBetween(6 + i * 9, 8, 6 + i * 9, 20);
    // windshield + side door seam
    g.fillStyle(PAL.cyan, 0.4);
    g.fillRect(43, 8, 8, 12);
    g.lineStyle(1, PAL.metalHi, 0.6);
    g.lineBetween(38, 8, 38, 20);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRect(51, 12, 3, 4);
    g.fillStyle(PAL.danger, 0.85);
    g.fillRect(2, 12, 3, 4);
  });
  mk(s, 'vehicle-truck', 72, 32, (g) => {
    vehicleBase(g, 72, 32);
    // cargo container
    g.fillStyle(PAL.surface, 1);
    g.fillRoundedRect(5, 6, 46, 20, 2);
    g.lineStyle(1.5, PAL.metalHi, 0.8);
    g.strokeRoundedRect(5, 6, 46, 20, 2);
    g.lineStyle(1, PAL.metalHi, 0.5);
    for (let i = 1; i < 6; i++) g.lineBetween(5 + i * 7.7, 6, 5 + i * 7.7, 26);
    // cab (front = right)
    g.fillStyle(PAL.surfaceHi, 1);
    g.fillRoundedRect(53, 6, 14, 20, 3);
    g.lineStyle(1.5, PAL.metalHi, 1);
    g.strokeRoundedRect(53, 6, 14, 20, 3);
    g.fillStyle(PAL.cyan, 0.4);
    g.fillRect(57, 8, 8, 10);
    // lights
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRect(67, 13, 3, 5);
    g.fillStyle(PAL.danger, 0.85);
    g.fillRect(2, 13, 3, 5);
  });
  mk(s, 'vehicle-damaged', 56, 30, (g) => {
    vehicleBase(g, 56, 30);
    g.fillStyle(PAL.cyan, 0.3);
    g.fillRect(38, 8, 9, 12); // cracked windshield
    g.lineStyle(1, PAL.white, 0.6);
    g.lineBetween(40, 8, 44, 20);
    g.lineBetween(42, 8, 41, 20);
    // scorch + fire + blown-out panel
    g.fillStyle(PAL.scorch, 0.85);
    g.fillRect(5, 4, 26, 22);
    g.fillStyle(PAL.black, 1);
    g.fillRect(24, 9, 10, 5);
    g.fillStyle(PAL.orange, 0.9);
    g.fillCircle(18, 10, 5);
    g.fillStyle(PAL.white, 0.7);
    g.fillCircle(17, 9, 2);
    // wheels gone on the scorched side
    g.fillStyle(PAL.scorch, 1);
    g.fillRect(3, 2, 7, 4);
    g.fillRect(3, 24, 7, 4);
  });
  mk(s, 'wreck', 56, 30, (g) => {
    // charred husk
    g.fillStyle(PAL.scorch, 1);
    g.fillRoundedRect(3, 4, 50, 22, 5);
    g.lineStyle(1.5, PAL.metalHi, 0.5);
    g.strokeRoundedRect(3, 4, 50, 22, 5);
    // broken glass frame
    g.fillStyle(PAL.black, 1);
    g.fillRect(38, 8, 9, 10);
    g.lineStyle(1, PAL.metalHi, 0.6);
    g.lineBetween(38, 8, 47, 18);
    // holes + bent metal slivers
    g.fillRect(10, 6, 12, 4);
    g.fillRect(20, 16, 8, 3);
    g.fillStyle(PAL.metalHi, 0.8);
    g.fillRect(8, 10, 3, 6);
    g.fillRect(26, 7, 6, 2);
    // embers
    g.fillStyle(PAL.orange, 0.35);
    g.fillCircle(44, 10, 4);
    g.fillStyle(PAL.orange, 0.5);
    g.fillCircle(15, 21, 3);
    g.fillStyle(PAL.danger, 0.4);
    g.fillCircle(34, 18, 2.5);
  });

  // ── Environment props ────────────────────────────────────
  mk(s, 'tank', 44, 44, (g) => {
    const c = 22;
    // cylindrical tank body (top-down)
    g.fillStyle(PAL.metal, 1);
    g.fillCircle(c, c, 16);
    g.lineStyle(2.5, PAL.metalHi, 1);
    g.strokeCircle(c, c, 16);
    g.lineStyle(1.5, PAL.metalHi, 0.8);
    g.strokeCircle(c, c, 11);
    // hazard chevrons (sides)
    g.fillStyle(PAL.amber, 0.85);
    poly(g, [[6, 17.5], [12, 22], [6, 26.5]]);
    poly(g, [[38, 17.5], [32, 22], [38, 26.5]]);
    // filler cap
    g.fillStyle(PAL.surfaceHi, 1);
    g.fillCircle(c, c, 5);
    g.lineStyle(1.5, PAL.cyan, 0.9);
    g.strokeCircle(c, c, 5);
    g.fillStyle(PAL.cyan, 0.8);
    g.fillRect(20.5, 21.5, 3, 1.5);
  });
  mk(s, 'pipe-h', 64, 20, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(0, 6, 64, 8, 4);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRoundedRect(0, 6, 64, 8, 4);
    // flanges
    g.lineStyle(2, PAL.metalHi, 1);
    g.lineBetween(10, 5, 10, 15);
    g.lineBetween(54, 5, 54, 15);
    g.fillStyle(PAL.cyan, 0.35);
    g.fillCircle(6, 10, 2);
    g.fillCircle(32, 10, 2);
    g.fillCircle(58, 10, 2);
  });
  mk(s, 'pipe-v', 20, 64, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(6, 0, 8, 64, 4);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRoundedRect(6, 0, 8, 64, 4);
    g.lineStyle(2, PAL.metalHi, 1);
    g.lineBetween(5, 10, 15, 10);
    g.lineBetween(5, 54, 15, 54);
    g.fillStyle(PAL.cyan, 0.35);
    g.fillCircle(10, 6, 2);
    g.fillCircle(10, 32, 2);
    g.fillCircle(10, 58, 2);
  });
  mk(s, 'pipe-leak', 64, 20, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(0, 6, 64, 8, 4);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRoundedRect(0, 6, 64, 8, 4);
    g.fillStyle(PAL.teal, 0.5);
    g.fillCircle(14, 10, 3);
    g.fillStyle(PAL.teal, 0.25);
    g.fillCircle(14, 10, 6);
    g.fillStyle(PAL.teal, 0.7);
    g.fillCircle(14, 16, 1.5);
  });
  mk(s, 'transformer', 48, 40, (g) => {
    // cabinet
    g.fillStyle(PAL.metal, 1);
    g.fillRect(6, 2, 36, 32);
    g.lineStyle(2.5, PAL.metalHi, 1);
    g.strokeRect(6, 2, 36, 32);
    // lid seam + handle
    g.lineStyle(1.5, PAL.metalHi, 0.8);
    g.lineBetween(6, 14, 42, 14);
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(30, 8, 7, 3);
    // vent slots
    g.fillStyle(PAL.black, 0.85);
    g.fillRect(10, 19, 28, 3);
    g.fillRect(10, 24, 28, 3);
    g.fillRect(10, 29, 28, 3);
    g.lineStyle(1, PAL.metalHi, 0.5);
    g.lineBetween(10, 22, 38, 22);
    g.lineBetween(10, 27, 38, 27);
    // amber warning beacon
    g.fillStyle(PAL.amber, 1);
    g.fillCircle(24, 36, 4);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(24, 36, 1.6);
  });
  mk(s, 'puddle', 48, 48, (g) => {
    g.fillStyle(PAL.cyan, 0.16);
    g.fillEllipse(24, 24, 44, 34);
    g.lineStyle(2, PAL.cyan, 0.28);
    g.strokeEllipse(24, 24, 44, 34);
    g.fillStyle(PAL.white, 0.1);
    g.fillEllipse(20, 20, 10, 6);
  });
  mk(s, 'lamp', 16, 64, (g) => {
    // pole
    g.fillStyle(PAL.metal, 1);
    g.fillRect(6, 14, 4, 48);
    g.fillStyle(PAL.metalHi, 0.7);
    g.fillRect(6, 14, 1.5, 48);
    // arm (light head hangs over the street side)
    g.fillRect(7, 11, 8, 3);
    // head
    g.fillStyle(PAL.cyan, 0.22);
    g.fillCircle(14, 11, 5.5);
    g.fillStyle(PAL.metalHi, 1);
    g.fillRoundedRect(10, 9, 5, 4, 1);
    g.fillStyle(PAL.cyan, 0.95);
    g.fillCircle(14, 11, 2.4);
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(14, 11, 1);
    // base plate
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(4, 60, 8, 4);
  });
  mk(s, 'sign', 80, 24, (g) => {
    // posts
    g.fillStyle(PAL.metal, 1);
    g.fillRect(7, 18, 3, 6);
    g.fillRect(70, 18, 3, 6);
    // panel
    g.fillStyle(PAL.navy, 0.95);
    g.fillRoundedRect(0, 2, 80, 20, 3);
    g.lineStyle(3, PAL.cyan, 0.9);
    g.strokeRoundedRect(0, 2, 80, 20, 3);
    // title line + subtitle
    g.fillStyle(PAL.white, 0.85);
    g.fillRect(8, 7, 26, 3.5);
    g.fillStyle(PAL.white, 0.55);
    g.fillRect(8, 13.5, 18, 3);
    // arrow glyph
    g.fillStyle(PAL.cyan, 0.95);
    poly(g, [[41, 8], [52, 12], [41, 16]]);
    g.fillStyle(PAL.cyan, 0.5);
    g.fillRect(50, 11, 22, 2);
  });
  mk(s, 'barrier', 64, 16, (g) => {
    // legs
    g.fillStyle(PAL.metal, 1);
    g.fillRect(3, 12, 4, 4);
    g.fillRect(57, 12, 4, 4);
    // rail
    g.fillStyle(PAL.orange, 0.9);
    g.fillRect(0, 3, 64, 9);
    // white diagonal stripes
    g.fillStyle(PAL.white, 0.92);
    for (let i = 0; i < 7; i++) {
      poly(g, [[i * 10, 3], [i * 10 + 6, 3], [i * 10 + 2, 12], [i * 10 - 4, 12]]);
    }
  });
  mk(s, 'debris-a', 24, 24, (g) => {
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(2, 10, 10, 8);
    g.fillRect(8, 4, 12, 6);
    g.fillStyle(PAL.metal, 1);
    g.fillRect(14, 12, 8, 8);
  });
  mk(s, 'debris-b', 24, 24, (g) => {
    g.fillStyle(PAL.metalHi, 1);
    g.fillTriangle(4, 16, 4, 8, 16, 16);
    g.fillStyle(PAL.metal, 1);
    g.fillRect(12, 4, 8, 8);
  });
  mk(s, 'crate', 24, 24, (g) => {
    // box
    g.fillStyle(PAL.metal, 1);
    g.fillRect(2, 2, 20, 20);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRect(2, 2, 20, 20);
    // cross bracing
    g.lineStyle(1, PAL.cyan, 0.4);
    g.lineBetween(2, 12, 22, 12);
    g.lineBetween(12, 2, 12, 22);
    // corner brackets
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(2, 2, 5, 2);
    g.fillRect(17, 2, 5, 2);
    g.fillRect(2, 20, 5, 2);
    g.fillRect(17, 20, 5, 2);
  });
  mk(s, 'bench', 40, 20, (g) => {
    // seat slats
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(4, 5, 32, 2);
    g.fillRect(4, 8, 32, 2);
    g.fillRect(4, 11, 32, 2);
    // frame
    g.lineStyle(1.5, PAL.metal, 1);
    g.strokeRect(3.5, 4.5, 33, 9);
    // legs
    g.fillStyle(PAL.metal, 1);
    g.fillRect(6, 14, 4, 5);
    g.fillRect(30, 14, 4, 5);
  });
  mk(s, 'chargepad', 64, 64, (g) => {
    // pad
    g.fillStyle(PAL.navy, 1);
    g.fillRoundedRect(4, 4, 56, 56, 8);
    g.lineStyle(2.5, PAL.cyan, 0.8);
    g.strokeRoundedRect(4, 4, 56, 56, 8);
    // corner bolts
    g.fillStyle(PAL.metalHi, 1);
    g.fillCircle(10, 10, 2);
    g.fillCircle(54, 10, 2);
    g.fillCircle(10, 54, 2);
    g.fillCircle(54, 54, 2);
    // inner ring + center
    g.lineStyle(2, PAL.cyan, 0.5);
    g.strokeCircle(32, 32, 18);
    g.fillStyle(PAL.cyan, 0.12);
    g.fillCircle(32, 32, 9);
    // inward chevrons
    g.fillStyle(PAL.cyan, 0.5);
    poly(g, [[24, 14], [40, 14], [32, 22]]);
    poly(g, [[24, 50], [40, 50], [32, 42]]);
    poly(g, [[14, 24], [14, 40], [22, 32]]);
    poly(g, [[50, 24], [50, 40], [42, 32]]);
  });
  mk(s, 'vent', 40, 40, (g) => {
    // frame
    g.fillStyle(PAL.metal, 1);
    g.fillRect(6, 6, 28, 28);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRect(6, 6, 28, 28);
    // dark opening
    g.fillStyle(PAL.black, 0.85);
    g.fillRect(10, 10, 20, 20);
    // slats
    g.lineStyle(1.5, PAL.metalHi, 0.85);
    for (let i = 0; i < 5; i++) g.lineBetween(10, 13 + i * 4, 30, 13 + i * 4);
    // corner screws
    g.fillStyle(PAL.metalHi, 1);
    g.fillCircle(8, 8, 1.5);
    g.fillCircle(32, 8, 1.5);
    g.fillCircle(8, 32, 1.5);
    g.fillCircle(32, 32, 1.5);
  });
  mk(s, 'scorch', 64, 64, (g) => {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 14 + Math.random() * 12;
      g.fillStyle(PAL.scorch, 0.16 + Math.random() * 0.14);
      g.fillCircle(32 + Math.cos(a) * r * 0.5, 32 + Math.sin(a) * r * 0.5, 5 + Math.random() * 8);
    }
    g.fillStyle(PAL.scorch, 0.5);
    g.fillCircle(32, 32, 14);
    g.fillStyle(PAL.scorch, 0.3);
    g.fillCircle(32, 32, 22);
  });
  mk(s, 'gate', 64, 64, (g) => {
    // frame
    g.lineStyle(4, PAL.cyan, 0.95);
    g.strokeRect(1, 1, 62, 62);
    // two sliding panels
    g.fillStyle(PAL.metal, 1);
    g.fillRect(4, 4, 27, 56);
    g.fillRect(33, 4, 27, 56);
    g.lineStyle(1.5, PAL.metalHi, 0.8);
    g.strokeRect(4, 4, 27, 56);
    g.strokeRect(33, 4, 27, 56);
    // diagonal braces
    g.lineStyle(2, PAL.metalHi, 0.55);
    g.lineBetween(6, 6, 29, 58);
    g.lineBetween(29, 6, 6, 58);
    g.lineBetween(35, 6, 58, 58);
    g.lineBetween(58, 6, 35, 58);
    // center seam + lock
    g.lineStyle(1.5, PAL.black, 0.6);
    g.lineBetween(32, 4, 32, 60);
    g.fillStyle(PAL.cyan, 0.75);
    g.fillCircle(32, 32, 7);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(32, 32, 2.5);
  });
  mk(s, 'gate-locked', 64, 64, (g) => {
    g.lineStyle(4, PAL.magenta, 0.95);
    g.strokeRect(1, 1, 62, 62);
    g.fillStyle(PAL.metal, 1);
    g.fillRect(4, 4, 27, 56);
    g.fillRect(33, 4, 27, 56);
    g.lineStyle(1.5, PAL.metalHi, 0.8);
    g.strokeRect(4, 4, 27, 56);
    g.strokeRect(33, 4, 27, 56);
    g.lineStyle(2, PAL.metalHi, 0.55);
    g.lineBetween(6, 6, 29, 58);
    g.lineBetween(29, 6, 6, 58);
    g.lineBetween(35, 6, 58, 58);
    g.lineBetween(58, 6, 35, 58);
    g.lineStyle(1.5, PAL.black, 0.6);
    g.lineBetween(32, 4, 32, 60);
    // lock with padlock shackle
    g.fillStyle(PAL.magenta, 0.8);
    g.fillCircle(32, 32, 7);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(32, 32, 2.5);
    g.lineStyle(2, PAL.magenta, 0.9);
    g.lineBetween(28, 32, 36, 32);
    g.lineBetween(28, 32, 28, 28);
    g.lineBetween(36, 32, 36, 28);
  });
  mk(s, 'siren', 16, 24, (g) => {
    // base
    g.fillStyle(PAL.metal, 1);
    g.fillRect(3, 14, 10, 9);
    g.lineStyle(1.5, PAL.metalHi, 1);
    g.strokeRect(3, 14, 10, 9);
    // dome
    g.fillStyle(PAL.danger, 0.3);
    g.fillCircle(8, 8, 6.5);
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(8, 8, 4.5);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(8, 8, 1.6);
  });

  // ── Core shell ───────────────────────────────────────────
  mk(s, 'core', 96, 96, (g) => {
    const c = 48;
    // octagonal housing
    g.fillStyle(PAL.navy, 1);
    const oct: Array<[number, number]> = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      oct.push([c + Math.cos(a) * 42, c + Math.sin(a) * 42]);
    }
    poly(g, oct);
    g.lineStyle(4, PAL.magenta, 0.9);
    g.strokePoints(oct.map(([x, y]) => ({ x, y })), true);
    // support spokes
    g.lineStyle(5, PAL.magenta, 0.3);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
      g.lineBetween(c, c, c + Math.cos(a) * 42, c + Math.sin(a) * 42);
    }
    // inner ring + ticks
    g.lineStyle(2, PAL.magenta, 0.55);
    g.strokeCircle(c, c, 28);
    g.fillStyle(PAL.magenta, 0.8);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillCircle(c + Math.cos(a) * 28, c + Math.sin(a) * 28, 1.8);
    }
    // reactor eye
    g.fillStyle(PAL.magenta, 0.22);
    g.fillCircle(c, c, 14);
    g.lineStyle(2, PAL.magenta, 0.9);
    g.strokeCircle(c, c, 14);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c, c, 6);
    g.fillStyle(PAL.magenta, 1);
    g.fillCircle(c, c, 3);
  });
  mk(s, 'tram', 192, 96, (g) => {
    // body
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(2, 8, 188, 80, 12);
    g.lineStyle(4, PAL.cyan, 0.8);
    g.strokeRoundedRect(2, 8, 188, 80, 12);
    // roof
    g.fillStyle(PAL.surface, 1);
    g.fillRoundedRect(6, 14, 180, 66, 8);
    // windows (2 per module, cyan glass)
    g.fillStyle(PAL.cyan, 0.35);
    for (let i = 0; i < 3; i++) {
      g.fillRect(18 + i * 24, 22, 16, 52);
      g.fillRect(30 + i * 24, 22, 16, 52);
    }
    // roof AC pods
    g.fillStyle(PAL.metalHi, 1);
    g.fillRoundedRect(40, 36, 13, 10, 2);
    g.fillRoundedRect(90, 36, 13, 10, 2);
    g.fillRoundedRect(140, 36, 13, 10, 2);
    g.lineStyle(1, PAL.cyan, 0.4);
    g.strokeRoundedRect(40, 36, 13, 10, 2);
    g.strokeRoundedRect(90, 36, 13, 10, 2);
    g.strokeRoundedRect(140, 36, 13, 10, 2);
    // cab windshield (front = right)
    g.fillStyle(PAL.cyan, 0.5);
    g.fillRoundedRect(164, 18, 18, 56, 4);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRect(182, 42, 4, 10);
    g.fillStyle(PAL.danger, 0.85);
    g.fillRect(4, 42, 4, 10);
    // doors (recessed seams)
    g.lineStyle(1.5, PAL.metalHi, 0.7);
    g.lineBetween(66, 14, 66, 80);
    g.lineBetween(138, 14, 138, 80);
  });

  // ── Effects ──────────────────────────────────────────────
  glow(s, 'fx-glow', 64);
  glow(s, 'fx-glow-big', 128);
  glow(s, 'fx-flash', 128, 1, 0.25);
  mk(s, 'fx-ring', 64, 64, (g) => {
    g.lineStyle(4, PAL.white, 1);
    g.strokeCircle(32, 32, 26);
  });
  mk(s, 'fx-smoke', 32, 32, (g) => {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 8;
      g.fillStyle(PAL.white, 0.08);
      g.fillCircle(16 + Math.cos(a) * r * 0.4, 16 + Math.sin(a) * r * 0.4, 4 + Math.random() * 6);
    }
    g.fillStyle(PAL.white, 0.14);
    g.fillCircle(16, 16, 8);
  });
  mk(s, 'fx-spark', 8, 8, (g) => {
    g.fillStyle(PAL.white, 1);
    g.fillRect(2, 0, 4, 8);
  });
  mk(s, 'fx-dot', 6, 6, (g) => {
    g.fillStyle(PAL.white, 1);
    g.fillCircle(3, 3, 3);
  });
  mk(s, 'fx-ember', 12, 12, (g) => {
    g.fillStyle(PAL.white, 1);
    g.fillCircle(6, 6, 5);
  });
  mk(s, 'fx-arc', 24, 24, (g) => {
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(12, 12, 2);
    g.fillStyle(PAL.white, 0.4);
    g.fillCircle(12, 12, 6);
  });
  mk(s, 'fx-warning', 64, 64, (g) => {
    g.lineStyle(3, PAL.danger, 0.9);
    g.strokeCircle(32, 32, 26);
    g.lineStyle(1, PAL.danger, 0.5);
    g.strokeCircle(32, 32, 30);
  });
  mk(s, 'fx-target', 64, 64, (g) => {
    g.lineStyle(2, PAL.magenta, 0.9);
    g.strokeCircle(32, 32, 24);
    g.lineStyle(1, PAL.magenta, 0.6);
    g.strokeCircle(32, 32, 28);
  });
  // aim line gradient
  mk(s, 'fx-beam', 4, 64, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle(PAL.white, 0.5 - i * 0.06);
      g.fillRect(0, i * 8, 4, 8);
    }
  });
  // enemy attack telegraph — dashed warning beam (reads as a laser warning)
  mk(s, 'fx-telegraph', 4, 64, (g) => {
    for (let i = 0; i < 6; i++) {
      g.fillStyle(PAL.white, 0.9 - i * 0.12);
      g.fillRect(0, i * 10, 4, 5);
    }
  });
  // muzzle flash
  mk(s, 'fx-muzzle', 24, 24, (g) => {
    g.fillStyle(PAL.white, 1);
    g.fillCircle(12, 12, 9);
    g.fillStyle(PAL.cyan, 0.8);
    g.fillCircle(12, 12, 6);
  });
}
