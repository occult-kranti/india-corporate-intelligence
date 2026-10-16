import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
const host = path.resolve(process.env.CASE_LABEL_HOST ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const sourceRoot = path.resolve(process.env.CASE_LABEL_SOURCE_ROOT ?? host);
const require = createRequire(path.join(host, 'package.json')), { build } = require('esbuild');
async function load(name) {
  const result = await build({ entryPoints: [path.join(sourceRoot, 'src/profile-host', name)], bundle: true, write: false, format: 'cjs', platform: 'node' });
  const module = { exports: {} }; new Function('module', 'exports', result.outputFiles[0].text)(module, module.exports); return module.exports;
}
const { nodeLabelWidths } = await load('node-label-width.ts');
const { placeRoleLabels, labelsIntersect } = await load('role-label-layout.ts');
const { validateCaseLabelGeometry } = await import('./case-label-readability.mjs');

test('Musk and Modi same-row pairs receive bounded wrapping with an 8px screen-space gap', () => {
  for (const separation of [131.27, 153.6, 184]) {
    const nodes = [{ id: 'a', x: 300, y: 240, width: 208 }, { id: 'b', x: 300 + separation, y: 240, width: 208 }];
    const before = structuredClone(nodes), widths = nodeLabelWidths(nodes), a = widths.get('a'), b = widths.get('b');
    assert.ok(Math.abs(separation - (a + b) / 2 - 8) < .001); assert.deepEqual(nodes, before);
  }
});
test('unrelated rows retain the original natural width; isolated long Slim/Potanin labels are not globally shrunk', () => {
  const nodes = [{ id: 'a', x: 300, y: 240, width: 208 }, { id: 'b', x: 300, y: 360, width: 208 }];
  assert.deepEqual([...nodeLabelWidths(nodes).values()], [208, 208]);
  const slim = [{ id: 'long', x: 210, y: 280, width: 182 }, { id: 'short', x: 350, y: 280, width: 80 }];
  assert.deepEqual([...nodeLabelWidths(slim).values()], [182, 80]);
  const potanin = [{ id: 'long', x: 175, y: 120, width: 182 }, { id: 'short', x: 338, y: 120, width: 70 }];
  assert.deepEqual([...nodeLabelWidths(potanin).values()], [182, 70]);
});
test('selected Musk relation moves clear of wrapped nodes with its full text and unchanged midpoint retained', () => {
  const nodes = [{ left: 280, top: 280, width: 115, height: 32 }, { left: 411, top: 270, width: 123, height: 52 }, { left: 542, top: 265, width: 123, height: 62 }];
  const roles = [{ id: 'selected-source-edge', x: 411, y: 310, width: 184, height: 48, selected: true }];
  const before = structuredClone({ nodes, roles }), result = placeRoleLabels(nodes, roles, 840, 722);
  assert.equal(result.length, 1); assert.equal(result[0].id, roles[0].id); assert.equal(result[0].x, roles[0].x); assert.equal(result[0].y, roles[0].y);
  assert.equal(result[0].unresolved, false); assert.equal(result[0].displaced, true);
  assert.ok(nodes.every(rect => !labelsIntersect(result[0], rect))); assert.deepEqual({ nodes, roles }, before);
  assert.deepEqual(placeRoleLabels(nodes, roles, 840, 722), result);
});
test('multiple role plaques are deterministic, in source order, non-overlapping and contained', () => {
  const nodes = [{ left: 300, top: 300, width: 100, height: 60 }];
  const roles = Array.from({ length: 12 }, (_, index) => ({ id: `role-${index}`, x: 350, y: 330, width: 120, height: 32, selected: index === 10 }));
  const result = placeRoleLabels(nodes, roles, 840, 722);
  assert.deepEqual(result.map(item => item.id), roles.map(item => item.id));
  for (const [index, role] of result.entries()) {
    assert.equal(role.unresolved, false); assert.ok(role.left >= 4 && role.top >= 4 && role.left + role.width <= 836 && role.top + role.height <= 718);
    for (const other of [...nodes, ...result.slice(0, index)]) assert.ok(!labelsIntersect(role, other));
  }
});
test('unsatisfiable role placement is reported and retains the role rather than silently hiding or truncating it', () => {
  const role = { id: 'must-remain', x: 10, y: 10, width: 80, height: 40, selected: true };
  const [result] = placeRoleLabels([], [role], 20, 20);
  assert.equal(result.id, role.id); assert.equal(result.unresolved, true); assert.equal(result.displaced, false);
});
function sample({ collide = false, textClips = false, partial = false } = {}) {
  const labels = ['a', 'b'].map((id, index) => {
    const left = index ? collide ? 100 : 208 : partial ? -10 : 10, top = 40, width = 100, height = 40;
    return { id, kind: 'node', text: id.toUpperCase(), selected: false, rect: { left, top, width, height },
      anchor: { x: left + width / 2, y: top + height / 2 }, lines: [{ left: left + 5, top: top + 5, width: textClips ? 105 : 90, height: 20 }],
      visible: true, textOverflow: 'clip', lineClamp: 'none', placement: 'anchored' };
  });
  return { width: 400, height: 300, selection: '', labels, leaders: [], expectedNodeIds: ['a', 'b'], expectedRoleIds: [] };
}
const file = { id: 'test', nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], edges: [] };
test('actual-browser assertion catches plaque collisions, missing full labels and escaping text lines', () => {
  assert.equal(validateCaseLabelGeometry(sample(), file, { fit: true }).nodes, 2);
  assert.throws(() => validateCaseLabelGeometry(sample({ collide: true }), file, { fit: true }), /plaque collision/);
  assert.throws(() => validateCaseLabelGeometry(sample({ textClips: true }), file, { fit: true }), /text line escapes/);
  const absent = sample(); absent.labels.pop(); assert.throws(() => validateCaseLabelGeometry(absent, file, { fit: true }), /visible frame contract|every exact node/);
});
test('all-fit clipping fails; deliberate partial-camera clipping is recorded separately, not presented as full fit', () => {
  assert.throws(() => validateCaseLabelGeometry(sample({ partial: true }), file, { fit: true }), /clips board/);
  assert.deepEqual(validateCaseLabelGeometry(sample({ partial: true }), file).clippedNonselectedIds, ['a']);
});
test('full-label runtime bindings and production helper size remain bounded', async () => {
  const source = fs.readFileSync(path.join(sourceRoot, 'src/profile-host/CaseWorkspace.tsx'), 'utf8');
  assert.match(source, /observeReadableCaseLabels\(labels.current, \{/);
  assert.match(source, /\{node.label\}/); assert.match(source, /\{role.label\}/); assert.match(source, /data-case-label-leader=\{role.id\}/);
  const outputs = [];
  for (const entry of ['node-label-width.ts', 'role-label-layout.ts']) {
    const result = await build({ entryPoints: [path.join(sourceRoot, 'src/profile-host', entry)], bundle: true, minify: true, write: false, format: 'esm', platform: 'browser' });
    outputs.push({ entry, bytes: result.outputFiles[0].contents.length, gzipBytes: gzipSync(result.outputFiles[0].contents).length });
  }
  assert.ok(outputs.reduce((sum, item) => sum + item.gzipBytes, 0) < 3500);
  assert.equal(outputs.length, 2);
  const policy = await build({ entryPoints: [path.join(sourceRoot, 'src/profile-host/readable-label-layout.ts')], bundle: true, minify: true, write: false, format: 'esm', platform: 'browser' });
  assert.ok(gzipSync(policy.outputFiles[0].contents).length < 3000, 'Readable policy including existing bounded helpers exceeds its separate 3KB gzip budget');
});

test('PostCSS preserves the original forced-colors component selectors/declarations', () => {
  const postcss = require('postcss');
  const original = '@media(forced-colors:active) {.cw-header,.cw-scene-band,.cw-rail,.cw-case-list li,.cw-source-dialog,.cw-source-band,.cw-node-label,.cw-role-label {background:Canvas;color:CanvasText;border:1px solid CanvasText;}.cw-workspace :focus-visible {outline-color:Highlight;}}';
  const staged = fs.readFileSync(path.join(sourceRoot, 'src/profile-host/workspace.css'), 'utf8');
  const tree = postcss.parse(staged), expected = postcss.parse(original);
  const originalRules = []; expected.walkRules(rule => originalRules.push({ selector: rule.selector, declarations: rule.nodes.map(node => node.toString()) }));
  const retained = []; tree.walkAtRules('media', media => {
    if (media.params !== '(forced-colors:active)') return;
    media.walkRules(rule => { if (!rule.selector.startsWith('.cw-label-leaders')) retained.push({ selector: rule.selector, declarations: rule.nodes.map(node => node.toString()) }); });
  });
  assert.deepEqual(retained, originalRules);
  assert.ok(staged.includes(original), 'original forced-colors block must remain byte-equivalent');
  const leaderRules = []; tree.walkRules(rule => { if (rule.selector.startsWith('.cw-label-leaders')) leaderRules.push(rule); });
  assert.equal(leaderRules.length, 3);
  assert.deepEqual(leaderRules.filter(rule => rule.parent.type === 'atrule').map(rule => ({ selector: rule.selector, declarations: rule.nodes.map(node => node.toString()) })), [{ selector: '.cw-label-leaders line', declarations: ['stroke:CanvasText'] }]);
});

test('real all-19 case renderer projections retain full names and same-row wrapping gaps without changing source/model state', async () => {
  const { load: loadScene } = await import(path.join(host, 'scripts/case-unit/scene-tests/test-tools.mjs'));
  const { makeGL, makeRenderer } = await import(path.join(host, 'scripts/case-unit/scene-tests/mock-gl.mjs'));
  const { getCaseCatalog } = await loadScene('catalog-bridge.ts');
  const { CaseSceneLayer } = await loadScene('CaseSceneLayer.ts');
  const { CaseController } = await loadScene('controller.ts');
  const reports = [];
  for (const file of getCaseCatalog().cases) {
    const before = JSON.stringify(file), gl = makeGL(), renderer = makeRenderer(gl), controller = new CaseController(file, true);
    renderer.domElement.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1440, height: 1000 });
    let frame; const failures = [];
    const layer = new CaseSceneLayer(file, renderer, { hostResetsThreeAtEveryBoundary: true, onSharedRendererFailure: reason => failures.push(reason),
      rect: () => ({ x: 0, y: 278, width: 840, height: 722 }), onFailure: reason => failures.push(reason), onFrame: next => { frame = next; } });
    layer.onAdd({ version: '6.13.0', getCanvas: () => renderer.domElement, triggerRepaint() {} }, gl); layer.setState(controller.state, 0); layer.prerender(gl); await Promise.resolve();
    assert.deepEqual(failures, []); assert.equal(frame.nodes.filter(node => node.visible).length, file.nodes.length, file.id);
    assert.deepEqual(frame.nodes.map(node => node.label), file.nodes.map(node => node.label));
    const widths = nodeLabelWidths(frame.nodes.map(node => ({ ...node, width: 208 })));
    const rows = frame.nodes.map(node => ({ ...node, cap: widths.get(node.id) }));
    for (let index = 0; index < rows.length; index++) for (const other of rows.slice(index + 1)) {
      const node = rows[index]; if (Math.abs(node.y - other.y) > .5 || Math.abs(node.x - other.x) < .5) continue;
      assert.ok(Math.abs(node.x - other.x) - (node.cap + other.cap) / 2 >= 8 - .001, file.id);
    }
    assert.equal(JSON.stringify(file), before); reports.push({ caseId: file.id, nodes: rows.map(({ id, label, x, y, cap }) => ({ id, label, x, y, cap })) }); layer.dispose();
  }
  assert.equal(reports.length, 19);
  assert.ok(reports.every(report => report.nodes.length));
});

test('role max-content width is position-independent, including near-edge absolute positioning', () => {
  const postcss = require('postcss');
  const css = postcss.parse(fs.readFileSync(path.join(sourceRoot, 'src/profile-host/workspace.css'), 'utf8'));
  const entries = []; css.walkRules('.cw-labels .cw-role-label', rule => entries.push(rule));
  assert.equal(entries.length, 1); assert.deepEqual(entries[0].nodes.map(node => node.toString()), ['width:max-content']);
  const [nearEdge] = placeRoleLabels([], [{ id: 'edge', x: 835, y: 400, width: 184, height: 48, selected: true }], 840, 722);
  assert.equal(nearEdge.unresolved, false); assert.equal(nearEdge.width, 184); assert.equal(nearEdge.left + nearEdge.width, 836);
});

test('DOM observer repeats deterministically, preserves anchors, disconnects and ignores already queued callbacks after cleanup', async () => {
  const { observeRoleLabels } = await load('role-label-layout.ts');
  let callback, disconnected = false, reads = 0, writes = 0; const observed = [];
  const line = { dataset: { caseLabelLeader: 'r' }, style: {}, attrs: {}, setAttribute(name, value) { this.attrs[name] = value; writes++; } };
  const node = { dataset: { caseNodeId: 'node', caseLabelX: '776', caseLabelY: '400' }, style: {}, getBoundingClientRect() { reads++; return { left: 720, top: 370, width: 112, height: 60 }; } };
  const role = { dataset: { caseEdgeId: 'r', caseLabelX: '835', caseLabelY: '400', selected: 'true' }, style: { left: '835px', top: '400px' },
    getBoundingClientRect() { reads++; return { left: parseFloat(this.style.left) - 92, top: parseFloat(this.style.top) - 24, width: 184, height: 48 }; } };
  const root = { dataset: {}, isConnected: true, getBoundingClientRect() { reads++; return { left: 0, top: 0, width: 840, height: 722 }; },
    querySelectorAll(selector) { return selector === '.cw-node-label' ? [node] : selector === '.cw-role-label' ? [role] : [line]; },
    ownerDocument: { querySelectorAll() { return []; }, defaultView: { ResizeObserver: class { constructor(fn) { callback = fn; } observe(element) { observed.push(element); } disconnect() { disconnected = true; } } } } };
  const cleanup = observeRoleLabels(root), first = { ...role.style }, anchor = { x: role.dataset.caseLabelX, y: role.dataset.caseLabelY };
  assert.equal(root.dataset.caseLabelUnresolved, '0'); assert.equal(role.dataset.caseLabelPlacement, 'displaced'); assert.equal(line.style.visibility, 'visible');
  assert.deepEqual(observed, [root, node, role]);
  for (let index = 0; index < 20; index++) callback();
  assert.deepEqual(role.style, first); assert.deepEqual({ x: role.dataset.caseLabelX, y: role.dataset.caseLabelY }, anchor);
  cleanup(); assert.equal(disconnected, true); const counts = [reads, writes]; callback(); assert.deepEqual([reads, writes], counts);
});

test('visible provider credit obstacles remain clear and the CI assertion detects any occlusion', () => {
  const credit = { left: 8, top: 672, width: 180, height: 20 };
  const role = { id: 'role-near-credit', x: 100, y: 680, width: 160, height: 35, selected: true };
  const [placed] = placeRoleLabels([credit], [role], 840, 722);
  assert.equal(placed.unresolved, false); assert.ok(!labelsIntersect(placed, credit));
  const measured = sample(); measured.credits = [{ text: '© OpenStreetMap contributors · ODbL', rect: measured.labels[0].rect }];
  assert.throws(() => validateCaseLabelGeometry(measured, file), /obscures provider\/ODbL credit/);
});

test('selected role and both exact endpoints are mandatory even if frame metadata is accidentally incomplete', () => {
  const selectedFile = { ...file, edges: [{ id: 'r', from: 'a', to: 'b', role: 'reviewed relation' }] };
  const selected = sample(); selected.selection = 'r'; selected.expectedRoleIds = ['r'];
  assert.throws(() => validateCaseLabelGeometry(selected, selectedFile), /emitted role IDs/);
  selected.labels.push({ id: 'r', kind: 'role', text: 'reviewed relation', selected: true, rect: { left: 10, top: 150, width: 150, height: 30 },
    anchor: { x: 85, y: 165 }, lines: [{ left: 15, top: 155, width: 140, height: 20 }], visible: true, textOverflow: 'clip', lineClamp: 'none', placement: 'anchored' });
  validateCaseLabelGeometry(selected, selectedFile);
  selected.labels = selected.labels.filter(label => label.id !== 'b'); selected.expectedNodeIds = ['a'];
  assert.throws(() => validateCaseLabelGeometry(selected, selectedFile), /selected role\/node\/endpoint missing/);
});

test('measured node wrapping restores natural widths before every pass and never creeps narrower', async () => {
  const { observeNodeLabels } = await load('node-label-width.ts');
  let callback, fontCallback, disconnected = false, fontDetached = false;
  const specs = [{ id: 'a', x: 300, width: 182 }, { id: 'b', x: 431, width: 182 }];
  const elements = specs.map(node => ({
    style: { maxWidth: '' }, dataset: { caseNodeId: node.id, caseLabelX: String(node.x), caseLabelY: '200' },
    getBoundingClientRect() { return { width: Math.min(node.width, parseFloat(this.style.maxWidth) || Infinity) }; },
  }));
  const root = { isConnected: true, querySelectorAll() { return elements; }, ownerDocument: { fonts: { addEventListener(name, fn) { assert.equal(name, 'loadingdone'); fontCallback = fn; }, removeEventListener(name, fn) { fontDetached = name === 'loadingdone' && fn === fontCallback; } }, defaultView: {
    ResizeObserver: class { constructor(fn) { callback = fn; } observe() {} disconnect() { disconnected = true; } },
  } } };
  const cleanup = observeNodeLabels(root); const first = elements.map(element => element.style.maxWidth);
  assert.deepEqual(first, ['123px', '123px']);
  for (let index = 0; index < 20; index++) callback();
  assert.deepEqual(elements.map(element => element.style.maxWidth), first);
  assert.deepEqual(elements.map(element => element.dataset.caseLabelNaturalWidth), ['182', '182']);
  specs[0].width = 220; specs[1].width = 80; fontCallback();
  assert.deepEqual(elements.map(element => element.style.maxWidth), ['166px', '']);
  assert.deepEqual(elements.map(element => element.dataset.caseLabelNaturalWidth), ['220', '80']);
  cleanup(); assert.ok(disconnected && fontDetached); elements[0].style.maxWidth = '42px'; callback(); fontCallback(); assert.equal(elements[0].style.maxWidth, '42px');
});
