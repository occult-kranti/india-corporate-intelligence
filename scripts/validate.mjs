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
import { assembleFleet, predProblem } from './assemble-fleet.mjs';
import { undefinedFleetRefs } from './lib/fleet-refs.mjs';
import { FLEET_PREFIXES } from './lib/vocab.mjs';
import { STATE_BASES, WB_TOTAL_KEYS, WB_PROJECT_ID, NOT_COUNTABLE_CLASSES } from './lib/vocab.mjs';
import {
  OWNERSHIP_DECLARATIONS, HOLDING_CATEGORIES, HOLDING_KEYS, COVERAGE_READ, CONTROL_ROLES, AGGREGATES_DOMAIN, holdingTextProblem,
} from './lib/vocab.mjs';
import {
  TIERS, PREDS, NODE_TYPES, FAMILIES, STATE_CODES, NARRATIVE_STATUS, SCHEME_STATUS, SCHEME_CATEGORIES, ISO_DATE, INVENTORY,
  FLEETS, TERMS_KEYS, amountProblem, FC_STATE_KEYS, fySpan, fcStateSumProblems,
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
    const amount = amountProblem(e);
    if (amount) err(at('edge', id), amount);
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
// 4. Fleet research files — research/raw/<fleet>/*.json for every fleet in FLEETS
//    (energy, welfare, finance, ngo, capital), and research/raw/indices.json
// ---------------------------------------------------------------------------
//
// The research fleets write to a contract (docs/research/FLEET_CONTRACT.md). The
// graph's invariants are applied here, at the quarantine boundary, so a hallucinated
// edge fails before it can reach a generated module — not after.
const ISO = ISO_DATE;
// Ids the derived national graph (src/graph/build.ts) or a sibling file may own. A
// fleet-prefixed id passes here per file; that some file in the owning fleet's
// directory defines it is checked once every directory has been read (below).
const KNOWN_PREFIX = new RegExp(`^(pol|min|sec|co|grp|per|for|${FLEET_PREFIXES.join('|')}|claim):`);
const FLEET_DIRS = FLEETS.map((f) => `research/raw/${f.dir}`);
// Courts are Atlas agencies: a court's `enforce` claim is a ruling, and the contract
// asks that its d begin "Judicial ruling on <claim id>: " (docs/research/FLEET_CONTRACT.md).
const courtIds = new Set((graph?.nodes ?? []).filter((n) => n.ty === 'agency' && /court/i.test(n.label ?? '')).map((n) => n.id));
const JUDICIAL = /^Judicial ruling on ([^:]+(?::[^:]+)*?): /;
/** Ids named by a "Judicial ruling on a:b, c:d: …" prefix, or null when d does not carry one. */
const rulingOn = (d) => {
  const m = JUDICIAL.exec(typeof d === 'string' ? d : '');
  return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : null;
};
// What every fleet defines and what every fleet references, for the cross-file check.
const definedByFleet = new Map(FLEETS.map((f) => [f.key, new Set()]));
const fleetRefs = [];

/** The shape of a claim's `terms`, checked as the assembler reads it: fixed keys, conditions a list of strings. */
function termsProblems(t) {
  if (t == null) return [];
  if (typeof t !== 'object' || Array.isArray(t)) return [`terms must be an object, found ${JSON.stringify(t)}`];
  const out = [];
  for (const k of Object.keys(t)) if (!TERMS_KEYS.includes(k)) out.push(`terms.${k} is not a terms field (expected ${TERMS_KEYS.join(' | ')})`);
  if (t.instrument != null && typeof t.instrument !== 'string') out.push('terms.instrument must be text');
  for (const k of ['ratePct', 'tenorYears', 'graceYears']) {
    if (t[k] != null && !(typeof t[k] === 'number' && Number.isFinite(t[k]))) out.push(`terms.${k} must be a number or null — a figure that is not a number is a gap, record it as null`);
  }
  if (t.conditions !== undefined && !(Array.isArray(t.conditions) && t.conditions.every((c) => typeof c === 'string'))) {
    out.push('terms.conditions must be a list of strings');
  }
  return out;
}

const srcShape = (where, srcs) => {
  for (const src of srcs ?? []) {
    if (!Array.isArray(src) || src.length !== 2) err(where, 'source must be [label, url]');
    else if (!/^https?:\/\//.test(src[1])) warn(where, `source url looks malformed: ${src[1]}`);
  }
};

/**
 * G3a, checked at the quarantine boundary with this file's own rules: fixed keys, all
 * present; pct a number in 0–100 or null; shares a whole number or null; asOf ISO or
 * null; a known category; the line a verbatim part of the claim's d/lab and every figure
 * printed there; aggregate true exactly in holders-aggregates.json; own claims only.
 */
function holdingProblems(c, file) {
  const h = c.holding;
  if (typeof h !== 'object' || Array.isArray(h)) return [`holding must be an object, found ${JSON.stringify(h)}`];
  const out = [];
  if (c.pred !== 'own') out.push(`holding on a ${c.pred} claim — holdings describe own claims only`);
  const keys = Object.keys(h);
  for (const k of keys) if (!HOLDING_KEYS.includes(k)) out.push(`holding.${k} is not a holding field (expected ${HOLDING_KEYS.join(' | ')})`);
  for (const k of HOLDING_KEYS) if (!keys.includes(k)) out.push(`holding.${k} is missing — write null for a stated absence`);
  if (h.pct !== null && !(typeof h.pct === 'number' && Number.isFinite(h.pct))) out.push(`holding.pct ${JSON.stringify(h.pct)} must be a number or null`);
  else if (typeof h.pct === 'number' && (h.pct < 0 || h.pct > 100)) out.push(`holding.pct ${h.pct} is outside 0–100 — a share of a company is a percentage`);
  if (h.shares !== null && !(Number.isInteger(h.shares) && h.shares >= 0)) out.push(`holding.shares ${JSON.stringify(h.shares)} must be a whole share count or null`);
  if (h.asOf !== null && !(typeof h.asOf === 'string' && ISO.test(h.asOf))) out.push(`holding.asOf ${JSON.stringify(h.asOf)} is not an ISO date`);
  if (!HOLDING_CATEGORIES.includes(h.category)) out.push(`holding.category ${JSON.stringify(h.category)} is not one of ${HOLDING_CATEGORIES.join(' | ')}`);
  if (!(typeof h.line === 'string' && h.line.trim())) out.push('holding.line is required — the line as the record prints it');
  if (typeof h.aggregate !== 'boolean') out.push('holding.aggregate must be true or false');
  else if (h.aggregate !== (file === `${AGGREGATES_DOMAIN}.json`)) out.push(`holding.aggregate is ${h.aggregate} but the claim is ${file === `${AGGREGATES_DOMAIN}.json` ? '' : 'not '}in ${AGGREGATES_DOMAIN}.json — an aggregate is a lower bound, never a filing line`);
  const text = [Array.isArray(c.d) ? c.d.join(' ') : c.d, c.lab].filter((x) => typeof x === 'string').join(' ');
  out.push(...holdingTextProblem(h, text));
  return out;
}

/** G3b/G3c declarations at the quarantine boundary. `domains`: the fleet's research file stems. */
function checkDeclarations(rel, domains) {
  const read = (name) => {
    const path = join(root, rel, name);
    if (!existsSync(path)) {
      notes.push(`${rel}/${name}: absent — the ${OWNERSHIP_DECLARATIONS[name]} export is empty`);
      return null;
    }
    try {
      const j = JSON.parse(readFileSync(path, 'utf8'));
      if (!j.asOf || !ISO.test(j.asOf)) err(`${rel}/${name}`, 'missing or malformed asOf');
      if (!Array.isArray(j.rows)) { err(`${rel}/${name}`, 'rows must be a list'); return null; }
      return j.rows;
    } catch (e) {
      err(`${rel}/${name}`, `invalid JSON: ${e.message}`);
      return null;
    }
  };
  const cov = read('coverage.json') ?? [];
  const seen = new Set();
  for (const [i, r] of cov.entries()) {
    const w = `${rel}/coverage.json:rows[${i}]`;
    if (!/^co:[a-z0-9][a-z0-9-]*$/.test(r?.company ?? '')) err(w, `company ${JSON.stringify(r?.company)} is not a co: id`);
    if (seen.has(r?.company)) err(w, `${r.company} is declared twice`);
    seen.add(r?.company);
    if (!COVERAGE_READ.includes(r?.read)) err(w, `read ${JSON.stringify(r?.read)} is not one of ${COVERAGE_READ.join(' | ')}`);
    if (r?.read === 'not-read' ? r.asOf != null : !(typeof r?.asOf === 'string' && ISO.test(r.asOf))) err(w, 'asOf is the ISO date of what was read, and null exactly when nothing was');
    if (!domains.has(r?.domain)) err(w, `domain ${JSON.stringify(r?.domain)} is not a research file in ${rel}/`);
    if (!Array.isArray(r?.srcs) || !r.srcs.length) err(w, 'no sources — a read, or a failed attempt, is cited');
    srcShape(w, r?.srcs);
  }
  const ctl = read('controls.json') ?? [];
  const ids = new Set();
  for (const [i, r] of ctl.entries()) {
    const w = `${rel}/controls.json:rows[${i}]`;
    if (!CONTROL_ROLES.includes(r?.role)) err(w, `role ${JSON.stringify(r?.role)} is not one of ${CONTROL_ROLES.join(' | ')}`);
    if (typeof r?.resolved !== 'boolean') err(w, 'resolved must be true or false');
    if (r?.resolved === true && !(typeof r.id === 'string' && r.id)) err(w, 'a resolved row needs an id');
    if (r?.resolved === false && r.id != null) err(w, 'an unresolved row carries id null — never an id nobody defined');
    if (typeof r?.id === 'string') {
      if (ids.has(r.id)) err(w, `${r.id} is declared twice`);
      ids.add(r.id);
      fleetRefs.push({ where: w, id: r.id });
    }
    if (!(typeof r?.label === 'string' && r.label.trim())) err(w, 'label is required');
    if (!(typeof r?.declaredIn === 'string' && r.declaredIn.trim())) err(w, 'declaredIn is required — where the membership is declared');
  }
  notes.push(`${rel}: ${cov.length} coverage row(s), ${ctl.length} control row(s) declared`);
}

/**
 * P5/G4. One state/UT × FY row of a transcribed annexure: exactly FC_STATE_KEYS; st a
 * state code or null with a note; fy a financial year; receivedCr a number ≥ 0;
 * utilisedCr a number ≥ 0 or null; at least one source; no state-FY twice. Returns the
 * readable rows so the sum check can run on them. `strictKeys` (the module) also
 * requires the key order the generator writes.
 */
function checkFcStateRows(where, list, strictKeys = false) {
  if (!Array.isArray(list)) {
    err(where, `must be a list of { ${FC_STATE_KEYS.join(', ')} } rows`);
    return [];
  }
  const rows = [];
  const seen = new Set();
  for (const [i, r] of list.entries()) {
    const w = `${where}[${i}]`;
    if (!r || typeof r !== 'object' || Array.isArray(r)) { err(w, 'row must be an object'); continue; }
    const keys = Object.keys(r);
    if (strictKeys) {
      if (keys.join() !== FC_STATE_KEYS.join()) err(w, `keys ${keys.join(', ')} — expected ${FC_STATE_KEYS.join(', ')}`);
    } else {
      for (const k of keys) if (!FC_STATE_KEYS.includes(k)) err(w, `${k} is not a field of a state row (expected ${FC_STATE_KEYS.join(' | ')})`);
    }
    if (r.st != null && !STATE_CODES.includes(r.st)) err(w, `st "${r.st}" is not a state code`);
    if (r.st == null && !(typeof r.note === 'string' && r.note.trim())) err(w, 'st is null — a row that is not a state or UT needs a note saying what the annexure calls it');
    if (!(typeof r.stateName === 'string' && r.stateName.trim())) err(w, 'stateName is required');
    if (!fySpan(r.fy)) err(w, `fy ${JSON.stringify(r.fy)} is not a financial year written YYYY-YY`);
    if (!(typeof r.receivedCr === 'number' && Number.isFinite(r.receivedCr) && r.receivedCr >= 0)) err(w, `receivedCr ${JSON.stringify(r.receivedCr)} is not a number ≥ 0`);
    if (!(r.utilisedCr === null || (typeof r.utilisedCr === 'number' && Number.isFinite(r.utilisedCr) && r.utilisedCr >= 0))) err(w, `utilisedCr ${JSON.stringify(r.utilisedCr)} is not a number ≥ 0 or null`);
    if (!(Array.isArray(r.srcs) && r.srcs.length)) err(w, 'needs at least one [label, url] source');
    const key = `${r.st ?? `?${r.stateName}`}|${r.fy}`;
    if (seen.has(key)) err(w, `${r.stateName} ${r.fy} appears twice`);
    seen.add(key);
    rows.push(r);
  }
  return rows;
}

/** " — Σ receivedCr 2019-20 ₹16359.48 cr = c009 ₹16359.48 cr; …" for the notes, from the same match rule as the check. */
function fcSummary(rows, claims) {
  const fys = [...new Set(rows.map((r) => r.fy))].sort();
  const parts = fys.map((fy) => {
    const span = fySpan(fy);
    const list = rows.filter((r) => r.fy === fy);
    const sum = Math.round(list.reduce((a, r) => a + (typeof r.receivedCr === 'number' ? r.receivedCr : 0), 0) * 100) / 100;
    const urls = new Set(list.flatMap((r) => (r.srcs ?? []).map((x) => x?.[1])));
    const nat = span ? claims.filter((c) => c?.pred === 'grant' && c.supersededBy == null && typeof c.a === 'number' && c.from === span.from && c.to === span.to && (c.srcs ?? []).some((x) => urls.has(x?.[1]))) : [];
    return `${fy} Σ ₹${sum.toFixed(2)} cr vs ${nat.length ? nat.map((c) => `${c.id} ₹${c.a} cr`).join(', ') : 'no national row'}`;
  });
  return parts.length ? ` — ${parts.join('; ')}` : '';
}

for (const rel of FLEET_DIRS) {
  const dir = join(root, rel);
  if (!existsSync(dir)) continue;
  const fleetKey = FLEETS.find((f) => `research/raw/${f.dir}` === rel).key;
  const defined = definedByFleet.get(fleetKey);
  const ownership = FLEETS.find((f) => f.key === fleetKey).ownership === true;
  // An ownership fleet's declarations (coverage.json, controls.json) carry no claims or
  // entities: they are checked by their own rules after this loop, not as research.
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && !/^[A-Z]/.test(f) && !(ownership && OWNERSHIP_DECLARATIONS[f]));
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
    // P5/G4: a transcribed annexure is checked here from the raw rows, and again in §5
    // from the module, with the one rule in scripts/lib/vocab.mjs.
    if (j.fcByState != null) {
      const fcSpec = FLEETS.find((x) => x.key === fleetKey);
      if (fcSpec.fcState !== f.replace(/\.json$/, '')) warn(`${where}:fcByState`, `only ${fcSpec.fcState ?? '(no fcState domain for this fleet)'}.json is read for state rows — this list is not exported`);
      const rows = checkFcStateRows(`${where}:fcByState`, j.fcByState);
      for (const pr of fcStateSumProblems(rows, j.claims ?? [])) err(where, pr);
      notes.push(`${where}: ${rows.length} fcByState row(s) over ${new Set(rows.map((r) => r.fy)).size} FY(s)${fcSummary(rows, j.claims ?? [])}`);
    }

    const ids = new Set();
    const unresolved = new Set();
    for (const n of j.entities ?? []) {
      if (!n.id) { err(where, 'entity without id'); continue; }
      if (ids.has(n.id)) err(`${where}:${n.id}`, 'duplicate entity id');
      ids.add(n.id);
      dirIds.add(n.id);
      defined.add(n.id);
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
      defined.add(s.id);
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
      for (const id of [s.announced?.byPersonId, ...(s.ministers ?? []).map((m) => m?.personId), ...(s.whoElseBenefits ?? []).map((w) => w?.who)]) {
        if (typeof id === 'string' && id.includes(':')) fleetRefs.push({ where: `${where}:${s.id}`, id });
      }
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
        fleetRefs.push({ where: w, id: v });
      }
      if (c.benefit?.who) fleetRefs.push({ where: w, id: c.benefit.who });
      // A court's enforce claim is a ruling on a claim, not an agency acting on a subject.
      if (c.pred === 'enforce' && courtIds.has(c.s) && c.status !== 'killed') {
        const on = rulingOn(c.d);
        if (!on) warn(w, `court ruling modelled as enforce — begin d with "Judicial ruling on <claim id>: " naming the claim it rules on (FLEET_CONTRACT.md)`);
        else for (const id of on) if (!claimIds.has(id)) err(w, `"Judicial ruling on ${id}" names a claim that is not in this file`);
      }
      for (const d of ['from', 'to']) if (c[d] && !ISO.test(c[d])) err(w, `${d} "${c[d]}" is not an ISO date`);
      if (c.supersededBy && !claimIds.has(c.supersededBy)) err(w, `supersededBy "${c.supersededBy}" does not resolve — superseded facts stay addressable`);
      if (c.benefit?.who && !ids.has(c.benefit.who) && !KNOWN_PREFIX.test(c.benefit.who) && !atlasIds.has(c.benefit.who)) warn(w, `benefit.who "${c.benefit.who}" is not a known id`);
      // A loan or grant with no number must say so, or a ₹ total would read the gap as 0.
      if (c.status !== 'killed') {
        const amount = amountProblem(c);
        if (amount) err(w, amount);
      }
      for (const p of termsProblems(c.terms)) err(w, p);
      // G3a: an own claim in a holders file carries its line structured; the figures are the text's own.
      if (c.holding != null) for (const p of holdingProblems(c, f)) err(w, p);
      else if (ownership && c.pred === 'own' && /^holders(?:-|\.json$)/.test(f) && c.status !== 'killed') {
        err(w, 'own claim in a holders file without a holding block (G3a) — structure its line from its own text');
      }
      if (c.projectId != null && !(typeof c.projectId === 'string' && WB_PROJECT_ID.test(c.projectId))) err(w, `projectId ${JSON.stringify(c.projectId)} is not a World Bank project id (P and six digits)`);
      if (c.countedAs != null && c.countable !== false) err(w, 'countedAs is set, so countable must be false');
      if (c.notCountableReason != null && c.countable !== false) err(w, 'a notCountableReason is set, so countable must be false');
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
  if (ownership) checkDeclarations(rel, new Set(files.map((f) => f.replace(/\.json$/, ''))));
}

// Cross-file resolution: a fleet-prefixed id must exist in the fleet that owns the prefix.
for (const { where, id, fleet } of undefinedFleetRefs(definedByFleet, fleetRefs)) {
  err(where, `"${id}" carries the ${fleet} fleet's prefix but no file in research/raw/${FLEETS.find((f) => f.key === fleet).dir}/ defines it — define it there (or reuse the id that is)`);
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
// 5. Generated fleet modules — one per fleet in FLEETS (scripts/lib/vocab.mjs)
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

// The literal names each kind of module exports. A welfare module names its node
// and edge lists differently and carries coverage; every graph fleet is alike.
const GENERATED = FLEETS.map((f) => {
  const P = f.prefix;
  const common = { fleet: f.key, file: f.out, rawDir: `research/raw/${f.dir}`, benefits: `${P}_BENEFITS`, domains: `${P}_EDGE_DOMAIN`, meta: `${P}_META` };
  return f.kind === 'welfare'
    ? { ...common, nodes: [`${P}_ENTITIES`, `${P}_SCHEME_NODES`], edges: `${P}_CLAIMS`, coverage: `${P}_COVERAGE` }
    : { ...common, nodes: [`${P}_NODES`], edges: `${P}_EDGES` };
});
const generated = GENERATED.map((g) => {
  const path = join(root, g.file);
  if (!existsSync(path)) {
    // A fleet whose research has never run may have no module yet; one whose
    // research exists must have been assembled, or the site ships without it.
    if (existsSync(join(root, g.rawDir))) err(g.file, `generated module is missing but ${g.rawDir}/ exists — run npm run generate`);
    else notes.push(`${g.file}: not generated and ${g.rawDir}/ absent — fleet not started`);
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

// Loan facts — docs/design/FINANCE_PAGE.md §3.3 G1/G2/P1/P7. Re-checked from the literals
// with rules of this file's own, so a fault in the assembler's copy cannot pass itself:
// every loan edge has exactly one fact; a census fact agrees with its edge's `a` through
// its own US$ and rate; a researched fact carries no census-only figure; every countedAs
// points at a countable loan from the same lender; the census totals are the edges'.
const LOAN_FACT_KEYS = ['project', 'status', 'pipeline', 'usdM', 'fxRate', 'fxBasis', 'st', 'stBasis', 'majorSector', 'sector1', 'population', 'countable', 'countedAs', 'notCountableReason'];
const CENSUS_ONLY = ['status', 'pipeline', 'usdM', 'fxRate', 'fxBasis', 'st', 'stBasis', 'majorSector', 'sector1'];
const finiteOrNull = (v) => v === null || (typeof v === 'number' && Number.isFinite(v));
for (const m of generated) {
  if (!m) continue;
  for (const e of m.edges) {
    if (e.projectId === undefined) continue;
    if (!(typeof e.projectId === 'string' && WB_PROJECT_ID.test(e.projectId))) err(`${m.fleet}:edge:${e.id}`, `projectId ${JSON.stringify(e.projectId)} is not a World Bank project id (P and six digits)`);
    if (e.pred !== 'loan' && e.pred !== 'award') err(`${m.fleet}:edge:${e.id}`, `projectId on a ${e.pred} edge — it belongs on loan and award edges`);
  }
  const spec = FLEETS.find((f) => f.key === m.fleet);
  if (!spec?.loanCensus) continue;
  const P = spec.prefix;
  const census = spec.loanCensus;
  const facts = grabConst(m.file, m.src, `${P}_LOAN_FACTS`);
  if (facts == null) {
    err(m.file, `no readable ${P}_LOAN_FACTS literal — run npm run generate`);
    continue;
  }
  const totalsNull = new RegExp(`^export const ${P}_WB_TOTALS: WbTotals \\| null = null;$`, 'm').test(m.src);
  const wb = totalsNull ? null : grabConst(m.file, m.src, `${P}_WB_TOTALS`);
  if (!totalsNull && wb == null) err(m.file, `no readable ${P}_WB_TOTALS literal — run npm run generate`);
  const hasCensus = (m.meta.files ?? []).some((f) => f.domain === census);
  if (totalsNull && hasCensus) err(m.file, `${P}_WB_TOTALS is null but ${census}.json is a research file`);

  const edgeById = new Map(m.edges.map((e) => [e.id, e]));
  const loans = m.edges.filter((e) => e.pred === 'loan');
  for (const e of loans) if (!(e.id in facts)) err(`${m.fleet}:loan-facts:${e.id}`, `loan edge has no ${P}_LOAN_FACTS row`);
  for (const [id, f] of Object.entries(facts)) {
    const w = `${m.fleet}:loan-facts:${id}`;
    const e = edgeById.get(id);
    if (!e || e.pred !== 'loan') { err(w, 'fact for a claim that is not a loan edge'); continue; }
    const keys = Object.keys(f);
    if (keys.join() !== LOAN_FACT_KEYS.join()) err(w, `keys ${keys.join(', ')} — expected ${LOAN_FACT_KEYS.join(', ')}`);
    const isCensus = m.domains[id] === census;
    if (f.population !== (isCensus ? 'census' : 'researched')) err(w, `population "${f.population}" but the claim's domain is "${m.domains[id]}"`);
    if (f.project !== null && !(typeof f.project === 'string' && WB_PROJECT_ID.test(f.project))) err(w, `project ${JSON.stringify(f.project)} is not a World Bank project id`);
    if (f.project !== (e.projectId ?? null)) err(w, `project ${JSON.stringify(f.project)} differs from the edge's projectId ${JSON.stringify(e.projectId ?? null)}`);
    if (typeof f.countable !== 'boolean') err(w, 'countable must be true or false');
    if (f.countable === false && f.countedAs == null && f.notCountableReason == null) err(w, 'countable false with neither countedAs nor notCountableReason');
    if (f.countedAs != null && f.countable !== false) err(w, 'countedAs set on a countable fact');
    if (f.countedAs != null) {
      const t = facts[f.countedAs];
      const te = edgeById.get(f.countedAs);
      if (!t || !te) err(w, `countedAs "${f.countedAs}" is not a loan fact`);
      else {
        if (t.countable !== true) err(w, `countedAs "${f.countedAs}" is itself not countable`);
        if (te.s !== e.s) err(w, `countedAs "${f.countedAs}" is a loan from ${te.s}, not ${e.s}`);
        if (t.project != null && f.project != null && t.project !== f.project) err(w, `countedAs "${f.countedAs}" is project ${t.project}, not ${f.project}`);
      }
    }
    if (!isCensus) {
      for (const k of CENSUS_ONLY) if (f[k] !== null) err(w, `researched fact carries ${k} — census-only fields are null outside the census`);
      continue;
    }
    if (f.project == null) err(w, 'census fact without a project');
    else if (!(e.lab ?? '').startsWith(`${f.project} — `)) err(w, `project ${f.project} is not the project its lab names`);
    if (typeof f.status !== 'string') err(w, 'census fact without an API status');
    if (typeof f.pipeline !== 'boolean') err(w, 'census fact without a pipeline flag');
    if (f.st !== null && !STATE_CODES.includes(f.st)) err(w, `st "${f.st}" is not a state code`);
    if (f.stBasis !== null && !STATE_BASES.includes(f.stBasis)) err(w, `stBasis "${f.stBasis}" is not one of ${STATE_BASES.join(' | ')}`);
    if ((f.st === null) !== (f.stBasis === null)) err(w, 'st and stBasis must be set together');
    if (!finiteOrNull(f.usdM) || !finiteOrNull(f.fxRate)) err(w, 'usdM and fxRate must be numbers or null');
    if (f.pipeline === true && (f.countable !== false || e.a != null)) err(w, 'a pipeline leg is neither countable nor carries a ₹ amount');
    if (typeof e.a === 'number') {
      if (f.usdM == null || f.fxRate == null) err(w, `edge carries ₹${e.a} crore but the fact has no US$ amount or rate`);
      else if (Math.abs(e.a - (f.usdM * f.fxRate) / 10) > 0.001 * f.fxRate + 0.01) err(w, `edge ₹${e.a} crore ≠ US$${f.usdM} m × ₹${f.fxRate}/US$ — the fact and the edge disagree`);
    }
  }
  if (wb) {
    const tk = Object.keys(wb.totals ?? {});
    if (tk.join() !== WB_TOTAL_KEYS.join()) err(m.file, `${P}_WB_TOTALS.totals keys ${tk.join(', ')} — expected ${WB_TOTAL_KEYS.join(', ')}`);
    const heldCensus = [...(m.meta.killed ?? []), ...(m.meta.excluded ?? [])].filter((c) => c.domain === census && c.pred === 'loan');
    const censusFacts = Object.entries(facts).filter(([, f]) => f.population === 'census');
    if (wb.totals?.claims !== censusFacts.length + heldCensus.length) err(m.file, `${P}_WB_TOTALS.totals.claims ${wb.totals?.claims} ≠ ${censusFacts.length} census loan edges + ${heldCensus.length} held`);
    if (!heldCensus.length) {
      const pipe = censusFacts.filter(([, f]) => f.pipeline === true).length;
      if (wb.totals?.pipeline !== pipe) err(m.file, `${P}_WB_TOTALS.totals.pipeline ${wb.totals?.pipeline} ≠ ${pipe} pipeline census facts`);
      const crore = censusFacts.reduce((s, [id, f]) => s + (f.countable && typeof edgeById.get(id).a === 'number' ? edgeById.get(id).a : 0), 0);
      if (Math.abs((wb.totals?.croreExclPipeline ?? NaN) - crore) > 0.5) err(m.file, `${P}_WB_TOTALS.totals.croreExclPipeline ${wb.totals?.croreExclPipeline} ≠ Σ a over countable census edges ${crore.toFixed(2)}`);
    }
    if (!wb.fieldMap || typeof wb.fieldMap !== 'object') err(m.file, `${P}_WB_TOTALS.fieldMap missing`);
    if (!wb.fx || typeof wb.fx.indicator !== 'string') err(m.file, `${P}_WB_TOTALS.fx missing`);
  }
  // The reconciliation owns every researched counting mark (RECONCILIATION.json countedAs and
  // notCountable). Read from the raw file, not the module, so a module generated before a
  // mark was added — or after one was removed — fails here.
  const recPath = join(root, m.rawDir, 'RECONCILIATION.json');
  let rec = null;
  if (existsSync(recPath)) {
    try { rec = JSON.parse(readFileSync(recPath, 'utf8')); } catch (e) { err(`${m.rawDir}/RECONCILIATION.json`, `invalid JSON: ${e.message}`); }
  }
  const recCounted = new Map((Array.isArray(rec?.countedAs) ? rec.countedAs : []).map((x) => [x?.claimId, x?.countedAs]));
  const recNot = new Map();
  for (const [i, x] of (Array.isArray(rec?.notCountable) ? rec.notCountable : []).entries()) {
    const w = `${m.rawDir}/RECONCILIATION.json:notCountable[${i}]`;
    if (!NOT_COUNTABLE_CLASSES.includes(x?.class)) err(w, `class ${JSON.stringify(x?.class)} is not one of ${NOT_COUNTABLE_CLASSES.join(' | ')}`);
    if (x?.class === 'facility-envelope') {
      const tr = Array.isArray(x.tranches) ? x.tranches : [];
      if (!tr.length) err(w, 'a facility-envelope entry lists its tranches');
      for (const t of tr) if (facts[t]?.countable !== true) err(w, `tranche ${JSON.stringify(t)} is not a countable loan fact`);
    }
    recNot.set(x?.claimId, x?.notCountableReason);
  }
  for (const [id, want] of recCounted) {
    if (facts[id]?.countedAs !== want) err(`${m.fleet}:loan-facts:${id}`, `RECONCILIATION.json countedAs says ${JSON.stringify(want)}; the module says ${JSON.stringify(facts[id]?.countedAs ?? null)} — run npm run generate`);
  }
  for (const [id, want] of recNot) {
    const f = facts[id];
    if (!f || f.population !== 'researched' || f.countable !== false || f.countedAs != null || f.notCountableReason !== want) {
      err(`${m.fleet}:loan-facts:${id}`, `RECONCILIATION.json notCountable lists it; the module has ${f ? `countable ${f.countable}, countedAs ${JSON.stringify(f.countedAs)}, notCountableReason ${JSON.stringify(f.notCountableReason)}` : 'no loan fact'} — run npm run generate`);
    }
  }
  for (const [id, f] of Object.entries(facts)) {
    if (f.population !== 'researched' || f.countable !== false) continue;
    if (f.countedAs != null ? recCounted.get(id) !== f.countedAs : !recNot.has(id)) err(`${m.fleet}:loan-facts:${id}`, 'researched fact is not countable but RECONCILIATION.json records no such mark — the reconciliation owns every counting mark');
  }
  const n = Object.keys(facts).length;
  const counted = Object.values(facts).filter((f) => f.countedAs != null).length;
  const notLoan = Object.values(facts).filter((f) => f.population === 'researched' && f.countable === false && f.countedAs == null).length;
  notes.push(`${m.file}: ${n} loan fact(s) — ${Object.values(facts).filter((f) => f.population === 'census').length} census, ${n - Object.values(facts).filter((f) => f.population === 'census').length} researched, ${counted} countedAs another record, ${notLoan} not a loan (RECONCILIATION notCountable)`);
}

// Ownership exports — docs/design/FINANCE_PAGE.md §3.3 G3a–c, for every FLEETS row with
// `ownership: true`. Re-checked from the literals with this file's own rules: each holding
// keys a surviving own edge and is read from that edge's own text; every own edge from a
// holders file has one; an aggregate is exactly a holders-aggregates edge; coverage has
// one row per NIFTY 50 constituent and never calls a company with a filing line
// "not read"; a resolved control is an id something defines, an unresolved one has none.
const niftyIds = (() => {
  try {
    const j = JSON.parse(readFileSync(join(root, 'research/raw/indices.json'), 'utf8'));
    return (j.indices?.nifty50 ?? []).map((c) => c.existingId).filter(Boolean);
  } catch {
    return null; // indices.json has its own check in §4; coverage completeness is then reported as unverifiable
  }
})();
for (const m of generated) {
  if (!m) continue;
  const spec = FLEETS.find((f) => f.key === m.fleet);
  if (!spec?.ownership) continue;
  const P = spec.prefix;
  const lit = (name) => {
    const v = grabConst(m.file, m.src, name);
    if (v == null) err(m.file, `no readable ${name} literal — run npm run generate`);
    return v;
  };
  const holdings = lit(`${P}_HOLDINGS`);
  const coverage = lit(`${P}_COVERAGE`);
  const controls = lit(`${P}_CONTROLS`);
  if (holdings == null || coverage == null || controls == null) continue;

  const edgeById = new Map(m.edges.map((e) => [e.id, e]));
  for (const [id, h] of Object.entries(holdings)) {
    const w = `${m.fleet}:holdings:${id}`;
    const e = edgeById.get(id);
    if (!e) { err(w, 'holding for a claim that is not an edge'); continue; }
    const keys = Object.keys(h);
    if (keys.join() !== HOLDING_KEYS.join()) err(w, `keys ${keys.join(', ')} — expected ${HOLDING_KEYS.join(', ')}`);
    const problems = holdingProblems({ ...e, holding: h }, `${m.domains[id]}.json`);
    for (const p of problems) err(w, p);
  }
  const ownFromHolders = m.edges.filter((e) => e.pred === 'own' && /^holders(?:-|$)/.test(m.domains[e.id] ?? ''));
  for (const e of ownFromHolders) if (!(e.id in holdings)) err(`${m.fleet}:holdings:${e.id}`, `own edge from ${m.domains[e.id]}.json has no ${P}_HOLDINGS row`);

  const fileDomains = new Set((m.meta.files ?? []).map((f) => f.domain));
  const covered = new Map();
  for (const [i, r] of coverage.entries()) {
    const w = `${m.fleet}:coverage[${i}]`;
    if (covered.has(r.company)) err(w, `${r.company} is declared twice`);
    covered.set(r.company, r);
    if (!COVERAGE_READ.includes(r.read)) err(w, `read "${r.read}" is not one of ${COVERAGE_READ.join(' | ')}`);
    if ((r.read === 'not-read') !== (r.asOf == null)) err(w, 'asOf is null exactly when nothing was read');
    if (r.asOf != null && !ISO.test(r.asOf)) err(w, `asOf "${r.asOf}" is not an ISO date`);
    if (!fileDomains.has(r.domain)) err(w, `domain "${r.domain}" is not a research file in META.files`);
    if (!(r.srcs?.length)) err(w, 'coverage row without sources');
  }
  if (niftyIds == null) warn(m.file, `${P}_COVERAGE completeness unverifiable — research/raw/indices.json unreadable`);
  else if (coverage.length) {
    for (const id of niftyIds) if (!covered.has(id)) err(`${m.fleet}:coverage`, `NIFTY 50 constituent ${id} has no coverage row`);
    for (const id of covered.keys()) if (!niftyIds.includes(id)) err(`${m.fleet}:coverage`, `${id} is not a NIFTY 50 constituent in research/raw/indices.json`);
  }
  // A company with a filing line recorded was read — "not read" would hide it.
  for (const [id, h] of Object.entries(holdings)) {
    const t = edgeById.get(id)?.t;
    if (!h.aggregate && covered.get(t)?.read === 'not-read') err(`${m.fleet}:coverage:${t}`, `declared not-read but ${id} records a filing line in it`);
  }

  const seen = new Set();
  for (const [i, r] of controls.entries()) {
    const w = `${m.fleet}:controls[${i}]`;
    if (!CONTROL_ROLES.includes(r.role)) err(w, `role "${r.role}" is not one of ${CONTROL_ROLES.join(' | ')}`);
    if (r.resolved !== (r.id != null)) err(w, 'a resolved row has an id and an unresolved row has none');
    if (r.id != null) {
      if (seen.has(r.id)) err(w, `${r.id} is declared twice`);
      seen.add(r.id);
      if (!(fleetNodeIds.has(r.id) || atlasIds.has(r.id) || INVENTORY.test(r.id))) err(w, `"${r.id}" resolves to no fleet node, atlas id or inventory id`);
    }
    if (!r.declaredIn) err(w, 'declaredIn is required');
  }
  const byRead = COVERAGE_READ.map((k) => `${coverage.filter((r) => r.read === k).length} ${k}`).join(', ');
  const band = controls.filter((r) => ['subject', 'comparison', 'domestic-control'].includes(r.role)).length;
  notes.push(`${m.file}: ${Object.keys(holdings).length} holding(s) (${Object.values(holdings).filter((h) => h.pct == null).length} without a pct, ${Object.values(holdings).filter((h) => h.aggregate).length} aggregate); coverage ${byRead}; ${controls.length} control row(s), ${band} in the holder comparison set`);
}

// State-wise FC — docs/design/FINANCE_PAGE.md §3.3 P5/G4, for every FLEETS row with an
// `fcState` domain. Re-checked from the literal with this file's own rules: the export
// must be readable even when empty (a module without it is stale); every row has the
// generator's keys in order, a state code (or null with a note), a financial year and
// a figure; and each FY's rows add up to the module's own current national grant edge
// of that domain, within ₹1 crore, or the module is refused.
for (const m of generated) {
  if (!m) continue;
  const spec = FLEETS.find((f) => f.key === m.fleet);
  if (!spec?.fcState) continue;
  const P = spec.prefix;
  const rows = grabConst(m.file, m.src, `${P}_FC_STATE`);
  if (rows == null) {
    err(m.file, `no readable ${P}_FC_STATE literal — run npm run generate`);
    continue;
  }
  const hasFile = (m.meta.files ?? []).some((f) => f.domain === spec.fcState);
  if (rows.length && !hasFile) err(m.file, `${P}_FC_STATE has ${rows.length} row(s) but ${spec.fcState}.json is not a research file in META.files`);
  const ok = checkFcStateRows(`${m.fleet}:fc-state`, rows, true);
  const national = m.edges.filter((e) => m.domains[e.id] === spec.fcState);
  for (const pr of fcStateSumProblems(ok, national)) err(m.file, pr);
  const withCode = ok.filter((r) => r.st !== null).length;
  notes.push(`${m.file}: ${ok.length} state row(s) (${withCode} with a state code, ${new Set(ok.filter((r) => r.st).map((r) => r.st)).size} distinct states/UTs) over ${new Set(ok.map((r) => r.fy)).size} FY(s)${fcSummary(ok, national)}`);
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
