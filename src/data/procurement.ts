import raw from '../../research/raw/procurement-ocds.json';

/**
 * Bid counts on Indian public procurement.
 *
 * This is the field the whole platform has been missing. Every competition question
 * asked anywhere on the site — was that coal auction contested, was that contract a
 * stitch-up — reduces to "how many bidders showed up", and no Indian government body
 * publishes it in bulk. The coal register publishes it for 0 of 133 blocks; the
 * awards register recovers bid position for 38 of 125.
 *
 * Two jurisdictions publish it, and neither is a government: Himachal Pradesh and
 * Assam, both transformed from state portal scrapes by CivicDataLab and registered
 * with the Open Contracting Partnership. That makes the whole dataset `reported`
 * under docs/INGESTION.md Stage 0, and it is not yet verified against the portals —
 * the award pages are captcha-gated and the stored URLs are session-scoped.
 *
 * TWO STATES IS NOT INDIA. The single most likely misuse of this page is quoting one
 * of these rates as an Indian figure. They differ from each other by a factor of
 * nearly five, which is itself the strongest argument against generalising either.
 */

export interface ValueBand {
  band: string;
  tenders: number;
  singleBidder: number;
  singleBidderPct: number | null;
  meanBids: number | null;
}

export interface GroupStat {
  key: string;
  tenders: number;
  singleBidder: number;
  singleBidderPct: number;
}

export interface Jurisdiction {
  jurisdiction: string;
  records: number;
  withBidCount: number;
  bidCountCoveragePct: number;
  /** Tenders that drew no bid at all — a failed tender, not an uncompetitive one. */
  zeroBidTenders: number;
  zeroBidPct: number | null;
  tendersThatDrewBids: number;
  singleBidder: number;
  /** The headline rate: single-bidder over tenders that drew at least one bid. */
  singleBidderPctOfContested: number | null;
  /** The looser rate, over all tenders including the zero-bid ones. */
  singleBidderPctOfAll: number | null;
  meanBidsWhereContested: number | null;
  medianBidsWhereContested: number | null;
  histogram: Record<string, number>;
  byValueBand: ValueBand[];
  byCategory: GroupStat[];
  byProcurementMethod: GroupStat[];
  topBuyers: GroupStat[];
}

const doc = raw as unknown as {
  asOf: string;
  /**
   * Top level, not nested under `provenance`. `scripts/promote.mjs` treats a raw
   * file with no top-level `sources` as a FATAL rejection — a claim that cannot
   * be traced cannot be promoted — while `validate` only warns. This file shipped
   * with the sources one level too deep, and the warning was read past for a day.
   */
  sources: { publisher: string; title: string; url: string; retrieved: string; readAs: string; bytes: number; sha256_16: string }[];
  scope: string;
  headline: string;
  provenance: {
    tier: string;
    tierReason: string;
    transformedBy: string;
    registeredWith: string;
    standard: string;
  };
  verification: { status: string; why: string; plan: string; consequence: string };
  freshness: Record<string, string>;
  jurisdictions: Jurisdiction[];
  scatterSamples: { jurisdiction: string; population: number; sampled: number; seed: number; points: { valueInr: number; bids: number }[] }[];
  denominators: { note: string };
  whatIsMissing: Record<string, string>;
  gaps: string[];
};

export const PROCUREMENT = doc;
export const JURISDICTIONS = doc.jurisdictions;
export const PROC_AS_OF = doc.asOf;
export const SCATTER = doc.scatterSamples;

export function jurisdiction(name: string): Jurisdiction | undefined {
  return JURISDICTIONS.find((j) => j.jurisdiction === name);
}

/**
 * WHY THE HEADLINE RATIO IS NOT 4.8x — the desk's like-for-like correction.
 *
 * The platform published "Assam is 4.8 times less competitive than Himachal Pradesh".
 * The desk killed it on the control: the two files do not observe the same object.
 *
 * Himachal Pradesh is tender data JOINED to award data — every one of its records
 * carries an award and a supplier. Assam is tender-stage: only about 30% of its
 * records have reached Acceptance of Contract, and the registry reports zero awards
 * and zero suppliers for it. Inside Assam alone the single-bidder rate runs from
 * 4.58% to 42.79% depending on which stage you measure, so the stage you compare at
 * decides the answer.
 *
 * Narrowing to comparable ground — matched period, works category, award stage —
 * the ratio falls from 4.77x to 2.53x. Himachal's own rate barely moves across that
 * whole ladder (0.04 points); Assam's moves 7.83. A gap that survives is smaller and
 * still real; a gap of five is an artefact of comparing a completed auction to an
 * open one.
 */
export const LIKE_FOR_LIKE = {
  headlineRatio: 4.77,
  matchedRatio: 2.53,
  ladder: [
    { basis: 'as published', ratio: 4.77 },
    { basis: 'award stage only', ratio: 4.17 },
    { basis: 'valued tenders only', ratio: 2.43 },
    { basis: 'matched period and Works category', ratio: 2.53 },
  ],
  whyTheyDiffer:
    'Himachal Pradesh is tender data joined to award data; Assam is tender-stage with roughly 30% reaching award. Median tender value differs by a factor of six, and Assam has a documented e-procurement value threshold that moved twice.',
  himachalStability: 'Himachal\'s rate moves 0.04 points across the whole ladder.',
  assamInstability: 'Assam\'s moves 7.83 points.',
  zeroBidCorrection:
    'The 3,644 Assam tenders recorded with a bid count of zero are, in 92.34% of cases, simply UNOPENED — a stage that had not completed at export time, not a tender nobody bid for.',
  publisherCorrection:
    'The claim that neither state published the data itself is WRONG for Assam. Its publisher is the Assam Finance Department via AS-CFMS on data.gov.in, under the GODL-India licence. Himachal Pradesh remains a CivicDataLab transformation.',
} as const;

/** Totals across both, labelled so they cannot be read as a national figure. */
export function pooled(): {
  tenders: number;
  contested: number;
  singleBidder: number;
  pct: number;
  zeroBid: number;
  states: number;
} {
  const tenders = JURISDICTIONS.reduce((a, j) => a + j.withBidCount, 0);
  const contested = JURISDICTIONS.reduce((a, j) => a + j.tendersThatDrewBids, 0);
  const single = JURISDICTIONS.reduce((a, j) => a + j.singleBidder, 0);
  return {
    tenders,
    contested,
    singleBidder: single,
    pct: contested ? (single / contested) * 100 : 0,
    zeroBid: JURISDICTIONS.reduce((a, j) => a + j.zeroBidTenders, 0),
    states: JURISDICTIONS.length,
  };
}

/**
 * Does the single-bidder rate rise with contract value?
 *
 * This is the classic procurement-integrity test, and it is the one worth running
 * because it has a strong innocent reading either way: high-value work has fewer
 * qualified bidders for entirely ordinary reasons (bonding capacity, plant, prior
 * experience), so a rising rate is suggestive at best. A FLAT or FALLING rate,
 * though, is a clean negative — it rules out the version of the story where the
 * biggest contracts are the ones being arranged.
 *
 * Returns the direction per jurisdiction, computed from the top and bottom bands
 * that actually carry enough tenders to mean anything.
 */
export function valueGradient(j: Jurisdiction, minTenders = 30): {
  low: ValueBand | null;
  high: ValueBand | null;
  direction: 'rises' | 'falls' | 'flat' | 'insufficient';
  deltaPoints: number | null;
} {
  const usable = j.byValueBand.filter((b) => b.tenders >= minTenders && b.singleBidderPct != null);
  if (usable.length < 2) return { low: null, high: null, direction: 'insufficient', deltaPoints: null };
  const low = usable[0];
  const high = usable[usable.length - 1];
  const delta = (high.singleBidderPct ?? 0) - (low.singleBidderPct ?? 0);
  return {
    low,
    high,
    // 2 points is the band inside which these sample sizes cannot distinguish a
    // trend from noise, so anything smaller is reported as flat rather than dressed
    // up as a direction.
    direction: Math.abs(delta) < 2 ? 'flat' : delta > 0 ? 'rises' : 'falls',
    deltaPoints: Number(delta.toFixed(2)),
  };
}

/**
 * How the platform's OTHER registers compare against this base rate.
 *
 * The whole reason to have a base rate is to make a single observation
 * interpretable. Hydrocarbons publishing an 85.7% single-bid share in one OALP round
 * means something entirely different once you know that state public works runs at
 * 3% to 16%.
 */
export interface Comparison {
  register: string;
  singleBidPct: number | null;
  denominator: string;
  note: string;
}

export function comparisons(): Comparison[] {
  const p = pooled();
  return [
    {
      register: 'State public works (this dataset)',
      singleBidPct: Number(p.pct.toFixed(2)),
      denominator: `${p.contested.toLocaleString('en-IN')} contested tenders across ${p.states} states`,
      note: 'Pooling two states is questionable and the pooled figure is dominated by Assam, which contributes seven of every eight tenders. Read the per-state figures and the like-for-like note instead.',
    },
    {
      register: 'Hydrocarbon blocks, OALP Round VI',
      singleBidPct: 85.7,
      denominator: '18 of 21 blocks awarded',
      note: 'Roughly five to twenty-five times the state public-works rate. Exploration acreage and road contracts are not comparable assets, which is the caveat and also the point.',
    },
    {
      register: 'Hydrocarbon blocks, OALP Round I',
      singleBidPct: 3.6,
      denominator: '2 of 55 blocks awarded',
      note: 'The same programme, eight years earlier, sat at the Himachal Pradesh rate.',
    },
    {
      register: 'Coal blocks, rounds 9–12',
      singleBidPct: 40,
      denominator: '26 of 65 mines that drew at least one bid',
      note: 'CORRECTED. This row previously read "cannot be computed". The Ministry of Coal does publish mine-wise bid counts, in its PIB bid-opening releases. The denominator counts only mines that attracted a bidder — mines drawing none never appear in those tables — so it is NOT comparable with the rates above, which are computed over a population including many small routine lots.',
    },
  ];
}
