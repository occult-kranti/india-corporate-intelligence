import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getInvestigationRegistry, getInvestigationView, INVESTIGATION_LAYERS, INVESTIGATION_STATES, type InvestigationTier } from '../data/investigation';
import { pinCasebookItem, useCasebook } from '../components/investigation/Casebook';
import './investigation-dossier.css';

const definitions = {
  'international-finance': { title: 'International lending & investment', summary: 'Trace multilateral loans, sovereign borrowers, implementing agencies and private investment across borders, then inspect each documented use of funds.', boundaries: ['An IMF quota or SDR allocation is not automatically a loan.', 'A sovereign loan, a state implementation arrangement and a contractor payment require separate evidence.', 'An IFC equity commitment is distinct from a loan and from cash received.'] },
  'defence-trade': { title: 'Defence contracts & international suppliers', summary: 'Follow public arms contracts, manufacturers, joint ventures, national buyers and documented deliveries.', boundaries: ['An export approval ceiling is not a signed sale or a payment.', 'A supplier jurisdiction does not establish government ownership.', 'Contracts and deliveries do not by themselves establish wrongdoing; operational deployments are outside this evidence view.'] },
  health: { title: 'Hospitals, insurance & public health', summary: 'Follow hospital ownership, public insurance claims, contracts and their documented outcomes.', boundaries: ['An empanelled hospital is not a finding of wrongdoing.', 'An alleged false claim, a recovery order and a recovered payment are separate stages.'] },
  ngo: { title: 'NGOs, temples & charitable trusts', summary: 'Trace grants, foreign contributions, donor receipts and fiduciary oversight through each legally distinct institution.', boundaries: ['A donor link does not establish influence or diversion.', 'Trusts with similar names remain separate until a reliable identity record joins them.'] },
  'disaster-relief': { title: 'Disaster relief & reconstruction', summary: 'Compare emergency funding, advances, reconstruction contracts and audit follow-up at their actual financial stages.', boundaries: ['A mobilisation advance is not automatically a loss.', 'Missing utilisation evidence remains an open audit question; positive completion evidence is retained.'] },
  transport: { title: 'Ports, airports & rail', summary: 'Follow concessions, operators, project companies and public revenue obligations.', boundaries: ['Projected investment differs from certified expenditure.', 'A concession transfers defined rights and obligations; it does not automatically transfer all public assets.'] },
  'public-funds': { title: 'Government funds & public finance', summary: 'Inspect allocations, transfers, programme spending and audit findings with their periods and denominators intact.', boundaries: ['Budgets, sanctions, disbursements and recoveries are not interchangeable.', 'The same amount may recur in successive financial stages and must not be summed.'] },
  policy: { title: 'Laws, rules & policy changes', summary: 'Read the instruments that change access to funding, ownership and contracts, alongside their legal status and counter-evidence.', boundaries: ['A draft is not enacted law.', 'A legal change and a later corporate benefit do not alone establish causation or improper influence.'] },
  'public-records': { title: 'Public releases & document investigations', summary: 'Inspect officially released records, published forensic reviews and attributed reporting, including public Epstein-related material with a documented India connection.', boundaries: ['An appearance in a correspondence or contact record is not evidence of criminal involvement.', 'A proposed transaction is not an established payment. Personal identities and actual money flows require independent evidence.'] },
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
    return getInvestigationView({ domains: domain === 'policy' ? undefined : domain === 'public-funds' ? ['public-funds', 'public-finance', 'welfare', 'pmcares'] : domain === 'disaster-relief' ? ['disaster-relief', 'pmcares'] : [domain],
      stateCode: INVESTIGATION_STATES.some(row => row.code === params.get('iw_state')) ? params.get('iw_state')! : undefined,
      q: params.get('iw_q') || undefined, from: reversed ? undefined : from, to: reversed ? undefined : to,
      layers: domain === 'policy' ? ['policy'] : choose('iw_layers', INVESTIGATION_LAYERS.map(row => row.value)),
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
    <header><p className="investigation-dossier-kicker">Source-backed dossier · {registry.updatedAt}</p><h1 id="investigation-dossier-heading">{definition.title}</h1><p>{definition.summary}</p></header>
    <ul className="investigation-dossier-boundaries">{definition.boundaries.map(text => <li key={text}>{text}</li>)}</ul>
    <p className="investigation-dossier-count">{view.records.length.toLocaleString('en-IN')} records · {view.sources.length.toLocaleString('en-IN')} cited sources in this dossier and filter scope. Amounts retain their individual stages and periods.</p>
    {!view.records.length && <p className="investigation-dossier-empty">No records match this scope. Broaden the state, date or search controls to inspect national context and coverage gaps.</p>}
    <div className="investigation-dossier-records">{view.records.slice(0, limit).map(record => <article key={record.id} data-domain-record={record.id}>
      <div className="investigation-dossier-meta"><span>{record.kind}</span><span>{record.tier}</span><span>{record.status}</span></div>
      <h3>{record.title}</h3><p>{record.summary}</p>
      <p className="investigation-dossier-date">{record.period} · Status as of {record.statusAsOf ?? 'date not established'} · {record.dateBasis}</p>
      {record.amounts.length > 0 && <dl>{record.amounts.map((amount, index) => <div key={index}><dt>{amount.stage} · {amount.period}</dt><dd>{amount.currency} {amount.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {amount.unit}</dd></div>)}</dl>}
      <details><summary>Response, interpretation and sources</summary><div><h4>Recorded response or procedural context</h4><p>{record.response}</p>{record.alternativeExplanations.length > 0 && <><h4>Other explanations to consider</h4><ul>{record.alternativeExplanations.map(text => <li key={text}>{text}</li>)}</ul></>}{record.falsifier && <><h4>What would close the question</h4><p>{record.falsifier}</p></>}{record.limitations.length > 0 && <><h4>Evidence limits</h4><ul>{record.limitations.map(text => <li key={text}>{text}</li>)}</ul></>}<h4>Cited records</h4><ul className="investigation-dossier-citations">{record.sourceIds.map(id => { const source = sourceMap.get(id); return source ? <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗<span className="sr-only"> (opens in a new tab)</span></a><p>{source.publisher} · {source.locator} · Published {source.publishedAt ?? 'unknown'} · Retrieved {source.retrievedAt ?? 'unknown'}</p></li> : null; })}</ul></div></details>
      <div className="investigation-dossier-actions"><Link to={inspect(record.id)}>Inspect in linked workspace</Link><button type="button" disabled={book.isPinned('record', record.id) || book.count >= 250} onClick={() => pinCasebookItem('record', record.id)}>{book.isPinned('record', record.id) ? 'Saved to casebook' : 'Save to casebook'}</button></div>
    </article>)}</div>
    {view.records.length > limit && <button className="investigation-dossier-more" type="button" onClick={() => setLimit(current => current + 24)}>Show 24 more records</button>}
  </section>;
}
