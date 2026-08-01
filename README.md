# RESET//07

RESET//07 is a top-down neon science-fiction action game about escaping a city
that resets every seven minutes. This repository also contains its brand system,
internal guidelines, and title/loading demonstrations.

Current milestone: **Vertical Slice**. The opening loop, reset, boss encounter,
and ending UI are implemented, but the full narrative routes and release-level
device/performance validation are still incomplete. See
[the independent audit](docs/codex-independent-audit.md) for the evidence and
known limits.

## Install and run

```bash
npm ci
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Useful routes:

- `/play` — the game
- `/` — internal brand guidelines
- `/title` and `/loading` — standalone presentation demos

For the fixed-port browser checks used by this repository:

```bash
npm run dev -- --port 5199
```

## Controls

| Action     | Desktop                   | Touch                     |
| ---------- | ------------------------- | ------------------------- |
| Move       | WASD or arrow keys        | Left-side virtual stick   |
| Aim / fire | Mouse / left mouse button | Right-side drag zone      |
| Dash       | Space or Shift            | DASH                      |
| Interact   | E                         | OPEN (hold when prompted) |
| Overdrive  | Q                         | OVERDRIVE                 |
| Pause      | Esc                       | Pause button              |

Gamepad input is also implemented: left/right sticks for move/aim, RT/LT to
fire, A to dash, B to interact, shoulder buttons for overdrive, and Start/Back
to pause.

## Saves and loops

Saves live in browser local storage under `reset07.save.v1`. Memories,
rescues, unlocked modules, and ending completion persist between loops;
temporary world state, health, enemies, projectiles, and gates reset. `CONTINUE`
starts a fresh loop using that persistent progress rather than resuming a
mid-loop checkpoint.

To reset local progress during development, clear this local-storage key in the
browser's site data. Do not assume that clearing it is reversible.

## Testing and verification

| Command                               | What it verifies                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                   | TypeScript type check                                                                                                                                        |
| `npm run lint`                        | ESLint (currently exits successfully with six tracked warnings)                                                                                              |
| `npm run test` or `npm run test:unit` | 49 fast Vitest logic tests                                                                                                                                   |
| `npm run test:smoke`                  | Production-mode Playwright game smoke: PWA shell, opening, movement, gate, timer, pause, reset, restart lifecycle, touch, boss hit, and ending UI/save paths |
| `npm run test:e2e`                    | Alias for `test:smoke`                                                                                                                                       |
| `npm run test:production`             | Normal no-debug-hook production build, title, and playable Phaser-shell smoke                                                                                |
| `npm run test:soak`                   | The same suite plus one real-time seven-minute timer-to-reset soak; intentionally slow                                                                       |
| `npm run smoke`                       | Legacy brand-route visual smoke only; start the dev server on port 5199 first                                                                                |
| `npm run smoke:narrow`                | Legacy 320px brand-route overflow check; start the dev server on port 5199 first                                                                             |
| `npm run verify`                      | Typecheck, lint, unit tests, production-mode game smoke, and a normal build (does not include the seven-minute soak)                                         |

`test:smoke` builds with an isolated `VITE_E2E` hook so its browser assertions
can inspect real Phaser state. The normal production build does not contain the
hook. The test still starts a Vite preview server and drives actual browser
input, collision, timers, local storage, and UI.

## Production build and PWA

```bash
npm run build
npm run preview
```

The shipped build uses `base: './'` so it can be hosted below a subdirectory.
In production, the app registers `public/sw.js` and links
`public/manifest.webmanifest`. After an online visit has installed the service
worker and cached the app shell, `/play` was verified to reload offline in the
production-mode browser smoke test.

## Project layout

```text
src/play/       Phaser game systems, world, entities, scenes, and React game UI
src/brand/      Brand tokens, components, patterns, motion, and social layouts
src/game/       Title/loading screen demos and shared HUD primitives
src/guidelines/ Internal brand-guidelines route
public/brand/   Supplied RESET//07 logo assets
public/sw.js    Offline service worker
scripts/        Browser smoke, soak, icon, and visual QA scripts
tests/          Vitest logic tests
docs/           Brand guidelines and independent audit
```

## Brand assets

Use the supplied PNG assets in `public/brand/` through the brand components;
never redraw, recolor, or substitute the logo. See
[brand-guidelines.md](docs/brand-guidelines.md) for the color, typography,
motion, and clear-space rules. Run `npm run generate:icons` after deliberately
replacing a supplied logo asset.

## Known limitations

- The smoke suite validates seeded boss/ending conditions and the displayed
  transitions, not every narrative prerequisite through ordinary map traversal.
- Audio routing is source-reviewed and exercised without browser errors, but
  not audibly assessed on real mobile hardware.
- Large-chain performance, long-session memory use, accessibility/device-lab
  testing, and installed-PWA behavior remain release work.
- The production build warns that the Phaser chunk is about 1.48 MB minified.
- `npm audit` currently reports six development-tooling advisories, including
  one critical Vitest advisory. Upgrade planning is required before exposing
  development tooling on a shared network.
