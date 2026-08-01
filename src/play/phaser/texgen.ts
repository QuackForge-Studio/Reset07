/**
 * RESET//07 — procedural texture factory.
 *
 * Every texture in the game is generated at boot from vector drawing
 * commands. No image files, no missing assets, no hotlinks.
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

  // ── Player K-07 ──────────────────────────────────────────
  mk(s, 'player', 64, 64, (g) => {
    const c = 32;
    g.fillStyle(PAL.navy, 1);
    g.fillCircle(c, c, 20);
    g.lineStyle(3, PAL.metalHi, 1);
    g.strokeCircle(c, c, 20);
    g.lineStyle(2, PAL.cyan, 0.9);
    g.strokeCircle(c, c, 14);
    g.fillStyle(PAL.cyan, 1);
    g.fillCircle(c, c, 7);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c - 1, c - 2, 3);
    // arms (mounts)
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(c - 22, c - 6, 6, 12);
    g.fillRect(c + 16, c - 6, 6, 12);
    g.fillStyle(PAL.cyan, 0.8);
    g.fillRect(c - 24, c - 2, 3, 4);
    g.fillRect(c + 21, c - 2, 3, 4);
    // direction notch
    g.fillStyle(PAL.cyan, 0.6);
    g.fillTriangle(c - 3, c + 22, c + 3, c + 22, c, c + 27);
  });
  mk(s, 'player-od', 64, 64, (g) => {
    const c = 32;
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c, c, 20);
  });

  // ── Enemies ──────────────────────────────────────────────
  mk(s, 'enemy-drone', 40, 40, (g) => {
    const c = 20;
    g.fillStyle(PAL.navy, 1);
    g.fillCircle(c, c, 14);
    g.lineStyle(2, PAL.cyan, 0.85);
    g.strokeCircle(c, c, 14);
    g.fillStyle(PAL.cyan, 0.25);
    g.fillCircle(c, c, 10);
    g.fillStyle(PAL.cyan, 1);
    g.fillCircle(c, c, 5);
    g.fillStyle(PAL.magenta, 0.9);
    g.fillCircle(c, c, 2);
    g.lineStyle(2, PAL.cyan, 0.5);
    g.strokeCircle(c, c, 17);
  });
  mk(s, 'enemy-hunter', 40, 40, (g) => {
    const c = 20;
    g.fillStyle(PAL.navy, 1);
    g.fillTriangle(c - 12, c - 12, c - 12, c + 12, c + 16, c); // forward = right
    g.lineStyle(2, PAL.danger, 0.9);
    g.strokeTriangle(c - 12, c - 12, c - 12, c + 12, c + 16, c);
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(c - 2, c, 5);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c - 1, c - 1, 2);
  });
  mk(s, 'enemy-shield', 44, 44, (g) => {
    const c = 22;
    g.fillStyle(PAL.navy, 1);
    g.fillCircle(c, c, 14);
    g.lineStyle(2, PAL.amber, 0.9);
    g.strokeCircle(c, c, 14);
    g.fillStyle(PAL.amber, 1);
    g.fillCircle(c - 2, c, 6);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c - 1, c - 1, 2);
    // shield plate (front = right)
    g.fillStyle(PAL.cyan, 0.35);
    g.fillRect(c + 8, c - 16, 8, 32);
    g.lineStyle(2, PAL.cyan, 0.9);
    g.strokeRect(c + 8, c - 16, 8, 32);
  });
  mk(s, 'enemy-detonator', 32, 32, (g) => {
    const c = 16;
    g.fillStyle(PAL.navy, 1);
    g.fillCircle(c, c, 10);
    g.lineStyle(2, PAL.danger, 1);
    g.strokeCircle(c, c, 10);
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(c, c, 5);
    g.lineStyle(1, PAL.white, 0.8);
    g.strokeCircle(c, c, 8);
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
  // boss: Core Guardian — large hex machine
  mk(s, 'boss', 160, 160, (g) => {
    const c = 80;
    g.fillStyle(PAL.navy, 1);
    g.fillCircle(c, c, 58);
    g.lineStyle(6, PAL.magenta, 0.9);
    g.strokeCircle(c, c, 58);
    g.lineStyle(3, PAL.magenta, 0.4);
    g.strokeCircle(c, c, 46);
    g.lineStyle(3, PAL.magenta, 0.25);
    g.strokeCircle(c, c, 34);
    g.fillStyle(PAL.magenta, 0.2);
    g.fillCircle(c, c, 28);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(c, c, 14);
    // rotating arms
    g.fillStyle(PAL.magenta, 0.8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.fillRect(c + Math.cos(a) * 40 - 4, c + Math.sin(a) * 40 - 4, 8, 8);
    }
  });
  mk(s, 'boss-core', 80, 80, (g) => {
    const c = 40;
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(c, c, 22);
    g.fillStyle(PAL.white, 1);
    g.fillCircle(c, c, 12);
    g.lineStyle(4, PAL.orange, 0.5);
    g.strokeCircle(c, c, 30);
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
    g.fillTriangle(16, 2, 28, 18, 16, 34);
    g.fillTriangle(16, 2, 4, 18, 16, 34);
    g.fillStyle(PAL.cyan, 1);
    g.fillTriangle(16, 5, 25, 18, 16, 31);
    g.fillTriangle(16, 5, 7, 18, 16, 31);
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(16, 18, 4);
  });
  mk(s, 'capsule', 56, 72, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(4, 6, 48, 60, 8);
    g.lineStyle(3, PAL.cyan, 0.9);
    g.strokeRoundedRect(4, 6, 48, 60, 8);
    g.fillStyle(PAL.cyan, 0.18);
    g.fillRoundedRect(10, 14, 36, 44, 5);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillRect(24, 2, 8, 4);
    g.fillStyle(PAL.cyan, 0.7);
    g.fillCircle(28, 34, 5);
    g.fillStyle(PAL.white, 0.8);
    g.fillRect(14, 30, 10, 2);
    g.fillRect(14, 36, 10, 2);
  });
  mk(s, 'evac', 48, 56, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(4, 4, 40, 48, 6);
    g.lineStyle(3, PAL.teal, 0.95);
    g.strokeRoundedRect(4, 4, 40, 48, 6);
    g.fillStyle(PAL.teal, 0.2);
    g.fillRoundedRect(10, 10, 28, 36, 4);
    g.fillStyle(PAL.teal, 1);
    g.fillCircle(24, 28, 5);
    g.lineStyle(2, PAL.teal, 0.6);
    g.strokeCircle(24, 28, 10);
  });
  mk(s, 'relay', 56, 72, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(16, 6, 24, 52, 4);
    g.lineStyle(3, PAL.orange, 0.95);
    g.strokeRoundedRect(16, 6, 24, 52, 4);
    g.fillStyle(PAL.orange, 0.5);
    g.fillCircle(28, 58, 8);
    g.lineStyle(2, PAL.orange, 0.9);
    g.strokeCircle(28, 58, 8);
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(28, 58, 4);
    g.lineStyle(2, PAL.metalHi, 1);
    g.lineBetween(22, 12, 34, 12);
    g.lineBetween(22, 18, 34, 18);
  });
  mk(s, 'uplink', 56, 88, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(20, 14, 16, 60, 4);
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(12, 64, 32, 12);
    g.lineStyle(3, PAL.cyan, 0.9);
    g.strokeRoundedRect(20, 14, 16, 60, 4);
    g.fillStyle(PAL.magenta, 1);
    g.fillCircle(28, 20, 6);
    g.lineStyle(2, PAL.magenta, 0.6);
    g.strokeCircle(28, 20, 10);
    g.lineStyle(2, PAL.cyan, 0.5);
    g.lineBetween(20, 78, 36, 78);
  });

  // ── Vehicles ─────────────────────────────────────────────
  const car = (g: G, w: number, h: number, body: number, glow: number) => {
    g.fillStyle(PAL.metalHi, 1);
    g.fillRoundedRect(2, 2, w - 4, h - 4, 5);
    g.fillStyle(body, 1);
    g.fillRoundedRect(5, 5, w - 10, h - 10, 4);
    g.fillStyle(PAL.cyan, glow);
    g.fillRect(4, h / 2 - 2, 3, 4); // headlight
    g.fillStyle(PAL.danger, glow * 0.8);
    g.fillRect(w - 7, h / 2 - 2, 3, 4); // taillight
    g.fillStyle(PAL.black, 0.6);
    g.fillRoundedRect(w / 2 - 4, 2, 8, h - 4, 2);
  };
  mk(s, 'vehicle-car', 44, 24, (g) => car(g, 44, 24, PAL.surfaceHi, 0.85));
  mk(s, 'vehicle-van', 56, 28, (g) => car(g, 56, 28, PAL.surfaceHi, 0.85));
  mk(s, 'vehicle-truck', 72, 32, (g) => car(g, 72, 32, PAL.surface, 0.7));
  mk(s, 'vehicle-damaged', 56, 30, (g) => {
    car(g, 56, 30, PAL.navy, 0.3);
    g.fillStyle(PAL.scorch, 0.85);
    g.fillRect(6, 4, 20, 22);
    g.fillStyle(PAL.orange, 0.8);
    g.fillCircle(18, 10, 5);
    g.fillStyle(PAL.black, 1);
    g.fillRect(26, 8, 12, 3);
  });
  mk(s, 'wreck', 56, 30, (g) => {
    g.fillStyle(PAL.scorch, 0.9);
    g.fillRoundedRect(2, 4, 52, 22, 4);
    g.fillStyle(PAL.metalHi, 0.8);
    g.fillRect(6, 8, 16, 4);
    g.fillRect(24, 16, 12, 3);
    g.fillStyle(PAL.orange, 0.3);
    g.fillCircle(40, 10, 5);
  });

  // ── Environment props ────────────────────────────────────
  mk(s, 'tank', 44, 44, (g) => {
    g.fillStyle(PAL.orange, 0.9);
    g.fillCircle(22, 22, 16);
    g.lineStyle(3, PAL.orange, 1);
    g.strokeCircle(22, 22, 16);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(22, 22, 6);
    g.lineStyle(2, PAL.black, 0.5);
    g.strokeCircle(22, 22, 6);
    g.fillStyle(PAL.danger, 0.85);
    g.fillRect(14, 36, 16, 5);
  });
  mk(s, 'pipe-h', 64, 20, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(0, 6, 64, 8, 4);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRoundedRect(0, 6, 64, 8, 4);
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
    g.fillStyle(PAL.cyan, 0.35);
    g.fillCircle(10, 6, 2);
    g.fillCircle(10, 32, 2);
    g.fillCircle(10, 58, 2);
  });
  mk(s, 'pipe-leak', 64, 20, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(0, 6, 64, 8, 4);
    g.fillStyle(PAL.teal, 0.5);
    g.fillCircle(14, 10, 3);
    g.fillStyle(PAL.teal, 0.25);
    g.fillCircle(14, 10, 6);
  });
  mk(s, 'transformer', 48, 40, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRect(8, 4, 32, 30);
    g.lineStyle(3, PAL.amber, 0.9);
    g.strokeRect(8, 4, 32, 30);
    g.lineStyle(2, PAL.metalHi, 1);
    g.lineBetween(8, 14, 40, 14);
    g.lineBetween(8, 24, 40, 24);
    g.fillStyle(PAL.amber, 1);
    g.fillCircle(24, 36, 4);
    g.fillStyle(PAL.black, 0.7);
    g.fillRect(16, 6, 16, 6);
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
    g.fillStyle(PAL.metal, 1);
    g.fillRect(6, 10, 4, 54);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillCircle(8, 6, 5);
    g.fillStyle(PAL.white, 0.9);
    g.fillCircle(8, 6, 2);
  });
  mk(s, 'sign', 80, 24, (g) => {
    g.fillStyle(PAL.navy, 0.9);
    g.fillRoundedRect(0, 2, 80, 20, 3);
    g.lineStyle(3, PAL.cyan, 0.9);
    g.strokeRoundedRect(0, 2, 80, 20, 3);
    g.lineStyle(1, PAL.white, 0.7);
    g.lineBetween(10, 8, 30, 8);
    g.lineBetween(10, 14, 26, 14);
    g.fillStyle(PAL.white, 0.8);
    g.fillRect(36, 8, 8, 2);
    g.fillRect(48, 8, 12, 2);
  });
  mk(s, 'barrier', 64, 16, (g) => {
    g.fillStyle(PAL.orange, 0.9);
    g.fillRect(0, 4, 64, 8);
    g.lineStyle(2, PAL.white, 0.85);
    for (let i = 0; i < 6; i++) g.lineBetween(i * 12 + 2, 4, i * 12 + 10, 12);
    g.fillStyle(PAL.metal, 1);
    g.fillRect(2, 8, 4, 8);
    g.fillRect(58, 8, 4, 8);
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
    g.fillStyle(PAL.metal, 1);
    g.fillRect(3, 3, 18, 18);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRect(3, 3, 18, 18);
    g.lineStyle(1, PAL.cyan, 0.4);
    g.lineBetween(3, 12, 21, 12);
    g.lineBetween(12, 3, 12, 21);
  });
  mk(s, 'bench', 40, 20, (g) => {
    g.fillStyle(PAL.metalHi, 1);
    g.fillRect(4, 6, 32, 8);
    g.lineStyle(2, PAL.metal, 1);
    g.strokeRect(4, 6, 32, 8);
    g.fillStyle(PAL.metal, 1);
    g.fillRect(6, 14, 4, 6);
    g.fillRect(30, 14, 4, 6);
  });
  mk(s, 'chargepad', 64, 64, (g) => {
    g.lineStyle(3, PAL.cyan, 0.7);
    g.strokeCircle(32, 32, 24);
    g.lineStyle(2, PAL.cyan, 0.35);
    g.strokeCircle(32, 32, 18);
    g.lineStyle(1, PAL.cyan, 0.25);
    g.strokeCircle(32, 32, 12);
    g.fillStyle(PAL.cyan, 0.1);
    g.fillCircle(32, 32, 8);
  });
  mk(s, 'vent', 40, 40, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRect(8, 8, 24, 24);
    g.lineStyle(2, PAL.metalHi, 1);
    g.strokeRect(8, 8, 24, 24);
    g.fillStyle(PAL.black, 0.8);
    g.fillRect(12, 12, 16, 16);
    g.lineStyle(1, PAL.metalHi, 0.8);
    for (let i = 0; i < 5; i++) g.lineBetween(12, 15 + i * 3, 28, 15 + i * 3);
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
    g.fillStyle(PAL.metal, 1);
    g.fillRect(2, 2, 60, 60);
    g.lineStyle(4, PAL.cyan, 0.95);
    g.strokeRect(2, 2, 60, 60);
    g.lineStyle(2, PAL.cyan, 0.5);
    g.lineBetween(6, 6, 58, 58);
    g.lineBetween(58, 6, 6, 58);
    g.fillStyle(PAL.cyan, 0.7);
    g.fillCircle(32, 32, 8);
  });
  mk(s, 'gate-locked', 64, 64, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRect(2, 2, 60, 60);
    g.lineStyle(4, PAL.magenta, 0.95);
    g.strokeRect(2, 2, 60, 60);
    g.lineStyle(2, PAL.magenta, 0.5);
    g.lineBetween(6, 6, 58, 58);
    g.lineBetween(58, 6, 6, 58);
    g.fillStyle(PAL.magenta, 0.8);
    g.fillCircle(32, 32, 8);
  });
  mk(s, 'siren', 16, 24, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRect(4, 12, 8, 10);
    g.fillStyle(PAL.danger, 1);
    g.fillCircle(8, 7, 5);
    g.fillStyle(PAL.white, 0.8);
    g.fillCircle(8, 7, 2);
  });

  // ── Core shell ───────────────────────────────────────────
  mk(s, 'core', 96, 96, (g) => {
    const c = 48;
    g.lineStyle(4, PAL.magenta, 0.9);
    g.strokeCircle(c, c, 40);
    g.lineStyle(2, PAL.magenta, 0.4);
    g.strokeCircle(c, c, 32);
    g.fillStyle(PAL.magenta, 0.15);
    g.fillCircle(c, c, 28);
    g.fillStyle(PAL.white, 0.5);
    g.fillCircle(c, c, 10);
    g.lineStyle(2, PAL.white, 0.3);
    g.strokeCircle(c, c, 18);
  });
  mk(s, 'tram', 192, 96, (g) => {
    g.fillStyle(PAL.metal, 1);
    g.fillRoundedRect(4, 8, 184, 80, 10);
    g.lineStyle(4, PAL.cyan, 0.8);
    g.strokeRoundedRect(4, 8, 184, 80, 10);
    g.fillStyle(PAL.cyan, 0.5);
    g.fillRect(8, 14, 172, 3);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillCircle(16, 68, 5);
    g.fillStyle(PAL.black, 0.5);
    for (let i = 0; i < 7; i++) g.fillRect(24 + i * 22, 20, 12, 56);
    g.fillStyle(PAL.cyan, 0.35);
    for (let i = 0; i < 6; i++) g.fillRect(30 + i * 22, 26, 4, 44);
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
  // muzzle flash
  mk(s, 'fx-muzzle', 24, 24, (g) => {
    g.fillStyle(PAL.white, 1);
    g.fillCircle(12, 12, 9);
    g.fillStyle(PAL.cyan, 0.8);
    g.fillCircle(12, 12, 6);
  });
}
