# /security design duel — judgement

*2026-10-04. Judge's record for `SECURITY_PAGE.md`, synthesised from
`SECURITY_PAGE.candidate-A.md` (graphic-first, 1,410 lines) and
`SECURITY_PAGE.candidate-B.md` (question-first, 1,698 lines). Both candidates profiled
run-92066c7bcf73; so did the judge, by a node script over the module transpiled with esbuild
(`FORCE_*` exports), `research/raw/cppp/security.json`, `research/raw/state-economy.json`,
`src/data/india-geo.json` and `src/data/geo.ts`'s `resolveState`. Every figure below is the
judge's own count; where a candidate's figure differs, §3 says so.*

---

## 1. Method

Each candidate was read in full against: the brief (spec §0 assumptions, §2 resolution
levels, §3 five stance rules, §4.4 the page), the plan's Review Focus 1–3, the house form
(`FINANCE_PAGE.md` §0.2, §3, §8, §13, §14, §16; `ENERGY_PAGE.md` §6 and §8), the
`interface-design` skill, and the module as recomputed. Nine axes, 1–5 each. A score of 5
means the candidate's rule is structural (derived from fields or edges, gated) and matches
the data; 3 means it works but leans on a hand-written list, a text rule without a gate, or
withholds a briefed surface the data could carry; 1 would mean a false statement about the
data.

The base is the candidate whose spine survives grafting with fewer contradictions. The
runner-up's sections are grafted wherever they are stricter, more honest or closer to the
brief; every contradiction is resolved in `SECURITY_PAGE.md` §15 (D1–D60).

---

## 2. Scores and reasoning

| axis | A | B | reasoning |
|---|---|---|---|
| **Honesty of denominators and voids** | 4 | 5 | B routes every ₹ through one derivation (`crContext`) that prints the denominator and the comparison in the same element, computes no total across rows, and puts the per-capita void card in the map's frame. A's stack of demand-level rows is sound (the demands are disjoint voted grants; the published Summary differs by ≤ 0.76% in 5 of 12 FYs and A marks each) and A refuses the 2011-Census per-capita with a computed proof, but A's `% of GSDP` interim uses a `reported` Wikipedia-transcribed series without saying the resulting figure is reported, and A computes a "rest of the demand" residual row the documents do not print. |
| **Fidelity to the five stance rules** | 4 | 5 | Rule 1: both put ₹ beside a denominator; B's is universal and in-element. Rule 2: both build contract cards with both sides at equal size; B assigns a response to a column by the responder node's `ty`/`fam` and prints the rule, A labels four cells by hand (terms / Ministry's case / objections / answers). Rule 3: both render every vendor; B derives the vendor set and the comparators from edges (Adani enters through its two recorded comparisons), A reuses `sel` for vendor accent and pairs by column only. Rule 4: both defer outcomes to a prerequisite and quote the party-group medians as text. Rule 5: B reads the control pairs from the analytic case↔case edges and gives an unpaired case an equal-width empty column; A pins Bofors \| Rafale by a layout anchor. |
| **Use of the three series** | 5 | 3 | A draws from all 4,096 budget rows (stack, ledger, state maps, Delhi line, grants), all 142 strength rows (per-lakh map, dot strip, panel counts) and all 221 footprint rows (per-kind count maps, place list). B withholds the stack and the per-capita map, draws the per-lakh map only, and places footprint rows as dots within states with a 36 × 11 matrix; its ledger uses every Union row but is a wall of 127–135 lanes. B uses the series honestly but decorates less of what the brief asked to see; A uses them and says where each picture is an honest substitute. |
| **City-level honesty** | 5 | 5 | Both make the non-Delhi city budget cell a single fixed string with a gate over every surface, the Delhi line the one city budget, and the commissionerate strength cell a void. A's string names the state and the head (`inside {State}'s police head (MH 2055) — no city budget is published`) and links to the state's row; B's is the Review Focus's exact words. The judged spec takes A's string (the reader can act on it) with B's one-anchor, one-gate discipline. |
| **Reuse of components and frozen channels** | 4 | 4 | Both keep dash = tier, hue = family, shape = type, size = band, hatch ≠ zero, party as text. A adds lightness steps for stack components (a new channel, allowed), a crosshatch for Delhi and a stipple for counts-only (both needed), but also a per-row sequential ramp in the ledger (A's own risk 4) and proposes an `asOf` prop on energy `TenureLanes` (finance kept that component byte-identical). B keeps stage on position, proposes a `frameDash` on `WelfareMap` and an `xGrid` on `TenureLanes` (two shared-component changes), and uses `IndiaMap` geometry for dots. Neither noticed that finance built `LoanMap`/`LoanClock` on the welfare primitives rather than modifying them; the judged spec follows that pattern and modifies nothing shared. |
| **Testability of the acceptance gates** | 4 | 5 | A's gates are concrete (band values vs an independent selection; regex anchors vs an independent rule; `total = revenue + capital`; zero rows; fixture with a larger PRS row leaving Bihar's fill unchanged; the no-city-₹ gate over titles, aria and TSV). B adds the ZERO-SERIES fixture the brief asks for, SG-4 (collect every ₹ in the DOM and prove each is a row, a declared figure or a labelled share), SG-6 (every ₹ has denominator and comparison text), the resolution statement's counts, `VENDORS` and `CASE_PAIRS` recomputed by the test, a text-classification fixture for case fields, and SG-RF4 (no partisan frame in page-authored strings). Both compute every expectation from the module. |
| **Mobile** | 4 | 4 | A draws the 28-column stack at 390 without horizontal scroll (the finance `ReceiptsByYear` precedent), stacks the maps, and admits that eleven ~170 px per-kind maps are hard to tap. B draws the ledger one stage at a time in an inner scroll, stacks case pairs field by field so a pair is still read side by side, and opens vendor comparators inline. Both move strip facts under the first figcaption and keep a ≤ 140 px pinned stack. |
| **Accessibility** | 4 | 4 | Both: one live region in words, the WelfareMap listbox model for maps, drawings `aria-hidden` with label-column buttons, skip links, captions on every table, no heading skips, repeated controls naming their row. A gives the stack one tab stop with a roving FY axis; B gives the ledger `role="grid"` with row/col counts and case pairs as parallel `<dl>`s. B's keyboard budgets are stated per surface; A's are shorter but cover fewer surfaces. |
| **Build cost** | 3 | 3 | A: ≈ 25 developer-days, eleven new components including a two-panel stack with brackets and glyphs, eleven small maps, a two-form slice chart and a shared-component change with a regression suite. B: ≈ 3,400 lines, a 127-lane × 84-slot grid, a subgrid case-pair layout, two shared-component changes. Neither is cheap; both reuse the finance chrome by name. |
| **Total** | **37** | **38** | |

---

## 3. Corrections to the candidates' §0 facts (judge's recomputation)

Figures the judge could not reproduce, with the judge's figure and rule. None changes a
design decision on its own; all are recorded so the builder trusts `SECURITY_PAGE.md` §0.2
over either candidate.

| candidate | claim | judge's count | note |
|---|---|---|---|
| A F7 | 8 defence pay lines from 2017-18 | 8 in 2017-18 → 2025-26 BE; **9 in 2026-27 BE** (and 9 in 2025-26 RE, 10 in 2024-25 actual, 4 in 2013-14 actual) | the bracket's `{k} pay lines` label is derived, so the page is right either way |
| A F17 | 20 `state-police` analytic edges carry per-state prose | **29**; 24 of them name the ruling party in `d` as text | stronger reason for S6 |
| A F29 | "India under-spends on defence" recurs ×2 | the two claims differ in text ("…; it should spend 3% of GDP." vs "…"); the only exact duplicate is "Pensions are eating the defence budget." (`pay-pensions`, `union-defence`) | finance D42 (list as recorded) covers both |
| A F15 | 90 strength notes say the counts are derived | 90 of 93 state notes contain `DERIVED`; 96 of 142 match a case-insensitive `derived` | the page reads the note text either way until S4 |
| A F27 | Bofors \| Rafale "by declared anchor" | the pairing exists as two `analytic` edges (`literature:c026`, `money-people:c091`); a date rule already puts the pair first | the anchor becomes a gate, not a layout rule (D40) |
| B F7 | 328 ASUMP rows name a recipient | **344** rows match `ASUMP … — {recipient} — Allocation\|Released`; 38 distinct recipients including the two table totals; 68 zero rows across 32 recipients | B's design consequence (no parser, S2) stands |
| B F7 | "Ladakh has no polygon or `StateCode`" | there is no Ladakh polygon, but `geo.ts` `resolveState('Ladakh')` returns **`jk`**; `Dadra & Nagar Haveli and Daman & Diu`, `Jammu & Kashmir (UT)` and the two totals return `null` | a parser would not drop Ladakh, it would merge it into J&K silently; the strongest argument in either candidate for S2 |
| B F6 | 135 distinct non-grant lanes | **127** under the stated key (body + component + head minus `Demand N — ` prefix minus the edition suffix); B's key may not have stripped the suffix | the ledger is large either way; the count is derived |
| B F20 | 4 windows open-ended | 7 role **records** are open-ended across 24 distinct `(s, t, from, to)` windows (the same incumbent in two or three files) | grouping by window (E20) handles it |
| B F17 | Adarsh "sits under two ids not joined" | confirmed: `force:case-adarsh` (3 enforce edges) and `force:adarsh-society` (5 edges: an alleged award, two enforce, two contra), with no edge between them | E23 |
| B F3 / A F4 | MoD-side RE in 11 FYs, actuals in 9 | confirmed (demand-level defence rows): BE 27, RE 11, actual 9; MHA-side BE 28, RE 27, actual 16 | — |
| both | 7 of 12 published totals equal the demand-level sum | confirmed; the five differences are +₹582.61 cr (0.757%), +₹417.22 cr, +₹336.31 cr, +₹356.49 cr, +₹535.09 cr (0.225%): A's "0.22–0.76%" and B's "₹336–583 crore" are both right | the stack is drawn with the tick and glyph (D5, D10) |
| both | the first probe's slice figures (529,837 rows; 2.7%) | superseded by the built `security.json` (558,291 raw; 411,943 dedup; 3.17%) — A says so in F32; B uses the built figures | the page prints the file's figures only |

---

## 4. Base and grafts

**Base: B.** Its rules are structural where A's are positional, and its gate suite proves the
stance rules rather than asserting them. The spine taken from B: `ResolutionStatement`;
numbered Q-blocks; `crContext`; the three-slot `LineLedger`; `OfficeLanes` on the FY grid;
two-column `ContractCards` by responder `ty`/`fam`; the 36-row `StateTable`; the footprint
dots and `KindMatrix`; the procurement symmetry chapters; `VENDORS`, `comparatorsOf`,
`CASE_PAIRS`, `caseFile` as derived sets; `VendorGrid` and the comparator-opening
`VendorCard`; `CaseTimeline` and `CasePairs` with the equal-width pairing sentence; bonds and
board roles as tables; the ZERO-SERIES fixture; SG-4, SG-6, SG-RF4; the `body`, `cell`,
`vendor`, `case` params; the live-loaded slice accessor; S4, S11, S12, S13.

**Grafted from A** (each overriding a B refusal or filling a B gap):

1. `DemandStack` as Budgets Q1 — the brief's central graphic, drawable today because the
   demand-level rows are disjoint and the published total is drawn as a tick (D5).
2. The derived default stage, state pair and strength year (D9).
3. `StatePair`: the spend map on `% of GSDP` interim with the per-person option disabled and
   its reason, the per-lakh strength map, the dot strips, the Delhi crosshatch, the
   counts-only stipple, the `GSDP not in this build` hatch (D18–D20, D24).
4. `DelhiLine` (D16).
5. The city sentence that names the state and the head (D17).
6. 0-row footprint kinds named with their reason; S10 (D27).
7. `SliceBesideFile`'s by-year small multiples and the n < 10 rule, using all 116 class-year
   rows (D42, D43).
8. The AoN void card inside the award graphic's frame (D32).
9. Vendor class read from the actor family with hue unchanged (D33).
10. The broader structural vendor union (plants, bonds, board roles), so every body a table
    names has a card (D35).
11. S1's `demandNo`/`scheme`, S3 (population), S5, S6, S7, S9.
12. The no-city-₹ gate over titles, accessible names and TSV cells (SG-RF2); the greyscale
    distinctness gate over seven fills (SG-30).

**Added by the judge:**

- `AwardsByClass` as one mark per contract at year × ₹ on a log axis: A's reading (class by
  year and value) without A's stacked sums over a sample and without B's refusal of any
  amount channel (D34).
- The published-total tick over the stack (B's own upgrade condition, met at demand level
  today) beside A's glyph row (D5, D10).
- Removal of A's computed residual row (D14) and of A's `sel` reuse for vendor accent (D37).
- No shared component modified: maps on the finance `LoanMap` pattern, office lanes on
  `LoanClock` (D45), which neither candidate noticed finance had already done.
- The exact strings reconciled to the house (D56); the stance rules written as frozen page
  rules (§8.2 items 3, 7, 8, 10, 11, 12).
- The corrected facts of §3 above, stamped to run-92066c7bcf73.

---

## 5. Contradictions resolved

| topic | A | B | judged |
|---|---|---|---|
| the stack | draw it from demand-level rows with a reconciliation glyph | refuse any stack until S1 | draw it, with the published total as a tick and the glyph; SG-6 fails if a band is not disjoint (D5) |
| per-capita map | `% of GSDP` interim, per capita disabled | void card in the frame | A's interim with the reported frame; B's void sentence becomes the disabled option's reason (D18) |
| ledger form | heat cells, per-row ramp, one stage at a time | three stage slots per FY, lane's own scale | B's form (D12); A's "one stage at a time" survives below 640 px only (D47) |
| residual row | "rest of the demand, computed here" | no computed ₹ beyond a row's share | no residual; the share column carries it (D14) |
| footprint | eleven per-kind count choropleths | one dot per installation + matrix | B's (D26) with A's 0-row kinds named (D27) |
| strength map Delhi | stipple counts-only | hatch "per lakh not printed" | A's stipple (D24) |
| spend map Delhi | crosshatch "paid by the Union" | table row words | A's crosshatch (D20) |
| office lanes | under the stack; extend `TenureLanes` | under the ledger; extend `TenureLanes` | under the stack sharing its grid; on `LoanClock`'s pattern, nothing shared modified (D29, D45) |
| contract cards | four cells | two columns by responder `ty`/`fam` | B's two columns; A's benefit-row "stated case" inside the left column (D30) |
| vendor set | awards ∪ plants ∪ bonds ∪ board roles | awards ∪ declared comparators | the union of both (D35); comparators from edges (D36) |
| vendor accent param | `sel` | `vendor` | `vendor` (D37) |
| award graphic | stacked ₹ by class by year + unpriced count row | ticks per vendor lane, no amount channel | one mark per contract at year × ₹ log, count row, no sums (D34) |
| slice | two forms (class rows; by-year multiples) | class rows + two reference rows | A's two forms with B's reference rows and `readMeFirst` → `caveat` order (D42) |
| case pairs | Bofors \| Rafale pinned first by anchor; lanes + table per case | pairs from edges; equal columns; unpaired sentence | B's, with the anchor as a gate (D40, D41) |
| city sentence | names the state and the head, with a link | the Review Focus's exact short words | A's, as one anchor and one gate (D17) |
| empty response string | `sought/not sought unknown` | `asked/not asked unknown` | the house string (D56) |
| ₹0 string | `₹0 cr — as recorded` | `₹0 crore, as published` | `₹0 cr — as recorded` (D56) |
| base rates placement | margin `ControlCard` + per-lens section | Q-block "Compared with what?" in sequence | both: the margin card and Q4 are the same component (D15) |
| grants | table, head verbatim; S2 | table, head verbatim; S2; the Ladakh finding | B's with the judge's `resolveState` check as the reason no parser is allowed (D21) |

---

## 6. What neither candidate had

- Finance had already built `LoanMap` and `LoanClock` on the welfare and energy primitives
  without modifying them; both candidates proposed shared-component changes that the house
  had chosen not to make. The judged spec follows finance (D45).
- Neither ran the ASUMP recipient names through `resolveState`; the judge did, and the
  Ladakh → `jk` result is the decisive argument for S2 over any parser (F13).
- Neither reconciled the exact strings to the house's finance strings; the judged spec does
  (D56).
- Neither wrote the five stance rules as frozen page rules; the judged spec does (§8.2),
  so a reviewer can check each against a gate (SG-RF2–RF5, SG-4, SG-9, SG-15, SG-32).
