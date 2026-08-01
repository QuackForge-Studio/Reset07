/**
 * RESET//07 — grid pathfinding (A*) + line of sight.
 * Rate-limited and cached; cheap enough for dozens of enemies on mobile.
 */

import { CityGrid, W } from '../world/cityData';

interface Node {
  x: number;
  y: number;
  g: number;
  f: number;
  parent: Node | null;
  closed: boolean;
  opened: boolean;
}

export class Pathfinder {
  private grid: CityGrid;
  private nodes: Node[] = [];
  private heap: Node[] = [];
  private cache = new Map<string, { path: Array<{ x: number; y: number }>; at: number }>();
  private lastRun = 0;
  private static CACHE_TTL = 4000;
  private static RATE_MS = 90;

  constructor(grid: CityGrid) {
    this.grid = grid;
    for (let i = 0; i < W * 104; i++) {
      this.nodes.push({ x: i % W, y: (i / W) | 0, g: 0, f: 0, parent: null, closed: false, opened: false });
    }
  }

  /** Call when doors open/close — invalidates cached paths. */
  invalidate(): void {
    this.cache.clear();
  }

  /** Open/close a gate: door tiles become (un)walkable for pathfinding. */
  setDoorOpen(gateId: string, open: boolean): void {
    if (open) this.grid.doorOpen.add(gateId);
    else this.grid.doorOpen.delete(gateId);
    this.invalidate();
  }

  private push(n: Node): void {
    this.heap.push(n);
    let i = this.heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p].f <= n.f) break;
      this.heap[i] = this.heap[p];
      i = p;
    }
    this.heap[i] = n;
  }

  private pop(): Node | null {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length === 0) return top ?? null;
    if (last && top) {
      let i = 0;
      this.heap[0] = last;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.heap.length && this.heap[l].f < this.heap[m].f) m = l;
        if (r < this.heap.length && this.heap[r].f < this.heap[m].f) m = r;
        if (m === i) break;
        const tmp = this.heap[m];
        this.heap[m] = this.heap[i];
        this.heap[i] = tmp;
        i = m;
      }
    }
    return top;
  }

  lineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    // supercover DDA over walkable tiles
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let x = x1;
    let y = y1;
    for (let guard = 0; guard < 300; guard++) {
      if (!this.grid.isWalkable(x, y)) return false;
      if (x === x2 && y === y2) return true;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    return true;
  }

  /** Find a tile path; returns null if unreachable or rate-limited. */
  findPath(sx: number, sy: number, tx: number, ty: number): Array<{ x: number; y: number }> | null {
    const key = `${sx},${sy}>${tx},${ty}`;
    const now = performance.now();
    const cached = this.cache.get(key);
    if (cached && now - cached.at < Pathfinder.CACHE_TTL) return cached.path;
    if (now - this.lastRun < Pathfinder.RATE_MS) return null;
    this.lastRun = now;

    if (!this.grid.isWalkable(tx, ty)) return null;
    if (sx === tx && sy === ty) return [{ x: tx, y: ty }];

    const start = this.nodes[sy * W + sx];
    const target = this.nodes[ty * W + tx];
    for (const n of this.nodes) {
      n.g = 0;
      n.f = 0;
      n.parent = null;
      n.closed = false;
      n.opened = false;
    }
    this.heap.length = 0;
    start.g = 0;
    start.f = this.h(start, target);
    start.opened = true;
    this.push(start);

    let expansions = 0;
    let found: Node | null = null;
    while (this.heap.length > 0 && expansions < 6000) {
      const cur = this.pop();
      if (!cur) break;
      if (cur === target) {
        found = cur;
        break;
      }
      cur.closed = true;
      expansions++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]] as const) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= 104) continue;
        if (!this.grid.isWalkable(nx, ny)) continue;
        if (dx !== 0 && dy !== 0) {
          // prevent corner cutting
          if (!this.grid.isWalkable(cur.x + dx, cur.y)) continue;
          if (!this.grid.isWalkable(cur.x, cur.y + dy)) continue;
        }
        const nb = this.nodes[ny * W + nx];
        if (nb.closed) continue;
        const cost = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const g = cur.g + cost;
        if (!nb.opened || g < nb.g) {
          nb.g = g;
          nb.f = g + this.h(nb, target);
          nb.parent = cur;
          if (!nb.opened) {
            nb.opened = true;
            this.push(nb);
          }
        }
      }
    }

    if (!found) {
      this.cache.set(key, { path: [], at: now });
      return null;
    }
    const path: Array<{ x: number; y: number }> = [];
    let n: Node | null = found;
    while (n) {
      path.push({ x: n.x, y: n.y });
      n = n.parent;
    }
    path.reverse();
    this.cache.set(key, { path, at: now });
    return path;
  }

  private h(a: Node, b: Node): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.max(dx, dy) + 0.414 * Math.min(dx, dy);
  }
}
