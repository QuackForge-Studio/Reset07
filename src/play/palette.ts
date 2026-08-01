/**
 * RESET//07 — game palette.
 *
 * Mirrors the brand tokens in src/brand/styles/brand-tokens.css (single source
 * of truth for the identity). Canvas code cannot read CSS variables, so the
 * game-facing hex values are centralized HERE — never scattered in scenes.
 */
interface Pal { black: number; navy: number; surface: number; surfaceHi: number; cyan: number; orange: number; magenta: number; white: number; text: number; muted: number; road: number; roadLine: number; sidewalk: number; building: number; buildingEdge: number; wall: number; wallEdge: number; metal: number; metalHi: number; danger: number; amber: number; teal: number; smoke: number; scorch: number; }

export const PAL: Pal = {
  black: 0x070a0f,
  navy: 0x101826,
  surface: 0x152036,
  surfaceHi: 0x1c2b45,
  cyan: 0x38e8ff,
  orange: 0xff6a1a,
  magenta: 0xff3d9a,
  white: 0xf4f8ff,
  text: 0xa9b8cc,
  muted: 0x6e829c,
  road: 0x0d1524,
  roadLine: 0x1a2b44,
  sidewalk: 0x141d2e,
  building: 0x0a101c,
  buildingEdge: 0x1b2a42,
  wall: 0x0e1626,
  wallEdge: 0x38e8ff,
  metal: 0x1a2436,
  metalHi: 0x2a3a55,
  danger: 0xff3b30,
  amber: 0xffc44a,
  teal: 0x4de3c0,
  smoke: 0x232b38,
  scorch: 0x05070b,
};

export const PAL_HEX = {
  black: '#070A0F',
  navy: '#101826',
  cyan: '#38E8FF',
  orange: '#FF6A1A',
  magenta: '#FF3D9A',
  white: '#F4F8FF',
  amber: '#FFC44A',
  danger: '#FF3B30',
} as const;
