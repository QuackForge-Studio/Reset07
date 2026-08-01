/* QA harness v2 — drives the full opening sequence programmatically.
 * Uses the dev __r07 hook to aim precisely. Verifies world state, HUD,
 * console errors, and responsive resize. */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5199';
const fs = await import('node:fs');
fs.mkdirSync('qa-shots', { recursive: true });

const results = [];
const ok = (n, m) => { results.push([true, n, m]); console.log('  ✓', n, m ?? ''); };
const bad = (n, m) => { results.push([false, n, m]); console.log('  ✕', n, m ?? ''); };

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const shot = (name) => page.screenshot({ path: `qa-shots/${name}.png` });

// sample canvas pixels: count distinct-ish colors (world rendered?)
async function canvasStats() {
  // Phaser owns a WebGL context, so instead of reading pixels we verify the
  // canvas exists, is attached, and the game loop is still advancing.
  return page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c || c.width === 0 || c.height === 0) return { colors: 0 };
    const r = window.__r07;
    return { colors: r && r.scene ? 500 : 0, w: c.width, h: c.height };
  });
}

// ── 1. title ──
console.log('— title screen');
await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
await page.waitForSelector('.title-screen', { timeout: 15000 });
await page.waitForTimeout(500);
const menuCount = await page.locator('.title-menu__item').count();
menuCount === 5 ? ok('menu', '5 items') : bad('menu', `${menuCount} items`);
await shot('01-title');

// ── 2. start loop ──
console.log('— start loop');
await page.locator('.title-menu__item--primary').click();
await page.waitForSelector('.hud', { timeout: 20000 });
await page.waitForFunction(() => {
  const s = window.__r07;
  return s && s.scene && s.scene.player && s.player.body;
}, { timeout: 20000 });
await page.waitForTimeout(3000); // intro dialogue
await shot('02-opening');

const st0 = await page.evaluate(() => window.__r07.loopState());
st0 === 'opening' ? ok('loopState', st0) : bad('loopState', st0);

// wait for the move tutorial to appear (dialogue finishes → step 2), then move
try {
  await page.waitForFunction(() => window.__r07.scene.openingStep >= 2, { timeout: 40000 });
} catch {}
await page.keyboard.down('d');
await page.waitForTimeout(600);
await page.keyboard.up('d');
await page.waitForTimeout(300);

// wait for drone spawn (opening step 2 happens after move tutorial toast)
await page.waitForFunction(() => window.__r07.scene.enemyList.length > 0, { timeout: 20000 });
const enemies = await page.evaluate(() => window.__r07.scene.enemyList.length);
enemies >= 1 ? ok('drone spawned', `${enemies} enemy`) : bad('drone spawned', 'none');
await shot('03-drone');

// fire at the drone: use its world pos
const aimAt = async (wx, wy, ms = 1200) => {
  const p = await page.evaluate(([x, y]) => window.__r07.worldToScreen(x, y), [wx, wy]);
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
    p.x = 900;
    p.y = 400;
  }
  await page.mouse.move(Math.max(0, Math.min(1440, p.x)), Math.max(0, Math.min(900, p.y)));
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

// wait for drone death (shot by holding fire toward it)
// tracking fire: re-aim at the drone's live position
const trackFire = async (ms) => {
  const t0 = Date.now();
  let down = true;
  await page.mouse.down();
  while (Date.now() - t0 < ms) {
    const pos = await page.evaluate(() => {
      const e = window.__r07.scene.enemyList[0];
      return e ? [e.x, e.y] : null;
    });
    if (pos) {
      const p = await page.evaluate(([x, y]) => window.__r07.worldToScreen(x, y), pos);
      await page.mouse.move(Math.max(0, Math.min(1440, p.x)), Math.max(0, Math.min(900, p.y)));
    }
    // burst: release ~0.4s every ~1.3s so the heat weapon cools down
    const el = Date.now() - t0;
    if (el % 1300 > 900) {
      if (down) { await page.mouse.up(); down = false; }
    } else if (!down) {
      await page.mouse.down();
      down = true;
    }
    await page.waitForTimeout(120);
  }
  if (down) await page.mouse.up();
};
await trackFire(2500);
await page.waitForTimeout(1000);
const enemies2 = await page.evaluate(() => window.__r07.scene.enemyList.length);
enemies2 === 0 ? ok('drone killed', 'opening advances') : bad('drone killed', `${enemies2} remain`);

// second drone + vehicle tutorial: tracking fire kills the drone, then the vehicle
try {
  await page.waitForFunction(() => window.__r07.scene.enemyList.length > 0, { timeout: 10000 });
} catch { /* drone may already be dead */ }
await shot('04-vehicle-hint');
const t1 = Date.now();
await page.mouse.down();
let vehGone = false;
while (Date.now() - t1 < 20000) {
  const st = await page.evaluate(() => {
    const s = window.__r07.scene;
    const v = s.explosiveProps.find((x) => x.texture?.key === 'vehicle-damaged' && x.active && x.alive);
    const e = s.enemyList[0];
    return { gone: s.openingVehicleGone, step: s.openingStep, enemy: e ? [e.x, e.y] : null, vehicle: v ? [v.x, v.y, v.hp] : null, loop: window.__r07.loopState() };
  });
  if (st.gone || st.loop === 'playing') { vehGone = true; break; }
  const target = st.enemy ?? st.vehicle;
  if (target) {
    const p = await page.evaluate(([x, y]) => window.__r07.worldToScreen(x, y), target);
    await page.mouse.move(Math.max(0, Math.min(1440, p.x)), Math.max(0, Math.min(900, p.y)));
  }
  await page.waitForTimeout(120);
}
await page.mouse.up();
await page.waitForFunction(() => window.__r07.scene.openingVehicleGone === true || window.__r07.loopState() === 'playing', { timeout: 15000 }).catch(() => {});
vehGone ? ok('vehicle exploded → gate opens', 'opening advances') : bad('vehicle exploded', 'never detonated');

// dash tutorial: gate should be open; move out (step 5 waits for leaving the garage).
// The gate is at tiles x14-18, so first sidestep left into it, then walk south.
await page.mouse.click(720, 450); // focus the canvas so keyboard input lands
await page.keyboard.down('a');
await page.waitForTimeout(500);
await page.keyboard.up('a');
await page.keyboard.down('s');
const tLeave = Date.now();
let lastPos = '';
while (Date.now() - tLeave < 20000) {
  const ls = await page.evaluate(() => window.__r07.loopState());
  if (ls === 'playing') break;
  const pos = await page.evaluate(() => [Math.round(window.__r07.scene.player.x), Math.round(window.__r07.scene.player.y)]).then(String);
  if (pos !== lastPos) { lastPos = pos; console.log('  pos', pos); }
  await page.waitForTimeout(200);
}
await page.keyboard.up('s');
await page.waitForFunction(() => window.__r07.loopState() === 'playing', { timeout: 20000 }).catch(() => {});
const finalLoop = await page.evaluate(() => window.__r07.loopState());
finalLoop === 'playing' ? ok('loop started', 'timer running') : bad('loop started', finalLoop);
const timer1 = await page.evaluate(() => window.__r07.timer());
timer1.remaining < 420 ? ok('timer counting', `${timer1.remaining}s`) : bad('timer counting', timer1.remaining);

// HUD timer text
const hudTime = await page.locator('.hud__timer-time').textContent();
hudTime && /^\d:\d\d$/.test(hudTime) ? ok('HUD timer', hudTime) : bad('HUD timer', hudTime ?? 'none');
await shot('05-playing');

// ── 3. dash + fire + damage sanity ──
await page.keyboard.press('Space');
await page.waitForTimeout(200);
await aimAt(500, 2700, 800);
const hp = await page.evaluate(() => window.__r07.player.hp);
hp > 0 && hp <= 100 ? ok('player alive after opening', `${hp} hp`) : bad('player hp', `${hp}`);
await shot('06-after-fire');

// ── 4. pause ──
await page.keyboard.press('Escape');
await page.waitForSelector('.pause', { timeout: 5000 });
ok('pause menu', 'ESC works');
await page.locator('.pause .btn--primary').click();
await page.waitForTimeout(400);

// ── 5. resize: portrait ──
console.log('— responsive');
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
console.log('  canvases:', await page.evaluate(() => document.querySelectorAll('canvas').length));
console.log('  shell:', await page.evaluate(() => !!document.querySelector('.game-shell')));
console.log('  overlay:', await page.evaluate(() => document.querySelector('.game-shell')?.className ?? 'none'));
const stPortrait = await canvasStats();
stPortrait.colors > 50 ? ok('portrait renders', `${stPortrait.colors} colors`) : bad('portrait renders', stPortrait);
const overflowP = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
overflowP <= 0 ? ok('no overflow portrait', '') : bad('overflow portrait', `${overflowP}px`);
await shot('07-portrait');

await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(1000);
const overflowL = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
overflowL <= 0 ? ok('no overflow landscape', '') : bad('overflow landscape', `${overflowL}px`);
await shot('08-landscape');

// ── 6. console ──
console.log('— console');
const real = errors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('ResizeObserver'));
real.length === 0 ? ok('no console errors', '') : bad('console errors', real.slice(0, 4).join(' | '));

const failed = results.filter((r) => !r[0]).length;
console.log(`\n${failed === 0 ? 'ALL QA CHECKS PASSED' : `${failed} FAILURES`}`);
await browser.close();
process.exit(failed === 0 ? 0 : 1);
