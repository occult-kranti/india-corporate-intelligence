#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

// Independent source-meaning checks. This does not use the view helper as its oracle.
const base=(process.env.INVESTIGATION_BASE_URL??'http://127.0.0.1:5195').replace(/\/$/u,'');
const out=resolve(process.env.METRO_CHALLENGE_ARTIFACTS??'/tmp/metro-challenge-browser');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH??'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
const checks=[],errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(30000);
const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
const reader=page.locator('.atlas-evidence-popover');
async function openRecord(kind,id,query=''){
 await page.goto(`${base}/#/allegations?${query}${query?'&':''}al_selection=${encodeURIComponent(`${kind}:${id}`)}`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(id=>document.querySelector('.atlas-evidence-popover')?.getAttribute('data-selection-id')===id,id);
 return reader.innerText();
}
try {
 let text=await openRecord('record','metro-defence:record:bsf-sharma-result');
 check(/acquitted charge 1|acquittal on charge 1/iu.test(text),'BSF case reader preserves first-charge acquittal');
 check(/charges 2 and 3/iu.test(text)&&/7 October 2025/iu.test(text),'BSF case reader shows exact surviving convictions and later SC date');
 check(/does not assert current custody/iu.test(text),'BSF case reader does not invent current custody');
 text=await openRecord('record','metro-defence:record:bsf-sharma-sc-outcome');
 check(/two weeks to surrender/iu.test(text)&&/does not.*expand the verdict/iu.test(text),'SC outcome reader preserves leave-refusal scope');
 for(const id of ['motorola-named','mobile-communication','smart-cloud','pc-solutions','deloitte-named']){
  text=await openRecord('entity',`metro-delhi-security:entity:${id}`);
  check((await reader.locator('h2').innerText()).includes('legal entity unverified'),`${id}: visible unresolved legal identity label`);
  check(/exact vendor-name mention/iu.test(text)&&/not as a legal company/iu.test(text),`${id}: documentary identity basis visible`);
 }
 text=await openRecord('entity','metro-public-finance:entity:force-one');
 check(/NOT Maharashtra Police.?s Force One unit/iu.test(text),'Food supplier explicitly distinct from police Force One');
 text=await openRecord('record','metro-mumbai-security:record:payroll-case');
 check(/Original bank\/FIR\/court records are absent/iu.test(text),'Reported payroll claim exposes missing primary evidence');
 check(/Arrest and police assertions do not establish guilt/iu.test(text),'Reported payroll claim retains procedural restraint');
 text=await openRecord('record','metro-mumbai-security:record:mpf-finding');
 check(await reader.locator('.atlas-evidence-facts [data-tier]').getAttribute('data-tier')==='reported','Indexed-only CAG observation retains reported tier');
 await reader.getByRole('tab',{name:/Sources/}).click();
 await reader.getByRole('tabpanel').waitFor();
 await reader.getByRole('tabpanel').locator('.atlas-source-row').filter({has:page.locator('a[href*="cag.gov.in"]')}).locator('details summary').click();
 check(/HTTP.?503|HTTP503/iu.test(await reader.innerText()),'CAG source reader discloses failed original retrieval');
 text=await openRecord('record','metro-delhi-security:record:safe-city-response');
 check(/2026-02-16|16 February 2026/iu.test(text),'Safe City delivery response shows corrected 2026 date');
 check(/first-phase inauguration/iu.test(text)&&/not a certified payment ledger/iu.test(text),'Safe City response distinguishes delivery announcement from audited cash');
 text=await openRecord('record','metro-delhi-security:record:safe-city-court-order');
 check(/do not determine individual criminal culpability/iu.test(text),'Safe City court reader limits itself to institutional review');
 await page.goto(`${base}/#/allegations?al_city=delhi&al_topic=funds&al_national=0&al_context=1&al_cq=NCT`,{waitUntil:'domcontentloaded'});
 const context=page.getByRole('complementary',{name:'Budgets and contracts context'});await context.waitFor();
 await page.waitForFunction(()=>document.querySelector('.al-topic-select select')?.value==='funds'&&document.querySelector('#al-context-search')?.value==='NCT');
 check(await context.locator('[data-metro-context="metro-public-finance:record:delhi-budget-context"]').count()===0,'Strict Delhi city view does not silently absorb NCT state budget');
 await page.getByRole('checkbox',{name:'Include state context',exact:true}).click();
 await page.waitForFunction(()=>new URLSearchParams(location.hash.split('?')[1]).get('al_state_context')==='1'&&document.querySelectorAll('.al-context-switches input')[1]?.checked===true);
 const budget=context.locator('[data-metro-context="metro-public-finance:record:delhi-budget-context"]');await budget.waitFor();
 check(/NCT of Delhi statewide context · no city allocation/iu.test(await budget.innerText()),'Explicit state context exposes NCT budget with its accounting perimeter');
 await budget.click();await page.waitForFunction(()=>document.querySelector('.atlas-evidence-popover')?.getAttribute('data-selection-id')==='metro-public-finance:record:delhi-budget-context');
 check(/proposed NCT budget estimate/iu.test(await reader.innerText()),'NCT budget reader retains estimate stage');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900});
  await openRecord('record','metro-public-finance:record:khichdi-case');
  const box=await reader.boundingBox();check(box.x>=0&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=901,`${width}px case reader stays inside viewport`);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}px no horizontal overflow`);
  check(/prima-facie lack of official documents proving underweight packets/iu.test(await reader.innerText()),`${width}px material counterevidence remains in the mobile reader`);
 }
 await page.screenshot({path:resolve(out,'mobile-counterevidence.png')});
 check(errors.length===0,'No runtime exceptions during independent case review');
 writeFileSync(resolve(out,'acceptance.json'),JSON.stringify({base,checks,errors,reviewType:'independent source-meaning and reader checks'},null,2)+'\n');
 console.log(`Independent metro challenge browser: ${checks.length} checks passed; ${out}`);
} finally {await browser.close();}
