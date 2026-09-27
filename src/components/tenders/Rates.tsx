import {
  planYears, pooledOnlyNames, scrapeYearOf, scrapedLabel, splitStates, unlistedStatus, type CpppCore, type Portal, type Provenance, type YearPlan,
} from '../../data/cppp';
import { STATES } from '../../data/geo';
import {
  Cols, FamilyLink, FINDINGS, FOCUS, GREY, JumpLink, MONO_NOTE, Sub, Twin, csvComments, csvName, fmt, hasInterval, ivCell, ivWidth,
  sourceLine, stamp, useCopy, useWidth,
} from './ui';

/**
 * §3.2 — single-bidder rates by portal and AOC year, as small multiples with Wilson
 * ribbons (D4), in neutral greys, portals told apart by marker shape and a direct
 * label (D8). No change of government is marked: the scrape's composition by year is
 * not constant, so a slope is a fact about the scrape before it is one about
 * procurement, and the caption says so in words that are frozen.
 */

const PORTALS: Portal[] = ['central', 'state'];

export const RATES_CAPTION_1 =
  "No change of government is marked. The scrape's composition by year (which bodies, which states, which tender types) is not constant, and the two portals are not the same population; a difference between the lines or a slope within one is a fact about the scrape before it is a fact about procurement.";
export const RATES_CAPTION_2 =
  "The interval covers sampling variation only. It does not cover the scrape's agreement with the portal, which is unknown (verification).";

const THIN_NOTE = 'thin coverage: interval shown, slope not to be read';

function partialLabel(p: Provenance) {
  if (!p.scrapedAt?.value) return `(partial; ${scrapedLabel(p)})`;
  const month = new Date(p.scrapedAt.value).toLocaleString('en-GB', { month: 'long' });
  return `(partial, to ${month})`;
}

const flagOf = (y: YearPlan): string =>
  y.reason ?? ([y.thin ? THIN_NOTE : null, y.partial ? 'partial year' : null].filter(Boolean).join('; ') || 'plotted');

function Chart({ plans, scrapeYear, p, notPlotted, denomN }: {
  plans: Record<Portal, YearPlan[]>;
  scrapeYear: number;
  p: Provenance;
  notPlotted: number;
  denomN: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>(720);
  const W = Math.max(300, width);
  const L = 40;
  const R = 58;
  const panelH = 140;
  const top = 26;
  const gap = 58;
  const H = top + panelH * 2 + gap + 52;
  const slots = PORTALS.flatMap((pt) => plans[pt].filter((y) => y.plotted || y.hatch).map((y) => Number(y.row.year)));
  const y0 = Math.min(...slots);
  const y1 = Math.max(...slots, scrapeYear);
  const x = (yr: number) => L + ((yr - y0) / Math.max(1, y1 - y0)) * (W - L - R);
  const hiMax = Math.max(...PORTALS.flatMap((pt) => plans[pt].filter((y) => y.plotted).map((y) => (hasInterval(y.row.wilson95) ? y.row.wilson95[1] : y.row.singleBidderPct))));
  const yMax = Math.max(10, Math.ceil(hiMax / 10) * 10);
  const step = yMax > 50 ? 20 : 10;
  const everyN = W < 520 ? 3 : W < 760 ? 2 : 1;
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);

  return (
    <div ref={ref} className="w-full">
      <svg
        role="img"
        aria-label={`Single-bidder rate by AOC year, central and state portals, n = ${fmt(denomN)} award decisions; ${notPlotted} rows not plotted; table follows.`}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="block font-mono"
      >
        {PORTALS.map((pt, pi) => {
          const py = top + pi * (panelH + gap);
          const y = (v: number) => py + panelH - (v / yMax) * panelH;
          const colour = GREY[pt];
          const plotted = plans[pt].filter((r) => r.plotted);
          // A line joins only neighbouring plain years: never a thin year, never the
          // partial scrape year, never across a gap.
          const runs: YearPlan[][] = [];
          let cur: YearPlan[] = [];
          for (const r of plotted) {
            const plain = !r.thin && !r.partial;
            const prev = cur[cur.length - 1];
            if (plain && prev && Number(prev.row.year) === Number(r.row.year) - 1) cur.push(r);
            else {
              if (cur.length) runs.push(cur);
              cur = plain ? [r] : [];
            }
          }
          if (cur.length) runs.push(cur);
          const lastMark = plotted.filter((r) => /^\d{4}$/.test(r.row.year)).pop();
          return (
            <g key={pt}>
              <text x={L} y={py - 10} fontSize={11} fill="#b8b8b8">
                {pt} portal, single-bidder % by AOC year
              </text>
              {Array.from({ length: yMax / step + 1 }, (_, i) => i * step).map((v) => (
                <g key={v}>
                  <line x1={L - 6} x2={W - R + 6} y1={y(v)} y2={y(v)} stroke={GREY.grid} strokeWidth={1} />
                  <text x={L - 9} y={y(v) + 3.5} fontSize={10} fill="#8f8f8f" textAnchor="end">
                    {v}%
                  </text>
                </g>
              ))}
              {years.map((yr, i) =>
                i % everyN === 0 || yr === y1 ? (
                  <text key={yr} x={x(yr)} y={py + panelH + 16} fontSize={10} fill="#8f8f8f" textAnchor="middle">
                    {yr}
                  </text>
                ) : null,
              )}
              {/* Wilson ribbons first, so marks sit above them. A lone year gets a bar. */}
              {plotted.map((r) => {
                const w = r.row.wilson95;
                if (!hasInterval(w)) return null;
                const cx = x(Number(r.row.year));
                return (
                  <path
                    key={`b-${r.row.year}`}
                    data-ribbon=""
                    data-key={`${pt} ${r.row.year}`}
                    d={`M${cx - 3.5},${y(w[1])}L${cx + 3.5},${y(w[1])}L${cx + 3.5},${y(w[0])}L${cx - 3.5},${y(w[0])}Z`}
                    fill={colour}
                    fillOpacity={0.22}
                    stroke={colour}
                    strokeOpacity={0.35}
                    strokeWidth={0.75}
                  />
                );
              })}
              {runs
                .filter((run) => run.length > 1)
                .map((run) => {
                  const ok = run.filter((r) => hasInterval(r.row.wilson95));
                  const upper = ok.map((r) => `${x(Number(r.row.year))},${y((r.row.wilson95 as [number, number])[1])}`);
                  const lower = ok.map((r) => `${x(Number(r.row.year))},${y((r.row.wilson95 as [number, number])[0])}`).reverse();
                  return (
                    <g key={`run-${run[0].row.year}`}>
                      {ok.length > 1 && (
                        <path data-ribbon="" d={`M${[...upper, ...lower].join('L')}Z`} fill={colour} fillOpacity={0.16} stroke="none" />
                      )}
                      <polyline
                        points={run.map((r) => `${x(Number(r.row.year))},${y(r.row.singleBidderPct)}`).join(' ')}
                        fill="none"
                        stroke={colour}
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                })}
              {plans[pt]
                .filter((r) => r.hatch)
                .map((r) => (
                  <g key={`h-${r.row.year}`} data-mark="hatch" data-portal={pt} data-year={r.row.year} data-flag="nodata" data-nodata="">
                    <rect x={x(Number(r.row.year)) - 5} y={py} width={10} height={panelH} fill="url(#cppp-hatch)" />
                    <text x={x(Number(r.row.year))} y={py + 10} fontSize={9} fill="#c9a86c" textAnchor="middle">
                      n &lt; 30
                    </text>
                  </g>
                ))}
              {plotted.map((r) => {
                const cx = x(Number(r.row.year));
                const cy = y(r.row.singleBidderPct);
                const hollow = r.thin || r.partial;
                const flag = [r.thin ? 'thin' : null, r.partial ? 'partial' : null].filter(Boolean).join(' ') || 'plotted';
                const common = {
                  'data-mark': 'point',
                  'data-portal': pt,
                  'data-year': r.row.year,
                  'data-flag': flag,
                  fill: hollow ? 'none' : colour,
                  stroke: colour,
                  strokeWidth: 1.5,
                  // Hollow marks still answer the pointer (the hover thickens the stroke). A mark
                  // carries no tooltip: every number it stands for is in the twin below.
                  style: { pointerEvents: 'all' as const },
                  className: 'hover:[stroke-width:3px]',
                };
                return pt === 'central' ? (
                  <circle key={r.row.year} cx={cx} cy={cy} r={4} {...common} />
                ) : (
                  <rect key={r.row.year} x={cx - 3.5} y={cy - 3.5} width={7} height={7} {...common} />
                );
              })}
              {lastMark && (
                <text x={x(Number(lastMark.row.year)) + 9} y={y(lastMark.row.singleBidderPct) + 4} fontSize={11} fill={colour}>
                  {pt}
                </text>
              )}
            </g>
          );
        })}
        <defs>
          <pattern id="cppp-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#101116" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(201,168,108,0.30)" strokeWidth="1.1" />
          </pattern>
        </defs>
        <text x={x(scrapeYear)} y={H - 10} fontSize={10} fill="#b8b8b8" textAnchor="end">
          {`${scrapeYear} ${partialLabel(p)}`}
        </text>
      </svg>
    </div>
  );
}

export default function Rates({ core, p, params }: { core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const rates = core.rates!;
  const [status, copy] = useCopy();
  const scrapeYear = scrapeYearOf(p, rates);
  const plans: Record<Portal, YearPlan[]> = { central: planYears(rates, 'central', scrapeYear), state: planYears(rates, 'state', scrapeYear) };
  const notPlotted = PORTALS.reduce((s, pt) => s + plans[pt].filter((y) => !y.plotted).length, 0);
  const notPlottedList = PORTALS.flatMap((pt) => plans[pt].filter((y) => !y.plotted).map((y) => `${pt} ${y.row.year}: ${y.reason}`));
  const names = STATES.map((s) => s.name);
  const split = splitStates(rates, names);
  const k = split.matched.length;
  const u = split.unlisted.length;
  // "k appear" is true of the §3.2a table; the rest are unlisted, not absent, because that
  // table is thresholded at n ≥ 30. The sentence after it says how far the gap can be closed.
  const statuses = split.unlisted.map((n) => unlistedStatus(core.quality, n, names));
  const pooledOnly = pooledOnlyNames(core.quality, rates);
  const unlistedLine = !u
    ? ''
    : core.quality?.organisations.statePortalNames
      ? ` Of the other ${u}, ${statuses.filter((x) => x.kind === 'pooled').length} are on the portal with only buyers below n = 30 and ${statuses.filter((x) => x.kind === 'absent').length} are not on it.`
      : pooledOnly != null
        ? ` They are the states with a buyer at n ≥ 30. Smaller buyers are pooled, and ${pooledOnly} state-portal names appear only in the pooled row, so up to ${Math.min(pooledOnly, u)} of the other ${u} may be on the portal.`
        : ` They are the states with a buyer at n ≥ 30. Smaller buyers are pooled, so any of the other ${u} may be on the portal.`;
  const sb = core.redflags?.indicators.find((i) => i.indicator === 'singleBidding');
  const c = sb?.byPortal.find((b) => b.portal === 'central');
  const s = sb?.byPortal.find((b) => b.portal === 'state');
  const source = p.dataset?.name ?? 'dataset origin not yet a field';
  const figure =
    sb && c && s && hasInterval(sb.wilson95)
      ? `${fmt(sb.count)} of ${fmt(sb.familySize)} award decisions (${sb.ratePct}%, 95% interval ${sb.wilson95[0]} to ${sb.wilson95[1]}) received one bid. ` +
        `Central portal: ${fmt(c.count)} of ${fmt(c.familySize)} (${c.ratePct}%); state portal: ${fmt(s.count)} of ${fmt(s.familySize)} (${s.ratePct}%). ` +
        `Dataset-only; scraped ${scrapedLabel(p)}; computed ${p.asOf}; source: ${source}.`
      : null;
  const pydiff = core.quality?.dates.portalYearDiffersFromAocYear;

  return (
    <Sub id="cppp-rates" title="Rates by portal and AOC year">
      {figure ? (
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <p data-figure className="font-mono tabular-nums text-[13px] leading-relaxed text-text max-w-[80ch]">
            {figure}
          </p>
          <button
            type="button"
            // The innocent reading travels with the figure: a quote of the rate cannot leave
            // the page without the reading in which nobody did anything wrong (U11).
            onClick={() => copy(`${figure}\n${sb!.innocentReading}\n${sourceLine(p)}`, 'Figure copied, with its innocent reading and citation.')}
            className={`btn-ghost !px-2 !py-0.5 font-mono !text-[11px] ${FOCUS}`}
          >
            Copy figure
          </button>
          <span role="status" aria-live="polite" className={MONO_NOTE}>
            {status}
          </span>
          {/* Directly after the figure (U11), at findings size, which is never smaller than
              the figure: the first rate the reader meets is not louder than its boring
              explanation, on a phone included (AC-85). */}
          <p data-innocent className={`basis-full ${FINDINGS} max-w-[80ch]`}>
            {sb!.innocentReading}
          </p>
        </div>
      ) : (
        <p className={MONO_NOTE}>The single-bidding indicator is not present in this build, so the figure sentence is not composed.</p>
      )}

      <figure className="mt-4">
        <Chart plans={plans} scrapeYear={scrapeYear} p={p} notPlotted={notPlotted} denomN={rates.denominatorN} />
        <figcaption className="mt-3 space-y-2 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
          <div className="space-y-2">
            <p>{RATES_CAPTION_1}</p>
            <p>{RATES_CAPTION_2}</p>
            <p>
              The state portal is not India's states: {k} of {STATES.length} states and UTs appear (see <JumpLink id="cppp-states">§3.2a</JumpLink>).
              {unlistedLine}
            </p>
          </div>
          <p className={MONO_NOTE}>
            Years are AOC years. The quality table counts rows by portal year
            {pydiff != null ? `, and ${fmt(pydiff)} raw rows differ between the two` : '; how many rows differ between the two is not present in this build'}.
            A year whose n is below half of that portal's median n over its plotted years is drawn hollow with no line into or out of it: its
            interval is shown and its slope is not to be read. The scrape year {scrapeYear} is drawn hollow and labelled partial
            {p.scrapedAt?.value ? '.' : '. Without a scrape date, the partial year is taken as the latest AOC year with n ≥ 30.'}{' '}
            {notPlotted} rows not plotted{notPlottedList.length ? ` (${notPlottedList.join('; ')})` : ''}; each is listed in the tables below.{' '}
            {rates.byPortalTenderType === undefined
              ? 'Tender-type composition per portal is not emitted by the pipeline, so the change in mix behind each line cannot be shown.'
              : 'Tender-type composition per portal is emitted but not yet drawn in this build.'}
          </p>
          <p className={MONO_NOTE}>
            {stamp(p)} · over the <FamilyLink>rates denominator family</FamilyLink>
          </p>
        </figcaption>
      </figure>

      <p className="mt-4 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
        Denominator: {rates.denominator} — n = {fmt(rates.denominatorN)} award decisions;{' '}
        {fmt(rates.excludedFromDenominator.bidsNullOrZeroOrOver1000)} excluded (a null, zero or over-1,000 bid count) from the{' '}
        {fmt(rates.excludedFromDenominator.afterDedupRows)} after dedup. {rates.rateDefinition}.
      </p>

      {PORTALS.map((pt) => {
        const rows = plans[pt];
        const plottedN = rows.filter((y) => y.plotted).reduce((a, y) => a + y.row.n, 0);
        const n = rows.reduce((a, y) => a + y.row.n, 0);
        const np = rows.filter((y) => !y.plotted).length;
        return (
          <Twin
            key={pt}
            twin={`rates-${pt}`}
            label={`Rates by AOC year, ${pt} portal`}
            describedBy="cppp-caveat"
            caption={
              <>
                Single-bidder rate by AOC year, {pt} portal · n = {fmt(n)} award decisions in {rows.length} rows, {np} not plotted · {stamp(p)} ·{' '}
                <FamilyLink>family</FamilyLink>
              </>
            }
            head={
              <Cols
                names={['AOC year', 'n', "share of the portal's plotted n", 'single-bidder awards', 'single-bidder %', '95% interval (Wilson), %', 'interval width, points', 'mean bids', 'median bids', 'flag']}
              />
            }
            download={{
              filename: csvName(`rates-${pt}`, p),
              comments: csvComments(core, p, rates.denominator, n, params),
              columns: ['portal', 'aoc_year', 'n', 'share_of_plotted_n_pct', 'single_bidder', 'single_bidder_pct', 'wilson95_lo', 'wilson95_hi', 'mean_bids', 'median_bids', 'status'],
              rows: () =>
                rows.map((y) => [
                  pt, y.row.year, String(y.row.n), y.plotted ? String((100 * y.row.n) / plottedN) : '', String(y.row.singleBidder), String(y.row.singleBidderPct),
                  hasInterval(y.row.wilson95) ? String(y.row.wilson95[0]) : '', hasInterval(y.row.wilson95) ? String(y.row.wilson95[1]) : '',
                  y.row.meanBids == null ? '' : String(y.row.meanBids), y.row.medianBids == null ? '' : String(y.row.medianBids),
                  y.plotted ? flagOf(y) : `not plotted: ${y.reason}`,
                ]),
            }}
          >
            {rows.map((y) => (
              <tr key={y.row.year} data-not-plotted={y.plotted ? undefined : ''}>
                <th scope="row">
                  {pt} {y.row.year}
                  {y.partial ? ` ${partialLabel(p)}` : ''}
                  {!y.plotted ? ' · not plotted' : ''}
                </th>
                <td className="font-mono tabular-nums">{fmt(y.row.n)}</td>
                <td className="font-mono tabular-nums">{y.plotted ? `${((100 * y.row.n) / plottedN).toFixed(2)}%` : '—'}</td>
                <td className="font-mono tabular-nums">{fmt(y.row.singleBidder)}</td>
                <td className="font-mono tabular-nums">{y.row.singleBidderPct}%</td>
                <td className="font-mono tabular-nums">{ivCell(y.row.wilson95)}</td>
                <td className="font-mono tabular-nums">{ivWidth(y.row.wilson95)}</td>
                <td className="font-mono tabular-nums">{y.row.meanBids ?? '—'}</td>
                <td className="font-mono tabular-nums">{y.row.medianBids ?? '—'}</td>
                <td>{flagOf(y)}</td>
              </tr>
            ))}
          </Twin>
        );
      })}
    </Sub>
  );
}
