// node --test scripts/finance/fetch-worldbank.test.mjs
// The builder against a recorded 2-project fixture (one Active IBRD loan, one Pipeline
// project) and a 3-year PA.NUS.FCRF fixture: conversion, id resolution, terms.instrument,
// pipeline exclusion from totals, provenance hashes and the contract's amount rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, sha16, toCrore, rateFor, fxTable, isoDate, resolveName, inventoryIndex, splitAgencies, norm, slug, NEW, ministryId, V3_URL, V2_URL, FX_URL } from './fetch-worldbank.mjs';
import { amountProblem, ISO_DATE, TERMS_KEYS } from '../lib/vocab.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const rd = (f) => readFileSync(join(HERE, f), 'utf8');
const inventory = JSON.parse(rd('id-inventory.json'));
const v3 = rd('fixtures/wb-2.json');
const v2 = rd('fixtures/wb-2-v2.json');
const fx = rd('fixtures/fx-3y.json');

const run = () => build({
  v3Pages: [{ url: V3_URL(0), text: v3 }],
  v2Pages: [{ url: V2_URL(0), text: v2 }],
  fx: { url: FX_URL, text: fx },
  inventory, asOf: '2026-09-26',
  lenderPages: [{ id: 'fin:ibrd', url: 'https://www.worldbank.org/en/who-we-are/ibrd', ok: true }],
});

test('two projects give two loan claims, both IBRD, in id order', () => {
  const { doc, totals } = run();
  assert.equal(totals.projects, 2);
  assert.equal(doc.claims.length, 2);
  assert.deepEqual(doc.claims.map((c) => c.s), ['fin:ibrd', 'fin:ibrd']);
  assert.deepEqual(doc.claims.map((c) => c.pred), ['loan', 'loan']);
  assert.deepEqual(doc.claims.map((c) => c.tier), ['documented', 'documented']);
  assert.equal(doc.claims[0].lab, 'P178253 — Uttar Pradesh Agriculture Growth and Rural Enterprise Ecosystem Strengthening Project');
  assert.deepEqual(doc.claims[0].srcs, [['World Bank', 'https://projects.worldbank.org/en/projects-operations/project-detail/P178253']]);
});

test('US$ converts to ₹ crore at the PA.NUS.FCRF rate of the approval year, stated in d', () => {
  const { doc } = run();
  const c = doc.claims[0];
  const expected = Math.round((325100000 * 83.669281580941) / 1e7 * 100) / 100; // 2720.09
  assert.equal(c.a, expected);
  assert.equal(c.a, 2720.09);
  assert.equal(toCrore(325100000, 83.669281580941), 2720.09);
  assert.match(c.d, /^US\$325\.1 m at ₹83\.67\/US\$ \(WB PA\.NUS\.FCRF, 2024\)/);
  assert.equal(c.benefit.amountCr, c.a);
  assert.equal(amountProblem(c), null);
});

test('an approval year past the series takes the latest rate and says so', () => {
  const t = fxTable(JSON.parse(fx));
  assert.deepEqual([t.first, t.last], [2023, 2025]);
  assert.equal(rateFor(t, 2024).rate, 83.669281580941);
  assert.match(rateFor(t, 2027).note, /WB PA\.NUS\.FCRF, 2025 — latest available, 2027 not yet published/);
  assert.equal(rateFor(t, 1955), null);
  const { doc } = run();
  assert.match(doc.claims[1].d, /US\$50\.4 m at ₹87\.16\/US\$ \(WB PA\.NUS\.FCRF, 2025 — latest available, 2027 not yet published\)/);
});

test('ids resolve against the inventory: DEA → Ministry of Finance, state departments → the state government', () => {
  const { doc } = run();
  assert.equal(doc.claims[0].t, 'min:ministry-of-finance');
  assert.equal(doc.claims[1].t, 'min:ministry-of-finance');
  assert.equal(doc.claims[0].benefit.who, 'energy:state-uttar-pradesh');
  assert.equal(doc.claims[0].benefit.how, 'implements the loan-funded programme');
  assert.equal(doc.claims[0].benefit.confidence, 'documented');
  assert.equal(doc.claims[1].benefit.who, 'energy:govt-of-gujarat');
  const ids = doc.entities.map((e) => e.id);
  assert.deepEqual(ids, ['energy:govt-of-gujarat', 'energy:state-uttar-pradesh', 'fin:ibrd', 'fin:ida', 'min:ministry-of-finance']);
  const up = doc.entities.find((e) => e.id === 'energy:state-uttar-pradesh');
  assert.equal(up.st, 'up');
  assert.equal(up.ty, 'state');
  assert.ok(up.al.includes('Department of Agriculture, Government of Uttar Pradesh'));
  const gj = doc.entities.find((e) => e.id === 'energy:govt-of-gujarat');
  assert.equal(gj.st, 'gj');
  const mof = doc.entities.find((e) => e.id === 'min:ministry-of-finance');
  assert.equal(mof.st, 'dl');
  assert.ok(mof.al.includes('Department of Economic Affairs, Government of India'));
  assert.equal(mof.resolved, true);
  for (const e of doc.entities) {
    assert.ok(e.srcs.length >= 1, `${e.id} has sources`);
    assert.ok(Array.isArray(e.d));
  }
  const ibrd = doc.entities.find((e) => e.id === 'fin:ibrd');
  assert.equal(ibrd.ty, 'fund');
  assert.equal(ibrd.fam, 'capital');
  assert.equal(ibrd.st, null);
  assert.equal(ibrd.srcs.length, 2, 'the opened IBRD page joins the API as a source');
});

test('the resolver alone: Union spellings, state governments, hand map, new fin: ids, generic names', () => {
  const idx = inventoryIndex(inventory);
  for (const s of ['India', 'Republic of India', 'INDIA', 'The Republic of India', 'Government of India', 'DEA', 'Department of Economic Affairs', 'Ministry of Finance, Department of Economic Affairs', 'department of economic affairs, Ministry of Finanace, Government of India', 'India (Department of Economic Affairs, Government of India)']) {
    assert.equal(resolveName(s, idx, 'borrower')?.id, 'min:ministry-of-finance', s);
  }
  assert.equal(resolveName('Government of Tamil Nadu', idx, 'borrower').id, 'energy:state-tamil-nadu');
  assert.equal(resolveName('State Government of Uttar Pradesh', idx, 'borrower').id, 'energy:state-uttar-pradesh');
  const kl = resolveName('Government of Kerala', idx, 'borrower');
  assert.deepEqual([kl.id, kl.st, kl.ty, kl.isNew], ['fin:state-kerala', 'kl', 'state', true]);
  assert.equal(resolveName('Odisha Water Resource Department', idx, 'agency').id, 'energy:state-odisha');
  assert.equal(resolveName('Kerala: Department of Revenue and Disaster Management', idx, 'agency').id, 'fin:state-kerala');
  assert.equal(resolveName('State Bank of India', idx, 'borrower').id, 'co:state-bank-of-india');
  assert.equal(resolveName('TANGEDCO Tamil Nadu', idx, 'agency').id, 'energy:tangedco');
  assert.equal(resolveName('Central Water Commission , Ministry of Jal Shakti', idx, 'agency').id, 'fin:central-water-commission');
  assert.equal(resolveName('Department of Water Resources, RD & GR, Ministry of Jal Shakti', idx, 'agency').id, 'min:ministry-of-jal-shakti');
  const nhai = resolveName('National Highways Authority of India', idx, 'agency');
  assert.deepEqual([nhai.id, nhai.ty, nhai.st], ['fin:nhai', 'agency', 'dl']);
  const novel = resolveName('Bihar Rural Livelihoods Promotion Society', idx, 'agency');
  assert.deepEqual([novel.id, novel.ty, novel.st, novel.isNew], ['fin:bihar-rural-livelihoods-promotion-society', 'agency', 'br', true]);
  assert.equal(resolveName('Water Resources Department', idx, 'agency'), null, 'a generic department with no state is not placed');
  assert.equal(resolveName('Water Resources Department', idx, 'agency', 'mh').id, 'energy:state-maharashtra');
  assert.deepEqual(splitAgencies('Maharashtra Institution for Transformation (MITRA),State of Maharashtra'), ['Maharashtra Institution for Transformation (MITRA)', 'State of Maharashtra']);
  assert.deepEqual(splitAgencies('Ministry of Water Resources, River Development and Ganga Rejuvenation'), ['Ministry of Water Resources, River Development and Ganga Rejuvenation']);
  assert.equal(norm('Govt. of Maharasthra, Water Resources Dept.'), 'government of maharashtra water resources department');
  assert.ok(slug('Agricultural Promotion and Investment Corporation of Odisha Limited').length <= 64);
  assert.ok(!slug('Agricultural Promotion and Investment Corporation of Odisha Limited').endsWith('-limi'));
});

test('terms carry the v2 lending instrument and only the contract keys', () => {
  const { doc } = run();
  assert.equal(doc.claims[0].terms.instrument, 'Investment Project Financing');
  assert.equal(doc.claims[1].terms.instrument, 'Program-for-Results Financing');
  for (const c of doc.claims) {
    assert.deepEqual(Object.keys(c.terms), TERMS_KEYS);
    assert.deepEqual(c.terms.conditions, []);
    assert.equal(c.terms.ratePct, null);
  }
});

test('dates are ISO reduced precision from both API date shapes', () => {
  assert.equal(isoDate('2027-07-15T00:00:00Z'), '2027-07-15');
  assert.equal(isoDate('9/30/2030 12:00:00 AM'), '2030-09-30');
  assert.equal(isoDate('2032-12-31'), '2032-12-31');
  assert.equal(isoDate(null), null);
  const { doc } = run();
  assert.equal(doc.claims[0].from, '2024-12-12');
  assert.equal(doc.claims[0].to, '2030-09-30');
  for (const c of doc.claims) for (const k of ['from', 'to']) if (c[k]) assert.match(c[k], ISO_DATE);
});

test('pipeline projects are kept, flagged in d and excluded from every total', () => {
  const { doc, totals } = run();
  const pipe = doc.claims[1];
  assert.match(pipe.d, /PIPELINE — approval date in the future; not yet a loan; excluded from totals/);
  assert.doesNotMatch(doc.claims[0].d, /PIPELINE/);
  assert.equal(pipe.a, null, 'a pipeline operation is not a loan yet: no ₹ amount on the edge');
  assert.equal(pipe.benefit.amountCr, null);
  assert.match(pipe.d, /US\$50\.4 m at ₹87\.16\/US\$ .* — ₹ amount not stated: pipeline, not yet approved/);
  assert.equal(amountProblem(pipe), null, 'the amount rule accepts it because d says "amount not stated"');
  assert.equal(totals.noRupee, 0, 'a pipeline claim is not a pre-1960 conversion gap');
  assert.equal(totals.pipeline, 1);
  assert.equal(totals.claims, 2);
  assert.equal(totals.croreExclPipeline, 2720.09);
  assert.equal(totals.usdMExclPipeline, 325.1);
  assert.equal(doc.provenance.totals.croreExclPipeline, 2720.09);
  assert.deepEqual(doc.provenance.byYear, [{ year: 2024, claims: 1, usdM: 325.1, crore: 2720.09 }]);
  assert.deepEqual(doc.provenance.byState.map((r) => r.st), ['up'], 'the pipeline Gujarat project is not in the state table');
  assert.equal(doc.provenance.byLender['fin:ibrd'].claims, 1);
  assert.deepEqual(doc.provenance.eras.nda, { claims: 1, usdM: 325.1, crore: 2720.09 });
  assert.equal(doc.provenance.eras.upa.claims, 0);
  assert.match(doc.symmetryCheck, /NDA \(2014-05-26 to 2026-09-26\) 1 claims, US\$325 m, ₹2,720 crore/);
  const ibrdShare = doc.baseRates.find((r) => /from IBRD/.test(r.property));
  assert.deepEqual([ibrdShare.numerator, ibrdShare.denominator], [325, 325]);
  assert.equal(doc.projects.length, 2);
  assert.equal(doc.projects.find((p) => p.id === 'P517285').pipeline, true);
});

test('provenance records sha256 (16 hex) of every page body and a run id over all bodies', () => {
  const { doc, runId } = run();
  assert.equal(runId, sha16([v3, v2, fx].join('\n')));
  assert.equal(doc.provenance.runId, runId);
  assert.match(runId, /^[0-9a-f]{16}$/);
  assert.deepEqual(doc.provenance.pages.map((p) => p.api), ['v3', 'v2', 'indicator']);
  assert.equal(doc.provenance.pages[0].sha256_16, sha16(v3));
  assert.equal(doc.provenance.pages[0].rows, 2);
  assert.ok(doc.sources.some(([, u]) => u === FX_URL));
  assert.ok(doc.sources.some(([, u]) => u === V3_URL(0)));
});

test('the file has the contract shape: role-free, no narratives, voids, base rates, gaps, symmetry sentence', () => {
  const { doc } = run();
  for (const k of ['asOf', 'domain', 'scope', 'sources', 'entities', 'claims', 'voids', 'narratives', 'symmetryCheck', 'baseRates', 'gaps']) assert.ok(k in doc, k);
  assert.equal(doc.asOf, '2026-09-26');
  assert.equal(doc.domain, 'worldbank-projects');
  assert.deepEqual(doc.narratives, []);
  assert.ok(doc.voids.some((v) => /conditions/i.test(v.what)));
  assert.ok(doc.gaps.length >= 5);
  assert.ok(doc.baseRates.every((r) => Number.isFinite(r.numerator) && Number.isFinite(r.denominator) && r.srcs.length));
  assert.equal(doc.claims.filter((c) => c.pred === 'role').length, 0);
  assert.equal(doc.entities.filter((e) => e.ty === 'person').length, 0);
  assert.ok(doc.claims.every((c) => c.srcs.length >= 1 && ['documented', 'reported', 'alleged', 'analytic'].includes(c.tier)));
  const ids = new Set(doc.entities.map((e) => e.id));
  for (const c of doc.claims) { assert.ok(ids.has(c.s), c.s); assert.ok(ids.has(c.t), c.t); assert.ok(ids.has(c.benefit.who), c.benefit.who); }
  const aliases = new Map();
  for (const e of doc.entities) for (const a of e.al) { const k = a.toLowerCase(); assert.ok(!aliases.has(k) || aliases.get(k) === e.id, `alias ${a} on one entity only`); aliases.set(k, e.id); }
});

test('no NEW id duplicates a node the inventory already has', () => {
  const key = (x) => norm(String(x).replace(/\s*\([^)]*\)\s*/g, ' '));
  const inv = new Map();
  for (const e of inventory.ids) for (const n of [e.label, ...(e.al ?? [])]) for (const k of [key(n), norm(n)]) if (k && !inv.has(k)) inv.set(k, e.id);
  for (const [id, n] of Object.entries(NEW)) {
    for (const name of [n.label, ...(n.al ?? [])]) {
      for (const k of [key(name), norm(name)]) assert.ok(!inv.has(k), `${id} "${name}" is inventory id ${inv.get(k)}`);
    }
    assert.ok(!/^fin:ministry-/.test(id), `${id}: a Union ministry is a national min: node, not a fin: id`);
  }
  const idx = inventoryIndex(inventory);
  assert.equal(resolveName('Solar Energy Corporation of India Limited', idx, 'agency').id, 'seci');
  assert.equal(resolveName('SECI', idx, 'agency').id, 'seci');
  assert.equal(resolveName('Electronics Corporation of Tamil Nadu Limited', idx, 'agency').id, 'wel:elcot');
  assert.equal(resolveName('National Mission for Clean Ganga, Ministry of Jal Shakti', idx, 'agency').id, 'fin:nmcg', 'spelt as contracts.json spells it');
});

test('Union ministries resolve to the national min: ids src/graph/build.ts derives from cabinet.json', () => {
  const cabinet = JSON.parse(readFileSync(join(HERE, '..', '..', 'research', 'raw', 'cabinet.json'), 'utf8'));
  const invIds = new Set(inventory.ids.map((e) => e.id));
  for (const m of cabinet.ministers) for (const p of m.portfolios) assert.ok(invIds.has(ministryId(p)), `${ministryId(p)} (${p}) is in the inventory`);
  const idx = inventoryIndex(inventory);
  const cases = [
    ['Ministry of Health and Family Welfare', 'min:ministry-of-health-and-family-welfare'],
    ['Ministry of Human Resource Development', 'min:ministry-of-education'],
    ['Ministry of Urban Development', 'min:ministry-of-housing-and-urban-affairs'],
    ['Ministry of Road Transport and Highways', 'min:ministry-of-road-transport-and-highways'],
    ['Ministry of Skill Development and Entrepreneurship', 'min:ministry-of-skill-development-and-entrepreneurship-independent-charge-'],
    ['Department of Personnel and Training, Ministry of Personnel, Public Grievances and Pensions', 'min:ministry-of-personnel-public-grievances-and-pensions'],
    ['Ministry of Tourism', 'min:ministry-of-tourism'],
  ];
  for (const [name, id] of cases) {
    const r = resolveName(name, idx, 'agency');
    assert.equal(r.id, id, name);
    assert.equal(r.ty, 'ministry', name);
  }
  const novel = resolveName('Ministry of Imaginary Affairs', idx, 'agency');
  assert.deepEqual([novel.id, novel.ty], ['min:ministry-of-imaginary-affairs', 'ministry'], 'a ministry outside cabinet.json still takes the min: rule');
  assert.equal(resolveName('Ministry of Health and Family Welfare', idx, 'agency').al.includes('MoHFW'), true);
});
