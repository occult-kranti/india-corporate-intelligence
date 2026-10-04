/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Written by scripts/assemble-fleet.mjs (`npm run generate`, generator 1.4.1),
 * run run-780f6d149420, from:
 *   (nothing — research/raw/force/ holds no research files yet)
 *
 * To change it, change the research file, or the fleet's RECONCILIATION.json or
 * AUDIT.json, and re-run `npm run generate`. `npm run validate` fails when this
 * file no longer matches what its inputs assemble to, so a hand edit cannot ship.
 */

import type { GNode, GEdge } from './schema';
import type { BaseRateRow, BenefitRow, EntityIdentity, FleetMeta, FleetText, Narrative, Void } from './fleet';
import type { BudgetRow, StrengthRow, FootprintRow } from './fleet';

export const FORCE_NODES: GNode[] = [
];

export const FORCE_EDGES: GEdge[] = [
];

/** Claim id → the research domain (file stem) it came from, for every edge and every held claim. */
export const FORCE_EDGE_DOMAIN: Record<string, string> = {
};

export const FORCE_BENEFITS: BenefitRow[] = [
];

export const FORCE_VOIDS: Void[] = [
];

export const FORCE_NARRATIVES: Narrative[] = [
];

export const FORCE_BASE_RATES: BaseRateRow[] = [
];

export const FORCE_SYMMETRY: FleetText[] = [
];

export const FORCE_GAPS: FleetText[] = [
];

export const FORCE_IDENTITY: Record<string, EntityIdentity> = {
};

/** Budget lines — one row per payer × body × head × component × FY × stage, ₹ crore as published (no conversion), read from every research file's budgets[] and sorted on those keys; a 0 is a figure, and each row's srcs is the budget document it is read from. */
export const FORCE_BUDGETS: BudgetRow[] = [
];

/** Sanctioned and actual strength — one row per body × year as the primary table (BPR&D DoPO, a state budget) prints it; perLakh and womenPct beside it only where published, else null. */
export const FORCE_STRENGTH: StrengthRow[] = [
];

/** Installations a primary record places — one row per id (force:fp-<slug>), each with the state the map draws it in and the city the readout names; since is the record's date at the precision it gives, or null. */
export const FORCE_FOOTPRINT: FootprintRow[] = [
];

export const FORCE_META: FleetMeta = {
  "fleet": "force",
  "generator": "scripts/assemble-fleet.mjs",
  "generatorVersion": "1.4.1",
  "asOf": null,
  "runId": "run-780f6d149420",
  "empty": true,
  "note": "no research files under research/raw/force/ — emitted empty so the build never depends on research having run",
  "inputs": [],
  "files": [],
  "counts": {
    "files": 0,
    "nodes": 0,
    "claimsIn": 0,
    "edges": 0,
    "killed": 0,
    "excluded": 0,
    "contrasAdded": 0,
    "downgradeVerdicts": 0,
    "benefits": 0,
    "voids": 0,
    "narratives": 0,
    "baseRates": 0
  },
  "series": {
    "budgets": 0,
    "strength": 0,
    "footprint": 0
  },
  "reconciliation": {
    "mappings": [],
    "merged": []
  },
  "audit": null,
  "killed": [],
  "excluded": []
};
