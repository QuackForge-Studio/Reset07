/*
 * RESET//07 production-mode gameplay smoke test.
 *
 * `npm run test:smoke` builds with the isolated VITE_E2E hook, starts a
 * preview server, and runs this script. The normal production build never
 * includes that hook. Browser input and the gameplay systems remain real.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = 5197;
const base = `http://127.0.0.1:${port}`;
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const failures = [];
const runLiveLoopSoak = process.argv.includes('--live-loop');
const smokeTarget = process.argv.find((arg) => arg.startsWith('--target='))?.slice('--target='.length);

function pass(name, detail = '') {
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

function check(condition, name, detail = '') {
  if (condition) pass(name, detail);
  else fail(name, detail);
}

function closeEnough(a, b, tolerance = 1) {
  return Math.abs(a - b) <= tolerance;
}

async function waitForServer(server, output) {
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error(`preview server exited early:\n${output()}`);
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(100);
  }
  throw new Error(`preview server did not start:\n${output()}`);
}

async function startLoop(page, save = null) {
  await page.goto(`${base}/play`, { waitUntil: 'networkidle' });
  await page.evaluate((seed) => {
    localStorage.clear();
    if (seed) localStorage.setItem('reset07.save.v1', JSON.stringify(seed));
  }, save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.title-screen', { timeout: 15_000 });
  await page.locator('.title-menu__item--primary').click();
  await page.waitForSelector('.hud', { timeout: 20_000 });
  await page.waitForFunction(() => window.__r07?.scene?.player?.body, { timeout: 20_000 });
}

async function screenPoint(page, worldX, worldY) {
  return page.evaluate(([x, y]) => window.__r07.worldToScreen(x, y), [worldX, worldY]);
}

async function aimAt(page, worldX, worldY, viewport) {
  const point = await screenPoint(page, worldX, worldY);
  await page.mouse.move(Math.max(0, Math.min(viewport.width, point.x)), Math.max(0, Math.min(viewport.height, point.y)));
}

async function burstFire(page, viewport, readTarget, until, timeoutMs) {
  const started = Date.now();
  let down = false;
  while (Date.now() - started < timeoutMs) {
    if (await page.evaluate(until)) break;
    const target = await page.evaluate(readTarget);
    if (target) await aimAt(page, target[0], target[1], viewport);
    const burst = (Date.now() - started) % 1_300 < 900;
    if (burst && !down) {
      await page.mouse.down();
      down = true;
    } else if (!burst && down) {
      await page.mouse.up();
      down = false;
    }
    await page.waitForTimeout(100);
  }
  if (down) await page.mouse.up();
}

async function setPlayer(page, x, y) {
  await page.evaluate(
    ([nextX, nextY]) => {
      const player = window.__r07.scene.player;
      player.setPosition(nextX, nextY);
      player.body.reset(nextX, nextY);
      window.__r07.scene.playerPos = { x: nextX, y: nextY };
    },
    [x, y],
  );
}

async function setTimerAndWaitForPhase(page, remaining, phase) {
  await page.evaluate((value) => {
    window.__r07.scene.loopTimer.remaining = value;
  }, remaining);
  await page.waitForFunction((expected) => window.__r07.scene.loopTimer.phase === expected, phase, { timeout: 3_000 });
}

function laterLoopSave() {
  return { version: 1, story: { loops: 1 }, dialogueSeen: ['loop2a', 'loop2b'] };
}

async function runDesktop(browser, errors) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  console.log('— desktop opening, gate, timer, pause, and restart lifecycle');
  await startLoop(page);
  const viewport = { width: 1440, height: 900 };

  let desktopResponsive = true;
  for (const [width, height] of [
    [1366, 768],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvas: Boolean(document.querySelector('canvas')),
      hud: Boolean(document.querySelector('.hud')),
    }));
    desktopResponsive &&= state.overflow <= 0 && state.canvas && state.hud;
  }
  check(desktopResponsive, 'desktop layouts render without horizontal overflow');
  await page.setViewportSize(viewport);

  // Skip the three readable intro lines with the player-facing skip control.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('e');
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => window.__r07.scene.openingStep >= 2, { timeout: 10_000 });

  const movementStart = await page.evaluate(() => window.__r07.scene.player.x);
  await page.locator('canvas').click();
  await page.keyboard.down('d');
  await page.waitForTimeout(600);
  await page.keyboard.up('d');
  const movementEnd = await page.evaluate(() => window.__r07.scene.player.x);
  check(movementEnd - movementStart > 35, 'player moves from rest', `${Math.round(movementEnd - movementStart)}px`);

  // Player animation state machine (sheet always exists via procedural fallback)
  await page.keyboard.down('d');
  await page.waitForTimeout(300);
  const animKey = await page.evaluate(() => window.__r07.scene.player.anims?.currentAnim?.key ?? '');
  check(animKey.startsWith('p-walk-side'), 'player plays walk anim while moving', animKey);
  await page.keyboard.up('d');
  await page.keyboard.down('a');
  await page.waitForTimeout(300);
  const flipX = await page.evaluate(() => window.__r07.scene.player.flipX === true);
  await page.keyboard.up('a');
  check(flipX, 'player mirrors (flipX) when facing left', String(flipX));

  await page.waitForFunction(() => window.__r07.scene.enemyList.length > 0, { timeout: 10_000 });
  check((await page.evaluate(() => window.__r07.scene.enemyList.length)) > 0, 'opening enemy appears');
  const enemyScales = await page.evaluate(() =>
    window.__r07.scene.enemyList.map((e) => Number(e.scaleX.toFixed(2)))
  );
  check(enemyScales.length > 0 && enemyScales.every((s) => s >= 1.4), 'enemies are scaled up', enemyScales.join(','));

  // The gate must physically stop the player while still closed.
  await setPlayer(page, 528, 2740);
  await page.keyboard.down('s');
  await page.waitForTimeout(900);
  await page.keyboard.up('s');
  const closedGate = await page.evaluate(() => {
    const scene = window.__r07.scene;
    return { y: scene.player.y, open: scene.gates.find((g) => g.def.id === 'garage').gate.isOpen };
  });
  check(!closedGate.open && closedGate.y <= 2825, 'closed gate blocks traversal', `player y=${Math.round(closedGate.y)}`);
  await setPlayer(page, 528, 2640);

  await page.evaluate(() => {
    const enemy = window.__r07.scene.enemyList[0];
    enemy.__smokeUpdate = enemy.update;
    enemy.update = () => enemy.setVelocity(0, 300);
    enemy.setPosition(528, 2740);
    enemy.body.reset(528, 2740);
  });
  await page.waitForTimeout(900);
  const enemyGateY = await page.evaluate(() => window.__r07.scene.enemyList[0].y);
  check(enemyGateY <= 2830, 'closed gate blocks enemy traversal', `enemy y=${Math.round(enemyGateY)}`);
  await page.evaluate(() => {
    const enemy = window.__r07.scene.enemyList[0];
    enemy.update = enemy.__smokeUpdate;
    delete enemy.__smokeUpdate;
  });

  await burstFire(
    page,
    viewport,
    () => {
      const enemy = window.__r07.scene.enemyList[0];
      return enemy ? [enemy.x, enemy.y] : null;
    },
    () => window.__r07.scene.enemyList.length === 0,
    8_000,
  );
  await page.waitForFunction(() => window.__r07.scene.openingStep >= 4, { timeout: 10_000 });
  check((await page.evaluate(() => window.__r07.scene.openingStep)) >= 4, 'first drone can be defeated');

  await burstFire(
    page,
    viewport,
    () => {
      const scene = window.__r07.scene;
      const enemy = scene.enemyList[0];
      if (enemy) return [enemy.x, enemy.y];
      const vehicle = scene.explosiveProps.find((prop) => prop.texture?.key === 'vehicle-damaged' && prop.active && prop.alive);
      return vehicle ? [vehicle.x, vehicle.y] : null;
    },
    () => window.__r07.scene.openingVehicleGone || window.__r07.loopState() === 'playing',
    20_000,
  );
  await page.waitForFunction(() => window.__r07.scene.openingVehicleGone || window.__r07.loopState() === 'playing', { timeout: 10_000 });
  const vehicleGone = await page.evaluate(() => window.__r07.scene.openingVehicleGone);
  check(vehicleGone, 'vehicle explosion triggers');
  await page.waitForFunction(() => window.__r07.scene.gates.find((g) => g.def.id === 'garage').gate.isOpen, { timeout: 5_000 });
  check(await page.evaluate(() => window.__r07.scene.gates.find((g) => g.def.id === 'garage').gate.isOpen), 'garage gate opens');

  await page.waitForTimeout(400);
  await setPlayer(page, 528, 2740);
  await page.locator('canvas').click();
  await page.keyboard.down('s');
  await page.waitForTimeout(1_000);
  await page.keyboard.up('s');
  await page.waitForFunction(() => window.__r07.loopState() === 'playing', { timeout: 10_000 });
  check(await page.evaluate(() => window.__r07.loopState() === 'playing'), 'open gate permits traversal and starts loop');

  const timerBefore = await page.evaluate(() => window.__r07.scene.loopTimer.remaining);
  await page.waitForTimeout(450);
  const timerAfter = await page.evaluate(() => window.__r07.scene.loopTimer.remaining);
  check(timerAfter < timerBefore, 'loop timer starts after opening');

  await page.locator('.hud__pause-btn').click();
  await page.waitForSelector('.pause', { timeout: 5_000 });
  const pauseStart = await page.evaluate(() => ({
    x: window.__r07.scene.player.x,
    time: window.__r07.scene.loopTimer.remaining,
    paused: window.__r07.scene.scene.isPaused(),
  }));
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const pauseEnd = await page.evaluate(() => ({
    x: window.__r07.scene.player.x,
    time: window.__r07.scene.loopTimer.remaining,
    paused: window.__r07.scene.scene.isPaused(),
  }));
  check(
    pauseEnd.paused && closeEnough(pauseEnd.x, pauseStart.x) && closeEnough(pauseEnd.time, pauseStart.time, 0.001),
    'pause freezes world and timer',
  );
  await page.getByRole('button', { name: 'SETTINGS' }).click();
  await page.waitForSelector('.settings', { timeout: 5_000 });
  const autoAimBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('reset07.save.v1')).settings.autoAim);
  await page.getByRole('button', { name: 'AUTO-AIM' }).click();
  await page.waitForTimeout(80);
  check(
    (await page.evaluate(() => JSON.parse(localStorage.getItem('reset07.save.v1')).settings.autoAim)) !== autoAimBefore,
    'settings persist an in-game control change',
  );
  await page.locator('.settings__back').click();
  await page.waitForSelector('.pause', { timeout: 5_000 });
  check((await page.locator('.pause').count()) === 1, 'settings return to the paused game');
  await page.getByRole('button', { name: 'MEMORY BOARD' }).click();
  await page.waitForSelector('.memory-board', { timeout: 5_000 });
  await page.getByRole('button', { name: 'CLOSE' }).click();
  await page.waitForSelector('.pause', { timeout: 5_000 });
  check((await page.locator('.pause').count()) === 1, 'memory board returns to the paused game');
  await page.locator('.pause .btn--primary').click();
  await page.locator('canvas').click();
  const resumeStart = await page.evaluate(() => window.__r07.scene.player.x);
  await page.keyboard.down('d');
  await page.waitForTimeout(500);
  await page.keyboard.up('d');
  const resumeEnd = await page.evaluate(() => window.__r07.scene.player.x);
  check(resumeEnd - resumeStart > 30, 'resume restores movement');

  // Collect a real memory pickup before accelerating only the test clock.
  await setPlayer(page, 528, 2448);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('reset07.save.v1')).memories.includes('garageLog'), { timeout: 3_000 });
  check(
    await page.evaluate(() => JSON.parse(localStorage.getItem('reset07.save.v1')).memories.includes('garageLog')),
    'memory pickup persists before reset',
  );

  if (runLiveLoopSoak) {
    console.log('— live seven-minute loop soak');
    const loopsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('reset07.save.v1')).story.loops ?? 0);
    // Keep the stationary test player alive so the observed reset is caused
    // by the live clock rather than an incidental enemy or explosion.
    await page.evaluate(() => {
      window.__r07.scene.player.invulnUntil = performance.now() + 450_000;
    });
    await page.waitForFunction(
      (before) => {
        const raw = localStorage.getItem('reset07.save.v1');
        return raw !== null && (JSON.parse(raw).story.loops ?? 0) > before;
      },
      loopsBefore,
      { timeout: 450_000 },
    );
    const liveSave = await page.evaluate(() => JSON.parse(localStorage.getItem('reset07.save.v1')));
    check(
      liveSave.story.loops === loopsBefore + 1 && liveSave.memories.includes('garageLog'),
      'live seven-minute timer reaches reset and persists state',
    );
    await page.close();
    return;
  }

  await setTimerAndWaitForPhase(page, 299.98, 'RISING');
  await setTimerAndWaitForPhase(page, 179.98, 'DANGER');
  await setTimerAndWaitForPhase(page, 59.98, 'FINAL');
  await setTimerAndWaitForPhase(page, 9.98, 'FINAL10');
  check(true, 'timer reaches rising, danger, final-minute, and final-ten phases');
  await page.evaluate(() => {
    window.__r07.scene.loopTimer.remaining = 0.01;
  });
  await page.waitForFunction(() => window.__r07.loopState() === 'reset', { timeout: 3_000 });
  // Final-minute hit-stop/slow motion deliberately stretches the visual reset
  // sequence, so allow enough wall-clock time for its UI handoff.
  await page.waitForSelector('.garage', { timeout: 20_000 });
  const resetSave = await page.evaluate(() => JSON.parse(localStorage.getItem('reset07.save.v1')));
  const garageText = await page.locator('.garage__memory-note').textContent();
  check(resetSave.story.loops === 1 && resetSave.memories.includes('garageLog'), 'loop reset persists memories and loop count');
  check(garageText?.includes('1 SYNCED'), 'garage UI refreshes persisted save after reset');

  await page.locator('.garage__actions .btn--ghost').click();
  await page.waitForSelector('.title-screen', { timeout: 8_000 });
  await page.getByRole('button', { name: 'HOW TO PLAY' }).click();
  await page.waitForSelector('.howto', { timeout: 5_000 });
  await page.locator('.howto').getByRole('button', { name: 'BACK' }).click();
  await page.waitForSelector('.title-screen', { timeout: 5_000 });
  check((await page.locator('.title-screen').count()) === 1, 'how-to screen returns to title');
  const continueButton = page.locator('button.title-menu__item', { hasText: 'CONTINUE' });
  check((await continueButton.count()) === 1, 'continue becomes available after a saved reset');
  await continueButton.click();
  await page.waitForFunction(() => window.__r07.loopState() === 'playing', { timeout: 10_000 });
  const resetWorld = await page.evaluate(() => {
    const scene = window.__r07.scene;
    return {
      hp: scene.player.hp,
      gateOpen: scene.gates.find((g) => g.def.id === 'garage').gate.isOpen,
      memories: scene.save.memories,
      counts: {
        enemies: scene.enemyList.length,
        explosives: scene.explosiveProps.length,
        interactables: scene.interactables.length,
        walls: scene.collideWalls.getLength(),
        playerBolts: scene.playerBolts.getLength(),
        enemyBolts: scene.enemyBolts.getLength(),
      },
    };
  });
  check(
    resetWorld.hp === 100 && !resetWorld.gateOpen && resetWorld.memories.includes('garageLog'),
    'continue starts a reset world with persistent memory',
  );

  let lifecycleStable = true;
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.__r07.scene.restartLoop());
    await page.waitForTimeout(400);
    const counts = await page.evaluate(() => {
      const scene = window.__r07.scene;
      return {
        gateOpen: scene.gates.find((g) => g.def.id === 'garage').gate.isOpen,
        counts: {
          enemies: scene.enemyList.length,
          explosives: scene.explosiveProps.length,
          interactables: scene.interactables.length,
          walls: scene.collideWalls.getLength(),
          playerBolts: scene.playerBolts.getLength(),
          enemyBolts: scene.enemyBolts.getLength(),
        },
      };
    });
    if (counts.gateOpen || JSON.stringify(counts.counts) !== JSON.stringify(resetWorld.counts)) lifecycleStable = false;
  }
  check(lifecycleStable, 'ten scene restarts keep gates, projectiles, and runtime entity counts stable');

  await page.close();
}

async function touch(page, cdp, type, points) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
}

async function runMobile(browser, errors) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  console.log('— mobile touch and responsive coverage');
  await startLoop(page, laterLoopSave());
  await page.waitForSelector('.touch', { timeout: 5_000 });
  const cdp = await context.newCDPSession(page);

  const viewports = [
    [375, 667],
    [390, 844],
    [667, 375],
    [844, 390],
    [768, 1024],
  ];
  let responsive = true;
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvas: !!document.querySelector('canvas'),
      touch: !!document.querySelector('.touch'),
    }));
    responsive &&= state.overflow <= 0 && state.canvas && state.touch;
  }
  check(responsive, 'portrait, landscape, and tablet touch layouts render without horizontal overflow');

  await page.setViewportSize({ width: 390, height: 844 });
  await setPlayer(page, 528, 2640);
  const moveBox = await page.locator('.touch__zone--move').boundingBox();
  const aimBox = await page.locator('.touch__zone--aim').boundingBox();
  const moveStart = await page.evaluate(() => window.__r07.scene.player.x);
  const leftStart = { x: moveBox.x + 70, y: moveBox.y + 120, id: 1 };
  const leftMove = { x: moveBox.x + 130, y: moveBox.y + 120, id: 1 };
  const rightStart = { x: aimBox.x + 80, y: aimBox.y + 140, id: 2 };
  const rightMove = { x: aimBox.x + 135, y: aimBox.y + 100, id: 2 };
  await touch(page, cdp, 'touchStart', [leftStart]);
  await touch(page, cdp, 'touchMove', [leftMove]);
  await touch(page, cdp, 'touchStart', [leftMove, rightStart]);
  await touch(page, cdp, 'touchMove', [leftMove, rightMove]);
  await page.waitForTimeout(80);
  const touchActive = await page.evaluate(() => ({
    aim: window.__r07.touchInput.aimActive,
    firing: window.__r07.touchInput.firing,
    bolts: window.__r07.scene.playerBolts.getLength(),
  }));
  await page.waitForTimeout(570);
  const touchDuring = await page.evaluate(() => window.__r07.scene.player.x);
  check(
    touchDuring - moveStart > 35 && touchActive.aim && touchActive.firing && touchActive.bolts > 0,
    'simultaneous joystick movement and aim/fire work',
  );
  await touch(page, cdp, 'touchCancel', []);
  await page.waitForTimeout(600);
  const afterCancel = await page.evaluate(() => window.__r07.scene.player.x);
  await page.waitForTimeout(450);
  const settled = await page.evaluate(() => window.__r07.scene.player.x);
  check(closeEnough(settled, afterCancel, 2), 'pointer cancellation releases movement');

  await touch(page, cdp, 'touchStart', [{ x: moveBox.x + 70, y: moveBox.y + 120, id: 3 }]);
  await touch(page, cdp, 'touchMove', [{ x: moveBox.x + 130, y: moveBox.y + 120, id: 3 }]);
  await page.waitForTimeout(60);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(160);
  const rotatedInput = await page.evaluate(() => ({ ...window.__r07.touchInput }));
  check(
    Math.abs(rotatedInput.moveX) < 0.01 && Math.abs(rotatedInput.moveY) < 0.01 && !rotatedInput.firing,
    'orientation change releases active touch input',
  );
  await touch(page, cdp, 'touchCancel', []);
  await page.setViewportSize({ width: 390, height: 844 });

  const relayPosition = await page.evaluate(() => {
    const relay = window.__r07.scene.interactables.find((item) => item.intId === 'relay');
    return relay ? [relay.x, relay.y] : null;
  });
  check(relayPosition !== null, 'touch interaction target is present');
  if (relayPosition) {
    await setPlayer(page, relayPosition[0], relayPosition[1]);
    await page.waitForTimeout(120);
    const interact = page.locator('.touch-btn--interact');
    const interactBox = await interact.boundingBox();
    await touch(page, cdp, 'touchStart', [{ x: interactBox.x + interactBox.width / 2, y: interactBox.y + interactBox.height / 2, id: 21 }]);
    await page.waitForTimeout(120);
    const holdStart = await page.evaluate(() => ({
      held: window.__r07.touchInput.interactHeld,
      queued: window.__r07.touchInput.interactQueued,
      touchVisible: Boolean(document.querySelector('.touch-btn--dash')),
      hudVisible: Boolean(document.querySelector('.hud')),
    }));
    await page.waitForTimeout(1_530);
    const holdDuring = await page.evaluate(() => ({
      held: window.__r07.touchInput.interactHeld,
      current: window.__r07.scene.currentInteract?.intId ?? null,
      progress: window.__r07.scene.interactHold,
      touchVisible: Boolean(document.querySelector('.touch-btn--dash')),
      hudVisible: Boolean(document.querySelector('.hud')),
    }));
    await touch(page, cdp, 'touchEnd', []);
    const interaction = await page.evaluate(() => {
      const scene = window.__r07.scene;
      const relay = scene.interactables.find((item) => item.intId === 'relay');
      return {
        stage: relay?.stageCount ?? 0,
        held: window.__r07.touchInput.interactHeld,
        current: scene.currentInteract?.intId ?? null,
        player: [Math.round(scene.player.x), Math.round(scene.player.y)],
        relay: relay ? [Math.round(relay.x), Math.round(relay.y)] : null,
      };
    });
    check(
      interaction.stage >= 1,
      'touch interact hold works',
      interaction.stage >= 1 ? '' : JSON.stringify({ holdStart, holdDuring, interaction }),
    );
  }

  const dashBox = await page.locator('.touch-btn--dash').boundingBox();
  await page.locator('.touch-btn--dash').tap();
  await page.waitForTimeout(60);
  check(await page.evaluate(() => window.__r07.scene.player.isDashing), 'touch dash button works', `${Math.round(dashBox.width)}px target`);

  await page.evaluate(() => window.__r07.scene.player.addOverdriveCharge(100));
  const overdriveBox = await page.locator('.touch-btn--od').boundingBox();
  await page.locator('.touch-btn--od').tap();
  await page.waitForTimeout(80);
  check(
    await page.evaluate(() => window.__r07.scene.player.overdriveActive),
    'touch overdrive button works',
    `${Math.round(overdriveBox.width)}px target`,
  );

  const pauseBox = await page.locator('.touch-btn--pause-global').boundingBox();
  await page.locator('.touch-btn--pause-global').tap();
  await page.waitForSelector('.pause', { timeout: 5_000 });
  check((await page.locator('.pause').count()) === 1, 'touch pause button works', `${Math.round(pauseBox.width)}px target`);
  await page.locator('.pause .btn--primary').click();
  const resumedTouchStart = await page.evaluate(() => window.__r07.scene.player.x);
  await touch(page, cdp, 'touchStart', [{ x: moveBox.x + 70, y: moveBox.y + 120, id: 4 }]);
  await touch(page, cdp, 'touchMove', [{ x: moveBox.x + 130, y: moveBox.y + 120, id: 4 }]);
  await page.waitForTimeout(450);
  await touch(page, cdp, 'touchCancel', []);
  check((await page.evaluate(() => window.__r07.scene.player.x)) - resumedTouchStart > 25, 'touch movement resumes after pause');

  await page.close();
  await context.close();
}

function endingSave() {
  return {
    version: 1,
    story: { loops: 3 },
    memories: ['eliChip', 'decommission', 'maraOrigin', 'guardianSignal'],
    rescued: ['eli'],
    flags: ['evacDone', 'challengedMara', 'challengedGuardian'],
    dialogueSeen: ['loop2a', 'loop2b'],
  };
}

async function openEndingDecision(page, errors, verifyProjectile) {
  await startLoop(page, endingSave());
  await setPlayer(page, 3000, 1700);
  await page.waitForFunction(() => window.__r07.scene.bossActive && window.__r07.scene.boss, { timeout: 8_000 });

  if (verifyProjectile) {
    await page.evaluate(() => {
      const scene = window.__r07.scene;
      scene.player.setPosition(scene.boss.x - 220, scene.boss.y);
      scene.player.body.reset(scene.player.x, scene.player.y);
      scene.playerPos = { x: scene.player.x, y: scene.player.y };
      scene.player.invulnUntil = performance.now() + 5_000;
      // Freeze the boss and drop to phase 3 (shield retracted, core exposed)
      // so its drift/rotation can't randomly absorb the bolts — this check is
      // about projectile→boss damage, not boss movement or shield timing.
      const boss = scene.boss;
      boss.shieldAngle = 0;
      boss.phase = 3;
      boss.body.setVelocity(0, 0);
      boss.body.setImmovable(true);
      boss.update = () => {};
    });
    const before = await page.evaluate(() => window.__r07.scene.boss.hp);
    const point = await page.evaluate(() => window.__r07.worldToScreen(window.__r07.scene.boss.x, window.__r07.scene.boss.y));
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(700);
    await page.mouse.up();
    const after = await page.evaluate(() => window.__r07.scene.boss.hp);
    check(after < before, 'player projectiles damage the Core Guardian', `${Math.round(before - after)} damage`);
  }

  await page.evaluate(() => window.__r07.scene.boss.damage(9_999));
  await page.waitForSelector('.decision', { timeout: 8_000 });
}

async function runPwa(browser, errors) {
  console.log('— PWA app-shell coverage');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  try {
    await page.goto(`${base}/play`, { waitUntil: 'networkidle' });
    check((await page.locator('link[rel="manifest"]').count()) === 1, 'web manifest is linked');
    await page.waitForFunction(
      async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.active?.state === 'activated';
      },
      { timeout: 10_000 },
    );

    // A controlled online reload fills the runtime asset cache before the
    // subsequent offline navigation checks the actual app shell fallback.
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 10_000 });
    check(true, 'service worker controls a production page');

    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 12_000 });
    await page.waitForSelector('.title-screen', { timeout: 12_000 });
    check(true, 'cached /play shell loads offline');
  } finally {
    await context.setOffline(false);
    await context.close();
  }
}

async function runProductionShell(browser, errors) {
  console.log('— normal production shell coverage');
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(`${base}/play`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.title-screen', { timeout: 15_000 });
  check(await page.evaluate(() => typeof window.__r07 === 'undefined'), 'normal production build does not expose the E2E hook');
  await page.locator('.title-menu__item--primary').click();
  await page.waitForSelector('.hud', { timeout: 20_000 });
  check((await page.locator('canvas').count()) === 1, 'normal production build starts the playable Phaser shell');
  await page.close();
}

async function runEndings(browser, errors) {
  console.log('— boss hit and ending transition coverage');
  const cases = [
    { id: 'preserve', selector: '.decision-btn--cyan', ending: '.ending--cyan' },
    { id: 'break', selector: '.decision-btn--orange', ending: '.ending--orange' },
    { id: 'release', selector: '.decision-btn--teal', ending: '.ending--teal' },
  ];

  for (const [index, test] of cases.entries()) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    await openEndingDecision(page, errors, index === 0);
    if (test.id === 'release')
      check(
        !(await page.locator(test.selector).getAttribute('class')).includes('is-locked'),
        'release ending unlocks when all requirements are saved',
      );
    await page.locator(test.selector).click();
    await page.waitForSelector(test.ending, { timeout: 10_000 });
    const saved = await page.evaluate((id) => JSON.parse(localStorage.getItem('reset07.save.v1')).story.endings[id], test.id);
    check(saved === true, `${test.id} ending transitions and saves completion`);
    await page.close();
  }
}

let previewOutput = '';
const preview = spawn(
  process.execPath,
  [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
  {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);
preview.stdout.on('data', (chunk) => {
  previewOutput += chunk;
});
preview.stderr.on('data', (chunk) => {
  previewOutput += chunk;
});

let browser;
try {
  await waitForServer(preview, () => previewOutput);
  browser = await chromium.launch({ executablePath: chrome });
  const errors = [];
  if (smokeTarget === 'mobile') {
    await runMobile(browser, errors);
  } else if (smokeTarget === 'production') {
    await runProductionShell(browser, errors);
  } else {
    await runPwa(browser, errors);
    await runDesktop(browser, errors);
    await runMobile(browser, errors);
    await runEndings(browser, errors);
  }
  const realErrors = errors.filter((message) => !message.includes('favicon') && !message.includes('ResizeObserver'));
  check(realErrors.length === 0, 'no browser console or page errors', realErrors.slice(0, 3).join(' | '));
} catch (error) {
  fail('smoke harness completed', error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close();
  if (preview.exitCode === null) {
    preview.kill();
    await Promise.race([once(preview, 'exit'), delay(3_000)]);
  }
}

console.log(`\n${failures.length === 0 ? 'ALL GAME SMOKE CHECKS PASSED' : `FAILURES: ${failures.length}`}`);
process.exit(failures.length === 0 ? 0 : 1);
