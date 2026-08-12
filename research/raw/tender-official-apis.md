# Indian government procurement data — official bulk / API reconnaissance

**Date of probe:** 2026-08-12
**Scope:** OFFICIAL publishers only (government portals + the Open Contracting Partnership
data registry). Third-party scrapes on GitHub/Kaggle are deliberately excluded — a peer
pass covers those.
**Method:** live `curl` against every endpoint. Every HTTP status below was actually
observed, not inferred. Nothing was bulk-downloaded in this pass; file sizes were
established with HTTP range requests (`-r 0-0`), and one 150 KB range probe was used to
read the Himachal schema.

**The deciding question this note exists to answer:** does any official Indian source
carry (a) **number of bids received per tender** and (b) a **winner company identifier
(CIN)**?

> **Answer up front: (a) YES — bid counts are published, officially, for two states.
> (b) NO — no official Indian procurement source publishes a CIN, GSTIN or any other
> resolvable company identifier for the winner. Not one.**

### Summary

| # | Source | Verdict | Bid counts | Winner name | Winner CIN |
|---|---|---|---|---|---|
| 6b | **OCP registry pub 77 — Himachal Pradesh** | **USABLE** | **Yes (100%)** | **Yes** | No |
| 6a / 1 | **Assam** — OCP pub 131 bulk file, or data.gov.in API (34,232 rows) | **USABLE** as a dataset; §1 rates the *API route* PARTIAL (tender-stage only, 10 rows/request) | **Yes** | No | No |
| 1 | data.gov.in — everything else procurement | PARTIAL | No | Names only, 15-46 rows | No |
| 2 | CPPP / eprocure.gov.in | PARTIAL (live) / **BLOCKED** (awards) | No | No | No |
| 3 | GeM (`gem.gov.in`) | **BLOCKED** (TCP refused) | No | No | No |
| 4 | IREPS (railways) | **BLOCKED** (captcha + login) | No | No | No |
| 5 | State portals (5 GePNIC reachable) | PARTIAL (live) / **BLOCKED** (awards) | No | No | No |
| 5 | Telangana, Karnataka | **BLOCKED** | No | No | No |

---

## 1. data.gov.in — OGD Platform API

**Base:** `https://api.data.gov.in/`
**Demo key tested:** `579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b`

### Does the demo key work?

**Yes, on every resource tried (11+).** It is not a teaser key — it returns real data.

| Probe | Result |
|---|---|
| `GET /lists?format=json&api-key=<demo>&limit=3` | **HTTP 200**, JSON, `"total": 285833` resources |
| `GET /resource/<id>?api-key=<demo>&format=json` | **HTTP 200**, JSON with `field[]` schema + `records[]` |
| `format=csv` | **HTTP 200**, `text/csv`, proper OCDS-style headers |
| `format=xml` | **HTTP 200**, `text/xml;charset=UTF-8` |
| `api-key=BOGUSKEY123` | `{"error": "Key not authorised"}` — the key **is** enforced |

**The one real constraint: the demo key hard-caps at 10 records per request.**
Verified — `limit=10`, `50`, `100`, `1000` all return `count: 10`. Confirmed in CSV too
(`format=csv&limit=100` → 10 data rows).

**But `offset` paging is not capped.** `offset=9000` on a 9,043-row resource returned
rows normally. So a full extract is 10 rows/request × N requests — 9,043 rows = ~905
requests. Tedious but entirely feasible and needs **no registered key**. A registered key
(free, self-service) raises the per-request limit and is the sane route for real ingest.

**No resource tested required a registered key.** The catalogue is open; the key is a
rate-limit token, not an access gate.

### Catalogue search

`filters[title]=<term>` works as a match query on the title field. `q=` and bare `title=`
are **ignored** (they silently return the unfiltered 285,833). Use `filters[title]`.

Sweep results — `procurement` (242), `contract` (41), `contracts` (7), `tenders` (5),
`award` (23), `awarded` (59), `GeM` (3), `bidder` (0).

**Almost all of it is Rajya Sabha parliamentary-answer tables** — tiny, aggregate, useless
for this purpose. Verified examples:

| Resource | Rows | Fields |
|---|---|---|
| `9c02517a-…` Karnataka NH tenders/contracts | **3** | `_year`, `number_of_tenders_floated`, `number_of_contracts_awarded` |
| `f0069c16-…` Station redevelopment contracts 2022-23 | **46** | station, state, contract value — **no supplier** |
| `b9ebfab1-…` NCC dress supply firms | **15** | `name_of_the_firm`, `item`, `qty_ordered` — names only, no ID |
| `4e5317af-…` RGGVY contractors, MPMKVVCL | **22** | district, `name_and_address_of_contractor` |
| `0b0b4f03-…` GeM transactions by state 2017-18 | **34** | state, txn count, value — pure aggregate |

### The one thing that matters here: Assam Public Procurement Data

Six resources, **one per fiscal year**, published by *Finance Department, Assam /
Assam Society for Comprehensive Financial Management System (AS-CFMS)*. This is genuine
**OCDS**, not a parliamentary table.

| Fiscal year | Resource ID | Rows |
|---|---|---|
| 2016-17 | `91e35f71-68d2-4e77-ae6b-e5a16642ffc1` | 1,576 |
| 2017-18 | `d9a9fd53-4edd-4f65-8dcd-d5844f7fa76e` | 6,128 |
| 2018-19 | `64fa2910-4d48-469d-92d8-d00086d1e462` | 9,043 |
| 2019-20 | `deadcf24-4261-4574-b766-ccb377dd0f3b` | 6,205 |
| 2020-21 | `fbf7f636-5926-41d5-b168-b030c3415a5c` | 6,590 |
| 2021-22 | `48571d3f-38c8-4cba-b94f-fa12dddbdcdf` | 4,690 |
| | **TOTAL** | **34,232** |

Catalogue page: `https://data.gov.in/catalog/assam-public-procurement-data`
(HTTP 200, but the resource list is **JS-rendered** — the static HTML carries no download
links. The API is the machine route.)

**Full field list** (identical across all six):

```
ocid, initiationtype, tag, id, date, tender_id, tender_externalreference,
tender_title, tender_mainprocurementcategory, tender_procurementmethod,
tender_contracttype, tenderclassification_description,
tender_submissionmethoddetails, tender_participationfee_0_multicurrencyallowed,
tender_allowtwostagetender, tender_value_amount, tender_datepublished,
tender_milestones_title, tender_milestones_code, tender_milestones_type,
tender_milestones_duedate, tender_tenderperiod_durationindays,
tender_allowpreferentialbidder, payment_mode, tender_status, tender_stage,
tender_numberoftenderers, tender_milestones_type_1, tender_milestones_title_1,
tender_milestones_duedate_1, tender_bidopening_date, tender_documents_id,
buyer_name, fiscal_year
```

Sample record (2018-19, verbatim):

```json
{"ocid": "ocds-kjhdrl-2018_ICD_4780_1", "initiationtype": "tender", "tag": "tender",
 "tender_id": "2018_ICD_4780_1", "tender_title": "Over Head Line Shifting cum Erection",
 "tender_mainprocurementcategory": "Works", "tender_procurementmethod": "Open Limited",
 "tender_value_amount": 519200, "tender_datepublished": "2018-04-01 9:00:00",
 "tenderclassification_description": "Electrical Works"}
```

**`tender_numberoftenderers` is populated with real values** — sampled 10 consecutive
records at offset 500: `6, 1, 7, 5, 9, 9, 4, 5, 4, 1`. This is the bid count.

**But every record is `tag: "tender"` / `initiationtype: "tender"`.** There is no award
stage. **No supplier field, no winner name, no CIN.** `buyer_name` is the procuring
department, not the vendor.

> **VERDICT: PARTIAL** — 34,232 OCDS tender records with genuine bid counts, free and
> unauthenticated, but tender-stage only: no winner, no company identifier.

---

## 2. CPPP / eprocure.gov.in — Central Public Procurement Portal

Two distinct front-ends live on this host and they behave differently:

- `https://eprocure.gov.in/cppp/` — a **Drupal** site (HTTP 200, 66 KB)
- `https://eprocure.gov.in/eprocure/app` — the **GePNIC** Java app (HTTP 200, 55 KB)

### What a machine CAN retrieve — server-rendered, paginated, no captcha

| Endpoint | HTTP | Volume | Columns |
|---|---|---|---|
| `/cppp/latestactivetendersnew?page=N` | **200**, 112 KB | **Total Tenders: 33,595** (3,360 pages × 10) | Sl.No, e-Published Date, Bid Submission Closing Date, Tender Opening Date, Title/Ref.No./Tender Id, Organisation Name, Corrigendum |
| `/cppp/gemtender?page=N` | **200**, 457 KB | **Total Bid(s): 39,709** (3,971 pages × 10) | Sl.No, Bid Start Date, Bid End Date, Bid Number/Total Quantity, Product Category, Organisation Name, Department Name |
| `/cppp/highvaluetenders` | **200**, 63 KB | **Total Tenders: 492** | same as active tenders |

Pagination verified live: `/cppp/gemtender?page=2` → HTTP 200, returned rows 11-20
(`GEM/2026/B/7334298`). The `?page=N` parameter works without a session or token.

Sample row from `/cppp/gemtender` (verbatim):

```
1. | 19-Jun-2026 12:24 PM | 15-Sep-2026 01:00 PM | GEM/2026/B/7619530/ 3480000 |
Mine Development & Operations Service - Revenue Sharing Basis - Under-Ground Mining; Coal |
South Eastern Coalfields Limited | COAL INDIA LIMITED
```

**These are all FORWARD-LOOKING open tenders.** No award, no supplier, no bid count.

### What is BLOCKED — the award data specifically

| Endpoint | HTTP | What actually happened |
|---|---|---|
| `/cppp/resultoftendersnew` | **200**, 144 KB | **Zero data rows.** Page carries a Drupal image CAPTCHA: `<img data-drupal-selector="edit-captcha-image" src="/cppp/image-captcha-generate/506865510/1786497716">`. Form fields: `org_name`, `year`, `aoc_status`. Results only render after captcha validation. |
| `/cppp/resultoftendersnew?page=1` | **200**, 144 KB | Zero rows — pagination does not bypass the captcha |
| `POST /cppp/resultoftendersnew/cpppdata` | **200**, 144 KB | Returns the same shell page, not JSON. Not a real data endpoint. |
| `/cppp/cancelledtenders` | **200**, 170 KB | Zero data rows — same captcha gate |
| `/eprocure/app?page=ResultOfTenders&service=page` | **200**, 35 KB | Renders "Enter Captcha … Refresh". Table headers present but empty: **S.No, AOC Date, e-Published Date, Title and Ref.No./Tender ID, Organisation Chain, AOC** |
| `/eprocure/app?page=WebAwards&service=page` | **200**, 33 KB | Page titled "Awards" renders **empty** |
| `/eprocure/app?page=WebDebarmentList&service=page` | **200**, 2.5 KB | *"Your session in the client area has expired"* — session-gated |
| `/eprocure/app?page=DownloadDocs&service=page` | **200**, 2.5 KB | Same session-expiry error |
| `https://gepnicreports.gov.in/eprocreports/eproc/` | **curl 35** | `Recv failure: Connection reset by peer` — the MIS reports host refuses the connection outright |

Note the AOC listing schema even when unlocked: **Organisation Chain, AOC Date, Tender ID
— and an "AOC" link.** There is **no supplier column and no bid-count column** in the
listing. The winner's name lives inside a per-tender AOC document behind that link.

### The dashboard JSON — exists, serves empty

The Drupal JS bundle (`/cppp/sites/default/files/js/js_czeTiMhk-…js`, 250 KB) references
four dashboard feeds:

```
https://eprocure.gov.in/cppp/sites/default/files/dashboard_json/fin_yr_chart_data_live.json
                                                              /orgwise_chart_data_live.json
                                                              /typewise_chart_data_live.json
                                                              /fin_yr_aoc_chart_data_live.json
```

All four: **HTTP 200, `Content-Type: application/json`, `Last-Modified: Tue, 11 Aug 2026
20:10:01 GMT` — and 0 bytes.** Retried 3×, consistently empty. Non-`_live` variants 404.
The files are actively regenerated and served empty to anonymous clients. Even if
populated these are chart aggregates, not records.

### `/cppp/awards`

**HTTP 200, 45 KB — and it is a decoy.** This page lists prizes *won by the CPPP portal
itself* (NeSDA rank, CSI-SIG eGovernance Award 2020, South Asian Procurement Innovation
Award 2018). Nothing to do with contract awards.

`/cppp/downloaddisp` (HTTP 200, 45 KB) is a document library of procurement **policy**
PDFs behind obfuscated base64 URLs — rules and manuals, not data.

> **VERDICT: BLOCKED (for award data) / PARTIAL (for live tenders)** — 73,000+ *open*
> tenders are freely scrapeable as paginated HTML, but every award/result surface is
> captcha- or session-gated, and even unlocked it carries neither bid counts nor supplier
> identifiers.

---

## 3. GeM — Government e-Marketplace (`gem.gov.in`)

**Network-level refusal from this environment.**

| Host | Result |
|---|---|
| `https://gem.gov.in/` | **HTTP 000** — `connect to 160.187.232.12 port 443 failed: Connection refused` |
| `http://gem.gov.in/` | HTTP 000 |
| `https://gem.gov.in/robots.txt` | HTTP 000 |
| `https://gem.gov.in/statistics`, `/dashboard`, `/reports` | HTTP 000 |
| `https://mkp.gem.gov.in/`, `/search` | HTTP 000 |
| `https://bidplus.gem.gov.in/all-bids` | HTTP 000 |
| `https://gemnxt.gem.gov.in/`, `https://services.gem.gov.in/` | HTTP 000 |
| `https://assets-bg.gem.gov.in/` | **HTTP 403** |

DNS resolves fine (`gem.gov.in` → 160.187.232.12, `bidplus.gem.gov.in` → 160.187.232.18).
The asset host answers with a 403. The application hosts **refuse the TCP connection**.
This is an edge/WAF policy against datacentre IP ranges, not a transient failure — it is
not a UA problem and no header will fix it. **This is a finding about GeM, not a
retrieval failure.**

**The usable substitute:** CPPP mirrors the live GeM bid book at
`https://eprocure.gov.in/cppp/gemtender?page=N` — **39,709 bids**, server-rendered, freely
paginated (see §2). That gives GeM bid numbers, buyers, product categories and dates
without touching `gem.gov.in` at all.

What that mirror does **not** give: award outcomes, seller identities, transaction values,
bid counts. GeM's own published analytics (the statistics/dashboard pages) were
unreachable, so I cannot characterise them from this network — recorded as unverified,
not as absent.

The only GeM data on data.gov.in is a 34-row state-wise transaction aggregate for 2017-18
(`0b0b4f03-…`) and two similar Rajya Sabha tables. Aggregates only.

> **VERDICT: BLOCKED** — all GeM hosts refuse the connection at TCP level; only a live
> open-bid mirror on CPPP is reachable, and it carries no awards, no bid counts, no seller IDs.

---

## 4. IREPS — Indian Railways E-Procurement System (`ireps.gov.in`)

The host is reachable — `https://www.ireps.gov.in/` HTTP 200, 23 KB. The navigation is
entirely `javascript:` calls, resolved by fetching `/ireps/js/menu.js` (HTTP 200, 2.6 KB),
which yields the real endpoints.

| Endpoint (from menu.js) | HTTP | Result |
|---|---|---|
| `/epsn/reports/AnnualProcurmentValue.do?showPage=show&language=en` | **200**, 10.9 KB | **Captcha login page** |
| `/epsn/reports/HighValue.do?showPage=show&language=en` | **200**, 10.9 KB | **Captcha login page** |
| `/epsn/bannedFirms.do?searchParam=showBannedFirm&language=en` | **200**, 10.9 KB | **Captcha login page** |
| `/epsn/anonymSearchPO.do?searchParam=showPageSupply&language=en` | **200**, 10.9 KB | **Captcha login page** |
| `/epsn/anonymSearch.do?searchParam=showPageClosed&language=en` | **200** | **Captcha login page** |
| `/epsn/guestLogin.do` | **200**, 10.9 KB | **Captcha login page** |
| `/html/misc/ContractAwarded.html` | **404** | Dead link in the live menu |
| `/html/misc/awardedSupplyContractZonalRly.html` | **200**, 4.9 KB | Link directory only (see below) |

**Every `.do` endpoint returns the same page**: "Authenticate Yourself", a
`JSESSIONID`-bearing form posting to `/epsn/guestLogin.do`, and an image captcha.
Distinct session IDs per request confirm it is a live gate, e.g.
`action="/epsn/guestLogin.do;jsessionid=0001_Bn6VjiH8ZdO8Zlb34n_YPm:1886ttu71"`.

`menu.js` also documents that anonymous search was **deliberately disabled** — the
`anonymSearch()` body has the direct search URL commented out and replaced with a redirect
to `guestLogin.do`, above a commented-out alert reading *"Due to heavy load on system
search facility without login is currently not available."* A further comment records
"character verification" (captcha) added 08-08-23 on the auction listings.

`awardedSupplyContractZonalRly.html` is **not data** — it is a page of outbound links to
each zonal railway's own website (`dlw.`, `icf.`, `rcf.`, `mcf.`, `clw.`, `dmw.`, `rwf.`,
`core.indianrailways.gov.in`), each publishing its own contract page in its own format.
There is no consolidated railway award feed.

No bulk download, no API, no RSS, no XML anywhere on the host.

> **VERDICT: BLOCKED** — every anonymous report and search endpoint sits behind a
> captcha + JSESSIONID guest login that the portal added on purpose; the one non-gated
> "awarded contracts" page is a link directory to 8 separate zonal sites.

---

## 5. State e-procurement portals

Seven hosts probed. **Six are GePNIC instances** — the same NIC software as
`eprocure.gov.in` — and they behave identically, which makes this one finding rather than
seven.

### The structural finding: GePNIC splits its front end in two

- **Browse pages** — `FrontEndTendersByOrganisation`, `FrontEndListTendersbyDate`,
  `FrontEndViewTender`. Server-rendered, **no captcha**, full data. These cover
  **live/open tenders only**.
- **Search pages** — `ResultOfTenders`, `WebTenderStatusLists`,
  `FrontEndLatestActiveTenders`, `FrontEndAdvancedSearch`, `FrontEndTendersInArchive`,
  `WebCancelledTenderLists`. Return **HTTP 200 with table headers present and zero data
  rows**, gated on a server-rendered image captcha (`captchaImage`, input `captchaText`,
  maxlength 6). **Everything historical and every award lives behind this gate.**

No JS rendering is involved anywhere — the blank tables are blank *server-side*.

**Maharashtra proved the gate is double-locked.** POST to `ResultOfTenders` with no
keyword → HTTP 200, 35,792 B, *"Please Enter a Valid Tender ID or Keyword."* POST with
`Keyword=repair` and a wrong captcha → HTTP 200, 35,624 B, *"Invalid Captcha! Please Enter
Correct Captcha."* So **even solving the captcha gives no browse-all of awards** — you
must already know a tender ID or keyword. There is no bulk award corpus on these portals
in principle, not merely in practice.

As on CPPP, `WebAwards` is a **decoy** — the portal's own "Recognitions" page (32,903 B,
no captcha, zero procurement content). The real AOC listing is `ResultOfTenders`, columns
`S.No | AOC Date | e-Published Date | Title and Ref.No./Tender ID | Organisation Chain | AOC`.

### (a) Bulk export or API — NO, on every host

Zero machine-readable endpoints in any fetched page: no `.xml`, `.json`, `.csv`, `.xls`,
no `.rss`, no `/api`, no export or feed link. "Downloads" is `StandardBiddingDocuments` —
blank bidding-document templates.

Every portal routes MIS Reports to an **external host, `gepnicreports.gov.in`**, with
confirmed per-state paths `/eprocreports/{maha,tn,etenders,ori,asm}/`. That host resolves
(164.100.69.65) but returns **connection reset by peer (curl 35)** on https — retried with
`-k`, and HTTP 000 on port 80. **I independently reproduced this**:
`https://gepnicreports.gov.in/eprocreports/maha/` → HTTP 000. Almost certainly geo-fenced
to Indian IPs. **This is the single best bulk-data lead if an in-country egress path ever
becomes available.**

`mahatenders.gov.in/robots.txt` → HTTP 200, 27 B: `User-agent: *` / `Disallow: /`.
All other `robots.txt` and every `sitemap.xml` → 404.

### (b) Bid counts per tender — NO on every reachable page

A real tender detail page was reached (`FrontEndViewTender`, HTTP 200, 77,397 B, 217
`<tr>`). It is field-rich and still has **no bidder count**: Organisation Chain, Tender Ref
`CEC/C2/45/2026-27`, Tender ID `2026_BEST_1323269_1`, Tender Type Open, Category Works,
No. of Covers 2, Tender Fee ₹3,540 + ₹500 processing, EMD ₹53,000, **Tender Value
₹63,11,127**, Product Category Civil Works, Period of Work 150 days, Location Colaba,
Pincode 400001. The only bid-shaped fields are `Bid Validity(Days)` and `Allow Two Stage
Bidding`.

This is inherent, not incidental: the browse route only surfaces **open** tenders, which by
definition have no bid tally yet. Bid counts sit behind the AOC pages, unreachable on
every host.

Sample of real captive-free data retrieved (Maharashtra, BEST):

```
1 || 10-Aug-2026 11:00 AM || 24-Aug-2026 03:00 PM || 27-Aug-2026 03:00 PM ||
[Repairs to pot holes of yard by providing premix asphalt near Washing Shed, EV Charging
Station and Traffic Building at Shivaji Nagar Bus Depot] [CEC/C3/48/2026-27]
[2026_BEST_1323335_1] || Brihanmumbai Electric Supply and Transport Undertaking || Civil Eng...
```

### Per-host results

| Host | Working base path | Observed | Verdict | Bid counts |
|---|---|---|---|---|
| **mahatenders.gov.in** | `/nicgep/app` | Org index **HTTP 200, 239,396 B, 177 rows** (independently re-verified); drill-down 200/187,416 B/**78 tender rows**; by-date 10 rows. Awards captcha-gated. | **PARTIAL** | **No** |
| **tntenders.gov.in** | `/nicgep/app` | Org index 200/131,596 B — **78 orgs / 5,479 tenders**, captcha-free. `ResultOfTenders` 200/35,923 B captcha. | **PARTIAL** | **No** |
| **etenders.gov.in** | `/eprocure/app` (**not** `/nicgep/`) | Org index 200/126,614 B — **76 orgs / 1,951 tenders**. Central NIC instance, PSU-heavy (AAI Cargo, AWEIL, AIESL). | **PARTIAL** | **No** |
| **tendersodisha.gov.in** | `/nicgep/app` | Org index 200/109,480 B — **64 orgs / 1,682 tenders**; drill-down verified 200/31,513 B with real rows. | **PARTIAL** | **No** |
| **assamtenders.gov.in** | `/nicgep/app` | Org index 200/86,721 B — **42 orgs / 297 tenders**. Smallest instance. | **PARTIAL** | **No** |
| **tender.telangana.gov.in** | `/login.html` | **Not GePNIC** — separate TS eProcurement stack. Login page 200/64,282 B does server-render live tender cards (Tender ID 724707, ENQ `E1726O0100`), but MIS Reports POST → `mis-reports.html` → **405 → `SessionTimeOut.html?error=4`**, *"session terminated due to input of restricted or sensitive information"*. WAF + login wall, reproduced with a clean session. | **BLOCKED** | **No** |
| **eproc.karnataka.gov.in** | — | **Network-level failure, not HTTP.** DNS resolves to 103.138.196.30 and 164.100.133.75; TCP connect **times out** on 443 and 80 (curl 28). Retried with `-k` — same timeout, so **not** a TLS-chain issue. Unreachable / geo-fenced. | **BLOCKED** | Unknown |
| `odishatenders.gov.in` | — | **NXDOMAIN** (curl 6). Only `tendersodisha.gov.in` exists. | **N/A** | — |

### Practical read

The five reachable GePNIC hosts give a genuinely usable, captcha-free, no-JS harvest of the
**live tender pipeline** — org → tender list → full detail with tender value, EMD,
category, location, pincode — via `?page=FrontEndTendersByOrganisation&service=page`, then
following the session-bound `sp=` DirectLink tokens with a `JSESSIONID` cookie jar. The
`sp=` tokens are **encrypted and session-scoped**, so they cannot be constructed or cached
across sessions. Roughly **9,400 open tenders** were enumerable across the four state
instances plus the central one at scan time.

What automation **cannot** reach is precisely the half that matters: awards, executed
contract values, winners, and bid counts.

> **VERDICT: PARTIAL (5 GePNIC hosts) / BLOCKED (Telangana, Karnataka)** — open-tender
> browse is freely harvestable, but every award surface is captcha-gated *and* requires a
> known tender ID, so no bulk award corpus exists on state portals at all. Note the irony:
> Assam's portal is BLOCKED for awards, yet Assam is one of only two states whose bid
> counts are published — via data.gov.in, not via its own portal.

---

## 6. Open Contracting Data Standard — the OCP Data Registry

**Registry:** `https://data.open-contracting.org/` (HTTP 200)
Search: `/en/search/` (HTTP 200). `/api/publishers` → **HTTP 404** — there is no public
JSON API; the registry is an HTML site with static bulk download links.
`https://www.open-contracting.org/data-registry/` → HTTP 404 (moved).

**`/en/search/?country=India` → HTTP 200: "2 datasets match the selected filters".**

The registry's own facet counts for India are the single most useful fact here:

```
Tender data 2 · Awards data 1 · Parties data 1 · Contracts data 0
Documents data 2 · Milestones data 1 · Amendments data 2
```

**Exactly one Indian dataset in the world carries award data.**

### 6a. `/en/publication/131` — India: Assam State Government Finance Department

- Source of record: `https://data.gov.in/catalog/assam-public-procurement-data` (i.e. §1)
- Transformation to OCDS done "in collaboration with the NGO CivicDataLab (CDL)"
- Licence: **Government Open Data License – India**
- Data date range: **Sep 2022 – Sep 2022**; last retrieved 2 Oct 2024;
  flagged ***"This dataset is no longer updated by the publisher"***
  (the narrow date range is an artefact — every record's OCDS `date` is stamped
  `2022-09-29`, the publication date, not the tender date. The `tender_datepublished`
  field inside spans FY2016-17 to FY2021-22.)

**Bulk downloads — verified live by HTTP range request:**

| File | HTTP | Size |
|---|---|---|
| `/en/publication/131/download?name=full.jsonl.gz` | **206** `application/gzip` | **1,987,321 B** |
| `/en/publication/131/download?name=full.csv.tar.gz` | **206** `application/gzip` | **3,102,712 B** |
| `/en/publication/131/download?name=full.xlsx` | **206** `spreadsheetml` | **7,989,856 B** |

Per-year files also exist (`name=2022.jsonl.gz` etc.).

Same content as §1 — tender stage only. Bid counts yes, winner no.

### 6b. `/en/publication/77` — India: Himachal Pradesh (CivicDataLab)

**This is the richest Indian procurement dataset in existence, and the only one with awards.**

- Description: tender information from *Tenders Himachal Pradesh* (Government
  Departments, Directorates, Statutory Organisations, Local bodies, Undertakings/Boards,
  published by the **Himachal Pradesh Finance Department**), plus **"related awards data
  from the Central Public Procurement (CPP) Portal"**
- Source repo: `https://github.com/CivicDataLab/himachal-pradesh-health-procurement-OCDS/`
- Licence: **CC BY 4.0**
- Data date range: **Aug 2020 – Aug 2020**; last retrieved 27 Mar 2023;
  flagged ***"no longer updated by the publisher"***
  (again a stamping artefact — actual tender dates inside run from 2016)

**Bulk downloads — verified by range request:**

| File | HTTP | Size |
|---|---|---|
| `/en/publication/77/download?name=full.jsonl.gz` | **206** `application/gzip` | **830,688 B** |
| `/en/publication/77/download?name=full.csv.tar.gz` | **206** `application/gzip` | **1,022,814 B** |
| `/en/publication/77/download?name=full.xlsx` | **206** `spreadsheetml` | **2,233,609 B** |

**Schema probe.** I fetched the first 150,001 bytes of `full.jsonl.gz` and streamed it
through zlib — 1.72 M characters decompressed, **598 complete compiled OCDS releases
parsed**. This is a real measurement on real records, not a guess.

Full flattened structure of one record:

```
/ocid                                  ocds-kjhdrl-2016_BSMDA_13587_1
/tag[]                                 compiled
/initiationType                        tender
/buyer/id                              BSMDA_2000
/buyer/name                            Bus Stands Management and Development Authority
/tender/id                             2016_BSMDA_13587_1
/tender/title                          Balance works in HRTC Workshop Rampur at Una
/tender/value/amount                   11807783
/tender/mainProcurementCategory        works
/tender/procurementMethod              limited
/tender/contractType                   itemRate
/tender/numberOfTenderers              7          ← BID COUNT
/tender/tenderPeriod/{startDate,endDate,durationInDays}
/tender/awardPeriod/startDate
/tender/contractPeriod/durationInDays
/tender/procuringEntity/{id,name}
/tender/items[]/{id,description}
/tender/documents[]/{id,description}
/tender/bidOpening/address/streetAddress
/tender/evaluation/{generalTechnicalEvaluationAllowed,itemWiseTechnicalEvaluationAllowed}
/tender/participationFees[]/{value,payee,methodOfPayment,paymentAddress}
/award/date                            2018-07-25T00:00:00Z
/awards[]/id                           1.0
/awards[]/value/amount                 11178646   ← AWARD VALUE
/awards[]/value/currency               INR
/awards[]/suppliers[]/id               1.0        ← sequence number, NOT an entity ID
/awards[]/suppliers[]/name             ganesh     ← WINNER NAME (free text)
/parties[]/{id,roles[],address,contactPoint}
```

**Coverage across the 598 sampled records:**

| Field | Coverage |
|---|---|
| `tender.numberOfTenderers` | **598 / 598 (100%)** |
| `awards[]` | **598 / 598 (100%)** |
| supplier entries | 729 (multi-supplier awards occur) |

`numberOfTenderers` distribution — plausible, not placeholder:
`1:19, 2:138, 3:149, 4:104, 5:67, 6:52, 7:28, 8:19, 9:16, 10:3, 11:1, 14:1, 31:1`

**The identifier problem, measured.** Across the full 1.72 MB decompressed sample:

- **CIN regex `[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}` → 0 matches.**
- **GSTIN regex → 0 matches.**
- The OCDS `identifier` object (which is where `scheme`/`id` for a legal entity would
  live) **is not present at all** — the key never appears.
- `awards[].suppliers[].id` takes values `1.0 … 12.0` — a **within-award sequence
  number**, reused across every tender. It is not an entity key.
- Supplier names are raw free text and frequently natural persons, not companies:
  `ganesh`, `Bijender Singh Justa`, `Amar Chand Negi`, `SURINDER KUMAR`, `chuni lal`,
  `individual`, `YASH PAL-Yash Pal`, `Bharat Boring Company`, `M MOHAN-Gem Rock Drills`,
  `Sanjeev Kumar-Jay Dee Engineering Service`, `MOHKAM SINGH CONTRACTORS`, `VB CONST CO`,
  `M/s Pardeep Sublaik`

Note the `ocid` prefix `ocds-kjhdrl-` is **identical** to Assam's — both derive from the
same GePNIC-family source system.

**Provenance caveat, stated plainly.** Publication 77 is transformed and published by
**CivicDataLab, an NGO** — not by the Himachal Pradesh government. The underlying tender
records come from the HP Finance Department portal and the awards from CPPP, but the
compiled OCDS artefact is a third-party product listed in the official OCP registry.
It is *registry-official*, not *publisher-official*. Publication 131 (Assam) is closer to
first-party: the source is the Assam Finance Department's own data.gov.in catalogue, with
CDL doing only the OCDS mapping.

> **VERDICT: USABLE** — two Indian OCDS datasets with working static bulk downloads in
> JSON/CSV/XLSX, no key, no captcha. Himachal (pub 77) is the only Indian source anywhere
> carrying bid counts *and* winners in the same record. Both are frozen — neither has been
> updated since 2023/2024.

---

## 7. RBI / SEBI-adjacent

Out of scope by instruction. Not investigated.

---

## Ranked recommendation

### 1. OCP Data Registry publication 77 — Himachal Pradesh (INGEST THIS FIRST)

`https://data.open-contracting.org/en/publication/77/download?name=full.jsonl.gz` — 831 KB.

The only Indian dataset that joins **bid count → award value → winner name** inside one
record, at 100% field coverage. Compiled OCDS, so it needs no reverse-engineering. It is
small enough to ingest in a single pass and validate exhaustively. Static file, no key,
no captcha, no rate limit, CC BY 4.0.

Its weaknesses are real and must be carried as caveats: one state, frozen at 2023, NGO
transformation, and winners as unresolvable free-text names.

### 2. OCP publication 131 / data.gov.in — Assam (INGEST SECOND)

Take the **OCP bulk file** (`…/publication/131/download?name=full.jsonl.gz`, 1.99 MB), not
the data.gov.in API — same data, one request instead of ~3,400 paged calls at 10 rows each.

34,232 tender records across six fiscal years with bid counts. Use data.gov.in's API only
to check whether a FY2022-23+ resource has since appeared, since the OCP mirror is frozen
at Oct 2024 and the six resource IDs above are the complete current set.

Together these two give roughly **35,000 tenders with published bid counts** — enough to
build a real bidder-concentration and single-bid-rate baseline for two states.

### Not worth ingesting

- **CPPP live tender/GeM-mirror HTML** (73,000 open tenders). Cheap to scrape, but it is
  forward-looking notices with no outcome, no bid count and no supplier. It answers
  "what is being tendered", never "who won and against how many".
- **data.gov.in parliamentary-answer tables.** 3-46 rows each, aggregate.

---

## What is simply not obtainable — stated honestly

**1. Winner CIN. From any official Indian procurement source. At all.**
Not from CPPP, not from GeM, not from IREPS, not from data.gov.in, not from either OCDS
publication. Measured, not assumed: zero CIN matches and zero GSTIN matches across the
entire Himachal sample, and the OCDS `identifier` object — the standard's designated slot
for exactly this — is absent from the only dataset that has suppliers at all. Indian
procurement portals record the vendor as a display string. **Any company-level linkage
will require fuzzy name resolution against MCA data, and must be tiered accordingly — a
name match is not an identification.** Roughly half the Himachal supplier names are
natural persons, for whom no CIN exists even in principle.

**2. National award coverage.** CPPP's Results-of-Tenders is the only central register of
awards and it is captcha-gated by design; the "Awards" page renders empty; the MIS reports
host resets the connection; the dashboard JSON serves 0 bytes. Even fully unlocked, the
AOC listing schema has no supplier and no bid-count column — the winner is inside a
per-tender PDF. There is **no** national awarded-contracts export.

**3. Bid counts outside Assam and Himachal.** `numberOfTenderers` is a GePNIC field, so
the data demonstrably exists in every state's database — but only two states have ever
published it, and neither did so through its own portal (Assam's came out via data.gov.in;
Himachal's via an NGO's OCDS transform). Across five reachable GePNIC state portals plus
the central instance, not one exposes a bid count on any page a machine can reach. The
open-tender browse route cannot carry one even in principle, because open tenders have no
tally yet.

**The one untested lead worth recording.** `gepnicreports.gov.in` — the MIS-reports host
every GePNIC portal links to, with per-state paths `/eprocreports/{maha,tn,etenders,ori,asm}/`
— resolves (164.100.69.65) but resets the connection from this network, on both the state
sweep and my own independent retry. If it is geo-fenced rather than dead, an India-resident
egress path is the only realistic route to state-level award and bid-count data at volume.
**Unverified either way — do not assume it contains what we want.**

**4. GeM transaction-level data.** Every GeM host refuses the TCP connection from this
network. Only aggregates (state-wise transaction counts) reach data.gov.in. GeM's own
published analytics could not be assessed from here and are recorded as unverified rather
than absent.

**5. Anything current.** Both usable datasets are frozen — Himachal last retrieved
Mar 2023, Assam Oct 2024, both flagged "no longer updated by the publisher". There is no
live official feed of Indian procurement outcomes. Any finding built on these is a
historical finding and dating it matters.
