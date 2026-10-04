# /security: The money India spends on force (design spec, candidate A, graphic-first)

*Status: candidate A for the H4 design duel, 2026-10-04. Candidate B (evidence-first) is
written in parallel; a judge synthesises both into `SECURITY_PAGE.md`. Binding brief: spec
`docs/superpowers/specs/2026-10-04-force-finance-design.md` §0 (assumptions), §2 (what
resolves at which level), §3 (the five stance rules), §4.4 (the page). House form:
`FINANCE_PAGE.md` (§0.2, §3, §8, §13, §14, §16) and `ENERGY_PAGE.md` §6 (frozen channels; the
brief calls it §8). Skills: `interface-design`, `india-map`, `graph-schema`, `cui-bono`.*

*Data contract: `src/graph/force.generated.ts` (`FORCE_NODES`, `_EDGES`, `_EDGE_DOMAIN`,
`_BENEFITS`, `_VOIDS`, `_NARRATIVES`, `_BASE_RATES`, `_SYMMETRY`, `_GAPS`, `_IDENTITY`,
`FORCE_BUDGETS`, `FORCE_STRENGTH`, `FORCE_FOOTPRINT`, `_META`); the row types `BudgetRow`,
`StrengthRow`, `FootprintRow` from `src/graph/fleet.ts`; `research/raw/cppp/security.json`
through a new accessor (prerequisite S8); `STATES`, `STATE_BY_ID` from `src/data/geo.ts`;
`STATE_ECONOMY` from `src/data/companies.ts` (GSDP only, see F18); `TIERS` from
`src/graph/schema.ts`; `FAMILY_COLOR`, `FAMILY_LABEL`, `PRED_LABEL` from
`src/components/viz/ForceGraph.tsx`; the merged graph from `useData()` only to resolve
endpoint labels outside the force module (`pol:`, `wel:`, `energy:`, `fin:`, `co:`, party
ids).*

**No figure in this document is page copy.** Every `{brace}` is derived at module scope in
`src/data/securityView.ts` or in a `useMemo` keyed on the parsed URL. The counts in §0 are
this designer's reading of **run-92066c7bcf73** (`FORCE_META.asOf` 2026-10-04), computed by a
node script over the bundled module and the raw files, not estimated. The run will be
reconciled; ids may merge and counts may move. They justify decisions and may not be copied
into a component. **The page prints module counts only.**

**What "graphic-first" means here.** Each lens opens on the one picture a reader cannot get
anywhere else, drawn from the structured series, with its twin table, its denominator and
its honesty caption inside the same `<figure>`. Where the data cannot honour the picture the
brief asked for, this spec says so in §0 and draws the nearest honest picture instead,
naming the prerequisite that would unlock the original. It never draws the original with a
silent substitution.

---

## 0. Facts about the module that decide the design

Read from `src/graph/force.generated.ts` (run-92066c7bcf73), `research/raw/force/*.json`,
`research/raw/cppp/security.json`, `research/raw/state-economy.json` and
`src/data/india-geo.json` on 2026-10-04. Design evidence, not page copy.

| # | Fact (computed) | Consequence |
|---|---|---|
| F1 | `FORCE_META`: 8 files, 265 nodes, 384 edges (343 claims in + 42 contras added − 1 killed), `killed` 1 (`footprint:c014`, CRPF training count, killed by its own `killIf`), `excluded` 0, 44 ids merged across files, 13 benefit rows, 67 voids, 89 gaps, 44 narratives, 296 base rates, 8 symmetry texts (one per domain). `FORCE_EDGE_DOMAIN` has **385** keys: the killed claim keeps its domain entry. | Derivations key from `FORCE_EDGES`, never from `FORCE_EDGE_DOMAIN` keys (D3). The killed claim is printed in the Gaps panel with its `killedReason` (D41). |
| F2 | `FORCE_BUDGETS` has 4,096 rows: Union 3,905; 30 state payers 191. Components: total 1,332 · revenue 942 · capital 815 · grant-to-states 467 · pay 278 · pension 173 · other 89. Stages: BE 1,804 · RE 1,200 · actual 1,092. 28 FY labels, `1999-00` → `2026-27`. No duplicate `(payer, body, head, component, fy, stage)` key; no row with empty `srcs`. | The register is a line-item ledger, not a set of additive totals (F3). The rail's component control lists all seven with counts. |
| F3 | Rows **overlap by construction**. In 2024-25 actual, `Demand 20 — Defence Services (Revenue)` (₹2,90,964.51 cr) contains the Army's revenue line (₹1,98,025.76 cr), which contains `Pay and Allowances of the Army` (₹1,13,801.21 cr). `component` says what kind of money a row is, not whether it is disjoint from its neighbours. | **No chart sums rows across levels.** The stack draws only demand-level rows (D5); pay is a bracket over the revenue band, never a stacked band (D6). |
| F4 | Demand-level rows (head `Demand N — {name}` with no `:` sub-line) for the seven defence bodies: **BE in all 27 FYs 2000-01 → 2026-27**; RE in 11 (2000-01, 2004-05, 2008-09, 2010-11, 2013-14, 2015-16, 2017-18, 2019-20, 2021-22, 2023-24, 2025-26); actual in 9 (2009-10, 2012-13, 2013-14 *pensions and capital only*, 2014-15, 2016-17, 2018-19, 2020-21, 2022-23, 2024-25). | Default stage is the stage with the widest FY coverage, **derived** (BE today, D7). RE and actual draw their missing FYs as hatched columns, never interpolated, never closed up. 2013-14 actual draws two bands and a hatched remainder labelled "revenue and MoD civil not recorded". |
| F5 | The demand structure changes: to 2014-15, revenue is split into service demands (Army, Navy, Air Force, R&D, Ordnance Factories) and "Ministry of Defence"; from 2015-16 one `Defence Services (Revenue)` demand plus `MoD (Misc)` → `MoD (Civil)`. Demand numbers move between 13 and 28. Five FYs carry only `(Summary of Demands for Grants, BE)` rows. | Bands are by `component` of the demand-level row (pension / revenue / capital / total → "MoD civil and misc."), not by demand number (D5). A vertical rule marks the FY where the revenue-demand count changes, with the text "demand structure changes: {k} revenue demands → {k'}". |
| F6 | `Ministry of Defence — all demands (Summary…)` rows exist for 12 BE FYs. The demand-level sum equals that published total to the rupee crore in 7 (2002-03, 2010-11, 2017-18, 2019-20, 2021-22, 2023-24, 2025-26) and exceeds it by 0.22–0.76% in 5 (2003-04, 2004-05, 2006-07, 2007-08, 2012-13). | Each stacked column carries a reconciliation mark: "= published total", "published total ₹{x} cr; stack differs by {Δ}", or "no published all-demands total for this FY". Nothing is forced to agree (D8). |
| F7 | Pay rows (`component: 'pay'`) for the services' BE exist in 21 of 27 FYs and the composition changes: 6 lines (uniformed + civilians × Army/Navy/Air Force) to 2014-15; 3 lines in 2016-17; 8 lines from 2017-18 (R&D pay added). No BE pay rows in 2002-03, 2003-04, 2006-07, 2007-08, 2012-13, 2015-16. Police pay: 3 rows only (2024-25 actual, 2025-26 RE, 2026-27 BE, MHA Expenditure Profile). | The pay bracket prints "{k} pay lines" on every column and a rule where `k` changes; missing FYs draw an empty bracket labelled "pay not split in the rows recorded". No pay trend line is drawn across a composition change (D6). Police pay is three labelled ticks, not a series. |
| F8 | `Defence Pensions` demand rows: BE in all 27 FYs. Agnipath lines (`component: 'other'`) from 2022-23 actual to 2026-27 BE. | Pensions is a full band, called out with its share of the stack (computed here). Agnipath is a tick inside the revenue band from its first FY, labelled, linked to the contract card (§5.1.6). |
| F9 | The Union Police demand `Police: Grand Total (whole demand)` has 71 rows each for total, revenue and capital (BE 28 FYs, RE 27, actual 16, 2009-10 → 2024-25). **total = revenue + capital in all 71.** Named lines (CAPFs, Delhi Police, IB, J&K Police, NSG, SPG, NATGRID, CPOs) sum below the total (2024-25 BE: ₹1,23,794.9 cr of ₹1,43,275.9 cr). | The police stack is revenue + capital (disjoint, verified). The named lines go to the line ledger (§5.1.2), with the residual "rest of the demand, computed here" as its own row, never a band. |
| F10 | `force:delhi-police` has 177 rows: total BE 28 FYs (1999-00 → 2026-27), RE 27, actual 16 (2009-10 → 2024-25); a revenue/capital split on 53 rows. No other city police body has a budget row. GNCTD's own RBI "Police" line is a residual recorded only as a void. | Delhi Police is drawn as the one city budget, as a bracket on the police stack and as its own panel (§5.1.4). Every other commissionerate prints the fixed sentence, never a number (D14). |
| F11 | State payers: 30 (28 states + J&K + Puducherry). 29 have exactly the four RBI rows (head `Police (MH 2055)`, component revenue: 2023-24 actual, 2024-25 BE, 2024-25 RE, 2025-26 BE). UP has 70 rows (its own Grant 26 series, 2008-09 → 2026-27 with gaps, plus the RBI four). Bihar, Karnataka, Tamil Nadu, West Bengal (revenue) and Maharashtra (pay) each add one PRS "district police" 2026-27 row: the only 6 rows whose `note` starts `reported:`. Missing payers among the 36 map units: `an ch dd dl dn ld`. | The state map draws **one head only**, `Police (MH 2055)`, for one `(fy, stage)` at a time (anchor `STATE_SERIES_HEAD`, D11). The PRS district-police rows and UP's own grant are never on the map; they appear in the state panel with their own heads. Delhi gets its own class, "police funded by the Union (Delhi Police, Police demand)", not hatch and not a value (D12). |
| F12 | J&K: the RBI `jk` line exists for all four `(fy, stage)` pairs, and `force:jk-police` enters the Union Police demand from BE 2024-25 (6 rows). | The `jk` readout carries "J&K Police moved to the Union's Police demand from BE 2024-25; the state line shrinks accordingly" from the row `note`, verbatim (E11). |
| F13 | `grant-to-states` (467 rows): 425 are `force:mpf-scheme` (ASUMP / MPF), of which the state-wise Allocation and Released rows carry the **state only inside `head`** (`… — Andhra Pradesh — Released`). 68 rows have `cr === 0`, all ASUMP `Released`, `actual`. | No per-state grants map until S2 adds a recipient `st` (§3.3); the interim is a table listing `head` verbatim. A recorded 0 prints `₹0 cr — as recorded`, distinct from hatch, everywhere (frozen §8.2.5). |
| F14 | No budget row is for prisons, fire services, home guards, civil defence or forensic laboratories (0 rows match). | The component and body controls do not offer them; the Gaps panel names them; the standfirst does not promise them. |
| F15 | `FORCE_STRENGTH` 142 rows: 49 national (`st` null: a CAPF aggregate 11, seven forces 4–6 each), 93 state rows = 31 states × years 2020, 2023, 2024. Delhi's 3 rows have no `perLakh`. **30 states have `perLakh` for 2024.** No row for any commissionerate. 135 of 142 notes start `reported:`; 90 say the absolute counts are DERIVED from per-lakh × a projected population. | The strength map plots `perLakh` as printed (no recomputation), dashed `reported` everywhere it is. Sanctioned and actual counts print with "derived by the research from per-lakh" when the note says so (D13). Commissionerate marks print "strength: no primary table while BPR&D is unreachable". |
| F16 | Population in this build: only `STATE_ECONOMY` (2011 Census, Wikipedia-sourced) for all 36. Over it, 2023-24 police spend per head is Bihar ₹1,039 and Kerala ₹1,294; the research's own figures on a projected base are ₹862 and ₹1,212. **The 2011 base inflates Bihar by about a fifth and Kerala by about a fifteenth**, so it re-ranks states. | **No per-capita figure on a 2011 base.** Per capita waits for S3 (a population series); until then the spend map's denominator is GSDP (F18) and the per-capita option is `aria-disabled` with that reason (D10). |
| F17 | 20 `analytic` edges in `state-police` carry per-state "spend per capita, share of state spending, strength and custodial-death rate" **in prose `d`**; outcome rates exist structurally only as all-India base rates and two party-group medians. | No outcome map and no parsed per-state rate. The 20 records are listed verbatim in the state panel with tier and source (D16). Outcome rates per state wait for S6. |
| F18 | `STATE_ECONOMY.gsdpCr` (FY2024-25, MoSPI via Wikipedia) exists for 28 of 36; null for `an ch dd dl dn jk ld tr`. | Interim spend metric: MH 2055 revenue spend 2024-25 RE ÷ GSDP 2024-25, same FY, both recorded: 28 states drawn, `jk` and `tr` hatched "GSDP not in this build" (D10). |
| F19 | `FORCE_FOOTPRINT` 221 rows: cantonment 61 · drdo-lab 42 · dpsu-plant 31 · training 29 · other 25 · commissionerate 18 · forensic-lab 7 · command-hq 6 · capf-hq 2 · **prison 0 · ordnance 0**. In 25 of 36 map units; none in `an ar dd dn ld mn mz nl py sk tr`. 120 distinct cities; `since` null on 217. **No row has a coordinate**; `IndiaMap` marks are a golden-angle spiral inside a state, not a geocode. | Footprint is drawn as **small multiples, one map per kind, filled by count per state** (D17), never as points that would pretend to be cities. Empty kinds are named in the legend as "0 rows: {reason}". The FY filter does not reach this lens (4 of 221 dated). |
| F20 | Commissionerates: 18 rows, Maharashtra 10, Uttar Pradesh 7, Assam 1; none in Delhi (the one city with a budget). | The city ledger (§5.2.3) lists the 18 plus Delhi Police as a budget-only row; "18 commissionerates recorded; BPR&D's list is unreachable, so this is not every commissionerate" is in the frame. |
| F21 | 52 `award` edges: 51 from `min:ministry-of-defence`, 1 from `energy:state-maharashtra` (Adarsh land). 39 carry `a`; 13 do not (joint totals, unpriced). Dated 1986 → 2025; 46 in 2021–2025. Tiers: documented 45, reported 4, alleged 3. | The procurement chart is "contracts PIB names", by year, ₹ where stated; unpriced contracts are a count row beneath, never 0 (D20). Alleged awards render only in the cases ledger and Contested, never in the bars. |
| F22 | **DAC approvals (AoN) are not vendor records**: void "DAC Acceptance-of-Necessity approvals name no vendor and no contract value per item". AoN appears only as base rates (indigenous share, AoN vs contracts signed). | The brief's "DAC approvals by vendor class by year" cannot be drawn. Drawn instead: **signed contracts PIB names, by vendor class, by year**, with the AoN void card in the same frame and the AoN base rates beside it (D19). |
| F23 | Vendor class is not a field. Award targets split by `fam`: `state` (HAL, BEL, BDL, MDL, GRSE, CSL, BEML, GSL, HSL, MIL, AVNL, AWEIL, BHEL) and `capital` (L&T, BrahMos, Dassault, Bharat Forge, Mahindra Defence, TASL, Airbus, AB Bofors, AgustaWestland, Chowgule, EEL, ICOMM, PLR). DPSUs are `ty: 'company'` (HAL, BEL, MDL, GRSE) or `ty: 'psu'` (BDL, CSL, GSL, HSL…). No foreign/JV marker; `publicRole` says it in prose. | Interim vendor class = **two classes by family**: "public sector" (`fam: 'state'`) and "private, JV or foreign" (`fam: 'capital'`) (D21). Hue is the family hue, so the channel keeps its one meaning. Four classes wait for S5. `ty` is never used for class. |
| F24 | `own` edges from `min:ministry-of-defence` reach 15 DPSUs; none reach GSL or HSL. | `own` is not used to classify (it would put two DPSUs among private vendors). |
| F25 | 11 `bond` edges from 3 donors (`meil` to 9 parties; `co:mahindra-mahindra`, `co:cyient` to the BJP). `meil`, `co:cyient` and `bjp` are not nodes in the module. | Bonds table resolves labels through `useData()`; an unresolved id prints `{id} (not in the register)` (D3). Party is a text column. |
| F26 | 38 `role` edges; 7 open-ended; retired-officer board roles: 2 (`per:avinash-chander` → `co:astra-microwave` from 2018-01-29; `per:fali-major` → `force:reliance-naval-engineering` from 2015-03). Base rate: 0 of 2 began inside the one-year cooling-off window. | Board roles render as role pairs with the gap computed here at the record's precision, beside the cooling-off rule and the 0-of-2 base rate (§5.3.5). |
| F27 | 7 case nodes (`force:case-*`, `ty: 'mechanism'`, `fam: 'instrument'`): Adarsh, AgustaWestland, Bofors, Pegasus, Rafale, Sukna, Tatra. 40 `enforce` edges (courts, CAG, CBI, the Pegasus committee). Base rate: 0 of 7 named cases with a final conviction in the records opened. | The cases ledger has identical columns for all seven; Bofors and Rafale render as the first pair, side by side, by declared anchor (D24). |
| F28 | 7 alleged non-`contra` edges (2 `direct`, 3 `award`, 1 `enforce`, 1 `sector`); all 7 have a recorded `contra`. 59 `contra` edges, every one targeting `claim:{id}`; 29 edges have empty `srcs` (16 of them `money-people` contras). | Contested renders 7 pairs; "{unanswered} without a response" is derived (0 today) and the sentence stays. Empty `srcs` print `no source in file` in amber. |
| F29 | Narratives 44: well-supported 8 · contested 26 · speculative 5 · unsupported 5; `established` 0, `debunked` 0. 15 from `literature`. Several claims recur across files ("Pensions are eating the defence budget" ×2, "India under-spends on defence" ×2). | Six rungs always drawn; empty rungs read `none in this file`; duplicates listed as recorded (finance D42). |
| F30 | Two persons under two ids each: `per:a-k-antony`/`per:ak-antony`, `per:l-k-advani`/`per:lk-advani`. `famSplits`: `company` (capital/state), `group` (recipient/state), `agency` (state/enforce), `person` (state/capital). | The split-id and inconsistent-hue derived gaps both show (finance U24). Never merged by name. |
| F31 | 134 edges have an endpoint outside `FORCE_NODES` (mostly `claim:` targets of contras, plus `bjp`, `cag`, `sc`, `delhi-hc`, `wel:`/`energy:`/`fin:` state nodes). 76 edges undated. | The graph resolves through `useData()` and prints the dropped count (D35); undated records show under "all years" only. |
| F32 | CPPP slice (`security.json`, 316 KB): `readMeFirst` states defence capital acquisition, GeM and most state portals are not here. Raw 558,291 rows / 379,231 tender ids; 411,943 after dedup (12.17% of the file's dedup rows); MES alone 74.41% of decisions. Single-bidder: slice 3.17% [3.11, 3.22] of 365,600, whole file 11.22%, rest of file 12.33%, slice without works 12.2%. Eight classes; seven central (comparator: central portal 17.67%), state-police on the state portal (8.11% vs 7.59%). `byClassYear` 116 rows; 16 have n < 10, 27 have n < 30. All 40 sample links dead: every field is dataset-only. The design spec's §2.1 first probe (529,837 rows; 2.7%) predates the built slice. | The slice is drawn **by class only, each beside its own portal's whole-file rate**; the slice-wide rate appears only in the strip and the caption with "read by class, never for the slice as a whole" (D22). Class-years with n < 10 draw no rate. The page prints `security.json` figures, never the spec's. |
| F33 | Existing: `src/pages/Security.tsx` is a 52-line scaffold; `DataContext` already merges `FORCE_NODES`/`FORCE_EDGES`. `IndiaMap` treats absent and `null` as hatch and excludes `value ≤ 0` from its scale; `WelfareMap` has a distinct `ZERO_FILL`. `TenureLanes` imports `ASOF` from `src/data/energy.ts`. `RUNGS` (six) is exported by `NarrativeLadder`. | Maps use the `WelfareMap` listbox pattern (zero ≠ hatch); `TenureLanes` gains an `asOf` prop (finance D39 bounded change); the ladder is reused as is. |

---
## 1. Purpose and readers

### 1.1 Purpose

`/security` records the money India spends on force, on three lenses that share one filter
rail and one live region:

- **Budgets:** what the Union spends on defence and on its own police, by demand, by year
  and by stage (BE, RE, actual), with pensions and pay called out as the largest lines;
  what each state spends on its police head beside its police strength; Delhi Police as
  the one city budget; the grants the Union passes to state police.
- **Footprint:** where force sits — cantonments, laboratories, plants, headquarters,
  training centres, commissionerates and forensic laboratories — placed in their states and
  named by city, with what each place does *not* have recorded.
- **Procurement and people:** the contracts the Ministry of Defence has named with vendor
  and value, by vendor class; the open-market tender slice by buyer class beside the whole
  tender file; vendors with identical fields and never alone; electoral bonds; retired
  officers' board roles under the cooling-off rule; the big cases as dated records with
  their strongest counter.

The page's claim about itself is narrow: *this is what the register holds, at which level
each rupee resolves, what each figure is divided by, and what cannot be shown.* Spending on
force is a policy choice; a large number is not a finding.

### 1.2 The three readers

| Reader | Arrives with | Must leave with | Distrusts the page when |
|---|---|---|---|
| **J**, journalist on deadline | "How much does India spend on defence pensions?" · "What does Mumbai Police cost?" · "Did Adani get defence contracts?" | one figure with its stage, FY, demand, share of its stack, source line and tier; or the exact sentence saying the figure does not exist | a city figure appears that no budget publishes; a vendor appears without its public-sector comparator; BE is passed off as spend |
| **P**, policy researcher who exports | "Union police spending by force, 2009-10 → 2024-25, actuals" · "state police spend against strength" | a TSV of the ledger or the map that reproduces the screen, with stage, head, `note`, `reported:` flag and run id | rows from two levels are summed; missing FYs are closed up; a per-capita uses a stale population silently |
| **S**, hostile skeptic in either direction | "You only show the NDA's scandals" or "You hide the UPA's" · "You picked states to make the BJP look bad" | the control in the same frame: Bofors beside Rafale, both governments' shares from the symmetry text, both party groups' medians as text, the boring explanation | one era, one party or one vendor appears alone; a colour carries a party; an absent row reads as zero |

---

## 2. The reader's questions and the two-minute paths

### 2.1 Questions, in order (answered at rest at 1280×800 unless a step is named)

| # | Lens | Question | Answered by |
|---|---|---|---|
| B1 | Budgets | How big is the Union's spend on force, year by year, and how much of it is pensions and pay? | `DemandStack` (§5.1.1), strip facts 1–3 |
| B2 | Budgets | Which forces and bodies get what, and which years are missing? | `LineLedger` (§5.1.2) |
| B3 | Budgets | What does each state spend on police, against its economy (per head once S3 lands), beside how many police it has? | `StatePair` (§5.1.3) |
| B4 | Budgets | What does a city's police cost? | `DelhiLine` + `CityLedger` (§5.1.4, §5.2.3) |
| B5 | Budgets | What did Agnipath and OROP change, and who says what about it? | `ContractCards` (§5.1.6) |
| B6 | Budgets | What does the Union give states for police? | `GrantsToStates` (§5.1.5) |
| F1 | Footprint | Where are the cantonments, labs, plants and HQs, by state and city? | `KindMultiples` (§5.2.1), `PlaceList` (§5.2.2) |
| F2 | Footprint | Which commissionerates exist, and what is recorded about each? | `CityLedger` (§5.2.3) |
| R1 | Procurement | Which contracts has MoD named, to which class of vendor, by year? | `ContractsByClass` (§5.3.1) |
| R2 | Procurement | How competitive is open-market security buying, by buyer class, against the whole file? | `SliceBesideFile` (§5.3.2) |
| R3 | Procurement | What exactly does each vendor have — orders, bonds, retired officers — beside its comparator? | `VendorColumns` (§5.3.3) |
| R4 | Procurement | Who bought bonds, to which parties? Who went from a service to a vendor board? | `BondsTable`, `BoardRoles` (§5.3.4–5) |
| R5 | Procurement | What did the courts and auditors actually find in Bofors, Rafale and the rest? | `CasesLedger` (§5.3.6) |
| all | — | Would the same lens alarm us on the other side? | base rates with symmetry (§5.4.1) |
| all | — | Which narratives hold up? | `NarrativeLadder` (§5.4.2) |
| all | — | What is missing? | "What this lens cannot show" (§5.4.3), Gaps (§5.5.3) |

### 2.2 The two-minute paths

Interaction counts are clicks, taps or typed submissions from a cold load of `/security`.
Gates SG-40–42 script these at 1280×800 and 390×844.

| # | Reader, question | Path | Steps |
|---|---|---|---|
| B-J | J: "How much goes on defence pensions, and is it growing?" | at rest: the `DemandStack` pension band carries its share label on every column and its ₹ on the latest; the strip fact 2 reads `pensions {p}% of the {stage} {fy} stack, computed here`; choose the FY on the axis → readout: the four demands, their ₹, the pension share, the published total and its reconciliation mark, sources | 1 |
| B-J2 | J: "What does Mumbai Police cost?" | Find `Mumbai` → entity row `Mumbai Police Commissionerate` with the verb `Show its budget line` → the `CityLedger` row reads exactly `inside Maharashtra's police head (MH 2055) — no city budget is published`, with Maharashtra's MH 2055 figure, its stage and FY one link away ("Maharashtra's police head →" sets `st=mh`) | 2 |
| B-P | P: "Union police by force, actuals, 2009-10 → 2024-25, as a table" | rail Stage = actual → FY from 2009-10 → `LineLedger` twin → Download .tsv (machine columns `fy`, `stage`, `body`, `head`, `component`, `cr`, `tier`, `note`) | 4 |
| B-S | S: "You picked a year that flatters one government" | at rest: every FY of the selected stage is drawn on one axis; the tenure lanes under the stack show both governments' ministers; `ControlCard` quotes the `union-defence` and `union-home` symmetry texts verbatim (UPA-II beside NDA) | 0 |
| F-J | J: "Which cantonments are in Uttarakhand?" | tab Footprint → choose Uttarakhand on any small multiple (or the State select) → `PlaceList` filtered to `ut`, grouped by kind, each with city, body, source | 2 |
| F-S | S: "Your map says Manipur has no defence presence" | tab Footprint → at rest the Manipur cell on every multiple is hatched "no row of this kind recorded", never 0; caption C8 says hatch is not absence of an installation | 1 |
| R-J | J: "Did Adani get defence contracts?" | tab Procurement → `VendorColumns` at rest shows both columns; Find `Adani` → `Highlight vendor` accents Adani Defence's card in the private column with HAL, BEL and the rest of the public column unchanged beside it; the card reads `0 contracts named` for Adani Defence itself and `owns: PLR Systems (51%, reported)`, whose own card shows one unpriced joint contract; the base rate "PIB-named sample: Adani-linked vendors' share of award ₹" is printed verbatim above both columns | 2 |
| R-S | S: "You list Rafale but bury Bofors" (or the reverse) | tab Procurement → `CasesLedger`: the first row is the Bofors \| Rafale pair, identical columns, same type size; each with its records and strongest counter | 1 |
| R-P | P: "Single-bidder rate for CAPF tenders by year, with intervals" | tab Procurement → `SliceBesideFile` by-year multiple for CAPF → Download .tsv | 2 |
| any | J or S: "Who is connected to {vendor / case / ministry}?" | name → "Show connections" → the graph opens focused, one hop | 1 |

---

## 3. Route, data, URL contract

### 3.1 Route

- Replace the scaffold in `src/pages/Security.tsx`; the lazy route `/security` and the nav
  entry "Security spend" (spec §8.1, under Registers) already exist. `scripts/smoke.mjs`
  gains `/security`, `/security?lens=footprint`, `/security?lens=procurement`,
  `/security?stage=actual`, `/security?st=mh`, `/security?view=table`,
  `/security?lens=procurement&sel=force:adani-defence`.
- Outer `<article className="pb-20">`, no inner `max-w`. Prose caps at `max-w-[72ch]`.
  Graphics and tables take the layout width and scroll horizontally **only inside their own
  container**.
- `Suspense` fallback: PageTitle and Standfirst text.

### 3.2 Data (static, compiled in)

The page imports only from `src/data/security.ts` (re-exports of the force module's
exports and the prerequisite shims, each `null` when absent), `src/data/securityView.ts`
(every derivation, pure, at module scope or memoised on the parsed filters), the CPPP
accessor (S8), `src/data/geo.ts`, `STATE_ECONOMY` (GSDP fields only), and `useData()` for
labels outside the module. **No literal figure appears in `src/pages/Security.tsx` or
`src/components/security/*`** (SG-3).

**Anchors** (the only literals the derivations hold; each is checked at module load and a
missing one fails `scripts/pages/security.test.mjs` SG-1):

```ts
export const MOD = 'min:ministry-of-defence';
export const MHA = 'min:ministry-of-home-affairs';
export const DELHI_POLICE = 'force:delhi-police';
export const PENSIONS_BODY = 'force:defence-pensions';
export const STATE_SERIES_HEAD = 'Police (MH 2055)';                 // F11: the one comparable state head
export const DEMAND_LEVEL = /^Demand \d+ — [^:]+$/;                  // F3/F5 interim; retired by S1
export const SUMMARY_SUFFIX = ' (Summary of Demands for Grants, BE)'; // F5 interim; retired by S1
export const ALL_DEMANDS = /^Ministry of Defence — all demands/;     // F6 interim; retired by S1
export const POLICE_TOTAL = /^Demand \d+ — Police: Grand Total/;     // F9 interim; retired by S1
export const DEFENCE_BODIES = ['min:ministry-of-defence','force:indian-army','force:indian-navy',
  'force:indian-air-force','force:drdo','force:defence-pensions','force:ofb'] as const; // F4
export const REPORTED_PREFIX = 'reported:';                         // spec §4.1 note convention
export const CASE_PAIR = ['force:case-bofors', 'force:case-rafale'] as const;          // stance rule 5
export const LENS_DOMAINS = {
  budgets: ['union-defence', 'union-home', 'state-police', 'pay-pensions'],
  footprint: ['footprint'],
  procurement: ['procurement-industry', 'money-people', 'literature'],
} as const;
```

Each regex anchor has a gate (SG-5) proving it selects exactly the rows the S1 field will
mark, so retiring it is a no-op on the screen.

**Named derivations in `securityView.ts`** (each unit-tested in
`scripts/security-view.test.mjs` against a fixture; each returns rows **and** the
denominator sentence that goes with them):

| export | reads | definition |
|---|---|---|
| `nodeOf(id)` | `FORCE_NODES`, then `useData().nodes` | first hit; unresolved → `{id} (not in the register)` in amber mono |
| `rowTier(r)` | `note` | `'reported'` when `note` starts with `REPORTED_PREFIX`, else `'documented'` (spec §4.1). Applied to budget, strength and footprint rows |
| `hasCr(r)` | `cr` | `Number.isFinite(r.cr)`. **`0` is a value and prints `₹0 cr — as recorded`**; there is no null `cr` in the type, so absence is a missing row |
| `FY_AXIS` | `FORCE_BUDGETS.fy` | every FY label from the minimum to the maximum, **gaps included** |
| `isDemandLevel(r)` | `head` | S1 `level === 'demand'`, else `DEMAND_LEVEL.test(head)` |
| `defenceDemands(stage)` | `FORCE_BUDGETS` | Union rows, `body ∈ DEFENCE_BODIES`, demand-level; per `(fy, stage)` prefer rows without `SUMMARY_SUFFIX`, else the summary rows; one band per row keyed by `component` (`pension` / `revenue` / `capital` / `total` → "MoD civil and misc.") |
| `defenceStack(stage)` | the above | per FY: `{fy, bands[{component, cr, rows, tier}], sum, published, recon, demands, revenueDemands, tier}`; `published` = the `ALL_DEMANDS` row of that `(fy, stage)` or `null`; `recon` = `'equal'` (\|Δ\| ≤ 0.5) · `{delta}` · `'none'`; `tier` = weakest constituent; a FY with no row is `{fy, missing: true}` |
| `structureBreaks(stage)` | `defenceStack` | FYs where `revenueDemands` differs from the previous drawn FY |
| `payBracket(stage)` | rows `component === 'pay'`, Union, `body ∈ DEFENCE_BODIES` | per FY `{lines: k, cr: Σ, rows}` or `{lines: 0}`; `compositionBreaks` where `k` changes. **Never stacked** |
| `agnipathTicks(stage)` | rows whose `head` contains the Agnipath sub-head (S1: `level: 'line'`, `scheme: 'agnipath'`) | per FY Σ of the three service lines, labelled |
| `policeStack(stage)` | `POLICE_TOTAL` rows | per FY `{revenue, capital, total, check: total === revenue + capital}` |
| `delhiLine` | `DELHI_POLICE` rows | per `(fy, stage)` total, revenue, capital; `shareOfPolice` = total ÷ police total, **computed here**, only where both exist in the same `(fy, stage)` |
| `policePayTicks` | rows `component === 'pay' && body === MHA` | the three ticks, each with stage and FY |
| `LEDGER(stage, component)` | Union rows | one row per `(body, head)` with a cell per `FY_AXIS` entry: `{cr, tier, note}` or `missing`; plus a computed row per demand "rest of the demand, computed here" = total − Σ named lines where both exist |
| `bodyCoverage(body)` | rows | `{BE: k, RE: k, actual: k, of: FY_AXIS.length, first, last}` |
| `STATE_PAIRS` | `STATE_SERIES_HEAD` rows | the `(fy, stage)` pairs present, each with its state count |
| `defaultStatePair(m)` | `STATE_PAIRS`, the metric's denominator years | among the pairs the metric can divide (under `gsdp`, pairs whose FY equals the GSDP FY; under `cr`, all), max state count; ties → stage order actual > RE > BE, then latest FY. **Derived, never hand-set.** Today: `2024-25:RE` under `gsdp`, `2023-24:actual` under `cr` |
| `stateSpend(fy, stage, m)` | `STATE_SERIES_HEAD` rows, `STATE_ECONOMY`, S3 | per map unit `{cls, value, cr, denom, denomLabel, tier}`; `cls ∈ value · union-funded (dl) · no-row · no-denominator`; `m = 'gsdp'` divides by `gsdpCr` only when the GSDP FY equals `fy`, else `no-denominator`; `m = 'percap'` requires S3; `m = 'cr'` prints ₹ crore with share of the drawn states' sum, **computed here** |
| `stateStrength(year)` | `FORCE_STRENGTH` with `st` | per unit `{cls, perLakh, sanctioned, actual, womenPct, derivedCounts, tier}`; `perLakh` null with a row → `cls: 'counts-only'` |
| `defaultStrengthYear` | same | year with most states carrying `perLakh`, ties → latest |
| `stateRecords(st)` | `state-police` analytic edges with `s` = that state's police body (`{st}-police` resolved by `FORCE_STRENGTH.body`/`FORCE_BUDGETS.body` for that `st`) | verbatim `lab`, `d`, tier, srcs; **no number parsed** |
| `GRANTS` | `component === 'grant-to-states'` | all rows; with S2, `{st}` per row; interim `head` verbatim |
| `CONTRACTS` | `pred === 'law'` edges in `pay-pensions` whose `t` is a person class, `force:agniveers` or `force:defence-pensioners` | each with `responsesTo`, `responsesTo(response)`, the `FORCE_BENEFITS` row by `claimId`, and its `enforce` rulings |
| `FOOTPRINT_KINDS` | `FootprintKind` (type) ∪ `FORCE_FOOTPRINT.kind` | every declared kind, **0-row kinds included** |
| `kindCounts(kind)` | `FORCE_FOOTPRINT` | per map unit count, or `no-row` (hatch) |
| `PLACES(f)` | `FORCE_FOOTPRINT` | grouped state → city → rows, alphabetical |
| `CITY_LEDGER` | footprint `commissionerate` rows ∪ `DELHI_POLICE` | one row per city body: `budget` = Delhi → `delhiLine`, others → the fixed sentence with the state's `STATE_SERIES_HEAD` figure as a link; `strength` = a `FORCE_STRENGTH` row for that body or the fixed void sentence |
| `AWARDS` | `pred === 'award'` and `s === MOD` and `tier !== 'alleged'` | by calendar year of `from` (and FY by date with S-FY toggle); class by `vendorClass` |
| `vendorClass(id)` | S5, else `nodeOf(id).fam` | interim `'public'` (`fam: 'state'`) · `'private'` (`fam: 'capital'`) · `'unclassified'` (anything else, listed by name) |
| `VENDORS` | `AWARDS.t` ∪ footprint `dpsu-plant`/`other` bodies with `ty ∈ {company, psu}` ∪ `bond.s` ∪ board-role targets | one card each, identical fields: identity (`nse`, `cin`), awards (n, ₹ stated, n unpriced), plants (footprint rows), bonds, board roles, `publicRole` verbatim |
| `BONDS` | `pred === 'bond'` | with donor and party labels via `nodeOf` |
| `BOARD_ROLES` | `role` edges in `money-people` | paired per person: last service role `to` → first vendor role `from`; `gapMonths` at the coarser precision, **computed here**; `insideCoolingOff` only when both dates are at month precision |
| `CASES` | nodes `force:case-*` | per case: `records` (enforce edges on it or on its claims), `counters` (`contra`), `firstDate`, `lastDate`, the `analytic` edges; ordering `CASE_PAIR` first, then by `firstDate` |
| `SLICE` | S8 accessor | `headline`, `rates.byClass`, `rates.byClassYear`, `rates.total`, `quality.total`, `readMeFirst`, `caveat`, class definitions; nothing recomputed |
| `responsesTo(id)` | `FORCE_EDGES` | `pred === 'contra' && t === 'claim:' + id` |
| `ALLEGED` | `FORCE_EDGES` | `tier === 'alleged' && pred !== 'contra'` |
| `GRAPH_NODES`, `GRAPH_EDGES`, `dropped` | `FORCE_EDGES`, `nodeOf` | an endpoint resolving nowhere drops its edge; the count is printed |
| `famSplits`, `splitIds` | `FORCE_NODES` | as finance U24; `splitIds` = labels carried by more than one id |
| `derivedGaps(f)` | all | §5.5.3 |
| `tsv(rows, header, meta)` | — | as finance: `#` header with table name, population, filters, `runId`, `asOf`; wherever ₹ appear, `# amounts: ₹ crore, nominal, as published; not deflated; stage {stage}` |
| `asOfLabel` | `FORCE_META.asOf`, `SLICE.provenance.asOf` | one date when equal, else both |

### 3.3 Prerequisites (generator changes; the page works without each and gets better with it)

Each is a change to `scripts/assemble-fleet.mjs` or a research file, typed in
`src/graph/fleet.ts`, validated by `scripts/validate.mjs`. Absence is detected by a `null`
shim in `src/data/security.ts`.

| id | export / field | built from | interim (today) | upgrade |
|---|---|---|---|---|
| **S1** | `level: 'demand' \| 'all-demands' \| 'line'`, `demandNo`, `scheme` on `BudgetRow` | the head as printed, set by the research file at transcription | the `DEMAND_LEVEL`, `SUMMARY_SUFFIX`, `ALL_DEMANDS`, `POLICE_TOTAL` regex anchors (SG-5) | exact selection; the anchors are deleted |
| **S2** | `recipient: StateCode \| null` on `grant-to-states` rows | the ASUMP tables already transcribed | `GrantsToStates` table with `head` verbatim; no map | a released-÷-allocated map per state, hatched where no row, `₹0 cr — as recorded` distinct |
| **S3** | `FORCE_POPULATION: {st, year, persons, basis, srcs}[]` (a fourth series) | RGI Technical Group projections (2020 Table 8, already opened by the footprint file) | spend map on `% of GSDP`; `m=percap` `aria-disabled` with F16's reason | `m=percap` becomes the default; per-capita base rates align with the research |
| **S4** | `FORCE_DENOMINATORS: {fy, stage, kind: 'gdp' \| 'union-expenditure', value, srcs}[]`, or structured `fy`/`stage`/`kind` on base rates | the `union-defence` and `union-home` base-rate rows already carry the numbers in prose | the % GDP companion strip is not drawn; the base-rate rows are listed under the stack verbatim with `computed here` ratios | a % of GDP and % of Union expenditure strip on the stack's FY axis |
| **S5** | `FORCE_VENDOR_CLASS: {id, class: 'dpsu' \| 'cpse' \| 'private-indian' \| 'jv' \| 'foreign', category, declaredIn}[]` | `procurement-industry` `publicRole` text, declared by the researcher | two classes by `fam` | four classes; pairing by `category` in `VendorColumns` |
| **S6** | `FORCE_OUTCOMES: {st, year, measure, count, denominator, denomKind, partyText, srcs}[]` | NCRB, NHRC and Parliament answers the `state-police` file already cites | outcome rates as all-India base rates and the 20 state records verbatim | an outcomes table per state with party as a text column; no map colour by party ever |
| **S7** | `lat`, `lon`, `geoSrc` on `FootprintRow` | the official list's address, geocoded with a cited gazetteer | state small multiples | a point layer on the per-kind multiples |
| **S8** | `src/data/cppp.ts` `SECURITY_SLICE` accessor and a slim generated JSON (headline, rates, quality, class definitions, concentration by class) | `security.json` | none: the procurement lens shows the slice section's void card until S8 lands | the slice section |
| **S9** | commissionerate `strength` rows | BPR&D DoPO when reachable | the void sentence on every commissionerate | strength on the city ledger |
| **S10** | per-kind `coverage: 'enumerated' \| 'partial'` in the footprint file | the research's own scope text | every empty cell hatched | enumerated kinds draw a true zero (hollow), partial kinds keep the hatch |
| **G5** | module split as finance G5 | — | page-only exports ride in the entry chunk; SG-50 prints the growth | entry chunk carries nodes and edges only |

The smallest first steps are S8 (an accessor) and S1 (a field the transcriber already knows).

### 3.4 URL parameters

All through `useSearchParams` with `{replace: true}` and the house `setParam` helper.
**Absent = default = unfiltered, nothing selected.** An unknown value falls back to the
default with one amber line under the strip: `ignored an unrecognised {param} value`.

| param | values | default | written by | reach |
|---|---|---|---|---|
| `lens` | `budgets` \| `footprint` \| `procurement` | `budgets` (never written) | tabs | mounted panel; strip facts |
| `payer` | `union` \| `states` | both | rail | **budgets**: which rows every budgets surface reads; the stack is Union-only and says "not affected" under `states`. **footprint, procurement**: inactive, reason "installations and contracts are not budget rows" |
| `st` | state code | none | rail select; any map; Find | **budgets**: marks the state on both maps, opens `StatePanel`, filters `GrantsToStates` (S2) and the city ledger; the Union stack shows "Union demands are not placed by state" and is not filtered. **footprint**: accents the state on every multiple, filters `PlaceList` and the city ledger. **procurement**: inactive, reason "contracts and tenders here carry no place of performance" |
| `fy` | `YYYY-YY` or `YYYY-YY~YYYY-YY` | all | rail From/To; an axis FY | **budgets**: highlights the range on the stack and the ledger (columns outside are dimmed, **the axis never rescales**), filters twins; the state maps use `sfy`. **footprint**: inactive, reason "{dated} of {n} installations carry a date". **procurement**: awards and CPPP class-years whose calendar year starts inside the range ("FY {a} covers calendar {a}–{a+1}; awards by date") |
| `stage` | `BE` \| `RE` \| `actual` | **derived**: the stage with the widest FY coverage in the lens population (BE today, F4); never written when equal to the derived default | rail segmented | every budgets surface. The control prints per option `{k} of {FY_AXIS.length} FYs` |
| `comp` | comma list of `BudgetComponent` | all | rail toggles | **budgets**: the ledger and the twins; the stack draws its bands regardless and says "the stack shows every component; the filter applies to the ledger" |
| `sfy` | `{fy}:{stage}` from `STATE_PAIRS` | `defaultStatePair(m)` | the state-map select | the spend map only |
| `m` | `gsdp` \| `cr` \| `percap` | `percap` with S3, else `gsdp` | spend-map control | spend map class and value |
| `syr` | a strength year | `defaultStrengthYear` | strength-map select | strength map |
| `kind` | comma list of footprint kinds | all | footprint legend toggles | which multiples render; 0-row kinds are always listed |
| `sel` | node id | none | "Show connections"; vendor highlight | `GraphExplorer`'s selection, shared; on procurement it **accents a vendor card and never removes the other column** |
| `rec` | edge id or `budget:{payer}:{body}:{head}:{fy}:{stage}:{component}` | none | "Open record" | `RecordCard` |
| `tier` | comma list or `none` | all four | rail | every lens surface whose marks stand for claims or rows; shared with `GraphExplorer` |
| `find` | text | empty | `Find` | results only |
| `view` | `stage` \| `table` | `stage` | "Table view" | every twin open |
| `tp` | integer ≥ 1 | 1 | pagination | 400 rows per page |

`GraphExplorer` owns `q`, `fam`, `pred`, `ty`, `amt`, `from`, `to`, `focus`, `hops`, `path`;
the page writes them only through "Show connections" and "Apply {fy} to the graph". Changing
lens keeps `fy`, `st`, `stage`, `tier`, `find`, `sel`; clears `rec`. **There is no `party`,
`vendor-class` or `case` filter** (D25).

### 3.5 Live region and unavailable options

Exactly one `aria-live="polite"` region, debounced (150 ms filters and maps, 300 ms Find). It
carries every filter effect in words (`from {N} to {k} {unit}`), lens changes, panel open and
close, `Link copied`, `Citation copied`, `{table} copied, {rows} rows`, view changes, and the
FY readout title when an axis FY is chosen. Wherever `{N} → {k}` is drawn the arrow is
`aria-hidden`. Unavailable options are `aria-disabled="true"`, focusable, with the reason in
the accessible name: `Per head, unavailable: no population series in this build; a 2011
Census base would re-rank states (S3)`.

---
## 4. Page anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline (run, read-to) · resolution line ─────── ≤170px ┐
├ DenominatorStrip (sticky; facts per lens) + ReconciliationLine + active-filter line ─────┤
├ LensTabs [ Budgets | Footprint | Procurement and people ]   Find ⌕ · Copy link · Table  ┤
├────────────────────────────────────────────────────────────┬─────────────────────────────┤
│ FILTER RAIL (row, wraps): Payer · State · FY from–to ·     │ MARGIN 22rem (xl sticky)    │
│   Stage · Component · Tier · Reset — each with {N} → {k}   │  rest: ReadingKey           │
├────────────────────────────────────────────────────────────┤        ControlCard          │
│ LENS CENTRE (the picture first)                            │        CannotShowCard       │
│  Budgets:  DemandStack (defence | police, shared axes) →   │  rec:  RecordCard           │
│            TenureLanes → LineLedger → StatePair (spend |   │  fy:   FYReadout            │
│            strength) → DelhiLine                           │  st:   StatePanel           │
│  Footprint: KindMultiples (one map per kind) → PlaceList   │                             │
│  Procurement: ContractsByClass + AoN void → SliceBesideFile│                             │
├────────────────────────────────────────────────────────────┴─────────────────────────────┤
│ Captions (body size) · <details> twins (open under view=table)                            │
├ LENS SECTIONS                                                                             ┤
│  Budgets:   GrantsToStates · ContractCards (pay and pensions) · CityLedger · base rates · │
│             narratives · cannot show                                                      │
│  Footprint: CityLedger · base rates · narratives · cannot show                            │
│  Procurement: VendorColumns · BondsTable · BoardRoles · CasesLedger · base rates ·        │
│             narratives · cannot show                                                      │
├ SHARED: Connections (#connections) · Contested (#contested) · Gaps (#gaps) ·             ┤
│         Refusals (#refusals) · Source ledger · TierLegend · Standing note                 │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Stage grid:** `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6`. Below `xl` the
  margin renders as a block directly under the component that opened it; at rest the
  ReadingKey's swatches render under the first figcaption and `ControlCard` directly after
  the lens centre (finance U25). DOM order: centre, then margin.
- **Fold budget at 1280×800 (Budgets):** header ≤ 170, strip and lines ≈ 64, tabs ≈ 44,
  rail ≈ 44, `DemandStack` `clamp(380px, 100vh − 400px, 520px)` with its reconciliation row
  and the denominator line inside the figure. The pension band and its share label are in
  the first viewport (SG-33).
- **Chrome is constant across lenses**; only the centre and lens sections change.
- **Lenses:** `role="tablist"`, manual activation, URL-driven; only the active panel is
  mounted. Budgets is first because the brief orders it first; the order is no claim.
- **Margin precedence:** `rec` > `fy` readout (Budgets) > `st` > rest. Every panel has
  `Close` and `Back to {origin}`; Escape closes only with focus inside the panel.

### 4.1 Header copy (fixed, no figures)

- `Kicker`: `Security spend · defence, police, procurement`
- `PageTitle`: **The money India spends on force**
- `Standfirst`: "The Union pays for defence and for its own police; each state pays for its
  police; only Delhi's city police has a budget line of its own. This page draws what each
  payer budgets and spends, where force sits, and what the Ministry of Defence has bought
  and from whom, each figure beside what it is divided by and what it is compared with.
  Spending on force is a policy choice. A large number is not a finding."
- `Byline`: `force {runId} · tender slice {slice asOf} · records read up to {asOfLabel}`.
- **Resolution line** (body size, the spec §2 critic's reading, verbatim as a fixed
  string): "At Union level every rupee resolves to a line item. At state level the police
  head resolves per state; strength resolves per state only through secondary sources while
  the national table is unreachable. At city level only Delhi Police has a budget line;
  every other city's police money sits inside its state's police head."
- **Standing line:** "No colour on this page stands for a party, a government or a verdict.
  Party appears as text, where a record names it."

---

## 5. Section by section

Each component gives: **Reads**, **Encoding**, **Caption** (body size, 14 px
`text-text-secondary`, left rule, ≤ 72ch, directly under the graphic, `aria-describedby`),
**Twin**, **Empty / partial**. Every graphic is a `<figure>` with a visible `h3`, the
denominator line inside the figure (mono 12 px, above the caption), the caption, and a
`<details>` twin whose summary reads `{h3} as a table · {rows} rows`. The finance twin
contract (U15) applies verbatim.

### 5.0 Chrome

#### 5.0.1 `DenominatorStrip` (existing, sticky)

| lens | facts |
|---|---|
| Budgets | 1 `{rows} of {FORCE_BUDGETS.length} budget rows · {stage}` · 2 `defence {stage} {fy}: ₹{sum} cr across {demands} demands; pensions {p}%, pay lines {q}% — computed here` (latest FY of the stage with a full stack) · 3 `{covered} of {FY_AXIS.length} FYs have a {stage} stack` · 4 `{statesWithRow} of 36 map units have a state police row · Delhi police is a Union line` · 5 `{reported} rows from secondary sources (reported:)` |
| Footprint | 1 `{rows} of {FORCE_FOOTPRINT.length} installations` · 2 `{kindsWithRows} of {FOOTPRINT_KINDS.length} kinds recorded; {emptyKinds} with no row` · 3 `{statesWith} of 36 map units with any row` · 4 `{cities} cities named · no coordinates` · 5 `{commissionerates} commissionerates; city strength: no primary table` |
| Procurement | 1 `{awards} contracts MoD named · {priced} with ₹ · {unpriced} unpriced` · 2 `tender slice: {dedup} award decisions, {works}% one works buyer — read by class` · 3 `{vendors} vendors, {public} public sector beside {private} private, JV or foreign` · 4 `{cases} cases, {records} court and audit records` · 5 `{bonds} bond records, {donors} donors` |

Below 640 px only fact 1 and the date stay sticky; facts 2–5 move whole under the first
figcaption (finance U26).

#### 5.0.2 `ReconciliationLine` (in the sticky wrapper; mono 12 px)

- **Budgets:** `{FORCE_BUDGETS.length} rows = {union} Union + {state} state · by stage {BE}
  BE + {RE} RE + {actual} actual · {zeros} recorded as ₹0 · rows overlap by level: no total
  on this page adds rows from two levels`. Each stage term sets `stage`.
- **Footprint:** `{n} installations = ` one term per kind, **0-row kinds included** (`0
  prison`, `0 ordnance`), each a link that sets `kind`.
- **Procurement:** `{FORCE_EDGES.length} records = {award} contracts + {bond} bonds + {role}
  roles + {enforce} rulings and actions + {contra} responses + {other} other · tender slice
  {raw} raw rows → {dedup} after dedup`.

#### 5.0.3 Active-filter line, `Find`, `ReadingKey`, `ControlCard`

As finance §5.0.4–5.0.7, with these differences:

- **Find** reads `nodeOf` over `GRAPH_NODES` (label, `sub`, `al`), `FORCE_FOOTPRINT.label`
  and `.city`, and `lab` of awards, cases, roles. Entity rows add, where they apply: `Show its
  budget line` (a body with budget rows, or a commissionerate → its `CityLedger` row),
  `Show where it sits` (a body with footprint rows → Footprint, `st`), `Highlight vendor` (a
  `VENDORS` id → Procurement, `sel`), `Go to case` (a case node). A city name returns its
  places and, if a commissionerate, its ledger row. **Never ranked by amount.** Empty: `No
  body, place or record in this register matches "{find}". This is a statement about the
  register, not about the world.`
- **ReadingKey** adds the band key (§8.1): lightness steps for components, the pay bracket,
  the reconciliation marks, and the two map textures (hatch "no row recorded", the
  Union-funded crosshatch for Delhi), and the "Words this page uses" block: `BE` — the
  budget's first estimate; `RE` — the revised estimate later that year; `actual` — audited
  spend, two years later; `demand` — one grant voted by Parliament; `line` — a sub-head
  inside a demand; `head` — the account head as printed; `reported:` — transcribed from a
  secondary source; `computed here` — a ratio or sum this page computed from recorded
  rows.
- **ControlCard** pins, per lens, the domains of `LENS_DOMAINS` and prints each domain's
  `SYMMETRY` text verbatim under its base-rate rows in the same element (finance U22). The
  state-police symmetry text names party groups; it is quoted, never drawn.

---

### 5.1 Budgets lens

#### 5.1.1 `DemandStack` — "What the Union budgets for force, year by year" (centre)

- **Reads:** `defenceStack(stage)`, `structureBreaks`, `payBracket`, `agnipathTicks`,
  `policeStack(stage)`, `delhiLine`, `policePayTicks`, `FY_AXIS`.
- **Form:** two stacked-column panels, **Defence (Ministry of Defence, four demands)** above
  and **Police (MHA Police demand)** below, on **one FY axis and one ₹ crore y-scale**
  (linear, from 0, shared, frozen: the police panel is short because the money is smaller,
  and the shared scale is the comparison). One column per `FY_AXIS` entry, missing FYs
  included.
- **Encoding:**
  - Defence bands, bottom to top in fixed order: revenue · capital · MoD civil and misc. ·
    pensions. Bands are distinguished by **lightness steps of one neutral series with 1 px
    separators and direct labels at the right edge** (never family hue: a component is not
    an actor family). Pensions is the topmost band and carries, on every column, a mono
    label `{p}%` (share of that column's stack, computed here) and, on the latest column,
    `₹{cr} cr`.
  - **Pay bracket:** a 2 px outline bracket on the revenue band's right edge from 0 to
    `Σ pay lines`, labelled `{k} pay lines` on hover/focus and in the twin. Where `k`
    changes, a short vertical tick on the axis reads `pay lines {k} → {k'}`. FYs with no pay
    rows draw an empty bracket cap with the words in the twin. Pay is never a band (F3).
  - **Agnipath tick:** a short horizontal tick inside the revenue band at `Σ Agnipath`
    height from the band's base, labelled once, `Agnipath lines`.
  - Police bands: revenue · capital (verified disjoint, F9). **Delhi Police bracket**: an
    outline bracket on the police column at `delhiLine.total`, labelled once `Delhi Police
    (the one city budget)`. **Police pay ticks**: up to three labelled ticks at their FY and
    stage only.
  - **Outline dash** of every band = its weakest constituent tier (`rowTier`); today every
    Union row is `documented` (solid).
  - **Missing column:** a hatched column the full panel height with no value, label `no
    {stage} rows`; a partial column (2013-14 actual) draws its bands and hatches the rest
    with `revenue and MoD civil not recorded`.
  - **Reconciliation row** (mono 10 px under the defence panel, one glyph per column):
    `=` equal to the published all-demands total · `≠` differs (Δ in the readout and twin) ·
    `·` no published total. Explained in the legend line.
  - **Structure rule:** a dotted vertical rule (assembly rule, light, not a tier dash)
    through the defence panel at each `structureBreaks` FY, labelled `demand structure
    changes`.
  - The `fy` range dims columns outside it to 30% opacity; the axis does not move.
- **Interaction:** the FY labels on the axis are buttons (roving tabindex, one tab stop)
  named `{fy} {stage}: defence ₹{sum} cr, police ₹{total} cr`; choosing one writes nothing
  to the URL except `rec` when a band row is opened, and opens `FYReadout` in the margin: the
  four demands with head, ₹, tier and source; the published total and the reconciliation
  sentence; the pay lines listed; the police demand's revenue/capital/total check; Delhi
  Police; the base-rate rows for that FY, verbatim (S4 absent). Coarse pointers: first tap
  shows the readout line under the figure, second tap opens.
- **Denominator line (inside the figure):** `{stage}, ₹ crore, nominal, as published · {covered}
  of {FY_AXIS.length} FYs drawn · defence stack = {k} demand totals per FY; reconciles to the
  published all-demands total in {eq} of {pub} FYs that have one · police stack = revenue +
  capital of the Police demand, checked in {chk} of {chk} FYs`.
- **Caption C1:** "Each defence column stacks the Ministry of Defence's demands for grants
  as Parliament votes them: revenue, capital, the civil and miscellaneous demand, and
  pensions. Pay is a line inside the revenue demand, so it is drawn as a bracket, not added
  on top. The demands were reorganised in {firstBreak}, so a band's contents change there;
  the rule marks it. Where the record holds a published total for all demands, the mark
  under the column says whether the stack equals it. Missing years are hatched, not
  skipped. Amounts are nominal and not adjusted for inflation; a share of GDP is in the
  base rates below until the denominator series is exported. The police panel uses the same
  scale; Delhi Police is bracketed because it is the only city police force with its own
  budget line."
- **S4 present:** a 48 px strip under each panel, same x, `defence ÷ GDP` and `police ÷
  GDP` as dot-on-rule per FY with the denominator source; missing years hatched.
- **Twin:** one row per `(FY, panel)` with columns `FY · stage · band · head · ₹ cr · tier ·
  source · published total · reconciliation · pay lines (k) · pay ₹ · Agnipath ₹ · Delhi
  Police ₹`; a missing FY reads `no {stage} rows recorded`; a recorded zero reads `₹0 cr — as
  recorded`.
- **Empty:** no budget rows → both panels draw the axis with every FY hatched and the line
  `No budget rows in this build. Nothing below is zero.`

#### 5.1.2 `TenureLanes` under the stack — "Who held the ministries"

- **Reads:** `role` edges into `MOD` and `MHA` (Defence and Home Ministers), dated; `ASOF`
  via the new `asOf` prop (D29).
- **Encoding:** as `/energy`: one lane per ministry, a bar per tenure outlined in the role
  claim's tier dash, never coloured; the x-scale is the stack's FY axis (FY start =
  1 April). Party is **not printed** unless a role claim records it (none do today); the
  lane says so in its twin column `party: not recorded in the role claim`.
- **Caption C2:** "Who held the Defence and Home portfolios on each date, from dated role
  records. A budget is voted months before the year it funds and spent across it; the lanes
  show who was in office, not who decided a line."
- **Twin:** one row per tenure: ministry, person, from, to (`incumbent, no end recorded` for
  open-ended), tier, source.

#### 5.1.3 `LineLedger` — "Every Union line, every year"

- **Reads:** `LEDGER(stage, comp)`, `bodyCoverage`.
- **Form:** a heat-ledger table: rows = Union `(body, head)` grouped by payer demand
  (Defence, Police, Cabinet, Revenue (ED), Personnel (CBI), WCD (Nirbhaya), Grants);
  columns = `FY_AXIS`; each cell prints ₹ crore in mono, its background a **single-hue
  sequential ramp per row** (row-normalised, so a row is read along its own years; the
  legend says "shading compares a line with its own years only"). Hatch = no row; `₹0` =
  recorded zero with `ZERO_FILL`. The computed residual row "rest of the demand, computed
  here" is italic, never shaded.
- **Sort:** by demand, then by first FY recorded, then label. Never by amount.
- **Denominator line:** `{lines} lines · {cells} cells drawn, {missing} hatched · {stage}`.
- **Caption C3:** "One row per budget line as the document prints it. Lines inside a demand
  overlap their demand total, so no column of this ledger is summed. Shading compares a line
  with its own other years, never with another line. A hatched cell means the document read
  for that year did not give this line at this stage, not that nothing was spent."
- **Twin:** long form, one row per non-empty or hatched cell: `body · head · component · fy ·
  stage · cr · tier · note · source`.
- **390 px:** a sticky 120 px label column; the table scrolls inside its container; initial
  `scrollLeft` shows the latest FY.

#### 5.1.4 `StatePair` — "Police spending by state, beside police strength"

Two `WelfareMap`-pattern choropleths side by side (stacked below `lg`), each a listbox of
36 options, sharing `st` selection.

- **Left, spend:** `stateSpend(sfy, m)`.
  - `m=gsdp` (interim default): MH 2055 revenue ÷ GSDP of the same FY, in %. Today this is
    drawn only for the `(fy, stage)` whose FY equals the GSDP FY (F18); the `sfy` select
    lists every pair and marks those where `% of GSDP` is unavailable (`aria-disabled`,
    reason "GSDP in this build is for {gsdpFy} only").
  - `m=percap` (S3 default): ₹ per person, on the S3 basis, label `per person, {basis}
    {year}`.
  - `m=cr`: ₹ crore, ramp, plus `{share}% of the {k} drawn states' sum, computed here`.
- **Right, strength:** `stateStrength(syr)` — `perLakh` as printed; dashed `reported`
  outlines on every state whose row is `reported:`.
- **Classes (both maps):** ramp fill in fixed pooled quantile bins (computed over every pair
  or year with no filters, frozen: bins do not move when the reader filters) · hatch `no row
  recorded` · crosshatch for `dl` on the spend map `police funded by the Union: Delhi Police
  is a line in the Police demand` · stipple on the strength map for `counts-only` (`dl`:
  counts without per-lakh) · hatch `GSDP not in this build` (`jk`, `tr` under `m=gsdp`). The
  ramp floor ≥ `#2e373f`. An empty class is named in the legend as empty.
- **Dot strip twin-in-figure:** under each map, a horizontal dot strip of every drawn state
  on the map's value axis, state codes as labels, sorted by value (a declared external
  quantity) with the median rule labelled `median of {k} drawn`. This is the comparison
  instrument; the map is for finding a state.
- **Denominator line:** spend `{k} of 36 drawn · {fy} {stage} · head Police (MH 2055),
  revenue account only (capital outlay MH 4055 is not in the RBI row) · ÷ {denom}`; strength
  `{k} of 36 drawn · per lakh as printed, BPR&D via secondary sources · {reported} reported`.
- **Selecting a state** opens `StatePanel` (margin): the state's MH 2055 rows (all four
  pairs) with tier and note; its other heads (UP's Grant 26, PRS district police lines)
  under "other heads, not comparable across states"; its strength rows with sanctioned,
  actual (and "derived by the research from per-lakh" when the note says so), women %, and
  the vacancy share **computed here** only when both counts are recorded; `stateRecords(st)`
  verbatim; its commissionerates (link to `CityLedger`); ASUMP heads naming the state (S2:
  rows). Party: none printed by the page; the state-police symmetry text is quoted in
  `ControlCard`.
- **Caption C4:** "Left: what each state's police head spent or budgeted, from RBI's State
  Finances, divided by {denomWords}. Right: police per lakh people as the national police
  table printed it, carried here from secondary sources while that table is unreachable.
  The two maps use different population bases and different years; they sit side by side
  for reading, not for dividing one by the other. Delhi's police is paid by the Union and
  is drawn in the budgets above, not here. Hatched means no row is recorded, never zero. A
  per-person figure waits for a current population series: dividing by the 2011 Census would
  inflate faster-growing states' figures and re-order them."
- **Twin:** 36 rows + 1 (`all states`, from the base rate where recorded): `state · class
  (in words) · ₹ cr · denominator · ratio · fy · stage · tier · note · strength per lakh ·
  sanctioned · actual · derived counts? · women % · year`.
- **Empty:** no state rows → both maps fully hatched, legend `no state rows in this build`.

#### 5.1.5 `DelhiLine` — "The one city police budget"

- **Reads:** `delhiLine`, `bodyCoverage(DELHI_POLICE)`, Delhi strength rows.
- **Form:** a small multiple of three lines on the stack's FY axis — BE (solid), RE, actual —
  ₹ crore; points only where a row exists, **no line drawn across a missing FY**; under it a
  `shareOfPolice` dot row (computed here). Strength rows (counts, no per-lakh) as three
  labelled ticks.
- **Caption C5:** "Delhi Police is the only city police force with its own budget line,
  because the Union pays for it through the Police demand. Every other city's police is
  paid from its state's police head and has no published budget of its own; the city
  ledger says so for each commissionerate the record holds."
- **Twin:** one row per `(fy, stage)`: total, revenue, capital, share of the Police demand,
  tier, source.

#### 5.1.6 `ContractCards` — "Pay and pensions: the terms, both sides" (lens section)

- **Reads:** `CONTRACTS` (7th CPC levels, Agnipath, OROP 2015 and 2022, 8th CPC), their
  `FORCE_BENEFITS` rows (stated saving or cost: `how`, `amountCr`, `confidence`),
  `responsesTo` chains, `enforce` rulings (the Supreme Court on OROP), `pay-pensions` base
  rates.
- **Form:** one card per contract with **four equal-width cells**: *The terms* (the law
  edge's `lab`, `d`, date, tier, source) · *The Ministry's stated case* (benefit row) · *The
  objections* (each contra on the claim) · *The answers* (contras on the objections, and
  rulings). Empty cell: `No {objection / answer} recorded — sought/not sought unknown` in
  amber. Pay levels render as a rank-class table (Level, entry pay, MSP) under the 7th CPC
  card, from the law edges' `lab` verbatim (no parsing; S-later may structure them).
- **Caption C6:** "Pay and pensions are contracts with people. Each card prints the terms,
  the Ministry's stated case, the objections and the answers with the same fields at the
  same size. No individual's salary is recorded; pay levels are."
- **390 px:** the four cells stack in the fixed order, same type size.

#### 5.1.7 `GrantsToStates` — "What the Union gives states for police"

- **Reads:** `GRANTS`; S2.
- **Interim:** a table, one row per row: `head` verbatim · fy · stage · ₹ cr (`₹0 cr — as
  recorded` where 0) · note · source; sorted by head then FY. The ASUMP released-÷-allocated
  base rates are printed above it verbatim.
- **S2 present:** a `WelfareMap` of released ÷ allocated per state for the selected FY,
  `₹0` in `ZERO_FILL` with its words, hatch where no row.
- **Caption C7:** "Allocation is what the Union set aside for a state; released is what it
  paid out by the date in the note. A release of ₹0 is a recorded figure. States are named
  inside the line's title in this build, so this is a table, not a map."

### 5.2 Footprint lens

#### 5.2.1 `KindMultiples` — "Where force sits, one map per kind" (centre)

- **Reads:** `FOOTPRINT_KINDS`, `kindCounts(kind)`.
- **Form:** a grid of small `WelfareMap`-pattern maps, one per kind with ≥ 1 row, in a fixed
  order (cantonment, command-hq, drdo-lab, dpsu-plant, ordnance, capf-hq, training,
  commissionerate, forensic-lab, prison, other). Grid 3 × n at ≥ 1024, 2 × n below, each map
  `aspect 612/696`. Fill = count of rows of that kind in the state, on **one count ramp
  shared by every multiple** (fixed bins over all kinds, frozen). A state with no row of that
  kind is **hatched** (S10 absent: "no row of this kind recorded"; with S10, an enumerated
  kind's empty state is hollow "none on the official list"). 0-row kinds render as a
  titled empty tile, fully hatched, with `0 rows — {reason}` (`prison`: "jail-wise
  locations are not published by NCRB; state portals not probed"; `ordnance`: "recorded
  under dpsu-plant after the 2021 corporatisation" only where a void or gap says so, else
  "no row recorded").
- **Title per multiple:** `{kind label} · {n} in {s} states`.
- **Interaction:** one shared `st` selection across every multiple; each multiple is a
  listbox of 36 options (roving; one tab stop each); the readout under the grid names the
  state, then per kind `{n}` and the cities, then "Show places" (filters `PlaceList`).
- **Denominator line:** `{rows} installations · {kindsWithRows} kinds · {statesWith} of 36
  units with any row · positions are states, not addresses`.
- **Caption C8:** "Each small map counts the installations of one kind that an official list
  places in each state. A hatched state has no row of that kind in this register, which is
  not the same as having none: some lists were complete, some were not reachable. Cities are
  named in the list below; there are no coordinates in this build, so nothing is drawn at a
  city's position. Footprint is mostly inheritance: cantonments and ordnance factories
  predate the Republic."
- **Twin:** `(kinds) × 36` long form: kind · state · count or `no row recorded` · cities.

#### 5.2.2 `PlaceList` — "Every installation, by state and city"

Grouped `<details open>` by state → city; rows: label · kind · body (`nodeOf`) · since
(`not recorded` for null) · tier · note · sources (all, never behind "more"). Filter by `st`
and `kind`. Below 640 px: `StackTable` cards.

#### 5.2.3 `CityLedger` — "City police: what is recorded" (also a section on Budgets)

- **Reads:** `CITY_LEDGER`.
- **Form:** a table, one row per commissionerate in the footprint plus Delhi Police: city ·
  state · body · **budget** · **strength** · installations in that city (count, link).
  - Budget cell, Delhi: `₹{latest BE} cr BE {fy} — the Police demand (Union)` with the
    `DelhiLine` link.
  - Budget cell, every other row, **exactly**: `inside {State}'s police head (MH 2055) — no
    city budget is published`, followed by a link `{State}'s police head →` (sets `st`,
    lens budgets). **No ₹ figure, no share, no estimate, in the cell, its title, its
    accessible name or its TSV** (SG-RF1).
  - Strength cell: a `FORCE_STRENGTH` row for the body if one exists, else `no primary
    table — the national police table is unreachable`.
- **Denominator line:** `{k} commissionerates recorded in {s} states · not every
  commissionerate: the national list is unreachable`.
- **Caption C9:** "A city police commissionerate is paid from its state's police head. No
  state publishes a city's police budget, so this table prints where the money sits instead
  of a number. Delhi is the exception because its police is a Union force with its own
  line."

### 5.3 Procurement and people lens

#### 5.3.1 `ContractsByClass` — "Contracts the Ministry of Defence has named, by vendor class" (centre)

- **Reads:** `AWARDS`, `vendorClass`, the AoN void (`FORCE_VOIDS`, domain
  `procurement-industry`, the one whose `what` begins "DAC Acceptance-of-Necessity"), the
  AoN and domestic-share base rates.
- **Form:** columns by calendar year of `from` (one linear year axis from the first to the
  last award year, empty years drawn as empty slots, not closed up); each column stacks ₹
  crore by vendor class: public sector at the base, private/JV/foreign above, **fill = the
  family hue** of that class (`state`, `capital`) because class is family here (D21); each
  contract is its own segment with a 1 px separator, outline dash = its tier. Beneath the
  axis, a **count row**: per year `{n} contracts named without ₹` as a numeral and small
  hollow squares, one per unpriced contract, by class. Joint contracts (a PIB total with two
  vendors, F21) are one hollow square per vendor, linked by a bracket, and are never split
  into ₹.
- **Beside it, same frame:** the **AoN void card**, at the chart's type size: the void's
  `what` and `whyItMatters`, and the AoN base rates verbatim ("AoN accorded versus contracts
  signed", "Indigenous share of AoN").
- **Pre-2021 records** (Bofors 1986, AgustaWestland 2010, Rafale 2016, Mahindra 2021…) are
  drawn as they fall on the axis; the axis begins at the first award year. Alleged awards
  are excluded from the bars and listed in `CasesLedger` and Contested.
- **Denominator line:** `{priced} contracts with ₹ (₹{sum} cr, nominal) · {unpriced} without
  · public sector {pubShare}% of named ₹, computed here · a sample of PIB releases, not every
  contract signed`.
- **Caption C10:** "Bars stack the contracts the Ministry of Defence named with a vendor in
  a press release, by the year signed. This is a sample of what was announced, not every
  contract. Approvals by the Defence Acquisition Council name no vendor and no price, so
  they cannot be drawn by vendor; the card beside the chart says what they show. Vendor
  class is read from the actor family: public sector, or private, joint venture and foreign
  together until the register declares each vendor's class. Contracts announced without a
  price are counted beneath the axis and never drawn as zero."
- **Twin:** one row per award: date · vendor · class (in words) · item (`lab`) · ₹ cr or
  `amount not stated` · tier · source; plus one row per empty year.

#### 5.3.2 `SliceBesideFile` — "Open-market security tenders, by buyer class, beside the whole file"

- **Reads:** `SLICE` (S8).
- **Form A (at rest):** one row per class in `sliceRule.classes` order: a horizontal bar of
  the class's share of slice award decisions (so the reader sees works is three quarters) ·
  a dot with Wilson whisker for the class's single-bidder rate · a hollow diamond for **its
  own portal's whole-file rate** (central 17.67%-type comparator, or the state portal for
  state-police) with its whisker · `n` in mono. Shared 0–100% x-scale for rates (linear,
  frozen). Rates with n < 10 print `n {n}: no rate drawn`.
- **Form B (below, small multiples):** per class, single-bidder rate by year (dot + whisker)
  beside the same-portal whole-file rate that year; years with n < 10 draw no dot and say so
  in the twin.
- **Above both, at body size:** `readMeFirst` verbatim, then the `caveat` verbatim. Never
  collapsed.
- **Interaction:** a class row label highlights its multiple (in-page state, never removes
  other rows).
- **Denominator line:** `{dedup} award decisions after dedup ({share}% of the file) · rate
  denominator {n} with a bid count · slice-wide single bidding {total}% against {whole}% for
  the file — read by class, one works buyer is {works}% of decisions`.
- **Caption C11:** "This is the slice of the central and state tender portals' award records
  whose buyer is a security body, not India's security procurement: capital acquisition
  runs on another portal, and GeM is not here. Each class is compared with its own portal's
  whole file. A low rate for works buyers reflects many local contractors; a high rate for
  laboratories or headquarters reflects specialised items. No name appears here below the
  register's naming threshold. Every figure is as the scrape stored it; its agreement with
  the portal could not be checked."
- **Twin:** per class and per class-year: class · portal · year · n · single · rate ·
  interval · whole-file same portal · whole file.
- **S8 absent:** the void card `The tender slice accessor is not in this build (S8)`.

#### 5.3.3 `VendorColumns` — "Vendors, with identical fields, never alone"

- **Reads:** `VENDORS`, `vendorClass`, footprint rows by body, `BONDS`, `BOARD_ROLES`,
  `FORCE_IDENTITY.publicRole`, the vendor-share base rates.
- **Form:** two equal-width columns, **Public sector** | **Private, JV or foreign** (S5:
  four labelled sub-groups inside the two columns, and pairing rows by `category`). Every
  card has the same fields in the same order: name · class · listing (`nse`) · owns / owned by (`own` edges, stake in the
  `lab` words) · contracts
  named (n, ₹ stated, n unpriced, years) · installations (n, states) · bonds bought (₹,
  parties as text, or `none recorded`) · retired officers on the board (or `none recorded`)
  · role in the record (`publicRole` verbatim) · sources. Alphabetical within a column.
  `sel` accents one card and scrolls it into view; **both columns always render**; if a
  filter would leave one column empty, the rail shows `Comparison set required` and the
  column keeps its cards greyed, not removed.
- **Caption C12:** "Every vendor carries the same fields. A private vendor is never shown
  without the public-sector vendors beside it, and the shares of named contract value by
  class are printed as the research computed them, with the sample they come from."
- **390 px:** the columns become two stacked lists with a sticky sub-header; a selected
  private vendor's card is followed immediately by the public-sector list's first three
  cards and a link to the rest.

#### 5.3.4 `BondsTable` — "Electoral bonds bought by security-linked donors"

Rows: donor · party (text) · ₹ cr · first and last purchase date · tier · source. Above:
the `money-people` base rates (`372 of 1,280`-type rows verbatim) and the domain's
symmetry text. Party is a text column; no fill, no sort by party. Caption C13: "Bonds are
recorded as the Supreme Court-ordered disclosure lists them. A purchase is not a payment
for a contract; the base rates above give every party's share for comparison."

#### 5.3.5 `BoardRoles` — "From a service to a vendor's board"

One row per person: last service role (body, to) · first vendor role (body, from) · gap
(**computed here**, at the coarser precision) · the cooling-off rule (`law` edge text) ·
tier · source; then the base rate `0 of 2` verbatim and the void "No retired Defence
Secretary, DGP or vice chief…". Caption C14: "A board role after retirement is lawful after
the cooling-off period. The gap is computed from the dates the records give, at the
coarsest precision either gives."

#### 5.3.6 `CasesLedger` — "The cases, as records"

- **Reads:** `CASES`.
- **Form:** the **Bofors | Rafale pair first**, side by side at equal width, then the other
  five in order of first record. Each case is a lane of dated squares (one per record:
  ruling, audit paragraph, chargesheet, closure) on one shared year axis, outlined in the
  record's tier dash, with a rose rule for each counter; beneath it a table: date · body
  (court, CAG, agency) · what it found (`lab` verbatim) · tier · source; and **Strongest
  counter** (the contra) at the same size. Base rate printed above: `{n} of {N} named cases
  with a final conviction in the records opened`.
- **Caption C15:** "Each case is a list of what courts, auditors and agencies recorded, with
  dates and the strongest answer from the other side. Bofors and Rafale sit side by side by
  design: each is the other's control. What people say about the cases is rated in the
  narratives below and never drawn as a link to a party."

### 5.4 Per-lens sections (every lens)

#### 5.4.1 Would the same lens alarm us elsewhere? (`id="baserates"`)

`FORCE_BASE_RATES` filtered to the lens's `LENS_DOMAINS`, grouped by domain, each domain's
`SYMMETRY` text verbatim directly beneath its rows in the same element. `{numerator} of
{denominator}`; a Wilson whisker only when both are integers and the denominator ≥ 10; a
percentage only when the denominator ≥ 10; the one null row prints `not computed in this
file` with the chip `figure in the research file's wording`. Base rates whose numerator is a
₹ figure print `₹{n} cr of ₹{d} cr`.

#### 5.4.2 Narratives (`id="narratives"`)

`NarrativeLadder` over `FORCE_NARRATIVES` filtered to the lens's domains; six rungs; `none
in this file` on empty rungs; strongest case and strongest counter at equal size; the
research file named. Toggle `show every domain's narratives ({n})`. Caption C16: "A
narrative is a claim about the world, rated with its strongest case, its strongest counter
and what would change the rating. It is never drawn as an edge. The same claim can appear
in two research files with two ratings; both are listed as recorded."

#### 5.4.3 What this lens cannot show (`id="cannot"`)

`FORCE_VOIDS` and `FORCE_GAPS` for the lens's domains plus the lens's derived gaps, in full,
`GapsPanel`, at the findings' type size, each void's `whyItMatters` at full size.

### 5.5 Shared sections

#### 5.5.1 Connections (`id="connections"`, `GraphExplorer`)

`GRAPH_NODES`, `GRAPH_EDGES`; `height=620` (480 below 640, behind `Load the graph`). Status
line: "{GRAPH_EDGES.length} relationships in the force register. Budget, strength and
footprint rows are tables, not relationships, and are not drawn here. {dropped} edges with an
endpoint outside every register are not drawn. The same person can appear under two ids
until reconciled ({splitIds})." Caption C17 (finance C15 verbatim): "Position carries no
meaning. Line dash is evidence tier; hue is the kind of actor; shape is entity type; size is
a declared band. Persons appear only in public roles."

#### 5.5.2 Contested (`id="contested"`)

`ALLEGED` with `responsesTo`, energy `ContestedList` pairs at equal width, size and weight.
Denominator: `{alleged} alleged claims · {answered} with a recorded response · {unanswered}
without — whether a response was sought is not recorded.`

#### 5.5.3 Gaps (`id="gaps"`)

`FORCE_VOIDS` + `FORCE_GAPS` + the killed claim (with `killedReason`) + derived gaps, each
shown only when its condition holds:

- "No population series: per-person spending is not drawn" (S3 absent)
- "Budget rows carry no level field: demand totals are selected by the title's form" (S1)
- "Grants to states name the state only inside the line title" (S2)
- "Vendor class is read from the actor family; foreign and joint-venture vendors are not
  separated" (S5)
- "Outcome rates per state are prose in {k} records, not a series" (S6)
- "Installations have no coordinates" (S7)
- "{k} footprint kinds have no row: {kinds}"
- "{k} of 36 map units have no state police row: {units}"
- "No budget row for prisons, fire services, home guards, civil defence or forensic
  laboratories"
- "Actual spend is recorded for {a} of {FY_AXIS.length} FYs; RE for {r}"
- "Pay lines change composition in {breaks}; no pay trend is drawn across a change"
- "{zeros} rows record ₹0 released"
- "{derived} strength rows carry counts derived by the research from per-lakh ratios"
- "{commissionerates} commissionerates have no strength row"
- "{unpriced} named contracts have no ₹"
- "{splitIds} people appear under two ids"; the `famSplits` sentence when non-empty
- "{emptySrcs} records have no source in the file"
- Header: "{v} voids and {g} gaps recorded by the research, 1 claim killed in audit, and {d}
  derived by this page." Grouped by lens, then domain. Never collapsed.

#### 5.5.4 Refusals (`id="refusals"`) — §14 as a list, linked from the rail foot.

#### 5.5.5 Source ledger and foot

`SourceLedger` over `srcs` of every edge, node and series row in the lens, deduplicated by
URL, with `cited by {n} rows/records`; the full list always shown; then `TierLegend` and the
standing note.

---
## 6. Filter rail and its effect on the denominator

One rail for all three lenses. A control that does not reach the active lens stays visible,
`aria-disabled`, with its reason as its effect line; its param is kept.

| control | type | effect line beside it (live) | honours? (printed on the control) |
|---|---|---|---|
| Find | `type=search`, first after the tabs | `{k} matches` | filters nothing |
| Payer | segmented `All · Union · States` | Budgets `{N} → {k} budget rows`; else `does not apply to {lens}` | "the Union stack is Union-only; States affects the maps, ledger rows and panels" |
| State | `<select>` of 36 map units alphabetical with per-lens counts; `(0)` options shown and `aria-disabled`, never hidden | Budgets `{N} → {k} state rows · Union rows not placed by state`; Footprint `{N} → {k} installations`; Procurement `does not apply: no place of performance` | "a state's own police head; Delhi's police is a Union line" |
| FY from / to | two `<select>` + "All years", with a coverage ribbon for the active stage (one tick per FY with a stack, hatched FYs named) | Budgets `{N} → {k} rows · {fyIn} of {FY_AXIS.length} FYs`; Footprint `does not apply: {dated} of {n} installations dated`; Procurement `{N} → {k} contracts · {c} class-years` | "dims years outside the range; the axis does not move"; on Procurement "calendar years of the contract date" |
| Stage | segmented `BE · RE · actual`, each option with `{k} of {n} FYs` | `{N} → {k} rows` | "actuals arrive two years after the budget; BE is the only stage recorded for every year" (the last clause is derived: printed only while true) |
| Component | seven toggles with counts; `Select all` | Budgets `{N} → {k} ledger rows`; the stack `not affected` | "components overlap by level; this filter never adds rows" |
| Tier | four toggles with dash swatches | `{N} → {k}` for the lens population; `also filters the connection graph` | "series rows are documented or reported by their note; responses follow their claim" |
| Spend metric (map control, not rail) | segmented `% of GSDP · ₹ crore · per person` | per option `{k} of 36 drawable` | `per person` `aria-disabled` without S3, reason in name |
| Reset | button | clears page params except `lens` and `view` | never touches the graph's params |
| Copy link · Table view | button · toggle (`aria-pressed`) | `Link copied` | — |

Every change announces `from {N} to {k} {unit}` once, through the live region. **The rail
refuses** (a fixed muted line at its foot, linking to `#refusals`): "Not offered: party,
government, vendor-class-only, 'risk' and city-budget filters — why →".

---

## 7. Interactions

| verb | trigger | writes | result | focus |
|---|---|---|---|---|
| Read a year | an FY axis button on `DemandStack`; a column (pointer) | — (in-page `fy` readout state) | `FYReadout` in the margin (inline below 640) | the readout `h2`; `Close` / `Back to the chart` |
| Open record | a band row in a readout, a ledger cell, a map readout row, an award, a case record | `rec` | `RecordCard` with the row's every field, its sources and, for a budget row, its `note` in full | the card `h2` |
| Select state | any map option; State select; Find "Show where it sits" | `st` | both maps (or every multiple) accent the state; `StatePanel` | the panel `h2`; clicking the selected state clears it |
| Show places | the multiples readout | `st` (+ `kind`) | `PlaceList` filtered | the list heading |
| Highlight vendor | a vendor name anywhere; Find | `sel` | accents the card; both columns stay | the card `h3` |
| Show connections | any entity button | `focus`, `hops=1`, `sel` | scroll to `#connections` | graph detail heading; `Back to {origin}` |
| Go to case | Find entity row for a case node; a narrative's case link | `lens=procurement` when needed | scroll to `#case-{id}` | the case `h3` |
| Show its budget line | Find on a body with budget rows or a commissionerate | `lens=budgets`, `st` when a state body | scroll to the ledger row or the `CityLedger` row | that row's first cell |
| Filter | rail | the param | `{N} → {k}` announced | stays |
| Highlight class | a slice class label | in-page | accents its multiple | stays |
| Copy citation · Export | `RecordCard` · above every twin | — | clipboard / `.tsv` | stays |
| Change lens | tab | `lens`; clears `rec` | panel mounts | the lens heading |
| Escape | focus inside a panel or an expanded row only | — | closes it | the invoking control |

Coarse pointers: first tap on a column, a map state or a case square shows its line in a
reserved readout under the figure (up to four lines below 640); a second tap or the
readout's button acts. Copy is device-neutral. Reduced motion: no transitions on fill.

---

## 8. Encodings

### 8.1 Channels

| where | channel | means | never means |
|---|---|---|---|
| everywhere | `strokeDasharray` (`TIERS`) | evidence tier: documented solid · reported `6 3` · alleged `2 4` · analytic `8 3 2 3`; a series row's tier is `rowTier` | style, era, party, stage |
| graph, vendor columns, contract bars | hue (`FAMILY_COLOR`) | actor family; on contract bars, the vendor's family (= interim vendor class) | party, verdict, "good/bad" vendor |
| graph | shape (`ty`) | entity type | vendor class |
| graph | size (`sz`) | declared band | importance, ₹, degree |
| stack bands | lightness step of one neutral series + direct label + order | budget component (revenue, capital, civil/misc., pensions) | actor family (no family hue on bands) |
| stack | bracket outline (2 px, no fill) | a line *inside* a band: pay lines, Delhi Police | an extra amount on top |
| stack | `=` `≠` `·` under a column | reconciliation with the published all-demands total | quality of the year |
| stack, ledger, Delhi line | stage | carried by the `stage` param and the axis title, **never by dash** | — |
| stack | dotted light rule | an assembly fact: demand structure change, pay composition change | a tier |
| ledger | per-row single-hue ramp | a line's value against its own years | comparison across lines |
| state maps, multiples | ramp fill in pooled fixed bins | % of GSDP / ₹ crore / per person; per lakh; installation count | party, quality, a score |
| maps, ledger, columns | hatch | no row recorded | zero |
| spend map | crosshatch (45° + 135°) | Delhi: police paid by the Union | no data, zero |
| strength map | stipple | counts recorded without per-lakh | low |
| maps, ledger | `ZERO_FILL` with `₹0` text | a recorded zero | no data |
| multiples (S10) | hollow | none on an enumerated official list | no row |
| contracts | segment height · hollow square under the axis | ₹ crore stated · a contract named without ₹ | — · zero |
| slice | dot + whisker · hollow diamond + whisker · bar | class rate with Wilson 95% · its portal's whole-file rate · class share of slice decisions | ranking of buyers |
| cases | square · rose rule | a court, audit or agency record · a counter | guilt · credibility |
| everywhere | rose `--color-rose` | response or counter only | bad |
| everywhere | amber | not recorded (source, response, field) | suspicious |
| everywhere | accent | selection (`st`, `sel`, `rec`, readout FY) | importance |
| text only | party, ruling party, government, minister's party, country | as recorded | — |

### 8.2 Frozen (the developer may not adjust these to make it fit)

1. `strokeDasharray` means tier on every mark that stands for a claim or a series row,
   including aggregates (weakest constituent). `alleged` and `documented` never render alike
   in any theme, greyscale or screenshot. Stage is never a dash.
2. Family hue, type shape and declared size band are unchanged from `ForceGraph`. **No
   budget band, map class, slice class or case takes a family hue.** Contract bars take the
   vendor's family hue because the interim class *is* the family; with S5 the class is a
   label inside the family hue, never a new hue.
3. **No total adds rows from two levels** (F3). Pay, Delhi Police, Agnipath and every
   sub-line are brackets or ticks, never stacked. The ledger has no column total. No ₹ sum
   across Union and states, across stages, or across the tender slice and named contracts
   exists anywhere, including TSV headers and `aria-label`s.
4. **One FY axis, one ₹ scale** for both stack panels; linear from 0; no axis rescales to
   the years that happen to have data; missing FYs are hatched columns, never closed up.
   The FY filter dims, it does not crop.
5. Hatch ≠ zero. A recorded `cr === 0` prints `₹0 cr — as recorded` on `ZERO_FILL`; an
   absent row is hatch with `no row recorded`. Never `—`, `NaN`, blank or `0` for absence.
6. **No city ₹ other than Delhi Police**: no element, title, accessible name, tooltip or
   TSV cell associated with a commissionerate or any city body other than
   `force:delhi-police` contains a ₹ figure (SG-RF1).
7. **No per-person figure on the 2011 Census** (F16), and no per-person figure on any base
   without its basis and year in the same element.
8. Map bins are pooled over every `(fy, stage)` pair or strength year with no filters and do
   not move when the reader filters; the ramp floor ≥ `#2e373f`; empty classes are named.
9. The tender slice is drawn by class only, each beside its own portal's whole-file rate;
   the slice-wide rate never appears as a mark. `readMeFirst` and `caveat` render at body
   size above the chart, never collapsed.
10. Vendors are never alone: both vendor columns always render; `sel` accents, never
    filters; with one column empty, `Comparison set required` shows.
11. Bofors and Rafale render side by side, same fields, same size, first in the ledger.
12. Party and government are text only: never a fill, stroke, filter, sort key or legend.
    Rose is response only.
13. `a of b` is always printed; a percentage only when `b ≥ 10`; every page-computed number
    is labelled `computed here` where it appears.
14. Default sorts: by demand then date (ledger), alphabetical (states, vendors, places), by
    date (contracts, cases), by declared value only in the map's dot strip. Never by a
    page-computed score.
15. The default view is unfiltered with nothing selected; Budgets is the default lens; the
    default stage, state pair and strength year are **derived** from coverage, never
    hand-set.
16. Captions C1–C17 and the gaps panel render at body size directly under their graphic or
    in their section; none in the footer.
17. The exact strings: `inside {State}'s police head (MH 2055) — no city budget is
    published`, `₹0 cr — as recorded`, `no row recorded`, `amount not stated`, `No response
    recorded — sought/not sought unknown`, `Comparison set required`, `computed here`.

---

## 9. Captions the page must carry

C1 `DemandStack` · C2 `TenureLanes` · C3 `LineLedger` · C4 `StatePair` · C5 `DelhiLine` · C6
`ContractCards` · C7 `GrantsToStates` · C8 `KindMultiples` · C9 `CityLedger` · C10
`ContractsByClass` · C11 `SliceBesideFile` · C12 `VendorColumns` · C13 `BondsTable` · C14
`BoardRoles` · C15 `CasesLedger` · C16 Narratives · C17 Graph — verbatim as in §5, braces
interpolated from `securityView.ts`. Hand-written copy states method, never a figure. Every
caption says what its graphic cannot show. **The page never uses a partisan frame in its own
words** (energy A8): no heading, caption, label or tooltip uses "opposition", "ruling",
"government of the day" or a party name except inside quoted record text or the verbatim
symmetry texts.

---

## 10. Loading, empty, partial and no-data states

| state | render |
|---|---|
| Loading | route chunk and graph lazy; fallback PageTitle + Standfirst; graph fallback a 620 px block "Drawing the connection graph…" with its node and edge counts. `FORCE_BUDGETS/STRENGTH/FOOTPRINT` and `securityView.ts` reach the reader only in the `/security` chunk once G5 lands; until then SG-50 prints the entry growth |
| `FORCE_META.empty` | full chrome; `Callout label="Register not yet promoted"`; strip `register not yet promoted · nothing below is zero`; the stack draws its axis with no columns and the line `No budget rows in this build`; every map fully hatched; every section `Nothing recorded yet.`; smoke passes |
| Series empty, claims present (e.g. `FORCE_BUDGETS.length === 0`) | the affected centre draws its frame, axis and hatch with `No {series} rows in this build. Nothing below is zero.`; the other lenses unaffected |
| Prerequisite absent (S1–S10) | the interim named in §3.3 and its derived gap line |
| **Partial years (the common case)** | the stack draws every `FY_AXIS` entry; missing `(fy, stage)` columns are hatched; the strip says `{covered} of {n} FYs`; RE and actual are never interpolated; 2013-14 actual draws its two recorded bands and a labelled hatched remainder |
| Partial composition | pay brackets show `{k} pay lines` and break rules; the structure rule marks the demand reorganisation |
| Partial states | 30 of 36 on spend, 30 + 1 counts-only of 36 on strength; the denominator line says `{k} of 36` |
| Partial kinds | 0-row kinds titled with `0 rows`; hatch in every empty cell |
| Partial slice | class-years with n < 10 draw no dot |
| Filters → 0 | strip `N → 0`; the centre: `No row in this register matches {filters}. This is a statement about the register, not about India.` naming the most-removing filter with a one-click reset of it; the stack keeps its axis |
| Unknown `rec`/`sel`/`st`/`fy`/`stage`/`sfy`/`syr`/`kind` | the default with `ignored an unrecognised {param} value`; `rec` unknown: `No record {id} in this register.` |

---

## 11. Edge cases

- **E1. Demand numbers move.** Never key a band on `Demand 20`; key on `component` of a
  demand-level row (F5). A test fixture renumbers demands and the stack is unchanged.
- **E2. Summary-only FYs** (2002-03, 2003-04, 2006-07, 2007-08, 2012-13 BE): the stack uses
  the summary rows and the readout says "from the summary of demands".
- **E3. Stack ≠ published total** (5 FYs): draw the stack, mark `≠`, print both figures and
  Δ in the readout; never scale bands to fit.
- **E4. 2013-14 actual** holds pensions and capital only: two bands + labelled hatched
  remainder; the column's sum is labelled `partial: 2 of 4 demands`.
- **E5. Pay rows without a full service set** (2016-17: 3 lines): the bracket draws with `3
  pay lines`, a break rule both sides.
- **E6. A row with `cr === 0`** (68 ASUMP releases): `₹0 cr — as recorded`; included in counts;
  never hatch.
- **E7. Same body in Union and state rows** (`force:jk-police`): the Union line and the RBI
  `jk` line stay separate; the readout quotes the row note on the move.
- **E8. Delhi on the state maps:** crosshatch class on spend, counts-only stipple on
  strength; selecting `dl` opens a panel whose first line is "Delhi's police is a Union
  line" with the `DelhiLine` link.
- **E9. Ladakh** is not a map unit (`india-geo.json` has 36 units including `jk`); any row
  with `st: 'la'` (none today) is listed under "not a map unit in this build" in the twin and
  in the gaps panel, never dropped.
- **E10. PRS "district police" rows** (5 states, 2026-27, `reported:`): never on the map;
  in the state panel under "other heads, not comparable across states"; Maharashtra's is
  `component: pay` and is labelled "salaries for the district police (PRS wording)".
- **E11. UP's own Grant 26 series** beside the RBI row for the same FY: both listed with
  their heads; the panel prints "two documents, two heads; not reconciled here" when they
  differ.
- **E12. Strength counts derived** (90 rows): the counts print with `derived by the research
  from per-lakh`; a vacancy share is computed only when both counts are recorded, not
  derived.
- **E13. A commissionerate body that later gains a budget row** (a state starts publishing):
  the `CityLedger` renders the row's ₹ only if its `payer` is a state and its `body` is the
  commissionerate's own id; the fixed sentence is replaced and SG-RF1's allow-list must be
  extended in the same commit (the gate fails otherwise, by design).
- **E14. Joint contracts without per-vendor split:** one hollow square per vendor, bracketed;
  the twin row says `joint total ₹{x} cr announced for {vendors}; not split` when the
  research records the joint total as a fact.
- **E15. A vendor with `fam` neither `state` nor `capital`** (e.g. `force:adarsh-society`,
  `fam: recipient`): class `unclassified`, listed under the columns by name with the reason;
  never dropped. Alleged awards (Adarsh, Tatra/BEML, Rafale offset) are excluded from bars.
- **E16. Endpoint ids outside the module** (`bjp`, `meil`, `cag`, `sc`): `nodeOf` through
  `useData()`; unresolved → `{id} (not in the register)`.
- **E17. Two ids, one person:** both ids listed; tenure lanes show both bars; never merged.
- **E18. `FORCE_EDGE_DOMAIN` key without an edge** (the killed claim): ignored by every
  derivation; listed once in Gaps with its `killedReason`.
- **E19. Slice class-year with n = 1** (2011): no dot, `n 1: no rate drawn`.
- **E20. `fy` range with no stack column of the stage:** the stack keeps its axis and hatched
  columns; the live region says `0 {stage} columns in {range}`.
- **E21. Reconciliation drift** (ids merge, counts move): no component holds a count; the
  §0 numbers are not copied anywhere; anchors are checked at load.

---

## 12. Mobile at 390 px (no horizontal page scroll)

`useNarrow()` = `matchMedia('(max-width: 639px)')`.

- **Header:** kicker, title, standfirst, resolution line. Byline and strip facts 2–5 move
  whole under the first figcaption (moved, not hidden).
- **Pinned stack:** site header + one-line strip (fact 1 + date) + tabs ≤ 140 px.
- **Tabs:** full-width segmented control, 44 px targets, wrap to two lines, never a menu.
- **Rail:** `<details>` labelled `Filters ({active}) · {N} → {k}`; the effect line stays
  outside; native selects.
- **`DemandStack`:** drawn at full width **without horizontal scroll**: 28 columns at 390 px
  leave ~11 px each with 2 px gaps; FY labels on every fourth column plus the latest; the
  pension share label only on the latest column and on the chosen FY; direct band labels move
  to a legend row beneath; the reconciliation row keeps one glyph per column at 10 px mono.
  Panel heights: defence `clamp(220px, 60vw, 300px)`, police on the same scale. The twin
  renders open by default beneath.
- **`TenureLanes`:** existing narrow behaviour (scroll inside, sticky labels).
- **`LineLedger`:** sticky 120 px label column, scroll inside its container, starts at the
  latest FY, `{k} columns · scroll → for the rest` with a right-edge fade, wrapper
  `role="region"` named by the caption.
- **`StatePair`:** maps stacked, each full width `clamp(300px, 80vw, 420px)`; dot strips
  wrap labels to codes; the `Open a state` select under each figcaption; no on-map labels;
  legend swatches ≥ 12 px.
- **`KindMultiples`:** 2 per row (each ≈ 170 px wide); titles above; tap selects the state on
  all; readout block under the grid.
- **`ContractsByClass`:** full width; the AoN void card stacks directly under the chart (same
  frame, before the caption).
- **`SliceBesideFile`:** rows stack (label line, then bar, then the rate scale); the by-year
  multiples one per row.
- **Tables with response or source slots** (contracts, bonds, roles, cases, contested,
  places, city ledger): `StackTable` cards, every field, response block directly under the
  claim block at the same size; sources never behind a disclosure.
- **Vendor columns:** §5.3.3 narrow rule.
- **Graph:** behind `Load the graph`.
- **Mono floor:** 12 px (10 px only for the reconciliation glyph row, which is
  `aria-hidden` and duplicated in the twin).
- **Gates:** at 360 and 390, `scrollWidth ≤ innerWidth` on every lens, with `view=table`,
  `rec` open, `st=dl`, `sel=force:adani-defence` (SG-31).

---
## 13. Accessibility

- **Landmarks and outline:** `h1` PageTitle; `nav` (rail); `main`; `h2` per lens panel and
  section; every graphic a `<figure>` with a visible `h3` free of figures (`What the Union
  budgets for force, year by year` · `Who held the ministries` · `Every Union line, every
  year` · `Police spending by state` · `Police strength by state` · `The one city police
  budget` · `Where force sits, one map per kind` · `Contracts the Ministry of Defence has
  named` · `Open-market security tenders, by buyer class`); `aside` margin with `h2` cards;
  the strip a `<section aria-label="Denominators">` with a hidden `h2`. No level skipped.
- **Tabs:** WAI-ARIA tabs, manual activation.
- **`DemandStack`:** the SVG is `role="group"`, `aria-labelledby` its `h3`,
  `aria-describedby` the denominator line. Bands, brackets and glyphs are `aria-hidden`;
  the FY axis buttons are the only focusables (**one tab stop**, roving tabindex,
  Left/Right/Home/End), each named `{fy}, {stage}: defence ₹{sum} crore in {k} demands,
  pensions {p} percent computed here, {recon words}; police ₹{total} crore` or `{fy}, no
  {stage} rows recorded`. A skip link `Skip to the table` precedes it.
- **Maps (state pair, every multiple):** the `WelfareMap` listbox model: 36 options north to
  south, each named `{State}: {class in words}, {value with unit}` (`Delhi: police paid by
  the Union, not a state line`; `Manipur: no row recorded`); Enter selects, Escape clears;
  shapes `aria-hidden`. Each multiple is its own listbox labelled `{kind}, by state`.
- **Ledger, twins, every table:** real `<table>`, `<caption>` naming table, population and
  filters; `th scope`; `aria-sort`; sort buttons named `Sort by {column}, {state}`; cells
  holding lists are `<ul>`.
- **Contract bars, slice rows, case lanes:** drawing `aria-hidden`; the twin and the label
  column's buttons carry everything; skip link before each.
- **Response pairs and contract cards:** one `<dl>` per item; the response or objection is
  never `aria-hidden` or collapsed.
- **Live region:** exactly one, polite, debounced; words, never the arrow glyph.
- **Repeated controls name their row** (`Open record: {head} {fy} {stage}`, `Show
  connections for {label}`, `Show places in {State}`, `Highlight {vendor}`).
- **Text:** `<abbr title="crore">cr</abbr>` first per table; numbers `font-mono
  tabular-nums`; contrast ≥ 4.5:1 text, ≥ 3:1 for hatch, crosshatch, stipple, brackets and
  dash strokes on `--color-bg`; ramp floor ≥ `#2e373f`.
- **Targets:** 44 px coarse, 24 px fine.
- **Keyboard budget:** from the first focusable in `<main>`, the `DemandStack` axis in ≤ 15
  tab stops, the spend map listbox in ≤ 25 at 1280; the graph by "Show connections".
- **Motion:** `prefers-reduced-motion` honoured.

---

## 14. What the page refuses to show, and why (`id="refusals"`)

- **A city police budget other than Delhi's.** None is published; the page prints where the
  money sits, never a number, a share or an estimate (F10, F20).
- **A total that adds a demand to its own lines**, or pay on top of revenue, or Union plus
  states, or BE plus actual. Rows overlap by level (F3).
- **A per-person figure on the 2011 Census.** It re-ranks states (F16).
- **A per-state outcome rate parsed from prose**, or any outcome coloured by the ruling
  party (F17).
- **A map of defence money by state or city.** No defence demand is printed by place (void
  `union-defence`).
- **Points at city positions without coordinates** (F19).
- **DAC approvals by vendor.** Approvals name no vendor (F22).
- **A private vendor alone**, a vendor ranking, a "most connected" or a risk score.
- **The tender slice's overall rate as a finding.** One works buyer is three quarters of it
  (F32).
- **Party colour anywhere; a party, government or era filter.** Party is text.
- **A case drawn as an edge to a party**, or a narrative as an edge.
- **A merge of two ids by name** (F30).
- **Operational detail**: deployments, orders of battle, unannounced procurement; and any
  salary of a named person (spec §1 non-goals).

---

## 15. Decisions

| # | Decision | Why (fact) | Rejected alternative |
|---|---|---|---|
| D1 | Graphic-first: each lens opens on its one picture, twin and denominator inside the figure | brief | evidence-first list at the top (candidate B's ground) |
| D2 | Every figure derived in `securityView.ts`; §0 counts are never copied | F1, reconciliation pending | literals in components |
| D3 | Derive from `FORCE_EDGES`, resolve labels through `useData()` | F1, F25, F31 | iterate `FORCE_EDGE_DOMAIN` |
| D4 | Budgets is a flow ledger with periods as columns, not a pie or a treemap | skill: one payer over time; missing periods are the story (F4) | treemap of a single year |
| D5 | Stack only demand-level rows, banded by `component` | F3, F5 | stacking every `component` row (double counts) |
| D6 | Pay as a bracket, never a band; no pay trend across composition changes | F3, F7 | a pay band; a pay line chart |
| D7 | Default stage derived from coverage (BE today) | F4 | hard-coded `actual` (9 of 27 FYs) |
| D8 | Reconciliation glyph per column; never force agreement | F6 | silently using the published total |
| D9 | Defence and police panels on one ₹ scale | stance rule 1: comparison set in frame | independent y-scales that make police look as large |
| D10 | Spend map on % of GSDP until a population series lands; per person disabled with its reason | F16, F18 | per capita on 2011 Census; ₹ crore choropleth (a population map) as default |
| D11 | One state head on the map (`Police (MH 2055)`), one `(fy, stage)` | F11 | mixing UP's grant and PRS lines into the fill |
| D12 | Delhi is its own class on the spend map | F10, F11 | hatch (reads "no data") or Delhi Police's ₹ on the state map (wrong payer) |
| D13 | Strength `perLakh` as printed; derived counts labelled | F15 | recompute per lakh from counts |
| D14 | Commissionerates print a fixed sentence for budget | F10, F20, brief | a "share of state police" estimate |
| D15 | Dot strip under each map is the comparison instrument | skill: maps only where position informs | map alone |
| D16 | State outcome records listed verbatim, no outcome map | F17 | parsing `d` |
| D17 | Footprint as per-kind small multiples by state | F19 (no coordinates) | spiral marks that look like cities |
| D18 | Empty footprint cells hatched until coverage is declared | F19, S10 | zero fill |
| D19 | Draw signed PIB-named contracts; put the AoN void in the same frame | F22 | a fabricated AoN-by-vendor chart |
| D20 | Unpriced contracts counted beneath the axis | F21 | dropping them or drawing 0 |
| D21 | Interim vendor class = actor family (public / private, JV or foreign) | F23, F24 | `ty` (splits DPSUs), `own` (misses GSL, HSL), parsing `publicRole` |
| D22 | Slice by class only, each beside its own portal | F32 | slice-wide rate as a mark |
| D23 | Vendor columns always both render | stance rule 3 | a vendor filter |
| D24 | Bofors \| Rafale pinned first by anchor | stance rule 5, literature symmetry | date order only |
| D25 | No party, vendor-class or case filter | stance rules 4–5 | — |
| D26 | Contract cards with four equal cells | stance rule 2; the `pay-pensions` law → contra → contra chains (§5.1.6) | Agnipath as a timeline only |
| D27 | Shared `st` across lenses; Union surfaces say "not placed by state" | spec §2 resolution | filtering Union rows by a state they do not have |
| D28 | `fy` dims rather than crops | frozen §8.2.4 | rescaling the axis |
| D29 | `TenureLanes` gains an `asOf` prop (bounded change, finance D39) | F33 | importing energy's `ASOF` |
| D30 | Maps on the `WelfareMap` listbox pattern, not `IndiaMap` | F33 (`IndiaMap` drops values ≤ 0 from its scale and has no zero class) | `IndiaMap` |
| D31 | Ledger shading normalised per row | positive Union rows span ₹0.08 cr (a NATGRID line) to ₹6,81,210.27 cr (the 2025-26 all-demands total), seven orders of magnitude | one ramp for all lines (everything but four rows reads empty) |
| D32 | Slice rates need n ≥ 10 for a dot | F32 | drawing n = 1 at 100% |
| D33 | Budgets tier from the `reported:` note prefix until a field lands | spec §4.1 | treating every row as documented |
| D34 | `CityLedger` appears on both Budgets and Footprint (same component) | B4 and F2 both need it | two different tables |
| D35 | Graph excludes series rows; status line says so and counts drops | F31 | drawing budget rows as edges |
| D36 | The slice is accessed through a slim generated accessor (S8), not the 316 KB file | F32 | importing `security.json` whole into the chunk |
| D41 | The killed claim is listed in Gaps with its reason | F1 | hiding it |

---

## 16. Acceptance gates

For `scripts/pages/security.test.mjs`, run against a pinned build in two forms: FULL
(current module) and EMPTY (`META.empty` fixture and an empty-series fixture). **Every
expected value is computed by the test from the generated module independently of
`securityView.ts`.** (G) marks gates asserting both interim and post-prerequisite behaviour.

**Stance and refusals**

- **SG-RF1.** For every footprint row with `kind === 'commissionerate'` and every node id
  matching `/-police$/` other than `force:delhi-police` and the 30 state police bodies,
  every DOM element whose text, `title`, `aria-label` or TSV cell names that body contains
  no `₹` and no digit-group followed by `cr`; each such `CityLedger` row's budget cell
  equals exactly `inside {State}'s police head (MH 2055) — no city budget is published`.
- **SG-RF2.** No element's fill or stroke is keyed to a party, government or era string; the
  words "ruling", "opposition", "government of the day" appear only inside quoted record or
  symmetry text.
- **SG-RF3.** On Procurement, under every URL in {rest, `sel=force:adani-defence`,
  `sel=co:larsen-toubro`, `sel=co:hindustan-aeronautics`, `tier=reported`, `tier=none`,
  `fy=2024-25`}, both vendor columns render ≥ 1 card each or `Comparison set required` is
  visible; no URL renders a private card with zero public cards in the DOM.
- **SG-RF4.** The `CasesLedger`'s first two case blocks are Bofors and Rafale, in one row at
  1280 with widths within 5% and the same font size; at 390 consecutive.
- **SG-RF5.** No ₹ figure in a commissionerate row, in any state; no per-person figure
  anywhere while S3 is absent; the `m=percap` option is `aria-disabled` with the S3 reason.

**Data integrity**

- **SG-1.** Every anchor exists; removing one fails load.
- **SG-2.** With `META.empty`, smoke passes, `Register not yet promoted` renders, and no
  count reads `0` where a count is unavailable; with `FORCE_BUDGETS = []`, the stack renders
  its axis with every column hatched and the empty sentence.
- **SG-3.** No numeric literal other than layout constants in `src/components/security/*`
  or `src/pages/Security.tsx`.
- **SG-4.** For every stack column: band values equal the test's own selection of
  demand-level defence rows for that `(fy, stage)` (summary rows only where no other rows
  exist) to ±0.5; no `component === 'pay'` row value is a band; the column's printed sum
  equals Σ bands; where an `ALL_DEMANDS` row exists the glyph is `=` iff \|Δ\| ≤ 0.5.
- **SG-5.** (G) The regex anchors select exactly the rows the test's independent rule
  selects; with S1 present, `level` selection and the anchors agree on every row, and the
  anchors are deleted.
- **SG-6.** Every police column satisfies `total === revenue + capital` (±0.5) or draws the
  `≠` glyph; the Delhi bracket equals the Delhi total row of that `(fy, stage)`.
- **SG-7.** Every `cr === 0` row renders `₹0 cr — as recorded` wherever it appears and never
  a hatch; every missing `(fy, stage)` renders a hatched column; no element reads `0` for a
  missing row.
- **SG-8.** The spend map fills only from `STATE_SERIES_HEAD` rows of the chosen pair; a
  fixture adding a PRS row for Bihar with a larger `cr` leaves Bihar's fill unchanged.
  Delhi's option name contains "paid by the Union".
- **SG-9.** (G) S3 absent: no element prints a per-person ₹; S3 present: `m` defaults to
  `percap` and every per-person figure names its basis and year in the same element.
- **SG-10.** The strength map's values equal `perLakh` as recorded; derived counts carry the
  derived label; vacancy share appears only where both counts are recorded and not derived.
- **SG-11.** Footprint: for every kind in the `FootprintKind` type, a multiple or a 0-row
  tile renders; per state counts equal the test's count; an empty state is hatched (S10
  absent) or hollow (S10 enumerated).
- **SG-12.** Contracts: Σ segment ₹ per year equals the test's Σ over non-alleged MoD awards
  with numeric `a`; the count row equals awards without `a`; no alleged award is in a bar.
- **SG-13.** Vendor class: interim class equals `fam` mapping for every awarded vendor; no
  class derives from `ty` or `own`.
- **SG-14.** Slice: every class rate and comparator equals `security.json`; no class-year with
  n < 10 has a dot; `readMeFirst` and `caveat` texts are present verbatim and not inside a
  closed `<details>`.
- **SG-15.** Contested lists every alleged non-contra edge with its responses; the
  denominator sentence's counts equal the test's.
- **SG-16.** Every base-rate row renders with its domain's symmetry text in the same section
  element.
- **SG-17.** The Gaps panel contains every void, every gap, the killed claim and each
  derived gap whose condition the test finds true, and none whose condition is false.

**Twins and exports**

- **SG-21.** For each graphic, twin rows = axis positions ∪ marks (stack: `FY_AXIS` × panels;
  ledger: lines × FYs; maps: 36 (+1 all-states where recorded); multiples: kinds × 36;
  contracts: awards + empty years; slice: classes + class-years; cases: records). Hatched
  positions carry the null words.
- **SG-22.** Every TSV begins with `#` lines naming table, population, filters, `runId`,
  `asOf`, and `# amounts:` with the stage where ₹ appear; machine columns parse as numbers.

**Encoding**

- **SG-30.** Greyscale screenshots at 390 and 1280 on each lens: hatch, crosshatch,
  stipple, `ZERO_FILL`, hollow, ramp floor and ground pairwise distinguishable (ΔL ≥ 8); the
  four tier dashes distinct; stack band lightness steps distinct.
- **SG-31.** At 360 and 390, every lens, `view=table`, `rec` open, `st=dl`,
  `sel=force:adani-defence`: `scrollWidth ≤ innerWidth`.
- **SG-32.** The stack panels share one y-scale (the test reads both axes' max tick).
- **SG-33.** At 1280×800 on Budgets the pension band of the latest drawn column is in the
  first viewport; at 390×844 the strip, tabs and rail summary are in the first 844 px and
  the stack in the first 1,688 px.

**URL and interaction**

- **SG-34.** Every param round-trips; unknown values produce the amber line; defaults
  (including the derived stage, pair and year) are elided; no param pre-selects an entity.
- **SG-35.** Changing `fy` never changes the stack's x-domain.
- **SG-36.** Changing `tier` changes the graph's drawn edge count; responses stay visible
  with their claim.
- **SG-37.** The page never writes `q`, `fam`, `ty`, `amt`, `path`; changing lens keeps `fy`,
  `st`, `stage`, `tier`, `sel`, removes `rec`.
- **SG-38.** Energy, welfare and finance suites keep their pinned counts after the
  `TenureLanes` `asOf` change.

**Paths, accessibility, bundle**

- **SG-40–42.** The ten paths of §2.2 complete in the stated steps at 1280×800 and 390×844
  with keyboard only and with pointer only.
- **SG-46.** Keyboard budget of §13.
- **SG-47.** Exactly one live region; announcements in words.
- **SG-49.** No skipped heading level; no two enabled controls in one section share an
  accessible name.
- **SG-50.** Entry-chunk growth printed; no `src/components/security/*` code in the entry.

---

## 17. Build estimate

| work | days |
|---|---|
| `securityView.ts` derivations + fixture + unit tests | 3 |
| `DemandStack` (two panels, brackets, glyph row, readout, narrow layout) | 3 |
| `LineLedger` (per-row ramp, residual rows, sticky scroll) | 1.5 |
| `StatePair` (two `WelfareMap` instances, classes, dot strips, panel) | 2 |
| `DelhiLine`, `CityLedger`, `GrantsToStates`, `ContractCards` | 2 |
| `KindMultiples`, `PlaceList` | 1.5 |
| `ContractsByClass` + AoN card, `SliceBesideFile` (S8 accessor included) | 2.5 |
| `VendorColumns`, `BondsTable`, `BoardRoles`, `CasesLedger` | 2.5 |
| Chrome reuse (strip, reconciliation line, rail, Find, key, control card, gaps, ladder, graph, contested, sources) | 2 |
| `TenureLanes` `asOf` prop + regression suites | 0.5 |
| `security.test.mjs` gates, smoke routes, greyscale and width screenshots | 3 |
| Accessibility pass and 390 px pass | 1.5 |
| **Total** | **≈ 25 developer-days**; S1 and S8 add ≈ 1 day each to the generator; S3 ≈ 1 day research + 0.5 assembler |

---

## 18. Open risks for review

1. **The stack's interim regex anchors** depend on the head's printed form. A transcription
   that adds a colon to a demand title would silently drop a band. Mitigated by SG-4/SG-5
   and the reconciliation glyph; removed by S1. Recommend S1 before build.
2. **% of GSDP is a substitute for per person.** It answers "how much of the economy" not
   "how much per resident", and its GSDP is a Wikipedia transcription of MoSPI (reported).
   A reviewer may prefer the spend map withheld until S3; this candidate draws it because
   the denominator is same-year and declared, and says so on the control.
3. **Family hue as vendor class** is a reading of the existing channel, not a new one; it
   holds only while class is exactly family. S5 must keep class inside the family hue.
4. **Ledger per-row shading** may be misread as cross-line comparison despite the caption;
   the twin and the caption carry it; a reviewer may prefer no shading.
5. **The slice's 316 KB file** must not reach the entry chunk; D36 relies on S8.
6. **Small multiples at 390 px** are ~170 px maps; small states (Goa, Sikkim, the UTs) are
   hard to tap; the listbox and the State select are the routes, and the readout names the
   state.
7. **Hatch-everything footprint** under-states complete lists (cantonments): a reader may
   read hatched Manipur as "unknown" when DGDE's list is complete. S10 resolves it; until
   then C8 says some lists were complete.
8. **Party texts in symmetry** (state-police, money-people) are quoted verbatim and name
   party groups; the page never draws them. A hostile reader may still call the grouping a
   frame; the ControlCard quotes both groups' figures in one paragraph, as recorded.
9. **Run drift:** the run will be reconciled. Every gate computes its expectation from the
   module; no gate pins a §0 number.
