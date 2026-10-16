import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { loadOriginalRegistry } from "./original-registry.mjs";

const temporary = await mkdtemp(join(tmpdir(), "spatial-semantic-zoom-"));
after(() => rm(temporary, { recursive: true, force: true }));
async function loadTypescript(entryPoint, name) {
  const outfile = join(temporary, `${name}.mjs`);
  await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  return import(pathToFileURL(outfile).href);
}
const { buildEvidenceScene, buildPreview, factualScene, isHeldItem, LAYERS } =
  await loadTypescript("src/model.ts", "model");
const { planGeographicDisplay, MAX_THREAD_MESHES } = await loadTypescript(
  "src/displayBudget.ts",
  "display",
);
const {
  planSemanticDisplay,
  WORLD_STACK_ZOOM_THRESHOLD,
  MAX_WORLD_THREAD_MESHES,
} = await loadTypescript("src/semanticZoom.ts", "semantic");
const areaMetadata = JSON.parse(
  await readFile("src/assets/geography/evidence-area-anchors.json", "utf8"),
);
const original = await loadOriginalRegistry();
const complete = buildEvidenceScene(original);
const factual = factualScene(complete);
const originalSnapshot = createHash("sha256")
  .update(JSON.stringify(complete))
  .digest("hex");
const base = planGeographicDisplay(factual);
const world = planSemanticDisplay(factual, "", 1.5, base);
const detail = planSemanticDisplay(factual, "", 4, base);
const nodeById = new Map(factual.nodes.map((node) => [node.id, node]));
const edgeById = new Map(factual.edges.map((edge) => [edge.id, edge]));
const crossStateEdge = base.candidates.find(
  (edge) =>
    base.anchors.get(edge.from).precision === "state" &&
    base.anchors.get(edge.to).precision === "state",
);

function uniqueMembers(plan) {
  return new Set(
    [...plan.groups.values()].flatMap((group) =>
      group.records.map((node) => node.id),
    ),
  );
}
function countryForNode(plan, id) {
  return [...plan.countryStacks.values()].find((stack) =>
    stack.records.some((node) => node.id === id),
  )?.countryCode;
}
function makeEdge(id, from, to, layer = "funding") {
  const relationship = {
    ...original.relationships[0],
    id,
    from: from.id,
    to: to.id,
    layers: [layer],
    sourceIds: [original.sources[0].id],
  };
  return {
    id,
    relationship,
    from: relationship.from,
    to: relationship.to,
    sourceCount: 1,
  };
}

test("full corpus world summaries have exact distinct membership and area counts", () => {
  assert.equal(world.mode, "world");
  assert.deepEqual(world.counts, {
    placedMembers: 3856,
    unplacedMembers: 3997,
    areaGroups: 42,
    countryStacks: 6,
    displayedGroups: 6,
    selectedAreaDetails: 0,
    candidateEdges: 763,
    eligibleEdges: 4,
    renderedEdges: 3,
    suppressedSameCountryEdges: 759,
    omittedEligibleEdges: 1,
  });
  assert.deepEqual(
    [...world.countryStacks].map(([code, group]) => [
      code,
      group.memberCount,
      group.areaCount,
    ]),
    [
      ["IN", 3838, 37],
      ["BD", 8, 1],
      ["ES", 2, 1],
      ["RU", 2, 1],
      ["PH", 2, 1],
      ["US", 4, 1],
    ],
  );
  assert.equal(world.areaGroupCount, 42);
  assert.equal(uniqueMembers(world).size, 3856);
  assert.equal(
    [...world.countryStacks.values()].reduce(
      (sum, group) => sum + group.memberCount,
      0,
    ),
    3856,
  );
  for (const stack of world.countryStacks.values()) {
    assert.equal(stack.kind, "country-stack");
    assert.equal(stack.memberCount, stack.records.length);
    assert.equal(stack.areaCount, stack.areaCodes.length);
    assert.equal(new Set(stack.areaCodes).size, stack.areaCount);
    assert.deepEqual(
      stack.areaCodes,
      [...base.groups.keys()].filter((code) =>
        stack.records.some(
          (node) => base.anchors.get(node.id).areaCode === code,
        ),
      ),
    );
    assert.equal(stack.key, `country-stack:${stack.countryCode}`);
    assert.equal(world.groups.get(stack.key), stack);
    assert.equal(
      original.entities.some((entity) => entity.id === stack.key),
      false,
    );
    assert.equal(
      original.records.some((record) => record.id === stack.key),
      false,
    );
  }
});

test("world summary coordinates come exactly from verified country metadata, with no invented evidence citations", () => {
  for (const stack of world.countryStacks.values()) {
    const metadata = areaMetadata.find(
      (area) => area.code === stack.countryCode && area.precision === "country",
    );
    assert.ok(metadata);
    for (const key of [
      "lng",
      "lat",
      "uncertaintyKm",
      "geometrySourceId",
      "geometryFeatureId",
    ]) {
      assert.equal(stack.anchor[key], metadata[key], `${stack.key}: ${key}`);
    }
    assert.deepEqual(stack.anchor.bounds, metadata.bounds);
    assert.notEqual(stack.anchor.bounds, metadata.bounds);
    assert.equal(stack.countryLabel, metadata.name);
    assert.equal(stack.anchor.precision, "country");
    assert.equal(stack.anchor.representativeOnly, true);
    assert.match(stack.anchor.basis, /UI-only country stack/);
    assert.match(stack.anchor.label, /UI-only country stack/);
    assert.deepEqual(stack.anchor.sourceIds, []);
    assert.ok(stack.anchor.geometrySourceUrl.startsWith("https://"));
  }
  // State and national anchors remain their original separate objects/precision.
  assert.equal(world.anchors, base.anchors);
  assert.equal(world.areaGroups, base.groups);
  for (const [id, anchor] of base.anchors)
    assert.equal(world.anchors.get(id), anchor);
  assert.equal(world.areaGroups.get("IN-TN").anchor.precision, "state");
  assert.notEqual(
    world.countryStacks.get("IN").anchor,
    world.areaGroups.get("IN").anchor,
  );
});

test("area zoom restores all original area groups and existing deterministic 60-thread subset", () => {
  assert.equal(detail.mode, "areas");
  assert.equal(detail.groups.size, 42);
  assert.equal(detail.areaGroups, base.groups);
  assert.equal(detail.anchors, base.anchors);
  assert.equal(detail.candidates, base.candidates);
  assert.equal(detail.eligible, base.candidates);
  assert.deepEqual(detail.rendered, base.rendered);
  assert.equal(detail.rendered.length, MAX_THREAD_MESHES);
  assert.equal(detail.counts.suppressedSameCountryEdges, 0);
  assert.equal(detail.counts.selectedAreaDetails, 0);
  for (const [code, group] of detail.groups) {
    assert.equal(group.kind, "area");
    assert.equal(group.key, code);
    assert.equal(group.anchor, base.groups.get(code).anchor);
    assert.equal(group.records, base.groups.get(code).records);
    assert.deepEqual(group.areaCodes, [code]);
    assert.equal(group.memberCount, group.records.length);
  }
  assert.equal(uniqueMembers(detail).size, uniqueMembers(world).size);
});

test("preview world/detail counts and zoom boundary remain exact and repeatable", () => {
  const preview = buildPreview();
  const smallWorld = planSemanticDisplay(preview, "", 1.5);
  const smallDetail = planSemanticDisplay(
    preview,
    "",
    WORLD_STACK_ZOOM_THRESHOLD,
  );
  assert.deepEqual(smallWorld.counts, {
    placedMembers: 44,
    unplacedMembers: 4,
    areaGroups: 4,
    countryStacks: 3,
    displayedGroups: 3,
    selectedAreaDetails: 0,
    candidateEdges: 5,
    eligibleEdges: 3,
    renderedEdges: 2,
    suppressedSameCountryEdges: 2,
    omittedEligibleEdges: 1,
  });
  assert.deepEqual(
    [...smallWorld.countryStacks].map(([code, group]) => [
      code,
      group.memberCount,
      group.areaCount,
    ]),
    [
      ["IN", 34, 2],
      ["BD", 8, 1],
      ["ES", 2, 1],
    ],
  );
  assert.equal(smallDetail.mode, "areas");
  assert.equal(smallDetail.groups.size, 4);
  assert.equal(smallDetail.rendered.length, 3);
  assert.equal(
    planSemanticDisplay(preview, "", WORLD_STACK_ZOOM_THRESHOLD - 0.00001).mode,
    "world",
  );
  assert.equal(planSemanticDisplay(preview, "", 19).mode, "areas");
  for (const zoom of [NaN, Infinity, -Infinity])
    assert.equal(planSemanticDisplay(preview, "", zoom).mode, "world");
  assert.deepEqual(planSemanticDisplay(preview, "", 1.5), smallWorld);
  assert.deepEqual(planSemanticDisplay(preview, "", 4), smallDetail);
});

test("selected original cross-state edge survives world suppression with endpoints at their exact area anchors", () => {
  assert.ok(crossStateEdge);
  assert.equal(world.eligible.includes(crossStateEdge), false);
  const focused = planSemanticDisplay(factual, crossStateEdge.id, 1.5, base);
  assert.equal(focused.rendered[0], crossStateEdge);
  assert.equal(focused.rendered[0].relationship, crossStateEdge.relationship);
  assert.equal(focused.eligible.includes(crossStateEdge), true);
  assert.equal(focused.candidates, base.candidates);
  assert.equal(focused.counts.selectedAreaDetails, 2);
  assert.equal(focused.groups.size, 8);
  for (const endpoint of [crossStateEdge.from, crossStateEdge.to]) {
    const anchor = base.anchors.get(endpoint);
    const group = focused.groups.get(`selected-area:${anchor.areaCode}`);
    assert.ok(group);
    assert.equal(group.kind, "selected-area");
    assert.equal(group.anchor, anchor);
    assert.equal(group.records, base.groups.get(anchor.areaCode).records);
    assert.ok(group.records.includes(nodeById.get(endpoint)));
    assert.ok(group.selectedIds.includes(endpoint));
    assert.equal(focused.anchors.get(endpoint), anchor);
  }
  const india = focused.countryStacks.get("IN");
  assert.equal(
    india.memberCount,
    3838,
    "selected details remain included in the full stack count",
  );
  assert.equal(india.areaCount, 37);
  assert.equal(
    focused.counts.placedMembers,
    3856,
    "detail overlays do not add new members",
  );
  assert.equal(uniqueMembers(focused).size, 3856);
  assert.equal(focused.counts.eligibleEdges, world.counts.eligibleEdges + 1);
  assert.equal(
    focused.counts.suppressedSameCountryEdges,
    world.counts.suppressedSameCountryEdges - 1,
  );
  assert.equal(focused.rendered[0].from, crossStateEdge.relationship.from);
  assert.equal(focused.rendered[0].to, crossStateEdge.relationship.to);
});

test("a selected node gets a retained-area detail; same-area relationships never invent a loop or extra location", () => {
  const node = base.groups.get("IN-TN").records.at(-1);
  const selectedNode = planSemanticDisplay(factual, node.id, 1.5, base);
  const nodeGroup = selectedNode.groups.get("selected-area:IN-TN");
  assert.equal(nodeGroup.anchor, base.anchors.get(node.id));
  assert.deepEqual(nodeGroup.selectedIds, [node.id]);
  assert.equal(selectedNode.counts.selectedAreaDetails, 1);
  assert.deepEqual(selectedNode.rendered, world.rendered);
  const sameAreaEdge = factual.edges.find(
    (edge) =>
      base.anchors.has(edge.from) &&
      base.anchors.has(edge.to) &&
      base.anchors.get(edge.from).areaCode ===
        base.anchors.get(edge.to).areaCode &&
      edge.from !== edge.to,
  );
  assert.ok(sameAreaEdge);
  const focused = planSemanticDisplay(factual, sameAreaEdge.id, 1.5, base);
  assert.equal(focused.rendered.includes(sameAreaEdge), false);
  assert.equal(focused.counts.selectedAreaDetails, 1);
  const group = focused.groups.get(
    `selected-area:${base.anchors.get(sameAreaEdge.from).areaCode}`,
  );
  assert.deepEqual(
    new Set(group.selectedIds),
    new Set([sameAreaEdge.from, sameAreaEdge.to]),
  );
  assert.equal(group.anchor.lng, base.anchors.get(sameAreaEdge.from).lng);
  assert.equal(group.anchor.lng, base.anchors.get(sameAreaEdge.to).lng);
  assert.equal(focused.counts.placedMembers, world.counts.placedMembers);
});

test("world threads remain original directed edges, with no routing to summary anchors or union of sources", () => {
  assert.equal(world.candidates, base.candidates);
  for (const edge of [
    ...world.candidates,
    ...world.eligible,
    ...world.rendered,
  ]) {
    assert.equal(edge, edgeById.get(edge.id));
    assert.equal(
      edge.relationship,
      original.relationships.find((item) => item.id === edge.id),
    );
    assert.equal(edge.from, edge.relationship.from);
    assert.equal(edge.to, edge.relationship.to);
    assert.equal(edge.sourceCount, new Set(edge.relationship.sourceIds).size);
    assert.equal(world.anchors.get(edge.from), base.anchors.get(edge.from));
    assert.equal(world.anchors.get(edge.to), base.anchors.get(edge.to));
  }
  for (const edge of world.eligible)
    assert.notEqual(
      countryForNode(world, edge.from),
      countryForNode(world, edge.to),
    );
  assert.equal(
    world.counts.eligibleEdges + world.counts.suppressedSameCountryEdges,
    world.counts.candidateEdges,
  );
  assert.equal(
    world.counts.renderedEdges + world.counts.omittedEligibleEdges,
    world.counts.eligibleEdges,
  );
  assert.match(
    world.threadSummary,
    /3 displayed of 763 cross-area relationships/,
  );
  assert.match(world.threadSummary, /Displayed subset only/);
  assert.match(
    world.threadSummary,
    /all original evidence remains available in the reader/,
  );
});

test("world selection keeps a deduplicated cross-country edge without changing its identity or counts", () => {
  const omitted = world.eligible.find((edge) => !world.rendered.includes(edge));
  assert.ok(omitted);
  const focused = planSemanticDisplay(factual, omitted.id, 1.5, base);
  assert.equal(focused.rendered[0], omitted);
  assert.equal(focused.counts.candidateEdges, 763);
  assert.equal(focused.counts.eligibleEdges, 4);
  assert.equal(focused.counts.renderedEdges, 3);
  assert.equal(focused.counts.placedMembers, world.counts.placedMembers);
  assert.deepEqual(
    planSemanticDisplay(factual, "not-an-original-id", 1.5, base).rendered,
    world.rendered,
  );
});

test("deterministic world budget preserves directed pairs, first layers and selected overflow edges", () => {
  const nodes = [...world.countryStacks.values()].map(
    (stack) => stack.records[0],
  );
  const edges = [];
  for (const from of nodes)
    for (const to of nodes)
      if (from !== to)
        for (const layer of LAYERS) {
          edges.push(
            makeEdge(`test-only:${edges.length}`, from, to, layer.value),
          );
        }
  const data = { ...factual, nodes, edges };
  const first = planSemanticDisplay(data, "", 1.5);
  assert.equal(MAX_WORLD_THREAD_MESHES, 24);
  assert.equal(first.rendered.length, MAX_WORLD_THREAD_MESHES);
  assert.equal(
    first.candidates.length,
    nodes.length * (nodes.length - 1) * LAYERS.length,
  );
  assert.deepEqual(first.rendered, edges.slice(0, MAX_WORLD_THREAD_MESHES));
  assert.deepEqual(planSemanticDisplay(data, "", 1.5), first);
  const selected = edges.at(-1);
  const focused = planSemanticDisplay(data, selected.id, 1.5);
  assert.equal(focused.rendered[0], selected);
  assert.equal(focused.rendered.length, MAX_WORLD_THREAD_MESHES);
  assert.deepEqual(
    focused.rendered.slice(1),
    edges.slice(0, MAX_WORLD_THREAD_MESHES - 1),
  );
  const duplicate = makeEdge("test-only:duplicate", nodes[0], nodes[1]);
  const forward = makeEdge("test-only:forward", nodes[0], nodes[1]);
  const reverse = makeEdge("test-only:reverse", nodes[1], nodes[0]);
  const otherLayer = makeEdge("test-only:legal", nodes[0], nodes[1], "legal");
  const small = {
    ...factual,
    nodes,
    edges: [forward, duplicate, reverse, otherLayer],
  };
  assert.deepEqual(planSemanticDisplay(small, "", 1.5).rendered, [
    forward,
    reverse,
    otherLayer,
  ]);
  assert.deepEqual(planSemanticDisplay(small, duplicate.id, 1.5).rendered, [
    duplicate,
    reverse,
    otherLayer,
  ]);
  assert.deepEqual(forward.relationship.sourceIds, [original.sources[0].id]);
});

test("held and not-drawn data never enter summaries, selected overlays or threads; full reader is unchanged", () => {
  const fromUnfiltered = planSemanticDisplay(complete, "", 1.5);
  assert.deepEqual(fromUnfiltered, planSemanticDisplay(factual, "", 1.5));
  for (const group of fromUnfiltered.groups.values())
    for (const node of group.records) {
      assert.equal(isHeldItem(original, node.id), false);
      assert.notEqual(node.item.status, "not-drawn");
    }
  const heldRecord = complete.nodes.find((node) =>
    isHeldItem(original, node.id),
  );
  assert.ok(heldRecord);
  const heldSelection = planSemanticDisplay(complete, heldRecord.id, 1.5);
  assert.equal(heldSelection.counts.selectedAreaDetails, 0);
  assert.equal(heldSelection.anchors.has(heldRecord.id), false);
  const from = base.groups.get("IN").records[0],
    to = base.groups.get("BD").records[0];
  const heldEdge = makeEdge("test-only:held-edge", from, to);
  const notDrawn = makeEdge("test-only:not-drawn-edge", from, to);
  notDrawn.relationship.status = "not-drawn";
  const changedRegistry = {
    ...original,
    held: [...original.held, { id: heldEdge.id }],
  };
  const changed = {
    ...factual,
    nodes: [from, to],
    edges: [heldEdge, notDrawn],
    registry: changedRegistry,
  };
  const unsafeBase = planGeographicDisplay(changed);
  assert.equal(unsafeBase.candidates.length, 2);
  const safe = planSemanticDisplay(changed, heldEdge.id, 1.5, unsafeBase);
  assert.equal(safe.rendered.length, 0);
  assert.equal(safe.candidates.length, 0);
  assert.equal(safe.counts.selectedAreaDetails, 0);
  assert.equal(original.held.length, 316);
  assert.equal(original.records.length, 5617);
  assert.equal(complete.registry, original);
  assert.equal(complete.nodes.length, 8086);
});

test("unplaced and ambiguous evidence is never assigned to a country stack", () => {
  const unplaced = factual.nodes.filter((node) => !base.anchors.has(node.id));
  assert.equal(unplaced.length, 3997);
  const result = planSemanticDisplay(
    { ...factual, nodes: unplaced, edges: [] },
    unplaced[0].id,
    1.5,
  );
  assert.equal(result.groups.size, 0);
  assert.equal(result.countryStacks.size, 0);
  assert.equal(result.anchors.size, 0);
  assert.equal(result.counts.placedMembers, 0);
  assert.equal(result.counts.unplacedMembers, 3997);
  assert.equal(result.counts.selectedAreaDetails, 0);
});

test("display-only positions cannot change country membership, retained anchors or original threads", () => {
  const changed = {
    ...factual,
    nodes: factual.nodes.map((node, index) => ({
      ...node,
      position: [1000 + index, -50, 500 - index],
      cluster: `test-only:${index}`,
    })),
  };
  const result = planSemanticDisplay(changed, "", 1.5);
  assert.deepEqual(result.anchors, world.anchors);
  assert.deepEqual(result.rendered, world.rendered);
  assert.deepEqual(result.counts, world.counts);
  for (const [code, stack] of result.countryStacks) {
    assert.deepEqual(stack.anchor, world.countryStacks.get(code).anchor);
    assert.deepEqual(stack.areaCodes, world.countryStacks.get(code).areaCodes);
    assert.deepEqual(
      stack.records.map((node) => node.id),
      world.countryStacks.get(code).records.map((node) => node.id),
    );
  }
});

test("all returned evidence members preserve original object references and no source object is mutated", () => {
  for (const plan of [
    world,
    detail,
    planSemanticDisplay(factual, crossStateEdge.id, 1.5, base),
  ]) {
    for (const group of [
      ...plan.groups.values(),
      ...plan.countryStacks.values(),
    ])
      for (const node of group.records) {
        assert.equal(node, nodeById.get(node.id));
        assert.equal(node.item, nodeById.get(node.id).item);
        assert.equal(node.item.geography, nodeById.get(node.id).item.geography);
        assert.equal(node.item.sourceIds, nodeById.get(node.id).item.sourceIds);
      }
    for (const edge of plan.rendered) assert.equal(edge, edgeById.get(edge.id));
  }
  assert.equal(
    createHash("sha256").update(JSON.stringify(complete)).digest("hex"),
    originalSnapshot,
  );
});
