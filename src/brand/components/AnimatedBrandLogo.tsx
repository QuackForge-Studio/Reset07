import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BrandLogo, type BrandLogoVariant } from './BrandLogo';
import { LOGO_ANIMATION_DURATION } from '../motion/logoAnimation';

/**
 * AnimatedBrandLogo — the 2–3 s RESET//07 logo intro.
 *
 * Sequence (relative to the total duration):
 *   1. A thin segmented countdown ring fades in.
 *   2. The seven segments clear one by one toward zero.
 *   3. A double-slash interrupts the ring; the ring retracts.
 *   4. The supplied wordmark reveals through a clean clip mask.
 *   5. A cyan pulse travels across the mark.
 *   6. One brief Reactor Orange warning accent flashes.
 *   7. Everything supporting disappears — the logo is completely static.
 *
 * The logo asset itself is never redrawn or deformed: only masks,
 * clips, opacity, translation and supporting elements are animated.
 *
 * Reduced motion (OS-level or html[data-motion="reduced"]):
 * a simple 200 ms fade, no ring, no flash, no movement.
 */

export interface AnimatedBrandLogoProps {
  variant?: Exclude<BrandLogoVariant, 'icon'>;
  /** Total intro duration in ms. Default 2400. */
  duration?: number;
  label?: string;
  decorative?: boolean;
  className?: string;
  /** Fired once when the animation settles. */
  onComplete?: () => void;
}

const SEGMENT_COUNT = 7;
const RING_RADIUS = 104; // viewBox units (viewBox 220 × 220)
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 653.45
const SEGMENT_LENGTH = RING_CIRCUMFERENCE / SEGMENT_COUNT; // ≈ 93.35

/** Timeline fractions of the total duration. */
const T = {
  ringIn: 0.1,
  segments: [0.1, 0.46], // segments clear across this window
  slash: 0.44,
  ringOut: [0.56, 0.6],
  markReveal: [0.44, 0.62],
  pulse: [0.58, 0.74],
  warn: [0.72, 0.8],
} as const;

export function AnimatedBrandLogo({
  variant = 'primary',
  duration = LOGO_ANIMATION_DURATION,
  label = 'RESET//07',
  decorative = false,
  className,
  onComplete,
}: AnimatedBrandLogoProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
    const timer = window.setTimeout(() => {
      setDone(true);
      onCompleteRef.current?.();
    }, duration + 150);
    return () => window.clearTimeout(timer);
  }, [duration]);

  const segWindow = duration * (T.segments[1] - T.segments[0]);
  const segStart = duration * T.segments[0];
  const segStep = segWindow / SEGMENT_COUNT;

  const inline = {
    '--logo-dur': `${duration}ms`,
    '--seg-dur': `${segStep}ms`,
  } as CSSProperties;

  const slashPos = { animationDelay: `${duration * T.slash}ms`, animationDuration: `${duration * 0.04}ms` };
  const ringOut = { animationDelay: `${duration * T.ringOut[0]}ms`, animationDuration: `${duration * (T.ringOut[1] - T.ringOut[0])}ms` };
  const mark = { animationDelay: `${duration * T.markReveal[0]}ms`, animationDuration: `${duration * (T.markReveal[1] - T.markReveal[0])}ms` };
  const pulse = { animationDelay: `${duration * T.pulse[0]}ms`, animationDuration: `${duration * (T.pulse[1] - T.pulse[0])}ms` };
  const warn = { animationDelay: `${duration * T.warn[0]}ms`, animationDuration: `${duration * (T.warn[1] - T.warn[0])}ms` };

  return (
    <div
      className={['brand-logo-anim', done ? 'is-done' : '', className].filter(Boolean).join(' ')}
      style={inline}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <svg className="brand-logo-anim__ring" viewBox="0 0 220 220" aria-hidden="true">
        {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
          <circle
            key={i}
            cx="110"
            cy="110"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-emergency-cyan)"
            strokeWidth="2"
            strokeDasharray={`${SEGMENT_LENGTH} ${RING_CIRCUMFERENCE - SEGMENT_LENGTH}`}
            transform={`rotate(${(i * 360) / SEGMENT_COUNT} 110 110)`}
            style={{
              animationName: 'brand-seg-out',
              animationTimingFunction: 'var(--ease-snap)',
              animationFillMode: 'both',
              animationDelay: `${segStart + i * segStep}ms`,
              animationDuration: `${segStep}ms`,
            }}
          />
        ))}
        {/* Double-slash interruption */}
        <g className="brand-logo-anim__slashg" stroke="var(--color-emergency-cyan)" strokeWidth="3" strokeLinecap="square" style={{ animationName: 'brand-slash-in', animationTimingFunction: 'var(--ease-out-expo)', animationFillMode: 'both', ...slashPos }}>
          <line x1="159" y1="60" x2="200" y2="19" />
          <line x1="164" y1="66" x2="205" y2="25" />
        </g>
      </svg>

      <span className="brand-logo-anim__mark">
        <BrandLogo variant={variant} className="brand-logo-anim__img" decorative />
        <span className="brand-logo-anim__pulse" aria-hidden="true" style={{ animationName: 'brand-pulse-sweep', animationTimingFunction: 'var(--ease-out-quart)', animationFillMode: 'both', ...pulse }} />
      </span>

      <span className="brand-logo-anim__warn" aria-hidden="true" style={{ animationName: 'brand-warn-flash', animationTimingFunction: 'var(--ease-snap)', animationFillMode: 'both', ...warn }} />

      <style>{`
        .brand-logo-anim__ring {
          animation:
            brand-fade-in ${duration * T.ringIn}ms var(--ease-out-quart) both,
            brand-fade-out ${ringOut.animationDuration}ms var(--ease-in-out-quart) both;
          animation-delay: 0ms, ${ringOut.animationDelay};
        }
        .brand-logo-anim__mark {
          animation-name: brand-mark-reveal;
          animation-timing-function: var(--ease-out-expo);
          animation-fill-mode: both;
          animation-delay: ${mark.animationDelay};
          animation-duration: ${mark.animationDuration};
        }
      `}</style>
    </div>
  );
}
