import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModule } from './load.mjs';
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const legacy = JSON.parse(read('scripts/board/legacy-routes.json'));
const app = read('src/App.tsx'), shell = read('src/components/Layout.tsx'), board = read('src/components/board/InvestigationBoard.tsx');
const { CASEBOOK_KEY, emptyCasebook } = await loadModule('src/components/investigation/casebookStore.ts');
const { BOARD_LAYOUT_KEY } = await loadModule('src/components/board/boardStore.ts');

test('all 60 original route patterns survive and /board is additive', () => {
  const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/gu)].map(match => match[1]).filter(route => route !== '*');
  assert.equal(legacy.length, 60); assert.equal(new Set(legacy).size, 60);
  assert.deepEqual(routes.filter(route => route !== '/board').sort(), [...legacy].sort());
  assert.equal(routes.length, 61); assert.equal(routes.filter(route => route === '/board').length, 1);
  assert.match(app, /path="\/board"\s+element=\{<InvestigationBoard\s*\/>\}/u);
  assert.match(shell, /location\.pathname === '\/board' \? <Outlet \/>/u);
});

test('legacy dynamic browser inventory checks the board as its declared independent surface', () => {
  const acceptance = read('scripts/investigation/browser.mjs');
  const researchMap = acceptance.split('const researchRoutes = new Map([')[1]?.split(']);')[0];
  assert.ok(researchMap, 'Independent route inventory remains present');
  assert.ok(researchMap.includes(`['/board', { marker: '.case-board-page', heading: 'Follow the record.Build your case.', control: '[data-tour="board-tools"]' }]`));
  for (const route of ['/investigations', '/leads', '/game-theory', '/research-program']) assert.ok(researchMap.includes(`['${route}',`), route);
  assert.ok(board.includes('className="case-board-page"'));
  assert.ok(board.includes('data-tour="board-tools"'));
  assert.ok(board.includes('Follow the record.<br /><em>Build your case.</em>'));
});

test('legacy shared workspace and independent route families retain their rendering paths', () => {
  for (const route of ['/investigations', '/leads', '/game-theory', '/research-program', '/follow-the-money', '/money-trails', '/research-radar', '/model-lab', '/funding-investigations', '/hypothesis-lab', '/allegations']) assert.ok(shell.includes(`'${route}'`), route);
  assert.match(shell, /<Workspace routeTitle=\{routeTitle\} routeKey=\{location\.pathname\}><Outlet \/><\/Workspace>/u);
  assert.match(shell, /aria-label="Primary navigation"/u);
  assert.match(shell, /data-tour="board-nav"/u);
});

test('board is backed by the existing casebook and imports the original export/source-closure model', () => {
  assert.match(board, /useCasebook\(\)/u); assert.match(board, /pinCasebookItem\(/u); assert.match(board, /updateCasebookNote\(/u); assert.match(board, /importCasebookData\(/u);
  assert.match(board, /buildCasebookPacket\(book, registry\)/u); assert.match(board, /boardLayout: layout/u);
  assert.match(board, /Analyst thread: a question to test/u); assert.match(board, /Sourced links between pinned identities/u);
  assert.match(board, /Depth and proximity carry no evidential meaning/u); assert.match(board, /not a sourced relationship/u);
  assert.match(board, /geography\.flatMap\(geo => geo\.sourceIds\)/u);
  assert.match(board, /Scope and limitations/u); assert.match(board, /Source ledger/u);
});

test('shared casebook API persists pins, notes, imports and removals without touching board state', async () => {
  const previous = globalThis.localStorage;
  const data = new Map([[BOARD_LAYOUT_KEY, '{"retained":"layout marker"}']]);
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
  try {
    const api = await loadModule('src/components/investigation/Casebook.tsx', true);
    assert.equal(api.pinCasebookItem('record', 'missing-but-saved'), true);
    api.updateCasebookNote('record', 'missing-but-saved', 'Keep my analyst note');
    api.updateBook({ title: 'My investigation', question: 'Keep my question', falsifier: 'Keep my falsifier' });
    api.importCasebookData({ ...emptyCasebook(), title: 'Incoming', question: 'Incoming question', pins: [{ kind: 'record', id: 'missing-but-saved', note: 'Incoming conflict', addedAt: '' }, { kind: 'entity', id: 'new-identity', note: 'New note', addedAt: '' }] });
    const book = JSON.parse(data.get(CASEBOOK_KEY));
    assert.equal(book.pins.length, 2); assert.equal(book.pins[0].note, 'Keep my analyst note'); assert.equal(book.question, 'Keep my question'); assert.equal(book.title, 'My investigation'); assert.equal(book.falsifier, 'Keep my falsifier');
    assert.equal(api.pinCasebookItem('record', 'missing-but-saved'), true); assert.equal(JSON.parse(data.get(CASEBOOK_KEY)).pins.length, 2);
    api.unpinCasebookItem('entity', 'new-identity'); assert.equal(JSON.parse(data.get(CASEBOOK_KEY)).pins.length, 1);
    assert.equal(data.get(BOARD_LAYOUT_KEY), '{"retained":"layout marker"}');
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});

test('shared casebook refuses a 251st pin and oversized restore atomically', async () => {
  const previous = globalThis.localStorage;
  const full = { ...emptyCasebook(), pins: Array.from({ length: 250 }, (_, i) => ({ kind: 'record', id: `retained-${i}`, note: `note-${i}`, addedAt: '' })) };
  let value = JSON.stringify(full); globalThis.localStorage = { getItem: () => value, setItem: (_, next) => { value = next; } };
  try {
    const api = await loadModule('src/components/investigation/Casebook.tsx', true);
    assert.equal(api.pinCasebookItem('record', 'extra'), false); assert.deepEqual(JSON.parse(value), full);
    assert.equal(api.pinCasebookItem('record', 'retained-0'), true); assert.deepEqual(JSON.parse(value), full);
    assert.throws(() => api.importCasebookData({ ...emptyCasebook(), pins: [{ kind: 'record', id: 'extra', note: 'new note', addedAt: '' }] }), /251 pins/u);
    assert.deepEqual(JSON.parse(value), full);
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});

test('storage write denial keeps casebook edits available for a portable in-tab export', async () => {
  const previous = globalThis.localStorage; const data = new Map();
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: () => { throw new Error('QuotaExceededError'); } };
  try {
    const api = await loadModule('src/components/investigation/Casebook.tsx', true);
    assert.equal(api.pinCasebookItem('record', 'in-memory'), true); api.updateCasebookNote('record', 'in-memory', 'Retain after denial');
    // A duplicate succeeds without a write, proving that the prior in-tab snapshot survived denial.
    assert.equal(api.pinCasebookItem('record', 'in-memory'), true);
    // Swap only the storage writer; another edit must serialize the complete in-tab snapshot.
    globalThis.localStorage.setItem = (key, value) => data.set(key, value);
    api.updateBook({ title: 'Recoverable in-tab state' });
    const saved = JSON.parse(data.get(CASEBOOK_KEY)); assert.equal(saved.pins.length, 1); assert.equal(saved.pins[0].note, 'Retain after denial');
  } finally { if (previous === undefined) delete globalThis.localStorage; else globalThis.localStorage = previous; }
});
