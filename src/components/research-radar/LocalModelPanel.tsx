import { ArrowUpRight } from 'lucide-react';
import status from '../../../research/research-radar/fine-tuning/model-status.json';
import './local-model-panel.css';

type RetrieverKey = 'bm25' | 'base_fp32' | 'base_onnx_uint8' | 'candidate';
type RetrievalScores = {
  ndcgAt5: number;
  mrrAt10: number;
  recallAt5: number;
  familyNdcgAt5: number;
  familyRecallAt5: number;
  hardNegativePreference: number;
  counterevidenceRecallAt5: number;
};
type LocalModelStatus = {
  modelLabel: string;
  status: string;
  trained: boolean;
  objective: string;
  forecastProbabilitiesEstimated: boolean;
  trainableParameters: number;
  trainingQueries: number;
  trainingDocuments: number;
  developmentQueries: number;
  holdoutQueries: number;
  holdoutCases: number;
  indexedDocuments: number;
  selectedEpoch: number;
  defaultRetriever: string;
  adapterSha256: string;
  evaluationSha256: string;
  scores: Record<RetrieverKey, RetrievalScores>;
  failedCriteria: string[];
  completedAt: string;
  limitations: string[];
};
const model: LocalModelStatus = status;
const systems: { key: RetrieverKey; label: string }[] = [
  { key: 'bm25', label: 'BM25 · lexical baseline' },
  { key: 'base_fp32', label: 'MiniLM · original FP32' },
  { key: 'base_onnx_uint8', label: 'MiniLM · original ONNX uint8' },
  { key: 'candidate', label: 'MiniLM · fine-tuned adapter' },
];
const repository = 'https://github.com/occult-kranti/india-corporate-intelligence';
const branch = 'codex/education-funding-intelligence';
const docs = `${repository}/blob/${branch}/docs/research-radar/fine-tuning`;
const artifacts = `${repository}/blob/${branch}/research/research-radar/fine-tuning`;
const score = (value: number) => Number.isFinite(value) ? value.toFixed(3) : 'Not estimated';
const count = (value: number) => value.toLocaleString('en-US');
const retrieverLabel = (value: string) => systems.find(system => system.key === value.replace(/-/gu, '_'))?.label ?? value.replace(/[_-]/gu, ' ');

export default function LocalModelPanel() {
  const promoted = model.status === 'promoted-retrieval-only';
  const completed = new Date(model.completedAt);
  const completedLabel = Number.isNaN(completed.getTime()) ? model.completedAt : new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York',
  }).format(completed);
  return <section className="rr-local-model" aria-labelledby="rr-local-model-title" data-local-model-panel="" data-model-status={model.status} data-default-retriever={model.defaultRetriever}>
    <header className="rr-model-header">
      <div><span className="rr-eyebrow">LOCAL MODEL / MEASURED RETRIEVAL</span><h2 id="rr-local-model-title">Training has a receipt.</h2><p>{model.modelLabel}</p></div>
      <span className="rr-model-status" data-model-promotion="">{promoted ? 'Trained · retrieval promoted' : 'Trained · experimental'}</span>
    </header>
    <p className="rr-model-purpose">Fine-tuned to retrieve relevant source summaries. Forecast probabilities remain unestimated. These results measure document ranking, not the truth of allegations or a person's likelihood of offending.</p>
    <dl className="rr-model-stats">
      <div><dt>Trainable parameters</dt><dd data-model-count="trainableParameters">{count(model.trainableParameters)}</dd></div>
      <div><dt>Training queries</dt><dd data-model-count="trainingQueries">{count(model.trainingQueries)}</dd></div>
      <div><dt>Held-out queries</dt><dd data-model-count="holdoutQueries">{count(model.holdoutQueries)}<small>across {count(model.holdoutCases)} cases</small></dd></div>
      <div><dt>Indexed summaries</dt><dd data-model-count="indexedDocuments">{count(model.indexedDocuments)}</dd></div>
    </dl>
    <div className="rr-model-comparison">
      <table data-model-comparison="">
        <caption>Held-out retrieval comparison, averaged equally across cases. Scores range from 0 to 1; higher is better. nDCG@5 rewards useful documents appearing earlier; Recall@5 measures relevant documents retrieved in the first five results. Neither is a probability or a factual-accuracy score.</caption>
        <thead><tr><th scope="col">Retriever</th><th scope="col">nDCG@5</th><th scope="col">Recall@5</th></tr></thead>
        <tbody>{systems.map(system => <tr key={system.key} data-model-system={system.key} data-candidate={system.key === 'candidate'}>
          <th scope="row">{system.label}</th>
          <td data-model-metric="ndcgAt5">{score(model.scores[system.key].ndcgAt5)}</td>
          <td data-model-metric="recallAt5">{score(model.scores[system.key].recallAt5)}</td>
        </tr>)}</tbody>
      </table>
      <aside className="rr-model-decision" aria-label="Model promotion decision">
        <span className="rr-eyebrow">RELEASE DECISION</span>
        <h3>{promoted ? 'Promoted for local retrieval.' : 'Experimental adapter retained.'}</h3>
        <p data-model-default="">Local CLI default: <strong>{retrieverLabel(model.defaultRetriever)}</strong>.</p>
        <p>{promoted ? 'The adapter met the recorded retrieval promotion criteria. Promotion does not enable numerical forecasts.' : 'Training completed, but this adapter did not pass every promotion criterion. The recorded default remains in use.'}</p>
        <p className="rr-model-execution">This page displays a saved evaluation. Model inference runs through the local CLI, not in your browser.</p>
      </aside>
    </div>
    <details className="rr-model-details">
      <summary>Training scope, release checks &amp; limitations</summary>
      <p>Training used {count(model.trainingQueries)} queries and {count(model.trainingDocuments)} documents; development used {count(model.developmentQueries)} queries. Epoch {model.selectedEpoch} was selected on development results. Held-out evaluation covers {count(model.holdoutQueries)} queries across {count(model.holdoutCases)} cases.</p>
      <h3>{model.failedCriteria.length ? 'Criteria not met' : 'Promotion checks'}</h3>
      {model.failedCriteria.length ? <ul data-model-failed-criteria="">{model.failedCriteria.map((criterion, i) => <li key={i}>{criterion}</li>)}</ul> : <p data-model-failed-criteria="">No failed criteria are recorded in this evaluation. Review the report for the exact checks and their limits.</p>}
      <h3>What the evaluation does not establish</h3><ul data-model-limitations="">{model.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul>
      <dl className="rr-model-hashes"><div><dt>Adapter SHA-256</dt><dd data-model-hash="adapter">{model.adapterSha256}</dd></div><div><dt>Evaluation SHA-256</dt><dd data-model-hash="evaluation">{model.evaluationSha256}</dd></div></dl>
    </details>
    <footer className="rr-model-footer">
      <nav aria-label="Local model training artifacts">
        <a href={`${docs}/MODEL-CARD.md`} target="_blank" rel="noopener noreferrer" data-model-link="model-card">Model card<ArrowUpRight size={13} aria-hidden="true" /></a>
        <a href={`${docs}/EVALUATION.md`} target="_blank" rel="noopener noreferrer" data-model-link="evaluation">Evaluation report<ArrowUpRight size={13} aria-hidden="true" /></a>
        <a href={`${artifacts}/adapter.safetensors`} target="_blank" rel="noopener noreferrer" data-model-link="adapter">Trained adapter<ArrowUpRight size={13} aria-hidden="true" /></a>
      </nav>
      <p>Run completed <time dateTime={model.completedAt}>{completedLabel}</time> · America/New_York</p>
    </footer>
  </section>;
}
