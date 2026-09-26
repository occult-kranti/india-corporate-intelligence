# Interactive network-graph UI — state of the art, and the one path for ICIP

*2026-09-25. Senior-viz review for the graph that is the centrepiece of the platform.
Written against `src/components/viz/ForceGraph.tsx` (943 lines), `GraphExplorer.tsx`
(1,083), `GeoNetwork.tsx` (1,457), `camera.tsx` (350) and `src/graph/schema.ts` as they
stand on this branch. Package versions are from `registry.npmjs.org` on the date above;
bundle sizes were measured here with esbuild 0.24.2 (`--bundle --minify`, react external,
gzip -9). Anything I could not verify is marked as such — GitHub's API was not reachable
from this session, so star counts, issue velocity and release notes were not checked.*

---

## 0. The verdict in one paragraph

Keep the graph model, the filters, the ego focus, the path finder, the denial invariant,
the URL state and the table twin — they are already ahead of most of the commercial tools
surveyed below. Replace only the **renderer**: move the drawing from React-reconciled SVG
to a Canvas 2D surface driven from a ref, keep `d3-force` as the layout but run it in an
inline Web Worker, keep `camera.tsx` as the one camera for both graphs, and add a
deliberate accessibility layer (an examined-set overlay plus a keyboard cursor) so the
canvas is never the only way in. This adds **zero new runtime dependencies** (one
transitive dependency, `d3-quadtree`, becomes explicit), costs roughly +6–9 KB gzipped of
our own code, renders 1,500 nodes and 2,000 dashed edges at frame rate, and keeps every
frozen semantic channel — tier dash, type shape, family hue, weight size — **byte-for-byte
identical** to the SVG version, because Canvas 2D takes the same `stroke-dasharray` numbers
and the same SVG path strings. Do **not** adopt sigma.js, cosmos, cytoscape, G6, ELK or
edge bundling; §7 says why for each. If the graph later outgrows ~3,000 nodes, the
escalation path is sigma.js 3 with a custom dashed-edge program, and §8 specifies it so
that decision is not re-researched from scratch.

---

## 1. What the graph is today — and what must survive

### 1.1 The invariants the schema imposes on the picture

| Channel | Encodes | Where it is defined | Must survive as |
|---|---|---|---|
| `strokeDasharray` | evidence tier: `''` / `6 3` / `2 4` / `8 3 2 3` | `TIERS[t].dash` in `schema.ts` — "semantic, not decorative — never restyle for looks" | exactly these four patterns, per edge, at every zoom |
| node shape | type → five shape classes (`shapeClassOf`) | `shapeFor()` in `ForceGraph.tsx` — SVG path strings memoised per (class, radius) | the same five glyphs; the legend (`SHAPE_CLASSES`) is also the `ty` filter |
| node hue | family (`FAMILY_COLOR`, six values) | `ForceGraph.tsx`, imported by `GeoNetwork.tsx`, `GeoGraph.tsx` | unchanged palette |
| node size | declared band `sz` 1–4 → radius `4 + sz·3.2` | `ForceGraph.tsx` | never a computed centrality |
| red + width | a denial (`pred: 'contra'`) | `edgeWidth`, `edgeLit`, the batching rule | a denial is lit whenever any claim it answers is lit; never batched; drawn at least as wide as the widest claim on the pair (`GeoNetwork.widthOf` already does this; `ForceGraph` does not yet — see §6.3) |
| dashed outline | `resolved === false` — identity unconfirmed | node `strokeDasharray='2 2'`, `fillOpacity .25` | unchanged; such nodes take no edges |
| table twin | the WCAG-clean equivalent of the graphic | `GraphExplorer` `DataTable`, reads the **same** `filterGraph` output | still the same function, still the same rows |

### 1.2 What is already state-of-the-art here

Having read the survey tools' feature lists against this code, the following are already
in place and — this matters — implemented more honestly than the commercial equivalents:

- **Ego focus** at 1–3 hops that never re-runs the layout, with a denial re-admitted into
  the neighbourhood when it answers a claim inside it, and the caption counting that.
- **Shortest-path finder** over the *visible* edges, direction ignored, every parallel edge
  on a step highlighted (choosing one would be choosing the evidence), **with the median
  degree of separation of the view printed next to it** — the baseline that stops a
  3-hop path being read as a relationship. No surveyed tool prints that baseline.
- **Time scrubber** with dual handles, commit-on-release, and undated edges never hidden
  ("absence of a date is not evidence about when something happened").
- **Semantic labels** by `k × degree` and `sz`, counter-scaled so text stays 9.5 px.
- **Minimap** that appears only when part of the graph is off-screen.
- **Legend-as-filter** for shape classes; tier and family checkboxes with dash swatches.
- **Pinning** by drag (d3 `fx/fy`), a ring not a colour, "release N pinned".
- **Provenance panel** per entity and per edge: tier, amount, window, sources, innocent
  reading, `upgradeIf` / `killIf`, `supersededBy` retained, denials joined to claims.
- **URL state** for every view-changing control, so a view can be cited.
- **Warm-started re-layout** on filter change, so the reader's mental map survives.
- **Edge batching** over 600 edges into one `<path>` per (tier, lit, weight band), with
  denials, the path and the selection's own edges always individual.
- **A measured viewBox** and a **shared, exact camera** (`getScreenCTM`), gated by
  `scripts/graph-viewport.mjs`, which asserts the specific bugs that once shipped.

### 1.3 What is actually wrong

Measured, not guessed. `buildNationalGraph()` on this branch yields **583 nodes / 676
edges** (max degree 44; predicates `sector` 322, `role` 141, `own` 117, `law` 66, `family`
30; 124 dated). The Money-Trail Atlas adds 59 / 106 (3 denials). `/network` on "all" draws
≈ 640 / 780. The energy and welfare fleets (`src/graph/fleet.ts`, `assemble-fleet.mjs`)
will push this into the 1,000–1,500 range. At that size the current design has four real
costs, and none of them is the layout algorithm:

1. **Every simulation tick is a React render.** `sim.on('tick', () => setTick(t => t+1))`
   reconciles ~640 `<g>` groups each carrying a `<path>`, a `<title>` and often a `<text>`,
   plus 780 edge groups, ~300 times over a 4.2 s settle. That is the jank, and it grows
   linearly. Batching helps edges; nothing helps nodes or labels.
2. **SVG text is the single most expensive primitive** in the tree. Semantic labelling
   limits how many are drawn, but every labelled node still costs a text layout per tick.
3. **Hit-testing is per-element DOM**, which is fine, but forces an invisible 6–10 px
   `<line>` per edge — doubling the edge element count.
4. **The a11y surface is 1:1 with the picture**: every node is a tab stop. GeoNetwork
   already recognised this and capped keyboard stops at 250 ("five hundred stops is not
   access, it is a trap"). ForceGraph has no cap.

Nothing about the *layout* needs to change for readability: the family bands
(`forceX` at ±230) are the reason the graph reads left-to-right as public power → capital,
and ForceAtlas2 would lose that unless post-processed. The problem is purely rendering
and reconciliation, so the fix is purely the renderer.

---

## 2. Libraries — verified versions, sizes, and what each can and cannot draw

### 2.1 Registry facts (2026-09-25)

| Package | Latest | Published | Licence | Notes from the tarball |
|---|---|---|---|---|
| `graphology` | 0.26.0 | 2025-01-26 | MIT | peer `graphology-types >=0.24.0` |
| `graphology-types` | 0.24.8 | 2024-11-22 | MIT | |
| `graphology-layout-forceatlas2` | 0.10.1 (`0.11.0-rc1` on `rc`) | 2022-10-17 | MIT | `/worker` export: `new FA2Layout(graph, {settings, backgroundIterations})`, `start/stop/kill/isRunning`; the worker is spawned from a Blob, so it works from `file://`. Needs `x,y` initialised first (`graphology-layout` random/circular). `inferSettings(graph)`. Barnes–Hut optional. |
| `graphology-layout-noverlap` | 0.4.2 | 2022-02-08 | MIT | `/worker` too; `margin`, `ratio`, `expansion`, `maxIterations` |
| `graphology-communities-louvain` | 2.0.2 | 2024-12-17 | MIT | `louvain.assign(graph, {resolution, getEdgeWeight, randomWalk, rng})`, `detailed()` returns modularity; seedable `rng` |
| `graphology-shortest-path` | 2.1.0 | 2024-03-27 | MIT | unweighted `bidirectional`, `singleSource`, dijkstra, A\*, `edgePathFromNodePath` |
| `graphology-metrics` | 2.4.2 | 2026-09-02 | MIT | |
| `sigma` | 3.0.3 (`4.0.0-beta.6` on `beta`) | 2026-04-30 | MIT | WebGL. Built-in edge programs: line, rectangle, arrow, arrow-head, triangle, clamped, double-arrow, double-clamped. **No dashed edge program** — the rectangle fragment shader only feathers the edge; `grep -ri dash` over `dist/` returns nothing. Built-in node programs: circle, point. Settings include `nodeReducer`/`edgeReducer`, `labelDensity`, `labelGridCellSize`, `labelRenderedSizeThreshold`, `zIndex`, `hideEdgesOnMove`, `enableEdgeEvents`. |
| `@react-sigma/core` | 5.0.6 | 2025-12-01 | MIT | peers `react ^18||^19`, `sigma ^3.0.2`, `graphology ^0.26.0` |
| `@sigma/edge-curve` | 3.1.0 | 2024-12-13 | MIT | default export `EdgeCurveProgram`; quadratic Béziers, parallel-edge fan-out; no dash either |
| `@sigma/node-border` | 3.0.0 | 2024-12-12 | MIT | |
| `@cosmograph/cosmos` | 3.4.1 (`current` tag 2.5.1) | 2026-07-31 | **CC-BY-NC-4.0** | luma.gl / WebGL 2 GPU simulation. `setLinkStyles(Float32Array)` with **three** styles (0 solid, 1 dashed, 2 dotted) and one global `linkDashLength`/`linkDashGap`. `pointShape` is global, not per node. |
| `@cosmograph/react` | 2.5.1 | 2026-08-14 | **CC-BY-NC-4.0** | |
| `force-graph` | 1.51.4 | 2026-04-16 | MIT | Canvas 2D on d3-force. `linkLineDash` accessor (canvas `setLineDash` arrays), `nodeCanvasObject`, `linkCanvasObject`, `zoomToFit`, `d3Force`, `autoPauseRedraw`, `screen2GraphCoords`, `enableNodeDrag`; owns its own d3-zoom camera; pointer hit-testing by colour-tracker canvas |
| `react-force-graph-2d` | 1.29.1 | 2026-02-04 | MIT | wraps the above via `react-kapsule` |
| `react-force-graph` | 1.48.2 | 2026-02-04 | MIT | **23.9 MB unpacked**: pulls `3d-force-graph`, `-vr`, `-ar` (three.js, A-Frame). Never install this one; use `-2d`. |
| `cytoscape` | 3.34.3 | 2026-09-07 | MIT | Canvas. Stylesheet `line-style: solid|dashed|dotted`, `line-dash-pattern`, `line-dash-offset`; node shapes ellipse/rectangle/diamond/triangle/… |
| `cytoscape-fcose` | 2.2.0 | 2023-01-17 | MIT | 8.7 MB unpacked; synchronous |
| `cytoscape-cola` | 2.5.1 | 2022-02-23 | MIT | |
| `@antv/g6` | 5.1.1 | 2026-05-08 | MIT | full framework on `@antv/g`; `lineDash` supported; plugins for minimap, hull, timebar, legend, edge bundling |
| `d3-force` | 3.0.0 (already a dependency) | 2021-06-05 | ISC | |
| `d3-quadtree` | 3.0.1 (already transitive) | 2021-06-05 | ISC | |
| `d3-zoom` / `d3-selection` | 3.0.0 / 3.0.0 | 2021-06 | ISC | |
| `d3-dag` | 1.2.2 | 2026-07-05 | MIT | sugiyama / zherebko / grid; depends on `javascript-lp-solver`, `quadprog` |
| `elkjs` | 0.12.0 | 2026-07-17 | EPL-2.0 OR GPL-3.0 | `elk-worker.min.js` 1.6 MB raw; `workerUrl` option; layered / mrtree / stress / radial / force |
| `@dagrejs/dagre` | 3.1.1 | 2026-08-08 | MIT | the maintained dagre; `dagre@0.8.5` (2019) is abandoned |

### 2.2 Bundle cost, measured

Current ICIP graph chunk for reference: `ForceGraph-*.js` **33.9 KB raw / 13.4 KB gz**
(includes d3-force ≈ 5.6 KB gz). The app's main chunk is 837 KB / 228 KB gz.

| Stack (esbuild, minified, react external) | min | gzip | Δ vs today |
|---|---:|---:|---:|
| d3-force alone | 14.5 KB | 5.6 KB | 0 (already shipped) |
| d3-force + d3-quadtree + d3-zoom + d3-selection | 59.9 KB | 20.3 KB | +14.7 KB — only if d3-zoom is adopted (it is not, §5.2) |
| d3-zoom + d3-selection alone | 48.1 KB | 16.2 KB | |
| graphology core | 67.5 KB | 13.5 KB | |
| FA2 (sync + worker supervisor) | 18.8 KB | 5.6 KB | |
| Louvain | 24.4 KB | 6.2 KB | |
| graphology + FA2 worker + noverlap + louvain + shortest-path (no renderer) | 117.0 KB | 26.4 KB | |
| sigma 3.0.3 + graphology | 159.0 KB | 37.8 KB | |
| **full sigma stack** (sigma, graphology, FA2 worker, noverlap, louvain, shortest-path, edge-curve) | 226.3 KB | **56.1 KB** | +56 KB gz, before any custom dash/shape programs |
| force-graph 1.51.4 | 181.0 KB | 59.8 KB | +60 KB gz |
| react-force-graph-2d | 191.1 KB | 62.6 KB | +63 KB gz |
| cytoscape core | 443.9 KB | 141.5 KB | |
| cytoscape + fcose | 569.8 KB | 175.8 KB | +176 KB gz |
| @antv/g6 5.1.1 | 1,472 KB | 421.7 KB | +422 KB gz |
| @cosmograph/cosmos 3.4.1 | 791 KB | 202.7 KB | +203 KB gz (and the licence) |
| elkjs bundled | 1,459 KB | 440.0 KB | +440 KB gz |
| @dagrejs/dagre | 48.5 KB | 16.9 KB | |
| d3-dag (sugiyama + graphStratify) | 115.6 KB | 37.9 KB | |

### 2.3 Can it draw ICIP's semantics? The only comparison that matters

| | per-edge dash, 4 distinct patterns | 5 node shapes | layout off main thread | works with `camera.tsx` | a11y surface | licence OK |
|---|---|---|---|---|---|---|
| **Canvas 2D on d3-force (recommended)** | yes — `ctx.setLineDash([6,3])` etc., identical numbers | yes — `new Path2D(shapeFor(cls, r))` takes the existing SVG strings | yes — inline worker, ≈80 lines | yes — one-line change to `toViewBox` | ours to build (§5.5) — the SVG overlay + cursor | yes |
| sigma.js 3 | **no** — custom `EdgeProgram` with a GLSL dash (§8) | circle only; `@sigma/node-square` exists; diamond/triangle/half-round are custom node programs | yes (FA2 worker) | no — sigma owns its camera; bridge both ways | ours to build, same as canvas | yes |
| cosmos 3 | **no** — 3 styles, global dash geometry | **no** — one global `pointShape` | GPU | no | ours to build | **no — CC-BY-NC** |
| force-graph / react-force-graph-2d | yes — `linkLineDash` | yes — `nodeCanvasObject` | no (main-thread d3) | no — it owns a d3-zoom camera; the viewport gate would be rewritten around its API | none built in | yes |
| cytoscape + fcose | yes — stylesheet | yes — built-in shapes | no (fcose synchronous) | no — its own pan/zoom | none built in | yes |
| G6 5 | yes | yes | some layouts in workers | no | none built in | yes |

The recommended path is the only one where the semantics survive with **no translation
layer at all**: the same dash arrays and the same path strings, taken from the same
`schema.ts` and `shapeFor()`.

---

## 3. UX patterns of investigative tools — what to take, what to refuse

From published product documentation and hands-on familiarity (not re-verified today;
the tools are proprietary or web-only and were not reachable from this session).

| Pattern | Where it is done best | ICIP today | Decision |
|---|---|---|---|
| **Ego-network focus** (N hops, expand-on-click) | Linkurious / ICIJ Offshore Leaks ("expand"), Neo4j Bloom, Maltego | have, 1–3 hops, with denial re-admission and counts | keep; do **not** add click-to-expand incremental exploration — the whole filtered graph is small enough to be present, and incremental reveal hides the denominator |
| **Shortest-path finder** | Bloom, Linkurious, Offshore Leaks "find path" | have, over visible edges, with **median separation** baseline | keep; add the *path strip* (§6.6) — a linear rendering of the steps with tier swatches, so the answer reads without the hairball |
| **Path highlighting** | all of the above | have (dims everything off the path; contra stays lit) | keep |
| **Time slider with edge windows** | Palantir-style timelines, Linkurious timeline, Kumu | have (dual-handle; undated never hidden) | keep; add an **"as of" single-date mode** and print `hiddenByTime` like GeoNetwork does |
| **Semantic zoom** (labels by degree) | Gephi / Gephi Lite (sigma label grid), Graphistry | have, `k × degree` and `sz` | keep the rule; add a **label occupancy grid** (one label per 100 px cell, priority `sz` then degree) so density never collides |
| **Edge bundling** | Gephi plugin, G6 plugin, Holten-style | none | **refuse** — bundling merges separately sourced claims into shared curves, hides which edge is which, invents visual "flows", and destroys the dash channel where bundles overlap |
| **Minimap** | Gephi, G6, Cytoscape ext | have (only when clipped) | keep; draw it on the canvas in screen space |
| **Legend-as-filter** | Kumu, Linkurious, Bloom | have for shapes; tiers/families as checkboxes with swatches | keep; make the family swatches under the graph clickable too |
| **Community hulls** | Kumu, Linkurious, Graphistry, Gephi | none | **refuse by default** — a Louvain partition is stochastic (seed- and resolution-dependent) and a hull asserts membership; on this platform a computed pattern is an `analytic` claim that needs an innocent reading and a null-model test. If ever shipped: as a table of communities with modularity, seed and resolution, never as a hull (§7) |
| **Pinning** | Gephi, Kumu | have (drag pins; ring; release) | keep |
| **Search-to-focus** | Bloom, Aleph, Offshore Leaks | search *filters* the graph | add **jump-to**: typeahead over labels + aliases → select + camera fly-to, without filtering (§6.4) |
| **Provenance side panel** | Aleph, Offshore Leaks ("data from…"), Palantir (source per property) | have — tier, sources, innocent reading, upgrade/kill, denials joined | keep; add a **tenure strip** per edge in the entity card (§6.7) |
| **"Why is this edge here"** | Bloom "explain", Linkurious | partially — the edge card | add a *why drawn* line: filters passed, re-admitted as a denial?, batched?, window vs slider (§6.5) |
| **Timelines** | Palantir, Aleph | none beyond the scrubber | the tenure strip covers the 80 % case with no library |
| **Transforms / live enrichment** | Maltego, Aleph | n/a — no runtime fetches by design | refuse; the platform is static and provenance is pre-computed |
| **Appearance by attribute** (colour by degree, size by centrality) | Gephi Lite, Graphistry, Bloom rules | forbidden by `interface-design` ("a size that means significance is an influence score with extra steps") | refuse |
| **3D / VR** | react-force-graph, Graphistry | none | refuse — it removes the dash channel and the table twin cannot follow |

---

## 4. The recommendation — one path

**Canvas 2D renderer · d3-force in an inline Web Worker · `camera.tsx` unchanged in
spirit · an explicit accessibility layer · no new dependencies.**

Why this and not the two obvious alternatives:

- *Not sigma.js.* At 640–1,500 nodes WebGL buys nothing the eye can see, and it costs the
  two things this platform cannot give up: a dashed-edge shader we would own (sigma has
  none) and three custom node programs (sigma has circle and point). +56 KB gz, a second
  camera to bridge, and sigma 4 is in beta with breaking changes ahead. graphology as a
  *model* is fine but duplicates `nullModel.ts` / `shortestPath` that already exist here.
- *Not force-graph.* It is the closest ready-made match (canvas, `linkLineDash`, custom
  node painting), but it would replace a camera that is exact, shared with GeoNetwork and
  gated, with an opaque d3-zoom one; it has no keyboard model; and it would leave ~800
  lines of the existing component doing translation. +60 KB gz for a renderer that is
  ~300 lines to write against code we already have.

What changes and what does not:

| Stays exactly as is | Changes |
|---|---|
| `schema.ts`, `TIERS[t].dash`, `FAMILY_COLOR`, `SHAPE_CLASSES`, `shapeFor()` strings | where those are drawn (canvas) |
| `filterGraph`, `denialIndex`, `GraphFilter`, `GraphPath`, ego/path/median logic in `GraphExplorer` | nothing — `GraphExplorer` keeps the same `ForceGraph` props |
| d3-force forces: link 78/0.55, charge −190, collide r+7, family bands ±230, y 0.05 | they run in a worker; the main thread never ticks |
| warm start, pins (`fx/fy`), release, settle timers, reduced-motion synchronous settle | expressed as worker messages |
| `camera.tsx` maths, buttons, pan pad, keyboard, ExpandShell | `toViewBox` learns that a non-SVG element has CTM = identity; pinch added |
| table twin, edge card, entity card, URL state | additions only (§6) |
| `GeoNetwork.tsx` (SVG, fixed viewBox, letterboxed on purpose) | untouched |
| `graph-viewport.mjs` GeoNetwork section | untouched; the ForceGraph section reads data attributes instead of SVG transforms |

---

## 5. Implementation plan

### 5.1 Dependencies

```jsonc
// package.json — dependencies
"d3-force": "^3.0.0",        // unchanged
"d3-quadtree": "^3.0.1",     // NEW as a direct dependency (already installed transitively by d3-force) — 0 KB delta
// devDependencies
"@types/d3-quadtree": "^3.0.6"
```

Nothing else. No `d3-zoom` (the camera exists and is exact), no `d3-selection`, no
graphology. Expected chunk after the change: ≈ 40–45 KB raw / ≈ 20–22 KB gz for
`ForceGraph` + worker + overlay (today 13.4 KB gz), i.e. **+6–9 KB gz**. The inline
worker is base64 inside the chunk (see 5.3) — that is why it is counted here.

### 5.2 File-by-file

| File | Action | What goes in it |
|---|---|---|
| `src/components/viz/graphSemantics.ts` | **new** (extracted) | `FAMILY_COLOR`, `FAMILY_LABEL`, `SHAPE_CLASSES`, `ShapeClass`, `shapeClassOf`, `shapeFor` (unchanged strings), `edgeWidth`, `contraWidth` (§6.3), `filterGraph`, `denialIndex`, `GraphFilter`, `GraphPath`, `DenialIndex`. `ForceGraph.tsx` re-exports them so `GeoNetwork.tsx`, `GeoGraph.tsx`, `GraphExplorer.tsx` keep compiling; then migrate the imports. |
| `src/components/viz/layout.worker.ts` | **new** | d3-force in a worker. Protocol in 5.3. Pure — no DOM, no React. |
| `src/components/viz/useLayout.ts` | **new** | Hook owning the worker (or the in-thread driver as fallback), a `Float32Array` of positions in a ref, `settled`, `pin/unpin/release`, warm-start by id. Two drivers, one interface. |
| `src/components/viz/GraphCanvas.tsx` | **new** | The `<canvas>` + draw loop (rAF, dirty-flag), DPR handling, hit-testing (quadtree + segment distance), label grid, denial pass, minimap, focus ring, test probes (`data-*`). |
| `src/components/viz/GraphA11y.tsx` | **new** | The examined-set SVG overlay (focusable nodes/edges for the selection, its neighbours, the path, the focus ball — capped at 200), the roving keyboard cursor, the `aria-live` announcer. |
| `src/components/viz/ForceGraph.tsx` | **rewrite, same props** | Composes `useLayout` + `GraphCanvas` + `GraphA11y` + `CameraControls` + `ExpandShell` + the status strip. Drops the SVG body. Keeps `Props` unchanged so `GraphExplorer` is untouched by the renderer swap. |
| `src/components/viz/camera.tsx` | **edit** | `useCamera(ref: RefObject<SVGSVGElement | HTMLElement>)`: `toViewBox` uses `getScreenCTM()` for SVG and `getBoundingClientRect()` (scale 1) otherwise. Add two-pointer pinch zoom about the midpoint. Add `flyTo(box, ms)` — instant when `prefers-reduced-motion`, else a 250 ms rAF tween — no d3-transition. |
| `src/components/viz/GraphExplorer.tsx` | **edit** | jump-to search (§6.4); "as of" mode (§6.2); why-drawn line in `EdgeCard` (§6.5); path strip (§6.6); tenure strip in the entity card (§6.7); clickable family chips; `hiddenByTime` in the caption. Table twin unchanged. |
| `scripts/graph-viewport.mjs` | **edit** (ForceGraph section only) | Read `data-k`, `data-tx`, `data-ty`, `data-clipped`, `data-probe` from `[data-graph]` (5.7). Same assertions, new source of truth. |
| `scripts/smoke.mjs` | **edit** | Add: every route with `[data-graph]` has a `canvas[role=img][aria-label]`, a "Show table view" button, and no console errors during a settle. |
| `scripts/graph-perf.mjs` | **new, optional gate** | Loads `/network?layer=all` with a synthetic 1,500-node fixture (`?fixture=perf`, dev-only) and asserts settle ≤ 4 s, mean frame ≤ 12 ms during pan, hover ≤ 8 ms. |
| `docs/INDEX.md`, `HANDOFF.md` | **edit** | new files, the a11y contract, the gate change. |

### 5.3 The layout worker — concrete API

Vite 6 builds a worker inline as a Blob URL with the `?worker&inline` suffix. **This
matters here**: `vite.config.ts` sets `base: './'` because the hand-off `dist/` is opened
from `file://`, and a module worker loaded by URL from `file://` is refused by Chromium
(cross-origin). An inline Blob worker is not.

```ts
// useLayout.ts
import LayoutWorker from './layout.worker?worker&inline';

type ToWorker =
  | { type: 'init'; ids: string[]; r: Float32Array; band: Int8Array /* -1 state, 0, +1 capital */;
      links: Uint16Array /* [si, ti, si, ti, …] */; seed: Float32Array | null /* warm start, NaN = unplaced */;
      pinned: Float32Array | null; reduced: boolean }
  | { type: 'pin'; i: number; x: number; y: number }
  | { type: 'unpin'; i: number }
  | { type: 'release' }
  | { type: 'stop' };

type FromWorker =
  | { type: 'tick'; pos: Float32Array; alpha: number }   // every 2nd tick, transferable
  | { type: 'settled'; pos: Float32Array };
```

```ts
// layout.worker.ts — no DOM, no React
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from 'd3-force';

let sim: ReturnType<typeof forceSimulation> | null = null;
let nodes: { i: number; r: number; band: number; x?: number; y?: number; fx?: number | null; fy?: number | null }[] = [];

self.onmessage = ({ data }: MessageEvent<ToWorker>) => {
  if (data.type === 'init') {
    sim?.stop();
    nodes = Array.from(data.ids, (_, i) => ({ i, r: data.r[i], band: data.band[i] }));
    let placed = 0;
    if (data.seed) for (const n of nodes) { const x = data.seed[2*n.i], y = data.seed[2*n.i+1]; if (!Number.isNaN(x)) { n.x = x; n.y = y; placed++; } }
    if (data.pinned) for (const n of nodes) { const x = data.pinned[2*n.i]; if (!Number.isNaN(x)) { n.fx = x; n.fy = data.pinned[2*n.i+1]; } }
    const warm = placed > nodes.length / 2;
    const links = []; for (let k = 0; k < data.links.length; k += 2) links.push({ source: data.links[k], target: data.links[k+1] });
    sim = forceSimulation(nodes)
      .force('link', forceLink(links).id((d: any) => d.i).distance(78).strength(0.55))
      .force('charge', forceManyBody().strength(-190))            // Barnes–Hut, theta 0.9 default
      .force('collide', forceCollide((d: any) => d.r + 7))
      .force('x', forceX((d: any) => d.band * 230).strength(0.09)) // the family bands survive
      .force('y', forceY(0).strength(0.05))
      .alpha(warm ? 0.3 : 1)
      .stop();
    if (data.reduced) {                                            // prefers-reduced-motion: no animation at all
      for (let t = 0; t < (warm ? 90 : 260); t++) sim.tick();
      post('settled'); return;
    }
    let t = 0;
    sim.on('tick', () => { if (++t % 2 === 0) post('tick'); })
       .on('end', () => post('settled'))
       .alphaMin(0.02)                                             // ≈ 300 ticks from alpha 1; ≈ 90 from 0.3
       .restart();
  }
  if (data.type === 'pin')    { const n = nodes[data.i]; n.fx = n.x = data.x; n.fy = n.y = data.y; sim?.alpha(Math.max(sim.alpha(), 0.05)).restart(); }
  if (data.type === 'unpin')  { const n = nodes[data.i]; n.fx = n.fy = null; }
  if (data.type === 'release'){ for (const n of nodes) n.fx = n.fy = null; sim?.alpha(0.4).restart(); }
  if (data.type === 'stop')   { sim?.stop(); }
};

function post(type: 'tick' | 'settled') {
  const pos = new Float32Array(nodes.length * 2);
  for (const n of nodes) { pos[2*n.i] = n.x!; pos[2*n.i+1] = n.y!; }
  (self as any).postMessage({ type, pos, alpha: sim!.alpha() }, [pos.buffer]);           // transferable: zero copy
}
```

Notes that are load-bearing:

- **The settle is `alphaMin`, not a wall-clock timer.** Today `setTimeout(4200)` stops the
  simulation whether or not it has converged; in the worker `sim.on('end')` fires when
  alpha decays below `alphaMin`, which is the honest definition of "settled". The
  `fittedFor` key logic in `ForceGraph` keys off `settled` exactly as it keys off
  `settledAt` now.
- **Dragging a node** sends `pin` per pointer move; the worker keeps the rest of the
  graph nearly frozen (`alpha` 0.05) so pulling a strand out does not re-boil the
  picture — same behaviour as today's `fx/fy` write plus `setTick`.
- **The in-thread driver** is the same code run on the main thread with `sim.on('tick')`
  writing the same `Float32Array`. It is selected only when `typeof Worker ===
  'undefined'` or construction throws; it is also what Playwright's headless run will use
  if the inline worker ever fails there, so the gates never silently test nothing.
- FA2 in a worker (graphology) was considered and rejected for this graph: it has no band
  constraint (the left-to-right reading would need a post-pass), it needs graphology's
  model (+13.5 KB gz) and seeded positions, and its supervisor round-trips full attribute
  maps per `backgroundIterations` rather than a transferable buffer. It is the right
  choice above ~5k nodes, where LinLog + Barnes–Hut outperform d3; not here.

### 5.4 The canvas draw — how every frozen channel survives, concretely

```ts
// GraphCanvas.tsx — one frame. Called from rAF only when `dirty` is set (tick, camera, hover, selection).
const dpr = Math.min(2, window.devicePixelRatio || 1);
canvas.width = W * dpr; canvas.height = H * dpr;               // on resize only
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.clearRect(0, 0, W, H);
ctx.translate(view.tx, view.ty); ctx.scale(view.k, view.k);    // == the SVG <g transform> today

// 1. Batched claim edges: one stroke per (tier, lit, width band). Dashes are per SUBPATH in Canvas 2D,
//    as they are per <line> in SVG, so every edge's dash phase starts at its source, exactly as now.
for (const b of batches) {                                       // same grouping code as today's `batches`
  ctx.beginPath();
  for (const l of b.links) { ctx.moveTo(x(l.s), y(l.s)); ctx.lineTo(x(l.t), y(l.t)); }
  ctx.setLineDash(DASH[b.tier]);                                 // DASH[t] = TIERS[t].dash.split(' ').map(Number); [] for documented
  ctx.lineWidth = b.w;                                           // layout units, scales with k — identical to the SVG behaviour
  ctx.strokeStyle = 'rgba(232,228,220,0.30)';
  ctx.globalAlpha = b.lit ? 0.55 : 0.10;
  ctx.stroke();
}
// 2. Individually drawn edges (path, active, selection's own) — same loop, one per edge, with arrowheads drawn
//    as a small filled triangle at the target (no <marker> on canvas; 6 lines of trig).
// 3. Denials LAST, on top, never batched, never dimmer than their claims:
for (const e of contra) {
  ctx.setLineDash([]); ctx.strokeStyle = '#c45b5a';
  ctx.lineWidth = contraWidth(e);                                // ≥ widest claim on the pair (§6.3)
  ctx.globalAlpha = 0.95; …stroke…; drawContraGlyph(mid(e));     // a short cross-bar at the midpoint — a texture channel, not a hue
}
// 4. Nodes: Path2D from the SAME strings as today. Path2D accepts SVG path data verbatim.
const p = PATH2D.get(`${cls}:${r}`) ?? PATH2D.set(k, new Path2D(shapeFor(cls, r))).get(k)!;
ctx.save(); ctx.translate(nx, ny);
ctx.globalAlpha = dim ? 0.16 : 1;
ctx.fillStyle = FAMILY_COLOR[fam]; ctx.globalAlpha *= (resolved === false ? 0.25 : 0.88);
ctx.fill(p);
ctx.setLineDash(resolved === false ? [2, 2] : []);               // identity-unconfirmed outline survives
ctx.lineWidth = isSel || isEnd ? 2 : 0.8; ctx.strokeStyle = isSel || isEnd ? '#e8e4dc' : 'rgba(10,10,12,0.9)';
ctx.stroke(p);
if (pinned) { ctx.beginPath(); ctx.arc(0, 0, r + 3.5, 0, 2*Math.PI); ctx.strokeStyle = '#c9a86c'; ctx.lineWidth = 1; ctx.stroke(); }
ctx.restore();
// 5. Labels in SCREEN space (reset the transform), 9.5 px with a 2.4 px halo via strokeText — the counter-scaling
//    the SVG does with fontSize={9.5/k}, done the cheap way. Placed through the occupancy grid (§6.1).
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.font = '9.5px var(--font-mono)'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
ctx.lineWidth = 2.4; ctx.strokeStyle = 'rgba(10,10,12,0.7)'; ctx.fillStyle = 'rgba(240,236,228,0.86)';
for (const { sx, sy, label } of placedLabels) { ctx.strokeText(label, sx, sy); ctx.fillText(label, sx, sy); }
// 6. Minimap in screen space, top-left, only when clipped — same geometry as today's `mini`.
```

Dash fidelity on canvas, stated precisely: `setLineDash` takes the same numbers
`schema.ts` declares; `lineDashOffset` stays 0; because we draw in the transformed space,
dash lengths scale with zoom exactly as the SVG `stroke-dasharray` does today, so a
screenshot at any zoom is comparable with the SVG version. Canvas applies the dash
pattern per subpath, so batching edges into one `beginPath` does not change any edge's
phase (SVG 2 behaves the same for a multi-subpath `<path>`, which is what the batched
version draws now).

Hit-testing:

```ts
import { quadtree } from 'd3-quadtree';
const qt = quadtree<number>().x(i => pos[2*i]).y(i => pos[2*i+1]).addAll(indices);   // rebuilt on 'settled' and after a pin
const i = qt.find(p.x, p.y, 14 / view.k);                                                // nearest node within 14 screen px
// no node → nearest edge: point-to-segment distance over drawn edges (≤ 2k per move), throttled to rAF;
// only edges whose `tabbable`/lit status makes them inspectable are candidates, as now.
```

Performance envelope, measured on nothing but reasoned from primitive costs: 1,500 nodes ×
(fill + stroke of a cached `Path2D`) ≈ 1–2 ms; 2,000 dashed segments in ≤ 8 batched
strokes ≈ 2–4 ms (dashed strokes cost ~3× solid, which is why batching by tier is kept);
≤ ~130 labels (one per 100 px cell at 1440×900) ≈ 1 ms. Frame budget ≈ 5–8 ms, and the
frame only runs when something changed. The `graph-perf.mjs` gate turns this reasoning
into a number.

### 5.5 Accessibility strategy — the part no surveyed library ships

The canvas is not the interface. Three surfaces, all reading the same filtered data:

1. **The table twin stays primary and is unchanged** — `DataTable` over
   `filterGraph(...)` output, path steps first. It is the conformance path for WCAG 1.1.1
   and 1.3.1, and the caption says so. It is the thing that makes a canvas acceptable.
2. **The examined-set overlay (`GraphA11y.tsx`)**: an absolutely-positioned SVG above the
   canvas, `pointer-events: none` except on its own elements, that renders **real
   focusable elements only for what the reader is examining** — the selected node, its
   neighbours, the path nodes and edges, the ego ball — capped at 200 (GeoNetwork's
   `KEYBOARD_CAP` rule, now applied to both graphs; above the cap the caption points at
   the table). Each keeps today's `role="button"` / `aria-pressed` / `aria-label` and
   `role="img" aria-roledescription="relationship"` with the same `edgeTitle`. The focus
   ring is drawn by the overlay (`focus-visible`), so it is a real ring, not a canvas
   imitation. The overlay is re-rendered only on `settled`, selection, path or focus
   change — never per tick — so the React cost that made SVG slow never returns.
3. **A roving keyboard cursor over the whole drawn graph**: with the wrapper focused,
   `Tab` enters the graph, arrow keys move the cursor to the nearest node in that
   direction (quadtree search in a 60° cone), `Enter` selects, `Shift+Enter` sets a path
   end, `Escape` peels path → focus → maximise as today. An `aria-live="polite"` region
   announces "Adani Enterprises, company, 12 relationships, 3 alleged, 1 denial". This is
   the access route for the ~1,300 nodes outside the examined set, without 1,300 tab stops.

Plus:

- The `<canvas>` gets `role="img"` and the summary `aria-label` the `<svg>` carries now.
  The wrapper keeps its `aria-label` with the key map.
- **Non-colour channels are preserved by construction**: tier is dash; denial is red
  *and* wider *and* gets a mid-edge cross-bar glyph (new, a texture channel, so a denial
  survives greyscale); unresolved is dashed outline. No information rides on hue alone.
- `forced-colors: active` (Windows High Contrast): the canvas ignores system colours, so
  `GraphCanvas` swaps to a two-tone palette (`CanvasText` / `Canvas` resolved through a
  probe element) and the overlay's SVG uses system keywords.
- `prefers-reduced-motion`: no animated settle (worker runs synchronously and posts once),
  no fly-to tween, no hover fades.
- Contrast: lit edges go from 0.30 to ≥ 0.45 alpha on `--bg` so lit strokes clear 3:1
  (WCAG 1.4.11); dimmed edges are non-essential by definition (the table has them).
- Touch: pinch zoom added to `camera.tsx`; nodes get a 24 px minimum hit radius
  (`14 / k`, floored) so 2.5.8 holds.
- Add an axe run to `smoke.mjs` for `/network` (Playwright + `@axe-core/playwright` is a
  dev dependency only; if that is one dependency too many, the manual checklist in
  `docs/design/` suffices for v1).

### 5.6 What `GraphExplorer` gains (see §6 for each)

Jump-to search; "as of" mode; why-drawn line; path strip; tenure strip; clickable family
chips; `hiddenByTime` in the caption. None of these touch the renderer.

### 5.7 Gates

`graph-viewport.mjs` currently reads camera state from `svg[data-tick] > g[transform]`
and node positions from `g[role=button]`. After the change the wrapper `[data-graph]`
exposes, updated on every frame the component draws:

```
data-k="1.0000" data-tx="123.0" data-ty="45.0"     the camera (numbers, not a transform string)
data-settled="1"                                     bumps on each settle
data-clipped="0"                                     nodes outside the frame after fit (the component already computes the bbox)
data-probe="712.4,388.1,Adani Enterprises"           screen position + label of the largest drawn node — test-only
data-batched="true"                                  as today
```

Every existing assertion maps one-to-one: "no letterbox" becomes `canvas.width/dpr ===
rect.width`; "every node inside after fit" reads `data-clipped === "0"`; the 200 px drag
reads `Δtx === 200` (CTM is identity on canvas); the node-drag test uses `data-probe`;
"a drag is not a click" and "a click still selects" are unchanged. The GeoNetwork section
is untouched.

### 5.8 Order of work and acceptance

| Phase | Work | Done when |
|---|---|---|
| 0 (½ day) | `graphSemantics.ts` extraction; `camera.tsx` element-agnostic + pinch + `flyTo` | `tsc`, `smoke`, `viewport` green with SVG still in place |
| 1 (1½ days) | `layout.worker.ts`, `useLayout.ts`, `GraphCanvas.tsx`, `ForceGraph.tsx` composed; gates rewritten | all `check` gates green; visual diff of `/network` at k=1 against an SVG screenshot shows identical dash/shape/hue/size |
| 2 (1 day) | `GraphA11y.tsx` overlay + cursor + live region; forced-colors; contrast | keyboard walkthrough of select → focus 2 hops → path → Escape ×3 with no pointer; axe clean |
| 3 (1 day) | §6 explorer additions | each has a caption that says what it is not |
| 4 (½ day) | `graph-perf.mjs` with a 1,500-node fixture | settle ≤ 4 s, pan frame ≤ 12 ms mean, hover ≤ 8 ms, chunk Δ ≤ +10 KB gz |

---

## 6. The additions, each with its honesty rule

### 6.1 Label occupancy grid
Cell 100 px; candidates ordered focus/path ends → `sz` desc → degree·k desc → id; one label
per cell; cells rebuilt on every camera change. Rule kept from today: a hub earns its label
sooner as the reader zooms in, but never on degree alone at a distance.

### 6.2 "As of" date mode
A third control on the scrubber: a single date. An edge is shown if its window contains it
(`from ≤ d ≤ to`, open ends infinite); undated edges are shown and counted. Caption: "as of
2024-03-15 · N relationships · M undated shown regardless". This is the Palantir-style
question ("who held what on the day of the award") without pretending coarse dates are
precise: the date is snapped to the resolution the data has (`yearOf` logic already in
GeoNetwork).

### 6.3 `contraWidth` in ForceGraph
Port GeoNetwork's `widthOf`: a denial is drawn at `max(1.5, widest claim on the pair)`.
"As loudly as the claim" is enforced in the picture, in both graphs, by the same function
in `graphSemantics.ts`.

### 6.4 Jump-to
A typeahead over `label`, `sub`, `al` (the entity-resolution surface) that **selects and
flies to** the entity without changing any filter. If the entity is hidden by the filters,
the result row says which filter hides it (family, type, search, or "not in this layer")
instead of silently doing nothing. `?sel=` already round-trips; `flyTo` frames the ego box.

### 6.5 "Why is this edge drawn"
One line in `EdgeCard`, computed from the same filter object: "shown because: tier
reported ✓ · predicate in filter ✓ · window 2019–2022 overlaps 2020–2024 ✓ · amount ₹120 cr
≥ ₹100 cr ✓" — or, for a denial: "re-admitted: the claim it answers is shown" — or "drawn
batched: no arrow, hover the selection's own edges to inspect". The reader learns why the
picture is what it is, which is the only cure for reading a filter as a finding.

### 6.6 Path strip
When a path is found, render it as a horizontal strip in the panel: node glyph (shape,
hue, size) — edge swatch (dash of tier, width of amount, red if a denial sits on the step)
— node glyph … with the step number and the tier chips already listed. The strip is
`role="list"`, so it is the accessible reading of the path as well as the visual one, and
it carries the median-separation sentence beneath it. No layout library: a chain is a
line.

### 6.7 Tenure strip
In the entity card, for its edges that have a window: a tiny SVG time axis over
`datedSpan` with one bar per edge, dash = tier, red = denial, undated edges listed under
it as "undated (n)". Selecting the current "as of" date draws a hairline. This is 80 % of
what a timeline tool gives, in 60 lines, with the undated denominator visible.

---

## 7. What NOT to adopt, and why

| Do not adopt | Why |
|---|---|
| **`@cosmograph/cosmos` / `@cosmograph/react`** | CC-BY-NC-4.0 — non-commercial only; an investigative platform that may be syndicated, licensed or paywalled cannot carry it. Also only three link styles with global dash geometry (four tiers need four patterns) and one global point shape. |
| **sigma.js 3 as the renderer** | No dashed edges — we would own a GLSL program for the single most important channel; three custom node programs; a second camera; +56 KB gz; sigma 4 in beta. Right tool above ~3k nodes (§8), wrong tool here. |
| **cytoscape.js + fcose** | +176 KB gz; a second graph model with its own stylesheet that would *own* the semantics; synchronous fcose; its own pan/zoom would replace the gated camera. |
| **AntV G6 5** | +422 KB gz; an application framework, not a renderer; its own component model, plugins and event system; API still moving in 5.x. |
| **elkjs** | +440 KB gz for a layered layout the platform does not need on this graph; EPL/GPL. If an ownership DAG view is ever wanted, `@dagrejs/dagre` (17 KB gz) or `d3-dag` (38 KB gz) — and `OwnershipTree.tsx` already exists. |
| **`react-force-graph`** (the umbrella) | 23.9 MB unpacked, drags in three.js, VR and AR builds. `-2d` is the only sane import, and even that is rejected above. |
| **`dagre@0.8.5`** | unmaintained since 2019; `@dagrejs/dagre` is the fork. |
| **d3-zoom** | 16 KB gz to replace a camera that is exact, shared, keyboard-driven and gated; d3-zoom's gesture model would also fight the node-drag/pan disambiguation already written. |
| **Edge bundling** | merges separately sourced claims into shared curves; you cannot tell which claim a bundle segment belongs to; overlapping dashes destroy the tier channel; the "flows" it draws are artefacts of the bundling parameter, not of the data. |
| **Community hulls / Louvain by default** | Louvain is stochastic (`rng`, `resolution`); a hull asserts membership the algorithm does not support run-to-run; on this platform a computed pattern is an `analytic` claim that must carry an innocent reading and a null-model z-score (`nullModel.ts` already has Maslov–Sneppen rewiring). If communities are ever shown: a table — community id, members, modularity, resolution, seed — with the census denominator, never a shaded blob. |
| **Colour-by-degree, size-by-centrality, "influence" scores** | forbidden by `interface-design`; a size that means significance is an influence score with extra steps. |
| **3D / VR / animated perpetual physics** | removes the dash channel, the table twin cannot follow, and a graph that never stops moving is unreadable (and violates reduced-motion). |
| **Click-to-expand exploration** (Bloom / Linkurious / Maltego style) | hides the denominator; the whole filtered graph is small enough to be present. Ego focus with counts is the honest form of the same idea. |
| **Curved edges by default** (`@sigma/edge-curve`, `linkCurvature`) | curvature carries no meaning here; keep straight lines with a per-pair fan-out by rank for parallel edges (GeoNetwork's `parallelRank`), which does carry meaning. |
| **FA2 for this graph** | loses the family bands; needs graphology; its worker round-trips attribute maps, not buffers. See §5.3. |

---

## 8. Fallbacks

### 8.1 If Phase 1 slips
Keep SVG, but ship the worker and stop rendering on every tick: draw every 4th tick during
the settle and once on `settled`. That alone removes ~75 % of the reconciliation cost with
no renderer change and no gate change. The `useLayout` hook is identical in both worlds,
so the work is not thrown away.

### 8.2 If the graph outgrows canvas (≈ 3,000+ nodes, or ≥ 5,000 edges on hover)
Escalate to **sigma 3 + graphology + FA2 worker**, and *write the dashed-edge program
first*, since it is the blocking piece. Specification, so nobody re-researches it:

- Subclass `EdgeProgram` from `sigma/rendering` copying `EdgeRectangleProgram` (six
  vertices, `a_positionStart/End`, `a_normal`, `a_color`, `a_id`, constant
  `a_positionCoef`). Add an attribute `a_tier` (1 byte) and a varying `v_along` = distance
  along the edge in *screen* units (`a_positionCoef × length(end−start) / u_sizeRatio`, or
  in layout units if dashes should scale with zoom, matching the canvas decision above).
- Fragment shader: keep the feathered edge; then `float p = mod(v_along, period[tier]);`
  and `discard` when `p` falls in a gap, with the four patterns as uniform arrays
  (`6 3` → on 6 off 3; `2 4`; `8 3 2 3` → on 8 off 3 on 2 off 3). Keep `#ifdef
  PICKING_MODE` solid so hit-testing on gaps still works.
- Register it as `edgeProgramClasses: { line: TierEdgeProgram }`, set `defaultEdgeType:
  'line'`, and set `tier` on every edge attribute; `edgeReducer` handles lit/dim/path,
  `nodeReducer` handles ego dimming — sigma's reducers map cleanly onto today's `edgeLit`
  / `nodeLit`.
- Node shapes: `@sigma/node-square` for institutions; diamond, triangle and half-round as
  three small `NodeProgram`s (each ~60 lines, the circle program is the template).
- Denials: `zIndex: true` and a high `zIndex` attribute on `contra` edges so they paint
  last; widths via the same `contraWidth`.
- Camera: sigma's `camera.animate({x, y, ratio})`; write a 40-line bridge so
  `CameraControls` keep driving it and the keyboard map is unchanged; the gate then reads
  `sigma.getCamera().getState()` through a `data-*` mirror as in §5.7.
- Cost: +56 KB gz plus ~400 lines of GLSL/TS we maintain. Only worth it at that scale.

### 8.3 If `Worker` misbehaves in a target browser
The in-thread driver in `useLayout` is the same simulation on the main thread; the
canvas renderer still removes the React-per-tick cost, which was the larger of the two.

---

## 9. What was verified here, and what was not

Verified: every version, date, licence and dependency list above (registry JSON);
sigma's edge/node program inventory and the absence of any dash code in its `dist/`;
cosmos's `setLinkStyles` semantics and CC-BY-NC licence text; force-graph's
`linkLineDash`/`nodeCanvasObject`/`zoomToFit` API; cytoscape's `line-dash-pattern`;
FA2's worker supervisor signature and Blob spawning; Louvain's options; ELK's worker
file sizes; all bundle sizes (esbuild, this machine); the current graph's node/edge/tier
counts and chunk sizes; the `file://` constraint from `vite.config.ts`.

Not verified: GitHub activity for any package (API unreachable); the commercial tools'
current feature sets (described from documentation as known, not fetched today);
sigma 4 beta's API; canvas dash-per-subpath behaviour was checked against the HTML
standard's "trace a path" algorithm from memory, not re-read — the Phase 1 visual diff
covers it either way; the perf numbers in §5.4 are primitive-cost reasoning until
`graph-perf.mjs` exists.
