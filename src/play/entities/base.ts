/**
 * RESET//07 — shared entity helpers: damageables, hit flashes, telegraphs.
 */

import Phaser from 'phaser';
import { newEntityId, type Damageable, type ExplosionKind } from '../systems/Explosions';
import type { EffectManager } from '../systems/Effects';
import { PAL } from '../palette';

export interface EntityHooks {
  onDie?: (e: Phaser.GameObjects.Sprite) => void;
  onDamage?: (e: Phaser.GameObjects.Sprite, dmg: number) => void;
}

/** Base for any sprite that takes damage. */
export class DamageableSprite extends Phaser.Physics.Arcade.Sprite implements Damageable {
  readonly id = newEntityId();
  hp: number;
  maxHp: number;
  enemy = false;
  isExplosive = false;
  alive = true;
  protected hooks: EntityHooks;
  protected flashTimer = 0;
  protected flashDur = 0.08;
  protected flashColor = PAL.white;
  protected knockVX = 0;
  protected knockVY = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number, hooks: EntityHooks = {}) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
    this.maxHp = hp;
    this.hooks = hooks;
    this.setDepth(50);
  }

  damage(amount: number): void {
    if (!this.alive || amount <= 0) return;
    this.hp -= amount;
    this.flashTimer = this.flashDur;
    this.hooks.onDamage?.(this, amount);
    if (this.hp <= 0) this.die();
  }

  /** Explosion damage — most entities take full damage; overridable. */
  takeExplosionDamage(damage: number, _kind: ExplosionKind, _x: number, _y: number): boolean {
    this.damage(damage);
    return !this.alive;
  }

  tryIgnite(_x: number, _y: number, _kind: ExplosionKind): ExplosionKind | null {
    return null; // not explosive by default
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.hooks.onDie?.(this);
  }

  knockback(vx: number, vy: number): void {
    this.knockVX = vx;
    this.knockVY = vy;
  }

  protected applyFlashAndKnock(dt: number): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.setTintFill(this.flashColor);
      if (this.flashTimer <= 0) this.clearTint();
    }
    if (this.knockVX !== 0 || this.knockVY !== 0) {
      const d = Math.max(0, 1 - 8 * dt);
      this.x += this.knockVX * dt;
      this.y += this.knockVY * dt;
      this.knockVX *= d;
      this.knockVY *= d;
      if (Math.abs(this.knockVX) < 2 && Math.abs(this.knockVY) < 2) {
        this.knockVX = 0;
        this.knockVY = 0;
      }
    }
  }

}

/** Draws a telegraphed aim/charge line. */
export class Telegraph {
  line: Phaser.GameObjects.Image;
  private arc: Phaser.GameObjects.Arc | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.line = scene.add.image(x, y, 'fx-telegraph');
    this.line.setOrigin(0.5, 0.5);
    this.line.setBlendMode(Phaser.BlendModes.ADD);
    this.line.setVisible(false);
    this.line.setDepth(120);
  }

  show(x: number, y: number, angle: number, length: number, color = PAL.danger, alpha = 0.7): void {
    this.line.setPosition(x, y);
    this.line.setRotation(angle);
    this.line.setScale(length / 64, 1);
    this.line.setTint(color);
    // subtle pulse so the warning reads as active, not a stuck streak
    const t = this.line.scene.time.now / 65;
    this.line.setAlpha(alpha * (0.72 + 0.28 * Math.sin(t)));
    this.line.setVisible(true);
  }

  showCircle(x: number, y: number, radius: number, color = PAL.danger): void {
    if (!this.arc) {
      this.arc = this.sceneOf(this.line).add.circle(x, y, radius, color, 0.18);
      this.arc.setStrokeStyle(3, color, 0.9);
      this.arc.setDepth(119);
    }
    this.arc.setPosition(x, y);
    this.arc.setRadius(radius);
    this.arc.setVisible(true);
    // charge pulse so an active danger zone reads as live, not a static smear
    if (!this.line.scene.registry.get('reducedMotion')) {
      const t = this.line.scene.time.now / 110;
      this.arc.setAlpha(0.18 * (0.7 + 0.3 * Math.sin(t)));
    }
  }

  private sceneOf(o: Phaser.GameObjects.Image): Phaser.Scene {
    return o.scene;
  }

  hide(): void {
    this.line.setVisible(false);
    if (this.arc) this.arc.setVisible(false);
  }

  destroy(): void {
    this.line.destroy();
    this.arc?.destroy();
  }
}

/** Spawns enemy death particles. */
export function deathBurst(fx: EffectManager, x: number, y: number, color: number): void {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 60 + Math.random() * 200;
    fx.spawnSpark(x, y, i % 2 ? color : PAL.white, Math.cos(a) * sp, Math.sin(a) * sp, 0.3, 0.8);
  }
}
