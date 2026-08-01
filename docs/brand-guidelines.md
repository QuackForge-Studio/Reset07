# RESET//07 — Brand Guidelines

> A city trapped inside a repeating seven-minute time loop.
> The identity behaves like a failing city-control interface: precise, urgent, quietly broken.

**Status:** the core logo and icon are **supplied** (PNG, sourced from `logo/`). Files in
`public/brand/` are the real brand assets — never redraw, recolor, or retype them.
See [Asset inventory](#2-asset-inventory).

---

## 1. Brand concept

RESET//07 is a top-down neon science-fiction action game. The identity must communicate:

| Concept | Design consequence |
|---|---|
| Repetition | Seven-part divisions, segmented countdown rings, loop phases |
| Countdown pressure | Data typography, ticking timers, Reactor Orange urgency |
| Memory persistence | One cyan node surviving every reset (Memory Trace) |
| Emergency systems | Warning bars, segmented borders, slash interruptions |
| Time-loop instability | Broken circular loops, partial arcs |
| Controlled destruction | Sharp geometry, restrained color, mechanical motion |
| System corruption | Magenta, used sparingly and deliberately |
| Precision | Grids, alignment markers, tabular numerals |
| Mystery | Generous negative space, sparse text |
| High-impact arcade action | Big type contrast, fast snap easing |

**It must never resemble:** a SaaS dashboard, a cyber-security service, a cryptocurrency
project, an esports team, a generic hacker interface, a cheap mobile game, or a noisy retro
cyberpunk template.

---

## 2. Asset inventory

All logo assets are the **supplied files** — never redraw, retype, or recreate them.

| File | Path | Role |
|---|---|---|
| `reset07-wordmark.png` | `public/brand/` | Full-color primary wordmark |
| `reset07-wordmark-white.png` | `public/brand/` | Monochrome white — dark backgrounds |
| `reset07-wordmark-black.png` | `public/brand/` | Monochrome black — light backgrounds |
| `reset07-wordmark-small.png` | `public/brand/` | Simplified wordmark below ~160 px |
| `reset07-icon.png` | `public/brand/` | Standalone icon (favicon, PWA, avatar) |

Runtime paths are centralized in `src/brand/assets.ts` (`BRAND_ASSET_PATHS`) and are
base-relative, so the game works from sub-directories (itch.io, CDNs, GitHub Pages).

### Replacing an asset

1. Drop the supplied file into `public/brand/` **with the exact name above** (source copies
   live in `logo/`).
2. Run `npm run generate:icons` to rebuild `public/icons/` + `favicon.ico`.
3. Run `npm run dev` and verify the guidelines page (root route) shows the new asset
   everywhere it appears.
4. If a file is temporarily missing: keep a clearly labeled stub, keep the component
   structure, document the missing file in this document (Asset inventory table) and in the
   README.
5. Never ship a placeholder as the final result. Never invent a replacement logo.

---

## 3. Color system

### Core palette (spec-defined — do not edit)

| Token | Value | Use |
|---|---|---|
| `--color-core-black` | `#070A0F` | Primary backgrounds, loading screens, cinematic title cards |
| `--color-deep-navy` | `#101826` | Secondary panels, menus, cards, raised UI surfaces |
| `--color-emergency-cyan` | `#38E8FF` | Navigation, active controls, player energy, memory, selected states |
| `--color-reactor-orange` | `#FF6A1A` | Explosions, critical warnings, countdown urgency, destructive actions |
| `--color-corruption-magenta` | `#FF3D9A` | System corruption, unstable memory, hidden narrative — sparingly |
| `--color-signal-white` | `#F4F8FF` | Primary text, high-contrast labels, essential information |

### Semantic tokens (derived — never add unrelated colors)

`--color-background-primary` · `--color-background-secondary` · `--color-surface` ·
`--color-surface-hover` · `--color-text-primary` · `--color-text-secondary` ·
`--color-text-muted` · `--color-border-subtle` · `--color-border-active` ·
`--color-action-primary` · `--color-action-danger` · `--color-signal-memory` ·
`--color-signal-corruption` · `--color-signal-warning` · `--color-signal-success` ·
`--color-overlay-dark` · `--color-focus-ring`

Source of truth: `src/brand/styles/brand-tokens.css`. TS mirror: `src/brand/tokens/colors.ts`.

### Gradient discipline

Allowed **only** for background depth, energy pulses, explosion illumination and corruption
transitions. No large rainbow gradients. **The logo itself must never require a gradient.**

---

## 4. Typography

Three roles. All fonts are OFL-licensed and bundled locally via `@fontsource` — no runtime
network requests. All three support Vietnamese.

| Role | Font | Weights | Use |
|---|---|---|---|
| Display | **Chakra Petch** | 500/600/700 | Game title frames, chapter headings, ending titles, trailer cards, major countdowns |
| UI | **Be Vietnam Pro** | 400/500/600/700 | Menus, settings, dialogue, objectives, buttons, mobile UI, accessibility text |
| Data | **IBM Plex Mono** | 400/500/600 | Countdown timer, system logs, diagnostics, memory IDs, technical values |

Chakra Petch won the display evaluation over Oxanium / Sora / Space Grotesk / Rajdhani /
Michroma: its angular technical cuts carry arcade urgency without imitating the custom logo.

### Type scale (responsive, `clamp()`)

Display XL `clamp(2.75rem, 9vw, 7.5rem)` · Display L `clamp(2.25rem, 6vw, 4.5rem)` ·
Heading 1/2/3 · Body L/M/S (65ch max) · Label (uppercase, 0.14em) · Caption ·
Data XL `clamp(2rem, 6vw, 4.5rem)` · Data M · Data S.

Essential mobile text never drops below `0.875rem`. Monospace is never used for long
dialogue. Full scale: `src/brand/styles/typography.css` + `src/brand/tokens/typography.ts`.

---

## 5. Logo variants & lockups

| Variant | Component | When |
|---|---|---|
| `primary` | `<BrandLogo variant="primary" />` | Default wordmark on dark |
| `white` | `<BrandLogo variant="white" />` | Always on Core Black/Deep Navy |
| `black` | `<BrandLogo variant="black" />` | Light backgrounds only |
| `small` | `<BrandLogo variant="small" />` | Below ~160 px width |
| `icon` | `<BrandIcon />` | Favicon, PWA, avatar, compact loading |

Lockups (`<BrandLockup />`):

- **Horizontal** — desktop title screen, website nav, trailer end card, wide store banners, credits.
- **Stacked** — portrait mobile title, square social art, narrow panels, mobile loading.
- **Icon-only** — favicon, PWA, avatar, launcher, compact loading indicator, small HUD branding.

Lockups are pure layout composition. **Never alter the internal geometry of the wordmark**
to force a layout; the asset is never stretched, compressed, rotated, recolored or retyped.

---

## 6. Clear space & minimum sizes

- **Wordmark clear space:** at least **half the visual width of the `0` in `07`** on every side.
- **Icon clear space:** at least **one quarter of the icon diameter**.
- No buttons, borders, text, particles, HUD elements or screen edges may enter the protected area.

| Minimum | Value |
|---|---|
| Full wordmark (screen) | 120 px wide |
| Simplified wordmark | 72 px wide |
| Standalone icon | 16 px |
| Printed wordmark | 30 mm wide |

At small sizes: disable glow, particles, secondary lines and complex animation; use the
simplified asset; increase contrast. At favicon size use the icon **only**.

---

## 7. Icon exports

Generated from the supplied vector by `npm run generate:icons` (script:
`scripts/generate-icons.mjs`, uses `sharp`).

| Output | Path | Purpose |
|---|---|---|
| `icon-16/32/48.png` | `public/icons/` | Favicon fallbacks |
| `icon-180.png` | `public/icons/` | Apple touch icon |
| `icon-192/512.png` | `public/icons/` | PWA manifest icons |
| `icon-256/384.png` | `public/icons/` | Store / launcher art |
| `icon-512-maskable.png` | `public/icons/` | PWA maskable — Core Black background, 60 % safe zone, never crops geometry, no permanent rounded-square frame |
| `favicon.ico` | `public/` | Legacy browsers (16/32/48 embedded) |

`index.html` + `public/manifest.webmanifest` reference these automatically.

---

## 8. Graphic shape language & patterns

Build the system from: segmented countdown rings, seven-part divisions, broken circular
loops, clean diagonal slash marks, short horizontal timing lines, compact system nodes,
partial radial pulses, cropped system codes, emergency-state frames, controlled alignment
markers.

**Never use:** random triangles, random hex dumps, large binary blocks, dense circuit
patterns, excessive HUD decoration, generic hacker graphics, random glitch textures.

Four reusable procedural patterns (CSS + SVG — no raster backgrounds):

| Pattern | Component | Use |
|---|---|---|
| Countdown Grid | `<CountdownGrid />` | Menu backdrops, settings, pause overlays |
| Reset Rings | `<ResetRings />` | Title screen, loading, chapter transitions |
| Memory Trace | `<MemoryTrace />` | Loading screens, dialogue backdrops |
| Critical State | `<CriticalState />` | Warning states, danger zones — Reactor Orange only |

Patterns are subtle, scale responsively, freeze under `html[data-effects="low"]`, and stop
animating under `prefers-reduced-motion`.

---

## 9. Motion identity

Fast, precise, mechanical, controlled — **never randomly glitchy**.

| Token | Value | Spec |
|---|---|---|
| `--dur-micro` | 100 ms | 80–140 ms micro interactions |
| `--dur-button` | 150 ms | 120–180 ms button states |
| `--dur-panel` | 220 ms | 180–280 ms panel transitions |
| `--dur-reset` | 700 ms | 500–900 ms major reset transitions |
| `--dur-logo` | 2400 ms | 2–3 s logo intro |

Easings: `--ease-out-expo` `cubic-bezier(0.16,1,0.3,1)` · `--ease-out-quart` · `--ease-in-out-quart` ·
`--ease-snap` · `--ease-linear`.

Vocabulary: segment assembly · timeline interruption · radial pulse · short reconstruction ·
countdown tick · controlled scan · sharp state change · brief warning flash.
Avoid: constant shaking, random jitter, long glitch effects, excessive bounce, rubbery
movement, large mobile parallax, unnecessary loops.

### Logo intro (2.4 s)

1. Thin segmented countdown ring appears.
2. Seven segments progress toward zero (~120 ms per tick).
3. The `//` motif interrupts the ring; the ring retracts.
4. The supplied wordmark reveals through a clean clip mask.
5. One cyan pulse travels across the logo.
6. One brief Reactor Orange warning accent (off with reduced flash).
7. Resolves into the **completely static** supplied logo.

The logo is never redrawn or deformed — only masks, clips, opacity, translation, scale,
stroke progression and supporting lines animate. No heavy glow, no prolonged glitch.
**Reduced motion:** simple 200 ms fade; no ring, no flash, no movement (pure CSS
`@media (prefers-reduced-motion: reduce)`).

---

## 10. Screens

- **Loading screen** — Core Black, supplied icon **static** inside a segmented countdown
  ring (ring segments + sweep arc move, never the icon), status + percentage, Memory Trace,
  bottom-edge timing line. Portrait + landscape, safe-area insets.
- **Title screen** — supplied wordmark is the single focal point; generous empty space;
  subtle Reset Rings; one Reactor Orange accent; Emergency Cyan selection states;
  `New Loop` / `Continue` / `Settings`; fully keyboard-operable.
- **HUD** — the full logo is never permanently large in combat. Use countdown typography,
  segmented timer rings, cyan memory states, orange criticals, magenta corruption events,
  slash dividers, timing lines.

---

## 11. Social & store templates

Editable template components in `src/brand/layouts/SocialTemplates.tsx` (never baked rasters):

| Template | Aspect | Raster export | Use |
|---|---|---|---|
| `SocialAvatar` | 1:1 | 512 × 512 | Avatar, launcher |
| `SocialPost` | 1:1 | 1080 × 1080 | Announcements |
| `YouTubeThumbnail` | 16:9 | 1280 × 720 | YouTube / VOD |
| `TrailerTitleCard` | 16:9 | 1920 × 1080 | Trailer open/end |
| `VerticalCover` | 9:16 | 1080 × 1920 | Shorts, vertical art |
| `WebsiteBanner` | 4:1 | 1920 × 480 | Website hero |
| `StoreCapsule` | 3:4 | 600 × 800 | Store capsule |
| `PressHeader` | 3:1 | 1920 × 640 | Press kit |

---

## 12. Correct usage

- Maintain original proportions; render only from approved supplied files.
- Sufficient contrast (all AA pairs — see Color section).
- Preserve clear space.
- Use the simplified wordmark below ~160 px.
- Use monochrome variants when color reproduction is limited.
- The logo stays completely static after its intro animation.
- Displayed without visual obstruction (no particles or HUD over it).

## 13. Incorrect usage — never

Stretch · compress · rotate · redraw · retype with a stock font · change internal spacing ·
move `07` away from the title · replace the double slash · permanent rounded-square frame ·
thick glow · bevel · chrome · metallic or fire texture · random glitch noise · heavy
shadows · fill letters with imagery · place over noisy backgrounds · reduce contrast ·
unapproved colors · random per-letter animation · icon as an ordinary spinner · full
wordmark at favicon size.

---

## 14. Accessibility

- Contrast: every core pair ≥ 4.5:1 (verified AA; most are 7–18:1).
- Keyboard-visible focus: 2 px cyan ring, 3 px offset (`--color-focus-ring`).
- Reduced motion: pure CSS media query; logo intro → 200 ms fade.
- Flash control: single warning flashes only, never strobing; `data-flash="reduced"`
  (or `html[data-flash="reduced"]`) sets `--flash-opacity: 0`. Ambient pulses ≤ 0.25 Hz.
- No important state communicated by color alone: chips have labels, timers have text,
  rings have progress text (`role="timer"`, `aria-label`).
- Readable small-screen type (never below 0.875rem for essential text).
- Logo components accept accessible labels; decorative instances use `aria-hidden`.

---

## 15. Project structure

```text
src/
  brand/
    assets.ts                 asset path registry (supplied files)
    components/               BrandLogo, BrandIcon, BrandLockup,
                              AnimatedBrandLogo, LoadingBrandMark
    patterns/                 CountdownGrid, ResetRings, MemoryTrace, CriticalState
    layouts/                  social & store templates (editable)
    motion/                   brandMotion.ts, logoAnimation.ts
    tokens/                   colors.ts, typography.ts, spacing.ts, motion.ts
    styles/                   brand-tokens.css, typography.css, brand.css, patterns.css
    docs/                     brand-guidelines.md (short internal copy)
  game/
    screens/                  LoadingScreen, TitleScreen
    hud/                      SegmentedRing, CountdownTimer, StatusChip,
                              SlashDivider, TimingLine
  guidelines/                 internal brand-guidelines dev page (route /)
  styles/                     global stylesheet entry
docs/
  brand-guidelines.md         this document
public/brand/                 supplied logo assets (PNG, from logo/)
public/icons/                 generated rasters (npm run generate:icons)
scripts/generate-icons.mjs    raster pipeline (sharp)
```

Dev routes: `/` guidelines · `/loading` loading demo · `/title` title demo
(dev-only — not part of the production game navigation).
