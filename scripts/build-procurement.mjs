#!/usr/bin/env node
/**
 * Build `research/raw/procurement-ocds.json` from the two Indian OCDS bulk files.
 *
 * WHY THIS EXISTS AS A SCRIPT rather than a hand-written dataset: the inputs are
 * 38,000 records and the output is a set of rates. A rate typed by hand into a JSON
 * file cannot be checked; a rate computed by a committed script from a named input
 * with a recorded digest can be re-derived by anyone. The script IS the provenance.
 *
 * WHAT THESE FILES ARE. Himachal Pradesh and Assam are the only two Indian
 * jurisdictions with published Open Contracting data, and neither published it
 * themselves — both were transformed from state portal scrapes by CivicDataLab, an
 * NGO, and registered with the Open Contracting Partnership. They are therefore
 * `reported`, per docs/INGESTION.md Stage 0, and no row here is `documented` until
 * somebody opens the portal page for that row.
 *
 * WHY IT MATTERS ANYWAY. Bid count per tender is the single most valuable field in
 * procurement data and no Indian government body publishes it in bulk. These two
 * files are the only place a single-bidder rate can be computed at all — the coal
 * register publishes it for 0 of 133 blocks, and the awards register recovers bid
 * position for 38 of 125.
 *
 * Usage: node scripts/build-procurement.mjs <hp.jsonl> <assam.jsonl>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash as hash } from 'node:crypto';

const [, , hpPath, assamPath] = process.argv;
if (!hpPath || !assamPath) {
  console.error('usage: node scripts/build-procurement.mjs <hp.jsonl> <assam.jsonl>\n');
  process.exit(1);
}

const digest = (buf) => hash('sha256').update(buf).digest('hex').slice(0, 16);

function load(path) {
  const buf = readFileSync(path);
  const rows = buf
    .toString('utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l));
  return { rows, bytes: buf.length, sha256_16: digest(buf) };
}

/**
 * Bid-count statistics for one jurisdiction.
 *
 * Zero-bid tenders are separated out rather than folded into the single-bidder
 * count. A tender nobody bid for is a FAILED tender; a tender one party bid for is
 * an awarded tender with no competition. Those are different events with different
 * causes, and a rate that mixes them answers neither question.
 */
function analyse(rows, label) {
  const withCount = rows.filter((r) => r?.tender?.numberOfTenderers != null);
  const counts = withCount.map((r) => r.tender.numberOfTenderers);

  const zeroBid = counts.filter((n) => n === 0).length;
  const drewBids = counts.filter((n) => n > 0);
  const single = drewBids.filter((n) => n === 1).length;

  const histogram = {};
  for (const n of counts) histogram[n] = (histogram[n] ?? 0) + 1;

  const value = (r) => r?.tender?.value?.amount ?? null;
  const BANDS = [
    [0, 1e5, 'under 1 lakh'],
    [1e5, 1e6, '1 to 10 lakh'],
    [1e6, 1e7, '10 lakh to 1 crore'],
    [1e7, 1e8, '1 to 10 crore'],
    [1e8, Infinity, 'over 10 crore'],
  ];

  const byValueBand = BANDS.map(([lo, hi, band]) => {
    const sub = withCount.filter((r) => {
      const v = value(r);
      return v != null && v >= lo && v < hi && r.tender.numberOfTenderers > 0;
    });
    const s = sub.filter((r) => r.tender.numberOfTenderers === 1).length;
    return {
      band,
      tenders: sub.length,
      singleBidder: s,
      singleBidderPct: sub.length ? Number(((s / sub.length) * 100).toFixed(2)) : null,
      meanBids: sub.length
        ? Number((sub.reduce((a, r) => a + r.tender.numberOfTenderers, 0) / sub.length).toFixed(2))
        : null,
    };
  }).filter((b) => b.tenders > 0);

  const groupBy = (fn) => {
    const m = new Map();
    for (const r of withCount) {
      if (r.tender.numberOfTenderers === 0) continue;
      const k = fn(r) ?? 'not stated';
      const e = m.get(k) ?? { tenders: 0, singleBidder: 0 };
      e.tenders++;
      if (r.tender.numberOfTenderers === 1) e.singleBidder++;
      m.set(k, e);
    }
    return [...m.entries()]
      .map(([key, v]) => ({
        key,
        ...v,
        singleBidderPct: Number(((v.singleBidder / v.tenders) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.tenders - a.tenders);
  };

  return {
    jurisdiction: label,
    records: rows.length,
    withBidCount: withCount.length,
    bidCountCoveragePct: Number(((withCount.length / rows.length) * 100).toFixed(2)),
    zeroBidTenders: zeroBid,
    zeroBidPct: counts.length ? Number(((zeroBid / counts.length) * 100).toFixed(2)) : null,
    tendersThatDrewBids: drewBids.length,
    singleBidder: single,
    /** THE headline: single-bidder as a share of tenders that drew any bid at all. */
    singleBidderPctOfContested: drewBids.length
      ? Number(((single / drewBids.length) * 100).toFixed(2))
      : null,
    /** The looser figure, for comparison with anyone who computes it that way. */
    singleBidderPctOfAll: counts.length
      ? Number(((single / counts.length) * 100).toFixed(2))
      : null,
    meanBidsWhereContested: drewBids.length
      ? Number((drewBids.reduce((a, b) => a + b, 0) / drewBids.length).toFixed(2))
      : null,
    medianBidsWhereContested: drewBids.length
      ? [...drewBids].sort((a, b) => a - b)[Math.floor(drewBids.length / 2)]
      : null,
    histogram,
    byValueBand,
    byCategory: groupBy((r) => r.tender.mainProcurementCategory),
    byProcurementMethod: groupBy((r) => r.tender.procurementMethod),
    topBuyers: groupBy((r) => r.buyer?.name).slice(0, 15),
  };
}

/** Mulberry32 — same seeded generator the null models use, so a sample reproduces. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A seeded sample of individual tenders, for the value-against-bids scatter.
 *
 * The aggregate bands answer "does the rate rise with value" but they cannot show
 * the SHAPE — whether single-bidder tenders cluster anywhere, or scatter evenly
 * through the value range. Only individual points can, and 38,000 of them would be
 * an unreadable smear as well as a large file.
 *
 * Sampled rather than truncated: taking the first N would be taking whatever the
 * portal happened to export first, which is not a random subset of anything.
 */
function scatterSample(rows, label, n = 400, seed = 11) {
  const usable = rows.filter(
    (r) => r?.tender?.numberOfTenderers > 0 && r?.tender?.value?.amount > 0,
  );
  const rand = rng(seed);
  const idx = usable.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return {
    jurisdiction: label,
    population: usable.length,
    sampled: Math.min(n, usable.length),
    seed,
    points: idx.slice(0, n).map((i) => ({
      valueInr: usable[i].tender.value.amount,
      bids: usable[i].tender.numberOfTenderers,
    })),
  };
}

const hp = load(hpPath);
const assam = load(assamPath);

const jurisdictions = [analyse(hp.rows, 'Himachal Pradesh'), analyse(assam.rows, 'Assam')];

/**
 * The headline is COMPUTED, not typed.
 *
 * An earlier draft of this script hand-wrote "14.82%" into the headline string while
 * the analyser returned 16.18% — two different denominators, one of them typed from
 * memory. That is the exact failure the derive-never-duplicate rule exists to prevent,
 * and it survived precisely because a string in a JSON file is not checked by anything.
 */
const [hpStat, asStat] = jurisdictions;
const ratio = (asStat.singleBidderPctOfContested / hpStat.singleBidderPctOfContested).toFixed(1);

const doc = {
  asOf: '2026-08-12',
  scope:
    'Bid counts on Indian public procurement, from the only two jurisdictions that publish them in bulk. Himachal Pradesh and Assam only — this is NOT a national dataset and no figure here should be presented as an Indian rate.',
  headline:
    `Single-bidder rates differ by a factor of ${ratio} between the only two Indian states whose procurement bid counts are published: ` +
    `${hpStat.singleBidderPctOfContested}% in ${hpStat.jurisdiction} (${hpStat.singleBidder} of ${hpStat.tendersThatDrewBids}) against ` +
    `${asStat.singleBidderPctOfContested}% in ${asStat.jurisdiction} (${asStat.singleBidder} of ${asStat.tendersThatDrewBids}), ` +
    `measured identically over tenders that drew at least one bid. Neither state published the data itself.`,

  // Top level, not nested: scripts/promote.mjs treats a file with no top-level
  // `sources` as a FATAL rejection — claims in it cannot be traced. `validate`
  // only warns about it, which is how two files shipped that promote refuses.
  sources: [
    {
      publisher: 'Open Contracting Partnership data registry',
      title: 'Publication 77 — Himachal Pradesh (CivicDataLab), full.jsonl.gz',
      url: 'https://data.open-contracting.org/en/publication/77/download?name=full.jsonl.gz',
      retrieved: '2026-08-12',
      readAs: 'gzipped JSON Lines, downloaded with curl and parsed line by line',
      bytes: hp.bytes,
      sha256_16: hp.sha256_16,
    },
    {
      publisher: 'Open Contracting Partnership data registry',
      title: 'Publication 131 — Assam (CivicDataLab), full.jsonl.gz',
      url: 'https://data.open-contracting.org/en/publication/131/download?name=full.jsonl.gz',
      retrieved: '2026-08-12',
      readAs: 'gzipped JSON Lines, downloaded with curl and parsed line by line',
      bytes: assam.bytes,
      sha256_16: assam.sha256_16,
    },
  ],

  provenance: {
    tier: 'reported',
    tierReason:
      'Neither dataset is published by the procuring government. Both are transformations of state e-procurement portal scrapes, made by CivicDataLab (an NGO) and registered with the Open Contracting Partnership. Per docs/INGESTION.md Stage 0 a third-party bulk dataset enters at `reported` and no individual row becomes `documented` until the portal page for that row is opened.',
    transformedBy: 'CivicDataLab',
    registeredWith: 'Open Contracting Partnership data registry',
    standard: 'Open Contracting Data Standard 1.1, compiled releases',
  },

  verification: {
    status: 'not-yet-verified',
    why:
      'Award-stage pages on the GePNIC state portals these were scraped from are captcha-gated and additionally require a known tender ID, and the stored portal URLs are session-scoped and return "Unauthorized Page" when replayed. A sample therefore cannot be checked by automated retrieval; it needs portal search by tender ID, by hand.',
    plan:
      'node scripts/verify-sample.mjs draw research/raw/procurement-ocds.json samples.himachalPradesh --n 40 --seed 7, then retrieve each by tender ID through the portal search form.',
    consequence:
      'Until that is done every figure here is `reported` and carries an unmeasured error rate. The rates are published because an unverified rate with its provenance stated is more useful than no rate at all — but a parser bug that dropped bidders would be invisible, and the single-bidder figures would be biased upward by exactly that bug.',
  },

  freshness: {
    warning:
      'Both datasets are frozen. There is no live official feed of Indian procurement outcomes.',
    himachalPradesh: 'Registry records the source as no longer updated.',
    assam: 'Registry records the source as no longer updated; CKAN mirrors run later.',
  },

  jurisdictions,

  scatterSamples: [scatterSample(hp.rows, 'Himachal Pradesh'), scatterSample(assam.rows, 'Assam')],

  denominators: {
    note:
      'Two denominators are available for a single-bidder rate and they differ materially. Tenders that drew ZERO bids are excluded from the headline, because a tender nobody bid for is a failed tender rather than an uncompetitive award. Both figures are published so neither can be quoted without the other.',
  },

  whatIsMissing: {
    winnerIdentifier:
      'No CIN, GSTIN or any company identifier appears in either dataset. The OCDS `identifier` object — the standard\'s designated slot for exactly this — is absent. Supplier ids are within-award sequence numbers reused on every tender, and supplier names are free text that frequently denote natural persons. Linking a winner here to a company elsewhere on this platform requires fuzzy name matching and would be `analytic`.',
    nationalCoverage:
      'Two states of 28, and neither is large. The Central Public Procurement Portal publishes no bulk award export; its results page returns zero rows behind a captcha and its dashboard JSON feeds return empty bodies.',
    liveData: 'Neither source is updated. Any trend computed from them ends where they end.',
  },

  gaps: [
    'Verification sample not yet drawn or checked — see `verification`.',
    'Himachal Pradesh codes 3,768 of 3,771 tenders as procurement method "limited", which is almost certainly a portal-export artefact rather than a real distribution. No method-level comparison should be drawn from it.',
    'Assam records 3,644 tenders with a bid count of exactly zero. Whether these are failed tenders, cancelled tenders, or an export artefact for a stage that had not completed is not established here.',
    'Neither dataset carries a bidder roster in the OCP bulk file, so losing bidders and disqualification reasons — which the Assam CKAN API is reported to expose — are absent from this build.',
    'No national figure exists and none is computed. Presenting a two-state rate as an Indian rate would be the error this dataset is best placed to prevent.',
  ],
};

const out = 'research/raw/procurement-ocds.json';
writeFileSync(out, JSON.stringify(doc, null, 2));

console.log(`\n  wrote ${out}`);
for (const j of doc.jurisdictions) {
  console.log(
    `  ${j.jurisdiction.padEnd(18)} ${j.withBidCount} tenders with bid counts · ` +
      `single-bidder ${j.singleBidderPctOfContested}% of ${j.tendersThatDrewBids} contested · ` +
      `${j.zeroBidTenders} drew none`,
  );
}
console.log('');
