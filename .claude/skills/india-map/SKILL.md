---
name: india-map
description: Render the accurate India state/UT map used across ICIP — geometry, label anchors, choropleth scales, cluster marks, drill-down. Use for any map work, state-level visualisation, or NSE/BSE geographic view.
---

# India Map

## Choose the boundary era explicitly

For the shared investigation workspace, use
`src/components/investigation/assets/india-current36.json` through
`InvestigationMap.tsx`. This is the current **36-unit administrative roster**:
separate Jammu and Kashmir / Ladakh, and the merged Dadra and Nagar Haveli and
Daman and Diu. The geometry comes from the LGD/BharatMaps state-boundary service,
via ramSeraph and DataMeet, under the explicitly linked CC0-1.0 licence. Exact
source URL, archive digest, retrieval date, projection, simplification and
boundary-scope notes live in the asset and its adjacent `README.md`. Its upstream
survey/snapshot date is not established; do not invent one from a rehost's date.

The current asset has a `0 0 640 720` viewBox, uppercase `code`, real `path`,
`x`/`y` pole-of-inaccessibility anchors, `clearance`, `parts` and explicit LGD
identities. Its generator retains all 832 polygon components. Regenerate only
with `scripts/investigation/build-map.py`, which verifies the pinned source
archive hash. Preserve the upstream geometry and its stated boundary scope;
do not add an independent assertion resolving territorial disputes.

**Legacy boundary tags must not silently become current geography.** The old
lowercase `jk` refers to an undivided boundary; old `dn` and `dd` are separate
pre-merger units. Do not assign these to current `JK`, `LA` or `DN`, or split
historical values proportionally, without a sourced temporal crosswalk. The
investigation registry withholds those ambiguous legacy placements. Explicit
current uppercase codes remain valid. Distinguish project/programme/institution
coverage from headquarters, constituency or generic state association. Keep
national and unknown geography unlocated.

A record-count map describes the curated corpus, not site incidence, funding
amounts or misconduct. Zero matching records means no recorded matches in that
filter; it does not establish no activity. Explain multi-state double-presence
and show national/unknown counts separately.

## Legacy geometry — historical displays only

`src/data/india-geo.json` contains **36 older geographic units**, not the current
36-unit roster: undivided Jammu and Kashmir, no Ladakh, and separate Dadra and
Nagar Haveli / Daman and Diu. Its `viewBox "0 0 612 696"` is derived from
`@svg-maps/india`. Retain it only for legacy displays with an explicit historical
boundary notice. Each entry:

```ts
{ id, name, path, cx, cy, clearance, area, bbox, parts }
```

- `path` — the real SVG path string. Use it verbatim. **Never approximate a state
  with a rectangle or a hand-drawn polygon.**
- `cx`,`cy` — **pole of inaccessibility** of the largest sub-polygon: the interior
  point furthest from any edge. This is the label anchor. Do not substitute a
  bounding-box centre — it falls outside Gujarat, Kerala, Odisha and West Bengal.
- `clearance` — radius of free space around the anchor, in viewBox units. This is
  your label-fit budget.
- `parts` — number of sub-polygons. West Bengal has 63, Gujarat 17, Andaman 36.
  Islands and enclaves are real; do not drop them.

## Label placement rules

| clearance | treatment |
|---|---|
| ≥ 20 | Full state name inside, centred on the anchor |
| 8–20 | Two-letter code inside, name in tooltip |
| < 8 | Outboard label with a leader line — mandatory for `ch`, `dl`, `py`, `ld`, `dd`, `dn`, `ga`, `sk` |

Outboard labels stack in a right- or left-hand gutter, ordered by `cy`, with a
1px leader from the gutter to the state anchor.

## Choropleth

- Sequential, perceptually uniform ramps for magnitudes (market cap, GSDP, company
  count). Never rainbow, never red-green as the sole channel.
- Bin with quantiles when the distribution is heavy-tailed — and Indian state
  market cap is *extremely* heavy-tailed: Maharashtra alone carries a large
  plurality of listed market cap, so a linear ramp renders 30 states identical.
  Offer a log toggle and default to quantile bins.
- **No data ≠ zero.** Null states render as a distinct hatch or hollow fill with an
  explicit legend entry. Sikkim having no large listed HQ is a fact, not a gap.

## Marks on top of the map

- Company/entity marks sit at a jittered offset from the state anchor using the
  **golden angle** (137.507°) with radius stepping by `sqrt(i)`, clamped to
  `clearance`. This is a deliberate, documented approximation — the UI must say
  "positioned within state, not geocoded" wherever marks are shown.
- Where a real city coordinate exists, use it and mark the entity `geocoded: true`.
  Mixed geocoded/anchored views must distinguish the two visually.

## Interaction

- Hover: state outline lifts, tooltip with name + the encoded metric + denominator.
- Click: drill down to the state panel — top listed companies, dominant industries,
  ministers from that state, GSDP.
- Keyboard: states use a documented roving-tabindex order (alphabetical in the
  current investigation map, north-to-south in the legacy map); arrow keys move,
  Enter or Space selects, Escape clears. Provide an equivalent labelled state
  selector so small islands and union territories remain easy to reach.
- `prefers-reduced-motion`: no transitions on fill, no animated zoom.

## Aesthetic

Cartographic engraving, not dashboard chrome. Hairline internal borders
(0.4–0.6px), a slightly heavier national outline, a faint plate mark, and a
restrained ground. Texture belongs in the fills, not in drop shadows.
