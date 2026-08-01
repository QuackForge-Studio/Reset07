import { memo } from 'react';
import { BrandIcon } from './BrandIcon';

/**
 * LoadingBrandMark — the branded loading indicator.
 *
 * The supplied icon stays perfectly still in the center; only the
 * supporting ring segments and a sweep arc animate around it.
 * The icon is never rotated like a generic spinner.
 *
 * When `progress` is provided the seven segments light up in
 * sequence and the percentage is shown. Under reduced motion the
 * sweep stops and the mark is static.
 */

export interface LoadingBrandMarkProps {
  /** Progress 0–1. When provided, segments fill proportionally and % is shown. */
  progress?: number;
  /** Status line shown under the mark (data typography). */
  status?: string;
  /** Stage diameter in px. Default 200. */
  size?: number;
  showProgress?: boolean;
  /** Accessible label for the stage. */
  label?: string;
  className?: string;
  /** Force a tone (auto-switches to warning below 15 %). */
  tone?: 'memory' | 'warning';
}

const SEGMENTS = 7;
const RING_R = 84; // viewBox 200 × 200
const CIRC = 2 * Math.PI * RING_R; // ≈ 527.8
const SEG = CIRC / SEGMENTS; // ≈ 75.4
const SWEEP_ARC = 60; // degrees

export const LoadingBrandMark = memo(function LoadingBrandMark({
  progress,
  status,
  size = 200,
  showProgress = true,
  label = 'Loading RESET//07',
  className,
  tone,
}: LoadingBrandMarkProps) {
  const litSegments = progress === undefined ? SEGMENTS : Math.max(0, Math.min(SEGMENTS, Math.round(progress * SEGMENTS)));
  const critical = progress !== undefined && progress < 0.15;
  const effectiveTone = tone ?? (critical ? 'warning' : 'memory');
  const accent = effectiveTone === 'warning' ? 'var(--color-reactor-orange)' : 'var(--color-emergency-cyan)';
  const percent = progress === undefined ? undefined : Math.round(progress * 100);

  return (
    <div className={['brand-loading-mark', className].filter(Boolean).join(' ')}>
      <div
        className="brand-loading-mark__stage"
        style={{ width: size, height: size }}
        role="img"
        aria-label={label}
      >
        <svg className="brand-loading-mark__ring" viewBox="0 0 200 200" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => {
            const lit = i < litSegments;
            return (
              <circle
                key={i}
                cx="100"
                cy="100"
                r={RING_R}
                fill="none"
                stroke={lit ? accent : 'rgba(244, 248, 255, 0.12)'}
                strokeWidth="3"
                strokeDasharray={`${SEG - 4} ${CIRC - SEG + 4}`}
                transform={`rotate(${(i * 360) / SEGMENTS} 100 100)`}
                style={{ transition: 'stroke 300ms var(--ease-out-quart)' }}
              />
            );
          })}
          {/* Sweep arc — this rotates, never the icon. */}
          <circle
            className="brand-loading-mark__sweep"
            cx="100"
            cy="100"
            r={RING_R}
            fill="none"
            stroke={accent}
            strokeOpacity="0.55"
            strokeWidth="3"
            strokeDasharray={`${(SWEEP_ARC / 360) * CIRC} ${CIRC}`}
            strokeLinecap="round"
          />
        </svg>
        <BrandIcon size={size * 0.42} decorative className="brand-loading-mark__icon" />
      </div>
      {status && <span className="brand-loading-mark__status type-data-s text-muted">{status}</span>}
      {showProgress && percent !== undefined && (
        <span className="brand-loading-mark__progress type-data-m text-cyan">{String(percent).padStart(3, '0')}%</span>
      )}
    </div>
  );
});
