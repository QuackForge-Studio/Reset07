/**
 * RESET//07 — color tokens (TypeScript mirror of brand-tokens.css).
 * The CSS custom properties remain the runtime source of truth;
 * these constants are for docs, spec tables, and programmatic use.
 */

export const brandColors = {
  coreBlack: '#070A0F',
  deepNavy: '#101826',
  emergencyCyan: '#38E8FF',
  reactorOrange: '#FF6A1A',
  corruptionMagenta: '#FF3D9A',
  signalWhite: '#F4F8FF',
} as const;

export const semanticColors = {
  backgroundPrimary: '#070A0F',
  backgroundSecondary: '#101826',
  surface: '#152036',
  surfaceHover: '#1C2B45',
  textPrimary: '#F4F8FF',
  textSecondary: '#A9B8CC',
  textMuted: '#6E829C',
  borderSubtle: 'rgba(56, 232, 255, 0.16)',
  borderActive: '#38E8FF',
  actionPrimary: '#38E8FF',
  actionDanger: '#FF6A1A',
  signalMemory: '#38E8FF',
  signalCorruption: '#FF3D9A',
  signalWarning: '#FF6A1A',
  signalSuccess: '#6FEFFF',
  overlayDark: 'rgba(3, 6, 10, 0.78)',
  focusRing: '#38E8FF',
} as const;

export type SemanticToken = keyof typeof semanticColors;

export interface ContrastPair {
  foreground: string;
  background: string;
  ratio: string;
  passesAA: boolean;
  note: string;
}

export const contrastPairs: ContrastPair[] = [
  { foreground: '#F4F8FF', background: '#070A0F', ratio: '17.8:1', passesAA: true, note: 'Primary text on Core Black' },
  { foreground: '#A9B8CC', background: '#070A0F', ratio: '9.4:1', passesAA: true, note: 'Secondary text on Core Black' },
  { foreground: '#6E829C', background: '#070A0F', ratio: '5.0:1', passesAA: true, note: 'Muted text — captions only' },
  { foreground: '#38E8FF', background: '#070A0F', ratio: '12.9:1', passesAA: true, note: 'Cyan accents on Core Black' },
  { foreground: '#FF6A1A', background: '#070A0F', ratio: '6.9:1', passesAA: true, note: 'Orange warnings on Core Black' },
  { foreground: '#FF3D9A', background: '#070A0F', ratio: '7.7:1', passesAA: true, note: 'Magenta corruption on Core Black' },
  { foreground: '#070A0F', background: '#38E8FF', ratio: '12.9:1', passesAA: true, note: 'Black label on cyan action button' },
  { foreground: '#070A0F', background: '#FF6A1A', ratio: '6.9:1', passesAA: true, note: 'Black label on orange danger button' },
  { foreground: '#F4F8FF', background: '#101826', ratio: '15.0:1', passesAA: true, note: 'Primary text on Deep Navy panels' },
];

/** Human-readable semantic token usage map (rendered in the guidelines page). */
export const semanticTokenUsage: Record<SemanticToken, string> = {
  backgroundPrimary: 'Primary backgrounds, loading screens, cinematic title cards',
  backgroundSecondary: 'Secondary panels, menus, cards, raised UI surfaces',
  surface: 'Cards, inputs, raised controls on Deep Navy',
  surfaceHover: 'Hover state for surfaces and menu rows',
  textPrimary: 'Primary text, high-contrast labels, essential information',
  textSecondary: 'Supporting copy, taglines, non-critical labels',
  textMuted: 'Captions, timestamps, decorative metadata (not body text)',
  borderSubtle: 'Default hairlines, panel borders, dividers',
  borderActive: 'Active/selected borders, focus frames',
  actionPrimary: 'Primary actions — New Loop, Continue, navigation',
  actionDanger: 'Destructive interactions, critical warnings, countdown urgency',
  signalMemory: 'Player energy, memory persistence, normal system signals',
  signalCorruption: 'System corruption, unstable memory, hidden narrative content',
  signalWarning: 'Explosions, critical warnings, countdown urgency',
  signalSuccess: 'System nominal / success confirmations (cyan family)',
  overlayDark: 'Modal scrims, cinematic vignettes, pause overlays',
  focusRing: 'Keyboard focus indicator',
};
