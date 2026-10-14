import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {validateWaterData,validateWaterRaw} from './validate.mjs';
const read=file=>JSON.parse(readFileSync(new URL(file,import.meta.url),'utf8'));
const data=read('../../src/data/water-research.json');
const raw={publicWater:read('../../research/raw/water/public-research.json'),food:read('../../research/raw/water/food-research.json'),weather:read('../../research/raw/water/weather-research.json')};
const source=readFileSync(new URL('../../src/data/water.ts',import.meta.url),'utf8').replace("import research from './water-research.json';",`const research = ${JSON.stringify(data)};`);
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText;
const water=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const clone=value=>structuredClone(value);

test('all reviewed records pass schema, geography, source and independent raw reconciliation',()=>{
 assert.deepEqual(validateWaterData(data),[]);
 assert.deepEqual(validateWaterRaw(data,raw),[]);
 assert.equal(data.sources.length,52);assert.equal(data.observations.length,355);
 assert.equal(data.states.length,36);assert.equal(data.discovery.length,14);
});

test('schema gate rejects malformed arrays, duplicate identities and orphan sources',()=>{
 assert.deepEqual(validateWaterData(null),['Dataset object required']);
 const broken=clone(data);delete broken.observations[0].sourceIds;
 assert.ok(validateWaterData(broken).some(error=>/sourceIds required/.test(error)));
 const duplicate=clone(data);duplicate.sources[1].id=duplicate.sources[0].id;
 duplicate.observations[0].sourceIds=['invented-source'];
 assert.ok(validateWaterData(duplicate).some(error=>/duplicate id/.test(error)));
 assert.ok(validateWaterData(duplicate).some(error=>/unknown or missing source/.test(error)));
});

test('numeric edits and unsupported local geography fail the data gate',()=>{
 const broken=clone(data);broken.observations.find(row=>row.id==='wf-pdmc-drip-2025').value+=1;
 broken.leads.find(row=>row.id==='wp-hebbal-reporting').stateCodes=['KL'];
 assert.ok(validateWaterRaw(broken,raw).some(error=>/differs from retained extraction/.test(error)));
 assert.ok(validateWaterRaw(broken,raw).some(error=>/PDMC.*reconcile/.test(error)));
 assert.ok(validateWaterData(broken).some(error=>/locality outside declared state/.test(error)));
});

test('source release dates determine window labels; retrieval and observation dates cannot substitute',()=>{
 const window={start:'2021-10-06',end:'2026-10-06'};
 assert.equal(water.classifyWaterWindow('2021-10-06',window),'in-window');
 assert.equal(water.classifyWaterWindow('2026-10-06',window),'in-window');
 assert.equal(water.classifyWaterWindow('2021-10-05',window),'background');
 assert.equal(water.classifyWaterWindow('2016-12',window),'background');
 assert.equal(water.classifyWaterWindow('2021-10',window),'undated');
 assert.equal(water.classifyWaterWindow('2024-03',window),'in-window');
 assert.equal(water.classifyWaterWindow(null,window),'undated');
 assert.equal(water.classifyWaterWindow('2025-02-30',window),'undated');
 assert.equal(water.classifyWaterWindow('2025-13-01',window),'undated');
 const source=data.sources.find(row=>row.id==='wp-jjm-j3');
 assert.equal(source.publishedAt,null);assert.equal(source.windowStatus,'undated');assert.match(source.period,/27 July 2026/);
 const broken=clone(data);broken.sources.find(row=>row.id===source.id).windowStatus='in-window';
 assert.ok(validateWaterData(broken).some(error=>/original-release window classification/.test(error)));
 broken.sources[0].publishedAt='2025-02-30';
 assert.ok(validateWaterData(broken).some(error=>/publication date precision invalid/.test(error)));
});

test('the strict five-year view excludes undated and older background but keeps them discoverable separately',()=>{
 const within=water.getWaterSources({windowStatus:'in-window'});
 assert.ok(within.length>0&&within.every(row=>row.publishedAt!==null&&row.windowStatus==='in-window'));
 assert.ok(!within.some(row=>row.id==='wx-drought-manual-2016'));
 assert.ok(water.getWaterSources({windowStatus:'background'}).some(row=>row.id==='wx-drought-manual-2016'));
 assert.ok(water.getWaterSources({windowStatus:'undated'}).some(row=>row.id==='wp-jjm-functionality-2024'));
 const crop=water.getWaterObservations({windowStatus:'in-window'});
 assert.ok(!crop.some(row=>row.id==='wf-rice-production-2023-24'));
});

test('state alone keeps labeled national context but local records must match the state',()=>{
 const rows=water.getWaterSources({stateCode:'KA'});
 assert.ok(rows.some(row=>row.id==='wp-jjm-dashboard'&&row.scope==='national'));
 assert.ok(rows.some(row=>row.id==='wx-bengaluru-shortage-2024'));
 assert.ok(!rows.some(row=>row.id==='wp-cag-kerala'));
 assert.deepEqual(water.getWaterSources({stateCode:'UNKNOWN'}),[]);
});

test('place searches cannot borrow publisher addresses, generic topics or another state’s locality',()=>{
 for(const place of ['Pune','Mandi','Rice','Imaginary Village 999']){
  assert.deepEqual(water.getWaterSources({place}),[],place);
  assert.deepEqual(water.getWaterObservations({place}),[],place);
  assert.deepEqual(water.getWaterLeads({place}),[],place);
 }
 assert.deepEqual(water.getWaterSources({stateCode:'KA',place:'Dahod'}),[]);
 assert.deepEqual(water.getWaterSources({stateCode:'ML',place:'Mima'}),[]);
 assert.ok(water.getWaterSources({q:'Pune'}).some(row=>row.publisher.includes('Pune')));
});

test('explicit village records remain findable without inventing village crop production',()=>{
 const source=water.getWaterSources({stateCode:'NL',place:'Mima'});
 assert.ok(source.some(row=>row.id==='wf-agri-annual'));
 assert.ok(water.getWaterLeads({stateCode:'NL',place:'Mima'}).some(row=>row.id==='wf-nagaland-training'));
 assert.deepEqual(water.getWaterObservations({stateCode:'NL',place:'Mima'}),[]);
 assert.ok(water.getWaterLeads({stateCode:'KA',place:'Hebbal Gadag'}).some(row=>row.id==='wp-hebbal-reporting'));
 assert.ok(water.getWaterSources({stateCode:'KA',place:'Bangalore'}).some(row=>row.id==='wx-bengaluru-shortage-2024'));
});

test('unknown villages retain official discovery routes independently of matching evidence',()=>{
 const filters={stateCode:'KA',place:'Imaginary Village 999',q:'no-matching-document',type:'news',windowStatus:'in-window',domain:'drinking-water'};
 assert.deepEqual(water.getWaterSources(filters),[]);
 assert.ok(water.getWaterDiscovery(filters).some(row=>row.id==='village-water-profile'));
 assert.ok(water.getWaterDiscovery({stage:'seed'}).some(row=>row.id==='seed-traceability'));
 assert.ok(water.getWaterDiscovery({stage:'seed'}).every(row=>row.stages.includes('seed')));
});

test('source kind and domains intersect and flow through linked observation provenance',()=>{
 assert.ok(water.getWaterSources({type:'discussion',place:'Bengaluru'}).length>=2);
 assert.ok(water.getWaterSources({type:'discussion',place:'Bengaluru'}).every(row=>row.tier==='reported'));
 const news=water.getWaterObservations({type:'news',domain:'drinking-water'});
 assert.ok(news.some(row=>row.id==='wx-bengaluru-shortage-2024-observation-1'));
 assert.ok(!news.some(row=>row.id.startsWith('wp-j3-')));
});

test('expired advisories never become live alerts and missing validity stays unknown',()=>{
 const forecast=data.sources.find(row=>row.id==='wx-agromet-cuttack-2025-07');
 assert.equal(forecast.issuedAt,'2025-07-01');
 assert.equal(forecast.validFrom,'2025-07-01T08:30:00+05:30');
 assert.equal(forecast.validUntil,'2025-07-06T08:30:00+05:30');
 assert.equal(water.getForecastStatus(forecast),'expired');
 assert.equal(water.getForecastStatus(data.sources.find(row=>row.id==='wx-imd-forecast-2024-05-23')),'unknown-validity');
 assert.equal(water.getForecastStatus({}),'not-forecast');
});

test('forecast issue, start and expiry are separate time boundaries including timezone offsets',()=>{
 const forecast={isForecast:true,issuedAt:'2025-07-01T06:00:00+05:30',validFrom:'2025-07-01T08:30:00+05:30',validUntil:'2025-07-06T08:30:00+05:30'};
 assert.equal(water.getForecastStatus(forecast,'2025-07-01T00:00:00Z'),'not-yet-issued');
 assert.equal(water.getForecastStatus(forecast,'2025-07-01T02:00:00Z'),'not-yet-valid');
 assert.equal(water.getForecastStatus(forecast,'2025-07-06T03:00:00Z'),'active-at-snapshot');
 assert.equal(water.getForecastStatus(forecast,'2025-07-06T03:00:01Z'),'expired');
 assert.equal(water.getForecastStatus({...forecast,validUntil:'2024-01-01'}),'unknown-validity');
 assert.equal(water.getForecastStatus({...forecast,validUntil:'invalid'}),'unknown-validity');
});

test('rainfall alone cannot establish drought and a household connection is not safe functional water',()=>{
 assert.equal(water.assessWaterIndicatorClaim('drought',['rainfall']).sufficientIndicatorTypes,false);
 assert.equal(water.assessWaterIndicatorClaim('safe-functional-water',['household-connections']).sufficientIndicatorTypes,false);
 assert.equal(water.assessWaterIndicatorClaim('safe-functional-water',['supply-regularity','supply-quantity','water-quality']).sufficientIndicatorTypes,false);
 assert.equal(water.assessWaterIndicatorClaim('drought',['drought-declaration']).sufficientIndicatorTypes,true);
});

test('tender estimates and awards cannot become payment, nor crop production market arrivals',()=>{
 assert.equal(water.assessWaterIndicatorClaim('tender-payment',['tender-estimate','contract-award']).sufficientIndicatorTypes,false);
 assert.equal(water.assessWaterIndicatorClaim('tender-payment',['payment']).sufficientIndicatorTypes,true);
 assert.equal(water.assessWaterIndicatorClaim('market-arrivals',['crop-production']).sufficientIndicatorTypes,false);
 assert.equal(water.assessWaterIndicatorClaim('market-arrivals',['market-arrivals']).sufficientIndicatorTypes,true);
 const broken=clone(data);broken.observations[0].measure='tender-estimate';broken.observations[0].accountingStage='payment';
 assert.ok(validateWaterData(broken).some(error=>/financial measure and accounting stage disagree/.test(error)));
});

function comparison(){const basis={measure:'household-connections',unit:'households',geographyId:'fixture-village',geographicGrain:'village',period:'2026-07-27',sourceIds:['wp-jjm-j3'],populationBasis:'same enumerated households',methodology:'same administrative definition',boundaryVersion:'same village code'};return{left:{...basis},right:{...basis}};}
test('comparison requires matched geography, grain, period, unit, sample, method and source',()=>{
 assert.equal(water.assessWaterComparison(comparison()).comparable,true);
 const mutations=[
  input=>{input.right.geographicGrain='city';},input=>{input.right.geographyId='other-village';},
  input=>{input.right.period='2024';},input=>{input.right.unit='lakh households';},
  input=>{input.right.populationBasis='selected Har Ghar Jal village sample';},input=>{input.right.methodology='survey';},
  input=>{input.right.boundaryVersion='redrawn';},input=>{input.right.sourceIds=['invented'];},
  input=>{input.left.sourceIds=[];},input=>{input.right.measure='water-quality';},
  input=>{input.left.accountingStage='estimate';input.right.accountingStage='payment';},
 ];
 for(const mutate of mutations){const input=comparison();mutate(input);const result=water.assessWaterComparison(input);assert.equal(result.comparable,false);assert.ok(result.reasons.length);}
});

test('the survey minimum index is not an observed joint household measure',()=>{
 const rows=data.observations.filter(row=>row.id.endsWith('-reportedMinimumFunctionalityPct'));
 assert.equal(rows.length,35);assert.ok(rows.every(row=>row.measure==='other'));
 const national=rows.find(row=>row.id==='wp-fa-IN-reportedMinimumFunctionalityPct');
 assert.equal(national.value,76);assert.match(national.denominatorLabel,/not a joint household/);
 assert.equal(data.observations.find(row=>row.id==='wp-fa-IN-regularityPct').measure,'supply-regularity');
 assert.equal(data.observations.find(row=>row.id==='wp-fa-IN-quantityAtLeast55LpcdPct').measure,'supply-quantity');
 const broken=clone(data);broken.observations.find(row=>row.id===national.id).measure='supply-functionality';
 assert.ok(validateWaterData(broken).some(error=>/minimum index cannot become joint/.test(error)));
});

test('rural missing jurisdictions stay absent and AMRUT counts retain city programme boundaries',()=>{
 const jjm=data.observations.filter(row=>row.id.startsWith('wp-j3-'));
 assert.equal(new Set(jjm.flatMap(row=>row.stateCodes)).size,34);
 assert.ok(jjm.every(row=>!row.stateCodes.includes('DL')&&!row.stateCodes.includes('CH')));
 const kochi=water.getWaterObservations({place:'Kochi'});
 assert.ok(kochi.some(row=>row.id==='wp-amrut-kochi'));
 assert.ok(kochi.every(row=>row.scope==='city'&&row.limitations.some(text=>/Programme output only/.test(text))));
});

test('auditor findings retain replies and are distinct from analytical questions',()=>{
 const audit=data.leads.find(row=>row.id==='wp-karnataka-procurement');
 assert.equal(audit.kind,'source-finding');assert.match(audit.signal,/award/i);assert.match(audit.summary,/13/);
 assert.ok(data.leads.find(row=>row.id==='wf-haryana-lifting-penalties').summary.includes('COVID'));
 assert.equal(data.leads.find(row=>row.id==='production-market-gap').kind,'analytic-question');
 assert.ok(data.leads.every(row=>row.attribution&&row.alternativeExplanations.length&&row.falsifier));
});

test('CSV output quotes fields and prevents formula execution on opened spreadsheet exports',()=>{
 assert.equal(water.waterCsvCell('a,"b"\nrow'),'"a,""b""\nrow"');
 assert.equal(water.waterCsvCell('=1+1'),'"\'=1+1"');
 assert.equal(water.waterCsvCell(' \t@SUM(A1)'),'"\' \t@SUM(A1)"');
 assert.equal(water.waterCsvCell(null),'""');
});
