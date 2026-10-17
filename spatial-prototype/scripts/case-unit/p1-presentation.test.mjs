/** Local P1-A proposal verification. No native/browser acceptance is claimed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {host,fixtures,hash,pins,p1Presentation,P1_PRESENTATION_PATHS,assertP1PresentationManifest,assertSourcePin} from './test-tools.mjs';
const sourceBodyBase=JSON.parse(fs.readFileSync(path.join(fixtures,'selected-rail-base-pins.json'),'utf8'));
const clone=()=>structuredClone(p1Presentation);

test('separate P1-A manifest preserves original fixture bytes, all 348 ordered state/action/DOM baselines and exactly five production paths',()=>{
 assertP1PresentationManifest();
 assert.equal(p1Presentation.transitions.length,348);
 assert.equal(new Set(p1Presentation.transitions.map(row=>`${row.caseId}/${row.actionIndex}`)).size,348);
 assert.equal(Object.keys(sourceBodyBase.sourceEvidenceHtmlSha256).length,72);
 assert.equal(p1Presentation.productionSources.length,5);
 assert.equal(p1Presentation.productionSources.filter(row=>Object.hasOwn(pins.runtimeSources,row.relative)).length,4);
 assert.ok(P1_PRESENTATION_PATHS.includes('profile-host/CaseWorkspace.tsx'),'The fifth host path must never be omitted');
 for(const relative of Object.keys(pins.runtimeSources))assertSourcePin(relative);
 for(const relative of P1_PRESENTATION_PATHS)assertSourcePin(relative);
});

test('P1-A source inventory exactly partitions 122 runtime files into 117 original strict pins and five exact proposals',()=>{
 function visit(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?visit(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
 const runtime=visit(path.join(host,'src')).map(file=>path.relative(host,file)).sort();
 const protectedPaths=Object.keys(sourceBodyBase.protectedSourceFiles);
 const presentationPaths=P1_PRESENTATION_PATHS.map(relative=>`src/${relative}`);
 assert.equal(protectedPaths.length,117);assert.equal(runtime.length,122);
 assert.equal(new Set([...protectedPaths,...presentationPaths]).size,122);
 assert.deepEqual(runtime,[...protectedPaths,...presentationPaths].sort(),'Missing, extra or silently unpinned runtime file');
 for(const [relative,digest]of Object.entries(sourceBodyBase.protectedSourceFiles))assert.equal(hash(fs.readFileSync(path.join(host,relative))),digest,relative);
 for(const relative of P1_PRESENTATION_PATHS)assertSourcePin(relative);
});

test('manifest rejects missing, extra or reordered paths/transitions and any original action/state/DOM change',()=>{
 for(const mutate of [
  manifest=>manifest.productionSources.pop(),
  manifest=>manifest.productionSources.push({...manifest.productionSources[0],relative:'case-scene/controller.ts'}),
  manifest=>manifest.productionSources.reverse(),
  manifest=>manifest.transitions.pop(),
  manifest=>manifest.transitions.push(manifest.transitions[0]),
  manifest=>manifest.transitions.reverse(),
  manifest=>manifest.transitions[0].actionIndex++,
  manifest=>manifest.transitions[0].action={type:'reset'},
  manifest=>manifest.transitions[0].stateSha256='0'.repeat(64),
  manifest=>manifest.transitions[0].baselineDomSha256='0'.repeat(64),
  manifest=>manifest.acceptedPinsSha256='0'.repeat(64),
  manifest=>manifest.acceptedBaselineSizesSha256='0'.repeat(64),
  manifest=>manifest.sourceBodyBaselineFixtureSha256='0'.repeat(64),
  manifest=>manifest.productionSources[0].baselineSha256='0'.repeat(64),
 ]){const manifest=clone();mutate(manifest);assert.throws(()=>assertP1PresentationManifest(manifest));}
});
