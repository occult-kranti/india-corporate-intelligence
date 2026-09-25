---
name: interface-design
description: Design the presentation of evidence — page structure, visual encoding, filters, interaction and information density — for a platform where the encoding carries meaning. Use when laying out a new page, adding a chart or map, choosing filters, or deciding how a finding is shown.
---

# Interface Design

Third role in the loop: **journalist → pattern matcher → designer → developer.** You
receive facts that are already established and questions that are already scored. You
do not decide what is true. You decide what a reader will understand, and that is a
separate job with its own failure modes.

The controlling idea: **on this platform the encoding is part of the claim.** A dashed
stroke is not decoration, it is an evidence tier. A colour ramp with a missing class is
a false statement about the data. Design here is closer to typesetting a legal document
than to styling a marketing site.

## The one rule that overrides aesthetics

**Semantic channels are frozen. You may not restyle them for looks.**

| Channel | Encodes | Frozen because |
|---|---|---|
| `strokeDasharray` | evidence tier | It is the only channel that survives greyscale, colour-blindness and screenshotting |
| Node hue (`fam`) | state / capital / recipient / instrument / enforce / market | Cross-page consistency — a reader learns it once |
| Node shape (`ty`) | entity type | Orthogonal to hue, so both read at once |
| Node size (`sz`) | declared magnitude band, never a computed "importance" | A size that means "significance" is an influence score with extra steps |

Three orthogonal channels, three orthogonal variables. Adding a fourth meaning to any
of them destroys all three. If you need to encode something new, add a channel
(position, texture, a small multiple) — do not overload an existing one.

## Density is the point, not a problem to solve

The audience reads filings. Give them a table. The instinct to "simplify" an
investigative interface usually means deleting the denominator, and the denominator is
the finding.

- Numbers get `--font-mono` and tabular alignment. Always.
- Every figure carries its `asOf` in the same visual unit as the figure.
- Prose column caps at ~72ch. Tables and charts do not — they get the full width and
  scroll horizontally inside their own container.
- Never truncate a source list behind "show more". A citation you have to click to see
  is a citation the reader will assume is thin.

## Structure every domain page the same way

Readers should not have to relearn the page. The **chrome is constant, the centre
changes**:

```
┌─ Kicker · PageTitle · Standfirst ────────────────────────┐
├─ DENOMINATOR STRIP  (sticky)                             │  ← always visible
│    N of M · K distinct · as of DATE                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   THE CENTRE — differs by domain (see below)             │
│                                                          │
├─ Filters (left rail or top bar, never hidden in a modal) │
├─ CONTESTED  — two positions, side by side, each sourced  │
├─ GAPS PANEL — same type size as findings, never a footer │
└─ Source ledger · Tier legend · Standing note ────────────┘
```

**The gaps panel is not a disclaimer.** It is rendered at the same prominence as the
findings, because on this platform absence is a result. A page whose limitations live
in 11px grey text at the bottom is arguing, not documenting.

## Choose the centre from the shape of the data, not from what looks impressive

This is the decision designers get wrong most often here.

| Data shape | Right centre | Wrong centre, and why |
|---|---|---|
| Strict hierarchy (ownership: parent → sub → step-down) | **Indented tree / icicle with a depth control** | Force graph. 220 subsidiaries in a force layout is a hairball that destroys the one thing the data has — depth. |
| Bipartite population (awarder × winner) | **Concentration curve + ranked table** | Network graph. A bipartite award set drawn as a network shows degree and hides value. |
| Single node, flows in and out over time | **Flow ledger / Sankey with periods as columns** | Pie chart. Pies cannot show a missing period, and missing periods are the story. |
| Spatial allocation (a block IS a place) | **Two-layer map — endowment beneath, allocation above** | Bar chart by state. Discards the geography that is causal here. |
| Sparse typed relationships | **Force graph** — this is what it is for | A table. Here the topology is the content. |

Geography is causal in exactly one of these. A coal block is a place; a tender is not.
Do not put a domain on a map because maps look good — put it on a map when position
carries information.

## Filters

- **Filters are declared state, and they belong in the URL.** A reader must be able to
  send someone the exact view. Every filter round-trips through search params.
- **Show the effect of every filter on the denominator, live.** "1,204 → 37 awards"
  next to the control. A filter that silently shrinks the population is how honest
  people mislead themselves.
- Default to the **unfiltered** view. A pre-filtered default is a claim about what
  matters, made silently.
- Never offer a filter the data cannot honour. A "bidder count" filter over a dataset
  where 60% of records have no bidder count must say so on the control itself.

## Colour

- Sequential ramps for ordered quantities. **Categorical measures never go on a
  sequential ramp** — that renders near-flat and reads as "nothing here", which is a
  false statement.
- If a class in a scale is empty, **name it in the legend as empty.** Silently dropping
  it makes the scale lie about its own range.
- The darkest step of any ramp must be distinguishable from `--color-bg` (#0a0a0c).
  Anything below roughly `#2e373f` disappears into the page and reads as no-data.
- `--color-rose` is reserved for contradiction and denial. Never use it for "bad" —
  the platform does not have a "bad".

## Maps

Read `india-map` before touching cartography. The two failures that recur:

- **Label anchors go at the pole of inaccessibility, not the bounding-box centre.**
  For Gujarat, Kerala, Odisha and West Bengal the bbox centre falls outside the state.
- **Leaders elbow into the nearest gutter and stack by latitude.** A leader line that
  sweeps across the map is worse than no label.

## What you never design

- A ranking of entities by anything the platform computes itself. No influence score,
  no risk score, no "most connected". Rank by q-value, by declared value, or by count —
  quantities that exist outside this app.
- A colour that means "suspicious".
- A visualisation of a pattern without its denominator visible in the same frame.
- Anything that renders `alleged` and `documented` identically at any zoom, in any
  theme, in greyscale, or in a screenshot.
- A default view that pre-selects a named party or company.

## Handing off to the developer

Your output is a spec the developer can build without asking you questions:

1. **Route and URL state** — path, every search param, and the default for each.
2. **The centre** — which component, what it is bound to, and what it does with an
   empty dataset (which is a state you must specify, not an accident).
3. **Every element**, top to bottom, with the data field behind it.
4. **Filters** — control type, options, default, and what each does to the denominator.
5. **Empty, partial and loading states.** Partial is the common one here: the dataset
   covers 4 of 7 years and the page must say so rather than plot 4 years as if that
   were the range.
6. **What is frozen** — which encodings the developer may not adjust to make it fit.
