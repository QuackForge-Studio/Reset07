/**
 * RESET//07 — motion identity.
 * Fast, precise, mechanical, controlled. Never randomly glitchy.
 * See tokens/motion.ts for the full vocabulary and durations.
 */
export {
  motionDurations,
  motionEasing,
  zIndex,
  motionVocabulary,
  motionRules,
  reducedMotionQuery,
  prefersReducedMotion,
} from '../tokens/motion';
export type { MotionVocabularyItem } from '../tokens/motion';
export {
  LOGO_ANIMATION_DURATION,
  logoAnimationSteps,
  reducedMotionFallback,
  logoAnimationRules,
} from './logoAnimation';
export type { LogoAnimationStep } from './logoAnimation';
