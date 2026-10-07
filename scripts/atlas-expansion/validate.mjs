#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateDeepSlice} from '../deep-investigation/validate.mjs';
import {validateInvestigation,validateManifestRows} from '../investigation/validate.mjs';
import {loadInvestigation} from '../investigation/load.mjs';
import {loadAtlas} from './load.mjs';
export const ATLAS_SLICES=['policy','institutions','oversight','international-finance','defence-trade'];
export async function validateAtlas(){
 const errors=[];
 for(const name of ATLAS_SLICES){const path=`research/raw/atlas-expansion/${name}.json`;if(!existsSync(path)){errors.push(`Missing atlas research slice ${name}`);continue;}const raw=JSON.parse(readFileSync(path,'utf8'));errors.push(...validateDeepSlice(raw,`atlas-${name}`));
  const manifest=`research/raw/atlas-expansion/${name}-evidence/sha256-manifest.json`;if(!existsSync(manifest)){errors.push(`Missing atlas source manifest ${name}`);continue;}const contents=JSON.parse(readFileSync(manifest,'utf8'));errors.push(...validateManifestRows(contents.artifacts??contents.files??contents));
 }
 if(errors.length)return errors;
 const {INVESTIGATION_REGISTRY:registry}=await loadInvestigation(),api=await loadAtlas();errors.push(...validateInvestigation(registry),...api.validateAtlasSites(registry,api.ATLAS_SITES));
 for(const namespace of api.ATLAS_NAMESPACES)if(!registry.coverage.some(row=>row.namespace===namespace))errors.push(`Missing integrated atlas namespace ${namespace}`);
 for(const record of registry.records.filter(row=>api.ATLAS_NAMESPACES.includes(row.namespace)&&['policy-change','investigation-case'].includes(row.kind))){
  const closure=api.getAtlasEvidenceClosure(registry,[{kind:'record',id:record.id}]);if(closure.missingIds.length)errors.push(`${record.id}: missing evidence closure ${closure.missingIds.join(',')}`);
  if(record.kind==='policy-change'&&!record.fromDate&&!record.toDate)errors.push(`${record.id}: policy timeline requires an exact sourced event date`);
 }
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const errors=await validateAtlas();if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else{const api=await loadAtlas(),{INVESTIGATION_REGISTRY:registry}=await loadInvestigation(),feed=api.getAtlasCaseFeed(registry);console.log(`Atlas source/response closure validated; ${feed.total} case/finding records, ${api.getAtlasPolicyTimeline(registry).length} policy changes and ${api.ATLAS_SITES.length} verified public sites.`);}}
