# /security: The money India spends on force (design spec, judged)

*Status: judged spec for `/security`, 2026-10-04, synthesised from two candidates that stay
on file: `SECURITY_PAGE.candidate-A.md` (graphic-first) and `SECURITY_PAGE.candidate-B.md`
(question-first). The scores and the record of what came from where are in
`SECURITY_JUDGEMENT.md`. Binding brief: spec
`docs/superpowers/specs/2026-10-04-force-finance-design.md` §0 (assumptions), §2 (what
resolves at which level), §3 (the five stance rules), §4.4 (the page), and the plan's Review
Focus 1–3 (`docs/superpowers/plans/2026-10-04-force-finance.md`). House form:
`FINANCE_PAGE.md` (§0.2, §3, §8, §13, §14, §16), `ENERGY_PAGE.md` §6 (frozen channels; the
brief calls it §8) and §8 (no partisan frame in the page's own words). Skills:
`interface-design`, `india-map`, `graph-schema`, `cui-bono`.*

*[UX review] Revised 2026-10-04 after a five-persona **SYNTHETIC** UX review (journalist,
policy researcher, hostile skeptic, screen-reader user, 390 px phone on a slow connection):
`SECURITY_UX_REVIEW.md`. No real reader was consulted and no page was rendered; the findings
are hypotheses to test with real readers. The 33 must-level amendments are applied in place,
each marked `[UX review] (Un)`; the 46 should- and could-level amendments are listed at the
end under "Deferred amendments" as UD1–UD46 (`UD`, because §15 already uses D1–D61).*

*Data contract: `src/graph/force.generated.ts` (`FORCE_NODES`, `FORCE_EDGES`,
`FORCE_EDGE_DOMAIN`, `FORCE_BENEFITS`, `FORCE_VOIDS`, `FORCE_NARRATIVES`, `FORCE_BASE_RATES`,
`FORCE_SYMMETRY`, `FORCE_GAPS`, `FORCE_IDENTITY`, `FORCE_BUDGETS`, `FORCE_STRENGTH`,
`FORCE_FOOTPRINT`, `FORCE_META`); the row types `BudgetRow`, `StrengthRow`, `FootprintRow`
from `src/graph/fleet.ts`; `research/raw/cppp/security.json` through a typed accessor in
`src/data/cppp.ts` (prerequisite S8); `STATES`, `STATE_BY_ID`, `resolveState` from
`src/data/geo.ts`; `STATE_ECONOMY` from `src/data/companies.ts` (GSDP fields only, F22);
`TIERS` from `src/graph/schema.ts`; `FAMILY_COLOR`, `FAMILY_LABEL`, `PRED_LABEL` from
`src/components/viz/ForceGraph.tsx`; `DEFAULT_RAMP` and the quantile-bin helper from
`src/components/viz/IndiaMap.tsx`; `TexturePatterns`, `TextureSwatch`, `ZERO_FILL`,
`MAP_ORDER` from `src/components/welfare/WelfareMap.tsx`; the merged graph from `useData()`
only to resolve endpoint labels outside the force module (`pol:`, `wel:`, `energy:`, `fin:`,
`co:`, `grp:`, party ids).*

**No figure in this document is page copy.** Every `{brace}` the page prints is derived at
module scope in `src/data/securityView.ts`, or in a `useMemo` keyed on the parsed URL. The
counts in §0.2 are the judge's reading of **run-92066c7bcf73** (`FORCE_META.asOf`
2026-10-04, generator 1.4.1), computed on 2026-10-04 by a node script over the module
transpiled with esbuild and over `research/raw/cppp/security.json`,
`research/raw/state-economy.json` and `src/data/india-geo.json`. They justify decisions and
may not be copied into a component. The run will be reconciled (ids may merge, counts may
move): **the page prints module counts only**, and every gate in §16 computes its expected
value from the module independently of `securityView.ts`.

---

## 0. Judge's note

### 0.1 Scores

Nine axes, 1–5 each, scored on the candidates as written against the brief and against the
module as the judge read it (`SECURITY_JUDGEMENT.md` §2 has the reasoning per axis).

| axis | A (graphic-first) | B (question-first) |
|---|---|---|
| honesty of denominators and voids | 4 | 5 |
| fidelity to the five stance rules | 4 | 5 |
| use of the three series (uses, not decorates) | 5 | 3 |
| city-level honesty | 5 | 5 |
| reuse of existing components and frozen channels | 4 | 4 |
| testability of the acceptance gates | 4 | 5 |
| mobile (390 px, no horizontal scroll) | 4 | 4 |
| accessibility | 4 | 4 |
| build cost | 3 | 3 |
| **total** | **37** | **38** |

**B is the base.** Its rules are structural where A's are positional: every ₹ passes
through one derivation that returns its denominator and its comparison (`crContext`);
vendors, their comparators and the case pairs are read from edges, never from an anchor
list; the three-level resolution statement is in the page head with derived counts; an
unanswered question stays on the page as an empty numbered block; the gate suite collects
every ₹ in the DOM and proves it is a row, a declared figure or a labelled share; a
zero-series fixture is first-class.

**A supplies the graphics B withheld**, because B's two central refusals are stricter than
the data requires. The four Ministry of Defence demands are disjoint voted grants and the
Ministry's own Summary adds them: the demand-level stack is a sum of parts of a published
parent, which is B's own condition for a stack (B D5), and the published total differs from
that sum by at most 0.76% in 5 of the 12 FYs that print one (F7). The spend map's
denominator is a same-FY GSDP series already in the repository; it is `reported` and from a
different register, and the map says so, which is better than a void card where the brief
asked for a choropleth. Both are drawn under the honesty conditions in §5.1.

### 0.2 Facts about the modules that decide the design

Read on 2026-10-04 from the transpiled module (run-92066c7bcf73), `security.json`,
`state-economy.json` and `india-geo.json`. Design evidence, not page copy. Where a
candidate's §0 figure differs, the judge's figure and rule are given.

| # | Fact (computed) | Consequence |
|---|---|---|
| F1 | `FORCE_META`: 8 research files; 265 nodes; 384 edges (343 claims in + 42 audit-added `contra` − 1 killed); `killed` 1 (`footprint:c014`, killed on its own `killIf`: the CRPF training count), `excluded` 0; 44 ids merged in reconciliation, 0 mappings; audit 107 verdicts, 30 unmatched; 13 benefit rows; 67 voids; 89 gaps; 44 narratives; 296 base rates (1 with a `null` figure); 8 symmetry texts, one per domain; `FORCE_IDENTITY` has 265 entries, every one with a `publicRole`. **`FORCE_EDGE_DOMAIN` has 385 keys: the killed claim keeps its domain entry.** | Every derivation iterates `FORCE_EDGES`, never the domain map's keys (D3). The killed claim is printed in Gaps with its reason (D54). |
| F2 | `FORCE_BUDGETS` 4,096 rows: Union 3,905; 30 state payers 191. Components total 1,332 · revenue 942 · capital 815 · grant-to-states 467 · pay 278 · pension 173 · other 89. Stages BE 1,804 · RE 1,200 · actual 1,092. 28 FY labels, `1999-00` → `2026-27`, with no FY missing between them. No duplicate `(payer, body, head, component, fy, stage)`; no row with empty `srcs`. 68 rows have `cr === 0`, all `force:mpf-scheme` ASUMP `Released` `actual`. Positive values span ₹0.08 cr (NATGRID, 2009-10 actual) to ₹6,81,210.27 cr (the all-demands Summary total, 2025-26 BE): seven orders of magnitude. | The FY axis is the 28 labels (`FY_AXIS`). A recorded zero is a figure, drawn with `ZERO_FILL` and the words `₹0 cr — as recorded`, never a hatch (frozen §8.2.5). No single ₹ scale serves every line (D12). |
| F3 | Union rows overlap by level. In 2024-25 actual, `Demand 20 — Defence Services (Revenue)` ₹2,90,964.51 cr contains `…: Defence Services - Army` ₹1,98,025.76 cr, which contains `…: Pay and Allowances of the Army` ₹1,13,801.21 cr. The hierarchy is in `head` text only: 269 of the 3,284 Union `(body, component, fy, stage)` cells hold more than one row (238 of 3,192 without grants). There is no `level` or `parent` field. | **No total adds rows from two levels.** Pay, Agnipath, Delhi Police and every sub-line are brackets, ticks or their own lanes, never stacked bands (D6, D7). S1 adds the field; until then the demand level is selected by the head's printed form, with a gate. |
| F4 | Union coverage differs by side. MHA-side bodies (the ministry, the seven CAPFs, IB, SPG, Delhi Police, Cabinet Secretariat, ED): BE 28 FYs from 1999-00, RE 27, actual 16 (2009-10 → 2024-25). MoD-side bodies (the ministry, Army, Navy, Air Force, DRDO, Defence Pensions, OFB): BE 27 from 2000-01, RE 11, actual 9. Per body the FY span runs from 3 (`force:jk-police`, 2024-25 →) to 28. Union actuals exist for no FY before 2009-10. | Partial is the normal state: every lane draws all 28 FYs with three stage slots and hatches the empty ones; the stack's default stage is derived from coverage (BE, 27 of 27 defence FYs) and never hand-set (D9). |
| F5 | **Demand-level defence rows** (bodies `min:ministry-of-defence`, `force:indian-army`, `force:indian-navy`, `force:indian-air-force`, `force:drdo`, `force:defence-pensions`, `force:ofb`; head `Demand N — {title}` with no `:` sub-line, with or without the suffix ` (Summary of Demands for Grants, BE)`): 256 rows; BE in all 27 FYs 2000-01 → 2026-27, RE in 11 (2000-01, 2004-05, 2008-09, 2010-11, 2013-14, 2015-16, 2017-18, 2019-20, 2021-22, 2023-24, 2025-26), actual in 9 (2009-10, 2012-13, 2013-14, 2014-15, 2016-17, 2018-19, 2020-21, 2022-23, 2024-25). Components: revenue 116 · capital 47 · pension 47 · total 46 (the MoD civil/misc demands are `total`). 2013-14 actual holds only `Defence Pensions` and `Capital Outlay`. Five BE FYs (2002-03, 2003-04, 2006-07, 2007-08, 2012-13) carry only Summary rows. | The stack draws one band per demand-level row, keyed by `component`, with the MoD civil/misc demand as the fourth band (D5). A missing `(fy, stage)` is a hatched column; 2013-14 actual is two bands and a labelled hatched remainder (E4). |
| F6 | The demand structure changes. BE demands per FY: 6 (2000-01, 2001-02) · 7 (2002-03 → 2008-09, 2011-12 → 2013-14) · 8 (2009-10, 2010-11, 2014-15: Ordnance Factories and R&D both separate) · **4 from 2015-16** (Civil/Misc, Defence Services (Revenue), Capital Outlay, Defence Pensions). Demand numbers move between 13 and 28; Delhi Police sits under nine demand numbers (43, 47, 48, 50–55). | Bands are by `component`, never by demand number (E1); a dotted assembly rule marks each FY where the count of revenue demands changes (D8). Lane keys strip the `Demand N — ` prefix and the edition suffix (D11). |
| F7 | `Ministry of Defence — all demands (Summary of Demands for Grants, BE)` exists for 12 BE FYs (2002-03, 2003-04, 2004-05, 2006-07, 2007-08, 2010-11, 2012-13, 2017-18, 2019-20, 2021-22, 2023-24, 2025-26). The sum of that FY's demand-level rows (Summary rows only where no other rows exist) **equals it to the rupee crore in 7** and exceeds it in 5: 2003-04 +₹582.61 cr (0.757%), 2004-05 +₹417.22 cr (0.468%), 2006-07 +₹336.31 cr (0.323%), 2007-08 +₹356.49 cr (0.316%), 2012-13 +₹535.09 cr (0.225%). | The stack is drawn (the demands are disjoint voted grants and the Summary itself adds them); the **published total is drawn as a tick over the column** where one exists, a glyph under the column says `=`, `≠` or `·`, and the twin carries Δ `computed here` (D5, D10). A column with no published total says so; nothing is scaled to agree. |
| F8 | `component: 'pay'`: 278 rows = 273 Union + 5 state. Union pay bodies: Navy 77, Army 76, Air Force 76, DRDO 40, MHA 3, MoD 1. Defence BE pay lines exist in 21 of 27 FYs, absent in 2002-03, 2003-04, 2006-07, 2007-08, 2012-13, 2015-16; the composition is 6 lines to 2014-15, 3 in 2016-17, 8 in 2017-18 → 2025-26 and **9 in 2026-27 BE** (and 9 in 2025-26 RE, 10 in 2024-25 actual, 4 in 2013-14 actual). The three MHA pay rows are the Expenditure Profile's `(iii) Police — Pay (Salary)` for 2024-25 actual, 2025-26 RE, 2026-27 BE. | The pay bracket prints `{k} pay lines` on every column and a break rule where `k` changes; no pay trend is drawn across a composition change (D7). Police pay is three labelled ticks, never a series. |
| F9 | Agnipath: 24 rows (`component: 'other'`, heads `Demand 20 — Defence Services (Revenue): Agnipath Scheme ({service})`), 2022-23 actual → 2026-27 BE, three services. Defence Pensions demand rows: BE 27, RE 11, actual 9; pension share of the 2025-26 BE Summary total is 23.60% (₹1,60,795 of ₹6,81,210.27 cr, computed by the judge, not page copy). | Pensions is the topmost band with its share label on every column (`computed here`); Agnipath is a tick inside the revenue band from its first FY, linked to its contract card (D7). |
| F10 | The Union Police demand (`Demand N — Police: Grand Total (whole demand)`): 71 rows each of total, revenue and capital (BE 28, RE 27, actual 16); **total = revenue + capital in all 71 of 71 checked**. Named lines under it (2024-25 BE): 13 bodies summing to ₹1,23,794.87 cr of the ₹1,43,275.90 cr whole demand. | The police panel stacks revenue + capital (verified disjoint). Named lines are ledger lanes; their share of the whole demand is `crContext`'s denominator (D13). No residual row is computed (D14). |
| F11 | `force:delhi-police`: 177 rows; total BE 28 FYs (1999-00 → 2026-27), RE 27, actual 16 (2009-10 → 2024-25); revenue/capital on 53 rows each; 2024-25 BE total ₹11,180.33 cr. **No other city body has a budget row**: the 32 bodies with budget rows are the Union bodies, the 30 state police bodies and `force:central-police-organisations`. GNCTD's own RBI `Police` residual (₹106.28 cr 2023-24) is recorded only as a void; `dl` has no state row. | Delhi Police is the one city budget: a bracket on the police panel, its own Q-block, the first row of every city table (D16). Every other commissionerate prints the fixed sentence (D17). Delhi is its own class on the spend map (D20). |
| F12 | J&K Police is in the register twice: the RBI `jk` payer (4 `Police (MH 2055)` rows, falling from ₹8,396.49 cr 2023-24 actual to ₹2,248.49 cr 2025-26 BE, with the note that the force moved to the Union's Demand 51) and `force:jk-police` as a Union line (6 rows, 2024-25 BE →). | Two payers, two rows, never added; each surface names the payer and the `jk` readout quotes the note (E8). |
| F13 | `grant-to-states`: 467 rows (`force:mpf-scheme` 406, `force:sre-scheme` 49, `force:safe-city-scheme` 12). 344 ASUMP rows (FY2020-21 → 2024-25; `Allocation` as BE, `Released` as actual) name a recipient **only inside `head`** (`ASUMP … — Andhra Pradesh — Released`): 38 distinct recipients, two of which are the table totals. Run through `geo.ts` `resolveState`, four names return `null` (the two totals, `Dadra & Nagar Haveli and Daman & Diu`, `Jammu & Kashmir (UT)`) and **`Ladakh` resolves to `jk`**, which is wrong. 68 Released rows print ₹0 across 32 recipients. | No grants map and no `st` filter over grants until S2 adds a `recipient` field (a name parser would merge Ladakh into J&K silently); the interim is a table with the head verbatim (D21). `₹0 cr — as recorded` is a figure. |
| F14 | No budget row is for prisons, fire services, home guards, civil defence or forensic laboratories. | The component and body controls do not offer them; the resolution statement and Gaps name them; the standfirst does not promise them. |
| F15 | State payers: 30 (28 states + `jk` + `py`). 29 have exactly four RBI rows (head `Police (MH 2055)`, `revenue`; `2023-24:actual`, `2024-25:BE`, `2024-25:RE`, `2025-26:BE`; 30 payers in each pair); UP has 70 rows (its own Grant 26 series: MH 2055 voted 23, MH 4055 capital 23, minor head 109 District Police 15, salary object head 4, over 16 FYs 2008-09 → 2026-27 with gaps, plus the RBI four). Six PRS `State budget 2026-27 — District Police line (PRS transcription)` rows (`br ka mh tn up wb`; `mh` is `component: pay`) are **the only budget rows whose `note` begins `reported:`**. State components: revenue 163 · capital 23 · pay 5. Map units without a state row: `an ch dd dl dn ld`. | The spend map draws one head, `Police (MH 2055)`, for one `(fy, stage)` pair at a time (D19); UP's own series and the PRS lines are separate columns of the state table and the state panel, never in the MH 2055 fill (D22). Review Focus 1: the six reported rows carry `reported` and the reported dash wherever shown. |
| F16 | `FORCE_STRENGTH` 142 rows: 49 national (`st` null; `force:capf` 11, seven forces 4–6 each, 2012–2025) and 93 state rows over 31 units (30 state police bodies at 1 January 2020, 2023 and 2024; `force:delhi-police` at 2017, 2022, 2024, sanctioned counts only, no `perLakh`). `perLakh` is set on 90 of 93 state rows (30 states in each of 2020, 2023, 2024). 135 of 142 notes begin `reported:` (BPR&D unreachable); 90 of 93 state notes say the absolute counts are DERIVED from per-lakh × population; 2023 rows have `sanctioned` null (30 of 30). No commissionerate has a strength row. Units without a strength row: `an ch dd dn ld`. | The strength map fills from `perLakh` as printed, never recomputed; its frame is drawn in the reported dash because every row behind it is reported (D23); Delhi is a stipple `counts-only` class, distinct from hatch (D24); derived counts print with the note's words in the twin. |
| F17 | The only population figures in the repository are `STATE_ECONOMY.population` (2011 Census, Wikipedia-sourced) for all 36 units. Dividing the 2023-24 actual MH 2055 rows by them gives Bihar ₹1,039 and Kerala ₹1,294 per head; the research's own prose figures on a 2022 projected base are ₹862 and ₹1,212: **the 2011 base inflates Bihar by about a fifth and Kerala by about a fifteenth**, and swaps the order of Madhya Pradesh and Odisha. The research's per-capita figures exist only in `analytic` `d` prose (29 `state-police` analytic edges, 24 naming the ruling party as text) and one party-group base rate. | **No per-person figure on the 2011 base** (D18). `m=percap` is `aria-disabled` with that reason until S3; the research's own per-capita sentences are quoted in the state panel, never parsed (D25). |
| F18 | `STATE_ECONOMY.gsdpCr` (`gsdpYear` `FY25`, MoSPI via Wikipedia, `reported`) exists for 28 of 36 units; null for `an ch dd dl dn jk ld tr`. 28 of the 30 MH 2055 payers can be divided by it for FY2024-25. | Interim spend metric: MH 2055 revenue ÷ GSDP of the same FY, drawable only for `(2024-25, BE)` and `(2024-25, RE)`; `jk` and `tr` hatched `GSDP not in this build`; the figure's tier is `reported` (the weaker of its two inputs) and the frame says so (D18). |
| F19 | `FORCE_FOOTPRINT` 221 rows: cantonment 61 · drdo-lab 42 · dpsu-plant 31 · training 29 · other 25 (DGDE HQ, the two defence corridors' nodes `force:updic` 6 and `force:tndic` 5, private plants, NCRB) · commissionerate 18 · forensic-lab 7 · command-hq 6 · capf-hq 2 · **prison 0 · ordnance 0** (declared kinds, no row). 25 of 36 units; none in `an ar dd dn ld mn mz nl py sk tr`. 120 distinct cities. `since` set on 4 of 221. 14 notes begin `reported:`. **No row carries a coordinate.** Every `body` resolves to a node. | Marks are placed within their state by the house cluster rule, never at an address, and the caption says so (D26); kind is a filter and a table column, not a mark channel; prison and ordnance are named `none in this register` (D27); the FY filter does not reach the lens (D28). |
| F20 | Commissionerates: 18 rows (Maharashtra 10, Uttar Pradesh 7, Assam 1), each with its own `force:{city}-police` node (`agency`, `fam: 'state'`); none has a budget or a strength row; none is in Delhi. | The city ledger lists the 18 plus Delhi Police; each non-Delhi row's budget cell is the fixed sentence with a link to the state's Police-head row; its strength cell is the void sentence (D17). |
| F21 | Edges by predicate: analytic 87 · contra 59 · award 52 · enforce 40 · role 38 · law 30 · own 24 · pmout 21 · pmin 12 · bond 11 · hq 7 · direct 2 · sector 1. Tiers: documented 163 · reported 108 · analytic 81 · alleged 32. 76 edges undated; 29 edges have empty `srcs` (21 of them `money-people`); 134 edges have an endpoint outside `FORCE_NODES` (59 `claim:` targets of contras, `meil` 9, `bjp` 6, `cag` 7, `ebscheme` 7, `sc` 15, state nodes of other fleets, `pol:`/`wel:` persons). | Labels resolve through `useData()`; an unresolved id prints `{id} (not in the register)` (D3); the graph prints its dropped count (D52); empty `srcs` print `no source in file` in amber. |
| F22 | Awards: 52 `award` edges; 51 from `min:ministry-of-defence` into 26 vendors (13 `fam: 'state'`, 13 `fam: 'capital'`), 1 from `energy:state-maharashtra` (Adarsh land, alleged). 39 carry `a`, 13 do not. Tiers documented 45 · reported 4 · alleged 3 (`money-people:c063` Rafale price, `c075` Tatra/BEML, `c078` Adarsh). Dated 1986 (1) → 2025; 48 from 2014, 46 from 2021. Non-alleged MoD awards: 49, 38 with ₹. `ty` does not separate DPSUs from private firms (HAL, BEL, GRSE, Mazagon Dock are `company`; BDL, CSL, GSL, HSL are `psu`); foreign and JV vendors carry `st: null` like TASL. | Vendor class is the actor family — two classes, public sector (`fam: 'state'`) and private, JV or foreign (`fam: 'capital'`) — until S5 declares four (D33). Alleged awards are never in the award graphic (E26). No class share is computed by the page: the research's PIB-sample shares are quoted as base rates (D34). |
| F23 | DAC approvals: the `procurement-industry` void "DAC Acceptance-of-Necessity approvals name no vendor and no contract value per item"; AoN appears only in three base rates (AoN vs contracts signed FY2025-26 ₹2,28,000 of ₹6,73,000 cr; indigenous share of AoN 2024; of the 2023-11-30 DAC). | The brief's "DAC approvals by category and vendor class" cannot be drawn; the page draws the contracts PIB names and puts the AoN void and base rates in the same frame (D32). |
| F24 | `VENDORS` by the structural union (MoD award targets ∪ declared comparators by `analytic` edge with `ty ∈ {company, psu}` ∪ footprint `dpsu-plant`/`other` bodies with `ty ∈ {company, psu}` ∪ bond donors ∪ board-role targets): the 26 award targets plus `force:adani-defence` (two analytic comparisons, L&T and TASL; one `own` into PLR Systems; no award of its own), the plant bodies (`force:midhani`, `force:yantra-india`, `force:troop-comforts`, `force:gliders-india`, `force:india-optel`, `energy:mtar`, `force:paras-defence`, `force:dral`), the board-role targets (`co:astra-microwave`, `force:reliance-naval-engineering`) and the bond donor `co:mahindra-mahindra`. Fifteen `company`/`psu` nodes would otherwise have no card. Five `analytic` edges set a vendor beside a comparator (Adani ~ L&T; Adani ~ TASL; L&T ~ BEL; EEL ~ Munitions India; Bharat Forge ~ the retired-officers class). | The vendor set is derived, never hand-listed, and wide enough that every body a table names has a card (D35). A card opens with its declared comparators, or the other family's band when none is declared (D36). |
| F25 | Cases: 7 nodes `force:case-*` (`mechanism`/`instrument`): Adarsh, AgustaWestland, Bofors, Pegasus, Rafale, Sukna, Tatra. Pairing edges (`analytic`, both endpoints case nodes): Bofors ~ Rafale (`literature:c026`, `money-people:c091`), AgustaWestland ~ Tatra (`literature:c027`, `money-people:c092`), Sukna ~ Pegasus (`money-people:c093`): **three unordered pairs; Adarsh is unpaired** and also sits under a second id (`force:adarsh-society`, 5 edges, not joined). `enforce` edges on case nodes: Bofors 5, Pegasus 5, Rafale 5, Adarsh 3, AgustaWestland 3, Sukna 2, Tatra 1 (40 `enforce` in all; 13 with a recorded response; sources `sc` 15, `cag` 7, `bombay-hc` 3, `delhi-hc` 3, `force:cbi` 3, …). Bofors' first dated record is 1987; the first role window begins 1998-03-19. Base rate: 0 of 7 named cases with a final conviction. | Pairs are read from edges (D40); the pair whose earlier member has the earliest record is drawn first, so Bofors ~ Rafale leads by a date rule, and a gate asserts it (SG-RF5). Adarsh keeps an equal-width empty column with the exact pairing sentence (D41). |
| F26 | Responses: all 59 `contra` edges target `claim:{id}`; 42 are audit-added (`…:audit-contra`, `lab` "denial found in audit", responder `s` the subject itself). 7 alleged non-contra claims (`award` 3, `direct` 2, `enforce` 1, `sector` 1), all 7 answered. Pay-pensions `law` edges: 11, of which `c008` (Agnipath) has two first-level responses (`party:inc`, `force:agnipath`) each answered once, `c014` (OROP) one (`force:iesm`) answered once; the seven 7th CPC level edges have none. | Every enforce and alleged record has a response slot at equal size; an empty one prints the exact house sentence (frozen §8.2.10). Contract cards split responses by the responder node's `ty`/`fam` (D30). |
| F27 | Roles: 38 `role` records = 24 distinct `(s, t, from, to)` windows (the same minister recorded in up to three files); 21 into `min:ministry-of-defence`, 12 into `min:ministry-of-home-affairs`; 7 records open-ended; earliest `from` 1998-03-19; 34 of 38 carry party text in `lab` or `d`. Two retired-officer board pairs (`per:avinash-chander` → `co:astra-microwave` from 2018-01-29; `per:fali-major` → `force:reliance-naval-engineering` from 2015-03); base rate 0 of 2 began inside the cooling-off window. Two persons under two ids (`per:a-k-antony`/`per:ak-antony`, `per:l-k-advani`/`per:lk-advani`). | Office lanes group by `(s, t, from, to)` with each record listed; party is text in the twin only (D29); board roles print the interval `computed here` beside the rule and its void (D39); split ids render twice and the gap line says so (D55). |
| F28 | Bonds: 11 `bond` edges from 3 donors (`meil` 9, `co:mahindra-mahindra` 1, `co:cyient` 1) to 9 parties; only `co:mahindra-mahindra` is a node in the module; `bjp` is not; 8 of 9 party ids are. `money-people` base rates give party totals as denominators (372 of 1,280 donors gave only to the BJP, …). The void names the vendors with no bond under their own name. | A donor × every-party table with the void at the same size; party is a text column; no chart (D38). |
| F29 | Narratives 44: contested 26 · well-supported 8 · speculative 5 · unsupported 5; `established` 0, `debunked` 0; `literature` 15. One exact duplicate claim text across files ("Pensions are eating the defence budget.", `pay-pensions` and `union-defence`). | Six rungs always drawn; duplicates listed as recorded (finance D42). |
| F30 | Base rates 296 by domain: union-defence 132 (35 `as % of GDP` rows, 23 against Union expenditure, one per FY, **the FY and the kind only in `property` text**), footprint 46, procurement-industry 40, pay-pensions 27, union-home 21, state-police 12, literature 12, money-people 6; 284 have a denominator ≥ 10. 22 rows name a party in their text. | Base rates render as verbatim cards beside each answer (house), no chart until S12 adds `fy` and `kind` (D15); a `% of GDP` companion strip is the S3/S12 upgrade. |
| F31 | `ty` → `fam` is not one-to-one: `company` (capital, state), `group` (recipient, state), `agency` (state, enforce), `person` (state, capital). | The ReadingKey and Gaps carry finance U24's inconsistent-hue sentence; no hue is changed. |
| F32 | `security.json` (316 KB): `readMeFirst` states that defence capital acquisition, GeM and most state police procurement are not on CPPP. Raw 558,291 rows / 379,231 tender ids; 411,943 after dedup (12.17% of the file's dedup rows); the works class (MES + BRO) is 74.41% of decisions. Single-bidder: slice 3.17% [3.11, 3.22] of n 365,600; whole file 11.22%; rest of file 12.33%; slice without works 12.2%. Eight classes in file order (works, stores, research, dpsu, capf, intelligence-investigation, state-police, other-security), seven on the central portal (comparator 17.67%), state-police on the state portal (8.11% vs 7.59%). Class rates 0.42% → 37.83%. `byClassYear` 116 rows (11–17 per class, 2011 → 2026); 16 have n < 10, 27 have n < 30. All 40 verification links were dead: every field is dataset-only. `src/data/cppp.ts` globs the directory but has no typed accessor for this file. | Rates are drawn by class, each beside its own portal's whole-file rate; the slice-wide rate is a labelled reference row, never a mark (D42); class-years with n < 10 draw no rate (D43); the file is reached through a typed accessor loaded after mount (S8, D44); the page prints `security.json` figures, never the design spec's first probe. |
| F33 | Existing code: `src/pages/Security.tsx` is a 52-line scaffold; `DataContext` already merges `FORCE_NODES`/`FORCE_EDGES`; `IndiaMap` treats absent and `null` as hatch and excludes `value ≤ 0` from its scale; `WelfareMap` types `rows` as `Map<StateCode, StateYearRow>` and exports `ZERO_FILL`, `TexturePatterns`, `TextureSwatch`, `MAP_ORDER`; finance built `LoanMap` and `LoanClock` on those primitives rather than changing `WelfareMap` or `TenureLanes` (which still imports energy's `ASOF`); `NarrativeLadder` exports `RUNGS`; finance's `Control.tsx`, `Panels.tsx`, `Sections.tsx`, `ui.tsx` export `Strip`, `ReconciliationLine`, `LensTabs`, `FilterRail`, `ReadingKey`, `ControlCard`, `Segmented`, `RecordCard`, `StatePanel`, `BaseRatesSection`, `NarrativesSection`, `CannotShow`, `GapsSection`. `india-geo.json` has 36 units including `jk`, no Ladakh polygon. | Maps follow the `LoanMap` pattern on the welfare primitives; office lanes follow `LoanClock`; **no shared component is modified** (D45). The finance chrome is reused by name. |
| F34 | 36 map units: no budget row `an ch dd dl dn ld`; no strength row `an ch dd dn ld`; no footprint row `an ar dd dn ld mn mz nl py sk tr`; `dl` has strength rows and no state budget row. | Every 36-row table names each empty unit's reason; nothing is dropped (D22). |

### 0.3 What was taken from where

**B supplies the spine:** the `ResolutionStatement` in the page head with derived counts;
the answer-block contract (numbered `Q{n}` blocks whose numbering never shifts, an
`AnswerLine` or a graphic, caption, twin); `crContext` on every ₹ (denominator and
comparison in the same element); the `LineLedger` with three stage slots per FY on a lane's
own scale; `OfficeLanes` on the FY column grid; `PayTerms` and two-column `ContractCards`
split by the responder's `ty`/`fam`; the 36-row `StateTable` with RBI, own-series and PRS
columns kept apart; the one neutral dot per installation on `IndiaMap` geometry with the
`KindMatrix`; the procurement lens as symmetry chapters; `VENDORS`, `comparatorsOf`,
`CASE_PAIRS` and `caseFile` as derived sets; the `VendorGrid` with identical field rows and
the comparator-opening `VendorCard`; `CaseTimeline` and `CasePairs` with the equal-width
pairing sentence for an unpaired case; the award lanes' no-amount rule for ticks; bonds and
board roles as tables; the zero-series fixture; SG-4 (every ₹ in the DOM is a row, a
declared figure or a labelled share); SG-RF4 (no partisan frame in page-authored strings);
the `body`, `cell`, `vendor`, `case` params; the live-loaded slice accessor; derived gaps
for the published-total mismatch and the unjoined case decisions; S4 (series tier field),
S11 (`caseId`), S12 (base-rate `fy`/`kind`), S13 (`replaces` on pay laws).

**A supplies:** the `DemandStack` (defence and police panels on one FY axis and one ₹
scale; demand-level bands by component; pensions as the top band with its share; pay as a
bracket; Agnipath as a tick; the Delhi Police bracket; the reconciliation glyph row; the
structure rules; the FY readout) as Budgets Q1; the derived default stage, state pair and
strength year; the `StatePair` (spend map on `% of GSDP` interim, ₹ crore option, the
per-person option disabled with its reason; the per-lakh strength map; the dot strip under
each map as the comparison instrument; the Delhi crosshatch class; the counts-only stipple
class; the `GSDP not in this build` hatch); the `DelhiLine` small multiple; the exact city
sentence that names the state and the head; the 0-row footprint kinds named with their
reason and S10 (per-kind coverage); the `SliceBesideFile` by-year small multiples and the n
< 10 rule; the AoN void card inside the award graphic's frame; the vendor class read from
the actor family with hue unchanged; the broader structural vendor union (plants, bonds,
board roles); S1's `demandNo`/`scheme`, S3 (population), S5 (vendor class), S6 (outcomes),
S7 (coordinates), S9 (commissionerate strength); the no-city-₹ gate over titles, accessible
names and TSV cells; the per-row ramp floor and greyscale distinctness gate.

**The judge adds:** the award graphic as one mark per contract at year × ₹ on a log axis
(A's by-class, by-year reading without B's forbidden sum and without A's stacked column
sums); the published total drawn as a tick over the stack (B's own upgrade condition, met at
demand level today); the removal of A's computed residual row and A's `sel` reuse for
vendor accent; the exact strings reconciled to the house (`No response recorded — asked/not
asked unknown`); the stance rules as page rules in §8.2; the corrected facts in §0.2; D1–D60
and the gate suite as one numbering.

---

## 1. Purpose and readers

### 1.1 Purpose

`/security` records what India's governments spend on force, on three lenses that share one
filter rail and one live region:

- **Budgets:** what the Union spends on defence and on its own police, intelligence and
  investigation lines, by demand, by year and by stage (BE, RE, actual), with pensions and
  pay called out as the largest lines; what each state spends on its Police head beside its
  police strength; Delhi Police as the one city budget that is published; the grants the
  Union passes to state police.
- **Footprint:** where force sits — cantonments, laboratories, plants, headquarters,
  training centres, commissionerates and forensic laboratories — placed in their states and
  named by city, with what each place does *not* have recorded.
- **Procurement and people:** the contracts the Ministry of Defence has named with a vendor,
  by vendor class and year; the open-market tender slice by buyer class beside the whole
  tender file; vendors with identical fields and never alone; electoral bonds; retired
  officers' board roles under the cooling-off rule; the big cases as dated records in their
  recorded control pairs, Bofors beside Rafale.

The page's claim about itself is narrow: *this is what the published record resolves to,
at each level, what each figure is divided by and compared with, and what it cannot show.*
Spending on force is a policy choice. A large number is not a finding.

### 1.2 The three readers

| Reader | Arrives with | Must leave with | Distrusts the page when |
|---|---|---|---|
| **J**, journalist on deadline | a name or a year: "defence pensions 2025-26", "CRPF 2024-25", "Mumbai Police budget", "Did Adani get defence contracts?", "Rafale" | one figure with its stage, FY, demand, share of its published parent, previous year, source and tier; or the exact sentence saying the figure does not exist; a pasteable citation | a city gets a number no budget publishes; a vendor appears alone; BE is passed off as spend; a case has no answer slot |
| **P**, policy researcher who exports | a series question: "Union police by force, actuals, 2009-10 → 2024-25", "police per lakh by state", "single-bidder rate for CAPF buyers" | a TSV that reproduces the graphic with stage, head, `note`, `reported` flag, population, exclusions and the run id | rows from two levels are summed; a missing year is closed up or drawn as zero; a derived count is passed off as printed |
| **S**, hostile skeptic, from either side | "you only show one government's scandals", "you picked states to make one party look bad", "you hide that X got contracts" | the control in the same frame: Bofors beside Rafale; both governments' shares in the symmetry text; both groups of states' medians as text; the other vendor; the boring explanation | one era, party or vendor appears alone; a colour carries a party; an absent row reads as zero; "none" means "not searched" |

---

## 2. The reader's questions and the two-minute paths

### 2.1 Questions, per lens, in the order the page answers them

Answered at rest at 1280×800 unless a step is named. The question numbers are the visible
block numbers (`h3` prefix `Q{n} — `), so a reader can say "Q6 on Budgets" (D2).

| # | Lens | Question (block heading, verbatim) | Answered by | Form |
|---|---|---|---|---|
| B-Q1 | Budgets | What does the Union budget for force, year by year, and how much is pensions and pay? | `DemandStack` (§5.1.1) | graphic: two stacked panels, one axis |
| B-Q2 | Budgets | Who held the Defence and Home portfolios on each date? | `OfficeLanes` (§5.1.2) | graphic, on the same FY grid |
| B-Q3 | Budgets | How has each Union line moved, and which years are missing? | `LineLedger` (§5.1.3) | graphic: periods as columns, three stage slots |
| B-Q4 | Budgets | Compared with what? | `CompareBlock` (§5.1.4) | base-rate cards + symmetry text |
| B-Q5 | Budgets | Who is paid, and on what terms? | `PayTerms` + `ContractCards` (§5.1.5) | table + two-column cards |
| B-Q6 | Budgets | What does each state spend on police, against its economy, beside how many police it has? | `StatePair` + `StateTable` (§5.1.6) | graphic: two maps with dot strips + 36-row table |
| B-Q7 | Budgets | Which city has a police budget? | `DelhiLine` + `CityLedger` (§5.1.7) | small multiple + table |
| B-Q8 | Budgets | What does the Union give the states for police? | `GrantsTable` (§5.1.8) | table |
| B-Q9 | Budgets | What is not published? | `CannotShow` (§5.4.3) | list at findings size |
| F-Q1 | Footprint | Where is it? | `FootprintMap` (§5.2.1) | graphic: one dot per installation, within its state |
| F-Q2 | Footprint | Of what kind, in which city? | `KindMatrix` + `PlaceList` (§5.2.2) | tables |
| F-Q3 | Footprint | Which cities have police money? | `CityLedger` (§5.2.3, the §5.1.7 component) | table |
| F-Q4 | Footprint | Compared with what? | `CompareBlock` (§5.2.4) | cards + symmetry text |
| F-Q5 | Footprint | What is not published? | `CannotShow` | list |
| P-Q0 | Procurement | The same lens on the other side | `SymmetryContents` (§5.3.0) | contents of the four chapters |
| P-Q1 | Procurement | Who was awarded, to which class of vendor, when, and beside whom? | `AwardsByClass` + `VendorGrid` (§5.3.1) | graphic + identical cards |
| P-Q2 | Procurement | Who bought on the open market, and how many bid? | `SliceBesideFile` (§5.3.2) | graphic: rates by class beside the whole file |
| P-Q3 | Procurement | Who sits on both sides of the money? | `BondTable`, `BoardRoles` (§5.3.3) | tables |
| P-Q4 | Procurement | What did courts and auditors record? | `CaseTimeline` + `CasePairs` (§5.3.4) | graphic + paired records |
| P-Q5 | Procurement | Which stories hold up? | `NarrativeLadder` (§5.4.2) | ladder |
| P-Q6 | Procurement | What is not published? | `CannotShow` | list |
| all | — | Who is connected to whom? | `GraphExplorer` (§5.5.1) | force graph |

### 2.2 The two-minute paths

Interaction counts are clicks, taps or typed submissions from a cold load of `/security`.
Gates SG-40–44 script them at 1280×800 and 390×844.

| # | Reader, question | Path | Steps |
|---|---|---|---|
| B-J1 | J: "How much goes on defence pensions, and is it growing?" | at rest: [UX review] (U10) Q1's answer sentence, the first text in the figure, names the latest FY's pensions ₹ and share; (U9) the pension band carries `{p}% of published total` on every column that has a published total and `{p}% of stack, computed here` on the others, and `₹{cr} cr` on the latest; choose the FY on the axis → `FYReadout`: the demands with head, ₹, tier, source and `read to {asOf}`; the published total and the reconciliation sentence; the pension row's `crContext` (share of the published total; previous FY at the same stage); (U14) `Copy citation` on the pension row | 1 (2 to a pasted citation) |
| B-J2 | J: "What did CRPF get in 2024-25, against what?" | Find `CRPF` → `Show its budget lines` (writes `body`, scrolls to Q3, CRPF lanes accented) → open the 2024-25 cell → `CellCard`: BE, RE, actual with sources; `₹{a} of ₹{b} cr, {k}% of the published Police demand, computed here`; `FY2023-24 {stage}: ₹{x} cr`; Copy citation | 3 |
| B-J3 | J: "What does Mumbai Police cost?" | Find `Mumbai` → the `Mumbai Police Commissionerate` result prints the fixed city sentence, then the verb `Where its police money sits` [UX review] (U29) → the `CityLedger` row reads exactly `inside Maharashtra's police head (MH 2055) — no city budget is published`, with `Maharashtra's police head →` (sets `st=mh`) and the strength void | 2 |
| B-P | P: "Union police by force, actuals, 2009-10 → 2024-25, as a table" | rail Stage = actual → FY from 2009-10 → Q3 twin → Download .tsv (machine columns `fy`, `fy_start`, `stage`, `body_id`, `head`, `component`, `cr`, `tier`, `lane_key`, `is_demand_level`, `source_urls`) | 4 |
| B-S | S: "You picked a year that flatters one government" / "you add things twice" | at rest: every FY of the stage is on one axis; the published total is a tick over each column that has one; the glyph row says where the stack equals it; Q2's lanes show both governments' ministers; the `ReconciliationLine` says `no total on this page adds rows from two levels`; `ControlCard` quotes the `union-defence` and `union-home` symmetry texts verbatim (UPA-II beside NDA) | 0 |
| F-J | J: "Which cantonments are in Uttarakhand?" | tab Footprint → `kind=cantonment` chip → choose Uttarakhand on the map (or the State select) → `PlaceList` filtered: label, city, body, source | 3 |
| F-S | S: "Your map says Manipur has no defence presence" / "you put installations where one party rules" | tab Footprint → Manipur is hatched `no row of the selected kinds in this register`, never 0; C11 says hatch is not absence; F-Q4 quotes the footprint symmetry text (installations per million on both groups of states) | 1 |
| P-J | J: "Did Adani get defence contracts?" | tab Procurement → Find `Adani` → `Show vendor` (writes `vendor`) → `VendorCard`: Adani Defence beside L&T and Tata Advanced Systems (its declared comparators), identical fields: field 4 `none named in the Ministry releases the research read`, and [UX review] (U15) field 3b `Recorded holdings` in the same `<dl>`: `PLR Systems (51%, reported): {k} named award(s) — listed, not added to this vendor`, whose own card shows the joint, unsplit carbine contract; the `procurement-industry` base rate "Adani-linked vendors' share of award ₹, 2021-25" printed verbatim above the chapter; `rated in Q5` → the ladder's "Adani is being handed defence" with its rating | 2 |
| P-S | S: "You list Rafale but bury Bofors" (or the reverse) | tab Procurement → P-Q4: the first pair row is Bofors \| Rafale, two equal columns, identical field rows, each with its court records and counters; the `literature` symmetry text above it | 1 |
| P-P | P: "Single-bidder rate for CAPF tenders by year, with intervals" | tab Procurement → P-Q2's CAPF by-year multiple → Download .tsv | 2 |
| any | J or S: "Who is connected to {vendor / case / body}?" | the name → `Show connections` → the graph opens focused, one hop | 1 |

---

## 3. Route, data, URL contract

### 3.1 Route

- Replace the scaffold in `src/pages/Security.tsx`; the lazy route `/security` and the nav
  entry "Security spend" (spec §8.1, under Registers) exist. `scripts/smoke.mjs` keeps
  `/security`, `/security?lens=footprint`, `/security?lens=procurement` and gains
  `/security?stage=actual&fy=2009-10..2024-25`, `/security?st=mh`, `/security?st=dl`,
  `/security?lens=footprint&kind=commissionerate`,
  `/security?lens=procurement&vendor=force:adani-defence`,
  `/security?lens=procurement&case=force:case-bofors`, `/security?view=table`.
- Outer `<article className="pb-20">`, no inner `max-w`. Prose caps at `max-w-[72ch]`.
  Graphics and tables take the layout width and scroll horizontally **only inside their own
  container**.
- `Suspense` fallback: PageTitle and Standfirst text.

### 3.2 Data (static, compiled in)

The page imports only from `src/data/security.ts` (re-exports of the force module's
fourteen names, the prerequisite shims — each `null` when absent — and `loadSecurity` from
`src/data/cppp.ts`), `src/data/securityView.ts` (every derivation, pure, at module scope or
memoised on the parsed filters), `src/data/geo.ts`, `STATE_ECONOMY` (GSDP fields only), and
`useData()` for labels outside the module. **No literal figure appears in
`src/pages/Security.tsx` or `src/components/security/*`** (SG-3).

**Anchors** (the only literals the derivations hold; each is checked at module load, and a
missing one fails `scripts/pages/security.test.mjs` SG-1):

```ts
export const MOD = 'min:ministry-of-defence';
export const MHA = 'min:ministry-of-home-affairs';
export const DELHI_POLICE = 'force:delhi-police';
export const PENSIONS_BODY = 'force:defence-pensions';
export const DEFENCE_BODIES = [MOD, 'force:indian-army', 'force:indian-navy', 'force:indian-air-force',
  'force:drdo', PENSIONS_BODY, 'force:ofb'] as const;                       // F5
export const STATE_SERIES_HEAD = 'Police (MH 2055)';                         // F15: the one comparable state head
export const MOD_ALL_DEMANDS = 'Ministry of Defence — all demands (Summary of Demands for Grants, BE)'; // F7, a head value
export const WHOLE_DEMAND = '(whole demand)';                                // F10, substring of a head value
export const DEMAND_PREFIX = /^Demand \d+ — /;                               // F6, stripped for lane keys
export const EDITION_SUFFIX = / \(Summary of Demands for Grants, BE\)$/;     // F5
export const DEMAND_LEVEL = /^Demand \d+ — [^:]+?( \(Summary of Demands for Grants, BE\))?$/; // F3/F5 interim; retired by S1
export const REPORTED_PREFIX = 'reported:';                                  // spec §4.1; retired by S4
export const CASE_PREFIX = 'force:case-';
export const CASE_PAIR = ['force:case-bofors', 'force:case-rafale'] as const; // stance rule 5: a GATE anchor, not a layout anchor (D40)
export const MONEY_PEOPLE = 'money-people';                                  // FORCE_EDGE_DOMAIN values
export const PAY_PENSIONS = 'pay-pensions';
export const PROCUREMENT = 'procurement-industry';
export const CITY_POLICE_TEXT = (state: string) => `inside ${state}'s police head (MH 2055) — no city budget is published`; // Review Focus 2
export const LAKH_NOTE = 'RBI Appendix II prints ₹ lakh; converted to ₹ crore (÷100).'; // [UX review] (U13) a note prefix; retired by a unit field
export const LENS_DOMAINS = {
  budgets: ['union-defence', 'union-home', 'state-police', 'pay-pensions'],
  footprint: ['footprint'],
  procurement: ['procurement-industry', 'money-people', 'literature'],
} as const;
```

Each regex anchor has a gate (SG-5) proving it selects exactly the rows the test's
independent rule selects, so retiring it under S1 is a no-op on the screen.

**Named derivations in `securityView.ts`** (each unit-tested in
`scripts/security-view.test.mjs` against a fixture; each returns rows **and** the
denominator sentence that goes with them):

| export | reads | definition |
|---|---|---|
| `nodeOf(id)` | `FORCE_NODES`, then `useData().nodes` | first hit; unresolved → `{id} (not in the register)` in amber mono, never blank |
| `rowTier(r)` | `note` | `'reported'` when `note` starts with `REPORTED_PREFIX`, else `'documented'`; with S4, `r.tier`. Applied to budget, strength and footprint rows |
| `hasCr(r)` | `cr` | `Number.isFinite(r.cr)`. **`0` is a value and prints `₹0 cr — as recorded`**; absence is a missing row, never a 0 |
| `hiddenBy(rows, filters)` [UX review] (U18) | the rows behind a slot, map unit or cell; the parsed `tier`, `payer` | `{k, filter}` when rows exist but every one is hidden by a filter. Such an element is **dimmed as `fy` dims, never hatched**, and its accessible name, readout, legend entry and twin cell read `{k} rows hidden by the {filter} filter — not absent`; `no row in this register` is printed only where no row exists |
| `FY_AXIS`, `fyStart(fy)` | `FORCE_BUDGETS.fy` | every FY label from the minimum to the maximum start year, **gaps included**; `fyStart` the integer start year |
| `UNION_ROWS`, `STATE_ROWS` | `FORCE_BUDGETS` | `payer === 'union'` / not |
| `isDemandLevel(r)` | `head` | S1 `level === 'demand'`, else `DEMAND_LEVEL.test(head)` |
| `defenceDemands(stage)` | `UNION_ROWS` | `body ∈ DEFENCE_BODIES` and `isDemandLevel`; per `(fy, stage)` prefer rows without `EDITION_SUFFIX`, else the Summary rows (E2); one band per row keyed by `component` (`revenue` · `capital` · `pension` · `total` → "MoD civil and misc.") |
| `defenceStack(stage)` | the above, `PUBLISHED_TOTALS` | per `FY_AXIS` entry `{fy, bands[{component, cr, rows, tier}], sum, published, recon, demands, revenueDemands, tier}` or `{fy, missing: true}`; `sum` = Σ bands, **labelled `computed here` wherever printed**; `published` = the `MOD_ALL_DEMANDS` row of that `(fy, stage)` or `null`; `recon` = `'equal'` (\|Δ\| ≤ 0.5) · `{delta}` · `'none'`; `tier` = weakest constituent |
| `structureBreaks(stage)` | `defenceStack` | FYs where `revenueDemands` differs from the previous drawn FY |
| `payBracket(stage)` | `component === 'pay'`, Union, `body ∈ DEFENCE_BODIES` | per FY `{lines: k, cr: Σ, rows}` or `{lines: 0}`; `compositionBreaks` where `k` changes. **Never a band** |
| `agnipathTicks(stage)` | rows whose head's sub-line names the Agnipath scheme (S1: `scheme: 'agnipath'`) | per FY Σ of the service lines, labelled |
| `policeStack(stage)` | heads containing `WHOLE_DEMAND` | per FY `{revenue, capital, total, check: total === revenue + capital}` |
| `delhiLine` | `DELHI_POLICE` rows | per `(fy, stage)` total, revenue, capital; `shareOfPolice` = total ÷ police whole-demand total, `computed here`, only where both exist in the same `(fy, stage)` |
| `policePayTicks` | `component === 'pay' && body === MHA` | the three ticks, each with stage and FY |
| `PUBLISHED_TOTALS` | `UNION_ROWS` | `head === MOD_ALL_DEMANDS`; MHA rows with `WHOLE_DEMAND` in `head`; keyed `{side, fy, stage, component}` |
| `laneKey(r)` | `body`, `component`, `head` | `${body}|${component}|${head minus DEMAND_PREFIX minus EDITION_SUFFIX}`; with S1 `${body}|${line}` |
| `LANES`, `laneGroups` | `UNION_ROWS` minus `grant-to-states` | one lane per key `{key, body, component, line, rows, fyFirst, fyLast, cells: Map<fy, {BE?, RE?, actual?}>}`; a slot with two rows keeps both (E3). Groups in fixed order: **Published totals** (the `PUBLISHED_TOTALS` lanes, "as the document publishes it"); **Bodies** — one group per body, alphabetical by label, lanes by component order (`total`, `revenue`, `capital`, `pay`, `pension`, `other`), then line, then `fyFirst`, so a renamed line sits under its predecessor labelled `renamed or restructured in the document — not joined`; **The one city line** — Delhi Police. **No order by ₹, ever** |
| `bodyCoverage(body)` | rows | `{BE: k, RE: k, actual: k, of: FY_AXIS.length, first, last}` |
| `crContext(row)` | `PUBLISHED_TOTALS`, `UNION_ROWS`, `STATE_ROWS`, S3 | **the denominator**: the row's published parent, same FY and stage — for a line inside a demand, the demand-level row (or the `WHOLE_DEMAND` row of the same component where the whole demand prints components, else `total`) with the same demand number and title; for a demand-level MoD-side row, the `MOD_ALL_DEMANDS` row — printed `₹{a} of ₹{b} cr, {k}% of the published {title}, computed here`; no parent → `no published total for this line's demand in FY{fy}`; a state MH 2055 row → `{pct}% of GSDP {gsdpFy} (reported series), computed here` when the FY matches and GSDP exists, else `no same-year denominator in this register (S3)`; a grant row → `no denominator published for this line`. **The comparison**: the same lane's previous FY at the same stage, `FY{fy−1} {stage}: ₹{x} cr`, or `no {stage} row for FY{fy−1}`. Every ₹ the page prints goes through this (D4). With S1 `parent` replaces the title match. [UX review] (U9) **The pension share has one basis everywhere** (band label, strip fact 2, answer sentence, readout, twin): the published all-demands total of that `(fy, stage)` where one exists, printed `{p}% of published total`; else the stack, printed `{p}% of stack, computed here`; the basis words are never dropped. (U13) Where a row's `note` begins with `LAKH_NOTE`, every element that prints its ₹ adds, in the same element, `as published: {cr × 100} ₹ lakh; shown here in ₹ crore` |
| `rowCitation(row, laneKey)` [UX review] (U12) | the row, `crContext`, `nodeOf`, `FORCE_META.asOf` | `{body label} — {head verbatim} — ₹{cr} cr ({stage}, FY{fy}) — {the U13 as-published line, where it applies} — {crContext denominator} — {crContext comparison} — {tier} — {note, or 'no note'} — {every source: label url} — ICIP {origin}#/security?cell={slug}@{fy}, read to {FORCE_META.asOf}`; the deep link is absolute and built at copy time. The citation for a budget row in `CellCard`, `FYReadout` and `StatePanel`, rendered also as visible `<output>` text beside its button; edge records keep finance's `citationFor` |
| `STATE_PAIRS`, `defaultStatePair(m)` | `STATE_SERIES_HEAD` rows, the metric's denominator years | the `(fy, stage)` pairs present with their state count; the default is, among pairs the metric can divide (under `gsdp`, pairs whose FY equals the GSDP FY; under `cr`, all), the one with the most states, ties → stage order actual > RE > BE, then latest FY. **Derived, never hand-set.** Today `2024-25:RE` under `gsdp`, `2023-24:actual` under `cr` |
| `stateSpend(fy, stage, m)` | `STATE_SERIES_HEAD` rows, `STATE_ECONOMY`, S3 | per map unit `{cls, value, cr, denom, denomLabel, tier}`; `cls ∈ value · union-funded (dl) · no-row · no-denominator`; `m='gsdp'` divides by `gsdpCr` only when `gsdpYear` matches `fy`; `m='percap'` requires S3; `m='cr'` prints ₹ crore per state and **no share** ([UX review] (U33): a share of the drawn states' sum is a share of a page-computed ₹ total, which D4 rejects and §8.2.3 does not allow; the dot strip is the comparison); `tier` = the weaker of the row's tier and the denominator's (`reported` for GSDP) |
| `stateStrength(year)`, `defaultStrengthYear`, `perLakhBins` | `FORCE_STRENGTH` with `st` | per unit `{cls, perLakh, sanctioned, actual, womenPct, derived, tier}`; `perLakh` null with a row → `cls: 'counts-only'`; the default year is the one with most states carrying `perLakh`, ties → latest; bins are quantiles **pooled over every state row of every year with no filters**, fixed |
| `STATE_TABLE` | `STATE_ROWS`, `FORCE_STRENGTH`, the 36 `StateCode`s, `FORCE_FOOTPRINT`, `COMMISSIONERATES` | 36 rows `{st, mh2055: Map<fy·stage, row>, own: row[], prs: row[], strength: Map<year, row>, footprint, commissionerates}`; every empty part carries its null words and the unit's reason (`Delhi's police is a Union demand line — see Q7`; `no RBI row for this UT`) |
| `stateRecords(st)` | `state-police` `analytic` edges whose `s` is that state's police body | verbatim `lab`, `d`, tier, srcs and [UX review] (U21) `innocentReading`, printed directly beneath at the same size; **no figure parsed** |
| `GRANT_ROWS`, `grantRecipient(r)` | `component === 'grant-to-states'` | head verbatim; with S2 `r.recipient` (a `StateCode`, `'la'`, `'dn+dd'` or `null` for a total row); **no name parsing** |
| `ROLE_WINDOWS`, `officeOn(date, bodyIds)` | `role` edges | grouped by `(s, t, from, to)`, each record kept; the finance three-block rule (covers / start recorded, end not / same day); dates compare at the record's precision |
| `PAY_LAWS`, `CONTRACTS`, `responseChain(id)` | `law` edges with domain `PAY_PENSIONS`; `contra` edges | pay levels: law edges whose source is a pay-commission node and whose target has `ty: 'group'`; contracts: the rest, each with its chain (responses to `claim:{id}`, then to each of those, depth ≤ 3) and the `FORCE_BENEFITS` row by `claimId` and any `enforce` edge on the law node |
| `FOOTPRINT_KINDS` | the `FootprintKind` union (eleven, as `fleet.ts` lists it) ∪ `FORCE_FOOTPRINT.kind` | declared kinds; a kind with no row is `none in this register` |
| `fpByState`, `fpByCity`, `PLACES(f)` | `FORCE_FOOTPRINT` | counts per state × kind; cities per state; rows grouped state → city → label |
| `COMMISSIONERATES`, `CITY_LEDGER` | footprint `kind === 'commissionerate'` ∪ `DELHI_POLICE` | one row per city body: `budget` = Delhi → `delhiLine`, others → `CITY_POLICE_TEXT(stateLabel)` with the state's `STATE_SERIES_HEAD` figure as a link, never a figure; `strength` = a `FORCE_STRENGTH` row for that body or the void sentence |
| `AWARDS` | `pred === 'award' && s === MOD && tier !== 'alleged'` | by calendar year of `from`; undated to the gutter; `a` as recorded or `amount not stated` |
| `vendorClass(id)` | S5, else `nodeOf(id).fam` | interim `'public'` (`fam: 'state'`) · `'private'` (`fam: 'capital'`) · `'unclassified'` (anything else, listed by name); **never from `ty` or `own`** |
| `VENDORS` | `AWARDS.t` (alleged included) ∪ the other endpoint of every `analytic` edge with one endpoint in that set and the other with `ty ∈ {company, psu}` ∪ footprint `dpsu-plant`/`other` bodies with `ty ∈ {company, psu}` ∪ `bond.s` ∪ `role.t` with `ty ∈ {company, psu}` | one card each, identical fields (§5.3.1); grouped by `vendorClass`, alphabetical |
| `comparatorsOf(v)` | `analytic` edges joining `v` to another member of `VENDORS` | declared comparators; empty → `{familyGroup: the other class's VENDORS}` |
| `vendorFields(v)` | `AWARDS`, `own`, `bond`, `role`, `enforce`, footprint rows by body, `FORCE_IDENTITY` | the identical-field record of §5.3.1, every field with its null words; [UX review] (U15) field 3b reads `own` edges **from** the vendor, each owned body with its own named-award count |
| `BONDS` | `pred === 'bond'` | grouped by donor `s`, every party per donor, by date; labels via `nodeOf` |
| `BOARD_PAIRS`, `POST_RETIREMENT_RULES` | `role` edges; `law` edges in `MONEY_PEOPLE` with target `ty: 'group'` | persons with a role into `ty ∈ {ministry, agency}` and one into `ty ∈ {company, psu}`; `gapMonths` = board `from` − office `to`, `computed here`, at the coarser precision, only when both exist; the cooling-off rules verbatim |
| `CASES`, `CASE_PAIRS`, `caseFile(c)`, `caseFields(c)` | nodes with `CASE_PREFIX`; `analytic` edges with both endpoints in `CASES`; edges touching `c` or a party of `c` (joined by `direct`, `award` or `sector`) minus `contra` and pair edges | pairs deduplicated by unordered pair, each keeping its edge ids and files; pairs ordered by the earlier member's first dated record; unpaired cases last; fields classified by the **source node's `ty` and `fam`**, never by text (S11 replaces the touch rule) |
| `SLICE` | `loadSecurity()` (S8) | `readMeFirst`, `caveat`, `headline`, `rates.byClass`, `rates.byClassYear`, `rates.total`, `rates.excludingWorks`, `quality.total`, `classes.definitions`, `provenance`; `null` → the absence sentence; nothing recomputed |
| `responsesTo(id)`, `ALLEGED` | `FORCE_EDGES` | `pred === 'contra' && t === 'claim:' + id`; `tier === 'alleged' && pred !== 'contra'` |
| `GRAPH_NODES`, `GRAPH_EDGES`, `dropped` | `FORCE_EDGES`, `nodeOf` | an endpoint resolving nowhere drops its edge; the count is printed |
| `famSplits`, `splitIds` | `FORCE_NODES` | as finance U24; labels carried by more than one id |
| `derivedGaps(f)` | all | §5.5.3 |
| `tsv(meta, header, rows)` [UX review] (U16) | — | **security's own**, in `securityView.ts` (≈ 25 lines). Finance's `tsv()` writes its three fleets' names and run ids and a loan-specific amounts sentence (`src/data/financeView.ts`), and its download button names the file `finance-…`, so it cannot be reused unchanged. Security's keeps finance's cell rule (tabs and newlines to one space, trimmed) and finance's first lines (`# table: {name} — {population}`, `# rows:`, `# url:`, `# lens: … · filters: …`), then `# force {FORCE_META.runId} asOf {FORCE_META.asOf}`, `# open-market slice {provenance.inputs[].sha256_16} asOf {provenance.asOf}` where the table reads the slice, and, wherever ₹ appear, `# amounts: ₹ crore, nominal, as published; not deflated; stage {stage}`. The security `Exports` names the file `security-{lens}-{slug}-{asOf}-{runId}.tsv`. Finance's helper is not modified (D45) |
| `sourceClass(src)` | `srcs` | finance `sourceClass` (parliament / primary / secondary) |
| `asOfLabel` | `FORCE_META.asOf`, `SLICE.provenance.asOf` | one date when equal, else both |
| `baseRateForm(r)` [UX review] (U19) | a `FORCE_BASE_RATES` row | `'share'` when both figures are integers and `numerator ≤ denominator` (with S12, also when `kind` is a share), else `'two-figures'`. A `two-figures` row renders `{numerator} and {denominator} — {label}` with the chip `two figures as the research states them, not a share`: no percentage, no whisker, no `of`. Rendered by a security wrapper; finance's `BaseRateLine` is not modified (D45) |

### 3.3 Prerequisites (generator or data changes; the page works without each and improves with it)

Each is a reviewed change to `research/raw/force/*`, `RECONCILIATION.json`,
`scripts/assemble-fleet.mjs`, `scripts/lib/vocab.mjs` or `src/data/cppp.ts`, typed in
`src/graph/fleet.ts`, re-checked by `scripts/validate.mjs` §4/§5. Absence is detected by a
`null` shim in `src/data/security.ts`. Gates marked (S) in §16 assert both the interim and
the upgrade.

| id | export / field | built from | interim (today) | upgrade |
|---|---|---|---|---|
| **S1** | `BudgetRow.level: 'all-demands' \| 'demand' \| 'line' \| 'object'`, `line` (a stable key across renumbering), `parent: string \| null`, `demandNo`, `scheme` | the demand documents the rows were transcribed from (the hierarchy is in `head` already) | `DEMAND_LEVEL`, `EDITION_SUFFIX`, `MOD_ALL_DEMANDS`, `WHOLE_DEMAND` anchors (SG-5); lanes keyed by body + component + line as printed; renamed lines are separate lanes; Agnipath by sub-head text | exact selection, the anchors deleted; lanes join across renumbering; sub-lines nest as "of which" rows; `crContext` uses `parent` |
| **S2** | `BudgetRow.recipient: StateCode \| 'la' \| 'dn+dd' \| null` on `grant-to-states` rows | the Lok Sabha answer already transcribed (F13) | grants table with head verbatim; no map; `st` inactive on grants with its reason | grants filterable by `st`; a released ÷ allocated map per state for the chosen FY (hatch = no row, `₹0 cr — as recorded` distinct); Ladakh and the merged UT listed as text-only recipients |
| **S3** | `FORCE_DENOMINATORS: {kind: 'population' \| 'gsdp' \| 'state-revenue-expenditure' \| 'gdp' \| 'union-expenditure', st: StateCode \| null, fy: string \| null, year: number \| null, value, unit, srcs}[]` (a fourth series) | the RGI projections, GDP and Union-expenditure series the research already used in base-rate prose and notes | spend map on `% of GSDP` from `STATE_ECONOMY` (reported, FY25 only); `m=percap` `aria-disabled` with F17's reason; the `% of GDP` strip not drawn, base rates listed verbatim | `m=percap` becomes the default with its basis and year in the frame; share of state revenue expenditure as a second metric; a `% of GDP` and `% of Union expenditure` strip under the stack on its FY axis |
| **S4** | `tier: 'documented' \| 'reported'` on budget, strength and footprint rows; `StrengthRow.derived: ('sanctioned' \| 'actual' \| 'womenPct')[]` | the `reported:` prefix and the "DERIVED" sentence the files already write | `rowTier` from the anchored prefix (SG-RF1); derived counts recognised by the note text, printed with the note | tier from the field; derived cells marked in twin and readout without reading prose |
| **S5** | `FORCE_VENDOR_CLASS: {id, class: 'dpsu' \| 'cpse' \| 'private-indian' \| 'jv' \| 'foreign', category, declaredIn}[]` | `procurement-industry` `publicRole` text, declared by the researcher | two classes by `fam` (D33) | four classes as labels inside the family hue; pairing by `category` in the vendor grid |
| **S6** | `FORCE_OUTCOMES: {st, year, kind, count, denominatorKind, denominator, party, srcs}[]` with `party` as text | the NHRC, NCRB and Parliament tables the `state-police` file already read | outcome rates as all-India and party-group base rates and the 29 state records quoted verbatim; no per-state outcome surface | a 36 × years outcomes table (hatch for no row, `a of b`, party as a text column, never a colour, filter or sort) |
| **S7** | `lat`, `lon`, `geoSrc` on `FootprintRow` | the official list's address, geocoded with a cited gazetteer | dots placed within the state by the cluster rule | a point layer at the address, with the source |
| **S8** | `loadSecurity(): Promise<SecurityFile \| null>` in `src/data/cppp.ts`, typed, plus a slim generated JSON (headline, rates by class and class-year, quality totals, class definitions, provenance) | `research/raw/cppp/security.json` (already in the glob) | none: P-Q2 prints the absence sentence until S8 lands (D44) | the slice block; the 316 KB file never rides in the entry |
| **S9** | commissionerate `strength` rows | BPR&D DoPO when reachable | the void sentence on every commissionerate | strength on the city ledger |
| **S10** | per-kind `coverage: 'enumerated' \| 'partial'` in the footprint file | the research's own scope text | every empty state hatched `no row of the selected kinds in this register` | an enumerated kind's empty state is hollow `none on the official list`; partial kinds keep the hatch |
| **S11** | `caseId` on claims, or `FORCE_CASES: {id, members: claimId[], parties: nodeId[]}[]` | the `money-people` and `literature` files | case files by the touch rule; decision and office fields read `not joined to this case in the register` | complete case files; decision date and office on that date for every case |
| **S12** | `BaseRateRow.fy`, `BaseRateRow.kind` | the research files (the FY and the ratio kind are in `property` today, F30) | base rates as verbatim cards | a `% of GDP` lane aligned to the stack's FY axis without S3's full series |
| **S13** | `replaces: claimId \| null` on `law` edges in `pay-pensions` | the pay-pensions file | the Agnipath card says the record does not join it to the terms it replaced and links to the pay-levels table | old and new terms side by side with identical fields |
| **G5** [UX review] (U1): **a build prerequisite, not an upgrade** | split `force.generated.ts` into a graph part (`_NODES`, `_EDGES`) and a page part | the generator (finance G5) | none to ship: `DataContext` imports the module, so the three series and every page-only export ride in the entry chunk today (`dist/assets/index-Bp_P7S4Y.js`, 9.8 MB raw, 2.3 MB gzipped, 2026-10-04) and delay first paint on every route | the entry carries nodes and edges only; SG-50 fails, not prints, if a string unique to the series or the page part is in the entry |

The smallest first steps are S8 (a typed accessor, no research) and S1 and S4 (fields the
transcriber already knows). [UX review] (U1) G5 comes before the page is built: it splits what the
generator already writes, and no page decision can take the series out of the entry without it. S3's population rows are the only research among the first four.

### 3.4 URL parameters

All through `useSearchParams` with `{replace: true}` and the house `setParam` helper.
**Absent = default = unfiltered, nothing selected.** An unknown value falls back to the
default and one amber line under the strip reads `ignored an unrecognised {param} value`.

| param | values | default | written by | reach |
|---|---|---|---|---|
| `lens` | `budgets` \| `footprint` \| `procurement` | `budgets` (never written) | tabs | the mounted panel; the strip's facts |
| `payer` | `union` \| `states` | both | rail | **budgets**: which rows the ledger, twins and state table read; the stack is Union-only and says `not affected` under `states`. **footprint, procurement**: inactive, reason `installations and contracts are not budget rows` |
| `st` | a `StateCode` | none | rail select; any map; Find | **budgets**: marks the state on both maps, opens `StatePanel`, filters the city ledger; `dl` accents the Delhi Police lanes; `jk` accents the J&K Police Union lane; grants inactive without S2 with the reason; the stack says `Union demands are not placed by state`. **footprint**: accents the state, filters `PlaceList` and the city ledger. **procurement**: inactive, reason `a vendor's registered office is not where its work is` |
| `fy` | `YYYY-YY` or `YYYY-YY..YYYY-YY` | all | rail From/To; a stack axis FY | **budgets**: dims stack and ledger columns outside the range to 20–30% opacity (**the axis never rescales**); filters twins, the state table's columns and the office lanes' highlight; strength tables dated 1 January Y count in FY Y−1–Y, stated on the control. **footprint**: inactive, `{dated} of {n} installations carry a date`. **procurement**: awards and case records whose date falls in the range; undated shown under all years only; the slice not reached (`rates are over all years`) |
| `stage` | `BE` \| `RE` \| `actual` | **derived**: the stage with the widest FY coverage among demand-level defence rows (BE today, F5); never written when equal to the default | rail segmented | the stack, `DelhiLine`, the twins' default sort; **the ledger draws all three slots regardless** at ≥ 640 px and one stage below (D47); the control prints per option `{k} of {FY_AXIS.length} FYs` |
| `comp` | comma list of `BudgetComponent` | all seven | rail checkboxes | budgets: the ledger and the twins; the stack draws its bands regardless and says `the stack shows every component; the filter applies to the ledger` |
| `sfy` | `{fy}:{stage}` from `STATE_PAIRS` | `defaultStatePair(m)` | the spend map's select | the spend map only |
| `m` | `gsdp` \| `cr` \| `percap` | `percap` with S3, else `gsdp` | spend-map control | spend-map class and value |
| `sy` | a strength year | `defaultStrengthYear` | strength-map select | the strength map; every year stays in the table |
| `kind` | comma list of `FootprintKind` | all | footprint chips | marks, matrix accent and `PlaceList`; 0-row kinds are always listed and `aria-disabled` |
| `body` | a node id among `LANES` bodies | none | ledger body label; Find | accents that body's lanes and opens `BodyCard`; **never filters** |
| `cell` | `{laneKey slug}@{fy}` | none | a ledger cell | `CellCard` |
| `vendor` | a node id in `VENDORS` | none | vendor label; Find | accent and `VendorCard` opened **with its comparators**; **never filters** (Review Focus 3) |
| `case` | a case node id | none | case heading; Find | scrolls to the pair row and accents both columns; **never filters** |
| `rec` | an edge id | none | Open record | finance `RecordCard` |
| `sel` | a node id | none | Show connections; the graph | `GraphExplorer`'s selection, shared by design; **never used for vendor accent** (D37) |
| `tier` | comma list of the four tiers, or `none` | all | rail toggles | **shared with `GraphExplorer`**; series rows are `documented` or `reported` by `rowTier`; a response is re-admitted whenever its claim is shown (finance D35) |
| `find` | text | empty | `Find` | the results list only |
| `view` | `stage` \| `table` | `stage` | Table view | every twin open; [UX review] (U23) kept on lens switch |
| `tp` | integer ≥ 1 | 1 | pagination | 400 rows per page |

**`GraphExplorer` owns** `q`, `fam`, `pred`, `ty`, `amt`, `from`, `to`, `focus`, `hops`,
`path`; the page writes them only through "Show connections" and "Apply {fy} to the graph"
and never reads them. Switching lens keeps `fy`, `st`, `stage`, `tier`, `find`, `sel` and
[UX review] (U23) `view` (under `view=table` the twins are the reader's page, and a tab change must not
close them); clears `rec`, `cell`; keeps `body`, `vendor`, `case`, `kind`, `payer`, `comp` inactive with
a reason where they do not reach the lens. **No param pre-selects a party, a company, a
person or a case; there is no `party`, `vendor-class` or `era` param** (D46).

### 3.5 Live region and unavailable options

Exactly one `aria-live="polite"` region, debounced (150 ms for maps and filters, 300 ms for
Find). It carries every filter effect in words (`from {N} to {k} {unit}`), lens changes,
panel open and close, `Link copied`, `Citation copied`, `{table} copied, {rows} rows`,
`shown as tables` / `shown as stage`, `{k} matches for {find}`, and the FY readout's title
when an axis FY is chosen. Wherever `{N} → {k}` is drawn the arrow is `aria-hidden` and a
visually hidden `from {N} to {k}` carries the words. Unavailable options are
`aria-disabled="true"`, focusable, with the reason inside the accessible name (`Per person,
unavailable: no population series in this build; a 2011 Census base would re-rank states
(S3)`).

---

## 4. Page anatomy

```
┌ Kicker · PageTitle · Standfirst · Byline · standing line ───────────────────────────────── ┐
├ RESOLUTION STATEMENT (three rows: Union · State · City — fixed words + derived counts) ≤132px┤
├ DenominatorStrip (sticky; facts per lens) + ReconciliationLine + active-filter line ───────┤
├ LensTabs [ Budgets | Footprint | Procurement and people ]   Find ⌕ · Copy link · Table view ┤
├────────────────────────────────────────────────────────────┬─────────────────────────────┤
│ FILTER RAIL (row, wraps): Payer · State · FY from–to ·     │ MARGIN 22rem (xl sticky)    │
│   Stage · Component · Tier · Reset — each with {N} → {k}   │  rest: ReadingKey           │
├────────────────────────────────────────────────────────────┤        ControlCard          │
│ ANSWER SEQUENCE (numbered Q-blocks; the first is a graphic)│        CannotShowCard       │
│  Budgets:     Q1 DemandStack ═╗ (one FY grid)              │  fy:     FYReadout          │
│               Q2 OfficeLanes ═╝ → Q3 LineLedger →          │  cell:   CellCard           │
│               Q4 CompareBlock → Q5 PayTerms + ContractCards│  body:   BodyCard           │
│               → Q6 StatePair + StateTable → Q7 DelhiLine + │  st:     StatePanel         │
│               CityLedger → Q8 GrantsTable                  │  vendor: VendorCard (+ its  │
│  Footprint:   Q1 FootprintMap → Q2 KindMatrix + PlaceList →│          comparators)       │
│               Q3 CityLedger → Q4 CompareBlock              │  rec:    RecordCard         │
│  Procurement: Q0 SymmetryContents →                        │                             │
│     ch.1 [symmetry: procurement-industry] Q1 AwardsByClass │                             │
│          (+ AoN void card in frame) → VendorGrid           │                             │
│     ch.2 [readMeFirst + caveat] Q2 SliceBesideFile         │                             │
│     ch.3 [symmetry: money-people] Q3 BondTable · BoardRoles│                             │
│     ch.4 [symmetry: literature] Q4 CaseTimeline → CasePairs│                             │
│     Q5 Narratives                                          │                             │
├────────────────────────────────────────────────────────────┴─────────────────────────────┤
│ Each block: h3 "Q{n} — {question}" · graphic or AnswerLine · caption (body size) · twin    │
├ LAST BLOCK OF EVERY LENS: "Q{n} — What is not published?" (CannotShow, findings size)     ┤
├ SHARED: Connections (#connections) · Contested (#contested) · Gaps (#gaps) ·              ┤
│         Refusals (#refusals) · Source ledger · TierLegend · Standing note                  │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Stage grid:** `xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-6`. Below `xl` the
  margin renders as a block directly under the component that opened it; at rest the
  `ReadingKey`'s swatches render under the first figcaption and `ControlCard` directly after
  the lens's last answer block, before `CannotShow` (finance U25). DOM order: centre, then
  margin.
- **The resolution statement is not chrome that scrolls away** (D1): it is the second
  element of the head on every lens, never sticky, never collapsed; the strip's first fact
  links back to it (`#resolution`).
- **Fold budget at 1280×800 (Budgets):** head ≤ 160, statement ≤ 132, strip and lines ≈ 64,
  tabs ≈ 44, rail ≈ 44, `DemandStack` `clamp(360px, 100vh − 460px, 520px)` with its
  reconciliation row and denominator line inside the figure; **the pension band and its
  share label on the latest column are in the first viewport** (SG-33). [UX review] (U2) At 390×844 the
  budget is measured on the first build, not assumed (§12, SG-33, D58).
- **Chrome is constant across lenses.** Head, statement, strip, tabs, rail, the last "not
  published" block, graph, contested, gaps, refusals and sources are the same components.
  Only the answer sequence changes.
- **Lenses:** `role="tablist"`, three tabs, manual activation, URL-driven; only the active
  panel is mounted. Budgets is first because the brief orders it first; the order is no
  claim.
- **Margin precedence:** `rec` > `cell` > `fy` readout > `vendor` > `body` > `st` > rest.
  Every panel moves focus to its `h2`, has `Close` first after the `h2` and `Back to
  {origin}` at its foot; Escape closes it only when focus is inside (finance D49).
- **Q-block numbering is fixed per lens** (§2.1). A block with nothing under the filters
  still renders its heading and its empty sentence: the numbering never shifts (D2).

### 4.1 Header copy (fixed, no figures)

- `Kicker`: `Security spend · defence, police, intelligence and the bodies around them`
- `PageTitle`: **The money India spends on force**
- `Standfirst`: "The Union pays for defence and for its own police; each state pays for its
  police; only Delhi's city police has a budget line of its own. This page draws what each
  payer budgets and spends, where force sits, who is paid and on what terms, and what the
  Ministry of Defence has bought and from whom, each figure beside what it is a share of and
  what it is compared with. Spending on force is a policy choice. A large number is not a
  finding."
- `Byline`: `force {FORCE_META.runId} · records read to {FORCE_META.asOf} · open-market slice
  from the CPPP scrape {provenance.inputs[].sha256_16 joined} (as of {provenance.asOf}) ·
  built from {counts.files} research files, cross-examined ({audit.verdicts.length} audit
  verdicts, {counts.killed} claim killed)`. `META.empty` → `force: register not yet
  promoted`; `SLICE === null` → `open-market slice not built in this copy`.
- **Standing line** (body size): "No colour on this page stands for a party, a government,
  a state or a verdict. Party appears only as text, as the record states it. Vendors appear
  beside the vendors they compete with; cases appear beside the case recorded as their
  control."

---

## 5. Section by section

Each component gives, in order: **Reads** (exact exports), **Encoding**, **Caption** (body
size, 14 px `text-text-secondary`, left rule, ≤ 72ch, directly under the graphic, referenced
by `aria-describedby`; the full text of every caption is repeated verbatim in §9), **Twin**,
**Empty / void / partial**. [UX review] (U26) Every graphic is a `<figure>` labelled by its Q-block's `h3` (one `h3` per
block; a figure-internal title such as a panel name is an `h4` or plain text, never a second
`h3`), the denominator line inside the figure (mono 12 px, above the caption), the
caption, and a `<details>` twin whose summary reads `{h3} as a table · {rows} rows`. The
finance twin contract (U15) applies verbatim: a closed twin exposes nothing to assistive
technology; its controls are tabbable exactly when open; the skip link before each graphic
reads `Skip to the table`; directly after the tabs one link reads `Every graphic on this
lens has a table; show them all`; a twin column that mirrors a visual class prints the
class's meaning, never the token.

**The answer-block contract** (every lens): a block is a `<section aria-labelledby>` whose
`h3` reads `Q{n} — {question}` verbatim from §2.1. Its first child is an `AnswerLine` (one
or two sentences, every figure derived, every ₹ through `crContext`) **or** a graphic, never
both above the block's fold; when a graphic leads, its one-sentence denominator is the first
sentence of its denominator line. [UX review] (U10) A graphic-led block whose question asks for a
figure (Budgets Q1) also carries one derived **answer sentence** as the first text node of its
`<figure>`, before the drawing and first in the drawing's `aria-describedby`: one line, every
figure derived, every ₹ through `crContext`, with its basis words. It is not an `AnswerLine`
(it sits inside the figure, under the `h3`), it is the same text at every width, and the
twin's `<caption>` repeats it. The block ends with its caption and its twin.

### 5.0 Chrome

#### 5.0.1 `ResolutionStatement` (new; `id="resolution"`; the head's second element; from B)

- **Reads:** `UNION_ROWS`, `STATE_ROWS`, `FORCE_STRENGTH`, `FORCE_FOOTPRINT`,
  `COMMISSIONERATES`, `FY_AXIS`, `rowTier`.
- **Form:** a `<dl>` of three rows with a visible `h2` "What resolves at which level"; label
  column 8rem; words in body size; a derived mono 12 px line beneath each. **The words are
  fixed copy restating spec §2's paragraph sentence by sentence; every figure is a derived
  brace** (caption C1, §9):

  | `dt` | `dd` words (fixed) | `dd` mono line (derived) |
  |---|---|---|
  | **Union — to the line** | "Every rupee the Union spends here resolves to a line in a demand for grants, with Budget Estimate, Revised Estimate and Actual where the document prints them." | `{UNION_ROWS.length} line rows · {unionBodies} bodies · FY{FY_AXIS[0]}–FY{FY_AXIS.at(-1)} · actuals for {fyWithActual} of {FY_AXIS.length} FYs` |
  | **State — to the Police head** | "Each state's police money resolves to its Police major head and no further, except where a state's own budget opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while the national strength table is unreachable, and say so. Prisons, home guards, fire and forensic money resolve only as Union scheme totals and are not budget rows here." | `{statesWithRow} of 36 states and UTs carry a Police-head row ({fyRange}) · {statesWithOwn} with their own budget series · {statesWithStrength} with a strength row; {reportedStrength} of {FORCE_STRENGTH.length} strength rows reported` |
  | **City — to the footprint, and Delhi** | "Only Delhi Police has a budget line of its own, and it is a Union demand. Every other city's police money is inside its state's police head, and this page prints those words in place of a number. Cities appear through what is located in them." | `Delhi Police: {delhiRows} line rows, FY{a}–FY{b} · {COMMISSIONERATES.length} commissionerates placed, {commWithStrength} with a strength row · {fpCities} cities with an installation` |

- **Empty (`META.empty`):** the words stay; each mono line reads `register not yet
  promoted — nothing below is zero`. A series with zero rows: that row's mono line reads `no
  rows in this build`.
- **Below 640 px:** the `<dl>` stacks (label above words), mono lines kept, never collapsed.

#### 5.0.2 `DenominatorStrip` (existing, sticky; facts per lens)

`filtered={{from, to}}` is the lens population before and after filters; `asOf` reads `read
to {FORCE_META.asOf}`. Fact 1 on every lens ends with the link `what resolves at which level`
(`#resolution`).

| lens | facts |
|---|---|
| Budgets | 1 `{rows} of {FORCE_BUDGETS.length} budget rows · {stage}` · 2 `defence {stage} {fy}: ₹{sum} cr across {demands} demands, computed here; pensions {p}% {basis words} · published total ₹{pub} cr ({recon words})` (the latest FY of the stage with a full stack); [UX review] (U9) where that FY has no published total, the tail reads `no published all-demands total for FY{fy}; latest published: ₹{pub} cr (FY{fy′}, {stage}) →`, linking to that column's readout · 3 `{covered} of {FY_AXIS.length} FYs have a {stage} stack · actuals for {fyAct}` · 4 `{statesWithRow} of 36 map units have a state police row · Delhi's police is a Union line` · 5 `{reported} rows transcribed from a secondary (reported)` · 6 `{zeros} rows print ₹0 as recorded` |
| Footprint | 1 `{rows} of {FORCE_FOOTPRINT.length} installations` · 2 `{kindsWithRows} of {FOOTPRINT_KINDS.length} kinds recorded; {emptyKinds} with no row` · 3 `{statesWith} of 36 map units with any row · {cities} cities named · no coordinates` · 4 `{dated} of {n} dated` · 5 `{commissionerates} commissionerates; budget inside the state's police head; city strength: no primary table` |
| Procurement | 1 `{awards} contracts MoD named ({priced} with ₹, {unpriced} unpriced) to {vendors} vendors` · 2 `{public} public-sector beside {private} private, JV or foreign — vendor class not a field` · 3 `{CASES.length} cases, {pairs} control pairs, {unpaired} unpaired · {records} court and audit records` · 4 `{answered} of {alleged} alleged claims with a recorded response` · 5 `{bonds} bond records, {donors} donors, {parties} parties` · 6 `open market: {dedup} award decisions in {classes} buyer classes, {works}% one works buyer — read by class` (or `open-market slice not built in this copy`) |

Below 640 px the strip keeps fact 1 and the date on one line, [UX review] (U3) `{rows} of {N} rows ·
{stage} · read to {asOf} · levels`, where `levels` is the link whose accessible name stays `what
resolves at which level`; facts 2–6 move, whole, to a mono list directly under the lens's first
figcaption (finance U26), except Budgets fact 2, which Q1's answer sentence carries (U10) and
which is not printed twice.

#### 5.0.3 `ReconciliationLine` (in the sticky wrapper; mono 12 px, always rendered)

- **Budgets:** `{FORCE_BUDGETS.length} rows = {union} Union ({demandLevel} demand-level + {sub}
  lines inside a demand + {grants} grants to states + {published} published totals) + {state}
  state ({rbi} RBI Police head + {own} a state's own budget + {prs} PRS transcriptions,
  reported) · {zeros} recorded as ₹0 · no total on this page adds rows from two levels`.
  Each term links to the ledger twin filtered by it (in-page); each stage word in the
  strip sets `stage`.
- **Footprint:** `{FORCE_FOOTPRINT.length} installations = ` then `{n} {kind}` for every
  declared kind, **0-row kinds printed** as `0 {kind} (none in this register)`, each a link
  that sets `kind`.
- **Procurement:** `{FORCE_EDGES.length} records = {award} awards + {enforce} court, audit and
  investigation records + {contra} responses ({audit} added by the audit) + {role} office and
  board + {bond} bonds + {law} rules + {analytic} comparisons + {other} other · tender slice
  {raw} raw rows → {dedup} after dedup`.

Below 640 px it is a `<ul>`, not sticky, under the first figure.

#### 5.0.4 Active-filter line, `Find`, `ReadingKey`, `ControlCard`

- **Active-filter line** (finance §5.0.4), words not codes: `filters: FY 2014-15–2024-25 ·
  Maharashtra · stage actual · components: pay, pension · reset`. `reset` clears every page
  param except `lens` and `view`; it never touches the graph's params.
- **`Find`** (finance §5.0.5): searches node `label`, `sub`, `al`, footprint `label` and
  `city`, budget `head`, edge `lab`. Result groups: **Bodies** (`Show its budget lines` →
  `body`, `lens=budgets`; `Show connections`), **Places** (`Show in footprint` →
  `lens=footprint&st`; a commissionerate row prints its budget cell, the fixed sentence,
  in the result itself; [UX review] (U29) a commissionerate or any non-Delhi city body is never
  offered `Show its budget lines`, because `body` takes only `LANES` bodies (§3.4): after the
  fixed sentence its verb is `Where its police money sits`, which writes `st` and `lens=budgets`), **Vendors** (`Show vendor` → `vendor`, `lens=procurement`, always
  opening with comparators), **Cases** (`Show the pair` → `case`), **Records** (`Open
  record` → `rec`). Order: exact label, alias, label substring, `lab` substring; ties by
  label. **Never by amount or degree.** A unique match is not auto-selected. Empty: `No body,
  place, vendor, case or record in this register matches "{find}". This is a statement about
  the register, not about the world.` [UX review] (U4) At 390 Find is a full-width `type=search`
  rendered as the first element under the tabs, outside the rail `<details>`, never pinned,
  its results inline directly beneath it.
- **`ReadingKey`** (margin at rest): the four tier dashes with their words; family hue
  swatches; the shape key; textures — hatch `no row in this register` (never zero), the
  Delhi crosshatch `police paid by the Union`, stipple `counts recorded without per-lakh`,
  `ZERO_FILL` `₹0 as recorded`, the band lightness steps for stack components, the pay
  bracket, the reconciliation glyphs `=` `≠` `·`, the `positioned within state, not
  geocoded` dot; the three stage slots `BE · RE · actual, left to right inside each year`;
  the energy line "No colour on this page stands for a party, a state or a verdict. Hue is
  only the kind of actor."; "Rose marks a response or denial, never 'bad'. Amber marks
  something not recorded." A **Words** block: `BE` the budget's first estimate; `RE` the
  revised estimate later that year; `actual` the accounts, two years later; `demand` one
  grant as Parliament votes it; `line` a sub-head inside a demand as the document prints it;
  `published total` a total the document itself prints; `computed here` a figure this page
  computed, with its a of b; `reported` transcribed from a secondary source; `derived`
  computed by the research from a ratio, not a printed count; [UX review] (U9) `of published
  total` / `of stack, computed here` the two bases of the pension share (the published total
  where the Summary prints one, else the stack); (U18) `hidden by filter` rows that exist but a
  filter hides, drawn dimmed, never hatched — not absent; (U13) `as published: ₹ lakh` the unit
  the source printed before the research converted it. When `famSplits` is not empty,
  finance U24's inconsistent-hue sentence.
- **`ControlCard`** (margin at rest; "The same lens on the other side"): the lens's pinned
  domains (`LENS_DOMAINS`), each one block: base-rate rows (`{numerator} of {denominator} —
  {label}`; a percentage only when the denominator is an integer ≥ 10; [UX review] (U19) a row
  `baseRateForm` marks `two-figures` renders `{numerator} and {denominator} — {label}` with its
  chip, no percentage and no whisker; `null` → `not computed
  in this file` with the chip `figure in the research file's wording, not computed by this
  page`), then that domain's `FORCE_SYMMETRY` text verbatim in the same element, with
  `wording: {domain} research file, run {runId}`. On Procurement the card holds only links to
  the chapter heads (the texts are the chapters' spine there and are not printed twice).
  Empty: `No symmetry check recorded for this lens — the control has not been run. This is a
  gap, not a pass.` in amber.

#### 5.0.5 Filter rail

§6. Each control carries its live `{N} → {k}`.

### 5.1 Budgets lens

#### 5.1.1 Q1 — What does the Union budget for force, year by year, and how much is pensions and pay? (`DemandStack`, new; the centre; from A)

- **Reads:** `defenceStack(stage)`, `structureBreaks`, `payBracket`, `agnipathTicks`,
  `policeStack(stage)`, `delhiLine`, `policePayTicks`, `PUBLISHED_TOTALS`, `FY_AXIS`.
- **Form:** two stacked-column panels, **Defence (the Ministry of Defence's demands)** above
  and **Police (the Home Ministry's Police demand)** below, on **one FY axis and one ₹ crore
  y-scale** (linear from 0, shared, frozen: the police panel is short because the money is
  smaller, and the shared scale is the comparison). One column per `FY_AXIS` entry, missing
  FYs included.
- **Encoding:**
  - Defence bands, bottom to top in fixed order: revenue · capital · MoD civil and misc. ·
    pensions. Bands are **lightness steps of one neutral series with 1 px separators and
    direct labels at the right edge** (never family hue: a component is not an actor
    family). Pensions is the topmost band and carries, on every column, a mono label [UX review] (U9)
    `{p}% of published total` where the column has one, else `{p}% of stack, computed here`
    (one basis rule, §3.2 `crContext`), and, on the latest column, `₹{cr} cr`.
    Pre-2015-16 columns hold one revenue band per service demand (6–8 demands); the bands of
    one component share a lightness step and are separated by 1 px rules, so the composition
    change is visible without a hue.
  - **Published total tick:** where `published` exists, a 2 px horizontal tick across the
    column's width at ₹`published`, labelled once `published total (Summary)`; where the
    stack and the tick differ the gap between them is visible and the glyph says so (D10).
  - **Pay bracket:** a 2 px outline bracket on the revenue band's right edge from 0 to Σ pay
    lines, labelled `{k} pay lines` in the readout and twin. Where `k` changes, a short
    vertical tick on the axis reads `pay lines {k} → {k'}`. FYs with no pay rows draw an empty
    bracket cap with the words in the twin. Pay is never a band (F3).
  - **Agnipath tick:** a short horizontal tick inside the revenue band at Σ Agnipath height
    from the band's base, labelled once `Agnipath lines`; [UX review] (U25) the tick is drawing only (`aria-hidden`, not a
    link): the link `Agnipath lines → contract card` is text in the `FYReadout` and the twin.
  - Police bands: revenue · capital (verified disjoint, F10). **Delhi Police bracket:** an
    outline bracket on the police column at `delhiLine.total`, labelled once `Delhi Police
    (the one city budget)`. **Police pay ticks:** up to three labelled ticks at their FY and
    stage only.
  - **Outline dash** of every band = its weakest constituent tier (`rowTier`); today every
    Union row is `documented` (solid), and the caption says so.
  - **Missing column:** a hatched column the full panel height, label `no {stage} rows`; a
    partial column (2013-14 actual) draws its bands and hatches the rest with `revenue and
    MoD civil not recorded` and the label `partial: {k} of {n} demands`.
  - **Reconciliation row** (mono 10 px under the defence panel, one glyph per column,
    `aria-hidden`, duplicated in the twin): `=` equal to the published total · `≠` differs
    (Δ in the readout and twin) · `·` no published total.
  - **Structure rule:** a dotted vertical rule (an assembly rule, light; not a tier dash)
    through the defence panel at each `structureBreaks` FY, labelled `demand structure
    changes: {k} revenue demands → {k'}`.
  - The `fy` range dims columns outside it to 30% opacity; the axis does not move.
- **Interaction:** the FY labels on the axis are buttons (roving tabindex, one tab stop)
  named `{fy}, {stage}: defence ₹{sum} crore in {k} demands, computed here, pensions {p}
  percent, {recon words}; police ₹{total} crore` or `{fy}, no {stage} rows recorded`;
  choosing one opens `FYReadout` in the margin (inline below 640): the demands with head,
  ₹, tier and source; the published total and the reconciliation sentence (`the stack equals
  the published total` / `the stack exceeds the published total by ₹{Δ} cr ({pct}%),
  computed here` / `no published all-demands total for this FY`); each band's `crContext`;
  the pay lines listed; the police demand's revenue/capital/total check; Delhi Police; the
  base-rate rows whose `property` names this FY, verbatim. [UX review] (U12) Beneath every ₹ in
  the readout, mono: `read to {FORCE_META.asOf} · document: {first source label}`. (U14) Every
  demand row has its own `Copy citation` (`rowCitation`), and the readout has `Copy this year as
  text` (every row, the published total, the reconciliation sentence, `read to {asOf}`); each is
  announced through the live region and also rendered as visible `<output>` text. (U5) Coarse
  pointers: the first tap shows the readout line under the figure; a second tap on the **same**
  FY opens it, and a tap on a different FY re-reads instead of opening. Below 640 px a step
  control sits under the chart, `‹ earlier · FY{fy} · later ›`, three 44 px buttons bound to the
  same roving FY state, so the 11 px columns are not the only route to a year; the chosen
  column's label is always visible.
- **Answer sentence** [UX review] (U10) (the first text in the figure, before the drawing): `FY{latest}
  {stage}: pensions ₹{cr} cr, {p}% {basis words}; defence ₹{sum} cr across {k} demands, computed
  here; {k} pay lines inside revenue.`, every ₹ through `crContext`; where that FY has no
  published total it adds `latest published all-demands total: ₹{pub} cr (FY{fy′})`.
- **Denominator line (inside the figure):** `{stage}, ₹ crore, nominal, as published ·
  {covered} of {FY_AXIS.length} FYs drawn · defence stack = {k} demand totals per FY,
  computed here; equals the published all-demands total in {eq} of {pub} FYs that print one ·
  police stack = revenue + capital of the Police demand, checked in {chk} of {chk} FYs`.
- **Caption C2:** §9.
- **S3 / S12 present:** a 48 px strip under each panel on the same x, `defence ÷ GDP` and
  `police ÷ Union expenditure` as dot-on-rule per FY with the denominator source; missing
  years hatched.
- **Twin:** [UX review] (U11) one row per **drawn band row** (`kind: band`): `FY · stage · panel ·
  band (component word) · demand head · ₹ cr (with crContext) · share (with the U9 basis
  words) · tier · source`; one row per `(FY, panel)` of `kind: published total` carrying the
  published total, the stack sum (`computed here`), Δ, and the reconciliation **in words**
  (`equals the published total` / `exceeds the published total by ₹{Δ} cr ({pct}%), computed
  here` / `no published all-demands total for this FY`); one row per hatched `(FY, panel)`
  reading `no {stage} rows recorded`; pay lines, Agnipath, Delhi Police and police pay as rows
  of their own `kind` (`pay lines ({k})`, `Agnipath lines`, `Delhi Police (inside the Police
  demand)`), never as columns on a band row. A recorded zero reads `₹0 cr — as recorded`. No
  twin cell holds `=`, `≠` or `·`. The `<caption>` repeats the answer sentence (U10). Machine
  columns `kind`, `fy`, `fy_start`, `stage`, `panel`, `component`, `head`, `cr`,
  `published_cr`, `stack_sum_cr`, `delta_cr`, `tier`, `source_urls`; TSV with `# amounts:` and
  `stage`.
- **Empty:** no budget rows → both panels draw the axis with every FY hatched and the line
  `This register holds no budget rows in this build. Nothing below is zero.`

#### 5.1.2 Q2 — Who held the Defence and Home portfolios on each date? (`OfficeLanes`, new, on the finance `LoanClock` pattern)

- **Reads:** `ROLE_WINDOWS` for `MOD` and `MHA` (plus any body with ≥ 1 dated role edge,
  derived); `FORCE_META.asOf`.
- **Placement:** directly under the stack, **sharing its FY column grid** (each column's left
  edge is 1 April of the FY's start year), so a reader reads a column down from the money to
  the office-holder. Q3's ledger uses the same grid.
- **Encoding:** one lane per office; a bar per window outlined in its role claim's tier dash
  (every one is `reported` today); an open-ended window drawn to `asOf` outline-only with
  `end not recorded` trailing; the same window recorded in two or three files is one bar with
  `×{k} records` and each record listed in the twin (E20). Person label as text; **no party,
  no hue**; party text appears only in the twin's `as recorded` column where the role claim
  carries it.
- **Caption C3:** §9.
- **Twin:** office · person · from · to or `end not recorded` · tier · files · party as
  recorded in the role claim (or `not recorded`) · source.
- **Empty:** `No dated office record in this register for {office}.`

#### 5.1.3 Q3 — How has each Union line moved, and which years are missing? (`LineLedger`, new; from B)

The skill's "single node, flows over time" form: **periods as columns, lines as rows, a
missing period visible as a missing period**.

- **Reads:** `LANES`, `laneGroups`, `PUBLISHED_TOTALS`, `FY_AXIS`, `rowTier`, `crContext`,
  `bodyCoverage`, filters.
- **Layout:** an HTML/SVG hybrid table: a sticky left label column (body label as `h4` per
  group; per lane the component word, the line as printed in 12 px, `FY{fyFirst}–FY{fyLast}`
  and `{BE}/{RE}/{actual} of {n} FYs`), then one column per FY in `FY_AXIS` (all 28 at 1280,
  each ≥ 26 px; the container scrolls horizontally inside itself beyond that), then a right
  column `lane max`.
- **Groups (`laneGroups`):** Published totals first (`as the document publishes it`), then one
  group per body alphabetical, then Delhi Police as `the one city line`. Grants to states are
  not in the ledger (Q8). A renamed line sits under its predecessor labelled `renamed or
  restructured in the document — not joined`.
- **Cell encoding (frozen):** each FY cell holds **three equal slots, left to right: BE · RE ·
  actual** (position = stage). In a slot with a row: a vertical bar, height ∝ ₹ on the
  **lane's own linear scale from zero to the lane's maximum** (printed at the row's right as
  `lane max ₹{x} cr`); outline = the row's tier dash; fill one neutral tone. A slot with no
  row: **hatch** (`no row in this register`); [UX review] (U18) a slot whose rows exist but are
  hidden by `tier` or `payer` is dimmed as `fy` dims, never hatched, and is named `{k} rows hidden
  by the {filter} filter — not absent`. A row with `cr === 0`: a 1 px baseline tick on
  `ZERO_FILL` (`₹0 cr — as recorded`). Two rows in one slot (two editions, E3): two thin bars
  side by side. Pay, pension, revenue, capital are words in the lane label, never hue. **No
  column is summed and no residual row is computed** (D14): a line's size against its demand
  is `crContext`'s share.
- **Accents:** `body` accents every lane of that body (left rule; others unchanged; [UX review]
  (U24) each accented lane's row header carries `aria-current="true"` and the visually hidden
  words `selected body`, and `BodyCard` has `Go to its {k} lanes in the ledger`, which moves
  focus to the first). `fy` dims
  columns outside the range to 20% and never removes them. `comp` removes lanes of other
  components and says so in the heading (`{k} of {n} lanes under the component filter`).
- **Interaction:** a cell is a button (one tab stop for the grid, roving tabindex; arrows move
  by lane and FY; Home/End to the lane's first/last FY) named `{body} — {component} — {line},
  FY{fy}: BE ₹{a} crore, RE no row, actual ₹{c} crore — open for its share of the demand and
  the previous year` ([UX review] (U32): the grid's cell names are the one sanctioned place a ₹
  is named without its denominator, because the name points to the card that carries it; §13,
  SG-9); Enter writes `cell` and opens
  `CellCard` (every row of that lane × FY, each with `crContext`, note, tier, sources, Copy
  citation; [UX review] (U12) the citation is `rowCitation`, also rendered as visible `<output>`
  text beside its button, and beneath each ₹ `read to {FORCE_META.asOf} · document: {first
  source label}`; (U13) a converted row's ₹ element carries `as published: {x} ₹ lakh; shown
  here in ₹ crore`). First tap on a coarse pointer shows the readout block (≤ 4 lines); second opens.
- **Denominator line:** `{lanes} lanes · {cells} slots drawn, {hatched} hatched · {stage
  words}`.
- **Caption C4 (+ C4b when `fy` is set):** §9.
- **Twin:** (a) **Long form**, one row per budget row: Payer · Body · Demand title · Line as
  printed · Component · FY · Stage · ₹ cr · Tier · Note · Sources · Denominator (`crContext`) ·
  Comparison · Reconciliation (`computed here`, demand-level MoD-side rows only). Paged at 400
  (`tp`). (b) **Coverage**, one row per lane × FY: BE / RE / actual each `₹{x}` or `no row in
  this register`. Machine columns: `payer`, `body_id`, `component`, `head`, `fy`, `fy_start`,
  `stage`, `cr` (number; `0` stays `0`), `tier`, `lane_key`, `is_demand_level`, `source_urls`.
- **Below 640 px:** one stage at a time (`stage`, default BE with the reason on the
  control), FY columns 14 px, sticky 120 px labels, inner horizontal scroll with `‹ earlier`
  / `later ›` and a mono `showing FY{a}–FY{b}` line; [UX review] (U6) body groups as `<details>`,
  **closed by default** except the Published-totals group and any group accented by `body`,
  each summary `{k} lanes · BE {a} RE {b} actual {c} of {n} FYs`; both twins closed by default
  (the finance twin contract), the long form as `StackTable` cards when opened.
- **Empty / partial:** filters leave no row → every lane hatched across the range with `No
  budget row matches {filters}` naming the most-removing filter with a one-click reset;
  `META.empty` → the axis with no lanes and `Register not yet promoted — nothing below is
  zero`. Partial is the normal case and is visible as hatch; the axis is always `FY_AXIS`.

#### 5.1.4 Q4 — Compared with what? (`CompareBlock`, the house `BaseRatesSection`, placed in sequence; from B)

- **Reads:** `FORCE_BASE_RATES` and `FORCE_SYMMETRY` for the lens's pinned domains;
  `FORCE_NARRATIVES` of those domains for one link line.
- **Form:** the house base-rate cards (energy D11; finance §5.4.1) grouped by domain; each
  card `{numerator} of {denominator} — {label}`; a Wilson whisker only when both are integers
  and the denominator ≥ 10; [UX review] (U19) a row that `baseRateForm` marks `two-figures`
  (today the `state-police` party-group medians, of ₹ per head and of vacancy %) prints
  `{numerator} and {denominator} — {label}` with the chip `two figures as the research states
  them, not a share`: no percentage, no whisker, no `of`, so the page computes no ratio
  between two groups of states; the label verbatim; a ₹ numerator prints `₹{n} cr of ₹{d} cr`;
  each domain's symmetry text **directly beneath its cards in the same `<section>`**, body
  size, with `wording: {domain} research file`. Domains in order on Budgets: `union-defence`
  (GDP and Union-spending shares by FY, pension and capital shares, SIPRI peers),
  `union-home`, `pay-pensions`, `state-police`.
- **Caption C5:** §9.
- **Twin:** domain · label · numerator · denominator · ratio where integer · source.
- **Empty:** the `ControlCard` empty sentence in amber.

#### 5.1.5 Q5 — Who is paid, and on what terms? (`PayTerms` + `ContractCards`, new; from B with A's four cells folded into two columns)

Stance rule 2: pay and pensions are contracts with people; no salary of a named person.

- **`PayTerms` (table, no graphic):** `PAY_LAWS` rows: Rank class (target node label) · Pay
  level and entry pay as the record states (`lab` verbatim) · Rule (source node label) ·
  From · Tier · Source. Then an `AnswerLine`: "Pay and pensions in the Union demands are
  lines inside the revenue demands and the Defence Pensions demand; the stack above brackets
  them, and the ledger has their rows." with a button that sets `comp=pay,pension`. Then the
  `pay-pensions` analytic rows (pay-to-capital, pension per pensioner, CAPF rates, UP's
  salary share) as cards with their innocent readings, verbatim.
- **`ContractCards`:** one card per `CONTRACTS` row (Agnipath; OROP 2015; OROP revision; the
  8th CPC constitution), in date order. **Two equal columns:** left **"The terms and the
  stated case"** — the law edge's `lab` and `d`, the `FORCE_BENEFITS` row (`how`, `₹{amountCr}
  cr ({confidence})` as "cost or saving stated by the Ministry", or `no stated saving
  recorded` in amber), the office-holder whose window covers the `from` (`officeOn`, the date
  test), and every response in the chain whose responder is a `ministry` or an `agency` with
  `fam: 'state'`; right **"The stated objections and the answers"** — every other response in
  the chain (parties, veterans' bodies, petitioners) and the court's holding where an
  `enforce` edge targets the law node, each with responder, date, tier, text, source. Both
  columns use identical field rows. **The assignment to a column is by the responder node's
  `ty` and `fam`**, printed in the card foot as the rule, so no hand classification enters
  (D30). A response to a response is [UX review] (U27) a child `<li>` in a nested `<ul>` under the
  response it answers (indented, same size, depth ≤ 3), and its text begins `in reply to
  {responder}, {date or undated}:` (E32).
- **Agnipath's old terms:** "The record does not join the Agnipath terms to the terms they
  replaced (prerequisite S13). The regular-entry pay level for the same rank is in the pay
  table above." with an in-page link to the Level 3 row.
- **Caption C6:** §9.
- **Twin:** the pay table; one row per contract response (contract · column · responder ·
  date · tier · text · source).
- **Empty:** `No pay level recorded.` / `No contract recorded.`; an empty column prints
  exactly `No response recorded — asked/not asked unknown`.
- **390 px:** the two columns stack in fixed order at the same type size.

#### 5.1.6 Q6 — What does each state spend on police, against its economy, beside how many police it has? (`StatePair` + `StateTable`, new; A's maps, B's table)

Two choropleths side by side (stacked below `lg`), each a listbox of 36 options on the
finance `LoanMap` pattern (own SVG over `STATES`, `TexturePatterns`, `TextureSwatch`,
`ZERO_FILL`, north-to-south `MAP_ORDER`; `WelfareMap` itself unchanged), sharing `st`.

- **Left, spend — "Police spending by state":** `stateSpend(sfy, m)`.
  - `m=gsdp` (interim default): MH 2055 revenue ÷ GSDP of the same FY, in %. Drawn only for
    the `(fy, stage)` pairs whose FY equals the GSDP FY (F18); the `sfy` select lists every
    pair and marks the others `aria-disabled`, reason `GSDP in this build is for {gsdpFy}
    only`. The figure's tier is `reported` (the GSDP series is a Wikipedia transcription of
    MoSPI) and **the map frame is drawn in the reported dash** with the legend line `every
    ratio on this map is reported: its denominator is a secondary series`.
  - `m=percap` (S3 default): ₹ per person on the S3 basis, label `per person, {basis} {year}`.
    Without S3 the option is `aria-disabled` with F17's reason.
  - `m=cr`: ₹ crore, ramp; [UX review] (U33) no share of the drawn states' sum (D4); the
    caption adds that a ₹ choropleth of states is a population map.
- **Right, strength — "Police strength by state":** `stateStrength(sy)` — `perLakh` as
  printed; **the map frame is drawn in the reported dash** because every row behind it is
  reported (F16); the year control is a segmented control over the strength years with each
  year's row count (`2020 · 30 rows`), writing `sy`.
- **Classes (both maps):** ramp fill (`DEFAULT_RAMP`) in fixed pooled quantile bins (over
  every pair or year with no filters, frozen; the legend prints each bin's edges and names an
  empty bin `(none in view)`) · hatch `no row in this register` · **crosshatch** (45° + 135°)
  for `dl` on the spend map `police paid by the Union: Delhi Police is a line in the Police
  demand` · **stipple** on the strength map for `counts-only` (`dl`: sanctioned counts, no
  per-lakh) · hatch `GSDP not in this build` (`jk`, `tr` under `m=gsdp`). The ramp floor
  ≥ `#2e373f`. An empty class is named in the legend as empty. [UX review] (U18) A unit whose rows
  exist but are hidden by `tier` is dimmed, never hatched, and the legend names `hidden by filter
  ({k})` beside `no row in this register ({j})`.
- **Dot strip under each map (the comparison instrument):** every drawn state on the map's
  value axis, state codes as labels, sorted by value (a declared external quantity), with the
  median rule labelled `median of {k} drawn`. The map is for finding a state; the strip is
  for comparing (D19). [UX review] (U30) The strip is a drawing (`aria-hidden`); its text is the
  denominator line's `median of {k} drawn states: {value} {unit}`, the same line in the
  `StateTable` caption, and the table's sort buttons.
- **Denominator lines:** spend `{k} of 36 drawn · {fy} {stage} · head Police (MH 2055),
  revenue account only (capital outlay MH 4055 is not in the RBI row) · ÷ {denom} (reported)`;
  strength `{k} of 36 drawn · per lakh as printed, BPR&D via secondary sources · {reported}
  of {rows} reported · {counts-only} counts only`; [UX review] (U30) each line ends `· median of
  {k} drawn states: {value} {unit}`.
- **Readout** (hover, focus, first tap; a reserved block of up to four lines below 640):
  `{State}: {class in words}, {value with unit} · ₹{cr} cr {fy} {stage} · {crContext
  denominator} · {crContext comparison} — open the state for the rows`.
- **Caption C7:** §9.
- **`StateTable` (the twin and the reading surface):** 36 rows, north to south, always all
  36. Columns: State · Police head MH 2055 (revenue) for each RBI `fy × stage` (`₹{x}` or `no
  row in this register`), each via `crContext` · % of GSDP ({gsdpFy}, reported) or the null
  words · Own budget series (`{n} rows, FY{a}–FY{b}` → `StatePanel`) · District Police line,
  PRS (`₹{x} — reported`, in its own column, **never in the MH 2055 column**) · Police per
  lakh for each strength year · Sanctioned and actual counts **as the research file records
  them — read the note** (derived flagged by S4 when present) · Women % · Installations ·
  Commissionerates (count, link) · Sources. A unit with no row of any kind reads its reason in
  every cell, never blank. [UX review] (U17) The export is **two machine tables**, each its own TSV with its own `# table:`
  line: (1) spend, `st, state, fy, fy_start, stage, head, cr, tier, note, gsdp_cr, gsdp_fy,
  gsdp_tier, pct_gsdp, source_urls`, one row per budget row (own-series and PRS rows are rows
  with their own `head` and `tier`, never merged into MH 2055; E11, E12); (2) strength, `st,
  state, year, per_lakh, sanctioned, actual, women_pct, derived_counts, tier, note,
  source_urls`, where `derived_counts` is `true` when the note carries the research's DERIVED
  sentence (interim, by anchored text; S4: `StrengthRow.derived`). (U30) Sort buttons on the `%
  of GSDP`, `₹ cr` and `per lakh` columns (declared external quantities, §8.2.12), `aria-sort`
  on the sorted column; the default order stays north to south.
- **`StatePanel`** (margin, `st`): the state's MH 2055 rows (all four pairs) with tier and
  note; its other heads (UP's Grant 26, the PRS line) under `other heads, not comparable
  across states`; its strength rows with sanctioned, actual (and `derived by the research
  from per-lakh` when the note says so), women %, and the vacancy share `computed here` only
  when both counts are recorded and not derived; `stateRecords(st)` verbatim with tier and
  source (the research's per-capita and custodial-death sentences as quoted text, never
  parsed), [UX review] (U21) each with its `innocentReading` directly beneath at the same size,
  labelled `the reading in which nothing is wrong`; (U12, U13) every ₹ row with `read to {asOf} ·
  document: {first source label}` and, for a converted RBI row, `as published: {x} ₹ lakh; shown
  here in ₹ crore`; its installations by kind (link to Footprint); its commissionerates with the
  fixed city sentence; ASUMP heads naming the state (S2: rows). **No party line is written by
  the page**; a party appears only inside quoted research text. For `dl`: the first line is
  "Delhi's police is a Union demand line — see Q7" with the `DelhiLine` link; for `jk`: the
  row note on the move to Demand 51 is quoted (E8).
- **Empty:** no state rows → both maps fully hatched, legend `no state rows in this build`;
  the table keeps 36 rows.

#### 5.1.7 Q7 — Which city has a police budget? (`DelhiLine` + `CityLedger`; from A)

- **`AnswerLine`:** "One: Delhi Police, a Union demand line, FY{a}–FY{b}. Every other city's
  police money is inside its state's police head."
- **`DelhiLine`** — "The one city police budget": a small multiple of three lines on the
  stack's FY axis — BE (solid), RE, actual — ₹ crore; points only where a row exists, **no
  line drawn across a missing FY**; under it a `shareOfPolice` dot row (`computed here`).
  Strength rows (sanctioned counts, no per-lakh) as three labelled ticks. Twin: one row per
  `(fy, stage)`: total, revenue, capital, share of the Police demand, tier, source, and
  [UX review] (U25) a button `Open the line: Delhi Police {fy} {stage}` (the points are drawing
  only, `aria-hidden`).
- **`CityLedger`** — "City police: what is recorded" (also Footprint Q3, same component):
  one row per commissionerate in the footprint plus Delhi Police: city · state · body ·
  **budget** · **strength** · installations in that city (count, link).
  - Budget cell, Delhi: `₹{latest BE} cr BE {fy} — the Police demand (Union)` with the
    `DelhiLine` link.
  - Budget cell, every other row, **exactly** `CITY_POLICE_TEXT(state)`: `inside {State}'s
    police head (MH 2055) — no city budget is published`, followed by the link `{State}'s
    police head →` (sets `st`, `lens=budgets`). **No ₹ figure, no share, no estimate, in the
    cell, its `title`, its accessible name or its TSV cell** (SG-RF2).
  - Strength cell: a `FORCE_STRENGTH` row for the body if one exists, else `no primary table —
    the national police table is unreachable` (the `state-police` void linked).
- **Denominator line:** `{k} commissionerates recorded in {s} states · not every
  commissionerate: the national list is unreachable`.
- **Captions C8 (`DelhiLine`) and C9 (`CityLedger`):** §9.
- **Empty:** `No commissionerate in this register.` — the Delhi row stays.

#### 5.1.8 Q8 — What does the Union give the states for police? (`GrantsTable`)

- **Reads:** `GRANT_ROWS`, `grantRecipient`; S2.
- **Form (interim):** a table, no map: Scheme line (head verbatim, including the recipient
  where the head names one) · FY · Stage (BE printed `allocation`, actual printed `released`,
  from the head's own word) · ₹ cr (`₹0 cr — as recorded` where 0) · Tier · Source. Default
  sort head, then FY. The ASUMP released ÷ allocated base rates print above it verbatim. `st`
  is inactive on this table with the reason `the recipient state is in the line's text, not a
  field (S2)`.
- **S2 present:** a map of released ÷ allocated per state for the chosen FY on the §5.1.6
  pattern, `ZERO_FILL` with its words, hatch where no row; Ladakh and the merged UT listed
  under `not a map unit in this build`.
- **Caption C10:** §9.
- **Twin:** the table itself; TSV. **Empty:** `No grant line matches {filters}.`

#### 5.1.9 Q9 — What is not published? (`CannotShow`)

§5.4.3 for the Budgets domains.

### 5.2 Footprint lens

#### 5.2.1 Q1 — Where is it? (`FootprintMap`, new, on `IndiaMap` geometry; from B, with A's legend rules)

- **Reads:** `FORCE_FOOTPRINT`, `kind`, `STATES`.
- **Encoding:** one neutral dot (r = 2.5 px at 1280, ≥ 3 px screen at 390,
  `--color-text-secondary` with a 1 px ground halo) per installation in the current `kind`
  selection, **positioned within its state at the label anchor with the house golden-angle
  cluster rule clamped to the state's clearance** (`india-map`), never sized and never
  coloured by kind, body or family; a state with no row of the selected kinds is **hatched**
  (`no row of the selected kinds in this register`; with S10 an enumerated kind's empty
  state is hollow `none on the official list`); states with rows are plain ground.
  Commissionerate dots draw like every other dot (kind is a filter and a column, not a mark
  channel; D26). Overflow in a small unit (Delhi, Chandigarh) is drawn as `+{k}` beside the
  anchor, all listed in the readout and twin (E16).
- **Kind chips** (above the map; `kind`): all eleven declared kinds with counts; the two
  0-row kinds `aria-disabled` with `none in this register` and, where a void or gap explains
  the absence, its words (`prison`: jail-wise locations are not published; `ordnance`: the
  ex-OFB plants are recorded under dpsu-plant).
- **Readout (state):** `{State}: {k} installations in {c} cities — {kind counts in words}`;
  then up to four city lines `{City}: {kinds}`; then `— open the state for the list`.
- **Denominator line:** `{rows} of {FORCE_FOOTPRINT.length} installations · {kindsWithRows}
  of {FOOTPRINT_KINDS.length} kinds · {statesWith} of 36 units with any row · positions are
  states, not addresses`.
- **Caption C11:** §9.
- **Twin:** `KindMatrix` (§5.2.2).
- **Mobile:** full width; tap → readout → `Open the state`; [UX review] (U8) the chips become a
  group of checkboxes inside the rail `<details>`, with counts and the 0-row reasons as text,
  plus one `all kinds` control (`kind` is a list, which a single `<select>` cannot hold).
- **Empty:** all states hatched; `No installation matches {filters}` / `This register holds
  no installation rows in this build.`

#### 5.2.2 Q2 — Of what kind, in which city? (`KindMatrix` + `PlaceList`)

- **`KindMatrix`:** a real `<table>`: rows the 36 units north to south, columns every declared
  kind (all eleven), cells the count or `no row` (hatched background, the words in the cell),
  a last column `cities`; the two 0-row kinds keep their columns with the header note `none in
  this register`.
- **`PlaceList`:** one row per installation: Label · Kind · City · State · Run by (body,
  button: Show connections; `Show its budget lines` where the body has budget rows) · Since
  (or `date not printed on the list`) · Tier · Note · Sources (all, never behind "more").
  Sorted state (north to south), city, label; filtered by `st` and `kind`; paged at 400.
  Below 640 px: `StackTable` cards.
- **Caption C12:** §9.

#### 5.2.3 Q3 — Which cities have police money? (`CityLedger`)

The §5.1.7 component, mounted here with the city's installations by kind added. Review
Focus 2 is asserted on both mounts.

#### 5.2.4 Q4 — Compared with what? (`CompareBlock`, domain `footprint`)

§5.1.4 with the footprint base rates (cantonments and installations per million by state,
the research's own partial-register caveat in each label) and the footprint symmetry text
verbatim (the per-million comparison the research ran on both groups of states; party names
appear only inside it).

#### 5.2.5 Q5 — What is not published? (`CannotShow`, domain `footprint`)

### 5.3 Procurement and people lens (spine: the symmetry chapters and the cases; from B)

#### 5.3.0 Q0 — The same lens on the other side (`SymmetryContents`, new)

- A contents block at the lens head, before any figure: four chapter links, each with its
  control stated in one derived line:
  1. `Vendors — {pub} public-sector vendors beside {priv} private, JV or foreign vendors;
     {pairs} declared head-to-head comparisons` → ch. 1
  2. `Open market — {classes} buyer classes, each beside the whole tender file` → ch. 2
  3. `Both sides of the money — bonds to every party a donor bought for; board roles beside
     the rule` → ch. 3
  4. `Cases — {CASE_PAIRS.length} control pairs, {unpaired} case(s) without one` → ch. 4
- Each chapter begins with its **symmetry text verbatim, body size, in a bordered block
  headed "The same lens, run on the other side — {domain} research file"**, before any
  table or graphic. Ch. 1 ← `procurement-industry`; ch. 2 ← the slice's `readMeFirst` then
  `caveat`; ch. 3 ← `money-people`; ch. 4 ← `literature`. The texts name parties and
  governments: they are quoted, never drawn, and the page's own words never do (SG-RF4).
- **Empty:** a chapter whose domain has no symmetry text prints the `ControlCard` empty
  sentence in amber in the text's place; the chapter still renders.

#### 5.3.1 Chapter 1 — Q1 Who was awarded, to which class of vendor, when, and beside whom? (`AwardsByClass` + `VendorGrid`; the judge's merge of A §5.3.1 and B §5.3.1)

- **`AwardsByClass` (graphic):**
  - **Reads:** `AWARDS`, `vendorClass`, `nodeOf`, the AoN void (`FORCE_VOIDS`, domain
    `procurement-industry`, `what` beginning "DAC Acceptance-of-Necessity"), the AoN and
    class-share base rates.
  - **Encoding:** one linear year axis from the first award year to the last (empty years
    drawn as empty slots, never closed up; the FY grid's calendar years); **one mark per
    contract** at (year, ₹ crore on a log y-axis), fill = the vendor's **family hue**
    (`state` public sector · `capital` private, JV or foreign; D33), outline dash = the
    record's tier; within a year marks of one class sit in their own half-column so class
    reads as position too; **no column sum, no stacked bar, no share** (D34). Beneath the
    axis a **count row**: per year `{n} contracts named without ₹` as a numeral and small
    hollow squares by class, one per unpriced contract. A joint contract (one PIB total, two
    vendors; the procurement void under F22) is one hollow mark per vendor linked by a bracket and is never split into ₹
    (E14). Alleged awards are not drawn (E26).
  - **Beside it, same frame:** the **AoN void card** at the chart's type size: the void's
    `what` and `whyItMatters`, and the AoN base rates verbatim; then the research's PIB-sample
    class shares (`DPSU share of award ₹, 2021-25`, `private Indian share`, `Adani-linked
    vendors' share`, `L&T sole-vendor share`) as base-rate cards, each `₹{n} cr of ₹{d} cr`,
    with `wording: procurement-industry research file`.
  - **Readout:** `{vendor} ({class}), {date}: {lab} — ₹{a} cr or amount not stated — {tier} —
    {source}`; [UX review] (U25) on pointer hover or first tap
    only: the marks are drawing (`aria-hidden`), and each twin row has `Open record: {vendor},
    {date}`, which writes `rec`.
  - **Denominator line:** `{priced} contracts with ₹ · {unpriced} without · {public} public
    sector, {private} private, JV or foreign · a sample of PIB releases, not every contract
    signed; no share is computed here`.
  - **Caption C13:** §9.
  - **Twin:** one row per award: date · vendor · class (in words) · item (`lab`) · ₹ cr or
    `amount not stated` · joint total (`joint total ₹{x} cr announced for {vendors}; not
    split`) · tier · response or the exact sentence · source; plus one row per empty year.
- **`VendorGrid` (identical fields; Review Focus 3; from B with A's wider set):**
  - One card per member of `VENDORS`, **always all of them**, in the two class bands
    (public sector · private, JV or foreign; `unclassified` listed by name beneath, E15),
    alphabetical. A filter never removes a card: under `fy`, counts read `{k} of {n} awards in
    FY{from}–FY{to}` and a card with none in range reads `no named award in this range`.
  - **Identical field rows, in this order, on every card** (`vendorFields`), each with its
    null words: 1 Class (hue swatch + word) · `vendor class not a field (S5)` until S5 · 2
    Listing and identity (`nse`, `cin` from `FORCE_IDENTITY`) · 3 Recorded owner (`own` edges
    into the vendor: owner, share as recorded in `lab`) / `no owner recorded` · [UX review] (U15)
    3b Recorded holdings (`own` edges **from** the vendor: the owned body, its share as
    recorded in `lab`, tier, and that body's named-award count inline, e.g. `PLR Systems (51%,
    reported): {k} named award(s) — listed, not added to this vendor`, linked to its card) / `no
    holding recorded` · 4 Named awards
    `{n} ({withRupee} with ₹), FY{first}–FY{last}` / `none named in the Ministry releases the
    research read` · 5 Installations (footprint
    rows by body: count, states) / `none recorded` · 6 Declared comparison (`comparatorsOf`):
    comparator names as buttons with the analytic edge's `lab` and its figures as recorded,
    [UX review] (U21) and its `innocentReading` directly beneath at the same size /
    `no head-to-head declared — compared with the {other class} band` · 7 Electoral bonds
    (`bond` edges from the vendor or a recorded owner) / `no bond recorded in this register`
    + the `money-people` bond void verbatim at the same size · 8 Retired officers on the board
    (`BOARD_PAIRS` into the vendor) with the rule / `no board role recorded` · 9 Court, audit
    and investigation records (`enforce` edges targeting the vendor) / `none recorded` · 10
    Role in the record (`publicRole` verbatim) · 11 Stories told about vendors: one identical
    link on every card, `rated in Q5` · 12 Sources.
  - **`vendor` set:** the card is accented in place ([UX review] (U24) `aria-current="true"` on
    its `<dl>` and the words `selected vendor`; `VendorCard` has `Go to the card in the grid`) and **`VendorCard` opens in the margin
    with the vendor and its comparators side by side as equal columns** (or with the other
    class band's summary rows, `{k} vendors, {n} named awards` each, alphabetical, when none
    is declared). There is no state of the page in which one vendor's fields render without
    another vendor's fields in the same frame (SG-RF3). A `vendor` naming a node outside
    `VENDORS` prints `{label} is not a vendor in this register` and offers Show connections.
  - **Caption C15:** §9.
  - **Twin:** vendor × field table, one row per vendor, all fields as text.
  - **390 px:** one card per row, [UX review] (U6) each card's `<dl>` inside a `<details>` whose
    summary has the identical form on every card, `{vendor} · {class} · {n} named awards ({k}
    with ₹) · 13 fields`; the selected vendor's card and its comparators open; every card stays
    in the DOM with the same `dt`s, and an open card shows every field, sources included (D61);
    `VendorCard` opens inline after the card with its
    comparators stacked directly beneath it, field by field.

#### 5.3.2 Chapter 2 — Q2 Who bought on the open market, and how many bid? (`SliceBesideFile`, new; A's two forms, B's order and reference rows)

- **Reads:** `SLICE` (S8): `readMeFirst`, `caveat`, `rates.byClass`, `rates.byClassYear`,
  `rates.total`, `rates.excludingWorks`, `quality.total`, `classes.definitions`.
- **Order:** `readMeFirst` verbatim (body size, bordered, first) → `caveat` verbatim → Form A
  → Form B → the class definitions with their innocent readings. Never collapsed.
- **Form A (at rest):** one row per class in the file's order, never re-sorted: a horizontal
  bar of the class's share of slice award decisions (so the reader sees that works is three
  quarters) · a dot with Wilson 95% whisker at the class's single-bidder rate · a **short
  vertical tick** at the whole-file rate on the same portal · a **full-height hairline** at
  the whole-file rate (both labelled in text at the row end `whole file, same portal {x}% ·
  whole file {y}%`) · `{single} of {n}` in mono at the row start. Shared 0–max% x-scale
  rounded up to the next 10%, linear, frozen. Then, under a rule, two **reference rows**:
  `excluding the works class` and `the slice as a whole`, each labelled with the works-share
  sentence; **the slice-wide rate is never a mark in the class rows** (D42). Marks are
  neutral: no hue, no dash (the whole slice is `reported`, stated in the caption).
- **Form B (below, small multiples):** per class, single-bidder rate by year (dot + whisker)
  beside the same-portal whole-file rate that year (short tick); years with n < 10 draw no dot
  and read `n {n}: no rate drawn` (D43).
- **Interaction:** a class label highlights its multiple (in-page; never removes rows).
- **Denominator line:** `{dedup} award decisions after dedup ({share}% of the file) · rate
  denominator {n} with a bid count · slice-wide single bidding {total}% against {whole}% for
  the file — read by class; one works buyer is {works}% of decisions`.
- **Caption C14:** §9.
- **Twin:** per class and per class-year: class · definition · portal · year · raw rows ·
  dedup rows · [UX review] (U31) share of slice decisions (%) (dedup rows over the slice's dedup
  total, `computed here`, or the file's own field where it has one: Form A's bar) · n · single · rate · Wilson low · high · whole file same portal · whole file ·
  innocent reading; TSV with `#` provenance (input digests, dedup rule).
- **S8 absent:** `The open-market slice is not built in this copy of the register. Nothing
  here is zero.`

#### 5.3.3 Chapter 3 — Q3 Who sits on both sides of the money? (`BondTable`, `BoardRoles`)

- **`BondTable`:** one block per donor (`BONDS`), its every party as a row: Party (label,
  text) · ₹ cr as recorded · Bonds · Purchase window (`from`–`to`) · Tier · Source. Donors
  alphabetical; parties by first purchase date. Beneath, at the same size, the `money-people`
  bond void naming the vendors with no bond in the disclosure, and the `money-people` base
  rates (party totals as denominators). Party is a text column; no fill, no sort by party.
  **Caption C16:** §9.
- **`BoardRoles`:** one row per `BOARD_PAIRS` person: Person · Public office (`lab`, from–to)
  · Board (company, role, from) · Months between office end and board start (`computed
  here`, only when both dates exist, else `not computable: {which} date not recorded`) · The
  rule (`POST_RETIREMENT_RULES` text verbatim, with the void on the rule's number and date) ·
  Tier · Sources; then the base rate `0 of 2` verbatim and the void "No retired Defence
  Secretary, DGP or vice chief…"; then the declared board control (the analytic edge into the
  retired-officers class) quoted, with [UX review] (U21) its `innocentReading` beneath at the same
  size. **Caption C17:** §9.
- **Twins:** the tables themselves; TSV.

#### 5.3.4 Chapter 4 — Q4 What did courts and auditors record? (`CaseTimeline` + `CasePairs`; from B)

Stance rule 5: cases are records; Bofors sits beside Rafale by design.

- **`CaseTimeline`:**
  - **Reads:** `CASES`, `CASE_PAIRS`, `caseFile`, `responseChain`, `FORCE_META.asOf`.
  - **Encoding:** one shared x-axis from the earliest record in any case file to `asOf`; one
    lane per case, **ordered pair by pair** (each pair adjacent, pairs ordered by their earlier
    member's first record; unpaired cases last), a thin bracket in the label column joining a
    pair's two lanes labelled `control pair (recorded in {files})`. One tick per record at its
    date, **dash = tier**; a response tick (rose, its own dash) on the lane at the response's
    date when dated, else in the `undated` gutter; undated records in the right gutter. No
    colour other than rose; no party anywhere on the graphic.
  - **Caption C18:** §9.
  - **Twin:** case · date · record (`lab`) · source node · kind (court / audit / investigation /
    allegation / decision, from `caseFields`' `ty`/`fam` rule) · tier · response (or the exact
    sentence) · source.
- **`CasePairs` (the reading surface, and the spine):**
  - One **row per pair**, two **equal columns** (CSS grid `1fr 1fr`, field rows aligned with
    `subgrid`); the left column is the member whose first record is earlier (a date rule,
    never a party rule). [UX review] (U20) The row's `h4` is page-authored from the two case labels
    in date order, `{earlier case} beside {later case}`, and contains no word on SG-RF4's list.
    Beneath it, in a quoted block headed `wording: {file}`, every pair edge that recorded the
    pair prints its `lab`, its `d` and its `innocentReading`, at the same size and in that
    order; then the **symmetry sentences of the files that recorded the pair, verbatim**.
  - **Unpaired case (Adarsh today):** its own row, its record in the left column, and in the
    right column at equal width, size and weight **`No control pairing recorded for this case
    in the register.`** in amber, followed by the split-ids gap line where one applies (E23).
  - **Each column is a `CaseRecord` with fixed field rows, in this order** (`caseFields`),
    each with its null words: 1 Header: case label; counters `{records} records · first
    {date} · latest {date} · {answered} of {claims} answerable records with a recorded
    response` · 2 Decision record: the joined award (date, buyer, vendor, ₹ via `crContext`
    or `amount not stated`) / `decision record not joined to this case in the register (S11)`
    · 3 Office on the decision date: `officeOn(decisionDate, [MOD])` three-block rule / `no
    recorded office window covers {date}` / `no decision date joined` · 4 Allegation: the
    `alleged` records, each with its response chain **beside it at equal size** / `no
    allegation recorded in this case file` · 5 Investigation: records whose source is an
    investigating agency / `none recorded` · 6 Court: records whose source has `fam:
    'enforce'` and is a court or tribunal, by date / `none recorded` · 7 Audit: records whose
    source is the auditor / `none recorded` · 8 Latest record: the latest dated record's `lab`
    verbatim · 9 Counter-record: every response in the file, `Response from {responder}
    [{tier}], {date or "undated response"}` with its text, replies nested as in §5.1.5
    ([UX review] (U27)); an audit-added response reads `the
    audit (recorded on {subject})` (E31); none → exactly **`No response recorded — asked/not
    asked unknown`** · 10 Stories told about it: `rated in Q5` on every column · 11 Sources.
  - **`case` set:** scrolls to the pair row and accents **both columns' borders**; never
    filters, never isolates; [UX review] (U24) the pair row's `<section>` carries
    `aria-current="true"` and the words `selected case`.
  - **Caption C19:** §9.
  - **Twin:** the `CaseTimeline` twin plus a field table (case · field · value or null words).
- **Empty:** `No case record in this register.`; a pair whose filtered records are empty keeps
  both columns with `No record of this case falls in FY{from}–FY{to}.`

#### 5.3.5 Q5 — Which stories hold up? and Q6 — What is not published?

§5.4.2 (ladder over `procurement-industry`, `money-people`, `literature`) and §5.4.3, whose
derived lines include the DAC void sentence.

### 5.4 Per-lens blocks (every lens)

#### 5.4.1 `CompareBlock` (`id="baserates"`)

§5.1.4; one per lens, pinned domains per `LENS_DOMAINS`. Every rendered base-rate row has
its domain's `SYMMETRY` text, when one exists, inside the same section element (SG-RF6).

#### 5.4.2 Narratives, rated (`NarrativeLadder`; `id="narratives"`)

`NarrativeLadder` over `FORCE_NARRATIVES` filtered to the lens's domains; six rungs always
drawn (`RUNGS`); empty rungs `none in this file`; strongest case and strongest counter side by
side at equal size; the research file named; a toggle `show every domain's narratives
({n})`. **Caption C20:** §9.

#### 5.4.3 What is not published? (`CannotShow`; the last Q-block of every lens)

The lens domains' `FORCE_VOIDS` (each `what` and `whyItMatters` at full size, with sources)
and `FORCE_GAPS`, plus the lens's derived gaps (§5.5.3), in `GapsPanel` at the findings' type
size, under the heading `Q{n} — What is not published?`. Never collapsed.

### 5.5 Shared sections

#### 5.5.1 Connection graph (`id="connections"`; existing `GraphExplorer`)

- **Reads:** `GRAPH_NODES`, `GRAPH_EDGES` (the module's edges; the three series are tables,
  not relationships, and are not drawn). `height=620` (480 below 640), mounted on
  intersection, behind `Load the graph` below 640.
- **Status line:** "{edges} relationships among {nodes} entities in the force register.
  Budget lines, strength tables and installations are rows, not relationships, and are in the
  lenses above. {dropped} edges with an endpoint outside every register are not drawn. Ids
  are joined only where they match; {splitIds} entities appear under two ids until
  reconciled. {undated} relationships are undated. This graph's own filters are its own; the
  page's FY control does not reach it." A button `Apply {fy} to the graph` writes the graph's
  `from`/`to`. When `famSplits` is not empty, the §5.0.4 inconsistent-hue sentence follows.
- **Caption C21:** finance C15 verbatim (§9).

#### 5.5.2 Contested (`id="contested"`)

Every `alleged` non-contra edge of the module, each beside its response chain at equal width,
size and weight (energy `ContestedList`). Denominator: `{alleged} alleged claims · {answered}
with a recorded response · {unanswered} without — whether a response was sought is not
recorded.` Empty: `No alleged claims in this register.`

#### 5.5.3 Gaps (`id="gaps"`; existing `GapsPanel`)

All `FORCE_VOIDS` and `FORCE_GAPS`, grouped by lens then domain, plus **derived gaps**, each
shown only when its condition holds:

- "Demand hierarchy is not a field: {nested} of {cells} Union cells hold a demand and its own
  lines; the demand level is selected by the head's printed form" (S1 absent)
- "The Ministry of Defence's published total differs from the sum of its demand lines in
  {differ} of {checkable} years where both exist; the stack marks each"
- "{fyNoPublished} of {FY_AXIS.length} financial years have no published Ministry of Defence
  all-demand total in this register"
- "Union actuals in this register begin in FY{firstActual}; actual spend is recorded for {a}
  of {FY_AXIS.length} FYs, RE for {r}"
- "Pay lines change composition in {breaks}; no pay trend is drawn across a change"
- "Grants to states name their recipient in the line's text only; {asump} rows are not placed
  on any map" (S2 absent)
- "No population series: per-person spending is not drawn; a 2011 Census base would re-rank
  states" (S3 absent)
- "The spend map's denominator is a secondary GSDP series for one FY; {k} of 36 units have
  none" (S3 absent)
- "Base-rate years and kinds are in words, not fields" (S12 absent)
- "Budget, strength and footprint tiers are read from the `reported:` note prefix" (S4 absent)
- "{derived} strength rows give absolute counts derived by the research from a ratio"
- "{commissionerates} commissionerates have no strength row" (S9 absent)
- "No budget row for prisons, fire services, home guards, civil defence or forensic
  laboratories"
- "{noStateRow} of 36 map units have no Police-head row: {units}; {noStrength} have no strength
  row; {noFootprint} have no installation"
- "{emptyKinds} declared installation kinds have no row: {kinds}"
- "Installations have no coordinates; {noDate} of {n} carry no date" (S7 absent)
- "Vendor class is not a field; vendors are grouped by actor family" (S5 absent)
- "{unpriced} named contracts have no ₹; {joint} are joint totals not split by vendor"
- "DAC approvals name no vendor and no value: approvals by vendor class cannot be drawn"
- "Outcome rates by state exist only in research prose ({k} records); no per-state outcome
  surface is drawn" (S6 absent)
- "{casesNoDecision} of {CASES.length} case files have no decision record joined" (S11 absent)
- "{unpaired} case(s) have no recorded control pairing"
- "{enforceNoResponse} of {enforce} court, audit and investigation records carry no recorded
  response"
- "{emptySrcs} records have no source in the file"
- "{splitIds} entities appear under two ids and are not merged by name"
- the inconsistent-hue line when `ty`→`fam` splits exist
- **What the audit killed:** each `FORCE_META.killed` claim: id, `lab`, `killedReason`
  verbatim (D54).

Header: "{v} voids and {g} gaps recorded by the research, {k} claim(s) killed in audit, and
{d} derived by this page." Same type size as findings. Never collapsed.

#### 5.5.4 Refusals (`id="refusals"`)

§14 as a list, linked from the rail foot.

#### 5.5.5 Source ledger and foot

`SourceLedger` over every `srcs` in the module (edges, nodes, the three series) and the
slice's provenance, deduplicated by URL, grouped by `sourceClass`, full list always shown;
`establishes` = `cited by {n} records and rows, e.g. {first}`. Then `TierLegend` and the
standing note verbatim.

---

## 6. Filter rail and its effect on the denominator

One rail for all three lenses: the four filters the brief names (payer, state, FY range,
component) plus stage and tier. A control that does not reach the active lens stays visible,
`aria-disabled`, with its reason as its effect line; its param is kept.

| control | type | effect line beside it (live) | honours? (printed on the control) |
|---|---|---|---|
| Find | `type=search`, first after the tabs; [UX review] (U4) at 390 full width, first under the tabs, outside the rail `<details>`, never pinned | `{k} matches` | filters nothing |
| Payer | segmented `All · Union · States` | Budgets `{N} → {k} budget rows`; else `does not apply to {lens}` | "the Union stack is Union-only; States affects the ledger, the state table and the panels" |
| State | `<select>` of 36 map units alphabetical with per-lens counts; `(0)` options shown and `aria-disabled`, never hidden | Budgets `{N} → {k} state rows · Union lines not placed by state`; Footprint `{N} → {k} installations`; Procurement `does not apply: a vendor's registered office is not where its work is` | the label reads `State (where the record places it)`; on Budgets `a state's own police head; Delhi's police is a Union line; grants: recipient not a field (S2)` |
| FY from / to | two `<select>` over `FY_AXIS` + "All years", with a coverage ribbon for the active stage (one tick per FY with a stack; hatched FYs named) | Budgets `{N} → {k} rows · {fyIn} of {FY_AXIS.length} FYs`; Procurement `{N} → {k} records · {undated} undated shown under all years only`; Footprint `does not apply: {dated} of {n} installations dated` | "dims years outside the range; the axis does not move"; "strength tables dated 1 January Y count in FY Y−1–Y"; on Procurement "calendar dates of the record" |
| Stage | segmented `BE · RE · actual`, each option `{k} of {n} FYs` | `{N} → {k} rows` | "actuals arrive two years after the budget" and, while true, "BE is the only stage recorded for every year" (derived) |
| Component | seven checkboxes with counts; `Select all` | Budgets `{N} → {k} ledger rows`; the stack `not affected` | "components overlap by level; this filter never adds rows; pay sits inside revenue demands" |
| Tier | four toggles with dash swatches (`aria-hidden`; the word is the label) | `{N} → {k}` for the lens population; `also filters the connection graph`; [UX review] (U18) every figure that loses rows to it adds `{hidden} rows hidden by filters` to its denominator line | "series rows are documented or reported by their note; responses follow their claim" |
| Kind (Footprint) | chips, all eleven kinds with counts ([UX review] (U8) checkboxes inside the rail at 390); 0-row kinds `aria-disabled` `none in this register` | `{N} → {k} installations` | — |
| Spend metric · state pair · strength year (Budgets Q6, map controls) | segmented · `<select>` · segmented | per option `{k} of 36 drawable` · `{states} states` · `{rows} rows in {sy}` | `per person` `aria-disabled` without S3, reason in name; undrawable pairs `aria-disabled` with `GSDP in this build is for {gsdpFy} only` |
| Reset | button | clears page params except `lens` and `view` | never touches the graph's params |
| Copy link · Table view | button · toggle (`aria-pressed`) | `Link copied` | — |

Every change announces `from {N} to {k} {unit}` once through the live region. **The rail
refuses** (a fixed muted line at its foot, linking to `#refusals`): "Not offered: party,
government, era, vendor-class-only, 'risk' and city-budget filters — why →".

---

## 7. Interactions

| verb | trigger | writes | result | focus |
|---|---|---|---|---|
| Read a year | an FY axis button on `DemandStack`; a column (pointer); [UX review] (U5) the step control below 640 | — (in-page) | `FYReadout` in the margin (inline below 640), with `Copy citation` per row and `Copy this year as text` (U14) | the readout `h2`; `Close` / `Back to the chart` |
| Open the line | a ledger cell; [UX review] (U25) a `DelhiLine` twin row's button | `cell` | `CellCard`: every row of that lane × FY, each with `crContext`, note, tier, sources, `read to {asOf}`, Copy citation (`rowCitation`, U12) | the card `h2` |
| Show its budget lines | a body in Find, a `BodyCard`, a `PlaceList` "run by" | `body` (+ `lens=budgets`) | the body's lanes accented and scrolled into view; `BodyCard` | the card `h2` |
| Open record | an edge label anywhere; [UX review] (U25) an award twin row's `Open record` button | `rec` | finance `RecordCard` (its citation: `{lab or line} — ₹{x} cr ({stage}, FY{fy}) or the record's date — {denominator} — {comparison} — {tier} — {first source} {url} — ICIP {deep link}, read to {asOf}`, also rendered as visible `<output>` text) | the card `h2` |
| Select state | any map option; State select; Find `Show in footprint` | `st` | both maps (or the footprint map) accent the state; `StatePanel`; lists filtered | the panel `h2`; clicking the selected state clears it |
| Show vendor | a vendor label; Find | `vendor` (+ `lens=procurement`) | card accented in place; `VendorCard` with comparators; **both bands stay** | the card `h2` |
| Show the pair | a case label; Find | `case` (+ `lens=procurement`) | scroll to the pair row; both columns accented | the pair row's `h4` |
| Show connections | any entity button | `focus`, `hops=1`, `sel` | scroll to `#connections` | the graph detail heading; `Back to {origin}` |
| Filter | rail | the param | `{N} → {k}` announced | stays |
| Highlight class | a slice class label | in-page | accents its multiple | stays |
| Copy citation · Export | cards · `Copy as TSV — {table}` / `Download .tsv — {table}, {rows} rows` above every twin | — | clipboard / `.tsv`; `{table} copied, {rows} rows` | stays |
| Change lens | tab | `lens`; clears `rec`, `cell` | §3.4 | the lens heading |
| Close / Back | a panel's `Close` or `Back to {origin}` | clears that panel's param | the panel closes, announced | the invoking control, scrolled into view |
| Escape | focus inside a panel or an expanded row only | — | closes it | the invoking control |

Coarse pointers: the first tap on a column, a map state, a mark or a case tick shows its
text in a reserved readout under the graphic (one line where it fits; a block of up to four
lines below 640 px); a second tap [UX review] (U5) on the **same** target, or the readout's button, acts; a second
tap on a different target re-reads (replaces the readout) and does not act. Copy is device-neutral
("open", "choose"), never "hover" or "click". Reduced motion: no transitions on fill, no
animated scroll, no graph warm-up beyond what `GraphExplorer` honours.

---

## 8. Encodings

### 8.1 Channels

| where | channel | means | never means |
|---|---|---|---|
| everywhere | `strokeDasharray` (`TIERS`) | evidence tier: documented solid · reported `6 3` · alleged `2 4` · analytic `8 3 2 3`; a series row's tier is `rowTier`; a figure built from many rows takes its weakest row's tier (the reported-dash map frames) | style, era, party, stage, vendor class |
| graph, vendor band headers, award marks | hue (`FAMILY_COLOR`) | actor family; on award marks the vendor's family, which is the interim vendor class | party, state, verdict, "good/bad" vendor |
| graph | shape (`ty`) | entity type | vendor class, footprint kind, case type |
| graph | size (`sz`) | declared band | importance, ₹, degree |
| stack bands | lightness step of one neutral series + direct label + fixed order | budget component (revenue, capital, civil/misc., pensions) | actor family |
| stack | bracket outline (2 px, no fill) | a line *inside* a band: pay lines, Delhi Police | an extra amount on top |
| stack | 2 px horizontal tick across a column | the published all-demands total | a target or a norm |
| stack | `=` `≠` `·` under a column | reconciliation with the published total | quality of the year |
| stack | dotted light vertical rule | an assembly fact: demand structure change, pay composition change | a tier |
| stack, ledger, Delhi line | stage | carried by the `stage` param, the axis title and, in the ledger, **slot position** (BE · RE · actual) — **never by dash or hue** | — |
| ledger | bar height | ₹ crore on the lane's own scale (its max printed) | size against another lane |
| ledger, maps, tables | hatch | no row in this register | zero |
| ledger, maps, grants | `ZERO_FILL` + baseline tick + `₹0 cr — as recorded` | a recorded zero | no data |
| spend map | ramp fill in pooled fixed bins | % of GSDP (reported) · ₹ crore · per person (S3) | party, a score, generosity |
| spend map | crosshatch (45° + 135°) | Delhi: police paid by the Union | no data, zero |
| strength map | ramp fill in pooled fixed bins | police per lakh as printed | spending, quality |
| strength map | stipple | counts recorded without per-lakh (Delhi) | low |
| maps | reported-dash frame | every ratio or row behind this map is reported | a weaker map |
| footprint map (S10) | hollow | none on an enumerated official list | no row |
| footprint map | one neutral dot, placed within its state | one installation the list places in that state | size, kind, money, an address |
| award marks | position (year × ₹ log) · hollow square under the axis · bracket | one contract as PIB priced it · a contract named without ₹ · a joint total | a share, a sum, zero |
| slice | bar · dot + whisker · short tick · hairline | class share of slice decisions · class rate with Wilson 95% · its portal's whole-file rate · the whole file | ranking of buyers, wrongdoing |
| office lanes, award marks, case timeline | x | date on one linear scale aligned to the FY grid | — |
| case timeline | tick · bracket in the label column · rose tick | a record · a recorded control pair · a recorded answer | guilt, similarity, credibility |
| case pairs | left column | the earlier first record | the accused side, a party |
| everywhere | `--color-rose` | a response or denial | bad |
| everywhere | `--color-amber` | not recorded (response, source, pairing, row, saving) | suspicious |
| everywhere | accent | selection (`st`, `body`, `cell`, `vendor`, `case`, `rec`, readout FY) | importance |
| text only | party, ruling government, minister's party, stage words, component words, footprint kind, recipient | as recorded | — |

### 8.2 Frozen (the developer may not adjust these to make it fit)

The five stance rules of the brief's §3 are page rules here (items 3, 7, 8, 10, 11, 12).

1. `strokeDasharray` means tier on every mark that stands for a claim or a series row,
   including aggregates (weakest constituent). `alleged` and `documented` never render alike
   in any theme, greyscale or screenshot. Stage is never a dash; no dash has any other use
   (the slice's references are a tick and a hairline).
2. Family hue, type shape and declared size band are unchanged from `ForceGraph`. **No budget
   band, map class, slice class, footprint kind, stage, component or case takes a family
   hue; no new hue.** Award marks take the vendor's family hue because the interim class *is*
   the family; with S5 the class is a label inside the family hue.
3. **Every ₹ stands beside its denominator and its comparison** (stance rule 1): every ₹ the
   page prints passes through `crContext` and renders, in the same element, `a of b,
   computed here` (or the words saying no denominator is published) and the previous FY at
   the same stage (or the words saying none is recorded). **No total adds rows from two
   levels** (F3): the only sums the page computes are a stack of demand-level rows of one
   `(fy, stage)` beside the published total, the police demand's revenue + capital, and a
   row's share of its published parent — each labelled `computed here`. Pay, Agnipath, Delhi
   Police and every sub-line are brackets, ticks or lanes, never stacked. The ledger has no
   column total and no residual row. No ₹ sum across Union and states, across stages, across
   the tender slice and named contracts, or across awards exists anywhere, including TSV
   headers and `aria-label`s. [UX review] (U33) No ₹ sum across states exists either, so no share of
   one is printed (the `m=cr` map prints ₹ per state only).
4. **One FY axis** for the stack, the office lanes and the ledger, and **one ₹ scale** for
   both stack panels; linear from 0; no axis rescales to the years that happen to have data;
   missing FYs are hatched columns or slots, never closed up; `fy` dims, it does not crop.
5. Hatch ≠ zero. A recorded `cr === 0` prints `₹0 cr — as recorded` on `ZERO_FILL`; an absent
   row is hatch with `no row in this register`; [UX review] (U18) a row hidden by a filter is never
   hatch: it is dimmed as `fy` dims and reads `{k} rows hidden by the {filter} filter — not absent`. Never `—`, `NaN`, blank or `0` for absence.
   Hatch, crosshatch, stipple, `ZERO_FILL`, hollow, the dot, the ramp floor and the ground are
   pairwise distinct in a greyscale screenshot at 390 and 1280 (SG-30).
6. **No city ₹ other than Delhi Police**: no element, `title`, accessible name, tooltip or
   TSV cell associated with a commissionerate or any city body other than
   `force:delhi-police` contains a ₹ figure, a digit-group followed by `cr`, a share or an
   estimate; the budget cell holds exactly `CITY_POLICE_TEXT(state)` (SG-RF2).
7. **Pay and pensions are contracts with both sides** (stance rule 2): every contract card has
   two columns with identical field rows, assigned by the responder node's `ty`/`fam`, the
   rule printed in the foot; an empty column prints exactly `No response recorded —
   asked/not asked unknown`; no salary of a named person appears anywhere.
8. **Vendors are identical and never alone** (stance rule 3): every vendor card has the same
   thirteen field rows ([UX review] (U15): the twelve plus 3b, recorded holdings); `VendorGrid` always renders every vendor; `vendor` accents and never
   filters; `VendorCard` always opens with its comparators or the other class band; a filter
   that would leave one class band empty greys its cards and shows `Comparison set required`
   rather than removing them. No share of awards by vendor or class is computed by the page.
9. **No per-person figure on the 2011 Census** (F17), and no per-person or per-GSDP figure
   without its basis, its year and its tier in the same element.
10. **Outcomes are rates with party as text** (stance rule 4): no outcome, spend or strength
    figure is coloured, filtered, sorted or framed by party; party, government and era are
    text only, as recorded, inside quoted research text, record text and role labels; the
    page's own words never use `UPA`, `NDA`, `BJP`, `Congress`, `ruling`, `opposition` or
    `government of the day`, [UX review] (U22) nor any label or alias of a party node in the merged
    graph, nor `era`, `regime`, `incumbent` or `government's`, in any page-authored string,
    captions, `aria-label`s, TSV `#` headers and the refusals included (SG-RF4). Rose is
    response only.
11. **Cases are records, Bofors beside Rafale** (stance rule 5): every case renders in its
    recorded pair row, two equal columns, identical field rows, each `enforce` or `alleged`
    record with a response or the exact sentence; an unpaired case keeps an equal-width
    column with `No control pairing recorded for this case in the register.`; `case`
    accents, never filters; a narrative is never drawn as an edge; a case is never drawn as
    an edge to a party.
12. **Spending is a policy choice**: the page prints no ranking, score or index of states,
    forces, vendors, officers or cases; default sorts are by date, alphabetical, north to
    south, file order, or by a declared external quantity (the dot strips), never by a
    page-computed figure; ledger lanes are never re-ordered by size.
13. Map bins are pooled over every `(fy, stage)` pair or strength year with no filters and do
    not move when the reader filters; the ramp floor ≥ `#2e373f`; empty classes are named.
14. The tender slice is drawn by class only, each beside its own portal's whole-file rate;
    the slice-wide rate appears only as a labelled reference row and in the caption;
    `readMeFirst` and `caveat` render at body size above the chart, never collapsed; no
    winner name appears on this page.
15. `a of b` is always printed; a percentage only when `b` is an integer ≥ 10 or for a ₹
    share labelled `computed here`. [UX review] (U19) Two figures that are not a part and its
    whole (a numerator larger than its denominator, or non-integer figures with no declared
    share kind) print `{a} and {b}`, never `a of b`, a percentage or a whisker.
16. Nulls read `no row in this register`, `not recorded`, `not stated`, `none named`, `not
    computed`; never `0`, never a bare `—`, never `NaN`. An empty `srcs` reads `no source in
    file` in amber.
17. The default view is unfiltered with nothing selected; Budgets is the default lens; the
    default stage, state pair and strength year are **derived** from coverage, never hand-set;
    Q-block numbering never shifts.
18. Captions C1–C21 and every `CannotShow` render at body size directly under their block;
    none goes in the footer.
19. The exact strings: `inside {State}'s police head (MH 2055) — no city budget is published`,
    `₹0 cr — as recorded`, `no row in this register`, `amount not stated`, `No response
    recorded — asked/not asked unknown`, `No control pairing recorded for this case in the
    register.`, `Comparison set required`, `computed here`, `not joined to this case in the
    register`; [UX review] `{k} rows hidden by the {filter} filter — not absent` (U18), `listed, not
    added to this vendor` (U15), `two figures as the research states them, not a share` (U19),
    `Where its police money sits` (U29).

---

## 9. Captions the page must carry (verbatim; braces interpolated from `securityView.ts`)

Each sits directly under the graphic or block it qualifies, at body size. Hand-written copy
states method, never a figure. Every caption says what its block cannot show. **The page never
uses a partisan frame in its own words** (energy A8): no heading, caption, label or tooltip
uses "opposition", "ruling", "government of the day" or a party name except inside quoted
record text, role labels or the verbatim symmetry texts.

- **C1 — `ResolutionStatement`** (three fixed rows; the page's first caption): "Every rupee
  the Union spends here resolves to a line in a demand for grants, with Budget Estimate,
  Revised Estimate and Actual where the document prints them." · "Each state's police money
  resolves to its Police major head and no further, except where a state's own budget
  opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while
  the national strength table is unreachable, and say so. Prisons, home guards, fire and
  forensic money resolve only as Union scheme totals and are not budget rows here." · "Only
  Delhi Police has a budget line of its own, and it is a Union demand. Every other city's
  police money is inside its state's police head, and this page prints those words in place
  of a number. Cities appear through what is located in them."
- **C2 — `DemandStack`:** "Each defence column stacks the Ministry of Defence's demands for
  grants as Parliament votes them: revenue, capital, the civil and miscellaneous demand, and
  pensions; before {firstBreak} the services had revenue demands of their own, and those
  columns hold one band per demand. Pay is a line inside the revenue demands, so it is drawn
  as a bracket, not added on top. Where the Ministry's Summary prints a total for all
  demands, it is drawn as a tick across the column and the mark beneath says whether the
  stack equals it: in {eq} of {pub} such years it does, and in the rest the stack exceeds it
  by under {maxPct}%. Missing years are hatched, not skipped; every Union row here is
  {tierWord}. Amounts are nominal and not adjusted for inflation; shares of GDP are in Q4
  until the denominator series is exported. [UX review] (U9) The pension share is pensions' share
  of the Ministry's published total for all demands where the Summary prints one, and of the
  stack, computed here, where it does not; the label says which. A pension is a payment under
  the terms in Q5, and this page does not rate whether the share is high. The police panel uses the same scale; Delhi
  Police is bracketed because it is the only city police force with its own budget line."
- **C3 — `OfficeLanes`:** "A window is drawn where a dated role record exists; who held the
  Defence and Home portfolios on each date, from those records. A budget is presented in
  February for the year beginning in April and spent across it; the lanes show who was in
  office, not who decided a line. {openEnded} windows have no recorded end and are drawn to
  the register date. Party is not drawn; where a role record states it, the table carries it
  as text."
- **C4 — `LineLedger`:** "Each row is one line as the demand document prints it, under the
  body it funds. Inside each year, three slots: Budget Estimate, Revised Estimate, Actual. A
  hatched slot has no row in this register; it is not zero. Each row has its own scale,
  printed at its right, so rows show movement and gaps, not size against each other; a line's
  share of its demand is in its cell. A demand and the lines inside it are separate rows and
  are never added together here. Union actuals in this register begin in FY{firstActual}.
  Amounts are ₹ crore as published, not adjusted for inflation." **C4b (when `fy` is set):**
  "Columns outside FY{from}–FY{to} are dimmed, not removed."
- **C5 — `CompareBlock`:** "These ratios were computed by the research, each over the
  denominator printed beside it. The year and kind of each ratio are in its words, not in a
  field, so this page does not chart them. The symmetry text under each group is the
  research's account of running the same lens on both governments or both groups of states;
  this page has not re-run it."
- **C6 — `PayTerms` and `ContractCards`:** "Pay levels are the Pay Commission's, for a rank,
  never a person. A contract card sets the terms and the Ministry's stated case beside the
  objections and the answers, with the same fields at the same size; the column a response
  sits in is decided by the kind of body that made it, and neither column is a verdict. A
  saving the Ministry has not published is recorded as absent, not estimated."
- **C7 — `StatePair`:** "Left: what each state's police head spent or budgeted, from RBI's
  State Finances, divided by {denomWords}; every ratio is reported because its denominator is
  a secondary series for one year. Right: police per lakh people as the national police table
  printed it, carried here from secondary sources while that table is unreachable; the
  absolute counts beneath were derived by the research from the ratio. The two maps use
  different bases and different years; they sit side by side for reading, not for dividing
  one by the other. Delhi's police is paid by the Union and is drawn in the budgets above,
  not here. Hatched means no row is recorded, never zero. A per-person figure waits for a
  current population series: dividing by the 2011 Census would inflate faster-growing
  states' figures and re-order them."
- **C8 — `DelhiLine`:** "Delhi Police is the only city police force with its own budget line,
  because the Union pays for it through the Police demand. Every other city's police is paid
  from its state's police head and has no published budget of its own; the city ledger says
  so for each commissionerate the record holds."
- **C9 — `CityLedger`:** "A city police commissionerate is paid from its state's police head.
  No state publishes a city's police budget, so this table prints where the money sits
  instead of a number, and computes no estimate. Delhi is the exception because its police is
  a Union force with its own line. A commissionerate is listed because a primary list names
  it; the national list is unreachable, so this is not every commissionerate."
- **C10 — `GrantsTable`:** "Allocation is what the Union set aside for a state; released is
  what it paid out by the date in the note. A release of ₹0 is a recorded figure. The
  per-state split exists here only for the modernisation scheme, FY{a}–FY{b}, from one
  Parliament answer, and the state is named inside the line's title, so this is a table, not a
  map."
- **C11 — `FootprintMap`:** "One dot per installation that an official list places in a
  state and a city. Dots are positioned within their state, not at their address: no row
  carries a coordinate. A dot is a place, not money: no installation here has a budget of its
  own on this page. A hatched state has no row of the selected kinds in this register, which
  is not the same as having none: some lists were complete, some were not reachable. Kinds
  the register declares but holds no row for — {emptyKinds} — are not absent from India, only
  from this register. Most installations are older than any government in this register's
  office lanes; {dated} of {n} rows print a date."
- **C12 — `KindMatrix` and `PlaceList`:** "Counts are of rows in official lists the research
  could open. A state's count measures what was listed and reachable, not the size of its
  forces: the BSF, SSB, Assam Rifles and NSG sites, most DPSU plants, every jail address and
  most command headquarters are not in these lists (see Q5)."
- **C13 — `AwardsByClass`:** "Each mark is one contract the Ministry of Defence named with a
  vendor in a press release, placed by the year signed and the value stated; {withRupee} of
  {awards} state a value, and the rest are counted beneath the axis and never drawn as zero.
  This is a sample of what was announced, not every contract signed, so no column is summed
  and no share is computed here; the research's own shares by class, over its sample, are
  printed beside the chart with their denominators. Approvals by the Defence Acquisition
  Council name no vendor and no price, so they cannot be drawn by vendor; the card beside the
  chart says what they show. Vendor class is read from the actor family — public sector, or
  private, joint venture and foreign together — until the register declares each vendor's
  class."
- **C14 — `SliceBesideFile`:** "This is the slice of the central and state tender portals'
  award records whose buyer is a security body, not India's security procurement: capital
  acquisition runs on another portal, and GeM is not here. Single-bidder rate is the share of
  award decisions with exactly one bid, over decisions with a recorded bid count. The works
  buyers alone are {worksShare}% of the slice, so the slice's overall rate is a works rate;
  read each class beside the whole file on its own portal. A low rate for works buyers
  reflects many local contractors; a high rate for laboratories or headquarters reflects
  specialised items. Every figure is dataset-only: the stored links had expired when the
  sample was checked. No winner is named here; the tender register names marked winners under
  its own rule."
- **C15 — `VendorGrid`:** "Every vendor carries the same fields. A field that is empty says
  so; empty does not mean searched and found nothing unless a void says so, and the voids are
  printed beside the field. A private vendor is never shown without the public-sector vendors
  beside it. Named awards are a sample of the Ministry's releases, not its order book; the
  research's own comparison of values by class is quoted above this chapter, and this page
  computes no share of awards by vendor or class."
- **C16 — `BondTable`:** "A bond is a recorded purchase for a party; each donor's purchases
  for every party are shown together, as the Supreme Court-ordered disclosure lists them.
  Vendors not listed bought no bond under their own name in the disclosure the research read;
  that is recorded as a void, not as innocence or guilt. A purchase is not a payment for a
  contract: no order is joined to a bond except where a record dates both, and the research
  could date both for one vendor only. The base rates above give every party's share for
  comparison."
- **C17 — `BoardRoles`:** "Persons appear only in public roles at the public rank. A board
  seat after the cooling-off period is lawful; the page prints the interval, computed from the
  dates the records give at the coarsest precision either gives, and the rule, not a
  judgement."
- **C18 — `CaseTimeline`:** "Each lane is one case file as the register holds it; each tick a
  court order, an audit paragraph, an investigation step or an allegation, in its evidence
  tier's dash. Rose ticks are recorded answers. Lanes are paired as the research recorded
  them, so each case sits beside the case recorded as its control [UX review] (U22). A dense lane
  is a well-documented case, not a worse one."
- **C19 — `CasePairs`:** "A case is shown as its records: what a court, an auditor or an
  investigator recorded, on what date, and what the other side answered. Each case sits
  beside the case the research recorded as its control, with the same fields in the same
  rows; Bofors and Rafale sit side by side by design, each the other's control. No case here
  is a finding of guilt or of innocence; the latest-record row quotes the latest record. What
  people say about the cases is rated in the narratives below and never drawn as a link to a
  party."
- **C20 — Narratives:** "Status is the research's calibration on the evidence it found as of
  {asOf}, not the verdict of any court, regulator or auditor. A narrative is a claim about the
  world, rated with its strongest case, its strongest counter and what would change the
  rating. It is never drawn as an edge. The same narrative can appear in two research files
  with two ratings; both are listed as recorded."
- **C21 — Connection graph** (finance C15 verbatim): "Position carries no meaning. Line dash
  is evidence tier; hue is the kind of actor; shape is entity type; size is a declared band.
  Persons appear only in public roles."

---

## 10. Loading, empty, partial and no-data states

| state | render |
|---|---|
| Loading | The route chunk and the lazy graph. `FORCE_NODES`/`FORCE_EDGES` are already in the entry through `DataContext` (a platform decision this page does not change); the three series, the other page-only exports, `securityView.ts` and `src/components/security/*` must reach the reader only in the `/security` chunk — [UX review] (U1) G5 splits the module before the page is built, and SG-50 fails if a string unique to the series or the page part is in the entry. `loadSecurity()` resolves after mount: P-Q2 shows a 320 px block `Loading the open-market slice…`. Route fallback: PageTitle, Standfirst and the `ResolutionStatement`'s fixed words, which need no data (U1). Graph fallback: a 620 px block "Drawing the connection graph…" with its node and edge counts |
| `FORCE_META.empty` | Full chrome. `Callout label="Register not yet promoted"` under the Standfirst; the resolution statement keeps its words and its mono lines read `register not yet promoted — nothing below is zero`; the strip likewise; every Q-block renders its heading and `Nothing recorded yet.`; the stack and the ledger draw the FY axis with no columns or lanes; every map hatched; the vendor grid, the case pairs and the 36-row table render their frames empty. Smoke passes (SG-2) |
| **Zero rows in a series** (budgets, strength or footprint `[]`, graph non-empty) | the series' blocks render their headings, axis or 36-row table hatched, and `This register holds no {budget / strength / installation} rows in this build. Nothing below is zero.`; the resolution row for that level reads `no rows in this build`; the other lenses are unchanged (SG-2, ZERO-SERIES fixture) |
| `SLICE === null` | P-Q2 prints the absence sentence; the strip's fact 6 reads `open-market slice not built in this copy` |
| Prerequisite absent (S1–S13) | the interim named per component in §5 and the derived gap line |
| **Partial years (the common case)** | the stack draws every `FY_AXIS` entry; missing `(fy, stage)` columns are hatched; RE and actual are never interpolated; 2013-14 actual draws its two bands and a labelled hatched remainder; every lane draws every FY with hatched slots; the strip says `{covered} of {n} FYs` |
| Partial composition | pay brackets show `{k} pay lines` and break rules; the structure rule marks each reorganisation |
| Partial states | 30 of 36 units on spend (28 drawable under `gsdp`), 30 + Delhi counts-only on strength; the 36-row table always 36 rows with each empty unit's reason; the denominator lines say `{k} of 36` |
| Partial kinds | 0-row kinds listed `none in this register`; hatch in every empty state |
| Partial slice | class-years with n < 10 draw no dot |
| Partial case files | each field prints its null words; counters read `{answered} of {claims}` |
| Filters → 0 | strip `N → 0`; [UX review] (U18) every slot, unit or cell whose rows a filter hid reads `{k} rows hidden by the {filter} filter — not absent`, never `no row in this register`; each Q-block shows `No record in this register matches {filters}. This is a statement about the register, not about India.` naming the most-removing filter with a one-click reset; the stack keeps its axis; the vendor grid, the case pairs and the 36-row table keep their rows |
| Unknown `rec` / `cell` / `body` / `vendor` / `case` / `sel` / `st` / `fy` / `stage` / `sfy` / `sy` / `kind` / `m` | the default, with `ignored an unrecognised {param} value`; `rec` unknown: `No record {id} in this register.`; `vendor` outside `VENDORS`: `{label} is not a vendor in this register` |

---

## 11. Edge cases

| # | case | where | behaviour |
|---|---|---|---|
| E1 | Demand numbers move (13–28; Delhi Police under nine numbers) | stack, ledger | never key a band on `Demand 20`; key on `component` of a demand-level row; a fixture that renumbers demands leaves the stack unchanged |
| E2 | Summary-only FYs (2002-03, 2003-04, 2006-07, 2007-08, 2012-13 BE) | stack | the Summary rows are used and the readout says `from the Summary of Demands` |
| E3 | Two rows in one ledger slot (two editions of one line) | ledger | two thin bars, both drawn and both in the twin; the note says which edition |
| E4 | 2013-14 actual (pensions and capital only) | stack | two bands plus a labelled hatched remainder; `partial: 2 of 4 demands`; no column sum printed |
| E5 | Stack ≠ published total (5 FYs) | stack | the tick sits above the stack; glyph `≠`; Δ and % in readout and twin `computed here`; nothing scaled |
| E6 | `cr === 0` (68 ASUMP releases) | ledger, grants | `₹0 cr — as recorded` on `ZERO_FILL`; a number, never hatch, never omitted |
| E7 | A body with 3 FYs of rows (J&K Police, Union) | ledger | the lane spans the full axis with 25 FYs hatched |
| E8 | J&K Police in two payers | ledger, state table, `st=jk` | both shown, each naming its payer; never added; the `jk` readout and panel quote the RBI row's note |
| E9 | Delhi (`st=dl`) | Budgets | crosshatch on the spend map; stipple on the strength map; the table row reads `Delhi's police is a Union demand line — see Q7`; the Delhi Police lanes accented; no RBI row invented |
| E10 | A commissionerate selected anywhere | every cell | budget `CITY_POLICE_TEXT(state)`; strength the void; never a number (SG-RF2) |
| E11 | The PRS District Police line (6 states, reported) | state table, panel | its own column with the reported chip and dash; never in the MH 2055 column; Maharashtra's is `component: pay` and is labelled `salaries for the district police (PRS wording)` |
| E12 | UP's own Grant 26 series beside its RBI row | state table, panel | both listed with their heads; `two documents, two heads; not added` |
| E13 | A strength row with `perLakh` null (Delhi) | strength map | stipple `counts recorded without per-lakh`, counts in the twin |
| E14 | Joint contract without a per-vendor split | awards | one hollow mark per vendor, bracketed; the twin reads `joint total ₹{x} cr announced for {vendors}; not split`; never split into ₹ |
| E15 | A vendor with `fam` neither `state` nor `capital` (`force:adarsh-society`, `recipient`) | vendor grid | class `unclassified`, listed by name beneath the bands with the reason; never dropped |
| E16 | Many installations in one small unit (Delhi 11, Chandigarh 4) | footprint map | jitter clamped to clearance; overflow drawn as `+{k}`; all listed in readout and twin |
| E17 | A footprint row whose `st` fails to resolve | footprint map | never with a `StateCode` (gate); listed under `not placed on the map: {code}` if it ever happens |
| E18 | A grant recipient that is not a map unit (Ladakh; the merged UT) | grants | listed verbatim, never placed; S2 adds text-only codes; **no name parser** (Ladakh would resolve to `jk`) |
| E19 | A vendor with no award (a declared comparator or a plant body) | awards, grid | no mark; a full card with `none named in the Ministry releases the research read` and, [UX review] (U15), its recorded holdings with their award counts in field 3b |
| E20 | The same minister's window in two or three files | office lanes | one bar `×{k} records`, each record in the twin with tier and file; never merged by name |
| E21 | An open-ended window | office lanes, `officeOn` | outline to `asOf`, `end not recorded`; listed under "start recorded, no end recorded" |
| E22 | A decision date before the first role window (Bofors 1986–87) | case field 3 | `no recorded office window covers {date}` |
| E23 | A case under two ids (Adarsh) | case pairs, gaps | the case node's records only; the other id's records listed under `records under another id, not joined: {id}` beneath the column, and the derived gap |
| E24 | A pair recorded by two files (Bofors ~ Rafale, AgustaWestland ~ Tatra) | pair header | one pair row; both files named |
| E25 | A case with one record (Tatra) | pair | every field prints its null words; counters in singular |
| E26 | An `alleged` award (Rafale price, Tatra/BEML, Adarsh) | awards, vendor card | never a mark; counted in `{alleged}`; in the case column's Allegation field and in Contested with its response |
| E27 | An award before 2014 or to a case vendor (Bofors 1986, AgustaWestland 2010, Rafale 2016) | awards | drawn at its date; the axis begins at the first award year, not 2014 |
| E28 | Bond donors who are not award vendors (MEIL, Cyient) | bonds, grid | listed as donors; a card exists because `bond.s` is in `VENDORS`; `meil` resolves through `useData()` or prints `(not in the register)` |
| E29 | A board pair with a missing office end date | board roles | `not computable: office end date not recorded` |
| E30 | `vendor` set to a node outside `VENDORS` | margin | `{label} is not a vendor in this register`; Show connections offered |
| E31 | Audit-added response whose responder `s` is the subject itself | every response slot | responder printed `the audit (recorded on {subject})`; counted as a response |
| E32 | A response to a response (the Army answering the Congress objection on Agnipath) | contract card, case column | [UX review] (U27) a child `<li>` of the response it answers, its text beginning `in reply to {responder}, {date}:`; same size, depth ≤ 3 |
| E33 | Undated record | timelines, lanes | right gutter `undated`, counted in the lane label |
| E34 | `fy` range with no stack column of the stage | stack | the axis and hatched columns stay; the live region says `0 {stage} columns in {range}` |
| E35 | `st` set on Procurement | rail | inactive with its reason; the param kept |
| E36 | A slice class-year with n < 10 (16 today) or n = 1 (2011) | slice | no dot; `n {n}: no rate drawn` |
| E37 | `security.json` from a different scrape than `rates.json` | slice | provenance digests printed; whole-file marks come from the slice file's own comparator fields only |
| E38 | Module regenerated with merged ids or moved counts | everywhere | every count derived; anchors re-checked at load; no gate pins a §0 number |
| E39 | 390 px | page | §12; no horizontal page scroll |
| E40 | `view=table` | every lens | every twin open; graphics hidden; Q-headings, `AnswerLine`s and answer sentences stay; [UX review] (U23) kept on lens switch: the newly mounted lens's twins are open before focus moves to the lens heading |
| E41 | A state with a strength row and no budget row (`dl`) or the reverse (`py` has both; `an ch dd dn ld` have neither) | state table | each cell names its reason; nothing dropped |
| E42 | GSDP FY does not match the selected pair | spend map | the pair's option is `aria-disabled` with `GSDP in this build is for {gsdpFy} only`; the map is not drawn with a mismatched denominator |

---

## 12. Mobile at 390 px (no horizontal page scroll)

`useNarrow()` = `matchMedia('(max-width: 639px)')`.

- **Head:** kicker, title, standfirst, standing line, then the `ResolutionStatement` stacked
  (label above words, mono line beneath). Byline and strip facts 2–6 move whole to the mono
  list under the first figcaption (moved, not hidden), [UX review] Budgets fact 2 excepted (U10).
  (U2) The head is long at 390 by design, because D1 keeps the statement whole: about 1,100 px
  before the strip (estimate). SG-33's 390 budget is measured on the first build and recorded
  in `SECURITY_ACCEPTANCE.md`, never an aspiration; the ceilings are the strip, tabs, Find and
  rail summary within 2 viewports (1,688 px) and the top of the stack within 2.5 viewports
  (2,110 px). The 1280 budget is unchanged (D58).
- **Pinned stack:** site header + one-line strip (fact 1 + date, in U3's short form) + one row of
  tabs ≤ 140 px ([UX review] (U3)). The
  `ReconciliationLine` is a `<ul>` under Q1's caption, not sticky.
- **Tabs:** full-width segmented control, 44 px targets, never a menu; [UX review] (U3) **one row**:
  the visible labels at 390 are `Budgets · Footprint · Procurement`, and each tab's accessible
  name and the panel's `h2` keep the full name (`Procurement and people`).
- **Find** [UX review] (U4): full-width `type=search`, the first element under the tabs, outside
  the rail `<details>`, never pinned; results inline beneath it; a commissionerate result prints
  the fixed city sentence in the result itself, so SG-42 completes without opening the ledger.
- **Rail:** `<details>` labelled `Filters ({active}) · {N} → {k}`; the effect line stays
  outside; native selects.
- **`DemandStack`:** drawn at full width **without horizontal scroll** (it has no label
  column for a sticky scroll to keep): 28 columns at 390 px leave ~11 px each with 2 px gaps;
  FY labels on every fourth column plus the latest; the pension share label only on the
  latest column and on the chosen FY; direct band labels move to a legend row beneath; the
  reconciliation row keeps one glyph per column at 10 px mono (`aria-hidden`, duplicated in
  the twin). Panel heights defence `clamp(220px, 60vw, 300px)`, police on the same scale.
  [UX review] (U5) The step control `‹ earlier · FY{fy} · later ›` (44 px) sits under the chart;
  the chosen column's label is always visible. (U6) The twin is a closed `<details>` like every
  other twin, summary `Q1 as a table · {rows} rows`; opened, it renders as `StackTable` cards,
  never a sideways table; the inline `FYReadout` is the phone's per-year reading surface.
- **`OfficeLanes`:** share the stack's column grid and width; [UX review] (U7) the bars stay
  unlabelled for alignment, and directly beneath them one `<ol>` per office in date order lists
  `{person} · {from} – {to, or end not recorded} · {tier} · ×{k} records`; choosing a bar
  accents its list item, and choosing a list item accents its bar.
- **`LineLedger`:** one stage at a time (`stage`, default BE with the reason on the control),
  14 px FY columns, sticky 120 px labels, inner horizontal scroll with `‹ earlier` / `later ›`
  and `showing FY{a}–FY{b}`, `role="region"` named by the caption, right-edge fade; [UX review] (U6) body
  groups as `<details>` closed by default except the Published-totals group and any group
  accented by `body`, each summary `{k} lanes · BE {a} RE {b} actual {c} of {n} FYs`; both twins
  closed by default, the long form as `StackTable` cards when opened; the drawing is always
  drawn and lane labels wrap to two lines at 12 px (no conditional `Show the ledger`).
- **`StatePair`:** maps stacked, each full width `clamp(300px, 70vw, 420px)`; dot strips wrap
  labels to codes; the `Open a state` select under each figcaption; no on-map labels; legend
  swatches ≥ 12 px; [UX review] (U6) the `StateTable` is a closed `<details>` (`Q6 as a table ·
  36 rows, always all 36`), opened as `StackTable` cards (state, Police head by
  stage-year, % of GSDP, strength, sources first); when `st` is set the selected state's card
  renders open inline as the `StatePanel` under the maps. Nothing is dropped.
- **`DelhiLine`:** full width; points and lines only; the twin beneath.
- **`FootprintMap`:** full width; dot radius ≥ 3 screen px; [UX review] (U8) the kind chips become
  checkboxes inside the rail `<details>`, with counts and 0-row reasons, plus `all kinds`; tap →
  readout block → `Open the state`.
- **`AwardsByClass`, `CaseTimeline`:** inner horizontal scroll, sticky 96 px label column
  (cases) or the year axis labelled every second year (awards), initial scroll at `asOf`;
  [UX review] (U8) never swipe-only: 44 px `‹ earlier` / `later ›` buttons, an `earliest` jump and
  a mono `showing {a}–{b} of {first}–{last}` line, as the ledger has;
  the AoN void card stacks directly under the award chart, before the caption.
- **`SliceBesideFile`:** rows stack (label line, then bar, then the rate scale); the
  by-year multiples one per row; reference values in text at the row end.
- **`CasePairs`:** the two columns stack **field by field** (field 1 left case, field 1 right
  case, field 2 left, …), each field block labelled with its case, so a pair is still read
  side by side in sequence; the pairing sentence for an unpaired case sits in the right
  case's slot of every field.
- **`VendorGrid`:** one card per row, [UX review] (U6) each card's `<dl>` in a `<details>` with the
  identical summary of §5.3.1 (D61); `VendorCard` opens inline after the card, with its
  comparators stacked directly beneath it, field by field.
- **Tables with a response, source, rule or comparison column** (contracts, bonds, board
  roles, cases, contested, places, city ledger, grants): `StackTable` cards, every field, the
  response directly under the claim at the same size; sources never behind a disclosure.
- **Every other twin and table** [UX review] (U8) has a named 390 form: the stack twin, the ledger
  long form and coverage twin, the awards, slice, office, case-timeline and `DelhiLine` twins,
  and the `StateTable` render as `StackTable` cards; `KindMatrix` renders one card per state
  listing its kinds with counts and the 0-row kinds as `no row`; a table that keeps the table
  form at 390 has a sticky first column, at most three further columns visible, and a `{k}
  columns · later ›` step button with its hint text (never swipe-only).
- **Margin panels:** render directly under the component that opened them, with one
  `scrollIntoView` and `scroll-margin-top` = the pinned stack; a panel with no opener on
  screen renders under the Find block; every panel has `Close` and `Back to {origin}`.
- **Graph:** behind `Load the graph`.
- **Mono floor:** 12 px (10 px only for the reconciliation glyph row, `aria-hidden`).
- **Gates:** at 360 and 390, `document.scrollingElement.scrollWidth ≤ innerWidth` on every
  lens, with `view=table`, with `cell`, `vendor`, `case` and `rec` set by URL, with `st=dl`, and
  [UX review] (U8) no open twin's `<table>` wider than its container unless it carries the step
  control (SG-31); (U2) at 390×844 the strip, tabs, Find and rail summary within 1,688 px and
  the top of the stack within 2,110 px, measured and recorded; the pinned stack ≤ 140 px with one
  tab row (SG-33); (U6) the page length at rest within its budget (SG-53).

---

## 13. Accessibility

- **Landmarks and outline:** `h1` PageTitle; the `ResolutionStatement` a `<section
  aria-labelledby>` with a visible `h2`; `nav` (rail); `main`; an `h2` per lens panel and
  shared section; an `h3` per Q-block (`Q{n} — {question}`), `h4` for groups inside (ledger
  body groups, chapter heads, pair rows); [UX review] (U26) every graphic a `<figure>` labelled by its Q-block's `h3`
  (exactly one `h3` per Q-block; titles inside a figure are `h4` or plain text); `aside` margin with card `h2`s and `h3` sub-blocks; the strip a `<section
  aria-label="Denominators">` with a hidden `h2`. No level skipped (SG-49).
- **Tabs:** WAI-ARIA tabs, manual activation; the panel `aria-labelledby` its tab.
- **`DemandStack`:** the SVG is `role="group"`, `aria-labelledby` its `h3`,
  `aria-describedby` [UX review] (U10) the answer sentence first, then the denominator line. Bands, brackets, ticks and glyphs are
  `aria-hidden`; the FY axis buttons are the only focusables (**one tab stop**, roving
  tabindex, Left/Right/Home/End), each named per §5.1.1. A skip link `Skip to the table`
  precedes it.
- **`LineLedger`:** `role="grid"` with `aria-rowcount`/`aria-colcount`; lane labels are `th
  scope="row"`, FYs `th scope="col"`; one tab stop (roving), arrows move, Home/End to the
  lane's first/last FY, Enter opens; each cell button's name is the full cell sentence, ending `— open for its share of the demand
  and the previous year` ([UX review] (U32): the one sanctioned place a ₹ is named without its
  denominator; SG-9 covers rendered text and twin cells); a slot
  without a row is named `no row in this register`. The bars are `aria-hidden`.
- **Maps (both state maps, the footprint map):** the finance `LoanMap` listbox model
  (`role="listbox"` of 36 options north to south; each option's name carries the class in
  words and the value with unit — `Delhi: police paid by the Union, not a state line`;
  `Manipur: no row in this register`; `{State}: {k} installations in {c} cities`); Enter
  selects, Escape clears; SVG shapes `aria-hidden`.
- **Office lanes, award marks, slice rows, case timeline, [UX review] (U25) `DelhiLine`, the dot
  strips and the AoN card's chart frame:** drawings `aria-hidden`, with **no interactive element
  inside** (award marks are not buttons, the Agnipath tick is not a link, `DelhiLine` points
  are not buttons); everything in their twins and readouts (`Open record: {vendor}, {date}`,
  `Agnipath lines → contract card`, `Open the line: Delhi Police {fy} {stage}`); a skip link
  before each. [Adjudicated
  in finance] nothing focusable inside an `aria-hidden` subtree.
- **Case pairs:** each pair row a `<section aria-labelledby>`; each column a `<dl>` whose
  `dt`s are the field names, so a screen reader reads field, then value, in the same order for
  both cases; the pairing sentence is a `dd`, never `aria-hidden`.
- **Vendor cards:** each a `<dl>` with identical `dt`s; the comparators in `VendorCard` are
  sibling `<dl>`s under one `h2` `"{vendor} beside {comparators}"`. [UX review] (U28) Each card has a
  navigable `h4` (the vendor label) and its buttons in natural tab order; no card is a composite
  widget. A skip link before the grid, `Skip the {n} vendor cards to chapter 2`, and the
  `SymmetryContents` chapter links keep the keyboard budget.
- **Response pairs and contract cards:** one `<dl>` per item; the response is never
  `aria-hidden` or collapsed; [UX review] (U27) replies are nested lists, each beginning `in reply
  to {responder}`.
- **Live region:** exactly one, polite, debounced (SG-47); words, never the arrow glyph.
- **Unavailable options:** `aria-disabled="true"`, focusable, reason in the accessible name.
- **Selection states** [UX review] (U24): every accented element carries state, not only a rule or
  a border: `aria-current="true"` on the accented ledger lane headers (`body`), the vendor card's
  `<dl>` (`vendor`), the pair row's `<section>` (`case`), the cell (`cell`) and the chosen FY axis
  button; `aria-selected` on the selected map option (`st`); each with words (`selected body`,
  `selected vendor`, `selected case`). Each margin card has a link that moves focus to the first
  accented element (`Go to its {k} lanes in the ledger`, `Go to the card in the grid`, `Go to
  the pair row`).
- **Repeated controls name their row** (`Open the line: CRPF revenue FY2024-25`, `Show
  connections for {label}`, `Show vendor: Larsen & Toubro`, `Show the pair: Bofors and
  Rafale`, `Show places in {State}`, `Cite {lab}`). No two enabled buttons or links in one
  table, list or section share an accessible name.
- **Tables:** every `<table>` has a `<caption>` with name, population and active filters; `th
  scope`; `aria-sort` on the sorted column; sort buttons named `Sort by {column}, {state}`;
  cells holding lists are `<ul>`.
- **Twins:** the finance twin contract (U15).
- **Text:** `<abbr title="crore">cr</abbr>`, `<abbr title="Budget Estimate">BE</abbr>`,
  `<abbr title="Revised Estimate">RE</abbr>` on first use per table; numbers `font-mono
  tabular-nums`; contrast ≥ 4.5:1 text, ≥ 3:1 for hatch, crosshatch, stipple, brackets,
  dots, the zero tick and dash strokes on `--color-bg`; the ramp floor ≥ `#2e373f`.
- **Targets:** 44 px on coarse pointers, 24 px on fine.
- **Keyboard budget:** counting from the first focusable element in `<main>`: the stack's FY
  axis in ≤ 15 tab stops at 1280; the ledger grid in ≤ 20; the spend map listbox in ≤ 30; on
  Procurement the first case pair row in ≤ 40 through the `SymmetryContents` chapter 4 link or the
  vendor-grid skip link ([UX review] (U28): vendor cards are not composite widgets; their buttons
  are in natural tab order); the graph by its own route (`Show connections` moves focus to
  `#connections h2`).
- **Motion:** `prefers-reduced-motion` honoured everywhere.

---

## 14. What the page refuses to show, and why (`id="refusals"`)

- **A city police budget other than Delhi's**, in any form: a number, a share of the state's
  head, an estimate, a per-capita figure. None is published (F11, F20); the page prints where
  the money sits.
- **A total that adds a demand to its own lines**, pay on top of revenue, Union plus states,
  BE plus actual, or a "security spending" grand total. Rows overlap by level (F3); the only
  sums are disjoint demands of one `(fy, stage)` beside the published total.
- **A per-person figure on the 2011 Census** (F17), or a per-capita map built from figures
  parsed out of prose.
- **A per-state outcome rate parsed from prose**, or any outcome coloured by the ruling party
  (F17; S6).
- **A map of defence money by state or city.** No defence demand is printed by place
  (`union-defence` void).
- **Points at city addresses without coordinates** (F19); a footprint by money.
- **DAC approvals by vendor.** Approvals name no vendor and no value (F23).
- **A vendor alone**, a vendor leaderboard, a "most connected", a risk score, or a share of
  awards by vendor or class computed from a sample of named releases (F22, F24).
- **The tender slice's overall rate as a finding.** One works buyer is three quarters of it
  (F32). **Names of open-market winners**: they cannot be given the comparator rule this page
  holds vendors to.
- **Party as a colour, a filter, a sort or a column the page writes; a government-era
  toggle.** Party is text; the symmetry texts carry the comparison, quoted.
- **A case without the case recorded as its control beside it**, or without its answer slot;
  a case or a narrative drawn as an edge to a party.
- **A ranking, score or index** of states, forces, vendors, officers or cases: no "most
  militarised state", no "riskiest buyer".
- **A merge of two ids by name** (Antony, Advani, Adarsh pairs).
- **Operational detail**: deployments, orders of battle, procurement the Ministry has not
  announced, the addresses of jails; and any salary of a named person or any person below
  the public rank (spec §1 non-goals).

---

## 15. Decisions

Every conflict between the two candidates, and every judge's addition, resolved here. The
builder has nothing left to choose.

| # | decision | alternative rejected | why |
|---|---|---|---|
| D1 | **B is the base; the three-level `ResolutionStatement` sits in the page head on every lens**, fixed words with derived counts, never sticky or collapsed | A's one-sentence resolution line; a footer note | Spec §2 says the page says so "in these words"; "what can this page know" precedes "how much" |
| D2 | **Numbered Q-blocks per lens whose numbering never shifts**; an empty block renders its heading and empty sentence | A's unnumbered figure-first sequence; hiding empty blocks | An unanswered question must be visible as an empty block, and "Q6 on Budgets" must be a stable address |
| D3 | Derive from `FORCE_EDGES`; resolve labels through `useData()`; unresolved → `{id} (not in the register)`; the §0 counts are copied nowhere | iterating `FORCE_EDGE_DOMAIN`'s keys (385, one killed) | F1, F21; the run will be reconciled |
| D4 | **Every ₹ passes through `crContext`**: denominator (a of b of its published parent, `computed here`, or the words saying none) and comparison (previous FY, same stage) in the same element | a ₹ with a tooltip; a share of a page-computed total | Stance rule 1 as a page rule; a share of a computed total would inherit F7's drift |
| D5 | **The `DemandStack` is drawn** from demand-level rows of one `(fy, stage)`, banded by component, with the **published total as a tick** over each column that prints one | B's refusal of any stack until S1; A's stack without the tick | The demands are disjoint voted grants the Ministry's own Summary adds; the sum differs from the Summary by ≤ 0.76% in 5 of 12 FYs (F7); drawing the tick makes the difference visible instead of hiding it in a twin |
| D6 | **No total adds rows from two levels**; pay, Agnipath, Delhi Police and every sub-line are brackets, ticks or lanes | stacking every `component` row (double counts) | F3 |
| D7 | Pay as a bracket with `{k} pay lines` and break rules; Agnipath as a tick linked to its card; no pay trend across a composition change | a pay band; a pay line chart | F8, F9 |
| D8 | A dotted assembly rule at each demand-structure change, labelled | a hue change; nothing | F6; dotted light rules are the assembly channel (finance D19), never a tier dash |
| D9 | The default stage, state pair and strength year are **derived** from coverage | hard-coding `actual` (9 of 27 defence FYs) or `2024` | F4, F5, F16; a hand-set default is a claim |
| D10 | The reconciliation glyph row (`=` `≠` `·`) under the stack and Δ `computed here` in readout and twin; nothing forced to agree | silently using the published total; a chart-level "difference" mark only | F7; B's twin-only reconciliation would leave the reader of the picture unaware |
| D11 | Lane key = body + component + line with the `Demand N — ` prefix and edition suffix stripped; a renamed line is a second lane beneath, labelled | a hand-written crosswalk of renamed lines | F6; nothing hand-written; S1's `line` replaces it |
| D12 | **`LineLedger`: periods as columns, three stage slots per FY by position, a lane scale per row** with its max printed | A's heat-ledger with a per-row ramp and one stage at a time; one shared ₹ scale | Missing stages are the story (F4); position is the free channel; a per-row ramp invites cross-line reading (A's own risk 4); a shared scale draws most lanes as nothing (F2) |
| D13 | A named police line's size against its demand is `crContext`'s share of the whole-demand row | a stacked police panel of named lines | F10: named lines sum below the whole demand; their complement is not a line |
| D14 | **No residual row** ("rest of the demand, computed here") and no ledger column total | A's italic residual row | A computed remainder is a page-written figure the documents do not print; the share column carries the same information |
| D15 | Base rates as verbatim cards grouped by domain with the symmetry text beneath, placed as Q4 and in the margin; no chart until S12 | parsing the FY from `property` to chart GDP shares | F30 |
| D16 | Delhi Police is a lane group of its own, the one city line of Q7, a bracket on the police panel, and the first row of every city table | Delhi only in the footprint lens | F11; "which city?" is answered on Budgets |
| D17 | **`CITY_POLICE_TEXT(state)` — `inside {State}'s police head (MH 2055) — no city budget is published` — is the only content a non-Delhi city budget cell may hold**, with a link to the state's Police-head row | B's shorter `inside the state's police head`; a blank; `n/a`; a share of the state head | Review Focus 2's words, plus the state and the head so the reader can act; one string, one gate (SG-RF2) |
| D18 | **The spend map draws today on `% of GSDP`** (same FY, `STATE_ECONOMY`, reported) with the frame in the reported dash; `m=percap` `aria-disabled` with F17's reason until S3; `m=cr` offered with its caveat and no share of the states' sum ([UX review] (U33)) | B's void card in the map's frame; per capita on the 2011 Census; a ₹ choropleth as default | The brief asks for a choropleth; a declared same-year denominator that says its tier is honest; the 2011 base re-ranks states (F17) |
| D19 | **One state head** (`Police (MH 2055)`) and one `(fy, stage)` pair on the spend map; the **dot strip** under each map is the comparison instrument | mixing UP's grant and PRS lines into the fill; the map alone | F15; a map finds a state, a strip compares |
| D20 | Delhi is its own crosshatch class on the spend map | hatch (reads "no data") or Delhi Police's ₹ on the state map (wrong payer) | F11 |
| D21 | Grants to states: a table with the head verbatim; no map; `st` inactive on grants until S2; **no name parser** | parsing the recipient from the head and matching names | F13: `resolveState` sends Ladakh to `jk` and four names to `null` |
| D22 | The 36-row `StateTable` keeps RBI MH 2055, the state's own series, the PRS line, strength and footprint in **separate columns**, never added, every empty unit with its reason | one "state police spending" column | F15: three documents, three heads, one a part of another |
| D23 | Strength map on `perLakh` as printed; **the map frame in the reported dash** because every row is reported; derived counts printed with the note | recomputing per lakh from counts; drawing the map solid | F16; a figure's weakest tier is its tier |
| D24 | A **stipple `counts-only` class** on the strength map (Delhi) | hatching Delhi as "no row" | F16: Delhi has rows without per-lakh; hatch would be false |
| D25 | State outcome records quoted verbatim in the state panel; no per-state outcome surface until S6 | parsing `d` for custodial-death rates | F17; stance rule 4 needs rates as data |
| D26 | **Footprint: one neutral dot per installation, positioned within its state; kind is a filter and a table column, not a mark channel** | A's eleven per-kind count choropleths; glyphs by kind | Shape is type and hue is family (frozen); no coordinates (F19); a count choropleth measures list coverage and reads as militarisation; the matrix carries every count exactly |
| D27 | 0-row kinds are listed in chips, matrix and reconciliation line as `none in this register` with the void's reason; S10 turns an enumerated kind's empty state hollow | dropping empty kinds; a zero fill | F19; an empty class is named |
| D28 | The FY filter does not reach the footprint and says why | filtering by `since` | 217 of 221 rows are undated (F19) |
| D29 | `OfficeLanes` on the finance `LoanClock` pattern, under the stack, sharing its FY grid; party as text in the twin only | extending energy `TenureLanes` with an `asOf` prop (A D29); a separate timeline section | Finance kept `TenureLanes` byte-identical for the same reason; "who decided" reads down a column from "how much" |
| D30 | Contract cards: two equal columns assigned by the responder node's `ty`/`fam`, the rule printed in the foot; the Ministry's stated saving from the benefit row or `no stated saving recorded` | A's four hand-labelled cells (terms / Ministry's case / objections / answers) | Stance rule 2 with no hand classification; A's benefit-row cell survives as the stated case inside the left column |
| D31 | The Agnipath card says the record does not join it to the replaced terms and links to the pay-levels table | placing the Level 3 row inside the card | Pairing them is a judgement no edge records (S13) |
| D32 | No "DAC approvals by vendor class" graphic; the AoN void card and base rates sit inside the award graphic's frame | drawing approvals without vendors; inferring class from `ty` | F23 |
| D33 | Interim vendor class = actor family (public sector · private, JV or foreign), hue unchanged; `unclassified` listed by name | `ty` (splits DPSUs), `own` (misses GSL, HSL), parsing `publicRole` | F22; S5 declares four classes as labels inside the family hue |
| D34 | **`AwardsByClass`: one mark per contract at year × ₹ (log), family hue, tier dash; unpriced contracts in a count row; joint totals bracketed; no column sum, no page-computed share**; the research's class shares quoted as base rates | A's stacked ₹ columns by class and year (a sum over a sample); B's ticks with no amount channel | The brief asks to see class by year and value; a sample may be drawn one mark each (finance `RecordsStrip`) but never summed (stance rule 3's denominator comes from the research's own sample, quoted) |
| D35 | `VENDORS` is the structural union of award targets, declared comparators, plant bodies, bond donors and board-role targets with `ty ∈ {company, psu}` | B's awards ∪ comparators only (15 bodies would have no card); a hand list | Stance rule 3 says vendors carry plants, bonds and board roles; every body a table names gets a card |
| D36 | A vendor card opens with its declared comparators (analytic edges), else the other class band | a card alone; a hand-chosen peer | Review Focus 3 must be structural; Adani enters through its recorded comparisons (F24) |
| D37 | `vendor`, `case`, `body`, `cell` are their own params; `sel` stays the graph's | A's reuse of `sel` for vendor accent | One param, one meaning; `sel` persists across lenses as the graph's selection |
| D38 | Bonds: a donor × every-party table with the vendor-bond void at the same size; no chart | a donor → party flow | Eleven rows read faster as a table; a flow invites a reading of size (F28) |
| D39 | Board roles print the months between office and board (`computed here`, coarser precision) beside the rule text and its void | a "revolving door" flag | The interval and the rule are the record (F27) |
| D40 | **Case pairs are read from `analytic` case↔case edges**; pairs ordered by the earlier member's first record; `CASE_PAIR` is a **gate** anchor, not a layout anchor | A's layout anchor pinning Bofors \| Rafale first; a hand list | Stance rule 5 is enforced by a gate that fails if the pair vanished, instead of a page that silently pins or silently loses it; today the date rule puts Bofors ~ Rafale first (F25) |
| D41 | An unpaired case keeps an equal-width right column with the exact pairing sentence | showing it alone at full width | Absence of a control is a result, at the same prominence |
| D42 | Slice rates by class beside both whole-file references; the slice-wide and excluding-works rates are labelled reference rows under a rule, never marks in the class rows; no winner names | one headline rate; the concentration lists | F32 |
| D43 | A class-year needs n ≥ 10 for a dot | drawing n = 1 at 100% | F32: 16 of 116 class-years |
| D44 | The slice loads after mount through a typed `loadSecurity()` (S8) and a slim generated JSON | a static import of the 316 KB file | House pattern (`cppp.ts`); the file must not ride in the entry |
| D45 | **No shared component is modified**: maps on the finance `LoanMap` pattern over the welfare primitives; office lanes on `LoanClock`; finance chrome reused by name | A's `TenureLanes` `asOf` prop; B's `WelfareMap` `frameDash` and `TenureLanes` `xGrid` | Energy 67/67 and the welfare and finance suites stay untouched (SG-38) |
| D46 | No `party`, `vendor-class` or `era` param; the rail foot says so and links to `#refusals` | silent absence | Stance rules 4–5; refusals are method |
| D47 | `stage` filters the stack and `DelhiLine` at every width; the ledger draws all three slots at ≥ 640 px and one stage below 640, defaulting to BE with the reason on the control | three slots at 390 (84 slots do not fit); one stage everywhere | The ledger's question is "which stages are missing", which the slots answer; a phone cannot hold them |
| D48 | Lens switching keeps `fy`, `st`, `stage`, `tier`, `find`, `sel` and [UX review] (U23) `view`; clears `rec`, `cell`; keeps the rest inactive with a reason | resetting on tab change | Finance D44 |
| D49 | `tier` shares name and format with `GraphExplorer`; series rows are documented or reported by `rowTier`; a response is re-admitted whenever its claim is shown | a separate series tier param | One evidence filter means one thing (finance D35) |
| D50 | The graph draws the module's edges only; series rows are never edges | synthetic edges from budget rows | A budget line is not a relationship; 4,096 edges from one payer would be a hairball |
| D51 | Every twin exports TSV with the `#` header (table, population, filters, `runId`, `asOf`, `# amounts:` with the stage) | CSV without provenance | P must reproduce the screen (finance D39) |
| D52 | The graph status line prints the dropped-edge count, the split-id count and the undated count | silent drops | F21, F27 |
| D53 | Refusals are a rail-foot line and a `#refusals` section | silent absence | Energy D19 |
| D54 | The killed claim and its `killedReason` are printed in Gaps | omitting killed claims | Retained, never deleted (F1) |
| D55 | Ids are never merged by name; split pairs render twice and the gap line states the rule | merging `per:ak-antony` with `per:a-k-antony` on the page | Resolution is the assembler's job (F27) |
| D56 | Exact strings reconciled to the house: `No response recorded — asked/not asked unknown` (finance), `₹0 cr — as recorded`, `no row in this register`, `amount not stated` | A's `sought/not sought unknown`; B's `₹0 crore, as published` | One string across pages, one gate |
| D57 | Stage is never a dash or a hue: it is the `stage` param, the axis title and slot position | a stage dash or tint | Dash is tier (frozen); hue is family (frozen) |
| D58 | Fold at 1280×800: the pension band and its share label are in the first viewport; [UX review] (U2) at 390 the budget is measured on the first build and recorded (ceilings: strip, tabs, Find and rail summary within 1,688 px; top of the stack within 2,110 px), because D1 keeps the resolution statement whole and the head is about 1,100 px | B's Q1 sentences above the fold with the picture below | The brief's first reading is the stack with pensions called out |
| D59 | Finance's `Strip`, `ReconciliationLine`, `LensTabs`, `FilterRail`, `ReadingKey`, `ControlCard`, `Segmented`, `RecordCard`, `StatePanel` shell, `BaseRatesSection`, `NarrativesSection`, `CannotShow`, `GapsSection`, `sourceClass` are reused by name ([UX review] (U16): `tsv` and the export buttons are security's own, because finance's write finance's provenance); welfare `NarrativeLadder`, `TexturePatterns`, `TextureSwatch`; energy `StackTable`; viz `GraphExplorer`, `IndiaMap` geometry and ramp | new chrome | Reuse over new components; the reader learns the chrome once |
| D60 | **Run-drift rule:** no component holds a count; anchors are checked at load; every gate computes its expectation from the module; §0's figures are evidence, not copy | gates that pin §0 numbers | The run will be reconciled (F1) |
| D61 | [UX review] (U6) At 390 each vendor card's field rows sit in a `<details>` whose summary has the identical form on every card; the selected vendor and its comparators open; every card stays in the DOM with the same `dt`s, and an open card shows every field, sources included | about 40 always-open thirteen-field cards (≈ 24,000 px before chapter 2) | Identical and never alone still holds (same summary, same collapse state, same fields); the disclosure is the whole record, never a source list cut short |

---

## 16. Acceptance gates

For `scripts/pages/security.test.mjs`, run against a pinned `SECURITY_DIST` in three builds:
FULL (current module), EMPTY (`META.empty` fixture) and **ZERO-SERIES** (`FORCE_BUDGETS =
FORCE_STRENGTH = FORCE_FOOTPRINT = []`, graph unchanged). **Every expected value is computed
by the test from the generated module independently of `securityView.ts`.** (S) marks a gate
asserting both the interim and the post-prerequisite behaviour, whichever the build has.

**Review Focus and stance**

- **SG-RF1.** (S) For every budget, strength or footprint row whose `note` begins `reported:`
  (or, with S4, `tier === 'reported'`), every surface that shows it (ledger cell name,
  `CellCard`, `StateTable` cell, twin row, `PlaceList` row, map readout) contains the word
  `reported` and draws its mark in the reported dash; no such row is drawn solid. The six PRS
  District Police rows appear only in the District Police column. The spend map's and the
  strength map's frames carry the reported dash while any row or denominator behind them is
  reported.
- **SG-RF2.** For every footprint row with `kind === 'commissionerate'`, every node id
  matching `/-police$/` other than `force:delhi-police` and the 30 state police bodies, and
  every city other than Delhi that any surface lists: every DOM element whose text, `title`,
  `aria-label` or TSV cell names that body contains no `₹`, no digit-group followed by `cr`,
  no `%`; each such budget cell's text equals exactly `inside {State}'s police head (MH 2055)
  — no city budget is published` (on Budgets Q7, Footprint Q3, `StatePanel`, Find results,
  twins, TSV); no such cell is empty or `—`.
- **SG-RF3.** For every URL in {`?lens=procurement`, every `&vendor={id}` for `id` in the
  test's own vendor set, `&fy={each FY with ≥ 1 award}`, `&tier=documented`, `&tier=alleged`,
  `&tier=none`, `&find={each vendor label}`}, at 1280 and 390: the vendor grid renders every
  vendor of the test's set; when `vendor` is set the margin (or inline card at 390) contains
  the fields of at least two vendors, one the selected vendor and the other a declared
  comparator or a member of the other class; both class bands render ≥ 1 card or
  `Comparison set required` is visible; no DOM state contains exactly one vendor `<dl>`.
- **SG-RF4.** No page-authored string (outside quoted symmetry text, narrative text, record
  `lab`/`d`, role labels and node `sub`) contains `UPA`, `NDA`, `BJP`, `Congress`, `ruling`,
  `opposition` or `government of the day`, [UX review] (U22) nor any label or alias of a `ty: 'party'`
  node in `useData()` (the test derives the list), nor `era`, `regime`, `incumbent` or
  `government's`; the check covers captions C1–C21, `aria-label`s, TSV `#` headers, the refusals
  and every chapter and pair-row `h4`; no element's fill or stroke is keyed to party,
  government or era text.
- **SG-RF5.** For every node with the case prefix: it renders inside a pair row whose other
  column is its recorded pair (the test reads the analytic case↔case edges itself) or the
  exact sentence `No control pairing recorded for this case in the register.`; both columns
  have the same set of field labels in the same order; every enforce and alleged record in a
  case file shows a response or the exact sentence `No response recorded — asked/not asked
  unknown` (U+2014); **the `CASE_PAIR` anchor's two cases are in one pair row and that row is
  the first**, at 1280 with equal computed column widths (±1 px) and equal font sizes, at 390
  consecutive. [UX review] (U20) Every pair row's `h4` is `{earlier} beside {later}` and contains no
  word on SG-RF4's list; the row contains the `lab`, `d` and `innocentReading` of every pair edge
  between its two cases.
- **SG-RF6.** Every rendered base-rate row has its domain's `SYMMETRY` text, when one exists,
  inside the same section element (Q4 `CompareBlock`, `ControlCard`, the award frame).
- **SG-RF7.** [UX review] (U19) No rendered base-rate card prints a percentage, a whisker or the
  word `of` between its figures where the numerator exceeds the denominator or either figure is
  not an integer; a fixture row `{numerator: 1727, denominator: 1458}` renders `1727 and 1458`
  with the two-figures chip.
- **SG-RF8.** [UX review] (U21) For every `analytic` edge whose `lab` or `d` appears in the DOM,
  its `innocentReading` appears in the same section element at the same computed font size.

**Data integrity**

- **SG-1.** Every anchor (§3.2) exists in the module (head values, ids, domain values);
  removing one fails the build.
- **SG-2.** With `META.empty`, smoke passes, every Q-block heading renders, the resolution
  statement keeps its words, and no figure reads 0 where a count is unavailable. With the
  ZERO-SERIES fixture, each series' blocks render their headings and the no-rows sentence,
  the stack draws its axis with every column hatched, and the procurement lens is unchanged.
- **SG-3.** No numeric literal other than layout constants appears in
  `src/components/security/*` or `src/pages/Security.tsx` (grep with a px/ms allow-list).
- **SG-4.** **Every ₹ figure in the DOM and in every TSV export is one of:** a row's `cr`; a
  base-rate numerator or denominator; an award, bond or benefit `a`/`amountCr`; a stack
  column's sum of demand-level rows of one `(fy, stage)` labelled `computed here`; the police
  demand's revenue + capital; a `crContext` share labelled `computed here`. No other ₹ exists;
  no export header or `aria-label` carries a total.
- **SG-5.** (S) The regex anchors (and [UX review] (U13) `LAKH_NOTE`) select exactly the rows the
  test's independent rule selects; with S1 present, `level` selection and the anchors agree on every row, and the
  anchors are deleted.
- **SG-6.** For every stack column: band values equal the test's own selection of demand-level
  defence rows for that `(fy, stage)` (Summary rows only where no other rows exist) to ±0.5;
  no `component === 'pay'` row value is a band; where a `MOD_ALL_DEMANDS` row exists the tick
  is drawn at its value and the glyph is `=` iff |Δ| ≤ 0.5, else `≠` with Δ in the twin.
  [UX review] (U9) The pension percentage in the band label, strip fact 2, the answer sentence,
  the readout and the twin is one figure per FY (±0.01) and names its basis: `of published total`
  where the test finds a `MOD_ALL_DEMANDS` row of that `(fy, stage)`, else `of stack, computed
  here`.
- **SG-7.** Every police column satisfies `total === revenue + capital` (±0.5) or draws `≠`;
  the Delhi bracket equals the Delhi total row of that `(fy, stage)`.
- **SG-8.** Every `cr === 0` row renders `₹0 cr — as recorded` wherever it appears and never a
  hatch; every missing `(fy, stage)` column and every empty ledger slot renders a hatch with
  the accessible name `no row in this register`; no element reads `0` for a missing row.
- **SG-9.** Every ₹ element has, within the same element, a denominator text (`a of b,
  computed here`, or one of the no-denominator sentences) and a comparison text (`crContext`).
  [UX review] The gate covers rendered text and twin cells; the ledger grid's cell names are the
  sanctioned exception, and each ends `— open for its share of the demand and the previous year`
  (U32). (U12) Every ₹ element in `CellCard`, `StatePanel` and `FYReadout` has `read to {asOf}`
  within its card; (U13) every ₹ element of a row whose note begins `LAKH_NOTE` contains `₹ lakh`
  and the value × 100.
- **SG-10.** The spend map fills only from `STATE_SERIES_HEAD` rows of the chosen pair, and
  only under a pair whose FY matches the denominator's year; a fixture adding a PRS row for
  Bihar with a larger `cr` leaves Bihar's fill unchanged; Delhi's option name contains "paid
  by the Union"; `jk` and `tr` are hatched under `m=gsdp` with the GSDP words.
- **SG-11.** (S) S3 absent: no element prints a per-person ₹ and `m=percap` is `aria-disabled`
  with the reason; S3 present: `m` defaults to `percap` and every per-person figure names its
  basis and year in the same element.
- **SG-12.** The strength map's values equal `perLakh` as recorded; Delhi is the stipple
  class; derived counts carry the note's words; a vacancy share appears only where both
  counts are recorded and not derived; bins are identical under every `sy`, `fy` and `st`.
- **SG-13.** The resolution statement's three mono lines equal the test's own counts (Union
  rows, bodies, FY range, actual FYs; states with a Police-head row, own series, strength
  rows, reported strength rows; Delhi rows, commissionerates, cities).
- **SG-14.** Footprint: for every kind in the `FootprintKind` type, a chip, a matrix column
  and a reconciliation term render; prison and ordnance read `none in this register` while
  they have no row; per-state dot counts equal the test's counts; an empty state is hatched
  (S10 absent) or hollow (S10 enumerated); no dot's fill varies by kind, body or family.
- **SG-15.** Awards: every non-alleged MoD award with numeric `a` is one mark at its year and
  value; the count row equals awards without `a`; no alleged award is a mark; no element sums
  marks; interim class equals the `fam` mapping for every vendor and derives from neither `ty`
  nor `own`.
- **SG-16.** `VENDORS` equals the test's own union (§3.2); `CASE_PAIRS` equals its own
  unordered pair set; `comparatorsOf` equals the analytic edges between vendors.
- **SG-17.** Slice: every class rate, interval and comparator equals `security.json`; no
  class-year with n < 10 has a dot; `readMeFirst` and `caveat` are present verbatim and not
  inside a closed `<details>`; the slice-wide rate appears only in the reference rows and the
  caption.
- **SG-18.** No case field's classification depends on text: a fixture record whose `lab` says
  "CBI" but whose source node is a court lands in the Court row; every contract card has two
  columns with identical field labels and prints the column rule in its foot.
- **SG-19.** Contested lists every alleged non-contra edge with its responses; the denominator
  sentence's counts equal the test's.
- **SG-20.** The Gaps panel contains every void, every gap, the killed claim and each derived
  gap whose condition the test finds true, and none whose condition is false; the
  `ReconciliationLine`'s Budgets terms sum to `FORCE_BUDGETS.length` and its Footprint terms
  to `FORCE_FOOTPRINT.length` with every declared kind printed.

**Twins and exports**

- **SG-21.** For each graphic, twin rows = axis positions ∪ marks: stack [UX review] (U11) = drawn
  band rows + one published-total row per `(FY, panel)` + one row per hatched `(FY, panel)` +
  the pay, Agnipath and Delhi Police rows, with no `=`, `≠` or `·` in any cell;
  ledger long form = rows in view and coverage = lanes × FYs; maps 36; footprint matrix
  36 × 11; awards = marks + unpriced + empty years; slice = classes + 2 reference rows +
  class-years; office twin = role records; case twin = case ticks. Every row for a hatched or
  empty position carries the null words, never blank or 0; no twin cell contains the bare
  tokens `hatch`, `stipple`, `crosshatch`, `hollow` or `value`. [UX review] (U30) The `StateTable`'s
  sortable columns hold the dot strips' values; (U31) the slice twin's share column equals each
  class's dedup rows over the slice's dedup total.
- **SG-22.** Every TSV begins with `#` lines including the table name, `runId`, `asOf`, the
  filters and, where ₹ appear, `# amounts: ₹ crore, nominal, as published; not deflated;
  stage {stage}`; data rows equal the union over every `tp`; numeric machine columns parse as
  numbers or are empty, never text; `cr` of a zero row exports as `0`. [UX review] (U16) Every
  security export carries `# force {runId} asOf {asOf}` (and the slice digest line where it reads
  the slice), its file name begins `security-`, and no finance, NGO or capital fleet name or run
  id appears in it; (U17) the `StateTable` exports two tables, spend and strength, and
  `derived_counts` is `true` for every strength row whose note carries the DERIVED sentence.
- **SG-23.** `FY_AXIS` includes every FY between min and max; the stack's and the ledger's
  column counts equal its length.

**Encoding**

- **SG-30.** Greyscale screenshots at 390 and 1280 on each lens: hatch, crosshatch, stipple,
  `ZERO_FILL`, hollow, the footprint dot, the ramp floor and the ground pairwise
  distinguishable (ΔL ≥ 8); the four tier dashes distinct; the stack's band lightness steps
  distinct; the reported-dash map frame distinct from solid.
- **SG-31.** At 360 and 390, on each lens, with `view=table`, with `cell`, `vendor`, `case` and
  `rec` set by URL, and with `st=dl`: `document.scrollingElement.scrollWidth ≤ innerWidth`.
  [UX review] (U8) No `<table>` in an open twin has `scrollWidth > clientWidth` unless it carries
  the step control and its hint text; the award and case-timeline containers carry `‹ earlier` /
  `later ›` buttons.
- **SG-32.** No `fill` or `stroke` is a function of party, state government, footprint kind,
  stage or component; the two stack panels share one y-scale (the test reads both axes' max
  tick); footprint dots share one fill.
- **SG-33.** At 1280×800 on Budgets the pension band of the latest drawn column and its share
  label are in the first viewport; [UX review] (U2) at 390×844 the strip, tabs, Find and rail
  summary are within 1,688 px and the top of the stack within 2,110 px, the measured values
  printed and recorded in `SECURITY_ACCEPTANCE.md`; (U3) the pinned stack ≤ 140 px with the tabs
  on one row; (U4) the Find input follows the tabs in the DOM, outside the rail `<details>`; (U5)
  at 390 the stack's step-control buttons are ≥ 44 px.
- **SG-34.** Changing `fy` never changes the stack's, the lanes' or the ledger's x-domain.

**URL and interaction**

- **SG-35.** Every param round-trips; unknown values produce the amber line; defaults
  (including the derived stage, pair and year) are elided; no param pre-selects an entity.
- **SG-36.** `body`, `vendor` and `case` never reduce the number of lanes, cards or pair rows.
- **SG-37.** Changing `tier` changes the graph's drawn edge count; a claim shown keeps its
  response visible whatever the response's tier.
- **SG-38.** The page never writes `q`, `fam`, `ty`, `amt`, `path`; changing `lens` keeps `fy`,
  `st`, `stage`, `tier`, `sel`, [UX review] (U23) `view` and removes `rec`, `cell`; the energy, welfare and finance
  suites keep their pinned counts (no shared component changed).
- **SG-39.** `rec`, `cell`, `st`, `vendor`, `case` and `body` can each be cleared by a pointer
  control (`Close`, `Back to {origin}`) that returns focus to the invoking control; Escape
  closes a row or panel only when focus is inside it.
- **SG-51.** [UX review] (U24) For each of `body`, `vendor`, `case`, `cell` and `st` set by URL, the
  elements carrying `aria-current="true"` (`aria-selected="true"` for `st`) equal the test's own
  count of accented items, and each margin card's `Go to …` link moves focus to the first.
- **SG-52.** [UX review] (U18) With `tier=documented`, and again with `tier=alleged`, no element
  whose underlying rows exist reads `no row in this register`; each reads `{k} rows hidden by the
  {filter} filter — not absent`, and none is drawn with the hatch pattern.
- **SG-53.** [UX review] (U6) At 390×844, cold load, at rest, on each lens: the heading of the
  lens's last Q-block is within 12 viewports (10,128 px) and no single Q-block exceeds 4
  viewports; the measured values are recorded in `SECURITY_ACCEPTANCE.md`.

**Reader paths (scripted, 1280 and 390)**

- **SG-40.** B-J1: activate the latest FY axis button; the `FYReadout` shows the pension row
  with a ₹, its share `computed here`, the published total or the no-total sentence, the
  reconciliation sentence and an `http` source, in ≤ 1 interaction. [UX review] (U14) A
  pension-row citation containing the head verbatim, the stage word, the FY, an `http` URL and
  `read to` is copied, or visible in its `<output>`, in ≤ 2 interactions; (U10) at rest, the
  answer sentence before the drawing and the twin's caption name the latest FY's pension ₹ and
  its share with its basis words.
- **SG-41.** B-J2: type a CAPF's label, `Show its budget lines`, open a cell: the `CellCard`
  shows a ₹ with stage and FY, a denominator text, a comparison text, a tier, an `http` source
  and a citation, in ≤ 3 interactions. [UX review] (U12) The citation is `rowCitation`: it holds
  the head verbatim, the stage word, the FY, an `http` URL and `read to`, and is visible as
  `<output>` text.
- **SG-42.** B-J3 / F-J: type a commissionerate's city: the result and the row it opens show
  the exact city sentence and no ₹, in ≤ 2 interactions. [UX review] (U29) No button or link
  associated with a non-Delhi city body has an accessible name containing `budget line`; its
  verb is `Where its police money sits`.
- **SG-43.** P-J: type a vendor label with no award (a declared comparator): `VendorCard` shows
  it beside its comparators with identical `dt`s and an `http` source, in ≤ 2 interactions.
  [UX review] (U15) On `force:adani-defence`'s card, field 3b names each owned body with its share
  and named-award count in the same `<dl>`, with `listed, not added to this vendor`; every card
  with no `own` edge from its vendor reads `no holding recorded` in field 3b.
- **SG-44.** P-S: activate Procurement; within one scroll of the chapter 4 heading, the Bofors
  and Rafale columns are in one row with equal computed widths (±1 px) and equal font sizes;
  P-P: the CAPF by-year multiple and its TSV are reached in ≤ 2 interactions.

**Accessibility**

- **SG-45.** axe: 0 serious or critical on each lens and each panel state.
- **SG-46.** Tabs, the stack's axis, the ledger grid and the map listboxes are
  keyboard-complete within the §13 budgets; nothing focusable inside an `aria-hidden` or
  `role="img"` subtree, [UX review] (U25) the award graphic, the stack's Agnipath tick, `DelhiLine`
  and the dot strips included; (U28) no vendor card is a composite widget.
- **SG-47.** Exactly one `aria-live` region; no message or `aria-describedby` text contains
  `→`.
- **SG-48.** The gaps panel and every `CannotShow` render at the findings' body size and list
  every `FORCE_VOIDS` entry of the lens's domains.
- **SG-49.** Finance FG-49's structural checks: closed twins expose nothing; every control
  inside an open twin is tabbable; every `<table>` captioned; no heading skips in `main` or
  `aside`; no duplicate accessible names within a section; every `aria-describedby` resolves; [UX review] (U26) exactly one `h3` per
  `section[aria-labelledby]` Q-block; (U27) each reply's DOM nesting depth equals its chain depth
  and its text names the responder it answers.

**Loading**

- **SG-50.** Build with and without the route; print entry and `/security` chunk sizes; fail
  if a string unique to `src/components/security/*` or `securityView.ts` is in the entry, or
  if `security.json` content is in any chunk other than its own; [UX review] (U1) G5 is in place
  before the build, so it also fails if a string unique to `FORCE_BUDGETS`, `FORCE_STRENGTH`,
  `FORCE_FOOTPRINT` or the module's page part is in the entry, and if the entry grows.

---

## 17. Build estimate

**Create**

| file | contents | est. lines |
|---|---|---|
| `src/data/security.ts` | re-exports, prerequisite shims (`null` when absent), `loadSecurity` re-export | 70 |
| `src/data/securityView.ts` | §3.2 derivations: `crContext`, `defenceStack`, `payBracket`, `policeStack`, `LANES`/`laneGroups`, `stateSpend`/`stateStrength`/`STATE_TABLE`, `VENDORS`/`comparatorsOf`/`vendorFields`, `CASE_PAIRS`/`caseFile`/`caseFields`, `derivedGaps`, [UX review] own `tsv` (U16), `rowCitation` (U12), `hiddenBy` (U18), `baseRateForm` (U19) | 780 |
| `src/pages/Security.tsx` | composition, URL wiring, lens tabs, margin precedence, all states (replaces the scaffold) | 400 |
| `src/components/security/Head.tsx` | `ResolutionStatement`, strip facts, `ReconciliationLine` wiring | 200 |
| `src/components/security/DemandStack.tsx` | two panels, bands, brackets, ticks, glyph row, structure rules, `FYReadout`, narrow layout | 420 |
| `src/components/security/LineLedger.tsx` | lanes, slots, grid semantics, `CellCard`, `BodyCard`, narrow stage mode | 380 |
| `src/components/security/BudgetsLens.tsx` | `OfficeLanes` (on `LoanClock`'s drawing), `CompareBlock` wiring, `PayTerms`, `ContractCards`, `StatePair` (two maps on the `LoanMap` pattern, dot strips), `StateTable`, `StatePanel` body, `DelhiLine`, `CityLedger`, `GrantsTable` | 820 |
| `src/components/security/FootprintLens.tsx` | `FootprintMap` (dots on `IndiaMap` geometry, listbox), `KindMatrix`, `PlaceList`, chips | 340 |
| `src/components/security/ProcurementLens.tsx` | `SymmetryContents`, `AwardsByClass` + AoN card, `VendorGrid`, `VendorCard`, `SliceBesideFile` (two forms), `BondTable`, `BoardRoles`, `CaseTimeline`, `CasePairs` | 900 |
| `src/components/security/Sections.tsx` | narratives, `CannotShow`, contested, gaps (derived + killed), refusals, source ledger wiring | 220 |
| `scripts/security-view.test.mjs` | derivations against fixtures (demand-level rule, `laneKey`, `crContext`, `defaultStatePair`, `VENDORS`, `CASE_PAIRS`, `caseFields`, `vendorClass`) | 300 |
| `scripts/pages/security.test.mjs` | §16, RED first, three builds | 850 |
| `docs/design/SECURITY_UX_REVIEW.md`, `SECURITY_ACCEPTANCE.md`, `SECURITY_A11Y.md` | per plan Task 5 | — |

**Modify**

| file | change | est. lines |
|---|---|---|
| `src/data/cppp.ts` | S8: `SecurityFile` type and `loadSecurity()`; a slim `security.slim.json` written by `scripts/cppp/security.py` | 80 |
| `scripts/smoke.mjs` | §3.1 URLs | 10 |
| `package.json` | `test:pages` gains the suite | 1 |
| research and assembler (S1–S7, S9–S13, G5) | reviewed separately; the page ships without them | — |

**Reused by name, unchanged:** finance `Strip`, `MovedFacts`, `ReconciliationLine`,
`ActiveFilters`, `Notices`, `LensTabs`, `FilterRail`, `ReadingKey`, `ControlCard`,
`Segmented`, `BaseRateLine`, `RecordCard`, `Responses`, `OfficeOnDate`, `useFocusOnce`,
`BaseRatesSection`, `NarrativesSection`, `CannotShow`, `GapsSection`, `citationFor`, the
`sourceClass` helper ([UX review] (U16) `tsv`, the export buttons and `rowCitation` are security's
own, in `securityView.ts`; (U19) two-figure base rates render through a security wrapper beside
`BaseRateLine`, which is unchanged); welfare `NarrativeLadder` (`RUNGS`), `TexturePatterns`,
`TextureSwatch`, `ZERO_FILL`, `MAP_ORDER`; energy `StackTable`; viz `GraphExplorer`,
`IndiaMap`'s geometry, `DEFAULT_RAMP` and bins; `Editorial`'s `GapsPanel`,
`DenominatorStrip`, `ContestedList`, `SourceLedger`, `TierLegend`, `Callout`.

**Effort:** ≈ 27 developer-days (A estimated 25 for fewer surfaces; B's line count was
≈ 3,400 against ≈ 4,300 here). S8 ≈ 1 day; S1 and S4 ≈ 1 day each in the generator; S3's
population rows ≈ 1 day of research plus 0.5 in the assembler.

---

## 18. Open risks for review

1. **The stack's interim regex anchors** depend on the head's printed form. A transcription
   that adds a colon to a demand title would silently drop a band. Mitigated by SG-5 and
   SG-6, the published-total tick and the glyph; removed by S1. **Recommend S1 before build**, [UX review] (U1) and G5, which is now a build prerequisite.
2. **The stack is drawn where B refused it.** Its honesty rests on three facts: the demands
   are disjoint voted grants; the Summary itself adds them; the tick and glyph show the
   ≤ 0.76% difference. If reconciliation produces a demand-level row that is not disjoint (a
   sub-line transcribed without its colon), SG-6 fails rather than the stack double-counting.
3. **`% of GSDP` is a substitute for per person**, from a secondary series for one FY. It
   answers "how much of the economy", not "how much per resident"; the frame is reported, the
   option names it, and the UX review should test whether readers carry the ratio away as a
   per-capita figure. A reviewer may prefer the spend map withheld until S3; this spec draws
   it because the denominator is same-year and declared.
4. **The ledger is large** (127 lanes under the stated key × 28 FYs × 3 slots). The
   published-total lanes first, `body` accent from Find, open body groups with counts and
   Q1's picture above it are the mitigations; S1 shrinks it most. The UX review should test
   whether J reaches a CRPF figure in three steps.
5. **Family hue as vendor class** holds only while class is exactly family; S5 must keep class
   inside the family hue. Foreign and Indian private firms share a band until then; the card
   says so.
6. **The award graphic draws a sample one mark each.** A reader may still read the density of
   2023–2025 marks as growth rather than as PIB's publication pattern; C13 says sample, and no
   sum exists to quote.
7. **Case files by the touch rule are thin** (Tatra 1 record; decisions joined for Bofors
   only). Pairs still render with identical fields and null words; S11 fixes depth. C18 says
   density is documentation, not guilt.
8. **Party appears inside quoted symmetry texts at body size** (seven of eight name parties
   or governments). That is the research's wording and the platform's practice; SG-RF4 keeps
   it out of the page's own words. A UX reviewer from each side should test whether the
   procurement chapter heads read as partisan framing.
9. **Hatch-everything footprint** under-states complete lists (cantonments): a reader may read
   hatched Manipur as "unknown" when DGDE's list is complete. S10 resolves it; until then C11
   says some lists were complete.
10. **The open-market slice is three quarters works tenders**; even split by class, a reader
    may carry the slice-wide rate away. It is a labelled reference row under a rule, last.
11. **Ladakh and the merged UT cannot be drawn** on the current geometry; grants name them.
    S2's `recipient` must allow text-only codes; `india-map` may need a Ladakh polygon
    (outside this page). The `resolveState` mapping of Ladakh to `jk` is a trap this page
    avoids by never parsing names; it should be reviewed by the `india-map` owner.
12. **Run drift:** the run will be reconciled; ids such as the two Antony and two Advani
    nodes may merge and counts may move. Every gate computes its expectation from the module;
    no gate pins a §0 number; the §0 facts are stamped to run-92066c7bcf73.
13. **The entry chunk** carries the force module's nodes and edges through `DataContext` (all
    fleets do); the three series and the page code must stay out of it (G5, SG-50). [UX review] (U1) Today
    they are in it (entry 9.8 MB raw, 2.3 MB gzipped), which is why G5 now precedes the build.

---

## Deferred amendments

### Deferred UX amendments ([UX review], SYNTHETIC)

From the five-persona **SYNTHETIC** review in `SECURITY_UX_REVIEW.md` (seats: J journalist, P
policy researcher, S hostile skeptic, A screen-reader user, M 390 px phone on a slow
connection). These are should- and could-level amendments that are not applied. Each is a
hypothesis to test with real readers before it is built. Ids are `UD` because §15 already
uses D1–D61. The grade is the seat's own; where two seats raised an item, both are named.

| id | amendment | seat (grade) | sections |
|---|---|---|---|
| UD1 | **The `FYReadout` lists every stage of the chosen FY** for the demand-level rows: `BE ₹{a} · RE ₹{b} · actual ₹{c}`, or `no RE row` / `no actual row for this FY yet (actuals arrive two years after the budget)`, each with a `switch stage` control; a BE readout opens with the Words definition `the budget's first estimate, not spend`. S also asks for `actual was {k}% of BE, computed here` where both exist; that is a new page-computed ratio and needs an SG-4 allow-list entry first. SG-40 asserts `not spend` and the other stages' values or null words. | J (should), S (should) | §5.1.1, §6, SG-40 |
| UD2 | The comparison adds `change ₹{Δ} cr ({pct}%), nominal, computed here` when both rows exist at the same stage and level; `nominal` joins the Words block; SG-4's allow-list and SG-9 extended. | J (should) | §3.2 `crContext`, §5.0.4, SG-4, SG-9 |
| UD3 | At ≥ 640 px Find joins the sticky wrapper beside the strip, is labelled `Find a body, place, vendor or case`, and takes the `/` shortcut (not when focus is in an input); SG-33 asserts it stays visible after scrolling to Q3. The 390 placement is applied as U4; the 1280 pinned height must be re-measured. | J (should) | §4, §5.0.4, §12, SG-33 |
| UD4 | Find tokenises its query: `YYYY-YY` tokens and the words BE, RE, actual become a pre-set (`fy`, `stage`) on `Show its budget lines`; the remaining tokens must all be present in label, alias or head. SG-41 adds a run with `CRPF 2024-25`. | J (should) | §5.0.4, SG-41 |
| UD5 | Each Bodies result prints `bodyCoverage` in mono (`FY{first}–FY{last} · BE {k}/{n} · RE {k}/{n} · actual {k}/{n}`) and its lane count, with no ₹. | J (should) | §5.0.4, SG-41 |
| UD6 | `StatePanel` orders a state's MH 2055 rows latest first, stage word leading, and opens with `latest actual: FY{fy} ₹{cr} cr — a state figure, not {city}'s`; the `CityLedger` row links to the `state-police` void that no state publishes a city budget. | J (could) | §5.1.6, §5.1.7 |
| UD7 | Case field 8 reads `{date} — {source node} — "{lab}" [{tier}] — {first source url}` with its own Copy citation, plus `{k} later undated records exist` when the gutter is non-empty; SG-RF5 asserts a date or `undated` and an `http` source. | J (could) | §5.3.4, SG-RF5 |
| UD8 | The ledger long form gains machine columns `level`, `parent_head`, `parent_cr`, `share_of_parent_pct`, `prev_fy_cr`, and the header line `# warning: rows overlap by level; sum only level=demand within one (fy, stage); published-total rows are the document's own totals`; SG-22 checks the share column. | P (should) | §5.1.3, SG-22 |
| UD9 | Every export carries `# denominator: {the figure's denominator line}`, `# cannot show: {caption text}` and `# excluded: {what the table leaves out and where it lives}`. | P (should) | §3.2 `tsv`, SG-22 |
| UD10 | Promote S8 to a build prerequisite beside S1 and G5; state in §5.3.2 that the absence sentence is a fixture state, not an expected launch state. P-Q2 is the one block built for P's own question, and the file is already in the repository. | P (should) | §3.3, §5.3.2, §18 |
| UD11 | The slice's denominator line names its bid-count coverage (`{n} of {dedup} decisions ({pct}%) carry a bid count and enter the rates; {dedup − n} do not`), per class in the twin (`bid_count_coverage_pct`), and the year basis of `byClassYear`. | P (should) | §5.3.2 |
| UD12 | When `m` changes and `sfy` is unset, keep the current pair if it is drawable under the new metric; otherwise announce `pair changed to {fy} {stage} ({k} states drawable)` and print the pair in the map's visible title. | P (should) | §3.4, §5.1.6, §3.5 |
| UD13 | The strength denominator line and the `StateTable` caption say `population base for per-lakh: as the source states, not recorded in this register`; a derived gap records that the population base is not a field. | P (should) | §5.1.6, §5.5.3 |
| UD14 | The Q4 twin and TSV gain `property` verbatim, `numerator_unit`, `denominator_unit` and, with S12, `fy` and `kind`, with the header note `# note: fy and kind are in the property text until S12`. | P (should) | §5.1.4 |
| UD15 | C10 and the grants TSV say that two lines are the answer's own totals and are not states, and that rows are not to be added across the table; with S2, an `is_total` column and the two rows last. | P (should) | §5.1.8, §9 C10 |
| UD16 | The resolution statement's Union mono line splits `{UNION_ROWS.length} Union rows` by level using the `ReconciliationLine`'s terms. | P (could) | §5.0.1 |
| UD17 | `BodyCard` offers a scoped export of that body's lanes; the ledger itself stays unfiltered. | P (could) | §5.1.3, §7 |
| UD18 | The spend legend and the `gsdp_cr` header say `GSDP {gsdpFy}, as transcribed (price basis and estimate status not recorded in this register)`, with a derived gap while S3 is absent. | P (could) | §5.1.6, §5.5.3 |
| UD19 | The byline's `{counts.killed} claim killed` uses the house `countOf()`. | P (could) | §4.1 |
| UD20 | An audit-added response renders `Denial found in the public record by the audit — {first source title}; not a statement made to this platform`, with its sources inline; every response count is split `{fromRecord} from the record, {fromAudit} found by the audit`, in the strip, Contested, the case counters and the TSV. | S (should) | §11 E31, §5.0.2, §5.3.4, §5.5.2 |
| UD21 | `--color-rose` (#c45b5a) is the same hex as `FAMILY_COLOR.enforce`, so on the case timeline a denial tick can read as a prosecution. C18 and the `ReadingKey` say that on this page's timelines rose is a response only; the response tick takes a distinct glyph (hollow circle), and SG-30 asserts the shapes differ. Record the coincidence in §18 as a house-level risk. | S (should) | §8.1, §5.3.4, §5.0.4, SG-30, §18 |
| UD22 | Every symmetry block opens with `Wording and the grouping of states and governments are the {domain} research file's, read to {asOf}; this page assigned no state, case or vendor to any party.`; the block heading becomes `The same lens, run on the comparison group — {domain} research file`; prerequisite S14 adds sources and as-of dates for the research's party assignments. | S (should) | §5.3.0, §5.0.4, §5.1.4, §3.3 |
| UD23 | Chapter 4's denominator line states the selection: `{n} case files from {files} research files; the register records no selection rule — these are the cases the files opened, not a census of cases`; a derived gap; a link from the chapter head to the two-sided narrative's rating in Q5. | S (should) | §5.3.4, §5.5.3 |
| UD24 | With S11, a case's empty response slot names a related void the file records (Pegasus's affidavit, the Bofors discharge); until then a line `Voids recorded in this case's files: {k}` links to Gaps. | S (could) | §5.3.4, §3.3 S11 |
| UD25 | A derived gap for every office that narratives or case records name but no role record covers (`No role record for {office} in this register; {n} narratives or case records name it`); no lane is drawn from text. | S (could) | §5.1.2, §5.5.3 |
| UD26 | The Words block gets `id="words"` and a link after the tabs (`Words used on this page: BE, RE, actual, computed here, reported, derived`); `<abbr title>` is not relied on: each table's first ₹ prints `crore` in full and its caption ends with the stage abbreviations spelt out; SG-49 asserts it. | A (should) | §5.0.4, §13 |
| UD27 | The `OfficeLanes` twin gains `FYs overlapped`; the `FYReadout` names the Defence and Home office-holders on 1 April of its FY via `officeOn`, with C3's sentence. | A (should) | §5.1.2, §5.1.1 |
| UD28 | The FY axis's roving tabindex starts on the latest FY with a drawn stack (or the `fy` range's upper bound). | A (should) | §5.1.1, §13, SG-40 |
| UD29 | The filter rail is a labelled `<section>` or `<form>` (`Filters`), not a `nav` landmark. | A (should) | §13, SG-49 |
| UD30 | Arrow glyphs in link text are `aria-hidden` (`{State}'s police head`); SG-47 extends to link and button names. | A (could) | §5.1.7, SG-47 |
| UD31 | The ` · ` separator becomes list items or `;` in accessible text; SG-47 bans U+00B7 in names and descriptions. | A (could) | §5.0.1, §5.0.2, SG-47 |
| UD32 | `ReconciliationLine` links are named `show the {n} {term} rows in the ledger table`. | A (could) | §5.0.3 |
| UD33 | The coverage twin is one row per lane with FY columns, or paged at 400 like the long form; SG-21 says which. | A (could) | §5.1.3, SG-21 |
| UD34 | The Standfirst ends `Every graphic here has a table version.`; the toggle is named `Table view: show every graphic on this lens as a table`. | A (could) | §4.1, §6 |
| UD35 | The live region stays silent when focus moves to a panel heading; it announces only when focus does not move. | A (could) | §3.5, §7 |
| UD36 | At 390, text lines under the stack panels: the police demand's total with Delhi Police's share (`computed here`), and the sum of the pay lines inside revenue, because the shared scale makes them a few pixels tall. | M (should) | §5.1.1, §12 |
| UD37 | The spend map's metric, pair and tier sit in the first line under its `h3` at every width; at 390 the `Open a state` select and that line sit above the map (tests §18 risk 3). | M (should) | §5.1.6, §12 |
| UD38 | At 390 each dot strip turns vertical: one row per drawn state, a dot on a shared value axis, the median labelled. | M (should) | §5.1.6, §12 |
| UD39 | At 390 each domain's base-rate cards sit in a `<details>` (`{domain}: {n} ratios, {m} with a Wilson interval`), with the symmetry text outside it and always visible (SG-RF6 holds); the first pinned domain opens. | M (should) | §5.1.4, §12 |
| UD40 | At 390 the `GrantsTable` groups rows by the head's exact string as closed `<details>` (`{k} rows · FY{a}–FY{b}`); the ASUMP base rates stay above. | M (should) | §5.1.8, §12 |
| UD41 | At 390 `PlaceList` groups by state as closed `<details>` (`{k} installations in {c} cities`), opened where `st` or `kind` matches. | M (should) | §5.2.2, §12 |
| UD42 | At 390 the `GraphExplorer` chunk loads on the `Load the graph` press only, and the button prints the node and edge counts. | M (should) | §5.5.1, §12 |
| UD43 | Captions put their "cannot show" sentence first, without shortening (C2, C7 and C13 are 120–150 words). | M (could) | §9 |
| UD44 | At 390 each stacked contract column keeps its heading as a visible `h4`, with the column rule printed between the two. | M (could) | §5.1.5 |
| UD45 | At 390 each case pair row has a one-line sticky header (`{earlier} \| {later} · control pair`), `aria-hidden` while the `h4` is visible. | M (could) | §5.3.4, §12 |
| UD46 | At 390 each twin's controls put Copy before Download and name the row count in both. | M (could) | §7, §12 |

**Take first when the build has room:** UD1 (two seats; the misreading of BE as spend that
§1.2 names), UD10 (S8 before build), UD20 (the audit-added denials), UD8 (the ledger's level
columns) and UD21 (the rose glyph).
