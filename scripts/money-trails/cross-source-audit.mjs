#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadInvestigation } from '../investigation/load.mjs';
import { loadMoneyTrails } from './load.mjs';
const { INVESTIGATION_REGISTRY: registry } = await loadInvestigation();
const api = await loadMoneyTrails();
const trails = api.MONEY_TRAILS.map(trail => {
 const detail = api.getMoneyTrailDetail(registry,trail.id);
 if(!detail || detail.missingIds.length) throw new Error(`Missing evidence for ${trail.id}`);
 const sourceIds = new Set(detail.evidence.sources.map(row=>row.id));
 const pathIds = new Set(detail.pathRegistry.relationships.map(row=>row.id));
 const context = detail.contextRegistry.relationships.filter(row=>!pathIds.has(row.id));
 return {
  trailId:trail.id,caseRecordId:trail.caseRecordId,
  hopEvidence:detail.hops.map(hop=>({id:hop.id,basis:hop.basis,flowState:hop.flowState,financialStage:hop.financialStage,relationshipIds:hop.relationshipIds,
   sourceIds:hop.sourceIds,sourceFamilies:[...new Set(hop.sourceLocators.map(row=>row.sourceFamily).filter(Boolean))].sort(),
   allSourcesInClosure:hop.sourceIds.every(id=>sourceIds.has(id)),stopReason:hop.stopReason??null,missingNextDocument:hop.missingNextDocument})),
  exactPathRelationshipIds:[...pathIds].sort(),
  separateContext:context.map(row=>({id:row.id,from:row.from,to:row.to,kind:row.kind,namespace:row.namespace,sourceIds:row.sourceIds})).sort((a,b)=>a.id.localeCompare(b.id)),
  contextNamespaces:[...new Set(context.map(row=>row.namespace))].sort(),
  explicitGaps:detail.hops.filter(row=>row.flowState==='gap').map(row=>({id:row.id,relationshipIds:row.relationshipIds,documentHolder:row.documentHolder,nextDocument:row.missingNextDocument})),
  evidenceCounts:{entities:detail.evidence.entities.length,relationships:detail.evidence.relationships.length,records:detail.evidence.records.length,sources:detail.evidence.sources.length},
 };
});
const projection=registry.relationships.map(({id,from,to,kind,sourceIds})=>({id,from,to,kind,sourceIds}));
const result={schemaVersion:1,evidenceAsOf:registry.updatedAt,registry:{entities:registry.entities.length,relationships:registry.relationships.length,records:registry.records.length,sources:registry.sources.length},
 relationshipProjectionSha256:createHash('sha256').update(JSON.stringify(projection)).digest('hex'),
 method:'Deterministic audit of explicitly authored hops and separately displayed two-hop exact identity/ownership/role context. No fuzzy names, inferred cash hops, shared-address joins, new adverse claims or amount totals.',
 limitation:'Retained context keeps its original source review date. Source-family labels describe provenance grouping, not a guarantee of independent corroboration. A stopped path does not prove there was no further transfer.',trails};
const path='research/money-trails/cross-source-audit.json',text=`${JSON.stringify(result,null,2)}\n`;
if(process.argv.includes('--verify')){if(readFileSync(path,'utf8')!==text)throw new Error('Cross-source audit changed; inspect and regenerate');console.log(`Verified ${trails.length} exact trails against ${registry.relationships.length} retained relationships.`);}
else{mkdirSync('research/money-trails',{recursive:true});writeFileSync(path,text);console.log(`Audited ${trails.length} explicit trails and separate source-backed context.`);}
