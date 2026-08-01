/**
 * RESET//07 — audio engine.
 *
 * 100% WebAudio synthesis: no audio files, nothing licensed, nothing to miss.
 * SFX are layered recipes; music is a procedural step sequencer whose
 * intensity follows the loop phase. Never plays before a user gesture.
 */

import { bus } from '../bridge';

export type SfxName =
  | 'weapon' | 'impact' | 'dash' | 'interact' | 'playerDamage' | 'enemyHit' | 'enemyDie'
  | 'explosionSmall' | 'explosionMed' | 'explosionLarge' | 'explosionElectric' | 'gasIgnite'
  | 'siren' | 'countdown' | 'memory' | 'objective' | 'reset' | 'bossAttack' | 'ui'
  | 'uiBack' | 'overdrive' | 'dashReady' | 'gateOpen' | 'capsuleOpen' | 'beep' | 'thud' | 'spark';

interface ToneOpts {
  type?: OscillatorType;
  f0: number;
  f1?: number;
  dur: number;
  vol?: number;
  delay?: number;
  curve?: 'exp' | 'lin';
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  filter?: BiquadFilterType;
  f0?: number;
  f1?: number;
  q?: number;
  delay?: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicGain!: GainNode;
  private sfxGain!: GainNode;
  private dialogueGain!: GainNode;
  private noiseBuf!: AudioBuffer;
  private echo!: DelayNode;
  private echoGain!: GainNode;
  private initVols = { master: 0.9, music: 0.7, sfx: 0.9, dialogue: 1 };
  private music: MusicEngine | null = null;
  ready = false;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init(): void {
    if (this.ready) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.dialogueGain = this.ctx.createGain();
      this.master.gain.value = this.initVols.master;
      this.musicGain.gain.value = this.initVols.music;
      this.sfxGain.gain.value = this.initVols.sfx;
      this.dialogueGain.gain.value = this.initVols.dialogue;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.dialogueGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      // shared noise buffer
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // echo bus for explosions
      this.echo = this.ctx.createDelay(1);
      this.echo.delayTime.value = 0.22;
      this.echoGain = this.ctx.createGain();
      this.echoGain.gain.value = 0.3;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.35;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      this.echo.connect(this.echoGain);
      this.echoGain.connect(lp);
      lp.connect(fb);
      fb.connect(this.echo);
      lp.connect(this.master);
      this.ready = true;
      this.music = new MusicEngine(this.ctx, this.musicGain);
      window.addEventListener('pointerdown', this.resumeCtx, { passive: true });
      window.addEventListener('keydown', this.resumeCtx);
    } catch {
      this.ready = false;
    }
  }

  private resumeCtx = (): void => {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  };

  setVolumes(v: { master: number; music: number; sfx: number; dialogue: number }): void {
    this.initVols = v;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(v.master, t, 0.05);
    this.musicGain.gain.setTargetAtTime(v.music, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(v.sfx, t, 0.05);
    this.dialogueGain.gain.setTargetAtTime(v.dialogue, t, 0.05);
  }

  // ── primitives ──────────────────────────────────────────

  private tone(o: ToneOpts, out?: AudioNode): void {
    if (!this.ctx || !this.ready) return;
    const t0 = this.ctx.currentTime + (o.delay ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.f0), t0);
    const dur = Math.max(0.02, o.dur);
    if (o.f1 !== undefined) {
      if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + dur);
    }
    const g = this.ctx.createGain();
    const vol = o.vol ?? 0.5;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(out ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(o: NoiseOpts, out?: AudioNode): void {
    if (!this.ctx || !this.ready) return;
    const t0 = this.ctx.currentTime + (o.delay ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    let node: AudioNode = src;
    if (o.filter) {
      const f = this.ctx.createBiquadFilter();
      f.type = o.filter;
      f.frequency.setValueAtTime(o.f0 ?? 1000, t0);
      if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(10, o.f1), t0 + o.dur);
      f.Q.value = o.q ?? 0.8;
      node.connect(f);
      node = f;
    }
    const g = this.ctx.createGain();
    const vol = o.vol ?? 0.4;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    node.connect(g);
    g.connect(out ?? this.sfxGain);
    src.start(t0);
    src.stop(t0 + o.dur + 0.05);
  }

  private boom(t0: number, subF: number, vol: number): void {
    // layered explosion core: sub drop + crack + body
    this.tone({ type: 'sine', f0: subF * 2, f1: 30, dur: 0.5, vol: vol * 0.9, delay: t0 });
    this.tone({ type: 'triangle', f0: subF, f1: 40, dur: 0.32, vol: vol * 0.7, delay: t0 });
    this.noise({ dur: 0.5, vol: vol * 0.8, filter: 'lowpass', f0: 2600, f1: 90, delay: t0 });
    this.noise({ dur: 0.28, vol: vol * 0.5, filter: 'bandpass', f0: 900, f1: 300, q: 1.2, delay: t0 + 0.02 });
  }

  // ── public SFX ──────────────────────────────────────────

  play(name: SfxName, vol = 1): void {
    if (!this.ready) return;
    const v = (x: number) => x * vol;
    switch (name) {
      case 'weapon':
        this.tone({ type: 'square', f0: 880, f1: 240, dur: 0.07, vol: v(0.16) });
        this.noise({ dur: 0.04, vol: v(0.1), filter: 'highpass', f0: 3000 });
        break;
      case 'impact':
        this.noise({ dur: 0.05, vol: v(0.2), filter: 'highpass', f0: 2200 });
        this.tone({ type: 'triangle', f0: 1400, f1: 900, dur: 0.04, vol: v(0.12) });
        break;
      case 'spark':
        this.noise({ dur: 0.09, vol: v(0.25), filter: 'highpass', f0: 5200 });
        break;
      case 'dash':
        this.noise({ dur: 0.18, vol: v(0.3), filter: 'bandpass', f0: 500, f1: 2400, q: 1.4 });
        this.tone({ type: 'sine', f0: 300, f1: 760, dur: 0.16, vol: v(0.12) });
        break;
      case 'dashReady':
        this.tone({ type: 'sine', f0: 620, dur: 0.05, vol: v(0.08) });
        break;
      case 'interact':
        this.tone({ type: 'sine', f0: 520, f1: 700, dur: 0.09, vol: v(0.2) });
        this.tone({ type: 'sine', f0: 780, dur: 0.07, vol: v(0.12), delay: 0.07 });
        break;
      case 'playerDamage':
        this.tone({ type: 'sawtooth', f0: 320, f1: 70, dur: 0.22, vol: v(0.35) });
        this.noise({ dur: 0.12, vol: v(0.3), filter: 'lowpass', f0: 1500, f1: 300 });
        break;
      case 'enemyHit':
        this.tone({ type: 'triangle', f0: 1250, f1: 950, dur: 0.045, vol: v(0.15) });
        break;
      case 'enemyDie':
        this.tone({ type: 'square', f0: 500, f1: 110, dur: 0.18, vol: v(0.22) });
        this.noise({ dur: 0.16, vol: v(0.25), filter: 'bandpass', f0: 1200, f1: 400 });
        break;
      case 'explosionSmall':
        this.boom(0, 130, v(0.7));
        this.noise({ dur: 0.3, vol: v(0.3), filter: 'highpass', f0: 1800, delay: 0.03 }); // debris
        break;
      case 'explosionMed':
        this.boom(0, 100, v(0.9));
        this.noise({ dur: 0.45, vol: v(0.4), filter: 'highpass', f0: 1400, delay: 0.04 });
        this.tone({ type: 'sine', f0: 60, f1: 24, dur: 0.7, vol: v(0.5), delay: 0.01 });
        break;
      case 'explosionLarge':
        this.boom(0, 70, v(1.0));
        this.boom(0.09, 90, v(0.6));
        this.noise({ dur: 0.8, vol: v(0.45), filter: 'highpass', f0: 1100, delay: 0.05 });
        this.noise({ dur: 0.5, vol: v(0.5), filter: 'lowpass', f0: 500, f1: 60, delay: 0.12 });
        this.tone({ type: 'sine', f0: 50, f1: 20, dur: 1.1, vol: v(0.6), delay: 0.02 });
        if (this.echo && this.ctx) {
          const g = this.ctx.createGain();
          g.gain.value = 0.7;
          g.connect(this.echo);
          this.noise({ dur: 0.4, vol: v(0.4), filter: 'bandpass', f0: 700, q: 1, delay: 0.02 }, g);
        }
        break;
      case 'explosionElectric':
        this.tone({ type: 'sawtooth', f0: 220, f1: 60, dur: 0.3, vol: v(0.4) });
        for (let i = 0; i < 6; i++) {
          this.noise({ dur: 0.05, vol: v(0.35), filter: 'highpass', f0: 4000, delay: i * 0.05 });
          this.tone({ type: 'square', f0: 1600 + Math.random() * 1200, dur: 0.04, vol: v(0.12), delay: i * 0.05 });
        }
        break;
      case 'gasIgnite':
        this.noise({ dur: 0.9, vol: v(0.5), filter: 'lowpass', f0: 2200, f1: 300 });
        this.tone({ type: 'sawtooth', f0: 120, f1: 60, dur: 0.5, vol: v(0.3) });
        break;
      case 'siren':
        this.tone({ type: 'square', f0: 620, dur: 0.45, vol: v(0.14) });
        this.tone({ type: 'square', f0: 460, dur: 0.45, vol: v(0.14), delay: 0.45 });
        break;
      case 'countdown':
        this.tone({ type: 'square', f0: 880, dur: 0.09, vol: v(0.2) });
        break;
      case 'beep':
        this.tone({ type: 'sine', f0: 660, dur: 0.07, vol: v(0.15) });
        break;
      case 'thud':
        this.tone({ type: 'sine', f0: 110, f1: 40, dur: 0.25, vol: v(0.5) });
        break;
      case 'memory':
        this.tone({ type: 'sine', f0: 784, dur: 0.12, vol: v(0.25) });
        this.tone({ type: 'sine', f0: 988, dur: 0.12, vol: v(0.22), delay: 0.09 });
        this.tone({ type: 'sine', f0: 1319, dur: 0.22, vol: v(0.2), delay: 0.18 });
        this.tone({ type: 'sine', f0: 1976, dur: 0.3, vol: v(0.06), delay: 0.28 });
        break;
      case 'objective':
        this.tone({ type: 'sine', f0: 660, dur: 0.1, vol: v(0.22) });
        this.tone({ type: 'sine', f0: 990, dur: 0.18, vol: v(0.22), delay: 0.1 });
        break;
      case 'reset':
        this.tone({ type: 'sawtooth', f0: 200, f1: 1200, dur: 0.9, vol: v(0.25) }); // reverse-ish sweep
        this.tone({ type: 'sine', f0: 90, f1: 30, dur: 1.4, vol: v(0.4), delay: 0.5 });
        this.noise({ dur: 1.2, vol: v(0.3), filter: 'bandpass', f0: 800, f1: 200, delay: 0.1 });
        break;
      case 'bossAttack':
        this.tone({ type: 'sawtooth', f0: 140, f1: 55, dur: 0.4, vol: v(0.5) });
        this.tone({ type: 'square', f0: 220, dur: 0.3, vol: v(0.2), delay: 0.05 });
        break;
      case 'overdrive':
        this.tone({ type: 'sawtooth', f0: 180, f1: 1400, dur: 0.5, vol: v(0.3) });
        this.tone({ type: 'sine', f0: 90, f1: 40, dur: 0.6, vol: v(0.5), delay: 0.3 });
        this.noise({ dur: 0.5, vol: v(0.3), filter: 'highpass', f0: 2500, delay: 0.1 });
        break;
      case 'gateOpen':
        this.tone({ type: 'sawtooth', f0: 90, f1: 240, dur: 0.5, vol: v(0.3) });
        this.noise({ dur: 0.6, vol: v(0.25), filter: 'lowpass', f0: 900, f1: 200 });
        this.tone({ type: 'square', f0: 440, dur: 0.15, vol: v(0.15), delay: 0.25 });
        break;
      case 'capsuleOpen':
        this.tone({ type: 'sine', f0: 400, f1: 800, dur: 0.3, vol: v(0.2) });
        this.noise({ dur: 0.2, vol: v(0.15), filter: 'highpass', f0: 2000, delay: 0.1 });
        break;
      case 'ui':
        this.tone({ type: 'sine', f0: 540, dur: 0.06, vol: v(0.18) });
        break;
      case 'uiBack':
        this.tone({ type: 'sine', f0: 360, f1: 300, dur: 0.07, vol: v(0.18) });
        break;
    }
  }

  /** Radio static when a dialogue line opens. */
  dialogueBlip(char: string): void {
    if (!this.ready) return;
    this.noise({ dur: 0.22, vol: 0.12, filter: 'bandpass', f0: 1400, q: 2 });
    if (char === 'MARA') this.tone({ type: 'sine', f0: 660, dur: 0.14, vol: 0.08 });
    else if (char === 'ELI') this.tone({ type: 'sine', f0: 520, dur: 0.14, vol: 0.08 });
    else if (char === 'CORE GUARDIAN') this.tone({ type: 'square', f0: 160, dur: 0.2, vol: 0.06 });
  }

  musicIntensity(n: number): void {
    this.music?.setIntensity(n);
  }

  musicStart(): void {
    this.music?.start();
  }

  musicStop(): void {
    this.music?.stop();
  }

  duck(amount: number): void {
    // amount 0..1 — lowers music briefly (used during dialogue)
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;
    const base = this.initVols.music * this.initVols.master;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setTargetAtTime(base * (1 - amount * 0.6), t, 0.1);
  }
}

// ─────────────────────────────────────────────────────────────
// Procedural music: 16-step 8th-note sequencer, A-minor drone.
// Intensity 0 (garage) → 4 (final minute / boss).
// ─────────────────────────────────────────────────────────────

class MusicEngine {
  private ctx: AudioContext;
  private out: GainNode;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private intensity = 1;
  private bpm = 106;
  private running = false;
  // A minor: Am, F, C, G (MIDI roots)
  private roots = [45, 41, 48, 43];
  private chordIdx = 0;

  constructor(ctx: AudioContext, out: GainNode) {
    this.ctx = ctx;
    this.out = out;
  }

  setIntensity(n: number): void {
    this.intensity = Math.max(0, Math.min(4, n));
    this.bpm = this.intensity >= 4 ? 128 : 106;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const stepDur = 60 / this.bpm / 2; // 8th notes
    while (this.nextTime < this.ctx.currentTime + 0.18) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.step++;
      if (this.step % 16 === 0) this.chordIdx = (this.chordIdx + 1) % this.roots.length;
      this.nextTime += stepDur;
    }
  }

  private midi(n: number): number {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  private playStep(step: number, t: number, dur: number): void {
    const s16 = step % 16;
    const root = this.roots[this.chordIdx];
    const inten = this.intensity;

    // kick on quarters for intensity ≥ 3
    if (inten >= 3 && s16 % 4 === 0) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.5 * (inten >= 4 ? 1 : 0.6), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g);
      g.connect(this.out);
      o.start(t);
      o.stop(t + 0.2);
    }

    // bass: root 8ths, octave jumps on odd steps (intensity ≥ 1)
    if (inten >= 1) {
      const oct = s16 % 2 === 0 ? 0 : 12;
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      const f = this.midi(root + oct);
      o.frequency.setValueAtTime(f, t);
      const g = this.ctx.createGain();
      const v = inten >= 3 ? 0.5 : 0.34;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);
      o.connect(g);
      g.connect(this.out);
      o.start(t);
      o.stop(t + dur);
      if (inten >= 4 && s16 % 8 === 6) {
        // anxious semitone grace
        const o2 = this.ctx.createOscillator();
        o2.type = 'sawtooth';
        o2.frequency.setValueAtTime(this.midi(root + 13), t);
        const g2 = this.ctx.createGain();
        g2.gain.setValueAtTime(0.1, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        o2.connect(g2);
        g2.connect(this.out);
        o2.start(t);
        o2.stop(t + 0.1);
      }
    }

    // arp: 16ths, minor pentatonic shimmer (intensity ≥ 2)
    if (inten >= 2) {
      const pattern = [0, 7, 12, 7, 3, 10, 15, 10, 0, 7, 12, 19, 15, 10, 7, 3];
      const n = root + 24 + pattern[s16];
      if (s16 % 2 === 0 || inten >= 3) {
        const o = this.ctx.createOscillator();
        o.type = 'square';
        o.frequency.setValueAtTime(this.midi(n), t);
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(inten >= 3 ? 2600 : 1500, t);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.05 + inten * 0.02, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.5);
        o.connect(f);
        f.connect(g);
        g.connect(this.out);
        o.start(t);
        o.stop(t + dur);
      }
    }

    // pad: detuned saws, every 4 steps (intensity ≥ 2)
    if (inten >= 2 && s16 % 4 === 0) {
      for (const det of [-6, 6]) {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(this.midi(root + 24), t);
        o.detune.value = det;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.035 * inten * 0.5, t + 0.3);
        g.gain.linearRampToValueAtTime(0.001, t + dur * 3.6);
        o.connect(g);
        g.connect(this.out);
        o.start(t);
        o.stop(t + dur * 4);
      }
    }

    // hats / tension ticks (intensity ≥ 3)
    if (inten >= 3 && s16 % 2 === 1) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.makeTick();
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(inten >= 4 ? 0.16 : 0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(g);
      g.connect(this.out);
      src.start(t);
    }

    // final-minute alarm pulse (intensity 4): every 4 steps
    if (inten >= 4 && s16 % 4 === 2) {
      const o = this.ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(880, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g);
      g.connect(this.out);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  private tickBuf: AudioBuffer | null = null;
  private makeTick(): AudioBuffer {
    if (this.tickBuf) return this.tickBuf;
    const len = this.ctx.sampleRate * 0.05;
    this.tickBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.tickBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return this.tickBuf;
  }
}

export const audio = new AudioEngine();

// keep bus import used (audio errors surface via bridge in debug builds)
void bus;
