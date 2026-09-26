/**
 * Tests for src/graph/mergeFleet.ts.   node --test scripts/merge-fleet.test.mjs
 *
 * The module is TypeScript; it is transpiled here with the project's own
 * `typescript` (already a devDependency), so the test runs the real source rather
 * than a JavaScript twin that could drift from it. Its only import is type-only.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(import.meta.url)(join(ROOT, 'node_modules/typescript'));
const dir = mkdtempSync(join(process.env.FLEET_TEST_TMP ?? tmpdir(), 'merge-'));
after(() => rmSync(dir, { recursive: true, force: true }));
const src = readFileSync(join(ROOT, 'src/graph/mergeFleet.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
writeFileSync(join(dir, 'mergeFleet.mjs'), js);
const { mergeFleet } = await import(pathToFileURL(join(dir, 'mergeFleet.mjs')).href);

const N = (id, label = id) => ({ id, label, ty: 'company', fam: 'capital', sz: 1 });
const E = (s, t, pred = 'own', id) => ({ ...(id ? { id } : {}), s, t, pred, tier: 'reported', srcs: [['x', 'https://example.org']] });

const base = { nodes: [N('co:ntpc', 'NTPC (roster)'), N('pol:x')], edges: [E('pol:x', 'co:ntpc', 'role')] };

test('the first record of an id wins; the base graph is never replaced or mutated', () => {
  const before = JSON.stringify(base);
  const m = mergeFleet(base, [
    { nodes: [N('co:ntpc', 'NTPC (energy fleet)'), N('energy:a')], edges: [] },
    { nodes: [N('energy:a', 'A again'), N('scheme:s')], edges: [] },
  ]);
  assert.deepEqual(m.nodes.map((n) => n.id), ['co:ntpc', 'pol:x', 'energy:a', 'scheme:s']);
  assert.equal(m.nodes[0].label, 'NTPC (roster)');
  assert.equal(m.nodes[2].label, 'energy:a');
  assert.equal(JSON.stringify(base), before);
});

test('edges de-duplicate on s|pred|t|id: a repeated claim goes, a distinct claim on the same pair stays', () => {
  const m = mergeFleet(base, [
    {
      nodes: [N('energy:a')],
      edges: [
        E('pol:x', 'co:ntpc', 'role'), // repeats a base edge exactly
        E('energy:a', 'co:ntpc', 'own', 'c1'),
        E('energy:a', 'co:ntpc', 'own', 'c1'), // repeated claim
        E('energy:a', 'co:ntpc', 'own', 'c2'), // same pair, different claim
      ],
    },
  ]);
  assert.deepEqual(m.edges.map((e) => e.id ?? 'base'), ['base', 'c1', 'c2']);
  assert.deepEqual(m.heldEdges, []);
});

test('an edge with an endpoint outside the merged graph is held, not drawn — including denials answering a claim', () => {
  const contra = { id: 'c3', s: 'energy:a', t: 'claim:c1', pred: 'contra', tier: 'reported', srcs: [['x', 'https://example.org']] };
  const m = mergeFleet(base, [
    { nodes: [N('energy:a')], edges: [E('energy:a', 'co:missing', 'own', 'c4'), contra] },
    // An energy claim may land on a node the welfare fleet supplies.
    { nodes: [N('scheme:s')], edges: [] },
  ]);
  assert.deepEqual(m.heldEdges.map((e) => e.id), ['c4', 'c3']);
  const cross = mergeFleet(base, [{ nodes: [], edges: [E('pol:x', 'scheme:s', 'role', 'c5')] }, { nodes: [N('scheme:s')], edges: [] }]);
  assert.deepEqual(cross.edges.map((e) => e.id ?? 'base'), ['base', 'c5']);
});

test('five fleets merge in order; a finance loan lands on an energy node and keeps its terms; empty fleets add nothing', () => {
  const terms = { instrument: 'IPF', ratePct: null, conditions: ['procurement under lender rules'] };
  const loan = { ...E('fin:lender', 'energy:a', 'loan', 'wb:c001'), a: 830, terms };
  const m = mergeFleet(base, [
    { nodes: [N('energy:a')], edges: [] },
    { nodes: [], edges: [] },
    { nodes: [N('fin:lender')], edges: [loan] },
    { nodes: [], edges: [] },
    { nodes: [], edges: [] },
  ]);
  assert.deepEqual(m.nodes.map((n) => n.id), ['co:ntpc', 'pol:x', 'energy:a', 'fin:lender']);
  const e = m.edges.find((x) => x.id === 'wb:c001');
  assert.equal(e.pred, 'loan');
  assert.deepEqual(e.terms, terms);
  assert.deepEqual(m.heldEdges, []);
});
