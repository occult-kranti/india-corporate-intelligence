import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Compile the actual pure model with the project's TypeScript dependency.
// No parallel implementation or hand-stripped type syntax is used as an oracle.
const source = readFileSync(new URL('../src/data/strategicModels.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2022 } });
const { evaluateStrategy, strategySensitivity, STRATEGIC_ROLES } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const input = { benefit: 40, detection: .35, sanction: 100, complianceCost: 10 };

test('expected utilities and threshold reflect weighted outcomes', () => {
  const result = evaluateStrategy(input);
  assert.equal(result.lawfulUtility, -10);
  assert.equal(result.abuseUtility, 5);
  assert.equal(result.advantage, 15);
  assert.equal(result.bestResponse, 'abuse');
  assert.equal(result.threshold, .5);
  assert.equal(result.thresholdKind, 'reachable');
  assert.equal(evaluateStrategy({ ...input, detection: .5 }).bestResponse, 'indifferent');
  assert.equal(evaluateStrategy({ ...input, detection: .51 }).bestResponse, 'lawful');
});

test('detection boundary states agree with the payoff matrix', () => {
  assert.equal(evaluateStrategy({ ...input, detection: 0 }).abuseUtility, 40);
  assert.equal(evaluateStrategy({ ...input, detection: 1 }).abuseUtility, -60);
  assert.equal(evaluateStrategy({ ...input, detection: 1 }).bestResponse, 'lawful');
  const edge = evaluateStrategy({ benefit: 80, complianceCost: 20, sanction: 100, detection: 1 });
  assert.equal(edge.threshold, 1);
  assert.equal(edge.bestResponse, 'indifferent');
});

test('zero sanction and zero-valued utility cases do not divide by zero', () => {
  const noSanction = evaluateStrategy({ ...input, sanction: 0 });
  assert.equal(noSanction.threshold, null);
  assert.equal(noSanction.thresholdKind, 'no-sanction');
  assert.equal(noSanction.bestResponse, 'abuse');
  for (const detection of [0, .5, 1]) {
    assert.equal(evaluateStrategy({ benefit: 0, complianceCost: 0, sanction: 0, detection }).bestResponse, 'indifferent');
  }
  assert.equal(evaluateStrategy({ benefit: 0, complianceCost: 0, sanction: 100, detection: 0 }).threshold, 0);
  assert.equal(evaluateStrategy({ benefit: 0, complianceCost: 0, sanction: 100, detection: .01 }).bestResponse, 'lawful');
});

test('insufficient sanction makes the indifference threshold unreachable', () => {
  const result = evaluateStrategy({ ...input, sanction: 20, detection: 1 });
  assert.equal(result.threshold, 2.5);
  assert.equal(result.thresholdKind, 'unreachable');
  assert.equal(result.bestResponse, 'abuse');
});

test('floating point rounding does not invent a preference at equality', () => {
  assert.equal(evaluateStrategy({ benefit: .1, complianceCost: .2, sanction: 1, detection: .3 }).bestResponse, 'indifferent');
});

test('rejects invalid detection, non-finite inputs, negative utilities and missing fields', () => {
  for (const detection of [-.1, 1.01, Infinity, NaN, '0.5', undefined]) {
    assert.throws(() => evaluateStrategy({ ...input, detection }), RangeError);
  }
  for (const key of ['benefit', 'sanction', 'complianceCost']) {
    for (const value of [-1, Infinity, NaN, '40', undefined]) {
      assert.throws(() => evaluateStrategy({ ...input, [key]: value }), RangeError);
    }
  }
  assert.throws(() => evaluateStrategy({ benefit: 1e308, complianceCost: 1e308, sanction: 0, detection: 0 }), RangeError);
  assert.throws(() => evaluateStrategy({ benefit: 1, complianceCost: 1, sanction: 1e-320, detection: 0 }), RangeError);
});

test('sensitivity covers the entire probability interval and is monotone', () => {
  const rows = strategySensitivity(input);
  assert.equal(rows.length, 11);
  assert.equal(rows[0].detection, 0);
  assert.equal(rows.at(-1).detection, 1);
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].abuseUtility <= rows[i - 1].abuseUtility);
    assert.equal(rows[i].lawfulUtility, -10);
    assert.ok(Math.abs((rows[i - 1].abuseUtility - rows[i].abuseUtility) - 10) < 1e-12);
  }
  assert.throws(() => strategySensitivity({ ...input, detection: -1 }), RangeError);
});

test('all four roles carry a competing explanation and disconfirmation test', () => {
  assert.deepEqual(STRATEGIC_ROLES.map(role => role.id), ['official', 'supplier', 'oversight', 'researcher']);
  for (const role of STRATEGIC_ROLES) {
    assert.ok(role.lawful.length >= 3);
    assert.ok(role.alternative && role.falsifier && role.predictedTrace && role.ruleQuestions.length);
  }
});
