---
name: foreign-money-trail
description: Use when extending the foreign-money map — adding or checking a World Bank, ADB, AIIB, JICA, NDB or Chinese-bank loan and its conditions, a lender-funded contract award or debarment, an FCRA receipt, cancellation, suspension or prior-permission listing, a foreign donor or political trust, a foreign holder's stake in a NIFTY 50 company, an adviser mandate, a SEBI/RBI rule change for foreign capital, or a narrative about BlackRock, Rothschild, Soros, the IMF/World Bank, FCRA or "China money" — or when choosing an id, a denominator, a control, a contra or a source for one.
---

# Foreign money trail

What the finance, ngo and capital fleets (`research/raw/finance/*.json`, `research/raw/ngo/*.json`,
`research/raw/capital/*.json`, 2026-09-26) actually established, so the next pass starts from it
instead of re-deriving it. The one finding that governs everything else: **every actor-selecting
lens the fleets ran produced an equally alarming picture on its declared control.** "BlackRock owns
India" becomes "Norway, Singapore and LIC own India" on the same filings; "the Rothschilds run Indian
M&A" makes Citi and Kotak look worse on the same league tables; "the World Bank dictates policy" fits
the 1991 Congress package and the 1966 Bell mission better than any NDA-era DPO; "BJP-run states get
the loans" puts Kerala and Tamil Nadu above parity and Uttar Pradesh below; "FCRA silences critics"
finds its largest exits among apolitical service charities; "a coordinated Soros–Hindenburg–OCCRP
campaign" has the same 48-hour simultaneity as the AMFI–Adani–IMF-ED–state-broadcaster response. What
separates cases is the record — the conditions, the bidder list, the stated ground, the filing line,
the consultation paper — not the flag on the money.

**REQUIRED BACKGROUND:** `cui-bono` (the ledger row), `evidence-tiering` (the tier),
`pattern-discipline` (the denominator), `source-retrieval` (before any gap), `energy-money-trail`
(the sibling skill whose form this follows). Shape and invariants: `docs/research/FLEET_CONTRACT.md`
— read the **Phase G** section (loan/grant `terms`, the FCRA no-response contra, court rulings, fleet
prefixes, `projectId` and the counting marks, `holding`, `coverage.json`, `controls.json`). Full
tables: `references/ledger.md` (counting rules, controls, coverage, survivors, base rates, voids,
gaps, symmetry checks, disagreements, the register of refuted claims) and `references/narratives.md`
(every narrative the three fleets calibrated, with the cross-examiner's verdict on each).

Every figure below names the fleet file it came from; the primary is in that file's `srcs`. Where two
files disagree, both figures are given (§10). Do not choose between them silently.

## 1. Id conventions and the ids to reuse

Never mint a second node for an entity below. Each fleet's `RECONCILIATION.json` → `mappings` is the
authority on which id won; the raw files were rewritten in place, so a new file should not re-create a
loser. Prefixes are owned by one fleet each (`scripts/lib/vocab.mjs` FLEETS; `validate.mjs` §4 via
`scripts/lib/fleet-refs.mjs`): an endpoint written with `fin:`, `ngo:` or `cap:` must be defined as an
entity in a file of **that** fleet's directory — a file in another fleet may keep a minimal copy.

| prefix | for | examples that exist |
|---|---|---|
| `fin:` | lenders, loan programmes, loan instruments, external-finance actors, lender-funded contractors and debarred firms, works of the finance literature | `fin:ibrd`, `fin:ida` (two legal entities — "World Bank" is an alias of IBRD only), `fin:adb`, `fin:aiib`, `fin:ndb`, `fin:jica`, `fin:jica-mahsr-loan` (the instrument, not the lender), `fin:kfw`, `fin:afd`, `fin:us-dfc`, `fin:us-exim-bank`, `fin:china-development-bank`, `fin:china-eximbank`, `fin:bank-of-china`, `fin:icbc`, `fin:government-of-china`, `fin:imf`, `fin:ieg`, `fin:world-bank-india-office`, `fin:world-bank-sanctions-system`, `fin:external-debt` (the stock as a mechanism node), `fin:wb-dpf-pmgky-1`/`-2`, `fin:wb-dpl-msme-2020`, `fin:wb-dpl-low-carbon-1`, `fin:wb-dpo-resilient-kerala-1`, `fin:wb-pforr-gujarat-goal`, `fin:wb-pforr-swachh-bharat`, `fin:press-note-3-2020`, `fin:gfr-2020-land-border-procurement-order`, `fin:adb-ocb-member-eligibility-rule`, `fin:net-borrowing-ceiling-2023-24`, `fin:dfccil`, `fin:ncrtc`, `fin:nmcg`, `fin:nhsrcl`, `fin:afcons-infrastructure`, `fin:tata-projects`, `fin:kec-international`, `fin:gil-sil-jv`, `fin:shanghai-tunnel-engineering`, `fin:reliance-communications`, `fin:sasan-power`, `fin:adani-power-maharashtra`, `fin:lanco-infratech`, `fin:aircel`, `fin:madhucon-projects`, `fin:a2z-infra-engineering`, `fin:ds-aiddata-gcdf-3`, `fin:lit-a-thousand-cuts` |
| `ngo:` | associations, donors, FCRA instruments and aggregates, political trusts, the welfare-delivery associations | `ngo:fcra-2010`, `ngo:fcra-1976` (successive statutes — the 2014 Delhi HC finding applies the 1976 Act), `ngo:fcra-amendment-act-2020`, `ngo:fcra-amendment-rules-2022`, `ngo:fcra-amendment-rules-2026`, `ngo:fcra-amendment-bill-2026`, `ngo:jpc-fcra-bill-2026`, `ngo:fcra-prior-permission-list`, `ngo:fcra-associations-aggregate` (the registered population — the denominator node), `ngo:foreign-sources-aggregate` (+ `-united-states`, `-united-kingdom`, `-germany`), `ngo:mha-foreigners-division` (the issuing unit; not merged with `min:ministry-of-home-affairs`), `ngo:ford-foundation`, `ngo:gates-foundation`, `ngo:open-society-foundations`, `ngo:omidyar-network-india`, `ngo:usaid`, `ngo:cepps`, `ngo:christian-aid`, `ngo:sewa-international-usa`, `ngo:idrf`, `ngo:compassion-international` / `ngo:compassion-east-india`, `ngo:world-vision-international` / `ngo:world-vision-india`, `ngo:oxfam-india`, `ngo:centre-for-policy-research`, `ngo:care-india`, `ngo:greenpeace-india`, `ngo:amnesty-international-india`, `ngo:lawyers-collective`, `ngo:sabrang-trust`, `ngo:missionaries-of-charity`, `ngo:believers-eastern-church`, `ngo:ayana-charitable-trust`, `ngo:rural-development-trust`, `ngo:param-shakti-peeth`, `ngo:rajiv-gandhi-foundation`, `ngo:rajiv-gandhi-charitable-trust`, `ngo:rajiv-gandhi-institute-for-contemporary-studies`, `ngo:indira-gandhi-memorial-trust`, `ngo:vivekananda-international-foundation`, `ngo:india-foundation`, `ngo:prajna-pravah`, `ngo:overseas-friends-of-bjp-usa`, `ngo:ekal-abhiyan-trust` / `ngo:ekal-vidyalaya-foundation-of-india`, `ngo:vivekananda-kendra`, `ngo:deendayal-research-institute`, `ngo:akshaya-patra-foundation`, `ngo:sulabh-international`, `ngo:day-nrlm-shg-federations`, `ngo:ngo-darpan`, `ngo:e-anudaan`, `ngo:pmnrf`, `ngo:intelligence-bureau`, `ngo:doc-ib-report-2014`, `ngo:azim-premji-foundation`, `ngo:tata-trusts` |
| `cap:` | holders and their vehicles, advisers, AMCs and JVs, market rules, regulators' committees, works of the capital literature | `cap:blackrock`, `cap:vanguard`, `cap:nbim`, `cap:gic-singapore`, `cap:temasek`, `cap:monetary-authority-singapore`, `cap:camas-investments`, `cap:capital-group`, `cap:fidelity`, `cap:kuwait-investment-authority`, `cap:adia`, `cap:ihc-abu-dhabi`, `cap:gqg-partners`, `cap:bat`, `cap:suzuki-motor-corporation`, `cap:pastel-ltd`, `cap:google-international`, `cap:nestle-sa` / `cap:maggi-enterprises`, `cap:adani-promoter-offshore-vehicles`, `cap:rothschild-co` / `cap:rothschild-co-india`, `cap:lazard`, `cap:goldman-sachs`, `cap:morgan-stanley`, `cap:citi`, `cap:avendus`, `cap:jefferies`, `cap:perella-weinberg`, `cap:arpwood-capital`, `cap:ey-india`, `cap:deloitte-india`, `cap:kpmg-india`, `cap:rbsa-advisors`, `cap:sbi-capital-markets`, `cap:jio-blackrock-asset-management` / `-investment-advisers` / `-broking` (three registrations, three nodes), `cap:dsp-group`, `cap:nippon-life-insurance` / `cap:nippon-india-amc`, `cap:invesco` / `cap:invesco-amc-india`, `cap:iihl`, `cap:air-india`, `cap:idbi-bank`, `cap:shipping-corporation-of-india`, `cap:pawan-hans`, `cap:ninl`, `cap:sebi-fpi-regulations-2019`, `cap:sebi-fpi-disclosure-2023`, `cap:sebi-mar2024-exemption`, `cap:sebi-university-fund-exemption-2024`, `cap:sebi-fpi-threshold-2025-easing`, `cap:sebi-odi-circular-2017`, `cap:p-notes-odi`, `cap:sebi-shp-1pct-threshold`, `cap:sebi-mf-regulations-1996`, `cap:india-mauritius-dtaa` / `cap:mauritius-protocol-2016`, `cap:singapore-protocol-2016`, `cap:ecb-framework-2019`, `cap:gift-city-fund-regulations-2022`, `cap:budget-2024-capital-gains`, `cap:press-note-3-2020`, `cap:press-note-2026-easing`, `cap:sc-expert-committee-2023` (≠ `sc`), `cap:sebi-high-level-committee-2025` (≠ `sebi`), `cap:sit-black-money`, `cap:amfi`, `cap:fpi-industry`, `cap:lit-ferguson-house-of-rothschild` (context for the ladder, never a node's owner) |

**Reuse rules.** National and Atlas ids pass by inventory and are never re-prefixed: ministries
`min:ministry-of-finance` (the Union borrower of record for every census leg with no API borrower,
said so in `d`), `min:ministry-of-home-affairs`, `min:ministry-of-housing-and-urban-affairs`,
`min:ministry-of-road-transport-and-highways`, `min:ministry-of-jal-shakti`; companies
`co:reliance-industries`, `co:hdfc-bank` and the other NIFTY constituents in
`research/raw/indices.json`, `co:power-grid`, `co:kotak-mahindra-bank`, `co:adani-enterprises`,
`co:adani-ports`, `co:life-insurance-corporation` (the domestic holder control), `co:jio-financial-services`;
groups `grp:adani`, `grp:tata`, `grp:vedanta`; Atlas `sebi`, `seci`, `cag`, `bjp`, `rss`, `agencies`
(ED·CBI·IT — the IB is `ngo:intelligence-bureau`), `seth`; persons `pol:nirmala-sitharaman`, `pol:amit-shah`,
`pol:nityanand-rai`, `wel:arun-jaitley`, `wel:p-chidambaram`, `per:ajay-tyagi`, `per:tuhin-kanta-pandey`,
`energy:madhabi-puri-buch`, `per:shaktikanta-das`, `per:sanjay-malhotra`, `per:d-j-pandian`,
`per:krishnamurthy-subramanian` (≠ `per:surjit-bhalla`: same IMF seat, different dates),
`per:mukesh-d-ambani`, `per:laurence-d-fink`, `per:ajit-doval` (≠ `per:shaurya-doval`, no family edge);
`energy:hindenburg`, `energy:occrp`, `energy:lokpal`, `energy:renew`, `energy:reliance-power`,
`energy:anil-ambani`, `wel:rbi`, `wel:niti-aayog`, the `energy:state-*` / `energy:govt-of-*` state nodes.

**The cross-fleet survivors (2026-09-26).** `pol:shivraj-singh-chouhan` (not `wel:`),
`party:inc` (not `energy:inc`), `wel:manmohan-singh` (not `energy:`), `co:larsen-toubro` (the Atlas
`lnt` was renamed), `ngo:open-society-foundations` (not `cap:`). Courts keep Atlas ids and are never
fleet-prefixed: `sc`, `delhi-hc`, `bombay-hc`, `madras-hc`, `allahabad-hc`, `ap-hc`, `jharkhand-hc`,
`sikkim-hc` (`src/graph/data.ts`; `energy:delhi-high-court`, `energy:hc-madras` and
`wel:bombay-high-court` were mapped there). Foreign courts stay in their fleet
(`fin:high-court-england-wales`). The full survivor and refused-merge table is `references/ledger.md` §4.

## 2. Predicates and the fields that carry the meaning

- **`loan`** (lender → borrower; `a` in ₹ crore at the rate the source used, the rate stated in `d`;
  `from` approval, `to` closing) carries **`terms`** with exactly the keys `instrument` (the lender's
  own name, verbatim: "IBRD Flexible Loan, single-tranche DPF", "IPF", "PforR", "MFF tranche", "ODA
  loan (STEP, tied)"), `ratePct` (a number or `null` — never 0 for "not stated"; every census leg is
  null, the Projects API carries no pricing), `tenorYears`, `graceYears`, `conditions[]` (one string per
  prior action, DLI or covenant — `worldbank:c001` lists the eight PMGKY prior actions). A loan with no
  amount says "amount not stated" in `d`. The political question is the conditionality and the
  delivery chain: 26 of 26 prior actions read across P173943, P174292 and P181032 were already
  completed at appraisal, by design of the DPF instrument (worldbank baseRates) — but the AUDIT found
  P181032's Table 4 records Bank technical assistance to the National Green Hydrogen Mission, the
  carbon-market design and SEBI's ESG regulations, so "the Bank influenced the design" is
  well-supported even where "the Bank dictated" is not.
- **`countable` / `countedAs` / `notCountableReason` / `projectId`** on researched loans only
  (`docs/research/FLEET_CONTRACT.md` Phase G; owner `research/raw/finance/RECONCILIATION.json`;
  writer `scripts/finance/mark-loans.mjs --write`). A researched record that repeats a census project
  is `countable: false, countedAs: "worldbank:c0754"` (twelve such); a facility envelope, a portfolio
  aggregate or a non-binding MoU is `countable: false` with its class in `notCountableReason` and no
  `countedAs`. A census leg must **not** carry the marks. Never `supersededBy` a duplicate.
- **`grant`** (donor → association; `a` ₹ crore for the FY named in `d`; `from`/`to` the FY months).
  Where the source names only "foreign partners" or "US donors", the source node is
  `ngo:foreign-sources-aggregate` or a country aggregate, not the parent charity (`fcra-receipts:c028`,
  `c031` were re-pointed by the AUDIT).
- **`enforce`** is agency → subject for an act the agency took (cancellation, suspension, freeze,
  prior-permission listing, debarment, investigation). MHA orders are attributed to
  `ngo:mha-foreigners-division` in `fcra-actions.json` and to the ministry in the other files — say
  which. A World Bank debarment is `fin:world-bank-sanctions-system` → firm with the clause cited and
  the sentinel end date 2999-12-31 written as `to: null` with the marker explained. A short-seller,
  a party or a minister making an accusation is **not** an agency: encode as `alleged` with a `contra`
  (`narratives-literature:c001`, `c011`), never as `enforce` (`narratives-literature:c018`, `c022`,
  `fcra-actions:c059`, `darpan-welfare-join:c025` were killed for this).
- **Court rulings** are `enforce` from the court to the party the order runs against, and `d`
  **begins** `Judicial ruling on <claim id>: ` naming the claim in the same file it rules on
  (`fcra-actions:c046`). A dismissal is not a finding of merit; say so in `d`.
- **The FCRA no-response contra**, verbatim, when the association's response cannot be found:
  `pred: contra`, `t: claim:<id>`, `tier: alleged`, a short `lab` (the contract's example is
  "no response recorded"; the files also write "<party> response to <matter>"), and `d` **exactly**
  `No response recorded — asked/not asked unknown` — the validator matches the `d`, not the `lab`.
  Thirteen contras across the ngo files and `narratives-literature.json` open with that sentence
  verbatim (`fcra-actions:c028`, `donors-narratives:c010`, `political-trusts:c901`, …). When an outlet
  says it asked, write "Asked on <date> by <outlet>; no response" with the source instead — the AUDIT
  refuted `debt:c021` for using the unknown form when ThePrint had said it tried repeatedly.
- **`own`** (holder → company) in a `holders*.json` file **requires** `holding` with every key present
  (`pct`, `shares`, `asOf`, … — `HOLDING_KEYS` in the contract), `null` for a stated absence. An
  absence is a void, never an `own` edge (`holders-b3:c012–c014`, `holders-b9:c008`,
  `holders-aggregates:c011` were killed for this). A vehicle named on a filing line (an iShares fund,
  BAT's Tobacco Manufacturers India, Temasek's Dunearn) is an alias of its parent; an operating
  subsidiary or a JV is its own node.
- **`award`** (awarder → winner) for contracts and adviser mandates, with `benefit` and the fee where
  disclosed (two of seven DIPAM TA fees are public, both Re 1). **`analytic`** for the fleets' own
  comparisons, always with `innocentReading`; a state-share ratio is `analytic`.
- Accusations by non-agencies keep `pred: enforce, tier: alleged` in the frozen fleets (the
  vocabulary has no "accuses"); in a new file prefer a narrative or an `alleged` claim with `contra`.

## 3. Denominators — the ones that proved to matter

| question | denominator | where |
|---|---|---|
| is a loan large? | India's external debt stock: US$716.5bn (2024), US$457.5bn (2014), US$123.6bn (2004) — World Bank DT.DOD.DECT.CD; IBRD+IDA debt US$39.28bn of US$647.56bn (2023, ≈6.1%); PPG US$214.9bn (≈33.2%). DEA's series (opened by the AUDIT, not the fleet): concessional share 28.4% (2006) → 10.5% (2014) → 6.9% (2025), smooth | `debt-imf-people.json` baseRates; `finance/AUDIT.json` literature narrative:2 |
| how many World Bank loans? | **two populations, never summed**: the census (`worldbank-projects.json`, 1,117 API projects, 849 IBRD/IDA leg claims at `PA.NUS.FCRF` annual rates) and the researched sample (98 loans in four files at the source's own rate). Twelve researched records repeat a census project and are `countedAs`; the only ₹ total on a page is over countable census legs | `references/ledger.md` §1; `docs/design/FINANCE_PAGE.md` D4/D5 |
| UPA vs NDA Union borrowing | census: UPA 146 claims US$36,036m (US$3,604m/yr) vs NDA 180 claims US$44,863m (US$3,637m/yr) — compare the US$ column, never the ₹ (₹45 → ₹87 per US$ between the eras); `worldbank.json`'s project count reads 177 / 188 projects, US$37,496m / US$49,796m (different denominator, both stated) | `worldbank-projects.json` and `worldbank.json` symmetryCheck |
| a state's share of lending | state-attributed commitments (US$25,754m NDA / US$11,799m UPA across 25 states; AUDIT-corrected NDA US$25,284m) over Census-2011 population share — with the traps in §4 | `worldbank.json` c056–c063 and their AUDIT verdicts |
| lender-funded contract concentration | 55 ICB notices with published bidders (mean 5.64 bidders; 0 single-bid; 12 with ≤3), against 315 of 370 notices with no bidder field at all; L&T ₹6,076 cr of ₹29,919 cr INR-priced awards (20.3%) — a share on a sample of 11 projects, not "the World Bank's India money" | `contracts.json` baseRates |
| total FCRA receipts by FY | ₹11,548 cr (FY2011-12); ₹16,359.48 / 17,166.34 / 22,121.75 cr (FY2019-20 → 2021-22, the sums of the 34 state rows of RS Q.3253); ₹22,974 cr (FY2024-25, MHA to JPC); reported-tier anchors ₹17,832 cr (FY2015-16), ₹15,355 cr (FY2016-17). FY2014-15 ₹22,136.77 cr is the >₹1 cr-association subset only. Flat in US$ (~$2.72bn FY2015-16 and FY2024-25), −17% CPI-real | `fcra-receipts.json` claims and `fcByState`; AUDIT `fcra-receipts:c003`, `c069` |
| the state-wise FCRA table | `fcra-receipts.json → fcByState`: 34 states/UTs × FY2019-20…2021-22, received and utilised, from `mha.gov.in/MHA1/Par2017/pdfs/par2023-pdfs/RS29032023/3253.pdf`; Delhi ₹5,809.6 cr of ₹22,121.75 cr in FY2021-22; Ladakh, Lakshadweep and Daman & Diu absent (not zero). The West Bengal rows (~₹727 / 798 / 906 cr) are the source of the debunked "₹700–900 crore a year" figure | `fcra-receipts.json`; narratives ladder |
| how many cancellations, for what | 21,983 cumulative, 91.3% non-filing (MHA to JPC); 20,600 by 2021-02; 5,933 of 22,762 ceased on 2022-01-01, 97% non-application; UPA control 4,138 in calendar 2012 for non-filing; 16,756 of 41,844 non-filers in Dec 2013. Named cases: 22 of 20,701 (~0.1%). Adjudicated violations among the 22: 0 | `fcra-actions.json`, `fcra-receipts.json` baseRates |
| foreign money against Indian philanthropy | ~₹23,000 cr foreign private giving of ~₹1.2–1.31 lakh cr private (Bain–Dasra; foreign ≈18% of private per the AUDIT's reading of Bain p.11) of ~₹23–25 lakh cr social-sector spend, 95% public; Azim Premji Foundation alone ₹1,639 cr/yr | `fcra-receipts.json`, `donors-narratives.json` baseRates (`donors-narratives:c030` re-labelled by the AUDIT) |
| how much does a foreign holder own? | the company's SEBI Reg. 31 filing: a public holder is named only at ≥1% **per fund vehicle** (`cap:sebi-shp-1pct-threshold`). Coverage: 30 of 50 constituents read from a primary named-holder table, 20 from aggregators (`coverage.json`). The bottom-up ETF sum (`holders-aggregates.json`, eight iShares ETFs, 2026-09-24) is a **lower bound over shares outstanding, not the free float** — the plan called it "NIFTY 50 free float"; the fleet computed no free-float figure and a page must not call it one | `holders.json`, `holders-aggregates.json`, `coverage.json` |
| the result of that lens | BlackRock named ≥1%: 0 of 5 primary filings; eight-ETF aggregate ≥1% in 7 of the 10 largest (RIL 1.01, HDFC Bank 1.75, ICICI 1.73, Infosys 1.78, Bharti 1.09, L&T 1.18, Axis 1.69; ITC 0.59, TCS 0.53, SBI 0.48) with no single line ≥1% in any; median ≈5% of each company's FII/FPI total. Vanguard 1 of 5 (HDFC Bank 2.44%); NBIM 2 of 5; GIC 2 of 5; LIC 4 of 5 and larger than the BlackRock aggregate in 4 of 4. The stakes that dwarf every passive line are strategic: BAT 22.91% of ITC, Suzuki ~58.65% of Maruti (reported), Pastel/Singtel 7.49% of Bharti | `holders.json`, `holders-aggregates.json` baseRates |
| adviser presence | LSEG H1 2024 India top-10 tables (fees, M&A, ECM): Rothschild 0/3, Lazard 0/3, JP Morgan 0/3; Citi 3/3, Kotak 3/3, Goldman 3/3, Morgan Stanley 2/3, Axis 2/3, Avendus 1/3; Dealogic 2007–23 deal count Rothschild #3 (151) behind Citi (165) and Morgan Stanley (179) — Forbes India, the source the file said was unstated | `mandates-ventures.json` baseRates; AUDIT `mandates-ventures:c025` |
| FPI disclosure rules | ~₹2.6 lakh cr of FPI AUM met the Aug 2023 criteria (market-wide, not one group; SEBI never named the others); Singapore+Mauritius ≈25% of FPI custody vs US ≈44% (Dec 2025 press reading of NSDL data — NSDL itself 503); Mauritius >1/3 of FDI 2000–15 | `rules-regulators.json`, `narratives-literature.json` baseRates |
| CPPP procurement rates | see the `procurement-analyst` agent: 3,385,233 award decisions after the stated dedup rule, rates over declared families with Wilson intervals; **no rate is a national statistic while the live verification is 40/40 page_gone** | `research/raw/cppp/quality.json`, `rates.json`, `sample-verification.json` |

Rules: count legs or projects and say which (`censusProjects` vs claims); say the API field
(`curr_total_commitment` vs `curr_ibrd_commitment`); say the FY and whether the total is national or a
subset; say whether a holding is a named line or a bottom-up sum and over what; write `null` and the
reason where the denominator is unknown (share of FCRA receipts to the top 20: "NOT COMPUTABLE — MHA
gave the JPC only bands").

## 4. Controls — mandatory, and the traps each one set

| control | what it produced | traps the AUDIT found |
|---|---|---|
| **UPA vs NDA Union borrowing** (2004-05-22→2014-05-25 vs 2014-05-26→) | roughly equal US$ a year; concessionality fell smoothly across 2014 through IDA graduation on income grounds; the strongest documented case of external conditions shaping Indian law is 1991 under Congress — and the OED itself says conditionality was "used sparingly" even then; the 1966 Bell mission is the one case the Bank calls leverage that "caused resentment" | compare US$, never ₹; a CAGR gap is not a partisan finding (`debt:c026` — six of seven peer EMs decelerated the same way); the UPA-era DPLs (2009 Banking Sector Support US$2bn, the largest since 2000) were not read — a gap, not a finding |
| **BJP-run vs opposition-run states**, normalised by Census-2011 population share and prior lending | no partisan ranking survives: Kerala 1.7–1.9x, TN 1.75x, AP 1.62x above parity; UP 0.61x (0.26x once national EESL programmes are removed), MP 0.56x, Haryana 0.55x, Chhattisgarh 0.18x below; 8 of the 11 states above 1.5x are hill/north-eastern with <1% of population each; ADB's own review puts MP, Rajasthan (Congress 2018–23) and Bihar at the top because of a 2013 rule sending 40–50% to lower-income states; AIIB's list spans BJP-, INC-, DMK-, LDF-, TMC-, AAP- and YSRCP-run states | **multi-state projects**: the API relabels undivided Andhra Pradesh's 2007–10 loans "Andhra Pradesh and Telangana" and a regex binned US$1,409.6m as multi-state, so AP's UPA baseline (0.35x) was an artefact — corrected ≈1.79x, the "rise" disappears (`c058`); REWARD (Karnataka+Odisha), DRIP-II, NCRMP-II and Coastal Resilience straddle states. **IDA vs IBRD legs and co-financing**: an `s: fin:ibrd` claim carrying IDA credits and grant co-financing (Kerala's 1.9x includes US$317m of grants; 1.7x on Bank money — `c059`); split the legs or use a World Bank Group node. **`curr_total_commitment` vs the Bank's own field** (GOAL US$750m vs US$500m + US$250m AF — `c057`; Assam P178581 US$922m vs US$452m per PAD — `c056`). **National programmes attributed to a state** (US$1,580m of EESL "Scale-up" in UP's total — `c061`). **Disaster credits and budget support**: Odisha's UPA total includes the post-Phailin disaster credit and SEDL budget support; Assam's NDA total is 37% three approvals of 2026-01-13. **Party at approval date**: Kerala's UPA-era money was 65% under a Congress-led UDF; Chhattisgarh's NDA-era approvals all fell under Congress (2019–23); TDP was an NDA ally 2014–18 (69% of AP's approvals), AIADMK 2019–21 — "opposition-run in both periods" fails the date test (`c059`, `c060`, `c063`). **Pipeline lag** of 2–4 years from government change. Publish the attribution list so the denominators reproduce. |
| **Chinese official finance to private firms vs Japanese ODA to public projects** | China: no PPG bilateral claim on India in World Bank IDS for 2010/2014/2023 (Japan 72% of US$33.48bn); AidData GCDF 3.0 has 113 India rows, 89 recommended for aggregates, lending at LIBOR + 1.8–4.75% to RCom, Sasan, Aircel, Lanco, Essar — three of the four largest policy-bank borrowers insolvent. Japan: sovereign, 0.1–2.7% for 30–50 years, MAHSR ¥1.05tn **tied** (JICA ex-ante §3(9)) | Chinese banks also lent to Indian SOEs and state banks (ONGC Videsh, GAIL, HPCL, REC, IRFC, SBI) — "only private" is false (`bilateral-china:c060`); a pledge is not a loan (`c061`, `c030`–`c032`: the Sasan Chinese syndicate "never funded"); "tied" is a nationality rule, not a closed club — MAHSR civil packages C1–C8/D1 went to Indian firms (`literature:c031` met its own killIf); US Ex-Im and DFC are equally tied |
| **Aligned vs critical associations**, identical fields | the largest enforcement events by money fell on service charities that do not criticise the government (Compassion partners ~₹325 cr/yr, Ayana ₹826 cr, World Vision India ₹170–319 cr, RDT ₹209 cr); the critics' cases (Oxfam, CPR) carry content-linked grounds; courts struck MHA on procedure under both governments (INSAF 2013, CPSC 2014, Greenpeace 2015) and deferred after the 2020 Amendment (CHRI 2022, Noel Harper 2022) | the aligned side's **receipts were not found at all** (VIF, India Foundation, Ekal, Sewa Bharati — `vifindia.org` 403; India Foundation says it has never received foreign funding): 0 of 4 aligned trusts with a documented FCRA action is "what we could find", not a double standard (`political-trusts.json` symmetryCheck); ministry grants-in-aid recipient lists are unpublished for **both** sides — "not testable here", not "clean" |
| **The holder comparison set and LIC** (`controls.json`) | BlackRock 0/5 named, Vanguard 1/5, NBIM 2/5, GIC 2/5, Capital Group / Fidelity / KIA / ADIA 0/5 (absence in a 5-of-50 sample); LIC 4/5 and the largest non-promoter holder in three | the fragmentation asymmetry cuts the other way — a multi-fund manager is systematically *less* visible than a single-vehicle sovereign of the same size; opaque Mauritius FPIs *do* appear as named lines (Hindenburg found APMS, Albula, Cresta, LTS, Elara, Lotus Global that way) — what filings hide is the beneficial owner, not the vehicle (holders narrative:2 refuted) |
| **The adviser set** (Rothschild & Co vs Lazard, Goldman, Morgan Stanley, JP Morgan, Citi, Kotak, Axis Capital, Avendus) | Rothschild has two dated mid-market mandates (Cropnosys ₹375 cr; CleanMax US$360m), was reported joint TA on Air India in Oct 2017 and withdrew over the fee cap; Morgan Stanley (Jio–Facebook), Perella Weinberg (Holcim–Adani), EY/Deloitte/KPMG (DIPAM) hold the marquee mandates; Lazard has none in the file either | JP Morgan and Axis Capital have no entity (`controls.json` `resolved: false`) — do not borrow `cap:jpmorgan-chase-bank-na-adr-depositary` or `co:axis-bank`; Kotak's adviser role is on `co:kotak-mahindra-bank`; `mandates-ventures:c024` had the client and the investor swapped |
| **The same-cohort licence control** (Jio BlackRock vs Bajaj Finserv, Capitalmind, Old Bridge, Angel One) | in-principle leg 11.5 vs Bajaj ~11 months; Capitalmind filed later, was approved earlier and cleared the final leg in ~7.5 months | an n=2 against a pre-speed-up control is not a comparison; SEBI publishes no processing-time statistics and does not say which reg. 7 sponsor route it applied |

## 5. Symmetry — which lenses over-fire

| lens | result on the control | verdict |
|---|---|---|
| "foreign holder owns X" | Norway's and Singapore's sovereign funds cross 1% twice as often as BlackRock; LIC four times in five | **over-fires** — it detects index investing and the 1% naming rule, then selects its actor |
| "foreign adviser controls X" | Citi, Kotak and Goldman lead every LSEG table Rothschild is absent from | **over-fires**; the narrative selects its actor |
| "coordinated foreign-funded campaign" | AMFI, the Adani Group, a BJP office-holder, a senior lawyer, a former Infosys CFO and India's IMF ED within 48 hours on the state broadcaster | **over-fires**; simultaneity is the base rate of controversy |
| "lender conditions dictate policy" | 1991 (Congress) and 1966 are the alarming cases; the 2020 DPOs financed announced programmes | **over-fires**; it detects crisis-year borrowing. The discriminating record is a prior action whose first public appearance is in a Bank document — P181032's TA inputs come closest |
| "the Centre steers loans to its states" | UPA gave HP 9.7x and Odisha 2.0x; NDA gives Mizoram 7x and Kerala 1.9x | **over-fires**; small states and pipeline timing dominate; party cannot be separated from state size on this lens |
| "foreign bank funds our infrastructure with strings" | run on Japan: tied technology on MAHSR, a 50-year creditor relationship with a Union PSU | **over-fires**; the alarm is about the lender's flag. The discriminators for China are borrower quality and outcome (lender losses), not the lending |
| "FCRA is used against critics" | Missionaries of Charity refused and restored in two weeks with no stated ground; World Vision, CASA, Compassion, CARE, Bal Raksha Bharat cancelled on generic formulae | **over-fires** — it detects the regime's breadth. Discriminators: the stated ground (s.3 / "harmony" / "economic interest" vs non-filing), a year-wise table of grounds by target orientation — which does not exist in any opened source |
| "foreign money → foreign influence" | USAID's documented India money went to seven Union projects (US$97m FY24), orders of magnitude more than to any association; the Gates Foundation, with state MoUs and an award to the PM, has no recorded MHA action | **over-fires** on every side including the state; what varies is whom the state applies it to |
| "Chinese money captured Indian infrastructure" | no change of control, board seat or step-in right documented; the private borrowers defaulted on the Chinese banks | **fails**; Other Official Flows to over-leveraged borrowers |
| "grants and honours are steered to Sangh bodies" | a unanimous jury including the CJI and the Congress leader; ₹1 cr prizes, not a grant stream; recipient lists unpublished for all sides | **not testable** on the record reachable; the honest result |
| **Where the record is genuinely two-sided** | OCCRP's funding (US government ~52% of spending 2014–23 per an adversarial investigation; OSF 1 of 26 named funders, share unpublished); the SEBI 2025 orders (two of 24 investigations, an explicit but limited merits holding, the FPI beneficial-ownership strand unresolved); the Mauritius round-tripping structure (documented mechanism, no official numerator ever published) | **contested** — attention belongs here, not on the actor-selecting claims |

## 6. Voids — the highest-value open questions

A void is a finding (evidence-tiering, the absence rule). Where the record would live:

| void | where it would live | file |
|---|---|---|
| No World Bank, ADB, JICA or NDB document opened names a Union minister, CM or state finance minister as signatory; agreements are signed by DEA Additional/Joint Secretaries and the lender's country head | PIB "loan agreements signed" releases (PRID 1987890, 2196326 — 403 in that session; 200 with a browser UA in others); DEA notes | worldbank, adb-aiib, bilateral-china |
| Loan pricing (benchmark, spread, tenor, grace) for every census leg and every ADB/AIIB page; conditions for every census leg (`terms.conditions = []`) | Loan Agreements and Program Documents on each project page (Documents & Reports API v2 gives `txturl`); ADB "LA" documents | worldbank-projects, adb-aiib |
| Losing bidders and prices for every post-2016 World Bank award (315 of 370 notices) and every ADB RRTS package but one | DFCCIL/NMCG/NCRTC bid-opening minutes on etenders.gov.in / CPPP; the Bank's ICR procurement annexes; the Data Catalog "Major Contract Awards" set (429) | contracts |
| KfW project records — Germany is India's third-largest bilateral creditor (US$3.75bn, 2023) with zero loan claims | kfw.de (blocked); PIB MoP/MoHUA releases; Indo-German Joint Statements (client-rendered) | bilateral-china |
| The 1981 IMF EFF and the primary record of the 1991 facility; India's IMF quota and Executive Director since May 2025 | imf.org (403); RBI History vol. 4; Economic Survey 1991-92 | debt-imf-people, literature |
| A year-wise 2011–2026 table of FCRA cancellations by stated ground and target orientation; any MHA cancellation or suspension order text (none of the 22 cases has one published) | fcraonline.nic.in (000); MHA annual reports; sansad.in / rsdebate.nic.in unstarred answers (RS 3253 opened only with a browser UA) | fcra-actions |
| National FC totals for FY2012-13, 2013-14, 2022-23, 2023-24; association-wise top-15 by year; FC-4 purpose codes | sansad.in answers; the MHA `Par2017` PDF tree; each association's FCRA-compliance page | fcra-receipts |
| Receipts of the aligned control (VIF, India Foundation, Ekal, Sewa Bharati) and the 2016 MHA order placing OSF in the prior-reference category with its ground | the associations' FC-4s; a Parliament answer naming the listed donors; Delhi HC W.P.(C) in OSI v Union of India (order 21.02.2023 per the AUDIT) | fcra-receipts, donors-narratives |
| Donor-wise totals for Ford, Gates, OSF, USAID; Sewa International USA and IDRF Schedule F | 990-PF Part XV grant lists (ProPublica EINs); the donors' own databases (JS) | donors-narratives |
| NGO Darpan counts by state and sector; organisation-wise MoSJE/MWCD/MoRD/Culture grants-in-aid | the Darpan JSON API (connection reset) or data.gov.in (504); e-Anudaan sanction lists; sansad.in annexures | darpan-welfare-join |
| NBIM's own per-company India holdings; Vanguard's fund-level India holdings; BlackRock's UCITS and ADR positions | NBIM's annual `EQ_<year>_Country.xlsx` (not attempted); SEC N-PORT/13F under CIK 0002012383 (Archives 403; efts 200) | holders, holders-aggregates |
| Named holders for the 20 aggregator-only NIFTY constituents; current filings for SBI, UltraTech, Axis, Cipla, Eternal, Kotak, NTPC, Power Grid | the companies' IR sites; BSE AttachLive PDFs when the id is known | coverage |
| Which reg. 7 sponsor route SEBI applied to JFS; processing-time statistics for MF sponsors; the FPIs and groups other than Adani caught by the Aug 2023 criteria | SEBI (never published); an RTI | mandates-ventures, rules-regulators |
| DIPAM's adviser awards and fees (no consolidated register; two Re 1 fees known from press) | DIPAM RFP corrigenda; a Parliament question on adviser fees | mandates-ventures |
| The share of P-notes/ODIs or FPI assets beneficially owned by Indian residents — never published by SIT, SEBI, CBDT or a court | SEBI's Aug 2023 look-through results by UBO residency | narratives-literature |
| Hindenburg's investors (undisclosed); OCCRP's per-funder shares; the Sapre committee's full text; SEBI's order on the 13 unidentified FPIs | main.sci.gov.in WP(C) 162/2023; SEBI Orders section | narratives-literature |

The full list, with the file each comes from, is `references/ledger.md` §6–7.

## 7. Sources — what opened and what did not (2026-09-26)

**Routes that worked.**
- **World Bank APIs, all 200:** Projects API v3 (`search.worldbank.org/api/v3/projects?countrycode_exact=IN`, 1,117 rows; no instrument or location field), the v2 index for `lendinginstr`, Documents & Reports API v2 (`/api/v2/wds`, returns `txturl` for Program Documents, PADs, ICRs, the 2001 OED CAE and IEG ICR Reviews when the IEG portal itself is 403), the procurement-notices API (project feeds cap at 200 rows), the sanctions-list data API (1,520 rows), the indicators API (`DT.*`, IDS bilateral counterparts, `PA.NUS.FCRF`). Data Catalog "Major Contract Awards" 429.
- **ADB** project pages and PDS 200 (the listing is client-rendered — go by project number), the CPS Final Review 2016–21 PDF; **AIIB** all-projects data file 200 (server-served JS) and detail pages; **JICA** ODA loan database and press releases 200; **AidData** GCDF 3.0 zip 200 (28.6 MB, 113 India rows); **RBI** 200; **DIPAM** 200 (HTML and PIM PDFs).
- **Parliament:** sansad.in API and annexure PDFs 200 (AU1603.pdf), rsdebate.nic.in 200; **mha.gov.in `MHA1/Par2017/pdfs/...` answer PDFs 200 with a browser User-Agent** (`RS29032023/3253.pdf` — 403 to a default agent in another session). **PIB:** 403 via WebFetch, 200 via curl with a browser UA in the capital session; 403 to both in the adb-aiib session — record each attempt.
- **Courts and regulators:** Indian Kanoon 200 (Vishal Tiwari 2024; ADR v UoI 2014; INSAF 2013; CHRI 2022); LiveLaw 200; SEBI order PDFs 200 (`sebi_data/attachdocs/sep-2025/...`) and the listed company's exchange intimation on its own media path (`adanienterprises.com/-/media/...`); sebi.gov.in **guessed** circular URLs 404 — find the circular through the Orders/Circulars index.
- **Filings:** company IR shareholding-pattern PDFs 200 on the company's own domain (RIL, HDFC Bank, ITC, Bharti Airtel, SBI, Adani Enterprises, Adani Ports, Axis Bank — some need a browser UA and a Referer); **the BSE ASPX shell and api.bseindia.com are 403/empty, but a BSE `AttachLive`/`AttachHis` PDF opens when its id is known**; screener.in 200 for category totals only (never named holders); iShares `latest-holdings.csv` 200 for every ETF; SEC `efts.sec.gov` full-text search 200 while `www.sec.gov/Archives` is 403 ("Undeclared Automated Tool", any UA); the LIC RHP on bseindia.com/downloads 200.
- **Press and reports that opened:** ThePrint, Scroll, The Wire (article body in the page's JSON-LD when the render is empty), Indian Express, The Hindu, Tribune, Deccan Herald AMP, Business Today, Forbes India, Al Jazeera, newsonair.gov.in, hindenburgresearch.com, occrp.org, dropsitenews.com, rothschildandco.com, HRW, Freedom House, CIVICUS, ICNL, Bain's report page, Open Library's search API (Google Books 429), Wikipedia pages (its search API rate-limited fleet-wide).

**Blocked or unusable this session:** imf.org and data.imf.org (403; IMF facts come from RBI, the World Bank, Parliament and press); fcraonline.nic.in (000, connection reset at the proxy) and mha.gov.in/en/commoncontent (000); dea.gov.in (connection failure) and indiabudget.gov.in (403) — the External Debt Status Report's homes; kfw.de (000); mofa.go.jp and in.emb-japan.go.jp (403 — Exchange-of-Notes signatories); ieg.worldbankgroup.org (403); UNCTAD and Taylor & Francis PDFs (403); cag.gov.in search (404); ADB Board of Governors pages (404); nbim.no (a ~27 KB JavaScript shell on every route; `/api/investments/v2/...` 404); investor/advisors.vanguard.com (JS shells, 202-empty, 404); NSDL FPI monitor (503); data.gov.in (504, then a 25 s timeout); the NGO Darpan JSON API (connection reset); jfs.in (TLS issuer-chain failure); NHSRCL (reset); MEA statements (200 with a client-rendered body); bjp.org (503); business-standard.com (403 via WebFetch, 200 via curl in one session, 403 to both in another); NDTV, Deccan Herald non-AMP, PwC, ScienceDirect (403); livemint and reuters (refused by WebFetch); zaubacorp/tofler/thecompanycheck (JS or 403) and mca.gov.in (blocked) — no CIN or DIN was guessed; efile.fara.gov (timeout) and fara.report (proxy `connect_rejected`); indiacode.nic.in (timeout) and prsindia.org Finance-Bill slugs (404); sacw.net and sabrang.com (000); vifindia.org (403); opensocietyfoundations.org newsroom and the Omidyar statement (404); azimpremjifoundation.org compliance page (403); the CRS brief IF10154 (202, 0 bytes) and Harvard Dataverse (202, empty). **PDF text extraction was broken in the capital session** (pypdf and pdfminer both crash on a `cryptography`/`_cffi_backend` import; no pdftotext) — the SEBI order was read by decompressing its content streams; check `python3 -c "import pypdf"` before planning a PDF-heavy pass. **The eprocure.gov.in `detail_url` tokens in the CPPP scrape are dead**: `<id>A13h1<key>A13h1<unix time>` bound to the June-2026 scrape window, all 40 sampled links answering HTTP 200 with "Invalid Url.Please Check"; the Results-of-Tenders search sits behind an image captcha. **WebSearch's fleet-wide budget (200) ran out** before the ngo political-trusts and capital narratives files began: plan direct URLs.

## 8. The narratives ladder (condensed — every entry, with the AUDIT's verdict, in `references/narratives.md`)

| narrative | status (file → AUDIT) | what would change it |
|---|---|---|
| The World Bank dictates Indian policy through loan conditions | unsupported (worldbank) → "influences the design of" well-supported | a prior action whose first public appearance is in a Bank document |
| Opposition-run states are denied external loans | speculative (literature) → unsupported; unsupported (worldbank, adb-aiib) | a state-wise DEA-posed/approved EAP table controlling for fiscal indicators |
| China has India in a debt trap | debunked (bilateral-china) — holds | any sovereign or sovereign-guaranteed Chinese lending to the Union or a state |
| The Modi government borrowed from a "China-controlled" bank during Galwan | contested (adb-aiib) — holds two-sided | AIIB conditions distinct from ADB's, or DEA records dating the request |
| Japanese ODA is strings-free | contested (bilateral-china) — MAHSR is tied | contract-level Japanese share of MAHSR awards |
| Lender-funded procurement is more open than domestic | well-supported (contracts) → contested | CPPP bid-opening data for ₹500 cr+ Union works |
| L&T wins everything the lenders fund | contested (contracts) → unsupported (P150158 shows 4–7 bidders) | NCRTC P3/P7/P17 bidder counts |
| Foreign funding of NGOs has collapsed | unsupported (fcra-receipts) → contested (−17% real, flat US$) | a deflated series after FY2021-22 |
| Indian NGOs get only ₹700–900 cr a year | debunked — holds (West Bengal's rows) | nothing short of the annexure being wrong |
| FCRA is used to silence critics | well-supported (donors-narratives) → contested; contested (fcra-actions, fcra-receipts) | a year-wise table of grounds by target orientation |
| Christian associations are the real target | contested (fcra-actions) → refuted as intent; no denominator | the religious-category split of registrants vs refusals |
| RGF took Chinese money and it shaped Congress policy | contested (fcra-actions, political-trusts) → receipt well-supported, influence unsupported | the cancellation order; RGF's FC-3/FC-4 for FY2005-06 |
| Soros / OSF fund regime change in India | speculative (donors-narratives) — holds | an ED adjudication with quantified transfers to electoral activity, or a court quashing it |
| USAID paid US$21m to raise Indian voter turnout | debunked — holds (the grant was Bangladesh's; GoI told the Rajya Sabha so on 2025-08-22) | a USAID award document naming India |
| RSS affiliates receive foreign money via US chapters | well-supported (donors-narratives) → well-supported for IDRF, alleged for Sewa, contested for "funds hate" | Schedule F recipient lists matched to FC-4 receipts |
| BJP–Congress FCRA cover-up (Finance Acts 2016/2018) | well-supported (political-trusts) → contested (intent; 2016 reached to 2010, 2018 to 1976) | the bare Acts (indiacode timed out); the ADR petition's disposal |
| BlackRock and Vanguard own India | unsupported (holders, narratives-literature) — holds; eight-ETF aggregate 0.5–1.8% | full-index named data, a board seat or a voting agreement |
| The Rothschilds control the RBI / Indian banking | unsupported (holders, mandates) / debunked (narratives-literature) — holds | any Rothschild licence, board seat or ≥1% stake in an Indian bank |
| Rothschild orchestrated Air India and the strategic sales | unsupported (mandates-ventures) → misleading/partly true (joint TA Oct–Nov 2017, withdrew) | a DIPAM RFP result or PIM naming it on a completed sale |
| Soros, Hindenburg and OCCRP ran a coordinated campaign | unsupported (narratives-literature) — holds; Soros → Hindenburg is a blank | a grant, contract or correspondence commissioning either |
| FPI money is round-tripped black money | contested (holders, narratives-literature) → unsupported as a generalisation; mechanism documented | SEBI's look-through results by UBO residency |
| SEBI quietly undid the post-Hindenburg reform | contested (rules-regulators) → "quietly" refuted; the 50% test was kept | a lobbying submission naming the threshold |
| SEBI's chair had a conflict that let Adani off | contested (rules-regulators) → alleged with the Lokpal's 2025-05-28 dismissal as contra | a recusal log, or a finding rather than a prima facie dismissal |
| Jio BlackRock got a fast-track licence | contested (mandates) / speculative (narratives-literature) → unsupported (Capitalmind was faster) | SEBI's cohort durations or an RTI on the file |
| SEBI's 2025 orders and the SC gave Adani a clean chit | contested — holds (two of 24; a limited merits holding; the FPI strand open) | the FPI beneficial-ownership order, SAT, the Hindenburg probe |
| OCCRP is a US deep-state instrument | contested — holds two-sided | a US-government communication timing the story, or audited per-funder figures |

## 9. Failure modes seen in these fleets — check before you write

The cross-examiners refuted 40 of 84 finance verdicts, 63 of 142 ngo, 19 of 61 capital. The full
register with every claim id is `references/ledger.md` §10. Before a claim ships:

- [ ] **A total set against its own component.** GOAL "US$750m" was `curr_total_commitment`; the Bank's money was US$500m + US$250m AF (`worldbank:c057`). Assam's P178581 was US$452m per the PAD, not the v3 field's US$922m (`c056`). "₹4,400 cr cumulative" did not equal the file's own components (`adb-aiib:c055`). FY2014-15's ₹22,136.77 cr was the >₹1 cr subset (`fcra-receipts:c003`). The West Bengal rows read as India's total. Open the table the sentence summarises.
- [ ] **Conjunctions of true facts implying coordination or causation.** Soros → OCCRP is documented and Soros → Hindenburg is a blank; joining them is the narrative, not a claim. Qwik's bonds + the FCRA definition (`political-trusts:c028`); RGF's receipt + Congress policy; India Foundation's opacity + a Cayman fund; a 2012-13 receipt as the ground for a 2023 suspension (`fcra-actions:c067`). Each fact keeps its tier; the join is `analytic` with an `innocentReading` or does not exist.
- [ ] **"Quietly" for a consulted rule.** SEBI's 2024–25 FPI threshold change had a consultation paper (27 Feb 2024), a board release and a circular, and kept the 50% concentration test (rules-regulators narrative:1). Open the consultation paper before the adverb.
- [ ] **A pledge, MoU or undisbursed commitment summed as a loan.** The Sasan Chinese syndicate "never funded" per the US Ex-Im OIG report the claim itself cited (`bilateral-china:c030`–`c032`); Lanco's US$600m pledge put it in the "four largest borrowers" (`c061`). AidData's `recommended_for_aggregates` flag and the `non-binding-mou` class exist for this.
- [ ] **A family, an individual or an ethnicity as the actor.** "The Rothschilds", "Soros", "the Ambani connection", "the Doval family", "Christian associations are the target": re-attach to the institution (Rothschild & Co India, OSF, JFS, India Foundation) or the ladder, never an entity or an edge; strip surname and "Family" aliases (`capital/RECONCILIATION.json` otherFixes). Three of the six capital brief narratives needed this.
- [ ] **A Wikipedia-only source.** Vedanta → BJP with no amount, the 2016 retrospective date, the US$7bn IMF figure and the 67-tonne gold pledge — each contradicted or unsupported by the primary the AUDIT opened (`political-trusts:c024`, `c025`, `c027`; `literature:c008`; `debt:c025`). `reported` at most, with `upgradeIf` naming the gazette, the Parliament answer or RBI History vol. 4.
- [ ] **A court ruling modelled as enforcement without the "Judicial ruling on <claim id>: " prefix** — or a party, minister or short-seller modelled as an agency (`narratives-literature:c018`, `c022`; `fcra-actions:c059`; `darpan-welfare-join:c025`), or a court credited with the petitioner's words (`fcra-actions:c020`: "arbitrary, illegal and unconstitutional" is Greenpeace's, not the Delhi HC's).
- [ ] **"Opposition-run in both periods" failing the date test.** Kerala's UPA-era money was 65% under a Congress-led UDF; Chhattisgarh's NDA-era approvals were all under Congress; TDP was an NDA ally 2014–18, AIADMK 2019–21 (`worldbank:c059`, `c060`, `c063`). Code the ruling party at each approval date or drop the label.
- [ ] **The source does not say it.** An invented quotation ("played a key role"; a BIS sentence not in CGFS 66), a ground borrowed from a different batch (`fcra-actions:c074`), a generic sentence presented as MHA's ground (`c094`), a reaction presented as lobbying (`rules-regulators:c016`), an ICR rating misquoted (worldbank narrative:3), CAG's failed samples attributed to the wrong kitchen (`darpan-welfare-join:c020`). Quote the sentence.
- [ ] **The wrong endpoint.** Money attributed to the parent charity when the source says "partners in several countries" (`fcra-receipts:c028`, `c031`); an IBRD → DFCCIL edge for awards that were 47/55 POWERGRID's (`contracts:c059`); the client and the investor swapped (`mandates-ventures:c024`); a JV or a subsidiary folded into its partner or parent.
- [ ] **A nominal series as growth; a "no series" claim when the series is public.** FCRA receipts +28.8% nominal are flat in US$ and −17% real (`fcra-receipts:c069`); the DEA concessional-share series was public (literature narrative:2); the CAGR innocent reading was arithmetically false (`debt:c026`). Run the record's own falsifier first.
- [ ] **"Asked/not asked unknown" when an outlet says it asked** (`debt:c021`). The exact contra wording is for genuine ignorance; otherwise "Asked on <date> by <outlet>; no response", cited.
- [ ] **A void drawn as an edge** (`darpan-welfare-join:c035`; the killed `own` absences). Voids have their own array.
- [ ] **A ladder word used as a tier** ("established", "contested", "speculative" on a claim). Tiers are documented / reported / alleged / analytic; the ladder is for narratives only.
- [ ] **A sample chosen by the outcome; "first", "only", "all" without the list.** CPRR was not the only 2020–22 AIIB project (`adb-aiib:c052`); STEC was not the first Chinese civil-works award in the NCR (J. Kumar–CRTG 2012); 25 not 30 affiliate rows (`contracts:c063`).
- [ ] **Free-text or fleet-prefixed endpoints outside their fleet; month-only dates; `a: 0` for "not stated"; a `terms` key other than the five.** The validator rejects each.

## 10. Where the files disagree — carry both, flag it

- **The same loan at two figures:** AIIB CARES in `literature.json` and `adb-aiib.json` (marked); three NDB loans in `adb-aiib` vs `bilateral-china` (US$347/346.72m, 500/418m, 260/241m — unmarked, held for review); census ₹ at annual-average rates vs researched ₹ at the PD's dated rate.
- **World Bank field:** `curr_total_commitment` (co-financing and grants included) vs `curr_ibrd_commitment` + `curr_ida_commitment`; the file's state ratios use the former, the AUDIT recomputes on the latter (Gujarat 1.24x → lower; Assam 3.3x → ≈2.7x; Kerala 1.9x → 1.7x; AP's UPA 0.35x → ≈1.79x).
- **UPA/NDA totals:** 146/180 loan claims (US$36,036m / 44,863m, `worldbank-projects.json`) vs 177/188 approved projects (US$37,496m / 49,796m, `worldbank.json`).
- **FCRA West Bengal rows:** 906.12 / 798.18 / 727.20 (Q.3253 annexure, in the file) vs 727.16 / 798.18 / 905.50 (USQ 1662, in the AUDIT) — two answers, two orderings; the national sums are unaffected.
- **"Violation" cancellations:** MHA-to-JPC 0.4% (~88) vs Q.3253's 1,828 s.14 cancellations 2020–23 — the same word covering non-filing in one and legal violations in the other; the file's "does not reconcile" was the error.
- **Religious receipts FY2024-25:** ₹1,743 cr by named category vs ₹5,150 cr "religious associations"; PTI's own denominator ₹1,841 cr categorised (Christian 73%).
- **Ladder statuses:** FCRA silencing is well-supported in donors-narratives and contested in fcra-actions/fcra-receipts; Jio BlackRock is contested in mandates and speculative in narratives-literature (both → unsupported); the Rothschild-banking narrative is unsupported in two files and debunked in the third; "Chinese contractors were routine before 2020" is "established" in contracts, which is not a tier. The full table is at the end of `references/narratives.md`.
- **Dates and ranks left unresolved:** Missionaries of Charity refusal 2021-12-25 vs -27; EFI cancellation 2023 vs 2024-04; RDT #6 not #5 in FY2015-16; Suzuki 58.65% vs 56.28% in one aggregator's history; BlackRock's 13F CIK 0002012383, not the brief's 0001364742.

## 11. Refusals

- **Institutions, not families.** Rothschild & Co and its Indian subsidiary, BlackRock Inc., Open Society Foundations, the Ford Foundation, Jio Financial Services — identified by LEI, CIN, Euronext/NYSE ticker or IRS EIN. No node, alias, edge or `benefit.who` names a family, a surname, a religion or an ethnicity; such a claim is a narrative, calibrated against the same lens on the controls, and if the lens produces an equally alarming picture for the controls the narrative says so.
- No person without a public role (ministers, secretaries, regulators' heads, executive directors, promoters and directors of listed companies, party officers, trustees of associations that are public subjects); no DIN, CIN, EIN or PAN guessed — the registries were blocked and every unverified identity field is `null`. `fin:shapoorji-pallonji` stays `resolved: false` with no claims because the World Bank notice gave only a group name.
- No identity from a name: GIL in "GIL-SIL JV" is not expanded; Camas is not Temasek on a registry aggregator's word; AG&P City Gas ("AGPCGPL") is not Adani; Deendayal Research Institute is not the DRI; two Singhs, two Doval, two Reddys, two Pandeys are two nodes each.
- No edge between a lender or donor and a minister on the strength of tenure alone; the signatory is the DEA officer the document names, and the minister appears through `role` with dates.
- No `loan` or `grant` without an amount or "amount not stated"; no ₹ figure without the rate and its basis; no pledge counted; no census and researched loans summed; no holding called "free float".
- No FCRA cancellation ground without the association's response or the exact no-response contra; no receipt of a critic recorded with more care than a receipt of an aligned association; the platform takes no view on whether foreign funding is legitimate.
- No "cleared", "clean chit", "collapsed", "scam", "captured", "dictated" or "quietly" beyond the words of the order, the consultation paper or the filing itself.
- No figure from a search snippet, a headline index or a rate-limited endpoint shown as more than `reported`; a figure that appeared only in a snippet of a blocked page (the FY2011-12 top three recipients; the SIT's top-five ODI jurisdictions; the BJP's 31 Aug 2023 Soros statement) is a gap, not a claim.
- No rate from the CPPP scrape presented as an Indian national statistic, and no bidder named unless every component of the winner string carries a marker — see the `procurement-analyst` agent.
