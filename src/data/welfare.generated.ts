/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Written by scripts/assemble-fleet.mjs (`npm run generate`, generator 1.2.0),
 * run run-8254dd58f780, from:
 *   (nothing — research/raw/welfare/ holds no research files yet)
 *
 * To change it, change the research file, or the fleet's RECONCILIATION.json or
 * AUDIT.json, and re-run `npm run generate`. `npm run validate` fails when this
 * file no longer matches what its inputs assemble to, so a hand edit cannot ship.
 */

import type { GNode, GEdge } from '../graph/schema';
import type { BaseRateRow, BenefitRow, EntityIdentity, FleetMeta, FleetText, Narrative, Void } from '../graph/fleet';
import type { Coverage, Election, Scheme } from './welfare';

export const WELFARE_SCHEMES: Scheme[] = [
];

export const WELFARE_ENTITIES: GNode[] = [
];

/** One node per scheme, so claims that point at a scheme have somewhere to land. */
export const WELFARE_SCHEME_NODES: GNode[] = [
];

export const WELFARE_CLAIMS: GEdge[] = [
];

/** Claim id → the research domain (file stem) it came from, for every edge and every held claim. */
export const WELFARE_EDGE_DOMAIN: Record<string, string> = {
};

export const WELFARE_BENEFITS: BenefitRow[] = [
];

export const WELFARE_ELECTIONS: Election[] = [
];

/** What each file declares it searched. A state-year is painted "searched, none live" only when an entry here declares it. */
export const WELFARE_COVERAGE: Coverage[] = [
];

export const WELFARE_VOIDS: Void[] = [
];

export const WELFARE_NARRATIVES: Narrative[] = [
];

export const WELFARE_BASE_RATES: BaseRateRow[] = [
];

export const WELFARE_SYMMETRY: FleetText[] = [
];

export const WELFARE_GAPS: FleetText[] = [
];

export const WELFARE_IDENTITY: Record<string, EntityIdentity> = {
};

export const WELFARE_META: FleetMeta = {
  "fleet": "welfare",
  "generator": "scripts/assemble-fleet.mjs",
  "generatorVersion": "1.2.0",
  "asOf": null,
  "runId": "run-8254dd58f780",
  "empty": true,
  "note": "no research files under research/raw/welfare/ — emitted empty so the build never depends on research having run",
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
    "baseRates": 0,
    "schemes": 0,
    "elections": 0,
    "coverage": 0
  },
  "reconciliation": {
    "mappings": [],
    "merged": []
  },
  "audit": null,
  "killed": [],
  "excluded": []
};
