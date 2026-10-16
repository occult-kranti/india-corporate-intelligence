import { useEffect, useId, useRef, useState } from 'react';
import type { CaseClaim, CaseEdge, CaseFile, CaseNode, JsonValue } from './contract';
import { CASE_WARNING, THREAD_STYLES, safeSourceUrl } from './contract';
import { getVerifiedCaseFile, getPinnedReaderFallback } from './adapter';
import { availableEdges, initialNavigation, MAX_REVEAL, navigateCase } from './navigation';
import type { CaseAction } from './navigation';
import { createDetailFocus, createEvidenceFocus } from './focus';
import './case-diagrams.css';

export interface CaseDiagramPanelProps {
  caseFile:CaseFile|null;
  initialView?:'diagram'|'list';
  onClose?:()=>void;
  returnFocusRef?:{readonly current:HTMLElement|null};
}
const words=(s:string)=>s.replace(/_/g,' ');
const fieldLabel=(s:string)=>words(s.replace(/([a-z0-9])([A-Z])/g,'$1 $2'));
function valueText(value:JsonValue):string {
  if(value===null) return 'Unknown / not established';
  if(Array.isArray(value)) return value.map(valueText).join('; ');
  if(typeof value==='object') return Object.entries(value).map(([k,v])=>`${words(k)}: ${valueText(v)}`).join('; ');
  return String(value);
}
function DetailFields({fields}:{fields:{[key:string]:JsonValue}}) {
  return <dl className="ocd-fields">{Object.entries(fields).map(([key,value])=><div key={key}><dt>{fieldLabel(key)}</dt><dd>{valueText(value)}</dd></div>)}</dl>;
}
function NodeButton({node,selected,onSelect}:{node:CaseNode;selected:boolean;onSelect:()=>void}) {
  return <button type="button" className={`ocd-node ${selected?'ocd-selected':''}`} aria-pressed={selected} onClick={onSelect} data-node-id={node.id} data-node-kind={node.kind}>
    <span className="ocd-facet" aria-hidden="true">◇</span><strong>{node.label}</strong><span>{words(node.kind)}</span><small>{node.qualification}</small>
  </button>;
}
/** These guards are rendered in the relation, never hidden in title/hover metadata. */
function V2VisibleGuards({file,claim}:{file:CaseFile;claim:CaseClaim}) {
  if(!claim.v2)return null;
  return <div className="ocd-v2-guards">
    {Object.keys(claim.v2.flags).length>0&&<><h4>Source holds and unresolved boundaries</h4><DetailFields fields={claim.v2.flags}/></>}
    {claim.v2.nonAdditionGroupIds.map(id=>{const g=file.v2!.nonAdditionGroups.find(x=>x.id===id)!;return <p className="ocd-mandatory" key={id}><strong>Non-addition: {words(g.aggregation)}.</strong> {g.qualification}</p>;})}
    {claim.v2.recursiveDependencyClaimIds.map(id=>{const dep=file.claims.find(c=>c.claimId===id)!;return <div key={id} className="ocd-mandatory"><p><strong>Required context {dep.number}:</strong> {dep.proposedLabel}. {dep.dateLabel}</p>{dep.v2&&Object.keys(dep.v2.flags).length>0&&<DetailFields fields={dep.v2.flags}/>}<p>The complete context is included in Inspect sources and full claim.</p></div>;})}
  </div>;
}
function RelationCard({file,edge,selectedNodeId,selectedEdgeId,onAction,onEvidence,mode}:{file:CaseFile;edge:CaseEdge;selectedNodeId:string|null;selectedEdgeId:string|null;onAction:(a:CaseAction)=>void;onEvidence:(c:CaseClaim)=>void;mode:'diagram'|'list'}) {
  const claim=file.claims.find(c=>c.claimId===edge.claimId)!;
  const from=file.nodes.find(n=>n.id===edge.from)!;const to=file.nodes.find(n=>n.id===edge.to)!;
  const style=THREAD_STYLES[edge.kind];
  return <li className={`ocd-relation ocd-${mode} ${claim.classCode==='B'?'ocd-qualified':''} ${selectedEdgeId===edge.id?'ocd-selected':''}`} data-edge-id={edge.id} data-claim-id={claim.claimId}>
    <NodeButton node={from} selected={selectedNodeId===from.id} onSelect={()=>onAction({type:'select-node',id:from.id})}/>
    <div className="ocd-relation-body">
      <svg className="ocd-string" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M2 8 C70 2 205 14 292 8" strokeDasharray={style.dash}/><path d="m285 3 8 5-8 5"/></svg>
      <p className="ocd-eyebrow">{claim.classCode==='B'?'Qualified relation · unresolved scope retained':'Typed case relation'} · {style.label}</p>
      <p><strong>{from.label} → {to.label}</strong></p>
      <button className="ocd-edge-button" type="button" aria-pressed={selectedEdgeId===edge.id} onClick={()=>onAction({type:'select-edge',id:edge.id})}>Select relation: {edge.role}</button>
      {edge.role!==claim.proposedLabel&&<p><strong>Source-attributed statement:</strong> {claim.proposedLabel}</p>}
      <p className="ocd-mandatory"><strong>Required qualification:</strong> {claim.alwaysVisibleQualification}</p>
      <p><strong>Date:</strong> {claim.dateLabel}<br/><strong>Date basis:</strong> {valueText(claim.dates.dateBasis??null)}</p>
      <p><strong>Capacity / directness:</strong> {claim.capacityAndDirectness}</p>
      {edge.v2&&<><p><strong>Exact predicate:</strong> {words(edge.v2.predicate)}<br/><strong>This role's capacity:</strong> {edge.v2.capacity}<br/><strong>This role's financial stage:</strong> {words(edge.v2.financialStage)}</p>{edge.v2.amount!==null&&<p><strong>Source-qualified amount:</strong> {valueText(edge.v2.amount)}</p>}</>}
      <V2VisibleGuards file={file} claim={claim}/>
      <p><strong>Direction means:</strong> {claim.directionMeaning}</p>
      <p><strong>Boundary:</strong> {claim.mandatoryBoundary}</p>
      {claim.exclusions.map((x,i)=><p className="ocd-mandatory" key={i}>{x.statement}</p>)}
      {claim.sharedBlockId&&<p className="ocd-mandatory">Shared block: {claim.sharedBlockId}. Non-additive; roles and spokes do not create extra holdings, transfers or individual allocations.</p>}
      <p className="ocd-attribution"><strong>Sources:</strong> {[...new Set(claim.sourceIds.map(id=>file.sources.find(v=>v.id===id)!.publisher))].join(' · ')}<br/><strong>Locator:</strong> {claim.reviewedSourceLocator}</p>
      <button type="button" onClick={()=>onEvidence(claim)} aria-haspopup="dialog">Inspect sources and full claim {claim.number}</button>
    </div>
    <NodeButton node={to} selected={selectedNodeId===to.id} onSelect={()=>onAction({type:'select-node',id:to.id})}/>
  </li>;
}
function ClaimEvidence({file,claim,includeContext=true}:{file:CaseFile;claim:CaseClaim;includeContext?:boolean}) {
  return <div className="ocd-evidence-content">
    <p className="ocd-eyebrow">{claim.classCode==='R'?'Reader-only fact · no relationship arrow':'Case-local relation evidence'} · Claim {claim.number}</p>
    <h3>{claim.proposedLabel}</h3><p>{claim.statement}</p>
    <p><strong>Reviewed endpoint wording:</strong> {claim.proposedEndpoints}</p>
    <p className="ocd-mandatory">{claim.alwaysVisibleQualification}</p>
    <p><strong>Capacity / directness:</strong> {claim.capacityAndDirectness}<br/><strong>Direction means:</strong> {claim.directionMeaning}</p>
    <p><strong>Date:</strong> {claim.dateLabel}<br/><strong>Boundary:</strong> {claim.mandatoryBoundary}<br/><strong>Financial stage:</strong> {words(claim.financialStage)}</p>
    <V2VisibleGuards file={file} claim={claim}/>
    {claim.v2&&<><h4>Exact source date fields</h4><DetailFields fields={claim.v2.sourceDateFields}/><h4>Original source claim record</h4><DetailFields fields={claim.v2.originalClaimRecord}/><h4>Exact direct source references</h4><ul>{claim.v2.directSourceIds.map(id=><li key={id}>{id}</li>)}</ul></>}
    <h4>Original date roles and precision</h4><DetailFields fields={claim.dates}/>
    {Object.keys(claim.details).length>0&&<><h4>Source quantities and scope</h4><DetailFields fields={claim.details}/></>}
    <h4>Qualifications and exclusions</h4><ul>{claim.qualifications.map((q,i)=><li key={i}>{q}</li>)}{claim.exclusions.map((q,i)=><li key={`x${i}`} className="ocd-mandatory">{q.statement}</li>)}</ul>
    {claim.sharedBlockId&&<p>Shared block: {claim.sharedBlockId}. Non-additive; individual allocations remain unknown.</p>}
    <p>Claim reference: {claim.claimId}</p>
    <h4>Retained-source review</h4><p>{claim.review.scope} Checked {claim.review.reviewedOn}. {words(claim.review.disposition)}.</p>
    <ul>{claim.reviewLimitations.map((v,i)=><li key={i}>{v}</li>)}</ul>
    <h4>Sources</h4><ul className="ocd-sources">{claim.sourceIds.map(id=>{
      const s=file.sources.find(v=>v.id===id)!;const url=safeSourceUrl(s.url);
      return <li key={id}><h4>{s.title}</h4><p>{s.publisher}<br/><strong>Claim locator:</strong> {claim.reviewedSourceLocator}<br/><strong>Source locator:</strong> {s.locator}</p>
        <p>Published: {s.publishedOn??'Unknown'} · Accessed: {s.accessedOn}. Retrieval is not a relationship date.</p>
        <DetailFields fields={s.dateFields}/><p><strong>Access depth:</strong> {words(s.accessDepth)}<br/><strong>Custody:</strong> {words(s.custody)}<br/><strong>Source family:</strong> {s.sourceFamily??'Not established'}. Dependent sources are not independent corroboration.</p>
        {s.exclusions.map((v,i)=><p key={i} className="ocd-mandatory">{v.statement}</p>)}
        {url?<a href={url} target="_blank" rel="noopener noreferrer">Open original public source (new tab)</a>:<p>Original public source URL unavailable.</p>}</li>;
    })}</ul>
    {includeContext&&claim.v2&&claim.v2.recursiveDependencyClaimIds.length>0&&<section aria-label="Required recursive claim context"><h4>Complete required claim context</h4>{claim.v2.recursiveDependencyClaimIds.map(id=><ClaimEvidence key={id} file={file} claim={file.claims.find(c=>c.claimId===id)!} includeContext={false}/>)}</section>}
  </div>;
}
/** Reusable evidence body for an incumbent reader/modal; IDs must belong to the pinned case. */
export function CaseEvidenceDetails({caseFile,claimId}:{caseFile:CaseFile;claimId:string}) {
  const file=getVerifiedCaseFile(caseFile);
  const claim=file.claims.find(c=>c.claimId===claimId);
  if(!claim) throw new Error('Unknown claim in reviewed case');
  return <ClaimEvidence file={file} claim={claim}/>;
}
function ValidCaseDiagram({caseFile:file,initialView='diagram',onClose,returnFocusRef}:CaseDiagramPanelProps&{caseFile:CaseFile}) {
  const titleId=useId();const detailId=useId();const dialogTitle=useId();const viewId=useId();
  const [state,setState]=useState(()=>initialNavigation(file));
  const [view,setView]=useState<'diagram'|'list'>(initialView);
  const [modalClaim,setModalClaim]=useState<CaseClaim|null>(null);
  const detailHeading=useRef<HTMLHeadingElement>(null);const dialog=useRef<HTMLDialogElement>(null);
  const detailFocus=useRef(createDetailFocus());const evidenceFocus=useRef(createEvidenceFocus());
  const act=(action:CaseAction)=>{detailFocus.current.request();setState(s=>navigateCase(file,s,action));};
  useEffect(()=>{detailFocus.current.commit(detailHeading.current);},[state]);
  useEffect(()=>{if(modalClaim&&!dialog.current?.open)dialog.current?.showModal();},[modalClaim]);
  const closeEvidence=()=>{dialog.current?.close();setModalClaim(null);evidenceFocus.current.restore();};
  const showEvidence=(claim:CaseClaim)=>{evidenceFocus.current.capture(document.activeElement instanceof HTMLElement?document.activeElement:null);setModalClaim(claim);};
  const selectedNode=file.nodes.find(n=>n.id===state.nodeId);
  const selectedEdge=file.edges.find(e=>e.id===state.edgeId);
  const selectedClaim=file.claims.find(c=>c.claimId===(selectedEdge?.claimId??state.factId));
  const available=availableEdges(file,state);const hidden=Math.max(0,available.length-state.visibleEdgeIds.length);
  const visibleEdges=file.edges.filter(e=>state.visibleEdgeIds.includes(e.id));
  const card=(edge:CaseEdge,mode:'diagram'|'list')=><RelationCard key={edge.id} file={file} edge={edge} selectedNodeId={state.nodeId} selectedEdgeId={state.edgeId} onAction={act} onEvidence={showEvidence} mode={mode}/>;
  return <article className="ocd-panel" aria-labelledby={titleId} data-case-id={file.id} data-public-graph-eligible="false" data-path-eligible="false" data-aggregate-eligible="false" onKeyDown={e=>{if(e.key==='Escape'&&!modalClaim&&onClose){e.stopPropagation();onClose();returnFocusRef?.current?.focus();}}}>
    <header className="ocd-header"><div><p className="ocd-eyebrow">Case diagram · source-qualified historical statements</p><h2 id={titleId}>{file.label}</h2></div>{onClose&&<button type="button" onClick={()=>{onClose();returnFocusRef?.current?.focus();}}>Close case</button>}</header>
    <p>Research jurisdiction: {file.researchJurisdiction.label}. {file.researchJurisdiction.qualification}</p>
    <p className="ocd-warning">{CASE_WARNING}</p><p className="ocd-warning">Case-local labels only. Global identities, geography and path admission remain blocked. No map location or camera movement is attached to this view.</p>
    {file.constraints.length>0&&<section className="ocd-boundaries" aria-label="Case-wide source limits"><h3>Keep these boundaries in view</h3><ul>{file.constraints.map((v,i)=><li key={i}>{v}</li>)}</ul></section>}
    <nav className="ocd-toolbar" aria-label="Case navigation"><button type="button" disabled={!state.history.length} onClick={()=>act({type:'back'})}>Back</button><button type="button" onClick={()=>act({type:'reset'})}>Reset case</button><a href={`#${detailId}`}>Jump to selected detail</a></nav>
    {file.v2&&<p className="ocd-warning">{file.v2.legacySceneHoldReason}</p>}
    <p className="ocd-counts">{file.claims.length} source claims · {file.claims.filter(c=>c.classCode!=='R').length} drawable claims · {file.readerFactIds.length} reader-only facts. {file.edges.length} explicit spokes; spokes are not additional claims or payments.</p>
    <section aria-label="Case nodes"><h3>Select a case-local node</h3><ul className="ocd-node-index">{file.nodes.map(n=><li key={n.id}><button type="button" aria-pressed={state.nodeId===n.id} onClick={()=>act({type:'select-node',id:n.id})}>{n.label}</button></li>)}</ul>{!file.nodes.length&&<p>No reviewed relation in this case.</p>}</section>
    <div className="ocd-toolbar" role="group" aria-label="Relationship view"><button type="button" aria-pressed={view==='diagram'} aria-controls={viewId} onClick={()=>setView('diagram')}>Diagram</button><button type="button" aria-pressed={view==='list'} aria-controls={viewId} onClick={()=>setView('list')}>Full accessible list</button></div>
    <section id={viewId} aria-label={view==='diagram'?'Source-qualified case diagram':'Complete accessible relationship list'}>
      <h3>{view==='diagram'?'Documentary connections':'Full relationship list'}</h3>
      <p>{view==='diagram'?'Strings follow each statement’s direction. Incoming and outgoing neighbors are retained; selection never reverses a predicate. Uniform width has no amount or certainty meaning.':`All ${file.edges.length} explicit spokes, with the same node selection, relation selection, dates, qualifications and source details. This list works without a graphic, WebGL or map tiles.`}</p>
      <ul className={view==='diagram'?'ocd-diagram':'ocd-full-list'}>{(view==='diagram'?visibleEdges:file.edges).map(e=>card(e,view))}</ul>
      {view==='diagram'&&<>{!visibleEdges.length&&<p>No reviewed relation in this case. This does not establish zero ownership.</p>}<p role="status" aria-live="polite">{visibleEdges.length} of {available.length} eligible adjacent spokes shown. {hidden} hidden. Switch to Full accessible list to inspect every reviewed spoke.</p><button type="button" disabled={hidden===0||state.visibleEdgeIds.length>=MAX_REVEAL} onClick={()=>act({type:'reveal-more'})}>Reveal up to 4 more neighbors</button></>}
    </section>
    <section className="ocd-selected-detail" aria-labelledby={detailId}><h3 id={detailId} ref={detailHeading} tabIndex={-1}>Selected detail</h3>
      {selectedNode?<><h4>{selectedNode.label}</h4><p>{words(selectedNode.kind)}. {selectedNode.qualification}</p><p>No canonical registry identity or location assigned.</p><ul>{selectedNode.claimIds.map(id=>{const claim=file.claims.find(c=>c.claimId===id)!;return <li key={id}><button type="button" onClick={()=>showEvidence(claim)} aria-haspopup="dialog">Inspect claim {claim.number}: {claim.proposedLabel}</button></li>;})}</ul></>:selectedClaim?<ClaimEvidence file={file} claim={selectedClaim}/>:<p>Select a node or a relation to inspect its source-bound detail. No profile-to-company relation is presumed.</p>}
    </section>
    <section aria-label="Reader-only source facts"><h3>Reader-only facts</h3><p>These facts do not create nodes, arrows, allocations or payments.</p><ul className="ocd-facts">{file.readerFactIds.map(id=>{const c=file.claims.find(v=>v.claimId===id)!;return <li key={id}><h4>{c.proposedLabel}</h4><p>{c.alwaysVisibleQualification}</p><p>{c.dateLabel}</p><p>{c.mandatoryBoundary}</p><V2VisibleGuards file={file} claim={c}/>{c.exclusions.map((v,i)=><p key={i}>{v.statement}</p>)}<button type="button" onClick={()=>act({type:'select-fact',id})}>Select reader fact {c.number}</button><button type="button" onClick={()=>showEvidence(c)} aria-haspopup="dialog">Inspect fact sources</button></li>;})}</ul>{!file.readerFactIds.length&&<p>No additional reader-only facts in this reviewed case.</p>}</section>
    <dialog className="ocd-evidence-dialog" ref={dialog} aria-labelledby={dialogTitle} onCancel={e=>{e.preventDefault();closeEvidence();}} onClose={()=>{if(dialog.current?.open)return;setModalClaim(null);evidenceFocus.current.restore();}}>
      {modalClaim&&<><div className="ocd-header"><h2 id={dialogTitle}>Source evidence · claim {modalClaim.number}</h2><button autoFocus type="button" onClick={closeEvidence}>Close evidence</button></div><p>{CASE_WARNING}</p><ClaimEvidence file={file} claim={modalClaim}/></>}
    </dialog>
  </article>;
}
/** Changing case keys remounts all selection/history/modal state: no stale cross-case detail. */
export function CaseDiagramPanel(props:CaseDiagramPanelProps) {
  if(!props.caseFile)return <section className="ocd-panel" aria-label="Case diagram unavailable"><p>No reviewed case is available. No relationship, location or zero-ownership conclusion is inferred.</p></section>;
  let verified:CaseFile;
  try {verified=getVerifiedCaseFile(props.caseFile);} catch {
    // Never render mutated content or reconstruct its missing qualifiers. Only the separate,
    // immutable reviewed reader may be used, and only when both local case keys match.
    const matchingReader=getPinnedReaderFallback(props.caseFile);
    return <section className="ocd-panel" aria-label="Unverified diagram; source reader fallback"><p role="alert">This case could not be verified against the reviewed display projection. Its diagram is withheld.</p>{matchingReader?<><h2>{matchingReader.label}: complete pinned source reader</h2><p>{CASE_WARNING}</p>{matchingReader.constraints.map((text,i)=><p key={i}>{text}</p>)}{matchingReader.claims.map(claim=><ClaimEvidence key={claim.claimId} file={matchingReader} claim={claim}/>)}</>:<p>No matching verified reader is available. No relationship or zero-ownership conclusion is inferred.</p>}</section>;
  }
  return <ValidCaseDiagram key={verified.id} {...props} caseFile={verified}/>;
}
