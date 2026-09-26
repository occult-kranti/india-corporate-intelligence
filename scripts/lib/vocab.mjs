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
 * `out` is relative to the repository root. `prefixes` are the id prefixes the fleet
 * owns (`energy:`, `wel:`/`scheme:`, `fin:`, `ngo:`, `cap:`): an id under one of them
 * must be defined as an entity or scheme somewhere in that fleet's directory, whichever
 * fleet's claim references it (validate.mjs §4, scripts/lib/fleet-refs.mjs).
 */
export const FLEETS = [
  { key: 'energy', dir: 'energy', out: 'src/graph/energy.generated.ts', kind: 'graph', prefix: 'ENERGY', prefixes: ['energy'] },
  { key: 'welfare', dir: 'welfare', out: 'src/data/welfare.generated.ts', kind: 'welfare', prefix: 'WELFARE', prefixes: ['wel', 'scheme'] },
  { key: 'finance', dir: 'finance', out: 'src/graph/finance.generated.ts', kind: 'graph', prefix: 'FINANCE', prefixes: ['fin'], loanCensus: 'worldbank-projects' },
  { key: 'ngo', dir: 'ngo', out: 'src/graph/ngo.generated.ts', kind: 'graph', prefix: 'NGO', prefixes: ['ngo'], fcState: 'fcra-receipts' },
  { key: 'capital', dir: 'capital', out: 'src/graph/capital.generated.ts', kind: 'graph', prefix: 'CAPITAL', prefixes: ['cap'], ownership: true },
];

/**
 * `ownership: true` (capital) adds the G3a–c exports (docs/design/FINANCE_PAGE.md §3.3):
 * a `holding` block on `own` claims → `${prefix}_HOLDINGS`, and two DECLARATION files in
 * the fleet directory → `${prefix}_COVERAGE` / `${prefix}_CONTROLS`. A declaration file is
 * an input (the run id covers it) but not a research file: it has no claims or entities,
 * no domain, and validate.mjs §4 checks it with its own rules.
 */
export const OWNERSHIP_DECLARATIONS = { 'coverage.json': 'coverage', 'controls.json': 'controls' };
export const HOLDING_CATEGORIES = ['promoter', 'promoter-group', 'fpi', 'fdi', 'custodian', 'domestic-insurer', 'other'];
export const HOLDING_KEYS = ['pct', 'shares', 'asOf', 'category', 'line', 'aggregate'];
export const COVERAGE_READ = ['primary', 'aggregator', 'not-read'];
export const CONTROL_ROLES = ['subject', 'comparison', 'domestic-control', 'adviser-subject', 'adviser-comparison'];
/** The research domain whose `own` claims are computed lower bounds, not filing lines (FINANCE_PAGE.md D24). */
export const AGGREGATES_DOMAIN = 'holders-aggregates';

/**
 * Why a holding's figure is not what the claim's own text prints, or null. `text` is
 * the claim's d and lab. A percentage must appear as "N%"; a share count as digits in
 * Indian or Western grouping. The same test runs in the assembler and in validate §4.
 */
export function holdingTextProblem(h, text) {
  const t = String(text ?? '');
  const out = [];
  if (typeof h.line === 'string' && h.line.trim() !== '' && !t.includes(h.line)) out.push("holding.line is not a verbatim part of the claim's d or lab");
  if (typeof h.pct === 'number' && !(t.match(/\d+(?:\.\d+)?(?=\s?%)/g) ?? []).some((m) => Number(m) === h.pct)) {
    out.push(`holding.pct ${h.pct} is not a figure printed in the claim's d or lab`);
  }
  if (Number.isInteger(h.shares) && !(t.match(/\d[\d,]*\d/g) ?? []).some((m) => m.replace(/,/g, '') === String(h.shares))) {
    out.push(`holding.shares ${h.shares} is not a share count printed in the claim's d or lab`);
  }
  return out;
}

/** Every fleet-owned id prefix, in FLEETS order. */
export const FLEET_PREFIXES = FLEETS.flatMap((f) => f.prefixes);

/**
 * Loan facts (docs/design/FINANCE_PAGE.md §3.3 G1/G2). A fleet row with `loanCensus` names
 * the research domain whose loans are a scripted census (worldbank-projects.json, written by
 * scripts/finance/fetch-worldbank.mjs); its module gains <PREFIX>_LOAN_FACTS and
 * <PREFIX>_WB_TOTALS. The branches of the fetcher's placement rule, and the census totals'
 * fixed keys, are shared here so the assembler and validate.mjs §5 read them alike.
 */
export const STATE_BASES = ['borrower-state', 'agency-state', 'agency-seat', 'title'];
export const WB_TOTAL_KEYS = [
  'projects', 'claims', 'croreExclPipeline', 'usdMExclPipeline', 'pipeline', 'dropped', 'grantOnly', 'otherOnly',
  'noRupee', 'borrowerUnstated', 'agencyUnstated', 'noInstrument',
];
/** A World Bank project id: P and six digits. */
export const WB_PROJECT_ID = /^P\d{6}$/;

/**
 * State-wise foreign contribution (docs/design/FINANCE_PAGE.md §3.3 P5/G4). A fleet row
 * with `fcState` names the research domain whose file may carry a top-level `fcByState`
 * list — the state/UT rows of a Parliament annexure, transcribed one row per state × FY —
 * and its module gains <PREFIX>_FC_STATE (empty when the file carries none). A row is a
 * share of a total the same file records: for every FY the rows name, their receivedCr
 * must sum, within FC_STATE_TOLERANCE_CR, to each current national `grant` claim of that
 * domain spanning the FY and citing a source the rows cite. The assembler and
 * validate.mjs §4/§5 run the same test, from here.
 */
export const FC_STATE_KEYS = ['st', 'stateName', 'fy', 'receivedCr', 'utilisedCr', 'note', 'srcs'];
export const FC_STATE_TOLERANCE_CR = 1;

/** "2019-20" → { from: '2019-04-01', to: '2020-03-31' }; null when not an Indian financial-year label. */
export function fySpan(fy) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(fy ?? ''));
  if (!m) return null;
  const y = Number(m[1]);
  if ((y + 1) % 100 !== Number(m[2])) return null;
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}

/**
 * Why the state rows do not add up to the file's national rows, or []. `rows` are read
 * fcByState rows ({fy, receivedCr, srcs}); `claims` are that domain's grant claims as
 * written (raw) or emitted (edge): pred, a, from, to, srcs, supersededBy. Each FY is
 * checked against every current national row spanning it that shares a source URL with
 * the state rows; an FY with no such row is a problem too — a state table nobody can
 * add up is not a table.
 */
export function fcStateSumProblems(rows, claims) {
  const out = [];
  const byFy = new Map();
  for (const r of rows) {
    if (!byFy.has(r.fy)) byFy.set(r.fy, []);
    byFy.get(r.fy).push(r);
  }
  for (const fy of [...byFy.keys()].sort()) {
    const span = fySpan(fy);
    if (!span) continue; // the shape check names it
    const list = byFy.get(fy);
    const urls = new Set(list.flatMap((r) => (r.srcs ?? []).map((s) => s?.[1])).filter(Boolean));
    const sum = Math.round(list.reduce((a, r) => a + (typeof r.receivedCr === 'number' ? r.receivedCr : 0), 0) * 100) / 100;
    const national = (claims ?? []).filter(
      (c) => c && c.pred === 'grant' && c.supersededBy == null && typeof c.a === 'number' && c.from === span.from && c.to === span.to
        && (c.srcs ?? []).some((s) => urls.has(s?.[1])),
    );
    if (!national.length) {
      out.push(`fcByState ${fy}: ${list.length} state row(s) sum to ₹${sum.toFixed(2)} crore but the file records no current national grant claim spanning ${span.from}–${span.to} that cites the rows' source`);
      continue;
    }
    for (const c of national) {
      if (Math.abs(sum - c.a) > FC_STATE_TOLERANCE_CR) {
        out.push(`fcByState ${fy}: ${list.length} state row(s) sum to ₹${sum.toFixed(2)} crore, but ${c.id} records ₹${c.a} crore — the difference exceeds ₹${FC_STATE_TOLERANCE_CR} crore`);
      }
    }
  }
  return out;
}

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
