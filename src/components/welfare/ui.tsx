import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Source, Tier } from '../../graph/schema';
import { hostOf } from '../../data/welfareView';

/**
 * Small presentation primitives for /welfare.
 *
 * They exist because the shared Editorial primitives encode two things this page
 * must not: TierChip upper-cases the tier (so the word a reader and a screen reader
 * meet is not the word in the data), and Cite renders nothing for an empty source
 * list — which reads as "no citation needed" rather than "no source in file".
 */

/**
 * False inside a closed table twin. A closed twin stays readable to assistive
 * technology (see the page's stylesheet) but is not on screen, so nothing inside it
 * may take keyboard focus: a focus ring on an invisible control is a trap.
 */
export const Tabbable = createContext(true);

/**
 * In-page links to another view of this page (`?st=`, `?s=`). A router Link resolves
 * its href by searching the whole document for a <base> element, and this page
 * renders thousands of them; one shared navigate keeps a filter change interactive.
 */
export const Go = createContext<(search: string) => void>(() => {});
export function QLink({ search, children, className = '', tabIndex }: { search: string; children: ReactNode; className?: string; tabIndex?: number }) {
  const go = useContext(Go);
  return (
    <a
      href={`#/welfare${search}`}
      tabIndex={tabIndex}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        go(search);
      }}
    >
      {children}
    </a>
  );
}
export const useTab = () => (useContext(Tabbable) ? undefined : -1);

const TIER_TONE: Record<Tier, string> = {
  documented: 'text-sage border-sage/50',
  reported: 'text-blue border-blue/50',
  alleged: 'text-amber border-amber/50',
  analytic: 'text-text-muted border-border-light',
};

/** The tier as its own word, lowercase, never transformed by CSS. */
export function TierWord({ tier }: { tier: Tier }) {
  return <span className={`inline-block font-mono text-[11px] px-1.5 border rounded leading-5 ${TIER_TONE[tier]}`}>{tier}</span>;
}

/** Sources in full, with the host in mono so a reader sees whether a source is primary without hovering; an empty list says so in amber. */
export function Src({ srcs, block }: { srcs: Source[] | null | undefined; block?: boolean }) {
  const tab = useTab();
  if (!srcs || !srcs.length) return <span className="font-mono text-[12px] text-amber">no source in file</span>;
  return (
    <span className={`${block ? 'block mt-1' : ''} text-[12.5px] leading-snug`}>
      {srcs.map(([label, url], i) => (
        <span key={`${url}${i}`} className="inline">
          {i > 0 ? ' · ' : ''}
          <a href={url} tabIndex={tab} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-border-light hover:text-accent break-words">{label}</a>
          <span className="font-mono text-[11px] text-text-muted break-all">{` ${hostOf(url)}`}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * Research text shown verbatim. It is the file's wording, not the page's, so it is
 * marked as a quotation (without drawn quote marks) and is never restyled, re-spelt
 * or re-read as one of the page's own figures.
 */
export function Verbatim({ children }: { children: ReactNode }) {
  // A research field holding only a dash records nothing; it reads as absent, never as a glyph.
  if (typeof children === 'string' && /^[\s—–-]*$/.test(children)) return <>not stated</>;
  return <q className="[quotes:none]">{children}</q>;
}

/** A caption that states what a graphic cannot honestly show: body size, left rule, 72ch — a finding, not a footnote. */
export function Caption({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return (
    <p data-caption={id} className={`text-[14px] leading-relaxed text-text-secondary border-l-2 border-border-light pl-3 max-w-[72ch] my-3 ${className}`}>
      {children}
    </p>
  );
}

/** A list behind a disclosure: the rows a count was computed from. */
export function ListDetails({ summary, items, className = '' }: { summary: ReactNode; items: ReactNode[]; className?: string }) {
  return (
    <details className={`text-[13px] ${className}`}>
      <summary tabIndex={useTab()} className="cursor-pointer text-text-muted hover:text-text font-mono text-[12px]">{summary}</summary>
      <ul className="mt-1.5 mb-2 space-y-1 pl-3 border-l border-border-light">
        {items.map((it, i) => <li key={i} className="text-text-secondary leading-snug">{it}</li>)}
      </ul>
    </details>
  );
}

const NARROW = '(max-width: 639px)';

/** Below 640px. Read synchronously on first render so a phone never paints the desktop layout first. */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

// ---------------------------------------------------------------------------
// TableBlock — caption line, export, labelled scroll region
// ---------------------------------------------------------------------------

export interface TableCtx {
  /** The active-filter string that applies to this table, or '' for none. */
  filters: string;
  yearText: string;
  asOfLabel: string;
  asOf: string;
  runId: string;
  announce: (msg: string) => void;
}

export interface Col {
  /** snake_case machine key for the export header. */
  key: string;
  label: string;
  /** Render this column's cells as row headers. */
  th?: boolean;
}

export interface Row {
  cells: ReactNode[];
  /** Plain values for the export, one per column. */
  out: (string | number | null)[];
  urls: string[];
  className?: string;
}

const clean = (v: string | number | null) => (v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' ').trim());

export function captionLine(rows: number, ctx: TableCtx) {
  return `${rows} rows · filters: ${ctx.filters || 'none'} · ${ctx.yearText} · as of ${ctx.asOfLabel} · run ${ctx.runId}`;
}

/**
 * Every twin and section table: the caption line (the first line of any export),
 * Copy as TSV and Download .tsv above the table, and a labelled region that scrolls
 * sideways on its own so the page never does. The export is built from the same
 * rows the table shows, so it cannot drift from them.
 */
export function TableBlock({ name, cols, rows, ctx, caption, empty, minWidth = '34rem' }: {
  name: string;
  cols: Col[];
  rows: Row[];
  ctx: TableCtx;
  /** A table caption proper; when set the region is labelled with it. */
  caption?: string;
  empty?: ReactNode;
  minWidth?: string;
}) {
  const line = captionLine(rows.length, ctx);
  const tab = useTab();
  const tsv = () => {
    const head = [...cols.map((c) => c.key), 'as_of', 'run_id', 'filters', 'source_urls'].join('\t');
    const body = rows.map((r) => [...r.out.map(clean), ctx.asOfLabel, ctx.runId, ctx.filters || 'none', r.urls.length ? r.urls.join('|') : 'no source in file'].join('\t'));
    return [line, head, ...body].join('\n') + '\n';
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tsv());
      ctx.announce(`Table copied, ${rows.length} rows`);
    } catch {
      ctx.announce('Copy failed: the browser refused clipboard access');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([tsv()], { type: 'text/tab-separated-values' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `welfare-${name}-${ctx.asOf}-${ctx.runId}.tsv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (!rows.length && empty) return <div className="my-4 text-[14px] text-text-secondary">{empty}</div>;
  return (
    <div className="my-4 min-w-0">
      <p className="text-[14px] leading-relaxed text-text-secondary border-l-2 border-border-light pl-3">{line}</p>
      <div className="flex flex-wrap gap-2 mt-2">
        <button type="button" tabIndex={tab} onClick={copy} className="font-mono text-[12px] px-2 py-1 border border-border-light rounded hover:text-accent">Copy as TSV</button>
        <button type="button" tabIndex={tab} onClick={download} className="font-mono text-[12px] px-2 py-1 border border-border-light rounded hover:text-accent">Download .tsv</button>
      </div>
      <p className="font-mono text-[12px] text-text-muted mt-2 sm:hidden">{`${cols.length} columns · scroll → for the rest`}</p>
      <div role="region" aria-label={caption ?? line} tabIndex={tab ?? 0} className="overflow-x-auto mt-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent">
        <table className="w-full border-collapse text-[14px]" style={{ minWidth }}>
          {caption && <caption className="text-left text-[13px] text-text-muted pb-2">{caption}</caption>}
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key} scope="col" className="text-left font-mono text-[11px] tracking-wide text-text-muted border-b border-border-light pb-2 pr-4 font-medium align-bottom">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`align-top ${r.className ?? ''}`}>
                {r.cells.map((cell, j) => (cols[j]?.th
                  ? <th key={j} scope="row" className="text-left font-normal border-b border-border py-2.5 pr-4 text-text">{cell}</th>
                  : <td key={j} className="border-b border-border py-2.5 pr-4 text-text-secondary">{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** An in-page anchor that scrolls instead of navigating: under HashRouter a bare `#id` would be read as a route. */
export function HashLink({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={`#${to}`}
      className={`underline underline-offset-2 hover:text-accent ${className}`}
      onClick={(e) => {
        e.preventDefault();
        const el = document.getElementById(to);
        el?.scrollIntoView({ block: 'start', behavior: 'auto' });
      }}
    >
      {children}
    </a>
  );
}

/**
 * A section twin that renders its table only once opened: the claims and the
 * per-action ministers tables run to hundreds of rows, and drawing them unseen on
 * every filter change is what made the page slow to answer a click.
 */
export function LazyTwin({ twin, open, summary, children }: { twin: string; open: boolean; summary: ReactNode; children: () => ReactNode }) {
  const [shown, setShown] = useState(open);
  useEffect(() => { if (open) setShown(true); }, [open]);
  return (
    <details data-twin={twin} open={open} className="mt-4" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setShown(true); }}>
      <summary className="cursor-pointer text-[14px] text-text-secondary">{summary}</summary>
      {shown || open ? children() : null}
    </details>
  );
}

/** A reason line; a unit quoted from the record after "unit not comparable:" stays the record's words. */
export function ReasonText({ text }: { text: string }) {
  const m = /^(unit not comparable: )([\s\S]*)$/.exec(text);
  if (!m) return <>{text}</>;
  return <>{m[1]}<Verbatim>{m[2]}</Verbatim></>;
}
