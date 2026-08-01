/**
 * RESET//07 — equippable modules (pure rules, testable).
 * Max two equipped. Slight tactics shifts, no skill tree.
 */

export type ModuleId = 'arc' | 'breach' | 'rescue' | 'pulse' | 'cooling';

export interface ModuleDef {
  id: ModuleId;
  name: string;
  desc: string;
  icon: string; // svg icon key
}

export const MAX_EQUIPPED = 2;

export const MODULES: Record<ModuleId, ModuleDef> = {
  arc: {
    id: 'arc',
    name: 'ARC MODULE',
    desc: 'Weapon shots chain electricity between nearby enemies.',
    icon: 'arc',
  },
  breach: {
    id: 'breach',
    name: 'BREACH MODULE',
    desc: 'Dash damages breakable objects and opens weak gates.',
    icon: 'breach',
  },
  rescue: {
    id: 'rescue',
    name: 'RESCUE MODULE',
    desc: 'Interactions (capsules, relays, terminals) complete 40% faster.',
    icon: 'rescue',
  },
  pulse: {
    id: 'pulse',
    name: 'PULSE MODULE',
    desc: 'Overdrive shockwave is larger and knocks enemies down.',
    icon: 'pulse',
  },
  cooling: {
    id: 'cooling',
    name: 'COOLING MODULE',
    desc: 'Primary weapon fires 35% longer before overheating.',
    icon: 'cooling',
  },
};

export const MODULE_LIST: ModuleDef[] = (Object.keys(MODULES) as ModuleId[]).map((id) => MODULES[id]);

export function canEquip(owned: readonly string[], equipped: readonly string[], id: string): boolean {
  return owned.includes(id) && !equipped.includes(id) && equipped.length < MAX_EQUIPPED;
}

/** Returns the new equipped array (immutable). */
export function equipModule(owned: readonly string[], equipped: readonly string[], id: string): string[] {
  if (!canEquip(owned, equipped, id)) return [...equipped];
  return [...equipped, id];
}

export function unequipModule(equipped: readonly string[], id: string): string[] {
  return equipped.filter((e) => e !== id);
}

/** Module source mapping (which content grants which module). */
export const MODULE_SOURCES: Record<string, ModuleId> = {
  capsuleA: 'arc',
  capsuleChoice1: 'cooling',
  capsuleChoice2: 'pulse',
  eli: 'rescue',
  hidden: 'breach',
};
