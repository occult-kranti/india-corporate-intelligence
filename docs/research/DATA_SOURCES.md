# Open data sources for the energy & natural-resources graph

Audited 2026-09-25 from the sandbox. Reachability tested with `curl` through the
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
