# Geometry correction, schema 1.1

The engine independently found that New Parliament House, OSM relation/12737019, had nested/intersecting inner rings. Its exterior area minus the sum of all holes was -260.9207105 m². The original mesh test incorrectly divided its relative error by that negative area, so it did not reject the feature.

The feature is now excluded from the runtime JSON, GeoJSON and GLBs, without invented repair. Its source ID and exact failure reasons are in sample-validation.json; the minimal original source snapshot remains available for audit. The package now contains 25 polygons: Delhi 7, Mumbai 7, London 11. Tests now require strictly positive net area and validate ring self-intersection, hole containment and hole intersections/nesting before mesh creation. Remaining polygon meshes pass roof-area matching, no-degenerate-triangle, GLTFLoader and geographic roundtrip checks.

The prior 26-polygon result and its area-validation claim are superseded. Heights now comprise five source-reported, thirteen floor-derived and seven assumed values.
