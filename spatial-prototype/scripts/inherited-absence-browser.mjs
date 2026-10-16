/** CI-only rendered review. This module never starts a browser. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const normal=text=>text.replace(/\s+/gu,' ').trim();
export async function runInheritedAbsenceBrowserCases({root,output,scenario,capture,assertFullLoad,assertReaderOnly,until,fullRegistry}) {
  assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.env.SPATIAL_BROWSER_REVIEW,'github-actions');
  const entries=JSON.parse(await readFile(join(root,'src/source-correction-inherited-absence.json'),'utf8'));
  const panel=page=>page.getByRole('complementary',{name:'Evidence reading panel'});
  async function open(page,entry,id){
    const edge=id.startsWith('legacy:relationship:'),held=!entry.graphEligible&&entry.targetIds.includes(id),reader=page.locator('.registry-reader');
    await page.getByRole('textbox',{name:'Search retained records'}).fill(id);
    await reader.getByRole('button',{name:edge?/^Relationships /:/^Entities & records /}).click();
    const card=reader.locator(`[data-record-id=${JSON.stringify(id)}]`);await card.waitFor();assert.equal(await card.getAttribute('data-held'),String(held));await card.click();
    // Exact selected state is required: a still-open previous inspector cannot satisfy readiness.
    await until(async()=>await panel(page).locator(`[data-source-correction=${JSON.stringify(entry.id)}]`).count()===1&&normal(await panel(page).locator('.lead-summary').innerText())===normal(entry.fields[id].summary),'Exact inherited source qualification did not finish rendering');
    const p=panel(page),text=normal(await p.innerText());
    assert.doesNotMatch(text,/ZERO political footprint|paid nothing|winner who didn't pay|gave no donations|Never bought bonds|never bought bonds|₹0 — no footprint/);
    assert.ok(text.includes(normal(entry.interpretationNotice)));assert.equal(await p.locator('[data-held-warning="true"]').count(),held?1:0);
    if(held){assert.equal(await p.locator('.relationship-route').count(),0);assert.equal(await page.getByRole('button',{name:'Follow thread',exact:true}).isDisabled(),true);}
    if(edge&&entry.graphEligible){assert.equal(await p.locator('.relationship-route').count(),1);assert.ok(text.includes('9 November 2020'));assert.ok(!text.includes('now source-correction hold'));}
    assert.equal(await p.locator('details.retained-metadata').getAttribute('open'),null);
    return p;
  }
  await scenario('30-inherited-absence-reader-and-export',{query:'?mode=reading',budgetMs:150000},async(page,result)=>{
    await assertFullLoad(page,result);
    for(const entry of entries)for(const id of [entry.entityPresentationId,...entry.targetIds]){
      const p=await open(page,entry,id);await p.getByRole('button',{name:'Save this evidence',exact:true}).click();await capture(page,result,`${entry.id}-${id.includes(':relationship:')?'relationship':id.includes(':record:')?'record':'entity'}`);await page.getByRole('button',{name:'Close reading panel',exact:true}).click();
    }
    const entry=entries.at(-1);const p=await open(page,entry,entry.entityPresentationId);const download=page.waitForEvent('download');await p.getByRole('button',{name:'Export casebook with evidence',exact:true}).click();
    const file=join(output,'inherited-absence-casebook.json');await(await download).saveAs(file);const packet=JSON.parse(await readFile(file,'utf8'));
    assert.deepEqual(packet.sourceCorrections,entries);
    for(const key of ['entities','relationships','records'])for(const row of packet[key])assert.deepEqual(row,fullRegistry[key].find(original=>original.id===row.id));
    await assertReaderOnly(page,result);result.notes.push('Exact Leap hold, retained Sarda procurement, four qualified entity summaries, preserved raw export rows and four explicit sidecars verified. No new donor/recipient relationship admitted.');
  });
  await scenario('31-inherited-absence-mobile-reading',{query:'?mode=reading',viewport:{width:390,height:844},touch:true,reducedMotion:true,budgetMs:90000},async(page,result)=>{
    await assertFullLoad(page,result);
    for(const entry of entries){const id=entry.targetIds.find(id=>id.startsWith('legacy:record:'))??entry.entityPresentationId;await open(page,entry,id);const box=await panel(page).boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=391);await capture(page,result,`${entry.id}-mobile`);await page.getByRole('button',{name:'Close reading panel',exact:true}).tap();}
    await assertReaderOnly(page,result);
  });
  await writeFile(join(output,'inherited-absence-browser-scope.json'),JSON.stringify({status:'rendered scenarios completed',corrections:entries.map(({id,targetIds,graphEligible,pathEligible,reviewReceiptSha256})=>({id,targetIds,graphEligible,pathEligible,reviewReceiptSha256}))},null,2));
}
