import { memo } from 'react';

export type HudTone = 'memory' | 'warning' | 'corruption' | 'success';

const TONE_VAR: Record<HudTone, string> = {
  memory: 'var(--color-signal-memory)',
  warning: 'var(--color-signal-warning)',
  corruption: 'var(--color-signal-corruption)',
  success: 'var(--color-signal-success)',
};

export interface SegmentedRingProps {
  /** 0–1 fill level. */
  progress: number;
  /** Ring segment count. Default 7 (the loop). */
  segments?: number;
  size?: number;
  tone?: HudTone;
  thickness?: number;
  className?: string;
  /** Accessible label. */
  label?: string;
}

/**
 * SegmentedRing — the canonical countdown ring. Seven segments by
 * default (the seven-minute loop). State is never communicated by
 * color alone: pair it with CountdownTimer or a StatusChip.
 */
export const SegmentedRing = memo(function SegmentedRing({
  progress,
  segments = 7,
  size = 64,
  tone = 'memory',
  thickness = 4,
  className,
  label = 'Loop progress',
}: SegmentedRingProps) {
  const view = 100;
  const r = view / 2 - thickness - 2;
  const circ = 2 * Math.PI * r;
  const seg = circ / segments;
  const lit = Math.round(progress * segments);
  const color = TONE_VAR[tone];

  return (
    <svg
      className={['segmented-ring', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox={`0 0 ${view} ${view}`}
      role="img"
      aria-label={`${label}: ${Math.round(progress * 100)}%`}
    >
      {Array.from({ length: segments }, (_, i) => {
        const isLit = i < lit;
        return (
          <circle
            key={i}
            cx={view / 2}
            cy={view / 2}
            r={r}
            fill="none"
            stroke={isLit ? color : 'rgba(244, 248, 255, 0.12)'}
            strokeWidth={thickness}
            strokeDasharray={`${seg - 2} ${circ - seg + 2}`}
            transform={`rotate(${(i * 360) / segments} ${view / 2} ${view / 2})`}
            style={{ transition: 'stroke 300ms var(--ease-out-quart)' }}
          />
        );
      })}
    </svg>
  );
});
