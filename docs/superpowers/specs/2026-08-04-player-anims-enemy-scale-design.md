# Player 4-direction sprite-sheet animation + bigger enemies

Date: 2026-08-04

## Goal

1. Fix the "stiff" player: K-07 gets real movement + shooting animations via an
   AI-generated sprite sheet (4 facing directions, 3 states) driven by a Phaser
   animation state machine.
2. Make enemies visually bigger via runtime scaling (no new enemy art).
3. Add the sprite-sheet prompt to `ART-PROMPTS.md` so the user can generate the
   sheet with Antigravity and Pi integrates it (existing manual art workflow).

Boss is explicitly out of scope (user is happy with it).

## Verified context

- `src/play/phaser/aiArt.ts` loads single-frame PNGs from
  `public/art/sprites/<key>.png`, validates exact canvas size, and replaces the
  procedural texgen texture. It has **no sprite-sheet support**.
- `BootScene.create()` runs `generateAllTextures()` → `queueAiSprites()` →
  `load.start()`, then on `load.once('complete')` starts the world. Texture
  swaps happen per-file during load (filecomplete), before `complete`.
- Player (`src/play/entities/Player.ts`) is a single static 64×64 sprite, never
  rotated, body `setCircle(16, 16, 16)`. No `anims` anywhere in the game.
  `player-od` is a separate texgen texture (overdrive) — not currently swapped
  in code; overdrive is conveyed via `setTint(PAL.white)` + scale.
- Enemies (`src/play/entities/enemies.ts` `EnemyBase`): static sprites that
  `setRotation()` toward the player; body `setCircle(stats.radius, 20 - stats.radius,
  20 - stats.radius)` — assumes a 40px canvas, which is wrong for shield
  (44px canvas, 2px off-center) and detonator (32px canvas, 4px off-center).
- Enemy canvases: drone 40, hunter 40, shield 44, detonator 32. Radii:
  drone 13, hunter 14, shield 15, detonator 11.
- Canvas sizes are load-bearing (physics offsets are relative to the texture
  frame) — the sheet keeps 64×64 cells so player physics is untouched.
- `ART-PROMPTS.md` documents the manual pipeline: Pi writes prompts, the user
  pastes them into Antigravity, saves the PNG under `public/art/...`, Pi
  integrates + verifies. A1 (player.png 64×64, facing UP) stays as fallback.

## Approach

### 1. Art — new prompt A1s in `ART-PROMPTS.md`

Prompt: K-07 sprite sheet → `public/art/sprites/player-sheet.png` (**384×192**).

- Grid **6 columns × 3 rows**, every cell exactly **64×64**.
- Rows = facing: row 0 = DOWN, row 1 = RIGHT (side), row 2 = UP.
- Columns = state: 0–1 idle (subtle breathing), 2–3 walk (2-frame stride),
  4–5 shoot (gun recoil).
- Same K-07 design as A1 (deep navy armor, cyan visor band, slim rifle).
  Identical character in every cell — only pose changes.
- LEFT facing is NOT generated: the game mirrors the RIGHT row via `flipX`.

### 2. Pipeline — `aiArt.ts` + `BootScene`

- Add `AI_SHEETS: ReadonlyArray<AiSheetSpec>` with
  `{ key: 'player-sheet', file: 'player-sheet.png', frameWidth: 64, frameHeight: 64, cols: 6, rows: 3 }`.
- Extend the queue/swap logic to handle sheets: validate the source image is
  exactly `cols*frameWidth × rows*frameHeight` (384×192); on success
  `scene.textures.addSpriteSheet('player-sheet', canvas, { frameWidth, frameHeight })`.
  Size mismatch → skip, log warning (dev), keep procedural/static texture.
- New module `src/play/phaser/playerAnims.ts` exporting
  `createPlayerAnims(scene)`: creates 9 animations (idle/walk/shoot ×
  down/side/up) **only if** `textures.exists('player-sheet')`; each
  `anims.create` guarded by `anims.exists()` to stay idempotent. Timing:
  idle 450ms/frame, walk 140ms/frame, shoot 90ms/frame (looped).
- `BootScene`: call `createPlayerAnims(this)` in the load-complete handler
  before `scene.start('world')`.
- Fallback: no sheet file → no anims → `Player` behaves exactly as today
  (static sprite, existing aiArt single-frame swap still applies).

### 3. Player animation state machine — `Player.ts`

- In constructor: `this.sheetActive = scene.textures.exists('player-sheet')`.
- In `update()` (only when `sheetActive`):
  - **Facing** (4 dirs): dominant axis of `aimAngle` while firing, otherwise of
    the movement vector when moving, otherwise keep last facing. side = right;
    left via `setFlipX(true)` on the side row.
  - **State**: firing while standing → `shoot`; moving (or dashing) → `walk`;
    else `idle`. Firing while moving → `walk` (muzzle flash conveys firing).
  - Play the matching `p-<state>-<row>` animation only when (state, facing)
    changes; `setFlipX(false)` when facing right or up/down.
- Dash afterimages: create trail images with the same texture and
  `setFrame(this.frame.name)` so the trail copies the current pose.
- Overdrive: unchanged (white tint + scale). `player-od` texgen texture left
  untouched (fallback path stays valid).
- Physics/body unchanged: cells are 64×64, body stays `setCircle(16, 16, 16)`.

### 4. Enemy runtime scale — `enemies.ts`

- `ENEMY_SCALE: Record<EnemyKind, number>`: drone 1.5, hunter 1.5, shield 1.4,
  detonator 1.6 (visual sizes ≈ 60/60/62/51 px).
- In `EnemyBase` constructor: `this.setScale(s)` and
  `this.setCircle(stats.radius * s, half * s - stats.radius * s, half * s - stats.radius * s)`
  where `half = this.frame.width / 2` — proportional hitbox **and** fixes the
  pre-existing off-center quirk (shield/detonator canvases ≠ 40px).
- No changes to speed/damage/separation/telegraph — position-based, unaffected.

## Out of scope

- Boss, enemies animations (rotor spin, hover), 4-direction art for enemies,
  player-od texture rework, new enemy art at bigger canvases (deferred: runtime
  scale chosen), UI screens.

## Risks & mitigations

- **Image-gen grid misalignment** (cells not exactly 64×64 or character drift):
  exact 384×192 size check gates integration; visual QA in-game; worst case the
  user regenerates the sheet. FlipX of the side row may expose asymmetric
  lighting — acceptable for the neon style; regenerate the side row if egregious.
- **Anims missing at runtime** (sheet removed later): all animation calls are
  gated on `sheetActive`; no crash paths.
- **Hitbox feels bigger**: radii scale proportionally to visuals; `setCircle`
  accepts floats; round to 1 decimal if needed.

## Verification

1. `npm run typecheck` and `npm run build`.
2. `npm run dev -- --port 5199`, then `npm run smoke` + `npm run smoke:narrow`:
   zero console/page errors.
3. Visual QA (playtest): player shows idle/walk/shoot across all 4 facings,
   flipX correct for left, dash trail copies current frame, enemies are clearly
   bigger with matching hitboxes, boss unchanged.
4. Fallback check: with `player-sheet.png` temporarily removed, game runs with
   the static player (no errors).
5. Unit tests (`npm test`, 49) unaffected — pure logic only.
6. Update `TRACKING.md` (one line) when landed.
