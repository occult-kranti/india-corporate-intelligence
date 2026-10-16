/** Shared CI measurement logic. Does not import or launch a browser. */
import assert from 'node:assert/strict';
export function validateReaderLayout(s) {
  assert.ok(s.controls.bottom <= s.scroll.top + 0.5, 'Reader controls overlap the scrolling source text');
  assert.ok(s.button.top >= s.controls.top - 0.5 && s.button.bottom <= s.controls.bottom + 0.5, 'Close control escapes its reserved row');
  assert.ok(s.scroll.height >= 120 && s.scroll.bottom <= s.dialog.bottom + 0.5, 'Source scroll region is clipped or empty');
  assert.ok(s.dialog.left >= -0.5 && s.dialog.top >= -0.5 && s.dialog.right <= s.viewport.width + 0.5 && s.dialog.bottom <= s.viewport.height + 0.5, 'Reader exceeds the effective viewport');
  assert.ok(s.scrollWidth <= s.clientWidth + 1, 'Nested reader content horizontally overflows');
  assert.equal(s.outerScrollTop, 0, 'Dialog shell must not scroll underneath its controls');
  assert.ok(['auto', 'scroll'].includes(s.overflowY), 'Source body must be independently scrollable');
  assert.equal(s.closeHit, true, 'Close control is obscured');
  assert.equal(s.focusable, true, 'Source body must support keyboard scrolling');
  assert.ok(s.label?.trim(), 'Source body must have an accessible name');
}
export async function measureReaderLayout(dialog, result, phase) {
  const sample = await dialog.evaluate(element => {
    const controls = element.querySelector('[data-reader-controls]');
    const scroll = element.querySelector('[data-reader-scroll]');
    const button = controls.querySelector('button');
    const rect = el => el.getBoundingClientRect().toJSON();
    const b = rect(button), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return {dialog:rect(element),controls:rect(controls),scroll:rect(scroll),button:b,
      viewport:{width:innerWidth,height:innerHeight},scrollTop:scroll.scrollTop,scrollHeight:scroll.scrollHeight,
      clientHeight:scroll.clientHeight,scrollWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth,
      outerScrollTop:element.scrollTop,overflowY:getComputedStyle(scroll).overflowY,
      closeHit:hit===button || button.contains(hit),focusable:scroll.tabIndex===0,label:scroll.getAttribute('aria-label')};
  });
  (result.readerLayoutSamples ??= []).push({phase,...sample});
  validateReaderLayout(sample);
  return sample;
}
export async function exerciseReaderScroll(page, dialog, result, phase) {
  const scroll = dialog.locator('[data-reader-scroll]');
  const initial = await scroll.evaluate(el => el.scrollTop);
  const max = await scroll.evaluate(el => el.scrollHeight-el.clientHeight);
  assert.ok(max > 100, 'Long source content must actually overflow the body');
  for (const [name,fraction] of [['top',0],['middle',0.5],['bottom',1]]) {
    await scroll.evaluate((el,value) => {el.scrollTop=value;}, max*fraction);
    await measureReaderLayout(dialog,result,`${phase}:${name}`);
  }
  await scroll.evaluate(el => {el.scrollTop=0;});
  await scroll.focus();
  await page.keyboard.press('PageDown');
  await page.waitForFunction(() => document.querySelector('dialog[open] [data-reader-scroll]')?.scrollTop > 0, null, {timeout:5000});
  assert.equal(await scroll.evaluate(el => document.activeElement===el),true,'PageDown lost source-region focus');
  const outline = await scroll.evaluate(el => ({width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));
  assert.ok(outline.width>=2 && outline.style!=='none','Keyboard scroll focus must be visible');
  await measureReaderLayout(dialog,result,`${phase}:keyboard-page-down`);
  await scroll.evaluate((el,value) => {el.scrollTop=value;}, initial);
}
