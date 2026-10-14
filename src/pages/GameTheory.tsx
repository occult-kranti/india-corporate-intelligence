import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpRight, Scale, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Kicker, PageTitle, Standfirst, Section } from '../components/Editorial';
import { INVESTIGATION_CASES, INVESTIGATION_SOURCES, INVESTIGATION_STATUS_LABELS } from '../data/investigations';
import { DEFAULT_STRATEGIC_INPUTS, STRATEGIC_ROLES, evaluateStrategy, strategySensitivity, type StrategicInputs } from '../data/strategicModels';
import '../game-theory.css';

const STORAGE_KEY = 'icip-strategy-lab-v1';
const FIELDS = [
  ['question', 'Research question', 'What specific decision or transaction are you testing?'],
  ['prediction', 'Predicted documentary trace', 'What record should exist if the hypothesis is true?'],
  ['alternative', 'Strongest competing explanation', 'What ordinary mechanism could create the same pattern?'],
  ['falsifier', 'What would weaken or falsify it?', 'Name an observable result that would change your conclusion.'],
  ['records', 'Missing records and lawful next step', 'Name the record, custodian, date range and lawful request route.'],
  ['notes', 'Research notes', 'Separate observations from interpretations; record contradictions.'],
  ['links', 'Additional evidence URLs', 'One public http(s) source URL per line.'],
] as const;
type Field = typeof FIELDS[number][0];
type Worksheet = Record<Field, string>;
type SavedState = { inputs: StrategicInputs; roleId: string; caseId: string; hypothesisIndex: number; drafts: Record<string, Worksheet> };

function readSavedState(): Partial<SavedState> {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const saved: Partial<SavedState> = {};
    if (raw.inputs) {
      evaluateStrategy(raw.inputs);
      if (raw.inputs.benefit <= 100 && raw.inputs.sanction <= 200 && raw.inputs.complianceCost <= 100) {
        saved.inputs = raw.inputs;
      }
    }
    if (STRATEGIC_ROLES.some(role => role.id === raw.roleId)) saved.roleId = raw.roleId;
    if (INVESTIGATION_CASES.some(item => item.id === raw.caseId)) saved.caseId = raw.caseId;
    if (Number.isInteger(raw.hypothesisIndex) && raw.hypothesisIndex >= 0) saved.hypothesisIndex = raw.hypothesisIndex;
    if (raw.drafts && typeof raw.drafts === 'object' && !Array.isArray(raw.drafts)) {
      saved.drafts = Object.fromEntries(Object.entries(raw.drafts).flatMap(([key, value]) => {
        if (!value || typeof value !== 'object' || !FIELDS.every(([field]) => typeof (value as Worksheet)[field] === 'string')) return [];
        return [[key, value as Worksheet]];
      }));
    }
    return saved;
  } catch { return {}; }
}

function publicUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

const number = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const outcome = { abuse: 'Abuse has the higher modeled payoff', lawful: 'Lawful conduct has the higher modeled payoff', indifferent: 'Both choices have the same modeled payoff' };

function SensitivityChart({ inputs }: { inputs: StrategicInputs }) {
  const id = useId();
  const rows = strategySensitivity(inputs);
  const current = evaluateStrategy(inputs);
  const min = Math.min(-10, ...rows.map(row => Math.min(row.abuseUtility, row.lawfulUtility))) - 10;
  const max = Math.max(10, ...rows.map(row => Math.max(row.abuseUtility, row.lawfulUtility))) + 10;
  const x = (p: number) => 50 + p * 470;
  const y = (u: number) => 190 - ((u - min) / (max - min)) * 150;
  return <>
    <svg className="gt-chart" viewBox="0 0 560 230" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>Hypothetical utility as assumed detection changes</title>
      <desc id={`${id}-desc`}>Gold solid line: abuse utility B minus p times S. Green dashed line: lawful utility minus C. The circle marks the current assumed detection probability. Exact values are in the table below.</desc>
      {[min, 0, max].map((value, i) => <g key={i}>
        <line x1="50" x2="520" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.12" />
        <text x="42" y={y(value) + 4} textAnchor="end">{number(value)}</text>
      </g>)}
      <line x1="50" x2="520" y1={y(current.lawfulUtility)} y2={y(current.lawfulUtility)} stroke="#8fbe95" strokeWidth="2.5" strokeDasharray="6 5" />
      <polyline points={rows.map(row => `${x(row.detection)},${y(row.abuseUtility)}`).join(' ')} fill="none" stroke="#d5b879" strokeWidth="2.5" />
      <line x1={x(inputs.detection)} x2={x(inputs.detection)} y1="30" y2="195" stroke="#aaa392" strokeDasharray="2 5" />
      <circle cx={x(inputs.detection)} cy={y(current.abuseUtility)} r="5" fill="#d5b879" stroke="#141416" strokeWidth="2" />
      {[0, .25, .5, .75, 1].map(p => <text key={p} x={x(p)} y="213" textAnchor="middle">{p * 100}%</text>)}
      <text x="50" y="15">Utility units</text>
      <text x="520" y="229" textAnchor="end">Assumed detection probability</text>
    </svg>
    <div className="gt-legend"><span>— Abuse utility</span><span>– – Lawful utility</span></div>
    <details className="gt-details"><summary>Read exact sensitivity values</summary>
      <div className="gt-table-wrap"><table>
        <caption>Change only detection p; hold B, S and C fixed. These are scenarios, not estimates.</caption>
        <thead><tr><th scope="col">Assumed p</th><th scope="col">Abuse utility</th><th scope="col">Lawful utility</th><th scope="col">Higher payoff</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.detection}><th scope="row">{row.detection * 100}%</th><td>{number(row.abuseUtility)}</td><td>{number(row.lawfulUtility)}</td><td>{row.bestResponse === 'indifferent' ? 'Equal' : row.bestResponse === 'lawful' ? 'Lawful' : 'Abuse'}</td></tr>)}</tbody>
      </table></div>
    </details>
  </>;
}

export default function GameTheory() {
  const [initial] = useState(readSavedState);
  const [inputs, setInputs] = useState<StrategicInputs>(initial.inputs ?? DEFAULT_STRATEGIC_INPUTS);
  const [roleId, setRoleId] = useState(initial.roleId ?? 'official');
  const [caseId, setCaseId] = useState(initial.caseId ?? '');
  const [hypothesisIndex, setHypothesisIndex] = useState(initial.hypothesisIndex ?? 0);
  const [drafts, setDrafts] = useState<Record<string, Worksheet>>(initial.drafts ?? {});
  const [saveStatus, setSaveStatus] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const role = STRATEGIC_ROLES.find(item => item.id === roleId) ?? STRATEGIC_ROLES[0];
  const selectedCase = INVESTIGATION_CASES.find(item => item.id === caseId);
  const hypothesis = selectedCase?.hypotheses[hypothesisIndex] ?? selectedCase?.hypotheses[0];
  const selectedIndex = hypothesis ? selectedCase!.hypotheses.indexOf(hypothesis) : 0;
  const draftKey = selectedCase ? `${selectedCase.id}:${selectedIndex}` : `generic:${role.id}`;
  const worksheet: Worksheet = drafts[draftKey] ?? {
    question: hypothesis?.question ?? `Does the ${role.title.toLowerCase()} hypothesis survive a competing explanation?`,
    prediction: hypothesis?.prediction ?? role.predictedTrace,
    alternative: hypothesis?.alternative ?? role.alternative,
    falsifier: hypothesis?.falsifier ?? role.falsifier,
    records: hypothesis?.records ?? '', notes: '', links: '',
  };
  const sources = useMemo(() => INVESTIGATION_SOURCES.filter(source => selectedCase?.sources.includes(source.id)), [selectedCase]);
  const result = evaluateStrategy(inputs);
  const invalidLinks = worksheet.links.split('\n').map(line => line.trim()).filter(line => line && !publicUrl(line));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, roleId, caseId, hypothesisIndex, drafts }));
      setSaveStatus('Saved in this browser. No account or server sync.');
    } catch { setSaveStatus('Browser storage is unavailable. Export JSON to keep this work.'); }
  }, [inputs, roleId, caseId, hypothesisIndex, drafts]);

  const updateField = (field: Field, value: string) => {
    setDrafts(previous => ({ ...previous, [draftKey]: { ...worksheet, [field]: value } }));
    setExportStatus('');
  };

  const exportScenario = () => {
    const scenario = {
      schemaVersion: 1, exportedAt: new Date().toISOString(),
      model: 'Hypothetical one-actor decision under risk; not a measured equilibrium or evidence of wrongdoing.',
      assumptions: { ...inputs, units: 'Arbitrary utility units; detection is an assumed probability, not a measured rate.',
        utilityFormulas: { lawful: '-C', abuse: 'B - p*S', indifference: 'p = (B+C)/S when S > 0' },
        omitted: ['Moral preferences', 'Social harm', 'Reputation', 'Repeated interaction', 'Information asymmetry', 'Endogenous detection and sanctions'],
        neutralBaseline: 'Zero represents an arbitrary reference state; only utility differences drive the comparison.' },
      results: { ...result, sensitivity: strategySensitivity(inputs) },
      role, case: selectedCase ? { id: selectedCase.id, title: selectedCase.title, status: selectedCase.status, limitation: selectedCase.limitation } : null,
      hypothesisIndex: selectedCase ? selectedIndex : null, worksheet,
      evidenceSources: sources,
      additionalEvidenceUrls: worksheet.links.split('\n').map(line => publicUrl(line.trim())).filter(Boolean),
      omittedInvalidUrls: invalidLinks,
      evidenceBoundary: 'Source links support their stated claims only. Model outputs do not upgrade allegations or establish motive, causation or guilt.',
    };
    try {
      const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `strategy-scenario-${selectedCase?.id ?? role.id}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus('Scenario JSON download started.');
    } catch { setExportStatus('The browser could not create the download. Your notes remain visible here.'); }
  };

  let thresholdText: string;
  if (result.threshold === null) {
    thresholdText = result.bestResponse === 'indifferent'
      ? 'With B = C = S = 0, both choices tie for every assumed p.'
      : 'With S = 0, changing detection alone cannot reverse this payoff ranking.';
  } else if (result.threshold > 1) {
    thresholdText = `Equality would require p = ${number(result.threshold * 100)}%, outside the possible 0–100% range. Detection alone is insufficient under these assumptions.`;
  } else if (result.threshold === 1) {
    thresholdText = 'At p = 100%, both choices tie. No larger probability is possible, so detection alone cannot give lawful conduct a strictly higher modeled payoff.';
  } else {
    thresholdText = `At p = ${number(result.threshold * 100)}%, both choices tie. Above this threshold lawful conduct has the higher modeled payoff.`;
  }

  return <article className="gt-page">
    <Kicker>Investigation methods / Strategic incentives</Kicker>
    <div className="gt-heading-row"><div><PageTitle>Test the incentives.<br />Then test the story.</PageTitle>
      <Standfirst>Put yourself in each institutional role. Ask what a public-interest strategy achieves, what an abuse hypothesis predicts, and which records could prove the hypothesis wrong.</Standfirst>
    </div><div className="gt-seal" aria-hidden="true"><Scale size={42} strokeWidth={1} /><span>STRATEGY<br />LAB / 01</span></div></div>
    <div className="gt-boundary"><ShieldCheck size={20} aria-hidden="true" /><p><strong>A model generates questions.</strong> Incentives do not establish intent. A shared beneficiary, timing overlap or plausible motive does not rule out coincidence or prove coordination.</p></div>
    <nav className="gt-jump" aria-label="On this page">{[['gt-roles', '01 / Positions'], ['gt-model', '02 / Payoffs'], ['gt-worksheet', '03 / Evidence test']].map(([id, label]) => <button type="button" key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ block: 'start' })}>{label}</button>)}</nav>

    <Section id="gt-roles" title="01 / Take a position" note="Generic roles. No individual, party, company or institution receives a payoff score.">
      <div className="gt-role-buttons" role="group" aria-label="Institutional role">
        {STRATEGIC_ROLES.map(item => <button key={item.id} type="button" aria-pressed={roleId === item.id} onClick={() => setRoleId(item.id)}>{item.title}</button>)}
      </div>
      <p className="gt-objective"><span>Public-interest objective</span>{role.objective}</p>
      <div className="gt-two-columns">
        <div className="gt-panel gt-lawful"><h3><ShieldCheck size={18} aria-hidden="true" /> Lawful strategy</h3><ol>{role.lawful.map(step => <li key={step}>{step}</li>)}</ol></div>
        <div className="gt-panel"><h3><Scale size={18} aria-hidden="true" /> Abuse hypothesis to test</h3><p>{role.abuseHypothesis}</p><p className="gt-subnote">Hypothetical institutional risk, not a claim that this behavior occurred.</p><h4>Expected trace</h4><p>{role.predictedTrace}</p></div>
      </div>
      <details className="gt-details"><summary>Rules and process questions for this role</summary><ul>{role.ruleQuestions.map(question => <li key={question}>{question}</li>)}</ul><p>Check the governing instrument, jurisdiction, effective date and applicable exception before claiming a breach. These prompts are not findings of illegality.</p></details>
    </Section>

    <Section id="gt-model" title="02 / Change the incentives" note="Illustrative utilities only · All four inputs are assumptions · No parameters fitted to real actors">
      <p className="gt-intro">This is a one-actor decision under risk: two choices, with detection represented as an assumed chance event. It is an entry point for strategic analysis, not a multi-player equilibrium or a prediction of behavior.</p>
      <div className="gt-model-grid">
        <div className="gt-controls gt-panel"><h3><SlidersHorizontal size={18} aria-hidden="true" /> Set your assumptions</h3>
          {([
            ['benefit', 'Private benefit B', 100, 1, 'Utility gained under the abuse hypothesis.'],
            ['detection', 'Detection probability p', 1, .01, 'Assumed probability of detection and an effective sanction.'],
            ['sanction', 'Sanction cost S', 200, 1, 'Utility lost if detected and sanctioned.'],
            ['complianceCost', 'Compliance cost C', 100, 1, 'Utility cost of the lawful choice.'],
          ] as const).map(([key, label, max, step, description]) => <div className="gt-control" key={key}>
            <div><label htmlFor={`gt-${key}`}>{label}</label><output htmlFor={`gt-${key}`}>{key === 'detection' ? `${Math.round(inputs[key] * 100)}%` : number(inputs[key])}</output></div>
            <input id={`gt-${key}`} type="range" min="0" max={max} step={step} value={inputs[key]} onChange={event => setInputs(previous => ({ ...previous, [key]: Number(event.target.value) }))} aria-describedby={`gt-${key}-help`} />
            <p id={`gt-${key}-help`}>{description}</p>
          </div>)}
          <button className="gt-secondary" type="button" onClick={() => setInputs({ ...DEFAULT_STRATEGIC_INPUTS })}>Reset assumptions</button>
        </div>
        <div className="gt-results"><div className="gt-result-head" aria-live="polite"><p className="gt-micro">Conditional result</p><h3>{outcome[result.bestResponse]}</h3><div className="gt-score-pair"><div><span>Lawful / −C</span><strong>{number(result.lawfulUtility)}</strong></div><div><span>Abuse / B − pS</span><strong>{number(result.abuseUtility)}</strong></div></div><p className="gt-subnote">Higher modeled payoff is an arithmetic result, not a recommendation.</p></div>
          <div className="gt-threshold"><span>Indifference threshold · p* = (B + C) / S</span><p>{thresholdText}</p></div>
          <SensitivityChart inputs={inputs} />
        </div>
      </div>
      <div className="gt-table-wrap"><table className="gt-payoff"><caption>Payoff matrix: one actor's utility in each possible state. Detection is a chance event, not a second player's strategy.</caption><thead><tr><th scope="col">Choice</th><th scope="col">Not detected (1 − p)</th><th scope="col">Detected + sanctioned (p)</th><th scope="col">Expected utility</th></tr></thead><tbody><tr><th scope="row">Lawful</th><td>−C = {number(-inputs.complianceCost)}</td><td>−C = {number(-inputs.complianceCost)}</td><td>{number(result.lawfulUtility)}</td></tr><tr><th scope="row">Abuse hypothesis</th><td>B = {number(inputs.benefit)}</td><td>B − S = {number(inputs.benefit - inputs.sanction)}</td><td>{number(result.abuseUtility)}</td></tr></tbody></table></div>
      <p className="gt-subnote">The model omits moral preferences, social harm, reputation, repeated interactions and information asymmetry. Detection and sanctions are fixed assumptions; real institutions can affect both. Zero is an arbitrary utility baseline, not a statement that public service has no benefit. Nothing here estimates the likelihood that a conspiracy exists.</p>
    </Section>

    <Section id="gt-worksheet" title="03 / Make the hypothesis testable" note="Predict a record before searching. Keep the strongest alternative alongside it.">
      <div className="gt-workspace-controls"><div><label htmlFor="gt-case">Connect an investigation</label><select id="gt-case" value={caseId} onChange={event => { setCaseId(event.target.value); setHypothesisIndex(0); }}><option value="">Generic role worksheet</option>{INVESTIGATION_CASES.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
        {selectedCase && selectedCase.hypotheses.length > 0 && <div><label htmlFor="gt-hypothesis">Research question</label><select id="gt-hypothesis" value={selectedIndex} onChange={event => setHypothesisIndex(Number(event.target.value))}>{selectedCase.hypotheses.map((item, index) => <option value={index} key={index}>{item.question}</option>)}</select></div>}
      </div>
      {INVESTIGATION_CASES.length === 0 && <p className="gt-empty">No investigation cases are loaded in this build. The role worksheets, model and export work independently.</p>}
      {selectedCase && <div className="gt-case-context"><span className="gt-micro">{INVESTIGATION_STATUS_LABELS[selectedCase.status]} / {selectedCase.sector}</span><h3>{selectedCase.title}</h3><p>{selectedCase.summary}</p><p><strong>Record finding:</strong> {selectedCase.finding}</p><p><strong>Evidence limit:</strong> {selectedCase.limitation}</p><Link to="/investigations">Open the investigation desk <ArrowUpRight size={14} aria-hidden="true" /></Link></div>}
      <div className="gt-worksheet-grid">{FIELDS.map(([field, label, placeholder]) => <div className={field === 'question' || field === 'notes' || field === 'links' ? 'gt-wide' : ''} key={field}><label htmlFor={`gt-field-${field}`}>{label}</label><textarea id={`gt-field-${field}`} rows={field === 'question' ? 2 : 3} value={worksheet[field]} placeholder={placeholder} onChange={event => updateField(field, event.target.value)} /></div>)}</div>
      {invalidLinks.length > 0 && <p className="gt-validation" role="status">{invalidLinks.length} URL {invalidLinks.length === 1 ? 'is' : 'are'} not a valid public http(s) link. The original text stays in your notes; it is excluded from the evidence URL list.</p>}
      <div className="gt-evidence"><h3>Evidence carried into the export</h3>{sources.length ? <ul>{sources.map(source => <li key={source.id}>{publicUrl(source.url) ? <a href={publicUrl(source.url)!} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={14} aria-hidden="true" /></a> : <span>{source.title} · URL unavailable</span>}<span>{source.publisher} · {source.date} · {source.access}</span><p>{source.supports}</p></li>)}</ul> : <p>No case sources selected. Add public sources above or choose a sourced investigation.</p>}</div>
      <div className="gt-export-row"><div><p>{saveStatus}</p><p>Notes stay separate for each case question and each generic role. Exports include the active worksheet only.</p></div><button type="button" className="gt-export" onClick={exportScenario}><ArrowDownToLine size={17} aria-hidden="true" /> Export scenario JSON</button></div><p className="gt-export-status" role="status">{exportStatus}</p>
      <div className="gt-next"><p className="gt-micro">A defensible next move</p><ol><li>Fix the timeframe, decision-maker and comparison group.</li><li>Obtain the predicted record through a public source or lawful request; document a refusal as an access gap, not proof.</li><li>Test the alternative on the same records and preserve negative results.</li><li>Seek a response and independent review before upgrading a question into a finding.</li></ol></div>
    </Section>
  </article>;
}
