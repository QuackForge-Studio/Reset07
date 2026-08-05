/**
 * RESET//07 — brand asset registry.
 * All logo assets are the *supplied* files in /public/brand (PNG, from logo/).
 * Paths are relative to the deployment base so the game works
 * from sub-directories (itch.io, CDNs, GitHub Pages).
 */

const BASE = import.meta.env.BASE_URL;

export const BRAND_ASSET_PATHS = {
  wordmark: `${BASE}brand/reset07-wordmark.png`,
  'wordmark-white': `${BASE}brand/reset07-wordmark-white.png`,
  'wordmark-black': `${BASE}brand/reset07-wordmark-black.png`,
  'wordmark-small': `${BASE}brand/reset07-wordmark-small.png`,
  icon: `${BASE}brand/reset07-icon.png`,
} as const;

export type BrandAssetName = keyof typeof BRAND_ASSET_PATHS;

export const brandAssetPath = (name: BrandAssetName): string => BRAND_ASSET_PATHS[name];

export const ART_ASSET_PATHS = {
  titleCity: `${BASE}art/concept/title-city.webp`,
  loadingLoop: `${BASE}art/concept/loading-loop.webp`,
  k07Portrait: `${BASE}art/concept/k07-portrait.webp`,
  bossConcept: `${BASE}art/concept/boss-concept.webp`,
  garage: `${BASE}art/backgrounds/garage.webp`,
} as const;

export type ArtAssetName = keyof typeof ART_ASSET_PATHS;

export const artAssetPath = (name: ArtAssetName): string => ART_ASSET_PATHS[name];
