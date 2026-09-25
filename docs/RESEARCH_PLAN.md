# Research Plan

*2026-08-11. Sequenced: PM CARES and government tenders first, then Adani and Reliance,
then the rest. Every item states the question, the source, what would settle it, and the
base rate that decides whether an answer would mean anything.*

Execution runs through `.claude/agents/investigative-desk.md`. Candidate generation runs
through `pattern-prospector`. Nothing here is published without clearing the skeptic pass.

---

## How to read the priority order

Items are ordered by **what unblocks the most**, not by what sounds most serious. Three
categories:

| Tag | Meaning |
|---|---|
| **COMPUTABLE** | Answerable today from public data. No permission needed. Do these first. |
| **RTI** | Needs a filing. Weeks to months. Start the clock early. |
| **BLOCKED** | Needs something that does not exist or is not public. Say so and stop. |

A plan whose top items are all BLOCKED is a wish list. Six of the first nine below are
COMPUTABLE, which is the point.

---

# Phase 1 — PM CARES

## What is already established, so nobody re-derives it

- **38 of 38 responding PSUs contributed** (RTI, of 55 asked). The base rate is
  effectively 100%, which means **"company X gave to PM CARES" is not a finding** and a
  donor graph would be a graph of who existed in March 2020.
- ₹13,605 cr in, ₹8,131 cr spent. Accounts dark since FY23.
- Many contributions came from unspent CSR in the last four days of the financial year —
  an accounting artefact, not a signal.
- Reliance ₹500 cr (30 Mar 2020, documented). Coal India ₹221 cr pledged.

**So the donor list is a dead end.** The live questions are about the fund itself.

## P1.1 — FY24 and FY25 statements · **RTI**

**Question:** what came in, what went out, to whom?
**Why it matters:** the last published accounts are FY23. Everything after is unaudited
and unseen.
**Method:** RTI to the PMO / PM CARES trust. Expect a refusal on the ground that the trust
is not a public authority; that refusal is itself the finding and has been litigated.
**Settles:** whether disbursement matches stated purpose.
**Kill condition:** full audited statements reconcile inflow to outflow.

## P1.2 — The ventilator procurement, end to end · **COMPUTABLE**

**Question:** which manufacturers received PM CARES ventilator orders, at what unit price,
against what specification, and what did CAG find?
**Sources:** CAG reports; MoHFW procurement notes; HLL Lifecare tender records; the
parliamentary standing committee record.
**Why this one:** it is the only PM CARES outflow with a public audit trail. Everything
else about the fund is opaque; this is the crack.
**Base rate to establish first:** what share of emergency-procurement contracts in
2020-21 went to firms with no prior ventilator manufacturing record? Without that
denominator, "a firm with no track record won" is not a finding — emergency procurement
was full of such firms by design.

## P1.3 — The ₹100 cr vaccine pledge · **COMPUTABLE**

**Question:** was it disbursed, to whom, and when?
Reported as never disbursed. Establish it from the fund's own statements or the
recipient's accounts, or record it as unresolved.

## P1.4 — PSU contributions against CSR obligations · **COMPUTABLE**

**Question:** for each contributing PSU, was the PM CARES payment booked as CSR, and did
it displace other CSR spending?
**Sources:** PSU annual reports, CSR annexures (Companies Act s.135 disclosures).
**Why it matters:** if PM CARES payments displaced local CSR, the transfer has a real
distributional effect that nobody has quantified. This is genuinely unreported and fully
computable.
**Innocent reading to write first:** unspent CSR at year end has to go somewhere, and a
national emergency fund is an obvious destination. The question is displacement, not motive.

## P1.5 — The legal status litigation · **COMPUTABLE**

Track the Delhi High Court and related proceedings on whether PM CARES is a public
authority under the RTI Act, and on the use of state emblems and the gov.in domain.
Record the stage precisely — a pending petition is not a finding.

---

# Phase 2 — Government tenders

## What is already established

- **Central:** 88 awards mapped across 7 ministries. 36 carry a rupee value; **16 carry a
  bidder count**. Ports, railways and FCI silos have no rows.
- **State:** 37 awards across 11 states. **Zero carry a bidder count.** **Zero of 13
  states publish machine-readable procurement data.** Every state award was reconstructed
  from the winner's disclosures, never from the awarding state.
- **Airports:** Adani won 6 of 6 — against 32 technical bids from 10 companies.
- **Coal:** the opposite. 125 commercial line-items, 91 distinct winners, top winner
  (Rungta Sons, unlisted) at 9 = 7.2%. Adani entities 2.

## P2.1 — The full award population, 2019–24 · **COMPUTABLE** · *highest value on this page*

**Question:** across every coal and mining award in the period, do donors win at a higher
rate than non-donors, once volume is held fixed?

**Why this is the top item:** it is the single dataset that unblocks the motif engine —
which currently reports 4 of 5 templates *untestable* because the case-study subgraph is
star-shaped — and it settles the quid-pro-quo question **in both directions**. Nobody has
published it.

**Method, precisely:**
1. Enumerate every award from the Ministry of Coal tranche-wise file. That is the
   denominator and it is public.
2. Join to the electoral bond / trust data on entity, resolved by CIN, not by name.
3. Compute the donation rate among winners and among **bidders who lost** — the control
   group that makes this an analysis rather than a list.
4. Shuffle award dates within period, holding each donor's volume fixed, ≥1,000 times.
   Report the observed gap distribution against the shuffled one.
5. Report the base rate first: what share of *all* large listed companies donated at all?

**Settles:** whether proximity exceeds chance. **Kill condition:** the shuffled control
reproduces the observed proximity.

**Note the likely outcome honestly:** the platform already found that Adani, Reliance and
Tata are *absent* from the electoral bond data entirely. A rigorous version of this
analysis may well show no effect, and that is a publishable result.

## P2.2 — Bidder counts, centrally · **COMPUTABLE**

**Question:** can the 72 central awards missing a bidder count be filled?
**Sources:** eprocure.gov.in / CPPP tender archives, ministry annual reports, RTI where
the portal fails. eprocure and GeM were unreachable in this session — retry from a
different network before recording them as unavailable.
**Why:** without bidder counts, no concentration claim survives the skeptic pass. This is
the binding constraint on the entire tender programme.

## P2.3 — The state transparency audit · **COMPUTABLE** · *publishable on its own*

**Question:** what does each state actually publish about its procurement?
**Method:** for all 36 states and UTs — not the 13 sampled — record: portal exists,
platform (GePNIC / nProcure / bespoke), award results published, bidder counts published,
bulk export or API, machine-readable format.
**Why this is a finding in itself:** *no Indian state publishes queryable procurement
data* is a more useful and more defensible claim than any ranked list of who won most.
It is also a claim about the state, not about any company, so it clears the skeptic pass
easily.
**Deliverable:** the transparency map already built at `/tenders?view=map`, extended to
all 36.

## P2.4 — FCI silos, the PPPAC minutes · **RTI**

**Question:** who argued to drop the anti-monopoly clause at the 13 May 2022 meeting, and
on whose representation?
**Established already:** two companies hold 110 of 134 contracts, ~46.5 of 60 LMT. FCI's
answer is that restricting participation would have reduced competition. The
second-largest beneficiary is funded substantially by Western development finance
institutions, which cuts against the simplest capture reading.
**Settles:** whether the clause removal was argued for by a beneficiary.

## P2.5 — Ports, railways, defence · **COMPUTABLE**

Three sectors with zero rows in the central register. Defence is the hardest: **no PIB
contract release states a procurement route or a bidder count**, only the DAP category and
the vendor. Establishing the nomination-versus-tender split for defence is genuinely
unreported and probably needs an RTI.

---

# Phase 3 — Adani

## What is already established

220 entities from statutory AOC-1 schedules — 13 listed, 86 subsidiaries, 109 SPVs, 10
JVs. 207 documented. **Only 11 of 220 carry a CIN**, because every registry mirror 403s.

## P3.1 — CINs for the 209 · **COMPUTABLE** · *unblocks everything else*

**Question:** what is the registry identifier for each named entity?
**Why first:** a name in an annexure proves an entity exists. Without a CIN it cannot be
resolved, joined to a filing, or checked. Every downstream Adani analysis is provisional
until this is done.
**Method:** `thecompanycheck.com/company/<slug>/<CIN>` accepts a superseded CIN and serves
the current record — that is what surfaces renames and state-shift CIN changes. GLEIF's
API covers the offshore entities. The ABR covers the Australian ones, including full
name history.
**Do not:** guess a CIN to construct a URL. An entity without one is a gap.

## P3.2 — The promoter and holding chain · **COMPUTABLE**

**Question:** what sits above the listed companies?
**Status:** entirely unverified. S. B. Adani Family Trust, Adani Tradeline, Adani
Properties, and the Mauritius and DMCC vehicles. **The top of the ownership tree is
missing.**
**Sources:** shareholding-pattern PDFs from exchange archives (the pages render empty
because they are JS-driven; the PDFs behind them do not). GLEIF for the offshore
entities — note that Emerging Market Investment DMCC has *no* LEI record at all, which is
itself worth reporting.
**Established negative:** the realty business sits **outside** the listed flagship —
established by its absence from a 258-entity consolidation annexure. Negative evidence,
properly used.

## P3.3 — The AWL contradiction · **COMPUTABLE**

Press reports a full exit on 20 Nov 2025; the FY26 AOC-1 still lists AWL as a 30.424%
associate via Adani Commodities LLP. **Recorded as unresolved, not adjudicated.** Settle
it from the next quarterly filing.

## P3.4 — Defence contracts · **RTI**

16 defence entities mapped, **zero contract records**. A whole sector structurally mapped
with no award data.

## P3.5 — MDO agreements · **RTI**

Only the Talabira agreement is sourced. The RRVUNL, CSPGCL, MAHAGENCO and APMDC
appointments are unverified on the Adani side — only the allottee side is established.
Chhattisgarh is documented-negative: the state utility refused an RTI for the Gare Pelma
III MDO agreement and the State Information Commission had to order disclosure in 2019.

---

# Phase 4 — Reliance

## What is already established

60 entities. **Jio Platforms filed a DRHP on 19 June 2026** — a primary source pinning the
entire cap table exactly, including 94 unnamed holders at 1.75%.

## P4.1 — KG-D6 participating interests · **COMPUTABLE**

Only the 2000 split (RIL 90% / Niko 10%) is primary-sourced. Current RIL/bp interests are
undocumented. Sources: DGH records, RIL annual report segment notes.

## P4.2 — The "Reliance Retail Limited" resolution failure · **COMPUTABLE**

Two MCA records share the name under different CINs. The dataset left the CIN null rather
than guessing. Resolve it, and record which entity is which.

## P4.3 — Spectrum, from the primary record · **COMPUTABLE**

Every spectrum figure is currently news-tiered because PIB 403s. DoT auction result
documents exist; retrieve them and upgrade the tier.

## P4.4 — The 94 unnamed Jio Platforms holders · **BLOCKED, and worth saying so**

The DRHP names the promoter and top 10. The remaining 1.75% across 94 holders is not
disclosed and will not be until the RHP, if then. Record as a known limit rather than
speculating.

---

# Phase 5 — The rest

Ordered by what the existing data makes tractable.

| # | Target | First question | Type |
|---|---|---|---|
| 5.1 | **Tata** | Control through philanthropic trusts rather than family shareholding — the structure is genuinely unusual and under-documented | COMPUTABLE |
| 5.2 | **Vedanta** | The Mauritius holding chain and the demerger structure | COMPUTABLE |
| 5.3 | **JSW** | Distinguish the Sajjan Jindal branch from the Jindal Steel & Power and Jindal Stainless branches — a name-collision trap | COMPUTABLE |
| 5.4 | **Aditya Birla** | The AB electoral trust, which is one of the few groups with substantial documented political giving | COMPUTABLE |
| 5.5 | **L&T** | No promoter, institutionally owned — the control case against which the others should be read | COMPUTABLE |
| 5.6 | **Bajaj, Mahindra, Hinduja** | Standard structure mapping | COMPUTABLE |

**5.5 is more important than it looks.** L&T has no promoter and is professionally
managed. It is the natural control for every claim about promoter-controlled groups, and
running the identical analysis on it is the symmetry check the pattern discipline demands.

---

# Cross-cutting, run continuously

## X.1 — DIN-keyed person resolution · **COMPUTABLE**

Until every person node carries a DIN, no interlock claim is publishable. The `/interlocks`
page currently exists mainly to demonstrate what the rule prevents: a naive surname matcher
would draw 7 minister-to-office-holder edges from this dataset, against ~19 expected by
chance across 3,795 pairs — **fewer than chance**.

## X.2 — The electoral bond absence · **COMPUTABLE**

Adani, Reliance and Tata are absent from the bond data. Establish whether that is a real
absence or a resolution failure — i.e. whether they gave through vehicles not matched to
them. This is the highest-stakes negative finding on the platform and it deserves a
dedicated check.

## X.3 — Base rates for every edge type · **COMPUTABLE**

Six are published. Every edge type the graph draws needs one, or the edge should not be
drawn.

---

## Standing rules for everything above

- **Chronology before theory.** Four of seven allegations in the reference corpus died on
  the date test alone.
- **Denominator before publication.** "Won 9" is not a fact until it is "9 of 125".
- **The innocent reading ships with the claim.**
- **A killed item is a completed item.** Record which check killed it.
- **Absence is reported as loudly as presence**, with the coverage caveat attached: an
  absence in the dataset may be an absence in the world or a hole in the research.
