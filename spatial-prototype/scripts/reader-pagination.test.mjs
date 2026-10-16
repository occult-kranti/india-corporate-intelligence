import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const temporary = await mkdtemp(join(tmpdir(), 'reader-pagination-'));
after(() => rm(temporary, { recursive: true, force: true }));
const outfile = join(temporary, 'pagination.mjs');
await build({ entryPoints: ['src/readerPagination.ts'], outfile, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
const { restoreReaderStart } = await import(pathToFileURL(outfile).href);

test('page navigation focuses the new range and returns the reader to its first row without animation', () => {
  const calls = [];
  restoreReaderStart({ focus: options => calls.push(['focus', options]), closest: selector => {
    assert.equal(selector, '.reading-surface');
    return { scrollTo: options => calls.push(['scroll', options]) };
  } });
  assert.deepEqual(calls, [['focus', { preventScroll: true }], ['scroll', { top: 0, behavior: 'auto' }]]);
  assert.doesNotThrow(() => restoreReaderStart(null));
});

test('reader requests focus only for explicit pagination, not query or source changes', async () => {
  const source = await readFile('src/RegistryReader.tsx', 'utf8');
  assert.equal((source.match(/pageNavigation\.current = true/g) ?? []).length, 1);
  assert.match(source, /const changePage = \(next: number\) => \{\s*pageNavigation.current = true;\s*setPage\(next\)/);
  assert.match(source, /if \(!pageNavigation.current\) return/);
  assert.match(source, /restoreReaderStart\(resultRange.current\)/);
  assert.match(source, /onClick=\{\(\) => changePage\(current \+ 1\)\}/);
  assert.match(source, /onClick=\{\(\) => changePage\(current - 1\)\}/);
});
