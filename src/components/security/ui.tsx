import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { TIERS, type Source, type Tier } from '../../graph/schema';
import type { StateCode } from '../../graph/schema';
import { type Filters, type BudgetRow, type TsvMeta, tsv, tsvName, hostOf, crContext, fmtCr, lakhLine, rowTier, ASOF, firstSource, ZERO_WORDS, isDeclaredCr, fmtInt, budgetRowFor } from '../../data/securityView';

/**
 * Presentation primitives for /security. The shared Editorial ones encode things this
 * page must not: TierChip upper-cases the tier word, Cite renders nothing for an empty
 * source list (which reads as "no citation needed"), and DataTable has no caption line,
 * no export and no phone form. Finance's twins and exports write finance's provenance,
 * so these are security's own (spec D45, U16).
 */

// ---------------------------------------------------------------------------
// Page context
// ---------------------------------------------------------------------------

export interface PageCtx {
  f: Filters;
  narrow: boolean;
  /** FORCE_META.empty: every surface reads "Nothing recorded yet." */
  empty: boolean;
  /** The active-filter words for captions and exports ('' when none). */
  filterWords: string;
  announce: (msg: string, delay?: number) => void;
  patch: (kv: Record<string, string | null>) => void;
  /** An absolute URL to this page with some params changed (citations, exports). */
  absHref: (kv?: Record<string, string | null>) => string;
  openRecord: (id: string, el: HTMLElement | null) => void;
  showConnections: (id: string, el: HTMLElement | null) => void;
  openCell: (param: string, el: HTMLElement | null) => void;
  openFy: (fy: string, el: HTMLElement | null) => void;
  openBody: (id: string, el: HTMLElement | null) => void;
  openVendor: (id: string, el: HTMLElement | null) => void;
  openCase: (id: string, el: HTMLElement | null) => void;
  selectState: (st: StateCode | null, via: 'pointer' | 'keyboard', el: HTMLElement | SVGElement | null) => void;
  /** The margin panel for the narrow layout, rendered under the component that opened it. */
  inlinePanel: (slot: string) => ReactNode;
  /** Reset every page filter (the rail's Reset and a block's "reset filters"). */
  reset: () => void;
}
export const Page = createContext<PageCtx>(null as unknown as PageCtx);
export const usePage = () => useContext(Page);

const NARROW = '(max-width: 639px)';
/** Below 640px; read synchronously on first render so a phone never paints the desktop layout first. */
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
const WIDE = '(min-width: 1280px)';
export function useWide(): boolean {
  const [w, setW] = useState<boolean>(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setW(mq.matches);
    mq.addEventListener('change', on);
    on();
    return () => mq.removeEventListener('change', on);
  }, []);
  return w;
}

/**
 * The page's one focus ring. It names the outline style itself: under Tailwind v4
 * `outline-none` beside a focus-visible outline reads the style back from a variable
 * that `outline-none` set to none, and the ring disappears.
 */
export const FOCUS = 'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-accent';
export const TARGET = 'focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-accent';
export const H3 = 'text-[16px] sm:text-[15.5px] font-semibold text-text mb-2 leading-snug';
export const MONO = 'font-mono text-[12px] text-text-muted tracking-wide';

// ---------------------------------------------------------------------------
// Words and marks
// ---------------------------------------------------------------------------

const TIER_TONE: Record<Tier, string> = {
  documented: 'text-sage border-sage/50',
  reported: 'text-blue border-blue/50',
  alleged: 'text-amber border-amber/50',
  analytic: 'text-text-muted border-border-light',
};
/** The tier as its own lowercase word, never transformed by CSS, with its definition as a tooltip. */
export function TierWord({ tier }: { tier: Tier }) {
  return <span data-tier={tier} title={TIERS[tier].bar} className={`inline-block font-mono text-[12px] px-1.5 border rounded leading-5 ${TIER_TONE[tier]}`}>{tier}</span>;
}
/** A dash swatch: the tier's own strokeDasharray, the one channel that survives greyscale. Drawing only. */
export function Dash({ tier, w = 22 }: { tier: Tier; w?: number }) {
  return (
    <svg width={w} height="8" aria-hidden="true" className="inline-block align-middle">
      <line x1="1" y1="4" x2={w - 1} y2="4" stroke="currentColor" strokeWidth="1.8" strokeDasharray={TIERS[tier].dash || undefined} />
    </svg>
  );
}

/**
 * Sources in full, each its own link; an empty list says so in amber, never blank. A link
 * is named by the source's own title, and each record's sources are their own list, so two
 * records citing one document never give two same-named links in one list. The title is
 * never copied into an aria-label: it is the publisher's wording, not the page's.
 */
export function Src({ srcs, of, inline }: { srcs: Source[] | [string, string][] | null | undefined; of: string; inline?: boolean }) {
  if (!srcs || !srcs.length) return <span className="font-mono text-[12px] text-amber">no source in file</span>;
  const list = (srcs as [string, string][]).filter(([, u], i, a) => a.findIndex((x) => x[1] === u) === i);
  const link = (label: string, url: string) => {
    const fig = quotedFigure(label);
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" data-cr={fig ?? undefined}
        className={`sec-link underline underline-offset-2 decoration-border-light hover:text-accent break-words ${FOCUS}`}>{label}{fig != null && <span className="sr-only">{QUOTED_CR_NOTE}{rowNote(fig)}</span>}</a>
    );
  };
  if (inline) {
    return (
      <ul className="inline list-none p-0 m-0 text-[12.5px] leading-snug" data-quoted="" data-sources-for={of.slice(0, 80)}>
        {list.map(([label, url], i) => <li key={url} className="inline">{i > 0 ? ' · ' : ''}{link(label, url)}</li>)}
      </ul>
    );
  }
  return (
    <ul className="list-none p-0 m-0 space-y-0.5" data-quoted="" data-sources-for={of.slice(0, 80)}>
      {list.map(([label, url]) => (
        <li key={url} className="text-[12.5px] leading-snug">
          {link(label, url)}<span className="font-mono text-[12px] text-text-muted break-all">{` ${hostOf(url)}`}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Research wording, shown verbatim and marked as quoted so the page's own-words checks
 * skip it. Where the research states a pension share in its own words, the element
 * names the basis this page uses for its own pension share, so a reader never takes the
 * research's figure (of the four-demand total, or of an older year) for the page's (U9).
 */
const PENSION_PCT = /[Pp]ension[^.;]*?\d[\d.]*%/;
const RUPEE_CR = /₹([\d,]+(?:\.\d+)?) cr/g;
/**
 * A ₹ figure inside research wording is the research's, not a figure this page computed.
 * The element that holds it says so in words a reader can check (no denominator is
 * published for it here, and no previous year applies), and carries the figure as its
 * hook value: the one the register also holds as a row or a declared figure where there
 * is one, otherwise the first the wording prints (D4, SG-4).
 */
export function quotedFigure(text: string): number | null {
  const figs = [...text.matchAll(RUPEE_CR)].map((m) => Number(m[1].replace(/,/g, '')));
  if (!figs.length) return null;
  // A figure the register holds as a row hooks to that row's exact value (the wording may round it).
  for (const v of figs) { const r = budgetRowFor(v); if (r) return r.cr; }
  return figs.find(isDeclaredCr) ?? figs[0];
}
export const QUOTED_CR_NOTE = " (₹ in the research's own words: no denominator published for this line on this page; previous year not applicable)";
/** Where the register holds the quoted figure as a budget row, the document that row was read from. */
const rowNote = (v: number) => { const r = budgetRowFor(v); return r ? ` · the register holds ₹${fmtCr(r.cr)} cr as a row (${r.stage}, FY${r.fy}): read to ${ASOF} · document: ${firstSource(r.srcs)}` : ''; };
export function Quote({ children, as = 'span', className = '' }: { children: string | null | undefined; as?: 'span' | 'p' | 'blockquote' | 'div'; className?: string }) {
  const text = children ?? '';
  const Tag = as;
  if (!text.trim() || /^[\s—–-]*$/.test(text)) return <Tag className={className}>not stated</Tag>;
  const note = PENSION_PCT.test(text);
  const fig = quotedFigure(text);
  return (
    <Tag data-quoted="" data-cr={fig ?? undefined} className={`sec-q ${className}`}>
      {text}
      {note && <span className="font-mono text-[12px] text-text-muted">{' [the research\'s own pension share and basis; this page\'s pension share is of published total where the Summary prints one, else of stack, computed here]'}</span>}
      {fig != null && <span className="font-mono text-[12px] text-text-muted">{QUOTED_CR_NOTE}{rowNote(fig)}</span>}
    </Tag>
  );
}

/** A caption that states what a graphic cannot show: body size, left rule, 72ch — a finding, not a footnote. */
export function Caption({ id, cap, children, as = 'p', className = '' }: { id: string; cap: string; children: ReactNode; as?: 'p' | 'figcaption' | 'div'; className?: string }) {
  const cls = `text-[14px] leading-relaxed text-text-secondary border-l-2 border-border-light pl-3 max-w-[72ch] my-3 ${className}`;
  if (as === 'figcaption') return <figcaption id={id} data-caption={cap} data-page-copy="" className={cls}>{children}</figcaption>;
  if (as === 'div') return <div id={id} data-caption={cap} data-page-copy="" className={cls}>{children}</div>;
  return <p id={id} data-caption={cap} data-page-copy="" className={cls}>{children}</p>;
}

/**
 * `{N} → {k}` beside a control. The arrow is aria-hidden and the words "from N to k"
 * sit visually hidden inside the same element, so a screen reader hears the words
 * while the eye reads the arrow (spec §3.5).
 */
export function Effect({ n, k, tail, className = '' }: { n: number; k: number; tail: string; className?: string }) {
  return (
    <span data-effect="" className={`font-mono text-[12px] text-text-muted ${className}`}>
      <span aria-hidden="true">{`${fmtInt(n)} → ${fmtInt(k)} ${tail}`}</span>
      <span className="sr-only">{`from ${n} to ${k} ${tail}`}</span>
    </span>
  );
}
/** An effect line that is a reason, for a control that does not reach the lens. */
export function Reason({ id, children }: { id?: string; children: string }) {
  return <span id={id} data-effect="" className="font-mono text-[12px] text-amber">{children}</span>;
}

/** One ₹ beside its denominator and its comparison, in the same element (D4). */
export function Cr({ row, lead, tail }: { row: BudgetRow; lead?: ReactNode; tail?: ReactNode }) {
  const c = crContext(row);
  const lakh = lakhLine(row);
  return (
    <span data-cr={row.cr} className="sec-cr">
      {lead}
      <span className="font-mono tabular-nums text-text">{row.cr === 0 ? ZERO_WORDS : `₹${fmtCr(row.cr)} cr`}</span>
      <span className="text-text-secondary">{` — ${c.denom} · ${c.compare}`}</span>
      {lakh && <span className="block font-mono text-[12px] text-text-muted">{lakh}</span>}
      {tail}
    </span>
  );
}
/** "read to {asOf} · document: {first source label}" beneath every ₹ in a card (U12). */
export function ReadTo({ srcs }: { srcs: [string, string][] | Source[] }) {
  return <span className="block font-mono text-[12px] text-text-muted">{`read to ${ASOF} · document: ${firstSource(srcs)}`}</span>;
}
export const tierOfRow = rowTier;

// ---------------------------------------------------------------------------
// Q-blocks, twins and exports
// ---------------------------------------------------------------------------

/** A numbered answer block: one h3, `Q{n} — {question}`, whose number never shifts (D2). */
export function QBlock({ q, title, children, className = '' }: { q: string; title: string; children: ReactNode; className?: string }) {
  const id = `sec-${q}-h`;
  return (
    <section data-q={q} aria-labelledby={id} className={`mt-4 sm:mt-10 first:mt-4 min-w-0 scroll-mt-40 ${className}`}>
      <h3 id={id} tabIndex={-1} data-page-copy="" className={`${H3} ${TARGET}`}>{title}</h3>
      {children}
    </section>
  );
}

export interface Col { key: string; label: ReactNode; th?: boolean; sort?: boolean }
export interface Row { cells: ReactNode[]; out?: (string | number | null | undefined)[]; attrs?: Record<string, string>; current?: boolean }

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

/** Copy as TSV and Download .tsv for one table, built from the rows the table shows. */
export function Exports({ name, twin, meta, header, rows }: { name: string; twin: string; meta: Omit<TsvMeta, 'url' | 'lens' | 'filters'>; header: string[]; rows: () => (string | number | null | undefined)[][] }) {
  const { announce, f, filterWords, absHref } = usePage();
  const text = () => tsv({ ...meta, url: absHref(), lens: f.lens, filters: filterWords }, header, rows());
  return (
    <div className="flex flex-wrap gap-2 my-2">
      <button type="button" className={`font-mono text-[12px] px-2 py-1 border border-border-light rounded hover:text-accent ${FOCUS}`}
        onClick={async () => {
          try { await navigator.clipboard.writeText(text()); announce(`${name} copied, ${meta.rows} rows`, 0); }
          catch { announce('The browser refused the copy; use Download instead', 0); }
        }}>
        {`Copy as TSV — ${name}`}
      </button>
      <button type="button" className={`font-mono text-[12px] px-2 py-1 border border-border-light rounded hover:text-accent ${FOCUS}`}
        onClick={() => download(tsvName(f.lens, twin), text())}>
        {`Download .tsv — ${name}, ${meta.rows} rows`}
      </button>
    </div>
  );
}

/**
 * A table twin: a <details data-twin> whose summary names its block and its rows. Its
 * content is drawn only once it has been opened, so a closed twin exposes nothing and
 * costs nothing; under view=table every twin is open.
 */
export function Twin({ twin, title, rowCount, children, suffix = '', paged = false }: { twin: string; title: string; rowCount: number; children: () => ReactNode; suffix?: string; paged?: boolean }) {
  const { f } = usePage();
  // A link that names a page of a paged table (tp > 1) arrives with that table open on that page.
  const open = f.view === 'table' || (paged && f.tp > 1);
  const ref = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(open);
  const [shown, setShown] = useState(open);
  useEffect(() => { setIsOpen(open); if (open) setShown(true); }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const on = () => flushSync(() => { setShown(true); setIsOpen(true); });
    d.addEventListener('sec-open', on);
    return () => d.removeEventListener('sec-open', on);
  }, []);
  return (
    <details ref={ref} data-twin={twin} id={`twin-${twin}`} open={isOpen} onToggle={() => { const o = !!ref.current?.open; setIsOpen(o); if (o) setShown(true); }} className="mt-3 min-w-0">
      {/* The rows render inside the click itself, before the browser opens the details, so an opened twin is never empty. */}
      <summary onClick={() => { if (!shown) flushSync(() => setShown(true)); }} className={`cursor-pointer text-[13.5px] text-text-secondary hover:text-text ${FOCUS}`}>{`${title} as a table · ${rowCount} rows${suffix}`}</summary>
      <div className="mt-2 min-w-0">{shown || isOpen ? children() : null}</div>
    </details>
  );
}
/** Open a twin by name and move focus to its caption (skip links, "show them all"). */
export function openTwinAndFocus(twin: string) {
  const d = document.querySelector<HTMLDetailsElement>(`details[data-twin="${twin}"]`);
  if (!d) return;
  d.dispatchEvent(new Event('sec-open'));
  if (!d.open) d.open = true;
  const focusCaption = (tries: number) => {
    const c = d.querySelector<HTMLElement>('caption, [data-twin-caption]');
    if (c) { c.focus(); return; }
    if (tries > 0) requestAnimationFrame(() => focusCaption(tries - 1));
  };
  focusCaption(20);
}
export function SkipLink({ twin, title }: { twin: string; title: string }) {
  return (
    <p className="text-[12px] font-mono my-1">
      <a href={`#twin-${twin}`} aria-label={`Skip to the table: ${title}`} className={`text-text-muted underline underline-offset-2 hover:text-accent ${FOCUS}`}
        onClick={(e) => { e.preventDefault(); openTwinAndFocus(twin); }}>Skip to the table</a>
    </p>
  );
}

/** The caption line every twin table carries: rows, population, filters, as-of and run. */
export function captionText(n: number, population: string, filters: string) {
  return `${n} rows · ${population} · filters: ${filters || 'none'} · read to ${ASOF}`;
}

/**
 * The rows as a table at ≥ 640px and as one record card per row below it, so a phone
 * never scrolls a table sideways and never hides a source. Sort buttons only on a
 * declared external quantity (§8.2-12).
 */
export function TwinTable({ caption, cols, rows, sortable, sortKey, onSort, minWidth = '40rem', amounts = true }: {
  caption: string; cols: Col[]; rows: Row[]; sortable?: string[]; sortKey?: { key: string; dir: 'ascending' | 'descending' } | null; onSort?: (key: string) => void; minWidth?: string; amounts?: boolean;
}) {
  const { narrow } = usePage();
  const cap = <>{caption}{amounts ? <> · ₹ in <abbr title="crore">cr</abbr> as published</> : null}</>;
  if (narrow) {
    return (
      <div className="space-y-2">
        <p data-twin-caption="" tabIndex={-1} className={`text-[12.5px] text-text-muted ${TARGET}`}>{cap}</p>
        {rows.map((r, i) => (
          <dl key={i} data-row="" {...(r.attrs ?? {})} className="border border-border rounded p-2.5 grid gap-1 text-[14px] m-0">
            {r.cells.map((c, j) => (
              <div key={j} className="min-w-0">
                <dt className="font-mono text-[12px] text-text-muted">{cols[j]?.label}</dt>
                <dd className="m-0 text-[14px] text-text-secondary break-words min-w-0">{c}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    );
  }
  return (
    <div className="relative overflow-x-auto min-w-0">
      <table className="w-full border-collapse text-[13.5px]" style={{ minWidth }}>
        <caption tabIndex={-1} className={`text-left text-[12.5px] text-text-muted pb-2 ${TARGET}`}>{cap}</caption>
        <thead>
          <tr>
            {cols.map((c) => {
              const canSort = sortable?.includes(c.key);
              const dir = sortKey?.key === c.key ? sortKey.dir : undefined;
              return (
                <th key={c.key} scope="col" aria-sort={canSort ? dir ?? 'none' : undefined}
                  className="text-left font-mono text-[12px] tracking-wide text-text-muted border-b border-border-light pb-2 pr-3 font-medium align-bottom">
                  {canSort ? (
                    <button type="button" className={`underline underline-offset-2 text-left ${FOCUS}`} onClick={() => onSort?.(c.key)}>
                      {c.label}<span className="sr-only">{`, sort by this column, ${dir ?? 'not sorted'}`}</span>
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} {...(r.attrs ?? {})} aria-current={r.current ? 'true' : undefined} className={`align-top ${r.current ? 'bg-accent/[0.07]' : ''}`}>
              {r.cells.map((c, j) => (cols[j]?.th
                ? <th key={j} scope="row" className="sec-sticky text-left font-normal border-b border-border py-2 pr-3 text-text">{c}</th>
                : <td key={j} className="border-b border-border py-2 pr-3 text-text-secondary">{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "page {p} of {n}" with previous and next, writing `tp` (paged at 400, never truncated). */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <p className="font-mono text-[12px] text-text-muted my-2 flex items-center gap-3">
      <button type="button" disabled={page <= 1} className={`underline disabled:no-underline disabled:opacity-50 ${FOCUS}`} onClick={() => onPage(page - 1)}>‹ previous</button>
      <span>{`page ${page} of ${pages}`}</span>
      <button type="button" disabled={page >= pages} className={`underline disabled:no-underline disabled:opacity-50 ${FOCUS}`} onClick={() => onPage(page + 1)}>next ›</button>
    </p>
  );
}

/**
 * A roving group: one tab stop for a block of many links (base-rate sources, card
 * sources), with the arrow keys, Home and End moving between them. It keeps the
 * keyboard budget the spec sets (§13) without hiding a single source.
 */
export function Roving({ label, children, className = '', describedBy }: { label: string; children: ReactNode; className?: string; describedBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = () => [...(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])].filter((e) => !e.closest('details:not([open]) > :not(summary)'));
  const sync = useCallback(() => {
    const xs = items();
    const cur = xs.findIndex((e) => e.getAttribute('tabindex') === '0');
    xs.forEach((e, i) => e.setAttribute('tabindex', i === (cur >= 0 ? cur : 0) ? '0' : '-1'));
  }, []);
  useEffect(() => { sync(); });
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const xs = items();
    const i = xs.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = Math.min(xs.length - 1, i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = Math.max(0, i - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = xs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    xs.forEach((x, j) => x.setAttribute('tabindex', j === n ? '0' : '-1'));
    xs[n].focus();
  };
  const hintId = `rv-${useId().replace(/:/g, '')}`;
  return (
    <div ref={ref} role="toolbar" aria-orientation="vertical" aria-labelledby={`${hintId}-l`} aria-describedby={describedBy ? `${hintId} ${describedBy}` : hintId} onKeyDown={onKey} className={className}>
      <span id={`${hintId}-l`} hidden>{label}</span>
      <span id={hintId} className="sr-only">One stop for this block; the arrow keys move between its links and buttons.</span>
      {children}
    </div>
  );
}

/** An in-page anchor that scrolls instead of navigating: under HashRouter a bare `#id` would be read as a route. */
export function Anchor({ to, children, className = '', onGo }: { to: string; children: ReactNode; className?: string; onGo?: () => void }) {
  return (
    <a href={`#${to}`} className={`underline underline-offset-2 hover:text-accent ${FOCUS} ${className}`}
      onClick={(e) => { e.preventDefault(); const el = document.getElementById(to); el?.scrollIntoView({ block: 'start' }); onGo?.(); }}>
      {children}
    </a>
  );
}

/** A section heading line with its denominator, as the house prints it. */
export function Denominator({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p data-page-copy="" className={`font-mono text-[12px] text-text-muted tracking-wide my-2 max-w-[100ch] ${className}`}>{children}</p>;
}

/**
 * A block whose population the filters emptied says so in the page's words and offers
 * the way back; its frame (axis, rows, cards) stays drawn beneath (§4, D20).
 */
export function NoMatch({ k, n }: { k: number; n: number }) {
  const { filterWords, reset } = usePage();
  if (k > 0 || n === 0) return null;
  return (
    <p data-page-copy="" className="text-[14px] text-text my-2">
      {`No record in this register matches ${filterWords || 'these filters'}. This is a statement about the register, not about India. `}
      <button type="button" className={`underline underline-offset-2 ${FOCUS}`} onClick={reset}>reset filters</button>
    </p>
  );
}

/**
 * A full stop between quoted items for a screen reader and for any reading of the list as
 * text: without it, one item's words run into the next item's figures.
 */
export function End() {
  return <span className="sr-only">. </span>;
}

export function LinkButton({ children, onClick, label, className = '', current }: { children: ReactNode; onClick: (el: HTMLButtonElement) => void; label?: string; className?: string; current?: boolean }) {
  return (
    <button type="button" aria-label={label} aria-current={current ? 'true' : undefined} onClick={(e) => onClick(e.currentTarget)}
      className={`text-left underline underline-offset-2 decoration-border-light hover:text-accent ${FOCUS} ${className}`}>
      {children}
    </button>
  );
}

export const tierOf = (r: BudgetRow) => rowTier(r);
