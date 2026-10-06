#!/usr/bin/env node
// Targeted production acceptance for the final PM CARES correction; no screenshots or production mutations.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {loadInvestigation} from '../../scripts/investigation/load.mjs';

const dist=resolve(process.env.INVESTIGATION_DIST??'dist-publish');
const html=readFileSync(resolve(dist,'index.html'),'utf8');
const assetPath=html.match(/<script[^>]+src="\.\/([^" ]+)"/u)?.[1];
assert.ok(assetPath,'Production entry bundle found');
const asset=readFileSync(resolve(dist,assetPath));
const compiled=await build({entryPoints:['src/graph/data.ts'],bundle:true,platform:'node',format:'cjs',write:false,logLevel:'silent'});
const module={exports:{}};new Function('module','exports',compiled.outputFiles[0].text)(module,module.exports);
const {EDGES,MOTIFS}=module.exports;
const motif=MOTIFS.find(row=>row.id==='M7');
const expectedMembers=EDGES.filter(edge=>edge.m?.includes('M7')).length;
assert.equal(motif.census.members,expectedMembers);assert.equal(motif.census.population,EDGES.length);
const {INVESTIGATION_REGISTRY:registry}=await loadInvestigation();
const edge=registry.relationships.find(row=>row.from==='legacy:entity:cag'&&row.to==='legacy:entity:pmcares'&&row.kind==='enforce');
assert.ok(edge,'CAG implementation-context relationship retained');
assert.equal(edge.tier,'reported');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname;
  const file=resolve(dist,`.${path==='/'?'/index.html':path}`);
  if(!file.startsWith(`${dist}/`)){response.writeHead(403).end();return;}
  try{response.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(readFileSync(file));}catch{response.writeHead(404).end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const binary=process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium';
const browser=await chromium.launch(existsSync(binary)?{executablePath:binary}:{});
const errors=[],checks=[];
const check=(condition,message)=>{assert.ok(condition,message);checks.push(message);};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${base}/#/atlas?iw_view=dossier`);
  const button=page.getByRole('button').filter({has:page.getByRole('heading',{name:'PM CARES: receipts, payments & records',exact:true})});
  await button.waitFor({timeout:90000});
  const collapsed=await button.innerText();
  check(collapsed.includes('Six audited Receipts and Payments statements are published through FY2024-25'),'M7 shows six audited statement years through FY2024-25');
  check(await button.getByText('Analytic',{exact:true}).count()===1,'M7 is visibly analytic');
  check(collapsed.includes(`${expectedMembers} of ${EDGES.length} retained edges in the current Atlas subgraph`),'M7 census is computed from retained Atlas edges');
  check(collapsed.includes('₹8,452.07cr')&&collapsed.includes('The published columns reconcile'),'M7 includes the current closing balance and reconciled arithmetic');
  await button.click();
  await page.waitForFunction(()=>[...document.querySelectorAll('button[aria-expanded="true"]')].some(el=>el.textContent.includes('PM CARES: receipts, payments & records')));
  const expanded=await button.locator('..').innerText();
  check(expanded.includes('does not establish non-payment through an implementing agency'),'Expanded M7 rejects a non-payment inference from an absent caption');
  check(expanded.includes('former accounts-dark-since-FY23 claim is superseded'),'Expanded M7 explicitly supersedes the stale accounts-gap claim');
  check(expanded.includes('Source-matched implementation, payment and recipient records')&&!expanded.includes('FY24/FY25 statements')&&!expanded.includes('₹100cr vaccine pledge never disbursed'),'Expanded M7 uses a source-matched upgrade condition without stale definitive claims');
  const route=`/#/pmcares?iw_scope=all&iw_view=connections&iw_edge=${encodeURIComponent(edge.id)}`;
  await page.goto(`${base}${route}`);
  const inspector=page.locator(`[data-investigation-selection="${edge.id}"]`);
  await inspector.waitFor({timeout:90000});
  check(await inspector.locator('.iw-tier[data-tier="reported"]').count()===1,'CAG to PM CARES inspector displays reported tier');
  const detail=await inspector.innerText();
  check(detail.includes('West Bengal public-health implementation')&&detail.includes('combined PM CARES/CSR oxygen-plant population'),'Inspector preserves implementation scope and the mixed PM CARES/CSR population');
  check(detail.includes('March 2022/December 2023')&&detail.includes('26 July 2026'),'Inspector distinguishes observation dates from the news publication date');
  check(detail.includes('Hospitals cited unavailable consumables and an unopened HDU'),'Inspector retains hospital responses');
  check(detail.includes('does not establish a CAG audit of the PM CARES trust')&&detail.includes('underlying audit pages were not independently verified'),'Inspector limits the trust-audit inference and discloses unverified underlying audit pages');
  check(detail.includes('wholly PM CARES-funded 75-plant population'),'Inspector explicitly rejects attributing every plant to PM CARES');
  const source=registry.sources.find(row=>edge.sourceIds.includes(row.id)&&row.url.includes('outlookindia.com/national/cag-report'));
  check(Boolean(source),'Reported edge retains the exact Outlook source');
  check(errors.length===0,`No uncaught browser exceptions: ${errors.join(' | ')}`);
  const report={passed:true,completedAt:new Date().toISOString(),dist:dist.split('/').at(-1),asset:assetPath,assetBytes:asset.length,assetSha256:createHash('sha256').update(asset).digest('hex'),routes:['/#/atlas?iw_view=dossier',route],motif:{id:'M7',tier:motif.tier,members:expectedMembers,population:EDGES.length},relationship:{id:edge.id,tier:edge.tier,sourceUrl:source.url},checks,errors};
  writeFileSync(resolve('docs/investigation/pmcares-release-acceptance.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(done=>server.close(done));}
