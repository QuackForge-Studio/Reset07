# Player 4-Dir Sprite-Sheet Animation + Enemy Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give K-07 a real 4-direction idle/walk/shoot animation state machine driven by an AI-generated sprite sheet (with a procedural placeholder until the user's art lands), and scale enemies up 1.4–1.6× with proportional hitboxes.

**Architecture:** Pure animation/body math lives in `src/play/systems/animLogic.ts` (unit-tested, no Phaser import). The sheet is registered as a Phaser sprite-sheet texture — from the user's AI art (`public/art/sprites/player-sheet.png`, 384×192) when present, else a procedural 12-cell fallback generated at boot. `BootScene` creates 9 looping animations; `Player.update()` picks the (state, facing-row) via the pure picker and `flipX` for left. Enemies read `scale` from `ENEMY_STATS` and compute circle bodies from the actual frame width.

**Tech Stack:** TypeScript, Phaser 3.60+ (`anims`, `addSpriteSheet`, `Graphics.translateCanvas`), Vitest (node env, `tests/*.test.ts`), Vite.

## Global Constraints

- **Canvas sizes are load-bearing.** Sheet cells must stay exactly 64×64 (player physics `setCircle(16,16,16)` depends on it). Enemy canvas sizes (drone 40, hunter 40, shield 44, detonator 32) and `texgen.ts` sizes must NOT change.
- **AI sheet validation**: only apply when the source PNG is exactly 384×192; otherwise skip + warn (existing aiArt pattern).
- **Always-animated fallback**: the game must play animations even before the user's `player-sheet.png` exists — BootScene generates a procedural placeholder sheet.
- **Brand palette only**: placeholder art uses `PAL` tokens from `src/play/palette.ts`; no raw hex.
- **Boss untouched**; enemy speed/damage/separation/telegraph unchanged.
- **Movement tuning untouched**: `accel` 1700 stays above `friction` 1150.
- **`window.__r07` is dev/e2e-only** — smoke assertions in Task 8 only run against those builds (existing `game-smoke.mjs` already does).
- Unit tests run under plain Node (`vitest`, `environment: 'node'`) — pure modules must not import Phaser.

---

### Task 1: Add `scale` to enemy stats (data)

**Files:**
- Modify: `src/play/data/enemies.ts` (`EnemyStats` interface + `ENEMY_STATS` values)

**Interfaces:**
- Produces: `EnemyStats.scale: number` — visual/hitbox scale multiplier per kind (drone 1.5, hunter 1.5, shield 1.4, detonator 1.6). Consumed by `enemyBodyParams()` in Task 2.

- [ ] **Step 1: Add the field to the interface**

```ts
export interface EnemyStats {
  hp: number;
  speed: number;
  radius: number;
  scale: number; // NEW: sprite + hitbox scale multiplier (visual size bump)
  touchDamage: number;
  overdriveMultiplier: number; // damage taken during overdrive mark
  weight: number; // separation mass
}
```

- [ ] **Step 2: Add values to every entry**

In `ENEMY_STATS`, insert `scale` after `radius`:

```ts
drone:      { hp: 26, speed: 138, radius: 13, scale: 1.5, touchDamage: 8,  overdriveMultiplier: 1.5, weight: 1 },
hunter:     { hp: 44, speed: 262, radius: 14, scale: 1.5, touchDamage: 20, overdriveMultiplier: 1.5, weight: 1.2 },
shield:     { hp: 78, speed: 64,  radius: 15, scale: 1.4, touchDamage: 12, overdriveMultiplier: 1.5, weight: 2 },
detonator:  { hp: 14, speed: 208, radius: 11, scale: 1.6, touchDamage: 10, overdriveMultiplier: 1.5, weight: 0.8 },
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` — expect no errors (other consumers of `EnemyStats` are compile-checked; nothing constructs the type literally outside this file).

```bash
git add src/play/data/enemies.ts
git commit -m "feat(play): per-kind enemy visual scale stat"
```

---

### Task 2: Pure animation/body logic + unit tests (TDD)

**Files:**
- Create: `src/play/systems/animLogic.ts`
- Create: `tests/animLogic.test.ts`

**Interfaces:**
- Consumes: `EnemyStats.scale`/`radius` from `../data/enemies` (Task 1); `EnemyKind` type.
- Produces:
  - `type FacingRow = 'down' | 'side' | 'up'`
  - `type PlayerAnimState = 'idle' | 'walk' | 'shoot'`
  - `interface PlayerAnimChoice { state: PlayerAnimState; row: FacingRow; flipX: boolean }`
  - `pickPlayerAnim(opts: { firing: boolean; moving: boolean; aimAngle: number; moveX: number; moveY: number; last: PlayerAnimChoice }): PlayerAnimChoice`
  - `interface EnemyBodyParams { scale: number; radius: number; offsetX: number; offsetY: number }`
  - `enemyBodyParams(kind: EnemyKind, frameWidth: number): EnemyBodyParams`

Semantics (lock these in — Player.ts depends on them):
- State priority: `firing && !moving` → `shoot`; `moving` → `walk`; else `idle`.
- Facing: firing → from `aimAngle`; else moving → from `(moveX, moveY)`; else keep `last.row`/`last.flipX`.
- Row: horizontal-dominant → `side` with `flipX = axis < 0`; vertical → `up` if negative y else `down` (no flip).
- Enemy body: `scale = ENEMY_STATS[kind].scale`, `radius = stats.radius * scale`, `offset = (frameWidth / 2) * scale - radius` (both axes — centers the circle in the scaled frame, fixing the existing 44px/32px off-center quirk).

- [ ] **Step 1: Write the failing tests**

`tests/animLogic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickPlayerAnim, enemyBodyParams } from '../src/play/systems/animLogic';

const IDLE_UP = { state: 'idle', row: 'up', flipX: false } as const;

describe('pickPlayerAnim', () => {
  it('stands idle when not firing and not moving, keeping last facing', () => {
    expect(pickPlayerAnim({ firing: false, moving: false, aimAngle: 0, moveX: 0, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'idle', row: 'up', flipX: false });
  });

  it('shoots right when firing while standing (aim 0 rad)', () => {
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: 0, moveX: 0, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'shoot', row: 'side', flipX: false });
  });

  it('shoots left with flipX (aim PI)', () => {
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: Math.PI, moveX: 0, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'shoot', row: 'side', flipX: true });
  });

  it('shoots up (aim -PI/2) and down (aim PI/2)', () => {
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: -Math.PI / 2, moveX: 0, moveY: 0, last: IDLE_UP }).row).toBe('up');
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: Math.PI / 2, moveX: 0, moveY: 0, last: IDLE_UP }).row).toBe('down');
  });

  it('walks toward movement when not firing', () => {
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 1, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'walk', row: 'side', flipX: false });
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: -1, moveY: 0, last: IDLE_UP }).flipX).toBe(true);
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 0, moveY: -1, last: IDLE_UP }).row).toBe('up');
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 0, moveY: 1, last: IDLE_UP }).row).toBe('down');
  });

  it('favors horizontal axis when diagonal (down-right)', () => {
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 1, moveY: 1, last: IDLE_UP }))
      .toEqual({ state: 'walk', row: 'side', flipX: false });
  });

  it('walks (not shoots) while firing AND moving', () => {
    expect(pickPlayerAnim({ firing: true, moving: true, aimAngle: 0, moveX: 1, moveY: 0, last: IDLE_UP }).state).toBe('walk');
  });
});

describe('enemyBodyParams', () => {
  it('drone 40px canvas: scale 1.5, radius 19.5, centered offset 10.5', () => {
    expect(enemyBodyParams('drone', 40)).toEqual({ scale: 1.5, radius: 19.5, offsetX: 10.5, offsetY: 10.5 });
  });
  it('hunter 40px canvas: scale 1.5, radius 21, offset 9', () => {
    expect(enemyBodyParams('hunter', 40)).toEqual({ scale: 1.5, radius: 21, offsetX: 9, offsetY: 9 });
  });
  it('shield 44px canvas: scale 1.4, radius 21, offset 9.8 (centered in 44px frame)', () => {
    expect(enemyBodyParams('shield', 44)).toEqual({ scale: 1.4, radius: 21, offsetX: 9.8, offsetY: 9.8 });
  });
  it('detonator 32px canvas: scale 1.6, radius 17.6, offset 8 (centered in 32px frame)', () => {
    expect(enemyBodyParams('detonator', 32)).toEqual({ scale: 1.6, radius: 17.6, offsetX: 8, offsetY: 8 });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/animLogic.test.ts`
Expected: FAIL — `Cannot find module '../src/play/systems/animLogic'`

- [ ] **Step 3: Write the implementation**

`src/play/systems/animLogic.ts`:

```ts
/**
 * RESET//07 — pure animation/body geometry logic for the player sprite
 * sheet and scaled enemy hitboxes. No Phaser imports (runs under node
 * unit tests). Sheet layout: 6 cols × 3 rows of 64px cells —
 * cols 0-1 idle, 2-3 walk, 4-5 shoot; rows 0 down, 1 side (right), 2 up.
 */

import { ENEMY_STATS, type EnemyKind } from '../data/enemies';

export type FacingRow = 'down' | 'side' | 'up';
export type PlayerAnimState = 'idle' | 'walk' | 'shoot';

export interface PlayerAnimChoice {
  state: PlayerAnimState;
  row: FacingRow;
  flipX: boolean;
}

export interface PickPlayerAnimOpts {
  firing: boolean;
  moving: boolean;
  aimAngle: number;
  moveX: number;
  moveY: number;
  last: PlayerAnimChoice;
}

export function pickPlayerAnim(opts: PickPlayerAnimOpts): PlayerAnimChoice {
  const { firing, moving, aimAngle, moveX, moveY, last } = opts;

  // state priority: standing-and-firing → shoot; moving → walk; else idle
  let state: PlayerAnimState;
  if (firing && !moving) state = 'shoot';
  else if (moving) state = 'walk';
  else state = 'idle';

  // facing: aim while firing, movement while moving, otherwise keep last
  const ang = firing ? aimAngle : moving ? Math.atan2(moveY, moveX) : null;
  if (ang === null) {
    return { state, row: last.row, flipX: last.flipX };
  }
  const ax = Math.cos(ang);
  const ay = Math.sin(ang);
  // >= : horizontal wins ties (pure diagonals face side, matching the tests)
  if (Math.abs(ax) >= Math.abs(ay)) {
    return { state, row: 'side', flipX: ax < 0 };
  }
  return { state, row: ay < 0 ? 'up' : 'down', flipX: false };
}

export interface EnemyBodyParams {
  scale: number;
  radius: number;
  offsetX: number;
  offsetY: number;
}

export function enemyBodyParams(kind: EnemyKind, frameWidth: number): EnemyBodyParams {
  const stats = ENEMY_STATS[kind];
  const scale = stats.scale;
  const radius = stats.radius * scale;
  const offset = (frameWidth / 2) * scale - radius;
  return { scale, radius, offsetX: offset, offsetY: offset };
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npx vitest run tests/animLogic.test.ts`
Expected: 12 tests PASS. Then run `npm test` — all 49 existing + 12 new green (61 total).

- [ ] **Step 5: Commit**

```bash
git add src/play/systems/animLogic.ts tests/animLogic.test.ts
git commit -m "feat(play): pure player-anim picker + scaled enemy body params (12 tests)"
```

---

### Task 3: Procedural placeholder player sheet (texgen)

**Files:**
- Modify: `src/play/phaser/texgen.ts` (player texture block ~line 201; add helpers near it)

**Interfaces:**
- Consumes: `PAL` (already imported in texgen).
- Produces: `paintPlayer(g: G, pose?: number): void` (pose 0-5: 0 idle A, 1 idle B, 2 walk A, 3 walk B, 4 shoot A, 5 shoot B) and `generatePlayerSheetFallback(scene: Phaser.Scene): boolean` — registers `player-sheet` (384×192, 64px cells) if absent, returns true when it created it. Consumed by BootScene (Task 4).

- [ ] **Step 1: Extract the player drawing into `paintPlayer` with poses**

The current `mk(s, 'player', 64, 64, (g) => { ... })` closure body becomes a module-level function. Keep every existing drawing command exactly as-is, wrapped in a pose transform. The rifle tip/muzzle is at ~(39.5–43, 3.5–5); the body spans ~(13–47, 5–48).

```ts
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
  // ── existing player drawing commands, unchanged ──
  // backpack, torso armor, chest core, side arms, shoulder pads,
  // rifle + stock + hand, helmet + visor (copy verbatim from the
  // current `mk(s, 'player', ...)` closure body)
  // ── muzzle flash on shoot poses ──
  if (pose === 4 || pose === 5) {
    g.fillStyle(PAL.white, 0.95);
    g.fillCircle(41.5, 3, pose === 4 ? 3 : 2);
    g.fillStyle(PAL.cyan, 0.9);
    g.fillCircle(41.5, 3, pose === 4 ? 1.6 : 1.1);
  }
  g.restore();
}
```

Then the `mk(s, 'player', 64, 64, ...)` call becomes:

```ts
mk(s, 'player', 64, 64, (g) => {
  paintPlayer(g);
});
```

- [ ] **Step 2: Add the sheet fallback generator**

Add below the `paintPlayer` function (still in `texgen.ts`):

```ts
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
  // re-register as a sprite sheet so frames are 64×64 cells
  const src = scene.textures.get('player-sheet').getSourceImage() as HTMLCanvasElement;
  scene.textures.remove('player-sheet');
  scene.textures.addSpriteSheet('player-sheet', src, { frameWidth: 64, frameHeight: 64 });
  if (import.meta.env.DEV) console.log('[boot] procedural player sheet fallback generated');
  return true;
}
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` — expect no errors.

```bash
git add src/play/phaser/texgen.ts
git commit -m "feat(play): procedural player sprite-sheet fallback (12 poses)"
```

---

### Task 4: Sheet pipeline (aiArt + playerAnims + BootScene)

**Files:**
- Modify: `src/play/phaser/aiArt.ts`
- Create: `src/play/phaser/playerAnims.ts`
- Modify: `src/play/phaser/BootScene.ts`

**Interfaces:**
- Consumes: `generatePlayerSheetFallback` (Task 3).
- Produces: `createPlayerAnims(scene: Phaser.Scene): void` — registers 9 looping anims `p-idle-down|side|up`, `p-walk-*`, `p-shoot-*` on texture `player-sheet` (idempotent, no-op without the texture). Consumed by Player (Task 5).

- [ ] **Step 1: Extend aiArt.ts with sheet support**

Add next to `AiSpriteSpec`:

```ts
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
```

In `queueAiSprites`, change the mapping so sheets are queued the same way (`load.image(tmp, 'art/sprites/<file>')`) and the `filecomplete` handler branches on whether the spec is a sheet:

```ts
const specs: Array<{ tmp: string; sprite?: AiSpriteSpec; sheet?: AiSheetSpec }> = [
  ...AI_SPRITES.map((s) => ({ tmp: `aix_${s.key}`, sprite: s })),
  ...AI_SHEETS.map((s) => ({ tmp: `aix_${s.key}`, sheet: s })),
];
```

In the handler, after the existing sprite branch, add:

```ts
if (hit?.sheet) {
  const { sheet } = hit;
  const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const ok = img && img.width === sheet.cols * sheet.frameWidth && img.height === sheet.rows * sheet.frameHeight;
  if (!ok) {
    if (import.meta.env.DEV) console.warn(`[ai-art] skip ${sheet.key}: size mismatch`);
    scene.textures.remove(key);
    return;
  }
  scene.textures.remove(key);
  scene.textures.remove(sheet.key);
  scene.textures.addSpriteSheet(sheet.key, img, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
  if (import.meta.env.DEV) console.log(`[ai-art] applied ${sheet.key} (${img.width}x${img.height}, ${sheet.cols}x${sheet.rows})`);
  return;
}
```

(Keep the existing sprite logic untouched — adjust the shared `files.find` to match the new `specs` shape.)

- [ ] **Step 2: Create `src/play/phaser/playerAnims.ts`**

```ts
/**
 * RESET//07 — K-07 player animation registration.
 *
 * Sheet layout: 6 cols × 3 rows of 64px cells. Rows: 0 down, 1 side
 * (right; left is flipX), 2 up. Cols: 0-1 idle, 2-3 walk, 4-5 shoot.
 * 9 looping animations, idempotent, safe to call every boot.
 */
import Phaser from 'phaser';

const ROWS: ReadonlyArray<readonly [name: string, index: number]> = [
  ['down', 0],
  ['side', 1],
  ['up', 2],
];
const STATES: ReadonlyArray<readonly [name: string, col: number, delayMs: number]> = [
  ['idle', 0, 450],
  ['walk', 2, 140],
  ['shoot', 4, 90],
];

export function createPlayerAnims(scene: Phaser.Scene): void {
  if (!scene.textures.exists('player-sheet')) return;
  for (const [rowName, row] of ROWS) {
    for (const [state, col, delay] of STATES) {
      const key = `p-${state}-${rowName}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers('player-sheet', {
          start: row * 6 + col,
          end: row * 6 + col + 1,
        }),
        frameRate: 1000 / delay,
        repeat: -1,
      });
    }
  }
}
```

- [ ] **Step 3: Wire BootScene**

`src/play/phaser/BootScene.ts` — inside the existing `this.load.once('complete', ...)` handler, before `this.scene.start('world')`:

```ts
// guarantee the player sheet + animations exist (AI art wins when provided)
if (!this.textures.exists('player-sheet')) {
  generatePlayerSheetFallback(this);
}
createPlayerAnims(this);
```

Import both: `import { generatePlayerSheetFallback } from './texgen';` and `import { createPlayerAnims } from './playerAnims';`

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit` and `npm test` (still 61 green).

```bash
git add src/play/phaser/aiArt.ts src/play/phaser/playerAnims.ts src/play/phaser/BootScene.ts
git commit -m "feat(play): AI sprite-sheet swap pipeline + player animation registration"
```

---

### Task 5: Player animation state machine

**Files:**
- Modify: `src/play/entities/Player.ts`

**Interfaces:**
- Consumes: `pickPlayerAnim`, `PlayerAnimChoice` (Task 2); anims `p-<state>-<row>` (Task 4).

- [ ] **Step 1: Use the sheet texture + add state**

In the constructor, the `super(...)` call currently passes `'player'` as texture. Change to:

```ts
const tex = scene.textures.exists('player-sheet') ? 'player-sheet' : 'player';
super(scene, x, y, tex, 100, { onDie: () => ev.onDeath?.() });
```

Add imports at the top:

```ts
import { pickPlayerAnim, type PlayerAnimChoice } from '../systems/animLogic';
```

Add a field next to the other privates:

```ts
private animChoice: PlayerAnimChoice = { state: 'idle', row: 'up', flipX: false };
```

- [ ] **Step 2: Add the state machine to `update()`**

In `update()`, the `wantFire` const already exists in the weapon section. In the final `// visuals` section (after `applyFlashAndKnock(dt)`), add:

```ts
// ── animation: facing from aim while firing, movement while running ──
const choice = pickPlayerAnim({
  firing: wantFire && !this.overheat,
  moving: this.moving || this.isDashing,
  aimAngle: this.aimAngle,
  moveX: mx,
  moveY: my,
  last: this.animChoice,
});
this.setFlipX(choice.flipX);
if (choice.row !== this.animChoice.row || choice.state !== this.animChoice.state) {
  this.play(`p-${choice.state}-${choice.row}`);
}
this.animChoice = choice;
```

(`mx`/`my` are the normalized input vectors already in scope. `play()` is called only on row/state change so the loop keeps running otherwise; `setFlipX` every frame so left↔right flips instantly.)

- [ ] **Step 3: Dash trail copies the current frame**

In the dash afterimage creation, replace:

```ts
const img = this.scene.add.image(this.x, this.y, 'player');
```

with:

```ts
const img = this.scene.add.image(this.x, this.y, this.texture.key);
img.setFrame(this.frame.name);
```

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit`.

```bash
git add src/play/entities/Player.ts
git commit -m "feat(play): player 4-dir idle/walk/shoot animation state machine"
```

---

### Task 6: Enemy runtime scale + centered hitboxes

**Files:**
- Modify: `src/play/entities/enemies.ts` (constructor of `EnemyBase`)

**Interfaces:**
- Consumes: `enemyBodyParams` (Task 2).

- [ ] **Step 1: Apply scale + proportional body**

Add the import:

```ts
import { enemyBodyParams } from '../systems/animLogic';
```

In `EnemyBase` constructor, replace:

```ts
this.setCircle(stats.radius, 20 - stats.radius, 20 - stats.radius);
```

with:

```ts
const bp = enemyBodyParams(kind, this.frame.width);
this.setScale(bp.scale);
this.setCircle(bp.radius, bp.offsetX, bp.offsetY);
```

(`this.frame.width` is the texture frame size — 40/40/44/32 — so the circle stays centered in the scaled visual; this also fixes the pre-existing off-center hitbox for shield and detonator canvases.)

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit`.

```bash
git add src/play/entities/enemies.ts
git commit -m "feat(play): enemies scaled 1.4-1.6x with proportional centered hitboxes"
```

---

### Task 7: ART-PROMPTS.md — player sprite-sheet prompt

**Files:**
- Modify: `ART-PROMPTS.md` (add section `A1s` right after section A1)

- [ ] **Step 1: Add the A1s prompt**

Insert after the A1 block (before `### A2.`):

```markdown
### A1s. Player K-07 sprite sheet (ANIMATION) → `public/art/sprites/player-sheet.png` (384×192)
Sprite sheet for a top-down 2D game character. EXACTLY 384x192 pixels, a
strict grid of 6 columns x 3 rows, every cell exactly 64x64 pixels, no
gaps between cells. The SAME character in all 18 cells: top-down soldier
K-07 — deep navy armor #101826, cyan #38E8FF glowing visor band across
the helmet, cyan ring on shoulder pads, small cyan chest core light, slim
rifle with cyan glowing muzzle tip, backpack behind shoulders. Flat vector
style, strict 6-color palette only: #070A0F, #101826, #38E8FF, #FF6A1A,
#FF3D9A, #F4F8FF. Transparent background, no text, no watermark, no drop
shadow. Only the pose changes between cells:

- ROW 0 (top) = character facing DOWN (visor toward the viewer's bottom).
- ROW 1 (middle) = character facing RIGHT (profile view, rifle in hand).
- ROW 2 (bottom) = character facing UP (backpack visible, back view).

Within every row, the 6 columns are:
- COL 0-1 = idle: standing, subtle breathing bob.
- COL 2-3 = walk cycle: two-step stride, body bobbing up and down.
- COL 4-5 = shooting: rifle recoils back, muzzle flash on the rifle tip,
  body leaning back slightly.

Keep the character fully inside its 64x64 cell with a small margin; never
touch cell borders. All cells must show the exact same armor design.
```

Also append a note at the end of the A1 bullet (or a one-line note under the A1s title): `*A1s thay thế A1 khi có sheet; chưa có sheet thì game tự dùng sheet placeholder procedural.*`

- [ ] **Step 2: Commit**

```bash
git add ART-PROMPTS.md
git commit -m "docs: A1s player sprite-sheet prompt (4-dir idle/walk/shoot)"
```

---

### Task 8: Smoke assertions for animation + enemy scale

**Files:**
- Modify: `scripts/game-smoke.mjs`

- [ ] **Step 1: Add player-anim checks after the existing movement check**

In `scripts/game-smoke.mjs`, right after the existing block that ends with `check(movementEnd - movementStart > 35, 'player moves from rest', ...)` (around line 161), insert:

```js
// Player animation state machine (sheet always exists via procedural fallback)
await page.keyboard.down('d');
await page.waitForTimeout(300);
const animKey = await page.evaluate(() => window.__r07.scene.player.anims?.currentAnim?.key ?? '');
check(animKey.startsWith('p-walk-side'), 'player plays walk anim while moving', animKey);
await page.keyboard.up('d');
await page.keyboard.down('a');
await page.waitForTimeout(300);
const flipX = await page.evaluate(() => window.__r07.scene.player.flipX === true);
await page.keyboard.up('a');
check(flipX, 'player mirrors (flipX) when facing left', String(flipX));
```

- [ ] **Step 2: Add enemy-scale check after the enemyList wait**

Right after the existing `waitForFunction(() => window.__r07.scene.enemyList.length > 0, ...)` (around line 163), insert:

```js
const enemyScales = await page.evaluate(() =>
  window.__r07.scene.enemyList.map((e) => Number(e.scaleX.toFixed(2)))
);
check(enemyScales.length > 0 && enemyScales.every((s) => s >= 1.4), 'enemies are scaled up', enemyScales.join(','));
```

- [ ] **Step 3: Run the smoke suite**

Run: `npm run test:smoke` (builds e2e + runs the full Playwright smoke).
Expected: all checks pass, including the three new ones.

- [ ] **Step 4: Commit**

```bash
git add scripts/game-smoke.mjs
git commit -m "test(play): smoke asserts player walk anim, flipX facing, enemy scale"
```

---

### Task 9: Full verification + tracking

**Files:**
- Modify: `TRACKING.md` (top of "In progress" — newest line on top)

- [ ] **Step 1: Full verification**

Run, in order, expecting all green:
1. `npm run typecheck`
2. `npm test` — 61 tests
3. `npm run build`
4. `npm run dev -- --port 5199` in a background terminal, then `npm run smoke` and `npm run smoke:narrow` — zero console/page errors.

- [ ] **Step 2: Manual visual QA (player + enemies)**

In the dev browser at `localhost:5199/play` (click the canvas once for keyboard focus):
- Stand still → idle bob animates; press W/A/S/D → walk cycle plays; hold mouse to aim + fire while standing → shoot/recoil loop plays; fire while running → walk + muzzle flash.
- Facing follows aim while firing and movement while running; pressing A flips the sprite (flipX).
- Dash (Shift) → trail copies the current frame, not frame 0.
- Enemies are visibly ~50% bigger; bullets/hits feel consistent with their new size; boss unchanged.
- Console: no errors/warnings; dev log shows `[boot] procedural player sheet fallback generated` (until the real sheet lands).

- [ ] **Step 3: Update TRACKING.md**

Add one line at the very top of "In progress":

```markdown
- [x] Player animation: 4-dir sprite sheet (procedural fallback + AI sheet swap) idle/walk/shoot state machine; enemies scaled 1.4-1.6x with proportional centered hitboxes. A1s prompt in ART-PROMPTS.md ready for user generation.
```

- [ ] **Step 4: Final commit**

```bash
git add TRACKING.md
git commit -m "docs: log player anims + enemy scale batch"
```

---

## Self-review notes

- **Spec coverage:** §1 art → Task 7; §2 pipeline → Tasks 3+4; §3 player → Task 5; §4 enemies → Tasks 1+2+6; verification → Tasks 8+9. Fallback behavior from the spec ("no sheet → no anims") is upgraded to "no sheet → procedural placeholder sheet" — strictly additive, and it is what makes Task 8's animation assertions possible before the user's art exists.
- **Type consistency:** `pickPlayerAnim`/`enemyBodyParams` signatures are defined once in Task 2 and used verbatim in Tasks 5/6. Anim keys `p-<state>-<row>` are created in Task 4 and played in Task 5. `generatePlayerSheetFallback` created in Task 3, consumed in Task 4.
- **Gotcha check:** no texgen canvas sizes change (player cells stay 64×64, enemy canvases untouched); `accel > friction` untouched; `player-od`/boss untouched; `setCircle` floats are fine in Phaser (no rounding needed).
