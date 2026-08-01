import { useState } from 'react';
import { Section, Panel, Specimen, DataTable } from '../ui';
import { motionDurations, motionEasing, motionVocabulary, motionRules } from '../../brand/tokens/motion';
import { logoAnimationSteps, reducedMotionFallback, LOGO_ANIMATION_DURATION } from '../../brand/motion/logoAnimation';
import { AnimatedBrandLogo } from '../../brand/components/AnimatedBrandLogo';

/** Tiny SVG preview of a cubic-bezier easing curve. */
function BezierCurve({ name, points }: { name: string; points: [number, number, number, number] }) {
  const [x1, y1, x2, y2] = points;
  const d = `M0,48 C${x1 * 120},${48 - y1 * 48} ${x2 * 120},${48 - y2 * 48} 120,0`;
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <svg className="g-bezier" viewBox="0 0 120 48" aria-hidden="true">
        <line x1="0" y1="48" x2="120" y2="0" stroke="rgba(244,248,255,0.12)" strokeWidth="1" />
        <path d={d} fill="none" stroke="var(--color-emergency-cyan)" strokeWidth="2" />
        <circle cx={x1 * 120} cy={48 - y1 * 48} r="3" fill="var(--color-reactor-orange)" />
        <circle cx={x2 * 120} cy={48 - y2 * 48} r="3" fill="var(--color-reactor-orange)" />
      </svg>
      <span className="type-data-s text-muted">{name}</span>
    </div>
  );
}

export function MotionSection() {
  const [runId, setRunId] = useState(0);
  const [flashOn, setFlashOn] = useState(() => (document.documentElement.dataset.flash ?? 'full') !== 'reduced');

  const toggleFlash = () => {
    const next = !flashOn;
    setFlashOn(next);
    document.documentElement.dataset.flash = next ? 'full' : 'reduced';
  };

  return (
    <Section id="motion" index="06" title="Motion" kicker="Fast, precise, mechanical — the reset protocol in movement">
      <Panel title="DURATION SYSTEM">
        <DataTable
          head={['Name', 'Token', 'Value', 'Spec']}
          rows={[
            ['Micro interaction', '--dur-micro', `${motionDurations.micro}ms`, '80–140 ms'],
            ['Button state', '--dur-button', `${motionDurations.button}ms`, '120–180 ms'],
            ['Panel transition', '--dur-panel', `${motionDurations.panel}ms`, '180–280 ms'],
            ['Major reset transition', '--dur-reset', `${motionDurations.reset}ms`, '500–900 ms'],
            ['Logo intro', '--dur-logo', `${motionDurations.logoIntro}ms`, '2–3 s'],
          ]}
        />
      </Panel>

      <Panel title="EASING CURVES">
        <div className="g-specimen__inner--row" style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <BezierCurve name="out-expo" points={[0.16, 1, 0.3, 1]} />
          <BezierCurve name="out-quart" points={[0.25, 1, 0.5, 1]} />
          <BezierCurve name="in-out-quart" points={[0.76, 0, 0.24, 1]} />
          <BezierCurve name="snap" points={[0.85, 0, 0.15, 1]} />
          <div style={{ display: 'grid', gap: 4 }}>
            <span className="type-data-s text-muted">linear</span>
            <svg className="g-bezier" viewBox="0 0 120 48" aria-hidden="true">
              <line x1="0" y1="48" x2="120" y2="0" stroke="rgba(244,248,255,0.12)" strokeWidth="1" />
              <line x1="0" y1="48" x2="120" y2="0" stroke="var(--color-emergency-cyan)" strokeWidth="2" />
            </svg>
          </div>
        </div>
        <p className="type-body-s text-secondary">
          Tokens: <code className="text-cyan">{motionEasing.outExpo}</code> ·{' '}
          <code className="text-cyan">{motionEasing.outQuart}</code> ·{' '}
          <code className="text-cyan">{motionEasing.inOutQuart}</code> ·{' '}
          <code className="text-cyan">{motionEasing.snap}</code>
        </p>
      </Panel>

      <Panel title="MOTION VOCABULARY">
        <DataTable
          head={['Name', 'Duration', 'Behavior']}
          rows={motionVocabulary.map((v) => [v.name, <code key={v.name}>{v.duration}</code>, v.description])}
        />
        <ul className="g-dna-list">
          {motionRules.map((r) => (
            <li key={r} className="type-body-s text-secondary">
              ✕ {r}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="LOGO INTRO — 2.4 s SEQUENCE">
        <div className="g-grid g-grid--2">
          <Specimen label="LIVE — REPLAY BUTTON BELOW" tall>
            <AnimatedBrandLogo key={runId} variant="primary" duration={LOGO_ANIMATION_DURATION} />
          </Specimen>
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <DataTable
              head={['Step', 'Window', 'What happens']}
              rows={logoAnimationSteps.map((s) => [
                s.name,
                <code key={s.name}>{`${Math.round(s.window[0] * 100)}–${Math.round(s.window[1] * 100)}%`}</code>,
                s.description,
              ])}
            />
            <p className="type-body-s text-secondary">
              Reduced motion: {reducedMotionFallback.description} ({reducedMotionFallback.duration} ms). The logo is
              animated with masks, clips, opacity and supporting lines only — never redrawn or deformed.
            </p>
            <div className="g-toggle-row">
              <button type="button" className="brand-button brand-button--sm" onClick={() => setRunId((n) => n + 1)}>
                ↻ Replay intro
              </button>
              <button
                type="button"
                className="brand-button brand-button--sm"
                aria-pressed={flashOn}
                onClick={toggleFlash}
              >
                Warning flash: {flashOn ? 'ON' : 'REDUCED'}
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </Section>
  );
}
