import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import type { BrandLogoVariant } from '../components/BrandLogo';
import { BrandIcon } from '../components/BrandIcon';

/** Shared props for all brand pattern components. */
export interface BrandPatternProps {
  className?: string;
  style?: CSSProperties;
  /** Base opacity of the pattern. Default 0.4. */
  opacity?: number;
}

/**
 * BrandPatternFrame — renders a pattern inside a positioned frame
 * (used by the guidelines page and screens).
 */
export function BrandPatternFrame({
  children,
  className,
  style,
  label,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <div className={['brand-pattern-frame', className].filter(Boolean).join(' ')} style={style}>
      {children}
      {label && <span className="brand-pattern-frame__label type-data-s">{label}</span>}
    </div>
  );
}

/**
 * BrandPatternToggle — small control used by the guidelines page to
 * demonstrate effects levels. Not part of the game UI.
 */
export function BrandPatternToggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="brand-button brand-button--sm" aria-pressed={on} onClick={onToggle}>
      {label}
    </button>
  );
}

export { BrandLogo, BrandIcon };
export type { BrandLogoVariant };

/** Re-renders every `intervalMs`; handy for countdown demos. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
