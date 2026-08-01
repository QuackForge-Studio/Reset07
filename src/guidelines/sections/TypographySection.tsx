import { Section, Panel, Specimen, DataTable } from '../ui';
import { fontFamilies, typeScale, typeRoles } from '../../brand/tokens/typography';
import type { TypeRole } from '../../brand/tokens/typography';

const SPECIMENS: Record<TypeRole, string> = {
  'display-xl': 'RESET//07',
  'display-l': 'THE CITY RESETS',
  'heading-1': 'New Loop',
  'heading-2': 'Memory Diagnostics',
  'heading-3': 'Loop Parameters',
  'body-l': 'The city remembers what you forget.',
  'body-m': 'Every seven minutes the loop closes. You are the only trace that persists between resets.',
  'body-s': 'Corruption is spreading through the district grid. Hold position until the cycle stabilizes.',
  label: 'NEW LOOP / CONTINUE / SETTINGS',
  caption: 'CAPTION — loop 07 · memory trace 0042 · timestamp 07:00:00',
  'data-xl': '07:00',
  'data-m': 'MEM TRACE 07 // STATUS: NOMINAL',
  'data-s': 'T-07:00 // LOOP 07 // SEG 4/7',
};

export function TypographySection() {
  return (
    <Section id="typography" index="04" title="Typography" kicker="Display, UI, Data — three roles, OFL fonts, bundled locally">
      <Panel title="ROLES — FONT EVALUATION RESULT">
        <div className="g-grid g-grid--3">
          {typeRoles.map((role) => (
            <div key={role.role} className="g-panel" style={{ display: 'grid', gap: 8 }}>
              <span className="type-data-s text-cyan">{role.role.toUpperCase()}</span>
              <span className="type-heading-3" style={{ fontFamily: `var(--font-${role.role})` }}>
                {role.font}
              </span>
              <span className="type-caption">weights {role.weights}</span>
              <p className="type-body-s text-secondary" style={{ margin: 0 }}>
                {role.usage}
              </p>
              <span className="type-data-s text-muted">Vietnamese: {role.vietnamese ? '✓ supported' : '—'}</span>
            </div>
          ))}
        </div>
        <p className="type-body-s text-secondary">
          Chakra Petch won the display evaluation over Oxanium / Sora / Space Grotesk / Rajdhani / Michroma: its
          angular technical cuts carry arcade urgency without imitating the custom logo. Be Vietnam Pro covers
          Vietnamese UI text. IBM Plex Mono is reserved for data — never for long dialogue.
        </p>
      </Panel>

      <Panel title="RESPONSIVE TYPE SCALE">
        {(Object.keys(typeScale) as TypeRole[]).map((role) => (
          <div key={role} className="g-scale-row">
            <div className="g-scale-row__meta">
              <span className="type-data-s text-cyan">{role}</span>
              <span className="type-caption">{typeScale[role].size}</span>
              <span className="type-caption">
                {typeScale[role].family} · {typeScale[role].weight} · lh {typeScale[role].lineHeight}
              </span>
            </div>
            <span className={`type-${role}`} style={{ margin: 0 }}>
              {SPECIMENS[role]}
            </span>
          </div>
        ))}
      </Panel>

      <Panel title="VIETNAMESE SUPPORT CHECK">
        <Specimen label="ALL THREE ROLES RENDER DIACRITICS">
          <div className="g-specimen__inner" style={{ gap: 20, textAlign: 'center' }}>
            <span className="type-heading-2 text-primary">LẶP LẠI BẢY PHÚT</span>
            <span className="type-body-m text-secondary">Thành phố thiết lập lại sau mỗi bảy phút. Ký ức của bạn là thứ duy nhất còn sót lại.</span>
            <span className="type-data-m text-cyan">ĐẾM NGƯỢC: 07:00</span>
          </div>
        </Specimen>
      </Panel>

      <Panel title="SETTING">
        <DataTable
          head={['Token', 'Value']}
          rows={[
            ['--font-display', <code key="fd">{fontFamilies.display}</code>],
            ['--font-ui', <code key="fu">{fontFamilies.ui}</code>],
            ['--font-data', <code key="fda">{fontFamilies.data}</code>],
            ['Line length', '45–65 characters (max-width: 65ch on body text)'],
            ['Essential mobile text', 'never below 0.875rem (type-body-s)'],
          ]}
        />
      </Panel>
    </Section>
  );
}
