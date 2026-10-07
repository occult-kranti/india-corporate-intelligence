import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import type { InvestigationRegistry } from '../../data/investigation';
import { exportAtlasEvidence, type AtlasSelection } from '../../data/atlasInvestigation';
import { getEvidenceReaderModel, searchEvidenceConnections } from '../../data/mapEvidence';
import { investigationRelationshipDate, relationshipDirected } from './graphHelpers';
import './atlas-network.css';

export interface AtlasEvidencePopoverProps {
 registry:InvestigationRegistry;selection:AtlasSelection|null;onClose:()=>void;
 onSelectionChange?:(selection:AtlasSelection)=>void;onEntitySelect?:(id:string)=>void;onRelationshipSelect?:(id:string)=>void;
 onRecordSelect?:(id:string)=>void;onSourceSelect?:(id:string)=>void;returnFocusRef?:RefObject<HTMLElement>;
 onBackToPlace?:()=>void;placeLabel?:string;
}
type ReaderTab='overview'|'connections'|'evidence'|'responses'|'sources';
export function AtlasEvidencePopover({registry,selection,onClose,onSelectionChange,onEntitySelect,onRelationshipSelect,onRecordSelect,onSourceSelect,returnFocusRef,onBackToPlace,placeLabel}:AtlasEvidencePopoverProps) {
 const titleId=useId(),heading=useRef<HTMLHeadingElement>(null),container=useRef<HTMLElement>(null);
 const [current,setCurrent]=useState<AtlasSelection|null>(selection),[history,setHistory]=useState<AtlasSelection[]>([]),[expanded,setExpanded]=useState(false);
 const [tab,setTab]=useState<ReaderTab>('overview'),[query,setQuery]=useState(''),[page,setPage]=useState(1),[copied,setCopied]=useState(false);
 const expectedSelection=useRef<string|null>(null);
 useEffect(()=>{
  const key=selection?`${selection.kind}:${selection.id}`:null;
  if(expectedSelection.current!==key)setHistory([]);
  expectedSelection.current=null;setCurrent(selection);
 },[selection?.kind,selection?.id]);
 useEffect(()=>{
  if(!selection)return;
  const previous=document.activeElement as HTMLElement|null;
  return ()=>{if(previous?.isConnected&&previous!==document.body&&previous!==document.documentElement)previous.focus();else returnFocusRef?.current?.focus();};
 },[!!selection,returnFocusRef]);
 useEffect(()=>{setTab('overview');setQuery('');setPage(1);setCopied(false);heading.current?.focus();container.current?.scrollTo({top:0});},[current?.kind,current?.id]);
 const reader=useMemo(()=>current?getEvidenceReaderModel(registry,current):null,[registry,current]);
 const connections=useMemo(()=>searchEvidenceConnections(registry,reader?.relationships??[],query,page),[registry,reader,query,page]);
 const entityIndex=useMemo(()=>new Map(registry.entities.map(row=>[row.id,row])),[registry.entities]);
 if(!selection||!current||!reader)return null;
 const row=current.kind==='entity'?entityIndex.get(current.id):current.kind==='relationship'?registry.relationships.find(row=>row.id===current.id):registry.records.find(row=>row.id===current.id);
 const close=()=>{setHistory([]);setCurrent(null);onClose();};
 const select=(next:AtlasSelection,back=false)=>{
  if(next.kind===current.kind&&next.id===current.id)return;
  if(!back)setHistory(value=>[...value,current]);
  expectedSelection.current=`${next.kind}:${next.id}`;setCurrent(next);
  if(onSelectionChange)onSelectionChange(next);
  else if(next.kind==='entity')onEntitySelect?.(next.id);
  else if(next.kind==='relationship')onRelationshipSelect?.(next.id);
  else onRecordSelect?.(next.id);
 };
 const changeTab=(next:ReaderTab)=>{setTab(next);setQuery('');setPage(1);};
 if(!row)return <aside ref={container} className="atlas-evidence-popover" role="dialog" aria-labelledby={titleId} onKeyDown={event=>{if(event.key==='Escape')close();}}><button onClick={close}>Close</button><h2 ref={heading} tabIndex={-1} id={titleId}>Record unavailable</h2><p>This exact identifier is not retained: {current.id}</p></aside>;
 const edge=current.kind==='relationship'?registry.relationships.find(item=>item.id===row.id):undefined;
 const record=current.kind==='record'?registry.records.find(item=>item.id===row.id):undefined;
 const entity=current.kind==='entity'?entityIndex.get(row.id):undefined,item=edge??record;
 const sourceIds=new Set(row.sourceIds),primary=reader.closure.sources.find(source=>sourceIds.has(source.id));
 const sourceRow=(source:typeof reader.closure.sources[number])=><article className="atlas-source-row" key={source.id}>{onSourceSelect?<button type="button" className="atlas-text-link" onClick={()=>{close();onSourceSelect(source.id);}}>{source.title}</button>:<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>}<small>{source.tier} · {source.publisher} · {source.publishedAt??'Publication date unknown'}</small><p>{source.locator}</p>{source.limitations.length>0&&<details><summary>Source limitations</summary>{source.limitations.map(text=><p key={text}>{text}</p>)}</details>}<a href={source.url} target="_blank" rel="noopener noreferrer">Open source ↗</a></article>;
 const download=()=>{const data=exportAtlasEvidence(registry,[current]),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='atlas-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const terms=query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
 const listedRecords=(tab==='responses'?reader.responses:reader.records).filter(row=>terms.every(term=>`${row.title} ${row.summary} ${row.response} ${row.id}`.toLocaleLowerCase().includes(term)));
 const listedSources=reader.closure.sources.filter(source=>terms.every(term=>`${source.title} ${source.publisher} ${source.summary} ${source.id}`.toLocaleLowerCase().includes(term)));
 const tabTotal=tab==='sources'?listedSources.length:listedRecords.length,pages=Math.max(1,Math.ceil(tabTotal/12)),safePage=Math.min(page,pages);
 const tabs:{id:ReaderTab;label:string;count?:number}[]=[{id:'overview',label:'Overview'},{id:'connections',label:'Connections',count:reader.relationships.length},{id:'evidence',label:'Evidence',count:reader.records.length},{id:'responses',label:'Responses',count:reader.responses.length},{id:'sources',label:'Sources',count:reader.closure.sources.length}];
 return <aside ref={container} tabIndex={-1} className={`atlas-evidence-popover${expanded?' is-expanded':''}`} role="dialog" aria-labelledby={titleId} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.altKey&&event.key==='ArrowLeft'&&history.length){event.preventDefault();const previous=history[history.length-1];setHistory(value=>value.slice(0,-1));select(previous,true);}}} data-selection-id={row.id}>
  <div className="atlas-reader-toolbar">{history.length>0&&<button type="button" aria-label="Back to previous evidence" onClick={()=>{const previous=history[history.length-1];setHistory(value=>value.slice(0,-1));select(previous,true);}}>← Back</button>}<span>{current.kind} · {row.namespace}</span><button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Compact':'Expand'}</button><button type="button" onClick={close} aria-label="Close evidence details">×</button></div>
  {onBackToPlace&&<button type="button" className="atlas-back-to-place" onClick={onBackToPlace}>← Back to {placeLabel??'place'} index</button>}
  <header className="atlas-reader-heading">{item&&<div className="atlas-evidence-facts"><span data-tier={item.tier}>{item.tier}</span><span>{item.status}</span></div>}<h2 ref={heading} tabIndex={-1} id={titleId}>{'title' in row?row.title:row.label}</h2><p className="atlas-reader-summary">{row.summary}</p>{item&&<p className="atlas-reader-date"><time>{investigationRelationshipDate(item)}</time> · {item.dateBasis}{item.statusAsOf&&<> Status as of {item.statusAsOf}.</>}</p>}{entity&&<p className="atlas-reader-identity"><strong>Identity basis</strong> {entity.identityBasis}</p>}</header>
  <div className="atlas-reader-geography">{row.geography.map((geo,index)=><p key={index}><strong>{geo.basis.replace(/-/gu,' ')}</strong> {geo.note}</p>)}</div>
  {item?.amounts.map((amount,index)=><p className="atlas-money-stage" key={index}><strong>{amount.value.toLocaleString('en-IN')} {amount.currency} {amount.unit}</strong><span>{amount.stage} · {amount.period}</span></p>)}
  {edge&&<div className="atlas-endpoints"><button type="button" onClick={()=>select({kind:'entity',id:edge.from})}>{entityIndex.get(edge.from)?.label??edge.from}</button><span>{relationshipDirected(edge.kind)?'→':'↔'} {edge.label} {relationshipDirected(edge.kind)?'→':'↔'}</span><button type="button" onClick={()=>select({kind:'entity',id:edge.to})}>{entityIndex.get(edge.to)?.label??edge.to}</button></div>}
  {(record||reader.responses[0])&&<section className="atlas-response-preview" aria-label="Response and current outcome"><h3>Response & current outcome</h3>{record?<p>{record.response}</p>:<><p>{reader.responses[0].summary}</p><button type="button" className="atlas-text-link" onClick={()=>select({kind:'record',id:reader.responses[0].id})}>{reader.responses[0].title}</button></>}{reader.responses.length>1&&<button type="button" onClick={()=>changeTab('responses')}>Read all {reader.responses.length} linked responses</button>}</section>}
  {primary&&<div className="atlas-primary-source">{sourceRow(primary)}</div>}
  {reader.neighbors.length>0&&<section className="atlas-neighbor-preview" aria-label="Connected identities"><h3>{entity?'Connected identities':'Identities in this evidence'} <small>{reader.neighbors.length}</small></h3><div>{reader.neighbors.slice(0,4).map(neighbor=><button type="button" key={neighbor.id} data-neighbor-id={neighbor.id} onClick={()=>select({kind:'entity',id:neighbor.id})}><span>{neighbor.label}</span><small>{neighbor.type} · {neighbor.namespace}</small></button>)}</div><button type="button" className="atlas-text-link" onClick={()=>changeTab('connections')}>Explore all {reader.relationships.length.toLocaleString()} exact connections</button></section>}
  <div className="atlas-reader-tabs" role="tablist" aria-label="Evidence detail sections">{tabs.map(value=><button type="button" role="tab" tabIndex={tab===value.id?0:-1} aria-selected={tab===value.id} aria-controls={`${titleId}-panel`} id={`${titleId}-${value.id}`} key={value.id} onKeyDown={event=>{const index=tabs.findIndex(item=>item.id===value.id),next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(next!==null){event.preventDefault();changeTab(tabs[next].id);document.getElementById(`${titleId}-${tabs[next].id}`)?.focus();}}} onClick={()=>changeTab(value.id)}>{value.label}{value.count!==undefined&&<span>{value.count.toLocaleString()}</span>}</button>)}</div>
  <section className="atlas-reader-tab-panel" id={`${titleId}-panel`} role="tabpanel" aria-labelledby={`${titleId}-${tab}`}>
   {tab==='overview'?<><h3>Qualifications & interpretation</h3>{row.limitations.map(text=><p key={text}>{text}</p>)}{item?.alternativeExplanations.map(text=><p key={text}><strong>Alternative explanation</strong> {text}</p>)}{item?.falsifier&&<p><strong>Evidence that would change this reading</strong> {item.falsifier}</p>}<p>Connections establish retained documentary relationships. They do not by themselves establish influence, wrongdoing, a payment, or a person's location.</p></>:<>
    <label className="atlas-reader-search">Search {tab}<input type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} placeholder={tab==='connections'?'Name, relationship or source':'Title or source text'}/></label>
    {tab==='connections'?<><p className="atlas-reader-population">{connections.total.toLocaleString()} matching / {connections.denominator.toLocaleString()} exact connections. Original directions retained; no display cap removes evidence.</p><ol className="atlas-reader-connections">{connections.entries.map(edge=><li key={edge.id} data-connection-id={edge.id}><div><button type="button" data-neighbor-id={edge.from} onClick={()=>select({kind:'entity',id:edge.from})}>{entityIndex.get(edge.from)?.label??edge.from}</button><span aria-label={relationshipDirected(edge.kind)?'to':'related to'}>{relationshipDirected(edge.kind)?'→':'↔'}</span><button type="button" data-neighbor-id={edge.to} onClick={()=>select({kind:'entity',id:edge.to})}>{entityIndex.get(edge.to)?.label??edge.to}</button></div><button className="atlas-related-edge" type="button" onClick={()=>select({kind:'relationship',id:edge.id})}>{edge.label}<small>{edge.tier} · {edge.status} · {investigationRelationshipDate(edge)}</small></button><small>{edge.sourceIds.length} sources · {edge.responseIds.length} responses</small></li>)}</ol>{!connections.total&&<p>No exact connection matches this search.</p>}<div className="atlas-reader-pagination"><button type="button" disabled={connections.page===1} onClick={()=>setPage(connections.page-1)}>Previous</button><span>Page {connections.page} of {connections.pages}</span><button type="button" disabled={connections.page===connections.pages} onClick={()=>setPage(connections.page+1)}>Next</button></div></>:<>
     {tab==='sources'?listedSources.slice((safePage-1)*12,safePage*12).map(sourceRow):listedRecords.slice((safePage-1)*12,safePage*12).map(record=><article className="atlas-reader-record" key={record.id} data-response-id={tab==='responses'?record.id:undefined}><button className="atlas-text-link" type="button" onClick={()=>select({kind:'record',id:record.id})}>{record.title}</button><p>{record.summary}</p><p>{record.response}</p><small>{record.tier} · {record.status} · {record.statusAsOf??'Status date unknown'}</small></article>)}{!tabTotal&&<p>No retained {tab} match this search.</p>}<div className="atlas-reader-pagination"><button type="button" disabled={safePage===1} onClick={()=>setPage(safePage-1)}>Previous</button><span>{tabTotal} records · page {safePage} of {pages}</span><button type="button" disabled={safePage===pages} onClick={()=>setPage(safePage+1)}>Next</button></div>
    </>}
   </>}
  </section>
  <footer className="atlas-reader-actions"><button type="button" className="atlas-export-evidence" onClick={download}>Export evidence + linked responses ({reader.closure.records.length} records)</button><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(`${'title' in row?row.title:row.label}\n${row.id}\n${row.sourceIds.map(id=>reader.closure.sources.find(source=>source.id===id)?.url).filter(Boolean).join('\n')}`);setCopied(true);}catch{setCopied(false);}}}>{copied?'Citation copied':'Copy citation'}</button><small className="atlas-reader-id">{row.id}</small></footer>
 </aside>;
}
