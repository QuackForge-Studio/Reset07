/**
 * RESET//07 — compact radio dialogue panel. Auto-hides; choices render as
 * two actions (challenge / comply).
 */

import type { HudSnapshot } from '../bridge';
import { api } from '../bridge';

export function DialoguePanel({ snap }: { snap: HudSnapshot }) {
  const d = snap.dialogue;
  if (!d) return null;
  // during boss fights the panel moves to the top so it never covers the action
  const top = !!snap.boss;
  return (
    <div className={`dlg ${top ? 'dlg--boss ' : ''}dlg--${d.speaker === 'MARA' ? 'mara' : d.speaker === 'CORE GUARDIAN' ? 'guardian' : d.speaker === 'ELI' ? 'eli' : 'system'}`}>
      <div className="dlg__wave" aria-hidden>
        {[0.9, 0.5, 0.8, 0.35, 0.7, 0.45, 0.6].map((h, i) => (
          <span key={i} style={{ height: `${h * 100}%`, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <div className="dlg__body">
        <span className="type-data-xs dlg__speaker">{d.speaker}</span>
        <p className="type-ui-s dlg__text">{d.text}</p>
        {d.choice && (
          <div className="dlg__choices">
            <button type="button" className="dlg__choice" onClick={() => api.chooseDialogue('a')}>
              {d.choice!.a}
            </button>
            <button type="button" className="dlg__choice dlg__choice--soft" onClick={() => api.chooseDialogue('b')}>
              {d.choice!.b}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
