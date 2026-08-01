/**
 * RESET//07 — spacing, radius & shadow tokens (TS mirror of brand-tokens.css).
 */

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
  9: 96,
  10: 128,
} as const;

export type SpacingToken = keyof typeof spacing;

export const radius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 6,
  lg: 10,
  pill: 999,
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.45)',
  md: '0 4px 14px rgba(0, 0, 0, 0.45)',
  lg: '0 12px 40px rgba(0, 0, 0, 0.55)',
  glowCyan: '0 0 18px rgba(56, 232, 255, 0.28)',
  glowOrange: '0 0 18px rgba(255, 106, 26, 0.3)',
} as const;

export const gradients = {
  depth: 'linear-gradient(180deg, #0d1524 0%, #070a0f 100%)',
  emergency: 'linear-gradient(120deg, rgba(255, 106, 26, 0.2) 0%, transparent 55%)',
  corruption: 'linear-gradient(120deg, rgba(255, 61, 154, 0.22) 0%, transparent 55%)',
  pulseCyan: 'linear-gradient(90deg, transparent 0%, rgba(56, 232, 255, 0.55) 50%, transparent 100%)',
} as const;
