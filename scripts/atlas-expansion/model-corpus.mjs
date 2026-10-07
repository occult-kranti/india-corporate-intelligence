#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const inputs=[
 ...['policy','institutions','oversight','international-finance','defence-trade'].map(name=>({namespace:`atlas-${name}`,path:`research/raw/atlas-expansion/${name}.json`})),
 ...['procurement','corporate','services','governance'].map(name=>({namespace:`deep-${name}`,path:`research/raw/deep-investigation/${name}.json`})),
 ...['finance','justice','welfare'].map(name=>({namespace:`${name}-research`,path:`research/raw/investigation/${name}-research.json`})),
 ...['education','water','public-works'].map(name=>({namespace:name,path:`src/data/${name}-research.json`})),
];
const registries=inputs.map(input=>{const bytes=readFileSync(input.path);return {...input,sha256:createHash('sha256').update(bytes).digest('hex'),value:JSON.parse(bytes)};});
const documents=registries.flatMap(({namespace,value})=>value.sources.map(source=>{
 const text=[source.summary??source.title,...source.limitations??[]].join(' ');
 for(const [key,value] of Object.entries({id:source.id,title:source.title,text,url:source.url}))if(typeof value!=='string'||!value.trim())throw new Error(`${namespace} source lacks ${key}`);
 return {id:`${namespace}:source:${source.id}`,title:source.title,text,url:source.url,evidenceTier:source.tier??'reported',retrievedAt:source.retrievedAt??null,sourceId:`${namespace}:source:${source.id}`,namespace};
})).sort((a,b)=>a.id.localeCompare(b.id));
if(new Set(documents.map(document=>document.id)).size!==documents.length)throw new Error('Duplicate source identity');
const corpus={schemaVersion:1,evidenceAsOf:'2026-10-06',sourceRegistries:registries.map(({path,sha256,namespace})=>({path,sha256,namespace})),inputKind:'Public researcher-authored source summaries and limitations from fifteen retained research slices. Not full documents, the entire legacy corpus or all NSE companies.',uniqueSourceUrls:new Set(documents.map(row=>row.url)).size,lineageLimitation:'Separate namespace summaries may cite one document. Repeated URLs are not independent corroboration.',documents};
const output='research/atlas-expansion/model-corpus.json',text=`${JSON.stringify(corpus,null,2)}\n`;
if(process.argv.includes('--verify')){if(readFileSync(output,'utf8')!==text)throw new Error('Discovery corpus changed: regenerate and rerun inference');console.log(`Verified ${documents.length} exact summaries from ${inputs.length} hashed research inputs.`);}else{mkdirSync('research/atlas-expansion',{recursive:true});writeFileSync(output,text);console.log(`Prepared ${documents.length} public source summaries.`);}
