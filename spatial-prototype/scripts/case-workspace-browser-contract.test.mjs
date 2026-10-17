/** Portable preparation checks only. None of these launch a browser or establish UI behavior. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCaseExpectation, normalizedAdapterSource, ACCEPTED_CASE_TRANSPORT_SHA256, CASE_COUNTS, expectedCaseReaderOrder, tabWithinCaseRailTo } from './case-workspace-browser.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = await readFile(join(root, 'scripts/case-workspace-browser.mjs'), 'utf8');
const workspace = await readFile(join(root, 'src/profile-host/CaseWorkspace.tsx'), 'utf8');
const evidence = await readFile(join(root, 'src/case-scene/CaseSceneEvidence.tsx'), 'utf8');

test('pinned accepted transport, unchanged adapter logic and runtime serialization agree on all 19 cases', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'case-browser-contract-'));
  try {
    const result = await loadCaseExpectation(root, temporary);
    assert.equal(result.reference.transportSha256, ACCEPTED_CASE_TRANSPORT_SHA256);
    assert.deepEqual(result.reference.counts, { cases: 19, claims: 72, nodes: 91, edges: 73, readerOnly: 13 });
    assert.deepEqual(result.reference.counts, CASE_COUNTS);
    assert.equal(result.catalog.cases.length, 19);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('adapter normalization permits exactly a transport import relocation', () => {
  const canonical = "import reviewedTransport from './reviewed-transport.json';\nconst validate = true;\n";
  assert.equal(normalizedAdapterSource(canonical), canonical);
  for (const name of ['runtime-transport', 'runtime-transport.ts'])
    assert.equal(normalizedAdapterSource(canonical.replace('reviewed-transport.json', name)), canonical);
  assert.notEqual(normalizedAdapterSource(canonical.replace('const validate = true', 'const validate = false')), canonical);
  assert.notEqual(normalizedAdapterSource(canonical.replace('reviewed-transport.json', 'unreviewed-transport')), canonical);
});

test('browser execution is guarded and preparation never launches a browser', () => {
  assert.match(script, /assert\.equal\(process\.env\.GITHUB_ACTIONS, 'true'/);
  assert.match(script, /assert\.equal\(process\.env\.SPATIAL_BROWSER_REVIEW, 'github-actions'/);
  assert.doesNotMatch(script, /from ['"]playwright|chromium\.launch|launchPersistentContext|execFile|spawn\(/);
  assert.doesNotMatch(script, /page\.waitForTimeout|setTimeout\(|setInterval\(/);
  assert.match(script, /budgetMs: 240000/);
  assert.doesNotMatch(script, /budgetMs: (?:[3-9]\d{5}|\d{7,})/);
  assert.doesNotMatch(script, /local-integration/);
});

test('CI cases reserve only 36–39 and produce a coverage index with explicit acceptance status', () => {
  const names = [...script.matchAll(/await scenario\('([^']+)'/g)].map(match => match[1]);
  assert.equal(names.length, 8);
  assert.deepEqual(names.map(name => name.split('-')[0]), ['36', '37', '38', '39a', '39b', '39c', '39d', '39e']);
  assert.match(script, /case-workspace-coverage-index\.json/);
  assert.match(script, /browserAcceptancePassed = coverage\.scenarios\.length === 8/);
  assert.match(script, /Portable checks do not prove browser behavior/);
});

test('live selector and source-dialog layout contracts are present in owned UI source', () => {
  for (const name of ['data-case-workspace', 'data-case-id', 'data-case-view', 'data-case-selection', 'data-case-motion', 'data-profile-id',
    'data-case-surface', 'data-case-frame-nodes', 'data-case-frame-roles', 'data-case-node-id', 'data-case-edge-id', 'data-case-source-dialog',
    'data-reader-scroll', 'data-reader-controls']) assert.ok(workspace.includes(name), `UI selector missing: ${name}`);
  for (const name of ['data-claim-id', 'data-reader-only', 'data-edge-id', 'data-node-id', 'data-predicate']) assert.ok(evidence.includes(name));
  assert.ok(workspace.includes('data-reader-scroll="workspace-evidence"'));
  assert.ok(script.includes('[data-reader-scroll="workspace-evidence"]'));
  assert.match(workspace, /window\.innerWidth <= 900 \|\| window\.innerHeight <= 650/);
});

test('evidence checks cover full source closure, hidden qualifiers, claims and source admission', () => {
  for (const name of ['alwaysVisibleQualification', 'mandatoryBoundary', 'capacityAndDirectness', 'directionMeaning', 'reviewedSourceLocator',
    'recursiveDependencyClaimIds', 'nonAdditionGroupIds', 'sourceDateFields', 'originalClaimRecord', 'independentCorroboration', 'researchExportEligible'])
    assert.ok(script.includes(name), `Evidence contract missing: ${name}`);
  assert.match(script, /response\.body\(\)/);
  assert.match(script, /encodedBodySize, row\.bodyBytes/);
  assert.match(script, /new Set\(code\)\.size, code\.length/);
  assert.match(script, /caseCaptureAlignmentSamples/);
  assert.doesNotMatch(script, /\.screenshot\(/, 'All captures should use the parent page-capture helper; locator screenshots can silently reposition the reader');
});

test('claim captures include the kind/number, title and first assertion without changing evidence DOM', () => {
  assert.match(script, /content\.querySelector\(':scope > \.ocd-eyebrow'\)/);
  assert.match(script, /claimKindAndNumber: rect\(anchor\), heading: rect\(element\), firstAssertion: rect\(element\.nextElementSibling\)/);
  assert.match(script, /Math\.max\(s\.top, h\.bottom, 0\)/);
  assert.match(script, /validateCaseCaptureAlignment\(before\)/);
  assert.match(script, /validateCaseCaptureAlignment\(after\)/);
  assert.match(script, /Math\.abs\(after\.scrollTop - before\.scrollTop\) <= 1/);
  assert.match(script, /caseReaderLayoutSamples/);
  assert.match(script, /sample\.header\.bottom <= sample\.scroll\.top \+ 0\.5/);
});

test('CI exercises keyboard source actions after independent case-reader scrolling', () => {
  assert.match(script, /\['top', 0\], \['middle', 0\.5\], \['bottom', 1\]/);
  assert.match(script, /Case reader PageDown lost focus/);
  assert.match(script, /Source summary is not keyboard-reachable from the scrolled case reader/);
  assert.match(script, /await assertActionVisible\(opener, 'claim-source-opener'\)/);
  assert.match(script, /openClaimSourcesByKeyboard\(page, claim, result, phase\)/);
  assert.match(script, /openClaimSourcesByKeyboard\(page, file\.claims\[0\], result, 'compact-first-reader'\)/);
});

test('scene readiness retains physical frame predicates and saves geometry before and after requests and failures', () => {
  for (const stage of ['before-request', 'after-request', 'ready', 'failure']) assert.ok(script.includes(`await record('${stage}')`));
  for (const attribute of ['data-case-frame-nodes', 'data-case-scene-draws', 'data-case-composite-draws'])
    assert.ok(script.includes(`Number(await caseSurface(page).getAttribute('${attribute}')) > 0`));
  for (const field of ['board: rect(board)', 'canvas: rect(canvas)', 'workspace: rect(workspace)', 'caseSceneReadinessSamples', 'Case scene readiness diagnostics:'])
    assert.ok(script.includes(field));
});


test('first-open gate measures full new code/payload bytes and never substitutes mobile hardware claims', () => {
  assert.match(script, /payload\.length, 1, 'Exactly one emitted shared case payload chunk/);
  assert.match(script, /Opening the chooser loaded the shared case payload/);
  assert.match(script, /Compact chooser fetched the shared case payload before selection/);
  assert.match(script, /durationMs <= 5000/);
  assert.match(script, /transferSize: entry\.transferSize/);
  assert.match(script, /encodedBodySize: entry\.encodedBodySize/);
  assert.match(script, /decodedBodySize: entry\.decodedBodySize/);
  assert.match(script, /longTasksSupported/);
  assert.match(script, /PerformanceObserver/);
  assert.match(script, /viewport\/touch emulation is not physical mobile hardware/);
});


test('chooser-chunk failure records the exact abort and verifies dismissal, focus and retained registry', () => {
  assert.match(script, /39e-workspace-chunk-failure-preserves-atlas-and-focus/);
  assert.match(script, /assets\.workspace\.some\(name => name\.endsWith\('\.js'\)/);
  assert.match(script, /result\.expectedFailedRequests\.push\(route\.request\(\)\.url\(\)\)/);
  assert.match(script, /\['close-button', 'escape'\]/);
  assert.match(script, /\['Shift\+Tab', detail\]/);
  assert.match(script, /Failure dialog swallowed modified browser\/system shortcuts/);
  assert.match(script, /registrySnapshot\(\), registry/);
  assert.match(script, /The intentional chooser abort was not observed/);
});


test('native source keyboard acceptance checks exact retained controls in both directions and both dismissal paths', () => {
  for (const marker of ['exerciseSourceDialogKeyboard(page, dialog, result, phase)',
    "await record('reverse-boundary', controls.length - 1)", "await record('forward-boundary', 0)",
    "await record('forward-traversal', index % controls.length)", "await record('reverse-traversal', index)",
    'controls.indexOf(document.activeElement)', 'caseSourceKeyboardControls', 'caseSourceKeyboardSamples',
    'keyboard Close did not restore its exact opener', 'Source Close incorrectly closed the workspace',
    'Source Escape did not restore its exact opener', 'Source Escape incorrectly closed the workspace'])
    assert.ok(script.includes(marker), `Native keyboard acceptance contract missing: ${marker}`);
  assert.match(script, /await page\.keyboard\.press\('Shift\+Tab'\)/);
  assert.match(script, /await page\.keyboard\.press\('Tab'\)/);
  assert.match(script, /await page\.keyboard\.press\('Enter'\)/);
  assert.match(script, /await page\.keyboard\.press\('Escape'\)/);
  assert.match(workspace, /const scope = dialog\.current\?\.open \? dialog\.current : root\.current/);
  assert.doesNotMatch(workspace, /event\.key === 'Tab' && !dialog\.current\?\.open/);
});


test('native non-first selected role and reader-fact coverage keeps exact reader order and both source opener identities', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'case-reader-order-contract-'));
  try {
    const { catalog } = await loadCaseExpectation(root, temporary);
    let selections = 0;
    for (const file of catalog.cases) {
      const original = file.claims.map(claim => claim.claimId);
      assert.deepEqual(expectedCaseReaderOrder(file, ''), original);
      for (const node of file.nodes) assert.deepEqual(expectedCaseReaderOrder(file, node.id), original);
      for (const [selection, claimId] of [...file.edges.map(edge => [edge.id, edge.claimId]), ...file.readerFactIds.map(id => [id, id])]) {
        assert.deepEqual(expectedCaseReaderOrder(file, selection), [claimId, ...original.filter(id => id !== claimId)]); selections++;
      }
      assert.throws(() => expectedCaseReaderOrder(file, 'unknown-exact-id'), /unknown exact selection/);
    }
    assert.equal(selections, 86);
  } finally { await rm(temporary, { recursive: true, force: true }); }
  for (const marker of ['Non-first exact role selection did not arrive', 'Non-first reader-only fact selection did not arrive',
    'exact selected-first reader order and multiplicity', 'same DOM opener did not regain focus', 'caseReorderedSourceChecks',
    "['selected-summary', summary]", "['full-article', caseArticle(page, claim.claimId)]", "['close', 'escape']"])
    assert.ok(script.includes(marker), marker);
});

test('native source traversal has a finite visible-structure bound and real Tab diagnostics without direct target focus', () => {
  const helper = tabWithinCaseRailTo.toString();
  assert.match(helper, /step <= trace\.controls\.length/);
  assert.match(helper, /await page\.keyboard\.press\('Tab'\)/);
  assert.match(helper, /current\.inRail && current\.connected/);
  assert.match(helper, /!seen\.has\(current\.focusedIndex\)/);
  assert.match(helper, /caseRailTabTraversals/);
  assert.match(helper, /parent\.tagName === 'DETAILS' && !parent\.open/);
  assert.doesNotMatch(helper, /\.focus\(|\.click\(|dispatchEvent|scrollIntoView|scrollTop\s*=/);
  assert.doesNotMatch(script, /step < 4 && !await summary/);
});

test('native node test opens the exact disclosure ordinarily before clicking visible node, including Enter and Space paths', () => {
  for (const marker of ['await openCaseNodeIndex(page, file)', 'await summary.click()',
    'Exact node control must be visible before ordinary selection', 'await exactNodeButton.click()',
    "[['Enter', true], ['Space', false], ['Space', true]]", 'Closed node controls entered native tab traversal',
    'Expanded node control is not natively reachable', 'Node identity inspection did not restore disclosure state'])
    assert.ok(script.includes(marker), marker);
  assert.doesNotMatch(script, /force:\s*true|setAttribute\(['"]open/);
});

test('portable traversal mechanics reach the fifteenth stop and reject no-op, escape, hidden-stop and unreachable routes with traces', async () => {
  // A deterministic helper unit test, not a browser receipt or native-focus proof.
  const savedDocument=globalThis.document,savedStyle=globalThis.getComputedStyle;
  async function run(mode) {
    const rail={tagName:'DIV',textContent:'Rail',getAttribute:()=>null,contains:item=>item===rail||controls.includes(item)},controls=Array.from({length:16},(_,index)=>({
      tagName:'BUTTON',textContent:`Control ${index+1}`,tabIndex:0,isConnected:true,parentElement:rail,
      matches:()=>false,closest:()=>null,getClientRects:()=>[{}],getAttribute:()=>null,
    }));
    rail.querySelectorAll=()=>controls;
    globalThis.document={activeElement:rail};
    globalThis.getComputedStyle=()=>({visibility:'visible',display:'block'});
    let position=-1,disposed=false;const keys=[];
    const retained={evaluate:async fn=>fn({rail,controls}),dispose:async()=>{disposed=true;}};
    const page={locator:()=>({evaluateHandle:async fn=>{assert.deepEqual(fn(rail),{rail,controls});return retained;}}),keyboard:{press:async key=>{
      keys.push(key);position++;
      document.activeElement=mode==='no-op'?rail:mode==='escape'?{getAttribute:()=>null}:mode==='hidden'?{parentElement:rail,getAttribute:()=>null}:controls[position];
      if(mode==='hidden')rail.contains=item=>item===document.activeElement||item===rail||controls.includes(item);
    }}};
    const target=mode==='unreachable'?{}:controls[14],result={};
    try {
      if(mode==='success'){
        const trace=await tabWithinCaseRailTo(page,{evaluate:async fn=>fn(target)},result,mode);
        assert.equal(trace.steps.length,16);assert.equal(keys.length,15);assert.equal(trace.steps.at(-1).focusedIndex,14);
      }else await assert.rejects(()=>tabWithinCaseRailTo(page,{evaluate:async fn=>fn(target)},result,mode),/Real Tab|not keyboard-reachable/);
      assert.ok(keys.length<=controls.length);assert.ok(keys.every(key=>key==='Tab'));
      assert.equal(result.caseRailTabTraversals.length,1);assert.ok(result.caseRailTabTraversals[0].steps.length>=2);
    } finally {assert.equal(disposed,true);}
  }
  try {for(const mode of ['success','no-op','escape','hidden','unreachable'])await run(mode);}
  finally {if(savedDocument===undefined)delete globalThis.document;else globalThis.document=savedDocument;if(savedStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=savedStyle;}
});
