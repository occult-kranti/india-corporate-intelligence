#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadInvestigation} from '../investigation/load.mjs';
const {INVESTIGATION_REGISTRY:r,isInvestigationConnectivityEdge}=await loadInvestigation();
const kinds=new Map(),amountGroups=new Map(),adjacency=new Map();
for(const edge of r.relationships){
 const count=kinds.get(edge.kind)??{kind:edge.kind,relationships:0,withAmounts:0,withResponses:0,eligibleConnectors:0};
 count.relationships++;count.withAmounts+=Number(edge.amounts.length>0);count.withResponses+=Number(edge.responseIds.length>0);count.eligibleConnectors+=Number(isInvestigationConnectivityEdge(edge));kinds.set(edge.kind,count);
 for(const amount of edge.amounts){const key=JSON.stringify([amount.currency,amount.unit,amount.stage,amount.period]);const row=amountGroups.get(key)??{currency:amount.currency,unit:amount.unit,stage:amount.stage,period:amount.period,observations:0};row.observations++;amountGroups.set(key,row);}
 if(isInvestigationConnectivityEdge(edge))for(const [from,to] of [[edge.from,edge.to],[edge.to,edge.from]]){const neighbors=adjacency.get(from)??new Set();neighbors.add(to);adjacency.set(from,neighbors);}
}
const visited=new Set(),components=[];
for(const entity of r.entities){if(visited.has(entity.id))continue;const queue=[entity.id];visited.add(entity.id);for(let cursor=0;cursor<queue.length;cursor++)for(const id of adjacency.get(queue[cursor])??[])if(!visited.has(id)){visited.add(id);queue.push(id);}components.push(queue.length);}
const canonical={entities:r.entities,relationships:r.relationships,records:r.records,sources:r.sources,held:r.held};
const artifact={schemaVersion:1,evidenceAsOf:r.updatedAt,registrySha256:createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),method:'Deterministic census of the actual assembled registry. Kind counts, staged observation counts and source-backed undirected connected components. No name joins, generated relations, money totals or wrongdoing predictions.',population:{entities:r.entities.length,relationships:r.relationships.length,records:r.records.length,sources:r.sources.length,held:r.held.length},namespaces:r.coverage,relationshipKinds:[...kinds.values()].sort((a,b)=>a.kind.localeCompare(b.kind)),amountObservationGroups:[...amountGroups.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),connectivity:{components:components.length,componentSizes:components.sort((a,b)=>b-a),limitations:'A component can arise from shared exchange, sector, government or fund nodes. Connectivity does not imply influence or misconduct. Analytic, response, contra, denial, supersede and comparison links do not expand components.'}};
const output='research/deep-investigation/discovery-inventory.json',text=`${JSON.stringify(artifact,null,2)}\n`;
if(process.argv.includes('--verify')){if(readFileSync(output,'utf8')!==text)throw new Error('Retained-corpus discovery inventory differs from the current registry');}else{mkdirSync('research/deep-investigation',{recursive:true});writeFileSync(output,text);}
console.log(`${process.argv.includes('--verify')?'Verified':'Mined'} ${r.relationships.length} retained relationships in ${kinds.size} typed categories; ${components.length} sourced components. No new identity or financial claim inferred.`);
