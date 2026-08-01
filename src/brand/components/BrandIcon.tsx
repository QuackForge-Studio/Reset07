import { memo } from 'react';
import type { CSSProperties } from 'react';
import { BrandLogo } from './BrandLogo';

/**
 * BrandIcon — the supplied standalone icon (reset07-icon.png).
 * Used for favicons, PWA, social avatars, launcher icons,
 * compact loading marks and small HUD branding.
 * Never rotate the core icon like a generic spinner — animate
 * supporting ring segments instead (see LoadingBrandMark).
 */

export interface BrandIconProps {
  /** Diameter in px (default 48). */
  size?: number;
  /** Accessible label. */
  label?: string;
  /** Decorative instances are hidden from assistive technology. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const BrandIcon = memo(function BrandIcon({
  size = 48,
  label = 'RESET//07 icon',
  decorative = false,
  className,
  style,
}: BrandIconProps) {
  return (
    <BrandLogo
      variant="icon"
      width={size}
      height={size}
      label={label}
      decorative={decorative}
      className={className}
      style={{ aspectRatio: '1 / 1', ...style }}
    />
  );
});
