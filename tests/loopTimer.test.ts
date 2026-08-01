import { describe, expect, it } from 'vitest';
import { LoopTimer, LOOP_SECONDS, PHASE_AT, RESET_DURATION } from '../src/play/systems/LoopTimer';

describe('loop timer state machine', () => {
  it('starts in CALM with full time', () => {
    const t = new LoopTimer();
    expect(t.phase).toBe('CALM');
    expect(t.remaining).toBe(LOOP_SECONDS);
    expect(t.state).toBe('RUNNING');
  });

  it('transitions through escalation phases at the right times', () => {
    const t = new LoopTimer();
    const phases: string[] = [];
    t.update(1);
    t.update(LOOP_SECONDS - PHASE_AT.RISING + 1); // cross below 5:00
    expect(t.phase).toBe('RISING');
    t.update(PHASE_AT.RISING - PHASE_AT.DANGER);
    expect(t.phase).toBe('DANGER');
    t.update(PHASE_AT.DANGER - PHASE_AT.FINAL);
    expect(t.phase).toBe('FINAL');
    t.update(PHASE_AT.FINAL - PHASE_AT.FINAL10);
    expect(t.phase).toBe('FINAL10');
    t.update(PHASE_AT.FINAL10);
    expect(t.phase).toBe('RESETTING');
    void phases;
  });

  it('emits onPhase callbacks', () => {
    const seen: string[] = [];
    const t = new LoopTimer(60, { onPhase: (p) => seen.push(p) });
    t.update(51); // below 10s → FINAL10
    expect(seen).toContain('FINAL10');
    t.update(10);
    expect(t.phase).toBe('RESETTING');
  });

  it('emits onSecond only on whole-second boundaries', () => {
    const secs: number[] = [];
    const t = new LoopTimer(10, { onSecond: (s) => secs.push(s) });
    t.update(0.4);
    t.update(0.4);
    t.update(0.4); // 1.2s elapsed → ceil(8.8) = 9
    expect(secs).toEqual([9]);
    t.update(8.8); // hits zero → RESETTING
    expect(secs).toEqual([9, 0]);
  });

  it('reset sequence finishes into DONE after RESET_DURATION', () => {
    const t = new LoopTimer(5);
    t.update(5);
    expect(t.phase).toBe('RESETTING');
    t.update(RESET_DURATION);
    expect(t.phase).toBe('DONE');
    expect(t.state).toBe('FINISHED');
    t.update(100); // no further movement
    expect(t.phase).toBe('DONE');
  });

  it('pause freezes time', () => {
    const t = new LoopTimer(100);
    t.pause();
    t.update(50);
    expect(t.remaining).toBe(100);
    t.resume();
    t.update(10);
    expect(t.remaining).toBe(90);
  });

  it('progress reports 0..1', () => {
    const t = new LoopTimer(100);
    expect(t.progress).toBe(0);
    t.update(25);
    expect(t.progress).toBeCloseTo(0.25);
  });

  it('calls onReset exactly once', () => {
    let resets = 0;
    const t = new LoopTimer(3, { onReset: () => resets++ });
    t.update(3);
    t.update(5);
    expect(resets).toBe(1);
  });
});
