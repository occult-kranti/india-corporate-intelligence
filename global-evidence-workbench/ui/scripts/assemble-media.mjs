import fs from 'node:fs';import path from 'node:path';import {mediaValidation} from '../src/media-model.js';
const input=process.argv[2]??'research/media-seeds';
const packets=['media','musk-thiel'];
const result={meta:{as_of:'2026-10-15',schema:'media-power-v1',scope:'Selected primary-source-led media transactions and Musk/Thiel company, investment and political-activity records. Historical and prospective snapshots are not a current cap table or a global census. Geographic points are labeled jurisdiction or headquarters references; no operating footprint or election influence is inferred.'},entities:[],edges:[],sources:[],gaps:[],claims:[],cases:[],coverage:[]};
for(const packet of packets){
 const root=path.join(input,packet);
 for(const key of ['entities','edges','sources','gaps','claims','cases','coverage']){
  const file=path.join(root,key+'.json');
  if(!fs.existsSync(file)){if(['entities','edges','sources','gaps'].includes(key))throw Error('Missing required research packet '+file);continue;}
  const parsed=JSON.parse(fs.readFileSync(file,'utf8'));const data=Array.isArray(parsed)?parsed:parsed[key];if(!Array.isArray(data))throw Error(file+' must be an array');
  for(const item of data){const row={...item,research_packet:packet};if(result[key].some(x=>x.id&&x.id===row.id))throw Error('Duplicate ID across research packets: '+row.id);result[key].push(row);}
 }
}
// Explicit source-backed jurisdiction assertions may be drawn at coarse country-reference points.
// These are presentation geometry, never inferred HQ, operations or personal locations.
const countryReference={US:{lat:39,lon:-98,name:'United States'},AE:{lat:24,lon:54,name:'United Arab Emirates'}};
for(const n of result.entities){const p=countryReference[n.country];const g=n.geo_scope;if(!n.location&&n.type!=='person'&&g?.basis==='jurisdiction'&&g.source_ids?.length&&p)n.location={lat:p.lat,lon:p.lon,basis:'jurisdiction',label:`${p.name} country reference. Source context: ${g.label}`,precision:'schematic country reference; not headquarters coordinates or an operating footprint',source_ids:g.source_ids,locator:g.locator};}
// Acquisition metadata stays in research packets. Never publish private local paths.
const omit=new Set(['original_path','originalPath','local_path','localPath','workspace_path','workspacePath','text_path','extract_path','raw_path','originalFile','download_path']);
const clean=x=>Array.isArray(x)?x.map(clean):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>!omit.has(k)).map(([k,v])=>[k,clean(v)])):x;
const output=clean(result),raw=JSON.stringify(output,null,2)+'\n';
if(/\/workspace\/|\/tmp\/|file:\/\//.test(raw))throw Error('Public payload contains a local acquisition path');
const errors=mediaValidation(output);if(errors.length)throw Error(errors.join('\n'));
if(!output.entities.length||!output.edges.length||!output.sources.length)throw Error('Refusing to emit an empty combined research collection');
fs.mkdirSync('public/data',{recursive:true});fs.writeFileSync('public/data/media.json',raw);
console.log(`Assembled ${output.entities.length} entities, ${output.edges.length} typed edges, ${output.sources.length} sources, ${output.gaps.length} gaps from both research packets.`);
