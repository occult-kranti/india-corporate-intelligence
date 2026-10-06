import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bookmark, Check, Download, Link as LinkIcon, Search } from 'lucide-react';
import { Kicker, PageTitle } from '../components/Editorial';
import NetworkGraph from '../components/public-works/NetworkGraph';
import RepeatWorkReview from '../components/public-works/RepeatWorkReview';
import {
  PUBLIC_WORKS_UPDATED_AT, PUBLIC_WORKS_SECTORS, PUBLIC_WORKS_STATES, PUBLIC_WORKS_LOCALITIES,
  PUBLIC_WORKS_SOURCES, PUBLIC_WORKS_BUYERS, PUBLIC_WORKS_CASES, PUBLIC_WORKS_DATASET,
  PUBLIC_WORKS_QUALITY, PUBLIC_WORKS_METHODOLOGY, PUBLIC_WORKS_COVERAGE,
  getPublicWorksSources, getPublicWorksBuyers, getPublicWorksCases, getPublicWorksRules,
  getPublicWorksDiscovery, getPublicWorksNetwork, publicWorksSourcesCsv, assessRuleDate,
  type PublicWorksFilters, type PublicWorksSource, type PublicWorksDimensions, type PublicWorksBuyer,
  type PublicWorksSourceType,
} from '../data/publicWorks';
import './public-works.css';

const READING_LIST_KEY = 'icip-public-works-reading-list-v1';
const sourceById = new Map(PUBLIC_WORKS_SOURCES.map(source => [source.id, source]));
const stateByCode = new Map(PUBLIC_WORKS_STATES.map(state => [state.code, state.name]));
const localityById = new Map(PUBLIC_WORKS_LOCALITIES.map(place => [place.id, place]));
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const sourceTypes: { value: PublicWorksSourceType; label: string }[] = [
  { value: 'document', label: 'Documents & filings' }, { value: 'dataset', label: 'Datasets' },
  { value: 'portal', label: 'Portals & registers' }, { value: 'news', label: 'News reports' },
  { value: 'discussion', label: 'Public discussions' },
];
const tierLabels: Record<string, string> = { documented: 'Documented', reported: 'Reported', 'self-reported': 'Self-reported', alleged: 'Alleged', analytic: 'Analytic question' };
const caseLabels: Record<string, string> = { 'audit-finding': 'Audit finding', 'judicial-finding': 'Judicial finding', 'reported-event': 'Reported event', 'analytic-question': 'Open research question', methodology: 'Methodology' };
function readFilters(params: URLSearchParams): PublicWorksFilters {
  const sector = params.get('sector');
  return {
    sector: sector === 'all' ? undefined : PUBLIC_WORKS_SECTORS.find(choice => choice.value === sector)?.value ?? 'roads',
    stateCode: PUBLIC_WORKS_STATES.some(state => state.code === params.get('state')) ? params.get('state')! : undefined,
    place: params.get('place')?.trim() || undefined,
    q: params.get('q')?.trim() || undefined,
    type: sourceTypes.find(type => type.value === params.get('type'))?.value,
  };
}
function currentParams() { return new URLSearchParams(new URL(window.location.hash.slice(1), window.location.origin).search); }
function validEventDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}
function dateLabel(date: string | null | undefined) {
  if (!date) return 'Not established';
  if (/^\d{4}$/u.test(date)) return date;
  const partial = /^\d{4}-\d{2}$/u.test(date);
  const value = new Date(`${partial ? `${date}-01` : date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString('en-GB', { ...(partial ? {} : { day: 'numeric' as const }), month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function placeLabel(item: PublicWorksDimensions) {
  if (item.scope === 'national') return 'National context';
  const places = item.localityIds.flatMap(id => { const place = localityById.get(id); return place ? [`${place.name} (${place.kind})`] : []; });
  return [...places, ...item.stateCodes.map(code => stateByCode.get(code) ?? code)].join(' · ') || 'Geography not recorded';
}
function jumpTo(id: string) {
  const target = document.getElementById(id);
  target?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'start' });
}
function Heading({ index, title, count }: { index: string; title: string; count?: string }) {
  return <div className="pw-section-heading"><span className="pw-index" aria-hidden="true">{index}</span><h2 tabIndex={-1}>{title}</h2>{count && <span className="pw-section-count">{count}</span>}</div>;
}
function Sources({ ids }: { ids: string[] }) {
  return <div className="pw-source-links" aria-label="Supporting sources">{ids.map(id => {
    const source = sourceById.get(id);
    return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer">{source.publisher}: {source.title} ↗<span className="sr-only"> (opens in a new tab)</span></a> : null;
  })}</div>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="pw-empty"><h3>{title}</h3><p>{children}</p></div>;
}
function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^\s*[=+@\-]/u.test(text) || /^[\t\r]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/gu, '""')}"`;
}
function buyersCsv(rows: PublicWorksBuyer[]) {
  const fields = ['id', 'buyer', 'portal', 'period', 'scope', 'stateCodes', 'sectors', 'n', 'singleBidder', 'singleBidderPct', 'wilson95', 'classificationBasis', 'tier', 'sourceIds'] as const;
  const metadata = ['sourceUrls', 'sourceLocators', 'retrievalStatus', 'retrievedAt', 'datasetAsOf', 'sampleAsOf', 'unavailableSampleUrls', 'verificationSample', 'deduplicationRule', 'datasetLimitations'];
  return [[...fields, ...metadata].join(','), ...rows.map(row => {
    const cited = row.sourceIds.flatMap(id => { const source = sourceById.get(id); return source ? [source] : []; });
    const extras = [cited.map(source => source.url).join(' | '), cited.map(source => source.locator).join(' | '), cited.map(source => source.retrievalStatus).join(' | '), cited.map(source => source.retrievedAt).join(' | '), PUBLIC_WORKS_DATASET.asOf, PUBLIC_WORKS_DATASET.sampleAsOf, PUBLIC_WORKS_DATASET.unavailableRows, PUBLIC_WORKS_DATASET.verificationSample, PUBLIC_WORKS_DATASET.dedupRule, PUBLIC_WORKS_DATASET.limitations.join(' | ')];
    return [...fields.map(key => Array.isArray(row[key]) ? row[key].join(' | ') : row[key]), ...extras].map(csvCell).join(',');
  })].join('\r\n');
}
function downloadCsv(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Static public-record desk: each evidence stage and each coverage limit remains visible. */
export default function PublicWorks() {
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const sectorValue = params.get('sector');
  // Serialized URL state follows reloads, pasted links and history.
  const filters = useMemo(() => readFilters(new URLSearchParams(paramsKey)), [paramsKey]);
  const [queryDraft, setQueryDraft] = useState(filters.q ?? '');
  const [placeDraft, setPlaceDraft] = useState(filters.place ?? '');
  const [visibleBuyers, setVisibleBuyers] = useState(12);
  const [visibleSources, setVisibleSources] = useState(8);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(READING_LIST_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && sourceById.has(id)) : [];
    } catch { return []; }
  });
  const savedOnly = params.get('saved') === '1';
  const hops = params.get('hops') === '2' ? 2 : 1;
  const eventDate = params.get('event') ?? '';
  const invalidParams = [
    sectorValue && sectorValue !== 'all' && !PUBLIC_WORKS_SECTORS.some(sector => sector.value === sectorValue) ? 'sector' : null,
    params.has('state') && !PUBLIC_WORKS_STATES.some(state => state.code === params.get('state')) ? 'state' : null,
    params.has('type') && !sourceTypes.some(type => type.value === params.get('type')) ? 'source type' : null,
    params.has('saved') && !['0', '1'].includes(params.get('saved')!) ? 'reading list' : null,
    params.has('hops') && !['1', '2'].includes(params.get('hops')!) ? 'network depth' : null,
    params.has('networkView') && !['graph', 'table'].includes(params.get('networkView')!) ? 'network view' : null,
    eventDate && !validEventDate(eventDate) ? 'procurement event date' : null,
  ].filter(Boolean);
  useEffect(() => { setQueryDraft(filters.q ?? ''); }, [filters.q]);
  useEffect(() => { setPlaceDraft(filters.place ?? ''); }, [filters.place]);
  useEffect(() => { setVisibleBuyers(12); setVisibleSources(8); setStatus(''); setShareUrl(''); }, [paramsKey]);
  const patch = (values: Record<string, string | undefined>) => {
    // Compose rapid actions against the actual latest HashRouter URL, including
    // a select followed by form submission before React commits the first render.
    const next = currentParams();
    for (const [key, value] of Object.entries(values)) { if (value) next.set(key, value); else next.delete(key); }
    setParams(next);
  };
  const reset = () => { setQueryDraft(''); setPlaceDraft(''); setParams(new URLSearchParams()); };
  const submit = (event: FormEvent) => { event.preventDefault(); patch({ q: queryDraft.trim() || undefined, place: placeDraft.trim() || undefined }); };
  const matchedSources = useMemo(() => getPublicWorksSources(filters), [filters]);
  const sources = useMemo(() => savedOnly ? matchedSources.filter(source => saved.includes(source.id)) : matchedSources, [matchedSources, savedOnly, saved]);
  const buyers = useMemo(() => getPublicWorksBuyers(filters), [filters]);
  const cases = useMemo(() => getPublicWorksCases(filters), [filters]);
  const rules = useMemo(() => [...getPublicWorksRules(filters)].sort((a, b) => (a.effectiveFrom ?? '9999').localeCompare(b.effectiveFrom ?? '9999') || a.id.localeCompare(b.id)), [filters]);
  const discovery = useMemo(() => getPublicWorksDiscovery(filters), [filters]);
  const network = useMemo(() => getPublicWorksNetwork(filters), [filters]);
  const selectedCase = cases.find(item => item.id === params.get('case'));
  const caseNetwork = useMemo(() => {
    if (!selectedCase) return network;
    const edges = network.edges.filter(edge => edge.sourceIds.some(id => selectedCase.sourceIds.includes(id)));
    const ids = new Set(edges.flatMap(edge => [edge.from, edge.to]));
    return { ...network, edges, nodes: network.nodes.filter(node => ids.has(node.id)) };
  }, [network, selectedCase]);
  const requestedNode = params.get('node') ?? undefined;
  const selectedNode = caseNetwork.nodes.some(node => node.id === requestedNode) ? requestedNode : undefined;
  const selectedSector = PUBLIC_WORKS_SECTORS.find(sector => sector.value === filters.sector);
  const awardDenominator = buyers.reduce((sum, buyer) => sum + buyer.n, 0);
  const singleBidderCount = buyers.reduce((sum, buyer) => sum + buyer.singleBidder, 0);
  const hasFilters = Boolean(filters.sector !== 'roads' || filters.stateCode || filters.place || filters.q || filters.type || savedOnly || params.has('case') || params.has('node') || params.has('event') || params.has('hops') || params.has('networkView') || params.has('edge'));
  const selectedCoverage = PUBLIC_WORKS_COVERAGE.filter(item => !filters.sector || item.sector === filters.sector);
  const toggleSave = (source: PublicWorksSource) => {
    const wasSaved = saved.includes(source.id);
    const next = wasSaved ? saved.filter(id => id !== source.id) : [...saved, source.id];
    setSaved(next);
    try { localStorage.setItem(READING_LIST_KEY, JSON.stringify(next)); setStatus(wasSaved ? 'Removed from your public works reading list.' : 'Saved to your public works reading list on this browser.'); }
    catch { setStatus('Reading list updated for this session. Browser storage is unavailable.'); }
    if (wasSaved && savedOnly) window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#pw-sources h2')?.focus({ preventScroll: true }));
  };
  const exportSources = () => {
    const latest = currentParams();
    const matching = getPublicWorksSources(readFilters(latest));
    const rows = latest.get('saved') === '1' ? matching.filter(source => saved.includes(source.id)) : matching;
    downloadCsv(publicWorksSourcesCsv(rows), `public-works-sources-${PUBLIC_WORKS_UPDATED_AT}.csv`);
    setStatus(`Exported all ${rows.length} matching sources with dates, provenance and limitations.`);
  };
  const exportBuyers = () => {
    const rows = getPublicWorksBuyers(readFilters(currentParams()));
    downloadCsv(buyersCsv(rows), `public-works-buyers-${PUBLIC_WORKS_UPDATED_AT}.csv`);
    setStatus(`Exported all ${rows.length} matching buyer aggregates. These are not individual tender records.`);
  };
  const copyLink = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setStatus(savedOnly ? 'Research link copied. The reading list is local to each browser.' : 'Research link copied with your filters and network selection.'); }
    catch { setShareUrl(url); setStatus('Select and copy the research link below.'); }
  };

  return <div className="public-works-page">
    <header className="pw-hero"><div>
      <Kicker>India / Public works &amp; public money</Kicker>
      <PageTitle>Roads, bridges &amp; public works.</PageTitle>
      <p className="pw-intro">Follow procurement, funding and institutional connections across roads, electricity, water, health, education and government. Inspect the award, the work and the response — with evidence for every connection.</p>
      <p className="pw-snapshot">Research snapshot · {dateLabel(PUBLIC_WORKS_UPDATED_AT)}<br />Historical datasets and dated case files · Coverage varies by sector and place</p>
    </div><aside className="pw-hero-note" aria-labelledby="pw-intro-note">
      <p className="pw-overline">Read the chain of evidence</p><h2 id="pw-intro-note">A contract is a starting point.</h2>
      <div className="pw-flow" aria-label="Procurement stages"><span>Notice</span><ArrowRight aria-hidden="true" /><span>Award</span><ArrowRight aria-hidden="true" /><span>Work</span><ArrowRight aria-hidden="true" /><span>Audit</span></div>
      <p>Repeated notices can be amendments or cancellations. A political donation records a contribution. Neither alone establishes duplicate work or influence over an award.</p>
      <button className="pw-text-button" onClick={() => jumpTo('pw-coverage')}>Check what this desk can establish</button>
    </aside></header>

    <nav className="pw-nav" aria-label="On this public works page">{[
      ['01', 'pw-procurement', 'Procurement'], ['02', 'pw-repeat', 'Repeat-work review'], ['03', 'pw-cases', 'Case files'],
      ['04', 'pw-network', 'Connections'], ['05', 'pw-rules', 'Rules & changes'], ['06', 'pw-sources', 'Source ledger'],
    ].map(([index, id, label]) => <button key={id} onClick={() => jumpTo(id)}><span>{index}</span>{label}</button>)}</nav>

    <section className="pw-workbench" aria-labelledby="pw-workbench-title">
      <div className="pw-workbench-top"><h2 id="pw-workbench-title">Choose a sector. Follow the public record.</h2><p>Filters and graph views stay in the link.</p></div>
      {invalidParams.length > 0 && <div className="pw-invalid" role="status">This link contains an unrecognised {invalidParams.join(', ')} filter. The default is used for those values. <button className="pw-text-button" onClick={reset}>Reset filters</button></div>}
      <div className="pw-sectors" role="group" aria-label="Sector lens"><button className="pw-sector" aria-pressed={!filters.sector} onClick={() => patch({ sector: 'all', case: undefined, node: undefined })}>All sectors</button>{PUBLIC_WORKS_SECTORS.map(sector => <button key={sector.value} className="pw-sector" aria-pressed={filters.sector === sector.value} onClick={() => patch({ sector: sector.value === 'roads' ? undefined : sector.value, case: undefined, node: undefined })}>{sector.label}</button>)}</div>
      <form onSubmit={submit} aria-label="Search public works evidence">
        <div className="pw-fields">
          <label className="pw-field"><span id="pw-state-label">State or union territory</span><select aria-labelledby="pw-state-label" value={filters.stateCode ?? ''} onChange={event => patch({ state: event.target.value || undefined, case: undefined, node: undefined })}><option value="">All states &amp; UTs</option>{PUBLIC_WORKS_STATES.map(state => <option value={state.code} key={state.code}>{state.name}</option>)}</select></label>
          <label className="pw-field"><span>City, district or village</span><input type="search" value={placeDraft} onChange={event => setPlaceDraft(event.target.value)} placeholder="Place name" list="pw-locality-options" aria-describedby="pw-geography-note" /></label>
          <datalist id="pw-locality-options">{PUBLIC_WORKS_LOCALITIES.filter(place => !filters.stateCode || place.stateCode === filters.stateCode).map(place => <option key={place.id} value={place.name} label={`${place.kind} · ${stateByCode.get(place.stateCode) ?? place.stateCode}`} />)}</datalist>
          <label className="pw-field"><span>Project, buyer, scheme or topic</span><input type="search" value={queryDraft} onChange={event => setQueryDraft(event.target.value)} placeholder="e.g. bridge, hospital, tender" /></label>
          <button type="submit" className="pw-button pw-primary"><Search size={16} aria-hidden="true" />Search</button>
        </div>
        <div className="pw-secondary-fields"><label className="pw-field"><span id="pw-source-type-label">Supporting source type</span><select aria-labelledby="pw-source-type-label" value={filters.type ?? ''} onChange={event => patch({ type: event.target.value || undefined })}><option value="">All source types</option>{sourceTypes.map(type => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label></div>
      </form>
      <p className="pw-note" id="pw-geography-note">All {PUBLIC_WORKS_STATES.length} states and union territories are selectable. State views retain national context; a place name matches recorded locality metadata. A buyer’s office address does not establish a work site. Source type also filters cases, rules, buyers and relationships by their supporting sources.</p>
      <div className="pw-filter-footer"><p className="pw-count" role="status"><strong>{sources.length}</strong> of {PUBLIC_WORKS_SOURCES.length} sources · <strong>{buyers.length}</strong> of {PUBLIC_WORKS_BUYERS.length} buyer aggregates<br />{selectedSector?.label ?? 'All sectors'}{filters.stateCode ? ` · ${stateByCode.get(filters.stateCode)}` : ''}{filters.place ? ` · ${filters.place}` : ''}{savedOnly ? ' · saved sources only' : ''}</p>
        <div className="pw-tools"><button className="pw-button" aria-pressed={savedOnly} onClick={() => patch({ saved: savedOnly ? undefined : '1' })}><Bookmark size={14} aria-hidden="true" />Saved ({saved.length})</button><button className="pw-button" onClick={copyLink}><LinkIcon size={14} aria-hidden="true" />Copy link</button><button className="pw-button" onClick={exportSources} disabled={sources.length === 0}><Download size={14} aria-hidden="true" />Export sources CSV</button>{hasFilters && <button className="pw-text-button" onClick={reset}>Reset filters</button>}</div>
      </div>
      {savedOnly && <p className="pw-note">The reading list filters sources, the source count and source CSV. Procurement, case files, regulations and connections still follow the research filters.</p>}
      <p className="pw-status" role="status">{status}</p>{shareUrl && <label className="pw-field"><span>Research link</span><input readOnly value={shareUrl} onFocus={event => event.target.select()} /></label>}
    </section>

    <dl className="pw-denominator" aria-label="Current research view">
      <div><dt>Buyer aggregates in this view</dt><dd>{number.format(buyers.length)} <small>/ {number.format(PUBLIC_WORKS_BUYERS.length)}</small></dd><p>Buyer-label sector classification</p></div>
      <div><dt>Awards with usable bid count</dt><dd>{number.format(awardDenominator)}</dd><p>Within these buyer aggregates</p></div>
      <div><dt>Case files in this view</dt><dd>{number.format(cases.length)} <small>/ {number.format(PUBLIC_WORKS_CASES.length)}</small></dd><p>Attributed findings and open questions</p></div>
      <div><dt>Recorded relationships</dt><dd>{number.format(network.edges.length)}</dd><p>Evidence links, not an influence score</p></div>
    </dl>

    <section id="pw-procurement" className="pw-section">
      <Heading index="01" title="Procurement dataset" count={`${buyers.length} matching buyer aggregates`} />
      <p className="pw-section-intro">The government e-procurement dataset preserves <span className="pw-value">{number.format(PUBLIC_WORKS_DATASET.afterDedupRows)}</span> rows after its committed deduplication rule, from <span className="pw-value">{number.format(PUBLIC_WORKS_DATASET.rawRows)}</span> raw scraped rows. This desk reuses the committed aggregate outputs. Individual award files and work-site records are not loaded here.</p>
      <div className="pw-invalid"><strong>Dataset period:</strong> {PUBLIC_WORKS_DATASET.period} · <strong>Dataset as of:</strong> {dateLabel(PUBLIC_WORKS_DATASET.asOf)}<br /><strong>Verification boundary:</strong> In the check dated {dateLabel(PUBLIC_WORKS_DATASET.sampleAsOf)}, {number.format(PUBLIC_WORKS_DATASET.unavailableRows)} of {number.format(PUBLIC_WORKS_DATASET.verificationSample)} sampled stored portal URLs were unavailable. Agreement with the official records could not be established. Agreement is unknown; this is not a measured disagreement rate. The aggregate dataset remains {PUBLIC_WORKS_DATASET.tier}.<br /><strong>Deduplication:</strong> {PUBLIC_WORKS_DATASET.dedupRule}</div>
      {buyers.length > 0 ? <>
        <div className="pw-table-wrap" role="region" aria-label="Buyer aggregates, scroll horizontally for all columns" tabIndex={0}><table className="pw-table">
          <caption>{selectedSector?.label ?? 'All sectors'} · {number.format(singleBidderCount)} records with one usable bidder out of {number.format(awardDenominator)} with usable bid counts. Missing bidder counts are outside this denominator. A single recorded bidder does not establish wrongdoing.</caption>
          <thead><tr><th scope="col">Buyer / classification</th><th scope="col">Recorded coverage</th><th scope="col">Usable bid counts</th><th scope="col">One bidder</th><th scope="col">Share / 95% interval</th></tr></thead>
          <tbody>{buyers.slice(0, visibleBuyers).map(buyer => <tr key={buyer.id} data-buyer-id={buyer.id}>
            <td><span className="pw-record-title">{buyer.buyer}</span><small>{buyer.classificationBasis}</small><Sources ids={buyer.sourceIds} /></td>
            <td>{placeLabel(buyer)}<small>{buyer.portal} · {buyer.period}</small><small>Reported aggregate</small></td>
            <td className="pw-value">{number.format(buyer.n)}</td><td className="pw-value">{number.format(buyer.singleBidder)}</td>
            <td><span className="pw-value">{number.format(buyer.singleBidderPct)}%</span><small>Wilson 95%: {buyer.wilson95.map(value => `${number.format(value)}%`).join('–')}</small></td>
          </tr>)}</tbody></table></div>
        <div className="pw-table-actions"><p>Showing {Math.min(visibleBuyers, buyers.length)} of {buyers.length} matching buyers. Values are counts, not rupees or completed works.</p><div className="pw-tools">{visibleBuyers < buyers.length && <button className="pw-button" onClick={() => setVisibleBuyers(value => value + 12)}>Show more buyers</button>}<button className="pw-button" onClick={exportBuyers}><Download size={14} aria-hidden="true" />Export buyer CSV</button></div></div>
      </> : <Empty title="No buyer aggregates match this view.">This is a coverage gap in the available aggregate outputs. It does not mean there were no tenders, awards or public spending in this place or sector. Case files and the research routes below may provide a different form of evidence.</Empty>}
      <Sources ids={PUBLIC_WORKS_DATASET.sourceIds} />
      <p className="pw-note">{PUBLIC_WORKS_DATASET.limitations.join(' ')}</p>
    </section>

    <section id="pw-repeat" className="pw-section"><Heading index="02" title="Repeat-work review" />
      <p className="pw-section-intro">{PUBLIC_WORKS_DATASET.repeatWork.summary}</p>
      <p className="pw-note mb-5"><strong>Whole retained dataset — not the selected sector, state or place:</strong> <span className="pw-value">{number.format(PUBLIC_WORKS_DATASET.repeatWork.repeatPairCount)} / {number.format(PUBLIC_WORKS_DATASET.repeatWork.pairDenominator)}</span> observed buyer–marked-winner pairs had at least five single-bidder awards in the historical aggregate. These are recurring text labels, not identity-resolved contractors or repeated asset payments.</p>
      <div className="pw-review"><div><p className="pw-overline">{PUBLIC_WORKS_DATASET.repeatWork.status.replace(/-/gu, ' ')}</p><h3>{PUBLIC_WORKS_DATASET.repeatWork.title}</h3><p>{PUBLIC_WORKS_DATASET.repeatWork.innocentReading}</p></div><div><h4 className="pw-overline">Records needed for a comparable pair</h4><ul>{PUBLIC_WORKS_DATASET.repeatWork.missingFields.map(field => <li key={field}>{field}</li>)}</ul></div></div>
      <RepeatWorkReview />
    </section>

    <section id="pw-cases" className="pw-section"><Heading index="03" title="Case files & open questions" count={`${cases.length} matching case files`} />
      <p className="pw-section-intro">Read the documented issue beside the authority’s or organisation’s response. Audit estimates, funding allocations and payments retain their own accounting stage. These case files do not establish misconduct by association.</p>
      {cases.length === 0 ? <Empty title="No curated case file matches these filters.">The absence of a case is a research gap, not a clean bill of health or an allegation. Use official audit reports, procurement IDs and dated local records to build a supported case.</Empty> : cases.map(item => {
        const hasNetwork = network.edges.some(edge => edge.sourceIds.some(id => item.sourceIds.includes(id)));
        return <article className="pw-dossier" key={item.id} data-case-id={item.id}>
          <div className="pw-dossier-head"><div><div className="pw-meta"><span>{caseLabels[item.kind] ?? item.kind}</span><span>{placeLabel(item)}</span><span>{item.status}</span></div><h3>{item.title}</h3><p>{item.summary}</p></div>{hasNetwork && <button className="pw-button" onClick={() => { patch({ case: item.id, node: undefined }); window.requestAnimationFrame(() => jumpTo('pw-network')); }}>Explore shared-source context <ArrowRight size={15} aria-hidden="true" /></button>}</div>
          {item.amount != null && <p className="pw-definition"><span className="pw-value">{number.format(item.amount)} {item.valueUnit}</span> · {item.amountStage ?? 'Accounting stage not recorded'} · {item.period ?? 'Period not recorded'}</p>}
          {item.amounts && item.amounts.length > 0 && <ul className="pw-case-amounts" aria-label="Recorded amounts by accounting stage">{item.amounts.map((amount, index) => <li key={index}><span className="pw-value">{amount.currency} {number.format(amount.value)} {amount.unit}</span> · {amount.stage} · {amount.period}</li>)}</ul>}
          {item.period && item.amount == null && <p className="pw-definition">Record / audit period: {item.period}</p>}
          <div className="pw-dossier-body"><div><h4>Finding & attribution</h4><p>{item.attribution}</p>{item.locator && <p className="pw-definition">Record locator: {item.locator}</p>}</div><div className="pw-response"><h4>Response & unresolved status</h4><p>{item.response}</p></div></div>
          <div className="pw-dossier-next"><h4>Other explanations to check</h4><ul>{item.alternativeExplanations.map(explanation => <li key={explanation}>{explanation}</li>)}</ul><h4 className="mt-3">What would resolve or challenge this question?</h4><p>{item.falsifier}</p></div>
          <Sources ids={item.sourceIds} />
        </article>;
      })}
    </section>

    <section id="pw-network" className="pw-section"><Heading index="04" title="Connections, with the evidence attached" count={`${caseNetwork.nodes.length} entities · ${caseNetwork.edges.length} relationships`} />
      <p className="pw-section-intro">Inspect recorded awards, ownership, public roles, political contributions, regulation and audit responses. A path connects documented records; it does not establish control, collusion or influence. Identity must be resolved before a relationship appears.</p>
      <label className="pw-field mb-4"><span id="pw-network-context-label">Network context — shared supporting sources</span><select aria-labelledby="pw-network-context-label" value={selectedCase?.id ?? ''} onChange={event => patch({ case: event.target.value || undefined, node: undefined })}><option value="">All relationships matching the research filters</option>{cases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      {params.has('case') && !selectedCase && <p className="pw-invalid" role="status">The linked case does not match the current filters or is not in this snapshot. Showing all matching relationships.</p>}
      {requestedNode && !selectedNode && <p className="pw-invalid" role="status">The linked entity does not occur in the current subgraph. Showing the available network context.</p>}
      {selectedCase && <p className="pw-note">Shared-source context: {selectedCase.title}. These relationships cite at least one of the same documents. A broad report may cover separate matters; this is not a case-specific allegation network.</p>}
      <NetworkGraph {...caseNetwork} selectedId={selectedNode} onSelect={id => patch({ node: id || undefined, edge: undefined })} hops={hops} onHopsChange={value => patch({ hops: value === 1 ? undefined : String(value) })} view={params.get('networkView') === 'table' ? 'table' : 'graph'} onViewChange={value => patch({ networkView: value === 'graph' ? undefined : value })} selectedEdgeId={params.get('edge') ?? undefined} onEdgeSelect={id => patch({ edge: id || undefined })} />
    </section>

    <section id="pw-rules" className="pw-section"><Heading index="05" title="Rules, changes & applicability" count={`${rules.length} matching records`} />
      <p className="pw-section-intro">Read the rule that applied to the authority, procurement category and event date. A later amendment cannot establish a breach of an earlier contract. State rules, central rules and defence procurement have different scopes.</p>
      <label className="pw-field mb-5" style={{ maxWidth: 360 }}><span>Optional procurement event date</span><input type="date" value={validEventDate(eventDate) ? eventDate : ''} onChange={event => patch({ event: event.target.value || undefined })} aria-describedby="pw-rule-date-note" /></label>
      <p id="pw-rule-date-note" className="pw-note mb-5">A date comparison checks only the recorded effective period. It does not decide legal applicability or compliance.</p>
      {rules.length === 0 ? <Empty title="No legal record matches this view.">No finding about compliance follows from missing rules. Retrieve the governing tender conditions, amendments and authority-specific rules for the relevant date.</Empty> : <div className="pw-timeline">{rules.map(rule => {
        const dateStatus = eventDate ? assessRuleDate(rule, eventDate) : undefined;
        const statusLabels = { 'date-unknown': 'Date comparison unavailable: a precise, valid event or effective date is missing.', 'predates-rule': 'The selected event predates this recorded rule period.', 'after-rule': 'The selected event is after the recorded end of this rule period.', 'within-recorded-period': 'The selected event falls within the recorded rule period. Scope still needs review.' };
        return <article key={rule.id} className="pw-rule-row" data-rule-id={rule.id}><div><time dateTime={rule.effectiveFrom ?? undefined}>{dateLabel(rule.effectiveFrom)}</time><p>Effective from</p>{rule.effectiveTo && <p>Until {dateLabel(rule.effectiveTo)}</p>}</div><div><h3>{rule.title}</h3><p>{rule.summary}</p><p className="pw-note"><strong>Change:</strong> {rule.change}</p><Sources ids={rule.sourceIds} /></div><div className="pw-rule-applicability"><h4>{rule.jurisdiction}</h4><p>{rule.applicability}</p>{rule.limitations.length > 0 && <p className="pw-note"><strong>Limits:</strong> {rule.limitations.join(' ')}</p>}{dateStatus && <p className="pw-status">{statusLabels[dateStatus]}</p>}</div></article>;
      })}</div>}
    </section>

    <section id="pw-sources" className="pw-section"><Heading index="06" title="Source ledger" count={`${sources.length} matching sources${savedOnly ? ' · saved only' : ''}`} />
      <p className="pw-section-intro">Publication date, observation period and retrieval date are separate fields. Portal and discussion records are research routes unless their recorded contents support a specific claim. Save documents locally or export the entire filtered ledger.</p>
      <div className="pw-sources"><div>
        {sources.length === 0 ? <Empty title={savedOnly ? 'No saved sources match this view.' : 'No source records match these filters.'}>{savedOnly ? 'Save a source using its bookmark control, or turn off the saved-only filter. Your reading list belongs to this browser.' : 'This desk has not established local evidence for this selection. Broaden the filters or use the official research routes below; an empty result does not establish absence of activity.'}</Empty> : sources.slice(0, visibleSources).map(source => <article className="pw-source" key={source.id} data-source-id={source.id}>
          <div className="pw-source-head"><div><div className="pw-meta"><span data-tier={source.tier}>{tierLabels[source.tier]}</span><span>{sourceTypes.find(type => type.value === source.type)?.label ?? source.type}</span></div><h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ArrowUpRight size={15} className="inline" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></h3></div><button className="pw-save" aria-pressed={saved.includes(source.id)} aria-label={`${saved.includes(source.id) ? 'Unsave' : 'Save'} ${source.title}`} onClick={() => toggleSave(source)}>{saved.includes(source.id) ? <Check size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}</button></div>
          <p>{source.summary}</p><p className="pw-definition">{source.publisher} · {placeLabel(source)}</p>
          <div className="pw-source-dates"><p><strong>Published:</strong> {dateLabel(source.publishedAt)}<br /><strong>Observation / audit period:</strong> {source.period}<br /><strong>Retrieved:</strong> {dateLabel(source.retrievedAt)} · {source.retrievalStatus}</p></div>
          <p className="pw-provenance">Record: {source.id} · Locator: {source.locator}</p>
          {source.limitations.length > 0 && <p className="pw-source-limits"><strong>What this source does not establish:</strong> {source.limitations.join(' ')}</p>}
        </article>)}
        {visibleSources < sources.length && <button className="pw-button pw-more" onClick={() => setVisibleSources(value => value + 8)}>Show more sources ({Math.min(visibleSources, sources.length)} of {sources.length} shown)</button>}
      </div><aside className="pw-reader"><p className="pw-overline">Read before comparing</p><h3>Keep the stages separate.</h3><p>A tender estimate, an award, a payment and a completed asset measure different things. They cannot be added into one spending total.</p><ul><li><strong>Identity:</strong> names need corporate identifiers, dated public offices or other explicit evidence.</li><li><strong>Geography:</strong> work sites need project or locality records. Buyer addresses are insufficient.</li><li><strong>Politics:</strong> a contribution, meeting or shared director needs its own record. A short path is not causation.</li><li><strong>Responses:</strong> explanations and unresolved status remain beside every case.</li></ul></aside></div>
    </section>

    <section id="pw-coverage" className="pw-section"><Heading index="07" title="Coverage gaps & next records" />
      <div className="pw-coverage"><div><h3>What is actually available</h3><ul>{PUBLIC_WORKS_QUALITY.map(item => <li key={item.label}><strong>{item.label}: <span className="pw-value">{number.format(item.count)} / {number.format(item.denominator)}</span>.</strong> {item.meaning}</li>)}</ul></div><div><h3>What this view cannot establish</h3><ul>{[...new Set(selectedCoverage.flatMap(item => item.limitations))].map(limitation => <li key={limitation}>{limitation}</li>)}</ul><p className="pw-note">Sector coverage counts describe the entire curated sector corpus. They are not a count of audited facilities in the selected place. Government and private service provision require different funding and regulatory records.</p></div></div>
      <div className="pw-discovery">{discovery.map(tool => <article key={tool.id}><h4><a href={tool.url} target="_blank" rel="noopener noreferrer">{tool.title} ↗<span className="sr-only"> (opens in a new tab)</span></a></h4><p>{tool.summary}</p><p className="pw-note">{tool.steps.join(' ')}</p>{tool.limitations.length > 0 && <p className="pw-note"><strong>Coverage boundary:</strong> {tool.limitations.join(' ')}</p>}</article>)}</div>
      <div className="pw-note"><strong>Research method:</strong> {PUBLIC_WORKS_METHODOLOGY.join(' ')}</div>
    </section>
    <p className="pw-endnote">Compiled public evidence · {dateLabel(PUBLIC_WORKS_UPDATED_AT)} · No live tender feed, exhaustive locality census or automated misconduct determination.</p>
  </div>;
}
