# Energy fleet ledger — base rates, voids, disagreements

The first two sections are generated verbatim from `research/raw/energy/*.json` (asOf 2026-09-25): the `baseRates` and `voids` arrays, file by file. The primary source for each row is in that file; the first source label is shown here. Do not edit figures by hand. Re-open the file, and if the file is wrong, fix it there.

## Base rates

| file | property | num / den | what the denominator is | first source |
|---|---|---|---|---|
| coal | Commercial coal mines allocated on a single bid (ECoS route) that went to an Adani-group entity | 1 / 11 | 11 single-bid allocations to Nov 2023 | Ministry of Coal / PIB 1975677 — 'Commercial Coal Mine Auctions Totally Transparent, Fair & Based on Methodology', 8 Nov 2023 (table of 11 single-bid allocations) |
| coal | Commercial mines auctioned that were allocated on a single bid | 11 / 91 | 91 mines auctioned in 7 tranches to Nov 2023 | Ministry of Coal / PIB 1975677 — 'Commercial Coal Mine Auctions Totally Transparent, Fair & Based on Methodology', 8 Nov 2023 (table of 11 single-bid allocations) |
| coal | Winning rows in the MoC commercial section attributable to Adani-group entities (AEL, Adani Power Maharashtra, MP Natural Resources x2, Mahan Energen; Stratatech/Mahanadi Mines not attributed) | 5 / 145 | 145 winning rows parsed from the commercial section of the tranche-wise file (a row may cover more than one block) | Ministry of Coal — Allocation of Coal Blocks, tranche-wise auctioned/allotted coal blocks (allocation-trance-wise.pdf), re-opened 2026-09-25 |
| coal | Top single winner's share of commercial rows (Rungta Sons) | 8 / 145 | 145 winning rows, commercial section | Ministry of Coal — Allocation of Coal Blocks, tranche-wise auctioned/allotted coal blocks (allocation-trance-wise.pdf), re-opened 2026-09-25 |
| coal | BJD bond donors that are mining/metals companies (as characterised by Forbes; not individually classified here) | null / 42 | 42 donors to BJD Apr 2019–Feb 2024 | Forbes India, Mar 2024 — BJD received Rs 775.5 cr from 42 donors; Essel Mining Rs 174.5 cr, JSPL Rs 100 cr, Rungta Sons Rs 50 cr, Vedanta Rs 40 cr (citing ECI data and Indian Express) |
| coal | Central PSU coal import tenders in 2022 won by Adani Enterprises among those opened: NTPC (two rounds) yes; CIL medium-term no | 2 / 3 | three tender rounds reported (NTPC Mar 2022, NTPC Jun 2022, CIL Jul 2022) | Business Standard (Shreya Jai), Jun 2022 — NTPC awards coal import tenders worth Rs 8,308 cr (6.25 mt) to Adani Enterprises; March 2022 tenders 5.75 mt Rs 8,422 cr |
| enforce | Forest-clearance proposals rejected, 2014-2020 | 120 / 24,277 | all proposals decided or pending on Parivesh 2014-2020 (Vijay Ramesh analysis) | Indie Journal, 4 Jul 2020: Since 2014 less than one percent of forest clearances rejected (Vijay Ramesh, Parivesh data) |
| enforce | Forest-clearance proposals rejected, 2007-2014 | 1,396 / 16,106 | all proposals 2007-2014 (approved/pending 14,710 + rejected 1,396) | Indie Journal, 4 Jul 2020: Since 2014 less than one percent of forest clearances rejected (Vijay Ramesh, Parivesh data) |
| enforce | Politicians under ED probe who were in opposition, 2014–Sep 2022 | 115 / 121 | politicians under ED probe since May 2014 per Indian Express casebook | India.com, 21 Sep 2022, summarising Indian Express ED casebook study: 95% of politicians booked since 2014 are opposition |
| enforce | Politicians under ED probe who were in opposition, 2004–2014 | 14 / 26 | politicians under ED probe during UPA per Indian Express casebook | India.com, 21 Sep 2022, summarising Indian Express ED casebook study: 95% of politicians booked since 2014 are opposition |
| enforce | ED cases against politicians ending in conviction, 2015-16 to 2024-25 | 2 / 193 | politicians (MPs/MLAs and others) with ED cases per government data reported by Deccan Herald | Deccan Herald, 19 Mar 2025: 193 politicians faced ED cases 2015-16 to 2024-25; only 2 convictions (headline and deck only retrievable) |
| enforce | SEBI Adani investigations publicly closed with no violation or settlement | 3 / 24 | of 24 investigations noted by SC; Adicorp, Milestone/Rehvar orders and the 5-company settlement are the public closures; SEBI says 23 complete | SEBI final order, Adicorp matter, 18 Sep 2025 (WTM/KV/CFID/CFID-TPD/31671/2025-26) |
| enforce | Probed politicians who joined BJP whose proceedings stalled | 23 / 25 | opposition politicians facing ED/CBI/IT action who switched to BJP since 2014 (Indian Express via Deccan Herald) | Deccan Herald, 4 Apr 2024, on Indian Express report: proceedings halted or delayed for 23 politicians who joined BJP since 2014 (headline and deck only retrievable) |
| grid | ISTS-TBCB schemes won by PGCIL, FY25 | 26 / 45 | all ISTS-TBCB schemes awarded Apr 2024–Mar 2025 | T&D India, 8 Apr 2025: With 45 schemes awarded, FY25 proves very eventful for ISTS-TBCB market |
| grid | ISTS-TBCB schemes won by Adani Energy Solutions, FY25 | 6 / 45 | all ISTS-TBCB schemes awarded Apr 2024–Mar 2025 (28.6% by tariff) | T&D India, 8 Apr 2025: With 45 schemes awarded, FY25 proves very eventful for ISTS-TBCB market |
| grid | Power-utility/transmission firms among top-25 electoral-bond purchasers 2019–24 | 5 / 25 | ADR top-25 corporate purchasers (Haldia Energy, Western UP Power Transmission, Jindal Steel & Power, Dhariwal Infrastructure, Torrent Power); Vedanta and Utkal Alumina excluded as metals | ADR: Part 3 — Donor-wise Electoral Bonds details, 12 Apr 2019–15 Feb 2024 (PDF; top-25 corporate purchasers) |
| grid | UT discom privatisations completed by Feb 2025 | 2 / 7 | UTs named in the May 2020 policy (Chandigarh, DNH-DD, Puducherry, A&N, Lakshadweep, J&K, Ladakh) | T&D India: Privatization of power distribution in UTs — a status report |
| grid | RDSS smart meters installed vs sanctioned, 30 Jun 2026 | 57,300,000 / 203,300,000 | consumer+DT+feeder meters sanctioned under RDSS | T&D India, Aug 2026: India's smart meter population at 7.24 crore — Parliament (MoS Shripad Naik reply, 6 Aug 2026) |
| grid | Chandigarh bidders whose bid exceeded Rs 606 crore | 1 / 7 | financial bids opened 4 Aug 2021 | T&D India, Aug 2021: Chandigarh discom privatization — CESC group emerges as preferred bidder (Rs 871 crore; others Rs 606–201 crore) |
| hydro | Private hydro MoAs terminated by Arunachal for non-execution (as of Mar 2022) | 44 / 153 | MoAs signed by Arunachal with CPSUs and IPPs (46,943 MW) | Arunachal Times 17 Mar 2022: Dy CM Chowna Mein tells assembly 44 MoAs with private developers terminated; 153 MoAs for 46,943 MW originally signed; developers not named |
| hydro | Stalled Arunachal projects re-allotted to a CPSU by nomination (12 Aug 2023) rather than re-auctioned | 12 / 12 | projects re-allotted on 12 Aug 2023 | PIB 12 Aug 2023: 12 stalled Arunachal hydro projects (11,517 MW) handed to hydro PSUs — project list, CPSU split, 'earlier allotted to private developers ~15 years ago' |
| hydro | Share of MEIL's bonds going to BJP | 584 / 966 | Rs crore of MEIL electoral bonds 2019–2023 | The Quint (SBI/ECI electoral-bond data): MEIL Rs 966 cr total; BJP 584, BRS 195, DMK 85, YSRCP 37, TDP 28, INC 18, JD(U) 10, JD(S) 5, JSP 4; group cos Rs 85 cr to BJP |
| hydro | Polavaram headworks contract agencies whose award CAG faulted (nomination/altered conditions/single bidder or irregular advances) | 3 / 3 | principal headworks agencies 2013–2019 (Transstroy JV, Navayuga, MEIL) | CAG Report No. 4 of 2025 (Performance Audit – Civil), Polavaram Irrigation Project, Government of Andhra Pradesh, year ended March 2023 — contract agencies, dates, RCE history, reverse-tender findings, Special Revolving Fund |
| hydro | Bidders awarded capacity in SECI's Jul 2026 PSP auction | 3 / 3 | bidders that qualified for the reverse auction | SolarQuarter 21 Jul 2026: SECI PSP e-reverse auction 9 Jul 2026 (1,500 MW/12,000 MWh sought) — Greenko 720 MW, Torrent Energy Storage Solutions 300 MW, Tata Power 324 MW; storage cost ~Rs 1.35 cr/MW/yr; LoAs 17 Jul 2026; 3 bidders, 1,680 MW offered |
| literature | Coal blocks allocated 1993–2010 that the Supreme Court cancelled as illegal | 214 / 218 | All coal blocks allocated by screening committee/government dispensation 1993–2010 (SC, 2014-09-24). Because 98% were illegal, holding a cancelled block is non-discriminating for any single allottee. | Wikipedia — Indian coal allocation scam |
| literature | SEBI Adani investigations complete at the time of the SC judgment | 22 / 24 | The 24 matters SEBI investigated after the Hindenburg report (SC, 2024-01-03) | Indian Kanoon — Vishal Tiwari v Union of India, SC, 2024-01-03 |
| literature | Chapters in Business and Politics in India (OUP 2019) that centre on extractive or regional business–state cases relevant to energy | 2 / 11 | All chapters in the volume (Odisha extractive economy; business-friendly Gujarat) | OUP — Business and Politics in India (ToC) |
| literature | Works in this bibliography whose existence and bibliographic details were fully verified from an opened publisher/official/primary page | 13 / 24 | All 24 document/organisation entries in this file (partial = corroborated only through secondary summaries; false = not verified) | OUP — Business and Politics in India (ToC) |
| literature | Share of Indian electricity generation from coal, 2025 | 73 / 100 | Percent of total generation (Ember). Context: any coal-adjacent policy affects the great majority of the system, so "who benefits" from coal decisions has a very wide denominator. | Ember — India country page |
| mines | BJD's top-10 electoral-bond donors that are mining, metals or cement companies | 8 / 10 | Top ten BJD bond donors by amount, Apr 2019-Feb 2024 (Essel, JSPL, Utkal, Rungta, Rashmi Cement, SN Mohanty, Vedanta, Penguin Trading, Grasim, UltraTech; Penguin Trading and SN Mohanty's sector taken as stated by Forbes: trading and mining respectively) | Forbes India, 22 Mar 2024 |
| mines | Tranche-IV critical-mineral blocks awarded to Vedanta-group companies | 4 / 8 | Blocks whose preferred bidder was announced on 2024-11-07 | PIB PRID 2071441 |
| mines | Tranche-IV blocks that reached award | 8 / 21 | Blocks in the 2024-06-24 NIT (10 passed technical evaluation; 8 awarded by 2024-11-07, 2 pending to 2024-12-02) | PIB PRID 2071441 |
| mines | Odisha iron/manganese leases found without requisite environmental or forest clearance | 102 / 187 | Mining leases in Keonjhar, Sundargarh and Mayurbhanj examined by the CEC (Common Cause, 2017) | Indian Kanoon Common Cause 2017 |
| mines | Share of forest land diverted 2014-24 that went to mining and quarrying | 40,096 / 173,000 | Hectares approved for diversion under the Forest (Conservation) Act, 2014-04-01 to 2024-03-31 (government reply, July 2025) | Deccan Herald (PTI) 21 Jul 2025 |
| mines | Critical-mineral blocks auctioned by states before the 2023 amendment | 19 / 107 | Blocks handed to state governments by GSI/ministry that states had auctioned by mid-2023 (ministry's stated justification for s.11D) | PIB PRID 1945102 |
| mines | Iron-ore states in the symmetry set with an adverse official illegal-mining finding against the governing party | 3 / 3 | Karnataka (BJP), Odisha (BJD), Jharkhand (JMM) — the property is non-discriminating | The Tribune, 28 Jul 2011 |
| money | Top bond purchasers that gave some share to BJP | 18 / 18 | the 18 largest purchasers by value (The Hindu, matched data); 100% → giving to BJP is non-discriminating among large donors | The Hindu Data, 21 Mar 2024, 'Electoral bonds full data / MEIL's ₹584 crore to BJP is top donation to any party' (Future Gaming ₹542 cr to AITC; Qwik; Haldia; Vedanta; Kolkata trio) |
| money | BJP share of all matched bond money | 6060.51 / 12769.4 | ₹ crore encashed by all parties, 12 Apr 2019–24 Jan 2024 (47.5%) | Wikipedia — Electoral bond (party-wise encashment table, SC judgment 2024-02-15, ECI release dates) |
| money | BJP share of bond money from energy/resources purchasers with near-complete party splits in opened sources | 1008.5 / 1,924 | ₹ crore: MEIL (584 of 966), WUPPT (80 of 190 known), Vedanta (229 of 354 known), Haldia (81 of 362 known), Aurobindo (34.5 of 52) → 52.4%, versus 47.5% for all bonds and 82.5% for FY25 trust money; excludes Essel/JSPL/Utkal/Rungta whose BJP shares were not found | The Hindu Data, 21 Mar 2024, 'Electoral bonds full data / MEIL's ₹584 crore to BJP is top donation to any party' (Future Gaming ₹542 cr to AITC; Qwik; Haldia; Vedanta; Kolkata trio) |
| money | BJP share of electoral-trust disbursements | 856.4575 / 1218.36 | ₹ crore, FY2023-24 (70.30%); FY2024-25: 3157.65 of 3826.35 (82.52%) — the prompt's 82.45% baseline corresponds to the FY25 figure | ADR — Analysis of Contribution Reports of Electoral Trusts FY 2023-24 (10 Feb 2025, PDF) |
| money | Responding PSUs that contributed CSR funds to PM CARES | 98 / 121 | PSUs that answered Indian Express RTIs to 4 Dec 2020 (81% → non-discriminating; contributing was the norm, not a signal) | Indian Express, 7 Dec 2020, '101 PSUs give Rs 155 crore from their staff salaries to PM fund' (RTI: 98 PSUs ₹2,422.87 cr CSR; ONGC ₹300 cr, NTPC ₹250 cr, IOC ₹225 cr; PMO refuses RTI) |
| money | Corporate share of BJP's declared donations | 5717.167 / 6074.015 | ₹ crore FY2024-25 (94%); FY2023-24: 2064.58 of 2243.95 (92%) | ADR — Analysis of donations declared by National Parties FY 2024-25 (26 Mar 2026, PDF) |
| money | Kolkata-based firms among top-50 purchasers | 16 / 50 | top-50 purchasers by value (Frontline); Kolkata firms bought ₹1,925.8 cr, led by Haldia Energy — Hyderabad 11, Mumbai 8 | Frontline (The Hindu group), 15 Mar 2024, 'As ECI reveals electoral bonds data, BJP tops beneficiary list' — reprinted on ADR site |
| money | Energy/power/mining/oil share of electoral-trust receipts | 609.05 / 3826.34 | ₹ crore FY2024-25: ADR sector buckets 'Power & Oil' ₹263.87 cr + 'Mining/Construction/Infrastructure/Engineering' ₹345.19 cr (15.9%); manufacturing 28.2%, real estate 16.4% | ADR — Analysis of Contribution Reports of Electoral Trusts FY 2024-25 (13 Feb 2026, updated PDF) |
| money | Share of the ₹925 cr MoP/MNRE PSU PM CARES pledge that came from the four largest listed power CPSEs (NTPC 250, PFC 200, Power Grid 200, REC 150) | 800 / 925 | ₹ crore pledged by MoP+MNRE CPSEs to PM CARES, Mar–Apr 2020 | Deccan Herald / PTI, 3 Apr 2020, 'Power, renewable energy PSUs to contribute Rs 925 cr to PM CARES fund' (MoP statement; R K Singh tweet; ₹905 cr MoP + ₹20 cr MNRE; NTPC 250, PFC 200, Power Grid 200, REC 150, NHPC 50; ₹445 cr deposited 31 Mar) |
| money | Oil-PSU CSR to temple towns through FY2019-20 (IOC Puri ₹5 cr + ONGC Gangotri ~₹1 cr) as a share of the ₹1,355 cr ThePrint tallied to PM CARES, Statue of Unity, temple towns and the Bhubaneswar SDI | 6 / 1,355 | ₹ crore of oil-PSU CSR to the four named destinations, FY2014-15→FY2019-20 (ThePrint) | ThePrint (Remya Nair), 18 Jun 2021, 'Rs 1,355 cr — how much oil PSUs have given temple towns, PM Cares, Statue of Unity as CSR' (from PSU CSR reports FY2014-15→FY2019-20; ONGC response; BPCL/IOCL/GAIL/minister did not respond) |
| nuclear | BSR RFP interest-holders that filed a final proposal | 1 / 6 | companies that submitted documents to NPCIL by 2025-09-29 | WNN: Deadline extended for BSR RFP (8 Oct 2025) |
| nuclear | Kaiga 5&6 EPC bidders that won | 1 / 3 | MEIL, L&T, BHEL (technical bids from 2023-10) | WNN: EPC contract awarded for Kaiga 5&6 (24 Apr 2025) |
| nuclear | Foreign-vendor projects with a signed construction contract | 1 / 3 | Rosatom (Kudankulam), EDF (Jaitapur), Westinghouse (Kovvada) | World Nuclear Association: Nuclear Power in India (updated 15 Jul 2026) |
| nuclear | Recent nuclear statutes passed without committee referral | 1 / 2 | SHANTI 2025 (no referral) vs CLND 2010 (standing committee) | PRS Bill Track: SHANTI Bill 2025 |
| nuclear | Private groups named in 'beneficiary' narratives that have a nuclear exchange filing | 1 / 4 | Adani (yes), Reliance, JSW, Vedanta (none found) | Business Today: Adani Power forms nuclear subsidiary (13 Feb 2026) |
| oilgas | Oil-and-gas-linked companies among the top five electoral bond purchasers 2019–24 | 2 / 5 | Top-5 purchasers per ECI data: Future Gaming, MEIL, Qwik (Reliance-affiliated, alleged), Vedanta (Cairn owner), Haldia Energy — counting Qwik and Vedanta | Indian Express, 15 Mar 2024 — '3 of top 5 donors bought electoral bonds with ED and I-T knocking on their door' |
| oilgas | Share of Congress's bond receipts from Vedanta (the largest oil-gas-linked donor to the opposition) | 125 / 1,422 | ₹ crore encashed by INC 12 Apr 2019–Jan 2024 | The Hindu Data, 21–22 Mar 2024 — 'Vedanta is biggest donor for Congress, Essel Mining for BJD; MEIL ₹584 crore to BJP' |
| oilgas | Share of BJP's bond receipts from MEIL (CGD round-11 top winner) | 584 / 6,060 | ₹ crore encashed by BJP 12 Apr 2019–Jan 2024 | The Hindu Data, 21–22 Mar 2024 — 'Vedanta is biggest donor for Congress, Essel Mining for BJD; MEIL ₹584 crore to BJP' |
| oilgas | Russian share of feedstock at Indian refineries mid-2026 | 38 / 100 | Percent of Jamnagar (RIL) feedstock from Russia, Jun–Aug 2026, vs 100% at Vadinar (Nayara) and a 15% cut at state refiners in Dec 2025 | CREA — August 2026 monthly analysis of Russian fossil fuel exports and sanctions (17 Sep 2026) |
| oilgas | Gas migration volume relative to the government's demand | 11 / 11 | 11.24 bcm migrated per D&M 2015 underpins the USD 1.73 bn demand (2016); the same volume now underpins USD 2.81 bn — the increase is interest, not new gas | Delhi HC Division Bench, Union of India v Reliance Industries Ltd & Ors, 14 Feb 2025 (Rekha Palli & Saurabh Banerjee JJ) — Indian Kanoon |
| people | Coal-block allocations (1993–2010) cancelled by the Supreme Court | 214 / 218 | all coal blocks allotted since 1993 reviewed by the SC in 2014 — cancellation is non-discriminating (98%) | Wikipedia — Indian coal allocation scam (API extract) |
| people | Bidders who won the Bihar Bhagalpur thermal PSA | 1 / 4 | bidders in the 2024–25 tender (Adani Power L1, JSW Energy L2) | The Wire — R.K. Singh blames Nitish govt for 'Rs 62,000-crore loss' in Adani-awarded Bhagalpur power project |
| people | Resolution applicants who won Jaiprakash Associates | 1 / 6 | bidders in the JAL CIRP (Adani, Vedanta, Dalmia, Jindal Power, PNC, Jaypee Infratech) | Power Line — NCLT approves Adani Enterprises' resolution plan for Jaiprakash Associates, 19 Mar 2026 |
| people | Solar PLI tranche-II letter-of-award holders | 11 / null | applicants to tranche II — denominator (number of bidders) not verified; 11 winners share ~39.6 GW and ~₹13,937.5 crore | PSU Watch — Solar PLI tranche-II: Reliance, ReNew, JSW & 8 others bag 39,600 MW |
| people | Energy/resources promoters in Forbes India's top 10 (2025) | 4 / 10 | Forbes India Rich List 2025 top 10 (Ambani, Adani, Jindal, Birla) | Forbes India — 2025 Forbes India Rich List: Mukesh Ambani richest Indian, net worth drops 12% |
| solarwind | PLI Tranche-I winners among named bidders | 3 / 11 | named bidders (3 winners + Jindal dropped + Tata Power, Waaree, Vikram, Premier, Coal India, L&T, Megha named as unsuccessful) | Mercom PLI-I list |
| solarwind | Adani share of total PLI-solar capacity allocated (MW) | 737 / 48,337 | MW allocated across Tranche-I and Tranche-II | MNRE Tranche-I PDF |
| solarwind | Reliance + Shirdi Sai share of PLI-solar capacity (MW) | 20,000 / 48,337 | MW allocated across both tranches | PIB 1911380 |
| solarwind | Adani Green share of Khavda land at 2020 allotment (ha) | 19,000 / 72,600 | hectares of the hybrid park | Wikipedia Khavda |
| solarwind | Adani group share of Khavda land after Aug 2023 (ha, approx.) | 44,500 / 72,600 | hectares (445 sq km per Scroll/Guardian over 72,600 ha) | Scroll Khavda |
| solarwind | Adani share of NTPC's Oct 2024 hybrid auction (MW) | 600 / 1,200 | MW awarded in the 1,200 MW tender | Renewable Watch NTPC hybrid |
| solarwind | Gujarat share of first 10 lakh PM Surya Ghar installations | 351,273 / 847,000 | installations counted at the 10-lakh milestone (denominator implied by DD News's 41.47%) | DD News 10 lakh |
| solarwind | 2021 PSA-signatory states with a bribery allegation attached | 1 / 3 | states whose PSAs were opened here (AP, TN, Odisha); Chhattisgarh and J&K not opened | Saur Energy TANGEDCO PSA |
| solarwind | Top-5 developers' share of 2024 utility-scale solar commissioning | 52 / 100 | percent (Mercom leaderboard: AGEL, ReNew, ACME, NTPC RE, O2) | Mercom 2024 leaderboard |
| states | Of the 20 resource states surveyed, share currently governed by a BJP or BJP-led-NDA Chief Minister (as of 2026-09-25) | 12 / 20 | 20 resource states named in the brief: Odisha(BJP), Jharkhand(JMM), Chhattisgarh(BJP), Gujarat(BJP), Rajasthan(BJP), Madhya Pradesh(BJP), Andhra Pradesh(TDP-led NDA), Telangana(INC), Maharashtra(BJP-led), Karnataka(INC), Tamil Nadu(TVK), Arunachal Pradesh(BJP), Sikkim(SKM), Himachal Pradesh(INC), Uttarakhand(BJP), J&K(JKNC), Assam(BJP), West Bengal(BJP), Goa(BJP), Uttar Pradesh(BJP). BJP or BJP-led NDA counted for: Odisha, Chhattisgarh, Gujarat, Rajasthan, Madhya Pradesh, Andhra Pradesh (NDA ally TDP), Maharashtra, Arunachal Pradesh, Uttarakhand, Assam, West Bengal, Uttar Pradesh = 12. | Wikipedia list of current CMs |
| states | Of the five states/UTs named in the Nov-2024 US indictment's bribery allegations, share that have changed ruling party since the alleged 2021-22 conduct | 5 / 5 | Andhra Pradesh, Chhattisgarh, Odisha, Jammu & Kashmir, Tamil Nadu — all five had a change of ruling party by 2026-09-25 (see states:c025 for why this is not read as evidence either way). | Wikipedia: Gautam Adani |
| states | Share of the five named developer zones at Khavda (by hectare) allocated to Adani Green Energy specifically, versus all other named developers combined | 19,000 / 49,400 | Hectares across the five named developer zones at Khavda cited in the source table (Adani Green 19,000; NTPC 9,500; Sarjan Realities 9,500; GIPCL 4,750; GSECL 6,650 = 49,400 total); Adani's share is ~38%, i.e. the largest single share but well short of a majority. | Wikipedia: Gujarat Hybrid Renewable Energy Park (Khavda) |

## Voids (documented absences)

**coal**

- No itemised destination list for Coal India or subsidiary CSR FY2019–25 in any Ministry of Coal or PIB document opened; the MoC Annual Report 2020-21 PSU chapter is an image-only PDF and CIL's CSR statistics table is rendered client-side.
- No Coal India contribution to the Statue of Unity found; the PIB reply lists only coal-belt thematic areas. (Reporting attributes the Rs 146.83 cr PSU CSR for the statue to five oil PSUs — that page returned 403 and is not relied on.)
- No Adani-group company appears among the named electoral-bond donors in the three bond analyses opened (Moneylife, Forbes India, Tribune).
- Bidder counts per commercial coal mine are not published; the Ministry publishes only single-bid allocations (11 to Nov 2023).
- No Adani or RRVUNL response to the PEKB reject-coal report or to the Jaipur court's findings was found in sources opened.
- Bhupesh Baghel is not named as an accused in the coal-levy complaints read; the ED's 'political' recipients are named in the EOW case (Amarjit Bhagat, Devendra Yadav).

**enforce**

- PM CARES Fund: no audited statement published for FY2023-24 or FY2024-25 as at 25 Sep 2026; the site's own URL pattern returns 301/connection-reset for those years, and the last published year is FY2022-23. Only receipts-and-payments accounts, no auditor's notes or balance sheet, are uploaded.
- SEBI's 24th Adani investigation ('close to completion', 11 Aug 2024): no public order, closure note or subject description located by Sep 2026. Likewise no final order on SEBI's 27 Jun 2024 show-cause notice to Hindenburg (the firm closed 15 Jan 2025).
- DRI coal over-invoicing investigation against Adani entities: opened around 2016, blocked from gathering overseas evidence by Bombay HC in 2019, DRI appeal pending in SC with a hearing listed 6 Aug 2024; no outcome located to Sep 2026.
- CBI FIR of 31 Mar 2024 against MEIL (NISP bribery): no charge sheet, arrest or closure report located by Sep 2026; MEIL's response not on record.
- ED sand-mining probe in Tamil Nadu: after SC cleared the summonses (27 Feb 2024) no prosecution complaint against any collector or contractor located.
- Forest clearances: MoEFCC/Parivesh publish approvals and areas but no reasoned rejection list; the 2014-2020 rejection count (120) comes from a third-party scrape, not a ministry statement; no post-2020 rejection series located.
- Beneficiaries with no traceable enforcement action: this pass found no SEBI/ED/CBI proceeding against Adani Green's Indian counterparties (SECI, AP discoms) arising from the US indictment's Rs 2,100 crore bribery allegation, nor any Indian FIR on it.

**grid**

- No Adani-group entity appears among ADR's top-25 electoral-bond purchasers (12 Apr 2019–15 Feb 2024; cut-off ~Rs 105 crore), and the Wikipedia article on the scheme names no Adani donor. Adani Energy Solutions was nonetheless the largest private TBCB winner by tariff (FY25–26) and holds the largest AMISP meter book.
- DNH-DD discom sale (2021): no winning price, reserve price or rival bids found in opened sources — only 'highest bidder' and projected revenue.
- Section 11 directions of May 2022–Dec 2024 to imported-coal plants (incl. Adani Mundra) were not opened; only Google News headlines (PIB 2 Apr 2024; The Hindu 16 Oct 2024) surfaced. Only the 22 Mar 2026 CGPL direction was read.
- Electoral-trust routing (Prudent, AB General) from power groups: no document opened. The Wire's 16 Mar 2024 headline ('Sanjiv Goenka's companies spent Rs 709 crore in electoral bonds and trusts') indicates trust use by RPSG but the page is JS-rendered and its body could not be retrieved.
- Electricity (Amendment) Bill 2022: PRS records introduction and referral (8 Aug 2022) but no Standing Committee report or passage; lapse with the 17th Lok Sabha not confirmed from an opened source.
- PFCCL's ten empanelled AMISPs (17 Mar 2025) — names are in an image and were not extracted.
- Market coupling operator design: CERC's Jul 2025 order has exchanges rotating as MCO with Grid-India as backup; Powerline (Jul 2026) describes Grid-India as the appointed MCO. The 2026 draft/final regulations were not opened.

**hydro**

- No opened official record names the private developers who previously held the 12 Arunachal projects re-allotted on 12 Aug 2023; PIB says only 'allotted to private sector developers about 15 years ago', SJVN's Etalin page names no prior developer, and the Dy CM's 2022 statement on 44 terminations names none.
- Neither outlet covering the 22 May 2025 CBI chargesheet carried any response from Patel Engineering Ltd, and no exchange filing by the company on the chargesheet was located.
- The Ratle turnkey contract value is absent from the signing coverage (Kashmir Life) and the Wikipedia summary; only the PIB investment recommendation (~Rs 5,282 cr, Sep 2020) is public.
- No competitive process, bidder list or price is reported for AP's Gandikota-2 allocation to Adani Hydro Energy Eleven (May 2026) or Maharashtra's 2023 MoUs with Torrent and NHPC.
- No cash consideration to the Sikkim exchequer is reported for the transfer of the 60.08% Sikkim Urja stake; the only stated terms are assumption of Rs 3,079.74 cr dues and 6%→15% free power over 50 years.
- No electoral-bond purchase by NCC Ltd, THDC's or NHPC's Tehri/Subansiri contractors was checked; L&T's and HCC's bond records were not opened (a press summary that L&T bought none was seen only in search results).

**literature**

- No court, SEBI, CAG or ED record was found that finds the Adani Group to be a proxy, front or financing vehicle for the BJP; the only primary records are allegations by opposition leaders and denials by both parties.
- The March 2024 electoral-bond disclosures, as summarised, contain no documented link between any bond purchase and a specific coal block or energy contract.
- No Comptroller and Auditor General audit of PM CARES exists; the fund is audited privately and donor identities are undisclosed.
- The PRS listing of Standing Committee on Energy reports (2019–26) contains no report, by title, on the 2022 coal-import blending mandate or on the SECI manufacturing-linked solar tender.
- No Adani Group denial of the OCCRP (2023) or FT coal-grade (2024) reports was captured in the sources opened; the SEBI September 2025 final orders were not opened (sebi.gov.in returned 403).
- Wikipedia's "Solar power in India" article contains no material on ALMM, the April 2022 customs duties or domestic manufacturers; MNRE/Mercom pages were not opened.

**mines**

- India's most publicised lithium discovery (Salal-Haimna, Reasi, J&K) has drawn no bid in two auction attempts (Tranche I: fewer than three qualified bidders; Tranche III: no bid at all), per the minister's Rajya Sabha reply of 2025-03-10.
- Six years after the CCEA's in-principle nod (2020-10-14, target September 2021) and nearly four years after bids were invited (Dec 2022, per search summaries), NMDC Steel has no strategic buyer; the Rs 23,140-crore Nagarnar plant remains a listed PSU.
- The ministry's Tranche IV release reports the 8 successful blocks and the cumulative 22 successes, but not the 11 of 21 offered blocks that did not clear technical evaluation, nor bidder counts per block.
- No public denial or response from Adani Enterprises to NMDC-CMDC's 2023-08-28 termination of the Bailadila Deposit-13 MDO contract; the company did not respond to the Free Press Journal.
- The ECI's 2022 opinion on Hemant Soren's disqualification was sent to the Governor of Jharkhand in August 2022 and has never been published or acted on.
- No consolidated public figure for dividends the Government of India has received from Hindustan Zinc since 2002 appears in the opened sources, even though 'steady dividends' is the government's stated reason for slowing the stake sale.
- Of Vedanta's Rs 400 crore and Essel Mining's Rs 224.5 crore in bonds, only Rs 40 crore and Rs 174.5 crore respectively are traceable to a party (BJD) in the opened sources; the recipients of the remaining Rs 360 crore and Rs 50 crore are not identified here.

**money**

- Adani group flagship companies do not appear in the ECI purchaser list of 22,217 electoral bonds (Apr 2019–Feb 2024).
- Reliance Industries and other Mukesh Ambani flagships are absent from the purchaser list; the third-largest purchaser Qwik Supply Chain (₹410 cr, ₹375 cr to BJP) is 50% owned by three Reliance group companies, and Reliance denies it is a subsidiary.
- Tata group companies are absent from the bond purchaser list, and Tata's Progressive Electoral Trust declared nil receipts for FY2020-21 to FY2023-24 — then received ₹915 cr in FY2024-25 and gave ₹757.6 cr to BJP.
- The PMO refused, under RTI, to furnish details of contributions to PM CARES, stating the Fund is not a 'public authority' under s.2(h) RTI Act; contributor-level PSU figures exist only because individual PSUs answered RTIs.
- Prudent Electoral Trust did not declare donor addresses for 60 donations worth ₹174.83 cr in FY2023-24; Triumph declared none for ₹132.5 cr; Paribartan converted its ₹1 cr into electoral bonds, hiding the recipient.
- AB General Electoral Trust's FY2024-25 donor list had not been published by ECI when ADR and Scroll reported (Feb 2026/Dec 2025), although BJP's report shows ₹621 cr received from it.
- Ayodhya/Kashi temple projects and Sangh-linked institutions: no opened source itemises any energy-PSU CSR to them 2019–25. Statue of Unity and PM CARES are now itemised (ThePrint from CSR reports; CAG via Business Standard; PIB/PTI), and the temple-town money found is small: IOC ₹5 cr to the Jagannath temple (FY20), ONGC ~₹1 cr to Gangotri (FY19–20), and a ₹100 cr Badrinath commitment announced May 2021.

**nuclear**

- Mahi Banswara Nuclear Island Mega EPC Package (>₹28,000 cr) floated 2026-07-15 has no announced winner as of 2026-09-25; the task's premise that 'MEIL or L&T won' is not yet true.
- No Jaitapur (EDF) construction contract or framework agreement as of 2025-03 (Lok Sabha) despite a binding offer in 2021-04; environmental clearance lapsed 2022-12.
- Westinghouse had not submitted a techno-commercial offer for Kovvada as of 2024-12-06; no later offer found.
- No private nuclear licence, SMR award, or NPCIL–Hindalco BSR agreement has been signed as of 2026-09-25; the Act itself was not notified into force as of 2026-08-05.
- No exchange filing by Reliance Industries, JSW Energy, Vedanta or Jindal Steel & Power on a nuclear subsidiary, site or proposal found; Vedanta does not appear in any BSR list.
- MEIL's response to the electoral-bond/contract linkage and to the CBI FIR was not found in opened sources; the Tribune piece quotes no company statement.
- No MoEFCC/AERB/CAG finding or court order on the Kaiga 5&6 tender process found.
- No verified NPCIL order to Walchandnagar Industries in the fleet programme in opened sources; only analyst 'in focus' mentions.

**oilgas**

- No GA-per-entity table for PNGRB CGD rounds 9–12 could be extracted: the authorisation register renders client-side and the bidding page returned 404.
- DGH website returned only a page header; no OALP round-wise award tables, and MoPNG/PPAC gas-pricing pages were rejected/404.
- No year-wise CSR spend or destination lists for IOC, BPCL or HPCL could be opened (IOC redirected, BPCL 403, HPCL not attempted); GAIL's CSR page lists verticals and project PDFs but no ₹ totals.
- DIPAM's live strategic-disinvestment page carries no BPCL record; no primary notice of the 26 May 2022 withdrawal or the bidder list was opened.
- Indian Kanoon returns zero Supreme Court documents since 1 Jan 2025 matching Reliance/ONGC gas migration; the May 2026 SC orders on conciliation are known only from headlines.
- Searched for any documented finding that the BJP-era MoPNG shielded RIL in the KG-D6 dispute; found the opposite record: demand notice 2016, appeal 2023, DB win 2025, demand raised to USD 2.81 bn, 'theft' submission 2026.
- Nayara Energy's own press-release page (403), the EU Council press release (403), Reuters, Mint, NDTV and archive.org were all unreachable through the proxy.

**people**

- ICIJ Offshore Leaks database returned no readable content through the proxy (both WebFetch and curl); Vinod Adani's ICIJ entries could not be documented.
- No primary record (affidavit, annual report) of family business interests in energy was found for Piyush Goyal, Dharmendra Pradhan, Pralhad Joshi, R.K. Singh, Hardeep Puri, Manohar Lal Khattar or G. Kishan Reddy in the sources opened; their Wikipedia biographies carry none.
- No MEIL statement responding to the April 2024 CBI FIR was found.
- No published bid comparison or tender record for the Bihar Bhagalpur PSA was found; only press accounts of four bidders and Adani's L1 tariff.
- No Adani or Reliance promoter appears by name in the electoral-bond purchaser lists read here (top purchasers were Future Gaming, MEIL, Qwik Supply Chain, Vedanta, Haldia Energy, Bharti, Essel Mining, Torrent, Grasim).

**solarwind**

- No Indian agency finding on the US bribery allegation. SEBI's Sept 2025 orders concern Hindenburg-era RPT allegations; the CCI (Apr 2026), Delhi HC (Mar 2026) and Bombay HC (Mar 2026) documents DOJ cited were, per Judge Garaufis, decisions not to investigate. India did not serve the SEC's summonses for over a year (Oct 2025–Jan 2026).
- No competitive process on record for the Khavda park-developer selection of 24 Aug 2023; Adani's lease rate and security deposit not disclosed; MoD, Gujarat, MNRE and SECI did not answer Scroll/Guardian's questions.
- SECI did not respond to The Wire on whether internal documents reached Adani/Azure executives; no CVC/CBI inquiry into SECI is on record.
- MNRE publishes no per-company PLI disbursement figures for either tranche, and no commissioning status against the Oct 2024 / Apr 2025 / Apr 2026 milestones.
- PM Surya Ghar vendor-level installation data are not published; PM-KUSUM's official page carries targets but no achievement or state-wise figures.
- No opened record links SECI CMD R.P. Gupta's May 2025 termination to the Adani matter; the documented ground is the Reliance Power forged-guarantee episode.

**states**

- No Union cabinet reshuffle affecting the energy-relevant portfolios (Power, Coal, Mines, New & Renewable Energy, Petroleum & Natural Gas, Jal Shakti, Environment, Steel, Heavy Industries, Atomic Energy/PMO) between 2026-07-25 (the repo's cabinet.json stamp) and 2026-09-25 (today).
- No state energy/power minister or mines minister name was verified for any of the 20 resource states within this session's budget — only Chief Ministers are recorded.
- No specific opposition-state (Karnataka, Telangana, Tamil Nadu pre-2026, Kerala, Punjab, Jharkhand, Himachal Pradesh) equivalent to the Khavda-scale nominated land allocation, the Odisha discom privatisation, or the PEKB-style coal MDO arrangement was verified within budget — attempted fetches for a Karnataka JSW Energy pumped-storage MoU and a Telangana Congress-government review of BRS-era Greenko/PPA deals both returned no content (404).
- The task brief's specific figures for an Andhra Pradesh 7 GW SECI/Adani solar PPA (2021) could not be independently verified via any source opened this session (AP's three discom Wikipedia pages, the Gautam Adani and Adani Group Wikipedia pages, and two guessed article titles all returned no matching content or 404).
- No UP discom privatisation attempt (2024-25, Purvanchal/Dakshinanchal) could be verified — the Uttar Pradesh Power Corporation Ltd Wikipedia page, the only source checked, contains no privatisation content.
- Odisha Mining Corporation's Wikipedia page carries no documented 2019-2026 lease controversy, despite Odisha being a major iron-ore/chromite state with a live BJD→BJP transition in the window.

## Where figures disagree between files

| figure | reading A | reading B | note |
|---|---|---|---|
| commercial coal auction universe | 145 winning rows, commercial section (coal) | 133 blocks / 126 rows with vesting orders to 2026-04-07 (resources-coal) | coal notes: rows vs blocks. A third figure, 140 blocks in 14 tranches to May 2026, sits on the `min:ministry-of-coal` entity (MoC presentation of 21 May 2026). |
| single-bid coal allocations | 11 of 91 mines auctioned to Nov 2023 (coal, PIB 1975677) | — | not "11 of 140": the 140 is a later, larger universe |
| single-bid at 5.00% | "ten others at the same 5%" (coal narrative) | 7 of 11 (AUDIT `coal:c021`, from the same PIB table) | the Ministry's text contradicts its own table |
| Adani share of Khavda | ~44,500 / 72,600 ha after Aug 2023 ≈ 61% (solarwind, Scroll) | 19,000 / 49,400 ha of five named zones ≈ 38% (states, Wikipedia) | different dates and denominators; solarwind also has 19,000 / 72,600 at 2020 allotment |
| MEIL bonds to BJP | ₹584 cr (The Hindu, TNM) | ₹586 cr (Tribune) | money notes; recorded, not resolved |
| Qwik bonds to BJP | ₹375 cr (The Quint, The Hindu, date by date) | ₹385 cr (PTI wire via Mint headline) | AUDIT `oilgas:c051` |
| ICIJ Offshore Leaks | 200 reachable (DATA_SOURCES.md) | no readable content via WebFetch or curl (people) | host up; node pages not readable |
| sebi.gov.in | 403 (literature sweep) | order PDFs under `/sebi_data/attachdocs/` opened (enforce) | the block is path-specific; try the attachdocs PDF or the company's exchange intimation |
| AP 7 GW SECI PSA (2021-12-01) | recorded with the indictment text (solarwind, AUDIT) | "could not be independently verified" (states) | states did not open the indictment |
| Raosaheb Danve, start as MoS Mines | 2019-05-31 (Wikipedia ministry table) | 2021-07-07 (biography snippet) | mines gap; needs the Cabinet Secretariat notification |
| FT coal over-invoicing period | 2021–23 (Newslaundry) | Jan 2019–Aug 2021 (other coverage) | enforce gap; reconcile from the FT original |
