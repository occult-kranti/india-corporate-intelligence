# `force` fleet — SPEC (v0, 2026-10-04; the reachability table below is partial and is
# replaced by the reconnaissance workflow's table when it lands — probe before you trust)

## The question

What does India spend on force — defence, central armed police, state and city police,
intelligence and investigation, prisons and allied bodies — who is paid (pay, pensions),
who is awarded (procurement), where it sits (footprint by state and city), who decided
(ministers, dated), and who sits on both sides (vendors' bonds, retired officers' boards)?
Every figure beside its denominator and its comparison set. Spending is a policy choice,
not a scandal. Read `docs/superpowers/specs/2026-10-04-force-finance-design.md` §0–§4 and
`scratchpad/force/CONTRACT-force.md` before anything else.

## Controls (every domain runs the ones that apply and writes `symmetryCheck`)

- UPA-II (FY2009-10 → FY2013-14) beside NDA (FY2014-15 → FY2026-27) on the same line.
- BJP-run beside opposition-run states, same year, same rate (spend per capita, strength
  per lakh, vacancy share, custodial deaths per lakh officers). Party as text.
- A private vendor beside the DPSU competing in the same category, same years.
- Bofors beside Rafale; AgustaWestland beside Tatra/BEML — identical fields.
- Bonds from security vendors to the BJP beside bonds to Congress, TMC, BRS, DMK.

## Reachability (probed 2026-10-04 by the reconnaissance workflow — USE THESE ROUTES)

**Works, and is the spine for each domain:**
- **indiabudget.gov.in** — Notes on Demands for Grants PDFs, text-extractable (`pdftotext -layout`),
  one per demand per year, predictable paths: current year `https://www.indiabudget.gov.in/doc/eb/sbe<N>.pdf`,
  earlier years `https://www.indiabudget.gov.in/budget<YYYY-YY>/doc/eb/sbe<N>.pdf`, archive back to
  1996-97 under `budget_archive/ub<YYYY-YY>/`. 2026-27 numbers: Demand 19 MoD Civil, 20 Defence
  Services (Revenue), 21 Capital Outlay on Defence Services, 22 Defence Pensions, 51 Police (MHA),
  49 MHA, 50 Cabinet (NSCS, SPG-adjacent), 35 Department of Revenue (ED), 74 Personnel (CBI), 101 WCD
  (Nirbhaya). Numbers SHIFT by year (MoD was Demands 20–27 in 2011-12; pensions were 21 in 2019-20):
  read the first page of each file and record the demand number in `head`. Each file carries
  Actual (t-2), BE (t-1), RE (t-1), BE (t) — so one file per year yields rows for two FYs; prefer the
  later file's figure for a given FY/stage when two files disagree and record both in `note`.
  Pay & Allowances by service, the Agnipath head per service, capital by service (Actuals only),
  pensions by service, each CAPF, IB, Delhi Police, J&K Police, SPG, NATGRID, MPF/CCTNS, SRE,
  Safe City, Modernisation of Prisons and of Forensic Capacities are all separate lines.
- **mha.gov.in** — annual reports 2005-06 → 2024-25 (`/en/documents/annual-reports`, PDFs up to
  23 MB, text-extractable), Detailed Demands for Grants on the Finance Division page (to 2012-13),
  and Parliament-answer PDF mirrors under `https://www.mha.gov.in/MHA1/Par2017/pdfs/par<YYYY>-pdfs/…`
  (find them by web search on the question subject). The old `/en/commoncontent` path is 404.
- **PIB** — `curl` through the proxy (WebFetch gets 403): `https://www.pib.gov.in/PressReleasePage.aspx?PRID=<id>`,
  body in `div.innner-page-main-about-us-content-right-part`. DAC approvals, contracts signed,
  Agnipath (PRID 1833747), OROP (PRID 1886168), year-end reviews, production and exports.
- **ddpmod.gov.in** — Department of Defence Production annual reports (PDF, text layer) for value of
  production by DPSU / private / ex-OFB, exports by year, licence counts, offsets, corridors.
- **PRS** — DFG analyses for Defence and Home Affairs every year (HTML + PDF), state budget analyses
  for every state 2016-17 → 2026-27 ("district police" line, share of expenditure). `reported:`.
- **SIPRI** — `SIPRI-Milex-data-1949-2025_v1.2.xlsx` (200) and arms-transfer fact sheets (PDF).
  **World Bank WDI** `https://api.worldbank.org/v2/country/IND/indicator/MS.MIL.XPND.GD.ZS?format=json&per_page=100`.
- **RBI State Finances** HTML tables (`rbi.org.in/Scripts/PublicationsView.aspx?id=23755…23762` for
  Appendix II revenue expenditure by state, row "iii) Police", ₹ lakh; Appendix Table 5 all-states
  Police): fetch with ≥ 6 s spacing and a cookie jar; bursts get 403/418; rbidocs file downloads are
  000. A cached copy of id 23758 sits at `scratchpad/rbi_a2.html`.
- **NCRB** — Prison Statistics India 2023 PDF `https://www.ncrb.gov.in/uploads/files/PSI-2023.pdf`
  (budget, expenditure, staff by state); Crime in India 2022 Book 1 PDF (custodial deaths, police
  firing); the year listing pages are client-rendered — use direct PDF paths.
- **India Justice Report** 2019/2020/2022/2025 PDFs (`indiajusticereport.org/files/…`): per-capita
  police spend, spend per officer, vacancies, women's share by state. `reported:`.
- **Department of Expenditure** — 7th CPC report (7.5 MB) and pay rules; 8th CPC notification.
- **indiankanoon.org** — every court record (Bofors 2004/2005, Rafale SC 2018/2019, Pegasus 2021,
  Adarsh Bombay HC 2016, Prakash Singh 2006). **myneta.info / adrindia.org** — bonds.
- **DGDE** `https://dgde.gov.in/en/cantonments/` (61 cantonments), **DRDO** cluster pages
  (`/drdo/en/organisation/technology-cluster/*`, addresses per lab), **CRPF** zone pages, **CISF**
  `organisation_structure.php`, **NSG** about pages, **AVNL / AWEIL / Yantra** unit pages.
- **screener.in** company pages (200) for DPSU and vendor shareholding and filing links; **Tofler**
  via curl (directors with DIN). **UP budget portal** `https://budget.up.nic.in/GrantWisepdf.html`
  (Grant 026 Police, 025 Prisons, 027 Civil Defence; PDFs `PDF<yy_yy>/Gr26.pdf`, 1999-2000 →).
- **sansad.in** Lok Sabha question JSON API
  `https://sansad.in/api_ls/question/qetFilteredQuestionsAns?loksabhaNo=18&sessionNumber=<n>&pageNo=<p>&pageSize=100`
  (filter client-side by ministry); `getFile` PDFs are flaky (500); `elibrary.sansad.in` DSpace API
  for Standing Committee reports.

**Blocked — record the void and use the named secondary:**
- BPR&D Data on Police Organisations (bprd.nic.in, bprd.gov.in): 000 everywhere → PRS DFG Home
  Affairs footnotes and the Police Reforms paper, IJR, the Drishti mirror of DoPO 2019
  (`https://www.drishtiias.com/pdf/1616065259-data-on-police-organisations-bprd.pdf`). EVERY strength or
  state-spend figure that originates in DoPO is `reported:` in `note`.
- CAG (every host): 000 → CHRI mirror of Report No. 3 of 2019 (Rafale, 959 KB), PRS summaries,
  elibrary.sansad.in catalogue entries; say "report number from catalogue; PDF unreachable".
- mod.gov.in, desw.gov.in, indianarmy.nic.in, indiannavy.gov.in, mes.gov.in, joinindianarmy.nic.in,
  BSF (403), ITBP, SSB, Assam Rifles, NIA, NCB, CBI, DoPT, DFSS, DGFSCDHG (TLS expired — never
  disable verification): void → ddpmod.gov.in, MHA annual reports, PIB, indiankanoon.
- openbudgetsindia.org is DEAD (redirects to an unrelated domain) and ahmedabadcitypolice.org serves
  spam: never cite either. eci.gov.in 406 → myneta. Supreme Court PDF hosts 000 → indiankanoon.
- State finance portals (Maharashtra flaky; Bihar, West Bengal, Karnataka, Tamil Nadu 000) → PRS
  state analyses; city police sites other than Mumbai (RTI disclosures 200) → void: a city police
  budget other than Delhi is NOT published — write the void, never a number.
- GeM, MCA, data.gov.in API, web.archive.org, loksabhadocs, eparlib: known blocked.

**Three levels of resolution — say it in these words on every file's `scope`:** Union money
resolves to the line item; state money resolves to the Police major head per state (and prisons
per state from NCRB), with strength and per-capita figures `reported:` while BPR&D is down; city
money does not exist outside Delhi Police, and city strength has no primary while BPR&D is down —
cities get the footprint (installations, commissionerate entities with `reported:` strength) and
the void.

## Today's CPPP probe (raw rows, first-cut regex) — leads, not findings

529,837 of 4,921,960 rows hit a security-buyer regex (10.8 %), ≈ ₹3.48 lakh crore; single
bidding 2.7 % of rows with a bid count against 13.2 % for the whole file, because the
Military Engineer Services (works) is 79 % of the slice at 0.1 %; the services' own
headquarters buy with far fewer bidders (Air Force 41.6 %, Coast Guard 42.5 %, Mazagon Dock
95.3 % on 182 rows). The slice splits by buyer class before any rate is quoted.

## Ids to coordinate on (define once; every domain uses these exact ids)

min:ministry-of-defence · min:ministry-of-home-affairs · force:indian-army · force:indian-navy ·
force:indian-air-force · force:drdo · force:integrated-defence-staff · force:bro ·
force:indian-coast-guard · force:dgde · force:crpf · force:bsf · force:cisf · force:itbp ·
force:ssb · force:assam-rifles · force:nsg · force:delhi-police · force:intelligence-bureau ·
force:nia · force:ncb · force:enforcement-directorate · force:cbi · force:spg ·
force:cabinet-secretariat · force:mpf-scheme · force:sre-scheme · force:agnipath ·
force:orop · force:7th-cpc · force:cooling-off-rule · force:dap-2020 · force:ofb (the
Ordnance Factory Board, dissolved 2021) · force:<state>-police (two-letter state code:
force:up-police, force:mh-police …) · force:<city>-police for commissionerates
(force:mumbai-police, force:bengaluru-police …) · force:<state>-prisons · force:bprd ·
force:ncrb · force:dfss · force:case-bofors · force:case-rafale · force:case-agustawestland ·
force:case-tatra · force:case-adarsh · force:case-sukna · force:case-pegasus. Listed DPSUs
and vendors: the `co:` id from the inventory when present (co:bharat-electronics,
co:mazagon-dock, co:larsen-toubro, co:bharat-forge, co:solar-industries, co:mahindra-mahindra);
otherwise force:<slug> (force:hal only if co:hindustan-aeronautics is absent from the inventory —
check). Ministers: pol:rajnath-singh, pol:amit-shah and the other pol: ids in the inventory;
new ones per:<slug> with identity.office dated.

## Routes the fill probes added (2026-10-04, after the critic) — use them

- **Union → state transfers (union-home, state-police):** MHA Annual Report 2024-25 annexures
  (PDF p. 374 Annexure IV SRE-NE by state and year; p. 405 Annexure XIX MPF/ASUMP releases by
  state category and year); LS UQ 494 of 06.02.2024 and LS UQ 4862 of 01.04.2025 (MHA Par2017
  mirror: `/MHA1/Par2017/pdfs/par2024-pdfs/LS06022024/494.pdf`, `/par2025-pdfs/LS01042025/4862.pdf`)
  carry state-wise ASUMP allocation, release and utilisation; RS UQ 1829 of 11.12.2024 LWE
  capacity-building releases; the ASUMP scheme note
  `https://www.mha.gov.in/sites/default/files/2022-11/AnnexureVIModernisationPolice_13062022%5B1%5D.pdf`;
  RS Standing Committee Report 242 (20 Mar 2023) para 4.10: ₹49,912.37 cr outstanding against
  states for CAPF deployment as on 1 Oct 2022 (`sansad.in/getFile/rsnew/Committee_site/Committee_File/ReportFile/15/169/242_2023_6_17.pdf?source=rajya`);
  the 6 Sep 2019 deployment-charge policy via press (Sentinel Assam 28 Aug 2021). Expenditure
  Profile Statement 18 (transfers to states) and Statement 22 (`/doc/eb/stat22.pdf`: MHA Police
  establishment actual strength 11,01,452 on 1 Mar 2025, pay actual 2024-25 ₹53,737.04 cr).
  Denominators: NCRB Crime in India 2022 Vol I mid-year projected population by state; the
  RGI Technical Group 2011–36 projections (NHM mirror
  `https://nhm.gov.in/New_Updates_2018/Report_Population_Projection_2019.pdf`); 15th Finance
  Commission Vol I Ch. 11 (fincomindia.nic.in, 200). PRS DFG Home 2025-26 Table 15 and 2026-27
  Table 22 carry police per lakh by state (from DoPO, `reported:`). IJR-4 indicator XLSX via
  `https://indiajusticereport.org/api/method/ijr.api.download?file_id=6e91506c8f`.
- **UTs and J&K (union-home, state-police):** UT demands shift numbers every year — read the
  first page: 2026-27 Demand 52 A&N, 53 Chandigarh, 54 DNH&DD, 55 Ladakh (its police sits here,
  not in 51), 56 Lakshadweep, 57 Transfers to Delhi, 58 Transfers to J&K, 59 Transfers to
  Puducherry; J&K Police is item 6 of Demand 51 from BE 2024-25 (9,789.42 cr) — before that the
  UT budget passed by Parliament through Appropriation Bills (not on indiabudget). The five small
  UT demands carry no separate police/jail/fire row (void; one small capital scheme each). Delhi:
  Delhi Police is a Union line; GNCTD's own fire, prisons, Home Guards lines surface only in
  press (void). PRS J&K budget analyses 2016-17 → 2018-19 for the state years.
- **Defence Estates, Coast Guard, BRO (union-defence, footprint):** Demand 19 MoD (Civil) SBE
  carries Coast Guard, BRO, DGDE, J&K Light Infantry, AFT lines; Standing Committee on Defence
  18th LS Reports 1 and 7 (`sansad.in/getFile/lsscommittee/Defence/18_Defence_1.pdf?source=loksabhadocs`,
  `18_Defence_7.pdf`) cover BRO, Coast Guard, Defence Estates; DGDE Annual Administrative Report
  2023-24 (7.8 MB, `https://cdnbbsr.s3waas.gov.in/s30f46c64b74a6c964c674853a89796c8e/uploads/2025/03/20250313722768798.pdf`)
  and back-issues 2011-12 → 2020-21 for defence land by state and cantonment data; LS UQ 2249 of
  12.12.2025 "Status of Defence Land" via the eLibrary bitstream; PIB relid 191683 (2019,
  encroachment of defence land); PRS summary of PAC 89th Report (2013) for the 2010 CAG audit's
  findings; bro.gov.in 200 (www. is 000); indiancoastguard.gov.in 000.
- **Manpower and exports (pay-pensions, procurement-industry):** Standing Committee on Defence
  18th LS 2nd and 8th Reports (`18_Defence_2.pdf`, `18_Defence_8.pdf`): Army JCO/OR authorised
  11,97,520 / held 11,05,110 as on 1 Oct 2024; IAF officers 11,916 of 12,929; Navy headcounts with
  Agniveer sub-counts; "1,23,000 Agniveers enrolled" (oral evidence 2025). Demand 20 Agnipath
  sub-heads per service. PIB exports: PRID 2117348 (₹23,622 cr FY2024-25: private ₹15,233 cr,
  DPSUs ₹8,389 cr), 2248124 (₹38,424 cr FY2025-26), production 2154551 / 2273824, backgrounder
  2191937. DDP dashboard public API `https://api.ddpdashboard.gov.in/ddp-production/get-all-ddp-production`
  (200 JSON). NSE annual-reports API `https://www.nseindia.com/api/annual-reports?index=equities&symbol=BEL`
  (200 JSON with Accept: application/json) → DPSU annual report PDFs. DPIIT Press Note 11 (2019)
  licence list and a sample "industrial licences issued" PDF under `dpiit.gov.in/static/uploads/`.
  The Government has declined armed-forces vacancy data since 2019 citing security (The Wire) —
  record as a void with the reason. LS question-list API per sitting:
  `https://sansad.in/api_ls/question/getQuestionListBySession?locale=en&loksabha=18&session=VIII&quesDate=21/07/2026`
  (session as a Roman numeral).
- **State allied bodies (state-police):** RBI Appendix II prints Administrative Services as five
  rows (Police is iii; Jails sit inside "Others"); NCRB PSI 2023 Tables 12.1–12.4 and 11.1–11.5
  (prison budget, expenditure, inmate spend, staff by state; all-India budget FY2023-24
  ₹10,035.6 cr, actual ₹8,834.6 cr); MHA AR 2024-25 Ch. 9 (Civil Defence, Home Guards, fire —
  15th FC ₹5,000 cr fire modernisation window, 18 states' proposals ₹3,267.01 cr approved) and
  Ch. 14 (prisons, forensic); Demand 51 Modernisation of Prisons (actual 2024-25 ₹43.62 cr) and
  of Forensic Capacities (₹148.55 cr); police housing corporations (Delhi's annual reports on
  dphcl.com with CIN; Maharashtra and UP on their GePNIC portals; TN CSR policy with CIN; Karnataka
  a postback shell); Maharashtra Police Welfare Fund Rules via yavatmalpolice.gov.in. State-wise
  Home Guard strength: void (BPR&D) — write the void. DGFSCDHG: TLS expired — void.
