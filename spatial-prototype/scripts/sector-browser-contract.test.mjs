import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expectedHistoricalReview } from './browser-review-mode.mjs';
const harness=await readFile('scripts/sector-browser-review.mjs','utf8');
const main=await readFile('scripts/browser-review.mjs','utf8');
test('sector browser extension is mandatory in the existing CI harness and cannot launch a local browser',()=>{
  assert.match(main,/await runSectorBrowserCases\(\{ root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, until, report \}\)/);
  assert.match(harness,/assert.equal\(process.env.GITHUB_ACTIONS, 'true'\)/);
  assert.match(harness,/assert.equal\(process.env.SPATIAL_BROWSER_REVIEW, 'github-actions'\)/);
  assert.doesNotMatch(harness,/chromium\.launch|from ['"]playwright/);
  for(const name of ['23-sector-collection-discovery-and-closed-gates','24-sector-all-panels-qualified-sources-and-responses','25-sector-integrity-failure-and-explicit-retry','26-sector-mobile-cancellation-navigation-and-focus'])assert.ok(harness.includes(name));
});
test('sector runtime review pins the independent input and checks all claim/source/response/financial rows',async()=>{
  const bytes=await readFile('src/sector-reader/projection.json');
  const hash=createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash,'83f4f8f016ea0e734095c43c2e1c46b2d1f080747265fef846cccc1f11d85a44');
  assert.ok(harness.includes(hash));
  for(const key of ['entries','sources','criticismResponses','financialContext'])assert.ok(harness.includes(`projection.${key}`));
  assert.match(harness,/sector-reader-coverage\.json/);
  assert.match(harness,/dimensions\.height;offset\+=stride/);
  assert.match(harness,/fail-first/);assert.match(harness,/hold-first/);
  assert.match(harness,/await baseUnchanged\(page,result\)/);
  assert.match(harness,/await assertReaderOnly\(page,result\)/);
});
test('source metadata and panel count assertions preserve graph/path isolation and exact citations',()=>{
  assert.match(harness,/\[20,18,6,7\]/);
  assert.match(harness,/graphEligible:false,pathEligible:false/);
  assert.match(harness,/getAttribute\('href'\),source.url/);
  assert.match(harness,/getAttribute\('rel'\),'noopener noreferrer'/);
  assert.match(harness,/data-public-graph="blocked"/);
  assert.match(harness,/data-public-paths="blocked"/);
});

test('default and explicit browser modes both require historical coverage; every opt-out fails closed',()=>{
  assert.equal(expectedHistoricalReview(undefined),true);
  assert.equal(expectedHistoricalReview('true'),true);
  for(const value of ['false','auto','',null,true,false]) assert.throws(()=>expectedHistoricalReview(value));
  assert.match(main,/import \{ expectedHistoricalReview \} from "\.\/browser-review-mode\.mjs"/);
  assert.match(main,/const expectHistoricalReview = expectedHistoricalReview\(process\.env\.SPATIAL_EXPECT_HISTORICAL_REVIEW\)/);
});
