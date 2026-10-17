import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { beginReaderScrollSettlement } from './reader-scroll-settlement.mjs';

function fixture() {
  let time = 0, next = 0; const frames = new Map(), timers = new Map(), listeners = new Map();
  const view = { performance: { now: () => time },
    requestAnimationFrame: fn => { const id = ++next; frames.set(id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, ms) => { const id = ++next; timers.set(id, {fn,at:time+ms}); return id; },
    clearTimeout: id => timers.delete(id) };
  const element = { scrollTop: 0, isConnected: true, ownerDocument: { defaultView: view },
    addEventListener: (name, fn) => { if (!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name).add(fn); },
    removeEventListener: (name, fn) => listeners.get(name)?.delete(fn) };
  element.ownerDocument.activeElement = element;
  const emit = (name, data={}) => { for (const fn of listeners.get(name)??[]) fn(data); };
  const tick = (ms=16) => { time+=ms; const pending=[...frames.values()]; frames.clear(); for(const fn of pending)fn(time);
    for(const [id,timer] of timers)if(timer.at<=time){timers.delete(id);timer.fn();} };
  return { element, emit, tick, input: () => emit('keydown',{key:'PageDown'}), scroll: top => { element.scrollTop=top;emit('scroll'); },
    assertClean: () => { assert.equal(frames.size,0); assert.equal(timers.size,0); assert.equal([...listeners.values()].reduce((n,s)=>n+s.size,0),0); } };
}
test('records the retained native PageDown animation and waits for scrollend plus stable frames', async () => {
  const f=fixture(), observation=beginReaderScrollSettlement(f.element); let done=false; observation.promise.then(()=>done=true);
  f.input(); for(const top of [27,72,136,211,300,400]){f.scroll(top);f.tick();}
  await Promise.resolve();assert.equal(done,false);f.emit('scrollend');f.tick();await Promise.resolve();assert.equal(done,false);
  f.tick();const result=await observation.promise;assert.equal(result.seenScroll,true);assert.equal(result.stableFrames,2);
  assert.deepEqual(result.samples.filter(x=>x.type==='scroll').map(x=>x.scrollTop),[27,72,136,211,300,400]);f.assertClean();
});
test('fixture reset events before the native input cannot satisfy settlement', async () => {
  const f=fixture(), o=beginReaderScrollSettlement(f.element);f.scroll(0);f.emit('scrollend');f.tick();f.tick();assert.equal(o.snapshot().seenScroll,false);
  f.input();f.scroll(0);f.emit('scrollend');f.tick();f.tick();assert.equal(o.snapshot().seenScroll,false);
  f.scroll(75);f.emit('scrollend');f.tick();f.tick();assert.equal((await o.promise).samples.at(-1).scrollTop,75);f.assertClean();
});
test('stable positive scrolling without an actual scrollend fails closed', async () => {
  const f=fixture(), o=beginReaderScrollSettlement(f.element);f.input();f.scroll(400);for(let i=0;i<8;i++)f.tick();f.tick(5000);
  await assert.rejects(o.promise,/scrollend and stable frames/);f.assertClean();
});
test('additional scrolling after scrollend resets the observation', async () => {
  const f=fixture(),o=beginReaderScrollSettlement(f.element);f.input();f.scroll(72);f.emit('scrollend');f.tick();f.scroll(136);f.tick();
  assert.equal(o.snapshot().scrollEndAt,null);f.emit('scrollend');f.tick();f.tick();assert.equal((await o.promise).samples.at(-1).scrollTop,136);f.assertClean();
});
test('a changed frame without a scroll event still invalidates settlement', async () => {
  const f=fixture(),o=beginReaderScrollSettlement(f.element);f.input();f.scroll(72);f.emit('scrollend');f.element.scrollTop=136;f.tick();
  assert.equal(o.snapshot().scrollEndAt,null);f.emit('scrollend');f.tick();f.tick();await o.promise;f.assertClean();
});
test('no movement, lost input focus, modified input, detachment and cancellation cannot pass', async () => {
  for(const mode of ['no-move','focus','modified','detach','cancel']){
    const f=fixture(),o=beginReaderScrollSettlement(f.element);
    if(mode==='focus')f.element.ownerDocument.activeElement=null;
    if(mode==='modified')f.emit('keydown',{key:'PageDown',ctrlKey:true});else f.input();
    if(mode!=='no-move'){f.scroll(72);f.emit('scrollend');}
    if(mode==='detach')f.element.isConnected=false;
    if(mode==='cancel')o.cancel();f.tick();if(!['detach','cancel'].includes(mode))f.tick(5000);
    await assert.rejects(o.promise);f.assertClean();
  }
});
test('helper only observes and harness keeps keyboard reveal predicates intact', async () => {
  const helper=await readFile(new URL('./reader-scroll-settlement.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(helper,/element\.scrollTop\s*=|\.focus\(|\.scrollTo\(|dispatchEvent|preventDefault/);
  const source=await readFile(new URL('./case-workspace-browser.mjs',import.meta.url),'utf8');
  assert.match(source,/sample\.focused && sample\.hit && sample\.action\.top >= sample\.scroll\.top - 0\.5 && sample\.action\.bottom <= sample\.scroll\.bottom \+ 0\.5/);
  assert.ok(source.indexOf('state => state.promise') < source.indexOf('element.scrollTop = element.scrollHeight; element.focus'));
});
