# AGENTS.md — RESET//07 Brand Kit

Project memory for coding agents. Loaded automatically at the start of every session. Keep this file terse — see Maintenance protocol at the bottom.

## Project

- Digital brand system + internal guidelines site for **RESET//07**, a top-down neon sci-fi action game in a city trapped in a repeating 7-minute loop.
- Stack: React 18 + TypeScript + Vite (`base: './'`, target es2019). **No runtime UI dependencies** — all motion is pure CSS; fonts bundled via @fontsource (Chakra Petch, Be Vietnam Pro, IBM Plex Mono).
- Routes: `/` brand guidelines (internal), `/title` title screen demo, `/loading` loading screen demo.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run dev -- --port 5199` | Dev server on the port the smoke scripts expect |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | typecheck + `vite build` |
| `npm run preview` | Preview the production build |
| `npm run generate:icons` | Regenerate PNG favicon set, maskable icon, favicon.ico/svg (`scripts/generate-icons.mjs`, needs `sharp`) |
| `npm run smoke` | Playwright smoke test (desktop 1500px + mobile 390px) against `localhost:5199` |
| `npm run smoke:narrow` | 320px horizontal-overflow check against `localhost:5199` |

Playwright uses system Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (no bundled browser).

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
- Do **not** log transient detail (one-off bug fixes, session trivia).
- If the user asks to refresh/update project memory, load the project skill `maintain-project-memory` and follow it.
