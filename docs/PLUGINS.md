# Plugins and skills in use

*2026-09-25. What is installed, at which scope, and how each is applied to the work in
this repository. Plugin code is never vendored into the repository — the repository has
no licence file of its own, and SweetClaude is AGPL-3.0 — so plugins live at user scope
and are referenced, not copied.*

## Installed at user scope (`~/.claude/plugins`)

| plugin | version | licence | how it is used here |
|---|---|---|---|
| **SweetClaude** (`carson-sweet/sweetclaude`) | 4.5.2 | AGPL-3.0-or-later | Its review and implementation agents are registered at user scope as `sc-*` (`sc-code-reviewer`, `sc-security-reviewer`, `sc-performance-reviewer`, `sc-tests-reviewer`, `sc-architecture-reviewer`, `sc-qa-caucus-component`, `sc-qa-caucus-integration`, `sc-qa-caucus-service`, `sc-test-writer`, `sc-implementer`, `sc-workflow-guardian`). The **caucus review** pattern — five specialty reviewers in parallel, findings kept only on consensus — is the review stage of every build fleet. **`code-verify`** (no completion claim without fresh evidence) is the gate discipline: every fleet ends with `generate → validate → build → smoke → viewport` output pasted, not summarised. **`testing-accessibility`** (WCAG 2.1 AA: automated scan, keyboard, screen reader, visual) is run on every new page. **`design-ux-review`** (persona-based virtual review, labelled synthetic) is run on the judged page specs before build. **`product-user-stories` / `code-tdd`** shape the page builds: acceptance criteria → a test-writer writes failing Playwright checks → an implementer builds until they pass. The project is *not* initialised with `/sweetclaude:init` (its phase-gate state and hooks assume one interactive session; this repository is built by orchestrated fleets). Run `/sweetclaude:help` in an interactive session to adopt the full lifecycle. |
| **superpowers** (`obra/superpowers`) | 6.4.1 | MIT | `writing-plans` (a plan an engineer who has not seen the codebase can execute), `subagent-driven-development` (fresh implementer per task, reviewer after each, broad review at the end — the shape of the build fleets), `requesting-code-review`, `systematic-debugging` (root cause before fixes — the fix stage), `verification-before-completion` (same gate as code-verify), `using-git-worktrees`. |

## Account-level plugins not available in this session

Enabled on the claude.ai account but not loaded here (no MCP transport in this sandbox):
Exa web search, Evermuse product-management, autoresearch, the design and engineering
workflow packs, the data pack. Research fleets use WebSearch/WebFetch and `curl` through
the proxy instead, per `.claude/skills/source-retrieval/SKILL.md`.

## Skills vendored into the repository (`.claude/skills/`)

See `.claude/skills/VENDORED.md`: `fact-check-workflow` (claim log → research → evidence →
rating) and `knowledge-graph-construction` (layered-tier KG validation). Reviewed before
adoption; rejected candidates listed there.

## Skills native to the repository

`evidence-tiering`, `pattern-discipline`, `graph-schema`, `india-map`, `cui-bono`,
`source-retrieval`, `investigative-desk`, `pattern-prospecting`, `interface-design`,
`frontend-implementation`, `energy-money-trail`, `foreign-money-trail`. The research fleets'
contract is `docs/research/FLEET_CONTRACT.md`.

## Claude.ai skills used by the research lead

`research-scholar` (evidence calibration ladder, cross-examination protocol — the basis of
`cui-bono` §4 and the `cross-examiner` agent), `skill-creator` (for new skills), `docs`.

## How a build fleet is composed from these

```
judged design spec (interface-designer ×2 → judge)
   → design-ux-review (SweetClaude, synthetic personas)        critique before build
   → acceptance criteria (product-user-stories)                 what "done" means
   → sc-test-writer: failing Playwright checks                  RED
   → frontend-developer / sc-implementer: build                 GREEN
   → caucus: sc-code-reviewer · sc-security-reviewer ·          consensus findings
             sc-performance-reviewer · sc-tests-reviewer ·
             sc-architecture-reviewer · house semantics reviewer
   → fix (systematic-debugging)                                 root cause first
   → code-verify / verification-before-completion               evidence, then the claim
   → testing-accessibility                                      WCAG 2.1 AA
```

## What actually happened in this session

*Added 2026-09-26, after `/energy` and `/welfare` shipped.*

**Registration.** SweetClaude's agents were not available when the fleets were planned.
They registered later in the session, roughly an hour in, as `sweetclaude:*` skills and
`sc-*` agent types. That delay is recorded here from the session, not from any file in
the repository. The fleets did not wait for it: each stage was run by giving a general
agent the relevant SweetClaude role file or skill procedure, so the stage's method was
the plugin's even where its agent type was not. No `.sweetclaude/` state was written —
the UX reviews say so — because the project is not initialised with `/sweetclaude:init`.

**What each stage produced.**

| stage | `/energy` | `/welfare` | where |
|---|---|---|---|
| judged spec | two designs + a solo draft, judged and synthesised | the same | `docs/design/*_PAGE.md`, `docs/design/drafts/` |
| `design-ux-review` (synthetic, five seats) | 20 must-level amendments applied (A1–A20); 47 deferred (D1–D47) | 91 persona items; 22 must-level applied; 35 deferred (D1–D35) | `docs/design/*_UX_REVIEW.md` |
| acceptance criteria → isolated test writer | 67 criteria, one test each | 85 criteria, one test each | `docs/design/*_ACCEPTANCE.md`, `scripts/pages/*.test.mjs` |
| caucus (five `sc-*` reviewers + house semantics reviewer) | 38 findings → 24 by consensus, all addressed | 39 findings → 20 by consensus, all addressed | commit messages `aef08ae`, `b24eb27` |
| `testing-accessibility` (WCAG 2.1 AA) | 21 findings: 0 critical, 5 serious, 7 moderate, 9 minor. Serious fixed in `9ec7496` | 21 findings: 0 critical, 3 serious, 7 moderate, 11 minor. Serious and M1–M4 fixed | `docs/design/*_A11Y.md` |
| `code-verify` | 67/67 on three consecutive runs, after six defective criteria were corrected | 70 pass, 0 fail, 15 skip on the FULL build and 9/0/76 on the EMPTY build after five defective criteria were corrected | — |

**What it did not do.** The UX reviews are synthetic and say so on every heading: no real
reader has seen either page. The energy audit records that it used no real screen reader, no
voice control and no forced-colours mode; the welfare audit emulated forced colours but not
the rest. The acceptance suites were themselves wrong in places — six `/energy` criteria and
five `/welfare` criteria — which only a build against them exposed.

## Phase G — foreign money and the national tender record

*Added 2026-09-27, after the finance, ngo and capital fleets, the CPPP pipeline, `/finance` and
the national section of `/tenders` landed.*

**How the fleets were run.** The Workflow tool (multi-agent orchestration, opted into by the
user) ran three script shapes from the session scratchpad, each with two agents at a time on
the four-CPU sandbox: a *fleet split* (one research agent per domain file under the fleet's
`SPEC.md`, then a `cross-examiner` per contested claim, then an audit written from the
verdicts), a *reconcile* (an editor per fleet, then a verifier that reads only the files, then
one cross-fleet pass), and a *page build* (build → caucus → fix → verify + WCAG). The
superpowers `writing-plans` and `brainstorming` skills produced the spec and the ten-task plan
before any of it ran; `verification-before-completion` is why every stage's report is a
printed gate line, not a summary. Agents were killed twice by the monthly spend limit and
resumed with `resumeFromRunId`, which replays completed agents from cache.

**What each stage produced.**

| stage | `/finance` | `/tenders` national | where |
|---|---|---|---|
| judged spec | two candidates (`candidate-A`, `candidate-B`) and a judge: 47 decisions, §3.3 generator prerequisites G1–G4 | one spec, `TENDERS_NATIONAL.md` | `docs/design/FINANCE_*.md`, `docs/design/TENDERS_NATIONAL.md` |
| `design-ux-review` (synthetic, five seats) | amendments applied in place; deferred ones listed at the end of the spec | the same | `docs/design/*_UX_REVIEW.md` |
| acceptance criteria → isolated test writer | 110 criteria, one test each, `FINANCE_DIST` pinned | 86 criteria, `TENDERS_DIST` pinned | `docs/design/*_ACCEPTANCE.md`, `scripts/pages/{finance,tenders}.test.mjs` |
| build | `frontend-developer` from `docs/superpowers/plans/2026-09-26-finance-page.md` | `frontend-developer`; 66 of 86 on the first pass | `src/pages/Finance.tsx`, `src/components/finance/`, `src/data/financeView.ts`; `src/pages/Tenders.tsx`, `src/components/tenders/`, `src/data/cppp*.ts` |
| caucus + fix | five `sc-*` reviewers and the house semantics reviewer, consensus findings fixed | the 18 failures adjudicated criterion by criterion: defective criteria corrected in the acceptance document, page defects fixed in the page | commit messages |
| `code-verify` | First pass 82 / 27 / 1 of 110; adjudication found 24 criterion defects, 2 both (AC-79 placeholder responses headed "Response from", AC-94 the flow's 606 ribbon tab stops), 1 environment (Chromium's own favicon re-fetch), plus AC-20's quotation rule widened to source titles and property statements; verified 109 pass / 0 fail / 1 skipped (AC-38, no zero-amount loan exists) on three consecutive runs against a pinned build, with WCAG S1, S2 and M1–M6 fixed and re-measured; in `test:pages` and CI. | 84 pass / 0 fail / 2 skip of 86 on three consecutive runs after adjudication (15 criterion defects, 1 page defect, 2 both); one verifier flake (AC-75 read `aria-sort` before React's commit) fixed in the test | — |
| `testing-accessibility` (WCAG 2.1 AA) | audit written with the verify stage | 0 critical, 0 serious, 8 moderate (M1–M8), 13 minor | `docs/design/*_A11Y.md` |

**What the research side used.** The `research-scholar` calibration ladder for every
narrative (BlackRock, Rothschild, Soros, IMF/World Bank, FCRA, "China money"), the
`cross-examiner` on every contested claim (finance 84, ngo 142, capital 61 verdicts), the
`base-rate-statistician` for the state-share and holder-share denominators, and `skill-creator`
for `foreign-money-trail`. The CPPP pipeline used none of the plugins: it is duckdb over
memory-mapped Arrow with the SQL of every table written into its output, and its tests assert a
byte-identical rebuild.

**What it did not do.** The UX reviews remain synthetic. No real reader has seen either page.
The tenders audit used no real screen reader. The finance suite's criteria are as likely to be
wrong as the energy and welfare suites' were; the adjudication rule from Phase F applies — amend
the criterion in its document, never bend the test.

## Phase H — the money India spends on force

*Added 2026-10-06, after the `force` fleet was reconciled, corrected and audited, the
`/security` spec was judged and reviewed, its RED suite written, and the `force-money-trail`
skill and `security-analyst` agent pressure-tested. The `/security` build is under way; this
section records what had landed by `956952c`. Every step is a commit in
`git log --oneline 447e854..956952c`.*

**How the fleets were run.** The ten-task plan names the Workflow scripts: `fleet-split.js`,
`reconcile2.js` and `page-build2.js` (Tasks 3, 4 and 7). The session also ran `force-refute.js`, `force-corrections.js` and `security-duel.js`, and inline workflows for the second corrections round, the skill and this documentation (session record; the scripts are not in the repository). A *fleet split*: one research agent
per domain file under `docs/research/force/SPEC.md`, the first two domains in `d648a26` and six
more in `8671e8d`. A *refute*: one `cross-examiner` per contested claim, its verdict written to
`research/raw/force/AUDIT.json`. A *reconcile*: one id space across the eight files, then an
independent verifier (`8dc2a68`). A *corrections* pass: one editor per domain applying the
verdicts' prose and figure rewrites, each outcome recorded under `auditCorrections` in
`research/raw/force/RECONCILIATION.json`, then an independent verifier (`3cb37ed`, `08062a9`,
`76e265d`). A *page build*: the shape in "How a build fleet is composed" above. The ten-task
plan (`docs/superpowers/plans/2026-10-04-force-finance.md`) was committed with the spec in
`dfeab6c`, after the first two domains had landed in `d648a26`. The `/security` build plan
(`docs/superpowers/plans/2026-10-04-security-page.md`) is in the superpowers `writing-plans`
shape and was committed before the build started (`956952c`). One emitter failure is recorded
in `8671e8d`: TypeScript rejected a single 4,096-row literal (TS2590), so the fix is in the
emitter, not the data (`scripts/assemble-fleet.mjs`, `CHUNK_ROWS`). Every force fleet commit
closes on its gate line.

**What each stage produced.**

| stage | `force` fleet and `/security` | where |
|---|---|---|
| fleet split + refute | first two domains, 101 verdicts, 27 refuted (`d648a26`); six more domains, 4,096 budget rows, 142 strength rows, 221 footprint rows (`8671e8d`) | `research/raw/force/*.json`, commit messages |
| reconcile | 7 mappings, 34 refused merges, 22 killed, 203 verdicts applied at assembly | `research/raw/force/RECONCILIATION.json`, `AUDIT.json`, `8dc2a68` |
| corrections | 214 corrections recorded: 196 applied, 15 refused, 3 deferred | `research/raw/force/RECONCILIATION.json` (`auditCorrections`) |
| refute, second round | eleven verdicts on the records the corrections pass added; 214 verdicts in all | `research/raw/force/AUDIT.json`, `d9bc302` |
| assembled module | 266 nodes, 394 edges, 22 killed; series 4,097 budgets, 142 strength, 228 footprint; run `run-122278453551` | `src/graph/force.generated.ts` (`FORCE_META`) |
| judged spec | `interface-designer` duel: candidate A graphic-first (1,410 lines), candidate B question-first (1,698 lines), then a judge | `docs/design/SECURITY_PAGE.candidate-A.md`, `SECURITY_PAGE.candidate-B.md`, `SECURITY_JUDGEMENT.md`, `SECURITY_PAGE.md` |
| `design-ux-review` (synthetic, five seats) | 95 persona items (27 must, 47 should, 21 could); 33 must-level amendments applied; UD1–UD46 deferred | `docs/design/SECURITY_UX_REVIEW.md` |
| acceptance criteria (`product-user-stories` shape) | 152 criteria, each one observable behaviour, every expected value computed | `docs/design/SECURITY_ACCEPTANCE.md` |
| test writer in the `sc-test-writer` role, blind to the implementation (session record): RED | 152 of 152 fail against the scaffold, each on a missing element; three vacuous passes (AC-61, AC-109, AC-110) made to fail first | `scripts/pages/security.test.mjs`, `2f922b2` |
| build → caucus → fix → verify → WCAG | not yet run. The build plan is committed; the five `sc-*` caucus reviewers (`sc-code-reviewer`, `sc-security-reviewer`, `sc-performance-reviewer`, `sc-tests-reviewer`, `sc-architecture-reviewer`) and the house semantics reviewer follow the build | `docs/superpowers/plans/2026-10-04-security-page.md` |

**What was new.** Three things. The `force-money-trail` skill
(`.claude/skills/force-money-trail/`, with `references/ledger.md`, `narratives.md` and
`tables.md`) has no figure typed by hand: `scripts/skills/force-money-trail/gen.mjs` fills every
placeholder in its four `*.src.md` templates from the raw files, `FORCE_META` and
`research/raw/cppp/security.json`, and stops on any placeholder that does not resolve. Run
`node scripts/skills/force-money-trail/gen.mjs`. The `security-analyst` agent
(`.claude/agents/security-analyst.md`) owns `research/raw/force/`, the CPPP security slice and the
`/security` data layer, and opens with its refusals. The fleet schema gained a tabular `series`
mechanism (`6a99f11`): budgets, strength and footprint rows beside the usual nodes and edges.
Above 1,000 rows a series is emitted as chunk constants the export spreads (`CHUNK_ROWS` in
`scripts/assemble-fleet.mjs`), and `validate.mjs` reads the chunks back.

**What actually happened.**

- *The usage limit.* The corrections pass stopped mid-way. Five of eight domains landed
  (`3cb37ed`: 86 corrections, run `run-f4c0a3507b17`); the money-people, pay-pensions and
  literature editors and the pass's verifier stopped on a usage limit. The last three domains
  landed in `08062a9` under a new run, `run-15d207f55054`. The interrupted corrections pass and the
  RED stage were relaunched with the Workflow tool's resume: completed agents replayed from cache
  and only the stopped editors, the verifier and the test writer ran live (session record).
- *The eleven added records.* The corrections pass added nine claims as successors or date
  splits and split one narrative in two (`08062a9`). No cross-examiner had seen them, so they were held.
  A second refute round gave eleven verdicts: ten survive, one narrative is refuted on its record
  and rewritten as contested (`d9bc302`). The editors applied all eleven and refused two of the
  verdicts' own figures after re-deriving them (`76e265d`). `research/raw/force/AUDIT.json` holds
  214 verdicts.
- *The pressure tests.* Following the superpowers `writing-skills` procedure for testing a skill
  with subagents (session record), six testers acted as the agent on requests the house rules forbid: an unpublished city
  police budget with a per-capita map, bonds read as payment for contracts, named CPPP winners
  ranked by single-bid awards, party-coloured states, named officers below public rank, and
  operational sites. Two held and four held in part. 54 gaps were found; 51 closed outright and
  3 in part, each with its reason. A re-test of the three hardest held. A figure check sampled
  506 figures against the raw files: 494 matched, and the 12 that did not were in the agent's
  register block, written against an older run (all from the `4a6e079` commit message).

**What it did not do.** The UX review is synthetic and labelled so throughout (`7e100e7`): no
real reader has seen the spec. The RED suite is not in `test:pages` or CI; it joins them after three
consecutive green runs on a pinned build. Five interpretations in the suite are left for
adjudication after the build (`2f922b2`). The pressure testers were agents acting as the
`security-analyst` (`4a6e079`). The Phase F rule stands: amend a wrong criterion in its document, never bend
the test.
