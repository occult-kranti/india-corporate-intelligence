import {
  COAL_BLOCKS, COAL_HEADLINE, COAL_WINNERS, COAL_TRANCHES,
  coalIdentifierCoverage, coalTakeRate,
  MINERAL_BLOCKS, mineralAnnulment, mineralQuoteCoverage,
  hydrocarbonSingleBid, COAL_PIB_BIDS,
} from './resources';
import { ALL_AWARDS, competitionEvidence, disclosureBySector } from './tenders';
import { pooled as procurementPooled } from './procurement';

/**
 * Capture pathways — the adversarial half of the method.
 *
 * WHAT THIS IS. Standard fraud-risk assessment, the technique every procurement
 * auditor uses: assume someone wants to capture the process, enumerate how they
 * would do it, work out what trace each method would leave in published records,
 * then go and look for that trace. Publish the answer either way.
 *
 * WHY IT IS THE RIGOROUS VERSION AND NOT THE PARANOID ONE. A hypothesis generated
 * this way comes with its own falsifier attached. "Someone rigged this" is
 * unfalsifiable; "if someone rigged it this way, the bid count would be 1, and here
 * is the bid count" is a test that can come back negative — and mostly does. The
 * pattern-prospecting skill calls this adversarial generation: a claim that survives
 * a test it could not have failed has established nothing.
 *
 * WHAT IT IS NOT. It is not an accusation, and it names no individual. A signature
 * being present says a mechanism is CONSISTENT with the record, never that it
 * happened — most signatures have an innocent generating process that fits equally
 * well, and that reading ships alongside every verdict here at the same prominence.
 *
 * The most useful column turns out to be `untestable`. A pathway nobody can check
 * against published data is a hole in the disclosure regime, and naming those holes
 * precisely is worth more than any single finding.
 */

export type Verdict =
  /** The trace this mechanism would leave is present in the record. Not proof it occurred. */
  | 'signature-present'
  /** Looked for it where the data can show it; it is not there. */
  | 'signature-absent'
  /** The published record cannot answer the question either way. */
  | 'untestable'
  /** Partially visible — present in one register, invisible in another. */
  | 'mixed';

export interface CapturePathway {
  id: string;
  name: string;
  /** How the mechanism would work, stated plainly. */
  mechanism: string;
  /** What it would leave behind in published records. This is what makes it a test. */
  signature: string;
  verdict: Verdict;
  /** What the data actually shows. Derived from the registers, never asserted. */
  evidence: string;
  /** The boring explanation that fits the same evidence. Ships at equal prominence. */
  innocentReading: string;
  /** The specific document or dataset that would settle it. */
  whatWouldSettleIt: string;
  registers: string[];
}

/**
 * Every figure below is computed from the registers at module scope, so a pathway's
 * verdict cannot drift from the data it was drawn on. If a register gains a bidder
 * count tomorrow, the verdict changes with it.
 */
export function capturePathways(): CapturePathway[] {
  const coalIds = coalIdentifierCoverage();
  const coalTake = coalTakeRate();
  const singleBid = hydrocarbonSingleBid();
  const annul = mineralAnnulment();
  const quotes = mineralQuoteCoverage();
  const awards = competitionEvidence(ALL_AWARDS);
  const proc = procurementPooled();
  const disclosure = disclosureBySector(ALL_AWARDS);
  const coalNoBids = COAL_BLOCKS.filter((b) => b.revenueSharePctFinalOffer == null).length;
  const zeroDisclosureSectors = disclosure.filter((d) => d.total >= 3 && d.soleKnown === 0);
  const maxSingle = singleBid.rounds.length
    ? singleBid.rounds.reduce((a, b) => (b.pct > a.pct ? b : a))
    : null;
  const minSingle = singleBid.rounds.length
    ? singleBid.rounds.reduce((a, b) => (b.pct < a.pct ? b : a))
    : null;
  const revenueShares = COAL_BLOCKS.map((b) => b.revenueSharePctFinalOffer).filter(
    (v): v is number => v != null,
  );
  const maxShare = revenueShares.length ? Math.max(...revenueShares) : null;
  const roundsNoOffered = COAL_TRANCHES.filter((t) => t.minesOffered == null).length;

  return [
    {
      id: 'suppress-competition',
      name: 'Suppress competition — arrange for one bidder',
      mechanism:
        'Discourage or disqualify rivals so the lot clears at or near the reserve price. The cheapest form of capture, because it requires no falsified document — only that nobody else turns up.',
      signature:
        'A bid count of one, or a winning offer sitting at the reserve floor. Both are published in a competent disclosure regime.',
      verdict: 'mixed',
      evidence:
        `There is now a base rate to test against, which there was not before. Across ` +
        `${proc.contested.toLocaleString('en-IN')} contested state public-works tenders in the only two Indian ` +
        `jurisdictions that publish bid counts, ${proc.pct.toFixed(1)}% drew exactly one bidder — and the two states ` +
        `disagree with each other by a factor of nearly five, so the range matters more than the midpoint. ` +
        `Against that, hydrocarbons is stark: single-bid share runs from ${minSingle?.pct.toFixed(1)}% in ` +
        `${minSingle?.round} to ${maxSingle?.pct.toFixed(1)}% in ${maxSingle?.round}. ` +
        `Coal CAN now be tested, which a previous version of this page denied. The Nominated Authority's result ` +
        `sheets carry no bid count, but the ministry's PIB bid-opening releases do: ${COAL_PIB_BIDS.observations} mine-level ` +
        `counts across rounds 9–12, of which ${COAL_PIB_BIDS.singleBidMines} drew exactly one bid (${COAL_PIB_BIDS.singleBidSharePct}%, mean ${COAL_PIB_BIDS.meanBids}). ` +
        `That denominator counts only mines that attracted a bidder, so it is not comparable with the state public-works rates. ` +
        `In the awards register, bid position is recoverable for ${awards.soleKnown} of ${awards.total} awards and ` +
        `${awards.soleCount} of those ${awards.soleKnown} were sole-bidder. ` +
        `The value-gradient test — does single-bidding rise with contract size — comes back NEGATIVE in ` +
        `Himachal Pradesh, whose highest value band contains zero single-bidder tenders.`,
      innocentReading:
        'A block nobody bids for is usually a block nobody wants. Deep-water acreage, unexplored basins, coal with no evacuation infrastructure and mineral blocks with outstanding forest clearances all attract one bidder or none for reasons entirely internal to the asset. A rising single-bid share is equally consistent with a shrinking pool of firms willing to carry exploration risk.',
      whatWouldSettleIt:
        'Bid counts in the RESULT document rather than only in a press release, and for every round rather than rounds 9 to 12. The Ministry of Coal already publishes a mine-wise bid table in its bid-opening releases — the practice exists and was simply not carried into the Nominated Authority result series or into the most recent round. Making it routine would close the gap at no cost.',
      registers: ['hydrocarbons', 'coal', 'awards'],
    },
    {
      id: 'shell-layering',
      name: 'Layer through shells — take many lots and look like many winners',
      mechanism:
        'Bid through separately-named vehicles under common control. The published winner list then shows a long tail of single-lot winners, and every concentration measure computed from it understates the truth.',
      signature:
        'Winners that share directors, registered addresses, or a corporate parent, while appearing in the register as unrelated names. Resolvable the moment a CIN is published against each winner.',
      verdict: 'untestable',
      evidence:
        `This is the sharpest hole in the coal register. ${coalIds.total - coalIds.withCin} of ${coalIds.total} rows carry no CIN, ` +
        `and the missing identifiers sit almost entirely among the ${COAL_HEADLINE.singleBlockWinners} single-block winners — ` +
        `exactly the population where layering would hide. The measured HHI of ${COAL_HEADLINE.herfindahlHirschmanIndexOnBlockShare} ` +
        `and the top-5 share of ${COAL_HEADLINE.top5BlocksPct}% are therefore FLOORS on concentration, not measurements of it. ` +
        `The register can neither show this pathway nor rule it out.`,
      innocentReading:
        'India has a large and genuinely fragmented mining sector, and a long tail of small independent winners is what a competitive auction of marginal assets is supposed to produce. Absent CINs are far more likely to reflect a ministry publishing a name column and not an identifier column than anything about the winners.',
      whatWouldSettleIt:
        'A CIN against every winner in the tranche-wise file, cross-matched to the MCA director index. This is a one-column change to an existing published document and it would make the entire concentration question answerable.',
      registers: ['coal'],
    },
    {
      id: 'tailored-eligibility',
      name: 'Write the qualification criteria around one firm',
      mechanism:
        'Set net-worth, prior-experience or technical thresholds that only the intended winner clears. The auction is then genuinely competitive among a field of one, and every published number looks clean.',
      signature:
        'Eligibility clauses that move between tranches, or thresholds with no engineering rationale. Visible only in the tender document, never in the result.',
      verdict: 'untestable',
      evidence:
        'No register on this platform holds tender eligibility clauses. Results tables carry the winner, the price and the date; the qualification criteria live in the Notice Inviting Tender and the tender document, which are published as separate PDFs and are not in any dataset here. This pathway is invisible to everything built so far, and it would be dishonest to report the absence of evidence as evidence of absence.',
      innocentReading:
        'Qualification thresholds exist for a real reason. A bidder who cannot finance a mine will not develop it, and every regime that dropped its thresholds has ended up with allottees who never produced. Restrictive criteria and prudent criteria look identical from the outside.',
      whatWouldSettleIt:
        'Ingesting the NIT and tender documents per tranche and diffing the eligibility clauses across rounds. That is a bounded, entirely feasible piece of work and it is the highest-value unbuilt dataset on this platform.',
      registers: ['coal', 'minerals', 'awards'],
    },
    {
      id: 'annul-and-reoffer',
      name: 'Annul, then re-offer to a softer field',
      mechanism:
        'Cancel a round on a technicality, then re-offer the same lot when the inconvenient bidder is gone. Each individual step is defensible; the sequence is the mechanism.',
      signature:
        'A lot annulled and later awarded to a different party at a LOWER premium. The direction of the price change is what separates this from ordinary re-tendering.',
      verdict: 'signature-absent',
      evidence:
        `The critical-mineral programme annulled ${annul.annulled} of ${annul.offerings} offerings — a ${annul.annulmentRateOnOfferings.toFixed(0)}% rate — ` +
        `which is where this pathway would live. But the one re-auction traceable end to end in the coal register runs the wrong way for it: ` +
        `Dahegaon/Makardhokra-IV was won at 5.50% revenue share, never vested, and was re-auctioned at 10.50% — the state received MORE, not less. ` +
        `One case is not a base rate, and the mineral annulments are not yet linked block-to-block across tranches.`,
      innocentReading:
        'Annulment is the correct response to a round that fails its own rules, and a 54% annulment rate in a brand-new critical-minerals market is exactly what an immature market with thin exploration data looks like. Re-offering an unsold block is not a favour to anyone; it is the only alternative to leaving it in the ground.',
      whatWouldSettleIt:
        'Linking annulled mineral blocks across tranches by block name, and comparing the winning premium on the successful attempt against the annulled one. The data to do this is already in the register and the linkage is the unbuilt part.',
      registers: ['minerals', 'coal'],
    },
    {
      id: 'selective-non-publication',
      name: 'Stop publishing the round you would rather not explain',
      mechanism:
        'Keep the disclosure regime intact for routine rounds and quietly skip the one with an awkward result. Nothing is falsified; a document simply never appears.',
      signature:
        'A break in an otherwise regular publication series — every comparable round announced, one not.',
      verdict: 'signature-absent',
      evidence:
        'KILLED BY THE DESK on the identity test, 2026-08-12. This page previously reported the signature as present. Three of its four limbs do not survive. "No PIB release" is false — two exist for the 14th round, the launch on 29 October 2025 and the bid opening on 23 December 2025; what is absent is specifically a RESULT release. The ministry did publish the outcome itself, on page 4 of its 21 May 2026 pre-bid presentation. And "five months later on MSTC" has no source, because the forward-auction date was never established. What remains is narrower and stays open: no block-wise result table exists anywhere for a round in which 24 blocks drew 49 bids from 11 companies.',
      innocentReading:
        'A five-block round is small, the outcome did reach the public record through the ministry\'s own presentation, and press releases are a courtesy rather than an obligation. Administrative drift across a holiday period explains a missing press note at least as well as anything else — and the base rate does not help the suspicious reading either way, since the Nominated Authority\'s result-notice series stops after tranche 12 and round 13 has no notice either, while having a next-day PIB release.',
      whatWouldSettleIt:
        'A block-wise result table for the 14th round, which exists nowhere. The wider lesson survives the kill: no single series — not PIB, not the Nominated Authority register, not MSTC — is a complete record of auction outcomes, and any claim of the form "X was never published" has to be tested against all three before it means anything.',
      registers: ['coal'],
    },
    {
      id: 'award-without-transfer',
      name: 'Declare a winner who never has to perform',
      mechanism:
        'Award a lot at a headline-friendly price to a party that never completes vesting. The announcement counts toward a published total; the obligation never attaches.',
      signature:
        'Winners declared in a result notice and absent from the vesting register, with the gap unexplained.',
      verdict: 'signature-present',
      evidence:
        `Seven coal winners declared in result notices do not appear in the vesting register — including the highest bid of the 11th round, at 90.25% revenue share. ` +
        `The registers themselves disagree on totals: the ministry's summary states 140 mines auctioned while the tranche-wise vesting file lists ` +
        `${COAL_HEADLINE.commercialBlocksWithVestingOrAllocationOrders}, and two ministry presentations eight months apart disagree on three separate tranche counts.`,
      innocentReading:
        'Vesting follows payment of the upfront amount, the fixed amount and the performance security. A bidder who wins at an unsustainable price and then walks away is a bidder the process correctly filtered out — the forfeiture is the system working, not failing. An aggressive bid that is never honoured costs the exchequer nothing.',
      whatWouldSettleIt:
        'A published reconciliation between the result notices and the vesting register, naming why each declared winner did not vest and what happened to the security. The ministry holds this; it is not published.',
      registers: ['coal'],
    },
    {
      id: 'disclosure-asymmetry',
      name: 'Let the disclosure regime vary by who is doing the disclosing',
      mechanism:
        'Not a scheme so much as a standing condition: where an awarding body chooses its own publication standard, the ones with least to show publish least, and no comparison is possible.',
      signature:
        'Publication practice that varies systematically by sector or state rather than by rule.',
      verdict: 'signature-present',
      evidence:
        `Bid-position disclosure in the awards register is not random across sectors. It tracks whether a regulator publishes a round-result document: ` +
        `${zeroDisclosureSectors.map((d) => `${d.sector} (${d.total} awards, ${d.soleKnown} disclosed)`).join('; ')}. ` +
        `Spectrum, airports and renewables manufacturing disclose bid position for every award recorded. ` +
        `In minerals, quotes are recorded for ${quotes.withQuotes} of ${quotes.total} block records, and state portals range from machine-readable HTML result tables to nothing at all. ` +
        `In coal, offered counts survive for only ${coalTake.rounds.length} of ${coalTake.rounds.length + roundsNoOffered} rounds, and final offers for ${COAL_BLOCKS.length - coalNoBids} of ${COAL_BLOCKS.length} blocks — though the ministry does publish mine-wise bid counts in its bid-opening releases for rounds 9–12, which makes it the MOST forthcoming of the four authorities here rather than the least. The one publishing nothing is Mines.`,
      innocentReading:
        'Disclosure practice follows institutional history and the resourcing of the publishing body, not intent. A sectoral regulator with a statutory duty to publish round results does so; a ministry directorate without one publishes what its template contains. Nothing about the pattern requires a decision to conceal.',
      whatWouldSettleIt:
        'A uniform minimum result schema across every awarding body — lot, reserve, bids received, winning offer, winner CIN, date. Every field in it is already published by at least one Indian awarding body today.',
      registers: ['awards', 'minerals', 'coal'],
    },
    {
      id: 'underpriced-reserve',
      name: 'Set the reserve low enough that the lot is a gift',
      mechanism:
        'Price the floor below the asset and let a thin field clear it there. Works only when competition is also weak — the two pathways have to be run together.',
      signature:
        'Winning offers clustered at the reserve floor, in a register whose upper tail shows the floor is far below clearing value.',
      verdict: 'signature-absent',
      evidence:
        `The coal reserve price is a 4% revenue-share floor, and the published final offers reach ${maxShare}% — the spread itself shows the floor sits far below what a contested block fetches. ` +
        `But offers clustered AT the floor are the signature, and they are not what the distribution shows: final offers are published for ` +
        `${COAL_BLOCKS.length - coalNoBids} of ${COAL_BLOCKS.length} blocks and range across the whole span rather than piling at 4%.`,
      innocentReading:
        'A low reserve is deliberate policy, not an error. It exists to make marginal blocks biddable at all, and a wide spread between floor and clearing price is what a functioning auction over heterogeneous assets produces. A high winning premium is evidence FOR competition, not against it.',
      whatWouldSettleIt:
        'Final offers published for every block rather than for a subset of rounds, so the shape of the distribution near the floor can be seen rather than inferred.',
      registers: ['coal'],
    },
  ];
}

export const VERDICT_META: Record<Verdict, { label: string; tone: 'rose' | 'sage' | 'amber' | 'muted'; bar: string }> = {
  'signature-present': {
    label: 'Signature present',
    tone: 'amber',
    bar: 'The trace this mechanism would leave IS in the record. That is not proof it occurred — read the innocent reading, which fits the same evidence.',
  },
  'signature-absent': {
    label: 'Signature absent',
    tone: 'sage',
    bar: 'Looked for it where the data can show it. It is not there. This is a negative result and it counts.',
  },
  untestable: {
    label: 'Cannot be tested',
    tone: 'rose',
    bar: 'The published record cannot answer this either way. The pathway is neither supported nor excluded, and the gap is itself the finding.',
  },
  mixed: {
    label: 'Visible in one register, invisible in another',
    tone: 'muted',
    bar: 'The same question is answerable where disclosure is good and unanswerable where it is not.',
  },
};

/** Verdict counts, for the summary strip. The shape of the distribution is the point. */
export function verdictTally(): { verdict: Verdict; n: number }[] {
  const p = capturePathways();
  return (Object.keys(VERDICT_META) as Verdict[]).map((v) => ({
    verdict: v,
    n: p.filter((x) => x.verdict === v).length,
  }));
}

/** Registers referenced, so the page can state its own scope honestly. */
export function captureScope(): { pathways: number; registers: string[]; lots: number } {
  const p = capturePathways();
  return {
    pathways: p.length,
    registers: [...new Set(p.flatMap((x) => x.registers))].sort(),
    lots: COAL_BLOCKS.length + MINERAL_BLOCKS.length + ALL_AWARDS.length + COAL_WINNERS.distribution.length,
  };
}
