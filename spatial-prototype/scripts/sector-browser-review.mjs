/** Imported only by the existing GitHub Actions browser harness; never launches a browser. */
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const PROJECTION_SHA256 = '83f4f8f016ea0e734095c43c2e1c46b2d1f080747265fef846cccc1f11d85a44';
const BASE_SHA256 = '048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064';
const normal = text => text.replace(/\s+/gu, ' ').trim();
const prompt = page => page.getByTestId('sector-reader-prompt');
const dialog = page => page.getByTestId('sector-reader-dialog');
const opener = page => page.getByTestId('sector-reader-open');
const byAttribute = (locator, attribute, value) => locator.locator(`[${attribute}=${JSON.stringify(value)}]`);
export async function runSectorBrowserCases({ root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, until, report }) {
  assert.equal(process.env.GITHUB_ACTIONS, 'true');
  assert.equal(process.env.SPATIAL_BROWSER_REVIEW, 'github-actions');
  const projectionText = await readFile(join(root, 'src/sector-reader/projection.json'), 'utf8');
  assert.equal(createHash('sha256').update(projectionText).digest('hex'), PROJECTION_SHA256);
  const projection = JSON.parse(projectionText);
  assert.deepEqual([projection.entries.length, projection.sources.length, projection.criticismResponses.length, projection.financialContext.length], [20,18,6,7]);
  const assets = {};
  for (const name of await readdir(join(dist, 'assets'))) {
    if (!name.endsWith('.js.map')) continue;
    const map = JSON.parse(await readFile(join(dist, 'assets', name), 'utf8'));
    for (const [key, file] of Object.entries({ gate:'SectorReaderGate.tsx', panel:'SectorReaderPanel.tsx', payload:'loadSectorReader.ts' })) {
      if (map.sources.some(source => source.endsWith(`/sector-reader/${file}`))) {
        assert.equal(assets[key], undefined, `Duplicate sector ${key} chunk`);
        assets[key] = name.slice(0,-4);
      }
    }
  }
  assert.equal(new Set(Object.values(assets)).size,3, 'Sector prompt, panel and payload must remain three separately deferred chunks');
  const requested = (result, keys) => result.requests.filter(url=>keys.some(key=>new URL(url).pathname.endsWith(`/${assets[key]}`)));
  report.sectorReader = { projectionSha256:PROJECTION_SHA256, baseSha256:BASE_SHA256, counts:{claims:20,sources:18,pairedResponses:6,financialNotes:7}, graphEligible:false,pathEligible:false,assets,coverage:[] };
  const coverage = report.sectorReader.coverage;
  async function probe(context, mode='normal') {
    await context.addInitScript(({ text, baseHash, mode }) => {
      const native = crypto.subtle.digest.bind(crypto.subtle);
      window.__sectorVerification={payloadChecks:0,baseChecks:0,injectedFailures:0,held:false};
      crypto.subtle.digest=async function(algorithm,bytes) {
        const answer=await native(algorithm,bytes);
        const hash=[...new Uint8Array(answer)].map(value=>value.toString(16).padStart(2,'0')).join('');
        if(hash===baseHash)window.__sectorVerification.baseChecks++;
        if(new TextDecoder().decode(bytes)===text) {
          const stats=window.__sectorVerification;stats.payloadChecks++;
          if(mode==='hold-first' && stats.payloadChecks===1) {
            stats.held=true;
            await new Promise(resolve=>{window.__releaseSectorVerification=()=>{stats.held=false;resolve();};});
          }
          if(mode==='fail-first' && stats.payloadChecks===1) {stats.injectedFailures++;return new Uint8Array(32).buffer;}
        }
        return answer;
      };
    },{text:projectionText,baseHash:BASE_SHA256,mode});
  }
  async function baseUnchanged(page,result) {
    await assertFullLoad(page,result);
    assert.equal(await page.locator('.evidence-app').count(),1);
    assert.equal(await page.locator('.historical-review-dialog').count(),0);
  }
  async function focusReturned(page) {
    await dialog(page).waitFor({state:'detached'});
    await until(()=>opener(page).evaluate(element=>document.activeElement===element && element.getClientRects().length>0), 'Sector reader did not return focus to Open');
  }
  async function assertControlContrast(locator) {
    const measurements=[];
    for(const state of ['normal','hover']) {
      if(state==='hover')await locator.hover();
      const measured=await locator.evaluate(element=>{
        const style=getComputedStyle(element);
        const rgb=value=>(value.match(/[\d.]+/g)||[]).map(Number);
        const fg=rgb(style.color),bg=rgb(style.backgroundColor);
        const light=values=>values.slice(0,3).map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
        const a=light(fg),b=light(bg);
        return {foreground:style.color,background:style.backgroundColor,opaque:bg.length===3||bg[3]===1,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),height:element.getBoundingClientRect().height};
      });
      assert.equal(measured.opaque,true,'Sticky/readable controls need an opaque background');
      assert.ok(measured.ratio>=4.5,`Insufficient control text contrast: ${JSON.stringify(measured)}`);
      assert.ok(measured.height>=44,'Reader controls need a 44px touch target');
      measurements.push({state,...measured});
    }
    return measurements;
  }
  async function textContains(locator, values) {
    const actual=normal(await locator.innerText());
    for(const value of values.flat(Infinity)) if(typeof value==='string')assert.ok(actual.includes(normal(value)),`Visible source-qualified text missing: ${value}`);
  }
  function fields(values) { return Object.values(values).flatMap(value=>value===null?['Unknown / not established']:Array.isArray(value)?value:typeof value==='boolean'?[value?'Yes':'No']:[String(value)]); }
  async function checkSource(locator, source) {
    await textContains(locator,[source.id,source.sourceFamily,source.independence,source.sha256,String(source.bytes),...fields(source.dates)]);
    const link=locator.getByRole('link',{name:source.url,exact:true});
    assert.equal(await link.getAttribute('href'),source.url);
    assert.match(source.url,/^https?:\/\//u);
    assert.equal(await link.getAttribute('target'),'_blank');
    assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
  }
  async function captureBands(page,result,locator,name) {
    const dimensions=await locator.evaluate(element=>{
      const container=element.closest('dialog'),outer=container.getBoundingClientRect(),inner=element.getBoundingClientRect();
      return {top:inner.top-outer.top+container.scrollTop-container.clientTop,height:inner.height,viewport:container.clientHeight,maxScroll:container.scrollHeight-container.clientHeight};
    });
    const stride=dimensions.viewport-150;
    assert.ok(stride>200);
    const positions=[];
    for(let offset=0;offset<dimensions.height;offset+=stride)positions.push(Math.min(dimensions.maxScroll,Math.max(0,dimensions.top-65+offset)));
    const unique=[...new Set(positions)];
    assert.ok(unique.length>0 && unique.length<=24,`Unbounded section capture: ${name}`);
    const filenames=[];
    for(const [index,top]of unique.entries()) {
      await dialog(page).evaluate((element,value)=>{element.scrollTop=value;},top);
      const filename=`${result.name}--${name}${index?`--part-${index+1}`:''}--reader.png`;
      await dialog(page).screenshot({path:join(output,filename),timeout:10000});
      result.screenshots.push(filename);filenames.push(filename);
    }
    coverage.push({scenario:result.name,name,...dimensions,stride,positions:unique,filenames});
  }
  await scenario('23-sector-collection-discovery-and-closed-gates',{query:'?mode=reading'},async(page,result)=>{
    await baseUnchanged(page,result);await assertReaderOnly(page,result);
    assert.deepEqual(requested(result,['gate','panel','payload']),[]);
    await page.getByRole('button',{name:'Sources 3,314',exact:true}).click();
    const collections=page.getByRole('region',{name:'Optional source collections'});
    await collections.waitFor();
    const links=collections.getByRole('link');assert.equal(await links.count(),2);
    for(const [index,id]of ['historical-2025','sector-2026-10'].entries()) {
      const url=new URL(await links.nth(index).getAttribute('href'),origin);
      assert.equal(url.pathname,prefix);assert.deepEqual(url.searchParams.getAll('review'),[id]);
      assert.equal(await links.nth(index).getAttribute('target'),'_blank');
    }
    await capture(page,result,'optional-collections-separate-from-original-sources');
    for(const query of ['?mode=reading&review=unknown','?mode=reading&review=sector-2026-10&review=sector-2026-10','?mode=reading&review=sector-2026-10&review=historical-2025','?mode=reading&dataset=preview&review=sector-2026-10']) {
      await page.goto(`${origin}${prefix}${query}`,{waitUntil:'domcontentloaded'});
      await page.getByRole('heading',{name:'The felt atlas',exact:true}).waitFor({timeout:45000});
      assert.equal(await prompt(page).count(),0);assert.equal(await dialog(page).count(),0);
      assert.equal(await page.getByRole('complementary',{name:'Optional historical review'}).count(),0);
    }
    assert.deepEqual(requested(result,['gate','panel','payload']),[]);
    result.notes.push('Two explicit collection links preserve the Pages prefix. Default, unknown, duplicate, mixed and preview queries never fetch a sector prompt, panel or payload. Collection counts remain outside the original 3,314 sources.');
  });
  await scenario('24-sector-all-panels-qualified-sources-and-responses',{query:'?mode=reading&review=sector-2026-10',budgetMs:210000,beforeNavigation:context=>probe(context)},async(page,result)=>{
    await baseUnchanged(page,result);await assertReaderOnly(page,result);await prompt(page).waitFor();
    assert.deepEqual(requested(result,['panel','payload']),[]);assert.equal(await dialog(page).count(),0);
    await opener(page).focus();await page.keyboard.press('Enter');await dialog(page).waitFor();
    const body=dialog(page);assert.equal(await body.locator('[data-sector-claim]').count(),20);
    assert.equal(await body.locator('[data-reader-admission="READER_ADMITTED"][data-public-graph="blocked"][data-public-paths="blocked"]').count(),1);
    await captureBands(page,result,body.locator('.sector-reader-content > header'),'reader-admission-and-limits');
    const beforeURL=page.url();
    const jumps=body.getByRole('navigation',{name:'Source collections'}).getByRole('button');
    assert.equal(await jumps.count(),4);
    result.sectorControlContrast={close:await assertControlContrast(body.getByRole('button',{name:'Close sector reader (Escape)',exact:true})),jump:await assertControlContrast(jumps.first())};
    for(let i=0;i<4;i++){await jumps.nth(i).click();assert.equal(page.url(),beforeURL);assert.equal(await body.isVisible(),true);}
    for(const entry of projection.entries) {
      const claim=byAttribute(body,'data-sector-claim',entry.id);
      assert.equal(normal(await byAttribute(claim,'data-sector-claim-text',entry.id).innerText()),normal(entry.claimText));
      await textContains(claim,[...entry.qualifications,...entry.unresolved,...fields(entry.dates),...entry.moneyStages.flatMap(fields),entry.notEstablished??'',...(entry.payerAttribution?fields(entry.payerAttribution):[])]);
      for(const reference of entry.sources) {
        const citation=byAttribute(claim,'data-sector-source',reference.sourceId).last();
        await textContains(citation,[reference.locator]);
        await checkSource(citation,projection.sources.find(source=>source.id===reference.sourceId));
      }
      for(const pairID of entry.criticismResponseIds) {
        const pair=projection.criticismResponses.find(pair=>pair.id===pairID),rendered=byAttribute(claim,'data-sector-pair',pairID);
        await textContains(rendered,[pair.criticism,pair.response,pair.status,pair.locator]);
        assert.equal(await rendered.evaluate(element=>Boolean(element.querySelector('[data-sector-criticism]').compareDocumentPosition(element.querySelector('[data-sector-response]')) & Node.DOCUMENT_POSITION_FOLLOWING)),true);
      }
      await captureBands(page,result,claim,`claim-${entry.id}`);
    }
    for(const pair of projection.criticismResponses)assert.ok(await byAttribute(body,'data-sector-pair',pair.id).count()>0,`Paired response absent: ${pair.id}`);
    const notes=body.locator('[data-sector-financial-context]');assert.equal(await notes.count(),7);
    for(const [index,note]of projection.financialContext.entries()) {
      const rendered=notes.filter({hasText:note.text});assert.equal(await rendered.count(),1);
      await textContains(rendered,[note.text,note.locator,...(note.additionalSources??[]).map(reference=>reference.locator)]);await captureBands(page,result,rendered,`financial-context-${index+1}`);
    }
    for(const source of projection.sources) {
      const rendered=body.locator('[data-sector-source-collection]').locator(`[data-sector-source=${JSON.stringify(source.id)}]`);
      assert.equal(await rendered.count(),1);await checkSource(rendered,source);
      await captureBands(page,result,rendered,`source-${source.id.replace(/[^a-z0-9-]/giu,'-')}`);
    }
    assert.equal(await body.locator('[data-sector-criticism]').count(),await body.locator('[data-sector-response]').count());
    await baseUnchanged(page,result);
    await page.keyboard.press('Escape');await focusReturned(page);
    const prior=await page.evaluate(()=>window.__sectorVerification.payloadChecks);
    await opener(page).click();await dialog(page).waitFor();
    await until(async()=>await page.evaluate(()=>window.__sectorVerification.payloadChecks)>prior,'Reopen skipped exact projection verification');
    await dialog(page).getByRole('button',{name:'Close sector reader (Escape)',exact:true}).click();await focusReturned(page);
    await baseUnchanged(page,result);await assertReaderOnly(page,result);
    result.sectorVerification=await page.evaluate(()=>window.__sectorVerification);
    result.notes.push('All 20 exact paraphrases, every qualification/date/unresolved limit, all 18 source metadata cards, all six adjacent criticism/response pairs and seven financial notes were checked and captured. Open/reopen verifies pinned bytes. The original atlas counts and reader-only loading remain unchanged.');
  });
  await scenario('25-sector-integrity-failure-and-explicit-retry',{query:'?mode=reading&review=sector-2026-10',beforeNavigation:context=>probe(context,'fail-first')},async(page,result)=>{
    await baseUnchanged(page,result);await opener(page).click();
    await prompt(page).getByRole('alert').waitFor();
    assert.match(await prompt(page).getByRole('alert').innerText(),/SHA-256 mismatch/);
    assert.equal(await dialog(page).count(),0);assert.deepEqual(requested(result,['panel']),[]);
    await capture(page,result,'integrity-failure-retains-base');await baseUnchanged(page,result);
    await prompt(page).getByRole('button',{name:'Retry sector reader',exact:true}).click();await dialog(page).waitFor();
    assert.equal(await dialog(page).locator('[data-sector-claim]').count(),20);
    await captureBands(page,result,dialog(page).locator('.sector-reader-content > header'),'successful-explicit-retry');
    assert.equal(await page.evaluate(()=>window.__sectorVerification.injectedFailures),1);
    await page.keyboard.press('Escape');await focusReturned(page);await baseUnchanged(page,result);
  });
  await scenario('26-sector-mobile-cancellation-navigation-and-focus',{query:'?mode=reading&review=sector-2026-10',viewport:{width:390,height:844},touch:true,reducedMotion:true,budgetMs:110000,beforeNavigation:context=>probe(context,'hold-first')},async(page,result)=>{
    await baseUnchanged(page,result);await opener(page).tap();
    await until(()=>page.evaluate(()=>window.__sectorVerification.held),'Verification hold was not reached');
    await prompt(page).getByRole('button',{name:'Cancel verification',exact:true}).tap();
    await page.evaluate(()=>window.__releaseSectorVerification());
    await until(()=>opener(page).isEnabled(),'Cancellation did not restore Open');
    assert.equal(await dialog(page).count(),0);assert.deepEqual(requested(result,['panel']),[]);
    await opener(page).tap();await dialog(page).waitFor();
    await captureBands(page,result,dialog(page).locator('.sector-reader-content > header'),'mobile-admission-and-limits');
    const overflow=await dialog(page).evaluate(element=>({scroll:element.scrollWidth,client:element.clientWidth,bounds:element.getBoundingClientRect().toJSON()}));
    assert.ok(overflow.scroll<=overflow.client+1,`Mobile reader horizontally overflows: ${JSON.stringify(overflow)}`);
    assert.ok(overflow.bounds.left>=0 && overflow.bounds.right<=390);
    await page.keyboard.press('Tab');assert.equal(await dialog(page).evaluate(element=>element.contains(document.activeElement)),true);
    await page.keyboard.press('Shift+Tab');assert.equal(await dialog(page).evaluate(element=>element.contains(document.activeElement)),true);
    await dialog(page).getByRole('button',{name:'Close sector reader (Escape)',exact:true}).tap();await focusReturned(page);
    await opener(page).tap();await dialog(page).waitFor();
    await page.evaluate(()=>window.dispatchEvent(new PopStateEvent('popstate')));
    await dialog(page).waitFor({state:'detached'});assert.equal(await prompt(page).count(),0);
    await baseUnchanged(page,result);await assertReaderOnly(page,result);
    result.notes.push('Touch Open/Close, delayed-verification cancellation, late-result exclusion, modal focus, 390px reflow and navigation invalidation passed. No persistent opt-in or factual graph additions occurred.');
  });
  await writeFile(join(output,'sector-reader-coverage.json'),JSON.stringify({projectionSha256:PROJECTION_SHA256,coverage},null,2)+'\n');
}
