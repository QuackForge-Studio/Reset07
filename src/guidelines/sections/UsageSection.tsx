import type { CSSProperties, ReactNode } from 'react';
import { Section, Panel } from '../ui';
import { BrandLogo } from '../../brand/components/BrandLogo';
import { BrandIcon } from '../../brand/components/BrandIcon';

const DO_ITEMS = [
  { title: 'Maintain original proportions', note: 'Never stretch or compress. Render from the supplied SVG files only.' },
  { title: 'Use the approved asset files', note: 'primary / white / black / small / icon — each maps to one supplied file.' },
  { title: 'Guarantee contrast', note: 'White on Core Black/Deep Navy, black on light surfaces. No low-contrast mixes.' },
  { title: 'Preserve clear space', note: 'Half the “0” width around the wordmark; a quarter of the icon diameter around the icon.' },
  { title: 'Simplify at small sizes', note: 'Below ~160 px use reset07-wordmark-small.png; at favicon size use the icon only.' },
  { title: 'Let it rest', note: 'After the intro animation the logo is completely static — no looping effects, no glow.' },
] as const;

function Violation({ label, children, light = false }: { label: string; children: ReactNode; light?: boolean }) {
  return (
    <div className="g-do-dont__item g-do-dont__item--dont">
      <span className="g-do-dont__tag">Do not</span>
      <h4 className="g-do-dont__title type-data-s">{label}</h4>
      <div className={`g-violation${light ? ' g-violation--light' : ''}`}>{children}</div>
    </div>
  );
}

const dontStyles: CSSProperties = { width: 220 };

export function UsageSection() {
  return (
    <Section id="usage" index="09" title="Correct & incorrect usage" kicker="The identity is owned by the supplied assets — protect them">
      <Panel title="CORRECT USE">
        <div className="g-grid g-grid--2">
          {DO_ITEMS.map((item) => (
            <div key={item.title} className="g-do-dont__item g-do-dont__item--do">
              <span className="g-do-dont__tag">OK</span>
              <h4 className="g-do-dont__title type-data-s">{item.title}</h4>
              <p className="g-do-dont__note">{item.note}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="INCORRECT USE — THESE DEMOS BREAK THE RULES ON PURPOSE">
        <div className="g-grid g-grid--2">
          <Violation label="Stretching / compressing the logo">
            <BrandLogo variant="primary" style={{ transform: 'scaleX(1.45)', ...dontStyles }} decorative />
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Rotating the logo">
            <BrandLogo variant="primary" style={{ transform: 'rotate(-8deg)', ...dontStyles }} decorative />
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Recoloring with unapproved colors">
            <BrandLogo variant="primary" style={{ filter: 'hue-rotate(150deg) saturate(1.6)', ...dontStyles }} decorative />
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Heavy glow / drop shadows">
            <BrandLogo variant="primary" style={{ filter: 'drop-shadow(0 0 10px rgba(255,106,26,0.9))', ...dontStyles }} decorative />
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Low contrast over noisy backgrounds">
            <div style={{ background: 'linear-gradient(120deg, #1c2b45, #152036 60%, #0d1524)', padding: 16, width: '100%', display: 'grid', placeItems: 'center' }}>
              <BrandLogo variant="primary" style={{ opacity: 0.32, ...dontStyles }} decorative />
            </div>
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Full wordmark at favicon size">
            <div style={{ display: 'grid', placeItems: 'center', width: '100%' }}>
              <BrandLogo variant="primary" width={40} decorative />
            </div>
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Retyping the logo with a stock font">
            <span className="font-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.14em', color: 'var(--color-signal-white)', textDecoration: 'line-through' }}>
              RESET//07
            </span>
            <span className="g-violation__x">✕</span>
          </Violation>
          <Violation label="Icon used as a rotating spinner">
            <div style={{ display: 'grid', placeItems: 'center', width: '100%' }}>
              <BrandIcon size={56} decorative className="g-spin-demo" />
            </div>
            <span className="g-violation__x">✕</span>
          </Violation>
        </div>
        <p className="type-body-s text-secondary">
          Also forbidden: changing internal spacing, moving “07” away from the title, replacing the double slash,
          permanent rounded-square frames on the icon, bevel/chrome/metallic/fire textures, random glitch noise,
          filling letters with imagery, animating letters individually, and placing the logo on busy backgrounds.
        </p>
      </Panel>
    </Section>
  );
}
