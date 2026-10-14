#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadInvestigation } from '../investigation/load.mjs';
const { INVESTIGATION_REGISTRY: registry } = await loadInvestigation();
const documents = registry.sources.map(source => ({
  id: source.id, sourceId: source.id, namespace: source.namespace,
  title: source.title, text: [source.summary, ...source.limitations].join(' '), url: source.url,
  evidenceTier: source.tier, retrievedAt: source.retrievedAt,
})).sort((a,b) => a.id.localeCompare(b.id));
if (new Set(documents.map(row => row.id)).size !== documents.length) throw new Error('Duplicate source identifier');
const inputs = ['djb','mumbai','corporate'].flatMap(topic => ['slice.json','trails.json'].map(name => `research/raw/money-trails/${topic}/${name}`));
const sourceRegistries = inputs.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));
const corpus = { schemaVersion:1, evidenceAsOf:registry.updatedAt, sourceRegistries,
  registryProjectionSha256:createHash('sha256').update(JSON.stringify(documents)).digest('hex'),
  inputKind:'Public source titles, authored summaries and limitations from every retained integrated source entry. Full underlying documents, private records and bank ledgers are not model inputs.',
  lineageLimitation:'Repeated URLs and descriptions may derive from the same underlying assertion. A similarity rank does not establish independence, identity, ownership, a payment or wrongdoing.',
  uniqueSourceUrls:new Set(documents.map(row=>row.url)).size, documents };
const path='research/money-trails/model-corpus.json', output=`${JSON.stringify(corpus,null,2)}\n`;
if(process.argv.includes('--verify')){
 if(readFileSync(path,'utf8')!==output)throw new Error('Money-trail discovery corpus changed; regenerate and execute inference');
 console.log(`Verified ${documents.length} source-summary entries across the complete integrated registry.`);
}else{mkdirSync('research/money-trails',{recursive:true});writeFileSync(path,output);console.log(`Prepared ${documents.length} source-summary entries; ${corpus.uniqueSourceUrls} distinct cited URLs.`);}
