#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

// Independent source-meaning tasks. Product helper output is deliberately not the oracle.
const base=(process.env.INVESTIGATION_BASE_URL??'http://127.0.0.1:5197').replace(/\/$/u,'');
const out=resolve(process.env.MONEY_TRAILS_CHALLENGE_ARTIFACTS??'/tmp/money-trails-challenge');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true}),checks=[],errors=[];
page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
const check=(condition,label)=>{assert.ok(condition,label);checks.push(label);};
const popup=page.locator('.atlas-evidence-popover');
const corp='money-trails-corporate',mumbai='money-trails-mumbai',djb='money-trails-djb';
async function open(trail,selection){
 const p=new URLSearchParams({mt_trail:trail});if(selection)p.set('mt_selection',selection);
 await page.goto(`${base}/#/money-trails?${p}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(id=>document.querySelector('[data-money-trails-page]')?.getAttribute('data-money-trail')===id,trail);
 if(selection)await page.waitForFunction(id=>document.querySelector('.atlas-evidence-popover')?.getAttribute('data-selection-id')===id,selection.slice(selection.indexOf(':')+1));
}
const hop=id=>page.locator(`[data-money-hop="${id}"]`);
async function inspectRecord(trail,id){await open(trail,`record:${id}`);return popup.innerText();}
try{
 const response=await fetch(`${base}/index.html`),index=await response.text();check(response.ok,'Frozen/public build index is accessible');
 const indexSha256=createHash('sha256').update(index).digest('hex');
 await open(`${djb}:trail:djb-flowmeter`);
 const release=hop(`${djb}:hop:released`);await release.waitFor();
 check(await release.getAttribute('data-flow-state')==='alleged-transfer','DJB exact released amount remains attributed rather than bank-confirmed');
 check(/24,74,71,376/.test(await release.innerText()),'Exact ECIR-recited release appears without rounding to the award amount');
 check(/agency|allegation/i.test(await release.locator('[data-proof]').innerText()),'Court container does not erase the allegation evidence label');
 const political=hop(`${djb}:hop:political-claim`);
 check(await political.locator('[data-money-amount]').count()===0,'Combined official-and-party pool is not assigned as an AAP payment amount');
 check(/denies|denied/i.test(await political.innerText())&&/unquantified|unallocated/i.test(await political.innerText()),'Political routing step places AAP denial beside the allocation gap');
 let content=await inspectRecord(`${djb}:trail:djb-flowmeter`,`${djb}:record:wife-excluded`);
 check(/Poonam/.test(content)&&/not attached|not under attachment/i.test(content),'Excluded spouse share is explicit in the evidence reader');
 content=await inspectRecord(`${djb}:trail:djb-flowmeter`,`${djb}:record:attachment-outcome`);
 check(/equivalent.value/i.test(content)&&/not.*proof|not.*criminal/i.test(content),'DJB attachment does not become a traced purchase or criminal verdict');

 await open(`${corp}:trail:gvpr-port`);
 const sanction=hop(`${corp}:hop:pfc-sanction`);await sanction.waitFor();
 check(await sanction.getAttribute('data-flow-state')==='commitment','PFC sanction is visibly a commitment rather than paid cash');
 check(/540\.64/.test(await sanction.innerText())&&/undrawn|not drawn|drawal pending/i.test(await sanction.innerText()),'Sanction amount appears with the missing drawdown status');
 check(await page.locator(`[data-money-context="${corp}:hop:port-ownership"]`).count()===1&&await hop(`${corp}:hop:port-ownership`).count()===0,'Port ownership is outside the payment-step reader');
 const infusion=hop(`${corp}:hop:promoter-infusion`);
 check(/79\.48/.test(await infusion.innerText())&&/aggregate|promoters/i.test(await infusion.innerText()),'Promoter contribution retains its aggregate funding perimeter');
 check(/PUBLIC CASH PATH STOPS/.test(await hop(`${corp}:hop:port-cash-stop`).innerText()),'Contract-to-port cash join stops explicitly');
 check(await hop(`${corp}:hop:port-cash-stop`).locator('[data-money-amount]').count()===0,'An absent cash join does not acquire a zero or inferred amount');

 await open(`${corp}:trail:gvpr-bonds`);
 for(const id of ['bond-bjp','bond-aicc']){
  const row=hop(`${corp}:hop:${id}`);check(/₹5\s*crore/.test(await row.innerText()),`${id}: five-crore disclosed redemption shown`);
 }
 check(/identity|CIN|KYC/i.test(await hop(`${corp}:hop:donor-identity-stop`).innerText()),'Donor name is visibly separated from verified legal identity');
 check(/procurement|contract|cash origin/i.test(await hop(`${corp}:hop:donor-cash-stop`).innerText()),'Political giving does not manufacture a procurement-funded cash path');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export complete money-trail evidence packet'}).click();
 const download=await pending,packet=JSON.parse(readFileSync(await download.path(),'utf8'));
 check(packet.hops.some(row=>row.id.endsWith(':donor-identity-stop'))&&packet.hops.some(row=>row.id.endsWith(':donor-cash-stop')),'Export retains both identity and money-source gaps');
 check(packet.sources.some(row=>row.id.includes('eci-purchase-mirror')&&row.tier==='reported')&&packet.sources.some(row=>row.id.includes('eci-redemption-mirror')&&row.tier==='reported'),'Export retains pinned-mirror source limitations and tiers');
 check(!packet.relationships.some(row=>(row.from===`${corp}:entity:gvpr`&&[`${corp}:entity:donor-label`,`${corp}:entity:bjp`,`${corp}:entity:aicc`].includes(row.to))),'Export invents no contractor-to-donor or contractor-to-party transfer');

 const trail=`${mumbai}:trail:mumbai-khichdi-bank-routes`;
 content=await inspectRecord(trail,`${mumbai}:record:attachment-outcome`);
 check(/88\.515|88,51,500/.test(content)&&/attachment/i.test(content),'Mumbai attachment value is named separately from a payment');
 check(/trial concludes|conclusion of trial|pending trial/i.test(content),'Attachment reader preserves the pending criminal-trial boundary');
 content=await inspectRecord(trail,`${mumbai}:record:bail-counter`);
 check(/licen[cs]/i.test(content)&&/underweight/i.test(content)&&/bail/i.test(content),'Earlier bail counterevidence survives the newer tribunal outcome');
 content=await inspectRecord(trail,`${mumbai}:record:tribunal-response`);
 check(/salary/i.test(content)&&/loan/i.test(content)&&/appointment|repayment/i.test(content),'Reader retains the accused explanation and why the tribunal rejected it');

 for(const width of [390,320]){
  await page.setViewportSize({width,height:900});
  await inspectRecord(trail,`${mumbai}:record:bail-counter`);
  const box=await popup.boundingBox();check(box&&box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=901,`${width}px counterevidence popup stays in viewport`);
  check(/underweight/i.test(await popup.innerText()),`${width}px strongest earlier counterevidence remains readable`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px no horizontal page overflow`);
  await page.screenshot({path:resolve(out,`counterevidence-${width}.png`)});
  await open(`${corp}:trail:gvpr-port`);
  await hop(`${corp}:hop:port-cash-stop`).scrollIntoViewIfNeeded();
  check(/Document holder:/.test(await hop(`${corp}:hop:port-cash-stop`).innerText()),`${width}px cash stop names who holds the missing record`);
  await page.screenshot({path:resolve(out,`cash-stop-${width}.png`)});
 }
 check(errors.length===0,'No browser runtime exceptions during source-meaning challenge');
 writeFileSync(resolve(out,'acceptance.json'),JSON.stringify({base,indexSha256,checks,errors,reviewType:'Independent financial-stage, counterevidence, identity-gap and mobile-reader checks'},null,2)+'\n');
 console.log(`Independent money-trails challenge: ${checks.length} checks passed; ${out}`);
}catch(error){await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});writeFileSync(resolve(out,'failure.json'),JSON.stringify({base,checks,errors,failure:String(error)},null,2)+'\n');throw error;}finally{await browser.close();}
