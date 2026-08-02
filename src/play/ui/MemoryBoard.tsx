/**
 * RESET//07 — memory board: nodes + connection lines, unlocked fragments
 * light up, locked ones show as corrupted signal.
 */

import { useMemo } from 'react';
import type { SaveData } from '../systems/SaveSystem';
import { MEMORIES, MEMORY_LINKS } from '../data/memories';

interface Props {
  save: SaveData;
  onClose: () => void;
}

const NODE_W = 175;
const NODE_H = 72;
// logical board space (must match the .memory-board__canvas size)
const BOARD_W = 800;
const BOARD_H = 620;
const CX = BOARD_W / 2;
const CY = BOARD_H / 2;

export function MemoryBoard({ save, onClose }: Props) {
  const owned = new Set(save.memories);
  const nodes = useMemo(() => {
    // deterministic ring layout — radii alternate so adjacent cards clear
    // each other (chord ~216px vs card width 190px)
    const n = MEMORIES.length;
    const positions: Array<{ x: number; y: number }> = [];
    const angleStep = (Math.PI * 2) / n;
    const radius = 307;
    for (let i = 0; i < n; i++) {
      const a = angleStep * i - Math.PI / 2;
      // radius alternates per node on BOTH axes so adjacent cards always
      // clear each other (staggered ring, no rectangle overlap)
      const rr = radius * (i % 2 ? 0.82 : 1);
      positions.push({ x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr * 0.79 });
    }
    return MEMORIES.map((m, i) => ({ ...m, ...positions[i] }));
  }, []);

  const posOf = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="modal-backdrop">
      <div className="modal panel memory-board">
        <div className="memory-board__head">
          <h2 className="type-display">MEMORY BOARD</h2>
          <span className="type-data-xs text-muted">
            {save.memories.length}/{MEMORIES.length} FRAGMENTS — PERSISTENT ACROSS LOOPS
          </span>
        </div>

        <div className="memory-board__canvas">
          <svg className="memory-board__links" viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} preserveAspectRatio="none" aria-hidden>
            {MEMORY_LINKS.map(([a, b], i) => {
              const pa = posOf(a);
              const pb = posOf(b);
              if (!pa || !pb) return null;
              const on = owned.has(a) && owned.has(b);
              return (
                <line
                  key={i}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  className={on ? 'mem-link is-on' : 'mem-link'}
                  strokeWidth={on ? 1.5 : 1}
                />
              );
            })}
          </svg>
          {nodes.map((m) => {
            const has = owned.has(m.id);
            const linked = MEMORY_LINKS.some(([a, b]) => (a === m.id || b === m.id) && owned.has(a) && owned.has(b));
            return (
              <div
                key={m.id}
                className={`mem-node ${has ? 'is-owned' : ''} ${linked ? 'is-linked' : ''}`}
                style={{ left: m.x - NODE_W / 2, top: m.y - NODE_H / 2, width: NODE_W, height: NODE_H }}
              >
                <span className={`mem-node__glyph ${has ? '' : 'is-locked'}`}>{has ? '◆' : '◈'}</span>
                <div className="mem-node__body">
                  <span className="type-data-xs mem-node__name">{m.name}</span>
                  <span className="type-data-xs text-muted mem-node__district">{m.district.toUpperCase()}</span>
                </div>
                {has && <span className="type-data-xs mem-node__text">{m.text}</span>}
                {!has && <span className="type-data-xs text-muted mem-node__text">SIGNAL LOST — RECOVER IN THE CITY</span>}
              </div>
            );
          })}
        </div>

        <button type="button" className="btn btn--primary" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}
