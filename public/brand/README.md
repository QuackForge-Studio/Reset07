# RESET//07 — public brand assets

This directory holds the **supplied** brand assets (PNG, sourced from the
project's `logo/` folder). These are the real logo files — never replace,
redraw, or reinterpret them.

## Files

| File | Source (logo/) | Role |
|---|---|---|
| `reset07-wordmark.png` | `01_primary_wordmark.png` | Primary full-color wordmark |
| `reset07-wordmark-white.png` | `03_white_monochrome_wordmark.png` | Monochrome white wordmark (dark backgrounds) |
| `reset07-wordmark-black.png` | `04_black_monochrome_wordmark.png` | Monochrome black wordmark (light backgrounds) |
| `reset07-wordmark-small.png` | `05_simplified_small_size.png` | Simplified wordmark for < 160 px widths |
| `reset07-icon.png` | `02_standalone_icon.png` | Standalone icon (favicon, PWA, avatar, loading mark) |

## Regenerating derived icons

Run `npm run generate:icons` to rebuild `public/icons/` (PNG sizes + maskable
icon) and `public/favicon.ico` from `reset07-icon.png`.

> ⚠ Never invent or redraw the logo. If a file is missing, keep the pipeline
> working with a clearly labeled stub and document it in
> `docs/brand-guidelines.md`.
