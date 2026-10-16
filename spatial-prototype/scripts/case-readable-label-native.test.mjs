import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const host=path.resolve(process.env.CASE_LABEL_SOURCE_ROOT??path.join(path.dirname(fileURLToPath(import.meta.url)),'..'));
const source=fs.readFileSync(path.join(host,'scripts/case-workspace-browser.mjs'),'utf8');
const case37=source.slice(source.indexOf("await scenario('37-"),source.indexOf("await scenario('38-"));
const case38=source.slice(source.indexOf("await scenario('38-"),source.indexOf("await scenario('39a-"));
test('default all-case coverage still requires actual draws and all 19 exact scene checkpoints',()=>{
 assert.match(case37,/for \(const \[index, file\] of files.entries\(\)\)/);
 for(const phase of ['initial','selected-node','selected-edge'])assert.ok(case37.includes(`result, '${phase}', labelCoverage`));
 assert.match(case37,/labelCoverage.finish\(completedLabelCases\)/);
 assert.match(source,/scene.calls|case-scene-draws/);assert.match(source,/case-composite-draws/);
 assert.match(case37,/case:usa-koch:node:gmu/);assert.match(case37,/case:usa-koch:node:ihs/);
 assert.match(case37,/near-edge label must have an explicit off-view explanation/);
});
test('short-board native case retains the original deadline and records actual fallback geometry without scene credit',()=>{
 assert.match(case38,/budgetMs: 180000/);assert.match(case38,/width: 901, height: 651/);
 assert.match(case38,/shortReport.board.width >= 240 && shortReport.board.height >= 180/);
 assert.match(case38,/\['collision', 'outside-view', 'no-role-placement'\]/);
 assert.match(case38,/outcome: 'complete-reader-fallback', sceneCoverage: false/);
 assert.match(case38,/openClaimSourcesByKeyboard\(page, shortClaim/);
 assert.match(case38,/Removed board focus was not restored inside the workspace/);
 assert.match(case38,/showCaseScene\(page, until, result, 'readable-policy-reentry'\)/);
 assert.match(case38,/assertCaseFrame\(page, shortFile, until, result, 'readable-policy-reentry'\)/);
 assert.match(case38,/Readable-policy retry lost retained selection/);
});
test('existing compact, native source, browser zoom, and workspace-return checks are retained',()=>{
 for(const marker of ['compact-320','effective-640x450','exerciseSourceDialogKeyboard','Browser zoom shortcut pass-through','keyboard Close did not restore its exact opener','Workspace failed to return focus to its atlas launcher'])assert.ok(case38.includes(marker),marker);
});

test('native acceptance requires committed readable policy and retains geometry/scroll/focus stability',()=>{
 assert.match(source,/fit: phase === 'initial', requireReadablePolicy: true/);
 assert.match(case37,/rail-scroll-stability/);assert.match(case37,/Rail scroll changed case board geometry/);assert.match(case37,/Status publication reset evidence rail scroll/);
 assert.match(case38,/Automatic fallback reason is not actually visible/);assert.match(case38,/Automatic fallback stole native source-dialog focus/);assert.match(case38,/automatic-readable-fallback-visible-after-source-close/);
 const reader=fs.readFileSync(path.join(host,'scripts/case-label-readability.mjs'),'utf8');
 for(const marker of ['report publication changed measured board geometry','reserved status geometry changed during publication','publication reset evidence reading position','publication changed focused control'])assert.ok(reader.includes(marker));
 assert.ok(reader.indexOf('(result[samples] ??= []).push')<reader.indexOf('validateCaseLabelSemantics(sample, file, options);',reader.indexOf('async function readCommittedCaseLabels')));
});
