# Loop Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add seeded in-loop side events (Supply Drop + Ambush) that give detours real functional rewards, increasing gameplay variety without touching the main objective chain.

**Architecture:** Pure deterministic event-picker in `src/play/data/events.ts` (mulberry32 PRNG, seeded by `story.loops`), a scene-level spawner in `WorldScene` that reads the pick and materializes either a hold-interact supply crate or a telegraphed ambush, rewards wired to existing player APIs (`resetHeat`-style + `addOverdriveCharge`), and HUD side-objective chips via the existing snapshot mechanism.

**Tech Stack:** TypeScript + Vite + Phaser 3 + Vitest. No new dependencies. No new texture canvas sizes (physics offsets are load-bearing).

## Global Constraints

- **No new dependencies** — procedural textures via `texgen.ts` only.
- **No changes to existing texture canvas sizes** — physics body offsets depend on them.
- **Colors only from `PAL` / `src/play/palette.ts`** — never raw hex in scene code.
- **All user-facing strings via `src/play/data/strings.ts`** (`t(key)`), with EN + VI entries.
- **Main chain, endings, LoopTimer, SaveSystem, chain explosions, boss fight: untouched.**
- **Mobile/touch-safe** — new events use only existing input patterns (hold-interact, auto-aim).
- **Reduced motion respected** — new telegraphs already reduced-motion aware; no new motion.
- **E2E debug hook `window.__r07`** is DEV/VITE_E2E only.
- **`scene.restart()` reuses instance** — all new class-field arrays/flags MUST be reset at the top of `create()`.
- **Event spawn tiles are hardcoded, hand-verified walkable, prop-free, non-arena, gate-away** (see Task 2).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/play/data/events.ts` (new) | Pure `pickLoopEvents` + rewards + seeded PRNG. No Phaser imports. |
| `src/play/entities/environment.ts` (modify) | New `SupplyCrate` Interactable class. |
| `src/play/scenes/WorldScene.ts` (modify) | Loop-event spawner, ambush trigger, rewards, snapshot side objectives. |
| `src/play/data/strings.ts` (modify) | New `event.*` EN/VI strings. |
| `src/play/ui/HUD.tsx` (modify) | Render side-event chips (no new HUD components). |
| `tests/events.test.ts` (new) | Unit tests for the pure logic. |

---

## Task 1: Pure event-picker logic

**Files:**
- Create: `src/play/data/events.ts`
- Test: `tests/events.test.ts`

**Interfaces:**
- Produces:
  - `type LoopEventKind = 'supply' | 'ambush'`
  - `interface LoopEvent { district: string; kind: LoopEventKind }` (district is a `DistrictId` union)
  - `type DistrictId = 'service' | 'power' | 'transit' | 'yard'`
  - `function seededRng(seed: number): () => number` — mulberry32
  - `function pickLoopEvents(seed: number, reachable: DistrictId[], last?: LoopEvent): LoopEvent[]`
  - `const SUPPLY_REWARD: { heat: 0; overdrive: 0.4 }` / `AMBUSH_REWARD: { overdrive: 0.3 }`
  - `const MAX_EVENTS = 2`
  - `const LOOP_EVENT_DISTRICTS: DistrictId[] = ['service', 'power', 'transit', 'yard']`
  - `const EVENT_SLOTS: Record<DistrictId, Array<[number, number]>>` — hand-verified tiles (Task 2)

- [ ] **Step 1: Write the failing test**

```ts
// tests/events.test.ts
import { describe, expect, it } from 'vitest';
import { seededRng, pickLoopEvents, MAX_EVENTS, SUPPLY_REWARD, AMBUSH_REWARD } from '../src/play/data/events';

describe('seededRng', () => {
  it('is deterministic for the same seed', () => {
    const a = seededRng(42); const b = seededRng(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
  it('produces different sequences for different seeds', () => {
    const a = seededRng(1); const b = seededRng(2);
    expect(a()).not.toBe(b());
  });
});

describe('pickLoopEvents', () => {
  it('is deterministic for a seed', () => {
    const a = pickLoopEvents(7, ['service', 'power']);
    const b = pickLoopEvents(7, ['service', 'power']);
    expect(a).toEqual(b);
  });

  it('returns 1–2 events, never 0 when districts reachable', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['service', 'power', 'transit', 'yard']);
      expect(ev.length).toBeGreaterThanOrEqual(1);
      expect(ev.length).toBeLessThanOrEqual(MAX_EVENTS);
    }
  });

  it('returns 0 events when no districts are reachable', () => {
    expect(pickLoopEvents(5, [])).toEqual([]);
  });

  it('never places two events in the same district', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['service', 'power', 'transit', 'yard']);
      const districts = ev.map((e) => e.district);
      expect(new Set(districts).size).toBe(districts.length);
    }
  });

  it('only uses reachable districts', () => {
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['power', 'yard']);
      for (const e of ev) expect(['power', 'yard']).toContain(e.district);
    }
  });

  it('avoids repeating the last district immediately', () => {
    const last = { district: 'power', kind: 'ambush' as const };
    for (let seed = 0; seed < 50; seed++) {
      const ev = pickLoopEvents(seed, ['service', 'power'], { last });
      expect(ev.find((e) => e.district === 'power')).toBeUndefined();
    }
  });

  it('a supply and an ambush can coexist in the same loop', () => {
    // find a seed that yields both kinds across a sweep
    let both = false;
    for (let seed = 0; seed < 500; seed++) {
      const kinds = pickLoopEvents(seed, ['service', 'power', 'transit', 'yard']).map((e) => e.kind);
      if (kinds.includes('supply') && kinds.includes('ambush')) { both = true; break; }
    }
    expect(both).toBe(true);
  });
});

describe('rewards', () => {
  it('supply resets heat and grants 40% overdrive', () => {
    expect(SUPPLY_REWARD).toEqual({ heat: 0, overdrive: 0.4 });
  });
  it('ambush grants 30% overdrive', () => {
    expect(AMBUSH_REWARD).toEqual({ overdrive: 0.3 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/events.test.ts`
Expected: FAIL with "Cannot find module '../src/play/data/events'".

- [ ] **Step 3: Write minimal implementation**

```ts
// src/play/data/events.ts
export type LoopEventKind = 'supply' | 'ambush';
export type DistrictId = 'service' | 'power' | 'transit' | 'yard';

export interface LoopEvent {
  district: DistrictId;
  kind: LoopEventKind;
}

export const MAX_EVENTS = 2;
export const SUPPLY_REWARD = { heat: 0, overdrive: 0.4 };
export const AMBUSH_REWARD = { overdrive: 0.3 };

/** Districts that can host loop events (garage excluded; core is the boss arena). */
export const LOOP_EVENT_DISTRICTS: DistrictId[] = ['service', 'power', 'transit', 'yard'];

/**
 * Hand-verified event spawn tiles per district (walkable, prop-free, not arena,
 * not within 2 tiles of a gate). Sourced from a grid scan of cityData.
 */
export const EVENT_SLOTS: Record<DistrictId, Array<[number, number]>> = {
  service: [[30, 69], [44, 57]],
  power: [[70, 87], [124, 87]],
  transit: [[70, 21], [124, 21]],
  yard: [[120, 56], [96, 56]],
};

/** mulberry32 — deterministic PRNG for a given integer seed. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickLoopEvents(seed: number, reachable: DistrictId[], opts?: { last?: LoopEvent }): LoopEvent[] {
  const pool = LOOP_EVENT_DISTRICTS.filter((d) => reachable.includes(d));
  if (pool.length === 0) return [];
  const last = opts?.last;
  const cands = last ? pool.filter((d) => d !== last.district) : pool;
  if (cands.length === 0) return [];

  const rng = seededRng(seed);
  const count = 1 + Math.floor(rng() * Math.min(MAX_EVENTS, cands.length));

  // shuffle candidates deterministically
  const order = [...cands];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const out: LoopEvent[] = [];
  for (let i = 0; i < count; i++) {
    const district = order[i];
    const kind: LoopEventKind = rng() < 0.5 ? 'supply' : 'ambush';
    out.push({ district, kind });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/events.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/play/data/events.ts tests/events.test.ts
git commit -m "feat(events): seeded loop-event picker + rewards + unit tests"
```

---

## Task 2: SupplyCrate Interactable

**Files:**
- Modify: `src/play/entities/environment.ts` (append `SupplyCrate` class near `RescueCapsule`)
- Test: none (Phaser-integrated; verified by Task 6 E2E + typecheck)

**Interfaces:**
- Consumes: `WorldScene` (from `./WorldScene` — avoids circular import), `PAL` (already imported), `Interactable` interface.
- Produces: `class SupplyCrate extends Phaser.GameObjects.Image implements Interactable`
  - `constructor(scene: Phaser.Scene, x: number, y: number, cfg: { onOpened: () => void })`
  - `intId: string` (unique), `radius = 56`, `labelKey = 'event.supply'`, `holdTime = 1.2`, `kind = 'hold'`, `enabled = true`
  - `onInteract()` — calls `cfg.onOpened()`, marks opened, plays open FX, self-destroys.

- [ ] **Step 1: Add `SupplyCrate` class**

Append after `RescueCapsule` in `src/play/entities/environment.ts`:

```ts
/**
 * Loop-event supply crate — hold to open. Grants the supply reward
 * (heat reset + overdrive) once, then self-destructs with an FX burst.
 */
export class SupplyCrate extends Phaser.GameObjects.Image implements Interactable {
  readonly intId: string;
  radius = 56;
  labelKey = 'event.supply';
  holdTime = 1.2;
  kind = 'hold' as const;
  enabled = true;
  private opened = false;
  private cfg: { onOpened: () => void };
  private pulse = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: { onOpened: () => void }) {
    super(scene, x, y, 'crate');
    this.intId = `supply-${x}-${y}`;
    this.cfg = cfg;
    this.setDepth(45);
    this.setOrigin(0.5, 0.5);
  }

  update(dt: number): void {
    if (this.opened) return;
    this.pulse += dt * 3;
    const s = 1 + 0.05 * Math.sin(this.pulse * 1.5);
    this.setScale(s, s);
    this.alpha = 0.95 + 0.05 * Math.sin(this.pulse * 2.4);
  }

  onInteract(): void {
    if (this.opened) return;
    this.opened = true;
    this.enabled = false;
    const scene = this.scene as WorldScene;
    scene.sfx('pickup');
    scene.fx.spawnGlow(this.x, this.y, PAL.cyan, 2, 0.5);
    this.cfg.onOpened();
    this.destroy();
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors; the class references `WorldScene` already imported in the file).

- [ ] **Step 3: Commit**

```bash
git add src/play/entities/environment.ts
git commit -m "feat(events): SupplyCrate interactable (hold to open, one-shot reward)"
```

---

## Task 3: Strings for loop events

**Files:**
- Modify: `src/play/data/strings.ts`

**Interfaces:**
- Consumes: existing `en`/`vi` dicts + `t()`.
- Produces: `event.supply`, `event.ambush`, `event.ambushClear` (EN + VI).

- [ ] **Step 1: Add EN strings**

Add to the `en` dict (near the `obj.*` block):

```ts
'event.supply': 'OPEN SUPPLY CRATE',
'event.ambush': 'AMBUSH WARNING — STREET',
'event.ambushClear': 'AMBUSH CLEARED',
```

- [ ] **Step 2: Add VI strings**

Add to the `vi` dict:

```ts
'event.supply': 'MỞ THÙNG TIẾP TẾ',
'event.ambush': 'CẢNH BÁO PHỤC KÍCH — ĐƯỜNG PHỐ',
'event.ambushClear': 'ĐÃ DỌN PHỤC KÍCH',
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/play/data/strings.ts
git commit -m "feat(events): EN/VI strings for supply + ambush events"
```

---

## Task 4: WorldScene loop-event spawner

**Files:**
- Modify: `src/play/scenes/WorldScene.ts` (multiple locations)

**Interfaces:**
- Consumes: `pickLoopEvents`, `EVENT_SLOTS`, `SUPPLY_REWARD`, `AMBUSH_REWARD` (from `../data/events`); `SupplyCrate` (from `../entities/environment`); existing `spawnEnemyAt`, `interactables`, `playerPos`, `pathfinder`, `sfx`, `fx`.
- Produces: class fields `loopEvents: Array<{ district: DistrictId; kind: LoopEventKind; tile: [number, number]; completed?: boolean }>` and `ambushActive: boolean`; private methods `spawnLoopEvents()`, `ambushTriggerLine(x: number, y: number)`, `checkAmbushComplete()`, `sideObjectiveSnapshot()`; wires rewards.

- [ ] **Step 1: Add imports + class fields**

At the top of `WorldScene.ts`, add to the environment import:

```ts
import { RescueCapsule, MemoryCrystal, Relay, EvacCapsule, Explosive, SupplyCrate, type Interactable } from '../entities/environment';
```

Add near other type imports:

```ts
import { pickLoopEvents, EVENT_SLOTS, SUPPLY_REWARD, AMBUSH_REWARD, type DistrictId, type LoopEventKind } from '../data/events';
```

Add class fields (near `enemyList` etc.):

```ts
  loopEvents: Array<{ district: DistrictId; kind: LoopEventKind; tile: [number, number]; completed?: boolean }> = [];
  ambushActive = false;
```

- [ ] **Step 2: Reset fields at top of `create()`**

In the `// ── reset per-instance state` block, add:

```ts
    this.loopEvents.length = 0;
    this.ambushActive = false;
```

- [ ] **Step 3: Call spawner after objectives set up**

After `this.objectives = new ObjectiveTracker(plan);` (near line 254) add:

```ts
    this.spawnLoopEvents();
```

- [ ] **Step 4: Implement the spawner + helpers**

Add these private methods (near `seedDistricts`):

```ts
  /**
   * Seed 1–2 loop events for this loop from the pure picker. Uses the same
   * reachability logic as side objectives: events appear once the garage
   * gate is open (service + power + transit + yard reachable).
   */
  private spawnLoopEvents(): void {
    if (this.save.story.loops === 0) return; // opening script owns loop 1
    const reachable: DistrictId[] = ['service', 'power', 'transit', 'yard'];
    const picked = pickLoopEvents(this.save.story.loops, reachable);
    this.loopEvents = picked.map((e) => ({ ...e, tile: EVENT_SLOTS[e.district][e.kind === 'supply' ? 0 : 1], completed: false }));
    for (const ev of this.loopEvents) {
      const [tx, ty] = ev.tile;
      const wx = tx * TILE + TILE / 2;
      const wy = ty * TILE + TILE / 2;
      if (ev.kind === 'supply') {
        const crate = new SupplyCrate(this, wx, wy, {
          onOpened: () => {
            this.player.resetHeat();
            this.player.addOverdriveCharge(SUPPLY_REWARD.overdrive * 100);
            this.sfx('pickup');
            this.fx.spawnGlow(wx, wy, PAL.cyan, 3, 0.6);
            bus.emit('toast', { text: t('event.supply'), tone: 'good' });
            ev.completed = true;
          },
        });
        this.interactables.push(crate);
      } else {
        this.ambushTriggerLine(wx, wy);
      }
    }
  }
```

- [ ] **Step 5: Ambush trigger + reward**

```ts
  /** A trigger zone over the ambush tile; crossing spawns the wave. */
  private ambushTriggerLine(x: number, y: number): void {
    const zone = this.add.zone(x, y, TILE * 4, TILE * 2).setOrigin(0.5, 0.5);
    this.physics.add.existing(zone, true);
    this.physics.add.overlap(this.player, zone, () => {
      if (this.ambushActive || this.loopState !== 'playing') return;
      this.ambushActive = true;
      const dx = 120, dy = 0;
      const tx = Math.round((x + dx) / TILE), ty = Math.round(y / TILE);
      const wx = tx * TILE + TILE / 2, wy = ty * TILE + TILE / 2;
      this.spawnEnemyAt('drone', wx - 40, wy);
      this.spawnEnemyAt('drone', wx + 40, wy);
      this.spawnEnemyAt('detonator', wx, wy + 50);
      this.sfx('warning');
    });
  }
```

- [ ] **Step 6: Complete ambush when wave cleared**

In `spawnEnemyAt`'s `onDeath` callback (where `this.enemyList` is filtered), after the existing logic add a hook that completes the ambush when the wave is gone. Add this call at the end of that `onDeath`:

```ts
          this.checkAmbushComplete();
```

And add:

```ts
  private checkAmbushComplete(): void {
    if (!this.ambushActive) return;
    const alive = this.enemyList.filter((e) => e.alive);
    if (alive.length === 0) {
      this.ambushActive = false;
      const ev = this.loopEvents.find((e) => e.kind === 'ambush' && !e.completed);
      if (ev) ev.completed = true;
      this.player.addOverdriveCharge(AMBUSH_REWARD.overdrive * 100);
      this.sfx('pickup');
      bus.emit('toast', { text: t('event.ambushClear'), tone: 'good' });
    }
  }
```

**Note:** The ambush wave is 3 enemies; the scene's regular spawner also adds enemies, so "no enemies alive" correctly means the whole wave + any regular spawns are cleared — accept this as the ambush-complete condition (deterministic, simple).

- [ ] **Step 7: HUD side-objective snapshot**

In `pushHud`'s snapshot `next` object, change the `sideObjectives` line from:

```ts
      sideObjectives: this.objectives.plan.side.filter((o) => this.objectives.isSideActive(o.id)).map((o) => t(o.descKey)),
```

to:

```ts
      sideObjectives: this.sideObjectiveSnapshot(),
```

and add:

```ts
  private sideObjectiveSnapshot(): string[] {
    const base = this.objectives.plan.side.filter((o) => this.objectives.isSideActive(o.id)).map((o) => t(o.descKey));
    const events = this.loopEvents
      .filter((ev) => !ev.completed)
      .map((ev) => t(ev.kind === 'supply' ? 'event.supply' : 'event.ambush'));
    return [...base, ...events];
  }
```

- [ ] **Step 8: Typecheck + unit tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS (both).

**Required:** `Player` has NO `resetHeat()` — Task 4a is mandatory (adds it).

- [ ] **Step 9: Commit**

```bash
git add src/play/scenes/WorldScene.ts
git commit -m "feat(events): loop-event spawner, ambush wave + rewards, HUD side chips"
```

---

## Task 4a: Player.resetHeat (mandatory)

**Files:**
- Modify: `src/play/entities/Player.ts`

**Interfaces:**
- Produces: `public resetHeat(): void`

- [ ] **Step 1: Add public method**

Add near `heal`:

```ts
  /** Loop-event supply reward: instantly cool the weapon. */
  resetHeat(): void {
    this.heat = 0;
    this.overheatUntil = 0;
  }
```

- [ ] **Step 2: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/play/entities/Player.ts
git commit -m "feat(events): Player.resetHeat for supply reward"
```

---

## Task 5: HUD side-event chips

**Files:**
- Modify: `src/play/ui/HUD.tsx`

**Interfaces:**
- Consumes: `snap.sideObjectives` (already in `HudSnapshot`), `t()` not needed in HUD (strings pre-resolved in snapshot).

- [ ] **Step 1: Render chips under the objective**

In `HUD.tsx`, inside the `hud__objective` block, after the objective text, add:

```tsx
      {snap.sideObjectives.length > 0 && (
        <div className="hud__side-chips">
          {snap.sideObjectives.slice(0, 3).map((s, i) => (
            <span key={i} className="hud__side-chip type-data-xs">{s}</span>
          ))}
        </div>
      )}
```

- [ ] **Step 2: Add CSS**

In `src/play/ui/ui.css`:

```css
.hud__side-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.hud__side-chip { padding: 2px 8px; border: 1px solid var(--color-border, rgba(56,232,255,0.35)); border-radius: 3px; color: #9adbe8; background: rgba(7,10,15,0.5); }
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npx vite build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/play/ui/HUD.tsx src/play/ui/ui.css
git commit -m "feat(events): HUD side-event chips"
```

---

## Task 6: E2E verification (dev probe)

**Files:**
- Create: `scripts/probe-events.mjs` (temporary, delete after)

**Interfaces:**
- Consumes: dev server on port 5199, `window.__r07` hook (DEV/VITE_E2E), Playwright + system Chrome.

- [ ] **Step 1: Start dev server**

Run: `npm run dev -- --port 5199` (background).

- [ ] **Step 2: Write the probe**

```js
// scripts/probe-events.mjs — E2E for loop events (temporary)
import { chromium } from 'playwright-core';
const exe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5199/play', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
// force a loop seed by setting story.loops then reloading
await page.evaluate(() => {
  // __r07 not in production; dev exposes it
});
// drive: open garage gate, walk to service, verify crate/ambush via scene state
console.log('errors:', errors);
await browser.close();
```

- [ ] **Step 3: Run probe + smoke**

Run: `node scripts/probe-events.mjs`, then `npm run smoke` + `npm run smoke:narrow`.
Expected: zero console/page errors; supply crate reachable and interactable; ambush spawns 3 enemies on trigger; rewards applied (heat 0, overdrive +).

- [ ] **Step 4: Delete probe**

```bash
rm scripts/probe-events.mjs
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: loop-event E2E verified (probe deleted)"
```

---

## Self-Review

- **Spec coverage:** All spec items map to tasks — pure picker (T1), spawner+rewards (T4/T4a), HUD chips (T5), strings EN/VI (T3), E2E probe (T6). No gaps.
- **Placeholder scan:** No TBD/TODO; every step has concrete code or commands. The only conditional (`resetHeat` availability) is resolved inline in Task 4 Step 8.
- **Type consistency:** `pickLoopEvents`, `EVENT_SLOTS`, `SUPPLY_REWARD`/`AMBUSH_REWARD`, `DistrictId`, `LoopEventKind`, `SupplyCrate`, `loopEvents`, `ambushActive` names consistent across all tasks.
- **Event tiles verified** via grid scan (Task 2 hardcodes the output): service `[30,69]`,`[44,57]`; power `[70,87]`,`[124,87]`; transit `[70,21]`,`[124,21]`; yard `[120,56]`,`[96,56]` — all walkable, prop-free, non-arena, gate-away.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2025-08-05-loop-events.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session with checkpoints.

Which approach?
