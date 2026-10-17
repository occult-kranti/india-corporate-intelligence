import assert from 'node:assert/strict';
import {readFile,writeFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {ROOT,inventory,requireNativeCI,readInputs,sha} from './contract.mjs';
import {AUTOMATIC_PUBLICATION_ENABLED,HOLD_REASON} from './evidence-policy.mjs';
import {evidenceRoot,invalidateGrants,runBinding,validateProducer} from './evidence-binding.mjs';
import {validateReport,summaryFor} from './report-contract.mjs';
import {axDuplicateDiagnostic} from './failure-diagnostic.mjs';
let root,decision={schema:'native-evidence-audit-v2',auditId:randomUUID(),status:'DENY',publicationApproved:false,diagnostics:[]};
try{
 root=evidenceRoot();await invalidateGrants(root); // Before CI/input/report checks can fail.
 requireNativeCI();assert.equal(spawnSync(process.execPath,[resolve(ROOT,'scripts/verify-package.mjs')],{stdio:'ignore'}).status,0,'EXACT_PACKAGE_REQUIRED');const inputs=await readInputs();const manifestSha256=sha(await readFile(resolve(ROOT,'manifest.json'))),binding=runBinding(process.env,manifestSha256);decision={...decision,...binding};
 const rows=await inventory(root);const allowed=/^(report\.json|summary\.md|producer-receipt\.json|trace\.zip|network\.har|(?:01-initial|02-source-narrow-(?:320|390)|03-forced-colors-capacities|04-anchor-scotus|05-anchor-nydfs|06-anchor-usvi|07-critical-petition|08-schematic-relations|09-desktop-1024|failure)\.(?:png|html|ax\.json))$/;
 assert(rows.every(r=>allowed.test(r.path)),'UNEXPECTED_EVIDENCE_MEMBER');assert(rows.length<=38,'EVIDENCE_MEMBER_COUNT');assert(rows.reduce((n,r)=>n+r.bytes,0)<=512*1024*1024,'EVIDENCE_BUDGET');assert(rows.every(r=>r.bytes<=128*1024*1024),'EVIDENCE_MEMBER_BUDGET');decision.members=rows;
 const report=JSON.parse(await readFile(resolve(root,'report.json'),'utf8'));
 decision.report=validateReport(report,{...inputs,env:process.env,manifestSha256,memberPaths:rows.map(r=>r.path)});
 assert(!report.cleanupErrors?.length&&!report.receiptErrors?.length&&!report.traceError&&!report.closeError,'PRODUCER_CLEANUP_OR_RECEIPTS_INCOMPLETE');
 assert.equal(await readFile(resolve(root,'summary.md'),'utf8'),summaryFor(report),'SUMMARY_TEMPLATE_MISMATCH');
 decision.producer=await validateProducer(root,binding,rows);
 for(const r of rows.filter(r=>!['report.json','summary.md','producer-receipt.json'].includes(r.path))){const result=spawnSync('python3',[resolve(ROOT,'scripts/audit-raw.py'),resolve(root,r.path),ROOT],{encoding:'utf8',maxBuffer:2*1024*1024,timeout:120000});if(result.status!==0){let code='RAW_CHECK_UNAVAILABLE',axDuplicates=null;try{const parsed=JSON.parse(result.stdout);if(/^[A-Z_]+$/.test(parsed.code??''))code=parsed.code;if(code==='AX_NODE_DUPLICATE_ID')axDuplicates=axDuplicateDiagnostic(parsed.axDuplicateCounts);}catch{}decision.diagnostics.push({path:r.path,code,boundedSchemaSupported:false,...(axDuplicates?{axDuplicates}:{})});throw new Error('RAW_STRUCTURE_OR_CONTENT_DENIED');}const d=JSON.parse(result.stdout);decision.diagnostics.push({path:r.path,...d});}
 // Parsing a class is not proof of its full provenance. Unsupported classes keep
 // the complete envelope private. Do not turn this hold into filename approval.
 assert(AUTOMATIC_PUBLICATION_ENABLED&&decision.diagnostics.every(d=>d.boundedSchemaSupported===true),'UNSUPPORTED_RAW_SCHEMA');
 if(report.status==='automated-native-checks-passed-manual-gates-open'){const trace=decision.diagnostics.find(d=>d.path==='trace.zip'),har=decision.diagnostics.find(d=>d.path==='network.har');assert(trace?.frameSnapshots&&trace?.networkObserved&&trace?.screencastImages>0&&trace?.actionCalls>=503&&trace?.completedCalls===trace?.actionCalls,'SUCCESS_TRACE_INCOMPLETE');assert(har?.entries>0,'SUCCESS_HAR_EMPTY');}
 decision.status='PASS_BOUNDED_APPROVED_PRODUCER_ENVELOPE';decision.publicationApproved=true;decision.nativeStatus=report.status;decision.semanticPrivacyCertified=false;decision.threatModel='trusted-frozen-producer-pinned-inputs-fresh-secret-free-page-v1';
}catch(e){decision.status='HOLD';decision.reason=HOLD_REASON;decision.validationCode=/^[A-Z_]+$/.test(e.message??'')?e.message:'VALIDATION_FAILED';process.exitCode=1;}
// A denied receipt is local/on-runner only. It contains no raw error/body text.
try{if(root)await writeFile(resolve(root,'artifact-manifest.json'),JSON.stringify(decision,null,2)+'\n');}catch{decision.receiptUnavailable=true;decision.publicationApproved=false;decision.status='DENY';process.exitCode=1;}
if(process.env.GITHUB_OUTPUT)try{await appendFile(process.env.GITHUB_OUTPUT,decision.publicationApproved?`approved=true\nmanifest_sha256=${sha(await readFile(resolve(root,'artifact-manifest.json')))}\naudit_id=${decision.auditId}\n`:'approved=false\n');}catch{process.exitCode=1;}
console.log(JSON.stringify({status:decision.status,reason:decision.reason,validationCode:decision.validationCode,rawSchemaCodes:decision.diagnostics.map(d=>d.code).filter(Boolean),publicationApproved:decision.publicationApproved}));
for(const d of decision.diagnostics){const counts=axDuplicateDiagnostic(d.axDuplicates&&Object.fromEntries(['nodes','uniqueNodes','duplicateRows','identicalRows','conflictingRows'].map(k=>[k,d.axDuplicates[k]])));if(counts)console.log(JSON.stringify(counts));}
