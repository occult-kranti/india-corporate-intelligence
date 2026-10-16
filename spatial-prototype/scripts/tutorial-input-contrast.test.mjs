import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('./browser-review.mjs', import.meta.url), 'utf8');
const desktop = source.slice(source.indexOf('"21-atlas-tutorial-explicit-progress-and-conditional-targets",'), source.indexOf('"22-atlas-tutorial-mobile-reduced-motion-and-storage-fallback",'));
const mobile = source.slice(source.indexOf('"22-atlas-tutorial-mobile-reduced-motion-and-storage-fallback",'));

test('desktop guide requires actual hover-capable input, a real hovered button and computed 4.5:1 contrast', () => {
  assert.match(source, /matchMedia\("\(hover: hover\)"\)\.matches/);
  assert.match(source, /await next\.hover\(\)/);
  assert.match(source, /element\.matches\(":hover"\)/);
  assert.match(source, /buttonContrast\.every\(row => row\.ratio >= 4\.5\)/);
  assert.match(desktop, /"desktop actual Next hover", "pointer-hover"/);
  assert.match(desktop, /desktop-guide-verified-pointer-hover/);
});

test('mobile keeps real touch, normal/focus contrast, focus trap, storage and unchanged-research gates', () => {
  assert.match(mobile, /touch: true/);
  assert.match(mobile, /await help\.tap\(\)/);
  assert.match(mobile, /"mobile after touch reopen"/);
  assert.match(mobile, /"mobile focused Next", "focus"/);
  assert.doesNotMatch(mobile, /\.hover\(\)|\?\.hovered|"pointer-hover"/);
  assert.match(mobile, /Tab escaped the mobile tutorial dialog/);
  assert.match(mobile, /Shift\+Tab escaped the mobile tutorial dialog/);
  assert.match(mobile, /in-tab progress survives denied storage/);
  assert.match(mobile, /await assertTutorialUnchanged/);
  assert.match(source, /document\.activeElement === element/);
});

test('contrast diagnostics are retained before an assertion can fail and no style is forced', () => {
  assert.ok(source.indexOf('result.guideButtonContrast.push') < source.indexOf('Paper-guide button contrast is below'));
  const helper = source.slice(source.indexOf('async function assertGuideButtonContrast'), source.indexOf('async function scenario'));
  assert.match(helper, /foreground: style\.color/);
  assert.match(helper, /background: style\.backgroundColor/);
  assert.doesNotMatch(helper, /setAttribute|classList|\.style\s*[.=]|addStyleTag|forcePseudoState/);
});
