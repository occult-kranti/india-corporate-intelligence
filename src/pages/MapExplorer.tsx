import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Kicker, PageTitle, Standfirst, Byline, Section, Callout, StatGrid, DataTable, Footnote } from '../components/Editorial';
import IndiaMap, { type MapMark, type ScaleMode } from '../components/viz/IndiaMap';
import {
  COMPANIES, COMPANIES_AS_OF, COMPANY_SOURCES, COMPANY_GAPS, STATES_WITH_NO_LISTED_HQ,
  ECONOMY_BY_STATE, rollupByState, sectorTotals, hhi, type Company,
} from '../data/companies';
import { STATES, STATE_NAMES } from '../data/geo';
import { ministersByState } from '../data/politics';
import { INDEX_KEYS, INDEX_LABEL, INDICES_AS_OF, indexCoverage, membershipOf, type IndexKey } from '../data/indices';
import type { StateCode } from '../graph/schema';

/**
 * The NSE/BSE map.
 *
 * Real 36-state geometry, quantile choropleth by default (Indian state market cap
 * is extremely heavy-tailed — a linear ramp renders thirty states identical), and
 * an explicit no-data hatch so a grey state reads as "not measured", never "zero".
 */

type Metric = 'mcap' | 'count' | 'psu' | 'gsdp' | 'hhi';
type Exchange = 'both' | 'NSE' | 'BSE';

const METRICS: { id: Metric; label: string; unit: string; note: string }[] = [
  { id: 'mcap', label: 'Listed market cap', unit: '₹ cr', note: 'Sum of recorded market caps of companies registered in the state.' },
  { id: 'count', label: 'Listed companies', unit: 'companies', note: 'Count of companies in the dataset registered in the state.' },
  { id: 'psu', label: 'Public-sector share', unit: '%', note: 'Share of the state’s listed companies that are central or state PSUs.' },
  { id: 'gsdp', label: 'State GSDP', unit: '₹ cr', note: 'Gross state domestic product, where a verifiable figure exists.' },
  { id: 'hhi', label: 'Sector concentration', unit: 'HHI', note: 'Herfindahl–Hirschman index over sector market cap within the state. A structural measure, not an allegation.' },
];

const fmtCr = (v: number) => (v >= 100000 ? `${(v / 100000).toFixed(2)} lakh cr` : `${Math.round(v).toLocaleString('en-IN')} cr`);

/**
 * Index membership per company, joined on `co:<id>` only, built once. The filter and
 * the caption both read it, so the count the caption prints is the count on the map.
 */
const INDEX_OF = new Map<string, IndexKey[]>(COMPANIES.map((c) => [c.id, membershipOf(`co:${c.id}`)]));
/** "n of N confirmed" per index — printed on the control and under the map. */
const COVERAGE = new Map(indexCoverage().map((x) => [x.key, x]));
/** "one" reads as a sentence; larger shortfalls stay numerals. */
const countWord = (n: number) => (n === 1 ? 'one' : String(n));

/** URL defaults. A param equal to its default is removed, so the bare `/map` is the default view. */
const DEFAULTS = { metric: 'mcap', exchange: 'both', sector: 'all', scale: 'quantile', marks: 'shown' } as const;
const EXCHANGES: Exchange[] = ['both', 'NSE', 'BSE'];
const SCALES: ScaleMode[] = ['quantile', 'log', 'linear'];
const MARKS = ['shown', 'hidden'] as const;
/** Built once: the sector control and the URL parser read the same list. */
const SECTORS = sectorTotals().map((s) => s.sector);

export default function MapExplorer() {
  const [selected, setSelected] = useState<StateCode | null>(null);

  // Every filter lives in the URL, so any map view is shareable and the Dashboard's
  // coverage tiles (and any reader) can link straight to e.g. `/map?idx=<key>`.
  // A param at its default is removed; replace: true keeps filter clicks out of history.
  const [params, setParams] = useSearchParams();
  const setParam = useCallback(
    (k: keyof typeof DEFAULTS | 'idx', v: string | null) => {
      const next = new URLSearchParams(params);
      if (v == null || v === '' || (k !== 'idx' && v === DEFAULTS[k])) next.delete(k);
      else next.set(k, v);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );
  // Only a known value applies. An unknown one falls back to the default and is
  // reported under the map, never silently read as "no match" (an unknown sector or
  // index would hatch every state and read as a finding).
  const unrecognised: [string, string][] = [];
  const pick = <T extends string>(k: keyof typeof DEFAULTS | 'idx', allowed: readonly T[], fallback: T | null): T | null => {
    const raw = params.get(k);
    if (raw == null) return fallback;
    const hit = allowed.find((a) => a === raw);
    if (hit === undefined) {
      unrecognised.push([k, raw]);
      return fallback;
    }
    return hit;
  };
  const metric = pick<Metric>('metric', METRICS.map((m) => m.id), DEFAULTS.metric)!;
  const exchange = pick<Exchange>('exchange', EXCHANGES, DEFAULTS.exchange)!;
  const sector = pick<string>('sector', ['all', ...SECTORS], DEFAULTS.sector)!;
  const scaleMode = pick<ScaleMode>('scale', SCALES, DEFAULTS.scale)!;
  const showMarks = pick('marks', MARKS, DEFAULTS.marks) === 'shown';
  const idx: IndexKey | null = pick<IndexKey>('idx', INDEX_KEYS, null);

  const sectors = SECTORS;

  // Exchange and sector first, index second, so the caption can say what the index
  // filter itself removed rather than what all filters removed together.
  const preIndex = useMemo(
    () =>
      COMPANIES.filter(
        (c) =>
          (exchange === 'both' || (exchange === 'NSE' ? !!c.nse : !!c.bse)) &&
          (sector === 'all' || c.sector === sector),
      ),
    [exchange, sector],
  );
  const filtered = useMemo(
    () => (idx ? preIndex.filter((c) => (INDEX_OF.get(c.id) ?? []).includes(idx)) : preIndex),
    [preIndex, idx],
  );
  const idxCov = idx ? COVERAGE.get(idx) : undefined;
  const narrowed = exchange !== 'both' || sector !== 'all' || idx != null;

  const rollup = useMemo(() => rollupByState(filtered), [filtered]);
  const ministers = useMemo(() => ministersByState(), []);

  const mapData = useMemo(() => {
    const d: Partial<Record<StateCode, { value: number | null; detail?: string }>> = {};
    for (const s of STATES) {
      const r = rollup.get(s.id);
      const econ = ECONOMY_BY_STATE.get(s.id);
      let value: number | null = null;
      if (metric === 'gsdp') value = econ?.gsdpCr ?? null;
      else if (!r) value = null;
      else if (metric === 'mcap') value = r.totalMcapCr || null;
      else if (metric === 'count') value = r.count;
      else if (metric === 'psu') value = r.count ? Math.round((r.psuCount / r.count) * 100) : null;
      else if (metric === 'hhi') value = r.topSectors.length ? Math.round(hhi(r.topSectors.map((t) => t.mcapCr))) : null;

      const bits: string[] = [];
      if (r) bits.push(`${r.count} listed · ${r.nseCount} NSE · ${r.bseCount} BSE`);
      if (r?.mcapGaps) bits.push(`${r.mcapGaps} without a recorded market cap`);
      const mins = ministers.get(s.id)?.length ?? 0;
      if (mins) bits.push(`${mins} union minister${mins === 1 ? '' : 's'}`);
      d[s.id] = { value, detail: bits.join(' · ') || undefined };
    }
    return d;
  }, [rollup, metric, ministers]);

  const marks: MapMark[] = useMemo(
    () =>
      filtered
        .slice()
        .sort((a, b) => (b.marketCapCr ?? 0) - (a.marketCapCr ?? 0))
        .slice(0, 220)
        .map((c) => ({
          id: c.id,
          label: c.shortName || c.name,
          state: c.stateCode,
          weight: c.marketCapCr ?? 0,
          kind: c.ownership.startsWith('psu') ? 'psu' : 'company',
          exchanges: [c.nse ? 'NSE' : null, c.bse ? 'BSE' : null].filter(Boolean) as ('NSE' | 'BSE')[],
        })),
    [filtered],
  );

  const sel = selected ? rollup.get(selected) : null;
  const selEcon = selected ? ECONOMY_BY_STATE.get(selected) : null;
  const activeMetric = METRICS.find((m) => m.id === metric)!;

  const totalMcap = filtered.reduce((a, c) => a + (c.marketCapCr ?? 0), 0);
  const statesCovered = rollup.size;
  const noData = 36 - statesCovered;
  const topState = [...rollup.values()].sort((a, b) => b.totalMcapCr - a.totalMcapCr)[0];
  const concentration = topState && totalMcap ? (topState.totalMcapCr / totalMcap) * 100 : 0;

  return (
    <article className="pb-20">
      <header className="pt-2 pb-6 border-b-2 border-border-light">
        <Kicker>Market layer · registered headquarters, not operational footprint</Kicker>
        <PageTitle>The NSE and BSE map of India</PageTitle>
        <Standfirst>
          Every state and union territory, drawn from real boundary geometry, shaded by what is actually
          listed there. The distribution is the finding: a small number of states carry almost all listed
          market capitalisation, which is why the default scale is quantile-binned — a linear ramp would
          render thirty states identical and hide the thing worth seeing.
        </Standfirst>
        <Byline>
          {COMPANIES.length} companies · as of {COMPANIES_AS_OF || 'dataset date'} · 36 states and UTs ·
          market caps are as-of, never current
        </Byline>
      </header>

      {COMPANIES.length === 0 ? (
        <Callout label="Company dataset not yet loaded" tone="warn">
          <p>
            The map geometry and the interaction layer are live, but no company records are present in{' '}
            <code>research/raw/companies-by-state.json</code> yet. Rather than render plausible-looking
            placeholder figures, the map shows every state as <strong>no data</strong> — which is the honest
            state of the world right now.
          </p>
        </Callout>
      ) : (
        <StatGrid
          items={[
            { value: `₹${(totalMcap / 100000).toFixed(1)}L cr`, label: 'total recorded listed market cap in view' },
            { value: String(filtered.length), label: `companies in view (${exchange === 'both' ? 'NSE + BSE' : exchange}${idx ? ` · ${INDEX_LABEL[idx]}` : ''})` },
            // With nothing in view there is no top state; print the absence, not "0%".
            { value: topState ? `${concentration.toFixed(0)}%` : '—', label: `carried by ${topState ? STATE_NAMES[topState.stateCode] : 'no state — nothing in view'} alone`, tone: 'rose' },
            {
              value: `${noData}/36`,
              // Under a filter an empty state is usually filtered out, not unmeasured — the
              // index filter in particular empties most states, so the label must say which.
              label: narrowed
                ? 'states and UTs with no company in view under these filters — filtered out or unmeasured, not zero'
                : 'states and UTs with no company in the dataset — not zero, unmeasured',
              tone: 'muted',
            },
          ]}
        />
      )}

      <Section title="" note="">
        <div className="flex flex-wrap gap-4 mb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Metric</p>
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setParam('metric', m.id)}
                  aria-pressed={metric === m.id}
                  title={m.note}
                  className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                    metric === m.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Exchange</p>
            <div className="flex gap-1.5">
              {EXCHANGES.map((x) => (
                <button
                  key={x}
                  onClick={() => setParam('exchange', x)}
                  aria-pressed={exchange === x}
                  className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                    exchange === x ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {x === 'both' ? 'NSE + BSE' : x}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">
              Index · lists as of {INDICES_AS_OF}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {([null, ...INDEX_KEYS] as (IndexKey | null)[]).map((k) => {
                const cov = k ? COVERAGE.get(k) : undefined;
                return (
                  <button
                    key={k ?? 'all'}
                    onClick={() => setParam('idx', k)}
                    aria-pressed={idx === k}
                    title={
                      cov
                        ? `${cov.label}: ${cov.confirmed} of ${cov.expected} constituents confirmed, as of ${INDICES_AS_OF}`
                        : 'Every company, in or out of an index'
                    }
                    className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                      idx === k ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                    }`}
                  >
                    {k ? INDEX_LABEL[k] : 'All'}
                    {/* The denominator sits on the control: a short list says so before it is chosen. */}
                    {cov && (
                      <span className="opacity-60">
                        {' '}
                        {cov.confirmed}/{cov.expected}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Scale</p>
            <div className="flex gap-1.5">
              {SCALES.map((s) => (
                <button
                  key={s}
                  onClick={() => setParam('scale', s)}
                  aria-pressed={scaleMode === s}
                  className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                    scaleMode === s ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {sectors.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Sector</p>
              <select value={sector} onChange={(e) => setParam('sector', e.target.value)} className="input-field !py-1.5 !text-[12px] !w-auto">
                <option value="all">All sectors</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1.5">Marks</p>
            <button
              onClick={() => setParam('marks', showMarks ? 'hidden' : 'shown')}
              aria-pressed={showMarks}
              className={`font-mono text-[11px] px-2.5 py-1.5 rounded border transition-colors ${
                showMarks ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {showMarks ? 'shown' : 'hidden'}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="card-surface !p-4 min-w-0">
            <IndiaMap
              data={mapData}
              marks={showMarks ? marks : []}
              metricLabel={activeMetric.label}
              unit={activeMetric.unit}
              scaleMode={scaleMode}
              selected={selected}
              onSelect={setSelected}
              height={680}
              format={(v) => (metric === 'mcap' || metric === 'gsdp' ? fmtCr(v) : String(Math.round(v)))}
            />
            <p className="text-[12px] text-text-muted mt-3 max-w-[70ch]">{activeMetric.note}</p>
            {unrecognised.map(([k, v]) => (
              <p key={k} className="text-[12px] text-text-secondary mt-2 max-w-[70ch]">
                {k === 'idx'
                  ? `Unrecognised index “${v}” in the link — the index filter is off and every company is shown.`
                  : k === 'sector'
                    ? `Unrecognised sector “${v}” in the link — the sector filter is off and every sector is shown.`
                    : `Unrecognised ${k} “${v}” in the link — the default (${k === 'metric' ? METRICS.find((m) => m.id === DEFAULTS.metric)!.label : k === 'exchange' ? 'NSE + BSE' : DEFAULTS[k as keyof typeof DEFAULTS]}) is shown instead.`}
              </p>
            ))}
            {idx && idxCov && (
              <div className="text-[12px] text-text-secondary mt-2 max-w-[70ch] space-y-1 border-l-2 border-border-light pl-3">
                <p>
                  {INDEX_LABEL[idx]} filter kept <span className="font-mono">{filtered.length}</span> of{' '}
                  <span className="font-mono">{preIndex.length}</span> companies
                  {exchange !== 'both' || sector !== 'all' ? ' left by the exchange and sector filters' : ' in the dataset'}, against
                  the constituent list as of <span className="font-mono">{INDICES_AS_OF}</span>.
                </p>
                <p>
                  {idxCov.label}: <span className="font-mono">{idxCov.confirmed}</span> of{' '}
                  <span className="font-mono">{idxCov.expected}</span> constituents confirmed
                  {idxCov.confirmed < idxCov.expected
                    ? ` — ${countWord(idxCov.expected - idxCov.confirmed)} could not be verified and ${idxCov.expected - idxCov.confirmed === 1 ? 'is' : 'are'} not shown`
                    : ''}
                  {idxCov.unresolved > 0
                    ? `${idxCov.confirmed < idxCov.expected ? ';' : ' —'} ${countWord(idxCov.unresolved)} confirmed ${idxCov.unresolved === 1 ? 'has' : 'have'} no company record in the dataset and cannot be mapped`
                    : ''}
                  .
                </p>
                <p className="text-text-muted">
                  A hatched state has no {INDEX_LABEL[idx]} member registered there — not no companies.
                </p>
              </div>
            )}
          </div>

          {/* drill-down */}
          <aside className="lg:sticky lg:top-4 lg:self-start space-y-4">
            {sel && selected ? (
              <div className="card-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="heading-editorial font-bold text-xl leading-tight">{STATE_NAMES[selected]}</h3>
                  <button onClick={() => setSelected(null)} className="btn-ghost !py-1 !px-2 !text-[11px]">
                    close
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="font-mono text-[17px] text-accent">{fmtCr(sel.totalMcapCr)}</p>
                    <p className="text-[11px] text-text-muted">recorded market cap</p>
                  </div>
                  <div>
                    <p className="font-mono text-[17px]">{sel.count}</p>
                    <p className="text-[11px] text-text-muted">
                      listed · {sel.nseCount} NSE · {sel.bseCount} BSE
                    </p>
                  </div>
                </div>

                {sel.mcapGaps > 0 && (
                  <p className="text-[11.5px] text-amber mt-3 border-l-2 border-amber/40 pl-2">
                    {sel.mcapGaps} of {sel.count} have no recorded market cap — the total above is a floor,
                    not a measurement.
                  </p>
                )}

                {selEcon && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-1.5">
                      Capital · {selEcon.capital}
                    </p>
                    {selEcon.gsdpCr != null && (
                      <p className="text-[13px] text-text-secondary">
                        GSDP {fmtCr(selEcon.gsdpCr)} <span className="text-text-muted">({selEcon.gsdpYear})</span>
                      </p>
                    )}
                    {selEcon.dominantIndustries?.length > 0 && (
                      <p className="text-[13px] text-text-secondary mt-1.5">{selEcon.dominantIndustries.join(' · ')}</p>
                    )}
                    {selEcon.notableClusters?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {selEcon.notableClusters.map((c) => (
                          <li key={c} className="text-[12px] text-text-muted">
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {sel.topSectors.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-2">Sectors by market cap</p>
                    {sel.topSectors.slice(0, 6).map((s) => (
                      <div key={s.sector} className="flex items-center gap-2 mb-1.5">
                        <span className="text-[12px] w-24 truncate text-text-secondary">{s.sector}</span>
                        <span
                          className="h-2.5 bg-teal/60 rounded-sm"
                          style={{ width: `${Math.max(3, (s.mcapCr / (sel.topSectors[0].mcapCr || 1)) * 60)}%` }}
                        />
                        <span className="font-mono text-[10px] text-text-muted">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-border">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-2">Largest by market cap</p>
                  <ul className="space-y-1.5">
                    {sel.companies.slice(0, 8).map((c: Company) => (
                      <li key={c.id} className="flex justify-between gap-2 text-[12.5px]">
                        <Link to={`/company/${c.id}`} className="text-text-secondary hover:text-accent truncate">
                          {c.shortName || c.name}
                        </Link>
                        <span className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                          {c.marketCapCr != null ? fmtCr(c.marketCapCr) : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {(ministers.get(selected)?.length ?? 0) > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mb-2">
                      Union ministers seated here
                    </p>
                    <ul className="space-y-1">
                      {ministers.get(selected)!.slice(0, 6).map((m) => (
                        <li key={m.id} className="text-[12.5px] text-text-secondary">
                          {m.name} <span className="text-text-muted">— {m.portfolios[0]}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-text-muted mt-2 italic">
                      Co-location is not a relationship. Shown as context, never drawn as an edge.
                    </p>
                  </div>
                )}

                <Link to={`/states/${selected}`} className="btn-ghost w-full mt-4 !text-[12px] block text-center">
                  full state profile →
                </Link>
              </div>
            ) : (
              <div className="card-surface p-4">
                <p className="text-[13.5px] text-text-secondary leading-relaxed">
                  Click any state to drill down — listed companies, sector mix, GSDP, industrial clusters,
                  and the union ministers seated there.
                </p>
                <p className="text-[12px] text-text-muted mt-3 leading-relaxed">
                  Keyboard: arrow keys move north-to-south through the states, Enter opens one, Escape closes.
                </p>
              </div>
            )}
          </aside>
        </div>
      </Section>

      <Callout label="What the marks do and do not mean" tone="note">
        <p>
          Company marks are placed on a golden-angle spiral <strong>within</strong> the state polygon, sized
          by market cap. They are <strong>not geocoded</strong> — a mark's position inside a state carries
          no information about where the company actually is. Where a real city coordinate exists in the
          dataset it is used and the entity is flagged as geocoded; everything else is anchored.
        </p>
        <p>
          A grey hatched state means <strong>no company in the dataset</strong>, not zero listed companies.
          Those are different claims and the legend keeps them apart.
        </p>
      </Callout>

      {STATES_WITH_NO_LISTED_HQ.length > 0 && (
        <Section title="States with no significant listed headquarters" note="Recorded explicitly — an empty state is data, not a hole">
          <ul className="space-y-1.5">
            {(STATES_WITH_NO_LISTED_HQ as { stateCode: StateCode; note: string }[]).map((s, i) =>
              typeof s === 'string' ? (
                <li key={i} className="text-[13.5px] text-text-secondary">
                  {STATE_NAMES[s] ?? s}
                </li>
              ) : (
                <li key={s.stateCode} className="text-[13.5px] text-text-secondary">
                  <strong className="text-text">{STATE_NAMES[s.stateCode] ?? s.stateCode}</strong> — {s.note}
                </li>
              ),
            )}
          </ul>
        </Section>
      )}

      {COMPANIES.length > 0 && (
        <Section title="State ledger" note="The accessible twin of the map — same data, same filters">
          <DataTable
            columns={['State / UT', 'Listed', 'NSE', 'BSE', 'Market cap', 'PSU', 'Leading sector']}
            rows={[...rollup.values()]
              .sort((a, b) => b.totalMcapCr - a.totalMcapCr)
              .map((r) => [
                <Link key="s" to={`/states/${r.stateCode}`} className="text-text hover:text-accent">
                  {STATE_NAMES[r.stateCode]}
                </Link>,
                String(r.count),
                String(r.nseCount),
                String(r.bseCount),
                <span key="m" className="font-mono text-[12px] whitespace-nowrap">
                  {fmtCr(r.totalMcapCr)}
                  {r.mcapGaps > 0 && <span className="block text-[10px] text-amber">{r.mcapGaps} unpriced</span>}
                </span>,
                String(r.psuCount),
                <span key="t" className="text-[12.5px]">
                  {r.topSectors[0]?.sector ?? '—'}
                </span>,
              ])}
          />
        </Section>
      )}

      <Footnote>
        <p>
          <strong>Geometry.</strong> 36 state and UT boundaries at viewBox 612×696, with label anchors
          computed as the pole of inaccessibility of each state's largest sub-polygon — the interior point
          furthest from any edge. Bounding-box centres fall outside Gujarat, Kerala, Odisha and West Bengal
          and are not used. West Bengal has 63 sub-polygons, Gujarat 17, the Andamans 36; islands and
          enclaves are drawn, not dropped.
        </p>
        <p>
          <strong>Attribution.</strong> Companies are attributed to their <em>registered</em> headquarters
          state. Coal India is Kolkata-registered though the coal is in Jharkhand and Chhattisgarh; several
          large PSUs are Delhi-registered though their operations are elsewhere. Conflating registered with
          operational headquarters is the most common error in state-wise corporate maps and is avoided
          here by construction.
        </p>
        {COMPANY_GAPS.length > 0 && (
          <p>
            <strong>Gaps.</strong> {COMPANY_GAPS.join(' · ')}
          </p>
        )}
        {COMPANY_SOURCES.length > 0 && (
          <p>
            <strong>Sources.</strong>{' '}
            {COMPANY_SOURCES.slice(0, 8).map(([l, u], i) => (
              <span key={i}>
                {i > 0 && ' · '}
                <a href={u} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {l}
                </a>
              </span>
            ))}
          </p>
        )}
      </Footnote>
    </article>
  );
}
