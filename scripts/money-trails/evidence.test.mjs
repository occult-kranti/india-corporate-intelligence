import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { loadMoneyTrails } from './load.mjs';
import { validateMoneyTrailCatalog, validateMoneyTrailManifest, validateMoneyTrailPrivacy } from './validate.mjs';

const api = await loadMoneyTrails();
const ns = 'money-trails-test', id = (kind, name) => `${ns}:${kind}:${name}`;
const source = { id: id('source', 'primary'), originalId: 'primary', namespace: ns, title: 'Published financial disclosure', url: 'https://example.gov.in/disclosure', publisher: 'Public authority', publishedAt: '2024-03-31', retrievedAt: '2026-10-07', locator: 'Table 4', summary: 'Statement of payments', tier: 'documented', limitations: [] };
const geo = { scope: 'unknown', stateCodes: [], localityIds: [], basis: 'unknown', note: 'No transaction location is inferred.', sourceIds: [source.id] };
const dims = { namespace: ns, sourceIds: [source.id], domains: ['public-funds'], layers: ['funding'], geography: [geo], route: '/money-trails', limitations: [] };
const entity = name => ({ ...dims, id: id('entity', name), originalId: name, label: name, type: 'company', resolved: true, identityBasis: 'Exact retained public legal identifier', summary: name });
const amount = { value: 25, currency: 'INR', unit: 'crore', stage: 'Actual payment disclosed', period: 'FY2023-24' };
const edge = (name, from = 'payer', to = 'payee', patch = {}) => ({ ...dims, id: id('relationship', name), originalId: name, from: id('entity', from), to: id('entity', to), kind: 'payment', label: name, summary: 'Payment as stated in the source', tier: 'documented', status: 'disclosed', statusAsOf: '2026-10-07', fromDate: '2024-03-31', toDate: null, dateBasis: 'Disclosure period end', amounts: [amount], recordIds: [], responseIds: [], alternativeExplanations: [], falsifier: null, ...patch });
const record = (name, patch = {}) => ({ ...dims, id: id('record', name), originalId: name, title: name, summary: name, kind: 'investigation-case', tier: 'documented', status: 'reviewed', statusAsOf: '2026-10-07', fromDate: '2024-03-31', toDate: null, dateBasis: 'Source publication date', entityIds: [id('entity', 'payer'), id('entity', 'payee')], relationshipIds: [id('relationship', 'payment')], response: 'Supplier states work was delivered.', alternativeExplanations: ['Ordinary payment for delivered work.'], falsifier: 'Produce reconciled service and payment records.', amounts: [], period: 'FY2023-24', ...patch });
const hop = (patch = {}) => ({ id: id('hop', 'payment'), title: 'Payment record', summary: 'The public statement discloses a payment.', basis: 'documented-financial-disclosure', flowState: 'documented-transfer', fromEntityId: id('entity', 'payer'), toEntityId: id('entity', 'payee'), entityIds: [id('entity', 'payer'), id('entity', 'payee')], relationshipIds: [id('relationship', 'payment')], recordIds: [id('record', 'case')], sourceIds: [source.id], sourceLocators: [{ sourceId: source.id, locator: 'Table 4, row 8', role: 'supports', sourceFamily: 'annual-report-2024' }], date: '2024-03-31', dateBasis: 'Statement date; transaction day not established.', financialStage: 'Disclosed actual payment', amountRefs: [{ kind: 'relationship', id: id('relationship', 'payment'), amountIndex: 0 }], responseRecordIds: [], counterEvidenceRecordIds: [], response: 'Supplier states ordinary services were delivered.', alternatives: ['Ordinary contracted consideration.'], missingNextDocument: 'Invoice and service certification', documentHolder: 'Contracting department', limitations: [], ...patch });
const hypothesis = (patch = {}) => ({ id: id('hypothesis', 'delivery'), question: 'Was the payment matched by certified delivery?', observation: 'Public statement contains no invoice-level service certification.', expectedDocumentaryFootprints: ['Invoice tied to the contract and service certification'], supportingEvidence: [{ kind: 'relationship', id: id('relationship', 'payment') }], refutingEvidence: [], disconfirmationTest: 'Matching verified invoices and signed acceptance certificates would narrow this question to a disclosure gap.', documentHolder: 'Contracting department', neededRecords: ['Invoice register and acceptance certificates'], status: 'open', limitations: ['Absence from public archive is not evidence of non-delivery.'], ...patch });
function fixture() {
  const registry = { updatedAt: '2026-10-07', entities: [entity('payer'), entity('payee')], relationships: [edge('payment')], records: [record('case')], sources: [source], states: [], localities: [], coverage: [], held: [], methodology: [] };
  const catalog = { schemaVersion: 1, namespace: ns, cutoff: '2026-10-07', trails: [{ id: id('trail', 'case'), title: 'Payment investigation', city: 'delhi', caseRecordId: id('record', 'case'), question: 'What happened to this payment?', conclusion: 'Public record stops at recipient; use invoices to establish performance.', sourceStatus: 'Public disclosure, not a finding of misconduct.', cutoff: '2026-10-07', hopIds: [id('hop', 'payment')], hypothesisIds: [id('hypothesis', 'delivery')], limitations: ['One retained payment record; no national coverage claim.'] }], hops: [hop()], hypotheses: [hypothesis()] };
  return { registry, catalog };
}
const errorsFor = mutate => { const fixtureData = fixture(); mutate(fixtureData); return validateMoneyTrailCatalog(fixtureData.catalog, fixtureData.registry); };

test('empty authored input produces no generated trails, graph or completeness claim', () => {
  const { registry } = fixture();
  const view = api.getMoneyTrailsView(registry, {}, []);
  assert.equal(view.empty, true); assert.equal(view.counts.trails, 0);
  assert.equal(api.getMoneyTrailDetail(registry, 'absent', []), null);
  assert.equal(api.exportMoneyTrailEvidence(registry, 'absent', []), null);
  assert.equal('completeness' in view, false);
});

test('valid evidence step keeps original amount stage and never produces a sum', () => {
  const { registry, catalog } = fixture();
  assert.deepEqual(validateMoneyTrailCatalog(catalog, registry), []);
  const detail = api.getMoneyTrailDetail(registry, catalog.trails[0].id, [catalog]);
  assert.deepEqual(detail.hops[0].amounts, [amount]);
  assert.equal(detail.metrics.byBasis['documented-financial-disclosure'], 1);
  assert.equal('totalAmount' in detail.metrics, false);
});

test('gap with a named recipient cannot manufacture a financial edge or zero amount', () => {
  const { registry, catalog } = fixture();
  catalog.hops[0] = hop({ basis: 'unresolved-cash-path-stop', flowState: 'gap', relationshipIds: [], amountRefs: [] });
  const detail = api.getMoneyTrailDetail(registry, catalog.trails[0].id, [catalog]);
  assert.equal(detail.pathRegistry.relationships.length, 0);
  assert.deepEqual(detail.hops[0].amounts, []); assert.equal(detail.metrics.gaps, 1);
  catalog.hops[0].relationshipIds.push(id('relationship', 'payment'));
  assert.ok(validateMoneyTrailCatalog(catalog, registry).some(error => error.includes('gap must not create')));
});

test('court container cannot promote an agency claim to a documented payment', () => {
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].basis = 'court-recorded-agency-allegation'; }).some(error => error.includes('agency allegation')));
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].basis = 'agency-published-allegation'; }).some(error => error.includes('agency allegation')));
});

test('contract award and undrawn sanction cannot be converted into actual receipt', () => {
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].basis = 'contract-commitment'; }).some(error => error.includes('commitment cannot')));
  assert.ok(errorsFor(({ registry }) => { registry.relationships[0].amounts = [{ ...amount, stage: 'Loan sanctioned, not drawn' }]; }).some(error => error.includes('cannot be a documented transfer')));
});

test('reported financial source remains reported without branding ordinary payment an allegation', () => {
  const { registry, catalog } = fixture(); registry.relationships[0].tier = 'reported';
  assert.ok(validateMoneyTrailCatalog(catalog, registry).some(error => error.includes('non-documentary relationship')));
  catalog.hops[0].flowState = 'reported-transfer';
  assert.deepEqual(validateMoneyTrailCatalog(catalog, registry), []);
  assert.equal(api.getMoneyTrailDetail(registry, catalog.trails[0].id, [catalog]).pathRegistry.relationships.length, 1);
});

test('financial hop rejects reversed endpoints and unrelated amount owners', () => {
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].fromEntityId = id('entity', 'payee'); catalog.hops[0].toEntityId = id('entity', 'payer'); }).some(error => error.includes('financial direction')));
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].amountRefs[0].amountIndex = 9; }).some(error => error.includes('missing amount')));
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].amountRefs.push({ ...catalog.hops[0].amountRefs[0] }); }).some(error => error.includes('duplicate amount reference')));
});

test('response and refuting evidence survive closure beyond the event period', () => {
  const { registry, catalog } = fixture();
  const response = record('response', { kind: 'response', fromDate: '2026-10-01', relationshipIds: [], response: 'Delivery documents were produced.' });
  registry.records.push(response); registry.relationships[0].responseIds.push(response.id);
  catalog.hypotheses[0].refutingEvidence.push({ kind: 'record', id: response.id });
  const packet = api.exportMoneyTrailEvidence(registry, catalog.trails[0].id, [catalog]);
  assert.ok(packet.records.some(row => row.id === response.id));
  assert.deepEqual(packet.missingIds, []);
});

test('map-only record projection keeps financial geography usable without adding an owner to the cash graph', () => {
  const { registry, catalog } = fixture();
  registry.entities.push(entity('owner'));
  registry.relationships.push(edge('ownership', 'owner', 'payee', { kind: 'ownership', amounts: [] }));
  registry.records[0].entityIds.push(id('entity', 'owner'));
  registry.records[0].relationshipIds.push(id('relationship', 'ownership'));
  const detail = api.getMoneyTrailDetail(registry, catalog.trails[0].id, [catalog]);
  assert.ok(!detail.pathMapRegistry.entities.some(row => row.id === id('entity', 'owner')));
  assert.deepEqual(detail.pathMapRegistry.records[0].entityIds.sort(), [id('entity', 'payee'), id('entity', 'payer')].sort());
  assert.ok(detail.pathMapRegistry.records[0].limitations.some(value => value.includes('Map-only selection projection')));
  assert.ok(registry.records[0].entityIds.includes(id('entity', 'owner')));
  const packet = api.exportMoneyTrailEvidence(registry, catalog.trails[0].id, [catalog]);
  assert.ok(packet.records[0].entityIds.includes(id('entity', 'owner')));
  assert.equal(packet.records[0].limitations.length, 0);
});

test('source-only counterevidence stays in export without a fabricated edge', () => {
  const { registry, catalog } = fixture();
  const counter = { ...source, id: id('source', 'counter'), title: 'Independent corrective source' }; registry.sources.push(counter);
  catalog.hypotheses[0].refutingEvidence.push({ kind: 'source', id: counter.id });
  const packet = api.exportMoneyTrailEvidence(registry, catalog.trails[0].id, [catalog]);
  assert.ok(packet.sources.some(row => row.id === counter.id)); assert.equal(packet.relationships.length, 1);
});

test('exact context expansion is bounded to two hops and excludes payments and namesakes', () => {
  const { registry } = fixture(); registry.entities.push(entity('parent'), entity('director'), entity('third'), entity('namesake'));
  registry.relationships.push(edge('owner', 'payee', 'parent', { kind: 'ownership', amounts: [] }), edge('director', 'parent', 'director', { kind: 'role', amounts: [] }), edge('third', 'director', 'third', { kind: 'role', amounts: [] }));
  const context = api.getMoneyTrailConnectedContext(registry, [id('entity', 'payee')], 99);
  assert.equal(context.depth, 2); assert.deepEqual(context.relationships.map(row => row.originalId).sort(), ['director', 'owner']);
  assert.ok(!context.entityIds.includes(id('entity', 'namesake')));
});

test('closure reports missing original sources and never substitutes similar names', () => {
  const { registry, catalog } = fixture(); registry.sources = [];
  const detail = api.getMoneyTrailDetail(registry, catalog.trails[0].id, [catalog]);
  assert.ok(detail.missingIds.includes(source.id)); assert.equal(detail.pathRegistry.relationships.length, 0);
});

test('catalog rejects duplicate stable IDs, unsupported calendar dates and orphan hypotheses', () => {
  assert.ok(errorsFor(({ catalog }) => catalog.hops.push(structuredClone(catalog.hops[0]))).some(error => error.includes('Duplicate')));
  assert.ok(errorsFor(({ catalog }) => { catalog.hops[0].date = '2024-02-30'; }).some(error => error.includes('invalid exact event date')));
  assert.ok(errorsFor(({ catalog }) => catalog.trails[0].hypothesisIds.push(id('hypothesis', 'absent'))).some(error => error.includes('missing hypothesis')));
});

test('hypotheses require disconfirmation and reject operational concealment instructions', () => {
  assert.ok(errorsFor(({ catalog }) => { catalog.hypotheses[0].disconfirmationTest = ''; }).some(error => error.includes('disconfirmationTest')));
  assert.ok(errorsFor(({ catalog }) => { catalog.hypotheses[0].observation = 'Instructions to conceal payments in this route'; }).some(error => error.includes('operational evasion')));
});

test('private account identifiers are rejected while redacted source descriptions remain usable', () => {
  assert.ok(validateMoneyTrailPrivacy({ bankAccountNumber: '123456789012' }).length);
  assert.ok(validateMoneyTrailPrivacy('Account number: 123456789012').length);
  assert.deepEqual(validateMoneyTrailPrivacy('Account number [redacted]; publicly reported aggregate ₹25 crore.'), []);
});

test('source archive verifies actual bytes and refuses an unbound or out-of-tree source', () => {
  const root = mkdtempSync(join(tmpdir(), 'money-trails-evidence-'));
  try {
    const body = Buffer.from('Public table: payment disclosure without account numbers.'); writeFileSync(join(root, 'source.txt'), body);
    const manifest = { artifacts: [{ path: 'source.txt', bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') }], sourceArtifacts: [{ sourceId: source.id, paths: ['source.txt'] }] };
    assert.deepEqual(validateMoneyTrailManifest(manifest, [source.id], root), []);
    assert.ok(validateMoneyTrailManifest(manifest, ['missing-source'], root).some(error => error.includes('missing archived')));
    writeFileSync(join(root, 'source.txt'), 'changed');
    assert.ok(validateMoneyTrailManifest(manifest, [source.id], root).some(error => error.includes('digest mismatch')));
    manifest.artifacts[0].path = '../outside.txt';
    assert.ok(validateMoneyTrailManifest(manifest, [source.id], root).some(error => error.includes('out-of-repository')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
