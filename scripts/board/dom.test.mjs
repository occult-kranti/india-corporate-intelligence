/** DOM simulation only. No browser launch, geometry, native focus-trap or visual claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, stop } from 'esbuild';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(root, 'global-evidence-workbench/ui/package.json'));
const { JSDOM } = require('jsdom');
const dir = mkdtempSync(join(root, 'scripts/board/.test-'));
const output = join(dir, 'fixture.mjs');
await build({ stdin: { contents: `import React, {act} from 'react'; import {createRoot} from 'react-dom/client'; import {HashRouter} from 'react-router-dom'; import Board from './src/components/board/InvestigationBoard'; export {pinCasebookItem} from './src/components/investigation/Casebook'; export async function mount(){globalThis.IS_REACT_ACT_ENVIRONMENT=true;const root=createRoot(document.getElementById('app'));await act(async()=>root.render(<HashRouter><Board/></HashRouter>));return {act,root};}`, resolveDir: root, loader: 'tsx' }, outfile: output, bundle: true, platform: 'node', format: 'esm', loader: { '.css': 'empty' }, logLevel: 'silent' });
stop();
const NativeMessageChannel = globalThis.MessageChannel; const channels = [];
globalThis.MessageChannel = class extends NativeMessageChannel { constructor() { super(); channels.push(this); } };
const dom = new JSDOM('<!doctype html><div id="app"></div>', { url: 'https://local.test/#/board', pretendToBeVisual: true });
const w = dom.window;
for (const key of ['window', 'document', 'HTMLElement', 'HTMLDialogElement', 'MutationObserver', 'localStorage', 'navigator', 'Event', 'MouseEvent', 'KeyboardEvent']) Object.defineProperty(globalThis, key, { value: key === 'window' ? w : w[key], configurable: true });
globalThis.ResizeObserver = class { constructor(callback) { this.callback = callback; } observe() { this.callback([{ contentRect: { width: 980 } }]); } disconnect() {} };
w.HTMLElement.prototype.scrollIntoView = function () {};
w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
w.HTMLDialogElement.prototype.close = function () { this.open = false; };
w.requestAnimationFrame = callback => setTimeout(callback, 0); w.cancelAnimationFrame = clearTimeout;
globalThis.requestAnimationFrame = w.requestAnimationFrame; globalThis.cancelAnimationFrame = clearTimeout;
const CASEBOOK = 'icip.investigation.casebook.v1', BOARD = 'icip.investigation.board-layout.v1';
const pin = id => ({ kind: 'record', id, note: `Keep ${id}`, addedAt: '' });
const currentBook = { version: 1, title: 'Current', question: 'Keep question', falsifier: 'Keep falsifier', pins: [pin('unknown-a'), pin('unknown-b')], views: [] };
const currentLayout = { version: 1, positions: { 'record:unknown-a': { x: 80, y: 100 }, 'record:unknown-b': { x: 400, y: 100 } }, threads: [{ id: 'retained-thread', from: 'record:unknown-a', to: 'record:unknown-b', type: 'question', note: 'Retain this annotation even after a pin is removed.' }] };
localStorage.setItem(CASEBOOK, JSON.stringify(currentBook)); localStorage.setItem(BOARD, JSON.stringify(currentLayout));
const fixture = await import(pathToFileURL(output)); let handle;
const tick = async () => handle.act(async () => { await new Promise(done => setTimeout(done, 10)); });
const state = key => JSON.parse(localStorage.getItem(key));
const button = text => { const found = [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text); assert.ok(found, `Missing button ${text}`); return found; };
const click = async element => { await handle.act(async () => element.click()); await tick(); };
const cardFor = id => [...document.querySelectorAll('.board-pin')].find(card => card.textContent.includes(id));

test('board component preserves work through removal, re-pin and a concurrent delayed restore', async t => {
  try {
    handle = await fixture.mount(); await tick();
    await t.test('Notebook removal releases stale position capacity but preserves analyst threads', async () => {
      await click(button('Notes & exports'));
      const remove = document.querySelector('[aria-label="Remove unknown-a from casebook"]'); assert.ok(remove); await click(remove);
      assert.equal(state(CASEBOOK).pins.length, 1); assert.equal(state(BOARD).positions['record:unknown-a'], undefined);
      assert.equal(state(BOARD).threads[0].note, currentLayout.threads[0].note);
    });
    await t.test('re-pinning and moving the same ID adds a fresh bounded position', async () => {
      await handle.act(async () => fixture.pinCasebookItem('record', 'unknown-a')); await tick();
      const card = cardFor('unknown-a'); assert.ok(card); const grip = card.querySelector('.board-pin-grip');
      await handle.act(async () => grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))); await tick();
      assert.equal(state(CASEBOOK).pins.length, 2); assert.equal(Object.keys(state(BOARD).positions).length, 2);
      assert.ok(state(BOARD).positions['record:unknown-a']); assert.equal(state(BOARD).threads.length, 1);
    });
    await t.test('asynchronous backup merge keeps a movement made after reading begins', async () => {
      const incoming = { casebook: { ...currentBook, pins: [pin('unknown-c')] }, boardLayout: { version: 1, positions: {}, threads: [] } };
      let release; const file = { size: 100, text: () => new Promise(done => { release = () => done(JSON.stringify(incoming)); }) };
      const input = document.querySelector('input[aria-label="Import a board backup"]');
      Object.defineProperty(input, 'files', { configurable: true, value: [file] });
      await handle.act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await tick(); assert.ok(release);
      const card = cardFor('unknown-b'); const oldX = state(BOARD).positions['record:unknown-b'].x;
      await handle.act(async () => card.querySelector('.board-pin-grip').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))); await tick();
      assert.equal(state(BOARD).positions['record:unknown-b'].x, oldX + 24);
      await handle.act(async () => release()); await tick();
      assert.equal(state(CASEBOOK).pins.length, 3); assert.equal(state(CASEBOOK).question, 'Keep question');
      assert.equal(state(BOARD).positions['record:unknown-b'].x, oldX + 24); assert.equal(state(BOARD).threads.length, 1);
      assert.match(document.querySelector('.board-status').textContent, /Backup merged/);
    });
    await t.test('saved board view includes the actual list and search query', async () => {
      await handle.act(async () => { w.location.hash = '#/board?view=list&q=retained-search'; }); await tick();
      await click(button('Save this view')); const saved = state(CASEBOOK).views.at(-1);
      const route = new URL(saved.url.slice(1), 'https://application.invalid'); assert.equal(route.searchParams.get('view'), 'list'); assert.equal(route.searchParams.get('q'), 'retained-search');
    });
    for (const kind of ['pins', 'views']) {
      await t.test(`raw over-capacity ${kind === 'pins' ? '251-pin' : '41-view'} backups reject without changing either store`, async () => {
        const oversized = { ...currentBook,
          pins: kind === 'pins' ? Array.from({ length: 251 }, (_, i) => pin(`incoming-${i}`)) : [],
          views: kind === 'views' ? Array.from({ length: 41 }, (_, i) => ({ id: `view-${i}`, label: `Incoming view ${i}`, url: `#/board?q=${i}`, savedAt: '' })) : [],
        };
        for (const raw of [oversized, { casebook: oversized, boardLayout: { version: 1, positions: {}, threads: [] } }]) {
          const beforeBook = localStorage.getItem(CASEBOOK), beforeLayout = localStorage.getItem(BOARD);
          const file = { size: 2000, text: async () => JSON.stringify(raw) };
          const input = document.querySelector('input[aria-label="Import a board backup"]');
          Object.defineProperty(input, 'files', { configurable: true, value: [file] });
          await handle.act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await tick();
          assert.equal(localStorage.getItem(CASEBOOK), beforeBook); assert.equal(localStorage.getItem(BOARD), beforeLayout);
          assert.match(document.querySelector('.board-status').textContent, /The backup exceeds 250 pins or 40 saved views\. Nothing was imported\./);
        }
      });
    }
    await t.test('unreadable casebook storage cannot trigger automatic loss of intact board positions', async () => {
      const before = localStorage.getItem(BOARD); localStorage.setItem(CASEBOOK, '{malformed');
      await handle.act(async () => w.dispatchEvent(new w.StorageEvent('storage', { key: CASEBOOK, newValue: '{malformed' }))); await tick();
      assert.equal(localStorage.getItem(CASEBOOK), '{malformed'); assert.equal(localStorage.getItem(BOARD), before);
      assert.match(document.querySelector('.board-status').textContent, /storage could not be read|could not be read/i);
    });
  } finally {
    if (handle) await handle.act(async () => handle.root.unmount());
    dom.window.close(); for (const channel of channels) { channel.port1.close(); channel.port2.close(); }
    globalThis.MessageChannel = NativeMessageChannel; rmSync(dir, { recursive: true, force: true });
  }
});
