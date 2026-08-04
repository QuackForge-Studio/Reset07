import { describe, expect, it } from 'vitest';
import { pickPlayerAnim, enemyBodyParams } from '../src/play/systems/animLogic';

const IDLE_UP = { state: 'idle', row: 'up', flipX: false } as const;

describe('pickPlayerAnim', () => {
  it('stands idle when not firing and not moving, keeping last facing', () => {
    expect(pickPlayerAnim({ firing: false, moving: false, aimAngle: 0, moveX: 0, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'idle', row: 'up', flipX: false });
  });

  it('shoots right when firing while standing (aim 0 rad)', () => {
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: 0, moveX: 0, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'shoot', row: 'side', flipX: false });
  });

  it('shoots left with flipX (aim PI)', () => {
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: Math.PI, moveX: 0, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'shoot', row: 'side', flipX: true });
  });

  it('shoots up (aim -PI/2) and down (aim PI/2)', () => {
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: -Math.PI / 2, moveX: 0, moveY: 0, last: IDLE_UP }).row).toBe('up');
    expect(pickPlayerAnim({ firing: true, moving: false, aimAngle: Math.PI / 2, moveX: 0, moveY: 0, last: IDLE_UP }).row).toBe('down');
  });

  it('walks toward movement when not firing', () => {
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 1, moveY: 0, last: IDLE_UP }))
      .toEqual({ state: 'walk', row: 'side', flipX: false });
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: -1, moveY: 0, last: IDLE_UP }).flipX).toBe(true);
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 0, moveY: -1, last: IDLE_UP }).row).toBe('up');
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 0, moveY: 1, last: IDLE_UP }).row).toBe('down');
  });

  it('favors horizontal axis when diagonal (down-right)', () => {
    expect(pickPlayerAnim({ firing: false, moving: true, aimAngle: 0, moveX: 1, moveY: 1, last: IDLE_UP }))
      .toEqual({ state: 'walk', row: 'side', flipX: false });
  });

  it('walks (not shoots) while firing AND moving', () => {
    expect(pickPlayerAnim({ firing: true, moving: true, aimAngle: 0, moveX: 1, moveY: 0, last: IDLE_UP }).state).toBe('walk');
  });
});

describe('enemyBodyParams', () => {
  it('drone 40px canvas: scale 1.5, radius 19.5, centered offset 10.5', () => {
    expect(enemyBodyParams('drone', 40)).toEqual({ scale: 1.5, radius: 19.5, offsetX: 10.5, offsetY: 10.5 });
  });
  it('hunter 40px canvas: scale 1.5, radius 21, offset 9', () => {
    expect(enemyBodyParams('hunter', 40)).toEqual({ scale: 1.5, radius: 21, offsetX: 9, offsetY: 9 });
  });
  it('shield 44px canvas: scale 1.4, radius 21, offset 9.8 (centered in 44px frame)', () => {
    expect(enemyBodyParams('shield', 44)).toEqual({ scale: 1.4, radius: 21, offsetX: 9.8, offsetY: 9.8 });
  });
  it('detonator 32px canvas: scale 1.6, radius 17.6, offset 8 (centered in 32px frame)', () => {
    expect(enemyBodyParams('detonator', 32)).toEqual({ scale: 1.6, radius: 17.6, offsetX: 8, offsetY: 8 });
  });
});
