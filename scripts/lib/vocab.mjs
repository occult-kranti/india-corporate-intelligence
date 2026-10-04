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
 * owns (`energy:`, `wel:`/`scheme:`, `fin:`, `ngo:`, `cap:`, `force:`): an id under one of them
 * must be defined as an entity or scheme somewhere in that fleet's directory, whichever
 * fleet's claim references it (validate.mjs §4, scripts/lib/fleet-refs.mjs).
 * `series` names the tabular lists (SERIES, below) the assembler reads from every file of
 * the fleet and emits as typed rows beside the graph — the force fleet's budgets, strength
 * and footprint tables (docs/superpowers/specs/2026-10-04-force-finance-design.md §4.1).
 */
export const FLEETS = [
  { key: 'energy', dir: 'energy', out: 'src/graph/energy.generated.ts', kind: 'graph', prefix: 'ENERGY', prefixes: ['energy'] },
  { key: 'welfare', dir: 'welfare', out: 'src/data/welfare.generated.ts', kind: 'welfare', prefix: 'WELFARE', prefixes: ['wel', 'scheme'] },
  { key: 'finance', dir: 'finance', out: 'src/graph/finance.generated.ts', kind: 'graph', prefix: 'FINANCE', prefixes: ['fin'], loanCensus: 'worldbank-projects' },
  { key: 'ngo', dir: 'ngo', out: 'src/graph/ngo.generated.ts', kind: 'graph', prefix: 'NGO', prefixes: ['ngo'], fcState: 'fcra-receipts' },
  { key: 'capital', dir: 'capital', out: 'src/graph/capital.generated.ts', kind: 'graph', prefix: 'CAPITAL', prefixes: ['cap'], ownership: true },
  { key: 'force', dir: 'force', out: 'src/graph/force.generated.ts', kind: 'graph', prefix: 'FORCE', prefixes: ['force'], series: ['budgets', 'strength', 'footprint'] },
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
 * Why a researched `loan` record is not one loan of the count although it repeats no other
 * record (FINANCE_PAGE.md F3, §3.3 P7): each is listed in RECONCILIATION.json `notCountable`
 * with its class, and the claim carries countable: false and the same notCountableReason.
 *   non-binding-mou      a framework or pledge MoU — not a loan agreement;
 *   portfolio-aggregate  a lender's portfolio summed — many loans, not one;
 *   facility-envelope    a multitranche facility ceiling — its recorded tranches are the loans
 *                        (the entry lists them as `tranches`).
 */
export const NOT_COUNTABLE_CLASSES = ['non-binding-mou', 'portfolio-aggregate', 'facility-envelope'];

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

/**
 * Tabular series (docs/superpowers/specs/2026-10-04-force-finance-design.md §4.1). A FLEETS
 * row with `series: [name…]` names lists the assembler reads as a top-level array of that
 * name from EVERY research file in the fleet directory, concatenates in file order, checks
 * row by row with the one row-problem function per series below (a bad row refuses the
 * fleet, as a bad fcByState row does), refuses a repeated key, sorts on the key fields and
 * emits as <PREFIX>_<export>: <type>[]. The hand-written types are in src/graph/fleet.ts;
 * the key lists here are what a row must carry, in this order, null for a stated absence.
 * validate.mjs §4 runs the same functions on the raw rows and §5 on the emitted literal.
 */
export const BUDGET_KEYS = ['payer', 'body', 'head', 'component', 'fy', 'stage', 'cr', 'note', 'srcs'];
export const STRENGTH_KEYS = ['st', 'body', 'year', 'sanctioned', 'actual', 'perLakh', 'womenPct', 'note', 'srcs'];
export const FOOTPRINT_KEYS = ['id', 'kind', 'label', 'body', 'st', 'city', 'since', 'note', 'srcs'];
export const BUDGET_COMPONENTS = ['total', 'revenue', 'capital', 'pension', 'pay', 'grant-to-states', 'other'];
export const BUDGET_STAGES = ['BE', 'RE', 'actual'];
export const FOOTPRINT_KINDS = ['cantonment', 'dpsu-plant', 'drdo-lab', 'command-hq', 'capf-hq', 'commissionerate', 'prison', 'forensic-lab', 'training', 'ordnance', 'other'];
/** A footprint row's id: the force fleet's prefix, `fp-`, then a slug. */
export const FOOTPRINT_ID = /^force:fp-[a-z0-9][a-z0-9-]*$/;
/** The calendar years a strength table may be dated to, inclusive. */
export const STRENGTH_YEARS = [1990, 2030];

/**
 * The registry: `keys` a row carries in order; `type` the interface in src/graph/fleet.ts
 * and `export` the suffix of the emitted constant (<PREFIX>_<export>); `unique` the fields
 * that make a row one row (the duplicate key, and the emitted sort order); `problems` the
 * row-problem function. Adding a series is one entry here, one interface there.
 */
export const SERIES = {
  budgets: { keys: BUDGET_KEYS, type: 'BudgetRow', export: 'BUDGETS', unique: ['payer', 'body', 'head', 'component', 'fy', 'stage'], problems: budgetRowProblems },
  strength: { keys: STRENGTH_KEYS, type: 'StrengthRow', export: 'STRENGTH', unique: ['body', 'year'], problems: strengthRowProblems },
  footprint: { keys: FOOTPRINT_KEYS, type: 'FootprintRow', export: 'FOOTPRINT', unique: ['id'], problems: footprintRowProblems },
};

/** A row's duplicate key: its series' `unique` fields, joined. Two rows with one key are one row twice. */
export function seriesKey(name, row) {
  return SERIES[name].unique.map((k) => String(row?.[k])).join(' | ');
}

/** Why `srcs` is not a non-empty list of [label, http(s) url] pairs, or null. `need` says what the source is. */
export function srcsProblem(v, need = '') {
  if (!Array.isArray(v) || !v.length) return `srcs needs at least one [label, url] source${need}`;
  for (const [i, s] of v.entries()) {
    if (!Array.isArray(s) || s.length !== 2 || typeof s[0] !== 'string' || s[0].trim() === '' || typeof s[1] !== 'string') return `srcs[${i}] must be [label, url], found ${JSON.stringify(s)}`;
    if (!/^https?:\/\//.test(s[1])) return `srcs[${i}] url ${JSON.stringify(s[1])} is not an http(s) URL`;
  }
  return null;
}

/**
 * The key check every series row starts with: exactly `keys`, in order. A wrong set is the
 * one problem reported (each value check would only repeat it); a wrong order is reported
 * and the values are still checked, because the row may otherwise be sound.
 */
function rowKeys(r, keys) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { stop: true, problems: ['row must be an object'] };
  const ks = Object.keys(r);
  if (ks.join() === keys.join()) return { stop: false, problems: [] };
  const missing = keys.filter((k) => !ks.includes(k));
  const unknown = ks.filter((k) => !keys.includes(k));
  if (!missing.length && !unknown.length) return { stop: false, problems: [`keys ${ks.join(', ')} are not in the contract's order — write them as ${keys.join(', ')}`] };
  return {
    stop: true,
    problems: [`keys ${ks.join(', ')} — expected ${keys.join(', ')}${missing.length ? ` (missing ${missing.join(', ')})` : ''}${unknown.length ? ` (unknown ${unknown.join(', ')})` : ''}`],
  };
}

const isText = (v) => typeof v === 'string' && v.trim() !== '';
const isCount = (v) => Number.isInteger(v) && v >= 0;
const isRate = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const show = (v) => (v === undefined ? 'undefined' : JSON.stringify(v));
/**
 * `known` is the caller's resolver — the assembler's isKnown (every fleet's entity ids, the
 * Atlas, the inventory prefixes), validate.mjs §4's per-file test. Without one, only the
 * shape is checked; a `force:` body must still be defined in the force fleet, which the
 * cross-file rule (scripts/lib/fleet-refs.mjs) enforces from the references §4 collects.
 */
function bodyProblems(v, known) {
  if (!isText(v)) return ['body is required — the entity id the row describes'];
  if (known && !known(v)) return [`body ${show(v)} is neither a fleet id nor an inventory-prefixed id (pol|min|sec|co|grp|per|for:) nor an atlas id`];
  return [];
}
const noteProblems = (v) => (v === null || typeof v === 'string' ? [] : [`note ${show(v)} must be text or null`]);

/** Why a budgets row is not one (spec §4.1), or []: payer union or a state; body resolving; head; component, fy, stage from the lists; cr a number ≥ 0 (0 is a figure); note; srcs. */
export function budgetRowProblems(r, known = null) {
  const { stop, problems: out } = rowKeys(r, BUDGET_KEYS);
  if (stop) return out;
  if (!(r.payer === 'union' || STATE_CODES.includes(r.payer))) out.push(`payer ${show(r.payer)} is neither "union" nor a state code`);
  out.push(...bodyProblems(r.body, known));
  if (!isText(r.head)) out.push('head is required — the demand or major head as the budget document prints it');
  if (!BUDGET_COMPONENTS.includes(r.component)) out.push(`component ${show(r.component)} is not one of ${BUDGET_COMPONENTS.join(' | ')}`);
  if (!fySpan(r.fy)) out.push(`fy ${show(r.fy)} is not a financial year written YYYY-YY ("2024-25")`);
  if (!BUDGET_STAGES.includes(r.stage)) out.push(`stage ${show(r.stage)} is not one of ${BUDGET_STAGES.join(' | ')}`);
  if (!isRate(r.cr)) out.push(`cr ${show(r.cr)} is not a number ≥ 0 — a figure that is not a number is a gap, and a line with no figure is not a row`);
  out.push(...noteProblems(r.note));
  const s = srcsProblem(r.srcs, ' — the budget document the row is read from');
  if (s) out.push(s);
  return out;
}

/** Why a strength row is not one, or []: st a state code or null; body resolving; a whole year in STRENGTH_YEARS; sanctioned/actual whole numbers or null, not both null; perLakh/womenPct ≥ 0 or null; note; srcs. */
export function strengthRowProblems(r, known = null) {
  const { stop, problems: out } = rowKeys(r, STRENGTH_KEYS);
  if (stop) return out;
  if (!(r.st === null || STATE_CODES.includes(r.st))) out.push(`st ${show(r.st)} is not a state code or null`);
  out.push(...bodyProblems(r.body, known));
  if (!(Number.isInteger(r.year) && r.year >= STRENGTH_YEARS[0] && r.year <= STRENGTH_YEARS[1])) out.push(`year ${show(r.year)} is not a whole year ${STRENGTH_YEARS[0]}–${STRENGTH_YEARS[1]}`);
  for (const k of ['sanctioned', 'actual']) if (!(r[k] === null || isCount(r[k]))) out.push(`${k} ${show(r[k])} is not a whole number ≥ 0 or null`);
  if (r.sanctioned === null && r.actual === null) out.push('sanctioned and actual are both null — a row with no count is not a row');
  for (const k of ['perLakh', 'womenPct']) if (!(r[k] === null || isRate(r[k]))) out.push(`${k} ${show(r[k])} is not a number ≥ 0 or null`);
  out.push(...noteProblems(r.note));
  const s = srcsProblem(r.srcs, ' — the table the row is read from');
  if (s) out.push(s);
  return out;
}

/** Why a footprint row is not one, or []: a force:fp- slug id; a kind from the list; label; body resolving; st a state code (required — a row the map cannot place is not a footprint row); city; since ISO or null; note; srcs. */
export function footprintRowProblems(r, known = null) {
  const { stop, problems: out } = rowKeys(r, FOOTPRINT_KEYS);
  if (stop) return out;
  if (!(typeof r.id === 'string' && FOOTPRINT_ID.test(r.id))) out.push(`id ${show(r.id)} is not a footprint id — write force:fp-<slug>`);
  if (!FOOTPRINT_KINDS.includes(r.kind)) out.push(`kind ${show(r.kind)} is not one of ${FOOTPRINT_KINDS.join(' | ')}`);
  if (!isText(r.label)) out.push('label is required — the installation as the list names it');
  out.push(...bodyProblems(r.body, known));
  if (!STATE_CODES.includes(r.st)) out.push(`st ${show(r.st)} is not a state code — a footprint row the map cannot place is not a footprint row`);
  if (!isText(r.city)) out.push('city is required — the city the readout names');
  if (!(r.since === null || (typeof r.since === 'string' && ISO_DATE.test(r.since)))) out.push(`since ${show(r.since)} is not an ISO date (YYYY, YYYY-MM or YYYY-MM-DD) or null`);
  out.push(...noteProblems(r.note));
  const s = srcsProblem(r.srcs, ' — the list the installation is read from');
  if (s) out.push(s);
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
