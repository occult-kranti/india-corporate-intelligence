#!/usr/bin/env node
/**
 * Exhaustive pattern search over the Himachal Pradesh procurement graph.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO, AND WHY IT IS THE MAIN RESULT.
 *
 * The obvious move with a 114-buyer × 1,858-supplier bipartite graph is to run the
 * prospector over the SUPPLIERS and report the concentrated ones. That is refused
 * here, and the refusal is measured rather than asserted: of 1,858 distinct
 * suppliers, only 288 carry any company marker at all — a legal form, an "M/s"
 * prefix, a trade word. The other 1,570 are bare personal names: "ganesh",
 * "SURINDER KUMAR", "Amar Chand Negi", and in one case the literal string
 * "individual".
 *
 * These are private individuals — small contractors — with no public role, no CIN,
 * no DIN, and no way to distinguish two people who share a name from one person who
 * appears twice. The platform's standing refusals cover this exactly: no allegation
 * about a private individual with no public role, and no person node without a
 * strong identifier. A pattern engine pointed at 1,570 named individuals who won
 * small public-works contracts is a defamation generator, not a network graph.
 *
 * WHAT IS LEGITIMATE, and what this script actually enumerates: the BUYERS. All 114
 * are public institutions — irrigation circles, municipal authorities, development
 * boards — and "does this public body concentrate its awards more than chance
 * predicts" is a question about a public process. It can be answered, and reported,
 * without naming a single supplier.
 *
 * Method is the prospector's, unchanged: declare the shape first, enumerate
 * exhaustively including the boring cases, score against a degree-preserving null,
 * correct across the whole declared family under arbitrary dependence, report the
 * funnel rather than the survivors.
 *
 * Usage: node scripts/prospect-procurement.mjs <hp.jsonl>
 */

import { readFileSync, writeFileSync } from 'node:fs';

const [, , path] = process.argv;
if (!path) {
  console.error('usage: node scripts/prospect-procurement.mjs <hp.jsonl>\n');
  process.exit(1);
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rows = readFileSync(path, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

/** Every (buyer, supplier) award pair. Suppliers are held as opaque ids from here on. */
const pairs = [];
const supplierId = new Map();
for (const r of rows) {
  const buyer = r?.buyer?.name;
  if (!buyer) continue;
  for (const a of r.awards ?? []) {
    for (const s of a.suppliers ?? []) {
      if (!s?.name) continue;
      if (!supplierId.has(s.name)) supplierId.set(s.name, supplierId.size);
      pairs.push({ buyer, sup: supplierId.get(s.name) });
    }
  }
}

const CORP = /\b(ltd|limited|pvt|private|llp|company|co\.|corporation|enterprises|industries|construction|builders|infra|associates|traders|works|agency|agencies|society|sansthan|samiti)\b|^m\/s/i;
const supplierNames = [...supplierId.keys()];
const corporate = supplierNames.filter((n) => CORP.test(n)).length;

/** Awards per buyer, and the buyer's top-supplier count. THE declared shape. */
function concentration(assignment) {
  const byBuyer = new Map();
  for (let i = 0; i < pairs.length; i++) {
    const b = pairs[i].buyer;
    const s = assignment[i];
    let e = byBuyer.get(b);
    if (!e) byBuyer.set(b, (e = new Map()));
    e.set(s, (e.get(s) ?? 0) + 1);
  }
  const out = new Map();
  for (const [b, counts] of byBuyer) {
    const vals = [...counts.values()];
    const n = vals.reduce((a, x) => a + x, 0);
    out.set(b, { awards: n, distinct: counts.size, top: Math.max(...vals) });
  }
  return out;
}

const observed = concentration(pairs.map((p) => p.sup));

/**
 * Null: shuffle the supplier column across ALL awards.
 *
 * This preserves each buyer's award count and the state-wide supplier frequency
 * distribution — so a supplier who is simply busy stays busy, and a buyer with four
 * awards still has four. What it destroys is any association between a particular
 * buyer and a particular supplier, which is exactly the thing being tested.
 *
 * Without this null the result is trivial and wrong: a buyer with 3 awards will
 * always look "concentrated", because 3 awards cannot be spread thin.
 */
/**
 * The shuffle count is DERIVED from the correction, not picked.
 *
 * This is the bug that a first version of this script shipped, and it would have
 * shipped silently as a clean negative result. With 400 shuffles the smallest
 * achievable p-value is 1/401 = 0.0025. Benjamini–Yekutieli then multiplies by the
 * family size (114) and the harmonic penalty (~5.5), so the smallest achievable
 * q-value is 0.0025 × 114 × 5.5 = 1.57, which caps at 1.
 *
 * **No candidate could ever survive, however extreme.** A power test — a synthetic
 * buyer with 40 of 40 awards to one supplier, which is as rigged as a procurement
 * record can be — went undetected, and the run reported "zero survivors" as though
 * that were a finding about Himachal Pradesh rather than a fact about the arithmetic.
 *
 * A resolution floor above the significance threshold is the most dangerous failure
 * available to this method, because its output is indistinguishable from an honest
 * null result. So the floor is computed, the shuffle count is set from it, and the
 * script REFUSES TO REPORT if the two are ever inconsistent.
 */
const SEED = 7;
const Q_TARGET = 0.05;
const familySizePlanned = new Set(pairs.map((p) => p.buyer)).size;
const cPenalty = Array.from({ length: familySizePlanned }, (_, i) => 1 / (i + 1)).reduce(
  (a, b) => a + b,
  0,
);
// Need min_p × N × c ≤ Q, and min_p = 1/(S+1).
const SHUFFLES = Math.max(2000, Math.ceil((familySizePlanned * cPenalty) / Q_TARGET) * 2);
const rand = rng(SEED);
/**
 * TWO NULLS, because the first one is not a control.
 *
 * The global shuffle assumes any supplier could have worked for any buyer. That is
 * false in an obvious way: a contractor in Rohru works for the Rohru irrigation
 * circle, not for Nurpur three hundred kilometres away. Shuffling statewide destroys
 * geography and speciality, so almost every buyer looks concentrated relative to a
 * world where its local contractors were scattered across Himachal Pradesh.
 *
 * The tell that this had happened was PWD: 46 awards of 2,133 to its most-used
 * supplier — 2.2% concentration — "surviving" correction. A finding that is
 * self-evidently not a finding means the null is wrong, not that the department is.
 *
 * This is the Artzy-Randrup result reproducing on new data. A degree-preserving null
 * is not null to spatial clustering, and the platform already carries that correction
 * in src/graph/nullModel.ts for the entity graph. The same fix applies here: shuffle
 * suppliers only WITHIN a department, so the null preserves who plausibly works for
 * whom and tests only whether a particular body concentrates beyond its peers.
 *
 * Both are reported. The gap between them is the diagnostic.
 */
const departmentOf = (buyer) => buyer.split('||')[0].trim();

const strata = new Map();
pairs.forEach((p, i) => {
  const d = departmentOf(p.buyer);
  if (!strata.has(d)) strata.set(d, []);
  strata.get(d).push(i);
});

function shuffleWithin(indices, perm) {
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[indices[i]], perm[indices[j]]] = [perm[indices[j]], perm[indices[i]]];
  }
}

const talliesGlobal = new Map([...observed.keys()].map((b) => [b, 0]));
const talliesStratified = new Map([...observed.keys()].map((b) => [b, 0]));

for (let s = 0; s < SHUFFLES; s++) {
  // Plain null — shuffle everything.
  const permG = pairs.map((p) => p.sup);
  for (let i = permG.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [permG[i], permG[j]] = [permG[j], permG[i]];
  }
  const simG = concentration(permG);

  // Stratified null — shuffle only inside each department.
  const permS = pairs.map((p) => p.sup);
  for (const idx of strata.values()) shuffleWithin(idx, permS);
  const simS = concentration(permS);

  for (const [b, o] of observed) {
    if ((simG.get(b)?.top ?? 0) >= o.top) talliesGlobal.set(b, talliesGlobal.get(b) + 1);
    if ((simS.get(b)?.top ?? 0) >= o.top) talliesStratified.set(b, talliesStratified.get(b) + 1);
  }
}

const tallies = talliesStratified;

/** Empirical upper-tail p, never a z→p conversion. */
const candidates = [...observed.entries()].map(([buyer, o]) => ({
  buyer,
  awards: o.awards,
  distinctSuppliers: o.distinct,
  topSupplierAwards: o.top,
  topSupplierSharePct: Number(((o.top / o.awards) * 100).toFixed(1)),
  p: (talliesStratified.get(buyer) + 1) / (SHUFFLES + 1),
  pGlobalNull: (talliesGlobal.get(buyer) + 1) / (SHUFFLES + 1),
}));

/** Benjamini–Yekutieli across the WHOLE declared family — all 114 buyers. */
const familySize = candidates.length;
const c = Array.from({ length: familySize }, (_, i) => 1 / (i + 1)).reduce((a, b) => a + b, 0);
const sorted = [...candidates].sort((a, b) => a.p - b.p);
let prev = 1;
for (let rank = sorted.length; rank >= 1; rank--) {
  const q = Math.min(1, (sorted[rank - 1].p * familySize * c) / rank);
  prev = Math.min(prev, q);
  sorted[rank - 1].q = prev;
}

const Q = Q_TARGET;
const survivors = sorted.filter((x) => x.q <= Q);

/**
 * The guard. A resolution floor above the significance threshold makes a null result
 * meaningless, and indistinguishable from a real one — so it is a hard stop.
 */
const minAchievableP = 1 / (SHUFFLES + 1);
// q at rank 1 is p * N * c / 1 — the largest divisor-adjusted value, so this is a
// CONSERVATIVE floor. BH/BY enforce monotonicity downward, so a candidate at a
// higher rank can reach a smaller q than this. The guard is therefore a necessary
// condition on having any resolution at all, not the exact detection threshold.
const qFloorAtRank1 = minAchievableP * familySize * c;
if (qFloorAtRank1 > Q) {
  console.error(
    `\n  REFUSING TO REPORT.\n` +
      `  With ${SHUFFLES} shuffles the smallest achievable p is ${minAchievableP.toExponential(2)}.\n` +
      `  After BY across ${familySize} candidates (penalty ${c.toFixed(2)}) the q floor at rank 1\n` +
      `  is ${qFloorAtRank1.toFixed(3)}, above the threshold of ${Q}.\n\n` +
      `  No candidate could survive regardless of the data, so "zero survivors" would be a\n` +
      `  fact about the arithmetic and not about procurement. Raise the shuffle count to at\n` +
      `  least ${Math.ceil((familySize * c) / Q)}.\n`,
  );
  process.exit(1);
}

const out = {
  asOf: '2026-08-12',

  // Required at the TOP LEVEL by scripts/promote.mjs — a file without it is a
  // fatal rejection, because a claim that cannot be traced cannot be promoted.
  // This file observes nothing of its own; it analyses one publication, and
  // that publication is what it cites.
  sources: [
    {
      publisher: 'Open Contracting Partnership data registry',
      title: 'Publication 77 — Himachal Pradesh (CivicDataLab), full.jsonl.gz',
      url: 'https://data.open-contracting.org/en/publication/77/download?name=full.jsonl.gz',
      retrieved: '2026-08-12',
      readAs:
        'gzipped JSON Lines, downloaded with curl and parsed line by line; this file is a derived analysis of that publication, produced by scripts/prospect-procurement.mjs. It introduces no observation of its own.',
    },
  ],

  scope: 'Himachal Pradesh public procurement, buyer-level award concentration.',

  refusal: {
    what: 'No supplier-level pattern search was run, and no supplier is named anywhere in this file.',
    why:
      'Of the distinct suppliers in this dataset, only a small minority carry any company marker; the large majority are bare personal names, including one literal "individual". These are private individuals with no public role, no CIN and no DIN, and two people sharing a name cannot be distinguished from one person appearing twice. Running a pattern-detection engine over them and reporting the concentrated ones would be a defamation generator, not a network graph.',
    measured: {
      distinctSuppliers: supplierNames.length,
      withCompanyMarker: corporate,
      barePersonalNames: supplierNames.length - corporate,
      bareNameSharePct: Number((((supplierNames.length - corporate) / supplierNames.length) * 100).toFixed(1)),
    },
    whatIsAnalysedInstead:
      'The buyers. All are public institutions, and "does this body concentrate its awards more than chance predicts" is a question about a public process that can be answered without naming any supplier.',
  },

  declaredShape:
    'For each procuring body, the number of awards going to its single most-used supplier. Declared before any scoring; every buyer enumerated including those with one award.',

  method: {
    resolution: {
      shuffles: SHUFFLES,
      minAchievableP: Number(minAchievableP.toExponential(3)),
      qFloorAtRank1: Number(qFloorAtRank1.toFixed(4)),
      qFloorNote:
        'Conservative. BY enforces monotonicity downward, so candidates at higher ranks can reach smaller q-values than the rank-1 floor. This is a necessary condition on having any resolution, not the exact detection threshold.',
      note:
        'The shuffle count is derived from the correction rather than chosen. A first version used 400 shuffles, which put the smallest achievable q at 1.57 — above the threshold — so no candidate could have survived however extreme, and a power test with a synthetic 40-of-40 buyer went undetected. The script now refuses to report when the resolution floor exceeds the threshold.',
    },
    nulls: {
      plain:
        'Supplier column shuffled across ALL awards. Preserves each buyer\'s award count and the state-wide supplier frequency distribution.',
      stratified:
        'Supplier column shuffled only WITHIN each department, so the null preserves who plausibly works for whom. This is the null the q-values use.',
      whyTwo:
        'The plain null is not a control. It assumes any supplier could have worked for any buyer, which is false — a contractor in Rohru works for the Rohru circle, not for Nurpur. Shuffling statewide destroys geography and speciality, so nearly every body looks concentrated. The tell was PWD surviving at 2.2% concentration: a result that is self-evidently not a finding means the null is wrong, not the department. This is the Artzy-Randrup result reproducing on new data, and the same correction the entity graph already carries.',
    },
    shuffles: SHUFFLES,
    seed: SEED,
    p: 'Empirical upper tail, (atLeast + 1) / (shuffles + 1). No z-to-p conversion.',
    correction: 'Benjamini–Yekutieli across the whole declared family, valid under arbitrary dependence.',
    q: Q,
  },

  funnel: {
    enumerated: familySize,
    awardPairs: pairs.length,
    departments: strata.size,
    survivedUnderPlainNull: (() => {
      const cs = candidates.map((x) => x.pGlobalNull).sort((a, b) => a - b);
      let pv = 1, n = 0;
      for (let rank = cs.length; rank >= 1; rank--) {
        pv = Math.min(pv, (cs[rank - 1] * familySize * c) / rank);
        if (pv <= Q) n++;
      }
      return n;
    })(),
    survivedFDR: survivors.length,
    survivalRatePct: Number(((survivors.length / familySize) * 100).toFixed(2)),
  },

  survivors: survivors.map((s) => ({
    buyer: s.buyer,
    awards: s.awards,
    distinctSuppliers: s.distinctSuppliers,
    topSupplierAwards: s.topSupplierAwards,
    topSupplierSharePct: s.topSupplierSharePct,
    p: Number(s.p.toFixed(5)),
    q: Number(s.q.toFixed(5)),
    pUnderPlainNull: Number(s.pGlobalNull.toFixed(5)),
    supplierNamed: false,
    innocentReading:
      'A procuring body with a small qualified-contractor pool in its district will concentrate awards for reasons that involve nobody\'s conduct. Remoteness, specialised work and a thin local market all produce this pattern.',
  })),

  interpretation:
    survivors.length === 0
      ? 'ZERO survivors. Every buyer\'s award concentration is explained by its award count and the state-wide supplier frequency distribution. This is a successful run: it is the honest answer, and a selective search could never have produced it.'
      : `${survivors.length} of ${familySize} procuring bodies concentrate awards beyond what the null predicts. Each is a QUESTION for the desk, not a finding, and none names a supplier.`,
};

writeFileSync('research/raw/prospect-procurement.json', JSON.stringify(out, null, 2));

console.log(`\n  PROSPECTOR — Himachal Pradesh buyer concentration`);
console.log(`  refusal: ${out.refusal.measured.bareNameSharePct}% of ${supplierNames.length} suppliers are bare personal names — no supplier-level search run`);
console.log(`  ${familySize} buyers enumerated over ${pairs.length} award pairs`);
console.log(`  ${SHUFFLES} shuffles, seed ${SEED}, BY at q=${Q} (q floor at rank 1 ${qFloorAtRank1.toFixed(4)})`);
console.log(`  → ${survivors.length} survived (${out.funnel.survivalRatePct}%)`);
for (const s of survivors.slice(0, 10)) {
  console.log(
    `      q=${s.q.toExponential(1)}  ${s.topSupplierAwards}/${s.awards} awards (${s.topSupplierSharePct}%) to one supplier — ${s.buyer.slice(0, 60)}`,
  );
}
console.log('');
