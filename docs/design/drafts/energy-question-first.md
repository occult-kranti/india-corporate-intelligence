# /energy — design spec, question-first draft

*Draft written 2026-09-25 against the fleet contract
`scratchpad/energy/SPEC.md` (entities, claims with `benefit`, voids, narratives,
baseRates, symmetryCheck, gaps) and the index file checked by `scripts/validate.mjs` §4
(`research/raw/indices.json`). Designed against the contract, not against any record.
Nothing in this file is a figure: every `{brace}` is derived at module scope in
`src/data/energy.ts`.*

*Relation to `docs/design/ENERGY_PAGE.md` (the judge-written spec): this draft keeps its
data plumbing (§3 there), its benefit-total ban and its contra-tick drawing, and differs
in seven places, listed in §0.3 so a judge can graft or reject them one at a time.*

---

## 0. The idea in one screen

### 0.1 Central idea

The page is **one graph and nine skeptical questions**. The graph (Q1) is the evidence
board: every sourced claim, drawn once, with the tier in the dash. Every section under it
is a question a doubtful reader would put to that board — *who held the office, who
gained, what did they say back, is this unusual, would it look different under the other
side, what is missing* — answered with the **smallest graphic that answers it honestly**,
very often a table. Each question section has the **same five-part anatomy**, enforced
by one component (`QuestionSection`, §5.0): the question as the heading → the
denominator line → the graphic → **"What this cannot show"** at body size → an **"Ask the
graph"** button that writes ordinary URL params into the graph above and says, before you
click, what it will do to the count (`412 → 37 claims`). The reader learns the anatomy
once and can check every figure the same way.

### 0.2 Why this and not a dashboard

A reader who wants to check a claim needs to know *which question a graphic answers* and
*what it cannot answer*. Putting the question in the heading and the limit directly
under the graphic makes both impossible to skip. The graph stays the main object: it is
the first thing below the strip, and every later section routes back into it.

### 0.3 Where this draft departs from ENERGY_PAGE.md (each separable)

| # | This draft | ENERGY_PAGE.md | Why |
|---|---|---|---|
| D1 | Fixed question anatomy (`QuestionSection`), with `cannotShow` a **required** prop | Free-form sections | The limit cannot be left out if the type system needs it |
| D2 | **No index glyph on graph nodes.** Index membership shows in the hover card and the Q2 table, and works as a graph filter | Two-cell cap above nodes | Keeps the node channel budget at three. A cap on ~15 of ~300 nodes adds a fourth mark that competes with shape at `sz` 1 |
| D3 | Q2 is a **table of every index constituent** (three index columns), with a trail panel for the chosen stock | Two IndexGrids | Three indices (Nifty 50, Sensex 30, Sensex 50) are ~60 distinct companies. A table shows all three memberships with no tabs, and it can be checked row by row |
| D4 | Benefit ledger default sort is **alphabetical by beneficiary**. Sorting by amount is opt-in | Largest-documented first | A leaderboard as the default is a silent claim about who matters |
| D5 | The benefit ledger has **no amount axis or bar** | — | `amountCr` mixes contract values, tariffs, outlays and market-cap moves. A shared axis would compare them |
| D6 | **Mirror window** control (Q7): the same filters run on the equal-length window at the same point in the previous governing coalition's term, with each period's research coverage printed beside it | Symmetry text only | Answers "would this look different under a rival party" with a count that carries its own denominator |
| D7 | **Separation histogram** next to every path found (Q6), with the found length highlighted | Median as a number | "Two hops apart" is only meaningful beside the share of all pairs that are two hops apart |

---

## 1. Page purpose

`/energy` is the record of who holds public power over India's energy and natural
resources — coal, mines, oil & gas, hydro and dams, solar and wind, nuclear,
transmission and discoms — and of what that power handed to whom. It connects ministers
(with dated tenures), ministries, PSUs, regulators, private groups and their promoters
through sourced, tiered claims: awards, PPAs, bonds, trusts, donations, CSR, ownership,
roles, rules, enforcement and denials. It also connects them to the listed market: a
reader can start from a Nifty 50, Sensex 30 or Sensex 50 energy stock and follow its
ministry contacts and money trail. The page is built as a sequence of skeptical
questions, not a set of findings. For each claim it asks who decided, who gained and by
what mechanism, what the other party said, how common this is among comparable cases,
whether the same lens produces the same picture for the other side, and what the record
does not contain. The documented voids and the gaps are shown as prominently as the
edges. The page asserts no wrongdoing, computes no score about any entity, and never
adds up benefits.

---

## 2. The reader's questions, in order

| Q | Question (verbatim section title) | Smallest honest answer | Anchor |
|---|---|---|---|
| — | What is this, and as of when? | Header + sticky `DenominatorStrip` + coverage chips | `#top` |
| Q1 | **What is on the record, and on what evidence?** | The graph (`GraphExplorer`), tier in the dash | `#q1` |
| Q2 | **Where does a listed company sit in it?** | Constituent table + `CompanyTrail` + sector 2×2 | `#q2` |
| Q3 | **Who held the office on the date?** | `TenureLanes` + the date test in `ClaimCard` | `#q3` |
| Q4 | **Who gained, by what mechanism, and how much?** | `BenefitLedger` table (no axis) | `#q4` |
| Q5 | **What did the other side say?** | `ContestedFact` per answered claim | `#q5` |
| Q6 | **Is it unusual? — the denominators** | `BaseRateTable` + separation histogram (`Distribution`) | `#q6` |
| Q7 | **Would it look different under the other side?** | `MirrorWindow` + coverage-by-year (`TimeSeries`) + `SymmetryPanel` | `#q7` |
| Q8 | **What is being said, and how well does it hold?** | `NarrativeCard` list, six-step ladder | `#q8` |
| Q9 | **What is missing?** | `VoidList` + `GapsPanel` + superseded-claims table | `#q9` |
| — | Where did every figure come from? | `SourceLedger` + `TierLegend` + standing note | `#sources` |

Directly under the standfirst, a **`QuestionIndex`** lists Q1–Q9. Each row has the
question, a one-line derived answer made only of counts (never adjectives), and a link to
the anchor. Examples, all derived (the wording is a template, the numbers are computed):

- Q1 `{E} entities · {C} claims: {d} documented · {r} reported · {a} alleged · {an} analytic`
- Q2 `{n50} of 50 Nifty 50 · {s30} of 30 Sensex 30 · {s50} of 50 Sensex 50 constituents appear directly in a claim`
- Q3 `{placed} of {dated} dated decisions fall inside a recorded tenure · {undated} undated`
- Q4 `{b} of {C} claims name a beneficiary · {k} with a documented amount`
- Q5 `{x} of {y} alleged claims carry a response · {asked} "asked, no reply" · {notAsked} "not asked"`
- Q6 `{br} base rates recorded · median separation {m} hops`
- Q7 `symmetry check recorded for {s} of {D} domains`
- Q8 `{nN} narratives: {est} established … {deb} debunked` (all six steps, zeros printed)
- Q9 `{v} documented voids · {g} gaps · {sup} superseded claims retained`

---

## 3. Route, URL state, data

### 3.1 Route

- Path `/energy`, `React.lazy` in `src/App.tsx` next to `/resources`. It uses the
  existing `RouteFallback` inside the existing `Suspense`. Nav item in
  `src/components/Layout.tsx`, same group as "Natural resources", label
  **"Energy power map"**, icon `Zap` (lucide-react is already a dependency).
- `HashRouter`, so deep links look like `#/energy?focus=co:ntpc&hops=2`.

### 3.2 URL params (every one round-trips; default = unset = unfiltered)

Graph params (owned by `GraphExplorer`, also written by "Ask the graph" buttons):

| param | values | default | meaning |
|---|---|---|---|
| `q` | text | — | search over label, `al`, `sub`, claim `lab` |
| `tier` | csv of `documented,reported,alleged,analytic` | all | tier filter |
| `fam` | csv of families | all | node family filter |
| `ty` | csv of shape classes (`company,institution,recipient,rule,person`) | all | shape filter (the upgraded `GraphFilter.types`) |
| `pred` | csv of predicates | all | relationship filter |
| `min` | ₹ crore, integer | 0 | minimum `a` |
| `from`, `to` | `YYYY` or `YYYY-MM-DD` (the time scrubber writes `YYYY`) | — | date window; undated claims are never hidden |
| `dom` | csv of domain slugs | all | sub-domain (research file) filter |
| `idx` | `nifty50` \| `sensex30` \| `sensex50` (the keys in `indices.json`) | — | keep claims with an endpoint that is a constituent's `existingId` |
| `via` | `group` | — | with `idx`: also keep claims touching a group node that has an `own` claim to a constituent |
| `sel` | node id | — | selected node (pins its card) |
| `focus` | node id | — | ego centre |
| `hops` | `1`–`3` | `2` (only read when `focus` is set) | ego radius |
| `path` | `idA,idB` | — | path finder ends |
| `claim` | claim id | — | selected claim (pins `ClaimCard`; lights the claim's context) |
| `table` | `1` | — | show the graph's table twin |

Page params (owned by `Energy.tsx`; the graph's reset does **not** clear them):

| param | values | default | meaning |
|---|---|---|---|
| `stock` | company id (`co:…`) | — | Q2 trail panel subject |
| `isec` | csv of sectors from `companies.ts` | all | Q2 table sector filter |
| `ixf` | `any` \| index key | `any` | Q2 table membership filter |
| `bsort` | `name` \| `amount` \| `count` | `name` | Q4 ledger sort |
| `nar` | csv of the six statuses | all | Q8 filter |
| `mirror` | `1` | — | Q7 show mirror window (needs `from` and `to`) |
| `sup` | `1` | — | include superseded claims in the table twin |

Naming follows `/geograph` (`sel`, `focus`, `hops`, `from`, `to`, `q`, `min`) so a reader
who learned one graph page reads the other's URL.

**Stale links.** An unknown `sel` / `focus` / `claim` / `stock` / `path` id is ignored.
A one-line amber notice appears above the graph: "The linked item `{id}` is not in this
version of the register (as of {asOf})." The rest of the URL still applies.

**Unknown values** inside a csv (for example `tier=documented,bogus`) are dropped
silently from the filter, but the rail shows the canonical value, so the reader sees what
applied.

### 3.3 Data plumbing (reuse ENERGY_PAGE.md §3, restated so this is buildable alone)

- `src/graph/energy.ts` loads
  `import.meta.glob('../../research/raw/energy/*.json', { eager: true, import: 'default' })`
  and skips basenames that start with a capital (the validator's rule). It also loads
  `research/raw/indices.json` the same way. If a file is absent, the result is an empty
  object, not a build failure.
- **Merge.** Files are processed in filename order. Entities are deduped by `id`. `d` and
  `srcs` are concatenated and deduped (`srcs` by URL). `label/sub/ty/fam/st/sz` come from
  the first file. If files disagree on `ty`, `fam` or `st`, the page keeps the first value
  and pushes a derived gap. Reused ids (`co:`, `pol:`, `min:`, `grp:`, bare Atlas ids)
  are hydrated from `buildNationalGraph()` and `graph/data.ts`. A claim whose endpoint
  resolves nowhere goes to `orphanClaims`: it is not drawn, but it is counted and listed
  (Q9).
- **Claim id** = `c.id ?? \`${c.s}~${c.pred}~${c.t}\``.
- **Partition.**
  - `pred === 'contra'` with `t` starting `claim:` → `answersByClaim: Map<claimId, EnergyClaim[]>`. Not an edge.
  - `pred === 'contra'` node→node → ordinary edge (the existing rose style).
  - `supersededBy` set → `superseded` (kept, not drawn, listed in Q9 and in the table twin with `sup=1`).
  - everything else → drawable `GEdge`, carrying `id`, `domain`, `fileAsOf` and `benefit`.
- **`asOfRange`** = [min, max] of the file `asOf` values. The strip prints the oldest,
  and the range when the dates differ.
- **Expected coverage.** `EXPECTED_DOMAINS` in `src/data/energy.ts` lists the slugs the
  fleet was dispatched to write. Copy them from the fleet prompts, one per intended area:
  coal · mines · oil & gas · hydro/dams · solar/wind · nuclear · transmission/discoms. A
  domain in the list with no file is **not yet promoted**. That is the partial state
  (§9), and it is never hidden. If the list cannot be sourced from the fleet dispatch,
  set it to `null`. The strip then prints `{k} domains present · expected list not
  declared` instead of `k of M`.
- **Governments.** `src/data/governments.ts` holds `CENTRAL_COALITIONS: { name: string;
  pm: string; from: string; to: string | null; srcs: Source[] }[]`, covering 1998 onward.
  Derive it from `role` claims to the PM office when those exist. Otherwise it is a
  sourced constant: every row carries `srcs`, and the source ledger lists them. It is
  used only by Q7 annotations and the mirror window.
- All figures are selectors in `src/data/energy.ts`, as pure functions of the parsed
  filter state. No literal figure appears in `Energy.tsx`. Every sort has an explicit
  tiebreak on `id`.

---

## 4. Page skeleton, top to bottom

```
max-w-[1180px]
├─ Kicker · PageTitle · Standfirst · Byline · "Covered elsewhere" line
├─ DenominatorStrip (sticky, top-0)
├─ CoverageChips (domains present / not yet promoted)          ← partial state lives here
├─ QuestionIndex (Q1–Q9, derived one-liners)
├─ Q1  graph: GraphKey · GraphExplorer (rail | canvas | detail) · caption · table twin
├─ Q2  constituent table · CompanyTrail(stock) · sector 2×2
├─ Q3  TenureLanes · "institutions with no recorded office-holder"
├─ Q4  BenefitLedger · Callout "A beneficiary is not an allegation"
├─ Q5  ContestedFact list (claim | response)
├─ Q6  BaseRateTable · separation Distribution
├─ Q7  MirrorWindow · coverage TimeSeries · SymmetryPanel
├─ Q8  NarrativeCard list
├─ Q9  VoidList · GapsPanel · superseded-claims table · orphan claims
└─ SourceLedger · TierLegend · Footnote (standing)
```

Order against the house chrome: title → strip → **centre (Q1)** → filters (Q1's rail)
→ contested (Q5, Q8) → gaps (Q9) → source ledger. The chrome is unchanged. The
questions are the centre, extended downward.

---

## 5. Section by section

### 5.0 `QuestionSection` — the fixed anatomy (new, `src/components/Questions.tsx`)

```ts
export function QuestionSection(p: {
  n: number;                    // 1–9
  id: string;                   // 'q1'…'q9'
  question: string;             // rendered as the h2: "Q3 · Who held the office on the date?"
  denominator: ReactNode;       // one mono line, REQUIRED — the frame's own N of M
  answeredBy: string;           // the contract fields behind it, e.g. "claims[].benefit.{who,how,amountCr,confidence}"
  cannotShow: ReactNode;        // REQUIRED — body-size block, same type size as findings
  ask?: { params: Record<string, string | null>; label: string; effect: { from: number; to: number } };
  children: ReactNode;          // the graphic
}): JSX.Element;
```

Render order:

1. `h2` using the `Section` title styles. Prefix `Q{n} ·` in `font-mono text-text-muted`.
2. Denominator line, `font-mono text-[11px]`, directly under the rule (the `Section.note` slot).
3. `answeredBy`, `font-mono text-[10.5px] text-text-muted`: "answered from: …". It tells
   a checker which fields to open.
4. The graphic.
5. **"What this cannot show"** block: `border-l-2 border-amber/50 pl-3`, label in mono
   uppercase 10px, body `text-[14px] text-text-secondary`. This is the same size as
   findings, so it is not a footnote.
6. "Ask the graph" button (`btn-ghost`). Label: `{label} — {from} → {to} claims`.
   `onClick` merges `params` into the URL (graph keys only; `null` deletes), then scrolls
   `#q1` into view. Use `behavior: 'auto'` under `prefers-reduced-motion`, `'smooth'`
   otherwise.

**The button never writes a param the rail cannot display.** A reader must be able to
see and undo everything it did.

### 5.1 Header

- `Kicker`: `Energy & natural resources · power map`
- `PageTitle`: **Who decides, who gains, and what the record cannot say**
- `Standfirst` (≤ 68ch): "Every line in the graph below is a sourced claim with an
  evidence tier — an award, a power-purchase agreement, a rule, an office held on a date,
  a donation, a denial. The page then puts nine questions to that record, one per
  section, in the order a skeptical reader would ask them. Each answer shows its
  denominator and says what it cannot show."
- `Byline`: `{files} research files · {entities} entities · {claims} claims · {responses} responses · as of {asOfRange}`
- **Covered elsewhere** (one line, `font-mono text-[11px]`, links):
  `Block-by-block allocation with a map → /resources · Government tenders → /tenders ·
  Allocation registers compared → /allocation · PM CARES → /pmcares · Group deep dives →
  /conglomerates`. This page links to these registers. It does not re-draw them.

### 5.2 `DenominatorStrip` (existing, sticky)

`facts`, in this order (each maps to a question):

| # | n | of | label | question |
|---|---|---|---|---|
| 1 | visible drawable claims | all drawable claims | `claims` | Q1 |
| 2 | visible entities | all entities | `entities` | Q1 |
| 3 | domains with a file | `EXPECTED_DOMAINS.length` (omit `of` if null) | `domains promoted` | partial |
| 4 | dated visible claims | visible claims | `dated` | Q3/Q7 |
| 5 | visible claims with `benefit.who` | visible claims | `name a beneficiary` | Q4 |
| 6 | visible alleged claims with ≥1 response | visible alleged claims | `allegations answered` | Q5 |

`filtered={{ from: allDrawable, to: visibleDrawable }}`. `asOf` = the oldest file `asOf`.
Facts 1–6 all follow the graph filters, because the strip describes what the reader is
looking at.

### 5.3 `CoverageChips` (new, small)

A row of chips, one per `EXPECTED_DOMAINS` entry plus any extra domain found in the
files. Each chip shows the label, `{claims}` and the file `asOf`. A chip is a button
(`aria-pressed`) that toggles `dom`.

- Present domain: outline chip, `text-text-secondary`.
- **Not yet promoted**: the hatch pattern used for no-data on `IndiaMap`, label
  `{Domain} · not yet promoted`, `disabled`, `title="No research file for this domain in
  this build. Its absence from every section below is a gap, not a zero."`
- Right end, mono: `{present} of {expected} domains · the sections below cover only these`.

### 5.4 `QuestionIndex` (new)

An `ol` of nine rows. Each row: `Q{n}` (mono), the question (link to `#q{n}`), and the
derived one-liner from §2 in `font-mono text-[11px] text-text-muted`. The rows do not
follow graph filters. They describe the whole register, and the row header says
"whole register · filters do not apply here". Otherwise the index would keep changing
while the reader filtered further down the page.

### 5.5 Q1 — What is on the record, and on what evidence?

- **Denominator**: `{visible} of {all} claims · {entities} entities · {undated} undated (shown at every date) · {orphans} claims not drawn (endpoint not in platform — listed in Q9)`
- **answeredBy**: `entities[], claims[] (s, t, pred, tier, a, from, to, srcs)`
- **Graphic**:
  1. **`GraphKey`** (new, one row above the canvas, never collapsed). It shows the four
     tier dash samples, each with its **count** (the legend doubles as the tier
     denominator), then the six family swatches (`FAMILY_LABEL`), then the five shape
     glyphs (`SHAPE_CLASSES`), then a rose tick labelled "has a recorded response", then
     "edge width = ₹ on the claim; thinnest = none recorded".
  2. **`GraphExplorer`** (upgraded: ego focus, path finder with median separation, time
     scrubber, hover cards). `nodes` = merged energy nodes; `edges` = drawable claims after
     the page-level `dom` / `idx` / `via` filters. The rail's own filters apply inside
     GraphExplorer. Heights: 640px at ≥1024px, 560px at 640–1023px, 440px below 640px.
     Props this page needs (all optional, so other pages are unchanged; if the upgrade
     already provides one under another name, use it):

     ```ts
     urlSelection?: boolean;                 // sel/focus/hops/path/claim/table in the URL (defaults as §3.2)
     answers?: Map<string, EnergyClaim[]>;   // claim-targeted contras → rose midpoint tick on the answered edge
     highlight?: { nodes: Set<string>; edges: Set<string>; caption: string } | null;  // claim context
     renderDetail?: (s: { node?: string; claim?: string }) => ReactNode;  // NodeCard / ClaimCard
     hoverExtra?: (n: GNode) => ReactNode;   // index membership + sector lines in the hover card
     extraRail?: ReactNode;                  // the idx/via control, rendered in the rail
     ownKeys?: string[];                     // keys "reset filters" may clear (graph keys only)
     onSelectEdge?: (edgeId: string) => void;
     stickyTop?: string;                     // 'lg:top-12' so the rail clears the strip
     ```

  3. **Claim context** (`claim` set). `highlight.nodes` = {s, t, `benefit.who`, every
     responder, every office-holder at s on `claim.from`}. `highlight.edges` = {the
     claim, its role edges that pass the date test}. Everything else takes the existing
     dim opacity (0.1 edges / 0.16 nodes). If `benefit.who` is neither endpoint and no
     edge joins it, the node is lit **without a connector**. No edge is invented.
  4. **Claim-targeted responses**: a rose tick perpendicular to the answered edge at its
     midpoint, 8px long, `strokeWidth 1.5`, with the dash of the **response's** tier. If
     the responder node is not an endpoint, a rose connector runs from the responder to
     the midpoint, with the same dash. A response is visible whenever its claim is
     visible: `pred` and `tier` filters never hide the answer to a visible claim.
  5. **Path finder** (Shift-click the second node, or the "path to…" search in the node
     card). It writes `path=a,b`. The status line inside the frame reads, verbatim:
     "Shortest path: {k} hops, direction ignored · one of {count} equally short paths ·
     median separation in this filtered graph: {m} hops · {share}% of entities reachable
     from {a} are within {k} hops." `count` comes from `shortestPath()` in
     `src/graph/nullModel.ts`. `share` comes from `pathLengthProfile(a)` over the same
     filtered edges. The status line has a link, "see the distribution → Q6", that
     scrolls to Q6 where the histogram is drawn for this same `a`.
  6. **Hover card** (upgrade). Energy extras via `hoverExtra`: `Nifty 50 · Sensex 30 ·
     Sensex 50` membership **in words** with the list `asOf` ("member of none" printed
     when true, "not in platform company dataset" when the node is a company that is not
     in `companies.ts`), sector, and "registered office: {state} — not the location of
     any plant or block". Then claim counts by tier (four `TierChip`s with numbers).
  7. **Detail panel** (`renderDetail`):
     - `claim` set → **`ClaimCard`** (§5.13). Its blocks are labelled Q3 / Q4 / Q5 and
       link to those sections.
     - `sel` only → **`NodeCard`**: label, sub, `identity` fields that are present (office
       with dates, CIN, DIN, NSE/BSE), `publicRole`, every `d` fact with its tier marker
       rendered as a `TierChip`, `Cite srcs`, index membership in words. Links go to
       `/company/:id` (if in `companies.ts`), `/conglomerates/:id` (for `grp:` ids that
       have a deep dive) and `/pmcares` (for the PM CARES node). If the node is an index
       constituent, a button **"Open its trail (Q2)"** sets `stock`. Then the node's
       claims as rows (each sets `claim`), all of them, with no "show more".
  8. **Index filter** (`extraRail`): a radio `none | Nifty 50 | Sensex 30 | Sensex 50`
     plus a checkbox `include via group`. The live effect is printed under the control:
     `{all} → {n} claims`. When `indices.json` is absent the control is disabled with
     inline text "index lists not loaded in this build".
- **cannotShow** (verbatim, §8).
- **ask**: none (this is the graph).
- **Table twin** under the canvas (`table=1`), §11.

### 5.6 Q2 — Where does a listed company sit in it?

- **Denominator**: `{rows} constituents across {k} indices ({union} distinct companies) · {direct} with ≥1 direct claim · {via} via group only · {none} with none · {notInDataset} not in platform dataset · lists as of {indices.asOf}`
- **answeredBy**: `indices.json indices{}[].{name, existingId}, companies.ts {nse, bse, sector, group}, claims[] endpoints, own claims`
- **Graphic** (three parts):

  **(a) Constituent table** (`ConstituentTable`, new; built on `DataTable`). One row per
  distinct company in the union of the index lists. Columns:

  | column | content |
  |---|---|
  | Symbol | NSE symbol (mono); BSE code when there is no NSE symbol |
  | Company | name; `sector` under it in muted text (from `companies.ts` via `existingId`; "sector unknown" otherwise) |
  | N50 · S30 · S50 | three narrow columns, each `●` member / `—` not. Text glyphs, not colour |
  | Direct claims | four tier counts as `TierChip` + number; zero tiers omitted; `0` printed when none |
  | Via group | `{n} via {group label}` or `—` |
  | Trail | button "open" → sets `stock={existingId}` (and scrolls to the trail panel) |

  Default order: **alphabetical by symbol**, never by claim count. Filters above the
  table: sector chips (`isec`, with counts) and membership segmented control (`ixf`),
  each showing `{union} → {n} companies`. Rows with a null `existingId` render the hatch
  in the claims cells with the text "not in platform dataset — cannot be joined". The
  table shows **every** row, including zero rows. The zeros are the base rate.

  **(b) `CompanyTrail`** (new), shown when `stock` is set, full width under the table.
  The heading is the company name with `(stock)`, and a close button clears `stock`.
  Blocks:
  1. *Identity*: NSE, BSE, ISIN, sector, `group`, index memberships in words, list
     `asOf`. Links to `/company/:id` and `/conglomerates/:id`.
  2. *Public offices in its record*. A table of every `fam ∈ {state, enforce}` node with
     a **direct** claim to or from the company, or (marked `via group`) to or from its
     group through an `own` claim. Columns: office · predicate(s) · tier chips · dates ·
     separation (hops, from `shortestPath`, with "one of {count}"). The column header
     carries the median: `separation (median in this graph: {m})`. This is a list of
     recorded contacts. It is **not** "exposure": nothing is summed or weighted.
  3. *Money trail*. A chronological table of every claim with pred in
     `MONEY_PREDS` (`bond, trust, direct, pmin, pmout, csr, award`) that touches the
     company or its group. Columns: date · from → to · predicate · ₹ cr · tier · via ·
     `benefit.how` · responses (count, each clickable → `claim`) · source. Undated rows
     sort last, and each is marked "undated".
  4. *Ask the graph* button: `focus={id}&hops=2&idx=` (clears `idx` so the company's
     non-index neighbours show). The effect is printed.
  5. *If blocks 2 and 3 are empty*: "No claim in this register touches {name} or its
     group. This register was built by researching energy and resource decisions, so a
     company with no row here may simply not have been examined. This is not a finding
     that no such relationship exists." If a `voids[]` entry names the company's id or
     group, it is quoted here with its sources.

  **(c) Sector 2×2** (`DataTable`, per index key present, stacked on narrow screens). Rows
  are Energy / Utilities / Metals & Mining / Oil & Gas (the `companies.ts` sector strings
  present among constituents, listed explicitly in `src/data/energy.ts`), then "all
  other sectors", then "sector unknown". Columns are `≥1 direct claim` / `none`, with
  row and column totals. The caption is verbatim (§8). This is the frame's own
  denominator: an energy graph touching energy stocks is the expected result.
- **cannotShow**: verbatim §8.
- **ask**: `idx={first index key}` → `{all} → {n} claims`, label "Show only claims touching index constituents".

### 5.7 Q3 — Who held the office on the date?

- **Denominator**: `{lanes} institutions with a recorded office-holder · {placed} of {dated} dated decisions fall inside a recorded tenure · {outside} fall in a gap between tenures · {undated} undated, not placed`
- **answeredBy**: `claims[pred=role] (person→institution, from, to), claims[s=institution].from`
- **Graphic**: **`TenureLanes`** (new SVG, `role="img"`, `<title>`).
  - **Lanes** = institution nodes (`ty ∈ {ministry, agency, psu}`) that are the `t` of
    ≥1 `role` claim. Ordered by `fam` (state, then enforce), then label.
  - **Tenure bars**: one per `role` claim, from `from` to `to ?? asOf`. The outline dash
    is the role claim's tier. The label is the person's name. The party appears as text
    `(Party)` only when a `role` claim person→party overlaps the tenure. There is **no
    party colour**. An open tenure ends square at `asOf` with the text `in office as of {asOf}`.
  - **Decision ticks** at `claim.from` for claims whose `s` is the lane's institution and
    whose pred is in `{award, law, enforce, pmout, csr}`. Each tick is 10px with the
    claim's tier dash. The claim selected by `claim` is 18px and drawn in `text-text`.
    For `law` claims the tick goes on the lane of the **issuer**: any claim whose `t` is
    the law node and whose `s` is a `fam: state` node. With no issuer claim, the rule is
    listed below the lanes as "rules with no recorded issuer: …" (a void, not a tick
    placed on a guessed lane).
  - One shared year axis. The range is from the earliest dated claim to `asOf`, clipped
    to `from`/`to` when set. Government changes from `CENTRAL_COALITIONS` are drawn as
    hairline verticals labelled with the PM's name and date, text only, no fill.
  - Click a bar → `sel=<person>`. Click a tick → `claim=<id>`.
  - Under the lanes: "**{k} institutions appear in claims with no recorded
    office-holder**: {labels}". Their decisions cannot be placed, and the section says
    so rather than dropping them.
- **cannotShow**: verbatim §8.
- **ask**: `pred=role,award,law` → effect, label "Show offices and their decisions".

### 5.8 Q4 — Who gained, by what mechanism, and how much?

- **Denominator**: `{b} of {C} visible claims name a beneficiary · {bd} documented amount · {be} estimated · {bu} unknown · {nb} name none · {who} distinct beneficiaries`
- **answeredBy**: `claims[].benefit.{who, how, amountCr, confidence}, claims[].{tier, from, srcs, upgradeIf, killIf}`
- **Graphic**: **`BenefitLedger`** (new; a table, deliberately without a chart). It is
  grouped by `benefit.who`.
  - **Group header row**: beneficiary label (click → `sel`), `sub`, index membership in
    words, `{n} claims`, the largest *documented* single amount (`₹{x} cr` + its claim
    `lab`), or "none documented".
  - **Claim rows** under it, all of them: date · claim `lab` + `TierChip` · `benefit.how`
    · amount cell · confidence in words · responses (count) · source.
    - Amount cell: `₹{amountCr} cr` when documented. `≈ ₹{amountCr} cr (estimate)` when
      estimated. `amount unknown` (muted) when `amountCr` is null or the confidence is
      `unknown`. **Never ₹0 and never blank.**
    - A beneficiary that is not an endpoint of its claim gets the note "named as
      beneficiary; not a party to this edge".
  - **Sort** (`bsort`): `name` (default) | `amount` (largest documented, nulls last) |
    `count`. The tiebreak is always label, then id.
  - **No totals** in any row, footer, tooltip or export.
  - `Callout tone="bottomline"`, label **"A beneficiary is not an allegation"**: "An award
    has a winner by construction; a tariff order has a party whose tariff changed. Naming
    who gained is arithmetic. Whether the gain was intended, improper or ordinary is a
    separate claim, which appears in the graph as `alleged` with its response beside it,
    or not at all."
- **cannotShow**: verbatim §8.
- **ask**: sets `claim` to the row's claim (per row, via its date cell link). The
  section-level ask is `pred=award` → effect, label "Show awards in the graph".

### 5.9 Q5 — What did the other side say?

- **Denominator**: `{x} of {y} alleged claims carry a response · {asked} recorded as "asked, no reply" · {notAsked} recorded as "not asked" · {other} responses to documented/reported claims`
- **answeredBy**: `claims[pred=contra] (t = claim:<id> or node), claims[tier=alleged]`
- **Graphic**: one **`ContestedFact`** (existing) per claim with ≥1 response, and also one
  per alleged claim with none. The claim's domain comes first, then the date. Mapping:
  - `question` = claim `lab` + ` · ` + date + ` · ` + tier label.
  - `positions[0]` = `{ who: "The claim — " + (claimant if recorded in d, else s label), claim: claim.d, srcs: claim.srcs }`
  - `positions[1]` = `{ who: "The response — " + responder label, claim: contra.d, srcs: contra.srcs }`.
    With several responses, `positions[1].claim` lists each as its own paragraph with
    its responder and tier.
  - `unresolved` = `claim.upgradeIf` / `killIf` as "Would settle it: …".
  - The symmetric layout is the point. **Both columns use the same type size and
    weight.** A response tiered `analytic` or `reported` shows its `TierChip` in its own
    column.
  - An alleged claim with **no** response should be impossible (validator). If one
    appears, `positions[1]` reads "No response recorded. Under this platform's rules this
    claim should not have shipped." in amber, and the claim is pushed to gaps.
  - Filters: follows `dom`, `tier`, `from/to`. It does **not** follow `pred`, because
    responses are `contra`.
- **cannotShow**: verbatim §8.
- **ask**: `tier=alleged` → effect, label "Show allegations and their responses".

### 5.10 Q6 — Is it unusual? — the denominators

- **Denominator**: `{br} base rates across {d} domains · separation computed over {E} entities, {C} claims (current filters)`
- **answeredBy**: `baseRates[].{property, numerator, denominator, label, srcs}`; graph topology
- **Graphic** (two parts):
  1. **`BaseRateTable`** (new). Columns: property · `{numerator} of {denominator}` (mono)
     · rate % · bar · what the denominator is (`label`) · domain · sources. The bar is on
     **one shared 0–100% scale** across all rows. If `denominator === 0`, the rate cell
     reads "not a rate (denominator 0)" and there is no bar. Ordered by domain, then
     property.
  2. **Separation histogram**: existing `Distribution` with `series=[{ name: 'shortest
     path length', bins }]`, `xLabel="hops from {a}"`, `highlight={k}` when a path is
     set, and `maxBin=8`. `bins` come from `pathLengthProfile(filteredEdges, a)`, where
     `a` = the path's first end. With no path, `a` is `focus` or `sel`. With none of
     these, the chart shows the pooled profile from the same seed rule `NetworkView.tsx`
     uses for `medianDegreeSeparation`, and the caption names the seeds. Unreachable
     entities are counted separately in the caption, not binned.
- **cannotShow**: verbatim §8.
- **ask**: none.

### 5.11 Q7 — Would it look different under the other side?

- **Denominator**: `{dated} of {C} claims dated · by coalition in office on the claim date: {per-coalition counts} · symmetry check recorded for {s} of {D} domains`
- **answeredBy**: `claims[].from`, `CENTRAL_COALITIONS`, `symmetryCheck` per file
- **Graphic** (three parts):
  1. **`MirrorWindow`** (new, small). Enabled only when `from` and `to` are both set.
     Otherwise it shows "Set a date window in the graph (Q1) to mirror it" and a button
     that writes the window of the current coalition's term.
     - Let C = the coalition in office at `from`, with term start S. Let `offset = from − S`
       and `len = to − from`. Let P = the coalition before C, with start S′. Mirror window
       = `[S′ + offset, S′ + offset + len]`. If that window runs past P's term end, or if
       `[from, to]` spans a change of coalition, it shows "No comparable window — {reason}"
       and does not guess.
     - Output is a two-column table with the same columns on both sides: window · coalition
       (PM name) · claims under the **current filters** · **all dated claims in that
       window** (research coverage) · by tier (four chips). There is no ratio, no
       difference and no verdict.
     - Button "View mirror in graph" writes the mirrored `from`/`to`, prints the effect,
       and keeps all other filters.
     - `mirror=1` shows the block expanded. The block is collapsed only on mobile (§10).
  2. **Coverage by year**: existing `TimeSeries`, one series "dated claims in this
     register", x = year, y = count. Years inside the span with no claim are `0`, drawn.
     Years outside the span are not drawn. `annotations` = coalition changes
     (`{ x: year, label: "{PM} sworn in {date}" }`). The caption prints `{undated}
     undated claims are not on this chart`. This chart describes **the research**, and
     its title says so: "What this register covers, by year".
  3. **`SymmetryPanel`** (new). One block per domain file: label "Symmetry check —
     {domain}", body `symmetryCheck` verbatim, file `asOf`. A domain whose file lacks one
     gets a `Callout tone="warn"`: "No symmetry check — {domain}. The contract makes it
     mandatory; its absence is a defect in that file, and its claims should be read with
     that in mind." (This is also pushed to gaps.) A domain that is not yet promoted gets
     a hatched block: "Not yet promoted".
- **cannotShow**: verbatim §8.
- **ask**: `from={S of current coalition}&to=` → effect, label "Show this government's term".

### 5.12 Q8 — What is being said, and how well does it hold?

- **Denominator**: `{nN} narratives · established {a} · well-supported {b} · contested {c} · speculative {d} · unsupported {e} · debunked {f}` (fixed ladder order, zeros printed)
- **answeredBy**: `narratives[].{claim, status, strongestCase, strongestCounter, whatWouldChangeThis, srcs}`
- **Graphic**: **`NarrativeCard`** (new) list. Status chips (`nar`) above it, each with
  its count. Card anatomy:
  - `claim` at 16px, then the domain label.
  - **Six-cell ordinal ladder**: the filled cell is this narrative's step, the other five
    are outlines. The first and last cells are labelled `established` and `debunked`,
    and the status is written out in words. Position carries the status. **No colour by
    status**, and `debunked` is not rose.
  - Two symmetric columns (the `ContestedFact` markup, with headings **"Strongest case"**
    and **"Strongest counter"**), equal type.
  - Footer, at body size, text-text: **"What would change this:"** `whatWouldChangeThis`.
    This line is the most valuable one on the card.
  - `Cite srcs`.
  - Order: ladder order, then domain, then claim text.
- **cannotShow**: verbatim §8.
- **ask**: none. Narratives are not edges.

### 5.13 Q9 — What is missing?

- **Denominator**: `{v} documented voids · {g} gaps ({gFleet} recorded by research, {gDerived} found by the build) · {sup} superseded claims retained · {orphans} claims not drawn · {missingDomains} domains not yet promoted`
- **answeredBy**: `voids[], gaps[], supersededBy, orphanClaims, EXPECTED_DOMAINS`
- **Graphic**:
  1. **`VoidList`** (new). It sits first because voids are findings. Each void: `what` at
     15px `text-text` (the same size as a finding), `whyItMatters` at 14px, domain label,
     `Cite srcs`. Grouped by domain in chip order, and it respects `dom`. One line above
     the list: "A void is a documented absence — a record that was looked for and does not
     exist. The graph cannot draw it, because there is no edge to draw."
  2. **`GapsPanel`** (existing) with every file's `gaps[]` as `{ what: fullText, why:
     "Recorded by the {domain} research sweep, {asOf}" }`, **untruncated**. The derived
     gaps are added: type conflicts, orphan claims, missing symmetry checks, not-yet-promoted
     domains, "index lists not loaded", "state-government party control is not
     modelled", and alleged claims without a response. The `note`: "Absence here is a
     result. A company or office with no claim may not have been researched."
  3. **Superseded claims** (`DataTable`): old claim `lab`, tier, date · superseded by
     (link → `claim=<new id>`) · what changed (`d` of both). The section appears even when
     empty, with the text "No claim in this build has been superseded."
  4. **Orphan claims** (`DataTable`): claim id · s · t · pred · "endpoint `{id}` not in
     the platform". These were not drawn, and they are listed here.
- **cannotShow**: verbatim §8.
- **ask**: none.

### 5.14 `ClaimCard` (new, used by the Q1 detail panel)

```ts
export function ClaimCard(p: {
  claim: EnergyClaim;
  label: (id: string) => string;
  responses: EnergyClaim[];                                    // answersByClaim + node-pair contras
  supersedes: EnergyClaim[];                                   // claims whose supersededBy === claim.id
  officeHolders: { person: string; role: EnergyClaim; inside: boolean }[];  // date test
  issuer?: { node: string; claim: EnergyClaim } | null;        // law claims only
  onSelectNode: (id: string) => void;
  onSelectClaim: (id: string) => void;
}): JSX.Element;
```

Layout: a header with `lab`, `TierChip`, predicate label, `from – to` (or "undated"),
`₹a cr` (or "no amount recorded"), then `d` and `Cite srcs`. Below that are three
labelled blocks, each linking to its section:

- **Q3 · Held office on {from}**: each office-holder with role dates and the role tier.
  "Holding office on the date is what the date test requires; it is not evidence the
  office-holder made the decision." For an undated claim: "Undated — the date test
  cannot be run." For `law`: the issuer, or "issuer not recorded".
- **Q4 · Who gained**: `who` (link), `how`, amount + confidence as in the ledger,
  `innocentReading` (for analytic), `upgradeIf`, `killIf`. With no `benefit`: "No
  beneficiary recorded for this claim."
- **Q5 · The response**: two equal columns, claim | response, as in Q5. For a
  non-alleged claim with no response: "No response recorded" in muted text.
- **Supersedes**: listed when non-empty.

---

## 6. Visual encodings — what each channel means (frozen)

| element | channel | means exactly | never means |
|---|---|---|---|
| edge | `strokeDasharray` | tier: documented solid · reported `6 3` · alleged `2 4` · analytic `8 3 2 3` (from `TIERS`) | anything else |
| edge | width `0.7 + min(2.4, √a / 26)` (existing) | the ₹ crore on the claim. The minimum width means no amount recorded | benefit, importance |
| edge | rose `#c45b5a` | a response / counter-evidence (`contra`) | "bad", "suspicious" |
| edge midpoint | rose perpendicular tick, response's tier dash | this claim has a recorded response | — |
| node | hue (`FAMILY_COLOR`) | family | domain, party, sector, index |
| node | shape (`SHAPE_CLASSES`) | entity type class | — |
| node | size (`sz`) | the researcher's declared magnitude band 1–4 | degree, centrality, benefit |
| node | dashed outline, 0.25 fill (existing) | unresolved identity | — |
| node | gold ring (existing) | selected by the reader | — |
| any mark | opacity 0.1 / 0.16 | outside the current ego focus, path, or claim context | superseded, low confidence |
| tenure bar | outline dash | tier of the role claim | — |
| tenure lane | vertical hairline + text | a change of central coalition (sourced constant) | party colour |
| decision tick | height 10 / 18 | normal / the selected claim | amount |
| constituent table | `●` / `—` text glyph | index member / not, as of list date | weight in the index |
| constituent / claims cells | hatch | not in platform dataset (no data) | zero |
| coverage chip | hatch + disabled | domain not yet promoted | zero claims |
| narrative ladder | position of the filled cell | calibration step | colour of any kind |
| base-rate bar | length on a shared 0–100% scale | numerator ÷ denominator | — |

**Known collision to flag, not fix here:** the `enforce` family hue (`#c45b5a`) is the
same hex as the contra rose. Because contra is an edge colour and family a node fill,
they never share an element on this page. A platform-wide decision is still owed, and
this page must not "fix" it locally, since that would break cross-page hue consistency.

---

## 7. Filters, their params, and their denominator effects

| control | where | param | options | default | live effect shown |
|---|---|---|---|---|---|
| search | graph rail | `q` | text | — | rail header `{all} → {n} claims` (existing GraphExplorer line) |
| tier checkboxes | graph rail | `tier` | 4 tiers, each with its count | all | same, plus strip fact 1. A response to a visible claim is never hidden |
| family checkboxes | graph rail | `fam` | families present | all | strip facts 1, 2 |
| shape classes | graph rail (upgrade) | `ty` | 5 classes | all | strip facts 1, 2 |
| relationship | graph rail | `pred` | predicates present, with counts | all | strip fact 1. Responses follow their claim |
| minimum ₹ | graph rail | `min` | 0–max(`a`), step 25 | 0 | with `min > 0` the rail note reads "{n} claims with no amount are hidden" |
| time scrubber | graph (upgrade) | `from`,`to` | years in the data span only | — | "{u} undated claims shown at every date"; strip fact 4 |
| domain chips | above graph | `dom` | promoted domains | all | chip counts; strip facts 1–6; Q3–Q9 all respect it |
| index radio + via | graph rail (`extraRail`) | `idx`,`via` | none / 3 indices; `group` | none | `{all} → {n} claims` under the control |
| ego focus | graph | `focus`,`hops` | node; 1–3 | —; 2 | the frame caption `{shown} of {filtered} entities within {h} hops` (focus only; not a filter, so the strip is unchanged) |
| path finder | graph | `path` | two ids | — | status line (§5.5 step 5) |
| sector chips | Q2 | `isec` | constituent sectors, with counts | all | `{union} → {n} companies` |
| membership | Q2 | `ixf` | any / 3 indices | any | same |
| ledger sort | Q4 | `bsort` | name / amount / count | name | none (order only) |
| status chips | Q8 | `nar` | 6 statuses, with counts | all | `{nN} → {n} narratives` |
| table twin include superseded | Q1 twin | `sup` | on/off | off | `{rows} → {rows+sup} rows` |

**Filters the data cannot honour are not offered:**

- There is no mechanism filter over `benefit.how`. It is free text, and a keyword filter
  would be name-matching by another route. If the contract gains a mechanism enum from
  `cui-bono` §2, add it with a `null` bucket shown on the control.
- There is no state filter. `st` is the registered office.
- There is no party filter on the graph.
- The time scrubber's range is the dated span only, and its control prints
  `{dated} of {C} claims have a date`.

---

## 8. Captions the page must carry (verbatim; numbers interpolated)

**Q1 graph.** "Every edge is a sourced claim, not a measure of influence. Where a node
sits is produced by the layout and means nothing. Its size was declared by the
researcher, not computed. Edge width is the ₹ figure written on the claim, and those
figures are of different kinds — a contract value, a tariff, an outlay — so widths
compare only within one kind. A thin edge may simply have no amount recorded. The
dash is the evidence tier and survives greyscale; read it before the colour."

**Q1 with a date window.** "{u} undated claims are shown regardless of the window,
because an undated claim cannot be placed inside or outside it."

**Q1 claim context.** "Lit: the claim, the responses to it, its beneficiary, and whoever
held office at {s} on {from}. Holding office on the date is what the date test
requires; it is not evidence that the office-holder made the decision." Plus, when it
applies: "The claim names {who} as beneficiary; no edge in the record joins them to it,
and none is drawn."

**Q1 cannotShow.** "Who spoke to whom, who knew what, and anything that was never written
down. Relationships the research did not look for — this register was built domain by
domain ({present} of {expected} promoted), and an absent edge is usually an unexamined
one. Where any plant, block or line is: a node's state is its registered office."

**Q2 cannotShow.** "Index membership is as of {indices.asOf}. It says nothing about
membership on the date of any claim, and nothing about index weight. A constituent with
no claim was not necessarily examined: banks and IT firms are absent because this
register did not research them, not because they were cleared. 'Via group' means a group
that owns the company appears; the company itself does not. Separation counts hops in
this graph with direction ignored; short paths between large Indian entities are the
norm (median {m})."

**Q2 sector 2×2 caption.** "An energy register touches energy companies by construction.
Read the 'all other sectors' row before reading anything into the energy rows."

**Q3 cannotShow.** "Tenures are drawn only where a dated role claim exists. A gap in a
lane is a gap in the record, not a vacancy in the office. Being in office when a
decision was dated does not show that the office-holder made it, signed it, or knew of
it. State governments — which sign most discom PPAs and grant most mining leases — are
not modelled as lanes."

**Q4 cannotShow.** "Amounts are not added up. Two claims can describe the same money, and
a contract value, a tariff saving and an outlay are different quantities, which is also
why there is no chart here. 'Estimated' is the researcher's estimate as recorded;
'unknown' is unknown, not zero. What the beneficiary would have got under the previous
rule — the counterfactual — is not in the contract, so no benefit here is net of it."

**Q5 cannotShow.** "A response is recorded as given. Its presence does not make the
claim false, and its absence does not make it true. 'Not asked' is a weakness of the
claim, not of the party."

**Q6 cannotShow.** "A property shared by most comparables is a fact about the category,
not about any one member. A base rate is only as good as its denominator's definition,
which is printed beside it. The separation histogram describes this researched graph,
whose density reflects research attention, not the real world."

**Q7 cannotShow.** "This counts what was researched, not what happened. The register
was built mostly from recent records, so any period will show fewer claims the less it
was examined — compare the coverage column before the filtered column. A change of
central government also coincides with changes of rule (for example, coal allocation
moved to auction in 2014–15), so two windows differ in more than who governed. State
governments of other parties are not modelled; that control is a gap."

**Q8 cannotShow.** "Status is the research sweep's calibration on the evidence it found
as of {asOf}, not the verdict of any court, regulator or auditor."

**Q9 cannotShow.** "This lists only what was looked for. What nobody thought to look for
leaves no trace here."

---

## 9. Empty, partial and loading states

**Loading**: none at the data level (everything is compiled in). The lazy route chunk
uses the existing `RouteFallback`.

| state | render |
|---|---|
| **No energy files at all** | Header; strip `0 claims · 0 of {M} domains promoted · as of —`; CoverageChips all hatched; `Callout tone="warn"` "The energy register has not been promoted in this build. Nothing below is zero — it is absent."; QuestionIndex rows each read "not yet answerable"; Q1–Q8 are **not** rendered; Q9 renders (gaps list the missing domains); SourceLedger empty with "0 sources". `npm run smoke` must pass in this state. |
| **Partial: some domains promoted** (the common case) | Coverage chips show the hatched ones. The strip reads `{k} of {M} domains promoted`. Every question section's denominator line ends with `· {k} of {M} domains`. Q7 SymmetryPanel shows the hatched blocks. Q3 lanes and Q7 coverage chart print `span {minYear}–{maxYear} from {k} domains`, and never imply the span is the whole period. |
| **Partial: dated span shorter than the scrubber could imply** | The scrubber range is the dated span. Q7 coverage x-axis = dated span only. The caption: "The register has dated claims from {min} to {max}; nothing before {min} is plotted because nothing was recorded, not because nothing happened." |
| **Filters leave 0 claims** | The canvas is replaced by "0 of {M} claims match." plus the single active filter that removed the most claims (computed by leaving each one out), a button clearing only that filter, and "reset graph filters". Question sections below keep rendering their own empty lines. |
| **No `indices.json`** | Q2 renders a `Callout tone="note"`: "Index membership lists are not loaded in this build; the route from a Nifty 50 / Sensex stock into this graph cannot be drawn." The `idx` control is disabled with inline text. The hover card omits membership lines. A derived gap is added. |
| **Constituent `existingId` null** | Hatched cells, "not in platform dataset — cannot be joined". |
| **`stock` set to a company with no claims** | CompanyTrail's empty text (§5.6 b5). |
| **Claim without `a`** | Minimum width, "—" in ₹ columns with `title="no amount recorded"`. |
| **Claim without `benefit`** | ClaimCard: "No beneficiary recorded for this claim." Counted in the Q4 denominator `{nb}`. |
| **`benefit.amountCr` null** | "amount unknown", never ₹0. |
| **Undated claim** | In the graph at every date. Not on the lanes and not on the coverage chart; counted in both captions. |
| **No role claims** | Q3: "No dated office-holder is recorded in the promoted domains. The date test cannot be run on any claim." The list of institutions with decisions but no holder still renders. |
| **No path between ends** | Status line: "No path between {a} and {b} in the filtered graph." Q6 histogram still renders for `a`, with the unreachable count. |
| **< 2 dated claims** | Q7 coverage chart replaced by "Too few dated claims ({n}) to chart coverage." MirrorWindow disabled with the same reason. |
| **No narratives / base rates / voids for the filtered domains** | The section stays, with "None recorded for {domains}." A section is never removed. |
| **Alleged claim with no response** | As §5.9, in amber, plus a gap. |

---

## 10. Mobile and tablet

- **< 640px**
  - The graph rail goes in a `<details>` above the canvas, closed by default. The
    `<summary>` reads `filters · {active} active · {all} → {n} claims`.
  - Canvas height is 440px. The camera's pointer pan and pinch work already, and
    `CameraControls` stay visible. The maximise control (`ExpandShell`) is the
    recommended way to read the graph and is labelled "open full screen".
  - The detail panel sits **below** the canvas, and selecting something scrolls it into
    view. ClaimCard's claim/response columns stack with the claim first and the response
    immediately after, at the same width and size.
  - The strip shows facts 1, 3, 6, plus `filtered` and `asOf`. The other facts are
    `hidden sm:inline`. `filtered` is never hidden.
  - QuestionIndex becomes a `<select>` "Jump to question" plus the list (the list stays
    for no-JS reading order).
  - CoverageChips and Q8 status chips sit in their own `overflow-x-auto` rows.
  - Q2 table: the Company, N50/S30/S50 and Direct columns stay. Via group and Trail
    collapse into a row-level "open" link. Horizontal scroll is inside the table
    container.
  - `TenureLanes`: own `overflow-x-auto`, `min-width: 720px`, lane labels
    `position: sticky; left: 0` on `bg-bg`.
  - MirrorWindow collapses into a `<details>` unless `mirror=1`. Its two columns stack.
  - Every "What this cannot show" block stays full size. It is never collapsed on
    mobile.
- **640–1023px**: graph 560px, rail above the canvas (not in `<details>`), detail below.
- **No horizontal page scroll** at any width. Wide content scrolls in its own container.
- `prefers-reduced-motion`: no smooth scroll from "Ask the graph", no animated camera
  fit (the camera already honours it).

---

## 11. Table twins

| graphic | twin | columns | sync |
|---|---|---|---|
| Q1 graph | GraphExplorer table (`table=1`), extended | claim id · domain · from → to (labels) · pred · tier · ₹ cr · dates · beneficiary · confidence · responses (count, ids) · superseded by · source(s) | the same `filterGraph` output as the canvas, plus `dom`/`idx`/`via`. With `sup=1`, superseded rows are added and marked. Orphan claims are appended and flagged. No 400-row cap: a paginated footer "rows 1–400 of {n} · next" |
| Q3 lanes | `DataTable` under the lanes | institution · office-holder · from · to · role tier · decisions dated inside (count, ids) | same filters |
| Q6 histogram | `Distribution` has its own table toggle | hops · entities · share | same `a` |
| Q7 coverage | `DataTable` | year · dated claims · by tier (4 cols) | `dom` |
| Q2, Q4, Q5, Q6 base rates, Q8, Q9 | **are** tables or text | — | — |

Every twin carries `role="table"` semantics via `DataTable` and a caption stating its
row count and the filters in force.

---

## 12. Denominators shown (checklist)

Strip facts 1–6 · coverage `{k} of {M} domains` · QuestionIndex one-liners · the rail's
`{all} → {n}` under every filter · GraphKey tier counts · path status (`one of {count}`,
median, share within k) · Q2 `{direct}/{via}/{none}/{notInDataset}` + sector 2×2 · Q3
`{placed} of {dated}` · Q4 `{b} of {C}` + confidence split · Q5 `{x} of {y}` + asked/not
asked · Q6 numerator/denominator per base rate + separation base · Q7 per-coalition
counts **with coverage** · Q8 six-step counts · Q9 voids/gaps/superseded/orphans ·
source ledger `N sources · P primary`.

---

## 13. What the page refuses to show, and why

- **No map centre and no GeoNetwork view.** `st` is the registered office (NTPC is in
  Delhi, Coal India in Kolkata). Drawing it as geography asserts a location the asset
  does not have. Located blocks are mapped on `/resources`, which this page links to.
- **No influence, centrality, "most connected", exposure or risk score**, and no ranking
  by one. Degree in a researched graph measures research attention. Q2's "public offices
  in its record" is a list, not a score.
- **No benefit totals**, in any row, footer, tooltip, hover card or export.
- **No amount axis in the ledger** (D5).
- **No party colour and no party aggregation** ("party X's ministers → ₹Y"). Party
  appears only as text on a tenure bar, backed by a role claim, and as a PM name on
  coalition annotations.
- **No "the other side did it too" verdict.** The mirror window prints two counts with
  their coverage and stops. There is no ratio and no difference.
- **No share-price or index-level line against claim dates.** An event study needs daily
  closes, a market model and pre-registered windows. A price line next to a decision
  date implies a reaction the page cannot test. This is recorded as a gap.
- **No index-weight exposure %.** Free-float weights are not in the data.
- **No index glyph on graph nodes** (D2). Membership shows in words in the hover card
  and the table.
- **No community detection or cluster colouring.** An algorithmic cluster rendered as a
  group reads as a cabal (hub and small-world traps).
- **No motif z-scores.** The award subgraph is star-shaped, so the null model is
  degenerate (HANDOFF result 1). `/motifs` says so, and this page links there rather than
  printing `z`.
- **No default selection** of any party, person, company, index or domain.
- **No colour that means "suspicious".** Rose appears only on responses.
- **No unresolved node as an endpoint and no orphan drawn**. Orphans are listed in Q9.
- **No "show more" on sources.** Every claim row and every card shows all its sources.

---

## 14. New components and props

`src/components/Questions.tsx`: `QuestionSection` (§5.0), `QuestionIndex`
(`{ rows: { n: number; id: string; question: string; answer: string }[] }`),
`CoverageChips` (`{ domains: { slug: string; label: string; claims: number | null; asOf: string | null }[]; active: Set<string>; onToggle(slug) }`
— a null `claims` means not yet promoted).

`src/components/Claims.tsx`: `ClaimCard` (§5.14), `NodeCard` (`{ node: EnergyNode;
claims: EnergyClaim[]; membership: string | null; onSelectClaim; onOpenTrail? }`),
`BenefitLedger` (`{ groups: BenefitGroup[]; sort; onSort; onSelectNode; onSelectClaim }`,
where `BenefitGroup = { who: string; label: string; membership: string | null; claims:
EnergyClaim[]; largestDocumented: EnergyClaim | null }`), `NarrativeCard` (`{ n:
Narrative; domain: string }`), `BaseRateTable` (`{ rows: (BaseRate & { domain: string
})[] }`), `SymmetryPanel` (`{ entries: { domain: string; text: string | null; asOf:
string | null }[] }`), `VoidList` (`{ voids: (Void & { domain: string })[] }`),
`GraphKey` (`{ tierCounts: Record<Tier, number> }`).

`src/components/viz/TenureLanes.tsx`:
```ts
export interface Lane { id: string; label: string; fam: NodeFamily;
  spans: { person: string; label: string; party: string | null; from: string; to: string | null; tier: Tier; claimId: string }[] }
export interface LaneEvent { claimId: string; laneId: string; date: string; tier: Tier; label: string }
export default function TenureLanes(p: { lanes: Lane[]; events: LaneEvent[]; range: [string, string];
  asOf: string; coalitions: { label: string; from: string }[]; selectedClaim?: string | null;
  onSelectClaim(id: string): void; onSelectNode(id: string): void }): JSX.Element;
```

`src/components/Market.tsx`: `ConstituentTable` (`{ rows: ConstituentRow[]; indexKeys:
string[]; asOf: string; onOpenTrail(id: string): void }`, where `ConstituentRow = {
id: string | null; symbol: string; name: string; sector: string | null; member:
Record<string, boolean>; direct: Record<Tier, number>; via: { group: string; n: number } |
null }`), `CompanyTrail` (`{ company: Company; membership: string; offices: OfficeRow[];
money: EnergyClaim[]; voids: Void[]; median: number; onSelectClaim; onAsk }`),
`MirrorWindow` (`{ window: [string, string] | null; coalitions: Coalition[]; count:
(w: [string, string]) => { filtered: number; coverage: number; tiers: Record<Tier,
number> }; onApply(w: [string, string]): void }`).

SVGs carry `role="img"` and `<title>`. Interactive marks are focusable, with a visible
focus ring and Enter to activate.

---

## 15. Build estimate

Create:

| file | est. lines |
|---|---|
| `src/graph/energy.ts` — load, merge, hydrate, partition (or extend the module if it exists) | 180 |
| `src/data/energy.ts` — all selectors, `EXPECTED_DOMAINS`, energy sector list | 280 |
| `src/data/indices.ts` — load `indices.json`, `membershipOf(id)`, `constituentRows()` | 70 |
| `src/data/governments.ts` — `CENTRAL_COALITIONS` with sources, or derivation | 50 |
| `src/components/Questions.tsx` — QuestionSection, QuestionIndex, CoverageChips | 170 |
| `src/components/Claims.tsx` — ClaimCard, NodeCard, BenefitLedger, NarrativeCard, BaseRateTable, SymmetryPanel, VoidList, GraphKey | 480 |
| `src/components/Market.tsx` — ConstituentTable, CompanyTrail, MirrorWindow | 300 |
| `src/components/viz/TenureLanes.tsx` | 210 |
| `src/pages/Energy.tsx` | 420 |

Modify:

| file | change |
|---|---|
| `src/components/viz/GraphExplorer.tsx` | `urlSelection`, `answers`, `highlight`, `renderDetail`, `hoverExtra`, `extraRail`, `ownKeys`, `onSelectEdge`, `stickyTop`, `table` param, the paginated twin with extra columns (~140 lines, on top of the in-flight upgrade) |
| `src/components/viz/ForceGraph.tsx` | claim-context highlight, contra midpoint tick and connector, edge hit-stroke + keyboard for `onSelectEdge` (~90 lines) |
| `src/App.tsx` | lazy route |
| `src/components/Layout.tsx` | nav item |
| `scripts/smoke.mjs` | routes: `/energy`, `/energy?claim=__missing__`, `/energy?idx=nifty50&dom={first}&stock={first constituent}&path=a,b` (ids read from data at smoke time), and a run with `research/raw/energy/` absent |
| `docs/INDEX.md`, `HANDOFF.md` | route count, one line on the page |

Roughly 2,160 new lines and 250 modified. Gates: `npx tsc -b`, `npm run build`,
`npm run validate`, `npm run smoke` (including the no-files state). Take a greyscale
screenshot of Q1 to verify that the tier dashes and the rose tick stay distinguishable,
and of Q3 for the tenure dashes.

---

## 16. Frozen — the developer may not adjust these to make it fit

1. Tier = `strokeDasharray`, from `TIERS`, on edges, ticks, tenure bars and the response
   tick. Never a colour-only substitute.
2. Node hue = `FAMILY_COLOR`, node shape = `SHAPE_CLASSES`, node size = `sz`. No fourth
   meaning on any of them. No index cap, no party ring, no domain tint.
3. Rose only on responses (`contra`).
4. Benefit amounts are never summed and never plotted on a shared axis.
5. "What this cannot show" renders at body size in every question section. Never
   collapsed, never smaller.
6. `GapsPanel` and `VoidList` render at finding size.
7. The response column is the same width, size and weight as the claim column.
8. The default view is unfiltered, with no selection. Q2 is ordered alphabetically and
   Q4 by name.
9. Undated claims are never hidden by a date filter. Null amounts are never rendered as
   ₹0. No-data is never rendered as zero.
10. The mirror window prints coverage beside every count and never a ratio.
11. The path status never shows a path length without its `count` and the median.
12. Every filter shows its `{all} → {n}` effect beside the control.
