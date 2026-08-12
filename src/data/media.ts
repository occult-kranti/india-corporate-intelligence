import raw from '../../research/raw/media.json';

/**
 * Media ownership register.
 *
 * WHAT THIS DELIBERATELY IS NOT. The brief was a Ground News-style left / centre /
 * right coverage bar per company. That was researched properly and the answer came
 * back: it cannot be built honestly for Indian outlets, and shipping it anyway would
 * be the single most misleading thing on this platform.
 *
 * The reasons are in `leanRatingAvailability` and are worth stating rather than
 * hiding behind a caveat:
 *
 *  - AllSides — the more methodologically transparent rater, with blind bias surveys
 *    and multi-partisan editorial panels — has negligible Indian coverage, and states
 *    its ratings reflect the American political spectrum. Zero outlets here carry one.
 *  - Media Bias/Fact Check does rate 21 of these 27 outlets, which is why the verdict
 *    is "partial" rather than "none". But its own methodology page says the framework
 *    "remains primarily tailored to the political landscape of the United States",
 *    70% of its score comes from axes drawn from US politics, one editor holds final
 *    authority, and it is not peer reviewed.
 *  - No outlet has two independent ratings, so nothing can be cross-checked.
 *  - Lean coverage runs inverse to reach: the largest-audience Indian-language titles
 *    are the least rated.
 *
 * So the page ships OWNERSHIP as the distribution — which is documented, verifiable
 * from filings, and the thing that actually differs between outlets — and shows any
 * MBFC rating only as attributed-to-rater with its date and methodology link. Never
 * as an unattributed "left" or "right" badge.
 */

export interface LeanRating {
  system: string;
  rating: string;
  asOf: string;
  url: string;
}

export interface Outlet {
  id: string;
  name: string;
  medium: string;
  language: string;
  launched: string | null;
  ownerEntity: string;
  ownerGroup: string;
  ownerListed: boolean;
  ownerNse: string | null;
  parentCompany: string | null;
  ownershipNotes: string | null;
  reachNote: string | null;
  leanRatings: LeanRating[];
  tier: 'documented' | 'reported' | 'alleged' | 'analytic';
  srcs: [string, string][];
}

export interface CrossHolding {
  owner: string;
  outlets: string[];
  media: string[];
  note: string;
  srcs: [string, string][];
}

export interface MediaConcentration {
  measure: string;
  value: number | null;
  denominator: string;
  denominatorLabel: string;
  note: string;
  srcs: [string, string][];
}

const media = raw as unknown as {
  asOf: string;
  sources: [string, string][];
  leanRatingAvailability: { verdict: string; summary: string; srcs?: [string, string][] };
  outlets: Outlet[];
  crossMediaHoldings: CrossHolding[];
  concentration: MediaConcentration[];
  gaps: string[];
  rejected: { claim: string; finding: string; srcs?: [string, string][] }[];
};

export const MEDIA = media;
export const OUTLETS = media.outlets;
export const MEDIA_AS_OF = media.asOf;

/** How many outlets carry a rating at all, and from how many distinct raters. */
export function ratingCoverage(): {
  rated: number;
  total: number;
  systems: string[];
  multiRated: number;
} {
  const rated = OUTLETS.filter((o) => o.leanRatings.length > 0);
  const systems = [...new Set(OUTLETS.flatMap((o) => o.leanRatings.map((r) => r.system)))].sort();
  return {
    rated: rated.length,
    total: OUTLETS.length,
    systems,
    // Zero here is the point: nothing can be cross-checked against a second rater.
    multiRated: OUTLETS.filter((o) => new Set(o.leanRatings.map((r) => r.system)).size > 1).length,
  };
}

/**
 * Ownership distribution — the bar this page actually renders.
 * Grouped by owner, so a reader sees concentration rather than a list of titles.
 */
export function byOwnerGroup(): {
  ownerGroup: string;
  outlets: Outlet[];
  media: string[];
  languages: string[];
  listed: boolean;
}[] {
  const m = new Map<string, Outlet[]>();
  for (const o of OUTLETS) {
    if (!m.has(o.ownerGroup)) m.set(o.ownerGroup, []);
    m.get(o.ownerGroup)!.push(o);
  }
  return [...m.entries()]
    .map(([ownerGroup, outlets]) => ({
      ownerGroup,
      outlets: [...outlets].sort((a, b) => a.name.localeCompare(b.name)),
      media: [...new Set(outlets.map((o) => o.medium))].sort(),
      languages: [...new Set(outlets.map((o) => o.language))].sort(),
      listed: outlets.some((o) => o.ownerListed),
    }))
    .sort((a, b) => b.outlets.length - a.outlets.length || a.ownerGroup.localeCompare(b.ownerGroup));
}

/**
 * Owners whose outlets DO NOT share a rating direction.
 *
 * This is the most useful thing the rating data can support, and it argues against
 * its own use: HT Media owns both Hindustan Times (rated Left-Center) and Mint (rated
 * Least Biased). If ownership predicted lean, that could not happen. Every such case
 * is a counter-example to the coverage bar the brief originally asked for, generated
 * from the ratings themselves.
 */
/**
 * Signed direction from an MBFC rating string, on a five-point scale.
 *
 * The rating arrives as "Right-Center (3.5); Factual Reporting: Mixed (6.3); ...",
 * so only the leading label is the direction. Longest-prefix matching matters:
 * testing "Right" before "Right-Center" would collapse the two, and Right vs
 * Right-Center is the SAME side of centre — treating that as a disagreement would
 * manufacture counter-examples that are really adjacent gradations.
 */
function leanScore(rating: string): number | null {
  const r = rating.trim().toLowerCase();
  if (r.startsWith('left-center')) return -1;
  if (r.startsWith('left')) return -2;
  if (r.startsWith('right-center')) return 1;
  if (r.startsWith('right')) return 2;
  if (r.startsWith('least')) return 0; // "Least Biased"
  return null; // Pro-Science, Questionable, Satire — not points on this axis
}

export function ownershipLeanCounterexamples(): {
  ownerGroup: string;
  outlets: { name: string; rating: string; system: string; asOf: string; url: string }[];
}[] {
  const out: { ownerGroup: string; outlets: { name: string; rating: string; system: string; asOf: string; url: string }[] }[] = [];
  for (const g of byOwnerGroup()) {
    // An absent owner group means "independent, no common owner". Pooling those and
    // reading the spread as an ownership effect would be exactly the co-location
    // error the platform refuses everywhere else.
    if (!g.ownerGroup || g.ownerGroup === 'null') continue;
    const rated = g.outlets
      .filter((o) => o.leanRatings.length > 0 && leanScore(o.leanRatings[0].rating) != null)
      .map((o) => ({
        name: o.name,
        rating: o.leanRatings[0].rating,
        system: o.leanRatings[0].system,
        asOf: o.leanRatings[0].asOf,
        url: o.leanRatings[0].url,
        score: leanScore(o.leanRatings[0].rating)!,
      }));
    if (rated.length < 2) continue;
    // A counter-example is outlets under ONE owner that do not all fall on the same
    // side of centre. Right and Right-Center agree; Left-Center and Least Biased
    // do not.
    const sides = new Set(rated.map((r) => Math.sign(r.score)));
    if (sides.size > 1) {
      out.push({
        ownerGroup: g.ownerGroup,
        outlets: rated.map(({ score: _score, ...rest }) => rest),
      });
    }
  }
  return out;
}

export function mediumTally(): { medium: string; count: number }[] {
  const m = new Map<string, number>();
  for (const o of OUTLETS) m.set(o.medium, (m.get(o.medium) ?? 0) + 1);
  return [...m.entries()]
    .map(([medium, count]) => ({ medium, count }))
    .sort((a, b) => b.count - a.count || a.medium.localeCompare(b.medium));
}

export function languageTally(): { language: string; count: number }[] {
  const m = new Map<string, number>();
  for (const o of OUTLETS) m.set(o.language, (m.get(o.language) ?? 0) + 1);
  return [...m.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count || a.language.localeCompare(b.language));
}
