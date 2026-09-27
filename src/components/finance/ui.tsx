import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { TIERS, type Source, type Tier } from '../../graph/schema';
import { hostOf, tsv, responseText, type Lens, type TsvMeta, ASOF, RUN, FLEET_NAME } from '../../data/financeView';

/**
 * Presentation primitives for /finance. They exist because the shared Editorial ones
 * encode things this page must not: TierChip upper-cases the tier word, Cite renders
 * nothing for an empty source list (which reads as "no citation needed"), and
 * DataTable has no caption line, export or per-row scope for its controls.
 */

// ---------------------------------------------------------------------------
// Page context: announce through the one live region; the active lens and filters
// ---------------------------------------------------------------------------

export interface PageCtx {
  announce: (msg: string) => void;
  lens: Lens;
  /** The active-filter string for captions and exports ('' when none). */
  filters: string;
  /** Open a record (writes `rec`) and remember the control that asked, for focus return. */
  openRecord: (id: string, opener: HTMLElement | null) => void;
  /** "Show connections" (writes focus, hops, sel) and scrolls to the graph. */
  showConnections: (id: string, opener: HTMLElement | null) => void;
  /** Write page params with replace. */
  patch: (kv: Record<string, string | null>) => void;
  /** A search string for an in-page link with some params changed. */
  hrefWith: (kv: Record<string, string | null>) => string;
  narrow: boolean;
  /** The whole module is empty: every surface reads "Nothing recorded yet." */
  empty: boolean;
  /**
   * An in-page narrowing of ProjectList to a set of records (a flow band, or the census
   * records placed by neither rule). Not a URL param (spec §5.1.2): it is a reading aid
   * shown as a removable chip, and every filter that changes the view clears nothing.
   */
  listFocus: ListFocus | null;
  setListFocus: (x: ListFocus | null) => void;
}
export interface ListFocus { label: string; ids: Set<string> }
export const Page = createContext<PageCtx>({
  announce: () => {}, lens: 'loans', filters: '', openRecord: () => {}, showConnections: () => {}, patch: () => {}, hrefWith: () => '', narrow: false, empty: false,
  listFocus: null, setListFocus: () => {},
});
export const usePage = () => useContext(Page);

export const NOTHING = 'Nothing recorded yet.';

/**
 * The page's one focus ring: a solid 2 px accent outline (8.76:1 on the page). It names
 * the outline style itself, because under Tailwind v4 `outline-none` beside
 * `focus-visible:outline-2` reads the style back from a variable `outline-none` has set
 * to none, and the ring silently disappears (A11Y-005 S1, M6).
 */
export const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-accent';
/** The same ring for an element the page moves focus to (a caption, a heading): drawn tight, with no box of its own. */
export const TARGET_RING = 'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-accent';

/**
 * A wide table's scroll box. When its content is wider than the box it is a named
 * region and one tab stop, so the arrow keys scroll the columns no control reaches
 * (A11Y-005 M4); when it is not, it is neither, so a box that does not scroll is never a
 * stop. Below 640 px the phone layout owns the tables (§12: cards, and a scrolling
 * region only where the spec keeps one), so the box scrolls by touch there and claims
 * no region of its own. Either way the page itself never scrolls sideways (S2).
 */
export function ScrollBox({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  const { narrow } = usePage();
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => setOver(el.scrollWidth > el.clientWidth + 1);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    for (const c of el.children) ro.observe(c);
    check();
    return () => ro.disconnect();
  });
  const reg = over && !narrow;
  return (
    <div ref={ref} role={reg ? 'region' : undefined} aria-label={reg ? label : undefined} tabIndex={reg ? 0 : undefined}
      data-scrollbox="" className={`overflow-x-auto min-w-0 ${reg ? FOCUS_RING : ''} ${className}`}>
      {children}
    </div>
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
// Words and marks
// ---------------------------------------------------------------------------

const TIER_TONE: Record<Tier, string> = {
  documented: 'text-sage border-sage/50',
  reported: 'text-blue border-blue/50',
  alleged: 'text-amber border-amber/50',
  analytic: 'text-text-muted border-border-light',
};

/** The tier as its own lowercase word, carrying its definition, never transformed by CSS. */
export function TierWord({ tier }: { tier: Tier }) {
  return <span data-tier={tier} title={TIERS[tier].bar} className={`inline-block font-mono text-[11px] px-1.5 border rounded leading-5 ${TIER_TONE[tier]}`}>{tier}</span>;
}

/** A dash swatch: the tier's own strokeDasharray, the one channel that survives greyscale. */
export function Dash({ tier, w = 22 }: { tier: Tier; w?: number }) {
  return (
    <svg width={w} height="8" aria-hidden="true" className="inline-block align-middle">
      <line x1="1" y1="4" x2={w - 1} y2="4" stroke="currentColor" strokeWidth="1.8" strokeDasharray={TIERS[tier].dash || undefined} />
    </svg>
  );
}

/** Sources in full, each its own link named by its record; an empty list says so in amber. */
export function Src({ srcs, of, inline }: { srcs: Source[] | null | undefined; of: string; inline?: boolean }) {
  if (!srcs || !srcs.length) return <span className="font-mono text-[12px] text-amber">no source in file</span>;
  if (inline) {
    return (
      <span className="text-[12.5px] leading-snug">
        {srcs.map(([label, url], i) => (
          <span key={`${url}${i}`}>{i > 0 ? ' · ' : ''}<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Cite ${of}: ${label}${srcs.length > 1 ? ` (${i + 1} of ${srcs.length})` : ''}`}
            className="underline underline-offset-2 decoration-border-light hover:text-accent break-words">{label}</a></span>
        ))}
      </span>
    );
  }
  return (
    <ul className="list-none p-0 m-0 space-y-0.5">
      {srcs.map(([label, url], i) => (
        <li key={`${url}${i}`} className="text-[12.5px] leading-snug">
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Cite ${of}: ${label}${srcs.length > 1 ? ` (${i + 1} of ${srcs.length})` : ''}`}
            className="underline underline-offset-2 decoration-border-light hover:text-accent break-words">{label}</a>
          <span className="font-mono text-[11px] text-text-muted break-all">{` ${hostOf(url)}`}</span>
        </li>
      ))}
    </ul>
  );
}

/** Research text shown verbatim, in the body colour, never re-read as one of the page's own figures. */
export function Q({ children }: { children: ReactNode }) {
  if (typeof children === 'string' && /^[\s—–-]*$/.test(children)) return <>not stated</>;
  return <span className="fin-q">{children}</span>;
}

/**
 * A claim's response in a table or card cell, through the same wrapper as the claim's own
 * text, so a denial never reads dimmer than what it answers (§8.2-8). Empty prints the
 * exact no-response sentence.
 */
export function ResponseCell({ id }: { id: string | undefined }) {
  return <span className="fin-q">{responseText(id)}</span>;
}

/** A caption that states what a graphic cannot show: body size, left rule, 72ch — a finding, not a footnote. */
export function Caption({ id, cap, children, as = 'p' }: { id: string; cap?: string; children: ReactNode; as?: 'p' | 'figcaption' }) {
  const cls = 'text-[14px] leading-relaxed text-text-secondary border-l-2 border-border-light pl-3 max-w-[72ch] my-3';
  if (as === 'figcaption') return <figcaption id={id} data-caption={cap} data-page-copy="" className={cls}>{children}</figcaption>;
  return <p id={id} data-caption={cap} data-page-copy="" className={cls}>{children}</p>;
}

/**
 * `{N} → {k}` beside a control. The arrow is aria-hidden and the words sit in a
 * separate described-by element, so a screen reader hears "from N to k" and the
 * visible effect text stays exactly what the eye reads.
 */
export function Effect({ n, k, tail, className = '' }: { n: number; k: number; tail: string; className?: string }) {
  const id = `eff-${useId().replace(/:/g, '')}`;
  return (
    <span className={`font-mono text-[11px] text-text-muted ${className}`}>
      <span data-effect="" aria-describedby={id}>{n} <span aria-hidden="true">→</span> {k} {tail}</span>
      <span id={id} className="sr-only">{`from ${n} to ${k} ${tail}`}</span>
    </span>
  );
}

/** Row-level controls live in their own list, so a repeated verb is named once per row, never twice in one scope. */
export function RowActions({ children }: { children: ReactNode }) {
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return <ul className="list-none p-0 m-0 flex flex-wrap gap-x-2 gap-y-1">{items.map((c, i) => <li key={i}>{c}</li>)}</ul>;
}

export function LinkButton({ children, onClick, label, className = '' }: { children: ReactNode; onClick: (el: HTMLButtonElement) => void; label?: string; className?: string }) {
  return (
    <button type="button" aria-label={label} onClick={(e) => onClick(e.currentTarget)}
      className={`text-left underline underline-offset-2 decoration-border-light hover:text-accent ${FOCUS_RING} ${className}`}>
      {children}
    </button>
  );
}

/** "Open record: {lab}" with the visible verb only. */
export function OpenRecord({ id, lab, children }: { id: string; lab: string; children?: ReactNode }) {
  const { openRecord } = usePage();
  return <LinkButton label={`Open record: ${lab}`} onClick={(el) => openRecord(id, el)}>{children ?? 'Open record'}</LinkButton>;
}
/** "Show connections for {label}" with the entity's name as the visible text. */
export function Connect({ id, label, children }: { id: string; label: string; children?: ReactNode }) {
  const { showConnections } = usePage();
  return <LinkButton label={`Show connections for ${label}`} onClick={(el) => showConnections(id, el)}>{children ?? label}</LinkButton>;
}

// ---------------------------------------------------------------------------
// Tables and twins
// ---------------------------------------------------------------------------

export interface Col { key: string; label: string; th?: boolean }
export interface Row { cells: ReactNode[]; out: (string | number | null | undefined)[]; attrs?: Record<string, string>; current?: boolean }

/** The caption line every table carries: rows, population, filters, as-of and run. */
export function captionLine(n: number, population: string, lens: Lens, filters: string, extra?: string) {
  return `${n} rows · ${population} · filters: ${filters || 'none'}${extra ? ` · ${extra}` : ''} · as of ${ASOF[lens] ?? 'not promoted'} · ${RUN[lens]}`;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/tab-separated-values' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/** Copy as TSV and Download .tsv for one table; the export is built from the rows the table shows. */
export function Exports({ name, twin, meta, header, rows }: { name: string; twin: string; meta: TsvMeta; header: string[]; rows: () => (string | number | null | undefined)[][] }) {
  const { announce, lens } = usePage();
  const text = () => tsv(meta, header, rows());
  return (
    <div className="flex flex-wrap gap-2 my-2">
      <button type="button" className="font-mono text-[12px] px-2 py-1 border border-border-light rounded hover:text-accent"
        onClick={async () => {
          try { await navigator.clipboard.writeText(text()); announce(`${name} copied, ${meta.rows} rows`); }
          catch { announce('Copy refused by the browser: use Download instead'); }
        }}>
        {`Copy as TSV — ${name}`}
      </button>
      <button type="button" className="font-mono text-[12px] px-2 py-1 border border-border-light rounded hover:text-accent"
        onClick={() => download(`finance-${lens}-${slug(twin)}-${ASOF[lens] ?? 'unpromoted'}-${RUN[lens]}.tsv`, text())}>
        {`Download .tsv — ${name}, ${meta.rows} rows`}
      </button>
    </div>
  );
}

/** The rows as a real table: caption, scoped headers, cells. */
export function Table({ id, caption, cols, rows, describedBy, captionRef, sortCol, className = '' }: {
  id?: string; caption: string; cols: Col[]; rows: Row[]; describedBy?: string; captionRef?: (el: HTMLTableCaptionElement | null) => void; sortCol?: string; className?: string;
}) {
  return (
    <table id={id} aria-describedby={describedBy} className={`w-full border-collapse text-[13.5px] ${className}`}>
      <caption ref={captionRef} tabIndex={-1} className={`text-left text-[12.5px] text-text-muted pb-2 ${TARGET_RING}`}>{caption}</caption>
      <thead>
        <tr>
          {cols.map((c) => (
            <th key={c.key} scope="col" aria-sort={sortCol === c.key ? 'descending' : undefined}
              className="text-left font-mono text-[11px] tracking-wide text-text-muted border-b border-border-light pb-2 pr-3 font-medium align-bottom">{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} {...(r.attrs ?? {})} aria-current={r.current ? 'true' : undefined} data-selected={r.current ? '' : undefined}
            className={`align-top ${r.current ? 'bg-accent/[0.07]' : ''}`}>
            {r.cells.map((cell, j) => (cols[j]?.th
              ? <th key={j} scope="row" className="text-left font-normal border-b border-border py-2 pr-3 text-text">{cell}</th>
              : <td key={j} className="border-b border-border py-2 pr-3 text-text-secondary">{cell}</td>))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The same rows as cards below 640px: one <dl> per row, every field, the response under the claim at the same size. */
export function Cards({ cols, rows, caption }: { cols: Col[]; rows: Row[]; caption: string }) {
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-text-muted">{caption}</p>
      {rows.map((r, i) => (
        <dl key={i} {...(r.attrs ?? {})} className="border border-border rounded p-3 grid gap-1 text-[14px]">
          {r.cells.map((cell, j) => (
            <div key={j} className="min-w-0">
              <dt className="font-mono text-[12px] text-text-muted">{cols[j]?.label}</dt>
              <dd className="m-0 text-[14px] text-text-secondary break-words min-w-0">{cell}</dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}

/**
 * A table twin: a <details data-twin> whose summary names its graphic and its rows.
 * A closed twin exposes nothing (the browser does not render its content), its
 * controls are tabbable exactly when it is open, and its content is drawn only once
 * it has been opened, so a long twin costs nothing until a reader asks for it.
 */
export function Twin({ twin, title, rowCount, open, onToggle, children, eager = false }: {
  twin: string; title: string; rowCount: number; open: boolean; onToggle?: (open: boolean) => void; children: () => ReactNode; eager?: boolean;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(open);
  const [shown, setShown] = useState(open || eager);
  useEffect(() => { setIsOpen(open); if (open) setShown(true); }, [open]);
  // A skip link opens the twin and focuses its caption in the same event, so the content
  // is committed synchronously first (openTwinAndFocus dispatches this event).
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const on = () => flushSync(() => { setShown(true); setIsOpen(true); });
    d.addEventListener('fin-open', on);
    return () => d.removeEventListener('fin-open', on);
  }, []);
  const toggle = useCallback(() => {
    const o = !!ref.current?.open;
    setIsOpen(o);
    if (o) setShown(true);
    onToggle?.(o);
  }, [onToggle]);
  return (
    <details ref={ref} data-twin={twin} id={`twin-${twin}`} open={isOpen} onToggle={toggle} className="mt-3 min-w-0">
      <summary className="cursor-pointer text-[13.5px] text-text-secondary hover:text-text">{`${title} as a table · ${rowCount} rows`}</summary>
      <div className="mt-2 min-w-0">{shown || isOpen ? children() : null}</div>
    </details>
  );
}

/** Open a twin by name and move focus to its caption (skip links, "show them all"). */
export function openTwinAndFocus(twin: string) {
  const d = document.querySelector<HTMLDetailsElement>(`details[data-twin="${twin}"]`);
  if (!d) return;
  d.dispatchEvent(new Event('fin-open'));
  if (!d.open) d.open = true;
  const now = d.querySelector<HTMLElement>('caption');
  if (now) { now.focus(); return; }
  const focusCaption = (tries: number) => {
    const c = d.querySelector<HTMLElement>('caption');
    if (c) { c.focus(); return; }
    if (tries > 0) requestAnimationFrame(() => focusCaption(tries - 1));
  };
  requestAnimationFrame(() => focusCaption(20));
}

/** "Skip to the table" before a graphic: opens its twin and moves focus to the twin's caption. */
export function SkipLinks({ twins }: { twins: { twin: string; title: string }[] }) {
  return (
    <p className="flex flex-wrap gap-x-3 text-[12px] font-mono my-1">
      {twins.map((t) => (
        <a key={t.twin} href={`#twin-${t.twin}`} aria-label={`Skip to the table: ${t.title}`}
          className="text-text-muted underline underline-offset-2 hover:text-accent"
          onClick={(e) => { e.preventDefault(); openTwinAndFocus(t.twin); }}>
          Skip to the table
        </a>
      ))}
    </p>
  );
}

/** An in-page anchor that scrolls instead of navigating: under HashRouter a bare `#id` would be read as a route. */
export function Anchor({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={`#${to}`} className={`underline underline-offset-2 hover:text-accent ${className}`}
      onClick={(e) => { e.preventDefault(); document.getElementById(to)?.scrollIntoView({ block: 'start', behavior: 'auto' }); }}>
      {children}
    </a>
  );
}

/** A section heading line with its denominator, as the house prints it. */
export function Denominator({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[12px] text-text-muted tracking-wide mb-4 max-w-[90ch]">{children}</p>;
}

export function runLine(lens: Lens) {
  return `${FLEET_NAME[lens]} ${RUN[lens]}`;
}
