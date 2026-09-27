import { Fragment, useCallback, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { useHref, useLocation, useNavigate } from 'react-router-dom';
import { DownloadButton, NODATA_STYLE, type Download } from '../energy/StackTable';
import { FOCUS } from '../energy/hooks';
import { scrapedLabel, type CpppCore, type Provenance, type UnlistedStatus, type Wilson } from '../../data/cppp';

/**
 * Shared primitives for the national (CPPP) section.
 *
 * The section's honesty rules are enforced here once rather than re-typed per table:
 * the tier sentence, the two labelled dates, the scroll region every table lives in,
 * and the CSV header block. A rule restated in eleven components drifts in one.
 */

export { NODATA_STYLE, FOCUS };

/** The tier as spoken text (U15): no caption relies on a chip's colour. */
export const TIER_LINE = 'tier: reported (dataset-only; portal agreement unknown)';

/**
 * Findings text. Rates, their innocent readings and the gaps panel share it exactly —
 * the spec's rule is that no rate is louder than its boring explanation, and that the
 * gaps are set at the same size as the findings.
 */
export const FINDINGS = 'text-[15px] leading-relaxed font-normal text-text-secondary';

export const MONO_NOTE = 'font-mono text-[11px] text-text-muted leading-relaxed';

/** Counts: en-IN grouping, the page's number convention. */
export const fmt = (n: number) => n.toLocaleString('en-IN');

/** One decimal, rounded half away from zero on the decimal value, as the criteria compare. */
export const d1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** Rupees as reported: grouped, at most two decimals, never rescaled or rounded to crore. */
export const inr = (v: number) => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const hasInterval = (w: Wilson): w is [number, number] => Array.isArray(w) && w.length === 2;

/** A Wilson interval in a table cell: one decimal each side, or the words when absent. */
export const ivCell = (w: Wilson) => (hasInterval(w) ? `${d1(w[0])} to ${d1(w[1])}` : 'interval not computed');

/** Width in points, from the printed ends so the column reconciles with the cell beside it. */
export const ivWidth = (w: Wilson) => (hasInterval(w) ? d1(Number(d1(w[1])) - Number(d1(w[0]))) : '—');

/** `{count} of {family} ({pct}%, 95% interval {lo} to {hi})`, values as emitted. */
export const rateText = (count: number, family: number, pct: number, w: Wilson) =>
  `${fmt(count)} of ${fmt(family)} (${pct}%${hasInterval(w) ? `, 95% interval ${w[0]} to ${w[1]}` : '; interval not computed'})`;

/** The two dates and the tier, in the order the spec fixes for every caption. */
export const stamp = (p: Provenance) => `scraped ${scrapedLabel(p)} · computed ${p.asOf} · ${TIER_LINE}`;

/**
 * An in-section link under HashRouter. The router owns the document hash, so the
 * fragment is written as the router's own (`/#/tenders?…#cppp-rates`) with `replace`,
 * and the target is scrolled into view by hand. Back therefore still leaves the page.
 */
export function JumpLink({ id, children, className = '', label }: { id: string; children: ReactNode; className?: string; label?: string }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const href = useHref({ pathname: loc.pathname, search: loc.search, hash: `#${id}` });
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate({ pathname: loc.pathname, search: loc.search, hash: `#${id}` }, { replace: true });
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  return (
    <a href={href} onClick={onClick} aria-label={label} className={`underline underline-offset-2 hover:text-accent ${FOCUS} ${className}`}>
      {children}
    </a>
  );
}

/** Every chart caption links to the row of the families table its rate is over (U9). */
export const FamilyLink = ({ children = 'family' }: { children?: ReactNode }) => <JumpLink id="cppp-families">{children}</JumpLink>;

/**
 * A string as emitted, with a break opportunity after each `||` (the portal's
 * organisation||department||division separator). `<wbr>` adds no text, so the
 * string's textContent is unchanged and nothing is split or re-joined.
 */
export function WbrText({ text }: { text: string }) {
  const parts = text.split('||');
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i < parts.length - 1 ? `${p}||` : p}
          {i < parts.length - 1 && <wbr />}
        </Fragment>
      ))}
    </>
  );
}

/** Code, SQL, digests and the marker regex wrap anywhere, so no long token widens the page. */
export const WRAP = 'whitespace-pre-wrap [overflow-wrap:anywhere]';

export const Code = ({ children }: { children: ReactNode }) => (
  <code className={`font-mono text-[12px] text-text ${WRAP}`}>{children}</code>
);

/**
 * The CSV header block (U1): caveat, family and N, both dates, pipeline, digests, params.
 *
 * `p` is the provenance NationalBody has already resolved (provenance.json, else the copy
 * every output file carries). It is passed in rather than re-read from `core.provenance`,
 * because the section renders when only the fallback exists, and this runs during render.
 */
export function csvComments(core: CpppCore, p: Provenance, family: string, n: number, params: URLSearchParams): string[] {
  return [
    core.rates?.caveat ?? 'caveat not present in this build',
    `family: ${family} · N = ${n}`,
    `scraped ${scrapedLabel(p)} · computed ${p.asOf}`,
    `pipeline ${p.generatedBy}`,
    `inputs: ${p.inputs.map((i) => `${i.file} sha256_16 ${i.sha256_16}`).join('; ')}`,
    `params: ${params.toString() || '(none)'}`,
    TIER_LINE,
  ];
}

/*
 * What a state with no buyer at n ≥ 30 may be called. `rates.byOrganisation` is
 * thresholded, so missing from it is not missing from the portal: "not present" is
 * printed only when quality.organisations.statePortalNames gives the name no rows.
 */
export const ABSENT_STATE = 'not present on the state portal in this scrape; absence here is coverage, not conduct';
export const UNLISTED_STATE =
  'no buyer with n ≥ 30 on the state portal in this scrape; smaller buyers are pooled, so the state may still appear there; absence here is coverage, not conduct';
export const pooledState = (rows: number) => `on the state portal (${fmt(rows)} raw rows), but no buyer with n ≥ 30; its buyers sit in the pooled row`;

/** A table row's words for an unlisted state. */
export const unlistedText = (st: UnlistedStatus) => (st.kind === 'absent' ? ABSENT_STATE : st.kind === 'pooled' ? pooledState(st.rows) : UNLISTED_STATE);

/** The sentence a filtered table prints when `state=` names no listed state-portal spelling. */
export function stateFilterSentence(s: string, st: UnlistedStatus): string {
  if (st.kind === 'absent') return `“${s}” does not appear on the state portal in this scrape; absence here is coverage, not conduct`;
  if (st.kind === 'pooled') return `“${s}” is on the state portal (${fmt(st.rows)} raw rows), but has no buyer with n ≥ 30; its buyers sit in the pooled row`;
  return `“${s}” has no buyer with n ≥ 30 on the state portal in this scrape; smaller buyers are pooled, so it may still appear there; absence here is coverage, not conduct`;
}

/**
 * The active `state=` filter in words (A11Y-004 M5): what the filter is, its effect on
 * the table's denominator, and a control that clears it. It is printed above every
 * table the filter narrows, so a reader who arrives by URL can tell why rows are gone.
 */
export const stateFilterWords = (state: string, shown: number, of: number) =>
  `Filtered to buyers whose key begins ‘${state} / ’ · ${fmt(shown)} of ${fmt(of)} buyers`;

export function StateFilterLine({ state, shown, of, onClear }: { state: string; shown: number; of: number; onClear: () => void }) {
  return (
    <p data-state-filter className="font-mono text-[12px] leading-relaxed text-text-secondary mt-3">
      {stateFilterWords(state, shown, of)}
      <span aria-hidden="true" className="text-text-muted">
        {' · '}
      </span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`clear the state filter (${state})`}
        className={`underline underline-offset-2 hover:text-accent ${FOCUS}`}
      >
        clear
      </button>
    </p>
  );
}

/** The `n =` clause's words for a state-filtered caption, empty when no state is set. */
export const stateClause = (state: string | null) => (state ? ` whose key begins ‘${state} / ’` : '');

/**
 * A state-portal key ending "/ unparsed" is not a public body (U6): the tender id carried
 * no department code. The row is named by what it is, with the raw key beneath in mono.
 */
export const isUnparsed = (key: string) => key.endsWith('/ unparsed');
export const unparsedLabel = (key: string) => `${key.split(' / ')[0]} state portal · department code unparsed`;
export function UnparsedKey({ k }: { k: string }) {
  return (
    <>
      {unparsedLabel(k)}{' '}
      <span data-raw-key className="block font-mono text-[11px] text-text-muted">
        {k}
      </span>
    </>
  );
}

/**
 * The pipeline's README on the code host. The run's commit (provenance.generatedBy)
 * predates scripts/cppp/, so no pinned URL resolves; this is the current tree, and the
 * footer says so beside the link rather than dropping it (AC-72).
 */
export const README_URL = 'https://github.com/occult-kranti/india-corporate-intelligence/blob/main/scripts/cppp/README.md';

export const ORIGIN_MISSING = 'Dataset origin not yet in provenance.json (recorded in scripts/cppp/README.md)';

/**
 * The source line (U14). The dataset's origin is read from provenance.dataset when the
 * pipeline emits it; until then the line says where it is recorded. It is never typed
 * into the page, because a literal drifts from its dataset within a commit.
 */
export function sourceLine(p: Provenance): string {
  const d = p.dataset;
  if (!d) return ORIGIN_MISSING;
  return `Source: ${d.name} (${d.url}), licence ${d.licence}; scraper ${d.scraper}; scraped ${scrapedLabel(p)}; pipeline ${p.generatedBy}; computed ${p.asOf}. Tier: reported.`;
}

export const csvName = (twin: string, p: Provenance) => `cppp-${twin}-${p.asOf}.csv`;

const TABLE_BASE =
  'w-full border-collapse text-[13.5px] ' +
  // A sticky first column keeps each row's name in view while a wide table scrolls (U16).
  '[&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-[1] [&_tr>*:first-child]:bg-bg ' +
  '[&_th]:text-left [&_th]:align-top [&_td]:align-top ' +
  '[&_thead_th]:font-mono [&_thead_th]:text-[10px] [&_thead_th]:uppercase [&_thead_th]:tracking-[0.1em] [&_thead_th]:text-text-muted [&_thead_th]:font-medium [&_thead_th]:border-b [&_thead_th]:border-border-light [&_thead_th]:pb-2 [&_thead_th]:pr-4 ' +
  '[&_tbody_th]:font-normal [&_tbody_th]:text-text [&_tbody_th]:py-2 [&_tbody_th]:pr-4 [&_tbody_th]:border-b [&_tbody_th]:border-border ' +
  '[&_tbody_td]:py-2 [&_tbody_td]:pr-4 [&_tbody_td]:border-b [&_tbody_td]:border-border [&_tbody_td]:text-text-secondary ' +
  // A number or an interval never breaks across lines.
  '[&_.tabular-nums]:whitespace-nowrap';

/*
 * In the concentration and buyers tables the first cell is the portal and the row header
 * (the buyer) is second, so pinning only the first cell kept "central" in view and let
 * the name scroll off (A11Y-004 M6). The column order is the spec's and the CSV's, so
 * both cells are pinned instead: the portal cell at a fixed width, the buyer beside it
 * at a capped width that wraps anywhere, so on a phone the scrolling columns keep room.
 */
const PIN_TWO =
  '[&_tr>*:first-child]:w-[4.5rem] [&_tr>*:first-child]:min-w-[4.5rem] ' +
  '[&_tr>*:nth-child(2)]:sticky [&_tr>*:nth-child(2)]:left-[4.5rem] [&_tr>*:nth-child(2)]:z-[1] [&_tr>*:nth-child(2)]:bg-bg ' +
  '[&_tr>*:nth-child(2)]:w-[9rem] [&_tr>*:nth-child(2)]:min-w-[9rem] sm:[&_tr>*:nth-child(2)]:w-[15rem] sm:[&_tr>*:nth-child(2)]:min-w-[15rem] ' +
  '[&_tr>*:nth-child(2)]:[overflow-wrap:anywhere] [&_tr>*:nth-child(2)]:shadow-[inset_-1px_0_0_var(--color-border-light)]';

/**
 * A table twin: a labelled, keyboard-scrollable region (U16), the table with its
 * caption, a `scrolls →` hint for narrow screens, and the CSV export (U1). Tables are
 * never folded (U15).
 */
export function Twin({
  twin,
  label,
  caption,
  head,
  children,
  describedBy,
  download,
  minWidth = '38rem',
  pinTwo = false,
}: {
  twin?: string;
  label: string;
  caption: ReactNode;
  head: ReactNode;
  children: ReactNode;
  describedBy?: string;
  download?: Download;
  minWidth?: string;
  /** Pin the second cell too, for tables whose row header comes after a short portal cell. */
  pinTwo?: boolean;
}) {
  return (
    <div className="my-5">
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className={`overflow-x-auto rounded-sm ${FOCUS}`}
      >
        <table data-twin={twin} aria-describedby={describedBy} className={`${TABLE_BASE}${pinTwo ? ` ${PIN_TWO}` : ''}`} style={{ minWidth }}>
          <caption className="text-left font-mono text-[11px] text-text-muted leading-relaxed pb-2">
            <span className="block sticky left-0 max-w-[calc(100vw-2.5rem)] lg:max-w-none">{caption}</span>
          </caption>
          <thead>
            <tr>{head}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <span aria-hidden="true" className="sm:hidden font-mono text-[10.5px] text-text-muted">
          scrolls →
        </span>
        {download && <DownloadButton d={download} />}
      </div>
    </div>
  );
}

/** Header cells, each scoped (U15). */
export const Cols = ({ names }: { names: string[] }) => (
  <>
    {names.map((n) => (
      <th key={n} scope="col">
        {n}
      </th>
    ))}
  </>
);

/** A subsection of the national section: an id the jump list and captions target, and its h3. */
export function Sub({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="pt-10 scroll-mt-[var(--cppp-sub-mt,10rem)] lg:scroll-mt-[var(--cppp-sub-mt,4rem)]">
      <h3 className="heading-editorial font-semibold text-xl border-b border-border pb-2 mb-4">{title}</h3>
      {children}
    </section>
  );
}

/** Copy to the clipboard with a spoken confirmation; no dependency. */
export function useCopy(): [string, (text: string, done: string) => void] {
  const [status, setStatus] = useState('');
  const copy = useCallback((text: string, done: string) => {
    const ok = () => setStatus(done);
    const fail = () => setStatus('Copy failed: the browser refused clipboard access.');
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(ok, fail);
    else fail();
  }, []);
  return [status, copy];
}

/** A cell or block painted with the no-data hatch; the hatch never means zero. */
export const nodata = { 'data-nodata': '' } as const;

/**
 * The drawing width of a chart's container, in CSS pixels. Charts are drawn in pixel
 * units at that width, so an 11px label is 11px on a phone and on a desktop alike (a
 * fixed viewBox scaled to 358px would print it at half size).
 */
export function useWidth<T extends HTMLElement>(fallback: number): [RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(Math.round(el.getBoundingClientRect().width) || fallback);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, w];
}

/** Neutral greys for every data mark (U17): portals differ in lightness and shape, never hue. */
export const GREY = { central: '#d2d2d2', state: '#9e9e9e', grid: '#2c2c2c', axis: '#5c5c5c', bar: '#b4b4b4' } as const;
