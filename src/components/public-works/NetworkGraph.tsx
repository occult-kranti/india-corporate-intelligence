import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { PublicWorksEntity, PublicWorksRelationship, PublicWorksSource } from '../../data/publicWorks';
import { TIERS } from '../../graph/schema';
import { publicWorksNeighbourhood, publicWorksNetworkCsv, relationshipDate, relationshipIsDirected } from './network';
import './network.css';

export interface NetworkGraphProps {
  nodes: PublicWorksEntity[];
  edges: PublicWorksRelationship[];
  sources: PublicWorksSource[];
  selectedId?: string;
  onSelect: (id: string) => void;
  hops: 1 | 2;
  onHopsChange: (hops: 1 | 2) => void;
  view?: 'graph' | 'table';
  onViewChange?: (view: 'graph' | 'table') => void;
  selectedEdgeId?: string;
  onEdgeSelect?: (id: string) => void;
}

const color: Record<PublicWorksEntity['type'], string> = {
  authority: '#5a8ec4', company: '#c9a86c', group: '#c9a86c', person: '#5a8ec4', party: '#8b7ec4', project: '#5aa89e', institution: '#5a8ec4', law: '#5aa89e',
};
const glyph: Record<PublicWorksEntity['type'], string> = { authority: '▢', institution: '▢', company: '◯', group: '◯', person: '⌒', party: '◇', project: '△', law: '△' };
const shape = (type: PublicWorksEntity['type']) => {
  if (type === 'authority' || type === 'institution') return 'M-14,-14h28v28h-28z';
  if (type === 'party') return 'M0,-18 18,0 0,18 -18,0Z';
  if (type === 'law' || type === 'project') return 'M0,-18 17,13 -17,13Z';
  if (type === 'person') return 'M-16,13a16,16 0 1 1 32,0z';
  return 'M-15,0a15,15 0 1 0 30,0a15,15 0 1 0 -30,0';
};

interface Positioned extends SimulationNodeDatum { id: string }
function positions(nodes: PublicWorksEntity[], edges: PublicWorksRelationship[]) {
  const points: Positioned[] = [...nodes].sort((a,b) => a.id.localeCompare(b.id)).map(node => ({ id: node.id }));
  const links = [...edges].sort((a,b) => a.id.localeCompare(b.id)).filter(edge => edge.from !== edge.to).map(edge => ({ source: edge.from, target: edge.to }));
  const simulation = forceSimulation(points).stop().force('links', forceLink<Positioned, { source: string; target: string }>(links).id(node => node.id).distance(170))
    .force('charge', forceManyBody().strength(-800)).force('collide', forceCollide(76)).force('x', forceX(0).strength(.06)).force('y', forceY(0).strength(.10));
  simulation.tick(180); simulation.stop();
  const maxX = Math.max(120, ...points.map(point => Math.abs(point.x ?? 0)));
  const maxY = Math.max(100, ...points.map(point => Math.abs(point.y ?? 0)));
  const width = Math.max(960, Math.ceil(Math.sqrt(points.length)*230));
  const height = Math.max(500, Math.ceil(Math.sqrt(points.length)*160));
  return { width, height, points: new Map(points.map(point => [point.id, { x: width/2 + (point.x ?? 0) / maxX * (width/2-110), y: height/2 + (point.y ?? 0) / maxY * (height/2-75) }])) };
}

export default function NetworkGraph({ nodes, edges, sources, selectedId = '', onSelect, hops, onHopsChange, view: controlledView, onViewChange, selectedEdgeId, onEdgeSelect }: NetworkGraphProps) {
  const uid = useId().replace(/:/gu, '');
  const plotRef = useRef<HTMLDivElement>(null);
  const [localView, setLocalView] = useState<'graph' | 'table'>('graph');
  const [localEdgeId, setLocalEdgeId] = useState('');
  const view = controlledView ?? localView;
  const setView = onViewChange ?? setLocalView;
  const edgeId = selectedEdgeId ?? localEdgeId;
  const setEdgeId = onEdgeSelect ?? setLocalEdgeId;
  const graph = useMemo(() => publicWorksNeighbourhood(nodes, edges, selectedId, hops), [nodes, edges, selectedId, hops]);
  const nodeById = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
  const sourceById = useMemo(() => new Map(sources.map(source => [source.id, source])), [sources]);
  const layout = useMemo(() => positions(graph.nodes, graph.edges), [graph.nodes, graph.edges]);
  const locations = layout.points;
  useLayoutEffect(() => {
    const plot = plotRef.current;
    const point = locations.get(selectedId);
    if (!plot || !point || view !== 'graph') return;
    const scale = (plot.querySelector('svg')?.getBoundingClientRect().width ?? layout.width) / layout.width;
    plot.scrollLeft = Math.max(0, point.x * scale - plot.clientWidth/2);
    plot.scrollTop = Math.max(0, point.y * scale - plot.clientHeight/2);
  }, [selectedId, locations, layout.width, view]);
  const labelLimit = graph.nodes.length > 20 ? 24 : 33;
  const paths = useMemo(() => {
    const groups = new Map<string, PublicWorksRelationship[]>();
    for (const edge of [...graph.edges].sort((a,b) => a.id.localeCompare(b.id))) {
      const key = [edge.from, edge.to].sort().join('\u0000');
      groups.set(key, [...groups.get(key) ?? [], edge]);
    }
    return new Map([...groups.values()].flatMap(group => group.map((edge,index) => {
      const start = locations.get(edge.from)!; const end = locations.get(edge.to)!;
      if (edge.from === edge.to) return [edge.id, `M${start.x-12},${start.y-12} C${start.x-70-index*15},${start.y-90-index*15} ${start.x+70+index*15},${start.y-90-index*15} ${start.x+12},${start.y-12}`];
      const distance = Math.hypot(end.x-start.x,end.y-start.y) || 1;
      const offset = (index-(group.length-1)/2)*45;
      const sign = edge.from < edge.to ? 1 : -1;
      const cx = (start.x+end.x)/2 - (end.y-start.y)/distance*offset*sign;
      const cy = (start.y+end.y)/2 + (end.x-start.x)/distance*offset*sign;
      const tail = Math.hypot(cx-start.x,cy-start.y) || 1;
      const head = Math.hypot(end.x-cx,end.y-cy) || 1;
      return [edge.id, `M${start.x+(cx-start.x)/tail*19},${start.y+(cy-start.y)/tail*19} Q${cx},${cy} ${end.x-(end.x-cx)/head*21},${end.y-(end.y-cy)/head*21}`];
    })));
  }, [graph.edges, locations]);
  const focusedNode = graph.nodes.find(node => node.id === selectedId);
  const focusedEdge = graph.edges.find(edge => edge.id === edgeId);
  const types = [...new Set(graph.nodes.map(node => node.type))].sort();
  const tiers = [...new Set(graph.edges.map(edge => edge.tier))];
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', publicWorksNetworkCsv(graph.nodes, graph.edges, sources)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'public-works-relationships.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const references = (ids: string[]) => <ul className="pw-network-sources">{ids.map(id => { const source = sourceById.get(id); return source ? <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a><span>Published {source.publishedAt ?? 'date not established'} · {source.tier} · {source.locator}</span></li> : <li key={id}>Source unavailable: {id}</li>; })}</ul>;
  const edgeDetail = (edge: PublicWorksRelationship) => <><p className="pw-network-meta">{TIERS[edge.tier].label} · {edge.kind} · {relationshipDate(edge)}</p><p>{edge.summary}</p>{edge.limitations.length > 0 && <ul className="pw-network-limitations">{edge.limitations.map(text => <li key={text}>{text}</li>)}</ul>}{references(edge.sourceIds)}</>;

  return <div className="pw-network" data-public-works-network="">
    <div className="pw-network-controls">
      <label htmlFor={`${uid}-focus`}><span id={`${uid}-focus-label`}>Focus an entity</span><select id={`${uid}-focus`} aria-labelledby={`${uid}-focus-label`} value={graph.invalidSelection ? '' : selectedId} onChange={event => { setEdgeId(''); onSelect(event.target.value); }}><option value="">All recorded entities</option>{nodes.filter(node => node.resolved).map(node => <option value={node.id} key={node.id}>{node.label}</option>)}</select></label>
      <fieldset><legend>Neighbourhood depth</legend>{([1,2] as const).map(depth => <button key={depth} type="button" aria-pressed={hops === depth} onClick={() => onHopsChange(depth)}>{depth} {depth === 1 ? 'step' : 'steps'}</button>)}</fieldset>
      <fieldset><legend>View</legend><button type="button" aria-pressed={view === 'graph'} onClick={() => setView('graph')}>Network</button><button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>Relationship table</button></fieldset>
      <button className="pw-network-export" type="button" onClick={exportCsv} disabled={!graph.edges.length}>Export relationships</button>
    </div>
    <p className="pw-network-count" role="status">{graph.nodes.length} entities · {graph.edges.length} relationships{focusedNode ? ` · ${hops}-step neighbourhood of ${focusedNode.label}` : ' · filtered evidence register'}</p>
    {graph.invalidSelection && <p className="pw-network-notice">The entity in this link is outside the current filters or has no resolved identity. Showing the available filtered network. <button type="button" onClick={() => onSelect('')}>Clear unavailable focus</button></p>}
    {edgeId && !focusedEdge && <p className="pw-network-notice">The relationship in this link is outside the current neighbourhood or filters. <button type="button" onClick={() => setEdgeId('')}>Clear unavailable relationship</button></p>}
    <p className="pw-network-caption">Follow a recorded relationship to its source. Arrows show the stated relationship direction; they do not all represent money. Distance, placement and short paths carry no implication of influence or wrongdoing. One or two steps include both incoming and outgoing neighbours.</p>
    {!graph.nodes.length ? <div className="pw-network-empty">No verified relationship endpoints match this view. A missing link is an evidence gap, not evidence that no relationship exists.</div> : <>
      {view === 'graph' && <>
        <div className="pw-network-legend" aria-label="Network legend">{types.map(type => <span key={type}><b style={{ color: color[type] }} aria-hidden="true">{glyph[type]}</b> {type}</span>)}{tiers.map(tier => <span key={tier}><svg width="30" height="12" aria-hidden="true"><line x1="0" x2="30" y1="6" y2="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray={TIERS[tier].dash}/></svg>{TIERS[tier].label}</span>)}</div>
        <p className="pw-network-keyboard" id={`${uid}-help`}>Select a node to focus its neighbourhood. Tab reaches each entity; Enter or Space selects it. The relationship table provides all sources and dates. Long labels are shortened; selecting an entity reveals its full identity. Larger networks scroll in both directions; the focus picker narrows them without dropping records.</p>
        <div ref={plotRef} className="pw-network-plot" tabIndex={0} role="region" aria-label="Scrollable relationship network" aria-describedby={`${uid}-help`}>
          <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{minWidth:layout.width}} className="pw-network-svg" role="group" aria-labelledby={`${uid}-diagram-title`} aria-describedby={`${uid}-diagram-desc`}>
            <title id={`${uid}-diagram-title`}>Public works relationship diagram</title><desc id={`${uid}-diagram-desc`}>{graph.nodes.length} resolved entities and {graph.edges.length} source-backed relationships. Entity shape and colour encode type. Line dashes encode evidence tier. Placement carries no analytical meaning. Use the relationship table for complete text and sources.</desc>
            <defs><marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10Z" fill="#bbb8b0"/></marker></defs>
            {graph.edges.map(edge => <g key={edge.id} className={edge.id === edgeId ? 'pw-network-edge is-selected' : 'pw-network-edge'}><title>{nodeById.get(edge.from)?.label} · {edge.label} · {nodeById.get(edge.to)?.label} · {edge.tier} · {relationshipDate(edge)}</title><path d={paths.get(edge.id)} fill="none" stroke={edge.kind === 'response' ? '#e1a5a4' : '#bbb8b0'} strokeWidth={edge.kind === 'response' ? 2.5 : 1.5} strokeDasharray={TIERS[edge.tier].dash} markerEnd={relationshipIsDirected(edge.kind) ? `url(#${uid}-arrow)` : undefined}/><path d={paths.get(edge.id)} fill="none" stroke="transparent" strokeWidth="16" onClick={() => setEdgeId(edge.id)} className="pw-network-edge-target"/></g>)}
            {graph.nodes.map(node => { const point = locations.get(node.id)!; return <g key={node.id} data-network-node={node.id} transform={`translate(${point.x} ${point.y})`} role="button" tabIndex={0} aria-pressed={node.id === selectedId} aria-label={`${node.label}, ${node.type}. Focus neighbourhood.`} onClick={() => { setEdgeId(''); onSelect(node.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setEdgeId(''); onSelect(node.id); } }} className="pw-network-node"><circle r="28" fill="transparent"/><circle className="pw-network-focus-ring" r="23" fill="none" stroke={color[node.type]} strokeWidth="2"/><path d={shape(node.type)} fill={color[node.type]} stroke="#171819" strokeWidth="2"/><text y="38" textAnchor="middle" fill="#e8e4dc" fontSize="12">{node.label.length > labelLimit ? `${node.label.slice(0,labelLimit-1)}…` : node.label}</text><title>{node.label}</title></g>; })}
          </svg>
        </div>
      </>}
      {focusedNode && <div className="pw-network-inspector"><div><h3>{focusedNode.label}</h3><button type="button" onClick={() => onSelect('')}>Show all filtered entities</button></div><p className="pw-network-meta">{focusedNode.type} · Identity resolved from the cited record</p><p>{focusedNode.identityBasis}</p>{references(focusedNode.sourceIds)}</div>}
      {focusedEdge && view === 'graph' && <div className="pw-network-inspector"><h3>{focusedEdge.label}</h3>{edgeDetail(focusedEdge)}</div>}
      {view === 'table' && <div className="pw-network-table-wrap" tabIndex={0} role="region" aria-label="Scrollable relationship table"><table><caption>Every relationship in the current network, with its evidence and time limits</caption><thead><tr><th scope="col">From → to</th><th scope="col">Recorded relationship</th><th scope="col">Evidence and sources</th></tr></thead><tbody>{graph.edges.map(edge => <tr key={edge.id}><td><button type="button" onClick={() => onSelect(edge.from)}>{nodeById.get(edge.from)?.label}</button><span className="pw-network-direction" aria-label={relationshipIsDirected(edge.kind) ? 'to' : 'and'}>{relationshipIsDirected(edge.kind) ? '↓' : '↔'}</span><button type="button" onClick={() => onSelect(edge.to)}>{nodeById.get(edge.to)?.label}</button></td><td><strong>{edge.label}</strong><p>{edge.kind}</p></td><td>{edgeDetail(edge)}</td></tr>)}</tbody></table>{!graph.edges.length && <p>No sourced relationships connect the selected endpoints.</p>}</div>}
    </>}
  </div>;
}
