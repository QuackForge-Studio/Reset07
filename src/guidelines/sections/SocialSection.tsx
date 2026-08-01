import { Section, Panel } from '../ui';
import {
  SocialAvatar,
  SocialPost,
  YouTubeThumbnail,
  TrailerTitleCard,
  VerticalCover,
  WebsiteBanner,
  StoreCapsule,
  PressHeader,
  SOCIAL_SPECS,
} from '../../brand/layouts/SocialTemplates';

export function SocialSection() {
  return (
    <Section id="social" index="08" title="Social & store" kicker="Editable layout templates — never baked rasters">
      <div className="g-grid g-grid--2">
        <Panel title="SOCIAL AVATAR 1:1">
          <SocialAvatar />
        </Panel>
        <Panel title="SOCIAL POST 1:1">
          <SocialPost />
        </Panel>
        <Panel title="YOUTUBE THUMBNAIL 16:9">
          <YouTubeThumbnail />
        </Panel>
        <Panel title="TRAILER TITLE CARD 16:9">
          <TrailerTitleCard />
        </Panel>
      </div>

      <div className="g-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 'var(--space-5)' }}>
        <Panel title="VERTICAL COVER 9:16">
          <VerticalCover style={{ aspectRatio: '9/16' }} />
        </Panel>
        <Panel title="WEBSITE BANNER 4:1">
          <WebsiteBanner style={{ aspectRatio: '4/1' }} />
        </Panel>
        <Panel title="STORE CAPSULE 3:4">
          <StoreCapsule style={{ aspectRatio: '3/4' }} />
        </Panel>
      </div>

      <Panel title="PRESS HEADER 3:1">
        <PressHeader style={{ aspectRatio: '3/1' }} />
      </Panel>

      <Panel title="EXPORT SPECS">
        <div className="g-table-wrap">
          <table className="g-table">
            <thead>
              <tr>
                <th>Template</th>
                <th>Aspect</th>
                <th>Raster export</th>
                <th>Use</th>
              </tr>
            </thead>
            <tbody>
              {SOCIAL_SPECS.map((s) => (
                <tr key={s.name}>
                  <td>
                    <code className="text-cyan">{s.name}</code>
                  </td>
                  <td>{s.aspect}</td>
                  <td>{s.export}</td>
                  <td>{s.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="type-body-s text-secondary">
          These are <strong className="text-primary">editable template components</strong> — update the copy or
          swap the lockup, then export at the target size. They automatically reflect the real logo once the
          supplied assets replace the placeholders.
        </p>
      </Panel>
    </Section>
  );
}
