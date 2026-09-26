#!/usr/bin/env node
/**
 * mark-loans.mjs — two mechanical marks on the researched finance files
 * (docs/design/FINANCE_PAGE.md §3.3 P1 and P7). Never a guess; everything it cannot
 * decide by rule it prints for review and leaves alone.
 *
 *   P1  projectId on a researched `loan` or `award` claim, only where the claim's own
 *       text names a World Bank project id: the one distinct /\bP\d{6}\b/ token in `lab`;
 *       or, when `lab` names none, the one distinct token in `d`. Two or more distinct
 *       tokens in the deciding field → not set, listed for review. The census
 *       (worldbank-projects.json) is skipped: the fetcher sets projectId there.
 *   P7  countable: false, countedAs and notCountableReason on every claim that
 *       research/raw/finance/RECONCILIATION.json `countedAs` lists — the reconciliation
 *       owns the pairs; this only writes them onto the claims so the record carries its
 *       own mark. The assembler refuses the fleet if the two ever disagree.
 *   P7  countable: false and notCountableReason (no countedAs) on every claim that
 *       RECONCILIATION.json `notCountable` lists — the F3 records that repeat nothing but
 *       are not one loan: a non-binding MoU, a portfolio aggregate, a facility envelope
 *       whose tranches are recorded. The reason is the entry's, verbatim.
 *
 * Existing values are never overwritten: a claim that already carries projectId or a
 * counting mark is reported, not touched. Each file is re-read immediately before it is
 * written, and written only if JSON.stringify round-trips it byte for byte (so the edit
 * touches only the keys it adds).
 *
 * Node 20+, no dependencies.   node scripts/finance/mark-loans.mjs [--write]
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..', '..', 'research', 'raw', 'finance');
const CENSUS = 'worldbank-projects.json';
const TOKEN = /\bP\d{6}\b/g;
const PROJECT_PREDS = ['loan', 'award'];

const text = (v) => (Array.isArray(v) ? v.join(' ') : typeof v === 'string' ? v : '');
const tokens = (s) => [...new Set(text(s).match(TOKEN) ?? [])].sort();

/** The P1 rule for one claim: { id } when the text names exactly one project, else { review }. */
export function projectIdFromText(c) {
  const inLab = tokens(c.lab);
  const inD = tokens(c.d);
  if (inLab.length === 1) {
    const others = inD.filter((t) => t !== inLab[0]);
    return { id: inLab[0], note: others.length ? `lab names ${inLab[0]}; d also names ${others.join(', ')} (set from lab)` : null };
  }
  if (inLab.length > 1) return { id: null, review: `lab names ${inLab.length} projects (${inLab.join(', ')}) — not set` };
  if (inD.length === 1) return { id: inD[0], note: `set from d (lab names none)` };
  if (inD.length > 1) return { id: null, review: `lab names none; d names ${inD.length} projects (${inD.join(', ')}) — not set` };
  return { id: null };
}

/** Insert `add` into `obj` after key `after` (or at the end), preserving every other key's order. */
function insertAfter(obj, after, add) {
  if (!(after in obj)) return { ...obj, ...add };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v;
    if (k === after) Object.assign(out, add);
  }
  return out;
}

function readExact(path) {
  const raw = readFileSync(path, 'utf8');
  const doc = JSON.parse(raw);
  for (const indent of [2, 1, 4]) {
    for (const eol of ['\n', '']) if (`${JSON.stringify(doc, null, indent)}${eol}` === raw) return { raw, doc, indent, eol };
  }
  return { raw, doc, indent: null, eol: '' };
}

export function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  const census = JSON.parse(readFileSync(join(DIR, CENSUS), 'utf8'));
  const known = new Set((census.projects ?? []).map((p) => p.id));
  const rec = JSON.parse(readFileSync(join(DIR, 'RECONCILIATION.json'), 'utf8'));
  const pairs = new Map((rec.countedAs ?? []).map((m) => [m.claimId, m]));
  const notCountable = new Map((rec.notCountable ?? []).map((m) => [m.claimId, m]));

  const report = { set: [], review: [], notes: [], counted: [], notCountable: [], skipped: [] };
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json') && !/^[A-Z]/.test(f) && f !== CENSUS).sort();
  for (const f of files) {
    const path = join(DIR, f);
    const { raw, doc, indent, eol } = readExact(path);
    let changed = false;
    doc.claims = (doc.claims ?? []).map((c) => {
      let out = c;
      if (PROJECT_PREDS.includes(c.pred)) {
        const r = projectIdFromText(c);
        if (r.review) report.review.push(`${c.id}: ${r.review}`);
        if (r.id) {
          if (r.note) report.notes.push(`${c.id}: ${r.note}`);
          if (!known.has(r.id)) report.notes.push(`${c.id}: ${r.id} is not in the census projects[] (set as the text names it)`);
          if (c.projectId != null && c.projectId !== r.id) report.skipped.push(`${c.id}: already carries projectId ${c.projectId}; the text names ${r.id} — left alone`);
          else if (c.projectId == null) {
            out = insertAfter(out, 'lab', { projectId: r.id });
            report.set.push(`${c.id} → ${r.id}`);
            changed = true;
          }
        }
      }
      const m = pairs.get(c.id);
      if (m) {
        if (c.countedAs != null || c.countable != null || c.notCountableReason != null) {
          if (c.countedAs !== m.countedAs) report.skipped.push(`${c.id}: already carries a counting mark (${JSON.stringify(c.countedAs)}); RECONCILIATION says ${m.countedAs} — left alone`);
        } else {
          out = insertAfter(out, 'supersededBy', { countable: false, countedAs: m.countedAs, notCountableReason: m.note ?? null });
          report.counted.push(`${c.id} countedAs ${m.countedAs}`);
          changed = true;
        }
      }
      const n = notCountable.get(c.id);
      if (n && m) report.skipped.push(`${c.id}: listed in both countedAs and notCountable — not written`);
      else if (n) {
        if (c.countedAs != null || c.countable != null || c.notCountableReason != null) {
          if (c.countable !== false || c.countedAs != null || c.notCountableReason !== n.notCountableReason) report.skipped.push(`${c.id}: already carries a counting mark; RECONCILIATION notCountable says "${n.notCountableReason}" — left alone`);
        } else if (c.pred !== 'loan') {
          report.skipped.push(`${c.id}: RECONCILIATION notCountable names a ${c.pred} claim — counting marks belong on loans; not written`);
        } else {
          out = insertAfter(out, 'supersededBy', { countable: false, notCountableReason: n.notCountableReason });
          report.notCountable.push(`${c.id} not countable (${n.class})`);
          changed = true;
        }
      }
      return out;
    });
    if (!changed) continue;
    if (indent == null) {
      report.skipped.push(`${f}: does not round-trip through JSON.stringify — not written; mark it by hand`);
      continue;
    }
    if (write) {
      // Re-read: another agent may have written since; apply only if the bytes are unchanged.
      if (readFileSync(path, 'utf8') !== raw) {
        report.skipped.push(`${f}: changed while marking — re-run`);
        continue;
      }
      writeFileSync(path, `${JSON.stringify(doc, null, indent)}${eol}`);
    }
  }
  for (const id of pairs.keys()) {
    if (!files.some((f) => (JSON.parse(readFileSync(join(DIR, f), 'utf8')).claims ?? []).some((c) => c.id === id))) report.skipped.push(`RECONCILIATION countedAs names ${id}, which no researched file holds`);
  }
  for (const id of notCountable.keys()) {
    if (!files.some((f) => (JSON.parse(readFileSync(join(DIR, f), 'utf8')).claims ?? []).some((c) => c.id === id))) report.skipped.push(`RECONCILIATION notCountable names ${id}, which no researched file holds`);
  }
  process.stdout.write(`${JSON.stringify({ write, ...report }, null, 2)}\n`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
