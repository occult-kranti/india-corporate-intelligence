import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
export async function loadAtlas(){const result=await build({entryPoints:[fileURLToPath(new URL('../../src/data/atlasInvestigation.ts',import.meta.url))],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node20'});const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);return module.exports;}
