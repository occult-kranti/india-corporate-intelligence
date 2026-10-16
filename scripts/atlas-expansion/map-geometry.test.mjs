import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
const result=await build({entryPoints:['src/components/investigation/mapEvidenceGeometry.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node20'}),module={exports:{}};
new Function('module','exports',result.outputFiles[0].text)(module,module.exports);
const {buildMapEvidenceGeometry}=module.exports;
const bounds=JSON.parse(readFileSync('src/components/investigation/assets/india-current36-bounds.json','utf8'));
const geographic=JSON.parse(readFileSync('src/components/investigation/assets/india-current36-wgs84.json','utf8'));
const insideRing=([x,y],ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;};
const insidePolygon=(point,rings)=>insideRing(point,rings[0])&&!rings.slice(1).some(ring=>insideRing(point,ring));
test('all 36 schematic hub anchors lie inside retained state geometry',()=>{assert.equal(bounds.length,36);for(const boundary of bounds){const feature=geographic.features.find(row=>row.id===boundary.code);const polygons=feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[feature.geometry.coordinates];assert.ok(polygons.some(polygon=>insidePolygon(boundary.schematicHub,polygon)),boundary.code);}});
const hubs=['MH','TN','DL'].map(stateCode=>({id:`state:${stateCode}`,stateCode}));
const edge=(id,from,to,patch={})=>({id,fromEntityId:'entity:a',toEntityId:'entity:b',fromPlacementId:from,toPlacementId:to,fromPlacementIds:from?[from]:[],toPlacementIds:to?[to]:[],...patch});
const scene={stateHubs:hubs,sites:[],selectedEntityId:null,selectedPlacementId:null,trails:[edge('visible','state:MH','state:TN'),edge('within','state:MH','state:MH'),edge('ambiguous',undefined,'state:TN',{fromPlacementIds:['state:MH','state:DL']}),edge('unknown',undefined,undefined)]};
test('ambiguous and unknown endpoints never acquire guessed line coordinates',()=>{const output=buildMapEvidenceGeometry(scene,null);assert.deepEqual(output.trails.map(row=>row.id),['visible']);assert.equal(output.withinHub,1);assert.equal(output.ambiguous,2);assert.equal(output.trails.length+output.withinHub+output.ambiguous,scene.trails.length);});
test('selection highlights exact incident relationships and preserves source endpoint order',()=>{const output=buildMapEvidenceGeometry(scene,{kind:'entity',id:'entity:a'});assert.equal(output.trails[0].highlighted,true);assert.deepEqual(output.trails[0].from,output.coordinates.get('state:MH'));assert.deepEqual(output.trails[0].to,output.coordinates.get('state:TN'));assert.equal(buildMapEvidenceGeometry(scene,{kind:'entity',id:'unrelated'}).trails[0].highlighted,false);});
const styleBuild=await build({entryPoints:['src/components/investigation/placesStyle.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node20'}),styleModule={exports:{}};new Function('module','exports',styleBuild.outputFiles[0].text)(styleModule,styleModule.exports);
test('flat provider style removes all extrusion/terrain while preserving street-scale footprints',()=>{const provider={version:8,sources:{osm:{type:'vector',url:'https://example.test/tiles'}},terrain:{source:'dem'},sky:{},layers:[{id:'building',type:'fill',source:'osm','source-layer':'building',minzoom:13,maxzoom:14,paint:{'fill-color':'#cccccc'}},{id:'tall',type:'fill-extrusion',source:'osm','source-layer':'building',minzoom:14,paint:{'fill-extrusion-height':50}}]};const flat=styleModule.exports.flatPlacesStyle(provider);assert.equal(flat.layers.some(layer=>layer.type==='fill-extrusion'),false);assert.equal(flat.terrain,undefined);assert.equal(flat.sky,undefined);assert.equal(flat.layers[0].maxzoom,undefined);assert.equal(flat.layers[0].minzoom,13);assert.equal(flat.layers[0]['source-layer'],'building');assert.deepEqual(flat.sources,provider.sources);assert.equal(provider.layers[0].maxzoom,14);assert.equal(flat.projection.type,'mercator');});

// A real click may precede the popover's prop-to-state effect. Wait for the exact ID,
// never a generic open reader, a fixed sleep, a forced click, or a retried action.
import {waitForExactReader} from './map-reader-readiness.mjs';
test('reader readiness waits for the exact selection and preserves before-wait/after-wait diagnostics',async()=>{
 const calls=[],diagnostics=[];let selected=false;
 const page={locator(selector){calls.push(selector);return {
  evaluateAll:async()=>[{id:selected?'entity:exact':'relationship:previous',kind:selected?'entity':'relationship',visible:true,heading:'Retained evidence'}],
  waitFor:async options=>{assert.deepEqual(options,{state:'visible',timeout:30000});await Promise.resolve();selected=true;},
 };}};
 const result=await waitForExactReader(page,'entity:exact',diagnostics);
 assert.equal(calls[1],'.atlas-evidence-popover[data-selection-id="entity:exact"]');
 assert.equal(result.beforeWait[0].id,'relationship:previous');assert.equal(result.afterWait[0].id,'entity:exact');
 assert.equal(result.outcome,'visible');assert.equal(diagnostics[0],result);
});
test('reader readiness preserves a timed-out failure and never repeats the input',async()=>{
 let waits=0;const error=new Error('Exact reader did not become visible'),diagnostics=[];
 const page={locator(){return {evaluateAll:async()=>[{id:'wrong-id',visible:true}],waitFor:async()=>{waits++;throw error;}};}};
 await assert.rejects(waitForExactReader(page,'entity:expected',diagnostics),e=>e===error);
 assert.equal(waits,1);assert.equal(diagnostics[0].outcome,'failed');assert.equal(diagnostics[0].afterWait[0].id,'wrong-id');
 await assert.rejects(waitForExactReader(page,'',diagnostics),TypeError);
 await assert.rejects(waitForExactReader(page,'entity:expected',diagnostics,Infinity),RangeError);
});
test('map browser retains exact-ID assertions and captures diagnostics without forced state',()=>{
 const script=readFileSync(new URL('./map-browser.mjs',import.meta.url),'utf8');
 for(const id of ['relationshipId','entityId'])assert.ok(script.includes(`await waitForExactReader(page, ${id}, selectionDiagnostics);`));
 assert.match(script,/Selecting a diagram endpoint changes the reader to that exact identity/);
 assert.match(script,/selection-failure\.png/);assert.match(script,/selection-readiness\.json/);
 assert.doesNotMatch(script,/force:\s*true|dispatchEvent\([^)]*click|setCurrent/);
});

test('diagnostic artifact retention is additive and does not skip the original browser gate',()=>{
 for(const file of ['ci.yml','deploy.yml']){
  const workflow=readFileSync(new URL(`../../.github/workflows/${file}`,import.meta.url),'utf8');
  assert.match(workflow,/npm run test:map:browser/);
  assert.match(workflow,/\/tmp\/atlas-flat-map-review\//);
  assert.match(workflow,/actions\/upload-artifact@v4/);
 }
});
