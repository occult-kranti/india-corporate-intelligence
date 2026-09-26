#!/usr/bin/env node
/**
 * Fleet assembly: research/raw/<fleet>/ → typed, generated TypeScript, for every
 * fleet in the FLEETS table (scripts/lib/vocab.mjs).
 *
 * The codegen step docs/PLATFORM_PLAN.md §1 calls `npm run generate`, scoped to the
 * research fleets (docs/research/FLEET_CONTRACT.md). validate.mjs §4 checks each
 * raw file alone at the quarantine boundary; this script checks the ASSEMBLED fleet,
 * because a file that was valid alone can stop being valid once reconciliation has
 * collapsed its entities or an audit verdict has downgraded the claim its denial
 * answered. It is the last gate before TypeScript.
 *
 *   1. read       every research file whose name does not start with a capital —
 *                 RECONCILIATION.json and AUDIT.json are by-products, not research
 *   2. reconcile  RECONCILIATION.json rewrites ids from → to; records that collapse
 *                 onto one id merge aliases, facts and sources, first record wins
 *   3. audit      AUDIT.json verdicts kill, downgrade, fill innocent readings and add
 *                 denials (rules at applyAudit)
 *   4. gate       the four invariants over what survives — any failure exits 1 and
 *                 writes nothing
 *   5. emit       one module per row of FLEETS (scripts/lib/vocab.mjs): energy and
 *                 welfare, and finance, ngo and capital (Phase G)
 *
 * It never fails on a killed or unresolved record: those are held out of the edges
 * and carried whole in META, because nothing is deleted. It never reads a clock. And
 * it never makes the build depend on research having run — an absent fleet emits an
 * empty module that says so.
 *
 * Usage:
 *   node scripts/assemble-fleet.mjs                 write every fleet's module
 *   node scripts/assemble-fleet.mjs --dir <path>    read <path>/<fleet dir> for each fleet
 *   node scripts/assemble-fleet.mjs --out <path>    write under <path>/src/… instead
 *
 * Each fleet is written independently: a fleet whose research fails assembly leaves
 * its own module untouched and the run exits 1, but a fleet that assembles cleanly is
 * still written. One sweep's fault must not hold another sweep's module hostage.
 *
 * The assembly is exported as assembleFleet() (and assemble(), the per-fleet view)
 * so scripts/validate.mjs can re-run it in memory and fail when a module on disk no
 * longer matches its inputs.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname, relative, resolve, isAbsolute, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  TIERS, PREDS, NODE_TYPES, FAMILIES, STATE_CODES, NARRATIVE_STATUS, SCHEME_STATUS, SCHEME_CATEGORIES, ISO_DATE, INVENTORY,
  FLEETS, TERMS_KEYS, amountProblem, STATE_BASES, WB_TOTAL_KEYS, WB_PROJECT_ID,
  OWNERSHIP_DECLARATIONS, HOLDING_CATEGORIES, HOLDING_KEYS, COVERAGE_READ, CONTROL_ROLES, holdingTextProblem,
  FC_STATE_KEYS, fySpan, fcStateSumProblems, NOT_COUNTABLE_CLASSES,
} from './lib/vocab.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Folded into the run id, as PIPELINE_VERSION is in promote.mjs: when a rule below
 * changes, the stamp must change even if no research file did.
 */
export const GENERATOR_VERSION = '1.4.1';
const GENERATOR = 'scripts/assemble-fleet.mjs';

/** Fleet key → the module it is written to, relative to the repository root. Read from FLEETS. */
export const OUTPUTS = Object.fromEntries(FLEETS.map((f) => [f.key, f.out]));

const MINISTER_ACTIONS = ['announced', 'approved', 'presented budget', 'administers', 'opposed'];
const CONFIDENCE = ['documented', 'estimated', 'unknown'];


/**
 * Why a claim's predicate cannot be emitted, or null. A tier written as a predicate
 * is the common slip, so it gets its own words — the fix belongs in the raw file,
 * and guessing which predicate was meant would put words in the researcher's mouth.
 */
export function predProblem(p) {
  if (PREDS.includes(p)) return null;
  if (p === 'alleged') return 'alleged is a tier, not a predicate — did you mean pred contra/enforce with tier alleged?';
  if (TIERS.includes(p)) return `${p} is a tier, not a predicate — keep tier ${p} and choose a predicate`;
  return `unknown predicate ${JSON.stringify(p)} (expected ${PREDS.join(' | ')})`;
}

// ---------------------------------------------------------------------------
// 0. Primitives
// ---------------------------------------------------------------------------

/**
 * FNV-1a, 64-bit — copied from promote.mjs so the two run ids are the same kind
 * of object. The only requirement is that it is a stable function of its input.
 */
function fnv1a64(str) {
  const PRIME = 0x100000001b3n;
  const MASK = (1n << 64n) - 1n;
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i) & 0xffff);
    h = (h * PRIME) & MASK;
  }
  return h.toString(16).padStart(16, '0');
}

/** Code-unit order, not localeCompare: ICU collation differs between machines, and a generated file must not. */
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isSource = (s) => Array.isArray(s) && s.length === 2 && typeof s[0] === 'string' && typeof s[1] === 'string';

function union(a, b, keyOf = (x) => x) {
  const out = [];
  const seen = new Set();
  for (const x of [...(a ?? []), ...(b ?? [])]) {
    const k = keyOf(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Errors and warnings, de-duplicated — a mapping cycle hit by forty claims is one fault, not forty. */
function makeSink() {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const push = (list, where, msg) => {
    const line = `${where}: ${msg}`;
    if (seen.has(line)) return;
    seen.add(line);
    list.push(line);
  };
  return {
    errors,
    warnings,
    error: (where, msg) => push(errors, where, msg),
    warn: (where, msg) => push(warnings, where, msg),
  };
}

/**
 * Field readers that either return a value TypeScript will accept under the
 * declared type or record an error. Strict readers back every emitted edge, node
 * and scheme: a value that would fail `tsc --strict` fails here instead, with the
 * research file and field named. Lenient readers back held (killed or excluded)
 * claims, which must never fail the run.
 */
function readers(sink, where, lenient = false) {
  const bad = (f, msg) => {
    if (!lenient) sink.error(`${where}${f ? `.${f}` : ''}`, msg);
  };
  const r = {
    bad,
    str(v, f) {
      if (v == null) return null;
      if (typeof v === 'string') return v;
      // A number where text belongs ("seatChange": 46) loses nothing by quoting.
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      if (lenient) return JSON.stringify(v);
      bad(f, `expected text, found ${JSON.stringify(v)}`);
      return null;
    },
    /** A date: ISO 8601 at year, month or day precision. Never pad a missing day. */
    date(v, f) {
      const s = r.str(v, f);
      if (s != null && !ISO_DATE.test(s)) {
        bad(f, `${JSON.stringify(s)} is not an ISO date (YYYY, YYYY-MM or YYYY-MM-DD)`);
        return lenient ? s : null;
      }
      return s;
    },
    reqStr(v, f) {
      const s = r.str(v, f);
      if (s == null || s.trim() === '') {
        bad(f, 'is required');
        return lenient ? String(v ?? '') : '';
      }
      return s;
    },
    num(v, f) {
      if (v == null) return null;
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      bad(f, `expected a number, found ${JSON.stringify(v)} — a figure that is not a number is a gap, record it as null`);
      return null;
    },
    bool(v, f) {
      if (v == null) return null;
      if (typeof v === 'boolean') return v;
      bad(f, `expected true/false, found ${JSON.stringify(v)}`);
      return null;
    },
    oneOf(v, list, f, required = false) {
      if (v == null) {
        if (required) bad(f, `is required (one of ${list.join(' | ')})`);
        return lenient && required ? '' : null;
      }
      if (list.includes(v)) return v;
      bad(f, `unknown value ${JSON.stringify(v)} (expected ${list.join(' | ')})`);
      return lenient ? String(v) : null;
    },
    srcs(v, f) {
      const out = [];
      for (const [i, s] of asList(v).entries()) {
        if (isSource(s)) out.push([s[0], s[1]]);
        else bad(`${f}[${i}]`, `source must be [label, url], found ${JSON.stringify(s)}`);
      }
      return out;
    },
    list(v, f) {
      if (v == null) return [];
      if (Array.isArray(v)) return v;
      bad(f, `expected a list, found ${JSON.stringify(v)}`);
      return [];
    },
    obj(v, f) {
      if (v == null) return null;
      if (typeof v === 'object' && !Array.isArray(v)) return v;
      bad(f, `expected an object, found ${JSON.stringify(v)}`);
      return null;
    },
    /** Entity facts are a list; a single string is read as a one-fact list. */
    texts(v, f) {
      const out = [];
      for (const [i, x] of asList(v).entries()) {
        const s = r.str(x, `${f}[${i}]`);
        if (s != null && s.trim() !== '') out.push(s);
      }
      return out;
    },
  };
  return r;
}

/** Atlas ids from src/graph/data.ts, by the same literal grab validate.mjs uses. */
function readAtlasIds(root, sink) {
  const file = join(root, 'src/graph/data.ts');
  if (!existsSync(file)) return new Set();
  const m = readFileSync(file, 'utf8').match(/export const NODES\b[^=]*=\s*(\[[\s\S]*?\n\];)/m);
  if (!m) {
    sink.error('src/graph/data.ts', 'could not find the NODES literal — atlas ids cannot be resolved');
    return new Set();
  }
  try {
    const nodes = Function(`"use strict"; return (${m[1].replace(/;$/, '')});`)();
    return new Set(nodes.map((n) => n.id));
  } catch (e) {
    sink.error('src/graph/data.ts', `could not parse NODES: ${e.message}`);
    return new Set();
  }
}

// ---------------------------------------------------------------------------
// 1. Read
// ---------------------------------------------------------------------------

/**
 * A fleet's research, read from <rawDir>/<spec.dir>. `fleet` is the fleet's key (its
 * identity in META and in the sinks); `dir` is the directory name every path in a
 * message or a header is written under. A missing directory is not an error: it is
 * a fleet whose research has not run, and it reads as `empty: true`.
 */
function readFleet(rawDir, spec, sink) {
  const fleet = spec.dir;
  const dir = join(rawDir, fleet);
  const out = { fleet: spec.key, dir: spec.dir, kind: spec.kind, spec, files: [], reconciliation: null, audit: null, declarations: {}, inputs: [], empty: !existsSync(dir) };
  if (out.empty) return out;
  const names = readdirSync(dir).filter((f) => f.endsWith('.json')).sort(cmp);
  for (const name of names) {
    const byProduct = /^[A-Z]/.test(name);
    // Other capitalised files are by-products this script does not read, so they
    // stay out of the run id too: editing one cannot make a module stale.
    if (byProduct && name !== 'RECONCILIATION.json' && name !== 'AUDIT.json') continue;
    const text = readFileSync(join(dir, name), 'utf8');
    out.inputs.push({ name: `${fleet}/${name}`, text });
    let doc;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      // A half-written file cannot be assembled, and skipping it would make the
      // output depend on when the run happened.
      sink.error(`${fleet}/${name}`, `invalid JSON: ${e.message}`);
      continue;
    }
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
      sink.error(`${fleet}/${name}`, 'top level must be an object');
      continue;
    }
    if (name === 'RECONCILIATION.json') out.reconciliation = doc;
    else if (name === 'AUDIT.json') out.audit = doc;
    // An ownership fleet's declaration (coverage.json, controls.json) is an input — the
    // run id covers it — but not research: no claims, no domain, no META.files row.
    else if (spec.ownership && OWNERSHIP_DECLARATIONS[name]) out.declarations[OWNERSHIP_DECLARATIONS[name]] = { name, doc };
    else {
      // The file stem is the domain: the contract names each file after its domain,
      // and pages join claims to sweeps on it, so one spelling must win everywhere.
      const domain = name.replace(/\.json$/, '');
      if (doc.domain != null && doc.domain !== domain) {
        sink.warn(`${fleet}/${name}`, `domain ${JSON.stringify(doc.domain)} differs from the file name — "${domain}" is used`);
      }
      out.files.push({ name, doc, domain });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. Reconcile
// ---------------------------------------------------------------------------

function reconciler(rec, fleet, sink) {
  const where = `${fleet}/RECONCILIATION.json`;
  const map = new Map();
  const mappings = [];
  for (const [i, m] of asList(rec?.mappings).entries()) {
    if (!m || !isStr(m.from) || !isStr(m.to)) {
      sink.error(`${where}:mappings[${i}]`, 'a mapping needs string `from` and `to`');
      continue;
    }
    if (map.has(m.from) && map.get(m.from) !== m.to) {
      sink.error(`${where}:mappings[${i}]`, `"${m.from}" is mapped to both "${map.get(m.from)}" and "${m.to}"`);
      continue;
    }
    map.set(m.from, m.to);
    const note = [m.reason, m.rationale, m.note, m.basis].find(isStr) ?? null;
    mappings.push({ from: m.from, to: m.to, note });
  }
  mappings.sort((a, b) => cmp(a.from, b.from) || cmp(a.to, b.to));
  // Chains resolve to their end (a→b, b→c ⇒ a→c). A cycle is an error, not a loop.
  const rewrite = (id) => {
    if (typeof id !== 'string') return id;
    let cur = id;
    const seen = new Set();
    while (map.has(cur)) {
      if (seen.has(cur)) {
        sink.error(where, `mapping cycle through "${id}"`);
        return id;
      }
      seen.add(cur);
      cur = map.get(cur);
    }
    return cur;
  };
  return { mappings, rewrite };
}

/** JSON with object keys sorted at every depth: equal entries get equal keys whatever order they were written in. */
function stableKey(x) {
  const sort = (v) => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort(cmp).map((k) => [k, sort(v[k])])) : v);
  return JSON.stringify(sort(x));
}

/**
 * Records that collapse onto one id — by reconciliation, or because two sweeps
 * reused one id — become one record, and nothing either wrote is dropped:
 *   - every list (aliases, facts, sources, and a scheme's status history, outlay,
 *     beneficiaries, results, ministers, who-else-benefits) is unioned, de-duplicated
 *     on a key-sorted JSON key, in input order, first file first. Status history is
 *     supersession: losing a later sweep's entries would delete facts;
 *   - `benefit` merges the same way one level down, so `benefit.changes` unions too;
 *   - every other field is the first record's, except that a null the first left is
 *     filled from a later record — and each fill is noted, so META says which file
 *     supplied the value.
 * "First" is file-name order, then order within the file.
 */
function mergeRecords(a, b, bFile, filled, prefix = '') {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    if (k === 'id') continue;
    const av = a[k];
    const bv = b[k];
    if (bv == null) continue;
    if (Array.isArray(av) || Array.isArray(bv)) {
      out[k] = union(asList(av), asList(bv), stableKey);
    } else if (k === 'benefit' && prefix === '' && av && typeof av === 'object' && typeof bv === 'object') {
      out[k] = mergeRecords(av, bv, bFile, filled, 'benefit.');
    } else if (av == null) {
      out[k] = bv;
      filled.push({ field: `${prefix}${k}`, file: bFile });
    }
  }
  return out;
}

function collectRecords(files, section, rewrite, fleet, sink) {
  const byId = new Map();
  for (const { name, doc } of files) {
    for (const [i, raw] of asList(doc[section]).entries()) {
      if (!raw || typeof raw !== 'object' || !isStr(raw.id)) {
        sink.error(`${fleet}/${name}:${section}[${i}]`, 'record without an id');
        continue;
      }
      const rec = { ...raw, id: rewrite(raw.id) };
      const prior = byId.get(rec.id);
      if (!prior) byId.set(rec.id, { rec, ids: [raw.id], files: [`${fleet}/${name}`], filledFrom: [] });
      else {
        prior.rec = mergeRecords(prior.rec, rec, `${fleet}/${name}`, prior.filledFrom);
        prior.ids.push(raw.id);
        prior.files.push(`${fleet}/${name}`);
      }
    }
  }
  return byId;
}

function collectClaims(files, rewrite, fleet, sink) {
  const claims = [];
  const duplicates = [];
  const firstFile = new Map();
  for (const { name, doc, domain } of files) {
    for (const [i, raw] of asList(doc.claims).entries()) {
      if (!raw || typeof raw !== 'object') {
        sink.error(`${fleet}/${name}:claims[${i}]`, 'claim is not an object');
        continue;
      }
      const id = isStr(raw.id) ? raw.id : `${raw.s}~${raw.pred}~${raw.t}`;
      const c = { ...raw, id, s: rewrite(raw.s), t: rewrite(raw.t), domain, file: `${fleet}/${name}` };
      if (raw.benefit && typeof raw.benefit === 'object') c.benefit = { ...raw.benefit, who: rewrite(raw.benefit.who) };
      if (firstFile.has(id)) {
        // Held, not dropped: the second copy is still on the record.
        duplicates.push({ c, reason: `duplicate claim id — first defined in ${firstFile.get(id)}` });
        continue;
      }
      firstFile.set(id, c.file);
      claims.push(c);
    }
  }
  return { claims, duplicates };
}

// ---------------------------------------------------------------------------
// 3. Audit
// ---------------------------------------------------------------------------

const URL_RE = /https?:\/\/[^\s<>"'()\]]+/;

function extractUrl(text) {
  const m = URL_RE.exec(text ?? '');
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null;
}

function readVerdict(v, i) {
  const s = (x) => (x == null ? null : typeof x === 'string' ? x : JSON.stringify(x));
  return {
    claimId: s(v?.claimId) ?? `(verdict ${i} without claimId)`,
    domain: s(v?.domain),
    lens: s(v?.lens),
    refuted: v?.refuted === true || (typeof v?.refuted === 'string' && v.refuted.trim().toLowerCase() === 'true'),
    recommendedTier: s(v?.recommendedTier),
    sourceCheck: s(v?.sourceCheck),
    denialFound: s(v?.denialFound),
    innocentReading: s(v?.innocentReading),
    reason: s(v?.reason),
    corrections: asList(v?.corrections).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))),
    applied: [],
  };
}

/**
 * Which endpoint a denial speaks for. `enforce` points agency → subject, so there
 * the accused is the target; so is a claim whose named beneficiary is its target.
 * Everywhere else the contract's directions (money s→t, owner→owned, person→office,
 * awarder→winner without a beneficiary) put the actor whose conduct is at issue in `s`.
 */
/** A verdict's recommendation, compared case-blind: "Kill" must not be read as "no opinion". */
const recOf = (v) => (v.recommendedTier ?? '').trim().toLowerCase();

const accusedOf = (c) => (c.pred === 'enforce' || (c.benefit && c.benefit.who === c.t) ? c.t : c.s);

/**
 * The verdict rules, each deterministic:
 *   (a) recommendedTier 'kill', or refuted by two distinct lenses → killed, with the
 *       reasons joined; held out of the edges, kept in META.killed.
 *   (b) otherwise the tier becomes the most conservative of its own and every
 *       recommended tier (documented < reported < alleged < analytic). Never upward.
 *   (c) a verdict's innocentReading fills a missing one.
 *   (d) a denial the verdict found, with the source check confirmed, becomes a
 *       `contra` claim answering this one — 'reported' when the denial carries a
 *       URL to cite, 'alleged' when it does not.
 * One lens refuting a claim is a reason to downgrade, not to kill: the two lenses
 * test different things, and only agreement between them removes a claim.
 */
function applyAudit(claims, auditDoc, fleet) {
  if (!auditDoc) return { audit: null, killed: new Map(), contras: [] };
  const verdicts = asList(auditDoc.verdicts).map(readVerdict);
  const order = verdicts.map((v, i) => ({ v, i }));
  order.sort((a, b) => cmp(a.v.claimId, b.v.claimId) || cmp(a.v.lens ?? '', b.v.lens ?? '') || a.i - b.i);
  const byClaim = new Map();
  for (const { v } of order) {
    if (!byClaim.has(v.claimId)) byClaim.set(v.claimId, []);
    byClaim.get(v.claimId).push(v);
  }

  const killed = new Map();
  const contras = [];
  const taken = new Set(claims.map((c) => c.id));
  const applied = [];
  const unmatched = [];

  for (const c of [...claims].sort((a, b) => cmp(a.id, b.id))) {
    const vs = byClaim.get(c.id);
    if (!vs) continue;
    byClaim.delete(c.id);
    applied.push(...vs);
    if (c.status === 'killed') {
      for (const v of vs) v.applied.push('claim already killed in the research file — verdict recorded only');
      continue;
    }

    const killTier = vs.some((v) => recOf(v) === 'kill');
    const refutedBy = new Set(vs.filter((v) => v.refuted).map((v) => v.lens ?? '(unnamed lens)'));
    if (killTier || refutedBy.size >= 2) {
      const reasons = union(vs.map((v) => v.reason).filter(isStr), []);
      killed.set(c.id, reasons.join(' | ') || (killTier ? 'audit recommended kill' : 'refuted under both lenses'));
      for (const v of vs) v.applied.push(killTier ? (recOf(v) === 'kill' ? 'killed: recommended kill' : 'killed') : 'killed: refuted under both lenses');
      continue;
    }

    const original = c.tier;
    const start = TIERS.indexOf(original);
    let final = start;
    for (const v of vs) {
      const k = TIERS.indexOf(recOf(v));
      if (k < 0) {
        if (v.recommendedTier != null) v.applied.push(`recommendedTier ${JSON.stringify(v.recommendedTier)} not a tier — ignored`);
        continue;
      }
      if (start < 0) continue;
      if (k > start) v.applied.push(`downgrade ${original} → ${TIERS[k]}`);
      else if (k < start) v.applied.push(`no upgrade: recommended ${TIERS[k]}, kept ${original}`);
      final = Math.max(final, k);
    }
    if (start >= 0 && final !== start) c.tier = TIERS[final];

    for (const v of vs) {
      if (!isStr(c.innocentReading) && isStr(v.innocentReading)) {
        c.innocentReading = v.innocentReading;
        v.applied.push('innocentReading filled');
      }
    }

    const denials = new Set();
    for (const v of vs) {
      const text = v.denialFound?.trim();
      if (!text || /^none/i.test(text) || (v.sourceCheck ?? '').trim().toLowerCase() !== 'confirmed') continue;
      if (denials.has(text)) {
        v.applied.push('denial already recorded by another verdict');
        continue;
      }
      denials.add(text);
      const url = extractUrl(text);
      let id = `${c.id}:audit-contra`;
      for (let n = 2; taken.has(id); n++) id = `${c.id}:audit-contra-${n}`;
      taken.add(id);
      let host = null;
      try {
        host = url ? new URL(url).hostname : null;
      } catch {
        host = null; // an unparseable URL still cites; the label just loses its host
      }
      contras.push({
        id,
        s: accusedOf(c),
        t: `claim:${c.id}`,
        pred: 'contra',
        tier: url ? 'reported' : 'alleged',
        lab: 'denial found in audit',
        d: text,
        ...(url ? { srcs: [[`Denial${host ? ` — ${host}` : ''}`, url]] } : {}),
        domain: c.domain,
        file: `${fleet}/AUDIT.json`,
      });
      v.applied.push(`contra added ${id}`);
    }
    for (const v of vs) if (!v.applied.length) v.applied.push('recorded');
  }

  for (const vs of byClaim.values()) {
    for (const v of vs) {
      v.applied.push('no claim with this id in the fleet');
      unmatched.push(v);
    }
  }
  const audit = {
    asOf: typeof auditDoc.asOf === 'string' ? auditDoc.asOf : null,
    verdicts: applied,
    unmatched,
  };
  return { audit, killed, contras };
}

// ---------------------------------------------------------------------------
// 4. Normalise — to the exact shapes the hand-written types declare
// ---------------------------------------------------------------------------

function toNode(e, where, sink) {
  const r = readers(sink, where);
  const n = { id: e.id, label: r.reqStr(e.label, 'label') };
  const sub = r.str(e.sub, 'sub');
  if (sub != null) n.sub = sub;
  n.ty = r.oneOf(e.ty, NODE_TYPES, 'ty', true);
  n.fam = r.oneOf(e.fam, FAMILIES, 'fam', true);
  // Absent stays absent; null means "non-geographic" and is said explicitly.
  if (e.st === null) n.st = null;
  else if (e.st !== undefined) n.st = r.oneOf(e.st, STATE_CODES, 'st');
  // Visual weight only, never a fact — so a missing value may take the smallest.
  const sz = e.sz == null ? 1 : r.num(e.sz, 'sz');
  n.sz = Math.min(4, Math.max(1, Math.round(sz ?? 1)));
  const al = r.texts(e.al, 'al');
  if (al.length) n.al = al;
  const resolved = r.bool(e.resolved, 'resolved');
  if (resolved != null) n.resolved = resolved;
  const risk = r.str(e.collisionRisk, 'collisionRisk');
  if (risk != null) n.collisionRisk = risk;
  const d = r.texts(e.d, 'd');
  if (d.length) n.d = d;
  const srcs = r.srcs(e.srcs, 'srcs');
  if (srcs.length) n.srcs = srcs;
  return n;
}

const IDENTITY_KEYS = ['cin', 'din', 'nse', 'office', 'dob'];

function toIdentity(e) {
  const hasIdentity = e.identity && typeof e.identity === 'object' && !Array.isArray(e.identity);
  const role = isStr(e.publicRole) ? e.publicRole : null;
  if (!hasIdentity && !role) return null;
  let identity = null;
  if (hasIdentity) {
    identity = {};
    const extra = Object.keys(e.identity).filter((k) => !IDENTITY_KEYS.includes(k)).sort(cmp);
    for (const k of [...IDENTITY_KEYS, ...extra]) {
      const v = e.identity[k];
      identity[k] = v == null ? null : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v);
    }
  }
  return { identity, publicRole: role };
}

function toBenefit(b, r, f) {
  const o = r.obj(b, f);
  if (!o) return null;
  return {
    who: r.reqStr(o.who, `${f}.who`),
    how: r.str(o.how, `${f}.how`),
    amountCr: r.num(o.amountCr, `${f}.amountCr`),
    confidence: r.oneOf(o.confidence, CONFIDENCE, `${f}.confidence`),
  };
}

/**
 * A loan's terms, in TERMS_KEYS order with only the keys the researcher wrote.
 * Unknown keys are refused by name rather than dropped: the spec draft said
 * `gracePeriodYears`, the schema says `graceYears`, and a silent drop would ship a
 * loan whose grace period the source stated as one with none recorded.
 */
function toTerms(v, r, f, sink, where, lenient) {
  const o = r.obj(v, f);
  if (!o) return null;
  for (const k of Object.keys(o).sort(cmp)) {
    if (!TERMS_KEYS.includes(k) && !lenient) sink.error(`${where}.${f}.${k}`, `${f}.${k} is not a terms field (expected ${TERMS_KEYS.join(' | ')})`);
  }
  const t = {};
  if (o.instrument !== undefined) t.instrument = r.str(o.instrument, `${f}.instrument`);
  for (const k of ['ratePct', 'tenorYears', 'graceYears']) if (o[k] !== undefined) t[k] = r.num(o[k], `${f}.${k}`);
  if (o.conditions !== undefined) {
    if (!Array.isArray(o.conditions)) {
      if (!lenient) sink.error(`${where}.${f}.conditions`, `expected a list of strings, found ${JSON.stringify(o.conditions)}`);
      t.conditions = lenient ? r.texts(o.conditions) : [];
    } else {
      // Strictly text: a number here is not a condition anyone wrote down.
      t.conditions = o.conditions.flatMap((x, i) => {
        if (typeof x === 'string') return [x];
        if (!lenient) sink.error(`${where}.${f}.conditions[${i}]`, `expected text, found ${JSON.stringify(x)}`);
        return lenient ? [JSON.stringify(x)] : [];
      });
    }
  }
  return t;
}

/** Predicates a World Bank project id may ride on (FINANCE_PAGE.md §3.3 P1): the loan, and the contracts it financed. */
const PROJECT_PREDS = ['loan', 'award'];

/**
 * A claim's `projectId`: P and six digits, on a loan or an award. Never inferred here —
 * the fetcher writes it on census legs, and a researched claim carries it only where its
 * own text names the id (scripts/finance/mark-loans.mjs).
 */
function projectIdOf(c, r) {
  const v = r.str(c.projectId, 'projectId');
  if (v == null) return null;
  if (!WB_PROJECT_ID.test(v)) {
    r.bad('projectId', `${JSON.stringify(v)} is not a World Bank project id (P and six digits)`);
    return null;
  }
  if (!PROJECT_PREDS.includes(c.pred)) {
    r.bad('projectId', `projectId belongs on loan and award claims, not ${JSON.stringify(c.pred)}`);
    return null;
  }
  return v;
}

function toEdge(c, where, sink) {
  const r = readers(sink, where);
  const e = {
    id: c.id,
    s: r.reqStr(c.s, 's'),
    t: r.reqStr(c.t, 't'),
    pred: r.oneOf(c.pred, PREDS, 'pred', true),
    tier: r.oneOf(c.tier, TIERS, 'tier', true),
  };
  const a = r.num(c.a, 'a');
  if (a != null) e.a = a;
  for (const k of ['lab']) {
    const v = r.str(c[k], k);
    if (v != null) e[k] = v;
  }
  const pid = projectIdOf(c, r);
  if (pid != null) e.projectId = pid;
  const d = Array.isArray(c.d) ? r.texts(c.d, 'd').join(' ') : r.str(c.d, 'd');
  if (d != null && d !== '') e.d = d;
  for (const k of ['from', 'to']) {
    const v = r.date(c[k], k);
    if (v != null) e[k] = v;
  }
  const srcs = r.srcs(c.srcs, 'srcs');
  if (srcs.length) e.srcs = srcs;
  for (const k of ['innocentReading', 'upgradeIf', 'killIf', 'supersededBy']) {
    const v = r.str(c[k], k);
    if (v != null && v !== '') e[k] = v;
  }
  if (c.terms != null) {
    const t = toTerms(c.terms, r, 'terms', sink, where, false);
    if (t) e.terms = t;
  }
  return e;
}

function toHeld(c, sink) {
  const r = readers(sink, c.id, true);
  return {
    id: c.id,
    s: r.reqStr(c.s),
    t: r.reqStr(c.t),
    pred: r.reqStr(c.pred),
    tier: r.reqStr(c.tier),
    a: r.num(c.a),
    lab: r.str(c.lab),
    d: Array.isArray(c.d) ? r.texts(c.d).join(' ') : r.str(c.d),
    from: r.str(c.from),
    to: r.str(c.to),
    srcs: r.srcs(c.srcs),
    innocentReading: r.str(c.innocentReading),
    upgradeIf: r.str(c.upgradeIf),
    killIf: r.str(c.killIf),
    supersededBy: r.str(c.supersededBy),
    benefit: c.benefit && typeof c.benefit === 'object' && isStr(c.benefit.who) ? toBenefit(c.benefit, r, 'benefit') : null,
    // Only when written, so held claims from before loan terms existed emit as they did.
    ...(c.terms != null ? { terms: toTerms(c.terms, r, 'terms', sink, c.id, true) } : {}),
    ...(c.projectId != null ? { projectId: r.str(c.projectId) } : {}),
    domain: c.domain,
    file: c.file,
  };
}

function toScheme(s, domain, where, sink) {
  const r = readers(sink, where);
  const obj = (v, f, fn) => {
    const o = r.obj(v, f);
    return o ? fn(o) : null;
  };
  const rows = (v, f, fn) => r.list(v, f).map((x, i) => fn(r.obj(x, `${f}[${i}]`) ?? {}, `${f}[${i}]`));
  return {
    id: s.id,
    name: r.reqStr(s.name, 'name'),
    al: r.texts(s.al, 'al'),
    level: r.oneOf(s.level, ['state', 'central'], 'level', true),
    st: r.oneOf(s.st, STATE_CODES, 'st'),
    applicableStates: r.oneOf(s.applicableStates, ['all'], 'applicableStates'),
    category: r.oneOf(s.category, SCHEME_CATEGORIES, 'category'),
    party: r.str(s.party, 'party'),
    announced: obj(s.announced, 'announced', (o) => ({
      date: r.date(o.date, 'announced.date'),
      byPersonId: r.str(o.byPersonId, 'announced.byPersonId'),
      office: r.str(o.office, 'announced.office'),
      srcs: r.srcs(o.srcs, 'announced.srcs'),
    })),
    approved: obj(s.approved, 'approved', (o) => ({
      date: r.date(o.date, 'approved.date'),
      body: r.str(o.body, 'approved.body'),
      srcs: r.srcs(o.srcs, 'approved.srcs'),
    })),
    launched: obj(s.launched, 'launched', (o) => ({
      date: r.date(o.date, 'launched.date'),
      srcs: r.srcs(o.srcs, 'launched.srcs'),
    })),
    benefit: obj(s.benefit, 'benefit', (o) => ({
      amount: r.num(o.amount, 'benefit.amount'),
      unit: r.str(o.unit, 'benefit.unit'),
      changes: rows(o.changes, 'benefit.changes', (x, f) => ({
        date: r.date(x.date, `${f}.date`),
        amount: r.num(x.amount, `${f}.amount`),
        note: r.str(x.note, `${f}.note`),
        srcs: r.srcs(x.srcs, `${f}.srcs`),
      })),
    })),
    eligibility: r.str(s.eligibility, 'eligibility'),
    beneficiaries: rows(s.beneficiaries, 'beneficiaries', (x, f) => ({
      asOf: r.date(x.asOf, `${f}.asOf`),
      count: r.num(x.count, `${f}.count`),
      srcs: r.srcs(x.srcs, `${f}.srcs`),
    })),
    outlay: rows(s.outlay, 'outlay', (x, f) => ({
      fy: r.reqStr(x.fy, `${f}.fy`),
      budgetedCr: r.num(x.budgetedCr, `${f}.budgetedCr`),
      actualCr: r.num(x.actualCr, `${f}.actualCr`),
      pctOfStateBudget: r.num(x.pctOfStateBudget, `${f}.pctOfStateBudget`),
      pctOfGSDP: r.num(x.pctOfGSDP, `${f}.pctOfGSDP`),
      srcs: r.srcs(x.srcs, `${f}.srcs`),
    })),
    electionContext: obj(s.electionContext, 'electionContext', (o) => ({
      election: r.str(o.election, 'electionContext.election'),
      date: r.date(o.date, 'electionContext.date'),
      monthsFromLaunch: r.num(o.monthsFromLaunch, 'electionContext.monthsFromLaunch'),
      incumbentParty: r.str(o.incumbentParty, 'electionContext.incumbentParty'),
      result: r.str(o.result, 'electionContext.result'),
      seatChange: r.str(o.seatChange, 'electionContext.seatChange'),
      srcs: r.srcs(o.srcs, 'electionContext.srcs'),
    })),
    status: rows(s.status, 'status', (x, f) => ({
      date: r.date(x.date, `${f}.date`),
      status: r.oneOf(x.status, SCHEME_STATUS, `${f}.status`, true),
      note: r.str(x.note, `${f}.note`),
      srcs: r.srcs(x.srcs, `${f}.srcs`),
    })),
    results: rows(s.results, 'results', (x, f) => ({
      finding: r.reqStr(x.finding, `${f}.finding`),
      tier: r.oneOf(x.tier, TIERS, `${f}.tier`, true),
      srcs: r.srcs(x.srcs, `${f}.srcs`),
    })),
    ministers: rows(s.ministers, 'ministers', (x, f) => ({
      personId: r.str(x.personId, `${f}.personId`),
      role: r.str(x.role, `${f}.role`),
      action: r.oneOf(x.action, MINISTER_ACTIONS, `${f}.action`),
      date: r.date(x.date, `${f}.date`),
      party: r.str(x.party, `${f}.party`),
      srcs: r.srcs(x.srcs, `${f}.srcs`),
    })),
    whoElseBenefits: rows(s.whoElseBenefits, 'whoElseBenefits', (x, f) => ({
      who: r.reqStr(x.who, `${f}.who`),
      how: r.str(x.how, `${f}.how`),
      amountCr: r.num(x.amountCr, `${f}.amountCr`),
      tier: r.oneOf(x.tier, TIERS, `${f}.tier`),
      srcs: r.srcs(x.srcs, `${f}.srcs`),
    })),
    srcs: r.srcs(s.srcs, 'srcs'),
    domain,
  };
}

/** A scheme is an instrument in the graph; claims point at it, so it needs a node. */
function schemeNode(s) {
  const n = {
    id: s.id,
    label: s.name,
    sub: [s.category, s.level === 'central' ? 'central scheme' : s.st ? `${s.st.toUpperCase()} state scheme` : 'state scheme', s.party]
      .filter(Boolean)
      .join(' · '),
    ty: 'mechanism',
    fam: 'instrument',
    st: s.st,
    sz: s.level === 'central' ? 3 : 2,
  };
  if (s.al.length) n.al = s.al;
  n.resolved = true;
  if (s.srcs.length) n.srcs = s.srcs;
  return n;
}

// ---------------------------------------------------------------------------
// Assemble one fleet (stages 2–4), without yet knowing the other fleet's ids
// ---------------------------------------------------------------------------

/** A merged record's fault may sit in any file that contributed to it, so name them all. */
const whereOf = (g) => g.files.join(' + ');

function prepareFleet(read, sink) {
  // Paths in messages are written under the fleet's directory name.
  const { dir: fleet, files } = read;
  const welfare = read.kind === 'welfare';
  const { mappings, rewrite } = reconciler(read.reconciliation, fleet, sink);

  const entityGroups = collectRecords(files, 'entities', rewrite, fleet, sink);
  const schemeGroups = welfare ? collectRecords(files, 'schemes', rewrite, fleet, sink) : new Map();
  if (!welfare) {
    for (const { name, doc } of files) {
      if (asList(doc.schemes).length) sink.warn(`${fleet}/${name}`, `${doc.schemes.length} scheme record(s) ignored — schemes belong to the welfare fleet`);
    }
  }
  if (welfare) {
    // Scheme records carry people and beneficiaries by id; those ids reconcile too.
    for (const g of schemeGroups.values()) {
      const s = g.rec;
      if (s.announced && typeof s.announced === 'object') s.announced = { ...s.announced, byPersonId: rewrite(s.announced.byPersonId) };
      if (Array.isArray(s.ministers)) s.ministers = s.ministers.map((m) => (m && typeof m === 'object' ? { ...m, personId: rewrite(m.personId) } : m));
      if (Array.isArray(s.whoElseBenefits)) s.whoElseBenefits = s.whoElseBenefits.map((w) => (w && typeof w === 'object' ? { ...w, who: rewrite(w.who) } : w));
    }
  }

  const { claims, duplicates } = collectClaims(files, rewrite, fleet, sink);
  const { audit, killed: auditKilled, contras } = applyAudit(claims, read.audit, fleet);

  const unresolved = new Set([...entityGroups.values()].filter((g) => g.rec.resolved === false).map((g) => g.rec.id));
  const killed = [];
  const excluded = duplicates.map(({ c, reason }) => ({ c, reason }));
  const survivors = [];
  for (const c of [...claims, ...contras]) {
    const researchKilled = c.status === 'killed';
    if (auditKilled.has(c.id) || researchKilled) {
      const reason = auditKilled.get(c.id) ?? (isStr(c.killedReason) ? c.killedReason : 'marked killed in the research file');
      killed.push({ c, reason });
      continue;
    }
    // A claim that cannot be typed is held, not coerced and not fatal: the reconciler
    // fixes the raw file, and until then the claim is on the record in META.
    const malformed = predProblem(c.pred) ?? (TIERS.includes(c.tier) ? null : `unknown tier ${JSON.stringify(c.tier)} (expected ${TIERS.join(' | ')})`);
    if (malformed) {
      excluded.push({ c, reason: malformed });
      continue;
    }
    const blocked = [c.s, c.t].find((v) => unresolved.has(v));
    if (blocked) {
      excluded.push({ c, reason: `endpoint "${blocked}" is resolved:false — unresolved entities take no edges` });
      continue;
    }
    survivors.push(c);
  }
  for (const { c, reason } of excluded) sink.warn(`${c.file}:${c.id}`, `excluded — ${reason}`);

  return { ...read, mappings, entityGroups, schemeGroups, claims, survivors, killed, excluded, audit, contras };
}

/** The alleged-needs-a-denial test, applied exactly as validate.mjs §4 applies it per file. */
function answeredSet(survivors) {
  const answered = new Set();
  for (const c of survivors) {
    if (c.pred !== 'contra') continue;
    answered.add(String(c.t).replace(/^claim:/, ''));
    answered.add(c.s);
  }
  return answered;
}

function gateFleet(p, isKnown, sink) {
  const { fleet } = p;
  const allClaimIds = new Set([...p.survivors, ...p.killed.map((k) => k.c), ...p.excluded.map((x) => x.c)].map((c) => c.id));
  const answered = answeredSet(p.survivors);
  for (const c of p.survivors) {
    const w = `${c.file}:${c.id}`;
    for (const side of ['s', 't']) {
      const v = c[side];
      if (!isStr(v)) {
        sink.error(w, `missing endpoint ${side}`);
        continue;
      }
      // `claim:<id>` is how a denial names what it answers; an analytic or supersede
      // claim may name a claim the same way. Either way the claim must exist — held
      // (killed or excluded) claims count, because they stay addressable.
      if (v.startsWith('claim:')) {
        if (!allClaimIds.has(v.slice(6))) {
          // The usual cause: the claim's own id was written with the prefix. Name the fix.
          const hint = allClaimIds.has(v) ? ` — a claim's own id is "${v}"; write ids without the claim: prefix and reference them as claim:<id>` : '';
          sink.error(w, `"${v}" is not a claim in the ${fleet} fleet${hint}`);
        }
        continue;
      }
      if (!isKnown(v)) {
        sink.error(w, `endpoint "${v}" is neither a fleet id nor an inventory-prefixed id (pol|min|sec|co|grp|per|for:) nor an atlas id`);
      }
    }
    const sourced = asList(c.srcs).some(isSource);
    if ((c.tier === 'documented' || c.tier === 'reported') && !sourced) {
      sink.error(w, `PROVENANCE INVARIANT VIOLATED — tier ${c.tier} with no srcs`);
    }
    if (c.tier === 'analytic' && !isStr(c.innocentReading)) {
      sink.error(w, 'analytic claim without an innocentReading after audit (correlation ≠ causation)');
    }
    if (c.tier === 'alleged' && c.pred !== 'contra' && !answered.has(c.id) && !answered.has(c.s) && !answered.has(c.t)) {
      sink.error(w, 'alleged claim without a contra after audit — the denial ships with the claim, or the claim does not ship');
    }
    if (c.supersededBy != null && !(isStr(c.supersededBy) && allClaimIds.has(c.supersededBy))) {
      sink.error(w, `supersededBy "${c.supersededBy}" does not resolve to a claim in the ${fleet} fleet`);
    }
    const amount = amountProblem(c);
    if (amount) sink.error(w, amount);
  }
}

// ---------------------------------------------------------------------------
// 4b. Loan facts — G1/G2/P7 of docs/design/FINANCE_PAGE.md §3.3
// ---------------------------------------------------------------------------

const LOAN_FACT_KEYS = [
  'project', 'status', 'pipeline', 'usdM', 'fxRate', 'fxBasis', 'st', 'stBasis', 'majorSector', 'sector1',
  'population', 'countable', 'countedAs', 'notCountableReason',
];
const COUNT_KEYS = ['countable', 'countedAs', 'notCountableReason'];
const FX_KEYS = ['indicator', 'firstYear', 'lastYear', 'conversion'];

/**
 * The census file's projects[], indexed by the claim id of each leg. Every field is read
 * strictly (a value tsc would reject fails here, with the row named) and COPIED: the
 * fetcher computed each one beside the `a` and `d` it wrote, so nothing is re-derived.
 */
function censusLegs(file, doc, sink) {
  const legs = new Map();
  for (const [i, raw] of asList(doc.projects).entries()) {
    const pid = raw && typeof raw === 'object' && isStr(raw.id) ? raw.id : null;
    const where = `${file}:projects:${pid ?? `[${i}]`}`;
    if (!pid || !WB_PROJECT_ID.test(pid)) {
      sink.error(where, `projects[${i}] has no World Bank project id`);
      continue;
    }
    const r = readers(sink, where);
    const row = {
      project: pid,
      status: r.str(raw.status, 'status'),
      pipeline: r.bool(raw.pipeline, 'pipeline'),
      st: r.oneOf(raw.state, STATE_CODES, 'state'),
      stBasis: r.oneOf(raw.state_basis, STATE_BASES, 'state_basis'),
      majorSector: r.str(raw.major_sector_name, 'major_sector_name'),
      sector1: r.str(raw.sector1, 'sector1'),
    };
    if ((raw.state == null) !== (raw.state_basis == null)) sink.error(where, 'state and state_basis must be set together — a placement names its rule');
    for (const [j, l] of r.list(raw.legs, 'legs').entries()) {
      const f = `legs[${j}]`;
      const o = r.obj(l, f) ?? {};
      const claimId = r.reqStr(o.claimId, `${f}.claimId`);
      const countable = r.bool(o.countable, `${f}.countable`);
      if (countable == null) r.bad(`${f}.countable`, 'is required (true or false)');
      const leg = {
        row,
        lender: r.reqStr(o.lender, `${f}.lender`),
        usdM: r.num(o.usdM, `${f}.usdM`),
        fxRate: r.num(o.fxRate, `${f}.fxRate`),
        fxBasis: r.str(o.fxBasis, `${f}.fxBasis`),
        countable: countable ?? false,
        notCountableReason: r.str(o.notCountableReason, `${f}.notCountableReason`),
      };
      if (legs.has(claimId)) sink.error(where, `${f}: claim ${claimId} is already a leg of ${legs.get(claimId).row.project}`);
      else legs.set(claimId, leg);
    }
  }
  return legs;
}

/** provenance.totals, fieldMap and fx, verbatim — or null, with the fault named, when they cannot be typed. */
function censusTotals(file, doc, sink) {
  const prov = doc.provenance;
  if (!prov || typeof prov !== 'object' || !prov.totals || typeof prov.totals !== 'object') {
    sink.error(file, 'no provenance.totals — the census file must carry the fetcher\'s totals');
    return null;
  }
  const totals = {};
  for (const k of WB_TOTAL_KEYS) {
    const v = prov.totals[k];
    if (typeof v === 'number' && Number.isFinite(v)) totals[k] = v;
    else sink.error(`${file}:provenance.totals.${k}`, `expected a number, found ${JSON.stringify(v)}`);
  }
  for (const k of Object.keys(prov.totals)) {
    if (!WB_TOTAL_KEYS.includes(k)) sink.error(file, `provenance.totals.${k} is not a census total (expected ${WB_TOTAL_KEYS.join(' | ')}) — add it to WbCensusTotals and WB_TOTAL_KEYS first`);
  }
  const fieldMap = {};
  const fm = prov.fieldMap && typeof prov.fieldMap === 'object' && !Array.isArray(prov.fieldMap) ? prov.fieldMap : null;
  if (!fm) sink.error(file, 'no provenance.fieldMap');
  for (const [k, v] of Object.entries(fm ?? {})) {
    if (typeof v === 'string') fieldMap[k] = v;
    else sink.error(`${file}:provenance.fieldMap.${k}`, `expected text, found ${JSON.stringify(v)}`);
  }
  const fxIn = prov.fx && typeof prov.fx === 'object' && !Array.isArray(prov.fx) ? prov.fx : null;
  if (!fxIn) sink.error(file, 'no provenance.fx');
  const r = readers(sink, `${file}:provenance`);
  const fx = {
    indicator: r.reqStr(fxIn?.indicator, 'fx.indicator'),
    firstYear: r.num(fxIn?.firstYear, 'fx.firstYear'),
    lastYear: r.num(fxIn?.lastYear, 'fx.lastYear'),
    conversion: r.reqStr(fxIn?.conversion, 'fx.conversion'),
  };
  for (const k of Object.keys(fxIn ?? {})) if (!FX_KEYS.includes(k)) sink.error(file, `provenance.fx.${k} is not an fx field (expected ${FX_KEYS.join(' | ')})`);
  return { totals, fieldMap, fx };
}

/**
 * FINANCE_LOAN_FACTS and FINANCE_WB_TOTALS for a fleet whose FLEETS row names a
 * `loanCensus` domain. One fact per `loan` edge:
 *   census      — the claim's projects[] row and leg, copied; joined by claim id, and the
 *                 row must be the claim's own projectId and the leg its own lender;
 *   researched  — project from the claim's projectId, every census-only field null (never
 *                 read from prose), counting marks from the claim.
 * Counting marks (P7): `countable: false` with `countedAs` (the claim that counts the same
 * loan — a countable loan edge from the same lender, on the same project when both name
 * one) or a `notCountableReason`. Every countedAs is recorded in RECONCILIATION.json
 * `countedAs`, and every entry there is carried by its claim: the two cannot drift apart.
 * A researched record that repeats nothing but is not one loan (F3: a non-binding MoU, a
 * portfolio aggregate, a facility envelope) carries countable: false and a
 * notCountableReason with no countedAs; every such record is listed in RECONCILIATION.json
 * `notCountable` with the same reason and a class from NOT_COUNTABLE_CLASSES, and every
 * entry there is carried by its claim. A facility entry names its `tranches`: countable
 * loan edges in the fleet.
 * A duplicate is never superseded here — supersession is a dated correction, not a count.
 */
function loanFacts(p, edges, survivors, sink) {
  const census = p.spec.loanCensus;
  const file = p.files.find((f) => f.domain === census);
  const fileName = file ? `${p.dir}/${file.name}` : null;
  const legs = file ? censusLegs(fileName, file.doc, sink) : new Map();
  const wbTotals = file ? censusTotals(fileName, file.doc, sink) : null;

  const edgeById = new Map(edges.map((e) => [e.id, e]));
  const facts = {};
  const claimOf = new Map(survivors.map((c) => [c.id, c]));
  for (const c of survivors) {
    const w = `${c.file}:${c.id}`;
    const marks = COUNT_KEYS.filter((k) => c[k] !== undefined && c[k] !== null);
    if (c.pred !== 'loan') {
      if (marks.length) sink.error(w, 'countable, countedAs and notCountableReason belong on loan claims');
      continue;
    }
    const e = edgeById.get(c.id);
    const fact = Object.fromEntries(LOAN_FACT_KEYS.map((k) => [k, null]));
    fact.project = e.projectId ?? null;
    if (c.domain === census) {
      fact.population = 'census';
      const leg = legs.get(c.id);
      if (!leg) {
        sink.error(w, `census loan has no projects[] leg in ${fileName} — re-run scripts/finance/fetch-worldbank.mjs`);
      } else {
        if (leg.lender !== e.s) sink.error(w, `projects[] leg lender ${JSON.stringify(leg.lender)} differs from the claim's s ${JSON.stringify(e.s)}`);
        if (leg.row.project !== e.projectId) sink.error(w, `projects[] row ${leg.row.project} differs from the claim's projectId ${JSON.stringify(e.projectId ?? null)}`);
        Object.assign(fact, {
          project: leg.row.project, status: leg.row.status, pipeline: leg.row.pipeline,
          usdM: leg.usdM, fxRate: leg.fxRate, fxBasis: leg.fxBasis,
          st: leg.row.st, stBasis: leg.row.stBasis, majorSector: leg.row.majorSector, sector1: leg.row.sector1,
          countable: leg.countable, countedAs: null, notCountableReason: leg.notCountableReason,
        });
      }
      if (marks.length) sink.error(w, `a census claim's counting comes from its projects[] leg, not from ${marks.join(', ')} on the claim`);
    } else {
      fact.population = 'researched';
      const r = readers(sink, w);
      const countable = r.bool(c.countable, 'countable');
      fact.countable = countable ?? true;
      fact.countedAs = r.str(c.countedAs, 'countedAs');
      fact.notCountableReason = r.str(c.notCountableReason, 'notCountableReason');
    }
    if (fact.countable === false && fact.countedAs == null && fact.notCountableReason == null) sink.error(w, 'countable false needs a countedAs or a notCountableReason');
    if (fact.countable === true && fact.notCountableReason != null) sink.error(w, 'a notCountableReason is set, so countable must be false');
    if (fact.countedAs != null && fact.countable !== false) sink.error(w, 'countedAs is set, so countable must be false');
    facts[c.id] = fact;
  }

  // countedAs: a countable loan edge, same lender, same project where both name one.
  for (const [id, f] of Object.entries(facts)) {
    if (f.countedAs == null) continue;
    const c = claimOf.get(id);
    const w = `${c.file}:${id}`;
    const target = facts[f.countedAs];
    const te = edgeById.get(f.countedAs);
    if (!target || !te) {
      sink.error(w, `countedAs ${JSON.stringify(f.countedAs)} is not a loan edge in the ${p.fleet} fleet`);
      continue;
    }
    const e = edgeById.get(id);
    if (te.s !== e.s) sink.error(w, `countedAs ${JSON.stringify(f.countedAs)} is a loan from ${te.s}, not ${e.s}`);
    if (target.project != null && f.project != null && target.project !== f.project) sink.error(w, `countedAs ${JSON.stringify(f.countedAs)} is project ${target.project}, not ${f.project}`);
    if (target.countable !== true) sink.error(w, `countedAs ${JSON.stringify(f.countedAs)} is itself not countable — point at the record that counts`);
  }

  // RECONCILIATION.json countedAs and the claims carry the same pairs.
  const recWhere = `${p.dir}/RECONCILIATION.json`;
  const recorded = new Map();
  for (const [i, m] of asList(p.reconciliation?.countedAs).entries()) {
    const w = `${recWhere}:countedAs[${i}]`;
    if (!m || !isStr(m.claimId) || !isStr(m.countedAs)) {
      sink.error(w, 'a countedAs entry needs string claimId and countedAs');
      continue;
    }
    recorded.set(m.claimId, m.countedAs);
    const carried = facts[m.claimId]?.countedAs ?? claimOf.get(m.claimId)?.countedAs ?? null;
    if (carried !== m.countedAs) sink.error(w, `${m.claimId} does not carry countedAs ${JSON.stringify(m.countedAs)} (it carries ${JSON.stringify(carried)})`);
  }
  for (const [id, f] of Object.entries(facts)) {
    if (f.countedAs != null && recorded.get(id) !== f.countedAs) {
      sink.error(`${claimOf.get(id).file}:${id}`, `countedAs ${JSON.stringify(f.countedAs)} is not recorded in RECONCILIATION.json countedAs — the reconciliation owns every counting mark`);
    }
  }

  // RECONCILIATION.json notCountable and the claims carry the same marks.
  const excused = new Map();
  for (const [i, m] of asList(p.reconciliation?.notCountable).entries()) {
    const w = `${recWhere}:notCountable[${i}]`;
    if (!m || !isStr(m.claimId) || !isStr(m.notCountableReason)) {
      sink.error(w, 'a notCountable entry needs string claimId and notCountableReason');
      continue;
    }
    if (!NOT_COUNTABLE_CLASSES.includes(m.class)) sink.error(w, `class ${JSON.stringify(m.class)} is not one of ${NOT_COUNTABLE_CLASSES.join(' | ')}`);
    if (excused.has(m.claimId)) sink.error(w, `${m.claimId} is listed twice`);
    if (recorded.has(m.claimId)) sink.error(w, `${m.claimId} is listed in countedAs too — a record repeats another loan or is not a loan, not both`);
    excused.set(m.claimId, m.notCountableReason);
    const f = facts[m.claimId];
    if (!f) {
      sink.error(w, `${m.claimId} is not a loan edge in the ${p.fleet} fleet`);
      continue;
    }
    if (f.population !== 'researched') sink.error(w, `${m.claimId} is a census leg — its counting comes from projects[], not from the reconciliation`);
    if (f.countable !== false || f.countedAs != null || f.notCountableReason !== m.notCountableReason) {
      sink.error(w, `${m.claimId} does not carry countable false and this notCountableReason (it carries countable ${f.countable}, notCountableReason ${JSON.stringify(f.notCountableReason)}) — run node scripts/finance/mark-loans.mjs --write`);
    }
    if (m.class === 'facility-envelope') {
      const tranches = asList(m.tranches);
      if (!tranches.length) sink.error(w, 'a facility-envelope entry lists its tranches — the loans that count instead');
      for (const t of tranches) {
        if (!isStr(t) || !facts[t]) sink.error(w, `tranche ${JSON.stringify(t)} is not a loan edge in the ${p.fleet} fleet`);
        else if (facts[t].countable !== true) sink.error(w, `tranche ${t} is itself not countable`);
      }
    } else if (m.tranches != null) sink.error(w, `tranches belong on a facility-envelope entry, not ${JSON.stringify(m.class)}`);
  }
  for (const [id, f] of Object.entries(facts)) {
    if (f.population === 'researched' && f.countable === false && f.countedAs == null && !excused.has(id)) {
      sink.error(`${claimOf.get(id).file}:${id}`, 'countable false with a notCountableReason is not recorded in RECONCILIATION.json notCountable — the reconciliation owns every counting mark');
    }
  }
  return { facts, wbTotals };
}

// ---------------------------------------------------------------------------
// 4b. Ownership (capital) — holdings, coverage, controls (FINANCE_PAGE.md §3.3 G3a–c)
// ---------------------------------------------------------------------------

/** The claim's own text, as toEdge joins it: the only place a holding's figures may come from. */
const claimText = (c) => [Array.isArray(c.d) ? c.d.filter((x) => typeof x === 'string').join(' ') : c.d, c.lab].filter((x) => typeof x === 'string').join(' ');

/** A required boolean: absent is an error, not false. */
function reqBool(r, sink, where, v, f) {
  if (v == null) {
    sink.error(`${where}.${f}`, 'is required (true/false)');
    return false;
  }
  return r.bool(v, f) ?? false;
}

/**
 * G3a. A surviving claim's `holding` block, read strictly: fixed keys; pct a number in
 * 0–100 or null; shares a whole number or null; asOf ISO or null; category from the
 * list; line and aggregate required. Every figure must be printed in the claim's own
 * d/lab and the line must be a verbatim part of it — so a holding can never say more
 * than the record it structures. Null is a stated absence, never a default.
 */
function readHolding(c, sink) {
  const where = `${c.file}:${c.id}`;
  const r = readers(sink, where);
  if (c.pred !== 'own') {
    sink.error(where, `holding on a ${c.pred} claim — holdings describe own claims only`);
    return null;
  }
  const o = r.obj(c.holding, 'holding');
  if (!o) return null;
  for (const k of Object.keys(o).sort(cmp)) {
    if (!HOLDING_KEYS.includes(k)) sink.error(`${where}.holding.${k}`, `holding.${k} is not a holding field (expected ${HOLDING_KEYS.join(' | ')})`);
  }
  const h = {
    pct: r.num(o.pct, 'holding.pct'),
    shares: r.num(o.shares, 'holding.shares'),
    asOf: r.date(o.asOf, 'holding.asOf'),
    category: r.oneOf(o.category, HOLDING_CATEGORIES, 'holding.category', true),
    line: r.reqStr(o.line, 'holding.line'),
    aggregate: reqBool(r, sink, where, o.aggregate, 'holding.aggregate'),
  };
  if (h.pct != null && (h.pct < 0 || h.pct > 100)) sink.error(`${where}.holding.pct`, `holding.pct ${h.pct} is outside 0–100`);
  if (h.shares != null && !(Number.isInteger(h.shares) && h.shares >= 0)) sink.error(`${where}.holding.shares`, `holding.shares ${h.shares} is not a whole share count`);
  for (const msg of holdingTextProblem(h, claimText(c))) sink.error(where, msg);
  return h;
}

const CO_ID = /^co:[a-z0-9][a-z0-9-]*$/;
const COVERAGE_KEYS = ['company', 'asOf', 'read', 'domain', 'srcs', 'note'];
const CONTROL_KEYS = ['id', 'label', 'role', 'resolved', 'declaredIn', 'note'];

/** A declaration's `rows`, with unknown row keys refused by name rather than dropped. */
function declaredRows(decl, keys, fleet, sink) {
  if (!decl) return [];
  const where = `${fleet}/${decl.name}`;
  if (!Array.isArray(decl.doc.rows)) {
    sink.error(`${where}:rows`, 'a declaration must carry a list `rows`');
    return [];
  }
  return decl.doc.rows.map((v, i) => {
    const w = `${where}:rows[${i}]`;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      sink.error(w, 'row must be an object');
      return { w, o: {} };
    }
    for (const k of Object.keys(v).sort(cmp)) if (!keys.includes(k)) sink.error(`${w}.${k}`, `${k} is not a field of this declaration (expected ${keys.join(' | ')})`);
    return { w, o: v };
  });
}

/**
 * G3a–c for a fleet whose FLEETS row says `ownership: true`. Run after the fleet gate,
 * because a control row resolves against every fleet's ids. Holdings are keyed in
 * claim-id order; coverage rows in company order; control rows in DECLARED order —
 * the order is part of the declaration.
 */
function readOwnership(p, isKnown, sink) {
  const holdings = [];
  for (const c of [...p.survivors].sort((a, b) => cmp(a.id, b.id))) {
    if (c.holding == null) continue;
    const h = readHolding(c, sink);
    if (h) holdings.push([c.id, h]);
  }

  const domains = new Set(p.files.map((f) => f.domain));
  const coverage = [];
  const seenCo = new Set();
  for (const { w, o } of declaredRows(p.declarations?.coverage, COVERAGE_KEYS, p.dir, sink)) {
    const r = readers(sink, w);
    const company = r.reqStr(o.company, 'company');
    if (company && !CO_ID.test(company)) sink.error(w, `company "${company}" is not a co: id`);
    if (seenCo.has(company)) sink.error(w, `${company} is declared twice`);
    seenCo.add(company);
    const read = r.oneOf(o.read, COVERAGE_READ, 'read', true);
    const asOf = r.date(o.asOf, 'asOf');
    if (read === 'not-read' && asOf != null) sink.error(w, 'a not-read row carries no asOf — nothing was read to date');
    if ((read === 'primary' || read === 'aggregator') && asOf == null) sink.error(w, `a ${read} row needs the asOf of what was read`);
    const domain = r.reqStr(o.domain, 'domain');
    if (domain && !domains.has(domain)) sink.error(w, `domain "${domain}" is not a research file in this fleet`);
    const srcs = r.srcs(o.srcs, 'srcs');
    if (!srcs.length) sink.error(w, 'needs at least one [label, url] source — a read, or a failed attempt, is cited');
    coverage.push({ company, asOf, read: read ?? 'not-read', domain, srcs, note: r.str(o.note, 'note') });
  }
  coverage.sort((a, b) => cmp(a.company, b.company));

  const unresolved = new Set([...p.entityGroups.values()].filter((g) => g.rec.resolved === false).map((g) => g.rec.id));
  const controls = [];
  const seenId = new Set();
  for (const { w, o } of declaredRows(p.declarations?.controls, CONTROL_KEYS, p.dir, sink)) {
    const r = readers(sink, w);
    const id = r.str(o.id, 'id');
    const resolved = reqBool(r, sink, w, o.resolved, 'resolved');
    if (resolved && id == null) sink.error(w, 'a resolved row needs an id');
    if (!resolved && id != null) sink.error(w, `"${id}": an unresolved row carries id null — never an id nobody defined`);
    if (resolved && id != null) {
      if (unresolved.has(id)) sink.error(w, `"${id}" is resolved:false in the research — a control row cannot resolve it`);
      else if (!isKnown(id)) sink.error(w, `"${id}" is resolved: true but is neither a fleet id, an inventory id nor an atlas id`);
    }
    if (id != null) {
      if (seenId.has(id)) sink.error(w, `${id} is declared twice`);
      seenId.add(id);
    }
    controls.push({
      id,
      label: r.reqStr(o.label, 'label'),
      role: r.oneOf(o.role, CONTROL_ROLES, 'role', true) ?? 'comparison',
      resolved,
      declaredIn: r.reqStr(o.declaredIn, 'declaredIn'),
      note: r.str(o.note, 'note'),
    });
  }
  return { holdings, coverage, controls };
}

/**
 * G4 for a fleet whose FLEETS row names an `fcState` domain: that file's `fcByState`
 * rows — a Parliament annexure's state/UT × FY table, transcribed — read strictly (fixed
 * keys; st a state code, or null with a note saying what the row is; fy a financial
 * year; receivedCr a number; srcs cited) and then added up: every FY must sum to the
 * file's own current national grant claim for that FY within FC_STATE_TOLERANCE_CR
 * (scripts/lib/vocab.mjs). No file, or no list, is an empty export, never an error —
 * the page's void card is the honest state until the annexure is transcribed. Rows are
 * emitted in FY, then state-code order, rows without a code last.
 */
function fcStateRows(p, edges, survivors, sink) {
  const domain = p.spec.fcState;
  for (const f of p.files) {
    if (f.domain !== domain && f.doc.fcByState != null) sink.warn(`${p.dir}/${f.name}:fcByState`, `only ${domain}.json is read for state rows — this list is not exported`);
  }
  const file = p.files.find((f) => f.domain === domain);
  if (!file || file.doc.fcByState == null) return [];
  const where = `${p.dir}/${file.name}`;
  if (!Array.isArray(file.doc.fcByState)) {
    sink.error(`${where}:fcByState`, `must be a list of { ${FC_STATE_KEYS.join(', ')} } rows`);
    return [];
  }
  const rows = [];
  const seen = new Set();
  for (const [i, v] of file.doc.fcByState.entries()) {
    const w = `${where}:fcByState[${i}]`;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      sink.error(w, 'row must be an object');
      continue;
    }
    for (const k of Object.keys(v).sort(cmp)) if (!FC_STATE_KEYS.includes(k)) sink.error(`${w}.${k}`, `${k} is not a field of a state row (expected ${FC_STATE_KEYS.join(' | ')})`);
    const r = readers(sink, w);
    const st = v.st == null ? null : r.oneOf(v.st, STATE_CODES, 'st');
    const note = r.str(v.note, 'note');
    if (v.st == null && !(note && note.trim())) sink.error(w, 'st is null — a row that is not a state or UT needs a note saying what the annexure calls it');
    const stateName = r.reqStr(v.stateName, 'stateName');
    const fy = r.reqStr(v.fy, 'fy');
    if (fy && !fySpan(fy)) sink.error(`${w}.fy`, `${JSON.stringify(fy)} is not a financial year written YYYY-YY ("2019-20")`);
    const receivedCr = r.num(v.receivedCr, 'receivedCr');
    if (v.receivedCr == null) sink.error(`${w}.receivedCr`, 'is required — a row the annexure prints no figure for is not transcribed as a row');
    else if (receivedCr != null && receivedCr < 0) sink.error(`${w}.receivedCr`, `${receivedCr} is negative`);
    const utilisedCr = r.num(v.utilisedCr, 'utilisedCr');
    if (utilisedCr != null && utilisedCr < 0) sink.error(`${w}.utilisedCr`, `${utilisedCr} is negative`);
    const srcs = r.srcs(v.srcs, 'srcs');
    if (!srcs.length) sink.error(w, 'needs at least one [label, url] source — the annexure the row is read from');
    const key = `${st ?? `?${stateName}`}|${fy}`;
    if (seen.has(key)) sink.error(w, `${stateName} ${fy} appears twice`);
    seen.add(key);
    rows.push({ st, stateName, fy, receivedCr: receivedCr ?? 0, utilisedCr, note, srcs });
  }
  rows.sort((a, b) => cmp(a.fy, b.fy) || (a.st === null) - (b.st === null) || cmp(a.st ?? '', b.st ?? '') || cmp(a.stateName, b.stateName));
  const national = edges.filter((e, i) => survivors[i].domain === domain);
  for (const problem of fcStateSumProblems(rows, national)) sink.error(where, problem);
  return rows;
}

// ---------------------------------------------------------------------------
// 5. Emit
// ---------------------------------------------------------------------------

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const keyLit = (k) => (IDENT.test(k) ? k : JSON.stringify(k));

/** One record per line, keys in a fixed order. JSON.stringify is the only escaping this file does. */
function oneLine(obj, keys) {
  const parts = [];
  for (const k of keys) if (obj[k] !== undefined) parts.push(`${keyLit(k)}: ${JSON.stringify(obj[k])}`);
  return `{ ${parts.join(', ')} }`;
}

const indent = (text, pad) => text.split('\n').map((l) => pad + l).join('\n');

/**
 * `export const NAME: Type = [ … ];` with the closing `];` alone on its line — the
 * shape validate.mjs grabs and evaluates, so the literal must hold nothing but
 * data: no imports, no calls, no casts.
 */
function arrayConst(name, type, rows, fmt) {
  return `export const ${name}: ${type} = [\n${rows.map((r) => `${fmt(r)},\n`).join('')}];\n`;
}

const NODE_KEYS = ['id', 'label', 'sub', 'ty', 'fam', 'st', 'sz', 'al', 'resolved', 'collisionRisk', 'd', 'srcs'];
const EDGE_KEYS = ['id', 's', 't', 'pred', 'tier', 'a', 'lab', 'projectId', 'd', 'from', 'to', 'terms', 'srcs', 'innocentReading', 'upgradeIf', 'killIf', 'supersededBy'];
const BENEFIT_KEYS = ['claimId', 's', 't', 'pred', 'tier', 'who', 'how', 'amountCr', 'confidence', 'srcs', 'domain'];
const VOID_KEYS = ['what', 'whyItMatters', 'srcs', 'domain'];
const NARRATIVE_KEYS = ['claim', 'status', 'strongestCase', 'strongestCounter', 'whatWouldChangeThis', 'srcs', 'domain'];
const BASE_RATE_KEYS = ['property', 'numerator', 'denominator', 'label', 'srcs', 'domain'];
const TEXT_KEYS = ['domain', 'text'];
const ELECTION_KEYS = ['st', 'election', 'date', 'incumbentParty', 'winner', 'srcs', 'domain'];

/**
 * The canonical coverage shape is the page spec's: { st, fromYear, toYear,
 * categories: ["all"] | [category…], method, srcs }. The contract's earlier
 * { years: [from, to], searched, note } is still read. A range is only ever taken
 * from fromYear/toYear or a two-element `years`; a longer `years` list names single
 * years and leaves the range null (read it with coverageYears), because spanning its
 * gaps would declare years nobody searched — and paint them as zeros.
 */
function coverageShape(v) {
  const int = (x) => Number.isInteger(x);
  let fromYear = null;
  let toYear = null;
  if (v.fromYear != null || v.toYear != null) {
    if (!int(v.fromYear) || !int(v.toYear) || v.fromYear > v.toYear) return { problem: 'fromYear/toYear must be whole years with fromYear ≤ toYear' };
    fromYear = v.fromYear;
    toYear = v.toYear;
  } else if (Array.isArray(v.years) && v.years.length && v.years.every(int)) {
    if (v.years.length === 2) {
      if (v.years[0] > v.years[1]) return { problem: 'years [from, to] runs backwards' };
      [fromYear, toYear] = v.years;
    }
  } else {
    return { problem: 'declares no readable years (fromYear/toYear, or years)' };
  }
  let categories;
  let defaulted = false;
  if (v.categories == null) {
    categories = ['all'];
    defaulted = true;
  } else {
    const list = Array.isArray(v.categories) ? v.categories : [v.categories];
    const unknown = list.filter((c) => c !== 'all' && !SCHEME_CATEGORIES.includes(c));
    if (!list.length || unknown.length) return { problem: `categories ${JSON.stringify(v.categories)} — expected ["all"] or a list of ${SCHEME_CATEGORIES.join(' | ')}` };
    // "all" subsumes any category listed beside it.
    categories = list.includes('all') ? ['all'] : [...new Set(list)];
  }
  return { fromYear, toYear, categories, defaulted };
}

function sections(p, sink) {
  const voids = [];
  const narratives = [];
  const baseRates = [];
  const symmetry = [];
  const gaps = [];
  const elections = new Map();
  const coverage = [];
  for (const { name, doc, domain } of p.files) {
    const where = `${p.dir}/${name}`;
    if (p.kind === 'welfare' && doc.coverage != null) {
      if (!Array.isArray(doc.coverage)) sink.warn(`${where}:coverage`, 'not a list — no coverage declared by this file');
      for (const [i, v] of asList(Array.isArray(doc.coverage) ? doc.coverage : []).entries()) {
        const w = `${where}:coverage[${i}]`;
        // A declaration that cannot be checked must not paint a state-year as
        // "searched, none live": it is held out, and validate §4 fails on it.
        if (!v || typeof v !== 'object' || Array.isArray(v)) {
          sink.warn(w, 'not an object — held out of WELFARE_COVERAGE');
          continue;
        }
        if (!STATE_CODES.includes(v.st) && v.st !== 'central') {
          sink.warn(w, `st ${JSON.stringify(v.st)} is not a state code or "central" — held out of WELFARE_COVERAGE`);
          continue;
        }
        const srcs = asList(v.srcs);
        if (!srcs.length || !srcs.every(isSource)) {
          sink.warn(w, 'needs at least one [label, url] source — held out of WELFARE_COVERAGE');
          continue;
        }
        const shape = coverageShape(v);
        if (shape.problem) {
          sink.warn(w, `${shape.problem} — held out of WELFARE_COVERAGE`);
          continue;
        }
        if (shape.defaulted) sink.warn(w, 'no categories — treated as ["all"]');
        // Canonical fields first, in a fixed order; anything else the file wrote
        // (years, searched, note…) passes through after them, keys sorted.
        const o = { st: v.st, fromYear: shape.fromYear, toYear: shape.toYear, categories: shape.categories, method: typeof v.method === 'string' ? v.method : null };
        const canonical = ['st', 'fromYear', 'toYear', 'categories', 'method', 'srcs', 'domain'];
        for (const k of Object.keys(v).filter((k) => !canonical.includes(k)).sort(cmp)) o[k] = v[k];
        o.srcs = srcs.map((x) => [x[0], x[1]]);
        o.domain = domain;
        coverage.push(o);
      }
    }
    for (const [i, v] of asList(doc.voids).entries()) {
      const r = readers(sink, `${where}:voids[${i}]`);
      const o = r.obj(v) ?? {};
      voids.push({ what: r.reqStr(o.what, 'what'), whyItMatters: r.str(o.whyItMatters, 'whyItMatters'), srcs: r.srcs(o.srcs, 'srcs'), domain });
    }
    for (const [i, v] of asList(doc.narratives).entries()) {
      const r = readers(sink, `${where}:narratives[${i}]`);
      const o = r.obj(v) ?? {};
      narratives.push({
        claim: r.reqStr(o.claim, 'claim'),
        status: r.oneOf(o.status, NARRATIVE_STATUS, 'status', true),
        strongestCase: r.str(o.strongestCase, 'strongestCase'),
        strongestCounter: r.str(o.strongestCounter, 'strongestCounter'),
        whatWouldChangeThis: r.str(o.whatWouldChangeThis, 'whatWouldChangeThis'),
        srcs: r.srcs(o.srcs, 'srcs'),
        domain,
      });
    }
    for (const [i, v] of asList(doc.baseRates).entries()) {
      const r = readers(sink, `${where}:baseRates[${i}]`);
      const o = r.obj(v) ?? {};
      baseRates.push({
        property: r.reqStr(o.property, 'property'),
        numerator: r.num(o.numerator, 'numerator'),
        denominator: r.num(o.denominator, 'denominator'),
        label: r.str(o.label, 'label'),
        srcs: r.srcs(o.srcs, 'srcs'),
        domain,
      });
    }
    if (doc.symmetryCheck != null) {
      const t = typeof doc.symmetryCheck === 'string' ? doc.symmetryCheck : JSON.stringify(doc.symmetryCheck);
      if (t.trim()) symmetry.push({ domain, text: t });
    }
    for (const g of asList(doc.gaps)) {
      const t = typeof g === 'string' ? g : JSON.stringify(g);
      if (t.trim()) gaps.push({ domain, text: t });
    }
    if (p.kind === 'welfare') {
      for (const [i, v] of asList(doc.elections).entries()) {
        const r = readers(sink, `${where}:elections[${i}]`);
        const o = r.obj(v) ?? {};
        const e = {
          st: r.oneOf(o.st, STATE_CODES, 'st'),
          election: r.reqStr(o.election, 'election'),
          date: o.date == null ? r.reqStr(null, 'date') : r.date(o.date, 'date') ?? '',
          incumbentParty: r.str(o.incumbentParty, 'incumbentParty'),
          winner: r.str(o.winner, 'winner'),
          srcs: r.srcs(o.srcs, 'srcs'),
          domain,
        };
        // The same election recorded by two sweeps is one election with both citations.
        const k = `${e.st}|${e.election}|${e.date}`;
        const prior = elections.get(k);
        if (prior) prior.srcs = union(prior.srcs, e.srcs, (s) => JSON.stringify(s));
        else elections.set(k, e);
      }
    }
  }
  const electionList = [...elections.values()].sort(
    (a, b) => cmp(a.date, b.date) || cmp(a.st ?? '', b.st ?? '') || cmp(a.election, b.election),
  );
  return { voids, narratives, baseRates, symmetry, gaps, elections: electionList, coverage };
}

/**
 * Inputs are always named as research/raw/<fleet>/<file>, whatever --dir said: the
 * module is a function of the files' bytes, not of where a run happened to read
 * them, so a scratch or CI path never leaks into a committed header.
 */
const HOME = 'research/raw';

function header(p, runId) {
  const inputs = p.inputs.map((i) => `${HOME}/${i.name}`);
  const safe = (s) => s.replace(/\*\//g, '*\\/');
  return [
    '/**',
    ' * GENERATED FILE — DO NOT EDIT BY HAND.',
    ' *',
    ` * Written by ${GENERATOR} (\`npm run generate\`, generator ${GENERATOR_VERSION}),`,
    ` * run ${runId}, from:`,
    ...(inputs.length ? inputs.map((f) => ` *   ${safe(f)}`) : [` *   (nothing — ${HOME}/${p.dir}/ holds no research files yet)`]),
    ' *',
    ' * To change it, change the research file, or the fleet\'s RECONCILIATION.json or',
    ' * AUDIT.json, and re-run `npm run generate`. `npm run validate` fails when this',
    ' * file no longer matches what its inputs assemble to, so a hand edit cannot ship.',
    ' */',
    '',
  ].join('\n');
}

/** An import specifier from one repository-relative file to another, POSIX, without the extension. */
function importPath(fromFile, toFile) {
  const rel = posix.relative(posix.dirname(fromFile), toFile);
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function emitFleet(p, sink) {
  // `key` names the fleet in META and the run id; `fleet` (its directory) names paths.
  const { fleet: key, dir: fleet, spec } = p;
  const welfare = p.kind === 'welfare';
  // The fleet key is folded in so two empty fleets do not share a stamp, and only
  // this fleet's inputs are: another fleet's research never restamps this module.
  const runId = `run-${fnv1a64(`${GENERATOR_VERSION}\n${key}\n${p.inputs.map((i) => `${i.name}\n${i.text}`).join('\n')}`).slice(0, 12)}`;

  // Nodes: entity records, then (welfare) one node per scheme the entities do not already define.
  const identity = [];
  const nodes = [];
  for (const g of [...p.entityGroups.values()].sort((a, b) => cmp(a.rec.id, b.rec.id))) {
    nodes.push(toNode(g.rec, `${whereOf(g)}:${g.rec.id}`, sink));
    const idn = toIdentity(g.rec);
    if (idn) identity.push([g.rec.id, idn]);
  }
  const schemes = [...p.schemeGroups.values()]
    .sort((a, b) => cmp(a.rec.id, b.rec.id))
    .map((g) => toScheme(g.rec, p.files.find((f) => `${fleet}/${f.name}` === g.files[0])?.domain ?? '', `${whereOf(g)}:${g.rec.id}`, sink));
  const entityIds = new Set(nodes.map((n) => n.id));
  const schemeNodes = schemes.filter((s) => !entityIds.has(s.id)).map(schemeNode);

  const survivors = [...p.survivors].sort((a, b) => cmp(a.id, b.id));
  const edges = survivors.map((c) => toEdge(c, `${c.file}:${c.id}`, sink));
  const loans = spec.loanCensus ? loanFacts(p, edges, survivors, sink) : null;
  // G3a–c, read in assembleFleet after the gate (control rows resolve against every fleet).
  const own = spec.ownership ? p.ownership ?? { holdings: [], coverage: [], controls: [] } : null;
  // G4: the annexure's state rows, added up against this fleet's own national rows.
  const fc = spec.fcState ? fcStateRows(p, edges, survivors, sink) : null;
  const benefits = [];
  for (const [i, c] of survivors.entries()) {
    if (!c.benefit || typeof c.benefit !== 'object') continue;
    const r = readers(sink, `${c.file}:${c.id}`);
    const b = toBenefit(c.benefit, r, 'benefit');
    if (!b) continue;
    const e = edges[i];
    benefits.push({ claimId: c.id, s: e.s, t: e.t, pred: e.pred, tier: e.tier, ...b, srcs: e.srcs ?? [], domain: c.domain });
  }

  const killed = p.killed
    .map(({ c, reason }) => ({ ...toHeld(c, sink), status: 'killed', killedReason: reason }))
    .sort((a, b) => cmp(a.id, b.id));
  const excluded = p.excluded
    .map(({ c, reason }) => ({ ...toHeld(c, sink), excludedReason: reason }))
    .sort((a, b) => cmp(a.id, b.id) || cmp(a.file, b.file));

  // Claim id → research domain, for every claim the module mentions: edges, then
  // held claims. A duplicate id keeps its first domain, as the edge it names does.
  const edgeDomain = new Map();
  for (const c of [...survivors, ...p.killed.map((k) => k.c), ...p.excluded.map((x) => x.c)]) {
    if (!edgeDomain.has(c.id)) edgeDomain.set(c.id, c.domain);
  }

  const sec = sections(p, sink);
  const killedByFile = new Map();
  for (const k of killed) killedByFile.set(k.file, (killedByFile.get(k.file) ?? 0) + 1);
  const files = p.files.map(({ name, doc, domain }) => ({
    file: `${fleet}/${name}`,
    domain,
    asOf: typeof doc.asOf === 'string' ? doc.asOf : null,
    entities: asList(doc.entities).length,
    claims: asList(doc.claims).length,
    killed: killedByFile.get(`${fleet}/${name}`) ?? 0,
  }));
  const asOf = files.map((f) => f.asOf).filter(Boolean).sort(cmp).pop() ?? null;
  const tierChanges = p.audit ? p.audit.verdicts.filter((v) => v.applied.some((a) => a.startsWith('downgrade'))).length : 0;

  const counts = {
    files: files.length,
    nodes: nodes.length + schemeNodes.length,
    claimsIn: files.reduce((a, f) => a + f.claims, 0),
    edges: edges.length,
    killed: killed.length,
    excluded: excluded.length,
    contrasAdded: p.contras.length,
    downgradeVerdicts: tierChanges,
    benefits: benefits.length,
    voids: sec.voids.length,
    narratives: sec.narratives.length,
    baseRates: sec.baseRates.length,
    ...(welfare ? { schemes: schemes.length, elections: sec.elections.length, coverage: sec.coverage.length } : {}),
    ...(own ? { holdings: own.holdings.length, coverage: own.coverage.length, controls: own.controls.length } : {}),
    ...(fc ? { fcState: fc.length } : {}),
  };
  const meta = {
    fleet: key,
    generator: GENERATOR,
    generatorVersion: GENERATOR_VERSION,
    asOf,
    runId,
    empty: files.length === 0,
    note: files.length === 0 ? `no research files under ${HOME}/${fleet}/ — emitted empty so the build never depends on research having run` : null,
    inputs: p.inputs.map((i) => i.name),
    files,
    counts,
    reconciliation: {
      mappings: p.mappings,
      merged: [...p.entityGroups.values(), ...p.schemeGroups.values()]
        .filter((g) => g.ids.length > 1)
        .map((g) => ({ id: g.rec.id, ids: g.ids, files: g.files, filledFrom: g.filledFrom }))
        .sort((a, b) => cmp(a.id, b.id)),
    },
    audit: p.audit,
    killed,
    excluded,
  };

  const P = spec.prefix;
  const row = (keys) => (r) => `  ${oneLine(r, keys)}`;
  const out = [header(p, runId)];
  out.push(`import type { GNode, GEdge } from '${importPath(spec.out, 'src/graph/schema')}';`);
  out.push(`import type { BaseRateRow, BenefitRow, EntityIdentity, FleetMeta, FleetText, ${loans ? 'LoanFact, ' : ''}Narrative, Void${loans ? ', WbTotals' : ''} } from '${importPath(spec.out, 'src/graph/fleet')}';`);
  if (welfare) out.push(`import type { Coverage, Election, Scheme } from '${importPath(spec.out, 'src/data/welfare')}';`);
  if (own) out.push(`import type { CapitalControl, CapitalCoverage, Holding } from '${importPath(spec.out, 'src/graph/fleet')}';`);
  if (fc) out.push(`import type { FcStateRow } from '${importPath(spec.out, 'src/graph/fleet')}';`);
  out.push('');
  if (welfare) {
    out.push(arrayConst('WELFARE_SCHEMES', 'Scheme[]', schemes, (s) => indent(JSON.stringify(s, null, 2), '  ')));
    out.push(arrayConst('WELFARE_ENTITIES', 'GNode[]', nodes, row(NODE_KEYS)));
    out.push('/** One node per scheme, so claims that point at a scheme have somewhere to land. */');
    out.push(arrayConst('WELFARE_SCHEME_NODES', 'GNode[]', schemeNodes, row(NODE_KEYS)));
    out.push(arrayConst('WELFARE_CLAIMS', 'GEdge[]', edges, row(EDGE_KEYS)));
  } else {
    out.push(arrayConst(`${P}_NODES`, 'GNode[]', nodes, row(NODE_KEYS)));
    out.push(arrayConst(`${P}_EDGES`, 'GEdge[]', edges, row(EDGE_KEYS)));
  }
  out.push('/** Claim id → the research domain (file stem) it came from, for every edge and every held claim. */');
  out.push(
    `export const ${P}_EDGE_DOMAIN: Record<string, string> = {\n${[...edgeDomain.entries()]
      .sort((a, b) => cmp(a[0], b[0]))
      .map(([id, d]) => `  ${JSON.stringify(id)}: ${JSON.stringify(d)},\n`)
      .join('')}};\n`,
  );
  out.push(arrayConst(`${P}_BENEFITS`, 'BenefitRow[]', benefits, row(BENEFIT_KEYS)));
  if (loans) {
    out.push(`/** Loan edge id → its facts: census rows copied from ${HOME}/${fleet}/${spec.loanCensus}.json projects[] (G1), researched rows from the claim alone. */`);
    out.push(
      `export const ${P}_LOAN_FACTS: Record<string, LoanFact> = {\n${Object.entries(loans.facts)
        .map(([id, f]) => `  ${JSON.stringify(id)}: ${oneLine(f, LOAN_FACT_KEYS)},\n`)
        .join('')}};\n`,
    );
    out.push(`/** ${HOME}/${fleet}/${spec.loanCensus}.json provenance.totals, fieldMap and fx, verbatim (G2); null when the census file is absent. */`);
    out.push(`export const ${P}_WB_TOTALS: WbTotals | null = ${loans.wbTotals ? JSON.stringify(loans.wbTotals, null, 2) : 'null'};\n`);
  }
  if (welfare) {
    out.push(arrayConst('WELFARE_ELECTIONS', 'Election[]', sec.elections, row(ELECTION_KEYS)));
    out.push('/** What each file declares it searched. A state-year is painted "searched, none live" only when an entry here declares it. */');
    out.push(arrayConst('WELFARE_COVERAGE', 'Coverage[]', sec.coverage, (c) => `  ${JSON.stringify(c)}`));
  }
  out.push(arrayConst(`${P}_VOIDS`, 'Void[]', sec.voids, row(VOID_KEYS)));
  out.push(arrayConst(`${P}_NARRATIVES`, 'Narrative[]', sec.narratives, row(NARRATIVE_KEYS)));
  out.push(arrayConst(`${P}_BASE_RATES`, 'BaseRateRow[]', sec.baseRates, row(BASE_RATE_KEYS)));
  out.push(arrayConst(`${P}_SYMMETRY`, 'FleetText[]', sec.symmetry, row(TEXT_KEYS)));
  out.push(arrayConst(`${P}_GAPS`, 'FleetText[]', sec.gaps, row(TEXT_KEYS)));
  out.push(
    `export const ${P}_IDENTITY: Record<string, EntityIdentity> = {\n${identity
      .map(([id, v]) => `  ${JSON.stringify(id)}: ${JSON.stringify(v)},\n`)
      .join('')}};\n`,
  );
  if (own) {
    out.push('/** G3a. Claim id → the structured line of a surviving `own` edge, read from its own d/lab. `aggregate: true` rows are lower bounds: never add them to filing lines. */');
    out.push(
      `export const ${P}_HOLDINGS: Record<string, Holding> = {\n${own.holdings
        .map(([id, h]) => `  ${JSON.stringify(id)}: ${oneLine(h, HOLDING_KEYS)},\n`)
        .join('')}};\n`,
    );
    out.push('/** G3b. What was read for each constituent: a named-holder table (primary), category totals only (aggregator), or nothing (not-read). */');
    out.push(arrayConst(`${P}_COVERAGE`, 'CapitalCoverage[]', own.coverage, row(COVERAGE_KEYS)));
    out.push('/** G3c. The declared comparison sets, in declared order. A member the fleet has no entity for carries id null. */');
    out.push(arrayConst(`${P}_CONTROLS`, 'CapitalControl[]', own.controls, row(CONTROL_KEYS)));
  }
  if (fc) {
    out.push(`/** G4. State/UT × FY rows of the Parliament annexure transcribed in ${HOME}/${fleet}/${spec.fcState}.json fcByState; each FY's receivedCr sums to that file's current national grant claim within ₹1 crore. Empty until the annexure is transcribed. */`);
    out.push(arrayConst(`${P}_FC_STATE`, 'FcStateRow[]', fc, row(FC_STATE_KEYS)));
  }
  out.push(`export const ${P}_META: FleetMeta = ${JSON.stringify(meta, null, 2)};\n`);

  return {
    text: out.join('\n'),
    data: {
      nodes, schemeNodes, edges, benefits, schemes, identity: Object.fromEntries(identity), edgeDomain: Object.fromEntries(edgeDomain), meta, ...sec,
      ...(loans ? { loanFacts: loans.facts, wbTotals: loans.wbTotals } : {}),
      ...(own ? { holdings: Object.fromEntries(own.holdings), coverage: own.coverage, controls: own.controls } : {}),
      ...(fc ? { fcState: fc } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// The assembly, as a function
// ---------------------------------------------------------------------------

/**
 * Assemble every fleet in FLEETS in memory. Returns the module texts, the structured
 * data behind them, and every error and warning; writes nothing. When a fleet's
 * errors are non-empty its text is null — an invariant failure produces no module.
 *
 * Shape, for each fleet key k: `k` (the data), `${k}Ts` (the text or null),
 * `fleets[k]` ({ spec, data, text, errors }), and `fleetErrors[k]`; plus `errors` and
 * `warnings` over all fleets. `energy`/`energyTs`/`welfare`/`welfareTs` are the keys
 * the two-fleet callers already read.
 */
export function assembleFleet({ root = ROOT, dir = HOME } = {}) {
  // One sink per fleet, so a fault is charged to the fleet that has it; the shared
  // sink holds faults that stop every fleet (the Atlas ids cannot be read).
  const shared = makeSink();
  const sinks = Object.fromEntries(FLEETS.map((f) => [f.key, makeSink()]));
  const rawDir = isAbsolute(dir) ? dir : resolve(root, dir);
  const atlasIds = readAtlasIds(root, shared);

  const prepared = FLEETS.map((f) => prepareFleet(readFleet(rawDir, f, sinks[f.key]), sinks[f.key]));
  // Fleet ids span every fleet: an energy claim may point at a welfare scheme, a
  // finance loan at an energy company, and all modules merge into the one graph.
  const fleetIds = new Set();
  for (const p of prepared) {
    for (const id of p.entityGroups.keys()) fleetIds.add(id);
    for (const id of p.schemeGroups.keys()) fleetIds.add(id);
  }
  const isKnown = (id) => fleetIds.has(id) || atlasIds.has(id) || INVENTORY.test(id);
  for (const p of prepared) gateFleet(p, isKnown, sinks[p.fleet]);
  for (const p of prepared) if (p.spec.ownership) p.ownership = readOwnership(p, isKnown, sinks[p.fleet]);

  const res = { fleets: {}, fleetErrors: {}, errors: [...shared.errors], warnings: [...shared.warnings] };
  for (const p of prepared) {
    const k = p.fleet;
    const emitted = emitFleet(p, sinks[k]);
    const errors = [...shared.errors, ...sinks[k].errors];
    // A module's text is null exactly when its own fleet (or a shared fault) failed.
    const text = errors.length ? null : emitted.text;
    res.fleets[k] = { spec: p.spec, data: emitted.data, text, errors };
    res.fleetErrors[k] = errors;
    res[k] = emitted.data;
    res[`${k}Ts`] = text;
    res.errors.push(...sinks[k].errors);
    res.warnings.push(...sinks[k].warnings);
  }
  return res;
}

/**
 * The per-fleet view: `{ [key]: { data, text }, errors, warnings, fleetErrors }` for
 * every fleet in FLEETS. `rawDir` is the directory holding the fleet directories.
 */
export function assemble({ rawDir = HOME, root = ROOT } = {}) {
  const r = assembleFleet({ root, dir: rawDir });
  const out = { errors: r.errors, warnings: r.warnings, fleetErrors: r.fleetErrors };
  for (const f of FLEETS) out[f.key] = { data: r.fleets[f.key].data, text: r.fleets[f.key].text };
  return out;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = argv.indexOf(name);
    return i > -1 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('usage: node scripts/assemble-fleet.mjs [--dir research/raw] [--out <root>]');
    process.exit(0);
  }
  const dir = opt('--dir', 'research/raw');
  const outRoot = resolve(ROOT, opt('--out', '.'));
  const res = assembleFleet({ root: ROOT, dir });

  for (const f of FLEETS) {
    const d = res.fleets[f.key].data;
    const c = d.meta.counts;
    console.log(
      `  · ${f.key.padEnd(8)} ${d.meta.runId}  ${String(c.files).padStart(3)} file(s)  ${String(c.nodes).padStart(4)} nodes  ${String(c.edges).padStart(4)} edges  ` +
        `${c.killed} killed  ${c.excluded} excluded  ${c.contrasAdded} denial(s) added${f.kind === 'welfare' ? `  ${c.schemes} schemes` : ''}` +
        (d.meta.empty ? '  (empty — no research yet)' : ''),
    );
  }
  if (res.warnings.length) {
    console.log(`\n  ${res.warnings.length} warning(s):`);
    for (const w of res.warnings) console.log(`    ! ${w}`);
  }
  console.log('');
  // Each module is written on its own: one fleet's failure leaves only its own path untouched.
  for (const f of FLEETS) {
    const fleet = f.key;
    const text = res.fleets[fleet].text;
    const path = join(outRoot, f.out);
    const shown = relative(ROOT, path);
    const where = shown && !shown.startsWith('..') ? shown : path;
    if (text == null) {
      const errs = res.fleetErrors[fleet];
      console.error(`  ✗ ${fleet}: ${errs.length} error(s) — ${where} left untouched:`);
      for (const e of errs) console.error(`      ✗ ${e}`);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    console.log(`  → ${where}`);
  }
  if (res.errors.length) {
    console.error('\ngenerate: FAILED\n');
    process.exit(1);
  }
  console.log('\ngenerate: OK\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
