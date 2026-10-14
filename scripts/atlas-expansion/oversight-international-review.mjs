#!/usr/bin/env node
// Independent source-boundary checks against the rendered final build.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const output=resolve('docs/atlas-expansion/oversight-browser');
mkdirSync(output,{recursive:true});
const slices=['international-finance','defence-trade'].map(name=>({name,data:JSON.parse(readFileSync(`research/raw/atlas-expansion/${name}.json`,'utf8'))}));
const cases=slices.flatMap(({name,data})=>data.records.filter(row=>row.kind==='investigation-case').map(row=>({...row,id:`atlas-${name}:record:${row.id}`})));
const report={checkedAt:new Date().toISOString(),cases:[],supplements:[],checks:0,errors:[],missingStaticAssets:[]};
const check=(value,description)=>{assert.ok(value,description);report.checks++;};
let base=process.env.ATLAS_BASE_URL,server;
if(!base){
 const dist=resolve(process.env.INVESTIGATION_DIST??'dist-atlas-final');
 report.dist=dist;
 check(existsSync(`${dist}/index.html`),'Final build exists');
 report.indexSha256=createHash('sha256').update(readFileSync(`${dist}/index.html`)).digest('hex');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png'};
 server=createServer((request,response)=>{
  const pathname=new URL(request.url,'http://localhost').pathname,file=resolve(dist,`.${pathname==='/'?'/index.html':pathname}`);
  if(!file.startsWith(`${dist}/`)){response.writeHead(403).end();return;}
  let bytes;try{bytes=readFileSync(file);}catch{report.missingStaticAssets.push(pathname);response.writeHead(404).end();return;}
  response.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(bytes);
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;
}
report.base=base;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true,reducedMotion:'reduce'});
 page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(`${base}/#/?iw_view=map`,{waitUntil:'domcontentloaded'});
 const feed=page.locator('.atlas-case-feed'),inspector=page.locator('.iw-inspector');await feed.waitFor({timeout:90000});
 await feed.getByRole('button',{name:/^Reviewed cases/}).click();
 while(await feed.getByRole('button',{name:/^Show more/}).count())await feed.getByRole('button',{name:/^Show more/}).click();
 check(cases.length===6,'Six new bounded cases are retained');
 for(const row of cases){
  const card=feed.locator(`[data-case-id="${row.id}"]`);await card.locator('.atlas-case-title').click();
  await inspector.locator(`[data-investigation-selection="${row.id}"]`).waitFor();
  const text=await inspector.innerText();check(text.includes(row.summary),`${row.id}: retained summary is readable`);
  for(const amount of row.amounts)check(text.includes(amount.stage),`${row.id}: amount stage remains visible`);
  check(text.includes(row.response),`${row.id}: response is readable`);
  if(row.geography.some(geo=>geo.scope==='country'))check(text.includes('Country context'),`${row.id}: foreign context is labelled`);
  report.cases.push({id:row.id,title:row.title,card:await card.innerText(),inspector:text});
  await inspector.locator('.iw-inspector-scroll').evaluate(node=>node.scrollTop=0);
  await inspector.screenshot({path:`${output}/${row.id.split(':').at(-1)}-final.png`});
  await inspector.getByRole('button',{name:'Clear evidence selection'}).click();
 }
 for(const id of ['imf-india-no-programme-credit','imf-sdr-allocation','ida-budget-support','ifc-bajaj-private-debt']){
  const fullId=`atlas-international-finance:record:${id}`;
  await page.goto(`${base}/#/?iw_view=map&iw_record=${encodeURIComponent(fullId)}`,{waitUntil:'domcontentloaded'});
  await inspector.locator(`[data-investigation-selection="${fullId}"]`).waitFor();
  const text=await inspector.innerText();report.supplements.push({id:fullId,text});
  if(id==='imf-india-no-programme-credit')check(/Outstanding Purchases and Loans: None/.test(text),'IMF no-programme-credit finding is readable');
  if(id==='imf-sdr-allocation')check(text.includes('not a contractor payment or grant'),'SDR allocation retains its accounting boundary');
  if(id==='ida-budget-support')check(/exchange|fluctuation/i.test(text),'IDA USD difference has the source reconciliation');
  if(id==='ifc-bajaj-private-debt')check(text.includes('Actual loan drawdown by tranche'),'Private-loan intended use is separate from drawdown');
 }
 await page.goto(`${base}/#/?iw_view=map`,{waitUntil:'domcontentloaded'});const network=page.locator('.atlas-network');await network.waitFor();
 await network.getByRole('searchbox',{name:'Find an exact identity'}).fill('International Monetary Fund');
 await network.locator('.atlas-identity-results button').filter({hasText:'atlas-international-finance'}).first().click();
 const reader=page.locator('.atlas-evidence-popover');await reader.waitFor();
 const downloadPromise=page.waitForEvent('download');await reader.getByRole('button',{name:/Export evidence/}).click();
 const packet=JSON.parse(readFileSync(await(await downloadPromise).path(),'utf8'));
 check(packet.missingIds.length===0,'IMF evidence export has no missing references');
 check(packet.records.some(row=>row.id.endsWith(':imf-india-no-programme-credit')),'IMF export preserves the no-programme-credit finding');
 for(const edge of packet.relationships)for(const id of edge.responseIds)check(packet.records.some(row=>row.id===id),'Export retains linked response');
 report.imfPacket={entities:packet.entities.length,relationships:packet.relationships.length,records:packet.records.length,sources:packet.sources.length,missingIds:packet.missingIds};
 report.imfReader=await reader.innerText();check(/no outstanding programme credit/i.test(report.imfReader),'IMF reader shows the linked current financial position');
 await page.setViewportSize({width:390,height:844});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile reader has no horizontal overflow');
 await reader.screenshot({path:`${output}/imf-mobile-final.png`});
 await reader.getByRole('button',{name:'Expand',exact:true}).click();await page.keyboard.press('Escape');check(await reader.count()===0,'Mobile expanded reader closes with Escape');
 await page.goto(`${base}/#/?iw_view=map&iw_state=TN`,{waitUntil:'domcontentloaded'});await feed.waitFor();
 // Hash navigation resolves before React applies the new workspace filters.
 // Await the committed visible state before testing the filtered feed.
 await page.waitForFunction(()=>document.querySelector('[aria-labelledby="iw-state-label"]')?.value==='TN');
 await page.locator('.iw-result-bar').filter({hasText:'Tamil Nadu'}).waitFor();
 while(await feed.getByRole('button',{name:/^Show more/}).count())await feed.getByRole('button',{name:/^Show more/}).click();
 report.stateFilteredFeed=await feed.innerText();
 report.stateFilter={url:page.url(),value:await page.getByRole('combobox',{name:'Place',exact:true}).inputValue(),status:await page.locator('.iw-result-bar').innerText()};
 check(await feed.locator('[data-case-id="atlas-international-finance:record:bangladesh-adb-lt"]').count()===0,'Bangladesh spending is not mapped to Tamil Nadu');
 check(await feed.locator('[data-case-id="atlas-defence-trade:record:brahmos-philippines-export"]').count()===0,'Philippine export is not mapped to Tamil Nadu');
 check(report.errors.length===0,'No page runtime errors');report.passed=true;
}catch(error){report.passed=false;report.failure=String(error);throw error;}
finally{writeFileSync(`${output}/international-review.json`,JSON.stringify(report,null,2));await browser.close();if(server)await new Promise(done=>server.close(done));}
console.log(JSON.stringify({passed:report.passed,checks:report.checks,cases:report.cases.length,supplements:report.supplements.length,errors:report.errors},null,2));
