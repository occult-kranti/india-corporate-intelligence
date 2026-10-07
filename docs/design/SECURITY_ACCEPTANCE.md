# /security: acceptance criteria

*Written 2026-10-04 against `docs/design/SECURITY_PAGE.md` (the judged spec, with UX
amendments U1–U33 applied in place and decisions D1–D61 resolved). Procedure shape: the
SweetClaude `product-user-stories` skill — a defined scope, numbered ids, a short verb-phrase
title per item, and acceptance criteria stated as observable behaviour — in the generic (not
Gherkin) format, scoped to **everything** the brief asked to cover. That skill's state files,
manifest, personas prompts and log steps are not used: this repository has no `.sweetclaude/`,
and the criteria live here, next to the spec they test. There is no `personas.yaml`; the five
**synthetic** seats of `SECURITY_UX_REVIEW.md` (J journalist, P policy researcher, S hostile
skeptic, A screen-reader user, M phone reader) are named only to say whom a group serves.*

*Every criterion is one observable behaviour of the **built** page, verified by a headless
Playwright check against `dist`, the way `scripts/smoke.mjs`, `scripts/pages/energy.test.mjs`,
`welfare.test.mjs`, `tenders.test.mjs` and `finance.test.mjs` already work: the check serves
`dist` itself, opens `${base}/#/security…` (HashRouter, so search params sit inside the hash)
and reads the DOM. No criterion reads `src/pages/`, `src/components/` or
`src/data/securityView.ts`, with one exception: AC-139 reads the `FAMILY_COLOR` literal of
`src/components/viz/ForceGraph.tsx` as text, never by import (§0.5), and no other file under
`src/components/`. [Adjudicated 2026-10-06: spec §8.1 fixes family hue as "unchanged from
`ForceGraph`" and the data contract places `FAMILY_COLOR` only in that shared house component,
which this page consumes but does not own, so it is the spec's reference value, not the code
under test; `KINDS` is read as text from `src/graph/fleet.ts` the same way.] Expected values are computed by the check from the **generated
module** (`src/graph/force.generated.ts`), from `research/raw/cppp/security-page.json` (the slim
page file; §0.5 `SLICE` [Adjudicated 2026-10-07]), from
`src/data/india-geo.json` and from the Atlas and fleet data modules it needs for labels, as spec
§16 requires — never from a brief, a caption, spec §0.2 or this document. The module under
test on 2026-10-04 is already a different run from the one the spec's §0.2 was read against
(`run-e465801f618c`: 264 nodes, 379 edges, 22 killed, 4,097 budget rows), which is why no
number below is a literal. Where a criterion depends on a record being present, the check
derives the fixture from the module; when the module holds none it reports `SKIPPED:
<reason>` — never a pass. A criterion that cannot be written as a Playwright assertion
against `dist` does not belong on this list.*

*Five of the spec's §16 gates are **not** promoted here, and the reason is stated so nobody
reads their absence as an oversight: SG-1 (anchors exist in the module), SG-3 (no numeric
literal in page source), SG-5 (regex anchors against the test's rule), SG-16 (`VENDORS`,
`CASE_PAIRS` and `comparatorsOf` as derivations) and SG-50 (chunk contents) read source or the
bundler's output, not the page, and belong in `scripts/security-view.test.mjs` or a build
script; SG-38's second half is the energy, welfare, finance and tenders suites themselves,
which stay their own gates. SG-45 (axe-core) needs a dependency the repository forbids; its
structural content is spelt out in §8 instead. The spec's deferred amendments (UD1–UD46) are
not criteria. Every other §16 gate maps to at least one criterion in §11.*

---

## 0. Conventions every check shares

### 0.1 Routing, loading, errors

- `HashRouter`: a parameterised URL is `${base}/#/security?lens=procurement&vendor=force:adani-defence`.
  Read the live URL with `new URL(page.url()).hash` and parse its `?…` part with
  `URLSearchParams`.
- Every navigation goes through `about:blank` first (smoke's rule: hash-only navigation does
  not reload), then `page.goto(url, { waitUntil: 'networkidle' })`, then waits for
  `article.pb-20` and for `main h1` (the page's h1; the Layout's wordmark `<h1>ICIP</h1>` is
  outside `main`, hidden below `lg`, and is not the page's — the finance adjudication of the
  same point applies), then settles 700 ms. A check that opens the connection graph waits a
  further 1,800 ms (fixed tick count). A check that reads the open-market slice (Procurement
  Q2) first waits until no element reads `Loading the open-market slice…` (timeout 5 s): the
  slice is a code-split chunk loaded after mount, not a network fetch.
- `console` errors and `pageerror` events are collected on every route with smoke's
  `EXTERNAL` allow-list, verbatim, plus finance's adjudicated favicon exclusion
  (`|vite\.svg|is not a secure context and the resource is in more-private address space`,
  and a bare `Failed to load resource: net::ERR_FAILED` whose preceding `requestfailed` was
  `/vite.svg`); **any other error fails the criterion under way**.

### 0.2 Browser contexts

| name | viewport | flags |
|---|---|---|
| `D` | 1440 × 900 | — |
| `FOLD` | 1280 × 800 | — |
| `M` | 390 × 844 | `isMobile: true`, `hasTouch: true` |
| `M360` | 360 × 780 | `isMobile: true`, `hasTouch: true` |

Every context: `reducedMotion: 'reduce'` (instant, deterministic scrolls),
`permissions: ['clipboard-read', 'clipboard-write']`, `acceptDownloads: true`. A criterion
names the context(s) it runs at; unmarked means `D`.

### 0.3 Three builds

Data is compiled in, so a check cannot switch data at runtime. The criteria run against three
`dist`s, as spec §16 requires.

| build | how | used by |
|---|---|---|
| **FULL** | `dist` from the current generated module (`npm run generate && npm run build`). | §2–§10 |
| **EMPTY** | `dist-empty-security`, built from a scratchpad copy of the repository in which `research/raw/force/` is absent, so `node scripts/assemble-fleet.mjs` writes `src/graph/force.generated.ts` with `FORCE_META.empty === true`, then `npx vite build --outDir dist-empty-security`. | §1 AC-01 … AC-08 |
| **ZERO-SERIES** | `dist-zero-security`, built from a scratchpad copy in which every top-level `budgets`, `strength` and `footprint` key is deleted from each `research/raw/force/*.json` (the assembler writes `[]` for a declared series whose key is absent, so `FORCE_BUDGETS`, `FORCE_STRENGTH` and `FORCE_FOOTPRINT` are `[]`, `FORCE_META.series` is all zeros, and the graph is unchanged), then `npx vite build --outDir dist-zero-security`. The check asserts those three facts on the scratch module before building. | §1 AC-09 … AC-12 |

`research/raw/` and `*.generated.ts` in the working tree are **never** edited to get either
state; each cache has its own name so it cannot swap data with `dist-empty` (energy) or
`dist-empty-finance`. The build is detected from the DOM (EMPTY carries the `Register not yet
promoted` callout; ZERO-SERIES carries `This register holds no budget rows in this build.`);
`SECURITY_BUILD=full|empty|zero` overrides, `SECURITY_DIST=<dir>` points at a scratchpad copy
of `dist` so a concurrent rebuild cannot poison a run, `SECURITY_REBUILD_EMPTY=1` /
`SECURITY_REBUILD_ZERO=1` rebuild a cache, `SECURITY_SHOTS=<dir>` saves AC-138's greyscale
screenshots.

### 0.4 Prerequisite exports — the (S) branches

Spec §3.3 names generator and data changes the page works without and improves with. A
criterion marked **(S)** states both branches; the check decides the branch from the data, not
from the page, and asserts the one that applies. On 2026-10-04 only `S8` holds.

| handle | true when (read by the check) | governs |
|---|---|---|
| `S1` | a `FORCE_BUDGETS` row carries a `level` field | demand-level selection by field; lanes joined across renumbering |
| `S2` | a `grant-to-states` row carries `recipient` | grants map; `st` on grants |
| `S3` | `FORCE_DENOMINATORS` is exported and non-empty | `m=percap` default; `% of GDP` strip |
| `S4` | a budget, strength or footprint row carries `tier` | tier from the field, not the `reported:` prefix; `derived` field |
| `S5` | `FORCE_VENDOR_CLASS` is exported and non-empty | four vendor classes as labels inside the family hue |
| `S6` | `FORCE_OUTCOMES` is exported and non-empty | a 36 × years outcomes table |
| `S7` | a footprint row carries `lat` and `lon` | point layer at addresses |
| `S8` | `research/raw/cppp/security-page.json` exists and parses with `rates.byClass` [Adjudicated 2026-10-07: the slim page file; see `SLICE`] | the open-market slice renders instead of the absence sentence |
| `S9` | a `FORCE_STRENGTH` row's `body` is a commissionerate body (`force:{city}-police` of a footprint `commissionerate` row) | strength on the city ledger |
| `S10` | the footprint file declares per-kind `coverage` (visible as a `FORCE_FOOTPRINT_COVERAGE` export) | hollow empty state for an enumerated kind |
| `S11` | claims carry `caseId`, or `FORCE_CASES` is exported | complete case files; decision and office fields |
| `S12` | a `FORCE_BASE_RATES` row carries `fy` and `kind` | a `% of GDP` lane |
| `S13` | a `pay-pensions` `law` edge carries `replaces` | old and new terms side by side |

### 0.5 Fixtures derived from the generated module (FULL build)

Computed once before the run, independently of `securityView.ts`, from the module arrays
(the module is transpiled with esbuild and imported, as the finance suite does). Nothing
below is a literal in any check. `nodeOf(id)` = the first match in `FORCE_NODES`, then in the
Atlas (`src/graph/data.ts`) and the other fleets' `_NODES`; a miss is `{id} (not in the register)`.

| handle | derivation |
|---|---|
| `ASOF`, `RUN`, `KILLED` | `FORCE_META.asOf`, `.runId`, `.killed` (array of `{id, lab, killedReason}`; `[]` when absent) |
| `MOD`, `MHA`, `DELHI_POLICE`, `PENSIONS_BODY`, `DEFENCE_BODIES` | the ids spec §3.2 fixes; each must be a `body` of ≥ 1 budget row or a node id, else the run aborts with the missing anchor named (this is SG-1's observable half) |
| `UNION_ROWS`, `STATE_ROWS` | `FORCE_BUDGETS` with `payer === 'union'` / the rest |
| `FY_AXIS` | every `YYYY-YY` label from the minimum to the maximum start year over `FORCE_BUDGETS.fy`, gaps included |
| `isDemandLevel(r)` | (S1) `r.level === 'demand'`; else `/^Demand \d+ — [^:]+?( \(Summary of Demands for Grants, BE\))?$/.test(r.head)` — the test's **own** implementation of the spec's F5 rule, written here, not imported |
| `DEFENCE_DEMANDS(fy, stage)` | `UNION_ROWS` with `body ∈ DEFENCE_BODIES`, `isDemandLevel`, that `(fy, stage)`; rows **without** the Summary suffix when any exist for that `(fy, stage)`, else the Summary rows |
| `STACK(fy, stage)` | `{bands: DEFENCE_DEMANDS grouped by component, sum: Σ cr, published: cr of the row with head === 'Ministry of Defence — all demands (Summary of Demands for Grants, BE)' and that (fy, stage), or null}`; `recon` = `equal` when `\|sum − published\| ≤ 0.5`, `differs` otherwise, `none` when no published |
| `DEFAULT_STAGE` | the stage with the most distinct `fy` among `DEFENCE_DEMANDS` rows; ties → `actual` > `RE` > `BE` |
| `LATEST_FY(stage)` | the latest `fy` with ≥ 1 `DEFENCE_DEMANDS` row at that stage |
| `PARTIAL(stage)` | an `(fy, stage)` whose `DEFENCE_DEMANDS` count is below the maximum count of any `fy` at that stage **and** whose component set is a strict subset of the stage's union of components; skip AC-50 when none |
| `MISSING(stage)` | an `fy ∈ FY_AXIS` with no `DEFENCE_DEMANDS` row at that stage; skip when none |
| `PENSION_SHARE(fy, stage)` | pension band ÷ (`published` when present, else `sum`), × 100, 2 dp; `BASIS(fy, stage)` = `of published total` / `of stack, computed here` |
| `POLICE(fy, stage)` | the three rows whose head contains `(whole demand)` and `body === MHA` or whose head begins `Demand` and contains `Police: Grand Total`, by component |
| `DELHI(fy, stage)` | `DELHI_POLICE` rows of that `(fy, stage)` by component |
| `PAY(fy, stage)` | `UNION_ROWS` with `component === 'pay'`, `body ∈ DEFENCE_BODIES`, that `(fy, stage)` |
| `LANE_KEY(r)` | `${r.body}\|${r.component}\|${r.head.replace(/^Demand \d+ — /, '').replace(/ \(Summary of Demands for Grants, BE\)$/, '')}`; `LANES` = distinct keys over `UNION_ROWS` minus `grant-to-states`; `LANE_ROWS(key)` |
| `CAPF_SAMPLE` | the Union `body` with the most budget rows whose id is not in `DEFENCE_BODIES`, not `MHA`, not `DELHI_POLICE`, and whose node label matches `/CRPF|BSF|CISF|ITBP|SSB|Assam Rifles|NSG/`; else the Union body with the most rows outside those ids |
| `CELL_SAMPLE` | the `(LANE_KEY, fy)` of `CAPF_SAMPLE` with rows at ≥ 2 stages; else at 1 |
| `CELL_PARAM` | the value the page itself writes for `CELL_SAMPLE`: load `?body={CELL_SAMPLE body}`, focus the ledger cell button whose accessible name begins `{body label} — {component} — {line}, FY{fy}:` (matched on body, component **and** line), press `Enter`, read `cell` from the URL. Wherever this document writes `cell=CELL_SAMPLE` it means `cell=CELL_PARAM`. [Adjudicated 2026-10-06: spec §4 fixes `cell` as `{laneKey slug}@{fy}` but never defines the slug, and `CELL_SAMPLE` is a pair, not a URL value; the check neither builds a slug nor reads one from source, and holds the page only to what §4 fixes (AC-85)] |
| `ZERO_ROW`, `ZERO_COUNT` | the first `FORCE_BUDGETS` row with `cr === 0` (code-unit order of `head`, then `fy`); the count; skip AC-52 when none |
| `REPORTED_ROWS` | budget, strength and footprint rows whose `note` begins `reported:` (S4: `tier === 'reported'`) |
| `LAKH_ROWS` | budget rows whose `note` begins `RBI Appendix II prints ₹ lakh; converted to ₹ crore (÷100).`; skip the (U13) clauses when none |
| `STATE_SERIES` | `STATE_ROWS` with `head === 'Police (MH 2055)'` |
| `STATE_PAIRS` | distinct `(fy, stage)` over `STATE_SERIES` with their state counts |
| `GSDP`, `GSDP_FY` | `STATE_ECONOMY.gsdpCr` and `.gsdpYear` per unit, read from `src/data/companies.ts` (a data module); `GSDP_FY` is the one FY label the year names |
| `DEFAULT_PAIR(m)` | among `STATE_PAIRS` (under `gsdp`, those whose `fy === GSDP_FY`), the one with most states; ties → `actual` > `RE` > `BE`, then latest `fy` |
| `SPEND_CLASS(st, pair, m)` | `union-funded` for `dl`; `no-row` when no `STATE_SERIES` row for `(st, pair)`; `no-denominator` when `m === 'gsdp'` and `GSDP[st]` is null; else `value` |
| `STRENGTH_YEARS`, `DEFAULT_SY` | distinct `year` over `FORCE_STRENGTH` with `st`; the year with most rows carrying `perLakh`, ties → latest |
| `STRENGTH_CLASS(st, sy)` | `no-row` / `counts-only` (a row with `perLakh === null`) / `value` |
| `UNITS` | the 36 `StateCode`s of `src/data/india-geo.json`, north to south by `MAP_ORDER`'s rule (label anchor latitude descending, as the welfare suite derives it) |
| `COMMISSIONERATES`, `CITY_SAMPLE` | footprint rows with `kind === 'commissionerate'`; the first by `(UNITS order of st, city)` — its `city`, `body`, `st` |
| `CITY_BODIES` | `COMMISSIONERATES.body` ∪ every node id matching `/-police$/` that is not `DELHI_POLICE` and not a `body` of a `STATE_SERIES` row |
| `FAMILY_COLOR` | the object literal of the `const FAMILY_COLOR` declaration in `src/components/viz/ForceGraph.tsx`, read as text (never imported), key → 6-digit hex; the run aborts with the handle and file named unless `state` and `capital` each parse to a `#rrggbb` value and the two differ [Adjudicated 2026-10-06: the only source the spec names for the frozen family hues (data contract; §8.1); the house palette has no data-module home] |
| `KINDS` | the eleven `FootprintKind` literals as `src/graph/fleet.ts` lists them (read as text from that type file) ∪ distinct `FORCE_FOOTPRINT.kind`; `EMPTY_KINDS` = those with no row |
| `FP_BY_STATE(kinds)`, `FP_NONE` | counts per unit; a unit with no footprint row |
| `AWARDS` | `FORCE_EDGES` with `pred === 'award'`, `s === MOD`, `tier !== 'alleged'`; `PRICED` / `UNPRICED` by `Number.isFinite(a)`; `AWARD_YEARS` = calendar years of `from`; `EMPTY_YEARS` = years between min and max with none |
| `ALLEGED_AWARDS` | `pred === 'award'`, `tier === 'alleged'`; skip when none |
| `JOINT` | an `award` whose `lab` or `d` names two vendors of `VENDORS` and carries one `a`; skip E14 clauses when none |
| `vendorClass(id)` | (S5) the declared class; else `nodeOf(id).fam === 'state'` → `public`, `=== 'capital'` → `private`, else `unclassified` |
| `VENDORS` | `AWARDS.t` ∪ `ALLEGED_AWARDS.t` ∪ the other endpoint of every `analytic` edge with one endpoint in that set and the other with `nodeOf().ty ∈ {company, psu}` ∪ footprint `dpsu-plant`/`other` bodies with `ty ∈ {company, psu}` ∪ `bond.s` ∪ `role.t` with `ty ∈ {company, psu}` |
| `COMPARATORS(v)` | the other endpoints of `analytic` edges joining `v` to another member of `VENDORS` |
| `VENDOR_NO_AWARD` | a member of `VENDORS` with no `AWARDS` row as `t` and ≥ 1 comparator; skip when none |
| `VENDOR_WITH_OWN` | a member of `VENDORS` that is `s` of ≥ 1 `own` edge whose `t` is in `VENDORS`; skip when none |
| `PUBLIC_V`, `PRIVATE_V`, `UNCLASS_V` | `VENDORS` partitioned by `vendorClass` |
| `CASES` | node ids beginning `force:case-`; `CASE_PAIRS` = unordered pairs `{a, b}` with an `analytic` edge whose `s` and `t` are both in `CASES`; `UNPAIRED` = cases in no pair; `FIRST_RECORD(c)` = the earliest `from` over edges touching `c`; pairs ordered by `min(FIRST_RECORD(a), FIRST_RECORD(b))`; `FIRST_PAIR` = the first |
| `CASE_FILE(c)` | edges whose `s` or `t` is `c`, or whose `s`/`t` is a party of `c` joined to `c` by `direct`, `award` or `sector`, minus `contra` and pair edges |
| `ENFORCE_NO_CONTRA`, `ENFORCE_WITH_CONTRA` | an `enforce` edge in some `CASE_FILE` with no / ≥ 1 `contra` whose `t === 'claim:' + id`; skip when none |
| `ALLEGED` | `tier === 'alleged' && pred !== 'contra'`; `ANSWERED` = those with ≥ 1 such `contra` |
| `REPLY` | a `contra` whose `t` is `'claim:' + id` of another `contra`; skip AC-70 when none |
| `AUDIT_CONTRA` | a `contra` whose id ends `:audit-contra` or whose `lab === 'denial found in audit'`; skip AC-71 when none |
| `ANALYTIC_SHOWN` | `analytic` edges whose `lab` or `d` the check finds in the DOM on a lens |
| `ROLE_WINDOWS`, `OPEN_ENDED` | `role` edges grouped by `(s, t, from, to)`; windows with no `to` |
| `BOARD_PAIRS` | persons with a `role` into a `ty ∈ {ministry, agency}` node and a `role` into a `ty ∈ {company, psu}` node; skip when none |
| `BONDS`, `DONORS`, `PARTIES` | `pred === 'bond'`; distinct `s`; distinct `t` |
| `LAWS`, `CONTRACTS` | `law` edges with `FORCE_EDGE_DOMAIN[id] === 'pay-pensions'`; those whose `s` is not a pay-commission node (`nodeOf(s).label` matching `/Pay Commission/`) or whose `t` has `ty !== 'group'` |
| `PARTY_WORDS` | every `label` and `al[]` of every node with `ty === 'party'` in the Atlas and every fleet module, plus `UPA`, `NDA`, `BJP`, `Congress`, `ruling`, `opposition`, `government of the day`, `era`, `regime`, `incumbent`, `government's` |
| `VOIDS(domains)`, `GAPS(domains)` | `FORCE_VOIDS` / `FORCE_GAPS` filtered by `domain`; `LENS_DOMAINS` as spec §3.2 |
| `BASE_RATES(domain)`, `SYMMETRY(domain)` | `FORCE_BASE_RATES` by `domain`; the `FORCE_SYMMETRY` text for the domain or null |
| `TWO_FIGURES` | a base-rate row with `numerator > denominator` or a non-integer figure and no (S12) share kind; skip AC-40's last clause when none |
| `SLICE` | the parsed `research/raw/cppp/security-page.json`: `readMeFirst`, `caveat`, `rates.byClass`, `rates.byClassYear`, `rates.total`, `rates.excludingWorks`, `quality.total`, `quality.byClass`, `classes.definitions`, `classes.map`, `provenance`; `SMALL_YEARS` = class-years with `n < 10`; `CAPF_CLASS` = the class whose key is `capf`; `WORKS_BUYER_PCT` = the largest works-class buyer's `rows` in `classes.map` ÷ `quality.total.dedupRows` × 100, to 2 dp (74.41 in this build); `WORKS_CLASS_PCT` = the works class's `quality.byClass` `dedupRows` ÷ `quality.total.dedupRows` × 100, to 2 dp (75.79) [Adjudicated 2026-10-07: the check reads the slim page file the page itself loads (spec §3.2 SLICE), projected from `security.json`, whose `byClass`/`byClassYear`/`quality`/`readMeFirst`/`caveat` fields it carries unchanged; `security.json` also carries `topMarkedWinners`, winner lists the page must not load (C14)] |
| `UNRESOLVED` | edge ids with an endpoint that `nodeOf` cannot resolve anywhere |
| `EMPTY_SRCS` | edges with `srcs.length === 0` and `tier ∉ {alleged, analytic}` or with `srcs.length === 0` at all; skip AC-62 when none |

### 0.6 Test hooks the build must emit

The spec fixes most text and roles. Where it fixes none, the build emits these attributes.
They carry no style and no meaning (spec §8.2 rule 2: no new channel) and exist only so a
check can count things the way a reader sees them. Every value is a fixed word from this
table or, for `data-column`, `data-lane` and `data-case`, the register key the row names, copied
exactly; none is printed, styled or announced. A check reads these values and never falls back
to label text or DOM position. [Adjudicated 2026-10-06] The three rows named no value while
AC-34, AC-49, AC-50, AC-73, AC-87, AC-127, AC-128, AC-140 and AC-144 address "the column for that
FY" or "`[data-case]` for `force:case-bofors`", and falling back to position assumes the order
AC-49 and AC-144 exist to verify; the FY label is allowed as a value although the axis shows it,
because an attribute value is never read as page copy.

| hook | on | why |
|---|---|---|
| `data-caption="C1"…"C21"` (and `"C4b"`) | each spec caption element (§9) | a caption is found by id, not by matching prose whose `{braces}` vary |
| `data-q="B1"…"B9" \| "F1"…"F5" \| "P0"…"P6"` | each Q-block `<section aria-labelledby>` | numbering never shifts; blocks are found by address |
| `data-twin="stack \| office \| ledger-long \| ledger-coverage \| compare \| pay \| contracts \| spend-map \| strength-map \| state-table \| delhi \| city-ledger \| grants \| footprint-matrix \| places \| awards \| vendors \| slice \| bonds \| board \| case-timeline \| case-fields \| narratives"` | each twin `<details>` | twins are found by name, not position |
| `data-column="{fy}"`, the `FY_AXIS` label exactly (e.g. `2024-25`, no `FY` prefix), with `data-column-state="full \| partial \| hatched \| hidden"` and `data-panel="defence \| police"` [Adjudicated 2026-10-06: value fixed, see above] | each stack column group | columns are counted against `FY_AXIS` and matched to it by value, never by position (a reordered or closed-up axis fails), and their state read without parsing |
| `data-band="revenue \| capital \| civil \| pension"` with `data-cr` | each drawn stack band | band values against `STACK` |
| `data-glyph="equal \| differs \| none"` | each reconciliation glyph (the visible `=`/`≠`/`·` is `aria-hidden`) | reconciliation against `STACK.recon` |
| `data-tick="published \| agnipath \| pay \| delhi \| police-pay"` | each stack tick or bracket | ticks are drawings; their values are read from the twin |
| `data-lane="{key}"`, the `LANE_KEY` (§0.5; spec §3.2 `laneKey(r)`: `{body}\|{component}\|{line}`, the `Demand N — ` prefix and edition suffix stripped; with S1 `{body}\|{line}`) exactly, one value per lane, and `data-lane-group="published \| body \| city"` [Adjudicated 2026-10-06: value fixed, see above] | each ledger lane `th[scope="row"]` | lane counts, and each lane matched to `LANE_ROWS(key)` by value, never by label text; every lane carries one |
| `data-slot="BE \| RE \| actual"` with `data-slot-state="row \| two \| zero \| hatch \| hidden"` | each ledger cell slot | slot states against `LANE_ROWS` |
| `data-fill-class="value \| hatch \| zero \| crosshatch \| stipple \| hollow \| hidden"` | each unit `<path>` on the two state maps and the footprint map | legend and twin classes compared to painted classes |
| `data-dot` | each footprint installation dot (and `data-overflow="{k}"` on a `+{k}` mark) | dot counts against `FP_BY_STATE` |
| `data-mark="award \| award-unpriced \| office \| case \| response \| delhi"` with `data-cr` where priced | each drawn mark | mark counts against twin rows |
| `data-class="{key}"` and `data-rate` with `data-n` | each slice class row and each drawn rate dot | rates against `SLICE` |
| `data-cr` | **every** element whose text prints a ₹ figure | the denominator, as-of and SG-4 checks find every ₹ without parsing layout |
| `data-pair`, and `data-case="{id}"`, the case node id exactly (e.g. `force:case-bofors`); the right `<dl>` of an `UNPAIRED` case's row, which holds the pairing sentence, carries `data-case="none"` [Adjudicated 2026-10-06: value fixed, see above; AC-73 reads that `<dl>` as the row's second `[data-case]`, so it needs a value that is not a case] | each pair-row `<section>` and each case column `<dl>` | pair order and column equality, read by id, never by label text; `[data-case]:not([data-case="none"])` count = `CASES.length` |
| `data-vendor-card` and `data-field="1"…"12" \| "3b"` | each vendor `<dl>` and each of its `dt`s | identical fields |
| `data-response="true \| false"` | each response slot (contract cards, case fields, Contested) | slots against responses |
| `data-reply-depth="1"…"3"` | each reply `<li>` | nesting against chain depth |
| `data-city-body="{id}"` | every element whose text names a `CITY_BODIES` member (ledger cells, Find results, panel lines, twin cells) | the no-city-₹ gate |
| `data-effect` | every `{N} → {k}` filter-effect element | the `k` every twin row count is compared with |
| `data-pinned-stack` | the wrapper of site header + one-line strip + tabs below 640 | the ≤ 140 px budget |
| `data-page-copy` | the Standfirst, standing line, kicker, each `[data-caption]`, each Q-block `h3` and chapter/pair `h4`, the rail-foot refusal line, the refusals list, every denominator line, every `AnswerLine`, the gaps header | the British-spelling and partisan-frame checks read only page-authored prose, never quoted research text |
| `data-quoted` | every element whose text is research wording (`lab`, `d`, `sub`, `innocentReading`, symmetry texts, narrative text, base-rate labels, void and gap text, role labels, notes) | excluded from the two checks above |

### 0.7 Shared procedures

- **ROUND-TRIP(param=value)** — (1) load `/#/security?{param}={value}` and assert the control
  state named; (2) change the control once through the UI and assert `history.length` is
  unchanged (`replace`, not push) and the URL now carries the new value; (3) open
  `page.url()` in a fresh page and assert the `innerText` of the strip, of every `<figure>`
  and of the active-filter line equals the first page's; (4) when `{param}` is a page filter
  (`payer`, `st`, `fy`, `stage`, `comp`, `kind`, `tier`; spec §6), an active-filter line is
  present and names the value in the words its control shows, never the param code or the raw
  value code: the unit's name (not its code), the FY or `FY {a}–{b}`, `stage {s}`,
  `components: {list}`, each kind's and each tier's word. Step (4) does not require the line
  to name `lens` or `view` (tab and display state, which `reset` never clears), `tp` (a page of
  a table), `sfy`, `m` or `sy` (one map's pair, metric or year), `body`, `vendor` or `case`
  (accents that spec §3.4 says never filter) or `cell` or `rec` (open cards); the line must not
  present any of them as a filter, it is still compared in step (3), and the value's visible
  state is asserted instead by the criterion's own check (the control selected or pressed, or
  the value printed in the card, the denominator line or the map heading it names); (5) set
  the control back to its default and assert `{param}` leaves the URL (defaults are elided).
  [Adjudicated 2026-10-06] Step (4) as first written applied to every param, which would put
  selections, the tab and the table mode on a line headed `filters:` that appears only when a
  page filter is set (finance §5.0.4, adopted by spec §5.0.4) and would say a never-filtering
  accent narrows the register (§3.4, Review Focus 3).
  [Adjudicated 2026-10-07 — `find`: Reading B, decided by the lead] The spec's own tables settle
  it: §4 gives `find` the reach "the results list only" and §6 prints "filters nothing" on the
  control, and AC-91 is titled "filter nothing by it". So the active-filter line need not name
  the Find text and must not present it as a filter; the Find input showing the query is its
  visible state; `reset` still clears it (AC-95 is unchanged). Reading A is kept below as the
  record of the disagreement. Reading A: `find` is a page filter for
  step (4) — `reset` clears it, AC-95 groups it with `st`, `kind`, `tier` and `fy`, finance
  required it on the line, and §3.4 does not mark it "never filters" (it narrows the results
  list) — so the line names the Find text. Reading B: `find` is not a filter — spec §6 prints
  "filters nothing" on the control and §4 gives its reach as "the results list only", and AC-91
  is titled "filter nothing by it" — so the line is not required to name it, must not present
  it as a filter, and the Find input showing the query is its visible state.
- **TWIN(name)** — `details[data-twin="{name}"]`: opened by clicking its `summary`, or already
  open under `view=table`; row count = `tbody tr` inside it (at `M`, the `StackTable` cards:
  `[data-row]` inside it).
- **TEXT(el)** — `innerText` after the settle; exact-string comparisons use the Unicode the
  spec prints (`—` U+2014, `→` U+2192, `≥` U+2265, `·` U+00B7, `≠` U+2260, `‹ ›` U+2039/U+203A).
- **TABBABLE** — `a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, summary, [tabindex]:not([tabindex="-1"])`.
- **NO-HSCROLL(url, ctx)** — `document.scrollingElement.scrollWidth <= window.innerWidth` at
  `scrollY = 0` and after scrolling to the bottom in steps of ten viewport heights; no element's
  `getBoundingClientRect().right > innerWidth` except inside an ancestor with `overflow-x:
  auto|scroll`.
- **GREY(shot)** — the screenshot converted to luminance (`0.2126R + 0.7152G + 0.0722B`);
  two textures are distinct when the mean luminance of a 12 × 12 px sample of each differs by
  ≥ 8 on the 0–255 scale **or** their pixel-variance differs by ≥ 400 (a hatch and a flat fill
  of the same mean are distinct by variance).
- **CR-CONTEXT(el)** — `el.closest('[data-cr]')`'s `innerText` matches
  `/₹[\d,.]+ of ₹[\d,.]+ cr, [\d.]+% of the published .+, computed here|no published total for this line's demand in FY|[\d.]+% of GSDP .+ \(reported series\), computed here|no same-year denominator in this register \(S3\)|no denominator published for this line|% of published total|% of stack, computed here|amount not stated/`
  **and** `/FY\d{4}-\d{2} (BE|RE|actual): ₹[\d,.]+ cr|no (BE|RE|actual) row for FY\d{4}-\d{2}|previous year not applicable/`
  (the second alternative set is the comparison; a base-rate, award, bond or benefit ₹ carries
  the comparison words `previous year not applicable` or its own `a of b`).

---

## 1. Scaffold state — EMPTY and ZERO-SERIES builds (seats M, A, J)

*Why: a page with zero records that renders an empty chart has published a finding of
nothing. The page must render fully and say, before any number, that nothing below is zero.*

### AC-01 — Render the empty page with ≥ 200 characters and no errors
- **Behaviour:** With the force register absent, `/security` renders its chrome, not a blank.
- **Check (EMPTY, `D` and `M`):** `goto('/#/security')`, then `?lens=footprint`, then
  `?lens=procurement`: on each, `document.body.innerText.length >= 200`; `article.pb-20`
  exists; `main h1` text is `The money India spends on force`; the kicker reads `Security spend
  · defence, police, intelligence and the bodies around them`; zero console errors, zero page
  errors.

### AC-02 — Say the register is not promoted, before any figure
- **Check (EMPTY):** Exactly one element whose own text is `Register not yet promoted` (the
  callout label; substring matches in the byline and strip excluded) exists; by
  `compareDocumentPosition` it follows the `Standfirst` and precedes `#resolution`. The byline
  contains `force: register not yet promoted`. No element matching `[data-cr]` exists on any
  lens.

### AC-03 — Keep the resolution statement's words and replace its counts with the empty wording
- **Check (EMPTY):** `#resolution` exists on every lens with a visible `h2` `What resolves at
  which level` and three `dt`s `Union — to the line`, `State — to the Police head`, `City — to
  the footprint, and Delhi`; each `dd`'s first text node equals its fixed sentence from spec
  §5.0.1 (compared in full); each `dd`'s mono line reads exactly `register not yet promoted —
  nothing below is zero`; none matches `/\b0 (line rows|of 36|commissionerates)/`.

### AC-04 — Replace the strip and reconciliation counts with the empty wording, never 0
- **Check (EMPTY):** `section[aria-label="Denominators"]` contains `register not yet promoted
  · nothing below is zero` and matches none of `/\b0 of\b/`, `/₹0 cr/`, `/\b0 budget rows/`,
  `/\b0 installations/`, `/\b0 contracts/`. The `ReconciliationLine` element is present on each
  lens and contains `register not yet promoted`, not a `=` sum.

### AC-05 — Render every Q-block heading with the empty sentence, numbering intact
- **Check (EMPTY):** On Budgets `[data-q]` count = 9 (`B1`…`B9`), on Footprint 5, on
  Procurement 7 (`P0`…`P6`); each block's `h3` text equals its `Q{n} — {question}` from spec
  §2.1 verbatim; each block (other than the `CannotShow` block) contains `Nothing recorded
  yet.`; the `CannotShow` block's header matches `/0 voids and 0 gaps recorded by the research,
  0 claim\(s\) killed in audit, and (\d+) derived by this page/`.

### AC-06 — Draw the FY axis with no columns and hatch all 36 units
- **Check (EMPTY, Budgets):** the `DemandStack` figure (`[data-q="B1"] figure`) renders an
  axis element with no `[data-column]` and the text `Register not yet promoted — nothing below
  is zero`; the ledger (`B3`) renders no `[data-lane]` and the same words. In `B6`, each of the
  two `svg[role="listbox"]` has `path[data-fill-class="hatch"]` count = 36 and no other
  `data-fill-class`; each legend reads `no state rows in this build`. On Footprint `F1`,
  `path[data-fill-class="hatch"]` count = 36 and `[data-dot]` count = 0.

### AC-07 — Keep the frames: 36-row state table, vendor bands, case pairs, six rungs, control card
- **Check (EMPTY):** `TWIN(state-table)` opened has 36 rows, each reading `register not yet
  promoted` in its first data cell. On Procurement: both class-band headings (`public sector`
  and `private, JV or foreign`) render with 0 `[data-vendor-card]`; the pair section renders
  `No case record in this register.`; `#narratives` lists six rungs each reading `none in this
  file`; the `ControlCard` contains exactly `No symmetry check recorded for this lens — the
  control has not been run. This is a gap, not a pass.` with computed `color` equal to the
  page's amber token (`getComputedStyle` of a `.text-amber` element).

### AC-08 — Answer Find honestly on an empty register
- **Check (EMPTY):** Type `Mumbai` into `input[type="search"]`, wait 400 ms: the results region
  reads exactly `No body, place, vendor, case or record in this register matches "Mumbai". This
  is a statement about the register, not about the world.`; the URL carries `find=Mumbai`.

### AC-09 — (ZERO-SERIES) Say the budget series is empty and hatch every stack column
- **Check (ZERO, Budgets):** `[data-q="B1"]` contains `This register holds no budget rows in
  this build. Nothing below is zero.`; `[data-column][data-panel="defence"]` count =
  `FY_AXIS.length` **of the FULL module** (the axis is the module's; with `FORCE_BUDGETS = []`
  there is no FY — so the check accepts either `FY_AXIS` columns all `hatched`, or 0 columns
  with the sentence present, and records which); every present column has
  `data-column-state="hatched"`; no `[data-cr]` exists in `B1`, `B3`, `B6`, `B7`, `B8`; `B3`
  renders its heading and the sentence; `B6`'s two maps are all `hatch`; `B8` reads `No grant
  line matches` or the no-rows sentence.

### AC-10 — (ZERO-SERIES) Say the strength and footprint series are empty, keep 36 rows, name the kinds
- **Check (ZERO):** Budgets `B6` right map legend contains `no state rows in this build`;
  `TWIN(state-table)` has 36 rows. Footprint `F1` contains `This register holds no installation
  rows in this build. Nothing below is zero.`; `path[data-fill-class="hatch"]` = 36;
  `[data-dot]` = 0; every one of the eleven kind chips renders, each `aria-disabled="true"`
  with `none in this register`; `TWIN(footprint-matrix)` has 36 rows and eleven kind columns
  each reading `no row`; the Footprint `ReconciliationLine` prints `0 {kind} (none in this
  register)` for every kind.

### AC-11 — (ZERO-SERIES) Leave the procurement lens unchanged except where the vendor union reads footprint rows
- **Check (ZERO vs FULL):** On `?lens=procurement`:
  (a) `[data-pair]` count, `[data-mark="award"]` count and the `Contested` denominator sentence
  are identical between the ZERO-SERIES and FULL builds.
  (b) Let `VENDORS_NOFP` be the §3.2 `VENDORS` union computed from the FULL module with its
  footprint arm empty: award targets (alleged included) ∪ analytic comparators of those with
  `ty ∈ {company, psu}` ∪ `bond.s` ∪ `role.t` with `ty ∈ {company, psu}`; `FOOT_ONLY = VENDORS \
  VENDORS_NOFP`, which is non-empty in FULL. The set of `[data-vendor-card]` values (one card per
  vendor) equals `VENDORS` exactly in FULL and `VENDORS_NOFP` exactly in ZERO — set equality,
  never a count tolerance: a `FOOT_ONLY` body that keeps a card in ZERO fails, and so does any
  other card lost.
  (c) No `FOOT_ONLY` member is the source or target of an `award`, `enforce`, `bond`, `role` or
  `analytic` edge (such a body would have to keep its card through a non-footprint route).
  (d) The strip's procurement facts 1, 3, 4, 5 and 6 (the slice) are identical text. Fact 2
  reads `{PUBLIC_V.length} public-sector beside {PRIVATE_V.length} private, JV or foreign — vendor
  class not a field` in FULL and the same sentence counted over `VENDORS_NOFP` in ZERO; nothing
  else in the strip differs.
  (e) In ZERO, `?lens=procurement&vendor={each FOOT_ONLY id}` prints `{label} is not a vendor in
  this register` and offers `Show connections` (E30).
  [Adjudicated 2026-10-07: spec §3.2 (and F24, D35) takes part of `VENDORS` from footprint
  `dpsu-plant`/`other` rows, D35's reason is "every body a table names gets a card", and D35 and
  D60 reject a hand list; §0 builds ZERO-SERIES with `FORCE_FOOTPRINT = []`, so no table names those
  bodies there. §10's "the other lenses are unchanged" and SG-2's "the procurement lens is
  unchanged" therefore cannot hold literally for the vendor set or for strip fact 2 (which counts
  `VENDORS` by class); they are read as: everything the lens derives from the graph is identical,
  and the footprint arm of the union follows the series. With the current module FULL has 38
  cards and ZERO 34; the four removed are force:dral, force:gliders-india, energy:mtar and
  force:paras-defence (1 public, 3 private), none carrying an award, allegation, response, bond
  or court record. No count is a literal in the check. The criterion as first written asked for an
  identical `[data-vendor-card]` count and identical facts 1–5.]

### AC-12 — (ZERO-SERIES) Keep the resolution statement's words with `no rows in this build`
- **Check (ZERO):** `#resolution`'s three fixed sentences are present in full; the Union row's
  mono line reads `no rows in this build`; the State row's mono line contains `no rows in this
  build`; the City row's mono line contains `no rows in this build`; the strip's fact 1 on
  Budgets reads `0 of 0 budget rows` **only if** the page prints it — the criterion requires
  instead `no budget rows in this build` and fails on `0 of 0`.

---

## 2. Honesty captions — FULL build (seats S, J, A)

*Why: every graphic says what it cannot show, in page-authored words, at body size, where
the eye lands after the picture. A limitation in footer grey is an argument, not a document.*

### AC-13 — Render C1–C21 at body size, under their block, referenced by `aria-describedby`
- **Check:** Across the three lenses every `[data-caption]` from the set {C1 (every lens), C2,
  C3, C4, C5, C6, C7, C8, C9, C10 (Budgets); C11, C12, C5 (Footprint, with domain
  `footprint`); C13, C14, C15, C16, C17, C18, C19, C20 (Procurement); C21 (every lens)}
  exists exactly once per lens that owns it; each has computed `font-size` ≥ the body
  `<p>`'s and `color` equal to `--color-text-secondary`; each sits inside the `<figure>` or
  block it qualifies (`closest('[data-q], #connections, #resolution')` is the owning block),
  after the drawing and before the twin by `compareDocumentPosition`; the owning `svg` or
  drawing group's `aria-describedby` resolves to an element set that includes the caption's
  id; none is inside `footer` or below `#sources`.

### AC-14 — State the three-level resolution in C1's fixed words
- **Check:** `[data-caption="C1"]` equals the three §5.0.1 sentences joined (compared
  sentence by sentence); it contains `prints those words in place of a number` and `no
  further`; its three mono lines each match the module (AC-31).

### AC-15 — Say in C2 what the stack adds, what pay is, which years agree, and that no share is rated
- **Check (Budgets):** `[data-caption="C2"]` contains `as Parliament votes them`, `drawn as a
  bracket, not added on top`, `drawn as a tick across the column`, `Missing years are hatched,
  not skipped`, `nominal and not adjusted for inflation`, `does not rate whether the share is
  high`, `the label says which`, `Delhi Police is bracketed`; the sentence `in {eq} of {pub}
  such years it does` carries `eq` = count of `STACK(fy, DEFAULT_STAGE).recon === 'equal'`
  over FYs with `published`, `pub` = count with `published`; `{tierWord}` equals the weakest
  tier over `UNION_ROWS` (`documented` unless a `REPORTED_ROWS` Union row exists); `{maxPct}`
  ≥ the maximum `(sum − published) / published × 100` over differing FYs, 2 dp; `{firstBreak}`
  is an FY in `FY_AXIS`.

### AC-16 — Say in C3 that lanes show office, not decision, and that party is not drawn
- **Check (Budgets):** `[data-caption="C3"]` contains `show who was in office, not who decided
  a line`, `Party is not drawn`, `carries it as text`; `{openEnded}` equals `OPEN_ENDED.length`
  for `MOD` and `MHA`.

### AC-17 — Say in C4 that a hatched slot is not zero and two levels are never added; add C4b under `fy`
- **Check (Budgets):** `[data-caption="C4"]` contains `A hatched slot has no row in this
  register; it is not zero`, `never added together here`, `Union actuals in this register begin
  in FY{firstActual}` where `firstActual` = the earliest `fy` of a Union `actual` row, `not
  adjusted for inflation`. Load `?fy=2014-15..2024-25` (or the first and last FY of
  `FY_AXIS` when either is absent): `[data-caption="C4b"]` reads `Columns outside FY{from}–
  FY{to} are dimmed, not removed.`; unload `fy`: C4b is absent.

### AC-18 — Say in C5 that ratios are the research's and in C6 that no column is a verdict
- **Check:** On each lens `[data-caption="C5"]` contains `computed by the research`, `this page
  does not chart them`, `this page has not re-run it`. On Budgets `[data-caption="C6"]`
  contains `for a rank, never a person`, `neither column is a verdict`, `recorded as absent,
  not estimated`.

### AC-19 — Say in C7 why every ratio is reported and why no per-person figure exists
- **Check (Budgets):** `[data-caption="C7"]` contains `every ratio is reported because its
  denominator is a secondary series for one year`, `derived by the research from the ratio`,
  `not for dividing one by the other`, `Hatched means no row is recorded, never zero`, `2011
  Census would inflate`; `{denomWords}` names `GSDP` under `m=gsdp` and `the ₹ crore as
  published` under `m=cr` (S3: the population basis and year).

### AC-20 — Say in C8 and C9 that only Delhi has a city line and that no estimate is computed
- **Check (Budgets and Footprint):** `[data-caption="C8"]` (Budgets) contains `the only city
  police force with its own budget line` and `the city ledger says so`; `[data-caption="C9"]`
  (both lenses, one per mount) contains `prints where the money sits instead of a number, and
  computes no estimate` and `this is not every commissionerate`.

### AC-21 — Say in C10 that a ₹0 release is a recorded figure and the table is not a map
- **Check (Budgets):** `[data-caption="C10"]` contains `A release of ₹0 is a recorded figure`
  and `so this is a table, not a map`; `FY{a}–FY{b}` equal the min and max `fy` of
  `grant-to-states` rows whose head names the modernisation scheme (`/ASUMP|modernisation/i`).
  (S2: the sentence instead reads that the map fills from the `recipient` field and names the
  text-only recipients.)

### AC-22 — Say in C11 and C12 that hatch is not absence and counts measure lists
- **Check (Footprint):** `[data-caption="C11"]` contains `not at their address: no row carries
  a coordinate`, `A dot is a place, not money`, `which is not the same as having none`, `only
  from this register`; `{emptyKinds}` lists every member of `EMPTY_KINDS` by name; `{dated} of
  {n}` = rows with `since !== null` of `FORCE_FOOTPRINT.length`. `[data-caption="C12"]`
  contains `measures what was listed and reachable, not the size of its forces`.

### AC-23 — Say in C13 and C15 that awards are a sample, never summed, class read from family
- **Check (Procurement):** `[data-caption="C13"]` contains `a sample of what was announced,
  not every contract signed, so no column is summed and no share is computed here`, `never
  drawn as zero`, `name no vendor and no price`, `read from the actor family`; `{withRupee} of
  {awards}` = `PRICED.length` of `AWARDS.length`. `[data-caption="C15"]` contains `Every
  vendor carries the same fields`, `never shown without the public-sector vendors beside it`,
  `computes no share of awards by vendor or class`. (S5: C13's last sentence instead names the
  declared classes.)

### AC-24 — Say in C14 what the slice is not, and name the works share
- **Check (Procurement, S8):** `[data-caption="C14"]` contains `not India's security
  procurement`, `capital acquisition runs on another portal, and GeM is not here`, `the
  slice's overall rate is a works rate`, `No winner is named here`; `{worksShare}` equals the
  works class's share of dedup decisions in `SLICE` to 2 dp (`WORKS_CLASS_PCT`) and is labelled
  `the works class (MES and BRO)` in its sentence (`… the works class (MES and BRO) … {worksShare}%
  of the slice`); wherever the page prints `one works buyer`, its figure is `WORKS_BUYER_PCT`,
  never the class share. [Adjudicated 2026-10-07: the spec prints two works figures — the class
  share (works rows ÷ dedup decisions, 75.79%) and "one works buyer" (the largest works buyer's
  rows ÷ dedup decisions, 74.41%, `readMeFirst`'s "E-IN-C BRANCH - MILITARY ENGINEER SERVICES
  (works) alone is 74.41%"); each is held to its own label.] (S8 absent: the Q2 block prints
  `The open-market slice is not built in this copy of the register. Nothing here is zero.` and
  no C14.)

### AC-25 — Say in C16 and C17 that a bond is not a payment and a board seat is lawful
- **Check (Procurement):** `[data-caption="C16"]` contains `recorded as a void, not as innocence
  or guilt` and `A purchase is not a payment for a contract`; `[data-caption="C17"]` contains
  `only in public roles at the public rank`, `is lawful`, `and the rule, not a judgement`.

### AC-26 — Say in C18 and C19 that cases are records, density is documentation, Bofors beside Rafale by design
- **Check (Procurement):** `[data-caption="C18"]` contains `A dense lane is a well-documented
  case, not a worse one` and `Rose ticks are recorded answers`; `[data-caption="C19"]`
  contains `Bofors and Rafale sit side by side by design, each the other's control`, `No case
  here is a finding of guilt or of innocence`, `never drawn as a link to a party`.

### AC-27 — Say in C20 and C21 that status is calibration, not a verdict, and position carries no meaning
- **Check:** On Procurement `[data-caption="C20"]` contains `not the verdict of any court,
  regulator or auditor` and `It is never drawn as an edge`, with `{asOf}` = `ASOF`. On every
  lens `[data-caption="C21"]` equals `Position carries no meaning. Line dash is evidence tier;
  hue is the kind of actor; shape is entity type; size is a declared band. Persons appear only
  in public roles.`

### AC-28 — Carry the fixed standfirst, standing line and header copy on every lens, with no figure
- **Check:** On every lens the `Standfirst` begins `The Union pays for defence and for its own
  police` and ends `A large number is not a finding.`; the standing line equals `No colour on
  this page stands for a party, a government, a state or a verdict. Party appears only as text,
  as the record states it. Vendors appear beside the vendors they compete with; cases appear
  beside the case recorded as their control.`; neither contains a digit other than inside
  `MH 2055`; the byline contains `force {RUN}`, `records read to {ASOF}` and, under S8, `open-
  market slice from the CPPP scrape` with each `provenance.inputs[].sha256_16` of `SLICE`.

---

## 3. Denominators — FULL build (seats P, S)

*Why: a number without its denominator is an accusation with a decimal point. Every ₹ carries
what it is a share of and what it is compared with, in the same element; every count carries
its population; nothing is summed across levels.*

### AC-29 — Put a denominator and a comparison in the same element as every ₹
- **Check:** On each lens, at rest and under `cell=CELL_SAMPLE`, `st=STATE_SAMPLE` (the first
  unit with a `STATE_SERIES` row) and the latest FY readout open: every element whose
  `innerText` matches `/₹[\d,]+(\.\d+)? cr/` is inside a `[data-cr]`, and CR-CONTEXT holds for
  every `[data-cr]` **except** ledger grid cell buttons, whose accessible name ends `— open for
  its share of the demand and the previous year` (U32, the one sanctioned exception), and
  the slice figures (no ₹ there). A `[data-cr]` for a `LAKH_ROWS` row also contains `as
  published:` and `₹ lakh` and the value × 100 formatted en-IN (U13).

### AC-30 — Give the pension share one basis everywhere and name it
- **Check (Budgets):** For `fy = LATEST_FY(DEFAULT_STAGE)`: the pension band's label
  (`[data-band="pension"]` of that column), the strip's fact 2, the figure's answer sentence
  (the first text node of `[data-q="B1"] figure`), the `FYReadout` opened on that FY and the
  stack twin row for that band all print the same percentage ± 0.01 equal to
  `PENSION_SHARE(fy, DEFAULT_STAGE)` and the same basis words `BASIS(fy, DEFAULT_STAGE)`;
  for every drawn column the band label's basis equals `BASIS(fy, stage)`; no pension
  percentage appears without one of the two basis phrases.

### AC-31 — Equate the resolution statement's mono lines to the module
- **Check:** The Union line reads `{UNION_ROWS.length} line rows · {b} bodies · FY{FY_AXIS[0]}–
  FY{FY_AXIS.at(-1)} · actuals for {k} of {FY_AXIS.length} FYs` with `b` = distinct `body` over
  `UNION_ROWS`, `k` = distinct `fy` over Union `actual` rows; the State line `{s} of 36 states
  and UTs carry a Police-head row` with `s` = distinct `payer` over `STATE_SERIES`, `{o} with
  their own budget series` with `o` = distinct state payers having a non-`Police (MH 2055)`
  head on a row that is not `reported` [Adjudicated 2026-10-07: spec §5.0.1 counts a state
  "except where a state's own budget opened"; the PRS "District Police line" rows are
  secondary transcriptions (tier `reported`), not a state's own budget, so they do not count —
  in this build only Uttar Pradesh's Grant 026 qualifies], `{t} with a strength row` and `{r} of {FORCE_STRENGTH.length} strength rows reported`;
  the City line `Delhi Police: {d} line rows, FY{a}–FY{b}`, `{COMMISSIONERATES.length}
  commissionerates placed, {c} with a strength row` and `{cities} cities with an installation`
  with `cities` = distinct `city` over `FORCE_FOOTPRINT`. The strip's fact 1 contains a link
  to `#resolution` named `what resolves at which level`.

### AC-32 — Show the strip facts for each lens with their populations
- **Check:** Budgets: fact 1 matches `/(\d[\d,]*) of (\d[\d,]*) budget rows · (BE|RE|actual)/`
  with the second number = `FORCE_BUDGETS.length` and the stage = `DEFAULT_STAGE`; fact 3
  `{covered} of {FY_AXIS.length} FYs have a {stage} stack` with `covered` = FYs having a
  `DEFENCE_DEMANDS` row at that stage; fact 4 `{s} of 36 map units have a state police row ·
  Delhi's police is a Union line`; fact 5 `{REPORTED_ROWS budget count} rows transcribed from a
  secondary (reported)`; fact 6 `{ZERO_COUNT} rows print ₹0 as recorded`. Footprint: fact 1
  `{n} of {FORCE_FOOTPRINT.length} installations`, fact 2 `{k} of {KINDS.length} kinds recorded;
  {EMPTY_KINDS.length} with no row`, fact 3 ends `no coordinates`, fact 4 `{dated} of {n} dated`,
  fact 5 `{COMMISSIONERATES.length} commissionerates; budget inside the state's police head; city
  strength: no primary table`. Procurement: fact 1 `{AWARDS.length} contracts MoD named
  ({PRICED.length} with ₹, {UNPRICED.length} unpriced) to {distinct t} vendors`; fact 2
  `{PUBLIC_V.length} public-sector beside {PRIVATE_V.length} private, JV or foreign — vendor
  class not a field`; fact 3 `{CASES.length} cases, {CASE_PAIRS.length} control pairs,
  {UNPAIRED.length} unpaired`; fact 4 `{ANSWERED.length} of {ALLEGED.length} alleged claims with
  a recorded response`; fact 5 `{BONDS.length} bond records, {DONORS.length} donors,
  {PARTIES.length} parties`; fact 6 (S8) `open market: {dedup} award decisions in {classes}
  buyer classes, {works}% one works buyer — read by class` from `SLICE` with `{works}` =
  `WORKS_BUYER_PCT` ± 0.01 [Adjudicated 2026-10-07: the largest works buyer's rows ÷
  `quality.total.dedupRows` (74.41%), not the works class's share (75.79%, labelled `the works
  class (MES and BRO)`, AC-24)], else `open-market
  slice not built in this copy`.

### AC-33 — Print the reconciliation lines whose terms sum to the series lengths
- **Check:** Budgets `ReconciliationLine` matches `/(\d+) rows = (\d+) Union \((\d+) demand-level
  \+ (\d+) lines inside a demand \+ (\d+) grants to states \+ (\d+) published totals\) \+ (\d+)
  state \((\d+) RBI Police head \+ (\d+) a state's own budget \+ (\d+) PRS transcriptions,
  reported\) · (\d+) recorded as ₹0 · no total on this page adds rows from two levels/`; the
  first number = `FORCE_BUDGETS.length`; the four Union terms sum to the Union number; the three
  state terms sum to the state number; Union + state = the first number; the ₹0 term =
  `ZERO_COUNT`. Footprint: `{FORCE_FOOTPRINT.length} installations = ` then one term per
  `KINDS` member whose counts sum to the total, 0-row kinds printed `0 {kind} (none in this
  register)`. Procurement: the first number = `FORCE_EDGES.length` and the predicate terms sum
  to it; `{raw} raw rows → {dedup} after dedup` equals `SLICE.quality.total` (S8).

### AC-34 — Draw each stack column from demand-level rows only, tick the published total, glyph the reconciliation
- **Check (Budgets, `DEFAULT_STAGE`, then each other stage by `?stage=`):** For every
  `fy ∈ FY_AXIS` with a `DEFENCE_DEMANDS` row: the column `[data-column][data-panel="defence"]`
  for that FY has one `[data-band]` per component of `STACK(fy, stage).bands` and each band's
  `data-cr` equals the band's Σ ± 0.5; no band's rows include a `component === 'pay'` row (the
  twin's `demand head` cells for that column are all demand-level by `isDemandLevel`); when
  `STACK.published` is non-null a `[data-tick="published"]` exists in the column and the twin's
  published-total row for that `(FY, defence)` prints `STACK.published` ± 0.5, the stack sum
  labelled `computed here`, and the words `equals the published total` iff `recon === 'equal'`
  else `exceeds the published total by ₹{Δ} cr ({pct}%), computed here` with Δ = `sum −
  published` ± 0.5; `[data-glyph]` for the column is `equal` / `differs` / `none` =
  `STACK.recon`. Where `STACK.published` is null the glyph is `none` and the twin row reads `no
  published all-demands total for this FY`. (S1: `isDemandLevel` reads `level`, and the same
  assertions hold.)

### AC-35 — Check the police stack and the Delhi bracket against the rows
- **Check (Budgets):** For every FY with `POLICE(fy, DEFAULT_STAGE)`: the police column's two
  bands equal the revenue and capital rows ± 0.5; the twin's published-total row for `(FY,
  police)` prints `total` and `revenue + capital, computed here` with `equals` iff
  `|total − (revenue + capital)| ≤ 0.5`, else `≠` in words (`differs`). Where `DELHI(fy,
  stage).total` exists, `[data-tick="delhi"]` exists on that column and the twin's `Delhi Police
  (inside the Police demand)` row prints that total ± 0.5 and its share of the police total
  `computed here`. The figure's denominator line contains `police stack = revenue + capital of
  the Police demand, checked in {chk} of {chk} FYs` with `chk` = FYs having all three rows.

### AC-36 — Print each lane's own max and the cell's share of its demand
- **Check (Budgets):** For `CAPF_SAMPLE`'s first lane: the lane row's right cell reads `lane
  max ₹{x} cr` with `x` = max `cr` over `LANE_ROWS(key)` ± 0.5; load `?cell=CELL_SAMPLE`: the
  `CellCard` lists every row of that lane × FY (count = `LANE_ROWS` filtered to the FY), each
  with CR-CONTEXT true, its `note` (or `no note`), its tier word, every `srcs` label, and `read
  to {ASOF} · document: {first source label}` beneath each ₹ (U12). The ledger's denominator
  line reads `{lanes} lanes · {cells} slots drawn, {hatched} hatched · {stage words}` with
  `lanes` = `LANES.length` and `cells + hatched` = `lanes × FY_AXIS.length × 3` (at ≥ 640 px).

### AC-37 — Show the live effect of every rail control as `{N} → {k}` in words
- **Check (Budgets):** Each rail control (Payer, State, FY from, FY to, Stage, Component,
  Tier) has a `[data-effect]` sibling matching `/(\d[\d,]*) → (\d[\d,]*)/` whose `→` is
  `aria-hidden` and whose visually hidden text reads `from {N} to {k}`; `N` = the lens
  population (Budgets `FORCE_BUDGETS.length`; Footprint `FORCE_FOOTPRINT.length`; Procurement
  `FORCE_EDGES.length`); after changing Stage to a non-default, Stage's `k` equals the count of
  budget rows at that stage and the live region's last message matches `/from (\d+) to (\d+)
  (rows|records|installations)/` exactly once. On Footprint, Payer's effect line reads
  `does not apply to footprint` (or the §6 reason) and the control is `aria-disabled="true"`,
  still visible.

### AC-38 — Count every State option, show zero as `(0)` disabled, never hidden
- **Check:** The rail's State `<select>` has 36 `<option>`s plus the all option, alphabetical by
  label; on Budgets each option's text ends `({k})` with `k` = `STATE_ROWS` for that payer;
  every option with `(0)` has `aria-disabled="true"` and is still in the DOM; on Footprint
  `k` = footprint rows per unit; on Procurement the control is `aria-disabled` with the reason
  `a vendor's registered office is not where its work is` in its effect line. The label reads
  `State (where the record places it)`.

### AC-39 — Derive the default stage, state pair and strength year from coverage, and say so on the controls
- **Check (Budgets):** At rest, the Stage segmented control's pressed option = `DEFAULT_STAGE`
  and the URL has no `stage`; each option's text is `{stage} · {k} of {FY_AXIS.length} FYs`
  with `k` = FYs having a `DEFENCE_DEMANDS` row at that stage; the control carries the words
  `actuals arrive two years after the budget`. The spend map's pair `<select>` lists every
  `STATE_PAIRS` member with `{states} states`, its selected value = `DEFAULT_PAIR('gsdp')`
  (`DEFAULT_PAIR('percap')` under S3), and every pair whose `fy !== GSDP_FY` is
  `aria-disabled="true"` with `GSDP in this build is for {GSDP_FY} only` in its name. The
  strength year control's pressed option = `DEFAULT_SY` with `{sy} · {rows} rows`.

### AC-40 — Print base rates as `a of b`, a percentage only over an integer ≥ 10, two figures as two figures
- **Check:** On each lens, every base-rate card in `[data-q$="4"]` (Budgets `B4`, Footprint
  `F4`) and in the `ControlCard` prints `{numerator} of {denominator} — {label}` for a `share`
  row (both integers, numerator ≤ denominator), with a percentage and a whisker only when the
  denominator is an integer ≥ 10; a ₹ numerator prints `₹{n} cr of ₹{d} cr`; a `null` figure
  prints `not computed in this file` with the chip `figure in the research file's wording, not
  computed by this page`; `TWO_FIGURES` prints `{numerator} and {denominator} — {label}` with
  the chip `two figures as the research states them, not a share` and no `%`, no whisker, no
  ` of ` between its figures (SG-RF7). The card count per domain = `BASE_RATES(domain).length`.

### AC-41 — Put the symmetry text in the same section as its base rates
- **Check:** For every domain in the lens's `LENS_DOMAINS` with a `SYMMETRY(domain)`: the
  `<section>` holding that domain's base-rate cards also contains the symmetry text verbatim
  (whitespace-normalised) and the line `wording: {domain} research file`; on Procurement each
  of the four chapters opens with a bordered block headed `The same lens, run on the other
  side — {domain} research file` containing the text (ch. 2: `SLICE.readMeFirst` then
  `SLICE.caveat`), before any `<table>` or `<figure>` of the chapter by
  `compareDocumentPosition`; the award frame's AoN card contains the `procurement-industry`
  text (SG-RF6). A domain without a text prints the `ControlCard` empty sentence in amber in
  its place and the chapter still renders.

### AC-42 — Frame the spend map with its denominator, its tier and its median
- **Check (Budgets, `B6` left):** the denominator line matches `/(\d+) of 36 drawn · (\d{4}-\d{2})
  (BE|RE|actual) · head Police \(MH 2055\), revenue account only .+ · ÷ (GSDP|.+) \(reported\)
  · median of (\d+) drawn states: ([\d.]+) (%|₹ cr)/`; the first `k` = count of
  `SPEND_CLASS === 'value'` under `DEFAULT_PAIR`; the median equals the median of those units'
  values (MH 2055 `cr` ÷ `GSDP` × 100 under `gsdp`) ± 0.01; the legend contains `every ratio on
  this map is reported: its denominator is a secondary series`; the map frame's `stroke-
  dasharray` equals the `reported` dash of `TIERS` (`6 3`). Under `m=cr` the line's `÷` term is
  absent and no `%` of a states' sum appears anywhere in the figure or twin (U33).

### AC-43 — Frame the strength map with its source, its reported count and its counts-only count
- **Check (`B6` right):** the denominator line matches `/(\d+) of 36 drawn · per lakh as
  printed, BPR&D via secondary sources · (\d+) of (\d+) reported · (\d+) counts only · median of
  (\d+) drawn states: ([\d.]+) per lakh/`; `k` = units with `STRENGTH_CLASS === 'value'` at
  `DEFAULT_SY`; the reported pair = `REPORTED_ROWS` strength rows at that year of rows at that
  year; counts-only = units with `counts-only`; the frame carries the reported dash while any
  row behind it is reported.

### AC-44 — Frame the footprint map with rows, kinds, units and the positioning rule
- **Check (Footprint):** the denominator line equals `{n} of {FORCE_FOOTPRINT.length}
  installations · {k} of {KINDS.length} kinds · {u} of 36 units with any row · positions are
  states, not addresses` with `k` = kinds with rows, `u` = units with rows; `[data-dot]` count
  + Σ `data-overflow` = `n`.

### AC-45 — Frame the award graphic with priced, unpriced and class counts, and no sum
- **Check (Procurement):** the denominator line equals `{PRICED.length} contracts with ₹ ·
  {UNPRICED.length} without · {PUBLIC_V awards} public sector, {PRIVATE_V awards} private, JV or
  foreign · a sample of PIB releases, not every contract signed; no share is computed here`;
  no element in the figure or its twin prints a ₹ that is not the `a` of one award (the set of
  `[data-cr]` values in the figure = the set of `PRICED.a`, each once, joint totals once per
  bracket); no element contains `total ₹` or `Σ`.

### AC-46 — Equate every slice rate to `security.json` and keep the slice-wide rate a reference row
- **Check (Procurement, S8):** `[data-class]` count = `SLICE.rates.byClass.length` in file
  order; each row prints `{single} of {n}`, its rate, its Wilson interval and `whole file, same
  portal {x}% · whole file {y}%` equal to the file's fields ± 0.01; the two reference rows read
  `excluding the works class` and `the slice as a whole` with `SLICE.rates.excludingWorks` and
  `SLICE.rates.total`, each under a rule (`compareDocumentPosition` after every class row);
  the slice-wide rate's digits appear in no `[data-class]` row; `[data-rate]` count per class
  = class-years with `n ≥ 10` (AC-58).

### AC-47 — Account for every ₹ in the DOM and in every TSV as a row, a declared figure or a labelled share
- **Check:** On each lens at rest, under `view=table`, and with `cell`, `st`, `vendor`, `case`
  and `rec` set: collect every `[data-cr]` value and every ₹ cell of every downloaded TSV
  (AC-108's set). Each value, parsed, is within 0.5 of one of: a `FORCE_BUDGETS.cr`; a base-
  rate numerator or denominator; an `award`/`bond` `a` or a `FORCE_BENEFITS.amountCr`; a
  `STACK(fy, stage).sum` whose element contains `computed here`; a `POLICE` revenue + capital
  whose element contains `computed here`; a row's share whose element contains `computed here`;
  or `× 100` of a `LAKH_ROWS.cr` inside an `as published` phrase. A DOM `[data-cr]` (never a TSV
  cell) is also accounted for when the element carries `data-quoted`, its whitespace-collapsed
  text begins with a string R of the force module, verbatim (a node or edge `lab`, `d`, `note`,
  `innocentReading` or response text, a `srcs` label, a base-rate label, a budget note, a void,
  gap, narrative or symmetry text), R itself prints `₹{x} cr|crore|crores` with `x` within 0.5 of
  the value, and the text right after R (past the page's optional bracketed pension-basis note)
  begins ` (₹ in the research's own words: no denominator published for this line on this page;
  previous year not applicable)`. Any other ₹ fails with its text printed, inside `[data-quoted]`
  or not. [Adjudicated 2026-10-07: spec §3.2 (`stateRecords`: "verbatim `lab`, `d`, tier, srcs …
  no figure parsed"), D15 (base rates as verbatim cards), D25/§5 (research wording quoted
  verbatim), the SourceLedger "over every `srcs` in the module" and AC-48 ("source labels in
  full") put research wording in the DOM with its own ₹ figures — e.g. the source label "Budget at
  a Glance 2012-13, Total Expenditure (Actual 2010-11 = ₹1,197,328 crore)". The hook table and
  AC-29/SG-9 require each such element to be a `[data-cr]` carrying CR-CONTEXT, but SG-4 as
  written lists no figure the research printed itself, so AC-29, AC-48 and AC-47 could not all
  hold. SG-4's "No other ₹ exists", read through D4, governs the figures the page prints as its
  own; quoted wording cannot pass through `crContext` without being parsed, which §3.2 forbids.
  The clause is narrow: no blanket `[data-quoted]` skip; a page-computed total re-labelled quoted
  still fails because no module string prints it; the reader is told in words that the figure is
  the research's and has no denominator here; TSV ₹ cells, `#` headers and aria-labels are
  unchanged. On the first build all 44 distinct quoted values (561 hits) meet it.] No TSV `#` header and no `aria-label` outside the ledger grid contains a ₹.

### AC-48 — Carry the as-of date and a source beside every figure
- **Check:** Every `[data-cr]` inside `CellCard`, `StatePanel` and `FYReadout` has, within its
  card, the text `read to {ASOF}` and `document: {label}` where `label` is the first `srcs`
  label of its row; every budget-row element in a twin has a Sources cell with ≥ 1 `http` link;
  the strip reads `read to {ASOF}`; every base-rate card and every record card prints its
  source labels in full (no `show more`, no `…` truncation: the number of `<a href^="http">`
  equals the row's `srcs.length`).

---

## 4. No-data ≠ zero — FULL build (seats S, P, A)

*Why: a hatched year that reads as nothing has published a finding. The register is partial
by construction; the page draws every gap as a gap and every recorded zero as a number.*

### AC-49 — Hatch every missing stack column with its name and never close the axis up
- **Check (Budgets):** `[data-column][data-panel="defence"]` count = `FY_AXIS.length` at every
  stage; for each `MISSING(stage)` the column has `data-column-state="hatched"`, its FY axis
  button is named `{fy}, no {stage} rows recorded`, and no `[data-band]` or `[data-cr]` is inside
  it; the twin has a row for that `(FY, defence)` reading `no {stage} rows recorded`; the column
  order equals `FY_AXIS`.

### AC-50 — Draw a partial column's bands and hatch the remainder, labelled
- **Check (Budgets, `?stage={PARTIAL.stage}`):** the `PARTIAL` column has
  `data-column-state="partial"`, one `[data-band]` per component present, a hatched remainder
  element, the label `partial: {k} of {n} demands` with `k` = its `DEFENCE_DEMANDS` count and
  `n` = the stage's maximum, and no `[data-cr]` for a column sum (the twin's published-total
  row reads `no published all-demands total for this FY` or the published figure, and the
  stack sum only where every component is present — else `partial, no sum printed`).

### AC-51 — Hatch every empty ledger slot and name it, never `0`
- **Check (Budgets):** For `CAPF_SAMPLE`'s lanes: `[data-slot]` count = 3 × `FY_AXIS.length`
  per lane; each slot's `data-slot-state` is `row` iff exactly one `LANE_ROWS` row has that
  `(fy, stage)`, `two` iff two, `zero` iff that row has `cr === 0`, else `hatch`; every `hatch`
  slot's accessible name (via its cell button's name) contains `no row in this register`; no
  slot's text or name reads `₹0` unless `zero`; the coverage twin's corresponding cell reads
  `no row in this register`.

### AC-52 — Print a recorded zero as `₹0 cr — as recorded` on `ZERO_FILL`, never a hatch
- **Check (Budgets):** In `TWIN(grants)` the row for `ZERO_ROW` reads `₹0 cr — as recorded` in
  its ₹ cell and its TSV `cr` exports as `0`; the row count of grants reading `₹0 cr — as
  recorded` = `ZERO_COUNT` among grant rows. If `ZERO_ROW` is a ledger row (not `grant-to-
  states`), its slot has `data-slot-state="zero"` and a `[fill="url(#zero-fill)"]` or the
  `ZERO_FILL` class, not the hatch pattern. No element anywhere reads `₹0 cr` without
  ` — as recorded`.
- [Open adjudication 2026-10-07 — intermittent load timeout under `view=table`; see the note
  under AC-93. Criterion and test unchanged.]

### AC-53 — Paint the spend map's classes to the module and name every class in the legend
- **Check (`B6` left, `DEFAULT_PAIR('gsdp')`):** `path[data-fill-class]` count = 36;
  `value` count = units with `SPEND_CLASS === 'value'`; `hatch` = `no-row` units; `crosshatch`
  = 1 (`dl`); `hollow`/`stipple` = 0 on this map; a `no-denominator` unit (`GSDP[st]` null with
  a row) is `hatch` **and** its option name contains `GSDP not in this build`; the legend names
  each of `value`, `hatch` (`no row in this register ({j})`), `crosshatch` (`police paid by the
  Union`), `GSDP not in this build ({k})`, and every quantile bin by its edges, naming an empty
  bin `(none in view)`; the option for `dl` is named `Delhi: police paid by the Union, not a
  state line`. Under `?m=cr` the `no-denominator` class is absent and those units are `value`.

### AC-54 — Stipple Delhi on the strength map and hatch the units without a row
- **Check (`B6` right, `DEFAULT_SY`):** `stipple` count = units with `STRENGTH_CLASS ===
  'counts-only'` (today `dl`), `hatch` = `no-row` units, `value` = the rest, summing to 36;
  the stipple option's name contains `counts recorded without per-lakh`; the twin row for a
  stipple unit prints `sanctioned` and the words `no per-lakh printed`; a `derived` row (note
  containing `DERIVED`) prints the note's sentence beside its counts.

### AC-55 — Keep 36 rows in the state table, each empty cell carrying its reason
- **Check (`TWIN(state-table)`):** 36 rows in `UNITS` order under every `st`, `fy`, `stage`
  and `tier` tried (`tier=none` included); for a unit with no `STATE_SERIES` row each MH 2055
  cell reads `no row in this register` (or `Delhi's police is a Union demand line — see Q7`
  for `dl`, `no RBI row for this UT` where the panel says so); a unit in `FP_NONE` reads `no
  installation in this register` in its Installations cell; no cell is empty, `—`, `0` or
  `NaN`; a PRS row's ₹ is in the `District Police line, PRS` column with the word `reported`
  and never in an MH 2055 column; UP's own-series cell reads `{n} rows, FY{a}–FY{b}` with `n`
  = its non-MH-2055 rows.

### AC-56 — Hatch footprint states without a row and keep 0-row kinds visible as `none in this register`
- **Check (Footprint):** `path[data-fill-class="hatch"]` count = units with 0 rows of the
  selected kinds (all kinds at rest), each option named `{State}: no row of the selected kinds
  in this register`; (S10) an enumerated kind's empty unit is `hollow` named `none on the
  official list`. The kind chips number `KINDS.length`; each `EMPTY_KINDS` chip is
  `aria-disabled="true"` with `none in this register`; for `prison`, its name also carries the
  words of the `footprint`-domain void that names prisons or jails, verbatim (its first 40
  characters), and that void exists; for `ordnance`, it carries the spec's rule that the ex-OFB
  plants are recorded under dpsu-plant (its name contains `ex-OFB` and `dpsu-plant`); a void of
  another domain (pay, demands) never supplies a footprint chip's reason [Adjudicated
  2026-10-07: the criterion asked for "the void's words" for both kinds. Spec §5.2.1 reads "where
  a void or gap explains the absence, its words (`prison`: jail-wise locations are not
  published; `ordnance`: the ex-OFB plants are recorded under dpsu-plant)": for ordnance the
  explanation is a recording rule, and no footprint void or gap says it. The only voids naming
  "Ordnance" are union-defence pay/demand voids ("Ordnance Factories (pre-2021) and DGQA pay are
  not printed …"), which say nothing about why an installation kind is empty and would mislead a
  reader if quoted as the reason]; `TWIN(footprint-matrix)` keeps a column per kind with the header note `none in this
  register` on empty kinds; every empty cell reads `no row`, never `0`.

### AC-57 — Count unpriced awards beneath the axis and draw none as zero
- **Check (Procurement):** `[data-mark="award"]` count = `PRICED.length` (a `JOINT` contract
  counts one hollow mark per vendor, bracketed, with no `data-cr`); `[data-mark="award-
  unpriced"]` count = `UNPRICED.length`; the count row prints per year `{n} contracts named
  without ₹` with Σ n = `UNPRICED.length`; no `[data-mark]` sits at the y of ₹0; the twin's ₹
  cell for an unpriced award reads `amount not stated`; the x-axis runs from `min(AWARD_YEARS)`
  to `max(AWARD_YEARS)` with one slot per year, `EMPTY_YEARS` included as empty slots and twin
  rows reading `no named contract in {year}`.

### AC-58 — Draw no slice dot where n < 10, and say so
- **Check (Procurement, S8):** For every `SMALL_YEARS` member the by-year multiple has no
  `[data-rate]` at that year and prints `n {n}: no rate drawn`; `[data-rate]` count over all
  classes = class-years with `n ≥ 10`; each drawn dot's `data-n` ≥ 10.

### AC-59 — Dim, never hatch, a row hidden by a filter, and name the filter
- **Check (Budgets):** Load `?tier=documented` and again `?tier=alleged`: for every ledger slot
  whose `LANE_ROWS` have a row at that `(fy, stage)`, `data-slot-state` is `row|two|zero` or
  `hidden`, never `hatch`; a `hidden` slot's name reads `{k} rows hidden by the tier filter —
  not absent`; no `hidden` element has the hatch fill; the spend map's legend under `tier=alleged`
  lists `hidden by filter ({k})` beside `no row in this register ({j})` with `k + j +
  value + crosshatch = 36`; every figure that lost rows adds `{hidden} rows hidden by filters`
  to its denominator line (SG-52).

### AC-60 — Keep axis, rows and frames when filters leave nothing, and name the most-removing filter
- **Check:** Load `?tier=none` on each lens: the strip reads `{N} → 0`; every Q-block with a
  population reads `No record in this register matches {filters}. This is a statement about
  the register, not about India.` naming `tier` and offering a one-click reset (a `<button>`
  whose activation removes `tier` from the URL); `[data-column]` count stays `FY_AXIS.length`;
  `[data-vendor-card]` count stays `VENDORS.length` (greyed, with `Comparison set required`
  visible if a band would empty); `[data-pair]` count stays `CASE_PAIRS.length +
  UNPAIRED.length`; `TWIN(state-table)` stays 36 rows. Load `?fy={an FY with no stack column at
  DEFAULT_STAGE}` (skip when none): the live region says `0 {stage} columns in {range}` and the
  axis is unchanged.

### AC-61 — Print the null words everywhere: never a bare dash, `NaN` or `0` for absence
- **Check:** On each lens, at rest and under `view=table`: no `td`, `dd`, `[data-effect]` or
  denominator line has `innerText` exactly `—`, `-`, ``, `NaN`, `undefined`, `null`, `0` or
  `₹0`; every empty value is one of `no row in this register`, `not recorded`, `not stated`,
  `none named`, `not computed`, `amount not stated`, `none recorded`, `no owner recorded`, `no
  holding recorded`, `no bond recorded in this register`, `no board role recorded`, `date not
  printed on the list`, `end not recorded`, `no note`, `none in this register`, `no row`, `₹0
  cr — as recorded`, or a sentence beginning `no ` / `No `; every vendor card's thirteen `dd`s
  are non-empty.

### AC-62 — Print `no source in file` in amber for a record without sources
- **Check:** For every `EMPTY_SRCS` edge rendered (in a case column, Contested, the bond or
  board table, or its `RecordCard` via `rec={id}`): its Sources cell reads exactly `no source in
  file` with computed `color` equal to the amber token; no empty-source record renders a blank
  Sources cell.

### AC-63 — Print the exact city sentence, and no ₹, for every city body other than Delhi Police
- **Check (Budgets `B7`, Footprint `F3`, `st={CITY_SAMPLE.st}` panel, Find `{CITY_SAMPLE.city}`,
  `TWIN(city-ledger)` and its TSV):** for every `CITY_BODIES` member rendered, every
  `[data-city-body="{id}"]` element's `innerText`, `title`, `aria-label` and TSV cell contain no
  `₹`, no `/\d[\d,]*(\.\d+)? cr\b/`, no `%`; its budget cell text equals exactly `inside
  {State}'s police head (MH 2055) — no city budget is published` with `{State}` =
  `STATE_BY_ID[st].label`, followed by a link named `{State}'s police head →` whose activation
  sets `st={st}&lens=budgets`; its strength cell is a `FORCE_STRENGTH` row (S9) or `no primary
  table — the national police table is unreachable`; `TWIN(city-ledger)` row count =
  `COMMISSIONERATES.length + 1` with the Delhi row first reading `₹{latest BE} cr BE {fy} — the
  Police demand (Union)`; the denominator line reads `{COMMISSIONERATES.length} commissionerates
  recorded in {s} states · not every commissionerate: the national list is unreachable`
  (SG-RF2).

---

## 5. Denials beside claims — FULL build (seats S, A, J)

*Why: an allegation shown without the response of those it concerns is an accusation. The
response slot is always rendered, at equal size, and an empty one says so in fixed words.*

### AC-64 — Print the exact no-response sentence for every unanswered record
- **Check (Procurement):** For `ENFORCE_NO_CONTRA` the case column that lists it has a
  `[data-response="false"]` beside it reading exactly `No response recorded — asked/not asked
  unknown` (U+2014); its `RecordCard` (`rec={id}`) reads the same; in `TWIN(case-timeline)` its
  row's response cell reads the same. On Budgets, a `CONTRACTS` card whose right column is
  empty reads exactly that sentence in the column, at the same computed `font-size` as the left
  column's first field.

### AC-65 — Show every recorded response in full, at the claim's size and weight
- **Check:** For `ENFORCE_WITH_CONTRA`: its `[data-response="true"]` begins `Response from
  {responder label} [{tier}], {date|undated response}:` and contains the contra's `lab` and `d`
  in full; the response's `getBoundingClientRect().width ≥ 0.9 ×` the record's and its computed
  `font-size` and `font-weight` equal the record's; the response's rule or tick is the rose
  token (`--color-rose`), and no other element in the pair row uses rose; at `M` the two are
  stacked at the same width ± 2 px and `font-size`. `[data-mark="response"]` count in the case
  timeline = contras on case-file records, at the response's date or in the `undated` gutter.

### AC-66 — Re-admit a response whenever its claim is shown, whatever the response's tier
- **Check:** For an `ENFORCE_WITH_CONTRA` whose contra's tier differs from the claim's (skip
  when none): load `?tier={claim tier}`: the record and its response are both visible and
  `#contested`'s and the graph's drawn edge counts include the contra; load `?tier={contra tier
  only}`: the record is not rendered and neither is its orphaned response (SG-37).

### AC-67 — List every alleged claim in Contested with its response slot and the denominator sentence
- **Check:** `#contested` lists exactly `ALLEGED.length` items (by their `lab`), each with a
  `[data-response]` slot; `data-response="true"` count = `ANSWERED.length`; the denominator
  reads `{ALLEGED.length} alleged claims · {ANSWERED.length} with a recorded response · {k}
  without — whether a response was sought is not recorded`; no item contains `verdict`,
  `guilty` or `proven`; each item's claim and response have equal computed `font-size`.

### AC-68 — Keep alleged awards off the award graphic and inside the allegation field and Contested
- **Check (Procurement):** No `[data-mark="award"]` or `[data-mark="award-unpriced"]`
  corresponds to an `ALLEGED_AWARDS` id (the award twin has no row with its `lab`); each
  `ALLEGED_AWARDS` edge appears in `#contested` and, where its `t` or `s` is a case party, in
  that case column's `Allegation` field with its response chain beside it at equal size; the
  vendor card of its `t` lists it under field 9 or 4 with the word `alleged`, never counted in
  `Named awards`' `{n}`.

### AC-69 — Give every contract card two equal columns, identical fields, the column rule in its foot
- **Check (Budgets `B5`):** card count = `CONTRACTS.length` in `from` order; each card has two
  `<dl>` columns headed `The terms and the stated case` and `The stated objections and the
  answers`, with identical `dt` sequences, equal computed widths ± 1 px at `D`, and a foot
  reading the rule (`by the responder's kind: ministries and state agencies left; parties,
  veterans' bodies and petitioners right`); every response in the card's chain is in the
  column its responder's `ty`/`fam` places it (the check classifies each contra's `s` itself);
  the Ministry's stated saving reads `₹{amountCr} cr ({confidence})` from `FORCE_BENEFITS` or
  `no stated saving recorded` in amber; the Agnipath card contains `does not join the Agnipath
  terms to the terms they replaced` with an in-page link to the pay table (S13: the old terms
  render beside the new, identical fields). `TWIN(pay)` rows = `LAWS` minus `CONTRACTS`.

### AC-70 — Nest a reply under the response it answers and name that responder
- **Check:** For `REPLY`: its `<li>` is a descendant of the `<li>` of the response it answers,
  `data-reply-depth` = its chain depth (≤ 3), its text begins `in reply to {responder label},
  {date or undated}:`, and its computed `font-size` equals its parent's (U27, E32).

### AC-71 — Name an audit-added response as the audit, and count it as a response
- **Check:** For `AUDIT_CONTRA`: wherever it renders, the responder reads `the audit (recorded
  on {subject label})`; its slot is `data-response="true"`; the Procurement
  `ReconciliationLine`'s `({audit} added by the audit)` equals the count of `AUDIT_CONTRA`-form
  edges.

### AC-72 — Print every analytic comparison's innocent reading in the same section at the same size
- **Check:** For every `ANALYTIC_SHOWN` edge on each lens (state records in the `StatePanel`,
  vendor field 6, the board control, pair-row blocks, `B5`'s analytic cards): its
  `innocentReading` text appears inside the same `<section>` (or `<dl>`/card) element, labelled
  `the reading in which nothing is wrong` where the spec names it, at equal computed
  `font-size` (SG-RF8, U21).

### AC-73 — Put the two anchor cases in one pair row first, equal columns, and give an unpaired case the pairing sentence
- **Check (Procurement ch. 4):** `[data-pair]` count = `CASE_PAIRS.length + UNPAIRED.length`;
  the first `[data-pair]` holds `[data-case]` for `force:case-bofors` and `force:case-rafale`
  (the `CASE_PAIR` gate anchor; the test also asserts that pair is `FIRST_PAIR` by the date
  rule and reports if the two rules disagree); the left column is the member with the earlier
  `FIRST_RECORD`; its `h4` reads `{earlier label} beside {later label}` and contains no
  `PARTY_WORDS` member; the two `<dl>`s have identical `dt` sequences, equal computed widths
  ± 1 px and equal `font-size` at `FOLD`, and are consecutive siblings at `M`; the row contains
  the `lab`, `d` and `innocentReading` of every pair edge between the two, under `wording:
  {file}`; every `enforce` or `alleged` record in either column has a `[data-response]`; for
  each `UNPAIRED` case its row's right `<dl>` reads exactly `No control pairing recorded for
  this case in the register.` in amber at the same width and `font-size` as the left (SG-RF5).

---

## 6. URL round-trip of every filter — FULL build (seats J, P)

*Why: a reader must be able to send someone the exact view. Absent = default = unfiltered,
nothing selected. Every control writes with `replace`, and every URL reproduces the view.*

### AC-74 — Default to Budgets, unfiltered, nothing selected, nothing in the URL
- **Check:** `/#/security`: the `Budgets` tab has `aria-selected="true"`; Payer `All`; State all;
  FY from/to `All years`; Stage = `DEFAULT_STAGE`; all seven Component boxes checked; all four
  Tier toggles `aria-pressed="true"`; Find empty; the spend map's pair = `DEFAULT_PAIR`, `m` =
  `gsdp` (S3: `percap`), `sy` = `DEFAULT_SY`; every `details[data-twin]` closed; no `CellCard`,
  `StatePanel`, `BodyCard`, `VendorCard` or `RecordCard`; no active-filter line;
  `new URL(page.url()).hash` is exactly `#/security`. No control has `name` in {`party`,
  `vendor-class`, `era`} and no URL the page writes across §6 contains them (D46).

### AC-75 — Round-trip `lens`, keeping the shared params and dropping `rec` and `cell`
- **Check:** ROUND-TRIP(`lens=footprint`), then `lens=procurement`; pressing Budgets removes
  `lens`. Load `?fy=2014-15..2024-25&st={STATE_SAMPLE}&stage=actual&tier=documented,reported&
  find=police&sel={a node id}&view=table&cell={CELL_SAMPLE}&rec={an edge id}` and press the
  Footprint tab: the URL keeps `fy`, `st`, `stage`, `tier`, `find`, `sel`, `view`, has
  `lens=footprint`, and has neither `rec` nor `cell`; the Payer, Stage and Component controls
  read their inactive reason; `view=table`'s twins are open on the new lens before focus lands
  on its heading (U23, E40).

### AC-76 — Round-trip `payer`, and say where it does not reach
- **Check (Budgets):** ROUND-TRIP(`payer=states`): `TWIN(ledger-long)` rows all have Payer ≠
  `union`; the stack is unchanged (`[data-band]` sequence equal) and its figure reads `not
  affected`; `TWIN(state-table)` stays 36. `payer=union`: the state table's MH 2055 cells read
  `{k} rows hidden by the payer filter — not absent` (U18). On Footprint and Procurement the
  control reads `installations and contracts are not budget rows` and the param is kept.

### AC-77 — Round-trip `st`, opening the panel and accenting both maps
- **Check (Budgets):** ROUND-TRIP(`st=STATE_SAMPLE`; step (2) picks the second unit with a
  row): both listboxes' option for the unit has `aria-selected="true"`; `StatePanel h2` = the
  unit's label; the panel lists every `STATE_SERIES` row of the unit (count equal) with
  tier and note, its other heads under `other heads, not comparable across states`, its
  strength rows, its `state-police` analytic records verbatim with their innocent readings,
  its installations by kind and its commissionerates with the fixed sentence; clicking the
  selected option again removes `st`. `st=dl`: the panel's first line is `Delhi's police is a
  Union demand line — see Q7`, the Delhi Police lanes carry `aria-current="true"`. `st=jk`: the
  panel quotes the RBI row's note on the move to Demand 51 (skip when no such note). On
  Footprint, `st` accents the unit and `TWIN(places)` rows all have State = the unit; on
  Procurement the control reads `a vendor's registered office is not where its work is`.

### AC-78 — Round-trip `fy` as a year or a range, dimming and never cropping
- **Check (Budgets):** ROUND-TRIP(`fy={FY_AXIS[5]}`): that column's opacity = 1 and every
  other `[data-column]`'s computed opacity ≤ 0.3 at 1280; `[data-column]` count unchanged;
  `[data-caption="C4b"]` present; the x-domain (first and last axis labels) unchanged.
  ROUND-TRIP(`fy={FY_AXIS[3]}..{FY_AXIS[10]}`): From/To read those; `TWIN(ledger-long)` rows'
  FY ∈ range; the office lanes' highlight covers the range. The control carries `strength
  tables dated 1 January Y count in FY Y−1–Y`. On Footprint the control reads `does not apply:
  {dated} of {n} installations carry a date`; on Procurement `TWIN(awards)` rows' dates fall in
  the range or the row reads `undated` only when no `fy` is set.

### AC-79 — Round-trip `stage` with each option's coverage
- **Check (Budgets):** ROUND-TRIP(`stage=actual`): the stack redraws (`[data-column-state]`
  sequence equals the `actual` coverage of `DEFENCE_DEMANDS`); `DelhiLine`'s accent follows;
  the ledger still shows three slots per FY at `D` (`[data-slot]` count unchanged); the strip's
  fact 1 ends `· actual`. Setting the control back to `DEFAULT_STAGE` removes `stage` from the
  URL.

### AC-80 — Round-trip `comp` as a comma list that reaches the ledger and not the stack
- **Check (Budgets):** ROUND-TRIP(`comp=pay,pension`): `[data-lane]` count = `LANES` with
  component ∈ {pay, pension}; the ledger heading reads `{k} of {n} lanes under the component
  filter`; the stack's `[data-band]` sequence is unchanged and its figure reads `the stack
  shows every component; the filter applies to the ledger`; the control reads `components
  overlap by level; this filter never adds rows`.

### AC-81 — Round-trip `sfy` and `m`, disabling what the denominator cannot divide
- **Check (Budgets):** ROUND-TRIP(`sfy={a STATE_PAIRS member with fy === GSDP_FY other than
  the default}`; skip when none): the spend map's fill classes equal `SPEND_CLASS(st, pair)`;
  the denominator line names the pair. ROUND-TRIP(`m=cr`): every drawable pair is enabled; the
  legend bins are ₹ crore; no `%`. Load `?m=percap`: (S3 absent) the option is
  `aria-disabled="true"`, focusable, named `Per person, unavailable: no population series in
  this build; a 2011 Census base would re-rank states (S3)`, the map falls back to `gsdp` and
  the amber line reads `ignored an unrecognised m value` **or** the control's reason — the
  check accepts the reason and fails on a per-person ₹ anywhere; (S3) `m` defaults to `percap`
  and every per-person element names its basis and year (SG-11).

### AC-82 — Round-trip `sy`, keeping every year in the table
- **Check (Budgets):** ROUND-TRIP(`sy={a STRENGTH_YEARS member ≠ DEFAULT_SY}`): the strength
  map's fill classes equal `STRENGTH_CLASS(st, sy)`; `TWIN(state-table)` still shows a per-lakh
  column for every `STRENGTH_YEARS` member; the legend's bin edges are identical under every
  `sy` tried (AC-145); the selected strength-year segment is pressed or checked and the
  strength map's visible title or legend names `{sy}`. [Adjudicated 2026-10-06: `sy` is exempt
  from the active-filter line (§0.7 step 4), so its visible state is asserted here.]

### AC-83 — Round-trip `kind` as a comma list, with 0-row kinds always listed
- **Check (Footprint):** ROUND-TRIP(`kind=cantonment`): `[data-dot]` count + Σ overflow = rows
  with `kind === 'cantonment'`; hatch count = units with none of that kind; `TWIN(places)` rows
  all have Kind = cantonment; the matrix accents that column; every `KINDS` chip stays in the
  DOM. `kind=cantonment,drdo-lab`: the union. The 0-row chips remain `aria-disabled`.

### AC-84 — Round-trip `body`, accenting lanes and never filtering
- **Check (Budgets):** ROUND-TRIP(`body=CAPF_SAMPLE`): `[data-lane]` count is unchanged from
  rest; every lane `th` of that body has `aria-current="true"` and the hidden words `selected
  body` (count = that body's lanes); `BodyCard h2` = the body's label with `Go to its {k} lanes
  in the ledger` whose activation moves focus to the first accented lane; the body's
  `<details>` group is open at `M`. `body={an id not in LANES}`: the amber line reads `ignored
  an unrecognised body value`.

### AC-85 — Round-trip `cell`, opening the `CellCard`
- **Check (Budgets):** ROUND-TRIP(`cell=CELL_PARAM`): the `CellCard h2` names the body, line
  and FY; its rows = `LANE_ROWS` at that FY; each row has `Copy citation` whose activation
  writes to the clipboard and renders an `<output>` containing the head verbatim, the stage
  word, the FY, an `http` URL, `#/security?cell=` followed by `CELL_PARAM` (raw or
  percent-encoded) and `read to {ASOF}` (U12); the cell carries `aria-current="true"`.
  `Close` removes `cell` and returns focus to the cell.
- **The slug (§4 `{laneKey slug}@{fy}`):** `CELL_PARAM` has a non-empty slug and ends
  `@{CELL_SAMPLE.fy}`; harvesting it again from a fresh load with `comp={CELL_SAMPLE component}`
  gives the identical string (the slug names the lane, not its position on screen); the same
  lane's button at another `FY_AXIS` year writes the same slug with that FY after the `@`;
  another lane of `CAPF_SAMPLE` at the same FY writes a different slug (`SKIPPED: one lane` when
  the body has one, never a pass).
- **Unknown value (spec §10, unknown-value row):** `?cell=x@1900-01` opens no `CellCard`, selects no cell, and
  exactly one amber line under the strip reads `ignored an unrecognised cell value`; the bad
  value is not re-written into the URL by the page (as AC-94).
- [Adjudicated 2026-10-06] `cell=CELL_SAMPLE` named a `(LANE_KEY, fy)` pair, not a URL value,
  and §4 leaves the slug to the builder; the check takes the page's own value and asserts only
  what §4 and §10 fix: the `@{fy}` suffix, a slug that is a function of the lane key, the deep
  link carrying it, and the unknown-value line AC-94's list omitted.

### AC-86 — Round-trip `vendor`, accenting and opening with comparators, never filtering
- **Check (Procurement):** ROUND-TRIP(`vendor={VENDOR_NO_AWARD}`): `[data-vendor-card]` count
  = `VENDORS.length` (unchanged); the card has `aria-current="true"` and `selected vendor`; the
  margin (`aside`, inline at `M`) holds ≥ 2 `<dl>`s with identical `dt`s, one the vendor, the
  others `COMPARATORS(v)` (or, when none, the other class band's summary rows `{k} vendors, {n}
  named awards`); `VendorCard h2` reads `{vendor} beside {comparators}`; clicking the accented
  label again removes `vendor`. `vendor={a node id ∉ VENDORS}`: `{label} is not a vendor in
  this register` and a `Show connections` button (E30). Under every URL in SG-RF3's set
  (`lens=procurement`, each `vendor`, each `fy` with an award, `tier=documented`,
  `tier=alleged`, `tier=none`, each vendor label as `find`), at `D` and `M`: no DOM state
  contains exactly one `[data-vendor-card]` or exactly one vendor `<dl>` in the margin.

### AC-87 — Round-trip `case`, accenting both columns, never filtering
- **Check (Procurement):** ROUND-TRIP(`case={a CASES member}`): `[data-pair]` count unchanged;
  the pair row's `<section>` has `aria-current="true"` and `selected case`; both its `<dl>`s
  carry the accent border; `window.scrollY` places the row's `h4` within the viewport after
  load; the `Go to the pair row` link moves focus to the `h4`.

### AC-88 — Round-trip `rec`, opening the `RecordCard`
- **Check:** ROUND-TRIP(`rec={ENFORCE_WITH_CONTRA}`) on Procurement: the `RecordCard h2` = the
  record's `lab`; it lists its response(s) and a citation `<output>` ending `read to {ASOF}`
  with an `http` URL; `rec={unknown}`: `No record {id} in this register.`; `Close` removes
  `rec` and returns focus to the invoking control (or the Find input when arriving by URL).

### AC-89 — Write `sel`, `focus` and `hops` only through Show connections, and never the graph's other params
- **Check:** Press `Show connections` on `CAPF_SAMPLE`'s label: the URL gains `sel={id}`,
  `focus={id}`, `hops=1`, focus lands on `#connections h2`, a `Back to {origin}` link is
  present; across every control change in §6 the URL never gains `q`, `fam`, `pred`, `ty`,
  `amt`, `path`; `Apply {fy} to the graph` (with `fy` set) writes `from`/`to` and nothing else
  (SG-38).

### AC-90 — Round-trip `tier` as a comma list shared with the graph
- **Check:** ROUND-TRIP(`tier=documented,reported`): the two toggles pressed; `TWIN(ledger-
  long)` rows' Tier ∈ the set; the live region's last message matches `/tier filter: documented,
  reported; from (\d+) to (\d+) (rows|records)/`; the graph's drawn edge count (its status line)
  differs from the unfiltered count; `tier=none`: every twin reads `0 rows` in its summary and
  the frames hold (AC-60); the swatches are `aria-hidden` and the word is the label.

### AC-91 — Round-trip `find` and filter nothing by it
- **Check:** ROUND-TRIP(`find=Police`): the results list groups `Bodies`, `Places`, `Vendors`,
  `Cases`, `Records` as applicable, ordered exact label → alias → label substring → `lab`
  substring, ties by label; no result is auto-selected (no `st`, `body`, `vendor` in the URL);
  every twin's row count equals its unfiltered count; the live region reads `{k} matches for
  Police` once (300 ms debounce). The results' verbs are exactly `Show its budget lines`, `Show
  connections`, `Show in footprint`, `Where its police money sits`, `Show vendor`, `Show the
  pair`, `Open record`; a `CITY_BODIES` result never carries `Show its budget lines` (U29).
  The active-filter line does not name the Find text: adjudicated under §0.7 step (4) (Reading B, 2026-10-07).

### AC-92 — Round-trip `view=table` and keep it across a lens change
- **Check:** ROUND-TRIP(`view=table`): every `details[data-twin]` on the lens has `open`; every
  `<figure>` drawing (`svg`, `[data-column]`, `[data-dot]`) is hidden (`display: none` or
  `hidden`); Q `h3`s, `AnswerLine`s and the Q1 answer sentence remain visible; the `Table view`
  toggle has `aria-pressed="true"`; pressing a tab keeps `view=table` and the new lens's twins
  are open; pressing the toggle removes `view`.
- [Open adjudication 2026-10-07 — intermittent load timeout under `view=table`; see the note
  under AC-93. Criterion and test unchanged.]

### AC-93 — Round-trip `tp` and page at 400
- **Check (Budgets):** When `UNION_ROWS.length > 400`: `TWIN(ledger-long)` shows 400 rows at
  `tp` absent; ROUND-TRIP(`tp=2`): rows 401–800 (the pager reads `page 2 of {⌈n/400⌉}`); the
  union of rows over every `tp` = the rows in view; `tp=1` is elided.
- [Open adjudication 2026-10-07 — AC-52, AC-92 and AC-93 (intermittent); judges disagree;
  criteria and test unchanged until the lead decides] Every logged failure is
  `page.waitForSelector: Timeout 5000ms exceeded` on `article.pb-20` (in `load()` or the
  round-trip's fresh page) or on the `tp` URL write, always on Budgets under `view=table`; no
  assertion of the three criteria failed. Measured at D on the pinned dist: `view=table` renders
  82,863 elements (37,800 without), `article.pb-20` 3.2–3.9 s after `networkidle` behind one
  2.2–2.6 s long task; a ledger-long pager press 1.1–1.7 s; at 3× CPU throttle about 15 s to the
  article and 6.7–7.4 s per press. `ledger-coverage` (3,556 rows, lanes × FYs) is the largest twin.
  - **Position A (test defect):** §0.1 and these criteria state no time; the 5 s is the suite's
    own `ACTION_TIMEOUT`. The spec requires every twin open under `view=table` (E40) and the
    coverage twin unpaged (SG-21, AC-98; paging is UD33, deferred). Proposed: a 30 s
    `LOAD_TIMEOUT` for the load anchors (adding the §0.1 `main h1` wait to the round-trip's fresh
    page) and for the URL waits that follow a full Budgets re-render under `view=table`; every
    assertion and the 5 s slice timeout unchanged.
  - **Position B (page defect):** table view is the screen-reader, keyboard and phone route, and
    a phone frozen ~15 s on load and ~7 s per page is reader harm; raising the wait removes the
    suite's only guard. Proposed page fix: memoise the coverage twin and the ledger union on a
    budget-filter signature that excludes `tp`/`view`, keep `tp` from re-rendering the whole lens,
    and do not mount the hidden drawings under `view=table`; target `article.pb-20` ≤ 2 s after
    `networkidle` and a pager press ≤ 500 ms at D. Coverage stays unpaged.

### AC-94 — Fall back from an unknown value with one amber line
- **Check:** For each of `lens=x`, `stage=x`, `st=zz`, `fy=1900-01`, `sfy=x`, `sy=1`, `kind=x`,
  `m=x`, `payer=x`, `view=x`: the page renders the default for that param and exactly one line
  under the strip reads `ignored an unrecognised {param} value` in amber; no console error; the
  bad value is not re-written into the URL by the page.

### AC-95 — Reset every page param except `lens` and `view`, never the graph's
- **Check:** Load `?lens=footprint&view=table&st={unit}&kind=cantonment&tier=documented&find=x&
  fy=2014-15&q=abc&fam=state&sel={id}`; press `reset` in the active-filter line: the URL is
  exactly `lens=footprint&view=table&q=abc&fam=state&sel={id}` (order-insensitive); the live
  region announces the reset once. The rail's foot line reads `Not offered: party, government,
  era, vendor-class-only, 'risk' and city-budget filters — why →` with a link to `#refusals`.

### AC-96 — Copy the exact link and announce it
- **Check:** With `?lens=procurement&vendor={id}&fy=2014-15..2024-25` loaded, press `Copy
  link`: `navigator.clipboard.readText()` equals `page.url()`; the live region reads `Link
  copied`; `history.length` unchanged.

---

## 7. Table twin = visible graphic — FULL build (seats A, P)

*Why: a twin that disagrees with the picture by one row has published two findings. Rows and
marks come from the same arrays, and every export reproduces the screen.*

### AC-97 — Match the stack twin to bands, totals, hatched columns and the bracket rows, with no glyph tokens
- **Check (Budgets):** `TWIN(stack)` row count = `[data-band]` count + 2 × `FY_AXIS.length`
  (one `published total` row per `(FY, panel)`, present even where `none`) + hatched `(FY,
  panel)` count + rows of kind `pay lines ({k})`, `Agnipath lines`, `Delhi Police (inside the
  Police demand)` and `police pay`; the `kind` column takes only those words; no cell contains
  `=`, `≠` or `·` alone (the reconciliation is `equals the published total` / `exceeds the
  published total by ₹{Δ} cr ({pct}%), computed here` / `no published all-demands total for
  this FY`); each band row's ₹ cell satisfies CR-CONTEXT and its share cell carries the basis
  words; the `<caption>` equals the figure's answer sentence (U10, U11); the summary reads
  `/Q1 — .+ as a table · (\d+) rows/`.

### AC-98 — Match the ledger's long form to the rows in view and its coverage twin to lanes × FYs
- **Check (Budgets):** Σ over `tp` of `TWIN(ledger-long)` rows = `UNION_ROWS` minus
  `grant-to-states` under the active filters (= the ledger's `[data-effect]` `k`);
  `TWIN(ledger-coverage)` rows = `[data-lane]` count × `FY_AXIS.length`, each cell `₹{x}` or
  `no row in this register` (`₹0 cr — as recorded` for a zero); a two-edition slot
  (`data-slot-state="two"`) has two long-form rows and the note names the edition (E3); the
  group order is Published totals, then bodies alphabetical, then Delhi Police, and no lane
  order changes under `stage` or `fy` (lanes are never ordered by ₹).

### AC-99 — Match the office twin to the role records
- **Check (Budgets `B2`):** `TWIN(office)` row count = `role` edges into `MOD` and `MHA` (and
  any body with ≥ 1 dated role edge); `[data-mark="office"]` count = `ROLE_WINDOWS.length`; a
  window with `k` records reads `×{k} records` on its bar's twin rows; `OPEN_ENDED` rows read
  `end not recorded`; the `party as recorded` column is text only and is never a `fill` or
  `stroke` key (AC-139).

### AC-100 — Match the spend map twin to 36 units and make its sortable columns the dot strip
- **Check (`B6`):** `TWIN(spend-map)` rows = 36 in `UNITS` order; per class the rows whose
  class words read `no row in this register` / `police paid by the Union` / `GSDP not in this
  build` / a value equal `path[data-fill-class="hatch|crosshatch|hatch+GSDP words|value"]`
  counts; the `% of GSDP` and `₹ cr` columns have `Sort by …` buttons with `aria-sort`; sorting
  by `% of GSDP` orders the rows exactly as the dot strip's `aria-hidden` labels (read as a
  sequence of state codes); the default order is north to south (U30).

### AC-101 — Match the strength map twin to 36 units with the note's words on derived counts
- **Check (`B6`):** `TWIN(strength-map)` rows = 36; class words `counts recorded without
  per-lakh` / `no row in this register` / a value equal the painted classes; per-lakh values
  equal `perLakh` as recorded (never recomputed: the check compares to the row, not to
  `actual ÷ population`); a row whose note carries the DERIVED sentence prints it; a vacancy
  share appears only where `sanctioned` and `actual` are both numbers and the row is not
  derived (SG-12).

### AC-102 — Export the state table as two machine tables
- **Check (`TWIN(state-table)`):** two `Download .tsv` buttons (`spend`, `strength`); the spend
  TSV's header is `st, state, fy, fy_start, stage, head, cr, tier, note, gsdp_cr, gsdp_fy,
  gsdp_tier, pct_gsdp, source_urls` and its data rows = `STATE_ROWS.length` (own-series and
  PRS rows carry their own `head` and `tier`, never `Police (MH 2055)`); the strength TSV's
  header is `st, state, year, per_lakh, sanctioned, actual, women_pct, derived_counts, tier,
  note, source_urls`, rows = `FORCE_STRENGTH` with `st`, and `derived_counts` is `true` exactly
  for rows whose note contains `DERIVED` (S4: `derived` non-empty) (U17).

### AC-103 — Match the kind matrix to 36 × every declared kind, and the place list to the dots
- **Check (Footprint):** `TWIN(footprint-matrix)` has 36 rows and `KINDS.length` kind columns
  plus `cities`; each cell equals `FP_BY_STATE[st][kind]` or `no row`; Σ cells =
  `FORCE_FOOTPRINT.length`. `TWIN(places)` rows (Σ over `tp`) = `[data-dot]` + Σ overflow under
  the active `kind` and `st`; each row's Sources cell lists every `srcs` label; a row with
  `since === null` reads `date not printed on the list`; rows are ordered state (north to
  south), city, label.

### AC-104 — Match the award twin to marks, unpriced contracts and empty years
- **Check (Procurement):** `TWIN(awards)` rows = `[data-mark="award"]` (a `JOINT` pair counted
  once with `joint total ₹{x} cr announced for {vendors}; not split`) + `[data-mark="award-
  unpriced"]` + `EMPTY_YEARS.length`; each award row has `Open record: {vendor}, {date}`
  (writes `rec`); the class cell is `public sector` / `private, JV or foreign` /
  `unclassified`, never `state`/`capital`; the response cell is a response or the exact
  sentence.

### AC-105 — Match the slice twin to classes, two reference rows and class-years, with the share computed here
- **Check (Procurement, S8):** `TWIN(slice)` rows = `SLICE.rates.byClass.length + 2 +
  SLICE.rates.byClassYear.length`; each class row's share column = that class's dedup rows ÷
  the slice's dedup total × 100 ± 0.01 with `computed here` (U31); each class-year row's rate,
  low, high, `whole file same portal` and `whole file` equal the file's; small-year rows read
  `n {n}: no rate drawn`; the TSV's `#` lines include the dedup rule and each input digest.

### AC-106 — Match the case-timeline twin to the ticks and the field table to the columns
- **Check (Procurement):** `TWIN(case-timeline)` rows = `[data-mark="case"]` count +
  `[data-mark="response"]` count; the `kind` cell ∈ {court, audit, investigation, allegation,
  decision} and agrees with the check's own classification of the source node's `ty`/`fam`
  (a fixture whose `lab` says `CBI` but whose source is a court must read `court` — asserted
  on the module where such a record exists, else SKIPPED); `TWIN(case-fields)` rows =
  `[data-case]:not([data-case="none"])` count (= `CASES.length`) × 11 (one per field), each
  value or its null words. [Adjudicated 2026-10-06: the pairing-sentence `<dl>` of an unpaired
  case carries `data-case="none"` (§0.6) and has no fields of its own.]

### AC-107 — Match the Delhi line twin to its points and the city ledger to the commissionerates plus Delhi
- **Check (Budgets `B7`):** `TWIN(delhi)` rows = distinct `(fy, stage)` over `DELHI_POLICE`
  rows; `[data-mark="delhi"]` count = the same; no line segment spans a missing FY (the number
  of `<path>` segments per stage = runs of consecutive present FYs); each row has `Open the
  line: Delhi Police {fy} {stage}` (U25) and a share cell `computed here` only where the police
  total exists at that `(fy, stage)`. `TWIN(city-ledger)` rows = `COMMISSIONERATES.length + 1`
  (AC-63).

### AC-108 — Head every TSV with its provenance and name the file `security-`
- **Check:** For every `Download .tsv` on every lens (one per twin): the download's
  `suggestedFilename()` matches `/^security-(budgets|footprint|procurement)-[a-z0-9-]+-\d{4}-\d{2}-
  \d{2}-run-[0-9a-f]+\.tsv$/`; the first lines begin `# table:`, `# rows:`, `# url:`, `# lens:`,
  `# force {RUN} asOf {ASOF}`, then `# open-market slice {digest} asOf {date}` where the table
  reads the slice, then, wherever a ₹ column exists, `# amounts: ₹ crore, nominal, as
  published; not deflated; stage {stage}`; no `#` line names `finance`, `ngo`, `capital` or
  another fleet's run id; numeric machine columns parse as numbers or are empty; `cr` of a
  zero row exports as `0`; `Copy as TSV — {table}` writes the same text to the clipboard and
  the live region reads `{table} copied, {rows} rows` (SG-22, U16).

### AC-109 — Print the class's meaning in every twin, never the token
- **Check:** Across every twin on every lens, no `td` has `innerText` exactly `hatch`,
  `stipple`, `crosshatch`, `hollow`, `value`, `zero`, `hidden`, `state`, `capital` or `none`;
  a class is always its words (`no row in this register`, `police paid by the Union`, `counts
  recorded without per-lakh`, `₹0 cr — as recorded`, `public sector`, `private, JV or
  foreign`).

### AC-110 — Open every twin under `view=table` and hide the drawings
- **Check:** `?view=table` on each lens: `details[data-twin]:not([open])` count = 0; every
  `[data-twin] table` has a `<caption>`; no visible `svg` inside a `<figure>`; `TWIN` row counts
  equal their stage-view counts (opened one by one at rest).

---

## 8. Keyboard reachability — FULL build (seat A)

*Why: every graphic is reachable by a real control, nothing focusable hides inside a hidden
drawing, and one live region says what changed in words.*

### AC-111 — Drive the lens tabs with arrows and activate on Enter, not on focus
- **Check:** `[role="tablist"]` holds three `[role="tab"]` named `Budgets`, `Footprint`,
  `Procurement and people`; focus Budgets, press `ArrowRight`: focus on Footprint,
  `aria-selected` unchanged, URL unchanged; press `Enter`: URL `lens=footprint`, the panel's
  `aria-labelledby` = the tab's id, its `h2` = `Footprint`, focus on that `h2`; `Space` on
  Procurement does the same with `h2` `Procurement and people`.

### AC-112 — Reach the stack's FY axis in one tab stop and open a year with Enter
- **Check (Budgets):** Tabbing from the first TABBABLE in `<main>` reaches an FY axis button
  within 15 stops; exactly one axis button has `tabindex="0"`; `ArrowRight`/`ArrowLeft` move
  focus along `FY_AXIS` without leaving, `Home`/`End` to the first/last; each button's name
  matches `/^\d{4}-\d{2}, (BE|RE|actual): defence ₹[\d,.]+ crore in \d+ demands, computed here,
  pensions [\d.]+ percent, (equals the published total|exceeds the published total .+|no
  published total); police ₹[\d,.]+ crore$/` or `/^\d{4}-\d{2}, no (BE|RE|actual) rows recorded$/`;
  `Enter` opens the `FYReadout` (its `h2` names the FY) and moves focus to that `h2`; the
  readout lists each demand row with head, ₹, tier, source, `read to {ASOF} · document: {label}`,
  the published total or `no published all-demands total for this FY`, the reconciliation
  sentence, `{k} pay lines`, the police check and Delhi Police; `Escape` with focus inside
  closes it and returns focus to the axis button; the chosen button has `aria-current="true"`.
  A link `Skip to the table` precedes the figure and opens `TWIN(stack)`.

### AC-113 — Drive the ledger as a grid with a roving tabindex
- **Check (Budgets):** `[role="grid"]` with `aria-rowcount` = `[data-lane]` count + header rows
  and `aria-colcount` = `FY_AXIS.length` + label and max columns; lane labels `th[scope="row"]`,
  FYs `th[scope="col"]`; `Tab` reaches it within 20 stops and lands on one cell; arrows move by
  lane and FY; `Home`/`End` go to the lane's first/last FY; `Enter` writes `cell` and moves
  focus to the `CellCard h2`; `Tab` leaves the grid in one stop; each cell button's name
  matches `/^.+ — (total|revenue|capital|pay|pension|other) — .+, FY\d{4}-\d{2}: BE (₹[\d,.]+
  crore|no row), RE (₹[\d,.]+ crore|no row), actual (₹[\d,.]+ crore|no row) — open for its share
  of the demand and the previous year$/`; bars are `aria-hidden`.

### AC-114 — Drive the three maps as listboxes and announce each unit
- **Check:** Each of the two `B6` maps and the `F1` map is `svg[role="listbox"]` with 36
  `[role="option"]` in `UNITS` order; `Tab` into the spend map within 30 stops; `ArrowDown`
  moves `aria-activedescendant`; option names carry the class in words and the value with unit
  (`{State}: {class words}, {value} {unit} · ₹{cr} cr {fy} {stage} · {denominator} · {comparison}`
  on spend; `{State}: {k} installations in {c} cities` on footprint; `Manipur: no row in this
  register`-form for hatch); `Enter` writes `st` and moves focus to the `StatePanel h2`;
  `Escape` inside the panel clears `st` and returns focus to the option; no `path` is focusable
  and every shape is `aria-hidden`.

### AC-115 — Put nothing focusable inside a hidden drawing
- **Check:** On every lens and under `cell`, `st`, `vendor`, `case`, `rec`, `view=table`:
  `[aria-hidden="true"] :is(TABBABLE)` count = 0 and `[role="img"] :is(TABBABLE)` count = 0;
  `[data-mark="award"] :is(a, button)` = 0; `[data-tick="agnipath"]` is not an `<a>` and has no
  `tabindex`; `[data-mark="delhi"]` likewise; the dot strips and the AoN card's frame are
  `aria-hidden` with no TABBABLE inside (SG-46, U25).

### AC-116 — Keep every closed twin out of the accessibility tree and open it from its skip link
- **Check:** For every `details[data-twin]:not([open])`: its content's `innerText` is empty and
  it holds 0 TABBABLE descendants; after clicking its summary every control inside (sort
  buttons, `Open record`, pagers, `Download .tsv`) is tabbable; before each graphic a link
  `Skip to the table` opens that twin and moves focus to its `<caption>`; directly after the
  tabs one link reads `Every graphic on this lens has a table; show them all` and sets
  `view=table`.

### AC-117 — Announce every change through one live region, in words
- **Check:** `[aria-live]` count = 1, `aria-live="polite"`; after a Stage change the region's
  text matches `/from (\d+) to (\d+) rows/` and contains no `→`; after a lens change it names
  the lens; after `Copy citation` it reads `Citation copied`; after choosing an FY it reads the
  readout's title; no `aria-describedby` target contains `→` (SG-47); two filter changes within
  150 ms produce one message.

### AC-118 — Keep unavailable options reachable by keyboard, never `disabled`, with the reason in the name
- **Check:** Every `aria-disabled="true"` element on the page (State `(0)` options, undrawable
  pairs, `m=percap` without S3, 0-row kind chips, inactive rail controls) has no `disabled`
  attribute and is reachable from the keyboard:
  - a native `<option>` (State `(0)` options, undrawable `sfy` pairs) through its enclosing
    `<select>`, which exists, has no `disabled` attribute and is itself focusable by `Tab`
    (`tabIndex ≥ 0`);
  - a `role="option"` (the map listboxes, AC-114) through its `role="listbox"` ancestor, which
    has `tabIndex ≥ 0`, the option carrying an `id` for `aria-activedescendant`;
  - every other element by `Tab` itself (`tabIndex ≥ 0`).

  Its accessible name or `aria-describedby` text (for a native `<option>`, its text) contains a
  reason (`GSDP in this build is for`, `no population series`, `none in this register`, `does
  not apply`, or `not budget rows`); for a State `<option>` only, its `(0)` count is the reason
  (spec §6, State row).
  [Adjudicated 2026-10-06] Browsers never Tab to an individual option, so "focusable by `Tab`"
  failed the native `<option>`s the spec itself prescribes (§6 State row, §5.1.6) and the
  listbox options of AC-114; §3.5 and §13 require only "focusable", so the exemption covers Tab
  focus alone and reachability moves to the option's single tab stop.

### AC-119 — Mark every selection with state and move focus to it from the margin
- **Check:** For `body`, `vendor`, `case`, `cell` set by URL: `[aria-current="true"]` count =
  the check's own count of accented items (the body's lane count; 1 card; 1 pair section; 1
  cell) and each carries the words `selected body` / `selected vendor` / `selected case`; for
  `st`, `[aria-selected="true"]` count = 2 on Budgets (both maps) and 1 on Footprint; each
  margin card's `Go to …` link moves `document.activeElement` to the first accented element
  (SG-51, U24).

### AC-120 — Close every panel from a control that returns focus, and on Escape only from inside
- **Check:** For each of `rec`, `cell`, `st`, `vendor`, `case`, `body`: open by its control, press
  the panel's `Close` (the first TABBABLE after its `h2`): the param leaves the URL and
  `document.activeElement` is the invoking control, scrolled into view; reopen; `Back to
  {origin}` at the panel's foot does the same; with focus on the rail (outside the panel)
  `Escape` does nothing; with focus inside, `Escape` closes it (SG-39).

### AC-121 — Reach the stack, the ledger, the spend map and the first pair within the tab budgets
- **Check (`FOLD`):** Counting `Tab` presses from the first TABBABLE in `<main>`: an FY axis
  button ≤ 15; a ledger cell ≤ 20; the spend map listbox ≤ 30; on Procurement a `[data-pair]`
  `<dl>`'s first TABBABLE ≤ 40 via the `SymmetryContents` chapter-4 link or the skip link `Skip
  the {n} vendor cards to chapter 2`; `Show connections` moves focus to `#connections h2`.

### AC-122 — Keep the outline sound: one h3 per Q-block, a caption per table, no skipped level, no duplicate names
- **Check:** In `main` and `aside` heading levels never skip (every `h{n}` is preceded by an
  `h{n−1}` or `h{n}`); exactly one `h3` per `[data-q]` section and figure-internal titles are
  `h4` or plain text (U26); `main h1` count = 1; every `<table>` has a non-empty `<caption>`
  naming population and active filters; every `aria-describedby` and `aria-labelledby` id
  resolves; within any one `<section>`, `<table>` or `<ul>`, no two enabled buttons or links
  share an accessible name; `#resolution` is a `section[aria-labelledby]` with a visible `h2`;
  the strip is `section[aria-label="Denominators"]` with a hidden `h2`; `abbr[title="crore"]`
  exists on the first `cr` of each table.

### AC-123 — Make no vendor card a composite widget, and skip the grid in one link
- **Check (Procurement):** No `[data-vendor-card]` or its ancestor has `role` in {grid, listbox,
  tree, application}; each card has a navigable `h4` (the vendor label) and its buttons sit in
  natural tab order (`tabindex` absent or `0`); a link `Skip the {VENDORS.length} vendor cards
  to chapter 2` precedes the grid and moves focus to the chapter-2 `h4`; the card `<dl>`s have
  identical `dt` sequences of 13 (`data-field` `1`…`12` plus `3b`) (U28, D61).

---

## 9. Mobile at 390 px — FULL build (seat M)

*Why: a page that scrolls sideways has hidden a column; a diagram whose labels halve has
hidden a word. Everything moves; nothing is hidden.*

### AC-124 — Scroll the page vertically only, in every state
- **Check (`M` and `M360`):** NO-HSCROLL for each of `/#/security`, `?lens=footprint`,
  `?lens=procurement`, `?view=table` on each lens, `?cell={CELL_SAMPLE}`, `?lens=procurement&
  vendor={id}`, `?lens=procurement&case={id}`, `?rec={id}` (arriving by URL, no opener),
  `?st=dl`; no open twin's `<table>` has `scrollWidth > clientWidth` unless it carries the
  `{k} columns · later ›` step button and its hint text; the award and case-timeline containers
  carry `‹ earlier` / `later ›` buttons (SG-31, U8).

### AC-125 — Pin one line of strip and one row of tabs within 140 px
- **Check (`M`):** `[data-pinned-stack]` height ≤ 140 px and `position: sticky|fixed`; it holds
  the site header, one strip line matching `/(\d[\d,]*) of (\d[\d,]*) rows · (BE|RE|actual) ·
  read to \d{4}-\d{2}-\d{2} · levels/` whose `levels` link's accessible name is `what resolves at
  which level`, and the three tabs on one row (`getBoundingClientRect().top` equal ± 1 px)
  with visible labels `Budgets`, `Footprint`, `Procurement` and accessible names including
  `Procurement and people`, each ≥ 44 px tall; facts 2–6 and the byline appear whole in a mono
  list directly after the first `figcaption` (Budgets fact 2 excepted, carried by the answer
  sentence); the `ReconciliationLine` is a `<ul>` under Q1's caption and not sticky (U3, U10).

### AC-126 — Put Find first under the tabs, outside the rail, never pinned
- **Check (`M`):** `input[type="search"]` is the first TABBABLE after the last `[role="tab"]` in
  DOM order, is not a descendant of the rail `<details>` or of `[data-pinned-stack]`, spans the
  content width ± 16 px, and its results render directly beneath it; a `CITY_SAMPLE.city`
  search prints the fixed city sentence inside the result itself (U4).

### AC-127 — Measure the 390 fold against its ceilings and record it
- **Check (`M`, Budgets, cold load, `scrollY = 0`):** the bottom of the rail summary (`details >
  summary` matching `/Filters \((\d+)\) · (\d+) → (\d+)/`) ≤ 1,688 px and the strip, tabs and
  Find are above it; the top of `[data-q="B1"] figure` ≤ 2,110 px; the measured values are
  printed by the test and recorded below (U2, D58, SG-33). (`FOLD`, Budgets) the pension band
  of the latest drawn column and its share label are within 800 px (AC-140).

| measurement (`M`, 390 × 844, first build) | ceiling | measured |
|---|---|---|
| bottom of the rail summary | 1,688 px | — (measured on the first build; never an aspiration) |
| top of the `DemandStack` figure | 2,110 px | — |
| `[data-pinned-stack]` height | 140 px | — |

### AC-128 — Draw the stack at full width with a 44 px step control
- **Check (`M`, Budgets):** the `DemandStack` figure's `scrollWidth ≤ clientWidth` (no inner
  horizontal scroll); `[data-column][data-panel="defence"]` count = `FY_AXIS.length`; FY labels
  are drawn on every fourth column plus the latest; the pension share label appears on the
  latest column only (and on the chosen FY after a step); a step control `‹ earlier · FY{fy} ·
  later ›` sits under the chart with three buttons each ≥ 44 × 44 px; pressing `later ›` moves
  the roving FY and the chosen column's label stays visible; a first tap on a column shows the
  readout line and a second tap on the same column opens the `FYReadout` inline; a tap on a
  different column re-reads and does not open (U5); the twin is a closed `<details>` whose
  opened form is `StackTable` cards (U6).

### AC-129 — Collapse the rail into a labelled details block with the effect outside
- **Check (`M`):** the rail is a `<details>` whose summary matches `/Filters \((\d+)\) · (\d+) →
  (\d+)/`; the `[data-effect]` line of the last change sits outside it and stays visible while
  closed; the selects inside are native `<select>`; the Footprint kind chips become checkboxes
  inside it with counts, 0-row reasons and one `all kinds` control (U8); the rail foot's
  refusal line is present and links to `#refusals`.

### AC-130 — Draw the ledger one stage at a time, groups closed, with step buttons
- **Check (`M`, Budgets):** `[data-slot]` per lane per FY = 1 (the stage of the control,
  default `BE` with the reason on the control); FY columns ≥ 14 px; the label column is
  `position: sticky` and ≈ 120 px; the drawing's container is `role="region"` named by the
  caption with `‹ earlier` / `later ›` buttons ≥ 44 px and a mono `showing FY{a}–FY{b}` line;
  body groups are `<details>`, closed except the Published-totals group and any `body`-accented
  group, each summary matching `/(\d+) lanes · BE (\d+) RE (\d+) actual (\d+) of (\d+) FYs/`;
  both twins are closed by default (U6, D47).

### AC-131 — Stack the maps, close the state table, and open the selected state inline
- **Check (`M`, Budgets):** the two maps are stacked (the second's `top` ≥ the first's `bottom`),
  each full width with height in `[300, 420]` px; an `Open a state` `<select>` sits under each
  figcaption; legend swatches ≥ 12 px; `TWIN(state-table)` is a closed `<details>` whose
  summary reads `Q6 — … as a table · 36 rows, always all 36` and opens as `StackTable` cards;
  with `st` set, the selected unit's card renders open inline under the maps as the
  `StatePanel`.

### AC-132 — Stack each case pair field by field and each vendor card behind an identical summary
- **Check (`M`, Procurement):** in the first `[data-pair]`, the field blocks alternate left case
  / right case for each of the 11 fields in order (each block labelled with its case), so a
  pair is read side by side in sequence; for an `UNPAIRED` case the pairing sentence occupies
  the right slot of every field; each `[data-vendor-card]`'s `<dl>` is inside a `<details>`
  whose summary matches `/^.+ · (public sector|private, JV or foreign|unclassified) · \d+ named
  awards \(\d+ with ₹\) · 13 fields$/`; the selected vendor's and its comparators' details are
  open; every card stays in the DOM with 13 `dt`s; an open card shows every field including
  sources (D61).

### AC-133 — Give every wide drawing and table step buttons, never swipe only
- **Check (`M`):** the award and case-timeline containers each carry `‹ earlier`, `later ›`
  (≥ 44 px) and `earliest` buttons and a mono line matching `/showing .+–.+ of .+–.+/`, with
  initial scroll at `ASOF`; every table that keeps the table form has a sticky first column,
  ≤ 3 further visible columns and a `{k} columns · later ›` button with hint text; `KindMatrix`
  renders one card per unit listing its kinds with counts and `no row` kinds; every twin with a
  response, source, rule or comparison column renders as `StackTable` cards with the response
  directly under the claim at the same size and sources never behind a disclosure (U8).

### AC-134 — Measure the page length against its ceilings and record it
- **Check (`M`, cold load, at rest, each lens):** the `h3` of the lens's last Q-block has
  `getBoundingClientRect().top + scrollY ≤ 10,128` px (12 viewports); no single `[data-q]`
  section's height exceeds 3,376 px (4 viewports); the measured values are printed and
  recorded below (SG-53, U6).

| measurement (`M`, first build) | ceiling | measured |
|---|---|---|
| Budgets: top of `Q9 — What is not published?` | 10,128 px | — |
| Footprint: top of `Q5 — What is not published?` | 10,128 px | — |
| Procurement: top of `Q6 — What is not published?` | 10,128 px | — |
| tallest Q-block on each lens | 3,376 px | — |

- [Open adjudication 2026-10-07 — judges disagree; criterion, table and test unchanged until the
  lead decides] Both judges measured HEAD 836e841 at 390×844, cold load (probe values, not
  recorded in the table above): Budgets last `h3` 10,023 px, tallest block 2,200 px; Footprint
  3,891 / 1,191 px; Procurement last `h3` (P6) 29,214 px, tallest block P4 17,092 px (its four
  `[data-pair]` rows 15,127 px: Bofors|Rafale 3,768, Sukna 4,459, AgustaWestland 5,299, Adarsh
  1,566), P2 5,943 px, P1 2,770 px. The 12,061 / 4,364 px reported for build r4 are not
  recorded: that build folded record and response fields (AC-65 failed) and was measured before
  the slice loaded.
  - **Position A (criterion defect):** SG-53's ceilings are the UX review's un-rendered estimate
    (UX review §11). §5.3.2 keeps Q2 `SliceBesideFile` "Never collapsed", and §5.3.4/§12/AC-65
    keep every case record and response open at 390, so no spec-conformant page meets 4
    viewports for P2 or P4 or 12 for the lens. Proposed: exempt `[data-q="P2"]` and
    `[data-q="P4"]` from the 4-viewport ceiling (heights printed and recorded), keep every other
    Procurement block ≤ 3,376 px, and apply the 12-viewport ceiling to (P6 `h3` top − P2 − P4) ≤
    10,128 px (6,179 px on 836e841); fill the table from 836e841.
  - **Position B (page defect, with a narrow criterion change):** a ceiling raised enough to pass
    would put P6, the denial-and-void block, 35 phone viewports down. Only the first pair row
    (Bofors|Rafale) and the `literature` symmetry block are forced open at rest (SG-44/AC-152 P-S,
    AC-65), so P4's ceiling becomes 3,376 px plus those two elements' rendered heights; the
    10,128 px heading ceiling stays. The page folds every other pair row whole (claim and
    response together, summary naming no allegation), prints Counter-record responses already
    shown beside their claim as one line, and folds P2's by-year strips and class-definition list;
    the test waits for the slice before measuring. The table stays `—` until a build passing
    AC-65, AC-132, AC-152 and AC-134 is measured.
  - Both agree: nothing may fold a record or a response to meet AC-134 (AC-65); and
    `Procurement.tsx`'s narrow-width fold of the chapter 1–3 symmetry texts (line ~81) is a
    separate page finding against §5.3.0/UD39.

### AC-135 — Render margin panels inline under their opener, with Close and Back
- **Check (`M`):** open `cell`, `st`, `vendor`, `case`, `rec` by their controls: each panel
  renders as the next sibling block after the component that opened it (no `aside` column),
  is scrolled into view once with `scroll-margin-top` ≥ the pinned stack's height, and has
  `Close` after its `h2` and `Back to {origin}` at its foot; a panel opened by URL with no
  opener on screen renders under the Find block.

### AC-136 — Keep the mono floor at 12 px and the graph behind a button
- **Check (`M`):** every element with `font-family` containing `mono` has computed `font-size`
  ≥ 12 px, except `[data-glyph]` (10 px, `aria-hidden`); `#connections` shows a `Load the
  graph` button and no `canvas` until it is pressed; coarse-pointer targets (`button`, `a`,
  `[role="option"]`, `[role="tab"]`, `summary`) have `getBoundingClientRect()` height ≥ 44 px
  or a `::before`/padding hit area that measures ≥ 44 px.

---

## 10. Frozen channels, fold and house rules — FULL build (seats S, A, J)

*Why: on this platform the encoding is part of the claim. Dash is tier, hue is family,
hatch is absence, rose is a response; nothing is ranked by what the page computed; the page's
own words carry no party.*

### AC-137 — Draw tier as dash on every mark and never as stage; draw reported rows in the reported dash with the word
- **Check:** Every `[data-mark]`, `[data-band]` outline, ledger bar and case tick has a
  `stroke-dasharray` ∈ `TIERS` (`none`/solid documented, `6 3` reported, `2 4` alleged,
  `8 3 2 3` analytic) matching its record's or row's tier (series rows by `REPORTED_ROWS`
  membership); no two elements of different tier share a dash; no dash varies with `stage`
  (the BE, RE and actual slots of one documented row share one dash). For every
  `REPORTED_ROWS` row rendered (ledger cell name, `CellCard`, `StateTable` cell, twin row,
  `PlaceList` row, map readout) the element contains the word `reported` and its mark's dash is
  `6 3`, never solid; the six PRS rows appear only in the `District Police line, PRS` column
  (SG-RF1).

### AC-138 — Keep hatch, crosshatch, stipple, zero, hollow, dot, ramp floor and ground distinct in greyscale
- **Check (`M` and `FOLD`, each lens):** screenshot each lens; GREY-compare samples of: the
  hatch pattern, the crosshatch (`dl` on the spend map), the stipple (`dl` on the strength
  map), `ZERO_FILL` (a zero slot, when `ZERO_ROW` is a ledger row), a hollow mark (an unpriced
  award), a footprint dot, the darkest ramp bin and the page ground (`--color-bg`): every pair
  distinct; the darkest ramp bin's luminance ≥ that of `#2e373f`; the four tier dashes
  pairwise distinct by pattern (a documented and an alleged mark differ in `stroke-dasharray`
  and in a 24 px strip's variance); the stack's band lightness steps pairwise distinct (ΔL ≥
  8); the reported-dash map frame distinct from a solid frame (SG-30). Screenshots saved under
  `SECURITY_SHOTS` when set.

### AC-139 — Key no fill or stroke to party, kind, stage or component; share one y-scale; one dot fill
- **Check:** Every `fill`/`stroke` on the page, grouped by the element's data attributes, is a
  function only of: tier (dash), `fam` (hue, on graph nodes, vendor band headers and award
  marks), texture class, selection accent, rose (response) or amber (absence); for the office
  lanes the bar colours are identical across windows whose twin `party as recorded` cells
  differ; `[data-dot]` fills are all one value; each filled `[data-mark="award"]` with `data-cr`
  has the fill `FAMILY_COLOR[nodeOf(e.t).fam]` of a `PRICED` edge `e` whose `a` is within 0.005
  of `data-cr` (S5: still family hue, never the declared class); the set of award fills equals
  { `FAMILY_COLOR[nodeOf(e.t).fam]` : e ∈ `PRICED` } (on this build the `state` and `capital`
  hues), with ≥ 1 filled award mark; no award mark's stroke colour varies except by tier dash
  or selection accent [Adjudicated 2026-10-06: "take exactly the two" was checked as set
  membership, which let a page key the two hues to something other than the vendor's `fam`;
  `FAMILY_COLOR` is the §0.5 fixture]; the two stack
  panels' y-axes have the same max tick label (one shared scale); `[data-band]` fills are
  lightness steps of one hue (equal hue angle ± 2°) (SG-32).

### AC-140 — Show the pension band and its share label in the first viewport at 1280 × 800
- **Check (`FOLD`, Budgets, `scrollY = 0`):** the `[data-band="pension"]` of the column for
  `LATEST_FY(DEFAULT_STAGE)` and its share label have `getBoundingClientRect().bottom ≤ 800`;
  `#resolution`'s height ≤ 132 px; the figure's height is within `[360, 520]` px (SG-33, D58).

### AC-141 — Never rescale the x-domain under `fy`
- **Check (Budgets):** record the stack's, the office lanes' and the ledger's first and last
  axis labels at rest; load `?fy={FY_AXIS[10]}` and `?fy={FY_AXIS[2]}..{FY_AXIS[4]}`: the labels
  are identical and `[data-column]` count is unchanged; columns outside the range have computed
  opacity in `[0.2, 0.3]` (SG-34).

### AC-142 — Show no vendor alone in any URL state
- **Check (Procurement, `D` and `M`):** for every URL in AC-86's SG-RF3 set: `[data-vendor-card]`
  count = `VENDORS.length`; both class-band headings render with ≥ 1 card each or
  `Comparison set required` visible; when `vendor` is set the margin holds ≥ 2 vendor `<dl>`s;
  `UNCLASS_V` members are listed by name beneath the bands with the reason, never dropped
  (E15); the vendor with the most awards is not placed first (bands are alphabetical).

### AC-143 — Use no partisan frame in the page's own words, and spell British
- **Check:** Concatenate the `innerText` of every `[data-page-copy]` element on every lens,
  every `aria-label` outside `[data-quoted]`, every TSV `#` header, and every Q `h3` and
  chapter/pair `h4`: it contains no `PARTY_WORDS` member as a whole word (case-insensitive for
  `ruling`, `opposition`, `era`, `regime`, `incumbent`), and no element's fill or stroke is keyed
  to such a word (AC-139); it contains none of `color`, `center`, `favor`, `honor`, `labeled`,
  `organization`, `analyze`, `program`, `catalog`, `gray`, `defense`, nor the noun `license`
  (`MH 2055`, source titles, `lab`, `d`, `sub`, notes, symmetry and narrative texts are
  `[data-quoted]` and excluded) (SG-RF4, U22).

### AC-144 — Rank nothing by a page-computed figure
- **Check:** The ledger's lane order is unchanged between `stage=BE`, `RE`, `actual` and
  between `fy` ranges; the vendor bands are alphabetical by label; case pairs are in
  `FIRST_RECORD` order; `TWIN(state-table)`'s default order is `UNITS`; `TWIN(places)` is state,
  city, label; the slice's class rows are in `SLICE.rates.byClass` order; `TWIN(bonds)` donors
  alphabetical and parties by first purchase date; every `aria-sort` column is a declared
  external quantity (`% of GSDP`, `₹ cr`, `per lakh`) and no sort control exists on a `computed
  here` share, a count the page computed, a party column or a vendor's award count; no element
  reads `most`, `top`, `rank`, `score`, `index` or `risk` outside `[data-quoted]` and the
  refusals.
- [Adjudicated 2026-10-07 — the rank-word clause: Reading B, decided by the lead] Reading A
  would let `Top 5 states…` or `spends the most` through in a caption, cell, annotation, tooltip
  or the live region, which §14 and principle 12 forbid; Reading B can still be met by a page
  built to the spec because it removes the spec's fixed phrases verbatim and a record label
  carries `data-quoted`. The test patch to apply after the build is Patch B in the patch record.
  Both readings stay below as the record. Both judges hold that the
  clause as written cannot be met by a page built to the spec: page-authored text outside
  `[data-quoted]` and `#refusals` must read C2 `not added on top`, C6 `for a rank, never a
  person`, C11 `Most installations are older than any government`, C12 `most DPSU plants` and
  `most command headquarters`, C17 `at the public rank`, the `PayTerms` column head `Rank
  class` (§5.1.5) and the per-person option's name `… a 2011 Census base would re-rank states
  (S3)` (§3.5, asserted by AC-81), where the words name a grade, a preposition, a quantifier or
  a refusal to rank, not an order. They disagree on what replaces it.
  - **Reading A (scope by element):** on each lens, no heading (`h1`–`h6`), `th`, control
    (`button`, `option`, `summary`, `label`), `legend`, `[data-effect]` line, or `aria-label`
    attribute value (the attribute only, not the labelled container's text) inside `main` reads
    `most`, `top`, `rank`, `ranked`, `ranking`, `score`, `index` or `risk` as a word, outside
    `[data-quoted]`, `#refusals` and the rail-foot `Not offered:` line; `top` in `on top` / `top
    of` is a preposition; `Rank class` and `… would re-rank states (S3)` are excepted. Page prose
    (captions, gaps list, AnswerLines) is not scanned: principle 12 and §14 forbid a presented
    ranking, held by the order checks above and by §2's caption checks, which fix the prose.
  - **Reading B (scan everything, except by exact phrase):** on every lens, at rest and under
    `view=table`, the visible text of every element in `main` and the live region (headings,
    row and column heads, table and figure captions, cells, controls, options, labels, chart
    legends and annotations, SVG `<text>` and `<title>`) plus every `aria-label`,
    `aria-description`, `title` and `alt`, outside `[data-quoted]`, `#refusals` and the
    rail-foot `Not offered:` line, contains none of `most`, `top`, `rank`, `ranks`, `ranked`,
    `ranking`, `score`, `scores`, `scored`, `index`, `indices`, `risk`, `risks`, `risky`,
    `riskiest` or `leaderboard`, after removing verbatim only the fixed spec phrases listed
    above; a record label printed verbatim is research wording and carries `data-quoted`.
    Scoping by element would let `Top 5 states…` or `spends the most` through in a caption,
    cell, annotation, tooltip or the live region, where §14 and principle 12 forbid it.

### AC-145 — Keep map bins fixed under every filter
- **Check (Budgets):** the spend map legend's bin edges are byte-identical under `sfy` set to
  each drawable pair, under `st`, `fy`, `tier=documented` and `payer=states`; the strength
  map's under each `sy`, `st` and `fy`; each bin is named with its edges and an empty bin reads
  `(none in view)` (frozen §8.2.13).

### AC-146 — List every void, gap, killed claim and true derived gap at findings size
- **Check:** `#gaps` header reads `{FORCE_VOIDS.length} voids and {FORCE_GAPS.length} gaps
  recorded by the research, {KILLED.length} claim(s) killed in audit, and {d} derived by this
  page.`; it lists every `FORCE_VOIDS.what` and every `FORCE_GAPS` text, grouped by lens then
  domain; every `KILLED` entry appears with its `id`, `lab` and `killedReason` verbatim; for
  each §5.5.3 derived gap the check evaluates the condition on the module (S-handle absent;
  `UNRESOLVED.length > 0`; `EMPTY_SRCS.length > 0`; `UNPAIRED.length > 0`; a `ty` with two
  `fam`s; …) and asserts the line present iff true, with its figures equal; each lens's
  `CannotShow` block lists every `VOIDS(LENS_DOMAINS[lens])` entry at computed `font-size`
  equal to the findings' body text, never inside a closed `<details>` (SG-20, SG-48).

### AC-147 — Refuse in the rail foot and in `#refusals`
- **Check:** `#refusals` lists the fourteen §14 items (each first bold phrase present: `A city
  police budget other than Delhi's`, `A total that adds a demand to its own lines`, `A
  per-person figure on the 2011 Census`, `A per-state outcome rate parsed from prose`, `A map
  of defence money by state or city`, `Points at city addresses without coordinates`, `DAC
  approvals by vendor`, `A vendor alone`, `The tender slice's overall rate as a finding`,
  `Party as a colour, a filter, a sort or a column the page writes`, `A case without the case
  recorded as its control beside it`, `A ranking, score or index`, `A merge of two ids by name`,
  `Operational detail`); the rail foot's line links to it; the graph status line prints `{k}
  edges with an endpoint outside every register are not drawn` with `k` = `UNRESOLVED.length`
  and `{splitIds} entities appear under two ids` (D52).

### AC-148 — B-J1: read the latest year's pensions and copy a citation in two interactions
- **Check (`FOLD` and `M`, Budgets):** at rest the answer sentence (first text node of
  `[data-q="B1"] figure`) matches `/^FY\d{4}-\d{2} (BE|RE|actual): pensions ₹[\d,.]+ cr, [\d.]+%
  (of published total|of stack, computed here); defence ₹[\d,.]+ cr across \d+ demands, computed
  here; \d+ pay lines inside revenue\./` with the FY = `LATEST_FY(DEFAULT_STAGE)` and the share
  = `PENSION_SHARE`; (1) activate that FY's axis button (at `M`: two taps on the column or the
  step control): the `FYReadout` shows the pension row with its ₹, its share with basis words,
  the published total or `no published all-demands total for this FY`, the reconciliation
  sentence and an `http` source; (2) press the pension row's `Copy citation`: the clipboard (or
  its `<output>`) contains the head verbatim, the stage word, the FY, an `http` URL, `ICIP` and
  `read to {ASOF}` (SG-40, U10, U14).

### AC-149 — B-J2: reach a CAPF's cell card in three interactions
- **Check (`FOLD` and `M`):** (1) type `nodeOf(CAPF_SAMPLE).label` into Find; (2) press `Show its
  budget lines` (URL gains `body`, the lanes are accented and scrolled into view); (3) activate
  the cell for `CELL_SAMPLE.fy`: the `CellCard` shows a ₹ with stage and FY, CR-CONTEXT true
  (`{k}% of the published Police demand, computed here` or the no-parent sentence), a comparison
  `FY{fy−1} {stage}: ₹{x} cr` or `no {stage} row for FY{fy−1}`, a tier word, an `http` source
  and a `rowCitation` `<output>` (SG-41).

### AC-150 — B-J3 / F-J: find a commissionerate and read the city sentence with no ₹ in two
- **Check (`FOLD` and `M`):** (1) type `CITY_SAMPLE.city` into Find: the commissionerate result
  prints exactly `inside {State}'s police head (MH 2055) — no city budget is published` and its
  verb is `Where its police money sits` (no `budget line` in any button name associated with the
  body); (2) press it: `st={CITY_SAMPLE.st}&lens=budgets`, the `CityLedger` row for the body
  reads the same sentence with the `{State}'s police head →` link and the strength void; no ₹
  in any `[data-city-body]` element. Footprint path: Footprint tab → `kind=cantonment` chip →
  choose a unit with a cantonment on the map: `TWIN(places)` rows all have Kind = cantonment and
  State = the unit, in 3 interactions (SG-42).

### AC-151 — P-J: open a comparator vendor beside its comparators in two, with holdings listed, not added
- **Check (`FOLD` and `M`, Procurement):** (1) type `nodeOf(VENDOR_NO_AWARD).label` into Find;
  (2) press `Show vendor`: the `VendorCard` shows the vendor's `<dl>` beside its
  `COMPARATORS` `<dl>`s with identical `dt`s and an `http` source; its field 4 reads `none
  named in the Ministry releases the research read`. For `VENDOR_WITH_OWN` (`vendor=` by URL):
  field 3b (`data-field="3b"`) lists each `own` target with its share as recorded in the edge's
  `lab`, its tier, and `{k} named award(s) — listed, not added to this vendor` with `k` = that
  body's `AWARDS` count, linked to its card; every card whose vendor is `s` of no `own` edge
  reads `no holding recorded` in field 3b (SG-43, U15).

### AC-152 — P-S and P-P: find Bofors beside Rafale in one scroll, and the CAPF by-year TSV in two
- **Check (`FOLD` and `M`, Procurement):** activate the Procurement tab; scroll the chapter-4
  `h4` to the top: within one further viewport the `FIRST_PAIR` row shows both columns with
  equal computed widths ± 1 px and equal `font-size` (consecutive at `M`), and the `literature`
  symmetry block precedes it; (P-P, S8) activate the `CAPF_CLASS` label (its by-year multiple
  is accented) and press `Download .tsv — {table}` on `TWIN(slice)`: the file's class-year rows
  for `capf` carry `rate`, `low`, `high` equal to the file's (SG-44).

---

## 11. Coverage matrix

| brief requirement | criteria |
|---|---|
| honesty captions | AC-13 … AC-28 |
| denominators | AC-29 … AC-48, AC-63, AC-97 |
| no-data ≠ zero | AC-06, AC-09, AC-10, AC-49 … AC-63 |
| denials beside claims | AC-64 … AC-73, AC-67 |
| URL round-trip of every filter | AC-74 … AC-96 (`lens payer st fy stage comp sfy m sy kind body cell vendor case rec sel tier find view tp`; unknown values; Reset; Copy link; graph params never written) |
| table twin row count = visible graphic | AC-97 … AC-110 |
| scaffold state (≥ 200 chars, says so) | AC-01 … AC-12 (EMPTY AC-01 … AC-08; ZERO-SERIES AC-09 … AC-12) |
| keyboard reachability | AC-111 … AC-123, AC-85, AC-120 |
| mobile at 390 px, no horizontal page scroll | AC-124 … AC-136 |
| frozen channels, fold and house rules | AC-137 … AC-147 |
| reader paths (spec §2.2) | AC-148 … AC-152 |
| spec Review Focus SG-RF1 … RF8 | AC-137 (RF1); AC-63, AC-150 (RF2); AC-86, AC-142 (RF3); AC-143 (RF4); AC-73 (RF5); AC-41 (RF6); AC-40 (RF7); AC-72 (RF8) |
| spec §16 data integrity SG-2, 4, 6–15, 17–20 | AC-01 … AC-12 (2); AC-47 (4); AC-34, AC-30 (6); AC-35 (7); AC-49, AC-51, AC-52 (8); AC-29, AC-48 (9); AC-53, AC-81 (10); AC-81 (11); AC-54, AC-101, AC-145 (12); AC-31 (13); AC-56, AC-103 (14); AC-57, AC-68, AC-139 (15); AC-46, AC-58, AC-41 (17); AC-106, AC-69 (18); AC-67 (19); AC-146, AC-33 (20) |
| spec §16 twins SG-21 … 23 | AC-97 … AC-109 (21); AC-108 (22); AC-49, AC-98 (23) |
| spec §16 encoding SG-30 … 34 | AC-138 (30); AC-124 (31); AC-139 (32); AC-127, AC-140, AC-125, AC-126, AC-128 (33); AC-141 (34) |
| spec §16 URL SG-35 … 39, 51 … 53 | AC-74 … AC-96 (35); AC-84, AC-86, AC-87 (36); AC-66, AC-90 (37); AC-75, AC-89 (38); AC-120 (39); AC-119 (51); AC-59 (52); AC-134 (53) |
| spec §16 paths SG-40 … 44 | AC-148 … AC-152 |
| spec §16 accessibility SG-46 … 49 | AC-115, AC-112 … AC-114 (46); AC-117 (47); AC-146 (48); AC-116, AC-122, AC-70 (49) |
| not promoted (source or build checks) | SG-1 (observable half in §0.5's anchor abort), SG-3, SG-5, SG-16, SG-45, SG-50 — see the preamble |

## 12. How to run

The criteria are written to be implemented as `scripts/pages/security.test.mjs`, one
`node --test` case per criterion named by its AC id, following `scripts/pages/finance.test.mjs`
(own static server over `dist`, pinned Chromium, fixtures derived from the generated module
before the run, `SKIPPED: <reason>` for a fixture the build does not contain, never counted as
passed). `SECURITY_DIST` pins the `dist` copy; `SECURITY_BUILD=full|empty|zero` overrides
detection; `SECURITY_SHOTS=<dir>` saves the greyscale screenshots of AC-138. The EMPTY and
ZERO-SERIES builds are made in a scratchpad copy of the repository (§0.3), cached at
`dist-empty-security` and `dist-zero-security`, never by editing `research/raw/` or
`*.generated.ts`. Nothing in the script imports from `src/pages/`, `src/components/` or
`src/data/securityView.ts` (it reads the `FAMILY_COLOR` literal of
`src/components/viz/ForceGraph.tsx` as text for AC-139, §0.5 [Adjudicated 2026-10-06]); it reads the generated module, `security-page.json` (§0.5 `SLICE` [Adjudicated 2026-10-07]), `india-geo.json`
and the data modules it needs for labels and GSDP the way `finance.test.mjs` does, and the
criteria document is the whole contract. The two measurement tables (AC-127, AC-134) are
filled in from the first build's printed values and amended, never aspired to. Add the file to
`test:pages` once the suite is green on three consecutive runs against a pinned build
(HANDOFF: a gate that is red for a known reason teaches people to ignore it).
