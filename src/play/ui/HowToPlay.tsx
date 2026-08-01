/**
 * RESET//07 — how to play (controls adapt to input mode) + credits.
 */

interface Props {
  onClose: () => void;
  inputMode: 'kb' | 'touch';
}

export function HowToPlay({ onClose, inputMode }: Props) {
  const kb = inputMode === 'kb';
  const rows: Array<[string, string]> = kb
    ? [
        ['MOVE', 'WASD / ARROW KEYS'],
        ['AIM', 'MOUSE'],
        ['FIRE', 'HOLD LEFT MOUSE'],
        ['DASH', 'SPACE — brief invulnerability'],
        ['INTERACT', 'E — hold for capsules & relays'],
        ['OVERDRIVE', 'Q — slow time, mark enemies, faster fire'],
        ['PAUSE', 'ESC'],
      ]
    : [
        ['MOVE', 'LEFT JOYSTICK'],
        ['AIM + FIRE', 'DRAG RIGHT SIDE — auto-fires at targets'],
        ['DASH', 'DASH BUTTON'],
        ['INTERACT', 'OPEN BUTTON — hold for capsules & relays'],
        ['OVERDRIVE', 'OVERDRIVE BUTTON'],
        ['PAUSE', '❚❚ BUTTON'],
      ];
  return (
    <div className="modal-backdrop">
      <div className="modal panel howto">
        <h2 className="type-display">HOW TO PLAY</h2>
        <p className="type-ui-s text-secondary howto__lede">
          You are K-07. The city resets every seven minutes. Your memory persists. Fight machines, rescue civilians, recover fragments, and decide what the loop is for.
        </p>
        <div className="howto__grid">
          <div className="howto__col">
            <span className="type-data-xs text-muted">CONTROLS</span>
            <table className="howto__table">
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k}>
                    <td className="type-data-xs">{k}</td>
                    <td className="type-ui-s text-secondary">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="howto__col">
            <span className="type-data-xs text-muted">TACTICS</span>
            <ul className="howto__list type-ui-s text-secondary">
              <li>Vehicles, fuel tanks and pipes explode. Chain them.</li>
              <li>Water conducts electricity — transformers turn puddles into weapons.</li>
              <li>Shield units only block from the front. Flank them, or zap them.</li>
              <li>Detonator drones are bombs on legs. Shoot them near enemies.</li>
              <li>Dash gives a moment of invulnerability. Abuse it.</li>
              <li>Overdrive fills through combat, rescues and chain reactions.</li>
              <li>Memories persist between loops. Routes, codes and truths unlock.</li>
              <li>Not everything can be saved in seven minutes. Choose.</li>
            </ul>
          </div>
        </div>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          BACK
        </button>
      </div>
    </div>
  );
}

export function CreditsScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal panel credits">
        <h2 className="type-display">CREDITS</h2>
        <div className="credits__block">
          <span className="type-data-xs text-muted">RESET//07 — A CITY TRAPPED IN A SEVEN-MINUTE LOOP</span>
          <span className="type-ui-s">DESIGN · CODE · ART · SOUND</span>
          <span className="type-data-xs text-muted">ALL ASSETS GENERATED PROCEDURALLY IN-ENGINE</span>
          <span className="type-data-xs text-muted">ALL AUDIO SYNTHESIZED WITH WEB AUDIO</span>
        </div>
        <div className="credits__block">
          <span className="type-data-xs text-muted">STACK</span>
          <span className="type-ui-s text-secondary">TypeScript · Phaser 3 · React 18 · Vite</span>
          <span className="type-ui-s text-secondary">Fonts: Chakra Petch / Be Vietnam Pro / IBM Plex Mono (OFL)</span>
        </div>
        <div className="credits__block">
          <span className="type-data-xs text-muted">THANKS FOR PLAYING</span>
          <span className="type-ui-s text-secondary">The city remembers you. That was always the point.</span>
        </div>
        <button type="button" className="btn btn--primary" onClick={onClose}>
          BACK
        </button>
      </div>
    </div>
  );
}
