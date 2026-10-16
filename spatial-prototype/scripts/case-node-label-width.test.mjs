import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { validateCaseNodeLabelSizing, validateCaseLabelGeometry } from './case-label-readability.mjs';

const host = path.resolve(process.env.CASE_LABEL_HOST ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const sourceRoot = path.resolve(process.env.CASE_LABEL_SOURCE_ROOT ?? host);
const require = createRequire(path.join(host, 'package.json'));
const { build } = require('esbuild'), postcss = require('postcss');
const cssText = fs.readFileSync(path.join(sourceRoot, 'src/profile-host/workspace.css'), 'utf8');
const css = postcss.parse(cssText);
const result = await build({ entryPoints: [path.join(sourceRoot, 'src/profile-host/node-label-width.ts')], bundle: true, write: false, format: 'cjs', platform: 'node' });
const module = { exports: {} }; new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports);
const { wrapNodeLabels, nodeLabelWidths } = module.exports;

// Anchors and collapsed rectangles below are copied from real Chromium CI at
// head 8a05da5e, scenario 37, Koch initial / selected-node. Natural metrics in
// the synthetic helper tests are inputs, not claimed post-fix browser results.
const kochFrames = [
  { phase: 'initial', x: 690.9677419354839, y: 240.89087701612902, width: 149.046875, gmuHeight: 65.09375, ihsHeight: 50.21875 },
  { phase: 'selected-node', x: 826.4516129032259, y: 361.1328125, width: 20.78125, gmuHeight: 749.34375, ihsHeight: 674.96875 },
];

test('nodes and roles explicitly opt out of position-dependent absolute shrink-to-fit', () => {
  for (const selector of ['.cw-labels .cw-node-label', '.cw-labels .cw-role-label']) {
    const rules = []; css.walkRules(selector, rule => rules.push(rule));
    assert.equal(rules.length, 1, selector);
    assert.deepEqual(rules[0].nodes.map(node => node.toString()), ['width:max-content']);
  }
  const shared = []; css.walkRules('.cw-node-label,.cw-role-label', rule => shared.push(rule));
  assert.equal(shared.length, 1);
  assert.equal(shared[0].nodes.find(node => node.prop === 'max-width')?.value, 'min(13rem,42%)');
  assert.equal(shared[0].nodes.find(node => node.prop === 'overflow-wrap')?.value, 'anywhere');
  assert.equal(shared[0].nodes.find(node => node.prop === 'transform')?.value, 'translate(-50%,-50%)');
});

test('initial and selected Koch anchors retain natural long-label width without changing names or pins', () => {
  for (const frame of kochFrames) {
    const elements = ['George Mason University Foundation [recipient name; identity unresolved]', 'Institute for Humane Studies [recipient name; identity unresolved]'].map((text, index) => ({
      textContent: text,
      dataset: { caseNodeId: index ? 'ihs' : 'gmu', caseLabelX: String(frame.x), caseLabelY: String(frame.y + index * 243.8709677419355) },
      style: { left: `${frame.x}px`, top: `${frame.y + index * 243.8709677419355}px`, maxWidth: '' },
      getBoundingClientRect() { return { width: this.style.maxWidth ? Math.min(182, parseFloat(this.style.maxWidth)) : 182 }; },
    }));
    const before = elements.map(element => ({ text: element.textContent, x: element.dataset.caseLabelX, y: element.dataset.caseLabelY, left: element.style.left, top: element.style.top }));
    for (let count = 0; count < 20; count++) wrapNodeLabels(elements);
    assert.deepEqual(elements.map(element => ({ text: element.textContent, x: element.dataset.caseLabelX, y: element.dataset.caseLabelY, left: element.style.left, top: element.style.top })), before);
    for (const element of elements) {
      assert.equal(element.style.maxWidth, '', frame.phase);
      assert.equal(element.dataset.caseLabelNaturalWidth, '182');
      assert.equal(element.dataset.caseLabelWidth, 'natural');
    }
  }
});

test('position-independent sizing retains natural short names and explicit same-row caps', () => {
  const nodes = [{ id: 'short', x: 690.9677419354839, y: 361, width: 48 }, { id: 'long', x: 826.4516129032259, y: 361, width: 182 }];
  assert.deepEqual([...nodeLabelWidths(nodes).values()], [48, 182]);
  const pair = [{ id: 'a', x: 695.18, y: 361, width: 182 }, { id: 'b', x: 826.45, y: 361, width: 182 }];
  const widths = [...nodeLabelWidths(pair).values()];
  assert.ok(widths.every(width => Math.abs(width - 123.27) < .001));
  assert.ok(Math.abs(pair[1].x - pair[0].x - (widths[0] + widths[1]) / 2 - 8) < .001);
});

function sizingSample({ phase = 'initial', natural = 182, wrapped = false, short = false } = {}) {
  const width = short ? 48 : natural, rendered = wrapped ? 123.27 : width;
  return { phase, labels: [{ id: 'gmu', kind: 'node', rect: { width: rendered }, naturalSizing: {
    measuredNaturalWidth: width, widthMode: wrapped ? 'wrapped' : 'natural',
    probes: [0, 420, 839].map(x => ({ x, width, height: 50.21875 })),
  } }] };
}

test('browser sizing assertion requires real left/center/near-right probes for initial and selected states', () => {
  for (const phase of ['initial', 'selected-node', 'selected-edge']) {
    for (const options of [{}, { wrapped: true }, { short: true }]) {
      const sample = sizingSample({ phase, ...options });
      assert.doesNotThrow(() => validateCaseNodeLabelSizing(sample, { phase }));
    }
    const missing = sizingSample({ phase }); delete missing.labels[0].naturalSizing;
    assert.throws(() => validateCaseNodeLabelSizing(missing, { phase }), /missing node natural-width probes/);
    const collapsed = sizingSample({ phase });
    collapsed.labels[0].naturalSizing.probes[2] = { x: 839, width: 20.78125, height: 749.34375 };
    assert.throws(() => validateCaseNodeLabelSizing(collapsed, { phase }), /position-dependent node natural width/);
    const badRead = sizingSample({ phase }); badRead.labels[0].naturalSizing.measuredNaturalWidth = 20.78125;
    assert.throws(() => validateCaseNodeLabelSizing(badRead, { phase }), /runtime node natural width differs/);
  }
});

test('the measured selected Koch columns still fail the unweakened collision gate', () => {
  const frame = kochFrames[1], names = ['George Mason University Foundation [recipient name; identity unresolved]', 'Institute for Humane Studies [recipient name; identity unresolved]'];
  const labels = ['gmu', 'ihs'].map((id, index) => {
    const height = index ? frame.ihsHeight : frame.gmuHeight, y = frame.y + index * 243.8709677419355;
    const rect = { left: frame.x - frame.width / 2, top: y - height / 2, width: frame.width, height };
    return { id, kind: 'node', text: names[index], selected: false, rect, anchor: { x: frame.x, y },
      visible: true, textOverflow: 'clip', lineClamp: 'none', placement: 'anchored',
      lines: [{ left: rect.left + 1, top: rect.top + 1, width: rect.width - 2, height: rect.height - 2 }] };
  });
  const sample = { width: 840, height: 722.265625, selection: '', labels, leaders: [], expectedNodeIds: ['gmu', 'ihs'], expectedRoleIds: [] };
  const file = { id: 'case:usa-koch', nodes: labels.map(({ id, text: label }) => ({ id, label })), edges: [] };
  assert.throws(() => validateCaseLabelGeometry(sample, file, { phase: 'selected-node' }), /plaque collision or missing 6px gap/);
  assert.throws(() => validateCaseLabelGeometry(sample, file, { phase: 'initial', fit: true }), /required full label clips board/);
});

test('all-19 actual frame gates retain initial/selected coverage and extend settled stability to nodes', () => {
  const harness = fs.readFileSync(path.join(host, 'scripts/case-workspace-browser.mjs'), 'utf8');
  for (const phase of ['initial', 'selected-node', 'selected-edge']) assert.ok(harness.includes(`await assertCaseFrame(page, file, until, result, '${phase}', labelCoverage${phase === 'selected-edge' ? ', async () => {' : ')'}`));
  assert.match(harness, /labelCoverage\.finish\(completedLabelCases\)/);
  const reader = fs.readFileSync(new URL('./case-label-readability.mjs', import.meta.url), 'utf8');
  assert.match(reader, /validateCaseNodeLabelSizing\(sample, options\)/);
  assert.match(reader, /validateCaseNodeLabelSizing\(repeated, options\)/);
  assert.match(reader, /for \(const before of sample.labels\)/);
  assert.match(reader, /probe\.style\.maxWidth = ''/);
  assert.match(reader, /\[0, board.width \/ 2, Math.max\(0, board.width - 1\)\]/);
  assert.match(reader, /finally \{ probe.remove\(\); \}/);
});
