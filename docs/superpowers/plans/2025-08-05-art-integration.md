# Art Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 5 unused concept/background PNGs (~11 MB) into the game as compressed WebP backdrops (title, loading/reset, garage, memory board, endings), moving PNG sources out of `public/`.

**Architecture:** PNG sources move to repo-root `artwork/` (never shipped, mirroring `logo/` → `public/brand/`); a sharp-based script emits WebP into `public/art/` at identical dimensions. React UI layers reference the WebP through a BASE_URL-safe registry in `src/brand/assets.ts` (existing pattern). A new `loopReset` bus event + `LoopResetOverlay` component covers the reset interstitial; all backdrops are decorative CSS layers with token-based dark overlays.

**Tech Stack:** TypeScript + React 18 + Vite (`base: './'`), Phaser 3 (WorldScene emits the bus event), sharp (devDep, already used by generate-icons), Playwright (QA probes).

## Global Constraints

- Colors from `brand-tokens.css` variables only; rgba of core black values already used in `ui.css` (7,10,15 / 3,6,10) are acceptable precedent.
- Never change texgen canvas sizes; sprites stay PNG in `public/art/sprites/` (load-bearing).
- All new backdrops are decorative → `aria-hidden`/empty alt; the two content images get real `alt`.
- Static images are reduced-motion safe; the reset progress bar must disable under `html[data-motion='reduced']`.
- Asset URLs go through `import.meta.env.BASE_URL` (pattern in `src/brand/assets.ts`).
- Temporary QA probes under `scripts/probe-*.mjs`; delete after verification.

---

### Task 1: Art pipeline — move PNGs, write optimizer, emit WebP

**Files:**
- Move: `public/art/concept/{title-city,loading-loop,k07-portrait,boss-concept}.png` → `artwork/concept/`
- Move: `public/art/backgrounds/garage.png` → `artwork/backgrounds/`
- Create: `scripts/optimize-art.mjs`
- Modify: `package.json` (scripts), `ART-PROMPTS.md` (pipeline note)

**Interfaces:**
- Produces: `public/art/concept/*.webp`, `public/art/backgrounds/garage.webp` (same dimensions, quality 80), npm script `optimize:art`.

- [ ] **Step 1: Move PNG sources with git**

```bash
mkdir -p artwork/concept artwork/backgrounds
git mv public/art/concept/title-city.png artwork/concept/
git mv public/art/concept/loading-loop.png artwork/concept/
git mv public/art/concept/k07-portrait.png artwork/concept/
git mv public/art/concept/boss-concept.png artwork/concept/
git mv public/art/backgrounds/garage.png artwork/backgrounds/
```

- [ ] **Step 2: Write `scripts/optimize-art.mjs`**

```js
/**
 * RESET//07 — artwork → WebP pipeline.
 * Reads PNG sources from artwork/, writes quality-80 WebP at identical
 * dimensions into public/art/ under the same relative paths.
 * Run: npm run optimize:art
 */
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'artwork';
const OUT = 'public/art';

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.name.toLowerCase().endsWith('.png')) out.push(full);
  }
  return out;
}

const files = await walk(SRC);
if (files.length === 0) {
  console.error('No PNG sources found under artwork/');
  process.exit(1);
}
for (const f of files) {
  const rel = path.relative(SRC, f).replace(/\.png$/i, '.webp');
  const dest = path.join(OUT, rel);
  const img = sharp(f);
  const meta = await img.metadata();
  await sharp(f)
    .webp({ quality: 80 })
    .toFile(dest);
  const outMeta = await stat(dest);
  console.log(`${rel}: ${meta.width}x${meta.height} ${(outMeta.size / 1024).toFixed(0)} KB`);
}
console.log(`OK — ${files.length} WebP written to ${OUT}`);
```

- [ ] **Step 3: Add npm script**

In `package.json` scripts add: `"optimize:art": "node scripts/optimize-art.mjs"`.

- [ ] **Step 4: Run and verify**

Run: `npm run optimize:art`
Expected: 5 WebP files listed (1536×864 ×2, 512×512, 1024×1024, 1920×1080), total well under 3 MB. Verify: `ls public/art/concept public/art/backgrounds` shows only `.webp`; `artwork/` holds the 5 PNGs; `public/art/sprites/` untouched.

- [ ] **Step 5: Update `ART-PROMPTS.md`**

After the intro paragraph add:

```markdown
## Pipeline

- PNG output từ Antigravity lưu vào `artwork/` (đúng tên + thư mục con tương ứng).
- Pi chạy `npm run optimize:art` → WebP nén (~80% nhỏ hơn) vào `public/art/` (bản ship).
- Sprites giữ PNG trong `public/art/sprites/` (texture game, kích thước load-bearing).
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(art): PNG sources to artwork/, sharp optimizer emits WebP to public/art/"
```

---

### Task 2: Asset registry — extend `src/brand/assets.ts`

**Files:**
- Modify: `src/brand/assets.ts`

**Interfaces:**
- Produces: `artAssetPath(name: ArtAssetName): string` with `ArtAssetName = 'titleCity' | 'loadingLoop' | 'k07Portrait' | 'bossConcept' | 'garage'`.

- [ ] **Step 1: Add the art registry**

```ts
export const ART_ASSET_PATHS = {
  titleCity: `${BASE}art/concept/title-city.webp`,
  loadingLoop: `${BASE}art/concept/loading-loop.webp`,
  k07Portrait: `${BASE}art/concept/k07-portrait.webp`,
  bossConcept: `${BASE}art/concept/boss-concept.webp`,
  garage: `${BASE}art/backgrounds/garage.webp`,
} as const;

export type ArtAssetName = keyof typeof ART_ASSET_PATHS;

export const artAssetPath = (name: ArtAssetName): string => ART_ASSET_PATHS[name];
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck` — must pass with zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/brand/assets.ts
git commit -m "feat(brand): art asset registry (BASE_URL-safe WebP paths)"
```

---

### Task 3: Title screen backdrop (`title-city.webp`)

**Files:**
- Modify: `src/play/ui/TitleScreen.tsx` (bg block, lines ~20-26)
- Modify: `src/play/ui/ui.css` (after `.title-screen__bg`, line ~175)

**Interfaces:**
- Consumes: `artAssetPath('titleCity')` from Task 2.

- [ ] **Step 1: Add the art layer as the first child of `__bg`**

```tsx
<div className="title-screen__bg">
  <div className="title-screen__art" aria-hidden style={{ backgroundImage: `url(${artAssetPath('titleCity')})` }} />
  <div className="title-screen__grad" />
  {/* existing children unchanged */}
```

Add import: `import { artAssetPath } from '../../brand/assets';`

- [ ] **Step 2: CSS — art layer + top-center readability overlay**

```css
.title-screen__art {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
/* dark zone behind logo+menu (art prompt: "vertical space at top-center darker") */
.title-screen__art::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(90% 55% at 50% 28%, rgba(7, 10, 15, 0.82) 0%, rgba(7, 10, 15, 0.45) 55%, transparent 100%),
    linear-gradient(180deg, rgba(7, 10, 15, 0.5) 0%, transparent 38%);
}
```

- [ ] **Step 3: Verify visually**

Run dev server, open `/play`, screenshot title. Menu + logo readable over art; `title-screen__grad/__city` patterns still visible. (Playwright probe exists in Task 9 — a quick manual screenshot is fine here.)

- [ ] **Step 4: Commit**

```bash
git add src/play/ui/TitleScreen.tsx src/play/ui/ui.css
git commit -m "feat(play): title-city backdrop on in-game title screen"
```

---

### Task 4: `/loading` demo backdrop (`loading-loop.webp`)

**Files:**
- Modify: `src/game/screens/LoadingScreen.tsx` (wrapper div, line ~29)
- Modify: `src/game/screens/screens.css` (after `.loading-screen`, line ~7)

**Interfaces:**
- Consumes: `artAssetPath('loadingLoop')`.

- [ ] **Step 1: Art layer inside `.loading-screen` (first child)**

```tsx
<div className={['loading-screen', className].filter(Boolean).join(' ')}>
  <div className="loading-screen__art" aria-hidden style={{ backgroundImage: `url(${artAssetPath('loadingLoop')})` }} />
  <MemoryTrace opacity={0.3} className="loading-screen__trace" />
  {/* rest unchanged */}
```

Import: `import { artAssetPath } from '../../brand/assets';`

- [ ] **Step 2: CSS — cover layer + center darkening (progress bar zone) + stacking**

```css
.loading-screen__art {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.loading-screen__art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(75% 60% at 50% 50%, rgba(7, 10, 15, 0.66) 0%, rgba(7, 10, 15, 0.25) 60%, transparent 100%);
}
/* keep existing content above the art layer */
.loading-screen__bar, .loading-screen__center, .loading-screen__foot { position: relative; z-index: 1; }
```

- [ ] **Step 3: Verify**

Open `/loading` in dev; art visible behind the ring/status, text readable.

- [ ] **Step 4: Commit**

```bash
git add src/game/screens/LoadingScreen.tsx src/game/screens/screens.css
git commit -m "feat(game): loading-loop backdrop on /loading demo"
```

---

### Task 5: Loop-reset overlay — bus event, Phaser emit, React overlay

**Files:**
- Modify: `src/play/bridge.ts` (`BusEventMap`, line ~63)
- Modify: `src/play/scenes/WorldScene.ts` (`finishReset()`, line ~780)
- Create: `src/play/ui/LoopResetOverlay.tsx`
- Modify: `src/play/ui/GameShell.tsx` (Overlay type line 30, bus wiring ~line 158, render block ~line 226)
- Modify: `src/play/ui/ui.css`

**Interfaces:**
- Produces: bus event `loopReset: undefined` (emitted from `finishReset()` — the single funnel for death AND timeout resets; endings never call it, verified: only `updateReset` lines 748/775 call `finishReset`).
- Produces: `<LoopResetOverlay onDone={() => void} />` — auto-dismisses after 1400 ms.
- Consumes: `artAssetPath('loadingLoop')`.

- [ ] **Step 1: bridge.ts — add the event**

```ts
type BusEventMap = {
  ...
  loopReset: undefined;
  ...
};
```

- [ ] **Step 2: WorldScene — emit at the top of `finishReset()`**

```ts
private finishReset(): void {
  bus.emit('loopReset', undefined);
  this.save.stats.kills += this.stats.kills;
  ...
```

- [ ] **Step 3: Create `LoopResetOverlay.tsx`**

```tsx
import { useEffect } from 'react';
import { artAssetPath } from '../../brand/assets';

interface Props {
  onDone: () => void;
}

/**
 * RESET//07 — loop-reset interstitial: the street art + a CSS progress bar
 * ("REINITIALIZING CITY GRID"), shown after the Phaser white-out and before
 * the garage. Static art is reduced-motion safe; the bar animation is
 * disabled under html[data-motion='reduced'].
 */
export function LoopResetOverlay({ onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div className="loop-reset" role="status" aria-label="Loop reset">
      <div className="loop-reset__art" aria-hidden style={{ backgroundImage: `url(${artAssetPath('loadingLoop')})` }} />
      <div className="loop-reset__body">
        <span className="type-data-xs text-muted loop-reset__kicker">CITY RESET PROTOCOL</span>
        <span className="type-display loop-reset__title">REINITIALIZING CITY GRID</span>
        <div className="loop-reset__bar" aria-hidden>
          <span className="loop-reset__bar-fill" />
        </div>
        <span className="type-data-s text-secondary loop-reset__timer">NEXT LOOP IN 07:00</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: GameShell — overlay state + wiring**

```tsx
type Overlay = 'none' | 'title' | 'garage' | 'paused' | 'settings' | 'memory' | 'howto' | 'credits' | 'reset';
```

In the bus-wiring effect:

```tsx
const resetPendingRef = useRef(false);
...
bus.on('loopReset', () => {
  resetPendingRef.current = true;
  setOv('reset');
}),
bus.on('loopEnd', (p) => {
  setLoopEndData(p);
  // if the reset overlay is up, its onDone lands on the garage
  if (!resetPendingRef.current) setOv('garage');
}),
```

Render block (before the garage block):

```tsx
{overlay === 'reset' && (
  <LoopResetOverlay
    onDone={() => {
      resetPendingRef.current = false;
      setOv('garage');
    }}
  />
)}
```

Import: `import { LoopResetOverlay } from './LoopResetOverlay';` — and declare `const resetPendingRef = useRef(false);` next to the other refs.

- [ ] **Step 5: CSS**

```css
.loop-reset {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  overflow: hidden;
  animation: loop-reset-in 0.3s var(--ease-out-quart);
}
@keyframes loop-reset-in { from { opacity: 0; } }
html[data-motion='reduced'] .loop-reset { animation: none; }
.loop-reset__art {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.loop-reset__art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(7, 10, 15, 0.72) 0%, rgba(7, 10, 15, 0.35) 50%, rgba(7, 10, 15, 0.8) 100%);
}
.loop-reset__body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  padding: 0 24px;
  max-width: 560px;
}
.loop-reset__title { margin: 0; }
.loop-reset__bar {
  width: min(320px, 70vw);
  height: 4px;
  background: rgba(56, 232, 255, 0.15);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
}
.loop-reset__bar-fill {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--color-emergency-cyan);
  box-shadow: var(--glow-cyan);
  transform-origin: left;
  animation: loop-reset-fill 1.3s linear forwards;
}
@keyframes loop-reset-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
html[data-motion='reduced'] .loop-reset__bar-fill { animation: none; transform: none; }
```

- [ ] **Step 6: Verify**

`npm run typecheck` + `npm test`. Manual/Playwright: force a reset (run a loop to 00:00 or die) → white-out → street-art overlay + bar → garage. Verify HUD hidden during overlay, no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/play/bridge.ts src/play/scenes/WorldScene.ts src/play/ui/LoopResetOverlay.tsx src/play/ui/GameShell.tsx src/play/ui/ui.css
git commit -m "feat(play): loop-reset interstitial with loading-loop art + progress bar"
```

---

### Task 6: Garage backdrop (`garage.webp`)

**Files:**
- Modify: `src/play/ui/GarageScreen.tsx` (backdrop div, line ~37)
- Modify: `src/play/ui/ui.css`

**Interfaces:**
- Consumes: `artAssetPath('garage')`.

- [ ] **Step 1: Backdrop art layer**

```tsx
<div className="modal-backdrop">
  <div className="modal-backdrop__art" aria-hidden style={{ backgroundImage: `url(${artAssetPath('garage')})` }} />
  <div className="modal panel garage">
```

Import: `import { artAssetPath } from '../../brand/assets';`

- [ ] **Step 2: CSS**

```css
.modal-backdrop__art {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: saturate(0.8);
}
.modal-backdrop__art::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(7, 10, 15, 0.55);
}
.modal-backdrop .panel { position: relative; }
```

- [ ] **Step 3: Verify**

End a loop (or die) in dev → garage shows over the garage art, panel fully readable.

- [ ] **Step 4: Commit**

```bash
git add src/play/ui/GarageScreen.tsx src/play/ui/ui.css
git commit -m "feat(play): garage backdrop art behind loop summary"
```

---

### Task 7: MemoryBoard K-07 avatar

**Files:**
- Modify: `src/play/ui/MemoryBoard.tsx` (head block, lines ~60-65)
- Modify: `src/play/ui/ui.css` (`.memory-board__head`, line ~775)

**Interfaces:**
- Consumes: `artAssetPath('k07Portrait')`.

- [ ] **Step 1: Avatar + title wrapper**

```tsx
<div className="memory-board__head">
  <img className="memory-board__avatar" src={artAssetPath('k07Portrait')} alt="" aria-hidden />
  <div className="memory-board__head-text">
    <h2 className="type-display">MEMORY BOARD</h2>
    <span className="type-data-xs text-muted">
      {save.memories.length}/{MEMORIES.length} FRAGMENTS — PERSISTENT ACROSS LOOPS
    </span>
  </div>
</div>
```

Import: `import { artAssetPath } from '../../brand/assets';`

- [ ] **Step 2: CSS**

```css
.memory-board__head { flex-direction: row; align-items: center; gap: 14px; }
.memory-board__head-text { display: flex; flex-direction: column; gap: 4px; }
.memory-board__avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--color-border-active);
  box-shadow: var(--glow-cyan);
}
```

- [ ] **Step 3: Verify + commit**

Open MemoryBoard from garage in dev; avatar renders round, no layout shift. Then:

```bash
git add src/play/ui/MemoryBoard.tsx src/play/ui/ui.css
git commit -m "feat(play): K-07 portrait avatar on memory board"
```

---

### Task 8: Ending screens — portrait, boss art, decision backdrop

**Files:**
- Modify: `src/play/ui/EndingScreen.tsx` (decision modal backdrop ~line 47; EndingScreen panel ~line 124)
- Modify: `src/play/ui/ui.css` (`.ending` block ~line 898)

**Interfaces:**
- Consumes: `artAssetPath('bossConcept')`, `artAssetPath('k07Portrait')`.

- [ ] **Step 1: Decision modal backdrop**

```tsx
<div className="modal-backdrop">
  <div className="modal-backdrop__art" aria-hidden style={{ backgroundImage: `url(${artAssetPath('bossConcept')})` }} />
  <div className="modal panel decision">
```

- [ ] **Step 2: EndingScreen art + 2-column grid**

```tsx
export function EndingScreen({ id, save, onContinue, onTitle }: Props) {
  const e = EPILOGUES[id];
  const art = id === 'break' ? artAssetPath('bossConcept') : artAssetPath('k07Portrait');
  const alt = id === 'break' ? 'The core guardian — decommissioned' : 'K-07 — continuity keeper';
  return (
    <div className="modal-backdrop">
      <div className={`modal panel ending ending--${e.accent}`}>
        <span className="type-data-xs text-muted">MEMORY ARCHIVE — FINAL ENTRY</span>
        <h2 className="type-display ending__title">{e.title}</h2>
        <div className="ending__sub type-display-s">{e.sub}</div>
        <div className="ending__grid">
          <img className="ending__art" src={art} alt={alt} />
          <div className="ending__body">
            {e.body.map((p, i) => (
              <p key={i} className="type-ui-s text-secondary">{p}</p>
            ))}
          </div>
        </div>
        {/* stats + actions unchanged */}
```

Import: `import { artAssetPath } from '../../brand/assets';`

- [ ] **Step 3: CSS**

```css
.ending__grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}
.ending__art {
  width: 100%;
  border: 1px solid var(--color-border-subtle);
  box-shadow: var(--shadow-md);
}
.ending__body { display: flex; flex-direction: column; gap: 10px; }
@media (max-width: 560px) {
  .ending__grid { grid-template-columns: 1fr; }
  .ending__art { max-width: 220px; }
}
```

(Existing `.ending__body` rule at line 906 stays; the duplicate selector is fine — keep the grid rule next to it.)

- [ ] **Step 4: Verify + commit**

Reach the boss decision in dev → backdrop visible behind the panel; pick each ending → preserve/release show portrait, break shows boss art, stacks on narrow. Then:

```bash
git add src/play/ui/EndingScreen.tsx src/play/ui/ui.css
git commit -m "feat(play): ending screens with K-07 portrait / boss concept art"
```

---

### Task 9: Full verification + QA probe + cleanup

**Files:**
- Create: `scripts/probe-art.mjs` (temporary — delete after this task)
- Modify: `TRACKING.md`

- [ ] **Step 1: Static checks**

Run: `npm run typecheck` → clean; `npm test` → 60 pass; `npm run build` → success.

Check `dist/` after build: `du -sh dist/art` ≈ ≤ 3 MB; no `.png` under `dist/art/concept` or `dist/art/backgrounds`.

- [ ] **Step 2: Playwright probe (`scripts/probe-art.mjs`)**

Pattern from `scripts/probe-smoke2.mjs` (system Chrome, `localhost:5199`): open `/play` → title screenshot (art visible); start loop → force a reset via `__r07.scene.startResetSequence()` → screenshot at ~700 ms (overlay + bar), then wait for garage (backdrop art); open memory board (avatar); kill boss path is long — instead verify decision modal + endings via `__r07.scene` calls if reachable, else assert via direct component render checks on `/play` overlays (`endingDecision` state set through the debug hook is not exposed — acceptable: verify decision backdrop + both ending arts by screenshotting after `api.chooseEnding` when the ending sequence is scriptable, otherwise manual). Screenshots to `qa-shots/art-*.png`; zero console errors required.

- [ ] **Step 3: Regression**

Run: `npm run dev -- --port 5199` + `npm run smoke` + `npm run smoke:narrow` — zero console/page errors.

- [ ] **Step 4: Update `TRACKING.md`**

One line (newest on top): art integration landed — 5 WebP backdrops (title/loading+reset/garage/memory/endings), PNG sources in `artwork/`, `npm run optimize:art`, smoke-flash fix note already logged.

- [ ] **Step 5: Cleanup + final commit**

```bash
rm scripts/probe-art.mjs scripts/probe-smoke2.mjs
git add -A
git commit -m "feat(art): verify art integration (QA screenshots, dist size), remove temp probes"
```

## Self-review notes

- Spec coverage: pipeline (T1), registry (T2), title (T3), loading demo + reset overlay (T4/T5), portrait (T5 memory avatar in T7 + endings in T8), boss (T8), garage (T6), a11y/perf rules baked into each task, verification (T9). All spec sections mapped.
- Deviations from spec: registry lives in `src/brand/assets.ts` (shared with brand demos) instead of a new `src/play/artAssets.ts` — one BASE_URL pattern, fewer files.
- The reset overlay auto-dismisses to garage via `resetPendingRef` deferral because `loopEnd` fires 450 ms before the overlay finishes.
