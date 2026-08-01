/**
 * RESET//07 — motion identity tokens.
 * Fast, precise, mechanical, controlled — never randomly glitchy.
 * CSS variables in brand-tokens.css are the runtime source of truth.
 */

export const motionDurations = {
  micro: 100, // 80–140 ms micro interactions
  button: 150, // 120–180 ms button states
  panel: 220, // 180–280 ms panel transitions
  reset: 700, // 500–900 ms major reset transitions
  logoIntro: 2400, // 2–3 s logo intro
  tick: 90, // countdown tick
  loadingSweep: 2400,
  pattern: 60000,
} as const;

export const motionEasing = {
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  outQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  inOutQuart: 'cubic-bezier(0.76, 0, 0.24, 1)',
  snap: 'cubic-bezier(0.85, 0, 0.15, 1)',
  linear: 'linear',
} as const;

export const zIndex = {
  pattern: 1,
  surface: 10,
  overlay: 100,
  hud: 200,
  modal: 300,
  toast: 400,
  loading: 500,
} as const;

export interface MotionVocabularyItem {
  name: string;
  description: string;
  duration: string;
}

export const motionVocabulary: MotionVocabularyItem[] = [
  { name: 'Segment assembly', description: 'Countdown ring segments snap into place one by one.', duration: '90–140 ms / segment' },
  { name: 'Timeline interruption', description: 'A clean slash cuts a progress line mid-flow.', duration: '150–220 ms' },
  { name: 'Radial pulse', description: 'A single expanding ring for warnings — never faster than 1 Hz.', duration: '400–700 ms' },
  { name: 'Short reconstruction', description: 'Panels and lists rebuild with a quick wipe. No bounce.', duration: '180–280 ms' },
  { name: 'Countdown tick', description: 'Hard, stepped time updates in tabular numerals.', duration: '90 ms' },
  { name: 'Controlled scan', description: 'A thin cyan line sweeps once. No continuous CRT scan.', duration: '400–600 ms' },
  { name: 'Sharp state change', description: 'Buttons and chips snap to new states with a 1 px settle.', duration: '120–180 ms' },
  { name: 'Brief warning flash', description: 'One orange flash, never strobing. Off via --flash-opacity: 0.', duration: '80–120 ms' },
];

export const motionRules = [
  'Never randomly glitch',
  'No constant shaking or jitter',
  'No rubbery or excessive bounce',
  'No long glitch effects',
  'No unnecessary looping animations',
  'No large parallax on mobile',
  'Always respect prefers-reduced-motion',
] as const;

export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(reducedMotionQuery).matches;
}
