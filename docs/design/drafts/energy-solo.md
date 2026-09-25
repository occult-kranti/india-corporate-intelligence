# /energy — design spec

*Status: the spec to build from. Written 2026-09-25. Data contract:
`scratchpad/energy/SPEC.md` (the fleet contract: entities, claims with `benefit`, voids,
narratives, baseRates, symmetryCheck, gaps). The index contract is the one
`scripts/validate.mjs` §4 already enforces for `research/raw/indices.json`.*

> **How this spec came to exist.** The judging step for this page received **zero**
> designer specs (the input list was empty), so there was no winner and no runner-up to
> graft from. The judge wrote this spec directly against the contract and the house
> pages (`Resources.tsx`, `PmCares.tsx`). It has not had an adversarial second design.
> Treat the three "decisions builders most need" in §0 as the parts most worth a second
> opinion before build.

---

## 0. The three decisions builders most need

1. **The centre is the existing `GraphExplorer`/`ForceGraph`, extended — not a new graph,
   and not a map.** Energy entities carry `st` = *registered office*, which is not where a
   plant, block or line is (NTPC is Delhi-registered; Coal India is Kolkata-registered).
   A map would present the registered office as causal geography. Located assets already
   have a map at `/resources`; this page links there. Four props are added to the graph
   (§4.3): URL-lifted selection, a highlight set (the benefit path), a two-cell index
   cap on nodes (Nifty 50 | Sensex), and denial ticks for contras that answer a *claim*
   rather than a node.
2. **Benefit amounts are never summed.** A claim's `benefit.amountCr` may be a contract
   value, a tariff saving, an outlay or a market-cap move (see the `cui-bono` skill §1 —
   these are not interchangeable), and two claims can describe the same money. The
   "Who benefits" ledger lists amounts per claim with their `confidence`; it prints the
   largest single *documented* amount and counts the rest by confidence. There is no
   "total benefit to X" anywhere on the page, including tooltips and the table twin.
3. **The index link is by id only, in two separate columns: direct and via-group.** A
   Nifty 50 / Sensex constituent is connected to the energy graph only if its
   `existingId` (from `indices.json`) is itself a claim endpoint (**direct**), or a group
   node that is an endpoint has an `own` claim to that id in the merged graph
   (**via group**). No name or `group`-string matching. The two are never added
   together, and the section carries the 2×2 against sector so a reader can see that
   energy companies appearing in an energy graph is the expected result, not a finding.

---

## 1. Page purpose

`/energy` is the power map of India's energy and natural-resource economy: who holds the
public offices that decide (ministries, regulators, PSUs, ministers with dated tenures),
who receives what those decisions hand out (awards, PPAs, blocks, clearances, rule
changes), who says what about it (allegations with their denials beside them), and how
much of that touches the companies that make up the Nifty 50 and the Sensex. Its
controlling question is *cui bono* asked as a ledger row, not a verdict: for every claim,
the beneficiary, the mechanism, the amount and its confidence, the office-holder on the
date, the response of the party concerned, and the base rate that says whether the
picture is unusual. It is a document with a graph in the middle, not a dashboard; the
documented voids, the base rates and the symmetry checks carry the same weight as the
edges.

## 2. The reader's questions, in order

1. **What is in here, and as of when?** How many entities and claims, across which
   sub-domains (coal, power, renewables, oil & gas, …), at which tiers. → sticky
   `DenominatorStrip`, domain chips.
2. **Who connects to whom, and on what evidence?** → the graph, tier dash on every edge.
3. **For this one claim: who benefits, how, how much, and what did they say?** → click an
   edge or a claim row → benefit path in the graph + `ClaimCard` with the denial beside it.
4. **Who held the office on the date of the decision?** → date-test highlighting in the
   benefit path, and `TenureLanes`.
5. **What does the record not show?** → voids, directly under the graph.
6. **Who is recorded as benefiting, across all claims?** → `BenefitLedger`.
7. **How much of the Nifty 50 / Sensex does this touch, and is that unusual?** →
   `IndexGrid` + the sector 2×2.
8. **Which stories circulate, and how do they stand?** → `NarrativeCard` list, by status.
9. **Would the same lens produce the same alarm elsewhere?** → base rates + symmetry checks.
10. **What was looked for and not found, and what was killed?** → gaps, killed claims,
    source ledger.

A first-time reader should reach 1–3 above the fold on desktop and within two screens
on mobile; 4–7 are one scroll each.

---

## 3. Route and data plumbing

- Route `/energy`, lazy (`const Energy = lazy(() => import('./pages/Energy'))`), added
  to `App.tsx` beside `/resources`. Nav: `Layout.tsx`, same group as "Natural
  resources", label **"Energy power map"**, icon `Zap` (lucide-react, already a dep).
- **Load with `import.meta.glob`, eager**, so an absent file is an empty object at
  build time, not a build failure:
  - `import.meta.glob('../../research/raw/energy/*.json', { eager: true, import: 'default' })`
    — skip files whose basename starts with a capital (the validator's rule).
  - `import.meta.glob('../../research/raw/indices.json', { eager: true, import: 'default' })`.
- **Merge rule** (in `src/graph/energy.ts`; if task #3 already created that module,
  consume its exports and add only what is missing):
  - Files sorted by filename. Entities deduped by `id`; `d` and `srcs` concatenated and
    de-duplicated (srcs by URL); `label/sub/ty/fam/st/sz` taken from the first file. If
    two files disagree on `ty`, `fam` or `st`, keep the first and push a gap:
    `"<id> is typed differently in <a> and <b>"`.
  - Endpoints that are reused ids (`co:`, `pol:`, `min:`, `grp:`, bare Atlas ids such as
    `adani`) are hydrated from `buildNationalGraph().nodes` and `graph/data.ts NODES`.
    A claim with an endpoint that resolves nowhere is **not drawn**; it goes into
    `orphanClaims` and is counted in the strip and listed in the table twin.
  - Claim id = `c.id ?? \`${c.s}~${c.pred}~${c.t}\`` (the validator's fallback).
  - Partition claims: `status === 'killed'` → `killed`; `pred === 'contra' && t starts
    with 'claim:'` → `answers` (keyed by answered claim id); everything else → `GEdge`.
    `supersededBy` set → `superseded` (retained, not drawn — see §4.3).
  - Each claim keeps its `domain` (from the file) and file `asOf`.
- `asOfRange = [min(file.asOf), max(file.asOf)]`. The strip prints the **oldest**
  (`as of 2026-09-18 – 2026-09-25` when they differ). Never the newest alone.
- Every figure on the page is derived at module scope in `src/data/energy.ts`. No
  literal figure appears in `Energy.tsx`.

---

## 4. Layout, top to bottom

`<div className="max-w-[1180px]">`, as `Resources.tsx`.

### 4.1 Header (existing `Editorial` primitives)

- `Kicker`: `Energy & natural resources · power map`
- `PageTitle`: **Who decides, and who is paid**
- `Standfirst` (≤ 68ch): "Every line below is a sourced claim with an evidence tier —
  an award, a power-purchase agreement, a rule change, an office held on a date. For each
  one the record names who benefits, by what mechanism and for how much, and prints the
  response of the party it concerns beside it. The graph shows what was recorded; the
  sections under it show what was not, and how often the same picture appears where
  nobody suspects anything."
- `Byline`: `{files} research files · {entities} entities · {claims} claims · as of {asOfRange}`.

### 4.2 `DenominatorStrip` (existing, sticky)

`facts` in this order (mobile shows the first three plus `filtered`; see §9):

| # | n | of | label |
|---|---|---|---|
| 1 | visible claims (graph edges after filters, excl. contras) | all drawable claims | `claims` |
| 2 | alleged claims with ≥1 recorded response | alleged claims | `allegations answered` |
| 3 | claims with `benefit.who` | all drawable claims | `name a beneficiary` |
| 4 | visible entities | all entities (merged) | `entities` |
| 5 | Nifty 50 constituents with ≥1 direct claim | 50 | `Nifty 50 touched` (omit fact when no indices.json) |
| 6 | Sensex constituents with ≥1 direct claim | 30 | `Sensex touched` (same) |
| 7 | voids | — | `documented voids` |
| 8 | undated claims visible | visible claims | `undated (shown regardless of date window)` — only when `from`/`to` set |

`filtered={{ from: allDrawable, to: visible }}`. `asOf` = oldest file asOf (§3).

### 4.3 The centre — the graph

**Sub-domain chips** (above the graph, full width): one toggle chip per `domain` found in
the files, label = domain slug title-cased, with its claim count
(`Coal · 64`). Multi-select, URL `dom`. "All" is the unset state. Chips are buttons
with `aria-pressed`.

**Graph key** (always visible, one line above the canvas, never collapsed) — new
component `GraphKey` (§11), showing: the four tier dashes; family hue swatches
(`FAMILY_LABEL`); shapes (square = institution, half-round = person, diamond = fund /
party / trust, triangle = law / mechanism, circle = company); the index cap; the rose
denial tick; "edge width = recorded ₹ on the claim". The full `TierLegend` sits at the
page foot.

**Canvas**: `GraphExplorer` with `nodes = ENERGY.nodes`, `edges = visible GEdges`,
`height = 640` (≥ 1024px), `560` (640–1023), `440` (< 640). Extensions (all optional
props, so existing pages are unchanged):

```ts
// GraphExplorer
interface Props {
  nodes: GNode[]; edges: GEdge[]; height?: number; defaultQuery?: string;
  /** Lift selection and hop radius into the URL as `sel` and `hops`. Default false. */
  urlSelection?: boolean;
  /** Overrides ego dimming: only these stay at full opacity. */
  highlight?: { nodes: Set<string>; edges: Set<string>; caption: string } | null;
  /** Two-cell index cap per node: [Nifty 50, Sensex]; null = draw nothing. */
  nodeCap?: (n: GNode) => [boolean, boolean] | null;
  /** Contras that answer a claim, keyed by the answered edge's id. */
  answers?: Map<string, { id: string; denier: string; tier: Tier }[]>;
  /** Replaces the built-in detail panel for a selected node or claim. */
  renderDetail?: (sel: { node?: string; claim?: string }) => React.ReactNode;
  /** Keys the reset button may clear. Default: the rail's own keys only. */
  ownKeys?: string[];
  onSelectEdge?: (edgeId: string) => void;
}
// ForceGraph gets: highlight, nodeCap, answers, onSelectEdge (passed through).
```

- **Selection in the URL.** With `urlSelection`, `sel` (node id) and `hops`
  (`0|1|2|3`, default `2`, meaningful only with `sel`) replace the two `useState`s.
  The built-in "show table view" toggle becomes URL `table=1`.
- **Reset** clears only `ownKeys` (`tier,fam,pred,q,min,from,to,sel,hops,claim,idx,via,table`),
  not `dom`, `nar`, `sup`. Today it clears everything; fix that.
- **Sticky rail offset**: `lg:top-12` (the strip occupies the top ~2.5rem).
- **Edge click** (new; edges get `tabIndex=0`, `role="button"`, 8px transparent hit
  stroke) → sets `claim=<id>`.
- **Benefit path** (`claim` set): `highlight` =
  nodes `{s, t, benefit.who, every denier}` ∪ `{office-holders}`; edges `{the claim,
  every contra connector}` ∪ `{role edges into s whose [from, to ?? asOf] contains
  claim.from}`. Everything else takes the existing dim opacity (0.1 edges / 0.16 nodes).
  If `benefit.who` is not an endpoint and no edge in the record joins it, it is lit but
  **not connected** — no edge is invented; the caption says so (§6).
  `claim` takes precedence over `sel` for dimming; setting `claim` does not clear `sel`.
- **Contras.** Node-to-node contras are ordinary edges (existing rose style).
  Contras answering a claim are drawn by `answers`: a rose tick perpendicular to the
  answered edge at its midpoint, 8 px long, `strokeWidth 1.5`, dash = the contra's
  tier; plus, only if the denier is **not** an endpoint of the answered edge, a rose
  connector from the denier to that midpoint, same dash. **Visibility of a contra
  follows the claim it answers**: `pred` and `tier` filters never hide the denial of a
  visible claim.
- **Superseded claims are not drawn.** The graph is the current record; each superseded
  claim remains addressable in the table twin (with `sup=1`) and in the `ClaimCard` of
  the claim that replaced it ("Supersedes …"). This avoids giving opacity a second
  meaning.
- **Killed claims are never drawn** (they have their own table, §4.10).
- **Index filter** `idx=nifty50|sensex` (keys = the names in `indices.json`): keeps
  claims with an endpoint whose id is a constituent's `existingId`; `via=group` also
  keeps claims touching a group with an `own` edge to a constituent. Rail control:
  radio `none | Nifty 50 | Sensex` + checkbox "include via group"; the rail shows the
  denominator live: `412 → 37 claims`. Disabled with inline text "index list not loaded"
  when `indices.json` is absent.

**Detail panel** — `renderDetail` returns:
- `claim` set → `ClaimCard` (§11).
- only `sel` set → the node's `label`, `sub`, `identity` (office-with-dates, CIN, NSE
  symbol, DIN — only those present), `publicRole`, every `d` fact with its tier marker
  rendered as a `TierChip`, `Cite srcs`, index cap in words ("Nifty 50: member as of
  {date} · Sensex: not a member"), a link to `/company/:id` when the id is in
  `companies.ts`, then the node's claims as a list (each row clickable → `claim`).

**Graph caption** (under the canvas; wording in §6).

### 4.4 What the graph cannot draw — voids (new `VoidList`)

Directly under the graph, before any aggregate. `Section` title **"What the record does
not show"**, note `{n} documented voids across {k} domains`. Each void: `what` at 15px
(same as findings), `whyItMatters` at 14px, domain label, `Cite srcs`. Grouped by domain
in the same order as the chips; respects `dom`. Voids are not in the graph because the
contract gives them no node — the section says that in one line.

### 4.5 Who benefits (new `BenefitLedger`)

`Section` **"Who is recorded as benefiting"**, note `rows are beneficiaries; amounts are
never summed`.

One row per distinct `benefit.who` among visible claims. Columns:

| column | content |
|---|---|
| beneficiary | node label (click → `sel`), `sub`, index cap in words |
| claims | count, then per-tier counts as four `TierChip`s with numbers (zero tiers omitted) |
| largest documented | the largest `amountCr` among claims with `confidence: 'documented'`, `₹{x} cr`, its claim `lab`, click → `claim`; `—` + "none documented" when absent |
| other amounts | `{n} estimated` (range `₹min–max cr`), `{m} unknown`, as text |
| mechanisms | each claim's `benefit.how`, one per line, with its claim's `lab` and TierChip |

Default sort: largest documented amount desc (nulls last), then claim count desc, then
label. Sort control: `largest documented | claim count | name` (URL `bsort`, default
`amount`). Every claim is listed inline in its row; nothing is behind "show more".

`ConcentrationCurve` beside the table **only** when ≥ 5 beneficiaries have a documented
amount, fed the largest-documented value per beneficiary, `label="largest documented
benefit per beneficiary"`; otherwise the slot prints "Fewer than five beneficiaries have
a documented amount — too few for a curve to mean anything."

`Callout tone="bottomline"` label **"A beneficiary is not an allegation"**: "An award
has a winner by construction; a tariff order has a party whose tariff changed. Naming
who gained is arithmetic. Whether the gain was intended, improper or ordinary is a
separate claim, which appears in the graph as `alleged` with its denial, or not at all."

Table twin: this component *is* a table; no separate twin.

### 4.6 The benchmark — Nifty 50 and Sensex (new `IndexGrid`)

`Section` **"How much of the benchmark this touches"**, note `membership as of
{indices.asOf} · {source label}`.

Two `IndexGrid`s side by side (≥ 1024px; stacked below), Nifty 50 then Sensex. One cell
per constituent, **fixed order: alphabetical by NSE symbol** (BSE code for Sensex-only
names), never by claim count. Cell (≈ 64×40): symbol in mono, then `{direct}` and, if
any, `(+{via} via group)`.

| cell state | encoding | meaning |
|---|---|---|
| direct ≥ 1 | solid fill `bg-text/10`, 1px `border-border-light` | the company id is an endpoint of ≥1 visible claim |
| via group only | outline, 4px filled corner square top-right | only its group appears, joined by an `own` edge |
| none | outline only | no claim recorded in these files |
| `existingId` null | the map no-data hatch (`IndiaMap`'s pattern) + "not in dataset" | the platform has no company record to join — no data, not zero |

Click → `sel=<existingId>` and scroll to the graph. Keyboard: cells are buttons.
Respects `dom`, `tier`, `pred`, `from/to` (it counts *visible* claims).

Under the grids, the **2×2** (DataTable, per index): rows = constituent sector in
{Energy, Utilities, Metals & Mining} (from `companies.ts` `sector` via `existingId`) vs
other; columns = direct ≥ 1 vs none; plus a row "sector unknown (not in dataset)". This
is the base rate for the section: an energy graph that touches energy companies is the
expected result.

Caption (verbatim, §6). Table twin: `DataTable` per index — symbol, name, sector,
direct, via group, tiers (d/r/a/an counts), existingId or "not in dataset".

### 4.7 Who held the office (new `TenureLanes`)

`Section` **"Who held the office on the date"**, note `role claims with dates ·
{placed} of {dated} claims placed · {undated} undated not placed`.

- **Lanes** = institution nodes (`ty` ministry | agency | psu, `fam` state | enforce)
  that are the `t` of ≥1 `role` claim or the `s` of ≥1 dated claim. Order: `fam`
  (state, then enforce), then label.
- **Tenure bars** inside a lane: one per `role` claim person→institution, from `from` to
  `to ?? asOf`; bar outline dash = the role claim's tier; label = person label, plus
  `(Party)` only if a `role` claim person→party overlaps the tenure. **No party colour.**
  Open tenure ends square at `asOf` with the text `in office as of {asOf}`.
- **Events**: ticks at `claim.from` for claims whose `s` is the lane's institution
  (preds award, law, enforce, pmout, csr), tick dash = tier, 10px high; the selected
  claim's tick is 18px and `text-text`.
- One shared time axis across lanes (years), range = min/max dated claim, clipped to
  `from/to` when set.
- Click bar → `sel=<person>`; click tick → `claim=<id>`.

Table twin: DataTable — institution, office-holder, from, to, tier, claims dated inside
the tenure (count, ids).

### 4.8 What circulates (new `NarrativeCard`)

`Section` **"Narratives, and how each stands"**, note `{n} narratives · status is the
research sweep's assessment as of {asOf}`.

Status counts line in fixed ladder order: `established {a} · well-supported {b} ·
contested {c} · speculative {d} · unsupported {e} · debunked {f}` (zeros printed). Filter
chips by status, URL `nar`.

Each card: the `claim` sentence (16px), domain label, a **six-cell ordinal status bar**
(position encodes status; filled cell = this narrative's step, others outline; labels
under the first and last cells only). Below, symmetric two columns (the `ContestedFact`
layout, reused as markup — its `who` slot reads **"Strongest case"** / **"Strongest
counter"**): `strongestCase` | `strongestCounter`. Footer: **"What would change this:"**
`whatWouldChangeThis`. `Cite srcs`. No colour by status; `debunked` is not rose.

### 4.9 Base rates and the symmetry check (new `BaseRateTable`, `SymmetryPanel`)

`Section` **"Would the same lens alarm us elsewhere?"**.

`BaseRateTable`: columns property | `numerator of denominator` (mono) | rate | bar |
what the denominator is (`label`) | domain | sources. Bar on one shared 0–100% scale.
`denominator === 0` → rate cell "not a rate (denominator 0)", no bar.

`SymmetryPanel`: one `Callout tone="note"` per file, label **"Symmetry check — {domain}"**,
body = `symmetryCheck` verbatim. A file without one → `Callout tone="warn"` label
**"No symmetry check — {domain}"**: "The contract makes this mandatory. Its absence is a
defect in that file, and the claims from it should be read with that in mind." — and a
gap is pushed (§4.11).

### 4.10 Claims that did not survive cross-examination

`Section` **"Killed in audit"**, note `{k} of {total} claims`. DataTable: claim id, s → t
(labels), pred, tier as recorded, `d`, `killIf`, `auditNote ?? '—'`, sources. Shown even
when empty (then: "No claim was killed in the adversarial audit — either the audit found
nothing or it has not run; the audit log is the place to tell which."). Showing what was
rejected is part of the record.

### 4.11 Gaps (existing `GapsPanel`)

Same type size as findings. `gaps` = every file's `gaps[]` as
`{ what: fullString, why: 'Recorded by the {domain} research sweep, {asOf}' }` —
**no truncation** (Resources' 200-char split is not copied) — plus derived gaps: entity
type conflicts, orphan claims, missing symmetry checks, "index list not loaded".
`note`: "Absence here is a result. A company with no claim in this register may simply
not have been researched."

### 4.12 Table twin of the graph

GraphExplorer's table (URL `table=1`), extended columns: claim id · domain · source →
target · pred · tier · ₹ · from – to · beneficiary · benefit confidence · responses
(count, ids) · superseded by · sources. With `sup=1` superseded claims appear as rows
with "superseded by {id}". Orphan claims appear at the end, flagged "endpoint not in
platform". Same filter state as the graph. A button "Show table" sits under the canvas
on every breakpoint.

### 4.13 Foot

`SourceLedger` (merged `sources` of all files, deduped by URL; `primary` = URL matches
`/gov\.in|nic\.in|sci\.gov\.in|sebi\.gov\.in|cag\.gov\.in|bseindia\.com|nseindia\.com|
cercind|indiacode|sansad/i`; `retrieved` = file asOf; `establishes` = "See per-claim
citations above."), `TierLegend`, `Footnote` with the standing note (HANDOFF "Standing"
paragraph, and: "Nothing on this page asserts that any named person committed an
offence.") and a link to `/resources` ("located assets — coal blocks, mineral blocks —
are mapped there").

---

## 5. Visual encodings — what each channel means (frozen)

| element | channel | means exactly | never means |
|---|---|---|---|
| edge | `strokeDasharray` | tier: documented solid · reported `6 3` · alleged `2 4` · analytic `8 3 2 3` | anything else |
| edge | width `0.7 + min(2.4, √a / 26)` | the ₹ crore on the claim (`a`); min width = not monetary or not recorded | size of benefit, importance |
| edge | rose `#c45b5a` | a denial / counter-evidence (`contra`) | "bad", "suspicious" |
| edge midpoint | rose perpendicular tick (dash = its tier) | this claim has a recorded response | — |
| node | hue (`FAMILY_COLOR`) | family: public power · private capital · recipients · instruments · regulators & courts · markets | sub-domain, party, sector |
| node | shape | entity type (square institution, half-round person, diamond fund/party/trust, triangle law/mechanism, circle company) | — |
| node | size (`sz`) | the researcher's declared magnitude band 1–4 | computed importance / degree |
| node | dashed outline + 0.25 fill | unresolved identity (existing) | — |
| node | gold ring | pinned by the reader (existing) | — |
| node | two-cell cap above | left = Nifty 50, right = Sensex; filled = member as of list date; outline = not; absent cap = member of neither | market weight, performance |
| any mark | opacity 0.1 / 0.16 | outside the current focus (ego, or benefit path) | superseded, low confidence |
| tenure bar | outline dash | tier of the role claim | — |
| index cell | fill / corner square / hatch | direct / via group / not in dataset | tier, amount |
| narrative bar | position of the filled cell | status on the six-step ladder | — |

Do not restyle any of these to fit. Cap cells: 7×3 px each, 1px gap, centred at
`y = -r - 5`, fill `#e8e4dc` at 0.85, outline 0.8px same colour.

---

## 6. Captions the page must carry (verbatim unless a number is interpolated)

- **Graph**: "An edge is a sourced claim, not a measure of influence. Where a node sits
  is produced by the layout and means nothing; how big it is was declared by the
  researcher, not computed. Edge width is the ₹ figure recorded on the claim, whose kind
  varies — a contract value, a tariff, an outlay — so widths compare only within one
  kind of claim. A thin edge may simply have no recorded amount."
- **Graph, when date filter set**: "{u} undated claims are shown regardless of the date
  window, because an undated claim cannot be placed inside or outside it."
- **Benefit path**: "Highlighted: the claim, the responses to it, and whoever held
  office at {s} on {claim.from}. Holding office on the date is what the date test
  requires; it is not evidence that the office-holder made the decision." + when the
  beneficiary is unconnected: "The claim names {who} as beneficiary; no edge in the
  record joins them to it, and none is drawn."
- **Benefit ledger**: "Amounts are not added up. Two claims can describe the same money,
  and a contract value, a tariff saving and an outlay are different quantities.
  'Estimated' is the researcher's estimate as recorded; 'unknown' is unknown, not zero.
  Rows are ordered by the largest documented single amount — a figure that exists
  outside this app — not by any score."
- **Index grid**: "Membership as of {asOf} from {source}. It says nothing about
  membership on the date of any claim. A constituent with no claim was not necessarily
  examined: this register was built by researching energy and resources, so banks and IT
  firms are absent because nobody looked, not because they were cleared. 'Via group'
  means a group that owns the company appears; the company itself does not."
- **Tenure lanes**: "Tenures are drawn only where a dated role claim exists. A lane with
  gaps is a gap in the record, not a vacancy in the office."
- **Narratives**: "Status is the research sweep's calibration on the evidence it found,
  not a verdict of any court or regulator."
- **Base rates**: "A property shared by most comparables is a fact about the category,
  not about any one member."

---

## 7. Filters and URL params

All via `useSearchParams`, `replace: true`. Default for every one is **unset =
unfiltered**. No default selects a party, company or person.

| param | control (where) | values | default | effect on denominator |
|---|---|---|---|---|
| `dom` | domain chips (above graph) | comma list of domain slugs | all | strip facts 1,3,4,7; every section respects it |
| `tier` | rail checkboxes (existing) | documented,reported,alleged,analytic | all | fact 1; contras follow their claim |
| `fam` | rail (existing) | family ids | all | fact 1, 4 |
| `pred` | rail (existing) | predicates | all | fact 1; contras follow their claim |
| `q` | rail search (existing) | text over label, `al`, `lab` | — | fact 1, 4 |
| `min` | rail slider (existing) | ₹ crore | 0 | fact 1; rail note: "claims with no amount are hidden when min > 0 ({n})" |
| `from`, `to` | rail dates (existing) | ISO | — | fact 1, fact 8 appears |
| `sel` | node click | node id | — | none (focus only) |
| `hops` | rail hop buttons (existing) | 0–3 | 2 | none |
| `claim` | edge / row / tick click | claim id | — | none (focus only) |
| `idx` | rail radio (new) | index key from indices.json | — | fact 1, live `N → n` in rail |
| `via` | rail checkbox (new) | `group` | — | as `idx` |
| `table` | "Show table" button | `1` | — | — |
| `sup` | table-twin checkbox | `1` | hidden | table row count only |
| `bsort` | ledger sort | amount, count, name | amount | — |
| `nar` | narrative status chips | status list | all | narrative count line |

An unknown `sel`/`claim` id → ignored, and a one-line amber notice above the graph:
"The linked item {id} is not in this version of the register." (Links must survive data
changes honestly.)

---

## 8. Empty, partial and no-data states

| state | render |
|---|---|
| no energy files | header; strip `0 claims · as of —`; `Callout tone="warn"` "The energy register has not been promoted yet. Nothing below is zero — it is absent."; GapsPanel; SourceLedger empty; no graph, no grids. Smoke must pass in this state. |
| filters leave 0 claims | canvas replaced by: "0 of {M} claims match." + the single active filter that removed the most claims, with a button clearing only it, and "Reset graph filters". |
| no `indices.json` | §4.6 shows a `Callout note` "Index membership has not been loaded; the Nifty 50 / Sensex link cannot be drawn." No caps drawn; `idx` disabled; strip facts 5–6 omitted. |
| constituent `existingId` null | hatched cell "not in dataset" (§4.6). |
| claim without `a` | min width; "—" in ₹ columns with title "no amount recorded". |
| claim without `benefit` | ClaimCard: "No beneficiary recorded for this claim." Counted in strip fact 3. |
| `benefit.amountCr` null | "amount unknown" (confidence shown), never ₹0. |
| undated claim | not placed on lanes (counted in the lane note); kept in graph (caption). |
| alleged claim with no response | should be impossible (validator). If it occurs: ClaimCard prints in amber "No response recorded. Under this platform's rules this claim should not have shipped." and it is listed in gaps. |
| < 5 documented beneficiaries | curve slot text (§4.5). |
| no narratives / base rates / voids for the filtered domains | the section stays, with "None recorded for {domains}." — the section is never removed. |
| file missing `symmetryCheck` | warn callout (§4.9). |

No loading state: all data is compiled in.

---

## 9. Mobile (< 640px) and tablet

- Graph rail wraps in `<details>` above the canvas, closed by default; the `<summary>`
  shows the active-filter count and `N → n claims`. Canvas `440px`; the camera's pinch /
  drag already works on pointer events; `CameraControls` stay visible.
- Detail panel renders **below** the canvas, and selecting an item scrolls it into view.
  ClaimCard's claim / response columns stack (claim first, response immediately after,
  same width and type size).
- DenominatorStrip: facts 1–3 plus `filtered` and `asOf`; facts 4–8 are `hidden sm:inline`.
  The filtered fact is never hidden.
- Domain chips scroll horizontally in their own `overflow-x-auto` row.
- `IndexGrid`: 5 columns (< 640), 10 columns (≥ 640). Cells stay ≥ 44px tall (tap target).
- `TenureLanes`: own `overflow-x-auto` container, `min-width: 720px`, lane labels
  `position: sticky; left: 0` on `bg-bg`.
- Every table inside `DataTable`'s existing scroll wrapper. No horizontal page scroll.

---

## 10. Denominators shown (checklist)

Strip facts 1–8 (§4.2); rail `N → n` for every filter; voids count; ledger "{b}
beneficiaries across {c} claims, {d} with a documented amount"; curve's own "n distinct
· half held by k of n"; index "{n} of 50" / "{n} of 30" and the 2×2; lanes "{placed} of
{dated} placed · {undated} undated"; narratives count by status; base rates
numerator/denominator; killed "{k} of {total}"; source ledger "N sources · P primary".

---

## 11. New components (props)

`src/components/Claims.tsx`

```ts
export interface EnergyClaim extends GEdge {
  id: string; domain: string; asOf: string;
  benefit?: { who: string; how: string; amountCr: number | null; confidence: 'documented' | 'estimated' | 'unknown' };
  status?: 'killed' | string; auditNote?: string;
}
export function ClaimCard(p: {
  claim: EnergyClaim;
  label: (id: string) => string;
  responses: EnergyClaim[];            // contras answering it (claim: or node form)
  supersedes: EnergyClaim[];           // claims whose supersededBy === claim.id
  officeHolders: { personId: string; role: EnergyClaim }[];  // date test
  onSelectNode: (id: string) => void;
  onSelectClaim: (id: string) => void;
}): JSX.Element;
```
Layout: header `lab` + `TierChip` + `pred` + `from – to` + `₹a cr`; `d`; `Cite srcs`.
Then **two equal columns** — left "The claim" (benefit block: who, how, amount +
confidence, `innocentReading` when analytic, `upgradeIf`, `killIf`), right "The
response" (each response's `s` label, `d`, TierChip, Cite; or "No response recorded"
for non-alleged claims, in muted text). Then "Held office on {from}" list and
"Supersedes" list.

```ts
export function BenefitLedger(p: { rows: BenefitRow[]; sort: 'amount' | 'count' | 'name'; onSort: (s) => void; onSelectNode; onSelectClaim; indexWords: (id: string) => string | null }): JSX.Element;
export interface BenefitRow { who: string; label: string; claims: EnergyClaim[]; largestDocumented: EnergyClaim | null; estimated: number[]; unknown: number; tiers: Record<Tier, number> }
export function NarrativeCard(p: { n: Narrative; domain: string }): JSX.Element;
export function BaseRateTable(p: { rows: (BaseRate & { domain: string })[] }): JSX.Element;
export function SymmetryPanel(p: { entries: { domain: string; text: string | null }[] }): JSX.Element;
export function VoidList(p: { voids: (Void & { domain: string })[] }): JSX.Element;
export function GraphKey(): JSX.Element;
```

`src/components/viz/IndexGrid.tsx`

```ts
export interface IndexCell { key: string; symbol: string; name: string; existingId: string | null; sector: string | null; direct: number; viaGroup: number; tiers: Record<Tier, number> }
export default function IndexGrid(p: { title: string; asOf: string; cells: IndexCell[]; selected?: string | null; onSelect: (id: string) => void }): JSX.Element;
```

`src/components/viz/TenureLanes.tsx`

```ts
export interface Lane { id: string; label: string; fam: NodeFamily; spans: { personId: string; label: string; party: string | null; from: string; to: string | null; tier: Tier; claimId: string }[] }
export interface LaneEvent { claimId: string; laneId: string; date: string; tier: Tier; label: string }
export default function TenureLanes(p: { lanes: Lane[]; events: LaneEvent[]; range: [string, string]; asOf: string; selectedClaim?: string | null; onSelectClaim: (id: string) => void; onSelectNode: (id: string) => void }): JSX.Element;
```
Both SVGs: `role="img"`, `<title>`, focusable marks with visible focus ring.

Selectors in `src/data/energy.ts` (all `useMemo`-able pure functions of the filter
state): `visibleClaims(filter)`, `benefitRows(claims, sort)`, `indexCells(indexKey,
claims)`, `sectorTwoByTwo(indexKey, claims)`, `tenureLanes(claims)`,
`officeHoldersOn(claim)`, `answersByEdge(claims)`, `ledgerEntries()`, `energyGaps()`.
All sorts carry an explicit tiebreak on id.

---

## 12. What the page refuses to show, and why

- **No map centre**, and no GeoNetwork view of energy entities: `st` is the registered
  office; drawing it as geography asserts a location the asset does not have. Located
  assets live on `/resources`.
- **No influence, centrality, "most connected" or risk score**, and no ranking by one.
  Degree in a researched graph measures research attention.
- **No community detection / cluster colouring.** An algorithmic cluster rendered as a
  group reads as a cabal; the pattern-discipline hub and small-world traps apply.
- **No benefit totals** (§0.2), in any view, tooltip or export.
- **No index-weight exposure %.** Free-float weights are not in the dataset; summing
  market caps is not the index. If a dated weights file is added later, this can be
  revisited — until then it is a gap.
- **No share-price or index-level overlay against claim dates.** An event study needs
  compiled daily closes, a market model and pre-registered windows; a price line next
  to a decision date implies a reaction the page cannot test. Recorded as a gap.
- **No party-level aggregation** ("party X's ministers → ₹Y to Z"). It is a conjunction
  of claims that each carry their own tier; party appears only as text on a tenure bar
  backed by a role claim.
- **No party colour**, no colour that means "suspicious", no rose except for denials.
- **No unresolved node as an endpoint** (validator) and no orphan claim drawn.
- **No mechanism filter** over `benefit.how`: it is free text, and a keyword filter
  would be name-matching by another route. Offer it only if the contract adds an enum.
- **No default selection** of any party, person or company.

---

## 13. Build estimate

Create:
| file | est. lines |
|---|---|
| `src/graph/energy.ts` (merge, hydrate, partition — or extend task #3's module) | 180 |
| `src/data/energy.ts` (selectors) | 220 |
| `src/data/indices.ts` (glob-load `indices.json`, `constituentsOf`, `capFor`) | 60 |
| `src/components/Claims.tsx` (ClaimCard, BenefitLedger, NarrativeCard, BaseRateTable, SymmetryPanel, VoidList, GraphKey) | 420 |
| `src/components/viz/IndexGrid.tsx` | 120 |
| `src/components/viz/TenureLanes.tsx` | 200 |
| `src/pages/Energy.tsx` | 380 |

Modify:
| file | change |
|---|---|
| `src/components/viz/GraphExplorer.tsx` | `urlSelection`, `highlight`, `nodeCap`, `answers`, `renderDetail`, `ownKeys`, `onSelectEdge`, `table` param, `lg:top-12`, idx/via rail controls behind a prop (`indexOptions?: {key,label}[]`) — ~120 lines |
| `src/components/viz/ForceGraph.tsx` | highlight dimming, cap glyph, contra ticks/connectors, edge hit-stroke + keyboard — ~110 lines |
| `src/App.tsx` | route |
| `src/components/Layout.tsx` | nav item |
| `scripts/smoke.mjs` | `['/energy','energy']`, `['/energy?claim=__missing__','energy-missing-link']`, `['/energy?idx=nifty50&dom=coal','energy-filtered']` |
| `docs/INDEX.md`, `HANDOFF.md` | route count and a line on the page |

Gates: `npx tsc -b`, `npm run build`, `npm run validate`, `npm run smoke` — including
with `research/raw/energy/` absent (the empty state is a shipped state). Screenshot the
graph in greyscale to verify tier dashes and the rose tick survive.
