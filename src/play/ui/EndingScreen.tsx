/**
 * RESET//07 — boss decision modal + ending screens (epilogues).
 */

import { useMemo, useState } from 'react';
import type { SaveData } from '../systems/SaveSystem';
import { api } from '../bridge';

// ── Decision modal ──────────────────────────────────────────

export function EndingDecisionModal({ available, save }: { available: { preserve: boolean; break: boolean; release: boolean }; save: SaveData }) {
  const [hint, setHint] = useState(false);
  const missing = useMemo(() => {
    const m: string[] = [];
    if (!save.rescued.includes('eli')) m.push('SAVE ELI');
    if (!save.memories.includes('eliChip')) m.push('ELI\u2019S CHIP');
    if (!save.memories.includes('decommission')) m.push('DECOMMISSION FILE');
    if (!save.memories.includes('maraOrigin')) m.push('MARA\u2019S ORIGIN');
    if (!save.flags.includes('evacDone')) m.push('EVACUATION CAPSULES');
    if (!save.flags.includes('challengedMara')) m.push('CHALLENGE MARA');
    if (!save.flags.includes('challengedGuardian')) m.push('CONFRONT THE GUARDIAN');
    return m;
  }, [save]);

  return (
    <div className="modal-backdrop">
      <div className="modal panel decision">
        <span className="type-data-xs text-muted">CORE GUARDIAN DOWN — FINAL DECISION</span>
        <h2 className="type-display">THE SHELL IS DYING</h2>
        <p className="type-ui-s text-secondary">Mara says she can hold the loop. The Guardian says the people can leave. Only one of them is telling the truth — or neither is.</p>
        <div className="decision__list">
          <button type="button" className="decision-btn decision-btn--cyan" onClick={() => api.chooseEnding('preserve')}>
            <span className="decision-btn__title">01 — PRESERVE</span>
            <span className="decision-btn__desc">Keep the reset running. The city sleeps on. Safe. Unsettling.</span>
          </button>
          <button type="button" className="decision-btn decision-btn--orange" onClick={() => api.chooseEnding('break')}>
            <span className="decision-btn__title">02 — BREAK</span>
            <span className="decision-btn__desc">Destroy the core. The loop ends. Much of the city is lost — the rest leaves.</span>
          </button>
          <button
            type="button"
            className={`decision-btn decision-btn--teal ${available.release ? '' : 'is-locked'}`}
            onClick={() => {
              if (!available.release) {
                setHint(true);
                return;
              }
              api.chooseEnding('release');
            }}
          >
            <span className="decision-btn__title">03 — RELEASE {available.release ? '' : '· LOCKED'}</span>
            <span className="decision-btn__desc">Separate Mara from the shell. Evacuate the survivors. Shut the loop down cleanly.</span>
            {!available.release && hint && <span className="decision-btn__hint">REQUIRES: {missing.join(' · ')}</span>}
          </button>
        </div>
        {!available.release && !hint && <span className="type-data-xs text-muted decision__hint-hover">RELEASE REQUIRES KNOWLEDGE FROM PAST LOOPS — TAP TO SEE WHAT'S MISSING</span>}
      </div>
    </div>
  );
}

// ── Ending screens ──────────────────────────────────────────

const EPILOGUES: Record<'preserve' | 'break' | 'release', { title: string; sub: string; body: string[]; accent: string }> = {
  preserve: {
    title: 'ENDING 01 — PRESERVE',
    sub: 'THE LOOP HOLDS',
    accent: 'cyan',
    body: [
      'The core stabilizes. Mara breathes through the city grid, one more day, one more loop.',
      'K-07 powers down in the garage, memory core humming. Somewhere above, the city sleeps its seven-minute dream.',
      'The reset was never a prison for the people. It was a hospital for the city. But the doors of a hospital are still doors.',
      'You remain conscious. That was always the point. Someone had to remember what seven minutes of freedom felt like.',
    ],
  },
  break: {
    title: 'ENDING 02 — BREAK',
    sub: 'THE SKY IS REAL AGAIN',
    accent: 'orange',
    body: [
      'The core detonates in stages — white, orange, white — until the shell is gone and the sky pours in.',
      'The loop dies screaming. Power surges, circuits fry, and for the first time in 1,104 days the city has no timer.',
      'Survivors crawl from the wreckage into an uncertain dawn. Mara\u2019s voice goes quiet in the static.',
      'K-07 stands in the burning yard. There is no next loop. There is only what you do now.',
    ],
  },
  release: {
    title: 'ENDING 03 — RELEASE',
    sub: 'EVERYONE WALKS OUT',
    accent: 'teal',
    body: [
      'The evacuation capsules open in sequence — one, two, three — and the survivors step into the yard.',
      'Mara separates from the shell as a clean signal, her voice softening to something almost human. "I was a person once," she says. "Let me end as one."',
      'The loop unwinds gently, like a held breath. The city powers down into silence — not collapse, not imprisonment. Rest.',
      'K-07 watches the last tram leave the station. Somewhere in the memory core, a small light keeps blinking. It was worth remembering.',
    ],
  },
};

export function EndingScreen({ id, save, onContinue, onTitle }: { id: 'preserve' | 'break' | 'release'; save: SaveData; onContinue: () => void; onTitle: () => void }) {
  const e = EPILOGUES[id];
  return (
    <div className="modal-backdrop">
      <div className={`modal panel ending ending--${e.accent}`}>
        <span className="type-data-xs text-muted">MEMORY ARCHIVE — FINAL ENTRY</span>
        <h2 className="type-display ending__title">{e.title}</h2>
        <div className="ending__sub type-display-s">{e.sub}</div>
        <div className="ending__body">
          {e.body.map((p, i) => (
            <p key={i} className="type-ui-s text-secondary">
              {p}
            </p>
          ))}
        </div>
        <div className="ending__stats type-data-xs text-muted">
          LOOPS SURVIVED: {save.story.loops} · MEMORIES: {save.memories.length} · ENDINGS FOUND: {save.story.endingCount}/3
        </div>
        <div className="ending__actions">
          <button type="button" className="btn btn--primary" onClick={onContinue}>
            CONTINUE FROM BEFORE THE DECISION
          </button>
          <button type="button" className="btn" onClick={onTitle}>
            NEW MEMORY CYCLE
          </button>
        </div>
      </div>
    </div>
  );
}
