import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const directory = await mkdtemp(join(tmpdir(), 'reader-collections-'));
after(() => rm(directory, { recursive: true, force: true }));
await build({ entryPoints: ['src/ReaderCollections.tsx'], outfile: join(directory, 'reader.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent', plugins: [{name:'react-external',setup(b){b.onResolve({filter:/^react(?:\/.*)?$/},args=>({path:require.resolve(args.path),external:true}));}}] });
const { readerCollections, readerCollectionHref, ReaderCollections } = await import(pathToFileURL(join(directory, 'reader.mjs')).href);
test('optional readers expose separate exact collection counts without claiming registry integration', () => {
  assert.deepEqual(readerCollections.map(c=>[c.id,c.count]), [['historical-2025','9 claims'], ['sector-2026-10','20 panels']]);
  const html = renderToStaticMarkup(createElement(ReaderCollections));
  assert.match(html, /outside the original registry counts and factual map\/path network/);
  assert.match(html, /then explicitly open its verified reader/);
  assert.equal((html.match(/opens a new tab/g)||[]).length,2);
  assert.equal((html.match(/rel="noopener noreferrer"/g)||[]).length,2);
  assert.doesNotMatch(html, /<script|<iframe|download=/);
});
test('collection links preserve the nested Pages path and unrelated context with one exact discriminant', () => {
  for (const collection of readerCollections) {
    const href = readerCollectionHref(collection.id, 'https://review.invalid/india-corporate-intelligence/spatial/?dataset=preview&review=unknown&review=historical-2025&case=a#reader');
    assert.equal(href, `/india-corporate-intelligence/spatial/?review=${collection.id}&case=a#reader`);
    assert.equal(new URL(href, 'https://review.invalid').searchParams.getAll('review').length,1);
    assert.equal(new URL(href, 'https://review.invalid').searchParams.has('dataset'),false);
  }
});
test('collection discovery is full-reader Sources-only and does not import any reviewed payload', async () => {
  const reader = await readFile('src/RegistryReader.tsx', 'utf8');
  assert.match(reader,/view === "sources" && dataset === "full" && <ReaderCollections/);
  const source = await readFile('src/ReaderCollections.tsx', 'utf8');
  assert.doesNotMatch(source,/from |import\(|fetch\(|localStorage|sessionStorage|\.json/);
  const app = await readFile('src/App.tsx','utf8');
  assert.match(app,/<RegistryReader\s+dataset=\{dataset\}/);
});
