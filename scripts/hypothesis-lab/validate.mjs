#!/usr/bin/env node
/** Structural and provenance gates. These checks do not establish a claim's truth. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REVIEW_DATE = '2026-10-14';
export const TRACKS = ['oversight-services', 'political-finance', 'resources-contracts'];
export const RESEARCH_ROOT = 'research/hypothesis-lab';
const statuses = new Set(['documented', 'alleged', 'audit-finding', 'unresolved', 'contradicted']);
const assessments = new Set(['open', 'narrowed', 'contradicted', 'supported-pattern']);
const results = new Set(['unresolved', 'supports', 'narrows', 'contradicts']);
const states = new Set(['AN', 'AP', 'AR', 'AS', 'BR', 'CH', 'CG', 'DN', 'DL', 'GA', 'GJ', 'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LA', 'LD', 'MP', 'MH', 'MN', 'ML', 'MZ', 'NL', 'OD', 'PY', 'PB', 'RJ', 'SK', 'TN', 'TS', 'TR', 'UP', 'UK', 'WB']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const inside = (parent, child) => { const rel = relative(parent, child); return rel !== '' && !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`); };
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function validateStream(stream, { root = process.cwd(), verifyCaptures = true } = {}) {
  const errors = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);
  const text = (value, where) => { if (typeof value !== 'string' || !value.trim()) fail(where, 'must be nonempty text'); };
  const list = (value, where, minimum = 0) => {
    if (!Array.isArray(value)) { fail(where, 'must be an array'); return []; }
    if (value.length < minimum) fail(where, `must contain at least ${minimum} entries`);
    return value;
  };
  const texts = (value, where, minimum = 0) => list(value, where, minimum).forEach((row, i) => text(row, `${where}[${i}]`));
  const fields = (value, names, where) => names.forEach(name => text(value[name], `${where}.${name}`));
  const day = (value, where, { nullable = false, future = false } = {}) => {
    if (value === null && nullable) return;
    if (!validDay(value)) fail(where, 'must be a real YYYY-MM-DD date');
    else if (!future && value > REVIEW_DATE) fail(where, `is later than review date ${REVIEW_DATE}`);
  };
  const rows = (value, where, minimum = 0) => list(value, where, minimum).filter((row, i) => {
    if (!object(row)) { fail(`${where}[${i}]`, 'must be an object'); return false; }
    return true;
  });
  if (!object(stream)) return ['stream: must be an object'];
  if (stream.schemaVersion !== 1) fail('schemaVersion', 'must be 1');
  if (!TRACKS.includes(stream.track)) fail('track', `must be one of ${TRACKS.join(', ')}`);
  if (stream.reviewDate !== REVIEW_DATE) fail('reviewDate', `must be ${REVIEW_DATE}`);
  text(stream.scope, 'scope');
  const prefix = `hl:${stream.track}:`;
  const seen = new Set();
  const id = (value, where) => {
    text(value, where);
    if (typeof value !== 'string' || !value.startsWith(prefix)) fail(where, `must start with ${prefix}`);
    if (seen.has(value)) fail(where, `duplicate identifier ${value}`);
    seen.add(value);
  };
  const sources = rows(stream.sources, 'sources', 1), entities = rows(stream.entities, 'entities', 1), edges = rows(stream.edges, 'edges', 1), cases = rows(stream.cases, 'cases', 1);
  const sourceIds = new Set(sources.map(row => row.id)), entityIds = new Set(entities.map(row => row.id)), edgeIds = new Set(edges.map(row => row.id));
  const refs = (value, known, where, minimum = 0) => {
    const values = list(value, where, minimum);
    if (new Set(values).size !== values.length) fail(where, 'duplicate references');
    for (const ref of values) if (!known.has(ref)) fail(where, `unknown reference ${String(ref)}`);
    return values;
  };
  for (const [index, source] of sources.entries()) {
    const where = `sources[${index}]`;
    id(source.id, `${where}.id`);
    fields(source, ['title', 'publisher', 'url', 'accessedAt', 'kind', 'sourceFamily', 'inspection', 'locator', 'excerpt'], where);
    try { if (!['https:', 'http:'].includes(new URL(source.url).protocol)) throw new Error(); } catch { fail(`${where}.url`, 'must be an absolute HTTP(S) source URL'); }
    day(source.publishedAt, `${where}.publishedAt`, { nullable: true });
    if (typeof source.accessedAt !== 'string' || Number.isNaN(Date.parse(source.accessedAt))) fail(`${where}.accessedAt`, 'must be an ISO date or timestamp');
    else day(source.accessedAt.slice(0, 10), `${where}.accessedAt`);
    texts(source.limitations, `${where}.limitations`, 1);
    if (source.capturePath === null && source.sha256 === null) continue;
    if (typeof source.capturePath !== 'string' || !source.capturePath.startsWith(`${RESEARCH_ROOT}/raw/`) || source.capturePath.includes('\\') || source.capturePath.split('/').some(part => ['..', '.'].includes(part)) || isAbsolute(source.capturePath)) {
      fail(`${where}.capturePath`, `must be a safe relative path under ${RESEARCH_ROOT}/raw/`);
      continue;
    }
    if (!/^[a-f0-9]{64}$/u.test(source.sha256 ?? '')) fail(`${where}.sha256`, 'must be a lowercase SHA-256 capture digest');
    if (verifyCaptures) {
      try {
        const rawRoot = realpathSync(resolve(root, RESEARCH_ROOT, 'raw'));
        const file = realpathSync(resolve(root, source.capturePath));
        if (!inside(rawRoot, file)) { fail(`${where}.capturePath`, 'resolved path escapes the retained raw directory'); continue; }
        const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
        if (actual !== source.sha256) fail(`${where}.sha256`, `capture digest mismatch: ${source.capturePath}`);
      } catch (error) { fail(`${where}.capturePath`, `cannot read retained capture: ${error.code ?? error.message}`); }
    }
  }
  for (const [index, entity] of entities.entries()) {
    const where = `entities[${index}]`;
    id(entity.id, `${where}.id`);
    fields(entity, ['label', 'kind', 'identityBasis'], where);
    refs(entity.sourceIds, sourceIds, `${where}.sourceIds`, 1);
    if (typeof entity.resolved !== 'boolean') fail(`${where}.resolved`, 'must explicitly state true or false');
  }
  for (const [index, edge] of edges.entries()) {
    const where = `edges[${index}]`;
    id(edge.id, `${where}.id`);
    fields(edge, ['from', 'to', 'relation', 'label', 'stage', 'response'], where);
    for (const side of ['from', 'to']) if (!entityIds.has(edge[side])) fail(`${where}.${side}`, `unknown entity ${edge[side]}`);
    if (!statuses.has(edge.status)) fail(`${where}.status`, 'unrecognized evidence status');
    day(edge.date, `${where}.date`, { nullable: true });
    refs(edge.sourceIds, sourceIds, `${where}.sourceIds`, 1);
    texts(edge.limits, `${where}.limits`, 1);
    if (edge.amount !== null) {
      if (!object(edge.amount)) fail(`${where}.amount`, 'must be an amount object or null');
      else {
        if (!Number.isFinite(edge.amount.value) || edge.amount.value < 0) fail(`${where}.amount.value`, 'must be a finite nonnegative number');
        fields(edge.amount, ['currency', 'unit', 'period', 'basis'], `${where}.amount`);
        if (edge.amount.overlapGroup !== null) text(edge.amount.overlapGroup, `${where}.amount.overlapGroup`);
      }
    }
  }
  for (const [index, item] of cases.entries()) {
    const where = `cases[${index}]`;
    id(item.id, `${where}.id`);
    fields(item, ['title', 'question', 'sector', 'period', 'finding'], where);
    if (!statuses.has(item.status)) fail(`${where}.status`, 'unrecognized evidence status');
    const caseEntities = new Set(refs(item.entityIds, entityIds, `${where}.entityIds`, 1));
    const caseEdges = refs(item.edgeIds, edgeIds, `${where}.edgeIds`, 1);
    refs(item.sourceIds, sourceIds, `${where}.sourceIds`, 1);
    const endpoint = (value, at) => { if (!caseEntities.has(value)) fail(at, `entity ${String(value)} is outside this case's entityIds`); };
    for (const edgeId of caseEdges) {
      const edge = edges.find(row => row.id === edgeId);
      if (edge) { endpoint(edge.from, `${where}.edgeIds`); endpoint(edge.to, `${where}.edgeIds`); }
    }
    for (const [i, place] of rows(item.geography, `${where}.geography`, 1).entries()) {
      fields(place, ['label', 'basis'], `${where}.geography[${i}]`);
      if (place.stateCode !== null && !states.has(place.stateCode)) fail(`${where}.geography[${i}].stateCode`, 'unknown current state/UT code (Telangana is TS)');
    }
    for (const name of ['whatWeKnow', 'whatWeDoNotKnow', 'limits']) texts(item[name], `${where}.${name}`, 1);
    for (const [i, next] of rows(item.nextRecords, `${where}.nextRecords`, 1).entries()) fields(next, ['record', 'holder', 'purpose'], `${where}.nextRecords[${i}]`);
    for (const [i, claim] of rows(item.claims, `${where}.claims`, 1).entries()) {
      const at = `${where}.claims[${i}]`;
      id(claim.id, `${at}.id`);
      fields(claim, ['text', 'response', 'alternative', 'falsifier'], at);
      if (!statuses.has(claim.status)) fail(`${at}.status`, 'unrecognized evidence status');
      refs(claim.sourceIds, sourceIds, `${at}.sourceIds`, 1);
      texts(claim.missingRecords, `${at}.missingRecords`, 1);
    }
    const decision = item.decisionAnalysis;
    if (!object(decision)) fail(`${where}.decisionAnalysis`, 'required decision analysis is missing');
    else {
      day(decision.decisionDate, `${where}.decisionAnalysis.decisionDate`, { nullable: true });
      text(decision.observedOutcome, `${where}.decisionAnalysis.observedOutcome`);
      refs(decision.sourceIds, sourceIds, `${where}.decisionAnalysis.sourceIds`, 1);
      texts(decision.hindsightLimits, `${where}.decisionAnalysis.hindsightLimits`, 1);
      for (const [i, actor] of rows(decision.actors, `${where}.decisionAnalysis.actors`, 1).entries()) {
        const at = `${where}.decisionAnalysis.actors[${i}]`;
        fields(actor, ['entityId', 'authority', 'incentive'], at);
        endpoint(actor.entityId, `${at}.entityId`);
        refs(actor.evidenceSourceIds, sourceIds, `${at}.evidenceSourceIds`, 1);
      }
      for (const [i, info] of list(decision.informationThen, `${where}.decisionAnalysis.informationThen`, 1).entries()) {
        const at = `${where}.decisionAnalysis.informationThen[${i}]`;
        if (typeof info === 'string') text(info, at);
        else if (object(info)) { text(info.text, `${at}.text`); refs(info.sourceIds, sourceIds, `${at}.sourceIds`, 1); }
        else fail(at, 'must be text or a source-attributed information object');
      }
      for (const [i, option] of rows(decision.options, `${where}.decisionAnalysis.options`, 2).entries()) {
        fields(option, ['label', 'expectedObservableOutcome'], `${where}.decisionAnalysis.options[${i}]`);
        refs(option.sourceIds, sourceIds, `${where}.decisionAnalysis.options[${i}].sourceIds`, 1);
      }
    }
    const hypothesis = item.hypothesis;
    if (!object(hypothesis)) { fail(`${where}.hypothesis`, 'required hypothesis is missing'); continue; }
    const at = `${where}.hypothesis`;
    fields(hypothesis, ['proposition', 'assessmentReason', 'jurisdiction', 'comparison'], at);
    if (!assessments.has(hypothesis.assessment)) fail(`${at}.assessment`, 'unrecognized hypothesis assessment');
    day(hypothesis.nextReview, `${at}.nextReview`, { future: true });
    if (validDay(hypothesis.nextReview) && hypothesis.nextReview <= REVIEW_DATE) fail(`${at}.nextReview`, 'must be a future review date, not an invented observed outcome');
    texts(hypothesis.inferenceLimits, `${at}.inferenceLimits`, 1);
    for (const [i, rule] of rows(hypothesis.rules, `${at}.rules`, 1).entries()) {
      fields(rule, ['title', 'operativePeriod', 'requirement'], `${at}.rules[${i}]`);
      refs(rule.sourceIds, sourceIds, `${at}.rules[${i}].sourceIds`, 1);
    }
    for (const [i, alternative] of rows(hypothesis.alternatives, `${at}.alternatives`, 3).entries()) {
      fields(alternative, ['id', 'label', 'explanation', 'discriminatingRecord'], `${at}.alternatives[${i}]`);
    }
    const testIds = new Set();
    for (const [i, test] of rows(hypothesis.tests, `${at}.tests`, 2).entries()) {
      const loc = `${at}.tests[${i}]`;
      fields(test, ['id', 'question', 'expectedIfTrue', 'expectedIfAlternative', 'observation', 'nextRecord', 'holder'], loc);
      if (testIds.has(test.id)) fail(`${loc}.id`, 'duplicate discriminating test identifier');
      testIds.add(test.id);
      if (!results.has(test.result)) fail(`${loc}.result`, 'unrecognized test result');
      refs(test.sourceIds, sourceIds, `${loc}.sourceIds`, 1);
    }
    const questionIds = new Set();
    for (const [i, link] of rows(hypothesis.proposedLinks, `${at}.proposedLinks`).entries()) {
      const loc = `${at}.proposedLinks[${i}]`;
      id(link.id, `${loc}.id`);
      questionIds.add(link.id);
      fields(link, ['from', 'to', 'question', 'missingEvidence', 'disconfirmingEvidence'], loc);
      endpoint(link.from, `${loc}.from`); endpoint(link.to, `${loc}.to`);
      refs(link.sourceIds, sourceIds, `${loc}.sourceIds`, 1);
      if (Object.hasOwn(link, 'amount') || Object.hasOwn(link, 'amounts')) fail(loc, 'proposed questions cannot carry financial amounts');
      if (edgeIds.has(link.id)) fail(`${loc}.id`, 'proposed question identifier collides with an evidence edge');
      if (edges.some(edge => caseEdges.includes(edge.id) && edge.from === link.from && edge.to === link.to && (edge.label === link.question || edge.relation === link.question))) fail(loc, 'proposed question duplicates a recorded relationship');
    }
    for (const edgeId of caseEdges) if (questionIds.has(edgeId)) fail(`${where}.edgeIds`, 'proposed questions must not be included as evidence edges');
    let previous = '';
    for (const [i, event] of rows(hypothesis.chronology, `${at}.chronology`, 1).entries()) {
      const loc = `${at}.chronology[${i}]`;
      day(event.date, `${loc}.date`); text(event.event, `${loc}.event`);
      if (!['contemporaneous', 'later-outcome'].includes(event.knowledge)) fail(`${loc}.knowledge`, 'must distinguish contemporaneous information from later outcomes');
      if (validDay(event.date) && event.date < previous) fail(`${loc}.date`, 'chronology must be ordered by date');
      previous = event.date;
      if (event.knowledge === 'contemporaneous' && validDay(decision?.decisionDate) && event.date > decision.decisionDate) fail(`${loc}.knowledge`, 'event postdates decision; it cannot be contemporaneous decision information');
      refs(event.sourceIds, sourceIds, `${loc}.sourceIds`, 1);
    }
  }
  for (const [i, row] of rows(stream.searchLog, 'searchLog', 1).entries()) {
    text(row.query, `searchLog[${i}].query`); day(row.date, `searchLog[${i}].date`);
    if (!Number.isInteger(row.requestedResults) || row.requestedResults < 0) fail(`searchLog[${i}].requestedResults`, 'must be a nonnegative integer, not an inspected-source count');
  }
  for (const [i, row] of rows(stream.coverage, 'coverage', 1).entries()) {
    fields(row, ['institution', 'jurisdiction', 'period', 'status', 'gap', 'nextRecord'], `coverage[${i}]`);
    refs(row.sourceIds, sourceIds, `coverage[${i}].sourceIds`);
  }
  for (const [i, row] of rows(stream.rejectedJoins, 'rejectedJoins').entries()) {
    fields(row, ['from', 'to', 'proposed', 'reason'], `rejectedJoins[${i}]`);
    refs(row.sourceIds, sourceIds, `rejectedJoins[${i}].sourceIds`, 1);
  }
  for (const [i, row] of rows(stream.roadmap, 'roadmap', 1).entries()) fields(row, ['phase', 'task', 'deliverable', 'acceptance'], `roadmap[${i}]`);
  // Recursive reference checking catches source citations in future schema additions too.
  function walk(value, where) {
    if (Array.isArray(value)) { value.forEach((child, i) => walk(child, `${where}[${i}]`)); return; }
    if (!object(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'sourceIds' || key === 'evidenceSourceIds') refs(child, sourceIds, `${where}.${key}`);
      if (/(?:guilt|crime|corruption).*probab|probab.*(?:guilt|crime|corruption)|guiltScore/iu.test(key)) fail(`${where}.${key}`, 'guilt probabilities or scores are not supported by this research');
      walk(child, `${where}.${key}`);
    }
  }
  walk(stream, 'stream');
  return [...new Set(errors)];
}

export function validateAll({ root = process.cwd(), verifyCaptures = true } = {}) {
  const errors = [], streams = [];
  const directory = resolve(root, RESEARCH_ROOT, 'streams');
  let files;
  try { files = readdirSync(directory).filter(name => name.endsWith('.json')).sort(); }
  catch (error) { return { errors: [`streams: cannot read research directory (${error.code ?? error.message})`], streams }; }
  const expected = TRACKS.map(track => `${track}.json`);
  if (JSON.stringify(files) !== JSON.stringify(expected)) errors.push(`streams: expected exactly ${expected.join(', ')}; found ${files.join(', ')}`);
  const allIds = new Set();
  for (const file of files) {
    try {
      const stream = JSON.parse(readFileSync(resolve(directory, file), 'utf8'));
      if (file !== `${stream.track}.json`) errors.push(`${file}: filename must match track`);
      streams.push(stream);
      errors.push(...validateStream(stream, { root, verifyCaptures }).map(message => `${file}: ${message}`));
      for (const row of [...(stream.sources ?? []), ...(stream.entities ?? []), ...(stream.edges ?? []), ...(stream.cases ?? [])]) {
        if (allIds.has(row.id)) errors.push(`${file}: globally duplicate identifier ${row.id}`);
        allIds.add(row.id);
      }
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  return { errors, streams };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, streams } = validateAll();
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Hypothesis validation passed: ${streams.length} streams, ${streams.reduce((sum, stream) => sum + stream.cases.length, 0)} files; retained capture hashes verified. This is a structural gate, not a finding of truth.`);
}
