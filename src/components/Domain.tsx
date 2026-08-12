import { useMemo } from 'react';
import { Cite } from './Editorial';
import type { Source } from '../graph/schema';

/**
 * Shared chrome for the four allocation-register domains — PM CARES, government
 * awards, the conglomerate groups, and natural resources.
 *
 * The design thesis these implement is ONE CHROME, FOUR CENTRES: every domain page
 * carries the same rails in the same order, so a reader learns the page once, and
 * only the middle changes with the shape of the data. See docs/MASTER_PLAN.md §3.
 *
 * Building this once is the point. Four pages that each grow their own denominator
 * strip drift apart within a month, and the drift is invisible because each looks
 * internally consistent.
 */

// ---------------------------------------------------------------------------
// DenominatorStrip
// ---------------------------------------------------------------------------

export interface DenominatorFact {
  /** The count under the current view. */
  n: number;
  /** The population it is drawn from. Omit only when this IS the population. */
  of?: number;
  label: string;
}

/**
 * Sticky. "N of M · K distinct · as of DATE".
 *
 * This exists because "won 9 blocks" is not a fact until it is "9 of 125, across 91
 * distinct winners" — and the second sentence usually destroys the first. Making the
 * denominator ambient rather than something the reader has to go and find is the
 * single highest-leverage decision in the whole interface.
 */
export function DenominatorStrip({
  facts,
  asOf,
  filtered,
}: {
  facts: DenominatorFact[];
  asOf: string;
  /** When a filter is active, the unfiltered total — so the reader sees what was excluded. */
  filtered?: { from: number; to: number };
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-bg/95 backdrop-blur border-b border-border-light">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px]">
        {facts.map((f) => (
          <span key={f.label} className="text-text-secondary">
            <span className="text-text tabular-nums">{f.n.toLocaleString('en-IN')}</span>
            {f.of != null && (
              <span className="text-text-muted tabular-nums"> of {f.of.toLocaleString('en-IN')}</span>
            )}{' '}
            {f.label}
          </span>
        ))}
        {filtered && filtered.from !== filtered.to && (
          <span className="text-amber tabular-nums">
            filtered {filtered.from.toLocaleString('en-IN')} → {filtered.to.toLocaleString('en-IN')}
          </span>
        )}
        <span className="text-text-muted ml-auto">as of {asOf}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GapsPanel
// ---------------------------------------------------------------------------

export interface Gap {
  what: string;
  /** Why it could not be reached. "adaniports.com returns 403 to automated fetching". */
  why: string;
  /** What would close it — an RTI, a filing due date, a portal that may come back. */
  closes?: string;
}

/**
 * Rendered at the SAME type size as findings. Not a footer, not a disclaimer.
 *
 * On this platform absence is a result: an unpublished audited statement, a state
 * portal that publishes only scanned PDFs, a document behind a 403. A page whose
 * limitations live in 11px grey text at the bottom is arguing, not documenting.
 */
export function GapsPanel({ gaps, note }: { gaps: Gap[]; note?: string }) {
  if (!gaps.length) {
    return (
      <div className="border border-sage/30 bg-sage/[0.05] rounded-lg p-4">
        <p className="text-[14px] text-sage">
          No gaps recorded for this register — every document in scope was retrieved. That is
          unusual; treat it as a claim about coverage that is itself worth checking.
        </p>
      </div>
    );
  }
  return (
    <div className="border border-amber/30 bg-amber/[0.04] rounded-lg p-4">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-amber mb-3">
        {gaps.length} gap{gaps.length === 1 ? '' : 's'} in this register
      </p>
      {note && <p className="text-[14px] text-text-secondary mb-3 max-w-[72ch]">{note}</p>}
      <ul className="space-y-2.5">
        {gaps.map((g, i) => (
          <li key={i} className="text-[14px] leading-snug">
            <span className="text-text">{g.what}</span>
            <span className="block text-[13px] text-text-muted mt-0.5">{g.why}</span>
            {g.closes && (
              <span className="block font-mono text-[10.5px] text-sage mt-0.5">
                closes when: {g.closes}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContestedFact
// ---------------------------------------------------------------------------

export interface Position {
  /** Who holds it. A named party, not "critics" or "some observers". */
  who: string;
  claim: string;
  srcs?: Source[];
}

/**
 * Two positions side by side, each sourced. This component ADJUDICATES NOTHING —
 * there is deliberately no "which is right" slot, and no visual weighting that
 * would imply one.
 *
 * The layout is symmetric on purpose. An asymmetric layout — one position in the
 * body and the other in a rebuttal box — is an editorial verdict delivered through
 * CSS, which is the hardest kind to notice and the hardest to defend.
 */
export function ContestedFact({
  question,
  positions,
  unresolved,
}: {
  question: string;
  positions: [Position, Position];
  /** What is actually undecided, and what would settle it. */
  unresolved?: string;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-bg-elevated">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-text-muted">contested</p>
        <p className="text-[15px] text-text mt-1">{question}</p>
      </div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {positions.map((p, i) => (
          <div key={i} className="p-4">
            <p className="font-mono text-[10.5px] text-accent tracking-wide mb-1.5">{p.who}</p>
            <p className="text-[14px] leading-relaxed text-text-secondary">{p.claim}</p>
            <Cite srcs={p.srcs} />
          </div>
        ))}
      </div>
      {unresolved && (
        <div className="px-4 py-2.5 border-t border-border bg-bg-elevated">
          <p className="text-[13px] text-text-muted leading-relaxed">
            <span className="text-text-secondary">Unresolved.</span> {unresolved}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CompetitiveTension
// ---------------------------------------------------------------------------

export interface TensionRow {
  register: string;
  /** Mean bidders per lot. null where the register does not publish bid counts. */
  biddersPerLot: number | null;
  /** Lots that found a buyer. */
  taken: number;
  /** Lots put on offer. */
  offered: number;
  asOf: string;
  /** What "lot" means here — a block, a tender, a MHz slice. */
  unit: string;
  note?: string;
}

/**
 * The cross-domain spine. One component, five registers, directly comparable.
 *
 * WHY THIS METRIC. It is neutral. A low bidder count is exactly as consistent with an
 * unattractive asset, a high capex threshold or a narrow qualified-bidder pool as with
 * anything else — so the innocent reading is built into the statistic rather than
 * bolted on as a caveat. Contrast any metric that scores an entity: that needs a
 * caveat precisely because it makes a claim the data cannot carry.
 *
 * Both columns carry their own denominator by construction, which is the other reason
 * this is the right spine: it cannot be quoted without one.
 */
export function CompetitiveTension({ rows, caption }: { rows: TensionRow[]; caption?: string }) {
  const maxBidders = useMemo(
    () => Math.max(1, ...rows.map((r) => r.biddersPerLot ?? 0)),
    [rows],
  );
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13.5px] border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border-light text-left">
              <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal">
                register
              </th>
              <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal">
                bidders per {rows[0]?.unit ?? 'lot'}
              </th>
              <th className="py-2 pr-4 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal">
                offered → taken
              </th>
              <th className="py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted font-normal">
                as of
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const takeRate = r.offered > 0 ? r.taken / r.offered : null;
              return (
                <tr key={r.register} className="border-b border-border align-top">
                  <td className="py-2.5 pr-4">
                    <span className="text-text">{r.register}</span>
                    {r.note && (
                      <span className="block text-[12px] text-text-muted mt-0.5 max-w-[40ch]">{r.note}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {r.biddersPerLot == null ? (
                      // Not zero. Not blank. The register does not publish it, and that
                      // is a different fact from "nobody bid".
                      <span className="font-mono text-[11px] text-amber">not published</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="font-mono tabular-nums text-text w-10">
                          {r.biddersPerLot.toFixed(1)}
                        </span>
                        <span className="h-1.5 bg-accent/70 rounded-full" style={{ width: `${(r.biddersPerLot / maxBidders) * 90}px` }} />
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-[12.5px]">
                    <span className="text-text-muted">{r.offered.toLocaleString('en-IN')}</span>
                    <span className="text-text-muted"> → </span>
                    <span className="text-text">{r.taken.toLocaleString('en-IN')}</span>
                    {takeRate != null && (
                      <span className={takeRate < 0.5 ? 'text-amber ml-2' : 'text-text-muted ml-2'}>
                        {(takeRate * 100).toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-text-muted">{r.asOf}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {caption && (
        <p className="text-[13px] text-text-muted mt-3 max-w-[72ch] leading-relaxed">{caption}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConcentrationCurve
// ---------------------------------------------------------------------------

/**
 * Cumulative share of value against winner rank, with the FULL tail.
 *
 * Truncating the tail at "top 20" inflates every concentration claim that follows,
 * because the one-award winners are the base rate. The count of them is printed
 * rather than left to be inferred from a curve that goes flat.
 */
export function ConcentrationCurve({
  values,
  label,
  height = 150,
}: {
  /** One value per winner. Order does not matter — this sorts. */
  values: number[];
  label: string;
  height?: number;
}) {
  const { pts, n, topShare, halfAt, hhi } = useMemo(() => {
    const sorted = [...values].sort((a, b) => b - a);
    const tot = sorted.reduce((a, b) => a + b, 0);
    const points: [number, number][] = [[0, 0]];
    let run = 0;
    // How many winners it takes to reach half the value. This is the readable
    // concentration statistic — "3 of 31 winners hold half the value" needs no
    // training to interpret, where an HHI does.
    let half = 0;
    sorted.forEach((v, i) => {
      run += v;
      if (!half && tot > 0 && run >= tot / 2) half = i + 1;
      points.push([(i + 1) / sorted.length, tot > 0 ? run / tot : 0]);
    });
    const topN = Math.max(1, Math.ceil(sorted.length * 0.1));
    const top = sorted.slice(0, topN).reduce((a, b) => a + b, 0);
    // HHI over percentage shares, on the 0–10,000 convention competition
    // authorities use — so the number is comparable to published thresholds.
    const h = tot > 0 ? sorted.reduce((a, v) => a + ((v / tot) * 100) ** 2, 0) : 0;
    return {
      pts: points,
      n: sorted.length,
      topShare: tot > 0 ? top / tot : 0,
      halfAt: half,
      hhi: h,
    };
  }, [values]);

  const W = 320;
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * W).toFixed(1)},${((1 - y) * height).toFixed(1)}`).join('');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full max-w-[420px]" role="img">
        <title>{`Cumulative share of ${label} by winner rank, across ${n} winners`}</title>
        {/* The diagonal is perfect equality — every winner takes an equal share.
            Drawn dashed so it reads as a reference, not as data. */}
        <line x1={0} y1={height} x2={W} y2={0} stroke="var(--color-border-light)" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
      </svg>
      <p className="font-mono text-[11px] text-text-muted mt-2 leading-relaxed">
        {n.toLocaleString('en-IN')} distinct winners · top decile takes{' '}
        <span className="text-text">{(topShare * 100).toFixed(1)}%</span>
        {halfAt > 0 && (
          <>
            {' '}·{' '}
            <span className="text-text">
              {halfAt} of {n}
            </span>{' '}
            hold half the value
          </>
        )}{' '}
        · HHI <span className="text-text">{Math.round(hhi).toLocaleString('en-IN')}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RegimeSplit
// ---------------------------------------------------------------------------

export interface RegimePeriod {
  name: string;
  /** Human-readable span, e.g. "1993–2011". */
  span: string;
  rule: string;
  bars: { label: string; value: number }[];
}

/**
 * Before and after a declared rule change, on the SAME axes and the SAME scale.
 *
 * 2014–15 is a natural experiment in Indian resource allocation: the Supreme Court
 * cancelled 204 of 218 coal allocations and the MMDR amendment forced competitive
 * auction. A discretionary regime and an auction regime plotted as one continuous
 * series is a chart that hides its own subject — so the split is structural here,
 * not a styling choice.
 */
export function RegimeSplit({
  periods,
  boundary,
  unit,
}: {
  periods: [RegimePeriod, RegimePeriod];
  boundary: string;
  unit: string;
}) {
  // One scale across both panels. Independent scales would make the two periods look
  // comparable when they are not, which is the entire failure this component prevents.
  const max = Math.max(1, ...periods.flatMap((p) => p.bars.map((b) => b.value)));
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-px bg-border rounded-lg overflow-hidden">
        {periods.map((p, i) => (
          <div key={p.name} className="bg-bg-elevated p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted">
              {i === 0 ? 'before' : 'after'} · {p.span}
            </p>
            <p className="text-[15px] text-text mt-1">{p.name}</p>
            <p className="text-[12.5px] text-text-muted mt-1 mb-3 leading-snug">{p.rule}</p>
            <ul className="space-y-1.5">
              {p.bars.map((b) => (
                <li key={b.label} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-28 shrink-0 text-text-secondary truncate" title={b.label}>
                    {b.label}
                  </span>
                  <span
                    className={`h-2.5 rounded-sm ${i === 0 ? 'bg-text-muted' : 'bg-accent'}`}
                    style={{ width: `${(b.value / max) * 100}%`, minWidth: b.value > 0 ? '2px' : '0' }}
                  />
                  <span className="font-mono tabular-nums text-[11px] text-text-muted">
                    {b.value.toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="font-mono text-[10.5px] text-text-muted mt-2">
        boundary: {boundary} · both panels share one scale, in {unit}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SourceLedger
// ---------------------------------------------------------------------------

export interface LedgerEntry {
  label: string;
  url: string;
  /** What it establishes. Not a summary of the document — what it PROVES. */
  establishes: string;
  /** What it does not establish, where a reader might over-read it. */
  doesNot?: string;
  primary: boolean;
  retrieved: string;
}

/**
 * The full list, never behind a "show more". A citation you have to click to see is
 * a citation the reader will assume is thin.
 *
 * `primary` is marked explicitly because a broker mirror of a filing and the filing
 * are not the same source, and the difference caps what the claim can be tiered at.
 */
export function SourceLedger({ entries }: { entries: LedgerEntry[] }) {
  const primaryCount = entries.filter((e) => e.primary).length;
  return (
    <div>
      <p className="font-mono text-[10.5px] text-text-muted mb-3">
        {entries.length} source{entries.length === 1 ? '' : 's'} · {primaryCount} primary ·{' '}
        {entries.length - primaryCount} secondary
      </p>
      <ol className="space-y-3">
        {entries.map((e, i) => (
          <li key={i} className="text-[13.5px] leading-snug border-l-2 border-border-light pl-3">
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text underline underline-offset-2 decoration-border-light hover:decoration-accent"
            >
              {e.label}
            </a>
            <span
              className={`ml-2 font-mono text-[9.5px] uppercase tracking-wider ${e.primary ? 'text-sage' : 'text-text-muted'}`}
            >
              {e.primary ? 'primary' : 'secondary'}
            </span>
            <span className="block text-[12.5px] text-text-secondary mt-0.5">{e.establishes}</span>
            {e.doesNot && (
              <span className="block text-[12.5px] text-text-muted mt-0.5">
                Does not establish: {e.doesNot}
              </span>
            )}
            <span className="block font-mono text-[10px] text-text-muted mt-0.5">
              retrieved {e.retrieved}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
