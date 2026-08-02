/**
 * RESET//07 — enemy AI: patrol drone, hunter, shield unit, detonation drone.
 *
 * All behaviors are readable: telegraphed attacks, LOS steering + grid
 * pathfinding when blocked, separation between enemies, quality-scaled FX.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { DamageableSprite, Telegraph, deathBurst } from './base';
import type { WorldScene } from '../types';
import { ENEMY_STATS, type EnemyKind } from '../data/enemies';
import { calcDamage } from '../systems/combat';
import type { ExplosionKind } from '../systems/Explosions';

export interface EnemyHooks {
  onDeath?: (e: EnemyBase, byExplosion: boolean) => void;
  onPlayerHit?: (dmg: number) => void;
  onShieldStun?: () => void;
}

export abstract class EnemyBase extends DamageableSprite {
  kind: EnemyKind;
  protected sceneW: WorldScene;
  speed: number;
  touchDamage: number;
  protected enemyHooks: EnemyHooks;
  protected telegraph = new Telegraph(this.scene, this.x, this.y);
  protected aiState: 'idle' | 'seek' | 'attack' | 'recover' = 'idle';
  protected stateTimer = 0;
  protected path: Array<{ x: number; y: number }> = [];
  protected pathTimer = 0;
  protected marked = false; // overdrive mark
  protected stunnedUntil = 0;
  protected flashTimer = 0;
  protected facing = 0;
  protected separation = 40;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind, texture: string, hooks: EnemyHooks) {
    const stats = ENEMY_STATS[kind];
    super(scene, x, y, texture, stats.hp, {});
    this.kind = kind;
    this.speed = stats.speed;
    this.touchDamage = stats.touchDamage;
    this.enemyHooks = hooks;
    this.sceneW = scene as WorldScene;
    this.setCircle(stats.radius, 20 - stats.radius, 20 - stats.radius);
    this.setDepth(60);
  }

  get stunned(): boolean {
    return performance.now() < this.stunnedUntil;
  }

  stun(ms: number): void {
    this.stunnedUntil = performance.now() + ms;
    this.aiState = 'idle';
    this.telegraph.hide();
    if (ms > 500) {
      const fx = this.sceneW.fx;
      fx.spawnSpark(this.x, this.y, PAL.cyan, 0, 0, 0.4, 1);
    }
  }

  mark(): void {
    this.marked = true;
    this.setTint(PAL.magenta);
  }

  damage(amount: number): void {
    if (!this.alive) return;
    const dmg = calcDamage({ base: amount, overdriveMarked: this.marked });
    super.damage(dmg);
    this.sceneW.fx.floatText(this.x, this.y - 18, String(dmg), this.marked ? PAL.magenta : PAL.white, 0.9);
    if (this.alive) {
      (this.sceneW as WorldScene).sfx('enemyHit');
    } else {
      this.sceneW.sfx('enemyDie');
    }
  }

  takeExplosionDamage(damage: number, _kind: ExplosionKind, x: number, y: number): boolean {
    if (!this.alive) return true;
    const dx = this.x - x;
    const dy = this.y - y;
    const dist = Math.hypot(dx, dy) || 1;
    this.knockback((dx / dist) * 380, (dy / dist) * 380);
    const dmg = calcDamage({ base: damage, overdriveMarked: this.marked });
    super.damage(dmg);
    this.sceneW.fx.floatText(this.x, this.y - 18, String(dmg), PAL.orange, 0.9);
    if (!this.alive) {
      this.sceneW.sfx('enemyDie');
    }
    return !this.alive;
  }

  tryIgnite(_x: number, _y: number, _kind: ExplosionKind): ExplosionKind | null {
    return null;
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.telegraph.destroy();
    deathBurst(this.sceneW.fx, this.x, this.y, PAL.cyan);
    this.enemyHooks.onDeath?.(this, true);
    this.destroy();
  }

  /** Separation + collision avoidance against other enemies. */
  protected separate(enemies: ReadonlyArray<EnemyBase>, dt: number): void {
    for (const e of enemies) {
      if (e === this || !e.alive) continue;
      const dx = this.x - e.x;
      const dy = this.y - e.y;
      const d2 = dx * dx + dy * dy;
      const min = this.separation + 8;
      if (d2 < min * min && d2 > 0.01) {
        const d = Math.sqrt(d2);
        this.x += (dx / d) * 60 * dt;
        this.y += (dy / d) * 60 * dt;
      }
    }
  }

  /** Steering: direct if LOS, grid path otherwise. Returns move vector. */
  protected steerTo(tx: number, ty: number, dt: number): { x: number; y: number } {
    const fromTile = { x: Math.round(this.x / 32), y: Math.round(this.y / 32) };
    const toTile = { x: Math.round(tx / 32), y: Math.round(ty / 32) };
    const pf = this.sceneW.pathfinder;
    const px = this.x / 32;
    const py = this.y / 32;
    if (pf.lineOfSight(Math.floor(px), Math.floor(py), toTile.x, toTile.y)) {
      this.path = [];
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy) || 1;
      return { x: (dx / d) * this.speed, y: (dy / d) * this.speed };
    }
    this.pathTimer -= dt;
    if (this.pathTimer <= 0 || this.path.length === 0) {
      this.pathTimer = 0.7;
      const p = pf.findPath(fromTile.x, fromTile.y, toTile.x, toTile.y);
      this.path = p ? p.slice(1) : [];
    }
    while (this.path.length > 1) {
      const wp = this.path[0];
      if (Math.abs(wp.x * 32 - this.x) < 10 && Math.abs(wp.y * 32 - this.y) < 10) this.path.shift();
      else break;
    }
    const wp = this.path[0];
    if (!wp) return { x: 0, y: 0 };
    const dx = wp.x * 32 - this.x;
    const dy = wp.y * 32 - this.y;
    const d = Math.hypot(dx, dy) || 1;
    return { x: (dx / d) * this.speed, y: (dy / d) * this.speed };
  }

  protected applyMove(vx: number, vy: number, dt: number, mul = 1): void {
    if (this.stunned) {
      this.setVelocity(0, 0);
      return;
    }
    this.setVelocity(vx * mul, vy * mul);
    if (Math.abs(vx) > 2 || Math.abs(vy) > 2) {
      this.facing = Math.atan2(vy, vx);
      this.setRotation(this.facing);
    }
    this.applyFlashAndKnock(dt);
  }

  /** Default contact damage. */
  protected contactDamage(player: { x: number; y: number }, dmg: number): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    if (dx * dx + dy * dy < 30 * 30) {
      this.enemyHooks.onPlayerHit?.(dmg);
    }
  }

  destroy(fromScene?: boolean): void {
    this.telegraph.destroy();
    super.destroy(fromScene);
  }
}

// ─────────────────────────────────────────────────────────────
// Patrol drone — keeps range, strafes, telegraphed bursts
// ─────────────────────────────────────────────────────────────

export class PatrolDrone extends EnemyBase {
  private burstTimer = 1.4;
  private burstLeft = 0;
  private burstDelay = 0;
  private telegraphing = 0;
  private strafePhase = Math.random() * 6;
  private playerRef: { x: number; y: number };
  private training: boolean;
  private anchorX: number;
  private anchorY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, player: { x: number; y: number }, hooks: EnemyHooks, training = false) {
    super(scene, x, y, 'drone', 'enemy-drone', hooks);
    this.playerRef = player;
    this.training = training;
    this.anchorX = x;
    this.anchorY = y;
  }

  update(dt: number): void {
    if (!this.alive) return;
    const p = this.playerRef;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (this.training) {
      // tutorial drones hover at their anchor (gentle bob) and turn to face the player
      this.strafePhase += dt * 2;
      const bob = Math.sin(this.strafePhase) * 14;
      const move = this.steerTo(this.anchorX, this.anchorY + bob, dt);
      this.applyMove(move.x * 0.75, move.y * 0.75, dt);
    } else {
      const lo = 210;
      const hi = 330;
      const desired = dist > hi ? hi : dist < lo ? lo : dist;
      const toPlayer = { x: dx / (dist || 1), y: dy / (dist || 1) };
      this.strafePhase += dt * 1.6;
      const strafe = { x: -toPlayer.y, y: toPlayer.x };
      const wantX = p.x - toPlayer.x * desired;
      const wantY = p.y - toPlayer.y * desired;
      const move = this.steerTo(wantX, wantY, dt);
      const sx = move.x * 0.55 + strafe.x * this.speed * 0.5 * Math.sin(this.strafePhase);
      const sy = move.y * 0.55 + strafe.y * this.speed * 0.5 * Math.sin(this.strafePhase);
      this.applyMove(sx, sy, dt);
    }

    // attack cycle
    this.burstTimer -= dt;
    const wasTelegraphing = this.telegraphing > 0;
    this.telegraphing -= dt;
    const aim = Math.atan2(dy, dx);
    if (this.telegraphing > 0) {
      // face the shot while telegraphing so the muzzle matches the beam
      this.facing = aim;
      this.setRotation(aim);
      this.telegraph.show(this.x, this.y, aim, dist, PAL.danger, 0.45);
    } else if (wasTelegraphing) {
      this.telegraph.hide();
      this.burstLeft = 3;
      this.burstDelay = 0;
    } else if (this.burstLeft > 0) {
      this.burstDelay -= dt;
      if (this.burstDelay <= 0) {
        this.burstLeft--;
        this.burstDelay = 0.13;
        this.fireBolt(aim);
      }
      this.facing = aim;
      this.setRotation(aim);
    } else if (this.burstTimer <= 0 && dist < 420 && dist > 60) {
      this.burstTimer = (this.training ? 3.2 : 1.9) + Math.random() * 0.8;
      this.telegraphing = 0.38;
      this.sceneW.sfx('beep');
    } else if (this.burstTimer <= 0) {
      this.burstTimer = 0.6;
    }
    this.separate(this.sceneW.enemyList, dt);
  }

  private fireBolt(angle: number): void {
    const scene = this.sceneW;
    const b = scene.physics.add.sprite(this.x + Math.cos(angle) * 18, this.y + Math.sin(angle) * 18, 'bullet-enemy');
    scene.enemyBolts.add(b); // add BEFORE setting velocity (group add resets the body)
    b.setRotation(angle);
    b.setDepth(70);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setCircle(4, 4, 2);
    body.setVelocity(Math.cos(angle) * 330, Math.sin(angle) * 330);
    b.setData('dmg', 8);
    b.setData('life', 2.2);
  }
}

// ─────────────────────────────────────────────────────────────
// Hunter — telegraphs, then charges in a straight line
// ─────────────────────────────────────────────────────────────

export class Hunter extends EnemyBase {
  private chargeTimer = 0;
  private chargeDir = { x: 0, y: 0 };
  private charging = false;
  private recoverTimer = 0;
  private playerRef: { x: number; y: number };
  private initCharge = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, player: { x: number; y: number }, hooks: EnemyHooks) {
    super(scene, x, y, 'hunter', 'enemy-hunter', hooks);
    this.playerRef = player;
  }

  update(dt: number): void {
    if (!this.alive) return;
    const p = this.playerRef;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (this.charging) {
      this.telegraph.hide();
      this.setVelocity(this.chargeDir.x * 660, this.chargeDir.y * 660);
      this.setRotation(Math.atan2(this.chargeDir.y, this.chargeDir.x));
      this.contactDamage(p, this.touchDamage);
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0) {
        this.charging = false;
        this.recoverTimer = 0.65;
      }
    } else if (this.recoverTimer > 0) {
      this.recoverTimer -= dt;
      this.applyMove(0, 0, dt);
    } else {
      const move = this.steerTo(p.x, p.y, dt);
      this.applyMove(move.x, move.y, dt);
      this.chargeTimer -= dt;
      if (this.chargeTimer <= 0 && dist < 300 && dist > 40 && this.sceneW.pathfinder.lineOfSight(Math.round(this.x / 32), Math.round(this.y / 32), Math.round(p.x / 32), Math.round(p.y / 32))) {
        this.chargeTimer = 0;
        this.initCharge = 0.42;
        this.telegraph.show(this.x, this.y, Math.atan2(dy, dx), dist, PAL.danger, 0.8);
        this.sceneW.sfx('beep');
      } else if (this.chargeTimer < -0.4) {
        this.chargeTimer = 0.6 + Math.random() * 1.2;
      }
      if (this.initCharge > 0) {
        this.initCharge -= dt;
        if (this.initCharge <= 0) {
          this.charging = true;
          this.chargeTimer = 0.52;
          const d = Math.hypot(dx, dy) || 1;
          this.chargeDir = { x: dx / d, y: dy / d };
          this.sceneW.sfx('thud');
        }
      }
    }
    this.separate(this.sceneW.enemyList, dt);
  }
}

// ─────────────────────────────────────────────────────────────
// Shield unit — frontal shield, slow turn, telegraphed slam
// ─────────────────────────────────────────────────────────────

export class ShieldUnit extends EnemyBase {
  private shieldArc: Phaser.GameObjects.Image;
  private slamTimer = 2.2;
  private slamTelegraph = 0;
  private playerRef: { x: number; y: number };
  private disabledByElectric = false;

  constructor(scene: Phaser.Scene, x: number, y: number, player: { x: number; y: number }, hooks: EnemyHooks) {
    super(scene, x, y, 'shield', 'enemy-shield', hooks);
    this.playerRef = player;
    this.shieldArc = scene.add.image(x, y, 'shield-arc');
    this.shieldArc.setDepth(61);
    this.shieldArc.setAlpha(0);
    this.speed = ENEMY_STATS.shield.speed;
  }

  /** Bullets hitting the front are absorbed. */
  blocksAngle(angleFromShieldToBullet: number): boolean {
    if (this.stunned || this.disabledByElectric) return false;
    return Math.abs(Phaser.Math.Angle.Wrap(angleFromShieldToBullet)) < 1.15; // ~130°
  }

  stun(ms: number): void {
    super.stun(ms);
    if (ms > 2000) {
      this.disabledByElectric = true;
      this.shieldArc.setAlpha(0);
      this.setTint(PAL.teal);
      this.sceneW.time.delayedCall(ms, () => {
        this.disabledByElectric = false;
        this.clearTint();
      });
      this.enemyHooks.onShieldStun?.();
    }
  }

  update(dt: number): void {
    if (!this.alive) return;
    const p = this.playerRef;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    // slow turn toward player
    const desired = Math.atan2(dy, dx);
    const diff = Phaser.Math.Angle.Wrap(desired - this.facing);
    const turn = Phaser.Math.Clamp(diff, -1.4 * dt, 1.4 * dt);
    this.facing += turn;
    this.setRotation(this.facing);

    const move = this.steerTo(p.x, p.y, dt);
    const sp = this.stunned || this.disabledByElectric ? 0 : dist > 260 ? 1 : dist < 140 ? 0.25 : 0.7;
    this.applyMove(move.x, move.y, dt, sp);

    // shield visual: arc in front
    if (!this.stunned && !this.disabledByElectric) {
      this.shieldArc.setPosition(this.x, this.y);
      this.shieldArc.setRotation(this.facing);
      this.shieldArc.setAlpha(0.85);
    } else {
      this.shieldArc.setAlpha(0);
    }

    // slam cycle
    this.slamTimer -= dt;
    const wasSlamTelegraphing = this.slamTelegraph > 0;
    this.slamTelegraph -= dt;
    if (this.slamTelegraph > 0) {
      this.telegraph.showCircle(this.x, this.y, 44, PAL.amber);
    } else if (wasSlamTelegraphing) {
      // slam: 140° arc in front
      const inArc = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.facing)) < 1.2;
      if (dist < 64 && inArc) {
        this.enemyHooks.onPlayerHit?.(this.touchDamage + 6);
        this.sceneW.rig.addShake(4);
      }
      const fx = this.sceneW.fx;
      for (let i = 0; i < 8; i++) {
        const a = this.facing + (Math.random() - 0.5) * 1.6;
        fx.spawnSpark(this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 30, PAL.amber, Math.cos(a) * 160, Math.sin(a) * 160, 0.25, 1);
      }
      this.sceneW.sfx('thud');
      this.telegraph.hide();
    } else if (this.slamTimer <= 0 && dist < 190) {
      this.slamTimer = 2.6 + Math.random() * 1;
      this.slamTelegraph = 0.55;
    }
    this.separate(this.sceneW.enemyList, dt);
  }

  destroy(fromScene?: boolean): void {
    this.shieldArc.destroy();
    super.destroy(fromScene);
  }
}

// ─────────────────────────────────────────────────────────────
// Detonation drone — beeping fuse, expanding danger ring, boom
// ─────────────────────────────────────────────────────────────

export class Detonator extends EnemyBase {
  private playerRef: { x: number; y: number };
  private fuse = -1; // starts when close / after lifetime
  private lifetime = 7;
  private warningRing: Phaser.GameObjects.Image;
  private beepTimer = 0;
  private exploded = false;

  constructor(scene: Phaser.Scene, x: number, y: number, player: { x: number; y: number }, hooks: EnemyHooks) {
    super(scene, x, y, 'detonator', 'enemy-detonator', hooks);
    this.playerRef = player;
    this.warningRing = scene.add.image(x, y, 'fx-warning');
    this.warningRing.setDepth(58);
    this.warningRing.setVisible(false);
    this.warningRing.setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Shooting one early detonates it. */
  damage(amount: number): void {
    if (this.exploded) return;
    super.damage(amount);
    if (this.alive) {
      this.detonateNow();
    }
  }

  detonateNow(): void {
    if (this.exploded || !this.alive) return;
    this.exploded = true;
    this.alive = false;
    this.telegraph.destroy();
    this.warningRing.destroy();
    this.sceneW.explosions.explode('med', this.x, this.y, { sourceId: this.id, ignoreIds: new Set([this.id]) });
    this.destroy();
  }

  update(dt: number): void {
    if (!this.alive || this.exploded) return;
    const p = this.playerRef;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.lifetime -= dt;
    if (this.fuse < 0 && (dist < 150 || this.lifetime <= 0)) {
      this.fuse = 2.4;
      this.sceneW.sfx('beep');
    }

    if (this.fuse > 0) {
      this.fuse -= dt;
      this.beepTimer -= dt;
      // accelerating beeps
      const interval = Math.max(0.06, 0.5 * (this.fuse / 2.4));
      if (this.beepTimer <= 0) {
        this.beepTimer = interval;
        this.sceneW.sfx('beep');
        this.setScale(1 + (1 - this.fuse / 2.4) * 0.3);
      }
      this.warningRing.setPosition(this.x, this.y);
      this.warningRing.setVisible(true);
      const grow = (1 - this.fuse / 2.4) * (130 / 30);
      this.warningRing.setScale(0.3 + grow);
      this.warningRing.setAlpha(0.4 + (1 - this.fuse / 2.4) * 0.6);
      // drift toward player slowly, then stop
      if (this.fuse > 1.2) {
        const d = Math.hypot(dx, dy) || 1;
        this.setVelocity((dx / d) * this.speed, (dy / d) * this.speed);
      } else {
        this.setVelocity(0, 0);
      }
      if (this.fuse <= 0) this.detonateNow();
    } else {
      this.warningRing.setVisible(false);
      this.setScale(1);
      const move = this.steerTo(p.x, p.y, dt);
      this.applyMove(move.x, move.y, dt);
    }
    this.separate(this.sceneW.enemyList, dt);
  }

  destroy(fromScene?: boolean): void {
    this.warningRing.destroy();
    super.destroy(fromScene);
  }
}

/** Factory for enemy list hookup. */
export function createEnemy(
  scene: Phaser.Scene,
  kind: EnemyKind,
  x: number,
  y: number,
  player: { x: number; y: number },
  hooks: EnemyHooks,
  training = false,
): EnemyBase {
  switch (kind) {
    case 'drone':
      return new PatrolDrone(scene, x, y, player, hooks, training);
    case 'hunter':
      return new Hunter(scene, x, y, player, hooks);
    case 'shield':
      return new ShieldUnit(scene, x, y, player, hooks);
    case 'detonator':
      return new Detonator(scene, x, y, player, hooks);
  }
}
