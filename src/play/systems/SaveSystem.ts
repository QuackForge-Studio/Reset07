/**
 * RESET//07 — save system.
 *
 * localStorage-backed, versioned, validated, migration-ready.
 * Storage is injectable so the serialization logic is unit-testable in Node.
 */

export type EffectsQuality = 'low' | 'med' | 'high';
export type ShakeSetting = 'off' | 'low' | 'high';

export interface Settings {
  lang: 'en' | 'vi';
  master: number; // 0..1
  music: number; // 0..1
  sfx: number; // 0..1
  dialogue: number; // 0..1
  effectsQuality: EffectsQuality;
  cameraShake: ShakeSetting;
  flashIntensity: 'reduced' | 'full';
  reducedMotion: boolean;
  autoAim: boolean;
  aimAssist: number; // 0..1
  highContrast: boolean;
}

export interface LoopSummary {
  loop: number;
  survived: number; // seconds survived
  kills: number;
  rescues: number;
  chains: number;
  outcome: 'reset' | 'ending' | 'quit';
}

export interface SaveData {
  version: number;
  story: {
    loops: number; // completed (reset-witnessing) loops
    bestTime: number;
    endings: Record<string, boolean>;
    endingCount: number;
  };
  memories: string[];
  rescued: string[];
  routes: string[];
  flags: string[]; // persistent story flags (challenges, hidden objectives)
  modulesOwned: string[];
  modulesEquipped: string[];
  dialogueSeen: string[];
  tutorialsDone: string[];
  stats: { kills: number; rescues: number; chains: number; deaths: number; totalTime: number };
  settings: Settings;
  lastLoop?: LoopSummary;
  createdAt: number;
  updatedAt: number;
}

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'reset07.save.v1';

export const DEFAULT_SETTINGS: Settings = {
  lang: 'en',
  master: 0.9,
  music: 0.7,
  sfx: 0.9,
  dialogue: 1,
  effectsQuality: 'high',
  cameraShake: 'high',
  flashIntensity: 'full',
  reducedMotion: false,
  autoAim: false,
  aimAssist: 0.5,
  highContrast: false,
};

export function freshSave(): SaveData {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    story: { loops: 0, bestTime: 0, endings: {}, endingCount: 0 },
    memories: [],
    rescued: [],
    routes: [],
    flags: [],
    modulesOwned: [],
    modulesEquipped: [],
    dialogueSeen: [],
    tutorialsDone: [],
    stats: { kills: 0, rescues: 0, chains: 0, deaths: 0, totalTime: 0 },
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now,
    updatedAt: now,
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length?: number;
  key?(index: number): string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Migration table: from-version → migrator. Extend for future save versions. */
const MIGRATORS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 is the first shipped version; future versions add entries here.
};

function sanitizeSettings(raw: unknown): Settings {
  const s = isRecord(raw) ? raw : {};
  const q = (v: unknown, def: EffectsQuality): EffectsQuality =>
    v === 'low' || v === 'med' || v === 'high' ? v : def;
  const num = (v: unknown, def: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : def;
  const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def);
  const str = <T extends string>(v: unknown, def: T, allowed: readonly T[]): T =>
    typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : def;
  return {
    lang: str(s.lang, 'en', ['en', 'vi'] as const),
    master: num(s.master, DEFAULT_SETTINGS.master, 1),
    music: num(s.music, DEFAULT_SETTINGS.music, 1),
    sfx: num(s.sfx, DEFAULT_SETTINGS.sfx, 1),
    dialogue: num(s.dialogue, DEFAULT_SETTINGS.dialogue, 1),
    effectsQuality: q(s.effectsQuality, DEFAULT_SETTINGS.effectsQuality),
    cameraShake: str(s.cameraShake, DEFAULT_SETTINGS.cameraShake, ['off', 'low', 'high'] as const),
    flashIntensity: str(s.flashIntensity, DEFAULT_SETTINGS.flashIntensity, ['reduced', 'full'] as const),
    reducedMotion: bool(s.reducedMotion, DEFAULT_SETTINGS.reducedMotion),
    autoAim: bool(s.autoAim, DEFAULT_SETTINGS.autoAim),
    aimAssist: num(s.aimAssist, DEFAULT_SETTINGS.aimAssist, 1),
    highContrast: bool(s.highContrast, DEFAULT_SETTINGS.highContrast),
  };
}

/** Validate + normalize an unknown parsed save into a safe SaveData. */
export function normalizeSave(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.version !== 'number' || raw.version < 1) return null;
  let d: Record<string, unknown> = raw;
  // Run migrations forward.
  let v = raw.version;
  let guard = 0;
  while (typeof v === 'number' && MIGRATORS[v] && guard++ < 20) {
    d = MIGRATORS[v](d);
    v = typeof d.version === 'number' ? d.version : v + 1;
  }
  if (v > SAVE_VERSION) return null; // save from a future version — do not clobber

  const strArr = (x: unknown): string[] =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : [];

  const story = isRecord(d.story) ? d.story : {};
  const endings = isRecord(story.endings) ? story.endings : {};
  const cleanEndings: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(endings)) if (typeof val === 'boolean') cleanEndings[k] = val;
  const stats = isRecord(d.stats) ? d.stats : {};

  const settings = sanitizeSettings(d.settings);

  const save: SaveData = {
    version: SAVE_VERSION,
    story: {
      loops: typeof story.loops === 'number' && story.loops >= 0 ? Math.floor(story.loops) : 0,
      bestTime: typeof story.bestTime === 'number' && story.bestTime >= 0 ? story.bestTime : 0,
      endings: cleanEndings,
      endingCount: typeof story.endingCount === 'number' ? Math.floor(story.endingCount) : Object.keys(cleanEndings).length,
    },
    memories: strArr(d.memories).slice(0, 64),
    rescued: strArr(d.rescued).slice(0, 32),
    routes: strArr(d.routes).slice(0, 32),
    flags: strArr(d.flags).slice(0, 64),
    modulesOwned: strArr(d.modulesOwned).slice(0, 8),
    modulesEquipped: strArr(d.modulesEquipped).slice(0, 2),
    dialogueSeen: strArr(d.dialogueSeen).slice(0, 512),
    tutorialsDone: strArr(d.tutorialsDone).slice(0, 128),
    stats: {
      kills: typeof stats.kills === 'number' ? Math.floor(stats.kills) : 0,
      rescues: typeof stats.rescues === 'number' ? Math.floor(stats.rescues) : 0,
      chains: typeof stats.chains === 'number' ? Math.floor(stats.chains) : 0,
      deaths: typeof stats.deaths === 'number' ? Math.floor(stats.deaths) : 0,
      totalTime: typeof stats.totalTime === 'number' ? stats.totalTime : 0,
    },
    settings,
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
    updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
  };
  return save;
}

export interface SaveResult {
  data: SaveData;
  corruptedBackup?: string; // original payload backed up under a recovery key
}

export class SaveSystem {
  private storage: StorageLike;

  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  load(): SaveResult {
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return { data: freshSave() };
    try {
      const parsed: unknown = JSON.parse(raw);
      const data = normalizeSave(parsed);
      if (data) return { data };
      // Corrupt / unreadable → back up and start fresh.
      this.backupCorrupt(raw);
      return { data: freshSave(), corruptedBackup: raw };
    } catch {
      this.backupCorrupt(raw);
      return { data: freshSave(), corruptedBackup: raw };
    }
  }

  private backupCorrupt(raw: string) {
    try {
      this.storage.setItem(`${SAVE_KEY}.corrupt.${Date.now()}`, raw.slice(0, 20000));
      this.storage.removeItem(SAVE_KEY);
    } catch {
      /* storage full — drop it */
    }
  }

  save(data: SaveData): void {
    data.updatedAt = Date.now();
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* quota exceeded — try to drop backup keys, then retry once */
      try {
        for (let i = 0; i < (this.storage.length ?? 0); i++) {
          const k = this.storage.key?.(i);
          if (k && k.includes('.corrupt.')) this.storage.removeItem(k);
        }
        this.storage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch {
        /* give up silently — in-memory state still valid this session */
      }
    }
  }

  clear(): void {
    this.storage.removeItem(SAVE_KEY);
  }

  get hasSave(): boolean {
    return this.storage.getItem(SAVE_KEY) !== null;
  }
}

/** Default instance bound to window.localStorage (used by the app). */
export const saveSystem: SaveSystem = new SaveSystem(
  typeof window !== 'undefined' ? window.localStorage : (null as unknown as StorageLike),
);
