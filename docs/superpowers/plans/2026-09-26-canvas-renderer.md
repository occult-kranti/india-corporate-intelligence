# Canvas renderer for the connection graph — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the React-reconciled SVG body of `ForceGraph` with a Canvas 2D surface driven from a ref, with d3-force in an inline Web Worker and an explicit accessibility layer, keeping every frozen semantic channel byte-for-byte and `GraphExplorer`'s contract unchanged — `docs/research/GRAPH_UI_SOTA.md` §5.

**Architecture:** `ForceGraph.tsx` keeps its `Props` and every export. Inside it, three layers stack in one measured frame: a `<canvas role="img">` that draws edges, denials, nodes, labels and the minimap from a positions buffer on a dirty-flag rAF loop; an SVG interaction/a11y overlay (`GraphA11y.tsx`) of the same measured size that is the camera's element (so `camera.tsx` is untouched and still reads `getScreenCTM`), receives every pointer event, and renders real focusable elements only for the examined set plus a roving keyboard cursor; and the unchanged camera controls, status strip and edge card. Layout runs in `layout.worker.ts` (inline Blob worker, so `file://` works) through `useLayout.ts`, with the same simulation code (`layoutCore.ts`) as an in-thread fallback.

**Tech Stack:** React 18, TypeScript strict, Vite 6 (`?worker&inline`), d3-force 3, d3-quadtree 3 (already transitive via d3-force — made explicit, 0 bytes added). No new runtime dependency.

**Spec:** `docs/research/GRAPH_UI_SOTA.md` §5 (plan), §6 (honesty rules), §7 (refusals). Gates: `npm run build`, `npm run smoke`, `npm run viewport`, `ENERGY_DIST=<pinned dist> node --test scripts/pages/energy.test.mjs` (67/67, never edited).

## Global Constraints

- Frozen, byte-for-byte: `TIERS[tier].dash` → `ctx.setLineDash` with the same numbers (layout units, so dashes scale with zoom as `stroke-dasharray` did); the five shape classes → `new Path2D(shapeFor(cls, r))` from the same strings; `FAMILY_COLOR`; radius `4 + sz·3.2`; denials red (`#c45b5a`), never batched, never dimmer than a claim they answer; unresolved nodes dashed `2 2` at fill-opacity .25.
- `camera.tsx` untouched. `GeoNetwork.tsx` untouched (SVG, out of scope). `EnergyGraph.tsx` untouched.
- Layout contract unchanged from the SVG version: cold start, exactly 300 ticks (120 on release), deterministic, reduced motion pre-ticks with no intermediate frames. §5.3's warm start and `alphaMin` settle are **not** adopted — they would break "a shared URL reproduces the layout", which the viewport gate asserts.
- Batching rule unchanged: over 600 drawn edges, non-denial edges batch by (tier, lit, width); denials, path edges, the card's edge (= the hovered edge) and the focus entity's own edges (≤ 200 neighbours) are drawn one by one.
- Labels, minimap, edge cards, legend filters behave exactly as before. No label occupancy grid (§6.1) — the rule stays `k × degree` and `sz`.
- Every new visual encoding gets a legend entry: the denial cross-bar and denial width are added to the explorer's line-style note.
- Not touched (other fleets): `src/components/welfare/*`, `src/pages/*`, `scripts/pages/*`, `scripts/smoke.mjs`, top-level docs.

## Review Focus

- A worker `pos` message that arrives after a local drag must not snap the dragged node back (main thread overrides pinned indices).
- A generation counter discards stale worker messages after a filter change.
- The overlay's DOM order must not depend on the cursor, or Tab order reshuffles under the reader.
- ExpandShell remounts the frame: the canvas context, the camera's svg ref and the wheel listener all re-attach.

---

### Task 1: Dependencies

**Files:** `package.json`, `package-lock.json`.

- [x] Step 1: `npm install d3-quadtree@^3.0.1` (already in the lock as d3-force's dependency) and `npm install -D @types/d3-quadtree@^3.0.6`.
- [x] Step 2: confirm `node_modules/d3-quadtree` resolves to the same 3.0.1 the lock already held.

### Task 2: Layout core, worker and hook

**Files:** Create `src/components/viz/layoutCore.ts`, `src/components/viz/layout.worker.ts`, `src/components/viz/useLayout.ts`.

**Interfaces — Produces:** `createLayout({ r, band, links, pinned }) → { tick(n), write(out), pin(i,x,y), release() }`; `LAYOUT_TICKS = 300`, `RELEASE_TICKS = 120`; `useLayout({ r, band, links, pinned, reduced, onFrame }) → { pos: RefObject<Float32Array|null>, settled: number, ticks: RefObject<number>, pin, release, driver: 'worker'|'thread' }`.

- [x] Step 1: `layoutCore` builds exactly today's simulation: link 78/0.55, charge −190, collide r+7, x bands ±230 at .09, y 0 at .05, created stopped.
- [x] Step 2: the worker runs a job in ~12 ms chunks, posts a transferable `Float32Array` after each chunk and `done` at the end; `reduced` runs every tick then posts once. Messages carry a generation.
- [x] Step 3: the hook prefers the worker, falls back to the same core on the main thread (rAF, 10 ms budget) when `Worker` is missing, construction throws or the worker errors.
- [x] Step 4: `npx tsc -b` → no errors.

### Task 3: Canvas renderer in `ForceGraph.tsx`

**Files:** Modify `src/components/viz/ForceGraph.tsx`.

- [x] Step 1: keep every export and `Props`; replace the SVG body with the canvas + overlay composition.
- [x] Step 2: draw loop on a dirty flag — batches, singles (arrowheads as filled triangles matching the old marker geometry), denials last with `contraWidth` and a mid-edge cross-bar, nodes via cached `Path2D`, pinned rings, screen-space labels (9.5 px, 2.4 px halo), minimap.
- [x] Step 3: hit-testing — quadtree over drawn node positions, rebuilt whenever the drawn-node array or the positions buffer changes; a node is hit when the point is on its painted glyph (`isPointInPath`/`isPointInStroke` against the same `Path2D`) or within 12 screen px of the glyph's body; nearest individually drawn edge within max(3, 5/k) layout units, on its offset segment, walked in paint order, when no node is hit. A click raised on an overlay element resolves from the element, not from coordinates. *(Amended after review: the first build tested a circle around the layout point, keyed the tree on count + first id, and ignored the event target.)*
- [x] Step 4: pointer model on the overlay svg — node drag pins (sends `pin`), empty drag pans through the camera, a drag is not a click, hover lights neighbours, hovering an inspectable edge puts it on the card.
- [x] Step 5: test probes on the overlay svg: `data-tick` (cumulative ticks), `data-settled`, `data-k`, `data-tx`, `data-ty`, `data-batched`, `data-layout` (position digest), `data-extent`, `data-probe`, `data-pinned`, `data-driver`.
- [x] Step 6: `npm run build` → green.

### Task 4: Accessibility overlay `GraphA11y.tsx`

**Files:** Create `src/components/viz/GraphA11y.tsx`; wire from `ForceGraph.tsx`.

- [x] Step 1: examined set — selected node, its neighbours, path nodes, path and selection edges (tab stops, placed after the anchor as before), the card's edge, denials answering an examined claim, and the keyboard cursor; capped at 200 nodes, the cap stated.
- [x] Step 2: same roles and names as the SVG version: `g[role=button][data-id][tabindex=0][aria-pressed][aria-label]`, `g[role=img][aria-roledescription=relationship][aria-label]`; focus rings drawn by the overlay on `:focus-visible`.
- [x] Step 3: keyboard cursor — arrows on a node move to the nearest node in a ±30° cone (widening to ±75°), the camera follows, Enter selects, Shift+Enter sets a path end; an `aria-live=polite` region announces "label, type, n relationships, a alleged, d denials".
- [x] Step 4: positions of overlay elements are updated imperatively per drawn frame, never through React per tick.

### Task 5: Legend and explorer contract

**Files:** Modify `src/components/viz/GraphExplorer.tsx` (legend note only).

- [x] Step 1: the tier note names the denial cross-bar and "at least as wide as the claim it answers".

### Task 6: Viewport gate for the canvas

**Files:** Modify `scripts/graph-viewport.mjs` (ForceGraph sections only; GeoNetwork untouched).

- [x] Step 1: camera reads stay on the overlay svg (viewBox, `g[transform]`, CTM) — the same measurement; add "canvas backing store matches the frame (no letterbox, DPR-correct)".
- [x] Step 2: "every node inside after fit" from `data-extent` mapped through the measured camera; node drag from `data-probe`; pinned from `data-pinned` + release button; empty canvas found by reading canvas pixels (no ink within 12 px); layout identity from `data-tick` + `data-layout`.
- [x] Step 3: add: the canvas has `role=img` and a name; a worker drove the layout (`data-driver=worker`); keyboard cursor — Tab from the frame reaches a node, an arrow moves the cursor without panning, the live region announces it.

### Task 7: Measure and gate

- [x] Step 1: frame time at `/network` and `/energy`, before (pinned pre-change dist) and after — settle, main-thread ms per pan move / wheel notch / hover move; a 1,500-node synthetic through `GraphExplorer`.
- [x] Step 2: `npm run build`, `npm run smoke`, `npm run viewport`, pinned energy suite 67/67.

### Review amendments (2026-09-26)

- Parallel relationships on the same unordered pair fan out by rank (perpendicular offset, layout units, one-unit gap; claims by amount → predicate → tier → input order, denials after them). The canvas, `edgeAt` and the overlay's `<line>`s share `segOf`. Before this, a same-pair denial (drawn last, ≥ the claim's width) painted the claim out entirely.
- Under `forced-colors: active` denials keep `#c45b5a` (was `LinkText`): the task freezes "contra edges red".
- `graph-viewport.mjs` gained pixel and hit-testing checks: ink under the largest node after fit; the pin ring's pixels (with a before-pin control); a hover sweep over in-fill points of every examined glyph class at fit and zoomed in; hover after an in-app focus change and no click-through to hidden entities; a coordinate-less click on an entity; a claim and its same-pair denial both painted and both hoverable.

## Not done from SOTA §5 / §6

Stated so nobody reads §5 as executed. Each is still open.

| Item | Status |
|---|---|
| §5.2 `graphSemantics.ts` extraction, and one shared `contraWidth` (§6.3) | Not done. ForceGraph's denial width joins `answers` only (named or same pair), drawn claims, floor 1.5; GeoNetwork's `widthOf` joins every claim sharing an entity, floor 1.1. The two can disagree for the same denial. |
| §5.2 `camera.tsx`: element-agnostic `toViewBox`, pinch zoom, `flyTo` | Not done — `camera.tsx` is untouched; the overlay SVG is the camera's element instead. No pinch zoom, no fly-to. |
| §5.2 `GraphCanvas.tsx` as a separate file | Not done — the renderer lives in `ForceGraph.tsx`. |
| §5.2 `smoke.mjs` canvas checks; §5.5 axe run | Not done. |
| §5.2 / §5.8 phase 4 `graph-perf.mjs` gate with a 1,500-node fixture | Not done. Frame times were measured once by hand (Task 7), not gated. |
| §5.3 warm start and `alphaMin` settle | Deliberately not adopted (see Global Constraints: breaks "a shared URL reproduces the layout"). |
| §5.5 lit-edge contrast 0.30 → ≥ 0.45 | **Decided: not changed in this pass.** Measured on `--color-bg` #0a0a0c: a lit claim is `rgba(232,228,220,0.30)` at `globalAlpha` 0.55 → effective alpha 0.165 → **1.46:1**. The plan's 0.45 would give 0.2475 → **1.91:1**, still under WCAG 1.4.11's 3:1 — §5.5's arithmetic omitted the 0.55 opacity. 3:1 needs effective alpha ≥ 0.380 (base ≈ 0.69 at 0.55). That is a visible tone change to every edge and breaks the Phase 1 "identical to the SVG screenshot" acceptance, so it needs its own decision (and a check that dimmed-vs-lit contrast survives), not a silent retune. The table twin remains the conforming route meanwhile. |
| §5.6 / §6.2 "as of" date mode; `hiddenByTime` in the caption | Not done. |
| §6.1 label occupancy grid | Not done — labels use the unchanged `k × degree` / `sz` rule. |
| §6.4 jump-to; §6.5 why-drawn line; §6.6 path strip; §6.7 tenure strip; clickable family chips | Not done. |
| `docs/INDEX.md` / `HANDOFF.md` updates | Not done — top-level docs are owned by another fleet in this session. |
