/**
 * RESET//07 — environment entities.
 *
 * Explosive props share a state machine (intact → damaged → critical →
 * destroyed) with a visible warning period before detonation. Interactables
 * (capsules, relay, uplink, crystals) drive objectives, rescues and memory.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { DamageableSprite } from './base';
import type { WorldScene } from '../types';
import type { ExplosionKind } from '../systems/Explosions';

// ─────────────────────────────────────────────────────────────
// Explosive base
// ─────────────────────────────────────────────────────────────

export type PropState = 'intact' | 'damaged' | 'critical' | 'destroyed';

export interface ExplosiveConfig {
  hp: number;
  warnMs: number; // warning period before detonation
  boomKind: ExplosionKind;
  smokeAt?: number; // hp fraction below which it smokes
  fireAt?: number; // hp fraction below which it burns
  onDestroyed?: (e: Explosive) => void;
  explosionRadiusMul?: number;
}

export class Explosive extends DamageableSprite {
  isExplosive = true;
  state: PropState = 'intact';
  protected cfg: ExplosiveConfig;
  protected detonating = false;
  protected smokeTimer = 0;
  protected idleSmoke = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, cfg: ExplosiveConfig) {
    super(scene, x, y, texture, cfg.hp, {});
    this.cfg = cfg;
    this.setDepth(45);
  }

  damage(amount: number): void {
    if (!this.alive || this.detonating) return;
    super.damage(amount);
    this.updateState();
    this.sceneWfx().spawnSpark(this.x, this.y, PAL.orange, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.2, 1);
  }

  takeExplosionDamage(damage: number, kind: ExplosionKind, x: number, y: number): boolean {
    if (!this.alive) return true;
    if (this.detonating) return false;
    // explosion damage can ignite directly
    this.ignite(x, y, kind);
    void damage;
    return !this.alive;
  }

  tryIgnite(x: number, y: number, kind: ExplosionKind): ExplosionKind | null {
    if (!this.alive || this.detonating) return null;
    this.ignite(x, y, kind);
    return this.detonating ? this.cfg.boomKind : null;
  }

  /** Start the warning → detonation sequence. */
  protected ignite(x: number, y: number, _kind: ExplosionKind): void {
    if (this.detonating || !this.alive) return;
    this.detonating = true;
    this.state = 'critical';
    this.setTint(PAL.white);
    const scene = this.sceneW();
    scene.sfx('beep');
    // flashing warning
    scene.tweens.add({
      targets: this,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      repeat: Math.max(1, Math.floor(this.cfg.warnMs / 180)),
      onComplete: () => {
        if (!this.alive) return;
        this.detonate(x, y);
      },
    });
  }

  protected detonate(x: number, y: number): void {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'destroyed';
    this.sceneW().explosions.explode(this.cfg.boomKind, x, y, { sourceId: this.id });
    this.cfg.onDestroyed?.(this);
    this.destroy();
  }

  protected updateState(): void {
    const frac = this.hp / this.maxHp;
    if (frac < (this.cfg.fireAt ?? 0.3)) this.state = 'critical';
    else if (frac < (this.cfg.smokeAt ?? 0.6)) this.state = 'damaged';
  }

  protected sceneW(): WorldScene {
    return this.scene as WorldScene;
  }

  protected sceneWfx() {
    return this.sceneW().fx;
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.applyFlashAndKnock(dt);
    const fx = this.sceneWfx();
    if (this.state === 'damaged') {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.22;
        fx.spawnSmoke(this.x + (Math.random() - 0.5) * 10, this.y - 6, 0.7, 1.4, -24);
      }
    } else if (this.state === 'critical' && !this.detonating) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.1;
        fx.spawnSmoke(this.x + (Math.random() - 0.5) * 10, this.y - 4, 0.9, 1.2, -30);
        fx.spawnEmber(this.x + (Math.random() - 0.5) * 14, this.y, PAL.orange, (Math.random() - 0.5) * 40, -50, 0.5, 0.8);
      }
    } else if (this.idleSmoke > 0) {
      this.idleSmoke -= dt;
      if (this.idleSmoke <= 0) this.state = 'intact';
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Vehicles
// ─────────────────────────────────────────────────────────────

export class Vehicle extends Explosive {
  constructor(scene: Phaser.Scene, x: number, y: number, variant: string, opts: { onDestroyed?: (e: Explosive) => void } = {}) {
    const isDamaged = variant === 'damaged';
    super(scene, x, y, `vehicle-${variant}`, {
      hp: isDamaged ? 18 : 60,
      warnMs: isDamaged ? 380 : 520,
      boomKind: 'med',
      smokeAt: 0.55,
      fireAt: 0.28,
      onDestroyed: (e) => {
        // wreck replaces the vehicle
        const wreck = scene.add.image(e.x, e.y, 'wreck');
        wreck.setDepth(44);
        wreck.setRotation((e as Vehicle).bodyAngle);
        opts.onDestroyed?.(e);
      },
    });
    this.setDepth(45);
    this.setRotation((Math.random() * Math.PI) / 2 - Math.PI / 4 + (Math.random() * Math.PI) / 2);
    if (isDamaged) {
      this.state = 'critical';
      this.hp = 18;
      this.idleSmoke = 1000;
      this.setTint(0xaaaaaa);
    }
  }

  get bodyAngle(): number {
    return this.rotation;
  }
}

// ─────────────────────────────────────────────────────────────
// Fuel tank
// ─────────────────────────────────────────────────────────────

export class FuelTank extends Explosive {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tank', {
      hp: 40,
      warnMs: 560,
      boomKind: 'large',
      smokeAt: 0.5,
      fireAt: 0.25,
    });
    this.setDepth(46);
  }
}

// ─────────────────────────────────────────────────────────────
// Gas pipe — leaks when damaged, ignites into directional fire
// ─────────────────────────────────────────────────────────────

export class GasPipe extends Explosive {
  dir: 'h' | 'v';
  len: number;
  private leakTimer = 0;
  private leakFx: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, dir: 'h' | 'v', len: number) {
    super(scene, x, y, dir === 'h' ? 'pipe-h' : 'pipe-v', {
      hp: 50,
      warnMs: 420,
      boomKind: 'gas',
      smokeAt: 0.55,
    });
    this.dir = dir;
    this.len = len;
    this.setDepth(44);
    // stretch to length
    if (dir === 'h') {
      this.setScale(len, 1);
      this.setOrigin(0, 0.5);
    } else {
      this.setScale(1, len);
      this.setOrigin(0.5, 0);
    }
  }

  get px(): number {
    return this.x;
  }

  get py(): number {
    return this.y;
  }

  get extent(): number {
    return this.len * 32;
  }

  damage(amount: number): void {
    super.damage(amount);
    if (this.alive && this.state === 'damaged' && this.leakFx.length === 0) {
      this.startLeak();
    }
  }

  private startLeak(): void {
    const scene = this.sceneW();
    scene.sfx('gasIgnite');
    // leak puffs along the pipe
    this.leakTimer = 0.15;
    this.state = 'damaged';
  }

  protected ignite(x: number, y: number, _kind: ExplosionKind): void {
    if (this.detonating) return;
    this.detonating = true;
    this.state = 'critical';
    const scene = this.sceneW();
    scene.sfx('beep');
    scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 90,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (!this.alive) return;
        // directional gas explosion: fire jet along the pipe axis
        const fx = scene.fx;
        const axis = this.dir === 'h' ? { x: 1, y: 0 } : { x: 0, y: 1 };
        const n = Math.min(10, this.len * 3);
        for (let i = 0; i < n; i++) {
          const t = (i / n - 0.5) * this.extent;
          const jx = this.x + axis.x * t;
          const jy = this.y + axis.y * t;
          const blob = scene.add.image(jx, jy, 'fx-glow');
          blob.setBlendMode(Phaser.BlendModes.ADD);
          blob.setTint(i % 2 ? PAL.orange : PAL.amber);
          blob.setScale(0.7);
          scene.tweens.add({
            targets: blob,
            alpha: 0,
            scale: 1.8,
            x: jx + axis.x * 50 + (Math.random() - 0.5) * 20,
            y: jy + axis.y * 50 + (Math.random() - 0.5) * 20,
            duration: 380,
            delay: i * 45,
            onComplete: () => blob.destroy(),
          });
          fx.spawnSmoke(jx, jy, 0.8, 1, -30);
        }
        this.alive = false;
        this.state = 'destroyed';
        scene.explosions.explode('gas', x, y, { sourceId: this.id });
        for (const l of this.leakFx) l.destroy();
        this.leakFx = [];
        this.destroy();
      },
    });
  }

  update(dt: number): void {
    super.update(dt);
    if (this.leakFx.length > 0 && this.alive) {
      this.leakTimer -= dt;
      if (this.leakTimer <= 0) {
        this.leakTimer = 0.24;
        const scene = this.sceneW();
        const g = scene.add.image(this.x + (Math.random() - 0.5) * this.extent, this.y + (Math.random() - 0.5) * 8, 'fx-glow');
        g.setBlendMode(Phaser.BlendModes.ADD);
        g.setTint(PAL.teal);
        g.setScale(0.5);
        g.setAlpha(0.5);
        scene.tweens.add({ targets: g, alpha: 0, scale: 1.1, duration: 700, onComplete: () => g.destroy() });
        this.leakFx.push(g);
        if (this.leakFx.length > 5) this.leakFx.shift()?.destroy();
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Transformer — electric explosion + puddle conduction + shield stun
// ─────────────────────────────────────────────────────────────

export class Transformer extends Explosive {
  constructor(scene: Phaser.Scene, x: number, y: number, opts: { onDestroyed?: (e: Explosive) => void } = {}) {
    super(scene, x, y, 'transformer', {
      hp: 55,
      warnMs: 480,
      boomKind: 'electric',
      smokeAt: 0.5,
      onDestroyed: opts.onDestroyed,
    });
    this.setDepth(46);
  }

  protected detonate(x: number, y: number): void {
    if (!this.alive) return;
    this.alive = false;
    this.state = 'destroyed';
    const scene = this.sceneW();
    scene.explosions.explode('electric', x, y, { sourceId: this.id });
    // puddle conduction chain
    conductPuddles(scene, x, y);
    // stun nearby shield units
    for (const e of scene.enemyList) {
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < 150 * 150 && (e as { stun?: (ms: number) => void }).stun) {
        (e as { stun: (ms: number) => void }).stun(3000);
        scene.fx.electricArc(x, y, e.x, e.y, PAL.cyan);
      }
    }
    this.cfg.onDestroyed?.(this);
    this.destroy();
  }
}

/** Conduct electricity along puddles: arcs + damage + stun in a chain. */
export function conductPuddles(scene: WorldScene, startX: number, startY: number): void {
  const puddles = scene.puddleList;
  const visited = new Set<Puddle>();
  const queue: Puddle[] = [];
  const near = (px: number, py: number, r: number) =>
    puddles.filter((p) => !visited.has(p) && (p.x - px) ** 2 + (p.y - py) ** 2 < r * r);
  for (const p of near(startX, startY, 130)) {
    visited.add(p);
    queue.push(p);
  }
  let hops = 0;
  while (queue.length && hops++ < 14) {
    const p = queue.shift()!;
    p.flash();
    // damage + stun enemies near this puddle
    for (const e of scene.enemyList) {
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy < 90 * 90) {
        scene.fx.electricArc(p.x, p.y, e.x, e.y, PAL.cyan);
        e.damage(22);
        if ((e as { stun?: (ms: number) => void }).stun) (e as { stun: (ms: number) => void }).stun(3000);
      }
    }
    // player danger
    const pdx = scene.playerPos.x - p.x;
    const pdy = scene.playerPos.y - p.y;
    if (pdx * pdx + pdy * pdy < 60 * 60) {
      scene.damagePlayer(12, p.x, p.y);
    }
    for (const n of near(p.x, p.y, 120)) {
      visited.add(n);
      queue.push(n);
    }
  }
  if (visited.size > 0) {
    scene.sfx('explosionElectric');
    for (const p of visited) scene.fx.spawnSpark(p.x, p.y, PAL.cyan, 0, -60, 0.3, 1);
  }
}

export class Puddle extends Phaser.GameObjects.Image {
  private flashTween: Phaser.Tweens.Tween | null = null;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'puddle');
    scene.add.existing(this);
    this.setDepth(43);
    this.setAlpha(0.9);
  }

  flash(): void {
    this.flashTween?.stop();
    this.setTint(PAL.white);
    this.setAlpha(1);
    this.flashTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.9,
      duration: 500,
      onComplete: () => this.clearTint(),
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Security uplink — destroy to open the main gate + disable shields
// ─────────────────────────────────────────────────────────────

export class Uplink extends DamageableSprite {
  private sceneW: WorldScene;
  private cfg: { onDestroyed?: () => void };
  private smokeTimer = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: { onDestroyed?: () => void } = {}) {
    super(scene, x, y, 'uplink', 130, {});
    this.sceneW = scene as WorldScene;
    this.cfg = cfg;
    this.setDepth(47);
    this.setCircle(16, 12, 30);
  }

  takeExplosionDamage(damage: number, _k: ExplosionKind, _x: number, _y: number): boolean {
    this.damage(damage);
    return !this.alive;
  }

  damage(amount: number): void {
    if (!this.alive) return;
    super.damage(amount);
    this.sceneW.fx.floatText(this.x, this.y - 30, String(amount), PAL.cyan, 0.9);
    this.sceneW.sfx('enemyHit');
    if (!this.alive) {
      this.sceneW.explosions.explode('electric', this.x, this.y, { sourceId: this.id });
      // disable shields district-wide (stun all shield units)
      for (const e of this.sceneW.enemyList) {
        if ((e as { stun?: (ms: number) => void }).stun) (e as { stun: (ms: number) => void }).stun(20000);
      }
      this.cfg.onDestroyed?.();
      this.destroy();
    }
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.applyFlashAndKnock(dt);
    if (this.hp < this.maxHp * 0.5) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = 0.2;
        this.sceneW.fx.spawnSmoke(this.x + (Math.random() - 0.5) * 8, this.y - 20, 0.8, 1, -30);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Rescue capsules & memory crystals (interactables)
// ─────────────────────────────────────────────────────────────

export interface Interactable {
  readonly intId: string;
  x: number;
  y: number;
  radius: number;
  labelKey: string;
  holdTime: number;
  kind: 'press' | 'hold';
  enabled: boolean;
  onInteract(): void;
}

export class RescueCapsule extends Phaser.GameObjects.Image implements Interactable {
  readonly intId: string;
  radius = 58;
  labelKey: string;
  holdTime = 1.5;
  kind = 'hold' as const;
  enabled = true;
  private sceneW: WorldScene;
  private opened = false;
  private pulse = 0;
  private cfg: { onRescued?: (id: string) => void; name?: string };

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, cfg: { onRescued?: (id: string) => void; name?: string } = {}) {
    super(scene, x, y, 'capsule');
    scene.add.existing(this);
    this.sceneW = scene as WorldScene;
    this.intId = id;
    this.cfg = cfg;
    this.labelKey = 'ui.critical'; // replaced at runtime with rescue label
    this.setDepth(48);
  }

  update(dt: number): void {
    this.pulse += dt * 3;
    this.setScale(1 + Math.sin(this.pulse) * 0.03);
  }

  onInteract(): void {
    if (this.opened) return;
    this.opened = true;
    this.enabled = false;
    this.sceneW.sfx('capsuleOpen');
    this.setTexture('capsule');
    this.setTint(PAL.teal);
    this.sceneW.fx.spawnGlow(this.x, this.y, PAL.teal, 1.2, 0.4);
    // civilian walks out (simple visual)
    const civ = this.scene.add.image(this.x + 20, this.y, 'fx-dot');
    civ.setTint(PAL.white);
    civ.setScale(2);
    this.scene.tweens.add({
      targets: civ,
      x: this.x + 60,
      alpha: 0,
      duration: 1200,
      onComplete: () => civ.destroy(),
    });
    this.cfg.onRescued?.(this.intId);
  }

  openFast(): void {
    this.onInteract();
  }
}

export class EvacCapsule extends Phaser.GameObjects.Image implements Interactable {
  readonly intId: string;
  radius = 54;
  labelKey = 'ui.critical';
  holdTime = 1.2;
  kind = 'hold' as const;
  enabled = true;
  private sceneW: WorldScene;
  private opened = false;
  private cfg: { onOpened?: (id: string) => void };

  constructor(scene: Phaser.Scene, x: number, y: number, id: string, cfg: { onOpened?: (id: string) => void } = {}) {
    super(scene, x, y, 'evac');
    scene.add.existing(this);
    this.sceneW = scene as WorldScene;
    this.intId = id;
    this.cfg = cfg;
    this.setDepth(48);
    this.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  onInteract(): void {
    if (this.opened) return;
    this.opened = true;
    this.enabled = false;
    this.sceneW.sfx('capsuleOpen');
    this.setTint(PAL.teal);
    this.sceneW.fx.spawnGlow(this.x, this.y, PAL.teal, 1, 0.4);
    this.cfg.onOpened?.(this.intId);
  }
}

export class MemoryCrystal extends Phaser.GameObjects.Image implements Interactable {
  readonly intId: string;
  radius = 46;
  labelKey = 'ui.critical';
  holdTime = 0;
  kind = 'press' as const;
  enabled = true;
  private sceneW: WorldScene;
  private memId: string;
  private taken = false;
  private pulse = 0;
  private cfg: { onCollect?: (id: string) => boolean }; // returns false if locked

  constructor(scene: Phaser.Scene, x: number, y: number, memId: string, cfg: { onCollect?: (id: string) => boolean } = {}) {
    super(scene, x, y, 'memory');
    scene.add.existing(this);
    this.sceneW = scene as WorldScene;
    this.intId = `mem:${memId}`;
    this.memId = memId;
    this.cfg = cfg;
    this.setDepth(49);
    this.setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Auto-collect on touch (memory pickups are proximity-based). */
  update(dt: number): void {
    this.pulse += dt * 2.4;
    this.y += Math.sin(this.pulse * 0.7) * 0.12;
    this.setScale(1 + Math.sin(this.pulse) * 0.08);
    const p = this.sceneW.playerPos;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    if (dx * dx + dy * dy < 40 * 40 && !this.taken) {
      this.collect();
    }
  }

  private collect(): void {
    if (this.taken) return;
    this.taken = true;
    const ok = this.cfg.onCollect?.(this.memId) ?? true;
    if (!ok) {
      this.taken = false;
      return;
    }
    this.enabled = false;
    this.sceneW.sfx('memory');
    this.sceneW.fx.spawnGlow(this.x, this.y, PAL.cyan, 1.6, 0.5);
    this.sceneW.fx.spawnSpark(this.x, this.y, PAL.cyan, 0, -80, 0.5, 1.4);
    this.scene.tweens.add({
      targets: this,
      scale: 2.2,
      alpha: 0,
      duration: 320,
      onComplete: () => this.destroy(),
    });
  }

  onInteract(): void {
    this.collect();
  }
}

export class Relay extends Phaser.GameObjects.Image implements Interactable {
  readonly intId: string = 'relay';
  radius = 64;
  labelKey = 'ui.critical';
  holdTime = 1.4;
  kind = 'hold' as const;
  enabled = true;
  private sceneW: WorldScene;
  private stage = 0;
  private cfg: { onStabilized?: () => void };
  private pulse = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: { onStabilized?: () => void } = {}) {
    super(scene, x, y, 'relay');
    scene.add.existing(this);
    this.sceneW = scene as WorldScene;
    this.cfg = cfg;
    this.setDepth(48);
  }

  update(dt: number): void {
    this.pulse += dt * 2;
    this.setScale(1 + Math.sin(this.pulse) * 0.04);
  }

  onInteract(): void {
    if (this.stage >= 2) return;
    this.stage++;
    this.sceneW.sfx('interact');
    this.sceneW.fx.spawnGlow(this.x, this.y, PAL.orange, 1, 0.35);
    if (this.stage >= 2) {
      this.enabled = false;
      this.setTint(PAL.teal);
      this.cfg.onStabilized?.();
    }
  }

  get stageCount(): number {
    return this.stage;
  }
}

// ─────────────────────────────────────────────────────────────
// Gates
// ─────────────────────────────────────────────────────────────

export class Gate extends DamageableSprite {
  gateId: string;
  private sceneW: WorldScene;
  private open = false;
  private cfg: { onOpened?: (id: string) => void };
  private pulse = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, gateId: string, cfg: { onOpened?: (id: string) => void } = {}) {
    super(scene, x, y, 'gate', 120, {});
    this.sceneW = scene as WorldScene;
    this.gateId = gateId;
    this.cfg = cfg;
    this.setDepth(55);
    this.setDisplaySize(w, h);
    this.refreshBody();
    // horizontal gates: widen body; vertical: tall body
    if (w > h) {
      (this.body as Phaser.Physics.Arcade.Body).setSize(w, 18, true);
    } else {
      (this.body as Phaser.Physics.Arcade.Body).setSize(18, h, true);
    }
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Scripted open (blast / objective). */
  openGate(): void {
    if (this.open) return;
    this.open = true;
    this.sceneW.sfx('gateOpen');
    this.sceneW.fx.spawnGlow(this.x, this.y, PAL.cyan, 2, 0.5);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleY: 0.05,
      duration: 350,
      onComplete: () => {
        this.destroy();
      },
    });
    // make the door tiles walkable for pathfinding
    this.sceneW.openDoor(this.gateId);
    this.cfg.onOpened?.(this.gateId);
  }

  /** Breach module: dash damage. */
  damage(amount: number): void {
    if (this.open) return;
    super.damage(amount);
    this.setTintFill(PAL.white);
    this.sceneW.time.delayedCall(60, () => this.clearTint());
    if (this.hp <= 0) this.openGate();
  }

  takeExplosionDamage(damage: number, _k: ExplosionKind, _x: number, _y: number): boolean {
    this.damage(damage);
    return !this.alive;
  }

  update(dt: number): void {
    this.pulse += dt * 3;
    this.setAlpha(0.75 + Math.sin(this.pulse) * 0.25);
  }
}

// ─────────────────────────────────────────────────────────────
// Tram — blocks the avenue until the transitHalt memory unlocks the roof
// ─────────────────────────────────────────────────────────────

export class Tram extends Phaser.GameObjects.Image {
  private sceneW: WorldScene;
  private unlocked = false;
  private ramp: Phaser.GameObjects.Image | null = null;
  private roof: Phaser.GameObjects.Rectangle | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'tram');
    scene.add.existing(this);
    this.sceneW = scene as WorldScene;
    this.setDepth(47);
  }

  unlockRoof(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    const s = this.sceneW;
    s.sfx('gateOpen');
    // visual ramp + walkable roof zone (tiles above the tram)
    this.ramp = s.add.image(this.x - 104, this.y, 'barrier');
    this.ramp.setRotation(-Math.PI / 2);
    this.ramp.setTint(PAL.teal);
    this.ramp.setAlpha(0.9);
    this.roof = s.add.rectangle(this.x, this.y - 32, 160, 30, 0x38e8ff, 0.12);
    this.roof.setStrokeStyle(1, 0x38e8ff, 0.4);
    s.fx.spawnGlow(this.x, this.y - 32, PAL.teal, 1.5, 0.4);
    // mark the crossing as walkable for pathfinding (roof = elevated)
    s.events.emit('tram-open', this.x, this.y);
  }
}

// ─────────────────────────────────────────────────────────────
// Decorative props
// ─────────────────────────────────────────────────────────────

export class DecorativeProp extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, opts: { depth?: number; rotation?: number; tint?: number; scale?: number; flicker?: boolean } = {}) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    this.setDepth(opts.depth ?? 44);
    if (opts.rotation) this.setRotation(opts.rotation);
    if (opts.tint) this.setTint(opts.tint);
    if (opts.scale) this.setScale(opts.scale);
    if (opts.flicker) {
      scene.tweens.add({
        targets: this,
        alpha: 0.35,
        duration: 90 + Math.random() * 120,
        yoyo: true,
        repeat: -1,
        repeatDelay: 200 + Math.random() * 700,
      });
    }
  }
}
