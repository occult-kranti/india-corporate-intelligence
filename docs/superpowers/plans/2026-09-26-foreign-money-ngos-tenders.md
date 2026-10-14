# Foreign Money, NGOs and the Tender Network — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Research tasks run as Workflow fleets (the user has ultracode on); code tasks run as ordinary subagent tasks with a fresh reviewer each.

**Goal:** Land three reconciled research fleets (external finance, NGOs, foreign capital), one reproducible CPPP tender pipeline, a `/finance` page and an extended `/tenders` page, on the existing invariants and gates.

**Architecture:** Research lands in `research/raw/{finance,ngo,capital,cppp}`; the generalised assembler emits one generated module per fleet; `mergeFleet` unions them into the graph; the CPPP pipeline is an offline Python/duckdb script whose SQL and input digests travel with its outputs. Pages are built through the plugin-shaped fleet (design duel → judge → UX review → acceptance → RED tests → build → caucus → fix → verify → WCAG).

**Tech Stack:** React 18 + TypeScript + Vite 6 + Tailwind v4, d3-force (canvas renderer), Node 20+ scripts with `node:test`, Python 3.11 + duckdb + pyarrow for the offline pipeline only, Playwright on the pinned Chromium for page suites.

**Spec:** `docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md`

## Global Constraints

- Four invariants, CI-enforced: provenance (`srcs` or tier alleged/analytic), resolution (one entity one id; persons only in public roles, identified by office-with-dates/DIN), supersession (`supersededBy`, never overwrite), contradiction (`contra` for every alleged; `innocentReading` for every analytic).
- No person node for a private individual. No unmarked winner name from the CPPP data leaves the pipeline. No CIN asserted from a name match.
- Institutions, not families: Rothschild & Co (Euronext ROTH) and BlackRock Inc. (NYSE BLK) are companies; narratives naming a family go on the ladder, never on an edge.
- Ids: reuse `pol:/co:/grp:/min:/per:/for:/sec:` and Atlas ids; new prefixes `fin:`, `ngo:`; energy `energy:` and welfare `wel:`/`scheme:` unchanged.
- Dates ISO 8601 reduced precision (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`); amounts ₹ crore with the conversion rate stated in `d`.
- Zero new runtime dependencies in `package.json`. Python is offline tooling, not a build step; nothing in CI needs duckdb.
- `npm run check` (promote → generate → test:assemble → validate → build → smoke → viewport → test:pages) green before every commit that touches `src/`, `scripts/` or `research/`.
- CI runs Node 20: list files explicitly in `node --test` scripts; no Node 21+ APIs in scripts.
- Frozen visual channels: tier dash, family hue, type shape, declared size band; no-data hatch ≠ zero; party is text never colour; every graphic has a table twin reading exactly what it draws.
- Page suites run against a pinned copy of `dist` (`ENERGY_DIST`/`WELFARE_DIST`/`FINANCE_DIST`/`TENDERS_DIST`) when anything else may rebuild.
- Commit trailers per session instructions; commit only batches that pass gates.

## Review Focus

1. **A loan with a null amount or a US$ amount not converted** must render as "amount not stated / in US$ m" and be excluded from every ₹ total, never coerced to 0 — Task 1 (validator rejects `a` without a currency note when the source is US$), Task 7 (page test).
2. **A CPPP `tender_id` with several rows** must count once per award decision, with the rule stated (first AOC per `tender_id`+`selected_bidder`, or lot-level if the detail page shows lots); a rate computed over raw rows must be impossible to emit — Task 3 (quality test pins the dedup rule; `rates.json` records the denominator definition).
3. **An unmarked winner name** (bare personal name) must never appear in any emitted JSON or on the page, including inside `sample-verification.json` — Task 3 and Task 4 (tests grep the outputs for names outside the marker allow-list).
4. **An FCRA cancellation with no recorded response** must ship as alleged/reported with an explicit "no response recorded — asked/not asked unknown" `contra`, and the page must print that sentence — Task 5 (validator §4 already enforces contra-for-alleged; the SPEC tells agents the wording), Task 7 (test).
5. **BlackRock displayed alone** in the holder matrix must be impossible: the comparison set (≥4 named holders) is always rendered, and a filter that would leave one holder shows the "comparison set required" note — Task 7 (acceptance criterion + test).

---

### Task 0: Branch, spec approval, task registry

**Files:** none in the repo beyond the spec already committed.

- [ ] **Step 1:** Confirm the spec's three decisions with the user (one page or three; commit aggregates only; email GTI). Default on silence: one page; aggregates only; GTI email is the user's.
- [ ] **Step 2:** Work on `claude/india-market-intelligence-build-n7in1n` (fast-forwarded to `master` at `9a5dc18`). Open a PR against `master` only when the user asks.

### Task 1: Schema extension — `loan`, `grant`, `terms`

**Files:**
- Modify: `scripts/lib/vocab.mjs:15-18` (PREDS)
- Modify: `src/graph/schema.ts` (Predicate union; `GEdge.terms?`)
- Modify: `src/components/viz/ForceGraph.tsx:74-93` (PRED_LABEL)
- Modify: `scripts/validate.mjs` (§4 rule: `loan`/`grant` require numeric `a` or `d` containing "amount not stated")
- Test: `scripts/merge-fleet.test.mjs` (extend), `scripts/assemble-fleet.test.mjs` (extend)

**Interfaces:**
- Produces: predicates `'loan' | 'grant'`; optional `terms?: { instrument?: string; ratePct?: number | null; tenorYears?: number | null; graceYears?: number | null; conditions?: string[] }` on `GEdge`; both predicates are directed money flows (`isDirected` true, arrowhead drawn) and use the existing width rule.

- [ ] **Step 1: Write the failing assembler test**

```js
// scripts/assemble-fleet.test.mjs — append
test('loan and grant predicates pass the fleet gate and keep terms', async () => {
  const dir = mkTmpFleet('finance', {
    'worldbank.json': {
      asOf: '2026-09-26', domain: 'worldbank', scope: 's', sources: [['WB', 'https://projects.worldbank.org/en/projects-operations/project-detail/P000001']],
      entities: [
        { id: 'fin:ibrd', label: 'IBRD', sub: 'World Bank lending arm', ty: 'fund', fam: 'capital', st: null, sz: 3, al: [], resolved: true, identity: {}, d: ['x [documented]'], srcs: [['WB', 'https://www.worldbank.org/']] },
        { id: 'min:ministry-of-finance', label: 'Ministry of Finance', sub: '', ty: 'ministry', fam: 'state', st: 'dl', sz: 3, al: [], resolved: true, identity: {}, d: [], srcs: [['WB', 'https://www.worldbank.org/']] },
      ],
      claims: [{ id: 'worldbank:c001', s: 'fin:ibrd', t: 'min:ministry-of-finance', pred: 'loan', tier: 'documented', a: 4150, lab: 'P000001', d: 'US$500m at ₹83/US$', from: '2023-06-30', to: '2028-12-31',
        terms: { instrument: 'IPF', ratePct: null, tenorYears: 18, graceYears: 5, conditions: ['procurement under WB rules'] }, srcs: [['WB', 'https://projects.worldbank.org/en/projects-operations/project-detail/P000001']] }],
      voids: [], narratives: [], symmetryCheck: 'x', baseRates: [], gaps: [],
    },
  });
  const out = assemble({ rawDir: dir });
  assert.equal(out.errors.length, 0, out.errors.join('\n'));
  const e = out.finance.edges.find((x) => x.id === 'worldbank:c001');
  assert.equal(e.pred, 'loan');
  assert.deepEqual(e.terms.conditions, ['procurement under WB rules']);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test scripts/assemble-fleet.test.mjs`
Expected: FAIL — `pred "loan" not in vocabulary` (or `out.finance` undefined until Task 2).

- [ ] **Step 3: Add the predicates and the field**

```js
// scripts/lib/vocab.mjs
export const PREDS = [
  'award', 'bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'own', 'family',
  'role', 'law', 'enforce', 'hq', 'listed', 'sector', 'contra', 'supersede', 'analytic',
  'loan', 'grant',
];
/** Money flows s→t. Used by the assembler's direction check and the validator's amount rule. */
export const MONEY_PREDS = ['bond', 'trust', 'direct', 'pmin', 'pmout', 'csr', 'loan', 'grant'];
```

```ts
// src/graph/schema.ts
  | 'analytic'  // non-causal comparison
  | 'loan'      // lender → borrower; a = ₹ crore; terms carry conditions
  | 'grant';    // donor → recipient association; a = ₹ crore for the FY in d

export interface LoanTerms {
  instrument?: string;
  ratePct?: number | null;
  tenorYears?: number | null;
  graceYears?: number | null;
  conditions?: string[];
}
// in GEdge:
  terms?: LoanTerms;
```

```ts
// src/components/viz/ForceGraph.tsx PRED_LABEL — add
  loan: 'Loan',
  grant: 'Grant / foreign contribution',
```

Validator §4 (in the per-claim loop): `if ((c.pred === 'loan' || c.pred === 'grant') && typeof c.a !== 'number' && !/amount not stated/i.test(c.d ?? '')) err('loan/grant without an amount — set a (₹ crore) or say "amount not stated" in d')`.

Assembler: carry `terms` through `emitFleet` like `benefit` (copy the field verbatim when present; validate `conditions` is an array of strings).

- [ ] **Step 4: Run the assembler and merge tests**

Run: `npm run test:assemble`
Expected: PASS, 31+ tests.

- [ ] **Step 5: Regenerate and gate**

Run: `npm run generate && npm run validate && npx tsc --noEmit`
Expected: `generate: OK`, `validate: OK`, no type errors; generated modules byte-identical (no fleet uses the new predicates yet).

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/vocab.mjs src/graph/schema.ts src/components/viz/ForceGraph.tsx scripts/validate.mjs scripts/assemble-fleet.mjs scripts/assemble-fleet.test.mjs
git commit -m "Schema: loan and grant predicates with loan terms, gated and labelled"
```

### Task 2: Generalise the assembler to N fleets

**Files:**
- Modify: `scripts/assemble-fleet.mjs:55-60` (OUT map → FLEETS table), `:1285-1316` (the two-fleet main), `:1221-1260` (emit prefix per fleet)
- Modify: `scripts/validate.mjs:442+` (§5 loops over FLEETS)
- Modify: `src/graph/mergeFleet.ts` (no change if it already takes an array), `src/context/DataContext.tsx:8-9,93-94` (add the three modules)
- Modify: `docs/research/FLEET_CONTRACT.md` (table of fleets → module → kind)
- Test: `scripts/assemble-fleet.test.mjs`

**Interfaces:**
- Produces: `export const FLEETS = [{ key:'energy', dir:'energy', out:'src/graph/energy.generated.ts', kind:'graph', prefix:'ENERGY' }, { key:'welfare', dir:'welfare', out:'src/data/welfare.generated.ts', kind:'welfare', prefix:'WELFARE' }, { key:'finance', dir:'finance', out:'src/graph/finance.generated.ts', kind:'graph', prefix:'FINANCE' }, { key:'ngo', dir:'ngo', out:'src/graph/ngo.generated.ts', kind:'graph', prefix:'NGO' }, { key:'capital', dir:'capital', out:'src/graph/capital.generated.ts', kind:'graph', prefix:'CAPITAL' }]` exported from `scripts/lib/vocab.mjs`; `assemble({rawDir})` returns `{ [key]: {data, text}, errors, warnings }` for every fleet, with `empty: true` modules for fleets whose directory is missing.

- [ ] **Step 1: Failing test — a third fleet emits its own module and an absent fleet emits an empty one**

```js
test('every FLEETS entry gets a module; a missing directory yields empty:true', () => {
  const dir = mkTmpFleet('finance', { 'worldbank.json': minimalGraphDoc('worldbank') });
  const out = assemble({ rawDir: dir });
  assert.ok(out.finance.text.includes('export const FINANCE_NODES'));
  assert.equal(out.ngo.data.meta.empty, true);
  assert.equal(out.capital.data.meta.empty, true);
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test scripts/assemble-fleet.test.mjs` → FAIL `out.finance is undefined`.
- [ ] **Step 3: Implement** — replace the `['energy','welfare']` literals with `FLEETS.map(f => f.key)`; `readFleet` returns `{files: [], empty: true}` when the directory is absent; `emitFleet` uses `fleet.prefix` and `fleet.kind` (`welfare` keeps its scheme sections; `graph` fleets emit NODES/EDGES/BENEFITS/VOIDS/NARRATIVES/BASE_RATES/SYMMETRY/META/IDENTITY/GAPS/EDGE_DOMAIN); write each `out` path independently; run id per fleet from its own inputs.
- [ ] **Step 4: Validator §5** — loop `for (const f of FLEETS)`: module missing → error unless the raw directory is also missing; module present → fresh in-memory assembly must match.
- [ ] **Step 5: DataContext** — import `FINANCE_NODES/EDGES`, `NGO_*`, `CAPITAL_*` and append `{nodes, edges}` entries to the `mergeFleet` call. Empty modules export empty arrays.
- [ ] **Step 6: Gate and commit** — `npm run check` (page suites included); commit `Assembler: N fleets from one table; finance, ngo and capital modules (empty until research lands)`.

### Task 3: CPPP pipeline — quality first, then rates

**Files:**
- Create: `scripts/cppp/build.py`, `scripts/cppp/README.md`, `scripts/cppp/fixtures/make_fixture.py`, `scripts/cppp/test_build.py`
- Create (outputs): `research/raw/cppp/quality.json`, `rates.json`, `concentration.json`, `timing.json`, `redflags.json`, `provenance.json`
- Test: `scripts/cppp/test_build.py` (python `unittest`, runs on a 2,000-row fixture; `npm run test:cppp` → `python3 -m unittest scripts/cppp/test_build.py`, added to `check` only if CI installs `duckdb pyarrow` — decision: **not in CI**; documented in README)

**Interfaces:**
- Consumes: the two Arrow files at `$CPPP_ARROW_DIR` (default the scratchpad path), `dataset_info.json`.
- Produces: JSON files with a shared `provenance` block `{ inputs: [{file, bytes, sha256_16}], rows, distinctTenderIds, dedupRule, sql: {tableName: 'SELECT …'}, generatedBy: 'scripts/cppp/build.py@<git sha>', asOf }`.

- [ ] **Step 1: Fixture generator** — `make_fixture.py` writes `fixture.arrow` with 2,000 synthetic rows covering: duplicate `tender_id`s (lots), null/zero/1/many/>1000 bids, negative and absurd values, AOC-before-closing, state-portal rows whose `organisation_name` is a state, tender types `Works|Goods|'2'|''`, junk `test` organisation, winners with and without markers (synthetic names only, e.g. `M/s Alpha Infra Pvt Ltd`, `ramesh kumar`).
- [ ] **Step 2: Failing tests**

```python
class QualityTests(unittest.TestCase):
    def setUp(self):
        self.out = build.run(arrow_dir=FIXTURE_DIR, out_dir=self.tmp, as_of='2026-09-26')
    def test_dedup_rule_stated_and_applied(self):
        q = json.load(open(self.tmp/'quality.json'))
        self.assertEqual(q['provenance']['dedupRule'], 'one row per (tender_id, selected_bidder_norm, aoc_at) — the first by internal_id')
        self.assertLess(q['afterDedup']['rows'], q['raw']['rows'])
    def test_rates_use_dedup_and_bids_ge_1(self):
        r = json.load(open(self.tmp/'rates.json'))
        self.assertEqual(r['denominator'], 'awards after dedup with bids_received >= 1 and <= 1000')
        for row in r['byPortalYear']:
            self.assertTrue(0 <= row['singleBidderPct'] <= 100); self.assertIn('wilson95', row)
    def test_no_unmarked_name_anywhere(self):
        blob = ''.join(open(p).read() for p in self.tmp.glob('*.json'))
        self.assertNotIn('ramesh kumar', blob.lower())
    def test_small_groups_pooled(self):
        r = json.load(open(self.tmp/'rates.json'))
        self.assertTrue(all(row['n'] >= 30 or row['key'] == 'pooled (n<30)' for row in r['byOrganisation']))
```

- [ ] **Step 3: Run** — `python3 -m unittest scripts/cppp/test_build.py` → FAIL (`build` has no `run`).
- [ ] **Step 4: Implement `build.py`** — duckdb over `pa.memory_map` tables; the SQL strings are module-level constants and are written verbatim into `provenance.sql`. Order: `quality.json` (raw counts, duplicates, nulls, implausibles, date-order, dirty `tender_type` map, junk orgs, marker share), then dedup view, then `rates.json` (portal × year, tender type, value band [<10 L, 10 L–1 cr, 1–10 cr, 10–100 cr, >100 cr], organisation with pooling; Wilson intervals), `concentration.json` (buyer = state portal name or central `organisation_name`; HHI over marked winners only; top-winner share; unmarked share reported as a number), `timing.json` (closing→AOC days histogram; share ≤2 days; AOC by month-of-FY), `redflags.json` (single bidding, non-open `tender_type`, ≤2-day decisions, repeat single-bidder winners per buyer — each as a rate over its family with the family size). Marker regex is the one probed on 2026-09-26, extended with `society|samiti|sangh|mandal|federation|trust|bank`.
- [ ] **Step 5: Tests pass** — `python3 -m unittest …` → OK.
- [ ] **Step 6: Run on the real data** — `CPPP_ARROW_DIR=<scratchpad>/tenders-hf python3 scripts/cppp/build.py --out research/raw/cppp`; paste the `quality.json` headline into `scripts/cppp/README.md`.
- [ ] **Step 7: Commit** — outputs + scripts + README; message states the dedup rule and the headline defect counts.

### Task 4: CPPP live verification sample

**Files:**
- Create: `scripts/cppp/verify_sample.py` (Playwright, pinned Chromium, seeded RNG 2026)
- Create: `research/raw/cppp/sample-verification.json`
- Test: `scripts/cppp/test_verify.py` (parses two saved AOC pages in `fixtures/`: one matching, one mismatching)

- [ ] **Step 1: Save two real AOC pages** from `eprocure.gov.in/cppp/aocfullviewmmp/…` into fixtures (HTML only; no personal names in the chosen rows — pick marked winners).
- [ ] **Step 2: Failing test** — `parse_aoc(html)` returns `{bids_received, selected_bidder, contract_value, aoc_date}`; `compare(row, parsed)` returns field-level `match|mismatch|missing`.
- [ ] **Step 3: Implement**; run on 40 seeded rows (marked winners only) with 3 s politeness delay; record `page_gone` for 404/captcha.
- [ ] **Step 4: Write `sample-verification.json`** with per-field agreement rates; if `bids_received` agrees ≥ 38/40, the README says the field is "documented at the row level for verified rows, reported elsewhere".
- [ ] **Step 5: Commit.**

### Task 5: Research fleets A, B, C

**Files:**
- Create: `scratchpad/finance/SPEC.md`, `scratchpad/ngo/SPEC.md`, `scratchpad/capital/SPEC.md` (from `scratchpad/energy/SPEC.md`, domains per spec §4.3–4.5, plus the FCRA "no response recorded" wording and the institutions-not-families rule)
- Create: `scratchpad/workflows/finance-split.js`, `ngo-split.js`, `capital-split.js` (from `energy-split.js`; CAP 5; two agents per workflow; `cross-examiner` per contested claim)
- Create: `scripts/finance/fetch-worldbank.mjs` → `research/raw/finance/worldbank-projects.json` (all India projects via `search.worldbank.org/api/v3/projects`, paged `rows=500`, fields listed in spec §2, sha256 of the response body recorded; documented tier; run id = hash of body)
- Create (fleet outputs): `research/raw/finance/*.json`, `research/raw/ngo/*.json`, `research/raw/capital/*.json`, each with `AUDIT.json`, `RECONCILIATION.json`
- Modify: `docs/research/FLEET_CONTRACT.md` (loan/grant claim shapes; `terms`; the FCRA contra wording)

- [ ] **Step 1: `fetch-worldbank.mjs`** — test with a recorded 2-project fixture (`scripts/finance/fixtures/wb-2.json`): output has 2 entities (`fin:wb-P517285`… no: projects are claims, not entities — entities are lenders `fin:ibrd`, `fin:ida`, borrowers `min:…`/state ids, implementing agencies as `energy:`/`fin:` ids resolved by name against the inventory), 2 `loan` claims with `a` converted at the rate in `d` (US$ at RBI reference rate for the approval month — fetched from the WB `PA.NUS.FCRF` indicator by year, stated), `terms.instrument` from `lendinginstr`. Run for real; commit the JSON.
- [ ] **Step 2: Fleets** — launch the three split workflows (Research → Cross-examine), then `reconcile.js` with `args.fleet` for each, then `audit_from_outputs.py` to harvest verdicts. Each fleet: 6–9 domain files, 30–80 claims per file, symmetry check and base rates mandatory.
- [ ] **Step 3: Gate** — `npm run generate && npm run validate`: every §4 error fixed in the raw files by the reconciliation editor; generated modules regenerate deterministically.
- [ ] **Step 4: Commit per fleet** with counts (nodes/edges by tier, verdicts, killed).

### Task 6: `foreign-money-trail` skill and two agents

**Files:**
- Create: `.claude/skills/foreign-money-trail/SKILL.md`, `references/ledger.md`, `references/narratives.md` (from the three fleets' `literature` and `narratives` output)
- Create: `.claude/agents/finance-analyst.md`, `.claude/agents/procurement-analyst.md`
- Modify: `docs/INDEX.md` §7

- [ ] **Step 1:** Write the skill with the id conventions (`fin:`, `ngo:`), the denominators (external debt stock; total FCRA receipts by year; NIFTY 50 free float), the control sets (Lazard/Goldman/Vanguard/GIC/Norges; UPA vs NDA borrowing; BJP vs opposition states), and the source map with reachability.
- [ ] **Step 2:** Write the agents with explicit refusal surfaces (no family framing; no unmarked names; no CIN from a name).
- [ ] **Step 3:** Commit.

### Task 7: `/finance` page — design duel → build → verify

**Files:**
- Create: `docs/design/FINANCE_PAGE.md` (judged spec), `FINANCE_UX_REVIEW.md`, `FINANCE_ACCEPTANCE.md`, `FINANCE_A11Y.md`
- Create: `src/pages/Finance.tsx`, `src/components/finance/{Control,LoansLens,AssociationsLens,CapitalLens,HolderMatrix,Panels,Sections,ui}.tsx`, `src/data/finance.ts`, `src/data/financeView.ts`
- Modify: `src/App.tsx` (route `/finance`), `src/components/Layout.tsx` (nav "Foreign money"), `scripts/smoke.mjs` (routes `/finance`, `/finance?lens=loans&y=2019`, `/finance?lens=capital`), `package.json` `test:pages` (add `scripts/pages/finance.test.mjs`)
- Test: `scripts/pages/finance.test.mjs` (RED first; `FINANCE_DIST`)

**Interfaces:**
- Consumes: `FINANCE_*`, `NGO_*`, `CAPITAL_*` from the generated modules; `WELFARE_SCHEMES` for the welfare join; `FlowSankey`, `IndiaMap`/`WelfareMap` pattern, `GraphExplorer`, `TimeLanes`.
- Produces: URL state `lens=loans|associations|capital`, `y=<year>|all`, `st=<code>`, `lender=<id>`, `holder=<id>`, `sel=<id>` (graph), replace-mode with defaults elided.

- [ ] **Step 1:** Run `page-build.js` with `args.pages=['finance']` through stages `ux → acceptance → red` (two designers + judge first, as for energy/welfare); commit the judged spec, UX review, acceptance criteria and RED suite (all failing on the stub route).
- [ ] **Step 2:** Stub route + nav entry + smoke routes; `npm run check` green with the stub (the RED suite is not yet in `test:pages`).
- [ ] **Step 3:** `build` stage (frontend-developer) until the suite is green on a pinned build; Review Focus items 1, 4, 5 have criteria: "US$-only loan shows 'in US$ m', excluded from ₹ totals", "cancellation without response prints the no-response sentence", "holder matrix never renders fewer than four holders".
- [ ] **Step 4:** `caucus → fix → verify` stages; WCAG audit (`testing-accessibility`) → fix serious findings → re-verify 3× FULL.
- [ ] **Step 5:** Add `scripts/pages/finance.test.mjs` to `test:pages`; `npm run check`; commit.

### Task 8: `/tenders` extension — the national section

**Files:**
- Create: `src/data/cppp.ts` (reads `research/raw/cppp/*.json`; exports typed tables and `provenance`), `src/components/tenders/National.tsx`
- Modify: `src/pages/Tenders.tsx` (section above the registers), `scripts/smoke.mjs` (`/tenders?view=national`)
- Create: `docs/design/TENDERS_NATIONAL_ACCEPTANCE.md`, `scripts/pages/tenders.test.mjs` (RED first; 20–30 criteria)
- Modify: `package.json` `test:pages`

- [ ] **Step 1:** Acceptance criteria (test-writer, blind): quality table first and above the fold; every rate shows its denominator sentence and n; Wilson interval drawn; no winner named unless marked and ≥5 awards; the verification sample links to live pages with match/mismatch marks; the two-state OCDS section unchanged.
- [ ] **Step 2:** RED suite fails on current page.
- [ ] **Step 3:** Build; caucus; verify; WCAG delta audit (the page already passed one).
- [ ] **Step 4:** Commit; add to `test:pages`.

### Task 9: Graph explorer additions the page needs

**Files:**
- Modify: `src/components/viz/GraphExplorer.tsx` (jump-to combobox; "as of" date mode using edge `from`/`to`; why-drawn line under the card)
- Modify: `scripts/graph-viewport.mjs` (three checks: jump-to focuses the node; as-of hides edges outside the date with the caption count; why-drawn names the filter that admitted the edge)
- Test: viewport gate

- [ ] **Step 1:** Add the three viewport checks (RED). **Step 2:** Implement in `GraphExplorer` only; `ForceGraph` and `camera.tsx` untouched. **Step 3:** `npm run viewport` green; energy suite 67/67 on a pinned build (it imports ForceGraph constants). **Step 4:** Commit.

### Task 10: Docs, gates, bundle, PR

**Files:**
- Modify: `HANDOFF.md`, `docs/INDEX.md`, `docs/CUSTOM_PLAN.md` (Phase G), `README.md`, `docs/PLUGINS.md`, `docs/BUNDLE.md`, `docs/research/DATA_SOURCES.md` (the §2 reachability table)

- [ ] **Step 1:** Docs agent updates all seven from the repository, counts read from META blocks and outputs.
- [ ] **Step 2:** `npm run check` green; bundle re-cut; push; PR against `master` when the user asks; CI green before reporting.

## Self-review

- Spec §4.1 → Task 1; §4.2 → Tasks 3–4; §4.3–4.6 → Task 5; §4.7 → Tasks 7, 9; §4.8 → Task 8; §5 → Task 6; §6 phases → Tasks 0–10 in order; §7 risks → Global Constraints and Review Focus.
- Names used consistently: `FLEETS` (vocab), `assemble({rawDir})`, `build.run(arrow_dir, out_dir, as_of)`, `parse_aoc`, `compare`, URL params `lens|y|st|lender|holder|sel`.
- Review Focus items each have an owning task and a test.
