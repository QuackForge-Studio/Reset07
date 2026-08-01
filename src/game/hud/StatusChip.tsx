import { memo } from 'react';
import type { HudTone } from './SegmentedRing';

const GLYPH: Record<HudTone, string> = {
  memory: '◍',
  warning: '!',
  corruption: '//',
  success: '✓',
};

export interface StatusChipProps {
  tone?: HudTone;
  /** Short uppercase label, e.g. "MEMORY TRACE". */
  label: string;
  /** Optional value, e.g. "07:00". */
  value?: string;
  className?: string;
}

/**
 * StatusChip — a compact system state. Always carries a text label,
 * so state is never communicated by color alone.
 */
export const StatusChip = memo(function StatusChip({ tone = 'memory', label, value, className }: StatusChipProps) {
  return (
    <span className={['status-chip', `status-chip--${tone}`, className].filter(Boolean).join(' ')}>
      <span className="status-chip__glyph" aria-hidden="true">
        {GLYPH[tone]}
      </span>
      <span className="status-chip__label">{label}</span>
      {value && <span className="status-chip__value">{value}</span>}
    </span>
  );
});
