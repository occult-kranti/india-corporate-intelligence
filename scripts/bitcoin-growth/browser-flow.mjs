/** Browser gate. Use an already installed Playwright and Chromium; never installs. */
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync,readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyServingManifest,hash} from './served-integrity.mjs';
const base=process.env.ATLAS_URL||'http://127.0.0.1:8769/';
const manualGates=['screen-reader reading order and announcements','actual browser 200% zoom (viewport resizing and text enlargement are separate checks)','manual touch-device ergonomics','rendered text/UI contrast measurement','human desktop/phone visual acceptance including polygon edges','independent successor source/projection review','exact remote commit and CI binding','public deployment revision/route smoke and existing-route regressions'];
const matrix=JSON.parse(readFileSync(new URL('./browser-acceptance-matrix.json',import.meta.url)));
const report={base,automated_gates:Object.fromEntries(matrix.automated.map(g=>[g,'unrun'])),started_at:new Date().toISOString(),browser_started:false,checks:[],external_requests:[],errors:[],manual_gates:Object.fromEntries(manualGates.map(g=>[g,'unrun'])),release_acceptance:false};
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=process.env.EVIDENCE_DIR;
const evidenceRelative=evidence?relative(root,resolve(evidence)):'';
if(!evidence||!isAbsolute(evidence)||!(evidenceRelative==='..'||evidenceRelative.startsWith(`..${sep}`)))throw Error('EVIDENCE_DIR must be an absolute directory outside the sealed package');
mkdirSync(evidence,{recursive:true});if(readdirSync(evidence).length)throw Error('EVIDENCE_DIR must be empty for a closed, single-run evidence inventory');
const out=pathToFileURL(resolve(evidence)+sep);const expectedArtifacts=['browser-flow-result.json','desktop-initial.png','mobile-initial.png'];let browser;
const manifestBytes=readFileSync(process.env.RELEASE_MANIFEST||new URL('../release-manifest-v2.json',import.meta.url));
const expectedManifest=process.env.EXPECTED_RELEASE_MANIFEST_SHA256;
const readServed=async path=>{const response=await fetch(new URL(path,base),{cache:'no-store',redirect:'manual'});if(!response.ok)throw Error(`Serving integrity HTTP ${response.status}: ${path}`);return Buffer.from(await response.arrayBuffer());};
async function check(name,fn){report.automated_gates[name]='running';try{await fn();report.checks.push({name,status:'passed'});report.automated_gates[name]='passed';}catch(error){report.automated_gates[name]='failed';throw error;}}
try{
  report.selected_manifest_sha256=expectedManifest;
  report.served_hashes_before=await verifyServingManifest(manifestBytes,expectedManifest,readServed);
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{channel:process.env.CHROMIUM_CHANNEL||'chrome'}),timeout:15000});
  report.browser_started=true;report.browser_version=browser.version();report.browser_channel=process.env.CHROMIUM_EXECUTABLE?'explicit installed executable':process.env.CHROMIUM_CHANNEL||'chrome';report.playwright_version=process.env.EXPECTED_PLAYWRIGHT_VERSION||'record installed lockfile version in CI evidence';
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===new URL(base).origin)return route.continue();report.external_requests.push(url.href);return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});await page.locator('#atlas').waitFor({state:'visible'});
  await check('reviewed build initializes without page errors',async()=>{assert.deepEqual(report.errors,[]);assert.equal(await page.locator('.country').count(),242);assert.match(await page.title(),/Bitcoin growth atlas/);});
  await check('default view is Bitcoin-only with latest partial-month measurements',async()=>{assert.equal(await page.locator('#include-context').isChecked(),false);assert.match(await page.locator('#month-label').innerText(),/October 2026/);assert.match(await page.locator('#metric-observation').innerText(),/Partial calendar month/);assert.equal(await page.locator('[data-event="E17"]').count(),0);});
  await page.screenshot({path:new URL('desktop-initial.png',out).pathname,fullPage:true});
  await check('all four global metric controls and table work',async()=>{for(const key of ['TxCnt','AdrActCnt','SplyCur','HashRate']){await page.locator(`[data-metric="${key}"]`).click();assert.equal(await page.locator(`[data-metric="${key}"]`).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#table-wrap tbody tr').count(),214);}assert.match(await page.locator('#chart-unit').innerText(),/EH\/s/);});
  await check('context toggle admits 32 reviewed cards and China is dated, not signed',async()=>{await page.locator('#include-context').check();assert.equal(await page.locator('.timeline-card').count(),32);await page.locator('[data-event="E17"]').click();assert.match(await page.locator('#record-heading').innerText(),/dated virtual-currency/);assert.match(await page.locator('#selected-record').innerText(),/Physical signing not verified/);assert.equal(await page.locator('path.country.selected[data-country="CN"]').count(),1);assert.match(await page.locator('#month-label').innerText(),/September 2021/);});
  await check('source drawer closes with Escape and returns focus',async()=>{const button=page.locator('#selected-record [data-source="S12"]');await button.click();assert.equal(await page.locator('#source-drawer').evaluate(e=>e.open),true);assert.match(await page.locator('#drawer-content').innerText(),/Physical signing was not independently verified/);await page.keyboard.press('Escape');assert.equal(await page.locator('#source-drawer').evaluate(e=>e.open),false);assert.equal(await button.evaluate(e=>e===document.activeElement),true);await button.click();await page.locator('#close-drawer').click();assert.equal(await button.evaluate(e=>e===document.activeElement),true);});
  await check('IMF selection uses program-country geography',async()=>{await page.locator('[data-event="E25"]').click();assert.match(await page.locator('#map-context').innerText(),/not the location of the IMF approval/);assert.equal(await page.locator('path.country.selected[data-country="SV"]').count(),1);});
  await check('year-only precursor selection remains unlocated with no invented metric',async()=>{await page.locator('[data-event="E01"]').click();assert.match(await page.locator('#metric-observation').innerText(),/No observation/);assert.equal(await page.locator('path.country.selected').count(),0);assert.match(await page.locator('#selected-record').innerText(),/1980/);});
  await check('January 2009 preserves six missing hash-rate values and partial coverage',async()=>{await page.locator('[data-event="E06"]').click();assert.match(await page.locator('#metric-observation').innerText(),/23 non-null hash-rate days/);assert.match(await page.locator('#metric-observation').innerText(),/Partial calendar month/);});
  await check('cursor backtracking clears later selection',async()=>{await page.locator('[data-event="E25"]').click();await page.locator('#month').fill(String(2009*12));await page.locator('#month').dispatchEvent('input');assert.match(await page.locator('#record-heading').innerText(),/Follow the evidence/);assert.equal(await page.locator('path.country.selected').count(),0);});
  await page.locator('#latest').click();
  await check('country filtering and clearing retain useful keyboard focus',async()=>{await page.locator('button[data-country="SV"]').click();assert.equal(await page.locator('.timeline-card').count(),2);assert.equal(await page.locator('button[data-country="SV"]').evaluate(e=>e===document.activeElement),true);await page.locator('#clear-country').click();assert.equal(await page.locator('.timeline-card').count(),32);});
  await check('schematic relationships preserve custody-time qualification',async()=>{await page.locator('#toggle-relations').click();assert.equal(await page.locator('[data-relation]').count(),16);assert.match(await page.locator('[data-relation="R13"]').innerText(),/not custody-service commencement or transfer date/);assert.match(await page.locator('[data-relation="R06"]').innerText(),/approximately/);await page.locator('#toggle-relations').click();assert.equal(await page.locator('#relations-list').isVisible(),false);});
  await check('map zoom, keyboard pan and reset are operable',async()=>{await page.locator('#zoom-in').click();assert.equal(await page.locator('#zoom-label').innerText(),'150%');await page.locator('#map-viewport').focus();await page.keyboard.press('+');assert.equal(await page.locator('#zoom-label').innerText(),'200%');await page.keyboard.press('ArrowRight');assert.ok(await page.locator('#map-viewport').evaluate(e=>e.scrollLeft)>0);await page.keyboard.press('0');assert.equal(await page.locator('#zoom-label').innerText(),'100%');});
  await check('chronological card scrolling works without motion',async()=>{const rail=page.locator('#timeline');await rail.evaluate(e=>e.scrollLeft=0);await page.locator('#timeline-next').click();assert.ok(await rail.evaluate(e=>e.scrollLeft)>0);await page.locator('#timeline-prev').click();assert.ok(await rail.evaluate(e=>e.scrollLeft)<10);});
  await check('modal repeated open/close remains usable',async()=>{for(let i=0;i<3;i++){await page.locator('#open-methods').click();await page.locator('#close-drawer').click();}assert.equal(await page.locator('#open-methods').evaluate(e=>e===document.activeElement),true);});
  await check('native dialog traps Tab/Shift+Tab and prevents background focus',async()=>{
    await page.locator('#open-methods').click();
    for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('#source-drawer')!==null),true);}
    for(let i=0;i<12;i++){await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.closest('#source-drawer')!==null),true);}
    await page.locator('#latest').evaluate(e=>e.focus());assert.equal(await page.evaluate(()=>document.activeElement.closest('#source-drawer')!==null),true);
    await page.keyboard.press('Escape');
  });
  await check('keyboard-only skip link reaches main and range is operable',async()=>{
    await page.goto(base,{waitUntil:'networkidle'});await page.locator('#atlas').waitFor({state:'visible'});
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('skip-link')),true);await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#main');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
    const reach=async selector=>{for(let i=0;i<150;i++){await page.keyboard.press('Tab');if(await page.evaluate(selector=>document.activeElement.matches(selector),selector))return;}throw Error(`Keyboard could not reach ${selector}`);};
    await reach('#month');const old=await page.locator('#month').inputValue();await page.keyboard.press('ArrowLeft');assert.equal(Number(await page.locator('#month').inputValue()),Number(old)-1);await page.keyboard.press('ArrowRight');
    await reach('#include-context');await page.keyboard.press('Space');assert.equal(await page.locator('#include-context').isChecked(),true);
    await reach('[data-event="E25"]');await page.keyboard.press('Enter');assert.match(await page.locator('#record-heading').innerText(),/IMF approves/);
  });
  await page.locator('#latest').click();
  const countryPoint=async(targetPage)=>targetPage.locator('path.country.recorded[data-country="CN"]').evaluate(path=>{
    const box=path.getBBox(),matrix=path.getScreenCTM(),svg=path.ownerSVGElement;
    for(let i=1;i<9;i++)for(let j=1;j<9;j++){const point=svg.createSVGPoint();point.x=box.x+box.width*i/10;point.y=box.y+box.height*j/10;if(!path.isPointInFill(point))continue;const screen=point.matrixTransform(matrix);if(document.elementFromPoint(screen.x,screen.y)===path)return {x:screen.x,y:screen.y};}
    throw Error('No visible native country hit target');
  });
  await check('actual SVG country click/hover keeps its native target',async()=>{
    await page.locator('#world').scrollIntoViewIfNeeded();const point=await countryPoint(page);await page.mouse.move(point.x,point.y);assert.match(await page.locator('path[data-country="CN"] title').textContent(),/China/);await page.mouse.click(point.x,point.y);assert.equal(await page.locator('button[data-country="CN"]').getAttribute('aria-pressed'),'true');await page.locator('#clear-country').click();
  });
  await check('native pointer drag pans and does not activate a country',async()=>{
    await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();const box=await page.locator('#map-viewport').boundingBox();const before=await page.locator('#map-viewport').evaluate(e=>e.scrollLeft);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-90,box.y+box.height/2,{steps:5});await page.mouse.up();assert.ok((await page.locator('#map-viewport').evaluate(e=>e.scrollLeft))>before);assert.equal(await page.locator('#clear-country').isVisible(),false);await page.locator('#map-reset').click();
  });
  await check('chart pointer selects an observed month',async()=>{await page.locator('#metric-chart').scrollIntoViewIfNeeded();const r=await page.locator('#metric-chart').boundingBox();await page.mouse.click(r.x+r.width*.5,r.y+r.height*.5);assert.notEqual(await page.locator('#month-label').innerText(),'October 2026');assert.doesNotMatch(await page.locator('#metric-observation').innerText(),/No observation/);});
  await check('Back and Forward preserve a usable initialized board',async()=>{await page.evaluate(()=>location.hash='chronology-title');await page.goBack();assert.equal(await page.locator('#atlas').isVisible(),true);await page.goForward();assert.equal(new URL(page.url()).hash,'#chronology-title');await page.locator('#latest').click();});
  await check('ordinary-motion chronology reaches its destination',async()=>{await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#timeline').evaluate(e=>e.scrollLeft=0);await page.locator('#timeline-next').click();await page.waitForFunction(()=>document.getElementById('timeline').scrollLeft>200);await page.emulateMedia({reducedMotion:'reduce'});});
  await check('200 percent text enlargement reflows without page-wide overflow',async()=>{await page.addStyleTag({content:'html{font-size:32px!important}'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.addStyleTag({content:'html{font-size:16px!important}'});});
  await check('native touch tap/pan/cancellation works after a mouse drag',async()=>{
    const touchContext=await browser.newContext({viewport:{width:1100,height:1000},hasTouch:true,reducedMotion:'reduce'});
    await touchContext.route('**/*',route=>{if(new URL(route.request().url()).origin===new URL(base).origin)return route.continue();report.external_requests.push(route.request().url());return route.abort();});
    const touch=await touchContext.newPage();touch.on('pageerror',e=>report.errors.push(e.message));await touch.goto(base,{waitUntil:'networkidle'});await touch.locator('#include-context').check();await touch.locator('#world').scrollIntoViewIfNeeded();
    const box=await touch.locator('#map-viewport').boundingBox();await touch.mouse.move(box.x+150,box.y+150);await touch.mouse.down();await touch.mouse.move(box.x+100,box.y+150,{steps:4});await touch.mouse.up();
    const point=await countryPoint(touch);await touch.touchscreen.tap(point.x,point.y);assert.equal(await touch.locator('button[data-country="CN"]').getAttribute('aria-pressed'),'true');await touch.locator('#clear-country').click();
    await touch.locator('#zoom-in').click();await touch.locator('#zoom-in').click();const bounds=await touch.locator('#map-viewport').boundingBox();const cdp=await touchContext.newCDPSession(touch);const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;const before=await touch.locator('#map-viewport').evaluate(e=>e.scrollLeft);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*25,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(150);assert.notEqual(await touch.locator('#map-viewport').evaluate(e=>e.scrollLeft),before);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await touch.locator('#map-reset').click();const again=await countryPoint(touch);await touch.touchscreen.tap(again.x,again.y);assert.equal(await touch.locator('button[data-country="CN"]').getAttribute('aria-pressed'),'true');await touchContext.close();
  });
  await check('desktop has no document-level horizontal overflow',async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)));
  for(const width of [720,390,320]){
    await page.setViewportSize({width,height:900});
    await check(`${width}px reflow has no document-level horizontal overflow`,async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)));
  }
  await check('mobile methods opener is visible and keyboard-operable with focus return',async()=>{
    for(const width of [850,720,390,320]){
      await page.setViewportSize({width,height:900});
      const opener=page.locator('#open-methods');assert.equal(await opener.count(),1);assert.equal(await opener.isVisible(),true);assert.equal(await opener.isEnabled(),true);
    }
    await page.setViewportSize({width:390,height:844});await page.goto(base,{waitUntil:'networkidle'});await page.locator('#atlas').waitFor({state:'visible'});
    const opener=page.locator('#open-methods');
    for(let i=0;i<12&&!(await opener.evaluate(e=>e===document.activeElement));i++)await page.keyboard.press('Tab');
    assert.equal(await opener.evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');
    assert.equal(await page.locator('#source-drawer').evaluate(e=>e.open),true);
    const methods=await page.locator('#drawer-content').innerText();assert.match(methods,/Nine stronger inferences remain held/);assert.match(methods,/hash rate is null for the first six days/);assert.match(methods,/January 2009 and October 2026 are partial months/);assert.match(methods,/CC BY-NC 4.0/);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#source-drawer').evaluate(e=>e.open),false);assert.equal(await opener.evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Enter');assert.equal(await page.locator('#source-drawer').evaluate(e=>e.open),true);await page.locator('#close-drawer').click();
    assert.equal(await page.locator('#source-drawer').evaluate(e=>e.open),false);assert.equal(await opener.evaluate(e=>e===document.activeElement),true);assert.equal(await opener.isVisible(),true);
  });
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('mobile-initial.png',out).pathname,fullPage:true});
  await check('runtime never requests an external origin',async()=>assert.deepEqual(report.external_requests,[]));
  await check('no JavaScript runtime errors',async()=>assert.deepEqual(report.errors,[]));
  report.served_hashes_after=await verifyServingManifest(manifestBytes,expectedManifest,readServed);
  report.status='passed_automated_native_suite_manual_gates_pending';
}catch(error){report.status=report.browser_started?'failed_browser_gate':'blocked_before_browser_runtime';report.unrun_automated_gates='All planned checks not present in checks[] remain unrun; see tests/browser-acceptance-matrix.json.';report.failure=error.stack||String(error);process.exitCode=1;}
finally{await browser?.close();const unexpected=readdirSync(evidence).filter(name=>!expectedArtifacts.includes(name));if(unexpected.length){report.status='failed_unexpected_evidence_inventory';report.unexpected_artifacts=unexpected;process.exitCode=1;}report.expected_artifacts=expectedArtifacts;report.screenshots=expectedArtifacts.filter(name=>name.endsWith('.png')&&existsSync(new URL(name,out))).map(name=>{const bytes=readFileSync(new URL(name,out));return {name,bytes:bytes.length,sha256:hash(bytes)};});report.finished_at=new Date().toISOString();writeFileSync(new URL('browser-flow-result.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
