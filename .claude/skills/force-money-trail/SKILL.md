---
name: force-money-trail
description: Use when extending the force-finance map — adding or checking a Union defence or police budget line, a state Police-head row, a police strength or per-lakh figure, a cantonment, plant, laboratory or other footprint row, a DAC contract or a DPSU or private vendor award, an electoral bond by a security vendor, a retired officer's board role, a pay or pension term (7th CPC, MSP, Agnipath, OROP), a CAPF attrition or custodial-death rate, a CPPP security-buyer rate, or a court or audit record in Bofors, Tatra, AgustaWestland, Adarsh, Sukna, Rafale or Pegasus — or when choosing an id, a denominator, a control or a source for one.
---

# Force money trail

What the eight-domain `force` fleet (`research/raw/force/*.json`, asOf 2026-10-04, corrected to 2026-10-06, assembled as run `run-122278453551`) and the CPPP security slice (`research/raw/cppp/security.json`) established, so the next pass starts from it. Every figure below names the file it came from; the primary is in that file's `srcs`. Where two files disagree, both are given (§10).

**The one finding that governs everything else: every lens the fleet ran on force money gave the same shape on its declared control. What separates cases is the record — the demand line, the audit paragraph, the court order, the bidder count — and the level the money resolves to. Not the party in office.**

- The defence share of GDP fell under both governments because GDP grew faster: UPA-II "nominal CAGR of the MoD total 11.0% (GDP at current prices grew 15.3% a year)"; NDA "nominal CAGR 8.8% (GDP 10.0%)" (`union-defence.json` symmetryCheck).
- Pensions rose under both: "pensions — 3.47× from actual 2013-14 to 2024-25 against 2.33× for service pay and 2.02× for capital" (`pay-pensions.json`).
- States: "the groups overlap on every measure: per capita ₹912–₹1,478 vs ₹1,012–₹2,615; NHRC cases per lakh police 3.51–21.93 vs 1.64–11.77."; "the outcome series are dominated by reporting practice and small numbers, not by party" (`state-police.json`).
- Vendors: "a few mega-contracts to the platform designer dominate — which is a finding about the lens (concentration by platform design), not about any vendor" (`procurement-industry.json`).
- Footprint: BJP-run large states "114 installations / 984m = 0.12 per million", opposition-run "57 / 415.6m = 0.14 per million" (`footprint.json`).
- Bonds: "Megha Engineering, Mahindra & Mahindra and Cyient: 61.8% of Rs 1,001 cr to the BJP (Megha alone Rs 966 cr, 60.5% BJP), against 47.6% for all donors of Rs 10 cr or more and 46.1% for all matched bonds" (`money-people:c021`, as corrected after the cross-examiner refuted a defence-specific tilt).
- Cases: named cases with a final conviction in the records opened, 0 / 7 (`money-people.json` baseRate 5).

**REQUIRED BACKGROUND:** `cui-bono` (the ledger row), `evidence-tiering` (the tier), `pattern-discipline` (the denominator), `source-retrieval` (before any gap), and the two sibling skills whose form this follows: `energy-money-trail` and `foreign-money-trail`. Shape and invariants: `docs/research/FLEET_CONTRACT.md` — read the **Phase H** section (the three series, exact keys, uniqueness, chunked emission) and the common sections (invariants, tiers, predicates, court rulings). The `security-analyst` agent owns the fleet directory and the slice; the `procurement-analyst` agent shares the slice. Full tables: `references/ledger.md` (counting rules, controls, coverage, base rates, voids, gaps, symmetry checks, disagreements, the refuted and killed register, the audit corrections) and `references/narratives.md` (every narrative with status, strongest case, strongest counter and the cross-examiner's verdict).

**Records audited late (the brief's pending set).** The brief that commissioned this skill listed eleven records as pending cross-examination: `money-people:c095`, `c096`, `c097`, `c098`, `c100`, `c101`, `c102`; `union-defence:c047`; `procurement-industry:c066`; `literature` narratives 15 and 16. Their state when this file was generated: 11 of 11 settled (verdict in AUDIT.json, outcome in RECONCILIATION.json): 10 hold, 1 refuted (`literature:narrative:15` → alleged, correction applied). A record whose state reads *pending* is never cited as established; a settled one is cited only from a `FORCE_META` run that postdates its correction (ledger §12).

## 1. Id conventions and the ids to reuse

Never mint a second node for an entity below. `RECONCILIATION.json → mappings` is the authority on which id won; the raw files were rewritten in place, so no loser survives.

**The `force:` prefix is owned by the force fleet** (`scripts/lib/vocab.mjs`, FLEETS row `key: 'force', dir: 'force', out: 'src/graph/force.generated.ts', kind: 'graph', prefix: 'FORCE', prefixes: ['force']`): an endpoint written `force:` must be defined in a file under `research/raw/force/`. Conventions: forces, agencies and schemes `force:<slug>`; cases `force:case-<slug>`; documents `force:doc-<slug>`; works of the literature `force:lit-<slug>`; state police and prisons `force:<st>-police`, `force:<st>-prisons`; commissionerates `force:<city>-police`; rank classes `force:rank-<slug>`; footprint rows `force:fp-<slug>` (a row id, never an entity).

**The mappings (2026-10-04):**

| loser | survivor | why (RECONCILIATION.json → mappings, verbatim) |
|---|---|---|
| `per:ak-antony` | `per:a-k-antony` | Same person: A. K. Antony, Union Minister of Defence 2006-10-26 to 2014-05-26 (identical office-with-dates in both records). Neither id is in the inventory; the hyphenated-initials form used by union-defence survives (recon notes). Aliases, facts and sources merged into the union-defence record. |
| `per:lk-advani` | `per:l-k-advani` | Same person: L. K. Advani, Union Minister of Home Affairs 1998-03-19 to 2004-05-22 (identical office-with-dates). Neither id is in the inventory; the hyphenated-initials form used by union-home survives (recon notes). |
| `per:p-chidambaram` | `wel:p-chidambaram` | Same person: P. Chidambaram, Union Home Minister 2008-11-30 to 2012-07-31 (the ngo fleet's wel:p-chidambaram record carries the same office and dates; money-people already used the wel: id). Inventory id survives; the force record is dropped and the id is referenced, not redefined. |
| `force:state-bihar` | `energy:govt-of-bihar` | Same body: the Government of Bihar (st br, ty state). The inventory has energy:govt-of-bihar (energy, ngo and finance fleets use it); the inventory id survives. state-police keeps its record under the energy id because it carries a force-specific fact. No other force:state-* id exists in the fleet (the other states are already energy:state-* / fin:state-* references). |
| `force:state-gujarat` | `energy:govt-of-gujarat` | Same body: the Government of Gujarat (st gj, ty state). The inventory has energy:govt-of-gujarat; the inventory id survives; state-police keeps its record under the energy id for its force-specific fact. |
| `force:intelligence-bureau` | `ngo:intelligence-bureau` | Same agency: the Intelligence Bureau (alias IB; reports to the Union Home Ministry). The inventory id ngo:intelligence-bureau survives (the task's rule: inventory id first); the union-home record keeps the force facts under the ngo id with the ngo fleet's ty/fam/st so the two fleets' copies agree. The critic's reverse direction (ngo → force) was not applied — see criticItems. |
| `force:bhel` | `co:bhel` | Same legal entity: Bharat Heavy Electricals Limited, NSE: BHEL (the ticker in the force record) — the inventory's co:bhel (energy and finance fleets). Identified by exchange listing, not by name; inventory id survives. |

**Ids to reuse.**

| role | ids |
|---|---|
| ministries | `min:ministry-of-defence`, `min:ministry-of-home-affairs`, `min:ministry-of-ports-shipping-and-waterways` (owner of Cochin Shipyard — not MoD, not a DPSU), `min:ministry-of-finance`, `min:ministry-of-personnel-public-grievances-and-pensions`, `fin:department-of-telecommunications` |
| services and defence bodies | `force:indian-army`, `force:indian-navy`, `force:indian-air-force`, `force:indian-coast-guard`, `force:integrated-defence-staff`, `force:drdo`, `force:bro`, `force:dgde`, `force:ddp`, `force:dac`, `force:defence-pensions` (the demand) ≠ `force:defence-pensioners` (the people) |
| DPSUs (listed keep `co:`) | `co:hindustan-aeronautics`, `co:bharat-electronics`, `co:bharat-dynamics`, `co:mazagon-dock`, `co:garden-reach-shipbuilders`, `co:cochin-shipyard`, `co:beml`, `co:bhel`; `force:goa-shipyard`, `force:hindustan-shipyard`, `force:midhani`; the ex-OFB seven `force:munitions-india`, `force:armoured-vehicles-nigam`, `force:advanced-weapons-equipment-india`, `force:troop-comforts`, `force:yantra-india`, `force:india-optel`, `force:gliders-india`; `force:ofb` (ceased 2021-10-01) and `force:directorate-of-ordnance` |
| private and foreign vendors | `co:larsen-toubro`, `co:bharat-forge`, `co:solar-industries` ≠ `force:economic-explosives`, `co:mahindra-mahindra` ≠ `force:mahindra-defence-systems`, `co:astra-microwave`, `co:zen-technologies`, `energy:mtar`, `force:data-patterns`, `force:paras-defence`, `force:tata-advanced-systems` (≠ `grp:tata`), `force:adani-defence` ≠ `force:plr-systems` ≠ `co:adani-enterprises`, `force:brahmos-aerospace`, `force:chowgule-and-company`, `force:icomm-tele`, `force:force-motors`, `force:dassault-aviation` ≠ `force:dral`, `force:reliance-naval-engineering`, `energy:reliance-infrastructure`, `energy:reliance-adag` ≠ `co:reliance-industries`, `force:airbus-defence-and-space`, `force:nso-group` |
| Union police and agencies | `force:crpf`, `force:bsf`, `force:cisf`, `force:itbp`, `force:ssb`, `force:assam-rifles`, `force:nsg`; `force:capf` (the seven taken together — a class for totals); `force:central-police-organisations` (a budget line, not the CAPFs; the NIA and the NCB are not itemised outside it after FY2015-16 — `union-home.json` void 1); `ngo:intelligence-bureau`; `force:natgrid`; `force:spg`; `force:delhi-police`; `force:jk-police`; `force:cbi`, `force:enforcement-directorate` (never the Atlas composite `agencies`); `force:nia`, `force:ncb`, `force:bprd`, `force:ncrb`, `force:dfss`, `force:svpnpa`, `force:nepa`, `force:cabinet-secretariat` |
| schemes, rules, procedures | `force:mpf-scheme`, `force:sre-scheme`, `force:safe-city-scheme`, `force:nirbhaya-fund`, `force:agnipath` ≠ `force:agniveers`, `force:orop`, `force:7th-cpc`, `force:8th-cpc`, `force:rank-sepoy-constable` … `force:rank-brigadier-dig`, `force:cooling-off-rule`, `force:ccs-pension-rule-10` (1972 Rules) superseded by `force:ccs-pension-2021-rule-9` (`money-people:c095`, audited late), `force:dap-2020`, `force:defence-offset-guidelines`, `force:cantonments-act-2006`, `force:law-ofb-corporatisation-2021`, `force:pmla-2002`, `force:art-239aa` |
| cases and their parties | `force:case-bofors`, `force:case-rafale`, `force:case-agustawestland`, `force:case-tatra`, `force:case-adarsh`, `force:case-sukna`, `force:case-pegasus` — each ≠ its company or society (`force:ab-bofors`, `force:agustawestland`, `force:adarsh-society`, `force:nso-group`); `force:doc-rafale-iga-2016` ≠ `force:case-rafale`; `force:pegasus-petitioners-2021` (the asserting class) |
| courts, auditors, committees | Atlas `sc`, `delhi-hc`, `bombay-hc`, `cag`; `force:delhi-district-courts` (not `delhi-hc`), `force:italian-courts`, `force:armed-forces-tribunal`, `force:sc-pegasus-committee` (not `sc`); `force:doc-cag-3-2019`, `force:doc-cag-adarsh-2011`, `force:doc-cag-ammo-2017`, `force:lit-cag-report-4-2007` — four reports, four nodes |
| persons (public rank only) | `per:a-k-antony`, `per:l-k-advani`, `wel:p-chidambaram`, `pol:rajnath-singh`, `pol:nirmala-sitharaman`, `pol:amit-shah`, `wel:arun-jaitley`, `per:george-fernandes`, `per:jaswant-singh`, `per:pranab-mukherjee`, `per:manohar-parrikar`, `per:shivraj-patil`, `per:sushilkumar-shinde`, `pol:ashwini-vaishnaw`; retired officers on boards `per:avinash-chander` (DG DRDO), `per:fali-major` (Air Chief); `per:sp-tyagi` (Air Chief) |
| parties and states | `bjp`, `party:inc`, `party:brs`, `party:dmk`, `party:tdp`, `party:ysrcp`, `party:tmc`, `party:jds` ≠ `party:jdu`, `force:party-janasena`; `energy:govt-of-bihar`, `energy:govt-of-gujarat`, every other state as `energy:state-*` or `fin:state-*`; a state's police (`force:br-police`) is never its government |
| bonds and classes | `ebscheme`, `meil`, `co:cyient`, `force:doc-sbi-eb-disclosure-2024`; `force:retired-armed-forces-officers`, `force:retired-group-a-civil-servants`, `force:retired-intel-security-officers`, `force:iesm` |

The full refused-merge table (34 rows) is in `references/ledger.md` §4.

## 2. Predicates and the fields that carry the meaning

- **`award`** buyer → vendor, only where PIB (or the vendor's exchange filing) names the vendor and the ₹ crore: `a` ₹ crore, `from` the signing date, `d` the category and the AoN date. A DAC Acceptance of Necessity is never an award ("DAC Acceptance-of-Necessity approvals name no vendor and no contract value per item; vendor not named.", `procurement-industry.json` void 0). Joint contracts without a split stay joint; no per-vendor share is invented.
- **`own`** state → DPSU (% and quarter in `d`). The owner is the one the filing names: Cochin Shipyard is held by the President of India through MoPSW (`union-defence:c016`, re-pointed on audit).
- **`role`** person → body, dated from PIB or the gazette; for a retired officer `d` names the retirement date and the cooling-off rule node.
- **`law`** rule → the class governed (Agnipath → `force:agniveers`; OROP → pensioners; the cooling-off rule → retired officers). **`enforce`** court or auditor → subject; a ruling's `d` begins `Judicial ruling on <claim id>: `. **`bond`** vendor → party. **`contra`** answers `claim:<id>`. **`analytic`** for every comparison computed, with `innocentReading`.
- **No money predicate where no money moved.** `money-people:c071` drew AgustaWestland paying the Ministry of Defence (`direct`); the audit re-pointed it to `force:cbi` → `force:case-agustawestland` as `enforce`. Predicate fixes: `literature:c008` enforce → law; `money-people:c055` direct → enforce; `money-people:c071` direct → enforce; `money-people:c086` sector → enforce.
- **No ₹ on an allegation or a joint analytic edge.** `a` was removed from `money-people:c055`, `money-people:c075` (an unattributed alleged figure) and `procurement-industry:c060` (a joint total that would be summed as a flow) — `RECONCILIATION.json → otherFixes`.

**The three tabular series** (`scripts/lib/vocab.mjs`; spec §4.1; contract Phase H). Exact keys, in this order:

| series | keys | unique on | rows in the raw files |
|---|---|---|---|
| `budgets[]` | `BUDGET_KEYS = ['payer', 'body', 'head', 'component', 'fy', 'stage', 'cr', 'note', 'srcs']` | (payer, body, head, component, fy, stage) | 4,097 (union-defence 1,151 + union-home 2,742 + state-police 187 + pay-pensions 17) |
| `strength[]` | `STRENGTH_KEYS = ['st', 'body', 'year', 'sanctioned', 'actual', 'perLakh', 'womenPct', 'note', 'srcs']` | (body, year) | 142 (union-home 52 + state-police 90) |
| `footprint[]` | `FOOTPRINT_KEYS = ['id', 'kind', 'label', 'body', 'st', 'city', 'since', 'note', 'srcs']` | `id` | 228 (union-home 3 + state-police 17 + procurement-industry 24 + footprint 184) |

Rules the validator enforces and the fleet learned: `component` ∈ `BUDGET_COMPONENTS = ['total', 'revenue', 'capital', 'pension', 'pay', 'grant-to-states', 'other']`; `stage` ∈ BE, RE, actual; `fy` an Indian financial-year label; `cr` a number ≥ 0, where 0 is a figure and a line the document does not print is a void, not a row; `srcs` mandatory; a secondary transcription begins `note` with `reported:`; `body` resolves to an entity (a `force:` body defined in this fleet); a footprint row carries `st` and `city` or is not a row; `kind` ∈ `FOOTPRINT_KINDS = ['cantonment', 'dpsu-plant', 'drdo-lab', 'command-hq', 'capf-hq', 'commissionerate', 'prison', 'forensic-lab', 'training', 'ordnance', 'other']`; a strength row needs `sanctioned` or `actual`. No row names a person. No row carries a city budget the payer does not publish. `FORCE_META.series` reads budgets 4,097, strength 142, footprint 228.

## 3. Denominators — the ones that proved to matter

| question | denominator and figure | file |
|---|---|---|
| is defence spending falling? | four MoD demands over GDP at current prices: 3.32% (BE 2000-01) → 2.00% (BE 2026-27). **The share fell because the denominator grew faster** (UPA-II and NDA CAGRs in the opening). SIPRI's definition adds the paramilitary forces: India 2.22% of GDP in 2024 (v1.2), China 1.66%, Pakistan 2.73%, UK 2.44%, US 3.43% | `union-defence.json` baseRates 0, 102, 108, 112, 116, 124, 120 |
| how much is pensions? | Defence Pensions over the four-demand total: 16.9% (BE 2000-01), 17.6% (BE 2013-14), 24.2% (BE 2016-17, the 7th CPC), 28.4% (BE 2020-21, the peak), 23.6% (BE 2025-26), 21.8% (BE 2026-27). Per pensioner: 1,57,653.65 / 32,94,181 ₹ crore / pensioners, actual 2024-25. OROP 2015 recurring cost 7,123.38 / 1,57,653.65 and the 2022 revision 8,450 / 1,57,653.65 (₹ crore over Defence Pensions actual 2024-25) | `union-defence.json` baseRates 1, 48, 62, 80, 100, 104; `pay-pensions.json` 6, 9, 10 |
| pay against capital | service pay ÷ Capital Outlay, actuals: "service pay ÷ Capital Outlay actual was 0.88 (2009-10, 6th CPC arrears), 0.70, 0.72, 0.79 and 0.78 (2010-11 to 2013-14) under UPA-II (Antony) and 1.04, 1.01, 1.13 (2015-16 to 2017-18) and 0.90 (2024-25; 0.94 with the Agnipath line) under NDA (Rajnath Singh from 2019), with BE 2026-27 at 0.76 with Agnipath (0.68 without, not comparable to actuals): the ratio is not flat but a hump that rises with each pay commission and falls as capital catches up, under both governments" | `pay-pensions.json` symmetryCheck |
| share of Union expenditure | defence 17.57% (actual 2009-10), 13.67% (actual 2024-25), 14.67% (BE 2026-27); the Police demand 1,46,634.82 / 46,52,867, the seven CAPF lines 1,04,653.24 / 46,52,867, the ED 516.09 / 46,52,867, the CBI 996.58 / 46,52,867 (₹ crore, actual 2024-25) | `union-defence.json` 29, 95, 103; `union-home.json` 0–3 |
| did the ED "explode"? | ED actual 516.09 / 60.57 (2024-25 / 2013-14) against Union expenditure 46,52,867 / 15,59,447 and ECIRs 775 / 185; "the ED's increase over eleven years is ₹455.52 crore, 0.0098% of FY2024-25 expenditure" | `union-home.json` baseRates 4, 5, 7; narrative 0 |
| PMLA outcomes — two families | convictions over cases decided on merits 53 / 56; over ECIRs recorded 53 / 6,444. Never print one without the other | `union-home.json` 12, 13 |
| state police money | MH 2055 over states' total revenue expenditure, 2023-24 Accounts: 1,87,826.69 / 40,23,677.09 (4.67%). Per capita on a projected population, never the 2011 Census base (§10) | `state-police.json` baseRate 0 |
| per lakh | police per lakh, actual / sanctioned, 01.01.2024: 155 / 197; against the "UN" 222: 155 / 222, a benchmark whose UN provenance was never found (`literature.json` void 1); CAPF actual per lakh 9,52,764 / 14,007.4 (lakh population); cantonments per million 61 / 1,423.435 | `state-police.json` 1; `literature.json` 0; `union-home.json` 9; `footprint.json` 19 |
| outcome rates | NHRC police-custody deaths over actual police, FY2024-25: 140 / 21,00,961; NCRB custody deaths over cases against police, 2024: 65 / 6,269; NHRC-recommended disciplinary action over deaths, 2021-26: 1 / 806; CAPF suicides over actual strength, 2024 (partial year): 134 / 9,50,118, against a general rate 12.4 / 100 that is not age- or sex-matched (AUDIT `pay-pensions:c023`) | `state-police.json` 2, 3, 11; `pay-pensions.json` 0, 2 |
| vendor shares | PIB-named sample (not the universe): DPSUs 3,14,334.23 / 4,07,144.93, private Indian 35,542.09 / 4,07,144.93, Adani-linked (joint, counted wholly) 2,770 / 4,07,144.93, L&T sole-vendor 24,984.65 / 4,07,144.93. The universe: domestic share of contracts signed FY2024-25 1,68,922 / 2,09,050 by value, 177 / 193 by count. Private share of production FY2023-24 26,675 / 1,27,434 | `procurement-industry.json` 36–39, 14, 15, 4 |
| bonds | donors giving only to the BJP 372 / 1,280; donors of ₹10 crore or more, BJP value share 4,858.17 / 10,216.24; defence-linked donors giving only to the BJP 2 / 3 against 86 / 224 among donors of ₹10 crore or more | `money-people.json` 0, 1, 3, 6 |
| **the CPPP slice, with and without the works class** | single-bidder rate over awards with 1–1,000 bids: whole slice 3.17% (n 3,65,600); **without works (MES and BRO) 12.2%** (n 85,108); whole file 11.22%; rest of file 12.33%. "E-IN-C BRANCH - MILITARY ENGINEER SERVICES (works) alone is 74.41% of the slice's 411,943 award decisions". By class: works 0.42%, stores 12.87%, research 18.49%, dpsu 11.33%, capf 9.53%, intelligence-investigation 10.11% (n 178), state-police 8.11% (same portal 7.59%), other-security 37.83%; central-portal comparator 17.67% | `security.json` → `rates`, `headline`, `readMeFirst` |

Rules: say the stage (BE, RE, actual) and the FY; say which GDP series (the file uses the 2011-12 series and the Budget projection for 2026-27 — `union-defence.json` gap 6); write `null` with the reason when the denominator is unknown (`procurement-industry.json` baseRate 7 prints a `null` numerator because PIB did not print it). A rate of 100% (3 of 3, 2 of 2) is a property of the class, not of the member.

## 4. Controls — mandatory, and the trap each set

| control | what it produced | the traps the AUDIT found |
|---|---|---|
| **UPA-II beside NDA on the same Union lines** | defence: the share fell under both, the pension share rose under both (§3); home: "the lines that grew faster under NDA than under UPA-II are the ED, the CBI and the IB; the forces (CAPFs, Delhi Police) did not" (`union-home.json`) | an arrears year picked as the UPA point — "flat across UPA-II and NDA" held only for four chosen points (`pay-pensions:c026`); a base year transcribed from a revenue sub-head instead of the force total (`union-home:c030`, the Assam Rifles FY2009-10 line); the one-year structure break of 2016-17, when Ordnance Factories and R&D moved into the MoD (Misc) demand (`union-defence.json` symmetryCheck); minister dates contradicted by PIB (`union-defence:c002`, `c004`); no ED, CBI or NIA budget attributed to a Home Minister — they are not MHA bodies |
| **BJP-run beside opposition-run states**, party as text | medians overlap; restricted to large states the ranges overlap on every measure (see the opening) | a party value from the wrong year — "the ₹1,727 and 20.7% are Chhattisgarh's values from a year under the outgoing INC government"; a series that does not measure the thing (`state-police` narrative 0 used custody deaths for encounter killings when the NHRC encounter table existed); "Gujarat tops both series" was false for NHRC — level with Maharashtra (`state-police:c027`); a per-capita figure on the 2011 Census base |
| **the private vendor beside the competing DPSU** | "Private share of production was 19-21% for five years (2019-24) then 22-24%; the private share of exports fell from 72% to 45% as DPSU exports rose from ₹5,874 crore to ₹21,071 crore" (`procurement-industry.json`) | PIB prints joint totals and no bid counts, so no head-to-head can be scored; a hand-picked PIB sample labelled as all awards (`procurement-industry:c063`); "the only award to an Adani-linked vendor" was false — PIB 2026-07-22 names a sole-vendor DcPP contract (`procurement-industry` narrative 0; the claim `procurement-industry:c066`: late verdict: holds, recommends documented; correction applied); a subsidiary is not its parent (Mahindra Defence Systems won the order, Mahindra & Mahindra bought the bonds) |
| **Bofors beside Rafale; AgustaWestland beside Tatra** (Sukna beside Pegasus; Adarsh unpaired) | no final conviction in any of the seven (0 / 7); "FIRs or disciplinary proceedings were opened by the government of the day in 4 of 4 UPA-era cases and 0 of 2 NDA-era cases, a measure of who held the investigating agencies as much as of conduct" (`money-people.json`) | "identical fields" that were not identical — Bofors had documented payments and an Indian prosecution, Rafale a process anomaly (`literature:c026`); the first Rafale allegation dated 2018 when the source says 2016 or 2017 (`money-people:c091`); Tatra keyed "UPA era" when purchases ran from 1986 across governments (`money-people:c092`, `c093`) |
| **bonds to the BJP beside bonds to every other party; defence donors beside donors of the same size** | the lens gives an alarm-sized picture for every party's donors (`money-people.json` symmetryCheck) | the defence-linked pool is one donor with no MoD award ("Megha is 96.5% of the pool"); the like-for-like comparator dissolves the tilt (`money-people:c021`); the date test was run on half the evidence (`money-people:c022`) |
| **retired officers: the vendor board beside a control board** | 0 / 2 documented roles began inside the cooling-off window — "documented roles located (a DG DRDO and an Air Chief); not a sample" | "absence of evidence" asserted when every director's biography was one click away (`money-people:c031`) |
| **installations per million residents by party group** | close, and dominated by colonial-era cantonments and a few research cities (`footprint.json` symmetryCheck) | the rate counts only rows a primary list placed — a coverage artefact until BSF, HAL, BEL, state FSL and prison rows exist (`footprint.json` gap 8) |

## 5. Symmetry — which lenses over-fire

| lens | result on the control | verdict |
|---|---|---|
| "defence spending was cut under X" | the GDP share fell under UPA-II and NDA; the rupee total grew under both | **over-fires** — it detects a fast-growing denominator |
| "pensions are eating the budget" | the share rose under both, with each pay commission and OROP; average shares UPA-II "average shares revenue 48.6% / capital 33.8% / pensions 15.6% / MoD civil 2.1%", NDA "average shares revenue 45.3% / capital 26.6% / pensions 23.3% / civil 4.7%" | **over-fires** on cause; the descriptive share is true, "leaving nothing for modernisation" is contradicted (literature narrative 6) |
| "the ED/CBI budget exploded under the NDA" | faster growth under NDA from small bases; the ED line was already "BE 2004-05 ₹18.40 crore to BE 2013-14 ₹70.86 crore, x3.85"; the PMLA conviction lens gives the same or a lower ratio on the UPA-era base | **partly discriminates** — a real acceleration on three agency lines, not on the forces (`union-home.json`) |
| "BJP-run (or opposition-run) states police worse" | overlapping ranges; zero returns across parties | **over-fires** — reporting practice and small numbers |
| "vendor X is being handed defence" | Adani-linked: "₹2,770 crore jointly with Bharat Forge is 0.68% of this file's ₹4.07 lakh crore sample of 45 PIB-named award claims, calendar 2021-25"; the DPSU and private lenses give the same concentration | **over-fires** — it detects platform design |
| "vendors bought bonds to win orders" | the one dated test points the wrong way (the Mahindra order precedes the bond); non-defence contractors show the same or a higher BJP share | **over-fires** |
| "retired chiefs get seats as a reward" | 0 / 2 roles began inside the window; no census of chiefs and boards exists | **not testable** on the record reachable |
| "installations follow the party" | 0.12 against 0.14 per million | **fails** |
| "the cases show party X's corruption" | 0 / 7 final convictions; FIR counts measure who held the agencies | **over-fires** |
| "Delhi Police is a Union force used against the Delhi government" | "its cost grew roughly in line with the Police demand (nominal actuals): 11.7% against 11.9% a year in UPA-II (FY2009-10 to FY2013-14) and 10.1% against 10.1% over FY2014-15 to FY2024-25 (10.1% against 10.3% measured from the last UPA actual, FY2013-14)" | the money lens cannot test use; only dated court records would |
| **where the record is genuinely two-sided** | Pegasus: "Devices examined by the SC Pegasus committee that carried malware / that were conclusively Pegasus" 5 / 29, the committee's report sealed and the Union's yes/no never on the record (`literature.json` void 9); the Rafale offset partner, with the French judicial inquiry unresolved; AgustaWestland, with Italian acquittals beside an Indian chargesheet; the stores and other-security classes of the CPPP slice (12.87% and 37.83% single-bid, beside proprietary spares and a residual of unclassified buyers) | **contested** — attention belongs here |

## 6. Voids — the highest-value open questions

A void is a finding (evidence-tiering, the absence rule). Where the record would live:

| void | where it would live | file |
|---|---|---|
| **Tata, L&T, Bharat Forge/Kalyani, Solar, Zen, Hikvision/Prama, Adani, Dassault and every listed DPSU are absent from the bond-donor list.** This is a void, not a finding: "(name-matching across 1,280 donor names; subsidiaries under other names are not excluded)"; absence is not innocence and presence is not a quid pro quo | the SBI disclosure via ADR/MyNeta (ECI 406); subsidiaries under other names | money-people void 0 |
| **BPR&D is unreachable** — the only national table of state and commissionerate strength and police expenditure; every strength row is a transcription and 135 of 142 begin `reported:` | bprd.nic.in / bprd.gov.in (000), Parliament answers mirroring DoPO tables, IJR indicator files | state-police void 0; literature void 0; footprint void 0 |
| **CAG is unreachable** (every host 000): only Report No. 3 of 2019 was read in full, through the CHRI mirror; the 2007 single-vendor finding is carried via ORF; the state MPF audits were surfaced by search and not read | cag.gov.in; PRS summaries; elibrary.sansad.in (reports laid in Parliament) | money-people void 4; literature void 2 |
| R&AW is not itemised anywhere in the Expenditure Budget | not published | union-home void 0 |
| NIA and NCB not itemised after FY2015-16 (inside Central Police Organisations) | Detailed Demands for Grants | union-home void 1 |
| No city police budget except Delhi | not published; the state head is the finest resolution | union-home void 2; state-police void 1 |
| DAC AoNs name no vendor; PIB joint totals have no per-vendor split; FY2024-25 domestic contract value is not split DPSU/private | MoD (not published); DPSU and vendor exchange filings | procurement-industry voids 0, 1, 3 |
| The Rafale price: redacted in the CAG report, sealed before the SC | not public | procurement-industry void 5; money-people void 5 |
| The Pegasus committee report is sealed; no Indian purchase record exists in the sources | the SC | money-people void 6; literature void 9 |
| No published Agnipath saving | an MoD/DMA actuarial projection | pay-pensions void 1 |
| The armed forces cooling-off rule's text and the date it fell to one year | Pension Regulations for the Army 2008 (desw.gov.in TLS expired) | money-people void 2 |
| A matched list of MoD awards by vendor and date, for bond buyers and non-buyers | PIB, MoD annual reports | money-people void 9 |
| Defence money by state: none — the demands are by service, object and category, never by place | the footprint is the only geography | union-defence void 0 |
| Prison locations; state FSLs; command HQ cities; DGDE land by state | NCRB (counts only); DFSS (TLS expired); service portals (000); DGDE AR (image PDF) | footprint voids 1, 2, 3, 6 |

The full list (67 voids, 112 gaps) is in `references/ledger.md` §6–7.

## 7. Sources — what opened and what did not (2026-10-04 → 06)

**Routes that worked.**
- **indiabudget.gov.in Notes on Demands for Grants** (PDF, text-extractable), three path families: the current year at `/doc/eb/sbeNN.pdf`; `/budgetYYYY-YY/doc/eb/sbeNN.pdf`; the archive `/budget_archive/ubYYYY-YY/eb/sbeNN.pdf` (the fleet read from `ub2000-01`; the archive index lists years back to 1996-97). Demand numbers move every few years — read the title on page 1, never the number. Budget at a Glance for Union totals; the Economic Survey Statistical Appendix for GDP.
- **MHA**: annual reports (`/sites/default/files/AREnglish_24032026.pdf`) and the Parliament-answer mirror `mha.gov.in/MHA1/Par2017/pdfs/parYYYY-pdfs/<House><ddmmyyyy>/<n>.pdf` (the old `commoncontent` path is 404).
- **PIB with curl** (WebFetch gets 403): DAC approvals, contracts with vendor names, Agnipath, OROP, production and exports.
- **ddpmod.gov.in** annual reports (DDP class tables of production, exports and licences); **PRS** Demand for Grants analyses and state budget analyses (`reported:`); **SIPRI** milex workbook v1.2 and fact sheets (the milex UI is 000); **World Bank WDI** `MS.MIL.XPND.GD.ZS`.
- **RBI State Finances** Appendix II HTML tables with ≥ 6 s spacing and a cookie jar (rbidocs downloads 000 or a bot-challenge page; WAF 403/418 on bursts).
- **NCRB** PDFs by direct path (the year listing is client-rendered): Crime in India 2024 Vol. III, Prison Statistics India 2023; **IJR** PDFs and the indicator XLSX; **NHRC** series via MHA answers.
- **indiankanoon.org** for every court record (the SC judgment hosts are 000); **myneta.info / ADR** for bonds (eci.gov.in 406); **NSE** shareholding XBRL (the BSE API returned Access Denied); **Tofler** with curl; **sansad.in** `getFile` committee PDFs and elibrary DSpace bitstreams (flaky 500); **DGDE** `/en/`, DRDO cluster pages, CRPF/CISF menus; the **CHRI mirror** of CAG Report 3 of 2019; the **UP budget portal** Grant 26 PDFs by direct path.

**Blocked or unusable:** BPR&D (000); CAG, every host (000); mod.gov.in, desw.gov.in, indianarmy, indiannavy, mes, joinindianarmy (000); BSF (403); ITBP, SSB, Assam Rifles, NIA, NCB, CBI, DoPT (000); DGFSCDHG and DFSS (TLS — never disable verification); **openbudgetsindia.org is dead** (301 to an unrelated mutual-fund domain; never cite it); eci.gov.in (406); main.sci.gov.in (000); state finance portals (Maharashtra flaky; Bihar, West Bengal, Karnataka, Tamil Nadu 000); city police sites (Bengaluru, Chennai, Kolkata, Hyderabad 000; Ahmedabad's old domain serves spam); GeM, MCA, the data.gov.in API, web.archive.org, loksabhadocs, eparlib (000 or 403); defproc.gov.in (CAPTCHA); the sansad.in RS APIs (504/400) and an LS API that ignores its filters; the SIPRI arms-transfer backend and the DDP dashboard export endpoints (401); indiancoastguard.gov.in (000). Sources: `docs/superpowers/specs/2026-10-04-force-finance-design.md` §2 and the recon digest `scratchpad/force/recon.json`.

## 8. The narratives ladder (condensed — every entry, with the strongest case and counter, in `references/narratives.md`)

Status is the file's after the 2026-10-06 correction pass; the verdict is the cross-examiner's on the earlier text.

| subject | narrative | file · # | status | cross-examiner |
|---|---|---|---|---|
| budgets | India under-spends on defence | union-defence · 0 | contested | refuted; recommends analytic |
| | India under-spends; it should spend 3% of GDP | literature · 5 | contested | holds; recommends analytic |
| | Pensions are eating the defence budget | union-defence · 1 | contested | holds; recommends analytic |
| | Pensions are eating the defence budget | pay-pensions · 3 | contested | holds; recommends analytic |
| | …eaten by pensions and pay, leaving nothing for modernisation | literature · 6 | contested | refuted; recommends reported |
| | Capital procurement has collapsed | union-defence · 2 | contested | refuted; recommends analytic |
| home | The ED budget exploded under the NDA | union-home · 0 | contested | holds; recommends analytic |
| | Delhi Police is a Union force used against the Delhi government | union-home · 1 | contested | holds; recommends analytic |
| | The CAPFs are being used as a parallel army | union-home · 2 | contested | holds; recommends analytic |
| states | UP encounters are state policy | state-police · 0 | contested | refuted; recommends analytic |
| | Kerala has the best-funded police | state-police · 1 | unsupported | holds; recommends analytic |
| | Fill the vacancies and outcomes will follow | state-police · 2 | contested | refuted; recommends analytic |
| | India is dangerously under-policed (the "UN 222") | literature · 8 | contested | holds; recommends analytic |
| | No state fully complies with Prakash Singh | literature · 9 | well-supported | refuted; recommends reported |
| | Custodial torture is routine and the police justify it | literature · 10 | contested | refuted; recommends reported |
| | Many police personnel say they justify third-degree methods | literature · 16 | well-supported | late verdict: holds, recommends reported; correction applied |
| industry | Adani is being handed defence | procurement-industry · 0 | unsupported | refuted; recommends analytic |
| | Make in India has not reduced imports | procurement-industry · 2 | contested | holds; recommends analytic |
| | India is the largest importer, so Make in India failed | literature · 12 | contested | holds; recommends analytic |
| | DPSUs are protected from competition | procurement-industry · 3 | contested | holds; recommends analytic |
| | Procurement is rigged through single-vendor tenders | literature · 11 | contested | holds; recommends analytic |
| | Cantonments are abolished to hand land to builders | footprint · 0 | speculative | refuted; recommends analytic |
| people | Vendors bought bonds to win orders | money-people · 0 | unsupported | refuted; recommends analytic |
| | Retired chiefs get board seats as reward or for access | money-people · 1 | unsupported | refuted; recommends analytic |
| | Defence scandals were worse under UPA (or NDA) | money-people · 9 | unsupported | holds; recommends analytic |
| pay | Agnipath will hollow out the army | pay-pensions · 0 | contested | holds; recommends analytic |
| | Agnipath saves ₹X crore | pay-pensions · 1 | speculative | holds; recommends documented |
| | Agnipath is cost-cutting disguised as reform | literature · 7 | contested | refuted; recommends analytic |
| | OROP as implemented is a betrayal | pay-pensions · 2 | contested | holds; recommends documented |
| | Suicides in the paramilitary forces are rising | pay-pensions · 4 | contested | holds; recommends analytic |
| cases | Bofors was a bribery scandal the system covered up | money-people · 2 | contested | holds; recommends analytic |
| | Bofors was buried by Congress governments | literature · 2 | contested | holds; recommends alleged |
| | Rafale was overpriced, with a crony offset | money-people · 3 | contested | holds; recommends alleged |
| | Rafale was a scam: the price was inflated | literature · 0 | unsupported | refuted; recommends analytic |
| | The MoD objected to the PMO's "parallel parleys" | literature · 1 | contested | refuted; recommends alleged |
| | The Rafale offset was steered to Reliance | procurement-industry · 1 | contested | holds; recommends alleged |
| | Reliance was chosen at the Indian government's behest | literature · 15 | contested | late verdict: refuted, recommends alleged; correction applied |
| | AgustaWestland paid bribes to Indian officials | money-people · 4 | contested | holds; recommends alleged |
| | AgustaWestland bribes reached the top of the UPA | literature · 4 | contested | holds; recommends alleged |
| | Tatra/BEML: alleged bribes; CBI sought closure | money-people · 5 | contested | holds; recommends alleged |
| | Tatra trucks at allegedly inflated prices | literature · 14 | contested | refuted; recommends alleged |
| | Adarsh: CAG, HC demolition, SC halt | money-people · 6 | contested | refuted; recommends reported |
| | Adarsh: flats irregularly obtained; land "for Kargil widows" | literature · 13 | contested | holds; recommends analytic |
| | The Sukna generals were guilty of corruption | money-people · 7 | unsupported | holds; recommends documented |
| | The Government used Pegasus on Indian citizens | money-people · 8 | contested | holds; recommends alleged |
| | Pegasus was used on the opposition, journalists and SC staff | literature · 3 | contested | holds; recommends alleged |

Counts: 46 narratives — contested 35, unsupported 7, speculative 2, well-supported 2; none established, none debunked. The cross-examiner refuted the earlier text of 47 of 214 records in all.

## 9. Failure modes seen in this fleet — check before you write

The full register, grouped by mode with every id, is `references/ledger.md` §10.

- [ ] **Duplicates across files.** 22 claims are killed: 21 duplicates — "the 16 minister-tenure edges in money-people" that `union-defence`/`union-home` already held, `pay-pensions:c027`, and `literature:c005`, `c009`, `c014`, `c028` — and `footprint:c014`, killed on its own `killIf` (an incomplete training-institution menu). The minister roster belongs to `union-defence` and `union-home`. A killed copy is held, not deleted; its sources fold into the survivor; edit the survivor, never the held copy (14 money-people corrections were refused for exactly this reason).
- [ ] **A negative crore.** `cr` must be ≥ 0. The Ordnance Factories' negative nets are kept as a void with every value listed (`union-defence.json` void 3), never forced into a row, never zeroed.
- [ ] **One literal too large for TypeScript.** "TS2590 — seen at 4,096 budgets rows": the assembler emits a series above `CHUNK_ROWS = 1000` rows as chunks the export spreads. Grep the chunks; never hand-join or hand-edit the module.
- [ ] **Editing an old fact instead of superseding it.** Add the new claim and set `supersededBy` on the old: `pay-pensions:c014` → `c015` (OROP 2015 order → the 2022 revision); `union-home:c026` → `c027`; `procurement-industry:c050` → `c051` and `c052` → `c053` (DRAL before and after the 2025 transfer); `union-defence:c016` → `c047` and `money-people:c024` → `c095` (both new claims audited late: late verdict: holds, recommends documented; correction applied; late verdict: holds, recommends documented; correction applied). The audit's reason for the last: an undated 1972 rule number presented a superseded rule as current law.
- [ ] **A city budget that does not exist.** Only Delhi Police has a line, and it is a Union demand. Every other commissionerate's money is inside its state's MH 2055 — print the state, the head and the figure, never a city number (`state-police.json` void 1). GNCTD's own residual police line is not a row (void 6).
- [ ] **Arithmetic on two bases** — a vacancy ratio read as a fill ratio (`literature:c021`), a numerator from four major heads over one (`pay-pensions:c022`), a share on the wrong basis (`pay-pensions:c013`), a base year from a sub-head (`union-home:c030`), office counts in a numerator but not the denominator (`footprint:c012`).
- [ ] **A sample called the universe; "only", "first", "all"** (`procurement-industry:c063`, `procurement-industry` narrative 0, `footprint:c014`).
- [ ] **The date test** — PIB dates over Wikipedia's (`union-defence:c002`, `c004`); board terms from the annual report (`money-people:c029`); the SC's 2016-07-22 possession order, not a "2018 stay" (`literature:c015`).
- [ ] **The wrong node** — MoD as owner of an MoPSW company (`union-defence:c016`); MHA for the IT Minister's affidavit (`literature:c028`); a payee invented (`money-people:c071`); a scheme answering its own terms (`pay-pensions:c011`, re-pointed to the retired-officer class).
- [ ] **The source does not say it** — figures in the wrong minister's mouth (`literature:c007`); the lowest figure without its qualifier (`literature:c023`); a ₹ value Dassault's statement does not contain (`money-people:c062`); a US$ value the rupee record contradicts (`money-people:c053`); "radars" for fuzes (`procurement-industry:c062`).
- [ ] **Facts joined into a motive** — "to win orders", "as a reward", "land grab", "disguised", "routine", "a middleman protected by BEML" (money-people narratives 0, 1, 6; literature narratives 7, 10, 14). Each fact keeps its tier; the join is analytic or a narrative.
- [ ] **A ladder word as a tier** ("unsupported" is not a contract tier — AUDIT `union-defence` narrative 2); a Wikipedia stub as the only source for a case record (reported at most, with `upgradeIf` naming the order).
- [ ] **A party label that fails the date test**, or party as colour. Key the party to the year of the figure.

## 10. Where the files disagree — carry both, flag it

- **Police per lakh**: 155 actual appears for 01.01.2023 (`literature.json` baseRate 0) and 155 for 01.01.2024 (`state-police.json` baseRate 1, `union-home.json` baseRate 10); 2022-01-01 reads 152.8 / 196.23 (`literature.json` baseRate 12).
- **CAPF vacancies**: 74,115 / 10,26,879 (January 2024, six forces), 95,633 / 10,45,751 (1 Jul 2024, six forces), 92,672 / 9,80,215 (1 Jul 2024, five forces).
- **Opposition-run custodial-death median**: 7.55 in `state-police.json` baseRate 7 against "7.56 cases per lakh police" in the same file's symmetryCheck.
- **Defence share of Union expenditure**: PRS 13 / 17 (2025-26 BE against 2014-15) against the demands' 15.89% (BE 2014-15) and 13.45% (BE 2025-26).
- **India's 2024 GDP share and rank**: SIPRI's April 2025 fact sheet ("SIPRI puts India fifth in the world at US$86.1 billion, 2.3% of GDP") against the v1.2 workbook (2.22%, sixth) and WDI (2.271%).
- **The PIB award sample**: `procurement-industry.json` baseRate 36 and the symmetryCheck still carry the pre-correction DPSU share; the corrected `procurement-industry:c063` adds the WASS contract.
- **Bofors' value**: the procurement symmetryCheck's "US$285 million / about ₹1,500 crore" against the corrected `money-people:c053`, "SEK 8,410,660,984 (about Rs 1,437.72 crore)".
- **CAG Report 3 of 2019**: read in full by `money-people` (via CHRI) and not asserted by `literature` (cag.gov.in unreachable).
- **Defence-linked bond donors**: three in the base rates; four with Force Motors in void 1 (`money-people:c096`: late verdict: holds, recommends documented; correction applied; `c097`: late verdict: holds, recommends reported; correction applied). The base rates were not recomputed for four.
- **DRAL**: the same holdings in `procurement-industry:c050`–`c053` and `money-people:c069`, `c100`–`c102` (the last three audited late). Neither file says it is the other; hold both, never sum.
- **Per capita**: the projected population in `state-police.json` against the 2011 Census base in the repository, which inflates Bihar and Kerala (`docs/design/SECURITY_PAGE.md` §0.2 F17).
- **The page spec read an earlier run** (`SECURITY_PAGE.md` §0.2); read `FORCE_META` (nodes 266, edges 394, killed 22, narratives 46, base rates 307) instead. The spec's first CPPP probe ("13,025 / 476,505 = **2.7 %**") is not the slice (3.17%).

Every item, with its figures and sources, is in `references/ledger.md` §9; ladder disagreements are in `references/narratives.md`.

## 11. Refusals

Spec §5 (`docs/superpowers/specs/2026-10-04-force-finance-design.md`), binding on every claim, row and caption:

- **No operational detail**: no deployment, order of battle, or procurement the Ministry has not announced. Only published budgets, published awards, published lists and published court and audit records.
- **No person below the public rank** (minister, secretary, service chief, DG DRDO, DGP, commissioner, listed-company director, party officer). The Sukna and Tatra officers appear in text and source titles only. **No private individuals.** No salary of a named person; pay *levels* only.
- **No vendor shown alone.** HAL beside Adani Defence, Mazagon Dock beside L&T, BEL beside Tata Advanced Systems, with identical fields. No vendor named as a beneficiary without a primary record naming it. From the CPPP slice, nobody is named unless the winner string is marked in every component and has ">= 5 awards for that buyer" (`security.json` → `concentration.namingRule`); this skill names none.
- **No rate without its family**: every ₹ beside its denominator and its comparison set; the CPPP rates by class beside the same portal's whole file, never as a national statistic ("No rate here is an Indian national statistic.").
- **No city money that is not published.** Delhi Police is the one city budget.
- No family, religion or ethnicity as an actor; party is text, never colour or a filter; no `alleged` claim without its `contra` in the same file; no "scam", "cleared" or "rigged" beyond the words of the order or the audit.

**The three-level resolution statement** (`docs/design/SECURITY_PAGE.md` §5.0.1, fixed copy; spec §2):

- **Union — to the line.** "Every rupee the Union spends here resolves to a line in a demand for grants, with Budget Estimate, Revised Estimate and Actual where the document prints them."
- **State — to the Police head.** "Each state's police money resolves to its Police major head and no further, except where a state's own budget opened. Strength, vacancy and per-lakh figures come through secondary transcriptions while the national strength table is unreachable, and say so. Prisons, home guards, fire and forensic money resolve only as Union scheme totals and are not budget rows here."
- **City — to the footprint, and Delhi.** "Only Delhi Police has a budget line of its own, and it is a Union demand. Every other city's police money is inside its state's police head, and this page prints those words in place of a number. Cities appear through what is located in them."
