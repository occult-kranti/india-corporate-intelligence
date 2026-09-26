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
  'loan', 'grant',
];

/**
 * Money moving s → t. `award` is not here: it runs awarder → winner and is a
 * decision, not a transfer. scripts/assemble-fleet.test.mjs holds the ForceGraph
 * DIRECTED set to this list, so a new money predicate cannot ship without its arrow.
 */
export const MONEY_PREDS = ['bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'loan', 'grant'];

/** Predicates whose amount is the claim: an absent `a` must be said out loud. */
export const AMOUNT_STATED_PREDS = ['loan', 'grant'];

/**
 * Why a claim's amount cannot ship, or null. A loan or grant without a numeric `a`
 * must say "amount not stated" in `d`: otherwise a page summing ₹ would read the
 * gap as zero, or a reader would take a silent gap for an oversight. One copy of the
 * rule, used by the assembler's gate and validate.mjs §4 and §5.
 */
export function amountProblem(c) {
  if (!AMOUNT_STATED_PREDS.includes(c?.pred)) return null;
  if (typeof c.a === 'number' && Number.isFinite(c.a)) return null;
  const d = Array.isArray(c.d) ? c.d.join(' ') : typeof c.d === 'string' ? c.d : '';
  if (/amount not stated/i.test(d)) return null;
  return `${c.pred} without an amount — set a (₹ crore, conversion rate in d) or say "amount not stated" in d`;
}

/** The fields of a loan's `terms`, in emitted order. `conditions` is a list of strings; the rest are numbers or null, `instrument` text. */
export const TERMS_KEYS = ['instrument', 'ratePct', 'tenorYears', 'graceYears', 'conditions'];

/**
 * The research fleets, one row each. Everything that used to say "energy and
 * welfare" reads this table: the assembler (what to read, what to write, under which
 * export prefix), validate.mjs §4 (which directories are research) and §5 (which
 * modules must exist and be fresh). `kind: 'welfare'` keeps the scheme sections;
 * `kind: 'graph'` emits nodes, edges and the discipline sections only.
 * `out` is relative to the repository root.
 */
export const FLEETS = [
  { key: 'energy', dir: 'energy', out: 'src/graph/energy.generated.ts', kind: 'graph', prefix: 'ENERGY' },
  { key: 'welfare', dir: 'welfare', out: 'src/data/welfare.generated.ts', kind: 'welfare', prefix: 'WELFARE' },
  { key: 'finance', dir: 'finance', out: 'src/graph/finance.generated.ts', kind: 'graph', prefix: 'FINANCE' },
  { key: 'ngo', dir: 'ngo', out: 'src/graph/ngo.generated.ts', kind: 'graph', prefix: 'NGO' },
  { key: 'capital', dir: 'capital', out: 'src/graph/capital.generated.ts', kind: 'graph', prefix: 'CAPITAL' },
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
