import type { ReactNode } from 'react';

/** Section wrapper — every guidelines section uses this shell. */
export function Section({
  id,
  index,
  title,
  kicker,
  children,
}: {
  id: string;
  index: string;
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="g-section" aria-labelledby={`${id}-title`}>
      <header className="g-section__head">
        <span className="g-section__index type-data-m">{index}</span>
        <div>
          <p className="g-section__kicker type-data-s">{kicker}</p>
          <h2 id={`${id}-title`} className="g-section__title type-heading-1">
            {title}
          </h2>
        </div>
      </header>
      <div className="g-section__body">{children}</div>
    </section>
  );
}

/** Panel — labeled container. */
export function Panel({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={['g-panel', className].filter(Boolean).join(' ')}>
      {title && <h3 className="g-panel__title type-data-s">{title}</h3>}
      <div className="g-panel__body">{children}</div>
    </div>
  );
}

/** Specimen — dark framed preview area with a corner label. */
export function Specimen({
  label,
  children,
  light = false,
  tall = false,
  row = false,
  className,
}: {
  label: string;
  children: ReactNode;
  light?: boolean;
  tall?: boolean;
  row?: boolean;
  className?: string;
}) {
  return (
    <div className={['g-specimen', light ? 'g-specimen--light' : '', className].filter(Boolean).join(' ')}>
      <span className="g-specimen__label type-data-s">{label}</span>
      <div className={['g-specimen__inner', tall ? 'g-specimen__inner--tall' : '', row ? 'g-specimen__inner--row' : ''].filter(Boolean).join(' ')}>
        {children}
      </div>
    </div>
  );
}

/** Swatch — color chip with name + hex. */
export function Swatch({ name, hex, cssVar }: { name: string; hex: string; cssVar: string }) {
  return (
    <div className="g-swatch">
      <div className="g-swatch__chip" style={{ background: hex }} />
      <p className="g-swatch__name type-data-s text-secondary">{name}</p>
      <p className="g-swatch__hex type-data-s text-muted">
        {hex} · <code>{cssVar}</code>
      </p>
    </div>
  );
}

/** Data table with branded styling. */
export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="g-table-wrap">
      <table className="g-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
