import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);
const script = fileURLToPath(new URL('./spatial-release.browser.mjs', import.meta.url));

test('combined browser runner parses without running a browser', async () => {
  const result = await exec(process.execPath, ['--check', script]);
  assert.equal(result.stderr, '');
});

test('combined browser runner refuses local invocation before importing Playwright or reading output', async () => {
  for (const [GITHUB_ACTIONS, SPATIAL_RELEASE_REVIEW] of [['false', 'github-actions'], ['true', ''], ['', '']]) {
    await assert.rejects(exec(process.execPath, [script], { env: { ...process.env, GITHUB_ACTIONS, SPATIAL_RELEASE_REVIEW } }), error => {
      assert.match(error.stderr, /restricted to GitHub Actions\. No local browser was launched/);
      assert.doesNotMatch(error.stderr, /ERR_MODULE_NOT_FOUND|Executable doesn't exist|ENOENT/);
      return true;
    });
  }
});

test('release review covers real cross-app clicks, back navigation, immutable data and preserved workspaces', async () => {
  const source = await readFile(script, 'utf8');
  assert.ok(source.indexOf("process.env.GITHUB_ACTIONS !== 'true'") < source.indexOf("await import('playwright')"));
  for (const check of ['await link.click()', 'await original.click()', 'await back.click()', 'await page.goBack(', 'global-workbench/finance.html', 'global-workbench/media.html', 'expectedData', 'verifiedRegistryPaths', 'contentType', 'data-registry-state="ready"', 'page.screenshot(']) assert.ok(source.includes(check), check);
  assert.match(source, /sha256/);
  assert.match(source, /Missing assets must not receive index\.html/);
});
