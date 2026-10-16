/** Portable presentation/measurement contracts. No browser is launched here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';
import { validateCaseChromeSnapshot, captureCaseChromeBaseline, assertCaseChromeActive, assertCaseChromeRestored } from './case-workspace-browser.mjs';

const rect = (x, y, width, height) => ({ x, y, left: x, top: y, width, height, right: x + width, bottom: y + height });
const style = () => ({ display: 'block', visibility: 'visible', opacity: '1' });
const node = (name, bounds = rect(0, 0, 1440, 1000)) => ({ name, connected: true, style: style(), rect: bounds });
function baseline() {
  return { inert: false, ariaHidden: null, rootRetained: true, stageRetained: true, hostRetained: true,
    canvas: { ...node('canvas'), retained: true, buffer: { width: 1440, height: 1000 } },
    providerOpen: true,
    canvasAncestors: ['main.evidence-app', 'div.spatial-stage', 'div.webgl-host', 'div.maplibregl-canvas-container'].map(name => node(name)),
    chrome: ['header.masthead', 'section.room-caption', 'div.scene-overview', 'section.legend', 'nav.bottom-dock', 'div.world-labels'].map(name => node(name)),
    retainedChrome: ['header.masthead', 'section.room-caption', 'div.scene-overview', 'section.legend', 'nav.bottom-dock', 'div.world-labels'].map(name => node(name)),
    credits: [
      { ...node('a', rect(600, 884, 220, 12)), kind: 'city', text: '© OpenStreetMap contributors · ODbL', displayed: true,
        links: [{ text: '© OpenStreetMap contributors · ODbL', href: 'https://www.openstreetmap.org/copyright' }] },
      { ...node('div.maplibregl-ctrl-attrib-inner', rect(1020, 950, 400, 12)), kind: 'provider', text: 'Original provider credits', displayed: true,
        links: [{ text: 'OpenFreeMap', href: 'https://openfreemap.org/' }] },
    ],
    creditControls: [node('button.city-info'), node('summary.maplibregl-ctrl-attrib-button')],
    surface: null, opener: { connected: true, focused: true, reachable: true } };
}
function active() {
  const sample = baseline();
  sample.inert = true; sample.ariaHidden = 'true'; sample.surface = rect(0, 278, 840, 722);
  for (const row of [...sample.chrome, ...sample.retainedChrome]) row.style.visibility = 'hidden';
  sample.credits[0].rect = rect(14, 946, 220, 12); sample.credits[1].rect = rect(20, 974, 400, 12);
  sample.creditControls[0].style.visibility = 'hidden'; sample.creditControls[1].style.display = 'none';
  sample.opener.focused = false; sample.opener.reachable = false;
  return sample;
}

test('only the existing two-attribute modal state hides atlas chrome and geographic labels', async () => {
  const [css, app, world] = await Promise.all([
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/SpatialWorld.tsx', import.meta.url), 'utf8'),
  ]);
  const rules = []; postcss.parse(css).walkRules(rule => { if (rule.selector.includes('.evidence-app[inert]')) rules.push(rule); });
  assert.equal(rules.length, 7, 'The bounded repair should contain only the chrome rule and six credit rules');
  for (const rule of rules) for (const selector of rule.selectors) assert.ok(selector.startsWith('.evidence-app[inert][aria-hidden="true"] '), selector);
  assert.deepEqual(rules[0].selectors, [
    '.evidence-app[inert][aria-hidden="true"] > :not(.spatial-stage):not(.city-attribution)',
    '.evidence-app[inert][aria-hidden="true"] > .spatial-stage > .world-labels',
    '.evidence-app[inert][aria-hidden="true"] > .city-attribution > button',
  ]);
  assert.deepEqual(rules[0].nodes.map(({ prop, value }) => [prop, value]), [['visibility', 'hidden']]);
  for (const rule of rules) assert.doesNotMatch(rule.selector, /(?:canvas|\.spatial-stage|\.webgl-host)\s*$/, 'Do not hide/reposition/resize the shared canvas or its containers');
  assert.match(app, /\{\.\.\.\(caseOpen \? \{ inert: "" \} : \{\}\)\}/);
  assert.match(app, /aria-hidden=\{caseOpen \|\| undefined\}/);
  assert.match(world, /<div className="spatial-stage">\s*<div ref=\{host\} className="webgl-host" \/>/);
});

test('provider attribution is displayed without opening details or exposing inert controls', async () => {
  const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const rules = []; postcss.parse(css).walkRules(rule => { if (rule.selector.startsWith('.evidence-app[inert]')) rules.push(rule); });
  const ruleFor = suffix => rules.find(rule => rule.selector.endsWith(suffix));
  const declarations = rule => Object.fromEntries(rule.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
  assert.deepEqual(declarations(ruleFor('.maplibregl-ctrl-bottom-right')), { left: '14px', right: 'auto', bottom: '8px' });
  assert.deepEqual(declarations(ruleFor('> .city-attribution')), { left: '14px', bottom: '40px', transform: 'none' });
  assert.equal(declarations(ruleFor('.maplibregl-ctrl-attrib'))['max-width'], 'min(440px, calc(50vw - 28px))');
  assert.equal(declarations(ruleFor('.maplibregl-ctrl-attrib::details-content'))['content-visibility'], 'visible');
  assert.equal(declarations(ruleFor('.maplibregl-ctrl-attrib-inner')).display, 'block');
  assert.equal(declarations(ruleFor('.maplibregl-ctrl-attrib-button')).display, 'none');
  for (const rule of rules) for (const declaration of rule.nodes) assert.notEqual(declaration.prop, 'content', 'Never duplicate or replace legal credit text in CSS');
});

test('active and Close snapshots preserve canvas, mounted chrome, credits and restoration', () => {
  validateCaseChromeSnapshot(active(), baseline(), true);
  validateCaseChromeSnapshot(baseline(), baseline(), false);
  const closed = baseline(), displayed = active();
  closed.providerOpen = false; displayed.providerOpen = false; closed.credits[1].displayed = false;
  closed.credits[1].style.display = 'none'; closed.credits[1].rect = rect(0, 0, 0, 0);
  validateCaseChromeSnapshot(displayed, closed, true);
  validateCaseChromeSnapshot(closed, closed, false);
});

test('active contracts reject leaked chrome, replaced/hidden/collapsed/resized canvas and missing DOM', () => {
  const mutations = [
    sample => { sample.inert = false; }, sample => { sample.ariaHidden = null; },
    sample => { sample.rootRetained = false; }, sample => { sample.stageRetained = false; }, sample => { sample.hostRetained = false; },
    sample => { sample.canvas.retained = false; }, sample => { sample.canvas.connected = false; },
    sample => { sample.canvas.rect.width = 0; }, sample => { sample.canvas.rect.x = 1; }, sample => { sample.canvas.buffer.width--; },
    sample => { sample.canvas.style.visibility = 'hidden'; }, sample => { sample.canvasAncestors[0].style.display = 'none'; },
    sample => { sample.canvasAncestors[1].style.opacity = '0'; }, sample => { sample.chrome[1].style.visibility = 'visible'; },
    sample => { sample.retainedChrome[3].connected = false; },
  ];
  for (const mutate of mutations) { const sample = active(); mutate(sample); assert.throws(() => validateCaseChromeSnapshot(sample, baseline(), true)); }
});

test('credits must remain original, displayed inside the transparent board and visually noninteractive', () => {
  const mutations = [
    sample => { sample.providerOpen = false; }, sample => { sample.credits.pop(); }, sample => { sample.credits[0].connected = false; },
    sample => { sample.credits[0].text += ' substituted'; }, sample => { sample.credits[1].links[0].href = 'https://example.com/'; },
    sample => { sample.credits[1].displayed = false; }, sample => { sample.credits[1].rect.width = 0; },
    sample => { sample.credits[0].rect.left = -1; }, sample => { sample.credits[1].rect.right = 841; },
    sample => { sample.credits[0].rect.top = 277; }, sample => { sample.credits[1].rect.bottom = 1000; },
    sample => { sample.creditControls[1].style.display = 'block'; }, sample => { sample.creditControls[0].connected = false; },
  ];
  for (const mutate of mutations) { const sample = active(); mutate(sample); assert.throws(() => validateCaseChromeSnapshot(sample, baseline(), true)); }
});

test('Close rejects changed chrome/credit styles, shifted credits and unreachable or unfocused launcher', () => {
  const mutations = [
    sample => { sample.retainedChrome[0].style.visibility = 'hidden'; }, sample => { sample.credits[0].style.display = 'none'; },
    sample => { sample.credits[1].rect.x--; }, sample => { sample.creditControls[0].style.visibility = 'hidden'; },
    sample => { sample.opener.reachable = false; }, sample => { sample.opener.focused = false; }, sample => { sample.opener.connected = false; },
  ];
  for (const mutate of mutations) { const sample = baseline(); mutate(sample); assert.throws(() => validateCaseChromeSnapshot(sample, baseline(), false)); }
});

test('CI diagnostics retain failed active measurements before throwing', async () => {
  const broken = active(); broken.chrome[2].style.visibility = 'visible';
  const result = {}, retained = { evaluate: async () => broken };
  await assert.rejects(assertCaseChromeActive({}, result, { retained, snapshot: baseline() }, 'visible-status-fixture'), /inactive atlas chrome is still visible/);
  assert.equal(result.caseChromeSamples[0].phase, 'visible-status-fixture');
  assert.equal(result.caseChromeSamples[0].chrome[2].style.visibility, 'visible');
});

test('CI baseline and Close helpers measure retained nodes and trial the restored launcher without activating it', async () => {
  const result = {}, retained = { evaluate: async () => baseline() };
  const captured = await captureCaseChromeBaseline({ evaluateHandle: async () => retained }, result);
  let trial;
  await assertCaseChromeRestored({ getByRole: () => ({ click: async options => { trial = options; } }) }, result, captured);
  assert.deepEqual(trial, { trial: true });
  assert.deepEqual(result.caseChromeSamples.map(row => row.phase), ['before-workspace', 'workspace-closed']);
});

test('actual CI all-case scene path captures baseline, checks active chrome and closes/restores it', async () => {
  const source = await readFile(new URL('./case-workspace-browser.mjs', import.meta.url), 'utf8');
  const scenario = source.split("await scenario('37-all-case-scenes-shared-canvas-exact-selection'")[1].split("await scenario('38-")[0];
  assert.match(scenario, /Native attribution disclosure did not close/);
  assert.match(scenario, /await captureCaseChromeBaseline\(page, result\)/);
  assert.match(scenario, /await assertCaseChromeActive\(page, result, chrome, /);
  assert.match(scenario, /name: 'Close workspace', exact: true/);
  assert.match(scenario, /await assertCaseChromeRestored\(page, result, chrome\)/);
  assert.match(scenario, /await chrome\.retained\.dispose\(\)/);
  assert.match(source, /element\.checkVisibility\(\{ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true \}\)/);
  assert.doesNotMatch(source, /chromium\.launch|launchPersistentContext|from ['"]playwright/);
});
