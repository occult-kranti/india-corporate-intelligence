import coalRaw from '../../research/raw/resources-coal.json';
import mineralsRaw from '../../research/raw/resources-minerals.json';
import hydrocarbonsRaw from '../../research/raw/resources-hydrocarbons.json';
import spectrumRaw from '../../research/raw/resources-spectrum.json';
import type { StateCode } from '../graph/schema';

/**
 * Natural-resource allocation registers.
 *
 * The only domain on this platform where geography is CAUSAL rather than incidental.
 * A coal block is a place — its state, its coalfield and its reserves are properties
 * of the ground, not of the winner. A tender is not a place, which is why the awards
 * register gets a concentration curve and this one gets a map.
 *
 * The organising fact is a regime change. Allocations from 1993 were made by a
 * Screening Committee on applications; the Supreme Court declared that process
 * arbitrary and illegal in 2014, and the Coal Mines (Special Provisions) Act 2015
 * replaced it with competitive auction. Every series in this domain splits at that
 * boundary, because plotting a discretionary regime and an auction regime as one
 * continuous line is a chart that hides its own subject.
 */

export interface ResourceSource {
  publisher: string;
  title: string;
  url: string;
  retrieved: string;
  /** How the document was actually read — "PDF ... extracted with pypdf", "page images". */
  readAs?: string;
}

export interface CoalBlock {
  id: string;
  ministrySerial: string;
  blocksCoveredByThisRow: number;
  mineNameAsPrinted: string;
  state: string;
  district: string | null;
  coalfield: string | null;
  act: string | null;
  tranche: string | null;
  mode: string | null;
  endUse: string | null;
  geologicalReservesMt: number | null;
  peakRatedCapacityMtpa: number | null;
  explorationStatus: string | null;
  winnerLegalName: string | null;
  winnerCin: string | null;
  winnerDirectParent: string | null;
  revenueSharePctFinalOffer: number | null;
  vestingOrAllotmentOrderDate: string | null;
  status: string | null;
  tier: 'documented' | 'reported' | 'alleged' | 'analytic';
  srcs: ResourceSource[];
}

export interface CoalTranche {
  round: number;
  minesOffered: number | null;
  minesOfferedNote?: string | null;
  minesSuccessfullyAuctioned: number | null;
  minesSuccessfullyAuctionedAsOf?: string;
  minesSuccessfullyAuctionedEarlierFigure?: number | null;
  minesSuccessfullyAuctionedEarlierFigureAsOf?: string;
  tier: string;
  srcs: ResourceSource[];
}

export interface WinnerRow {
  rank: number;
  winnerLegalName: string;
  blocksWon: number;
  shareOfAllCommercialBlocksPct: number;
  cumulativeSharePct: number;
  winnerCin: string | null;
  mines: string[];
}

export interface CoalEraRecord {
  fact?: string;
  finding?: string;
  tier?: string;
  srcs?: ResourceSource[];
  [k: string]: unknown;
}

export interface CoalBaseRate {
  claim: string;
  rate: number | null;
  numerator: number | null;
  denominator: number | null;
  denominatorLabel: string;
  tier: string;
  reading: string;
  srcs?: ResourceSource[];
}

const coal = coalRaw as unknown as {
  asOf: string;
  scope: string;
  method: Record<string, unknown>;
  sources: ResourceSource[];
  screeningCommitteeEraAndCancellation: CoalEraRecord[];
  auctionRegime: { id: string; claim: string; figures?: unknown; definitions?: unknown; tier: string; note?: string; srcs: ResourceSource[] }[];
  tranches: CoalTranche[];
  blocks: CoalBlock[];
  denominators: {
    theHeadlineDenominator: {
      commercialBlocksWithVestingOrAllocationOrders: number;
      ministryRowsCoveringThem: number;
      distinctWinningLegalEntities: number;
      meanBlocksPerWinner: number;
      medianBlocksPerWinner: number;
      singleBlockWinners: number;
      singleBlockWinnersAsPctOfWinners: number;
      singleBlockWinnersAsPctOfBlocks: number;
      top1BlocksPct: number;
      top5BlocksPct: number;
      top10BlocksPct: number;
      herfindahlHirschmanIndexOnBlockShare: number;
      asOf: string;
      definition: string;
      top5TieNote?: string;
      srcs: ResourceSource[];
    };
    whyThisIsNotTheOnlyDenominator: Record<string, unknown>;
    [k: string]: unknown;
  };
  winnerFrequencyDistribution: {
    unit: string;
    denominator: number;
    distinctWinners: number;
    note: string;
    distribution: WinnerRow[];
    tieNote?: string;
    srcs: ResourceSource[];
  };
  corporateFamilyCaveat: unknown;
  revenueShareOutcomes: unknown;
  baseRates: CoalBaseRate[];
  gaps: string[];
  rejected: { candidate: string; reason: string }[];
};

export const COAL = coal;
export const COAL_BLOCKS = coal.blocks;
export const COAL_TRANCHES = coal.tranches;
export const COAL_AS_OF = coal.asOf;
export const COAL_HEADLINE = coal.denominators.theHeadlineDenominator;
export const COAL_WINNERS = coal.winnerFrequencyDistribution;

/**
 * Coal bid counts, recovered by the desk from PIB bid-opening releases.
 *
 * The coal register was built from the Nominated Authority's result sheets, which
 * publish reserve price, final offer and winner and never the number of bids — and
 * the platform reported that as "0 of 133 blocks carry a bid count", on four pages,
 * as the sharpest disclosure hole it had found.
 *
 * That was wrong about the ministry. Its PIB bid-opening releases carry a table
 * headed "Mine-wise list of bids received", with columns for mine name, round and
 * number of bids. Five such releases yield 65 mine-level observations.
 *
 * The correction cuts both ways and the second half matters more: 26 of those 65
 * mines drew exactly one bid. Under the auction rules a mine with fewer than two
 * technically qualified bidders is annulled, so those 26 could not proceed.
 *
 * READ THE DENOMINATOR. These tables list mines that drew AT LEAST ONE bid. Mines
 * that drew none never appear, so 40% is a share of mines that attracted a bidder
 * and NOT a share of mines offered. It is not comparable with the state
 * public-works rates on /competition, which are computed the same way but over a
 * population that includes far more small, routine lots.
 */
export const COAL_PIB_BIDS = {
  observations: 65,
  singleBidMines: 26,
  singleBidSharePct: 40,
  meanBids: 3.22,
  rounds: 'rounds 9–12, plus second attempts of rounds 7–11 run alongside them',
  releasesOpened: 6,
  releasesCarryingTheTable: 5,
  denominatorWarning:
    'Mines that drew no bid at all are absent from these tables, so this is a share of mines that attracted a bidder, not of mines offered.',
  ruleNote:
    'Under the auction rules a mine with fewer than two technically qualified bidders is annulled, so a single-bid mine could not proceed.',
  absentFrom: 'The 14th round bid-opening release (23 Dec 2025) carries no such table.',
  srcs: [
    ['PIB 2007501 — 9th round bid opening, 20 Feb 2024', 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2007501'],
    ['PIB 2066781 — 10th round bid opening, 21 Oct 2024', 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2066781'],
    ['PIB 2099232 — 11th round bid opening', 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2099232'],
    ['PIB 2136757 — 12th round bid opening', 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2136757'],
    ['PIB 2137313 — 12th round underground blocks, named bidder table', 'https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2137313'],
  ] as [string, string][],
} as const;

/** State names as printed by the Ministry, mapped to the platform's state codes. */
const STATE_CODE_BY_NAME: Record<string, StateCode> = {
  Chhattisgarh: 'ct',
  Jharkhand: 'jh',
  'Madhya Pradesh': 'mp',
  Maharashtra: 'mh',
  Odisha: 'or',
  'West Bengal': 'wb',
  Assam: 'as',
  'Arunachal Pradesh': 'ar',
};

export function coalStateCode(stateName: string): StateCode | null {
  return STATE_CODE_BY_NAME[stateName.trim()] ?? null;
}

/**
 * Blocks per state, for the allocation layer of the map.
 *
 * `blocksCoveredByThisRow` matters: seven rows in the ministry file carry a
 * hyphenated serial covering two blocks each, so counting rows undercounts blocks
 * by seven. The register's own denominator is 133 blocks across 126 rows, and this
 * must reconcile to it.
 */
export function coalByState(blocks: CoalBlock[] = COAL_BLOCKS): {
  state: string;
  code: StateCode | null;
  blocks: number;
  rows: number;
  winners: number;
}[] {
  const m = new Map<string, { blocks: number; rows: number; winners: Set<string> }>();
  for (const b of blocks) {
    const e = m.get(b.state) ?? { blocks: 0, rows: 0, winners: new Set<string>() };
    e.blocks += b.blocksCoveredByThisRow || 1;
    e.rows += 1;
    if (b.winnerLegalName) e.winners.add(b.winnerLegalName);
    m.set(b.state, e);
  }
  return [...m.entries()]
    .map(([state, v]) => ({
      state,
      code: coalStateCode(state),
      blocks: v.blocks,
      rows: v.rows,
      winners: v.winners.size,
    }))
    .sort((a, b) => b.blocks - a.blocks || a.state.localeCompare(b.state));
}

/**
 * Offered vs auctioned, for the rounds where BOTH numbers exist.
 *
 * They exist for rounds 11–14 only, because the ministry's tranche summary publishes
 * how many mines were auctioned and never how many were offered — the offered count
 * survives only in the pre-bid technical presentations still on the download page.
 * Reporting a take rate across all fourteen rounds would silently treat "offered
 * unknown" as "offered equals auctioned", i.e. a 100% take rate, which is the exact
 * inversion of what the recoverable rounds show.
 */
export function coalTakeRate(): {
  rounds: { round: number; offered: number; auctioned: number }[];
  offered: number;
  auctioned: number;
  ratePct: number | null;
  roundsWithoutOffered: number;
} {
  const rounds = COAL_TRANCHES.filter(
    (t): t is CoalTranche & { minesOffered: number; minesSuccessfullyAuctioned: number } =>
      t.minesOffered != null && t.minesSuccessfullyAuctioned != null,
  ).map((t) => ({ round: t.round, offered: t.minesOffered, auctioned: t.minesSuccessfullyAuctioned }));
  const offered = rounds.reduce((s, r) => s + r.offered, 0);
  const auctioned = rounds.reduce((s, r) => s + r.auctioned, 0);
  return {
    rounds,
    offered,
    auctioned,
    ratePct: offered > 0 ? (auctioned / offered) * 100 : null,
    roundsWithoutOffered: COAL_TRANCHES.length - rounds.length,
  };
}

/**
 * Identifier coverage — and this one bounds the concentration finding rather than
 * merely describing the data.
 *
 * A CIN is what lets two rows be resolved to one corporate family. Where it is
 * missing, a group holding several blocks under differently-named vehicles is
 * indistinguishable from several unrelated single-block winners. The missing CINs
 * are concentrated among exactly those single-block private winners, so the measured
 * HHI is a FLOOR on concentration, never a measurement of it.
 */
export function coalIdentifierCoverage(): {
  withCin: number;
  total: number;
  pct: number;
  missingAmongSingleBlockWinners: number;
} {
  const withCin = COAL_BLOCKS.filter((b) => b.winnerCin).length;
  const singleBlockNames = new Set(
    COAL_WINNERS.distribution.filter((w) => w.blocksWon === 1).map((w) => w.winnerLegalName),
  );
  return {
    withCin,
    total: COAL_BLOCKS.length,
    pct: COAL_BLOCKS.length ? (withCin / COAL_BLOCKS.length) * 100 : 0,
    missingAmongSingleBlockWinners: COAL_BLOCKS.filter(
      (b) => !b.winnerCin && b.winnerLegalName && singleBlockNames.has(b.winnerLegalName),
    ).length,
  };
}

// ---------------------------------------------------------------------------
// Non-coal minerals
// ---------------------------------------------------------------------------

export interface MineralBlock {
  id: string;
  register: string;
  awardingBody: string | null;
  blockName: string;
  state: string;
  mineral: string;
  concessionType: string | null;
  areaAsPrinted: string | null;
  reserveEstimateAsPrinted: string | null;
  nitDate: string | null;
  auctionDate: string | null;
  reservePricePctOfValueDispatched: number | null;
  winningPremiumPctOfValueDispatched: number | null;
  quotesReceived: number | null;
  winnerAsPrinted: string | null;
  tier: 'documented' | 'reported' | 'alleged' | 'analytic';
  srcs: ResourceSource[];
}

export interface MineralTranche {
  tranche: number;
  romanNumeral: string | null;
  launchDate: string | null;
  blocksOffered: number | null;
  blocksSuccessfullyAuctioned: number | null;
  blocksAnnulled: number | null;
  resultDate: string | null;
  states: string[] | null;
  minerals: string[] | null;
  note?: string;
  srcs: ResourceSource[];
}

const minerals = mineralsRaw as unknown as {
  asOf: string;
  scope: string;
  title: string;
  sources: ResourceSource[];
  regime: { id?: string; claim: string; tier: string; note?: string; srcs: ResourceSource[] }[];
  tranches: MineralTranche[];
  totals: { id: string; claim: string; value: number | null; unit: string; asOf: string; note?: string; scope?: string; tier: string; srcs: ResourceSource[] }[];
  blocks: MineralBlock[];
  denominators: {
    note: string;
    criticalMineralAuction: {
      blockOfferings: number;
      uniqueBlocksOffered: number;
      blocksSuccessfullyAuctioned: number;
      blocksAnnulled: number;
      unreconciled: number;
      windowCovered: string;
      asOf: string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  baseRates: CoalBaseRate[];
  portalAsymmetry: {
    body: string;
    url: string;
    reachable: boolean;
    format: string;
    publishesResults: boolean;
    fieldsCarried?: string[];
    note?: string;
  }[];
  gaps: string[];
  rejected: { candidate: string; reason: string }[];
};

export const MINERALS = minerals;
export const MINERAL_BLOCKS = minerals.blocks;
export const MINERAL_TRANCHES = minerals.tranches;
export const MINERALS_AS_OF = minerals.asOf;
export const CRITICAL_MINERALS = minerals.denominators.criticalMineralAuction;

/**
 * Critical-mineral annulment rate.
 *
 * The register's headline, and the reason it needs to be stated with its denominator
 * attached: the file records that THREE different denominators are in circulation for
 * this one programme, giving answers 18 percentage points apart, and that the ministry
 * publishes the most flattering of them. Offerings (a block offered in three tranches
 * counts three times) is the honest denominator for "did this tranche sell", because
 * a block re-offered twice and annulled twice failed twice.
 */
export function mineralAnnulment(): {
  offerings: number;
  uniqueBlocks: number;
  auctioned: number;
  annulled: number;
  annulmentRateOnOfferings: number;
  annulmentRateOnUnique: number;
  window: string;
  asOf: string;
} {
  const c = CRITICAL_MINERALS;
  return {
    offerings: c.blockOfferings,
    uniqueBlocks: c.uniqueBlocksOffered,
    auctioned: c.blocksSuccessfullyAuctioned,
    annulled: c.blocksAnnulled,
    annulmentRateOnOfferings: c.blockOfferings ? (c.blocksAnnulled / c.blockOfferings) * 100 : 0,
    annulmentRateOnUnique: c.uniqueBlocksOffered
      ? (c.blocksAnnulled / c.uniqueBlocksOffered) * 100
      : 0,
    window: c.windowCovered,
    asOf: c.asOf,
  };
}

export function mineralsByState(): { state: string; code: StateCode | null; blocks: number; minerals: number }[] {
  const m = new Map<string, { blocks: number; minerals: Set<string> }>();
  for (const b of MINERAL_BLOCKS) {
    const e = m.get(b.state) ?? { blocks: 0, minerals: new Set<string>() };
    e.blocks++;
    if (b.mineral) e.minerals.add(b.mineral);
    m.set(b.state, e);
  }
  return [...m.entries()]
    .map(([state, v]) => ({
      state,
      code: STATE_CODE_BY_NAME[state] ?? null,
      blocks: v.blocks,
      minerals: v.minerals.size,
    }))
    .sort((a, b) => b.blocks - a.blocks || a.state.localeCompare(b.state));
}

/** Quote-count coverage — the mineral register's version of the bidder-count hole. */
export function mineralQuoteCoverage(): { withQuotes: number; total: number; mean: number | null } {
  const withQ = MINERAL_BLOCKS.filter((b) => b.quotesReceived != null);
  return {
    withQuotes: withQ.length,
    total: MINERAL_BLOCKS.length,
    mean: withQ.length
      ? withQ.reduce((s, b) => s + (b.quotesReceived ?? 0), 0) / withQ.length
      : null,
  };
}

// ---------------------------------------------------------------------------
// Hydrocarbons
// ---------------------------------------------------------------------------

export interface HydrocarbonRound {
  round: string;
  regime: string;
  launchYear: number | null;
  signingYear: number | null;
  blocksOffered: number | null;
  blocksAwarded: number | null;
  bidsReceived: number | null;
  biddersParticipating: number | null;
  singleBidBlocks: number | null;
  singleBidSharePct: number | null;
  areaAwardedSqKm: number | null;
  tier: string;
  notes?: string;
  srcs: ResourceSource[];
}

export interface HydrocarbonBlock {
  id: string;
  round: string;
  blockId: string;
  basin: string | null;
  terrain: string | null;
  areaSqKm: number | null;
  awardee: string | null;
  awardDate: string | null;
  bidsReceived: number | null;
  singleBid: boolean | null;
  tier: 'documented' | 'reported' | 'alleged' | 'analytic';
  srcs: ResourceSource[];
  notes?: string;
}

const hydro = hydrocarbonsRaw as unknown as {
  asOf: string;
  scope: string;
  /** States the file's central statistic AND its coverage limit, before anything else. */
  readThisFirst: string;
  sources: ResourceSource[];
  regimes: { id?: string; claim: string; tier: string; note?: string; srcs: ResourceSource[] }[];
  rounds: HydrocarbonRound[];
  blocks: HydrocarbonBlock[];
  kgD6: { claim: string; finding?: string; tier: string; srcs: ResourceSource[] }[];
  denominators: Record<string, { value: number; note?: string; srcs: unknown }>;
  baseRates: CoalBaseRate[];
  gaps: string[];
  rejected: { candidate: string; reason: string }[];
};

export const HYDROCARBONS = hydro;
export const HC_ROUNDS = hydro.rounds;
export const HC_BLOCKS = hydro.blocks;
export const HC_AS_OF = hydro.asOf;

/**
 * Single-bid share per round, for the rounds that published a block-by-block bid table.
 *
 * Only four OALP rounds have one. Computing a rate across all rounds would silently
 * treat "bid count unpublished" as "more than one bid", which is the assumption most
 * favourable to a competitive reading and the one the data cannot support.
 */
export function hydrocarbonSingleBid(): {
  rounds: { round: string; awarded: number; single: number; pct: number; year: number | null }[];
  covered: number;
  totalRounds: number;
  blocksWithoutBidCount: number;
  totalBlocks: number;
} {
  const rounds = HC_ROUNDS.filter(
    (r): r is HydrocarbonRound & { blocksAwarded: number; singleBidBlocks: number } =>
      r.singleBidBlocks != null && r.blocksAwarded != null && r.blocksAwarded > 0,
  ).map((r) => ({
    round: r.round,
    awarded: r.blocksAwarded,
    single: r.singleBidBlocks,
    pct: (r.singleBidBlocks / r.blocksAwarded) * 100,
    year: r.signingYear ?? r.launchYear,
  }));
  return {
    rounds,
    covered: rounds.length,
    totalRounds: HC_ROUNDS.length,
    blocksWithoutBidCount: HC_BLOCKS.filter((b) => b.bidsReceived == null).length,
    totalBlocks: HC_BLOCKS.length,
  };
}

/** Offered vs awarded across every round that publishes both. */
export function hydrocarbonTakeRate(): {
  rounds: { round: string; regime: string; offered: number; awarded: number }[];
  offered: number;
  awarded: number;
  ratePct: number | null;
} {
  const rounds = HC_ROUNDS.filter(
    (r): r is HydrocarbonRound & { blocksOffered: number; blocksAwarded: number } =>
      r.blocksOffered != null && r.blocksAwarded != null,
  ).map((r) => ({
    round: r.round,
    regime: r.regime,
    offered: r.blocksOffered,
    awarded: r.blocksAwarded,
  }));
  const offered = rounds.reduce((s, r) => s + r.offered, 0);
  const awarded = rounds.reduce((s, r) => s + r.awarded, 0);
  return { rounds, offered, awarded, ratePct: offered ? (awarded / offered) * 100 : null };
}

// ---------------------------------------------------------------------------
// Spectrum
// ---------------------------------------------------------------------------

export interface SpectrumAuction {
  id: string;
  name: string;
  band: string | null;
  startDate: string | null;
  mhzOffered: number | null;
  mhzSold: number | null;
  shareSoldPct: number | null;
  unsoldSharePct: number | null;
  reservePriceTotalCrore: number | null;
  winningBidTotalCrore: number | null;
  applicants: number | null;
  biddersParticipating: number | null;
  distinctWinningBidders: number | null;
  tier: string;
  notes?: string;
  disagreements?: unknown;
}

export interface TwoGFact {
  id: string;
  sequence: number;
  claim: string;
  whatHappened: string;
  exactWording?: string;
  tier: 'documented' | 'reported' | 'alleged' | 'analytic';
  tierBasis?: string;
  internalDisagreement?: string;
  notes?: string;
  srcs?: unknown;
}

const spectrum = spectrumRaw as unknown as {
  asOf: string;
  scope: string;
  /** States the file's central statistic and its coverage limit before anything else. */
  readThisFirst: string;
  sources: ResourceSource[];
  auctions: SpectrumAuction[];
  unsoldShareSeries: {
    definition: string;
    series: { auction: string; date: string | null; mhzOffered: number | null; mhzSold: number | null; soldSharePct: number | null; unsoldSharePct: number | null; tier: string; denominatorSource?: string }[];
    /** Mandatory and ships with the number — see the page. */
    innocentReading: string;
  };
  biddersPerAuctionSeries: {
    definition: string;
    series: { auction: string; applicants: number | null; biddersParticipating: number | null; distinctWinners: number | null; tier: string; src?: string }[];
  };
  twoGRecord: TwoGFact[];
  denominators: Record<string, unknown>;
  baseRates: CoalBaseRate[];
  gaps: string[];
  rejected: { candidate: string; reason: string }[];
};

export const SPECTRUM = spectrum;
export const SPECTRUM_AUCTIONS = spectrum.auctions;
export const SPECTRUM_AS_OF = spectrum.asOf;
export const TWO_G = spectrum.twoGRecord;

/**
 * The unsold-share series, with the one auction that is not comparable flagged
 * rather than silently plotted.
 *
 * The 2022 auction offered 72,098 MHz, of which roughly 87% was 26 GHz millimetre
 * wave — a band with vastly more spectrum available and vastly less demand per MHz
 * than the sub-3 GHz bands every earlier auction sold. Plotting its 71% sold share
 * on the same axis as 2016's 41% compares two different things and flatters 2022.
 * Strip the mmWave and its sub-3 GHz share is 27.96%, worse than 2016.
 */
export function spectrumUnsoldSeries(): {
  year: number;
  auction: string;
  soldSharePct: number | null;
  comparable: boolean;
  note?: string;
}[] {
  return spectrum.unsoldShareSeries.series
    .map((s) => {
      const year = Number((s.date ?? s.auction).slice(0, 4));
      // CORRECTED 2026-08-12. This originally excluded only 2022. The desk showed
      // 2024 has the SAME defect and worse: 26 GHz was 82.68% of its offered MHz and
      // 2.84% of its reserve valuation, and with 3300 MHz the two bands are 93.23%
      // of the denominator — both sold in bulk 22 months earlier, in 2022. A ratio
      // whose denominator is 93% of the previous auction's residue measures what was
      // left over, not what the market wanted. Excluding one and plotting the other
      // was inconsistent, and it flattered the very reading the caption warned about.
      const comparable = !s.auction.includes('2022') && !s.auction.includes('2024');
      return {
        year,
        auction: s.auction,
        soldSharePct: s.soldSharePct,
        comparable,
        note: comparable
          ? undefined
          : s.auction.includes('2022')
            ? 'Roughly 87% of what was offered was 26 GHz mmWave. Not comparable with the sub-3 GHz auctions before it; on a band-comparable basis the figure is 27.96%.'
            : '26 GHz was 82.68% of the offered MHz and 2.84% of the reserve valuation; with 3300 MHz the two are 93.23% of the denominator, and both had been sold in bulk 22 months earlier. The 1.34% headline measures leftovers. On a band-comparable basis the figure is 19.85%.',
      };
    })
    .sort((a, b) => a.year - b.year);
}

/**
 * Flatten one 2G record into renderable key/value detail.
 *
 * The six records are deliberately NOT uniform: an account of an allocation process,
 * an audit estimate with four bases, a Supreme Court order and a criminal acquittal
 * have genuinely different shapes, and the researcher recorded each in the shape its
 * own document has. Forcing them through one template either drops most of the
 * content or crashes on the field that happens to be an object — which is what a
 * first attempt at this page did.
 *
 * So the renderer takes the record's own scalar leaves, in the order they were
 * written, and shows them. Heterogeneity is the data being honest about its subject.
 */
const TWO_G_SKIP = new Set(['id', 'sequence', 'claim', 'tier', 'tierBasis', 'srcs', 'notes']);

export function twoGDetail(rec: Record<string, unknown>, maxDepth = 2): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  const label = (k: string) =>
    k.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

  const walk = (obj: Record<string, unknown>, depth: number, prefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      if (depth === 0 && TWO_G_SKIP.has(k)) continue;
      if (v == null) continue;
      const key = prefix ? `${prefix} · ${label(k)}` : label(k);
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out.push({ key, value: String(v) });
      } else if (Array.isArray(v)) {
        const scalars = v.filter((x) => typeof x === 'string' || typeof x === 'number');
        if (scalars.length) out.push({ key, value: scalars.join(' · ') });
        else if (depth < maxDepth) {
          v.forEach((x, i) => {
            if (x && typeof x === 'object') walk(x as Record<string, unknown>, depth + 1, `${key} ${i + 1}`);
          });
        }
      } else if (typeof v === 'object' && depth < maxDepth) {
        walk(v as Record<string, unknown>, depth + 1, key);
      }
    }
  };
  walk(rec, 0);
  return out;
}

/**
 * The band-comparable series — what the unsold share looks like once the bands that
 * are not comparable across auctions are taken out.
 *
 * This is the series the platform should have plotted from the start. The raw
 * share-sold figure is dominated by whichever high-bandwidth band happened to be on
 * offer, so 2022 looks strong (71%) and 2024 looks catastrophic (1.34%) for the same
 * reason: millimetre wave. On like-for-like bands the trend is a steady decline and
 * far less dramatic than either headline.
 */
export const SPECTRUM_BAND_COMPARABLE: { year: number; pct: number }[] = [
  { year: 2016, pct: 40.97 },
  { year: 2021, pct: 37.06 },
  { year: 2022, pct: 27.96 },
  { year: 2024, pct: 19.85 },
];

/** Operators bidding per auction. Bidders per LOT is published nowhere, ever. */
export function spectrumBidders(): { year: number; auction: string; bidders: number | null; winners: number | null }[] {
  return spectrum.biddersPerAuctionSeries.series
    .map((s) => {
      const a = spectrum.auctions.find((x) => x.name === s.auction || x.id.includes(String(s.auction).slice(0, 4)));
      return {
        year: Number((a?.startDate ?? s.auction).slice(0, 4)),
        auction: s.auction,
        bidders: s.biddersParticipating ?? s.applicants,
        winners: s.distinctWinners,
      };
    })
    .sort((a, b) => a.year - b.year);
}

// ---------------------------------------------------------------------------
// The cross-register spine
// ---------------------------------------------------------------------------

export interface RegisterTension {
  register: string;
  route: string;
  unit: string;
  /** Mean bidders per lot, or null where the register does not publish bid counts. */
  biddersPerLot: number | null;
  biddersNote: string;
  offered: number | null;
  taken: number | null;
  asOf: string;
  note: string;
}

/**
 * The same two questions, asked identically of every register: how many bidders
 * showed up per lot, and how much of what was offered found a buyer.
 *
 * Everything here is derived. `null` means the register does not publish the figure,
 * which is a different fact from zero and renders differently — the coal register
 * publishes reserve price, final offer and winner for every mine and the bid count
 * for none, and that hole is a finding about the disclosure regime rather than a hole
 * in our own coverage.
 */
export function registerTension(): RegisterTension[] {
  const coalTake = coalTakeRate();
  const mineral = mineralAnnulment();
  const hcTake = hydrocarbonTakeRate();
  const hcSingle = hydrocarbonSingleBid();
  const mineralQuotes = mineralQuoteCoverage();

  return [
    {
      register: 'Coal blocks',
      route: '/resources?register=coal',
      unit: 'block',
      // CORRECTED 2026-08-12. This previously read "0 of 133 rows carry a bid count —
      // the Ministry of Coal ... never [publishes] the number of bids". That was true
      // of the Nominated Authority's result sheets, which is what the register was
      // built from, and FALSE as a statement about the ministry. Its PIB bid-opening
      // releases carry a table headed "Mine-wise list of bids received", and five of
      // them yield 65 mine-level bid counts across rounds 9 to 12.
      biddersPerLot: COAL_PIB_BIDS.meanBids,
      biddersNote: `not in the ${COAL_BLOCKS.length} Nominated Authority rows, but ${COAL_PIB_BIDS.observations} mine-level counts are published in PIB bid-opening releases for rounds 9–12`,
      offered: coalTake.offered || null,
      taken: coalTake.auctioned || null,
      asOf: COAL_AS_OF,
      note:
        coalTake.roundsWithoutOffered > 0
          ? `Offered count recoverable for ${coalTake.rounds.length} of ${coalTake.rounds.length + coalTake.roundsWithoutOffered} rounds only`
          : 'All rounds',
    },
    {
      register: 'Critical mineral blocks',
      route: '/resources?register=minerals',
      unit: 'block offering',
      biddersPerLot: mineralQuotes.mean,
      biddersNote: `quotes recorded for ${mineralQuotes.withQuotes} of ${mineralQuotes.total} block records`,
      offered: mineral.offerings,
      taken: mineral.auctioned,
      asOf: mineral.asOf,
      note: `${mineral.annulled} annulled — ${mineral.annulmentRateOnOfferings.toFixed(0)}% of offerings`,
    },
    {
      register: 'Hydrocarbon blocks',
      route: '/resources?register=hydrocarbons',
      unit: 'block',
      biddersPerLot: null,
      biddersNote: `bid count published for ${hcSingle.totalBlocks - hcSingle.blocksWithoutBidCount} of ${hcSingle.totalBlocks} awarded blocks; four rounds carry a block-by-block table`,
      offered: hcTake.offered,
      taken: hcTake.awarded,
      asOf: HC_AS_OF,
      note: `single-bid share rose from ${hcSingle.rounds[0]?.pct.toFixed(1)}% to ${Math.max(...hcSingle.rounds.map((r) => r.pct)).toFixed(1)}% across the covered rounds`,
    },
    (() => {
      // Spectrum's lot is a MHz block, so offered/taken is in MHz. Only the auctions
      // publishing BOTH an offered and a sold quantity can contribute — five of ten
      // publish a share without an offered quantum, and those cannot be recomputed.
      const withBoth = SPECTRUM_AUCTIONS.filter(
        (a) => a.mhzOffered != null && a.mhzSold != null && !a.id.includes('2022'),
      );
      const offered = withBoth.reduce((s, a) => s + (a.mhzOffered ?? 0), 0);
      const sold = withBoth.reduce((s, a) => s + (a.mhzSold ?? 0), 0);
      const bidders = SPECTRUM_AUCTIONS.map((a) => a.biddersParticipating).filter(
        (v): v is number => v != null,
      );
      return {
        register: 'Spectrum',
        route: '/resources?register=spectrum',
        unit: 'auction',
        // Operators per AUCTION, not per lot — bidders per lot is published nowhere,
        // for any auction, ever. The unit difference is stated rather than hidden.
        biddersPerLot: bidders.length
          ? Number((bidders.reduce((a, b) => a + b, 0) / bidders.length).toFixed(1))
          : null,
        biddersNote: `operators per auction for ${bidders.length} of ${SPECTRUM_AUCTIONS.length} auctions — bidders per LOT is published nowhere, for any auction`,
        offered: Math.round(offered),
        taken: Math.round(sold),
        asOf: SPECTRUM_AS_OF,
        note: `MHz across ${withBoth.length} auctions publishing both quantities; 2022 excluded as ~87% mmWave and not comparable`,
      };
    })(),
  ];
}

/** Revenue-share coverage — the only published proxy for what a block fetched. */
export function coalRevenueShareCoverage(): {
  withOffer: number;
  total: number;
  min: number | null;
  max: number | null;
  median: number | null;
} {
  const vals = COAL_BLOCKS.map((b) => b.revenueSharePctFinalOffer).filter(
    (v): v is number => v != null,
  );
  const sorted = [...vals].sort((a, b) => a - b);
  return {
    withOffer: vals.length,
    total: COAL_BLOCKS.length,
    min: sorted[0] ?? null,
    max: sorted[sorted.length - 1] ?? null,
    median: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
  };
}
