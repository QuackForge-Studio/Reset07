# AGENTS.md — RESET//07 Brand Kit

Project memory for coding agents. Loaded automatically at the start of every session. Keep this file terse — see Maintenance protocol at the bottom.

## Project

- Digital brand system + internal guidelines site for **RESET//07**, a top-down neon sci-fi action game in a city trapped in a repeating 7-minute loop.
- Stack: React 18 + TypeScript + Vite (`base: './'`, target es2019). **No runtime UI dependencies** — all motion is pure CSS; fonts bundled via @fontsource (Chakra Petch, Be Vietnam Pro, IBM Plex Mono).
- Routes: `/` brand guidelines (internal), `/title` title screen demo, `/loading` loading screen demo.
- **Game**: `/play` — RESET//07 the game (Phaser 3 + React shell). Stack: TypeScript + Vite. Game code lives in `src/play/` (pure logic in `systems/`+`data/`, Phaser in `scenes/`+`entities/`+`world/`, UI in `ui/`).
- **Progress log**: `TRACKING.md` at repo root — the durable task log. Update it (one line per item, newest on top) whenever a chunk of work lands or is in progress. Keep AGENTS.md itself terse; point here instead.

## Subagents (project-scoped, `.pi/agents/`)

- `r07-bugfixer` (alias `bugfixer`) — Phaser gameplay bugs; ships with the durable gotchas below.
- `r07-art-reviewer` (alias `artfix`) — texgen/palette/depth/VFX; never changes texture canvas sizes.
- `r07-city-architect` (alias `cityfix`) — cityData/CityBuilder/pathfinding/layout questions.
- `r07-qa-verifier` (alias `qa`) — read-only; runs typecheck/lint/vitest/smoke/build and reports evidence.

## Commands

| Command                      | Purpose                                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev`                | Vite dev server                                                                                          |
| `npm test`                   | Run vitest unit tests (49 green: city/combat/endings/loopTimer/modules/objectives/save)                  |
| `npx tsc --noEmit`           | Same as `npm run typecheck`                                                                              |
| `npm run dev -- --port 5199` | Dev server on the port the smoke scripts expect                                                          |
| `npm run typecheck`          | `tsc --noEmit`                                                                                           |
| `npm run build`              | typecheck + `vite build`                                                                                 |
| `npm run preview`            | Preview the production build                                                                             |
| `npm run test:unit`          | Alias for the 49 Vitest logic tests                                                                      |
| `npm run test:smoke`         | Isolated E2E production-mode game/PWA browser smoke                                                      |
| `npm run test:production`    | Normal no-debug-hook production build and playable-shell smoke                                           |
| `npm run test:soak`          | `test:smoke` plus one real-time seven-minute loop/reset check (slow)                                     |
| `npm run verify`             | typecheck + lint + unit + game smoke + normal build                                                      |
| `npm run generate:icons`     | Regenerate PNG favicon set, maskable icon, favicon.ico/svg (`scripts/generate-icons.mjs`, needs `sharp`) |
| `npm run smoke`              | Playwright smoke test (desktop 1500px + mobile 390px) against `localhost:5199`                           || `npm run smoke:narrow`       | 320px horizontal-overflow check against `localhost:5199`                                                 |

Playwright uses system Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (no bundled browser).

## Deploy (game live at `https://app.quackforge.io.vn/reset07/play`)

- Cloudflare Pages watches **`QuackForge-Studio/quackforge-app`** (main), NOT this repo. Its build (`scripts/build.mjs`) shallow-clones Reset07 and builds it into `dist/reset07/` — so a push here never deploys on its own.
- To publish game changes: push Reset07, then trigger a `quackforge-app` rebuild — any push/empty commit to its main, or "Retry deployment" in the CF Pages dashboard. Verify the live bundle hash matches a fresh `npm run build` output.
- The game's PWA service worker is network-first for navigations; a plain refresh picks up new builds.

## Structure

- `src/brand/` — the brand system:
  - `styles/brand-tokens.css` — **single source of truth** for tokens (colors, spacing, radius, shadows, gradients, motion, z-index); TS mirrors in `tokens/`
  - `components/` — BrandLogo, BrandIcon, BrandLockup, AnimatedBrandLogo (2.4s intro), LoadingBrandMark
  - `patterns/` — CountdownGrid, ResetRings, MemoryTrace, CriticalState (all reduced-motion aware)
  - `layouts/` — 8 social/store templates (`SocialTemplates.tsx` + `social.css`)
  - `motion/` (easing vocabulary), `docs/` (short brand guidelines)
- `src/game/` — `screens/` (TitleScreen, LoadingScreen) + `hud/` (CountdownTimer, SegmentedRing, StatusChip, SlashDivider, TimingLine)
- `src/guidelines/` — the `/` page: `sections/*`, `ui.tsx`, `guidelines.css`
- `public/brand/` — the 5 supplied logo assets (PNG, sourced from `logo/`): `reset07-wordmark.png`, `reset07-wordmark-white.png`, `reset07-wordmark-black.png`, `reset07-wordmark-small.png`, `reset07-icon.png`
- `scripts/` — `generate-icons.mjs`, `smoke-test.mjs`, `narrow-check.mjs`
- `src/play/` — the game:
  - `systems/` — pure logic: `LoopTimer.ts` (7-min state machine), `SaveSystem.ts`, `combat.ts`, `Pathfinder.ts`, `AudioEngine.ts`, `CameraRig.ts`, `Explosions.ts`, `Effects.ts`, `InputState.ts`
  - `data/` — data-driven: endings, modules, memories, objectives, enemies, fx presets, dialogue, tutorials, strings (EN+VI)
  - `world/` — `cityData.ts` (deterministic 144×104 tile grid) + `CityBuilder.ts`
  - `scenes/` — `WorldScene.ts` (orchestrator + `window.__r07` debug hook), `BootScene.ts`
  - `entities/` — Player, 4 enemies, CoreGuardian boss, environment props
  - `ui/` — GameShell, TitleScreen, HUD, TouchControls, DialoguePanel, PauseMenu, SettingsPanel, MemoryBoard, GarageScreen, EndingScreen
- QA probes: `scripts/probe*.mjs` + `qa-game.mjs` (Playwright against `localhost:5199`, system Chrome). Temporary — delete after QA lands.

## Game gotchas (durable)

- **Movement tuning**: `Player` `accel` must stay **above** `friction` (1700 vs 1150). Equal values make friction exactly cancel acceleration → player never moves.
- **Gates**: DOOR tiles are excluded from `collisionRects()` (wall rects). The `Gate` sprite has its own physics body that is destroyed on `openGate()` — don't re-add DOOR tiles to wall rects or opening a gate leaves an invisible wall.
- **Scene restart**: Phaser `scene.restart()` reuses the same instance, so class-field arrays (`explosiveProps`, `enemyList`, `interactables`, `lamps`, opening flags) must be reset at the top of `create()` or they accumulate duplicates.
- **Bullets × explosives**: uses a real `Phaser.Physics.Arcade.Group` (`explosiveGroup`), registered from `explosiveProps` in `create()`.
- **Explosive fuse**: `onComplete` must not bail on `!this.scene` — the prop's scene ref dies before the tween completes; capture `scene` in the closure.
- **fps config**: `fps: 60` (target) alone does NOTHING in rAF mode — the game renders at display refresh (120/144Hz → 2-2.4x GPU work). `createGame.ts` uses `fps: { target: 60, limit: 75 }` (Phaser 3.60+ `limit` caps update+render); keep `limit` ≥75 so 144Hz stays ≥60Hz effective. Don't "fix" it back to a bare number.
- **QA probes**: heat weapon overheats after ~20 shots — bursts (release ~0.4s per 1.3s) avoid perma-overheat. Canvas needs a click for keyboard focus. Garage gate is at tiles x14-18 — sidestep into that x-range before walking south.

- **Gate colliders**: closed Gate sprites must remain immovable and retain player/enemy colliders; destroy those colliders when the gate opens.
- **Touch controls**: reset `touchInput` on pause, unmount, resize, and orientation change. Keep the pause button outside the bottom control grid so it cannot overlap OPEN.
- **E2E hook**: `window.__r07` is available only in DEV or `VITE_E2E=true`; normal production builds must not expose it.
- **Phaser overlap arg order**: `physics.add.overlap(group, sprite, cb)` passes the callback `(loneSprite, groupMember)` — NOT `(groupMember, loneSprite)`. The player-vs-bolt overlap broke exactly this way (player got destroyed instead of the bolt).
- **Texture canvas sizes are load-bearing**: entity physics bodies are `setCircle(r, offsetX, offsetY)` offsets relative to the texture frame, so `texgen.ts` canvas sizes must never change — redraw inside, keep the size.

## Brand rules (non-negotiable)

- **Never invent, redraw, or substitute the logo.** Only reference `public/brand/` files via the variant components (BrandLogo / BrandIcon / BrandLockup). The assets are the supplied PNGs from `logo/` — never convert, recolor, or retype them.
- **Colors** come only from CSS variables in `brand-tokens.css` (6 core: Core Black `#070A0F`, Deep Navy `#101826`, Emergency Cyan `#38E8FF`, Reactor Orange `#FF6A1A`, Corruption Magenta `#FF3D9A`, Signal White `#F4F8FF`; plus semantic tokens). No raw hex in components or CSS.
- **Logo sizing**: always pass width/height as **inline style** (components do this). Never add `width/height: auto` to `.brand-logo` CSS — it overrides the sizes and collapses SVGs to their 300px intrinsic size.
- **Motion**: durations/easings only from tokens (2.4s logo intro; 200ms under reduced motion). Respect `prefers-reduced-motion` and the `data-motion` / `data-effects` / `data-flash` simulation attributes on `<html>`.
- **Accessibility**: no color-only states, keyboard-navigable menus, visible focus rings.
- **Typography**: Chakra Petch (display), Be Vietnam Pro (UI — supports Vietnamese), IBM Plex Mono (data).

## Verification before claiming done

1. `npm run typecheck`
2. `npm run build`
3. `npm run dev -- --port 5199`, then `npm run smoke` + `npm run smoke:narrow`
4. Zero console/page errors in the Playwright runs.

## Maintenance protocol

- This file is pi's project memory. When you discover a **durable fact** (new command, convention, decision, gotcha, structure change), update this file in the same session: add one terse line, or edit the stale entry — never stack duplicates.
- Keep a running **`TRACKING.md`** log: when a chunk of work lands, add one line there (and mark it in progress while working). Don't log transient detail (one-off bug fixes, session trivia) in AGENTS.md — that goes in TRACKING.md's gotchas section.
- Do **not** log transient detail (one-off bug fixes, session trivia).
- If the user asks to refresh/update project memory, load the project skill `maintain-project-memory` and follow it.
