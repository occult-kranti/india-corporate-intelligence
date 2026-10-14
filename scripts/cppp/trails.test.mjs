import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {buildTrails,trailId} from './build-trails.mjs';
import {validateResearchSlice} from '../investigation/validate.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const read=file=>JSON.parse(readFileSync(`${root}${file}`,'utf8'));
const sourceFiles={reviewed:'src/data/public-works-research.json',rates:'research/raw/cppp/rates.json',concentration:'research/raw/cppp/concentration.json',provenance:'research/raw/cppp/provenance.json'};
const inputs=Object.fromEntries(Object.entries(sourceFiles).map(([name,file])=>[name,read(file)]));
const built=buildTrails(inputs);
const result=await build({entryPoints:[`${root}src/data/procurementTrails.ts`],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent',target:'node20'});
const module={exports:{}};new Function('module','exports',result.outputFiles[0].text)(module,module.exports);const api=module.exports;

test('committed compact artifact matches the deterministic projection and exact current source hashes',()=>{
 const fingerprints=Object.entries(sourceFiles).map(([name,file])=>{const bytes=readFileSync(`${root}${file}`);return {name,file,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};});
 const expected=buildTrails(inputs,fingerprints);
 const committed=readFileSync(`${root}src/data/procurement-trails.json`,'utf8');
 assert.deepEqual(JSON.parse(committed).inputs,fingerprints,'Source bytes changed: run node scripts/cppp/build-trails.mjs after any required public-works assembly.');
 assert.equal(committed,`${JSON.stringify(expected)}\n`,'Committed procurement-trails.json is stale or was edited independently of its generator.');
});

test('reviewed scope exact-joins rates and preserves three distinct award populations',()=>{
 assert.equal(built.buyers.length,156);assert.equal(built.buyers.filter(row=>row.concentration).length,133);
 for(const row of built.buyers){const r=inputs.rates.byOrganisation.find(r=>r.portal===row.portal&&r.key===row.buyer),c=inputs.concentration.byBuyer.find(c=>c.portal===row.portal&&c.buyer===row.buyer);assert.equal(row.bidRate.n,r.n);assert.equal(row.bidRate.singleBidder,r.singleBidder);if(c){assert.equal(row.concentration.namedPlausibleAwards,c.awards);assert.equal(row.concentration.markedAwards,c.markedAwards);assert.equal(c.awards,c.markedAwards+c.unmarkedAwards);}else assert.equal(row.concentration,null);}
 const mes=built.buyers.find(row=>row.buyer==='E-IN-C BRANCH - MILITARY ENGINEER SERVICES');assert.equal(mes.bidRate.n,275710);assert.equal(mes.concentration.namedPlausibleAwards,275705);assert.equal(mes.concentration.markedAwards,194597);
 assert.equal(JSON.stringify(built),JSON.stringify(buildTrails(inputs)));
});
test('IDs distinguish portal, exact buyer spelling, snapshot and rule; drift cannot silently join',()=>{
 const args=['central','Buyer','snapshot','rule'],base=trailId(...args);for(let i=0;i<args.length;i++){const changed=[...args];changed[i]+='x';assert.notEqual(trailId(...changed),base);}
 const stale=structuredClone(inputs);stale.rates.provenance.asOf='2099-01-01';assert.throws(()=>buildTrails(stale),/snapshot or buyer rule mismatch/);
 const missing=structuredClone(inputs);missing.rates.byOrganisation=missing.rates.byOrganisation.filter(row=>row.key!==missing.reviewed.buyers[0].buyer);assert.throws(()=>buildTrails(missing),/missing rate/);
 const conflicting=structuredClone(inputs);conflicting.reviewed.buyers[0].n++;assert.throws(()=>buildTrails(conflicting),/Reviewed rate differs/);
});
test('registry slice is pinnable evidence with closed sources, no supplier entities, payment amounts or asset geography',()=>{
 assert.deepEqual(validateResearchSlice(api.PROCUREMENT_TRAIL_SLICE,'procurement-trails'),[]);
 assert.deepEqual(api.PROCUREMENT_TRAIL_SLICE.entities,[]);assert.deepEqual(api.PROCUREMENT_TRAIL_SLICE.relationships,[]);
 const sources=new Set(api.PROCUREMENT_TRAIL_SOURCES.map(row=>row.id));
 for(const row of api.PROCUREMENT_TRAIL_RECORDS){assert.deepEqual(row.amounts,[]);assert.deepEqual(row.entityIds,[]);assert.deepEqual(row.relationshipIds,[]);assert.ok(row.sourceIds.every(id=>sources.has(id)));assert.equal(row.fromDate,null);assert.equal(row.toDate,null);assert.ok(row.geography.every(geo=>geo.basis==='national-context'&&geo.stateCodes.length===0&&geo.localityIds.length===0));assert.equal(api.getProcurementTrailForRecord(api.procurementTrailRecordId(row.id)).id,row.id);}
 assert.ok(/156 reviewed/.test(api.PROCUREMENT_TRAIL_SCOPE));assert.ok(/1215 concentration/.test(api.PROCUREMENT_TRAIL_SCOPE));
});
test('lazy details expose only retained marked labels and reject mismatched buyer counts',()=>{
 const raw=inputs.concentration;
 const data={family:raw.family,namingRule:raw.namingRule,innocentReading:raw.innocentReading,rows:raw.byBuyer.map(row=>({...row,hhiCount:row.hhiMarkedCount,hhiValue:row.hhiMarkedValue,winners:row.topMarkedWinners??[]}))};
 const trail=api.PROCUREMENT_TRAILS.find(row=>row.concentration);
 const details=api.procurementTrailDetails(trail,data);
 const expected=raw.byBuyer.find(row=>row.portal===trail.portal&&row.buyer===trail.buyer);
 assert.deepEqual(details.labels.map(row=>row.label),(expected.topMarkedWinners??[]).map(row=>row.name));assert.ok(details.labels.every(row=>row.identityStatus==='dataset-label-only'&&row.awards>=5));
 assert.equal(api.procurementTrailDetails(trail,null),null);
 assert.throws(()=>api.procurementTrailDetails({...trail,concentration:{...trail.concentration,markedAwards:0}},data),/snapshot differs/);
 assert.ok(api.PROCUREMENT_TRAILS.filter(row=>!row.concentration).every(row=>row.concentrationStatus==='outside-retained-concentration-family'));
 const compactText=readFileSync(`${root}src/data/procurement-trails.json`,'utf8');assert.ok(JSON.parse(compactText).buyers.every(row=>!Object.hasOwn(row.concentration??{},'topMarkedWinners')));assert.ok(!compactText.includes('Tiwarinassociates'));
});
