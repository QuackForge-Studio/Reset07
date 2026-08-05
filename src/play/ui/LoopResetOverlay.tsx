import { useEffect, useRef } from 'react';
import { artAssetPath } from '../../brand/assets';

interface Props {
  onDone: () => void;
}

/**
 * RESET//07 — loop-reset interstitial: the street art + a CSS progress bar
 * ("REINITIALIZING CITY GRID"), shown after the Phaser white-out and before
 * the garage. Static art is reduced-motion safe; the bar animation is
 * disabled under html[data-motion='reduced'].
 */
export function LoopResetOverlay({ onDone }: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => onDoneRef.current(), 1400);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="loop-reset" role="status" aria-label="Loop reset">
      <div className="loop-reset__art" aria-hidden style={{ backgroundImage: `url(${artAssetPath('loadingLoop')})` }} />
      <div className="loop-reset__body">
        <span className="type-data-xs text-muted loop-reset__kicker">CITY RESET PROTOCOL</span>
        <span className="type-display loop-reset__title">REINITIALIZING CITY GRID</span>
        <div className="loop-reset__bar" aria-hidden>
          <span className="loop-reset__bar-fill" />
        </div>
        <span className="type-data-s text-secondary loop-reset__timer">NEXT LOOP IN 07:00</span>
      </div>
    </div>
  );
}
