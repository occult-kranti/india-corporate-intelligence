---
name: frontend-implementation
description: Build pages, components and data modules in this codebase — React 18 + TypeScript + Vite + Tailwind v4, static build, no runtime fetches. Use when implementing a designed page, adding a route, wiring a dataset, or changing the build/validation pipeline.
---

# Frontend Implementation

Fourth role in the loop: **journalist → pattern matcher → designer → developer.** You
receive a spec whose facts are sourced, whose statistics are corrected, and whose
encoding is decided. Your job is to build it so it cannot silently drift from those.

## The architecture, and why it is this way

```
research/raw/*.json      quarantine — agents write here, untrusted
      │  npm run promote  extract → resolve → ground → assemble
      ▼
src/data/*.ts            typed, compiled in, in the git history
      │  vite build
      ▼
dist/                    one static bundle, no runtime fetches
```

**No runtime data fetching. Ever.** Not a CDN, not an API, not a JSON file loaded on
mount. Everything is compiled in. This is why the site is free to host, cannot be taken
down by breaking an API, works offline, and — the part that matters — is auditable:
every number ever shipped is in the git history with the commit that put it there.

Five runtime dependencies. Adding a sixth requires a reason that survives the question
"what does this do that 40 lines of our own code would not?"

## The rules that are enforced, not suggested

`npm run validate` runs in CI and will fail the build:

1. **Provenance.** Every edge carries `srcs`, or is tier `alleged` / `analytic`. There
   is no third option.
2. **Entity resolution.** Nodes join on DIN / CIN / office-with-dates. Never on a name.
   `resolved: false` nodes may not be an endpoint of any edge.
3. **Supersession.** Facts are superseded, never deleted. A wrong number stays in the
   history with the correction linked.
4. **Contradiction.** `contra` edges are first-class. A page showing a claim must be
   able to show its denial.
5. Every `analytic` edge carries an `innocentReading`.

Do not work around a validator failure. It is telling you the data is wrong.

## Deriving beats duplicating

**Never hand-write a figure into a page.** Derive it from the dataset at module scope:

```ts
// Right — cannot drift, and the page updates when the data does.
const denominator = AWARDS.length;
const distinctWinners = new Set(AWARDS.map((a) => a.winnerId)).size;

// Wrong — a literal that will be wrong within one commit and stay wrong.
const denominator = 1204;
```

If a number is expensive to derive, memoise it — do not copy it. A page that restates
a dataset figure is a page that will contradict the dataset.

## Patterns in this codebase

- **Routing** — `HashRouter`, `base: './'`. Deep links must work from a static host
  with no server rewrite rules.
- **URL state** — filters live in `useSearchParams`, never in `useState` alone. If it
  changes what the reader sees, it belongs in the URL.
- **Editorial primitives** — `Kicker`, `PageTitle`, `Standfirst`, `Section`, `Prose`,
  `Callout`, `StatGrid`, `DataTable`, `TierChip`, `TierLegend`, `Cite`, `Footnote`
  from `src/components/Editorial.tsx`. Use them. A page that rolls its own heading
  styles diverges within two commits.
- **`DataTable` takes `ReactNode[][]`** for rows. Not a bracket lookalike character —
  a full-width `［` will typecheck as an identifier and fail confusingly.
- **Charts and maps are hand-written SVG.** No chart library. `d3-force` is used for
  layout only.
- **Code-split heavy routes** via `React.lazy`. The group deep-dives are large.

## Determinism

Anything statistical must produce identical output on every run.

- **Seed every RNG and ship the seed.** `Math.random()` in a data path is a defect —
  it was rejected once already, as sparkline "price history".
- Null-model ensembles are seeded per shuffle index, so a q-value is reproducible from
  the commit alone.
- Sort with an explicit tiebreak. `[...xs].sort((a, b) => a.q - b.q || a.id.localeCompare(b.id))`.
  An unstable sort makes diffs unreadable and screenshots non-reproducible.

## Performance budget

- A page must be interactive in under ~400ms of main-thread work on the datasets it
  ships with. Enumeration engines declare a budget and **report when they exceed it**
  rather than silently thinning the work.
- Prefer a `useMemo` over a `useEffect` + state for derived data. There is no async
  here; an effect that sets state from props is a bug with extra renders.
- The full-graph force simulation gets a fixed tick count, not a stable-energy loop.

## The gates — all four, before every push

```bash
npx tsc -b          # no errors, no `any` added to public types
npm run build       # must succeed
npm run validate    # the four invariants
npm run smoke       # every route renders, zero page errors
```

`npm run smoke` navigates to `about:blank` between routes on purpose — hash-only
navigation does not reload, so one route crashing used to blank every route after it
and turn a red build green. Do not "optimise" that away.

If a gate fails, fix the cause. Never disable a gate to land a change.

## Accessibility and robustness

- SVG that carries meaning gets `<title>` and `role="img"`.
- Tier must be legible without colour — that is what the dash pattern is for. Verify by
  screenshotting in greyscale, not by reasoning about it.
- Interactive SVG elements need keyboard focus and a visible focus ring.
- No layout that requires horizontal page scroll. Wide tables and charts scroll inside
  their own `overflow-x: auto` container.

## What you never implement

- A runtime fetch.
- A hard-coded figure that also exists in a dataset.
- `Math.random()` anywhere that affects displayed data.
- A component that renders `alleged` and `documented` the same way.
- A "score" the platform computes and presents as a property of a real entity.
- A silent catch. If data is missing, render the absence — do not render zero.

## Reporting back

State what you built, which gates you ran and their actual output, and what you left
undone. **If a gate failed, lead with that.** A green report on a red build is the most
expensive kind of error in this codebase, because everything downstream trusts it.
