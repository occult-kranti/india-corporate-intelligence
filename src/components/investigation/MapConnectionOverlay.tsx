import { useId, useMemo, useState } from 'react';
import type { InvestigationRegistry } from '../../data/investigation';
import type { MapEvidenceScene, MapEvidenceSelection } from '../../data/mapEvidence';
import './MapConnectionOverlay.css';

interface Props {
  registry: InvestigationRegistry;
  scene: MapEvidenceScene;
  selection: MapEvidenceSelection | null;
  onSelect: (selection: MapEvidenceSelection) => void;
  collapsedByDefault?: boolean;
}

/** A relational diagram intentionally separated from the map's coordinates. */
export function MapConnectionOverlay({ registry, scene, selection, onSelect, collapsedByDefault }: Props) {
  const uid = useId().replace(/:/gu, '');
  const [collapsed, setCollapsed] = useState(() => collapsedByDefault ?? window.matchMedia('(max-width: 767px)').matches);
  const [query, setQuery] = useState('');
  const [showList, setShowList] = useState(false);
  const entities = useMemo(() => new Map(registry.entities.map(entity => [entity.id, entity])), [registry.entities]);
  const network = useMemo(() => {
    const degree = new Map<string, number>();
    scene.trails.forEach(edge => [edge.fromEntityId, edge.toEntityId].forEach(id => degree.set(id, (degree.get(id) ?? 0) + 1)));
    const root = scene.selectedEntityId ?? [...degree].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    const ordered = [...scene.trails].sort((a, b) => {
      const score = (edge: typeof a) => (selection?.kind === 'relationship' && selection.id === edge.id ? 4 : 0) + (edge.fromEntityId === root || edge.toEntityId === root ? 1 : 0);
      return score(b) - score(a) || a.id.localeCompare(b.id);
    });
    const ids = new Set<string>(root ? [root] : []), edges = [];
    for (const edge of ordered) {
      const next = new Set([...ids, edge.fromEntityId, edge.toEntityId]);
      if (next.size > 12 || edges.length >= 18) continue;
      next.forEach(id => ids.add(id)); edges.push(edge);
    }
    const others = [...ids].filter(id => id !== root);
    const positions = new Map<string, { x: number; y: number }>();
    if (root) positions.set(root, { x: 160, y: 82 });
    others.forEach((id, index) => { const angle = index / Math.max(others.length, 1) * Math.PI * 2 - Math.PI / 2; positions.set(id, { x: 160 + Math.cos(angle) * 120, y: 82 + Math.sin(angle) * 60 }); });
    return { root, ids: [...ids], edges, positions, totalNodes: new Set([...degree.keys(), ...(root ? [root] : [])]).size };
  }, [scene, selection]);
  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
    return scene.trails.filter(edge => terms.every(term => `${edge.label} ${entities.get(edge.fromEntityId)?.label} ${entities.get(edge.toEntityId)?.label} ${edge.id}`.toLowerCase().includes(term)));
  }, [scene.trails, query, entities]);
  if (!selection) return null;
  const label = (id: string) => entities.get(id)?.label ?? id;
  const selected = (id: string) => selection.kind === 'entity' && selection.id === id;
  return <section className={`map-connection-overlay${collapsed ? ' is-collapsed' : ''}`} aria-label="Schematic relationship overlay" data-overlay-node-count={network.ids.length} data-overlay-edge-count={network.edges.length} data-overlay-total-edges={scene.trails.length}>
    <header><div><strong>Relationship overlay</strong><span>Schematic · not locations</span></div><button type="button" aria-expanded={!collapsed} aria-controls={`${uid}-network`} onClick={() => setCollapsed(value => !value)}>{collapsed ? 'Show' : 'Hide'}</button></header>
    {!collapsed && <div id={`${uid}-network`}>
      {network.edges.length > 0 ? <svg viewBox="0 0 320 165" role="group" aria-label="Selected identities and recorded connections"><defs><marker id={`${uid}-arrow`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#c6a465" /></marker></defs>
        {network.edges.map(edge => { const from = network.positions.get(edge.fromEntityId)!, to = network.positions.get(edge.toEntityId)!; const dx = to.x - from.x, dy = to.y - from.y, length = Math.hypot(dx, dy) || 1; const path = edge.fromEntityId === edge.toEntityId ? `M${from.x},${from.y - 7} C${from.x - 25},${from.y - 42} ${from.x + 25},${from.y - 42} ${from.x + 7},${from.y - 5}` : `M${from.x + dx / length * 10},${from.y + dy / length * 10} L${to.x - dx / length * 11},${to.y - dy / length * 11}`; return <g key={edge.id} className={`map-overlay-edge${selection.kind === 'relationship' && selection.id === edge.id ? ' is-selected' : ''}${selection.kind === 'entity' && (selection.id === edge.fromEntityId || selection.id === edge.toEntityId) ? ' is-incident' : ''}`} role="button" tabIndex={0} data-overlay-edge-id={edge.id} aria-label={`${label(edge.fromEntityId)} ${edge.direction === 'directed' ? 'to' : 'and'} ${label(edge.toEntityId)}: ${edge.label}`} onClick={() => onSelect({kind:'relationship',id:edge.id})} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect({kind:'relationship',id:edge.id}); } }}><path d={path} className="map-overlay-edge-hit"/><path d={path} className="map-overlay-edge-line" markerEnd={edge.direction === 'directed' ? `url(#${uid}-arrow)` : undefined}/><title>{edge.label} · {edge.tier} · {edge.status}</title></g>; })}
        {network.ids.map(id => { const position = network.positions.get(id)!; const name = label(id); const short = name.length > 22 ? `${name.slice(0, 20)}…` : name; return <g key={id} transform={`translate(${position.x},${position.y})`} className={`map-overlay-node${selected(id) ? ' is-selected' : ''}`} role="button" tabIndex={0} data-overlay-entity-id={id} aria-label={`Inspect ${name}`} onClick={() => onSelect({kind:'entity',id})} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect({kind:'entity',id}); } }}><circle r={id === network.root ? 10 : 7}/><text y={position.y > 95 ? 17 : -12} textAnchor={position.x < 65 ? 'start' : position.x > 255 ? 'end' : 'middle'}>{short}</text><title>{name} · {entities.get(id)?.type ?? 'identity'}</title></g>; })}
      </svg> : <p className="map-overlay-empty">No source-backed connections match this selection and its current filters.</p>}
      <footer><span>{network.ids.length}/{network.totalNodes} identities · {network.edges.length}/{scene.trails.length} connections shown</span><button type="button" aria-expanded={showList} onClick={() => setShowList(value => !value)}>{showList ? 'Close list' : 'All connections'}</button></footer>
      {showList && <div className="map-overlay-list"><label>Search all {scene.trails.length.toLocaleString()} connections<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label><p>{filtered.length.toLocaleString()} matching connections · complete searchable list</p><ul>{filtered.map(edge => <li key={edge.id}><button type="button" onClick={() => onSelect({kind:'relationship',id:edge.id})}><strong>{label(edge.fromEntityId)} {edge.direction === 'directed' ? '→' : '↔'} {label(edge.toEntityId)}</strong><span>{edge.label} · {edge.tier}</span></button></li>)}</ul></div>}
    </div>}
  </section>;
}
export default MapConnectionOverlay;
