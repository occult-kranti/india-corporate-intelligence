import type { ReactNode } from 'react';
import { onStatePortal, unlistedStatus, type CpppCore, type Indicator, type OrgRow, type Provenance } from '../../data/cppp';
import { STATES } from '../../data/geo';
import type { Patch } from '../energy/hooks';
import type { NationalParams } from './params';
import {
  Code, Cols, FINDINGS, FOCUS, FamilyLink, MONO_NOTE, NODATA_STYLE, StateFilterLine, Sub, Twin, UnparsedKey, WbrText, csvComments, csvName, d1, fmt,
  hasInterval, isUnparsed, ivCell, rateText, stamp, stateClause, stateFilterSentence, unparsedLabel,
} from './ui';

/**
 * §3.5 — Fazekas-style indicators, each a rate over its declared family, each followed
 * at the same size by the reading in which nobody did anything wrong (U11). Winners are
 * never listed here; the repeat-pair indicator counts pairs and names none. The one
 * table of names is of public bodies (buyers), and it says first that none of them was
 * asked for comment (U6).
 */

const H4: Record<string, string> = {
  singleBidding: 'Single bidding',
  nonOpenTenderType: 'Non-open tender type (Limited)',
  shortDecisionWindow: 'Short decision window (two days or fewer)',
  repeatSingleBidderMarkedWinners: 'Repeat single-bidder pairs (marked winners)',
};

const LIMITED_NOTE =
  "The state portal's tender_type field carries almost no Limited labels; its rate is a fact about the field before it is a fact about tendering.";
const NOT_ASKED = "No body listed here has been asked for comment. That is a weakness of this table, not a neutral fact. Each figure is a rate over the body's own awards, not a finding about it.";

const kebab = (s: string) => s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z]+/g, '-');

function Row({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] sm:grid-cols-[8rem_minmax(0,1fr)] gap-x-3 py-0.5">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-muted pt-1">{label}</dt>
      <dd className={className}>{children}</dd>
    </div>
  );
}

function Card({ ind, core, p, params }: { ind: Indicator; core: CpppCore; p: Provenance; params: URLSearchParams }) {
  const dedup = p.afterDedupRows;
  const title = H4[ind.indicator];
  return (
    <section className="mt-6 border-l-2 border-border-light pl-3 sm:pl-4">
      <h4 className="font-semibold text-[15.5px] text-text mb-2">{title ?? <code>{ind.indicator}</code>}</h4>
      <dl className="space-y-1">
        <Row label="Definition" className="text-[13.5px] text-text-secondary">
          <Code>{ind.definition}</Code>
        </Row>
        <Row label="Family" className="text-[13.5px] leading-relaxed text-text-secondary">
          {ind.familyDefinition}. {fmt(ind.familySize)}, which is {d1((100 * ind.familySize) / dedup)}% of the {fmt(dedup)} award decisions after
          dedup.
        </Row>
        <Row label="Count" className="text-[13.5px] font-mono tabular-nums text-text-secondary">
          {fmt(ind.count)}
        </Row>
        <Row label="Rate" className={FINDINGS}>
          <span data-rate>{rateText(ind.count, ind.familySize, ind.ratePct, ind.wilson95)}</span>
        </Row>
        <Row label="Innocent reading" className={FINDINGS}>
          <span data-innocent>{ind.innocentReading}</span>
        </Row>
        <Row label="By portal">
          <Twin
            label={`${title ?? ind.indicator}, by portal`}
            minWidth="30rem"
            caption={
              <>
                {title ?? ind.indicator}, by portal · n = {fmt(ind.byPortal.reduce((a, b) => a + b.familySize, 0))} award decisions · {stamp(p)} ·{' '}
                <FamilyLink>family</FamilyLink>
              </>
            }
            head={<Cols names={['portal', 'family size', 'count', 'rate %', '95% interval (Wilson), %']} />}
            download={{
              filename: csvName(`byportal-${kebab(ind.indicator)}`, p),
              comments: csvComments(core, p, ind.familyDefinition, ind.familySize, params),
              columns: ['portal', 'family_size', 'count', 'rate_pct', 'wilson95_lo', 'wilson95_hi'],
              rows: () =>
                ind.byPortal.map((b) => [
                  b.portal, String(b.familySize), String(b.count), String(b.ratePct),
                  hasInterval(b.wilson95) ? String(b.wilson95[0]) : '', hasInterval(b.wilson95) ? String(b.wilson95[1]) : '',
                ]),
            }}
          >
            {ind.byPortal.map((b) => (
              <tr key={b.portal}>
                <th scope="row">{b.portal} portal</th>
                <td className="font-mono tabular-nums">{fmt(b.familySize)}</td>
                <td className="font-mono tabular-nums">{fmt(b.count)}</td>
                <td className="font-mono tabular-nums">{b.ratePct}%</td>
                <td className="font-mono tabular-nums">{ivCell(b.wilson95)}</td>
              </tr>
            ))}
          </Twin>
        </Row>
        {/* The Limited caveat is unconditional (spec §3.5): whether it shows must not hang
            on a cut-off this page would have chosen. */}
        {(ind.note || ind.indicator === 'nonOpenTenderType') && (
          <Row label="Note" className="text-[13.5px] leading-relaxed text-text-secondary">
            {ind.note}
            {/* The emitted note may end without a full stop; one is added so two sentences do not run on. */}
            {ind.indicator === 'nonOpenTenderType' && <>{ind.note && !/[.!?]$/.test(ind.note) ? '. ' : ind.note ? ' ' : ''}{LIMITED_NOTE}</>}
          </Row>
        )}
        {ind.pairs != null && (
          <Row label="Pairs" className="text-[13.5px] leading-relaxed text-text-secondary">
            pairs {fmt(ind.pairs)} · repeat pairs {fmt(ind.repeatPairs ?? 0)} · pairs counted, never listed
          </Row>
        )}
      </dl>
    </section>
  );
}

const byNThenKey = (a: OrgRow, b: OrgRow) => b.n - a.n || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

interface BuyerLine {
  portal: string;
  key: string;
  n: number;
  single: number;
  pct: number;
  wilson: OrgRow['wilson95'];
  note: string;
  unparsed: boolean;
}

export default function RedFlags({ core, p, params, np, patch }: { core: CpppCore; p: Provenance; params: URLSearchParams; np: NationalParams; patch: Patch }) {
  const rf = core.redflags!;
  const rates = core.rates;
  const sb = rf.indicators.find((i) => i.indicator === 'singleBidding');
  const inState = (key: string) => !np.state || key.startsWith(`${np.state} / `);
  const inPortal = (portal: string) => np.portal === 'all' || portal === np.portal;
  const names = STATES.map((s) => s.name);
  const stateUnknown = !!np.state && !!rates && !onStatePortal(core, np.state, names);
  const unparsed = isUnparsed;
  // The unparsed wording lives in the row header now (U6); the note column is the CSV's.
  const noteFor = (key: string) => (unparsed(key) ? unparsedLabel(key) : '');

  const top: BuyerLine[] = rf.singleBiddingByBuyer
    .filter((b) => inPortal(b.portal) && inState(b.buyer))
    .map((b) => ({ portal: b.portal, key: b.buyer, n: b.n, single: b.singleBidder, pct: b.singleBidderPct, wilson: b.wilson95, note: noteFor(b.buyer), unparsed: unparsed(b.buyer) }));
  const all = rates?.byOrganisation ?? [];
  const pooled = all.filter((r) => r.portal === 'all');
  const named = all.filter((r) => r.portal !== 'all' && inPortal(r.portal) && inState(r.key)).sort(byNThenKey);
  const showPooled = np.portal === 'all' && !np.state;
  const allLines: BuyerLine[] = [
    ...named.map((r) => ({ portal: r.portal, key: r.key, n: r.n, single: r.singleBidder, pct: r.singleBidderPct, wilson: r.wilson95, note: noteFor(r.key), unparsed: unparsed(r.key) })),
    ...(showPooled
      ? pooled.map((r) => ({ portal: 'all', key: r.key, n: r.n, single: r.singleBidder, pct: r.singleBidderPct, wilson: r.wilson95, note: rates!.byOrganisationPooling, unparsed: false }))
      : []),
  ];
  const lines = np.buyers === 'all' ? allLines : top;
  // The filter line's denominator: the buyers this table lists before the state filter.
  const unfiltered = np.buyers === 'all' ? all.filter((r) => r.portal !== 'all').length : rf.singleBiddingByBuyer.length;
  const shownBuyers = np.buyers === 'all' ? named.length : top.length;
  const fam = rf.singleBiddingByBuyerFamily;
  const frame = fam
    ? `${fmt(rf.singleBiddingByBuyer.length)} of ${fmt(fam.eligibleBuyers)} buyers with at least ${fmt(fam.threshold)} awards`
    : 'the number of eligible buyers is not yet a field';
  const effect =
    np.buyers === 'all'
      ? showPooled
        ? `${fmt(named.length)} buyers and the pooled row`
        : `${fmt(named.length)} buyers under this filter`
      : fam && lines.length === rf.singleBiddingByBuyer.length
        ? `${fmt(lines.length)} of ${fmt(fam.eligibleBuyers)} buyers`
        : `${fmt(lines.length)} of the ${fmt(rf.singleBiddingByBuyer.length)} named buyers shown; the number of eligible buyers is not yet a field`;
  const tenths = Array.from({ length: 10 }, (_, i) => ({ lo: i * 10, hi: i * 10 + 10, n: named.filter((r) => Math.min(9, Math.floor(r.singleBidderPct / 10)) === i).length }));
  const base = sb?.byPortal ?? [];
  const family = sb?.familyDefinition ?? 'single-bidder family not present in this build';

  const csvRows = () => [
    ...base.map((b) => [b.portal, `${b.portal} portal, every award in the family`, String(b.familySize), String(b.count), String(b.ratePct), hasInterval(b.wilson95) ? String(b.wilson95[0]) : '', hasInterval(b.wilson95) ? String(b.wilson95[1]) : '', 'not asked', 'portal base rate']),
    ...lines.map((l) => [l.portal, l.key, String(l.n), String(l.single), String(l.pct), hasInterval(l.wilson) ? String(l.wilson[0]) : '', hasInterval(l.wilson) ? String(l.wilson[1]) : '', 'not asked', l.note]),
  ];

  return (
    <Sub id="cppp-redflags" title="Red flags over their families">
      <p className="text-[14px] leading-relaxed text-text-secondary max-w-[72ch]">{rf.stance}</p>
      {rf.indicators.map((ind) => (
        <Card key={ind.indicator} ind={ind} core={core} p={p} params={params} />
      ))}

      <div className="mt-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-muted mb-2">Named buyers (public bodies), single-bidder rate over their own awards</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          <label className="font-mono text-[11px] text-text-muted flex items-center gap-2">
            buyers
            <select
              value={np.buyers}
              onChange={(e) => patch({ buyers: e.target.value === 'top25' ? null : e.target.value })}
              className={`input-field !py-1 !px-2 !text-[12px] !w-auto ${FOCUS}`}
            >
              <option value="top25">top25</option>
              <option value="all">all</option>
            </select>
          </label>
          <span data-effect className="font-mono text-[11px] text-text-secondary">
            {effect}
          </span>
        </div>
        {np.state && <StateFilterLine state={np.state} shown={shownBuyers} of={unfiltered} onClear={() => patch({ state: null })} />}
        {stateUnknown && <p className={`${FINDINGS} max-w-[72ch]`}>{stateFilterSentence(np.state!, unlistedStatus(core.quality, np.state!, names))}</p>}
        <p className={`${FINDINGS} max-w-[72ch]`}>{NOT_ASKED}</p>
        {sb && (
          <p data-innocent className={`${FINDINGS} max-w-[72ch]`}>
            {sb.innocentReading}
          </p>
        )}
        <Twin
          twin="buyers"
          label="Named buyers by single-bidder rate"
          describedBy="cppp-caveat"
          minWidth="46rem"
          pinTwo
          caption={
            <>
              {np.buyers === 'all' ? 'Every buyer in the rates file, by awards in the denominator' : 'The pipeline’s named buyers'} · n = {fmt(lines.length + base.length)}{' '}
              rows{np.state ? `, buyers limited to those${stateClause(np.state)}` : ''}, the first {base.length} the portal base rates · frame: {rf.singleBiddingByBuyerNote}; {frame} · {stamp(p)} · <FamilyLink>family</FamilyLink>
            </>
          }
          head={<Cols names={['portal', 'buyer', 'awards in denominator', 'single-bidder awards', 'single-bidder %', '95% interval (Wilson), %', 'response', 'note']} />}
          download={{
            filename: csvName('buyers', p),
            comments: csvComments(core, p, family, sb?.familySize ?? 0, params),
            columns: ['portal', 'buyer', 'awards_in_denominator', 'single_bidder', 'single_bidder_pct', 'wilson95_lo', 'wilson95_hi', 'response', 'note'],
            rows: csvRows,
          }}
        >
          {base.map((b) => (
            <tr key={`base-${b.portal}`}>
              <td>{b.portal}</td>
              <th scope="row">{b.portal} portal, every award in the family</th>
              <td className="font-mono tabular-nums">{fmt(b.familySize)}</td>
              <td className="font-mono tabular-nums">{fmt(b.count)}</td>
              <td className="font-mono tabular-nums">{b.ratePct}%</td>
              <td className="font-mono tabular-nums">{ivCell(b.wilson95)}</td>
              <td>not asked</td>
              <td>portal base rate</td>
            </tr>
          ))}
          {lines.map((l) => (
            <tr key={`${l.portal}-${l.key}`} data-nodata={l.unparsed ? '' : undefined}>
              <td>{l.portal}</td>
              <th scope="row" style={l.unparsed ? NODATA_STYLE : undefined}>
                {l.unparsed ? <UnparsedKey k={l.key} /> : <WbrText text={l.key} />}
              </th>
              <td className="font-mono tabular-nums">{fmt(l.n)}</td>
              <td className="font-mono tabular-nums">{fmt(l.single)}</td>
              <td className="font-mono tabular-nums">{l.pct}%</td>
              <td className="font-mono tabular-nums">{ivCell(l.wilson)}</td>
              <td>not asked</td>
              <td className="text-[12.5px]">{l.unparsed ? '' : l.note}</td>
            </tr>
          ))}
        </Twin>
        {np.buyers === 'all' && (
          <Twin
            twin="tenths"
            label="Buyers by tenth of the single-bidder rate"
            minWidth="20rem"
            caption={
              <>
                How many named buyers fall in each tenth of the single-bidder rate · n = {fmt(named.length)} buyers, the pooled row excluded · {stamp(p)} ·{' '}
                <FamilyLink>family</FamilyLink>
              </>
            }
            head={<Cols names={['tenth of the single-bidder rate', 'buyers']} />}
            download={{
              filename: csvName('tenths', p),
              comments: csvComments(core, p, family, named.length, params),
              columns: ['rate_from_pct', 'rate_to_pct', 'buyers'],
              rows: () => tenths.map((t) => [String(t.lo), String(t.hi), String(t.n)]),
            }}
          >
            {tenths.map((t) => (
              <tr key={t.lo}>
                <th scope="row">
                  {t.lo}–{t.hi}%
                </th>
                <td className="font-mono tabular-nums">{fmt(t.n)}</td>
              </tr>
            ))}
          </Twin>
        )}
        <p className={`${MONO_NOTE} mt-2 max-w-[72ch]`}>
          No rate sort is offered: ordering public bodies by a rate this page computes would be a ranking the platform does not make. The pipeline’s
          own top-25 selection is shown as emitted.
        </p>
      </div>
    </Sub>
  );
}
