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
  return page.evaluate(() => {
    const c = document.querySelector('.game-shell__canvas canvas');
    if (!c) return { w: 0, h: 0, colors: 0, avg: 0 };
    const ctx = c.getContext('2d');
    const w = Math.min(c.width, 320);
    const h = Math.min(c.height, 200);
    const img = ctx.getImageData(0, 0, w, h).data;
    const seen = new Set();
    let sum = 0;
    for (let i = 0; i < img.length; i += 16) {
      seen.add(((img[i] >> 3) << 10) | ((img[i + 1] >> 3) << 5) | (img[i + 2] >> 3));
      sum += img[i] + img[i + 1] + img[i + 2];
    }
    return { w: c.width, h: c.height, colors: seen.size, avg: sum / (img.length / 16) / 3 };
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

// move a bit (movement tutorial)
await page.keyboard.down('d');
await page.waitForTimeout(800);
await page.keyboard.up('d');
await page.waitForTimeout(300);

// wait for drone spawn (opening step 2 happens after move tutorial toast)
await page.waitForFunction(() => window.__r07.scene.enemyList.length > 0, { timeout: 15000 });
const enemies = await page.evaluate(() => window.__r07.scene.enemyList.length);
enemies >= 1 ? ok('drone spawned', `${enemies} enemy`) : bad('drone spawned', 'none');
await shot('03-drone');

// fire at the drone: use its world pos
const aimAt = async (wx, wy, ms = 1200) => {
  const p = await page.evaluate(([x, y]) => window.__r07.worldToScreen(x, y), [wx, wy]);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

// wait for drone death (shot by holding fire toward it)
await aimAt(await page.evaluate(() => window.__r07.scene.enemyList[0]?.x ?? 688, await page.evaluate(() => window.__r07.scene.enemyList[0]?.y ?? 2544)));
await page.waitForTimeout(1000);
const enemies2 = await page.evaluate(() => window.__r07.scene.enemyList.length);
enemies2 === 0 ? ok('drone killed', 'opening advances') : bad('drone killed', `${enemies2} remain`);

// second drone + vehicle tutorial: shoot the damaged vehicle at world (528, 3008)
await page.waitForFunction(() => window.__r07.scene.enemyList.length > 0, { timeout: 10000 });
await shot('04-vehicle-hint');
const vehiclePos = await page.evaluate(() => {
  const s = window.__r07.scene;
  const v = s.explosiveProps.find((p) => p.x === 528 && p.y === 3008);
  return v ? [v.x, v.y] : [528, 3008];
});
await aimAt(vehiclePos[0], vehiclePos[1], 2500);
await page.waitForFunction(() => window.__r07.scene.openingVehicleGone === true, { timeout: 15000 });
ok('vehicle exploded → gate opens', 'opening step 5');

// dash tutorial: gate should be open; move out
await page.waitForFunction(() => window.__r07.scene.loopState() === 'playing', { timeout: 20000 });
ok('loop started', 'timer running');
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
hp === 100 ? ok('hp intact (no self-damage)', '100') : bad('hp', `${hp}`);
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
