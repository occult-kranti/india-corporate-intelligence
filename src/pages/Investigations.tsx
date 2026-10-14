import { useState } from 'react';
import { ArrowUpRight, List, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import { INVESTIGATION_CASES, INVESTIGATION_DATE } from '../data/investigations';
import ProvenanceNetwork from '../components/investigations/ProvenanceNetwork';
import Dossier from '../components/investigations/Dossier';
import { EmptyState, ExportButtons, FilterBar, InvestigationNav, LegacyLinks, ShareButton, StatusBadge, sourceById, useInvestigationFilters } from '../components/investigations/shared';
import '../investigations.css';

export default function Investigations() {
  const filters = useInvestigationFilters();
  const [view, setView] = useState<'network' | 'ledger'>('network');
  const selected = filters.filtered.find(record => record.id === filters.selectedId);
  const pageNumber = Number(filters.params.get('page') || 0);
  const page = Number.isFinite(pageNumber) ? Math.max(0, Math.floor(pageNumber)) : 0;
  const sourceCount = new Set(filters.filtered.flatMap(record => record.sources)).size;
  const openCase = (id: string) => filters.setParam('case', id);
  const openFromLedger = (id: string) => { openCase(id); window.setTimeout(() => document.getElementById('inv-dossier')?.scrollIntoView({ behavior: 'auto', block: 'start' }), 0); };
  const initialPage = selected && !filters.params.has('page') ? Math.floor(filters.filtered.indexOf(selected) / 5) : page;

  return <article className="inv-page">
    <InvestigationNav active="network" />
    <header className="inv-hero"><div className="inv-hero-copy"><span className="inv-kicker">Public power / money / accountability</span><h1>The investigation<br /> <em>network.</em></h1><p>Follow public money through the records. Examine what is documented, who disputes it, and the questions the evidence still leaves open.</p><Link className="inv-text-link" to="/leads">Explore unresolved leads <ArrowUpRight size={17} aria-hidden="true" /></Link></div><aside className="inv-hero-note"><span className="inv-kicker">The standard of proof</span><strong>A connection is a question.<br /> The record is the test.</strong><p>An allegation is attributed, not proven. Game theory proposes explanations; independent evidence must distinguish them from alternatives.</p><Link to="/game-theory">Inside the game theory lab <ArrowUpRight size={14} aria-hidden="true" /></Link></aside></header>
    <section className="inv-metrics" aria-label="Scope of this view"><div><strong>{filters.filtered.length}<span> / {INVESTIGATION_CASES.length}</span></strong><span>Dossiers in this view</span></div><div><strong>{sourceCount}</strong><span>Distinct cited sources</span></div><div><strong>{filters.filtered.reduce((sum, record) => sum + record.hypotheses.length, 0)}</strong><span>Questions to test</span></div><div className="inv-asof"><span>Research review</span><strong>{INVESTIGATION_DATE}</strong><span>Selected cases; not a complete census.</span></div></section>
    <FilterBar filters={filters} />
    <div className="inv-workspace-bar"><div className="inv-view-tabs" aria-label="Choose display"><button aria-pressed={view === 'network'} onClick={() => setView('network')}><Network size={16} aria-hidden="true" /> Network</button><button aria-pressed={view === 'ledger'} onClick={() => setView('ledger')}><List size={16} aria-hidden="true" /> Source ledger</button></div><div className="inv-actions"><ShareButton /><ExportButtons cases={filters.filtered} /></div></div>
    {!filters.filtered.length ? <EmptyState reset={INVESTIGATION_CASES.length ? filters.reset : undefined} title={INVESTIGATION_CASES.length ? undefined : 'No research dossiers are published yet.'} text={INVESTIGATION_CASES.length ? undefined : 'The workspace is ready. Cases appear here only when their sources, limitations and testable questions have been added.'} /> : view === 'network' ? <ProvenanceNetwork cases={filters.filtered} selectedId={filters.selectedId} page={initialPage} onPage={value => filters.setParam('page', String(value))} onSelect={openCase} onEntity={value => filters.setParam('entity', value)} /> : <div className="inv-table-wrap" tabIndex={0} role="region" aria-label="Scrollable dossier source ledger"><table className="inv-table"><caption>All {filters.filtered.length} filtered dossiers and their source records. Select a dossier for the full response and limitations.</caption><thead><tr><th scope="col">Dossier</th><th scope="col">Status / sector</th><th scope="col">Public subjects</th><th scope="col">Cited sources</th></tr></thead><tbody>{filters.filtered.map(record => <tr key={record.id} className={record.id === filters.selectedId ? 'is-selected' : ''}><td><button className="inv-table-case" onClick={() => openFromLedger(record.id)}>{record.title}</button><p>{record.summary}</p></td><td><StatusBadge status={record.status} /><p>{record.sector}</p></td><td>{record.entities.map(entity => <button className="inv-table-entity" key={entity} onClick={() => filters.setParam('entity', entity)}>{entity}</button>)}</td><td><ul>{record.sources.map(id => { const source = sourceById.get(id); return <li key={id}>{source ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowUpRight size={12} aria-hidden="true" /></a> : `Source ${id} unavailable`}</li>; })}</ul></td></tr>)}</tbody></table></div>}
    {filters.selectedId && !selected && <p className="inv-notice" role="status">This dossier is not available in the current view. Clear filters or select a listed dossier.</p>}
    <Dossier record={selected} onEntity={value => filters.setParam('entity', value)} />
    <LegacyLinks />
    <footer className="inv-footer">This map shows provenance, not guilt. Subject labels are literal references in case records, not verified corporate-identity joins. Source access depth is recorded in each dossier. A missing record remains a gap, not evidence of concealment.</footer>
  </article>;
}
