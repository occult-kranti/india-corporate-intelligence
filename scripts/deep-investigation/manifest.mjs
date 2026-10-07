#!/usr/bin/env node
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='research/raw/deep-investigation';
const output=`${root}/sha256-manifest.json`;
function walk(folder){return readdirSync(folder,{withFileTypes:true}).filter(row=>row.name!=='__pycache__'&&!row.name.endsWith('.pyc')&&!row.name.endsWith('.partial')).flatMap(row=>row.isDirectory()?walk(`${folder}/${row.name}`):[`${folder}/${row.name}`]);}
const artifacts=walk(root).filter(path=>path!==output&&!path.endsWith('.partial')).sort().map(path=>{const bytes=readFileSync(path);return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
writeFileSync(output,`${JSON.stringify({schemaVersion:1,purpose:'Archive integrity inventory. A hash proves retained bytes, not the truth of their content or a successful original-source retrieval.',artifacts},null,2)}\n`);
console.log(`Inventoried ${artifacts.length} retained research artifacts.`);
