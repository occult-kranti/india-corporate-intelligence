/**
 * Index membership: NIFTY 50, BSE SENSEX 30 and BSE SENSEX 50.
 *
 * Membership joins to the company dataset by id only — `existingId` is resolved by the
 * research pass against research/raw/companies-by-state.json and is never matched on
 * name here. A constituent with no id is carried as such; the page says "not in
 * dataset" rather than guessing.
 *
 * The lists are as-of-dated and may be INCOMPLETE: an index of 50 with 49 rows is a
 * gap the file declares, not a rounding error, and `indexCoverage()` exists so every
 * page that shows membership can print "49 of 50 confirmed" beside it. Announced but
 * not-yet-effective changes are kept separately in `INDEX_CHANGES`, with their tier,
 * because a review announcement is not a constituent list.
 *
 * Source: research/raw/indices.json (market-cartographer pass, two independent
 * sources per list where the primary exchange sites were unreachable).
 */

import raw from '../../research/raw/indices.json';

export type IndexKey = 'nifty50' | 'sensex30' | 'sensex50';

export interface Constituent {
  name: string;
  nse: string | null;
  bse: string | null;
  isin: string | null;
  sector: string | null;
  /** `co:<id>` in the company dataset, or null when the company has no record yet. */
  existingId: string | null;
  notes?: string;
}

export interface IndexChange {
  index: IndexKey;
  effective: string;
  out: { name: string; nse: string | null; existingId: string | null };
  in: { name: string; nse: string | null; existingId: string | null };
  tier: 'documented' | 'reported' | 'alleged' | 'analytic';
  notes?: string;
  srcs?: [string, string][];
}

const doc = raw as unknown as {
  asOf: string;
  sources: [string, string][];
  indices: Partial<Record<IndexKey, Constituent[]>>;
  changesAnnounced?: IndexChange[];
  missingFromDataset?: unknown[];
  gaps?: string[];
};

export const INDICES_AS_OF = doc.asOf;
export const INDEX_SOURCES = doc.sources ?? [];
export const INDEX_GAPS = doc.gaps ?? [];
export const INDEX_CHANGES: IndexChange[] = doc.changesAnnounced ?? [];

export const INDEX_LABEL: Record<IndexKey, string> = {
  nifty50: 'NIFTY 50',
  sensex30: 'BSE SENSEX',
  sensex50: 'BSE SENSEX 50',
};

/** The published size of each index — what a complete list would have. */
export const INDEX_EXPECTED: Record<IndexKey, number> = { nifty50: 50, sensex30: 30, sensex50: 50 };

export const INDEX_KEYS: IndexKey[] = ['nifty50', 'sensex30', 'sensex50'];

export const NIFTY50: Constituent[] = doc.indices.nifty50 ?? [];
export const SENSEX30: Constituent[] = doc.indices.sensex30 ?? [];
export const SENSEX50: Constituent[] = doc.indices.sensex50 ?? [];

export const INDEX_CONSTITUENTS: Record<IndexKey, Constituent[]> = {
  nifty50: NIFTY50,
  sensex30: SENSEX30,
  sensex50: SENSEX50,
};

/** company id (`co:…`) → the indices it belongs to. Built once; id join only. */
const membership = new Map<string, IndexKey[]>();
for (const k of INDEX_KEYS) {
  for (const c of INDEX_CONSTITUENTS[k]) {
    if (!c.existingId) continue;
    const list = membership.get(c.existingId) ?? [];
    if (!list.includes(k)) list.push(k);
    membership.set(c.existingId, list);
  }
}

export function membershipOf(companyId: string): IndexKey[] {
  return membership.get(companyId) ?? [];
}

/** Every company id that sits in at least one index. */
export const INDEXED_COMPANY_IDS: string[] = [...membership.keys()].sort();

/**
 * "n of N confirmed" per index. `unresolved` counts constituents with no dataset id —
 * they are in the index but cannot be joined to a company record.
 */
export function indexCoverage(): { key: IndexKey; label: string; confirmed: number; expected: number; unresolved: number }[] {
  return INDEX_KEYS.map((key) => {
    const list = INDEX_CONSTITUENTS[key];
    return {
      key,
      label: INDEX_LABEL[key],
      confirmed: list.length,
      expected: INDEX_EXPECTED[key],
      unresolved: list.filter((c) => !c.existingId).length,
    };
  });
}
