/**
 * RESET//07 — settings: audio, video, comfort, save. All persisted instantly.
 */

import { useState } from 'react';
import type { SaveData, Settings, EffectsQuality } from '../systems/SaveSystem';
import { t } from '../data/strings';

interface Props {
  save: SaveData;
  onApply: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onReset: () => void;
}

function Slider({
  label, value, onChange, max = 1, step = 0.05,
}: { label: string; value: number; onChange: (v: number) => void; max?: number; step?: number }) {
  return (
    <label className="set-row">
      <span className="type-ui-s set-row__label">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="set-slider"
      />
      <span className="type-data-xs set-row__val">{Math.round(value * 100)}</span>
    </label>
  );
}

function Segmented<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: Array<{ v: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="set-row">
      <span className="type-ui-s set-row__label">{label}</span>
      <div className="set-seg">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            className={`set-seg__btn ${value === o.v ? 'is-active' : ''}`}
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className={`set-row set-toggle ${value ? 'is-on' : ''}`} onClick={() => onChange(!value)}>
      <span className="type-ui-s set-row__label">{label}</span>
      <span className="set-toggle__track">
        <span className="set-toggle__knob" />
      </span>
    </button>
  );
}

export function SettingsPanel({ save, onApply, onBack, onReset }: Props) {
  const s = save.settings;
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (patch: Partial<Settings>) => onApply(patch);

  return (
    <div className="modal-backdrop">
      <div className="modal panel settings">
        <h2 className="type-display">SETTINGS</h2>

        <div className="set-group">
          <span className="type-data-xs text-muted set-group__title">AUDIO</span>
          <Slider label="MASTER" value={s.master} onChange={(v) => set({ master: v })} />
          <Slider label="MUSIC" value={s.music} onChange={(v) => set({ music: v })} />
          <Slider label="SOUND FX" value={s.sfx} onChange={(v) => set({ sfx: v })} />
          <Slider label="DIALOGUE" value={s.dialogue} onChange={(v) => set({ dialogue: v })} />
        </div>

        <div className="set-group">
          <span className="type-data-xs text-muted set-group__title">VIDEO</span>
          <Segmented<EffectsQuality>
            label="EFFECTS QUALITY"
            value={s.effectsQuality}
            options={[
              { v: 'low', label: 'LOW' },
              { v: 'med', label: 'MED' },
              { v: 'high', label: 'HIGH' },
            ]}
            onChange={(v) => set({ effectsQuality: v })}
          />
          <Segmented<'off' | 'low' | 'high'>
            label="CAMERA SHAKE"
            value={s.cameraShake}
            options={[
              { v: 'off', label: 'OFF' },
              { v: 'low', label: 'LOW' },
              { v: 'high', label: 'HIGH' },
            ]}
            onChange={(v) => set({ cameraShake: v })}
          />
          <Segmented<'reduced' | 'full'>
            label="FLASH INTENSITY"
            value={s.flashIntensity}
            options={[
              { v: 'reduced', label: 'REDUCED' },
              { v: 'full', label: 'FULL' },
            ]}
            onChange={(v) => set({ flashIntensity: v })}
          />
          <Toggle label="REDUCED MOTION" value={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} />
          <Toggle label="HIGH-CONTRAST TARGETS" value={s.highContrast} onChange={(v) => set({ highContrast: v })} />
        </div>

        <div className="set-group">
          <span className="type-data-xs text-muted set-group__title">CONTROLS</span>
          <Toggle label="AUTO-AIM" value={s.autoAim} onChange={(v) => set({ autoAim: v })} />
          <Slider label="AIM ASSIST" value={s.aimAssist} onChange={(v) => set({ aimAssist: v })} />
          <button type="button" className="btn btn--ghost" onClick={() => void document.documentElement.requestFullscreen().catch(() => undefined)}>
            FULLSCREEN
          </button>
        </div>

        <div className="set-group">
          <span className="type-data-xs text-muted set-group__title">LANGUAGE</span>
          <Segmented<'en' | 'vi'>
            label="LANGUAGE"
            value={s.lang}
            options={[
              { v: 'en', label: 'EN' },
              { v: 'vi', label: 'VI' },
            ]}
            onChange={(v) => set({ lang: v })}
          />
        </div>

        <div className="set-group">
          <span className="type-data-xs text-muted set-group__title">SAVE DATA</span>
          {!confirmReset ? (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)}>
              RESET SAVE
            </button>
          ) : (
            <div className="set-confirm">
              <span className="type-data-xs">ERASE ALL PROGRESS? THIS CANNOT BE UNDONE.</span>
              <div>
                <button type="button" className="btn btn--danger" onClick={onReset}>
                  ERASE
                </button>
                <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        <button type="button" className="btn btn--primary settings__back" onClick={onBack}>
          {t('set.back')}
        </button>
      </div>
    </div>
  );
}
