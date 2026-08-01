import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
let fail = 0;
for (const route of ['/', '/title', '/loading']) {
  await page.goto('http://localhost:5199' + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const status = overflow > 0 ? 'FAIL' : 'ok';
  if (overflow > 0) fail++;
  console.log(`${route.padEnd(10)} overflow: ${overflow}px  ${status}`);
}
console.log('pageerrors:', errs.length === 0 ? 'none ✓' : errs.join(' | '));
await browser.close();
process.exit(fail > 0 ? 1 : 0);
