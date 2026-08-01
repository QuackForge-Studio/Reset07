import { Section, Panel, Specimen, Swatch, DataTable } from '../ui';
import { brandColors, semanticColors, contrastPairs, semanticTokenUsage } from '../../brand/tokens/colors';

export function ColorSection() {
  return (
    <Section id="color" index="03" title="Color" kicker="Token-based palette — six cores, derived semantics">
      <Panel title="CORE PALETTE — NEVER INTRODUCE NEW COLORS">
        <div className="g-grid g-grid--6">
          <Swatch name="Core Black" hex={brandColors.coreBlack} cssVar="--color-core-black" />
          <Swatch name="Deep Navy" hex={brandColors.deepNavy} cssVar="--color-deep-navy" />
          <Swatch name="Emergency Cyan" hex={brandColors.emergencyCyan} cssVar="--color-emergency-cyan" />
          <Swatch name="Reactor Orange" hex={brandColors.reactorOrange} cssVar="--color-reactor-orange" />
          <Swatch name="Corruption Magenta" hex={brandColors.corruptionMagenta} cssVar="--color-corruption-magenta" />
          <Swatch name="Signal White" hex={brandColors.signalWhite} cssVar="--color-signal-white" />
        </div>
        <p className="type-body-s text-secondary">
          Cyan = navigation, active controls, player energy, memory, selected states. Orange = explosions,
          critical warnings, countdown urgency, destructive actions. Magenta = corruption, unstable memory,
          hidden narrative — <strong className="text-magenta">use sparingly</strong>.
        </p>
      </Panel>

      <Panel title="SEMANTIC TOKENS — DERIVED FROM THE CORE SIX">
        <DataTable
          head={['Token', 'Value', 'Usage']}
          rows={Object.entries(semanticColors).map(([token, value]) => [
            <code key={token}>{`--color-${token}`}</code>,
            <code key={`${token}-v`}>{value}</code>,
            semanticTokenUsage[token as keyof typeof semanticColors],
          ])}
        />
      </Panel>

      <Panel title="GRADIENT DISCIPLINE">
        <div className="g-grid g-grid--3">
          <Specimen label="BACKGROUND DEPTH">
            <div className="g-grad g-grad--depth" aria-hidden="true" />
          </Specimen>
          <Specimen label="ENERGY PULSE / EXPLOSION ILLUMINATION">
            <div className="g-grad g-grad--emergency" aria-hidden="true" />
          </Specimen>
          <Specimen label="CORRUPTION TRANSITION">
            <div className="g-grad g-grad--corruption" aria-hidden="true" />
          </Specimen>
        </div>
        <p className="type-body-s text-secondary">
          No large rainbow gradients. Gradients are allowed only for background depth, energy pulses, explosion
          illumination and corruption transitions — and the logo itself must never require a gradient.
        </p>
      </Panel>

      <Panel title="CONTRAST — AA VERIFIED">
        <DataTable
          head={['Foreground', 'Background', 'Ratio', 'AA', 'Note']}
          rows={contrastPairs.map((c) => [
            <code key={`f-${c.foreground}`}>{c.foreground}</code>,
            <code key={`b-${c.background}`}>{c.background}</code>,
            c.ratio,
            c.passesAA ? '✓' : '✕',
            c.note,
          ])}
        />
      </Panel>
    </Section>
  );
}
