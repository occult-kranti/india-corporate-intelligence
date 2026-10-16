/** Compare the actual compact adapter route with the same pinned adapter over raw canonical data. */
import fs from 'node:fs';
import path from 'node:path';
import {build,host,repository,fixtures,canonicalSource,canonical,hash} from '../test-tools.mjs';
export {host,canonical,hash};
export const root=repository;
export const dir=path.join(host,'src/case-data/transport-key-dictionary');
const source=canonicalSource;
export const readSource=()=>fs.readFileSync(source,'utf8');
export async function loadRuntime(name,compact){
 const canonicalBaseline={name:'test-only-canonical-baseline',setup(api){
  api.onResolve({filter:/^\.\/runtime-transport$/},args=>args.importer===path.join(host,'src/case-data/adapter.ts')?{path:source}:null);
 }};
 const result=await build({entryPoints:[path.join(host,'src/case-data',name)],bundle:true,write:false,format:'esm',platform:'node',plugins:compact?[]:[canonicalBaseline]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
