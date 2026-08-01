/**
 * RESET//07 — garage screen between loops: loop summary, module equipping,
 * memory board entry, next-loop start.
 */

import { useState } from 'react';
import type { LoopEndPayload } from '../bridge';
import type { SaveData } from '../systems/SaveSystem';
import { MODULE_LIST, MAX_EQUIPPED, canEquip, equipModule, unequipModule } from '../data/modules';

interface Props {
  summary: LoopEndPayload;
  save: SaveData;
  onStart: () => void;
  onMemory: () => void;
  onTitle: () => void;
  onEquip: (ids: string[]) => void;
}

export function GarageScreen({ summary, save, onStart, onMemory, onTitle, onEquip }: Props) {
  const [equipped, setEquipped] = useState<string[]>(save.modulesEquipped);

  const toggle = (id: string) => {
    let next: string[];
    if (equipped.includes(id)) next = unequipModule(equipped, id);
    else next = equipModule(save.modulesOwned, equipped, id);
    setEquipped(next);
    onEquip(next);
  };

  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  return (
    <div className="modal-backdrop">
      <div className="modal panel garage">
        <div className="garage__head">
          <span className="type-data-xs text-muted">SERVICE GARAGE 07 — POST-LOOP DIAGNOSTIC</span>
          <h2 className="type-display">LOOP {summary.loop} SUMMARY</h2>
          <div className="garage__stat-row">
            <div className="garage__stat">
              <span className="type-data-xs text-muted">TIME SURVIVED</span>
              <span className="type-display-s">{fmt(summary.survived)}</span>
            </div>
            <div className="garage__stat">
              <span className="type-data-xs text-muted">MACHINES DOWN</span>
              <span className="type-display-s">{summary.kills}</span>
            </div>
            <div className="garage__stat">
              <span className="type-data-xs text-muted">CIVILIANS RESCUED</span>
              <span className="type-display-s">{summary.rescues}</span>
            </div>
            <div className="garage__stat">
              <span className="type-data-xs text-muted">CHAIN REACTIONS</span>
              <span className="type-display-s">{summary.chains}</span>
            </div>
            <div className="garage__stat">
              <span className="type-data-xs text-muted">MEMORY FRAGMENTS</span>
              <span className="type-display-s">+{summary.newMemoryCount}</span>
            </div>
          </div>
          <span className="type-data-xs text-muted garage__memory-note">
            MEMORY CORE: {save.memories.length} SYNCED — {save.rescued.length} CIVILIAN{save.rescued.length === 1 ? '' : 'S'} KNOWN
          </span>
        </div>

        <div className="garage__modules">
          <div className="garage__modules-head">
            <span className="type-data-xs text-muted">MODULES — EQUIPPED {equipped.length}/{MAX_EQUIPPED}</span>
            <span className="type-data-xs text-muted">TWO MAX. THEY PERSIST ACROSS LOOPS.</span>
          </div>
          <div className="garage__module-grid">
            {MODULE_LIST.map((m) => {
              const owned = save.modulesOwned.includes(m.id);
              const isEq = equipped.includes(m.id);
              const canEquipNow = canEquip(save.modulesOwned, equipped, m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`module-card ${isEq ? 'is-equipped' : ''} ${!owned ? 'is-locked' : ''}`}
                  onClick={() => owned && toggle(m.id)}
                  disabled={!owned}
                >
                  <span className="module-card__icon" aria-hidden>
                    {m.icon === 'arc' ? '⚡' : m.icon === 'breach' ? '➤' : m.icon === 'rescue' ? '✚' : m.icon === 'pulse' ? '◎' : '❄'}
                  </span>
                  <span className="type-data-xs module-card__name">{m.name}</span>
                  <span className="type-ui-xs text-muted module-card__desc">{m.desc}</span>
                  <span className="type-data-xs module-card__state">
                    {!owned ? 'NOT FOUND' : isEq ? 'EQUIPPED' : canEquipNow ? 'TAP TO EQUIP' : 'SLOTS FULL'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="garage__actions">
          <button type="button" className="btn btn--primary garage__start" onClick={onStart}>
            START LOOP — 07:00
          </button>
          <button type="button" className="btn" onClick={onMemory}>
            MEMORY BOARD
          </button>
          <button type="button" className="btn btn--ghost" onClick={onTitle}>
            RETURN TO TITLE
          </button>
        </div>
      </div>
    </div>
  );
}
