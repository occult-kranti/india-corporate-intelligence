import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ProgramLead, ProgramSource } from '../../data/researchProgramSchema';
import { capturePlanRevision, DEFAULT_TEST_PLAN, PLAN_FIELDS, readResearchState, TEST_PLAN_BOUNDARY, type ResearchState, type Worksheet } from '../../data/testPlan';
import { downloadProgramJson } from './ProgramEvidence';

export const PROGRAM_PLAN_STORAGE = 'icip-research-program-plans-v1';
const planLabels = { population: 'Unit / comparison population', timeWindow: 'Time window', alternativeObservation: 'Alternative’s predicted observation', analysisMethod: 'Analysis method, controls and multiple comparisons' };
const worksheetLabels = { prediction: 'Prediction to test', alternative: 'Strongest alternative explanation', falsifier: 'What would change your mind?', records: 'Records to obtain', notes: 'Analysis notes', links: 'Additional source URLs' };
function readLocal(keys: string[]) { try { return readResearchState(JSON.parse(localStorage.getItem(PROGRAM_PLAN_STORAGE) ?? '{}'), keys); } catch { return readResearchState(null, keys); } }

export default function ProgramLeadPlan({ lead, sources, allowedKeys }: { lead: ProgramLead; sources: ProgramSource[]; allowedKeys: string[] }) {
  const [state, setState] = useState<ResearchState>(() => readLocal(allowedKeys));
  const [notice, setNotice] = useState('');
  const draft: Worksheet = state.drafts[lead.id] ?? { question: lead.question, prediction: '', alternative: '', falsifier: lead.disconfirmingEvidence.join('\n'), records: lead.neededEvidence.join('\n'), notes: '', links: '' };
  const plan = state.plans[lead.id] ?? { ...DEFAULT_TEST_PLAN };
  const revisions = state.revisions[lead.id] ?? [];
  function save(next: ResearchState, message = 'Draft saved in this browser.') {
    setState(next);
    try {
      const latest = readLocal(allowedKeys);
      const merged = { drafts: { ...latest.drafts, ...(next.drafts[lead.id] ? { [lead.id]: next.drafts[lead.id] } : {}) }, plans: { ...latest.plans, ...(next.plans[lead.id] ? { [lead.id]: next.plans[lead.id] } : {}) }, revisions: { ...latest.revisions, ...(next.revisions[lead.id] ? { [lead.id]: next.revisions[lead.id] } : {}) } };
      localStorage.setItem(PROGRAM_PLAN_STORAGE, JSON.stringify(merged)); setNotice(message);
    } catch { setNotice('Browser storage is unavailable. Keep this tab open and export your work.'); }
  }
  return <details className="rp-plan"><summary>Plan this research test · {revisions.length} saved revisions</summary>
    <p className="rp-boundary">{TEST_PLAN_BOUNDARY}</p>
    {lead.existingCaseId && <p><Link to={`/game-theory?case=${encodeURIComponent(lead.existingCaseId)}&hypothesis=${lead.hypothesisIndex ?? 0}`}>Open the exact linked case worksheet ↗</Link></p>}
    <label>Research question<textarea aria-label="Research question" value={draft.question} onChange={event => save({ ...state, drafts: { ...state.drafts, [lead.id]: { ...draft, question: event.target.value } } })} /></label>
    <div className="rp-plan-grid">{Object.entries(worksheetLabels).map(([field, label]) => <label key={field}>{label}<textarea aria-label={label} value={draft[field as keyof Worksheet]} onChange={event => save({ ...state, drafts: { ...state.drafts, [lead.id]: { ...draft, [field]: event.target.value } } })} /></label>)}</div>
    <div className="rp-plan-grid">{PLAN_FIELDS.map(field => <label key={field}>{planLabels[field]}<textarea aria-label={planLabels[field]} value={plan[field]} onChange={event => save({ ...state, plans: { ...state.plans, [lead.id]: { ...plan, [field]: event.target.value } } })} /></label>)}</div>
    <label>Self-reported plan timing<select aria-label="Self-reported plan timing" value={plan.timing} onChange={event => save({ ...state, plans: { ...state.plans, [lead.id]: { ...plan, timing: event.target.value as typeof plan.timing } } })}><option value="exploratory">Exploratory / records already seen</option><option value="before-new-search">Before new search (self-reported)</option></select></label>
    <div className="rp-actions"><button type="button" onClick={() => save({ ...state, drafts: { ...state.drafts, [lead.id]: draft }, plans: { ...state.plans, [lead.id]: plan }, revisions: capturePlanRevision(state.revisions, lead.id, draft, plan, new Date().toISOString()) }, 'Read-only revision captured in this browser.')}>Capture plan revision</button>
      <button type="button" onClick={() => { downloadProgramJson(`${lead.id}-research-plan.json`, { schemaVersion: 1, exportedAt: new Date().toISOString(), boundary: TEST_PLAN_BOUNDARY, lead, draft, plan, revisions, sources: sources.filter(source => lead.sourceIds.includes(source.id)) }); setNotice('Research lead, cited sources, current draft and revision history exported.'); }}>Export lead and plan</button></div>
    <p role="status">{notice}</p>
    {revisions.length > 0 && <div className="rp-revisions"><h4>Captured revisions</h4>{[...revisions].reverse().map(revision => <details key={revision.revision}><summary>Revision {revision.revision} · {revision.capturedAt}</summary><p>Timing: {revision.plan.timing}</p><dl>{Object.entries({ ...revision.worksheet, ...revision.plan }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value || 'Not recorded'}</dd></div>)}</dl></details>)}</div>}
  </details>;
}
