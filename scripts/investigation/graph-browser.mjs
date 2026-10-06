#!/usr/bin/env node
/** Focused linked-map/graph browser acceptance. Run against a dev or production server. */
import assert from 'node:assert/strict';
import {mkdirSync,existsSync,readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
let base=process.env.INVESTIGATION_BASE_URL;
let server;
if(!base){
 const dist=resolve(process.env.INVESTIGATION_DIST??'dist');
 const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
 server=createServer((request,response)=>{
  const path=new URL(request.url,'http://localhost').pathname;
  const file=resolve(dist,`.${path==='/'?'/index.html':path}`);
  if(!file.startsWith(`${dist}/`)){response.writeHead(403).end();return;}
  try{response.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'}).end(readFileSync(file));}catch{response.writeHead(404).end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));base=`http://127.0.0.1:${server.address().port}`;
}
const screenshots=resolve('docs/investigation/screenshots');mkdirSync(screenshots,{recursive:true});
const binary=process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium';
const browser=await chromium.launch(existsSync(binary)?{executablePath:binary}:{});
const errors=[];let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},acceptDownloads:true});page.on('pageerror',error=>errors.push(error.message));
 const ready=()=>page.locator('.iw-map').first().waitFor({timeout:90000});
 await page.goto(`${base}/#/public-works?iw_scope=all&iw_view=map`);await ready();
 const map=page.locator('.iw-map').first();
 check(await map.locator('path[data-state-code]').count()===36,'All36 real geographic units rendered');
 check(await map.getByLabel('State or union territory',{exact:true}).count()===1,'Map selector has an exact accessible name');
 const ladakh=map.locator('path[data-state-code="LA"]');await ladakh.focus();await page.keyboard.press('Enter');
 await page.waitForURL(/iw_state=LA/);await map.locator('path[data-state-code="LA"][aria-pressed="true"]').waitFor();check(await ladakh.getAttribute('aria-pressed')==='true','Keyboard-selected Ladakh remains its own modern unit');
 await map.getByRole('button',{name:'All India',exact:true}).click();await page.waitForURL(url=>!url.hash.includes('iw_state='));
 await map.getByLabel('State or union territory',{exact:true}).selectOption('MH');await page.waitForURL(/iw_state=MH/);await map.getByRole('heading',{name:'Maharashtra',exact:true}).waitFor();
 check(await map.getByRole('heading',{name:'Maharashtra',exact:true}).count()===1,'State selection updates map heading and URL');
 await map.getByRole('button',{name:'All India',exact:true}).click();await map.getByRole('heading',{name:'India · geographic evidence',exact:true}).waitFor();
 const graph=page.locator('.iw-graph').first();await graph.locator('.iw-graph-node').first().waitFor({timeout:60000});
 await page.waitForFunction(()=>{const plot=document.querySelector('.iw-graph-plot'),svg=plot?.querySelector('svg');return plot&&svg&&svg.getBoundingClientRect().width<=plot.clientWidth+1&&svg.getBoundingClientRect().height<=plot.clientHeight+1;});
 check(true,'Initial camera auto-fits the actual graph pane');
 const rendered=await graph.locator('.iw-graph-node').count();check(rendered<=80&&rendered>0,'Graph preview is bounded at80 entities');
 check(await graph.locator('.iw-graph-edge').count()<=180,'Graph preview is bounded at180 relationships');
 const entityId=await graph.locator('.iw-graph-edge[data-traversable="true"]').first().getAttribute('data-from');const first=graph.locator(`.iw-graph-node[data-entity-id="${entityId}"]`);
 await first.focus();await page.keyboard.press('Enter');await page.waitForURL(url=>new URLSearchParams(url.hash.split('?')[1]).get('iw_node')===entityId);
 await graph.locator('.iw-graph-focus').getByText('Focused on',{exact:true}).waitFor();check((await graph.locator('.iw-graph-focus').innerText()).includes('Focused on'),'Keyboard entity selection opens a neighborhood');
 await graph.getByRole('button',{name:'2 hops',exact:true}).click();await page.waitForURL(/iw_depth=2/);
 await graph.locator('.iw-graph-view').getByRole('button',{name:'Ledger',exact:true}).click();await page.waitForURL(/iw_graph=table/);await graph.locator('.iw-graph-ledger').waitFor();
 const rows=graph.locator('tbody tr');await rows.first().waitFor();check(await rows.count()<=40,'Complete ledger paginates rows');
 if(await rows.count()){
  const exportButton=graph.getByRole('button',{name:/^Export [\d,]+ rows$/});
  const download=page.waitForEvent('download');await exportButton.click();const downloaded=await download;const csv=readFileSync(await downloaded.path(),'utf8');
  check(csv.includes('from_identity_basis')&&csv.includes('source_locators')&&csv.includes('status_as_of'),'Export carries identity, evidence and provenance columns');
  const firstRow=rows.first();const relationshipId=await firstRow.getAttribute('data-relationship-id');
  await firstRow.locator('.iw-graph-relationship-button').click();await page.waitForURL(url=>new URLSearchParams(url.hash.split('?')[1]).get('iw_edge')===relationshipId);
  check(await page.locator('.iw-inspector').count()>0,'Relationship selection has a linked evidence inspector');
  await graph.locator('tbody tr').first().locator('.iw-graph-source button').first().click();await page.waitForURL(/iw_source=/);
  const sourceUrl=page.url();await page.reload();await ready();check(page.url()===sourceUrl,'Source selection survives reload');
 }
 await page.goto(`${base}/#/public-works?iw_scope=all&iw_view=map`);await ready();await graph.locator('.iw-graph-view button[aria-pressed="true"]').filter({hasText:/^Graph$/}).waitFor();await graph.locator('.iw-graph-plot').waitFor();await page.locator('.iw-linked-canvases').screenshot({path:resolve(screenshots,'map-graph-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 const deepLink=`${base}/#/public-works?iw_scope=all&iw_view=connections&iw_node=${encodeURIComponent(entityId)}&iw_depth=1`;
 await page.goto(deepLink);await page.getByRole('button',{name:'Back to connections',exact:true}).click();await graph.locator(`.iw-graph-node[data-entity-id="${entityId}"]`).waitFor({timeout:60000});
 const visible=await graph.locator('.iw-graph-plot').evaluate((plot,id)=>{const node=[...plot.querySelectorAll('[data-entity-id]')].find(el=>el.getAttribute('data-entity-id')===id);if(!node)return false;const r=plot.getBoundingClientRect(),n=node.getBoundingClientRect();const x=(n.left+n.right)/2,y=(n.top+n.bottom)/2;return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom&&Math.abs(x-(r.left+r.right)/2)<45&&Math.abs(y-(r.top+r.bottom)/2)<45;},entityId);
 check(visible,'Fresh mobile deep-link centers the requested focus within the scrollable graph');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'No horizontal page overflow at390px');
 // Preserve the mobile-width component without clipping its lower legend behind a scroll ancestor.
 await page.setViewportSize({width:390,height:1800});
 await graph.screenshot({path:resolve(screenshots,'graph-mobile-focus.png')});
 await page.goto(`${base}/#/public-works?iw_scope=all&iw_view=map&iw_state=LA`);await ready();await map.screenshot({path:resolve(screenshots,'map-mobile-ladakh.png')});
 check(errors.length===0,`No uncaught browser exceptions: ${errors.join(' | ')}`);
 console.log(JSON.stringify({passed:true,checks,screenshots,errors},null,2));
}finally{await browser.close();if(server)await new Promise(done=>server.close(done));}
