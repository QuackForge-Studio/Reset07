/**
 * RESET//07 — explosion presets (data-driven).
 * All explosion behavior is configured here; the system interprets presets.
 */

import type { SfxName } from '../systems/AudioEngine';

export type ExplosionKind = 'small' | 'med' | 'large' | 'electric' | 'gas' | 'boss' | 'final';

export interface ExplosionPreset {
  id: ExplosionKind;
  radius: number; // damage radius (px)
  damage: number;
  chainRadius: number; // ignites explosives within (px)
  color: number; // primary fire color
  color2: number; // secondary color
  flash: number; // flash intensity 0..1
  fireball: number; // central fireball radius (px)
  fireballs: number; // secondary fire blobs
  sparks: number;
  smoke: number;
  debris: number;
  shake: number; // camera shake magnitude (px)
  hitStop: number; // ms of hit-stop
  slowMo?: { scale: number; dur: number };
  sound: SfxName;
  scorch: boolean;
  light: number; // light pulse radius scale
  lingerFire?: { dur: number; radius: number }; // lingering fire zone
  electric?: boolean; // chain electric arcs
}

export const EXPLOSION_PRESETS: Record<ExplosionKind, ExplosionPreset> = {
  small: {
    id: 'small', radius: 64, damage: 25, chainRadius: 80,
    color: 0xffa54d, color2: 0xff6a1a,
    flash: 0.55, fireball: 26, fireballs: 4, sparks: 10, smoke: 5, debris: 3,
    shake: 3, hitStop: 0, sound: 'explosionSmall', scorch: true, light: 1.4,
  },
  med: {
    id: 'med', radius: 118, damage: 60, chainRadius: 140,
    color: 0xffb35c, color2: 0xff6a1a,
    flash: 0.8, fireball: 44, fireballs: 7, sparks: 18, smoke: 10, debris: 6,
    shake: 6, hitStop: 30, sound: 'explosionMed', scorch: true, light: 2.2,
  },
  large: {
    id: 'large', radius: 175, damage: 95, chainRadius: 205,
    color: 0xffc46a, color2: 0xff6a1a,
    flash: 1, fireball: 66, fireballs: 12, sparks: 30, smoke: 16, debris: 10,
    shake: 10, hitStop: 60, slowMo: { scale: 0.5, dur: 0.25 }, sound: 'explosionLarge', scorch: true, light: 3.4,
    lingerFire: { dur: 2.2, radius: 60 },
  },
  electric: {
    id: 'electric', radius: 105, damage: 50, chainRadius: 150,
    color: 0x9ff4ff, color2: 0x38e8ff,
    flash: 0.7, fireball: 34, fireballs: 6, sparks: 22, smoke: 4, debris: 4,
    shake: 5, hitStop: 40, sound: 'explosionElectric', scorch: true, light: 2.6,
    electric: true,
  },
  gas: {
    id: 'gas', radius: 150, damage: 80, chainRadius: 190,
    color: 0xffcf8a, color2: 0x4de3c0,
    flash: 0.9, fireball: 58, fireballs: 10, sparks: 26, smoke: 14, debris: 8,
    shake: 8, hitStop: 50, sound: 'gasIgnite', scorch: true, light: 3,
    lingerFire: { dur: 2.6, radius: 50 },
  },
  boss: {
    id: 'boss', radius: 210, damage: 130, chainRadius: 240,
    color: 0xffd9a0, color2: 0xff3d9a,
    flash: 1, fireball: 84, fireballs: 16, sparks: 40, smoke: 22, debris: 14,
    shake: 13, hitStop: 90, slowMo: { scale: 0.35, dur: 0.4 }, sound: 'explosionLarge', scorch: true, light: 4.2,
    lingerFire: { dur: 3, radius: 80 },
  },
  final: {
    id: 'final', radius: 260, damage: 200, chainRadius: 300,
    color: 0xffffff, color2: 0xffc46a,
    flash: 1, fireball: 110, fireballs: 20, sparks: 60, smoke: 30, debris: 20,
    shake: 16, hitStop: 120, slowMo: { scale: 0.3, dur: 0.6 }, sound: 'explosionLarge', scorch: true, light: 5,
    lingerFire: { dur: 4, radius: 110 },
  },
};
