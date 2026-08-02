import { useEffect, useState } from 'react';
import { LoadingBrandMark } from '../../brand/components/LoadingBrandMark';
import { MemoryTrace } from '../../brand/patterns/MemoryTrace';
import { TimingLine } from '../hud/TimingLine';
import { BrandLockup } from '../../brand/components/BrandLockup';

export interface LoadingScreenProps {
  /** Progress 0–1. When undefined the ring is idle. */
  progress?: number;
  /** Status line (data typography). */
  status?: string;
  showProgress?: boolean;
  className?: string;
}

/**
 * LoadingScreen — full-viewport branded loading state.
 * Core Black background, Memory Trace pattern, the supplied icon in
 * a segmented countdown ring (the ring moves, never the icon),
 * status + percentage, and a timing-line progress bar at the bottom
 * edge. Works in landscape and portrait; uses safe-area insets.
 */
export function LoadingScreen({ progress, status = 'INITIALIZING LOOP', showProgress = true, className }: LoadingScreenProps) {
  const pct = progress === undefined ? undefined : Math.round(progress * 100);

  return (
    <div className={['loading-screen', className].filter(Boolean).join(' ')}>
      <MemoryTrace opacity={0.3} className="loading-screen__trace" />

      <header className="loading-screen__bar">
        <BrandLockup layout="horizontal" size="sm" wordmarkVariant="white" decorative />
        <span className="type-data-s text-muted">LOOP PROTOCOL // 07</span>
      </header>

      <main className="loading-screen__center">
        <LoadingBrandMark
          progress={progress}
          status={undefined}
          showProgress={false}
          size={220}
          label="Loading RESET//07"
        />
        <div className="loading-screen__status">
          <span className="loading-screen__status-text type-data-s text-secondary">{status}</span>
          {showProgress && pct !== undefined && (
            <span className="loading-screen__pct type-data-m text-cyan">{String(pct).padStart(3, '0')}%</span>
          )}
        </div>
        <TimingLine width="min(280px, 60vw)" />
      </main>

      <footer className="loading-screen__foot">
        <span className="type-data-s text-muted">SEVEN MINUTES // SEVEN LOOPS</span>
        <span className="type-data-s text-muted">RESET//07 — v0.8.0</span>
      </footer>

      {/* Bottom-edge progress line */}
      {progress !== undefined && (
        <span
          className="loading-screen__edge"
          aria-hidden="true"
          style={{ transform: `scaleX(${Math.min(1, Math.max(0, progress))})` }}
        />
      )}
    </div>
  );
}

const STATUS_PHASES = [
  'RESTORING MEMORY TRACE 07',
  'RECONSTRUCTING LOOP GEOMETRY',
  'CALIBRATING EMERGENCY SYSTEMS',
] as const;

/**
 * LoadingScreenDemo — self-running loading loop used by the
 * guidelines page and the /loading dev route. Not game logic.
 */
export function LoadingScreenDemo({ loop = true, ...props }: Partial<LoadingScreenProps> & { loop?: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = p + 0.005;
        if (next >= 1) return loop ? 0 : 1;
        return next;
      });
    }, 40);
    return () => window.clearInterval(id);
  }, [loop]);

  const phase = progress < 0.34 ? STATUS_PHASES[0] : progress < 0.67 ? STATUS_PHASES[1] : STATUS_PHASES[2];

  return <LoadingScreen progress={progress} status={phase} {...props} />;
}
