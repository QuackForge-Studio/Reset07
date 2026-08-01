/**
 * RESET//07 — social & store layout templates.
 *
 * Editable template components (not baked rasters). Each template is
 * a layout *specification* rendered with real brand components, so it
 * updates automatically when the supplied assets are replaced.
 *
 * Recommended raster exports per layout:
 *   avatar 1:1         512 × 512 (social avatar, launcher)
 *   post 1:1           1080 × 1080
 *   thumbnail 16:9     1280 × 720
 *   trailer card 16:9  1920 × 1080
 *   vertical 9:16      1080 × 1920
 *   banner 4:1         1920 × 480 (website)
 *   capsule 3:4        600 × 800 (store capsule)
 *   press header 3:1   1920 × 640
 */
import type { CSSProperties, ReactNode } from 'react';
import { BrandLockup } from '../components/BrandLockup';
import { BrandIcon } from '../components/BrandIcon';
import { ResetRings } from '../patterns/ResetRings';
import { CountdownGrid } from '../patterns/CountdownGrid';
import { StatusChip } from '../../game/hud/StatusChip';
import { TimingLine } from '../../game/hud/TimingLine';
import { brandColors } from '../tokens/colors';

export interface SocialTemplateProps {
  className?: string;
  style?: CSSProperties;
}

const Frame = ({ className, style, children, label }: SocialTemplateProps & { children: ReactNode; label?: string }) => (
  <div className={['social-template', className].filter(Boolean).join(' ')} style={style}>
    {children}
    {label && <span className="social-template__label type-data-s">{label}</span>}
  </div>
);

/** 1:1 social avatar — icon only, rings behind, generous clear space. */
export function SocialAvatar({ className, style }: SocialTemplateProps) {
  return (
    <Frame className={['social-avatar', className].filter(Boolean).join(' ')} style={style} label="AVATAR 1:1 — ICON ONLY">
      <ResetRings opacity={0.35} />
      <BrandIcon size={96} decorative className="social-avatar__icon" />
      <span className="social-avatar__tick" aria-hidden="true" />
    </Frame>
  );
}

/** 1:1 social post — horizontal lockup, rings, caption line. */
export function SocialPost({ className, style, caption = 'LOOP 07 // THE CITY RESETS' }: SocialTemplateProps & { caption?: string }) {
  return (
    <Frame className={['social-post', className].filter(Boolean).join(' ')} style={style} label="POST 1:1">
      <ResetRings opacity={0.3} />
      <BrandLockup layout="horizontal" size="md" wordmarkVariant="white" decorative className="social-post__lockup" />
      <span className="social-post__rule" aria-hidden="true" />
      <p className="social-post__caption type-data-m text-secondary">{caption}</p>
      <TimingLine width="40%" tone="warning" />
    </Frame>
  );
}

/** 16:9 YouTube thumbnail — big wordmark lower-left, ring motif right. */
export function YouTubeThumbnail({ className, style, title = 'RESET//07 — OFFICIAL TRAILER' }: SocialTemplateProps & { title?: string }) {
  return (
    <Frame className={['social-thumbnail', className].filter(Boolean).join(' ')} style={style} label="THUMBNAIL 16:9">
      <ResetRings opacity={0.35} />
      <span className="social-thumbnail__ring" aria-hidden="true">
        <span className="social-thumbnail__ring-value type-data-xl">07:00</span>
      </span>
      <div className="social-thumbnail__bottom">
        <BrandLockup layout="horizontal" size="lg" wordmarkVariant="white" decorative />
        <p className="social-thumbnail__title type-label text-secondary">{title}</p>
      </div>
      <StatusChip tone="warning" label="NEW LOOP" className="social-thumbnail__chip" />
    </Frame>
  );
}

/** 16:9 trailer title card — centered stacked lockup, cinematic. */
export function TrailerTitleCard({ className, style, tagline = 'EVERY SEVEN MINUTES, IT HAPPENS AGAIN' }: SocialTemplateProps & { tagline?: string }) {
  return (
    <Frame className={['social-trailer', className].filter(Boolean).join(' ')} style={style} label="TRAILER TITLE CARD 16:9">
      <ResetRings opacity={0.4} />
      <div className="social-trailer__center">
        <BrandLockup layout="stacked" size="lg" wordmarkVariant="white" align="center" withIcon decorative />
        <p className="social-trailer__tagline type-label text-secondary">{tagline}</p>
      </div>
      <span className="social-trailer__bar" aria-hidden="true" />
    </Frame>
  );
}

/** 9:16 vertical cover — stacked lockup center, portrait-first. */
export function VerticalCover({ className, style }: SocialTemplateProps) {
  return (
    <Frame className={['social-vertical', className].filter(Boolean).join(' ')} style={style} label="VERTICAL COVER 9:16">
      <CountdownGrid opacity={0.3} />
      <BrandLockup layout="stacked" size="lg" wordmarkVariant="white" align="center" withIcon decorative className="social-vertical__lockup" />
      <StatusChip tone="warning" label="T-07:00" className="social-vertical__chip" />
    </Frame>
  );
}

/** 4:1 website banner — horizontal lockup left, rings right. */
export function WebsiteBanner({ className, style }: SocialTemplateProps) {
  return (
    <Frame className={['social-banner', className].filter(Boolean).join(' ')} style={style} label="WEBSITE BANNER 4:1">
      <ResetRings opacity={0.35} />
      <BrandLockup layout="horizontal" size="lg" wordmarkVariant="white" decorative className="social-banner__lockup" />
      <div className="social-banner__chips">
        <StatusChip tone="memory" label="MEMORY PERSISTS" />
        <StatusChip tone="warning" label="LOOP 07" />
      </div>
    </Frame>
  );
}

/** 3:4 store capsule — icon top, wordmark bottom, depth gradient. */
export function StoreCapsule({ className, style }: SocialTemplateProps) {
  return (
    <Frame className={['social-capsule', className].filter(Boolean).join(' ')} style={style} label="STORE CAPSULE 3:4">
      <CountdownGrid opacity={0.25} />
      <BrandIcon size={140} decorative className="social-capsule__icon" />
      <BrandLockup layout="stacked" size="md" wordmarkVariant="white" align="center" decorative className="social-capsule__lockup" />
      <span className="social-capsule__edge" aria-hidden="true" />
    </Frame>
  );
}

/** 3:1 press-kit header — lockup, icon, palette strip, data labels. */
export function PressHeader({ className, style }: SocialTemplateProps) {
  return (
    <Frame className={['social-press', className].filter(Boolean).join(' ')} style={style} label="PRESS HEADER 3:1">
      <BrandLockup layout="horizontal" size="lg" wordmarkVariant="white" decorative className="social-press__lockup" />
      <BrandIcon size={72} decorative />
      <div className="social-press__palette" aria-hidden="true">
        {[brandColors.coreBlack, brandColors.deepNavy, brandColors.emergencyCyan, brandColors.reactorOrange, brandColors.corruptionMagenta, brandColors.signalWhite].map((c) => (
          <span key={c} className="social-press__swatch" style={{ background: c }} />
        ))}
      </div>
    </Frame>
  );
}

export const SOCIAL_SPECS = [
  { name: 'SocialAvatar', aspect: '1:1', export: '512 × 512', use: 'Social avatar, launcher icon, community badges' },
  { name: 'SocialPost', aspect: '1:1', export: '1080 × 1080', use: 'Announcements, launch posts, screenshots' },
  { name: 'YouTubeThumbnail', aspect: '16:9', export: '1280 × 720', use: 'YouTube / VOD thumbnails' },
  { name: 'TrailerTitleCard', aspect: '16:9', export: '1920 × 1080', use: 'Trailer opening & ending card' },
  { name: 'VerticalCover', aspect: '9:16', export: '1080 × 1920', use: 'Shorts, TikTok, vertical store art' },
  { name: 'WebsiteBanner', aspect: '4:1', export: '1920 × 480', use: 'Website hero / storefront banner' },
  { name: 'StoreCapsule', aspect: '3:4', export: '600 × 800', use: 'Game-store capsule art' },
  { name: 'PressHeader', aspect: '3:1', export: '1920 × 640', use: 'Press-kit headers, fact sheets' },
] as const;
