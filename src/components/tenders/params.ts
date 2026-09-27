/**
 * The national section's URL state (spec §2, U2). Every filter is a search param; an
 * unknown value falls back to its default and is named in the page's one
 * unrecognised-param note. `state` is the exception by design: a value that matches no
 * emitted key is not malformed, it is a state absent from the scrape, and the section
 * says so where the filter applies (coverage, not conduct).
 */

export const PORTALS = ['all', 'central', 'state'] as const;
export const SORTS = ['awards', 'value', 'buyer'] as const;
export const ROWS = ['25', '100', 'all'] as const;
export const BUYERS = ['top25', 'all'] as const;

export type PortalFilter = (typeof PORTALS)[number];
export type SortKey = (typeof SORTS)[number];
export type RowsLimit = (typeof ROWS)[number];
export type BuyersMode = (typeof BUYERS)[number];

export interface Unrecognised {
  param: string;
  value: string;
  fallback: string;
}

export interface NationalParams {
  portal: PortalFilter;
  state: string | null;
  sort: SortKey;
  rows: RowsLimit;
  buyers: BuyersMode;
  unrecognised: Unrecognised[];
}

function pick<T extends string>(
  params: URLSearchParams,
  name: string,
  allowed: readonly T[],
  bad: Unrecognised[],
): T {
  const v = params.get(name);
  if (v == null) return allowed[0];
  if ((allowed as readonly string[]).includes(v)) return v as T;
  bad.push({ param: name, value: v, fallback: allowed[0] });
  return allowed[0];
}

export function parseNationalParams(params: URLSearchParams): NationalParams {
  const unrecognised: Unrecognised[] = [];
  const portal = pick(params, 'portal', PORTALS, unrecognised);
  const sort = pick(params, 'sort', SORTS, unrecognised);
  const rows = pick(params, 'rows', ROWS, unrecognised);
  const buyers = pick(params, 'buyers', BUYERS, unrecognised);
  const state = params.get('state') || null;
  // Naming a state fixes the portal: the key is a state-portal key or it is nothing.
  return { portal: state ? 'state' : portal, state, sort, rows, buyers, unrecognised };
}

/** The note's sentence for one value, in the wording the spec fixes. */
export const unrecognisedSentence = (u: Unrecognised) =>
  `Unrecognised value “${u.value}” for ${u.param}, showing ${u.fallback}.`;
