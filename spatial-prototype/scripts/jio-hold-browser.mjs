/** Additional CI-only rendered cases. Browser creation belongs solely to the admitted harness. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const normal=text=>text.replace(/\s+/gu,' ').trim();
export async function runJioHoldBrowserCases({root,output,scenario,capture,assertFullLoad,assertReaderOnly,until,fullRegistry}) {
  assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.SPATIAL_BROWSER_REVIEW,'github-actions');
  const entries=JSON.parse(await readFile(join(root,'src/source-correction-jio-holds.json'),'utf8'));
  const dates=JSON.parse(await readFile(join(root,'src/source-citation-jio-dates.json'),'utf8'));
  const tmp=await mkdtemp(join(tmpdir(),'jio-browser-export-'));
  try {
    const outfile=join(tmp,'casebook.mjs');await build({entryPoints:[join(root,'src/casebookWithCorrections.ts')],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
    const {casebookMarkdown}=await import(pathToFileURL(outfile).href);
    const panel=page=>page.getByRole('complementary',{name:'Evidence reading panel'});
    async function open(page,entry,id) {
      const edge=id.includes(':relationship:'),reader=page.locator('.registry-reader');
      await page.getByRole('textbox',{name:'Search retained records'}).fill(id);
      await reader.getByRole('button',{name:edge?/^Relationships /:/^Entities & records /}).click();
      const card=reader.locator(`[data-record-id=${JSON.stringify(id)}]`);await card.waitFor();assert.equal(await card.getAttribute('data-held'),'true');await card.click();
      await until(async()=>await panel(page).locator(`[data-source-correction=${JSON.stringify(entry.id)}]`).count()===1&&normal(await panel(page).locator('.lead-summary').innerText())===normal(entry.summary),'Exact Jio claim did not finish rendering');
      const p=panel(page),text=normal(await p.innerText());
      assert.ok(text.includes(entry.displayTitle));assert.ok(text.includes(normal(entry.interpretationNotice)));assert.ok(text.includes(normal(entry.reason)));assert.doesNotMatch(text,/Adani|Adjust the filters to follow it|Adjust the filters to locate it/);
      assert.equal(await p.locator('[data-held-warning="true"]').count(),1);assert.equal(await p.locator('.relationship-route').count(),0);assert.equal(await page.getByRole('button',{name:'Follow thread',exact:true}).isDisabled(),true);
      if(!edge)assert.equal(await p.getByRole('button',{name:'Find on felt',exact:true}).isDisabled(),true);
      await until(async()=>Number(await page.locator('.evidence-app').getAttribute('data-factual-items'))===0,'Held Jio claim re-entered the factual scene');
      assert.equal(await p.locator('details.retained-metadata').getAttribute('open'),null);
      assert.equal(await p.locator('.source-card').count(),entry.sourceIds.length);
      for(const source of entry.expectedSources){const card=p.locator('.source-card').filter({has:page.locator(`a[href=${JSON.stringify(source.url)}]`)});assert.equal(await card.count(),1);const text=await card.innerText();assert.ok(text.includes(dates.find(row=>row.sourceId===source.id).sourceDateNotice));assert.doesNotMatch(text,/9\.99|9\.98|Jaadhu|parent-brand endpoints/);}
      return p;
    }
    async function transcript(page,entry) {
      await panel(page).getByRole('button',{name:'Read aloud',exact:true}).click();
      const audio=page.locator('.audio-panel');await audio.getByText('Current transcript',{exact:true}).click();const text=normal(await audio.locator('details p').innerText());
      assert.ok(text.includes(normal(entry.summary)));assert.ok(text.includes(normal(entry.interpretationNotice)));assert.doesNotMatch(text,/Evidence tier: documented|Adani/);
      await page.getByRole('button',{name:'Close narration controls',exact:true}).click();
    }
    async function dimensions(page) {const d=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(d.scrollWidth<=d.width+1,'No horizontal document overflow');const p=panel(page),box=await p.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=d.width+1);await p.locator('.source-card').last().scrollIntoViewIfNeeded();assert.ok(await p.locator('.source-card').last().isVisible());await p.locator('.inspector-content').evaluate(el=>el.scrollTo(0,0));}
    await scenario('32-jio-exact-holds-reader-export',{query:'?mode=reading',budgetMs:180000},async(page,result)=>{
      await assertFullLoad(page,result);await assertReaderOnly(page,result);
      for(const entry of entries){
        for(const id of entry.targetIds){const p=await open(page,entry,id);await transcript(page,entry);await dimensions(page);await capture(page,result,`${entry.subjectLabel.toLowerCase()}-${id.includes(':relationship:')?'edge':'record'}-qualified`);if(id.includes(':record:'))await p.getByRole('button',{name:'Save this evidence',exact:true}).click();await page.getByRole('button',{name:'Close reading panel',exact:true}).click();}
        const p=await open(page,entry,entry.targetIds[1]);const download=page.waitForEvent('download');await p.getByRole('button',{name:'Export casebook with evidence',exact:true}).click();const file=join(output,`${entry.subjectLabel.toLowerCase()}-jio-casebook.json`);await(await download).saveAs(file);const packet=JSON.parse(await readFile(file,'utf8'));
        const expectedEntries=entries.slice(0,entries.indexOf(entry)+1);assert.deepEqual(packet.sourceCorrections,expectedEntries);
        for(const expected of expectedEntries){assert.deepEqual(packet.sourceCorrections.find(row=>row.id===expected.id).sourceIds,expected.sourceIds);for(const id of expected.targetIds){const key=id.includes(':relationship:')?'relationships':'records';assert.deepEqual(packet[key].find(row=>row.id===id),fullRegistry[key].find(row=>row.id===id));}}
        const markdown=casebookMarkdown(packet);for(const expected of expectedEntries){assert.ok(markdown.includes(expected.summary));assert.ok(markdown.includes(expected.interpretationNotice));}assert.doesNotMatch(markdown,/Evidence tier: documented/);await writeFile(file.replace(/\.json$/,'.md'),markdown);
        const audit=p.locator('details.retained-metadata');await audit.locator('summary').click();assert.deepEqual(JSON.parse(await audit.locator('pre').innerText()),fullRegistry.records.find(row=>row.id===entry.targetIds[1]));await audit.locator('summary').click();await page.getByRole('button',{name:'Close reading panel',exact:true}).click();
      }
      // Source catalogue is shared by Google and PIF; it must contain dates, never Meta reasons.
      const reader=page.locator('.registry-reader');await page.getByRole('textbox',{name:'Search retained records'}).fill(entries[0].sourceId);await reader.getByRole('button',{name:/^Sources /}).click();const shared=reader.locator(`[data-source-id=${JSON.stringify(entries[0].sourceId)}]`);await shared.waitFor();assert.doesNotMatch(await shared.innerText(),/Jaadhu|9\.99|9\.98|held pending exact identity/);await capture(page,result,'neutral-shared-outlook-citation');
      await assertReaderOnly(page,result);
      // Enter the actual map only after proving reading-only loading. Neither selection may reinsert a mark.
      for(const entry of entries){await open(page,entry,entry.targetIds[0]);await page.getByRole('button',{name:'Reading',exact:true}).click();await page.locator('canvas.maplibregl-canvas').waitFor();await until(async()=>await page.locator('.webgl-host').getAttribute('data-renderer')==='maplibre-three-mercator','Factual map did not finish rendering');const drawn=JSON.parse(await page.locator('.webgl-host').getAttribute('data-rendered-edge-ids'));assert.ok(entry.targetIds.every(id=>!drawn.includes(id)));assert.equal(Number(await page.locator('.webgl-host').getAttribute('data-eligible-threads')),0);assert.equal(await page.locator('.evidence-app.graphics-unavailable').count(),0);assert.equal(Number(await page.locator('.evidence-app').getAttribute('data-factual-items')),0);assert.equal(await panel(page).locator('.relationship-route').count(),0);assert.equal(await page.getByRole('button',{name:'Follow thread',exact:true}).isDisabled(),true);await capture(page,result,`${entry.subjectLabel.toLowerCase()}-map-rejects-held-selection`);await page.getByRole('button',{name:'Reading',exact:true}).click();await page.getByRole('button',{name:'Close reading panel',exact:true}).click();}
      result.notes.push('Both exact Jio ownership interpretations remain reader-only. Meta retains Outlook plus Inc42; Google retains Outlook only. Raw JSON, separate sidecars, qualified Markdown/transcripts, neutral citation dates and actual-map/thread rejection verified; no vehicle identity joins or replacement edges.');
    });
    await scenario('33-jio-exact-holds-mobile',{query:'?mode=reading',viewport:{width:390,height:844},touch:true,reducedMotion:true,budgetMs:120000},async(page,result)=>{
      await assertFullLoad(page,result);assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
      for(const entry of entries)for(const id of entry.targetIds){await open(page,entry,id);await dimensions(page);await transcript(page,entry);await capture(page,result,`${entry.subjectLabel.toLowerCase()}-${id.includes(':relationship:')?'edge':'record'}-mobile`);await page.getByRole('button',{name:'Close reading panel',exact:true}).tap();}
      await assertReaderOnly(page,result);
    });
    await writeFile(join(output,'jio-hold-browser-scope.json'),JSON.stringify({status:(await Promise.all(['32-jio-exact-holds-reader-export','33-jio-exact-holds-mobile'].map(async name=>JSON.parse(await readFile(join(output,name+'.json'),'utf8')).status))).every(status=>status==='passed')?'passed':'failed; inspect individual scenario reports',corrections:entries.map(({id,targetIds,sourceIds,reviewReceiptSha256,recommendationSha256,graphEligible,pathEligible})=>({id,targetIds,sourceIds,reviewReceiptSha256,recommendationSha256,graphEligible,pathEligible})),rawCanonicalSha256:entries[0].baselineCanonicalSha256},null,2));
  } finally {await rm(tmp,{recursive:true,force:true});}
}
