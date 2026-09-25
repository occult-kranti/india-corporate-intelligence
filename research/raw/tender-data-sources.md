# Indian procurement data: what exists, what doesn't, and what carries a bid count

Discovery and triage pass, 12 August 2026. Companion to `tender-data-sources.json`.
No bulk data downloaded. Schemas established from API responses, parquet footers read
by HTTP range request, committed CSV previews, and two deliberate small probes: one
162 KB Parquet partition and one 1.5 MB XLSX.

## Why this search was run

`research/raw/tenders-states.json` records the hole plainly: bidder count is *"absent
from every award we could source across all 13 states, all six sectors and all four
process types"*. `tenders-centre.json` has bid position for 38 of 125 awards. Coal has
a single-bidder rate for 0 of 133 blocks.

**That hole is now closeable.** Two independent corpora carry a per-tender bid count at
high fill. Neither carries a company identifier, and no amount of searching will
produce one — the Indian portals do not publish it.

## The three answers

**Does a usable Indian OCDS publisher exist? Yes — but not a government one.**
OCP's own collector, `kingfisher-collect`, ships exactly two Indian spiders out of 180:
`india_assam_civic_data_lab` and `india_himachal_pradesh_civic_data_lab`. Both point at
CivicDataLab GitHub repositories. No Indian government body publishes OCDS releases
directly. Odisha, which OCP materials mention alongside Assam, has no spider and no
procurement publication found in this pass.

**Can a single-bidder rate be computed? Yes, for the first time in this project.**
A probe of the smallest CPPP partition (`aoc_details` year=2011, 1,042 rows) gave 235
single-bid awards — 22.6%, with `num_bids_received` populated on 100% of rows. That is
a probe of the oldest and least representative partition, not a national statistic, and
must not be cited as one.

**Is there a winner CIN anywhere? No.** Every accessible dataset gives a free-text
bidder name, sometimes with a postal address. The only route to a CIN is fuzzy matching
against the MCA register — an inference step, never a fact.

## The top three

### 1. CivicDataLab Assam OCDS — 57,647 tenders — **bid count: yes**

The best-provenanced Indian procurement dataset in existence, and the only one this
project could refresh itself rather than merely consume.

- `tender.numberOfTenderers` at **100% fill** (300/300 sampled)
- Plus a **full named bidder roster** — `bids.details[]` gives every bidder with
  submission timestamp and per-bid status (`Accepted-AOC`, `Rejected-Technical`,
  `Rejected-Finance`, `Not Admitted-Fee/PreQual/Technical`). This is strictly better
  than a count: it yields bid count, bid position, the identity of every loser, and the
  disqualification reason. Recurring loser–winner pairs are the actual shape of a
  bid-rotation finding.
- Live CKAN API, unauthenticated, current to **February 2026**. 107 Assam bodies,
  FY2016-17 through FY2025-26.
- **Scraper code published** (GPL-2.0), captcha handling included. Data is **ODbL**.
  Data dictionary, citation file, and independent collection by OCP all present.

Weaknesses: one state; award block present in only ~37% of records; and
`numberOfTenderers` **disagrees with the roster length** — the sample's minimum was 3
while rosters included 1s and 2s. Resolve that against 20 portal pages before computing
any rate. The API is also served over plain HTTP from a bare IP with no TLS.

### 2. CPPP full scrape — 4,540,739 award-detail rows (16.6M total) — **bid count: yes**

The only nationally-scoped corpus with a bid count. Central ministries, state portals
and **defence** (`defproc.gov.in`, Military Engineer Services), 2011 to mid-2026.

- `num_bids_received` at 100% fill in the partition probed; `selected_bidders` and
  `selected_bidder_address` at 100% non-null.
- Strongest provenance signal: the preserved `raw_json` keys are the CPPP
  Award-of-Contract page's **own field labels, verbatim** — `"Number of bids received"`,
  `"Name of the selected bidder(s)"`. That is good evidence of a faithful scrape rather
  than a fabrication. A second independent pass reached the same verdict from different
  evidence: scraper failure rows, real encoding artefacts, portal junk rows (`test1`),
  and irregular rather than round row counts.

**Take `rumourscape/tenders` on HuggingFace** — CC-BY-4.0, 4.92M rows, 3.45 GB, with
`bids_received` already an `int32`, values already `float64`, dates already timestamps,
*and the raw string retained beside each cleaned column* so the cleaning is auditable.
Add `ghalibluvr/tender_dbs_parquet` only if you need the tender-notice side for bid
windows — and note it carries **no licence**. All four HF mirrors are the same scrape
(two are byte-identical); they are not independent corroboration.

The decisive weakness: **the scraper was never published.** The publisher is anonymous
(`sarthaksidhant` has zero public repos). The extraction cannot be reproduced or
refreshed, and completeness is unknowable — there is no coverage table. The CC-BY-4.0
tag is applied by a re-publisher to Government of India data they do not own; the
dataset card itself concedes this. Contract values are dirty (`"9.5"`, `"₹ 20441"`,
`"0"` as null) — audit the magnitude distribution before any spend total.

### 3. `sandheepp/india-procurement-network` — a method, not a dataset

The only published attempt at the winner-identifier problem. Its own docstring states
it exactly: *"The award side carries only a free-text name (no CIN), so this is
name-based entity resolution."* Links 450k bidder names to a 1.99M-row MCA register via
Splink, MIT-licensed.

To its credit it retains `match_probability`, prefers active companies on ties, and
**counts tied CINs rather than silently picking one** — the ambiguity is measurable
rather than hidden. Reuse the method and the uncertainty accounting. Do not ingest its
CINs as facts: under evidence-tiering Step 2 a name match cannot establish identity, so
output is `analytic` and needs an `innocentReading`.

## The one blocked lead worth an email

**Government Transparency Institute's LMIC release includes India**, CC BY-NC-SA 4.0,
with `tender_recordedbidscount`, **`bidder_masterid`** (a *resolved* entity key), and
the single-bidding red flag `corr_singleb` already computed. The India download links
are Google-Drive-gated and return 401. Schema confirmed from a UK-data mirror of the
same 115-column structure; **India population is inferred, not verified.**

`info@govtransparency.eu` is the cheapest high-value action from this whole pass.

Do **not** chase GTI's flagship GPPD (72M contracts) — Table 1 of Fazekas et al. 2024
lists all 42 countries and India is absent.

## Documented voids — render these as findings, not blanks

- **data.gov.in publishes no tender-level procurement data.** One record in 414,603
  matches "tender": a Rajya Sabha parliamentary-answer table of yearly NBCC counts,
  0 downloads, no bid count, no winner. "GeM" returns seller-registration counts;
  "procurement" returns 280 *agricultural* records (paddy, wheat, milk).
- **Kaggle, Zenodo and GitLab contain nothing.** Kaggle's top hit for every India query
  is a **Singapore** dataset. Zenodo's only India-procurement record is 26.7 KB of
  manual notes on defence procurement *delays*. GitLab's nearest match is Indonesian.
- **GeM has no published bulk dataset anywhere.** ~29 repos matched; every one is a
  scraper or a private bidding tool. Given GeM is mandatory for central goods and
  services, any national total from CPPP alone understates by a growing margin.
- **Railways (IREPS) has no published corpus.** Partially mitigated — CPPP contains
  railway awards (`SOUTHERN RLY`, `NORTH EASTERN RLY` appear in the 2011 probe).
- **`CivicDataLab/Gepnic-Tender-Scraper`** — the most promising repository name in the
  entire search, a generic scraper for the platform powering most state portals — **is
  an empty repository.**

## Traps recorded so nobody hits them twice

- **GePNIC detail URLs expire.** The `tnid=` links stored in the CPPP corpus return
  *"Unauthorized Page"* — verified. Row verification must go through portal search by
  tender ID, not by replaying stored URLs. `Nandanhegde1/india-tenders` uses a base64
  `tendersfullview` permalink pattern that may be constructible from a tender ID; if it
  is, spot-checking gets cheap at scale. Worth 20 minutes.
- **HuggingFace search does not do multi-word matching.** `india tender`,
  `procurement india` and `public procurement india` all return **zero**. The four real
  mirrors surface only on the single word `tender`. Absence on a multi-word query there
  is not evidence of absence.
- **data.gov.in silently ignores `q=`/`search=`/`title=`** and returns the unfiltered
  414,603-row catalogue — which looks like a huge result set and means nothing. The
  working parameter is `filters[title]=`.
- **`brijeshvadi/eprocure-product-catalog` is Saudi Arabian**, despite the name.
  `iteshxt/GIT-Procurement-Dataset` is **UK**, not India — "GIT" is the Transparency
  Institute, and it is exactly 5,000 rows, i.e. an unsourced sample cut.
- **`dhrub0216/DivyaDrishti` is synthetic** — sequential IDs `NIT-UP-001`, tidy invented
  titles, no licence — while marketing itself as a "Pan-India Government Tender Tracker"
  for "40k+ active tenders".

## The rule this file does not bend

A GitHub or HuggingFace scrape is **not a primary source**. Every row from every
candidate here enters at `reported`, sourced to the scrape and *not* to the portal. It
becomes `documented` only per-row, only after the issuing portal's own Result-of-Tenders
or Award-of-Contract page has been opened and the bid count and winner confirmed.

Four and a half million rows do not substitute for that, and the number is precisely
the thing most likely to tempt someone into forgetting it.
