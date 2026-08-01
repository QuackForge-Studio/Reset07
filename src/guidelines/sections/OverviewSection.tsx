import { Section, Panel, Specimen, DataTable } from '../ui';
import { BrandLockup } from '../../brand/components/BrandLockup';
import { BrandIcon } from '../../brand/components/BrandIcon';
import { ResetRings } from '../../brand/patterns/ResetRings';
import { BRAND_ASSET_PATHS } from '../../brand/assets';

const BRAND_DNA = [
  'Repetition',
  'Countdown pressure',
  'Memory persistence',
  'Emergency systems',
  'Time-loop instability',
  'Controlled destruction',
  'System corruption',
  'Precision',
  'Mystery',
  'High-impact arcade action',
] as const;

const AVOID_LIST = [
  'A SaaS dashboard',
  'A cyber-security service',
  'A cryptocurrency project',
  'An esports team',
  'A generic hacker interface',
  'A cheap mobile game',
  'A noisy retro cyberpunk template',
] as const;

export function OverviewSection() {
  return (
    <Section id="overview" index="01" title="Overview" kicker="Brand concept">
      <Specimen label="HERO — SUPPLIED WORDMARK + ICON" tall>
        <div className="g-specimen__inner--row" style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'center' }}>
          <ResetRings opacity={0.35} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 40, placeItems: 'center' }}>
            <BrandLockup layout="horizontal" size="lg" wordmarkVariant="primary" decorative />
            <BrandIcon size={72} decorative />
          </div>
        </div>
      </Specimen>

      <Panel title="CONCEPT">
        <p className="type-body-m text-secondary">
          RESET//07 is a top-down neon science-fiction action game set in a city trapped inside a repeating
          seven-minute time loop. The identity behaves like a <strong className="text-primary">failing city-control
          interface</strong>: precise, urgent, and quietly broken. Every element — countdown rings, slash marks,
          segmented timers — comes from the reset protocol, not from decoration.
        </p>
        <p className="type-body-m text-secondary">
          The system is <strong className="text-primary">controlled destruction</strong>: sharp geometry, restrained
          color, mechanical motion. Nothing randomly glitches; corruption is deliberate and rare.
        </p>
      </Panel>

      <div className="g-grid g-grid--3">
        <Panel title="BRAND DNA">
          <ul className="g-dna-list">
            {BRAND_DNA.map((d) => (
              <li key={d} className="type-data-s text-secondary">
                ◍ {d}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="MUST NOT RESEMBLE">
          <ul className="g-dna-list">
            {AVOID_LIST.map((d) => (
              <li key={d} className="type-data-s text-muted">
                ✕ {d}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="ASSET STATUS">
          <p className="type-body-s text-secondary">
            The core logo and icon are <strong className="text-orange">supplied separately</strong>. The files in{' '}
            <code className="text-cyan">/public/brand</code> are clearly labeled temporary placeholders that keep the
            pipeline working. Replace them with the real assets — every component, pattern, favicon and template
            updates automatically.
          </p>
          <p className="type-body-s text-secondary">
            Never invent or redraw the logo. If an asset is missing, keep the placeholder and document it.
          </p>
        </Panel>
      </div>

      <Panel title="ASSET INVENTORY — SUPPLIED FILES">
        <DataTable
          head={['File', 'Path', 'Role', 'Status']}
          rows={[
            ['reset07-wordmark.png', <code key="p1">{BRAND_ASSET_PATHS.wordmark}</code>, 'Full-color wordmark — primary lockup', 'SUPPLIED'],
            ['reset07-wordmark-white.png', <code key="p2">{BRAND_ASSET_PATHS['wordmark-white']}</code>, 'Monochrome — dark backgrounds', 'SUPPLIED'],
            ['reset07-wordmark-black.png', <code key="p3">{BRAND_ASSET_PATHS['wordmark-black']}</code>, 'Monochrome — light backgrounds', 'SUPPLIED'],
            ['reset07-wordmark-small.png', <code key="p4">{BRAND_ASSET_PATHS['wordmark-small']}</code>, 'Simplified — below ~160 px width', 'SUPPLIED'],
            ['reset07-icon.png', <code key="p5">{BRAND_ASSET_PATHS.icon}</code>, 'Standalone icon — favicon, PWA, avatar', 'SUPPLIED'],
          ]}
        />
      </Panel>
    </Section>
  );
}
