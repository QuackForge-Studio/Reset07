/**
 * RESET//07 — typography tokens.
 * CSS classes in styles/typography.css are the runtime implementation;
 * this module mirrors the scale for docs and programmatic use.
 */

export const fontFamilies = {
  display: `'Chakra Petch', 'Be Vietnam Pro', system-ui, sans-serif`,
  ui: `'Be Vietnam Pro', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  data: `'IBM Plex Mono', 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace`,
} as const;

export type TypeRole =
  | 'display-xl'
  | 'display-l'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'body-l'
  | 'body-m'
  | 'body-s'
  | 'label'
  | 'caption'
  | 'data-xl'
  | 'data-m'
  | 'data-s';

export interface TypeSpec {
  family: 'display' | 'ui' | 'data';
  size: string;
  lineHeight: number;
  weight: number;
  letterSpacing: string;
  usage: string;
}

export const typeScale: Record<TypeRole, TypeSpec> = {
  'display-xl': { family: 'display', size: 'clamp(2.75rem, 9vw, 7.5rem)', lineHeight: 1.04, weight: 700, letterSpacing: '0.01em', usage: 'Game title frames, ending titles, trailer cards' },
  'display-l': { family: 'display', size: 'clamp(2.25rem, 6vw, 4.5rem)', lineHeight: 1.08, weight: 700, letterSpacing: '0.02em', usage: 'Chapter headings, major countdown moments' },
  'heading-1': { family: 'display', size: 'clamp(1.75rem, 4vw, 2.75rem)', lineHeight: 1.12, weight: 600, letterSpacing: '0.02em', usage: 'Screen titles, section headings' },
  'heading-2': { family: 'display', size: 'clamp(1.375rem, 2.75vw, 2rem)', lineHeight: 1.18, weight: 600, letterSpacing: '0.03em', usage: 'Panel titles, objectives' },
  'heading-3': { family: 'display', size: 'clamp(1.125rem, 1.9vw, 1.5rem)', lineHeight: 1.25, weight: 600, letterSpacing: '0.04em', usage: 'Sub-panels, setting groups' },
  'body-l': { family: 'ui', size: '1.125rem', lineHeight: 1.6, weight: 400, letterSpacing: '0', usage: 'Dialogue, descriptions, settings copy' },
  'body-m': { family: 'ui', size: '1rem', lineHeight: 1.6, weight: 400, letterSpacing: '0', usage: 'Default interface text' },
  'body-s': { family: 'ui', size: '0.875rem', lineHeight: 1.55, weight: 400, letterSpacing: '0', usage: 'Dense UI, item descriptions, mobile body' },
  label: { family: 'ui', size: '0.8125rem', lineHeight: 1.4, weight: 600, letterSpacing: '0.14em', usage: 'Menu labels, buttons, form labels' },
  caption: { family: 'ui', size: '0.75rem', lineHeight: 1.4, weight: 400, letterSpacing: '0.04em', usage: 'Captions, timestamps, legal, decorative metadata' },
  'data-xl': { family: 'data', size: 'clamp(2rem, 6vw, 4.5rem)', lineHeight: 1, weight: 600, letterSpacing: '0.02em', usage: 'Countdown timer, major diagnostic values' },
  'data-m': { family: 'data', size: '1rem', lineHeight: 1.4, weight: 500, letterSpacing: '0.04em', usage: 'System logs, memory IDs, technical values' },
  'data-s': { family: 'data', size: '0.75rem', lineHeight: 1.4, weight: 400, letterSpacing: '0.06em', usage: 'Diagnostic labels, status lines, key hints' },
};

export const typeRoles = [
  { role: 'display', font: 'Chakra Petch', weights: '500 / 600 / 700', usage: 'Game title, chapter headings, ending titles, trailer title cards, major countdown moments', vietnamese: true },
  { role: 'ui', font: 'Be Vietnam Pro', weights: '400 / 500 / 600 / 700', usage: 'Menus, settings, dialogue, objectives, buttons, mobile UI, accessibility text', vietnamese: true },
  { role: 'data', font: 'IBM Plex Mono', weights: '400 / 500 / 600', usage: 'Countdown timer, system logs, diagnostic labels, memory IDs, technical values', vietnamese: true },
] as const;

/** Readable line-length guidance. */
export const lineLength = { ideal: '45–65 characters', min: '40ch', max: '65ch' } as const;
