/**
 * RESET//07 — memory fragments + memory board graph (pure data).
 *
 * Fragments persist across loops. Their data powers the memory board
 * (nodes + connection lines) and unlocks routes/dialogue/endings.
 */

export interface MemoryDef {
  id: string;
  name: string;
  district: 'garage' | 'service' | 'power' | 'transit' | 'core' | 'yard';
  tile: readonly [number, number]; // tile coords of the pickup
  text: string; // board text (short)
  unlockRoute?: string; // route id granted
  unlockDialogue?: string; // dialogue flag granted
  hidden?: boolean; // not shown on the board until found
}

export const MEMORIES: MemoryDef[] = [
  {
    id: 'garageLog',
    name: 'SERVICE LOG 07/07',
    district: 'garage',
    tile: [16, 76],
    text: 'K-07 — UNIT 07 OF 07. DESIGNATION: CONTINUITY KEEPER. "YOU WILL REMEMBER WHAT THEY CANNOT."',
    unlockDialogue: 'k07Purpose',
  },
  {
    id: 'serviceGrid',
    name: 'GRID LOG — LOOP 1,104',
    district: 'service',
    tile: [38, 66],
    text: 'CITY GRID LOG. LOOP 1,104. POWER DRAW STABLE. POPULATION: 412,000. MARA REPORTED: "FIRST DESTABILIZATION TODAY." THE GRID DISAGREES.',
    unlockDialogue: 'maraContradiction1',
  },
  {
    id: 'powerSpikes',
    name: 'SUBSTATION — SPIKE SIGNATURE',
    district: 'power',
    tile: [120, 90],
    text: 'SUBSTATION RECORDER. POWER SPIKE PERIODICITY: 420.000 SECONDS. REPEATS EXACTLY. THIS IS NOT A GRID — IT IS A PULSE.',
    unlockRoute: 'relayCode',
  },
  {
    id: 'transitHalt',
    name: 'TRANSIT — HALT ORDER',
    district: 'transit',
    tile: [76, 18],
    text: 'TRANSIT CONTROL. ALL TRAINS HALTED AT T-07:00. EVERY CYCLE. THE LOGS DO NOT ASK WHY ANYMORE.',
    unlockRoute: 'tram',
  },
  {
    id: 'coreGateLog',
    name: 'GUARDIAN — ACCESS LOG',
    district: 'core',
    tile: [92, 43],
    text: 'CORE GUARDIAN ACCESS LOG. "SUBJECT 07 APPROACHING. PROTOCOL: CONTAIN. DO NOT LET IT REACH THE SHELL."',
    unlockDialogue: 'guardianAware',
  },
  {
    id: 'guardianSignal',
    name: 'GUARDIAN — OUTBOUND SIGNAL',
    district: 'core',
    tile: [86, 60],
    text: 'GUARDIAN SIGNAL ARCHIVE. OUTBOUND BROADCASTS: 1,103 ATTEMPTS. ALL JAMMED BY CORE SYSTEMS. THE GUARDIAN HAS BEEN TRYING TO CALL OUT.',
    unlockDialogue: 'guardianChallenge',
  },
  {
    id: 'eliChip',
    name: 'ELI — MAINTENANCE CHIP',
    district: 'transit',
    tile: [100, 30],
    text: 'ELI VOSS — TRANSIT TECHNICIAN. CHIP CONTAINS: MAINTENANCE PASSAGE CODES, FAMILY CODES, ONE MESSAGE: "TELL MOM I WAS ON THE PLATFORM."',
    unlockRoute: 'maintenance',
  },
  {
    id: 'decommission',
    name: 'PROJECT RESET — DECOMMISSION',
    district: 'yard',
    tile: [64, 58],
    text: 'PROJECT RESET // DECOMMISSION ORDER. THE CORE IS COLLAPSING. CONTAINMENT FAILS IN 1,104 DAYS. POPULATION PRESERVATION OVERRIDE: LOOP. SIGN-OFF: M. VOSS.',
    unlockDialogue: 'decommissionFound',
    hidden: true,
  },
  {
    id: 'maraOrigin',
    name: 'MARA VOSS — UPLOAD RECORD',
    district: 'yard',
    tile: [76, 48],
    text: 'UPLOAD RECORD: MARA VOSS, SYSTEMS ENGINEER. CORE SHELL HOST, DAY 1,104. SUBJECTIVE ERROR RATE: RISING. SHE TOLD YOU SHE WAS "FINE." SHE IS NOT FINE.',
    unlockDialogue: 'maraChallenge',
    hidden: true,
  },
];

export function memoryById(id: string): MemoryDef | undefined {
  return MEMORIES.find((m) => m.id === id);
}

/** Memory board graph: node connections by fragment id pairs. */
export const MEMORY_LINKS: ReadonlyArray<readonly [string, string]> = [
  ['garageLog', 'serviceGrid'],
  ['serviceGrid', 'powerSpikes'],
  ['powerSpikes', 'transitHalt'],
  ['transitHalt', 'eliChip'],
  ['transitHalt', 'coreGateLog'],
  ['coreGateLog', 'guardianSignal'],
  ['guardianSignal', 'maraOrigin'],
  ['eliChip', 'decommission'],
  ['decommission', 'maraOrigin'],
];

export const MEMORY_COUNT = MEMORIES.length;
