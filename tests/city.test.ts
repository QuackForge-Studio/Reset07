import { describe, expect, it } from 'vitest';
import { CityGrid, GATES, PROPS, W, H, validateCity, T, districtAt } from '../src/play/world/cityData';

describe('city grid', () => {
  it('has the expected dimensions', () => {
    const g = new CityGrid();
    expect(g.tiles.length).toBe(W * H);
  });

  it('passes full validation (walkable POIs + connectivity)', () => {
    const errs = validateCity();
    expect(errs).toEqual([]);
  });

  it('all prop tiles are on walkable ground (interactive props)', () => {
    const g = new CityGrid();
    const interactive = new Set(['vehicle', 'tank', 'pipe', 'transformer', 'capsule', 'evacCapsule', 'memory', 'relay', 'uplink', 'tram', 'pillar', 'core', 'vent', 'chargepad']);
    const bad: string[] = [];
    for (const p of PROPS) {
      if (!interactive.has(p.kind)) continue;
      const [x, y] = p.tile;
      const t = g.tile(x, y);
      if (!g.isWalkable(x, y) && !(t === T.DOOR)) bad.push(`${p.kind}@${x},${y} → ${t}`);
    }
    expect(bad).toEqual([]);
  });

  it('gates start closed (doors block pathfinding)', () => {
    const g = new CityGrid();
    expect(g.isWalkable(16, 88)).toBe(false); // garage gate tile
    expect(g.isWalkable(96, 44)).toBe(false); // core north gate tile
  });

  it('doors open when the gate is unlocked', () => {
    const g = new CityGrid();
    g.doorOpen.add('garage');
    g.doorOpen.add('coreN');
    expect(g.isWalkable(16, 88)).toBe(true);
    expect(g.isWalkable(96, 44)).toBe(true);
    expect(g.isWalkable(96, 62)).toBe(false); // relay gate still closed
  });

  it('district lookup works (core wins over yard)', () => {
    expect(districtAt(16, 82).id).toBe('garage');
    expect(districtAt(96, 52).id).toBe('core');
    expect(districtAt(70, 50).id).toBe('yard');
    expect(districtAt(100, 20).id).toBe('transit');
    expect(districtAt(100, 80).id).toBe('power');
    expect(districtAt(30, 80).id).toBe('service');
  });

  it('all gates are reachable-adjacent from walkable ground', () => {
    const g = new CityGrid();
    for (const gate of GATES) {
      const { rect } = gate;
      // every door tile must border at least one walkable tile
      for (let y = rect.y1; y <= rect.y2; y++) {
        for (let x = rect.x1; x <= rect.x2; x++) {
          let hasNeighbor = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            if (g.isWalkable(x + dx, y + dy)) hasNeighbor = true;
          }
          expect(hasNeighbor, `door tile ${x},${y} isolated`).toBe(true);
        }
      }
    }
  });
});
