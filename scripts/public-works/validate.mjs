#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ROOT,SECTORS,RESEARCH_INPUTS,EVIDENCE_MANIFESTS,assemblePublicWorks,classifyBuyer} from './assemble.mjs';
const read=path=>JSON.parse(readFileSync(`${ROOT}${path}`,'utf8'));
const date=value=>value===null||typeof value==='string'&&/^\d{4}-\d{2}(?:-\d{2})?$/u.test(value)&&Number.isFinite(Date.parse(`${value.length===7?`${value}-01`:value}T00:00:00Z`))&&new Date(`${value.length===7?`${value}-01`:value}T00:00:00Z`).toISOString().startsWith(value);
export function validatePublicWorks(data){
 const errors=[];const fail=message=>errors.push(message);
 if(!data||typeof data!=='object')return ['Dataset object required'];
 const collections=['states','localities','sources','entities','relationships','cases','rules','discovery','buyers','coverage','quality'];
 for(const key of collections)if(!Array.isArray(data[key]))fail(`${key} array required`);
 if(errors.length)return errors;
 const maps={};
 for(const key of collections)if(data[key].some(row=>!row||typeof row!=='object'||Array.isArray(row)))fail(`${key}: object rows required`);
 if(errors.length)return errors;
 for(const key of collections.filter(key=>!['quality','coverage','states'].includes(key))){maps[key]=new Map();for(const row of data[key]){if(typeof row.id!=='string'||!row.id||maps[key].has(row.id))fail(`${key}: duplicate or missing id ${row.id}`);maps[key].set(row.id,row);}}
 for(const key of ['sources','entities','relationships','cases','rules','discovery','buyers'])for(const row of data[key]){
  for(const field of ['sectors','stateCodes','localityIds',...(key==='sources'?[]:['sourceIds'])])if(!Array.isArray(row[field])||row[field].some(value=>typeof value!=='string'))fail(`${row.id}: ${field} must be an array of strings`);
  for(const field of ['limitations','alternativeExplanations'])if(row[field]!==undefined&&(!Array.isArray(row[field])||row[field].some(value=>typeof value!=='string')))fail(`${row.id}: ${field} must be an array of strings`);
  if(row.amounts!==undefined&&(!Array.isArray(row.amounts)||row.amounts.some(amount=>!amount||typeof amount!=='object')))fail(`${row.id}: amounts must be an array of objects`);
 }
 if(errors.length)return errors;
 const states=new Set(data.states.map(row=>row.code));if(states.size!==36||data.states.length!==36)fail('All 36 states/UTs required');
 for(const place of data.localities)if(!states.has(place.stateCode))fail(`${place.id}: unknown locality state`);
 const sourceIds=new Set(data.sources.map(row=>row.id));
 for(const key of ['sources','entities','relationships','cases','rules','discovery','buyers'])for(const row of data[key]){
  for(const dim of ['sectors','stateCodes','localityIds'])if(!Array.isArray(row[dim]))fail(`${row.id}: ${dim} required`);
  if(!row.sectors?.length||row.sectors.some(sector=>!SECTORS.includes(sector)))fail(`${row.id}: unknown or missing sector`);
  if(row.stateCodes?.some(code=>!states.has(code)))fail(`${row.id}: unknown state code`);
  for(const id of row.localityIds??[]){const place=maps.localities.get(id);if(!place)fail(`${row.id}: unknown locality ${id}`);else if(!row.stateCodes?.includes(place.stateCode))fail(`${row.id}: locality outside declared state`);}
  if(!['national','multi-state','state','district','city','village','project','unknown'].includes(row.scope))fail(`${row.id}: invalid scope`);
  if(key!=='sources'&&(!row.sourceIds?.length||row.sourceIds.some(id=>!sourceIds.has(id))))fail(`${row.id}: unknown or missing source`);
 }
 for(const row of data.sources){
  if(!/^https:\/\//u.test(row.url??''))fail(`${row.id}: source requires HTTPS URL`);
  if(!date(row.publishedAt))fail(`${row.id}: publication date invalid`);
  if(typeof row.retrievedAt!=='string'||row.retrievedAt.length!==10||!date(row.retrievedAt))fail(`${row.id}: retrieval date invalid`);
  for(const key of ['title','publisher','period','retrievedAt','retrievalStatus','locator','summary'])if(typeof row[key]!=='string'||!row[key].trim())fail(`${row.id}: ${key} required`);
  if(!['document','dataset','portal','news','discussion'].includes(row.type))fail(`${row.id}: source type invalid`);
  if(!['documented','reported','self-reported'].includes(row.tier))fail(`${row.id}: source tier invalid`);
  if(!Array.isArray(row.limitations))fail(`${row.id}: limitations required`);
 }
 for(const row of data.entities){if(!['authority','company','person','party','project','institution','law','group'].includes(row.type))fail(`${row.id}: entity type invalid`);if(typeof row.identityBasis!=='string'||!row.identityBasis.trim())fail(`${row.id}: identity basis required`);if(typeof row.resolved!=='boolean')fail(`${row.id}: resolved status required`);}
 for(const row of data.relationships){
  const from=maps.entities.get(row.from),to=maps.entities.get(row.to);
  if(!from||!to)fail(`${row.id}: unknown graph endpoint`);
  if(from?.resolved===false||to?.resolved===false)fail(`${row.id}: unresolved identity cannot carry an edge`);
  if(!row.kind||!row.label||!row.summary)fail(`${row.id}: typed relationship meaning required`);
  if(!date(row.fromDate)||!date(row.toDate)||row.fromDate&&row.toDate&&row.fromDate>row.toDate)fail(`${row.id}: invalid relationship chronology`);
  if(!['documented','reported','analytic','alleged'].includes(row.tier))fail(`${row.id}: relationship tier invalid`);
  if(row.tier==='analytic'&&(!row.alternativeExplanations?.length||!row.falsifier))fail(`${row.id}: analytic relationship requires alternative and falsifier`);
  if(row.tier==='alleged'&&!data.relationships.some(other=>['response','contra'].includes(other.kind)&&other.respondsTo===row.id&&other.from===row.to))fail(`${row.id}: allegation requires explicitly linked visible response`);
  if(row.respondsTo&&!maps.relationships.has(row.respondsTo))fail(`${row.id}: response target does not exist`);
 }
 for(const row of data.cases){
  for(const key of ['title','summary','attribution','response','falsifier','status'])if(typeof row[key]!=='string'||!row[key].trim())fail(`${row.id}: ${key} required`);
  if(!row.alternativeExplanations?.length)fail(`${row.id}: alternatives required`);
  if(!['audit-finding','judicial-finding','reported-event','analytic-question','methodology'].includes(row.kind))fail(`${row.id}: case classification invalid`);
  for(const amount of row.amounts??[])if(!Number.isFinite(amount.value)||['currency','unit','stage','period'].some(key=>typeof amount[key]!=='string'||!amount[key].trim()))fail(`${row.id}: amount series requires numeric value, currency, unit, stage and period`);
  if(row.amount!==undefined&&(!Number.isFinite(row.amount)||!row.amountStage||!row.valueUnit))fail(`${row.id}: monetary figure requires numeric amount, unit and stage`);
 }
 for(const row of data.rules){
  if(!date(row.effectiveFrom)||!date(row.effectiveTo)||row.effectiveFrom&&row.effectiveTo&&row.effectiveFrom>row.effectiveTo)fail(`${row.id}: invalid rule chronology`);
  for(const key of ['title','summary','jurisdiction','applicability','change'])if(typeof row[key]!=='string'||!row[key].trim())fail(`${row.id}: ${key} required`);
 }
 const rates=read('research/raw/cppp/rates.json');
 const byBuyer=new Map(rates.byOrganisation.map(row=>[`${row.portal}|${row.key}`,row]));
 for(const row of data.buyers){
  const original=byBuyer.get(`${row.portal}|${row.buyer}`);
  if(!original)fail(`${row.id}: buyer does not exist in retained CPPP aggregates`);
  else for(const key of ['n','singleBidder','singleBidderPct','wilson95'])if(JSON.stringify(row[key])!==JSON.stringify(original[key]))fail(`${row.id}: ${key} differs from retained aggregate`);
  if(JSON.stringify(row.sectors)!==JSON.stringify(classifyBuyer(row.buyer,row.portal).map(rule=>rule.sector)))fail(`${row.id}: buyer classification differs from recorded rules`);
  if(row.tier!=='reported'||row.localityIds.length||row.stateCodes.length||row.scope!=='national')fail(`${row.id}: historical buyer context cannot infer verified/local work`);
 }
 if(data.coverage.length!==SECTORS.length||new Set(data.coverage.map(row=>row.sector)).size!==SECTORS.length)fail('Nine distinct sector coverage rows required');
 for(const row of data.coverage){const buyers=data.buyers.filter(buyer=>buyer.sectors.includes(row.sector));if(row.buyers!==buyers.length||row.awardsWithUsableBidCount!==buyers.reduce((sum,buyer)=>sum+buyer.n,0))fail(`${row.sector}: coverage denominator mismatch`);}
 if(data.dataset?.verifiedRows!==0||data.dataset?.verificationSample!==40||data.dataset?.tier!=='reported')fail('CPPP verification boundary altered');
 if(data.dataset?.rawRows-data.dataset?.removedRows!==data.dataset?.afterDedupRows)fail('Dedup accounting identity failed');
 if(data.dataset?.repeatWork?.status!=='not-assessable')fail('Aggregate corpus cannot establish repeated physical work');
 for(const input of data.dataset?.inputs??[]){
  if(!existsSync(`${ROOT}${input.file}`))fail(`Missing input ${input.file}`);
  else if(createHash('sha256').update(readFileSync(`${ROOT}${input.file}`)).digest('hex')!==input.sha256)fail(`Input hash mismatch: ${input.file}`);
 }
 return errors;
}
export function validateEvidenceManifest(manifest){
 const errors=[];const rows=Array.isArray(manifest)?manifest:manifest.artifacts;
 if(!Array.isArray(rows))return ['Evidence manifest requires artifact rows'];
 for(const row of rows){
  if(!row||typeof row.path!=='string'||!Number.isInteger(row.bytes)||typeof row.sha256!=='string'||!/^[a-f0-9]{64}$/u.test(row.sha256)){errors.push('Evidence artifact path, byte count and SHA-256 required');continue;}
  if(!existsSync(`${ROOT}${row.path}`)){errors.push(`Missing evidence artifact ${row.path}`);continue;}
  const bytes=readFileSync(`${ROOT}${row.path}`);
  if(bytes.length!==row.bytes||createHash('sha256').update(bytes).digest('hex')!==row.sha256)errors.push(`Evidence artifact hash/size mismatch: ${row.path}`);
 }
 return errors;
}
export function validatePublicWorksAssembly(data){
 const errors=[];
 for(const name of RESEARCH_INPUTS)if(!existsSync(`${ROOT}research/raw/public-works/${name}`))errors.push(`Missing reviewed research input ${name}`);
 if(JSON.stringify(data)!==JSON.stringify(assemblePublicWorks()))errors.push('Assembled dataset differs from retained inputs');
 for(const path of EVIDENCE_MANIFESTS){
  if(!existsSync(`${ROOT}${path}`))errors.push(`Missing required evidence manifest ${path}`);
  else errors.push(...validateEvidenceManifest(read(path)));
 }
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const data=read('src/data/public-works-research.json');const errors=[...validatePublicWorks(data),...validatePublicWorksAssembly(data)];if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Public works validated: ${data.sources.length} sources, ${data.buyers.length} buyer aggregates, ${data.cases.length} cases, ${data.relationships.length} relationships, all 9 sectors and 36 states/UTs`);}
