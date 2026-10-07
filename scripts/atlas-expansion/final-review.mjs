#!/usr/bin/env node
/** Independent product acceptance. Records bounded Chromium observations, not a user study. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';
import {loadInvestigation} from '../investigation/load.mjs';
import {loadAtlas} from './load.mjs';

const {INVESTIGATION_REGISTRY: registry} = await loadInvestigation();
const api = await loadAtlas();
const output = resolve(process.env.ATLAS_FINAL_ARTIFACTS ?? '/tmp/atlas-final-review');
const baselineOnly = process.env.ATLAS_REVIEW_SCOPE === 'baseline';
const financialOnly = process.env.ATLAS_REVIEW_SCOPE === 'financial-context';
const temporalOnly = process.env.ATLAS_REVIEW_SCOPE === 'temporal';
const layoutOnly = process.env.ATLAS_REVIEW_SCOPE === 'layout';
const titleOnly = process.env.ATLAS_REVIEW_SCOPE === 'title';
const focusedOnly = financialOnly || temporalOnly || layoutOnly || titleOnly;
mkdirSync(output, {recursive: true});
const results = [], measurements = [], errors = [];
const check = (condition, title, details = '') => {
  results.push({passed: !!condition, title, details});
  return !!condition;
};
let base = process.env.ATLAS_BASE_URL ?? process.env.INVESTIGATION_BASE_URL;
let server;
if (!base) {
  const dist = resolve(process.env.INVESTIGATION_DIST ?? 'dist');
  const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'};
  server = createServer((request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${path === '/' ? '/index.html' : path}`);
    if (!file.startsWith(`${dist}/`)) return response.writeHead(403).end();
    try {response.writeHead(200, {'content-type':mime[extname(file)] ?? 'application/octet-stream'}).end(readFileSync(file));}
    catch {response.writeHead(404).end();}
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${server.address().port}`;
}
base = base.replace(/\/$/u, '');
const binary = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/usr/bin/chromium';
const browser = await chromium.launch({...existsSync(binary) ? {executablePath: binary} : {}, args:['--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1440,height:1000}, acceptDownloads:true});
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(20000);
let navigation=0;
const goto = async path => {
  // A fresh document prevents an old ready marker from satisfying a hash-route transition,
  // and exercises the actual mobile initial state instead of carrying desktop disclosure state.
  await page.goto(`${base}/?atlas-review=${++navigation}#${path}`, {waitUntil:'domcontentloaded'});
  await page.locator('.atlas-case-feed').first().waitFor({timeout:90000});
  await page.locator('[data-places-tiles-ready="true"], [data-atlas-ready="true"], [data-map-dimension="2d"] .iw-map-graphics-notice').first().waitFor({timeout:90000});
};
const scenario = async (name, body) => {
  try {await body();}
  catch (error) {check(false, name, error.message); await page.screenshot({path:resolve(output, `${name.replace(/[^a-z0-9]+/giu,'-')}-failure.png`)}).catch(()=>{});}
};
const params = () => new URL(page.url().split('#')[1], 'https://local.invalid').searchParams;

try {
  const visualRoutes=titleOnly ? [[390,844,'/follow-the-money']] : layoutOnly ? [[1440,1000,'/follow-the-money'],[390,844,'/'],[390,844,'/follow-the-money'],[320,760,'/'],[320,760,'/follow-the-money']] : focusedOnly ? [] : baselineOnly ? [[1440,1000,'/follow-the-money'],[390,844,'/follow-the-money'],[390,844,'/']] : [[1440,1000,'/'],[1440,1000,'/energy'],[1440,1000,'/water'],[1440,1000,'/public-records'],[1440,1000,'/follow-the-money'],[1440,1000,'/international-finance'],[1440,1000,'/defence-trade'],[390,844,'/'],[390,844,'/energy'],[390,844,'/follow-the-money'],[390,844,'/international-finance'],[390,844,'/defence-trade'],[320,760,'/'],[320,760,'/follow-the-money']];
  for (const [width,height,path] of visualRoutes) {
    await scenario(`First viewport ${width} ${path}`, async () => {
      await page.setViewportSize({width,height}); await goto(path);
      await page.evaluate(() => {document.querySelector('main')?.scrollTo(0,0); window.scrollTo(0,0);});
      const canvas = page.locator('.places-atlas-stage:visible, .spatial-atlas-canvas:visible, .iw-map-stage:visible').first();
      const box = await canvas.boundingBox();
      const stageKind=await canvas.getAttribute('class');
      const dimension=await page.locator('[data-map-dimension]').first().getAttribute('data-map-dimension');
      const notices=page.locator('.iw-map-graphics-notice');
      const notice=await notices.count() ? await notices.first().textContent() : null;
      const visibleHeight = box ? Math.max(0, Math.min(height, box.y + box.height) - Math.max(0,box.y)) : 0;
      measurements.push({path,width,height,stageKind,dimension,notice,canvas:box,visibleHeight});
      check(visibleHeight >= 200, `${path} ${width}px exposes at least 200px of actual map in first viewport`, JSON.stringify({y:box?.y,visibleHeight}));
      check(await page.locator('.iw-map-state').count() === 36, `${path} ${width}px retains all 36 geographic units`);
      check(await page.locator('.atlas-network').count() > 0, `${path} ${width}px connects map to network`);
      const overflow = await page.evaluate(() => ({document:document.documentElement.scrollWidth > innerWidth+1, main:!!document.querySelector('main') && document.querySelector('main').scrollWidth > document.querySelector('main').clientWidth+1}));
      check(!overflow.document && !overflow.main, `${path} ${width}px has no page or main horizontal overflow`, JSON.stringify(overflow));
      if (width === 1440 && path === '/follow-the-money') {
        const mapBox = await page.locator('.fm-map-panel').boundingBox(), briefBox = await page.locator('.fm-case-brief').boundingBox();
        check(Math.abs(mapBox.y - briefBox.y)<2 && briefBox.x>mapBox.x, 'Money map has its evidence brief beside it at 1440px');
      }
      if(width<=390&&path==='/follow-the-money'){
        const titleCollision=await page.evaluate(()=>{
          const heading=document.querySelector('.fm-header h1'); if(!heading)return true;
          const controls=[...document.querySelectorAll('.fm-header-actions button')].map(el=>el.getBoundingClientRect());
          const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT); let node;
          while((node=walker.nextNode())){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())if(controls.some(other=>rect.left<other.right&&rect.right>other.left&&rect.top<other.bottom&&rect.bottom>other.top))return true;}
          return false;
        });
        check(!titleCollision,`Money title does not collide with header actions at ${width}px`);
      }
      await page.screenshot({path:resolve(output,`${path==='/'?'home':path.slice(1)}-${width}.png`)});
      if(width===390&&path==='/'&&dimension==='places'){
        const searchToggle=page.locator('.places-search-toggle');
        check(await searchToggle.getAttribute('aria-expanded')==='false','Mobile place search initially preserves map space');
        await searchToggle.focus(); await page.keyboard.press('Enter');
        const input=page.getByRole('searchbox',{name:'Find a city, village or place'});
        await input.waitFor({state:'visible'});
        check(await input.evaluate(el=>el===document.activeElement),'Keyboard expansion focuses mobile place search');
        await searchToggle.click();
        check(await searchToggle.getAttribute('aria-expanded')==='false'&&!await input.isVisible(),'Mobile place search can collapse again');
      }
    });
  }
  await page.setViewportSize({width:1440,height:1000});
  if(!baselineOnly&&!financialOnly&&!layoutOnly&&!titleOnly) await scenario('Direct-link time lens and all history', async () => {
    await goto('/?iw_from=2011-10-06&iw_to=2026-10-06');
    const time = page.locator('.atlas-time-control').first();
    const networkDates = page.locator('.atlas-network .atlas-date-controls');
    check(await networkDates.getByLabel('From',{exact:true}).inputValue()==='2011-10-06', 'Direct-linked start date reaches the network');
    await time.getByRole('button',{name:'All history',exact:true}).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.atlas-network .atlas-date-controls input[type="date"]')].every(input=>input.value===''));
    check(!params().has('iw_from') && !params().has('iw_to'), 'All history clears URL time lens');
    check(await networkDates.getByLabel('From',{exact:true}).inputValue()==='' && await networkDates.getByLabel('To',{exact:true}).inputValue()==='', 'All history clears copied network date constraints');
    await time.getByRole('button',{name:'15-year window',exact:true}).click();
    check(params().get('iw_from')==='2011-10-06' && params().get('iw_to')==='2026-10-06', '15-year preset has exact bounded dates');
    const slider = time.getByRole('slider'); await slider.focus(); await page.keyboard.press('Home');
    await page.waitForFunction(()=>document.querySelector('.atlas-time-control input[type="range"]')?.value==='2011');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>new URL(location.hash.slice(1),'https://local.invalid').searchParams.get('iw_to')==='2012-12-31');
    check(params().get('iw_to')==='2012-12-31', 'Time scrubber is keyboard-operable and changes event lens');
    check((await time.innerText()).includes('Current state boundaries remain fixed'), 'Time control discloses fixed current boundaries');
  });
  if(!baselineOnly&&!focusedOnly) await scenario('Clear sectors selects no evidence', async () => {
    await goto('/?iw_domains=none');
    check((await page.locator('.atlas-record-count').first().innerText())==='0 records', 'Empty sector selection has zero case records');
    check((await page.locator('.atlas-network-method').first().innerText()).startsWith('0 identities and 0 relationships'), 'Empty sector selection has zero network evidence');
    check(await page.getByLabel(/^Find a (sourced )?public site$/u).count()===0, 'Empty sectors do not expose unrelated public facilities');
  });
  if(!baselineOnly&&!focusedOnly) await scenario('Place survives sector navigation', async () => {
    await goto('/?iw_state=GJ');
    await page.locator('.atlas-sector-strip').getByRole('link',{name:'Energy',exact:true}).click();
    await page.locator('[data-workspace-route="/energy"]').waitFor();
    check(params().get('iw_state')==='GJ', 'Sector switch retains selected state');
    check(await page.getByLabel('Place',{exact:true}).inputValue()==='GJ', 'Retained state is visibly selected');
  });
  if(!baselineOnly&&!focusedOnly) for(const [path,recordId,country] of [['/international-finance','atlas-international-finance:record:bangladesh-adb-lt','BD'],['/defence-trade','atlas-defence-trade:record:brahmos-philippines-export','PH']]) await scenario(`Country case ${path}`, async()=>{
    await goto(path);
    const record=registry.records.find(row=>row.id===recordId); assert.ok(record,`Exact retained country case ${recordId}`);
    check(record.geography.some(geo=>geo.scope==='country'&&geo.countryCodes?.includes(country)&&geo.stateCodes.length===0),`${path} keeps foreign project context out of Indian state assignments`);
    check((await page.locator('.iw-map-unlocated').innerText()).includes('international context records · country-level, not point locations'),`${path} discloses international geography precision`);
    const caseRow=page.locator(`[data-case-id="${recordId}"]`); await caseRow.locator('.atlas-case-title').click();
    const inspected=page.locator(`[data-investigation-selection="${recordId}"]`); await inspected.waitFor();
    check((await inspected.locator('.iw-geography').innerText()).includes(country),`${path} inspector retains sourced country code`);
    check(await inspected.locator('.iw-response').innerText()===record.response,`${path} inspector retains case response without rewriting it`);
    check(await inspected.locator('.iw-amounts > div').count()===record.amounts.length,`${path} inspector renders each financial stage separately`);
    await inspected.screenshot({path:resolve(output,`${path.slice(1)}-country-case.png`)});
  });
  if(!baselineOnly&&!temporalOnly&&!layoutOnly&&!titleOnly) await scenario('Financial context stays distinct from allegations',async()=>{
    await goto('/international-finance');
    const feed=page.locator('.atlas-case-feed').first();
    await feed.getByRole('button',{name:/^Financial context /u}).click();
    const recordId='atlas-international-finance:record:imf-india-no-programme-credit';
    const record=registry.records.find(row=>row.id===recordId); assert.ok(record);
    const row=feed.locator(`[data-case-id="${recordId}"]`); await row.waitFor();
    check((await row.locator('.atlas-case-meta').innerText()).includes('financial context'), 'IMF account status is presented as financial context');
    check(record.kind==='institution-financial-position'&&record.tier==='documented','IMF account record is not classified as an allegation or loan award');
    await row.locator('.atlas-case-title').click();
    const inspected=page.locator(`[data-investigation-selection="${recordId}"]`); await inspected.waitFor();
    check((await inspected.innerText()).includes(record.title),'Financial context opens the exact reviewed record');
    check(await inspected.locator('.iw-response').innerText()===record.response,'Financial context preserves the account qualifications');
    await inspected.screenshot({path:resolve(output,'international-finance-context.png')});
    await page.getByRole('button',{name:'Clear evidence selection',exact:true}).click();
    await page.locator('[data-investigation-selection]').waitFor({state:'detached'});
    check(await page.locator('.places-atlas-stage:visible, .spatial-atlas-canvas:visible, .iw-map-stage:visible').count()>0,'Closing financial context preserves its map underlay');
  });
  if(!focusedOnly) for (const path of ['/', '/follow-the-money']) await scenario(`Open alleged link ${path}`, async () => {
    await goto(path);
    const feed=page.locator('.atlas-case-feed').first();
    await feed.getByRole('button',{name:/^Alleged links /u}).click();
    const row=feed.locator('[data-alleged-link-id]').first(); await row.waitFor();
    const id=await row.getAttribute('data-alleged-link-id');
    await row.locator('.atlas-case-title').click();
    const parameter=path==='/'?'iw_edge':'ftm_edge';
    await page.waitForFunction(({parameter,id})=>new URL(location.hash.slice(1),'https://local.invalid').searchParams.get(parameter)===id,{parameter,id});
    check(params().get(parameter)===id, `${path} alleged link opens its exact retained relationship`);
    const edge=registry.relationships.find(row=>row.id===id);
    check(edge?.tier==='alleged', `${path} allegedly linked row retains allegation tier`);
    const inspector=page.locator(path==='/'?'.iw-inspector':'.fm-inspector');
    if(path==='/follow-the-money') await page.locator(`.fm-inspector[data-inspected-id="${id}"]`).waitFor();
    else await page.locator(`[data-investigation-selection="${id}"]`).waitFor();
    await page.waitForFunction(selector=>document.querySelector(selector)?.innerText.toLowerCase().includes('alleged'),path==='/'?'.iw-inspector':'.fm-inspector');
    check((await inspector.innerText()).toLowerCase().includes('alleged'), `${path} opened inspector states the allegation tier`);
    await inspector.screenshot({path:resolve(output,`${path==='/'?'home':'money'}-allegation.png`)});
  });
  if(!focusedOnly) await scenario('Keyboard evidence reader and portable evidence', async () => {
    await goto('/');
    const network=page.locator('.atlas-network').first(), focus=registry.entities.find(row=>row.id==='deep-corporate:entity:talace');
    assert.ok(focus,'Retained Talace identity exists');
    await network.getByRole('searchbox',{name:'Find an exact identity'}).fill('Talace');
    const opener=network.locator('.atlas-identity-results button').filter({hasText:focus.namespace}).filter({hasText:focus.label}).first();
    await opener.focus(); await page.keyboard.press('Enter');
    const reader=page.locator('.atlas-evidence-popover'); await reader.waitFor();
    check(await reader.evaluate(el=>el===document.activeElement), 'Evidence reader receives keyboard focus');
    check(await reader.getAttribute('aria-labelledby')!==null, 'Evidence reader has an accessible title');
    const event=page.waitForEvent('download');
    await reader.getByRole('button',{name:/Export evidence \+ linked responses/u}).click();
    const packet=JSON.parse(readFileSync(await (await event).path(),'utf8'));
    check(packet.missingIds.length===0, 'Downloaded evidence packet has no missing references');
    const records=new Set(packet.records.map(row=>row.id)), sources=new Set(packet.sources.map(row=>row.id));
    check(packet.relationships.every(row=>row.responseIds.every(id=>records.has(id))), 'Downloaded packet retains every linked response');
    check([...packet.entities,...packet.relationships,...packet.records].every(row=>[...row.sourceIds,...row.geography.flatMap(geo=>geo.sourceIds)].every(id=>sources.has(id))), 'Downloaded packet retains direct and geography source closure');
    const originals=new Map(registry.relationships.map(row=>[row.id,row]));
    check(packet.relationships.every(row=>JSON.stringify(row.amounts)===JSON.stringify(originals.get(row.id)?.amounts)), 'Export does not aggregate or rewrite financial stages');
    await page.setViewportSize({width:390,height:844});
    await reader.getByRole('button',{name:'Expand',exact:true}).click();
    const box=await reader.boundingBox();
    check(box.x>=0 && box.x+box.width<=391 && box.height<=844, 'Expanded mobile reader fits the viewport');
    await reader.screenshot({path:resolve(output,'evidence-reader-390.png')});
    await page.keyboard.press('Escape'); check(await reader.count()===0, 'Escape dismisses keyboard evidence reader');
    check(await network.getByRole('searchbox',{name:'Find an exact identity'}).evaluate(el=>el===document.activeElement), 'Closing a transient search-result reader returns focus to stable identity search');
  });
  await scenario('Retained evidence counts and claim semantics', async () => {
    const feed=api.getAtlasCaseFeed(registry), alleged=api.getAtlasAllegedLinks(registry);
    check(Object.values(feed.counts).reduce((sum,count)=>sum+count,0)===feed.total, 'Case category counts partition their stated record denominator');
    check(alleged.entries.every(row=>row.relationship.tier==='alleged' && row.relationship.sourceIds.length), 'Alleged-link population has allegation tier and citations');
    check(feed.interpretation.includes('not unique incidents') && alleged.interpretation.includes('not findings'), 'Count interpretations distinguish records, assertions and adjudicated findings');
    const atlasRecords=registry.records.filter(row=>api.ATLAS_NAMESPACES.includes(row.namespace));
    check(atlasRecords.filter(row=>row.kind==='investigation-case').every(row=>row.alternativeExplanations.length>0 && row.falsifier && row.response), 'New investigated cases contain response, alternatives and disconfirmation test');
    measurements.push({registry:{entities:registry.entities.length,relationships:registry.relationships.length,records:registry.records.length,sources:registry.sources.length},feed:{total:feed.total,counts:feed.counts},alleged:alleged.total,atlasRecords:atlasRecords.length});
  });
  check(errors.length===0,'No uncaught page errors in independent acceptance',errors.join('\n'));
} finally {
  const report={reviewedAt:new Date().toISOString(),scope:titleOnly?'title-spacing-confirmation':layoutOnly?'layout-correction-review':temporalOnly?'temporal-followup':financialOnly?'financial-context-followup':baselineOnly?'baseline-correction-review':'full-acceptance',base,passed:results.every(row=>row.passed),checks:results.length,failures:results.filter(row=>!row.passed),results,measurements,errors};
  writeFileSync(resolve(output,'results.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,checks:report.checks,failures:report.failures,artifacts:output},null,2));
  await browser.close(); if(server) await new Promise(done=>server.close(done));
  if(!report.passed)process.exitCode=1;
}
