import type { BrandPatternProps } from './shared';

/**
 * CountdownGrid — a spacious system grid:
 * thin horizontal timing lines, small node markers,
 * occasional seven-part divisions, large empty areas.
 *
 * Subtle by design — safe to sit behind UI at low opacity.
 */
export function CountdownGrid({ className, style, opacity = 0.4 }: BrandPatternProps) {
  return (
    <svg
      className={['brand-pattern', 'brand-pattern--countdown-grid', className].filter(Boolean).join(' ')}
      style={style}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      opacity={opacity}
    >
      {/* Thin horizontal timing lines */}
      <g stroke="var(--color-emergency-cyan)" strokeOpacity="0.32" strokeWidth="1">
        <line x1="0" y1="120" x2="800" y2="120" />
        <line x1="0" y1="240" x2="800" y2="240" />
        <line x1="0" y1="360" x2="800" y2="360" />
      </g>

      {/* Short vertical timing marks along the lines */}
      <g stroke="var(--color-emergency-cyan)" strokeOpacity="0.22" strokeWidth="1">
        <line x1="120" y1="120" x2="120" y2="150" />
        <line x1="240" y1="120" x2="240" y2="132" />
        <line x1="360" y1="120" x2="360" y2="150" />
        <line x1="560" y1="360" x2="560" y2="388" />
        <line x1="680" y1="360" x2="680" y2="372" />
      </g>

      {/* Seven-part division (7 ticks on a vertical axis) */}
      <g stroke="var(--color-emergency-cyan)" strokeOpacity="0.5" strokeWidth="1.5">
        <line x1="620" y1="100" x2="620" y2="420" />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1={620 - (i % 2 === 0 ? 12 : 6)} y1={140 + i * 44} x2="632" y2={140 + i * 44} />
        ))}
      </g>

      {/* Compact system nodes */}
      <g fill="var(--color-emergency-cyan)" fillOpacity="0.55">
        <circle cx="200" cy="120" r="4" />
        <circle cx="320" cy="240" r="3" />
        <circle cx="440" cy="360" r="4" />
        <circle cx="90" cy="360" r="3" />
      </g>

      {/* One partial radial pulse */}
      <circle
        cx="320"
        cy="240"
        r="28"
        fill="none"
        stroke="var(--color-emergency-cyan)"
        strokeOpacity="0.3"
        strokeWidth="1"
        strokeDasharray="88 88"
      />
    </svg>
  );
}
