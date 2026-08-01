# RESET//07 — independent release audit

Audit date: 2026-08-01
Auditor: Codex (independent pass after the prior QA report)

## Verdict

**Milestone: Vertical Slice.**

The project now has a working, production-mode opening sequence, real gameplay
input, a seven-minute loop/reset path, PWA app-shell coverage, a boss combat
path, and all three ending transitions. That is materially stronger than the
previous opening-only check. It is not a Release Candidate or Release Ready:
the normal traversal path through every district and every ending prerequisite
has not been completed without test seeding, no device-lab/audio/performance
pass has happened, and development dependencies have unresolved security
advisories.

The earlier report was **partly accurate**. It correctly found the acceleration
and friction regression, the static door-wall issue, and scene-array reuse.
It did not exercise the actual Phaser gate body, mobile input bridge, scene
pause, dash/overdrive consumption, full boss collision/teardown, or production
testability. Those omissions exposed additional P1 defects in this audit.

## Environment and commands

Browser automation used system Chrome at
`C:/Program Files/Google/Chrome/Application/chrome.exe` through Playwright
Core. Game smoke runs start a local Vite preview server at `127.0.0.1:5197`.

| Command                   | Result               | Notes                                                                                                                                                                        |
| ------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                  | PASS                 | Completed after stopping only stale RESET//07 Vite/preview processes that had locked `esbuild.exe`. It reported six dependency advisories.                                   |
| `npm run typecheck`       | PASS                 | Independently rerun during the audit.                                                                                                                                        |
| `npm run lint`            | PASS with 6 warnings | Exit code 0. Warnings are two React lifecycle/ref warnings in `AnimatedBrandLogo`, two Fast Refresh export warnings, and missing hook dependencies in `GameShell` and `HUD`. |
| `npm test`                | PASS — 49/49         | Seven Vitest files; see the coverage assessment below.                                                                                                                       |
| `npm run build`           | PASS                 | Normal production build. Vite warns that the Phaser chunk is about 1.48 MB minified (339.71 kB gzip).                                                                        |
| `npm run test:production` | PASS                 | Normal production build: `/play` title and playable Phaser shell load, no console errors, and the E2E inspection hook is absent.                                             |
| `npm run smoke`           | PASS                 | Legacy visual smoke for `/`, `/title`, and `/loading`; it does **not** exercise `/play`.                                                                                     |
| `npm run smoke:narrow`    | PASS                 | Legacy 320px brand-route overflow check; it does **not** exercise `/play`.                                                                                                   |
| `npm run test:smoke`      | PASS                 | Production-mode game/PWA browser smoke added in this pass.                                                                                                                   |
| `npm run test:soak`       | PASS                 | The real-time 420-second timer reached reset once and preserved the collected memory. Later UI-only changes were covered again by the fast smoke suite.                      |
| `npm run verify`          | PASS                 | Final aggregate run: typecheck, lint (six warnings), 49/49 unit tests, E2E production smoke, and normal production build.                                                    |
| `npm audit --json`        | 6 advisories         | 3 moderate, 2 high, 1 critical; all are development/tooling dependencies. See Remaining risks.                                                                               |

`test:smoke` uses a separate E2E Vite mode only to expose a test inspection
hook; normal `npm run build` does not include it. The browser still uses the
real production-mode bundle, Vite preview, Phaser physics, DOM controls,
localStorage, service worker, and browser input.

## Browser and viewport coverage

The durable smoke suite covers:

| Surface          | Coverage                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Desktop gameplay | 1440×900 opening flow, plus 1366×768 and 1920×1080 no-horizontal-overflow checks                       |
| Mobile portrait  | 375×667 and 390×844                                                                                    |
| Mobile landscape | 667×375 and 844×390                                                                                    |
| Tablet portrait  | 768×1024                                                                                               |
| PWA              | Production-mode manifest link, active service-worker control, and offline `/play` app-shell reload     |
| Console errors   | Captured for desktop, mobile, PWA, boss, and ending pages; final smoke requires zero non-benign errors |

Emulated touch is meaningful regression coverage, but it is not a substitute
for iOS/Android hardware, browser chrome, safe-area insets, or audible output.

## Actual playable feature matrix

Status vocabulary is deliberately strict: a source file or pure unit test does
not make a feature playable.

| Feature                                     | Status                                     | Evidence / limitation                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title screen and New Loop                   | VERIFIED WORKING                           | Production-mode browser smoke opens the title and starts the actual game scene.                                                                                         |
| Continue and persisted loop state           | VERIFIED WORKING                           | Smoke resets a loop, returns to title, activates Continue, then verifies the new world has the saved memory and reset temporary state.                                  |
| Opening, first drone, vehicle, garage gate  | VERIFIED WORKING                           | Real keyboard/mouse input kills the drone and vehicle; closed/open gate physics are asserted.                                                                           |
| Movement, aim, shooting                     | VERIFIED WORKING                           | Real input moves from rest, drives aiming/fire, and kills the opening drone. Directional/refresh-rate tuning beyond smoke remains a manual tuning task.                 |
| Dash and overdrive                          | VERIFIED WORKING                           | Desktop input is now consumed by the scene and touch buttons are asserted.                                                                                              |
| Interact / hold actions                     | VERIFIED WORKING                           | A mobile touch hold completes a real relay interaction; proximity memory collection is also persisted through reset.                                                    |
| Player damage and death                     | NOT VERIFIED                               | Enemy/projectile source exists, but this audit did not complete a controlled death/recovery path.                                                                       |
| Enemy roster and ordinary spawn progression | PARTIALLY WORKING                          | Opening drone, boss hit, and scene spawn lifecycle were exercised. All enemy types and long-run spawn balance were not.                                                 |
| Objectives and district traversal           | PARTIALLY WORKING                          | Objective data and city connectivity tests pass; ordinary on-foot traversal through Service, Power, Transit, Yard, and every gate was not completed.                    |
| Timer, pause, resume, reset                 | VERIFIED WORKING                           | Phase thresholds are test-accelerated only in the isolated E2E hook; a separate real-time seven-minute run is recorded below. Pause freezes the Phaser scene and timer. |
| Vehicle explosion                           | VERIFIED WORKING                           | The opening vehicle is killed through player fire and opens the gate.                                                                                                   |
| Large environmental chains / performance    | PARTIALLY WORKING                          | Pure chain-depth limits pass and the vehicle explosion works. No measured worst-case chain, FPS, memory, or audio-clipping result exists.                               |
| Boss encounter and ordinary reachability    | LOGIC VERIFIED, GAMEPLAY PATH NOT VERIFIED | A seeded save and test teleport trigger the real boss, and actual player projectiles reduce HP. The full unlocked-route traversal was not performed.                    |
| Boss defeat                                 | LOGIC VERIFIED, GAMEPLAY PATH NOT VERIFIED | Real boss damage and real defeat callback/decision UI were exercised; automation supplies lethal final damage rather than playing all phases to completion.             |
| Preserve ending                             | LOGIC VERIFIED, GAMEPLAY PATH NOT VERIFIED | Real decision transition and completion save asserted. It is normally always available, but the complete ordinary route was not replayed.                               |
| Break ending                                | LOGIC VERIFIED, GAMEPLAY PATH NOT VERIFIED | Real decision transition, effects script, and completion save asserted after seeded boss completion.                                                                    |
| Release ending                              | LOGIC VERIFIED, GAMEPLAY PATH NOT VERIFIED | It unlocks with a seeded valid save and its transition/save are asserted. All required content was not earned normally in one audit run.                                |
| Desktop input                               | VERIFIED WORKING                           | Keyboard, mouse, pause/resume, gate traversal, shooting, dash, and overdrive exercised.                                                                                 |
| Touch input                                 | VERIFIED WORKING                           | Multi-touch movement+aim/fire, release, pointer cancel, orientation reset, interact hold, dash, overdrive, pause, and resume are covered.                               |
| Settings and menu return paths              | VERIFIED WORKING                           | Smoke persists an AUTO-AIM setting, returns Settings and Memory Board to pause, and returns How To Play to title. Audible/video effect quality still needs device QA.   |
| Audio                                       | PARTIALLY WORKING                          | Procedural audio initializes on input and no browser errors were seen; no physical-output, mixing, duplicate-instance, or clipping verification was possible here.      |
| PWA / offline                               | VERIFIED WORKING                           | Manifest, service-worker control, and offline `/play` cached-shell reload pass in the production-mode browser test. Installed-app/device behavior remains unverified.   |

## Previous unit-suite audit

The 49 Vitest assertions are useful pure-logic checks, not a game integration
suite.

| Test file                | What it genuinely tests                                                   | Important blind spots                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `city.test.ts` (7)       | Grid dimensions, static POIs, BFS/pathfinding door state, district lookup | No Phaser bodies: it could pass while a closed gate has no collider or an opened gate leaves an invisible physics wall. |
| `combat.test.ts` (10)    | Damage arithmetic and `ChainTracker` caps                                 | No live explosions, visual radius, camera/flash cleanup, particles, or audio.                                           |
| `endings.test.ts` (3)    | Pure availability predicate and missing-requirement text                  | No boss, decision modal, save write, transition, or map reachability.                                                   |
| `loopTimer.test.ts` (8)  | Timer phase boundaries, callbacks, pause, single reset callback           | No Phaser scene pause, HUD, reset transition, save, or new scene.                                                       |
| `modules.test.ts` (6)    | Equip/unequip data rules                                                  | No in-game module effects.                                                                                              |
| `objectives.test.ts` (6) | Plan construction and tracker index                                       | No world interaction or objective HUD route.                                                                            |
| `save.test.ts` (9)       | Serialization, migration, corruption fallback, basic sanitation           | No GameShell update, real loop reset, title Continue, or browser lifecycle.                                             |

The new production-mode game smoke closes the most serious integration gaps:
zero-velocity movement; real closed/open gate traversal; pause; test-isolated
timer/reset and persistence; title Continue; repeated scene restart; PWA; touch
input; boss projectile collision; and ending UI/save transitions. It does not
pretend to replace a full content traversal or performance suite.

## Defects reproduced and fixed

| Severity | Defect / root cause                                                                                                                                                                                                     | Repair                                                                                                                       | Regression evidence                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Virtual joystick mutated `touchInput`, but `InputManager.sample()` never used its movement vector. A mobile drag visibly produced zero player displacement.                                                             | Touch mode now supplies `touchInput.moveX/Y`; queue/reset helpers centralize transient input.                                | Smoke dispatches simultaneous left-stick and right-aim touches and requires movement, aim/fire state, and spawned player bolts. |
| P1       | `pauseGame()` stopped only `LoopTimer`; the live Phaser scene continued. The paused player moved about 18 px in 600 ms.                                                                                                 | Pause/resume now call Phaser scene pause/resume as well as timer state.                                                      | Smoke verifies unchanged player position and time while paused, then real movement after resume.                                |
| P1       | Excluding DOOR tiles removed the old invisible wall, but no player/enemy collider had been registered for the Gate sprite. The gate body also was movable.                                                              | Registered player/enemy-to-gate colliders, destroy them with the gate, and made Gate immutable/non-pushable.                 | Smoke proves a closed gate stops traversal, then opens and permits passage; restart checks require it closed again.             |
| P1       | Dash/overdrive were sampled but never invoked by `WorldScene`.                                                                                                                                                          | Scene consumes queued input exactly once; duplicate overdrive callback removed.                                              | Touch DASH and OVERDRIVE controls are exercised against actual player state.                                                    |
| P1       | `scene.restart()` reset only selected arrays; timers, dialogue, boss/opening flags, listener subscriptions, and spawn state could survive. Enemy count grew from 4 to 8 on the fifth/tenth restart in the reproduction. | Reinitialize all per-loop collections/state and unsubscribe/off the boss listener before rebuild.                            | Ten restarts must retain enemy, explosive, interactable, wall, projectile counts and closed-gate state.                         |
| P1       | `CoreGuardian` was constructed but omitted from `enemyGroup`, so player-bolt overlap never reached it.                                                                                                                  | Add the boss to the enemy physics group.                                                                                     | Real player firing reduces boss HP in browser automation.                                                                       |
| P1       | Lethal `CoreGuardian.damage()` called the inherited destruction path and then continued into phase logic with a destroyed scene reference.                                                                              | Return immediately after `super.damage()` when the boss is no longer alive.                                                  | All three real defeat-to-decision-to-ending smoke paths complete without console/page errors.                                   |
| P2       | A world save did not notify React, so post-loop UI could display stale save data.                                                                                                                                       | Added a `save` bridge event and refresh GameShell state after save.                                                          | Garage copy is asserted after a reset.                                                                                          |
| P1       | An active touch stick had no resize/orientation cleanup; browsers may cancel a touch during rotation without delivering a pointer event to its original element.                                                        | Clear stick refs, visual state, and global touch state on resize/orientation and on pause.                                   | Smoke begins a touch, rotates the emulated device, and requires released movement/fire state.                                   |
| P1       | The pause button was absolutely positioned inside the bottom control grid, physically overlapping OPEN. The pause hit target intercepted a real touch hold, making relay/capsule interaction impossible.                | Move the active pause hit target to be a direct child of the full touch layer; add pointer capture for the interaction hold. | A real CDP touch hold now completes a relay interaction; the pause button remains a separate 44px target.                       |
| P2       | Settings always returned to title; Memory Board always returned to garage; How To Play always returned to pause, regardless of their caller.                                                                            | Track each modal's parent overlay and return there.                                                                          | Smoke changes a setting from Pause, opens/closes Memory Board from Pause, and opens/closes How To Play from Title.              |
| P2       | The old QA harness depended on a DEV-only debug hook, so it could not exercise a preview build.                                                                                                                         | Added an isolated E2E build mode and durable preview-based smoke runner; normal production remains hook-free.                | `npm run test:smoke` and `npm run test:soak` use Vite preview, not the dev server.                                              |

No permanent production timing shortcut was added. Test-time phase changes exist
only behind `VITE_E2E`; the normal loop remains 420 seconds.

## First-five-minute clarity review

This is an automation-assisted assessment of the first playable sequence, not a
substitute for a blinded human playtest. Scores are 0–5.

| Criterion                                 | Score | Runtime observation                                                                                                               |
| ----------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------- |
| Obvious primary title action              |     5 | `NEW LOOP` is visually primary and immediately starts play.                                                                       |
| Control arrives quickly                   |     4 | The title starts the scene promptly; opening dialogue can be advanced with the normal interact key.                               |
| Movement clarity                          |     4 | WASD/touch labels and the opening movement response are clear; a first-time player still receives several UI signals at once.     |
| Shooting introduction                     |     4 | A visible opening drone and player fire solve the first encounter naturally.                                                      |
| First enemy attack readability            |     3 | Enemy telegraphing exists in source and the opening encounter runs, but visual legibility has not had a blinded observation pass. |
| Satisfying explosion within ~60 seconds   |     5 | The real tutorial vehicle explosion opens the route in the smoke flow.                                                            |
| First objective clarity                   |     3 | HUD/objective data exists, but ordinary route-following beyond the garage was not human-tested.                                   |
| Timer comprehension                       |     4 | HUD starts only when the loop begins and phase checks work; whether a new player understands persistence/urgency needs testing.   |
| Knowing where to go                       |     3 | Gate and opening pacing are clear; district-level navigation is not yet validated by a fresh player.                              |
| Dialogue during combat                    |     3 | Skip behavior works, but sustained combat plus dialogue has not been playtested.                                                  |
| Mechanics introduced at a manageable rate |     3 | The opening is controlled; later rollout of dash, overdrive, and interactions needs a human pacing pass.                          |

## Remaining risks before release

1. Complete a no-teleport/no-seeded-save traversal through every district, gate,
   objective, boss phase, and ending prerequisite; then upgrade ending statuses
   only if each path is genuinely reachable.
2. Run real-device iOS/Android touch, safe-area, rotation, browser-scroll,
   installed-PWA, and audio tests.
3. Measure and stress the largest live explosion chain: frame time, particles,
   decals, camera shake/flash recovery, touch responsiveness, and audio
   clipping. No FPS or memory number is claimed in this audit.
4. Test a controlled player death, settings persistence, background-tab timer
   behavior, and audio/listener cleanup beyond scene-count evidence.
5. Resolve the six `npm audit` advisories before exposing development servers or
   test UI on a shared network. The critical advisory is Vitest UI file
   read/execute exposure below `vitest@3.2.6`; Vite/esbuild and Sharp advisories
   also require an upgrade plan. Current automatic fixes propose major upgrades,
   so they were not applied blindly during gameplay QA.
6. Address the six non-failing ESLint warnings and decide whether the 1.48 MB
   Phaser bundle needs loading/code-splitting work for target devices.

## Soak result

`npm run test:soak` completed with exit code 0. It began with the ordinary title
and opening flow, used real player input through the garage gate, paused and
resumed, collected `garageLog`, then waited for the unmodified 420-second clock.
The loop reset exactly once and the persisted save contained both the incremented
loop count and `garageLog`. It also completed the browser mobile, boss, ending,
and no-console-error smoke segments. The subsequent current-source fast smoke
reruns cover the later touch/menu fixes without rerunning another seven minutes.
