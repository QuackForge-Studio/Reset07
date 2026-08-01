import { Section, Panel, Specimen, DataTable } from '../ui';
import { BrandLockup } from '../../brand/components/BrandLockup';
import { BrandIcon } from '../../brand/components/BrandIcon';

const BREAKPOINTS = [
  { label: '320 px — small phones', width: 320, min: true },
  { label: '375 px — phones', width: 375, min: true },
  { label: '768 px — tablets', width: 768, min: false },
  { label: '1080 p — desktops', width: 1080, min: false },
  { label: 'ultrawide', width: 1440, min: false },
] as const;

const A11Y_CHECKS = [
  'Sufficient contrast — all AA pairs verified (see Color section)',
  'Keyboard-visible focus states — 2 px cyan ring, 3 px offset, everywhere',
  'Reduced motion — pure CSS media query; logo intro collapses to a 200 ms fade',
  'Flash control — single warning flashes only, never strobing; data-flash="reduced" kills them',
  'No important state by color alone — chips have labels, timers have text, rings have progress text',
  'Readable small-screen type — essential text never below 0.875rem',
  'Meaningful labels — BrandLogo/BrandIcon accept accessible labels; decorative instances are aria-hidden',
  'Flash rate — nothing repeats faster than ~1 Hz; hazard pulse is 0.22 Hz',
] as const;

export function A11ySection() {
  return (
    <Section id="a11y" index="10" title="Accessibility & responsive" kicker="Reduced motion, flash control, safe areas, every screen width">
      <Panel title="ACCESSIBILITY CHECKLIST">
        <ul className="g-dna-list">
          {A11Y_CHECKS.map((check) => (
            <li key={check} className="type-body-s text-secondary">
              ✓ {check}
            </li>
          ))}
        </ul>
        <p className="type-body-s text-secondary">
          The full reduced-motion implementation is pure CSS:{' '}
          <code className="text-cyan">@media (prefers-reduced-motion: reduce)</code> in{' '}
          <code className="text-cyan">src/brand/styles/brand.css</code>. The guidelines toolbar can simulate it via{' '}
          <code className="text-cyan">html[data-motion="reduced"]</code>; production never needs JavaScript for this.
        </p>
      </Panel>

      <Panel title="RESPONSIVE LOCKUP PREVIEWS">
        <div className="g-breakpoint-row">
          {BREAKPOINTS.map((bp) => (
            <div key={bp.label} className="g-breakpoint">
              <span className="type-data-s text-muted">{bp.label}</span>
              <div className="g-breakpoint__frame" style={{ width: bp.width }}>
                <BrandLockup layout={bp.min ? 'stacked' : 'horizontal'} size="md" wordmarkVariant="white" align="center" decorative />
              </div>
            </div>
          ))}
        </div>
        <p className="type-body-s text-secondary">
          Layout rules: portrait uses the stacked lockup and centered bars; landscape uses horizontal lockups with
          corner captions; safe-area insets are applied on every screen; pattern density stays adaptive and mobile
          particle counts are reduced.
        </p>
      </Panel>

      <Panel title="ICON PIPELINE">
        <Specimen label="SUPPLIED VECTOR → GENERATED RASTERS">
          <div className="g-specimen__inner--row" style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {[16, 32, 48, 180].map((s) => (
              <BrandIcon key={s} size={s} decorative />
            ))}
            <BrandIcon size={192} decorative />
            <BrandIcon size={512} decorative className="g-icon-maskable" />
          </div>
        </Specimen>
        <DataTable
          head={['Output', 'File', 'Purpose']}
          rows={[
            ['16 / 32 / 48 / 180 / 192 / 256 / 384 / 512 PNG', 'public/icons/icon-{size}.png', 'Favicon fallback, Apple touch, PWA, avatars'],
            ['512 maskable PNG', 'public/icons/icon-512-maskable.png', 'PWA maskable — Core Black background, 60 % safe zone'],
            ['favicon.ico', 'public/favicon.ico', 'Legacy browsers (16/32/48 embedded)'],
          ]}
        />
        <p className="type-body-s text-secondary">
          Run <code className="text-cyan">npm run generate:icons</code> after replacing the supplied icon asset.
          Maskable icons preserve a safe central area, extend Core Black, and never crop essential geometry or add
          a permanent rounded-square frame to the core icon.
        </p>
      </Panel>
    </Section>
  );
}
