/**
 * RESET//07 — pooled effects manager.
 *
 * One manager owns every transient particle type. All pools are pre-allocated
 * and capped; budgets scale with the effects-quality setting so mid-range
 * phones never drown in particles.
 */

import Phaser from 'phaser';
import { PAL } from '../palette';
import type { EffectsQuality } from '../systems/SaveSystem';

export interface Particle {
  s: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  grav: number;
  drag: number;
  rotV: number;
  shrink: number; // scale multiplier over life (1 = keep, 0 = shrink to 0)
  fade: number; // 1 = fade out at end
}

export interface FloatText {
  t: Phaser.GameObjects.Text;
  life: number;
  maxLife: number;
  vy: number;
}

const BUDGET = {
  high: { sparks: 500, smoke: 240, embers: 220, debris: 140, glows: 90, texts: 24, arcs: 10 },
  med: { sparks: 300, smoke: 150, embers: 140, debris: 90, glows: 60, texts: 18, arcs: 8 },
  low: { sparks: 160, smoke: 80, embers: 80, debris: 50, glows: 30, texts: 12, arcs: 6 },
} as const;

export class EffectManager {
  scene: Phaser.Scene;
  quality: EffectsQuality;
  sparks: Particle[] = [];
  smoke: Particle[] = [];
  embers: Particle[] = [];
  debris: Particle[] = [];
  glows: Particle[] = [];
  texts: FloatText[] = [];
  arcs: Phaser.GameObjects.Graphics[] = [];
  private arcIdx = 0;
  private arcLifes = new Map<Phaser.GameObjects.Graphics, number>();
  enabled = true;

  constructor(scene: Phaser.Scene, quality: EffectsQuality) {
    this.scene = scene;
    this.quality = quality;
    const b = BUDGET[quality];
    const mk = (tex: string, n: number): Particle[] => {
      const arr: Particle[] = [];
      for (let i = 0; i < n; i++) {
        const img = scene.add.image(-999, -999, tex);
        img.setVisible(false);
        img.setBlendMode(Phaser.BlendModes.ADD);
        arr.push({ s: img, vx: 0, vy: 0, life: 0, maxLife: 1, grav: 0, drag: 0, rotV: 0, shrink: 1, fade: 1 });
      }
      return arr;
    };
    this.sparks = mk('fx-spark', b.sparks);
    this.smoke = mk('fx-smoke', b.smoke);
    this.embers = mk('fx-ember', b.embers);
    this.debris = mk('fx-dot', b.debris);
    this.glows = mk('fx-glow', b.glows);
    for (let i = 0; i < b.texts; i++) {
      const t = scene.add.text(-999, -999, '', { fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', color: '#f4f8ff' });
      t.setOrigin(0.5);
      t.setVisible(false);
      this.texts.push({ t, life: 0, maxLife: 1, vy: 0 });
    }
    for (let i = 0; i < b.arcs; i++) {
      const g = scene.add.graphics();
      g.setVisible(false);
      this.arcs.push(g);
    }
  }

  private find(arr: Particle[]): Particle | null {
    for (const p of arr) if (p.life <= 0) return p;
    return null;
  }

  spawnSpark(x: number, y: number, color: number, vx: number, vy: number, life = 0.4, scale = 1): void {
    if (!this.enabled) return;
    const p = this.find(this.sparks);
    if (!p) return;
    p.s.setTexture('fx-spark');
    p.s.setPosition(x, y);
    p.s.setTint(color);
    p.s.setScale(scale);
    p.s.setVisible(true);
    p.s.setAlpha(1);
    p.s.setRotation(Math.atan2(vy, vx));
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.grav = 0;
    p.drag = 3;
    p.rotV = 0;
    p.shrink = 0.4;
    p.fade = 1;
  }

  spawnSmoke(x: number, y: number, scale = 1, life = 1.2, vy = -30, vx = 0): void {
    if (!this.enabled) return;
    const p = this.find(this.smoke);
    if (!p) return;
    p.s.setTexture('fx-smoke');
    p.s.setPosition(x + (Math.random() - 0.5) * 8, y);
    p.s.setTint(PAL.smoke);
    p.s.setScale(scale * (0.8 + Math.random() * 0.5));
    p.s.setVisible(true);
    p.s.setAlpha(0.5);
    p.s.setRotation(0);
    p.vx = vx + (Math.random() - 0.5) * 20;
    p.vy = vy;
    p.life = life * (0.8 + Math.random() * 0.4);
    p.maxLife = p.life;
    p.grav = -20;
    p.drag = 1.2;
    p.rotV = 0;
    p.shrink = 1.8; // grows
    p.fade = 1;
  }

  spawnEmber(x: number, y: number, color: number, vx: number, vy: number, life = 0.6, scale = 1): void {
    if (!this.enabled) return;
    const p = this.find(this.embers);
    if (!p) return;
    p.s.setTexture('fx-ember');
    p.s.setPosition(x, y);
    p.s.setTint(color);
    p.s.setScale(scale * (0.5 + Math.random()));
    p.s.setVisible(true);
    p.s.setAlpha(1);
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.grav = 60;
    p.drag = 1.5;
    p.rotV = 0;
    p.shrink = 0.5;
    p.fade = 1;
  }

  spawnDebris(x: number, y: number, color: number, vx: number, vy: number, life = 0.9): void {
    if (!this.enabled) return;
    const p = this.find(this.debris);
    if (!p) return;
    p.s.setTexture(Math.random() < 0.5 ? 'fx-dot' : 'fx-spark');
    p.s.setPosition(x, y);
    p.s.setTint(color);
    p.s.setScale(2 + Math.random() * 3);
    p.s.setVisible(true);
    p.s.setAlpha(1);
    p.s.setRotation(Math.random() * 3);
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.grav = 420;
    p.drag = 2;
    p.rotV = (Math.random() - 0.5) * 14;
    p.shrink = 0.7;
    p.fade = 1;
  }

  spawnGlow(x: number, y: number, color: number, scale: number, life = 0.3, alpha = 0.8): void {
    if (!this.enabled || this.quality === 'low') return;
    const p = this.find(this.glows);
    if (!p) return;
    p.s.setTexture('fx-glow-big');
    p.s.setPosition(x, y);
    p.s.setTint(color);
    p.s.setScale(scale);
    p.s.setVisible(true);
    p.s.setAlpha(alpha);
    p.vx = 0;
    p.vy = 0;
    p.life = life;
    p.maxLife = life;
    p.grav = 0;
    p.drag = 0;
    p.rotV = 0;
    p.shrink = 1;
    p.fade = 1;
  }

  floatText(x: number, y: number, str: string, color = PAL.white, scale = 1): void {
    const ft = this.texts.find((t) => t.life <= 0);
    if (!ft) return;
    ft.t.setText(str);
    ft.t.setPosition(x + (Math.random() - 0.5) * 10, y - 10);
    ft.t.setColor('#' + color.toString(16).padStart(6, '0'));
    ft.t.setScale(scale);
    ft.t.setVisible(true);
    ft.t.setAlpha(1);
    ft.life = 0.55;
    ft.maxLife = 0.55;
    ft.vy = -46;
  }

  electricArc(x1: number, y1: number, x2: number, y2: number, color = PAL.cyan): void {
    if (!this.enabled || this.quality === 'low') return;
    const g = this.arcs[this.arcIdx];
    this.arcIdx = (this.arcIdx + 1) % this.arcs.length;
    g.clear();
    const segs = 6;
    g.lineStyle(2, color, 0.9);
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jx = (Math.random() - 0.5) * 14;
      const jy = (Math.random() - 0.5) * 14;
      g.lineTo(x1 + (x2 - x1) * t + jx, y1 + (y2 - y1) * t + jy);
    }
    g.lineTo(x2, y2);
    g.strokePath();
    g.lineStyle(1, PAL.white, 0.8);
    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      g.lineTo(x1 + (x2 - x1) * t + (Math.random() - 0.5) * 8, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 8);
    }
    g.lineTo(x2, y2);
    g.strokePath();
    g.setVisible(true);
    this.arcLifes.set(g, 0.16);
  }

  update(dt: number): void {
    const step = (arr: Particle[]) => {
      for (const p of arr) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.s.setVisible(false);
          continue;
        }
        p.vy += p.grav * dt;
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
        p.s.x += p.vx * dt;
        p.s.y += p.vy * dt;
        if (p.rotV) p.s.rotation += p.rotV * dt;
        const t = 1 - p.life / p.maxLife;
        const sc = p.s.scaleX;
        const target = p.s.scale * (p.shrink >= 1 ? 1 + (p.shrink - 1) * t : 1 - (1 - p.shrink) * t);
        void sc;
        p.s.setScale(target);
        if (p.fade) p.s.setAlpha(p.life / p.maxLife);
      }
    };
    step(this.sparks);
    step(this.smoke);
    step(this.embers);
    step(this.debris);
    step(this.glows);
    for (const ft of this.texts) {
      if (ft.life <= 0) continue;
      ft.life -= dt;
      if (ft.life <= 0) {
        ft.t.setVisible(false);
        continue;
      }
      ft.t.y += ft.vy * dt;
      ft.t.setAlpha(Math.min(1, ft.life / (ft.maxLife * 0.6)));
    }
    for (const g of this.arcs) {
      const life = this.arcLifes.get(g);
      if (life === undefined || life <= 0) {
        if (life !== undefined && life <= 0) g.setVisible(false);
        continue;
      }
      this.arcLifes.set(g, life - dt);
      if (life - dt <= 0) g.setVisible(false);
    }
  }

  clearAll(): void {
    for (const arr of [this.sparks, this.smoke, this.embers, this.debris, this.glows]) {
      for (const p of arr) {
        p.life = 0;
        p.s.setVisible(false);
      }
    }
    for (const ft of this.texts) {
      ft.life = 0;
      ft.t.setVisible(false);
    }
    for (const g of this.arcs) {
      g.setVisible(false);
      this.arcLifes.set(g, 0);
    }
  }
}
