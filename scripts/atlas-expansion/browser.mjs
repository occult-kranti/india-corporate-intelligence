#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {loadInvestigation} from '../investigation/load.mjs';
const {INVESTIGATION_REGISTRY:registry}=await loadInvestigation();
let base=process.env.ATLAS_BASE_URL,server;
if(!base){const dist=resolve(process.env.INVESTIGATION_DIST??'dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};server=createServer((request,response)=>{const path=new URL(request.url,'http://localhost').pathname,file=resolve(dist,`.${path==='/'?'/index.html':path}`);if(!file.startsWith(`${dist}/`)){response.writeHead(403).end();return;}try{const body=readFileSync(file);response.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(body);}catch{response.writeHead(404).end();}});await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;}
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium';
const browser=await chromium.launch(existsSync(executablePath)?{executablePath}:{}),errors=[];
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${base}/#/?iw_view=map`,{waitUntil:'domcontentloaded'});const network=page.locator('.atlas-network').first();await network.waitFor({timeout:90000});
 check(await page.locator('.atlas-case-feed').count()>0,'Map carries a supported case/finding feed');
 await network.locator('.iw-graph-node').first().waitFor({timeout:60000});check(await network.locator('.iw-graph-node').count()<=80,'Preview stays bounded');
 const focus=registry.entities.find(row=>row.id==='deep-corporate:entity:talace'),target=registry.entities.find(row=>row.id==='deep-corporate:entity:air-india');assert.ok(focus&&target);
 await network.getByRole('searchbox',{name:'Find an exact identity'}).fill(focus.label);
 await network.locator('.atlas-identity-results button').filter({hasText:focus.namespace}).filter({hasText:focus.label}).first().click();
 const popover=page.locator('.atlas-evidence-popover');await popover.waitFor();check(await popover.getAttribute('data-selection-id')===focus.id,'Exact selected identity opens in the expandable reader');
 await popover.getByRole('button',{name:'Expand',exact:true}).click();check(await popover.evaluate(el=>el.classList.contains('is-expanded')),'Reader expands');await popover.getByRole('button',{name:'Close evidence details'}).click();
 await network.getByLabel('Hops',{exact:true}).selectOption('5');await network.getByLabel('Explore',{exact:true}).selectOption('outgoing');
 await network.getByPlaceholder('Find destination identity').fill(target.label);await network.locator('.atlas-trail-targets button').filter({hasText:target.label}).filter({hasText:target.namespace}).first().click();
 await network.locator('.atlas-trail-steps li').first().waitFor();check(await network.locator('.atlas-trail-steps li').count()>=1,'Direction-aware exact trail has numbered steps');
 const edgeButton=network.locator('.atlas-trail-steps li button').first();await edgeButton.click();await popover.waitFor();const selectedId=await popover.getAttribute('data-selection-id');check(registry.relationships.some(row=>row.id===selectedId),'Trail opens exact retained edge');
 const download=page.waitForEvent('download');await popover.getByRole('button',{name:/Export evidence \+ linked responses/}).click();const packet=JSON.parse(readFileSync(await (await download).path(),'utf8'));
 const ids=new Set(packet.records.map(row=>row.id)),sources=new Set(packet.sources.map(row=>row.id));check(packet.missingIds.length===0,'Evidence packet reports no missing references');for(const edge of packet.relationships)for(const id of edge.responseIds)check(ids.has(id),'Linked response preserved');for(const row of [...packet.entities,...packet.relationships,...packet.records])for(const id of [...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)])check(sources.has(id),'Direct and geography sources preserved');
 await popover.locator('.atlas-source-row button').first().click();check(await page.locator('.atlas-evidence-popover').count()===0,'Source opens shared inspector after reader closes');await page.locator('.iw-inspector').waitFor();check(await page.locator('.iw-inspector').count()>0,'Source inspector remains available');
 await page.goto(`${base}/#/?iw_view=map`,{waitUntil:'domcontentloaded'});await network.waitFor();if(await network.getByRole('button',{name:'Global overview',exact:true}).count())await network.getByRole('button',{name:'Global overview',exact:true}).click();await network.locator('.iw-graph-packed-label').first().waitFor();
 const collisions=await network.locator('.iw-graph-packed-label').evaluateAll(labels=>{const boxes=labels.map(label=>label.getBoundingClientRect());let count=0;for(let a=0;a<boxes.length;a++)for(let b=a+1;b<boxes.length;b++){const x=boxes[a],y=boxes[b];if(x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top)count++;}return count;});check(collisions===0,'Rendered overview labels do not overlap');
 mkdirSync('docs/atlas-expansion/screenshots',{recursive:true});await network.locator('.iw-graph-plot').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/atlas-expansion/screenshots/network-desktop.png'});
 await page.setViewportSize({width:390,height:844});await network.getByRole('searchbox',{name:'Find an exact identity'}).fill(focus.label);await network.locator('.atlas-identity-results button').filter({hasText:focus.namespace}).filter({hasText:focus.label}).first().click();await popover.waitFor();check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile page does not overflow horizontally');await popover.screenshot({path:'docs/atlas-expansion/screenshots/evidence-mobile.png'});await page.keyboard.press('Escape');check(await popover.count()===0,'Escape closes the evidence reader');check(await network.getByRole('searchbox',{name:'Find an exact identity'}).evaluate(el=>el===document.activeElement),'Escape returns focus to stable identity search');
 check(errors.length===0,`No runtime errors: ${errors.join('; ')}`);console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser.close();if(server)await new Promise(done=>server.close(done));}
