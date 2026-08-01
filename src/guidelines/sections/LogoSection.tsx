import { Section, Panel, Specimen, DataTable } from '../ui';
import { BrandLogo } from '../../brand/components/BrandLogo';
import { BrandLockup } from '../../brand/components/BrandLockup';
import { BrandIcon } from '../../brand/components/BrandIcon';

const MIN_SIZES = [
  { item: 'Full wordmark', size: '120 px', note: 'Detailed logo — never below this on screen' },
  { item: 'Simplified wordmark', size: '72 px', note: 'reset07-wordmark-small.png below 160 px' },
  { item: 'Standalone icon', size: '16 px', note: 'Favicon / launcher minimum' },
  { item: 'Printed wordmark', size: '30 mm', note: 'Print minimum — use simplified at smaller sizes' },
] as const;

export function LogoSection() {
  return (
    <Section id="logo" index="02" title="Logo system" kicker="Supplied assets, lockups, clear space, minimum sizes">
      <Panel title="VARIANT MATRIX — ONE ASSET PER VARIANT">
        <div className="g-grid g-grid--2">
          <Specimen label="PRIMARY — DARK BACKGROUNDS">
            <BrandLogo variant="primary" height={52} decorative />
          </Specimen>
          <Specimen label="WHITE — ALWAYS ON CORE BLACK / NAVY">
            <BrandLogo variant="white" height={52} decorative />
          </Specimen>
          <Specimen label="BLACK — LIGHT BACKGROUNDS ONLY" light>
            <BrandLogo variant="black" height={52} decorative />
          </Specimen>
          <Specimen label="SMALL — SIMPLIFIED WORDMARK < 160 PX">
            <BrandLogo variant="small" width={150} decorative />
          </Specimen>
        </div>
      </Panel>

      <Panel title="LOCKUPS — COMPOSITION ONLY, NEVER GEOMETRY CHANGES">
        <div className="g-grid g-grid--2">
          <Specimen label="PRIMARY HORIZONTAL — DESKTOP TITLE / NAV / TRAILER END CARD" tall>
            <BrandLockup layout="horizontal" size="lg" wordmarkVariant="primary" decorative />
          </Specimen>
          <Specimen label="COMPACT STACKED — PORTRAIT MOBILE / SQUARE SOCIAL" tall>
            <BrandLockup layout="stacked" size="md" wordmarkVariant="white" align="center" withIcon decorative />
          </Specimen>
          <Specimen label="ICON-ONLY — FAVICON / PWA / AVATAR / COMPACT LOADING" tall>
            <BrandIcon size={96} decorative />
          </Specimen>
          <Specimen label="RESPONSIVE LOCKUP — STACKS UNDER 480 PX" tall>
            <BrandLockup layout="responsive" size="md" wordmarkVariant="white" align="center" decorative />
          </Specimen>
        </div>
      </Panel>

      <Panel title="CLEAR SPACE">
        <div className="g-grid g-grid--2">
          <Specimen label="WORDMARK — HALF THE WIDTH OF THE “0”">
            <div className="g-clearspace" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
              <div className="g-clearspace__box">
                <BrandLogo variant="primary" height={44} decorative />
                <span className="g-clearspace__guide g-clearspace__guide--a" aria-hidden="true" />
                <span className="g-clearspace__guide g-clearspace__guide--b" aria-hidden="true" />
              </div>
            </div>
          </Specimen>
          <Specimen label="ICON — ONE QUARTER OF THE ICON DIAMETER">
            <div className="g-clearspace" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
              <div className="g-clearspace__box g-clearspace__box--icon">
                <BrandIcon size={72} decorative />
              </div>
            </div>
          </Specimen>
        </div>
        <p className="type-body-s text-secondary">
          Clear space = half the visual width of the <span className="text-cyan">0</span> in “07” for the wordmark,
          one quarter of the icon diameter for the standalone icon. No buttons, borders, text, particles, HUD
          elements or screen edges may enter the protected area.
        </p>
      </Panel>

      <Panel title="MINIMUM SIZES">
        <div className="g-grid g-grid--4">
          <Specimen label="FULL WORDMARK — 120 PX">
            <BrandLogo variant="primary" width={120} decorative />
          </Specimen>
          <Specimen label="SIMPLIFIED — 72 PX">
            <BrandLogo variant="small" width={72} decorative />
          </Specimen>
          <Specimen label="ICON — 16 PX">
            <BrandIcon size={16} decorative />
          </Specimen>
          <Specimen label="PRINT — 30 MM">
            <BrandLogo variant="primary" width={113} decorative />
          </Specimen>
        </div>
        <p className="type-body-s text-secondary">
          At small sizes: no glow, no particles, no secondary lines, no complex animation — use the simplified
          asset and increase contrast. The detailed wordmark must never be scaled below 120 px.
        </p>
        <DataTable
          head={['Minimum', 'Value', 'Rule']}
          rows={MIN_SIZES.map((m) => [m.item, <code key={m.item}>{m.size}</code>, m.note])}
        />
      </Panel>
    </Section>
  );
}
