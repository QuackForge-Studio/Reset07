import { memo } from 'react';
import type { HudTone } from './SegmentedRing';

export interface SlashDividerProps {
  /** Optional text between the slashes, e.g. a section name. */
  label?: string;
  tone?: HudTone;
  className?: string;
}

/**
 * SlashDivider — the // motif as a layout divider.
 * The double slash is part of the identity; use it to separate
 * HUD groups, not as decoration everywhere.
 */
export const SlashDivider = memo(function SlashDivider({ label, tone = 'memory', className }: SlashDividerProps) {
  return (
    <div className={['slash-divider', `slash-divider--${tone}`, className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className="slash-divider__line" />
      <span className="slash-divider__glyph">//</span>
      {label && <span className="slash-divider__label type-data-s">{label}</span>}
      <span className="slash-divider__line" />
    </div>
  );
});
