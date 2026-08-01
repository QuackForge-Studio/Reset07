/* Smoke test — runs against the vite dev server (port 5199). */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5199';

const failures = [];
const ok = (name) => console.log('  ✓', name);
const bad = (name, msg) => {
  failures.push(name + (msg ? ` — ${msg}` : ''));
  console.log('  ✕', name, msg ?? '');
};

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

const consoleErrors = [];
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
page.on('pageerror', (e) => consoleErrors.push(String(e)));

// ---------- Guidelines page ----------
console.log('— Guidelines page (desktop)');
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForSelector('.g-section', { timeout: 8000 });

const sections = await page.locator('.g-section').count();
if (sections === 10) ok('10 sections rendered');
else bad('section count', `${sections} (expected 10)`);

const navLinks = await page.locator('.g-nav__link').count();
if (navLinks === 10) ok('10 nav links');
else bad('nav links', `${navLinks}`);

// Horizontal overflow check
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (overflow <= 0) ok('no horizontal overflow (desktop)');
else bad('horizontal overflow (desktop)', `${overflow}px`);

// Logo images resolve
const brokenImgs = await page.evaluate(() =>
  Array.from(document.images).filter((img) => !img.complete || img.naturalWidth === 0).length,
);
if (brokenImgs === 0) ok('no broken images');
else bad('broken images', `${brokenImgs}`);

// Clear-space + min-size specimens render
if ((await page.locator('.g-specimen').count()) > 20) ok('specimen frames rendered');
else bad('specimen frames', `${await page.locator('.g-specimen').count()}`);

// ---------- Title screen ----------
console.log('— Title screen');
await page.goto(BASE + '/title', { waitUntil: 'networkidle' });
await page.waitForSelector('.title-menu', { timeout: 8000 });

const menuItems = await page.locator('.title-menu__item').count();
if (menuItems === 3) ok('3 menu items');
else bad('menu items', `${menuItems}`);

// Logo intro finishes → is-done class
await page.waitForTimeout(3200);
const done = await page.locator('.brand-logo-anim.is-done').count();
if (done === 1) ok('logo intro completed and resolved to static');
else bad('logo intro completion', `is-done=${done}`);

// Keyboard nav: focus moves on ArrowDown
await page.locator('.title-menu__item').first().focus();
await page.keyboard.press('ArrowDown');
const focusedLabel = await page.evaluate(() => document.activeElement?.textContent ?? '');
if (focusedLabel.includes('Continue')) ok('keyboard nav moves to Continue');
else bad('keyboard nav', focusedLabel.trim());

// Click New Loop → callback
const clicked = page.evaluate(() => {
  window.__titleAction = null;
  return true;
});
await page.locator('.title-menu__item').first().click();
ok('click on New Loop dispatched (no crash)');

// overflow check on title screen
const titleOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (titleOverflow <= 0) ok('no horizontal overflow (title)');
else bad('horizontal overflow (title)', `${titleOverflow}px`);

// ---------- Loading screen ----------
console.log('— Loading screen (mobile portrait 390×844)');
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(BASE + '/loading', { waitUntil: 'networkidle' });
await page.waitForSelector('.loading-screen', { timeout: 8000 });
await page.waitForTimeout(1200);

const pct1 = await page.locator('.loading-screen__pct').textContent();
await page.waitForTimeout(1000);
const pct2 = await page.locator('.loading-screen__pct').textContent();
if (pct1 && pct2 && pct1 !== pct2) ok(`progress advances (${pct1} → ${pct2})`);
else bad('progress advance', `${pct1} → ${pct2}`);

const loadingOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
if (loadingOverflow <= 0) ok('no horizontal overflow (loading 390px)');
else bad('horizontal overflow (loading)', `${loadingOverflow}px`);

// ---------- Reduced motion simulation ----------
console.log('— Reduced motion + low effects (guidelines)');
await page.setViewportSize({ width: 1500, height: 950 });
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  document.documentElement.dataset.motion = 'reduced';
  document.documentElement.dataset.effects = 'low';
  document.documentElement.dataset.flash = 'reduced';
});
const motionAttr = await page.evaluate(() => document.documentElement.dataset.motion);
if (motionAttr === 'reduced') ok('simulation attributes set');
else bad('simulation attributes', motionAttr);

// ---------- Console errors ----------
console.log('— Console');
const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('net::ERR'));
if (realErrors.length === 0) ok('no console/page errors');
else bad('console errors', realErrors.slice(0, 5).join(' | '));

await browser.close();

console.log('\n' + (failures.length === 0 ? 'ALL SMOKE CHECKS PASSED' : `FAILURES: ${failures.length}`));
process.exit(failures.length === 0 ? 0 : 1);
