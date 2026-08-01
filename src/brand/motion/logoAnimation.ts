/**
 * RESET//07 — logo animation blueprint.
 *
 * The animation is implemented by `AnimatedBrandLogo`; this module
 * documents the canonical sequence, timings and the reduced-motion
 * fallback so designers and developers share one source of truth.
 */

export const LOGO_ANIMATION_DURATION = 2400;

export interface LogoAnimationStep {
  name: string;
  /** Relative window of the total duration, [start, end] in 0–1. */
  window: [number, number];
  description: string;
}

export const logoAnimationSteps: LogoAnimationStep[] = [
  { name: 'Countdown ring appears', window: [0, 0.1], description: 'A thin segmented ring fades in around the mark.' },
  { name: 'Segments progress to zero', window: [0.1, 0.46], description: 'Seven segments clear one by one, ~120 ms per tick.' },
  { name: 'Double-slash interruption', window: [0.44, 0.48], description: 'The // motif cuts the ring; the ring retracts at 0.56.' },
  { name: 'Wordmark reveal', window: [0.44, 0.62], description: 'The supplied wordmark wipes in through a clean clip mask.' },
  { name: 'Cyan pulse', window: [0.58, 0.74], description: 'One energy pulse travels across the mark.' },
  { name: 'Reactor Orange accent', window: [0.72, 0.8], description: 'A single brief warning flash (off with reduced flash).' },
  { name: 'Resolve to static', window: [0.8, 1], description: 'Supporting elements are gone; the logo is completely static.' },
];

export const reducedMotionFallback = {
  duration: 200,
  description: 'Simple 200 ms fade. No countdown ring, no flash, no large movement.',
} as const;

export const logoAnimationRules = [
  'Never redraw or deform the logo — animate masks, clips, opacity, translation, scale and supporting lines only.',
  'No heavy glow on the logo.',
  'No prolonged glitch distortion.',
  'The animation must resolve into the completely static supplied logo.',
  'Below 160 px width, skip the intro and render the static simplified wordmark.',
] as const;
