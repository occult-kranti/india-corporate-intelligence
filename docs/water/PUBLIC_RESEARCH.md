# Public water evidence and measurement audit

Research date: **6 October 2026**. Requested publication window: **6 October 2021–6 October 2026**. Public payload: `research/raw/water/public-research.json` (working original `/workspace/water-public-research.json`). This is a finite, source-backed collection, not a claim to have read every document or covered every locality.

## What is actually covered

- **19 curated sources**, **301 observations**, **six investigation leads** and **17 named localities**.
- JJM Format J3: all **34 rural state/UT rows** exposed in the **27 July 2026** snapshot. Delhi and Chandigarh are absent and are not assigned zero.
- JJM Functionality Assessment 2024: **34 state/UT rows plus India**, with four separately labelled measures per row.
- **15 selected urban local bodies** from AMRUT 2.0 outputs dated **9 July 2026**. Their counts are programme-provided household connections, not total city connections or percentages.
- One precisely identified historical village audit example: **Hebbal, Shirahatti taluk, Gadag district, Karnataka**. Official JJM village discovery is linked for other localities; no unvisited village records are fabricated.
- CGWB 2025 national resource estimates and assessment categories. An all-state groundwater table was not extracted.
- Official CPPP/eProcure and GeM discovery routes. No complete water tender/award register is claimed.
- Two dated Bengaluru stakeholder reports supply qualitative discussion. They are not representative surveys.

## Round one: measurement decisions

### A household tap is not proof of full service

Keep administrative tap connections, working taps, scheduled regularity, measured quantity, tested water quality and reported/certified Har Ghar Jal statuses separate. Do not use one as the other or subtract percentages with different denominators and years.

[JJM Format J3](https://ejalshakti.gov.in/JJM/JJMReports/Physical/JJMRpt_StateWiseTapConnection.aspx) has both all-rural-household and PWS-village-household denominators. The imported “households with taps” field belongs to PWS villages. Household values are published in lakh, rounded to two decimal places. A source zero for pending connections is a reported zero, not proof that every connection supplies safe water.

The retrieved snapshot says 27 July 2026. Retrieval on 6 October does not make it an October measurement. Dashboard placeholder zeros were not imported.

### The published functionality index is a minimum of marginal percentages

The original [National Functionality Assessment 2024](https://jaljeevanmission.gov.in/sites/default/files/2025-12/FHTC_National%20Report%202024.pdf) is the deciding source:

- PDF page 52 (printed page 36), section 4.7, states that quality was sampled in two households per source and quantity in one household per habitation. The design cannot always determine the household/population meeting all three criteria simultaneously.
- The report therefore takes the **minimum of regularity, quantity and quality percentages**.
- PDF page 54 (printed page 38), Table 6, explicitly labels the formula **D = Min(A, B, C)**.
- India: regularity **83.6%**, tested household quality **76.0%**, quantity at least 55 LPCD **80.2%**, published minimum index **76.0%**.
- The imported label is **Published functionality index (minimum of three marginal percentages)**, with measure `other`. It must not be interpreted as an observed joint household success rate.

The survey covers **19,812 Har Ghar Jal villages, 237,608 households and 761 districts across 34 states/UTs**. Selected Har Ghar Jal villages are not all rural villages. The 2026 [parliamentary release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2220145&lang=1&reg=1) provides a concise summary but does not replace the original methodology.

### Household quality and source-water chemistry are separate samples

PDF page 49 (printed page 33) says samples came from households reporting working taps. Household tests measured **E. coli, total coliform and on-site pH**. Source-water samples were tested chemically and analysed separately.

The Table 6 household-quality percentage is therefore not a complete BIS chemical-safety certificate and cannot establish absence of arsenic or fluoride. The dashboard should not imply the entire report omitted source chemistry; it should say the **displayed household-quality series** excludes that separate sample.

[WQMIS reports](https://ejalshakti.gov.in/WQMIS/Main/report) are linked for parameter-specific testing and remedial action. No contaminated-habitation counts were imported. Blank or inaccessible results mean unknown, not safe.

The [30 July 2026 policy response](https://www.pib.gov.in/PressReleasePage.aspx?lang=1&PRID=2291858&reg=3) describes interim arsenic/fluoride purification at **8–10 LPCD for drinking and cooking**. This is not the same service benchmark as 55 LPCD household supply, nor proof of a particular locality's installation.

### Groundwater quantity categories are not water-safety categories

The [CGWB 2025 official release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2220203&lang=2&reg=48) gives annual recharge **448.52 BCM**, extractable resources **407.75 BCM**, extraction **247.22 BCM** and extraction stage **60.63%**. The extraction-stage denominator is extractable resources, not recharge.

The **6,762 assessment units** comprise 4,946 safe, 758 semi-critical, 201 critical, 730 over-exploited and 127 saline units. “Safe” is an extraction-stage category, not a drinking-water-quality assurance. Assessment units generally mean blocks, tehsils, talukas or mandals, not individual villages.

Extraction includes irrigation, domestic and industrial demand. Local agricultural or drinking-water effects require matched aquifer/assessment boundaries, seasonal data and sectoral extraction. National averages do not prove a particular village's scarcity or crop loss.

[India-WRIS documentation](https://cwc.gov.in/water-resources-information-system-wris), the [National Water Data Portal](https://nwdp.nwic.gov.in/en/about/nwicwaterdata) and the [CGWB repository](http://cgwb.gov.in/cgwbpnm/) provide discovery routes. Station availability does not mean every village is measured.

## Audit findings and counter-evidence

### Hebbal, Gadag: reported status and completion differed in 2024

[CAG Karnataka Report No. 12 of 2025](https://cag.gov.in/en/audit-report/download/124685), section 3.3.1, printed pages 17–18, records incomplete works in Hebbal, Shirahatti taluk, Gadag, during 2024 despite Har Ghar Jal **reported** status. This is distinct from certified status.

Government's May 2025 response says the elevated reservoir was completed by 8 April 2025, with 200 metres of pipeline and 20 FHTCs remaining before certification and trial run. The case is a dated audit observation, not proof of current 2026 failure or criminal intent.

Follow-up: request the subsequent completion certificate, Gram Sabha certification, trial-run report and dated household service checks. These could resolve or revise the historical finding.

The same report's section 3.5 describes 33 tenders worth ₹251.75 crore published or awarded after the extended 31 March 2024 tender-award deadline. Government cited timely administrative approvals but non-participation and repeat tender calls. CAG replied that only 13 of the 33 tenders were recalled, so this did not fully explain the delay; central-share eligibility remained unanswered. Tender value, awarded amount, expenditure and commissioned output remain different measures. Contract IDs and date histories are required before any stronger inference.

### Kerala: installed connections and service in an audit sample

[CAG Kerala Chapter IV](https://cag.gov.in/uploads/download_audit_report/2025/9.Chapter-IV---Implementation-of-Schemes-0699d4ee539fc57.51076092.pdf), section 4.1, reports **122 of 342 surveyed beneficiaries** describing absent, limited or infrequent supply, and **2,726 of 5,318 works** completed as at November 2024.

Government's June 2025 response cites 21 lakh additional taps in four years, metering/billing, longer gestation for larger schemes, land acquisition, coordination and fund flow, with revised planning for the extended 2028 deadline. The sample is not a statewide failure percentage.

The audit period includes 2019–24, so some underlying observations predate the requested five-year window. Exact publication dates were not established for either CAG report. Their report years/archive folders are not silently converted to publication days. Historical periods and response dates remain visible.

Direct CAG PDF downloads returned HTTP 503. Indexed primary-document text, including the cited responses, was available through Exa and reviewed. Retrieval limitations are retained in source records.

## Procurement and discussion boundaries

[Government eProcurement advanced search](https://www.etenders.gov.in/eprocure/app?page=FrontEndAdvancedSearch&service=page) and [GeM bids](https://bidplus.gem.gov.in/all-bids) are discovery links only. No hydrated national water award records were imported. The eProcure form has interactive filters/CAPTCHA; none were bypassed. A page refreshed in 2026 can contain older tender notices. Notice date, corrigendum date, award date and payment date must be checked separately.

Bengaluru perspectives:

- [The Hindu, 6 August 2024](https://www.thehindu.com/news/cities/bangalore/many-bengaluru-apartments-continue-water-conservation-measures-post-the-crisis-period/article68460057.ece): resident associations and apartment federation discuss ongoing conservation after the acute shortage.
- [Down To Earth, 17 August 2024](https://www.downtoearth.org.in/water/bengaluru-after-day-zero-citys-government-people-took-water-scarcity-head-on-will-convert-crisis-into-opportunity): interview with BWSSB chairman on utility response.

These are reported stakeholder voices, not independently verified citywide measurement. Sensational headline language, unsupported numerical claims and safety conclusions from reuse anecdotes are not imported.

## Round two: independent extraction checks

- All **35 Table 6 rows / 140 percentages** were extracted from the original PDF. Each published index equals the minimum of its other three columns.
- The **34 Format J3 village counts** sum to the source total **586,054**. Rounded household counts are not forced into artificial exact reconciliation.
- All five CGWB categories sum to **6,762** assessment units.
- All **15 selected AMRUT ULB values** were checked against original PDF row/page locators. The full 27-page file also contains other outcome tables; those were not mislabeled as household tap connections.
- Source IDs, observation links, units, reference dates, absent jurisdictions and qualitative-only localities were checked in the raw payload.
- The final application dataset passed an independent integration check: all **301 public observations** preserve values, units, periods, source IDs, state codes, scopes and limitations. Marginals map to separate supply-regularity / supply-quantity measures; the minimum index remains `other`.
- Reproducible source audit: `python scripts/water/audit-public-source.py`. It checks **272 original J3 numeric cells**, **140 original survey percentages**, **15 original AMRUT values** and all 301 imports. It passed on 6 October 2026.
- A final source reread corrected the procurement milestone to the **extended tender-award deadline**, retained CAG's rejoinder about 13 recalled tenders, and clarified that source-water chemical tests were analysed separately from Table 6 household quality. The corrected wording is present in the curated dataset.

## Retrieval accounting and reproducibility

Nine diverse Exa searches requested **57 result slots**. The legacy `sources_reviewed` field records these slots, not 57 complete documents. Twenty-five distinct URL extracts were attempted through Exa (including an alternate CAG download URL); the original 2024 functionality PDF added one further unique direct URL. Not every extraction had substantive content: CPPP root was a shell, WQMIS counters were unhydrated, and the 2024 CGWB PDF extract exposed mainly its cover. These were not promoted to numeric evidence.

Nineteen sources were selected. Review depth was relevant table/method/result/response sections, not an assertion of complete document reading.

Original downloads:

| File | Bytes | SHA-256 |
|---|---:|---|
| AMRUT outcomes, 27 pages | 851,311 | `8e594f8143761e496a4c953a32ea21da7614ae114670bfbb9b6440edb10a1300` |
| JJM 2024 functionality, 116 pages | 22,590,166 | `7d1f1ba033e6231db4add5fad944aedbefceb554a8261896932485ac7ddbe2bd` |

The local evidence directory `/workspace/water-public-evidence/` holds downloaded files, pypdf text, retrieval failures, J3 indexed snapshot and indexed extracts. A smaller **derived excerpt** contains original JJM PDF pages 18, 49, 52 and 54; its manifest identifies it as an excerpt and preserves the original hash. The full 22.6 MB binary need not be committed to reproduce the selected table and methodology.

The data assembler owns `research/raw/water/public-research.json`; this author owns this methodological audit. Raw evidence is retained to support later dated updates rather than silently overwriting historical claims.
