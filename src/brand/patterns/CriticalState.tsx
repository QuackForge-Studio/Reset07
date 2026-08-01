import type { BrandPatternProps } from './shared';

/**
 * CriticalState — Reactor Orange only. Short warning bars,
 * a segmented border, an expanding hazard ring, slash accents.
 * Use sparingly: this is the "something is breaking" pattern.
 */
export function CriticalState({ className, style, opacity = 0.4 }: BrandPatternProps) {
  return (
    <svg
      className={['brand-pattern', 'brand-pattern--critical-state', className].filter(Boolean).join(' ')}
      style={style}
      viewBox="0 0 800 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      opacity={opacity}
    >
      {/* Segmented border */}
      <rect
        className="brand-pattern__border"
        x="40"
        y="40"
        width="720"
        height="320"
        fill="none"
        stroke="var(--color-reactor-orange)"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        strokeDasharray="14 10"
      />

      {/* Short warning bars */}
      <g stroke="var(--color-reactor-orange)" strokeOpacity="0.55" strokeWidth="2">
        <line x1="80" y1="90" x2="200" y2="90" />
        <line x1="80" y1="150" x2="140" y2="150" />
        <line x1="80" y1="300" x2="240" y2="300" />
        <line x1="80" y1="340" x2="160" y2="340" />
      </g>

      {/* Expanding hazard rings (single pulse, ~0.22 Hz) */}
      <g className="brand-pattern__hazard" fill="none" stroke="var(--color-reactor-orange)">
        <circle cx="620" cy="140" r="12" strokeWidth="1.5" strokeOpacity="0.7" />
        <circle cx="620" cy="140" r="30" strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="620" cy="140" r="48" strokeWidth="0.75" strokeOpacity="0.3" />
      </g>

      {/* Slash accent */}
      <line
        x1="540"
        y1="240"
        x2="580"
        y2="300"
        stroke="var(--color-reactor-orange)"
        strokeOpacity="0.5"
        strokeWidth="2"
      />

      {/* Dense warning cluster */}
      <g stroke="var(--color-reactor-orange)" strokeOpacity="0.4" strokeWidth="1.5">
        <line x1="480" y1="120" x2="480" y2="180" />
        <line x1="500" y1="130" x2="500" y2="170" />
        <line x1="520" y1="140" x2="520" y2="160" />
      </g>
    </svg>
  );
}
