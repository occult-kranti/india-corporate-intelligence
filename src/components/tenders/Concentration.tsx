import { onStatePortal, unlistedStatus, type Concentration as Conc, type ConcentrationRow, type CpppCore, type Provenance } from '../../data/cppp';
import { STATES } from '../../data/geo';
import { VH, type Patch } from '../energy/hooks';
import { PORTALS, type NationalParams, type SortKey } from './params';
import {
  FINDINGS, FOCUS, FamilyLink, MONO_NOTE, NODATA_STYLE, StateFilterLine, Sub, Twin, UnparsedKey, WbrText, csvComments, csvName, fmt, inr, isUnparsed,
  stamp, stateClause, stateFilterSentence, stateFilterWords, unparsedLabel,
} from './ui';

/**
 * §3.6 — concentration among marked winners, per buyer (U10). Count-based columns come
 * first because the pipeline's own definition calls the count HHI robust to mis-keyed
 * values. Names are rendered only as emitted — marked, ≥ 5 awards for that buyer, at
 * most five — one list item each, never joined. Sort keys are count, declared value and
 * name only (D7): ordering real bodies by an HHI this page reports would be a ranking.
 */

const MOSTLY_UNMARKED = 'most winners here are unnamed; the HHI covers the marked minority';
const MS_MISSING =
  'Some names shown are admitted by “M/s” alone and may be trading names of individuals; the count is recorded in scripts/cppp/README.md and is not yet a field.';

type Cmp = (a: ConcentrationRow, b: ConcentrationRow) => number;

const noHhi = (r: ConcentrationRow) => r.hhiValue == null || r.hhiCount == null;

/**
 * Rows keep their place by the chosen key, null HHI or not (AC-40). HHI is not a sort key
 * (D7), so "sorts last" has nothing to act on: pushing null-HHI rows to the end under an
 * awards sort would make the order depend on an HHI this page reports, which is the
 * ranking D7 refuses. The row says "not computed" and carries the hatch instead.
 */
function order(sort: SortKey): Cmp {
  if (sort === 'value') return (a, b) => b.valueSumInr - a.valueSumInr || a.buyer.localeCompare(b.buyer);
  if (sort === 'buyer') return (a, b) => a.buyer.localeCompare(b.buyer);
  return (a, b) => b.awards - a.awards || a.buyer.localeCompare(b.buyer);
}

function notes(r: ConcentrationRow): string {
  const out: string[] = [];
  if (r.unmarkedShareOfAwardsPct >= 50) out.push(MOSTLY_UNMARKED);
  // The cause is stated only where the row shows it; any other null is the pipeline's.
  if (noHhi(r)) out.push(r.markedAwards === 0 ? 'no marked winner to compute an HHI over' : 'HHI not computed by the pipeline');
  return out.join('; ');
}

const Nd = ({ children = 'not computed' }: { children?: string }) => (
  <td data-nodata="" style={NODATA_STYLE} className="font-mono">
    {children}
  </td>
);

export default function Concentration({
  core, conc, ready, p, params, np, patch,
}: {
  core: CpppCore;
  conc: Conc | null;
  ready: boolean;
  p: Provenance;
  params: URLSearchParams;
  np: NationalParams;
  patch: Patch;
}) {
  if (!ready) {
    return (
      <Sub id="cppp-concentration" title="Concentration">
        <p data-pending className={MONO_NOTE}>
          The concentration table (concentration.json) is loading.
        </p>
      </Sub>
    );
  }
  if (!conc) {
    return (
      <Sub id="cppp-concentration" title="Concentration">
        <p data-nodata style={NODATA_STYLE} className={`${FINDINGS} p-2`}>
          concentration.json is not present in this build; no concentration is computed in its place.
        </p>
      </Sub>
    );
  }

  const q = core.quality;
  const N = conc.rows.length;
  const filtered = conc.rows.filter((r) => (np.portal === 'all' || r.portal === np.portal) && (!np.state || r.buyer.startsWith(`${np.state} / `)));
  const sorted = [...filtered].sort(order(np.sort));
  const names = STATES.map((s) => s.name);
  // A state the portal carries but the family's threshold excludes is not "absent" (§3.6).
  const stateLine = !np.state || filtered.length > 0
    ? null
    : onStatePortal(core, np.state, names, conc.rows)
      ? `No “${np.state}” buyer meets the concentration family's threshold (the family is quoted above); “${np.state}” is on the state portal, so this is the threshold, not absence.`
      : stateFilterSentence(np.state, unlistedStatus(core.quality, np.state, names));
  const k = sorted.length;
  const limit = np.rows === 'all' ? k : Math.min(Number(np.rows), k);
  const shown = sorted.slice(0, limit);
  const awardsTotal = conc.rows.reduce((a, r) => a + r.awards, 0);
  const org = q?.organisations;
  const wm = q?.winnerMarkers;
  const ms = wm?.msOnlyNamed;

  const sortTh = (key: SortKey, label: string) => {
    const on = np.sort === key;
    return (
      <th scope="col" aria-sort={on ? (key === 'buyer' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" onClick={() => patch({ sort: key === 'awards' ? null : key })} className={`uppercase tracking-[0.1em] hover:text-text ${FOCUS}`}>
          {label}
          {on && <span aria-hidden="true">{key === 'buyer' ? ' ↑' : ' ↓'}</span>}
        </button>
      </th>
    );
  };
  const pct = (v: number | null) => (v == null ? <Nd /> : <td className="font-mono tabular-nums">{v}%</td>);
  const hhi = (v: number | null) => (v == null ? <Nd /> : <td className="font-mono tabular-nums">{v}</td>);
  const nstr = (v: number | null) => (v == null ? '' : String(v));

  return (
    <Sub id="cppp-concentration" title="Concentration">

      <div className="space-y-2 text-[13.5px] leading-relaxed text-text-secondary max-w-[76ch]">
        <p id="cppp-conc-desc">
          Family: {conc.family}. {conc.hhiDefinition}. Naming: {conc.namingRule}.
        </p>
        <p id="cppp-conc-reading" data-innocent className={FINDINGS}>
          {conc.innocentReading}
        </p>
        <p id="cppp-conc-counts">
          {org ? `${fmt(N)} of ${fmt(org.centralDistinctBuyers + org.stateDistinctBuyers)} buyers meet the family's threshold. ` : `${fmt(N)} buyers. `}
          {wm
            ? `${fmt(wm.unmarked)} unmarked award rows (${(100 - wm.markedSharePct).toFixed(2)}% of the ${fmt(wm.named)} rows with a named winner) are counted, never named. `
            : ''}
          Where unmarked winners are 50% or more of a buyer's awards, its row says: {MOSTLY_UNMARKED}.{' '}
          {ms ? `${fmt(ms.n)} of ${fmt(ms.of)} names shown are admitted by “M/s” alone and may be trading names of individuals.` : MS_MISSING}
        </p>
      </div>
      {np.state && <StateFilterLine state={np.state} shown={k} of={N} onClear={() => patch({ state: null })} />}
      {stateLine && <p className={`${FINDINGS} max-w-[72ch] mt-3`}>{stateLine}</p>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-text-muted">portal</span>
          <div role="group" aria-label="Portal" className="flex gap-1.5">
            {PORTALS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={np.portal === v}
                onClick={() => patch({ portal: v === 'all' ? null : v, state: v === 'state' ? np.state : null })}
                // Pressed is told by more than lightness (A11Y-004 M3): a 2px accent bar, weight,
                // and under forced colours a system-coloured bar and an underline, which survive
                // the fill and border colours being overridden.
                className={`font-mono text-[11px] px-2.5 py-1 rounded border ${
                  np.portal === v
                    ? 'border-text-secondary border-b-2 border-b-accent pb-[3px] text-text bg-bg-card font-medium forced-colors:border-b-[Highlight] forced-colors:underline'
                    : 'border-border text-text-muted hover:text-text'
                } ${FOCUS}`}
              >
                {v}
              </button>
            ))}
          </div>
          <span data-effect className="font-mono text-[11px] text-text-secondary">
            {fmt(N)} → {fmt(k)} buyers
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="font-mono text-[11px] text-text-muted flex items-center gap-2">
            rows
            <select
              value={np.rows}
              onChange={(e) => patch({ rows: e.target.value === '25' ? null : e.target.value })}
              className={`input-field !py-1 !px-2 !text-[12px] !w-auto ${FOCUS}`}
            >
              <option value="25">25</option>
              <option value="100">100</option>
              <option value="all">all</option>
            </select>
          </label>
          <span data-effect className="font-mono text-[11px] text-text-secondary">
            showing {fmt(limit)} of {fmt(k)} buyers
          </span>
        </div>
      </div>
      <p aria-live="polite" className={VH}>
        {np.state ? stateFilterWords(np.state, k, N) : `${fmt(N)} → ${fmt(k)} buyers`} · showing {fmt(limit)}
      </p>

      {k > 0 && (
        <Twin
          twin="concentration"
          label="Concentration by buyer"
          describedBy="cppp-conc-desc cppp-conc-reading cppp-conc-counts"
          minWidth="78rem"
          pinTwo
          caption={
            <>
              Concentration among marked winners by buyer · n = {fmt(limit)} of {fmt(k)} buyers shown{stateClause(np.state)} ({fmt(N)} in the family, {fmt(awardsTotal)} award
              decisions) · value columns are as reported and unverified (see quality: contract value) · {stamp(p)} · <FamilyLink>family</FamilyLink>
            </>
          }
          head={
            <>
              <th scope="col">portal</th>
              {sortTh('buyer', 'buyer')}
              {sortTh('awards', 'awards')}
              <th scope="col">marked awards</th>
              <th scope="col">unmarked share of awards</th>
              <th scope="col">HHI by count (0–10,000)</th>
              <th scope="col">top marked winner's share of count</th>
              {sortTh('value', 'value sum (₹, as reported, unverified)')}
              {/* Every value-derived column carries the qualifier, so none reads as verified (U10). */}
              <th scope="col">HHI by value (0–10,000; as reported, unverified)</th>
              <th scope="col">top marked winner's share of value (as reported, unverified)</th>
              <th scope="col">top marked winners</th>
              <th scope="col">note</th>
            </>
          }
          download={{
            filename: csvName('concentration', p),
            comments: csvComments(core, p, conc.family, awardsTotal, params),
            columns: [
              'portal', 'buyer', 'awards', 'marked_awards', 'unmarked_share_of_awards_pct', 'hhi_by_count', 'top_marked_share_of_count_pct', 'value_sum_inr',
              'hhi_by_value', 'top_marked_share_of_value_pct', 'top_marked_winners', 'status',
            ],
            // Every row under the current portal and state, whatever `rows` shows (U1).
            rows: () =>
              sorted.map((r) => [
                r.portal, r.buyer, String(r.awards), String(r.markedAwards), String(r.unmarkedShareOfAwardsPct), nstr(r.hhiCount), nstr(r.topShareOfCountPct),
                String(r.valueSumInr), nstr(r.hhiValue), nstr(r.topShareOfValuePct),
                r.winners.map((w) => `${w.name} (${w.awards} awards, ${w.valueInr} INR as reported)`).join(' | '),
                [noHhi(r) ? 'HHI not computed' : '', isUnparsed(r.buyer) ? unparsedLabel(r.buyer) : '', notes(r)].filter(Boolean).join('; '),
              ]),
            count: sorted.length,
          }}
        >
          {shown.map((r) => (
            <tr key={`${r.portal}-${r.buyer}`} data-nodata={noHhi(r) || isUnparsed(r.buyer) ? '' : undefined}>
              <td>{r.portal}</td>
              <th scope="row" style={isUnparsed(r.buyer) ? NODATA_STYLE : undefined}>
                {isUnparsed(r.buyer) ? <UnparsedKey k={r.buyer} /> : <WbrText text={r.buyer} />}
              </th>
              <td className="font-mono tabular-nums">{fmt(r.awards)}</td>
              <td className="font-mono tabular-nums">{fmt(r.markedAwards)}</td>
              <td className="font-mono tabular-nums">{r.unmarkedShareOfAwardsPct}%</td>
              {hhi(r.hhiCount)}
              {pct(r.topShareOfCountPct)}
              <td className="font-mono tabular-nums">{inr(r.valueSumInr)}</td>
              {hhi(r.hhiValue)}
              {pct(r.topShareOfValuePct)}
              <td className="min-w-[18rem]">
                <ol className="list-decimal pl-5 space-y-0.5 text-[12.5px]">
                  {r.winners.map((w, i) => (
                    <li key={i}>{`${w.name} · ${fmt(w.awards)} · ${inr(w.valueInr)} as reported`}</li>
                  ))}
                </ol>
                {r.winners.length === 0 && <p className="text-[12px] text-text-muted">no winner meets the naming rule</p>}
              </td>
              <td className="text-[12.5px]">{notes(r)}</td>
            </tr>
          ))}
        </Twin>
      )}
    </Sub>
  );
}
