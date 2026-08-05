# Task 9 report — final verification + QA probe

## Result

Passed after fixing a real reset-overlay timer bug. `LoopResetOverlay` now keeps `onDone` in a ref so the 1.4-second dismissal timer is not restarted by GameShell rerenders.

## Playwright QA probe

Command: `node scripts/probe-art.mjs`

Screenshots captured in `qa-shots/`:

- `qa-shots/art-title.png` — `/play` title screen; `title-city.webp` visible.
- `qa-shots/art-reset.png` — reset interstitial at approximately 500ms; `loading-loop.webp` visible with progress bar.
- `qa-shots/art-garage.png` — post-reset garage after the overlay completes; `garage.webp` visible.
- `qa-shots/art-memory.png` — memory board; `k07-portrait.webp` avatar visible.

Probe asset assertions:

- Title: `/art/concept/title-city.webp`
- Reset: `/art/concept/loading-loop.webp`
- Garage: `/art/backgrounds/garage.webp`
- Memory avatar: `/art/concept/k07-portrait.webp`
- Console/page errors: none

Not visually verified:

- Boss decision modal / `boss-concept.webp`: not verified; reaching the boss path is impractical in this probe and the debug hook does not expose React `endingDecision` state.
- Preserve, Break, and Release ending screens: not verified; they require a scriptable boss decision sequence that is not exposed by the debug hook.

## Static and bundle checks

- `npm run typecheck`: passed.
- `npm test`: passed — 8 files, 60 tests.
- `npm run build`: passed.
- `dist/art`: 501K (below 3MB).
- No `.png` files under `dist/art/concept` or `dist/art/backgrounds`.

## Regression checks

- `npm run smoke`: passed; no console/page errors.
- `npm run smoke:narrow`: passed; no page errors and no overflow at `/`, `/title`, or `/loading`.

## Files and cleanup

- Added the required tracking line to `TRACKING.md`.
- Fixed `src/play/ui/LoopResetOverlay.tsx` timer lifecycle.
- Temporary `scripts/probe-art.mjs` and `scripts/probe-smoke2.mjs` are removed before the final commit.
- QA screenshots remain under ignored `qa-shots/` for review.

## Final-review fix wave

- Updated `scripts/optimize-art.mjs` to report a clear missing-source message and exit non-zero when `artwork/` is absent or contains no PNG files.
- Moved `LoopResetOverlay` ref synchronization into an effect while retaining the stable one-shot dismissal timer.
- Updated the stale `TitleScreen` comment to describe the art backdrop and CSS layers.
- `npx tsc --noEmit`: passed.
- `npx eslint src/play/ui/LoopResetOverlay.tsx scripts/optimize-art.mjs`: passed.
- `npm test`: passed — 8 files, 60 tests.
- Missing-artwork manual rename check was attempted twice but Windows returned `EPERM` for renaming the active `artwork/` directory; the directory remained intact and no backup was left behind.
