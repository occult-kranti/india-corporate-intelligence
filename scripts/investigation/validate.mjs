#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadInvestigation} from './load.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const validDate=value=>value===null||typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/u.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const validPublication=value=>validDate(value)||typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/u.test(value);
const tiers=new Set(['documented','reported','alleged','analytic','self-reported']);
const countryCodes=new Set(JSON.parse(readFileSync(new URL('./iso3166-codes.json',import.meta.url),'utf8')));
const layers=new Set(['people','organisations','funding','procurement','legal','welfare','services','policy','review']);
const scopes=new Set(['national','country','state','multi-state','district','city','village','block','project','unknown']);
const bases=new Set(['project-location','programme-coverage','headquarters','constituency','institution-location','state-association','national-context','country-context','unknown']);
const strArray=(row,key)=>Array.isArray(row?.[key])&&row[key].every(value=>typeof value==='string');
const object=row=>row!==null&&typeof row==='object'&&!Array.isArray(row);
const text=value=>typeof value==='string'&&value.trim().length>0;
export function validateInvestigation(data){
 const errors=[];const fail=message=>errors.push(message);
 if(!object(data))return ['Registry required'];
 for(const collection of ['entities','relationships','records','sources','states','localities','coverage','held']){
  if(!Array.isArray(data[collection]))fail(`${collection} array required`);
  else if(data[collection].some(row=>!object(row)))fail(`${collection} rows must be objects`);
 }
 if(errors.length)return errors;
 // Structural preflight prevents malformed arrays from throwing or reaching adapters unnoticed.
 for(const key of ['entities','relationships','records'])for(const row of data[key]){
  const fields=['sourceIds','domains','layers','limitations',...(key==='relationships'?['responseIds','recordIds','alternativeExplanations']:key==='records'?['entityIds','relationshipIds','alternativeExplanations']:[])];
  for(const field of fields)if(!strArray(row,field))fail(`${row.id}: ${field} string array required`);
  if(!Array.isArray(row.geography)||!row.geography.length||row.geography.some(geo=>!object(geo)))fail(`${row.id}: explicit geography object array required`);
  else for(const geo of row.geography)for(const field of ['stateCodes','localityIds','sourceIds'])if(!strArray(geo,field))fail(`${row.id}: geography ${field} string array required`);
  if(key!=='entities'&&(!Array.isArray(row.amounts)||row.amounts.some(amount=>!object(amount))))fail(`${row.id}: amounts object array required`);
 }
 if(errors.length)return errors;
 const sets={};for(const key of ['entities','relationships','records','sources','localities']){
  sets[key]=new Map();for(const row of data[key]){
   if(typeof row.id!=='string'||!row.id.includes(':')){fail(`${key}: namespaced ID required`);continue;}
   if(sets[key].has(row.id))fail(`${key}: duplicate ${row.id}`);sets[key].set(row.id,row);
  }
 }
 const states=new Set(data.states.map(row=>row.code));
 if(states.size!==36||!states.has('LA')||states.has('DD'))fail('Modern 36-state/UT roster required');
 for(const locality of data.localities)if(!states.has(locality.stateCode)||!text(locality.name)||!strArray(locality,'aliases'))fail(`${locality.id}: invalid locality metadata`);
 for(const key of ['entities','relationships','records'])for(const row of data[key]){
  if(!row.sourceIds.length||row.sourceIds.some(id=>!sets.sources.has(id)))fail(`${row.id}: missing or orphan source`);
  if(!row.layers.length||row.layers.some(layer=>!layers.has(layer)))fail(`${row.id}: invalid layer`);
  if(!row.domains.length)fail(`${row.id}: domain required`);
  if(typeof row.route!=='string'||!row.route.startsWith('/')||row.route.startsWith('//'))fail(`${row.id}: internal original route required`);
  for(const geo of row.geography){
   if(!scopes.has(geo.scope)||!bases.has(geo.basis)||!text(geo.note))fail(`${row.id}: geography scope/basis/note required`);
   if(geo.stateCodes.some(code=>!states.has(code)))fail(`${row.id}: current state code required`);
   if(geo.localityIds.some(id=>!sets.localities.has(id)))fail(`${row.id}: unknown locality`);
   if(!geo.sourceIds.length||geo.sourceIds.some(id=>!sets.sources.has(id)))fail(`${row.id}: geography source join invalid`);
   for(const id of geo.localityIds){const locality=sets.localities.get(id);if(locality&&!geo.stateCodes.includes(locality.stateCode))fail(`${row.id}: locality outside declared state`);}
   if(['headquarters','constituency','state-association'].includes(geo.basis)&&['project','village'].includes(geo.scope))fail(`${row.id}: association cannot be a project/village location`);
   if(geo.scope==='unknown'&&(geo.stateCodes.length||geo.localityIds.length))fail(`${row.id}: unknown geography cannot assert a local footprint`);
   if(geo.scope==='country'&&(!Array.isArray(geo.countryCodes)||!geo.countryCodes.length||geo.countryCodes.some(code=>typeof code!=='string'||!countryCodes.has(code))||geo.stateCodes.length||geo.localityIds.length||geo.basis!=='country-context'))fail(`${row.id}: country context requires explicit ISO2 country codes and no invented Indian state or site`);
   if(!['national','country','unknown'].includes(geo.scope)&&!geo.stateCodes.length)fail(`${row.id}: subnational scope requires a state`);
  }
 }
 for(const source of data.sources){
  if(!/^https?:\/\//u.test(source.url??''))fail(`${source.id}: source URL required`);
  if(!text(source.title)||!tiers.has(source.tier)||!text(source.locator)||!strArray(source,'limitations'))fail(`${source.id}: explicit source title/tier/locator/limitations required`);
  if(!validPublication(source.publishedAt)||!validDate(source.retrievedAt))fail(`${source.id}: invalid publication/retrieval date`);
 }
 for(const entity of data.entities)if(entity.resolved!==true||!text(entity.identityBasis))fail(`${entity.id}: drawable identity must be resolved with basis`);
 for(const edge of data.relationships){
  if(!sets.entities.has(edge.from)||!sets.entities.has(edge.to))fail(`${edge.id}: orphan graph endpoint`);
  if(!text(edge.kind)||!text(edge.status)||!text(edge.dateBasis)||!tiers.has(edge.tier))fail(`${edge.id}: typed status/date basis/tier required`);
  for(const key of ['fromDate','toDate','statusAsOf'])if(!validDate(edge[key]))fail(`${edge.id}: invalid ${key}`);
  if(edge.responseIds.some(id=>!sets.records.has(id)))fail(`${edge.id}: response reference invalid`);
  if(edge.recordIds.some(id=>!sets.records.has(id)))fail(`${edge.id}: record reference invalid`);
  if(edge.tier==='analytic'&&!edge.alternativeExplanations.length)fail(`${edge.id}: analytic alternative reading required`);
 }
 for(const record of data.records){
  if(!text(record.kind)||!text(record.status)||!text(record.dateBasis)||!tiers.has(record.tier))fail(`${record.id}: record kind/status/date basis/tier required`);
  for(const key of ['fromDate','toDate','statusAsOf'])if(!validDate(record[key]))fail(`${record.id}: invalid ${key}`);
  if(record.entityIds.some(id=>!sets.entities.has(id)))fail(`${record.id}: entity reference invalid`);
  if(record.relationshipIds.some(id=>!sets.relationships.has(id)))fail(`${record.id}: relationship reference invalid`);
 }
 for(const row of [...data.relationships,...data.records])for(const amount of row.amounts)if(!Number.isFinite(amount.value)||['currency','unit','stage','period'].some(key=>!text(amount[key])))fail(`${row.id}: amount needs currency/unit/stage/period`);
 for(const row of data.held)if(!strArray(row,'sourceIds')||row.sourceIds.some(id=>!sets.sources.has(id)))fail(`${row.id}: held source reference invalid`);
 for(const row of data.coverage)for(const key of ['entities','relationships','records','sources','held'])if(row[key]!==data[key].filter(item=>item.namespace===row.namespace).length)fail(`${row.namespace}: coverage denominator mismatch for ${key}`);
 return errors;
}
export function validateResearchSlice(raw,name){
 const errors=[];
 for(const key of ['sources','entities','relationships','records','localities'])if(!Array.isArray(raw?.[key])||raw[key].some(row=>!object(row)))errors.push(`${name}: ${key} object array required`);
 if(errors.length)return errors;
 if(!raw.sources.length||!raw.records.length)errors.push(`${name} research slice must contain reviewed sources and records`);
 for(const source of raw.sources){
  for(const key of ['id','title','url','publisher','locator','summary','tier'])if(!text(source[key]))errors.push(`${name}/${source.id}: explicit ${key} required`);
  if(!tiers.has(source.tier)||!validPublication(source.publishedAt)||!validDate(source.retrievedAt))errors.push(`${name}/${source.id}: invalid explicit source tier/date`);
 }
 for(const key of ['entities','relationships','records'])for(const row of raw[key]){
  for(const field of ['sourceIds','domains','layers','limitations'])if(!strArray(row,field))errors.push(`${name}/${row.id}: explicit ${field} required`);
  if(!Array.isArray(row.geography)||!row.geography.length)errors.push(`${name}/${row.id}: explicit geography required`);
  if(key==='entities'&&(row.resolved!==true||!text(row.identityBasis)))errors.push(`${name}/${row.id}: explicitly resolved identity required`);
  if(key!=='entities'){
   for(const field of ['tier','status','dateBasis'])if(!text(row[field]))errors.push(`${name}/${row.id}: explicit ${field} required`);
   for(const field of ['fromDate','toDate','statusAsOf'])if(!validDate(row[field]))errors.push(`${name}/${row.id}: explicit nullable ${field} required`);
   if(!Array.isArray(row.amounts))errors.push(`${name}/${row.id}: explicit amounts array required`);
  }
 }
 return errors;
}
export function validateResearchSlices(){
 const errors=[];
 for(const name of ['finance','justice','welfare']){
  const path=`${ROOT}research/raw/investigation/${name}-research.json`;
  if(!existsSync(path)){errors.push(`Missing ${name} research slice`);continue;}
  errors.push(...validateResearchSlice(JSON.parse(readFileSync(path,'utf8')),name));
 }
 return errors;
}
export function validateManifestRows(rows,root=ROOT){
 if(!Array.isArray(rows)||!rows.length)return ['Archive manifest must contain a nonempty artifact array'];
 const errors=[],seen=new Set();
 for(const row of rows){
  if(!object(row)||!text(row.path)||!/^([a-f0-9]{64})$/u.test(row.sha256??'')||!Number.isInteger(row.bytes)||row.bytes<0){errors.push('Archive row requires path, byte count and SHA-256');continue;}
  if(seen.has(row.path))errors.push(`Duplicate archive path ${row.path}`);seen.add(row.path);
  const artifact=row.path.startsWith('/')?row.path:`${root}${row.path}`;
  if(!existsSync(artifact)){errors.push(`Missing archive ${row.path}`);continue;}
  const bytes=readFileSync(artifact);
  if(createHash('sha256').update(bytes).digest('hex')!==row.sha256||row.bytes!==bytes.length)errors.push(`Archive digest mismatch ${row.path}`);
 }
 return errors;
}
export function validateInvestigationManifests(){
 const errors=[];
 // Required, explicit roots: missing research archives cannot silently pass.
 for(const manifest of ['evidence/investigation/justice/sha256-manifest.json','research/raw/investigation/evidence/finance/sha256-manifest.json','research/raw/investigation/evidence/welfare/sha256-manifest.json']){
  const path=`${ROOT}${manifest}`;
  if(!existsSync(path)){errors.push(`Missing archive manifest ${manifest}`);continue;}
  const raw=JSON.parse(readFileSync(path,'utf8'));
  errors.push(...validateManifestRows(Array.isArray(raw)?raw:raw.artifacts??raw.files));
 }
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const rawErrors=validateResearchSlices();
 if(rawErrors.length){console.error(rawErrors.join('\n'));process.exitCode=1;}
 else {const api=await loadInvestigation(),data=api.INVESTIGATION_REGISTRY;const errors=[...validateInvestigation(data),...validateInvestigationManifests()];if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Investigation registry validated: ${data.entities.length} entities, ${data.relationships.length} relationships, ${data.records.length} records, ${data.sources.length} sources, ${data.held.length} held items`);}
}
