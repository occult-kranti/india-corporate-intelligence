# The Money India Spends on Force — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land one reconciled research fleet (`force`) with three tabular series, the CPPP security slice, a `/security` page on three lenses, a skill and an agent, on the existing invariants and gates.

**Architecture:** Research lands in `research/raw/force/` (eight domain files + RECONCILIATION + AUDIT) and `research/raw/cppp/security.json`; the assembler's new `series` mechanism emits `FORCE_BUDGETS`, `FORCE_STRENGTH`, `FORCE_FOOTPRINT` beside the usual nodes, edges, benefits, voids, narratives, base rates and symmetry; `mergeFleet` unions the graph; `src/data/securityView.ts` derives every figure the page shows; `/security` renders three lenses with table twins.

**Tech Stack:** unchanged — React 18 + TypeScript + Vite 6 + Tailwind v4, d3-force canvas renderer, Node 20 scripts with `node:test`, Python 3.11 + duckdb + pyarrow offline only, Playwright pinned Chromium for the page suites.

**Spec:** `docs/superpowers/specs/2026-10-04-force-finance-design.md`

## Global Constraints

- The four invariants, CI-enforced. No person node below the public rank (service chiefs, DGPs, commissioners, secretaries, ministers, listed-company directors). No private individual.
- No operational detail of any force: published budgets, lists, awards and records only.
- Spending is shown beside its denominator and its comparison set; pay and pensions beside both sides' stated case; vendors with identical fields and never alone; outcomes as rates with party as text; cases as records with their counter.
- Ids: reuse `pol:`, `co:`, `grp:`, `min:`, `per:`, `sec:` (sectors) and Atlas ids; new prefix `force:`; footprint rows `force:fp-…`.
- Money ₹ crore as published; dates ISO 8601 reduced precision; FY labels `YYYY-YY`.
- Zero new runtime dependencies. Python stays offline tooling.
- `npm run check` green before every commit touching `src/`, `scripts/` or `research/`; page suites against a pinned `dist` copy (`SECURITY_DIST`); explicit file lists for Node 20; commit only gated batches with the session trailers.
- Frozen channels: tier dash, family hue, type shape, size band; no-data hatch ≠ zero; party is text never colour; every graphic has a table twin.

## Review Focus

1. **A budgets row without a primary source** must fail §4, and a row transcribed from a secondary must carry `reported` in the page caption — Task 1 (validator), Task 7 (page).
2. **A city with no published police budget** must render "inside the state's police head", never a number or a blank — Task 7.
3. **A vendor shown alone** (a filter leaving one vendor card) must be impossible: the class comparison renders with it — Task 7.
4. **An unmarked winner name** from the CPPP slice must never leave the pipeline — Task 2 (tests grep the output).
5. **A case recorded without its counter** must fail the fleet gate: every `enforce` or `alleged` record in money-people carries the other side's `contra` — Task 3 brief, Task 4 reconciliation.

---

### Task 0: Branch, spec, task registry
- [x] Spec written under stated defaults (§8); tasks #20–#25 registered.

### Task 1: Schema extension — tabular `series`
**Files:** `scripts/lib/vocab.mjs`, `scripts/assemble-fleet.mjs`, `scripts/validate.mjs`, `src/graph/fleet.ts`, `src/context/DataContext.tsx`, `scripts/assemble-fleet.test.mjs`
- [ ] RED: fixture tests for valid rows, wrong keys, bad payer, undefined body, duplicate key, footprint without `st`, empty directory, mapping rewrites `body`.
- [ ] Implement `BUDGET_KEYS`/`STRENGTH_KEYS`/`FOOTPRINT_KEYS`, the `SERIES` registry, the `force` FLEETS row, row-problem functions, assembler emission, §4 and §5 checks, types, DataContext wiring.
- [ ] GREEN: `test:assemble`, `generate` (five modules byte-identical; `force.generated.ts` emitted empty), `validate: OK`, `tsc`, build.

### Task 2: CPPP security slice
**Files:** `scripts/cppp/security.py` (or in `build.py`), `scripts/cppp/test_build.py`, `scripts/cppp/fixtures/make_fixture.py`, `scripts/cppp/README.md`, `research/raw/cppp/security.json` (+ the six siblings' `asOf`)
- [ ] Buyer-class map; quality, rates (beside the whole-file rate), bands, timing, concentration (same naming rule), red flags; `readMeFirst` on what is not on CPPP.
- [ ] Tests on a fixture with invented buyers of every class; byte-identical double build over all seven files.

### Task 3: Research fleet `force`
**Files:** `scratchpad/force/SPEC.md`, `scratchpad/force/inventory.json`, `research/raw/force/{union-defence,union-home,state-police,procurement-industry,footprint,money-people,pay-pensions,literature}.json`
- [ ] SPEC from the recon table; inventory rebuilt with the five fleets' ids; `fleet-split.js` DOMAINS table for `force`; two agents at a time; cross-examiner per contested claim; `audit_from_outputs.py force …` → AUDIT.json.

### Task 4: Reconcile and assemble
- [ ] `reconcile2.js` with `fleet: 'force'`; cross-fleet pass (ministers `pol:`, DPSUs `co:`, courts, Atlas ids); `npm run generate` → `src/graph/force.generated.ts`; `validate: OK`; `docs/research/FORCE_LITERATURE.md` as the readable twin.

### Task 5: `/security` design duel, UX review, acceptance, RED suite
**Files:** `docs/design/SECURITY_PAGE.candidate-{A,B}.md`, `SECURITY_JUDGEMENT.md`, `SECURITY_PAGE.md`, `SECURITY_UX_REVIEW.md`, `SECURITY_ACCEPTANCE.md`, `scripts/pages/security.test.mjs`
- [ ] Two interface-designer candidates and a judge; five-seat synthetic UX review applied as amendments; acceptance criteria; test writer blind to the implementation; suite RED against `SECURITY_DIST`.

### Task 6: Route scaffold
**Files:** `src/App.tsx`, `src/components/Layout.tsx`, `scripts/smoke.mjs`
- [ ] `/security` lazy route, nav entry "Security spend" under Registers, smoke URLs (`/security`, `/security?lens=footprint`, `/security?lens=procurement`). Smoke OK before the page exists (scaffold renders the empty state).

### Task 7: Build `/security`
**Files:** `src/pages/Security.tsx`, `src/components/security/*`, `src/data/securityView.ts`
- [ ] `page-build2.js` with a `security` entry: build → caucus (five `sc-*` + house semantics) → fix → verify 3× pinned → WCAG; adjudication follow-up for red criteria (criterion defect vs page defect, `[Adjudicated]` marks); suite into `test:pages` once green 3×.

### Task 8: Explorer and register joins
- [x] `/tenders` national section gains a "security buyers" line (`src/components/tenders/SecurityBuyers.tsx`, after the rates subsection) linking to `/security?lens=procurement`; the slice loads through `loadSecurity()` in `src/data/cppp.ts`, which the procurement lens shares.
- [x] `/network` layer filter: **not extended.** Its layers (`all | atlas | political | capital`) are cut by entity family over `buildNationalGraph()`, not by fleet; no fleet (energy, welfare, finance) is a layer there, so a lone `force` layer would misdescribe the page. The force graph reaches the explorer through `DataContext` like the other fleets, and `/security` carries its own explorer.
- [ ] The as-of filter is exercised on the DAC awards on `/security` (build stage; the awards carry `date`).

### Task 9: Skill and agent
**Files:** `.claude/skills/force-money-trail/{SKILL.md,references/ledger.md,references/narratives.md}`, `.claude/agents/security-analyst.md`
- [ ] Written from the fleet's output and audits; refusals listed in the spec §5.

### Task 10: Docs, gates, bundle
**Files:** `HANDOFF.md`, `docs/INDEX.md`, `docs/CUSTOM_PLAN.md` (Phase H), `README.md`, `docs/PLUGINS.md`, `docs/BUNDLE.md`, `docs/research/DATA_SOURCES.md`
- [ ] Counts read from META blocks and outputs; `npm run check` green; bundle re-cut; push; PR only when asked.
