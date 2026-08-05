/* Probe v2: deterministic smoke-visual capture on an INTACT vehicle.
 * Frames camera via worldToScreen verification. Temporary — delete after QA. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5199';
fs.mkdirSync('qa-shots', { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
const shot = (name) => page.screenshot({ path: `qa-shots/${name}.png` });

await page.goto(BASE + '/play', { waitUntil: 'networkidle' });
await page.waitForSelector('.title-screen', { timeout: 15000 });
await page.locator('.title-menu__item--primary').click();
await page.waitForSelector('.hud', { timeout: 20000 });
await page.waitForFunction(() => window.__r07 && window.__r07.scene && window.__r07.scene.player, { timeout: 15000 });
await page.evaluate(() => {
  const s = window.__r07.scene;
  if (s.loopState !== 'playing') s.finishOpening();
});

// pick the first INTACT vehicle
const info = await page.evaluate(() =>
  window.__r07.scene.explosiveProps
    .map((p, i) => ({ i, tex: p.texture?.key ?? '', x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, state: p.state }))
    .filter((p) => p.tex.startsWith('vehicle') && p.state === 'intact'),
);
const v = info[0];
console.log('target vehicle:', JSON.stringify(v));

// teleport player next to it, center camera, verify framing
await page.evaluate(
  ([x, y]) => {
    const s = window.__r07.scene;
    s.player.setPosition(x, y + 70);
    s.player.body.reset(x, y + 70);
    s.player.setVelocity(0, 0);
    s.cameras.main.centerOn(x, y);
    s.cameras.main.setZoom(1);
  },
  [v.x, v.y],
);
await page.waitForTimeout(500);
const scr = await page.evaluate(([x, y]) => window.__r07.worldToScreen(x, y), [v.x, v.y]);
console.log('vehicle screen pos:', scr, '(expect ~720,450)');

async function damageProp(frac) {
  const r = await page.evaluate(
    ([idx, f]) => {
      const s = window.__r07.scene;
      const p = s.explosiveProps[idx];
      if (!p || !p.alive) return 'no-prop';
      const dmg = Math.ceil(p.hp - p.maxHp * f);
      if (dmg > 0) p.damage(dmg);
      return `hp=${p.hp}/${p.maxHp} state=${p.state}`;
    },
    [v.i, frac],
  );
  console.log('  damage →', r);
  await page.waitForTimeout(1100);
}

await shot('smoke2-0-intact');
console.log('— damaged state');
await damageProp(0.45);
await shot('smoke2-1-damaged');
console.log('— critical state');
await damageProp(0.2);
await shot('smoke2-2-critical');

console.log('console errors:', errors.length ? errors : 'none');
await browser.close();
console.log('done — qa-shots/smoke2-*.png');
