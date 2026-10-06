# Force fleet — the ledger: counting rules, controls, coverage, base rates, voids, gaps, disagreements, refuted and killed claims

*One fleet, eight domain files, written 2026-10-04 and corrected through 2026-10-06: `research/raw/force/{union-defence,union-home,state-police,procurement-industry,footprint,money-people,pay-pensions,literature}.json`, with `AUDIT.json` ({{cnt::audit}} cross-examiner verdicts) and `RECONCILIATION.json`, assembled by `scripts/assemble-fleet.mjs` into `src/graph/force.generated.ts` (run `{{meta::runId}}`); beside it the CPPP security slice `research/raw/cppp/security.json`. Sections 1–3 and 9 are hand-written prose whose every figure is a placeholder the generator resolves from the file it names; sections 4–8 and 10–12 are emitted verbatim from the files' arrays (`mappings`, `refusedMerges`, `baseRates`, `voids`, `gaps`, `symmetryCheck`, `killed`, `auditCorrections`, `verdicts`). The generator is described at the foot of `narratives.md`. Do not edit a figure here: fix the file and regenerate.*

## Contents

1. Counting — what each series counts, and what is never summed
2. Declared controls
3. Coverage — what was read, by series
4. Ids — the mappings that won and the merges refused
5. Base rates — publish the denominator
6. Voids — documented absences
7. Gaps — what could not be verified, and where it would be found
8. Symmetry checks, verbatim
9. Where figures disagree — carry both, flag it
10. Register of refuted and killed claims, by failure mode
11. Audit corrections by domain, with outcomes
12. The records audited late (the brief's pending set)

## 1. Counting — what each series counts, and what is never summed

**Three tabular series, one shape each** (`docs/research/FLEET_CONTRACT.md` → Phase H; keys in order in `scripts/lib/vocab.mjs`). `budgets[]` is one row per (payer, body, head, component, fy, stage); `strength[]` one row per (body, year); `footprint[]` one row per `id`. The raw files hold {{cnt::budgets}} budgets rows ({{cnt::budgetsByFile}}), {{cnt::strength}} strength rows ({{cnt::strengthByFile}}) and {{cnt::footprint}} footprint rows ({{cnt::footprintByFile}}); `FORCE_META.series` reads budgets {{meta::series.budgets}}, strength {{meta::series.strength}}, footprint {{meta::series.footprint}}.

**Budget rows overlap by level; the hierarchy is in the `head` text only.** There is no `level` or `parent` field. In 2024-25 actual, `{{v::ud::budgets[head=Demand 20 — Defence Services (Revenue)&&fy=2024-25&&stage=actual].head}}` is ₹{{v::ud::budgets[head=Demand 20 — Defence Services (Revenue)&&fy=2024-25&&stage=actual].cr}} crore; inside it `…: Defence Services - Army` is ₹{{v::ud::budgets[head=Demand 20 — Defence Services (Revenue): Defence Services - Army&&fy=2024-25&&stage=actual].cr}} crore; inside that `…: Pay and Allowances of the Army` is ₹{{v::ud::budgets[head=Demand 20 — Defence Services (Revenue): Pay and Allowances of the Army&&fy=2024-25&&stage=actual].cr}} crore (all `union-defence.json`). **Never add rows from two levels.** A total comes from the demand-level row or a published Summary row, never from summing sub-lines.

**Two payers for one force are never added.** Jammu & Kashmir Police is a Union line from 2024-25 (`union-home.json`, `Demand 51 — Police: Jammu & Kashmir Police`, ₹{{v::uh::budgets[head=Demand 51 — Police: Jammu & Kashmir Police&&fy=2024-25&&stage=actual].cr}} crore actual 2024-25) and a state payer `jk` in RBI's `Police (MH 2055)` (`state-police.json`, ₹{{v::sp::budgets[payer=jk&&fy=2023-24&&stage=actual].cr}} crore actual 2023-24, ₹{{v::sp::budgets[payer=jk&&fy=2025-26&&stage=BE].cr}} crore BE 2025-26). Each surface names the payer.

**`cr` is a number ≥ 0; zero is a figure; a line the document does not print is not a row.** {{cnt::budgetsZero}} rows print ₹0 (`cnt` over the raw files). Negative nets are not rows: the Defence Ordnance Factories revenue demand printed negative nets in several years and the series rule keeps them out, recorded as a void instead — "{{x::ud::voids[3].what::^[^:]+}}" (`union-defence.json` void 3). The four-demand totals in that file's base rates include the negative nets as printed.

**Units.** The Union publishes in ₹ crore and the Union rows are as printed. RBI's Appendix II prints ₹ lakh; the state rows were converted — `state-police.json` notes "{{x::sp::budgets[payer=jk&&fy=2023-24&&stage=actual].note::RBI Appendix II prints ₹ lakh; converted to ₹ crore \(÷100\)}}". The spec says "Money is ₹ crore as published (no conversion)" (`docs/superpowers/specs/2026-10-04-force-finance-design.md` §4.1); the RBI conversion is the one exception, stated in every such row.

**Tier marks in rows.** A row transcribed from a secondary keeps its source and begins `note` with `reported:`. On the raw files: budgets {{cnt::budgetsReported}}, strength {{cnt::strengthReported}} of {{cnt::strength}}, footprint {{cnt::footprintReported}}. The strength series is reported almost throughout because BPR&D is unreachable; `state-police.json` derives absolute counts from per-lakh ratios and says so in the note.

**Footprint rows must carry `st` and `city`.** A row the map cannot place is not a row. Prisons therefore have no footprint rows: NCRB prints counts and capacity per state, not addresses (`footprint.json` void 2), and the per-state prison facts sit on `force:<st>-prisons` entities.

**Awards are PIB-named, and the PIB-named set is a sample.** An `award` edge exists only where PIB (or the vendor's exchange filing) names vendor and ₹; joint totals, AoNs and unpriced contracts are facts on the buyer. The cross-examiner refuted the label "PIB-named MoD awards 2021-25" as an exhaustive set (`procurement-industry:c063`), and the corrected claim reads "{{v::pi::claims[id=procurement-industry:c063].lab}}".

**Bonds.** Donor names were normalised by the fleet ("{{x::mp::gaps[10]::^[^;]+}}", `money-people.json` gap 10); the counts are approximate and say so.

**Chunked emission.** TypeScript gives up on one array literal of a few thousand rows: "{{t::scripts/assemble-fleet.mjs::TS2590 — seen at [0-9,]+ budgets rows}}" (`scripts/assemble-fleet.mjs`). Above `{{t::scripts/assemble-fleet.mjs::CHUNK_ROWS = [0-9]+}}` rows a series is emitted as non-exported chunk constants that the export spreads; `validate.mjs` reads them back. Grep the chunks, never re-join them by hand.

**The CPPP slice is a different population.** It counts award decisions in a scrape after the dedup rule "{{v::sec::quality.afterDedup.rule}}" — {{v::sec::quality.afterDedup.rows}} rows, {{v::sec::quality.afterDedup.shareOfFileDedupRowsPct}}% of the file's dedup rows (`security.json` → `quality.afterDedup`). Its rate denominator is "{{v::sec::rates.denominator}}" = {{v::sec::rates.denominatorN}}. It never sums with a budget row, and it is not defence capital acquisition (`security.json` → `readMeFirst`).

**The slice's red flags are rates, never names.** `security.json → redflags.indicators` holds four indicators: single bidding, non-open tender, decision within two days, and repeat single-bidder marked winners. Each is a rate over its declared family, by class, beside the whole file: "{{v::sec::redflags.stance}}" (`redflags.stance`). The repeat indicator's family is "{{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].familyDefinition}}": slice {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].count}} / {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].familySize}} = {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].ratePct}}%; capf {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].byClass[class=capf].count}} / {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].byClass[class=capf].familySize}} = {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].byClass[class=capf].ratePct}}%; state-police {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].byClass[class=state-police].count}} / {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].byClass[class=state-police].familySize}} = {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].byClass[class=state-police].ratePct}}%; whole file {{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].wholeFile.ratePct}}%. "{{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].noNames}}"; its innocent reading: "{{v::sec::redflags.indicators[indicator=repeatSingleBidderMarkedWinners].innocentReading}}" The only ordered list of firms in the file is `concentration → topMarkedWinners`, by total awards ("{{v::sec::concentration.namingRule}}").

## 2. Declared controls

The fleet contract (`docs/research/force/CONTRACT-force.md`, "The controls you must run"; also in the spec §3 and here) declares four controls. Each file ran the ones its domain supports and says which it did not run in its `symmetryCheck` (§8, verbatim).

| control | the comparison | files that ran it | not run, and why (from the files) |
|---|---|---|---|
| Union, previous government | the same line under UPA-II (FY2009-10 → 2013-14) beside NDA (FY2014-15 →): growth, share of GDP, pay-to-capital | union-defence, union-home, pay-pensions, procurement-industry | union-home: no ED, CBI or NIA budget is attached to a Home Minister, because those agencies are not in the MHA; procurement-industry: UPA-II production and licence series by year not collected |
| States | BJP-run beside opposition-run on per-capita spend, per-lakh strength, vacancy share and outcome rates; party as text in `d`, never the subject | state-police, footprint, literature (SPIR tables as printed) | union-home: the ASUMP state rows carry no party field; pay-pensions: opposition-run portals never opened, so no cross-party pay comparison |
| Vendors | a private vendor beside the DPSU in the same category and beside other private vendors in the same years | procurement-industry, money-people (Bharat Forge board as the retired-officer control) | PIB prints joint totals and no bid counts, so no head-to-head can be scored; the IADS bidder list was not opened |
| Cases | Bofors beside Rafale; AgustaWestland beside Tatra; identical fields | money-people, literature, procurement-industry | Sukna beside Pegasus is a third pair (`money-people:c093`); Adarsh is unpaired |

The CPPP slice declares its own comparators: each class's single-bidder rate beside the whole file on the same portal and the whole file (`security.json` → `rates.comparatorRule`: "{{v::sec::rates.comparatorRule}}").

## 3. Coverage — what was read, by series

Computed over the raw files by the generator:

{{@coverage}}

`FORCE_META` (run `{{meta::runId}}`) reads files {{meta::counts.files}}, nodes {{meta::counts.nodes}}, claims in {{meta::counts.claimsIn}}, edges {{meta::counts.edges}}, killed {{meta::counts.killed}}, audit-added contras {{meta::counts.contrasAdded}}, downgrade verdicts {{meta::counts.downgradeVerdicts}}, benefit rows {{meta::counts.benefits}}, voids {{meta::counts.voids}}, narratives {{meta::counts.narratives}}, base rates {{meta::counts.baseRates}}. The raw files hold {{cnt::claims}} claims, {{cnt::entities}} distinct entity ids, {{cnt::gaps}} gaps.

What the slice covers, in its own words: "{{v::sec::readMeFirst}}" (`security.json` → `readMeFirst`). Coverage gaps that bound the footprint: "{{x::fp::scope::Left out: [^.]+}}" (`footprint.json` → `scope`).

## 4. Ids — the mappings that won and the merges refused

`RECONCILIATION.json` holds {{cnt::mappings}} mappings, {{cnt::refusedMerges}} refused merges, {{cnt::entityRecordsConsolidated}} consolidated entity records, {{cnt::predicateFixes}} predicate fixes ({{@predicateFixes}}), {{cnt::addedContras}} added contras, {{cnt::otherFixes}} other fixes and {{cnt::criticItems}} critic items. The raw files were rewritten in place, so no losing id survives in any force file.

### Mappings

{{@mappings}}

### Refused merges

{{@refusedMerges}}

## 5. Base rates — publish the denominator

Generated verbatim from each file's `baseRates[]`: property, numerator / denominator (Indian digit grouping; nothing recomputed), label and first source label. `null` is a figure the file could not compute and says why. {{cnt::baseRates}} rows in all. The `union-defence` rows carry the FY and the kind only in the property text; read it before charting.

{{@baseRates}}

## 6. Voids — documented absences

A void is a finding (evidence-tiering, the absence rule). Generated verbatim from each file's `voids[]`; {{cnt::voids}} in all.

{{@voids}}

## 7. Gaps — what could not be verified, and where it would be found

Generated verbatim from each file's `gaps[]`; {{cnt::gaps}} in all.

{{@gaps}}

## 8. Symmetry checks, verbatim

Each file's `symmetryCheck`, as written. These are the controls run; read the whole text before quoting one figure from it.

{{@symmetry}}

## 9. Where figures disagree — carry both, flag it

- **Police per lakh, three dates, one number twice.** `state-police.json` baseRate 1: {{br::sp::1}} (actual / sanctioned, as on 01.01.2024; label: "{{x::sp::baseRates[1].label::Jan 2020: [0-9.]+ / [0-9.]+}}"). `union-home.json` baseRate 10: {{br::uh::10}} for January 2024. `literature.json` baseRate 0: {{br::lit::0}} for 2023-01-01 against the unverified benchmark; baseRate 12: {{br::lit::12}} for 2022-01-01. The literature file says not to mix the 2022 pair with the 2016 sanction.
- **CAPF vacancies, three denominators.** {{br::uh::11}} (January 2024, six forces, `union-home.json` baseRate 11); {{br::pp::5}} (1 Jul 2024, six forces, `pay-pensions.json` baseRate 5); {{br::lit::5}} (2024-07-01, five forces, `literature.json` baseRate 5). CAPF actual strength: {{brn::uh::9}} (January 2024, `union-home.json` baseRate 9) against {{brd::pp::0}} (1 Jul 2024, `pay-pensions.json` baseRate 0).
- **The opposition-run custodial-death median, two figures in one file.** `state-police.json` baseRate 7 reads {{br::sp::7}} ("{{x::sp::baseRates[7].label::^[^;]+}}"); the same file's `symmetryCheck` reads "{{x::sp::symmetryCheck::Opposition-run \([^)]+\): .*?[0-9.]+ cases per lakh police}}". Carry both until the file is regenerated.
- **Defence share of Union expenditure.** PRS via `literature.json` baseRate 4: {{br::lit::4}} ("{{brl::lit::4}}"). The demands via `union-defence.json`: {{x::ud::baseRates[51].label::ratio = ([0-9.]+%)::1}} for {{x::ud::baseRates[51].property::(?:BE|RE|actual) [0-9][0-9][0-9][0-9]-[0-9][0-9]}} (baseRate 51) and {{x::ud::baseRates[99].label::ratio = ([0-9.]+%)::1}} for {{x::ud::baseRates[99].property::(?:BE|RE|actual) [0-9][0-9][0-9][0-9]-[0-9][0-9]}} (baseRate 99). Different numerators and denominators; both stand.
- **India's share of GDP in 2024.** SIPRI's April 2025 fact sheet via `literature.json` baseRate 2 ("{{x::lit::baseRates[2].property::India \([0-9.]+%\)}}"); SIPRI's v1.2 workbook via `union-defence.json` baseRate 108: {{brn::ud::108}}%; World Bank WDI via baseRate 126: {{brn::ud::126}}%. The union-defence narrative 0 counter explains the rank difference: "{{x::ud::narratives[0].strongestCounter::sixth in 2024 in the v1\.2 file[^)]*\)}}".
- **Defence pensioners.** {{brd::pp::6}} defence pensioners in 2024-25 (`pay-pensions.json` baseRate 6, Standing Committee) against "{{x::lit::narratives[6].strongestCounter::about 32\.9 lakh pensioners[^)]*\)}}" (`literature.json` narrative 6). `pay-pensions.json` void 4 records that the 2016 and 2015 counts are of different populations.
- **The PIB-named award sample.** `procurement-industry.json` baseRate 36 still reads {{br::pi::36}} for DPSUs and the `symmetryCheck` "{{x::pi::symmetryCheck::DPSUs [0-9.]+% \(HAL [0-9.]+%\)}}"; the corrected claim `procurement-industry:c063` adds the WASS torpedo contract and reads "{{x::pi::claims[id=procurement-industry:c063].d::Pooled 2021-25: DPSU [0-9.]+%[^₹]*₹[0-9.]+ lakh crore}}…". The base rate and the symmetry text were not regenerated after the correction.
- **The Bofors contract value.** `procurement-industry.json` `symmetryCheck` cites "{{x::pi::symmetryCheck::US\$285 million / about ₹1,500 crore in the Bofors record of the money-people file}}"; the corrected record it points to now reads "{{v::mp::claims[id=money-people:c053].lab}}" (`money-people:c053`, after the cross-examiner refuted the US$ figure).
- **CAG Report No. 3 of 2019.** `money-people.json` read it in full through the CHRI mirror ("{{x::mp::scope::CAG Report No\. 3 of 2019 read in full for the Rafale paragraphs}}"), and `procurement-industry.json` baseRate 25 records {{br::pi::25}} ("{{brl::pi::25}}"). `literature.json` could not reach cag.gov.in and does not assert the pricing finding ("{{x::lit::gaps[1]::the Rafale pricing finding[^;]*}}"). Two routes, one report; cite the file that opened it.
- **How many defence-linked bond donors.** `money-people.json` baseRates 3 and 7 count three (Megha Engineering, Mahindra & Mahindra, Cyient); void 1 says the set is four once the 2025 Force Motors vehicle contract is counted — and the Force Motors bond and award claims were audited late (`money-people:c096`: {{late::money-people:c096}}; `c097`: {{late::money-people:c097}}; §12). The base rates were not recomputed for four; cite three with the void beside it.
- **DRAL holdings in two files.** `procurement-industry:c050`–`c053` carry the Dassault/Reliance Infrastructure 49/51 split and its 2025 transfer; `money-people:c069` and the new `c100`–`c102` carry the same holdings again. The money-people copies were audited late (§12); neither file says it is the other. Hold both; do not sum or merge until reconciliation rules.
- **Cochin Shipyard's Government holding.** `union-defence:c016` ("{{v::ud::claims[id=union-defence:c016].lab}}") is superseded by `union-defence:c047` ("{{v::ud::claims[id=union-defence:c047].lab}}"), audited late ({{late::union-defence:c047}}). Cite c047 only from a `FORCE_META` run that postdates its correction; until then cite c016 with its quarter.
- **The state per-capita base.** `state-police.json` computes per-capita spend on a projected population (narrative 1 counter: "{{x::sp::narratives[1].strongestCounter::₹1,212 per capita in 2023-24 Accounts}}"). On the 2011 Census base in the repository, the page spec found "{{t::docs/design/SECURITY_PAGE.md::the 2011 base inflates Bihar by about a fifth and Kerala by about a fifteenth}}" (`docs/design/SECURITY_PAGE.md` §0.2 F17). Use the file's projected base or none.
- **Cantonments, 61 or 62.** Both are right on their dates: `footprint:c010` holds (AUDIT: {{aud::footprint::footprint:c010}}) — "{{x::audit::verdicts[claimId=footprint:c010].dateTest::MoD/DGDE listed [0-9]+ Cantonment Boards including Khasyol on [0-9-]+, and listed [0-9]+ without Khasyol on a page last updated [0-9-]+}}"; Khasyol was de-notified "{{x::audit::verdicts[claimId=footprint:c010].dateTest::w\.e\.f\. [0-9.]+}}". The spec's architecture table still says "{{t::docs/superpowers/specs/2026-10-04-force-finance-design.md::[0-9]+ cantonments, DPSU plants}}" (`docs/superpowers/specs/2026-10-04-force-finance-design.md` §4.3).
- **The page spec read an earlier run.** `docs/design/SECURITY_PAGE.md` §0.2 was "{{t::docs/design/SECURITY_PAGE.md::Read on 2026-10-04 from the transpiled module \(run-[0-9a-f]+\)}}": "{{t::docs/design/SECURITY_PAGE.md::`FORCE_META`: 8 research files; [0-9]+ nodes; [0-9]+ edges}}", "{{t::docs/design/SECURITY_PAGE.md::`FORCE_BUDGETS` [0-9,]+ rows}}", "{{t::docs/design/SECURITY_PAGE.md::`FORCE_FOOTPRINT` [0-9]+ rows}}", "{{t::docs/design/SECURITY_PAGE.md::Narratives [0-9]+}}", "{{t::docs/design/SECURITY_PAGE.md::Base rates [0-9]+ by domain}}". The current run `{{meta::runId}}` reads nodes {{meta::counts.nodes}}, edges {{meta::counts.edges}}, budgets {{meta::series.budgets}}, footprint {{meta::series.footprint}}, narratives {{meta::counts.narratives}}, base rates {{meta::counts.baseRates}}, killed {{meta::counts.killed}}. Read `FORCE_META`, not the spec's table.
- **The spec's first CPPP probe is not the slice.** The spec's raw-row probe found single bidding "{{t::docs/superpowers/specs/2026-10-04-force-finance-design.md::13,025 / 476,505 = \*\*2\.7 %\*\*}}"; the built slice reads {{v::sec::rates.total.singleBidderPct}}% (Wilson 95% interval {{v::sec::rates.total.wilson95}}) over {{v::sec::rates.total.n}} awards after the dedup rule (`security.json` → `rates.total`). Print the slice, never the probe.
- **Party-group per-capita medians.** `state-police.json` baseRate 9 ({{br::sp::9}}) labels its lists "{{x::sp::baseRates[9].label::large states only \(pop > 3 crore\)}}" but lists CT and HR (below 3 crore) and leaves out AS and JH: the pre-audit set. `state-police:c021` and the symmetryCheck carry the corrected set (`RECONCILIATION.json → auditCorrections`, `state-police:c021`). The base rate stores two group medians as numerator and denominator; it is not a ratio. Cite c021; correct baseRate 9 in the file (owner action) and regenerate.
- **Two state-police texts.** `state-police:c021` says "{{x::sp::claims[id=state-police:c021].d::small north-eastern states \(AR, TR, GA\)}}"; Goa is not north-eastern. `state-police:c017` gives Chhattisgarh's government in the period as BJP only, though the INC held it to 2023-12-13, most of the 2023-24 spend it measures. Owner action: correct both, add per-state claims for AR, GA and TR, and send them to `cross-examiner`.
- **Ladder statuses across files** are in `narratives.md`, "Where files rate the same subject".

## 10. Register of refuted and killed claims, by failure mode

**Refuted.** The cross-examiners refuted {{cnt::refuted}} of {{cnt::audit}} verdicts (union-defence {{cnt::refuted:union-defence}} of {{cnt::audit:union-defence}}; union-home {{cnt::refuted:union-home}} of {{cnt::audit:union-home}}; state-police {{cnt::refuted:state-police}} of {{cnt::audit:state-police}}; procurement-industry {{cnt::refuted:procurement-industry}} of {{cnt::audit:procurement-industry}}; footprint {{cnt::refuted:footprint}} of {{cnt::audit:footprint}}; money-people {{cnt::refuted:money-people}} of {{cnt::audit:money-people}}; pay-pensions {{cnt::refuted:pay-pensions}} of {{cnt::audit:pay-pensions}}; literature {{cnt::refuted:literature}} of {{cnt::audit:literature}}). The grouping by failure mode is the generator's hand-made map; it fails the run if a refuted verdict is missing or listed twice. The claim ids are as the cross-examiners saw them; `RECONCILIATION.json` has since re-pointed some (`otherFixes`).

{{@refuted}}

The first sentence of each refuted verdict, verbatim:

{{@refutedReasons}}

**Killed.** {{cnt::killed}} claims are killed: {{cnt::killedDup}} as duplicates (held, not deleted; each killed copy's sources folded into its survivor) and {{cnt::killedOther}} on the cross-examiner's `kill` recommendation, which met the record's own `killIf`.

{{@killed}}

## 11. Audit corrections by domain, with outcomes

`RECONCILIATION.json → auditCorrections` records an outcome for every one of the {{cnt::acTotal}} verdicts: applied {{cnt::ac:applied}}, refused {{cnt::ac:refused}}, deferred {{cnt::ac:deferred}}. Claim ids were never renumbered, so every verdict still lands on its claim.

{{@corrections}}

## 12. The records audited late (the brief's pending set)

The brief that commissioned this skill (2026-10-06) listed these records as pending cross-examination: they were written or rewritten by the corrections pass after the main audit. The table reads their state at generation from `AUDIT.json` (asOf {{v::audit::asOf}}, {{cnt::audit}} verdicts) and `RECONCILIATION.json → auditCorrections`: {{cnt::lateNoVerdict}} without a verdict, {{cnt::lateNoOutcome}} with a verdict but no recorded correction, {{cnt::lateSettled}} settled; {{cnt::lateRefuted}} refuted. **A pending record is never cited as established** — not in a base rate, a narrative, a page caption or another claim. A settled one is cited only from a `FORCE_META` run that postdates its correction (this file was generated against run `{{meta::runId}}`); regenerate after the corrections are committed.

{{@pending}}
