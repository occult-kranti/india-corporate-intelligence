import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,open,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inventory,ROOT} from '../scripts/contract.mjs';
import {evidenceSizeDiagnostic,evidenceSizeMetadataDiagnostic} from '../scripts/failure-diagnostic.mjs';
import {assertProposedOuterBudgets} from '../scripts/evidence-budget-proposal.mjs';
async function denied(files,options={evidenceMetadata:true}){
 const dir=await mkdtemp(join(tmpdir(),'world-size-correction-'));let sizeDiagnostic=null,error;
 try{
  for(const [name,size]of Object.entries(files)){const h=await open(join(dir,name),'w');try{await h.truncate(size);}finally{await h.close();}}
  // Exact wrapper order: a rejected inventory now transports only its closed
  // metadata diagnostic to the catch; no body hashing is reached on denial.
  try{const rows=await inventory(dir,options);sizeDiagnostic=evidenceSizeDiagnostic(rows);assertProposedOuterBudgets(rows);}
  catch(e){if(e.sizeDiagnostic)sizeDiagnostic=e.sizeDiagnostic;error=e;}
  assert(error);return {code:error.message,sizeDiagnostic};
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('reviewer sparse member plus one retains bounded diagnostic in wrapper order',async()=>{
 const result=await denied({'network.har':134217729});assert.equal(result.code,'EVIDENCE_MEMBER_BUDGET');assert.equal(result.sizeDiagnostic.totalBytes,134217729);assert.deepEqual(result.sizeDiagnostic.members,[{memberIndex:4,memberClass:'network',bytes:134217729}]);assert.equal(result.sizeDiagnostic.artifactApproval,false);assert(!JSON.stringify(result.sizeDiagnostic).includes('network.har'));
});
test('aggregate plus one retains every allowlisted metadata row',async()=>{
 const result=await denied({'trace.zip':268435456,'network.har':134217728,'report.json':134217728,'summary.md':1});assert.equal(result.code,'EVIDENCE_BUDGET');assert.equal(result.sizeDiagnostic.memberCount,4);assert.equal(result.sizeDiagnostic.totalBytes,536870913);assert.equal(result.sizeDiagnostic.totalLimitBytes,536870912);
});
test('unrecognized member wins before size processing without path disclosure',async()=>{
 const result=await denied({'private-address@example.invalid':134217729});assert.equal(result.code,'UNEXPECTED_OR_MALFORMED_EVIDENCE_METADATA');assert.equal(result.sizeDiagnostic,null);assert(!JSON.stringify(result).includes('private-address'));
});
test('malformed metadata cannot become a size diagnostic',()=>{
 for(const rows of [[{path:'network.har',bytes:NaN}],[{path:'network.har',bytes:-1}],[{path:'network.har',bytes:1,raw:'secret'}],[{path:'network.har',bytes:1},{path:'network.har',bytes:1}],[{path:'unknown',bytes:1}],Array.from({length:39},()=>({path:'network.har',bytes:1}))])assert.equal(evidenceSizeMetadataDiagnostic(rows),null);
 assert.equal(evidenceSizeDiagnostic([{path:'network.har',bytes:1,sha256:'x',gitBlob:'y'}]),null);
});
test('shared aggregate explicitly includes added audit receipt before filtering',async()=>{
 const result=await denied({'trace.zip':268435456,'network.har':134217728,'report.json':134217728,'artifact-manifest.json':1},{});assert.equal(result.code,'EVIDENCE_BUDGET');assert.equal(result.sizeDiagnostic,null);
 const exact=[{path:'trace.zip',bytes:268435456},{path:'network.har',bytes:134217728},{path:'report.json',bytes:134217728}];assertProposedOuterBudgets(exact);assert.throws(()=>assertProposedOuterBudgets([...exact,{path:'artifact-manifest.json',bytes:1}]),/EVIDENCE_BUDGET/);
});
test('actual wrapper requests metadata and preserves catch diagnostic and denials',async()=>{
 const source=await readFile(join(ROOT,'scripts/artifact-audit.mjs'),'utf8');assert(source.includes('inventory(root,{evidenceMetadata:true})'));assert(source.includes('if(e.sizeDiagnostic)sizeDiagnostic=e.sizeDiagnostic;'));assert(source.includes("if(['EVIDENCE_BUDGET','EVIDENCE_MEMBER_BUDGET'].includes(decision.validationCode)&&sizeDiagnostic)console.log(JSON.stringify(sizeDiagnostic));"));assert(source.includes('requireApprovedEvidenceBudget();'));assert(source.includes('timeout:120000'));
});
