# Deploy RESET//07 to Cloudflare Pages (git-triggered) + update Play buttons

Date: 2026-08-01

## Goal

Serve the RESET//07 game at `https://app.quackforge.io.vn/reset07/play`, deployed
automatically via git push to the `quackforge-app` GitHub repo (which Cloudflare
Pages already watches on branch `main`). Update the Play buttons/copy on the
QuackForge Studio site so visitors can play immediately.

## Verified context

- Cloudflare Pages project `quackforge-app` has Git integration **on** (branch
  `main`), domains: `quackforge-app.pages.dev` + `app.quackforge.io.vn`.
  Pushing to `github.com/QuackForge-Studio/quackforge-app` auto-deploys.
- `dist/` in quackforge-app is **gitignored** and `scripts/build.mjs` **wipes it
  every build**. So the game must be built *inside* the Pages build step.
- Game repo `github.com/QuackForge-Studio/Reset07.git` is public, has a
  lockfile, builds with `npm ci && npm run build` (output `dist/`).
- Game uses a tiny pathname router (`usePathname` in `src/App.tsx`) that matches
  `/play` exactly. Served at `/reset07/play`, the raw pathname is `/reset07/play`
  → needs a subpath-aware router.
- Game is `base: './'`, procedural textures, PWA SW registered relative
  (`./sw.js`) → subpath-safe already.
- `reset07.html` has a `Mở prototype` CTA (`/reset07/`) + copy "Prototype ·
  đang phát triển". No other page has a Play button for the game.

## Approach (chosen: A — clone game from GitHub inside the Pages build)

1. **Game router (`src/App.tsx`)**: make `usePathname` subpath-aware.
   - Detect a leading `/reset07` (or the active base from `location`), strip it,
     map `/reset07/play` → `/play`, `/reset07/` → `/`.
   - `navigate(to)` must re-add the base when pushing state, so in-page routing
     works under `/reset07/`.
   - `Toolbar` links keep working: they call `navigate('/')`, `/play`, etc.

2. **quackforge-app build**: add a step in `scripts/build.mjs` that:
   - Clones `github.com/QuackForge-Studio/Reset07.git` (shallow, into a temp
     dir), runs `npm ci && npm run build`, copies the output into
     `dist/reset07/`.
   - Adds `_redirects` entries so SPA fallback serves the game shell for
     `/reset07/play` deep links (and `/reset07/*`).

3. **reset07.html**: update the Play CTA:
   - `Mở prototype` → `Chơi ngay`, href `https://app.quackforge.io.vn/reset07/play`
     (keep `data-od-id`).
   - Update status copy `Prototype · đang phát triển` → `Playable demo · trên
     trình duyệt` (keep it honest: it's a playable prototype/demo).
   - Update feature card "Prototype chơi được" wording to match.

## Deploy flow

Push to `QuackForge-Studio/quackforge-app` (main) → Cloudflare Pages runs
`npm run build` (build.mjs) → clone+build latest game → deploy `dist/` to
`app.quackforge.io.vn`. Game repo updates are picked up on the next quackforge-app
build (no separate workflow needed).

## Verification

- `npm run typecheck` + `npm run build` in game repo pass after router change.
- `node scripts/build.mjs` in quackforge-app produces `dist/reset07/index.html`
  (game shell) and `_redirects` handles `/reset07/play`.
- Local preview: game reachable at `/reset07/play` and `/reset07/` (guidelines).
- `npm run smoke`/`smoke:narrow` still pass on the site.
