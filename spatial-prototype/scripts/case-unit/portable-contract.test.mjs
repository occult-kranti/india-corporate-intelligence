import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {suite,host,fixtures,build,hash,require} from './test-tools.mjs';
const transport=path.join(host,'src/case-data/transport-key-dictionary');
const reviewed={
 'decoder.mjs':'d6b2b11c91717698d381dcb016f98eae3cdc824b321b5650cc4e6e52eeb14d9f',
 'sha256.mjs':'668ef05dac3239659c35fa17a48ecc1db6efd7f08b6691e99a7e85ee3d9b71b4',
 'pins.mjs':'4d2922edb0e2362d8e15ac73a48a33948e7fca8c1c9bdf2a5484d747a4cca66a',
 'transport.kd.json':'997106fcae310c45d5aeefab7ebee93c8ef0dcd2c64d9f90cc661aa3439acc9a'
};
test('runtime compact decoder, digest implementation, pins and payload remain byte-identical to independent review',()=>{
 for(const[name,digest]of Object.entries(reviewed))assert.equal(hash(fs.readFileSync(path.join(transport,name))),digest,name);
 const source=fs.readFileSync(path.join(host,'src/case-data/runtime-transport.ts'),'utf8');
 assert.match(source,/import\s+\w+\s+from\s+['"]\.\/transport-key-dictionary\/transport\.kd\.json['"]/);
 assert.match(source,/import\s*\{\s*decodeReviewedTransport\s*\}\s*from\s*['"]\.\/transport-key-dictionary\/decoder\.mjs['"]/);
 assert.match(source,/export default decodeReviewedTransport\(/);
 assert.doesNotMatch(source,/decodeKeyDictionary|fetch\(|eval\(|new Function/);
});
test('repository fixture set contains only accepted hashes and labeled historical sizes; canonical raw remains in src',()=>{
 assert.deepEqual(fs.readdirSync(fixtures).sort(),['accepted-baseline-sizes.json','accepted-pins.json']);
 for(const file of ['accepted-pins.json','accepted-baseline-sizes.json']){
  const source=fs.readFileSync(path.join(fixtures,file),'utf8');
  assert.doesNotMatch(source,/"originalClaimRecord"\s*:\s*\{|"readerClaimRecord"\s*:\s*\{/);
 }
});
test('portable test modules resolve relative source imports only within this repository suite or runtime',()=>{
 function visit(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?visit(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 for(const file of visit(suite).filter(file=>file.endsWith('.mjs'))){
  const source=fs.readFileSync(file,'utf8');assert.doesNotMatch(source,/['"]\/workspace\//,file);
  const ts=require('typescript'),tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),imports=[];
  function inspect(node){if(ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier.text);if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0]))imports.push(node.arguments[0].text);ts.forEachChild(node,inspect);}inspect(tree);
  for(const specifier of imports.filter(specifier=>specifier.startsWith('.'))){const target=path.resolve(path.dirname(file),specifier);assert.ok(target.startsWith(suite+path.sep)||target.startsWith(path.join(host,'src')+path.sep),`${file}: ${specifier}`);assert.ok(fs.existsSync(target),`${file}: missing ${specifier}`);}
 }
});
test('actual reader closure has exactly one packed transport and zero test, review-stage, raw, or graphics inputs',async()=>{
 const result=await build({entryPoints:[path.join(host,'src/profile-host/reader-runtime.ts')],bundle:true,write:false,platform:'browser',format:'esm',metafile:true,external:['react','react/jsx-runtime'],loader:{'.css':'empty'}});
 const files=Object.keys(result.metafile.inputs);
 for(const file of files){const absolute=path.resolve(host,file);assert.ok(absolute.startsWith(path.join(host,'src')+path.sep)||absolute.startsWith(path.join(host,'node_modules')+path.sep),file);}
 assert.equal(files.filter(file=>file.endsWith('/transport-key-dictionary/transport.kd.json')).length,1);
 assert.equal(files.filter(file=>/reviewed-transport(?:\.canonical)?\.json|reviewed-catalog\.json|reviewed-input\.json|case-unit|local-integration|CaseSceneLayer|gl-boundary|geometry\.ts|integration-adapter|node_modules\/(three|maplibre-gl)/.test(file)).length,0);
});
