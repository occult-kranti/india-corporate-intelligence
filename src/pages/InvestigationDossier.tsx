import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getInvestigationRegistry, getInvestigationView, INVESTIGATION_LAYERS, INVESTIGATION_STATES, type InvestigationTier } from '../data/investigation';
import { pinCasebookItem, useCasebook } from '../components/investigation/Casebook';
import './investigation-dossier.css';

const definitions = {
  justice: {
    title: 'Justice, proceedings & public oversight',
    summary: 'Read the decision, its jurisdiction and procedural stage. Follow the parties, authored judgments and oversight records through their exact sources.',
    boundaries: ['A complaint or charge records a procedural step, not a finding of guilt.', 'A closure report filing is distinct from court acceptance, discharge or acquittal.', 'Bench membership and judgment authorship establish professional roles, not improper influence.'],
  },
  'debt-relief': {
    title: 'Corporate debt, write-offs & recovery',
    summary: 'Separate accounting decisions from release of borrower liability, insolvency plans and recovered cash. Follow the exact population, accounting period and instrument in each record.',
    boundaries: ['A bank write-off is not, by itself, a debt waiver.', 'Recoveries may relate to earlier loans; annual recovery and write-off figures are not automatically a matched cohort.', 'Amounts realisable under an approved insolvency plan are distinct from cash collected or a benefit paid to a former promoter.'],
  },
};

export default function InvestigationDossier({ domain }: { domain: keyof typeof definitions }) {
  const location = useLocation();
  const [limit, setLimit] = useState(24);
  const book = useCasebook();
  const definition = definitions[domain];
  const registry = getInvestigationRegistry();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const view = useMemo(() => {
    const choose = <T extends string,>(key: string, values: T[]) => {
      const raw = params.get(key); if (raw === null) return undefined; if (raw === 'none') return [];
      const valid = values.filter(value => raw.split(',').includes(value)); return valid.length ? valid : undefined;
    };
    const validDate = (key: string) => {
      const raw = params.get(key); if (!raw || !/^\d{4}-\d{2}-\d{2}$/u.test(raw)) return undefined;
      const time = Date.parse(`${raw}T00:00:00Z`); return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === raw ? raw : undefined;
    };
    const from = validDate('iw_from'), to = validDate('iw_to'), reversed = from && to && from > to;
    return getInvestigationView({ domains: [domain],
      stateCode: INVESTIGATION_STATES.some(row => row.code === params.get('iw_state')) ? params.get('iw_state')! : undefined,
      q: params.get('iw_q') || undefined, from: reversed ? undefined : from, to: reversed ? undefined : to,
      layers: choose('iw_layers', INVESTIGATION_LAYERS.map(row => row.value)),
      tiers: choose<InvestigationTier>('iw_tier', ['documented', 'reported', 'alleged', 'analytic', 'self-reported']),
      geographyMode: params.get('iw_geo') === 'coverage' ? 'coverage' : params.get('iw_geo') === 'associations' ? 'associations' : 'all',
      includeNational: params.get('iw_national') !== '0', includeUndated: params.get('iw_undated') !== '0',
    });
  }, [domain, params]);
  const sourceMap = useMemo(() => new Map(registry.sources.map(row => [row.id, row])), [registry]);
  const inspect = (id: string) => {
    const next = new URLSearchParams(location.search); next.set('iw_view', 'evidence'); next.set('iw_record', id); next.delete('iw_node'); next.delete('iw_edge');
    return `${location.pathname}?${next}`;
  };
  return <section className="investigation-dossier" aria-labelledby="investigation-dossier-heading">
    <header><p className="investigation-dossier-kicker">Primary-record dossier · {registry.updatedAt}</p><h1 id="investigation-dossier-heading">{definition.title}</h1><p>{definition.summary}</p></header>
    <ul className="investigation-dossier-boundaries">{definition.boundaries.map(text => <li key={text}>{text}</li>)}</ul>
    <p className="investigation-dossier-count">{view.records.length.toLocaleString('en-IN')} records · {view.sources.length.toLocaleString('en-IN')} cited sources in this dossier and filter scope. Amounts retain their individual stages and periods.</p>
    {!view.records.length && <p className="investigation-dossier-empty">No records match this scope. Broaden the state, date or search controls to inspect national context and coverage gaps.</p>}
    <div className="investigation-dossier-records">{view.records.slice(0, limit).map(record => <article key={record.id} data-domain-record={record.id}>
      <div className="investigation-dossier-meta"><span>{record.kind}</span><span>{record.tier}</span><span>{record.status}</span></div>
      <h3>{record.title}</h3><p>{record.summary}</p>
      <p className="investigation-dossier-date">{record.period} · Status as of {record.statusAsOf ?? 'date not established'} · {record.dateBasis}</p>
      {record.amounts.length > 0 && <dl>{record.amounts.map((amount, index) => <div key={index}><dt>{amount.stage} · {amount.period}</dt><dd>{amount.currency} {amount.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {amount.unit}</dd></div>)}</dl>}
      <details><summary>Response, interpretation and sources</summary><div><h4>Recorded response or procedural context</h4><p>{record.response}</p>{record.alternativeExplanations.length > 0 && <><h4>Other explanations to consider</h4><ul>{record.alternativeExplanations.map(text => <li key={text}>{text}</li>)}</ul></>}{record.falsifier && <><h4>What would close the question</h4><p>{record.falsifier}</p></>}{record.limitations.length > 0 && <><h4>Evidence limits</h4><ul>{record.limitations.map(text => <li key={text}>{text}</li>)}</ul></>}<h4>Original records</h4><ul className="investigation-dossier-citations">{record.sourceIds.map(id => { const source = sourceMap.get(id); return source ? <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗<span className="sr-only"> (opens in a new tab)</span></a><p>{source.publisher} · {source.locator} · Published {source.publishedAt ?? 'unknown'} · Retrieved {source.retrievedAt ?? 'unknown'}</p></li> : null; })}</ul></div></details>
      <div className="investigation-dossier-actions"><Link to={inspect(record.id)}>Inspect in linked workspace</Link><button type="button" disabled={book.isPinned('record', record.id) || book.count >= 250} onClick={() => pinCasebookItem('record', record.id)}>{book.isPinned('record', record.id) ? 'Saved to casebook' : 'Save to casebook'}</button></div>
    </article>)}</div>
    {view.records.length > limit && <button className="investigation-dossier-more" type="button" onClick={() => setLimit(current => current + 24)}>Show 24 more records</button>}
  </section>;
}
