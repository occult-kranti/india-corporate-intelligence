import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Download, Filter, List, Map as MapIcon, Network, Search, X } from 'lucide-react';
import { INVESTIGATION_DOMAINS, INVESTIGATION_REGISTRY as registry, type InvestigationFilters } from '../data/investigation';
import { getAllegationsView, type AllegationCategory, type AllegationCohort } from '../data/allegationsInvestigation';
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
  const cohort: AllegationCohort = params.get('al_cohort') === 'retained' ? 'retained' : params.get('al_cohort') === 'all' ? 'all' : 'new';
  const category = Object.prototype.hasOwnProperty.call(categoryLabels, params.get('al_kind') ?? '') ? params.get('al_kind') as AllegationCategory : 'all';
  const stateCode = registry.states.find(row => row.code === params.get('al_state'))?.code;
  const domain = INVESTIGATION_DOMAINS.find(row => row.value === params.get('al_domain'))?.value;
  const mode = params.get('al_view') === 'network' ? 'network' : 'map';
  const selection = readSelection(params.get('al_selection'));
  const filterKey = JSON.stringify({q:query,stateCode,domains:domain?[domain]:undefined,geographyMode:'all'});
  const filters = useMemo<InvestigationFilters>(() => JSON.parse(filterKey), [filterKey]);
  const view = useMemo(() => getAllegationsView(registry, filters, {cohort,category}), [filters,cohort,category]);
  const scene = useMemo(() => buildMapEvidenceScene(view.evidenceRegistry, {geographyMode:'all'}), [view.evidenceRegistry]);
  const coverage = useMemo(() => registry.states.map(state => {
    const hub = scene.stateHubs.find(row => row.stateCode === state.code);
    return {stateCode:state.code,name:state.name,records:hub?.counts.records??0,entities:hub?.counts.entities??0,relationships:hub?.counts.relationships??0,coverageRecords:hub?.coverageRecordIds.length??0,associationRecords:hub?.associationRecordIds.length??0,nationalContextRecords:0,unknownRecords:0,domains:[]};
  }), [scene]);
  useEffect(() => { setDraft(query); }, [query]);
  useEffect(() => { setPage(1); }, [filterKey,cohort,category]);
  const patch = (changes: Record<string,string|undefined>) => setParams(current => {const next = new URLSearchParams(current);for(const [key,value] of Object.entries(changes)) value ? next.set(key,value) : next.delete(key);return next;});
  const choose = (next: LinkedMapSelection | null) => { if(next)setListOpen(false);patch({al_selection:next?`${next.kind}:${next.id}`:undefined});if(next&&mode==='map'&&window.matchMedia('(max-width:767px)').matches)requestAnimationFrame(()=>investigationRef.current?.scrollIntoView({block:'start',behavior:'auto'})); };
  const entityId = selection?.kind === 'entity' ? selection.id : selection?.kind === 'relationship' ? registry.relationships.find(row=>row.id===selection.id)?.from : selection?.kind === 'record' ? registry.records.find(row=>row.id===selection.id)?.entityIds[0] : undefined;
  const selectedEntry = view.entries.find(row => row.id === selection?.id);
  const pages = Math.max(1,Math.ceil(view.entries.length/12)), safePage = Math.min(page,pages);
  const exportView = () => {
    const packet = exportAtlasEvidence(registry, view.entries.map(row => row.selection), filters);
    const url = URL.createObjectURL(new Blob([JSON.stringify({...packet,reviewScope:cohort,interpretation:view.interpretation},null,2)],{type:'application/json'}));
    const anchor = document.createElement('a');anchor.href=url;anchor.download='allegations-evidence-and-responses.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="allegations-atlas" data-allegations-page="">
    <header className="al-command"><div><span className="al-kicker">PUBLIC RECORDS / CLAIMS / RESPONSES</span><h1>Allegations atlas<span className="al-status-dot" aria-hidden="true" /></h1></div><div className="al-command-actions"><button type="button" onClick={exportView} disabled={!view.entries.length} aria-label="Export allegations evidence and responses"><Download size={16}/><span>Export evidence</span></button><Link to="/method?iw_view=dossier">Method <ArrowUpRight size={14}/></Link></div></header>
    <div className="al-toolbar">
      <form role="search" onSubmit={event=>{event.preventDefault();setListOpen(true);patch({al_q:draft.trim()||undefined,al_selection:undefined});}}><label className="sr-only" htmlFor="al-search">Search allegations and records</label><Search size={16} aria-hidden="true"/><input id="al-search" type="search" value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Find a company, case or connection"/><button type="submit">Search</button></form>
      <label className="al-cohort"><span className="sr-only">Review scope</span><select value={cohort} onChange={event=>patch({al_cohort:event.target.value,al_selection:undefined})}><option value="new">Newly reviewed</option><option value="retained">Retained archive</option><option value="all">All reviewed & retained</option></select></label>
      <button type="button" aria-expanded={filtersOpen} aria-controls="al-filters" onClick={()=>setFiltersOpen(value=>!value)}><Filter size={15}/><span>Filters{domain||stateCode||category!=='all'?' •':''}</span></button>
      <div className="al-view-switch" aria-label="Investigation view"><button type="button" aria-pressed={mode==='map'} onClick={()=>patch({al_view:undefined})}><MapIcon size={15}/>Map</button><button type="button" aria-pressed={mode==='network'} onClick={()=>patch({al_view:'network'})}><Network size={15}/>Network</button></div>
    </div>
    {filtersOpen&&<section className="al-filters" id="al-filters" aria-label="Allegation filters"><label>Record type<select value={category} onChange={event=>patch({al_kind:event.target.value,al_selection:undefined})}>{Object.entries(categoryLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>State association<select value={stateCode??''} onChange={event=>patch({al_state:event.target.value||undefined,al_selection:undefined})}><option value="">All states & unplaced</option>{registry.states.map(state=><option value={state.code} key={state.code}>{state.name}</option>)}</select></label><label>Sector<select value={domain??''} onChange={event=>patch({al_domain:event.target.value||undefined,al_selection:undefined})}><option value="">All sectors</option>{INVESTIGATION_DOMAINS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button type="button" onClick={()=>patch({al_kind:undefined,al_state:undefined,al_domain:undefined,al_q:undefined,al_selection:undefined})}>Reset filters</button></section>}
    <div className="al-scope-line"><p><strong>{view.entries.length.toLocaleString()}</strong> matching records <span>· {view.counts.cases} case files · {view.counts.allegedLinks} alleged links · {view.counts.outcomes} outcomes</span></p><button type="button" aria-expanded={listOpen} aria-controls="al-record-index" onClick={()=>setListOpen(value=>!value)}><List size={15}/>{listOpen?'Hide index':'Show index'}</button></div>
    <section ref={investigationRef} className={`al-investigation al-mode-${mode}${listOpen?' al-index-open':''}`} aria-label="Allegations geographic and relationship investigation">
      <div className="al-map-canvas">
        {mode==='map'?<LinkedEvidenceMap registry={registry} sceneRegistry={view.evidenceRegistry} filters={{geographyMode:'all'}} selection={selection} onSelectionChange={choose} depth={2} spatial coverage={coverage} selectedState={stateCode??null} onStateSelect={code=>patch({al_state:code??undefined,al_selection:undefined})} geographyMode="all" nationalRecords={scene.populations.national.counts.records} unknownRecords={scene.populations.unplaced.counts.records} internationalRecords={scene.populations.international.counts.records} indexLabel="DOCUMENTARY STATE ASSOCIATIONS" highlightedStateCodes={selectedEntry?.record?.geography.flatMap(row=>row.stateCodes)??[]} />:<AtlasNetwork registry={view.evidenceRegistry} evidenceRegistry={registry} selectedEntityId={entityId} selectedEvidence={selection&&selection.kind!=='state'&&selection.kind!=='site'?{kind:selection.kind as 'entity'|'record'|'relationship',id:selection.id}:null} onSelectionChange={choose}/>}
      </div>
      {listOpen&&<aside className="al-record-index" id="al-record-index" aria-label="Claims, findings and outcomes index"><header><div><span className="al-kicker">{cohort==='new'?'THIS REVIEW':cohort==='retained'?'RETAINED ARCHIVE':'COMPLETE INDEX'}</span><h2>Follow the evidence</h2></div><button type="button" aria-label="Close record index" onClick={()=>setListOpen(false)}><X size={16}/></button></header><p className="al-index-note">Each file keeps its source, procedural status and response. A connection alone does not establish corruption.</p><ol>{view.entries.slice((safePage-1)*12,safePage*12).map(entry=><li key={entry.id}><button type="button" className="al-record-card" data-allegation-entry={entry.id} aria-pressed={selection?.id===entry.id} onClick={()=>choose(entry.selection)}><span className="al-card-meta"><span data-tier={entry.tier}>{entry.tier}</span><span>{categoryLabels[entry.category]}</span></span><strong>{entry.title}</strong><span className="al-card-summary">{entry.summary}</span><span className="al-card-foot">{entry.sourceIds.length} sources · {entry.statusAsOf??'Status date unknown'}<ArrowUpRight size={14}/></span><span className="al-card-state">{entry.claimState.replace(/-/gu,' ')} · {entry.status.replace(/-/gu,' ')}</span></button></li>)}</ol>{!view.entries.length&&<div className="al-empty"><h3>No matching records</h3><p>Try a wider scope or reset the filters. An empty result is not evidence that a place or sector has no irregularities.</p></div>}<footer><button type="button" disabled={safePage===1} onClick={()=>setPage(safePage-1)}>Previous</button><span>{safePage} / {pages}</span><button type="button" disabled={safePage===pages} onClick={()=>setPage(safePage+1)}>Next</button></footer></aside>}
    </section>
    <section className="al-reading-notes" aria-label="How to read this investigation"><div><span className="al-kicker">EVIDENCE, WITH ITS LIMITS</span><h2>Trace the claim. Read the response.</h2><p>{view.interpretation}</p></div><div><h3>What the map can establish</h3><p>Numbered hubs index state associations. Only verified public sites receive coordinates. Lines highlight exact documented relationships between placed identities; they do not establish a physical money route. Unplaced and international records stay available in the network and index.</p><h3>What this review covers</h3><p>A growing set of sourced investigations, not a complete census of corruption or all public spending. “Newly reviewed” describes this research release, not when the underlying events occurred. Findings, penalties, bail, acquittals and provisional allegations retain their separate meanings.</p><Link to="/follow-the-money">Explore broader money trails <ArrowUpRight size={14}/></Link></div></section>
  </div>;
}
