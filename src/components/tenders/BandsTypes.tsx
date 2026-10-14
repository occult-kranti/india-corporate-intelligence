import type { ReactNode } from 'react';
import type { CpppCore, KeyRow, Provenance } from '../../data/cppp';
import {
  Cols, FamilyLink, GREY, MONO_NOTE, NODATA_STYLE, Sub, Twin, csvComments, csvName, fmt, hasInterval, inr, ivCell, stamp, useWidth,
} from './ui';

/**
 * §3.3 — single-bidder rates by declared value band and by tender type (U12). The rows
 * the pipeline could not value are a separate hatched group, never a sixth band, so
 * they cannot be said to have been dropped nor read as a band. The type axis mixes
 * category (Works, Goods, Services) with one method (Limited), and says so.
 */

const TYPE_ORDER = ['Works', 'Goods', 'Services', 'Limited', 'Other/unknown'];

interface BarSpec {
  row: KeyRow;
  label: string;
  nodata?: boolean;
}

function Bars({
  groups,
  aria,
  axis,
  max,
}: {
  groups: { heading?: string; nodata?: boolean; bars: BarSpec[]; rule?: boolean }[];
  aria: string;
  axis?: string;
  max: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>(720);
  const W = Math.max(300, width);
  const LAB = 108;
  const TXT = W < 520 ? 118 : 200;
  const rowH = 30;
  const x = (v: number) => LAB + (v / max) * (W - LAB - TXT);
  let yCursor = axis ? 22 : 8;
  const laid = groups.map((g) => {
    const top = yCursor + (g.heading ? 18 : 0) + (g.rule ? 14 : 0);
    yCursor = top + g.bars.length * rowH + 8;
    return { g, top };
  });
  const H = yCursor + 6;
  return (
    <div ref={ref} className="w-full">
      <svg role="img" aria-label={aria} width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block font-mono">
        <defs>
          <pattern id="cppp-bar-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#101116" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(201,168,108,0.30)" strokeWidth="1.1" />
          </pattern>
        </defs>
        {axis && (
          <text x={0} y={12} fontSize={10.5} fill="#b8b8b8">
            {axis}
          </text>
        )}
        {laid.map(({ g, top }, gi) => (
          <g key={gi} data-nodata={g.nodata ? '' : undefined}>
            {g.rule && <line x1={0} x2={W} y1={top - (g.heading ? 26 : 6)} y2={top - (g.heading ? 26 : 6)} stroke={GREY.axis} strokeWidth={1} />}
            {g.heading && (
              <text x={0} y={top - 6} fontSize={10.5} fill="#c9a86c">
                {g.heading}
              </text>
            )}
            {g.bars.map((b, i) => {
              const y = top + i * rowH;
              const w = b.row.wilson95;
              return (
                <g
                  key={b.row.key}
                  data-mark="bar"
                  data-key={b.row.key}
                  data-flag={b.nodata ? 'nodata' : 'plotted'}
                  data-nodata={b.nodata ? '' : undefined}
                  fill={b.nodata ? 'url(#cppp-bar-hatch)' : GREY.bar}
                >
                  <text x={0} y={y + 14} fontSize={11} fill="#d0d0d0">
                    {b.label}
                  </text>
                  <rect x={LAB} y={y + 4} width={Math.max(1, x(b.row.singleBidderPct) - LAB)} height={14} fill={b.nodata ? 'url(#cppp-bar-hatch)' : GREY.bar} stroke={b.nodata ? '#9e9e9e' : 'none'} strokeWidth={0.75} />
                  {hasInterval(w) && (
                    <line x1={x(w[0])} x2={x(w[1])} y1={y + 11} y2={y + 11} stroke="#f0f0f0" strokeWidth={1.5} />
                  )}
                  <text x={W - TXT + 6} y={y + 11} fontSize={10.5} fill="#d0d0d0">
                    {`${b.row.singleBidderPct}% · n = ${fmt(b.row.n)}`}
                  </text>
                  <text x={W - TXT + 6} y={y + 23} fontSize={9.5} fill="#9a9a9a">
                    {hasInterval(w) ? `interval ${w[0]} to ${w[1]}` : 'interval not computed'}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}

const rateCells = (r: KeyRow): ReactNode[] => [
  <td key="n" className="font-mono tabular-nums">{fmt(r.n)}</td>,
  <td key="s" className="font-mono tabular-nums">{fmt(r.singleBidder)}</td>,
  <td key="p" className="font-mono tabular-nums">{r.singleBidderPct}%</td>,
  <td key="i" className="font-mono tabular-nums">{ivCell(r.wilson95)}</td>,
  <td key="m" className="font-mono tabular-nums">{r.meanBids ?? '—'}</td>,
  <td key="d" className="font-mono tabular-nums">{r.medianBids ?? '—'}</td>,
];
const rateCsv = (r: KeyRow) => [
  String(r.n), String(r.singleBidder), String(r.singleBidderPct),
  hasInterval(r.wilson95) ? String(r.wilson95[0]) : '', hasInterval(r.wilson95) ? String(r.wilson95[1]) : '',
  r.meanBids == null ? '' : String(r.meanBids), r.medianBids == null ? '' : String(r.medianBids),
];
const RATE_COLS = ['n', 'single-bidder awards', 'single-bidder %', '95% interval (Wilson), %', 'mean bids', 'median bids'];
const RATE_CSV = ['n', 'single_bidder', 'single_bidder_pct', 'wilson95_lo', 'wilson95_hi', 'mean_bids', 'median_bids'];

export default function BandsTypes({ core, p, params }: { core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const rates = core.rates!;
  const q = core.quality;
  const nonOpen = core.redflags?.indicators.find((i) => i.indicator === 'nonOpenTenderType');
  const defs = new Map(p.valueBandsInr.map((b) => [b.band, b]));
  const bands = rates.byValueBand.filter((b) => defs.has(b.key));
  const unusable = rates.byValueBand.filter((b) => !defs.has(b.key));
  const types = [
    ...TYPE_ORDER.filter((k) => k !== 'Other/unknown').map((k) => rates.byTenderType.find((t) => t.key === k)).filter((t): t is KeyRow => !!t),
    ...rates.byTenderType.filter((t) => !TYPE_ORDER.includes(t.key)),
    ...rates.byTenderType.filter((t) => t.key === 'Other/unknown'),
  ];
  const category = types.filter((t) => ['Works', 'Goods', 'Services'].includes(t.key));
  const method = types.filter((t) => !['Works', 'Goods', 'Services'].includes(t.key));
  const hiMax = (rs: KeyRow[]) => Math.max(10, ...rs.map((r) => (hasInterval(r.wilson95) ? r.wilson95[1] : r.singleBidderPct)));
  const lastMedian = unusable[unusable.length - 1]?.medianBids;
  const bandText = (b: { band: string; lo: number; hi: number | null }) => `${b.band}: ${inr(b.lo)} to ${b.hi == null ? 'no upper bound' : inr(b.hi)}`;
  const n = rates.denominatorN;

  return (
    <Sub id="cppp-bands" title="Value bands and tender types">
      <figure>
        <Bars
          aria={`Single-bidder rate by declared value band, n = ${fmt(n)} award decisions, with the rows that carry no usable value shown apart; table follows.`}
          max={Math.ceil(hiMax(rates.byValueBand) / 10) * 10}
          groups={[
            { bars: bands.map((row) => ({ row, label: row.key })) },
            ...(unusable.length ? [{ heading: 'rows with no usable value', nodata: true, rule: true, bars: unusable.map((row) => ({ row, label: 'no usable value', nodata: true })) }] : []),
          ]}
        />
        <figcaption className="mt-3 space-y-2 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
          {unusable.length > 0 && (
            <p>
              This is a rate over rows the pipeline could not value, not over a value band. In this scrape a missing value and a single bid travel
              together (median bids {String(lastMedian)}). It is shown so it cannot be said to have been dropped.{' '}
              {rates.byPortalTenderType === undefined
                ? 'Its composition by portal and tender type is not emitted by the pipeline, so nothing is said about why.'
                : 'Its composition by portal and tender type is emitted but not yet drawn in this build.'}
            </p>
          )}
          <p className={MONO_NOTE}>
            Rows with no usable value: <span className="font-mono">{q?.contractValue.implausibleRule ?? 'the rule is not present in this build'}</span>
          </p>
          <p className={MONO_NOTE}>Band thresholds, from provenance: {p.valueBandsInr.map(bandText).join(' · ')}.</p>
          <p className={MONO_NOTE}>
            {stamp(p)} · over the <FamilyLink>rates denominator family</FamilyLink>
          </p>
        </figcaption>
      </figure>

      <Twin
        twin="bands"
        label="Rates by value band"
        describedBy="cppp-caveat"
        caption={
          <>
            Single-bidder rate by declared value band · n = {fmt(rates.byValueBand.reduce((a, b) => a + b.n, 0))} award decisions in{' '}
            {rates.byValueBand.length} rows, the last not a band · {stamp(p)} · <FamilyLink>family</FamilyLink>
          </>
        }
        head={<Cols names={['band', 'lower bound (₹)', 'upper bound (₹)', ...RATE_COLS, 'flag']} />}
        download={{
          filename: csvName('bands', p),
          comments: csvComments(core, p, rates.denominator, n, params),
          columns: ['band', 'lower_bound_inr', 'upper_bound_inr', ...RATE_CSV, 'status'],
          rows: () =>
            rates.byValueBand.map((b) => {
              const d = defs.get(b.key);
              return [b.key, d ? String(d.lo) : '', d?.hi != null ? String(d.hi) : '', ...rateCsv(b), d ? 'value band' : 'not a value band'];
            }),
        }}
      >
        {rates.byValueBand.map((b) => {
          const d = defs.get(b.key);
          const style = d ? undefined : NODATA_STYLE;
          return (
            <tr key={b.key} data-nodata={d ? undefined : ''}>
              <th scope="row" style={style}>
                {b.key}
              </th>
              <td className="font-mono tabular-nums">{d ? inr(d.lo) : '—'}</td>
              <td className="font-mono tabular-nums">{d ? (d.hi == null ? 'no upper bound' : inr(d.hi)) : '—'}</td>
              {rateCells(b)}
              <td>{d ? 'value band' : 'not a value band: value missing or implausible'}</td>
            </tr>
          );
        })}
      </Twin>

      <figure className="mt-8">
        <Bars
          aria={`Single-bidder rate by tender type, n = ${fmt(n)} award decisions; Limited is a method, the rest are categories; table follows.`}
          axis="category, and one method"
          max={Math.ceil(hiMax(rates.byTenderType) / 10) * 10}
          groups={[
            { bars: category.map((row) => ({ row, label: row.key })) },
            { rule: true, bars: method.map((row) => ({ row, label: row.key })) },
          ]}
        />
        <figcaption className="mt-3 space-y-2 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
          <p>{q?.tenderType.note ?? 'The tender-type note is not present in this build.'}</p>
          <p className={MONO_NOTE}>
            {stamp(p)} · over the <FamilyLink>rates denominator family</FamilyLink>
          </p>
        </figcaption>
      </figure>
      {nonOpen && (
        <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-[76ch]">
          The Limited rate is a floor: {nonOpen.note}
          {nonOpen.nonOpenLabelsLeftInOtherUnknown &&
            ` (${fmt(nonOpen.nonOpenLabelsLeftInOtherUnknown.n)} award decisions carry such labels, in ${fmt(nonOpen.nonOpenLabelsLeftInOtherUnknown.distinct_labels)} spellings, and sit in Other/unknown).`}
        </p>
      )}

      <Twin
        twin="types"
        label="Rates by tender type"
        describedBy="cppp-caveat"
        caption={
          <>
            Single-bidder rate by tender type, categories above the rule and one method below · n = {fmt(rates.byTenderType.reduce((a, b) => a + b.n, 0))}{' '}
            award decisions · {stamp(p)} · <FamilyLink>family</FamilyLink>
          </>
        }
        head={<Cols names={['tender type', ...RATE_COLS]} />}
        download={{
          filename: csvName('types', p),
          comments: csvComments(core, p, rates.denominator, n, params),
          columns: ['tender_type', ...RATE_CSV, 'status'],
          rows: () => [
            ...category.map((t) => [t.key, ...rateCsv(t), 'category']),
            ['', '', '', '', '', '', '', '', 'rule: below it, Limited (a method) and Other/unknown'],
            ...method.map((t) => [t.key, ...rateCsv(t), t.key === 'Limited' ? 'method' : 'category or method unknown']),
          ],
        }}
      >
        {category.map((t) => (
          <tr key={t.key}>
            <th scope="row">{t.key}</th>
            {rateCells(t)}
          </tr>
        ))}
        <tr>
          <td colSpan={7} className="font-mono text-[10.5px] !text-text-muted">
            below this rule: Limited (a method) and Other/unknown
          </td>
        </tr>
        {method.map((t) => (
          <tr key={t.key}>
            <th scope="row">{t.key}</th>
            {rateCells(t)}
          </tr>
        ))}
      </Twin>
    </Sub>
  );
}
