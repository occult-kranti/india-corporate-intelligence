import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const harness = readFileSync(new URL('./case-workspace-browser.mjs', import.meta.url), 'utf8');
test('every exact case frame passes actual full-label geometry after native drawing settles', () => {
  const frame = harness.slice(harness.indexOf('export async function assertCaseFrame'), harness.indexOf('async function geographySnapshot'));
  assert.match(frame, /case-scene-draws/); assert.match(frame, /case-composite-draws/);
  assert.match(frame, /const checkLabels = \(\) => assertCaseLabelReadability\(page, file, result \?\? \{\}, \{ phase, fit: phase === 'initial' \}\)/);
  assert.match(frame, /if \(labelCoverage\) await labelCoverage.observe\(file.id, phase, checkLabels\);\s*else await checkLabels\(\)/);
});
test('dense source access and forced-colors repair have actual native browser assertions and captures', () => {
  assert.match(harness, /\['case:usa-musk', 'case:public-office%2Findia-modi'\]/);
  assert.match(harness, /assertClaimEvidence\(await readEvidenceDOM\(dialog\.locator/);
  assert.match(harness, /selected-edge-after-source-dialog/);
  assert.match(harness, /emulateMedia\(\{ forcedColors: 'active' \}\)/);
  assert.match(harness, /matchMedia\('\(forced-colors: active\)'\)\.matches/);
  assert.match(harness, /selected-edge-forced-colors/);
  assert.match(harness, /await capture\(page, result, `\$\{safeName\(file.id\)\}-selected-labels-forced-colors`\)/);
  assert.match(harness, /emulateMedia\(\{ forcedColors: 'none' \}\)/);
  assert.match(harness, /selected-edge-restored-colors/);
});
