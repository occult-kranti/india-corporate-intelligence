# Hand-off — India Corporate Intelligence Platform

*You are picking this project up cold. Read this file, then `docs/INDEX.md`, then start.*

---

## What this is

A map of India's listed corporate landscape joined to a **provenance-bearing
knowledge graph** of political and ownership connections. Every claim carries an
evidence tier; every pattern carries its denominator. The platform is as interested
in what it cannot show as in what it can.

It is a React + TypeScript + Vite single-page app with no runtime dependencies, no
backend, and no network calls. All data is compiled in. `npm install && npm run dev`.

## Why it is built the way it is

Two projects merged. **ICIP** had breadth — every NSE/BSE company, every state — and
no evidence discipline, which produces the exact artefact this project exists to
avoid: a dense, alarming-looking web whose edges are near-universal and therefore
measure nothing. **The Money-Trail Atlas** had depth — every edge a sourced claim
with a tier — and kept hitting one wall: *is this edge unusual?* It could not
answer, because it had no population to compare against.

The Atlas supplies the epistemics. ICIP supplies the population. The Atlas's four
invariants became the graph schema, enforced in CI; ICIP's company dataset became
the reference class that gives Atlas claims their denominators.

---

## The four invariants — do not weaken these

Enforced by `npm run validate` and `npm run promote`, which CI runs. They are build
steps, not conventions.

1. **Provenance.** Every edge carries `srcs`, **or** is tier `alleged`/`analytic`.
   Never invent a source, figure, date, quote, ticker or CIN. If you cannot verify
   it, `null` it and record the gap.
2. **Resolution.** One real-world entity, one canonical node, aliases on the node.
   Identity is confirmed by DIN, constituency, office-with-dates or DOB — **never**
   by name match. A node with `resolved: false` may not be an endpoint of any edge.
3. **Supersession.** When a fact changes, the old claim is retained and stays
   addressable. Nothing is ever deleted from the graph.
4. **Contradiction.** Denials are first-class `contra` edges, rendered as
   prominently as the claims they answer.

## What this platform will not do

- Assert that any named person committed an offence.
- Publish a private individual's details, or an allegation about a person with no
  public role.
- Link entities on name similarity.
- Render a pattern as a finding without its denominator, its innocent reading, and
  its kill condition.
- Present a self-declared affidavit figure as audited, or an asset trajectory
  without its peer baseline.
- Draw an edge between a minister and a company on the basis of shared state or
  shared sector. Co-location is context; it is never a relationship.

If a request would require breaking one of these, say so and propose the nearest
thing that does not.

---

## State of play

**Shipped and tested.** 21 routes, all rendering clean under a headless smoke test.
36-state boundary geometry with pole-of-inaccessibility label anchors. A choropleth
map, a geographic network (entities in place, arcs between them, plus a state-flow
aggregation), a force-directed graph with a shareable filter rail, a layered flow
diagram, a computed motif engine, and an ingestion pipeline with a reproducible run
id. 259 companies, 69 ministers, 10 conglomerate groups, 106 sourced relationships
in the case study.

**Three results worth knowing before you start**, because they shape what is worth
doing next:

1. **The motif engine reports that most of its templates are untestable.** The
   case-study subgraph is star-shaped — nearly every award edge shares one ministry
   as its source — so a degree-preserving swap between two award edges returns the
   same edge set. The null model has zero variance and any z-score against it is
   meaningless. The engine says `degenerate-null` rather than printing `z = 0.00`.
   **Fixing this needs the full award population, not a better algorithm.**
2. **Interlocks came back zero.** No name in the dataset holds two roles, because
   the data is each group's declared key people, not a directorship register. The
   page says which of those two things the zero means, and pivots to the frame the
   data does support — family control span across separately listed entities.
3. **The false-positive demonstration is the most important thing on the platform.**
   A naive surname matcher would draw 7 minister-to-office-holder edges from this
   dataset. The comparison family is 69 × 55 = 3,795 pairs; at a conservative
   1-in-200 shared-surname rate, chance predicts ~19. We found 7 — *fewer* than
   chance. There is no excess to explain.

---

## Where to pick up

### Highest value, in order

1. **Full award population.** Every coal and mining award 2019–24 against every
   donor, with a date-shuffled control holding donation volume fixed. This is the
   one piece of work that unblocks the motif engine, settles the quid-pro-quo
   question in *both* directions, and is computable from public data today. Nobody
   has published it.
2. **Coal India and mining-PSU CSR destinations 2019–24.** The direct analogue of
   the published ONGC finding, inside the ministry that actually matters. CSR annual
   reports are public. The single most answerable open question in the file.
3. **DIN-keyed directorships.** The only reliable join key for Indian directorships.
   Until every person node carries one, every interlock claim is provisional and
   the interlock page stays a caveat with a table attached.
4. **Companies to ~600.** Nine large recent listings were deliberately omitted
   rather than risk a fabricated ticker — see `research/raw/companies-by-state.json`
   gaps. Adding them widens the reference class, which is what makes base rates
   sharper.

### Known gaps, stated plainly

- Promotion writes a report; it does not yet *generate* `src/data/*.ts`. The
  boundary and the audit exist; the codegen does not.
- Media ownership is thin and the page says so. It needs an RNI/MIB register.
- Base rates are published for six edge types, not computed for all of them.
- No time-resolved tenures on corporate roles, so no time-resolved interlocks.

### Do not

- Add a motif template without an innocent reading and a kill condition.
- Add an allegation without finding the denial first.
- "Fix" the untestable motifs by loosening the null model.
- Add a dependency to draw something that can be drawn with SVG and arithmetic.

---

## Working on it

```bash
npm install
npm run dev        # vite dev server
npm run promote    # research/raw → resolution + grounding report
npm run generate   # research fleets → src/graph/energy.generated.ts, src/data/welfare.generated.ts
npm run validate   # the four invariants
npm run build      # tsc -b && vite build
npm run smoke      # headless render of all 21 routes; serves dist itself
npm run check      # all of the above, in order
```

`npm run smoke` needs a Chromium. It uses the environment's pinned binary if one
exists; override with `PLAYWRIGHT_CHROMIUM_PATH`, or `npx playwright install chromium`.

### The agents

Six are defined in `.claude/agents/`, each with a bounded job and an explicit
refusal. Use them — they encode the rules above so you do not have to re-derive
them. `evidence-auditor` and `base-rate-statistician` in particular exist to tell
you "no", and a COLLAPSES verdict from them is a successful output, not a setback.

### House voice

The pages are documents, not dashboards. Precise, non-sensational, and willing to
say what they do not know. Every page that shows a number shows its denominator.
Every page that shows a pattern shows the boring explanation that also fits. Read
`src/pages/Patterns.tsx` and `src/pages/Interlocks.tsx` before writing a new page —
they are the register to match.

---

## Standing

This platform maps public records and published claims about the conduct of public
offices, and is a matter of legitimate public interest. It asserts no guilt.
Allegations are identified as allegations, attributed, and paired with the response
of those they concern. No node adjudicates a quid pro quo.

The **documented void** — the largest beneficiaries in the case-study graph carrying
no traceable political donations at all — is rendered as loudly as any flow. A graph
that can only show what exists systematically overstates the case. Keep it that way.
