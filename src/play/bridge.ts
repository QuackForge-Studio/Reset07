/**
 * RESET//07 — React ↔ Phaser bridge.
 *
 * The Phaser world reports to the React shell via a tiny typed event bus;
 * React renders all UI (HUD, menus, touch controls) from snapshot state.
 * DOM stays minimal during gameplay: one HUD update every ~100ms.
 */

export type ScreenId = 'title' | 'garage' | 'playing' | 'paused' | 'settings' | 'memory' | 'howto' | 'credits' | 'ending';

export interface HudSnapshot {
  screen: ScreenId;
  loop: number;
  time: { m: number; s: number; pct: number; final10: boolean };
  hp: number;
  maxHp: number;
  dash: number; // 0..1 ready→1
  heat: number; // 0..1 weapon heat (1 = overheated)
  overheat: boolean;
  overdrive: number; // 0..1
  overdriveActive: boolean;
  objective: { text: string; worldX: number; worldY: number } | null;
  sideObjectives: string[];
  interact: { label: string; kind: 'press' | 'hold'; progress?: number } | null;
  dialogue: { speaker: string; text: string; choice?: DialogueLine['choice'] } | null;
  memories: number;
  civilians: number;
  boss: { pct: number } | null;
  lowHp: boolean;
  finalMinute: boolean;
  district: string;
  inputMode: 'kb' | 'touch';
  paused: boolean;
  cam: { x: number; y: number; zoom: number; w: number; h: number } | null;
}

export interface DialogueLine {
  speaker: string;
  text: string;
  /** optional: await player action before the next line (choice) */
  choice?: { a: string; b: string; lockB?: boolean; lockBHint?: string };
}

export interface LoopEndPayload {
  outcome: 'reset' | 'ending';
  loop: number;
  survived: number;
  kills: number;
  rescues: number;
  chains: number;
  ending?: 'preserve' | 'break' | 'release';
  newMemoryCount: number;
}

export interface ToastPayload {
  text: string;
  tone: 'info' | 'good' | 'bad' | 'memory';
}

type BusEventMap = {
  hud: HudSnapshot;
  dialogue: DialogueLine | null;
  interact: { label: string; kind: 'press' | 'hold'; progress?: number } | null;
  toast: ToastPayload;
  loopEnd: LoopEndPayload;
  screen: ScreenId;
  inputMode: 'kb' | 'touch';
  ending: { id: 'preserve' | 'break' | 'release' };
  'ending-decision': { available: { preserve: boolean; break: boolean; release: boolean } };
  save: undefined;
  consoleWarn: string;
};

type Handler<T> = (payload: T) => void;

class Bus {
  private handlers = new Map<keyof BusEventMap, Set<Handler<never>>>();

  on<K extends keyof BusEventMap>(ev: K, fn: Handler<BusEventMap[K]>): () => void {
    let set = this.handlers.get(ev);
    if (!set) {
      set = new Set();
      this.handlers.set(ev, set);
    }
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof BusEventMap>(ev: K, payload: BusEventMap[K]): void {
    const set = this.handlers.get(ev);
    if (!set) return;
    for (const fn of set) (fn as Handler<BusEventMap[K]>)(payload);
  }
}

export const bus = new Bus();

// ── Snapshot store (React side) ───────────────────────────────

let snapshot: HudSnapshot = {
  screen: 'title',
  loop: 0,
  time: { m: 7, s: 0, pct: 0, final10: false },
  hp: 100,
  maxHp: 100,
  dash: 1,
  heat: 0,
  overheat: false,
  overdrive: 0,
  overdriveActive: false,
  objective: null,
  sideObjectives: [],
  interact: null,
  dialogue: null,
  memories: 0,
  civilians: 0,
  boss: null,
  lowHp: false,
  finalMinute: false,
  district: '',
  inputMode: 'kb',
  paused: false,
  cam: null,
};

let snapshotVersion = 0;
const listeners = new Set<() => void>();

export function updateSnapshot(patch: Partial<HudSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  snapshotVersion++;
  for (const l of listeners) l();
}

export function getSnapshot(): HudSnapshot {
  return snapshot;
}

export function getSnapshotVersion(): number {
  return snapshotVersion;
}

export function subscribeSnapshot(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Game API (React → Phaser) ─────────────────────────────────

export interface GameApi {
  startLoop(): void;
  pause(): void;
  resume(): void;
  restartLoop(): void;
  quitToTitle(): void;
  equipModules(ids: string[]): void;
  chooseDialogue(choice: 'a' | 'b'): void;
  chooseEnding(id: 'preserve' | 'break' | 'release'): void;
  setFullscreen(): void;
  applySettings(settings: unknown): void;
  isPaused(): boolean;
}

export const api: GameApi = {
  startLoop: () => bus.emit('consoleWarn', 'api.startLoop not wired'),
  pause: () => bus.emit('consoleWarn', 'api.pause not wired'),
  resume: () => bus.emit('consoleWarn', 'api.resume not wired'),
  restartLoop: () => bus.emit('consoleWarn', 'api.restartLoop not wired'),
  quitToTitle: () => bus.emit('consoleWarn', 'api.quitToTitle not wired'),
  equipModules: () => bus.emit('consoleWarn', 'api.equipModules not wired'),
  chooseDialogue: () => bus.emit('consoleWarn', 'api.chooseDialogue not wired'),
  chooseEnding: () => bus.emit('consoleWarn', 'api.chooseEnding not wired'),
  setFullscreen: () => bus.emit('consoleWarn', 'api.setFullscreen not wired'),
  applySettings: () => bus.emit('consoleWarn', 'api.applySettings not wired'),
  isPaused: () => false,
};
