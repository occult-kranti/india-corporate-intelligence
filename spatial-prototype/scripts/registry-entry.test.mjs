import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup, renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const temporary = await mkdtemp(join(tmpdir(), 'spatial-registry-entry-'));
after(() => rm(temporary, { recursive: true, force: true }));
const result = await build({
  entryPoints: ['src/RegistryEntry.tsx'], outdir: temporary, bundle: true, splitting: true,
  platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' }, metafile: true, logLevel: 'silent',
  plugins: [{ name: 'component-test-boundary', setup(build) {
    build.onResolve({ filter: /^react(?:\/.*)?$/ }, args => ({ path: require.resolve(args.path), external: true }));
    build.onResolve({ filter: /^\.\/App$/ }, () => ({ path: 'app-stub', namespace: 'entry-test' }));
    build.onLoad({ filter: /.*/, namespace: 'entry-test' }, () => ({
      contents: `import {createElement} from 'react'; export default function App({dataset,registry}) { return createElement('div', {'data-test-app': dataset, 'data-record-count': registry?.records.length ?? 0}, 'Evidence application'); }`, loader: 'js',
    }));
  } }],
});
const entry = await import(pathToFileURL(join(temporary, 'RegistryEntry.mjs')).href);
const { default: RegistryEntry, RegistryEntryView, requestedDataset, datasetHref, startRegistryLoad } = entry;
const href = 'https://review.example/india-corporate-intelligence/spatial/?case=a#reader';
const registry = { updatedAt: 'test', entities: [], relationships: [], records: [{ id: 'a' }], sources: [], states: [], localities: [], coverage: [], held: [], methodology: [] };
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const render = props => renderToStaticMarkup(createElement(RegistryEntryView, { href, onRetry: () => {}, ...props }));
// Dynamic imports perform filesystem I/O; a fixed number of event-loop ticks is
// not a completion signal across Node versions and CI load. React's streaming
// all-ready callback resolves only after the Suspense boundary actually settles.
function renderResolved(props) {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    let html = '';
    output.setEncoding('utf8');
    output.on('data', chunk => { html += chunk; });
    output.on('end', () => resolve(html));
    output.on('error', reject);
    const stream = renderToPipeableStream(createElement(RegistryEntryView, { href, onRetry: () => {}, ...props }), {
      onAllReady() { stream.pipe(output); },
      onError(error) { reject(error); },
    });
  });
}


test('full is the default; only an explicit dataset=preview query opts into the subset', () => {
  for (const query of ['', '?dataset=full', '?dataset=unknown', '?dataset=PREVIEW', '?other=preview']) assert.equal(requestedDataset(query), 'full');
  assert.equal(requestedDataset('?case=a&dataset=preview'), 'preview');
  assert.equal(datasetHref('preview', href), '/india-corporate-intelligence/spatial/?case=a&dataset=preview#reader');
  assert.equal(datasetHref('full', `${href.split('#')[0]}&dataset=preview#reader`), '/india-corporate-intelligence/spatial/?case=a#reader');
});

test('the initial component renders a small full-registry loading shell without mounting App', () => {
  const html = renderToStaticMarkup(createElement(RegistryEntry));
  assert.match(html, /Loading the complete registry/);
  assert.match(html, /Reading the registry manifest/);
  assert.match(html, /data-registry-dataset="full"/);
  assert.match(html, /data-registry-state="loading"/);
  assert.doesNotMatch(html, /data-test-app|PREVIEW DATASET/);
});

test('progress is accessible and full counts never render the app before loader resolution', () => {
  const html = render({ dataset: 'full', state: { phase: 'loading', progress: { loadedChunks: 96, totalChunks: 96, loadedRows: 16159, totalRows: 16159 } } });
  assert.match(html, /aria-label="Verified registry chunks"/);
  assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /96 of 96 chunks verified/);
  assert.match(html, /16,159 of 16,159 rows/);
  assert.doesNotMatch(html, /data-test-app/);
});

test('failure explicitly keeps the complete app closed with Retry and a deliberate preview link', () => {
  const html = render({ dataset: 'full', state: { phase: 'error', message: 'SHA-256 mismatch. Retry loading.', url: `${href}missing.json` } });
  assert.match(html, /Full registry is incomplete/);
  assert.match(html, /role="alert"/);
  assert.match(html, /SHA-256 mismatch/);
  assert.match(html, /Retry full registry/);
  assert.match(html, /Open preview subset instead/);
  assert.match(html, /dataset=preview/);
  assert.match(html, /No partial result or preview subset has been substituted/);
  assert.doesNotMatch(html, /data-test-app/);
});

test('preview is labeled during lazy-loading and passes its dataset flag to the app without an overlay', async () => {
  const props = { dataset: 'preview', state: { phase: 'loading', progress: null } };
  let html = render(props);
  assert.match(html, /PREVIEW DATASET/);
  assert.match(html, /36 entities · 12 records · 33 relationships · 24 sources/);
  assert.match(html, /data-registry-dataset="preview"/);
  html = await renderResolved(props);
  assert.match(html, /data-test-app="preview"/);
  assert.doesNotMatch(html, /data-test-app="full"/);
  assert.doesNotMatch(html, /<aside|registry-preview-app/, 'the mounted App owns its masthead dataset labeling');
});

test('only the resolved complete registry is passed to lazy App as dataset=full', async () => {
  const html = await renderResolved({ dataset: 'full', state: { phase: 'ready', registry } });
  assert.match(html, /data-registry-state="ready"/);
  assert.match(html, /data-test-app="full"/);
  assert.match(html, /data-record-count="1"/);
  assert.doesNotMatch(html, /PREVIEW DATASET/);
});

test('load sessions forward progress, but only a complete resolved registry becomes ready', async () => {
  const states = [];
  const pending = deferred();
  let options;
  const stop = startRegistryLoad(state => states.push(state), { load: supplied => { options = supplied; return pending.promise; } });
  await tick();
  assert.equal(options.cache, 'default');
  assert.equal(options.signal.aborted, false);
  options.onProgress({ loadedChunks: 96, totalChunks: 96, loadedRows: 16159, totalRows: 16159 });
  assert.ok(states.every(state => state.phase === 'loading'));
  pending.resolve(registry);
  await tick();
  assert.equal(states.at(-1).phase, 'ready');
  assert.equal(states.at(-1).registry, registry);
  options.onProgress({ loadedChunks: 1, totalChunks: 96, loadedRows: 1, totalRows: 16159 });
  assert.equal(states.at(-1).phase, 'ready', 'a terminal attempt cannot publish later progress');
  stop();
  assert.equal(options.signal.aborted, true);
});

test('unmount aborts the active attempt and ignores late progress, completion or rejection', async () => {
  for (const outcome of ['resolve', 'reject']) {
    const states = [];
    const pending = deferred();
    let options;
    const stop = startRegistryLoad(state => states.push(state), { load: supplied => { options = supplied; return pending.promise; } });
    await tick();
    stop();
    assert.equal(options.signal.aborted, true);
    options.onProgress({ loadedChunks: 1, totalChunks: 2, loadedRows: 1, totalRows: 2 });
    if (outcome === 'resolve') pending.resolve(registry); else pending.reject(new Error('late failure'));
    await tick();
    assert.equal(states.length, 1);
    assert.equal(states[0].phase, 'loading');
  }
});

test('StrictMode immediate cleanup prevents a redundant request, and its replacement works', async () => {
  let calls = 0;
  const load = async () => { calls++; return registry; };
  const states = [];
  startRegistryLoad(state => states.push(state), { load })();
  await tick();
  assert.equal(calls, 0);
  assert.deepEqual(states.map(state => state.phase), ['loading']);
  const stop = startRegistryLoad(state => states.push(state), { load });
  await tick();
  assert.equal(calls, 1);
  assert.equal(states.at(-1).phase, 'ready');
  stop();
});

test('a failed attempt stays incomplete, and explicit Retry uses cache reload', async () => {
  const states = [];
  const stop = startRegistryLoad(state => states.push(state), { load: async () => { throw new Error('missing chunk'); } });
  await tick();
  assert.equal(states.at(-1).phase, 'error');
  assert.equal(states.at(-1).message, 'missing chunk');
  assert.ok(!states.some(state => state.phase === 'ready'));
  stop();
  let options;
  const stopRetry = startRegistryLoad(state => states.push(state), { reload: true, load: async supplied => { options = supplied; return registry; } });
  await tick();
  assert.equal(options.cache, 'reload');
  assert.equal(states.at(-1).registry, registry);
  stopRetry();
});

test('a cancelled older attempt cannot overwrite a later successful retry', async () => {
  const states = [];
  const old = deferred();
  const stopOld = startRegistryLoad(state => states.push(state), { load: () => old.promise });
  await tick();
  stopOld();
  const stopNew = startRegistryLoad(state => states.push(state), { reload: true, load: async () => registry });
  await tick();
  old.resolve({ ...registry, updatedAt: 'stale' });
  await tick();
  assert.equal(states.at(-1).registry, registry);
  assert.equal(states.filter(state => state.phase === 'ready').length, 1);
  stopNew();
});

test('App is a dynamic split point; the loading entry does not statically import the app or raw registry', async () => {
  const output = result.metafile.outputs[Object.keys(result.metafile.outputs).find(path => path.endsWith('/RegistryEntry.mjs'))];
  assert.ok(output.imports.some(value => value.kind === 'dynamic-import' && value.path.includes('app-stub')));
  const code = await readFile(join(temporary, 'RegistryEntry.mjs'), 'utf8');
  assert.doesNotMatch(code, /legacy:entity:|maplibre-gl|SpatialWorld/);
  const source = await readFile(resolve('src/RegistryEntry.tsx'), 'utf8');
  assert.match(source, /lazy\(\(\) => import\('\.\/App'\)\)/);
  assert.match(source, /if \(dataset === 'preview'\) return;/, 'preview skips the full-registry loading effect');
});

test('dated activity navigation stays relative and separate from evidence state', async () => {
  const app = await readFile('src/App.tsx', 'utf8');
  assert.match(app, /<nav className="atlas-workspace-links" aria-label="Connected workspaces">/);
  assert.match(app, /href="\.\.\/research-activity\/"/);
  assert.match(app, /href="\.\.\/#\/investigate"/);
  assert.doesNotMatch(app, /research-activity\/snapshot|activity-console\/|fetch\([^]*research-activity/);
});
