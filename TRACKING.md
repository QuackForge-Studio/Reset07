# RESET//07 — Progress Tracking

Durable task log. Updated whenever a chunk of work lands. One line per item, newest on top under each section. If a line is stale, edit it — never stack duplicates.

## In progress

- [x] AI art pipeline 100% COMPLETE: All 15 assets generated, transparent-keyed (sprites), resized, verified & saved in `public/art/` (9 sprites, 4 concept, 1 background). Ready for Pi integration.
- [x] AI art background generated: C1 Garage -> `public/art/backgrounds/garage.png` (1920×1080 PNG, processed & verified).
- [x] AI art concept generated: B4 Boss concept -> `public/art/concept/boss-concept.png` (1024×1024 PNG, processed & verified).
- [x] AI art sprite generated: A9 City Core -> `public/art/sprites/core.png` (96×96 transparent PNG, processed & verified).
- [x] AI art sprite generated: A8 Security Gate -> `public/art/sprites/gate.png` (64×64 transparent PNG, processed & verified).
- [x] AI art sprite generated: A7 Boss Core -> `public/art/sprites/boss-core.png` (80×80 transparent PNG, processed & verified).
- [x] AI art sprite generated: A6 Boss Core Guardian -> `public/art/sprites/boss.png` (160×160 transparent PNG, processed & verified).
- [x] AI art sprite generated: A5 Detonator -> `public/art/sprites/enemy-detonator.png` (32×32 transparent PNG, processed & verified).
- [x] AI art sprite generated: A4 Shield Unit -> `public/art/sprites/enemy-shield.png` (44×44 transparent PNG, processed & verified).
- [x] AI art sprite generated: A3 Hunter Drone -> `public/art/sprites/enemy-hunter.png` (40×40 transparent PNG, processed & verified).
- [x] AI art sprite generated: A2 Patrol Drone -> `public/art/sprites/enemy-drone.png` (40×40 transparent PNG, processed & verified).
- [x] AI art sprite generated: A1 Player K-07 -> `public/art/sprites/player.png` (64×64 transparent PNG, processed & verified).
- [x] v0.8.0 bump (package.json/lock + brand Loading/Title + play Title). Live bundle index-CcIBDnr-.js (30f9ce6 → qfa deploy).
- [x] AI art pipeline: ART-PROMPTS.md (15 prompts: 9 sprites, 4 concept, 1 background) + public/art/ (README, sprites/concept/backgrounds). Antigravity is UI-only for image gen — agy CLI + 9router have no imageOutput; user pastes prompts, saves PNGs, Pi integrates.

- [x] Project-scoped subagents created in `.pi/agents/`: r07-bugfixer, r07-art-reviewer, r07-city-architect, r07-qa-verifier (all fresh-context, read AGENTS.md; sanity-tested via r07-bugfixer structure dump).

- [x] Playtest round 3: visible city-wall band at all four map rims (perimeter colliders moved inside the map; glowing inner edge); transit-sector platform blocks punched with lit cross-passages so the 4 parallel lanes connect (cyan-bordered doorway markers); patrol drones now rotate to face their shot while telegraphing/bursting. Live deployed 570e90b.

- [x] Playtest round 2: open gates showed a black void band instead of the road (DOOR tiles had no ground texture — new `t-door` tile maps T.DOOR); explosion flash was a screen-wide whiteout (scale fireball/30 @ alpha 1 ADD) — now scales to blast radius with capped alpha; verified localized 25-30% screen. Live deployed 15f3021.

- [x] QA batch from playtest: world perimeter walls + void underlay (player could walk out of the map / flickering void), effect-layer depths (explosions rendered UNDER the floor — EffectManager pools + explosion layers had no setDepth), dash afterimages now fade+destroy (trail lingered), bullet wall impacts (flash+ring+sparks, colored per bolt), HEAT bar added to HUD (plus dead-code overheat reset fixed), memory crystals no longer re-spawn when already owned (RECOVER MEMORY prompt silently did nothing), MemoryBoard ring layout rebuilt (cards overlapped; 0 overlap now), parked cars moved off the garage gate exit, drone telegraph redrawn as dashed pulsing beam.
- [x] Deploy trigger for the fix batch: pushed empty commit `cb72f72` to `quackforge-app` main → CF Pages rebuilt → live `app.quackforge.io.vn/reset07/play` now serves `index-BpM3nrT3.js` (verified). Deploy flow documented in AGENTS.md (game deploys need a quackforge-app rebuild — pushing Reset07 alone doesn't deploy).
- [x] Boss-hit freeze + enemy-fire fix and procedural art pass: `enemyBoltHitPlayer` arg order (`overlap(group, sprite)` passes the lone sprite first), dead nested `telegraphing > 0` branches in PatrolDrone/ShieldUnit (burstLeft/slam never fired), and silhouette-first redraw of all entity/vehicle/prop textures in `texgen.ts` (same canvas sizes, brand palette only). Verified live + `test:smoke` + `verify`.
- [x] Deployed to Cloudflare Pages: game live at `https://app.quackforge.io.vn/reset07/play` (subpath-aware router, Pages Function SPA fallback, cache-busted SW); QuackForge site CTA updated to "Chơi ngay" (spec: `docs/superpowers/specs/2026-08-01-deploy-reset07-cloudflare-pages.md`).

- [x] Independent release audit: repaired closed-gate collision, true pause lifecycle, mobile input, boss/ending integration, and delivered durable production-like smoke coverage plus audit report.
- [x] Write README (game docs, build/run commands, controls, architecture).
- [x] Wire durable production-like smoke tests into package.json for `/play`.
- [x] Full loop reset lifecycle QA: the real 420-second timer/reset and save persistence passed.
- [ ] Full no-seed boss and ending reachability QA: transitions are tested, but ordinary gameplay routes remain unverified.
- [x] Final aggregate verification: `npm run verify` passed; commit pending.

## Done

### Performance (2026-08-02)

- [x] GPU fix: `fps: { target: 60, limit: 75 }` in `createGame.ts` caps update+render to 60-72Hz via Phaser 3.60+ `fps.limit`; previously rAF rendered at display refresh (measured 117-143 steps/s at 120-144Hz) — now ~72 steps/s on 144Hz (≈50% GPU frames cut), 60 on 120Hz, unchanged on 60Hz. Verified: probe (rAF vs game-step counting), typecheck, 49 unit tests, full game smoke, production build.

### Independent audit (2026-08-01)

- [x] Independent audit report: `docs/codex-independent-audit.md` records commands, feature/coverage matrices, P1/P2 fixes, security findings, unverified paths, and the Vertical Slice milestone.
- [x] Durable browser checks: added `test:unit`, `test:smoke`, `test:e2e`, `test:production`, `test:soak`, and `verify`; `game-smoke.mjs` covers PWA/offline, opening, gates, pause, save/reset/Continue, lifecycle, desktop/mobile, boss hit, and endings.
- [x] Live loop verification: `npm run test:soak` waited for the real 420-second timer, reset once, and preserved `garageLog`; ten accelerated scene restarts remained stable.
- [x] Release-blocker repairs: touch movement/hold/orientation and pause layout, actual scene pause, gate physics, dash/overdrive consumption, stale restart state, boss projectile registration/defeat teardown, save UI refresh, and modal return paths.
- [x] Final independent checks: typecheck, build, normal-production shell smoke, game smoke, 49 Vitest tests, legacy smoke, and narrow smoke passed; ESLint has 0 errors and 6 pre-existing warnings.

### Verification (session 2)

- **qa-game.mjs full suite green**: title menu, opening (drone kill → vehicle blast → gate → leave garage via sidestep-left-into-gate + walk south), timer/HUD, pause, portrait/landscape resize, zero console errors.
- Final checks pass: `npm run typecheck` ✓, `npm run build` ✓, `npx vitest run` 49/49 ✓, `npm run lint` 0 errors ✓, `npx prettier --write` applied ✓.
- Deleted `scripts/probe*.mjs` (done their job). `qa-game.mjs` kept for reuse.

### QA fixes (session 2)

- **Opening flow verified end-to-end**: probe12 runs the full opening (dialogue skip → drone 1 → vehicle blast → gate → dash → leave garage) reaching `loop=playing` in ~5s with zero console errors. The manual re-press hack was the last blocker.
- **Fixed player never moving**: `Player.ts` had `accel === friction === 1500`, so friction (`1 - 1500*dt/sp`) exactly cancelled acceleration at rest — velocity stayed 0 forever. Changed to `accel=1700, friction=1150`.
- **Fixed gate physical block**: `collisionRects()` merged DOOR tiles into surrounding wall rects, so opening a gate (which only destroyed the gate sprite + flagged pathfinding) left an invisible wall blocking the exit. Now DOOR tiles are excluded from wall rects — gates handle their own collision via their sprite body (destroyed on open). `openDoor()` also destroys any overlapping wall zones as belt-and-suspenders.
- **Fixed scene-restart prop duplication**: `scene.restart()` reuses the same instance, so class fields (`explosiveProps`, `enemyList`, etc.) accumulated across restarts → duplicate props (the QA probe saw two identical tutorial vehicles). `create()` now resets per-instance arrays/state at the top.
- QA probe tooling: probe12/13 now use sustained fire with heat burst (down/up cycles) — perma-overheat was an artifact of re-pressing every loop.
- **qa-game.mjs full suite green**: title menu, opening (drone kill → vehicle blast → gate → leave garage via sidestep-left-into-gate + walk south), timer/HUD, pause, portrait/landscape resize, zero console errors. Key: heat-burst fire (release ~0.4s per 1.3s), canvas focus click before keyboard, sidestep into gate x-range (14-18) before walking south.

### QA fixes (session 1)

- Fixed game-loop freeze: player was created after colliders referenced it (`undefined` → Phaser `isParent` crash).
- Fixed bolts never moving: `PhysicsGroup.add()` resets body velocity → set velocity after group add in all bolt spawners.
- Fixed invisible world: `createGame` now starts `boot` scene (textures were `__MISSING`).
- Tutorial drone: rebuilt as hover drone anchored at garage; spawn moved inside; bullets reach it.
- Tutorial vehicle moved inside garage (tile [17,84]) so it's shootable before the gate opens; gate opens on its destruction.
- Explosive lifecycle: bullets now damage vehicles — `playerBolts`/`enemyBolts` × `explosiveProps` overlaps added (was missing: the core chain mechanic). Bolts×props uses a real `Phaser.Physics.Arcade.Group` (`explosiveGroup`), registered in `WorldScene` from `explosiveProps`.
- `Explosive.die()`: non-exploding props leak (gas pipes, `explodeOnDeath:false`); others start warning-fuse → detonation. Fuse tween now runs to completion even if the target's scene ref goes stale (guards on `scene.sfx`/`scene.explosions`).
- Opening script: replaced `!enemy.alive` closures (which nulled refs → stalls) with `openingDroneDead`/`openingDrone2Dead` flags. `showTutorial` marks already-learned tutorials done so restored saves don't stall scripted beats.
- Dialogue pacing: shorter read timers; E during a line skips it instantly.

### Core systems (pre-QA)

- Pure logic (all 49 vitest tests green): `palette.ts` (mirrors brand tokens), `strings.ts` (i18n EN+VI), `SaveSystem` (versioned, corrupt-fallback), `LoopTimer` (7-min state machine), `combat.ts` (damage calc + ChainTracker).
- Data: endings (3), modules (5), memories (8+ fragments with board graph), objectives, enemy balance, fx presets, dialogue script, tutorials — all data-driven.
- City: deterministic 144×104 tile grid — Garage (SW), Service Quarter, Power Grid (substation plazas), Transit Sector (halted tram), Perimeter Yard, City Core arena (center, 3 gates: north=relay, south=relayCode bypass, west=maintenance/Eli). Validation tests pass (BFS connectivity, POI walkability).
- Phaser layer: procedural texture factory, `ExplosionSystem` (13-layer + staggered chain queue), pooled `EffectManager` (quality-scaled), `Pathfinder` (A* + LOS), `CameraRig` (zoom/shake/hit-stop/slow-mo), `AudioEngine` (synthesized SFX + procedural music).
- Entities: Player (heat weapon/dash/overdrive), 4 enemies, CoreGuardian boss (3-phase), Explosive props (vehicles/tanks/gas pipes/transformers + puddle conduction, capsules, relay, uplink, gates, tram).
- `WorldScene` orchestrator (opening script, reset sequence, endings, dialogue, objectives, spawner), `BootScene` (textures), `CityBuilder`.
- React UI: `GameShell` (bridge + overlay state machine), TitleScreen, HUD, TouchControls, DialoguePanel, PauseMenu, SettingsPanel, MemoryBoard, GarageScreen, EndingScreen + decision modal, HowToPlay/Credits. `/play` route wired with dev PLAY link.
- PWA: `public/sw.js` service worker + manifest (offline support).

## Key gotchas (durable)

- `PhysicsGroup.add()` resets body velocity — set velocity _after_ adding bolts to groups.
- `Explosive.damage` spark uses `sceneWfx()` which can be null after scene teardown — always `?.`.
- Fuse `onComplete` must not bail on `!this.scene` — the prop's scene ref dies before the tween completes; capture `scene` in the closure.
- CityBuilder marks the tutorial vehicle by tile coords `[17,84]` — matches cityData comment.
- Probe scripts hit a stale HMR scene when the dev server has been running — always `localStorage.clear()` + fresh reload, and prefer fresh server for layout checks.
