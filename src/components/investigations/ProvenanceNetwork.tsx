import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { INVESTIGATION_STATUS_LABELS, type InvestigationCase } from '../../data/investigations';
import { sourceById } from './shared';

const PAGE_SIZE = 5;
export default function ProvenanceNetwork({ cases, selectedId, page, onPage, onSelect, onEntity }: { cases: InvestigationCase[]; selectedId: string; page: number; onPage: (page: number) => void; onSelect: (id: string) => void; onEntity: (entity: string) => void }) {
  const pages = Math.max(1, Math.ceil(cases.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(0, page), pages - 1);
  const shown = cases.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const subjects = [...new Set(shown.flatMap(record => record.entities))];
  const sources = [...new Set(shown.flatMap(record => record.sources))].map(id => sourceById.get(id)).filter((source): source is NonNullable<typeof source> => Boolean(source));
  const height = Math.max(500, subjects.length * 74 + 80, shown.length * 110 + 80, sources.length * 78 + 80);
  const y = (index: number, count: number) => 54 + (height - 112) * (index + .5) / Math.max(1, count);
  const selected = shown.find(record => record.id === selectedId);

  return <section className="inv-network" aria-labelledby="inv-network-title">
    <div className="inv-network-heading"><div><h2 id="inv-network-title">Follow the record.</h2><p>Subjects are named in dossiers. Dossiers cite sources. Lines do not establish culpability.</p></div><span className="inv-kicker">Provenance map</span></div>
    <div className="inv-network-legend"><span><i className="inv-line" /> Subject of dossier / cited by dossier</span><span><i className="inv-line inv-line--active" /> Selected dossier’s records</span><button disabled={!selectedId} onClick={() => document.getElementById('inv-dossier')?.scrollIntoView({ behavior: 'auto', block: 'start' })}><ArrowDown size={13} aria-hidden="true" /> Read selected dossier</button></div>
    <p className="inv-map-hint">Scroll the map to explore all three columns. The source ledger shows the same dossiers in a table.</p>
    <div className="inv-graph-scroll" tabIndex={0} role="region" aria-label="Scrollable provenance map. Tab to subjects, dossiers and sources; press Enter to open. Use arrow keys to scroll.">
      <div className="inv-graph-board" style={{ height }}>
        <div className="inv-lane-label" style={{ left: 24 }}>01 / Public subjects</div><div className="inv-lane-label" style={{ left: 340 }}>02 / Case dossiers</div><div className="inv-lane-label" style={{ left: 710 }}>03 / Cited sources</div>
        <svg className="inv-graph-lines" width="1000" height={height} aria-hidden="true">
          {shown.flatMap((record, caseIndex) => {
            const cy = y(caseIndex, shown.length);
            const isSelected = record.id === selectedId;
            return [
              ...record.entities.map(entity => <path key={`${record.id}:entity:${entity}`} d={`M 248 ${y(subjects.indexOf(entity), subjects.length)} C 292 ${y(subjects.indexOf(entity), subjects.length)}, 300 ${cy}, 340 ${cy}`} className={isSelected ? 'is-selected' : ''} />),
              ...record.sources.map(id => { const index = sources.findIndex(source => source.id === id); return index < 0 ? null : <path key={`${record.id}:source:${id}`} d={`M 636 ${cy} C 674 ${cy}, 672 ${y(index, sources.length)}, 710 ${y(index, sources.length)}`} className={isSelected ? 'is-selected' : ''} />; }),
            ];
          })}
        </svg>
        {subjects.map((entity, index) => <button key={entity} className={`inv-node inv-node--subject ${selected?.entities.includes(entity) ? 'is-connected' : ''}`} style={{ left: 24, top: y(index, subjects.length) }} onClick={() => onEntity(entity)} title={`Filter dossiers mentioning ${entity}`}><span>{entity}</span><small>Subject of record</small></button>)}
        {shown.map((record, index) => <button key={record.id} className={`inv-node inv-node--case inv-node--${record.status} ${record.id === selectedId ? 'is-selected' : ''}`} style={{ left: 340, top: y(index, shown.length) }} onClick={() => onSelect(record.id)} aria-pressed={record.id === selectedId} aria-label={`Open dossier: ${record.title}. ${INVESTIGATION_STATUS_LABELS[record.status]}`}><small>{INVESTIGATION_STATUS_LABELS[record.status]}</small><strong>{record.title}</strong></button>)}
        {sources.map((source, index) => <a key={source.id} className={`inv-node inv-node--source ${selected?.sources.includes(source.id) ? 'is-connected' : ''}`} style={{ left: 710, top: y(index, sources.length) }} href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.title}, ${source.publisher}; opens in new tab`} title={`${source.title} · ${source.date || 'Publication date not established'} · ${source.access}`}><small>{source.publisher} <ArrowUpRight size={12} aria-hidden="true" /></small><span>{source.title}</span></a>)}
      </div>
    </div>
    <div className="inv-network-footer"><p><strong>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, cases.length)}</strong> of {cases.length} filtered dossiers · {subjects.length} subjects · {sources.length} cited sources in this map</p><div className="inv-actions"><button className="inv-button" disabled={currentPage === 0} onClick={() => onPage(currentPage - 1)} aria-label="Previous map page"><ArrowLeft size={16} aria-hidden="true" /></button><span className="inv-page-count">{currentPage + 1} / {pages}</span><button className="inv-button" disabled={currentPage + 1 >= pages} onClick={() => onPage(currentPage + 1)} aria-label="Next map page"><ArrowRight size={16} aria-hidden="true" /></button></div></div>
  </section>;
}
