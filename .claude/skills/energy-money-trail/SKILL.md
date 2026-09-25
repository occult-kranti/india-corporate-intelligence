---
name: energy-money-trail
description: Use when extending the energy and natural-resources power map — adding or checking a coal, mines, oil and gas, hydro, solar/wind, nuclear or grid record, a bond, trust, CSR or PM CARES money flow, or a narrative about Adani, Reliance, Vedanta, MEIL or an energy PSU — or when choosing an id, a denominator, a control or a source for one.
---

# Energy money trail

What the twelve-agent energy fleet (`research/raw/energy/*.json`, 2026-09-25) actually
established, so the next pass starts from it instead of re-deriving it. The one finding
that governs everything else: **every "who benefits" lens the fleet ran fired on every
incumbent it was pointed at. What separates cases is the process record (auction or
discretion, bid counts, what an auditor or court later found) — not proximity, and not money.**

**REQUIRED BACKGROUND:** `cui-bono` (the ledger row), `evidence-tiering` (the tier),
`pattern-discipline` (the denominator), `source-retrieval` (before any gap). Shape and
invariants: `docs/research/FLEET_CONTRACT.md`. Full tables: `references/ledger.md`
(base rates, voids, disagreements) and `references/narratives.md` (the ladder).

Every figure below names the fleet file it came from; the primary is in that file's `srcs`.
Where two files disagree, both figures are given. Do not choose between them silently.

## 1. Domain map and the ids to reuse

Never mint a second node for an entity below. `RECONCILIATION.json` → `mappings` is the
authority on which id won; the assembler rewrites old ids, but a new file should not create them.

| domain | ministry | PSUs / agencies | regulators, courts, auditors | register already on the platform |
|---|---|---|---|---|
| coal | `min:ministry-of-coal` | `co:coal-india`, `energy:mahanadi-coalfields`, `energy:eastern-coalfields`, `co:bharat-coking-coal`, `co:nlc-india`, `co:singareni-collieries`, `co:cmpdi`; `ecos` (single-bid route) | `cag`, `sc`, `energy:dri` | `/resources` ← `research/raw/resources-coal.json` (block spine: link by block and winner, never re-assert) |
| mines | `min:ministry-of-mines` | `co:nmdc`, `co:nmdc-steel`, `co:national-aluminium`, `co:hindustan-copper`, `co:moil`, `energy:kabil`, `energy:gsi`, `energy:omc` | `energy:cec`, `energy:shah-commission`, `energy:karnataka-lokayukta` | `/resources` ← `resources-minerals.json` |
| oil & gas | `min:ministry-of-petroleum-and-natural-gas` | `co:ongc`, `co:oil-india`, `co:gail-india`, `co:indian-oil`, `co:bharat-petroleum`, `co:hindustan-petroleum` | `energy:pngrb`, `energy:dgh`, `energy:delhi-high-court` | `/resources` ← `resources-hydrocarbons.json` |
| hydro | `min:ministry-of-jal-shakti`, `min:ministry-of-power` | `co:nhpc`, `co:sjvn`, `energy:thdc`, `energy:neepco`, `energy:cvppl`, `energy:rhpcl` | `energy:cea`, `energy:hc-sikkim` | — |
| solar & wind | `min:ministry-of-new-and-renewable-energy` | `seci`, `energy:ireda`; `energy:pli-solar`, `energy:law-almm`, `energy:khavda-re-park` | `energy:cerc`, `energy:aperc`, `energy:cci` | `/tenders` ← `tenders-centre.json`, `tenders-states.json` |
| nuclear | `min:department-of-atomic-energy` | `energy:npcil`, `energy:bhavini`, `energy:ashvini`, `energy:ucil`; `energy:shanti-act-2025` | `energy:aerb` | — |
| grid & discoms | `min:ministry-of-power` | `co:power-grid`, `co:power-finance-corporation`, `co:rec-limited`, `co:ntpc`, `energy:grid-india`; `energy:tbcb`, `energy:rdss` | `energy:cerc`, `energy:oerc` | `/tenders` |
| money | — | `pmcares`, `ebscheme`, `prudent`, `progressive`, `abtrust`, `sec182`, `energy:svpret` | `energy:eci`, `agencies` (ED·CBI·IT), `sebi`, `doj`, `energy:us-district-court-edny` | `/pmcares` ← `research/raw/pmcares.json` |

Groups and people, reconciled: `grp:adani` (not `adani`); `gadani` for Gautam Adani (the Atlas
id is kept; its duplication with `per:gautam-s-adani` is an open repository question — do not
resolve it in a fleet file); `co:reliance-industries` (company) vs `grp:reliance` (Mukesh
Ambani's promoter group) vs `energy:reliance-adag` / `energy:reliance-power` (Anil Ambani);
`energy:torrent-group` vs `co:torrent-power`; `energy:hindenburg` (firm) vs
`energy:doc-hindenburg-adani-2023` (report); `energy:bjd`, `energy:hemant-soren`,
`energy:ys-jagan-mohan-reddy`, `meil`, `krishna`, `co:vedanta`, `jspl`, `grp:jsw`, `qwik`.
Parties: `bjp`, `energy:inc`, `energy:aitc`, `energy:bjd`, `energy:brs`, `energy:dmk`,
`energy:tdp`, `energy:ysrcp`, `energy:party-jmm`.

## 2. Base rates — publish the denominator

A numerator without its denominator does not ship. The headline rates (more in `references/ledger.md`):

| property | rate | file · primary |
|---|---|---|
| commercial coal mines allocated on a single bid (ECoS route), to Nov 2023 | **11 / 91** | coal · PIB 1975677 |
| …of which went to an Adani entity | **1 / 11** | coal · PIB 1975677 |
| …of which cleared at the 5.00% revenue share | **7 / 11** (not "all") | AUDIT `coal:c021` against the PIB table |
| Adani-attributed winning rows, commercial section | 5 / 145 (Rungta Sons 8 / 145) | coal · MoC `allocation-trance-wise.pdf` |
| blocks won by an entity that won only that one block | 56 / 133 (81 winners) | resources-coal · same MoC PDF, to 2026-04-07 |
| coal blocks allocated 1993–2010 cancelled by the SC, 2014 | 214 / 218 → cancellation proves nothing about one allottee | literature, people · Wikipedia (judgment text not opened) |
| Adani share of PLI-solar capacity, both tranches | 737 / 48,337 MW | solarwind · MNRE Tranche-I PDF, PIB 1911380 |
| Reliance + Shirdi Sai share of the same | 20,000 / 48,337 MW | solarwind · PIB 1911380 |
| responding PSUs that gave CSR money to PM CARES | **98 / 121** → giving was the norm, not a signal | money · Indian Express RTI series, 7 Dec 2020 |
| four largest power CPSEs' share of the ₹925 cr MoP+MNRE pledge | 800 / 925 ₹ cr | money · PTI/Deccan Herald, PSU Watch, PIB 1609676 |
| BJP share of all encashed bond money, 2019–24 | 6,060.51 / 12,769.4 ₹ cr (47.5%) | money · Wikipedia, The Hindu, ADR |
| top-18 bond purchasers that gave something to BJP | 18 / 18 → non-discriminating | money · The Hindu Data |
| BJP share of electoral-trust money, FY2024-25 | 3,157.65 / 3,826.35 ₹ cr (82.52%) | money · ADR trust analysis |
| ISTS-TBCB schemes won, FY25: PGCIL / Adani Energy Solutions | 26 / 45 and 6 / 45 | grid · T&D India |
| forest-clearance proposals rejected, 2014–20 vs 2007–14 | 120 / 24,277 vs 1,396 / 16,106 | enforce · Indie Journal (third-party Parivesh scrape) |

Rules: count blocks or rows, and say which (coal counts differ for this reason, §8).
Say the cut-off date. A rate of 100% (18/18, 12/12, 3/3) is a property of the class, not of the
member. Where the denominator is unknown, write `null` and say so (PLI Tranche-II: 11 winners,
applicants not verified — people).

## 3. Symmetry — which lenses over-fire, which discriminate

Each file ran its lens on a control it had no theory about. Results:

| lens | result on the control | verdict |
|---|---|---|
| "donor wins coal / leases / contracts" | Odisha BJD, WB AITC, Telangana BRS, TN DMK show the same shape; Haldia Energy gave AITC ₹281 cr vs BJP ₹81 cr (money, coal, mines) | **over-fires** — it detects incumbency at the awarding level |
| "an investigation was opened" | fires on both sides: "booked, not prosecuted" vs "jailed, then bailed" (enforce) | **over-fires**; charge sheet, verdict and custody length discriminate |
| "an official body found illegal mining" | 3 / 3 iron-ore states, three parties (mines) | **over-fires** |
| "one group wins the privatised assets" | Delhi 2002, Odisha 1999 have the same shape (grid) | **over-fires**; bid margin, criteria changes and litigation discriminate |
| "law written for the vendor" / "PSU soft on contractor" | UPA 2008–14 has the same shape (nuclear) | **over-fires**; the SHANTI 2025 process asymmetries (no committee referral, recourse reversal, private door) are what is worth arguing about |
| "audit → book → reprisal → favoured champion" | Reliance under UPA is identical (literature) | **over-fires**; the asymmetry is institutional: under the NDA the adverse records on Adani are foreign |
| "promoter benefits under the party in power" | UPA coal 2004–09 at least as alarming (people) | **discriminates only via process**: 2004–09 was discretionary and auditor/court-faulted; the 2019–26 events examined were multi-bidder with no auditor finding yet |
| "government protects a favoured developer's PPA" | AP: both YSRCP and TDP honoured it in office (solarwind) | **over-fires** |
| "PLI favours the presumed favourite" | Adani got 1.5% of capacity (solarwind) | **fails outright** |
| Polavaram contracting across three governments | CAG faults all three eras (hydro) | systemic, not partisan |
| **Khavda land** | 61% of the park to one group after 2023 with no recorded bidding (solarwind) | **the one asymmetric case — attention belongs here** (but see the 38% reading in §8) |

The discriminators, in the fleet's own words: auction versus discretion; whether an auditor or
court later found the process defective; bidder counts and margins; litigation outcomes;
specific pricing records (the DRI/FT import-invoice question; the 2022 blending mandate that
sent ~₹16,700 cr of NTPC import contracts to one supplier, where CIL's choice of an Indonesian
supplier over Adani cuts against capture — coal).

## 4. Voids — the highest-value open questions

A void is a finding (evidence-tiering, the absence rule). Where the record would live:

| void | where it would live | file |
|---|---|---|
| Coal India and its seven subsidiaries' CSR recipients, FY20–25 | each company's annual report, Board's Report CSR annexure (coalindia.in is blocked: go through the exchange archives) | coal |
| PSU-wise PM CARES contributions (CIL's ₹221.03 cr is attributed to "the government") | Lok Sabha / Rajya Sabha reply, 2020–21 (sansad.in); FY2019-20 CSR annexures | coal, money |
| PM CARES statements after FY2022-23; donor identities | pmcares.gov.in (last year published FY2022-23); donor non-disclosure is trust-deed clause 5.3 | enforce, pmcares.json |
| ICIJ Offshore Leaks entries for Vinod Adani | offshoreleaks.icij.org node pages or the ICIJ bulk CSV | people |
| Bidder counts per coal mine and per critical-mineral block | MoC / MSTC auction records; Ministry of Mines tranche notices (only single-bid and successful blocks are published) | coal, mines |
| Whether SECI internal documents reached Adani or Azure staff | SECI (did not answer The Wire); the EDNY record (24-cr-433); no CVC/CBI inquiry on record | solarwind |
| Khavda 2023-08-24 committee minutes, lease rate, deposit | GPCL (TLS failure); MNRE–SECI correspondence | solarwind |
| Raw ECI bond files; party splits for Essel, JSPL, Utkal, Rungta, Torrent | eci.gov.in (blocked) → ADR PDF mirrors | money, grid |
| Adani, Reliance and Tata entities in bond lists: **none** | the absence is established; trust and party contribution reports FY19–25 for Adani entities are not yet checked | money, grid |
| TBCB scheme-wise bid sheets; Section 11 directions 2022–24 and compensation paid | CEA/CTUIL TBCB list, RECPDCL/PFCCL notices; MoP orders, CERC | grid |
| SEBI's 24th Adani investigation; final action on the Hindenburg show-cause notice; DRI appeal in the SC | SEBI orders; SC cause lists | enforce |
| Charge sheet on the 2024-03-31 CBI FIR against MEIL | CBI court record | enforce, nuclear |

The full list, with the file each comes from, is in `references/ledger.md`.

## 5. Sources — what opened, what did not

**Routes that worked** (all recorded in the files' `sources` or `notes`):
- **Ministry PDFs + pypdf/PyMuPDF.** coal.gov.in (PIB 1975677; `allocation-trance-wise.pdf`), the NPCIL BSR RFP, CAG Report 38/2017 and CAG Report 4/2025 (Polavaram), all parsed locally.
- **PIB** press releases by PRID — the fleet's most-used primary for awards, allotments and pledges.
- **Indian Kanoon** for judgments (the strongest source in oilgas).
- **US records:** the SEC press release 2024-181; SEC litigation release LR-26554 (the settlement); the CourtListener docket and RECAP indictment PDF for 1:24-cr-00433 when justice.gov returned empty.
- **SEBI orders:** as PDFs under `sebi.gov.in/sebi_data/attachdocs/…`, and via the listed company's **exchange intimation** that encloses the order (`adanienterprises.com/-/media/…/AELIntimationforSEBIOrderHidenberg.pdf`) — the media path serves even when the corporate root refuses.
- **ADR PDFs** as the accessible mirror of ECI bond, trust and contribution data.
- **curl after a WebFetch 403** (Business Standard, Deccan Herald, PIB — nuclear notes); The Hindu **AMP** pages for the first ~2,500 characters of paywalled data pieces (money notes).

**Blocked or unusable this session:** coalindia.in (proxy 502), mca.gov.in, niftyindices.com,
eci.gov.in bond sub-pages, zaubacorp and opencorporates (bot walls), nseindia.com (anti-bot),
justice.gov press release (empty), IEEFA/CEEW (403), GPCL (TLS), cwc.gov.in (401), Nayara and EU
Council pages (403), Kazatomprom KASE (403), Mercom (paywall/404), and client-rendered tables
(CIL CSR statistics, PNGRB authorisation register, csr.gov.in). Alternative search engines were
blocked through the proxy, and the WebSearch quota ran out in most agents: plan direct URLs.
**Google News RSS is a headline index, not a source.** It caps a claim at `reported`, and the
AUDIT refuted `oilgas:c051`, which rested on one.

## 6. The narratives ladder (condensed — full table in `references/narratives.md`)

| narrative | status | what would change it | file |
|---|---|---|---|
| Commercial coal auctions were designed for Adani | contested | per-mine bidder counts; Cavill Mining's ownership and capital | coal |
| Adani is a front for the ruling party | unsupported | a documented beneficial-ownership chain or money flow to party accounts | literature |
| Adani, Reliance and Tata bought no electoral bonds | established | Qwik's MCA shareholding; traceable associate purchasers | money |
| Electoral bonds overwhelmingly financed the BJP as pay-to-play | well-supported | donor-level regression on incumbency at the awarding level, with a 2014–17 control | money |
| Bonds were pay-to-play *for coal blocks* | unsupported | a matched bond/auction/winner timeline 2020–24 with a non-donor control | literature |
| PSU CSR budgets were diverted into PM CARES | established | evidence that ministries directed CSR committees, or that size tracked later favours | money |
| Coal India's CSR was diverted to PM CARES and showpieces | speculative | CIL and subsidiary CSR annexures FY20–25 | coal |
| Adani bribed AP officials for the 7 GW SECI offtake | contested | a co-defendant's trial or plea; an Indian agency naming the official | solarwind |
| Adani has been "cleared" of the US case | contested | a merits ruling on the FCPA count | solarwind |
| Defence rules were relaxed so Adani could take Khavda land | contested | minutes naming Adani before SECI's surrender; evidence of a public offer | solarwind |
| ALMM and PLI are protectionism designed for Adani | debunked | disbursement or list data showing Adani-specific treatment | solarwind |
| Central agencies are used selectively against the opposition | well-supported | a normalised per-office-holder series | enforce |
| Congress-era coal allocations were the real scam | well-supported | appellate outcomes on the convictions | literature |

## 7. Failure modes seen in this fleet — check before you write

- [ ] **A tier used as a predicate.** `pred` is a relation (`award`, `own`, `enforce`, …), never `documented`. `analytic` is both a tier and a predicate: use `pred: analytic` only for a non-causal comparison.
- [ ] **Free-text endpoints.** `s`/`t` must be ids ("state officials", "Adani group" fail the validator). The allegation's object can be a mechanism node, but it must be a node.
- [ ] **Month-only dates.** Write `YYYY-MM` when that is all you know, and never invent a day. A same-month comparison does not pass the date test: say so. Count months carefully (AUDIT `nuclear:c016`: 13, not 11).
- [ ] **Name-similar merges.** 22 were refused (RECONCILIATION `refusedMerges`): RIL ≠ Reliance Power/ADAG, JSPL ≠ JSW, Essel Mining ≠ Essel Group, five distinct Reddys, three Singhs; a subsidiary is its own node. Alias collisions (BJD, Hindenburg) fail validation.
- [ ] **A denial manufactured by structure.** `states:c022` pointed a `contra` at a man who had said nothing. And the reverse: "no response found" when one was live (`mines:c053`, `states:c024`). Search adani.com and the exchange filings first.
- [ ] **Edge direction.** `enforce` goes agency→subject for the window the agency acted (`coal:c045`); money goes s→t.
- [ ] **Two documented facts joined into an undocumented conclusion** (`nuclear:c007`/`c008`). That is `analytic`, with an innocent reading, or it is not a claim.
- [ ] **A ministry's loose sentence repeated against its own table** (`coal:c021`, "the same 5%").
- [ ] **Leaderboard at bid opening reported as the award** (`oilgas:c049`: 15 GAs at opening, not the award).
- [ ] **Selective quotation** (`hydro:c024` dropped "according to the decision taken in the 48th board meeting").
- [ ] **Fused allegations**: a 2014 DRI matter (dropped in 2017) folded into a Hindenburg edge (`people:c017`).
- [ ] **A sample chosen by the outcome**: donors *to BJP* will show a high BJP share (`money:c062`).
- [ ] **Stale status on a moving case**: `states:c023` said the US case was open, but the securities and wire-fraud counts against Gautam Adani, Sagar Adani and Vneet Jaain were dismissed with prejudice on 2026-08-10 (enforce `c019`, solarwind `c056`). Check the docket before you write "pending".
- [ ] Wikipedia as the only source for a tenure date → `reported`, with `upgradeIf` naming the PIB or gazette record.

## 8. Where the files disagree — carry both, flag it

- **Coal counts:** 145 winning *rows* (coal), 133 *blocks* / 126 rows to 2026-04-07 (resources-coal), 140 blocks in 14 tranches to May 2026 (coal, entity `min:ministry-of-coal`, MoC presentation). The single-bid figure is **11 of 91 to Nov 2023**. It is not "11 of 140".
- **5% single-bid:** coal.json's narrative says "ten others cleared at the same 5%". AUDIT reads the PIB table as 7 of 11.
- **Khavda:** Adani ~44,500 / 72,600 ha after Aug 2023, ≈61% (solarwind, Scroll), against 19,000 / 49,400 ha of the five named developer zones, ≈38% (states, Wikipedia). The two use different dates and denominators.
- **Ladder statuses:** the nuclear-liability narrative is *well-supported* in literature but *contested* in nuclear; Bharat Small Reactors for Adani/Reliance is *speculative* (literature) vs *unsupported* (nuclear). Full list in `references/narratives.md`.
- **US case:** literature says "status not verified". Enforce and solarwind both record the 2026-08-10 partial dismissal. For the five co-defendants who never appeared, enforce says their status after 31 Aug 2026 was "not located", while solarwind `c057` records the court's 2026-09-03 refusal to dismiss the FCPA count.
- Amount variances between outlets reading the same ECI file are recorded, not resolved (money notes: MEIL→BJP 584 vs 586; AUDIT `oilgas:c051`: Qwik→BJP 375 vs 385).

## 9. Refusals

- No person without a public role; no DIN, CIN or PAN guessed (people.json leaves every DIN `null`).
- No identity from a name, and no parent from a shared address (Stratatech and Mahanadi Mines are **not** attributed to Adani — coal).
- No edge between a minister and a company on shared state, sector or party.
- No benefit row without an amount or an explicit `confidence: unknown`, and none naming a "group" as a recipient of bribes that no record names.
- Bonds prove neither side: presence is not a quid pro quo, and absence (Adani, Reliance, Tata) is not innocence. Record the channel and the date, and leave the inference to the reader.
- No "cleared", "collapsed" or "scam" beyond the words of the order itself.
- No figure from a search snippet or headline index shown as more than `reported`.
