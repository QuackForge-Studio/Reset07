/**
 * RESET//07 — seven-minute loop timer (pure state machine, no Phaser deps).
 *
 * Phases are derived from remaining time; hard states (RESETTING → GARAGE)
 * are driven by the scene calling advance(). Unit-testable.
 */

export const LOOP_SECONDS = 7 * 60;

export type LoopPhase = 'CALM' | 'RISING' | 'DANGER' | 'FINAL' | 'FINAL10' | 'RESETTING' | 'DONE';

export const PHASE_AT = {
  RISING: 5 * 60, // below 5:00 → escalation 1
  DANGER: 3 * 60, // below 3:00 → sirens, corruption
  FINAL: 1 * 60, // below 1:00 → final minute
  FINAL10: 10, // last ten seconds
} as const;

export const RESET_DURATION = 8; // seconds the reset sequence takes

export interface LoopCallbacks {
  onPhase?: (phase: LoopPhase, remaining: number) => void;
  onSecond?: (remaining: number) => void;
  onReset?: () => void;
}

export class LoopTimer {
  duration: number;
  remaining: number;
  state: 'RUNNING' | 'PAUSED' | 'FINISHED' = 'RUNNING';
  phase: LoopPhase = 'CALM';
  private cb: LoopCallbacks;
  private lastWholeSecond = -1;
  private resetElapsed = 0;

  constructor(duration = LOOP_SECONDS, cb: LoopCallbacks = {}) {
    this.duration = duration;
    this.remaining = duration;
    this.cb = cb;
    this.lastWholeSecond = Math.ceil(duration); // baseline: first emit happens on change
  }

  get progress(): number {
    return 1 - this.remaining / this.duration;
  }

  /** Advance by unscaled seconds. */
  update(dt: number): void {
    if (this.state === 'FINISHED') return;
    if (this.state === 'PAUSED') return;

    if (this.phase === 'RESETTING') {
      this.resetElapsed += dt;
      if (this.resetElapsed >= RESET_DURATION) {
        this.phase = 'DONE';
        this.state = 'FINISHED';
        this.cb.onPhase?.(this.phase, this.remaining);
      }
      return;
    }

    this.remaining = Math.max(0, this.remaining - dt);
    const whole = Math.ceil(this.remaining);
    if (whole !== this.lastWholeSecond) {
      this.lastWholeSecond = whole;
      this.cb.onSecond?.(whole);
    }

    const next =
      this.remaining <= 0
        ? 'RESETTING'
        : this.remaining <= PHASE_AT.FINAL10
          ? 'FINAL10'
          : this.remaining <= PHASE_AT.FINAL
            ? 'FINAL'
            : this.remaining <= PHASE_AT.DANGER
              ? 'DANGER'
              : this.remaining <= PHASE_AT.RISING
                ? 'RISING'
                : 'CALM';

    if (next !== this.phase) {
      this.phase = next;
      this.cb.onPhase?.(next, this.remaining);
      if (next === 'RESETTING') {
        this.resetElapsed = 0;
        this.cb.onReset?.();
      }
    }
  }

  pause(): void {
    if (this.state === 'RUNNING') this.state = 'PAUSED';
  }

  resume(): void {
    if (this.state === 'PAUSED') this.state = 'RUNNING';
  }

  get isReset(): boolean {
    return this.phase === 'RESETTING' || this.phase === 'DONE';
  }
}
