/**
 * RESET//07 — title screen. The background is a pure-CSS animated city reset
 * (layered gradients + brand patterns) — zero canvas cost while idle.
 */

import { ResetRings } from '../../brand/patterns/ResetRings';
import { CountdownGrid } from '../../brand/patterns/CountdownGrid';

interface Props {
  canContinue: boolean;
  hasSave: boolean;
  onNew: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onHowTo: () => void;
  onCredits: () => void;
}

export function TitleScreen({ canContinue, hasSave, onNew, onContinue, onSettings, onHowTo, onCredits }: Props) {
  return (
    <div className="title-screen" role="dialog" aria-label="RESET//07 title">
      <div className="title-screen__bg">
        <div className="title-screen__grad" />
        <div className="title-screen__city" />
        <ResetRings className="title-screen__rings" opacity={0.5} />
        <CountdownGrid className="title-screen__grid" opacity={0.25} />
      </div>

      <div className="title-screen__content">
        <div className="title-screen__logo">
          <span className="type-data-s text-muted title-screen__kicker">CITY RESET PROTOCOL // EMERGENCY RESPONSE</span>
          <h1 className="title-screen__name">
            RESET<span className="title-screen__slash">//</span>07
          </h1>
          <span className="type-ui-s text-secondary title-screen__tag">A city trapped in a seven-minute loop. Your memory is the only thing that persists.</span>
        </div>

        <nav className="title-menu" aria-label="Main menu">
          <button type="button" className="title-menu__item title-menu__item--primary" onClick={onNew}>
            <span>NEW LOOP</span>
            <span className="type-data-xs text-muted">PRESS TO BEGIN</span>
          </button>
          {canContinue ? (
            <button type="button" className="title-menu__item" onClick={onContinue}>
              <span>CONTINUE</span>
              <span className="type-data-xs text-muted">RESUME PROGRESS</span>
            </button>
          ) : (
            <div className="title-menu__item title-menu__item--disabled">
              <span>CONTINUE</span>
              <span className="type-data-xs text-muted">{hasSave ? 'NO PROGRESS YET' : 'NO SAVE DATA'}</span>
            </div>
          )}
          <button type="button" className="title-menu__item" onClick={onSettings}>
            <span>SETTINGS</span>
            <span className="type-data-xs text-muted">AUDIO · VIDEO · COMFORT</span>
          </button>
          <button type="button" className="title-menu__item" onClick={onHowTo}>
            <span>HOW TO PLAY</span>
            <span className="type-data-xs text-muted">CONTROLS · TACTICS</span>
          </button>
          <button type="button" className="title-menu__item" onClick={onCredits}>
            <span>CREDITS</span>
            <span className="type-data-xs text-muted">MADE WITH TOO MANY EXPLOSIONS</span>
          </button>
        </nav>

        <div className="title-screen__footer type-data-xs text-muted">
          <span>v0.7.0</span>
          <span className="title-screen__dot">•</span>
          <span>KEYBOARD · GAMEPAD · TOUCH</span>
          <span className="title-screen__dot">•</span>
          <span>OFFLINE READY</span>
        </div>
      </div>
    </div>
  );
}
