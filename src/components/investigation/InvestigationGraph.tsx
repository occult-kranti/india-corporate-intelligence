import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { InvestigationEntity, InvestigationRecord, InvestigationRelationship, InvestigationSource, InvestigationTier } from '../../data/investigation';
import { GRAPH_LIMITS, investigationEdgePaths, investigationGraphCsv, investigationGraphSlice, investigationGraphLabels, type GraphDirection, investigationRelationshipDate, isTraversalRelationship, relationshipDirected } from './graphHelpers';
import './graph.css';

export interface InvestigationGraphProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  sources: InvestigationSource[];
  records?: InvestigationRecord[];
  selectedNode: string | null;
  selectedEdge: string | null;
  depth: 1 | 2 | 3 | 4 | 5;
  direction?: GraphDirection;
  hideDepthControls?: boolean;
  view: 'graph' | 'table';
  onNodeSelect: (id: string | null) => void;
  onEdgeSelect: (id: string | null) => void;
  onDepthChange: (depth: 1 | 2) => void;
  onViewChange: (view: 'graph' | 'table') => void;
  highlightEdgeIds?: string[];
  onSourceSelect?: (id: string) => void;
}
const DASH: Record<InvestigationTier,string> = {documented:'',reported:'6 3',alleged:'2 4',analytic:'8 3 2 3','self-reported':'4 2'};
const FAMILY_COLORS: Record<string,string> = {state:'#5a8ec4',capital:'#c9a86c',recipient:'#8b7ec4',instrument:'#5aa89e',enforce:'#c45b5a',market:'#7a9e7e'};
const COLORS: Record<string,string> = {company:'#c9a86c',group:'#c9a86c',shell:'#c9a86c',person:'#5a8ec4',party:'#5a8ec4',ministry:'#5a8ec4',authority:'#5a8ec4',agency:'#5a8ec4',psu:'#5a8ec4',institution:'#5a8ec4',country:'#5a8ec4',sovereign:'#5a8ec4',fund:'#8b7ec4',trust:'#8b7ec4',ngo:'#8b7ec4',sangh:'#8b7ec4',law:'#5aa89e',mechanism:'#5aa89e',project:'#5aa89e',court:'#c45b5a',regulator:'#c45b5a',state:'#7a9e7e',industry:'#7a9e7e',exchange:'#7a9e7e'};
function shape(type:string) {
  if (['authority','agency','ministry','institution','country','sovereign','court','psu'].includes(type)) return 'M-13,-13h26v26h-26z';
  if (type==='party') return 'M0,-17 17,0 0,17 -17,0Z';
  if (['law','project','mechanism'].includes(type)) return 'M0,-17 16,12 -16,12Z';
  if (type==='person') return 'M-15,12a15,15 0 1 1 30,0z';
  return 'M-14,0a14,14 0 1 0 28,0a14,14 0 1 0 -28,0';
}
interface Point extends SimulationNodeDatum {id:string}
function graphPositions(entities: InvestigationEntity[], relationships: InvestigationRelationship[], selectedNode:string|null) {
  const nodes:Point[]=[...entities].sort((a,b)=>a.id.localeCompare(b.id)).map(node=>({id:node.id,...node.id===selectedNode?{fx:0,fy:0}:{}}));
  const links=relationships.filter(edge=>edge.from!==edge.to).map(edge=>({source:edge.from,target:edge.to}));
  const simulation=forceSimulation(nodes).stop().force('links',forceLink<Point,{source:string;target:string}>(links).id(node=>node.id).distance(155)).force('charge',forceManyBody().strength(-650)).force('collide',forceCollide(52)).force('x',forceX(0).strength(.09)).force('y',forceY(0).strength(.12));
  simulation.tick(130);simulation.stop();
  // Preserve simulation spacing; fitting the viewport must not compress nodes into labels.
  const minX=Math.min(-180,...nodes.map(node=>node.x??0)),maxX=Math.max(180,...nodes.map(node=>node.x??0));
  const minY=Math.min(-140,...nodes.map(node=>node.y??0)),maxY=Math.max(140,...nodes.map(node=>node.y??0));
  const width=Math.max(720,maxX-minX+360),height=Math.max(540,maxY-minY+220);
  return {width,height,points:new Map(nodes.map(node=>[node.id,{x:(node.x??0)-minX+180,y:(node.y??0)-minY+110}]))};
}
const EMPTY_HIGHLIGHTS:string[]=[];
export function InvestigationGraph({entities,relationships,sources,selectedNode,selectedEdge,depth,view,onNodeSelect,onEdgeSelect,onDepthChange,onViewChange,highlightEdgeIds=EMPTY_HIGHLIGHTS,onSourceSelect,direction='both',hideDepthControls=false,records=[]}:InvestigationGraphProps) {
  const uid=useId().replace(/:/gu,'');
  const plot=useRef<HTMLDivElement>(null);
  const [viewport,setViewport]=useState({width:0,height:0});
  const [zoomOverride,setZoomOverride]=useState<{context:string;value:number}|null>(null);
  const [pageRequest,setPageRequest]=useState({key:'',page:0});
  const [ledgerQuery,setLedgerQuery]=useState('');
  const [hintNode,setHintNode]=useState<string|null>(null);
  const priority=useMemo(()=>[...new Set([...highlightEdgeIds,...selectedEdge?[selectedEdge]:[]])],[highlightEdgeIds,selectedEdge]);
  const slice=useMemo(()=>investigationGraphSlice(entities,relationships,sources,selectedNode,depth,priority,undefined,direction),[entities,relationships,sources,selectedNode,depth,priority,direction]);
  const layout=useMemo(()=>graphPositions(slice.entities,slice.relationships,selectedNode),[slice.entities,slice.relationships,selectedNode]);
  const zoomContext=`${selectedNode}|${depth}|${slice.entities.map(node=>node.id).join(',')}`;
  const fittedZoom=viewport.width&&viewport.height?Math.min(1,viewport.width/layout.width,viewport.height/layout.height):.5;
  const zoom=zoomOverride?.context===zoomContext?zoomOverride.value:fittedZoom;
  const setZoom=(value:number)=>setZoomOverride({context:zoomContext,value});
  const paths=useMemo(()=>investigationEdgePaths(slice.relationships,layout.points),[slice.relationships,layout.points]);
  const nodeById=useMemo(()=>new Map(entities.map(node=>[node.id,node])),[entities]);
  const sourceById=useMemo(()=>new Map(sources.map(source=>[source.id,source])),[sources]);
  const duplicateLabels=useMemo(()=>{const counts=new Map<string,number>();for(const node of entities)counts.set(node.label,(counts.get(node.label)??0)+1);return counts;},[entities]);
  const highlight=new Set(highlightEdgeIds);
  const highlightedNodes=new Set(slice.relationships.filter(edge=>highlight.has(edge.id)).flatMap(edge=>[edge.from,edge.to]));
  const ledger=useMemo(()=>{
    const query=ledgerQuery.trim().toLowerCase();
    return query?slice.ledger.filter(edge=>[edge.label,edge.kind,edge.summary,edge.id,nodeById.get(edge.from)?.label,nodeById.get(edge.to)?.label].join(' ').toLowerCase().includes(query)):slice.ledger;
  },[ledgerQuery,slice.ledger,nodeById]);
  const pageKey=`${selectedNode}|${depth}|${ledgerQuery}|${ledger.length}|${ledger[0]?.id??''}`;
  const page=Math.min(pageRequest.key===pageKey?pageRequest.page:0,Math.max(0,Math.ceil(ledger.length/40)-1));
  const pageEdges=ledger.slice(page*40,(page+1)*40);
  const changePage=(next:number)=>setPageRequest({key:pageKey,page:next});
  const centerPoint=(id:string|null)=>{
    const container=plot.current;if(!container)return;
    const point=id&&layout.points.get(id);
    container.scrollLeft=Math.max(0,(point?point.x:layout.width/2)*zoom-container.clientWidth/2);
    container.scrollTop=Math.max(0,(point?point.y:layout.height/2)*zoom-container.clientHeight/2);
  };
  useLayoutEffect(()=>{
    const container=plot.current;if(!container||view!=='graph')return;
    const center=()=>{
      if(container.clientWidth===0||container.clientHeight===0)return;
      setViewport(previous=>previous.width===container.clientWidth&&previous.height===container.clientHeight?previous:{width:container.clientWidth,height:container.clientHeight});
      const point=selectedNode&&layout.points.get(selectedNode);
      container.scrollLeft=Math.max(0,(point?point.x:layout.width/2)*zoom-container.clientWidth/2);
      container.scrollTop=Math.max(0,(point?point.y:layout.height/2)*zoom-container.clientHeight/2);
    };
    center();
    // Mobile inspector panes hide the canvas without unmounting it. Re-center
    // when the pane is revealed, rather than preserving a zero-width scroll.
    const observer=new ResizeObserver(center);observer.observe(container);
    return ()=>observer.disconnect();
  },[selectedNode,layout,zoom,view]);
  const fit=()=>setZoomOverride(null);
  const exportLedger=()=>{
    const url=URL.createObjectURL(new Blob(['\uFEFF',investigationGraphCsv(entities,ledger,sources,records)],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='investigation-relationships.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const selectedEntity=selectedNode?nodeById.get(selectedNode):null;
  const hintedEntity=hintNode?nodeById.get(hintNode):null;
  const displayLabels=true;
  const labels=investigationGraphLabels(slice.entities,layout.points,{zoom,width:layout.width,height:layout.height,showAll:displayLabels,priorityIds:[...selectedNode?[selectedNode]:[],...hintNode?[hintNode]:[],...highlightedNodes]});
  return <section className="iw-graph" aria-labelledby={`${uid}-title`}>
    <div className="iw-graph-heading"><div><p className="iw-graph-eyebrow">RELATIONSHIP EXPLORER</p><h2 id={`${uid}-title`}>Recorded connections</h2></div><div className="iw-graph-view" aria-label="Relationship view"><button type="button" aria-pressed={view==='graph'} onClick={()=>onViewChange('graph')}>Graph</button><button type="button" aria-pressed={view==='table'} onClick={()=>onViewChange('table')}>Ledger</button></div></div>
    <div className="iw-graph-controls"><span className="iw-graph-focus">{selectedEntity?<><span>Focused on</span> <strong>{selectedEntity.label}</strong></>:<><strong>Filtered overview</strong><span>Choose any entity to inspect its neighborhood.</span></>}</span>{!hideDepthControls&&<div className="iw-graph-depth" aria-label="Neighborhood depth"><button type="button" aria-pressed={depth===1} onClick={()=>onDepthChange(1)}>1 hop</button><button type="button" aria-pressed={depth===2} onClick={()=>onDepthChange(2)}>2 hops</button>{selectedNode&&<button type="button" onClick={()=>onNodeSelect(null)}>Clear focus</button>}</div>}</div>
    <p className="iw-graph-count" role="status"><strong>{slice.entities.length.toLocaleString()} / {slice.totalEntities.toLocaleString()}</strong> entities drawn · <strong>{slice.relationships.length.toLocaleString()} / {slice.totalRelationships.toLocaleString()}</strong> relationships drawn. {slice.truncated?`Preview capped at ${GRAPH_LIMITS.entities} entities and ${GRAPH_LIMITS.relationships} relationships; every matching relationship remains in the ledger.`:'Complete current neighborhood.'} {selectedNode?'':'Preview uses stable IDs, not an influence ranking.'}</p>
    {slice.invalidSelection&&<p className="iw-graph-notice">The selected entity is unavailable under these filters. The overview is shown; clear focus or adjust the filters.</p>}
    {slice.excludedRelationships>0&&<p className="iw-graph-notice">{slice.excludedRelationships.toLocaleString()} relationships are withheld here because an endpoint is unresolved or a source is unavailable.</p>}
    {slice.priorityOutsideFocus>0&&<p className="iw-graph-notice">{slice.priorityOutsideFocus} selected/path relationships are included beyond the neighborhood so the requested trace remains visible.</p>}
    {slice.omittedPriorityIds.length>0&&<p className="iw-graph-notice">{slice.omittedPriorityIds.length} requested relationships are outside the available preview. Open the ledger or adjust filters to inspect them.</p>}
    {view==='graph'?<>
      <div className="iw-graph-tools"><span>Scroll to pan · Tab to explore entities</span><button type="button" onClick={()=>setZoom(Math.max(.2,zoom-.15))} aria-label="Zoom out relationship graph">−</button><output aria-label="Relationship graph zoom">{Math.round(zoom*100)}%</output><button type="button" onClick={()=>setZoom(Math.min(1.6,zoom+.15))} aria-label="Zoom in relationship graph">+</button><button type="button" onClick={fit}>Fit</button><button type="button" onClick={()=>centerPoint(selectedNode)}>Center</button></div>
      <div className="iw-graph-identity-hint" aria-live="polite">{hintedEntity?<><strong>{hintedEntity.label}</strong><span>{hintedEntity.namespace} · {hintedEntity.type}</span></>:<span>Hover or focus an entity to read its identity; select it to follow its connections.</span>}</div>
      <div className="iw-graph-plot" ref={plot} tabIndex={0} role="region" aria-label="Relationship diagram, scroll to pan">
        {slice.entities.length===0?<p className="iw-graph-empty">No resolved entities with matching context. Adjust the geography, evidence or layer filters.</p>:<svg viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width*zoom} height={layout.height*zoom} style={{minWidth:layout.width*zoom,marginLeft:Math.max(0,(viewport.width-layout.width*zoom)/2),marginTop:Math.max(0,(viewport.height-layout.height*zoom)/2)}} role="group" aria-labelledby={`${uid}-diagram-title ${uid}-diagram-desc`}>
          <title id={`${uid}-diagram-title`}>{selectedEntity?`${selectedEntity.label}: ${depth}-hop neighborhood`:'Bounded relationship overview'}</title><desc id={`${uid}-diagram-desc`}>Entities are selectable by keyboard. Directed arrows preserve each source's grammatical relationship; they are not necessarily money flows. Distance, position and adjacency are not evidence of influence or wrongdoing. Every edge is accessible in the ledger.</desc>
          <defs><marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker></defs>
          {slice.relationships.map((edge,index)=><g key={edge.id} className={`iw-graph-edge${selectedEdge===edge.id?' is-selected':''}${highlight.has(edge.id)?' is-path':''}`} data-relationship-id={edge.id} data-from={edge.from} data-to={edge.to} data-traversable={isTraversalRelationship(edge)} onClick={()=>onEdgeSelect(edge.id)}><path d={paths.get(edge.id)} strokeWidth="14" stroke="transparent" fill="none" className="iw-graph-edge-hit"/><path id={`${uid}-edge-${index}`} d={paths.get(edge.id)} strokeDasharray={DASH[edge.tier]} fill="none" markerEnd={relationshipDirected(edge.kind)?`url(#${uid}-arrow)`:undefined}/><title>{nodeById.get(edge.from)?.label} → {nodeById.get(edge.to)?.label}: {edge.label}. {edge.tier}; {investigationRelationshipDate(edge)}. {edge.status}.</title></g>)}
          {slice.entities.map(node=>{
            const position=layout.points.get(node.id)!;const selected=node.id===selectedNode;const displayName=`${node.label}${(duplicateLabels.get(node.label)??0)>1?` · ${node.namespace}`:''}`;
            return <g key={node.id} transform={`translate(${position.x},${position.y})`} role="button" tabIndex={0} aria-pressed={selected} aria-label={`${displayName}, ${node.type}. Select to focus neighborhood.`} className={`iw-graph-node${selected?' is-selected':''}`} data-entity-id={node.id} onClick={()=>onNodeSelect(node.id)} onMouseEnter={()=>setHintNode(node.id)} onMouseLeave={()=>setHintNode(null)} onBlur={()=>setHintNode(null)} onFocus={event=>{setHintNode(node.id);if(event.currentTarget.matches(':focus-visible'))centerPoint(node.id);}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onNodeSelect(node.id);}if(event.key==='Escape')onNodeSelect(null);}}>
              <circle r={Math.max(24,24/zoom)} fill="transparent" className="iw-graph-node-hit"/><circle r="22" className="iw-graph-node-ring"/><path d={shape(node.type)} fill={(node.family && FAMILY_COLORS[node.family]) || COLORS[node.type] || '#99a39d'} stroke="#0c1012" strokeWidth="1.5"/><title>{node.label} · {node.namespace} · {node.type}. {node.identityBasis}</title>
            </g>;
          })}
          {labels.map(label=><g key={`label-${label.id}`} className="iw-graph-packed-label" data-label-for={label.id} data-label-bounds={`${label.x},${label.y},${label.width},${label.height}`} pointerEvents="none"><rect x={label.x} y={label.y} width={label.width} height={label.height} rx={3/zoom}/><text x={label.x+6/zoom} y={label.y+14/zoom} textLength={label.width-12/zoom} lengthAdjust="spacingAndGlyphs" style={{fontSize:12/zoom}}>{label.text}</text></g>)}
        </svg>}
      </div>
      <p className="iw-graph-caption">{`${labels.length} non-overlapping labels shown. Full identities remain in the focus strip and ledger.`} Squares: public bodies; half-circles: people; diamonds: parties; triangles: projects or instruments. Other entity types use circles.</p>
      <div className="iw-graph-legend" aria-label="Relationship evidence legend">{Object.entries(DASH).map(([tier,dash])=><span key={tier}><svg width="26" height="10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dash}/></svg>{tier}</span>)}</div>
      <p className="iw-graph-caption">Arrows describe recorded relationships. Proximity is a layout choice. Analytic comparisons, denials and superseding records do not expand discovery paths. Open a relationship to read its sources, dates, limitations and responses.</p>
      <button type="button" className="iw-graph-open-ledger" onClick={()=>onViewChange('table')}>Inspect all {slice.totalRelationships.toLocaleString()} relationships in the ledger →</button>
    </>:<div className="iw-graph-ledger">
      <div className="iw-graph-ledger-tools"><label htmlFor={`${uid}-search`}>Find in relationship ledger</label><input id={`${uid}-search`} type="search" value={ledgerQuery} onChange={event=>setLedgerQuery(event.target.value)} placeholder="Entity, relationship or source summary"/><button type="button" disabled={!ledger.length} onClick={exportLedger}>Export {ledger.length.toLocaleString()} rows</button></div>
      <div className="iw-graph-table-wrap" role="region" aria-label="Complete matching relationship ledger" tabIndex={0}><table><caption>All {ledger.length.toLocaleString()} matching relationships. Showing {ledger.length?page*40+1:0}–{Math.min((page+1)*40,ledger.length)}. Export includes every matching row and its provenance.</caption><thead><tr><th scope="col">From → to</th><th scope="col">Relationship / status</th><th scope="col">Evidence / dates</th><th scope="col">Sources</th></tr></thead><tbody>{pageEdges.map(edge=><tr key={edge.id} data-relationship-id={edge.id} className={edge.id===selectedEdge?'is-selected':''}><td><button type="button" onClick={()=>onNodeSelect(edge.from)}>{nodeById.get(edge.from)?.label??edge.from}</button><span className="iw-graph-direction">{relationshipDirected(edge.kind)?'→':'↔'}</span><button type="button" onClick={()=>onNodeSelect(edge.to)}>{nodeById.get(edge.to)?.label??edge.to}</button></td><td><button type="button" className="iw-graph-relationship-button" onClick={()=>onEdgeSelect(edge.id)}>{edge.label||edge.kind}</button><small>{edge.status}{edge.statusAsOf?` · as of ${edge.statusAsOf}`:''}</small>{edge.responseIds.length>0&&<small>{edge.responseIds.length} linked response / counter-evidence records</small>}</td><td><span className="iw-graph-tier">{edge.tier}</span><small>{investigationRelationshipDate(edge)}</small><small>{edge.dateBasis}</small></td><td>{edge.sourceIds.map(id=>{const source=sourceById.get(id);return source?<div className="iw-graph-source" key={id}>{onSourceSelect?<button type="button" onClick={()=>onSourceSelect(id)}>{source.title}</button>:<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a>}<small>{source.publishedAt??'Publication date unknown'} · {source.locator||'Locator not specified'}</small></div>:<span key={id}>Source unavailable: {id}</span>;})}</td></tr>)}</tbody></table>{!ledger.length&&<p className="iw-graph-empty">No matching relationships in this neighborhood.</p>}</div>
      <nav className="iw-graph-pagination" aria-label="Relationship ledger pages"><button type="button" disabled={page===0} onClick={()=>changePage(page-1)}>Previous</button><span>Page {page+1} of {Math.max(1,Math.ceil(ledger.length/40))}</span><button type="button" disabled={(page+1)*40>=ledger.length} onClick={()=>changePage(page+1)}>Next</button></nav>
    </div>}
  </section>;
}
export default InvestigationGraph;
