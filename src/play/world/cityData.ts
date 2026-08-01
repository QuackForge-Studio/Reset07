/**
 * RESET//07 — city blueprint.
 *
 * A deterministic tile grid (144×104 @ 32px = 4608×3328 world px) built from
 * an explicit district/road/building plan. Layout:
 *
 *   TRANSIT (north) ── YARD ring ── CORE (center) ── YARD ── POWER GRID (south-east)
 *   SERVICE QUARTER (south-west, contains GARAGE) ── connects to YARD + POWER GRID
 *
 * The core has three gates: NORTH (main), SOUTH (relay), WEST (maintenance).
 * Everything is data — the scene only interprets it.
 */

export const W = 144;
export const H = 104;
export const TILE = 32;
export const WORLD_W = W * TILE;
export const WORLD_H = H * TILE;

/** Tile codes */
export const T = {
  VOID: 0,
  BUILDING: 1, // rooftop block
  WALL: 2,
  SIDEWALK: 3,
  ROAD_H: 4,
  ROAD_V: 5,
  CROSSWALK: 6,
  PLAZA: 7,
  GARAGE: 8,
  ARENA: 9,
  DOOR: 10, // gate tile — blocked until its door opens
} as const;

export type TileCode = (typeof T)[keyof typeof T];

export const WALKABLE: ReadonlySet<number> = new Set([
  T.SIDEWALK,
  T.ROAD_H,
  T.ROAD_V,
  T.CROSSWALK,
  T.PLAZA,
  T.GARAGE,
  T.ARENA,
]);

export interface Rect {
  x1: number;
  y1: number;
  x2: number; // inclusive
  y2: number; // inclusive
}

const inRect = (r: Rect, x: number, y: number) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;

/** Door (gate) definitions — tile rect + which route/objective opens it. */
export interface GateDef {
  id: 'garage' | 'coreN' | 'coreS' | 'coreW';
  rect: Rect; // tiles that are DOOR while closed
  opensBy: 'script' | 'relay' | 'maintenance' | 'relayCode' | 'finalMinute';
  label: string;
}

export const GATES: GateDef[] = [
  { id: 'garage', rect: { x1: 14, y1: 88, x2: 18, y2: 89 }, opensBy: 'script', label: 'GARAGE GATE' },
  { id: 'coreN', rect: { x1: 92, y1: 44, x2: 100, y2: 45 }, opensBy: 'relay', label: 'CORE GATE // NORTH' },
  { id: 'coreS', rect: { x1: 92, y1: 62, x2: 100, y2: 63 }, opensBy: 'relayCode', label: 'CORE GATE // SOUTH' },
  { id: 'coreW', rect: { x1: 80, y1: 50, x2: 81, y2: 54 }, opensBy: 'maintenance', label: 'CORE GATE // WEST' },
];

/** Districts (priority order for point lookup — CORE before YARD). */
export interface DistrictDef {
  id: 'garage' | 'service' | 'power' | 'transit' | 'yard' | 'core';
  rect: Rect;
  color: number;
  name: string;
}

export const DISTRICTS: DistrictDef[] = [
  { id: 'garage', rect: { x1: 10, y1: 70, x2: 22, y2: 90 }, color: 0x38e8ff, name: 'GARAGE 07' },
  { id: 'core', rect: { x1: 80, y1: 44, x2: 112, y2: 63 }, color: 0xff3d9a, name: 'CITY CORE' },
  { id: 'yard', rect: { x1: 56, y1: 44, x2: 136, y2: 63 }, color: 0xffc44a, name: 'PERIMETER YARD' },
  { id: 'transit', rect: { x1: 56, y1: 8, x2: 136, y2: 43 }, color: 0x4de3c0, name: 'TRANSIT SECTOR' },
  { id: 'power', rect: { x1: 56, y1: 64, x2: 136, y2: 99 }, color: 0xff6a1a, name: 'POWER GRID' },
  { id: 'service', rect: { x1: 8, y1: 56, x2: 52, y2: 99 }, color: 0x38e8ff, name: 'SERVICE QUARTER' },
];

export function districtAt(x: number, y: number): DistrictDef {
  for (const d of DISTRICTS) if (inRect(d.rect, x, y)) return d;
  return { id: 'garage', rect: { x1: 0, y1: 0, x2: 0, y2: 0 }, color: 0, name: 'VOID' };
}

// ─────────────────────────────────────────────────────────────
// Grid construction
// ─────────────────────────────────────────────────────────────

export class CityGrid {
  tiles: Uint8Array;
  doorOpen = new Set<string>(); // gate ids that are open (affects pathfinding)

  constructor() {
    this.tiles = new Uint8Array(W * H);
    this.tiles.fill(T.VOID);
    this.build();
  }

  private set(x: number, y: number, t: TileCode) {
    if (x >= 0 && x < W && y >= 0 && y < H) this.tiles[y * W + x] = t;
  }

  private fillRect(r: Rect, t: TileCode) {
    for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) this.set(x, y, t);
  }

  private roadH(x1: number, x2: number, y: number) {
    for (let x = x1; x <= x2; x++) this.set(x, y, T.ROAD_H);
  }
  private roadV(x: number, y1: number, y2: number) {
    for (let y = y1; y <= y2; y++) this.set(x, y, T.ROAD_V);
  }

  /** Draw a road as a 3-tile band. */
  private avenue(x1: number, x2: number, y: number) {
    this.roadH(x1, x2, y - 1);
    this.roadH(x1, x2, y);
    this.roadH(x1, x2, y + 1);
  }
  private street(x: number, y1: number, y2: number) {
    this.roadV(x, y1 - 1, y2 + 1);
  }

  private build() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- terse grid-building alias (120+ uses below)
    const g = this;

    // ── District base floors ───────────────────────────────
    g.fillRect(DISTRICTS[5].rect, T.SIDEWALK); // service
    g.fillRect({ x1: 56, y1: 64, x2: 136, y2: 99 }, T.SIDEWALK); // power
    g.fillRect({ x1: 56, y1: 8, x2: 136, y2: 43 }, T.SIDEWALK); // transit
    g.fillRect({ x1: 56, y1: 44, x2: 136, y2: 63 }, T.PLAZA); // yard
    g.fillRect({ x1: 82, y1: 46, x2: 109, y2: 61 }, T.ARENA); // core arena floor
    g.fillRect({ x1: 12, y1: 72, x2: 20, y2: 87 }, T.GARAGE); // garage interior

    // ── Roads ──────────────────────────────────────────────
    // Transit: tram spine + south road + avenues
    g.avenue(60, 136, 20); // tram line
    g.avenue(60, 136, 34);
    g.street(60, 10, 43);
    g.street(88, 10, 43);
    g.street(112, 10, 43);
    g.street(128, 10, 43);
    // Service: two horizontals + two verticals
    g.avenue(8, 52, 68);
    g.avenue(8, 52, 92);
    g.street(30, 56, 99);
    g.street(44, 56, 99);
    // Power: two horizontals + four verticals (continue the avenues)
    g.avenue(56, 136, 72);
    g.avenue(56, 136, 88);
    g.street(60, 64, 99);
    g.street(88, 64, 99);
    g.street(112, 64, 99);
    g.street(128, 64, 99);
    // Crosswalks at key intersections
    for (const [x, y] of [
      [30, 68], [44, 68], [30, 92], [44, 92],
      [60, 20], [88, 20], [112, 20], [128, 20],
      [60, 34], [88, 34], [112, 34], [128, 34],
      [60, 72], [88, 72], [112, 72], [128, 72],
      [60, 88], [88, 88], [112, 88], [128, 88],
    ] as const) {
      g.set(x, y, T.CROSSWALK);
    }

    // ── Buildings (rects, leaving 1-tile sidewalks) ────────
    const buildings: Rect[] = [
      // Transit north strip
      { x1: 62, y1: 11, x2: 86, y2: 17 }, { x1: 90, y1: 11, x2: 110, y2: 17 }, { x1: 114, y1: 11, x2: 126, y2: 17 }, { x1: 131, y1: 11, x2: 135, y2: 17 },
      // Transit mid (platform block small — keep 90..110 open below row 25)
      { x1: 62, y1: 23, x2: 86, y2: 25 }, { x1: 90, y1: 23, x2: 110, y2: 25 }, { x1: 114, y1: 23, x2: 126, y2: 25 }, { x1: 131, y1: 23, x2: 135, y2: 25 },
      { x1: 62, y1: 37, x2: 86, y2: 41 }, { x1: 90, y1: 37, x2: 110, y2: 41 }, { x1: 114, y1: 37, x2: 126, y2: 41 }, { x1: 131, y1: 37, x2: 135, y2: 41 },
      // Service quarter (north strip ends at row 65 → row 66 is the apron)
      { x1: 12, y1: 57, x2: 28, y2: 65 }, { x1: 32, y1: 57, x2: 42, y2: 65 }, { x1: 46, y1: 57, x2: 48, y2: 65 },
      { x1: 26, y1: 71, x2: 42, y2: 80 }, { x1: 26, y1: 82, x2: 42, y2: 89 }, { x1: 46, y1: 71, x2: 48, y2: 89 },
      { x1: 12, y1: 95, x2: 28, y2: 98 }, { x1: 32, y1: 95, x2: 42, y2: 98 }, { x1: 46, y1: 95, x2: 48, y2: 98 },
      // Power grid (substation plazas carved below)
      { x1: 63, y1: 67, x2: 86, y2: 69 }, { x1: 90, y1: 67, x2: 110, y2: 69 }, { x1: 114, y1: 67, x2: 126, y2: 69 }, { x1: 131, y1: 67, x2: 135, y2: 69 },
      { x1: 63, y1: 75, x2: 86, y2: 85 }, { x1: 114, y1: 75, x2: 126, y2: 85 }, { x1: 131, y1: 75, x2: 135, y2: 85 },
      { x1: 63, y1: 91, x2: 86, y2: 96 }, { x1: 114, y1: 91, x2: 126, y2: 96 }, { x1: 131, y1: 91, x2: 135, y2: 96 },
    ];
    for (const b of buildings) g.fillRect(b, T.BUILDING);

    // Substation plaza (power grid center) — open ground with transformers
    g.fillRect({ x1: 90, y1: 91, x2: 110, y2: 96 }, T.PLAZA);
    // Puddle field plaza
    g.fillRect({ x1: 63, y1: 75, x2: 72, y2: 78 }, T.PLAZA);

    // ── Walls ──────────────────────────────────────────────
    // Transit north wall
    g.fillRect({ x1: 56, y1: 8, x2: 136, y2: 9 }, T.WALL);
    // Power north wall (openings at avenues + relay gate corridor)
    g.fillRect({ x1: 56, y1: 64, x2: 136, y2: 65 }, T.WALL);
    for (const x of [58, 59, 60, 61, 62, 86, 87, 88, 89, 90, 92, 93, 94, 95, 96, 97, 98, 99, 100, 110, 111, 112, 113, 114, 126, 127, 128, 129, 130]) g.set(x, 64, T.ROAD_V);
    for (const x of [58, 59, 60, 61, 62, 86, 87, 88, 89, 90, 92, 93, 94, 95, 96, 97, 98, 99, 100, 110, 111, 112, 113, 114, 126, 127, 128, 129, 130]) g.set(x, 65, T.ROAD_V);
    // Power south wall
    g.fillRect({ x1: 56, y1: 98, x2: 136, y2: 99 }, T.WALL);
    // Service west + east walls (openings: yard link rows 56..63, roads y68/y92)
    g.fillRect({ x1: 8, y1: 56, x2: 9, y2: 99 }, T.WALL);
    g.fillRect({ x1: 50, y1: 56, x2: 53, y2: 99 }, T.WALL);
    // x54-55 apron connects service exits to the power grid / yard
    g.fillRect({ x1: 54, y1: 56, x2: 55, y2: 99 }, T.SIDEWALK);
    for (let y = 56; y <= 63; y++) g.set(52, y, T.SIDEWALK);
    for (let y = 56; y <= 63; y++) g.set(53, y, T.SIDEWALK);
    g.fillRect({ x1: 50, y1: 67, x2: 53, y2: 69 }, T.ROAD_H); // y68 exit
    g.fillRect({ x1: 50, y1: 91, x2: 53, y2: 93 }, T.ROAD_H); // y92 exit
    // Service north edge (void boundary) — visual wall
    g.fillRect({ x1: 8, y1: 54, x2: 52, y2: 55 }, T.WALL);

    // ── Core walls (with gate openings) ────────────────────
    g.fillRect({ x1: 80, y1: 44, x2: 111, y2: 45 }, T.WALL); // north
    g.fillRect({ x1: 80, y1: 62, x2: 111, y2: 63 }, T.WALL); // south
    g.fillRect({ x1: 80, y1: 46, x2: 81, y2: 61 }, T.WALL); // west
    g.fillRect({ x1: 110, y1: 46, x2: 111, y2: 61 }, T.WALL); // east
    // gates → DOOR tiles
    for (const gd of GATES) g.fillRect(gd.rect, T.DOOR);
    // door-side aprons
    g.fillRect({ x1: 90, y1: 42, x2: 102, y2: 43 }, T.PLAZA); // north approach
    g.fillRect({ x1: 90, y1: 56, x2: 102, y2: 61 }, T.PLAZA); // south approach (yard)

    // ── Garage walls ───────────────────────────────────────
    g.fillRect({ x1: 10, y1: 70, x2: 11, y2: 90 }, T.WALL); // west
    g.fillRect({ x1: 20, y1: 70, x2: 21, y2: 90 }, T.WALL); // east
    g.fillRect({ x1: 10, y1: 70, x2: 21, y2: 71 }, T.WALL); // north
    g.fillRect({ x1: 10, y1: 88, x2: 21, y2: 89 }, T.WALL); // south
    for (const gd of GATES) if (gd.id === 'garage') g.fillRect(gd.rect, T.DOOR);
    // service hatch (east wall, drone entry)
    g.set(21, 78, T.VOID);
    g.set(21, 79, T.VOID);

    // ── Yard details: sealed maintenance corner wall ───────
    g.fillRect({ x1: 74, y1: 44, x2: 75, y2: 47 }, T.WALL); // nook guarding maraOrigin terminal
    g.fillRect({ x1: 78, y1: 48, x2: 79, y2: 49 }, T.WALL);

    // west void boundary edge
    g.fillRect({ x1: 54, y1: 44, x2: 55, y2: 63 }, T.WALL);

    // sanity: clear stray crosswalk on garage hatch column
    g.set(30, 56, T.ROAD_V);
  }

  tile(x: number, y: number): TileCode {
    if (x < 0 || x >= W || y < 0 || y >= H) return T.VOID;
    return this.tiles[y * W + x] as TileCode;
  }

  isWalkable(x: number, y: number): boolean {
    const t = this.tile(x, y);
    if (WALKABLE.has(t)) return true;
    if (t === T.DOOR) {
      // walkable if ANY gate containing this tile is open
      for (const g of GATES) {
        if (this.doorOpen.has(g.id) && inRect(g.rect, x, y)) return true;
      }
    }
    return false;
  }

  /** Merge impassable tiles into collision rectangles. */
  collisionRects(): Rect[] {
    const out: Rect[] = [];
    const visited = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      let runStart = -1;
      for (let x = 0; x <= W; x++) {
        const solid = x < W && !this.isWalkable(x, y) && this.tile(x, y) !== T.VOID;
        if (solid && runStart < 0) runStart = x;
        if (!solid && runStart >= 0) {
          // try to extend the rect upward over already-visited rows
          let y1 = y;
          while (y1 > 0) {
            let ok = true;
            for (let xx = runStart; xx < x; xx++) {
              if (visited[(y1 - 1) * W + xx] !== 1 || !this.isWalkableSafe(xx, y1 - 1)) {
                ok = false;
                break;
              }
            }
            if (!ok) break;
            y1--;
          }
          for (let yy = y1; yy <= y; yy++) for (let xx = runStart; xx < x; xx++) visited[yy * W + xx] = 1;
          out.push({ x1: runStart, y1, x2: x - 1, y2: y - 1 });
          runStart = -1;
        }
      }
    }
    return out;
  }

  private isWalkableSafe(x: number, y: number): boolean {
    // variant used during merging (door state fixed at build time)
    const t = this.tile(x, y);
    return WALKABLE.has(t) || t === T.DOOR;
  }
}

// ─────────────────────────────────────────────────────────────
// Props (interactive + decorative placements)
// ─────────────────────────────────────────────────────────────

export type PropKind =
  | 'vehicle' | 'tank' | 'pipe' | 'transformer' | 'puddle' | 'capsule' | 'evacCapsule'
  | 'memory' | 'relay' | 'uplink' | 'tram' | 'lamp' | 'sign' | 'barrier' | 'wreck'
  | 'debris' | 'scorch' | 'pillar' | 'core' | 'chargepad' | 'crate' | 'bench' | 'vent'
  | 'spawn' | 'siren';

export interface PropDef {
  kind: PropKind;
  tile: readonly [number, number];
  dir?: 0 | 1 | 2 | 3; // 0=N 1=E 2=S 3=W (for oriented props)
  variant?: string;
  len?: number; // pipe length in tiles
  id?: string; // capsule/memory ids etc.
}

export const PROPS: PropDef[] = [
  // ── Garage ──────────────────────────────────────────────
  { kind: 'chargepad', tile: [16, 82] },
  { kind: 'bench', tile: [13, 74], dir: 2 },
  { kind: 'bench', tile: [19, 74], dir: 2 },
  { kind: 'crate', tile: [13, 78] },
  { kind: 'crate', tile: [14, 85] },
  { kind: 'crate', tile: [19, 83] },
  { kind: 'memory', tile: [16, 76], id: 'garageLog' },
  { kind: 'vehicle', tile: [16, 93], variant: 'damaged', dir: 1 }, // tutorial explosion target
  { kind: 'siren', tile: [12, 72] },
  { kind: 'siren', tile: [20, 72] },
  { kind: 'sign', tile: [15, 71], dir: 2, variant: 'cyan' },

  // ── Service Quarter ─────────────────────────────────────
  { kind: 'capsule', tile: [34, 90], id: 'capsuleA' },
  { kind: 'memory', tile: [38, 66], id: 'serviceGrid' },
  // chain setup A — road y68: vehicle → tank → pipe → tank → vehicle
  { kind: 'vehicle', tile: [16, 68], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [20, 68], variant: 'van', dir: 3 },
  { kind: 'tank', tile: [24, 68] },
  { kind: 'pipe', tile: [28, 68], dir: 1, len: 2 },
  { kind: 'tank', tile: [33, 68] },
  { kind: 'vehicle', tile: [37, 68], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [41, 68], variant: 'truck', dir: 3 },
  // parked cars along y92
  { kind: 'vehicle', tile: [12, 92], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [18, 92], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [24, 92], variant: 'van', dir: 1 },
  { kind: 'vehicle', tile: [44, 92], variant: 'car', dir: 3 },
  { kind: 'vehicle', tile: [48, 92], variant: 'car', dir: 3 },
  // alley clutter
  { kind: 'barrier', tile: [12, 66], dir: 1, len: 2 },
  { kind: 'wreck', tile: [49, 66], dir: 3 },
  { kind: 'debris', tile: [14, 66] },
  { kind: 'debris', tile: [28, 94] },
  { kind: 'scorch', tile: [33, 70] },
  { kind: 'lamp', tile: [12, 68] },
  { kind: 'lamp', tile: [49, 68] },
  { kind: 'lamp', tile: [14, 92] },
  { kind: 'lamp', tile: [49, 92] },
  { kind: 'sign', tile: [12, 56], dir: 2, variant: 'orange' },
  { kind: 'sign', tile: [46, 99], dir: 0, variant: 'cyan' },
  { kind: 'transformer', tile: [46, 66] },
  { kind: 'puddle', tile: [38, 94], dir: 0 },
  { kind: 'puddle', tile: [40, 94], dir: 0 },

  // ── Power Grid ──────────────────────────────────────────
  { kind: 'relay', tile: [96, 93] },
  { kind: 'transformer', tile: [93, 92] },
  { kind: 'transformer', tile: [103, 95] },
  { kind: 'puddle', tile: [98, 92] },
  { kind: 'puddle', tile: [95, 95] },
  { kind: 'puddle', tile: [92, 96] },
  { kind: 'memory', tile: [120, 90], id: 'powerSpikes' },
  // puddle field (west)
  { kind: 'transformer', tile: [65, 76] },
  { kind: 'puddle', tile: [67, 76] },
  { kind: 'puddle', tile: [69, 77] },
  { kind: 'puddle', tile: [66, 78] },
  { kind: 'puddle', tile: [71, 75] },
  // substation chain (center): tank + pipe + transformer
  { kind: 'tank', tile: [106, 93] },
  { kind: 'pipe', tile: [100, 91], dir: 1, len: 3 },
  { kind: 'vehicle', tile: [110, 92], variant: 'car', dir: 2 },
  { kind: 'vehicle', tile: [88, 74], variant: 'truck', dir: 0 },
  { kind: 'vehicle', tile: [92, 74], variant: 'car', dir: 0 },
  // parked along y72 / y88
  { kind: 'vehicle', tile: [64, 72], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [70, 72], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [118, 88], variant: 'van', dir: 3 },
  { kind: 'vehicle', tile: [124, 88], variant: 'car', dir: 3 },
  { kind: 'wreck', tile: [68, 90], dir: 1 },
  { kind: 'barrier', tile: [130, 76], dir: 1, len: 2 },
  { kind: 'scorch', tile: [104, 88] },
  { kind: 'lamp', tile: [64, 88] },
  { kind: 'lamp', tile: [128, 88] },
  { kind: 'lamp', tile: [64, 72] },
  { kind: 'lamp', tile: [128, 72] },
  { kind: 'sign', tile: [56, 66], dir: 1, variant: 'orange' },
  { kind: 'sign', tile: [136, 97], dir: 3, variant: 'cyan' },
  { kind: 'debris', tile: [76, 90] },
  { kind: 'debris', tile: [128, 94] },

  // ── Transit Sector ──────────────────────────────────────
  { kind: 'tram', tile: [104, 20], dir: 1, len: 5 }, // halted tram blocking y20 x96..112
  { kind: 'capsule', tile: [100, 30], id: 'eli' },
  { kind: 'uplink', tile: [95, 28] },
  { kind: 'memory', tile: [76, 18], id: 'transitHalt' },
  { kind: 'memory', tile: [92, 43], id: 'coreGateLog' },
  // chain setup C — platform edge gas corridor
  { kind: 'pipe', tile: [87, 26], dir: 1, len: 4 },
  { kind: 'tank', tile: [94, 26] },
  { kind: 'vehicle', tile: [86, 28], variant: 'van', dir: 2 },
  { kind: 'vehicle', tile: [108, 28], variant: 'car', dir: 2 },
  { kind: 'tank', tile: [112, 32] },
  // parked + clutter
  { kind: 'vehicle', tile: [64, 20], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [70, 20], variant: 'car', dir: 1 },
  { kind: 'vehicle', tile: [118, 34], variant: 'van', dir: 3 },
  { kind: 'barrier', tile: [64, 12], dir: 1, len: 2 },
  { kind: 'wreck', tile: [126, 26], dir: 1 },
  { kind: 'scorch', tile: [108, 22] },
  { kind: 'debris', tile: [92, 18] },
  { kind: 'debris', tile: [120, 36] },
  { kind: 'lamp', tile: [62, 20] },
  { kind: 'lamp', tile: [134, 20] },
  { kind: 'lamp', tile: [62, 34] },
  { kind: 'lamp', tile: [134, 34] },
  { kind: 'sign', tile: [56, 10], dir: 2, variant: 'teal' },
  { kind: 'sign', tile: [136, 40], dir: 3, variant: 'orange' },
  { kind: 'vent', tile: [90, 30] },
  { kind: 'vent', tile: [106, 30] },

  // ── Perimeter Yard ──────────────────────────────────────
  { kind: 'transformer', tile: [60, 48] },
  { kind: 'transformer', tile: [70, 58] },
  { kind: 'transformer', tile: [124, 48] },
  { kind: 'transformer', tile: [132, 58] },
  { kind: 'transformer', tile: [60, 60] },
  { kind: 'transformer', tile: [132, 60] },
  { kind: 'tank', tile: [58, 52] },
  { kind: 'tank', tile: [134, 52] },
  { kind: 'tank', tile: [56, 56] },
  { kind: 'puddle', tile: [62, 50] },
  { kind: 'puddle', tile: [130, 50] },
  { kind: 'puddle', tile: [66, 56] },
  { kind: 'puddle', tile: [128, 56] },
  { kind: 'evacCapsule', tile: [60, 52], id: 'evac1' },
  { kind: 'evacCapsule', tile: [132, 52], id: 'evac2' },
  { kind: 'memory', tile: [64, 58], id: 'decommission' },
  { kind: 'memory', tile: [76, 48], id: 'maraOrigin' },
  { kind: 'barrier', tile: [112, 48], dir: 1, len: 2 },
  { kind: 'barrier', tile: [112, 56], dir: 1, len: 2 },
  { kind: 'scorch', tile: [120, 60] },
  { kind: 'debris', tile: [58, 62] },
  { kind: 'debris', tile: [132, 46] },
  { kind: 'lamp', tile: [56, 47] },
  { kind: 'lamp', tile: [136, 47] },
  { kind: 'lamp', tile: [56, 61] },
  { kind: 'lamp', tile: [136, 61] },
  { kind: 'sign', tile: [56, 46], dir: 2, variant: 'amber' },
  { kind: 'sign', tile: [136, 62], dir: 3, variant: 'amber' },

  // ── Core arena ──────────────────────────────────────────
  { kind: 'core', tile: [96, 52] },
  { kind: 'pillar', tile: [85, 49] },
  { kind: 'pillar', tile: [107, 49] },
  { kind: 'pillar', tile: [85, 59] },
  { kind: 'pillar', tile: [107, 59] },
  { kind: 'evacCapsule', tile: [84, 56], id: 'evac3' },
  { kind: 'memory', tile: [86, 60], id: 'guardianSignal' },
  { kind: 'vent', tile: [88, 48] },
  { kind: 'vent', tile: [104, 48] },
  { kind: 'vent', tile: [88, 58] },
  { kind: 'vent', tile: [104, 58] },
  { kind: 'scorch', tile: [96, 58] },

  // ── Enemy spawn points (district weighted) ──────────────
  { kind: 'spawn', tile: [30, 62], variant: 'drone' },
  { kind: 'spawn', tile: [46, 70], variant: 'drone' },
  { kind: 'spawn', tile: [18, 94], variant: 'drone' },
  { kind: 'spawn', tile: [44, 74], variant: 'hunter' },
  { kind: 'spawn', tile: [30, 60], variant: 'drone' },
  { kind: 'spawn', tile: [88, 80], variant: 'drone' },
  { kind: 'spawn', tile: [100, 74], variant: 'shield' },
  { kind: 'spawn', tile: [112, 84], variant: 'drone' },
  { kind: 'spawn', tile: [66, 90], variant: 'detonator' },
  { kind: 'spawn', tile: [100, 96], variant: 'drone' },
  { kind: 'spawn', tile: [124, 70], variant: 'hunter' },
  { kind: 'spawn', tile: [78, 86], variant: 'shield' },
  { kind: 'spawn', tile: [66, 30], variant: 'drone' },
  { kind: 'spawn', tile: [124, 30], variant: 'detonator' },
  { kind: 'spawn', tile: [70, 18], variant: 'drone' },
  { kind: 'spawn', tile: [118, 36], variant: 'shield' },
  { kind: 'spawn', tile: [102, 36], variant: 'hunter' },
  { kind: 'spawn', tile: [60, 50], variant: 'drone' },
  { kind: 'spawn', tile: [128, 50], variant: 'drone' },
  { kind: 'spawn', tile: [64, 60], variant: 'detonator' },
  { kind: 'spawn', tile: [130, 60], variant: 'shield' },
];

// ─────────────────────────────────────────────────────────────
// Validation (used by unit tests + dev assertions)
// ─────────────────────────────────────────────────────────────

export function validateCity(): string[] {
  const errs: string[] = [];
  const grid = new CityGrid();
  const walk = (x: number, y: number) => grid.isWalkable(x, y);

  // player spawn + key POIs walkable
  for (const [x, y, name] of [
    [16, 82, 'spawn'], [16, 93, 'tutorial vehicle'], [34, 90, 'capsuleA'], [96, 93, 'relay'],
    [95, 28, 'uplink'], [100, 30, 'eli'], [96, 52, 'core'], [84, 56, 'evac3'],
    [64, 58, 'decommission'], [76, 48, 'maraOrigin'], [92, 43, 'coreGateLog'],
  ] as const) {
    if (!walk(x, y)) errs.push(`${name} (${x},${y}) not walkable`);
  }
  // memory tiles from memories.ts
  const memTiles: Array<readonly [number, number, string]> = [
    [16, 76, 'garageLog'], [38, 66, 'serviceGrid'], [120, 90, 'powerSpikes'],
    [76, 18, 'transitHalt'], [86, 60, 'guardianSignal'], [60, 52, 'evac1'], [132, 52, 'evac2'],
  ];
  for (const [x, y, n] of memTiles) if (!walk(x, y)) errs.push(`memory ${n} (${x},${y}) not walkable`);

  // Connectivity: BFS from spawn to key points (all doors open)
  for (const g of GATES) grid.doorOpen.add(g.id);
  const bfs = (sx: number, sy: number, tx: number, ty: number): boolean => {
    const seen = new Uint8Array(W * H);
    const q: number[] = [sy * W + sx];
    seen[sy * W + sx] = 1;
    const target = ty * W + tx;
    while (q.length) {
      const c = q.shift()!;
      if (c === target) return true;
      const cx = c % W;
      const cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
        const ni = ny * W + nx;
        if (seen[ni]) continue;
        if (!walk(nx, ny)) continue;
        seen[ni] = 1;
        q.push(ni);
      }
    }
    return false;
  };
  if (!bfs(16, 82, 34, 90)) errs.push('spawn → capsuleA unreachable');
  if (!bfs(16, 82, 96, 93)) errs.push('spawn → relay unreachable');
  if (!bfs(16, 82, 96, 52)) errs.push('spawn → core (all gates open) unreachable');
  if (!bfs(16, 82, 100, 30)) errs.push('spawn → eli unreachable');
  if (!bfs(16, 82, 64, 58)) errs.push('spawn → decommission unreachable');

  // Gates have walkable sides (horizontal gates → check above/below; vertical → left/right)
  for (const g of GATES) {
    const { x1, x2, y1, y2 } = g.rect;
    const horizontal = x2 - x1 >= y2 - y1;
    const sideA = horizontal ? walk(x1, y1 - 1) && walk(x2, y1 - 1) : walk(x1 - 1, y1) && walk(x1 - 1, y2);
    const sideB = horizontal ? walk(x1, y2 + 1) && walk(x2, y2 + 1) : walk(x2 + 1, y1) && walk(x2 + 1, y2);
    if (!sideA || !sideB) errs.push(`gate ${g.id} missing walkable approach`);
  }
  return errs;
}
