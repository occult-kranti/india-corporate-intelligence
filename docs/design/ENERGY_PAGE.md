# /energy — design spec (synthesised)

*Status: **the spec to build from.** Written 2026-09-25 by the judging step. It supersedes
the three drafts in `docs/design/drafts/` (`energy-graphic-first.md`,
`energy-question-first.md`, `energy-solo.md`). Those stay as the record of what was
weighed. Every `{brace}` below is a value derived at module scope. No figure is written
into the page by hand.*

*Data contracts: the fleet contract (`scratchpad/energy/SPEC.md`: entities, claims with
`benefit`, voids, narratives, baseRates, symmetryCheck, gaps), **as assembled** by
`scripts/assemble-fleet.mjs` into `src/graph/energy.generated.ts` (types in
`src/graph/fleet.ts`), and the index file `research/raw/indices.json` that
`scripts/validate.mjs` §4 checks.*

---

## 0. Judge's note

### 0.1 Scores

| criterion | graphic-first | question-first | solo |
|---|---|---|---|
| Honesty: captions, denominators, no-data ≠ zero, denials as loud as claims | **5** | **5** | 3 |
| Encoding: one meaning per channel, tier dash kept, nothing decorative | 4 | **5** | 4 |
| Reader efficiency: brief's questions answered in under two minutes | **4** | **4** | **4** |
| Buildability with existing components | 3 | **4** | **4** |
| Mobile | **4** | **4** | 3 |
| Fit with the brief: the graph is the focus, and it connects to Nifty 50 / Sensex | **5** | 3 | 3 |
| **Total (of 30)** | **25** | **25** | 21 |

The two designer drafts tie on the total. Graphic-first is the spine because it wins on
the brief. The graph is the page. A reader can enter from a listed stock at the top of
the stage. The margin keeps the voids beside the picture, where a reader sees them
before scrolling. Question-first supplies the parts where its discipline was stricter:

- no fourth mark on nodes;
- tables where graphic-first had grids;
- a separation histogram beside every path;
- a "cannot show" block the type system requires;
- a full tenure-lanes section;
- the most-removing-filter empty state.

The solo draft lost on honesty. It ranked the benefit ledger by amount by default, and
its allegations appear only inside a clicked card. No contested panel lists them.

### 0.2 Facts about the repository that no draft accounted for

1. **The data does not come from `import.meta.glob` over `research/raw/energy/`.** All
   three drafts load the raw files. That breaks the quarantine boundary: `research/raw/`
   is written by agents and trusted by nothing. `npm run generate` now assembles the
   fleet (reconcile → audit → gate on the four invariants) into
   `src/graph/energy.generated.ts`. The page imports **only** that module. It exports
   `ENERGY_NODES`, `ENERGY_EDGES`, `ENERGY_BENEFITS`, `ENERGY_VOIDS`,
   `ENERGY_NARRATIVES`, `ENERGY_BASE_RATES`, `ENERGY_SYMMETRY`, `ENERGY_GAPS`,
   `ENERGY_IDENTITY` and `ENERGY_META`. `ENERGY_META` carries `files[]` with per-file
   `asOf`, `killed[]` with `killedReason`, `excluded[]` with `excludedReason`, and the
   audit verdicts. The module ships empty today (`ENERGY_META.empty === true`), so the
   empty state is the state that ships first.
2. **The research "domains" are sweeps, not sectors.** The fleet writes 12 files. Seven
   are sector sweeps: `coal`, `mines`, `oilgas`, `hydro`, `solarwind`, `nuclear`,
   `grid`. Five are cross-cutting sweeps: `money` (bonds and trusts into energy),
   `people` (promoters and families), `enforce` (regulators, courts, proceedings,
   voids), `states` (union portfolios, state CMs and energy ministers) and `literature`
   (documents and narratives). An electoral bond from a coal miner is recorded in
   `money`, not `coal`. A chip named "Coal" therefore does **not** select coal. The strip
   is labelled "Research sweep" and captioned to say so (§5.3).
3. **`GEdge` carries no `domain`.** Only `BenefitRow` does. The `dom` filter needs claim →
   sweep. Add one export to the generator: `ENERGY_EDGE_DOMAIN: Record<string, string>`
   (claim id → the file `domain`, contras from the audit included). This is a reviewed
   change to `assemble-fleet.mjs`, and `validate` re-checks it.
4. **`benefit.who` may be a plain name, not a node id** (`fleet.ts`: "A node id where the
   beneficiary is in the graph, otherwise a plain name"). Every place that shows a
   beneficiary must handle both.
5. **Contras that answer a claim arrive as edges with `t: "claim:<id>"`.** Neither
   `filterGraph` nor `denialIndex` can join them today. `filterGraph` drops them
   (endpoint not a node), and `denialIndex` looks up a node named `claim:<id>` and finds
   nothing. The page partitions them into `ANSWERS` and passes them in explicitly.
6. **The `/energy` route, the nav item ("Energy power map", `Zap`) and a scaffold
   `src/pages/Energy.tsx` already exist.** `scripts/smoke.mjs` already visits
   `/energy`. `App.tsx` and `Layout.tsx` need no change.
7. **The time scrubber lives in the graph's filter rail, and there is no node hover
   card.** Graphic-first assumed a scrubber under the canvas with lanes sharing its x
   scale. That is a restructure, and this spec does not do it (§0.3, C5).
8. **Sector strings in `companies.ts` are `Energy`, `Utilities` and `Metals & Mining`.**
   There is no "Oil & Gas". `ENERGY_SECTORS` is those three strings.

### 0.3 Conflicts resolved

| # | Conflict | Decision | Why |
|---|---|---|---|
| C1 | Index cap glyph on nodes (graphic-first, solo) vs none (question-first) | **No cap.** Membership shows in words in the node hover card, in the NodeCard and CompanyTrail, and in the constituent table, and the `idx` filter acts on it | Three indices would need three 7×3px cells above a `sz` 1 node. That is illegible, it does not survive greyscale or a screenshot, and it competes with shape. The brief's link to the market is carried by an entry point (the company box) and a filter (`idx`), both of which are in the URL |
| C2 | Index dock grids (graphic-first, solo) vs constituent table (question-first) | **`ConstituentTable`**, one row per distinct constituent across all index keys, with a per-index count line above it | A 72×40 cell stacking fill, a corner square, a hatch and an underline is four encodings in one mark. Three grids repeat about 40 companies. The table is also its own twin |
| C3 | `ConcentrationCurve` beside the ledger (graphic-first, solo) vs no amount axis (question-first) | **No curve, no axis, no bar** in the benefit ledger | A concentration curve accumulates shares, and that is a sum. `amountCr` mixes contract values, tariffs, outlays and market-cap moves. Summing them is the one thing §0.2 of every draft forbids |
| C4 | Benefit ledger default sort: amount (solo) vs name (both designers) | **`name`**. `amount` is one click away | A default sort by money is a leaderboard of named, real entities that the reader did not ask for |
| C5 | Scrubber moved under the canvas, with coverage ribbon and tenure lane in `timelineExtra` (graphic-first) vs a separate lanes section (question-first) | **The scrubber stays in the rail as it is.** `TenureLanes` is its own section under the stage. Per-sweep date coverage goes on the sweep chips | Keeps `GraphExplorer`'s layout intact for its four other callers. Lanes need width, and 15rem of rail cannot give it |
| C6 | Where the node/claim/path/company detail renders: right margin (graphic-first) vs below the canvas (question-first) | **One `renderAside` prop.** The CSS grid places the aside as a third column at ≥1280px and below the canvas otherwise | The same component serves both. The margin at rest carries the voids, which is graphic-first's best idea |
| C7 | Company subject: `sel` (graphic-first) vs a separate `stock` param (question-first) | **`sel`.** CompanyTrail replaces the NodeCard body when `sel` is a company or `grp:` node | One selection model. A second param would let `sel` and `stock` disagree |
| C8 | Company trail: decisions and money as two separate lists (graphic-first) vs one chronological money table that includes `award` (question-first) | **Two lists, deliberately not on one timeline.** `award` is a decision, not money the company sent | Putting payments and decisions on one timeline invites the quid-pro-quo reading, which this register cannot test (HANDOFF priority 1 has not been run) |
| C9 | A hop count per office in the trail (question-first) | **Dropped** | A contact in the trail is 1 hop, or 2 via the group, by construction. Printing that as a separation number invites reading distance as closeness |
| C10 | Median as a number (graphic-first, solo) vs a separation histogram (question-first) | **Both.** The PathCard prints the median, and a `Distribution` of path lengths from the path's first end is drawn **full width under the canvas** while `path` is set | At a margin width of 352px, `Distribution`'s 720-unit viewBox shrinks its labels to half size |
| C11 | Mirror window: same filters, previous coalition's equal window (question-first) | **Rejected for v1** | Counts across windows measure research coverage first. The register is built mostly from recent records. It also needs a hand-written `CENTRAL_COALITIONS` constant that no contract supplies. Two counts under two PM names invite the party verdict §12 refuses. The per-sweep `symmetryCheck` text, above all `states`, is the symmetry control |
| C12 | `QuestionSection` with a required `cannotShow` (question-first) vs free-form sections | **Adopted as `EvidenceSection`** for every section below the stage. The stage's own limits are in its in-frame status line and its caption | The limit cannot be left out when the type system requires it |
| C13 | `QuestionIndex` of nine one-liners under the standfirst (question-first) | **Rejected** | It pushes the canvas below the fold at 1280×800. The strip and the margin answer "what and how much" without it |
| C14 | "asked, no reply" / "not asked" counts (question-first) | **Not counted.** The contra `d` is printed verbatim | The contract has no field for it. Counting it would be keyword-matching free text |
| C15 | Table twin: a 400-row cap (graphic-first) vs pagination (question-first) | **Paginated by 400, page in the URL (`tp`)** | A cap that tells the reader to narrow the filters is truncation |
| C16 | Coalition hairlines on the lanes (question-first) | **Only from data**: drawn when `role` claims into a head-of-government office exist in the fleet. No hand constant | Never hand-write a dataset |

---

## 1. Page purpose

`/energy` is an explorable map of who holds public power over India's energy and
natural-resource economy, and who the recorded decisions went to. It covers coal, mines
and critical minerals, oil and gas, hydro and dams, solar, wind and storage, nuclear,
and transmission and discoms. It connects ministers and state office-holders with dated
tenures, ministries, regulators, courts, PSUs, private groups and promoters. Every edge
is one sourced claim with its evidence tier: an award, a PPA, a bond, a trust routing, a
CSR payment, a shareholding, an office, a rule, a proceeding or a denial. The graph is
the page. The reader explores it by hovering, clicking and focusing. For whatever they
touch, a margin answers *who benefits, by what mechanism, for how much, who held the
office on the date, and what the party concerned said*. At rest, the same margin says
what the record does not contain. A reader can enter from the stock market: a Nifty 50,
Sensex or Sensex 50 constituent opens the company in the graph with the public decisions
that touched it and the money it sent, in two lists kept apart. The page computes no
score, adds up no benefit, and delivers no verdict. It links to `/resources` (located
blocks on a map), `/tenders`, `/allocation`, `/pmcares` and `/conglomerates/:id` rather
than redrawing them.

## 2. The reader's questions, in order

| # | Question | Answered by | Scroll |
|---|---|---|---|
| 1 | What am I looking at, how much of it, as of when? | Header byline, sticky `DenominatorStrip`, in-frame status line | none |
| 2 | What is missing from it? | Margin at rest: documented voids | none (≥1280) |
| 3 | Which research sweeps does it cover, and over what years? | `SweepStrip` chips with counts and dated span | none |
| 4 | I hold a Nifty 50 / Sensex energy stock. What does it touch? | "Start from a listed company" box → `sel` → `CompanyTrail` in the aside | none |
| 5 | What is this line? | Edge hover → `EdgeCard` with tier, date, ₹, beneficiary, response count | none |
| 6 | Who benefited from this claim, and what did they say? | Edge click → `claim=` → `ClaimCard`, with the response at equal size | none |
| 7 | Who held the office on that date? | The ClaimCard date test, then the `TenureLanes` section | one |
| 8 | What is attached to this entity? | Node click → `sel` → `NodeCard`, focus 1–3 hops | none |
| 9 | How far apart are these two, and is that unusual? | Shift-click → `path=` → `PathCard` + separation histogram | none |
| 10 | Across all claims, who is named as gaining? | `BenefitLedger` (rows light edges in the graph) | one |
| 11 | How much of each index does this touch, and is that expected? | `ConstituentTable` + sector 2×2 | two |
| 12 | Which allegations are answered, and which stories circulate? | Contested: `ContestedFact` list, `NarrativeCard` list | three |
| 13 | Would this lens alarm us anywhere? | `BaseRateTable`, `SymmetryPanel` | four |
| 14 | What could not be verified, and what was killed? | `GapsPanel`, killed and held-out tables, `SourceLedger` | five |

Two-minute test: questions 1–6 need no scroll on a 1280×800 desktop. Question 4 is one
typed symbol. Questions 7, 10 and 11 are one scroll each.

---

## 3. Route, data and URL state

### 3.1 Route

The route already exists: `/energy` → `src/pages/Energy.tsx` (replace the scaffold), nav
"Energy power map", icon `Zap`. `App.tsx` already lazy-loads it
(`const Energy = lazy(() => import('./pages/Energy'))`), so it is code-split.

### 3.2 Data (static, no fetch)

- **`src/data/energy.ts`** imports only from `src/graph/energy.generated.ts` and
  `src/graph/build.ts`. It exports the derived sets below and every selector. All of
  them are module-scope constants or pure functions of the parsed URL state, memoised
  with `useMemo`. No literal figure appears in `Energy.tsx`. Every sort breaks ties on
  `id` with code-unit comparison (`a < b ? -1 : a > b ? 1 : 0`), as the generator does.
  - `NODES`: `ENERGY_NODES`, plus hydration of every edge endpoint that is not in it,
    from `buildNationalGraph().nodes` ∪ `graph/data.ts NODES`.
  - `ORPHANS`: edges with an endpoint that hydrates nowhere. Not drawn, counted, listed.
  - `ANSWERS: Map<claimId, GEdge[]>`: edges with `pred === 'contra'` and `t` starting
    `claim:`, keyed by the id after the prefix. Not drawn as edges.
  - `SUPERSEDED`: edges with `supersededBy` set. Not drawn. Listed in the twin with
    `sup=1` and in ClaimCard "Supersedes".
  - `DRAWABLE`: everything else. Node↔node contras are included and keep the existing
    rose style.
  - `SWEEP_OF(claimId)`: from `ENERGY_EDGE_DOMAIN` (§0.2.3). Until that export lands,
    use the id prefix before the first `:` when it equals a `ENERGY_META.files[].domain`.
    Otherwise use `unassigned`, and push the derived gap "claim sweep not recorded for
    {n} claims".
  - `BENEFIT_OF(claimId)`: from `ENERGY_BENEFITS`. `whoIsNode = NODES.has(who)`.
  - `ASOF`: `{ oldest, newest }` over `ENERGY_META.files[].asOf`. **Never
    `ENERGY_META.asOf` alone**, because that is the newest.
  - `SWEEPS`: declared in `src/data/energy.ts`, in this order, with display labels:
    - `SECTOR_SWEEPS = [coal "Coal", mines "Mines & minerals", oilgas "Oil & gas", hydro "Hydro & dams", solarwind "Solar, wind & storage", nuclear "Nuclear", grid "Grid & discoms"]`
    - `LENS_SWEEPS = [money "Money trail", people "Promoters & families", enforce "Regulators & courts", states "State layer", literature "Documents & narratives"]`

    These are the file names the fleet was dispatched to write. A slug in
    `ENERGY_META.files` that is not in either list is appended to the lens row, and a
    gap is pushed.
  - `ENERGY_SECTORS = ['Energy', 'Utilities', 'Metals & Mining']`. These are the
    `companies.ts` strings, and the rule is printed wherever it is used.
- **`src/data/indices.ts`**:
  `import.meta.glob('../../research/raw/indices.json', { eager: true, import: 'default' })`
  (absent-safe, and validated by `validate.mjs` §4, with the same precedent as
  `conglomerates.ts` importing raw JSON). It exports:
  - `INDEX_KEYS`: the keys of `indices` in file order. Labels are the keys exactly as
    written in the file. **Do not hard-code "Nifty 50".**
  - `INDEX_ASOF` and `INDEX_SOURCES`.
  - `membershipOf(nodeId): string[]`.
  - `constituentRows()`: one row per distinct `existingId`, plus one per null-id
    constituent keyed by its name. The symbol is `companies.ts nse` via `existingId`
    (the ids are `co:<id>`). If there is none, use `bse`. If there is none, use the
    constituent's own `symbol` field if present. Otherwise use the name.
  - `viaGroupOf(coId)`: the `grp:` node ids with an `own` edge into `coId` in
    `DRAWABLE`. **Id joins only. Never the `group` string in `companies.ts`.**

### 3.3 URL parameters

All use `useSearchParams` with `replace: true`. **Every default is unset, which means
unfiltered, whole graph, nothing selected.** No default names a person, party, company,
index or sweep.

| param | owner | values | default | control |
|---|---|---|---|---|
| `dom` | page | comma list of sweep slugs | all | `SweepStrip` chips |
| `q` | GraphExplorer | text over label, `sub`, `al` | — | rail search |
| `tier` | GraphExplorer | `documented,reported,alleged,analytic` | all | rail checkboxes |
| `fam` | GraphExplorer | family ids | all present | rail checkboxes |
| `pred` | GraphExplorer | predicates | all | rail checkboxes |
| `ty` | GraphExplorer | shape classes | all | shape legend (also the filter) |
| `min` | GraphExplorer | ₹ crore | 0 | rail slider |
| `from`, `to` | GraphExplorer | ISO dates | — | rail scrubber and date inputs (existing) |
| `sel` | GraphExplorer | node id | — | node click, company box, table rows |
| `focus`, `hops` | GraphExplorer | node id; 1–3 | —; 1 | focus buttons (existing) |
| `path` | GraphExplorer | `a,b` | — | shift-click, NodeCard "path to…" |
| `claim` | GraphExplorer (**new**) | claim id | — | edge click, ledger row, contested row, lane tick |
| `idx` | page, rendered in the rail | an `INDEX_KEYS` key | — | rail radio |
| `via` | page | `group` | — | rail checkbox under `idx`, CompanyTrail toggle |
| `table` | GraphExplorer (**moved from `useState`**) | `1` | — | "Show table" |
| `tp` | GraphExplorer (**new**) | page number ≥ 2 | 1 | table twin pager |
| `sup` | page | `1` | — | twin checkbox "include superseded" |
| `isec` | page | `energy` | — | constituent table toggle "energy sectors only" |
| `ixf` | page | an index key | — | constituent table membership filter |
| `bsort` | page | `name` · `amount` · `count` | `name` | ledger sort |
| `nar` | page | narrative statuses | all | narrative chips |

- **Precedence of the lit set in the canvas:** `path` > `claim` > ledger-row hover >
  `focus` > node hover. Only one lit set shows at a time. The in-frame status line says
  which.
- **Reset** clears only `ownKeys` = `q tier fam pred ty min from to sel focus hops path
  claim idx via table tp`. It does not clear `dom isec ixf bsort nar sup`. Today reset
  wipes every param, and the new `ownKeys` prop fixes that for this page only.
- **Stale links.** An unknown id in `sel`, `focus`, `path` or `claim` is ignored. One
  amber line appears above the canvas: "The linked item `{id}` is not in this version of
  the register (as of {ASOF.oldest}). It may have been renamed, superseded or withdrawn —
  the table with superseded rows on lists what changed." A claim id found in
  `ENERGY_META.killed` gets instead: "Claim `{id}` was killed in audit: {killedReason}.
  It is listed under Killed in audit." The rest of the URL still applies.
- **Unknown values inside a list** (for example `tier=documented,bogus`) are dropped.
  The rail shows the canonical set that applied.

---

## 4. Page anatomy

Desktop ≥ 1280px. The stage breaks out of the house `max-w-[1180px]` to
`max-w-[1560px] mx-auto`. Every section below the stage returns to `max-w-[1180px]`.
Prose stays at 72ch.

```
┌ Kicker · PageTitle · Standfirst (2 lines) · Byline ─────────────────────── ≤ 150px ┐
├ DenominatorStrip (sticky, existing) ───────────────────────────────────────────────┤
├ SweepStrip  Sector: [Coal 64 · 2009–26] [Mines 31 · …] … [Nuclear — not yet]      ┤
│             Lens:   [Money trail 52] [Promoters 40] [Regulators & courts 38] …      │
│ Start from a listed company: [ symbol or name… ]                412 → 64 claims     │
├───────────┬────────────────────────────────────────────┬───────────────────────────┤
│ RAIL 15rem│ status/caption row (existing)              │ ASIDE 22rem (sticky)      │
│ search    │ CANVAS  GraphExplorer → ForceGraph         │ rest: How to read (5 ln)  │
│ tier      │ height clamp(560px, 100vh − 15rem, 820px)  │       What the record     │
│ family    │   in-frame status (bottom-left)            │       does not show       │
│ relation  │   camera controls (bottom-right)           │ node:  NodeCard           │
│ ₹ min     │                                            │ co/grp: CompanyTrail      │
│ time      ├────────────────────────────────────────────┤ claim: ClaimCard          │
│ index     │ shape legend = type filter (existing)      │ path:  PathCard           │
│ table·copy│ graph caption (§8)                         │                           │
│ reset     │ separation histogram (only while path set) │                           │
├───────────┴────────────────────────────────────────────┴───────────────────────────┤
│ Table twin (table=1)                                                                │
├ Who held the office on the date — TenureLanes                                       ┤
├ Who is recorded as benefiting — BenefitLedger                                       ┤
├ From the benchmark — ConstituentTable · sector 2×2                                  ┤
├ Contested — allegations beside their responses · narratives by status               ┤
├ Would the same lens alarm us elsewhere — BaseRateTable · SymmetryPanel              ┤
├ What is missing — GapsPanel · Killed in audit · Held out · Orphans                  ┤
└ Sources (SourceLedger) · TierLegend · Footnote (standing) · links out               ┘
```

The canvas top must sit above the fold at 1280×800: header ≤ 150px, strip ≈ 36px, sweep
strip and company box ≈ 96px. That leaves at least 500px of canvas visible.

---

## 5. Section by section

### 5.0 `EvidenceSection` (new, `src/components/energy/EvidenceSection.tsx`)

Every section below the stage uses it (adopted from question-first, C12).

```ts
export function EvidenceSection(p: {
  id: string;                    // anchor, e.g. 'offices'
  title: string;                 // rendered through the existing Section title styles
  denominator: ReactNode;        // REQUIRED: one mono line, the frame's own "n of N"
  cannotShow: ReactNode;         // REQUIRED: what the graphic cannot honestly show
  ask?: { params: Record<string, string | null>; label: string; effect: { from: number; to: number } };
  children: ReactNode;
}): JSX.Element;
```

The render order is fixed:

1. `Section` title.
2. The `denominator` in the `note` slot (`font-mono text-[11px]`).
3. `children`.
4. **"What this cannot show"**: `border-l-2 border-amber/50 pl-3`, a 10px mono uppercase
   label, and a `text-[14px] text-text-secondary` body. This is the size of findings. It
   is never collapsed, including on mobile.
5. An optional **"Show in the graph"** button (`btn-ghost`). Its label reads
   `{label} — {from} → {to} claims`. The click merges `params` (graph keys only; `null`
   deletes) and scrolls to `#stage`. The scroll uses `behavior: 'auto'` under
   `prefers-reduced-motion` and `'smooth'` otherwise. **It never writes a param the rail
   cannot display.**

### 5.1 Header (existing `Editorial`)

- `Kicker`: `Energy & natural resources · the power map`
- `PageTitle`: **Who decides over energy, and who is recorded as gaining**
- `Standfirst` (≤ 140 characters, two lines): "Every line is one sourced claim with its
  evidence tier. Click one and the margin shows who it benefits, who held the office,
  and what they said in reply."
- `Byline`: `{files} research sweeps · {entities} entities · {claims} claims · run {ENERGY_META.runId} · as of {ASOF.oldest}{ – {ASOF.newest} when different}`.

### 5.2 `DenominatorStrip` (existing, sticky)

`asOf` = `ASOF.oldest`, with ` – {newest}` appended when they differ.
`filtered = { from: DRAWABLE.length, to: visible claims }`. Facts, in this order:

| # | n | of | label | shown on mobile |
|---|---|---|---|---|
| 1 | visible claims (drawn, excluding contras) | drawable claims | `claims` | yes |
| 2 | visible entities | all entities | `entities` | no |
| 3 | alleged visible claims with ≥ 1 response (in `ANSWERS` or a node-pair contra) | alleged visible claims | `allegations answered` | yes |
| 4 | visible claims with a benefit row | visible claims | `name a beneficiary` | no |
| 5 | sweeps with a file | `SECTOR_SWEEPS.length + LENS_SWEEPS.length` | `sweeps researched` | yes |
| 6 | voids (respecting `dom`) | — | `documented voids` | no |
| 7 | per index key: constituents whose `existingId` is an endpoint of ≥ 1 visible claim | constituents in that key | `{key} touched` | no (omitted without `indices.json`) |
| 8 | undated visible claims | visible claims | `undated — shown in any window` | no (only while `from`/`to` set) |
| 9 | orphans | drawable + orphans | `not drawn — endpoint not in platform` | no (only when > 0) |

The `filtered` chip is never hidden.

### 5.3 `SweepStrip` (new, `src/components/energy/SweepStrip.tsx`)

```ts
export function SweepStrip(p: {
  rows: { heading: 'Sector sweeps' | 'Cross-cutting sweeps'; chips: SweepChip[] }[];
  active: Set<string>;           // from `dom`; empty = all
  onToggle(slug: string): void;
  effect: { from: number; to: number };
}): JSX.Element;
export interface SweepChip {
  slug: string; label: string;
  claims: number | null;         // null = no file for this sweep in this build
  tiers: Record<Tier, number>;
  voids: number;
  span: [number, number] | null; // first and last year of a dated claim; null = none dated
  asOf: string | null;
}
```

- The strip has two labelled rows, "Sector sweeps" and "Cross-cutting sweeps". Each chip
  is a `<button aria-pressed>`.
- **Chip content:** label, then the claim count in mono. Then four 14px line samples,
  each drawn in its tier's `TIERS[t].dash` with the count beside it (`—— 22 ‐‐ 18 ·· 9
  ─·─ 3`; zero tiers are omitted). Then `◌ {voids} voids` when > 0. Then the dated span
  `2009–26`, or `no dated claims` in muted text.
- **Absent sweep** (declared, no file): the chip is disabled and gets the no-data hatch,
  the same pattern `IndiaMap` uses. It reads `Nuclear — not yet researched`. It is
  never shown as `0`.
- The live effect `{from} → {to} claims` is right-aligned on the first row.
- A one-line caption sits under the rows, always visible, at 12px: "A chip selects the
  research sweep a claim was recorded in, not its sector. A coal company's electoral
  bond is recorded under Money trail."
- Chips do **not** colour anything in the canvas. A sweep has no channel inside the
  graph.

**Start from a listed company** (in `SweepStrip`'s footer row, left):

- It is a combobox over `constituentRows()`, searching by symbol, BSE code and name.
  Each option shows `SYMBOL · name · {memberships in words}`.
- On Enter or click it writes `sel={existingId}`, `focus={existingId}` and `hops=1`,
  and scrolls `#stage` into view. The aside switches to `CompanyTrail`.
- A constituent with `existingId === null` is listed as `name — not in platform dataset`
  and selecting it opens the aside in the "not in dataset" state (§9).
- A constituent whose id is not an endpoint of any drawable claim still opens its
  CompanyTrail (empty state). The graph does not change, because `focus` on a node with
  no edges is hidden by `filterGraph`. The existing focus caption says so.
- It is disabled with the inline text "index lists not loaded in this build" when
  `indices.json` is absent.

### 5.4 The stage: `GraphExplorer`, extended (id `stage`)

```tsx
<GraphExplorer
  nodes={visibleNodes}             // NODES after dom / idx / via (page-level filters)
  edges={visibleDrawable}          // DRAWABLE after dom / idx / via
  height={stageHeight}             // clamp(560px, 100vh − 15rem, 820px) ≥1024; 560 at 640–1023; min(440px, 65vh) <640
  urlClaim                         // NEW: edge click writes `claim`; table → `table`, pager → `tp`
  answers={ANSWERS}                // NEW: explicit claim-id joins, merged first into denialIndex
  highlight={ledgerHover}          // NEW: { nodes: Set<string>; edges: Set<string>; caption: string } | null
  renderAside={(ctx) => <EnergyAside ctx={ctx} />}  // NEW: replaces the built-in detail panel
  edgeExtra={(e) => <BenefitLine e={e} />}          // NEW: extra rows at the end of EdgeCard
  nodeHover={(n) => <NodeHoverCard n={n} />}        // NEW: passed to ForceGraph
  railExtra={<IndexRailControl />} // NEW: bottom of the rail, above the buttons
  statusExtra={energyStatusLines}  // NEW: extra lines in ForceGraph's in-frame status
  belowCanvas={pathHistogram}      // NEW: rendered under the shape legend
  ownKeys={OWN_KEYS}               // NEW: what reset may clear
/>
```

All the new props are optional. The four existing callers (`Atlas`, `Allocation`,
`Cabinet`, `Conglomerates`) keep their current behaviour.

```ts
type AsideCtx =
  | { kind: 'rest' }
  | { kind: 'node'; id: string; edges: GEdge[] }                               // sel
  | { kind: 'claim'; edge: GEdge; answeredBy: GEdge[] }                        // claim (wins over sel)
  | { kind: 'path'; seq: string[]; count: number; hops: number;
      median: { hops: number; seeds: number } | null;
      status: 'found' | 'none' | 'hidden'; missing?: string[] };               // path (wins over all)
```

**Layout with `renderAside`.** The root grid becomes
`lg:grid-cols-[15rem_1fr] xl:grid-cols-[15rem_1fr_22rem]`. The aside is `xl:sticky
xl:top-12 xl:self-start xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto`. Below `xl` it
flows under the canvas, where today's detail panel sits. The aside scrolls instead of
truncating. Remove the existing "…and {n} more, shown in the table view" cut from any
path this page uses.

**Rail sticky offset:** `lg:top-12`, so the rail clears the strip.

**Canvas behaviour (existing, kept):**

- Ego focus hides everything outside the neighbourhood and keeps a denial whose far end
  lies outside it, counted in the caption.
- The path dims everything off the path.
- The amber warning at more than 220 entities stays.
- Maximise (`f`) uses `ExpandShell`. **The aside comes with it**: `ExpandShell` gains an
  optional `aside?: ReactNode`, rendered as a 22rem right column at ≥1024px and as a
  40vh bottom sheet below that. A maximised graph without its margin would be a
  screenshot with the epistemics stripped.

**Node hover card** (`nodeHover`, new in ForceGraph). It is positioned at the node's
screen position, offset so it never covers the node. It is also shown on keyboard focus.
It holds:

- label and `sub`;
- type and family in words;
- index membership in words, for example "Nifty 50 · Sensex 30 · not Sensex 50 — lists
  as of {INDEX_ASOF}", or "not an index constituent", or "not in platform company
  dataset";
- sector, and "registered office: {state} — not the location of any plant, block or
  line";
- `{n} claims:` followed by four `TierChip`s with counts;
- `{k} responses recorded` in rose when k > 0;
- `click: details · shift-click: path end`.

**Edge hover and focus.** This is the existing `EdgeCard`, with `edgeExtra` appended:

- **BenefitLine:**
  - `Benefits: {who} — {how}`, then `₹{amountCr} cr` + ` ({confidence})`, or
    `amount unknown`.
  - If `who` is not a node: `{who}` in plain text + "(named by the claim; not a node in
    this graph)".
  - If `who` is a node that is not an endpoint: "(named by the claim; not joined by any
    edge)".
  - With no benefit row: "no beneficiary recorded".
- **Responses:** `{n} responses` in rose, or `no response recorded` in muted text. An
  `alleged` edge with none adds " — the build gate forbids this; listed in Gaps".
- The footer reads `click to open the claim`.

Hover stays transient. **Click writes `claim`** (a new `onEdgeClick` on ForceGraph;
today click and hover share `onEdgeActive`).

**Claim context** (`claim` set). The lit set is:

- nodes: `s`, `t`, `benefit.who` if it is a node, every responder in
  `ANSWERS.get(id)` and node-pair contras, and every office-holder from the date test;
- edges: the claim, the rose connectors, and the `role` edges that pass the date test.

Everything else takes the existing dim opacity (0.1 edges / 0.16 nodes). A beneficiary
node that is not an endpoint is lit **without a line**, with an on-canvas 10px text tag
beside it: `named beneficiary of "{lab}"`. **No edge is invented.**

**Ledger highlight.** Hovering or focusing a BenefitLedger group or row sets
`highlight` to its claims and their endpoints while the stage is in the viewport
(IntersectionObserver). Otherwise nothing happens.

**In-frame status** (ForceGraph `status`, bottom-left). It survives maximise and
screenshots. The lines, in order:

1. `{visible} of {drawable} claims · {entities} entities · as of {ASOF.oldest}`
2. `line style = evidence tier` followed by four real SVG dash samples labelled
   `documented reported alleged analytic`, then `· rose = a response`
3. when `claim` is set: `lit: claim {id} · {n} responses · office-holders on {from}`
   (or `undated`)
4. when `path` is set: the existing path caption, which always carries `one of {count}`
   and the median
5. when `from`/`to` is set: `{u} undated claims shown regardless of the window`
6. the existing focus caption and camera help line

**Separation histogram** (`belowCanvas`, only while `path` is set; C10):

- The existing `Distribution`, full width under the shape legend. It takes
  `series=[{ name: 'entities by hops from {a}', bins }]`, `xLabel="hops from {label(a)}"`,
  `highlight={pathHops}` and `maxBin={8}`.
- `bins` come from `pathLengthProfile(viewEdges, a)` (existing `nullModel`), excluding
  `a` itself.
- The caption: "{unreachable} entities in this view cannot be reached from {a} and are
  not binned. Short paths between large Indian entities are the norm in any researched
  graph."

### 5.5 `EnergyAside` (new, `src/components/energy/EnergyAside.tsx`)

**Rest**, when nothing is selected:

1. **How to read this graph**, five lines at 13px:
   - "Each line is one claim with a source, or an allegation or analysis marked as such."
   - "Line style is the evidence tier. Rose is a response from the party concerned."
   - "Colour is the kind of actor. Shape is the type of entity. Size was declared by a
     researcher, not computed."
   - "Public power is pulled to the left and private capital to the right. Beyond that,
     position means nothing."
   - "An edge between two entities is not an accusation. A beneficiary is not an
     allegation."
2. **What the record does not show** (`VoidList`). Every `ENERGY_VOIDS` entry for the
   active `dom`, grouped by sweep in strip order. Each entry shows `what` at 15px
   `text-text` (the size of a claim statement), `whyItMatters` at 14px, and `Cite`. The
   heading note reads `{n} documented voids — absences that were looked for`. With zero
   voids in scope: "No void was recorded for {sweeps}. That means none was written down,
   not that none exists."
3. The caption (§8, "Voids").

**Node** (`sel`), rendered as `NodeCard`:

- The label as the editorial heading, and `sub`.
- The identity lines from `ENERGY_IDENTITY[id]` that are present (office with dates,
  CIN, DIN, NSE). DOB is **never** shown.
- `publicRole`.
- The `resolved: false` warning (existing style).
- Every `d` fact, with its trailing `[tier]` marker rendered as a `TierChip`, and the
  full `Cite`.
- Index membership in words.
- Actions: `focus 1 · 2 · 3 hops` · `path to…`, a combobox of the visible entities that
  writes `path=sel,x`. This is the touch and keyboard equivalent of shift-click.
- **Claims touching it:** every one, grouped by predicate in `PRED_LABEL` order. Each
  row shows a `TierChip`, the other party, `lab`, the date, ₹ and a rose response
  count. Clicking a row writes `claim`. There is no "show more".
- If `ty` is ministry, agency or psu, **Who held this office**: the `role` edges into
  it, each with the person, `from`–`to` (or "in office as of {asOf}") and a `TierChip`.
  The link reads "see the lanes →".
- **Voids** for the node's sweeps, as their `what` lines.
- Links out, only when the id matches:
  - `/company/:id` if the id is in `companies.ts`;
  - `/conglomerates/:id` if it is in `conglomerates.ts`;
  - `/resources?q={label}` for a company that won a coal or mineral award in the fleet,
    as plain search text;
  - `/pmcares` if a `pmin`/`pmout` edge touches the PM CARES node id.

**Listed company or group** (`sel` is `co:` in `companies.ts`, or `grp:`), rendered as
`CompanyTrail`. It replaces "Claims touching it" (C7, C8):

- **Header:** name · NSE / BSE (mono) · sector · memberships in words, `as of
  {INDEX_ASOF}`.
- **Group line:** "Held by {group} — claim {id}, {TierChip}", for each `grp:` node with
  an `own` edge into it. The toggle "include the group's claims" writes `via=group`.
  Default off.
- **A · Public decisions touching it:** claims where the other endpoint has `fam` state
  or enforce and `pred ∈ {award, law, enforce, pmout, role}`. They are grouped by
  institution, **alphabetically by institution label**, and dated within each group.
  Row: date · predicate · `lab` · `TierChip` · ₹ · rose response count. Rows reached
  through the group are prefixed `via {group}`.
- **B · Money it sent:** claims with `s` = the company (or the group, with `via`) and
  `pred ∈ {bond, trust, direct, csr, pmin}`, sorted by date. Row: date · recipient ·
  predicate · ₹ · `TierChip`.
- **C · Allegations:** every `alleged` claim touching it, with its response count.
- **D · Voids** whose text or sources name this id.
- The caption under A and B (§8, "Company trail") is always shown.
- **Empty A and B:** "No claim in this register touches {name}. This register researched
  energy and resources, so absence here is not clearance." Then a link to `/company/:id`.

**Claim** (`claim`), rendered as `ClaimCard`:

- **Top line:** predicate label · `TierChip` · `from – to` or "undated" · sweep label ·
  file `asOf`.
- `s → t` as clickable labels that write `sel`.
- `d` at 15px, then the full `Cite`.
- `₹{a} cr` with "the amount recorded on the claim; its kind is stated in the text
  above", or "no amount recorded".
- **Two equal columns** (stacked below 640px, claim first). They use the same font
  size, weight and width:
  - **left, "Who gained":**
    - `who` (a link if it is a node; plain text + "not a node in this graph"
      otherwise), `how`, then `₹{amountCr} cr` or `≈ ₹{amountCr} cr (estimate)` or
      `amount unknown`.
    - `confidence` as a word. It is not coloured.
    - With no benefit row: "No beneficiary recorded for this claim."
  - **right, "The response"** (2px rose left rule): each responder label, the contra
    `d`, `TierChip` and `Cite`. With none: "No response recorded." in muted text. For
    `alleged`: "No response recorded. Under this platform's rules this claim should not
    have shipped." in amber, and a gap is pushed.
- **Date test.** For each `role` edge into the institution side (`s`, or `t` if `s` is
  a person) whose `[from, to ?? ASOF.oldest]` contains `claim.from`: "On {from},
  {institution} was held by {person} ({from}–{to}) [TierChip]."
  - With no covering role: "No dated office claim covers {from}. The date test cannot
    be run from this record."
  - Undated: "Undated — the date test cannot be run."
  - For `law`: the issuer is a `fam: state` node with an edge into the law node, or the
    text "issuer not recorded".
- `innocentReading`, `upgradeIf`, `killIf`, each labelled and in full.
- **Supersession:** "Supersedes {id} (retained, not drawn)" and "Superseded by {id}", as
  links that write `claim`.
- **Base rates recorded by the {sweep} sweep:** that sweep's `ENERGY_BASE_RATES` rows as
  `{numerator} of {denominator} — {label}`. The heading reads "from the same research
  sweep, not matched to this claim".

**Path** (`path`), rendered as `PathCard`:

- One row per hop: entity → `PRED_LABEL` + `TierChip` for **every** parallel edge on
  that hop → entity.
- `{hops} hops · one of {count} equally short paths`. When `count > 1`: "The chain shown
  was picked by edge order. Its particular intermediaries mean nothing."
- `median separation in this view: {m} hops (from {seeds} evenly spaced entities)`, at
  the same size, directly under the hop count and never alone.
- The existing direction-ignored caption, and "distribution drawn under the graph".
- `none`: "No path exists between these two in the current view." `hidden`: "{label}
  is outside the current filters."

### 5.6 `IndexRailControl` (new, in `railExtra`)

- A radio group `none | {INDEX_KEYS…}`, then the checkbox "include via group". They
  write `idx` and `via`.
- The live effect sits under the control: `{from} → {to} claims`, where "keeps claims
  with an endpoint that is a constituent's `existingId`; via group also keeps claims
  touching a `grp:` node with an `own` edge to one".
- The honesty note on the control reads "membership as of {INDEX_ASOF}, not as of each
  claim's date".
- The control is disabled with "index lists not loaded in this build" when the file is
  absent.

### 5.7 Table twin (existing, extended)

- The "Show table" button stays in the rail and writes `table=1`. The twin renders
  **full width under the stage** (not inside the canvas column), with id `twin`.
- It reads exactly the drawn set, including focus and path, as it does today.
- **Columns:** claim id · sweep · s → pred → t (labels) · tier · ₹ · from – to ·
  beneficiary · how · benefit ₹ · confidence · responses (count + responder labels) ·
  superseded by · sources (**all** of them).
- Clicking a row writes `claim`.
- `sup=1` adds `SUPERSEDED` rows, marked `superseded by {id}`. `ORPHANS` rows always
  come last, marked `endpoint {id} not in platform — not drawn`.
- **Pagination** by 400 rows, with the page in `tp`. The footer reads
  `rows {a}–{b} of {n} · ← previous · next →`.
- The caption states the row count and the filters in force in words.

### 5.8 Who held the office on the date: `TenureLanes` (new, id `offices`)

`EvidenceSection`:

- **denominator:** `{lanes} institutions with a recorded office-holder · {placed} of {dated} dated decisions fall inside a recorded tenure · {gap} fall between tenures · {undated} undated, not placed`
- **ask:** `pred=role,award,law` with the label "Show offices and their decisions".

```ts
export interface Lane { id: string; label: string; fam: NodeFamily;
  spans: { personId: string; label: string; party: string | null; from: string; to: string | null; tier: Tier; claimId: string }[] }
export interface LaneEvent { claimId: string; laneId: string; date: string; tier: Tier; label: string }
export default function TenureLanes(p: {
  lanes: Lane[]; events: LaneEvent[]; range: [string, string]; asOf: string;
  govChanges: { label: string; date: string; claimId: string }[];   // from data only (C16); [] when none
  selectedClaim?: string | null;
  onSelectClaim(id: string): void; onSelectNode(id: string): void;
}): JSX.Element;
```

- **Lanes:** institution nodes (`ty` ministry, agency or psu) that are the `t` of ≥ 1
  `role` edge. They are ordered by `fam` (state, then enforce), then by label. Union and
  state institutions both appear when the `states` sweep records them.
- **Tenure bars:** one per `role` edge, from `from` to `to ?? ASOF.oldest`. The outline
  dash is the role claim's tier. The label is the person. `(Party)` is added only when a
  `role` edge person → party overlaps the tenure. **No party colour.** An open tenure
  ends square with `in office as of {asOf}`.
- **Decision ticks** at `from` for edges whose `s` is the lane institution and whose
  `pred ∈ {award, law, enforce, pmout, csr}`. Each tick is 10px with the claim's tier
  dash. The tick for `claim` is 18px in `text-text`. A `law` tick goes on its issuer's
  lane. With no issuer, the rule is listed under the lanes as "rules with no recorded
  issuer: …".
- **Government changes:** hairline verticals with text only, **only** from `role` edges
  into a head-of-government office node present in the fleet.
- One shared year axis, from the earliest dated claim to `ASOF.oldest`, clipped to
  `from`/`to` when set. While `claim` is set, a 1px vertical rule marks `claim.from`
  across all lanes.
- Clicking a bar writes `sel=person`. Clicking a tick writes `claim`. Bars and ticks are
  focusable, with a visible focus ring, and Enter activates them.
- Under the lanes: "**{k} institutions appear in claims with no recorded
  office-holder**: {labels}".
- **Twin:** a `DataTable` under the lanes with the columns institution, office-holder,
  from, to, role tier, and decisions dated inside (count + ids).
- **cannotShow:** §8 "Tenure lanes".

### 5.9 Who is recorded as benefiting: `BenefitLedger` (new, id `benefit`)

`EvidenceSection`:

- **denominator:** `{b} of {C} visible claims name a beneficiary · {bd} documented amount · {be} estimated · {bu} unknown · {who} distinct beneficiaries ({wn} not nodes in this graph)`
- **ask:** `pred=award` with the label "Show awards in the graph".

```ts
export function BenefitLedger(p: {
  groups: BenefitGroup[]; sort: 'name' | 'amount' | 'count'; onSort(s): void;
  onSelectNode(id: string): void; onSelectClaim(id: string): void;
  onHover(h: { nodes: Set<string>; edges: Set<string>; caption: string } | null): void;
}): JSX.Element;
export interface BenefitGroup { who: string; isNode: boolean; label: string; membership: string | null;
  rows: (BenefitRow & { responses: number; beneficiaryIsEndpoint: boolean })[];
  largestDocumented: BenefitRow | null; tiers: Record<Tier, number> }
```

- It is a **table, with no chart, no axis and no bar** (C3). There is one group per
  distinct `who` among the visible claims.
- **Group header:**
  - the label (a link writing `sel` if it is a node; plain text + "not a node in this
    graph" if not), `sub`, and membership in words;
  - `{n} claims` with four `TierChip`s and counts;
  - the largest *documented* single amount as `₹{x} cr — {lab}` (a link writing
    `claim`), or "no documented amount".
- **Claim rows**, all of them:
  - date · `lab` + `TierChip` · `benefit.how`;
  - the amount cell: `₹{amountCr} cr`, `≈ ₹{amountCr} cr (estimate)`, or `amount
    unknown` in muted text. **It is never ₹0 and never blank.** The confidence is shown
    as a word;
  - the response count, the source, and "not a party to this edge" when the beneficiary
    is not an endpoint.
- **Sort** (`bsort`): `name` (default, C4) · `amount` (largest documented, nulls last) ·
  `count`. Ties always break on label, then `who`.
- **No totals** in any row, footer, tooltip or twin.
- A `Callout tone="bottomline"` labelled **"A beneficiary is not an allegation"**: "An
  award has a winner by construction. A tariff order has a party whose tariff changed.
  Naming who gained is arithmetic. Whether the gain was intended, improper or ordinary is
  a separate claim, which appears in the graph as `alleged` with its response beside it,
  or not at all."
- **cannotShow:** §8 "Benefit ledger".

### 5.10 From the benchmark: `ConstituentTable` (new, id `benchmark`)

`EvidenceSection`:

- **denominator:** per index key, on its own line: `{key}: {direct} of {size} with ≥ 1 direct claim · {via} via group only · {none} none · {nd} not in platform dataset`. It ends with `lists as of {INDEX_ASOF} · {source label}`.
- **ask:** `idx={first key}` with the label "Show only claims touching {first key}
  constituents".

```ts
export function ConstituentTable(p: {
  rows: ConstituentRow[]; indexKeys: string[]; asOf: string;
  onOpen(id: string): void;     // writes sel + focus + hops=1, scrolls to #stage
}): JSX.Element;
export interface ConstituentRow { id: string | null; symbol: string; name: string; sector: string | null;
  member: Record<string, boolean>; direct: Record<Tier, number>; via: { group: string; n: number }[] }
```

- **Columns:**
  - Symbol (mono);
  - Company, with the sector under it in muted text, or "sector unknown";
  - one narrow column per index key, with `●` for a member and `—` for not. These are
    text glyphs, not colour;
  - Direct claims: four `TierChip` + count, zero tiers omitted, and `0` printed when
    there are none;
  - Via group: `{n} via {group}`, or `—`;
  - a button "open in graph".
- **Every constituent is a row, including the zeros.** The zeros are the base rate. A
  null-id row gets the no-data hatch in its claims cells, with "not in platform dataset
  — cannot be joined".
- **Order:** alphabetical by symbol. Never by claim count.
- **Filters above the table:**
  - "energy sectors only" (`isec=energy`, rule printed as "Energy, Utilities, Metals &
    Mining in companies.ts");
  - membership (`ixf`).

  Each shows `{rows} → {n} companies` beside it.
- **Sector 2×2** (`DataTable`, one per index key, stacked):
  - rows: in `ENERGY_SECTORS` / other sector / sector unknown;
  - columns: ≥ 1 direct claim / none, with totals.
  - Heading: "The expected result: an energy register touches energy companies. Read
    the 'other sector' row first."
- **cannotShow:** §8 "Benchmark".

### 5.11 Contested (id `contested`)

**Allegations beside their responses.** `EvidenceSection`:

- **denominator:** `{answered} of {alleged} alleged claims carry a recorded response · {other} responses to documented or reported claims`
- **ask:** `tier=alleged` with the label "Show allegations and their responses".
- There is one existing `ContestedFact` for every visible claim that has ≥ 1 response,
  and one for every alleged claim. They are grouped by sweep in strip order, then by
  date.
  - `question` = `lab · {date or "undated"} · {tier label}`.
  - `positions[0]`: `who` = "The claim — {s label}", `claim` = `d`, `srcs`.
  - `positions[1]`: `who` = "The response — {responder label}", `claim` = the contra
    `d`. When there are several responses, each is its own paragraph with its
    `TierChip`.
  - With none, the same size: `who` = "No response recorded", `claim` = "The build gate
    requires one for an alleged claim; its absence is listed in Gaps."
  - `unresolved` = "Would settle it: {upgradeIf} / {killIf}".
- The block follows `dom`, `tier` and `from`/`to`. It does not follow `pred`, because
  responses are `contra`. Each block has "open in graph", which writes `claim`.
- **cannotShow:** §8 "Contested".

**Narratives, and how each stands.** `EvidenceSection`:

- **denominator:** `{n} narratives · established {a} · well-supported {b} · contested {c} · speculative {d} · unsupported {e} · debunked {f}`, in ladder order with zeros printed.
- There are status chips (`nar`) with counts. Each `NarrativeCard` shows:
  - the `claim` at 16px and its sweep;
  - a **six-cell ordinal ladder**: the filled cell is this narrative's step and the
    others are outlines. `established` and `debunked` label the ends, and the status is
    also written in words;
  - two equal columns in `ContestedFact` markup, "Strongest case" and "Strongest
    counter";
  - the footer "What would change this: {whatWouldChangeThis}" in body size,
    `text-text`;
  - `Cite`.
- Order: ladder, then sweep, then text. **No colour by status. `debunked` is not
  rose.**
- **cannotShow:** §8 "Narratives".

### 5.12 Would the same lens alarm us elsewhere? (id `baserates`)

`EvidenceSection`:

- **denominator:** `{br} base rates across {s} sweeps · symmetry check recorded for {k} of {S} sweeps`
- **`BaseRateTable`** (new):
  - columns: property · `{numerator} of {denominator}` (mono) · rate · a bar on **one
    shared 0–100% scale** · what the denominator is (`label`) · sweep · sources;
  - a null or 0 denominator gives "not a rate (denominator {0 | not recorded})" and no
    bar;
  - order: sweep, then property.
- **`SymmetryPanel`** (new):
  - one `Callout tone="note"` per sweep with a file, labelled "Symmetry check — {sweep}",
    with the `ENERGY_SYMMETRY` text verbatim. The `states` sweep comes first, because it
    is the opposition-governed control;
  - a sweep with a file but no text gets `Callout tone="warn"` labelled "No symmetry
    check — {sweep}": "The contract makes this mandatory. Its absence is a defect in that
    sweep, and its claims should be read with that in mind." A gap is pushed;
  - a sweep with no file gets a hatched block "Not yet researched".
- **cannotShow:** §8 "Base rates".

### 5.13 What is missing (id `missing`)

`EvidenceSection`:

- **denominator:** `{g} gaps ({gf} recorded by research, {gd} found by the build) · {k} killed in audit · {x} held out · {o} orphans · {sup} superseded · {abs} sweeps not yet researched`

Its contents, in order:

1. **`GapsPanel`** (existing, at finding size).
   - Each `ENERGY_GAPS` entry is rendered as `{ what: text, why: "Recorded by the
     {sweep} sweep" }`, **untruncated** (do not copy `Resources`' 200-character split).
   - The derived gaps are added:
     - absent sweeps;
     - orphans;
     - claims with no sweep;
     - sweeps missing a symmetry check;
     - alleged claims with no response;
     - `indices.json` absent;
     - `existingId` nulls ("{name} ({key}) is not in the company dataset");
     - "no share-price series or index weights in the platform";
     - "the award × donor population with a date-shuffled control has not been run
       (HANDOFF priority 1)".
   - The `note` reads "Absence here is a result. A company with no claim in this
     register may simply not have been researched."
2. **Killed in audit**: `DataTable` over `ENERGY_META.killed` with the columns id,
   s → t, pred, tier as written, `d`, `killedReason`, sources. It is shown even when
   empty, with "No claim was killed. Either the audit found nothing or it has not run —
   `ENERGY_META.audit` is {null → 'absent: no audit has run' | 'present, {n} verdicts'}."
3. **Held out**: `DataTable` over `ENERGY_META.excluded`, with `excludedReason`
   (unresolved endpoint, duplicate). Shown even when empty.
4. **Orphans**: `DataTable` with the columns claim id, s, t, pred, and "endpoint `{id}`
   not in platform".
5. **Superseded**: `DataTable` with the columns old `lab`, tier, date, superseded by (a
   link writing `claim`) and both `d`s. When empty: "No claim in this build has been
   superseded."

- **cannotShow:** §8 "Missing".

### 5.14 Foot

- **`SourceLedger`** (existing). Its entries are the union of every node `srcs` and edge
  `srcs`, deduped by URL:
  - `primary` = the URL matches
    `/gov\.in|nic\.in|sci\.gov\.in|sebi\.gov\.in|cag\.gov\.in|cercind|bseindia|nseindia|indiacode|sansad|eci\.gov\.in/i`;
  - `retrieved` = the file `asOf` of the first claim citing it;
  - `establishes` = "Cited by {n} claims: {ids}".
  - The note reads `{N} sources · {P} primary`.
- `TierLegend`.
- `Footnote`: the HANDOFF "Standing" paragraph, plus "Nothing on this page asserts that
  any named person committed an offence."
- **Links out**, on one line: "Located assets such as coal and mineral blocks are mapped
  on /resources · tenders on /tenders · allocation registers on /allocation · PM CARES
  on /pmcares · group deep-dives on /conglomerates · motif significance on /motifs."

---

## 6. Visual encodings: what each channel means

**Frozen.** The developer may not restyle any of these to make the page fit.

| mark | channel | means exactly | never means |
|---|---|---|---|
| edge, tick, tenure bar, chip sample | `strokeDasharray` from `TIERS` | tier: documented solid · reported `6 3` · alleged `2 4` · analytic `8 3 2 3` | anything else |
| node | hue (`FAMILY_COLOR`) | family: public power · private capital · recipients · instruments · regulators & courts · markets | sweep, party, sector, index, "suspicious" |
| node | shape (`shapeClassOf(ty)`) | entity type class | — |
| node | size (`sz`) | the researcher's declared band 1–4, first record wins | degree, centrality, benefit |
| edge, rule, response column | rose `#c45b5a` | a response or counter-evidence (`contra`) | bad, suspicious, loss |

**Platform-consistent. Not frozen, but not to be repurposed:**

| mark | channel | means |
|---|---|---|
| edge | width `0.7 + min(2.4, √a / 26)` | the ₹ on the claim, of mixed kinds. It saturates near ₹3,900 cr, and the minimum width means no amount recorded. Captioned |
| node | x bias (`forceX` by family) | public power pulled left, private capital right. Captioned, because it is a positional echo of hue |
| node | dashed outline, 0.25 fill | identity not confirmed |
| node | gold ring | pinned or selected by the reader |
| any | opacity 0.1 / 0.16 | outside the current lit set (path / claim / ledger hover / focus) — never "superseded" or "low confidence" |

**New on this page:**

| mark | channel | means |
|---|---|---|
| edge midpoint | rose perpendicular tick, 8px, `strokeWidth 1.5`, dash = the response's tier | this claim has a recorded response (`ANSWERS`) |
| rose connector | responder → the answered edge's midpoint, response's dash; drawn only while that claim is lit or the responder is focused, and only when the responder is not an endpoint | who answered. At rest the tick alone carries it, to avoid a rose web |
| canvas text tag | `named beneficiary of "{lab}"` beside a lit, unconnected beneficiary | the claim names it; no edge joins it |
| tenure lane | vertical hairline + text | a change of head of government, from a role claim |
| decision tick | height 10 / 18 | normal / the selected claim — never amount |
| constituent table | `●` / `—` | member / not, as of the list date — never weight |
| cells, chips | no-data hatch (the `IndiaMap` pattern) | no data: not in dataset, or not yet researched — never zero |
| narrative ladder | position of the filled cell | step on the six-step status ladder |
| base-rate bar | length on a shared 0–100% scale | numerator ÷ denominator |

**The response-visibility rule:** a response is visible whenever the claim it answers is
visible. The `tier` and `pred` filters never hide the answer to a visible claim.

**Known collision, flagged and not fixed here:** the `enforce` family hue is the same hex
as contra rose. Family is a node fill and contra is an edge stroke, so they never share
an element. The platform-wide fix is owed elsewhere. Changing it locally would break
cross-page hue consistency.

---

## 7. Filters and their effect on the denominator

| control | where | writes | live effect beside it | honesty note on the control |
|---|---|---|---|---|
| sweep chips | above the stage | `dom` | `{from} → {to} claims` | "a sweep is where a claim was recorded, not its sector"; absent sweeps hatched |
| company box | above the stage | `sel focus hops` | none (focus, not a filter) | "constituents only; {k} not in platform dataset" |
| search | rail | `q` | existing `{n} of {m} relationships shown` | — |
| tier | rail | `tier` | per-tier counts (existing) | "responses to visible claims are never hidden" |
| family | rail | `fam` | as above | — |
| relationship | rail | `pred` | as above | "responses follow their claim" |
| entity type | shape legend | `ty` | per-type counts (existing) | — |
| ₹ minimum | rail | `min` | while `min > 0`: "{n} claims have no amount and are hidden" | — |
| time | rail (existing scrubber) | `from`, `to` | existing undated count line | "undated claims are never hidden by the window" |
| index | rail (`railExtra`) | `idx`, `via` | `{from} → {to} claims` | "membership as of {date}, not as of each claim's date" |
| energy sectors only | benchmark | `isec` | `{rows} → {n} companies` | the sector rule, printed |
| membership | benchmark | `ixf` | same | — |
| ledger sort | ledger | `bsort` | — | "amount = largest documented single figure; nothing is summed" |
| narrative status | contested | `nar` | `{n} → {k} narratives` | — |
| include superseded | twin | `sup` | `{rows} → {rows + sup} rows` | — |

**Filters the data cannot honour are not offered:**

- No mechanism filter over `benefit.how`, which is free text. Add one only if the
  contract gains the `cui-bono` §2 enum, with a `null` bucket on the control.
- No state filter, because `st` is the registered office.
- No party filter on the graph.

---

## 8. Captions the page must carry

These are verbatim, with the braces interpolated. Each sits beside the graphic it
qualifies.

- **Stage, under the shape legend, always visible:** "An edge is a sourced claim, not a
  measure of influence. Public power is pulled left and private capital right;
  otherwise where a node sits is produced by the layout and means nothing. Size was
  declared by a researcher, not computed from connections. Edge width is the ₹ recorded
  on the claim, and that figure's kind varies — a contract value, a tariff, a bond, an
  outlay — so widths compare only within one kind of claim. A thin edge may have no
  amount recorded. A dense cluster usually shows where research effort went. The dash
  is the evidence tier and survives greyscale; read it before the colour."
- **Stage, with a date window:** "{u} undated claims are shown regardless of the window,
  because an undated claim cannot be placed inside or outside it."
- **Stage, claim lit:** "Lit: the claim, the responses to it, its beneficiary, and
  whoever held office at {institution} on {from}. Holding office on the date is what the
  date test requires; it is not evidence that the office-holder made or influenced the
  decision." When it applies, add: "The claim names {who} as beneficiary. No edge in the
  record joins them to it, and none is drawn."
- **Stage, sweep strip:** "A chip selects the research sweep a claim was recorded in, not
  its sector. A coal company's electoral bond is recorded under Money trail."
- **Aside, under the voids:** "Voids have no line in the graph because an absence has no
  endpoints. They are listed here, beside it, because a graph that can only draw what
  exists overstates the case."
- **Path:** the existing direction-ignored caption, plus "A path this short is
  {at or below | above} the median for this view."
- **Company trail:** "These two lists are kept apart on purpose. Putting a company's
  payments and the decisions that touched it on one timeline invites a reading — that
  one bought the other — which this register cannot test. Testing it needs every award
  set against every donor with a date-shuffled control, and that has not been run (see
  Gaps). Decisions are listed where the company or its group is a party to the claim;
  sharing a state or a sector is never a connection."
- **Tenure lanes (cannotShow):** "Tenures are drawn only where a dated role claim exists.
  A gap in a lane is a gap in the record, not a vacancy in the office. Being in office
  when a decision was dated does not show that the office-holder made it, signed it, or
  knew of it. {When states is absent: 'State governments — which sign most discom PPAs
  and grant most mining leases — are not in this build.' | when present: 'State offices
  appear only where the state-layer sweep recorded a dated role.'}"
- **Benefit ledger (cannotShow):** "Amounts are not added up, and there is no chart here
  for the same reason. Two claims can describe the same money, and a contract value, a
  tariff saving, an outlay and a market-cap move are different quantities. 'Estimated'
  is the researcher's estimate as recorded; 'unknown' is unknown, not zero. What the
  beneficiary would have got under the previous rule is not in the record, so no benefit
  here is net of it."
- **Benchmark (cannotShow):** "Membership is as of {INDEX_ASOF} from {source}. It says
  nothing about membership on the date of any claim, and nothing about index weight. A
  constituent with no claim was not necessarily examined: banks and IT firms are absent
  because this register did not research them, not because they were cleared. 'Via
  group' means a group that owns the company appears; the company itself does not."
- **Contested (cannotShow):** "A response is recorded as given. Its presence does not
  make the claim false, and its absence does not make it true."
- **Narratives (cannotShow):** "Status is the research sweep's calibration on the evidence
  it found as of {asOf}, not the verdict of any court, regulator or auditor."
- **Base rates (cannotShow):** "A property shared by most comparables is a fact about the
  category, not about any one member. A base rate is only as good as its denominator's
  definition, which is printed beside it. A symmetry check is the sweep's own account of
  running the same lens on a control; this page has not re-run it."
- **Missing (cannotShow):** "This lists only what was looked for. What nobody thought to
  look for leaves no trace here."
- **Separation histogram:** "{unreachable} entities in this view cannot be reached from
  {a} and are not binned. Short paths between large Indian entities are the norm in any
  researched graph."

---

## 9. Loading, empty, partial and no-data states

| state | render |
|---|---|
| **Loading** | The route chunk uses the existing `Suspense` fallback. The data is compiled in and the layout runs a fixed tick count, so there is no data spinner. Under `prefers-reduced-motion` there is no settle animation. |
| **Fleet empty** (`ENERGY_META.empty`, **the state that ships first**) | The header byline reads `0 research sweeps · as of —`. The strip reads `0 claims · 0 of 12 sweeps researched · as of —`. The `SweepStrip` has every chip hatched. A `Callout tone="warn"`: "The energy register has not been promoted in this build. Nothing below is zero — it is absent." The stage frame is drawn at canvas height, with that sentence centred and no rail or aside. The company box, lanes, ledger, benchmark, contested and base rates are **not rendered**. `#missing` renders (the gaps list the absent sweeps) and so does `SourceLedger` (`0 sources`). **`npm run smoke` must pass in this state.** |
| **Filters leave 0 claims** | The canvas shows "0 of {M} claims match.", the active filters in words, the **single active filter that removed the most claims** (computed by leaving each one out in turn) with a button that clears only it, and "reset graph filters". The aside keeps its rest state, so the voids stay visible. Sections below render their own empty lines. |
| **Some sweeps absent** | Hatched chips. A one-line note above the canvas: "{k} of {K} planned sweeps are researched: {list}. The graph covers only these." Every `EvidenceSection` denominator ends `· {k} of {K} sweeps`. |
| **Dated span partial** | The chip span shows per sweep. The lanes axis is the dated span only, with the caption "nothing before {min} is drawn because nothing was recorded, not because nothing happened". |
| **File dates differ** | Strip and byline show `oldest – newest`. Each ClaimCard shows its own file `asOf`. |
| **No `indices.json`** | The company box and `idx` are disabled with "index lists not loaded in this build". The hover card omits membership. `#benchmark` is replaced by `Callout tone="note"`: "Index membership lists are not loaded in this build; the route from a Nifty 50 / Sensex stock into this graph cannot be drawn. This is absent, not empty." A gap is pushed. Strip fact 7 is omitted. |
| **Constituent `existingId` null** | A hatched row in the table. The company box opens the aside with "{name} is a {key} constituent the platform has no company record for, so nothing can be joined to it. Listed in Gaps." |
| **Company with no claims** | The CompanyTrail empty text. |
| **Claim without `a`** | Minimum edge width. "no amount recorded" in cards, `—` with `title="no amount recorded"` in tables. |
| **No benefit row** | "no beneficiary recorded". Counted in the ledger denominator. |
| **`amountCr` null or confidence `unknown`** | "amount unknown", never ₹0. |
| **`benefit.who` not a node** | Plain text + "not a node in this graph". No lighting, no tag. |
| **Alleged claim with no response** | This cannot pass the build gate. If it appears: an amber line in the ClaimCard, an equal-size empty response column in Contested, and a gap. |
| **Unresolved entity** | Drawn with the existing dashed outline and no edges (the assembler holds its claims out; they are listed under Held out). |
| **Orphans** | Not drawn. Strip fact 9, the twin's tail, and the `#missing` table. |
| **Unknown or killed id in URL** | The amber line (§3.3). |
| **Path none / hidden** | PathCard text. The histogram still renders for `a` with its unreachable count. |
| **No role edges** | `#offices`: "No dated office-holder is recorded in the researched sweeps. The date test cannot be run on any claim." The institutions-with-no-holder list still renders. |
| **Zero voids / narratives / base rates / symmetry texts** | Each section stays, with one sentence: "None recorded for {sweeps}." **No section is ever removed** because its data is empty, except in the fleet-empty state above. |

---

## 10. Mobile and narrow widths

| width | layout |
|---|---|
| ≥ 1280 | rail · canvas · aside (§4) |
| 1024–1279 | rail · canvas. The aside flows under the canvas at full width, in two columns (card left, voids right) |
| 640–1023 | The rail is a `<details>` above the canvas, **open by default**, with the summary `Filters · {active} active · {from} → {to} claims`. The canvas is full width at 560px. The aside is under the canvas |
| < 640 | The strip shows facts 1, 3, 5 and the `filtered` chip. The `SweepStrip` rows each scroll horizontally in their own `overflow-x-auto` container. The company box is full width. The rail is a `<details>`, **closed by default**. The canvas is `min(440px, 65vh)`. The in-frame status keeps lines 1, 2 and 5, and the camera help moves under the canvas. The aside is under the canvas, and selecting something scrolls it into view |

- **Touch.**
  - Tap a node to write `sel`. The node hover content goes at the top of the NodeCard,
    because there is no hover.
  - Tap an edge to write `claim`. The existing hit stroke is ≥ 6px, widened to 10px on
    `(pointer: coarse)`.
  - A path is set with "path to…" in the NodeCard, because shift-click has no touch
    equivalent.
  - Maximise opens `ExpandShell`, and below 1024 the aside becomes a 40vh bottom sheet
    inside it that scrolls internally.
- **ClaimCard columns** stack below 640px: claim first, response directly after, with
  the same width and type size.
- **`ConstituentTable`:** Symbol, Company, the index columns and Direct stay. "Via
  group" and the button collapse into a row-level "open" link. The table scrolls inside
  `DataTable`'s wrapper.
- **`TenureLanes`:** it gets its own `overflow-x-auto`, `min-width: 720px`, and the lane
  labels are `position: sticky; left: 0` on `bg-bg`.
- Every "What this cannot show" block stays full size.
- There is **no horizontal page scroll** at any width. Take screenshots at 390 and 1280
  wide.

---

## 11. Table twins

| graphic | twin | sync |
|---|---|---|
| Stage graph | the GraphExplorer table (`table=1`, `tp`), columns in §5.7 | the same `filterGraph` output as the canvas, plus `dom`/`idx`/`via`, focus and path. `sup` adds superseded rows, and orphans are appended |
| TenureLanes | `DataTable` under the lanes (§5.8) | the same filters and window |
| Separation histogram | a `DataTable` under it: hops · entities · share | the same `a` and view |
| Sweep chips | the chip counts are text; the twin is the strip itself | `dom` |
| BenefitLedger, ConstituentTable, sector 2×2, BaseRateTable, Contested, Narratives, Missing | these **are** tables or text | — |

Every twin carries a caption with its row count and the filters in force, in words.

---

## 12. Denominators shown, and where

- **Strip:** claims, entities, answered allegations, named beneficiaries, sweeps
  researched, voids, per-index touch, undated, orphans (§5.2).
- **SweepStrip:** claims per sweep, per-tier counts, voids per sweep, dated span, and the
  live `from → to`.
- **In-frame status:** `n of N` claims, entities, asOf, undated.
- **Rail:** per-tier and per-type counts, `{n} of {m} relationships`, the no-amount
  hidden count, the `idx` `from → to`.
- **PathCard + histogram:** `one of {count}`, the median with its seed count, the
  distribution, and the unreachable count.
- **Lanes:** `{placed} of {dated}` placed, plus the gap and undated counts.
- **Ledger:** `{b} of {C}` name a beneficiary, the confidence split, distinct
  beneficiaries, and non-node beneficiaries.
- **Benchmark:** per index `direct / via / none / not in dataset` of its size, and the
  sector 2×2.
- **Contested:** `{answered} of {alleged}`. Narratives: counts per ladder step.
- **Base rates:** `numerator of denominator` on every row, and `symmetry {k} of {S}`.
- **Missing:** gaps, killed, held out, orphans, superseded, absent sweeps.
- **Sources:** `N sources · P primary`.

---

## 13. What the page refuses to show, and why

- **No map and no GeoNetwork view.** `st` is the registered office: NTPC is registered
  in Delhi and Coal India in Kolkata. Located assets are mapped on `/resources`. *This
  can be reopened* if the contract adds a per-claim `site`, with "no site recorded"
  shown as a count.
- **No aligned timeline of a company's payments and the decisions touching it.** It is
  the most persuasive picture the page could draw and the one it can least support.
- **No index glyph on nodes** (C1), **no index weight or "% of Nifty exposed"** (free-float
  weights are not in the data, and summed market cap is not the index), **no share-price
  or index-level line against claim dates** (an event study needs daily closes, a market
  model and pre-registered windows). The last two are recorded as gaps.
- **No "ministry exposure" number**, and no count-based ranking of institutions or
  companies. The CompanyTrail lists claims alphabetically by institution. The
  constituent table is alphabetical.
- **No influence, centrality, degree or "most connected" score**, and no sizing or
  ordering by one. In a researched graph, degree measures research attention.
- **No community detection or cluster colouring.** An algorithmic cluster reads as a
  cabal (the hub and small-world traps).
- **No motif z-scores.** The award subgraph is star-shaped and the null model is
  degenerate (HANDOFF result 1). The page links to `/motifs`.
- **No benefit totals and no benefit chart** (C3), in any view, tooltip, card, twin or
  footer.
- **No mirror-window or party comparison** (C11). There is no party colour and no party
  aggregation. A party appears only as text on a tenure bar backed by a role claim.
- **No colour meaning suspicious.** Rose is only for responses.
- **No edge the record does not contain.** There is no beneficiary line, no co-location
  edge (same state or sector), no inferred ownership, and no group join by name.
- **No path as a finding.** A path always carries its count of equal paths, the median
  and the distribution.
- **No default selection.** Nothing is pre-focused and nothing is "featured". The
  ledger does not default to sorting by money.
- **No DOB and no private individual.** Identity keys are shown only when they are an
  office, a CIN, a DIN or an NSE code.
- **No decorative effects.** No glow, no particles on edges, no gradient fills, no drop
  shadows, no animated counters.

---

## 14. Build estimate

**Create**

| file | contents | est. lines |
|---|---|---|
| `src/data/energy.ts` | hydrate and partition the generated module (`NODES`, `DRAWABLE`, `ANSWERS`, `SUPERSEDED`, `ORPHANS`), `ASOF`, `SWEEPS`, `ENERGY_SECTORS`; selectors `visibleBySweep`, `sweepChips`, `benefitGroups`, `officeHoldersOn`, `companyTrail`, `tenureLanes`, `constituentRows`, `sectorTwoByTwo`, `ledgerEntries`, `derivedGaps`, `mostRemovingFilter` | 320 |
| `src/data/indices.ts` | glob `indices.json`, `INDEX_KEYS`, `membershipOf`, `constituentRows`, `viaGroupOf` | 80 |
| `src/components/energy/EvidenceSection.tsx` | §5.0 | 50 |
| `src/components/energy/SweepStrip.tsx` | chips + company combobox | 170 |
| `src/components/energy/EnergyAside.tsx` | `EnergyAside`, `ReadingKey`, `VoidList`, `NodeCard`, `CompanyTrail`, `ClaimCard`, `PathCard`, `BenefitLine`, `NodeHoverCard`, `IndexRailControl` | 560 |
| `src/components/energy/BenefitLedger.tsx` | §5.9 | 170 |
| `src/components/energy/ConstituentTable.tsx` | table + 2×2 | 150 |
| `src/components/energy/Calibration.tsx` | `NarrativeCard`, `BaseRateTable`, `SymmetryPanel`, contested mapping | 190 |
| `src/components/viz/TenureLanes.tsx` | §5.8 SVG + twin | 220 |

**Modify**

| file | change | est. lines |
|---|---|---|
| `src/pages/Energy.tsx` | replace the scaffold: composition, URL wiring, all states | 380 |
| `src/components/viz/GraphExplorer.tsx` | optional `urlClaim`, `answers`, `highlight`, `renderAside` (the 3-column grid at `xl`), `edgeExtra`, `nodeHover`, `railExtra`, `statusExtra`, `belowCanvas`, `ownKeys`; `table` and `tp` in the URL with pagination; `lg:top-12` rail when `renderAside` is set | 170 |
| `src/components/viz/ForceGraph.tsx` | `onEdgeClick` separate from hover; `highlight` lit set; rose midpoint ticks + conditional connectors from `answers`; unconnected-beneficiary text tag; `nodeHover` card at the node position and on focus; `denialIndex(edges, explicit?)` taking claim-id joins first | 150 |
| `src/components/viz/camera.tsx` | `ExpandShell` optional `aside` (right column ≥1024, bottom sheet below) | 25 |
| `scripts/assemble-fleet.mjs`, `src/graph/fleet.ts` | emit `ENERGY_EDGE_DOMAIN: Record<string, string>`; bump `GENERATOR_VERSION`; regenerate | 20 |
| `scripts/smoke.mjs` | add `/energy?claim=__missing__`, `/energy?dom=coal&idx={firstKey}&tier=alleged`, `/energy?path=__a__,__b__&table=1&tp=2` (ids read from the data at smoke time) | 10 |
| `docs/INDEX.md`, `HANDOFF.md` | one paragraph on the page, and a pointer to this spec | 10 |

`App.tsx` (already a lazy import) and `Layout.tsx` are already wired and need no change.
Total ≈ 2,850 lines.

**Gates:** `npx tsc -b`, `npm run build`, `npm run validate` (which re-runs the
assembler and fails on a stale generated module), and `npm run smoke`. Smoke must pass
in the **empty-fleet state as shipped today** and again after the first `npm run
generate` with research present, and it must pass with and without `indices.json`.

**Screenshots**, in greyscale, at 1280 and 390 wide. They must show that:

- the tier dashes, the rose tick and the tenure-bar dashes stay distinguishable;
- the in-frame status line is legible in the screenshot;
- the aside's voids are on the first screen at 1280×800;
- there is no horizontal page scroll.

**Build order** (each step shippable):

1. data modules + the empty state;
2. the stage with `answers`, `urlClaim` and `renderAside`;
3. ClaimCard and CompanyTrail;
4. ledger and benchmark;
5. lanes;
6. contested, base rates and missing.

---

## 15. Open risks for review

1. **The company trail is the page's most persuasive path and its least controlled
   one.** Lists A and B kept apart, the caption and the refusal are the mitigations. The
   real fix is the award × donor population with a date-shuffled control (HANDOFF
   priority 1). When that exists, list B should carry each recipient's base rate.
2. **The unfiltered rest state will be a hub-dominated texture.** Twelve sweeps reuse
   `min:ministry-of-power`, `co:ntpc`, `adani` and similar ids, so the >220-entity amber
   warning will fire at rest. The answer is the warning, the in-frame caption, the
   company box and the sweep chips as entry points. **It is not a pre-filtered
   default.**
3. **The `enforce` family hue equals contra rose.** Flagged in §6, and owed platform-wide.
