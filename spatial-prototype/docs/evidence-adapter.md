# Source-preserving evidence preview

> Current rendering uses the geographic adapter described in `geographic-evidence-adapter.md`. The narrative layout below is retained only in the raw model for compatibility; its positions are ignored by the current geographic scene.

This isolated prototype uses a deterministic, source-closed selection from the preserved original investigation registry. It adds presentation coordinates and filtering, not research claims.

## Selected scope

- All 10 retained `atlas-international-finance` records: India/Tamil Nadu, Mahindra/IFC, Bangladesh/ADB/PGCB/L&T, Bajaj/IFC, IDA budget support, and IMF SDR/no-programme-credit context.
- The C295 India–Spain case and its delivery/money-stage boundary response.
- Closure yields 36 entities, 33 relationships, 12 records and 24 sources.
- Registry evidence snapshot remains 2026-10-07; individual date and status qualifiers remain on each object. This is not a live fact update.

All retained entities, relationships, records and sources are exactly equal to their original objects. IDs, URLs, publishers, locators, source limitations, geography notes, responses, alternatives, falsifiers and financial stages are not rewritten. Coverage counts are recalculated and explicitly labeled as preview counts. Other cases remain in the preserved original application and are outside this display selection.

`node scripts/trim-registry.mjs` reproduces the subset from the retained original bundled registry. `docs/preview-manifest.json` records scope and original/preview counts. The original bundle is development/test input; it is not imported by the runtime.

## Model API

- `buildPreview()` / `getPreview()` returns `PreviewData`.
- `registry` exposes the complete preview evidence registry, including counter-evidence.
- `filterScene(preview, { query, layers, fromYear, toYear, includeUndated })` returns the same shape, with filtered nodes and edges. It never destroys registry data or changes positions.
- `strength(item | edge | sourceCount)` returns a rendering multiplier clamped to 1–5.
- `SceneNode`: `{ id, kind: 'entity'|'record', item, title, position: [x,y,z], cluster }`.
- `SceneEdge`: `{ id, relationship, from, to, sourceCount }`.
- `clusters`: `{ id, label, position: [x,y,z], color }[]`.
- `layers` preserves the original nine named facets; `yearRange` is `[2015, 2026]`.

## Interpretation rules

Superseded raw-model compatibility only (not rendered): the four groups are narrative layout zones: India case context, Bangladesh project context, Spain/C295 context, and multilateral context. They do not represent coordinates, administrative areas, physical colocation, cash destinations or corporate domiciles. Original geography metadata remains the authoritative qualified description. Positions occupy a roughly 60 × 36 board with Y up, and are stable across filtering. Entity elevation is a visual treatment unrelated to evidence strength.

Only retained original relationship objects become edges. Record membership, similar names, shared geography and proximity create no new edge. All visible edges have visible endpoints. Separate retained identifiers, including different India mentions, are not silently merged.

Line thickness uses the count of distinct cited source IDs, capped at five for readability. The exact uncapped count remains on the edge. It is not a measure of confidence, source independence, wrongdoing, importance or completeness. Multiple records can cite one underlying source.

Timeline filtering uses inclusive overlap of original event-date years. A single known endpoint is treated as the known date, matching the original registry matcher; null endpoints are not converted into invented event dates. `includeUndated` explicitly controls rows with neither usable date. Publication and status-as-of dates do not silently become event dates. Entities are timeless context and remain when eligible records/relationships explicitly refer to them. A case can overlap the selected year without its out-of-range individual edges being displayed.

The earlier hand-typed schematic outline is not imported or shipped by the current renderer. Source-backed country and state geometry is documented in `geographic-evidence-adapter.md`.

## Casebook and tutorial preservation

`src/casebookStore.ts` is the original Casebook implementation, with only its type import changed to the isolated `src/domain.ts`. Its versioned schema, storage key, additive merge, safe saved-view handling, source closure, linked responses and export language remain unchanged. A small original-source fixture protects that invariant without importing the old runtime.

Original tutorial progress logic and guide catalog remain under `src/tutorial/`. They are retained data/logic and not a claim that every original route is implemented in this isolated prototype. The current UI must use only applicable routes/controls.

## Verification

`npm test` bundles pure TypeScript modules into temporary Node-loadable files and runs deterministic Node tests. It checks exact original-object equality, source and response closure, absence of invented IDs and edges, retained qualifiers, stable layout, filters, source-count semantics, and original Casebook behavior. These are structural/provenance tests, not a fresh independent audit of every source claim.
