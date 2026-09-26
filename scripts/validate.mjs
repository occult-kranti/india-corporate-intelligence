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
import { assembleFleet, OUTPUTS, predProblem } from './assemble-fleet.mjs';
import {
  TIERS, PREDS, NODE_TYPES, FAMILIES, STATE_CODES, NARRATIVE_STATUS, SCHEME_STATUS, SCHEME_CATEGORIES, ISO_DATE, INVENTORY,
} from './lib/vocab.mjs';

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
/**
 * The graph lives in TypeScript modules for editability. Rather than compile
 * them, extract the literals with a narrow parse — enough to enforce the rules,
 * and it fails loudly rather than silently passing on an unreadable file. The
 * grab takes `export const NAME: T = [ … ];` or `= { … };` with the closer alone
 * on its line, so the literal must be plain data: no imports, calls or casts.
 */
function grabConst(where, src, name) {
  const m = src.match(new RegExp(`export const ${name}\\b[^=]*=\\s*(\\[[\\s\\S]*?\\n\\];|\\{[\\s\\S]*?\\n\\};)`, 'm'));
  if (!m) return null;
  const body = m[1].replace(/;$/, '');
  try {
    return Function(`"use strict"; return (${body});`)();
  } catch (e) {
    err(where, `could not parse ${name}: ${e.message}`);
    return null;
  }
}

function loadGraph() {
  const file = join(root, 'src/graph/data.ts');
  if (!existsSync(file)) return null;
  const src = readFileSync(file, 'utf8');
  return {
    nodes: grabConst('graph', src, 'NODES'),
    edges: grabConst('graph', src, 'EDGES'),
    motifs: grabConst('graph', src, 'MOTIFS'),
  };
}

/**
 * The graph invariants, shared by the hand-written Atlas (§2) and the generated
 * fleet modules (§5) so the two can never drift into different rules.
 *
 * Sharing it made the Atlas stricter than it was: its nodes are now checked for a
 * known ty, fam and state code and an sz of 1–4, and its edges' from/to for an ISO
 * date (year, month or day precision) — checks §2 did not run before the refactor.
 * The Atlas passed all of them when they were added; a failure here now is a real
 * fault in src/graph/data.ts, not a change in the rule.
 *
 * `knownIds` (a Set, or a predicate) names ids that live outside `nodes` — the
 * national layer, a sibling module, a claim held in META — so an edge may point at
 * them. `strictContra` applies the per-claim denial rule of the fleet contract;
 * the Atlas predates it and keeps the graph-level warning.
 */
function checkGraph(label, nodes, edges, motifs, knownIds = new Set(), { strictContra = false } = {}) {
  nodes = nodes ?? [];
  edges = edges ?? [];
  motifs = motifs ?? [];
  const known = typeof knownIds === 'function' ? knownIds : (id) => knownIds.has(id);
  const at = (kind, id) => (label === 'graph' ? `${kind}:${id}` : `${label}:${kind}:${id}`);
  const byId = new Map();
  const aliasOwner = new Map();

  for (const n of nodes) {
    if (byId.has(n.id)) err(at('node', n.id), 'duplicate node id');
    byId.set(n.id, n);
  }
  for (const n of nodes) {
    if (!NODE_TYPES.includes(n.ty)) err(at('node', n.id), `unknown ty "${n.ty}"`);
    if (!FAMILIES.includes(n.fam)) err(at('node', n.id), `unknown fam "${n.fam}"`);
    if (n.st != null && !STATE_CODES.includes(n.st)) err(at('node', n.id), `unknown state code "${n.st}"`);
    if (![1, 2, 3, 4].includes(n.sz)) err(at('node', n.id), `sz must be 1–4, found ${JSON.stringify(n.sz)}`);
    for (const a of n.al ?? []) {
      const k = a.trim().toLowerCase();
      const prior = aliasOwner.get(k);
      if (prior && prior !== n.id) {
        err(at('node', n.id), `alias "${a}" already claimed by "${prior}" — entity-resolution collision`);
      }
      aliasOwner.set(k, n.id);
    }
    if (n.resolved === false && !n.collisionRisk) {
      warn(at('node', n.id), 'unresolved node should explain its collisionRisk');
    }
  }

  const idOf = (e, i) => e.id ?? `${e.s}~${e.pred}~${e.t}~${i}`;
  const edgeIds = new Set(edges.map(idOf));
  const answered = new Set();
  for (const e of edges) {
    if (e.pred !== 'contra') continue;
    answered.add(String(e.t).replace(/^claim:/, ''));
    answered.add(e.s);
  }

  edges.forEach((e, i) => {
    const id = idOf(e, i);
    const sourced = (e.srcs?.length ?? 0) > 0;
    if (!sourced && e.tier !== 'alleged' && e.tier !== 'analytic') {
      err(at('edge', id), 'PROVENANCE INVARIANT VIOLATED — no srcs and tier is not alleged/analytic');
    }
    if (e.tier === 'analytic' && !e.innocentReading) {
      err(at('edge', id), 'analytic edge must carry an innocentReading (correlation ≠ causation)');
    }
    if (!TIERS.includes(e.tier)) err(at('edge', id), `unknown tier "${e.tier}"`);
    for (const d of ['from', 'to']) {
      if (e[d] != null && !ISO_DATE.test(e[d])) err(at('edge', id), `${d} "${e[d]}" is not an ISO date (YYYY, YYYY-MM or YYYY-MM-DD)`);
    }
    if (!PREDS.includes(e.pred)) err(at('edge', id), `unknown predicate "${e.pred}"`);
    for (const side of ['s', 't']) {
      const v = e[side];
      const n = byId.get(v);
      if (n) {
        if (n.resolved === false) err(at('edge', id), `endpoint "${v}" is unresolved — unresolved entities take no edges`);
      } else if (String(v).startsWith('claim:')) {
        if (!edgeIds.has(String(v).slice(6)) && !known(v)) err(at('edge', id), `"${v}" is not a claim here`);
      } else if (!known(v)) {
        err(at('edge', id), `endpoint "${v}" does not resolve to a node`);
      }
    }
    if (e.supersededBy && !edgeIds.has(e.supersededBy) && !known(`claim:${e.supersededBy}`)) {
      err(at('edge', id), `supersededBy "${e.supersededBy}" does not resolve — superseded facts stay addressable`);
    }
    if (strictContra && e.tier === 'alleged' && e.pred !== 'contra' && !answered.has(id) && !answered.has(e.s) && !answered.has(e.t)) {
      err(at('edge', id), 'alleged edge with no contra — the denial ships with the claim, or the claim does not ship');
    }
    for (const src of e.srcs ?? []) {
      if (!Array.isArray(src) || src.length !== 2) err(at('edge', id), 'source must be [label, url]');
      else if (!/^https?:\/\//.test(src[1])) warn(at('edge', id), `source url looks malformed: ${src[1]}`);
    }
  });

  for (const m of motifs) {
    if (!m.innocentReading) err(at('motif', m.id), 'motif must carry an innocentReading');
    if (!m.census || !(m.census.population > 0)) {
      err(at('motif', m.id), 'census needs population > 0 — a numerator without a denominator is not a finding');
    }
  }

  const tally = TIERS.map((t) => `${t} ${edges.filter((e) => e.tier === t).length}`).join(' · ');
  notes.push(`${label}: ${nodes.length} nodes, ${edges.length} edges (${tally}), ${motifs.length} motifs`);
  const contras = edges.filter((e) => e.pred === 'contra').length;
  if (!strictContra && edges.some((e) => e.tier === 'alleged') && contras === 0) {
    warn(label, 'allegations present with zero contra edges — denials are first-class and must be captured');
  }
}

const graph = loadGraph();
if (!graph) {
  notes.push('graph: src/graph/data.ts not present yet — skipping graph checks');
} else {
  checkGraph('graph', graph.nodes, graph.edges, graph.motifs);
}
// The Money-Trail Atlas ids are unprefixed ("sebi", "doj", "adani"). The fleet
// contract tells researchers to reuse them verbatim, so §4 and §5 accept them.
const atlasIds = new Set((graph?.nodes ?? []).map((n) => n.id));

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
const ISO = ISO_DATE;
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
      // Scheme aliases join the same directory-wide alias space as entities: one scheme
      // under two ids across files is the same resolution failure as one company under two.
      for (const a of s.al ?? []) {
        const k = String(a).trim().toLowerCase();
        const prior = dirAlias.get(k);
        if (prior && prior !== s.id) err(`${where}:${s.id}`, `alias "${a}" already claimed by "${prior}" — entity-resolution collision (scheme)`);
        dirAlias.set(k, s.id);
      }
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
      // The same date fields the assembler types, so the two gates cannot disagree.
      for (const [label, v] of [
        ...(s.benefit?.changes ?? []).map((c) => ['benefit change date', c?.date]),
        ...(s.beneficiaries ?? []).map((b) => ['beneficiaries asOf', b?.asOf]),
        ...(s.ministers ?? []).map((m) => ['minister date', m?.date]),
      ]) {
        if (v != null && !ISO.test(v)) err(`${where}:${s.id}`, `${label} "${v}" is not an ISO date (YYYY, YYYY-MM or YYYY-MM-DD)`);
      }
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
      if (!PREDS.includes(c.pred)) err(w, predProblem(c.pred));
      for (const side of ['s', 't']) {
        const v = c[side];
        if (!v) { err(w, `missing endpoint ${side}`); continue; }
        if (side === 't' && c.pred === 'contra' && String(v).startsWith('claim:')) {
          if (!claimIds.has(String(v).slice(6))) {
            const hint = claimIds.has(String(v)) ? ` — a claim's own id is "${v}"; write ids without the claim: prefix and reference them as claim:<id>` : '';
            err(w, `contra answers "${v}", which is not a claim in this file${hint}`);
          }
          continue;
        }
        if (unresolved.has(v)) err(w, `endpoint "${v}" is resolved:false — unresolved entities take no edges`);
        else if (!ids.has(v) && !KNOWN_PREFIX.test(v) && !atlasIds.has(v)) err(w, `endpoint "${v}" is neither defined in this file, an Atlas id, nor an inventory-prefixed id`);
      }
      for (const d of ['from', 'to']) if (c[d] && !ISO.test(c[d])) err(w, `${d} "${c[d]}" is not an ISO date`);
      if (c.supersededBy && !claimIds.has(c.supersededBy)) err(w, `supersededBy "${c.supersededBy}" does not resolve — superseded facts stay addressable`);
      if (c.benefit?.who && !ids.has(c.benefit.who) && !KNOWN_PREFIX.test(c.benefit.who) && !atlasIds.has(c.benefit.who)) warn(w, `benefit.who "${c.benefit.who}" is not a known id`);
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
    // Optional `coverage` (welfare). The contract checks only `st` and `srcs`: those
    // fail here. Anything else the assembler cannot read (years, categories) is held
    // out of WELFARE_COVERAGE with a warning — never read as a declaration — so it
    // warns here too rather than invalidating a file the contract says passes.
    if (j.coverage != null) {
      if (!Array.isArray(j.coverage)) err(`${where}:coverage`, 'coverage must be a list');
      for (const [i, c] of (Array.isArray(j.coverage) ? j.coverage : []).entries()) {
        const w = `${where}:coverage[${i}]`;
        if (!c || typeof c !== 'object' || Array.isArray(c)) { err(w, 'coverage entry must be an object'); continue; }
        if (!STATE_CODES.includes(c.st) && c.st !== 'central') err(w, `st "${c.st}" is not a state code or "central"`);
        if (!Array.isArray(c.srcs) || !c.srcs.length) err(w, 'coverage declares a search with no source — a zero it would paint is unverifiable');
        srcShape(w, c.srcs);
        const int = (x) => Number.isInteger(x);
        if (c.fromYear != null || c.toYear != null) {
          if (!int(c.fromYear) || !int(c.toYear) || c.fromYear > c.toYear) warn(w, 'fromYear/toYear must be whole years with fromYear ≤ toYear — held out of WELFARE_COVERAGE');
        } else if (!(Array.isArray(c.years) && c.years.length && c.years.every(int))) {
          warn(w, 'coverage declares no readable years (fromYear/toYear, or years) — held out of WELFARE_COVERAGE');
        }
        if (c.categories == null) warn(w, 'coverage without categories — treated as ["all"]');
        else {
          const list = Array.isArray(c.categories) ? c.categories : [c.categories];
          const bad = list.filter((x) => x !== 'all' && !SCHEME_CATEGORIES.includes(x));
          if (!list.length || bad.length) warn(w, `coverage categories ${JSON.stringify(c.categories)} — expected ["all"] or scheme categories; held out of WELFARE_COVERAGE`);
        }
      }
    }
    for (const e of j.elections ?? []) {
      if (e?.date != null && !ISO.test(e.date)) err(where, `election ${e.st ?? '?'} ${e.election ?? ''}: date "${e.date}" is not an ISO date (YYYY, YYYY-MM or YYYY-MM-DD)`);
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
      // Fewer rows than the published size is a declared gap ("49 of 50 confirmed"),
      // not a rounding error — provided the file says so. More rows is always wrong.
      if (expected && list.length > expected) err(where, `indices.${name} has ${list.length} constituents, more than the published ${expected}`);
      else if (expected && list.length < expected) {
        const declared = (j.gaps ?? []).some((g) => String(g).toLowerCase().includes(name.replace(/\d+$/, '')) || /constituent/i.test(String(g)));
        (declared ? warn : err)(where, `indices.${name} has ${list.length} of ${expected} constituents${declared ? ' — declared in gaps; pages must print the count' : ' — and the file does not declare the gap'}`);
      }
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
// 5. Generated fleet modules — src/graph/energy.generated.ts, src/data/welfare.generated.ts
// ---------------------------------------------------------------------------
//
// scripts/assemble-fleet.mjs is the last gate before TypeScript. This section
// re-checks its output with a parser of its own, so a bug in the assembler cannot
// wave its own work through, and re-runs the assembly in memory: a module that no
// longer matches its inputs was hand-edited or not regenerated, and either way it
// is not what the gates passed.

/**
 * The ids src/graph/build.ts derives, rebuilt from the same raw files with the
 * same slug rule. Sector ids pass through normaliseSector, which this does not
 * replicate, so `sec:` is not checked. Used only to warn: a prefixed id the
 * national build never produces is held out of the rendered graph by DataContext.
 */
function nationalIds() {
  const read = (f) => JSON.parse(readFileSync(join(root, 'research/raw', f), 'utf8'));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  try {
    const ids = new Set();
    for (const m of read('cabinet.json').ministers ?? []) {
      ids.add(`pol:${m.id}`);
      for (const p of m.portfolios ?? []) ids.add(`min:${slug(p)}`);
    }
    for (const c of read('companies-by-state.json').companies ?? []) ids.add(`co:${c.id}`);
    for (const g of read('conglomerates.json').groups ?? []) {
      ids.add(`grp:${g.id}`);
      for (const e of g.listedEntities ?? []) ids.add(`co:${slug(e.nse ?? e.name)}`);
      for (const p of g.keyPeople ?? []) ids.add(`per:${slug(p.name)}`);
      for (const f of g.foreignPartners ?? []) ids.add(`for:${slug(f.name)}`);
    }
    return ids;
  } catch (e) {
    warn('generated', `national id inventory unavailable (${e.message}) — prefixed endpoints not cross-checked`);
    return null;
  }
}

const GENERATED = [
  { fleet: 'energy', file: OUTPUTS.energy, nodes: ['ENERGY_NODES'], edges: 'ENERGY_EDGES', benefits: 'ENERGY_BENEFITS', domains: 'ENERGY_EDGE_DOMAIN', meta: 'ENERGY_META' },
  { fleet: 'welfare', file: OUTPUTS.welfare, nodes: ['WELFARE_ENTITIES', 'WELFARE_SCHEME_NODES'], edges: 'WELFARE_CLAIMS', benefits: 'WELFARE_BENEFITS', domains: 'WELFARE_EDGE_DOMAIN', coverage: 'WELFARE_COVERAGE', meta: 'WELFARE_META' },
];
const generated = GENERATED.map((g) => {
  const path = join(root, g.file);
  if (!existsSync(path)) {
    err(g.file, 'generated module is missing — run npm run generate');
    return null;
  }
  const src = readFileSync(path, 'utf8');
  const need = (name) => {
    const v = grabConst(g.file, src, name);
    if (v == null) err(g.file, `no readable ${name} literal`);
    return v;
  };
  return {
    ...g,
    src,
    nodes: g.nodes.flatMap((n) => need(n) ?? []),
    edges: need(g.edges) ?? [],
    benefits: need(g.benefits) ?? [],
    domains: need(g.domains) ?? {},
    coverage: g.coverage ? need(g.coverage) ?? [] : [],
    meta: need(g.meta) ?? {},
  };
});

const fleetNodeIds = new Set(generated.flatMap((m) => (m ? m.nodes.map((n) => n.id) : [])));
const national = generated.some((m) => m?.edges.length) ? nationalIds() : null;
for (const m of generated) {
  if (!m) continue;
  // Killed and excluded claims stay addressable through META, so a denial or a
  // supersession may still point at one.
  const held = new Set([...(m.meta.killed ?? []), ...(m.meta.excluded ?? [])].map((c) => `claim:${c.id}`));
  const known = (id) => fleetNodeIds.has(id) || atlasIds.has(id) || INVENTORY.test(id) || held.has(id);
  checkGraph(m.fleet, m.nodes, m.edges, [], known, { strictContra: true });

  const edgeIds = new Set(m.edges.map((e) => e.id));
  for (const e of m.edges) if (!e.id) err(`${m.fleet}:edge:${e.s}~${e.pred}~${e.t}`, 'generated edge without an id');
  for (const b of m.benefits) {
    if (!edgeIds.has(b.claimId)) err(`${m.fleet}:benefit:${b.claimId}`, 'benefit row for a claim that is not an edge');
  }
  // Pages filter claims by research sweep through this map, so a claim missing from
  // it would silently vanish from every sweep.
  const fileDomains = new Set((m.meta.files ?? []).map((f) => f.domain));
  const mentioned = [...m.edges, ...(m.meta.killed ?? []), ...(m.meta.excluded ?? [])].map((c) => c.id);
  for (const id of new Set(mentioned)) {
    if (!(id in m.domains)) err(`${m.fleet}:edge-domain:${id}`, 'claim has no research domain in the EDGE_DOMAIN map');
  }
  for (const [id, d] of Object.entries(m.domains)) {
    if (!fileDomains.has(d)) err(`${m.fleet}:edge-domain:${id}`, `domain "${d}" is not a research file in META.files`);
  }
  for (const [i, c] of m.coverage.entries()) {
    const w = `${m.fleet}:coverage[${i}]`;
    if (!STATE_CODES.includes(c.st) && c.st !== 'central') err(w, `st "${c.st}" is not a state code or "central"`);
    if (!(c.srcs?.length)) err(w, 'coverage entry without sources');
    if (!Array.isArray(c.categories) || !c.categories.length) err(w, 'coverage entry without categories');
    if ((c.fromYear == null) !== (c.toYear == null)) err(w, 'coverage range has one end only');
  }
  if (national) {
    for (const e of m.edges) {
      for (const v of [e.s, e.t]) {
        if (INVENTORY.test(v) && !v.startsWith('sec:') && !national.has(v) && !fleetNodeIds.has(v)) {
          warn(`${m.fleet}:edge:${e.id}`, `"${v}" has an inventory prefix but the national graph builds no such node — held out of the rendered graph`);
        }
      }
    }
  }
  notes.push(
    `${m.file}: ${m.meta.runId ?? '?'}${m.meta.empty ? ' (empty — no research yet)' : ''}, ` +
      `${(m.meta.killed ?? []).length} killed and ${(m.meta.excluded ?? []).length} excluded claim(s) held in META`,
  );
}

let assembled = null;
try {
  assembled = assembleFleet({ root });
} catch (e) {
  err('generate', `the assembler threw: ${e.message}`);
}
// Per fleet: a module is compared with its own fresh assembly. When that fleet's
// research fails assembly, its errors are the finding — "stale" would send the
// reader to re-run a generate that cannot succeed.
if (assembled) {
  for (const m of generated) {
    if (!m) continue;
    const fleetErrors = assembled.fleetErrors?.[m.fleet] ?? assembled.errors;
    if (fleetErrors.length) {
      for (const e of fleetErrors) err(`generate:${m.fleet}`, `assembler refuses the ${m.fleet} research — ${e}; ${m.file} is the last clean assembly`);
    } else if (m.src !== assembled[`${m.fleet}Ts`]) {
      err(m.file, 'generated module is stale — run npm run generate');
    }
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
