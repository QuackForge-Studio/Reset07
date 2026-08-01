# RESET//07

A top-down neon science-fiction action game set in a city trapped inside a repeating
seven-minute time loop. This repository contains the **brand system, UI kit, and internal
guidelines** for the project.

## Quick start

```bash
npm install
npm run dev        # dev server → http://localhost:5173/
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run generate:icons  # rebuild raster icons from the supplied vector
```

Dev routes (internal only — not part of the production game navigation):

- `/` — brand guidelines page (tokens, logo, typography, patterns, motion, usage rules)
- `/loading` — full loading screen demo
- `/title` — full title screen demo

The toolbar at the top simulates **reduced motion**, **low effects**, and **reduced flash**
modes for testing.

## Brand assets

The supplied logo files (PNG, from `logo/`) live in `public/brand/` with these
names:

| File | Role |
|---|---|
| `reset07-wordmark.png` | Primary full-color wordmark |
| `reset07-wordmark-white.png` | Monochrome white (dark backgrounds) |
| `reset07-wordmark-black.png` | Monochrome black (light backgrounds) |
| `reset07-wordmark-small.png` | Simplified wordmark (< 160 px) |
| `reset07-icon.png` | Standalone icon |

After replacing an asset, run `npm run generate:icons` to rebuild `public/icons/`
(16–512 px PNGs, maskable 512, `favicon.ico`) — the manifest and `index.html`
pick them up automatically.

Full documentation: **[`docs/brand-guidelines.md`](docs/brand-guidelines.md)** (concept,
color tokens, typography, lockups, clear space, minimum sizes, icon pipeline, patterns,
motion, accessibility, correct/incorrect usage).

## Stack

- React 18 + TypeScript + Vite (`base: './'` — portable to sub-directory hosting)
- Zero runtime UI dependencies — motion is pure CSS/Web Animations; routing is a
  dependency-free hash-free pathname router
- Fonts bundled locally via `@fontsource` (OFL): Chakra Petch (display),
  Be Vietnam Pro (UI, full Vietnamese support), IBM Plex Mono (data)
- `sharp` (dev-only) powers the icon raster pipeline

## Structure

```text
src/
  brand/        brand kit: tokens, components, patterns, motion, layouts, styles, docs
  game/         screens (Loading, Title) + HUD primitives (rings, timer, chips)
  guidelines/   internal brand-guidelines dev page
public/brand/   supplied logo assets (currently placeholders)
public/icons/   generated rasters (gitignored — run generate:icons)
docs/           brand-guidelines.md
scripts/        generate-icons.mjs
```

## PWA

`public/manifest.webmanifest` + icons are wired in `index.html`. A service worker is a
game-infrastructure concern and intentionally out of scope for the brand kit.
