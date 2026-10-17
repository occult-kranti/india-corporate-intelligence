import assert from 'node:assert/strict';
import {readFile,readdir,lstat,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {constants} from 'node:fs';
import {PROPOSED_BUDGET,proposedOuterLimit,assertProposedOuterBudgets} from './evidence-budget-proposal.mjs';
import {evidenceSizeMetadataDiagnostic} from './failure-diagnostic.mjs';
import {resolve,relative,sep} from 'node:path';
export const ROOT=resolve(new URL('..',import.meta.url).pathname);
export const PINS=Object.freeze({
 'data/packet.json':'f365d7f785d54556759230f0c6c27e65ec41ec3ad885fdaee1f46f72860175b5',
 'dist/index.html':'5db4a1567b88fbe2fbe81d4e1e47cf62e904b436bab0681ebf00c79153d54b21',
 'dist/readable.html':'d6dd8bd6af2c768c2549a46a40d6bf7f6f904e65457a79fe899afaab41577b27'});
export const FIXTURE_PIN='df94482b42c13c0aebdcea5fcdf92244aae06924a6dfb48b8e99fcd7e574b1a4';
export const SOURCE_MANIFEST='98776713c6309efadac13968cb6350a72f83f2e8f627399ab1a175acdd126919';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const gitBlob=b=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
export const esc=s=>String(s).replaceAll('~','~0').replaceAll('/','~1');
export function at(raw,p){return p.split('/').slice(1).reduce((v,k)=>v[k.replaceAll('~1','/').replaceAll('~0','~')],raw);}
export function typed(v,path='',ordinal=0,out=[]){const kind=v===null?'null':Array.isArray(v)?'array':typeof v;out.push({path,kind,ordinal,...(v!==null&&typeof v==='object'?{}:{value:v})});if(v!==null&&typeof v==='object')Object.entries(v).forEach(([k,x],i)=>typed(x,path+'/'+esc(k),i,out));return out;}
export function packets(raw){return [{component:'baseline',path:'/baseline',packet:raw.baseline},...raw.extensions.map((packet,i)=>({component:`round-${i+1}`,path:`/extensions/${i}`,packet}))];}
export function records(raw){return packets(raw).flatMap(p=>['milestones','procedural_relations'].flatMap(collection=>p.packet[collection].map((record,i)=>({...p,collection,record,recordPointer:`${p.path}/${collection}/${i}`,id:record[p.component==='baseline'?(collection==='milestones'?'milestone':'relation'):'id']}))));}
export function references(record,pointer){const out=[];function walk(v,p){if(!v||typeof v!=='object')return;if(!Array.isArray(v)&&typeof v.url==='string')out.push({referencePointer:p,reference:v,sourceIndex:out.length});for(const [k,x]of Object.entries(v))walk(x,p+'/'+esc(k));}walk(record,pointer);return out;}
export function ownerPaths(raw,referencePointer,recordPointer){const out=[];let p=referencePointer.slice(0,referencePointer.lastIndexOf('/'));while(p.length>recordPointer.length){const v=at(raw,p);if(v&&!Array.isArray(v)&&typeof v==='object'&&Object.values(v).some(x=>x===null||typeof x!=='object'))out.push(p);p=p.slice(0,p.lastIndexOf('/'));}return out;}
export function ownerKind(v){return typeof v.role==='string'&&typeof v.state==='string'?(v.precision!==undefined?'date-owner':'condition-owner'):typeof v.statement==='string'?'observation-owner':'enclosing-owner';}
export function roles(packet){return ['primary',...new Set(packet.milestones.flatMap(r=>Object.keys(r.date_claims??{})))];}
// Independent calendar validation, without importing delivered renderer/model functions.
export function calendarColumn(date){if(!date||!['exact','attributed','source_text_interpretation','source_recorded','attributed_historical_observation','verified_day','visually_read_copy','copy_records','partial'].includes(date.state))return null;const v=date.value;if(typeof v!=='string')return null;let ok=false;if(date.precision==='year')ok=/^\d{4}$/.test(v)&&+v>0;if(date.precision==='month')ok=/^\d{4}-(0[1-9]|1[0-2])$/.test(v)&&+v.slice(0,4)>0;if(date.precision==='day'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&+v.slice(0,4)>0){const d=new Date(v+'T00:00:00Z');ok=!Number.isNaN(+d)&&d.toISOString().slice(0,10)===v;}return ok?v:null;}
export function expectedDate(r,role){if(r.component==='baseline')return {column:null,text:[r.record.date,r.record.date_role]};const d=role==='primary'?r.record.primary_date:r.record.date_claims?.[role];return d?{column:calendarColumn(d),text:[d.role,d.state,d.precision]}:{column:null,text:['not supplied for this entry']};}
export async function readInputs(){assert.equal(sha(await readFile(resolve(ROOT,'dist/controller-fixture.html'))),FIXTURE_PIN,'Exact isolated fixture');for(const [file,digest]of Object.entries(PINS))assert.equal(sha(await readFile(resolve(ROOT,file))),digest,file);const raw=JSON.parse(await readFile(resolve(ROOT,'data/packet.json'))),fixture=JSON.parse(await readFile(resolve(ROOT,'fixtures/reviewed-source-contexts.json')));assert.equal(records(raw).length,112);assert.equal(records(raw).filter(r=>r.collection==='milestones').length,61);assert.equal(fixture.mappings.length,152);const derived=records(raw).flatMap(r=>references(r.record,r.recordPointer).map(ref=>({component:r.component,collection:r.collection,id:r.id,recordPointer:r.recordPointer,sourceIndex:ref.sourceIndex,referencePointer:ref.referencePointer})));assert.deepEqual(fixture.mappings.map(({contextOwners,...m})=>m),derived);for(const m of fixture.mappings)for(const owner of m.contextOwners){assert(ownerPaths(raw,m.referencePointer,m.recordPointer).includes(owner.path));assert.equal(ownerKind(at(raw,owner.path)),owner.kind);}return {raw,fixture};}
export function requireNativeCI(env=process.env){assert.equal(env.GITHUB_ACTIONS,'true','Native review is GitHub Actions only');assert.equal(env.EPSTEIN_WORLD_BOARD_NATIVE,'github-actions');assert.equal(env.GITHUB_EVENT_NAME,'push');assert.equal(env.GITHUB_REPOSITORY,'occult-kranti/india-corporate-intelligence');assert.equal(env.GITHUB_WORKFLOW,'Epstein world board native review');assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(env.REVIEW_BRANCH,'feature/epstein-world-map');assert.match(env.GITHUB_RUN_ID??'',/^\d+$/);assert.match(env.REVIEW_HEAD_SHA??'',/^[a-f0-9]{40}$/);assert(env.GITHUB_WORKSPACE);const rel=relative(resolve(env.GITHUB_WORKSPACE),ROOT);assert(rel&&!rel.startsWith('..'+sep)&&rel!=='..'&&!rel.startsWith(sep));}
// Budgets count every file in this helper's tree, including manifests/receipts.
// evidenceMetadata only adds bounded pre-audit naming/count diagnostics. It does
// not exempt any file from accounting, and no caller can supply alternate caps.
export async function inventory(root,{evidenceMetadata=false}={}){
 const files=[],out=[];
 async function visit(dir){for(const name of (await readdir(dir)).sort()){
  const p=resolve(dir,name),stat=await lstat(p);assert(!stat.isSymbolicLink(),'No symlink in package or evidence');
  if(stat.isDirectory()){assert(!evidenceMetadata,'UNEXPECTED_EVIDENCE_MEMBER');await visit(p);}
  else{assert(stat.isFile());files.push({p,stat,path:relative(root,p).split(sep).join('/')});if(evidenceMetadata)assert(files.length<=38,'EVIDENCE_MEMBER_COUNT');}
 }}
 await visit(root);
 const metadata=files.map(({path,stat})=>({path,bytes:stat.size}));
 const sizeDiagnostic=evidenceMetadata?evidenceSizeMetadataDiagnostic(metadata):null;
 if(evidenceMetadata)assert(sizeDiagnostic,'UNEXPECTED_OR_MALFORMED_EVIDENCE_METADATA');
 try{assertProposedOuterBudgets(metadata);}catch(e){if(sizeDiagnostic&&['EVIDENCE_BUDGET','EVIDENCE_MEMBER_BUDGET'].includes(e.message))e.sizeDiagnostic=sizeDiagnostic;throw e;}
 for(const {p,stat,path}of files){
  const digest=createHash('sha256'),blob=createHash('sha1').update(`blob ${stat.size}\0`);let bytes=0;const handle=await open(p,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
   const opened=await handle.stat();assert(opened.isFile()&&opened.dev===stat.dev&&opened.ino===stat.ino&&opened.size===stat.size&&opened.mtimeMs===stat.mtimeMs&&opened.ctimeMs===stat.ctimeMs,'FILE_CHANGED_BEFORE_HASH');
   for await(const chunk of handle.createReadStream({highWaterMark:65536,autoClose:false})){bytes+=chunk.length;assert(bytes<=stat.size,'FILE_GREW_DURING_HASH');digest.update(chunk);blob.update(chunk);}
   const final=await handle.stat();assert(final.size===stat.size&&final.mtimeMs===stat.mtimeMs&&final.ctimeMs===stat.ctimeMs,'FILE_CHANGED_DURING_HASH');
  }finally{await handle.close();}
  assert.equal(bytes,stat.size,'FILE_SIZE_CHANGED_DURING_HASH');const after=await lstat(p);assert(after.isFile()&&!after.isSymbolicLink()&&after.dev===stat.dev&&after.ino===stat.ino&&after.size===stat.size&&after.mtimeMs===stat.mtimeMs&&after.ctimeMs===stat.ctimeMs,'FILE_CHANGED_DURING_HASH');out.push({path,bytes,sha256:digest.digest('hex'),gitBlob:blob.digest('hex')});
 }
 return out;
}
