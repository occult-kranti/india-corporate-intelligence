import test, { after } from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { loadOriginalRegistry } from "./original-registry.mjs";

const temporary = await mkdtemp(join(tmpdir(), "spatial-geography-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
async function load(file, name) {
  const outfile = join(temporary, `${name}.mjs`);
  const result = await build({
    entryPoints: [file],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
    metafile: true,
  });
  return {
    module: await import(pathToFileURL(outfile).href),
    inputs: Object.keys(result.metafile.inputs),
    outfile,
  };
}
const lightweight = await load("src/geography.ts", "geography");
const geo = lightweight.module;
const cartography = (await load("src/cartography.ts", "cartography")).module;
const originalRegistry = await loadOriginalRegistry();
const anchors = JSON.parse(
  await readFile("src/assets/geography/evidence-area-anchors.json", "utf8"),
);
const metadata = JSON.parse(
  await readFile("src/assets/geography/geography-sources.json", "utf8"),
);
const heldIds = new Set(originalRegistry.held.map((row) => row.id));
const nodeFor = (item) => ({
  id: item.id,
  kind: "label" in item ? "entity" : "record",
  item,
  title: item.label ?? item.title,
  position: [123, 456, 789],
  cluster: "narrative-not-geographic",
});
// Match the scene admission contract, independently of the bundled registry loader.
// All held source objects remain in the original registry and are tested below.
const original = {
  registry: originalRegistry,
  nodes: [...originalRegistry.entities, ...originalRegistry.records]
    .filter((item) => !heldIds.has(item.id) && item.status !== "not-drawn")
    .map(nodeFor),
  edges: originalRegistry.relationships.map((relationship) => ({
    id: relationship.id,
    relationship,
    from: relationship.from,
    to: relationship.to,
    sourceCount: new Set(relationship.sourceIds).size,
  })),
  clusters: [
    {
      id: "narrative-not-geographic",
      label: "Not a location",
      position: [123, 456, 789],
      color: "#fff",
    },
  ],
  layers: [],
  yearRange: [1900, 2026],
  caveat: "",
};
const scene = geo.getGeographicScene(original);
const byId = new Map(original.nodes.map((node) => [node.id, node]));
const finance = (id) => byId.get(`atlas-international-finance:entity:${id}`);
const make = (geography, namespace = "atlas-international-finance") => ({
  ...finance("india"),
  item: { ...finance("india").item, namespace, geography },
});
const sourceIds = finance("india").item.sourceIds;
const context = (overrides = {}) => ({
  scope: "state",
  countryCodes: ["IN"],
  stateCodes: ["TN"],
  localityIds: [],
  basis: "state-association",
  note: "Retained test context; no site asserted",
  sourceIds,
  ...overrides,
});

function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i],
      [xj, yj] = ring[j];
    if (
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    )
      inside = !inside;
  }
  return inside;
}
function inGeometry(point, geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some(
    (poly) =>
      inRing(point, poly[0]) &&
      !poly.slice(1).some((hole) => inRing(point, hole)),
  );
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

// These are explicit full-snapshot counts, not the previous 48-item preview counts.
test("full source registry stays complete while geographic admission has explicit counts", () => {
  assert.deepEqual(
    [
      originalRegistry.entities.length,
      originalRegistry.records.length,
      originalRegistry.relationships.length,
      originalRegistry.sources.length,
      originalRegistry.held.length,
    ],
    [2469, 5617, 4203, 3314, 316],
  );
  assert.equal(original.nodes.length, 7859);
  assert.equal(scene.projection, "EPSG:3857");
  assert.equal(scene.nodes.length, 3856);
  assert.equal(scene.edges.length, 1659);
  assert.equal(scene.unplacedNodes.length, 4003);
  assert.equal(
    new Set(scene.nodes.map((node) => node.anchor.areaCode)).size,
    42,
  );
  assert.deepEqual(scene.clusters, []);
  assert.equal(scene.registry, originalRegistry);
  assert.equal(
    new Set([...scene.nodes, ...scene.unplacedNodes].map((node) => node.id))
      .size,
    7859,
  );
  for (const node of scene.nodes)
    assert.deepEqual(
      node.position,
      geo.projectLngLat(node.anchor.lng, node.anchor.lat),
    );
  assert.match(scene.caveat, /never verified headquarters/);
  assert.match(scene.caveat, /upstream territorial claims/);
  assert.match(scene.caveat, /disputed borders are not adjudicated/);
});

test("only cited country/state context is placed, preserving all evidence qualifiers and sources", () => {
  const sources = new Set(originalRegistry.sources.map((source) => source.id));
  for (const node of scene.nodes) {
    const anchor = node.anchor;
    assert.ok(["country", "state"].includes(anchor.precision));
    assert.equal(anchor.representativeOnly, true);
    assert.match(
      anchor.label,
      /representative area point, not a verified site or address/,
    );
    assert.ok(
      anchor.sourceIds.length > 0 &&
        anchor.sourceIds.every((id) => sources.has(id)),
    );
    assert.deepEqual(anchor.sourceIds, [
      ...new Set(node.item.geography.flatMap((g) => g.sourceIds)),
    ]);
    assert.ok(anchor.uncertaintyKm > 0);
    assert.equal(
      anchor.maxEvidenceZoom,
      anchor.precision === "country" ? 4 : 7,
    );
    assert.equal(anchor.focusZoom, anchor.maxEvidenceZoom);
    assert.ok(!("address" in anchor) && !("buildingId" in anchor));
    assert.equal(
      node.item,
      byId.get(node.id).item,
      "original evidence object stays untouched",
    );
    assert.ok(node.item.geography.every((g) => anchor.basis.includes(g.basis)));
  }
});

test("all 269 surface representatives lie strictly inside the exact retained feature, excluding holes", () => {
  assert.equal(anchors.length, 269);
  assert.equal(new Set(anchors.map((area) => area.code)).size, 269);
  assert.equal(
    anchors.filter((area) => area.precision === "country").length,
    233,
  );
  assert.equal(anchors.filter((area) => area.precision === "state").length, 36);
  for (const area of anchors) {
    const collection =
      area.precision === "state"
        ? cartography.INDIA_STATE_BOUNDARIES
        : cartography.WORLD_COUNTRIES;
    const feature = collection.features.find(
      (feature) => feature.id === area.geometryFeatureId,
    );
    assert.ok(feature, area.code);
    assert.ok(
      inGeometry([area.lng, area.lat], feature.geometry),
      `${area.code} representative outside polygon surface`,
    );
    assert.deepEqual(area.bounds, feature.bbox);
    assert.equal(area.centerMethod, metadata.representativeMethodId);
    assert.match(metadata.representativeMethod, /Validated point on surface/);
    if (area.precision === "country")
      assert.equal(area.code, feature.properties.iso2);
    else assert.equal(area.code, `IN-${feature.id}`);
  }
  assert.deepEqual(
    [
      ...new Set(
        scene.nodes
          .filter((node) => node.anchor.precision === "state")
          .map((node) => node.anchor.areaCode.slice(3)),
      ),
    ].sort(),
    originalRegistry.states.map((state) => state.code).sort(),
  );
});

test("identical broad evidence shares exact coordinates with no geographic jitter", () => {
  const groups = new Map();
  for (const node of scene.nodes) {
    const prior = groups.get(node.anchor.areaCode);
    if (prior) {
      assert.deepEqual(node.position, prior.position);
      assert.deepEqual(
        [node.anchor.lng, node.anchor.lat],
        [prior.anchor.lng, prior.anchor.lat],
      );
    } else groups.set(node.anchor.areaCode, node);
  }
  assert.equal(groups.size, 42);
  assert.equal(geo.getNodeAnchor(finance("adb")).areaCode, "BD");
  assert.equal(geo.getNodeAnchor(finance("aiib")).areaCode, "BD");
  assert.equal(
    geo.getNodeAnchor(finance("ibrd")).areaCode,
    "IN",
    "case context is not lender headquarters",
  );
  assert.equal(
    geo.getNodeAnchor(byId.get("deep-governance:entity:sec")).areaCode,
    "IN",
    "original India case context never claims the regulator is physically located in India",
  );
});

test("explicit bounded national semantic crosswalk preserves coarsest source scope", () => {
  const namespaces = [
    ...new Set(
      [
        ...originalRegistry.entities,
        ...originalRegistry.records,
        ...originalRegistry.relationships,
      ]
        .filter((row) =>
          row.geography.some(
            (g) => g.scope === "national" && g.basis === "national-context",
          ),
        )
        .map((row) => row.namespace),
    ),
  ].sort();
  assert.equal(namespaces.length, 26);
  assert.deepEqual(
    Object.keys(geo.NATIONAL_CONTEXT_CROSSWALK).sort(),
    namespaces,
  );
  for (const namespace of namespaces)
    assert.equal(
      geo.getNodeAnchor(
        make(
          [
            context({
              scope: "national",
              basis: "national-context",
              countryCodes: [],
              stateCodes: [],
            }),
          ],
          namespace,
        ),
      ).areaCode,
      "IN",
    );
  assert.equal(
    geo.getNodeAnchor(
      make(
        [
          context({
            scope: "national",
            basis: "national-context",
            countryCodes: [],
            stateCodes: [],
          }),
        ],
        "unknown-dataset",
      ),
    ),
    null,
  );
  assert.equal(
    geo.getNodeAnchor(
      make(
        [
          context({
            scope: "national",
            basis: "national-context",
            countryCodes: [],
            stateCodes: [],
          }),
        ],
        "atlas-new-unreviewed",
      ),
    ),
    null,
  );
  for (const id of [
    "public-works:entity:rw-larsen-toubro",
    "water:document:wf-irrigation",
    "public-works:document:state-src-army-audit",
  ]) {
    const anchor = geo.getNodeAnchor(byId.get(id));
    assert.equal(anchor.areaCode, "IN", id);
    assert.equal(anchor.precision, "country", id);
  }
  assert.equal(
    geo.getNodeAnchor(
      make([context({ scope: "country", basis: "country-context" })]),
    ).precision,
    "country",
  );
});

test("city and project labels can retain their cited area but never gain city/site coordinates", () => {
  for (const scope of ["city", "project", "district", "village", "block"]) {
    const node = make([
      context({
        scope,
        basis: "project-location",
        stateCodes: ["MH"],
        localityIds: ["unverified-famous-building"],
      }),
    ]);
    const anchor = geo.getNodeAnchor(node);
    assert.equal(anchor.areaCode, "IN-MH");
    assert.equal(anchor.precision, "state");
    assert.equal(
      geo.getNodeAnchor(
        make([
          context({
            scope,
            basis: "project-location",
            countryCodes: [],
            stateCodes: [],
            localityIds: ["Mumbai"],
          }),
        ]),
      ),
      null,
    );
  }
  const countryOnly = geo.getNodeAnchor(
    make([
      context({
        scope: "project",
        basis: "project-location",
        countryCodes: ["PH"],
        stateCodes: [],
        localityIds: ["unverified-project"],
      }),
    ]),
  );
  assert.equal(countryOnly.areaCode, "PH");
  assert.equal(countryOnly.precision, "country");
});

test("unknown, unsupported, multi-area and conflicting qualifiers cannot acquire fallback points", () => {
  const rejected = [
    [],
    [context({ scope: "unknown", basis: "unknown" })],
    [context({ scope: "state", basis: "unknown" })],
    [context({ stateCodes: ["XX"] })],
    [context({ stateCodes: ["jk"] })], // No boundary-era alias or name resolution.
    [context({ countryCodes: ["US"], stateCodes: ["TN"] })],
    [context({ countryCodes: ["IN", "BD"] })],
    [context({ stateCodes: ["TN", "KA"] })],
    [context({ scope: "multi-state" })],
    [context(), context({ stateCodes: ["KA"] })],
    [
      context(),
      context({
        scope: "unknown",
        basis: "unknown",
        countryCodes: [],
        stateCodes: [],
      }),
    ],
    [
      context({
        scope: "country",
        basis: "country-context",
        countryCodes: ["ZZ"],
        stateCodes: [],
      }),
    ],
    [
      context({
        scope: "national",
        basis: "national-context",
        countryCodes: [],
        stateCodes: ["XX"],
      }),
    ],
  ];
  for (const geography of rejected)
    assert.equal(
      geo.getNodeAnchor(make(geography)),
      null,
      JSON.stringify(geography),
    );
  for (const node of scene.unplacedNodes)
    assert.equal(geo.getNodeAnchor(node), null, node.id);
  const mixed = byId.get("deep-services:record:akshaya-meals-related-parties");
  assert.equal(geo.getNodeAnchor(mixed), null);
  assert.match(geo.getUnplacedReason(mixed), /Multiple geographic areas/);
  assert.equal(geo.getNodeAnchor(finance("lt")), null);
});

test("each geography needs citations and scene citations must resolve in the retained source registry", () => {
  assert.equal(geo.getNodeAnchor(make([context({ sourceIds: [] })])), null);
  assert.equal(
    geo.getNodeAnchor(make([context(), context({ sourceIds: [] })])),
    null,
    "cited sibling cannot rescue an uncited geography",
  );
  assert.equal(geo.getNodeAnchor(make([context({ sourceIds: [" "] })])), null);
  const unresolved = make([context({ sourceIds: ["missing:source:unknown"] })]);
  const missing = geo.getGeographicScene({
    ...original,
    nodes: [unresolved],
    edges: [],
  });
  assert.equal(missing.nodes.length, 0);
  assert.equal(missing.unplacedNodes.length, 1);
  assert.match(missing.unplacedReasons[unresolved.id], /does not resolve/);
});

test("all 316 held objects and 227 not-drawn record counterparts stay readable without stronger precision", () => {
  const counterparts = originalRegistry.records.filter((record) =>
    heldIds.has(record.id),
  );
  assert.equal(counterparts.length, 227);
  assert.ok(counterparts.every((record) => record.status === "not-drawn"));
  assert.equal(
    originalRegistry.records.filter((record) => record.status === "not-drawn")
      .length,
    227,
  );
  for (const item of counterparts) {
    assert.equal(geo.getNodeAnchor(nodeFor(item)), null, item.id);
    assert.ok(!scene.nodes.some((node) => node.id === item.id));
    assert.ok(!scene.unplacedNodes.some((node) => node.id === item.id));
  }
  assert.equal(scene.registry.held, originalRegistry.held);
  assert.equal(scene.registry.records, originalRegistry.records);
  assert.equal(scene.registry.sources, originalRegistry.sources);
});

test("geographic edges are the exact directed source objects with both endpoints placed", () => {
  const placed = new Set(scene.nodes.map((node) => node.id));
  const edges = new Map(original.edges.map((edge) => [edge.id, edge]));
  for (const edge of scene.edges) {
    assert.ok(placed.has(edge.from) && placed.has(edge.to));
    assert.equal(edge, edges.get(edge.id));
  }
  const subset = original.nodes.filter(
    (node) => node.item.namespace === "atlas-defence-trade",
  );
  const filtered = geo.getGeographicScene({ ...original, nodes: subset });
  const visible = new Set(filtered.nodes.map((node) => node.id));
  assert.ok(
    filtered.edges.every(
      (edge) => visible.has(edge.from) && visible.has(edge.to),
    ),
  );
});

test("Mercator projection preserves consistent axes, finite polar clipping and one unwrapped world", () => {
  assert.deepEqual(geo.projectLngLat(0, 0), [0, 0.35, 0]);
  assert.equal(geo.projectLngLat(-180, 0)[0], -30);
  assert.equal(geo.projectLngLat(180, 0)[0], 30);
  assert.equal(geo.projectLngLat(90, 0)[0], 15);
  assert.ok(geo.projectLngLat(0, 45)[2] < 0);
  assert.ok(geo.projectLngLat(0, -45)[2] > 0);
  assert.ok(geo.projectLngLat(0, 90).every(Number.isFinite));
  assert.ok(Math.abs(geo.projectLngLat(0, 90)[2] + 30) < 1e-9);
  for (const coordinates of [
    [181, 0],
    [NaN, 0],
    [0, 91],
    [0, 0, -1],
  ])
    assert.throws(() => geo.projectLngLat(...coordinates), RangeError);
});

test("geographic transformation is deterministic and preserves every full-registry source object", () => {
  const before = hash(JSON.stringify(original));
  assert.deepEqual(geo.getGeographicScene(original), scene);
  assert.equal(hash(JSON.stringify(original)), before);
});

test("UI geography imports never pull heavy world, state, map or registry data into the initial bundle", async () => {
  assert.ok(
    !lightweight.inputs.some((path) =>
      /world-countries|india-states|tamil-nadu|cartography|model\.ts|registry\.json|maplibre/.test(
        path,
      ),
    ),
    lightweight.inputs.join("\n"),
  );
  assert.ok(
    (await readFile(lightweight.outfile)).length < 250_000,
    "only compact anchors/provenance and logic belong in this module",
  );
  assert.equal("WORLD_COUNTRIES" in geo, false);
  assert.equal(cartography.WORLD_COUNTRIES.features.length, 242);
  assert.equal(cartography.INDIA_STATE_BOUNDARIES.features.length, 36);
  assert.equal(cartography.TAMIL_NADU_BOUNDARY.features.length, 1);
  assert.equal(
    cartography.TAMIL_NADU_BOUNDARY.features[0],
    cartography.INDIA_STATE_BOUNDARIES.features.find(
      (feature) => feature.id === "TN",
    ),
  );
});

test("all artifact hashes, original cartographic source hashes and source qualifiers are explicit", async () => {
  for (const [file, expected] of Object.entries(metadata.artifactSha256))
    assert.equal(
      hash(await readFile(`src/assets/geography/${file}`)),
      expected,
      file,
    );
  assert.equal(
    metadata.sources.find(
      (source) => source.id === "natural-earth-50m-countries",
    ).sha256,
    "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb",
  );
  assert.equal(
    metadata.artifactSha256["world-countries-50m.json"],
    "a97bd58679079eae2bd0c86ec122537dde9c0958bd812eb07c5e60fe13ab690c",
  );
  assert.equal(
    metadata.sources.find(
      (source) => source.id === "lgd-bharatmaps-india-states",
    ).sha256,
    "7ae52226dde1e67884903819d48579305d100615bdad54712bbe5991332fe76d",
  );
  assert.equal(
    metadata.sources.find((source) => source.id === "lgd-bharatmaps-tamil-nadu")
      .sha256,
    "7ae52226dde1e67884903819d48579305d100615bdad54712bbe5991332fe76d",
  );
  const stateSource = metadata.sources.find(
    (source) => source.id === "lgd-bharatmaps-india-states",
  );
  assert.match(
    stateSource.upstreamGovernmentService,
    /^https:\/\/mapservice.gov.in\//,
  );
  assert.match(stateSource.boundaryVintage, /not established/);
  assert.match(stateSource.boundaryScope, /disputed/);
  assert.equal(metadata.coverage.unsupportedWorldFeatures.length, 9);
  assert.deepEqual(
    metadata.coverage.unsupportedWorldFeatures
      .map((feature) => feature.id)
      .sort(),
    ["ATC", "CYN", "FRA", "IOA", "KAS", "KOS", "NOR", "SOL", "TWN"],
  );
});

let sourceRoot;
for (const candidate of [
  process.env.FIELDWORK_SOURCE_ROOT,
  resolve(".."),
  "/workspace/shared/investigation-board-redesign/app",
].filter(Boolean)) {
  try {
    await access(join(candidate, "src/data/investigation.ts"));
    sourceRoot = candidate;
    break;
  } catch {
    /* Try only known original source roots, never the network. */
  }
}
test(
  "crosswalk source files and all 36 state features match the original read-only inputs",
  {
    skip:
      !sourceRoot &&
      "Original source root unavailable; artifact hashes are checked separately",
  },
  async () => {
    const crosswalk = geo.NATIONAL_CONTEXT_PROVENANCE;
    for (const entry of crosswalk.entries) {
      assert.equal(
        hash(await readFile(join(sourceRoot, entry.sourcePath))),
        entry.sourceSha256,
        entry.namespace,
      );
      assert.ok(entry.rationale.length > 20);
    }
    for (const evidence of crosswalk.semanticEvidence)
      assert.equal(
        hash(await readFile(join(sourceRoot, evidence.path))),
        evidence.sha256,
        evidence.path,
      );
    const statesBytes = await readFile(
      join(
        sourceRoot,
        "src/components/investigation/assets/india-current36-wgs84.json",
      ),
    );
    assert.equal(
      hash(statesBytes),
      metadata.sources.find(
        (source) => source.id === "lgd-bharatmaps-india-states",
      ).sha256,
    );
    const states = JSON.parse(statesBytes);
    assert.deepEqual(cartography.INDIA_STATE_BOUNDARIES, states);
    for (const [key, value] of Object.entries(states.provenance))
      assert.deepEqual(
        metadata.sources.find(
          (source) => source.id === "lgd-bharatmaps-india-states",
        )[key],
        value,
      );
  },
);

test(
  "offline generator reproduces every artifact byte for byte and passes polygon/hole stress fixtures",
  { skip: !sourceRoot && "Original source root unavailable" },
  () => {
    const verify = spawnSync(
      "python3",
      [
        "scripts/build-geography-data.py",
        "--source-root",
        sourceRoot,
        "--world-source",
        join(temporary, "no-download.geojson"),
        "--check",
      ],
      { encoding: "utf8" },
    );
    assert.equal(verify.status, 0, `${verify.stdout}\n${verify.stderr}`);
    const algorithm = spawnSync(
      "python3",
      [
        "-c",
        `import importlib.util
s=importlib.util.spec_from_file_location('geo','scripts/build-geography-data.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
fixtures=[{'type':'Polygon','coordinates':[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[3,3],[7,3],[7,7],[3,7],[3,3]]]}, {'type':'Polygon','coordinates':[[[0,0],[10,0],[10,2],[2,2],[2,10],[0,10],[0,0]]]}, {'type':'MultiPolygon','coordinates':[[[[0,0],[1,0],[1,1],[0,1],[0,0]]],[[[10,10],[20,10],[20,20],[10,20],[10,10]]]]}]
for fixture in fixtures:
 p=g.representative(fixture);assert g.in_geometry(p,fixture);assert p==g.representative(fixture)
assert g.representative(fixtures[-1])[0]>10
`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(algorithm.status, 0, algorithm.stderr);
  },
);
