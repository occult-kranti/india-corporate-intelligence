/**
 * The closed vocabularies of the graph and the fleet contract, shared by
 * scripts/assemble-fleet.mjs and scripts/validate.mjs. One copy, because the
 * assembler and the validator are two gates on one contract: if their lists drift,
 * a value can pass one and fail the other, and neither message will say why.
 *
 * The TypeScript unions in src/graph/schema.ts and src/data/welfare.ts restate
 * these for the compiler; `tsc --strict` over the generated modules is what keeps
 * the two sides in step.
 */

/** Index order is conservatism order: an audit verdict can only move a claim rightwards. */
export const TIERS = ['documented', 'reported', 'alleged', 'analytic'];

export const PREDS = [
  'award', 'bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'own', 'family',
  'role', 'law', 'enforce', 'hq', 'listed', 'sector', 'contra', 'supersede', 'analytic',
];

export const NODE_TYPES = [
  'ministry', 'psu', 'agency', 'company', 'shell', 'person', 'party', 'fund', 'trust',
  'sangh', 'law', 'mechanism', 'state', 'industry', 'exchange', 'group',
];

export const FAMILIES = ['state', 'capital', 'recipient', 'instrument', 'enforce', 'market'];

export const STATE_CODES = [
  'an', 'ap', 'ar', 'as', 'br', 'ch', 'ct', 'dn', 'dd', 'dl', 'ga', 'gj', 'hr', 'hp', 'jk', 'jh',
  'ka', 'kl', 'ld', 'mp', 'mh', 'mn', 'ml', 'mz', 'nl', 'or', 'py', 'pb', 'rj', 'sk', 'tn', 'tg',
  'tr', 'up', 'ut', 'wb',
];

export const NARRATIVE_STATUS = ['established', 'well-supported', 'contested', 'speculative', 'unsupported', 'debunked'];

/** `announced` and `launched` are admitted beside the contract's list. */
export const SCHEME_STATUS = [
  'live', 'raised', 'cut', 'eligibility-tightened', 'paused', 'renamed', 'discontinued',
  'promised-not-enacted', 'announced', 'launched',
];

export const SCHEME_CATEGORIES = [
  'women-cash', 'farmer-cash', 'pension', 'grain', 'unemployment', 'student', 'housing',
  'energy-subsidy', 'loan-waiver', 'consumer-goods', 'transport', 'other',
];

/**
 * ISO 8601 with reduced precision — YYYY, YYYY-MM or YYYY-MM-DD. A researcher who
 * knows only the month must not invent a day. The month is bounded to 01–12 and the
 * day to 01–31: without that, the financial-year span "2024-25" reads as year 2024,
 * month 25. "2025-2026" fails on shape. A span whose second half is itself a valid
 * month ("2023-12" for FY 2023-24) cannot be told apart and is read as a month.
 */
export const ISO_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

/** Ids the derived national graph (src/graph/build.ts) owns, accepted by prefix. */
export const INVENTORY = /^(pol|min|sec|co|grp|per|for):/;
