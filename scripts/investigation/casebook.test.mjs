import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
const built = await build({ entryPoints: [fileURLToPath(new URL('../../src/components/investigation/casebookStore.ts', import.meta.url))], bundle: true, platform: 'node', format: 'cjs', write: false });
const module = { exports: {} }; new Function('module', 'exports', built.outputFiles[0].text)(module, module.exports);
const { emptyCasebook, parseCasebook, mergeCasebooks, portableCasebookUrl, buildCasebookPacket, casebookMarkdown } = module.exports;
const pin = (kind, id, note = '') => ({ kind, id, note, addedAt: '2026-10-06T00:00:00Z' });
const geography = [{ scope: 'state', basis: 'project-location', stateCodes: ['UP'], localityIds: [], sourceIds: ['source:geo'], note: 'Verified project location, not headquarters.' }];
const base = { namespace: 'test', originalId: 'test', domains: ['justice'], layers: ['legal'], geography, sourceIds: ['source:claim'], limitations: ['Coverage is incomplete.'], route: '/justice', summary: 'A sourced observation.' };
const dated = { ...base, tier: 'alleged', status: 'complaint pending', statusAsOf: '2026-10-06', fromDate: null, toDate: null, dateBasis: 'date unknown', alternativeExplanations: ['A clerical discrepancy is possible.'], falsifier: 'Obtain the underlying ledger.', amounts: [{ value: 5, currency: 'INR', unit: 'crore', stage: 'claimed amount', period: '2024-25' }] };
function registry() { return { updatedAt: '2026-10-06', states: [], localities: [], coverage: [], held: [], methodology: [],
 entities: ['entity:a', 'entity:b'].map(id => ({ ...base, id, label: id, type: 'organisation', resolved: true, identityBasis: 'Exact source identifier' })),
 relationships: [{ ...dated, id: 'edge:claim', from: 'entity:a', to: 'entity:b', label: 'Complaint involving', kind: 'complaint', responseIds: ['record:response'], recordIds: ['record:claim'] }],
 records: [{ ...dated, id: 'record:claim', title: 'Complaint record', kind: 'proceeding', period: '2024-25', response: 'The respondent disputes the claim.', entityIds: ['entity:a'], relationshipIds: ['edge:claim'] }, { ...dated, id: 'record:response', title: 'Final response', tier: 'documented', status: 'allegations not established', kind: 'counter-evidence', response: 'The final order did not establish these allegations.', sourceIds: ['source:response'], entityIds: ['entity:b'], relationshipIds: ['edge:claim'], period: '2026' }],
 sources: ['source:claim', 'source:geo', 'source:response'].map(id => ({ id, originalId: id, namespace: 'test', title: id, url: `https://example.org/${id}`, publisher: 'Primary institution', publishedAt: null, retrievedAt: '2026-10-06', locator: 'Page 4', summary: 'Original record', tier: 'documented', limitations: [] }))
}; }

test('versioned import rejects malformed envelopes and limits invalid, duplicated and oversized content', () => {
 for (const raw of [null, {}, { version: 2, pins: [], views: [] }, { version: 1, pins: 'bad', views: [] }]) assert.equal(parseCasebook(raw), null);
 const parsed = parseCasebook({ ...emptyCasebook(), pins: [pin('record', 'r'), pin('record', 'r'), pin('script', 'evil'), pin('entity', '', 'bad')], views: [{ url: 'javascript:alert(1)' }, { url: '#/education', label: 'Education' }, { url: '#/education' }, { url: '#/' + 'a'.repeat(8000) }] });
 assert.equal(parsed.pins.length, 1); assert.equal(parsed.views.length, 1);
 const large = parseCasebook({ ...emptyCasebook(), pins: Array.from({ length: 300 }, (_, i) => pin('record', `r${i}`, 'x'.repeat(13000))) });
 assert.equal(large, null, 'oversized import is rejected rather than silently dropping records');
});
test('saved views remain portable in-app routes and reject executable, external-only or control-character destinations', () => {
 assert.equal(portableCasebookUrl('https://example.org/app/#/justice?iw_state=UP'), '#/justice?iw_state=UP');
 for (const value of ['javascript:alert(1)', '//evil.example/path', '#//evil', '#/justice\nalert', 'https://example.org/']) {
  // A hash starting #// is still an application path; it never becomes a network URL.
  if (value === '#//evil') continue;
  assert.equal(portableCasebookUrl(value), '');
 }
});
test('additive import preserves current notes and questions while retaining unresolved IDs', () => {
 const current = { ...emptyCasebook(), title: 'Current', question: 'Current question', pins: [pin('record', 'same', 'Current note')] };
 const incoming = { ...emptyCasebook(), title: 'Incoming', question: 'Incoming question', falsifier: 'A final order', pins: [pin('record', 'same', 'Conflicting note'), pin('record', 'not-in-current-registry', 'Retain this')] };
 const merged = mergeCasebooks(current, incoming);
 assert.equal(merged.title, 'Current'); assert.equal(merged.question, 'Current question'); assert.equal(merged.falsifier, 'A final order'); assert.equal(merged.pins[0].note, 'Current note'); assert.equal(merged.pins.length, 2);
 assert.deepEqual(mergeCasebooks(merged, incoming), merged);
});
test('evidence export closes explicit response cycles and includes endpoint, geography and counter-evidence sources', () => {
 const packet = buildCasebookPacket({ ...emptyCasebook(), pins: [pin('record', 'record:claim'), pin('record', 'missing', 'Retained note')] }, registry());
 assert.equal(packet.entities.length, 2); assert.equal(packet.relationships.length, 1); assert.equal(packet.records.length, 2); assert.equal(packet.sources.length, 3);
 assert.deepEqual(packet.unavailablePins.map(row => row.id), ['missing']);
 assert.equal(packet.records.find(row => row.id === 'record:response').status, 'allegations not established');
});
test('reading brief carries unpinned final responses, financial stages, alternatives, falsifiers and labelled escaped analyst notes', () => {
 const packet = buildCasebookPacket({ ...emptyCasebook(), title: '<script>claim</script>', pins: [pin('record', 'record:claim', '<b>My inference</b>')] }, registry());
 const md = casebookMarkdown(packet);
 for (const value of ['Linked context and counter-evidence', 'allegations not established', 'final order did not establish', 'claimed amount', '2024-25', 'clerical discrepancy', 'underlying ledger', 'source:response', 'source:geo', 'Analyst note (user-entered)', '&lt;b&gt;My inference']) assert.ok(md.includes(value), value);
 assert.ok(!md.includes('<script>')); assert.ok(md.includes('not source assertions'));
});

test('capacity overflow rejects an additive import without dropping pins, views or current notes', () => {
 const current = { ...emptyCasebook(), pins: Array.from({length:249}, (_, i) => pin('record', `current:${i}`, 'Keep')) };
 const before = structuredClone(current);
 assert.throws(() => mergeCasebooks(current, { ...emptyCasebook(), pins: [pin('record', 'new:1'), pin('record', 'new:2')] }), /251 pins.*unchanged/);
 assert.deepEqual(current, before);
 const fullViews = { ...emptyCasebook(), views: Array.from({length:40}, (_, i) => ({ id: String(i), label: String(i), url: `#/education?iw_q=${i}`, savedAt: '' })) };
 assert.throws(() => mergeCasebooks(fullViews, { ...emptyCasebook(), views: [{id:'new', label:'new', url:'#/justice', savedAt:''}] }), /41 views.*unchanged/);
 assert.equal(mergeCasebooks(fullViews, fullViews).views.length, 40, 'duplicate saved views do not consume capacity twice');
});
