/**
 * RESET//07 — tutorial prompts (adaptive to input mode, shown once).
 */

export interface TutorialDef {
  id: string;
  textKey: string; // string table key
  control?: 'move' | 'aim' | 'fire' | 'dash' | 'interact' | 'overdrive'; // control label substitution
  district?: string; // only shown in this district
  trigger: 'script' | 'proximity'; // script = scene fires it; proximity = near a thing
  targetId?: string; // proximity target prop id
  radius?: number;
  minLoop?: number;
  requireFlag?: string; // story flag required
}

export const TUTORIALS: TutorialDef[] = [
  { id: 'move', textKey: 'tut.move', control: 'move', trigger: 'script' },
  { id: 'fire', textKey: 'tut.fire', control: 'fire', trigger: 'script' },
  { id: 'vehicle', textKey: 'tut.vehicle', trigger: 'proximity', targetId: 'vehicle-tut', radius: 260 },
  { id: 'dash', textKey: 'tut.dash', control: 'dash', trigger: 'script' },
  { id: 'interact', textKey: 'tut.interact', control: 'interact', trigger: 'proximity', targetId: 'capsuleA', radius: 150 },
  { id: 'overdrive', textKey: 'tut.overdrive', control: 'overdrive', trigger: 'script', minLoop: 1 },
  { id: 'hintGas', textKey: 'tut.hint.gas', trigger: 'proximity', targetId: 'pipeA', radius: 240 },
  { id: 'hintPuddle', textKey: 'tut.hint.puddle', trigger: 'proximity', targetId: 'transformerA', radius: 240 },
  { id: 'hintShield', textKey: 'tut.hint.shield', trigger: 'proximity', targetId: 'spawn-shield', radius: 300 },
  { id: 'hintDetonator', textKey: 'tut.hint.detonator', trigger: 'proximity', targetId: 'spawn-detonator', radius: 300 },
];
