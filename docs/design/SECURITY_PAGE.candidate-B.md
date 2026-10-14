# /security: The money India spends on force (candidate spec B, question-first)

*Status: candidate B for the `/security` design duel (plan
`docs/superpowers/plans/2026-10-04-force-finance.md` Task 5), 2026-10-04. Binding brief:
spec `docs/superpowers/specs/2026-10-04-force-finance-design.md` §0 (assumptions), §2
(what resolves at which level), §3 (the five stance rules), §4.4 (the page), and the plan's
Review Focus 1–5. House form: `FINANCE_PAGE.md` (three lenses on one route, the §0.2 facts
table, the §3 route/data/URL contract, §8 frozen channels, §13 accessibility, §14
refusals, §16 gates) and `ENERGY_PAGE.md` §6 (frozen channels) and §8 (captions, no
partisan frame in the page's own words). Skills: `interface-design`, `india-map`,
`graph-schema`, `cui-bono`.*

*Data contract: `src/graph/force.generated.ts` (`FORCE_NODES`, `FORCE_EDGES`,
`FORCE_EDGE_DOMAIN`, `FORCE_BENEFITS`, `FORCE_VOIDS`, `FORCE_NARRATIVES`,
`FORCE_BASE_RATES`, `FORCE_SYMMETRY`, `FORCE_GAPS`, `FORCE_IDENTITY`, `FORCE_BUDGETS`,
`FORCE_STRENGTH`, `FORCE_FOOTPRINT`, `FORCE_META`), types `BudgetRow`, `StrengthRow`,
`FootprintRow` from `src/graph/fleet.ts`; `research/raw/cppp/security.json` through a
typed accessor in `src/data/cppp.ts` (prerequisite S9); `TIERS` from
`src/graph/schema.ts`; `FAMILY_COLOR`, `FAMILY_LABEL`, `PRED_LABEL` from
`src/components/viz/ForceGraph.tsx`; geometry from `src/data/india-geo.json`; the merged
graph from `useData()` only to resolve labels of endpoints outside the force module
(`pol:`, `co:`, `grp:`, `wel:`, `energy:` ids).*

**No figure in this document is page copy.** Every `{brace}` the page prints is derived in
`src/data/securityView.ts` at module scope, or in a `useMemo` keyed on the parsed URL. The
counts in §0.2 are this candidate's reading of run `run-92066c7bcf73` (asOf 2026-10-04),
computed by a node script over the transpiled module, never estimated. The run will be
reconciled (ids may merge, counts may move): **the page prints module counts only**, and
every gate in §16 computes its expected value from the module independently of
`securityView.ts`.

---

## 0. How this candidate was made

### 0.1 The angle: question-first

A careful reader of a page about force money arrives with seven questions, in this order,
and leaves when one goes unanswered:

1. **How much?** — for one payer, one body, one year, one stage of the budget.
2. **Compared with what?** — the denominator (share of what total) and the comparison set
   (other years, other states, the other side).
3. **Who decided?** — which office-holder's recorded window covers the date (the date
   test, never a finding).
4. **Who was paid?** — pay levels, pensions, the contracts with people (Agnipath, OROP).
5. **Who was awarded?** — named vendors, beside the vendor they compete with; the open
   market, beside the whole tender file.
6. **What changed when?** — stages (BE → RE → actual), rules, cases, office.
7. **What is not published?** — city budgets, the strength table, prices under seal,
   approvals without vendors.

Every lens is built as an **answer sequence**: a numbered run of these questions, each
heading a block, each block answering with the fastest honest form. **A graphic appears only
where it answers faster than a sentence**: where the reader must see missing periods, a
spread across places, a shape over time, or two records side by side. Where one number with
its denominator answers, the page prints a sentence (an `AnswerLine`) and puts the table
beneath it. The page's head carries the one statement that governs every answer: **what
resolves at which level** (Union to the line, state to the Police head, city to the
footprint and Delhi).

The procurement lens is built on a different spine because its questions are about pairs:
its chapters are headed by the research's own symmetry texts ("the same lens on the other
side"), and its centre is the **case records set side by side in their declared control
pairs**, Bofors beside Rafale by construction.

### 0.2 Facts about the module that decide the design

Read from `src/graph/force.generated.ts` (run `run-92066c7bcf73`, generator 1.4.1, asOf
2026-10-04) and `research/raw/cppp/security.json` on 2026-10-04. Design evidence, not page
copy.

| # | Fact | Consequence |
|---|---|---|
| F1 | The module holds 265 nodes, 384 edges, 4,096 budget rows, 142 strength rows, 221 footprint rows, 67 voids, 89 gaps, 44 narratives, 296 base rates, 8 symmetry texts (one per domain), 13 benefit rows. `FORCE_META.killed` holds 1 claim (`footprint:c014`, killed on its own `killIf`), `excluded` 0; 107 audit verdicts; 42 contras were added by the audit; 44 ids were merged in reconciliation. | Every count is derived (D2). The killed claim is listed in the Gaps panel's "what the audit killed" block, with its reason verbatim (D41). |
| F2 | Budgets: 3,905 Union rows and 191 state rows (30 payers); 28 financial years, 1999-00 → 2026-27; stages BE 1,804, RE 1,200, actual 1,092; components total 1,332, revenue 942, capital 815, grant-to-states 467, pay 278, pension 173, other 89. | The FY axis runs 1999-00 → 2026-27 for every lens surface that draws years; a stage is a position inside a year, not a separate chart (D7). |
| F3 | Union actuals exist for 16 FYs only (2009-10 → 2024-25); none before 2009-10. Coverage differs by side: the MHA lines (the ministry, CRPF and the other forces) carry BE for 28 FYs, RE for 27 and actuals for 16; the MoD lines (the ministry, the Army, Defence Pensions) carry BE for 27 FYs from 2000-01, RE for 11 and actuals for 9, mostly in alternate years (the research read every other year's document). Per-body FY coverage runs from 3 FYs (J&K Police, a Union line from 2024-25) and 7 (NIA, Directorate of Ordnance) to 28 (twelve bodies). | **Partial is the normal state.** Every lane draws all 28 FY columns with all three stage slots; a slot with no row is hatched "no row in this register", never blank and never zero (D7, §10). |
| F4 | The hierarchy of a demand is in the `head` text only. 269 of the 3,284 Union body × component × FY × stage cells hold more than one row: a demand and its own sub-lines (Capital Outlay and its "Other Equipments" category under the same body and component; each service's "Pay and Allowances" inside its revenue line). There is no `level` or `parent` field. | **No stacked chart and no page total over budget rows.** Lanes are keyed by body, component and the line as printed, so a parent and its part are separate lanes, labelled, never added (D5, D6; prerequisite S1). |
| F5 | The published Ministry of Defence all-demand total ("Ministry of Defence — all demands (Summary of Demands for Grants, BE)") exists for 12 FYs. Adding the demand-level rows (heads with no sub-line after the demand title) reproduces it to the rupee in 7 of the 12 FYs (2002-03, 2010-11, 2017-18, 2019-20, 2021-22, 2023-24, 2025-26) and **exceeds it by ₹336–₹583 crore in 5** (2003-04, 2004-05, 2006-07, 2007-08, 2012-13). | A page-computed defence total would be wrong in 5 of 12 checkable years. The page prints the published total where it exists, and otherwise the words "no published all-demand total in this register for {fy}" (D5). The reconciliation status is a twin column, "computed here" (D6). |
| F6 | 135 distinct (body, component, line) lanes among non-grant Union rows. Demand numbers shift: Delhi Police sits under nine demand numbers (43, 47, 48, 50–55) across the years. Before 2016-17 each service has its own revenue demand; from 2016-17 one "Defence Services (Revenue)" demand carries them as sub-lines. | Lane key strips only the `Demand N — ` prefix and the edition suffix; a renamed line becomes a second lane directly under the first, labelled "renamed or restructured in the document; the page does not join lines" (D8). |
| F7 | Grants to states: 467 rows. 328 ASUMP rows (FY2020-21 → 2024-25, Allocation as BE and Released as actual) name one of 36 recipients **in the `head` text only**; 68 of them print ₹0 as published. The recipient names do not match the map's names: "Ladakh" has no polygon or `StateCode`; "Dadra & Nagar Haveli and Daman & Diu" is one recipient against two map codes (`dn`, `dd`); "&" against "and"; "Jammu & Kashmir (UT)". | No grants map and no `st` filter over grants until a `recipient` field exists (S2). Interim: a grants table with the head verbatim. ₹0 prints "₹0 crore, as published" and is a number, never a hatch (D11, E6). |
| F8 | State money: 120 RBI "Police (MH 2055)" revenue rows for 30 payers (28 states, J&K, Puducherry) × four stage-years (2023-24 actual, 2024-25 BE and RE, 2025-26 BE); Uttar Pradesh's own Grant 26 series, 70 rows over 16 FYs 2008-09 → 2026-27 (revenue, capital, district police, salary); six PRS "District Police" lines for 2026-27 (br, ka, mh, tn, up, wb) — the only six budget rows whose `note` begins `reported:`. No state row for an, ch, dn, dd, dl, ld (Delhi's police is the Union line; the GNCTD residual head is a void). | The state table has 36 rows; six are hatched with their reason. The District Police line is a different head from MH 2055 and is never drawn in the MH 2055 column (D12). Review Focus 1: those six rows carry `reported` in every caption that shows them. |
| F9 | The module carries **no population, GSDP or state revenue-expenditure series**. Per-capita police spend appears only inside base-rate labels and symmetry prose. The one per-resident measure in a structured field is `StrengthRow.perLakh` (police per lakh population, as the source table prints it). | The per-capita choropleth the brief asks for is **withheld with a void card in its frame** until S5; the map that draws today is per-lakh strength, which carries its own denominator (D13). |
| F10 | Strength: 93 state rows (30 state police bodies and Delhi Police), tables as on 1 January 2020, 2023 and 2024 (Delhi: 2017, 2022, 2024); 49 national rows (CAPFs) 2012–2025. 135 of 142 notes begin `reported:` (BPR&D unreachable); 90 notes state that the absolute counts are **derived** (per-lakh × a population) and are not printed counts; `perLakh` is set on 90 of 93 state rows. No commissionerate has a strength row. No strength row for an, ch, dn, dd, ld. | The map fills from `perLakh` only. Absolute counts appear only in the twin, under the heading "as the research file records them — read the note", with the note verbatim (D14; S4). |
| F11 | Footprint: 221 rows; cantonment 61, drdo-lab 42, dpsu-plant 31, training 29, other 25, commissionerate 18, forensic-lab 7, command-hq 6, capf-hq 2; **prison 0 and ordnance 0** (declared kinds with no row). 25 of 36 states, 120 cities. `since` is null on 217 of 221. No row carries a coordinate. No row in an, ar, dn, dd, ld, mn, mz, nl, py, sk, tr. | Marks are positioned within their state, not geocoded, and the caption says so (`india-map`). The kind legend names prison and ordnance as "none in this register". The FY filter does not reach the footprint (D17). |
| F12 | Commissionerates: 18 rows (Maharashtra 10, Uttar Pradesh 7, Assam 1); none has a budget line or a strength row. Delhi Police: 177 Union budget rows across all 28 FYs; 3 strength rows (sanctioned, as printed in MHA Annual Reports). | Review Focus 2: every commissionerate prints exactly `inside the state's police head` in its budget cell, everywhere (D15). Delhi is the one city line. |
| F13 | J&K Police is in the register twice: as an RBI state payer (`jk`, 4 rows) and as a Union demand line (`force:jk-police`, 6 rows from 2024-25). | Two payers, two rows, never added; each surface names the payer (E8). |
| F14 | Awards: 52 `award` edges; 51 from the Ministry of Defence into 26 vendors (13 in family `state`, 13 in family `capital`); 39 carry ₹; 48 dated 2014 or later. `ty` does not separate DPSUs from private firms (HAL, BEL, GRSE, Mazagon Dock are `company`; Goa Shipyard is `psu`), and foreign from Indian private firms is not a field (TASL and PLR Systems have `st` null, like Dassault). | Vendors are grouped by **family**, the one structured class (public power / private capital), with a gap line that vendor class (DPSU / private Indian / foreign / JV) is not a field (S6). No DAC-by-class chart (D19). |
| F15 | Five `analytic` edges set a vendor beside a comparator (Adani Defence ~ L&T; Adani Defence ~ Tata Advanced Systems; L&T ~ BEL; Economic Explosives ~ Munitions India; Bharat Forge ~ the retired-officers class). Adani Defence has no award edge; it enters through these pairs and its recorded 51% holding in PLR Systems. | The vendor set is award recipients plus their declared comparators (D20). A vendor card always opens with its declared comparator, or the other family's group when none is declared (Review Focus 3, D21). |
| F16 | DAC approvals: one edge mentions the Defence Acquisition Council; a `procurement-industry` void records that Acceptance-of-Necessity approvals name no vendor and no value per item. | "DAC approvals by category and vendor class" is not drawable; the page says so in the procurement lens's "not published" block (D19). |
| F17 | Cases: seven nodes with the prefix `force:case-` (Adarsh, AgustaWestland, Bofors, Pegasus, Rafale, Sukna, Tatra). Control pairs are `analytic` edges between two case nodes: Bofors ~ Rafale (two edges, from two files), AgustaWestland ~ Tatra (two), Sukna ~ Pegasus (one). **Adarsh has no pair**, and sits under two ids not joined (`force:case-adarsh`, `force:adarsh-society`). | The case pairs are read from edges, never hand-listed (D23). Adarsh renders with an equal-width "no control pairing recorded" column (D24). |
| F18 | Case files (edges touching the case node, plus edges touching a party joined to it by `direct`, `award` or `sector`): Bofors 10 records, Pegasus 6, Rafale 5, Adarsh 3, AgustaWestland 3, Sukna 2, Tatra 1. A decision record (an award) is joined to a case for Bofors only; no Defence Minister window covers 1986 (the role windows begin 1998-03-19). | The "decision" and "office on the decision date" fields print "not joined to this case in the register" for six of seven, and "no recorded office window covers {date}" for Bofors (S8). The symmetry texts that compare the decisions are quoted verbatim above each pair. |
| F19 | Responses: 40 `enforce` edges, 13 with a recorded response; 7 `alleged` non-contra claims, all 7 answered; all 59 `contra` edges target a `claim:` id; 42 are audit-added (`…:audit-contra`, `lab` "denial found in audit", responder `s` is the subject or case node itself). | Every enforce and alleged row has a response slot at equal width; an empty one prints the exact sentence. An audit-added response names its responder as "the audit (recorded on {subject})" (E31). |
| F20 | Roles: 38 `role` edges = 24 distinct windows (the same minister recorded in up to three files); 4 windows open-ended (incumbents). Two retired-officer board pairs (a DG DRDO; an Air Chief). Three `law` edges from `money-people` into class nodes are the post-retirement rules; the armed-forces rule's number and date of change are a void. | Office lanes group by (person, office, from, to), each record still listed with its tier (E20). Board roles print the months between office end and board start, "computed here", beside the rule text and its void (D27). |
| F21 | Bonds: 11 `bond` edges from 3 donors to 9 parties; a void records that no bond donor in the disclosure is named for most security vendors (L&T, Tata, Bharat Forge, Adani, others). | Bonds are a donor × party table with every party the donor bought for, and the void at the same size beside it. No bond chart (D26). |
| F22 | Narratives: 44 — contested 26, well-supported 8, speculative 5, unsupported 5; the established and debunked rungs are empty. | Six rungs always drawn; empty rungs read `none in this file` (§5.4.2). |
| F23 | `ty` → `fam` is not one-to-one: `company`, `group`, `agency` and `person` each carry more than one family. | The ReadingKey and Gaps panel carry the inconsistent-hue sentence (finance U24); no hue is changed. |
| F24 | Base rates: 296 rows, numerator and denominator numeric (for example the four MoD demands over GDP at current prices, one row per FY), but **the FY and the kind of ratio are only in the `property` text**. | Base rates render as cards grouped by domain, verbatim (house pattern), beside each answer; no chart is built from them until S3 adds `fy` and `kind` (D9). |
| F25 | `security.json`: 8 buyer classes; 411,943 award decisions after dedup, 365,600 in the rate denominator; the works class (MES and BRO) is 74.41% of decisions; class single-bidder rates 0.42% → 37.83%, each beside the whole file (11.22%) and the whole file on the same portal (17.67% central; 7.59% state); every stored link expired, so every figure is dataset-only. `src/data/cppp.ts` globs the file but has no typed accessor. | The open-market block draws rates by class only, never one slice-wide rate as a finding; `readMeFirst` and `caveat` print verbatim above it (D29; S9). |
| F26 | 76 of 384 edges are undated. | Undated records are named and counted under every date control and shown "under all years only" (§6). |

### 0.3 Prerequisites (the page works without each and gets better with it)

Each is a reviewed change to `research/raw/force/*`, `RECONCILIATION.json`,
`scripts/assemble-fleet.mjs` or `src/data/cppp.ts`, with its type in `src/graph/fleet.ts`,
re-checked by `scripts/validate.mjs`. Absence is detected by a `null` shim in
`src/data/security.ts`. Gates marked (S) in §16 assert the interim and the upgrade.

| id | field / export | built from | interim (today) | upgrade |
|---|---|---|---|---|
| **S1** | `BudgetRow.level: 'demand' \| 'line' \| 'object'`, `line: string` (a stable key across years and demand renumbering), `parent: string \| null` | the demand documents the rows were transcribed from (the hierarchy is already in `head`) | lanes keyed by body + component + line-as-printed; demand-level rows found by the anchored rule (§3.2 `isDemandLevel`); renamed lines are separate lanes | lanes join across renumbering; sub-lines nest under their parent as "of which" rows; a stack is drawn only for parts whose parent is published (D5) |
| **S2** | `BudgetRow.recipient: StateCode \| 'la' \| null` on `grant-to-states` rows | the Lok Sabha answer already transcribed | grants table, head verbatim, no map, `st` inactive on grants | a grants-by-state table filterable by `st`, and a map panel (Ladakh noted as "no polygon on this map") |
| **S3** | `BaseRateRow.fy`, `BaseRateRow.kind` (`share-of-gdp`, `share-of-union-expenditure`, `share-of-total`, `per-capita`, `rate`) | the research files (the FY and the ratio are in `property` today) | base rates as verbatim cards beside each answer | a "share of GDP / of Union spending" lane aligned to the ledger's FY columns |
| **S4** | `tier: 'documented' \| 'reported'` on budget, strength and footprint rows; `StrengthRow.derived: ('sanctioned' \| 'actual' \| 'womenPct')[]` | the `reported:` prefix and the "DERIVED" sentence the files already write | tier from the anchored `reported:` prefix (gate SG-RF1); derived counts only in the twin with the note | derived cells marked in the twin and readout ("derived by the research, not printed") |
| **S5** | `FORCE_DENOMINATORS: {kind: 'population' \| 'gsdp' \| 'state-revenue-expenditure' \| 'gdp' \| 'union-expenditure', st: StateCode \| null, fy: string \| null, year: number \| null, value, unit, srcs}[]` | the population projection and GDP series the research already used (cited in notes and base rates) | the per-capita map is a void card in its frame; state ₹ print "per resident: not computed — no population series in this register" | the per-capita map beside the per-lakh map; ₹ per resident in the state table, "computed here" |
| **S6** | `FORCE_VENDOR_CLASS: Record<id, 'dpsu' \| 'cpse' \| 'private-indian' \| 'foreign' \| 'jv'>` declared by the procurement file | the vendor identities already written | vendors grouped by family | class column and class grouping; the class split of named awards by year as a table (never a page-computed share chart) |
| **S7** | `FORCE_OUTCOMES: {st, year, kind: 'custodial-death-nhrc' \| 'custodial-death-ncrb' \| 'police-firing' \| …, count, denominatorKind, denominator, party, srcs}[]` with `party` as text | the NHRC and NCRB tables the state-police file read | outcome base rates and the state-police symmetry text, verbatim; no per-state outcome surface | an outcomes table (36 rows × years, hatch for no row, rate as a of b, party as a text column, never a colour or filter) |
| **S8** | `caseId` on claims (or `FORCE_CASES: {id, members: claimId[], parties: nodeId[]}[]`) | the money-people and literature files | case file by the touch rule (§3.2 `caseFile`); decision fields read "not joined to this case in the register" | complete case files; decision date and office on that date for every case |
| **S9** | `loadSecurity(): Promise<SecurityFile \| null>` in `src/data/cppp.ts`, typed | `research/raw/cppp/security.json` (already in the glob) | — (required before the open-market block renders; without it the block prints its absence sentence) | — |
| **S10** | `replaces: claimId \| null` on `law` edges in `pay-pensions` | the pay-pensions file | the Agnipath card says the record does not join it to the terms it replaced, and links to the pay-levels table | old and new terms side by side with identical fields |
| **G5** | split `force.generated.ts` into a graph part and a page part (finance G5) | the generator | page-only exports ride in the entry chunk; SG-50 prints the growth | entry chunk carries only nodes and edges |

The smallest first step is S9 (a typed accessor, no research). S1 and S4 change the most
surfaces for the least research: the files already hold both facts in text.

---

## 1. Purpose and readers

### 1.1 Purpose

`/security` records what India's governments spend on force: the Union's defence demands
and its own police, intelligence and investigation lines; each state's police head; the one
city police budget that is published (Delhi); where the installations of force are; who was
paid and on what terms; who was awarded and beside whom; and what courts and auditors
recorded in the cases that are argued about. It shows each figure beside its denominator and
its comparison set and takes no view on whether any figure is right (spec §3 rule 1). Its
claim about itself is narrow: *this is what the published record resolves to, at each
level, and what it does not.*

### 1.2 The three readers

| Reader | Arrives with | Must leave with | Distrusts the page when |
|---|---|---|---|
| **J**, journalist on deadline | a name or a year: "CRPF budget 2024-25", "Mumbai police", "Rafale", "Adani defence" | one figure with stage, year, denominator, comparison and source, or one record with its counter; a pasteable citation | a city gets a number; a vendor appears alone; a case has no answer slot |
| **P**, policy researcher | a series question: "defence pensions since 2000", "police per lakh by state" | a TSV that reproduces the graphic, with the population, the stage, the exclusions and the run id | a total adds a demand to its own sub-line; a missing year is drawn as a gap in a line or as zero; a derived count is passed off as printed |
| **S**, hostile skeptic, from either side | a suspicion: "you only show one government's scandals", "you hide that X got contracts" | the control in the same frame: the other government's case, the other vendor, the other states, the boring explanation | Bofors is on a different screen from Rafale; a party is a colour; a rate has no family |

---

## 2. The reader's questions and the two-minute paths

### 2.1 Questions, per lens, in the order the page answers them

Answered at rest at 1280×800 unless a step is named. The question numbers are the visible
block numbers on the page (`h3` prefix "Q1", "Q2" …), so a reader can say "Q4 on Budgets".

| # | Lens | Question (the block heading, verbatim) | Answered by | Form |
|---|---|---|---|---|
| B-Q1 | Budgets | How much, this year? | `AnswerLines` (§5.1.1) | sentences |
| B-Q2 | Budgets | How has each line moved, and which years are missing? | `LineLedger` (§5.1.2) | graphic (periods as columns) |
| B-Q3 | Budgets | Compared with what? | `CompareBlock` (§5.1.3) | base-rate cards + symmetry text |
| B-Q4 | Budgets | Who held office when each year was budgeted? | `OfficeLanes` (§5.1.4) | graphic (aligned to Q2's axis) |
| B-Q5 | Budgets | Who is paid, and on what terms? | `PayTerms` + `ContractCards` (§5.1.5) | table + paired cards |
| B-Q6 | Budgets | What do the states spend on police, and how many police per lakh? | `StatePolice` (§5.1.6) | graphic (map, per lakh) + 36-row table |
| B-Q7 | Budgets | Which city has a police budget? | `CityLine` (§5.1.7) | sentence + table |
| B-Q8 | Budgets | What does the Union give the states for police? | `GrantsTable` (§5.1.8) | table |
| B-Q9 | Budgets | What is not published? | `CannotShow` (§5.4.3) | list at findings size |
| F-Q1 | Footprint | Where is it? | `FootprintMap` (§5.2.1) | graphic (map) |
| F-Q2 | Footprint | Of what kind, in which city? | `KindMatrix` + `PlaceList` (§5.2.2) | table |
| F-Q3 | Footprint | Which cities have police money? | `CityPoliceTable` (§5.2.3) | table |
| F-Q4 | Footprint | Compared with what? | `CompareBlock` (footprint) (§5.2.4) | cards + symmetry text |
| F-Q5 | Footprint | What is not published? | `CannotShow` | list |
| P-Q0 | Procurement | The same lens on the other side | `SymmetryContents` (§5.3.0) | contents of the five chapters |
| P-Q1 | Procurement | Who was awarded, and beside whom? | symmetry text → `AwardLanes` → `VendorGrid` (§5.3.1) | graphic + identical cards |
| P-Q2 | Procurement | Who bought on the open market, and how many bid? | `SliceRates` (§5.3.2) | graphic (rates by class beside the whole file) |
| P-Q3 | Procurement | Who sits on both sides of the money? | symmetry text → `BondTable`, `BoardRoles` (§5.3.3) | tables |
| P-Q4 | Procurement | What did courts and auditors record? | symmetry text → `CaseTimeline` → `CasePairs` (§5.3.4) | graphic + paired records |
| P-Q5 | Procurement | Which stories hold up? | `NarrativeLadder` (§5.4.2) | ladder |
| P-Q6 | Procurement | What is not published? | `CannotShow` | list |
| all | — | Who is connected to whom? | `ConnectionGraph` (§5.5.1) | force graph |

### 2.2 The two-minute paths

Interaction counts from a cold load of `/security`. Gates SG-40–43 script them at 1280×800
and 390×844.

| # | Reader, question | Path | Steps |
|---|---|---|---|
| B-J | J: "What did CRPF get in 2024-25, against what?" | type `CRPF` in Find → "Show its budget lines" (writes `body`, scrolls to the ledger, the CRPF lanes accented) → open the 2024-25 cell → `CellCard`: BE, RE, actual each with source; the denominator line (its share of the published Police demand whole, a of b, "computed here"); the comparison line (2023-24 at the same stage); Copy citation | 3 |
| B-P | P: "Defence pensions BE since 2000, as a table" | Table view → the `LineLedger` twin is open, filtered by `comp=pension` (rail: Component → Pension) → Download .tsv | 3 |
| B-S | S: "You make the defence budget look bigger by adding things twice" | at rest: Q1 prints the **published** all-demand total, or the words "no published all-demand total"; the Reconciliation line says "no ₹ total is computed across rows on this page"; Q2's caption C2 says parents and parts are separate lanes, never added | 0 |
| F-J | J: "What is Mumbai's police budget?" | type `Mumbai` in Find → the Mumbai Police Commissionerate row → its budget cell reads `inside the state's police head` with a link to Maharashtra's MH 2055 row in B-Q6, and its strength cell reads the void | 2 |
| F-S | S: "You put installations where the ruling party is" | tab Footprint → F-Q4 at rest: the footprint symmetry text verbatim, with the per-million comparison the research ran on both groups of states | 1 |
| P-J | J: "Did Adani get defence contracts?" | type `Adani` → "Show vendor" (writes `vendor`, Procurement lens) → `VendorCard` for Adani Defence **beside** L&T and Tata Advanced Systems (its declared comparators), identical fields; the `rated in Q5` link reaches the ladder, where the vendor narrative sits with its rating | 2 |
| P-S | S: "You only show the BJP's scandal" / "You only show Congress's scandal" | tab Procurement → P-Q4 at rest (one scroll): Bofors and Rafale in one row, two equal columns, identical field rows, each with its court record and counter; the literature symmetry text above them | 1–2 |
| P-P | P: "Single-bidder rate for CAPF buyers on CPPP against the whole file" | tab Procurement → P-Q2: the CAPF row with its Wilson interval beside both whole-file marks → Download .tsv | 2 |
| any | J or S: "Who is connected to {vendor / case / body}?" | the name → Show connections → the graph opens on the node, one hop | 1 |

---

## 3. Route, data, URL contract

### 3.1 Route

- Lazy route `/security` (exists as a scaffold, commit `0073a0f`); nav "Security spend"
  under Registers. `scripts/smoke.mjs` keeps its three URLs and gains
  `/security?lens=budgets&fy=2024-25`, `/security?lens=budgets&st=mh`,
  `/security?lens=footprint&kind=commissionerate`, `/security?lens=procurement&vendor=force:adani-defence`,
  `/security?lens=procurement&case=force:case-bofors`, `/security?view=table`.
- Outer `<article className="pb-20">`, no inner `max-w`. Prose caps at `max-w-[72ch]`.
  The ledger, maps, tables and case pairs take the layout width and scroll horizontally
  **inside their own container** only.
- `Suspense` fallback: PageTitle and Standfirst text.

### 3.2 Data (static, compiled in)

The page imports only from `src/data/security.ts` (re-exports of the force module's
fourteen names, the prerequisite shims, each `null` when absent, and `loadSecurity` from
`src/data/cppp.ts`), `src/data/securityView.ts` (every derivation, pure, at module scope or
memoised on parsed filters) and `useData()` for labels outside the module. **No literal
figure appears in `src/pages/Security.tsx` or `src/components/security/*`** (SG-3).

**Anchors** (the only literals the derivations hold; checked at module load; a missing one
fails SG-1):

```ts
export const MOD = 'min:ministry-of-defence';
export const MHA = 'min:ministry-of-home-affairs';
export const DELHI_POLICE = 'force:delhi-police';
export const MOD_ALL_DEMANDS = 'Ministry of Defence — all demands (Summary of Demands for Grants, BE)'; // a head value
export const WHOLE_DEMAND = '(whole demand)';           // substring of a head value
export const DEMAND_PREFIX = /^Demand \d+ — /;          // the document's numbering, stripped for lane keys
export const EDITION_SUFFIX = / \(Summary of Demands for Grants, BE\)$/;
export const REPORTED_PREFIX = 'reported:';             // budget/strength/footprint `note` (interim tier, S4)
export const CASE_PREFIX = 'force:case-';
export const MONEY_PEOPLE = 'money-people';             // FORCE_EDGE_DOMAIN values
export const PAY_PENSIONS = 'pay-pensions';
export const CITY_POLICE_TEXT = "inside the state's police head"; // Review Focus 2 — the only text a non-Delhi city budget cell may hold
```

**Named derivations in `securityView.ts`** (each unit-tested in
`scripts/security-view.test.mjs` against a fixture; each returns rows *and* the
denominator sentence that goes with them):

| export | reads | definition |
|---|---|---|
| `nodeOf(id)` | `FORCE_NODES`, then `useData().nodes` | first hit; unresolved → `{id} (not in the register)` in amber mono |
| `rowTier(r)` | `r.note` | `reported` when `note` starts with `REPORTED_PREFIX`, else `documented`; with S4, `r.tier` |
| `fyIndex`, `FY_AXIS` | `FORCE_BUDGETS` | every FY label from min to max **including FYs with no row**; ordered by start year |
| `UNION_ROWS`, `STATE_ROWS` | `FORCE_BUDGETS` | `payer === 'union'` / not |
| `laneKey(r)` | `r.body`, `r.component`, `r.head` | `${body}|${component}|${head minus DEMAND_PREFIX minus EDITION_SUFFIX}`; with S1, `${body}|${line}` |
| `LANES` | `UNION_ROWS` minus `grant-to-states`, `laneKey` | one lane per key: `{key, body, component, line, rows, fyFirst, fyLast, cells: Map<fy, {BE?, RE?, actual?}>}`; a cell slot holding two rows (two editions) keeps both and draws both ticks (E3) |
| `laneGroups` | `LANES`, `nodeOf(body)`, `PUBLISHED_TOTALS` | three blocks in fixed order: **Published totals** (the lanes of `PUBLISHED_TOTALS`); **Bodies** — one group per `body`, groups alphabetical by node label, lanes inside ordered by component (`total`, `revenue`, `capital`, `pay`, `pension`, `other`), then line, then `fyFirst` (so a renamed line sits directly under its predecessor); **The one city line** — Delhi Police's lanes. Each lane label carries its demand title as printed. **No order by ₹, ever** |
| `isDemandLevel(r)` | `r.head` | `DEMAND_PREFIX` matches and no `:` follows the demand title; interim only (S1) |
| `PUBLISHED_TOTALS` | `UNION_ROWS` | rows whose `head === MOD_ALL_DEMANDS`, and MHA rows whose `head` contains `WHOLE_DEMAND` and `component === 'total'`; keyed by `{payerSide, fy, stage}` |
| `reconcileStatus(fy, stage)` | `PUBLISHED_TOTALS`, demand-level MoD-side rows | `equal` (parts sum within ₹1 crore of the published total) · `differs by ₹{d} crore` · `no published total` · `no demand-level rows`. **Twin column only, labelled "computed here"; never a drawn total** |
| `answerFor(side, f)` | `PUBLISHED_TOTALS`, `rowTier`, filters | the latest FY in the filter range with a published total at the chosen stage (default stage order BE → RE → actual as printed, stated); returns `{fy, stage, cr, src, prev}` or the no-total sentence |
| `crContext(row)` | `PUBLISHED_TOTALS`, `UNION_ROWS`, `STATE_ROWS` | the **denominator**: the row's published parent, same FY and stage — for a line inside a demand, the demand-level row (or the `WHOLE_DEMAND` row, same component where the whole demand prints components, else `total`) with the same demand number and title; for a demand-level MoD-side row, the `MOD_ALL_DEMANDS` row — printed `₹{a} of ₹{b} crore, {k}% of the published {title}, computed here`; no parent → `no published total for this line's demand in FY{fy}`; a state row → `no population or state-expenditure series in this register (S5)`. The **comparison**: the same lane's previous FY at the same stage, `FY{fy−1} {stage}: ₹{x} crore`, or `no {stage} row for FY{fy−1}`. Every ₹ the page prints goes through this (D3). With S1, `parent` replaces the title match |
| `STATE_TABLE` | `STATE_ROWS`, `FORCE_STRENGTH`, the 36 `StateCode`s | 36 rows: `{st, mh2055: Map<fy·stage, row>, own: row[], prs: row[], strength: Map<year, row>}`; empty parts carry their null words |
| `strengthYears`, `latestStrengthYear` | `FORCE_STRENGTH` with `st` | distinct `year`s; the default `sy` |
| `perLakhBins` | every state `perLakh`, all years, no filters | quantile bins **pooled over every year**, fixed (finance D10) |
| `FOOTPRINT_KINDS` | `FootprintKind` union (all eleven, from the type list exported by `fleet.ts`) | declared kinds; a kind with no row is listed as `none in this register` |
| `fpByState`, `fpByCity` | `FORCE_FOOTPRINT` | counts per state × kind; cities per state with rows |
| `COMMISSIONERATES` | `FORCE_FOOTPRINT` `kind === 'commissionerate'` | each with `budgetCell = CITY_POLICE_TEXT`, `strengthCell` from `FORCE_STRENGTH` where `body` matches, else the void words |
| `GRANT_ROWS` | `UNION_ROWS` `component === 'grant-to-states'` | head verbatim; with S2, `recipient` |
| `ROLE_WINDOWS`, `officeOn(date, bodyIds)` | `role` edges | grouped by `(s, t, from, to)`, each record kept; the finance `officeOnDate` three-block rule (covers / start recorded, end not / same day) |
| `PAY_LAWS`, `CONTRACTS` | `law` edges with `FORCE_EDGE_DOMAIN === PAY_PENSIONS` | pay levels: law edges whose target node has `ty: 'group'` and whose source is a pay commission node; contracts: the rest of the pay-pensions `law` edges, each with its `responseChain` |
| `responseChain(id)` | `contra` edges | responses to `claim:{id}`, then responses to each of those, depth ≤ 3, each with its responder and tier |
| `AWARDS` | `award` edges with `s === MOD` | the vendor ledger's records |
| `VENDORS` | `AWARDS` targets, plus the other endpoint of every `analytic` edge with one endpoint in that set and the other a node with `ty ∈ {company, psu}` | the vendor set (F15) |
| `comparatorsOf(v)` | `analytic` edges joining `v` to another member of `VENDORS` | declared comparators; empty → `{familyGroup: the other family's VENDORS}` |
| `vendorFields(v)` | `AWARDS`, `own`, `bond`, `role`, `enforce`, `FORCE_IDENTITY` | the identical-field record of §5.3.1, every field with its null words |
| `BONDS` | `bond` edges | grouped by donor `s`, every party per donor, by date |
| `BOARD_PAIRS` | `role` edges | persons with one role into a node of `ty ∈ {ministry, agency}` (public office) and one into `ty ∈ {company, psu}`; `gapMonths` = board `from` − office `to`, **computed here**, only when both dates exist |
| `POST_RETIREMENT_RULES` | `law` edges, domain `MONEY_PEOPLE`, target `ty: 'group'` | the cooling-off rules, verbatim |
| `CASES` | nodes with `id` starting `CASE_PREFIX` | the seven case nodes |
| `CASE_PAIRS` | `analytic` edges with both endpoints in `CASES` | deduplicated by unordered pair; each pair keeps its edge ids and files |
| `caseFile(c)` | edges | edges touching `c`, plus edges touching a **party** of `c` (a node joined to `c` by `direct`, `award` or `sector`), minus `contra` and minus the pair edges; each with `responseChain` (S8 replaces the rule) |
| `caseFields(c)` | `caseFile`, `nodeOf(s).ty`, `ROLE_WINDOWS` | the identical field rows of §5.3.4: decision · office on the decision date · allegation · investigation · court · audit · latest record · counter-record; each block's rows classified by the **source node's `ty` and `fam`** (court and tribunal nodes `fam: 'enforce'`; the auditor; the investigators), never by text |
| `SLICE` | `loadSecurity()` | `headline`, `rates.byClass`, `rates.total`, `rates.excludingWorks`, `quality`, `readMeFirst`, `caveat`, `provenance`; `null` → absence sentence |
| `derivedGaps(f)` | all | §5.5.3 |
| `tsv(rows, header, meta)` | — | finance `tsv()` (house): `#` header with table name and population, filters, `runId`, `asOf`, `# amounts: ₹ crore as published, nominal; not deflated` wherever ₹ appear |
| `sourceClass(src)` | `srcs` | finance `sourceClass` (parliament / primary / secondary) |

### 3.3 Prerequisites

§0.3.

### 3.4 URL parameters

All through `useSearchParams` with `{replace: true}` and the house `setParam`. **Absent =
default = unfiltered, nothing selected.** An unknown value falls back to the default and
one amber line under the strip reads `ignored an unrecognised {param} value`.

| param | values | default | written by | reach |
|---|---|---|---|---|
| `lens` | `budgets` \| `footprint` \| `procurement` | `budgets` (never written) | tabs | which lens is mounted; strip facts |
| `payer` | `union` \| `state` | both | rail | **budgets**: Union rows / state rows. **footprint**: inactive, "installations have no payer; the body column names who runs each". **procurement**: inactive, "every award and case here is a Union record" |
| `st` | a `StateCode` | none | rail select; map; Find | **budgets**: state rows of `st`; opens `StatePanel`; Union lanes unaffected except `dl` (accents the Delhi Police lane) and `jk` (accents the J&K Police Union lane); grants inactive without S2, with its reason. **footprint**: marks in `st`, `PlaceList` filtered, `StatePanel`. **procurement**: inactive, "a vendor's registered office is not where its work is" |
| `fy` | `YYYY-YY` \| `YYYY-YY..YYYY-YY` | all FYs | rail From/To | **budgets**: ledger columns, `AnswerLines`, office lanes, state table columns; strength tables count as in FY `Y−1`–`Y` when dated 1 January `Y` (stated on the control). **footprint**: inactive, `{undated} of {n} installations carry no date`. **procurement**: awards and case records by `from`; undated records "shown under all years only"; `SliceRates` not reached ("the slice's rates are over all years") |
| `comp` | comma list of `BudgetComponent` | all seven | rail checkboxes | budgets only; elsewhere inactive with the reason |
| `tier` | comma list of the four tiers, or `none` | all | rail toggles | **shared with `GraphExplorer`**; series rows are `documented` or `reported` (`rowTier`); a response is re-admitted whenever its claim is shown (finance D35) |
| `stage` | `BE` \| `RE` \| `actual` | none (all three drawn, each in its own slot) | ledger control (narrow widths only) | below 640 px the ledger draws one stage at a time; absent there = `BE`, and the control says why ("BE is the only stage with a row in every year") |
| `body` | a node id in `LANES` bodies | none | ledger body label; Find | accent on the body's lanes + `BodyCard`; **never filters** |
| `cell` | `{laneKey slug}@{fy}` | none | a ledger cell | `CellCard` (margin) |
| `sy` | a strength year | `latestStrengthYear` | map year control | which strength table the per-lakh map draws; all years stay in the twin |
| `kind` | comma list of `FootprintKind` | all | footprint chips | marks and `PlaceList`; counts `{N} → {k}` |
| `vendor` | a node id in `VENDORS` | none | vendor label; Find | accent + `VendorCard` opened **with its comparators**; **never filters** (Review Focus 3) |
| `case` | a case node id | none | case heading; Find | scrolls to the case's pair row and accents it; **never filters**; the pair is always drawn whole |
| `rec` | an edge id | none | Open record | `RecordCard` (finance) |
| `sel` | a node id | none | Show connections; the graph | `GraphExplorer`'s selection, shared |
| `find` | text | empty | `Find` | the results list only |
| `view` | `stage` \| `table` | `stage` | Table view | every twin open, graphics hidden |
| `tp` | integer ≥ 1 | 1 | pagination | 400 rows per page |

**`GraphExplorer` owns** `q`, `fam`, `pred`, `ty`, `amt`, `from`, `to`, `focus`, `hops`,
`path`; the page writes them only through "Show connections" and never reads them. Switching
lens keeps `fy`, `st`, `tier`, `find`, `sel`; clears `rec`, `cell`; keeps `body`, `vendor`,
`case`, `kind` inactive with a reason. **No param pre-selects a party, a company, a person or
a case; there is no `party` param.**

### 3.5 Live region and unavailable options

Exactly one `aria-live="polite"` region, debounced (150 ms for map and filters, 300 ms for
Find). It carries every filter effect in words (`from {N} to {k} {unit}`), lens changes,
panel open and close, `Link copied`, `Citation copied`, `{table} copied, {rows} rows`,
`shown as tables` / `shown as stage`, `{k} matches for {find}`. Wherever `{N} → {k}` is
drawn the arrow is `aria-hidden` and a visually hidden `from {N} to {k}` carries the words.
Unavailable options are `aria-disabled="true"`, focusable, with the reason inside the
accessible name (`State, unavailable on this lens: a vendor's registered office is not where
its work is`).

---

## 4. Page anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline · standing line ─────────────────────────────── ┐
├ RESOLUTION STATEMENT (three rows: Union · State · City — words + derived counts) ≤ 132px ─┤
├ DenominatorStrip (sticky; facts per lens) + ReconciliationLine + active-filter line ──────┤
├ LensTabs [ Budgets | Footprint | Procurement and people ]   Find ⌕ · Copy link · Table view┤
├────────────────────────────────────────────────────────────┬────────────────────────────┤
│ FILTER RAIL (row, wraps): Payer · State · FY from–to ·     │ MARGIN 22rem (xl sticky)    │
│   Component · Tier · Reset   — each with {N} → {k}         │  rest: ReadingKey           │
├────────────────────────────────────────────────────────────┤        ControlCard          │
│ ANSWER SEQUENCE (the lens centre, numbered Q-blocks)       │        CannotShowCard       │
│  Budgets:     Q1 AnswerLines → Q2 LineLedger ═╗            │  cell:   CellCard           │
│               Q4 OfficeLanes (same x-axis) ═══╝ → Q3       │  body:   BodyCard           │
│               CompareBlock → Q5 PayTerms + ContractCards → │  st:     StatePanel         │
│               Q6 StatePolice (map + table) → Q7 CityLine → │  vendor: VendorCard (+ its  │
│               Q8 GrantsTable                               │          comparators)       │
│  Footprint:   Q1 FootprintMap → Q2 KindMatrix + PlaceList →│  rec:    RecordCard         │
│               Q3 CityPoliceTable → Q4 CompareBlock         │                             │
│  Procurement: Q0 SymmetryContents →                        │                             │
│     ch.1 [symmetry: procurement-industry] Q1 AwardLanes →  │                             │
│          VendorGrid                                        │                             │
│     ch.2 [readMeFirst + caveat] Q2 SliceRates              │                             │
│     ch.3 [symmetry: money-people] Q3 BondTable · BoardRoles│                             │
│     ch.4 [symmetry: literature] Q4 CaseTimeline →          │                             │
│          CasePairs (the spine: pairs in equal columns)     │                             │
│     Q5 Narratives (ladder)                                 │                             │
├────────────────────────────────────────────────────────────┴────────────────────────────┤
│ Each block: h3 "Q{n} — {question}" · AnswerLine or graphic · caption (body size) · twin   │
├ LAST BLOCK OF EVERY LENS: "Q{n} — What is not published?" (CannotShow, findings size)    ┤
├ SHARED: Connection graph · Contested · Gaps · Refusals · Source ledger · TierLegend ·      ┤
│         Standing note                                                                     │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Stage grid:** `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6`. Below `xl` a margin
  panel renders directly under the component that opened it; at rest, `ControlCard` renders
  after the lens's last answer block and before `CannotShow`, and `ReadingKey`'s swatches
  render under the first figure's caption (finance U25).
- **The resolution statement is not chrome that scrolls away.** It is the second thing in
  the head on every lens (it is about every lens), never sticky, never collapsed, and the
  strip's first fact links back to it (`#resolution`).
- **Fold budget at 1280×800 (Budgets):** head ≤ 160, resolution statement ≤ 132, strip and
  lines ≈ 64, tabs ≈ 44, rail ≈ 44 → Q1's three `AnswerLines` begin above 460 px and finish
  in the first viewport; Q2's ledger heading and first group start in the first viewport.
  At 390×844, two viewports reach Q1 (§12).
- **Chrome is constant across lenses.** Head, statement, strip, tabs, rail, the last "not
  published" block, graph, contested, gaps, refusals and sources are the same components.
  Only the answer sequence changes.
- **Lenses:** `role="tablist"`, three tabs, manual activation, only the active panel
  mounted. Budgets is first because the brief orders it first; the order is not a claim.
- **Margin precedence:** `rec` > `cell` > `vendor` > `body` > `st` > rest. A panel moves
  focus to its `h2`, has `Close` first after the `h2` and `Back to {origin}` at its foot;
  Escape closes it only when focus is inside (finance D49).
- **Q-block numbering is fixed per lens** (§2.1). A block that has nothing under the
  filters still renders its heading and its empty sentence: the numbering never shifts.

---

## 5. Section by section

Each component gives: **Reads** (exact exports), **Encoding**, **Caption** (body size, 14 px
`text-text-secondary`, left rule, ≤ 72ch, directly under the graphic, referenced by
`aria-describedby`), **Twin**, **Empty / partial**. The finance twin contract (U15) holds
unchanged: every twin is a `<details>` open under `view=table`; a closed twin exposes
nothing to assistive technology; the skip link before each graphic reads `Skip to the
table`; the summary reads `{h3} as a table · {rows} rows`; directly after the tabs one link
reads `Every graphic on this lens has a table; show them all`. A twin column that mirrors a
visual class prints the class's meaning, never the token.

**The answer-block contract** (new, every lens): a block is a `<section
aria-labelledby>` whose `h3` reads `Q{n} — {question}` verbatim from §2.1. Its first child
is an `AnswerLine` (one or two sentences in body size with every figure derived, every ₹
through `crContext`) **or** a graphic, never both above the fold of the block: when a
graphic leads, its one-sentence denominator is its `figcaption`'s first sentence. The
block ends with its caption and its twin.

### 5.0 Chrome

#### 5.0.1 Header (existing `Editorial`)

- `Kicker`: `Security spend · defence, police, intelligence and the bodies around them`
- `PageTitle`: **The money India spends on force**
- `Standfirst` (fixed, no figures): "What the Union spends on defence and on its own police,
  what each state spends on police, where the installations are, who is paid and on what
  terms, who is awarded and beside whom, and what courts and auditors recorded. Each figure
  stands beside what it is a share of and what it is compared with. Spending on force is a
  policy choice; this page shows the figure, its denominator and who decided it, and takes
  no view on whether it is right."
- `Byline`: `force {FORCE_META.runId} · records read to {FORCE_META.asOf} · open-market slice
  from the CPPP scrape {provenance.inputs[].sha256_16 joined} · built from {counts.files}
  research files, cross-examined ({audit.verdicts.length} audit verdicts, {counts.killed}
  claim killed)`. `META.empty` → `force: register not yet promoted`; `SLICE === null` → the
  slice segment reads `open-market slice not built in this copy`.
- **Standing line** (body size): "No colour on this page stands for a party, a government, a
  state or a verdict. Party appears only as text, as the record states it. Vendors appear
  beside the vendors they compete with; cases appear beside the case recorded as their
  control."

#### 5.0.2 `ResolutionStatement` (new; `id="resolution"`; the page head's second element)

- **Reads:** `UNION_ROWS`, `STATE_ROWS`, `FORCE_STRENGTH`, `FORCE_FOOTPRINT`,
  `COMMISSIONERATES`, `FY_AXIS`, `rowTier`.
- **Form:** a `<dl>` of three rows, label column 8rem, words in body size, the derived line
  beneath each in mono 12 px. **The words are fixed copy restating spec §2's paragraph
  sentence by sentence with every year replaced by a derived brace** (nothing hand-written
  carries a figure):

  | `dt` | `dd` words (fixed) | `dd` mono line (derived) |
  |---|---|---|
  | **Union — to the line** | "Every rupee the Union spends here resolves to a line in a demand for grants, with Budget Estimate, Revised Estimate and Actual where the document prints them." | `{UNION_ROWS.length} line rows · {unionBodies} bodies · FY{FY_AXIS[0]}–FY{FY_AXIS.at(-1)} · actuals for {fyWithActual} of {FY_AXIS.length} FYs` |
  | **State — to the Police head** | "Each state's police money resolves to its Police major head and no further, except where a state's own budget opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while the national strength table is unreachable, and say so. Prisons, home guards, fire and forensic money resolve only as Union scheme totals." | `{statesWithRow} of 36 states and UTs carry a Police-head row ({fyRange}) · {statesWithOwn} with their own budget series · {statesWithStrength} with a strength row; {reportedStrength} of {FORCE_STRENGTH.length} strength rows reported` |
  | **City — to the footprint, and Delhi** | "Only Delhi Police has a budget line of its own, and it is a Union demand. Every other city's police money is inside its state's police head, and this page prints those words in place of a number. Cities appear through what is located in them." | `Delhi Police: {delhiRows} line rows, FY{a}–FY{b} · {COMMISSIONERATES.length} commissionerates placed, {commWithStrength} with a strength row · {fpCities} cities with an installation` |

- The third row's words are the only place a city budget is discussed in prose; everywhere
  else the cell text is `CITY_POLICE_TEXT`.
- **Empty (`META.empty`):** the three rows keep their words; each mono line reads
  `register not yet promoted — nothing below is zero`.
- **Below 640 px:** the `<dl>` stacks (label above words); the mono lines stay. It is not
  collapsed (the statement is the answer to "what can this page know?").

#### 5.0.3 `DenominatorStrip` (existing, sticky; facts per lens)

`filtered={{from, to}}` is the lens population before and after filters. `asOf` reads `read
to {FORCE_META.asOf}`.

| lens | facts |
|---|---|
| Budgets | 1 `{k} of {FORCE_BUDGETS.length} budget rows` · 2 `{union} Union rows, {bodies} bodies · {state} state rows, {payers} payers` · 3 `{fyIn} of {FY_AXIS.length} financial years · actuals for {fyAct}` · 4 `{reported} rows transcribed from a secondary (reported)` · 5 `{zero} rows print ₹0 as published` · 6 `no ₹ total across rows is computed on this page` |
| Footprint | 1 `{k} of {FORCE_FOOTPRINT.length} installations` · 2 `{states} of 36 states and UTs · {cities} cities` · 3 `{kindsWithRows} of {FOOTPRINT_KINDS.length} kinds have a row` · 4 `{dated} of {n} dated` · 5 `{commissionerates} commissionerates: budget inside the state's police head` |
| Procurement | 1 `{awards} named awards ({withRupee} with ₹) to {vendors} vendors` · 2 `{pub} public-sector family · {priv} private-capital family — vendor class not a field` · 3 `{CASES.length} case records, {pairs} control pairs, {unpaired} unpaired` · 4 `{answered} of {alleged} alleged claims with a recorded response` · 5 `{bonds} bonds, {donors} donors, {parties} parties` · 6 `open market: {dedup} award decisions in {classes} buyer classes, rates beside the whole file` (or `open-market slice not built in this copy`) |

Fact 1 on every lens ends with a `#resolution` link `what resolves at which level`. Below 640
px the strip keeps fact 1 and the date; facts 2–6 move, whole, to a mono list under the
lens's first figcaption (finance U26).

#### 5.0.4 `ReconciliationLine` (new; in the sticky wrapper)

Mono 12 px, always rendered:

- **Budgets:** `{FORCE_BUDGETS.length} rows = {union} Union ({demandLevel} demand-level + {sub}
  lines inside a demand + {grants} grants to states + {published} published totals) +
  {state} state ({rbi} RBI Police head + {own} a state's own budget + {prs} PRS
  transcriptions, reported)`. Each term links to the ledger twin filtered by it (in-page).
  The line ends ` · parents and their lines are never added`.
- **Footprint:** `{FORCE_FOOTPRINT.length} installations = ` then `{n} {kind}` for every
  declared kind, zero-row kinds printed as `0 {kind} (none in this register)`.
- **Procurement:** `{FORCE_EDGES.length} records = {award} awards + {enforce} court, audit and
  investigation records + {contra} responses ({audit} added by the audit) + {role} office
  and board + {bond} bonds + {law} rules + {analytic} comparisons + {other} other`.

Below 640 px it is a `<ul>`, not sticky, under the first figure.

#### 5.0.5 Active-filter line, `Find`, `ReadingKey`, `ControlCard`

- **Active-filter line:** finance §5.0.4, words not codes: `filters: FY 2014-15–2024-25 · Maharashtra · components: pay, pension · reset`.
- **`Find`** (finance §5.0.5): searches node `label`, `sub`, footprint `label` and `city`,
  budget `head`, edge `lab`. Result groups: **Bodies** ("Show its budget lines" → `body`;
  "Show connections"), **Places** ("Show in footprint" → `lens=footprint&st`; a commissionerate
  row prints its budget cell `inside the state's police head` in the result itself),
  **Vendors** ("Show vendor" → `vendor`, always opening with comparators), **Cases**
  ("Show the pair" → `case`), **Records** ("Open record" → `rec`). Never by amount or
  degree; exact label first, then alias, substring; ties by label. A unique match is not
  auto-selected. Empty: `No body, place, vendor, case or record in this register matches
  "{find}". This is a statement about the register, not about the world.`
- **`ReadingKey`** (margin at rest): the four tier dashes with their words; family hue
  swatches; the shape key; textures: hatch "no row in this register" (never zero), the
  zero tick "₹0 as published", the "positioned within state, not geocoded" mark; the three
  stage slots "BE · RE · Actual, left to right inside each year"; the energy line "No colour
  on this page stands for a party, a state, a verdict. Hue is only the kind of actor."; "Rose
  marks a response or denial, never 'bad'. Amber marks something not recorded." A **Words**
  block: `BE` Budget Estimate; `RE` Revised Estimate; `actual` the accounts; `demand` a
  demand for grants as Parliament votes it; `line` a line inside a demand as the document
  prints it; `published total` a total the document itself prints; `computed here` a figure
  this page computed, with its a of b; `reported` transcribed from a secondary source;
  `derived` computed by the research from a ratio, not a printed count. When `ty`→`fam`
  splits exist (F23), the inconsistent-hue sentence.
- **`ControlCard`** (margin at rest; "The same lens on the other side"): the lens's pinned
  domains, each one block: base-rate rows (`{numerator} of {denominator} — {label}`,
  percentage only when the denominator is an integer ≥ 10, `null` → `not computed`), then
  that domain's `FORCE_SYMMETRY` text verbatim in the same element, with `wording: {domain}
  research file, run {runId}`. Pinned: Budgets `union-defence`, `union-home`,
  `state-police`, `pay-pensions`; Footprint `footprint`; Procurement `procurement-industry`,
  `money-people`, `literature`. On Procurement the card holds only links to the chapter heads
  (the texts are the chapters' spine there and are not printed twice). Empty: `No symmetry
  check recorded for this lens — the control has not been run. This is a gap, not a pass.`
  in amber.

#### 5.0.6 Filter rail

§6.

### 5.1 Budgets lens

#### 5.1.1 Q1 — How much, this year? (`AnswerLines`)

- **Reads:** `answerFor('mod', f)`, `answerFor('mha', f)`, the Delhi Police lanes, `crContext`,
  `FORCE_BASE_RATES` (domains `union-defence`, `union-home`).
- **Form:** three answer lines in a three-column grid (one column below 768 px), each a
  `<p>` with a mono figure, no graphic:
  1. **Defence:** "In FY{fy} the Ministry of Defence's demands total ₹{cr} crore ({stage}),
     as the Summary of Demands publishes it." Beneath, mono: denominator `{k} base-rate rows
     set this against GDP and Union spending — see Q3` · comparison `FY{fy−1}: ₹{x} crore
     ({stage}), as published` or `no published total for FY{fy−1}` · source `Cite`. When the
     latest FY in range has no published total: "The register holds no published
     all-demand total for FY{fy}. Its {d} demand lines for that year are in Q2, and this page
     does not add them: in {differ} of {checkable} years where both exist, the lines and the
     published total differ." (F5)
  2. **Union police:** "In FY{fy} the Police demand of the Ministry of Home Affairs, as a
     whole, is ₹{cr} crore ({stage})." Same two mono lines.
  3. **The one city:** "Delhi Police's own line in FY{fy} is ₹{cr} crore ({stage}). It is
     the only city police budget published; every other city's is inside its state's police
     head (see Q7)."
- **Stage rule:** the line uses the selected FY range's last FY that has a row; within it
  the stage `actual` if present, else `RE`, else `BE`, and the line names the stage it used.
  The page never mixes stages inside one sentence.
- **Twin:** none (sentences); each figure's row is one click away (`Open the line` →
  `cell`).
- **Empty:** `No published total in this register falls inside FY{from}–FY{to}.` per line,
  with the nearest FY that has one as a link.

#### 5.1.2 Q2 — How has each line moved, and which years are missing? (`LineLedger`, new; the centre)

The skill's "single node, flows over time" form: **periods as columns, lines as rows, a
missing period visible as a missing period.**

- **Reads:** `LANES`, `laneGroups`, `PUBLISHED_TOTALS`, `FY_AXIS`, `rowTier`, `crContext`,
  filters.
- **Layout:** an HTML/SVG hybrid table: a sticky left label column (body label as `h4` per
  group; per lane: component word, the line as printed in 12 px, `FY{fyFirst}–FY{fyLast}`),
  then one column per FY in `FY_AXIS` (all 28 at 1280, each ≥ 26 px, the container scrolls
  horizontally inside itself beyond that), then a right column `lane max`.
- **Groups, top to bottom (`laneGroups`):** **Published totals** (the MoD all-demand lane
  and the Police demand whole lane) first, each labelled "as the document publishes it";
  then one group per body, alphabetical; then **Delhi Police** as its own group headed "the
  one city line"; grants to states are not in the ledger (Q8). A lane whose line is renamed in a later
  document sits directly under its predecessor in the same body, labelled `renamed or
  restructured in the document — not joined` (F6).
- **Cell encoding (frozen):** each FY cell holds **three equal slots, left to right: BE ·
  RE · Actual** (position = stage). In a slot with a row: a vertical bar, height ∝ ₹ on the
  **lane's own linear scale from zero to the lane's maximum** (printed at the row's right as
  `lane max ₹{x} cr`); the bar's outline carries the row's **tier dash** (`documented` solid,
  `reported` `6 3`); the fill is one neutral tone. A slot with no row: **hatch** ("no row in
  this register"). A row with `cr === 0`: a 1 px baseline tick and no bar ("₹0 as
  published"). Two rows in one slot (two editions, E3): two thin bars side by side, both
  drawn. Pay, pension, revenue, capital are **words in the lane label**, never hue.
- **Why lane scales:** CRPF beside the defence total on one scale draws CRPF as nothing; the
  question this graphic answers is "how did this line move, and where is it missing", which
  is read along a row. Across-lane comparison is in Q1's sentences and the twin (D7).
- **Accents:** `body` accents every lane of that body (accent left rule; others unchanged).
  `fy` dims columns outside the range to 20% and never removes them, so the uncovered years
  stay visible; the axis itself never rescales to the years that have data.
- **Interaction:** a cell is a button (one tab stop for the whole grid, roving tabindex,
  arrows move by lane and by FY; finance M1) named `{body} — {component} — {line}, FY{fy}:
  BE ₹{a} crore, RE {no row}, actual ₹{c} crore`; Enter writes `cell` and opens `CellCard`.
  First tap on a coarse pointer shows the readout block (up to four lines), the second opens.
- **Caption C2 (always):** "Each row is one line as the demand document prints it, under the
  body it funds. Inside each year, three slots: Budget Estimate, Revised Estimate, Actual.
  A hatched slot has no row in this register; it is not zero. Each row has its own scale,
  printed at its right, so rows show movement and gaps, not size against each other. A
  demand and the lines inside it are separate rows and are never added together, here or
  anywhere on this page: in {differ} of {checkable} years the Ministry of Defence's
  published total differs from the sum of its demand lines, so the page prints the
  published total and does not compute one. Union actuals in this register begin in
  FY{firstActual}. Amounts are ₹ crore as published, not adjusted for inflation."
- **Caption C2b (when `fy` is set):** "Columns outside FY{from}–FY{to} are dimmed, not
  removed."
- **Twin:** two tables. (a) **Long form**, one row per budget row: Payer · Body · Demand
  title · Line as printed · Component · FY · Stage · ₹ crore · Tier · Note · Source(s) ·
  Denominator (from `crContext`) · Comparison · Reconciliation (`reconcileStatus`,
  "computed here", for demand-level MoD-side rows). Paged at 400 (`tp`). (b) **Coverage**,
  one row per lane × FY: BE / RE / actual each `₹{x}` or `no row in this register`. TSV
  machine columns: `payer`, `body_id`, `component`, `head`, `fy`, `fy_start` (integer),
  `stage`, `cr` (number; `0` stays `0`), `tier`, `lane_key`, `is_demand_level`
  (interim rule), `source_urls`.
- **Below 640 px:** the ledger draws one stage at a time (`stage`, default BE with the
  reason on the control), FY columns at 14 px, the container scrolls horizontally inside
  itself with a sticky 120 px label column, initial `scrollLeft` puts the last FY at the
  right edge, "‹ earlier" / "later ›" buttons and a mono `showing FY{a}–FY{b}` line. Each
  body group is a `<details>` **open by default** with its lane count in the summary.
- **Empty:** filters leave no row → every lane is drawn hatched across the range with
  `No budget row matches {filters}`, naming the most-removing filter with a one-click reset.
  `META.empty` → `Register not yet promoted — nothing below is zero`, no lanes.
- **Partial (the normal case):** stated in C2 and visible as hatch; the axis is always
  `FY_AXIS`.

#### 5.1.3 Q3 — Compared with what? (`CompareBlock`, new; one per lens)

- **Reads:** `FORCE_BASE_RATES` and `FORCE_SYMMETRY` for the lens's pinned domains;
  `FORCE_NARRATIVES` of those domains for one link line.
- **Form:** the house base-rate cards (energy D11; finance §5.4.1) grouped by domain, each
  card `{numerator} of {denominator} — {label}`, a Wilson whisker only when both are integers
  and the denominator ≥ 10, label verbatim; each domain's symmetry text **directly beneath
  its cards in the same `<section>`**, body size, with `wording: {domain} research file`.
  Domains in this order on Budgets: `union-defence` (GDP and Union-spending shares, pension
  and capital shares, SIPRI peers), `union-home`, `pay-pensions`, `state-police`.
- **Why here, not in the margin only:** "compared with what" is the second question every
  figure raises; the cards sit between the ledger and the office lanes so the comparison is
  read before the attribution.
- **Caption C3:** "These ratios were computed by the research, each over the denominator
  printed beside it. The year and kind of each ratio are in its words, not in a field, so
  this page does not chart them (prerequisite S3). The symmetry text under each group is the
  research's account of running the same lens on both governments or both groups of
  states; this page has not re-run it."
- **Twin:** the base-rate table (domain · label · numerator · denominator · ratio where
  integer · source). **Empty:** the ControlCard empty sentence in amber.

#### 5.1.4 Q4 — Who held office when each year was budgeted? (`OfficeLanes`; energy `TenureLanes`, extended as finance D20)

- **Reads:** `ROLE_WINDOWS` for `MOD` and `MHA` (plus any body with ≥ 1 dated role edge,
  derived), `FORCE_META.asOf`.
- **Placement:** directly under the ledger, **sharing its x-axis column grid** (each FY
  column's left edge is 1 April of the FY's start year), so a reader reads a column down
  from the ledger to the office-holder.
- **Encoding:** one lane per office; a bar per window, outlined in its role claim's dash
  (these are `reported`), open-ended windows drawn to `asOf` outline-only with "end not
  recorded" trailing; the same window recorded in two or three files is one bar with
  `×{k} records` and each record listed in the twin (E20). Person label as text; **no party,
  no hue**.
- **Caption C4:** "A window is drawn where a dated role record exists. Holding office when a
  budget was presented is the date test, not evidence that the office-holder set any line.
  Budgets are presented in February for the year beginning in April; a column spans April
  to March. {openEnded} windows have no recorded end and are drawn to the register date."
- **Twin:** office · person · from · to or "end not recorded" · tier · files · source.
- **Empty:** `No dated office record in this register for {office}.`

#### 5.1.5 Q5 — Who is paid, and on what terms? (`PayTerms` + `ContractCards`, new)

Stance rule 2: pay and pensions are contracts with people; no salary of a named person.

- **`PayTerms` (table, no graphic):** `PAY_LAWS` rows: Rank class (target node label) · Pay
  level and entry pay as the record states (`lab` verbatim) · Rule (source node label) ·
  From · Tier · Source. Then the pay and pension lanes' `AnswerLine`: "Pay and pensions in
  the Union demands are lines inside the revenue demands and the Defence Pensions demand;
  see the pay and pension rows in Q2." with a button that sets `comp=pay,pension`.
  Then the analytic rows of `pay-pensions` (pay-to-capital, pension per pensioner, CAPF
  rates, Uttar Pradesh's salary share) as cards with their innocent readings, verbatim.
- **`ContractCards`:** one card per `CONTRACTS` row (Agnipath; OROP 2015; OROP 2019
  revision; the 8th CPC constitution), in date order. Each card has **two equal columns**:
  left **"The terms and the stated case"** — the law edge's `lab` and `d`, the ₹ (kind:
  "cost stated by the Ministry") via `crContext`, the office-holder whose window covers the
  `from` (`officeOn`, date test), and every response in the chain whose responder is a
  ministry, a service or the government; right **"The stated objections and the answers"**
  — every other response in the chain (parties, veterans' bodies, petitioners) and the
  court's holding where an `enforce` edge targets the law node, each with responder, date,
  tier, verbatim text. Both columns use identical field rows (responder · date · tier ·
  text · source). The **assignment to a column is by the responder node's `ty` and `fam`**
  (`ministry` or `agency` with `fam: 'state'` → left; everything else → right), shown in the
  card foot as the rule, so no hand classification enters.
- **Agnipath's "old terms":** "The record does not join the Agnipath terms to the terms they
  replaced (prerequisite S10). The regular-entry pay level for the same rank is in the pay
  table above." with an in-page link to the Level 3 row.
- **Caption C5:** "Pay levels are the Pay Commission's, for a rank, never a person. A
  contract card sets the terms beside the objections at the same size; neither column is a
  verdict. A saving the Ministry has not published is recorded as absent, not estimated."
- **Twin:** pay table; one row per contract response (contract · column · responder · date
  · tier · text · source).
- **Empty:** `No pay level recorded.` / `No contract recorded.`; an empty column prints
  exactly `No response recorded — asked/not asked unknown`.

#### 5.1.6 Q6 — What do the states spend on police, and how many police per lakh? (`StatePolice`, new)

Two small multiples side by side (one above the other below 1024 px), each a `WelfareMap`
(rows loosened as finance did), then the 36-row table.

- **Map A — "Police per lakh population, as on 1 January {sy}":**
  - **Reads:** `FORCE_STRENGTH` rows with `st` and `year === sy`, `perLakh`.
  - **Encoding:** `DEFAULT_RAMP` fill, bins `perLakhBins` (pooled over every year, fixed,
    legend prints each bin's edges and names an empty bin "(none in this year)"); **hatch** =
    no strength row for this state and year; selected `st` accent outline. Every row
    feeding this map is `reported` (F10), so the map frame carries the reported chip and the
    **map border is drawn in the reported dash** (one dash per figure: the figure's weakest
    tier), stated in the legend.
  - **Year control:** a segmented control over `strengthYears` with each year's row count
    (`2020 · 30 rows`), writing `sy`.
- **Map B — "Police spending per resident":** **withheld until S5.** In its frame, same
  size: the void card "Per-resident spending needs a population for each state and year. This
  register holds none, so the page does not compute it. The Police-head ₹ for every state is
  in the table below, with its comparison." and the research's own per-capita figures, where
  a base-rate row of `state-police` carries them, as quoted cards. With S5, the map draws ₹
  per resident ("computed here") on its own pooled bins.
- **`StateTable` (the twin and the reading surface):** 36 rows, north to south (the map's
  order), always all 36. Columns: State · Police head MH 2055 (revenue) for each FY × stage
  the RBI rows give (`₹{x}` or `no row`), each via `crContext` (denominator for a state row:
  `no population or state-expenditure series in this register (S5)`; comparison: the same
  state's previous stage-year) · Own budget series (`{n} rows, FY{a}–FY{b}` → opens
  `StatePanel`) · District Police line, PRS (`₹{x} — reported`) · Police per lakh, actual,
  for each strength year · Sanctioned and actual counts **as the research file records them —
  read the note** (derived counts flagged by S4 when present) · Women % · Sources. A state with
  no row of any kind reads `no row in this register` in every cell, never blank.
- **Caption C6:** "The Police head is the state budget's revenue line for police (major
  head 2055); RBI's tables carry it for {rbiStates} payers across {rbiYears} stage-years.
  Capital spending on police is not a separate RBI row. Police per lakh is the figure the
  national table prints, transcribed by a secondary source while that table is unreachable:
  every strength figure here is reported, and absolute counts were derived by the research
  from the ratio. The District Police line is a part of the Police head, from a different
  document, and is never placed in the Police-head column."
- **`StatePanel`** (margin, `st`): the state's rows in every series, its footprint counts by
  kind with a link to the footprint lens, its commissionerates with `CITY_POLICE_TEXT`, the
  `state-police` base rates that name it **as quoted text only** (never parsed), and the
  state-police symmetry text verbatim. **No party colour; no ruling party line is written by
  the page** — a party appears only inside quoted research text.
- **Empty:** no strength rows for `sy` → Map A all hatched with `No strength table for
  {sy} in this register`; the table keeps 36 rows.

#### 5.1.7 Q7 — Which city has a police budget? (`CityLine`)

- **AnswerLine:** "One: Delhi Police, a Union demand line, FY{a}–FY{b}. Every other city's
  police money is inside its state's police head." Then a compact table: Delhi Police (₹
  lanes summary link → `body=force:delhi-police`; strength sanctioned for each year with a
  row, documented) and one row per commissionerate (`COMMISSIONERATES`): City · State ·
  Budget `inside the state's police head` (exact) with a link to that state's row in Q6 ·
  Strength `no primary strength table reachable for commissionerates` (the state-police void
  linked) · Source of the commissionerate row.
- **Caption C7:** "No city budget is computed or estimated on this page. A commissionerate is
  listed because a primary list names it; its money cannot be separated from its state's
  police head in any published document this register holds."
- **Empty:** `No commissionerate in this register.` — the Delhi row stays.

#### 5.1.8 Q8 — What does the Union give the states for police? (`GrantsTable`)

- **Reads:** `GRANT_ROWS`; S2 when present.
- **Form (interim):** a table, no map: Scheme line (head verbatim, including the recipient
  where the head names one) · FY · Stage (`BE` printed "allocation", `actual` printed
  "released", from the head's own word) · ₹ crore (₹0 prints `₹0 crore, as published`) ·
  Tier · Source. Default sort: head, then FY. `st` is inactive on this table with the reason
  `the recipient state is in the line's text, not a field (S2)`.
- **Caption C8:** "The Union's police grants to states are recorded as scheme lines; the
  per-state split exists here only for the modernisation scheme, FY{a}–FY{b}, from one
  Parliament answer. A released amount of ₹0 is a published figure and is shown as one."
- **Twin:** the table itself; TSV. **Empty:** `No grant line matches {filters}.`

#### 5.1.9 Q9 — What is not published? (`CannotShow`)

§5.4.3, for domains `union-defence`, `union-home`, `state-police`, `pay-pensions`.

### 5.2 Footprint lens

#### 5.2.1 Q1 — Where is it? (`FootprintMap`, new; on `IndiaMap` geometry)

- **Reads:** `FORCE_FOOTPRINT`, `kind` filter, geometry.
- **Encoding:** one neutral dot (r = 2.5 px at 1280, ≥ 3 px screen at 390, `--color-text-secondary`
  with a 1 px ground halo) per installation, **positioned within its state at the pole of
  inaccessibility with golden-angle jitter clamped to `clearance`** (`india-map`), never
  sized and never coloured by kind, body or family; a state with no row in the current `kind`
  selection is **hatched** ("no installation of the selected kinds in this register"); states
  with rows are plain ground. Commissionerate dots are drawn like every other dot (kind is not
  a mark channel here; see D17).
- **Readout (state):** `{State}: {k} installations in {c} cities — {kind counts in words}`;
  then up to four city lines `{City}: {kinds}`; then `— open the state for the list`.
- **Caption C9:** "One dot per installation that an official list places in a state and a
  city. Dots are positioned within their state, not at their address: no row carries a
  coordinate. A dot is a place, not money: no installation here has a budget of its own on
  this page. Kinds the register declares but holds no row for — {emptyKinds} — are not
  absent from India, only from this register. Most installations are older than any
  government in this register's office lanes; {dated} of {n} rows print a date."
- **Twin:** `KindMatrix` (§5.2.2).
- **Mobile:** full width; tap → readout → "Open the state".
- **Empty:** all states hatched; `No installation matches {filters}`.

#### 5.2.2 Q2 — Of what kind, in which city? (`KindMatrix` + `PlaceList`)

- **`KindMatrix`:** a real `<table>`: rows the 36 states north to south, columns every
  declared kind (`FOOTPRINT_KINDS`, all eleven), cells the count or `no row` (hatched
  background, words in the cell), and a last column `cities`. The two zero-row kinds keep
  their columns with the header note `none in this register`.
- **`PlaceList`:** one row per installation: Label · Kind · City · State · Run by (body,
  button: Show connections) · Since (or `date not printed on the list`) · Tier · Source.
  Sorted state (north to south), city, label. Paged at 400.
- **Caption:** "Counts are of rows in official lists the research could open. A state's
  count measures what was listed and reachable, not the size of its forces: the BSF, SSB,
  Assam Rifles and NSG sites, most DPSU plants, and every jail address are not in these
  lists (see Q5)."

#### 5.2.3 Q3 — Which cities have police money? (`CityPoliceTable`)

The same component as Budgets Q7 (§5.1.7), mounted here with the footprint's city columns
added (installations in the same city by kind). Review Focus 2 is asserted on both mounts.

#### 5.2.4 Q4 — Compared with what? (`CompareBlock`, domain `footprint`)

§5.1.3 with the footprint base rates and the footprint symmetry text (the per-million
comparison the research ran on both groups of states, quoted verbatim; party names appear
only inside it).

#### 5.2.5 Q5 — What is not published? (`CannotShow`, domain `footprint`)

### 5.3 Procurement and people lens (spine: the symmetry chapters and the cases)

#### 5.3.0 Q0 — The same lens on the other side (`SymmetryContents`, new)

- A contents block at the lens head, before any figure: four chapter links, each with its
  control stated in one derived line:
  1. `Vendors — {pub} public-sector-family vendors beside {priv} private-capital-family
     vendors; {pairs} declared head-to-head comparisons` → ch. 1
  2. `Open market — {classes} buyer classes, each beside the whole tender file` → ch. 2
  3. `Both sides of the money — bonds to every party a donor bought for; board roles beside
     the rule` → ch. 3
  4. `Cases — {CASE_PAIRS.length} control pairs, {unpaired} case(s) without one` → ch. 4
- Each chapter begins with its **symmetry text verbatim, body size, in a bordered block
  headed "The same lens, run on the other side — {domain} research file"**, before any
  table or graphic of the chapter. Ch. 1 ← `procurement-industry`; ch. 3 ← `money-people`;
  ch. 4 ← `literature`; ch. 2 ← the slice's `readMeFirst` and `caveat`.
- **Empty:** a chapter whose domain has no symmetry text prints the ControlCard empty
  sentence in amber in the text's place; the chapter still renders.

#### 5.3.1 Chapter 1 — Q1 Who was awarded, and beside whom? (`AwardLanes` + `VendorGrid`, new)

- **`AwardLanes` (graphic: when, and to whom, faster than a list):**
  - **Reads:** `AWARDS`, `VENDORS`, `nodeOf`, `FAMILY_LABEL`, `FY_AXIS` for the x-scale
    (shared with Budgets' column grid), `fy`.
  - **Encoding:** two bands, always both drawn: **public-sector family** and **private-capital
    family** (band headers carry the family hue swatch and the `FAMILY_LABEL` word; hue is
    family, as everywhere). Inside each band one lane per vendor, alphabetical. One tick per
    award at its date, fixed height, **dash = tier**; an `alleged` award (the Tatra and
    Rafale claims) is a tick in the alleged dash with its response tick beside it (rose,
    response dash). Undated awards in a right gutter `undated`. **No amount channel**: ₹ is
    in the readout and twin only (named awards are a sample of PIB releases, joint totals
    and unpriced contracts are voids, so a ₹ length would measure research attention).
    Vendors in `VENDORS` with no award (declared comparators) draw an empty lane with
    `no named award in this register`.
  - **Caption C11:** "Each tick is one contract the Ministry of Defence's releases name with
    a vendor; {withRupee} of {awards} state a value. Approvals that name no vendor, joint
    contracts without a per-vendor split, and unpriced contracts are not ticks (see Q6).
    Public-sector and private vendors are drawn in two bands, always both; the family is the
    platform's actor family, because vendor class (public undertaking, private Indian,
    foreign, joint venture) is not yet a field."
  - **Twin:** Date · Vendor · Family · Contract (`lab`) · ₹ crore (kind: contract value as
    recorded) or `amount not stated` · Tier · Response · Source.
- **`VendorGrid` (identical fields; Review Focus 3):**
  - One card per member of `VENDORS`, **always all of them**, in the two family bands,
    alphabetical. A filter never removes a card: under `fy`, a card's counts read `{k} of
    {n} awards in FY{from}–FY{to}` and a card with none in range reads `no named award in
    this range` (the card stays).
  - **Identical field rows, in this order, on every card** (`vendorFields`), each with its
    null words:
    1. Family (hue swatch + word) · `vendor class not a field (S6)` until S6
    2. Recorded owner (`own` edges into the vendor: owner, share as recorded in `lab`) /
       `no owner recorded`
    3. Named awards: `{n} ({withRupee} with ₹), FY{first}–FY{last}` / `none named`
    4. Declared comparison (`comparatorsOf`): the comparator names as buttons, with the
       analytic edge's `lab` and its figures as recorded / `no head-to-head declared —
       compared with the {other family} band`
    5. Electoral bonds (`bond` edges from the vendor or from a recorded owner) / `no bond
       recorded in this register` + the money-people bond void, verbatim, at the same size
    6. Retired officers on the board (`BOARD_PAIRS` into the vendor) with the rule
       (`POST_RETIREMENT_RULES`) / `no board role recorded`
    7. Court, audit and investigation records (`enforce` edges targeting the vendor) /
       `none recorded`
    8. Stories told about vendors: one identical link on every card, `rated in Q5` (the
       register does not join a narrative to a vendor id, and the page does not match names
       in prose)
    9. Sources
  - **`vendor` set:** the card is accented in place and **`VendorCard` opens in the margin
    with the vendor and its comparators side by side as equal columns** (or with the other
    family band's summary row when none is declared: `{k} vendors, {n} named awards` per
    vendor, alphabetical). There is no state of the page in which one vendor's fields
    render without another vendor's fields in the same frame (SG-RF3).
  - **Caption C12:** "Every vendor carries the same fields. A field that is empty says so;
    empty does not mean searched and found nothing unless a void says so, and the voids are
    printed beside the field. Named awards are a sample of the Ministry's releases, not its
    order book. The research's own comparison of values by class is quoted above this
    chapter; this page computes no share of awards by vendor or class."
  - **Twin:** vendor × field table, one row per vendor, all fields as text.

#### 5.3.2 Chapter 2 — Q2 Who bought on the open market, and how many bid? (`SliceRates`, new)

- **Reads:** `SLICE.readMeFirst`, `SLICE.caveat`, `SLICE.rates.byClass`, `.total`,
  `.excludingWorks`, `SLICE.quality.byClass`, `SLICE.classes.definitions`.
- **Order:** `readMeFirst` verbatim (body size, bordered, first) → `caveat` verbatim → the
  graphic → the class definitions with their innocent readings.
- **Encoding (graphic: eight rates beside two references, faster than a table):** one row per
  class in the file's order, never re-sorted; x = single-bidder rate, a shared 0–max scale
  rounded up to the next 10%; a dot at the class rate with its **Wilson 95% interval as a
  whisker**; on the same row a **short vertical tick** at the whole-file rate on the same
  portal and a **full-height hairline** at the whole-file rate (both labelled in text at the
  row end: `whole file, same portal {x}% · whole file {y}%`); `n` and `{single} of {n}` in
  mono at the row start. Then, separated by a rule, two reference rows: **excluding the works
  class** and **the slice as a whole**, each labelled with the works share sentence. Marks
  are neutral; no hue, no dash (these are not claims of tiers; the whole slice is reported,
  stated in the caption).
- **Caption C13:** "Single-bidder rate is the share of award decisions with exactly one bid,
  over decisions with a recorded bid count. The works buyers alone are {worksShare}% of the
  slice, so the slice's overall rate is a works rate; read each class beside the whole file
  on its own portal. Defence capital acquisition is not on this portal. Every figure is
  dataset-only: the stored links had expired when the sample was checked. No winner is
  named here; the tender register names marked winners under its own rule."
- **Twin:** class · definition · raw rows · dedup rows · n · single-bidder · rate · Wilson low
  · high · whole file same portal · whole file · innocent reading. TSV with `#` provenance
  (input digests, dedup rule).
- **Empty:** `SLICE === null` → `The open-market slice is not built in this copy of the
  register. Nothing here is zero.`

#### 5.3.3 Chapter 3 — Q3 Who sits on both sides of the money? (`BondTable`, `BoardRoles`)

- **`BondTable`:** one block per donor (`BONDS`), its every party as a row: Party (label;
  text) · ₹ crore as recorded · Bonds · Purchase window (`from`–`to`) · Tier · Source.
  Donors alphabetical; parties by first purchase date. Beneath, at the same size, the
  money-people bond void naming the vendors with no bond in the disclosure, and the
  money-people base rates (party totals as denominators).
  - **Caption C14:** "A bond is a recorded purchase for a party; each donor's purchases for
    every party are shown together. Vendors not listed bought no bond under their own name in
    the disclosure the research read; that is recorded as a void, not as innocence or
    guilt. No order is joined to a bond except where a record dates both, and the research
    could date both for one vendor only."
- **`BoardRoles`:** one row per `BOARD_PAIRS` person: Person · Public office (`lab`, from–to) ·
  Board (company, role, from) · Months between office end and board start (**computed here**,
  only when both dates exist, else `not computable: {which} date not recorded`) · The rule
  (`POST_RETIREMENT_RULES` text verbatim, with the void on the rule's number and date) ·
  Tier · Sources. Followed by the declared board control (the analytic edge into the
  retired-officers class) quoted.
  - **Caption C15:** "Persons appear only in public roles at the public rank. A board seat
    after the cooling-off period is lawful; the page prints the interval and the rule, not
    a judgement."
- **Twins:** the tables themselves; TSV.

#### 5.3.4 Chapter 4 — Q4 What did courts and auditors record? (`CaseTimeline` + `CasePairs`; the spine)

Stance rule 5: cases are records; Bofors sits beside Rafale by design.

- **`CaseTimeline` (graphic: what changed when, across all seven at once):**
  - **Reads:** `CASES`, `caseFile`, `responseChain`, `FORCE_META.asOf`.
  - **Encoding:** one shared x-axis from the earliest record in any case file to `asOf`; one
    lane per case, **ordered pair by pair** (each `CASE_PAIRS` pair adjacent, pairs ordered by
    their earlier member's first record; unpaired cases last), a thin bracket in the label
    column joining a pair's two lanes, labelled `control pair (recorded in {files})`. One
    tick per record at its date, **dash = tier**; a response tick (rose, its own dash) on the
    lane at the response's date when dated, else in the `undated` gutter; undated records in
    the right gutter. No colour other than rose; no party anywhere on the graphic.
  - **Caption C16:** "Each lane is one case file as the register holds it; each tick a court
    order, an audit paragraph, an investigation step or an allegation, in its evidence
    tier's dash. Rose ticks are recorded answers. Lanes are paired as the research recorded
    them, so each government's case sits beside the case recorded as its control. A dense
    lane is a well-documented case, not a worse one."
  - **Twin:** case · date · record (`lab`) · source node · kind (court / audit /
    investigation / allegation / decision, from §3.2's `ty`/`fam` rule) · tier · response
    (or the exact sentence) · source.
- **`CasePairs` (the reading surface, and the spine):**
  - One **row per pair**, two **equal columns** (CSS grid, `grid-template-columns: 1fr
    1fr`, the field rows aligned with `subgrid` so each field sits level with its twin);
    the left column is the member whose first record is earlier (a date rule, never a
    party rule). Above the row, the pair's analytic edge `lab` and its file names, and the
    **symmetry sentence(s) of the files that recorded the pair, verbatim** (the literature
    and money-people texts compare the pair's fields in prose; they are quoted, not parsed).
  - **Unpaired case (Adarsh today):** its own row, its record in the left column, and in the
    right column at equal width, size and weight: **`No control pairing recorded for this
    case in the register.`** in amber, followed by the gap line on its split ids when one
    applies.
  - **Each column is a `CaseRecord` with fixed field rows, in this order** (`caseFields`),
    each with its null words:
    1. **Header:** case label; counters in mono: `{records} records · first {date} · latest
       {date} · {answered} of {claims} answerable records with a recorded response`
    2. **Decision record:** the joined award (date, buyer, vendor, ₹ via `crContext` or
       `amount not stated`) / `decision record not joined to this case in the register (S8)`
    3. **Office on the decision date:** `officeOn(decisionDate, [MOD])` three-block rule /
       `no recorded office window covers {date}` / `no decision date joined`
    4. **Allegation:** the `alleged` records, each with its response chain **beside it at
       equal size** / `no allegation recorded in this case file`
    5. **Investigation:** records whose source is an investigating agency / `none recorded`
    6. **Court:** records whose source has `fam: 'enforce'` and is a court or tribunal, by date
       / `none recorded`
    7. **Audit:** records whose source is the auditor / `none recorded`
    8. **Latest record:** the latest dated record's `lab` verbatim (the case's latest stage)
    9. **Counter-record:** every response in the file, each `Response from {responder}
       [{tier}], {date or "undated response"}` with its text; an audit-added response reads
       `the audit (recorded on {subject})`; none → exactly **`No response recorded —
       asked/not asked unknown`**
    10. **Stories told about it:** one identical link on every column, `rated in Q5` (the
        register does not join narratives to case ids; no name is matched in prose)
    11. **Sources**
  - **`case` set:** scrolls to the pair row and accents **both columns' borders**; never
    filters, never isolates.
  - **Caption C17:** "A case is shown as its records: what a court, an auditor or an
    investigator recorded, on what date, and what the other side answered. Each case sits
    beside the case the research recorded as its control, with the same fields in the same
    rows. No case here is a finding of guilt or of innocence; the outcome row quotes the
    latest record."
  - **Twin:** the `CaseTimeline` twin, plus a field table (case · field · value or null
    words).
- **Empty:** `No case record in this register.`; a pair whose filtered records are empty
  keeps both columns with `No record of this case falls in FY{from}–FY{to}.`

#### 5.3.5 Q5 — Which stories hold up?, Q6 — What is not published?

§5.4.2 (ladder over `procurement-industry`, `money-people`, `literature`) and §5.4.3, whose
derived lines include the DAC void sentence (F16).

### 5.4 Per-lens blocks (every lens)

#### 5.4.1 Compare blocks

§5.1.3; one per lens, pinned domains per §5.0.5.

#### 5.4.2 Narratives, rated (`NarrativeLadder`)

The lens's domains' `FORCE_NARRATIVES`; six rungs always drawn; empty rungs `none in this
file`; strongest case and strongest counter side by side at equal size; the research file
named; a toggle `show every domain's narratives ({n})`. Budgets: `union-defence`,
`union-home`, `pay-pensions`, `state-police`; Footprint: `footprint`; Procurement:
`procurement-industry`, `money-people`, `literature`. Caption (energy §8): "Status is the
research's calibration on the evidence it found as of {asOf}, not the verdict of any court,
regulator or auditor. A narrative is never drawn as an edge. The same narrative can appear in
two files with different ratings; both are listed."

#### 5.4.3 What is not published? (`CannotShow`; the last Q-block of every lens)

The lens domains' `FORCE_VOIDS` (each `what` and `whyItMatters` at full size, with sources)
and `FORCE_GAPS`, plus the lens's derived gaps (§5.5.3), in `GapsPanel` at the findings' type
size, under the heading `Q{n} — What is not published?`. Never collapsed.

### 5.5 Shared sections

#### 5.5.1 Connection graph (`id="connections"`; existing `GraphExplorer`)

- **Reads:** `FORCE_NODES`, `FORCE_EDGES` (all; the budget, strength and footprint series are
  not edges and are not drawn). `height=620` (480 below 640), mounted on intersection, behind
  `Load the graph` below 640.
- **Status line:** "{edges} relationships among {nodes} entities in the force register. The
  budget lines, strength tables and installations are rows, not relationships, and are in
  the lenses above. Ids are joined only where they match; {splitIds} entities appear under
  two ids. {undated} relationships are undated."
- **Caption:** finance C15 verbatim.

#### 5.5.2 Contested (`id="contested"`)

Every `alleged` non-contra edge of the module, each beside its response chain at equal
width, size and weight (energy `ContestedList`). Denominator: `{alleged} alleged claims ·
{answered} with a recorded response · {unanswered} without — whether a response was sought is
not recorded.`

#### 5.5.3 Gaps (`id="gaps"`; existing `GapsPanel`)

All `FORCE_VOIDS` and `FORCE_GAPS`, grouped by lens then domain, plus **derived gaps**, each
shown only when its condition holds:

- "Demand hierarchy is not a field: {nested} of {cells} Union cells hold a demand and its own
  lines; they are drawn as separate rows and never added" (S1 absent)
- "The Ministry of Defence's published total differs from the sum of its demand lines in
  {differ} of {checkable} years where both exist; the page prints the published total"
- "{fyNoPublished} of {FY_AXIS.length} financial years have no published Ministry of
  Defence all-demand total in this register"
- "Union actuals in this register begin in FY{firstActual}"
- "Grants to states name their recipient in the line's text only; {asump} rows are not
  placed on any map" (S2 absent)
- "Base-rate years and kinds are in words, not fields" (S3 absent)
- "Budget and strength tiers are read from the `reported:` note prefix" (S4 absent)
- "No population or state-expenditure series: police spending per resident is not computed"
  (S5 absent)
- "{derived} strength rows give absolute counts derived by the research from a ratio"
- "Vendor class is not a field; vendors are grouped by actor family" (S6 absent)
- "Custodial deaths and police firings by state exist only in research prose; no per-state
  outcome surface is drawn" (S7 absent)
- "{casesNoDecision} of {CASES.length} case files have no decision record joined" (S8 absent)
- "{unpaired} case(s) have no recorded control pairing"
- "{noStateRow} of 36 states and UTs have no Police-head row; {noStrength} have no strength
  row; {noFootprint} have no installation"
- "{emptyKinds} declared installation kinds have no row"
- "{noDate} of {FORCE_FOOTPRINT.length} installations carry no date"
- "{enforceNoResponse} of {enforce} court, audit and investigation records carry no recorded
  response"
- "{splitIds} entities appear under two ids and are not merged by name"
- the inconsistent-hue line when `ty`→`fam` splits exist (F23)
- **What the audit killed:** each `FORCE_META.killed` claim: id, `lab`, `killedReason`
  verbatim.

Header: "{v} voids and {g} gaps recorded by the research, and {d} derived by this page."
Same type size as findings.

#### 5.5.4 Refusals (`id="refusals"`)

§14 as a list, linked from the rail foot.

#### 5.5.5 Source ledger and foot

`SourceLedger` over every `srcs` in the module (edges, nodes, the three series) and the
slice's provenance, deduplicated by URL, grouped by `sourceClass`, full list always shown;
`establishes` = `cited by {n} records and rows, e.g. {first}`. Then `TierLegend` and the
standing note verbatim.

---

## 6. Filter rail and its effect on the denominator

One rail, four filters the brief names (payer, state, FY range, component) plus tier, the
same on every lens; a control that does not apply to the active lens stays visible,
`aria-disabled`, with its reason as its effect line.

| control | type | effect line beside it | lens reach and honesty note on the control |
|---|---|---|---|
| Find | `type=search`, first after the tabs | `{k} matches` | filters nothing |
| Payer | segmented: All · Union · States | Budgets `{N} → {k} rows` | Footprint and Procurement: inactive, reason in the name (§3.4) |
| State | `<select>`, 36 states and UTs alphabetical, with the active lens's count each; zero-count options shown `(0)` and `aria-disabled`, never hidden | Budgets `{N} → {k} state rows · Union lines unaffected`; Footprint `{N} → {k} installations` | the label reads `State (where the record places it)`; on Budgets the note `grants to states: recipient not a field (S2)`; Procurement inactive |
| FY from / to | two `<select>` over `FY_AXIS` + "All years", with a coverage ribbon (one tick per FY with ≥ 1 row in the lens; FYs without rows named) | Budgets `{N} → {k} rows · {fyIn} FYs`; Procurement `{N} → {k} records · {undated} undated shown under all years only` | Footprint inactive: `{undated} of {n} installations carry no date`; strength tables dated 1 January Y count in FY Y−1 to Y, stated on the control |
| Component | seven checkboxes, each with its row count | `{N} → {k} rows` | Budgets only; the note `a line's component is as the file records it; pay sits inside revenue demands` |
| Tier | four toggles with dash swatches (the word is the label) | `{N} → {k}` for the lens, `also filters the connection graph` | series rows have two tiers (documented, reported); responses follow their claim (finance D35) |
| Kind (Footprint) | chips, all eleven kinds, each with its count; the two zero-row kinds `aria-disabled` with `none in this register` | `{N} → {k} installations` | — |
| Strength year (Budgets Q6) | segmented | `{rows} rows in {sy}` | the map only; the table shows every year |
| Stage (below 640 only) | segmented BE · RE · Actual | `{rows} rows at this stage` | the reason for the BE default on the control |
| Reset | button | clears page params except `lens` and `view` | never touches the graph's params |
| Copy link · Table view | button · toggle | `Link copied` | — |

Every change announces `from {N} to {k} {unit}` once through the live region. **The rail
refuses** (a fixed muted line at its foot): "Not offered: party, ruling-party, government-era
and 'risk' filters; a city budget filter — why →", linking to `#refusals`.

---

## 7. Interactions

| verb | trigger | writes | result | focus |
|---|---|---|---|---|
| Open the line | a ledger cell; an `AnswerLine` figure | `cell` | `CellCard`: every row of that lane × FY (all stages), each with `crContext`, note, tier, sources, Copy citation | the card's `h2` |
| Show its budget lines | a body in Find, a `BodyCard`, a footprint row's "run by" | `body` (+ `lens=budgets` from Find) | ledger lanes accented, scrolled into view, `BodyCard` open | the card's `h2` |
| Select state | map, select, Find | `st` | `StatePanel`; lists filtered on Budgets and Footprint | the panel's `h2` |
| Show vendor | a vendor label, Find | `vendor` (+ `lens=procurement`) | card accented in place; `VendorCard` with comparators | the card's `h2` |
| Show the pair | a case label, Find | `case` (+ `lens=procurement`) | scroll to the pair row; both columns accented | the pair row's `h4` |
| Open record | any edge label | `rec` | `RecordCard` (finance §5.1.6 with this page's blocks) | the card's `h2` |
| Show connections | any entity button | `focus`, `hops=1`, `sel` | the graph section | the graph detail heading |
| Filter | rail | the param | `{N} → {k}`, announced | stays |
| Copy citation | `CellCard`, `RecordCard`, a case field | — | the citation: `{line or lab} — ₹{x} crore ({stage}, FY{fy}) or the record's date — {denominator} — {comparison} — {tier} — {first source} {url} — ICIP {deep link}, read to {asOf}`; also rendered as visible `<output>` text | stays |
| Export | `Copy as TSV — {table}` / `Download .tsv — {table}, {rows} rows` above every twin | — | `{table} copied, {rows} rows` | stays |
| Change lens | tab | `lens`; clears `rec`, `cell` | §3.4 | the lens heading |
| Close / Back | panel controls | clears that panel's param | panel closes | the invoking control |
| Escape | focus inside a panel or an expanded row, nowhere else | — | closes it | the invoking control |

Coarse pointers: first tap shows the reserved readout block under the graphic (≤ 4 lines), a
second tap or the "Open" button acts. Copy is device-neutral. Reduced motion honoured.

---

## 8. Encodings

### 8.1 Channels

| where | channel | means | never means |
|---|---|---|---|
| everywhere | `strokeDasharray` | evidence tier, and nothing else (on a series row: `documented` solid, `reported` `6 3`; on a figure built from many rows: its weakest row's tier) | stage, era, party, vendor class |
| graph, vendor band headers | hue (`fam`) | actor family (public power / private capital / recipient / instrument / enforce / market) | party, state, verdict, vendor class |
| graph | shape (`ty`) | entity type | footprint kind, case type |
| graph | size (`sz`) | declared band | ₹, award count, degree |
| ledger | position inside a year (left, centre, right) | BE, RE, Actual | — |
| ledger | bar height | ₹ crore **on the lane's own scale** (its max printed) | size against another lane |
| ledger, maps, tables | hatch | no row in this register | zero |
| ledger | baseline tick, no bar | ₹0 as published | no data |
| per-lakh map | ramp fill (pooled bins over every year) | police per lakh population as printed | spending, party, a score |
| footprint map | one neutral dot, jittered in its state | one installation the list places in that state | size, kind, money, a precise address |
| award lanes, case timeline, office lanes | x | date on one linear scale shared with the ledger's FY grid | — |
| award lanes, case timeline | tick (fixed height) | one record | amount |
| case timeline | bracket in the label column | a recorded control pair | similarity of guilt |
| case pairs | left column | the earlier first record | the accused side, a party |
| slice rates | dot · whisker · short tick · hairline | class rate · Wilson 95% · whole file same portal · whole file | risk, wrongdoing |
| everywhere | `--color-rose` | a recorded response or denial | bad |
| everywhere | `--color-amber` | not recorded (response, source, pairing, row) | suspicious |
| everywhere | accent | selection (`body`, `cell`, `st`, `vendor`, `case`) | importance |
| text only | party, ruling government, ministers' names, stage words, component words, footprint kind | as recorded | — |

### 8.2 Frozen (the developer may not adjust these to make it fit)

1. `strokeDasharray` means tier on every mark that stands for a claim or a row; `alleged` and
   `documented` never render alike in any theme, greyscale or screenshot. No dash is used for
   any other purpose (the slice-rate references are a tick and a hairline, not dashes).
2. Family hue, type shape and declared size band are unchanged from `ForceGraph`. **No new
   hue.** Footprint kind, stage, component, vendor class and party get no hue and no shape.
3. **No ₹ total is computed across budget rows, anywhere** — not in a chart, a caption, a
   twin footer, an export header or an `aria-label`. The only totals printed are rows the
   documents publish as totals. The only page-computed ₹ figures are a single row's share of
   its own published parent (`crContext`, labelled `computed here`, a of b) and, with S5, ₹
   per resident (`computed here`).
4. **No stacked chart of budget rows** until S1 marks parents; then a stack only of parts
   whose parent is published, with the published total drawn as a tick over it.
5. Every lane draws **every FY of `FY_AXIS`** with **all three stage slots**; a missing slot
   is hatched; the axis never rescales to the years with data; `fy` dims, never removes.
6. Hatch ≠ zero; the zero tick ≠ hatch; hatch, ramp floor, dot and ground are distinct in a
   greyscale screenshot at 390 and 1280 (SG-30).
7. **A non-Delhi city budget cell holds exactly `inside the state's police head`** — never a
   number, never blank, never `—` (Review Focus 2).
8. **No vendor's fields render without another vendor's fields in the same frame** (Review
   Focus 3): `VendorGrid` always renders every vendor; `VendorCard` always opens with its
   comparators or the other family band.
9. **Every case renders in its recorded pair row, two equal columns, identical field rows**;
   an unpaired case's empty column holds the exact pairing sentence at equal size. `case`
   accents, never filters.
10. Every enforce and alleged record has a response slot at equal width, size and weight, and
    the exact sentence `No response recorded — asked/not asked unknown` when empty.
11. Party is text, never colour, never a filter, never a sort key, never a column the page
    writes; it appears only inside quoted research text and record text.
12. `a of b` is always printed; a percentage only when b is an integer ≥ 10, or for a ₹ share
    labelled `computed here`.
13. Nulls read `no row in this register`, `not recorded`, `not stated`, `none named`, `not
    computed`; never `0`, never a bare `—`, never `NaN`. An empty `srcs` reads `no source in
    file` in amber.
14. Default sorts: date, alphabetical, north-to-south, or file order; **never by ₹, by
    award count or by any page-computed figure**. Ledger lanes are never re-ordered by size.
15. The per-lakh map's bins are pooled over every strength year, unfiltered, and do not move
    with `sy` or any filter.
16. The default view is unfiltered with no selection on Budgets; no param pre-selects a party,
    company, vendor, person or case.
17. Captions C2–C17 and every `CannotShow` render at body size directly under their block.
18. Exact strings: `inside the state's police head`, `No response recorded — asked/not asked
    unknown`, `No control pairing recorded for this case in the register.`, `no row in this
    register`, `₹0 crore, as published`, `computed here`.

---

## 9. Captions the page must carry

C2 (+C2b) `LineLedger` · C3 `CompareBlock` · C4 `OfficeLanes` · C5 `PayTerms`/`ContractCards`
· C6 `StatePolice` · C7 `CityLine`/`CityPoliceTable` · C8 `GrantsTable` · C9 `FootprintMap`
· the `KindMatrix` caption · C11 `AwardLanes` · C12 `VendorGrid` · C13 `SliceRates` · C14
`BondTable` · C15 `BoardRoles` · C16 `CaseTimeline` · C17 `CasePairs` · the narratives caption
· the graph status line and caption. (C1 is reserved for the `ResolutionStatement`'s three
fixed sentences, which act as the page's first caption.) Every `{brace}` is derived;
hand-written copy states method, never a figure. Every caption says what its block cannot
show. **No caption uses "ruling", "opposition", "government of the day", "UPA", "NDA" or a
party name in the page's own words** (energy A8); those words appear only in quoted research
text, record text and role labels.

---

## 10. Loading, empty, partial and no-data states

| state | render |
|---|---|
| Loading | The route chunk and the lazy graph. `FORCE_NODES`/`FORCE_EDGES` are already in the entry through `DataContext`; the series and the other page-only exports must reach the reader only in the `/security` chunk (G5; SG-50 prints the growth until then). `loadSecurity()` resolves after mount: `SliceRates` shows a 320 px block `Loading the open-market slice ({classes} buyer classes)…` with the `readMeFirst` text already rendered from the chunk once available. Route fallback: PageTitle + Standfirst |
| `FORCE_META.empty` | Full chrome. The resolution statement keeps its words; its mono lines and the strip read `register not yet promoted — nothing below is zero`; every Q-block renders its heading and `Nothing recorded yet.`; maps hatched; the ledger shows the FY axis with no lanes. Smoke passes (SG-2) |
| **Zero rows in a series** (budgets, strength or footprint `[]` with the graph non-empty) | the series' blocks render their headings, axis or 36-row table hatched, and the sentence `This register holds no {budget / strength / installation} rows in this build.`; the resolution row for that level says `no rows in this build`; no other block changes |
| `SLICE === null` | ch. 2 prints the absence sentence; the strip's fact 6 reads `open-market slice not built in this copy` |
| Prerequisite absent (S1–S10) | the interim named per component in §5 and the derived gap line |
| **Partial years (the common case)** | every lane draws every FY of `FY_AXIS` with hatched slots; C2 states the first actual FY; a lane's covered range is in its label (`FY{first}–FY{last}`), drawn inside the full axis, never as the axis |
| Partial states | the 36-row table always 36 rows; hatched rows name their reason (`Delhi's police is the Union line — see Q7`; `no RBI row for this UT`) |
| Partial strength years | the map draws `sy`; the year control prints each year's row count; the table shows every year |
| Partial case files | each field prints its null words; the counters say `{answered} of {claims}` |
| Filters → 0 | strip `N → 0`; each Q-block shows `No record in this register matches {filters}. This is a statement about the register, not about India.` naming the most-removing filter, with a one-click reset; the vendor grid, the case pairs and the 36-row table keep their rows |
| Unknown `cell`, `body`, `vendor`, `case`, `rec`, `sel`, `st`, `fy`, `sy`, `kind` | the default, with `ignored an unrecognised {param} value`; `vendor` naming a node outside `VENDORS`: `{label} is not a vendor in this register` |

---

## 11. Edge cases

| # | case | where | behaviour |
|---|---|---|---|
| E1 | A demand and its own line in one body × component × FY × stage (F4) | ledger | separate lanes; never added; the twin's `is_demand_level` column shows which the interim rule calls the demand |
| E2 | Published MoD total differs from its demand lines (F5) | Q1, twin | Q1 prints the published total; the twin's reconciliation column reads `differs by ₹{d} crore — computed here`; the derived gap counts the years |
| E3 | Two rows in one slot from two editions (a BE in the Summary and in the demand) | ledger | two thin bars, both drawn, both in the twin; the note says which edition the file preferred |
| E4 | A line renamed or renumbered across years (F6) | ledger | a second lane directly beneath, labelled `renamed or restructured in the document — not joined` |
| E5 | The 2016-17 one-year move of Ordnance Factories and R&D into MoD (Misc) | ledger | drawn as printed; the union-defence symmetry text, which explains it, is in Q3 |
| E6 | `cr === 0` (68 ASUMP released rows) | ledger, grants | `₹0 crore, as published`; a number, never hatch, never omitted |
| E7 | A body with 3 FYs of rows (J&K Police, Union) | ledger | the lane spans the full axis, 25 FYs hatched |
| E8 | J&K Police in two payers (F13) | ledger, state table, `st=jk` | both shown, each naming its payer; never added; the `StatePanel` lists both under separate headings |
| E9 | Delhi (`st=dl`) | Budgets | the state table row reads `Delhi's police is a Union demand line — see Q7`; the Delhi Police lane accented; no RBI row is invented |
| E10 | A commissionerate selected anywhere | every cell | budget `inside the state's police head`; strength the void; never a number (SG-RF2) |
| E11 | The District Police line (PRS, reported) | state table | its own column, the reported dash on the row's chip; never in the MH 2055 column |
| E12 | UP's own series beside its RBI row for the same FY | state table, `StatePanel` | both listed with their heads; the panel says `two documents; not added` |
| E13 | A strength row with `perLakh` null | map | hatched for that year, `per lakh not printed in this table`; counts in the twin |
| E14 | A strength count derived by the research (F10) | twin, readout | column heading `as the research file records them — read the note`; note verbatim; (S4) cell marked derived |
| E15 | A footprint kind with no row (prison, ordnance) | chips, matrix, legend | listed `none in this register`; chip `aria-disabled` |
| E16 | Many installations in one small state (Delhi) | map | jitter clamped to clearance; overflow drawn as `+{k}` beside the anchor, all listed in the readout and twin |
| E17 | A footprint row in a state with no polygon match | map | never happens with `StateCode` (gate); if a code fails to resolve, the row is listed under `not placed on the map: {code}` |
| E18 | A grant recipient that is not a `StateCode` (Ladakh; the merged DNH & DD) | grants | listed verbatim; never placed (S2 adds `la` as text-only) |
| E19 | Vendor with no award (a declared comparator) | award lanes, grid | empty lane `no named award in this register`; full card |
| E20 | The same minister's window in two or three files | office lanes | one bar `×{k} records`, each record in the twin with its tier and file |
| E21 | An open-ended window | office lanes, `officeOn` | outline to `asOf`, `end not recorded`; listed under "start recorded, no end recorded" |
| E22 | A decision date before the first role window (Bofors 1986) | case field 3 | `no recorded office window covers {date}` |
| E23 | A case under two ids (Adarsh) | case pairs, gaps | the case node's record only; the other id's records listed under `records under another id, not joined: {id}` beneath the column, and in the derived gap |
| E24 | A pair recorded by two files (Bofors ~ Rafale twice) | pair header | one pair row; both files named |
| E25 | A case with one record (Tatra) | pair | every field prints its null words; the counters read `1 record` (singular forms throughout) |
| E26 | An `alleged` award (Tatra, Rafale) | award lanes, vendor card | alleged dash; response tick; counted in `{alleged}` not in `{awards}` named |
| E27 | An award before 2014 or to a case vendor (Bofors 1986, AgustaWestland 2010) | award lanes | drawn at its date on the shared axis; the lanes begin at the earliest award, not 2014 |
| E28 | Bond donors who are not award vendors (MEIL, M&M, Cyient) | bonds | listed as donors; a card in `VENDORS` shows the bond only where the donor is the vendor or its recorded owner |
| E29 | A board pair with a missing office end date | board roles | `not computable: office end date not recorded` |
| E30 | `vendor` set to a node outside `VENDORS` | margin | `{label} is not a vendor in this register` and no card; Show connections offered |
| E31 | Audit-added response whose responder `s` is the subject itself | every response slot | responder printed `the audit (recorded on {subject})`; counted as a response |
| E32 | A response to a response (Army answering the Congress objection) | contract card, case column | indented under the response it answers, same size; depth ≤ 3 |
| E33 | Undated record | timelines, lanes | right gutter `undated`, counted in the lane label |
| E34 | `fy` range with no row for a body | ledger | lane drawn, range dimmed-in, `no row in FY{a}–FY{b}` in the lane's readout |
| E35 | `st` set on Procurement | rail | inactive with its reason; the param kept |
| E36 | A slice class with n < 10 (none today) | slice rates | dot and `{single} of {n}`, no whisker, no percentage |
| E37 | `security.json` from a different scrape than `rates.json` | slice | provenance digests printed; whole-file marks come from the slice file's own comparator fields only |
| E38 | Module regenerated with merged ids | everywhere | every count derived; anchors re-checked at load (SG-1) |
| E39 | 390 px | page | §12 |
| E40 | `view=table` | every lens | every twin open; graphics hidden; Q-headings and AnswerLines stay |

---

## 12. Mobile at 390 px (no horizontal page scroll)

`useNarrow()` = `matchMedia('(max-width: 639px)')`.

- **Head:** kicker, title, standfirst, standing line, then the `ResolutionStatement`
  stacked (label above words, mono line beneath; ≈ 320 px). Byline and the "built from" line
  move to the mono list under the first figcaption.
- **Pinned stack:** site header + one-line strip (fact 1 + date) + tabs ≤ 140 px. The
  `ReconciliationLine` is a `<ul>` under Q2's caption, not sticky.
- **Tabs:** full-width segmented, 44 px targets, wrap to two lines rather than hide.
- **Rail:** `<details>` labelled `Filters ({active}) · {N} → {k}`; effect line outside it.
- **Q1 AnswerLines:** one column; each figure on its own line.
- **Q2 LineLedger:** one stage at a time (§5.1.2), 14 px FY columns, sticky 120 px labels,
  inner horizontal scroll with "‹ earlier" / "later ›", body groups as open `<details>`. The
  twin renders by default under it; the drawing is behind `Show the ledger` only if a lane
  label would truncate below 12 px.
- **Q4 OfficeLanes:** shares the ledger's scroll position (one scroll container holds both,
  so the column reading survives).
- **Q6 StatePolice:** map A full width `clamp(300px, 70vw, 420px)`, `Open a state` select
  under its caption; map B's void card beneath; `StateTable` as `StackTable` cards (state,
  Police head by stage-year, strength, sources first).
- **Footprint map:** full width; dot radius ≥ 3 screen px; `kind` select replaces chips.
- **`AwardLanes`, `CaseTimeline`:** inner horizontal scroll, sticky 96 px label column,
  initial scroll at `asOf`.
- **`CasePairs`:** the two columns stack **field by field** (field 1 left case, field 1
  right case, field 2 left, field 2 right …), each field block labelled with its case, so a
  pair is still read side by side in sequence and never as two separate scrolls; the
  pairing sentence for an unpaired case sits in the right case's slot of every field.
- **`VendorGrid`:** one card per row; `VendorCard` opens inline after the card, with its
  comparators stacked directly beneath it, field by field like `CasePairs`.
- **`SliceRates`:** full width, no horizontal scroll: label line above each row, the scale
  under it; the reference values in text at the row end.
- **Tables with a response, source, rule or comparison column** render as `StackTable`
  cards with the response directly under the claim at the same size (finance U2).
- **Graph:** behind `Load the graph`.
- **Mono floor:** 12 px.
- **Gates:** at 360 and 390, `document.scrollingElement.scrollWidth ≤ innerWidth` on every
  lens, with `view=table`, with `cell`, `vendor`, `case` and `rec` open by URL (SG-31).

---

## 13. Accessibility

- **Landmarks and outline:** `h1` PageTitle; the `ResolutionStatement` is a `<section
  aria-labelledby>` with a visible `h2` "What resolves at which level"; `nav` (filters);
  `main`; an `h2` per lens panel; an `h3` per Q-block (`Q{n} — {question}`), `h4` for groups
  inside (ledger body groups, chapter heads, pair rows); `aside` with card `h2`s. No level
  skipped.
- **Tabs:** WAI-ARIA tabs, manual activation.
- **`LineLedger`:** a `role="grid"` with `aria-rowcount`/`aria-colcount`; row headers are the
  lane labels (`th scope="row"`), column headers the FYs; one tab stop (roving tabindex),
  arrows move, Home/End to the lane's first/last FY, Enter opens; each cell button's name is
  the full cell sentence (§5.1.2), and a slot without a row is named `no row in this
  register`. The bars are `aria-hidden`.
- **Maps:** the `WelfareMap` listbox model (36 options north to south, names carry class and
  value; for the footprint map, `{State}: {k} installations in {c} cities`); SVG shapes
  `aria-hidden`.
- **Timelines (office, awards, cases) and slice rates:** drawings `aria-hidden`; everything
  in their label-column buttons and twins; a skip link `Skip to the table` before each.
- **Case pairs:** each pair row is a `<section aria-labelledby>`; each column a `<dl>` whose
  `dt`s are the field names, so a screen reader reads field, then value, in the same order
  for both cases; the pairing sentence is a `dd`, never `aria-hidden`.
- **Vendor cards:** each a `<dl>` with identical `dt`s; the comparators in `VendorCard` are
  sibling `<dl>`s under one `h2` `"{vendor} beside {comparators}"`.
- **Response pairs:** one `<dl>` per item; never collapsed.
- **Live region:** exactly one, polite, debounced; words, never the arrow glyph.
- **Repeated controls name their row** (`Open the line: CRPF revenue FY2024-25`, `Show vendor:
  Larsen & Toubro`, `Show the pair: Bofors and Rafale`). No two enabled controls in one
  table, list or section share an accessible name.
- **Tables:** every `<table>` has a `<caption>` with name, population and filters; `th scope`;
  `aria-sort` on the sorted column.
- **Text:** `<abbr title="crore">cr</abbr>`, `<abbr title="Budget Estimate">BE</abbr>`,
  `<abbr title="Revised Estimate">RE</abbr>` on first use per table; numbers `font-mono
  tabular-nums`; contrast ≥ 4.5:1 text, ≥ 3:1 hatch, dots, dash strokes, the zero tick.
- **Targets:** 44 px coarse, 24 px fine.
- **Keyboard budget:** counting from the first focusable element in `<main>`: the ledger grid
  in ≤ 18 tab stops at 1280 (the rail, tabs, Find and Q1's three "Open the line" links come
  before it); the per-lakh map listbox in ≤ 30; on Procurement, the first case pair row in ≤
  40 (the vendor grid's cards are one tab stop each, with inner buttons reached by Enter).
- **Motion:** `prefers-reduced-motion` honoured everywhere.

---

## 14. What the page refuses to show, and why (`id="refusals"`)

- **A city police budget other than Delhi**, in any form: a number, an estimate, a share of
  the state's head, a per-capita figure. It is not published (Review Focus 2).
- **A total computed across budget rows** — defence, police or "security spending" — or a
  stacked chart that adds a demand to its own lines. The documents' hierarchy is not yet a
  field, and the published defence total differs from the sum of its lines in five of the
  twelve years where both exist (F4, F5).
- **A map of money by city, or of footprint by money.** Installations are places; no budget
  attaches to them here.
- **A per-capita spending map without a population series**, or one built from figures parsed
  out of prose (F9).
- **A vendor shown alone**, a vendor leaderboard, or a share of awards by vendor or class
  computed from a sample of named releases (F14, F15).
- **A ranking, score or index** of states, forces, vendors, officers or cases: no "most
  militarised state", no "riskiest buyer", no "most connected".
- **A case without the case recorded as its control beside it**, or without its answer slot;
  a case drawn as an edge to a party.
- **Party as a colour, a filter, a sort or a column the page writes.** No ruling-party map, no
  government-era toggle: the symmetry texts carry the comparison, quoted.
- **Outcome rates by state** (custodial deaths, firings) until they are rows with their
  denominators (S7); never as a colour.
- **Names of open-market winners** from the CPPP slice: they cannot be given the comparator
  rule this page holds vendors to; the tender register names marked winners under its own
  rule.
- **Operational detail**: deployments, orders of battle, procurement the Ministry has not
  announced, the addresses of jails.
- **A person below the public rank**, or any salary of a named person. Pay levels only.
- **A merge of two ids by name** (Adarsh's two ids; the same minister across files is grouped
  by id and date, never by name).

---

## 15. Decisions

| # | decision | alternative rejected | why |
|---|---|---|---|
| D1 | **Question-first answer sequences**: every lens is numbered Q-blocks in the order a careful reader asks (§2.1); a graphic only where it answers faster than a sentence | a dashboard of the briefed graphics in brief order | The reader's questions are the denominator of the page: a block per question makes an unanswered one visible as an empty block, not as a missing chart |
| D2 | Derivations hold only anchors (§3.2); **the page prints module counts only** | figures from this document's §0.2 | The run will be reconciled; ids may merge |
| D3 | **Every ₹ goes through `crContext`**: its denominator (the published parent it sits inside, a of b, `computed here`; or the words saying none is published) and its comparison (the previous FY at the same stage) render beside it, in the same element | a ₹ with a tooltip; a share of a page-computed total | Stance rule 1; a share of a computed total would inherit F5's error |
| D4 | **The three-level resolution statement sits in the page head**, on every lens, never sticky, never collapsed, words restating spec §2 with derived counts | the statement in a footer, a gaps panel, or the Budgets lens only | It governs what every lens can answer; "what can this page know" is the reader's first question before "how much" |
| D5 | **No stacked chart and no page total over budget rows.** The published totals are drawn as their own lanes; parts and parents are separate lanes | the brief's "stacked components by year" now | F4 (269 nested cells, no parent field) and F5 (computed totals wrong in 5 of 12 checkable years). With S1 a stack is drawn only for parts of a published parent, with the published total as a tick over it |
| D6 | Reconciliation of parts against the published total is a **twin column, `computed here`**, and a derived gap line | a visible "difference" mark on the chart | The difference is a fact about the register's transcription and the documents' netting, worth exporting, not a finding to draw |
| D7 | `LineLedger`: **periods as columns, three stage slots per FY by position, a lane scale per row** with its max printed | one shared ₹ scale; a line chart; stages as colour or dash | Missing periods are the story (F3); position is the free channel; dash is tier and hue is family (frozen); a shared scale draws most lanes as nothing |
| D8 | Lane key = body + component + line as printed (prefix and edition suffix stripped); a renamed line is a second lane beneath, labelled | a hand-written crosswalk of renamed lines | Nothing hand-written (F6); S1's `line` key replaces it |
| D9 | Base rates as verbatim cards beside each answer ("Compared with what?"), not charts | parsing the FY from `property` to chart shares | F24; S3 |
| D10 | `OfficeLanes` share the ledger's x-grid, directly beneath it | a separate timeline section | "Who decided" is read down a column from "how much"; the date test sentence is in C4 |
| D11 | Grants to states: a table with the head verbatim; no map; `st` inactive on grants until S2 | parsing the recipient from the head and matching names | F7: four recipient names do not match a map code (Ladakh has none; DNH & DD is two codes); a parser would silently drop or merge them |
| D12 | The 36-row `StateTable` keeps RBI MH 2055, the state's own series and PRS District Police in **separate columns**, never added | one "state police spending" column | F8: three documents, three heads, one of them a part of another |
| D13 | **Per-capita map withheld with a void card in its frame**; the per-lakh strength map draws today | a ₹-crore choropleth (no denominator); per-capita parsed from prose | F9; a ₹ choropleth of states is a population map; stance rule 1 |
| D14 | The per-lakh map's frame carries the reported dash and chip because every row behind it is reported; derived counts only in the twin | drawing the map solid; mapping derived counts | F10; the figure's weakest tier is its tier |
| D15 | `CITY_POLICE_TEXT` is an anchor and the **only** content a non-Delhi city budget cell may hold | a blank; `n/a`; `—`; "not published" | Review Focus 2's exact words; one string, one gate |
| D16 | Delhi Police is a lane of its own group in the ledger, a Q1 answer line, and the first row of every city table | Delhi only in the footprint lens | It is the one city budget; the reader asking "which city?" gets the answer in the Budgets lens |
| D17 | Footprint: **one neutral dot per installation, positioned within state (not geocoded); kind is a table and a filter, not a mark channel** | glyphs by kind; colour by kind; a choropleth of counts | Shape is entity type and hue is family (frozen); no coordinates exist (F11); a count choropleth reads as "militarisation" and measures list coverage |
| D18 | The FY filter does not reach the footprint and says why | filtering by `since` | 217 of 221 rows are undated |
| D19 | No "DAC approvals by category and vendor class" graphic; the DAC void prints in Procurement Q6 | drawing approvals without vendors; inferring class from `ty` | F14, F16 |
| D20 | `VENDORS` = MoD award recipients ∪ their declared comparators (analytic edges), never a hand list | a list of "defence vendors" from identities' prose | Structural; brings Adani Defence in through its recorded comparisons (F15) |
| D21 | **A vendor never renders alone** (frozen 8): the grid always shows every vendor; `vendor` accents and opens a card with its comparators, or the other family band when none is declared | a vendor filter guarded by a minimum; a card on its own | Review Focus 3 must be structural; a guard can be bypassed by URL |
| D22 | Award lanes carry **no amount channel**; ₹ in readout and twin | tick height or width by ₹ | Named awards are a sample of releases with priced and unpriced contracts and joint totals (voids); a ₹ length measures research attention |
| D23 | Case pairs are **read from analytic case↔case edges**; pairs drawn in one row, two equal columns, identical field rows aligned by subgrid; left column = earlier first record | a hand list of pairs; a party-sided layout (left = one party) | Stance rule 5; the left/right rule must be neutral and stated |
| D24 | An unpaired case keeps an equal-width right column with the exact pairing sentence | showing it alone at full width | Absence of a control is a result, at the same prominence |
| D25 | Case fields are classified by the **source node's `ty` and `fam`** (court, auditor, investigator), never by text; decision and office fields print "not joined" until S8 | keyword-matching `lab` ("CBI", "CAG") | F18; no text classification |
| D26 | Bonds: a donor × every-party table, the vendor-bond void at the same size; no chart | a donor → party Sankey | Eleven rows from three donors read faster as a table; a flow would invite a reading of size |
| D27 | Board roles print the months between office and board (`computed here`) beside the rule text and its void | a "revolving door" flag | The interval and the rule are the record; the judgement is the reader's |
| D28 | The procurement lens's **spine is the symmetry chapters**: each chapter opens with its domain's symmetry text verbatim before any figure; the ControlCard on that lens only links to them | symmetry in the margin only (finance) | The question on this lens is always "and the other side?"; the answer leads |
| D29 | `SliceRates`: rates by class beside both whole-file references; no slice-wide rate as a finding; no winner names | one headline rate; the concentration lists | F25: the works class is three quarters of the slice; names cannot get the comparator rule |
| D30 | Contract cards split responses into columns by the **responder node's `ty`/`fam`** and print that rule in the card foot | a hand-assigned "for"/"against" | Stance rule 2 with identical fields and no hand classification |
| D31 | The Agnipath card says the record does not join it to the replaced terms and links to the pay-levels table | placing the Level 3 row in the card | Pairing them is a judgement no edge records (S10) |
| D32 | Outcome rates by state: not drawn until S7; base rates and the state-police symmetry quoted | per-state values parsed from base-rate labels | F24; stance rule 4 asks for rates over strength and population as data, not prose |
| D33 | `stage` exists only below 640 px, defaulting to BE with the reason on the control | three slots at 390 | 84 slots do not fit; BE is the only stage present in every FY (F3) |
| D34 | Lens switching keeps `fy`, `st`, `tier`, `find`, `sel`; clears `rec`, `cell` | resetting | Finance D44 |
| D35 | `tier` shared with `GraphExplorer`; series rows are documented or reported by the `reported:` prefix until S4 | a separate series tier param | One evidence filter means one thing |
| D36 | The graph draws the module's edges only; series rows are never edges | synthetic edges from budget rows | A budget line is not a relationship; 4,096 synthetic edges would be a hairball of one payer |
| D37 | The CPPP slice loads after mount through `loadSecurity()` (S9) | a static import | House pattern (`cppp.ts`): the slice should not ride in the entry |
| D38 | Q-block numbering is fixed per lens and blocks never disappear | hiding empty blocks | A reader's "Q4 on Budgets" must be a stable address; an empty answer is an answer |
| D39 | Every twin exports TSV with the `#` header (finance D39) | — | P must reproduce the screen |
| D40 | Refusals at `#refusals`, linked from the rail foot; no `party` param | silent absence | Refusals are method |
| D41 | The killed claim and its reason are printed in the Gaps panel | omitting killed claims | Retained, never deleted, is the platform's rule |

---

## 16. Acceptance gates

For `scripts/pages/security.test.mjs`, run against a pinned `SECURITY_DIST` in two builds:
FULL (current module) and EMPTY (`META.empty` fixture), plus a **ZERO-SERIES** fixture
(`FORCE_BUDGETS = FORCE_STRENGTH = FORCE_FOOTPRINT = []`, graph unchanged). **Every expected
value is computed by the test from the generated module independently of `securityView.ts`.**
(S) marks a criterion that asserts both the interim and the post-prerequisite behaviour.

**Review Focus**

- **SG-RF1.** (S) For every budget, strength or footprint row whose `note` begins `reported:`
  (or, with S4, `tier === 'reported'`), every surface that shows it (ledger cell name,
  `CellCard`, `StateTable` cell, twin row, `PlaceList` row) contains the word `reported` and
  draws its mark in the reported dash; no such row is drawn solid. The six PRS District Police
  rows appear only in the District Police column.
- **SG-RF2.** For every footprint row with `kind === 'commissionerate'` and every city other
  than Delhi that any surface lists, its budget cell's text is exactly `inside the state's
  police head` (Budgets Q7, Footprint Q3, `StatePanel`, Find results, twins, TSV). No such
  cell contains a digit, `₹`, `—` or is empty. The string appears in the head's city row.
- **SG-RF3.** For every URL in {`?lens=procurement`, every `&vendor={id}` for `id` in the
  test's own vendor set, `&fy={each FY with ≥ 1 award}`, `&tier=documented`, `&tier=alleged`,
  `&find={each vendor label}`}, at 1280 and 390: the vendor grid renders every vendor of the
  test's set; when `vendor` is set, the margin (or inline card at 390) contains the fields of
  at least two vendors, one of them the selected vendor and the other a declared comparator or
  a member of the other family. No DOM state contains exactly one vendor `<dl>`.
- **SG-RF4.** No page-authored string (outside quoted symmetry text, narrative text, record
  `lab`/`d`, role labels and node `sub`) contains `UPA`, `NDA`, `BJP`, `Congress`, `ruling`,
  `opposition` or `government of the day`; no element's fill or stroke is keyed to party text.
- **SG-RF5.** For every node with the case prefix: it renders inside a pair row whose other
  column is its recorded pair (the test reads the analytic case↔case edges itself) or the exact
  sentence `No control pairing recorded for this case in the register.`; both columns have the
  same set of field labels in the same order; every enforce and alleged record in a case file
  shows a response or the exact sentence `No response recorded — asked/not asked unknown`.
  Bofors and Rafale are in one pair row.

**Data integrity**

- **SG-1.** Every anchor (§3.2) exists in the module (head values, ids, domain values); removing
  one fails the build.
- **SG-2.** With `META.empty`, smoke passes, every Q-block heading renders, the resolution
  statement keeps its words, and no figure reads 0 where a count is unavailable. With the
  ZERO-SERIES fixture, each series' blocks render their headings and the no-rows sentence, and
  the procurement lens is unchanged.
- **SG-3.** No numeric literal other than layout constants in `src/components/security/*` or
  `src/pages/Security.tsx` (grep with a px/ms allow-list).
- **SG-4.** **No ₹ figure on the page equals a sum of two or more budget rows** unless that
  figure is itself a row's `cr`: the test collects every `₹` figure in the DOM and in every TSV
  export and asserts each is a row's `cr`, a base-rate numerator or denominator, an award `a`,
  a bond `a`, or a `computed here` share; no export header or `aria-label` carries a total.
- **SG-5.** The `ReconciliationLine`'s Budgets terms sum to `FORCE_BUDGETS.length`; the
  Footprint terms to `FORCE_FOOTPRINT.length` with every declared kind printed.
- **SG-6.** Every ₹ element has, within the same element, a denominator text (a of b with
  `computed here`, or one of the no-denominator sentences) and a comparison text (§3.2
  `crContext`).
- **SG-7.** Q1's defence figure equals the module's `MOD_ALL_DEMANDS` row for the stated FY and
  stage, or the no-published-total sentence is present; for a fixture FY with demand lines and
  no published total, no ₹ appears in Q1's defence line.
- **SG-8.** For every FY in `FY_AXIS` and every lane, the ledger renders three slots; a slot
  with no row has the accessible name `no row in this register` and the hatch class; a row with
  `cr === 0` renders the zero tick and `₹0 crore, as published`, never the hatch.
- **SG-9.** (S) Without S2, no grant row is placed on a map and `st` is `aria-disabled` on the
  grants table with its reason; with S2, grant rows filter by `recipient` and a Ladakh row is
  listed and not placed.
- **SG-10.** (S) Without S5, map B is the void card and no per-resident figure appears; with S5,
  map B draws and every per-resident figure carries `computed here`.
- **SG-11.** The per-lakh map's bins are identical under every `sy`, `fy` and `st` (pooled); a
  state with no row for `sy` is hatched.
- **SG-12.** The resolution statement's three mono lines equal the test's own counts (Union
  rows, bodies, FY range, actual FYs; states with a Police-head row, own series, strength rows,
  reported strength rows; Delhi rows, commissionerates, cities).
- **SG-13.** The footprint legend, chips and matrix list all eleven declared kinds; prison and
  ordnance read `none in this register` while they have no row.
- **SG-14.** `VENDORS` equals the test's own set (award targets from the MoD node ∪ declared
  comparators by analytic edge with `ty ∈ {company, psu}`); `CASE_PAIRS` equals its own
  unordered pair set.
- **SG-15.** No case field's classification depends on text: a fixture case record whose `lab`
  says "CBI" but whose source node is a court lands in the Court row.
- **SG-16.** Every contract card has two columns with identical field labels; the card foot
  prints the column rule.

**Twins and exports**

- **SG-21.** For each graphic, twin rows = drawn marks plus empty positions: ledger long form =
  rows in view; coverage twin = lanes × FYs; per-lakh map 36; footprint matrix 36 × 11; award
  twin = award ticks; case twin = case ticks; slice twin = classes + 2 reference rows; office
  twin = role records. Empty positions carry the null words, never blank or 0.
- **SG-22.** Every TSV begins with `#` lines including the table name, `runId`, `asOf`, the
  filters and, where ₹ appear, `# amounts: ₹ crore as published, nominal; not deflated`; data
  rows equal the union over every `tp`; numeric machine columns parse as numbers or are empty.

**Encoding**

- **SG-30.** Greyscale screenshots at 390 and 1280 on each lens: hatch, zero tick, ramp floor,
  dot and ground pairwise distinguishable (ΔL ≥ 8); the four tier dashes distinct; the
  reported-dash map frame distinct from solid.
- **SG-31.** At 360 and 390, on each lens, with `view=table`, and with `cell`, `vendor`, `case`,
  `rec` set by URL, `scrollWidth ≤ innerWidth`.
- **SG-32.** No `fill` or `stroke` is a function of party, state government, footprint kind,
  stage or component; footprint dots share one fill.
- **SG-33.** At 1280×800 on Budgets, Q1's three answer lines and the start of Q2 are within the
  first viewport; at 390×844 the strip, tabs and rail summary are within 844 px and Q1 within
  1,688 px; the pinned stack ≤ 140 px.

**URL and interaction**

- **SG-34.** Every param round-trips; unknown values produce the ignored notice; defaults are
  elided; no param pre-selects an entity.
- **SG-35.** `body`, `vendor` and `case` never reduce the number of lanes, cards or pair rows.
- **SG-36.** Changing `tier` changes the graph's drawn edge count; a claim shown keeps its
  response visible whatever the response's tier.
- **SG-37.** The page never writes `q`, `fam`, `ty`, `amt`, `path`; changing `lens` keeps `fy`,
  `st`, `tier`, `sel` and removes `rec`, `cell`.
- **SG-38.** The energy and welfare suites stay at their pinned counts after any shared
  component change (`TenureLanes`, `WelfareMap`).

**Reader paths (scripted, 1280 and 390)**

- **SG-40.** B-J: type a CAPF's label, "Show its budget lines", open a cell: the `CellCard`
  shows a ₹ with stage and FY, a denominator text, a comparison text, a tier, an `http` source
  and a citation, in ≤ 3 interactions.
- **SG-41.** F-J: type a commissionerate's city: the result and the row it opens show `inside
  the state's police head`, in ≤ 2 interactions.
- **SG-42.** P-J: type a vendor label with no award (a declared comparator): `VendorCard` shows
  it beside its comparators with identical `dt`s, in ≤ 2 interactions.
- **SG-43.** P-S: activate Procurement; within one scroll of the chapter 4 heading, the
  Bofors and Rafale columns are in one row with equal computed widths (±1 px) and equal font
  sizes.

**Accessibility**

- **SG-45.** axe: 0 serious or critical on each lens and each panel state.
- **SG-46.** Tabs, ledger grid, map listboxes keyboard-complete within the §13 budgets.
- **SG-47.** Exactly one `aria-live` region; no message contains `→`.
- **SG-48.** The gaps panel and every `CannotShow` render at the findings' body size and list
  every `FORCE_VOIDS` entry of the lens's domains.
- **SG-49.** Finance FG-49's structural checks (closed twins expose nothing; nothing focusable
  inside `aria-hidden`; every table captioned; no heading skips; no duplicate accessible names
  within a section; every `aria-describedby` resolves).

**Loading**

- **SG-50.** Build with and without the route; print entry and `/security` chunk sizes; fail if
  a string unique to `src/components/security/*` or `securityView.ts` is in the entry, or if
  `security.json` content is in any chunk other than its own.

---

## 17. Build estimate

**Create**

| file | contents | est. lines |
|---|---|---|
| `src/data/security.ts` | re-exports, prerequisite shims (`null` when absent) | 60 |
| `src/data/securityView.ts` | §3.2 derivations, `crContext`, `reconcileStatus`, `caseFile`, `caseFields`, `vendorFields`, `derivedGaps`, `tsv` reuse | 620 |
| `src/pages/Security.tsx` | composition, URL wiring, lens tabs, margin precedence, all states (replaces the scaffold) | 380 |
| `src/components/security/Head.tsx` | `ResolutionStatement`, strip facts, `ReconciliationLine` | 200 |
| `src/components/security/BudgetsLens.tsx` | `AnswerLines`, `LineLedger`, `OfficeLanes` wiring, `PayTerms`, `ContractCards`, `StatePolice`, `CityLine`, `GrantsTable` | 760 |
| `src/components/security/FootprintLens.tsx` | `FootprintMap`, `KindMatrix`, `PlaceList`, `CityPoliceTable` | 340 |
| `src/components/security/ProcurementLens.tsx` | `SymmetryContents`, `AwardLanes`, `VendorGrid`, `SliceRates`, `BondTable`, `BoardRoles`, `CaseTimeline`, `CasePairs` | 820 |
| `src/components/security/Panels.tsx` | `CellCard`, `BodyCard`, `VendorCard`, `StatePanel` (+ finance `RecordCard`) | 320 |
| `src/components/security/Sections.tsx` | `CompareBlock`, narratives, `CannotShow`, contested, gaps (derived + killed), refusals, ledger | 240 |
| `scripts/security-view.test.mjs` | derivations against fixtures (lane key, `isDemandLevel`, `reconcileStatus`, `crContext`, `VENDORS`, `CASE_PAIRS`, `caseFields`) | 260 |
| `scripts/pages/security.test.mjs` | §16, RED first | 780 |

**Modify**

| file | change | est. lines |
|---|---|---|
| `src/data/cppp.ts` | S9: `SecurityFile` type and `loadSecurity()` | 70 |
| `src/components/energy/TenureLanes.tsx` | optional `asOf`, `edgeById`, `xGrid` (column edges supplied by the ledger); energy call sites unchanged | 60 |
| `src/components/welfare/WelfareMap.tsx` | rows loosened (if not already by finance) and an optional `frameDash` prop | 10 |
| `scripts/smoke.mjs` | §3.1 URLs | 8 |
| `package.json` | `test:pages` gains the suite | 1 |
| research and assembler (S1–S8, G5) | reviewed separately; the page ships without them | — |

Reused by name, unchanged: finance `RecordCard`, `Responses`, `Twin`, `Table`, `Cards`,
`Exports`, `Effect`, `Caption`, `Src`, `TierWord`, `Dash`, `ScrollBox`, `useNarrow`, `Segmented`,
`BaseRateLine`; welfare `NarrativeLadder`, `TexturePatterns`, `TextureSwatch`; energy
`StackTable`; viz `GraphExplorer`, `IndiaMap` geometry; existing `GapsPanel`,
`DenominatorStrip`, `ContestedList`, `SourceLedger`, `TierLegend`.

---

## 18. Open risks for review

1. **The ledger is large.** 135 non-grant lanes × 28 FYs × 3 slots. It is the honest form of
   a register whose hierarchy is text (F4), but a reader may find it a wall. Mitigations: the
   published-total lanes first, Q1's sentences above it, `body` accent from Find, open body
   groups with counts. The UX review should test whether J reaches a figure in three steps.
   S1 shrinks it most.
2. **Withholding the stacked chart departs from the brief** (spec §4.4). D5 rests on F5's
   computed-vs-published mismatch; if the judge prefers a stack now, it must at least be
   limited to the 7 reconciled FYs and drawn with the published total as a tick, and the
   other years must read "not stacked: no published total or the parts differ".
3. **Withholding the per-capita map departs from the brief.** The per-lakh map is a
   per-resident measure today; the void card sits in the frame. S5 is small research.
4. **Interim text rules** (the `reported:` prefix; the demand-level regex; the lane key's
   prefix strip) read text the fleet wrote. Each has an anchor and a gate (SG-1, SG-RF1,
   SG-8), and a structured replacement (S1, S4).
5. **Case files by the touch rule are thin** (Tatra 1 record; decisions joined for one case of
   seven). The pairs still render with identical fields and null words; S8 fixes depth. A
   reader may read thinness as innocence or as cover-up; C16 says density is documentation.
6. **Vendor families are coarse**: foreign and Indian private firms share the private-capital
   band (F14). The vendor card says so; S6 is a declaration the procurement file can make.
7. **Party appears inside quoted symmetry texts at body size.** That is the research's own
   wording and the platform's practice; SG-RF4 keeps it out of the page's own words. A UX
   reviewer from each side should test whether the chapter heads read as partisan framing.
8. **The open-market slice is three quarters works tenders**; even split by class, a reader may
   carry the slice-wide rate away. The slice-wide row is drawn last, below a rule, labelled.
9. **Ladakh and the merged DNH & DD** cannot be drawn on the current map geometry; grants name
   them. S2's `recipient` must allow a text-only code, and `india-map` may need a Ladakh
   polygon (outside this page).
10. **The entry chunk** carries the force module's nodes and edges through `DataContext` (all
    fleets do); the series must stay out of it (G5, SG-50).
