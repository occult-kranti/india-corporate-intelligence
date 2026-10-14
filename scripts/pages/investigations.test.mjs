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
    await page.goto(base+'/#/pmcares');
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
