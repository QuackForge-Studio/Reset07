/**
 * RESET//07 — city builder: turns the tile grid + props into the live world.
 * Merges ground runs into stretched images, draws buildings as unique
 * rooftops, bakes static collision rects, instantiates props.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { CityGrid, PROPS, GATES, T, TILE, WORLD_W, WORLD_H, TRANSIT_PASSAGES, type Rect, type GateDef } from './cityData';
import type { WorldScene } from '../types';
import { Pathfinder } from '../systems/Pathfinder';
import { Vehicle, FuelTank, GasPipe, Transformer, Puddle, RescueCapsule, EvacCapsule, MemoryCrystal, Relay, Uplink, Gate, Tram, DecorativeProp } from '../entities/environment';
import { MEMORIES } from '../data/memories';

export interface GateInstance {
  gate: Gate;
  def: GateDef;
}

export interface BuiltWorld {
  grid: CityGrid;
  gates: GateInstance[];
  spawnPoints: Array<{ x: number; y: number; kind: string; district: string }>;
  propCount: number;
}

export function buildCity(scene: WorldScene): BuiltWorld {
  const grid = new CityGrid();
  scene.pathfinder = new Pathfinder(grid);
  // dark underlay fills the void outside built districts — without it the
  // page background shows through the transparent canvas at the map edges
  // (reads as a flickering/blank void when the camera pans there)
  scene.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, PAL.building).setDepth(0);
  drawGround(scene, grid);
  drawBuildings(scene, grid);
  drawWalls(scene, grid);
  const gates = buildGates(scene, grid);
  const spawnPoints = buildProps(scene);
  bakeColliders(scene, grid);
  drawPerimeter(scene);
  decorateAmbient(scene);
  return { grid, gates, spawnPoints, propCount: PROPS.length };
}

function textureFor(t: number): string | null {
  switch (t) {
    case T.SIDEWALK: return 't-sidewalk';
    case T.ROAD_H: return 't-roadH';
    case T.ROAD_V: return 't-roadV';
    case T.CROSSWALK: return 't-crosswalk';
    case T.PLAZA: return 't-plaza';
    case T.GARAGE: return 't-garage';
    case T.ARENA: return 't-arena';
    case T.DOOR: return 't-door';
    default: return null;
  }
}

function drawGround(scene: WorldScene, grid: CityGrid): void {
  // run-merge per row per texture
  for (let y = 0; y < 104; y++) {
    let runStart = -1;
    let runTex = '';
    for (let x = 0; x <= 144; x++) {
      const tex = x < 144 ? textureFor(grid.tile(x, y)) : null;
      if (tex && tex === runTex) continue;
      if (runStart >= 0 && runTex) {
        scene.add.image((runStart + (x - 1)) / 2 * TILE + TILE / 2, y * TILE + TILE / 2, runTex)
          .setDisplaySize((x - runStart) * TILE, TILE)
          .setOrigin(0.5, 0.5)
          .setDepth(1);
      }
      runStart = tex ? x : -1;
      runTex = tex ?? '';
    }
  }
  // bright markers over the transit cross-passages so the links are readable
  for (const [x, y1, y2] of TRANSIT_PASSAGES) {
    scene.add.image(x * TILE + TILE / 2, ((y1 + y2) / 2) * TILE + TILE / 2, 't-passage')
      .setDisplaySize(TILE, (y2 - y1 + 1) * TILE)
      .setDepth(1.5);
  }
  // hazard strips around the core
  const hazard = (x1: number, x2: number, y: number) => {
    scene.add.image(((x1 + x2) / 2) * TILE + TILE / 2, y * TILE + TILE / 2, 't-hazard').setDisplaySize((x2 - x1 + 1) * TILE, TILE).setDepth(1);
  };
  hazard(80, 111, 46);
  hazard(80, 111, 61);
}

function drawBuildings(scene: WorldScene, grid: CityGrid): void {
  const seen = new Uint8Array(144 * 104);
  for (let y = 0; y < 104; y++) {
    for (let x = 0; x < 144; x++) {
      if (grid.tile(x, y) !== T.BUILDING || seen[y * 144 + x]) continue;
      // find rect extents
      let x2 = x;
      while (x2 + 1 < 144 && grid.tile(x2 + 1, y) === T.BUILDING) x2++;
      let y2 = y;
      let full = true;
      while (y2 + 1 < 104 && full) {
        for (let xx = x; xx <= x2; xx++) {
          if (grid.tile(xx, y2 + 1) !== T.BUILDING) {
            full = false;
            break;
          }
        }
        if (full) y2++;
      }
      for (let yy = y; yy <= y2; yy++) for (let xx = x; xx <= x2; xx++) seen[yy * 144 + xx] = 1;
      const w = (x2 - x + 1) * TILE;
      const h = (y2 - y + 1) * TILE;
      const key = `roof-${((x * 7 + y * 13) % 3) + 1}`;
      const img = scene.add.tileSprite((x + x2 + 1) / 2 * TILE, (y + y2 + 1) / 2 * TILE, w, h, key);
      img.setDepth(10);
      img.setData('building', true);
      // neon edge strips facing the streets (south + north)
      const edge = scene.add.image((x + x2 + 1) / 2 * TILE, (y2 + 1) * TILE - 2, 'roof-edge');
      edge.setDisplaySize(w, 4);
      edge.setDepth(11);
      edge.setTint(Math.random() < 0.5 ? PAL.cyan : PAL.orange);
    }
  }
}

function drawWalls(scene: WorldScene, grid: CityGrid): void {
  const rects = grid.collisionRects();
  // keep only wall tiles (not buildings — those are drawn as rooftops)
  const wallRects: Rect[] = [];
  for (const r of rects) {
    if (grid.tile(r.x1, r.y1) === T.BUILDING) continue;
    wallRects.push(r);
  }
  const wallTex = makeWallTexture(scene);
  for (const r of wallRects) {
    const horizontal = r.x2 - r.x1 >= r.y2 - r.y1;
    const img = scene.add.image(((r.x1 + r.x2 + 1) / 2) * TILE, ((r.y1 + r.y2 + 1) / 2) * TILE, wallTex);
    if (horizontal) {
      img.setDisplaySize((r.x2 - r.x1 + 1) * TILE, (r.y2 - r.y1 + 1) * TILE);
    } else {
      img.setDisplaySize((r.x2 - r.x1 + 1) * TILE, (r.y2 - r.y1 + 1) * TILE);
    }
    img.setDepth(12);
  }
}

let wallTexKey: string | null = null;
function makeWallTexture(scene: WorldScene): string {
  if (wallTexKey) return wallTexKey;
  wallTexKey = 'wall-tex';
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(PAL.wall, 1);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(PAL.wallEdge, 0.35);
  g.fillRect(0, 0, 32, 3);
  g.lineStyle(1, PAL.black, 0.6);
  g.lineBetween(0, 8, 32, 8);
  g.lineBetween(0, 16, 32, 16);
  g.lineBetween(0, 24, 32, 24);
  g.generateTexture(wallTexKey, 32, 32);
  g.destroy();
  return wallTexKey;
}

function bakeColliders(scene: WorldScene, grid: CityGrid): void {
  const rects = grid.collisionRects();
  const group = scene.physics.add.staticGroup();
  for (const r of rects) {
    const w = (r.x2 - r.x1 + 1) * TILE;
    const h = (r.y2 - r.y1 + 1) * TILE;
    const body = scene.add.zone(((r.x1 + r.x2 + 1) / 2) * TILE, ((r.y1 + r.y2 + 1) / 2) * TILE, w, h);
    group.add(body);
  }
  // world perimeter — keep entities (and the player) inside the map; the
  // tile grid is VOID outside the districts so nothing else blocks there.
  // Bands sit INSIDE the map edges (0..192px) so the player can never reach
  // the rim and look out into the void; drawPerimeter() paints the visible wall.
  const BAND = 192;
  const band = (cx: number, cy: number, w: number, h: number) => group.add(scene.add.zone(cx, cy, w, h));
  band(BAND / 2, BAND / 2, WORLD_W, BAND); // top
  band(BAND / 2, WORLD_H - BAND / 2, WORLD_W, BAND); // bottom
  band(BAND / 2, WORLD_H / 2, BAND, WORLD_H); // left
  band(WORLD_W - BAND / 2, WORLD_H / 2, BAND, WORLD_H); // right
  scene.collideWalls = group;
}

/** Visible city-wall band around the whole map — hides the void at the rim. */
function drawPerimeter(scene: WorldScene): void {
  const tex = makeWallTexture(scene);
  const strip = (cx: number, cy: number, w: number, h: number) => {
    const img = scene.add.tileSprite(cx, cy, w, h, tex);
    img.setDepth(12);
    return img;
  };
  strip(WORLD_W / 2, 96, WORLD_W, 192);
  strip(WORLD_W / 2, WORLD_H - 96, WORLD_W, 192);
  strip(96, WORLD_H / 2, 192, WORLD_H);
  strip(WORLD_W - 96, WORLD_H / 2, 192, WORLD_H);
  // glowing inner edge so the boundary reads as a wall, not scenery
  const g = scene.add.graphics().setDepth(13);
  g.lineStyle(2, PAL.cyan, 0.4);
  g.lineBetween(192, 0, 192, WORLD_H);
  g.lineBetween(WORLD_W - 192, 0, WORLD_W - 192, WORLD_H);
  g.lineBetween(0, 192, WORLD_W, 192);
  g.lineBetween(0, WORLD_H - 192, WORLD_W, WORLD_H - 192);
}

function buildGates(scene: WorldScene, _grid: CityGrid): GateInstance[] {
  const gates: GateInstance[] = [];
  for (const def of GATES) {
    const r = def.rect;
    const cx = ((r.x1 + r.x2 + 1) / 2) * TILE;
    const cy = ((r.y1 + r.y2 + 1) / 2) * TILE;
    const w = (r.x2 - r.x1 + 1) * TILE;
    const h = (r.y2 - r.y1 + 1) * TILE;
    const gate = new Gate(scene, cx, cy, w, h, def.id, { onOpened: () => scene.onGateOpened(def) });
    gates.push({ gate, def });
  }
  return gates;
}

function buildProps(scene: WorldScene): Array<{ x: number; y: number; kind: string; district: string }> {
  const spawns: Array<{ x: number; y: number; kind: string; district: string }> = [];
  const px = (t: readonly [number, number]) => t[0] * TILE + TILE / 2;
  const py = (t: readonly [number, number]) => t[1] * TILE + TILE / 2;
  const districtOf = (t: readonly [number, number]) => scene.districtName(t[0], t[1]);

  for (const p of PROPS) {
    const x = px(p.tile);
    const y = py(p.tile);
    const district = districtOf(p.tile);
    switch (p.kind) {
      case 'vehicle': {
        const isTutorial = p.tile[0] === 17 && p.tile[1] === 84;
        const v = new Vehicle(scene, x, y, p.variant ?? 'car', {
          onDestroyed: () => {
            if (isTutorial) scene.onTutorialVehicleDestroyed();
          },
        });
        scene.explosiveProps.push(v);
        break;
      }
      case 'tank': {
        const t = new FuelTank(scene, x, y);
        scene.explosiveProps.push(t);
        break;
      }
      case 'pipe': {
        const pipe = new GasPipe(scene, x, y, p.dir === 1 ? 'h' : 'v', p.len ?? 1);
        scene.explosiveProps.push(pipe);
        break;
      }
      case 'transformer': {
        const tr = new Transformer(scene, x, y);
        scene.explosiveProps.push(tr);
        break;
      }
      case 'puddle':
        scene.puddleList.push(new Puddle(scene, x, y));
        break;
      case 'capsule': {
        const cap = new RescueCapsule(scene, x, y, p.id ?? 'capsule', { onRescued: (id) => scene.onRescued(id) });
        scene.interactables.push(cap);
        break;
      }
      case 'evacCapsule': {
        const cap = new EvacCapsule(scene, x, y, p.id ?? 'evac', { onOpened: (id) => scene.onEvacOpened(id) });
        scene.interactables.push(cap);
        break;
      }
      case 'memory': {
        const mem = MEMORIES.find((m) => m.id === p.id);
        // don't re-spawn fragments that were already recovered in an earlier
        // loop — otherwise the RECOVER MEMORY prompt silently does nothing
        if (mem && !scene.save.memories.includes(mem.id)) {
          const crystal = new MemoryCrystal(scene, x, y, mem.id, { onCollect: (id) => scene.onMemoryCollected(id) });
          scene.interactables.push(crystal);
        }
        break;
      }
      case 'relay': {
        const relay = new Relay(scene, x, y, { onStabilized: () => scene.onRelayStabilized() });
        scene.interactables.push(relay);
        break;
      }
      case 'uplink': {
        const uplink = new Uplink(scene, x, y, { onDestroyed: () => scene.onUplinkDestroyed() });
        scene.explosiveProps.push(uplink as unknown as import('../entities/environment').Explosive);
        break;
      }
      case 'tram':
        new Tram(scene, x, y);
        break;
      case 'lamp': {
        const l = new DecorativeProp(scene, x, y, 'lamp', { depth: 42, flicker: Math.random() < 0.4 });
        const light = scene.add.image(x, y - 8, 'fx-glow');
        light.setBlendMode(Phaser.BlendModes.ADD);
        light.setTint(PAL.cyan);
        light.setScale(1.6);
        light.setAlpha(0.22);
        light.setDepth(41);
        l.setData('light', light);
        scene.lamps.push({ pole: l, light });
        break;
      }
      case 'sign': {
        const s = new DecorativeProp(scene, x, y, 'sign', { depth: 43, rotation: (p.dir ?? 0) * Math.PI / 2, flicker: true });
        s.setTint(variantColor(p.variant));
        break;
      }
      case 'barrier':
        new DecorativeProp(scene, x, y, 'barrier', { depth: 43, rotation: (p.dir ?? 0) * Math.PI / 2, scale: p.len ?? 1 });
        break;
      case 'wreck':
        new DecorativeProp(scene, x, y, 'wreck', { depth: 43, rotation: (p.dir ?? 0) * Math.PI / 2 });
        break;
      case 'debris':
        new DecorativeProp(scene, x, y, Math.random() < 0.5 ? 'debris-a' : 'debris-b', { depth: 43 });
        break;
      case 'scorch':
        new DecorativeProp(scene, x, y, 'scorch', { depth: 2 });
        break;
      case 'crate':
        new DecorativeProp(scene, x, y, 'crate', { depth: 44 });
        break;
      case 'bench':
        new DecorativeProp(scene, x, y, 'bench', { depth: 44, rotation: (p.dir ?? 0) * Math.PI / 2 });
        break;
      case 'chargepad':
        new DecorativeProp(scene, x, y, 'chargepad', { depth: 40 });
        break;
      case 'vent':
        new DecorativeProp(scene, x, y, 'vent', { depth: 43 });
        break;
      case 'pillar':
        new DecorativeProp(scene, x, y, 'transformer', { depth: 47, scale: 1.2, tint: PAL.magenta });
        break;
      case 'core': {
        const c = new DecorativeProp(scene, x, y, 'core', { depth: 46 });
        scene.coreShell = c;
        break;
      }
      case 'siren':
        new DecorativeProp(scene, x, y, 'siren', { depth: 44, flicker: true });
        break;
      case 'spawn':
        spawns.push({ x, y, kind: p.variant ?? 'drone', district });
        break;
    }
  }
  return spawns;
}

function variantColor(variant?: string): number {
  switch (variant) {
    case 'orange': return PAL.orange;
    case 'magenta': return PAL.magenta;
    case 'teal': return PAL.teal;
    case 'amber': return PAL.amber;
    default: return PAL.cyan;
  }
}

function decorateAmbient(scene: WorldScene): void {
  // distant city glow + scanline handled by CSS; here: subtle ground fog wisps
  for (let i = 0; i < 26; i++) {
    const x = 200 + Math.random() * 4200;
    const y = 200 + Math.random() * 2900;
    const fog = scene.add.image(x, y, 'fx-smoke');
    fog.setTint(PAL.navy);
    fog.setScale(4 + Math.random() * 6);
    fog.setAlpha(0.05 + Math.random() * 0.05);
    fog.setDepth(0);
    fog.setData('fog', true);
    scene.tweens.add({
      targets: fog,
      alpha: fog.alpha + 0.03,
      scale: fog.scaleX * 1.2,
      duration: 6000 + Math.random() * 6000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
