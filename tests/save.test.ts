import { describe, expect, it } from 'vitest';
import { SaveSystem, freshSave, normalizeSave, SAVE_VERSION, DEFAULT_SETTINGS, type SaveData } from '../src/play/systems/SaveSystem';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
}

describe('save system', () => {
  it('round-trips a save', () => {
    const st = new MemStorage();
    const sys = new SaveSystem(st);
    const d = freshSave();
    d.memories = ['garageLog', 'serviceGrid'];
    d.modulesEquipped = ['arc', 'cooling'];
    d.story.loops = 3;
    d.settings.effectsQuality = 'low';
    sys.save(d);
    const loaded = sys.load();
    expect(loaded.data.memories).toEqual(['garageLog', 'serviceGrid']);
    expect(loaded.data.modulesEquipped).toEqual(['arc', 'cooling']);
    expect(loaded.data.story.loops).toBe(3);
    expect(loaded.data.settings.effectsQuality).toBe('low');
    expect(loaded.data.settings.master).toBe(DEFAULT_SETTINGS.master);
  });

  it('returns fresh save when nothing stored', () => {
    const sys = new SaveSystem(new MemStorage());
    const { data, corruptedBackup } = sys.load();
    expect(data.story.loops).toBe(0);
    expect(corruptedBackup).toBeUndefined();
  });

  it('recovers from corrupted JSON and backs it up', () => {
    const st = new MemStorage();
    st.setItem('reset07.save.v1', '{not json!!!');
    const sys = new SaveSystem(st);
    const { data, corruptedBackup } = sys.load();
    expect(data.story.loops).toBe(0); // fresh fallback
    expect(corruptedBackup).toBe('{not json!!!');
    expect([...st.m.keys()].some((k) => k.includes('corrupt'))).toBe(true);
  });

  it('recovers from structurally invalid saves (wrong types → sanitized, no backup needed)', () => {
    const st = new MemStorage();
    st.setItem('reset07.save.v1', JSON.stringify({ version: 1, story: { loops: 'seven' }, memories: 'x', settings: { master: 99 } }));
    const { data, corruptedBackup } = new SaveSystem(st).load();
    expect(data.story.loops).toBe(0);
    expect(data.memories).toEqual([]);
    expect(data.settings.master).toBe(1); // clamped
    expect(corruptedBackup).toBeUndefined();
  });

  it('rejects saves from the future', () => {
    expect(normalizeSave({ version: SAVE_VERSION + 1 })).toBeNull();
  });

  it('migrates older versions forward (v1 baseline — no-op)', () => {
    const st = new MemStorage();
    st.setItem('reset07.save.v1', JSON.stringify(freshSave()));
    const { data } = new SaveSystem(st).load();
    expect(data.version).toBe(SAVE_VERSION);
  });

  it('clears save data', () => {
    const st = new MemStorage();
    const sys = new SaveSystem(st);
    sys.save(freshSave());
    expect(sys.hasSave).toBe(true);
    sys.clear();
    expect(sys.hasSave).toBe(false);
  });

  it('sanitizes equipped modules to at most two', () => {
    const d = freshSave();
    d.modulesEquipped = ['arc', 'cooling', 'pulse'];
    const out = normalizeSave(JSON.parse(JSON.stringify(d)));
    expect(out!.modulesEquipped).toHaveLength(2);
  });

  it('preserves unknown extra fields without crashing', () => {
    const raw = JSON.parse(JSON.stringify(freshSave())) as SaveData;
    (raw as unknown as Record<string, unknown>).extra = { nested: [1, 2, 3] };
    const out = normalizeSave(raw);
    expect(out!.story.loops).toBe(0);
  });
});
