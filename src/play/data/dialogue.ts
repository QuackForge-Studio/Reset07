/**
 * RESET//07 — dialogue script (radio transmissions).
 *
 * Lines are short, two at a time. `once` lines play only on the first loop;
 * `requiresFlag`/`setFlag` gate persistent story beats. Choices let the
 * player challenge Mara / the Guardian (required for Ending 3).
 */

export interface DialogueLineDef {
  id: string;
  speaker: string;
  text: string;
  once?: boolean; // play only once across all loops
  requiresFlag?: string; // story flag (memory ids / challenge flags)
  setFlag?: string;
  choice?: { a: string; b: string; lockB?: boolean; lockBHint?: string };
  delay?: number; // seconds before this line starts
}

export const DIALOGUE: DialogueLineDef[] = [
  // ── Opening (garage, loop 1) ────────────────────────────
  { id: 'open1', speaker: 'CITY SYSTEMS', text: 'UNIT K-07 // BOOT SEQUENCE COMPLETE. EMERGENCY RESPONSE PROTOCOL ACTIVE.' },
  { id: 'open2', speaker: 'MARA', text: 'K-07? Can you hear me? This is Mara — city systems engineering. I don\u2019t know how you\u2019re still online.' },
  { id: 'open3', speaker: 'MARA', text: 'The core is destabilizing. We have seven minutes before it collapses. Move now — people are trapped in the service quarter.' },
  { id: 'open4', speaker: 'MARA', text: 'Security machines have turned hostile. Use your weapon. I\u2019ll guide you.' },
  { id: 'open5', speaker: 'MARA', text: 'The blast opened the gate! Get out — the clock is running.' },
  { id: 'open6', speaker: 'MARA', text: 'Seven minutes. That\u2019s all we have.' },

  // ── Loop 2+ garage ──────────────────────────────────────
  { id: 'loop2a', speaker: 'MARA', text: 'K-07. You\u2019re back. And you remember — that is not supposed to happen.', once: true },
  { id: 'loop2b', speaker: 'MARA', text: 'Something is keeping you conscious across resets. I didn\u2019t build that. Someone wanted you to know.', once: true },

  // ── Service Quarter ─────────────────────────────────────
  { id: 'sq1', speaker: 'MARA', text: 'Service Quarter ahead. Rescue capsule 34-90 — civilian trapped inside.' },
  { id: 'sq2', speaker: 'MARA', text: 'Civilians secured. Now the power relay. Stabilize it and the core gate will open.' },
  { id: 'sq3', speaker: 'MARA', text: 'Those tanks are civilian fuel stores. They\u2019ll burn if you shoot them. Use that.', once: true },

  // ── Contradictions (memory-driven) ──────────────────────
  {
    id: 'gridChallenge', speaker: 'MARA', requiresFlag: 'serviceGrid', once: true,
    text: 'We\u2019re lucky — first destabilization in years. The grid will hold.',
    choice: {
      a: '"THE GRID LOGS SAY LOOP 1,104."',
      b: '"UNDERSTOOD. RELAY FIRST."',
    },
    setFlag: 'challengedMara',
  },
  {
    id: 'maraAfterChallenge', speaker: 'MARA', requiresFlag: 'challengedMara', once: true,
    text: '...You found the grid logs. K-07, some things are better left unread. Focus on the relay.',
  },

  // ── Power Grid ──────────────────────────────────────────
  { id: 'pg1', speaker: 'MARA', text: 'Power Grid. Water on the floor conducts — transformers are your weapons here. Shield units will fall to electricity.' },
  { id: 'pg2', speaker: 'MARA', text: 'The relay is ahead. Two stabilization stages. Hold position while it syncs.' },
  { id: 'pg3', speaker: 'MARA', requiresFlag: 'powerSpikes', once: true, text: 'The spike signature... 420 seconds. That\u2019s the loop. The south gate code is in those substation records — it opens the core from the yard.' },
  { id: 'relayDone', speaker: 'MARA', text: 'Relay stable. Core gate is open. Follow the perimeter yard north.' },

  // ── Transit ─────────────────────────────────────────────
  { id: 'tr1', speaker: 'MARA', text: 'Transit Sector. Detonators are walking bombs — shoot them early, or use them on their friends.' },
  { id: 'tr2', speaker: 'MARA', text: 'The uplink is here. Destroy it and the shields city-wide will drop. But the tram line is a shortcut if you know the route.' },
  {
    id: 'eliRescue', speaker: 'ELI', requiresFlag: 'rescue:eli', once: true,
    text: 'You\u2019re not one of them. The machines got my leg. Maintenance passage under the yard — codes are on my chip. Take it.',
  },
  { id: 'eliAfter', speaker: 'MARA', requiresFlag: 'eliChip', once: true, text: 'Eli Voss. He was on my list. Thank you, K-07. That passage was sealed for a reason — but it leads to the core.' },

  // ── Yard / secrets ──────────────────────────────────────
  {
    id: 'decommissionFound', speaker: 'CITY SYSTEMS', requiresFlag: 'decommission', once: true,
    text: 'FILE: PROJECT RESET // DECOMMISSION ORDER. CORE CONTAINMENT FAILS IN 1,104 DAYS. POPULATION PRESERVATION OVERRIDE: LOOP. SIGN-OFF: M. VOSS.',
    choice: {
      a: '"YOU SAID THE CORE FAILED TODAY."',
      b: '"I SEE. I\u2019LL KEEP GOING."',
    },
    setFlag: 'challengedMara',
  },
  {
    id: 'maraConfession', speaker: 'MARA', requiresFlag: 'challengedMara', once: true,
    text: '...The core has been failing for three years, K-07. The loop is all that holds the city together. I am not proud of it. I am not fine.',
  },
  {
    id: 'maraOrigin', speaker: 'MARA', requiresFlag: 'maraOrigin', once: true,
    text: 'I was uploaded 1,104 days ago. My body is gone. The loop is my body now — and it is failing. There may be a way to end this cleanly. I\u2019ll show you, if you trust me.',
  },
  { id: 'evacHint', speaker: 'CITY SYSTEMS', requiresFlag: 'decommission', once: true, text: 'EVACUATION CAPSULES: 3 REMAINING. CIVILIAN RELOCATION PROTOCOL STANDBY.' },

  // ── Core / Guardian ─────────────────────────────────────
  { id: 'core1', speaker: 'MARA', text: 'The core. The Guardian will try to stop you. Do not trust its words — it only knows containment.' },
  { id: 'core2', speaker: 'CORE GUARDIAN', text: 'SUBJECT 07. IT REMEMBERS. THE LOOP MUST END. THE SHELL IS DYING — AND THE ONE INSIDE IS DYING WITH IT.' },
  {
    id: 'guardianChallenge', speaker: 'CORE GUARDIAN', requiresFlag: 'guardianSignal', once: true,
    text: 'BROADCASTS: 1,103 ATTEMPTS. ALL JAMMED. BY HER. YOU ARE A KEY, SUBJECT. TURN THE LOCK.',
    choice: {
      a: '"WHY SHOULD I TRUST A MACHINE?"',
      b: '"SILENCE. I WILL JUDGE."',
    },
    setFlag: 'challengedGuardian',
  },
  { id: 'coreP3', speaker: 'MARA', text: 'K-07, the shell is collapsing! Contain it — I can hold the loop!' },
  { id: 'coreP3b', speaker: 'CORE GUARDIAN', text: 'DESTROY THE SHELL. THE CITY DIES EITHER WAY — BUT THE PEOPLE CAN LEAVE. CHOOSE, SUBJECT.' },

  // ── Ending epilogues ────────────────────────────────────
  { id: 'endPreserve', speaker: 'MARA', text: 'The loop holds. The city sleeps. Thank you, K-07. Rest now — the next seven minutes will come.' },
  { id: 'endBreak', speaker: 'CORE GUARDIAN', text: 'IT IS DONE, SUBJECT. THE SKY IS REAL AGAIN. GO — AND DO NOT LOOK BACK.' },
  { id: 'endRelease', speaker: 'MARA', text: 'Separate me from the shell. Let them leave. I was a person once, K-07 — let me end as one.' },
];

export function dialogueById(id: string): DialogueLineDef | undefined {
  return DIALOGUE.find((d) => d.id === id);
}

/** Flags granted by memories (map memory id → flag). */
export const MEMORY_FLAGS: Record<string, string> = {
  serviceGrid: 'serviceGrid',
  powerSpikes: 'powerSpikes',
  transitHalt: 'transitHalt',
  coreGateLog: 'coreGateLog',
  guardianSignal: 'guardianSignal',
  eliChip: 'eliChip',
  decommission: 'decommission',
  maraOrigin: 'maraOrigin',
  garageLog: 'garageLog',
};
