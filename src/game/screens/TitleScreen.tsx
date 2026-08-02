import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatedBrandLogo } from '../../brand/components/AnimatedBrandLogo';
import { BrandLockup } from '../../brand/components/BrandLockup';
import { ResetRings } from '../../brand/patterns/ResetRings';
import { StatusChip } from '../hud/StatusChip';
import { SlashDivider } from '../hud/SlashDivider';

export type TitleAction = 'new-loop' | 'continue' | 'settings';

const MENU_ITEMS: ReadonlyArray<{ id: TitleAction; label: string; hint: string; primary?: boolean }> = [
  { id: 'new-loop', label: 'New Loop', hint: 'ENTER', primary: true },
  { id: 'continue', label: 'Continue', hint: 'C' },
  { id: 'settings', label: 'Settings', hint: 'S' },
];

export interface TitleScreenProps {
  onSelect?: (action: TitleAction) => void;
  /** Run the logo intro on mount. Default true. */
  animateLogo?: boolean;
  version?: string;
  loopLabel?: string;
  className?: string;
}

/**
 * TitleScreen — premium game title screen.
 * The supplied wordmark is the single focal point, surrounded by
 * generous empty space, subtle Reset Rings and small warnings.
 * The menu is fully keyboard-operable (↑/↓ + Enter) with visible
 * focus rings; selection is never communicated by color alone.
 */
export function TitleScreen({
  onSelect,
  animateLogo = true,
  version = '0.8.0',
  loopLabel = 'LOOP 07',
  className,
}: TitleScreenProps) {
  const [selected, setSelected] = useState(0);
  const [introDone, setIntroDone] = useState(false);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const select = useCallback(
    (index: number) => {
      setSelected(index);
      buttonsRef.current[index]?.focus();
    },
    [],
  );

  const choose = useCallback(
    (index: number) => {
      onSelect?.(MENU_ITEMS[index].id);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        select((selected + 1) % MENU_ITEMS.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        select((selected - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        choose(selected);
      }
    },
    [selected, select, choose],
  );

  // Focus the first item once the intro settles (or immediately when disabled).
  useEffect(() => {
    if (!animateLogo || introDone) {
      buttonsRef.current[0]?.focus({ preventScroll: true });
    }
  }, [animateLogo, introDone]);

  return (
    <div className={['title-screen', className].filter(Boolean).join(' ')}>
      <ResetRings opacity={0.5} className="title-screen__rings" />
      <div className="title-screen__vignette" aria-hidden="true" />

      <header className="title-screen__bar">
        <BrandLockup layout="horizontal" size="sm" wordmarkVariant="white" decorative />
        <StatusChip tone="warning" label={loopLabel} value="T-07:00" />
      </header>

      <main className="title-screen__center">
        {animateLogo ? (
          <AnimatedBrandLogo variant="white" duration={2400} onComplete={() => setIntroDone(true)} />
        ) : (
          <BrandLockup layout="responsive" size="lg" wordmarkVariant="white" align="center" decorative />
        )}

        <p className="title-screen__tagline type-label text-secondary">
          A CITY TRAPPED IN A SEVEN-MINUTE LOOP
        </p>

        <SlashDivider label="MEMORY SURVIVES THE RESET" tone="memory" className="title-screen__divider" />

        <nav className="title-menu" aria-label="Main menu" onKeyDown={handleKeyDown}>
          {MENU_ITEMS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              ref={(el) => {
                buttonsRef.current[i] = el;
              }}
              tabIndex={selected === i ? 0 : -1}
              className={['title-menu__item', selected === i ? 'is-selected' : '', item.primary ? 'title-menu__item--primary' : ''].filter(Boolean).join(' ')}
              data-action={item.id}
              onClick={() => choose(i)}
              onMouseEnter={() => setSelected(i)}
              onFocus={() => setSelected(i)}
            >
              <span className="title-menu__index type-data-s" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="title-menu__label">{item.label}</span>
              <span className="title-menu__hint type-data-s" aria-hidden="true">
                {item.hint}
              </span>
              <span className="title-menu__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </nav>
      </main>

      <footer className="title-screen__foot">
        <span className="type-data-s text-muted">v{version}</span>
        <span className="type-data-s text-muted">© RESET//07 — EVERY SEVEN MINUTES, IT HAPPENS AGAIN</span>
      </footer>
    </div>
  );
}
