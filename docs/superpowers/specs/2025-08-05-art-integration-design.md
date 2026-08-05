# Art Integration — 5 concept/background assets into RESET//07

Date: 2025-08-05
Status: Approved by user (design choices below), pending spec review

## Goal

Wire the 5 generated-but-unused art assets into the game where ART-PROMPTS.md
intended them, without shipping 11 MB of dead weight:

| Asset | Size (PNG) | Destination |
|---|---|---|
| `title-city.png` (1536×864) | 2.9 MB | In-game `/play` title screen backdrop |
| `loading-loop.png` (1536×864) | 1.9 MB | `/loading` brand demo + loop-reset overlay |
| `k07-portrait.png` (512×512) | 0.4 MB | EndingScreen (preserve/release) + MemoryBoard avatar |
| `boss-concept.png` (1024×1024) | 1.9 MB | EndingDecisionModal backdrop + Ending BREAK |
| `garage.png` (1920×1080) | 3.7 MB | GarageScreen backdrop |

## 1. Asset pipeline (PNG source → WebP shipped)

- Move the 5 PNGs out of `public/` into a new repo-root folder `artwork/`:
  - `artwork/concept/title-city.png`, `loading-loop.png`, `k07-portrait.png`, `boss-concept.png`
  - `artwork/backgrounds/garage.png`
  PNGs are the generation source (Antigravity/Gemini output) — kept for
  regeneration, never shipped. Pattern mirrors `logo/` → `public/brand/`.
- New script `scripts/optimize-art.mjs` (uses `sharp`, already a devDependency):
  - Reads `artwork/**/*.png`, writes WebP (`quality ~80`) to the same relative
    path under `public/art/`, preserving exact dimensions.
  - `npm run optimize:art` script entry.
  - Idempotent; skips missing sources with a clear message.
- Delete the old PNGs from `public/art/concept/` and `public/art/backgrounds/`
  after the script has produced the WebP files (Vite would otherwise ship both).
- Update `ART-PROMPTS.md`: note that PNG output lands in `artwork/` and that
  Pi converts to WebP into `public/art/`; targets in prompts stay unchanged.
- Result: `dist/art` shrinks from ~11 MB to ~2 MB (sprites stay PNG — they are
  load-bearing game textures consumed by `aiArt.ts`).

## 2. Asset registry (`src/play/artAssets.ts`)

- Mirrors `src/brand/assets.ts`: `const BASE = import.meta.env.BASE_URL` and
  export `ART_ASSET_PATHS` + `artAssetPath(name)`. `base: './'`-safe on
  sub-path deployments (quackforge.io.vn/reset07/play).
- Keys: `titleCity`, `loadingLoop`, `k07Portrait`, `bossConcept`, `garage`.

## 3. In-game title screen (`src/play/ui/TitleScreen.tsx` + `ui.css`)

- `.title-screen__bg` gains a background layer: `artAssetPath('titleCity')`,
  `background-size: cover`, centered. Layered BELOW the existing `.title-screen__grad`/`__city`
  patterns (keeps the digital-grid aesthetic + readability).
- Add a Core Black gradient overlay (from tokens) concentrated top-center where
  the logo + menu sit (per ART-PROMPTS: "vertical space at top-center darker
  for UI overlay"). Tokens only — no raw hex.
- Static image → reduced-motion safe. `role="img"`-free: decorative, aria-hidden.

## 4. Loading art — `/loading` demo + loop-reset overlay

- **Demo** (`src/game/screens/LoadingScreen.tsx` + `screens.css`):
  background `loadingLoop`, cover, with the existing progress bar overlay
  ("vertical center slightly darker" per prompt).
- **Loop reset** (new): when a loop ends (timeout or death), after the Phaser
  white-out, GameShell shows a full-screen `LoopResetOverlay`:
  - `loadingLoop` background + `REINITIALIZING CITY GRID // 07:00` data text +
    a CSS progress bar filling over ~1.3 s, then auto-dismiss into the garage.
  - Trigger: new bus event `loopReset` emitted from `WorldScene.finishReset()`
    (single place for both death and timeout paths).
  - Reduced motion: fade-in/fade-out only, no bar animation.
  - CSS progress uses token colors (`--color-emergency-cyan` etc.).

## 5. K-07 portrait (`k07Portrait`)

- **EndingScreen**: panel becomes a two-column layout on wide screens
  (image left, epilogue right; stacks on narrow): `.ending__art` `<img>`
  with `alt="K-07 — continuity keeper"`. Shown for endings `preserve` and
  `release`.
- **MemoryBoard**: small circular avatar (64 px, `object-fit: cover`, cyan
  token border) beside the "MEMORY BOARD" heading. Decorative → `aria-hidden`.

## 6. Boss concept (`bossConcept`)

- **EndingDecisionModal**: backdrop on `.modal-backdrop` (behind the panel):
  `background-size: cover` + dark Core Black overlay (~0.55) + existing blur —
  panel stays readable.
- **Ending BREAK**: used in place of the portrait in `EndingScreen` when
  `id === 'break'` (core detonation epilogue). Alt: "The core guardian —
  decommissioned".

## 7. Garage backdrop (`garage`)

- `GarageScreen` backdrop on `.modal-backdrop` variant (class
  `modal-backdrop--art`): `garage` cover + dark overlay; the existing
  `.panel` stays on top. Per prompt: "slightly darker center for UI panels".

## 8. Accessibility & quality rules

- Overlays only from `brand-tokens.css` variables; no raw hex in components/CSS.
- All backdrops decorative → `aria-hidden` / no alt; the two content images
  (portrait, boss) get meaningful `alt`.
- No color-only states introduced; focus/keyboard flow unchanged (no new
  interactive elements).
- Static images: no motion, no reduced-motion changes beyond the reset bar.

## 9. Verification

1. `npm run optimize:art` → check `public/art/**/*.webp` exist, PNGs removed
   from `public/`, `dist/art` ≈ 2 MB.
2. `npm run typecheck` + `npm test` + `npm run build`.
3. Dev server + Playwright (reuse `qa-game.mjs` pattern + a new
   `probe-art.mjs`): screenshots of title, garage, memory board, decision
   modal, ending (preserve + break), loop-reset overlay; zero console errors;
   `smoke` + `smoke:narrow` pass.
4. Confirm visual contrast on 1440 px and 390 px viewports.

## Out of scope

- No changes to sprite art, texgen canvas sizes, or gameplay.
- No new UI features beyond the reset overlay; no screens re-laid-out beyond
  the ending panel columns.
