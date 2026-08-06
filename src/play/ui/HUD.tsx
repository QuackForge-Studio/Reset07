/**
 * RESET//07 — in-game HUD. Compact, edge-anchored, portrait-aware.
 * Timer + objective top; hull/dash/overdrive bottom; boss bar; low-hp
 * vignette; objective arrow pointing at the current target in world space.
 */

import { useMemo } from 'react';
import type { HudSnapshot } from '../bridge';
import { worldToScreen } from './hooks';
import { api } from '../bridge';

export function HUD({ snap }: { snap: HudSnapshot }) {
  const { time } = snap;
  const timeStr = `${time.m}:${String(time.s).padStart(2, '0')}`;
  const timeClass = time.final10 ? 'is-final10' : time.m === 0 ? 'is-final' : '';
  const low = snap.hp <= 30;

  const arrow = useMemo(() => {
    if (!snap.objective || !snap.cam) return null;
    const pt = worldToScreen(snap, snap.objective.worldX, snap.objective.worldY);
    if (!pt) return null;
    // clamp to a ring inside the viewport
    const margin = 60;
    const w = snap.cam.w;
    const h = snap.cam.h;
    const cx = w / 2;
    const cy = h / 2;
    const dx = pt.x - cx;
    const dy = pt.y - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = Math.min(w, h) / 2 - margin;
    if (dist <= maxR) return null; // target visible — no arrow needed
    const ax = cx + (dx / dist) * maxR;
    const ay = cy + (dy / dist) * maxR;
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { x: ax, y: ay, angle };
  }, [snap.objective, snap.cam]);

  const interact = snap.interact;

  return (
    <div className={`hud ${low ? 'hud--low' : ''} ${snap.finalMinute ? 'hud--final' : ''}`} data-portrait={window.innerHeight > window.innerWidth}>
      {/* ── top bar ── */}
      <div className="hud__top">
        <div className="hud__timer-wrap">
          <div className={`hud__timer ${timeClass}`}>
            <span className="hud__timer-label type-data-xs">LOOP {String(snap.loop + 1).padStart(2, '0')}</span>
            <span className="hud__timer-time">{timeStr}</span>
          </div>
          <div className="hud__timer-bar">
            <div className="hud__timer-fill" style={{ width: `${(1 - time.pct) * 100}%` }} />
          </div>
        </div>

        <div className="hud__objective">
          {snap.objective ? (
            <>
              <span className="type-data-xs text-muted hud__objective-label">OBJECTIVE</span>
              <span className="type-ui-s hud__objective-text">{snap.objective.text}</span>
            </>
          ) : (
            <span className="type-data-xs text-muted">ALL OBJECTIVES CLEAR</span>
          )}
          {snap.sideObjectives.length > 0 && (
            <div className="hud__side-chips">
              {snap.sideObjectives.slice(0, 3).map((s, i) => (
                <span key={i} className="hud__side-chip type-data-xs">{s}</span>
              ))}
            </div>
          )}
        </div>

        <div className="hud__counts">
          <span className="hud__count" title="Memory fragments">
            <span className="hud__count-icon">◆</span>
            {snap.memories}
          </span>
          <span className="hud__count" title="Civilians rescued">
            <span className="hud__count-icon">✚</span>
            {snap.civilians}
          </span>
          <button type="button" className="hud__pause-btn" onClick={() => api.pause()} aria-label="Pause">
            ❚❚
          </button>
        </div>
      </div>

      {/* objective arrow */}
      {arrow && (
        <div className="hud__arrow" style={{ left: arrow.x, top: arrow.y, transform: `translate(-50%, -50%) rotate(${arrow.angle}deg)` }} aria-hidden>
          ▶
        </div>
      )}

      {/* boss bar */}
      {snap.boss && (
        <div className="hud__boss">
          <span className="type-data-xs">CORE GUARDIAN</span>
          <div className="hud__boss-bar">
            <div className="hud__boss-fill" style={{ width: `${snap.boss.pct * 100}%` }} />
          </div>
        </div>
      )}

      {/* ── bottom cluster ── */}
      <div className="hud__bottom">
        <div className="hud__stats">
          <div className="hud__stat">
            <span className="type-data-xs text-muted">HULL</span>
            <div className="hud__bar">
              <div className="hud__bar-fill hud__bar-fill--hp" style={{ width: `${(snap.hp / snap.maxHp) * 100}%` }} />
            </div>
            <span className="type-data-xs">{snap.hp}</span>
          </div>
          <div className="hud__stat">
            <span className="type-data-xs text-muted">DASH</span>
            <div className="hud__bar">
              <div className={`hud__bar-fill hud__bar-fill--dash ${snap.dash >= 1 ? 'is-ready' : ''}`} style={{ width: `${snap.dash * 100}%` }} />
            </div>
          </div>
          <div className="hud__stat">
            <span className={`type-data-xs ${snap.overheat ? 'hud__text-danger' : 'text-muted'}`}>HEAT</span>
            <div className="hud__bar">
              <div className={`hud__bar-fill hud__bar-fill--heat ${snap.overheat ? 'is-overheat' : ''}`} style={{ width: `${snap.heat * 100}%` }} />
            </div>
          </div>
          <div className="hud__stat">
            <span className="type-data-xs text-muted">OVERDRIVE</span>
            <div className="hud__bar">
              <div className={`hud__bar-fill hud__bar-fill--od ${snap.overdriveActive ? 'is-active' : snap.overdrive >= 1 ? 'is-ready' : ''}`} style={{ width: `${snap.overdrive * 100}%` }} />
            </div>
          </div>
        </div>

        {/* interact prompt */}
        {interact && (
          <div className="hud__interact">
            {interact.kind === 'hold' && <span className="hud__hold-ring" style={{ ['--p' as string]: `${(interact.progress ?? 0) * 100}%` }} />}
            <span className="type-ui-s">{interact.label}</span>
            {snap.inputMode === 'kb' && <kbd className="type-data-xs">{interact.kind === 'hold' ? 'HOLD E' : 'E'}</kbd>}
          </div>
        )}
      </div>

      {/* low hp / final minute overlays */}
      {low && <div className="hud__low-vignette" aria-hidden />}
      {snap.finalMinute && <div className="hud__final-vignette" aria-hidden />}
    </div>
  );
}
