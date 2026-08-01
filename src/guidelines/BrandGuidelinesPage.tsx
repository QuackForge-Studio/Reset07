import { useEffect, useState } from 'react';
import { BrandIcon } from '../brand/components/BrandIcon';
import { OverviewSection } from './sections/OverviewSection';
import { LogoSection } from './sections/LogoSection';
import { ColorSection } from './sections/ColorSection';
import { TypographySection } from './sections/TypographySection';
import { PatternSection } from './sections/PatternSection';
import { MotionSection } from './sections/MotionSection';
import { ScreenSection } from './sections/ScreenSection';
import { SocialSection } from './sections/SocialSection';
import { UsageSection } from './sections/UsageSection';
import { A11ySection } from './sections/A11ySection';

const NAV = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'logo', num: '02', label: 'Logo system' },
  { id: 'color', num: '03', label: 'Color' },
  { id: 'typography', num: '04', label: 'Typography' },
  { id: 'patterns', num: '05', label: 'Patterns' },
  { id: 'motion', num: '06', label: 'Motion & logo intro' },
  { id: 'screens', num: '07', label: 'Screens & HUD' },
  { id: 'social', num: '08', label: 'Social & store' },
  { id: 'usage', num: '09', label: 'Usage rules' },
  { id: 'a11y', num: '10', label: 'A11y & responsive' },
] as const;

/**
 * BrandGuidelinesPage — internal developer/designer reference.
 * Deliberately NOT part of the production game navigation.
 * Full written documentation: docs/brand-guidelines.md
 */
export function BrandGuidelinesPage() {
  const [active, setActive] = useState('overview');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    const sections = document.querySelectorAll<HTMLElement>('.g-section[id]');
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="g-page">
      <nav className="g-nav" aria-label="Brand guidelines sections">
        <div className="g-nav__brand">
          <BrandIcon size={32} decorative />
          <h1 className="g-nav__title type-data-s text-secondary">RESET//07 — BRAND KIT</h1>
          <p className="g-nav__title type-data-s text-muted" style={{ margin: 0 }}>
            INTERNAL DEV REFERENCE
          </p>
        </div>
        {NAV.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={['g-nav__link', active === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}>
            <span className="g-nav__num type-data-s">{item.num}</span>
            <span className="type-label" style={{ fontSize: '0.75rem' }}>
              {item.label}
            </span>
          </a>
        ))}
      </nav>

      <main className="g-main">
        <div className="g-content">
          <OverviewSection />
          <LogoSection />
          <ColorSection />
          <TypographySection />
          <PatternSection />
          <MotionSection />
          <ScreenSection />
          <SocialSection />
          <UsageSection />
          <A11ySection />
        </div>
      </main>
    </div>
  );
}
