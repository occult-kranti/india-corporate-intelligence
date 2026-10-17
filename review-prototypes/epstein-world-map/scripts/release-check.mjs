import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROOT,sha,inventory,requireNativeCI,readInputs} from './contract.mjs';
import {AUTOMATIC_PUBLICATION_ENABLED} from './evidence-policy.mjs';
import {evidenceRoot,invalidateGrants,runBinding,validateProducer} from './evidence-binding.mjs';
import {validateReport,summaryFor} from './report-contract.mjs';
export async function verifyCurrentRelease(env=process.env){
 const root=evidenceRoot(env);let bytes;try{bytes=await readFile(resolve(root,'artifact-manifest.json'));}finally{await invalidateGrants(root,{manifest:false});}
 // A filename is never permission. Invalidation also precedes early failures here.
 assert.equal(env.CURRENT_AUDIT_OUTCOME,'success');assert.equal(sha(bytes),env.CURRENT_AUDIT_MANIFEST_SHA256);const m=JSON.parse(bytes);assert.equal(m.status,'PASS_BOUNDED_APPROVED_PRODUCER_ENVELOPE');assert.equal(m.publicationApproved,true);assert(/^[a-f0-9-]{36}$/.test(m.auditId));assert.equal(m.auditId,env.CURRENT_AUDIT_ID);
 requireNativeCI(env);const inputs=await readInputs(),binding=runBinding(env,sha(await readFile(resolve(ROOT,'manifest.json'))));for(const [k,v]of Object.entries(binding))assert.equal(m[k],v);
 const rows=(await inventory(root)).filter(x=>x.path!=='artifact-manifest.json');assert.deepEqual(rows,m.members);await validateProducer(root,binding,rows);const report=JSON.parse(await readFile(resolve(root,'report.json'),'utf8'));validateReport(report,{...inputs,env,manifestSha256:binding.packageManifestSha256,memberPaths:rows.map(r=>r.path)});const summary=summaryFor(report);assert.equal(await readFile(resolve(root,'summary.md'),'utf8'),summary);
 assert(AUTOMATIC_PUBLICATION_ENABLED,'RELEASE_CAPABILITY_HOLD');return {summary,manifestSha256:sha(bytes),auditId:m.auditId};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const r=await verifyCurrentRelease();if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`approved=true\nmanifest_sha256=${r.manifestSha256}\naudit_id=${r.auditId}\n`);}catch{if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'approved=false\n');console.log('Evidence release unavailable or unverified.');process.exitCode=1;}
}
