/** No browser is launched. Actual host activation + actual chooser SSR + the unchanged
 * browser opener exercise the presence-selector contract. This deliberately small
 * quoted-data-attribute fixture establishes selector identity, not layout or WebGL. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { source, require, worldFixture } from './case-unit/host-tests/test-tools.mjs';
import { caseWorkspace, openCaseWorkspace } from './case-workspace-browser.mjs';

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { build } = require('esbuild');
const bundled = await build({
  entryPoints: [join(source, 'profile-host/CaseWorkspace.tsx')],
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  loader: { '.css': 'empty' }, external: ['react', 'react/jsx-runtime', 'react-dom', 'three', 'maplibre-gl'],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(require, module, module.exports);
const Workspace = module.exports.default;
const chooserHTML = renderToStaticMarkup(React.createElement(Workspace, {
  graphics: null, reducedMotion: false, onClose() {}, onRecreateGraphics() {},
}));
const escapeAttribute = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const dataName = name => `data-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;

function selectorFixture(surface = null, activate = () => {}) {
  let mounted = false, attributeReads = 0;
  const html = () => `<main>${surface ? `<div ${Object.entries(surface.dataset).map(([name, value]) => `${dataName(name)}="${escapeAttribute(value)}"`).join(' ')}></div>` : ''}${mounted ? chooserHTML : ''}</main>`;
  // React emits the relevant data attributes as quoted values. Presence matching
  // intentionally treats data-case-workspace="false" as present, as CSS does.
  const matches = () => [...html().matchAll(/<[a-z][a-z0-9-]*\b[^>]*>/g)]
    .map(([tag]) => Object.fromEntries([...tag.matchAll(/\s(data-[a-z0-9-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])))
    .filter(attributes => Object.hasOwn(attributes, 'data-case-workspace'));
  const locator = {
    async count() { return matches().length; },
    async getAttribute(name) {
      attributeReads++;
      const found = matches();
      assert.equal(found.length, 1, 'The fixture retains strict single-element attribute access');
      return found[0][name] ?? null;
    },
  };
  return {
    page: {
      locator(selector) { assert.equal(selector, '[data-case-workspace]'); return locator; },
      getByRole(role, options) {
        assert.equal(role, 'button');
        assert.deepEqual(options, { name: 'Selected case files', exact: true });
        return { async click() { activate(); mounted = true; } };
      },
    },
    close() { mounted = false; },
    get html() { return html(); },
    get attributeReads() { return attributeReads; },
  };
}
const until = async (predicate, message) => assert.equal(await predicate(), true, message);

test('the actual chooser owns one semantic workspace marker and all 19 case choices', () => {
  assert.equal((chooserHTML.match(/\sdata-case-workspace=""/g) ?? []).length, 1);
  assert.equal((chooserHTML.match(/\sdata-profile-id=/g) ?? []).length, 19);
  assert.match(chooserHTML, /data-case-view="chooser"/);
  assert.match(chooserHTML, /72 core claims/);
});

test('reading-only chooser passes the unchanged exact-one browser opener', async () => {
  const fixture = selectorFixture();
  await openCaseWorkspace(fixture.page, until);
  assert.equal(await caseWorkspace(fixture.page).count(), 1);
  fixture.close();
  assert.equal(await caseWorkspace(fixture.page).count(), 0);
});

test('actual geographic activation preserves exactly one workspace on repeated open and zero after Close', async () => {
  const host = await worldFixture();
  try {
    const fixture = selectorFixture(host.surface, () => host.world.setWorkspaceActive(true));
    assert.equal(await caseWorkspace(fixture.page).count(), 0);
    for (let cycle = 0; cycle < 3; cycle++) {
      await openCaseWorkspace(fixture.page, until);
      assert.equal(host.surface.dataset.geographicWorkspaceActive, 'true');
      assert.equal(Object.hasOwn(host.surface.dataset, 'caseWorkspace'), false);
      assert.equal(await caseWorkspace(fixture.page).count(), 1);
      host.world.setWorkspaceActive(true);
      assert.equal(await caseWorkspace(fixture.page).count(), 1);
      host.world.setWorkspaceActive(false);
      host.world.setWorkspaceActive(false);
      fixture.close();
      assert.equal(host.surface.dataset.geographicWorkspaceActive, 'false');
      assert.equal(await caseWorkspace(fixture.page).count(), 0);
    }
  } finally { host.cleanup(); }
});

test('historical host diagnostic mutation reproduces chooser failure and false-valued leftover match', async () => {
  const host = await worldFixture();
  try {
    const fixture = selectorFixture(host.surface, () => {
      host.world.setWorkspaceActive(true);
      host.surface.dataset.caseWorkspace = 'true'; // Historical scene.ts diagnostic name.
    });
    await assert.rejects(() => openCaseWorkspace(fixture.page, until), /Case chooser did not open/);
    assert.equal(await caseWorkspace(fixture.page).count(), 2);
    assert.equal(fixture.attributeReads, 0, 'The exact-one predicate must short-circuit before a strict locator read');
    assert.match(fixture.html, /data-case-workspace="true"/);
    assert.match(fixture.html, /data-case-workspace=""/);
    host.world.setWorkspaceActive(false);
    host.surface.dataset.caseWorkspace = 'false';
    fixture.close();
    assert.equal(await caseWorkspace(fixture.page).count(), 1, 'CSS presence matches false-valued attributes too');
  } finally { host.cleanup(); }
});

test('the production host diagnostic is distinct and the browser readiness predicate remains exact-one', async () => {
  const scene = await readFile(join(source, 'scene.ts'), 'utf8');
  const browser = await readFile(join(source, '../scripts/case-workspace-browser.mjs'), 'utf8');
  assert.match(scene, /this\.container\.dataset\.geographicWorkspaceActive = String\(active\);/);
  assert.doesNotMatch(scene, /dataset\.caseWorkspace\b|["']data-case-workspace["']/);
  assert.match(browser, /caseWorkspace\(page\)\.count\(\) === 1 && await caseWorkspace\(page\)\.getAttribute\('data-case-view'\) === 'chooser'/);
});
