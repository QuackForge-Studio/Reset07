import { Section, Panel } from '../ui';
import { CountdownGrid } from '../../brand/patterns/CountdownGrid';
import { ResetRings } from '../../brand/patterns/ResetRings';
import { MemoryTrace } from '../../brand/patterns/MemoryTrace';
import { CriticalState } from '../../brand/patterns/CriticalState';
import { BrandPatternFrame } from '../../brand/patterns/shared';

const PATTERNS = [
  {
    name: 'CountdownGrid',
    usage: 'Menu backdrops, settings, pause overlays — spacious, calm, with seven-part divisions',
    render: <CountdownGrid opacity={0.45} />,
  },
  {
    name: 'ResetRings',
    usage: 'Title screen, loading, chapter transitions — partial arcs in different loop phases',
    render: <ResetRings opacity={0.45} />,
  },
  {
    name: 'MemoryTrace',
    usage: 'Loading screens, dialogue backdrops — one line surviving repeated resets',
    render: <MemoryTrace opacity={0.45} />,
  },
  {
    name: 'CriticalState',
    usage: 'Warning states, danger zones, corruption moments — Reactor Orange only, use sparingly',
    render: <CriticalState opacity={0.45} />,
  },
] as const;

export function PatternSection() {
  return (
    <Section id="patterns" index="05" title="Graphic patterns" kicker="Procedural CSS + SVG — no raster backgrounds">
      <div className="g-grid g-grid--2">
        {PATTERNS.map((p) => (
          <Panel key={p.name} title={p.name.toUpperCase()}>
            <BrandPatternFrame className="g-pattern-frame" style={{ aspectRatio: '16 / 9' }}>
              {p.render}
            </BrandPatternFrame>
            <p className="type-body-s text-secondary" style={{ margin: 0 }}>
              {p.usage}
            </p>
          </Panel>
        ))}
      </div>

      <Panel title="RULES">
        <ul className="g-dna-list">
          <li className="type-body-s text-secondary">Patterns are subtle by design — they sit <em>behind</em> UI, never compete with it.</li>
          <li className="type-body-s text-secondary">Scales responsively (SVG slice) with adaptive density; no raster background images.</li>
          <li className="type-body-s text-secondary">Disableable: <code className="text-cyan">html[data-effects="low"]</code> freezes all pattern animation.</li>
          <li className="type-body-s text-secondary">Respects <code className="text-cyan">prefers-reduced-motion</code> — patterns go fully static.</li>
          <li className="type-body-s text-secondary">Never use: random triangles, dense circuit patterns, hex-dumps, binary blocks, glitch noise.</li>
        </ul>
      </Panel>
    </Section>
  );
}
