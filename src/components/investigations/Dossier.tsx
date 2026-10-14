import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, FileText } from 'lucide-react';
import { type InvestigationCase } from '../../data/investigations';
import { ShareButton, StatusBadge, sourceById } from './shared';

export default function Dossier({ record, onEntity }: { record?: InvestigationCase; onEntity: (entity: string) => void }) {
  if (!record) return <section id="inv-dossier" className="inv-dossier-empty"><FileText size={28} strokeWidth={1.2} aria-hidden="true" /><div><h2>Open a dossier to examine its evidence.</h2><p>Select a case in the map or ledger. Its source record, response, limitations and next test appear together here.</p></div></section>;
  return <section className="inv-dossier" id="inv-dossier" aria-labelledby="inv-dossier-title">
    <header><div><span className="inv-kicker">The dossier / {record.sector}</span><h2 id="inv-dossier-title">{record.title}</h2><StatusBadge status={record.status} /></div><ShareButton path={`/investigations?case=${encodeURIComponent(record.id)}`} /></header>
    <p className="inv-dossier-summary">{record.summary}</p>
    <div className="inv-evidence-pair"><section><span className="inv-kicker">01 / What the record supports</span><h3>Finding & attribution</h3><p>{record.finding}</p></section><section><span className="inv-kicker">02 / What must also be read</span><h3>Response & limitations</h3>{record.response && <p><strong>Official or published response.</strong> {record.response}</p>}<p className={record.response ? 'inv-response-limit' : ''}>{record.limitation}</p></section></div>
    <div className="inv-subjects"><span className="inv-control-label">Public subjects in this dossier</span><div>{record.entities.map(entity => <button className="inv-tag" key={entity} onClick={() => onEntity(entity)}>{entity}</button>)}</div><p>These labels identify the subject of the records; they do not establish a relationship between subjects.</p></div>
    <section className="inv-source-ledger" aria-label="Dossier source ledger"><div className="inv-section-heading"><h3>Read the source trail</h3><span>{record.sources.length} cited records</span></div><ol>{record.sources.map((id, index) => {
      const source = sourceById.get(id);
      if (!source) return <li key={id}><span className="inv-source-index">{String(index + 1).padStart(2, '0')}</span><p>Source {id} is unavailable in this release. This citation cannot currently be verified here.</p></li>;
      return <li key={id}><span className="inv-source-index">{String(index + 1).padStart(2, '0')}</span><div><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <ArrowUpRight size={15} aria-hidden="true" /></a><p className="inv-source-meta">{source.publisher} · {source.date || 'Publication date not established'}{source.accessedAt ? ` · Reviewed ${source.accessedAt}` : ''}</p><p>{source.supports}</p><p className="inv-source-access"><strong>Access depth:</strong> {source.access}{source.caution ? ` · ${source.caution}` : ''}</p></div></li>;
    })}</ol></section>
    {record.hypotheses.length > 0 && <Link className="inv-dossier-next" to={`/leads?case=${encodeURIComponent(record.id)}`}><div><span className="inv-kicker">Continue the investigation</span><strong>{record.hypotheses.length} testable {record.hypotheses.length === 1 ? 'question' : 'questions'} remain in this dossier</strong></div><ArrowRight size={20} aria-hidden="true" /></Link>}
  </section>;
}
