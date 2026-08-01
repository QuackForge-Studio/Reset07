/**
 * RESET//07 — Core Guardian boss.
 *
 * Phase 1 (100–66%): rotating shield arc + radial bursts + drone summons.
 * Phase 2 (66–33%): telegraphed beam sweeps + detonator releases + vents.
 * Phase 3 (33–0%):  arena collapse, exposed core, chains deal 2× damage,
 *                  Mara and the Guardian give conflicting instructions.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { DamageableSprite, Telegraph, deathBurst } from './base';
import type { WorldScene } from '../types';
import { BOSS_STATS } from '../data/enemies';
import { calcDamage } from '../systems/combat';
import { PatrolDrone, Detonator } from './enemies';
import type { EnemyBase } from './enemies';
import type { ExplosionKind } from '../systems/Explosions';

export interface BossHooks {
  onPhase?: (phase: 1 | 2 | 3) => void;
  onDefeated?: () => void;
  onPlayerHit?: (dmg: number) => void;
  onSummon?: (e: DamageableSprite) => void;
  onRemoveSummon?: (e: DamageableSprite) => void;
}

export class CoreGuardian extends DamageableSprite {
  private sceneW: WorldScene;
  private bossHooks: BossHooks;
  phase: 1 | 2 | 3 = 1;
  private shieldArc: Phaser.GameObjects.Image;
  private shieldAngle = 0;
  private radialTimer = 3;
  private summonTimer = 5;
  private beamTimer = 6;
  private detonatorTimer = 7;
  private beamState: 'idle' | 'telegraph' | 'firing' = 'idle';
  private beamAngle = 0;
  private beamGraphic: Phaser.GameObjects.Graphics;
  private beamTelegraph: Telegraph;
  private pulse = 0;
  private core: Phaser.GameObjects.Image | null = null;
  private coreHp = BOSS_STATS.coreHp;
  private coreAlive = false;
  private speed: number;
  private moveAngle = Math.random() * Math.PI * 2;
  private moveTimer = 0;
  private spawnPoint: { x: number; y: number };
  private summons: EnemyBase[] = [];
  private collapseDone = false;

  constructor(scene: Phaser.Scene, x: number, y: number, hooks: BossHooks) {
    super(scene, x, y, 'boss', BOSS_STATS.hp, {});
    this.sceneW = scene as WorldScene;
    this.bossHooks = hooks;
    this.spawnPoint = { x, y };
    this.speed = BOSS_STATS.moveSpeed;
    this.setCircle(50, 30, 30);
    this.setDepth(65);
    this.shieldArc = scene.add.image(x, y, 'shield-arc');
    this.shieldArc.setDepth(66);
    this.shieldArc.setScale(2.4);
    this.shieldArc.setTint(PAL.magenta);
    this.beamGraphic = scene.add.graphics();
    this.beamGraphic.setDepth(115);
    this.beamTelegraph = new Telegraph(scene, x, y);
    this.beamTelegraph.line.setScale(1.6, 1);
  }

  get bossAlive(): boolean {
    return this.alive;
  }

  get hpPct(): number {
    return Math.max(0, this.hp / this.maxHp);
  }

  /** Bullets check this: absorbs when the rotating shield faces the shooter. */
  blocksAngle(angleFromBossToBullet: number): boolean {
    if (this.phase === 3 && this.coreAlive) return false; // exposed in P3
    const diff = Math.abs(Phaser.Math.Angle.Wrap(angleFromBossToBullet - this.shieldAngle));
    return diff < 0.9;
  }

  damage(amount: number): void {
    if (!this.alive) return;
    super.damage(amount);
    if (!this.alive) return;
    this.sceneW.fx.floatText(this.x + (Math.random() - 0.5) * 30, this.y - 60, String(amount), PAL.magenta, 1.3);
    this.sceneW.sfx('enemyHit');
    const pct = this.hpPct;
    if (pct <= BOSS_STATS.phase3At && this.phase < 3) this.enterPhase(3);
    else if (pct <= BOSS_STATS.phase2At && this.phase < 2) this.enterPhase(2);
  }

  takeExplosionDamage(damage: number, _kind: ExplosionKind, _x: number, _y: number): boolean {
    if (!this.alive) return true;
    const dmg = calcDamage({ base: damage, multiplier: this.phase === 3 ? 2 : 1 });
    super.damage(dmg);
    this.sceneW.fx.floatText(this.x + (Math.random() - 0.5) * 30, this.y - 60, String(dmg), PAL.orange, 1.3);
    if (!this.alive) this.onDefeated();
    return !this.alive;
  }

  private enterPhase(p: 1 | 2 | 3): void {
    this.phase = p;
    this.bossHooks.onPhase?.(p);
    this.sceneW.sfx('bossAttack');
    if (p === 2) {
      // shockwave + vent activation
      this.sceneW.explosions.explode('electric', this.x, this.y, {});
      this.sceneW.rig.slowMo(0.5, 350);
    }
    if (p === 3) {
      this.exposeCore();
      this.collapseArena();
    }
  }

  private exposeCore(): void {
    this.coreAlive = true;
    this.coreHp = BOSS_STATS.coreHp;
    this.core = this.scene.add.image(this.x, this.y, 'boss-core');
    this.core.setDepth(67);
    this.core.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: this.core, scale: { from: 0.3, to: 1 }, duration: 500, ease: 'Back.easeOut' });
  }

  /** The exposed core is the primary target in P3. */
  damageCore(amount: number): void {
    if (!this.coreAlive || !this.alive) return;
    this.coreHp -= amount;
    this.sceneW.fx.floatText(this.core!.x, this.core!.y - 30, String(amount), PAL.orange, 1.1);
    if (this.coreHp <= 0) {
      this.coreAlive = false;
      this.core?.destroy();
      this.core = null;
      this.die();
    }
  }

  get coreTarget(): { x: number; y: number } | null {
    return this.coreAlive ? this.core : null;
  }

  private collapseArena(): void {
    if (this.collapseDone) return;
    this.collapseDone = true;
    const scene = this.sceneW;
    // flash + shake the arena walls
    scene.rig.addShake(6, 400);
    scene.sfx('thud');
    // break wall tiles into falling debris visuals (the scene removes colliders)
    scene.events.emit('boss-collapse');
    scene.time.delayedCall(900, () => {
      scene.rig.addShake(8, 500);
      scene.sfx('explosionMed');
    });
  }

  update(dt: number): void {
    if (!this.alive) return;
    const p = this.sceneW.playerPos;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;

    // slow drift around the arena center
    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      this.moveTimer = 2 + Math.random() * 2;
      this.moveAngle = Math.random() * Math.PI * 2;
    }
    const cx = this.spawnPoint.x + Math.cos(this.moveAngle) * 90;
    const cy = this.spawnPoint.y + Math.sin(this.moveAngle) * 70;
    const mdx = cx - this.x;
    const mdy = cy - this.y;
    const md = Math.hypot(mdx, mdy) || 1;
    this.setVelocity((mdx / md) * this.speed, (mdy / md) * this.speed);
    this.applyFlashAndKnock(dt);

    // rotating shield arc
    this.shieldAngle += dt * 1.05;
    this.shieldArc.setPosition(this.x, this.y);
    this.shieldArc.setRotation(this.shieldAngle);
    this.shieldArc.setAlpha(this.phase === 3 ? 0.25 : 0.9);

    // core follows
    if (this.core) {
      this.core.setPosition(this.x, this.y);
      this.pulse += dt * 6;
      this.core.setScale(1 + Math.sin(this.pulse) * 0.06);
    }

    this.radialTimer -= dt;
    this.summonTimer -= dt;
    this.beamTimer -= dt;
    this.detonatorTimer -= dt;

    // ── Phase 1: radial bursts + summons ──
    if (this.phase <= 1) {
      if (this.radialTimer <= 0) {
        this.radialTimer = 3.4;
        this.fireRadial(8);
      }
      if (this.summonTimer <= 0) {
        this.summonTimer = 7;
        this.summonDrones(2);
      }
    } else if (this.phase === 2) {
      // radial slower, summons fewer, beams + detonators
      if (this.radialTimer <= 0) {
        this.radialTimer = 4.2;
        this.fireRadial(10);
      }
      if (this.summonTimer <= 0) {
        this.summonTimer = 9;
        this.summonDrones(1);
      }
      if (this.beamTimer <= 0) {
        this.beamTimer = 6.5;
        this.startBeam();
      }
      if (this.detonatorTimer <= 0) {
        this.detonatorTimer = 7;
        this.releaseDetonators(2);
      }
    } else {
      // Phase 3: relentless
      if (this.radialTimer <= 0) {
        this.radialTimer = 2.6;
        this.fireRadial(12);
      }
      if (this.beamTimer <= 0) {
        this.beamTimer = 5;
        this.startBeam();
      }
      if (this.detonatorTimer <= 0) {
        this.detonatorTimer = 5;
        this.releaseDetonators(2);
      }
    }

    // ── beam state machine ──
    if (this.beamState === 'telegraph') {
      this.beamTelegraph.show(this.x, this.y, this.beamAngle, dist + 200, PAL.magenta, 0.8);
    } else if (this.beamState === 'firing') {
      this.beamGraphic.clear();
      this.beamGraphic.lineStyle(10, PAL.magenta, 0.85);
      this.beamGraphic.beginPath();
      this.beamGraphic.moveTo(this.x, this.y);
      this.beamGraphic.lineTo(this.x + Math.cos(this.beamAngle) * 900, this.y + Math.sin(this.beamAngle) * 900);
      this.beamGraphic.strokePath();
      this.beamGraphic.lineStyle(4, PAL.white, 0.9);
      this.beamGraphic.beginPath();
      this.beamGraphic.moveTo(this.x, this.y);
      this.beamGraphic.lineTo(this.x + Math.cos(this.beamAngle) * 900, this.y + Math.sin(this.beamAngle) * 900);
      this.beamGraphic.strokePath();
      // beam hit check
      const toPlayer = Math.atan2(dy, dx);
      const beamDiff = Math.abs(Phaser.Math.Angle.Wrap(toPlayer - this.beamAngle));
      const beamDist = dist * Math.cos(beamDiff);
      if (beamDiff < 0.09 && beamDist < 480) {
        this.bossHooks.onPlayerHit?.(26);
      }
      this.beamAngle += dt * 0.55;
    }

    // contact damage
    if (dist < 62) this.bossHooks.onPlayerHit?.(14);

    // shield collision with player knockback
    if (dist < 70) {
      this.sceneW.rig.addShake(1);
    }
  }

  private fireRadial(n: number): void {
    const base = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const b = this.sceneW.physics.add.sprite(this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, 'bullet-heavy');
      this.sceneW.enemyBolts.add(b); // add BEFORE setting velocity (group add resets the body)
      b.setRotation(a);
      b.setDepth(70);
      const body = b.body as Phaser.Physics.Arcade.Body;
      body.setCircle(7, 7, 7);
      body.setVelocity(Math.cos(a) * 210, Math.sin(a) * 210);
      b.setData('dmg', 14);
      b.setData('life', 3.5);
    }
    this.sceneW.sfx('bossAttack');
  }

  private startBeam(): void {
    this.beamState = 'telegraph';
    this.beamAngle = Math.random() * Math.PI * 2;
    this.beamTelegraph.show(this.x, this.y, this.beamAngle, 500, PAL.magenta, 0.8);
    this.sceneW.sfx('beep');
    this.scene.time.delayedCall(900, () => {
      if (!this.alive) return;
      this.beamState = 'firing';
      this.beamTelegraph.hide();
      this.sceneW.sfx('bossAttack');
      this.scene.time.delayedCall(1600, () => {
        this.beamState = 'idle';
        this.beamGraphic.clear();
      });
    });
  }

  private summonDrones(n: number): void {
    const scene = this.sceneW;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sx = Phaser.Math.Clamp(this.x + Math.cos(a) * 220, 82 * 32 + 40, 109 * 32 - 40);
      const sy = Phaser.Math.Clamp(this.y + Math.sin(a) * 220, 46 * 32 + 40, 61 * 32 - 40);
      const drone = new PatrolDrone(scene, sx, sy, scene.playerPos, {
        onDeath: (e) => {
          this.summons = this.summons.filter((s) => s !== e);
          this.bossHooks.onRemoveSummon?.(e);
        },
      });
      this.summons.push(drone);
      this.bossHooks.onSummon?.(drone);
      const fx = scene.fx;
      fx.spawnGlow(sx, sy, PAL.magenta, 0.8, 0.3);
    }
  }

  private releaseDetonators(n: number): void {
    const scene = this.sceneW;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sx = Phaser.Math.Clamp(this.x + Math.cos(a) * 160, 82 * 32 + 40, 109 * 32 - 40);
      const sy = Phaser.Math.Clamp(this.y + Math.sin(a) * 160, 46 * 32 + 40, 61 * 32 - 40);
      const d = new Detonator(scene, sx, sy, scene.playerPos, {
        onDeath: (e) => {
          this.summons = this.summons.filter((s) => s !== e);
          this.bossHooks.onRemoveSummon?.(e);
        },
      });
      this.summons.push(d);
      this.bossHooks.onSummon?.(d);
    }
  }

  /** Damage from arcs (electric chains) hits the core directly in P3. */
  electricHit(dmg: number): void {
    if (this.phase === 3 && this.coreAlive) this.damageCore(dmg);
    else this.damage(dmg);
  }

  private onDefeated(): void {
    if (!this.alive) return;
    this.alive = false;
    this.beamTelegraph.destroy();
    this.beamGraphic.destroy();
    this.shieldArc.destroy();
    this.core?.destroy();
    deathBurst(this.sceneW.fx, this.x, this.y, PAL.magenta);
    this.sceneW.explosions.explode('boss', this.x, this.y, {});
    this.destroy();
    this.bossHooks.onDefeated?.();
  }

  die(): void {
    this.onDefeated();
  }

  destroy(fromScene?: boolean): void {
    this.shieldArc.destroy();
    this.beamGraphic.destroy();
    this.beamTelegraph.destroy();
    this.core?.destroy();
    super.destroy(fromScene);
  }
}
