# Desk registers — five candidates, four kills

`asOf` 2026-08-12 · machine-readable companion: `research/raw/desk-registers.json`

Five claims arising from the datasets that landed in the last day went through the
reporter → documentalist → skeptic pass. **All five were killed as framed.** One
leaves behind a narrower documented absence that is recorded as `unresolved` rather
than published.

Nothing here asserts intent, and no party named in any candidate was approached for
comment. That is a weakness in every one of these records, not a neutral fact.

---

## The kills, in the order of how much they cost

### C5 — "Coal deliberately withholds bid counts (0 of 133 blocks)"
**Killed by the control.**

The Ministry of Coal publishes mine-wise bid counts. They are in its PIB bid-opening
releases, under a heading that says so — *"Mine-wise list of bids received is appended
below"* — with the columns *Name of Coal Mine · Round · No of Bids (Both Online and
Offline) · Type of coal mine*.

Five such releases were opened and parsed:

| PRID | Date | Round | Per-mine table | Rows |
|---|---|---|---|---|
| 2007501 | 20 Feb 2024 | 9th + 2nd attempt 7th | yes | 16 |
| 2066781 | 21 Oct 2024 | 10th + 2nd attempts 9th, 8th | yes | 17 |
| 2099232 | 03 Feb 2025 | 11th + 2nd attempt 10th | yes | 19 |
| 2136757 | 16 Jun 2025 | 12th (surface) | yes | 11 |
| 2137313 | 18 Jun 2025 | 12th (underground) | yes + **named bidders** | 2 |
| 2207831 | 23 Dec 2025 | 14th | **no** | 0 |

The 18 June 2025 release goes further than a bid count: it names all eight bidding
companies and gives the number of bids each submitted.

**What the void is replaced with.** 65 mine-level bid counts, rounds 9–12 plus the
second attempts run alongside them. 26 of the 65 mines — 40.00% — drew exactly one
bid. Mean 3.22. Distribution: 1 bid ×26, 2 ×10, 3 ×8, 4 ×3, 5 ×6, 6 ×7, 8 ×2, 11, 13,
15. Under the auction rules a mine with fewer than two technically qualified bidders is
annulled, so those 26 could not proceed as a matter of rule.

**Read that number carefully.** These tables list only mines that received *at least
one* bid. Mines that drew nothing are not in them. 40.00% is a share of mines that
attracted any bidder, **not** a share of mines offered, and it must never be quoted as
the latter.

**Adopted, then absent — not never adopted.** The table is present in every bid-opening
release opened from round 9 through round 12 and absent from the 14th round's. The
13th round's bid-opening release was not located, so the point at which it stops cannot
be fixed. That is a gap, not a finding.

**The control inverts the claim.** Of the four auction authorities in this project's
datasets, the Ministry of Coal is the *most* forthcoming on bidder counts. DoT publishes
participation per auction but not bids per lot. Himachal and Assam publish a bare
`numberOfTenderers` and — per the OCP registry's own counts — no bidder roster at all.
The authority that publishes nothing is the **Ministry of Mines**: `resources-minerals.json`
has a bidder count for 70 blocks from 2019 and for nothing since, with `quotesReceived`
null on 252 of 298 records.

**Innocent reading, and it matters.** `resources-coal.json` is not careless. It says
*"ZERO of the 133 blocks **in this file** has a published bidder count"*, and its sources
are the Nominated Authority's result sheets and the CMPDI presentations, none of which
carry bid counts. That is accurate. The error is scope: a void in one document series
was written up as a void in the ministry's practice, and the press-release series was
never checked. This is precisely the failure the control step exists to catch.

---

### C4 — "Critical mineral auctions are failing (54% annulment)"
**Killed by the base rate, using the control the base rate required.**

Both numbers are in the Ministry of Mines Annual Report 2025-26, two pages apart, at
the same cut-off date. Nobody has put them side by side.

> **Page 35:** "During the calendar year 2025, **332 Notice Inviting Tenders (NITs)**
> for the auction of mineral blocks have been issued by the various State Governments
> and Central Government., of which **143 mineral blocks** (ML-81, CL-62) have been
> successfully auctioned across 17 major mineral states."

> **Page 37:** "…**76 unique** Critical and Strategic Mineral blocks … in 06 tranches …
> **34 blocks** (5 Mining Lease and 29 composite licence) have been successfully auctioned."

- Whole mineral auction regime, CY2025: **43.07%** success (143/332)
- Critical and strategic minerals, as on 31.12.2025: **44.74%** success (34/76)

The critical-mineral programme's success rate is **1.67 points higher** than the mineral
auction regime's. On the ministry's own figures, at the same date, in the same document,
the critical programme is not distinguishable from ordinary mineral auctioning and is
marginally the better performer.

Caveats, all of which leave the direction intact: the 332 NITs include the central
critical NITs, which pulls the two rates together; the 143 is a snapshot at 31 December
and some CY2025 NITs had not concluded, so 43.07% is a *lower bound* on the whole
regime — which makes the regime look better still relative to critical minerals; and
the windows differ (76 unique blocks accumulated Nov 2023–Dec 2025 against NITs issued
inside CY2025). There is no version of this comparison in which critical minerals
looks materially worse.

**Four denominators, not three.** The candidate says three are in circulation. There are
four, and the fourth is the ministry's own and is the one nobody quotes:

| Statistic | Value | n/d | `asOf` | Tier |
|---|---|---|---|---|
| Annulment rate on block-offerings | 53.66% | 66/123 | 2026-06-23 | **reported** |
| Failure rate on offerings (incl. unreconciled) | 54.47% | 67/123 | 2026-06-23 | **reported** |
| Success on unique blocks — the ministry's headline | 63.64% | 56/88 | 2026-06-23 | documented |
| **Success on unique blocks at the AR cut-off** | **44.74%** | **34/76** | **2025-12-31** | **documented** |

All four are correctly computed; they answer four different questions. The eighteen-point
gap the candidate points at is the gap between the first and the third, and it shows only
that the ministry publishes the flattering construction. The fourth is the only one for
which a control exists.

**And the 54% is `reported`, not `documented`.** Every annulment count — 13/14/3/11/5/11/9 —
comes from Press Trust of India wire reports quoting the annulment notices, not from the
notices. `resources-minerals.json` says so itself. It cannot carry a headline.

**The absence finding that forced this route.** The word **"annul" appears zero times**
in the Ministry of Mines Annual Report 2025-26 — 360 pages, 743,137 characters extracted,
"auction" 142 times, "successfully auctioned" 6 times, "annul" 0. The denominator that
would let anyone compute a failure rate, for critical *or* non-critical blocks, is the
number the ministry does not publish. That is why the control had to be built from a
success rate.

**Innocent reading.** Annulment here is largely a rule firing, not a market verdict. The
Mineral (Auction) Rules require at least three technically qualified bidders; a block
that attracts two serious, well-capitalised bidders is annulled by design, and 7 of 9
Tranche VII annulments and 5 of 11 in Tranche VI were on that ground rather than nil
bids. These are greenfield composite licences on G3/G4 ground, in commodities with
little domestic processing, offered to a bidder pool the 2023 amendment was meant to
create and which does not exist yet. The 54% says the floor is binding, not that nobody
wants critical minerals.

---

### C1 — "Assam procurement is five times less competitive than Himachal Pradesh"
**Killed by the control — and it fails the identity test first, on the identity of the
measured quantity.**

The source file's headline says the two rates were "measured identically over tenders
that drew at least one bid." They were not.

| | Himachal (pub. 77) | Assam (pub. 131) |
|---|---|---|
| Award objects | **4,211** | **0** |
| Supplier objects | 4,211 | 0 |
| Party objects | 8,002 | 0 |
| Tenderer objects (bidder roster) | 0 | 0 |
| Records with an `award` | 3,771 of 3,791 | 0 of 34,232 |
| Records with `tender.stage` | 0 | 34,230 |
| Source system | Tenders Himachal Pradesh **joined to Central Public Procurement Portal award data** | Assam Government Procurement System via data.gov.in |
| Max `numberOfTenderers` | 40 | **1,410** |

Counts from the Open Contracting Partnership registry pages; structure re-parsed from
both bulk files line by line.

Himachal's `numberOfTenderers` sits only on tenders that reached award. Assam's sits on
a tender-stage record set of which **only 10,381 of 34,232 — 30.33% — are at AOC (award
of contract) stage**. The other 23,851 are at ten pre-award or terminated stages. And
within Assam alone, holding the state, the portal and the field constant, the
single-bidder rate moves by a factor of 9.3 across those stages:

| Stage | Records | ≥1 bid | Single-bid % |
|---|---|---|---|
| To be Opened | 7,094 | 3,543 | **42.79** |
| Technical Bid Opening | 1,348 | 970 | 25.36 |
| stage "NA" | 384 | 352 | 25.00 |
| **AOC (award)** | **10,381** | **10,337** | **14.13** |
| Financial Bid Opening | 4,908 | 4,387 | 10.71 |
| Technical Evaluation | 6,519 | 6,149 | 10.34 |
| Evaluation | 62 | 62 | 6.45 |
| Financial Evaluation | 2,289 | 2,062 | 5.04 |
| Bid Opening | 156 | 153 | 4.58 |
| Cancelled / Retender | 1,089 | 0 | — (carry "NA") |

**The ladder.** Same statistic, successively matched:

| Restriction | Assam | Himachal | Ratio |
|---|---|---|---|
| as published | 16.18% (4,532/28,015) | 3.39% (128/3,771) | **4.77** |
| Assam → AOC stage only | 14.13% (1,461/10,337) | 3.39% | 4.17 |
| both → positive tender value | 8.35% (572/6,852) | 3.43% (128/3,734) | 2.43 |
| plus 2016–2020 and Works only | 8.26% (528/6,390) | 3.26% (118/3,617) | **2.53** |

Himachal's rate moves 0.04 points across the whole ladder. Assam's moves 7.83. The
instability is entirely on the Assam side, and it is what the headline was measuring.
"Five times" is an artefact of the mismatch.

**Innocent reading.** Assam's median tender in the file is **Rs 1,00,00,000**; Himachal's
is **Rs 15,73,179** — a factor of 6.4. Assam's own procurement explorer, run by
CivicDataLab with the state Finance Department, records a mandatory e-procurement
threshold of Rs 20 lakh from 2016, raised to Rs 50 lakh in 2018 and cut to Rs 25 lakh
in 2021. Himachal's file is full of small PWD and Irrigation and Public Health works
below any such threshold. Large specialised works in a state with a thinner contractor
base draw fewer bidders than small routine works in a state with a dense one. The
residual 2.5× is a difference in what was tendered, not a demonstrated difference in
how it was awarded.

**Three corrections the pass forces on `procurement-ocds.json`:**

1. *"Neither state published the data itself"* is **wrong for Assam**. The OCP registry
   names the publisher as the Assam State Government Finance Department and records the
   retrieval source as `data.gov.in/catalog/assam-public-procurement-data` under
   GODL-India; the catalog page names the contributor as the Assam Finance Department
   and AS-CFMS, published 03/10/2022. CivicDataLab did the OCDS *transformation*, not
   the publication. (The data.gov.in page as served on 2026-08-12 carries a "sandbox
   environment" banner and is cited for catalog metadata only.)
2. The open gap on the **3,644 zero-bid Assam tenders** is closed: 3,365 (92.34%) are
   at stage "To be Opened", 276 at "Technical Bid Opening", 3 at "Bid Opening". They are
   tenders whose bids had not been opened, not failed tenders.
3. The histogram's `"NA": 2565` bucket is now attributed — 912 Cancelled, 521 Financial
   Bid Opening, 370 Technical Evaluation, 227 Financial Evaluation, 186 To be Opened,
   171 Retender, 102 Technical Bid Opening, 44 AOC, 32 stage "NA".

**On the peer flag.** The flag that Assam's `numberOfTenderers` disagrees with a
bidder-roster length **cannot be tested inside these files** — the registry records
"Count of tenderers: 0" for *both* publications. Neither has a roster. That is itself
the answer: `numberOfTenderers` is an unchecked scalar in both, with no internal
corroboration available, and the 15 largest Assam values are Public Health Engineering
Department rate-fixation and empanelment tenders ("Fixation of Rates for different items
of the PWSS", "Empanelment of contractors") where a framework enrolment of 1,410
registrants is stored in the same field as a works contract with 3 bidders.

---

### C2 — "The 2024 spectrum auction failed (1.34% of offered MHz sold)"
**Killed by the denominator.**

The arithmetic is right and the denominator is DoT's own: the opening release of
25 June 2024 states *"Total quantum of spectrum being auctioned is 10,522.35 MHz in
various bands valuing Rs 96,238.45 Crores at reserve prices."* The inference is what
fails.

- **26 GHz alone is 8,700 MHz — 82.68% of the megahertz denominator — and Rs 2,734
  crore, 2.84% of the reserve valuation.** Because Indian practice counts unpaired
  millimetre wave at full quantity, any quantity ratio over this denominator is a units
  artefact.
- 26 GHz plus 3300 MHz is 9,810 MHz, **93.23% of the denominator**. Both had been sold
  in bulk 22 months earlier: 45,350 MHz of 26 GHz and 5,490 MHz of 3300 MHz went in
  August 2022.
- The closing release states the composition in terms: *"The expiring spectrum in 2024
  and the unsold spectrum of previous Spectrum Auction held in 2022 were put to auction
  this year."* A ratio whose denominator is 93% last auction's residue measures what was
  left over, not what was wanted.

**The two official denominators, resolved.** 533.6 is recoverable exactly from the
opening release's own band table: 117.2 (900) + 221.4 (1800) + 125 (2100) + 70 (2500).
The closing release's denominator is **the spectrum in the bands that drew bids,
computed after the result was known** — a legitimate statistic about those four bands,
and one that cannot be compared across years because it is selected on the outcome. The
opening figure is the comparable one, but only against other years' *ex ante* offers,
which differ in band composition by an order of magnitude.

**The band-comparable series.** Excluding 26 GHz and 3300 MHz — the two bands with no
pre-2022 auction history in India:

| Auction | Comparable offered (MHz) | Sold | Share |
|---|---|---|---|
| 2016 | 2,354.75 | 964.8 | 40.97% |
| 2021 | 2,308.8 | 855.6 | 37.06% |
| 2022 | 1,417 | 396.2 | 27.96% |
| **2024** | **712.35** | **141.4** | **19.85%** |

2024 is the weakest of the four. It is a fifth to a half of the comparable years — not
one seventy-fourth of them.

**Base rate.** A whole band drawing zero bids is the *norm* in this programme: it has
happened in **6 of 6** auctions since 2012 with band-level detail (700 and 900 MHz in
2016, 700 and 2500 in 2021, 600 in 2022, four bands in 2024). A property shared by 100%
of comparables is non-discriminating. What distinguishes 2024 is not that bands went
unsold but that the unsold bands carried almost all the megahertz.

**What does survive, and is not the candidate.** The auction realised **11.78%** of its
aggregate reserve valuation (Rs 11,340.78 cr of Rs 96,238.45 cr), against 19.8% in 2021
and 472.6%/734.1% in the two 2010 auctions. And **54.2 of the 141.4 MHz sold was
renewal** of expiring holdings rather than new capacity — the closing release puts new
capacity at 87.2 MHz worth Rs 6,164.88 crore. Those are documented and they are about
the reserve price, not about demand collapse.

**Innocent reading, in DoT's own words, recorded as DoT's:** *"As auction for 5G spectrum
was held recently & 5G Monetization is still in progress, no bidding took place in
800MHz, 2300MHz, 3300MHz and 26GHz bands."* Operators who bought 45,350 MHz of 26 GHz in
2022 and have not monetised 5G have no reason to buy more in 2024. The auction they
needed was a renewal auction for 900 and 1800 MHz, and that is what happened: three of
three bidders won and the bands that mattered cleared.

**Novelty — honestly stated.** The 1.34% figure is **probably already reported**. A
Light Reading piece carrying it in substantially the candidate's form appears in search
results, but the site returns HTTP 403 to WebFetch *and* to curl with a Chrome
user-agent and **was not opened**. A snippet is not a source, so this is recorded as
unverified coverage. What is added here and was not found anywhere: the 82.68%-of-MHz
against 2.84%-of-reserve-value decomposition, the band-comparable series, and the
demonstration that 533.6 is exactly the sum of the four bands that drew bids.

---

## The one that leaves something behind

### C3 — "The 14th round coal auction result was suppressed"
**Killed as framed, by the identity test.** A narrower absence survives, recorded
`unresolved`.

The candidate has three limbs and they belong to two different datasets.

1. **"The result appeared only on MSTC five months later" — false for coal.** MSTC's
   commercial coal mine result page, retrieved 2026-08-12, has published nothing since
   *"Result of E-auction Day-2 dated 14.09.2022"*. The MSTC limb belongs to the
   **minerals** record, where `resources-minerals.json` states of two critical-mineral
   tranches that block-wise results "exist only on the MSTC e-auction result table" —
   different ministry, different programme, different platform.
2. **"No PIB release" — false as stated.** PIB published two releases on the 14th round:
   the launch on 29 October 2025 (PRID 2183927) and the bid opening on 23 December 2025
   (PRID 2207831). What is absent is a *result* release.
3. **"Suppressed" — not supportable.** The Ministry of Coal published the outcome itself,
   on page 4 of its own pre-bid presentation dated 21 May 2026 on coal.nic.in, in the
   table "Number of Mines Auctioned": **Tranche-14: 5**, total 140.

**The base rate does not kill it — that limb survives.** Result releases were opened for
rounds 10 (27 Nov 2024, nine mines), 11 (24 Mar 2025, twelve), 12 (1 Aug 2025, seven)
and 13 (26 Nov 2025, three) — **4 of 4**, each with a block-wise table carrying state,
PRC, geological reserves, winning bidder, reserve price % and final offer %. Rounds 12
and 13 were published one day after their forward auctions closed.

**But the second base rate is the one that matters.** The Nominated Authority's own
downloads register carries "Notice regarding result of E-auction overall" for tranches
10, 11 and 12 — **3 of 5** for rounds 10–14. It stopped after 1 August 2025. **Round 13
has no NA result notice either**, and round 13 unquestionably got a PIB release within
24 hours. Any suppression story has to explain that, and cannot.

**What survives, as `unresolved` and not as a finding.** As of 12 August 2026 the
outcome of the 14th round is public only as a single integer on a slide: 5 of 41 mines
auctioned. No block-wise result table — which mines, which winners, what revenue share —
has been published by PIB, by the Nominated Authority's register or by MSTC, for a round
in which 24 blocks drew 49 bids from 11 companies including 5 first-time entrants. For
rounds 10–13 that table was published.

It is not published as a finding because **the 14th-round forward auction date was never
established**, so the delay cannot be measured and the candidate's "five months" has no
source. The 2nd attempt of the 14th round was launched on 21 May 2026 and was still
running, so the round is not closed.

**Innocent reading.** Five of forty-one is the worst round in the programme's history by
success rate (12.2%); the 13th before it was second worst (2 of 17, 11.8%). A press
office that publishes "Twelve Mines Successfully Auctioned" has less to work with at
five, and may be holding the release until the second attempt closes so both can be
announced together — which is roughly what happened with the 13th round's residue, folded
into the 14th round's launch. Nothing here requires a decision to conceal, and none is
asserted.

---

## Gaps, at the same prominence as the findings

- **The 14th-round coal forward auction date is not established.** It falls between the
  bid opening of 23 December 2025 and the presentation of 21 May 2026. The NA register
  carries no e-auction schedule notice and no technically-qualified-bidder declaration
  for the round.
- **PIB has no reachable ministry-and-date-filtered archive.** `AllRelease.aspx` returns
  200 but serves an unfiltered listing of 760 links dominated by President,
  Vice-President and Prime Minister items. The absence of a 14th-round result release
  rests on four keyword searches plus the NA register, **not on enumeration**.
  Exhaustiveness is not claimed.
- **The NA downloads register has a six-month hole.** Page 0, retrieved 2026-08-12, runs
  from 21/05/2026 straight back to 17/11/2025 with nothing between. Whether documents
  were removed, never posted, or sit on a page not reached is not established.
- **The 13th-round coal bid-opening release was not located**, so the round at which the
  per-mine bid table stops appearing cannot be fixed between 12 (present) and 14 (absent).
- **Two ministry sources disagree on the 13th round.** PIB (26 Nov 2025) says three
  blocks were auctioned, all to Damodar Valley Corporation. The tranche table in the
  21 May 2026 presentation gives 2. Not reconciled. `resources-coal.json` carries the 2.
- **The 332 CY2025 mineral NITs include central critical NITs.** A clean non-critical
  comparator needs the split, which the Annual Report does not give.
- **Critical-mineral annulment counts remain `reported`.** All of 13/14/3/11/5/11/9 come
  from PTI wire reports quoting notices that were not retrieved.
- **lightreading.com returns HTTP 403** to WebFetch and to curl with a Chrome
  user-agent, so C2's prior-coverage claim is unverified.
- **The Himachal publication's scope is ambiguous.** The OCP registry describes
  publication 77 as covering departments, directorates, statutory organisations, local
  bodies and undertakings; CivicDataLab's public Himachal OCDS repository is titled
  `himachal-pradesh-health-procurement-OCDS`. The data is 96.79% works, dominated by PWD
  and IPH. Whether these are the same scrape was not established.
- **No verification sample was drawn** for either procurement dataset. The plan in
  `procurement-ocds.json.verification` remains unexecuted, so a parser bug that dropped
  bidders would still be invisible and would bias every single-bidder figure upward.
- **Nobody was asked.** Not the Assam or Himachal Finance Departments, not CivicDataLab,
  not the Open Contracting Partnership, not DoT, not the Ministry of Coal or its
  Nominated Authority, not the Ministry of Mines.

## Also rejected along the way

- Asserting the 8,700 MHz of 26 GHz offered in 2024 **is** the 2022 residue. The
  arithmetic does not close (2022 left 17,350 MHz unsold in 26 GHz and 1,770 in 3300 MHz;
  2024 offered 8,700 and 1,110). DoT states the composition in general terms; the
  band-by-band reconciliation is not published and was not constructed.
- Computing a single-bidder rate for coal mines **offered** from the 65 recovered
  observations. The tables list only mines that drew at least one bid.
- Quoting 53.66% or 54.47% as documented. Both are `reported`.
- Reading the residual 2.5× Assam/Himachal gap as a finding about award conduct.
