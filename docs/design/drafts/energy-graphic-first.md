# /energy — the power map · design draft, graphic-first

*Draft, 2026-09-25. Angle: **graphic first**. The graph is the page, and everything
else is an annotation in its margin. Data contracts: `scratchpad/energy/SPEC.md` (fleet
files `research/raw/energy/*.json`: entities, claims with `benefit`, voids, narratives,
baseRates, symmetryCheck, gaps) and `research/raw/indices.json` (the shape
`scripts/validate.mjs` §4 enforces). Built against the **upgraded** `GraphExplorer` as it
now stands on disk (URL keys `q tier fam pred ty min from to sel focus hops path`, the
year scrubber, `EdgeCard`, shortest path with `medianDegreeSeparation`). Where this draft
agrees with `docs/design/ENERGY_PAGE.md` (the judge's spec), that is noted rather than
restated. Where it differs, the reason is given.*

---

## 0. The central idea, and where it departs from ENERGY_PAGE.md

**The page is one stage with three columns: filter rail | graph | margin.** The margin
is never empty. At rest it holds **what the record does not show** (the documented
voids). When the reader acts, it holds the epistemic context of what they touched: a
claim's beneficiary, its response and the office-holder on the date, a path's median
baseline, a listed company's decision and money lists. Every section below the stage is
either an **entry point into the graph** (index dock, benefit ledger) or the **long form
of a margin card** (contested, base rates, gaps, sources). Nothing below the stage
introduces a fact that cannot also be reached by clicking in the graph.

Four departures from ENERGY_PAGE.md:

1. **Voids sit beside the graph at rest, not below it.** Absence gets the same position
   and type size as the picture. A reader's first screen shows both.
2. **A claim is a URL (`claim=`).** The edge card is transient in the current
   GraphExplorer. Here, clicking an edge pins its claim, and the reader can send
   someone "this award, its beneficiary, and the denial beside it".
3. **"Ministry exposure" is renamed and made into two lists.** A listed company's trail
   is *public decisions touching it* and *money it sent*, as two lists that are
   **deliberately not drawn on a shared timeline** (see §12).
4. **The in-frame caption carries the epistemics that screenshots lose.** Hover cards
   and the margin do not survive a screenshot. The graph's own status line does, so it
   carries the denominator, the tier legend and the one-line reading rule.

The same as ENERGY_PAGE.md: no map centre, because `st` is the registered office. No
benefit totals. Index joins by id only, direct and via-group kept separate. No default
selection.

---

## 1. Page purpose

`/energy` is an explorable map of who holds public power over India's energy and
natural-resource economy, and who the recorded decisions went to. It covers ministers
with dated tenures, ministries, regulators, courts, PSUs, private groups and promoters,
across coal, mining, oil & gas, hydro, solar/wind, nuclear, and transmission and
discoms. Every edge is one sourced claim with its evidence tier: an award, a PPA, a
bond, a trust routing, a CSR payment, a shareholding, an office, a rule, a proceeding or
a denial. The reader explores by hovering and clicking. For whatever they touch, the
margin answers *who benefits, by what mechanism, for how much, on whose watch, and what
did the party concerned say*. It also says what the record does not contain. A reader
can enter from the stock market (a Nifty 50 or Sensex constituent) and follow the
company to the decisions that touched it and the money it sent. They can never reach a
score, a total or a verdict. The page does not duplicate `/resources` (located blocks on
a map), `/tenders`, `/allocation`, `/pmcares` or `/conglomerates/:id`. It links to them
from the margin cards where a node corresponds.

## 2. The reader's questions, in order

1. **What am I looking at, and how much of it?** → header one-liner, sticky
   `DenominatorStrip`, in-frame status line. *(Answered without scrolling.)*
2. **What is missing from it?** → margin at rest: voids. *(Also without scrolling.)*
3. **Which part of the energy economy?** → `DomainStrip` chips above the canvas.
4. **What is this line?** → hover an edge: `EdgeCard` hover with tier, date, amount,
   beneficiary and response count.
5. **Who benefited from this claim, and what did they say?** → click an edge: `claim=`,
   margin `ClaimCard`, with the response at equal size.
6. **Who held the office on that date?** → the `ClaimCard` date test, plus a tenure lane
   under the scrubber.
7. **What is attached to this entity?** → click a node: `sel=`, `focus=` / `hops=`,
   margin `NodeCard`.
8. **I hold a Nifty 50 energy stock. What does it touch?** → the "start from a listed
   company" box or the `IndexDock` cell → `CompanyTrail` in the margin.
9. **How far apart are these two, and is that unusual?** → shift-click → `path=`,
   margin `PathCard` with the median.
10. **When?** → the year scrubber, with undated claims counted separately and per-domain
    coverage shown.
11. **Across everything, who is named as gaining?** → `BenefitLedger`, whose rows light
    edges in the graph.
12. **Which stories circulate, and which allegations are answered?** → Contested.
13. **Would this lens alarm us anywhere?** → base rates and symmetry checks.
14. **What could not be verified?** → Gaps, then Sources.

---

## 3. Route, data and URL state

### 3.1 Route

- `/energy` → `src/pages/Energy.tsx`, loaded with `React.lazy` in `App.tsx` next to
  `/resources`. Nav item in `Layout.tsx`, in the resources group, label
  **"Energy power map"**, icon `Zap` (lucide-react is already a dependency).

### 3.2 Loading the data (static, no fetch)

- `import.meta.glob('../../research/raw/energy/*.json', { eager: true, import: 'default' })`.
  Skip basenames that start with a capital letter (the validator's convention for notes).
  A missing directory gives an empty object, and that must be a valid, shipped state
  (§9).
- `import.meta.glob('../../research/raw/indices.json', { eager: true, import: 'default' })`.
  Absent is also valid.
- **Merge** in `src/graph/energy.ts`. If a sibling task has already created it, consume
  its exports:
  - Sort files by filename. Dedupe entities by `id`. Take `label / sub / ty / fam / st /
    sz` from the first file that declares the entity. Concatenate `d` and `srcs`, deduping
    `srcs` by URL. A `ty`, `fam` or `sz` disagreement between files is kept as first, and
    a derived gap is pushed: `"{id}: sz 2 in coal.json, 4 in renewables.json — first kept"`.
  - Hydrate reused ids (`co: pol: min: grp: sec:` and bare Atlas ids such as `adani`)
    from `buildNationalGraph().nodes` ∪ `graph/data.ts NODES`.
  - The claim id is `c.id`. Every claim becomes a `GEdge` with `id = c.id`, and keeps
    `domain`, `benefit`, `upgradeIf`, `killIf`, `innocentReading`, `supersededBy` and
    the file `asOf` in a side map `CLAIM_META: Map<string, ClaimMeta>`.
  - **Contras whose `t` is `claim:<id>`** are not drawable as node→node edges. Put them
    in `ANSWERS: Map<claimId, GEdge[]>` (the denier is `s`). A contra between two nodes
    is an ordinary edge.
  - A claim with an endpoint that resolves nowhere goes into `ORPHANS`. It is not drawn,
    but it is counted and listed.
  - Claims with `supersededBy` set are not drawn (§6). They stay addressable.
  - Domain of a node = the set of file domains in which it is an endpoint or a declared
    entity.
- `EXPECTED_DOMAINS` (a declared constant in `src/data/energy.ts`, printed in Gaps
  if unmet): `coal · mining · oil-gas · hydro · renewables · nuclear · transmission`.
  File `domain` slugs are matched exactly. An unexpected slug is appended. An expected
  slug with no file becomes an absent chip (§5.3). A slug mismatch surfaces as a gap
  rather than a silent drop.
- `ENERGY_SECTORS` (declared constant): `Energy · Utilities · Metals & Mining`. These are
  the `companies.ts` sector strings as they exist today, and the rule is printed under
  the index dock.
- Derive every figure at module scope or with `useMemo`. No literal figure appears in
  `Energy.tsx`. Every sort breaks ties on `id`.

### 3.3 URL parameters

All params use `useSearchParams` with `replace: true`. **The default for every one is
unset, which means unfiltered and whole graph.** No default names a person, party or
company.

| param | owner | values | default | control |
|---|---|---|---|---|
| `dom` | page (new) | comma list of domain slugs | all | `DomainStrip` chips |
| `q` | GraphExplorer | text over label, `sub`, `al` | — | rail search |
| `tier` | GraphExplorer | documented,reported,alleged,analytic | all four | rail checkboxes |
| `fam` | GraphExplorer | family ids | all present | rail checkboxes |
| `pred` | GraphExplorer | predicates | all | rail checkboxes |
| `ty` | GraphExplorer | shape classes | all | the shape legend (it is also the filter) |
| `min` | GraphExplorer | ₹ crore | 0 | rail slider |
| `from`, `to` | GraphExplorer | ISO dates, snapped to 1 Jan / 31 Dec by the scrubber | — | scrubber |
| `sel` | GraphExplorer | node id | — | node click, dock cell, company box |
| `focus`, `hops` | GraphExplorer | node id; 1–3 | —; 1 | NodeCard "focus 1 / 2 / 3 hops" |
| `path` | GraphExplorer | `a,b` | — | shift-click, NodeCard "path to…" |
| `claim` | GraphExplorer (**new**) | claim id | — | edge click, ledger row, Contested row |
| `idx` | page (new, rail slot) | an index key from `indices.json` | — | rail radio |
| `via` | page (new) | `group` | — | rail checkbox under `idx`; CompanyTrail toggle |
| `isec` | page (new) | `energy` | — | dock toggle "energy sectors only" |
| `table` | GraphExplorer (**moved from useState**) | `1` | — | "show table" button |
| `sup` | page | `1` | — | table-twin checkbox "include superseded" |
| `bsort` | page | `amount` · `claims` · `name` | `name` | ledger sort (see §5.8 for why `name` is the default) |
| `nar` | page | narrative status list | all | Contested status chips |

- **Precedence of lighting in the canvas:** `path` > `claim` > ledger-row hover > `focus`
  > hover. Only one lit set is shown at a time. The in-frame status line names which
  one it is.
- **Reset** clears only the keys GraphExplorer owns plus `claim idx via table`. It does
  not clear `dom`, `nar`, `bsort`, `isec` or `sup`. This needs a new `ownKeys` prop,
  because today reset wipes every param.
- **An unknown id in `sel`, `focus`, `path` or `claim`** is ignored, and one amber line
  appears above the canvas: "The linked item `{id}` is not in this version of the
  register. It may have been renamed, superseded or withdrawn — see the table twin with
  superseded rows on." Old links then fail visibly, not silently.

---

## 4. Page anatomy

Desktop, ≥ 1280px. The stage breaks out of the house `max-w-[1180px]` to
`max-w-[1560px]`. Prose stays at 72ch.

```
┌ Kicker · PageTitle · one-line Standfirst · Byline ────────────────────── ≤ 150px ┐
├ DenominatorStrip (sticky) ────────────────────────────────────────────────────────┤
├ DomainStrip: [All] [Coal 64] [Mining 31] [Oil & gas 40] … [Nuclear — not yet]    ┤
│ Start from a listed company: [ symbol / name … ]            412 → 64 claims       │
├───────────┬────────────────────────────────────────────┬──────────────────────────┤
│ RAIL 15rem│ CANVAS  (GraphExplorer → ForceGraph)       │ MARGIN 22rem             │
│ search    │ height clamp(560px, 100vh − 15rem, 860px)  │ rest: How to read (5 ln) │
│ tier      │                                            │       What the record    │
│ family    │   in-frame status line (bottom-left)       │       does not show      │
│ relation  │   camera controls (bottom-right)           │ node: NodeCard           │
│ ₹ min     │                                            │ claim: ClaimCard         │
│ index     │                                            │ path: PathCard           │
│ reset·copy│                                            │ listed co: CompanyTrail  │
│           ├────────────────────────────────────────────┤                          │
│           │ shape legend = type filter                 │ (margin scrolls inside   │
│           │ SCRUBBER: year bars · undated bin          │  itself; sticky top-12)  │
│           │   coverage ribbon (per domain)             │                          │
│           │   tenure lane (when sel is an institution) │                          │
├───────────┴────────────────────────────────────────────┴──────────────────────────┤
│ [Show table] → table twin (table=1)                                               │
├ From the benchmark — IndexDock ×(1–3) + sector 2×2                                ┤
├ Who is recorded as benefiting — BenefitLedger                                     ┤
├ Contested — allegations beside their responses · narratives by status             ┤
├ Would the same lens alarm us elsewhere — base rates · symmetry checks             ┤
├ Gaps (GapsPanel) · Killed in audit                                                ┤
└ Sources (SourceLedger) · TierLegend · Footnote (standing) · links out             ┘
```

The canvas top edge must sit above the fold at 1280×800: header ≤ 150px, strip ≈ 36px,
DomainStrip and company box ≈ 72px, which leaves ≥ 540px of canvas visible.

---

## 5. Section by section

### 5.1 Header (existing `Editorial`)

- `Kicker`: `Energy & natural resources · the power map`
- `PageTitle`: **Who decides over energy, and who is recorded as gaining**
- `Standfirst` (two lines at desktop, ≤ 140 characters): "Every line is one sourced
  claim with its evidence tier. Click one and the margin shows who it benefits, who
  held the office, and what they said in reply."
- `Byline`: `{files} research files · {entities} entities · {claims} claims · as of {asOfOldest}{–asOfNewest if different}`.

### 5.2 `DenominatorStrip` (existing, sticky)

`asOf` = the **oldest** file `asOf`, never the newest alone. `filtered = { from:
drawableClaims, to: visibleClaims }`. Facts, in this order (mobile keeps 1–3 and the
filtered chip):

| # | n | of | label |
|---|---|---|---|
| 1 | visible claims (drawn, excluding contras) | drawable claims | `claims` |
| 2 | alleged claims with ≥ 1 response in `ANSWERS` or as a pair-contra | alleged claims | `allegations answered` |
| 3 | voids (respecting `dom`) | — | `documented voids` |
| 4 | visible entities | merged entities | `entities` |
| 5 | claims with `benefit.who` | drawable claims | `name a beneficiary` |
| 6 | per index key: constituents with ≥ 1 direct visible claim | constituents (50 / 30 / 50) | `{Nifty 50} touched` (omitted without `indices.json`) |
| 7 | undated visible claims | visible claims | `undated — shown in any window` (only when `from`/`to` is set) |
| 8 | orphan claims | drawable + orphans | `not drawn — endpoint unresolved` (only when > 0) |

### 5.3 `DomainStrip` (new)

This is a row of toggle chips, one per domain, in `EXPECTED_DOMAINS` order followed by
any unexpected slugs. It sits above the canvas and spans the stage width.

- Chip content: `Coal` · claim count in mono · a tier line with four tiny samples, each
  a 14px line drawn in the tier's dash plus its count, `—— 22 ‐‐ 18 ·· 9 ─·─ 3` · voids
  count `◌ 4 voids`.
- **Absent domain** (expected, no file): the chip is disabled, gets the no-data hatch
  (the same pattern as `IndiaMap` no-data), and reads `Nuclear — not yet researched`.
  It is never shown as `0`.
- Multi-select writes `dom`. "All" is the unset state. Each chip is a button with
  `aria-pressed`.
- Live denominator at the right end of the row: `412 → 64 claims`.
- Chips do **not** colour anything in the graph. Domain has no channel inside the canvas
  (§6). It is a filter and a margin label only.

**Start from a listed company** is a combobox on the same row, right-aligned. It searches
index constituents (all keys in `indices.json`) by NSE symbol, BSE code and name. On
Enter it sets `sel=<existingId>`, `focus=<existingId>` and `hops=2`, and the margin
switches to `CompanyTrail`. It lists only constituents. A constituent whose
`existingId` is null is listed as `name — not in dataset` and opens the "not in dataset"
margin state (§9). It is disabled when `indices.json` is absent, with the inline text
"index list not loaded".

### 5.4 The stage: `GraphExplorer`, extended

```tsx
<GraphExplorer
  nodes={visibleDomainNodes}           // after dom and idx/via (page-level filters)
  edges={visibleDomainEdges}
  height={stageHeight}
  layout="stage"                       // NEW: rail | canvas | margin grid
  urlClaim                             // NEW: edge click writes `claim`; EdgeCard pinned from URL
  answers={ANSWERS}                    // NEW: explicit claim-id denial joins, merged into denialIndex
  nodeCap={indexCap}                   // NEW: (n) => IndexCell[] | null
  highlight={ledgerHover}              // NEW: { nodes, edges, caption } | null
  renderMargin={(ctx) => <EnergyMargin {...ctx} />}   // NEW: replaces the bottom detail panel
  renderEdgeExtra={(e) => <BenefitLine e={e} />}      // NEW: extra rows in the hover EdgeCard
  railExtra={<IndexRailControl />}     // NEW: slot at the bottom of the rail
  timelineExtra={<CoverageRibbon /> + <TenureLane />} // NEW: slot under the scrubber
  statusExtra={energyStatusLines}      // NEW: extra lines in the in-frame status
  ownKeys={[…]}                        // NEW: what reset may clear
/>
```

All new props are optional, so the four existing callers (`Atlas`, `Allocation`,
`Cabinet`, `Conglomerates`) are unchanged. `ctx` passed to `renderMargin` is:

```ts
type MarginCtx =
  | { kind: 'rest' }
  | { kind: 'node'; id: string; edges: GEdge[] }                       // sel
  | { kind: 'claim'; edge: GEdge; answeredBy: GEdge[] }                // claim
  | { kind: 'path'; seq: string[]; count: number; hops: number;
      median: { hops: number; seeds: number } | null;
      status: 'found' | 'none' | 'hidden'; missing?: string[] }        // path
```

`claim` wins over `sel` in the margin. Closing the claim card returns the margin to
`sel`, and then to rest.

**Canvas behaviour (existing, kept):** the ego focus hides everything outside the
neighbourhood without re-running layout. A denial whose far end lies outside the focus is
pulled in and counted. The path dims everything off the path. The >220-entity amber
warning stays. Maximise (`f`) uses `ExpandShell`, and the margin **comes with it** as a
right-hand column inside the overlay. A maximised graph without its margin would be a
screenshot with the epistemics stripped.

**Hover, node** (new small card, positioned at the cursor, never covering the node):
label · `sub` · type and family in words · index membership in words ("Nifty 50 ·
Sensex 30 · not Sensex 50, as of {indices.asOf}") · `{n} claims: 3 documented ·
2 reported · 1 alleged` · `{k} responses recorded to claims touching it` in rose text
if k > 0 · `click: details · shift-click: path end`.

**Hover, edge** (existing `EdgeCard`, extended with `renderEdgeExtra`):
- predicate label, `TierChip`, a 24px sample of the edge's own dash, `from – to` or
  "undated", `₹{a} cr` or "no amount recorded".
- `BenefitLine`: `Benefits: {who label} — {how}` · `₹{amountCr} cr ({confidence})`, or
  `amount unknown`. If `benefit.who` is not an endpoint: "(named by the claim; not
  joined by any edge)". If there is no `benefit`: "no beneficiary recorded".
- Responses: `{n} responses` in rose, or `no response recorded` in muted text. An
  `alleged` edge with no response adds " — a defect the contract forbids; listed in
  Gaps".
- `innocentReading`, if present, in full, never cut.
- `click to open the claim`.

**Click an edge** → `claim=<id>`. The canvas lights the claim, its denier nodes, the
contra connectors (§6), and the office-holders from the date test. Everything else takes
the existing dim opacity. `benefit.who`, when it is not an endpoint, is lit **without a
connecting line**, and an on-canvas text tag appears beside it: `named beneficiary of
{claim lab}`. No edge is invented.

**In-frame status line** (ForceGraph `status`, bottom-left). It stays on screen when
maximised and when screenshotted:
1. `{visibleClaims} of {drawable} claims · {entities} entities · as of {asOf}`
2. `line style = evidence tier: ── documented  ‐ ‐ reported  · · alleged  ─·─ analytic · rose = a response`.
   This is drawn with real SVG dash samples, not glyphs.
3. When `claim` is set: `lit: claim {id}, {n} responses, office-holders on {date}`.
4. When `path` is set: `path {hops} hops · 1 of {count} equally short · median in this view {m}`.
5. When `from`/`to` is set: `{u} undated claims shown regardless of the window`.
6. Existing camera help line.

### 5.5 The margin: `EnergyMargin` (new)

The margin is sticky at `top-12` (below the strip), `max-h-[calc(100vh-4rem)]` with
internal scroll. It is never truncated behind "show more". It scrolls instead.

**Rest** (nothing selected):
1. **How to read this graph**, in five lines at 13px:
   - "Each line is one claim with a source, or an allegation or analysis marked as such."
   - "Line style is the evidence tier. Rose is a response from the party concerned."
   - "Colour is the kind of actor. Shape is the type of entity. Size was declared by a
     researcher, not computed."
   - "Public power is pulled to the left and private capital to the right. Beyond that,
     position means nothing."
   - "An edge between two entities is not an accusation. A beneficiary is not an
     allegation."
2. **What the record does not show**: every void for the active `dom`, grouped by domain,
   `what` at 15px (the same size as a claim statement), `whyItMatters` at 14px, `Cite`.
   Heading note: `{n} documented voids — absences that were looked for`. With zero voids
   in scope it reads: "No void was recorded for {domains}. That means none was written
   down, not that none exists."

**Node** (`sel`):
- `NodeCard`: label (editorial heading), `sub`, identity lines (office-with-dates, CIN,
  NSE, DIN, only those present), `publicRole`, `resolved: false` warning (existing
  style), every `d` fact with its tier marker rendered as a `TierChip`, full `Cite`.
- Actions: `focus 1 · 2 · 3 hops` (writes `focus` and `hops`) · `path to…`, a combobox
  of visible entities that writes `path=sel,x`, which is the keyboard and touch
  equivalent of shift-click.
- **Claims touching it**: grouped by predicate in `PRED_LABEL` order. Each row has a
  `TierChip`, the other party, `lab`, date, ₹, and a rose response count. A row click
  writes `claim`.
- If the node is an institution (`ty` ministry, agency or psu): **Who held this office**,
  listing the `role` claims into it (person, from–to or "in office as of {asOf}",
  `TierChip`). The same data draws the tenure lane under the scrubber.
- If the node is a listed company or a group: `CompanyTrail` (below) replaces "Claims
  touching it".
- **Voids** for the node's domains, collapsed to their `what` lines.
- Links out when the id matches: `/company/:id` (in `companies.ts`), `/conglomerates/:id`
  (in `conglomerates.ts`), `/resources?q={label}` (for coal and mineral winners, as
  plain search text), `/pmcares` (if a `pmin` or `pmout` edge goes to PM CARES's id).

**Claim** (`claim`), using `ClaimCard`:
- Top line: predicate label · `TierChip` · `from – to` · `domain`.
- `s → t` labels, clickable (writes `sel`).
- `d` at 15px.
- `₹{a} cr` — "the amount recorded on the claim; its kind is stated in the text above".
- **Beneficiary block**: `who` (label, or the raw id with "not a node in this graph"),
  `how`, `₹{amountCr} cr`, and `confidence` written out as a word (`documented`,
  `estimated`, `unknown`). It is not coloured.
- **Response block**, same font size and weight as `d`, with a 2px rose left rule. For
  each answer: the denier label, the contra `d`, `TierChip`, `Cite`. With none: "No
  response recorded." For `alleged` it adds: "The contract requires one. Its absence is
  listed in Gaps."
- **Date test**: "On {from}, {institution} was held by {person} ({from}–{to}) [tier]."
  The institution is resolved from `role` claims into `s`, or into `t` if `s` is a
  person. With no role claim covering the date: "No dated office claim covers {from}.
  The date test cannot be run from this record." If undated: "Undated — the date test
  cannot be run." Holding office is never phrased as making the decision (§8).
- `innocentReading`, `upgradeIf`, `killIf`, each labelled, in full.
- Supersession: "Supersedes {id} (retained, not drawn)" and "Superseded by {id}" as
  links that write `claim`.
- Full `Cite`.
- **Base rates recorded by the {domain} sweep**: that file's `baseRates` as
  `numerator of denominator — label`. There is no per-predicate join, because the
  contract gives none. The heading says "from the same research file".

**Path** (`path`), using `PathCard`:
- The sequence, one row per hop: entity → `PRED_LABEL` · `TierChip` for **every**
  parallel edge on that hop → entity.
- `{hops} hops · 1 of {count} equally short paths` (from `shortestPath().count`). When
  `count > 1`: "The chain shown was picked by edge order from {count}. Its particular
  intermediaries mean nothing."
- `median separation in this view: {m} hops (from {seeds} evenly spaced entities)`.
  Printed directly under the path length at the same size, never alone.
- The existing direction-ignored caption.
- `status: none` → "No path exists between these two in the current view." `hidden` →
  "{label} is outside the current filters."

**Listed company or group**, using `CompanyTrail`:
- Header: name · NSE symbol / BSE code (mono) · `companies.ts` sector · index
  membership in words with `indices.asOf`.
- **Group** line: if a `grp:` node has an `own` claim into it: "Held by {group} (claim
  {id}, {tier})". Toggle `include the group's claims` writes `via=group`. Default off.
- **A. Public decisions touching it**: claims whose other endpoint has `fam` state or
  enforce and whose `pred` is award, law, enforce or pmout, grouped by institution.
  Groups are **alphabetical by institution label**, and rows within a group are by
  date. Row: date · predicate · `lab` · `TierChip` · ₹. Rows from the group (with
  `via`) are prefixed `via {group}`.
- **B. Money it sent**: claims with `s` = the company (or the group, with `via`) and
  `pred` bond, trust, direct, csr or pmin, sorted by date. Row: date · recipient ·
  predicate · ₹ · `TierChip`.
- **C. Allegations**: count and list of `alleged` claims touching it, each with its
  response count.
- Caption under A and B (§8, "Company trail").
- Empty A and B: "No claim in this register touches {name}. This register researched
  energy and resources, so absence here is not clearance." Plus a link to
  `/company/:id`.

### 5.6 Scrubber and its lanes (existing scrubber, extended)

Keep the existing dual-handle scrubber with year bars (claims by year of `from`). Add:

- **Undated bin**: a separate box after the last year, separated by a 12px gap and
  labelled `undated {n}`. It is always drawn in the in-range style, because undated
  claims are never filtered by time.
- **Coverage ribbon** (`timelineExtra`, when more than one domain is visible): one 3px
  row per domain, a line from its earliest to its latest dated claim, with the domain
  label at the left in 10px mono. A domain with no dated claim gets a hatched full-width
  row and the text `no dated claims`. This keeps a reader from reading "2014–2026" as
  every domain's range.
- **Tenure lane** (`timelineExtra`, only when `sel` is an institution with `role`
  claims): one bar per office-holder, from `from` to `to ?? asOf`. The outline dash is
  the role claim's tier. The label is the person's name. There is **no party colour**.
  An open tenure ends square with `in office as of {asOf}`. A gap between bars is drawn
  as empty track with no label (see the caption).
- When `claim` is set, a 1px vertical rule marks `claim.from` across bars, ribbon and
  lane.

### 5.7 Table twin (existing, extended)

- The "Show table" button sits under the scrubber at every breakpoint and writes
  `table=1`. The table reads exactly the drawn set, including focus and path, as it does
  today.
- Columns: claim id · domain · from → pred → to (labels) · tier · ₹ · date window ·
  beneficiary · how · benefit ₹ · confidence · responses (count and denier labels) ·
  superseded by · sources (**all**, not the first). Row click writes `claim`.
- `sup=1` adds superseded claims as rows marked `superseded by {id}`. Orphan claims
  always appear at the end, marked `endpoint not in platform — not drawn`.
- Paging: the existing 400-row cap with its "narrow the filters" line stays.

### 5.8 From the benchmark: `IndexDock` (new)

`Section` title **"From the benchmark"**, note `membership as of {indices.asOf} ·
{source label} · click a company to open it in the graph`.

- One grid per index key in `indices.json` (Nifty 50, Sensex 30, Sensex 50, in file
  order, at most three; more than three is pushed as a gap). The grids sit side by side
  at ≥ 1280px and stack below that.
- Cells are 10 columns × n rows, **alphabetical by NSE symbol** (BSE code if there is no
  NSE symbol). They are never ordered by claim count. A cell (≈ 72×40) shows the symbol
  in mono, then `{direct}` and, if any, `+{via} via group`.

| cell state | encoding | meaning |
|---|---|---|
| direct ≥ 1 | fill `bg-text/10`, 1px `border-border-light` | the company's id is an endpoint of ≥ 1 visible claim |
| via group only | outline + 4px filled square in the top-right corner | only an owning group appears, joined by an `own` claim |
| none | outline only | no claim recorded in these files |
| `existingId` null | no-data hatch + `not in dataset` | the platform has no company record to join. It is no data, not zero |
| sector ∈ `ENERGY_SECTORS` | 2px underline under the symbol | an energy-sector company by the declared rule |

- Toggle **energy sectors only** (`isec=energy`) with a live `50 → 11` count beside it.
- A click on a cell writes `sel`, `focus` and `hops=2`, scrolls the stage into view, and
  the margin shows `CompanyTrail`.
- Under the grids is the **sector 2×2** per index (`DataTable`): rows are energy sector,
  other sector, and not in dataset. Columns are ≥ 1 direct claim and none. The heading
  is "The expected result: an energy register touches energy companies."
- The rail control `idx` (radio `none | {index keys}`, plus the `via group` checkbox)
  keeps claims touching constituents. It shows `412 → 37 claims` live. It is disabled
  with the text "index list not loaded" when the file is absent.

### 5.9 Who is recorded as benefiting: `BenefitLedger` (new)

`Section` title **"Who is recorded as benefiting"**, note `per claim · amounts are
never summed`.

- One group per distinct `benefit.who` among visible claims, with nested claim rows.
  Group header: beneficiary label (click writes `sel`), `sub`, index membership in
  words, `{n} claims` with per-tier counts shown as `TierChip`s.
- Claim row: `lab` · predicate · date · `benefit.how` · `₹{amountCr} cr` ·
  confidence as a word · `TierChip` · response count · "beneficiary is an endpoint:
  yes/no".
- **Hovering or focusing a group or a row lights its claims in the canvas** (the
  `highlight` prop), when the stage is in view. Clicking a row writes `claim` and
  scrolls up.
- Sort (`bsort`): `name` (default) · `amount` (largest single documented `amountCr`,
  nulls last) · `claims` (count). **The default is name** because this ledger lists
  named, real entities, and a default sort by money is a ranking of beneficiaries that
  the reader did not ask for. Sorting by amount is one click away, and that amount
  exists outside the app.
- A group with no documented amount says `no documented amount`. It never shows `0`.
- `ConcentrationCurve` (existing) appears beside the ledger only when ≥ 5 beneficiaries
  have a documented amount. It is fed the largest documented amount per beneficiary,
  `label="largest documented single benefit per beneficiary"`. Otherwise the slot reads:
  "Fewer than five beneficiaries have a documented amount. That is too few for a curve to
  mean anything."
- `Callout tone="bottomline"` labelled **"A beneficiary is not an allegation"**: "An
  award has a winner by construction. A tariff order has a party whose tariff changed.
  Naming who gained is arithmetic. Whether the gain was intended, improper or ordinary is
  a separate claim, which appears in the graph as `alleged` with its response, or not at
  all."

### 5.10 Contested (house chrome: the contested panel)

`Section` title **"Allegations beside their responses"**, note `{answered} of {alleged}
alleged claims carry a recorded response`.

- One `ContestedFact` (existing) per `alleged` claim, grouped by domain.
  `question` = the claim `lab`. Position 1: `who` = the asserting party, from the
  claim's `d`, else "the claim as recorded"; `claim` = `d`; `srcs`. Position 2:
  `who` = the denier label; `claim` = the contra `d`; `srcs`. **With no response,
  position 2 renders at the same size**, with who = "No response recorded" and claim
  = "Whether the party was asked is not recorded in this file." (or the file's own
  wording if `d` says "declined" or "not asked"). `unresolved` = `upgradeIf` and
  `killIf`.
- Each block has a link "open in graph", which writes `claim`.
- **Narratives, and how each stands**: a status count line in ladder order (zeros
  printed) and filter chips (`nar`). Each card shows the narrative `claim` at 16px and
  a six-cell ordinal status bar (position = status; the filled cell is this narrative's
  step). Under it, `strongestCase` and `strongestCounter` side by side, then "What would
  change this", then `Cite`. There is no colour by status, and `debunked` is not rose.

### 5.11 Would the same lens alarm us elsewhere?

- `BaseRateTable` (new): property · `numerator of denominator` (mono) · rate · a bar on a
  shared 0–100% scale · what the denominator is · domain · sources. A denominator of 0
  gives "not a rate (denominator 0)" and no bar.
- `SymmetryPanel` (new): one `Callout tone="note"` per file, labelled "Symmetry check —
  {domain}", with `symmetryCheck` verbatim. A file without one gets
  `Callout tone="warn"` labelled "No symmetry check — {domain}", with a gap pushed.

### 5.12 Gaps, killed claims, foot

- `GapsPanel` (existing, same type size as findings). It holds every file's `gaps[]` in
  full (**no 200-character split**, unlike `Resources`), plus the derived gaps: absent
  expected domains, orphan claims, entity-type conflicts, alleged claims with no
  response, missing symmetry checks, index file absent, more than three indices, and
  domain slug mismatches. Note: "Absence here is a result. A company with no claim in
  this register may simply not have been researched."
- **Killed in audit**: `DataTable` of claims with `status: 'killed'` if the promotion
  step adds that field. It is shown even when empty, with "No claim was killed, or no
  audit has run. The audit log says which."
- `SourceLedger` (existing): the merged file `sources`, deduped by URL. `primary` is set
  by the `/gov\.in|nic\.in|sci\.gov\.in|sebi\.gov\.in|cag\.gov\.in|cercind|bseindia|nseindia|indiacode|sansad/i`
  test. `retrieved` = the file's `asOf`.
- `TierLegend`, then `Footnote` with the HANDOFF "Standing" paragraph and "Nothing on
  this page asserts that any named person committed an offence."
- Links out, one line: "Located assets such as coal and mineral blocks are mapped on
  /resources · tenders on /tenders · the allocation graph on /allocation · PM CARES on
  /pmcares · group deep-dives on /conglomerates."

---

## 6. Visual encodings: what each channel means

**Frozen**: the developer may not restyle any of these to fit.

| mark | channel | means exactly | never means |
|---|---|---|---|
| edge | `strokeDasharray` | tier: documented solid · reported dashed · alleged dotted · analytic dot-dash (the `TIERS` values in the schema) | anything else |
| node | hue (`FAMILY_COLOR`) | family: public power · private capital · recipients · instruments · regulators & courts · markets | domain, party, sector, "suspicious" |
| node | shape (`shapeClassOf(ty)`) | entity type class | — |
| node | size (`sz`) | the researcher's declared band 1–4, first file wins | degree, centrality, importance |
| edge | rose `#c45b5a` | a response or counter-evidence (`contra`) | bad, suspicious, loss |

**Platform-consistent, not frozen, but may not be repurposed:**

| mark | channel | means |
|---|---|---|
| edge | width `0.7 + min(2.4, √a / 26)` | the ₹ on the claim, of mixed kinds. It saturates above ≈ ₹3,900 cr. Captioned |
| node | x-position bias (`forceX` by family) | public power pulled left, private capital right. **Captioned**, because it is a positional echo of hue |
| node | dashed outline, 0.25 fill | identity not confirmed (existing) |
| node | gold ring | pinned by the reader (existing) |
| any | dim opacity | outside the current lit set (focus / claim / path / ledger hover) |

**New on this page:**

| mark | channel | means |
|---|---|---|
| node | index cap: up to 3 cells, 7×3px, 1px gap, at `y = −r − 5`, fill `#e8e4dc` at 0.85 | cell i = index key i in `indices.json` order. Filled = member as of `indices.asOf`, outline = not a member. No cap = not an index-listed company |
| edge midpoint | rose perpendicular tick, 8px, `strokeWidth 1.5`, dash = the contra's tier | this claim has a recorded response (`ANSWERS`) |
| rose connector | denier → the answered edge's midpoint, dash = contra tier. Drawn only when the denier is not an endpoint, and only while the claim is lit or the denier is focused | who answered. Otherwise the tick alone carries it, to avoid a rose web |
| canvas text tag | `named beneficiary of {lab}` beside a lit, unconnected beneficiary | a beneficiary the claim names without an edge |
| scrubber | tenure-bar outline dash | tier of the role claim |
| dock cell | fill / corner square / hatch / underline | direct / via group / not in dataset / energy sector |
| narrative bar | position of the filled cell | status on the six-step ladder |

The contra visibility rule: **a response is visible whenever the claim it answers is
visible.** The `tier` and `pred` filters never hide the answer to a visible claim.

---

## 7. Filters and their effect on the denominator

| control | where | writes | live denominator text beside it | honesty note on the control |
|---|---|---|---|---|
| domain chips | above the canvas | `dom` | `412 → 64 claims` | absent domains shown hatched, never as 0 |
| company box | above the canvas | `sel focus hops` | none (focus only) | "constituents only; {k} not in dataset" |
| search | rail | `q` | existing `{n} of {m} relationships shown` | — |
| tier | rail | `tier` | per-tier counts (existing) | "responses to visible claims are never hidden" |
| family | rail | `fam` | as above | — |
| relationship | rail | `pred` | as above | — |
| ₹ minimum | rail | `min` | `{n} claims have no amount and are hidden while min > 0` | shown while `min > 0` |
| index | rail slot | `idx`, `via` | `412 → 37 claims` | "membership as of {date}, not as of each claim's date" |
| scrubber | under the canvas | `from`, `to` | `{u} undated always shown` | the coverage ribbon shows per-domain range |
| energy sectors only | dock | `isec` | `50 → 11` per grid | "sector as recorded in companies.ts; rule: Energy, Utilities, Metals & Mining" |
| ledger sort | ledger | `bsort` | — | "amount = largest documented single figure; others not summed" |
| narrative status | contested | `nar` | status count line | — |
| include superseded | table twin | `sup` | row count | — |

**No `benefit.how` filter.** It is free text, and keyword-matching it is name-matching by
another route. It can be offered if the contract adds a mechanism enum (the cui-bono §2
taxonomy).

---

## 8. Captions the page must carry

These are verbatim, with interpolations in braces. Each one is placed where the graphic
it qualifies is.

- **Under the canvas, always visible** (not in a tooltip): "An edge is a sourced claim,
  not a measure of influence. Public power is pulled left and private capital right;
  otherwise where a node sits is produced by the layout and means nothing. Size was
  declared by a researcher, not computed from connections. Edge width is the ₹ recorded
  on the claim, and that figure's kind varies — a contract value, a tariff, a bond, an
  outlay — so widths compare only within one kind of claim. A thin edge may have no
  amount recorded. A dense cluster usually shows where research effort went."
- **Scrubber**: "Bars count claims by the year they begin. A year with no bar is a year
  in which nothing was recorded, not a year in which nothing happened. Undated claims
  are never hidden by the window."
- **Tenure lane**: "Drawn only where a dated office claim exists. A gap between bars is
  a gap in the record, not a vacancy in the office."
- **ClaimCard date test**: "Holding the office on the date is what the date test
  requires. It is not evidence that the office-holder made or influenced the decision."
- **Unconnected beneficiary**: "The claim names {who} as beneficiary. No edge in the
  record joins them to it, and none is drawn."
- **Path**: (existing direction-ignored caption) plus "A path this short is
  {≤/above} the median for this view."
- **Company trail**: "These two lists are kept apart on purpose. Putting a company's
  payments and the decisions that touched it on one timeline invites a reading — that
  one bought the other — which this register cannot test. Testing it needs every award
  set against every donor with a date-shuffled control, and that has not been run (see
  Gaps). Decisions are listed where the company or its group is a party to the claim;
  sharing a state or a sector is never a connection."
- **Index dock**: "Membership as of {asOf} from {source}. It says nothing about
  membership on the date of any claim. A constituent with no claim was not necessarily
  examined: this register was built by researching energy and resources, so banks and IT
  firms are absent because nobody looked, not because they were cleared. 'Via group'
  means an owning group appears; the company itself does not."
- **Benefit ledger**: "Amounts are not added up. Two claims can describe the same money,
  and a contract value, a tariff saving and an outlay are different quantities.
  'Estimated' is the researcher's estimate as recorded. 'Unknown' is unknown, not zero."
- **Narratives**: "Status is the research sweep's calibration on the evidence it found,
  not a verdict of any court or regulator."
- **Base rates**: "A property shared by most comparables is a fact about the category,
  not about any one member of it."
- **Margin at rest, under the voids**: "Voids have no line in the graph because an
  absence has no endpoints. They are listed here, beside it, because a graph that can
  only draw what exists overstates the case."

---

## 9. Loading, empty, partial and no-data states

| state | render |
|---|---|
| **Loading** | The route chunk uses the existing `Suspense` fallback. The data is compiled in and the layout runs a fixed tick count, so there is no data-loading state and no spinner. The canvas fades in with no animation; under `prefers-reduced-motion` there is no settle animation at all. |
| **No energy files** | Header and strip (`0 claims · as of —`). A `Callout tone="warn"`: "The energy register has not been promoted yet. Nothing below is zero. It is absent." The stage frame is drawn at canvas size with that sentence centred inside it, and no rail or margin. DomainStrip shows every expected domain hatched. Dock, ledger, contested and base rates are omitted. GapsPanel and SourceLedger render. **`npm run smoke` must pass in this state.** |
| **Filters leave 0 claims** | The canvas shows (existing) "No entities match these filters." plus the active filters in words and `412 → 0`, with a "reset filters" button. The margin keeps its rest state, so voids stay visible. |
| **Partial: some domains absent** | Hatched chips. Strip unchanged. A one-line note above the canvas: "{k} of {K} planned domains are researched: {list}. The graph covers only these." Gaps lists the missing ones. |
| **Partial: dates** | Coverage ribbon, undated bin, strip fact 7. A domain with no dated claims gets a hatched ribbon row. |
| **Partial: file dates differ** | Strip and byline show the oldest–newest range. Each claim card shows its own file's `asOf`. |
| **Partial: no `indices.json`** | Company box and rail `idx` disabled, with "index list not loaded". No cap on any node. The dock is replaced by `Callout tone="note"`: "Index membership is not loaded. The benchmark view is absent, not empty." A gap is pushed. |
| **Partial: `existingId` null** | Dock cell hatched `not in dataset`. The company box entry opens the margin with "{name} is a {index} constituent the platform has no company record for, so nothing can be joined to it. Listed in Gaps." |
| **Partial: benefit missing** | EdgeCard: "no beneficiary recorded". Strip fact 5 shows the ratio. The ledger omits those claims and notes "{k} claims name no beneficiary". |
| **Partial: alleged without response** | `ContestedFact` second position at equal size. Gap pushed. |
| **Unresolved entities** | Drawn (existing dashed outline) with no edges. The table twin lists them under "identity not confirmed". |
| **Orphan claims** | Not drawn. Strip fact 8. Listed in the table twin. |
| **Unknown id in URL** | The amber line (§3.3). |
| **Company with no claims** | The `CompanyTrail` empty text (§5.5). |
| **Path: none / hidden** | `PathCard` text (§5.5). |
| **Zero voids / zero narratives / zero base rates** | Each section renders with a one-sentence statement of the absence. None is silently omitted. |

---

## 10. Mobile and narrow widths

| width | layout |
|---|---|
| ≥ 1280 | rail · canvas · margin, as §4 |
| 1024–1279 | rail · canvas. The margin drops **directly under the scrubber** at full width, split into two columns (card left, voids right) |
| 640–1023 | The rail becomes a `<details>` above the canvas, with the summary `Filters · {active} active · 412 → 37 claims` in flow (not a modal). Canvas full width, height 560. The margin sits under the scrubber |
| < 640 | Header. The strip shows facts 1–3 and the filtered chip. DomainStrip scrolls horizontally inside its own container. The company box is full width. Filters sit in a `<details>` in flow. Canvas height `min(440px, 65vh)`. The in-frame status keeps lines 1, 2 and 5 only; the help line moves under the canvas. Margin under the scrubber |

Touch on the canvas: tap a node to select it (sets `sel`, card below). Tap an edge to
open the claim (8px hit stroke, existing). There is no hover card. The hover content is
in the margin card. The path is set through "path to…" in the NodeCard, because
shift-click has no touch equivalent. Maximise (`f` or the button) opens `ExpandShell`,
and on < 1024 the margin card becomes a bottom sheet inside the overlay (40vh, scrolls
internally). The dock shows 5 columns per grid. The ledger and the table twin scroll
horizontally inside their containers. There is no horizontal page scroll.

---

## 11. Denominators shown, and where

- Strip: claims, answered allegations, voids, entities, named beneficiaries, index
  touch per index, undated, orphans (§5.2).
- DomainStrip: claims per domain, per-tier counts, voids per domain, and the live
  `N → n`.
- In-frame status line: `n of N claims`, entities, `asOf`, undated count.
- Rail: per-tier counts, `{n} of {m} relationships shown`, no-amount hidden count,
  `idx` `N → n`.
- Scrubber: per-year counts, the undated bin.
- PathCard: `1 of {count}` shortest paths, the median with its seed count.
- Dock: per grid, `{direct} of {50} touched · {via} via group · {nulls} not in
  dataset`, and the 2×2.
- Ledger: `{beneficiaries} beneficiaries across {claims} claims · {k} claims name no
  beneficiary`.
- Contested: `{answered} of {alleged}` answered, and the narrative status counts.
- Base rates: `numerator of denominator` on every row.

---

## 12. What the page refuses to show, and why

- **No map lens, and no GeoNetwork view.** `st` is the registered office. NTPC is
  Delhi-registered and Coal India is Kolkata-registered, while their plants and mines
  are elsewhere. Placing claims on a map would assert a geography the record does not
  hold. Located assets live on `/resources`. *This can be reopened* if the contract adds
  a per-claim `site` (state code of the block, plant or line). A map would then be
  admissible for claims with a site, with "no site recorded" shown as a count.
- **No aligned timeline of a company's payments and the decisions touching it.** It is
  the most persuasive picture this page could draw and the one it can least support. The
  test that would support it (every award against every donor, with a date-shuffled
  control: HANDOFF priority 1) has not been run.
- **No "ministry exposure" number**, and no count-based ranking of institutions per
  company. "Exposure" is a score by another name. The trail lists claims, alphabetically
  by institution.
- **No influence, centrality, degree or "most connected" score**, and no sizing or
  ordering by one. In a researched graph, degree measures research attention.
- **No community detection or cluster colouring.** An algorithmic cluster drawn as a
  group reads as a cabal (the hub and small-world traps in the pattern-discipline skill).
- **No benefit totals** in any view, tooltip, card or table-twin footer.
- **No index weight or "% of Nifty exposed".** Free-float weights are not in the dataset,
  and summed market cap is not the index.
- **No share-price line against claim dates.** An event study needs daily closes, a
  market model and pre-registered windows. Recorded as a gap.
- **No party colour and no party aggregation.** Party appears only as text on a tenure
  bar, and only when a `role` claim backs it.
- **No colour meaning suspicious.** Rose is only for responses.
- **No edge that the record does not contain**: no beneficiary line, no co-location edge
  (same state or sector), no inferred ownership.
- **No path as a finding.** A path is always printed with its count of equal paths and
  the median.
- **No default selection**, no pre-focused entity, no "featured" company, and no
  default ledger sort by money.
- **No decorative effects**: no glow, no animated particles on edges, no gradient
  fills, no drop shadows.

---

## 13. Build estimate

**Create**

| file | contents | est. lines |
|---|---|---|
| `src/graph/energy.ts` | glob load, merge, hydrate, `CLAIM_META`, `ANSWERS`, `ORPHANS`, derived gaps (or extend the sibling module) | 200 |
| `src/data/energy.ts` | `EXPECTED_DOMAINS`, `ENERGY_SECTORS`, selectors: `visibleByDomain`, `benefitGroups`, `officeHoldersOn`, `companyTrail`, `indexCells`, `sectorTwoByTwo`, `coverageByDomain`, `tenureLane`, `ledgerEntries`, `energyGaps` | 260 |
| `src/data/indices.ts` | glob `indices.json`, `constituents(key)`, `capFor(nodeId)` | 70 |
| `src/components/energy/EnergyMargin.tsx` | `EnergyMargin`, `NodeCard`, `ClaimCard`, `PathCard`, `CompanyTrail`, `VoidList`, `ReadingKey` | 480 |
| `src/components/energy/DomainStrip.tsx` | chips and the company combobox | 140 |
| `src/components/energy/IndexDock.tsx` | grids and the 2×2 | 150 |
| `src/components/energy/BenefitLedger.tsx` | grouped ledger, sort, highlight callbacks, curve slot | 180 |
| `src/components/energy/Calibration.tsx` | `NarrativeCard`, `BaseRateTable`, `SymmetryPanel` | 170 |
| `src/components/viz/TimelineLanes.tsx` | `CoverageRibbon`, `TenureLane` (SVG sharing the scrubber's x-scale) | 150 |
| `src/pages/Energy.tsx` | page composition, URL wiring, states | 360 |

**Modify**

| file | change | est. lines |
|---|---|---|
| `src/components/viz/GraphExplorer.tsx` | optional props `layout="stage"`, `urlClaim`, `answers`, `nodeCap`, `highlight`, `renderMargin`, `renderEdgeExtra`, `railExtra`, `timelineExtra`, `statusExtra`, `ownKeys`; `table` moved to the URL; undated bin on the scrubber; the scrubber exports its x-scale for `timelineExtra` | 160 |
| `src/components/viz/ForceGraph.tsx` | `highlight` lit set (below `path` in precedence); index cap glyph; rose midpoint ticks and conditional connectors from `answers`; unconnected-beneficiary text tag; `denialIndex(edges, explicit?)` accepts claim-id joins first | 130 |
| `src/components/viz/camera.tsx` | `ExpandShell` gets an optional `aside` slot so the margin comes into the maximised view | 20 |
| `src/App.tsx`, `src/components/Layout.tsx` | route and nav | 6 |
| `scripts/smoke.mjs` | routes `/energy`, `/energy?claim=__missing__`, `/energy?dom=coal&idx=nifty50&tier=alleged`, `/energy?path=__a__,__b__`, plus a run with `research/raw/energy/` absent | 12 |
| `docs/INDEX.md`, `HANDOFF.md` | route count and one paragraph | 10 |

Total ≈ 2,500 lines. Gates: `npx tsc -b`, `npm run build`, `npm run validate`,
`npm run smoke`, including with no energy files and no `indices.json`. Screenshot the
stage in greyscale at 1280 and 390 wide to check that tier dashes, the rose tick and the
index cap survive, and that the in-frame status line is legible in the screenshot.

---

## 14. Open risks for review

1. **The company trail is the page's most persuasive path and its least controlled
   one.** Entering from a Nifty 50 stock and seeing "decisions touching it" beside
   "money it sent" invites the quid-pro-quo reading even without a shared timeline. The
   separation, the caption and the refusal are the mitigations. The real fix is the
   population control in HANDOFF priority 1. Until then, a reviewer should consider
   whether list B ("money it sent") should require `via` to be off by default *and*
   carry each recipient's base rate from `baseRates` where one exists.
2. **Graphic-first puts the epistemics into transient surfaces.** Hover cards and the
   margin do not survive a screenshot, a share preview or a hurried reader. The in-frame
   status line and the rose ticks are the only parts that travel with the picture. The
   rest state is also at risk: many domain files reuse hub ids (`min:ministry-of-power`,
   `adani`, `co:ntpc`), so the unfiltered whole graph may be a hub-dominated texture
   (the hub artefact) that looks like a finding. The family x-bias adds a positional
   echo of hue that a reader may read as "two camps". The caption states it. If review
   finds the rest state unreadable, the answer is a stronger in-frame caption, **not** a
   pre-filtered default.
