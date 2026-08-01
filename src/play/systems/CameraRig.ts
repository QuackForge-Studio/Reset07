/**
 * RESET//07 — camera rig: smooth follow, orientation-aware zoom, focus
 * framing (boss), shake, hit-stop and slow-motion (time warp).
 * Time warp is driven by wall-clock so it can never wedge the game.
 */

import Phaser from 'phaser';

export class CameraRig {
  scene: Phaser.Scene;
  cam: Phaser.Cameras.Scene2D.Camera;
  followTarget: { x: number; y: number } | null = null;
  private focus: { x: number; y: number; zoom: number } | null = null;
  private zoomTarget = 1;
  private zoomCurrent = 1;
  private warpScale = 1;
  private warpTarget = 1;
  private warpUntil = 0;
  shakeEnabled = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, 4608, 3328);
    this.cam.setBackgroundColor('#070a0f');
  }

  /** Recompute base zoom from container size (call on resize). */
  computeZoom(w: number, h: number, portrait: boolean): number {
    const base = portrait ? Math.min(w / 880, h / 1500) : Math.min(w / 980, h / 620);
    const clamped = Phaser.Math.Clamp(base, 0.42, 1.45);
    this.zoomTarget = this.focus ? this.focus.zoom : clamped;
    return this.zoomTarget;
  }

  setFollow(t: { x: number; y: number }): void {
    this.followTarget = t;
  }

  focusOn(x: number, y: number, zoom: number): void {
    this.focus = { x, y, zoom };
    this.zoomTarget = zoom;
  }

  clearFocus(): void {
    this.focus = null;
  }

  get focused(): boolean {
    return this.focus !== null;
  }

  addShake(mag: number, dur = 80): void {
    if (!this.shakeEnabled || mag <= 0) return;
    const d = Math.min(220, dur);
    this.cam.shake(d, Math.min(0.02, mag / 1400));
  }

  /** Full stop for `ms` (wall-clock). */
  hitStop(ms: number): void {
    if (ms <= 0) return;
    this.warpTarget = 0;
    this.warpUntil = performance.now() + ms;
  }

  slowMo(scale: number, durMs: number): void {
    this.warpTarget = scale;
    this.warpUntil = performance.now() + durMs;
  }

  update(dt: number): void {
    // time warp
    const now = performance.now();
    if (this.warpUntil > 0 && now >= this.warpUntil) {
      this.warpUntil = 0;
      this.warpTarget = 1;
    }
    this.warpScale += (this.warpTarget - this.warpScale) * Math.min(1, dt * 14);
    if (Math.abs(this.warpScale - this.warpTarget) < 0.01) this.warpScale = this.warpTarget;
    this.scene.time.timeScale = this.warpScale;

    // zoom smoothing
    this.zoomCurrent += (this.zoomTarget - this.zoomCurrent) * Math.min(1, dt * 3.2);
    if (Math.abs(this.zoomCurrent - this.zoomTarget) < 0.002) this.zoomCurrent = this.zoomTarget;
    this.cam.setZoom(this.zoomCurrent);

    // position
    if (this.focus) {
      this.cam.centerOn(this.focus.x, this.focus.y);
    } else if (this.followTarget) {
      const p = this.followTarget;
      const cx = this.cam.scrollX + this.cam.width / (2 * this.zoomCurrent);
      const cy = this.cam.scrollY + this.cam.height / (2 * this.zoomCurrent);
      const lerp = Math.min(1, dt * 7);
      this.cam.centerOn(cx + (p.x - cx) * lerp, cy + (p.y - cy) * lerp);
    }
    // clamp to world
    const vw = this.cam.width / this.zoomCurrent;
    const vh = this.cam.height / this.zoomCurrent;
    const mx = Math.max(0, (4608 - vw) / 2);
    const my = Math.max(0, (3328 - vh) / 2);
    this.cam.scrollX = Phaser.Math.Clamp(this.cam.scrollX, -mx, 4608 - vw + mx);
    this.cam.scrollY = Phaser.Math.Clamp(this.cam.scrollY, -my, 3328 - vh + my);
  }

  get timeScale(): number {
    return this.warpScale;
  }
}
