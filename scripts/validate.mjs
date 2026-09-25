#!/usr/bin/env node
/**
 * Data-integrity gate. CI fails on any error.
 *
 * This is where the four invariants stop being conventions and become facts about
 * the repository: provenance, entity resolution, supersession, contradiction.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const notes = [];

const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ---------------------------------------------------------------------------
// 1. Geometry
// ---------------------------------------------------------------------------
const geoPath = join(root, 'src/data/india-geo.json');
if (!existsSync(geoPath)) {
  err('geo', 'src/data/india-geo.json is missing');
} else {
  const geo = JSON.parse(readFileSync(geoPath, 'utf8'));
  if (geo.viewBox !== '0 0 612 696') err('geo', `unexpected viewBox "${geo.viewBox}"`);
  if (geo.states.length !== 36) err('geo', `expected 36 states/UTs, found ${geo.states.length}`);
  for (const s of geo.states) {
    if (!s.path || s.path.length < 20) err(`geo:${s.id}`, 'missing or truncated path — never approximate a state');
    if (typeof s.cx !== 'number' || typeof s.cy !== 'number') err(`geo:${s.id}`, 'missing label anchor');
    if (typeof s.clearance !== 'number') err(`geo:${s.id}`, 'missing clearance (label-fit budget)');
    const [x0, y0, x1, y1] = s.bbox ?? [];
    if (s.cx < x0 - 1 || s.cx > x1 + 1 || s.cy < y0 - 1 || s.cy > y1 + 1) {
      err(`geo:${s.id}`, 'label anchor lies outside the state bounding box');
    }
  }
  notes.push(`geometry: ${geo.states.length} states/UTs, ${geo.states.reduce((a, s) => a + s.parts, 0)} sub-polygons`);
}

// ---------------------------------------------------------------------------
// 2. Graph — the provenance invariant
// ---------------------------------------------------------------------------
const TIERS = ['documented', 'reported', 'alleged', 'analytic'];
const PREDS = [
  'award', 'bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'own', 'family',
  'role', 'law', 'enforce', 'hq', 'listed', 'sector', 'contra', 'supersede', 'analytic',
];

/**
 * The graph lives in TypeScript modules for editability. Rather than compile
 * them, extract the literals with a narrow parse — enough to enforce the rules,
 * and it fails loudly rather than silently passing on an unreadable file.
 */
function loadGraph() {
  const file = join(root, 'src/graph/data.ts');
  if (!existsSync(file)) return null;
  const src = readFileSync(file, 'utf8');
  const grab = (name) => {
    const m = src.match(new RegExp(`export const ${name}[^=]*=\\s*(\\[[\\s\\S]*?\\n\\];)`, 'm'));
    if (!m) return null;
    const body = m[1].replace(/;$/, '');
    try {
      // The data modules are plain literals with no imports or calls inside.
      return Function(`"use strict"; return (${body});`)();
    } catch (e) {
      err('graph', `could not parse ${name}: ${e.message}`);
      return null;
    }
  };
  return { nodes: grab('NODES'), edges: grab('EDGES'), motifs: grab('MOTIFS') };
}

const graph = loadGraph();
if (!graph) {
  notes.push('graph: src/graph/data.ts not present yet — skipping graph checks');
} else {
  const { nodes = [], edges = [], motifs = [] } = graph;
  const byId = new Map();
  const aliasOwner = new Map();

  for (const n of nodes ?? []) {
    if (byId.has(n.id)) err(`node:${n.id}`, 'duplicate node id');
    byId.set(n.id, n);
  }
  for (const n of nodes ?? []) {
    for (const a of n.al ?? []) {
      const k = a.trim().toLowerCase();
      const prior = aliasOwner.get(k);
      if (prior && prior !== n.id) {
        err(`node:${n.id}`, `alias "${a}" already claimed by "${prior}" — entity-resolution collision`);
      }
      aliasOwner.set(k, n.id);
    }
    if (n.resolved === false && !n.collisionRisk) {
      warn(`node:${n.id}`, 'unresolved node should explain its collisionRisk');
    }
  }

  (edges ?? []).forEach((e, i) => {
    const id = e.id ?? `${e.s}~${e.pred}~${e.t}~${i}`;
    const sourced = (e.srcs?.length ?? 0) > 0;
    if (!sourced && e.tier !== 'alleged' && e.tier !== 'analytic') {
      err(`edge:${id}`, 'PROVENANCE INVARIANT VIOLATED — no srcs and tier is not alleged/analytic');
    }
    if (e.tier === 'analytic' && !e.innocentReading) {
      err(`edge:${id}`, 'analytic edge must carry an innocentReading (correlation ≠ causation)');
    }
    if (!TIERS.includes(e.tier)) err(`edge:${id}`, `unknown tier "${e.tier}"`);
    if (!PREDS.includes(e.pred)) err(`edge:${id}`, `unknown predicate "${e.pred}"`);
    for (const side of ['s', 't']) {
      const n = byId.get(e[side]);
      if (!n) err(`edge:${id}`, `endpoint "${e[side]}" does not resolve to a node`);
      else if (n.resolved === false) err(`edge:${id}`, `endpoint "${e[side]}" is unresolved — unresolved entities take no edges`);
    }
    if (e.supersededBy && !(edges ?? []).some((o, j) => (o.id ?? `${o.s}~${o.pred}~${o.t}~${j}`) === e.supersededBy)) {
      err(`edge:${id}`, `supersededBy "${e.supersededBy}" does not resolve — superseded facts stay addressable`);
    }
    for (const src of e.srcs ?? []) {
      if (!Array.isArray(src) || src.length !== 2) err(`edge:${id}`, 'source must be [label, url]');
      else if (!/^https?:\/\//.test(src[1])) warn(`edge:${id}`, `source url looks malformed: ${src[1]}`);
    }
  });

  for (const m of motifs ?? []) {
    if (!m.innocentReading) err(`motif:${m.id}`, 'motif must carry an innocentReading');
    if (!m.census || !(m.census.population > 0)) {
      err(`motif:${m.id}`, 'census needs population > 0 — a numerator without a denominator is not a finding');
    }
  }

  const tally = TIERS.map((t) => `${t} ${(edges ?? []).filter((e) => e.tier === t).length}`).join(' · ');
  notes.push(`graph: ${(nodes ?? []).length} nodes, ${(edges ?? []).length} edges (${tally}), ${(motifs ?? []).length} motifs`);
  const contras = (edges ?? []).filter((e) => e.pred === 'contra').length;
  if ((edges ?? []).some((e) => e.tier === 'alleged') && contras === 0) {
    warn('graph', 'allegations present with zero contra edges — denials are first-class and must be captured');
  }
}

// ---------------------------------------------------------------------------
// 3. Research quarantine — raw agent output is never trusted
// ---------------------------------------------------------------------------
const rawDir = join(root, 'research/raw');
if (existsSync(rawDir)) {
  for (const f of readdirSync(rawDir).filter((f) => f.endsWith('.json'))) {
    try {
      const j = JSON.parse(readFileSync(join(rawDir, f), 'utf8'));
      if (!j.asOf) warn(`research/raw/${f}`, 'missing asOf — every figure must be stamped with its date');
      if (!j.sources) warn(`research/raw/${f}`, 'missing top-level sources');
      notes.push(`research/raw/${f}: parses`);
    } catch (e) {
      err(`research/raw/${f}`, `invalid JSON: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Fleet research files — research/raw/energy/*.json, research/raw/welfare/*.json,
//    research/raw/indices.json
// ---------------------------------------------------------------------------
//
// The research fleets write to a contract (docs/research/FLEET_CONTRACT.md). The
// graph's invariants are applied here, at the quarantine boundary, so a hallucinated
// edge fails before it can reach a generated module — not after.
const NODE_TYPES = [
  'ministry', 'psu', 'agency', 'company', 'shell', 'person', 'party', 'fund', 'trust',
  'sangh', 'law', 'mechanism', 'state', 'industry', 'exchange', 'group',
];
const FAMILIES = ['state', 'capital', 'recipient', 'instrument', 'enforce', 'market'];
const STATE_CODES = [
  'an', 'ap', 'ar', 'as', 'br', 'ch', 'ct', 'dn', 'dd', 'dl', 'ga', 'gj', 'hr', 'hp', 'jk', 'jh',
  'ka', 'kl', 'ld', 'mp', 'mh', 'mn', 'ml', 'mz', 'nl', 'or', 'py', 'pb', 'rj', 'sk', 'tn', 'tg',
  'tr', 'up', 'ut', 'wb',
];
const NARRATIVE_STATUS = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'];
const SCHEME_STATUS = ['live', 'raised', 'cut', 'eligibility-tightened', 'paused', 'renamed', 'discontinued', 'promised-not-enacted', 'announced', 'launched'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
// Ids the derived national graph (src/graph/build.ts) or a sibling file may own.
const KNOWN_PREFIX = /^(pol|min|sec|co|grp|per|for|energy|wel|scheme|claim):/;
const FLEET_DIRS = ['research/raw/energy', 'research/raw/welfare'];

const srcShape = (where, srcs) => {
  for (const src of srcs ?? []) {
    if (!Array.isArray(src) || src.length !== 2) err(where, 'source must be [label, url]');
    else if (!/^https?:\/\//.test(src[1])) warn(where, `source url looks malformed: ${src[1]}`);
  }
};

for (const rel of FLEET_DIRS) {
  const dir = join(root, rel);
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !/^[A-Z]/.test(f));
  // Alias → owning id across the whole directory. Two files claiming one alias for
  // different ids is the entity-resolution failure the reconciler exists to catch.
  const dirAlias = new Map();
  const dirIds = new Set();
  for (const f of files) {
    const where = `${rel}/${f}`;
    let j;
    try {
      j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    } catch (e) {
      err(where, `invalid JSON: ${e.message}`);
      continue;
    }
    if (!j.asOf) err(where, 'missing asOf — every figure must be stamped with its date');
    if (!Array.isArray(j.sources) || j.sources.length === 0) err(where, 'missing top-level sources');

    const ids = new Set();
    const unresolved = new Set();
    for (const n of j.entities ?? []) {
      if (!n.id) { err(where, 'entity without id'); continue; }
      if (ids.has(n.id)) err(`${where}:${n.id}`, 'duplicate entity id');
      ids.add(n.id);
      dirIds.add(n.id);
      if (n.ty && !NODE_TYPES.includes(n.ty)) err(`${where}:${n.id}`, `unknown ty "${n.ty}"`);
      if (n.fam && !FAMILIES.includes(n.fam)) err(`${where}:${n.id}`, `unknown fam "${n.fam}"`);
      if (n.st != null && !STATE_CODES.includes(n.st)) err(`${where}:${n.id}`, `unknown state code "${n.st}"`);
      if (n.resolved === false) {
        unresolved.add(n.id);
        if (!n.collisionRisk) warn(`${where}:${n.id}`, 'unresolved node should explain its collisionRisk');
      }
      if (n.ty === 'person' && !n.publicRole && !n.identity) {
        warn(`${where}:${n.id}`, 'person without publicRole or identity — persons are recorded only in public roles');
      }
      for (const a of n.al ?? []) {
        const k = String(a).trim().toLowerCase();
        const prior = dirAlias.get(k);
        if (prior && prior !== n.id) err(`${where}:${n.id}`, `alias "${a}" already claimed by "${prior}" — entity-resolution collision`);
        dirAlias.set(k, n.id);
      }
      srcShape(`${where}:${n.id}`, n.srcs);
    }

    for (const s of j.schemes ?? []) {
      if (!s.id) { err(where, 'scheme without id'); continue; }
      if (ids.has(s.id)) err(`${where}:${s.id}`, 'duplicate scheme id');
      ids.add(s.id);
      dirIds.add(s.id);
      if (s.st != null && !STATE_CODES.includes(s.st)) err(`${where}:${s.id}`, `unknown state code "${s.st}"`);
      if (s.level === 'central' && s.st) err(`${where}:${s.id}`, 'a central scheme carries st: null and applicableStates');
      for (const [k, v] of [['announced', s.announced], ['approved', s.approved], ['launched', s.launched]]) {
        if (v && v.date && !ISO.test(v.date)) err(`${where}:${s.id}`, `${k}.date "${v.date}" is not an ISO date`);
        if (v && v.date && !(v.srcs?.length)) err(`${where}:${s.id}`, `${k} carries a date with no source`);
      }
      for (const o of s.outlay ?? []) if (!(o.srcs?.length)) err(`${where}:${s.id}`, `outlay ${o.fy ?? '?'} has no source — a figure without a source is not a figure`);
      for (const b of s.beneficiaries ?? []) if (!(b.srcs?.length)) err(`${where}:${s.id}`, `beneficiary count ${b.asOf ?? '?'} has no source`);
      for (const c of s.benefit?.changes ?? []) if (!(c.srcs?.length)) warn(`${where}:${s.id}`, `benefit change ${c.date ?? '?'} has no source`);
      for (const st of s.status ?? []) {
        if (!SCHEME_STATUS.includes(st.status)) err(`${where}:${s.id}`, `unknown scheme status "${st.status}"`);
        if (st.date && !ISO.test(st.date)) err(`${where}:${s.id}`, `status date "${st.date}" is not an ISO date`);
      }
      for (const r of s.results ?? []) {
        if (!TIERS.includes(r.tier)) err(`${where}:${s.id}`, `result with unknown tier "${r.tier}"`);
        if (r.tier !== 'alleged' && r.tier !== 'analytic' && !(r.srcs?.length)) err(`${where}:${s.id}`, 'result without sources and not alleged/analytic');
      }
      if (s.electionContext?.date && !ISO.test(s.electionContext.date)) err(`${where}:${s.id}`, 'electionContext.date is not an ISO date');
      srcShape(`${where}:${s.id}`, s.srcs);
    }

    const claimIds = new Set();
    for (const c of j.claims ?? []) {
      const id = c.id ?? `${c.s}~${c.pred}~${c.t}`;
      if (claimIds.has(id)) err(`${where}:${id}`, 'duplicate claim id');
      claimIds.add(id);
    }
    for (const c of j.claims ?? []) {
      const id = c.id ?? `${c.s}~${c.pred}~${c.t}`;
      const w = `${where}:${id}`;
      const sourced = (c.srcs?.length ?? 0) > 0;
      if (!sourced && c.tier !== 'alleged' && c.tier !== 'analytic') err(w, 'PROVENANCE INVARIANT VIOLATED — no srcs and tier is not alleged/analytic');
      if (c.tier === 'analytic' && !c.innocentReading) err(w, 'analytic claim must carry an innocentReading (correlation ≠ causation)');
      if (!TIERS.includes(c.tier)) err(w, `unknown tier "${c.tier}"`);
      if (!PREDS.includes(c.pred)) err(w, `unknown predicate "${c.pred}"`);
      for (const side of ['s', 't']) {
        const v = c[side];
        if (!v) { err(w, `missing endpoint ${side}`); continue; }
        if (side === 't' && c.pred === 'contra' && String(v).startsWith('claim:')) {
          if (!claimIds.has(String(v).slice(6))) err(w, `contra answers "${v}", which is not a claim in this file`);
          continue;
        }
        if (unresolved.has(v)) err(w, `endpoint "${v}" is resolved:false — unresolved entities take no edges`);
        else if (!ids.has(v) && !KNOWN_PREFIX.test(v)) err(w, `endpoint "${v}" is neither defined in this file nor an inventory-prefixed id`);
      }
      for (const d of ['from', 'to']) if (c[d] && !ISO.test(c[d])) err(w, `${d} "${c[d]}" is not an ISO date`);
      if (c.supersededBy && !claimIds.has(c.supersededBy)) err(w, `supersededBy "${c.supersededBy}" does not resolve — superseded facts stay addressable`);
      if (c.benefit?.who && !ids.has(c.benefit.who) && !KNOWN_PREFIX.test(c.benefit.who)) warn(w, `benefit.who "${c.benefit.who}" is not a known id`);
      srcShape(w, c.srcs);
    }
    // Denials are first-class: every alleged claim is answered in the same file.
    const answered = new Set();
    for (const c of j.claims ?? []) {
      if (c.pred !== 'contra') continue;
      answered.add(String(c.t).replace(/^claim:/, ''));
      answered.add(c.s);
    }
    for (const c of j.claims ?? []) {
      if (c.tier !== 'alleged' || c.pred === 'contra' || c.status === 'killed') continue;
      const id = c.id ?? `${c.s}~${c.pred}~${c.t}`;
      if (!answered.has(id) && !answered.has(c.s) && !answered.has(c.t)) {
        err(`${where}:${id}`, 'alleged claim with no contra in this file — the denial ships with the claim, or the claim does not ship');
      }
    }
    for (const n of j.narratives ?? []) {
      if (!NARRATIVE_STATUS.includes(n.status)) err(where, `narrative "${String(n.claim).slice(0, 60)}" has unknown status "${n.status}"`);
      if (!(n.srcs?.length)) warn(where, `narrative "${String(n.claim).slice(0, 60)}" carries no sources`);
    }
    notes.push(`${where}: ${(j.entities ?? []).length} entities, ${(j.claims ?? []).length} claims, ${(j.schemes ?? []).length} schemes, ${(j.narratives ?? []).length} narratives`);
  }
}

const indicesPath = join(root, 'research/raw/indices.json');
if (existsSync(indicesPath)) {
  const where = 'research/raw/indices.json';
  try {
    const j = JSON.parse(readFileSync(indicesPath, 'utf8'));
    const known = new Set(
      (JSON.parse(readFileSync(join(root, 'research/raw/companies-by-state.json'), 'utf8')).companies ?? []).map((c) => `co:${c.id}`),
    );
    if (!j.asOf) err(where, 'missing asOf');
    if (!Array.isArray(j.sources) || !j.sources.length) err(where, 'missing sources');
    for (const [name, list] of Object.entries(j.indices ?? {})) {
      if (!Array.isArray(list)) { err(where, `indices.${name} is not a list`); continue; }
      const expected = /50/.test(name) ? 50 : /30/.test(name) ? 30 : null;
      if (expected && list.length !== expected) err(where, `indices.${name} has ${list.length} constituents, expected ${expected}`);
      for (const c of list) {
        if (c.existingId && !known.has(c.existingId)) err(where, `${name}: existingId "${c.existingId}" is not in companies-by-state.json`);
        if (!c.name) err(where, `${name}: constituent without a name`);
      }
    }
    for (const m of j.missingFromDataset ?? []) {
      if (!m.id || !m.name || !m.stateCode) err(where, `missingFromDataset record "${m.name ?? '?'}" lacks id/name/stateCode`);
      if (m.stateCode && !STATE_CODES.includes(m.stateCode)) err(where, `missingFromDataset "${m.name}": unknown stateCode "${m.stateCode}"`);
      if (!(m.srcs?.length)) err(where, `missingFromDataset "${m.name}" has no sources`);
    }
    notes.push(`${where}: ${Object.entries(j.indices ?? {}).map(([k, v]) => `${k} ${v.length}`).join(' · ')}, ${(j.missingFromDataset ?? []).length} to add`);
  } catch (e) {
    err(where, `invalid JSON: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
for (const n of notes) console.log(`  · ${n}`);
if (warnings.length) {
  console.log(`\n  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`    ! ${w}`);
}
if (errors.length) {
  console.error(`\n  ${errors.length} ERROR(S):`);
  for (const e of errors) console.error(`    ✗ ${e}`);
  console.error('\nvalidate: FAILED\n');
  process.exit(1);
}
console.log('\nvalidate: OK\n');
