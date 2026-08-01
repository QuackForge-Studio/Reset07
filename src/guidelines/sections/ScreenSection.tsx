import { Section, Panel } from '../ui';
import { LoadingScreenDemo } from '../../game/screens/LoadingScreen';
import { TitleScreen, type TitleAction } from '../../game/screens/TitleScreen';
import { CountdownTimer } from '../../game/hud/CountdownTimer';
import { SegmentedRing } from '../../game/hud/SegmentedRing';
import { StatusChip } from '../../game/hud/StatusChip';
import { SlashDivider } from '../../game/hud/SlashDivider';
import { TimingLine } from '../../game/hud/TimingLine';
import { useNow } from '../../brand/patterns/shared';

export function ScreenSection() {
  const now = useNow(1000);
  const seconds = 420 - Math.floor((now / 1000) % 420); // 07:00 → 00:00 loop
  const critical = seconds <= 30;

  return (
    <Section id="screens" index="07" title="Screens & HUD" kicker="Loading, title screen, and the in-game HUD language">
      <Panel title="LOADING SCREEN — LIVE (SELF-RUNNING DEMO)">
        <div className="g-frame g-frame--16x9">
          <LoadingScreenDemo loop />
        </div>
        <p className="type-body-s text-secondary">
          Core Black · supplied icon <em>static</em> in a segmented countdown ring (the ring segments and sweep arc
          move, never the icon) · Memory Trace pattern · status + percentage · bottom-edge timing line. Works in
          portrait and landscape with safe-area insets.
        </p>
      </Panel>

      <Panel title="TITLE SCREEN — INTERACTIVE (KEYBOARD: ↑/↓ + ENTER)">
        <div className="g-frame g-frame--16x9">
          <TitleScreen animateLogo onSelect={(action: TitleAction) => setLastAction(action)} />
        </div>
        <p className="type-body-s text-secondary">
          The supplied wordmark is the single focal point — no HUD crowding, no particles over the logo. Subtle
          Reset Rings behind, one Reactor Orange accent, Emergency Cyan selection states. Logo intro plays once,
          then stays completely static.
        </p>
      </Panel>

      <Panel title="HUD LANGUAGE — NO PERMANENT FULL LOGO IN COMBAT">
        <div className="g-specimen__inner--row" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <CountdownTimer seconds={seconds} criticalAt={30} size="xl" />
          <SegmentedRing progress={seconds / 420} segments={7} size={72} tone={critical ? 'warning' : 'memory'} />
          <SegmentedRing progress={0.14} segments={7} size={72} tone="corruption" />
          <div style={{ display: 'grid', gap: 10 }}>
            <StatusChip tone="memory" label="Memory trace" value="07" />
            <StatusChip tone="warning" label="Loop critical" value="T-00:29" />
            <StatusChip tone="corruption" label="Unstable" value="SEG 2" />
            <StatusChip tone="success" label="Nominal" value="OK" />
          </div>
        </div>
        <SlashDivider label="SEGMENTED TIMER + SLASH DIVIDERS + TIMING LINES" />
        <TimingLine width="60%" tone="warning" />
        <p className="type-body-s text-secondary">
          In combat the brand lives in countdown typography, segmented rings, cyan memory states, orange criticals,
          magenta corruption events and slash dividers. The full logo appears only on pause / transition screens.
          State is never color-only: chips always carry a label, timers carry text.
        </p>
      </Panel>
    </Section>
  );
}

function setLastAction(action: TitleAction) {
  console.info('[RESET//07 title] selected:', action);
}
