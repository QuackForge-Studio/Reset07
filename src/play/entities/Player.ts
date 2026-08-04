/**
 * RESET//07 — K-07, the player robot.
 *
 * Movement (accelerated), mouse/gamepad/touch aiming, heat-based energy
 * weapon, dash with afterimages + i-frames, overdrive with pulse + marks.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { DamageableSprite } from './base';
import type { EffectManager } from '../systems/Effects';
import type { InputState } from '../systems/InputState';
import { calcDamage } from '../systems/combat';
import type { ModuleId } from '../data/modules';
import { pickPlayerAnim, type PlayerAnimChoice } from '../systems/animLogic';

export interface PlayerEvents {
  onFire?: (x: number, y: number, angle: number) => void;
  onDash?: () => void;
  onOverdrive?: () => void;
  onOverdriveEnd?: () => void;
  onDeath?: () => void;
  onHit?: (dmg: number) => void;
  onWeaponArc?: (x: number, y: number, targets: Array<{ x: number; y: number }>) => void;
}

const MAX_HEAT = 100;
const BOLT_DMG = 8;
const FIRE_INTERVAL = 0.1;
const HEAT_PER_SHOT = 5;
const COOL_RATE = 17;
const OVERHEAT_COOLDOWN = 1.1;

export class Player extends DamageableSprite {
  speed = 195;
  maxHp = 100;
  aimAngle = 0;
  firing = false;
  moving = false;
  private accel = 1700;
  private friction = 1150;
  private dashReady = true;
  private dashCd = 0;
  private dashUntil = 0;
  private invulnUntil = 0;
  private dashDirX = 0;
  private dashDirY = 0;
  private afterimageTimer = 0;
  private heat = 0;
  private overheatUntil = 0;
  private fireTimer = 0;
  private overdriveCharge = 0;
  private overdriveUntil = 0;
  private overdriveDur = 6;
  private odPulseDone = false;
  private ev: PlayerEvents;
  fx: EffectManager;
  modules: ModuleId[];
  private dashCdTotal = 1.5;
  private armL: Phaser.GameObjects.Image;
  private armR: Phaser.GameObjects.Image;
  private glow: Phaser.GameObjects.Image;
  private dashTrail: Phaser.GameObjects.Image[] = [];
  private lowHpWarned = false;
  private animChoice: PlayerAnimChoice = { state: 'idle', row: 'up', flipX: false };

  constructor(scene: Phaser.Scene, x: number, y: number, fx: EffectManager, modules: ModuleId[], ev: PlayerEvents = {}) {
    const tex = scene.textures.exists('player-sheet') ? 'player-sheet' : 'player';
    super(scene, x, y, tex, 100, { onDie: () => ev.onDeath?.() });
    this.fx = fx;
    this.modules = modules;
    this.ev = ev;
    this.setCircle(16, 16, 16);
    this.setDepth(80);
    this.setDrag(0);
    this.armL = scene.add.image(x, y, 'fx-dot').setVisible(false);
    this.armR = scene.add.image(x, y, 'fx-dot').setVisible(false);
    this.glow = scene.add.image(x, y, 'fx-glow');
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.glow.setTint(PAL.cyan);
    this.glow.setScale(1.1);
    this.glow.setAlpha(0.55);
    this.glow.setDepth(79);
    this.setScale(1);
  }

  get isDashing(): boolean {
    return performance.now() < this.dashUntil;
  }

  get invulnerable(): boolean {
    return performance.now() < this.invulnUntil;
  }

  get overdriveActive(): boolean {
    return performance.now() < this.overdriveUntil;
  }

  get overdrivePct(): number {
    return this.overdriveCharge / 100;
  }

  get dashPct(): number {
    return this.dashReady ? 1 : 1 - this.dashCd / this.dashCdTotal;
  }

  get overheat(): boolean {
    return performance.now() < this.overheatUntil;
  }

  get heatPct(): number {
    return this.overheat ? 1 : this.heat / MAX_HEAT;
  }

  get fireRateMul(): number {
    return this.overdriveActive ? 1.75 : 1;
  }

  addOverdriveCharge(amount: number): void {
    if (this.overdriveActive) return;
    this.overdriveCharge = Math.min(100, this.overdriveCharge + amount);
  }

  tryOverdrive(): void {
    if (this.overdriveActive || this.overdriveCharge < 100) return;
    this.overdriveCharge = 0;
    this.overdriveUntil = performance.now() + this.overdriveDur * 1000;
    this.odPulseDone = false;
  }

  dash(dirX: number, dirY: number): void {
    if (!this.dashReady || this.overheat) return;
    let dx = dirX;
    let dy = dirY;
    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.aimAngle);
      dy = Math.sin(this.aimAngle);
    }
    const len = Math.hypot(dx, dy) || 1;
    this.dashDirX = dx / len;
    this.dashDirY = dy / len;
    this.dashReady = false;
    this.dashCd = this.dashCdTotal;
    this.dashUntil = performance.now() + 170;
    this.invulnUntil = performance.now() + 260;
    this.afterimageTimer = 0;
    this.ev.onDash?.();
  }

  damage(amount: number): void {
    if (this.invulnerable || (this.overdriveActive && this.isDashing)) return;
    if (!this.alive) return;
    super.damage(amount);
    this.invulnUntil = performance.now() + 420;
    this.ev.onHit?.(amount);
    if (this.hp <= 30 && !this.lowHpWarned) {
      this.lowHpWarned = true;
    }
    if (this.hp > 30) this.lowHpWarned = false;
  }

  /** Bullets damage K-07 (enemy projectiles). */
  takeExplosionDamage(damage: number, _k: unknown, _x: number, _y: number): boolean {
    this.damage(damage);
    return !this.alive;
  }

  update(dt: number, input: InputState, enemies: ReadonlyArray<{ x: number; y: number; alive: boolean }>): void {
    if (!this.alive) return;
    const now = performance.now();

    // ── cooldowns ──
    if (!this.dashReady) {
      this.dashCd -= dt;
      if (this.dashCd <= 0) {
        this.dashReady = true;
        (this.scene as Phaser.Scene & { sfx?: (n: string) => void }).sfx?.('dashReady');
      }
    }

    // ── movement ──
    let mx = input.moveX;
    let my = input.moveY;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }
    this.moving = mag > 0.15;
    if (this.isDashing) {
      this.setVelocity(this.dashDirX * 720, this.dashDirY * 720);
      // afterimages (each fades out quickly so the trail never lingers)
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = 0.045;
        const img = this.scene.add.image(this.x, this.y, this.texture.key);
        img.setFrame(this.frame.name);
        img.setTint(PAL.cyan);
        img.setAlpha(0.4);
        img.setDepth(78);
        this.dashTrail.push(img);
        this.scene.tweens.add({
          targets: img,
          alpha: 0,
          scale: 0.55,
          duration: 420,
          ease: 'Quad.easeOut',
          onComplete: () => {
            img.destroy();
            const i = this.dashTrail.indexOf(img);
            if (i >= 0) this.dashTrail.splice(i, 1);
          },
        });
      }
    } else {
      const ax = mx * this.accel;
      const ay = my * this.accel;
      const vx = this.body ? (this.body as Phaser.Physics.Arcade.Body).velocity.x : 0;
      const vy = this.body ? (this.body as Phaser.Physics.Arcade.Body).velocity.y : 0;
      let nvx = vx + ax * dt;
      let nvy = vy + ay * dt;
      // friction
      const sp = Math.hypot(nvx, nvy);
      if (sp > 0) {
        const f = Math.max(0, 1 - (this.friction * dt) / sp);
        nvx *= f;
        nvy *= f;
      }
      const maxV = this.speed;
      const sp2 = Math.hypot(nvx, nvy);
      if (sp2 > maxV) {
        nvx = (nvx / sp2) * maxV;
        nvy = (nvy / sp2) * maxV;
      }
      this.setVelocity(nvx, nvy);
    }

    // ── aim (with aim assist) ──
    let aimSet = input.aimActive;
    let aa = input.aimAngle;
    if (!aimSet && input.autoAim) {
      const t = nearestEnemy(this.x, this.y, enemies, 340);
      if (t) {
        aa = Math.atan2(t.y - this.y, t.x - this.x);
        aimSet = true;
      }
    }
    if (aimSet) {
      // aim assist: gentle snap toward nearby enemies
      if (input.aimAssist > 0) {
        const t = nearestEnemyInCone(this.x, this.y, aa, enemies, 0.55, 380);
        if (t) {
          const target = Math.atan2(t.y - this.y, t.x - this.x);
          const diff = Phaser.Math.Angle.Wrap(target - aa);
          aa += diff * input.aimAssist * 0.6;
        }
      }
      this.aimAngle = aa;
    }

    // ── weapon ──
    this.fireTimer -= dt;
    const wantFire = input.fire || (input.touchAutoFire && this.autoTargetInRange(enemies));
    if (wantFire && !this.overheat && this.fireTimer <= 0 && this.aimHasTarget(input)) {
      this.fireTimer = FIRE_INTERVAL / this.fireRateMul;
      this.fireBolt();
    }
    // cooling
    if (this.heat >= MAX_HEAT && now >= this.overheatUntil) {
      // overheat ended — weapon snaps back to cold (and signals ready)
      this.heat = 0;
      (this.scene as Phaser.Scene & { sfx?: (n: string) => void }).sfx?.('dashReady');
    } else if (!this.overheat) {
      this.heat = Math.max(0, this.heat - COOL_RATE * (this.modules.includes('cooling') ? 1.35 : 1) * dt);
    }

    // ── overdrive pulse ──
    if (this.overdriveActive && !this.odPulseDone) {
      this.odPulseDone = true;
      this.ev.onOverdrive?.();
    }

    // visuals
    this.glow.setPosition(this.x, this.y);
    this.glow.setAlpha(this.overdriveActive ? 0.9 : 0.5);
    this.glow.setScale(this.overdriveActive ? 1.6 : 1.1);
    this.setScale(this.overdriveActive ? 1.15 : 1);
    if (this.overdriveActive) {
      this.setTint(PAL.white);
    } else if (this.flashTimer <= 0) {
      this.clearTint();
    }
    this.applyFlashAndKnock(dt);

    // ── animation: facing from aim while firing, movement while running ──
    const choice = pickPlayerAnim({
      firing: wantFire && !this.overheat,
      moving: this.moving || this.isDashing,
      aimAngle: this.aimAngle,
      moveX: mx,
      moveY: my,
      last: this.animChoice,
    });
    this.setFlipX(choice.flipX);
    if (choice.row !== this.animChoice.row || choice.state !== this.animChoice.state) {
      this.play(`p-${choice.state}-${choice.row}`);
    }
    this.animChoice = choice;

    this.armL.setPosition(this.x, this.y);
    this.armR.setPosition(this.x, this.y);
  }

  private aimHasTarget(input: InputState): boolean {
    if (input.aimActive || input.autoAim) return true;
    return input.fire; // mouse/gamepad fire without explicit aim → fire toward current aim
  }

  private autoTargetInRange(enemies: ReadonlyArray<{ x: number; y: number; alive: boolean }>): boolean {
    if (!enemies.length) return false;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (dx * dx + dy * dy < 240 * 240) return true;
    }
    return false;
  }

  private fireBolt(): void {
    this.heat += HEAT_PER_SHOT;
    if (this.heat >= MAX_HEAT) {
      this.heat = MAX_HEAT;
      this.overheatUntil = performance.now() + OVERHEAT_COOLDOWN * 1000;
      this.fx.spawnSmoke(this.x, this.y, 1.2, 0.8, -40);
      (this.scene as Phaser.Scene & { sfx?: (n: string) => void }).sfx?.('thud');
      return;
    }
    const a = this.aimAngle;
    const bx = this.x + Math.cos(a) * 26;
    const by = this.y + Math.sin(a) * 26;
    this.ev.onFire?.(bx, by, a);
    this.fx.spawnSpark(bx, by, PAL.cyan, Math.cos(a) * 60, Math.sin(a) * 60, 0.12, 1.2);
    (this.scene as Phaser.Scene & { sfx?: (n: string) => void }).sfx?.('weapon');
    // subtle recoil
    if (this.body) {
      const b = this.body as Phaser.Physics.Arcade.Body;
      b.velocity.x -= Math.cos(a) * 14;
      b.velocity.y -= Math.sin(a) * 14;
    }
  }

  /** Called by the scene when a bolt hits: charge overdrive + optional arc chain. */
  onBoltHit(enemy: { x: number; y: number; alive: boolean }): void {
    if (!enemy.alive) return;
    this.addOverdriveCharge(2.2);
    if (this.modules.includes('arc')) {
      // handled by the scene's bolt system via onWeaponArc
      this.ev.onWeaponArc?.(enemy.x, enemy.y, []);
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  destroy(fromScene?: boolean): void {
    this.glow.destroy();
    for (const t of this.dashTrail) t.destroy();
    this.dashTrail = [];
    this.armL.destroy();
    this.armR.destroy();
    super.destroy(fromScene);
  }
}

function nearestEnemy(
  x: number,
  y: number,
  enemies: ReadonlyArray<{ x: number; y: number; alive: boolean }>,
  maxDist: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bd = maxDist * maxDist;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

function nearestEnemyInCone(
  x: number,
  y: number,
  angle: number,
  enemies: ReadonlyArray<{ x: number; y: number; alive: boolean }>,
  cone: number,
  maxDist: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bd = maxDist * maxDist;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d > bd) continue;
    const a = Math.atan2(dy, dx);
    if (Math.abs(Phaser.Math.Angle.Wrap(a - angle)) > cone) continue;
    bd = d;
    best = e;
  }
  return best;
}

/** Shared bolt collision result helper. */
export function boltDamage(overdriveMarked: boolean, overdriveActive: boolean): number {
  return calcDamage({
    base: BOLT_DMG,
    overdriveMarked,
    multiplier: overdriveActive ? 1.25 : 1,
  });
}
