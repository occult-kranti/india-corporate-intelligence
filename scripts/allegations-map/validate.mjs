#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateDeepSlice} from '../deep-investigation/validate.mjs';
import {validateInvestigation,validateManifestRows} from '../investigation/validate.mjs';
import {loadInvestigation} from '../investigation/load.mjs';
import {loadAllegations} from './load.mjs';
export async function validateAllegations(){
 const errors=[];
 for(const name of ['policy','institutions']){
  const path=`research/raw/allegations-map/${name}.json`,manifest=`research/raw/allegations-map/${name}-evidence/sha256-manifest.json`;
  if(!existsSync(path)){errors.push(`Missing ${name} research slice`);continue;}
  const raw=JSON.parse(readFileSync(path,'utf8'));errors.push(...validateDeepSlice(raw,`allegations-${name}`));
  for(const edge of raw.relationships)if(edge.tier==='alleged'&&!edge.responseIds.length)errors.push(`${name}/${edge.id}: attributed allegations need explicit linked response or response-gap context`);
  if(!existsSync(manifest))errors.push(`Missing ${name} source manifest`);else errors.push(...validateManifestRows(JSON.parse(readFileSync(manifest,'utf8')).artifacts));
 }
 const retained='research/raw/allegations-map/retained-evidence/sha256-manifest.json';
 if(!existsSync(retained))errors.push('Missing retained correction source receipt');else errors.push(...validateManifestRows(JSON.parse(readFileSync(retained,'utf8')).artifacts));
 if(errors.length)return errors;
 const {INVESTIGATION_REGISTRY:registry}=await loadInvestigation(),api=await loadAllegations();errors.push(...validateInvestigation(registry));
 const view=api.getAllegationsView(registry);
 for(const namespace of api.ALLEGATIONS_NAMESPACES)if(!registry.coverage.some(row=>row.namespace===namespace))errors.push(`Missing integrated namespace ${namespace}`);
 if(view.counts.cases<5)errors.push('Five reviewed cases required by the declared release scope');
 if(view.missingIds.length)errors.push(`Missing evidence closure: ${view.missingIds.join(', ')}`);
 if(view.entries.some(row=>row.cohort!=='new'))errors.push('Default new-research view leaked inherited claims');
 for(const entry of view.entries)for(const id of entry.responseIds)if(!view.records.some(row=>row.id===id))errors.push(`${entry.id}: dropped response ${id}`);
 const scene=api.buildMapEvidenceScene(view.evidenceRegistry);
 if(scene.stateHubs.some(hub=>'lon' in hub||'lat' in hub))errors.push('A schematic state hub carries an invented entity coordinate');
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const errors=await validateAllegations();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else{const {INVESTIGATION_REGISTRY:r}=await loadInvestigation(),api=await loadAllegations(),view=api.getAllegationsView(r);console.log(`Allegations validated: ${view.counts.cases} reviewed casefiles, ${view.counts.outcomes} outcome records, ${view.counts.allegedLinks} separately counted alleged links; exact source/response closure and withdrawn-claim history retained.`);}}
