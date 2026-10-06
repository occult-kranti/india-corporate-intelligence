import type { Concentration, CpppCore, Provenance } from '../../data/cppp';
import { Cols, Sub, Twin, csvComments, csvName, fmt, stamp } from './ui';

/**
 * §3.1a — every family a rate on this page is computed over (U9), with the identity
 * that reconciles it to the dedup count wherever the JSON emits both parts. Where a
 * complement is not emitted the cell says so; nothing is inferred to close the gap.
 */

export interface FamilyRow {
  definition: string;
  n: number;
  usedIn: string;
  /** The identity as numbers, or null when the complement is not emitted. */
  parts: number[] | null;
  /** Anything the identity cell must also state. */
  extra?: string;
}

/** `p` is the provenance NationalBody resolved; provenance.json alone may be absent. */
export function familyRows(core: CpppCore, conc: Concentration | null, p: Provenance): FamilyRow[] {
  const dedup = p.afterDedupRows;
  const out: FamilyRow[] = [];
  const seen = new Set<string>();
  const add = (r: FamilyRow) => {
    if (seen.has(r.definition)) {
      const prev = out.find((x) => x.definition === r.definition)!;
      prev.usedIn = `${prev.usedIn}; ${r.usedIn}`;
      return;
    }
    seen.add(r.definition);
    out.push(r);
  };
  const { rates, redflags, timing } = core;
  if (rates) {
    add({
      definition: rates.denominator,
      n: rates.denominatorN,
      usedIn: 'rates by portal and year, value bands, tender types, buyers',
      parts: [rates.denominatorN, rates.excludedFromDenominator.bidsNullOrZeroOrOver1000],
    });
  }
  const indicatorLabel: Record<string, string> = {
    singleBidding: 'red flag: single bidding',
    nonOpenTenderType: 'red flag: non-open tender type',
    shortDecisionWindow: 'recorded dataset-date gap; field meaning unverified',
    repeatSingleBidderMarkedWinners: 'red flag: repeat single-bidder pairs',
  };
  for (const ind of redflags?.indicators ?? []) {
    // The short-window family is the timing family (its definition says the excluded
    // rows are counted in timing.json), so its identity is emitted in two files.
    const timingParts = timing && ind.familySize === timing.n ? [timing.n, timing.excludedAocBeforeClosing, timing.excludedDateMissing] : null;
    add({
      definition: ind.familyDefinition,
      n: ind.familySize,
      usedIn: indicatorLabel[ind.indicator] ?? `red flag: ${ind.indicator}`,
      parts: ind.familyDefinition === rates?.denominator && rates ? [rates.denominatorN, rates.excludedFromDenominator.bidsNullOrZeroOrOver1000] : timingParts,
    });
  }
  if (timing) {
    add({
      definition: timing.definition,
      n: timing.n,
      usedIn: 'recorded dataset-date gaps; field meaning unverified; recorded AOC financial-year months',
      parts: [timing.n, timing.excludedAocBeforeClosing, timing.excludedDateMissing],
    });
  }
  if (conc && core.quality) {
    const org = core.quality.organisations;
    add({
      definition: conc.family,
      n: conc.rows.reduce((s, b) => s + b.awards, 0),
      usedIn: 'concentration',
      parts: null,
      extra: `${fmt(conc.rows.length)} of ${fmt(org.centralDistinctBuyers + org.stateDistinctBuyers)} buyers`,
    });
  }
  // An identity is printed only when it holds; one that does not is shown as not holding.
  for (const r of out) {
    if (r.parts && r.parts.reduce((a, b) => a + b, 0) !== dedup) {
      r.extra = `emitted parts sum to ${fmt(r.parts.reduce((a, b) => a + b, 0))}, not ${fmt(dedup)}`;
      r.parts = null;
    }
  }
  return out;
}

const identity = (r: FamilyRow, dedup: number) =>
  r.parts ? `${r.parts.map(fmt).join(' + ')} = ${fmt(dedup)}` : r.extra ? `${r.extra}; complement not emitted` : 'complement not emitted';

export default function Families({ core, conc, p, params }: { core: CpppCore; conc: Concentration | null; p: Provenance; params: URLSearchParams }) {
  const dedup = p.afterDedupRows;
  const rows = familyRows(core, conc, p);
  return (
    <Sub id="cppp-families" title="Families used on this page">
      <p className="text-[14px] leading-relaxed text-text-secondary max-w-[72ch]">
        Every rate below is a count over a declared family. Each family is quoted as the pipeline wrote it, with its size and, where both
        parts are emitted, the sum that brings it back to the {fmt(dedup)} award decisions after dedup.
        {!conc && ' The concentration family appears here once concentration.json has loaded.'}
      </p>
      <Twin
        twin="families"
        label="Families table"
        caption={<>Families of every rate on this page · {rows.length} rows · {stamp(p)}</>}
        head={<Cols names={['family definition', 'N', 'used in', `reconciles to ${fmt(dedup)}`]} />}
        download={{
          filename: csvName('families', p),
          comments: csvComments(core, p, 'every family below', rows.length, params),
          columns: ['family definition', 'N', 'used in', 'reconciliation', 'status'],
          rows: () => rows.map((r) => [r.definition, String(r.n), r.usedIn, r.parts ? `${r.parts.join(' + ')} = ${dedup}` : '', r.parts ? '' : identity(r, dedup)]),
        }}
      >
        {rows.map((r) => (
          <tr key={r.definition}>
            <th scope="row" className="max-w-[28rem]">
              {r.definition}
            </th>
            <td className="font-mono tabular-nums">{fmt(r.n)}</td>
            <td>{r.usedIn}</td>
            <td className="font-mono tabular-nums">{identity(r, dedup)}</td>
          </tr>
        ))}
      </Twin>
    </Sub>
  );
}
