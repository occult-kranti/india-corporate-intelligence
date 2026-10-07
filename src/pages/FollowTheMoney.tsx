import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BookmarkPlus, Check, Download, FileText, GitBranch, MapPin, Search, Share2, X } from 'lucide-react';
import { INVESTIGATION_REGISTRY, INVESTIGATION_STATES, INVESTIGATION_DOMAINS, getInvestigationStateCoverage, getInvestigationView, normalizeInvestigationState, type InvestigationEntity, type InvestigationRecord, type InvestigationRelationship, type InvestigationSource } from '../data/investigation';
import { DEEP_INVESTIGATION_CASES, DEEP_INVESTIGATION_UNIVERSE, DEEP_INVESTIGATION_COVERAGE, DEEP_INVESTIGATION_MODEL, getDeepInvestigationCase, getDeepInvestigationCaseEvidence, getDeepInvestigationConnections } from '../data/deepInvestigation';
import InvestigationMap from '../components/investigation/InvestigationMap';
import InvestigationGraph from '../components/investigation/InvestigationGraph';
import Casebook, { pinCasebookItem, useCasebook } from '../components/investigation/Casebook';
import { buildCasebookPacket, emptyCasebook, type CasebookSelection } from '../components/investigation/casebookStore';
import { useHistorySearchDrafts } from '../lib/useHistorySearchDrafts';
import { AtlasCaseFeed, AtlasPolicyTimeline } from '../components/investigation/AtlasCaseFeed';
import { AtlasNetwork } from '../components/investigation/AtlasNetwork';
import { AtlasTimeControl } from '../components/investigation/AtlasControls';
import { getAtlasVisibleSites, ATLAS_DISCOVERY_MODEL } from '../data/atlasInvestigation';
import { createInvestigationMatcher } from '../data/investigationFilters';
import './follow-the-money.css';
import '../components/investigation/atlas-workspace.css';
import './follow-the-money-atlas.css';

const registry = INVESTIGATION_REGISTRY;
const entities = new Map(registry.entities.map(row => [row.id, row]));
const relationships = new Map(registry.relationships.map(row => [row.id, row]));
const records = new Map(registry.records.map(row => [row.id, row]));
const sources = new Map(registry.sources.map(row => [row.id, row]));
const stateNames = new Map(INVESTIGATION_STATES.map(row => [row.code, row.name]));
const domainNames = new Map(INVESTIGATION_DOMAINS.map(row => [row.value, row.label]));
const unique = <T,>(values: T[]) => [...new Set(values)];
const labelOf = (item: InvestigationEntity | InvestigationRecord | InvestigationRelationship) => 'title' in item ? item.title : item.label;
const pretty = (value: string) => value.replace(/[-_]/gu, ' ');
const isoDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
const dateLabel = (value: string | null) => {
  if (!value) return 'Date not recorded';
  const date = /^\d{4}-\d{2}-\d{2}/u.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : null;
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date) : value;
};
const sourceIdsOf = (item: InvestigationEntity | InvestigationRecord | InvestigationRelationship) => unique([...item.sourceIds, ...item.geography.flatMap(geo => geo.sourceIds)]);
const casePlaces = (item: InvestigationRecord) => unique(item.geography.flatMap(geo => geo.stateCodes));
const countryNames: Record<string, string> = { IN: 'India', BD: 'Bangladesh', US: 'United States', GB: 'United Kingdom', ES: 'Spain', FR: 'France', RU: 'Russia', PH: 'Philippines', JP: 'Japan', DE: 'Germany', LK: 'Sri Lanka', NP: 'Nepal', BT: 'Bhutan', SG: 'Singapore', AE: 'United Arab Emirates' };
const casePlaceLabel = (item: InvestigationRecord) => {
  const states = casePlaces(item).map(code => stateNames.get(code) ?? code);
  const countries = unique(item.geography.flatMap(geo => geo.countryCodes ?? [])).map(code => countryNames[code] ?? `Country ${code}`);
  return [...states, ...countries].join(' · ') || (item.geography.some(geo => geo.scope === 'national') ? 'India · national context' : 'Location not established');
};
function download(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function SourceList({ ids, selectedId, onSelect }: { ids: string[]; selectedId?: string | null; onSelect: (id: string) => void }) {
  return <ol className="fm-sources">{unique(ids).map((id, index) => {
    const source = sources.get(id);
    return <li key={id} className={selectedId === id ? 'is-selected' : ''}>
      <span className="fm-source-number">{String(index + 1).padStart(2, '0')}</span>
      {source ? <div><button type="button" onClick={() => onSelect(id)} className="fm-text-button">{source.title}</button><span>{source.publisher} · {source.tier} · {source.publishedAt ? dateLabel(source.publishedAt) : 'Publication date unrecorded'}</span><p>{source.locator}</p><a href={source.url} target="_blank" rel="noopener noreferrer">Open cited source <ArrowUpRight size={12} aria-hidden="true" /></a></div> : <div><strong>Source unavailable</strong><p>{id}. The retained identifier cannot be resolved in this snapshot.</p></div>}
    </li>;
  })}</ol>;
}

function SourceDetail({ source }: { source: InvestigationSource }) {
  return <div className="fm-source-detail" data-source-id={source.id}><p className="fm-eyebrow">Cited document</p><h3>{source.title}</h3><p>{source.summary}</p><dl><div><dt>Publisher</dt><dd>{source.publisher}</dd></div><div><dt>Published / retrieved</dt><dd>{source.publishedAt ?? 'Unknown'} / {source.retrievedAt ?? 'Unknown'}</dd></div><div><dt>Exact locator</dt><dd>{source.locator}</dd></div></dl>{source.limitations.map(text => <p key={text} className="fm-muted">{text}</p>)}<a className="fm-primary" href={source.url} target="_blank" rel="noopener noreferrer">Open cited source <ArrowUpRight size={15} aria-hidden="true" /></a></div>;
}

export default function FollowTheMoney() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [query, setQuery] = useState(params.get('ftm_q') ?? '');
  const [notice, setNotice] = useState('');
  const [heldOpen, setHeldOpen] = useState(false);
  const discoveryRef = useRef<HTMLElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const casebookRef = useRef<HTMLElement>(null);
  const book = useCasebook();
  const urlQuery = params.get('ftm_q') ?? '';
  useEffect(() => setQuery(urlQuery), [urlQuery]);
  useHistorySearchDrafts(setQuery, undefined, 'ftm_q');
  const requestedCase = params.get('ftm_case');
  const activeCase = requestedCase ? getDeepInvestigationCase(requestedCase) : DEEP_INVESTIGATION_CASES[0];
  const evidence = useMemo(() => activeCase ? getDeepInvestigationCaseEvidence(activeCase.id) : undefined, [activeCase]);
  const requestedState = params.get('ftm_state') ?? params.get('iw_state');
  const state = normalizeInvestigationState(requestedState);
  const domain = params.get('ftm_domain') ?? '';
  const nodeId = params.get('ftm_node');
  const edgeId = params.get('ftm_edge');
  const recordId = params.get('ftm_record');
  const sourceId = params.get('ftm_source');
  const selectedNode = nodeId ? entities.get(nodeId) : undefined;
  const selectedEdge = edgeId ? relationships.get(edgeId) : undefined;
  const selectedRecord = recordId ? records.get(recordId) : undefined;
  const highlightedEdges = useMemo(() => selectedEdge ? [selectedEdge.id] : [], [selectedEdge]);
  const selectedSource = sourceId ? sources.get(sourceId) : undefined;
  const inspected = selectedEdge ?? selectedRecord ?? selectedNode ?? activeCase;
  const selection: CasebookSelection | undefined = selectedEdge ? { kind: 'relationship', id: selectedEdge.id } : selectedRecord ? { kind: 'record', id: selectedRecord.id } : selectedNode ? { kind: 'entity', id: selectedNode.id } : activeCase ? { kind: 'record', id: activeCase.id } : undefined;
  const graphView = params.get('ftm_graph') === 'table' ? 'table' : 'graph';
  const graphDepth = params.get('ftm_depth') === '2' ? 2 : 1;
  const universe = params.get('ftm_scope') === 'securities';
  const showBook = params.get('ftm_view') === 'casebook';
  const focusedEntity = !selectedEdge && !selectedRecord ? selectedNode : undefined;
  const incident = useMemo(() => focusedEntity ? getDeepInvestigationConnections(focusedEntity.id) : undefined, [focusedEntity]);
  const inspectedPacket = useMemo(() => {
    const item = selectedEdge ?? selectedRecord;
    if (!item) return undefined;
    return buildCasebookPacket({ ...emptyCasebook(), pins: [{ kind: selectedEdge ? 'relationship' : 'record', id: item.id, addedAt: '', note: '' }] }, registry);
  }, [selectedEdge, selectedRecord]);
  const graphEvidence = inspectedPacket ?? evidence;
  const graphEntities = focusedEntity ? registry.entities : graphEvidence?.entities ?? [];
  const graphRelationships = focusedEntity ? registry.relationships : graphEvidence?.relationships ?? [];
  const graphSources = focusedEntity ? registry.sources : graphEvidence?.sources ?? [];
  const rawAtlasFrom = params.get('ftm_from'), rawAtlasTo = params.get('ftm_to');
  const reversedAtlasDates = isoDate(rawAtlasFrom) && isoDate(rawAtlasTo) && rawAtlasFrom > rawAtlasTo;
  const atlasFrom = !reversedAtlasDates && isoDate(rawAtlasFrom) ? rawAtlasFrom : undefined;
  const atlasTo = !reversedAtlasDates && isoDate(rawAtlasTo) ? rawAtlasTo : undefined;
  const atlasFilters = useMemo(() => ({ stateCode: state ?? undefined, domains: domain ? [domain] : undefined, from: atlasFrom, to: atlasTo, includeUndated: true, includeNational: true }), [state, domain, atlasFrom, atlasTo]);
  const atlasSites = useMemo(() => getAtlasVisibleSites(registry, atlasFilters), [atlasFilters]);
  const coverage = useMemo(() => getInvestigationStateCoverage({ ...atlasFilters, stateCode: undefined }), [atlasFilters]);
  const allView = useMemo(() => getInvestigationView(atlasFilters), [atlasFilters]);
  const visibleCases = useMemo(() => DEEP_INVESTIGATION_CASES.filter(createInvestigationMatcher(registry, atlasFilters)), [atlasFilters]);
  const caseOutsideScope = activeCase && !visibleCases.some(item => item.id === activeCase.id);
  const timeline = useMemo(() => [...(evidence?.relationships ?? [])].sort((a, b) => (a.fromDate ?? '9999').localeCompare(b.fromDate ?? '9999') || a.id.localeCompare(b.id)), [evidence]);
  const responses = useMemo(() => {
    if (!inspected) return [];
    const edges = 'from' in inspected ? [inspected] : 'relationshipIds' in inspected ? inspected.relationshipIds.map(id => relationships.get(id)).filter((row): row is InvestigationRelationship => !!row) : incident?.relationships ?? [];
    return unique(edges.flatMap(edge => edge.responseIds)).map(id => records.get(id) ?? relationships.get(id)).filter((row): row is InvestigationRecord | InvestigationRelationship => !!row);
  }, [inspected, incident]);
  const discovery = useMemo(() => {
    const view = getInvestigationView({ ...atlasFilters, q: urlQuery, geographyMode: 'all' });
    return [
      ...view.entities.map(item => ({ kind: 'entity' as const, item })),
      ...view.records.map(item => ({ kind: 'record' as const, item })),
      ...view.relationships.map(item => ({ kind: 'relationship' as const, item })),
    ];
  }, [urlQuery, atlasFilters]);
  const securities = useMemo(() => {
    const q = urlQuery.trim().toLocaleLowerCase('en-IN');
    return DEEP_INVESTIGATION_UNIVERSE.securities.filter(row => !q || `${row.name} ${row.symbol} ${row.isin}`.toLocaleLowerCase('en-IN').includes(q));
  }, [urlQuery]);
  const pageSize = 20;
  const resultCount = universe ? securities.length : discovery.length;
  const page = Math.min(Math.max(0, Number.parseInt(params.get('ftm_page') ?? '0', 10) || 0), Math.max(0, Math.ceil(resultCount / pageSize) - 1));
  const unavailable = [(rawAtlasFrom && !isoDate(rawAtlasFrom) || rawAtlasTo && !isoDate(rawAtlasTo) || reversedAtlasDates) && 'date range (valid defaults shown)', nodeId && !selectedNode && 'entity', edgeId && !selectedEdge && 'relationship', recordId && !selectedRecord && 'record', sourceId && !selectedSource && 'source'].filter(Boolean);
  function patch(values: Record<string, string | null>) {
    const next = new URL(window.location.hash.slice(1), window.location.origin).searchParams;
    for (const [key, value] of Object.entries(values)) { if (value === null || value === '') next.delete(key); else next.set(key, value); }
    setParams(next);
  }
  function openCase(item: InvestigationRecord) {
    patch({ ftm_case: item.id, ftm_node: null, ftm_edge: null, ftm_record: null, ftm_source: null });
    setNotice('');
  }
  function inspect(kind: CasebookSelection['kind'], id: string, scroll = true) {
    patch({ ftm_node: kind === 'entity' ? id : null, ftm_edge: kind === 'relationship' ? id : null, ftm_record: kind === 'record' ? id : null, ftm_source: null, ftm_view: null });
    if (scroll) requestAnimationFrame(() => { inspectorRef.current?.scrollIntoView({ block: 'start' }); inspectorRef.current?.focus({ preventScroll: true }); });
  }
  function inspectSource(id: string) {
    patch({ ftm_source: id });
    requestAnimationFrame(() => { inspectorRef.current?.scrollIntoView({ block: 'start' }); inspectorRef.current?.focus({ preventScroll: true }); });
  }
  function search(event: FormEvent) { event.preventDefault(); patch({ ftm_q: query.trim(), ftm_page: null }); requestAnimationFrame(() => discoveryRef.current?.scrollIntoView({ block: 'start' })); }
  function exportCase() {
    if (!activeCase) return;
    const packet = buildCasebookPacket({ ...emptyCasebook(), title: activeCase.title, question: activeCase.summary, falsifier: activeCase.falsifier ?? '', pins: [{ kind: 'record', id: activeCase.id, addedAt: new Date().toISOString(), note: '' }], views: [{ id: 'money-trail', label: activeCase.title, url: `#${location.pathname}${location.search}`, savedAt: new Date().toISOString() }] }, registry);
    download(`${JSON.stringify(packet, null, 2)}\n`, 'follow-the-money-evidence.json');
    setNotice(`Exported this case with ${packet.relationships.length} relationships and ${packet.sources.length} source documents.`);
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setNotice('Link copied with this case, map scope and inspection.'); }
    catch { setNotice('Copy the address in your browser to share this exact view.'); }
  }
  const focusCase = () => patch({ ftm_node: null, ftm_edge: null, ftm_record: null, ftm_source: null });
  return <div className="fm-page" data-follow-the-money data-case-id={activeCase?.id ?? ''}>
    <header className="fm-header">
      <div><p className="fm-eyebrow">ICIP / Public money & private control</p><h1>Follow the money<span>.</span></h1><p className="fm-deck">Trace contracts, financing and ownership to the documents that establish them.</p></div>
      <div className="fm-header-actions"><button type="button" onClick={() => { patch({ ftm_view: showBook ? null : 'casebook' }); if (!showBook) requestAnimationFrame(() => casebookRef.current?.scrollIntoView({ block: 'start' })); }}><BookmarkPlus size={16} aria-hidden="true" />Casebook <span>{book.count}</span></button><button type="button" onClick={copyLink} aria-label="Copy link to this money trail"><Share2 size={16} aria-hidden="true" /><span>Share view</span></button></div>
    </header>
    <form className="fm-search" role="search" onSubmit={search}><Search size={19} aria-hidden="true" /><label className="fm-sr-only" htmlFor="fm-query">Search companies, contracts, programmes or ISINs</label><input id="fm-query" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="A company, contract, programme or ISIN…" /><select aria-label="Search collection" value={universe ? 'securities' : 'evidence'} onChange={event => patch({ ftm_scope: event.target.value === 'securities' ? 'securities' : null, ftm_page: null })}><option value="evidence">Retained evidence</option><option value="securities">NSE securities</option></select><button type="submit">Search <ArrowRight size={16} aria-hidden="true" /></button></form>
    <div className="fm-edition"><span><i aria-hidden="true" />{DEEP_INVESTIGATION_CASES.length} research casefiles</span><span>{registry.relationships.length.toLocaleString('en-IN')} retained relationships</span><span>{DEEP_INVESTIGATION_UNIVERSE.totalSecurities.toLocaleString('en-IN')} NSE securities indexed</span><span>Evidence snapshot · {registry.updatedAt}</span></div>
    {notice && <p className="fm-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={14} /></button></p>}
    {unavailable.length > 0 && <p className="fm-notice" role="status">The requested {unavailable.join(', ')} is unavailable in this snapshot. <button type="button" onClick={focusCase}>Return to the case</button></p>}
    {requestedState && requestedState !== 'all' && !state && <p className="fm-notice">The place identifier “{requestedState}” does not resolve to a current state or union territory. All India is shown.</p>}
    <AtlasTimeControl filters={atlasFilters} records={allView.records} onChange={({ from, to }) => patch({ ftm_from: from ?? null, ftm_to: to ?? null })} />
    <section className="fm-atlas" aria-label="Money trail investigation atlas">
      <aside className="fm-case-index" aria-labelledby="fm-cases-title"><div className="fm-section-top"><p className="fm-eyebrow">Start with a question</p><h2 id="fm-cases-title">Research casefiles <span>{visibleCases.length}</span></h2><label htmlFor="fm-domain">Investigation field</label><select id="fm-domain" value={domain} onChange={event => patch({ ftm_domain: event.target.value, ftm_page: null })}><option value="">Across all fields</option>{INVESTIGATION_DOMAINS.map(row => <option key={row.value} value={row.value}>{row.label}</option>)}</select></div>
        {state && <div className="fm-place-filter"><MapPin size={12} aria-hidden="true" />{stateNames.get(state)} + national context<button type="button" onClick={() => patch({ ftm_state: 'all' })} aria-label="Clear place filter"><X size={13} /></button></div>}
        <ol className="fm-case-list">{visibleCases.map((item, index) => <li key={item.id}><button type="button" aria-pressed={activeCase?.id === item.id} onClick={() => openCase(item)} data-case-option={item.id}><span className="fm-case-order">{String(index + 1).padStart(2, '0')}</span><span><small>{item.domains.slice(0, 2).map(value => domainNames.get(value) ?? pretty(value)).join(' / ')}</small><strong>{item.title}</strong><em>{casePlaceLabel(item)}</em></span><ArrowRight size={15} aria-hidden="true" /></button></li>)}</ol>
        {!visibleCases.length && <div className="fm-empty"><h3>No casefiles in this scope</h3><p>The retained registry may still contain evidence for this place or field.</p><button type="button" onClick={() => patch({ ftm_domain: null, ftm_state: 'all' })}>Show every casefile</button></div>}
        <p className="fm-index-note">Casefiles are research questions, including lawful transactions. Inclusion is not a finding of misconduct.</p>
      </aside>
      <div className="fm-map-panel"><InvestigationMap sites={atlasSites} onEntitySelect={id => inspect('entity', id)} spatial timeLabel={atlasFrom || atlasTo ? `${atlasFrom ?? 'Earliest'} — ${atlasTo ?? 'Latest'}` : 'All retained dates'} indexLabel="RETAINED GEOGRAPHIC EVIDENCE IN SCOPE" coverage={coverage} highlightedStateCodes={activeCase ? casePlaces(activeCase) : []} selectedState={state} onStateSelect={value => patch({ ftm_state: value ?? 'all' })} geographyMode="all" nationalRecords={allView.nationalRecords} unknownRecords={allView.unknownRecords} internationalRecords={allView.internationalRecords} />{activeCase && <div className="fm-case-geography"><MapPin size={15} aria-hidden="true" /><div><strong>Selected case geography · gold outline</strong>{activeCase.geography.map((geo, index) => <p key={index}>{pretty(geo.basis)} · {[...geo.stateCodes.map(code => stateNames.get(code) ?? code), ...(geo.countryCodes ?? []).map(code => countryNames[code] ?? `Country ${code}`)].join(', ') || pretty(geo.scope)}<small>{geo.note}</small></p>)}</div></div>}</div>
      <article className="fm-case-brief" aria-labelledby="fm-case-title">{activeCase ? <><div className="fm-case-overline"><p className="fm-eyebrow">Casefile / {activeCase.namespace.replace('deep-', '')}</p><span>{activeCase.tier}</span></div><h2 id="fm-case-title">{activeCase.title}</h2>{caseOutsideScope && <p className="fm-notice">This selected case is outside the current casefile filter. Selection is preserved.</p>}<p className="fm-case-summary">{activeCase.summary}</p><div className="fm-status"><span>Status in the record</span><strong>{pretty(activeCase.status)}</strong><small>As of {dateLabel(activeCase.statusAsOf)}</small></div>
        <div className="fm-case-amounts">{activeCase.amounts.slice(0, 3).map((amount, index) => <div key={index}><strong>{amount.currency === 'INR' ? '₹' : `${amount.currency} `}{amount.value.toLocaleString('en-IN')} <span>{amount.unit}</span></strong><p>{pretty(amount.stage)}</p><small>{amount.period}</small></div>)}</div>{activeCase.amounts.length > 0 && <p className="fm-amount-note">Separate accounting stages. These figures are not added together.</p>}
        <div className="fm-case-actions"><a href="#fm-trail" className="fm-primary" onClick={event => { event.preventDefault(); const trail = document.getElementById('fm-trail'); trail?.scrollIntoView({ block: 'start' }); trail?.focus({ preventScroll: true }); }}>Follow this trail <ArrowDown size={15} aria-hidden="true" /></a><button type="button" onClick={exportCase}><Download size={15} aria-hidden="true" />Evidence JSON</button><button type="button" onClick={() => setNotice(pinCasebookItem('record', activeCase.id) ? 'Case saved in your local casebook.' : 'Casebook is full. Export a copy before removing pins.')}><BookmarkPlus size={15} aria-hidden="true" />{book.isPinned('record', activeCase.id) ? 'Case saved' : 'Save case'}</button></div>
        <div className="fm-next-document"><p className="fm-eyebrow">What would close the question?</p><p>{activeCase.falsifier ?? 'No closure test is recorded. Inspect the source limitations before drawing a conclusion.'}</p></div>
        <div className="fm-brief-foot"><span>{evidence?.entities.length ?? 0} named entities</span><span>{evidence?.relationships.length ?? 0} typed links</span><button type="button" onClick={() => inspect('record', activeCase.id)}>{evidence?.sources.length ?? 0} source documents <ArrowUpRight size={12} aria-hidden="true" /></button></div>
      </> : <div className="fm-empty"><p className="fm-eyebrow">Case unavailable</p><h2 id="fm-case-title">This casefile is not in the current snapshot.</h2><p>Your URL has been preserved. Choose a listed case to continue, or search the retained registry below.</p>{DEEP_INVESTIGATION_CASES[0] && <button type="button" onClick={() => openCase(DEEP_INVESTIGATION_CASES[0])}>Open first research case</button>}</div>}</article>
    </section>
    <section id="fm-trail" tabIndex={-1} className="fm-trail" aria-labelledby="fm-trail-title"><header className="fm-section-heading"><div><p className="fm-eyebrow">01 / Follow the record</p><h2 id="fm-trail-title">Money, control & the missing steps</h2></div><p>Arrows preserve the source’s direction. An award, loan commitment or ownership link is not automatically a payment.</p></header>
      <ol className="fm-timeline">{timeline.map((edge, index) => <li key={edge.id}><button type="button" onClick={() => inspect('relationship', edge.id)} aria-pressed={edgeId === edge.id}><span className="fm-trail-date"><b>{String(index + 1).padStart(2, '0')}</b>{dateLabel(edge.fromDate)}</span><span className={`fm-relation-kind fm-tier-${edge.tier}`}>{pretty(edge.kind)} · {edge.tier}</span><strong>{entities.get(edge.from)?.label ?? 'Unresolved source entity'} <ArrowRight size={13} aria-hidden="true" /> {entities.get(edge.to)?.label ?? 'Unresolved target entity'}</strong><p>{edge.label}</p>{edge.amounts.map((amount, i) => <span className="fm-trail-amount" key={i}>{amount.currency} {amount.value.toLocaleString('en-IN')} {amount.unit}<small>{pretty(amount.stage)} · {amount.period}</small></span>)}<span className="fm-trail-source">{sourceIdsOf(edge).length} sources · Inspect step <ArrowUpRight size={12} aria-hidden="true" /></span></button></li>)}</ol>{!timeline.length && <p className="fm-empty">No typed relationships are available for this case. The missing trail remains unresolved.</p>}
    </section>
    <section className="fm-atlas-casefeed" aria-label="Cases and allegations in the selected map view"><AtlasCaseFeed registry={registry} filters={atlasFilters} onRelationshipSelect={id => inspect('relationship', id)} onRecordSelect={id => inspect('record', id)} onSourceSelect={inspectSource} /></section>
    <section className="fm-connections" aria-label="Connected entities and source inspection"><div className="fm-graph-column"><div className="fm-section-heading"><div><p className="fm-eyebrow">02 / Follow a connection</p><h2>The evidence network</h2></div>{(selectedNode || selectedEdge || selectedRecord) && <button type="button" onClick={focusCase}>Return to case network</button>}</div><p className="fm-network-context">{focusedEntity ? `${focusedEntity.label}: every retained incident connection is available; expand to two hops or open the ledger.` : inspectedPacket && inspected ? `Graph for the inspected ${selectedEdge ? 'relationship' : 'record'}: ${labelOf(inspected)}. Its explicitly linked records and responses supply the context.` : 'The selected case’s retained entities and typed relationships. Select an entity to explore its retained connections across the full registry.'}</p><InvestigationGraph entities={graphEntities} relationships={graphRelationships} sources={graphSources} selectedNode={focusedEntity?.id ?? null} selectedEdge={edgeId} depth={graphDepth} view={graphView} onNodeSelect={id => id ? inspect('entity', id, false) : focusCase()} onEdgeSelect={id => id ? inspect('relationship', id) : patch({ ftm_edge: null })} onDepthChange={depth => patch({ ftm_depth: String(depth) })} onViewChange={view => patch({ ftm_graph: view === 'table' ? 'table' : null })} onSourceSelect={inspectSource} highlightEdgeIds={highlightedEdges} /><p className="fm-network-export-note">Relationship CSV exports edge rows and their direct sources. It excludes linked response and record content. Save the selected evidence, then export evidence JSON or a reading brief from the casebook to retain that complete context.</p>
        {incident && <details className="fm-incident"><summary>{incident.totalRelationships.toLocaleString('en-IN')} retained connections for this exact entity</summary><ul>{incident.relationships.map(edge => <li key={edge.id}><button type="button" onClick={() => inspect('relationship', edge.id)}><span>{pretty(edge.kind)} · {edge.tier}</span>{entities.get(edge.from)?.label} → {entities.get(edge.to)?.label}<small>{edge.label}</small></button></li>)}</ul></details>}
      </div>
      <aside className="fm-inspector" ref={inspectorRef} tabIndex={-1} aria-labelledby="fm-inspector-title" data-inspected-id={inspected?.id ?? ''}><header className="fm-inspector-heading"><p className="fm-eyebrow">03 / Test the evidence</p>{(selectedNode || selectedEdge || selectedRecord || selectedSource) && <button type="button" onClick={focusCase} aria-label="Return inspector to selected case"><X size={16} /></button>}</header>
        {selectedSource ? <><h2 id="fm-inspector-title">Source inspection</h2><SourceDetail source={selectedSource} /><button className="fm-back" type="button" onClick={() => patch({ ftm_source: null })}>Return to selected evidence</button></> : inspected ? <><p className="fm-inspector-type">{selectedEdge ? 'Typed relationship' : selectedNode && !selectedRecord ? 'Canonical entity' : 'Source-backed record'} · {inspected.namespace}</p><h2 id="fm-inspector-title">{labelOf(inspected)}</h2>{'tier' in inspected && <div className="fm-inspector-status"><span className={`fm-relation-kind fm-tier-${inspected.tier}`}>{inspected.tier}</span><span>{pretty(inspected.status)}</span></div>}<p>{inspected.summary}</p>{selectedNode && !selectedEdge && !selectedRecord && <p className="fm-identity"><strong>Identity basis</strong>{selectedNode.identityBasis}</p>}
          {selectedEdge && <div className="fm-endpoints"><button type="button" onClick={() => inspect('entity', selectedEdge.from)}>{entities.get(selectedEdge.from)?.label ?? selectedEdge.from}</button><span><ArrowDown size={15} aria-hidden="true" /> {pretty(selectedEdge.kind)}</span><button type="button" onClick={() => inspect('entity', selectedEdge.to)}>{entities.get(selectedEdge.to)?.label ?? selectedEdge.to}</button></div>}
          {'amounts' in inspected && inspected.amounts.length > 0 && <dl className="fm-inspector-amounts">{inspected.amounts.map((amount, index) => <div key={index}><dt>{pretty(amount.stage)} · {amount.period}</dt><dd>{amount.currency} {amount.value.toLocaleString('en-IN')} {amount.unit}</dd></div>)}</dl>}
          {'dateBasis' in inspected && <p className="fm-date-basis">{dateLabel(inspected.fromDate)} → {inspected.toDate ? dateLabel(inspected.toDate) : 'End date unrecorded'}<br />{inspected.dateBasis}</p>}
          {selection && <div className="fm-inspect-actions"><button type="button" onClick={() => setNotice(pinCasebookItem(selection.kind, selection.id) ? 'Selected evidence saved to the local casebook.' : 'Casebook limit reached; export a backup to keep your work.')}><BookmarkPlus size={15} />{book.isPinned(selection.kind, selection.id) ? 'Evidence saved' : 'Save evidence'}</button><Link to={`/investigate?iw_view=evidence&iw_scope=all&iw_${selection.kind === 'entity' ? 'node' : selection.kind === 'relationship' ? 'edge' : 'record'}=${encodeURIComponent(selection.id)}`}>Open in workspace <ArrowUpRight size={13} /></Link></div>}
          {'response' in inspected && <section className="fm-response"><h3>Response & procedural context</h3><p>{inspected.response || 'No response is retained in this entry. This is an evidence gap, not an admission.'}</p></section>}
          {responses.length > 0 && <section className="fm-response"><h3>Linked responses & counter-evidence</h3>{responses.map(response => <div key={response.id}><button type="button" className="fm-text-button" onClick={() => inspect('from' in response ? 'relationship' : 'record', response.id)}>{labelOf(response)}</button><p>{response.summary}</p><small>{response.tier} · {pretty(response.status)}</small></div>)}</section>}
          {'alternativeExplanations' in inspected && inspected.alternativeExplanations.length > 0 && <section className="fm-questions"><h3>Other explanations to test</h3><ul>{inspected.alternativeExplanations.map(text => <li key={text}>{text}</li>)}</ul></section>}
          {'falsifier' in inspected && inspected.falsifier && <section className="fm-questions"><h3>The next document to seek</h3><p>{inspected.falsifier}</p></section>}
          <details className="fm-limits"><summary>Geography, identifiers & limitations</summary><code>{inspected.id}</code>{inspected.geography.map((geo, index) => <p key={index}><strong>{pretty(geo.basis)}:</strong> {geo.note}</p>)}<ul>{inspected.limitations.map(text => <li key={text}>{text}</li>)}</ul></details>
          <section className="fm-source-ledger"><h3>Source documents <span>{sourceIdsOf(inspected).length}</span></h3><SourceList ids={sourceIdsOf(inspected)} selectedId={sourceId} onSelect={inspectSource} />{!sourceIdsOf(inspected).length && <p>No direct source document is retained. Do not treat this entry as independently established.</p>}</section>
        </> : <div className="fm-empty"><h2 id="fm-inspector-title">Select evidence to inspect</h2><p>Choose a case, a trail step or an exact entity to read its sources and limitations.</p></div>}
      </aside>
    </section>
    <section className="fm-discovery" ref={discoveryRef} tabIndex={-1} aria-labelledby="fm-discovery-title"><header className="fm-section-heading"><div><p className="fm-eyebrow">04 / Widen the investigation</p><h2 id="fm-discovery-title">Search the retained record</h2></div><div className="fm-switch" aria-label="Discovery collection"><button type="button" aria-pressed={!universe} onClick={() => patch({ ftm_scope: null, ftm_page: null })}>Evidence registry</button><button type="button" aria-pressed={universe} onClick={() => patch({ ftm_scope: 'securities', ftm_page: null })}>NSE securities</button></div></header>
      <form className="fm-discovery-search" role="search" aria-label="Search discovery collection" onSubmit={search}><label htmlFor="fm-discovery-query">{universe ? 'Company, NSE symbol or exact ISIN' : 'Name, question, relationship or exact identifier'}</label><div><input id="fm-discovery-query" value={query} onChange={event => setQuery(event.target.value)} type="search" /><button type="submit"><Search size={16} aria-hidden="true" />Search</button></div></form>
      {universe ? <p className="fm-coverage-note">Official NSE security file: <strong>{DEEP_INVESTIGATION_UNIVERSE.totalSecurities.toLocaleString('en-IN')} securities</strong>. {DEEP_INVESTIGATION_UNIVERSE.matchedRegistryCompanies.toLocaleString('en-IN')} matched to retained companies by exact ISIN; {DEEP_INVESTIGATION_UNIVERSE.unmatchedSecurities.toLocaleString('en-IN')} remain unmatched. This global listing has no inferred geography; the map and field filters do not restrict it. Listing coverage does not mean every company has been investigated. <a href={DEEP_INVESTIGATION_UNIVERSE.sourceUrl} target="_blank" rel="noopener noreferrer">Original exchange file <ArrowUpRight size={12} /></a></p> : <p className="fm-coverage-note">All retained entities, records and typed relationships are searchable. Exact canonical identifiers keep similar names separate. {domain ? `Field: ${domainNames.get(domain) ?? domain}. ` : ''}{state ? `Place: ${stateNames.get(state)} plus national context. ` : 'Place: all India. '}Results include the exact endpoints of matching records and relationships.</p>}
      <p className="fm-result-count" role="status">{resultCount.toLocaleString('en-IN')} {universe ? 'securities' : 'items'}{urlQuery && <> matching “{urlQuery}”</>} · {resultCount ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, resultCount)}` : '0'} shown</p>
      {universe ? <ul className="fm-security-list">{securities.slice(page * pageSize, (page + 1) * pageSize).map(row => <li key={row.isin}><div><strong>{row.name}</strong><span>{row.symbol} · {row.isin} · {row.series}</span></div><div>{row.registryEntityIds.length ? <><span className="fm-match"><Check size={13} />Exact ISIN match</span>{row.reviewedCaseIds.length ? <div className="fm-reviewed-cases"><small>{row.reviewedCaseIds.length} reviewed casefile{row.reviewedCaseIds.length === 1 ? '' : 's'} in this release</small>{row.reviewedCaseIds.map(id => <button type="button" key={id} onClick={() => { const item = getDeepInvestigationCase(id); if (item) { openCase(item); document.querySelector('.fm-atlas')?.scrollIntoView({ block: 'start' }); } }}>{getDeepInvestigationCase(id)?.title ?? id} <ArrowUpRight size={12} /></button>)}</div> : <small>No reviewed case in this release. Exact identity matching is not a case review.</small>}{row.registryEntityIds.map(id => <button key={id} type="button" onClick={() => inspect('entity', id)}>Inspect {entities.get(id)?.label ?? 'retained company'} <ArrowRight size={13} /></button>)}</> : <><span className="fm-unmatched">No verified registry join</span><small>Listing only. Ownership, money flows and case coverage remain unreviewed here.</small></>}</div></li>)}</ul> : <ul className="fm-discovery-list">{discovery.slice(page * pageSize, (page + 1) * pageSize).map(({ kind, item }) => <li key={`${kind}:${item.id}`}><button type="button" onClick={() => inspect(kind, item.id)}><span className="fm-discovery-kind">{kind === 'relationship' ? <GitBranch size={16} /> : <FileText size={16} />}{kind}</span><span><strong>{labelOf(item)}</strong><p>{item.summary}</p><small>{item.namespace} · {item.id}</small></span><ArrowUpRight size={16} aria-hidden="true" /></button></li>)}</ul>}
      {!resultCount && <div className="fm-empty"><h3>No matching {universe ? 'securities' : 'evidence'}</h3><p>Try a shorter name, an exact identifier, or switch collections. A missing record does not establish that an activity did not occur.</p><button type="button" onClick={() => { setQuery(''); patch({ ftm_q: null, ftm_domain: null, ftm_page: null }); }}>Clear search and field</button></div>}
      {resultCount > pageSize && <div className="fm-pagination"><button type="button" disabled={page === 0} onClick={() => patch({ ftm_page: String(page - 1) })}>Previous</button><span>Page {page + 1} of {Math.ceil(resultCount / pageSize)}</span><button type="button" disabled={(page + 1) * pageSize >= resultCount} onClick={() => patch({ ftm_page: String(page + 1) })}>Next</button></div>}
      <details className="fm-held" onToggle={event => setHeldOpen(event.currentTarget.open)}><summary>Responses & unresolved records retained outside the graph · {registry.held.length}</summary><p>These entries have a recorded hold reason. They are retained for review; they are not inferred links or a list of suspicious entities.</p><ul>{heldOpen && registry.held.map(row => <li key={row.id}><strong>{pretty(row.kind)} · {row.namespace}</strong>{records.has(row.id) && <button className="fm-text-button" type="button" onClick={() => inspect('record', row.id)}>{records.get(row.id)!.title} · Inspect retained response <ArrowUpRight size={12} /></button>}<p>{row.reason}</p><code>{row.id}</code><SourceList ids={row.sourceIds} onSelect={inspectSource} /></li>)}</ul></details>
    </section>
    {showBook && <section ref={casebookRef} className="fm-book" aria-label="Local investigation casebook"><Casebook selection={selection} viewUrl={`#${location.pathname}${location.search}`} onInspect={value => inspect(value.kind, value.id)} /></section>}
    <section className="fm-atlas-exploration"><AtlasNetwork registry={registry} filters={atlasFilters} onSourceSelect={inspectSource} /><details className="atlas-policy-section"><summary>Policy &amp; ownership changes</summary><AtlasPolicyTimeline registry={registry} filters={atlasFilters} onRecordSelect={id => inspect('record', id)} /></details></section>
    <footer className="fm-footer"><div><p className="fm-eyebrow">A trail is a question you can verify.</p><p>Ownership, funding, allegation and adjudication remain distinct. Graph proximity does not establish influence, causation or wrongdoing.</p></div><details><summary>Coverage, method & reproducibility</summary><p>The map indexes retained geography and associations. National context and unknown locations stay unplaced. Research casefiles do not constitute nationwide case coverage.</p>{DEEP_INVESTIGATION_UNIVERSE.limitations.map(text => <p key={text}>{text}</p>)}<p>Security file retrieved {DEEP_INVESTIGATION_UNIVERSE.retrievedAt}. Exact ISIN joins only.</p><p className="fm-hash">SHA-256: {DEEP_INVESTIGATION_UNIVERSE.sha256}</p><button type="button" onClick={() => download(`${JSON.stringify({ coverage: DEEP_INVESTIGATION_COVERAGE, previousModel: DEEP_INVESTIGATION_MODEL, expandedModel: ATLAS_DISCOVERY_MODEL, registryUpdatedAt: registry.updatedAt }, null, 2)}\n`, 'follow-the-money-method.json')}>Download coverage & model metadata <Download size={13} /></button><Link to="/method?iw_view=dossier">Read the evidence method <ArrowUpRight size={13} /></Link></details></footer>
  </div>;
}
