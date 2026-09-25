# Non-coal mineral concessions in India — what the record establishes

Companion to `research/raw/resources-minerals.json`. As of **2026-08-11**.

Scope is deliberately narrow: mining leases and composite licences for **non-coal major minerals**
granted by auction under the MMDR Act, 1957 as amended in 2015 and 2023. Coal and lignite sit with
the Ministry of Coal on a different bid parameter and are already in `tenders-centre.json`. Offshore
minerals, minor minerals and Exploration Licences are excluded for reasons stated in the file's
`rejected` array.

---

## 1. The one thing to understand before any number makes sense

**There are no rupee contract values in this domain, and their absence is not a gap.**

Under the Mineral (Auction) Rules the winning bidder does not offer a price. It offers a
**percentage of the value of the mineral dispatched** — computed monthly as the tonnage sent out of
the mine multiplied by the Indian Bureau of Mines' notified average sale price for that mineral,
grade and state — and pays that percentage to the State Government every month for fifty years, on
top of royalty, the District Mineral Foundation levy and the National Mineral Exploration Trust
levy.

Three consequences run through everything below:

- The percentage **can exceed 100%**, and routinely does. 14 of the first 70 blocks cleared above
  100%; the highest bid recorded anywhere in this file is **835.00%** on the Kanaital graphite block
  in Odisha (Tranche VI, January 2026).
- The premium is paid **on mineral actually dispatched**. A winner who never mines pays nothing.
  An aggressive bid is therefore a cheap option, not a committed payment — and the operationalisation
  figures below suggest that this is not a theoretical point.
- A "large" award and a "valuable" award are different things, and neither is knowable from the
  percentage alone without the reserve estimate. This file has reserve estimates for 70 of its 298
  block records.

---

## 2. What the 2015 amendment actually changed

**The Mines and Minerals (Development and Regulation) Amendment Act, 2015 — No. 10 of 2015.**
Presidential assent **26 March 2015**; gazetted **27 March 2015** (Gazette of India Extraordinary,
Part II Section 1, No. 13); **deemed to have come into force on 12 January 2015**, the date of the
ordinance it replaced. Those three dates are different and the operative one is the third: the
auction cut-off runs from 12 January 2015, not from the assent.

The mechanism is section 10A(1), and it is blunter than the word "reform" suggests:

> "All applications received prior to the date of commencement of the Mines and Minerals
> (Development and Regulation) Amendment Act, 2015, shall become ineligible."

Every pending application for a concession died, subject to narrow savings in 10A(2) for holders who
had already been granted a reconnaissance permit or prospecting licence, or who held a communicated
central approval or a letter of intent. In their place, section 10B(4) requires the State to select
the lessee for a notified mineral "through auction by a method of competitive bidding, including
e-auction", and the substituted section 11 extends the identical route to the **prospecting
licence-cum-mining lease** — defined in the new section 3(ga) as "a two stage concession granted for
the purpose of undertaking prospecting operations followed by mining operations", and universally
called the composite licence. Section 8A(4) closes the loop forward: on expiry, a lease "shall be put
up for auction".

### Did it work?

On its own terms, yes, and the pace is the least ambiguous fact in the file. Per the Ministry of
Mines' Annual Report 2025-26, as on **31 December 2025**:

| | Blocks auctioned |
|---|---|
| 2015-16 to 2020-21 (six years) | **108** (99 ML, 9 CL) |
| 2021-22 to 2025-26 (to 31.12.2025) | **484** (274 ML, 210 CL) |
| **Total since 2015** | **592** |

Seventeen states have auctioned a block. Two — **Madhya Pradesh (118)** and **Rajasthan (114)** —
account for 39.2% of all of them. **Limestone (196)** and **iron ore (140)** account for 56.8%.

### The number the pace headline omits

> Of the 592 blocks auctioned so far, mining leases have been executed for **95** and **production
> has started in respect of 82** mineral blocks.

**82 of 592 — 13.9% — had started producing.** The ministry uses at least four different counts —
"auctioned", "lease deed executed", "operationalised", "in production" — in different releases, and
they are not interchangeable. Odisha leads with 30 producing mines, then Karnataka (16), Gujarat (9),
Madhya Pradesh (6), Andhra Pradesh (5), Rajasthan (5), Goa (5).

This is where the option-value reading of the >100% bids stops being a hypothesis and starts being
the obvious explanation of the data.

### What the first 70 blocks reveal about who can afford to bid

The Ministry's own register of the first 70 blocks (as on 04.10.2019) — recovered from the Internet
Archive, because the live URL now returns 404 — supports an arithmetic that the CSEP/Brookings
analysis of the same file did first and that nobody has refuted:

| | Rs crore | % of resource value |
|---|---|---|
| Value of estimated resources | 2,52,515.90 | 100.0 |
| Contribution from auction premium | 1,57,562.36 | 62.4 |
| Statutory payments (royalty, DMF, NMET) | 44,563.62 | 17.6 |
| **Total to government** | **2,02,125.99** | **80.0** |
| Remaining with the mining company | 50,390.91 | 20.0 |

Split by mineral, iron ore is the outlier: **86.9%** of the value goes to auction premium and 16.8%
to statutory payments — **103.7%** in total. On the government's own valuation, the average iron-ore
winner contracted to pay the state more than the ore is worth.

Only a captive miner can do that, because it is buying supply security for a downstream plant rather
than margin on ore. The register bears this out: of 26 limestone blocks, 24 went to cement makers; of
24 iron-ore blocks, all 24 went to steel makers or mining companies. The single merchant limestone
bidder in the register won at 25.6% against a captive weighted average of about 47%; the single
merchant iron-ore bidder won at 39.1% against a captive average near 87%.

**So what the auction regime changed in practice is not only who gets blocks, but who can bid at
all.** Discretion was replaced by an auction, and the auction selects for balance-sheet depth and a
downstream plant. That is a real distributional consequence and it requires no allegation of
wrongdoing to state.

---

## 3. The critical-mineral story, with the numbers

**The Mines and Minerals (Development and Regulation) Amendment Act, 2023 — No. 16 of 2023.**
Presidential assent and gazette **9 August 2023** (Extraordinary, Part II Section 1, No. 19);
commencement notified with effect from **17 August 2023**. It did three things: it inserted
**section 11D**, giving the Central Government the exclusive power to auction mining leases and
composite licences for the **24 minerals** listed in the new **Part D of the First Schedule** (with
the revenue still accruing to the State); it inserted **section 10BA**, creating the Exploration
Licence for 29 minerals in the new Seventh Schedule; and it removed six minerals — lithium,
beryllium, titanium, niobium, tantalum and zirconium bearing minerals — from the Part B atomic list,
opening them to the private sector for the first time.

The government's stated reason for taking the power was a denominator, and it is worth quoting
because it is the baseline against which the new regime has to be judged:

> "Only 19 blocks of minerals have been auctioned so far by the State Government viz. graphite,
> nickel and phosphate out of 107 blocks handed over to the various State Governments."

19 of 107 — **17.8%**.

### Eight tranches, and what happened in them

| Tranche | Launched | Offered | Auctioned | Annulled | Annulment rate |
|---|---|---|---|---|---|
| I | 29 Nov 2023 | 20 | 6 | 13 | 65.0% |
| II | 29 Feb 2024 | 18 | 4 | 14 | 77.8% |
| III | 14 Mar 2024 | 7 | 4 | 3 | 42.9% |
| IV | 24 Jun 2024 | 21 | 10 | 11 | 52.4% |
| V | 20 Jan 2025 | 15 | 10 | 5 | 33.3% |
| VI | 16 Sep 2025 | 23 | 12 | 11 | 47.8% |
| VII | 23 Mar 2026 | 19 | 10 | 9 | 47.4% |
| **I–VII** | | **123** | **56** | **66** | **53.7%** |
| VIII | 15 Jul 2026 | 20 | *open* | *open* | — |

*(Tranche I leaves one block unreconciled: 20 offered, 6 awarded, 13 annulled. Swarajya's
contemporaneous report says 14 of 20 went unawarded, which would close it. Recorded as a residual,
not assigned. Tranche II's and III's success counts of 4 and 4 are derived from the ministry's own
cumulative figure of 14 successes at 31 July 2024, not stated by any source.)*

### The number that is widely under-reported

**Three denominators are in circulation for the same programme.**

1. **56 of 88 unique blocks = 63.64%.** This is the ministry's published success rate, repeated by
   every outlet: "a success rate of more than 63 per cent."
2. **56 of 123 block-offerings = 45.53%.** This counts each auction actually held. A block re-offered
   three times before it sells counts three times, because three auctions were run.
3. **66 annulments out of 123 offerings = 53.66%.** More than half of all critical-mineral auctions
   held since November 2023 ended in annulment.

Both 1 and 2 are arithmetically correct. Only 1 is published. The difference is the second-attempt
machinery in rule 9(10) and 9(11)(b) of the Mineral (Auction) Rules: a block that fails is re-offered
in a later tranche, and when it eventually sells it is counted once in the numerator and once in the
denominator. The re-auctions vanish.

The ministry itself supplies the arithmetic that makes this visible, in a sentence in the Annual
Report 2025-26 that nobody appears to have quoted:

> "Central Government has issued **104 Notice Inviting Tenders (NITs)** for the grant of mineral
> concession for **76 unique** Critical and Strategic Mineral blocks … in 06 tranches … **34 blocks**
> … have been successfully auctioned."

104 attempts on 76 blocks — **1.37 auction attempts per block**. That is the whole story in one
ratio, and it is in the ministry's own annual report. 20+18+7+21+15+23 = 104 exactly, which confirms
that an "NIT" here means one block-offering.

**And there is no official annulment total anywhere.** The Ministry publishes blocks auctioned in
every release, every annual report and on its dashboard. It does not publish blocks annulled. The 66
in this file had to be assembled from a Press Trust of India summary of seven separate annulment
notices, published 5 July 2026. That absence is itself a finding: the denominator that would let
anyone compute a failure rate is the one number the programme does not report.

### Why blocks fail

Two grounds appear in the notices, and one of them is a rule rather than a market outcome:

- **Nil bids.** Tranche VII: 2 blocks. Tranche VI: 5. Tranche II: 5 of the 14 cancelled. Tranche I:
  2 of 20 blocks drew no bid at all (56 physical and 56 online bids were received for 18 of the 20).
- **Fewer than three technically qualified bidders.** Tranche VII: 7 blocks. Tranche VI: 5. This is
  the larger category, and it means a block with two serious, qualified bidders is annulled **by
  design**. The rule guarantees that thin interest becomes annulment rather than a low price.

Tranche IV shows where the attrition actually happens: 21 blocks were notified, only **10 advanced
past technical evaluation to the second-round e-auction**, and all 10 were then awarded. The auction
room is not where blocks die. Technical qualification is.

### Lithium: two blocks offered, one sold, and the famous one has no bidder

Exactly two lithium blocks have ever been put to auction under this regime.

- **Katghora Lithium and REE Block**, Korba, Chhattisgarh — India's first auctioned lithium
  concession, won by **Maiki South Mining Pvt Ltd**, a Kolkata company, at a reported auction premium
  of **76.05%**.
- **Salal-Haimna Lithium, Titanium and Bauxite (Aluminous Laterite) Block**, Reasi, Jammu and
  Kashmir — the deposit announced in February 2023 as a 5.9-million-tonne inferred lithium resource
  and treated at the time as a strategic turning point. It was offered in Tranche I and **annulled
  for fewer than three technically qualified bidders**; re-offered in the all-second-attempt Tranche
  III and **annulled again for non-receipt of any bid**. The Minister confirmed this to the Rajya
  Sabha on 10 March 2025.

India's single most publicised mineral discovery of the decade has, on this record, no bidder.

---

## 4. Concentration — and the innocent readings

Three separate windows, three separate answers, and none of them supports a capture story on its own.

| | Blocks | Distinct winners | Top winner | Top-3 share | HHI | Winners with exactly one block |
|---|---|---|---|---|---|---|
| Ministry register, 2016–2019 | 70 | 39 | JSW Steel Ltd — 9 (12.86%) | 25.71% | 433 | **23 of 39 (59.0%)** |
| MSTC state window, FY2025-26/26-27 | 181 | 101 | UltraTech Cement — 14 (7.73%) | 19.34% | 230 | **71 of 101 (70.3%)** |
| Central critical minerals, tranches IV–VII | 42 | 26 | VNR Minerals LLP and Hindustan Zinc — 5 each (11.9%) | 33.33% | 590 | **18 of 26 (69.2%)** |

**The base rate that kills the easy story.** "Company X won more than one mineral block" describes
41.0% of winners in the 2016-19 register, 29.7% in the recent state window and 30.8% in the central
critical-mineral rounds. Under the project's own tiering rule that is weak-to-moderate evidence at
best — publishable only with a control group and an effect size, never as a finding on its own.
*"Company X won two blocks"* is not a story.

**Compare the control.** In `tenders-centre.json`, one bidder took **6 of 6** airports in the 2018-19
AAI privatisation round, and the top telecom bidder took **58.65%** of 2022 spectrum auction value.
Against those, a mineral-auction market where the top winner holds 8–13% of blocks and where
59–70% of winners hold exactly one block is a **long-tail market**, not a captured one. Any argument
about capture in Indian mining has to explain the tail, not just the head.

### Innocent readings, stated plainly

- **Geography, not favour.** A mining lease cannot be moved. A cement plant bids for the limestone
  under it and has no reason to bid anywhere else; ore is too heavy to transport far. A long tail of
  one-block winners is exactly what a geography-bound auction should produce.
- **Clustering in the NIT.** Blocks are notified in batches covering adjacent leases in one district
  on consecutive days. Ten of the fourteen Karnataka iron-ore leases in the 2019 register came from
  two NITs over the same Bellary belt. A bidder that has done the geology and mobilised a bid team
  for one lease will bid for its neighbours. Repeat-winning is a cost-of-bidding artefact before it
  is anything else.
- **End-use reservation was policy.** The rules expressly permitted blocks to be reserved for a
  specified end use. That captive miners dominate is the designed outcome of that rule, not evidence
  that it was subverted.
- **PSU presence is a policy instrument.** 14 of the 42 central critical-mineral blocks in this file
  (33.3%) went to state-owned or state-linked bidders — Coal India, NLC India, Oil India, Hindustan
  Zinc, Assam Mineral Development Corporation. Excluding Hindustan Zinc it is 21.4%. PSUs can carry a
  50-year composite licence with no near-term revenue, and several are being pushed into critical
  minerals by explicit policy. This is not evidence of favouritism. It does mean the auction is not
  yet doing what the 2023 amendment said it would — drawing in junior mining companies and foreign
  expertise.
- **High premiums have three benign explanations.** The IBM notified average sale price can sit well
  below what a producer realises for a graded product; a composite licence is a bet that exploration
  finds more than the G3/G4 estimate; and the premium is only payable on mineral dispatched, so a
  high bid on a block you may never mine is a cheap option. The 13.9% production rate is consistent
  with all three.

### The trap this dataset is built to avoid

Rolling **present-day** group ownership backwards over a **past** award register would generate a
much better story and a false one. It would attribute:

- the two 2017 Ambuja limestone blocks to the **Adani group** — which acquired Ambuja in September
  2022, five years later;
- the 2016 Kesla limestone block to **UltraTech** — Century's cement business was demerged into
  UltraTech in October 2019;
- the 2017 Kalamang West iron-ore block to **Tata Steel** — Bhushan Steel was resolved to Tata in
  May 2018;
- the 2017 Netrabandha Pahar block to **JSW Steel** — Bhushan Power and Steel was resolved to JSW in
  2021.

Each is a date-test failure. Note that the last one would have **raised** the top winner's share
from 9 blocks to 10 — which is precisely why the rule is applied by rule and not by result. Every
one of these refusals is recorded in the file's `denominators.firstRegisterWinners.notMerged`.

---

## 5. The publication asymmetry, which is itself the finding

The single most useful thing this pass established is *where the record lives*, and the answer is
unflattering.

- **MSTC Limited's result table (`/auctionhome/mlcln/`) is the only working machine-readable route
  to block-level results** — for every state and for the central tranches, in one schema, carrying
  block name, concession type, NIT date, auction close timestamp, preferred bidder, the bidder's
  MSTC registration number and the winning premium. It is also **the only place the Tranche VI and
  Tranche VII block-wise results exist at all**. It retains **only FY2025-26 onwards**.
- **The Ministry of Mines' own auction dashboard is unusable without a browser.** Every content URL
  on `mines.gov.in/webportal` returns an identical 5,860-byte Angular skeleton; the backing API
  returns HTTP 500 to external requests. The `writereaddata` PDFs that carried block-level detail up
  to 2022 now **404 on the live site** and survive only in the Internet Archive. Machine-readable
  public access to this record has gone **backwards** since 2019.
- **Exactly one state publishes its own preferred-bidder results in a fetchable form: Maharashtra.**
  Its Directorate of Geology and Mining posts per-block "Declaration of Preferred Bidder" notices as
  text-extractable PDFs carrying the winner, the MSTC registration number and the final price offer,
  and its figures match the MSTC rows exactly. That match is the **only** independent cross-validation
  of MSTC available anywhere in this dataset. For every other state, MSTC is a single point of failure.
- **Rajasthan** — 114 blocks auctioned since 2015, second-most in India — has a live, active portal
  that publishes minor-mineral notices and aggregate dashboards but **no preferred-bidder-with-premium
  document** we could find.
- **Ten state directorates could not be reached from this environment at all** (Odisha, Karnataka,
  Chhattisgarh, Jharkhand, Madhya Pradesh, Andhra Pradesh, Gujarat, Tamil Nadu, Telangana, Uttar
  Pradesh), by connection refusal or DNS failure over two network paths. **This is a statement about
  our access, not a finding that those states publish nothing** — several are known to serve normally
  from inside India, and Andhra Pradesh's host resolves only over IPv6. What it does establish is
  that the record is not retrievable by an ordinary automated request from outside India, which is a
  real constraint on external scrutiny.
- **MSTC publishes demo, mock and test rows inside its live result table**, with real registered
  bidders attached and premiums up to 50,000,034.00. Four were excluded here by an explicit rule and
  are listed in `excludedRows` so the exclusion is auditable. Anyone scraping that table without the
  filter will publish a fictional award.

### The ministry contradicts itself in three places

None is resolved here; all are recorded. (a) Annual Report Tables 3.4 and 3.5 give different
year-row totals for 2017-18, 2019-20 and 2020-21, and both year-row series sum to 595 against a
stated total of 592 — the column totals both sum to 592 and are the ones used. (b) The Year End
Review says Madhya Pradesh auctioned 33 blocks in CY2025 in its narrative and 32 in its own table.
(c) The Tranche VIII launch release says the eighth tranche takes "the total number of critical
mineral blocks offered to 88" when 88 was already the figure after Tranche VII, three weeks earlier.

---

## 6. What is not established

Full list in the file's `gaps` array (19 entries). The five that matter most:

1. **Bidder counts died in 2019.** The 2019 ministry register has a "Quote received" column — 46 of
   its 70 rows carry one — and it is the field that would let anyone test whether high premiums come
   from thick or thin competition. Nothing published since carries it. 252 of the 298 block records
   here have `quotesReceived: null`.
2. **A five-and-a-half-year hole in the block-level record**, from October 2019 to April 2025,
   covering roughly 350 of the 592 auctions. The most likely route to filling it is the Indian Bureau
   of Mines' "Bulletin of Mining Leases, Composite Licences, Exploration Licence and Auction", which
   was not retrieved.
3. **The annulment notices themselves were never opened.** Every per-tranche annulment count rests on
   one PTI wire story (plus an earlier one for Tranche VI). Tiered `reported`, and the whole
   annulment analysis stands or falls with it.
4. **A more recent parliamentary answer exists and is not in this file.** A written reply reported
   4 August 2026 gives 720 blocks auctioned since 2015 and 105 operationalised, with a state-wise
   table. Only a journalist's transcription of it was seen; `sansad.in`'s PDF route requires a
   server-validated hash. Under the house rule that a snippet is not a source, it does not enter the
   file — but it would supersede the 592 figure if obtained.
5. **Five of the seven concluded critical-mineral tranches have no block-wise result document.** PIB
   published one for Tranche IV and Tranche V and for no other. Tranche I results were announced at
   an event and reported by trade press with only one of six blocks named; Tranche II and III
   block-level results were not found anywhere; Tranche VI and VII survive only on MSTC.

---

## 7. Falsifiers

Stated in advance, so the claims above can be killed cleanly:

- **On the annulment rate.** If the Ministry's annulment notices show a per-tranche count different
  from 13/14/3/11/5/11/9, the 66 and every rate derived from it moves. Finding the notices on MSTC
  or `mines.gov.in` settles it.
- **On the "invisible re-auction" claim.** If the ministry has published a per-attempt success rate
  anywhere — an annual report, a parliamentary answer, a dashboard — then the claim that only the
  flattering denominator is published is false. Searched and not found; one document would end it.
- **On concentration.** If block-level data for the 2019–2025 hole shows a top winner above roughly
  25% of blocks in that period, the "long-tail market" reading fails and the concentration claim
  should be rewritten.
- **On captive advantage.** If a merchant miner has won a limestone or iron-ore block at a premium
  comparable to the captive average in any round since 2019, the captive-advantage argument weakens
  materially. The bidder-identity data to test it exists on MSTC for FY2025-26 onward and was not
  analysed here.
- **On lithium.** If Salal-Haimna is offered again and draws three qualified bidders, the "no bidder
  for India's flagship deposit" observation expires and should be retired rather than carried
  forward.
