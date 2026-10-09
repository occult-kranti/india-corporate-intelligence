import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Check, Download, FileText, Map as MapIcon, Network, Search, X } from 'lucide-react';
import { LinkedEvidenceMap, type LinkedMapSelection } from '../components/investigation/LinkedEvidenceMap';
import { AtlasNetwork } from '../components/investigation/AtlasNetwork';
import { buildMapEvidenceScene } from '../data/mapEvidence';
import type { AtlasSelection } from '../data/atlasInvestigation';
import { FUNDING_BUNDLE, FUNDING_CASES, FUNDING_SOURCES, FUNDING_ENTITIES, FUNDING_EDGES, FUNDING_TRACKS, FUNDING_STATUSES, FUNDING_STREAMS, FUNDING_REGISTRY, EXISTING_ATLAS, EXISTING_SECTORS, fundingCaseRegistry, exportFundingCase, type FundingCase } from '../data/fundingInvestigations';
import './funding-investigations.css';
const FundingSearches = lazy(() => import('./FundingSearches'));

const MAP_FILTERS = { geographyMode: 'all' as const };
const repository = 'https://github.com/occult-kranti/india-corporate-intelligence/blob/codex/education-funding-intelligence';
const label = (id: string) => FUNDING_ENTITIES.get(id)?.label ?? id;
const readable = (text: string) => text.replace(/-/g, ' ');
function readSelection(value: string | null): LinkedMapSelection | null {
  if (!value) return null;
  const split = value.indexOf(':'), kind = value.slice(0, split), id = value.slice(split + 1);
  return ['entity', 'relationship', 'record', 'state', 'site'].includes(kind) && id ? { kind, id } as LinkedMapSelection : null;
}

export default function FundingInvestigations() {
  const [params, setParams] = useSearchParams();
  const [exported, setExported] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null), sourceOpener = useRef<HTMLElement | null>(null), readingRef = useRef<HTMLElement>(null);
  const track = params.get('fi_track') ?? '', query = params.get('fi_q') ?? '', status = params.get('fi_status') ?? '';
  const section = ['coverage', 'atlas', 'roadmap', 'analysis'].includes(params.get('fi_section') ?? '') ? params.get('fi_section')! : 'cases';
  const view = params.get('fi_view') === 'network' ? 'network' : 'map';
  const atlasDomain = params.get('fi_domain') ?? '';
  const filtered = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return FUNDING_CASES.filter(row => (!track || row.track === track) && (!status || row.status === status) && words.every(word => `${row.title} ${row.question} ${row.finding} ${row.period} ${row.sector} ${row.entityIds.map(label).join(' ')}`.toLowerCase().includes(word)));
  }, [track, query, status]);
  const requestedCase = params.get('fi_case');
  const item = filtered.find(row => row.id === requestedCase) ?? filtered[0];
  const selection = readSelection(params.get('fi_inspect'));
  const source = FUNDING_SOURCES.get(params.get('fi_source') ?? '');
  const graph = useMemo(() => item ? fundingCaseRegistry(item) : { ...FUNDING_REGISTRY, entities: [], relationships: [], records: [], sources: [] }, [item]);
  const scene = useMemo(() => buildMapEvidenceScene(graph, MAP_FILTERS), [graph]);
  const coverage = useMemo(() => graph.states.map(state => {
    const hub = scene.stateHubs.find(row => row.stateCode === state.code);
    return { stateCode: state.code, name: state.name, entities: hub?.counts.entities ?? 0, relationships: hub?.counts.relationships ?? 0, records: hub?.counts.records ?? 0, coverageRecords: hub?.coverageRecordIds.length ?? 0, associationRecords: hub?.associationRecordIds.length ?? 0, nationalContextRecords: 0, unknownRecords: 0, domains: [] };
  }), [graph, scene]);
  const atlas = useMemo(() => {
    if (!atlasDomain) return EXISTING_ATLAS;
    const relationships = EXISTING_ATLAS.relationships.filter(row => row.domains.includes(atlasDomain));
    const ids = new Set(relationships.flatMap(row => [row.from, row.to]));
    return { ...EXISTING_ATLAS, relationships, entities: EXISTING_ATLAS.entities.filter(row => ids.has(row.id) || row.domains.includes(atlasDomain)), records: EXISTING_ATLAS.records.filter(row => row.domains.includes(atlasDomain)) };
  }, [atlasDomain]);
  const patch = (changes: Record<string, string | undefined>, replace = false) => {
    const current = new URL(window.location.hash.slice(1), window.location.origin), next = new URLSearchParams(current.search);
    for (const [key, value] of Object.entries(changes)) value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace });
  };
  const choose = (next: LinkedMapSelection | null) => patch({ fi_inspect: next ? `${next.kind}:${next.id}` : undefined });
  const changeCase = (next: string) => { setExported(false); patch({ fi_case: next, fi_inspect: undefined, fi_source: undefined }); };
  const openSource = (id: string, opener?: HTMLElement) => { sourceOpener.current = opener ?? document.activeElement as HTMLElement; patch({ fi_source: id }); };
  const closeSource = () => { patch({ fi_source: undefined }); };
  useEffect(() => {
    if (source && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!source && dialogRef.current?.open) { dialogRef.current.close(); sourceOpener.current?.focus({ preventScroll: true }); }
  }, [source]);
  const citations = (ids: string[]) => <div className="fi-citations">{ids.map(id => {
    const row = FUNDING_SOURCES.get(id);
    return row ? <button type="button" key={id} data-fi-source={id} onClick={event => openSource(id, event.currentTarget)}><FileText size={13} aria-hidden="true" /><span>{row.title}<small>{row.publisher} · {row.publishedAt ?? 'publication date not established'}</small></span><ArrowUpRight size={13} aria-hidden="true" /></button> : <span key={id}>Source unavailable: {id}</span>;
  })}</div>;
  const exportCase = (current: FundingCase) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(exportFundingCase(current), null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${current.id.replace(/:/g, '-')}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setExported(true);
  };
  const readFile = () => { readingRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); readingRef.current?.focus({ preventScroll: true }); };
  const selectedEntity = selection?.kind === 'entity' ? selection.id : selection?.kind === 'relationship' ? FUNDING_EDGES.get(selection.id)?.from : undefined;
  const stream = item ? FUNDING_STREAMS.find(row => row.track === item.track) : undefined;
  const allCoverage = FUNDING_STREAMS.flatMap(row => row.coverage.map(entry => ({ ...entry, track: row.track })));

  return <div className="funding-desk" data-funding-desk="" data-fi-case={item?.id} data-fi-section={section}>
    <header className="fi-header"><div><p className="fi-date">Research window · 2011–2026</p><h1>Power, decisions & public money</h1><p>A research desk for following the record across institutions, contracts and sectors.</p></div><a className="fi-method-link" href={`${repository}/docs/funding-investigations/PANEL.md`} target="_blank" rel="noreferrer">Read the research protocol<ArrowUpRight size={15} aria-hidden="true" /></a></header>
    <nav className="fi-sections" aria-label="Funding research sections">{[['cases', 'Research files'], ['atlas', 'Existing sector networks'], ['analysis', 'Cross-sector searches'], ['coverage', 'Coverage & gaps'], ['roadmap', 'Research roadmaps']].map(([id, title]) => <button type="button" key={id} aria-current={section === id ? 'page' : undefined} onClick={() => patch({ fi_section: id === 'cases' ? undefined : id, fi_inspect: undefined })}>{title}{id === 'cases' && <span>{FUNDING_CASES.length}</span>}</button>)}</nav>
    {section === 'analysis' && <Suspense fallback={<p role="status">Loading cross-sector research…</p>}><FundingSearches /></Suspense>}

    {section === 'cases' && <>
      <div className="fi-filters"><label><span>Research track</span><select aria-label="Research track" value={track} onChange={event => patch({ fi_track: event.target.value || undefined, fi_case: undefined, fi_inspect: undefined })}><option value="">All tracks</option>{FUNDING_STREAMS.map(row => <option key={row.track} value={row.track}>{FUNDING_TRACKS[row.track]} ({row.cases.length})</option>)}</select></label><label><span>Evidence status</span><select aria-label="Evidence status" value={status} onChange={event => patch({ fi_status: event.target.value || undefined, fi_case: undefined, fi_inspect: undefined })}><option value="">All statuses</option>{Object.entries(FUNDING_STATUSES).map(([id, title]) => <option value={id} key={id}>{title}</option>)}</select></label><label className="fi-search"><span>Find a file or institution</span><span className="fi-search-input"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Find a funding research file" value={query} onChange={event => patch({ fi_q: event.target.value || undefined, fi_case: undefined, fi_inspect: undefined }, true)} placeholder="Contractor, programme, case…" /></span></label>{(track || status || query) && <button className="fi-reset" type="button" onClick={() => patch({ fi_track: undefined, fi_status: undefined, fi_q: undefined, fi_case: undefined, fi_inspect: undefined })}>Clear filters</button>}</div>
      <div className="fi-population" role="status">{filtered.length} of {FUNDING_CASES.length} research files · reviewed {FUNDING_BUNDLE.reviewDate} · curated coverage, not a census</div>
      {requestedCase && !filtered.some(row => row.id === requestedCase) && <p className="fi-notice">The requested file is unavailable in this filter. {item ? 'The first matching file is shown.' : 'Clear the filters to return to the register.'}</p>}
      {item ? <>
        <label className="fi-mobile-case">Selected research file<select aria-label="Selected research file" value={item.id} onChange={event => changeCase(event.target.value)}>{filtered.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
        <section className="fi-workspace" aria-label="Funding investigation map and case register">
          <aside className="fi-case-list" aria-label="Research file register">{filtered.map((row, index) => <button type="button" key={row.id} data-fi-case-choice={row.id} aria-pressed={item.id === row.id} onClick={() => changeCase(row.id)}><span className="fi-case-number">{String(index + 1).padStart(2, '0')}</span><span><small>{FUNDING_TRACKS[row.track]}</small><strong>{row.title}</strong><span className="fi-status" data-status={row.status}>{FUNDING_STATUSES[row.status]}</span></span></button>)}</aside>
          <div className="fi-map-column"><header className="fi-map-heading"><div><span>{item.period}</span><h2>{item.title}</h2></div><div className="fi-view-toggle" role="group" aria-label="Funding evidence view"><button type="button" aria-pressed={view === 'map'} onClick={() => patch({ fi_view: undefined, fi_inspect: undefined })}><MapIcon size={15} aria-hidden="true" />Map</button><button type="button" aria-pressed={view === 'network'} onClick={() => patch({ fi_view: 'network', fi_inspect: undefined })}><Network size={15} aria-hidden="true" />Network</button></div></header>
            <div className="fi-map-stage" data-fi-view={view}>{view === 'map' ? <LinkedEvidenceMap key={item.id} registry={graph} sceneRegistry={graph} filters={MAP_FILTERS} selection={selection} onSelectionChange={choose} depth={2} spatial coverage={coverage} selectedState={selection?.kind === 'state' ? selection.id.replace('state:', '') : null} onStateSelect={code => choose(code ? { kind: 'state', id: `state:${code}` } : null)} geographyMode="all" nationalRecords={scene.populations.national.counts.records} unknownRecords={scene.populations.unplaced.counts.records} internationalRecords={scene.populations.international.counts.records} indexLabel="CASE ASSOCIATIONS · NOT PAYMENT ADDRESSES" /> : <AtlasNetwork key={item.id} registry={graph} evidenceRegistry={graph} selectedEntityId={selectedEntity} selectedEvidence={selection && !['state', 'site'].includes(selection.kind) ? selection as AtlasSelection : null} onSelectionChange={choose} />}</div>
            <div className="fi-map-footer"><p>{graph.entities.length} retained identities · {graph.relationships.length} source-attributed links. Arrows retain their own financial or institutional stage.{graph.entities.some(row => !row.resolved) && ' Unresolved identities remain in the case record; they are not treated as resolved network nodes.'}</p><button type="button" onClick={readFile}>Read the case<ArrowDown size={14} aria-hidden="true" /></button></div>
          </div>
        </section>
        <section className="fi-case-reading" ref={readingRef} tabIndex={-1} aria-label="Selected funding research file">
          <div className="fi-reading-lead"><div><span className="fi-status" data-status={item.status}>{FUNDING_STATUSES[item.status]}</span><h2>{item.question}</h2><p className="fi-finding">{item.finding}</p><p className="fi-period">{item.period} · {item.geography.map(place => place.label).join(' / ') || 'Location not established'}</p></div><button className="fi-export" type="button" onClick={() => exportCase(item)}>{exported ? <Check size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}{exported ? 'Packet exported' : 'Export research packet'}</button></div>
          <div className="fi-evidence-columns"><section><h3>What the record supports</h3><ul>{item.whatWeKnow.map((text, index) => <li key={index}>{text}</li>)}</ul></section><section className="fi-stop"><h3>Where the evidence stops</h3><ul>{item.whatWeDoNotKnow.map((text, index) => <li key={index}>{text}</li>)}</ul></section></div>
          <section className="fi-hops" aria-label="Documented relationship stages"><h3>Follow each recorded step</h3><p className="fi-section-note">These are separate documentary relationships. They do not reconcile into a single stream of cash.</p>{item.edgeIds.map(id => {
            const edge = FUNDING_EDGES.get(id);
            return edge && <article className="fi-hop" key={id} data-fi-edge={id}><div className="fi-hop-route"><span>{label(edge.from)}</span><span aria-label="to">→</span><span>{label(edge.to)}</span></div><div className="fi-hop-body"><span className="fi-status" data-status={edge.status}>{FUNDING_STATUSES[edge.status]} · {readable(edge.stage)}</span><h4>{edge.label}</h4>{edge.amount && <p className="fi-amount">{edge.amount.value.toLocaleString('en-IN', { maximumFractionDigits: 4 })} {edge.amount.currency} {edge.amount.unit}<small>{edge.amount.period} · {edge.amount.basis}</small></p>}<p><strong>Response / qualification:</strong> {edge.response}</p><details><summary>Limits and sources</summary>{edge.limits.map((text, index) => <p key={index}>{text}</p>)}{citations(edge.sourceIds)}</details></div></article>;
          })}</section>
          <section className="fi-claims" aria-label="Test competing explanations"><h3>Test the explanation</h3>{item.claims.map(claim => <article key={claim.id} data-fi-claim={claim.id}><span className="fi-status" data-status={claim.status}>{FUNDING_STATUSES[claim.status]}</span><h4>{claim.text}</h4><div className="fi-evidence-columns"><div><h5>Response & rival explanation</h5><p>{claim.response}</p><p>{claim.alternative}</p></div><div><h5>What would disprove or narrow it</h5><p>{claim.falsifier}</p><ul>{claim.missingRecords.map((text, index) => <li key={index}>{text}</li>)}</ul></div></div>{citations(claim.sourceIds)}</article>)}</section>
          {item.decisionAnalysis && <section className="fi-decisions" aria-label="Institutional decision analysis"><span className="fi-date">Decision record · {item.decisionAnalysis.decisionDate ?? 'date not established'}</span><h3>At the decision table</h3><p className="fi-section-note">Qualitative alternatives and observable consequences. Institutional incentives are analytical possibilities, not private motives or estimated probabilities.</p><div className="fi-actors">{item.decisionAnalysis.actors.map((actor, index) => <article key={`${actor.entityId}-${index}`}><h4>{label(actor.entityId)}</h4><p><strong>Authority / constraints:</strong> {actor.authority}</p><p><strong>Possible institutional incentive:</strong> {actor.incentive}</p>{citations(actor.evidenceSourceIds)}</article>)}</div><h4>Information available then / reconstruction limits</h4><ul>{item.decisionAnalysis.informationThen.map((entry, index) => <li key={index}>{typeof entry === 'string' ? entry : <>{entry.text}{citations(entry.sourceIds)}</>}</li>)}</ul><div className="fi-options">{item.decisionAnalysis.options.map((option, index) => <article key={index}><h4>{option.label}</h4><p><strong>Expected observable implication:</strong> {option.expectedObservableOutcome}</p>{citations(option.sourceIds)}</article>)}</div><h4>What the later record shows</h4><p>{item.decisionAnalysis.observedOutcome}</p>{citations(item.decisionAnalysis.sourceIds)}<div className="fi-stop">{item.decisionAnalysis.hindsightLimits.map((text, index) => <p key={index}>{text}</p>)}</div></section>}
          <section className="fi-next-records"><h3>The next records to obtain</h3>{item.nextRecords.map((row, index) => <article key={index}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{row.record}</h4><p><strong>Holder:</strong> {row.holder}</p><p>{row.purpose}</p></div></article>)}</section>
          {stream && stream.rejectedJoins.length > 0 && <details className="fi-rejected"><summary>Rejected or unestablished connections in this track ({stream.rejectedJoins.length})</summary><p>These links are not drawn as facts or cash flows.</p>{stream.rejectedJoins.map((row, index) => <article key={index}><h4>{label(row.from)} → {label(row.to)}</h4><p>{row.proposed}</p><p><strong>Why it was not admitted:</strong> {row.reason}</p>{citations(row.sourceIds)}</article>)}</details>}
          <details className="fi-source-register"><summary>Source register & case limits ({item.sourceIds.length} sources)</summary>{item.limits.map((text, index) => <p key={index}>{text}</p>)}{citations(item.sourceIds)}</details>
        </section>
      </> : <section className="fi-empty"><h2>No research file matches these filters</h2><p>This describes the current register, not an absence of activity or wrongdoing.</p><button type="button" onClick={() => patch({ fi_track: undefined, fi_status: undefined, fi_q: undefined, fi_case: undefined })}>Show all research files</button></section>}
    </>}

    {section === 'atlas' && <section className="fi-wide-section"><header><h2>The wider institutional network</h2><p>Explore the existing atlas across {EXISTING_SECTORS.length} overlapping sector classifications. These inherited records keep their own source dates and have not all been re-investigated in this release. Similar names across the new files and this atlas are not merged automatically.</p></header><label className="fi-atlas-select">Existing sector<select aria-label="Existing sector" value={atlasDomain} onChange={event => patch({ fi_domain: event.target.value || undefined })}><option value="">All existing sectors</option>{EXISTING_SECTORS.map(row => <option key={row.value} value={row.value}>{row.label} · {row.records} records</option>)}</select></label><AtlasNetwork key={atlasDomain} registry={atlas} evidenceRegistry={EXISTING_ATLAS} /><p className="fi-section-note">Topic counts overlap and must not be added. Source-linked paths support navigation; they do not establish causation or a transfer of the same money.</p><Link className="fi-method-link" to="/follow-the-money">Open the integrated geographic atlas<ArrowUpRight size={14} aria-hidden="true" /></Link></section>}

    {section === 'coverage' && <section className="fi-wide-section"><header><h2>A visible boundary around the research</h2><p>{allCoverage.length} institution or programme coverage entries across {FUNDING_STREAMS.length} tracks. Examined does not mean cleared, and queued does not mean suspicious. The 15-year window is not complete annual coverage.</p></header>{FUNDING_STREAMS.map(row => <section className="fi-coverage-track" key={row.track}><h3>{FUNDING_TRACKS[row.track]}</h3><p>{row.scope}</p><div className="fi-coverage-list">{row.coverage.map((entry, index) => <article key={index}><div><span className="fi-coverage-status">{readable(entry.status)}</span><h4>{entry.institution}</h4><small>{entry.jurisdiction} · {entry.period}</small></div><div><p>{entry.gap}</p><p><strong>Next record:</strong> {entry.nextRecord}</p>{citations(entry.sourceIds)}</div></article>)}</div></section>)}</section>}

    {section === 'roadmap' && <section className="fi-wide-section"><header><h2>Research that can be checked and continued</h2><p>Each phase names a deliverable and an acceptance condition. This is a published work queue, not a continuously running monitoring service.</p><a className="fi-method-link" href={`${repository}/docs/funding-investigations/ROADMAPS.md`} target="_blank" rel="noreferrer">Read the complete data, methods and operations roadmaps<ArrowUpRight size={14} aria-hidden="true" /></a></header>{FUNDING_STREAMS.map(row => <section className="fi-roadmap-track" key={row.track}><h3>{FUNDING_TRACKS[row.track]}</h3>{row.roadmap.map((step, index) => <article key={index}><span className="fi-coverage-status">{step.phase}</span><div><h4>{step.task}</h4><p><strong>Deliverable:</strong> {step.deliverable}</p><p><strong>Done when:</strong> {step.acceptance}</p></div></article>)}</section>)}<Link className="fi-method-link" to="/model-lab">Inspect the local model experiment and its failed promotion gate<ArrowUpRight size={14} aria-hidden="true" /></Link></section>}

    <footer className="fi-footer"><p>Sources support scoped statements, not a presumption of guilt. Amounts retain their original stage, currency and period. Unknowns and rejected joins remain visible. The map uses current state boundaries; historical jurisdictions may differ.</p><span>Review date: {FUNDING_BUNDLE.reviewDate} · AI research panel · source-led, incomplete coverage</span></footer>
    <dialog className="fi-source-dialog" ref={dialogRef} aria-labelledby="fi-source-title" onCancel={event => { event.preventDefault(); closeSource(); }} onClose={() => { if (params.get('fi_source')) closeSource(); }} onClick={event => { if (event.target === event.currentTarget) closeSource(); }}><div className="fi-source-sheet"><button className="fi-source-close" type="button" aria-label="Close source reader" onClick={closeSource} autoFocus><X size={20} aria-hidden="true" /></button>{source && <><span className="fi-date">{source.kind} · {source.inspection}</span><h2 id="fi-source-title">{source.title}</h2><p>{source.publisher} · published {source.publishedAt ?? 'date not established'}</p><a className="fi-source-original" href={source.url} target="_blank" rel="noopener noreferrer">Open original source<ArrowUpRight size={16} aria-hidden="true" /></a><h3>Inspected locator</h3><p>{source.locator}</p><h3>Retained passage or labelled summary</h3><p className="fi-source-excerpt">{source.excerpt}</p><h3>What this source cannot establish</h3>{source.limitations.map((text, index) => <p key={index}>{text}</p>)}<p><strong>Source family:</strong> {source.sourceFamily}</p><p><strong>Retrieved:</strong> {source.accessedAt}</p>{source.capturePath && <a href={`${repository}/${source.capturePath}`} target="_blank" rel="noreferrer">Inspect retained capture and its scope<ArrowUpRight size={13} aria-hidden="true" /></a>}{source.sha256 && <p className="fi-source-hash">SHA-256 of retained capture: {source.sha256}</p>}<small>A checksum identifies retained bytes. It does not certify the source's claims.</small></>}</div></dialog>
  </div>;
}
