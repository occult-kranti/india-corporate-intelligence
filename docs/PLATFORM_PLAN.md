# Platform Plan — company pages, tender maps, and the data layer beneath them

*Version 1.0 · 2026-08-11 · the architecture and UX plan for the next build phase.
`docs/TASK_INDEX.md` tracks execution; this explains what is being built and why.*

---

## 0. Table of contents

| § | Section | Answers |
|---|---|---|
| 1 | [The backend decision](#1-the-backend-decision) | Where does data live, and what serves it? |
| 2 | [The entity record](#2-the-entity-record) | What does the platform know about one company? |
| 3 | [Information architecture](#3-information-architecture) | Every route, and what each is for |
| 4 | [The company page](#4-the-company-page) | Section-by-section design |
| 5 | [The consolidated NSE/BSE map](#5-the-consolidated-nsebse-map) | Layers, interactions, drill-down |
| 6 | [Tender maps and the tender graph](#6-tender-maps-and-the-tender-graph) | Centre, state, and the network between them |
| 7 | [Group deep-dives](#7-group-deep-dives) | Adani, Reliance, and the eight behind them |
| 8 | [Overlays: foreign capital and PM CARES](#8-overlays-foreign-capital-and-pm-cares) | The cross-cutting layers |
| 9 | [UI/UX system](#9-uiux-system) | Navigation, density, mobile, performance |
| 10 | [What must not be built](#10-what-must-not-be-built) | The refusals, restated for this phase |
| 11 | [Phasing](#11-phasing) | Order of work and what unblocks what |

---

## 1. The backend decision

**The requirement:** per-company pages with rich, queryable data, and a "baseline
mechanism" to generate them.

**The constraint:** the app is static. Data is compiled in, there are no runtime
fetches, it deploys to GitHub Pages and works offline. That is not an accident —
it is why the site is free to host, impossible to take down by breaking an API, and
auditable, because every number shipped is in the git history.

**The decision: a build-time data layer, not a served API.**

```
research/raw/*.json          ← quarantine. Agents write here. Untrusted.
        │  npm run promote   ← extract → resolve → ground → assemble
        ▼
research/promotion-report.json
        │  npm run generate  ← NEW. Emits typed, per-entity records
        ▼
src/data/generated/
        ├── entities/*.ts     one record per company, tree-shakeable
        ├── index.ts          id → lazy import map
        └── manifest.ts       counts, asOf dates, coverage
        │  vite build
        ▼
dist/  ← one static bundle, per-route code-split
```

This is a backend in every sense that matters here — a pipeline that validates,
resolves and shapes data into an API the frontend consumes. The API is the module
graph rather than HTTP.

**When a served API becomes necessary**, and what it costs:

| Trigger | Why static stops working | Cost |
|---|---|---|
| > ~2,000 companies with full financials | Bundle exceeds what a browser should parse | Hosting + DB (~$20-40/mo) |
| User accounts, saved queries, alerts | Needs server-side state | Auth + DB + email |
| Live prices | Runtime fetches by definition | Market data licence — the real cost |
| Full-text search over annual reports | Index too large to ship | Search service |

None of those is triggered yet at 259 companies. The honest sequencing is: build
the generator now, and let the first of those triggers decide the API, rather than
building an API on speculation.

**Interim scaling step**, before any server: move per-entity records to
`public/data/entities/*.json`, fetched on demand and cached. Keeps Pages hosting,
removes the bundle ceiling, costs one loading state. That is the bridge, and it is
cheap.

---

## 2. The entity record

One shape, for every company, generated per entity. Everything optional is
`null` — never a plausible-looking default.

```ts
interface EntityRecord {
  id: string;                       // stable slug
  identity: {
    legalName: string; shortName: string;
    cin: string | null;             // the MCA join key
    isin: string | null;
    nse: string | null; bse: string | null;   // BSE is NUMERIC. Not the ticker.
    incorporated: string | null;
    aliases: string[];
    resolved: boolean;              // false ⇒ takes no edges, anywhere
  };
  classification: { sector; industry; subIndustry; ownership; group };
  geography: {
    registered: { city; state; stateCode; lat; lon; geocoded: boolean };
    operational: Facility[];        // plants, mines, ports, offices
    // registered ≠ operational. Never conflated, never silently merged.
  };
  market: {
    mcapCr: number | null; asOf: string | null;
    promoterPct: number | null; fiiPct: number | null; diiPct: number | null;
    shareholdingAsOfQuarter: string | null;
  };
  structure: { parent; subsidiaries[]; jointVentures[]; foreignInvestors[] };
  people: { name; role; since; din; family }[];   // DIN or it takes no edge
  government: {
    contracts: ContractRef[];       // → the tender dataset
    concessions: ConcessionRef[];
    // Every one carries its denominator: "9 of 41 blocks offered"
  };
  flows: { politicalDonations[]; pmCares[]; csr[] };  // each tiered + sourced
  provenance: {
    sources: Source[]; runId: string;
    tierCensus: Record<Tier, number>;
    gaps: string[];                 // published, not hidden
  };
}
```

**The three rules that shape this record**

1. **Every scalar that could be wrong carries an `asOf`.** A market cap without a
   date is a claim about now, and it is always false by the time it is read.
2. **`geocoded: boolean` is not decoration.** Today most marks are placed *within* a
   state, not located. The flag is what lets the UI stop saying so once F005 lands.
3. **`resolved: false` propagates.** An unresolved entity renders, and takes no
   edges. This is enforced in `validate.mjs`, not by discipline.

---

## 3. Information architecture

Current routes stay. New ones marked **NEW**.

| Route | Purpose |
|---|---|
| `/` | Dashboard — aggregates, concentration, evidence census |
| `/map` | Consolidated NSE/BSE map (§5) |
| `/geograph` | Geographic network — relationships drawn in place |
| `/tenders` | **NEW** Tender explorer — centre + state (§6) |
| `/tenders/map` | **NEW** Tender map, toggleable centre/state (§6) |
| `/tenders/graph` | **NEW** Tender network — awarding body ↔ winner (§6) |
| `/company/:id` | Company page (§4) |
| `/company/:id/map` | **NEW** Per-company facility map |
| `/conglomerates` | Ten groups, comparative |
| `/conglomerates/:id` | **NEW** Group deep-dive (§7) |
| `/states/:code` | State profile |
| `/industries` | Sector concentration |
| `/cabinet`, `/network`, `/atlas`, `/political`, `/media` | As now |
| `/foreign-capital` | **NEW** Foreign investment overlay (§8) |
| `/patterns`, `/motifs`, `/evidence`, `/base-rates`, `/provenance`, `/method` | The discipline layer |

**Navigation grouping** — four rails, unchanged in spirit:
*Markets* · *Power* · *Method* · *Tools*. `/tenders/*` joins **Power**, because a
procurement record is an exercise of public authority, not a market fact.

---

## 4. The company page

The current page is a good skeleton and thin on substance. Target structure, in
reading order — each section renders only when it has real data, and says so when
it does not.

| # | Section | Content | Empty state |
|---|---|---|---|
| 1 | **Identity header** | Name, tickers, ISIN, CIN, sector, registered city/state, group, watch toggle | — |
| 2 | **Key figures** | Market cap + `asOf`, promoter %, employees, founded | "not recorded" — never a dash that reads as zero |
| 3 | **Where it is** | Per-company facility map: registered office + plants/mines/ports/offices | "Registered office only; no facilities recorded" |
| 4 | **Structure** | Parent, subsidiaries, JVs, foreign investors, promoter chain | "No structure recorded beyond the listed entity" |
| 5 | **People** | Board and promoters, with DIN where known | Flags unresolved names explicitly |
| 6 | **Government business** | Contracts and concessions, **each with its denominator** and process type | "No central or state award recorded in the dataset" — a *coverage* statement, not an absence claim |
| 7 | **Flows** | Donations, PM CARES, CSR — tiered, sourced, with base rate alongside | Renders the base rate even at zero: "0 recorded; 82.45% of trust money went to one party" |
| 8 | **In the graph** | Ego network, tier-coded, with the median-separation baseline | — |
| 9 | **Peers** | Same-sector companies by market cap — the reference class | — |
| 10 | **Provenance** | Every source, the run id, the tier census, the gaps | Always renders. This is the page's spine |

**The design rule that matters most:** section 6 and section 7 are where a reader
will look for wrongdoing. Both must render their **denominator inline**, not behind
a link. "Won 9 of 41 blocks offered" and "one of 38 of 38 responding PSUs" are the
whole difference between a finding and an insinuation.

---

## 5. The consolidated NSE/BSE map

Extends the existing `/map`.

**Layers** (independently toggleable, composited in this order):

1. **Ground** — state choropleth: market cap / company count / GSDP / PSU share / HHI
2. **Companies** — marks, sized by market cap, coloured by sector
3. **Facilities** — plants, mines, ports, refineries (needs the facility dataset)
4. **Tenders** — award locations, sized by value (§6)
5. **Political** — ministers by seat, as *context only*, never edges

**Interactions**

- Hover → readout with the metric **and its denominator**
- Click state → side panel; click again → `/states/:code`
- Click mark → company card → `/company/:id`
- Lasso/box select → "N companies, ₹X cr, sector mix" summary
- Exchange toggle NSE / BSE / both; sector filter; market-cap floor
- URL-encoded state, so any view is shareable — already true, extend to layers

**The honesty furniture, which is not optional**

- No-data hatch, visually distinct from the lowest ramp step
- "positioned within state, not geocoded" wherever anchored marks appear, until
  `geocoded: true` is the norm
- Quantile bins by default; a linear ramp renders thirty states identical
- Every count shows its denominator

---

## 6. Tender maps and the tender graph

The largest new surface. Three views over one dataset.

### 6.1 `/tenders` — the explorer

A filterable ledger: awarding body, ministry/state, sector, winner, value, date,
process type, bidder count. Sortable, with a table twin. Filters are URL-encoded.

**Every aggregate carries its denominator.** "Adani won 9" is not a row this page
will render; "9 of 41 blocks offered, against 12 distinct winners" is.

### 6.2 `/tenders/map` — the tender map

Toggle **Centre** / **State** / **Both**.

- **Centre**: awards plotted at the *project* location where known, otherwise at the
  awarding body's seat — which is usually Delhi, and the caption must say that the
  Delhi cluster is an artefact of where ministries are registered, exactly as
  `/geograph` already does.
- **State**: choropleth of award count/value per state, with marks per award.
  A second encoding shows **portal transparency** — states with no machine-readable
  procurement data render hatched. *That gap is the finding*: if most states publish
  nothing queryable, the map's main job is to show that.

### 6.3 `/tenders/graph` — the tender network

Nodes: awarding bodies, ministries, states, winning companies, promoter groups.
Edges: `award` (tiered, valued, dated).

### 6.4 What the state sweep established, and what it forecloses

The state procurement research came back, and its central result is negative and
load-bearing. It should be read before building anything in §6.

| Measure | Result |
|---|---|
| Awards recovered | 37, across 11 of 13 states in scope |
| States with a **machine-readable** procurement portal | **0 of 13** |
| Awards carrying a sourced rupee value | **5 of 37** |
| Awards carrying a **bidder count** | **0 of 37** |
| Awards sourced from the *awarding state* | **0** — every one came from the winner's own disclosures or trade press |

Eight state portals were reached and are all running the same NIC GePNIC build:
tender-by-tender web UI, an MIS-report link, no API, no bulk export. Five more
refused connection and are recorded `portalFound: false` with an explicit
*unverified, not established absent* note rather than as absence.

**Telangana and West Bengal show zero awards, and that is a disclosure fact rather
than an activity fact.** Telangana announces allotments to "70 companies" and "113
firms" without naming one; WBIDC's dashboard publishes application counts, not
allottees. Chhattisgarh is documented-negative: the state utility refused an RTI for
a mining MDO agreement and the State Information Commission had to order disclosure
in 2019.

**The foreclosure: zero bidder counts means no state-level concentration claim is
available at all.** §6.3 below requires bidder counts on the edge, because a
sole-bidder award and a twelve-bidder award are identical in a network diagram and
completely different facts. That requirement cannot be met from state data. So the
state tender graph ships as a **coverage map** — who publishes what, and who
publishes nothing — and not as a concentration analysis. Anything stronger would be
asserting structure the data cannot carry.

That is not a disappointing result. *No Indian state publishes queryable procurement
data* is a more useful finding than a ranked list of who won most, and it is the
kind of claim the transparency map can make honestly.

**What this graph must do to be worth building:**

- Report **bidder counts** on the edge. A sole-bidder award and a twelve-bidder
  award look identical in a network diagram and are completely different facts.
- Run the **degree-preserving null model** before highlighting any structure. A
  ministry that awards many contracts is a hub by construction.
- Publish the **share of large listed companies holding any government contract**.
  If most do, then "company X holds a government contract" is not a finding, and
  the page leads with that.
- Offer the **symmetry check**: run the same concentration analysis on a
  differently-governed state or an earlier period. If the method produces an equally
  striking picture there, the method is generating the result.

---

## 7. Group deep-dives

`/conglomerates/:id` — one data-driven page for all ten groups, not two hardcoded ones.

| Section | Content |
|---|---|
| Structure tree | Holding entity → listed → unlisted → SPVs, with holding % |
| Sector spread | Which sectors, how concentrated, against peer groups |
| Domestic map | Facilities and registered offices |
| **World map** | International facilities and foreign investors |
| Government business | Contracts across centre and states, each with denominators |
| Foreign capital | Sovereign funds, strategic investors, DFIs — with stakes and dates |
| Flows | Donations, PM CARES, CSR — tiered, with base rates |
| Comparison | The same metrics for the other nine groups, side by side |

**The comparison column is the point.** A single group's chart of contracts and
donations always looks alarming. The same chart beside nine peers is the only
version that supports a conclusion — and may well refute one.

Structural guarantee retained: **Anil Ambani's entities never merge into Mukesh
Ambani's group**, enforced in the data shape, not in prose.

---

## 8. Overlays: foreign capital and PM CARES

`/foreign-capital` — sovereign wealth funds, DFIs, strategic investors and their
stakes across Indian listed entities.

Worth building because it **cuts against the simplest story as often as it supports
it**: the second-largest FCI silo beneficiary is funded substantially by Western
development finance institutions, which is a strike against a domestic-capture
reading. A platform that only shows the connections supporting one narrative is not
an analysis tool.

**PM CARES** stays an overlay rather than a page, because the base rate makes it
nearly information-free at the entity level: 38 of 38 responding PSUs contributed.
It renders as a badge on company and group pages **with that denominator attached**,
never as a standalone graph of "who donated" — which would be a graph of "who exists".

---

## 8b. News, citations, and the coverage-distribution UI

**The requirement:** track every news item and source per company, and render a
Ground News-style distribution of the outlets covering it — right / left / independent.

**The citation half is straightforward and is being built.** Every claim on the
platform already carries `srcs`. Extending that into a per-company citation index —
every article, filing and report the dataset draws on, deduplicated, dated, and
grouped by what it supports — is ordinary work and is section 10 of the company page.

**The lean-classification half has a real problem, and it needs saying before it is
built rather than after.**

Ground News can render a left/centre/right distribution because it aggregates
*published third-party ratings* — AllSides, Media Bias/Fact Check — and attributes
every badge to the rater. It is not asserting the lean itself; it is reporting what
named rating systems say, with their methodologies public.

For Indian outlets, it is not obvious an equivalent exists. If it does not, then a
left/right/independent badge on an Indian outlet would be **this platform asserting
a contested political classification with no source** — the precise thing it refuses
to do everywhere else. A page that carefully publishes the denominator behind every
corporate claim, and then labels *The Hindu* "left" on nobody's authority, has given
away the thing that makes it worth reading.

**So the sequence is: establish the basis first, then build the UI.** A research
sweep is queued to answer one question — *does a published, methodologically
documented lean rating covering Indian outlets exist, and whose is it?* Candidates
include the Reuters Institute Digital News Report India chapter, CSDS/Lokniti, the
RSF/DataLEADS Media Ownership Monitor for India, AllSides and MBFC coverage of Indian
titles, and peer-reviewed content analyses. "No adequate source exists" is a
perfectly good answer and more useful than a fabricated scale.

**What gets built in each case:**

| If lean ratings… | The coverage bar shows |
|---|---|
| **exist and are citable** | Lean distribution, every segment attributed to the named rater with its `asOf` and a link to the methodology. Never "left" — always "rated left-of-centre by AllSides, Jan 2026" |
| **exist only partially** | Rated outlets in the bar; unrated outlets in an explicit "no published rating" segment that is never silently dropped |
| **do not exist** | **Ownership distribution instead** — which is fully documentable |

**The ownership fallback is not a consolation prize; it may be the better metric.**
For a page about corporate power, "who owns the outlets covering this company" is a
sharper question than where they sit on a left-right axis. It is documentable from
filings, it does not require anyone to adjudicate ideology, and it surfaces the thing
that actually matters here — for example that NDTV's ownership changed to the Adani
group in 2022-23, which is a fact with a date, not a label.

**Coverage volume needs its own denominator.** "40 articles about company X" is
meaningless without "out of N articles that outlet published in the period" and
"against a median of M articles about comparable companies". Otherwise the bar
measures outlet size, exactly as raw degree measures entity size in the graph.

**Data acquisition.** Live news needs an API (paid) or a static snapshot. Static-first
means a curated, sourced article index in `research/raw/`, promoted like everything
else. A live feed is the same trigger as any other runtime fetch in §1 and is costed
there.

### 8b.1 Coverage tone — and the only way to measure it that means anything

**The hypothesis, stated plainly:** an outlet that is captured — by ownership, by
advertising revenue, or by payment — will publish disproportionately favourable
coverage of the company capturing it.

That is a real, testable claim. It is also one that a naive implementation gets
wrong in a way that produces confident nonsense, so the method matters more than the
classifier.

**Why raw sentiment fails.** "Reliance posts record quarterly profit" scores
positive on every sentiment model in existence. It is also just the news. A company
having a good year generates favourable coverage everywhere, and a company in crisis
generates hostile coverage everywhere. Absolute tone measures *the company's year*,
not the outlet's independence.

**The measurement that works is a double difference.** For outlet *O* and company *C*:

```
signal(O,C) =  [ tone(O,C)      − tone(O, peer companies) ]      ← O's house style removed
             − [ tone(all,C)    − tone(all, peer companies) ]    ← C's newsworthiness removed
```

The first bracket controls for outlets that are simply upbeat about everything. The
second controls for companies that are genuinely doing well. What survives is the
part that is specific to *this outlet writing about this company* — which is the only
part capable of indicating anything.

**What each control kills, and it should kill a lot:**

| Naive claim | What the control does to it |
|---|---|
| "Outlet O is positive about C" | Dies if O is positive about all 50 large caps — that is a house style |
| "Coverage of C is favourable" | Dies if every outlet is favourable — C had a good year |
| "O ran 12 positive pieces on C" | Dies without O's total volume and its rate for peer companies |
| "O turned positive after the ad deal" | Needs a shuffled control on dates; two continuous streams produce apparent turns |

**Required alongside every tone figure:** the article count, the peer baseline, the
period, the classifier used and its measured accuracy on a hand-labelled Indian
financial-news sample. A sentiment model validated on English product reviews is not
validated on Indian business journalism, and shipping one as if it were would be the
same error as the fabricated sparklines.

### 8b.2 Journalists — what is publishable and what is not

**The ask:** track journalists across the top 50 NSE/BSE companies and find
commonalities.

**The legitimate version:** byline data is public, and mapping which desks and
reporters cover which sectors is ordinary media research. Aggregate patterns — this
outlet's business desk is four people covering 200 companies; coverage of company C
is concentrated in one byline while peers are spread across six — are real,
checkable, and interesting.

**The version this platform will not build:** a graph implying a named journalist is
compromised. Three reasons, and they are not squeamishness:

1. **Beat reporting is the job.** A reporter on the energy desk covering Reliance
   constantly is doing exactly what they are employed to do. Frequency is the single
   worst possible indicator here — it measures the beat, not the relationship.
2. **The base rate destroys the naive version.** Before "journalist J writes
   favourably about C" means anything, you need J's tone toward comparable companies,
   J's total output, and the desk's distribution. Almost every apparent pattern
   dissolves at that step — and the platform already has the arithmetic to show it,
   the same way `/interlocks` shows that 7 surname coincidences is *fewer* than the
   ~19 chance predicts across 3,795 pairs.
3. **The refusal is already written.** No allegation about an individual without a
   public record meeting the evidence tiers. A byline is a public role; an
   insinuation about someone's integrity is not licensed by it. Where a documented
   conflict exists — a disclosed payment, an undisclosed shareholding, a
   documented editorial-interference finding — that is `documented` tier and
   publishable **with the person's response attached**. Absent that, the analysis
   stays at desk and outlet level.

**Concretely, per company:** byline concentration (how many distinct reporters, how
concentrated), desk distribution, and the peer comparison. Named-journalist tone
scores are computed for the aggregate and **not rendered per person** unless a
documented conflict exists.

### 8b.3 Commonalities across the top 50

The genuinely interesting sweep, and the one worth doing first because it is
answerable with public data:

- **Which outlets cover which of the top 50, and which they never cover.** A
  large-cap with near-zero coverage in a major outlet is as informative as saturation.
- **Ownership overlap** between covering outlets and covered companies — documented,
  no ideology required.
- **Shared bylines across unrelated companies** — a reporter appearing on both is
  usually a wire pickup or a syndication artefact, and the analysis must identify
  those before treating any overlap as meaningful.
- **Syndication and wire detection.** A large share of Indian business "coverage" is
  PTI/ANI copy republished under multiple mastheads. Counting the same wire story
  across 15 outlets as 15 independent positive articles would inflate every number on
  this page. **Deduplicating wire copy is a prerequisite, not a refinement.**

## 9. UI/UX system

**Density.** These are documents, not dashboards. Prose carries the reasoning;
charts carry the magnitudes; tables carry the detail. Every graphic has a table twin.

**Progressive disclosure.** Summary → detail → provenance. The provenance layer is
always reachable in one click and never the default view.

**Performance.** The bundle is ~1.2 MB and will not survive per-entity records.
Required, in order: route-level code splitting; per-entity records as lazy imports
or fetched JSON; virtualised long tables; the graph capped with an explicit
"showing N of M" rather than silent truncation.

**Mobile.** Sidebar collapses (done). Graphs need pinch-zoom and pan (E007, E008,
open). Tables scroll within their own container — the page body must never scroll
horizontally.

**Accessibility.** Table twin for every graphic; keyboard reachable nodes and states;
`prefers-reduced-motion` honoured; contrast ≥ 4.5:1 text and ≥ 3:1 graphics in both
themes. Tier is encoded by **line style as well as colour**, so it survives
colourblindness and print.

**Loading.** Per-entity fetches need skeletons — C018 was marked "not applicable"
when nothing loaded asynchronously. The interim scaling step in §1 reopens it.

---

## 10. What must not be built

Restating the platform's refusals for this phase specifically, because tender and
donation data is exactly where they get tested:

- **No "influence score."** A composite number with a decimal point, built from
  contracts and donations, is unfalsifiable by construction. Refused (J007).
- **No edge from co-location.** Same state, same sector, same ministry's remit — none
  of these is a relationship.
- **No name-matched people.** DIN or no edge. The `/interlocks` page exists to show
  what this rule prevents: 7 minister-to-office-holder edges a naive matcher would
  draw, against ~19 expected by chance across 3,795 pairs.
- **No award-to-donation edge without a shuffled control.** Timing proximity between
  two continuous streams is guaranteed. Without a control that holds donation volume
  fixed, it is arithmetic, not evidence.
- **No trade routes without a trade dataset.** Ownership and operation links only.
- **No aggregate that hides its denominator.** This is the one that will be under
  most pressure, because denominator-free numbers are more shareable.

---

## 11. Phasing

Ordered by what unblocks the most, not by what demos best.

### Phase F1 — the data layer *(prerequisite for everything else)*
- `npm run generate`: promotion emits typed per-entity records (**O007**)
- The `EntityRecord` shape above, with `asOf` on every volatile scalar
- Route-level code splitting, before the bundle becomes the constraint
- **Done when:** one company page renders entirely from a generated record

### Phase F2 — company pages and facility maps
- The ten-section company page (§4)
- Facility dataset + `/company/:id/map`
- Geocoding (**F005**) — removes the "not geocoded" caveat platform-wide
- **Done when:** a reader can answer "what is this company, where, whose, and on what evidence" without leaving the page

### Phase F3 — tenders
- Ingest `tenders-centre.json` + `tenders-states.json` from the research sweeps
- `/tenders`, `/tenders/map`, `/tenders/graph`
- Base rate: what share of large listed companies hold any government contract
- Null model over the award graph before any structure is highlighted
- **Done when:** every concentration claim on the page renders its denominator inline

### Phase F4 — groups and overlays
- `/conglomerates/:id` with the peer comparison column
- `/foreign-capital`
- PM CARES as a badge with its denominator
- **Done when:** the Adani and Reliance pages answer the cross-connection question *with peers alongside*

### Phase F5 — the analytical close
- Full award population 2019-24 (**G008**) — unblocks the motif engine
- ECI bond file, purchaser → party (**G001**, **G002**)
- Coal India / mining-PSU CSR destinations (**G009**)
- Re-run every motif; report which survive a null model on a graph large enough to test them
- **Done when:** the motif engine stops reporting `degenerate-null`

---

*The through-line: the platform's value is not that it draws connections. Anything
can draw connections. Its value is that it can tell you which connections are
surprising — and it can only do that if it knows what is ordinary.*
