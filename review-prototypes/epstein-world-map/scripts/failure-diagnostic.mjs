// A bounded diagnostic only. This never authorizes an artifact or native pass.
// Raw error text, IDs, DOM, accessibility values and paths never leave this function.
const STATUS=new Set(['passed','failed','not-run','running']);
const FILES=Object.freeze(['native-review.mjs','world-interactions.mjs','assert-context.mjs','dom-audit.mjs']);
const unavailable=()=>({schema:'world-native-bounded-diagnostic-v1',status:'unavailable',nativeAcceptance:false,artifactApproval:false});
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
export function failureDiagnostic(report,{plannedIds,groupNames,root,sourceLineCounts}){
 try{
  if(!report||!Array.isArray(plannedIds)||plannedIds.length!==503||new Set(plannedIds).size!==503||!Array.isArray(groupNames)||groupNames.length!==17||new Set(groupNames).size!==17||typeof root!=='string'||!root.startsWith('/'))return unavailable();
  if(!Array.isArray(report.plannedCases)||report.plannedCases.length!==503||!Array.isArray(report.plannedCheckGroups)||report.plannedCheckGroups.length!==17)return unavailable();
  if(!report.plannedCases.every((v,i)=>v&&v.id===plannedIds[i]&&STATUS.has(v.status))||!report.plannedCheckGroups.every((v,i)=>v&&v.name===groupNames[i]&&STATUS.has(v.status)))return unavailable();
  const passed=report.plannedCases.filter(v=>v.status==='passed').length;
  if(!Number.isSafeInteger(report.completedCases)||report.completedCases!==passed||!['failed','automated-native-checks-passed-manual-gates-open'].includes(report.status))return unavailable();
  if(report.status==='automated-native-checks-passed-manual-gates-open'&&(passed!==503||!report.plannedCheckGroups.every(v=>v.status==='passed')))return unavailable();
  const out={schema:'world-native-bounded-diagnostic-v1',status:report.status==='failed'?'failed':'automated-complete',passedCases:passed,totalCases:503,failedGroupIndices:report.plannedCheckGroups.flatMap((v,i)=>v.status==='failed'?[i]:[]),failedCaseIndices:report.plannedCases.flatMap((v,i)=>v.status==='failed'?[i]:[]),errorKind:'unavailable',ownedSourceLocation:null,nativeAcceptance:false,artifactApproval:false};
  const error=typeof report.error==='string'&&report.error.length<=65536?report.error:'';
  if(/^AssertionError(?: \[[A-Z0-9_]+\])?:/.test(error))out.errorKind='assertion';else if(/^TimeoutError:/.test(error))out.errorKind='timeout';else if(error)out.errorKind='other';
  const prefix='file://'+root.replace(/\/$/,'')+'/scripts/';
  for(const line of error.split('\n')){
   const start=line.indexOf(prefix);if(start<0||!/^\s+at\s/.test(line))continue;
   const match=/^([a-z-]+\.mjs):([1-9]\d{0,5}):([1-9]\d{0,5})\)?\s*$/.exec(line.slice(start+prefix.length));if(!match)continue;
   const index=FILES.indexOf(match[1]),row=Number(match[2]),column=Number(match[3]);
   if(index<0||!sourceLineCounts||!own(sourceLineCounts,match[1])||!Number.isSafeInteger(sourceLineCounts[match[1]])||row>sourceLineCounts[match[1]]||column>65536)continue;
   out.ownedSourceLocation={scriptIndex:index,line:row,column};break;
  }
  return out;
 }catch{return unavailable();}
}
export const DIAGNOSTIC_SOURCE_FILES=FILES;

// Accept only a closed numeric diagnostic. This is never artifact admission.
export function axDuplicateDiagnostic(value){
 try{
  const names=['nodes','uniqueNodes','duplicateRows','identicalRows','conflictingRows'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==names.length||!names.every(k=>own(value,k)&&Number.isSafeInteger(value[k])&&value[k]>=0&&value[k]<=100000))return null;
  const {nodes,uniqueNodes,duplicateRows,identicalRows,conflictingRows}=value;
  if(nodes<2||uniqueNodes<1||duplicateRows<1||nodes!==uniqueNodes+duplicateRows||duplicateRows!==identicalRows+conflictingRows)return null;
  return {schema:'world-ax-duplicate-counts-v1',nodes,uniqueNodes,duplicateRows,identicalRows,conflictingRows,nativeAcceptance:false,artifactApproval:false};
 }catch{return null;}
}

// Closed size metadata from the trusted inventory, never an artifact grant.
const SIZE_CAPTURES=Object.freeze(['01-initial','02-source-narrow-320','02-source-narrow-390','03-forced-colors-capacities','04-anchor-scotus','05-anchor-nydfs','06-anchor-usvi','07-critical-petition','08-schematic-relations','09-desktop-1024','failure']);
const SIZE_MEMBERS=Object.freeze([
 ...['report.json','summary.md','producer-receipt.json','trace.zip','network.har'].map((path,i)=>({path,kind:['report','summary','producer','trace','network'][i]})),
 ...SIZE_CAPTURES.flatMap(path=>[['png','image'],['html','dom'],['ax.json','accessibility']].map(([suffix,kind])=>({path:path+'.'+suffix,kind}))),
]);
export function evidenceSizeDiagnostic(rows){
 try{
  if(!Array.isArray(rows)||rows.length<1||rows.length>38)return null;
  const seen=new Set(),members=[];let totalBytes=0;
  for(const row of rows){
   if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==4||!['path','bytes','sha256','gitBlob'].every(k=>own(row,k)))return null;
   const index=SIZE_MEMBERS.findIndex(v=>v.path===row.path);
   if(index<0||seen.has(index)||!Number.isSafeInteger(row.bytes)||row.bytes<0||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sha256)||typeof row.gitBlob!=='string'||!/^[a-f0-9]{40}$/.test(row.gitBlob))return null;
   seen.add(index);totalBytes+=row.bytes;if(!Number.isSafeInteger(totalBytes))return null;
   members.push({memberIndex:index,memberClass:SIZE_MEMBERS[index].kind,bytes:row.bytes});
  }
  return {schema:'world-evidence-size-diagnostic-v1',memberCount:members.length,totalBytes,memberLimitBytes:134217728,totalLimitBytes:536870912,members:members.sort((a,b)=>a.memberIndex-b.memberIndex),nativeAcceptance:false,artifactApproval:false};
 }catch{return null;}
}

// Failure-only focus metadata. Content, IDs, selectors and paths are excluded.
export function focusBoundaryDiagnostic(value){
 try{
  const names=['phase','controlCount','expectedOrdinal','activeOrdinal','activeContained','first','last','active'];
  const flags=['hasRect','visible','disabled','hidden','inert','closedDetails'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==names.length||!names.every(k=>own(value,k)))return null;
  if(!['forward-wrap','reverse-wrap'].includes(value.phase)||!Number.isSafeInteger(value.controlCount)||value.controlCount<1||value.controlCount>10000)return null;
  if(value.expectedOrdinal!==(value.phase==='forward-wrap'?0:value.controlCount-1)||!Number.isSafeInteger(value.activeOrdinal)||value.activeOrdinal< -1||value.activeOrdinal>=value.controlCount||typeof value.activeContained!=='boolean'||(value.activeOrdinal>=0&&!value.activeContained))return null;
  for(const name of ['first','last','active']){const v=value[name];if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==flags.length||!flags.every(k=>own(v,k)&&typeof v[k]==='boolean'))return null;}
  return {schema:'world-focus-boundary-diagnostic-v1',phase:value.phase,controlCount:value.controlCount,expectedOrdinal:value.expectedOrdinal,activeOrdinal:value.activeOrdinal,activeContained:value.activeContained,first:Object.fromEntries(flags.map(k=>[k,value.first[k]])),last:Object.fromEntries(flags.map(k=>[k,value.last[k]])),active:Object.fromEntries(flags.map(k=>[k,value.active[k]])),nativeAcceptance:false,artifactApproval:false};
 }catch{return null;}
}

// Header classifications are names only; member bodies are never inspected here.
export function traceHeaderDiagnostic(value){
 try{
  const closed=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>own(v,k));
  const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
  if(closed(value,['status','code'])&&value.status==='unavailable'&&['archive_budget','header_budget','entry_budget','expanded_budget','malformed','unsupported','input_pin','unavailable'].includes(value.code))return {schema:'world-trace-header-diagnostic-v1',status:'unavailable',code:value.code,nativeAcceptance:false,artifactApproval:false};
  if(!closed(value,['status','archiveBytes','entryCount','centralDirectoryBytes','compressedBytes','uncompressedBytes','duplicateMemberNameCount','classes'])||value.status!=='headers_only')return null;
  if(!integer(value.archiveBytes,536870912)||value.archiveBytes<22||!integer(value.entryCount,49999)||!integer(value.centralDirectoryBytes,16777216)||!integer(value.compressedBytes,536870912)||!integer(value.uncompressedBytes,536870912)||!integer(value.duplicateMemberNameCount,value.entryCount)||!Array.isArray(value.classes)||value.classes.length!==6)return null;
  let entries=0,compressed=0,uncompressed=0,duplicates=0;
  for(const [i,r] of value.classes.entries()){
   if(!closed(r,['classIndex','entryCount','compressedBytes','uncompressedBytes','duplicateMemberNameCount'])||r.classIndex!==i||!integer(r.entryCount,49999)||!integer(r.compressedBytes,536870912)||!integer(r.uncompressedBytes,536870912)||!integer(r.duplicateMemberNameCount,r.entryCount))return null;
   if(!r.entryCount&&(r.compressedBytes||r.uncompressedBytes||r.duplicateMemberNameCount))return null;
   entries+=r.entryCount;compressed+=r.compressedBytes;uncompressed+=r.uncompressedBytes;duplicates+=r.duplicateMemberNameCount;
  }
  if(entries!==value.entryCount||compressed!==value.compressedBytes||uncompressed!==value.uncompressedBytes||duplicates!==value.duplicateMemberNameCount||compressed+value.centralDirectoryBytes+22>value.archiveBytes)return null;
  return {schema:'world-trace-header-diagnostic-v1',...value,classification:'member_names_only_no_content_identity',duplicateMeaning:'repeated_member_names_only',nativeAcceptance:false,artifactApproval:false};
 }catch{return null;}
}
