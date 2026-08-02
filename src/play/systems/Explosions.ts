/**
 * RESET//07 — layered explosion system.
 *
 * Every explosion is composed of 13+ concurrent layers (flash → fireball →
 * secondary fires → shockwave → sparks → smoke → debris → scorch → light
 * pulse → shake → hit-stop → sound → chain ignition). Chain reactions run
 * through a staggered queue with hard propagation limits.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import { EXPLOSION_PRESETS, type ExplosionKind, type ExplosionPreset } from '../data/fx';
import { ChainTracker } from './combat';
import type { EffectManager } from './Effects';
import type { SfxName } from './AudioEngine';

export type { ExplosionKind } from '../data/fx';

export interface Damageable {
  readonly id: number;
  x: number;
  y: number;
  alive: boolean;
  /** @returns true if this entity was destroyed by the damage */
  takeExplosionDamage(damage: number, kind: ExplosionKind, x: number, y: number): boolean;
  /** @returns the explosion kind this object will detonate with, or null */
  tryIgnite(x: number, y: number, kind: ExplosionKind): ExplosionKind | null;
  isExplosive: boolean;
  enemy: boolean; // damages the player? (false = environment)
}

export interface ExplosionCallbacks {
  onExploded?: (x: number, y: number, kind: ExplosionKind) => void;
  onIgnite?: (x: number, y: number) => void;
  damagePlayer?: (amount: number, x: number, y: number) => void;
  onSound?: (name: SfxName) => void;
}

let nextId = 1;
export const newEntityId = (): number => nextId++;

export class ExplosionSystem {
  scene: Phaser.Scene;
  effects: EffectManager;
  chain: ChainTracker;
  damageables: Damageable[] = [];
  private cb: ExplosionCallbacks;
  private pending = 0; // queued chain detonations
  private scorches: Phaser.GameObjects.Image[] = [];
  private static MAX_SCORCHES = 60;

  constructor(scene: Phaser.Scene, effects: EffectManager, cb: ExplosionCallbacks = {}) {
    this.scene = scene;
    this.effects = effects;
    this.chain = new ChainTracker();
    this.cb = cb;
  }

  register(d: Damageable): void {
    this.damageables.push(d);
  }

  unregister(d: Damageable): void {
    const i = this.damageables.indexOf(d);
    if (i >= 0) this.damageables.splice(i, 1);
  }

  /** Main entry: detonate at world coords. */
  explode(kind: ExplosionKind, x: number, y: number, opts: { ignoreIds?: Set<number>; sourceId?: number } = {}): void {
    const preset = EXPLOSION_PRESETS[kind];
    if (!this.chain.acquireExplosion()) return;
    this.chain.beginInstance();
    if (opts.sourceId !== undefined) this.chain.canPropagate(opts.sourceId);
    this.doExplode(preset, x, y);
    this.cb.onExploded?.(x, y, kind);
    this.chain.releaseExplosion();
    // immediate chain ignition pass
    this.igniteNearby(x, y, preset, opts.ignoreIds);
  }

  /** Queue a delayed chain detonation (staggered domino effect). */
  queueChain(kind: ExplosionKind, x: number, y: number, delayMs: number, sourceId: number): void {
    if (this.pending > 24) return; // chain fan-out cap
    this.pending++;
    this.scene.time.delayedCall(delayMs, () => {
      this.pending--;
      this.chain.beginInstance();
      if (!this.chain.canPropagate(sourceId)) return;
      if (!this.chain.acquireExplosion()) return;
      this.doExplode(EXPLOSION_PRESETS[kind], x, y);
      this.cb.onExploded?.(x, y, kind);
      this.chain.releaseExplosion();
      this.igniteNearby(x, y, EXPLOSION_PRESETS[kind]);
    });
  }

  private igniteNearby(x: number, y: number, preset: ExplosionPreset, ignoreIds?: Set<number>): void {
    const r2 = preset.chainRadius * preset.chainRadius;
    for (const d of this.damageables) {
      if (!d.alive || !d.isExplosive) continue;
      if (ignoreIds?.has(d.id)) continue;
      const dx = d.x - x;
      const dy = d.y - y;
      if (dx * dx + dy * dy <= r2) {
        const boomKind = d.tryIgnite(x, y, preset.id);
        if (boomKind) {
          this.cb.onIgnite?.(d.x, d.y);
          this.queueChain(boomKind, d.x, d.y, this.chain.nextStaggerMs(), d.id);
        }
      }
    }
  }

  /** Apply damage to everything in the radius (enemies + player). */
  private doExplode(p: ExplosionPreset, x: number, y: number): void {
    const scene = this.scene;
    const r2 = p.radius * p.radius;

    // damage pass — every damageable applies its own rule
    for (const d of this.damageables) {
      if (!d.alive) continue;
      const dx = d.x - x;
      const dy = d.y - y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 > r2) continue;
      const falloff = 1 - Math.sqrt(dist2) / p.radius;
      const dmg = Math.max(1, Math.round(p.damage * (0.5 + 0.5 * falloff)));
      d.takeExplosionDamage(dmg, p.id, x, y);
    }
    // player damage (explosions hurt K-07 too — distance computed by caller)
    if (p.damage > 0) this.cb.damagePlayer?.(Math.round(p.damage * 0.6), x, y);

    // ── visual layers ──────────────────────────────────────
    const fx = this.effects;
    const quality = fx.quality;
    const q = quality === 'high' ? 1 : quality === 'med' ? 0.6 : 0.3;

    // 1. one-frame white flash
    if (p.flash > 0) {
      const f = scene.add.image(x, y, 'fx-flash');
      f.setBlendMode(Phaser.BlendModes.ADD);
      f.setDepth(78);
      f.setScale(p.fireball / 30);
      f.setAlpha(Math.min(1, p.flash * (quality === 'low' ? 0.5 : 1)));
      scene.tweens.add({ targets: f, alpha: 0, scale: p.fireball / 30 * 1.5, duration: 120, onComplete: () => f.destroy() });
    }
    // 2. central fireball
    const fb = scene.add.image(x, y, 'fx-glow-big');
    fb.setBlendMode(Phaser.BlendModes.ADD);
    fb.setDepth(75);
    fb.setTint(p.color);
    fb.setScale(0.1);
    scene.tweens.add({
      targets: fb,
      scale: p.fireball / 64,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.easeOut',
      onComplete: () => fb.destroy(),
    });
    // 2b. hot core
    const core = scene.add.image(x, y, 'fx-flash');
    core.setBlendMode(Phaser.BlendModes.ADD);
    core.setDepth(76);
    core.setTint(PAL.white);
    core.setScale(p.fireball / 40);
    scene.tweens.add({ targets: core, alpha: 0, duration: 260, onComplete: () => core.destroy() });
    // 3. secondary fire blobs
    const nBlobs = Math.round(p.fireballs * q);
    for (let i = 0; i < nBlobs; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = p.fireball * (0.6 + Math.random() * 0.7);
      const blob = scene.add.image(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 'fx-glow');
      blob.setBlendMode(Phaser.BlendModes.ADD);
      blob.setDepth(74);
      blob.setTint(i % 2 ? p.color : p.color2);
      blob.setScale((p.fireball / 48) * (0.4 + Math.random() * 0.6));
      scene.tweens.add({
        targets: blob,
        x: blob.x + Math.cos(a) * 40,
        y: blob.y + Math.sin(a) * 40,
        alpha: 0,
        scale: blob.scaleX * 1.8,
        duration: 300 + Math.random() * 200,
        onComplete: () => blob.destroy(),
      });
    }
    // 4. shockwave ring
    const ring = scene.add.image(x, y, 'fx-ring');
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setDepth(73);
    ring.setTint(p.color2);
    ring.setScale(0.2);
    scene.tweens.add({
      targets: ring,
      scale: p.radius / 26,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
    if (quality !== 'low') {
      const ring2 = scene.add.image(x, y, 'fx-ring');
      ring2.setBlendMode(Phaser.BlendModes.ADD);
      ring2.setDepth(73);
      ring2.setTint(PAL.white);
      ring2.setScale(0.1);
      scene.tweens.add({
        targets: ring2,
        scale: p.radius / 30,
        alpha: 0,
        duration: 500,
        delay: 60,
        onComplete: () => ring2.destroy(),
      });
    }
    // 5. directional sparks
    const nSparks = Math.round(p.sparks * q);
    for (let i = 0; i < nSparks; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 420;
      fx.spawnSpark(x, y, i % 3 ? p.color2 : PAL.white, Math.cos(a) * sp, Math.sin(a) * sp, 0.25 + Math.random() * 0.3, 0.8 + Math.random());
    }
    // 6. smoke burst
    const nSmoke = Math.round(p.smoke * q);
    for (let i = 0; i < nSmoke; i++) {
      fx.spawnSmoke(x + (Math.random() - 0.5) * p.fireball, y + (Math.random() - 0.5) * p.fireball, 0.8 + Math.random(), 0.9 + Math.random() * 0.8);
    }
    // 7. physical debris
    const nDebris = Math.round(p.debris * q);
    for (let i = 0; i < nDebris; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 160 + Math.random() * 380;
      fx.spawnDebris(x, y, Math.random() < 0.6 ? PAL.metalHi : p.color2, Math.cos(a) * sp, Math.sin(a) * sp - 80, 0.7 + Math.random() * 0.5);
    }
    // 8. scorch decal (persistent, capped list)
    if (p.scorch) {
      const sc = scene.add.image(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, 'scorch');
      sc.setDepth(5); // above ground (1), below props/buildings (10+)
      sc.setScale((p.radius / 34) * (0.8 + Math.random() * 0.5));
      sc.setAlpha(0);
      scene.tweens.add({ targets: sc, alpha: 1, duration: 400, delay: 100 });
      this.scorches.push(sc);
      if (this.scorches.length > ExplosionSystem.MAX_SCORCHES) {
        const old = this.scorches.shift();
        old?.destroy();
      }
    }
    // 9. local light pulse
    fx.spawnGlow(x, y, p.color2, p.light, 0.32, 0.85);
    // 10+11. camera shake + hit-stop handled by caller hooks in the scene

    // 12. sound
    if (p.sound) this.cb.onSound?.(p.sound);

    // electric arcs (electric explosions chain visually to nearby enemies)
    if (p.electric) {
      const targets = this.damageables.filter((d) => d.enemy && d.alive);
      let n = 0;
      for (const d of targets) {
        if (n++ >= 3) break;
        const dx = d.x - x;
        const dy = d.y - y;
        if (dx * dx + dy * dy < p.radius * p.radius * 2) {
          fx.electricArc(x, y, d.x, d.y, p.color);
        }
      }
    }

    // lingering fire zone
    if (p.lingerFire) {
      const zone = scene.add.image(x, y, 'fx-glow');
      zone.setBlendMode(Phaser.BlendModes.ADD);
      zone.setTint(PAL.orange);
      zone.setScale(p.lingerFire.radius / 32);
      zone.setAlpha(0.5);
      scene.tweens.add({
        targets: zone,
        alpha: 0,
        scale: p.lingerFire.radius / 24,
        duration: p.lingerFire.dur * 1000,
        onComplete: () => zone.destroy(),
      });
    }
  }
}

// (camera shake helper moved into WorldScene — it needs the registry settings)
