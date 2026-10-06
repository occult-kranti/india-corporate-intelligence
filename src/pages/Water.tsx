import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bookmark, Check, Download, Link as LinkIcon, Search } from 'lucide-react';
import { Kicker, PageTitle } from '../components/Editorial';
import {
  WATER_UPDATED_AT, WATER_WINDOW, WATER_STATES, WATER_LOCALITIES, WATER_SOURCES,
  WATER_DOMAINS, WATER_STAGES, WATER_SOURCE_TYPES, WATER_METHODOLOGY, WATER_COVERAGE_NOTES,
  getWaterSources, getWaterObservations, getWaterDiscovery, getWaterLeads, getForecastStatus, waterCsvCell,
  type WaterFilters, type WaterSource, type WaterWindowStatus, type WaterDiscovery,
} from '../data/water';
import './water.css';

const READING_LIST_KEY = 'icip-water-reading-list-v1';
const sourceById = new Map(WATER_SOURCES.map(source => [source.id, source]));
const stateByCode = new Map(WATER_STATES.map(state => [state.code, state.name]));
const localityById = new Map(WATER_LOCALITIES.map(place => [place.id, place]));
const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 });
const windowChoices: { value: WaterWindowStatus | 'all'; label: string }[] = [
  { value: 'in-window', label: 'Published within the five-year window' },
  { value: 'background', label: 'Background outside the review window' },
  { value: 'undated', label: 'Undated / date precision insufficient' },
  { value: 'all', label: 'All dates — includes background & undated' },
];
const windowLabels: Record<WaterWindowStatus, string> = {
  'in-window': 'Within the review window', background: 'Background outside the review window', undated: 'Publication date / precision not established',
};
const evidenceLabels: Record<WaterSource['tier'], string> = {
  primary: 'Primary record', reported: 'Reported source', 'self-reported': 'Self-reported',
};
const domainLabel = (id: string) => WATER_DOMAINS.find(choice => choice.value === id)?.label ?? id;
const stageLabel = (id: string) => WATER_STAGES.find(choice => choice.value === id)?.label ?? id;
const typeLabel = (id: string) => WATER_SOURCE_TYPES.find(choice => choice.value === id)?.label ?? id;
const dateLabel = (date: string) => {
  if (/^\d{4}$/u.test(date)) return date;
  if (/^\d{4}-\d{2}$/u.test(date)) {
    const value = new Date(`${date}-01T12:00:00Z`);
    return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  const value = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(value.getTime()) ? date : value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
function choiceValue<T extends string>(value: string | null, choices: { value: T }[]): T | undefined {
  return choices.find(choice => choice.value === value)?.value;
}
function placeLabel(source: WaterSource) {
  if (source.geographicLabel) return `${source.scope === 'national' ? 'National context · ' : ''}${source.geographicLabel}`;
  const localities = source.localityIds.flatMap(id => { const place = localityById.get(id); return place ? [`${place.name} ${place.kind}`] : []; });
  const states = source.stateCodes.map(code => stateByCode.get(code) ?? code);
  return source.scope === 'national' ? 'National context' : [...localities, ...states].join(' · ') || source.scope;
}
function jumpTo(id: string) {
  const target = document.getElementById(id);
  target?.querySelector('h2')?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'start' });
}
function Heading({ index, id, title, count }: { index: string; id: string; title: string; count?: string }) {
  return <div className="water-section-heading"><span className="water-index" aria-hidden="true">{index}</span><h2 id={id} tabIndex={-1}>{title}</h2>{count && <span className="water-number">{count}</span>}</div>;
}
function SourceLinks({ ids }: { ids: string[] }) {
  return <div className="water-inline-sources" aria-label="Supporting sources">{ids.map(id => {
    const source = sourceById.get(id);
    return source ? <a key={id} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>{source.publisher}{source.windowStatus !== 'in-window' ? ` · ${source.windowStatus}` : ''}<span aria-hidden="true"> ↗</span><span className="sr-only">: {source.title} (opens in a new tab)</span></a> : null;
  })}</div>;
}
function Empty({ title, children, onReset }: { title: string; children: ReactNode; onReset?: () => void }) {
  return <div className="water-empty"><h3>{title}</h3><p>{children}</p>{onReset && <button className="water-button" onClick={onReset}>Clear filters</button>}</div>;
}
function ForecastStatus({ source }: { source: WaterSource }) {
  const status = getForecastStatus(source);
  if (status === 'not-forecast') return null;
  const labels = {
    'unknown-validity': 'Validity not established. Do not treat this as a current warning.',
    'not-yet-issued': 'Issued after this snapshot. It cannot describe conditions at the snapshot date.',
    'not-yet-valid': 'Issued, but its stated validity had not begun at this snapshot.',
    'active-at-snapshot': 'Within the stated validity interval at this snapshot only. Verify the current official bulletin.',
    expired: 'Historical bulletin. Its stated validity expired before this snapshot.',
  };
  return <p className="water-notice-status"><strong>Bulletin status at {dateLabel(WATER_UPDATED_AT)}:</strong> {labels[status]}<br />Issued: {source.issuedAt ?? 'Not recorded'}<br />Valid from: {source.validFrom ?? 'Not recorded'} · Valid until: {source.validUntil ?? 'Not recorded'}</p>;
}
function LocalDiscovery({ tools, place, stateCode }: { tools: WaterDiscovery[]; place?: string; stateCode?: string }) {
  const geography = [place, stateCode ? stateByCode.get(stateCode) : 'India'].filter(Boolean).join(' ');
  const query = encodeURIComponent(`site:gov.in ${geography} water supply agriculture procurement after:${WATER_WINDOW.start} before:${WATER_WINDOW.end}`);
  return <div className="water-local-discovery"><h4>Continue the local evidence search</h4><p>First confirm the place’s state, district and village or city identifier. Look for dated service records, water tests, scheme or tender IDs and crop-season data. These external routes are research starting points; they do not establish local coverage.</p>
    <div className="water-inline-sources">{tools.slice(0, 3).map(tool => <a key={tool.id} href={tool.url} target="_blank" rel="noopener noreferrer">{tool.title} ↗</a>)}<a href={`https://www.google.com/search?q=${query}`} target="_blank" rel="noopener noreferrer">Search official records for {geography} ↗</a></div>
  </div>;
}

/** Source-led five-year review, compiled locally. Portal discovery is separate from recorded evidence. */
export default function Water() {
  const [params, setParams] = useSearchParams();
  const paramsKey = params.toString();
  const filters = useMemo<WaterFilters>(() => {
    const window = choiceValue(params.get('window'), windowChoices) ?? 'in-window';
    return {
      stateCode: WATER_STATES.some(state => state.code === params.get('state')) ? params.get('state')! : undefined,
      place: params.get('place')?.trim() || undefined,
      q: params.get('q')?.trim() || undefined,
      domain: choiceValue(params.get('domain'), WATER_DOMAINS),
      stage: choiceValue(params.get('stage'), WATER_STAGES),
      type: choiceValue(params.get('type'), WATER_SOURCE_TYPES),
      windowStatus: window === 'all' ? undefined : window,
    };
  // A serialized key follows paste, refresh and browser history as well as our controls.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);
  const [queryDraft, setQueryDraft] = useState(filters.q ?? '');
  const [placeDraft, setPlaceDraft] = useState(filters.place ?? '');
  const [visibleSources, setVisibleSources] = useState(8);
  const [visibleObservations, setVisibleObservations] = useState(6);
  const [visibleLeads, setVisibleLeads] = useState(4);
  const [status, setStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(READING_LIST_KEY) ?? '[]');
      return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && sourceById.has(id)) : [];
    } catch { return []; }
  });
  const savedOnly = params.get('saved') === '1';
  const selectedWindow = filters.windowStatus ?? 'all';
  const invalidParams = [
    params.has('state') && !WATER_STATES.some(state => state.code === params.get('state')) ? 'state' : null,
    params.has('domain') && !choiceValue(params.get('domain'), WATER_DOMAINS) ? 'subject lens' : null,
    params.has('stage') && !choiceValue(params.get('stage'), WATER_STAGES) ? 'food-chain stage' : null,
    params.has('type') && !choiceValue(params.get('type'), WATER_SOURCE_TYPES) ? 'source type' : null,
    params.has('window') && !choiceValue(params.get('window'), windowChoices) ? 'publication window' : null,
    params.has('saved') && !['0', '1'].includes(params.get('saved')!) ? 'reading list' : null,
  ].filter(Boolean);
  useEffect(() => { setQueryDraft(filters.q ?? ''); }, [filters.q]);
  useEffect(() => { setPlaceDraft(filters.place ?? ''); }, [filters.place]);
  useEffect(() => {
    setVisibleSources(8); setVisibleObservations(6); setVisibleLeads(4); setStatus(''); setShareUrl('');
  }, [paramsKey]);
  const patch = (values: Record<string, string | undefined>) => {
    // HashRouter updates browser history before its concurrent render necessarily
    // commits. Compose a rapid second action from that latest URL, not stale render state.
    const route = new URL(window.location.hash.slice(1), window.location.origin);
    const next = new URLSearchParams(route.search);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    setParams(next);
  };
  const reset = () => { setQueryDraft(''); setPlaceDraft(''); setParams(new URLSearchParams()); };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); patch({ q: queryDraft.trim() || undefined, place: placeDraft.trim() || undefined }); };
  const matchedSources = useMemo(() => getWaterSources(filters), [filters]);
  const sources = useMemo(() => savedOnly ? matchedSources.filter(source => saved.includes(source.id)) : matchedSources, [matchedSources, savedOnly, saved]);
  const observations = useMemo(() => getWaterObservations(filters), [filters]);
  const leads = useMemo(() => getWaterLeads(filters), [filters]);
  const discovery = useMemo(() => getWaterDiscovery(filters), [filters]);
  const hasFilters = Boolean(filters.stateCode || filters.place || filters.q || filters.domain || filters.stage || filters.type || selectedWindow !== 'in-window' || savedOnly);
  const nationalCount = sources.filter(source => source.scope === 'national').length;
  const totalInWindow = WATER_SOURCES.filter(source => source.windowStatus === 'in-window').length;
  const stageCounts = useMemo(() => new Map(WATER_STAGES.map(stage => [stage.value, getWaterSources({ ...filters, stage: stage.value }).filter(source => !savedOnly || saved.includes(source.id)).length])), [filters, savedOnly, saved]);
  const dateCoverage = useMemo(() => {
    const records = getWaterSources({ ...filters, windowStatus: undefined }).filter(source => !savedOnly || saved.includes(source.id));
    return { within: records.filter(source => source.windowStatus === 'in-window').length, background: records.filter(source => source.windowStatus === 'background').length, undated: records.filter(source => source.windowStatus === 'undated').length };
  }, [filters, savedOnly, saved]);
  const toggleSave = (source: WaterSource) => {
    const wasSaved = saved.includes(source.id);
    const next = wasSaved ? saved.filter(id => id !== source.id) : [...saved, source.id];
    setSaved(next);
    try { localStorage.setItem(READING_LIST_KEY, JSON.stringify(next)); setStatus(wasSaved ? 'Removed from your water and food reading list.' : 'Saved to your water and food reading list on this browser.'); }
    catch { setStatus('Reading list updated for this session. Browser storage is unavailable.'); }
    if (wasSaved && savedOnly) window.requestAnimationFrame(() => document.getElementById('water-evidence-title')?.focus({ preventScroll: true }));
  };
  const exportSources = () => {
    const columns = ['id', 'title', 'publisher', 'type', 'evidence', 'published_at', 'period', 'review_window_status', 'geographic_scope', 'geographic_label', 'states', 'localities_with_kind', 'domains', 'food_chain_stages', 'establishes', 'limitations', 'source_url', 'retrieved_at', 'retrieval_status', 'locator', 'issued_at', 'valid_from', 'valid_until', 'forecast_status_at_snapshot', 'snapshot_date'];
    const rows = sources.map(source => [source.id, source.title, source.publisher, source.type, evidenceLabels[source.tier], source.publishedAt ?? '', source.period, source.windowStatus, source.scope, source.geographicLabel ?? '',
      source.stateCodes.map(code => stateByCode.get(code) ?? code).join('; '), source.localityIds.map(id => { const place = localityById.get(id); return place ? `${place.name} (${place.kind}, ${stateByCode.get(place.stateCode) ?? place.stateCode})` : id; }).join('; '),
      source.domains.map(domainLabel).join('; '), source.stages.map(stageLabel).join('; '), source.summary, source.limitations.join('; '), source.url, source.retrievedAt, source.retrievalStatus ?? '', source.locator ?? '', source.issuedAt ?? '', source.validFrom ?? '', source.validUntil ?? '', getForecastStatus(source), WATER_UPDATED_AT]);
    const csv = '\uFEFF' + [columns, ...rows].map(row => row.map(waterCsvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `water-food-sources-${WATER_UPDATED_AT}.csv`;
    document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Exported ${sources.length} matching source${sources.length === 1 ? '' : 's'} with scope, provenance and bulletin validity.`);
  };
  const copyLink = async () => {
    const url = window.location.href;
    try { await navigator.clipboard.writeText(url); setStatus(savedOnly ? 'Link copied. Each browser has its own local reading list.' : 'Link copied with your research filters.'); }
    catch { setShareUrl(url); setStatus('Select and copy the research link below.'); }
  };

  return <div className="water-page">
    <header className="water-hero"><div>
      <Kicker>India / Water &amp; food security</Kicker><PageTitle>Water, from source to plate.</PageTitle>
      <p className="water-intro">Trace <strong>drinking-water supply, groundwater and the food chain</strong> through public records. Follow seeds, farm inputs, irrigation, grain, rice and vegetables — with dated evidence on procurement, drought and disruption.</p>
      <p className="water-window">Five-year review · {dateLabel(WATER_WINDOW.start)} — {dateLabel(WATER_WINDOW.end)}<br />Compiled snapshot · {dateLabel(WATER_UPDATED_AT)} · Not a live alert service</p>
    </div><aside className="water-context" aria-labelledby="water-context-title">
      <p className="water-overline">One system. Different evidence.</p><h2 id="water-context-title">Follow the connection. Check the claim.</h2>
      <ol><li><span>01</span><span><strong>A tap is a connection.</strong><br />Regular supply and safe water need separate evidence.</span></li><li><span>02</span><span><strong>A dry season is a signal.</strong><br />Declared drought and local crop losses need their own records.</span></li><li><span>03</span><span><strong>A crop estimate is production.</strong><br />Market arrivals, storage and distribution are different measures.</span></li></ol>
      <button onClick={() => jumpTo('water-coverage')}>Read the coverage boundary <ArrowDownRight size={15} className="inline-block" aria-hidden="true" /></button>
    </aside></header>

    <nav className="water-route-nav" aria-label="On this water and food page">
      <button onClick={() => jumpTo('water-evidence')}><span>01</span> Evidence desk</button><button onClick={() => jumpTo('water-observations')}><span>02</span> Recorded measures</button><button onClick={() => jumpTo('water-investigations')}><span>03</span> Open questions</button><button onClick={() => jumpTo('water-discovery')}><span>04</span> Local research routes</button>
    </nav>

    <section className="water-workbench" aria-labelledby="water-workbench-title"><div className="water-workbench-top"><h2 id="water-workbench-title">Choose a place and a line of enquiry.</h2><p>Each view can be saved as a link.</p></div>
      {invalidParams.length > 0 && <div className="water-invalid" role="status">This link contains an unrecognised {invalidParams.join(', ')} filter. The default view is used for those values. <button className="water-text-button" onClick={reset}>Reset filters</button></div>}
      <div className="water-lenses" role="group" aria-label="Filter by subject lens"><button onClick={() => patch({ domain: undefined })} aria-pressed={!filters.domain}>All subjects</button>{WATER_DOMAINS.map(domain => <button key={domain.value} onClick={() => patch({ domain: domain.value })} aria-pressed={filters.domain === domain.value}>{domain.label}</button>)}</div>
      <form onSubmit={submitSearch} aria-label="Search water and food records"><div className="water-search-fields">
        <label className="water-field"><span className="water-label" id="water-state-label">State or union territory</span><select aria-labelledby="water-state-label" value={filters.stateCode ?? ''} onChange={event => patch({ state: event.target.value || undefined })}><option value="">All states &amp; UTs</option>{WATER_STATES.map(state => <option key={state.code} value={state.code}>{state.name}</option>)}</select></label>
        <label className="water-field"><span className="water-label">City, district or village</span><input type="search" value={placeDraft} onChange={event => setPlaceDraft(event.target.value)} placeholder="Enter a place name" list="water-locality-options" aria-describedby="water-geography-note" /></label>
        <datalist id="water-locality-options">{WATER_LOCALITIES.filter(place => !filters.stateCode || place.stateCode === filters.stateCode).map(place => <option key={place.id} value={place.name} label={`${place.kind} · ${stateByCode.get(place.stateCode) ?? place.stateCode}`} />)}</datalist>
        <label className="water-field"><span className="water-label">Topic, crop, scheme or document</span><input type="search" value={queryDraft} onChange={event => setQueryDraft(event.target.value)} placeholder="e.g. rice, drought, tender" /></label>
        <button className="water-button water-button-primary" type="submit"><Search size={16} aria-hidden="true" />Search</button>
      </div><div className="water-extra-fields">
        <label className="water-field"><span className="water-label" id="water-type-label">Source type</span><select aria-labelledby="water-type-label" value={filters.type ?? ''} onChange={event => patch({ type: event.target.value || undefined })}><option value="">All source types</option>{WATER_SOURCE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <label className="water-field"><span className="water-label" id="water-window-label">Publication window</span><select aria-labelledby="water-window-label" value={selectedWindow} onChange={event => patch({ window: event.target.value === 'in-window' ? undefined : event.target.value })}>{windowChoices.map(window => <option key={window.value} value={window.value}>{window.label}</option>)}</select></label>
      </div></form>
      <p className="water-workbench-note" id="water-geography-note">All {WATER_STATES.length} states and union territories are selectable. State views include national context. Place searches match the curated records, not a census of every city or village. Publication date determines the review window; the measurement period is shown separately.</p>
      <p className="water-window-summary">Available for these filters across dates: <button onClick={() => patch({ window: undefined })}>{dateCoverage.within} within the five-year window</button><span aria-hidden="true"> · </span><button onClick={() => patch({ window: 'background' })}>{dateCoverage.background} background</button><span aria-hidden="true"> · </span><button onClick={() => patch({ window: 'undated' })}>{dateCoverage.undated} undated / imprecise</button>.</p>
      <div className="water-workbench-footer"><p className="water-result-count" role="status"><strong>{sources.length}</strong> of {WATER_SOURCES.length} source records{savedOnly ? ' · reading list only' : ''}{filters.stateCode && nationalCount > 0 ? ` · ${nationalCount} national context` : ''}<br />{windowChoices.find(window => window.value === selectedWindow)?.label}{filters.stage ? ` · ${stageLabel(filters.stage)}` : ''}</p>
        <div className="water-tools"><button className="water-button" onClick={() => patch({ saved: savedOnly ? undefined : '1' })} aria-pressed={savedOnly}><Bookmark size={14} aria-hidden="true" />Saved ({saved.length})</button><button className="water-button" onClick={copyLink}><LinkIcon size={14} aria-hidden="true" />Copy link</button><button className="water-button" onClick={exportSources} disabled={sources.length === 0}><Download size={14} aria-hidden="true" />Export CSV</button>{hasFilters && <button className="water-text-button" onClick={reset}>Clear filters</button>}</div>
      </div>{savedOnly && <p className="water-workbench-note">The reading list filters the document list, its counts and CSV. Recorded measures and open questions follow the other research filters.</p>}<p className="water-status" role="status">{status}</p>{shareUrl && <label className="water-field mt-3"><span className="water-label">Research link</span><input value={shareUrl} readOnly onFocus={event => event.target.select()} /></label>}
    </section>

    <section className="water-chain" aria-labelledby="water-chain-title"><div className="water-chain-heading"><h2 id="water-chain-title">Follow a stage in the food chain.</h2><button onClick={() => patch({ stage: undefined })} aria-pressed={!filters.stage}>All stages</button></div>
      <div className="water-chain-grid" role="group" aria-label="Filter by food-chain stage">{WATER_STAGES.map((stage, index) => <button className="water-stage" key={stage.value} onClick={() => patch({ stage: filters.stage === stage.value ? undefined : stage.value })} aria-pressed={filters.stage === stage.value}>
        <span className="water-index">{String(index + 1).padStart(2, '0')}</span>{index < WATER_STAGES.length - 1 && <ArrowRight size={12} className="water-stage-arrow" aria-hidden="true" />}<span className="water-stage-name">{stage.label}</span><span className="water-stage-count">{stageCounts.get(stage.value) ?? 0} source records</span>
      </button>)}</div><p>The chain organises documents; an arrow does not establish causation. Stage counts reflect your other evidence filters. Drinking-water records can be explored with all stages selected.</p>
    </section>

    <section className="water-section" id="water-evidence" aria-labelledby="water-evidence-title"><Heading index="01" id="water-evidence-title" title="The evidence desk" count={`${sources.length} matching records`} />
      <div className="water-source-layout"><div className="water-source-list">
        {sources.length === 0 ? <><Empty title={savedOnly ? 'No saved sources match this view.' : 'No recorded sources match this view.'} onReset={hasFilters ? reset : undefined}>{savedOnly ? 'Your water and food reading list is stored in this browser. Broaden the publication window or filters to see other saved records.' : 'This is a gap in this curated register, not evidence of no water supply, no farming or no public spending. Try the state, another place spelling or a broader source window.'}</Empty>{!savedOnly && <LocalDiscovery tools={discovery} place={filters.place} stateCode={filters.stateCode} />}</> : sources.slice(0, visibleSources).map(source => <article className="water-source" key={source.id} id={`water-source-${source.id}`}>
          <div className="water-source-head"><div><p className="water-meta"><span className="water-evidence" data-tier={source.tier}>{evidenceLabels[source.tier]}</span><span>{typeLabel(source.type)}</span><span>{source.scope === 'national' ? 'National context' : `${source.scope} record`}</span></p><h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></h3></div><button className="water-save" onClick={() => toggleSave(source)} aria-pressed={saved.includes(source.id)} aria-label={`${saved.includes(source.id) ? 'Remove saved source' : 'Save source'}: ${source.title}`} title={saved.includes(source.id) ? 'Remove from water reading list' : 'Save to water reading list'}>{saved.includes(source.id) ? <Check size={17} aria-hidden="true" /> : <Bookmark size={17} aria-hidden="true" />}</button></div>
          <p className="water-source-summary">{source.summary}</p><p className="water-source-place"><strong>{source.publisher}</strong> · {placeLabel(source)}<br />{source.domains.map(domainLabel).join(' / ')}{source.stages.length ? ` · ${source.stages.map(stageLabel).join(' / ')}` : ''}</p>
          <div className="water-source-dates" data-window={source.windowStatus}><p><strong>{windowLabels[source.windowStatus]}</strong><br />Published: {source.publishedAt ? dateLabel(source.publishedAt) : 'Date not established'} · Described period: {source.period}</p><ForecastStatus source={source} /></div>
          {source.type === 'discussion' && <p className="water-source-place">Attributed discussion is a research lead. It is not independent verification of the conditions described.</p>}
          <details><summary>Scope, limitations &amp; provenance</summary><p className="water-provenance">Geographic grain: {source.scope}<br />Retrieved: {dateLabel(source.retrievedAt)} · Record {source.id}{source.retrievalStatus && <><br />Retrieval: {source.retrievalStatus}</>}{source.locator && <><br />Within the source: {source.locator}</>}</p>
            {source.localityIds.length > 0 && <p className="water-provenance">Recorded localities: {source.localityIds.map(id => { const place = localityById.get(id); return place ? `${place.name} (${place.kind}, ${stateByCode.get(place.stateCode) ?? place.stateCode})` : id; }).join('; ')}</p>}
            <ul className="water-limitations">{source.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>
          </details>
        </article>)}
        {sources.length > visibleSources && <button className="water-button water-more" onClick={() => setVisibleSources(value => value + 12)}>Show {Math.min(12, sources.length - visibleSources)} more sources · {sources.length - visibleSources} remaining</button>}
      </div><aside className="water-reader" aria-labelledby="water-reader-title"><p className="water-overline">Read the clock and the scale</p><h3 id="water-reader-title">A dated record, not a live condition.</h3><p>A recent retrieval can contain an old observation. A national indicator can leave a local question unanswered.</p><dl><div><dt>Publication ≠ observation</dt><dd>Check when the source was issued and the season or financial year it describes.</dd></div><div><dt>District ≠ village</dt><dd>Match boundaries and location IDs before applying a state or district result to a settlement.</dd></div><div><dt>Notice ≠ payment</dt><dd>A tender estimate, contract award, completed work and payment each need their own evidence.</dd></div><div><dt>Bulletin ≠ current warning</dt><dd>Issued and expiry dates determine a bulletin’s scope. This desk does not monitor emergencies.</dd></div></dl><button onClick={() => jumpTo('water-discovery')}>Find the official local record <ArrowDownRight size={15} className="inline-block" aria-hidden="true" /></button></aside></div>
    </section>

    <section className="water-section" id="water-observations" aria-labelledby="water-observations-title"><Heading index="02" id="water-observations-title" title="Measures with their original meaning" count={`${observations.length} observations`} /><p className="water-section-intro">These figures retain the source’s units, period and measure. They are not a combined water-security score. Connections, sampled functionality, rainfall, groundwater extraction, harvests and financial stages cannot be added or substituted for one another. For measures and open questions, source-type and publication filters match at least one cited record; all supporting citations remain visible.</p>
      {observations.length ? <><div className="water-observation-list">{observations.slice(0, visibleObservations).map(observation => <article className="water-observation" key={observation.id}>
        <p className="water-overline">{observation.measure.replace(/-/gu, ' ')}{observation.accountingStage ? ` · ${observation.accountingStage}` : ''}</p><h3>{observation.label}</h3><p className="water-observation-value">{number.format(observation.value)} <span>{observation.unit}</span></p><p className="water-observation-period">{observation.period}{observation.asOf ? ` · As of ${dateLabel(observation.asOf)}` : ''}<br />{observation.scope === 'national' ? 'National observation' : observation.localityIds.map(id => { const place = localityById.get(id); return place ? `${place.name} ${place.kind}` : id; }).concat(observation.stateCodes.map(code => stateByCode.get(code) ?? code)).join(' · ')}</p>
        <p className="water-observation-copy">{observation.summary}</p>{observation.denominator != null && <p className="water-observation-copy">Denominator: {number.format(observation.denominator)} {observation.denominatorLabel ?? '(see source definition)'}</p>}{observation.limitations[0] && <p className="water-observation-copy mt-3"><strong>Read with:</strong> {observation.limitations[0]}</p>}<SourceLinks ids={observation.sourceIds} />{observation.limitations.length > 1 && <details><summary>Further measure limitations</summary><ul className="water-limitations">{observation.limitations.slice(1).map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details>}
      </article>)}</div>{observations.length > visibleObservations && <button className="water-button water-more" onClick={() => setVisibleObservations(value => value + 12)}>Show {Math.min(12, observations.length - visibleObservations)} more observations · {observations.length - visibleObservations} remaining</button>}</> : <Empty title="No sourced measures match these filters.">Source documents may still provide qualitative evidence. Broaden the geography, stage or publication window to inspect the quantitative records loaded here.</Empty>}
    </section>

    <section className="water-section" id="water-investigations" aria-labelledby="water-investigations-title"><Heading index="03" id="water-investigations-title" title="Where the record needs another check" count={`${leads.length} research leads`} /><div className="water-guardrail"><strong>Investigate a discrepancy. Test the alternatives.</strong> Reports and audits can identify questions about service, procurement or crop stress. An association across the food chain does not establish causation, fraud or a forecast. Each lead needs matching place, period and indicator evidence.</div>
      {leads.length ? <><div>{leads.slice(0, visibleLeads).map(lead => <article className="water-lead" key={lead.id}><div><p className="water-overline">{lead.kind === 'source-finding' ? 'Source finding · attributed' : lead.kind === 'methodology' ? 'Methodology · context' : 'Research question · not a finding'}</p><h3>{lead.title}</h3><p>{lead.summary}</p><SourceLinks ids={lead.sourceIds} /></div><dl className="water-lead-tests"><div><dt>Signal and attribution</dt><dd>{lead.signal}<br />{lead.attribution}</dd></div><div><dt>Other explanations to test</dt><dd><ul>{lead.alternativeExplanations.map((alternative, index) => <li key={index}>{alternative}</li>)}</ul></dd></div><div><dt>What would resolve or weaken it</dt><dd>{lead.falsifier}</dd></div></dl></article>)}</div>{leads.length > visibleLeads && <button className="water-button water-more" onClick={() => setVisibleLeads(leads.length)}>Show all {leads.length} research leads</button>}</> : <Empty title="No research leads are recorded in this view.">This is a coverage limit, not a conclusion that local service, procurement or food-supply questions have been resolved.</Empty>}
    </section>

    <section className="water-section" id="water-discovery" aria-labelledby="water-discovery-title"><Heading index="04" id="water-discovery-title" title="Go from a place name to a public record" count={`${discovery.length} discovery routes`} /><p className="water-section-intro">These official retrieval routes follow the selected state, subject and stage. They deliberately remain available when a city or village search has no recorded evidence. They do not follow the topic, source-type or publication-window filters and do not establish local coverage.</p>
      {discovery.length ? <div className="water-discovery-list">{discovery.map(tool => <article className="water-discovery" key={tool.id}><div><p className="water-overline">Available detail · {tool.availableGrains.join(' / ')}</p><h3><a href={tool.url} target="_blank" rel="noopener noreferrer">{tool.title} <ArrowUpRight size={16} className="inline-block" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a></h3><p>{tool.summary}</p><SourceLinks ids={tool.sourceIds} /></div><div><ol>{tool.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>{tool.limitations.length > 0 && <ul className="water-limitations">{tool.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>}</div></article>)}</div> : <><Empty title="No specialised discovery route is tagged for this view.">Broaden the subject or stage to find the recorded official data portals, or start a place-specific public-record search below.</Empty><LocalDiscovery tools={[]} place={filters.place} stateCode={filters.stateCode} /></>}
    </section>

    <section className="water-section" id="water-coverage" aria-labelledby="water-coverage-title"><Heading index="05" id="water-coverage-title" title="The edge of this evidence" /><div className="water-coverage-columns"><div><h3>A five-year window, a partial local register.</h3><p>{WATER_SOURCES.length} curated source records are loaded; {totalInWindow} were published within {dateLabel(WATER_WINDOW.start)}–{dateLabel(WATER_WINDOW.end)}. All {WATER_STATES.length} states and union territories are selectable. City, district and village records cover only named localities; absence from this register is not absence of service or need.</p><ul>{WATER_COVERAGE_NOTES.map((note, index) => <li key={index}>{note}</li>)}</ul></div><div><h3>Preserve dates, definitions and boundaries.</h3><p>Background publications and undated portals are labelled separately. Publication-window membership does not mean that every observation in a report falls within the same five years. A search result, discussion or procurement notice remains limited to what it establishes.</p><ul>{WATER_METHODOLOGY.map((note, index) => <li key={index}>{note}</li>)}</ul></div></div>
      <details className="water-coverage-details"><summary>View explicit source coverage for all {WATER_STATES.length} states and union territories</summary><p className="water-workbench-note">Counts cover explicitly tagged state records across all publication dates, excluding national context. A multi-state source can appear under more than one state. These counts measure this register, not water access, crop supply or spending.</p><div className="water-state-list">{WATER_STATES.map(state => { const count = WATER_SOURCES.filter(source => source.scope !== 'national' && source.stateCodes.includes(state.code)).length; return <div className="water-state-row" key={state.code}><span>{state.name}</span><span>{count ? `${count} sourced record${count === 1 ? '' : 's'}` : 'Not yet recorded'}</span></div>; })}</div></details>
    </section>
    <footer className="water-endnote">Snapshot · {dateLabel(WATER_UPDATED_AT)}. This desk records dated evidence; it does not issue live warnings, certify local water safety or forecast crop losses. Reading lists stay on this browser. Source links may change after retrieval.</footer>
  </div>;
}
