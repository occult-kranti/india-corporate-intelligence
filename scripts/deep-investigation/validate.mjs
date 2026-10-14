#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateInvestigation,validateResearchSlice,validateManifestRows} from '../investigation/validate.mjs';
import {loadInvestigation} from '../investigation/load.mjs';
import {loadDeepInvestigation} from './load.mjs';
export const DEEP_SLICES=['procurement','corporate','services','governance'];

export function validateDeepSlice(raw,name){
 const errors=validateResearchSlice(raw,name);
 if(errors.length)return errors;
 const maps=Object.fromEntries(['sources','entities','relationships','records','localities'].map(key=>[key,new Map(raw[key].map(row=>[row.id,row]))]));
 for(const key of Object.keys(maps))if(maps[key].size!==raw[key].length)errors.push(`${name}: duplicate raw ${key} identifiers`);
 for(const row of [...raw.entities,...raw.relationships,...raw.records]){
  for(const id of row.sourceIds)if(!maps.sources.has(id))errors.push(`${name}/${row.id}: missing local source ${id}`);
  for(const geo of row.geography)for(const id of geo.sourceIds??[])if(!maps.sources.has(id))errors.push(`${name}/${row.id}: missing geography source ${id}`);
 }
 for(const edge of raw.relationships){
  for(const id of [edge.from,edge.to])if(!maps.entities.has(id))errors.push(`${name}/${edge.id}: missing local endpoint ${id}`);
  for(const id of [...edge.recordIds??[],...edge.responseIds??[]])if(!maps.records.has(id))errors.push(`${name}/${edge.id}: missing local record ${id}`);
 }
 const cases=raw.records.filter(row=>row.kind==='investigation-case');
 if(!cases.length)errors.push(`${name}: reviewed investigation-case required`);
 for(const record of cases){
  if(!record.entityIds?.length||!record.relationshipIds?.length)errors.push(`${name}/${record.id}: case needs an explicit entity and relationship trail`);
  if(!record.response?.trim()||!record.falsifier?.trim()||!record.alternativeExplanations?.length)errors.push(`${name}/${record.id}: response, alternative and falsifier required`);
  if(!record.statusAsOf)errors.push(`${name}/${record.id}: current procedural status needs an as-of date`);
  for(const id of record.entityIds??[])if(!maps.entities.has(id))errors.push(`${name}/${record.id}: missing local case entity ${id}`);
  for(const id of record.relationshipIds??[])if(!maps.relationships.has(id))errors.push(`${name}/${record.id}: missing local case relationship ${id}`);
 }
 for(const row of [...raw.records,...raw.relationships])for(const amount of row.amounts??[])if(!Number.isFinite(amount.value)||!['currency','unit','stage','period'].every(key=>typeof amount[key]==='string'&&amount[key].trim()))errors.push(`${name}/${row.id}: amount requires finite value, currency, unit, stage and period`);
 return errors;
}

export function validateUniverse(universe,registry){
 const errors=[],byEntity=new Set(registry.entities.map(row=>row.id));
 const source=JSON.parse(readFileSync('research/raw/companies-by-state.json','utf8')).companies;
 const companies=new Map(source.map(row=>[`legacy:entity:co:${row.id}`,row]));
 const securities=universe.securities;
 if(universe.totalSecurities!==securities.length||universe.uniqueIsins!==new Set(securities.map(row=>row.isin)).size)errors.push('NSE denominator differs from actual security rows');
 if(universe.matchedRegistryCompanies!==securities.filter(row=>row.registryEntityIds.length).length)errors.push('NSE exact-identifier coverage denominator mismatch');
 if(universe.unmatchedSecurities+universe.matchedRegistryCompanies!==universe.totalSecurities)errors.push('Matched/unmatched universe does not reconcile');
 for(const row of securities)for(const id of row.registryEntityIds){
  if(!byEntity.has(id))errors.push(`${row.symbol}: registry endpoint unavailable`);
  if(companies.get(id)?.isin!==row.isin||row.matchBasis!=='exact-isin')errors.push(`${row.symbol}: unsupported company identity join`);
 }
 return errors;
}

export async function validateDeepInvestigation(){
 const errors=[];
 for(const name of DEEP_SLICES){const path=`research/raw/deep-investigation/${name}.json`;if(!existsSync(path)){errors.push(`Missing required ${name} slice`);continue;}errors.push(...validateDeepSlice(JSON.parse(readFileSync(path,'utf8')),name));}
 if(errors.length)return errors;
 const {INVESTIGATION_REGISTRY:registry}=await loadInvestigation(),api=await loadDeepInvestigation();
 errors.push(...validateInvestigation(registry),...validateUniverse(api.DEEP_INVESTIGATION_UNIVERSE,registry));
 for(const namespace of api.DEEP_INVESTIGATION_NAMESPACES)if(!registry.coverage.some(row=>row.namespace===namespace))errors.push(`Missing integrated namespace ${namespace}`);
 for(const record of api.DEEP_INVESTIGATION_CASES){const closure=api.getDeepInvestigationCaseEvidence(record.id),records=new Set(closure.records.map(row=>row.id)),sources=new Set(closure.sources.map(row=>row.id));for(const edge of closure.relationships)for(const id of edge.responseIds)if(!records.has(id))errors.push(`${record.id}: response dropped from evidence closure`);for(const row of [...closure.entities,...closure.records,...closure.relationships])for(const id of [...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)])if(!sources.has(id))errors.push(`${record.id}: source dropped from evidence closure`);}
 const manifest='research/raw/deep-investigation/sha256-manifest.json';
 if(!existsSync(manifest))errors.push('Missing deep investigation archive manifest');else errors.push(...validateManifestRows(JSON.parse(readFileSync(manifest,'utf8')).artifacts));
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const errors=await validateDeepInvestigation();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else{const api=await loadDeepInvestigation();console.log(`Deep investigation validated: ${api.DEEP_INVESTIGATION_CASES.length} reviewed cases, ${api.DEEP_INVESTIGATION_UNIVERSE.totalSecurities} NSE securities, ${api.DEEP_INVESTIGATION_UNIVERSE.matchedRegistryCompanies} exact-ISIN registry links.`);}}
