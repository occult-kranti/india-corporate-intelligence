import { Fragment, type ReactNode } from 'react';
import { useNarrow, FOCUS } from './hooks';
import { downloadCsv, toCsv } from './csv';

/**
 * The table twin every /energy graphic and list carries.
 *
 * At ≥ 640px it is a table that scrolls sideways inside its own container. Below 640
 * it is ALSO a stack of records — a <dl> per row, every column label as a <dt> — and
 * the table is display:none, so assistive technology reads exactly one form. At 390px
 * a 34rem table shows two columns and puts the sources half a screen to the right;
 * the platform's rule is that sources are never hidden.
 */

export type Cell = ReactNode | { node: ReactNode; title?: string; nodata?: boolean };

const isRich = (c: Cell): c is { node: ReactNode; title?: string; nodata?: boolean } =>
  typeof c === 'object' && c !== null && !Array.isArray(c) && 'node' in (c as object);

export interface Download {
  filename: string;
  /** `#`-prefixed header lines: run id, as-of, filters in words, what the section cannot show. */
  comments: string[];
  columns: string[];
  rows: () => string[][];
  /** The figure on the button, when it is not simply the number of CSV rows. */
  count?: number;
}

/**
 * The platform's no-data hatch, matched to IndiaMap's SVG pattern: a warm gold 1.1px
 * stroke every 7px on #101116. Warm on purpose, so "not measured" can never be read as an
 * empty or zero cell. The angle is 135deg because a CSS gradient angle names the
 * gradient's direction, not the stripe's: 135deg draws the same "/" stripes as the map's
 * vertical lines under rotate(45). A copy, not an import — IndiaMap keeps it inside an
 * SVG <pattern>, so there is no shared constant to use yet.
 */
export const NODATA_STYLE = {
  backgroundColor: '#101116',
  backgroundImage: 'repeating-linear-gradient(135deg, rgba(201,168,108,0.30) 0 1.1px, transparent 1.1px 7px)',
};

export function DownloadButton({ d }: { d: Download }) {
  const n = d.count ?? d.rows().length;
  return (
    <button
      type="button"
      className={`btn-ghost !px-2.5 !py-1 font-mono !text-[11px] ${FOCUS}`}
      onClick={() => downloadCsv(d.filename, toCsv(d.comments, d.columns, d.rows()))}
    >
      Download CSV — {n} rows
    </button>
  );
}

export default function StackTable({
  columns,
  rows,
  caption,
  rowProps,
  download,
  minWidth = '34rem',
}: {
  columns: string[];
  rows: Cell[][];
  caption?: string;
  rowProps?: (i: number) => Record<string, string | undefined>;
  download?: Download;
  minWidth?: string;
}) {
  const narrow = useNarrow();
  const td = (c: Cell, j: number) => {
    const rich = isRich(c);
    return (
      <td
        key={j}
        title={rich ? c.title : undefined}
        data-nodata={rich && c.nodata ? '' : undefined}
        style={rich && c.nodata ? NODATA_STYLE : undefined}
        className="border-b border-border py-2.5 pr-4 text-text-secondary align-top max-w-[36rem] [overflow-wrap:anywhere]"
      >
        {rich ? c.node : c}
      </td>
    );
  };
  return (
    <div className="my-5">
      {download && (
        <div className="mb-2">
          <DownloadButton d={download} />
        </div>
      )}
      <div className="sm:overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px] max-sm:hidden" style={{ minWidth }}>
          {caption && <caption className="text-left font-mono text-[11px] text-text-muted pb-2">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left font-mono text-[10.5px] tracking-[0.04em] text-text-muted border-b border-border-light pb-2 pr-4 font-medium align-bottom"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} {...(rowProps?.(i) ?? {})}>
                {r.map(td)}
              </tr>
            ))}
          </tbody>
        </table>
        {narrow && (
          <div className="sm:hidden [overflow-wrap:anywhere]">
            {caption && <p className="font-mono text-[11px] text-text-muted pb-2">{caption}</p>}
            {rows.map((r, i) => (
              <dl key={i} className="border-t border-border py-2.5 grid grid-cols-1 gap-y-0.5">
                {r.map((c, j) => (
                  <Fragment key={j}>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.11em] text-text-muted">{columns[j]}</dt>
                    <dd
                      className="text-[13.5px] text-text-secondary mb-1.5"
                      title={isRich(c) ? c.title : undefined}
                      data-nodata={isRich(c) && c.nodata ? '' : undefined}
                      style={isRich(c) && c.nodata ? NODATA_STYLE : undefined}
                    >
                      {isRich(c) ? c.node : c}
                    </dd>
                  </Fragment>
                ))}
              </dl>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
