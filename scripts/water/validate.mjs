#!/usr/bin/env node
/** Offline provenance, geography, date-window and numerical-grain gate. */
import {readFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export const DOMAINS=['drinking-water','groundwater','weather','tenders','farming','food'];
export const STAGES=['seed','input','irrigation','growing','harvest','market','storage','distribution'];
export const MEASURES=['household-connections','supply-functionality','supply-regularity','supply-quantity','water-quality','groundwater-extraction','groundwater-resource','rainfall','drought-declaration','tender-estimate','contract-award','payment','crop-production','market-arrivals','crop-loss','storage-capacity','other'];
const SCOPES=['national','multi-state','state','district','city','village','block'];
const SOURCE_TYPES=['document','portal','news','dataset','discussion'];
const validDate=value=>{
 if(typeof value!=='string'||!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value))return false;
 const normalized=value.length===7?`${value}-01`:value;const time=Date.parse(`${normalized}T00:00:00Z`);
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===normalized;
};
const expectedCodes='AN AP AR AS BR CH CG DN DL GA GJ HR HP JK JH KA KL LA LD MP MH MN ML MZ NL OD PY PB RJ SK TN TS TR UP UK WB'.split(' ');
const classify=(date,window)=>!date?'undated':date.length===7&&[window.start.slice(0,7),window.end.slice(0,7)].includes(date)?'undated':date<window.start?'background':date<=window.end?'in-window':'background';
const validUrl=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password;}catch{return false;}};
export function validateWaterData(data){
 const errors=[];const check=(condition,message)=>{if(!condition)errors.push(message);};
 if(!data||typeof data!=='object'||Array.isArray(data))return ['Dataset object required'];
 const collections=['states','localities','sources','observations','discovery','leads'];
 for(const name of collections)check(Array.isArray(data[name])&&data[name].every(row=>row&&typeof row==='object'&&!Array.isArray(row)),`${name}: record array required`);
 if(errors.length)return errors;
 for(const name of ['sources','observations','discovery','leads'])for(const row of data[name]){
  for(const field of ['stateCodes','localityIds','domains','stages'])check(Array.isArray(row[field])&&row[field].every(value=>typeof value==='string'),`${row.id}: ${field} string array required`);
  if(name!=='sources')check(Array.isArray(row.sourceIds)&&row.sourceIds.every(id=>typeof id==='string'),`${row.id}: sourceIds required`);
  const notes=name==='leads'?'alternativeExplanations':'limitations';
  check(Array.isArray(row[notes])&&row[notes].every(value=>typeof value==='string'),`${row.id}: ${notes} required`);
  if(name==='discovery')for(const field of ['steps','availableGrains'])check(Array.isArray(row[field]),`${row.id}: ${field} required`);
 }
 if(errors.length)return errors;
 check(data.window?.start==='2021-10-06'&&data.window?.end==='2026-10-06','Requested five-year window changed');
 check(data.updatedAt==='2026-10-06','Snapshot date changed without review');
 const sets={};
 for(const name of collections){
  const keys=data[name].map(row=>name==='states'?row.code:row.id);
  check(keys.every(key=>typeof key==='string'&&key.trim()),`${name}: missing id`);
  check(new Set(keys).size===keys.length,`${name}: duplicate id`);sets[name]=new Set(keys);
 }
 check(data.states.length===36&&expectedCodes.every(code=>sets.states.has(code)),'Geography must retain all 36 states/UTs');
 check(data.sources.length>0,'At least one reviewed source is required');
 const bySource=new Map(data.sources.map(row=>[row.id,row]));const byPlace=new Map(data.localities.map(row=>[row.id,row]));
 for(const place of data.localities){
  check(sets.states.has(place.stateCode),`${place.id}: unknown locality state`);
  check(['district','city','village','block'].includes(place.kind),`${place.id}: missing or unsupported geographic grain`);
 }
 for(const name of ['sources','observations','discovery','leads'])for(const row of data[name]){
  check(typeof row.title==='string'&&row.title.trim()&&typeof row.summary==='string'&&row.summary.trim(),`${row.id}: title and summary required`);
  check(SCOPES.includes(row.scope),`${row.id}: invalid scope`);
  check(row.stateCodes.every(code=>sets.states.has(code)),`${row.id}: unknown state`);
  check(row.localityIds.every(id=>sets.localities.has(id)),`${row.id}: unknown locality`);
  check(row.localityIds.every(id=>row.stateCodes.includes(byPlace.get(id)?.stateCode)),`${row.id}: locality outside declared state`);
  check(row.scope==='national'||row.stateCodes.length>0,`${row.id}: local scope without states`);
  if(['district','city','village','block'].includes(row.scope))check(row.localityIds.some(id=>byPlace.get(id)?.kind===row.scope),`${row.id}: locality grain does not match scope`);
  check(row.domains.length>0&&row.domains.every(domain=>DOMAINS.includes(domain)),`${row.id}: invalid domain`);
  check(row.stages.length>0&&row.stages.every(stage=>STAGES.includes(stage)),`${row.id}: invalid supply-chain stage`);
  for(const field of ['stateCodes','localityIds','domains','stages'])check(new Set(row[field]).size===row[field].length,`${row.id}: duplicate ${field}`);
  if(name!=='sources')check(row.sourceIds.length>0&&row.sourceIds.every(id=>bySource.has(id)),`${row.id}: unknown or missing source`);
  check(!('riskScore'in row)&&!('corruptionScore'in row),`${row.id}: unsupported inferred risk score`);
 }
 for(const source of data.sources){
  check(validUrl(source.url),`${source.id}: invalid source URL`);
  check(source.publisher?.trim()&&source.period?.trim(),`${source.id}: publisher and reference period required`);
  check(SOURCE_TYPES.includes(source.type)&&['primary','reported','self-reported'].includes(source.tier),`${source.id}: invalid source type or tier`);
  check(source.publishedAt===null||validDate(source.publishedAt),`${source.id}: publication date precision invalid`);
  check(source.publishedAt===null||source.publishedAt<=source.retrievedAt,`${source.id}: future publication date`);
  check(source.retrievedAt.length===10&&validDate(source.retrievedAt)&&source.retrievedAt<=data.updatedAt,`${source.id}: invalid retrieval date`);
  check(source.windowStatus===classify(source.publishedAt,data.window),`${source.id}: original-release window classification does not match publication date`);
  check(source.limitations.length>0,`${source.id}: limitations required`);
  if(['news','discussion'].includes(source.type))check(source.tier==='reported',`${source.id}: reporting must remain attributed`);
  if(source.issuedAt||source.validUntil||source.validFrom)check(source.isForecast===true,`${source.id}: forecast timestamps require forecast label`);
  for(const field of ['issuedAt','validFrom','validUntil'])if(source[field])check(Number.isFinite(Date.parse(source[field])),`${source.id}: invalid ${field}`);
  if(source.validUntil&&source.issuedAt)check(Date.parse(source.validUntil)>=Date.parse(source.issuedAt),`${source.id}: validity precedes issuance`);
  if(source.validUntil&&source.validFrom)check(Date.parse(source.validUntil)>=Date.parse(source.validFrom),`${source.id}: validity interval reversed`);
  check(!source.currentAlert,`${source.id}: static registry cannot assert a live alert`);
 }
 for(const row of data.observations){
  check(Number.isFinite(row.value),`${row.id}: missing or nonfinite value`);
  check(row.unit?.trim()&&row.period?.trim()&&row.label?.trim(),`${row.id}: unit, period and label required`);
  check(MEASURES.includes(row.measure),`${row.id}: invalid measure`);
  check(row.limitations.length>0,`${row.id}: measure limitations required`);
  if(row.unit==='percent')check(row.value>=0&&row.value<=100,`${row.id}: percent outside 0–100`);
  if(row.denominator!==undefined)check(Number.isFinite(row.denominator)&&row.denominator>0&&row.denominatorLabel?.trim(),`${row.id}: denominator invalid or unlabeled`);
  if(row.accountingStage)check(['estimate','award','payment','allocation','release','expenditure'].includes(row.accountingStage),`${row.id}: accounting stage invalid`);
  const moneyStage={'tender-estimate':'estimate','contract-award':'award',payment:'payment'}[row.measure];
  if(moneyStage)check(row.accountingStage===moneyStage,`${row.id}: financial measure and accounting stage disagree`);
  if(row.id.includes('reportedMinimumFunctionalityPct'))check(row.measure==='other'&&/not.*joint|not.*intersection/i.test(row.summary+' '+row.limitations.join(' ')),`${row.id}: minimum index cannot become joint household functionality`);
  if(row.id.startsWith('wp-j3-'))check(!row.stateCodes.includes('DL')&&!row.stateCodes.includes('CH'),`${row.id}: absent rural jurisdiction was imputed`);
 }
 for(const row of data.discovery){
  check(validUrl(row.url)&&row.steps.length>0&&row.availableGrains.length>0,`${row.id}: discovery URL, steps and grains required`);
  check(row.availableGrains.every(grain=>[...SCOPES,'station','project','market'].includes(grain)),`${row.id}: invalid discovery grain`);
 }
 for(const row of data.leads){
  check(['source-finding','analytic-question','methodology'].includes(row.kind),`${row.id}: finding/question distinction missing`);
  check(['investigate','context'].includes(row.status)&&row.signal?.trim()&&row.attribution?.trim()&&row.falsifier?.trim()&&row.alternativeExplanations.length>0,`${row.id}: attribution, alternatives or falsifier missing`);
 }
 return errors;
}
export function validateWaterRaw(data,{publicWater,food,weather}){
 const errors=[];const byObservation=new Map(data.observations.map(row=>[row.id,row]));const bySource=new Map(data.sources.map(row=>[row.id,row]));
 for(const row of [...publicWater.sources,...food.sources,...weather.records]){
  const curated=bySource.get(row.id);
  if(!curated||curated.url!==row.url||curated.publishedAt!==row.publishedAt)errors.push(`${row.id}: source URL or original publication date changed`);
 }
 for(const row of [...publicWater.observations,...food.observations]){
  const curated=byObservation.get(row.id);
  if(!curated||curated.value!==row.value||curated.unit!==row.unit||curated.period!==row.period)errors.push(`${row.id}: value/unit/period differs from retained extraction`);
 }
 for(const row of weather.records)for(const [i,item]of(row.observations??[]).entries()){
  const curated=byObservation.get(`${row.id}-observation-${i+1}`);
  if(!curated||curated.value!==item.value||curated.unit!==item.unit||curated.period!==item.period)errors.push(`${row.id}: weather observation differs from source extract`);
 }
 for(const row of publicWater.jjmFunctionalityRows){
  const minimum=Math.min(row.regularityPct,row.testedMicrobiologicalAndPhQualityPassPct,row.quantityAtLeast55LpcdPct);
  if(Math.abs(minimum-row.reportedMinimumFunctionalityPct)>0.001)errors.push(`${row.state}: published minimum index does not reconcile`);
 }
 const admin=publicWater.jjmAdministrativeRows;
 if(admin.length!==34||new Set(admin.map(row=>row.state)).size!==34)errors.push('Administrative snapshot must have 34 distinct rural states/UTs');
 if(publicWater.jjmFunctionalityRows.length!==35)errors.push('Survey must have India plus 34 states/UTs');
 const value=id=>byObservation.get(id)?.value;
 if(Math.abs(value('wf-pdmc-drip-2025')+value('wf-pdmc-sprinkler-2025')-value('wf-pdmc-total-2025'))>0.001)errors.push('PDMC drip and sprinkler components do not reconcile');
 const categories=['safe-extraction-stage','semi-critical','critical','over-exploited','saline'].map(key=>value(`wp-cgwb-${key}-assessment-units`));
 if(categories.reduce((sum,item)=>sum+item,0)!==value('wp-cgwb-assessed-groundwater-units'))errors.push('Groundwater assessment-unit categories do not reconcile');
 const stage=value('wp-cgwb-annual-groundwater-extraction')/value('wp-cgwb-annual-extractable-groundwater-resources')*100;
 if(Math.abs(stage-value('wp-cgwb-stage-of-groundwater-extraction'))>0.01)errors.push('Groundwater extraction stage does not reconcile');
 for(const crop of ['rice','wheat','pulses'])for(const year of ['2021-22','2022-23','2023-24']){
  const area=value(`wf-${crop}-area-${year}`),production=value(`wf-${crop}-production-${year}`),yieldValue=value(`wf-${crop}-yield-${year}`);
  if(area!==undefined&&Math.abs(production/area*1000-yieldValue)>1)errors.push(`${crop} ${year}: area/production/yield fail rounding reconciliation`);
 }
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=fileURLToPath(new URL('../../',import.meta.url));const read=file=>JSON.parse(readFileSync(`${root}${file}`,'utf8'));
 const data=read('src/data/water-research.json');
 const errors=[...validateWaterData(data),...validateWaterRaw(data,{publicWater:read('research/raw/water/public-research.json'),food:read('research/raw/water/food-research.json'),weather:read('research/raw/water/weather-research.json')})];
 const publicManifest=read('research/raw/water/evidence/public/download-manifest.json');
 const excerpt=read('research/raw/water/evidence/public/jjm-functionality-2024-selected-pages.json');
 const foodManifest=read('research/raw/water/evidence/food/access-manifest.json');
 const hashes=[
  ['public/amrut-outcomes-2026.pdf',publicManifest.find(row=>row.id==='amrut-outcomes-2026').sha256],
  ['public/jjm-functionality-2024-selected-pages.pdf',excerpt.excerptSha256],
  ['food/crop-table.pdf',foodManifest.files.find(row=>row.id==='wf-crop-table').sha256],
 ];
 for(const [file,expected]of hashes){const actual=createHash('sha256').update(readFileSync(`${root}research/raw/water/evidence/${file}`)).digest('hex');if(actual!==expected)errors.push(`${file}: archived PDF SHA-256 mismatch`);}
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Water integrity passed: ${data.sources.length} sources; ${data.observations.length} observations; ${data.discovery.length} discovery routes; ${data.leads.length} attributed findings/questions; dates, grain, numerical controls and 3 PDF hashes verified.`);
}
