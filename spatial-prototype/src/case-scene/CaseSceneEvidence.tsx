/** Controlled DOM counterpart: the surviving host owns state, source dialog and dispatch.
 * Full evidence is ordinary inline DOM here; no tooltip or renderer projection owns meaning. */
import { CaseEvidenceDetails } from '../case-data/CaseDiagramPanel';
import { getSceneCase } from './catalog-bridge';
import { presentCaseScene } from './layout';
import type { CaseSceneModel } from './layout';
import type { CaseSceneState, SceneAction } from './state';
import type { CaseEdge, CaseFile, JsonValue } from './contract';
import { THREAD_STYLES, safeSourceUrl } from './contract';
import './scene-evidence.css';
export interface CaseSceneEvidenceProps {
  caseFile:CaseFile;model:CaseSceneModel;state:CaseSceneState;
  onAction:(action:SceneAction)=>void;
}
function valueText(value:JsonValue):string {
  if(value===null)return 'Unknown / not established';
  if(Array.isArray(value))return value.map(valueText).join('; ');
  if(typeof value==='object')return Object.entries(value).map(([key,v])=>`${key}: ${valueText(v)}`).join('; ');
  return String(value);
}
function ExactRole({edge,file,selected,onAction}:{edge:CaseEdge;file:CaseFile;selected:boolean;onAction:CaseSceneEvidenceProps['onAction']}) {
  const from=file.nodes.find(n=>n.id===edge.from)!,to=file.nodes.find(n=>n.id===edge.to)!;
  return <li data-edge-id={edge.id} data-predicate={edge.kind}>
    <p><strong>{from.label} → {to.label}</strong></p>
    <button type="button" aria-pressed={selected} onClick={()=>onAction({type:'select-edge',id:edge.id})}>Select relation: {edge.role}</button>
    <p>{THREAD_STYLES[edge.kind].label}</p>
    {edge.v2&&<div className="ocv2-role-qualifications">
      <p><strong>Exact predicate:</strong> {edge.v2.predicate}</p>
      <p><strong>Role capacity:</strong> {edge.v2.capacity}</p>
      <p><strong>Role financial stage:</strong> {edge.v2.financialStage}</p>
      <p><strong>Role date:</strong> {edge.v2.dateLabel}</p>
      <p><strong>Role qualification:</strong> {edge.v2.alwaysVisibleQualification}</p>
      {edge.v2.amount!==null&&<p><strong>Source-qualified role amount:</strong> {valueText(edge.v2.amount)}</p>}
      <p><strong>Role locator:</strong> {edge.v2.locator}</p>
      <ul>{edge.v2.sourceIds.map(id=>{const source=file.sources.find(s=>s.id===id)!;const url=safeSourceUrl(source.url);return <li key={id}>{source.publisher}: {url?<a href={url} target="_blank" rel="noopener noreferrer">{source.title}</a>:source.title}. {source.locator}</li>;})}</ul>
    </div>}
  </li>;
}
export function CaseSceneEvidence({caseFile,model,state,onAction}:CaseSceneEvidenceProps) {
  const file=getSceneCase(caseFile);
  if(state.caseId!==file.id||model.caseId!==file.id||model.caseFile.id!==file.id)throw new Error('Case reader/model mismatch');
  const presentation=presentCaseScene(model,state.navigation,state.camera.zoom);
  const shownEdges=state.view==='list'?file.edges:file.edges.filter(e=>state.navigation.visibleEdgeIds.includes(e.id));
  const claims=state.view==='list'?file.claims:file.claims.filter(c=>file.readerFactIds.includes(c.claimId)||shownEdges.some(e=>e.claimId===c.claimId));
  return <section className="ocv2-evidence" aria-label={`${file.label}: case evidence`} data-main-view={state.view}>
    <h2>{file.label}</h2><p><strong>Case layout · not world locations.</strong> {model.warning}</p>
    <p>Research jurisdiction: {file.researchJurisdiction.label}. {file.researchJurisdiction.qualification}</p>
    <ul aria-label="Case qualifications">{file.constraints.map((text,i)=><li key={i}>{text}</li>)}</ul>
    <nav aria-label="Case views and history">
      <button type="button" aria-pressed={state.view==='scene'} onClick={()=>onAction({type:'set-view',view:'scene'})}>Case scene</button>
      <button type="button" aria-pressed={state.view==='list'} onClick={()=>onAction({type:'set-view',view:'list'})}>Complete reader</button>
      <button type="button" disabled={!state.navigation.history.length} onClick={()=>onAction({type:'back'})}>Back within case</button>
      <button type="button" onClick={()=>onAction({type:'reset'})}>Reset case</button>
    </nav>
    <section aria-label="Complete case node index"><h3>All case nodes</h3><ul>{file.nodes.map(node=><li key={node.id} data-node-id={node.id}>
      <button type="button" aria-pressed={state.navigation.nodeId===node.id} onClick={()=>onAction({type:'select-node',id:node.id})}>{node.label}</button>
      <p>{node.kind}: {node.qualification}</p>
    </li>)}</ul></section>
    {state.view==='scene'&&<p>{presentation.threads.length} shown roles; {presentation.hiddenEligibleSpokes} eligible roles hidden; {presentation.outsideNeighborhoodSpokes} other case roles. <button type="button" disabled={!presentation.hiddenEligibleSpokes} onClick={()=>onAction({type:'reveal-more'})}>Reveal more roles</button></p>}
    <section aria-label={state.view==='scene'?'Complete evidence for shown roles and every reader-only fact':'Complete case reader'}>
      {claims.map(claim=><article key={claim.claimId} data-claim-id={claim.claimId} data-reader-only={file.readerFactIds.includes(claim.claimId)?'true':'false'}>
        {file.readerFactIds.includes(claim.claimId)?<button type="button" aria-pressed={state.navigation.factId===claim.claimId} onClick={()=>onAction({type:'select-fact',id:claim.claimId})}>Select reader-only fact: {claim.proposedLabel}</button>:<ul aria-label={`Exact roles for claim ${claim.number}`}>{shownEdges.filter(e=>e.claimId===claim.claimId).map(edge=><ExactRole key={edge.id} edge={edge} file={file} selected={state.navigation.edgeId===edge.id} onAction={onAction}/>)}</ul>}
        <CaseEvidenceDetails caseFile={file} claimId={claim.claimId}/>
      </article>)}
    </section>
  </section>;
}
