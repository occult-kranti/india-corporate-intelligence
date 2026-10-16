/** Additional exact-target source-correction checks; invoked only by the CI browser harness. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const normalized=value=>value.replace(/\s+/gu,' ').trim();
export async function runSourceCorrectionBrowserCases({root,output,scenario,capture,assertFullLoad,assertReaderOnly,until,fullRegistry}) {
  assert.equal(process.env.GITHUB_ACTIONS,'true');
  assert.equal(process.env.SPATIAL_BROWSER_REVIEW,'github-actions');
  const corrections=await Promise.all(['source-corrections.json','source-correction-section182.json'].map(name=>readFile(join(root,'src',name),'utf8').then(JSON.parse)));
  const panel=page=>page.getByRole('complementary',{name:'Evidence reading panel'});
  async function open(page,id,kind) {
    const reader=page.locator('.registry-reader');
    await page.getByRole('textbox',{name:'Search retained records'}).fill(id);
    await reader.getByRole('button',{name:kind==='edge'?/^Relationships /:/^Entities & records /}).click();
    const card=reader.locator(`[data-record-id=${JSON.stringify(id)}]`);
    await card.waitFor();assert.equal(await card.getAttribute('data-held'),'true');await card.click();
    await panel(page).locator('[data-held-warning="true"]').waitFor();
    await until(async()=>Number(await page.locator('.evidence-app').getAttribute('data-factual-items'))===0,'Correction search admitted a factual map item');
    return panel(page);
  }
  async function qualified(page,correction,id) {
    const p=panel(page),text=normalized(await p.innerText());
    assert.ok(text.includes(normalized(correction.summary)));
    assert.ok(text.includes(normalized(correction.interpretationNotice)));
    assert.ok(text.includes(normalized(correction.reason)));
    for(const finding of correction.findings)assert.ok(text.includes(normalized(finding)),finding);
    assert.ok(text.includes(normalized(correction.sourceDateNotice)));
    assert.doesNotMatch(text,/No disclosed political donation anywhere|No non-zero §182|genuine nil OR concealment|₹0 — documented void|ZERO disclosed political donations anywhere/);
    assert.equal(await p.locator(`[data-source-correction=${JSON.stringify(correction.id)}]`).count(),1);
    assert.equal(await p.locator('.relationship-route').count(),0,'A superseded claim must not draw a donor/recipient or statutory relationship');
    assert.ok(text.includes('SUPERSEDED CLAIM / SOURCE REVIEW'));
    assert.equal(await p.getByRole('link',{name:new RegExp(correction.sourceTitle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).getAttribute('href'),correction.sourceUrl);
    assert.equal(await p.locator('details.retained-metadata').getAttribute('open'),null);
    assert.ok((await p.locator('details.retained-metadata summary').innerText()).includes('audit only, not accepted evidence'));
    if(id.startsWith('legacy:record:'))assert.equal(await p.getByRole('button',{name:'Find on felt',exact:true}).isDisabled(),true);
    const follow=page.getByRole('button',{name:'Follow thread',exact:true});
    assert.equal(await follow.isDisabled(),true);
    return p;
  }
  await scenario('27-exact-source-corrections-reader-export-and-holds',{query:'?mode=reading',budgetMs:120000},async(page,result)=>{
    await assertFullLoad(page,result);await assertReaderOnly(page,result);
    for(const correction of corrections) {
      for(const id of correction.targetIds) {
        const kind=id.startsWith('legacy:relationship:')?'edge':'node';
        await open(page,id,kind);const p=await qualified(page,correction,id);
        await capture(page,result,`${correction.id}-${kind}-qualified`);
        if(kind==='node') {
          await p.getByRole('button',{name:'Save this evidence',exact:true}).click();
          await p.locator('.source-card').first().scrollIntoViewIfNeeded();
          await capture(page,result,`${correction.id}-source-update-not-publication`);
        }
        await page.getByRole('button',{name:'Close reading panel',exact:true}).click();
      }
    }
    await open(page,corrections[0].targetIds[1],'node');
    const download=page.waitForEvent('download');
    await panel(page).getByRole('button',{name:'Export casebook with evidence',exact:true}).click();
    const file=join(output,'source-correction-casebook.json');await (await download).saveAs(file);
    const packet=JSON.parse(await readFile(file,'utf8'));
    assert.deepEqual(packet.sourceCorrections,corrections);
    for(const correction of corrections)for(const id of correction.targetIds) {
      const kind=id.startsWith('legacy:relationship:')?'relationships':'records';
      assert.deepEqual(packet[kind].find(row=>row.id===id),fullRegistry[kind].find(row=>row.id===id));
    }
    assert.equal(packet.registryUpdatedAt,fullRegistry.updatedAt);
    assert.equal(Number(await page.locator('.evidence-app').getAttribute('data-held-count')),316);
    await page.getByRole('button',{name:'Close reading panel',exact:true}).click();
    const search=page.getByRole('textbox',{name:'Search retained records'});await search.fill('legacy:entity:adani');
    const reader=page.locator('.registry-reader');await reader.getByRole('button',{name:/^Entities & records /}).click();
    await reader.locator('[data-record-id="legacy:entity:adani"]').click();
    const entityText=await panel(page).innerText();assert.ok(entityText.includes('Denies wrongdoing.'));assert.doesNotMatch(entityText,/ZERO disclosed political donations anywhere|documented void/);
    await capture(page,result,'qualified-entity-preserves-retained-denial');
    await assertReaderOnly(page,result);
    result.notes.push('Two separate correction receipts qualify exactly two original relationships and two mirrored records. All remain readable with unchanged raw objects and explicit sidecars in the JSON packet; no factual selection or funding path is admitted. Source updates are distinguished from unknown publication dates. The retained entity denial and 316-entry original queue survive.');
  });
  await scenario('28-source-corrections-mobile-reading',{query:'?mode=reading',viewport:{width:390,height:844},touch:true,reducedMotion:true,budgetMs:70000},async(page,result)=>{
    await assertFullLoad(page,result);
    for(const correction of corrections) {
      await open(page,correction.targetIds[1],'node');await qualified(page,correction,correction.targetIds[1]);
      const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(dimensions.scroll<=dimensions.width+1);
      const p=panel(page),box=await p.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=391);
      await capture(page,result,`${correction.id}-mobile-qualified`);
      await page.getByRole('button',{name:'Close reading panel',exact:true}).tap();
    }
    await assertReaderOnly(page,result);
  });
  await writeFile(join(output,'source-correction-review-scope.json'),JSON.stringify({corrections:corrections.map(({id,targetIds,reviewReceiptSha256,graphEligible,pathEligible})=>({id,targetIds,reviewReceiptSha256,graphEligible,pathEligible})),rawCanonicalSha256:corrections[0].baselineCanonicalSha256,originalHeldEntries:316},null,2));
}
