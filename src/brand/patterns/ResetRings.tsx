import type { BrandPatternProps } from './shared';

/**
 * ResetRings — partial circular arcs, missing ring segments,
 * small slash interruptions, different loop phases.
 * The arc group rotates very slowly (90 s per revolution).
 */
export function ResetRings({ className, style, opacity = 0.4 }: BrandPatternProps) {
  return (
    <svg
      className={['brand-pattern', 'brand-pattern--reset-rings', className].filter(Boolean).join(' ')}
      style={style}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      opacity={opacity}
    >
      <g className="brand-pattern__rotor" fill="none" stroke="var(--color-emergency-cyan)">
        {/* Large partial arc (~60 % of a circle) */}
        <circle cx="400" cy="250" r="180" strokeWidth="2" strokeOpacity="0.4" strokeDasharray="420 711" />
        {/* Mid partial arc with a missing segment */}
        <circle cx="400" cy="250" r="130" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="240 300 70 277" />
        {/* Small arc, later loop phase */}
        <circle cx="400" cy="250" r="80" strokeWidth="2" strokeOpacity="0.45" strokeDasharray="150 353" />
      </g>

      {/* Seven-segment mini ring (static counterweight) */}
      <g fill="none" stroke="var(--color-emergency-cyan)" strokeOpacity="0.35" strokeWidth="2">
        <circle cx="150" cy="380" r="46" strokeDasharray="19.8 19.8" />
      </g>

      {/* Slash interruption across the large arc */}
      <line
        x1="548"
        y1="108"
        x2="586"
        y2="166"
        stroke="var(--color-reactor-orange)"
        strokeOpacity="0.5"
        strokeWidth="2"
      />

      {/* Partial radial pulse, offset composition */}
      <circle
        cx="660"
        cy="380"
        r="34"
        fill="none"
        stroke="var(--color-emergency-cyan)"
        strokeOpacity="0.3"
        strokeWidth="1.5"
        strokeDasharray="107 214"
      />
    </svg>
  );
}
