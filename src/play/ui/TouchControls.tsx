/**
 * RESET//07 — touch controls: left joystick (move), right drag (aim +
 * auto-fire), dash / interact / overdrive / pause buttons. All pointer-based
 * with large hit areas, safe-area aware.
 *
 * Input state is mutated from event handlers (never during render).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { queueTouchDash, queueTouchOverdrive, resetTouchInput, touchInput } from '../systems/InputState';
import { api } from '../bridge';

interface StickState {
  id: number;
  ox: number;
  oy: number;
  x: number;
  y: number;
}

const MOVE_MAX = 54;
const AIM_MAX = 48;

export function TouchControls() {
  const [moveStick, setMoveStick] = useState<StickState | null>(null);
  const [aimStick, setAimStick] = useState<StickState | null>(null);
  const moveOrigin = useRef<StickState | null>(null);
  const aimOrigin = useRef<StickState | null>(null);
  const interactPointer = useRef<number | null>(null);

  useEffect(() => {
    // A viewport/orientation change can cancel browser touches without sending
    // a PointerEvent to the original element. Clear both sticks so movement or
    // firing cannot remain latched after rotating the device.
    const clearForViewportChange = () => {
      moveOrigin.current = null;
      aimOrigin.current = null;
      interactPointer.current = null;
      resetTouchInput();
      setMoveStick(null);
      setAimStick(null);
    };
    window.addEventListener('resize', clearForViewportChange);
    window.addEventListener('orientationchange', clearForViewportChange);
    return () => {
      window.removeEventListener('resize', clearForViewportChange);
      window.removeEventListener('orientationchange', clearForViewportChange);
      resetTouchInput();
    };
  }, []);

  // ── movement stick ──
  const handleMoveDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    touchInput.moveX = 0;
    touchInput.moveY = 0;
    const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    moveOrigin.current = s;
    setMoveStick(s);
  }, []);

  const handleMove = useCallback((e: React.PointerEvent) => {
    const s = moveOrigin.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.ox;
    const dy = e.clientY - s.oy;
    const d = Math.hypot(dx, dy) || 1;
    const cl = Math.min(d, MOVE_MAX);
    const mag = Math.min(1, d / MOVE_MAX);
    const ang = Math.atan2(dy, dx);
    touchInput.moveX = Math.cos(ang) * mag;
    touchInput.moveY = Math.sin(ang) * mag;
    setMoveStick({ ...s, x: s.ox + (dx / d) * cl, y: s.oy + (dy / d) * cl });
  }, []);

  const handleMoveUp = useCallback((e: React.PointerEvent) => {
    if (moveOrigin.current?.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    moveOrigin.current = null;
    touchInput.moveX = 0;
    touchInput.moveY = 0;
    setMoveStick(null);
  }, []);

  // ── aim stick ──
  const handleAimDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    aimOrigin.current = s;
    setAimStick(s);
    touchInput.aimActive = false;
  }, []);

  const handleAimMove = useCallback((e: React.PointerEvent) => {
    const s = aimOrigin.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.ox;
    const dy = e.clientY - s.oy;
    const d = Math.hypot(dx, dy) || 1;
    const cl = Math.min(d, AIM_MAX);
    if (d > 10) {
      touchInput.aimAngle = Math.atan2(dy, dx);
      touchInput.aimActive = true;
      touchInput.firing = true;
    }
    setAimStick({ ...s, x: s.ox + (dx / d) * cl, y: s.oy + (dy / d) * cl });
  }, []);

  const handleAimUp = useCallback((e: React.PointerEvent) => {
    if (aimOrigin.current?.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    aimOrigin.current = null;
    touchInput.aimActive = false;
    touchInput.firing = false;
    setAimStick(null);
  }, []);

  const press = useCallback(
    (fn: () => void) => (e: React.PointerEvent) => {
      e.preventDefault();
      fn();
    },
    [],
  );

  const startInteract = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    interactPointer.current = e.pointerId;
    touchInput.interactHeld = true;
    touchInput.interactQueued = true;
  }, []);

  const stopInteract = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (interactPointer.current !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    interactPointer.current = null;
    touchInput.interactHeld = false;
  }, []);

  return (
    <div className="touch">
      {/* left movement zone */}
      <div
        className="touch__zone touch__zone--move"
        onPointerDown={handleMoveDown}
        onPointerMove={handleMove}
        onPointerUp={handleMoveUp}
        onPointerCancel={handleMoveUp}
      >
        {moveStick && (
          <div className="stick" style={{ left: moveStick.ox, top: moveStick.oy }}>
            <div className="stick__base" />
            <div
              className="stick__knob"
              style={{ transform: `translate(${moveStick.x - moveStick.ox}px, ${moveStick.y - moveStick.oy}px)` }}
            />
          </div>
        )}
        {!moveStick && <span className="touch__zone-label">MOVE</span>}
      </div>

      {/* right aim zone */}
      <div
        className="touch__zone touch__zone--aim"
        onPointerDown={handleAimDown}
        onPointerMove={handleAimMove}
        onPointerUp={handleAimUp}
        onPointerCancel={handleAimUp}
      >
        {aimStick && (
          <div className="stick" style={{ left: aimStick.ox, top: aimStick.oy }}>
            <div className="stick__base" />
            <div className="stick__knob" style={{ transform: `translate(${aimStick.x - aimStick.ox}px, ${aimStick.y - aimStick.oy}px)` }} />
          </div>
        )}
        {!aimStick && <span className="touch__zone-label">AIM + FIRE</span>}
      </div>

      {/* buttons */}
      <div className="touch__buttons">
        <button type="button" className="touch-btn touch-btn--dash" onPointerDown={press(queueTouchDash)}>
          DASH
        </button>
        <button
          type="button"
          className="touch-btn touch-btn--interact"
          onPointerDown={startInteract}
          onPointerUp={stopInteract}
          onPointerCancel={stopInteract}
        >
          OPEN
        </button>
        <button type="button" className="touch-btn touch-btn--od" onPointerDown={press(queueTouchOverdrive)}>
          OVERDRIVE
        </button>
      </div>
      <button
        type="button"
        className="touch-btn touch-btn--pause touch-btn--pause-global"
        aria-label="Pause"
        onPointerDown={press(() => api.pause())}
      >
        &#10074;&#10074;
      </button>
    </div>
  );
}
