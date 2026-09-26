# Foreign money, NGOs and the tender network — design

*Status: draft for review · 2026-09-26 · classification: architectural (three new research
fleets, one offline dataset pipeline, a schema extension, one new page and one extended
page). Nothing below is built. Reconnaissance results are real and dated; everything else
is a proposal.*

## 0. What was asked, and what this document assumes

**Said (verbatim intent):** work next on loans from foreign banks and entities — World
Bank, IMF, other banks — and people and firms like Rothschild and BlackRock; NGOs; first
collect all data on welfare, NGOs, ministers and politicians involved; then a network
graph connecting them; plan with plugins and skills, open-source resources and the best
UI/UX available; the Indian government tenders dataset that exists online — download it if
possible, find networks, issues and flaws in it.

**Assumed (correct me):**

1. "Loans" means sovereign and sub-sovereign external borrowing (multilateral and bilateral
   development finance to the Union, states and PSUs) plus the contracts those loans pay
   for. Private external commercial borrowings by listed companies are out of scope for
   this pass except where a loan-funded contract lands with a listed company.
2. "People like Rothschilds and BlackRock" means the *firms* as economic actors in India —
   mandates, holdings, joint ventures, rule changes that favour them — and the narratives
   about them. It does not mean genealogy. Rothschild & Co is a listed company
   (Euronext: ROTH); BlackRock Inc. is a listed company (NYSE: BLK). The platform records
   companies, office-holders and their documented acts. It does not record families as
   actors, and it treats "the Rothschilds control X" as a circulating narrative to be
   calibrated on the six-step ladder, with the same lens applied to Lazard, Goldman Sachs,
   Vanguard, GIC and Norges Bank as controls.
3. "NGOs" means associations registered under FCRA (foreign-funded), NGO Darpan (eligible
   for government grants), and the trusts and foundations that receive or channel welfare
   money — including trusts run by office-holders and party officers, which are public
   roles.
4. "Welfare … involved" means the joins already in the register: which NGOs implement or
   receive money under the 78 schemes, which foreign loans fund welfare programmes
   (World Bank social-protection and health loans are large), and which ministers signed
   for both.
5. "Dataset of Indian govt tenders" means the Central Public Procurement Portal (CPPP)
   scrape mirrored on Hugging Face as `rumourscape/tenders` — 4.92 million award rows
   with bid counts. The repository already knows this dataset (see
   `research/raw/tender-data-sources.md`) and stopped short of downloading it.
6. Success looks like: a `/finance` page and an extended `/tenders` page, backed by three
   reconciled research fleets and one reproducible dataset pipeline, all through the
   existing four invariants and gates, with the same evenhanded skeptic stance as
   `/energy` and `/welfare`.

## 1. Goals and non-goals

**Goals**

- G1. A reproducible national procurement analysis from the CPPP scrape: single-bidder
  rates, concentration, timing, red flags and the dataset's own defects, with every
  figure derived by a committed script from a named input with a recorded digest.
- G2. A sourced, tiered register of external finance to India: every World Bank
  (IBRD/IDA) project since 2000, ADB, AIIB, JICA, KfW/AFD/NDB and Chinese official
  finance, with borrower, implementing agency, state, sector, amounts, dates,
  conditions, the contracts awarded under them, and the ministers and chief ministers
  in office at approval.
- G3. A register of foreign contributions to Indian associations: FCRA receipts, donors,
  recipients, cancellations and suspensions 2011–2026, NGO Darpan registration, and the
  joins to welfare delivery and to office-holders' trusts.
- G4. A register of foreign capital acts in listed India: FPI holdings ≥1% in NIFTY 50
  constituents by named holder, advisory mandates on disinvestment and large
  transactions, joint ventures (Jio BlackRock), and the SEBI/RBI rule changes that moved
  the terms — each with a cui-bono record.
- G5. One connection graph across all of it, on the canvas renderer, with the narratives
  calibrated and the controls run.

**Non-goals**

- No person nodes for private individuals; no family or ethnic framing of any actor.
- No IMF programme data beyond the documented history (1981 EFF, 1991 SBA; none since):
  the IMF's sites are blocked from this environment, and India has no IMF programme, so
  this is recorded as a documented void with sources, not researched around.
- No winner-level output from the tender data for names that carry no legal-form marker
  (the `prospect-procurement.mjs` refusal, extended).
- No CINs asserted for tender winners. Name-to-company links are `analytic` with a match
  probability and an innocent reading, never facts.

## 2. Reconnaissance (probed 2026-09-26 through this session's proxy)

| Source | Reach | What it gives | Tier at ingest |
|---|---|---|---|
| World Bank Projects API `search.worldbank.org/api/v3/projects` | 200 | **1,117 India projects**; id, name, borrower, implementing agency, IBRD/IDA amounts, approval and closing dates, status, sectors, themes, abstract, URL | documented (official portal) |
| World Bank indicators API | 200 | External debt stocks (`DT.DOD.DECT.CD`: US$716 bn in 2024) and the DT.* family | documented |
| World Bank Data Catalog "Major Contract Awards" (id 0037796) | 429 (rate-limited API; page 200) | Contracts awarded under WB projects: supplier name, supplier country, amount, project — the join from loans to contractors | documented |
| ADB `adb.org/projects/country/ind` | 200 (HTML) | Project pages with loan numbers, amounts, executing agencies | documented |
| AIIB `aiib.org/en/projects/list` | 200 (433 KB, server-rendered) | Approved and proposed projects, amounts, borrowers | documented |
| JICA | 200 | ODA loan agreements, India | documented |
| AidData GCDF 3.0 | 200 | Chinese official finance to India by project | reported (academic dataset) |
| IMF (`imf.org`, `data.imf.org`, `dataservices.imf.org`) | 403 / 502 | — | void; use RBI and WB mirrors |
| KfW | 000 | — | void; use JICA-style annual reports via PIB |
| FCRA online `fcraonline.nic.in`, `mha.gov.in/en/commoncontent` | 000 | — | void at source; route via Parliament answers (`sansad.in` 200, `rsdebate.nic.in` 200), PIB (200), MHA annual reports, IndiaSpend (200) |
| NGO Darpan | 200 (JS app, 10 KB shell) | State- and sector-wise registered NGOs; per-NGO grants received | documented once a JSON endpoint is confirmed |
| data.gov.in API | 504 today (worked 2026-08-12) | FCRA/NGO/external-assistance resources — retry | documented |
| CPPP live `eprocure.gov.in/cppp` | 200 | Live award-of-contract pages — the verification target for the scrape | documented |
| Hugging Face `rumourscape/tenders` | 200, range requests supported | 2 Arrow IPC files, 1.80 + 1.66 GB, 4,921,960 rows × 24 columns: organisation, title, tender_type, dates (closing, AOC, contract, published), contract value (raw + cleaned), **bids_received** (raw + int), selected bidder + address, detail URL; CC-BY-4.0 applied by a re-publisher; anonymous, unpublished scraper | reported (docs/INGESTION.md Stage 0) |
| `ghalibluvr/tender_dbs_parquet` | 200 | Tender-notice side (bid windows); no licence | reported |
| BSE shareholding pages / `api.bseindia.com` | 200 shell / 403 | — | use company annual reports and screener.in (200) |
| SEC EDGAR full-text search `efts.sec.gov` | 200 | BlackRock filings mentioning India | documented |
| DIPAM `dipam.gov.in`, `rothschildandco.com`, PIB, PRS, myneta, OpenCorporates, screener.in | 200 | Mandates, press releases, bills, affidavits, officers, shareholding | documented |
| GeM, MCA, Kaggle downloads, `web.archive.org` | 000 / 403 / auth | — | void |

Disk: 28 GB free; `pyarrow` 25 and `duckdb` 1.5 installed for the session. Both Arrow
files downloaded in about a minute (throwaway copy in the scratchpad) and open
memory-mapped in 0.6 s; a dozen aggregate queries run in 10 s on 15 GB RAM.

**First probe of the scrape (2026-09-26, not yet a finding — the quality table must be
built first):**

| fact | value |
|---|---|
| rows / distinct `tender_id` / distinct `internal_id` | 4,921,960 / 2,923,713 / 4,921,960 — **1,998,247 rows share a `tender_id`** (lots or re-scrapes; must be resolved before any rate) |
| portal split | central 2,005,258 (mean bids 7.0) · state 2,916,702 (mean bids 3.6) |
| `bids_received` null / 0 / 1 / ≥2 / >1000 | 438,971 / 68,624 / 582,857 / 3,831,508 / 1,420 |
| `contract_value_amount` null / ≤0 / >₹10¹² | 458,396 / 221,377 / 22 |
| AOC dated before closing | 16,182 |
| `organisation_name` on the state portal | the **state's name**, not the buyer — the buyer is encoded in the `tender_id` prefix and on the detail page |
| `tender_type` values | `Works`, `Goods`, `Services`, `Limited`, plus `'1'`, `'2'`, `''`, null — dirty |
| junk organisations (`test…`, blank) | 926 |
| winners with a legal-form or trade marker | 2,659,767 of 4,921,960 (54%) |
| single-bidder rate over awards with ≥1 bid, whole file, unresolved duplicates | 13.2% — **do not quote**; it is the number the quality table exists to correct |

## 3. Stance

The platform's stance is unchanged: skeptical, calibrated, evenhanded; who benefits, by
what mechanism, and what is the boring explanation. Three rules are specific to this
subject:

1. **Institutions, not bloodlines.** Rothschild & Co and BlackRock are recorded as
   companies with CIN/LEI-grade identifiers, offices, mandates and holdings. Any narrative
   that names a family, a religion or an ethnicity as the actor is recorded on the
   narrative ladder as a *claim about the world*, calibrated against the documented record
   and against the same lens run on Lazard, Goldman Sachs, Morgan Stanley, Vanguard,
   Capital Group, GIC and Norges Bank. If the lens produces an equally alarming picture
   for the controls, that is a finding about the lens, and the page says so.
2. **Loans are contracts with terms.** Every loan record carries its conditions (policy
   actions, procurement rules, safeguards), because the political question about
   external finance is not the money but the conditionality. The symmetry check is
   UPA-era against NDA-era borrowing, and opposition-run against BJP-run state
   borrowers.
3. **Foreign funding of NGOs cuts both ways.** FCRA cancellations of government critics
   and FCRA receipts by government-aligned associations are recorded with the same
   fields, the same tiers and the same denials. The platform takes no view on whether
   foreign funding is legitimate; it records who received what, who cancelled whom, on
   what stated ground, and what the recipient said.

## 4. Architecture

Four fleets and one pipeline feed one graph. Everything lands in quarantine first.

```
research/raw/finance/    ← fleet A: lenders, loans, conditions, contract awards
research/raw/ngo/        ← fleet B: FCRA receipts, donors, recipients, cancellations, Darpan
research/raw/capital/    ← fleet C: FPI holders, mandates, JVs, rule changes
research/raw/cppp/       ← pipeline: aggregates + red-flag tables from the CPPP scrape
        │  (RECONCILIATION.json + AUDIT.json per fleet, as today)
        ▼
scripts/assemble-fleet.mjs  ← generalised: one config row per fleet
        │
        ▼
src/graph/finance.generated.ts, src/graph/ngo.generated.ts, src/graph/capital.generated.ts
src/data/cppp.generated.ts
        │  mergeFleet (union, filledFrom)
        ▼
/finance (new)  ·  /tenders (extended)  ·  /network, /geograph (new edges appear)
```

### 4.1 Schema extension (bounded, tested)

Two predicates are missing from `src/graph/schema.ts` and `scripts/lib/vocab.mjs`:

- `loan` — lender → borrower. `a` = ₹ crore at the source's stated rate (US$ converted at
  the rate the source used, stated in `d`). `from` = approval date, `to` = closing date.
  `terms` (new optional field) = `{ instrument, ratePct, tenorYears, gracePeriodYears,
  conditions: string[] }`.
- `grant` — donor → recipient association. `a` = ₹ crore for the FY named in `d`.

Both flow money s→t like `pmin`/`pmout`, so the ForceGraph and GeoNetwork arrow and
width rules need no change; `PRED_LABEL` gets two entries. New id prefixes: `fin:`
(lenders, loan instruments), `ngo:` (associations, donors). The existing `for:` prefix
is reused for foreign companies already in the Atlas.

Node typing: multilateral lenders and foreign foundations are `ty: "fund"`, `fam:
"capital"`; associations are `ty: "trust"`, `fam: "recipient"`; regulators (MHA FCRA
wing, SEBI, RBI) stay `agency`, `fam: "enforce"`. No new node type.

### 4.2 The CPPP pipeline (`scripts/cppp/`)

Offline and not in CI: the inputs are 3.45 GB. One Python script (`duckdb` over the two
Arrow files) emits `research/raw/cppp/*.json` with the input digests, row counts and the
exact SQL for every table in a `provenance` block, so a reader can re-derive any number.
Python is used because the Arrow IPC reader in Node would add a runtime dependency;
Python is already the scratch language of this repository's audit tooling.

Tables:

| file | what | guard |
|---|---|---|
| `quality.json` | The dataset's own defects: duplicate `tender_id`s, junk rows (`test`, empty organisation), `bids_received` null/zero/implausible, `contract_value_amount` magnitude histogram against `contract_value_raw`, date order violations (AOC before closing), rows per portal per year against the portal's own counts where obtainable | This is "issues and flaws in the dataset", stated before any rate |
| `rates.json` | Single-bidder rate and mean bids by portal, year, organisation (public bodies only), tender type, value band; 95% Wilson intervals | Denominator = awards with `bids_received ≥ 1`; organisations with n < 30 pooled |
| `concentration.json` | Per organisation: HHI of award value by winner; share of the top winner; repeat-winner counts — winners identified only where the name carries a legal-form marker (`Ltd`, `Pvt`, `LLP`, `M/s`, `Infra`, `Constructions`, `Enterprises`, …); everything else counted as "unmarked" and never named | The `prospect-procurement.mjs` refusal, extended nationally |
| `timing.json` | Days from closing to AOC; awards within 0–2 days; AOC dates clustered before financial-year end and before elections (state election calendar from the welfare fleet) | Innocent reading: fiscal-year spending rules |
| `redflags.json` | Fazekas-style indicators computable from these fields: single bidding, non-open tender type, very short decision windows, repeated single-bidder winners per organisation; each with its base rate | Reported as rates over a declared family, never as a list of culprits |
| `sample-verification.json` | 40 rows drawn by seeded RNG, each checked against the live CPPP award page: match / mismatch / page gone | Upgrades the scrape from `reported` toward `documented` per field, or records why not |
| `matches.json` | Winner name → `co:` id candidates by normalised-name match with a score; `analytic`; used only to draw dashed `analytic` edges with `innocentReading: "name match, not identity"` | Never a fact |

### 4.3 Fleet A — external finance (`research/raw/finance/`)

Domains: `worldbank` (all 1,117 projects via the API, scripted; hand research on the
20 largest and every social-protection, health, education and PFM loan), `adb`, `aiib`,
`bilateral` (JICA, KfW, AFD, NDB, US DFC, Chinese official finance from AidData),
`contracts` (WB Major Contract Awards for India; ADB contract awards), `debt` (RBI and
DEA external-debt status reports; WB DT.* series), `conditions` (development policy
loans and their prior actions; the 1991 SBA conditions as history), `people` (Finance
Ministers, DEA secretaries, CMs at approval, Executive Directors for India at the
Bank and Fund), `literature` (Fazekas & Kocsis; Kentikelenis on conditionality;
Dreher on aid and politics; Indian scholarship on externally aided projects).

Claims: `loan` edges; `award` edges from loan-funded contracts to contractors; `law`
edges for conditions; `role` edges for office-holders; `benefit` on every award and
condition; `analytic` edges only where a control has been run (e.g. the share of WB
lending to BJP-run vs opposition-run states, against the states' share of population
and of prior lending).

### 4.4 Fleet B — NGOs and foreign contributions (`research/raw/ngo/`)

Domains: `fcra-receipts` (top recipients by year from Parliament answers, MHA annual
reports and PIB — the portal is blocked), `fcra-actions` (cancellations, suspensions,
prior-permission list changes, 2011–2026, with the stated ground and the association's
response), `donors` (Ford, Gates, Open Society, Omidyar, World Vision, Compassion,
Azim Premji and Tata as domestic controls), `darpan` (NGO Darpan registrations by state
and sector; grants received where the portal exposes them), `welfare-join` (associations
that implement or receive money under the 78 schemes in the register: SHG federations,
business-correspondent networks, implementing NGOs), `political-trusts` (foundations
run by office-holders and party officers with FCRA status — RGF, Vivekananda
International Foundation, Overseas Friends of BJP as a foreign-registered entity — all
with responses), `literature`.

Claims: `grant` edges donor → association; `enforce` edges MHA → association with the
order date and ground; `contra` edges for every response; `role` edges for
office-holders on trusts; `pmout` where an association is paid under a scheme.

### 4.5 Fleet C — foreign capital in listed India (`research/raw/capital/`)

Domains: `holders` (named FPI holders ≥1% in each NIFTY 50 constituent from annual
reports and shareholding patterns, as of the latest quarter; BlackRock, Vanguard, GIC,
Norges Bank, Capital Group, EuroPacific, Government Pension Fund as the comparison
set), `mandates` (Rothschild & Co, Lazard, Goldman Sachs, Morgan Stanley and others
on DIPAM disinvestments, strategic sales and large M&A, with fees where disclosed),
`ventures` (Jio BlackRock asset management, wealth and broking licences 2023–2026;
other FPI–promoter JVs), `rules` (SEBI FPI disclosure norms 2023, the 2024–26 easing,
RBI ECB and FDI press notes, with cui-bono), `narratives` (the circulating claims about
BlackRock, Rothschild, the World Bank and the IMF "controlling" Indian policy — each on
the ladder with its strongest case, strongest counter and what would change the
verdict), `literature`.

### 4.6 Cross-examination, reconciliation, assembly

As for energy and welfare: every alleged, reported-with-beneficiary and analytic claim
goes to a `cross-examiner` (two lenses in one agent), verdicts harvested into
`AUDIT.json`; one reconciliation editor per fleet writes `RECONCILIATION.json`; an
independent verifier checks for over-merging and deleted claims; `npm run generate`
assembles; `validate.mjs` §4 and §5 gate.

### 4.7 The page: `/finance` — "Foreign money"

Built through the same plugin-shaped fleet as `/energy` and `/welfare`: two independent
designs and a judge, a five-seat synthetic UX review applied as amendments, acceptance
criteria, RED Playwright tests written without sight of the implementation, build,
five-reviewer caucus, WCAG audit. Design constraints already fixed by the platform:
tier dash, family hue, type shape, declared size band; no-data hatch ≠ zero; party is
text never colour; every graphic has a table twin that reads exactly what it draws.

Three lenses on one stage, sharing the filter rail, the year control and the URL:

1. **Loans.** India map of external commitments by borrowing state (hatch = no loan
   recorded, not zero), a lender → sector → state flow diagram (existing `FlowSankey`:
   band = ₹ crore, dash = tier), the time lanes of approvals against Union budgets and
   general elections, and the project list with its contract awards. Clicking a lender
   or a contractor opens the connection graph with that node in focus.
2. **Associations.** FCRA receipts by state and year on the map; a cancellations
   timeline with the stated ground, the response and the tier; the donor → association
   graph; the welfare join (which schemes, which associations).
3. **Capital.** A holder × company matrix for the NIFTY 50 (holder rows, company
   columns, cell = % as of quarter, with the comparison set always shown so BlackRock is
   never displayed alone); the mandates table; the rules timeline with each rule's
   cui-bono record; the narratives ladder.

The connection graph is the existing canvas `ForceGraph` through `GraphExplorer`, with
the two new predicates labelled. The §6 items from `docs/research/GRAPH_UI_SOTA.md` that
this page needs — jump-to, an "as of" date mode, the why-drawn line — are built in the
shared explorer, so `/network` and `/energy` get them too.

### 4.8 `/tenders` extended

A new section, "National (CPPP scrape)", above the existing central and state registers:
the quality table first, then rates by portal and year with intervals, the value-band
chart, the timing histogram, the red-flag rates over their declared families, and the
verification sample with links to the live pages. The two-state OCDS section stays as
the only place with bidder rosters. No winner is named anywhere on the page unless the
name carries a legal-form marker and appears in ≥ 5 awards.

## 5. Skills and agents

Existing: `cui-bono` on every loan condition, grant, rule change and mandate;
`evidence-tiering` and `pattern-discipline` as always; `energy-money-trail` as the model
for a new `foreign-money-trail` skill (ids, denominators, controls, sources for this
subject); `cross-examiner`, `base-rate-statistician`, `pattern-prospector` for the CPPP
red flags; `investigative-desk` for the write-up; `source-retrieval` for the blocked
portals; `frontend-implementation`, `interface-design`, `india-map`; the SweetClaude
`design-ux-review`, `product-user-stories`, `test-writer`, caucus reviewers,
`code-verify`, `testing-accessibility`; superpowers `writing-plans`,
`subagent-driven-development`, `verification-before-completion`.

New: skill `foreign-money-trail` (written from fleet A/B/C literature output), agent
`finance-analyst` (the external-finance researcher, sibling of `energy-analyst`), agent
`procurement-analyst` (owns the CPPP pipeline and its refusals).

Open-source resources to reuse, not vendor: OCP's red-flag indicator definitions;
Fazekas's CRI indicator set (method only); Splink's name-matching approach (method only,
as `sandheepp/india-procurement-network` did); the World Bank and AidData APIs.

## 6. Sequencing

| Phase | Work | Gate |
|---|---|---|
| G0 | This spec approved; schema extension (`loan`, `grant`, `terms`) with tests; assembler generalised to N fleets | `npm run check` green |
| G1 | CPPP pipeline: download (in progress), slim Arrow → Parquet, `quality.json` first, then rates, concentration, timing, red flags, 40-row live verification | Every number re-derivable from the committed SQL and digests |
| G2 | Fleets A, B, C in parallel (two agents per workflow, several workflows), cross-exam, reconcile, assemble | validate OK; AUDIT and RECONCILIATION committed with the raw files |
| G3 | `/finance` design duel → judge → UX review → acceptance → RED tests → build → caucus → fix → verify → WCAG; `/tenders` extension the same way but smaller | Both suites green on pinned builds; `test:pages` in CI covers them |
| G4 | `foreign-money-trail` skill, two agents, HANDOFF/INDEX/CUSTOM_PLAN Phase G, bundle, PR | Docs match what shipped |

## 7. Risks and what is done about them

- **Blocked sources.** FCRA online, IMF, GeM, MCA and the Wayback Machine are
  unreachable from here. Each becomes a declared void with the secondary sources used
  instead; the page prints "not published / not reachable" rather than a blank.
- **Defamation by dataset.** 4.9 million award rows include hundreds of thousands of
  personal names. The pipeline never emits an unmarked name, and the page never names a
  winner below the marker-and-frequency threshold. Name → company links are analytic.
- **The trope.** "Rothschild" is the oldest antisemitic conspiracy motif in finance. The
  platform's protection is structural: institutions only, controls always displayed, the
  ladder for narratives, and the symmetry check as a mandatory section. If a fleet
  returns a narrative it cannot calibrate, it ships as `speculative` with its strongest
  counter, not as a graph edge.
- **Scale.** 1,117 WB projects and 4.9 million awards are dataset-shaped; the fleets
  research the joins and the top of each distribution by hand and script the rest.
- **Bandwidth and disk.** 3.45 GB through the proxy; 28 GB free. If the download stalls,
  `ghalibluvr/tender_dbs_parquet` (Parquet, column-prunable by range request) is the
  fallback for the award table.

## 8. Decisions needed from you

1. **One page or two?** This spec proposes one `/finance` page with three lenses plus a
   `/tenders` extension. The alternative is three pages (`/loans`, `/ngos`, `/capital`).
   One page keeps the joins visible; three pages are simpler to build. Recommendation:
   one.
2. **Commit the slim tender table?** A column-pruned Parquet of 4.9 million rows is
   ~300 MB, too large for the repository. Proposal: commit only the aggregate JSON and
   the digests; keep the Parquet in the session and document how to rebuild it.
3. **Email the Government Transparency Institute** for their India release with resolved
   bidder ids (see `tender-data-sources.md`)? Cheap, outside this environment, your call.
