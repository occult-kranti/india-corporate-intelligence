import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Download, FileText, Filter, List, Map as MapIcon, Network, Search, X } from 'lucide-react';
import { INVESTIGATION_DOMAINS, INVESTIGATION_REGISTRY as registry, type InvestigationFilters } from '../data/investigation';
import { type AllegationCategory, type AllegationCohort } from '../data/allegationsInvestigation';
import { getMetroSpendingView, metroPlacement, metroRecordAmounts, searchMetroContext, METRO_CITY_LABELS, METRO_TOPIC_LABELS, METRO_CONTEXT_LABELS, type MetroCity, type MetroTopic, type MetroContextKind } from '../data/metroSpending';
import { buildMapEvidenceScene } from '../data/mapEvidence';
import { exportAtlasEvidence } from '../data/atlasInvestigation';
import { LinkedEvidenceMap, type LinkedMapSelection } from '../components/investigation/LinkedEvidenceMap';
import { AtlasNetwork } from '../components/investigation/AtlasNetwork';
import './allegations.css';

const categoryLabels: Record<AllegationCategory | 'all', string> = {all:'All records',case:'Case files',allegation:'Attributed allegations',finding:'Findings',outcome:'Outcomes & corrections','alleged-link':'Alleged links'};
function readSelection(value: string | null): LinkedMapSelection | null {
  if (!value) return null;
  const split = value.indexOf(':'), kind = value.slice(0, split), id = value.slice(split + 1);
  return ['state','site','entity','relationship','record'].includes(kind) && id ? {kind, id} as LinkedMapSelection : null;
}
export default function Allegations() {
  const [params, setParams] = useSearchParams();
  const investigationRef = useRef<HTMLElement>(null);
  const query = params.get('al_q') ?? '', [draft,setDraft] = useState(query);
  const [filtersOpen,setFiltersOpen] = useState(false), [listOpen,setListOpen] = useState(true), [page,setPage] = useState(1);
  const city: MetroCity = Object.prototype.hasOwnProperty.call(METRO_CITY_LABELS, params.get('al_city') ?? '') ? params.get('al_city') as MetroCity : 'all';
  const topic: MetroTopic = Object.prototype.hasOwnProperty.call(METRO_TOPIC_LABELS, params.get('al_topic') ?? '') ? params.get('al_topic') as MetroTopic : 'all';
  const includeStateContext = params.get('al_state_context') === '1';
  const includeNational = params.get('al_national') !== '0', contextOpen = params.get('al_context') === '1';
  const contextQuery = params.get('al_cq') ?? '', [contextDraft,setContextDraft] = useState(contextQuery), [contextPage,setContextPage] = useState(1);
  const cohort: AllegationCohort = params.get('al_cohort') === 'retained' ? 'retained' : params.get('al_cohort') === 'all' ? 'all' : 'new';
  const category = Object.prototype.hasOwnProperty.call(categoryLabels, params.get('al_kind') ?? '') ? params.get('al_kind') as AllegationCategory : 'all';
  const stateCode = registry.states.find(row => row.code === params.get('al_state'))?.code;
  const domain = INVESTIGATION_DOMAINS.find(row => row.value === params.get('al_domain'))?.value;
  const mode = params.get('al_view') === 'network' ? 'network' : 'map';
  const selection = readSelection(params.get('al_selection'));
  const filterKey = JSON.stringify({q:query,stateCode,domains:domain?[domain]:undefined,geographyMode:'all'});
  const filters = useMemo<InvestigationFilters>(() => JSON.parse(filterKey), [filterKey]);
  const view = useMemo(() => getMetroSpendingView(registry, filters, {cohort,category,city,topic,includeNational,includeStateContext}), [filters,cohort,category,city,topic,includeNational,includeStateContext]);
  const contextRows = useMemo(() => searchMetroContext(registry,view.contextRecords,contextQuery), [view.contextRecords,contextQuery]);
  const contextPages = Math.max(1,Math.ceil(contextRows.length/8)), safeContextPage = Math.min(contextPage,contextPages);
  const scene = useMemo(() => buildMapEvidenceScene(view.evidenceRegistry, {geographyMode:'all'}), [view.evidenceRegistry]);
  const coverage = useMemo(() => registry.states.map(state => {
    const hub = scene.stateHubs.find(row => row.stateCode === state.code);
    return {stateCode:state.code,name:state.name,records:hub?.counts.records??0,entities:hub?.counts.entities??0,relationships:hub?.counts.relationships??0,coverageRecords:hub?.coverageRecordIds.length??0,associationRecords:hub?.associationRecordIds.length??0,nationalContextRecords:0,unknownRecords:0,domains:[]};
  }), [scene]);
  useEffect(() => { setDraft(query); }, [query]);
  useEffect(() => { setContextDraft(contextQuery); }, [contextQuery]);
  useEffect(() => { setPage(1);setContextPage(1); }, [filterKey,cohort,category,city,topic,includeNational,includeStateContext]);
  useEffect(() => { setContextPage(1); }, [contextQuery]);
  useEffect(() => {
    if (contextOpen && window.matchMedia('(max-width:767px)').matches) {
      // The mobile drawer follows the map; opening it must expose the actual reader.
      // No motion or filter-driven scrolling is needed for this navigation.
      document.getElementById('al-context-index')?.scrollIntoView({block:'start',behavior:'instant'});
    }
  }, [contextOpen]);
  const patch = (changes: Record<string,string|undefined>) => {
    // HashRouter updates the browser URL before concurrent React navigation commits.
    // Compose rapid reader/filter actions from that URL rather than a stale render.
    const route = new URL(window.location.hash.slice(1), window.location.origin);
    const next = new URLSearchParams(route.search);
    for (const [key,value] of Object.entries(changes)) value ? next.set(key,value) : next.delete(key);
    setParams(next);
  };
  const choose = (next: LinkedMapSelection | null) => { if(next)setListOpen(false);patch({al_selection:next?`${next.kind}:${next.id}`:undefined,...(next?{al_context:undefined}:{})});if(next&&mode==='map'&&window.matchMedia('(max-width:767px)').matches)requestAnimationFrame(()=>investigationRef.current?.scrollIntoView({block:'start',behavior:'auto'})); };
  const entityId = selection?.kind === 'entity' ? selection.id : selection?.kind === 'relationship' ? registry.relationships.find(row=>row.id===selection.id)?.from : selection?.kind === 'record' ? registry.records.find(row=>row.id===selection.id)?.entityIds[0] : undefined;
  const selectedEntry = view.entries.find(row => row.id === selection?.id);
  const pages = Math.max(1,Math.ceil(view.entries.length/12)), safePage = Math.min(page,pages);
  const scopeDescription = `${view.scopeNote}${stateCode?' The state filter is also active.':''}${topic!=='all'?' Topic controls cover the new spending review.':''}`;
  const exportView = () => {
    const packet = exportAtlasEvidence(registry, view.selections, filters);
    const url = URL.createObjectURL(new Blob([JSON.stringify({...packet,reviewScope:cohort,metroScope:{city,topic,includeNational,includeStateContext,contextRecordIds:view.contextRecords.map(row=>row.id),scopeNote:view.scopeNote},interpretation:view.interpretation},null,2)],{type:'application/json'}));
    const anchor = document.createElement('a');anchor.href=url;anchor.download='allegations-evidence-and-responses.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="allegations-atlas" data-allegations-page="">
    <header className="al-command"><div><span className="al-kicker">PUBLIC RECORDS / CLAIMS / RESPONSES</span><h1>Allegations atlas<span className="al-status-dot" aria-hidden="true" /></h1></div><div className="al-command-actions"><button type="button" onClick={exportView} disabled={!view.selections.length} aria-label="Export allegations evidence and responses"><Download size={16}/><span>Export evidence</span></button><Link to="/method?iw_view=dossier">Method <ArrowUpRight size={14}/></Link></div></header>
    <div className="al-toolbar">
      <form role="search" onSubmit={event=>{event.preventDefault();setListOpen(true);patch({al_q:draft.trim()||undefined,al_selection:undefined,al_context:undefined});}}><label className="sr-only" htmlFor="al-search">Search allegations and records</label><Search size={16} aria-hidden="true"/><input id="al-search" type="search" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Find a company, case or connection"/><button type="submit">Search</button></form>
      <label className="al-cohort"><span className="sr-only">Review scope</span><select value={cohort} onChange={event=>patch({al_cohort:event.target.value,al_selection:undefined})}><option value="new">Newly reviewed</option><option value="retained">Retained archive</option><option value="all">All reviewed & retained</option></select></label>
      <button type="button" aria-expanded={filtersOpen} aria-controls="al-filters" onClick={()=>setFiltersOpen(value=>!value)}><Filter size={15}/><span>Filters{domain||stateCode||category!=='all'?' •':''}</span></button>
      <div className="al-view-switch" aria-label="Investigation view"><button type="button" aria-pressed={mode==='map'} onClick={()=>patch({al_view:undefined})}><MapIcon size={15}/>Map</button><button type="button" aria-pressed={mode==='network'} onClick={()=>patch({al_view:'network'})}><Network size={15}/>Network</button></div>
    </div>
    {filtersOpen&&<section className="al-filters" id="al-filters" aria-label="Allegation filters"><label>Record type<select value={category} onChange={event=>patch({al_kind:event.target.value,al_selection:undefined})}>{Object.entries(categoryLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>State association<select value={stateCode??''} onChange={event=>patch({al_state:event.target.value||undefined,al_selection:undefined})}><option value="">All states & unplaced</option>{registry.states.map(state=><option value={state.code} key={state.code}>{state.name}</option>)}</select></label><label>Sector<select value={domain??''} onChange={event=>patch({al_domain:event.target.value||undefined,al_selection:undefined})}><option value="">All sectors</option>{INVESTIGATION_DOMAINS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="button" onClick={()=>patch({al_kind:undefined,al_state:undefined,al_domain:undefined,al_q:undefined,al_city:undefined,al_topic:undefined,al_national:undefined,al_state_context:undefined,al_cq:undefined,al_selection:undefined})}>Reset filters</button></section>}
    <section className="al-metro-focus" aria-label="Delhi and Mumbai spending review">
      <div className="al-metro-heading"><span className="al-kicker">FOLLOW PUBLIC SPENDING</span><h2>Delhi · Mumbai</h2></div>
      <div className="al-city-switch" role="group" aria-label="City focus">{(['both','delhi','mumbai','all'] as MetroCity[]).map(value=><button type="button" key={value} aria-pressed={city===value} onClick={()=>{setListOpen(true);patch({al_city:value==='all'?undefined:value,al_state:undefined,al_selection:undefined});}}>{METRO_CITY_LABELS[value]}</button>)}</div>
      <label className="al-topic-select"><span className="sr-only">Spending topic</span><select value={topic} onChange={event=>{setListOpen(true);patch({al_topic:event.target.value==='all'?undefined:event.target.value,al_selection:undefined});}}>{Object.entries(METRO_TOPIC_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
      <button type="button" className="al-context-trigger" aria-expanded={contextOpen} aria-controls="al-context-index" onClick={()=>patch({al_context:contextOpen?undefined:'1',al_selection:undefined})}><FileText size={15}/><span>Budgets & contracts</span><strong>{view.contextRecords.length}</strong></button>
      <div className="al-metro-scope"><p className="al-scope-copy">{scopeDescription}</p><details className="al-scope-details"><summary>Scope: {METRO_CITY_LABELS[city]} · {view.nationalEntries} national · {view.stateEntries} statewide</summary><p>{scopeDescription}</p></details><div className="al-context-switches"><label><input type="checkbox" checked={includeNational} onChange={event=>patch({al_national:event.target.checked?undefined:'0',al_selection:undefined})}/>Include national context</label><label title={city==='all'?'All reviewed already includes statewide context. Select a city to control it.':'Include only relevant statewide records, separately from city associations.'}><input type="checkbox" disabled={city==='all'} checked={includeStateContext} onChange={event=>patch({al_state_context:event.target.checked?'1':undefined,al_selection:undefined})}/>Include state context</label></div></div>
    </section>
    <div className="al-scope-line"><p><strong>{view.entries.length.toLocaleString()}</strong> matching records <span>· {view.counts.cases} case files · {view.counts.findings} findings · {view.counts.allegedLinks} alleged links · {view.counts.outcomes} outcomes{view.counts.allegations>0&&` · ${view.counts.allegations} filed allegations`} · {view.nationalEntries} national context · {view.stateEntries} statewide context</span></p><button type="button" aria-expanded={listOpen&&!contextOpen} aria-controls="al-record-index" onClick={()=>{if(contextOpen){setListOpen(true);patch({al_context:undefined});}else setListOpen(value=>!value);}}><List size={15}/>{listOpen&&!contextOpen?'Hide index':'Show index'}</button></div>
    <section ref={investigationRef} className={`al-investigation al-mode-${mode}${listOpen||contextOpen?' al-index-open':''}`} aria-label="Allegations geographic and relationship investigation">
      <div className="al-map-canvas">
        {mode==='map'?<LinkedEvidenceMap registry={registry} sceneRegistry={view.evidenceRegistry} filters={{geographyMode:'all'}} selection={selection} onSelectionChange={choose} depth={2} spatial coverage={coverage} selectedState={stateCode??null} onStateSelect={code=>patch({al_state:code??undefined,al_selection:undefined})} geographyMode="all" nationalRecords={scene.populations.national.counts.records} unknownRecords={scene.populations.unplaced.counts.records} internationalRecords={scene.populations.international.counts.records} indexLabel="DOCUMENTARY STATE ASSOCIATIONS" highlightedStateCodes={selectedEntry?.record?.geography.flatMap(row=>row.stateCodes)??[]} />:<AtlasNetwork registry={view.evidenceRegistry} evidenceRegistry={registry} selectedEntityId={entityId} selectedEvidence={selection&&selection.kind!=='state'&&selection.kind!=='site'?{kind:selection.kind as 'entity'|'record'|'relationship',id:selection.id}:null} onSelectionChange={choose}/>}
      </div>
      {listOpen&&!contextOpen&&<aside className="al-record-index" id="al-record-index" aria-label="Claims, findings and outcomes index"><header><div><span className="al-kicker">{cohort==='new'?'THIS REVIEW':cohort==='retained'?'RETAINED ARCHIVE':'COMPLETE INDEX'}</span><h2>Follow the evidence</h2></div><button type="button" aria-label="Close record index" onClick={()=>setListOpen(false)}><X size={16}/></button></header><p className="al-index-note">Each file keeps its source, procedural status and response. A connection alone does not establish corruption.</p><ol>{view.entries.slice((safePage-1)*12,safePage*12).map(entry=><li key={entry.id}><button type="button" className="al-record-card" data-allegation-entry={entry.id} aria-pressed={selection?.id===entry.id} onClick={()=>choose(entry.selection)}><span className="al-card-meta"><span data-tier={entry.tier}>{entry.tier}</span><span>{categoryLabels[entry.category]}</span></span><strong>{entry.title}</strong><span className="al-card-placement">{metroPlacement(registry,(entry.record??entry.relationship)!.geography).label}</span><span className="al-card-summary">{entry.summary}</span><span className="al-card-foot">{entry.sourceIds.length} sources · {entry.statusAsOf??'Status date unknown'}<ArrowUpRight size={14}/></span><span className="al-card-state">{entry.claimState.replace(/-/gu,' ')} · {entry.status.replace(/-/gu,' ')}</span></button></li>)}</ol>{!view.entries.length&&<div className="al-empty"><h3>No matching records</h3><p>Try a wider scope or reset the filters. An empty result is not evidence that a place or sector has no irregularities.</p></div>}<footer><button type="button" disabled={safePage===1} onClick={()=>setPage(safePage-1)}>Previous</button><span>{safePage} / {pages}</span><button type="button" disabled={safePage===pages} onClick={()=>setPage(safePage+1)}>Next</button></footer></aside>}
      {contextOpen&&<aside className="al-record-index al-context-index" id="al-context-index" aria-label="Budgets and contracts context">
        <header><div><span className="al-kicker">ORDINARY FINANCIAL CONTEXT</span><h2>Budgets & contracts</h2></div><button type="button" aria-label="Close budgets and contracts" onClick={()=>patch({al_context:undefined})}><X size={16}/></button></header>
        <p className="al-index-note">These {view.contextRecords.length} records are separate from the claims count. {view.nationalContextRecords} are national context; {view.stateContextRecords} are statewide context. Neither establishes a city allocation. An allocation, tender or award is not evidence of misconduct.</p>
        <form className="al-context-search" role="search" onSubmit={event=>{event.preventDefault();patch({al_cq:contextDraft.trim()||undefined});}}><label className="sr-only" htmlFor="al-context-search">Search budgets and contracts</label><input id="al-context-search" type="search" value={contextDraft} onChange={event=>setContextDraft(event.target.value)} placeholder="Find a budget, agency or tender"/><button type="submit">Search</button></form>
        <div className="al-context-counts" aria-label="Context record counts"><span><strong>{view.contextCounts.allocations}</strong> allocations</span><span><strong>{view.contextCounts.notices}</strong> notices</span><span><strong>{view.contextCounts.awards}</strong> awards</span></div>
        <ol>{contextRows.slice((safeContextPage-1)*8,safeContextPage*8).map(row=><li key={row.id}><button type="button" className="al-record-card" data-metro-context={row.id} onClick={()=>choose({kind:'record',id:row.id})}><span className="al-card-meta"><span data-tier={row.tier}>{row.tier}</span><span>{METRO_CONTEXT_LABELS[row.kind as MetroContextKind]}</span></span><strong>{row.title}</strong><span className="al-card-placement">{metroPlacement(registry,row.geography).label}</span><span className="al-card-summary">{row.summary}</span>{metroRecordAmounts(row).slice(0,2).map((amount,index)=><span className="al-context-amount" key={index}>{amount}</span>)}{row.amounts.length>2&&<span className="al-context-more">+ {row.amounts.length-2} separate observations in the reader</span>}<span className="al-card-foot">{row.sourceIds.length} sources · {row.period}<ArrowUpRight size={14}/></span></button></li>)}</ol>
        {!contextRows.length&&<div className="al-empty"><h3>No matching financial context</h3><p>{cohort==='retained'?'Choose Newly reviewed or All reviewed & retained for this spending review.':'Try a wider city or topic scope, include national context, or clear the search. No complete spending or tender census is claimed.'}</p></div>}
        <footer><button type="button" disabled={safeContextPage===1} onClick={()=>setContextPage(safeContextPage-1)}>Previous</button><span>{safeContextPage} / {contextPages}</span><button type="button" disabled={safeContextPage===contextPages} onClick={()=>setContextPage(safeContextPage+1)}>Next</button></footer>
      </aside>}
    </section>
    <section className="al-reading-notes" aria-label="How to read this investigation"><div><span className="al-kicker">EVIDENCE, WITH ITS LIMITS</span><h2>Trace the claim. Read the response.</h2><p>{view.interpretation}</p></div><div><h3>What the map can establish</h3><p>Numbered hubs index state associations. Only verified public sites receive coordinates. Lines highlight exact documented relationships between placed identities; they do not establish a physical money route. Unplaced and international records stay available in the network and index.</p><h3>Delhi and Mumbai: the next layer</h3><p>Police procurement, border and defence spending, and public finance are reviewed as separate documentary trails. The map includes linked financial context as well as claims. Budget estimates, revised estimates, expenditure, contract values and alleged losses keep their original stages; they are never added into a corruption total. Headquarters do not establish local spending. Tender notices alone identify neither the winner nor a payment.</p><h3>What this review covers</h3><p>A growing set of sourced investigations, not a complete census of corruption or all public spending. “Newly reviewed” describes this research release, not when the underlying events occurred. Findings, penalties, bail, acquittals and provisional allegations retain their separate meanings.</p><Link to="/follow-the-money">Explore broader money trails <ArrowUpRight size={14}/></Link></div></section>
  </div>;
}
