import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Check, FlaskConical } from 'lucide-react';
import { INVESTIGATION_CASES, INVESTIGATION_DATE } from '../data/investigations';
import { EmptyState, ExportButtons, FilterBar, InvestigationNav, LegacyLinks, ShareButton, StatusBadge, useInvestigationFilters } from '../components/investigations/shared';
import '../investigations.css';

const STORAGE_KEY = 'icip:investigation-leads:v1';
function readSaved(): Set<string> { try { const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []); } catch { return new Set(); } }

export default function Leads() {
  const filters = useInvestigationFilters();
  const [saved, setSaved] = useState<Set<string>>(readSaved);
  const [storageMessage, setStorageMessage] = useState('');
  const savedOnly = filters.params.get('saved') === '1';
  const cases = filters.filtered.filter(record => !filters.selectedId || record.id === filters.selectedId);
  const leads = cases.flatMap(record => record.hypotheses.map((hypothesis, index) => ({ record, hypothesis, id: `${record.id}:${index}`, index })));
  const visible = leads.filter(lead => !savedOnly || saved.has(lead.id));
  const total = INVESTIGATION_CASES.reduce((sum, record) => sum + record.hypotheses.length, 0);
  const toggleSaved = (id: string) => {
    const next = new Set(saved); if (next.has(id)) next.delete(id); else next.add(id);
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); setStorageMessage(next.has(id) ? 'Lead saved on this device.' : 'Lead removed from saved leads.'); }
    catch { setStorageMessage('Browser storage is unavailable. Your selections will last for this page session only.'); }
  };

  return <article className="inv-page">
    <InvestigationNav active="leads" />
    <header className="inv-hero inv-hero--leads"><div className="inv-hero-copy"><span className="inv-kicker">Research desk / hypotheses to test</span><h1>Unresolved<br /> <em>leads.</em></h1><p>The next questions worth asking. Each hypothesis names a prediction, a competing explanation, the result that would defeat it, and the records needed to decide.</p><Link className="inv-text-link" to="/game-theory">Test incentives in the game theory lab <ArrowRight size={17} aria-hidden="true" /></Link></div><aside className="inv-hero-note"><FlaskConical size={30} strokeWidth={1.2} aria-hidden="true" /><strong>Start with a question.<br /> Allow it to be wrong.</strong><p>These are proposed investigations. They are not discoveries of hidden conspiracies. A plausible motive cannot establish that an act occurred.</p></aside></header>
    <section className="inv-lead-method" aria-label="Investigation sequence"><div><span>01</span><strong>Predict</strong><p>Name an observable result.</p></div><div><span>02</span><strong>Compare</strong><p>Test a lawful explanation too.</p></div><div><span>03</span><strong>Try to disprove</strong><p>Define the result that defeats it.</p></div><div><span>04</span><strong>Obtain the record</strong><p>Keep the finding open until then.</p></div></section>
    <FilterBar filters={filters} />
    <div className="inv-workspace-bar"><div className="inv-lead-count" role="status"><strong>{visible.length}</strong> of {total} published leads · reviewed {INVESTIGATION_DATE}</div><div className="inv-actions"><button className={`inv-button ${savedOnly ? 'is-active' : ''}`} aria-pressed={savedOnly} onClick={() => filters.setParam('saved', savedOnly ? '' : '1')}><Bookmark size={14} aria-hidden="true" />{savedOnly ? 'Showing saved' : 'Saved on this device'}</button><ShareButton /><ExportButtons cases={cases.filter(record => visible.some(lead => lead.record.id === record.id))} /></div></div>
    {filters.selectedId && <div className="inv-selected-filter"><span>Dossier: {INVESTIGATION_CASES.find(record => record.id === filters.selectedId)?.title || filters.selectedId}</span><button className="inv-button" onClick={() => filters.setParam('case', '')}>All dossiers</button></div>}
    <p className="inv-storage-note">Saved leads stay in this browser. Shared links include filters, but do not transfer your saved list.</p>
    <p className="inv-storage-message" role="status">{storageMessage}</p>
    {!visible.length ? <EmptyState reset={() => { filters.reset(); }} title={savedOnly ? 'No saved leads match this view.' : 'No leads match this view.'} text={savedOnly ? 'Switch off the saved filter, then bookmark a question you want to investigate.' : 'Clear the filters to see all published questions. An empty list is not a conclusion about the underlying issue.'} /> : <div className="inv-lead-list">{visible.map(({ record, hypothesis, id, index }) => <article className="inv-lead-card" key={id} id={`lead-${record.id}-${index}`}><header><div><span className="inv-kicker">Proposed test / {record.sector}</span><StatusBadge status={record.status} /></div><button className={`inv-save ${saved.has(id) ? 'is-saved' : ''}`} onClick={() => toggleSaved(id)} aria-pressed={saved.has(id)} aria-label={`${saved.has(id) ? 'Unsave' : 'Save'} lead: ${hypothesis.question}`}>{saved.has(id) ? <Check size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}<span>{saved.has(id) ? 'Saved' : 'Save lead'}</span></button></header><h2>{hypothesis.question}</h2><Link className="inv-lead-origin" to={`/investigations?case=${encodeURIComponent(record.id)}`}>From: {record.title}<ArrowRight size={13} aria-hidden="true" /></Link><div className="inv-lead-tests"><section><span className="inv-kicker">Expected observation</span><h3>If the hypothesis is right</h3><p>{hypothesis.prediction}</p></section><section><span className="inv-kicker">Competing explanation</span><h3>What else would fit?</h3><p>{hypothesis.alternative}</p></section><section><span className="inv-kicker">Disconfirmation</span><h3>What would defeat it?</h3><p>{hypothesis.falsifier}</p></section><section><span className="inv-kicker">Next research action</span><h3>Records to obtain</h3><p>{hypothesis.records}</p></section></div><footer><p><strong>Current limit:</strong> {record.limitation}</p><div className="inv-actions"><Link className="inv-button" to={`/game-theory?case=${encodeURIComponent(record.id)}&hypothesis=${index}`}>Plan this test <ArrowRight size={14} aria-hidden="true" /></Link><ShareButton path={`/leads?case=${encodeURIComponent(record.id)}`} /></div></footer></article>)}</div>}
    <LegacyLinks />
    <footer className="inv-footer">Predictions are prospective tests, not confirmation. Compare against the full relevant population, preserve denials and adverse findings, and publish an unresolved or refuted outcome when the record requires it.</footer>
  </article>;
}
