/** Portable geometry/diagnostic contract tests. No browser is launched or claimed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCaseReaderLayout, validateCaseCaptureAlignment, measureCaseReaderLayout, showCaseScene } from './case-workspace-browser.mjs';

const rect = (left, top, width, height) => ({ x: left, y: top, left, top, width, height, right: left + width, bottom: top + height });
function layout(width = 1440, height = 1000, headerHeight = 99) {
  return { workspace: rect(0, 0, width, height), header: rect(0, 0, width, headerHeight),
    scroll: rect(0, headerHeight, width, height - headerHeight), viewport: { width, height },
    controls: [{ rect: rect(12, 12, 140, 44), hit: true }],
    scrollWidth: width - 15, clientWidth: width - 15, scrollHeight: 24000, clientHeight: height - headerHeight,
    scrollTop: 1000, outerScrollTop: 0, overflowY: 'auto', focusable: true, label: 'Complete case evidence and sources' };
}
function capture(width = 1440, height = 1000, headerHeight = 99) {
  const top = headerHeight + 20;
  return { visible: { top: headerHeight, bottom: height, left: 0, right: width }, gap: 20,
    anchor: rect(25, top, width - 50, 18), target: rect(25, top + 30, width - 50, 40), scrollTop: 4000,
    introduction: { claimKindAndNumber: rect(25, top, width - 50, 18), heading: rect(25, top + 30, width - 50, 40), firstAssertion: rect(25, top + 80, width - 50, 140) } };
}

test('reader bounds accept desktop, 320px compact and 640×450 effective viewport snapshots', () => {
  for (const viewport of [[1440, 1000, 99], [320, 844, 202], [640, 450, 160]]) {
    validateCaseReaderLayout(layout(...viewport));
    validateCaseCaptureAlignment(capture(...viewport));
  }
});

test('reader bounds reject header overlap, clipped controls, outer scrolling and inaccessible regions', () => {
  const changes = [
    { scroll: rect(0, 98, 1440, 902) },
    { controls: [{ rect: rect(12, 80, 140, 44), hit: true }] },
    { controls: [{ rect: rect(12, 12, 140, 44), hit: false }] },
    { workspace: rect(0, 0, 1440, 1002) },
    { scroll: rect(0, 99, 1440, 119) },
    { scrollWidth: 1500 }, { outerScrollTop: 1 }, { overflowY: 'hidden' }, { focusable: false }, { label: '' },
  ];
  for (const change of changes) assert.throws(() => validateCaseReaderLayout({ ...layout(), ...change }));
});

test('failed case reader bounds retain the measured sample before throwing', async () => {
  const broken = layout(); broken.scroll.top = 80;
  const result = {}, page = { locator: () => ({ evaluate: async () => broken }) };
  await assert.rejects(measureCaseReaderLayout(page, result, 'header-overlap-fixture'), /header overlaps/);
  assert.equal(result.caseReaderLayoutSamples[0].phase, 'header-overlap-fixture');
  assert.equal(result.caseReaderLayoutSamples[0].scroll.top, 80);
});

test('old h3-only target fails when its preceding claim kind/number crosses the header', () => {
  const sample = capture();
  sample.anchor = rect(25, 86, 1390, 18);
  sample.introduction.claimKindAndNumber = sample.anchor;
  sample.introduction.heading = rect(25, 119, 1390, 20);
  assert.throws(() => validateCaseCaptureAlignment(sample), /outside its unobscured reading band/);
});

test('complete heading and first assertion are required inside the visible capture area', () => {
  for (const name of ['claimKindAndNumber', 'heading', 'firstAssertion']) {
    for (const invalid of [rect(25, 98, 1390, 20), rect(25, 990, 1390, 20), rect(-1, 200, 1390, 20), rect(25, 200, 1420, 20)]) {
      const sample = capture(); sample.introduction[name] = invalid;
      assert.throws(() => validateCaseCaptureAlignment(sample), new RegExp(`Case ${name} is clipped`));
    }
  }
});

test('long source bands can continue below the viewport without weakening claim introduction checks', () => {
  const sample = capture(); sample.introduction = null; sample.anchor.height = 10000; sample.anchor.bottom = sample.anchor.top + 10000;
  validateCaseCaptureAlignment(sample);
  sample.anchor.top = 990;
  assert.throws(() => validateCaseCaptureAlignment(sample), /outside its unobscured reading band/);
});

test('workspace styling only adds scoped scroll targets and an inset keyboard focus outline', async () => {
  const css = await readFile(new URL('../src/profile-host/workspace.css', import.meta.url), 'utf8');
  assert.match(css, /\.cw-rail:focus-visible\s*\{outline-offset:-4px;\}/);
  assert.match(css, /\.cw-rail \.ocd-evidence-content\s*\{scroll-margin-block-start:1\.25rem;\}/);
});

function sceneStub(draws) {
  let requested = false;
  const surface = { getAttribute: async key => key === 'data-case-frame-nodes' ? '3' : String(draws) };
  const control = { click: async () => { requested = true; } };
  const nav = { getByRole: () => control };
  const workspace = { getAttribute: async () => requested ? 'scene' : 'list', locator: () => ({ getByRole: () => nav }) };
  const snapshot = () => ({ viewport: { width: 1440, height: 1000, devicePixelRatio: 1 }, workspace: rect(0, 0, 1440, 1000),
    board: requested ? rect(0, 300, 840, 700) : null, canvas: rect(1, 1, 1438, 998), mode: requested ? 'scene' : 'list', compact: 'false',
    notices: [], counters: { frameNodes: requested ? 3 : 0, sceneDraws: requested ? draws : 0, compositeDraws: requested ? draws : 0 } });
  return { locator: selector => selector === '[data-case-surface]' ? surface : workspace, evaluate: async () => snapshot() };
}

test('scene readiness diagnostics record before/request/ready without replacing physical drawing predicates', async () => {
  const result = {};
  await showCaseScene(sceneStub(1), async predicate => assert.equal(await predicate(), true), result, 'portable-fixture');
  assert.deepEqual(result.caseSceneReadinessSamples.map(row => row.stage), ['before-request', 'after-request', 'ready']);
  assert.equal(result.caseSceneReadinessSamples[0].board, null);
  assert.equal(result.caseSceneReadinessSamples[2].counters.sceneDraws, 1);
});

test('zero-draw scene fails and includes actual geometry and state even without a result sink', async () => {
  await assert.rejects(showCaseScene(sceneStub(0), async predicate => {
    assert.equal(await predicate(), false);
    throw new Error('Physical scene did not draw');
  }), error => {
    assert.match(error.message, /Physical scene did not draw/);
    const samples = JSON.parse(error.message.split('Case scene readiness diagnostics: ')[1]);
    assert.deepEqual(samples.map(row => row.stage), ['before-request', 'after-request', 'failure']);
    assert.equal(samples[2].canvas.left, 1);
    assert.equal(samples[2].board.left, 0);
    assert.equal(samples[2].counters.sceneDraws, 0);
    return true;
  });
});
