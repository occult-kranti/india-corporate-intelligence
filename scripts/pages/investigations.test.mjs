import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const dist = resolve('dist');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.woff2':'font/woff2' };
let server, browser, base;
before(async () => {
  server = createServer((req,res) => {
    const path = resolve(dist, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!path.startsWith(dist + '/') || !existsSync(path)) return res.writeHead(404).end();
    res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
    res.end(readFileSync(path));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  base = `http://127.0.0.1:${server.address().port}`;
  const pinned = process.env.PLAYWRIGHT_CHROMIUM_PATH || '/opt/pw-browsers/chromium';
  browser = await chromium.launch(existsSync(pinned) ? {executablePath:pinned} : {});
});
after(async()=>{await browser?.close(); if(server)await new Promise(r=>server.close(r));});
async function visit(route, width=1440) {
  const page=await browser.newPage({viewport:{width,height:1000}});
  await page.goto(base+'/#'+route);
  await page.locator('.inv-page, .gt-page').first().waitFor();
  return page;
}
async function downloadedJson(page, button) {
  const pending=page.waitForEvent('download');await button.click();
  const download=await pending; const path=await download.path();
  return JSON.parse(readFileSync(path,'utf8'));
}

test('network filters, source ledger and deep links preserve provenance', async()=>{
  const page=await visit('/investigations');
  try {
    assert.equal(await page.locator('.inv-node--case').count(),5);
    await page.getByRole('searchbox').fill('PM CARES');
    await page.waitForURL(/q=PM/);
    assert.match(page.url(),/q=PM/);
    await page.getByRole('button',{name:'Source ledger',exact:true}).click();
    assert.equal(await page.locator('.inv-table tbody tr').count(),3);
    await page.locator('.inv-table-case').first().click();
    await page.locator('#inv-dossier-title').waitFor();
    assert.match(await page.locator('#inv-dossier').innerText(),/Response & limitations/);
    const url=page.url();await page.reload();await page.locator('#inv-dossier-title').waitFor();
    assert.equal(page.url(),url);
    await page.getByRole('searchbox').fill('zzzz-no-such-case');
    await page.getByRole('heading',{name:'No dossiers match this view.'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'JSON',exact:true}).isDisabled(),true);
  } finally { await page.close(); }
});

test('filtered export carries sources, responses and falsifiers', async()=>{
  const page=await visit('/investigations?q=PM%20CARES');
  try {
    const output=await downloadedJson(page,page.getByRole('button',{name:'JSON',exact:true}));
    assert.equal(output.cases.length,3);assert(output.sources.length>0);
    const ids=new Set(output.sources.map(s=>s.id));
    for(const c of output.cases){assert(c.limitation);assert(c.hypotheses[0].falsifier);for(const id of c.sources)assert(ids.has(id));}
    assert(output.cases.some(c=>c.response));
    const promise=page.waitForEvent('download');await page.getByRole('button',{name:'CSV',exact:true}).click();
    const csv=readFileSync(await (await promise).path(),'utf8');
    assert(csv.includes('source_urls'));assert(csv.includes('response_and_limitations'));
  } finally {await page.close();}
});

test('leads save locally, reload, filter and unsave', async()=>{
  const page=await visit('/leads?case=fund-pmcares-foreign');
  try {
    const save=page.getByRole('button',{name:/^Save lead:/}).first();await save.click();
    await page.reload();await page.getByRole('button',{name:/^Unsave lead:/}).first().waitFor();
    await page.getByRole('button',{name:'Saved on this device',exact:true}).click();
    assert.equal(await page.locator('.inv-lead-card').count(),1);
    await page.getByRole('button',{name:/^Unsave lead:/}).first().click();
    await page.getByRole('heading',{name:'No saved leads match this view.'}).waitFor();
  } finally {await page.close();}
});

test('hash-safe navigation and payoff model survive interactive use', async()=>{
  const page=await visit('/game-theory');
  try {
    const before=page.url();await page.locator('.gt-jump button').nth(1).click();assert.equal(page.url(),before);
    await page.getByRole('button',{name:'Supplier or contractor',exact:true}).click();
    await page.locator('#gt-case').selectOption('fund-pmcares-foreign');
    await page.locator('#gt-field-notes').fill('Test note: obtain only public records.');
    await page.waitForFunction(()=>localStorage.getItem('icip-strategy-lab-v1')?.includes('Test note'));
    const output=await downloadedJson(page,page.getByRole('button',{name:'Export scenario JSON',exact:true}));
    assert(JSON.stringify(output).includes('Test note: obtain only public records.'));
    assert(JSON.stringify(output).includes('fund-pmcares-foreign'));
    await page.reload();await page.locator('#gt-field-notes').waitFor();
    assert.equal(await page.locator('#gt-field-notes').inputValue(),'Test note: obtain only public records.');
  } finally {await page.close();}
});

test('mobile pages have no page-wide overflow or runtime errors',async()=>{
  for(const route of ['/investigations','/leads?case=inst-pmjay-controls','/game-theory']){
    const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    try{await page.goto(base+'/#'+route);await page.locator('.inv-page, .gt-page').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),route+' horizontal overflow');
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  }
});

test('PM CARES current accounts retain exact units, export and mobile layout',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(base+'/#/pmcares?iw_view=dossier');
    const panel=page.locator('#current-pm-accounts');await panel.waitFor();
    const cash=panel.getByRole('table').first();
    assert.match(await cash.innerText(),/₹84,52,06,70,758/);
    assert.match(await cash.innerText(),/₹87,85,291/);
    await panel.locator('summary').click();
    assert.equal(await panel.getByRole('table').count(),5);
    const output=await downloadedJson(page,page.getByRole('button',{name:'Download verified accounts JSON',exact:true}));
    assert.equal(output.source.scale,1);assert.equal(output.years[0].printed_totals.payments.rupees,8785291);
    assert.equal(output.years[1].opening_balances[1].rupees,null);
    assert.equal(output.independent_verification.cellsCompared,34);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'PM CARES horizontal overflow');
    assert.deepEqual(errors,[]);
  }finally{await page.close();}
});

test('lead handoff selects its exact worksheet and returns to its dossier', async()=>{
  const page=await visit('/leads?case=fund-pmcares-foreign');
  try {
    const question=await page.locator('.inv-lead-card h2').first().innerText();
    await page.getByRole('link',{name:'Plan this test',exact:true}).first().click();
    await page.locator('#gt-case').waitFor();
    assert.match(page.url(),/case=fund-pmcares-foreign&hypothesis=0/);
    assert.equal(await page.locator('#gt-case').inputValue(),'fund-pmcares-foreign');
    assert.equal(await page.locator('#gt-field-question').inputValue(),question);
    await page.locator('.gt-case-context').getByRole('link').click();
    await page.locator('#inv-dossier-title').waitFor();
    assert.match(page.url(),/case=fund-pmcares-foreign/);
    await page.locator('.inv-related').getByRole('link',{name:'PM CARES',exact:true}).click();
    await page.locator('#current-pm-accounts').waitFor();
    assert.match(page.url(),/pmcares\?iw_view=dossier/);
  } finally {await page.close();}
});

test('v1 notes migrate and plan revisions survive edits, case changes and reload', async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const legacy={roleId:'official',caseId:'fund-pmcares-foreign',hypothesisIndex:0,inputs:{benefit:'bad'},drafts:{'fund-pmcares-foreign:0':{question:'Legacy question',prediction:'Legacy prediction',alternative:'Legacy alternative',falsifier:'Legacy falsifier',records:'Legacy records',notes:'Original v1 note',links:''}},plans:'malformed',revisions:null};
  await page.addInitScript(value=>{if(!localStorage.getItem('icip-strategy-lab-v1'))localStorage.setItem('icip-strategy-lab-v1',JSON.stringify(value));},legacy);
  try {
    await page.goto(base+'/#/game-theory');await page.locator('#gt-case').waitFor();
    assert.equal(await page.locator('#gt-field-notes').inputValue(),'Original v1 note');
    assert.equal(await page.locator('#gt-benefit').inputValue(),'40');
    await page.locator('.gt-test-plan>summary').click();
    assert.equal(await page.locator('#gt-plan-timing').inputValue(),'exploratory');
    await page.locator('#gt-plan-population').fill('All comparable awards, including non-donors.');
    await page.locator('#gt-plan-timeWindow').fill('2020–2025; cutoff 2026-10-14.');
    await page.locator('#gt-plan-alternativeObservation').fill('Capacity and emergency needs explain award differences.');
    await page.locator('#gt-plan-analysisMethod').fill('Match capacity and tender size; report all three planned comparisons.');
    await page.getByRole('button',{name:'Capture plan revision',exact:true}).click();
    await page.locator('.gt-revision').waitFor();
    await page.locator('#gt-field-notes').fill('Changed after revision one');
    await page.locator('#gt-plan-population').fill('Updated population');
    await page.locator('.gt-revision>summary').click();
    assert.match(await page.locator('.gt-revision').innerText(),/Original v1 note/);
    assert.match(await page.locator('.gt-revision').innerText(),/All comparable awards, including non-donors/);
    assert.doesNotMatch(await page.locator('.gt-revision').innerText(),/Changed after revision one/);
    const first=await downloadedJson(page,page.getByRole('button',{name:'Export scenario JSON',exact:true}));
    assert.equal(first.schemaVersion,2);assert.equal(first.testPlanRevisions.length,1);
    assert.equal(first.testPlanRevisions[0].worksheet.notes,'Original v1 note');
    assert.equal(first.worksheet.notes,'Changed after revision one');
    assert.equal(first.testPlanRevisions[0].plan.timing,'exploratory');
    assert.match(first.testPlanBoundary,/not independently registered or validated/);
    assert(Number.isFinite(Date.parse(first.testPlanRevisions[0].capturedAt)));
    await page.locator('#gt-case').selectOption('inst-pmjay-controls');
    assert.equal(await page.locator('.gt-revision').count(),0);
    assert.equal(await page.locator('#gt-plan-population').inputValue(),'');
    await page.locator('#gt-case').selectOption('');
    await page.locator('#gt-field-notes').fill('Official-only note');
    await page.getByRole('button',{name:'Capture plan revision',exact:true}).click();
    await page.getByRole('button',{name:'Supplier or contractor',exact:true}).click();
    assert.equal(await page.locator('#gt-field-notes').inputValue(),'');
    assert.equal(await page.locator('.gt-revision').count(),0);
    await page.getByRole('button',{name:'Public official',exact:true}).click();
    assert.equal(await page.locator('#gt-field-notes').inputValue(),'Official-only note');
    assert.equal(await page.locator('.gt-revision').count(),1);
    await page.locator('#gt-case').selectOption('fund-pmcares-foreign');
    assert.equal(await page.locator('#gt-field-notes').inputValue(),'Changed after revision one');
    assert.equal(await page.locator('#gt-plan-population').inputValue(),'Updated population');
    await page.locator('#gt-plan-timing').selectOption('before-new-search');
    await page.getByRole('button',{name:'Capture plan revision',exact:true}).click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('icip-strategy-lab-v1')).revisions['fund-pmcares-foreign:0'].length===2);
    await page.reload();await page.locator('#gt-case').waitFor();
    await page.locator('.gt-test-plan>summary').click();
    assert.equal(await page.locator('.gt-revision').count(),2);
    const output=await downloadedJson(page,page.getByRole('button',{name:'Export scenario JSON',exact:true}));
    assert.equal(output.testPlanRevisions[0].worksheet.notes,'Original v1 note');
    assert.equal(output.testPlanRevisions[1].plan.timing,'before-new-search');
    assert.equal(output.testPlanRevisions[1].revision,2);
    assert.doesNotMatch(JSON.stringify(output.testPlanRevisions),/Official-only note/);
    assert(await page.evaluate(()=>document.querySelector('main').scrollWidth<=document.querySelector('main').clientWidth+1),'expanded plan horizontal overflow');
  } finally {await page.close();}
});

test('invalid worksheet links and corrupted storage do not invent a selected case',async()=>{
  const page=await browser.newPage();
  await page.addInitScript(()=>localStorage.setItem('icip-strategy-lab-v1','{"drafts":[],"plans":null,"revisions":{"bad":[null]}}'));
  try {
    await page.goto(base+'/#/game-theory?case=fund-pmcares-foreign&hypothesis=999');
    await page.locator('#gt-case').waitFor();
    assert.equal(await page.locator('#gt-case').inputValue(),'');
    assert.match(await page.locator('#gt-worksheet').innerText(),/does not identify an available case and question/);
    const output=await downloadedJson(page,page.getByRole('button',{name:'Export scenario JSON',exact:true}));
    assert.equal(output.case,null);assert.deepEqual(output.testPlanRevisions,[]);
  } finally {await page.close();}
});
