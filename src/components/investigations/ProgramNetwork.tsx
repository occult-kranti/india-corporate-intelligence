import { useMemo } from 'react';
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import type { ProgramConnection, ProgramEntity } from '../../data/researchProgramSchema';

interface Node extends SimulationNodeDatum { id: string; entity: ProgramEntity }
const colors = { documented: '#81c8b3', alleged: '#e6bc7b', hypothesis: '#b3a3d4' };

export default function ProgramNetwork({ entities, connections, selected, onSelect }: { entities: ProgramEntity[]; connections: ProgramConnection[]; selected: string; onSelect: (id: string) => void }) {
  const drawing = useMemo(() => {
    const ids = new Set(connections.flatMap(edge => [edge.from, edge.to]));
    const nodes: Node[] = entities.filter(entity => ids.has(entity.id)).map((entity, i) => ({ id: entity.id, entity, x: 450 + Math.cos(i * 2.4) * 230, y: 270 + Math.sin(i * 2.4) * 170 }));
    const links = connections.map(edge => ({ source: edge.from, target: edge.to, edge }));
    const simulation = forceSimulation(nodes).force('link', forceLink<Node, typeof links[number]>(links).id(node => node.id).distance(150))
      .force('charge', forceManyBody().strength(-450)).force('collide', forceCollide(55)).force('x', forceX(450).strength(.07)).force('y', forceY(270).strength(.1)).stop();
    simulation.tick(160);
    nodes.forEach(node => { node.x = Math.max(95, Math.min(805, node.x!)); node.y = Math.max(50, Math.min(490, node.y!)); });
    return { nodes, links: links as unknown as { source: Node; target: Node; edge: ProgramConnection }[] };
  }, [entities, connections]);
  if (!connections.length) return <div className="rp-empty">No recorded relations match these filters. Try a broader scope.</div>;
  return <div className="rp-drawing" role="region" aria-label="Recorded relation drawing" tabIndex={0}>
    <svg viewBox="0 0 900 540" role="img" aria-label={`${drawing.nodes.length} entities and ${connections.length} recorded relations. Select a relation in the ledger below for its evidence.`}>
      <defs>{Object.entries(colors).map(([status, color]) => <marker key={status} id={`rp-arrow-${status}`} viewBox="0 0 10 10" refX="17" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={color} /></marker>)}</defs>
      {drawing.links.map(({ source, target, edge }) => <g key={edge.id} className={selected === edge.id ? 'rp-edge selected' : 'rp-edge'}>
        <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={colors[edge.status]} strokeWidth={selected === edge.id ? 3 : 1.5} strokeDasharray={edge.status === 'hypothesis' ? '3 5' : edge.status === 'alleged' ? '9 5' : undefined} markerEnd={`url(#rp-arrow-${edge.status})`} />
        <line className="rp-edge-target" x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="transparent" strokeWidth="16" onClick={() => onSelect(edge.id)}><title>{edge.label} · {edge.status}</title></line>
      </g>)}
      {drawing.nodes.map(node => <g key={node.id} transform={`translate(${node.x},${node.y})`}><circle r="8" fill="#81c8b3" stroke="#102b2b" strokeWidth="3" /><text y="23" textAnchor="middle">{node.entity.name.length > 27 ? `${node.entity.name.slice(0, 25)}…` : node.entity.name}</text><title>{node.entity.name} · {node.id}</title></g>)}
    </svg>
    <p>Layout is for navigation. Position, size and proximity carry no evidentiary weight. Arrows retain the recorded relation’s direction.</p>
  </div>;
}
