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
