import type { BrandPatternProps } from './shared';

/**
 * MemoryTrace — one continuous memory line, interrupted by repeated
 * resets (orange slash marks). One persistent cyan node survives
 * every interruption and pulses very gently (once per 4 s).
 */
export function MemoryTrace({ className, style, opacity = 0.4 }: BrandPatternProps) {
  const nodes = [
    { x: 190, y: 110 },
    { x: 430, y: 150 },
    { x: 660, y: 90 },
  ];

  return (
    <svg
      className={['brand-pattern', 'brand-pattern--memory-trace', className].filter(Boolean).join(' ')}
      style={style}
      viewBox="0 0 800 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      opacity={opacity}
    >
      {/* The line itself: memory … reset jump … memory … reset jump … memory */}
      <path
        d="M0 130 H 150 L 190 110 L 230 130 H 390 L 430 150 L 470 130 H 620 L 660 90 L 700 130 H 800"
        fill="none"
        stroke="var(--color-emergency-cyan)"
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />

      {/* Reset interruptions (orange slash marks) */}
      <g stroke="var(--color-reactor-orange)" strokeOpacity="0.5" strokeWidth="2">
        <line x1="152" y1="112" x2="158" y2="148" />
        <line x1="392" y1="132" x2="398" y2="168" />
        <line x1="622" y1="72" x2="628" y2="108" />
      </g>

      {/* Persisting nodes — each survives its interruption */}
      <g fill="var(--color-emergency-cyan)" fillOpacity="0.8">
        {nodes.map((n) => (
          <circle key={n.x} className="brand-pattern__node" cx={n.x} cy={n.y} r="4" />
        ))}
      </g>
    </svg>
  );
}
