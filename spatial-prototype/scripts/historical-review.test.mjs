import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup, renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { build } from 'esbuild';
import { loadOriginalRegistry } from './original-registry.mjs';

if (!globalThis.crypto?.subtle) globalThis.crypto = webcrypto;
const require = createRequire(import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), 'fieldwork-historical-review-'));
after(() => rm(temporary, { recursive: true, force: true }));
const additionsText = await readFile('src/historical-review/proposed-additions.json', 'utf8');
const provenanceText = await readFile('src/historical-review/source-provenance.json', 'utf8');
const admissionText = await readFile('src/historical-review/reader-admission.json', 'utf8');
const original = await loadOriginalRegistry();
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const before = hash(original);
const reactPlugin = { name: 'shared-react-and-raw', setup(builder) {
  builder.onResolve({filter:/^react(?:\/.*)?$/}, args => ({path:require.resolve(args.path),external:true}));
  builder.onResolve({filter:/\?raw$/}, args => ({path:resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'raw'}));
  builder.onLoad({filter:/.*/,namespace:'raw'}, async args => ({contents:`export default ${JSON.stringify(await readFile(args.path,'utf8'))}`,loader:'js'}));
} };
async function bundle(entry, name, extra = {}) {
  const outfile = join(temporary, `${name}.mjs`);
  const result = await build({entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',jsx:'automatic',logLevel:'silent',metafile:true,
    plugins:[reactPlugin],...extra});
  return { module: await import(pathToFileURL(outfile).href), result, outfile };
}
const adapter = (await bundle('src/historical-review/adapter.ts', 'adapter')).module;
const { HISTORICAL_NAMESPACE: ns, HISTORICAL_REVIEW_VALUE: optIn, PUBLIC_GRAPH_STATUS: blocked,
  buildHistoricalReviewOverlay: composePinned, registryForSurface } = adapter;
const compose = (base, additions, provenance, optIn) => composePinned(base, additions, provenance, optIn, admissionText);
const model = (await bundle('src/model.ts', 'model')).module;
const overlay = await compose(original, additionsText, provenanceText, optIn);
const panel = (await bundle('src/historical-review/ReviewPanel.tsx', 'panel', {loader:{'.css':'empty'}})).module;
const gate = (await bundle('src/historical-review/ReviewGate.tsx', 'gate', {loader:{'.css':'empty'}})).module;
const href = 'https://review.example/india-corporate-intelligence/spatial/?case=irb&review=historical-2025#reader';
const html = renderToStaticMarkup(createElement(panel.HistoricalReviewView, {overlay,href}));
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; }

// Repository tests read the retained parent registry through its portable helper.
// Pin accepted review bytes here as well as in runtime validation: repinning requires review.
test('repository payload bytes match the accepted additions, source provenance and original baseline', () => {
  assert.equal(hash(additionsText), '5cd5c36de9dd98609c948cf526595a175f30fd29457fa1c7db9cf29b978eaf45');
  assert.equal(hash(provenanceText), '7ad1b6269af516d7f88dbee5687a6f3ba2cd0ac2f3b97318931d248c382eebf0');
  assert.equal(before, '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064');
  assert.equal(hash(additionsText), adapter.PINNED_ADDITIONS_SHA256);
  assert.equal(hash(provenanceText), adapter.PINNED_PROVENANCE_SHA256);
  assert.equal(before, adapter.PINNED_BASE_SHA256);
});

test('base/public admission is unchanged and only the reader gets the exact additive totals', () => {
  assert.equal(overlay.graphRegistry, original);
  assert.equal(registryForSurface(overlay,'factual'), original);
  assert.equal(registryForSurface(overlay,'historical-review'),overlay.readerRegistry);
  assert.equal(overlay.status, blocked); assert.equal(overlay.publicGraphEligible,false);
  for (const [key,count] of Object.entries({entities:2478,relationships:4212,records:5626,sources:3317})) {
    assert.equal(overlay.readerRegistry[key].length,count);
    original[key].forEach((row,index)=>assert.equal(overlay.readerRegistry[key][index],row));
    assert.equal(new Set(overlay.readerRegistry[key].map(row=>row.id)).size,count);
  }
  for (const key of ['states','localities','methodology']) assert.equal(overlay.readerRegistry[key],original[key]);
  assert.equal(overlay.readerRegistry.updatedAt,original.updatedAt);
  for(const key of ['held','coverage']) original[key].forEach((row,index)=>assert.equal(overlay.readerRegistry[key][index],row));
  assert.equal(hash(original),before);
});

test('exact existing IRB is reused unchanged; Fairfax is separate and unresolved', () => {
  const irb = original.entities.find(row=>row.id===adapter.REUSED_IRB_ID);
  assert.equal(overlay.reusedEntity,irb);
  assert.equal(overlay.readerRegistry.entities.filter(row=>row.id===irb.id).length,1);
  assert.ok(!overlay.additions.entities.some(row=>row.id===irb.id));
  assert.equal(overlay.additions.relationships.find(row=>row.originalId==='OF-E-P01').to,irb.id);
  const fairfax=overlay.additions.entities.find(row=>row.originalId==='ca_fairfax_india');
  assert.equal(fairfax.id,`${ns}:entity:ca_fairfax_india`);assert.equal(fairfax.resolved,false);
  assert.equal(overlay.additions.relationships.filter(row=>row.kind==='identity-crosswalk').length,0);
});

test('mismatched original :hold: IDs are retained with exact target sidecars and fail-closed guards', () => {
  const input=JSON.parse(additionsText);
  assert.deepEqual(overlay.additions.held,input.held);
  assert.equal(overlay.holdTargets.length,9);assert.equal(overlay.guardHolds.length,27);
  const guarded=new Set(overlay.guardHolds.map(row=>row.id));
  const rows=[...overlay.additions.entities,...overlay.additions.relationships,...overlay.additions.records];
  for(const row of rows) assert.ok(guarded.has(row.id));
  assert.ok(!guarded.has(adapter.REUSED_IRB_ID),'do not suppress original IRB or its baseline edges');
  overlay.holdTargets.forEach((target,index)=>{
    const hold=input.held[index],edge=input.relationships[index];
    assert.equal(target.holdId,hold.id);assert.notEqual(target.holdId,edge.id);
    assert.deepEqual(target.relationshipIds,[edge.id]);assert.deepEqual(target.recordIds,edge.recordIds);
    assert.deepEqual(target.entityIds,[edge.from,edge.to]);assert.equal(target.status,blocked);
  });
  // Defense in depth: even accidentally passing the reader to factualScene cannot leak marks/edges.
  const accidental=model.factualScene(model.buildEvidenceScene(overlay.readerRegistry));
  const baseline=model.factualScene(model.buildEvidenceScene(original));
  assert.deepEqual(accidental.nodes.map(row=>row.id),baseline.nodes.map(row=>row.id));
  assert.deepEqual(accidental.edges.map(row=>row.id),baseline.edges.map(row=>row.id));
  assert.ok(!accidental.nodes.some(row=>row.id.startsWith(`${ns}:`)));
  assert.ok(!accidental.edges.some(row=>row.id.startsWith(`${ns}:`)));
});

test('admission rejects forged, unknown-policy or unknown-surface overlays', () => {
  for(const forged of [{...overlay,graphRegistry:overlay.readerRegistry},{...overlay,status:'documented'},
    {...overlay,status:'unknown'},{...overlay,publicGraphEligible:true}]) {
    assert.throws(()=>registryForSurface(forged,'factual'),/unverified overlay/);
  }
  assert.throws(()=>registryForSurface(overlay,'publish'),/unknown data admission/);
});

test('payload tampering, ID reshaping, duplicates, hold clearing and status normalization are rejected', async () => {
  for(const mutate of [
    data=>data.relationships[0].status='documented',
    data=>data.relationships[0].status='unknown',
    data=>data.relationships[0].id='legacy:relationship:renamed',
    data=>data.held=[],
    data=>data.held[0].id=data.relationships[0].id,
    data=>data.entities.push(data.entities[0]),
    data=>data.sources[0].id='OF-S05',
    data=>data.relationships[0].sourceIds=['missing'],
    data=>data.entities[0].resolved=true,
    data=>data.relationships[0].fromDate='2025-01-01',
  ]) {
    const changed=JSON.parse(additionsText);mutate(changed);
    await assert.rejects(compose(original,JSON.stringify(changed),provenanceText,optIn),/SHA-256 mismatch/);
  }
  await assert.rejects(compose(original,additionsText,provenanceText+' ',optIn),/provenance SHA-256 mismatch/);
  await assert.rejects(compose(original,additionsText,provenanceText,'full'),/explicit historical review opt-in/);
});

test('preview, stale bases and attempted double append fail closed', async () => {
  await assert.rejects(compose({...original,entities:original.entities.slice(1)},additionsText,provenanceText,optIn),/count mismatch/);
  await assert.rejects(compose({...original,updatedAt:'stale'},additionsText,provenanceText,optIn),/baseline SHA-256 mismatch/);
  await assert.rejects(compose(overlay.readerRegistry,additionsText,provenanceText,optIn),/count mismatch/);
  const again=await compose(original,additionsText,provenanceText,optIn);
  assert.equal(again.readerRegistry.entities.length,2478);assert.equal(hash(original),before);
});

test('opt-in requires exact build enablement, query and full dataset; base URL preserves unrelated state', () => {
  assert.equal(adapter.historicalReviewRequested('?review=historical-2025',true,'full'),true);
  for(const search of ['', '?review=full','?review=Historical-2025','?review=historical-2025&review=historical-2025','?dataset=historical-2025'])
    assert.equal(adapter.historicalReviewRequested(search,true,'full'),false);
  assert.equal(adapter.historicalReviewRequested('?review=historical-2025',false,'full'),false);
  assert.equal(adapter.historicalReviewRequested('?review=historical-2025',true,'preview'),false);
  assert.equal(adapter.withoutHistoricalReview(href),'/india-corporate-intelligence/spatial/?case=irb#reader');
});

test('source closure, geography precision and excluded claims survive in the reader', () => {
  const sourceIds=new Set(overlay.additions.sources.map(row=>row.id));
  for(const row of [...overlay.additions.entities,...overlay.additions.records,...overlay.additions.relationships]) {
    assert.ok(row.sourceIds.every(id=>sourceIds.has(id)));
    for(const geo of row.geography){assert.equal(geo.stateCodes.length,0);assert.equal(geo.localityIds.length,0);assert.ok(geo.sourceIds.every(id=>sourceIds.has(id)));}
  }
  const contexts=overlay.additions.entities.flatMap(row=>row.geography.filter(g=>g.basis==='country-context').map(g=>[row.originalId,g.countryCodes]));
  assert.deepEqual(contexts,[['ca_fairfax_india',['CA']],['OF-N-FIH-MAURITIUS',['MU']],['OF-N-ANCHORAGE',['IN']]]);
  for(const row of [...overlay.additions.records,...overlay.additions.relationships]){
    assert.equal(row.fromDate,null);assert.equal(row.toDate,null);assert.equal(row.statusAsOf,'2025-12-31');assert.deepEqual(row.amounts,[]);
    assert.ok(row.geography.every(g=>g.scope==='unknown'));
  }
  for(const excluded of adapter.EXCLUDED_CLAIM_IDS) assert.ok(!additionsText.includes(excluded));
});

test('all nine claims render expanded historical dates, issuer attribution, exact locators and basis/control/payment limits', () => {
  assert.equal((html.match(/data-review-relationship=/g)||[]).length,9);
  assert.equal((html.match(/data-review-record=/g)||[]).length,9);
  for(const term of ['PUBLIC_GRAPH_BLOCKED','2025-12-31','self-reported','dependent, not independent corroboration',
    '88.5%','diluted','share-count denominator','voting rights','43.6%','74%','69%','30.4%',
    '19.86%','Cintra INR','Private InvIT','21.53%','not directly or indirectly controlled',
    'no quantified','Does not establish control of Ferrovial','No payment flow',
    'Historical incorporation country: CA','Historical incorporation country: MU','Historical incorporation country: IN',
    '2026-03-06','2026-07-30','First publication','Unverified','Page / section locator',
    '2,469 entities','5,617 records','Target relationship:']) {
    assert.ok(html.toLowerCase().includes(term.toLowerCase()),term);
  }
  assert.ok(!html.includes('<details'), 'required qualifications must not be collapsed');
  for(const source of overlay.additions.sources) assert.ok(html.includes(source.url));
});

test('new addition fallback is never misrepresented as an original-item deep link', () => {
  for(const row of [...overlay.additions.entities,...overlay.additions.relationships,...overlay.additions.records]) {
    const destination=adapter.reviewOriginalDestination(row);
    assert.equal(destination.isItemDeepLink,false);assert.equal(destination.href,'../#/investigate');
    assert.equal(destination.label,'Browse original investigation overview');
  }
  assert.equal(adapter.reviewOriginalDestination(overlay.reusedEntity).href,`../#${overlay.reusedEntity.route}`);
  assert.ok(!html.includes("Open this item's original page"));
  for (const route of ['/investigate', 'javascript:alert(1)', '//invalid.example']) {
    const destination = adapter.reviewOriginalDestination({ namespace: 'retained', route });
    assert.equal(destination.href, '../#/investigate');
    assert.equal(destination.label, 'Browse original investigation overview');
    assert.equal(destination.isItemDeepLink, false);
  }
});

test('base is not mutated/frozen; review-only additions and new arrays cannot be silently normalized', () => {
  assert.equal(hash(original),before);assert.equal(Object.isFrozen(original),false);
  assert.equal(Object.isFrozen(original.entities),false);
  assert.equal(Object.isFrozen(overlay.additions.relationships[0]),true);
  assert.throws(()=>overlay.additions.relationships[0].status='documented',TypeError);
  assert.throws(()=>overlay.readerRegistry.held.splice(0),TypeError);
});

test('loading review does not run before opt-in, and cancellation or stale success cannot resurrect it', async () => {
  const idle=renderToStaticMarkup(createElement(gate.default,{base:original,href}));
  assert.match(idle,/Open historical review reader/);assert.doesNotMatch(idle,/data-review-relationship=/);
  const states=[], pending=deferred();let calls=0;
  const stop=gate.startHistoricalReviewLoad(original,state=>states.push(state),async base=>{calls++;assert.equal(base,original);return pending.promise;});
  await tick();stop();pending.resolve(overlay);await tick();
  assert.equal(calls,1);assert.deepEqual(states.map(state=>state.phase),['loading']);
  const immediate=[];gate.startHistoricalReviewLoad(original,state=>immediate.push(state),async()=>{calls++;return overlay;})();await tick();
  assert.equal(calls,1);assert.deepEqual(immediate.map(state=>state.phase),['loading']);
});

test('failed review can be explicitly retried; late rejection is ignored', async () => {
  const states=[];
  gate.startHistoricalReviewLoad(original,state=>states.push(state),async()=>{throw new Error('hash mismatch');});await tick();
  assert.equal(states.at(-1).phase,'error');assert.equal(states.at(-1).message,'hash mismatch');
  gate.startHistoricalReviewLoad(original,state=>states.push(state),async()=>overlay);await tick();
  assert.equal(states.at(-1).phase,'ready');assert.equal(states.at(-1).overlay,overlay);
  const pending=deferred();const late=[];
  const cancel=gate.startHistoricalReviewLoad(original,state=>late.push(state),()=>pending.promise);await tick();cancel();pending.reject(new Error('late'));await tick();
  assert.deepEqual(late.map(state=>state.phase),['loading']);assert.equal(hash(original),before);
});

async function buildEntry(enabled) {
  const plugin={name:'entry-app-stub',setup(builder){
    builder.onResolve({filter:/^\.\/App$/},args=>{
      if(args.importer.endsWith('/RegistryEntry.tsx')) return {path:'app',namespace:'test-app'};
    });
    builder.onLoad({filter:/.*/,namespace:'test-app'},()=>({contents:`import {createElement} from 'react';export default function App({registry,dataset}){return createElement('div',{'data-base-entities':registry?.entities.length,'data-base-records':registry?.records.length,'data-dataset':dataset},'Unchanged base atlas')}`,loader:'js'}));
  }};
  return bundle('src/RegistryEntry.tsx',`entry-${enabled}`,{plugins:[plugin,reactPlugin],loader:{'.css':'empty'},define:{'import.meta.env.VITE_HISTORICAL_REVIEW':JSON.stringify(enabled?'true':'false')}});
}
function renderResolved(Component,props) { return new Promise((resolve,reject)=>{
  const output=new PassThrough();let text='';output.setEncoding('utf8');output.on('data',chunk=>text+=chunk);output.on('end',()=>resolve(text));output.on('error',reject);
  const stream=renderToPipeableStream(createElement(Component,props),{onAllReady(){stream.pipe(output);},onError:reject});
});}

test('next-release default entry requires exact query and fresh Open independent of the former build flag', async () => {
  for(const enabled of [undefined,false,true]) {
    const {module}=await buildEntry(enabled);
    const rendered=await renderResolved(module.RegistryEntryView,{dataset:'full',state:{phase:'ready',registry:original},onRetry(){},href});
    assert.match(rendered,/data-base-entities="2469"/);assert.match(rendered,/data-base-records="5617"/);
    assert.equal(rendered.includes('Open historical review reader'),true);
    assert.doesNotMatch(rendered,/data-review-relationship=/);
    const plain=await renderResolved(module.RegistryEntryView,{dataset:'full',state:{phase:'ready',registry:original},onRetry(){},href:href.replace('&review=historical-2025','')});
    assert.doesNotMatch(plain,/Open historical review reader|data-review-relationship=/);
    assert.equal(module.requestedDataset('?dataset=historical-2025'),'full');
    const preview = await renderResolved(module.RegistryEntryView, { dataset:'preview', state:{phase:'loading',progress:null}, onRetry(){}, href });
    assert.match(preview, /data-dataset="preview"/);
    assert.doesNotMatch(preview, /Open historical review reader|data-review-relationship=/);
    for (const state of [{phase:'loading',progress:null}, {phase:'error',message:'Incomplete base'}]) {
      const incomplete = await renderResolved(module.RegistryEntryView, {dataset:'full',state,onRetry(){},href});
      assert.doesNotMatch(incomplete, /Open historical review reader|data-review-relationship=/);
    }
    for (const query of ['review=unknown', 'review=historical-2025&review=historical-2025']) {
      const rejected = await renderResolved(module.RegistryEntryView, {dataset:'full',state:{phase:'ready',registry:original},onRetry(){},href:href.replace('review=historical-2025',query)});
      assert.doesNotMatch(rejected, /Open historical review reader|data-review-relationship=/);
    }
  }
});

test('the actual production loader verifies raw payloads and cannot promote its reader to the public graph', async () => {
  const { module: loader } = await bundle('src/historical-review/loadHistoricalReview.ts', 'production-loader');
  const loaded = await loader.loadHistoricalReview(original);
  assert.equal(loaded.status, 'PUBLIC_GRAPH_BLOCKED');
  assert.equal(loaded.publicGraphEligible, false);
  assert.equal(loaded.graphRegistry, original);
  assert.deepEqual(loaded.additions, overlay.additions);
  assert.deepEqual(loaded.provenance, overlay.provenance);
  assert.deepEqual(loaded.guardHolds, overlay.guardHolds);
  assert.deepEqual(loaded.holdTargets, overlay.holdTargets);
  assert.equal(hash(original), before);
});

test('the integrated source keeps the review behind a separate lazy boundary and never passes it to App', async () => {
  const source = await readFile('src/RegistryEntry.tsx', 'utf8');
  assert.match(source, /lazy\(\(\) => import\('\.\/historical-review\/ReviewGate'\)\)/);
  assert.match(source, /<App registry=\{state\.registry\} dataset="full" \/>/);
  assert.match(source, /<App dataset="preview" \/>/);
  assert.doesNotMatch(source, /readerRegistry|proposed-additions|loadHistoricalReview/);
  const gateSource = await readFile('src/historical-review/ReviewGate.tsx', 'utf8');
  assert.match(gateSource, /import\('\.\/loadHistoricalReview'\)/);
  assert.match(gateSource, /if \(inFlight\.current\) return/);
  assert.match(gateSource, /disabled=\{state\.phase === 'loading'\}/);
  assert.equal(hash(original), before);
});


test('each rendered source preserves exact safe destination, dates, publisher, locator and qualifications', () => {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[char]));
  for (const source of overlay.additions.sources) {
    const provenance = overlay.provenance.find(row => row.sourceId === source.id);
    const citations = [...html.matchAll(new RegExp(`<article class="historical-source" data-source-id="${source.id}">([\\s\\S]*?)</article>`, 'g'))];
    assert.ok(citations.length > 0, source.id);
    for (const [, citation] of citations) {
      assert.ok(citation.includes(`href="${escape(source.url)}" target="_blank" rel="noopener noreferrer"`));
      for (const text of [source.title, source.publisher, source.locator, provenance.sourceFamily,
        provenance.reportingPeriod, provenance.documentDate ?? 'Unverified', provenance.retrievalDate, ...source.limitations]) {
        assert.ok(citation.includes(escape(text)), `${source.id}: ${text}`);
      }
      assert.equal(source.publishedAt, null);
      assert.equal(provenance.firstPublicationDate, null);
      assert.match(citation, /First publication<\/dt><dd>Unverified; not inferred from URL or retrieval date/);
    }
  }
  const unsafe = {...overlay, additions:{...overlay.additions, sources:overlay.additions.sources.map(source => ({...source, url:'javascript:alert(1)', title:'<script>unsafe</script>'}))}};
  const rejected = renderToStaticMarkup(createElement(panel.HistoricalReviewView, {overlay:unsafe,href}));
  assert.doesNotMatch(rejected, /href="javascript:|<script>/);
  assert.match(rejected, /&lt;script&gt;unsafe&lt;\/script&gt;/);
});

test('history navigation and BFCache restore invalidate pending opt-in and listeners are cleaned up', async () => {
  const target = new EventTarget();
  const states = [], pending = deferred();
  let invalidations = 0;
  const stop = gate.startHistoricalReviewLoad(original, state => states.push(state), () => pending.promise);
  const unwatch = gate.watchHistoricalReviewNavigation(() => { invalidations++; stop(); }, target);
  await tick();
  target.dispatchEvent(new Event('pageshow'));
  assert.equal(invalidations, 0, 'a normal initial page load is not an opt-out');
  for (const type of ['popstate', 'hashchange', 'pagehide']) target.dispatchEvent(new Event(type));
  const restored = new Event('pageshow'); Object.defineProperty(restored, 'persisted', {value:true});
  target.dispatchEvent(restored);
  assert.equal(invalidations, 4);
  pending.resolve(overlay); await tick();
  assert.deepEqual(states.map(state=>state.phase), ['loading']);
  unwatch();
  for (const type of ['popstate', 'hashchange', 'pagehide']) target.dispatchEvent(new Event(type));
  target.dispatchEvent(restored);
  assert.equal(invalidations, 4);
});

test('missing Web Crypto fails closed before any review dataset is admitted', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', {value:undefined, configurable:true});
  try {
    await assert.rejects(compose(original, additionsText, provenanceText, optIn), /Web Crypto is required/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', descriptor);
  }
  assert.equal(hash(original), before);
});

test('retained retrieval timestamp stays exact and day-only fallback never claims an instant', () => {
  const source = overlay.additions.sources.find(row => row.id.endsWith('OF-S04'));
  const provenance = overlay.provenance.find(row => row.sourceId === source.id);
  assert.equal(panel.retainedRetrieval(source, provenance), '2026-10-15T22:28Z (instant precision)');
  assert.match(html, /Retained retrieval<\/dt><dd>2026-10-15T22:28Z \(instant precision\)/);
  assert.doesNotMatch(html, /2026-10-15T22:28:00Z|2026-10-15 \(instant precision\)/);
  assert.equal(panel.retainedRetrieval({...source, retrievedAt:null}, provenance), '2026-10-15 (day precision)');
  assert.equal(panel.retainedRetrieval({...source, retrievedAt:'2026-10-15'}, provenance), '2026-10-15 (day precision)');
  for (const row of overlay.additions.sources.filter(row => !row.retrievedAt)) {
    assert.equal(panel.retainedRetrieval(row, overlay.provenance.find(p => p.sourceId === row.id)), '2026-10-15 (day precision)');
  }
  assert.equal(hash(additionsText), adapter.PINNED_ADDITIONS_SHA256);
  assert.equal(hash(provenanceText), adapter.PINNED_PROVENANCE_SHA256);
  assert.equal(hash(original), before);
});


test('separate exact-ID admission pins only nine record/edge pairs and three retained sources', () => {
  const admission = JSON.parse(admissionText);
  assert.equal(hash(admissionText), '7588611618969a681ff5d23dbd009cb23a9ac5d6bb625585b80395919e5d1d53');
  assert.deepEqual(overlay.readerAdmission, admission);
  assert.equal(admission.readerStatus, 'READER_ADMITTED');
  assert.equal(admission.graphStatus, blocked);
  assert.equal(admission.publicGraphEligible, false);
  assert.equal(admission.publicPathEligible, false);
  assert.equal(overlay.publicPathEligible, false);
  assert.deepEqual(admission.payloadSha256, { base: before, additions: hash(additionsText), provenance: hash(provenanceText) });
  assert.deepEqual(admission.claims.map(row => row.recordId), overlay.additions.records.map(row => row.id));
  assert.deepEqual(admission.claims.map(row => row.relationshipId), overlay.additions.relationships.map(row => row.id));
  assert.deepEqual(admission.sources, overlay.provenance.map(row => ({sourceId:row.sourceId,retainedContentSha256:row.sha256})));
  for (const claim of admission.claims) {
    assert.deepEqual(claim.sourceIds, overlay.additions.relationships.find(edge => edge.id === claim.relationshipId).sourceIds);
  }
  assert.equal(Object.isFrozen(overlay.readerAdmission), true);
  assert.equal(Object.isFrozen(overlay.readerAdmission.claims[0]), true);
});

test('missing, unknown, incomplete, expanded or policy-edited reader admissions fail closed', async () => {
  for (const invalid of [undefined, null, '', '{}', admissionText + ' ']) {
    await assert.rejects(composePinned(original, additionsText, provenanceText, optIn, invalid), /reader admission is unavailable or incomplete/);
  }
  for (const mutate of [
    data => data.readerStatus = 'approved',
    data => data.admissionId = 'future-unreviewed-release',
    data => data.publicGraphEligible = true,
    data => data.publicPathEligible = true,
    data => data.graphStatus = 'PUBLIC_GRAPH_ADMITTED',
    data => data.claims.pop(),
    data => data.claims.push(data.claims[0]),
    data => data.claims[0].recordId = 'unknown',
    data => data.claims[0].relationshipId = 'unknown',
    data => data.claims[0].sourceIds = [],
    data => data.sources.pop(),
    data => data.sources[0].retainedContentSha256 = 'unknown',
    data => data.payloadSha256.base = 'unknown',
    data => data.futureApproval = true,
  ]) {
    const changed = JSON.parse(admissionText); mutate(changed);
    await assert.rejects(composePinned(original, additionsText, provenanceText, optIn, JSON.stringify(changed)), /reader admission is unavailable or incomplete/);
  }
  assert.equal(hash(original), before);
});

test('reader wording distinguishes derived admission from unchanged packet holds and graph/path refusal', () => {
  assert.match(html, /data-reader-admission="READER_ADMITTED"/);
  assert.match(html, /data-public-graph="blocked" data-public-paths="blocked"/);
  assert.match(html, /Reader admission and retained graph\/path holds/);
  assert.match(html, /verbatim historical provenance/);
  assert.doesNotMatch(html, /<h2>Publication stays blocked<\/h2>|Actual rendering and integration review are still required/);
  const retained = JSON.parse(additionsText);
  assert.deepEqual(overlay.additions.held, retained.held);
  assert.deepEqual(overlay.additions.records, retained.records);
  assert.deepEqual(overlay.additions.relationships, retained.relationships);
  assert.ok(overlay.additions.records.every(row => row.status === blocked));
  assert.ok(overlay.guardHolds.every(row => row.reason.includes('reader admission never clears graph/path holds')));
  assert.throws(() => registryForSurface(overlay, 'paths'), /unknown data admission surface/);
});

test('admission bytes remain with the lazy payload loader, outside default entry and prompt imports', async () => {
  const entry = await readFile('src/RegistryEntry.tsx', 'utf8');
  const prompt = await readFile('src/historical-review/ReviewGate.tsx', 'utf8');
  const loader = await readFile('src/historical-review/loadHistoricalReview.ts', 'utf8');
  assert.doesNotMatch(entry, /reader-admission\.json|loadHistoricalReview|VITE_HISTORICAL_REVIEW/);
  assert.doesNotMatch(prompt, /reader-admission\.json|proposed-additions\.json|source-provenance\.json/);
  assert.match(loader, /import admissionText from '\.\/reader-admission\.json\?raw'/);
  assert.match(loader, /HISTORICAL_REVIEW_VALUE, admissionText/);
  assert.doesNotMatch(prompt, /localStorage|sessionStorage/);
});

test('the staged CI harness requires default-build reader coverage and retains its no-local-browser guard', async () => {
  const source = await readFile('scripts/browser-review.mjs', 'utf8');
  assert.match(source, /process\.env\.GITHUB_ACTIONS !== "true"/);
  assert.match(source, /No local browser was launched/);
  assert.match(source, /const expectHistoricalReview = true/);
  assert.match(source, /disabled-mode review is obsolete/);
  assert.match(source, /src\/historical-review\/reader-admission\.json/);
  assert.match(source, /data-reader-admission="READER_ADMITTED"/);
  assert.match(source, /Retained packet holds and graph exclusions/);
  assert.doesNotMatch(source, /async function notApplicable|\[data-historical-review="review-only"\]|default build rejects even the exact opt-in query/);
});
