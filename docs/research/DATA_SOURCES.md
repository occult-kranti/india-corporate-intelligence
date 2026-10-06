# Open data sources for the graph

Three sweeps: the energy and natural-resources audit of 2026-09-25 (below), the Phase G
sweep of 2026-09-26 for foreign loans, NGOs, foreign capital and the national tender record,
and the Phase H sweep of 2026-10-04 to 06 for defence, police and security money (the last
section). Audited from the sandbox. Reachability tested with `curl` through the
agent proxy (`$HTTPS_PROXY`, CA bundle `/root/.ccr/ca-bundle.crt`); "blocked" means
the proxy or the host itself refused the connection during this session, not that
the source is unavailable in general — re-test before relying on a "blocked" mark.
Predicates and tiers refer to `energy/SPEC.md` (`award`, `own`, `role`, `law`,
`enforce`, `csr`, `bond`/`trust`/`direct`/`pmin`/`pmout`, `hq`, `listed`, `sector`,
`contra`, `analytic`).

## Reachability sweep (this session)

| host | result |
|---|---|
| globalenergymonitor.org | 200 reachable |
| datasets.wri.org | 200 reachable |
| github.com (raw GPPD repo) | 200 reachable |
| cea.nic.in | 200 reachable |
| npp.gov.in | 302 → `/landing-home`, reachable |
| mnre.gov.in | 200 reachable |
| praapti.in | 200 reachable |
| coal.nic.in | 200 reachable (specific auction-results path 404'd — path guess wrong, portal itself is up) |
| coalindia.in | **blocked** — proxy CONNECT rejected with 502 ("policy denial or upstream failure") |
| parivesh.nic.in | 200 reachable |
| csr.gov.in | reachable but flaky — TLS handshake failed once, a retry returned 307; treat as intermittently reachable |
| mca.gov.in | **blocked** — proxy relay log shows `ws_closed_mid_exchange` on `www.mca.gov.in:443` (confirms the known block) |
| zaubacorp.com | 403 (bot-blocked, not proxy-blocked — likely a WAF challenge) |
| tofler.in | 301 reachable |
| opencorporates.com | 403 (bot-blocked) |
| myneta.info | 200 reachable |
| adrindia.org | 200 reachable |
| prsindia.org | 200 reachable |
| sansad.in | 302 → `/phistory`, reachable |
| query.wikidata.org | 200 reachable, **SPARQL query tested and returned results** |
| opensanctions.org | 307; API root reachable, returns `{"detail":"No API key provided."}` — needs a (free) API key |
| offshoreleaks.icij.org | 200 reachable |
| sebi.gov.in | 301 reachable |
| nseindia.com | reachable but the site's own anti-bot layer resets non-browser HTTP/2 clients — needs browser-like headers/session cookie, not a proxy block |
| bseindia.com | 302 reachable |
| screener.in | 301 reachable |
| indiankanoon.org | 200 reachable |
| eci.gov.in | 302 — **reachable at the proxy level in this test**, contradicts the "known blocked" note; likely blocked only for specific deep paths (e-donation/bond pages) rather than the host — re-verify the exact URL you need before relying on it |
| niftyindices.com | **blocked** — connection timed out (confirms the known block) |
| api.github.com | reachable in this test (200, empty JSON body `{}` — likely rate-limited/anonymous) — treat the "known blocked" note as host- or endpoint-specific, re-test the exact call you need |

Practical takeaway: **coalindia.in and mca.gov.in are genuinely blocked at the proxy**;
**niftyindices.com** times out. `eci.gov.in` and `api.github.com` answered basic
`GET /` in this session — don't assume blocked without testing the specific path you
need (ECI's bond-disclosure sub-pages are the ones historically reported as blocked).
NSE/zauba/opencorporates fail their own bot defenses, not the proxy — a browser-header
retry or a mirror (screener.in for NSE/BSE filings, Tofler for MCA data) is the
practical workaround, not a proxy fix.

## Source table

| Source | Publisher | Licence (verbatim where found) | Format | Coverage | Refresh | Reachable | Predicate(s) / tier |
|---|---|---|---|---|---|---|---|
| Global Coal Plant Tracker | Global Energy Monitor (GEM) | "All Global Energy Monitor tracker data are freely available under a Creative Commons Attribution 4.0 International Public License unless otherwise noted." | XLSX/CSV via Google Sheets + GEM.wiki pages | All coal units ≥30MW worldwide: operating, proposed since 2010, retired since 2000, incl. owner/operator chains, capacity, coordinates, status | Updated ~2x/year (per-unit wiki pages updated more often) | Yes (200) | `own` (owner/parent chain, documented), `sector`, `hq`/coordinates, `award` when a unit ties to a specific PPA/auction (reported) |
| Global Coal Mine Tracker | GEM | CC BY 4.0 (same licence family as above) | XLSX/CSV, summary tables as Google Sheets | Coal mines globally: name, owner, parent company, country, status, production, coordinates; ownership-chain and boundary files "on request" | Updated in Q2 each year | Yes (200) | `own` (mine→parent, documented), `sector`, `hq` |
| Global Solar/Wind/Hydropower/Nuclear/Oil & Gas Trackers | GEM | CC BY 4.0 | XLSX/CSV per tracker | Project-level: capacity, status (operating/construction/proposed/cancelled/retired), owner, coordinates, commissioning year | Varies by tracker, roughly annual to semi-annual | Yes (200) | `own`, `sector`, `award` (where a PPA/allocation is named) |
| WRI Global Power Plant Database | World Resources Institute (with GEM, USGS, EIA, IAEA, S&P Global and others as data partners) | CC BY 4.0 for data; MIT for the accompanying processing code | CSV (single global file, ~35k plants) | Plant name, fuel type(s), capacity_mw, country, owner, lat/long, commissioning year, data source + source URL, source year, generation_gwh (2013–2019 estimated/reported) | Versioned releases (v1.1.0 → v1.3.0, last dataset update logged Oct 2025); not continuously live | Yes (200) | `own` (plant→owner, documented), `sector`, `hq` (coordinates → state via lookup) |
| CEA installed-capacity & generation reports | Central Electricity Authority, Ministry of Power | Government of India open-data norms (no explicit CC licence found on-page; treat as GODL-implied, confirm before bulk redistribution) | PDF monthly/annual reports, some XLS | State/utility/sector-wise installed capacity (MW) by fuel, monthly generation (MU), plant load factor, transmission data | Monthly (capacity), daily/monthly (generation) | Yes (200) | `sector` (documented), feeds `analytic` capacity-vs-generation comparisons |
| National Power Portal (NPP) | Ministry of Power / CEA | Not stated on landing page; GoI portal, treat as GODL-implied | Web dashboards, some CSV/API-like JSON endpoints | Real-time and historical generation, demand, capacity by state/region/source | Near-real-time | Yes (302→reachable) | `sector`, `analytic` |
| MNRE physical-progress reports | Ministry of New & Renewable Energy | Not stated; GoI, treat as GODL-implied | PDF/XLS tables | State-wise installed renewable capacity (solar, wind, biomass, small hydro) vs targets | Monthly | Yes (200) | `sector`, `award` when tied to a specific scheme/PPA |
| PRAAPTI (discom dues) | Ministry of Power (via PFC/REC) | Not stated; GoI portal | Web dashboard, tabular | Discom-wise outstanding dues to power generators, ageing buckets, generator-wise receivables | Monthly | Yes (200) | `own`/`enforce`-adjacent — money owed s→t; use `pmout`-like edge or a dedicated `owes` mapping if the schema allows, else record as `analytic`/`documented` fact on the discom and generator nodes |
| Ministry of Coal auction results | Ministry of Coal | Not stated; GoI PIB releases + coal.nic.in | PDF press notes, portal tables | Coal block/mine auction winners, block name, company, tranche, date, revenue-share bid | Per-auction-round (irregular) | Portal up (coal.nic.in 200); specific auction-results path not yet located — re-crawl site map | `award` (block→winner, documented) |
| Coal India production dashboards | Coal India Ltd (CIL) | Not stated | Web/PDF | Subsidiary-wise production, offtake, dispatch | Monthly | **No — coalindia.in blocked by proxy policy**; use CIL annual report PDFs (often mirrored on BSE/NSE filings) or PIB/Ministry of Coal press releases instead | `sector`, feeds `analytic` |
| Parivesh (environment/forest/CRZ/wildlife clearances) | Ministry of Environment, Forest and Climate Change | Not stated on landing page; GoI portal | Web search UI; case-by-case PDF orders; some public API endpoints reported by third parties (unverified from this landing page) | Project-wise clearance applications, status, dates, proponent company, location, clearance conditions | Continuous (case-driven) | Yes (200) — but content-rich pages need targeted WebFetch/crawl, not a single GET | `award` (clearance granted, documented), `law` (which rule/notification governs), `enforce` when conditions are violated and action taken |
| csr.gov.in | Ministry of Corporate Affairs | Not stated; GoI portal | Web dashboard/CSV export (per company CSR spend) | Company-wise CSR spend by year, project, district, implementing agency | Annual (per filing cycle) | Reachable but flaky (TLS reset once, 307 on retry) — budget retries | `csr` (documented) |
| MCA company master data / DIN lookup | Ministry of Corporate Affairs | Not stated; GoI portal, MCA21 | Web lookup only (no bulk API) | CIN, company name, status, registered office, directors + DINs, date of incorporation | Continuous | **No — mca.gov.in blocked by proxy** | `own`, `role` (director↔company) — get via mirrors below |
| Zauba Corp (MCA mirror) | Zauba (commercial) | Site terms restrict scraping/redistribution; not an open licence — treat records as "reported", cite Zauba as secondary, verify against a primary filing where possible | Web pages | Mirrors MCA company master data: CIN, directors, charges, financials snapshot | Frequent (mirrors MCA) | 403 in this session — bot-walled, may work with browser headers | `own`, `role` (reported tier only; upgrade to documented only after confirming against MCA/an annual report) |
| Tofler (MCA mirror) | Tofler (commercial) | Site terms restrict scraping/redistribution; paid tiers for bulk/API access | Web pages, paid CSV/API | Same as Zauba: CIN, directors, DIN, charges, shareholding snapshots | Frequent | Reachable (301) | Same caveats as Zauba |
| OpenCorporates | OpenCorporates Ltd | Data itself is often under ODbL-like terms per jurisdiction; bulk/API access is commercial (Open Data license only for limited free-tier queries) | JSON API (paid for volume), web UI | Company registry records across jurisdictions incl. India (mirrors MCA with lag) | Continuous | 403 in this session (bot-walled) — API key/auth likely required | `own`, `role` (reported tier) |
| ECI electoral-bond disclosures / party contribution reports | Election Commission of India | Not stated; GoI statutory body | PDF tables (SBI bond data published per SC order), PDF annual contribution reports | Bond purchaser, denomination, date, encashing party (from the 2024 SC-ordered disclosure); annual party contribution reports >₹20,000 | One-off (bond data, post-March 2024 disclosure) / annual (contribution reports) | Host root reachable in this test; **specific bond-disclosure sub-pages are the ones historically reported blocked** — re-test the exact URL, and prefer the ADR-hosted mirror below as the reliable path | `bond`, `direct` (documented once matched to a primary PDF) |
| ADR / myneta.info (CSV mirrors of ECI + affidavit data) | Association for Democratic Reforms (ADR) | ADR publishes for public/research use; not a formal open-data licence statement found — attribute to ADR, cite the underlying ECI/affidavit primary alongside it | Downloadable CSV/XLS per election/year, web-searchable candidate/party pages | Candidate election affidavits (assets, liabilities, criminal cases, education), party-wise donation/bond data compiled from ECI filings | Per election cycle; bond data updated as ECI/SC releases land | Yes (200) — **this is the practical substitute for blocked eci.gov.in bond pages** | `bond`, `direct`, `role` (candidate→office, documented), feeds `analytic` net-worth-growth comparisons |
| PRS Legislative Research | PRS India (non-profit) | Content is copyrighted to PRS; free to read/cite, not an open-data bulk licence — treat as a citable secondary source, not a bulk dataset | Web articles, PDF bill summaries, vidhan sabha/parliament trackers | Bill text summaries, standing committee reports, MP attendance/questions, ministry-wise budget analysis | Continuous (session-driven) | Yes (200) | `law` (documented — bill status/dates), background for `role` and `enforce` claims |
| sansad.in member profiles | Parliament of India (Rajya Sabha + Lok Sabha secretariats) | Not stated; GoI portal | Web profile pages, PDF debates | MP name, constituency/state, party, term dates, committee memberships | Continuous | Yes (302→reachable, redirects to `/phistory`) | `role` (documented, office+dates) |
| Wikidata SPARQL endpoint | Wikimedia Foundation / Wikidata community | CC0 (public domain dedication) for Wikidata content | SPARQL (JSON/CSV/TSV results) via `query.wikidata.org/sparql` | P169 (CEO), P127 (owned by), P1830 (owner of), P39 (position held), P571 (inception), P17 (country), plus qualifiers with start/end dates | Continuous, crowd-edited — treat as `reported` tier unless corroborated, since anyone can edit | Yes — **tested live in this session, query returned results** | `own`, `role` (reported tier by default; corroborate against a primary filing/gazette to promote to `documented`) |
| OpenSanctions | OpenSanctions (non-profit/commercial hybrid) | Data licensed CC BY-NC 4.0 for non-commercial use; commercial licence required otherwise — check before any redistribution | JSON API, bulk data exports (paid tiers for bulk) | Sanctions lists, PEP lists, adverse-media entity matches, incl. Indian entities/persons flagged elsewhere | Continuous | API root reachable but **requires an API key** (`{"detail":"No API key provided."}`) — free key available via signup, not yet obtained in this session | `enforce` (documented once matched to a primary sanctions/court record), flags for `collisionRisk` checks |
| ICIJ Offshore Leaks Database | International Consortium of Investigative Journalists | ICIJ's own terms: data may be used for journalism/research, not for building a directory-style commercial product; attribute to ICIJ | Web search UI, downloadable CSV via ICIJ's Offshore Leaks Data GitHub mirror | Entities/officers/intermediaries named in Panama Papers, Paradise Papers, Pandora Papers etc., incl. Indian-linked entities | Static per leak, occasional additions | Yes (200) | `own` (reported tier — leak documents show association, not always beneficial ownership; corroborate before `documented`) |
| SEBI orders search | Securities and Exchange Board of India | Not stated; statutory regulator, orders are public record | PDF orders, web search index | Enforcement/adjudication orders against companies/individuals: violation, penalty, date | As issued | Yes (301→reachable) | `enforce` (documented — primary regulatory order) |
| Indian Kanoon (SC/NGT/HC judgments) | Indian Kanoon (private, aggregates public judgments) | Judgments are public record; Indian Kanoon's own site terms restrict bulk scraping — cite the judgment, not the aggregator, as the primary source where possible | Web search UI, individual judgment pages | Full-text judgments, case numbers, dates, bench, parties, citations | Continuous | Yes (200) | `enforce` (documented — court order), `law` (when a judgment strikes down/upholds a rule) |
| screener.in | Screener (commercial, freemium) | Site terms: free for personal use, no redistribution of bulk scraped data; financial data ultimately sourced from BSE/NSE/company filings | Web pages, CSV export from a saved screen (login-gated) | Company financials (P&L, balance sheet, ratios), shareholding pattern trend, promoter pledge | Quarterly (post-results) | Yes (301) | `own` (shareholding %, reported unless cross-checked against the exchange filing), `listed` |
| NSE/BSE shareholding-pattern filings | National Stock Exchange / BSE Ltd | Exchange-published regulatory filings; public disclosure, not an open bulk-data licence — filings themselves are the primary record | PDF/XBRL per quarter, per company | Promoter/public/FII/DII/govt shareholding %, pledge status, as of quarter-end | Quarterly | NSE: site's own bot-defense resets non-browser clients (not proxy-blocked); BSE: reachable (302) | `own` (documented — primary filing), `listed` |
| IEEFA datasets/reports | Institute for Energy Economics and Financial Analysis | Reports free to read/cite; not a bulk open-data licence — treat as analytic secondary source | PDF reports, occasional XLS backing data | Financial analysis of coal/renewable transition, stranded-asset risk, company-specific financial health | Ad hoc (report-driven) | Not tested this session (no distinct host queried) — likely reachable, standard WordPress-style site | feeds `analytic` claims, cite alongside primary financials |
| Ember (energy think tank) datasets | Ember | CC BY 4.0 (Ember's stated data licence on ember-energy.org) | CSV via Ember Data Explorer / GitHub | Global electricity generation mix by country/fuel/year, incl. India | Annual (Global Electricity Review) + monthly updates for some series | Not tested this session | `sector` (documented), feeds `analytic` comparisons |
| CREA (Centre for Research on Energy and Clean Air) datasets | CREA | Reports/data typically CC BY 4.0 or free-to-cite; confirm per dataset | CSV/PDF | Air-quality attributable-emissions analysis, coal-plant compliance tracking, Russian-oil-to-India shipment tracking (with Kpler) | Ad hoc / periodic reports | Not tested this session | feeds `analytic`, `enforce` (compliance-gap claims, reported tier) |
| Kpler / CREA Russian-oil trackers | Kpler (commercial data provider) + CREA (published analysis) | Kpler's underlying shipping data is proprietary/commercial; CREA's published analysis/reports built on it are free to cite | PDF reports (CREA), Kpler terminal is paid/subscription | Tanker-level crude/product flows from Russia to India, refiner-level receipts, re-export flagging | CREA reports periodic; Kpler live (subscription only) | CREA reports accessible via web; raw Kpler feed not accessible from this sandbox without a paid account | `sector`, `analytic` (flow claims are reported/analytic tier, not documented, absent bill-of-lading-level primary data) |

## Ingestion recipes — five highest-value sources

These five give the best coverage-per-effort for the energy graph: broad entity
coverage, machine-readable formats, a stated open licence, and direct mapping to
`own`/`sector`/`role` predicates.

### 1. Global Energy Monitor — Global Coal Plant Tracker

- **URL:** `https://globalenergymonitor.org/projects/global-coal-plant-tracker/` (data linked from the project's "Download Data" page; individual unit pages live at `https://www.gem.wiki/<Plant_Name>`)
- **Licence attribution string:** `Data: Global Energy Monitor, Global Coal Plant Tracker, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)`
- **Download:** the tracker is distributed as an XLSX workbook; fetch the current release link from the download-data page (GEM changes the file URL per release, so resolve it at ingestion time rather than hardcoding):
  ```bash
  # resolve the current XLSX link, then:
  curl -sS -o gcpt_latest.xlsx "<resolved-xlsx-url>"
  ```
- **Field → predicate mapping:**
  - `Plant / Unit name`, `GEM unit ID` → node `energy:<slug>` (`ty: "plant"`/asset under `co:`)
  - `Owner`, `Parent` (with % where given) → `own` edge, owner→plant, `tier: documented` (primary tracker record), `from`/`to` = commissioning/retirement dates if known
  - `Country`, `Subnational unit`/state → `st` field on the plant node
  - `Capacity (MW)`, `Status` (operating/construction/proposed/retired) → node `sub`/`d` facts
  - `Coordinates` → for state resolution when only lat/long is given
  - `Start year`, `Retired year` → claim `from`/`to`

### 2. WRI Global Power Plant Database

- **URL:** `https://datasets.wri.org/dataset/globalpowerplantdatabase` (dataset landing page); raw CSV historically mirrored at `https://github.com/wri/global-power-plant-database/raw/master/output_database/global_power_plant_database.csv`
- **Licence attribution string:** `Data: World Resources Institute, Global Power Plant Database v1.3.0, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Code: MIT.`
- **Download:**
  ```bash
  curl -sS -o gppd.csv \
    "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"
  # filter to India:
  awk -F, 'NR==1 || $3=="\"IND\""' gppd.csv > gppd_india.csv
  ```
  (Confirm the exact column index for `country` before relying on the `awk` filter — inspect the header row first.)
- **Field → predicate mapping:**
  - `country`, `country_long` → filter to India
  - `name`, `gppd_idnr` → node id/`al` (alias)
  - `capacity_mw`, `primary_fuel`, `other_fuel1..3` → `sector`, node facts
  - `latitude`, `longitude` → state resolution → `st`
  - `owner` → `own` edge (owner→plant), `tier: reported` by default (GPPD owner field is often scraped/estimated — corroborate against GEM or an annual report before promoting to `documented`)
  - `commissioning_year` → claim `from`
  - `generation_gwh_20XX`, `estimated_generation_gwh_20XX` → `analytic` capacity-factor comparisons

### 3. CEA — Installed Capacity & Generation Reports

- **URL:** `https://cea.nic.in/installed-capacity-report/` and `https://cea.nic.in/generation-report/` (exact slugs change; browse from `cea.nic.in` root)
- **Licence attribution string:** `Data: Central Electricity Authority, Ministry of Power, Government of India.` (No explicit open licence text found on-page — attribute as a government primary source and do not claim CC terms that weren't stated.)
- **Download:** these are monthly PDF/XLS reports, not a stable API:
  ```bash
  curl -sS -o cea_installed_capacity_<yyyymm>.pdf "<resolved-report-url>"
  ```
  Parse with a PDF-table extractor (e.g. `pdftotext -layout` or `camelot`) since CEA does not publish a clean CSV.
- **Field → predicate mapping:**
  - State/UT × fuel-type MW table → `sector` facts on state and generation-company nodes, `tier: documented` (primary regulator report)
  - Sector-wise (Central/State/Private) capacity → feeds `own`/`sector` splits and `analytic` state-vs-state comparisons
  - Monthly generation (MU) by source → `analytic` capacity-factor / PLF claims

### 4. Wikidata SPARQL (corroboration layer, not primary)

- **URL:** `https://query.wikidata.org/sparql`
- **Licence attribution string:** `Data: Wikidata contributors, CC0 1.0 Universal (public domain dedication).`
- **Query/download (tested live, works from this sandbox):**
  ```bash
  curl -sS -G "https://query.wikidata.org/sparql" \
    --data-urlencode 'query=
      SELECT ?company ?companyLabel ?ceo ?ceoLabel ?start ?end WHERE {
        ?company wdt:P17 wd:Q668 .           # country = India
        ?company wdt:P452 wd:Q1194524 .      # industry = energy industry (adjust QID as needed)
        OPTIONAL { ?company p:P169 ?stmt .   # CEO with qualifiers
                   ?stmt ps:P169 ?ceo .
                   OPTIONAL { ?stmt pq:P580 ?start } OPTIONAL { ?stmt pq:P582 ?end } }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      } LIMIT 200' \
    -H "Accept: application/sparql-results+json" -o wikidata_energy_ceos.json
  ```
- **Field → predicate mapping:**
  - `P169` (chief executive officer) → `role` edge person→company, `tier: reported` (crowd-edited; corroborate against an annual report/MCA DIN before `documented`), qualifiers `P580`/`P582` → `from`/`to`
  - `P127` (owned by) / `P1830` (owner of) → `own` edge, same tier caveat
  - `P39` (position held) → `role` edge person→institution (ministerial/board roles), qualifiers give dates
  - Use only as a **lead generator** — every Wikidata fact needs a primary corroboration before it enters the graph above `reported` tier, per SPEC.md's provenance invariant.

### 5. ADR / myneta.info (ECI bond & affidavit mirror)

- **URL:** `https://myneta.info/` (candidate affidavits) and ADR's electoral-bond compilation pages (`https://adrindia.org/`, search for "electoral bond data")
- **Licence attribution string:** `Data: Association for Democratic Reforms (ADR) / myneta.info, compiled from Election Commission of India records and candidate affidavits. Cite the underlying ECI/Supreme-Court-ordered SBI disclosure as primary where matched.`
- **Download:**
  ```bash
  curl -sS -o myneta_candidates_<state>_<year>.csv "<resolved-csv-url-from-myneta-election-page>"
  ```
  myneta.info serves per-election CSV/XLS links from its election result pages; there is no single stable bulk endpoint, so resolve the link per election/year at ingestion time.
- **Field → predicate mapping:**
  - Candidate name, constituency, party, election year, won/lost → `role` edge candidate→office, `tier: documented` when matched to the ECI result, `from` = election/swearing-in date
  - Declared assets/liabilities (self + spouse), criminal cases pending/convicted → node `d` facts (`tier: documented` — sworn affidavit is a primary record), asset-growth-over-terms → `analytic` claim with `innocentReading` (salary/inheritance/business income vs disproportionate-assets narrative)
  - Electoral bond purchaser/amount/date + encashing party (where ADR has matched SBI's court-ordered disclosure to donor/recipient) → `bond` edge donor→party, `tier: documented` (primary SC-ordered disclosure, ADR is the accessible mirror), `a` = amount in ₹ crore

## Gaps and follow-ups

- Ministry of Coal auction-result pages and Coal India's own dashboards need a
  working direct path — coal.nic.in is up but the auction-results URL guessed in
  this session 404'd, and coalindia.in is proxy-blocked; fall back to PIB press
  releases and CIL's annual-report PDFs (often re-hosted on BSE/NSE filing pages).
- PRAAPTI's dues-by-discom table wasn't schema-inspected in this pass (page loads,
  but the exact field names/export format need a follow-up crawl).
- OpenSanctions needs a free API key (not obtained in this session) before it can
  be queried programmatically.
- CEA/NPP/MNRE/PRAAPTI/Parivesh/csr.gov.in/sansad.in all lack a stated open-data
  licence on the pages checked — treat them as citable primary government records,
  not as CC-licensed bulk data, and do not add a licence claim we didn't verify.
- `eci.gov.in` and `api.github.com` answered basic requests in this session despite
  being on the "known blocked" list in the task brief — this may mean the block is
  scoped to specific sub-paths (ECI's bond-disclosure section) or is intermittent;
  don't rely on either without re-testing the exact URL/endpoint needed at ingestion
  time.

## Phase G sweep — foreign money, NGOs, foreign capital, tenders (probed 2026-09-26)

Reachability through the same proxy, on the day the Phase G spec was written
(`docs/superpowers/specs/2026-09-26-foreign-money-ngos-tenders-design.md` §2). "000" is a
connection that never opened; "void" means the fleet declared the gap and routed round it.

| Source | Reach | What it gives | Tier at ingest |
|---|---|---|---|
| World Bank Projects API `search.worldbank.org/api/v3/projects` | 200 | 1,117 India projects: id, name, borrower, implementing agency, IBRD/IDA amounts, approval and closing dates, status, sectors, themes, URL. Fetched by `scripts/finance/fetch-worldbank.mjs` into `research/raw/finance/worldbank-projects.json` (849 loan claims) | documented |
| World Bank indicators API | 200 | External debt stocks (`DT.DOD.DECT.CD`) and the DT.* family | documented |
| World Bank Data Catalog "Major Contract Awards" (0037796) | 429 (rate-limited; page 200) | Supplier, supplier country, amount, project — the join from loans to contractors. Only hand-researched contracts landed | documented |
| ADB `adb.org/projects/country/ind` | 200 (HTML) | Loan numbers, amounts, executing agencies | documented |
| AIIB `aiib.org/en/projects/list` | 200 (server-rendered) | Approved and proposed projects, amounts, borrowers | documented |
| JICA | 200 | ODA loan agreements, India | documented |
| AidData GCDF 3.0 | 200 | Chinese official finance to India by project | reported (academic dataset) |
| IMF (`imf.org`, `data.imf.org`, `dataservices.imf.org`) | 403 / 502 | — | void; RBI and World Bank mirrors used |
| KfW | 000 | — | void; annual reports via PIB |
| FCRA online `fcraonline.nic.in`, `mha.gov.in/en/commoncontent` | 000 | — | void at source; routed via Parliament answers (`sansad.in`, `rsdebate.nic.in`), PIB, MHA annual reports, IndiaSpend — every FCRA figure says so |
| NGO Darpan | 200 (JS shell) | State- and sector-wise registered NGOs; per-NGO grants | documented once a JSON endpoint is confirmed |
| data.gov.in API | 504 on the day (200 on 2026-08-12) | FCRA / NGO / external-assistance resources | documented; retry |
| CPPP live `eprocure.gov.in/cppp` | 200 | Award-of-contract pages — the verification target. All 40 sampled pages were gone (`sample-verification.json`) | documented when a page resolves |
| Hugging Face `rumourscape/tenders` | 200, range requests | Two Arrow IPC stream files, 1.80 + 1.66 GB, 4,921,960 rows × 24 columns; digests `95e997785ecab0a9`, `d7663349efb13547`. CC-BY-4.0 applied by a re-publisher; anonymous scraper | reported (`docs/INGESTION.md` Stage 0) |
| `ghalibluvr/tender_dbs_parquet` | 200 | Tender-notice side (bid windows); no licence | reported; not yet joined |
| BSE shareholding pages / `api.bseindia.com` | 200 shell / 403 | — | company filings and screener.in used instead |
| SEC EDGAR full-text search `efts.sec.gov` | 200 | BlackRock filings mentioning India | documented |
| DIPAM, `rothschildandco.com`, PIB, PRS, myneta, OpenCorporates, screener.in | 200 | Mandates, press releases, bills, affidavits, officers, shareholding | documented |
| GeM, MCA, Kaggle downloads, `web.archive.org` | 000 / 403 / auth | — | void |

### Recipes

**World Bank census.** `node scripts/finance/fetch-worldbank.mjs [--out <path>]` pages the
projects API for India, resolves borrowers and implementing agencies to entity ids through the
tables in the script (every hand resolution lives there, not in the output), writes one `loan`
claim per IBRD/IDA commitment with its `projectId`, and marks each as `countable` or not. A
re-fetch reproduces the file modulo `runId` and page hashes; 25 tests on fixtures.

**CPPP awards.** `scripts/cppp/README.md`. Download the two Arrow files to a scratch
directory (about a minute through the proxy), then
`python3 scripts/cppp/build.py --arrow-dir <dir> --out research/raw/cppp --as-of <date>`.
Quality first: the file's own defects (duplicate tender ids, null and zero bid counts, dirty
`tender_type`, the state portal's `organisation_name` being the state) are written before any
rate, and every rate declares its dedup rule and its denominator. Only aggregates are
committed; no award row and no unmarked name.

### Gaps and follow-ups (Phase G)

- The Major Contract Awards catalogue needs a paced fetch (429 on the day); it completes the
  loans → contractors join.
- FCRA at source would move receipts from `reported` to `documented`; nothing reached
  `fcraonline.nic.in` from the sandbox.
- The tender-notice side (`ghalibluvr/tender_dbs_parquet`) would let single bidding be read
  against notice period; unlicensed, so it stays a lead.
- NGO Darpan's JSON endpoint was not confirmed; the fleet's `darpan-welfare-join.json` is
  built from page reads and says so.

## Phase H sweep — the money India spends on force (probed 2026-10-04 to 06)

Reachability through the same proxy for the force-finance fleet
(`docs/superpowers/specs/2026-10-04-force-finance-design.md` §2 and §2.1). Seven probes, a
completeness critic and six fill probes wrote `docs/research/force/recon.json`; every status
below is copied from that file unless the row says "spec §2" or names a fleet file. The
fleet's own gaps are the `gaps` arrays of `research/raw/force/*.json`. "000" is a connection
that never opened. "void" means the fleet declared the gap and routed round it.

**Cited hosts, counted by script.** A script walked every string beginning `http` under
`sources` and `srcs` in the eight domain files of `research/raw/force/` (`AUDIT.json` and
`RECONCILIATION.json` left out) and folded a leading `www.`. It found 8,751 URL references,
746 distinct URLs and 137 distinct hosts. Every URL in those files sits under a source key.
Twenty-one `.gov.in` / `.nic.in` hosts carry 6,700 of the 8,751 references;
`indiabudget.gov.in` alone carries 4,767. Distinct hosts per file: footprint 23, literature
32, money-people 53, pay-pensions 30, procurement-industry 32, state-police 24,
union-defence 27, union-home 20. No host the table marks void or dead is cited. To re-run:

```
python3 -I - <<'PY'
import json, glob, collections
from urllib.parse import urlparse
skip = ('AUDIT.json', 'RECONCILIATION.json')
c = collections.Counter()
def walk(o, src=False):
    if isinstance(o, dict):
        for k, v in o.items(): walk(v, src or k in ('srcs', 'sources', 'src'))
    elif isinstance(o, list):
        for v in o: walk(v, src)
    elif src and isinstance(o, str) and o.startswith('http'):
        h = (urlparse(o).hostname or '').lower()
        c[h[4:] if h.startswith('www.') else h] += 1
for f in glob.glob('research/raw/force/*.json'):
    if not f.endswith(skip): walk(json.load(open(f)))
print(sum(c.values()), len(c)); print(c.most_common(30))
PY
```

| Host | What it serves | Status or behaviour as probed | Route that worked | Cited by (refs) |
|---|---|---|---|---|
| `indiabudget.gov.in` | Expenditure Budget, Notes on Demands for Grants (`sbe{N}.pdf`), Summary of Demands (`sumsbe.pdf`), Budget at a Glance, Expenditure Profile statements | 200, text-extractable PDFs; the archive index lists 1996-97 onward; `/budget2026-27/doc/eb/` is 404 because the current year is unversioned | `budget_archive/ub{YYYY-YY}/eb/sbe{N}.pdf`, `budget{YYYY-YY}/doc/eb/sbe{N}.pdf`, `doc/eb/sbe{N}.pdf` (Recipe 1) | 4,767: union-defence, union-home, pay-pensions, state-police, footprint |
| `mha.gov.in` | Annual reports 2005-06 → 2024-25, Detailed Demands for Grants (Finance Division page, 2012-13 → 2026-27), Parliament-answer mirrors | 200; `/en/commoncontent` now 404; root 301 to `/hi`; the 2024-25 report is 22,672,545 bytes and a 40 s timeout showed 000 | `/sites/default/files/*.pdf`; `/MHA1/Par2017/pdfs/…` (Recipe 2) | 607: union-home, state-police, pay-pensions, footprint |
| `pib.gov.in`, `static.pib.gov.in` | Press releases: DAC approvals, contracts signed, Agnipath, OROP, production and exports, MoS written replies | WebFetch 403; curl 200; bare `pib.gov.in` 000 once; `PressReleaseIframePage.aspx` an empty shell | curl `www.pib.gov.in/PressReleasePage.aspx?PRID={id}` (Recipe 3) | 552 + 14: every domain file but state-police |
| `prsindia.org` | Demand for Grants analyses (Defence, Home Affairs), state budget analyses | 200; the real 2025-26 Home Affairs PDF name has a hyphen before `Home_Affairs` (the underscore guess is 404) | `/files/budget/budget_parliament/{YYYY}/…pdf` | 286: union-defence, union-home, state-police, pay-pensions, literature |
| `en.wikipedia.org` | Secondary: minister rosters, case histories, cantonment lists | 200 | page URLs | 275: seven files, not pay-pensions |
| `ncrb.gov.in` | Crime in India, Prison Statistics India | 200; the year listing is client-rendered ("No records found"); 2023 and 2024 listings empty | direct PDF paths, e.g. `/uploads/files/PSI-2023.pdf` | 258: state-police, footprint, pay-pensions |
| `rbi.org.in` | State Finances: A Study of Budgets, Appendix II and Appendix Table 5 | 200 for HTML with pacing; 626-byte "Unauthorised Access" on a burst; 403 ×8 and 418 in a later fill; `rbidocs.rbi.org.in` serves a bot challenge, not the file | `Scripts/PublicationsView.aspx?id={id}` (Recipe 4) | 204: state-police |
| `indiankanoon.org` | Court records: Bofors, Rafale, Pegasus, Adarsh, Tatra recitals | 200 | `/doc/{id}/` | 150: literature, money-people, pay-pensions, procurement-industry, union-home |
| `dgde.gov.in` | 61 cantonments by Army command; DGDE annual administrative reports | 200 on `/en/`; root serves Hindi; `www.` 000 | `/en/cantonments/` | 99: footprint |
| `budget.up.nic.in` | UP grant-wise PDFs 1999-2000 → 2026-27 (Grant 026 Police, 025 Prisons, 027 Civil Defence) | 200; downloads CAPTCHA-gated on some pages | `PDF{YY_YY}/Gr26.pdf` | 92: state-police, pay-pensions |
| `drdo.gov.in` | Technology-cluster and laboratory pages | 200; the labs-and-establishments URL is 404 (footprint.json gap) | `/drdo/en/organisation/technology-cluster` | 74: footprint |
| `indiajusticereport.org` | IJR PDFs; IJR-4 state indicator XLSX | 200; `/reports` 404 | `/api/method/ijr.api.download?file_id={id}` | 70: state-police |
| `myneta.info` | SBI electoral-bond disclosure, donor-wise | 200 | `/electoral_bonds/…` | 67: money-people |
| `sipri.org` | Military Expenditure xlsx 1949–2025; arms-transfer fact sheets | 200; `milex.sipri.org` 000; `atbackend.sipri.org` 401 | `/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx` | 62: union-defence, procurement-industry, literature |
| `crpf.gov.in`, `cisf.gov.in` | Zones, sectors, training centres | 200; guessed `/budget` and `/annual-report` 404 | organisation menu pages | 53 + 8: footprint, union-home |
| `nhm.gov.in` | Copy of the RGI population projections 2011–2036 | 200 (11.5 MB); `censusindia.gov.in` unreachable; `main.mohfw.gov.in` 000 or 404 | `/New_Updates_2018/Report_Population_Projection_2019.pdf` | 46: footprint |
| `screener.in` | DPSU and listed-vendor pages; links to filings | 200 | `/company/{SYMBOL}/consolidated/` | 38: procurement-industry, union-defence |
| `ddpmod.gov.in` | Department of Defence Production annual reports (MoD Annual Report 2024-25, 11.5 MB) | 200; home redirects to `/hi`; one reset, retry 200 | `/en/documents/annual-report` | 37: procurement-industry, union-defence |
| `sansad.in` | Committee PDFs; Lok Sabha question JSON API; answer PDFs | 200 for committee `getFile`; answer `getFile` 500 or reset at times; the question API ignores ministry, page and date filters; Rajya Sabha APIs 504 / 400 | `/getFile/lsscommittee/Defence/{LS}_Defence_{N}.pdf?source=loksabhadocs` | 35: union-defence, union-home, pay-pensions |
| `nseindia.com`, `nsearchives.nseindia.com` | Shareholding master API, shareholding XBRL, filings | 000 in the procurement probe; 200 JSON with `Accept: application/json` and a browser user agent in a fill | Recipe 5 | 16 + 33: union-defence, procurement-industry |
| `humanrightsinitiative.org` | CHRI mirror of CAG Report No. 3 of 2019 (IAF capital acquisition) | 200, PDF 959 KB | the PDF URL | 23: literature, money-people, procurement-industry |
| `doe.gov.in` | 7th CPC report, pay rules, pay matrix | 200 (7.5 MB); guessed paths 404 | `/files/cenetral-pay_document/7cpc_report_eng.pdf` (the misspelling is the host's) | 21: pay-pensions |
| `mahapolice.gov.in`, `uppolice.gov.in` | Commissionerate and unit listings | `uppolice.gov.in` welfare and tender pages 200; `mahapolice.gov.in` not probed in recon.json | listing pages | 23 + 15: state-police, pay-pensions |
| `munitionsindia.in`, `aweil.in`, `avnl.co.in`, `glidersindia.in` | Ex-OFB company unit pages | `munitionsindia.in` 000 in the footprint probe; spec §2 records AVNL, AWEIL and Yantra unit pages at 200 | company pages | 16 + 13 + 4 + 5: footprint, union-defence |
| `bseindia.com` | Company pages, announcements | company page 200; `api.bseindia.com` 403 ("Access Denied", union-defence.json gap) | company page only | 10: money-people, procurement-industry |
| `api.worldbank.org` | WDI `MS.MIL.XPND.GD.ZS` (SIPRI-sourced) | 200 JSON | `/v2/country/IND/indicator/{code}?format=json` | 8: union-defence |
| `tofler.in` | MCA-derived directors | curl 200; WebFetch 403 | curl the company page | 2: procurement-industry |
| `elibrary.sansad.in` | DSpace API for committee reports and question bitstreams | 200 `application/hal+json`; bitstreams 200 | `/server/api/discover/search/objects?…`; `/server/api/core/bitstreams/{uuid}/content` | 0 |
| `api.ddpdashboard.gov.in` | DDP production feed | production endpoints 200; export endpoints 401 | `/ddp-production/get-all-ddp-production` | 0 |
| `defproc.gov.in` | Defence Procurement Portal (GePNIC) | 200, but every tender list sits behind an image CAPTCHA | none | 0 |
| `etenders.gov.in` and state GePNIC portals | Live tender notices by organisation | NIT lists 200 with a cookie jar; award-of-contract lists behind a CAPTCHA | `FrontEndTendersByOrganisation` DirectLink with the same cookie jar | 0 |
| `bprd.nic.in`, `bprd.gov.in` | Data on Police Organisations | 000 on every path; `http://bprd.nic.in` 503 | none (void) | 0 |
| `cag.gov.in` and every AG host, `saiindia.gov.in` | Audit reports | 000 on every path | none (void) | 0 |
| `mod.gov.in`, `desw.gov.in`, `indianarmy.nic.in`, `indiannavy.gov.in`, `mes.gov.in`, `joinindianarmy.nic.in`, `indiancoastguard.gov.in` | Ministry and service portals | 000 (`mod.gov.in` 503 over HTTP); `indianairforce.nic.in` 200 but 1.65 MB in 70 s; `www.bsf.gov.in` 403; ITBP, SSB, Assam Rifles 000 | none (void) | 0 |
| `openbudgetsindia.org` | CBGA Open Budgets India | 520 in the Union probes; later 301 to an unrelated mutual-fund domain, `/dataset` 404 | none (dead) | 0 |
| `eci.gov.in` | Electoral-bond disclosure | 406, with any user agent | none (void) | 0 |
| `data.gov.in`, `api.data.gov.in` | OGD catalogue | 1 MB JS shell; API 000 | none (void) | 0 |
| `main.sci.gov.in`, `digiscr.sci.gov.in` | Supreme Court judgment PDFs | 000 (`www.sci.gov.in` landing 200) | none (void) | 0 |
| GeM, `mca.gov.in`, `zaubacorp.com`, `web.archive.org`, `loksabhadocs.nic.in`, `eparlib.nic.in` | — | 000 / 403 / CONNECT 502 | none (void) | 0 |

### Recipes

**1. Union Expenditure Budget demand PDFs (`indiabudget.gov.in`).** The archive index
`previous_union_budget.php` lists 1996-97 to 2026-27 (recon.json, union-home probe). The
fleet cites the Notes on Demands back to 2000-01; 1996-97 to 1999-2000 were not fetched.
The fleet cites three path forms:

- `budget_archive/ub{YYYY-YY}/eb/sbe{N}.pdf` for 2000-01 → 2019-20;
- `budget{YYYY-YY}/doc/eb/sbe{N}.pdf` for 2019-20 → 2025-26;
- `doc/eb/sbe{N}.pdf` for the current year, 2026-27.

The union-defence probe also found `budget{YYYY-YYYY}/ub{YY-YY}/eb/sbe{N}.pdf` at 200 for
2011-12 → 2018-19 (recon.json); the fleet uses that form for one file only, the 2017-18
Budget at a Glance.

`sumsbe.pdf` in the same folder is the Summary of Demands, and `bag/bag1.pdf` (or
`doc/Budget_at_Glance/bag1.pdf`) the total-expenditure denominator. The union-defence
probe's guessed pre-2011-12 folders were 404; the `budget_archive` form is the one that
worked. Demand numbers move almost every year, so read the demand name from page 1 before
mapping a file. The numbers the fleet cites, copied from the source labels in
`research/raw/force/union-defence.json`, `union-home.json` and `pay-pensions.json`:

| Budget year | MoD demands | Police (MHA) | MHA | Cabinet | Revenue (ED) | Personnel (CBI) |
|---|---|---|---|---|---|---|
| 2000-01 | — | 47 | 45 | 46 | 36 | 66 |
| 2001-02 | 13 MoD, 14 Pensions, 15 Army, 16 Navy, 17 Air Force, 18 Ordnance Factories, 19 Capital | 43 | 41 | 42 | 33 | 61 |
| 2002-03 | Summary only | 47 | 45 | 46 | 36 | 63 |
| 2003-04 | Summary only | 53 | 51 | 52 | 41 | 67 |
| 2004-05 | Summary only | 54 | 52 | 53 | 42 | — |
| 2005-06 | 21 MoD, 22 Pensions, 23 Army, 24 Navy, 25 Air Force, 26 Ordnance Factories, 27 R&D, 28 Capital | 54 | 52 | 53 | 42 | 70 |
| 2006-07, 2007-08 | Summary only | 52 | 50 | 51 | 41 | 69 |
| 2008-09 | — | 53 | 51 | 52 | 41 | 71 |
| 2009-10 | 20 MoD, 21 Pensions, 22 Army, 23 Navy, 24 Air Force, 25 Ordnance Factories, 26 R&D, 27 Capital | 53 | 51 | 52 | 41 | 71 |
| 2010-11 | Summary only | 53 | 51 | 52 | 41 | 71 |
| 2011-12 | as 2009-10 | 54 | 52 | 53 | 41 | 72 |
| 2012-13 | 22 Army, 23 Navy, 24 Air Force, 27 Capital | 54 | 52 | 53 | 41 | 72 |
| 2013-14 | 22 Army, 23 Navy, 24 Air Force, 27 Capital | 55 | — | 54 | 42 | 73 |
| 2014-15 | as 2009-10 | 55 | — | 54 | 42 | 73 |
| 2015-16 | 22 Pensions, 23 Army, 24 Navy, 25 Air Force, 28 Capital | 55 | — | 54 | 43 | 73 |
| 2016-17 | 20 MoD (Misc), 21 Pensions, 22 Defence Services (Revenue), 23 Capital | 48 | — | 47 | — | — |
| 2017-18 | 20 Revenue, 21 Capital | 48 | — | 47 | 33 | 70 |
| 2018-19 | 19 MoD (Misc.), 20 Revenue, 21 Capital, 22 Pensions | 48 | — | 47 | 33 | 70 |
| 2019-20 (`budget_archive/ub2019-20`) | 20 Revenue, 21 Capital | 48 | — | 47 | 33 | 70 |
| 2019-20 (`budget2019-20/doc/eb`) | 19 Revenue, 20 Capital, 21 Pensions (recon.json; the fleet cites only `sumsbe.pdf` here) | — | — | — | — | — |
| 2020-21 | 18 MoD (Civil), 19 Revenue, 20 Capital, 21 Pensions | 48 | — | 47 | 31 | 73 |
| 2021-22 | Summary only | 50 | — | 49 | 33 | 73 |
| 2022-23 to 2026-27 | 19 MoD (Civil), 20 Revenue, 21 Capital, 22 Pensions | 51 | 49 (2026-27) | 50 | 35 | 74 |

A dash means the fleet cites no file for that cell, not that no demand exists. The
2026-27 MHA demand number (49) is from recon.json (union-home probe). The two 2019-20
folders number the MoD demands differently. pay-pensions.json cites
`budget_archive/ub2019-20/eb/` as Demand 20 Defence Services (Revenue) and 21 Capital Outlay.
recon.json's salaries-pensions probe gives `budget2019-20/doc/eb/` as 19 Revenue, 20 Capital
and 21 Defence Pensions. Name the folder with the year.

Page-break caveat. In the pre-2016 editions a force or service block can run across a page,
and a line-by-line extractor then drops its continuation. union-home.json records that the
FY2009-10 Assam Rifles block in EB 2011-12 was read without its capital and plan lines for
that reason, and that the FY2010-11 to FY2014-15 actuals in EB 2012-13 to EB 2016-17 have not
been re-checked for it. union-defence.json records that EB 2016-17 prints Pay & Allowances
for BE/RE 2015-16 and actual 2014-15 in a second, old-structure block the extractor did not
read. Re-read every multi-page block by hand before a row is written.

**2. MHA annual reports and the Par2017 Parliament-answer mirrors (`mha.gov.in`).** The
listing `/en/documents/annual-reports` is 200 and links the PDFs under
`/sites/default/files/`. The 2024-25 English report (`AREnglish_24032026.pdf`) is
22,672,545 bytes and 413 pages, text-extractable; give curl at least 120 s (recon.json). The
fleet's labels call the same file "MHA Annual Report 2025-26 (released 2026-03)"; cite it by
file name. The
fleet cites it 42 times across union-home, state-police and footprint. MHA also mirrors
its own Parliament answers at
`/MHA1/Par2017/pdfs/par{YYYY}-pdfs/{LS|RS}{DDMMYYYY}/{question}.pdf` (the 2021 folder uses
`rs-24032021`). Use the mirror when `sansad.in/getFile` returns 500 or resets, which it did
on several days. The fleet cites six distinct Par2017 PDFs (2021, 2022, 2024 ×2, 2025,
2026) in pay-pensions, state-police and union-home. The mirror carries MHA answers only;
MoD answers are not there (pay-pensions.json gap on Agniveer intake). The Finance Division
page lists the Detailed Demands for Grants for 2012-13 → 2026-27; only the 2026-27 Vol I was
opened (recon.json).

**3. PIB releases by curl (`www.pib.gov.in`).** WebFetch gets 403 from PIB. curl through the
proxy gets 200 with a server-rendered body in
`div.innner-page-main-about-us-content-right-part` (the host's spelling). Fetch
`https://www.pib.gov.in/PressReleasePage.aspx?PRID={id}` with the `www.` prefix; the bare
host was 000 once, and `PressReleaseIframePage.aspx` returns an empty shell. Find PRIDs
by search (`site:pib.gov.in`) because the ministry filter on `allRel.aspx` is a POST form
and the RSS feed is unfiltered. The fleet cites 74 distinct PIB URLs; 508 of the 552
`pib.gov.in` references are `PressReleasePage.aspx`. The Agnipath Cabinet release
(PRID 1833747) is the worked case: literature.json records 403 to the fetcher;
the salaries-pensions probe fetched the same release with curl at 200 (recon.json), and
pay-pensions.json cites it. A DAC acceptance of necessity
names no vendor and no per-item cost (procurement-industry.json void); only a
contract-signing release names a vendor.

**4. RBI State Finances Appendix II with pacing (`rbi.org.in`).** Appendix II "Revenue
Expenditure of States and UTs with Legislature" prints row "iii) Police" in ₹ lakh for
2023-24 Accounts, 2024-25 BE, 2024-25 RE and 2025-26 BE. It is spread over eight HTML pages,
`Scripts/PublicationsView.aspx?id=23755` to `id=23762`, four or five states per page;
`id=23701` is Appendix Table 5, the all-states "3. Police" row in ₹ crore. state-police.json
writes 120 rows from them, 30 states and UTs × four columns, each divided by 100 to ₹ crore
and marked revenue-only (MH 2055). Read the state name from each page's column headers: the
critic flagged the ordering as unconfirmed (recon.json). Pace the fetches. A burst drew a
626-byte "Unauthorised Access" page; a retry after about 8 s with a cookie jar returned 200.
A later fill drew 403 on all eight pages at 6 s spacing and 418 on the `www.` host, so the
block is intermittent. Keep the fetched HTML. `rbidocs.rbi.org.in`, where the XLSX and PDF
files live, served a bot-challenge page or an empty reply every time; the HTML table is the
working route. Back-issues 2011-12 → 2023-24 were not fetched (state-police.json gap).

**5. NSE shareholding and XBRL for the DPSUs.** The NSE host was 000 in the first
procurement probe and answered in a later fill. Send `Accept: application/json` and a
browser user agent to
`https://www.nseindia.com/api/corporate-share-holdings-master?index=equities&symbol={SYMBOL}`.
Take the quarter's XBRL from the row it returns, at
`https://nsearchives.nseindia.com/corporate/xbrl/SHP_*.xml`. Filing PDFs sit under
`nsearchives.nseindia.com/corporate/`. union-defence.json reads the eight listed defence
PSUs this way (BDL, BEL, BEML, COCHINSHIP, GRSE, HAL, MAZDOCK, MIDHANI): for example, the
Government of India holds 71.64% of HAL at the quarter ended 30 June 2026, with the holder
named "President of India" (claim `union-defence:c011`). The BSE shareholding API returned
"Access Denied" on 2026-10-04 (union-defence.json gap). screener.in is the reported-tier
cross-check, and it labels the holder only "Promoters". NSE's annual-reports API
(`/api/annual-reports?index=equities&symbol={SYMBOL}`) gives the DPSU annual report PDFs
(recon.json, manpower fill).

### Voids and gaps (Phase H)

- **BPR&D Data on Police Organisations** (`bprd.nic.in`, `bprd.gov.in`): 000 on every path,
  503 over HTTP. The proxy log shows the tunnel closed mid-exchange (recon.json). It would
  settle sanctioned and actual strength by state and by commissionerate, women's share,
  police expenditure and the national list of commissionerates. The spec routes round it
  through PRS transcriptions, IJR and a Drishti mirror of DoPO 2019, all reported (spec §2).
  Every state strength row carries `reported:` (state-police.json). So does every
  union-home.json strength row except seven read from MHA Annual Reports (four CAPF, three
  Delhi Police). A second gap sits inside: union-home.json notes that the 2021 SSB row
  equals the 2020 one and may be a carry-over.
- **CAG, every host** (`cag.gov.in`, the AG hosts, `sfr.cag.gov.in`, `pag.cag.gov.in`,
  `saiindia.gov.in`): 000. It would settle the Adarsh report paragraphs, the 2020 offsets
  audit's report number and state police modernisation audits (money-people.json and
  procurement-industry.json gaps), and the defence estates audits (recon.json). Only Report No. 3 of 2019 is read,
  through the CHRI mirror.
- **`mod.gov.in` and the service portals**: 000 for the ministry, the Army, the Navy, MES,
  DESW, the Agniveer recruitment site and the Coast Guard; 403 for BSF; ITBP, SSB and Assam
  Rifles 000; the Air Force site stalls. It would settle the Defence Services Estimates (if
  published), the 2015 OROP order and tables, the 2008 pension-regulation text on
  post-retirement employment, the ministers' roster at source, Agniveer pay and the command
  headquarters cities (recon.json; money-people.json, pay-pensions.json and union-defence.json
  gaps; footprint.json void).
- **`openbudgetsindia.org`**: dead. 520 in the Union probes, then a 301 to an unrelated
  mutual-fund domain with `/dataset` 404. Never cite it. It would have given machine-readable
  Union and state budget files (recon.json); for the Union the `indiabudget.gov.in` PDFs carry
  the same lines.
- **`eci.gov.in` bond disclosure**: 406 with any user agent. It would let the bond rows be
  read at source rather than through the `myneta.info` mirror.
- **Most state finance portals**: 000 for Maharashtra, Bihar, West Bengal, Madhya Pradesh,
  Tamil Nadu, Karnataka and seven more. Only `budget.up.nic.in`, `cfms.ap.gov.in` and
  `apfinance.gov.in` answered (recon.json). Jammu and Kashmir's finance hosts were 502, Delhi's
  reset and Puducherry's presented an expired certificate. They would settle the state police
  demands with a pay and capital split for the large states and the state pay matrices
  (state-police.json, pay-pensions.json gaps).
- **City police sites**: Bengaluru, Chennai, Kolkata and Hyderabad 000. An old Ahmedabad
  city-police domain answers 200 with unrelated spam; never cite it. No state publishes a
  commissionerate as a separate budget demand, so even a working site would settle strength
  and tenders, not a city budget. Only Delhi Police has a budget line (Union Demand 51).
- **Defence Procurement Portal and the DDP export endpoints**: `defproc.gov.in` is 200 but
  every list sits behind an image CAPTCHA. `api.ddpdashboard.gov.in` serves production at 200
  and answers 401 on export endpoints (token-gated). They would settle MoD tender and award
  rows and DPSU-by-DPSU export figures; PIB gives only the DPSU and private aggregates.
- **CPPP award-of-contract lists**: on `etenders.gov.in` and the state GePNIC instances the
  public award route posts a `captchaText` field; no award row was read without a solve. It
  would settle live verification of the security slice built from the on-disk scrape (spec
  §2.1: 529,837 raw rows, 360,450 distinct tender ids). The Phase G sample found 40 of 40
  pages gone (spec §2; `research/raw/cppp/sample-verification.json`). No winner is named from the slice.
- Smaller voids carried by the fleet: `data.gov.in` (JS shell, API 000), the Supreme Court
  judgment hosts (000; `indiankanoon.org` instead), the Directorate General Fire Services,
  Civil Defence & Home Guards (expired certificate; not fetched, since TLS checks stay on),
  `rbidocs.rbi.org.in` (bot challenge), the RBI back-issues, and Rajya Sabha answers (API
  504 / 400). R&AW is not itemised in any demand; the fleet says so and does not estimate
  it (union-home.json void).
