import { memo } from 'react';
import type { CSSProperties } from 'react';
import { BrandLogo, type BrandLogoVariant } from './BrandLogo';
import { BrandIcon } from './BrandIcon';

/**
 * BrandLockup — layout compositions around the supplied assets.
 *
 * - horizontal: icon + wordmark on one line (desktop title, nav, trailer end card)
 * - stacked:    icon above wordmark (portrait mobile, square social art)
 * - responsive: stacked on narrow screens, horizontal from 480 px up
 *
 * The internal geometry of the wordmark is never altered to force a
 * layout — only the composition (flex direction, gaps, sizes) changes.
 * Below ~160 px wordmark width the simplified small asset is used.
 */

export type BrandLockupLayout = 'horizontal' | 'stacked' | 'responsive';
export type BrandLockupSize = 'sm' | 'md' | 'lg';

export interface BrandLockupProps {
  layout?: BrandLockupLayout;
  /** Which wordmark asset to use. If unset, `sm` size selects the simplified asset. */
  wordmarkVariant?: Exclude<BrandLogoVariant, 'icon'>;
  withIcon?: boolean;
  size?: BrandLockupSize;
  align?: 'start' | 'center' | 'end';
  label?: string;
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

const WORDMARK_HEIGHT: Record<BrandLockupSize, number> = { sm: 24, md: 40, lg: 56 };
const ICON_SIZE: Record<BrandLockupSize, number> = { sm: 22, md: 36, lg: 48 };

export const BrandLockup = memo(function BrandLockup({
  layout = 'horizontal',
  wordmarkVariant,
  withIcon = false,
  size = 'md',
  align = 'start',
  label = 'RESET//07',
  decorative = false,
  className,
  style,
}: BrandLockupProps) {
  // Small lockups use the simplified wordmark unless an explicit variant is given.
  const effectiveVariant: Exclude<BrandLogoVariant, 'icon'> =
    wordmarkVariant ?? (size === 'sm' ? 'small' : 'primary');

  const layoutClass =
    layout === 'responsive'
      ? 'brand-lockup--responsive'
      : layout === 'stacked'
        ? 'brand-lockup--stacked'
        : 'brand-lockup--horizontal';

  return (
    <span
      className={['brand-lockup', layoutClass, `brand-lockup--${size}`, className].filter(Boolean).join(' ')}
      style={{ alignItems: align, ...style }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      {withIcon && <BrandIcon size={ICON_SIZE[size]} decorative />}
      <BrandLogo variant={effectiveVariant} height={WORDMARK_HEIGHT[size]} decorative />
    </span>
  );
});
