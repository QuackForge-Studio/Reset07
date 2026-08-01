/**
 * RESET//07 — unified input state (keyboard + mouse + gamepad + touch).
 * The scene polls this every frame; touch control values are pushed by the
 * React layer through the bridge API.
 */

import Phaser from 'phaser';
import { bus } from '../bridge';

export interface InputState {
  moveX: number;
  moveY: number;
  aimActive: boolean;
  aimAngle: number;
  fire: boolean;
  dashPressed: boolean;
  interactPressed: boolean;
  interactHeld: boolean;
  overdrivePressed: boolean;
  pausePressed: boolean;
  aimAssist: number;
  autoAim: boolean;
  touchAutoFire: boolean; // touch mode: autofire when target in range
  touchAimActive: boolean;
}

/** Values pushed by touch controls (React). */
export const touchInput = {
  moveX: 0,
  moveY: 0,
  aimActive: false,
  aimAngle: 0,
  firing: false,
  dashQueued: false,
  interactQueued: false,
  interactHeld: false,
  overdriveQueued: false,
};

/** Clear transient touch state when gameplay is paused, restarted, or unmounted. */
export function resetTouchInput(): void {
  touchInput.moveX = 0;
  touchInput.moveY = 0;
  touchInput.aimActive = false;
  touchInput.aimAngle = 0;
  touchInput.firing = false;
  touchInput.dashQueued = false;
  touchInput.interactQueued = false;
  touchInput.interactHeld = false;
  touchInput.overdriveQueued = false;
}

export function queueTouchDash(): void {
  touchInput.dashQueued = true;
}

export function queueTouchOverdrive(): void {
  touchInput.overdriveQueued = true;
}

export class InputManager {
  private scene: Phaser.Scene & { playerPos?: { x: number; y: number } };
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private mouseDown = false;
  private dashWasDown = false;
  private interactWasDown = false;
  private odWasDown = false;
  private pauseWasDown = false;
  inputMode: 'kb' | 'touch' = 'kb';

  constructor(scene: Phaser.Scene) {
    this.scene = scene as typeof this.scene;
    resetTouchInput();
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E,Q,ESC,SHIFT', true) as Record<string, Phaser.Input.Keyboard.Key>;
    } else {
      this.keys = {};
    }
    scene.input.on('pointerdown', (pt: Phaser.Input.Pointer) => {
      if (pt.button === 0) this.mouseDown = true;
      this.detectMode(pt);
    });
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button === 0) this.mouseDown = false;
    });
    this.inputMode = window.matchMedia('(pointer: coarse)').matches ? 'touch' : 'kb';
    bus.emit('inputMode', this.inputMode);
  }

  private detectMode(_p: Phaser.Input.Pointer): void {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) {
      this.inputMode = 'touch';
      bus.emit('inputMode', 'touch');
    }
  }

  get mode(): 'kb' | 'touch' {
    return this.inputMode;
  }

  private key(name: string): boolean {
    const k = this.keys[name];
    return k ? k.isDown : false;
  }

  sample(): InputState {
    // movement: keyboard
    let mx = 0;
    let my = 0;
    if (this.key('A') || this.key('LEFT')) mx -= 1;
    if (this.key('D') || this.key('RIGHT')) mx += 1;
    if (this.key('W') || this.key('UP')) my -= 1;
    if (this.key('S') || this.key('DOWN')) my += 1;
    // gamepad
    const pad = this.readPad();
    if (pad) {
      const lx = pad.axes[0]?.getValue() ?? 0;
      const ly = pad.axes[1]?.getValue() ?? 0;
      const dead = 0.18;
      if (Math.abs(lx) > dead || Math.abs(ly) > dead) {
        mx = lx;
        my = ly;
      }
    }
    if (this.inputMode === 'touch') {
      mx = touchInput.moveX;
      my = touchInput.moveY;
    }

    // aim: mouse
    let aimActive = false;
    let aimAngle = 0;
    if (this.inputMode !== 'touch') {
      const mp = this.scene.input.activePointer;
      const w = this.scene.cameras.main.getWorldPoint(mp.x, mp.y);
      const pp = this.scene.playerPos ?? { x: w.x, y: w.y };
      aimAngle = Math.atan2(w.y - pp.y, w.x - pp.x);
      aimActive = true;
      if (pad) {
        const rx = pad.axes[2]?.getValue() ?? 0;
        const ry = pad.axes[3]?.getValue() ?? 0;
        if (Math.abs(rx) > 0.22 || Math.abs(ry) > 0.22) {
          aimAngle = Math.atan2(ry, rx);
          aimActive = true;
        }
      }
    } else {
      aimActive = touchInput.aimActive;
      aimAngle = touchInput.aimAngle;
    }

    // fire
    let fire = this.mouseDown && this.inputMode !== 'touch';
    if (pad) {
      const rt = pad.buttons[7]?.pressed ?? false;
      if (rt) fire = true;
      const lt = pad.buttons[6]?.pressed ?? false;
      if (lt) fire = true;
    }
    if (this.inputMode === 'touch') fire = touchInput.firing;

    const dash = this.key('SPACE') || this.key('SHIFT') || (pad?.buttons[0]?.pressed ?? false) || touchInput.dashQueued;
    const interact = this.key('E') || (pad?.buttons[1]?.pressed ?? false) || touchInput.interactQueued;
    const interactHeld = this.key('E') || (pad?.buttons[1]?.pressed ?? false) || touchInput.interactHeld;
    const od = this.key('Q') || (pad?.buttons[4]?.pressed ?? false) || (pad?.buttons[5]?.pressed ?? false) || touchInput.overdriveQueued;
    const pause = this.key('ESC') || (pad?.buttons[9]?.pressed ?? false) || (pad?.buttons[8]?.pressed ?? false);

    const st: InputState = {
      moveX: mx,
      moveY: my,
      aimActive,
      aimAngle,
      fire,
      dashPressed: dash && !this.dashWasDown,
      interactPressed: interact && !this.interactWasDown,
      interactHeld,
      overdrivePressed: od && !this.odWasDown,
      pausePressed: pause && !this.pauseWasDown,
      aimAssist: this.scene.registry.get('aimAssist') as number,
      autoAim: this.scene.registry.get('autoAim') as boolean,
      touchAutoFire: this.inputMode === 'touch',
      touchAimActive: touchInput.aimActive,
    };
    this.dashWasDown = dash;
    this.interactWasDown = interact;
    this.odWasDown = od;
    this.pauseWasDown = pause;
    touchInput.dashQueued = false;
    touchInput.interactQueued = false;
    touchInput.overdriveQueued = false;
    return st;
  }

  private readPad(): Phaser.Input.Gamepad.Gamepad | null {
    if (this.scene.input.gamepad) {
      const pads = this.scene.input.gamepad.gamepads;
      if (pads && pads.length > 0 && pads[0]) return pads[0];
    }
    return null;
  }

  /** Control labels for tutorial prompts. */
  label(action: 'move' | 'aim' | 'fire' | 'dash' | 'interact' | 'overdrive' | 'pause'): string {
    if (this.inputMode === 'touch') {
      switch (action) {
        case 'move': return 'LEFT STICK';
        case 'aim': return 'RIGHT SIDE';
        case 'fire': return 'AUTO-FIRE';
        case 'dash': return 'DASH BUTTON';
        case 'interact': return 'INTERACT BUTTON';
        case 'overdrive': return 'OVERDRIVE BUTTON';
        case 'pause': return 'PAUSE BUTTON';
      }
    }
    const pad = this.readPad();
    if (pad) {
      switch (action) {
        case 'move': return 'LEFT STICK';
        case 'aim': return 'RIGHT STICK';
        case 'fire': return 'RT';
        case 'dash': return 'A';
        case 'interact': return 'B';
        case 'overdrive': return 'LB/RB';
        case 'pause': return 'START';
      }
    }
    switch (action) {
      case 'move': return 'WASD';
      case 'aim': return 'MOUSE';
      case 'fire': return 'LMB';
      case 'dash': return 'SPACE';
      case 'interact': return 'E';
      case 'overdrive': return 'Q';
      case 'pause': return 'ESC';
    }
  }
}
