import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
export async function loadAllegations(){const result=await build({stdin:{contents:"export * from './src/data/mapEvidence';export * from './src/data/allegationsInvestigation';",resolveDir:fileURLToPath(new URL('../..',import.meta.url)),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node24'});const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);return module.exports;}
