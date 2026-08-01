import { memo } from 'react';
import type { HudTone } from './SegmentedRing';

export interface TimingLineProps {
  tone?: HudTone;
  /** CSS width, default 100%. */
  width?: string | number;
  /** Runs the one-shot grow animation on mount. */
  animate?: boolean;
  className?: string;
}

/**
 * TimingLine — a short horizontal timing line. Used for load bars,
 * transitions and HUD separators. Grows once with a mechanical
 * ease; never loops.
 */
export const TimingLine = memo(function TimingLine({ tone = 'memory', width, animate = false, className }: TimingLineProps) {
  return (
    <span
      className={['timing-line', `timing-line--${tone}`, animate ? 'is-animating' : '', className].filter(Boolean).join(' ')}
      style={width !== undefined ? { width } : undefined}
      aria-hidden="true"
    />
  );
});
