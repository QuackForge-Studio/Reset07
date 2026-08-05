# Loop Events — In-loop side events for gameplay variety

Date: 2025-08-05
Status: Design approved (Approach 1 — rotating side events), pending spec review

## Problem

Player reports the game loop feels monotonous: every 7-minute loop is the
same route (garage → rescue → relay → core → boss) with the same enemies and
no in-loop decisions beyond combat. Chosen direction (user, 2025-08-05):
**objective/event variety**, MVP scale, mobile/touch-safe.

## Approach

Add a **Loop Events** system: a small pool of side events; each loop is
seeded so 1–2 events spawn at deterministic positions in reachable
districts. Events are *additive* — the main objective chain, endings, and
story flags are untouched. Rewards are functional (heat reset, overdrive
charge) so detouring is a real decision.

## Design

### 1. Pure logic — `src/play/data/events.ts` (unit-testable, no Phaser)

```ts
export type LoopEventKind = 'supply' | 'ambush';

export interface LoopEventDef {
  kind: LoopEventKind;
  /** deterministic pseudo-random offset into the district's event slot list */
  slot: number;
}

/** Seeded PRNG (mulberry32) so a loop seed reproduces the same events. */
export function seededRng(seed: number): () => number;

/**
 * Pick events for a loop. Deterministic given (seed, reachableDistricts).
 * Rules:
 * - 1–2 events per loop (never 0 after loop 1; never 3+)
 * - garage excluded (the player starts there every loop)
 * - at most one event per district
 * - only districts in `reachableDistricts` may host events
 * - the same district/kind combination is not forced twice in a row
 *   (a `lastEvent` hint avoids immediate repetition)
 */
export function pickLoopEvents(
  seed: number,
  reachableDistricts: string[],
  opts?: { lastEvent?: { district: string; kind: LoopEventKind } },
): Array<{ district: string; kind: LoopEventKind }>;

/** Pure reward math — apply to a numeric state, return the new state. */
export function applySupplyReward(state: { heat: number; overdrive: number }): { heat: number; overdrive: number };
export function applyAmbushReward(state: { overdrive: number }): { overdrive: number };
```

Rules encoded as constants:
- `MAX_EVENTS = 2`, `SUPPLY_REWARD = { heat: 0, overdrive: +0.4 }`,
  `AMBUSH_REWARD = { overdrive: +0.3 }`
- Supply heat reward is `0` (full reset) — the value a caller must pass to
  the player.

### 2. Spawner — `WorldScene.create()`

- `seed = save.story.loops` (loop 1 = seed 1, etc.) — every loop differs;
  a re-run of the same loop number reproduces the same layout (debuggable).
- `reachableDistricts` derived from existing flags/routes the scene already
  computes for side objectives (same gating as `isSideActive`).
- Deterministic tile pick per (district, slot) using `seededRng` — pick from
  a small per-district list of event tiles (hardcoded, hand-checked for
  walkability/clear space), not raw random world positions.

### 3. Events

**Supply drop** (`supply`):
- Prop: a crate sprite (`fx-*`-style procedural texture via texgen if
  needed, or reuse an existing prop texture — plan decides; no new canvas
  sizes) + cyan beacon glow + `Telegraph.showCircle` radius pulse.
- Registered as an `Interactable` (hold 1.2 s, label "OPEN SUPPLY CRATE") —
  reuses the existing interact/hold pipeline (mobile-safe).
- Reward on open: `player.resetHeat()` (or equivalent existing API) +
  `player.addOverdriveCharge(0.4)` + toast (existing toast bus).
- One-shot per loop.

**Ambush** (`ambush`):
- A trigger line at a seeded street tile (use the scene's existing
  tile-based trigger pattern used by the opening script).
- Crossing → `Telegraph` warning ~0.8 s → spawn 2 drones + 1 detonator via
  the scene's existing enemy spawn helpers (respect quality/reduced-motion).
- When all three are dead → `player.addOverdriveCharge(0.3)` + toast
  "AMBUSH CLEARED".
- If the loop resets before completion, the ambush simply disappears with
  the scene (no persistence).

### 4. HUD

- Events appear as optional side-objective chips via the existing
  `updateSnapshot({ sideObjectives })` mechanism (label: "SUPPLY SIGNAL" /
  "AMBUSH WARNING"), with world coordinates for the off-screen arrow.
- No new HUD components.

### 5. Constraints

- No new dependencies; procedural textures only (texgen); no new canvas
  sizes (physics offsets are load-bearing).
- Mobile/touch: both events use existing input patterns (hold-interact,
  auto-aim); no new controls.
- Reduced motion: telegraphs already reduced-motion aware; no new motion.
- Main chain, endings, LoopTimer, SaveSystem, chain explosions, boss fight:
  untouched.
- All colors from tokens; strings via existing i18n strings files (EN + VI).

## Verification

1. **Unit tests** (`src/play/data/events.test.ts`): seeded PRNG determinism;
   pickLoopEvents — deterministic for a seed, 1–2 events, garage excluded,
   ≤1 per district, only reachable districts, no immediate repetition
   (with `lastEvent`), 0 events when no districts reachable; reward math.
2. `npm run typecheck` + `npm test` (60 existing + new) + `npm run build`.
3. **E2E probe** (Playwright, `__r07` hook): force a seed → verify the
   supply crate exists → hold-interact → heat = 0 + overdrive +0.4; force
   ambush trigger → telegraph → 3 enemies spawn → kill them → reward;
   zero console errors; `npm run smoke` + `npm run smoke:narrow` green.
4. Visual: screenshot of crate beacon and ambush telegraph at 1440 px and
   390 px.

## Out of scope

- New enemy types, route variants of the main chain, per-loop difficulty
  scaling, new weapons/modules.
- Story flags, endings, dialogue changes.
