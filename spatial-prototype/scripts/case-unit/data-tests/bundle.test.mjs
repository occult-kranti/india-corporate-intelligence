import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {gzipSync}from'node:zlib';import {dir,build,fixtures,canonicalSource,acceptedCatalog}from'./test-tools.mjs';
const result=await build({entryPoints:[path.join(dir,'loader.ts')],bundle:true,write:false,format:'esm',platform:'browser',splitting:true,minify:true,outdir:path.join(dir,'.virtual-build'),metafile:true,external:['react','react/jsx-runtime']});
const files=result.outputFiles.map(f=>({file:path.basename(f.path),rawBytes:f.contents.byteLength,gzipBytes:gzipSync(f.contents).byteLength}));
const root=result.outputFiles.find(f=>path.basename(f.path)==='loader.js'),lazy=result.outputFiles.filter(f=>f.path.endsWith('.js')&&f!==root);
const limits={initialJavaScriptRawBytes:2048,initialCssRawBytes:16384,lazyJavaScriptRawBytes:600000,lazyJavaScriptGzipBytes:128000};
const initialCss=result.outputFiles.filter(f=>f.path.endsWith('loader.css')).reduce((n,f)=>n+f.contents.byteLength,0);
const raw=lazy.reduce((n,f)=>n+f.contents.byteLength,0),gz=lazy.reduce((n,f)=>n+gzipSync(f.contents).byteLength,0);
const baselineSizes=JSON.parse(fs.readFileSync(path.join(fixtures,'accepted-baseline-sizes.json'),'utf8'));
const baselinePayload=baselineSizes.baseline14CaseReviewedInput,v2Payload=baselineSizes.v2FullExpandedCatalog;
const baselineJsRaw=baselineSizes.fullJavaScriptComparison.baseline14CaseRawBytes,baselineJsGzip=baselineSizes.fullJavaScriptComparison.baseline14CaseGzipBytes;
const dataOnly=await build({entryPoints:[canonicalSource],bundle:true,write:false,format:'esm',platform:'browser',minify:true});
const generatedData=fs.readFileSync(canonicalSource);
const compact=Buffer.from(JSON.stringify(JSON.parse(generatedData)));
const normalizedPayload={readableRawBytes:generatedData.byteLength,readableGzipBytes:gzipSync(generatedData).byteLength,compactRawBytes:compact.byteLength,compactGzipBytes:gzipSync(compact).byteLength};
const payloadFootprint={
 oldFourteenCaseTargetRawBytes:350000,oldTargetScope:'14-case public payload; not an approved 19-case or whole-JS budget',
 baseline14CaseReviewedInput:baselinePayload,v2FullExpandedCatalog:v2Payload,normalizedPublicTransport:normalizedPayload,normalizedTransportIncreaseBytes:generatedData.byteLength-baselinePayload.readableRawBytes,normalizedTransportWithin350000Bytes:generatedData.byteLength<=350000,
 readablePayloadIncreaseBytes:v2Payload.readableRawBytes-baselinePayload.readableRawBytes,
 compactPayloadIncreaseBytes:v2Payload.compactRawBytes-baselinePayload.compactRawBytes,
 comparisonCaveat:'V1 input contains spokes and profiles; v2 catalog includes exact expanded legacy case objects plus new complete reader/original records and recursive source context. These are deliberately labeled formats.',
 expandedReviewCatalogWithin350000Bytes:false,hostPayloadBudgetDecision:'Normalized transport is within 350000 bytes. Expanded review catalog still exceeds the old target; actual host chunk/loading acceptance and budget review remain OPEN',
 losslessNormalization:{generatedDataSourceRawBytes:generatedData.byteLength,generatedDataSourceGzipBytes:gzipSync(generatedData).byteLength,dataOnlyMinifiedRawBytes:dataOnly.outputFiles[0].contents.byteLength,dataOnlyMinifiedGzipBytes:gzipSync(dataOnly.outputFiles[0].contents).byteLength,method:'Shared tables for 760 repeated strings and 221 arrays/objects; bounded data-only decoding. Full catalog equals readable review JSON. No shortened claim text, source loss or handwritten-code minification.'},
 fullJavaScriptComparison:{baseline14CaseRawBytes:baselineJsRaw,baseline14CaseGzipBytes:baselineJsGzip,v2DeferredRawBytes:raw,v2DeferredGzipBytes:gz,increaseRawBytes:raw-baselineJsRaw,increaseGzipBytes:gz-baselineJsGzip,scope:'Isolated equal-format esbuild probes with React external. V2 includes focus helper, explicit schema validation, complete fallback and compatibility gate. Not actual host chunks.'}
};
const receipt={status:'isolated_probe_not_integrated_acceptance',tool:'installed esbuild, React external, no installation',files,limits,limitsAuthority:'Provisional isolated stage regression ceilings only; not acceptance of the earlier 350 KB raw payload target or host budgets',payloadFootprint,observed:{initialJavaScriptRawBytes:root.contents.byteLength,initialCssRawBytes:initialCss,lazyJavaScriptRawBytes:raw,lazyJavaScriptGzipBytes:gz},browserRun:false,integratedViteBuild:false};
// Historical baseline sizes are pinned reference measurements; this suite writes no runtime or source-stage measurements.
test('opt-in lazy entry has no eager claims; isolated regression ceilings are separate from the open host payload gate',()=>{
 assert.ok(root.contents.byteLength<=limits.initialJavaScriptRawBytes);assert.ok(initialCss<=limits.initialCssRawBytes);assert.ok(raw<=limits.lazyJavaScriptRawBytes,`${raw} lazy raw bytes`);assert.ok(gz<=limits.lazyJavaScriptGzipBytes,`${gz} lazy gzip bytes`);
 assert.doesNotMatch(root.text,/Palantir|Oracle|source:|case:|reviewed-catalog|createElement|react/);assert.match(root.text,/import\(/);
 const meta=Object.values(result.metafile.outputs).find(o=>o.entryPoint?.endsWith('/loader.ts'));assert.ok(meta);assert.ok(meta.imports.every(i=>i.kind==='dynamic-import'));assert.deepEqual(Object.keys(meta.inputs).map(x=>path.basename(x)),['loader.ts']);
 assert.ok(lazy.some(f=>f.text.includes('olympus.case-diagram.2')));assert.ok(lazy.some(f=>f.text.includes('non_additive_potentially_overlapping_dated_reports')));
});

test('expanded runtime data exactly matches independent readable JSON despite lossless string reuse',async()=>{const {load}=await import('./test-tools.mjs');const a=await load('adapter.ts');assert.deepEqual(a.getCaseCatalog(),await acceptedCatalog());assert.equal(payloadFootprint.expandedReviewCatalogWithin350000Bytes,false);});
