/**
 * RESET//07 — pause menu + in-pause objective/memory log.
 */

import type { HudSnapshot } from '../bridge';
import type { SaveData } from '../systems/SaveSystem';
import { memoryById } from '../../play/data/memories';

interface Props {
  snap: HudSnapshot;
  save: SaveData;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
  onSettings: () => void;
  onMemory: () => void;
  onHowTo: () => void;
}

export function PauseMenu({ snap, save, onResume, onRestart, onTitle, onSettings, onMemory, onHowTo }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal panel pause">
        <h2 className="type-display pause__title">PAUSED</h2>
        <div className="pause__time type-data-s text-muted">
          LOOP {snap.loop + 1} — {snap.time.m}:{String(snap.time.s).padStart(2, '0')} REMAINING
        </div>

        <div className="pause__obj">
          <span className="type-data-xs text-muted">CURRENT OBJECTIVE</span>
          <span className="type-ui-s">{snap.objective?.text ?? '—'}</span>
          {snap.sideObjectives.length > 0 && (
            <span className="type-data-xs text-muted pause__side">{snap.sideObjectives.slice(0, 3).join(' · ')}</span>
          )}
        </div>

        <div className="pause__memories">
          <span className="type-data-xs text-muted">MEMORY LOG</span>
          <div className="pause__mem-list">
            {save.memories.length === 0 && <span className="type-data-xs text-muted">NO FRAGMENTS RECOVERED YET</span>}
            {save.memories.map((id) => {
              const m = memoryById(id);
              return m ? (
                <div key={id} className="pause__mem">
                  <span className="pause__mem-dot" />
                  <span className="type-data-xs">{m.name}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>

        <div className="pause__actions">
          <button type="button" className="btn btn--primary" onClick={onResume}>
            RESUME
          </button>
          <button type="button" className="btn" onClick={onRestart}>
            RESTART LOOP
          </button>
          <button type="button" className="btn" onClick={onMemory}>
            MEMORY BOARD
          </button>
          <button type="button" className="btn" onClick={onHowTo}>
            CONTROLS
          </button>
          <button type="button" className="btn" onClick={onSettings}>
            SETTINGS
          </button>
          <button type="button" className="btn btn--danger" onClick={onTitle}>
            RETURN TO TITLE
          </button>
        </div>
      </div>
    </div>
  );
}
