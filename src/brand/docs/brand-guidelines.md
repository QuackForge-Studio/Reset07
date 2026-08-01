# RESET//07 — Brand Guidelines (internal)

Short developer copy. The complete reference lives at
[`docs/brand-guidelines.md`](../../../docs/brand-guidelines.md) — read that first.

## Quick rules

1. **The logo is supplied, never invented.** `public/brand/` currently holds clearly
   labeled temporary placeholders. Replace them with the real assets; every component,
   pattern, favicon and template picks them up automatically.
2. **Tokens only.** Never repeat raw hex values. Use the CSS custom properties in
   `src/brand/styles/brand-tokens.css` or the TS mirrors in `src/brand/tokens/`.
3. **Three typography roles.** Display = Chakra Petch · UI = Be Vietnam Pro ·
   Data = IBM Plex Mono (monospace is selective — never for long dialogue).
4. **Motion is mechanical.** Fast, precise, controlled. No random glitch, no rubbery
   bounce, no loops. Reduced motion is pure CSS (`prefers-reduced-motion: reduce`).
5. **The logo intro** (2.4 s, `AnimatedBrandLogo`) animates only masks, clips, opacity
   and supporting lines — it resolves into the completely static supplied logo.
6. **Clear space** = half the `0` width around the wordmark; a quarter of the icon
   diameter around the icon. Minimums: wordmark 120 px, simplified 72 px, icon 16 px.
7. **Never** stretch, rotate, recolor, retype, glow, frame, or spin the logo as a
   generic loading spinner.

## Replacing placeholder assets

```bash
# 1. drop supplied files into public/brand/ with the exact names from the inventory
# 2. rebuild rasters
npm run generate:icons
# 3. verify on the guidelines page
npm run dev   # open http://localhost:5173/
```

See the Asset inventory in `docs/brand-guidelines.md` for the exact file names.
