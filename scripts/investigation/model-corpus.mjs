#!/usr/bin/env node
/** Public researcher-written summaries only; exact provenance, no claim generation. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const inputs=['finance','justice','welfare'].map(domain=>({domain,path:`research/raw/investigation/${domain}-research.json`}));
const registries=inputs.map(input=>{const bytes=readFileSync(input.path);return {...input,sha256:createHash('sha256').update(bytes).digest('hex'),value:JSON.parse(bytes)};});
const documents=registries.flatMap(({domain,value})=>value.sources.map(source=>{
 for(const key of ['id','title','summary','url'])if(typeof source[key]!=='string'||!source[key].trim())throw new Error(`${domain} source lacks ${key}`);
 return {id:`${domain}:${source.id}`,title:source.title,text:[source.summary,...source.limitations??[]].join(' '),url:source.url,evidenceTier:source.tier,retrievedAt:source.retrievedAt,sourceId:source.id,domain};
})).sort((a,b)=>a.id.localeCompare(b.id));
if(new Set(documents.map(document=>document.id)).size!==documents.length)throw new Error('Duplicate namespaced summary identity');
const corpus={schemaVersion:1,evidenceAsOf:'2026-10-06',sourceRegistries:registries.map(({path,sha256,domain})=>({path,sha256,domain})),inputKind:'Public researcher-authored source summaries and limitations; not full documents, not legal or corruption findings',documents};
const output='research/investigation/model-corpus.json';const text=`${JSON.stringify(corpus,null,2)}\n`;
if(process.argv.includes('--verify')){if(readFileSync(output,'utf8')!==text)throw new Error('Model corpus differs from the current raw research slices; regenerate and rerun inference');console.log(`Verified ${documents.length} exact public summaries and three research input hashes.`);}else{mkdirSync('research/investigation',{recursive:true});writeFileSync(output,text);console.log(`Prepared ${documents.length} public source summaries at ${output}.`);}
