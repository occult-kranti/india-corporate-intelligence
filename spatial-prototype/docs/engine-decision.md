# Geographic rendering and camera decision

Official documentation checked on 2026-10-15. This replaces the earlier tabletop/independent-diorama implementation.

## Choice

MapLibre GL JS 6.13 owns one continuous Web Mercator camera, tile lifecycle, pan/zoom/tilt/rotation and footprint extrusion. Three.js 0.180 uses MapLibre's shared WebGL canvas/context and `defaultProjectionData.mainMatrix` through a custom 3D layer. Pins, cards and threads use actual Mercator coordinates, so there are no per-city scene transforms or fake scale transitions. React 18 handles accessible reading and controls, not frame-by-frame camera updates. The original React/Vite stack and live routes stay unchanged.

R3F and drei were researched, but a second camera/controller would add needless synchronization. Current R3F documentation pairs v8 with React 18 and v9 with React 19; no React upgrade is needed. MapLibre is already part of the original application's stack.

Primary references:
- https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/
- https://maplibre.org/maplibre-gl-js/docs/API/interfaces/CustomLayerInterface/
- https://maplibre.org/maplibre-gl-js/docs/API/classes/MercatorCoordinate/
- https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
- https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion
- https://openfreemap.org/quick_start/
- https://openmaptiles.org/docs/schema/#building
- https://threejs.org/docs/pages/CatmullRomCurve3.html
- https://threejs.org/docs/pages/TubeGeometry.html
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://r3f.docs.pmnd.rs/getting-started/introduction
- https://drei.docs.pmnd.rs/controls/camera-controls

## Camera and reader

A single rectangular world is shown without wrap copies. Camera latitude bounds follow the Mercator limit, pitch is bounded at 70°, and building geometry is rendered by MapLibre in the same geographic space. The user cannot fly a first-person camera inside buildings. Home and previous pose remain one action away. Thread travel follows retained geographic endpoints and ends at the source-supported evidence scale; reduced motion jumps directly. User drag/zoom/rotation pauses travel and Escape stops it.

The source reader is a DOM panel that remains upright and interactive during motion. Its pin retains the current reading context. Screen-space collision filtering limits labels to 12; overlapping geographic evidence is an explicit record stack, never jittered into fabricated locations. All records remain reachable through the reading list. We do not claim raycast occlusion of DOM labels against every live building; evidence labels disappear from city-scale context when their area representatives are out of view, and the reader stays screen anchored.

## Material and LOD

Seeded procedural fibers are map patterns, with different green tones for land and water. A bundled Natural Earth country layer supplies recognizable geometry independently of live tiles. The Three.js overlay supplies physical pin stems/heads, textured paper and low-poly source curves. Building footprints are native vector fill extrusions, not generated images or arbitrary miniatures. Actual tile geometry streams with zoom; height is approximate and is labelled accordingly.

Paper cards hide at zoom 8; screen-normalized geographic threads fade by zoom 6; footprints appear at zoom 13 and rise from zoom 14 to 15. Pixel ratio is capped at 1.5 and adapts to 1.0 after low moving-frame samples. Balanced travel caps camera updates to 30 Hz. These are bounded implementation targets; screenshot review and measured performance are separate requirements.

## Precise-coordinate gap

The current retained evidence supports only country/state areas. Evidence-driven travel therefore cannot truthfully end at a particular bank or company building. Public city destination controls demonstrate the requested continuous world-to-building transition without claiming an evidence join. Adding genuine institution-site destinations requires independently sourced coordinate records with source IDs, address/coordinate precision and temporal qualifiers. It must not geocode a name and silently upgrade its evidentiary meaning.

## Full registry and loading boundaries

The full reader is mounted only after all 96 registry chunks and the 23,207,262-byte canonical snapshot validate. It retains 8,086 entity/record items, 4,203 relationships, 3,314 sources and all 316 held entries. Held/not-drawn objects remain reader context and are excluded before factual scene filtering. Pagination limits DOM work to 40 catalogue cards.

The lightweight UI imports area representatives only. The map runtime is React-lazy and the source-identical world/state geometry loads as separate same-origin JSON assets after exploration starts; reading-only mode does not import MapLibre/Three. One paper group per documented area and at most 60 representative original cross-area threads bound overlay work. Each drawn edge retains its own original direction, predicate and distinct source count; selection may replace a representative but cannot create a new relationship. Build byte budgets are enforced independently of unmeasured device FPS.
