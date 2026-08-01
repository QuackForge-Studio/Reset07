import { memo } from 'react';
import type { CSSProperties } from 'react';
import { BRAND_ASSET_PATHS } from '../assets';

/**
 * BrandLogo — renders one of the supplied wordmark/icon assets.
 *
 * Variants map 1:1 to supplied files:
 *   primary  → reset07-wordmark.png        (full-color wordmark)
 *   white    → reset07-wordmark-white.png  (monochrome, dark backgrounds)
 *   black    → reset07-wordmark-black.png  (monochrome, light backgrounds)
 *   small    → reset07-wordmark-small.png  (simplified < 160 px width)
 *   icon     → reset07-icon.png            (standalone icon)
 *
 * The asset is never retyped with a font and never distorted.
 */

export type BrandLogoVariant = 'primary' | 'white' | 'black' | 'small' | 'icon';

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  /** Explicit rendered width. Aspect ratio is always preserved. */
  width?: number | string;
  /** Explicit rendered height. Aspect ratio is always preserved. */
  height?: number | string;
  /** Accessible label. Defaults to "RESET//07". */
  label?: string;
  /** Decorative instances are hidden from assistive technology. */
  decorative?: boolean;
  loading?: 'eager' | 'lazy';
  className?: string;
  style?: CSSProperties;
}

const VARIANT_TO_ASSET: Record<BrandLogoVariant, keyof typeof BRAND_ASSET_PATHS> = {
  primary: 'wordmark',
  white: 'wordmark-white',
  black: 'wordmark-black',
  small: 'wordmark-small',
  icon: 'icon',
};

export const BrandLogo = memo(function BrandLogo({
  variant = 'primary',
  width,
  height,
  label = 'RESET//07',
  decorative = false,
  loading = 'eager',
  className,
  style,
}: BrandLogoProps) {
  // Width/height are applied as inline styles (never HTML attributes):
  // the .brand-logo class keeps height:auto for aspect-ratio safety.
  const sizeStyle: CSSProperties = {
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };
  return (
    <img
      className={['brand-logo', className].filter(Boolean).join(' ')}
      src={BRAND_ASSET_PATHS[VARIANT_TO_ASSET[variant]]}
      alt={decorative ? '' : label}
      aria-hidden={decorative ? true : undefined}
      style={{ ...sizeStyle, ...style }}
      loading={loading}
      draggable={false}
    />
  );
});
