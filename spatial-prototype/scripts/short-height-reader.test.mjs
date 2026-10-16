import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import postcss from 'postcss';

const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const root = postcss.parse(css);
const query = '(min-width: 660px) and (max-width: 800px) and (max-height: 600px)';
const band = root.nodes.find(node => node.type === 'atrule' && node.name === 'media' && node.params === query);
const declarations = selector => Object.fromEntries(band.nodes
  .filter(node => node.type === 'rule' && node.selectors.includes(selector))
  .flatMap(node => node.nodes.filter(child => child.type === 'decl').map(child => [child.prop, child.value])));
const globalDeclarations = selector => Object.fromEntries(root.nodes
  .filter(node => node.type === 'rule' && node.selectors.includes(selector))
  .flatMap(node => node.nodes.filter(child => child.type === 'decl').map(child => [child.prop, child.value])));

// These are portable CSS/source contract checks. Actual font wrapping, complete
// paragraph visibility, focus and hit testing remain mandatory browser-CI gates.
test('short landscape reader is isolated from phones, tall views and closed-reader layouts', () => {
  assert.ok(band, 'The bounded short-height media rule must exist');
  for (const node of band.nodes.filter(node => node.type === 'rule')) {
    for (const selector of node.selectors) assert.match(selector, /^\.reader-open(?:\s|$)/);
    for (const declaration of node.nodes.filter(child => child.type === 'decl')) {
      assert.ok(!['font-size', 'line-height', 'bottom', 'right', 'overflow', 'visibility'].includes(declaration.prop), `Preserve ${declaration.prop}`);
      if (declaration.prop === 'display') assert.notEqual(declaration.value, 'none', `Do not hide ${node.selector}`);
    }
  }
  const [minimumWidth, maximumWidth, maximumHeight] = [...query.matchAll(/(\d+)px/g)].map(match => +match[1]);
  const applies = (width, height) => width >= minimumWidth && width <= maximumWidth && height <= maximumHeight;
  for (const viewport of [[660, 500], [720, 500], [800, 600]]) assert.equal(applies(...viewport), true);
  for (const viewport of [[390, 844], [659, 500], [801, 500], [720, 601], [1440, 1000]]) assert.equal(applies(...viewport), false);
});

test('right-hand inspector clears its search row while wrapped masthead keeps a separate lane', () => {
  assert.equal(declarations('.reader-open')['--atlas-reader-width'], 'min(400px, calc(100% - 290px))');
  assert.equal(declarations('.reader-open')['--atlas-reader-tools-top'], '18px');
  assert.equal(declarations('.reader-open')['--atlas-reader-tools-height'], '40px');
  assert.equal(declarations('.reader-open .top-tools').top, 'var(--atlas-reader-tools-top)');
  assert.equal(declarations('.reader-open .top-tools').height, 'var(--atlas-reader-tools-height)');
  assert.equal(declarations('.reader-open .evidence-inspector').top, 'calc(var(--atlas-reader-tools-top) + var(--atlas-reader-tools-height) + 12px)');
  assert.equal(declarations('.reader-open .evidence-inspector').width, 'var(--atlas-reader-width)');
  assert.equal(declarations('.reader-open .evidence-inspector')['max-width'], 'none');
  assert.equal(declarations('.reader-open .masthead')['max-width'], 'calc(100% - var(--atlas-reader-width) - 106px)');
  assert.equal(declarations('.reader-open .masthead')['overflow-wrap'], 'anywhere');
  assert.equal(declarations('.reader-open .masthead > div')['min-width'], '0');
  for (const width of [660, 690, 720, 800]) {
    const inspectorWidth = Math.min(400, width - 290);
    const inspectorLeft = width - 76 - inspectorWidth;
    const mastheadRight = 18 + width - inspectorWidth - 106;
    assert.equal(inspectorLeft - mastheadRight, 12, 'Wrapped masthead and inspector cannot share horizontal pixels');
    assert.ok(mastheadRight - 18 >= 184, 'Leave a usable wrapped-navigation column');
  }
  assert.equal(18 + 40 + 12, 70, 'Inspector starts below its own controls, independent of header height');
});

test('body gets the remaining height and compact spacing without shrinking text or controls', () => {
  for (const selector of ['.reader-open .inspector-top', '.reader-open .inspector-footer']) {
    assert.equal(declarations(selector)['flex-shrink'], '0');
    assert.equal(declarations(selector).padding, '4px 12px');
  }
  for (const selector of ['.reader-open .inspector-top button:focus-visible', '.reader-open .inspector-footer button:focus-visible']) {
    assert.equal(declarations(selector)['outline-offset'], '2px', 'The unchanged 2px focus ring fits inside the 4px control-row padding');
  }
  assert.deepEqual(declarations('.reader-open .inspector-content'), {
    flex: '1', 'min-height': '0', padding: '10px 14px', 'scroll-padding-block': '10px',
  });
  assert.equal(declarations('.reader-open .inspector-content > .eyebrow').display, 'block');
  assert.equal(declarations('.reader-open .inspector-content h2').margin, '6px 0 8px');
  assert.equal(declarations('.reader-open .evidence-tags')['margin-bottom'], '8px');
  assert.equal(globalDeclarations('.lead-summary')['font-size'], '12px');
  assert.equal(globalDeclarations('.lead-summary')['line-height'], '1.65');
  assert.equal(globalDeclarations('.inspector-content').overflow, 'auto');
  assert.equal(globalDeclarations('.inspector-content')['overscroll-behavior'], 'contain');
  // The 720×500 fixture has a 300px panel with the existing 130px bottom
  // reservation. Retain at least 180px even if each chrome row grows to 50px.
  assert.equal(500 - (18 + 40 + 12) - 130, 300);
  assert.ok(300 - 2 - 50 - 50 >= 180);
  assert.equal(396 - (500 - 130), 26, 'Retain the exact-head dock gap');
});

test('reader retains every datum, source link, close and focus-return path', async () => {
  const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
  for (const content of ['RETAINED SNAPSHOT /', '{itemTitle(item)}', 'className="evidence-tags"', 'className="lead-summary">{presentationSummary(item)}', 'className="source-card"', 'aria-label="Close reading panel"', 'aria-label="Evidence reading panel"', 'lastFocus.current?.focus()', 'className="inspector-footer"']) assert.ok(app.includes(content), content);
  assert.match(css, /button:focus-visible,[\s\S]*?outline: 2px solid #f2c97c/);
  assert.ok(css.indexOf(query) > css.indexOf('.accessible-node-list:focus-within { top: var(--atlas-header-clearance); }'), 'Own-lane inset overrides the shared-header fallback');
});
