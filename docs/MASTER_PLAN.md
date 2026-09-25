# ICIP Master Plan

*The single tracked artifact. Index, roadmap, and progress ledger.*
**Updated after every push.** If this file and the repo disagree, this file is stale
and fixing it is part of the next commit.

`docs/RESEARCH_PLAN.md` sequences the *research*. This sequences the *build*.

---

## 0. Index

| § | Section | Answers |
|---|---|---|
| 1 | [The four-role loop](#1-the-four-role-loop) | Who does what, in what order, with what veto |
| 2 | [The four domains](#2-the-four-domains) | What is being built, and why each is different |
| 3 | [The design thesis](#3-the-design-thesis-one-chrome-four-centres) | One chrome, four centres |
| 4 | [The cross-domain spine](#4-the-cross-domain-spine-competitive-tension) | The one statistic that makes them comparable |
| 5 | [Domain A — PM CARES](#5-domain-a--pm-cares-a-fund) | A fund |
| 6 | [Domain B — Government awards](#6-domain-b--government-awards-an-award-population) | An award population |
| 7 | [Domain C — The groups](#7-domain-c--the-groups-an-ownership-tree) | An ownership tree |
| 8 | [Domain D — Natural resources](#8-domain-d--natural-resources-a-spatial-allocation-register) | A spatial allocation register |
| 9 | [Shared components to build](#9-shared-components-to-build) | The chrome, once |
| 10 | [Information architecture](#10-information-architecture) | Every route, regrouped |
| 11 | [Roadmap](#11-roadmap) | Phases, and what unblocks what |
| 12 | [Progress ledger](#12-progress-ledger) | **Updated every push** |
| 13 | [Refusals](#13-refusals) | What will not be built, restated |

---

## 1. The four-role loop

Every unit of work passes through four roles in order. Each has a defined input, a
defined output, and one thing it may refuse.

| # | Role | Skill / agent | Takes | Produces | Can refuse |
|---|---|---|---|---|---|
| 1 | **Journalist** | `investigative-desk` | A question | Sourced records, chronology, gaps | Anything with no primary record |
| 2 | **Pattern matcher** | `pattern-prospecting` | A graph | Ranked questions + the funnel | To report survivors without the family size |
| 3 | **Designer** | `interface-design` | Facts + questions | A build spec | Any layout that hides a denominator |
| 4 | **Developer** | `frontend-implementation` | A spec | Shipped code, gates green | To land a change by disabling a gate |

**The handoffs are where the errors live**, so each is explicit:

- **1 → 2.** A record with no explanation becomes a graph edge. The journalist does not
  pass theories; the prospector does not receive hints. It sees the graph, nothing else.
- **2 → 1.** A survivor goes *back* to the journalist before it goes anywhere near a
  page. Its q-value says it beat a null model on a graph. It says nothing about whether
  the facts are true or the entities correctly resolved.
- **2 → 3.** The designer receives the **funnel**, not the gallery. If a spec shows
  survivors without N enumerated, the designer rejects it.
- **3 → 4.** The spec names what is **frozen**. The developer may not adjust a semantic
  encoding to make a layout fit.

**The skeptic's veto sits inside role 1** and applies to everything: date test →
identity test → base rate → denominator → innocent reading → control → denial. Stop at
the first failure. Four of seven allegations in the reference corpus died on the date
test alone.

---

## 2. The four domains

Four registers of how public value is allocated. They look similar and are not — each
has a different data shape, which drives a different interface.

| Domain | Data shape | Route | Status |
|---|---|---|---|
| **A. PM CARES** | One node, flows in/out over time, contested legal status | `/pmcares` | research running |
| **B. Government awards** | Bipartite population: awarder × winner | `/tenders` | shipped, needs deepening |
| **C. The groups** | Strict ownership hierarchy + flat operational footprint | `/conglomerates/:id` | shipped, wrong centre |
| **D. Natural resources** | Spatial allocation: endowment × allocation × regime | `/resources` | research running |

---

## 3. The design thesis: one chrome, four centres

**Constant chrome.** Every domain page carries the same rails, in the same order, so
the reader learns the page once:

```
Kicker · Title · Standfirst
─────────────────────────────────────────
DENOMINATOR STRIP (sticky)      N of M · K distinct · as of DATE
─────────────────────────────────────────
        THE CENTRE  ← the only part that differs
─────────────────────────────────────────
Filters (URL-backed, each showing its live effect on N)
CONTESTED   two positions, side by side, each sourced
GAPS        same type size as findings — never a footer
Source ledger · Tier legend · Standing note
```

**Changing centre.** The centre follows the shape of the data, never what looks
impressive:

| Shape | Centre | The wrong answer, and why |
|---|---|---|
| Hierarchy | Indented tree / icicle, depth control | Force graph — 220 nodes becomes a hairball that hides depth, the only thing the data has |
| Bipartite population | Concentration curve + ranked table | Network graph — shows degree, hides value |
| Flows over time | Flow ledger, periods as columns | Pie — cannot show a missing period, and the missing periods are the story |
| Spatial allocation | Two-layer map, endowment under allocation | Bar chart by state — discards the geography that is causal here |
| Sparse typed relations | Force graph | Table — here topology *is* the content |

Geography is causal in exactly one domain. **A coal block is a place; a tender is not.**

---

## 4. The cross-domain spine: competitive tension

The best idea in this plan, and the reason to build the four domains together rather
than separately.

Every allocation register answers the same two questions, and they can be computed
identically across all of them:

> **How many bidders showed up per lot, and how much of what was offered found a buyer?**

| Register | Bidders per lot | Offered vs taken |
|---|---|---|
| Government tenders | bids received per tender | tenders awarded / floated |
| Coal blocks | bidders per block per tranche | blocks auctioned / offered |
| Mineral blocks | bidders per block | **annulment rate** — blocks annulled / offered |
| Hydrocarbon blocks (OALP) | **single-bid share** per round | blocks awarded / on offer |
| Spectrum | operators bidding per auction | **unsold MHz share** |

One `CompetitiveTension` component, five registers, directly comparable. Every value
carries its own denominator by construction.

**Why this metric and not a "capture score":** it is neutral. A low bidder count is
exactly as consistent with an unattractive asset, a high capex threshold, or a narrow
qualified-bidder pool as with anything else. **The innocent reading is built into the
statistic**, which is why it can be shown without a caveat wrapped around it. Contrast
with any metric that scores an entity — that requires a caveat precisely because it is
making a claim the data cannot carry.

The comparison across registers is the finding, not the level in any one.

---

## 5. Domain A — PM CARES: a fund

**Shape:** one node. Money in, money out, by financial year. Plus a contested legal
status that is itself the most-litigated fact.

**Centre:** a **flow ledger with periods as columns and unpublished periods rendered as
holes.** Not omitted — drawn, labelled, and sized like the others. The gap in the series
is the most informative thing on the page and it must not be closeable by squinting.

**Elements**

| Element | Bound to | Note |
|---|---|---|
| Denominator strip | FYs published / FYs elapsed | The headline is coverage, not total |
| Flow ledger | `financials[]` by FY | Holes for unpublished years, explicitly labelled |
| Announced vs audited | `disbursements[]` | **Two bars per programme.** Where they differ, the delta is the element |
| Contested panel | `contested[]` | RTI "public authority" status — both positions, each sourced, neither adjudicated |
| Control comparison | PMNRF | If PMNRF has the same status, the exemption is a continuation, not a departure. **This check is worth more than anything else on the page** |
| CSR notification | the MCA circular | Alongside the statutory-2% base rate |
| Gaps | `gaps[]` | Which statements are unpublished, as of when |

**Filters:** FY · head of disbursement · donor class (PSU / private / foreign /
individual).

**Explicitly not built: a donor leaderboard.** Roughly 100% of responding PSUs
contributed. A leaderboard implies the donors are notable; the base rate says they are
not. That refusal is rendered on the page as a finding.

---

## 6. Domain B — Government awards: an award population

**Shape:** bipartite. Awarding body × winner, with value and date. Already shipped at
`/tenders` with centre and state scopes, a map and a network.

**Centre:** the **concentration curve** — cumulative share of value against winner rank
— with the ranked table beneath it.

**What to add**

| Addition | Why |
|---|---|
| **Single-bidder rate**, per ministry and per state | The headline competitive-tension number. Currently absent. |
| Concentration curve + HHI, with the full winner distribution | "Won 9 blocks" is not a fact until it is "9 of 125, across 91 distinct winners" |
| Every one-award winner shown, not truncated | The long tail *is* the base rate. Truncating it inflates every concentration claim |
| Value-band and procurement-mode filters | With live denominator effect |
| Cross-link into the resource registers | A coal block and a road contract are both awards |

**Filters:** ministry / state · FY · value band · procurement mode · bidder count
(control must declare its own coverage where bidder count is missing).

---

## 7. Domain C — The groups: an ownership tree

**Shape:** a strict hierarchy — 220 Adani entities, 60 Reliance — plus a flat
operational footprint. These are two different shapes and need two different centres.

**The correction this domain needs:** the deep-dives currently lean on force layout. A
220-node force graph of a strict tree is a hairball. **Depth is the only structure an
ownership tree has, and force layout is the one encoding that destroys it.** Replace
with an indented tree / icicle carrying a depth control; keep the force graph only for
the genuinely sparse cross-group relations.

**Elements**

| Element | Note |
|---|---|
| Ownership tree, depth-controlled | Subsidiary / JV / associate distinguished by shape, not colour |
| Name-history strip | **Legal name ≠ trading name ≠ brand.** Adani Mining Pty Ltd was never renamed Bravus — that is a business name on the same ABN. This trap produced more errors than any other |
| Acquisition timeline | Chronology first; most bad work is true facts on the wrong year |
| Operational footprint map | Registered office ≠ operational location. Six airports run from one Ahmedabad address |
| **Refuted-claims panel** | 15 widely-repeated claims the records refute. Rendered as prominently as the findings |

**Filters:** entity status · jurisdiction · listed / unlisted · acquisition year ·
sector.

---

## 8. Domain D — Natural resources: a spatial allocation register

**Shape:** endowment (where the resource is) × allocation (who got it) × regime (which
rules applied). The only domain where **position carries information** — a coal block
is a place.

**Centre:** a **two-layer map.** Resource endowment beneath, allocation above. Spectrum
uses the same component over the 22 telecom circles rather than states — a different
geometry, the same idea.

**The organising insight: 2014–15 is a natural experiment.** The Supreme Court cancelled
the Screening Committee allocations, and the MMDR amendment forced competitive auction.

> **Correction, from the coal research.** An earlier draft of this plan said the Court
> "cancelled 204 of 218 coal allocations". That is the figure in general circulation and
> it is wrong. The 25 August 2014 judgment declared the allocations illegal and
> expressly left the consequences open (para 157); the 24 September 2014 order did the
> cancelling, and its own arithmetic is **46 blocks identified as producing or
> ready-to-produce, 42 quashed, 4 saved**. Neither order uses the number 204 — the only
> "204" in the September order is an interlocutory application number in a footnote.
> **204 is statutory, not judicial**: it is the row count of Schedule I of the Coal
> Mines (Special Provisions) Act 2015, defined more broadly than the order. 218 is the
> Union's own affidavit figure of 216 plus 2 coal-to-liquid blocks mentioned orally.
> Reports describing 25 August as cancelling 204 blocks compress two decisions a month
> apart into one.
**Every chart in this domain splits at that boundary** — before/after, same axes, same
scale. A discretionary regime and an auction regime plotted as one continuous series is
a chart that hides its own subject.

**Sub-registers**

| Register | Dataset | Distinctive element |
|---|---|---|
| Coal | `resources-coal.json` | The cancellation cohort; tranche-by-tranche offered vs auctioned |
| Non-coal minerals | `resources-minerals.json` | **Annulment rate**, especially the critical-mineral tranches |
| Hydrocarbons | `resources-hydrocarbons.json` | **Single-bid share** per OALP round |
| Spectrum | `resources-spectrum.json` | **Unsold MHz share**; the 2G record end-to-end |

**The 2G record is the worked example the whole platform is built around** — allegation,
CAG presumptive-loss estimate, Supreme Court cancellation of 122 licences, and the 2017
acquittal of all accused. Four separate facts, four separate tiers, and **the acquittal
renders at the same prominence as the allegation.** Any page that shows the first three
and not the fourth is the failure mode this platform exists to avoid.

A CAG presumptive-loss figure is `documented` **as an estimate the CAG published** — not
as a loss that occurred. The distinction is encoded in the record's wording, not left to
the reader.

**Filters:** resource class · state / circle · regime era · status (producing / not /
annulled / cancelled) · winner · auction tranche.

---

## 9. Shared components to build

Build once, use in all four. This is what makes the chrome constant.

| Component | Contract |
|---|---|
| `<DenominatorStrip>` | Sticky. `N of M · K distinct · as of DATE`. Live under filters |
| `<GapsPanel>` | Same type size as findings. Takes `gaps[]`, renders reason per gap |
| `<ContestedFact>` | Two positions side by side, each with its own `srcs`. Adjudicates nothing |
| `<SourceLedger>` | Full list, never behind "show more" — primary vs secondary marked |
| `<CompetitiveTension>` | Bidders per lot + offered vs taken. One component, five registers |
| `<RegimeSplit>` | Before/after a declared date, same axes, same scale |
| `<OwnershipTree>` | Indented tree with depth control. Replaces force layout for hierarchies |
| `<ConcentrationCurve>` | Cumulative share by rank, full tail, no truncation |
| `<FilterBar>` | URL-backed; every control renders its own effect on the denominator |

---

## 10. Information architecture

The nav currently groups by MARKETS / POWER / METHOD / TOOLS. The four domains are the
same *kind* of thing — registers of allocation — and belong together.

```
MARKETS      Dashboard · NSE/BSE map · Geographic network · Industries ·
             Conglomerates · Interlocks

REGISTERS    Government awards · Natural resources · PM CARES · Media
             ↑ the four domains, plus media as the coverage register

POWER        Union cabinet · Connection graph · Money-trail atlas

METHOD       Pattern discipline · Motif engine · Prospector ·
             Investigative desk · Evidence audit · Base rates ·
             Provenance ledger · How this is built

TOOLS        Search · Donations · Watchlist
```

---

## 11. Roadmap — five subgoals

*Consolidated 2026-08-12. The old P0–P16 numbering grew by accretion and stopped
meaning anything; it is folded into the five subgoals below. Each has a **completion
test** — a thing that is either true or false — because a goal you cannot fail is a
goal you cannot finish.*

Phases P0–P13 are complete and are recorded in the ledger at §12. What remains is
organised as follows.

---

### SG1 — The register set is complete, and its numbers are legible

**Why first.** Four allocation registers were scoped and three shipped; the spectrum
dataset has been sitting in `research/raw/` unused. And every quantity on this site is
currently drawn as a `<div>` with a percentage width — there is not one time series, one
distribution, or one scatter plot anywhere in the codebase, while the data now contains
all three shapes.

| # | Work | Output |
|---|---|---|
| 1.1 | Chart layer — `TimeSeries`, `Distribution`, `Scatter` | `src/components/viz/Charts.tsx` |
| 1.2 | Validated chart palette, separate from the frozen family hues | tokens + a note on why they are separate |
| 1.3 | Spectrum wired into `/resources` as the fourth register | `src/data/resources.ts`, `/resources` |
| 1.4 | Spectrum unsold-share series, 2010→2024 | time series |
| 1.5 | Bid-count distribution, Himachal against Assam | distribution, 2 series |
| 1.6 | Contract value against bids received | scatter |

**Completion test — PASSED 2026-08-12**
- [x] All four registers appear in `CompetitiveTension` with real numbers
- [x] Three chart forms shipped, used on `/resources` and `/competition`
- [x] `validate_palette.js` → ALL CHECKS PASS on `#b27f02,#448dd4,#459f5d,#9c73c8` against `#0a0a0c`
- [x] Every chart has a table twin and a hover layer; single-series charts carry no legend
- [x] All four gates green

**What SG1 turned up.** The site's own token palette was tested as a chart palette and
**failed**: sage `#7a9e7e` against blue `#5a8ec4` measures ΔE 13.1 in normal vision,
under the floor of 15, and four of six tokens fall below the chroma floor and read grey
on a dark ground. They were chosen as low-saturation semantic accents, which is a
different job. Chart series now use a separate validated set, kept apart from the frozen
family hues so a blue line never reads as "public power".

The spectrum series carries the sharpest number on the platform: **the 2024 auction sold
1.34% of what it was offered.** The 2022 auction is excluded from the line — roughly 87%
of what it offered was 26 GHz mmWave, so its 71% headline compares two different things;
its sub-3 GHz share was 27.96%, worse than 2016.

---

### SG2 — Nothing unverified is presented as though it were verified

`/competition` ships 37,995 tenders at tier `reported` with `verification.status:
not-yet-verified`. The sampler exists and works. The blocker is real — award pages are
captcha-gated and stored portal URLs are session-scoped — so the honest outcomes are a
measured rate OR a documented statement that automated verification is impossible and
what a human would have to do instead.

**Completion test**
- [ ] `procurement-ocds.json` carries a real `verification` block with a measured rate, or a documented impossibility with the manual procedure written down
- [ ] The locate rate is published beside every figure drawn from the dataset

---

### SG3 — The corpus goes national

Two states is not India, and the page says so loudly. The 4.5M-row CPPP scrape carries
`num_bids_received` at 100% fill across central, state and defence procurement, 2011 to
2026. It is 3.45 GB and needs streaming rather than loading.

**Completion test**
- [ ] A national single-bidder rate with its denominator and its coverage limits, or a documented reason it cannot be computed
- [ ] Ingested under Stage 0 with a verification block, like everything else

---

### SG4 — Entities resolve, or the failure is documented

**The single highest-value unbuilt thing on the platform.** Zero winner CINs exist in
any accessible procurement dataset — measured, not assumed. That one absence makes the
coal HHI a floor rather than a measurement, makes shell-layering untestable on
`/capture`, and caps every edge on `/allocation` at `analytic`. There is one published
attempt at the problem (Splink linkage against the MCA register).

**Completion test**
- [ ] A linkage method with **precision measured on a hand-labelled sample**, or a documented refusal explaining why the platform will not fuzzy-match company names into documented edges
- [ ] Whatever ships is tiered `analytic` and carries its measured error rate

---

### SG5 — The site is navigable

Thirty routes and no index. A reader arriving at the dashboard cannot discover
`/capture` or `/competition` without scanning a sidebar.

**Completion test**
- [ ] A table-of-contents route listing every page with what question it answers
- [ ] The dashboard surfaces the registers and the newest findings
- [ ] Every page reachable within two clicks of the root

---

## 11a. Presentation standard

*Added with SG1. Applies to every chart built from here on.*

**Form is chosen from the data's job, and colour is chosen last.** Charts on this
platform mostly carry a single series, and a single series takes no legend — the title
names it.

| Job | Form | Not |
|---|---|---|
| Change over time | line, one axis | dual-axis anything |
| Distribution shape | histogram with the tail drawn | a mean with no spread |
| Two variables | scatter | two bar charts side by side |
| One headline | stat tile | a chart of one number |
| Magnitude across categories | horizontal bars | a pie |

**Two colour systems, kept apart.** The node-family hues (state / capital / recipient /
instrument / enforce / market) are **semantically frozen** and must never be used for
chart series — a blue line would read as "public power". The chart palette is separate,
validated, and carries no meaning beyond series identity.

The site's own token palette was **tested and failed** as a categorical chart palette:
sage `#7a9e7e` against blue `#5a8ec4` measures ΔE 13.1 in normal vision, below the
readability floor of 15, and four tokens fall under the chroma floor and read as grey on
a dark ground. The chart palette is therefore a separate, darker, more saturated set that
passes all six checks against `#0a0a0c`.

**Non-negotiable, from the dataviz discipline:**
- One axis. Never two y-scales — two measures of different scale become two charts.
- Categorical hues assigned in fixed order, never cycled; colour follows the entity, not its rank.
- Text wears text tokens, never the series colour.
- A table twin exists for every chart. It is the accessible equivalent, not a fallback.
- Grid and axes are recessive; marks are thin.
- Run the validator. Never eyeball whether a palette is colourblind-safe.

### What P13 established: the bid count exists, twice, and nowhere else

| Source | Bid counts? | Verdict |
|---|---|---|
| CPPP results page | — | Zero rows behind a captcha |
| CPPP dashboard JSON | — | HTTP 200, `application/json`, **0 bytes** |
| GeM | — | TCP connection refused at the edge |
| IREPS (Railways) | — | Anonymous search deliberately disabled |
| State portals (5 checked) | — | Open tenders free; awards captcha-gated *and* need a tender ID |
| **Himachal Pradesh OCDS** | **yes** | 3,771 tenders — via CivicDataLab, not the state |
| **Assam OCDS** | **yes** | 34,224 tenders — via CivicDataLab, not the state |

**Single-bidder: 3.39% (HP) against 16.18% (Assam)** — a factor of 4.8 between two
states measured identically, which is why no national rate is computed. The value
gradient — does single-bidding rise with contract size — comes back **flat in
Himachal Pradesh, whose top value band contains zero single-bidder tenders.**

Everything enters at `reported`, unverified, with the reason stated: award pages are
captcha-gated and stored portal URLs are session-scoped, so a sample cannot be
checked by automated retrieval.

### What P10 established: the control is the highest-yield check after the date test

The PM CARES investigation ran PMNRF as its control and the control killed the two
claims most often made about the fund:

| Claim | Killed by | Because |
|---|---|---|
| "Created to escape the RTI Act" | **Date test, via the control** | PMNRF asserted the identical s.2(h) position from 2011, litigated it from 2012, and a Delhi HC Division Bench **split 1–1 on 23 May 2018** — two years before PM CARES existed |
| "Accounts have gone dark since FY23" | **Base rate** | PMNRF's series stops at the same year. Both publish **4 of 7** elapsed FYs |

Identical on **8 of 8** properties tested — same auditor, same replacement firm, same
PMO officers signing both, same one-page statement format with the notes withheld.

**What survived is better than what died.** PMNRF refuses contributions from PSU
balance sheets outright; PM CARES excludes only *budgetary* sources and expressly
admits PSU **CSR**, which comes off the balance sheet. That is the missing mechanism
behind the ~100% PSU donation base rate this project had already measured and never
explained — and on the searching done, nobody has assembled it as that explanation.

The pattern generalises: **run the control before writing anything.** It is cheap, it
has a very high kill rate, and what survives it is worth far more than what was
claimed before it ran.
| **P11** | Spectrum register, joining the other three | Research running |
| **P12** ✅ | Allocation graph — awards and resource winners as one bipartite network | Shipped |

### The one column that would change the most

Three separate pieces of work now converge on the same missing field, and it is worth
stating once rather than three times:

| Where it bites | Consequence of the absence |
|---|---|
| `/resources` | The coal HHI of 195 and top-5 share of 20.3% are **floors**, not measurements |
| `/capture` | Shell-layering returns **cannot be tested** — the pathway is neither supported nor excluded |
| `/allocation` | Every edge is capped at `analytic`; 260 of 294 winners are unresolved nodes |

**A CIN column against each winner** — in documents the ministries already publish —
would convert an analytic sketch into a documented graph, turn a floor into a
measurement, and make the shell-layering question answerable. It is one column.

The second such field is **bid count per lot**. Coal publishes reserve price, final
offer and winner for all 133 blocks and the bid count for none, which is why the
competition question is unanswerable in the largest register in the country while
being fully answerable in hydrocarbons, where DGH published block-by-block tables for
four rounds.

### What P3 established, which changes the domain

The three registers are directly comparable and they do not look alike:

| Register | Offered → sold | Bidders per lot |
|---|---|---|
| Coal | 113 → 26 (**23%**) | **not published, 0 of 133** |
| Critical minerals | 123 → 56 (**46%**) | 4.5, on 46 of 298 records |
| Hydrocarbons | 516 → 392 (**76%**) | not published; 4 rounds carry a block table |

The hydrocarbon single-bid share ran from **3.6% in OALP Round I to 85.7% in Round VI**.
That is the clearest competition series on the platform, and it exists only because
DGH published block-by-block bid tables for four rounds. Nobody else does.

**The recurring finding across every register is the same missing column.** Coal
publishes reserve price, final offer and winner for all 133 blocks and the bid count
for none. Sixty of 126 rows carry no winner CIN, concentrated among the single-block
winners. Those two columns are what make "was there competition" and "are these
winners distinct" answerable, and their absence is why `/capture` returns *cannot be
tested* on its two most consequential pathways.

**P2 before P3–P6.** Building the chrome four times is how four pages drift apart.

---

## 12. Progress ledger

*Append a row on every push. Never rewrite a row — supersede it, same rule as the data.*

| Date | Commit | Phase | Landed | Gates |
|---|---|---|---|---|
| 2026-08-11 | `a34b086` | — | Government award register: ledger, transparency map, award network | ✅ all four |
| 2026-08-11 | `eb3a481` | P0 | Pattern prospector: exhaustive generation, ranked questions | ✅ all four |
| 2026-08-11 | `fa26fa1` | P0 | Investigative desk: skill, agent, page; sequenced research plan | ✅ all four |
| 2026-08-11 | `32e6859` | P0/P1/P2 | BY correction + stratified null; designer & developer roles; this plan; shared domain chrome | ✅ all four |
| 2026-08-11 | `2c880e6` | P5/P6 | Competitive tension on `/tenders`; ownership tree replaces force layout on group deep-dives | ✅ all four |
| 2026-08-11 | `c20ede7` | P7 | `/media` rebuilt on ownership distribution; lean-rating refusal published as the lead | ✅ all four |
| 2026-08-12 | `7ebbbce` | P3 | `/resources` — coal, minerals and hydrocarbons; nav regrouped into Registers | ✅ all four |
| 2026-08-12 | `03cb045` | P9 | Connection graph pan/zoom/ego-focus; `/capture` capture pathways | ✅ all four |
| 2026-08-12 | `5ab3966` | P12 | `/allocation` — four registers joined on winner name, tiered analytic throughout | ✅ all four |
| 2026-08-12 | `7ffcc00` | P10 | `/pmcares` — control-first; INGESTION Stage 0 rule for third-party bulk data | ✅ all four |
| 2026-08-12 | `18370c2` | P13 | `scripts/verify-sample.mjs` — the tool that makes Stage 0 enforceable | ✅ all four |
| 2026-08-12 | `86902ec` | P13 | `/competition` — 37,995 tenders with real bid counts, from the only two Indian sources that publish them | ✅ all four |
| 2026-08-12 | `ff19658` | **SG1** | Chart layer + validated palette; spectrum as the fourth register; time series, distribution, scatter | ✅ all four |
| 2026-08-12 | `006a138` | SG1 | Prospector run over the procurement graph — two bugs found in the analyser, both fixed | ✅ all four |
| 2026-08-12 | `e11e8c7` | SG1 | Desk pass killed all five candidates; four were already live. Coal bid counts recovered (26 of 65 single-bid), spectrum band-comparable series, critical-minerals base rate, Assam like-for-like ladder, 14th-round flipped to signature-absent | ✅ all four |
| 2026-08-12 | `d88de1b` | SG5 | Shared graph camera (`viz/camera.tsx`): measured viewBox, exact drag, pan pad, maximise, node pinning — on BOTH the force graph and the map graph. New fifth gate `npm run viewport` measures it | ✅ **all five** |

**Measured effect of the P0 statistics change**, recorded because it is the kind of
thing that gets forgotten:

| | Before (BH, one null) | After (BY, two nulls) |
|---|---|---|
| Case-study survivors | 14 | **6** |
| Replicated | 5 | **3** |
| Closed triangles | z = 2.77, significant | z = 2.77 plain, **z = 1.15 stratified** |

The triangle result is the Artzy-Randrup effect appearing in real Indian corporate data:
significant against a degree-preserving null, not significant once sector and state are
held fixed. **Co-location explained it.** That is now rendered on the shape.

**What P5 established, which changed the plan.** The single-bidder rate was scoped as
the headline statistic for the awards domain. It cannot be computed. Bid counts are
published for 16 of 125 awards, and bid *position* is recoverable for only 38 — but the
missingness is **structured, not random**:

| Sector | Awards | Bid position disclosed |
|---|---|---|
| Coal | 34 | **0** |
| Roads and highways | 13 | 1 |
| Renewables manufacturing | 14 | 14 |
| Telecom spectrum | 7 | 7 |
| Airports | 6 | 6 |

Disclosure tracks whether a regulator publishes a round-result document. The Ministry of
Coal publishes reserve price, final offer and winner for every one of its 34 blocks, and
the number of bids for none of them. So the most basic measure of whether an auction was
competitive is unavailable for the largest allocation programme in the register.

The domain therefore ships **the coverage as the finding**, and reports the 0%
sole-bidder rate among disclosed awards as a **floor on competition with a known bias
direction** — a round that drew one bidder has every reason not to advertise it — rather
than as a measurement. This is the P4 template too: the shape of what is missing is
usually more informative than what is present.

---

## 13. Refusals

Restated because they are load-bearing, and because every new domain tempts a new
violation.

- The platform asserts **no guilt**. It reports what records establish.
- **Never invent** a source, figure, date, quote, ticker, CIN or DIN.
- **No edge from co-location.** Shared state, shared sector and shared address are not
  relationships. This is now enforced statistically as well as editorially — it is
  exactly what the stratified null holds fixed.
- **No name-matched people.** DIN, constituency or office-with-dates, or no edge.
- **No pattern as a finding** without denominator, innocent reading and kill condition.
- **No allegation about a private individual** with no public role.
- **No influence score**, no risk score, no computed ranking of a real entity.
- **Absence reported as loudly as presence.**
- An acquittal, a dismissal or a refutation renders at the **same prominence** as the
  allegation it answers.
