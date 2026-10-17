// Deterministic local-only fixture build. Never changes the two delivered HTML files.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {build} from '../dependencies/esbuild/lib/main.js';
const root=resolve(new URL('..',import.meta.url).pathname),hash=b=>createHash('sha256').update(b).digest('base64');
const html=readFileSync(resolve(root,'dist/index.html'),'utf8');
const inputs=[...html.matchAll(/<script\b[^>]*type="application\/octet-stream"[^>]*>[\s\S]*?<\/script>/g)].map(x=>x[0]).join('');
if((inputs.match(/<script/g)||[]).length!==6)throw Error('Exact six embedded inputs required');
const result=await build({entryPoints:[resolve(root,'fixtures/controller-entry.ts')],bundle:true,format:'iife',platform:'browser',target:'es2022',write:false,minify:true,legalComments:'none'}),js=result.outputFiles[0].text;
if(js.toLowerCase().includes('</script'))throw Error('Unsafe script');
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const output=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash(js)}'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>World board isolated controller fixture</title><style>${css}</style></head><body><aside><h1>Isolated test fixture</h1><p>Test-only File API adapter. The delivered world board does not have this importer.</p><label>Test packet<input id="fixture-file" type="file" accept="application/json"></label></aside><div id="world-root"></div>${inputs}<script>${js}</script></body></html>`;
writeFileSync(resolve(root,process.argv[2]||'dist/controller-fixture.html'),output,{flag:'wx'});
console.log(JSON.stringify({fixture:'controller-fixture.html',bytes:Buffer.byteLength(output),sha256:createHash('sha256').update(output).digest('hex'),nativeExecuted:false}));
