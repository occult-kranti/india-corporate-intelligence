import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
let cached;
export async function loadDeepInvestigation(){
 if(cached)return cached;
 const result=await build({entryPoints:[`${root}src/data/deepInvestigation.ts`],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node20'});
 const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);cached=module.exports;return cached;
}
