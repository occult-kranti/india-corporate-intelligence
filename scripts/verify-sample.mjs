#!/usr/bin/env node
/**
 * Verification sampler for third-party bulk data.
 *
 * Implements the Stage 0 rule in docs/INGESTION.md: no scraped dataset enters the
 * platform at tier `documented`, and none enters at all without a measured
 * verification rate against the issuing portal.
 *
 * The rule this enforces is the one that is easy to skip and expensive to skip:
 * NOBODY HAS READ ANY INDIVIDUAL ROW of a scrape. A parser bug that drops every
 * second bidder is invisible in aggregate and corrupts every statistic downstream.
 * The only defence is to draw a random sample, retrieve those rows from the source,
 * and publish the agreement rate.
 *
 * Two-phase, because the middle step is human or agent work against a live portal:
 *
 *   1. draw   — seeded random sample, written as a worksheet with empty slots.
 *               The draw happens BEFORE anyone looks at the rows, which is the
 *               whole point; a sample chosen after inspection measures nothing.
 *   2. score  — read the filled worksheet, compute per-field agreement, emit the
 *               verification block to paste into the raw file.
 *
 * Usage:
 *   node scripts/verify-sample.mjs draw  <dataset.json> <rowsPath> [--n 40] [--seed 7]
 *   node scripts/verify-sample.mjs score <worksheet.json>
 *
 *   rowsPath is a dotted path to the array inside the file, e.g. "tenders" or
 *   "data.records". Use "." when the file is itself an array.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const [, , cmd, ...rest] = process.argv;

/** Mulberry32 — same generator the null models use. Seeded, so a draw is reproducible. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dig(obj, path) {
  if (path === '.') return obj;
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

function flag(name, fallback) {
  const i = rest.indexOf(`--${name}`);
  return i > -1 ? rest[i + 1] : fallback;
}

if (cmd === 'draw') {
  const [file, rowsPath = '.'] = rest;
  if (!file || !existsSync(file)) {
    console.error('verify-sample: dataset file not found.\n');
    process.exit(1);
  }
  const n = Number(flag('n', 40));
  const seed = Number(flag('seed', 7));

  const doc = JSON.parse(readFileSync(file, 'utf8'));
  const rows = dig(doc, rowsPath);
  if (!Array.isArray(rows)) {
    console.error(`verify-sample: "${rowsPath}" is not an array in ${file}.\n`);
    process.exit(1);
  }
  if (rows.length < n) {
    console.error(
      `verify-sample: dataset has ${rows.length} rows, fewer than the requested sample of ${n}.\n` +
        'Verify the whole thing instead — a sample is not needed.\n',
    );
    process.exit(1);
  }

  // Draw without replacement, by shuffling indices with the seeded generator.
  const rand = rng(seed);
  const idx = rows.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const picked = idx.slice(0, n).sort((a, b) => a - b);

  const worksheet = {
    dataset: basename(file),
    rowsPath,
    population: rows.length,
    sampleSize: n,
    seed,
    drawnBeforeInspection: true,
    instructions: [
      'For each row below, open the ISSUING PORTAL — not another scrape, not a mirror,',
      'not a search-result snippet — and find the same record.',
      'Fill `found` with true/false, and `observed` with the portal values for the fields',
      'listed in `claimed`. Leave a field out of `observed` only if the portal does not',
      'publish it at all, and say so in `note`.',
      'A row you could not locate is `found: false` — that is a result, not a skip.',
    ],
    rows: picked.map((i) => ({
      index: i,
      claimed: rows[i],
      found: null,
      observed: {},
      sourceUrl: null,
      note: '',
    })),
  };

  const out = file.replace(/\.json$/, '') + '.verification-worksheet.json';
  writeFileSync(out, JSON.stringify(worksheet, null, 2));
  console.log(`\n  drew ${n} of ${rows.length} rows, seed ${seed}`);
  console.log(`  worksheet: ${out}`);
  console.log('\n  Fill it against the issuing portal, then:');
  console.log(`    node scripts/verify-sample.mjs score ${out}\n`);
  process.exit(0);
}

if (cmd === 'score') {
  const [file] = rest;
  if (!file || !existsSync(file)) {
    console.error('verify-sample: worksheet not found.\n');
    process.exit(1);
  }
  const w = JSON.parse(readFileSync(file, 'utf8'));

  const unfilled = w.rows.filter((r) => r.found === null);
  if (unfilled.length) {
    console.error(
      `\n  ${unfilled.length} of ${w.rows.length} rows still have found: null.\n` +
        '  Scoring a partly-filled worksheet would measure the rows someone found easy,\n' +
        '  which is the opposite of a random sample. Finish it or shrink the draw.\n',
    );
    process.exit(1);
  }

  const found = w.rows.filter((r) => r.found === true);
  const fieldStats = new Map();

  for (const r of found) {
    for (const [k, v] of Object.entries(r.observed ?? {})) {
      const claimed = r.claimed?.[k];
      const s = fieldStats.get(k) ?? { checked: 0, agreed: 0, mismatches: [] };
      s.checked++;
      // Loose compare: a portal printing "1,234" and a scrape holding 1234 agree.
      const norm = (x) =>
        x == null ? '' : String(x).trim().toLowerCase().replace(/[\s,]/g, '');
      if (norm(claimed) === norm(v)) s.agreed++;
      else s.mismatches.push({ index: r.index, claimed, observed: v });
      fieldStats.set(k, s);
    }
  }

  const verification = {
    method:
      'Seeded random sample drawn before inspection, each row retrieved from the issuing portal and compared field by field.',
    population: w.population,
    sampled: w.sampleSize,
    seed: w.seed,
    rowsLocated: found.length,
    rowsNotLocated: w.rows.length - found.length,
    locateRatePct: Number(((found.length / w.rows.length) * 100).toFixed(1)),
    fields: Object.fromEntries(
      [...fieldStats.entries()].map(([k, s]) => [
        k,
        {
          checked: s.checked,
          agreed: s.agreed,
          agreementPct: Number(((s.agreed / Math.max(1, s.checked)) * 100).toFixed(1)),
          mismatches: s.mismatches,
        },
      ]),
    ),
    tierCeiling: 'reported',
    tierNote:
      'This rate is evidence about the SCRAPER, not about any unsampled row. Only the sampled rows that were located and matched may be treated as documented; every other row remains reported however good the rate.',
  };

  const out = file.replace(/\.verification-worksheet\.json$/, '') + '.verification.json';
  writeFileSync(out, JSON.stringify(verification, null, 2));

  console.log(`\n  VERIFICATION — ${w.dataset}`);
  console.log(`  population ${w.population}, sampled ${w.sampleSize}, seed ${w.seed}`);
  console.log(
    `  located ${found.length}/${w.rows.length} (${verification.locateRatePct}%)`,
  );
  for (const [k, s] of Object.entries(verification.fields)) {
    const bad = s.agreementPct < 95 ? '  ← below 95%' : '';
    console.log(`    ${k.padEnd(28)} ${s.agreed}/${s.checked}  ${s.agreementPct}%${bad}`);
  }
  console.log(`\n  wrote ${out}`);

  // A low locate rate is fatal in a way a low field-agreement rate is not: it means
  // the scrape contains rows the portal does not, which is unexplained provenance.
  if (verification.locateRatePct < 90) {
    console.error(
      `\n  WARNING: only ${verification.locateRatePct}% of sampled rows could be located at the\n` +
        '  source. Rows a scrape holds and the portal does not are unexplained provenance,\n' +
        '  and no statistic should be computed from this dataset until that is understood.\n',
    );
  }
  console.log('');
  process.exit(0);
}

console.error(`
verify-sample — Stage 0 verification for third-party bulk data

  node scripts/verify-sample.mjs draw  <dataset.json> <rowsPath> [--n 40] [--seed 7]
  node scripts/verify-sample.mjs score <worksheet.json>

rowsPath is a dotted path to the row array ("." if the file is itself an array).
See docs/INGESTION.md, Stage 0.
`);
process.exit(1);
