import { memo } from 'react';

export interface CountdownTimerProps {
  /** Seconds remaining. */
  seconds: number;
  /** Below this value the timer turns Reactor Orange. Default 30. */
  criticalAt?: number;
  size?: 'xl' | 'm';
  className?: string;
  /** Accessible label. */
  label?: string;
}

/**
 * CountdownTimer — the game's time pressure in data typography.
 * Critical state is expressed by color AND a warning glyph so it is
 * never color-only. The value re-mounts per second to run a tiny
 * "tick" animation (no layout shift — tabular numerals).
 */
export const CountdownTimer = memo(function CountdownTimer({
  seconds,
  criticalAt = 30,
  size = 'xl',
  className,
  label = 'Time remaining',
}: CountdownTimerProps) {
  const critical = seconds <= criticalAt;
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  const text = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return (
    <span
      className={['countdown-timer', `countdown-timer--${size}`, critical ? 'is-critical' : '', className].filter(Boolean).join(' ')}
      role="timer"
      aria-label={`${label}: ${text}`}
    >
      <span key={safe} className="countdown-timer__value">
        {text}
      </span>
      {critical && (
        <span className="countdown-timer__flag type-data-s" aria-hidden="true">
          !
        </span>
      )}
    </span>
  );
});
