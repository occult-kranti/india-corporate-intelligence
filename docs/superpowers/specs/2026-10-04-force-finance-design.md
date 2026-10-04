# The money India spends on force — design

*Status: draft for review · 2026-10-04 · classification: architectural (one new research
fleet with three tabular series, one extension of the offline tender pipeline, a bounded
schema extension, one new page). Nothing below is built. Reconnaissance results are real
and dated; everything else is a proposal.*

## 0. What was asked, and what this document assumes

**Said (verbatim intent):** a page for military and police budget, for each city and state
and the extra departments; check tenders, funding and salaries; use skills, plugins and
sub-models to find connections.

**Assumed (correct me):**

1. "Military" means the Union defence establishment: the three services, the Coast Guard,
   DRDO, the defence public-sector undertakings (including the seven carved out of the
   Ordnance Factory Board in 2021), the Border Roads Organisation, Defence Estates and the
   defence pension bill. It is funded by the Union alone; no state or city has a defence
   budget. What *is* state- and city-resolved is the footprint — cantonments, plants,
   laboratories, command headquarters, defence land — and the orders that land in a
   state's companies.
2. "Police" means three distinct payers: the Union's own police (the central armed police
   forces, the Intelligence Bureau, the NSG, Delhi Police, the investigating agencies, the
   Modernisation of Police Forces and Security Related Expenditure grants to states), the
   state police funded from each state's budget (a State List subject), and the city
   commissionerates inside those state budgets. Only Delhi Police is a city police force
   with its own Union demand; every other city's police money sits inside its state's
   police head, and the page says so instead of inventing a city figure.
3. "Extra departments" means the bodies that carry force or its support and are usually
   left out of "police" headlines: Home Guards and Civil Defence, fire services, prisons,
   forensic laboratories, the Enforcement Directorate, the CBI, the NIA, the NCB, the SPG
   and the Cabinet Secretariat's intelligence lines.
4. "Tenders" means the CPPP award scrape already on disk (4.92 million rows), sliced to
   security buyers, plus the Defence Acquisition Council approvals and signed contracts the
   Ministry of Defence publishes through PIB. Defence capital acquisition is **not** on
   CPPP (it runs through the Defence Procurement Portal and the Defence Acquisition
   Procedure), so the CPPP slice is what the central armed police forces, state police,
   DPSUs and allied bodies buy in the open market, and the page says exactly that.
5. "Salaries" means pay and pensions as the largest line in every force budget: the Pay
   Commission matrix, Military Service Pay, the Agnipath terms, One Rank One Pension, the
   defence pension demand, and the salary share of state police spending. Individual
   salaries of named people are not in scope; pay *scales* are.
6. "Connections" means documented joins, each with a denominator and an innocent reading:
   vendors to buyers (awards), vendors to parties (electoral bonds), retired officers to
   boards (dated roles under the cooling-off rule), ministers to decisions (tenures), and
   force outcomes to force spending (rates over population and strength). It does not mean
   a conspiracy map, and no person is a beneficiary unless a primary record names them.
7. Success looks like: a `/security` page on three lenses (budgets, footprint, procurement
   and people), backed by one reconciled research fleet with three tabular series, the
   CPPP security slice, the same four invariants and gates, and the same evenhanded skeptic
   stance as `/energy`, `/welfare` and `/finance`.

## 1. Goals and non-goals

**Goals**

- G1. A sourced register of what the Union spends on defence and on its own police,
  FY2000-01 → FY2026-27, split into revenue, capital, pensions and pay where the demand
  publishes the split, by service and by force, as `budgets` rows with their source line.
- G2. A sourced register of what each state spends on police (RBI State Finances, state
  budgets, CAG) and of police strength by state and by commissionerate (BPR&D), with
  per-capita and per-lakh denominators, as `budgets` and `strength` rows.
- G3. A footprint register: every cantonment, DPSU plant, DRDO laboratory, command and
  CAPF headquarters, commissionerate, central prison and forensic laboratory that a
  primary record places in a state and a city, as `footprint` rows the map can paint.
- G4. A procurement register: DAC approvals and signed contracts since 2014 with vendor,
  category and ₹ crore where PIB names them; DPSU production and exports by year; the
  licensed private defence producers; the CPPP security slice as aggregates; electoral
  bonds bought by security vendors; retired officers' documented board roles — each with
  a cui-bono record and the boring explanation.
- G5. Pay and pensions as the largest line: the Pay Commission levels for the ranks, the
  Agnipath terms with both sides' stated case, OROP, and the pension share of the defence
  demand by year.
- G6. The big cases — Bofors, Tatra/BEML, AgustaWestland, Adarsh, Sukna, Rafale, Pegasus —
  as court and audit *records* with dates, outcomes and the strongest counter, never as
  narrative, and the narratives about them calibrated on the ladder.
- G7. One connection graph across all of it, with the controls run (the same lens on the
  previous government's decisions; DPSUs beside private vendors; BJP-run beside
  opposition-run states).

**Non-goals**

- No city police *budget* figures except Delhi: they are not published, and the page
  prints "inside the state's police head" rather than a number.
- No operational detail of any force (deployments, orders of battle, procurement under way
  that the Ministry has not announced). Only published budgets, published awards,
  published strength tables and published court records.
- No person nodes for serving officers below the rank at which the record is public
  (service chiefs, DGPs, commissioners, secretaries). No private individuals.
- No "corruption score", ranking or index. Rates over declared families only.
- No claim that a spending level is right or wrong. The page shows the figure, its
  denominator, the comparison set and who decided it.

## 2. Reconnaissance (probed 2026-10-04 through this session's proxy)

Probed live through this session's proxy by seven source-family probes, a completeness critic
and three fill probes (the full digest, with every URL and status, is the recon workflow's
output kept in the session scratchpad; the routes that worked are in the fleet SPEC). "000" is a
connection that never opened.

| Source | Reach | What it gives | Tier at ingest |
|---|---|---|---|
| indiabudget.gov.in — Expenditure Budget, Notes on Demands for Grants (MoD Demands 19–22: MoD Civil, Defence Services Revenue, Capital Outlay, Defence Pensions; MHA Demand 51 Police, 49 MHA, 50 Cabinet; Demand 35 Revenue (ED); Demand 74 Personnel (CBI); Demand 101 WCD (Nirbhaya)) | 200, text-extractable PDFs, one per demand per year, archive to FY1996-97 | Actual / BE / RE per line: revenue, capital, pensions, Pay & Allowances by service, the Agnipath head, each CAPF, IB, Delhi Police, J&K Police, SPG, NATGRID, MPF, SRE, Safe City, prisons and forensic modernisation. Demand numbers shift by year (MoD 20–27 in 2011-12; 19–22 from 2018-19) | documented |
| PRS Legislative Research — Demand for Grants analyses (Defence, Home Affairs, every year) and State Budget Analyses (every state, 2016-17 →) | 200 | Shares of expenditure, growth, CAPF vacancies, "district police" allocation per state | reported (secondary of documented tables) |
| SIPRI Military Expenditure (xlsx 1949–2025) and Arms Transfers fact sheets | 200 | India in US$, % GDP, % government spending; imports by supplier | reported (SIPRI estimates) |
| World Bank WDI API `MS.MIL.XPND.GD.ZS` | 200 JSON | % GDP series 1960–2024 (SIPRI-sourced) | reported |
| mha.gov.in — annual reports 2005-06 → 2024-25 (PDF), Detailed Demands for Grants (Finance Division page, to 2012-13), Parliament-answer PDF mirrors under `/MHA1/Par2017/pdfs/…` | 200 (the old `commoncontent` path is 404) | CAPF strength and vacancies, modernisation plans, Home Guards and Civil Defence, fire-service modernisation, prisons, forensic, attrition and suicides | documented |
| sansad.in — Lok Sabha questions JSON API (undocumented), `getFile` PDFs, elibrary DSpace API for committee reports | 200 / flaky (getFile 500 at times; RS APIs 504/400) | Parliament answers; Standing Committee reports | documented when the PDF resolves |
| PIB (curl only; WebFetch gets 403) | 200 | DAC approvals (date, service, items, aggregate ₹ crore), contracts signed with vendor names, Agnipath, OROP, production and export figures | documented (official release) |
| ddpmod.gov.in — Department of Defence Production annual reports (PDF) | 200 | Value of production by DPSU / private / ex-OFB, exports by year, licence counts, offsets discharged, corridor MoUs | documented |
| NCRB — Prison Statistics India 2023 (PDF), Crime in India volumes | 200 (year listing is client-rendered; direct PDF paths work) | Prison budget, expenditure and staff by state; custodial deaths and police firing | documented |
| RBI State Finances: A Study of Budgets — Appendix II (revenue expenditure by state, "iii) Police") and Appendix Table 5 | 200 for HTML tables with ≥ 6 s spacing and a cookie jar; rbidocs downloads 000; WAF 403/418 on bursts | Police revenue expenditure per state (₹ lakh) 2023-24 Accounts → 2025-26 BE; all-states Police series | documented |
| India Justice Report 2019–2025 (PDF) | 200 | Police spend per capita and per officer by state, vacancies, women's share | reported (compiled from BPR&D and budgets) |
| Department of Expenditure — 7th CPC report, pay rules, pay matrix; 8th CPC notification | 200 | Levels for every rank, MSP, fitment | documented |
| indiankanoon.org | 200 | Court records: Bofors (Delhi HC 2004, 2005), Rafale (SC 2018, 2019), Pegasus (SC 2021), Adarsh (Bombay HC 2016), Tatra recitals, Prakash Singh | documented |
| myneta.info / adrindia.org | 200 | SBI electoral-bond disclosure, donor-wise and party-wise | documented (SC-ordered disclosure, mirrored) |
| DGDE cantonments page, DRDO cluster pages, CRPF/CISF/NSG organisation pages, the ex-OFB companies' unit pages (AVNL, AWEIL, Yantra) | 200 | 61 cantonments (not 62), ~41 laboratories with addresses, zones and training centres, factory cities | documented |
| screener.in company pages (HAL, BEL, BDL, MDL, GRSE, BEML, MIDHANI, CSL, Data Patterns, Paras, MTAR, Astra, Zen, Solar, Bharat Forge) | 200 | Shareholding, links to filings | reported (aggregator) |
| Tofler (curl only) | 200 | Directors with DIN and tenure | documented (MCA-derived) |
| UP budget portal grant-wise PDFs (Grant 026 Police, 025 Prisons, 027 Civil Defence), 1999-2000 → 2026-27 | 200 (download CAPTCHA-gated on some pages) | The one large state whose primary police demand opened | documented |
| CPPP scrape on disk → `research/raw/cppp/security.json` | built | the security slice | reported (scrape; 40/40 pages gone) |
| BPR&D Data on Police Organisations (bprd.nic.in, bprd.gov.in) | **000** | — the only national table of state police strength, expenditure and commissionerates | void → PRS transcriptions, IJR, Drishti mirror of DoPO 2019 (reported); every DoPO figure carries `reported:` |
| CAG (cag.gov.in and every AG host) | **000** | — | void → CHRI mirror of Report 3 of 2019 (Rafale; 200), PRS summaries, elibrary catalogue |
| Service and MoD portals (mod.gov.in, indianarmy.nic.in, indiannavy.gov.in, mes.gov.in, desw.gov.in, joinindianarmy.nic.in), BSF/ITBP/SSB/Assam Rifles, NIA, NCB, CBI, DoPT, DGFSCDHG (TLS expired), DFSS | **000 / 403 / TLS** | — | void → ddpmod.gov.in, MHA annual reports, PIB, indiankanoon |
| openbudgetsindia.org | **dead** (301 to an unrelated mutual-fund domain; 520) | — | never cite; indiabudget PDFs instead |
| eci.gov.in bond disclosure | 406 | — | myneta mirror |
| Supreme Court judgment hosts (main.sci.gov.in, digiscr) | 000 | — | indiankanoon |
| State finance portals (Maharashtra flaky, Bihar, West Bengal, Karnataka, Tamil Nadu 000); city police sites (Bengaluru, Chennai, Kolkata, Hyderabad 000; Ahmedabad's old domain serves spam) | mostly **000** | — | PRS state analyses; Mumbai Police RTI disclosures (200); Delhi Police is a Union demand |
| GeM, MCA, data.gov.in API, web.archive.org, loksabhadocs, eparlib | **000 / 403** | — | known blocked |

**What resolves at which level (the critic's reading, which the page quotes).** At Union
level every rupee resolves to a line item with Actual, BE and RE back to FY2000-01. At state
level the Police major head resolves per state from RBI's HTML tables and PRS; strength,
vacancy and per-capita figures resolve per state only through secondaries while BPR&D is
unreachable, so they carry `reported:`; prisons resolve per state from NCRB; Home Guards, fire
and forensic resolve only as Union scheme totals and MHA narrative. At city level only Delhi
Police has a budget line; commissionerates have no published budget and, with BPR&D down, no
primary strength table either; the footprint (cantonments, laboratories, factories, zones,
training centres) resolves to cities from official lists. The page says so in these words.

### 2.1 First probe of the CPPP scrape for security buyers (not yet a finding)

Run on 2026-10-04 with duckdb over the two Arrow files already on disk (digests
`95e997785ecab0a9`, `d7663349efb13547`), raw rows before the dedup rule, a first-cut buyer
regex over `organisation_name` (defence, army, navy, air force, ordnance, DRDO, the DPSUs,
Coast Guard, BRO, cantonment, military, the CAPFs by name and acronym, police, home guard,
civil defence, fire, prisons, IB, NIA, NCB, ED, CBI, home affairs, forensic, BPR&D):

| fact | value |
|---|---|
| raw rows hit / distinct `tender_id` | 529,837 / 360,450 of 4,921,960 (10.8 %) |
| ₹ (plausible values, raw rows) | ≈ ₹3,47,690 crore |
| single-bidder rows / rows with a bid count | 13,025 / 476,505 = **2.7 %** — against 13.2 % for the whole file unresolved; the slice is dominated by works tenders with many bidders |
| the dominant buyer | E-in-C Branch, Military Engineer Services: 418,485 rows, ≈ ₹2,22,490 crore, 0.1 % single bidding |
| the next buyers | IHQ of MoD (Army) OSCC 64,773 rows · DRDO 10,441 (10.9 % single) · BRO 5,042 + 1,538 (8–19 %) · CRPF 2,703 (2.8 %) · ITBP 2,458 · BSF 2,153 (15.4 %) · BEL 1,818 · Indian Air Force 2,547 (**41.6 %** single) · Coast Guard 954 (42.5 %) · IHQ MoD (Navy) 1,022 (11–40 %) · NSG 332 (23.1 %) · Assam Rifles 634 · SSB 677 · CISF 224 · IB 123 · Munitions India 547 · Armoured Vehicles Nigam 355 · Goa Shipyard 332 (38.4 %) · Mazagon Dock 269 · Cochin Shipyard 336 · Hindustan Shipyard 166 · MIDHANI 135 · Yantra India 170 · Troop Comforts 81 · SVP National Police Academy 85 |
| the state portal | `organisation_name` is the state; police, prison, fire and forensic buyers must be read from the department code in `tender_id` with the pipeline's existing buyer rule — not probed in this first pass |
| what is NOT here | defence capital acquisition (DAC / Defence Procurement Portal); GeM purchases; most state police procurement (state portals vary) |

Two readings to carry, not conclude: the services' own headquarters buy with far fewer
bidders than the works branch does (Air Force 41.6 %, Coast Guard 42.5 %, Mazagon Dock
95.3 % on 182 rows), and single bidding within the slice is a fifth of the national rate
because one works buyer is 79 % of the slice. The quality table must split the slice by
buyer class (works · stores · DPSU · CAPF · police) before any rate is quoted.

## 3. Stance

The platform's stance is unchanged: skeptical, calibrated, evenhanded; who benefits, by
what mechanism, and what is the boring explanation. Five rules are specific to this
subject:

1. **Spending on force is a policy choice, not a scandal.** Every ₹ figure stands beside
   its denominator — share of GDP, share of the Union or state budget, per capita, per
   police officer — and beside its comparison set: other states for a state, other years
   for a year, SIPRI's peers for the country. A large number is not a finding; a number
   that moved when a decision was taken, with the decision-maker named and the innocent
   reading printed, is a question.
2. **Pay and pensions are contracts with people.** The Agnipath scheme changed the terms
   of a contract; the page records the old terms, the new terms, the Ministry's stated
   saving and the stated objections with identical fields. OROP likewise. No salary of a
   named person is recorded; pay *levels* are.
3. **Vendors are vendors.** HAL and Adani Defence, Mazagon Dock and L&T, BEL and Tata
   Advanced Systems carry identical fields: licence, orders with dates and ₹ crore where
   published, bonds bought, retired officers on the board with the date and the
   cooling-off rule as the law node. A private vendor is never shown alone; the DPSU that
   competes for the same category is always beside it. "Adani got defence contracts" is
   true, documented, and printed with the denominator (share of defence orders by value,
   by year) and the control (what L&T and Tata got in the same years).
4. **Outcomes are rates, not accusations.** Custodial deaths, police firings and
   encounters are recorded per state per year as rates over strength and population, from
   NCRB and Parliament answers, with the state's ruling party as text in the row and
   never as a colour or a filter; the symmetry check runs the same rate on states run by
   each party and prints the result whatever it says.
5. **Cases are records.** For each of the big cases the page prints the primary record —
   the court order, the CAG paragraph, the chargesheet — with its date and outcome, and the
   strongest counter from the other side. Bofors sits beside Rafale by design: one party's
   case is the other party's control. The narratives ("Rafale was a scam", "Bofors was
   buried", "Pegasus was used on the opposition") are rated on the ladder with their
   strongest counter and never drawn as edges.

## 4. Architecture

One fleet with three tabular series, one pipeline extension, one page.

```
research/raw/force/      ← fleet: union-defence, union-home, state-police, procurement-industry,
                            footprint, money-people, pay-pensions, literature
                            (claims + voids + narratives + base rates + symmetry, as every fleet;
                             PLUS three tabular series: budgets[], strength[], footprint[])
research/raw/cppp/       ← pipeline: security.json — the slice of the award scrape for security buyers
        │  RECONCILIATION.json + AUDIT.json, as today
        ▼
scripts/assemble-fleet.mjs  ← FLEETS row { key: 'force', prefixes: ['force'], series: {...} }
        │
        ▼
src/graph/force.generated.ts  (FORCE_NODES, FORCE_EDGES, …, FORCE_BUDGETS, FORCE_STRENGTH, FORCE_FOOTPRINT)
src/data/cppp.ts              (+ security.json accessor)
        │  mergeFleet
        ▼
/security (new)  ·  /network, /geograph, /tenders (new edges and one new block appear)
```

### 4.1 Schema extension (bounded, tested)

No new predicate: `award` (buyer → vendor), `role` (person → body, dated), `law` (rule →
class governed), `enforce` (court or auditor → subject; a ruling begins `Judicial ruling
on <claim id>:`), `bond` (vendor → party), `own` (state → DPSU), `contra`, `supersede`
and `analytic` cover every claim. Three **tabular series** are added as a generic
mechanism on the `FLEETS` row (`series: { budgets: BUDGET_KEYS, strength: STRENGTH_KEYS,
footprint: FOOTPRINT_KEYS }`); the assembler concatenates each named top-level array from
every file in the fleet directory, validates exact keys, types, financial-year labels,
state codes and sources, and emits `FORCE_BUDGETS`, `FORCE_STRENGTH`, `FORCE_FOOTPRINT`.
Validator §4 checks the shape at the quarantine boundary; §5 re-assembles.

```jsonc
// budgets[] — one row per payer × body × head × FY × stage
{ "payer": "union" | "<state code>", "body": "force:ministry-of-defence" | "force:crpf" | "force:up-police" | …,
  "head": "Defence Services (Revenue)" | "Capital Outlay on Defence Services" | "Defence Pensions" | "Police (MH 2055)" | …,
  "component": "total" | "revenue" | "capital" | "pension" | "pay" | "grant-to-states" | "other",
  "fy": "2024-25", "stage": "BE" | "RE" | "actual", "cr": 621940.85,
  "note": "…" | null, "srcs": [["label", "https://…"]] }
// strength[] — one row per body × year
{ "st": "mh" | null, "body": "force:maharashtra-police" | "force:mumbai-police" | "force:crpf",
  "year": 2023, "sanctioned": 232000, "actual": 196000, "perLakh": 155.3, "womenPct": 12.1,
  "note": "…" | null, "srcs": [["BPR&D DoPO 2023", "https://…"]] }
// footprint[] — one row per installation a primary record places
{ "id": "force:fp-pune-cantonment", "kind": "cantonment" | "dpsu-plant" | "drdo-lab" | "command-hq" | "capf-hq" | "commissionerate" | "prison" | "forensic-lab" | "training",
  "label": "Pune Cantonment", "body": "force:dgde", "st": "mh", "city": "Pune", "since": "1817" | null,
  "note": "…" | null, "srcs": [["DGDE cantonments list", "https://…"]] }
```

Money is ₹ crore as published (no conversion; the Union publishes in ₹). A row's `srcs`
is mandatory and must be a primary record (budget document, BPR&D table, RBI table,
official list) for `documented`; a press transcription of one makes the row `reported`
and the page says so in the caption. A `body` is an entity id defined in the fleet.

### 4.2 The CPPP security slice (`scripts/cppp/security.py`)

The same pipeline, the same dedup rule, the same provenance block, over the subset of
award decisions whose buyer or title matches a declared regex of security bodies (the
regex is printed in the output). It writes `research/raw/cppp/security.json`: the slice's
quality table, single-bidder rate with its interval beside the whole-file rate, value
bands, decision windows, buyer concentration, and the top marked winners per buyer under
the same naming rule (marker regex, ≥ 5 awards, at most five per buyer). It states in its
first field that defence capital acquisition is not on CPPP. Byte-identical rebuild; the
fixture gains security-named buyers so the tests exercise the slice.

### 4.3 The fleet (`research/raw/force/`)

Eight domain files, each written by one agent under `scratchpad/force/SPEC.md` and the
common contract, then cross-examined claim by claim, reconciled, audited and assembled:

| domain | what it writes |
|---|---|
| `union-defence` | budgets rows for every MoD demand FY2000-01→FY2026-27 (BE/RE/actual; revenue/capital/pension; pay where published); entities for the services, DRDO, DPSUs, BRO, Coast Guard, DGDE; `own` state → DPSU; base rates (defence as % GDP and % Union expenditure by year; SIPRI peers) |
| `union-home` | budgets rows for every MHA police line and the Cabinet Secretariat, ED, CBI, NIA, NCB, SPG lines; CAPF entities; MPF and SRE grants to states as `grant-to-states` rows by state where the answer gives them |
| `state-police` | budgets rows per state per FY (RBI MH 2055; state budgets for the five largest); strength rows per state and per commissionerate (BPR&D); outcome rates (NCRB custodial deaths, police firing, complaints) as base rates with the ruling party as text |
| `procurement-industry` | DAC approvals and signed contracts since 2014 as `award` claims where PIB names vendor and amount (else as facts on the buyer with the void stated); DPSU production and exports; licensed private producers; offsets; the corridors |
| `footprint` | footprint rows: 62 cantonments, DPSU plants, 50+ DRDO labs, command HQs, CAPF HQs and training centres, commissionerates, central prisons, forensic labs — each with state and city from a primary list |
| `money-people` | electoral bonds by security vendors (`bond`); retired officers' board roles (`role`, dated, with the cooling-off rule as the `law` node); ministers' tenures (reuse `pol:` ids); CAG audit paragraphs (`enforce`); the big cases as court records with counters |
| `pay-pensions` | Pay Commission levels for the ranks; MSP; Agnipath terms and the stated saving; OROP; defence pension budgets rows; salary share of state police spending; CAPF attrition and suicides as rates |
| `literature` | the annotated bibliography: SIPRI, IDSA/MP-IDSA, PRS analyses, Takshashila, CPR, Common Cause's Status of Policing in India reports, academic work on police strength and crime, the Agnipath debate; every citation opened |

### 4.4 The page: `/security` — "The money India spends on force"

Three lenses on one route (`?lens=budgets|footprint|procurement`), one filter rail (payer,
state, FY range, component), one live region, every graphic with a table twin, every
figure beside its denominator. Budgets: the Union defence and police demands as stacked
components by year with pensions and pay called out; state police spending per capita as a
choropleth with the no-data hatch; the per-lakh strength beside it; the Delhi Police line
as the one city budget. Footprint: the map of installations by kind with the city named
in the readout; the commissionerates as marks with strength, never money. Procurement and
people: DAC approvals by category and vendor class (DPSU / private / foreign) by year; the
CPPP security slice's single-bidder rate beside the whole file; the vendor cards with
identical fields; bonds; board roles with the cooling-off rule; the cases as a dated list
with record and counter; the narratives ladder; the symmetry section. Party is text. No
ranking, no score, no map of money by city. Renders honestly with zero rows.

## 5. Skills and agents

A `force-money-trail` skill written from what the fleet establishes (canonical ids,
denominators, the controls that must be shown, the retrieval routes that worked, the
failure modes) and a `security-analyst` agent that owns the fleet directory, the CPPP
security slice and the page's data layer, with explicit refusals: no operational detail,
no person below the public rank, no vendor shown alone, no rate without its family, no
city money that is not published.

## 6. Sequencing

H0 spec → H1 schema series + H2 CPPP slice (parallel, both TDD) → H3 fleet (eight agents,
two at a time; cross-examine; reconcile; assemble) → H4 page (design duel → UX review →
acceptance → RED → build → caucus → fix → verify 3× → WCAG; adjudication follow-up; suite
into `test:pages`) → H5 skill, agent, docs, full check, bundle.

## 7. Risks and what is done about them

- **False precision at city level.** Nothing invents a city budget. Delhi Police is the one
  city line; every other commissionerate shows strength, installations and "inside the
  state's police head".
- **Defamation by vendor list.** DAC approvals name categories more often than vendors;
  only PIB-named vendors are `award` edges, everything else is a fact on the buyer. The
  CPPP slice names nobody below the marker-and-frequency threshold.
- **Operational sensitivity.** Only published budgets, published lists and published
  records. No deployment, no order of battle, no unannounced procurement.
- **The cases as partisan ammunition.** Bofors and Rafale are recorded with identical
  fields and each is the other's control; the page refuses a party colour and prints the
  counter in the same type size as the claim.
- **Reachability.** indiabudget.gov.in, bprd.nic.in and ncrb.gov.in may block the proxy;
  PRS, openbudgetsindia.org, RBI and sansad.in are the secondary routes, and every row
  written from a secondary carries `reported` and the route in its note.
- **Scale.** Twenty-seven FYs × a dozen demands × three stages is a few thousand budget
  rows; they are transcribed by script where a CSV exists (Open Budgets India) and by hand
  from the PDF where it does not, with the page number in the source label.

## 8. Decisions taken under stated defaults

1. Route `/security`, nav label "Security spend", under Registers.
2. Fleet key `force`, prefix `force:` (the `sec:` prefix is taken by sector nodes).
3. Three tabular series as a generic `series` mechanism, not a one-off kind.
4. The CPPP slice is a sibling output of the existing pipeline, not a new pipeline.
5. The five largest states by police strength get budget rows from their own budget
   documents; every state gets RBI's MH 2055 figure.
6. The big cases are in scope as records; their narratives are in scope on the ladder;
   neither is an edge to a party.
