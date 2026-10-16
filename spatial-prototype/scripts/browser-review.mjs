/** CI-only behavioral review. Deliberately never starts a local browser. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { build } from "esbuild";
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { runSectorBrowserCases } from "./sector-browser-review.mjs";
import { measureReaderLayout, exerciseReaderScroll } from "./reader-layout-review.mjs";
import { expectedHistoricalReview } from "./browser-review-mode.mjs";
import { runSourceCorrectionBrowserCases } from "./source-correction-browser.mjs";
import { runCaseWorkspaceBrowserCases } from "./case-workspace-browser.mjs";
import { runCaseGraphicsBrowserCases } from "./case-graphics-browser.mjs";

if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.SPATIAL_BROWSER_REVIEW !== "github-actions"
) {
  throw new Error(
    "Browser review is restricted to the GitHub Actions workflow. No local browser was launched.",
  );
}

// The next-release default build has the reader gate; positive coverage cannot be skipped.
const expectHistoricalReview = expectedHistoricalReview(process.env.SPATIAL_EXPECT_HISTORICAL_REVIEW);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = await realpath(join(root, "dist"));
const output = join(root, "browser-review");
const prefix = "/india-corporate-intelligence/spatial/";
const viewport = { width: 1440, height: 1000 };
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), "spatial-browser-review-"));
const report = {
  startedAt: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? null,
  headCommit: process.env.SPATIAL_HEAD_SHA ?? null,
  expectedHistoricalReview: expectHistoricalReview,
  viewport,
  basePath: prefix,
  renderer: "Chromium / ANGLE SwiftShader (CI software rendering)",
  reviewLabel:
    "qualified historical and sector readers with atlas tutorial · Graph/paths: PUBLIC_GRAPH_BLOCKED",
  scope:
    "Behavior and review captures, not pixel approval, a hardware benchmark, or a deployment.",
  scenarios: [],
  serverRequests: [],
};
let browser;
let server;
let origin;
let model;
let geography;
let mapStyle;
let preview;
let trailEdge;
let fullRegistry;
let fullScene;
let registryManifest;
let heavyAssetNames;
let spatialAssetName;
let displayBudget;
let semanticZoom;
let historical;
let historicalOverlay;
let historicalAdditionsText;
let historicalPayloadAsset;
let historicalPanelAsset;
let historicalGateAsset;
let atlasGuide;
const atlasGuideHash =
  "c9cef1fb5f5cded79795573808a5c958e2cdfa092b3567700d89781a3706dfd4";
const atlasTutorialKey = "fieldwork-guide:v2:atlas-source-reading-v2";
const tutorialDialog = (page) => page.locator("dialog.field-guide");
const tutorialHelp = (page) => page.locator('[data-guide-launcher="atlas"]');
const historicalDeferredAssets = new Set();
// Independent retained-packet anchors: never infer expectations from rendered text.
const historicalReference = Object.freeze({
  baseSha256:
    "048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064",
  additionsSha256:
    "5cd5c36de9dd98609c948cf526595a175f30fd29457fa1c7db9cf29b978eaf45",
  provenanceSha256:
    "7ad1b6269af516d7f88dbee5687a6f3ba2cd0ac2f3b97318931d248c382eebf0",
  counts: { entities: 2469, records: 5617, relationships: 4203, sources: 3314 },
});
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const historicalGate = (page) =>
  page.getByRole("complementary", { name: "Optional historical review" });
const historicalDialog = (page) =>
  page.getByRole("dialog", { name: "Issuer-reported ownership at 2025-12-31" });
const assetRequests = (result, names, offset = 0) =>
  result.requests
    .slice(offset)
    .filter((url) => names.has(new URL(url).pathname.split("/").at(-1)));

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".gltf": "model/gltf+json",
  ".glb": "model/gltf-binary",
};

async function startServer() {
  server = createServer(async (request, response) => {
    const entry = { method: request.method, url: request.url, status: 500 };
    report.serverRequests.push(entry);
    const send = (status, text) => {
      entry.status = status;
      response.writeHead(status, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(text);
    };
    try {
      if (!["GET", "HEAD"].includes(request.method))
        return send(405, "Read-only preview");
      // Decode before checking segments; no SPA catch-all can hide broken asset paths.
      const pathname = decodeURIComponent((request.url ?? "/").split("?")[0]);
      if (
        pathname.includes("\0") ||
        pathname.includes("\\") ||
        pathname.split("/").some((part) => part === ".." || part === ".")
      )
        return send(403, "Forbidden path");
      if (!pathname.startsWith(prefix))
        return send(404, "Outside the isolated preview");
      const suffix = pathname.slice(prefix.length) || "index.html";
      const candidate = resolve(dist, suffix);
      const outside = (target) => {
        const path = relative(dist, target);
        return path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path);
      };
      if (outside(candidate)) return send(403, "Forbidden path");
      const canonical = await realpath(candidate);
      if (outside(canonical)) return send(403, "Forbidden path");
      const info = await stat(canonical);
      if (!info.isFile()) return send(404, "Not a file");
      entry.status = 200;
      response.writeHead(200, {
        "Content-Type": mime[extname(canonical)] ?? "application/octet-stream",
        "Content-Length": info.size,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      if (request.method === "HEAD") return response.end();
      createReadStream(canonical)
        .on("error", () => response.destroy())
        .pipe(response);
    } catch (error) {
      send(
        error instanceof URIError ? 400 : error.code === "ENOENT" ? 404 : 500,
        "Preview request failed",
      );
    }
  });
  await new Promise((resolveReady, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveReady);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
}

async function until(check, message, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await delay(75);
  }
  throw new Error(message);
}
const normalized = (value) => value.replace(/\s+/gu, " ").trim();
const inspector = (page) =>
  page.getByRole("complementary", { name: "Evidence reading panel" });
const journey = (page) => page.getByRole("region", { name: "Camera journey" });

async function assertCameraControlsClearOfReader(page) {
  const controls = page.getByRole("complementary", { name: "Camera controls" });
  await controls.waitFor({ state: "visible" });
  await inspector(page).waitFor({ state: "visible" });
  await until(async () => {
    const toolbar = await controls.boundingBox();
    const reader = await inspector(page).boundingBox();
    return Boolean(
      toolbar &&
      reader &&
      (toolbar.x + toolbar.width <= reader.x ||
        reader.x + reader.width <= toolbar.x ||
        toolbar.y + toolbar.height <= reader.y ||
        reader.y + reader.height <= toolbar.y),
    );
  }, "Camera controls overlap the open evidence reading panel");
}

async function capture(page, result, name) {
  const filename = `${result.name}--${name}.png`;
  const layout = await page.evaluate(() => ({
    stylesheets: [...document.styleSheets].map((sheet) => sheet.href),
    mapState: document.querySelector(".webgl-host")
      ? { ...document.querySelector(".webgl-host").dataset }
      : null,
    rectangles: Object.fromEntries(
      [
        ".webgl-host",
        ".webgl-host canvas",
        ".historical-review-dialog",
        ".historical-review-content",
      ].map((selector) => {
        const element = document.querySelector(selector);
        const style = element ? getComputedStyle(element) : null;
        return [
          selector,
          element
            ? {
                ...element.getBoundingClientRect().toJSON(),
                position: style.position,
                cssWidth: style.width,
                cssHeight: style.height,
              }
            : null,
        ];
      }),
    ),
  }));
  (result.layoutSamples ??= []).push({ capture: name, ...layout });
  await page.screenshot({
    path: join(output, filename),
    fullPage: true,
    timeout: 10000,
  });
  result.screenshots.push(filename);
}

async function assertSpatial(page) {
  await until(
    async () => {
      const alert = page.getByRole("alert");
      if (
        (await alert.count()) &&
        /3D is unavailable/.test(await alert.first().innerText())
      ) {
        throw new Error(
          `Spatial rendering fell back to reading mode: ${await alert.first().innerText()}`,
        );
      }
      return page.evaluate(() => {
        const host = document.querySelector(".webgl-host");
        const canvas = host?.querySelector("canvas");
        const hostRect = host?.getBoundingClientRect();
        const canvasRect = canvas?.getBoundingClientRect();
        return Boolean(
          canvas &&
          canvas.width > 0 &&
          canvas.height > 0 &&
          hostRect &&
          canvasRect &&
          hostRect.width >= innerWidth * 0.9 &&
          hostRect.height >= innerHeight * 0.9 &&
          canvasRect.width >= hostRect.width - 4 &&
          canvasRect.height >= hostRect.height - 4 &&
          hostRect.x >= -2 &&
          hostRect.y >= -2 &&
          hostRect.right <= innerWidth + 2 &&
          hostRect.bottom <= innerHeight + 2 &&
          host?.dataset.renderer === "maplibre-three-mercator" &&
          window.__spatialReviewGraphics.drawCalls > 0,
        );
      });
    },
    "No viewport-sized visible host/canvas with successful MapLibre/Three draws was observed",
    30000,
  );
  assert.equal(
    await page
      .getByRole("region", { name: "Accessible record reading mode" })
      .count(),
    0,
  );
}

async function assertCountryBase(page) {
  await until(
    async () =>
      Number(
        await page
          .locator(".webgl-host")
          .getAttribute("data-country-base-features"),
      ) > 0,
    "Independent country-base geometry was not reported before the world overview capture",
    30000,
  );
}

async function assertSemanticDisplay(page, result, data, selected, mode) {
  let expected;
  let state;
  await until(async () => {
    state = await page
      .locator(".webgl-host")
      .evaluate((element) => ({ ...element.dataset }));
    const zoom = Number(state.zoom);
    if (!Number.isFinite(zoom)) return false;
    expected = semanticZoom.planSemanticDisplay(data, selected, zoom);
    return (
      (!mode || expected.mode === mode) &&
      state.semanticMode === expected.mode &&
      Number(state.areaGroups) === expected.areaGroupCount &&
      Number(state.displayGroups) === expected.groups.size &&
      Number(state.countryStacks) === expected.countryStacks.size &&
      Number(state.selectedEndpointGroups) ===
        expected.counts.selectedAreaDetails &&
      Number(state.eligibleThreads) === expected.candidates.length &&
      Number(state.renderedThreads) === expected.rendered.length &&
      state.renderedEdgeIds ===
        JSON.stringify(expected.rendered.map((edge) => edge.id))
    );
  }, "Semantic groups, selected endpoint details or original edge IDs differ from the retained planner");
  const originalEdges = new Map(data.edges.map((edge) => [edge.id, edge]));
  assert.ok(
    expected.rendered.every((edge) => originalEdges.get(edge.id) === edge),
  );
  const cap =
    expected.mode === "world"
      ? semanticZoom.MAX_WORLD_THREAD_MESHES
      : displayBudget.MAX_THREAD_MESHES;
  assert.ok(expected.rendered.length <= cap);
  if (expected.candidates.some((edge) => edge.id === selected)) {
    assert.equal(
      expected.rendered[0]?.id,
      selected,
      "The selected original relationship must survive the representative display cap",
    );
  }
  (result.semanticSamples ??= []).push({
    selected,
    mode: expected.mode,
    zoom: Number(state.zoom),
    counts: expected.counts,
    renderedEdgeIds: JSON.parse(state.renderedEdgeIds),
    sourceSnapshotSha256:
      data === fullScene ? registryManifest.sourceSnapshot.sha256 : undefined,
  });
  return expected;
}

async function expandIndiaStack(page, expected) {
  const india = expected.countryStacks.get("IN");
  assert.ok(india, "The retained registry has no India country stack");
  const label = `${india.countryLabel} stack · ${india.memberCount} items · ${india.areaCount} areas · Expand`;
  const button = page.getByRole("button", { name: label, exact: true });
  assert.equal(await button.getAttribute("data-label-kind"), "stack");
  await button.click();
  await until(async () => {
    const state = await page
      .locator(".webgl-host")
      .evaluate((element) => ({ ...element.dataset }));
    return (
      state.semanticMode === "areas" && Math.abs(Number(state.zoom) - 4) < 0.06
    );
  }, "India stack did not expand into the original area groups at zoom 4");
}

async function assertCounts(page, filters = {}, base = preview) {
  const lenses = {
    fromYear: base.yearRange[0],
    toYear: base.yearRange[1],
    includeUndated: true,
    ...filters,
  };
  const expected = model.filterScene(base, lenses);
  const factual = model.filterScene(model.factualScene(base), lenses);
  const geographic = geography.getGeographicScene(factual);
  await until(async () => {
    const data = await page
      .locator(".evidence-app")
      .evaluate((element) => ({ ...element.dataset }));
    return (
      Number(data.filteredItems) === expected.nodes.length &&
      Number(data.factualItems) === factual.nodes.length &&
      Number(data.unplacedItems) === geographic.unplacedNodes.length
    );
  }, "Displayed item, factual-map and unplaced totals differ from the retained model");
  const overview = normalized(
    await page.locator(".scene-overview p").innerText(),
  );
  assert.ok(
    overview.includes(
      `${expected.nodes.length.toLocaleString("en-US")} searchable items`,
    ),
  );
  assert.ok(
    overview.includes(
      `${geographic.nodes.length.toLocaleString("en-US")} area-anchored`,
    ),
  );
  assert.ok(
    overview.includes(
      `${geographic.unplacedNodes.length.toLocaleString("en-US")} unplaced`,
    ),
  );
  const heldIds = new Set(base.registry.held.map((row) => row.id));
  const readerOnly = expected.nodes.filter(
    (node) => model.isHeldItem(base.registry, node.id) || node.item.status === "not-drawn",
  ).length;
  assert.ok(
    overview.includes(
      `${readerOnly.toLocaleString("en-US")} records are reader-only`,
    ),
  );
  assert.ok(
    overview.includes(
      `Separate review queue: ${base.registry.held.length} held entries`,
    ),
  );
  if (await page.locator(".webgl-host").count()) {
    await until(async () => {
      const data = await page
        .locator(".webgl-host")
        .evaluate((element) => ({ ...element.dataset }));
      return (
        Number(data.placedPins) === geographic.nodes.length &&
        Number(data.unplacedPins) === geographic.unplacedNodes.length
      );
    }, "Rendered placement counts differ from source-qualified geography");
  }
  const actualTitles = await page
    .locator("#record-list > button")
    .allTextContents();
  if (await page.locator(".accessible-node-list").count()) {
    assert.deepEqual(
      actualTitles.slice(1).map(normalized),
      expected.nodes.slice(0, 40).map((node) => node.title),
    );
    assert.match(
      normalized(actualTitles[0]),
      /Open searchable keyboard reader for all/,
    );
  }
  return expected;
}

async function assertProvenance(page, item, registry = model.registry) {
  const panel = inspector(page);
  await panel.waitFor({ state: "visible" });
  assert.equal(
    await panel.getByRole("heading", { level: 2 }).innerText(),
    item.title ?? item.label,
  );
  assert.equal(
    normalized(await panel.locator(".lead-summary").innerText()),
    normalized(item.summary),
  );
  assert.ok(
    normalized(await panel.locator(".evidence-tags").innerText())
      .toLowerCase()
      .includes(`${new Set(item.sourceIds).size} distinct source ids`),
    "Visible source count differs from the retained distinct source IDs",
  );
  assert.ok((await panel.innerText()).includes(registry.updatedAt));
  const sourceIds = [
    ...new Set([
      ...item.sourceIds,
      ...item.geography.flatMap((geo) => geo.sourceIds),
    ]),
  ];
  assert.equal(await panel.locator(".source-card").count(), sourceIds.length);
  for (const [index, id] of sourceIds.entries()) {
    const source = registry.sources.find((source) => source.id === id);
    assert.ok(source, `Retained source ID missing: ${id}`);
    const card = panel.locator(".source-card").nth(index);
    assert.equal(
      await card.getByRole("link").getAttribute("href"),
      source.url,
      `${id}: source URL`,
    );
    assert.equal(
      await card.getByRole("link").innerText(),
      source.title,
      `${id}: source title`,
    );
    assert.equal(
      normalized(await card.locator("small").innerText()),
      normalized(source.locator),
      `${id}: source locator`,
    );
    assert.ok(
      (await card.locator("p").innerText()).includes(source.publisher),
      `${id}: publisher`,
    );
  }
  if ("dateBasis" in item)
    assert.equal(
      normalized(
        await panel.getByText(item.dateBasis, { exact: true }).innerText(),
      ),
      normalized(item.dateBasis),
    );
  for (const limitation of item.limitations)
    assert.ok(
      normalized(await panel.innerText()).includes(normalized(limitation)),
    );
  assert.match(
    await panel.locator(".interpretation-limit").innerText(),
    /does not establish influence, causation or misconduct/,
  );
}

async function assertFullLoad(page, result) {
  await page
    .locator('[data-registry-dataset="full"][data-registry-state="ready"]')
    .waitFor({ timeout: 45000 });
  const app = page.locator('.evidence-app[data-dataset="full"]');
  await app.waitFor();
  for (const key of ["entities", "records", "relationships", "sources"]) {
    assert.equal(
      Number(await app.getAttribute(`data-loaded-${key}`)),
      registryManifest.counts[key],
      `Loaded ${key} differs from the complete snapshot`,
    );
  }
  assert.equal(Number(await app.getAttribute("data-held-count")), 316);
  const expectedPaths = registryManifest.arrays.flatMap((group) =>
    group.chunks.map((chunk) => `${prefix}data/registry/${chunk.file}`),
  );
  const loaded = new Set(
    result.responses
      .filter(
        (response) =>
          response.status === 200 && response.url.startsWith(origin),
      )
      .map((response) => new URL(response.url).pathname),
  );
  assert.equal(expectedPaths.length, 96);
  for (const path of expectedPaths)
    assert.ok(
      loaded.has(path),
      `A declared full-registry chunk was never successfully fetched: ${path}`,
    );
  assert.equal(
    new URL(page.url()).searchParams.has("dataset"),
    false,
    "The default route silently selected the preview",
  );
  await assertCounts(page, {}, fullScene);
}

async function assertReaderOnly(page, result) {
  assert.equal(await page.locator(".webgl-host canvas").count(), 0);
  const graphics = await page.evaluate(() => window.__spatialReviewGraphics);
  assert.equal(graphics.drawCalls, 0);
  assert.deepEqual(
    graphics.contexts,
    [],
    "Reading-only entry created a WebGL context",
  );
  assert.deepEqual(
    result.requests.filter((url) =>
      heavyAssetNames.has(new URL(url).pathname.split("/").at(-1)),
    ),
    [],
    "Reading-only entry fetched deferred Three/MapLibre rendering JavaScript",
  );
}

async function readerView(page, view, count) {
  const reader = page.locator(".registry-reader");
  await until(
    async () =>
      (await reader.getAttribute("data-reader-view")) === view &&
      Number(await reader.getAttribute("data-result-count")) === count,
    `Reader ${view} total did not become ${count}`,
  );
  return reader;
}

async function assertHistoricalBaseUnchanged(page, result, phase) {
  await assertFullLoad(page, result);
  assert.equal(
    await page.locator(".evidence-app").count(),
    1,
    "Review must not replace or duplicate the base atlas",
  );
  const data = await page
    .locator(".evidence-app")
    .evaluate((element) => ({ ...element.dataset }));
  for (const key of Object.keys(historicalReference.counts)) {
    assert.equal(
      Number(data[`loaded${key[0].toUpperCase()}${key.slice(1)}`]),
      fullRegistry[key].length,
    );
  }
  assert.equal(
    Number(data.heldCount),
    fullRegistry.held.length,
    "Review holds leaked into the base reader",
  );
  const originalIds = new Set(
    [
      ...fullRegistry.entities,
      ...fullRegistry.records,
      ...fullRegistry.relationships,
    ].map((row) => row.id),
  );
  for (const id of await page
    .locator(".evidence-app [data-record-id]")
    .evaluateAll((rows) => rows.map((row) => row.dataset.recordId))) {
    assert.ok(
      originalIds.has(id),
      `Non-original evidence was admitted into the base reader: ${id}`,
    );
  }
  if (await page.locator(".webgl-host").count()) {
    // The retained App initializes selection to the first original node even
    // while its inspector is closed. Keep the same baseline as case 12 rather
    // than falsely expecting no selected endpoint detail behind this overlay.
    const display = await assertSemanticDisplay(
      page,
      result,
      fullScene,
      fullScene.nodes[0].id,
    );
    const originalEdges = new Set(
      fullRegistry.relationships.map((row) => row.id),
    );
    assert.ok(display.rendered.every((edge) => originalEdges.has(edge.id)));
  }
  (result.historicalBaseSamples ??= []).push({
    phase,
    ...data,
    sourceSnapshotSha256: historicalReference.baseSha256,
  });
}

async function assertHistoricalReader(page, result) {
  const dialog = historicalDialog(page);
  await dialog.waitFor({ state: "visible", timeout: 30000 });
  assert.equal(
    await dialog.evaluate(
      (element) => element.open && element.matches(":modal"),
    ),
    true,
  );
  const content = dialog.locator(
    '[data-historical-review="reader-admitted"][data-reader-admission="READER_ADMITTED"][data-public-graph="blocked"][data-public-paths="blocked"]',
  );
  assert.equal(await content.count(), 1);
  const text = normalized(await content.innerText());
  for (const qualification of [
    "PUBLIC_GRAPH_BLOCKED",
    "Reader admission and retained graph/path holds",
    "verbatim historical provenance",
    "Same-issuer materials are dependent, not independent corroboration",
    "No current ownership or independent registry certification is established",
    "No payment flow, award influence, wrongdoing or propagated control is established",
    "Ownership percentages are interests, not financial amounts",
    "it does not propagate through Rijn’s minority Ferrovial stake",
    "Validity endpoints remain unknown",
    "independent of the base atlas’s event-year filter",
    "not merged with Fairfax Financial, Fairfax Media or a name match",
    "IRB reuses the exact existing entity unchanged; it is not the Private InvIT",
    "No addresses, coordinates, operational locations, buildings or project coverage have been added",
  ])
    assert.ok(
      text.includes(qualification),
      `Missing visible qualification: ${qualification}`,
    );
  const displayedBaseCounts = [
    "entities",
    "records",
    "relationships",
    "sources",
  ]
    .map((key) => `${fullRegistry[key].length.toLocaleString("en-US")} ${key}`)
    .join(" · ");
  assert.ok(
    text.includes(`The base graph remains unchanged: ${displayedBaseCounts}`),
    "Historical introduction does not display the exact verified base counts",
  );
  const displayedReviewCounts = [
    "entities",
    "records",
    "relationships",
    "sources",
  ]
    .map((key) =>
      historicalOverlay.readerRegistry[key].length.toLocaleString("en-US"),
    )
    .join(" / ");
  assert.ok(
    text.includes(displayedReviewCounts),
    "Historical introduction does not display the separately verified reader counts",
  );
  const { additions, provenance, reusedEntity } = historicalOverlay;
  const sources = new Map(
    additions.sources.map((source) => [source.id, source]),
  );
  const provenanceById = new Map(provenance.map((row) => [row.sourceId, row]));
  const entities = new Map(
    [...additions.entities, reusedEntity].map((row) => [row.id, row]),
  );
  const claims = content.locator("[data-review-relationship]");
  assert.deepEqual(
    await claims.evaluateAll((rows) =>
      rows.map((row) => row.dataset.reviewRelationship),
    ),
    additions.relationships.map((row) => row.id),
  );
  assert.equal(await claims.count(), 9);
  result.historicalClaims = [];
  for (const edge of additions.relationships) {
    const claim = content.locator(
      `[data-review-relationship=${JSON.stringify(edge.id)}]`,
    );
    const record = additions.records.find(
      (row) => row.id === edge.recordIds[0],
    );
    assert.equal(await claim.getAttribute("data-review-record"), record.id);
    assert.equal(
      normalized(await claim.getByRole("heading", { level: 3 }).innerText()),
      `${entities.get(edge.from).label} → ${entities.get(edge.to).label}`,
    );
    const claimText = normalized(await claim.innerText());
    for (const value of [
      record.originalId,
      record.response,
      edge.label,
      edge.summary,
      edge.dateBasis,
      ...edge.limitations,
      ...edge.alternativeExplanations,
      edge.falsifier,
    ]) {
      assert.ok(
        claimText.includes(normalized(value)),
        `${edge.id}: omitted exact retained wording: ${value}`,
      );
    }
    assert.ok(
      claimText.includes(
        `${historicalOverlay.snapshot} · issuer-reported · self-reported · reader admitted · Graph/paths: PUBLIC_GRAPH_BLOCKED`,
      ),
    );
    assert.equal(edge.amounts.length, 0);
    assert.equal(edge.fromDate, null);
    assert.equal(edge.toDate, null);
    const cards = claim.locator(".historical-source");
    assert.deepEqual(
      await cards.evaluateAll((rows) =>
        rows.map((row) => row.dataset.sourceId),
      ),
      edge.sourceIds,
    );
    for (const sourceId of edge.sourceIds) {
      const source = sources.get(sourceId);
      const provenance = provenanceById.get(sourceId);
      const card = claim.locator(
        `[data-source-id=${JSON.stringify(sourceId)}]`,
      );
      const link = card.getByRole("link");
      assert.equal(
        await link.getAttribute("href"),
        source.url,
        `${edge.id}: exact primary-source URL`,
      );
      assert.equal(await link.innerText(), source.title);
      assert.equal(await link.getAttribute("target"), "_blank");
      assert.ok(
        (await link.getAttribute("rel")).split(/\s+/).includes("noopener"),
      );
      assert.deepEqual(await card.locator("dt").allTextContents(), [
        "Reporting period",
        "Document / MD&A date",
        "First publication",
        "Retained retrieval",
        "Page / section locator",
      ]);
      assert.deepEqual(
        (await card.locator("dd").allTextContents()).map(normalized),
        [
          provenance.reportingPeriod,
          provenance.documentDate ?? "Unverified",
          "Unverified; not inferred from URL or retrieval date",
          source.retrievedAt ? `${source.retrievedAt} (${provenance.retrievalPrecision} precision)` : `${provenance.retrievalDate} (day precision)`,
          normalized(source.locator),
        ],
      );
      const sourceText = normalized(await card.innerText());
      assert.ok(
        sourceText.includes(
          `Issuer: ${source.publisher} · self-reported · source family: ${provenance.sourceFamily}`,
        ),
      );
      for (const limitation of source.limitations)
        assert.ok(sourceText.includes(normalized(limitation)));
    }
    result.historicalClaims.push({
      id: edge.id,
      recordId: record.id,
      from: edge.from,
      to: edge.to,
      status: edge.status,
      label: edge.label,
      sourceIds: edge.sourceIds,
      sourceUrls: edge.sourceIds.map((id) => sources.get(id).url),
    });
  }
  const identities = content.getByRole("region", {
    name: "Historical identities and incorporation context",
  });
  assert.deepEqual(
    await identities
      .locator("[data-entity-id]")
      .evaluateAll((rows) => rows.map((row) => row.dataset.entityId)),
    additions.entities.map((row) => row.id),
  );
  for (const entity of additions.entities) {
    const itemText = normalized(
      await identities
        .locator(`[data-entity-id=${JSON.stringify(entity.id)}]`)
        .innerText(),
    );
    assert.ok(itemText.includes(entity.label));
    assert.ok(itemText.includes(normalized(entity.identityBasis)));
    for (const geo of entity.geography)
      assert.ok(itemText.includes(normalized(geo.note)));
  }
  const irbLink = identities.getByRole("link");
  const irbDestination = historical.reviewOriginalDestination(reusedEntity);
  assert.equal(await irbLink.getAttribute("href"), irbDestination.href);
  assert.ok((await irbLink.innerText()).includes(reusedEntity.label));
  assert.equal(
    await irbLink.evaluate((element) => element.href),
    new URL(irbDestination.href, page.url()).href,
  );
  const holds = content.getByRole("region", { name: "Retained packet holds and graph exclusions" });
  const holdText = normalized(await holds.innerText());
  for (const hold of additions.held)
    assert.ok(holdText.includes(normalized(`${hold.id}: ${hold.reason}`)));
  for (const target of historicalOverlay.holdTargets) {
    for (const id of [
      ...target.relationshipIds,
      ...target.recordIds,
      ...target.entityIds,
    ])
      assert.ok(holdText.includes(id));
  }
  const overview = historical.reviewOriginalDestination(additions.records[0]);
  assert.equal(
    await holds.getByRole("link").getAttribute("href"),
    overview.href,
  );
  for (const item of [
    ...additions.entities,
    ...additions.records,
    ...additions.relationships,
  ]) {
    assert.deepEqual(
      historical.reviewOriginalDestination(item),
      overview,
      "New additions must only have the original overview fallback",
    );
  }
  const links = await content
    .getByRole("link")
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("href")));
  const allowed = new Set([
    historical.withoutHistoricalReview(page.url()),
    overview.href,
    irbDestination.href,
    ...additions.sources.map((row) => row.url),
  ]);
  assert.ok(
    links.every((href) => allowed.has(href)),
    "Reader invented an original-item deep link or source destination",
  );
  assert.equal(
    result.requests.filter((url) =>
      additions.sources.some((row) => row.url === url),
    ).length,
    0,
    "Review must inspect source destinations without opening external evidence sites",
  );
  await assertHistoricalBaseUnchanged(page, result, "reader-open");
  return dialog;
}

async function captureHistoricalSection(page, result, locator, name) {
  const dimensions = await locator.evaluate((element) => {
    const dialog = element.closest("[data-reader-scroll]");
    const outer = dialog.getBoundingClientRect();
    const inner = element.getBoundingClientRect();
    return {
      top: inner.top - outer.top + dialog.scrollTop - dialog.clientTop,
      height: inner.height,
      viewport: dialog.clientHeight,
      maxScroll: dialog.scrollHeight - dialog.clientHeight,
    };
  });
  // Cover the entire expanded claim/source, not only its first screenful.
  // The viewport is the independently scrolling body below the reserved Close row.
  const stride = dimensions.viewport - 160;
  assert.ok(stride > 200, "Historical reader viewport is too small for review");
  const positions = [];
  for (let offset = 0; offset < dimensions.height; offset += stride) {
    positions.push(
      Math.min(dimensions.maxScroll, Math.max(0, dimensions.top - 70 + offset)),
    );
  }
  const unique = [...new Set(positions)];
  assert.ok(
    unique.length > 0 && unique.length <= 12,
    "Historical section needs a bounded complete capture plan",
  );
  (result.historicalCaptureCoverage ??= []).push({
    name,
    ...dimensions,
    stride,
    positions: unique,
  });
  for (const [index, top] of unique.entries()) {
    await historicalDialog(page).locator("[data-reader-scroll]").evaluate((element, value) => {
      element.scrollTop = value;
    }, top);
    await measureReaderLayout(historicalDialog(page), result, `${name}:band-${index + 1}`);
    const part = index ? `${name}--part-${index + 1}` : name;
    await capture(page, result, part);
    const filename = `${result.name}--${part}--reader.png`;
    await historicalDialog(page).screenshot({
      path: join(output, filename),
      timeout: 10000,
    });
    result.screenshots.push(filename);
  }
}

async function assertHistoricalFocusReturned(page, result, phase) {
  await historicalDialog(page).waitFor({ state: "detached" });
  const opener = historicalGate(page).getByRole("button", {
    name: "Open historical review reader",
    exact: true,
  });
  await until(
    () =>
      opener.evaluate(
        (element) =>
          document.activeElement === element &&
          element.isConnected &&
          element.getClientRects().length > 0,
      ),
    "Historical dismissal did not restore focus to its original visible Open button",
  );
  (result.historicalFocus ??= []).push({
    phase,
    ...(await page.evaluate(() => ({
      tag: document.activeElement.tagName,
      text: document.activeElement.textContent,
      label: document.activeElement.getAttribute("aria-label"),
    }))),
  });
}

async function installHistoricalDigestProbe(context, failFirstPayload = false) {
  await context.addInitScript(
    ({ payload, baseHash, payloadHash, failFirstPayload }) => {
      const stats = { payloadChecks: 0, baseChecks: 0, mismatchesInjected: 0 };
      window.__historicalReviewVerification = stats;
      const subtle = crypto.subtle;
      const digest = subtle.digest.bind(subtle);
      const payloadBytes = new TextEncoder().encode(payload).byteLength;
      Object.defineProperty(subtle, "digest", {
        configurable: true,
        value: async (algorithm, data) => {
          const result = await digest(algorithm, data);
          const actual = [...new Uint8Array(result)]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          if (actual === baseHash) stats.baseChecks += 1;
          if (
            actual === payloadHash &&
            data.byteLength === payloadBytes &&
            new TextDecoder().decode(data) === payload
          ) {
            stats.payloadChecks += 1;
            if (failFirstPayload && stats.mismatchesInjected === 0) {
              stats.mismatchesInjected += 1;
              return new Uint8Array(32).buffer;
            }
          }
          return result;
        },
      });
    },
    {
      payload: historicalAdditionsText,
      baseHash: historicalReference.baseSha256,
      payloadHash: historicalReference.additionsSha256,
      failFirstPayload,
    },
  );
}

async function installTutorialProbe(context, denyTutorialStorage = false) {
  await context.addInitScript(
    ({ key, denyTutorialStorage }) => {
      window.__tutorialAudioActions = [];
      for (const method of ["speak", "cancel", "pause", "resume"]) {
        if (
          !window.speechSynthesis ||
          typeof speechSynthesis[method] !== "function"
        )
          continue;
        const original = speechSynthesis[method].bind(speechSynthesis);
        speechSynthesis[method] = (...args) => {
          window.__tutorialAudioActions.push(method);
          return original(...args);
        };
      }
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.__tutorialAudioActions.push("media-play");
        return Reflect.apply(originalPlay, this, args);
      };
      if (denyTutorialStorage) {
        localStorage.setItem(key, "{invalid tutorial progress");
        const originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
          if (name === key)
            throw new DOMException(
              "Intentional tutorial-only storage denial",
              "QuotaExceededError",
            );
          return Reflect.apply(originalSet, this, [name, value]);
        };
      }
    },
    { key: atlasTutorialKey, denyTutorialStorage },
  );
}

async function tutorialResearchState(page) {
  return page.evaluate((tutorialKey) => {
    const app = document.querySelector(".evidence-app");
    const host = document.querySelector(".webgl-host");
    const storage = {};
    for (const key of Object.keys(localStorage).sort())
      if (key !== tutorialKey) storage[key] = localStorage.getItem(key);
    return {
      url: location.href,
      dataset: app ? { ...app.dataset } : null,
      camera: host
        ? Object.fromEntries(
            [
              "centerLng",
              "centerLat",
              "zoom",
              "pitch",
              "semanticMode",
              "renderedEdgeIds",
            ].map((key) => [key, host.dataset[key]]),
          )
        : null,
      controls: [...(app?.querySelectorAll("input, select, textarea") ?? [])]
        .filter((element) => !element.closest(".field-guide"))
        .map((element) => ({
          label: element.getAttribute("aria-label"),
          type: element.type,
          value: element.value,
          checked: element.checked,
        })),
      pressed: [...(app?.querySelectorAll("button[aria-pressed]") ?? [])].map(
        (element) => ({
          label: element.getAttribute("aria-label") ?? element.textContent,
          pressed: element.getAttribute("aria-pressed"),
        }),
      ),
      selection:
        document.querySelector(".evidence-inspector h2")?.textContent ?? null,
      sources: [
        ...document.querySelectorAll(".evidence-inspector .source-card a"),
      ].map((element) => element.getAttribute("href")),
      journey:
        document.querySelector('[aria-label="Camera journey"]')?.textContent ??
        null,
      storage,
      audioActions: [...(window.__tutorialAudioActions ?? [])],
    };
  }, atlasTutorialKey);
}

async function assertTutorialUnchanged(page, result, before, action) {
  assert.deepEqual(
    await tutorialResearchState(page),
    before,
    `${action}: tutorial changed research, camera, audio, filters, sources or navigation`,
  );
  (result.tutorialStateChecks ??= []).push(action);
}

async function tutorialTargetCount(page, selector) {
  return page.evaluate((selector) => {
    if (!selector) return 0;
    return [...document.querySelectorAll(selector)].filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return (
        box.bottom > 0 &&
        box.right > 0 &&
        box.top < innerHeight &&
        box.left < innerWidth &&
        element.getClientRects().length > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        !element.closest('[hidden], [aria-hidden="true"]')
      );
    }).length;
  }, selector);
}

async function assertTutorialStep(page, result, index, requiredTargetState) {
  const dialog = tutorialDialog(page);
  await dialog.waitFor({ state: "visible" });
  const step = atlasGuide.steps[index];
  await until(
    async () =>
      (await dialog.getByRole("heading", { level: 2 }).innerText()) ===
      step.title,
    `Tutorial did not reach retained step ${step.id}`,
  );
  assert.equal(
    await dialog.getAttribute("aria-labelledby"),
    await dialog.getByRole("heading", { level: 2 }).getAttribute("id"),
  );
  const description = await dialog.getAttribute("aria-describedby");
  assert.equal(
    normalized(
      await dialog.locator(`[id=${JSON.stringify(description)}]`).innerText(),
    ),
    normalized(step.body),
  );
  assert.equal(
    normalized(await dialog.locator(".field-guide-kicker").innerText()),
    `${atlasGuide.title} · ${index + 1} of ${atlasGuide.steps.length}`,
  );
  const count = await tutorialTargetCount(page, step.target);
  const targetState = !step.target
    ? "unanchored"
    : count === 1
      ? "available"
      : count > 1
        ? "ambiguous"
        : "absent";
  if (requiredTargetState) assert.equal(targetState, requiredTargetState);
  const targetText =
    targetState === "available"
      ? "This section is present. Pause to try it, then reopen Help to continue."
      : targetState === "ambiguous"
        ? "Several matching sections are visible. This note is not pointing at any one of them. Pause to choose the intended section yourself."
        : targetState === "absent"
          ? (step.prerequisite ??
            "This section is not visible in the current view. Continue reading or pause to open it yourself.")
          : "This is a reading note. You can continue without changing the page.";
  await until(
    async () =>
      normalized(await dialog.locator(".field-guide-target").innerText()) ===
      normalized(targetText),
    `Tutorial target note disagrees with actual ${targetState} target`,
  );
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(
    box &&
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1,
    "Tutorial dialog is clipped outside the viewport",
  );
  assert.ok(
    Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2,
    "Tutorial notes stopped being a central dialog",
  );
  assert.equal(
    await dialog.evaluate(
      (element) => element.open && element.matches(":modal"),
    ),
    true,
  );
  (result.tutorialSteps ??= []).push({
    id: step.id,
    index,
    title: step.title,
    target: step.target,
    targetState,
    matchingVisibleTargets: count,
    box,
  });
}

async function assertTutorialFocusReturned(page) {
  await tutorialDialog(page).waitFor({ state: "hidden" });
  await until(
    () =>
      tutorialHelp(page).evaluate(
        (element) => document.activeElement === element,
      ),
    "Tutorial did not return focus to Help",
  );
}

async function assertTutorialProgress(page, step, status) {
  assert.deepEqual(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      atlasTutorialKey,
    ),
    { version: 2, step, status },
  );
}

/** Check actual rendered styles for the current input capability. No CSS is forced. */
async function assertGuideButtonContrast(page, result, phase, input = "normal") {
  const dialog = tutorialDialog(page);
  const next = dialog.getByRole("button", { name: "Next", exact: true });
  const capabilities = await page.evaluate(() => ({
    hover: matchMedia("(hover: hover)").matches,
    pointer: matchMedia("(pointer: fine)").matches,
    touchPoints: navigator.maxTouchPoints,
  }));
  if (input === "pointer-hover") {
    assert.equal(capabilities.hover, true, "Pointer-hover coverage requires a hover-capable context");
    await next.hover();
    await until(() => next.evaluate(element => element.matches(":hover")),
      "Desktop pointer never reached the Next hover state");
  } else if (input === "focus") {
    await next.focus();
    assert.equal(await next.evaluate(element => document.activeElement === element), true,
      "Guide focus contrast requires the Next button to actually be focused");
  }
      const buttonContrast = await dialog
        .locator("button:not(:disabled)")
        .evaluateAll((buttons) => {
          const rgb = (value) => {
            const parts = value.match(/[\d.]+/g).map(Number);
            return [parts[0], parts[1], parts[2], parts[3] ?? 1];
          };
          const blend = (a, b) =>
            a.slice(0, 3).map((v, i) => v * a[3] + b[i] * (1 - a[3]));
          const luminance = (color) =>
            color
              .map((v) => {
                const s = v / 255;
                return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          return buttons.map((button) => {
            const style = getComputedStyle(button);
            const paper = rgb(
              getComputedStyle(button.closest("dialog")).backgroundColor,
            );
            const background = blend(rgb(style.backgroundColor), paper);
            const foreground = blend(rgb(style.color), background);
            const a = luminance(foreground),
              b = luminance(background);
            return {
              label: button.textContent.trim(),
              foreground: style.color,
              background: style.backgroundColor,
              hovered: button.matches(":hover"),
              ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
            };
          });
        });

  result.guideButtonContrast ??= [];
  result.guideButtonContrast.push({phase, input, capabilities, buttons: buttonContrast});
  assert.ok(buttonContrast.every(row => row.ratio >= 4.5),
    `Paper-guide button contrast is below 4.5:1 (${phase}): ${JSON.stringify(buttonContrast)}`);
  if (input === "pointer-hover") assert.equal(
    buttonContrast.find(row => row.label === "Next")?.hovered, true,
    "The desktop contrast check must exercise the real Next hover state");
}

async function scenario(name, options, work) {
  const result = {
    name,
    status: "running",
    screenshots: [],
    console: [],
    pageErrors: [],
    requestsFailed: [],
    responses: [],
    requests: [],
    notes: [],
    expectedFailedRequests: [],
    viewport: options.viewport ?? viewport,
  };
  report.scenarios.push(result);
  let context;
  let page;
  let deadline;
  try {
    context = await browser.newContext({
      viewport: options.viewport ?? viewport,
      deviceScaleFactor: options.deviceScaleFactor ?? 1,
      hasTouch: options.touch === true,
      reducedMotion: options.reducedMotion ? "reduce" : "no-preference",
      acceptDownloads: true,
    });
    if (options.blockTiles) {
      result.blockedTileRequests = [];
      const tileOrigin = new URL(mapStyle.TILE_SOURCE).origin;
      await context.route(
        (url) => url.origin === tileOrigin,
        (route) => {
          result.blockedTileRequests.push(route.request().url());
          return route.abort("failed");
        },
      );
    }
    if (options.beforeNavigation)
      await options.beforeNavigation(context, result);
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    await context.addInitScript(
      ({ unsupported }) => {
        const stats = {
          drawCalls: 0,
          contexts: [],
          unsupportedRequested: unsupported,
        };
        window.__spatialReviewGraphics = stats;
        const original = HTMLCanvasElement.prototype.getContext;
        const seen = new WeakSet();
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          const webgl = /^(webgl2?|experimental-webgl)$/.test(kind);
          if (unsupported && webgl) return null;
          const context = Reflect.apply(original, this, [kind, ...args]);
          if (webgl && context && !seen.has(context)) {
            seen.add(context);
            const debug = context.getExtension("WEBGL_debug_renderer_info");
            stats.contexts.push({
              kind,
              version: context.getParameter(context.VERSION),
              renderer: debug
                ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                : context.getParameter(context.RENDERER),
            });
            for (const method of [
              "drawArrays",
              "drawElements",
              "drawArraysInstanced",
              "drawElementsInstanced",
            ]) {
              if (typeof context[method] !== "function") continue;
              const draw = context[method];
              context[method] = function (...parameters) {
                const value = Reflect.apply(draw, this, parameters);
                stats.drawCalls += 1;
                return value;
              };
            }
          }
          return context;
        };
      },
      { unsupported: options.unsupported ?? false },
    );
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(45000);
    page.on("console", (message) =>
      result.console.push({
        type: message.type(),
        text: message.text(),
        location: message.location(),
      }),
    );
    page.on("pageerror", (error) =>
      result.pageErrors.push(error.stack ?? error.message),
    );
    page.on("requestfailed", (request) =>
      result.requestsFailed.push({
        url: request.url(),
        error: request.failure()?.errorText,
      }),
    );
    page.on("response", (response) =>
      result.responses.push({
        url: response.url(),
        status: response.status(),
        type: response.request().resourceType(),
      }),
    );
    page.on("request", (request) => result.requests.push(request.url()));
    await Promise.race([
      (async () => {
        const response = await page.goto(
          `${origin}${prefix}${options.query ?? "?dataset=preview"}`,
          {
            waitUntil: "domcontentloaded",
          },
        );
        assert.equal(response.status(), 200);
        if (!options.skipReady)
          await page
            .getByRole("heading", { name: "The felt atlas", exact: true })
            .waitFor({ timeout: 45000 });
        await work(page, result);
        assert.deepEqual(
          result.pageErrors,
          [],
          "Unexpected uncaught browser errors",
        );
        assert.deepEqual(
          result.responses.filter(
            (response) =>
              response.url.startsWith(origin) && response.status >= 400,
          ),
          [],
          "A local app/data asset failed to load",
        );
        assert.deepEqual(
          result.requestsFailed.filter(
            (request) =>
              request.url.startsWith(origin) &&
              !result.expectedFailedRequests.includes(request.url) &&
              !request.error?.includes("ERR_ABORTED"),
          ),
          [],
          "A local app request failed",
        );
      })(),
      new Promise((_, reject) => {
        deadline = setTimeout(
          () =>
            reject(
              new Error(
                `Scenario exceeded its ${options.budgetMs ?? 80000} ms review budget`,
              ),
            ),
          options.budgetMs ?? 80000,
        );
      }),
    ]);
    result.status = "passed";
  } catch (error) {
    result.status = "failed";
    result.error = error.stack ?? String(error);
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
    if (options.afterScenario) await options.afterScenario();
    if (page && !page.isClosed()) {
      try {
        await capture(
          page,
          result,
          result.status === "failed" ? "failure" : "final",
        );
      } catch (error) {
        result.captureError = String(error);
      }
      try {
        result.mapState = (await page.locator(".webgl-host").count())
          ? await page
              .locator(".webgl-host")
              .evaluate((element) => ({ ...element.dataset }))
          : null;
        result.graphics = await page.evaluate(
          () => window.__spatialReviewGraphics,
        );
        result.viewportGeometry = await page.evaluate(() =>
          Object.fromEntries(
            [
              ".webgl-host",
              ".webgl-host canvas",
              ".historical-review-dialog",
              ".historical-review-content",
            ].map((selector) => {
              const element = document.querySelector(selector);
              return [
                selector,
                element
                  ? {
                      ...element.getBoundingClientRect().toJSON(),
                      position: getComputedStyle(element).position,
                    }
                  : null,
              ];
            }),
          ),
        );
        result.visibleText = await page
          .locator("body")
          .innerText({ timeout: 2000 });
        await writeFile(join(output, `${name}.html`), await page.content());
      } catch (error) {
        result.diagnosticError = String(error);
      }
    }
    if (context) {
      try {
        await context.tracing.stop({ path: join(output, `${name}.trace.zip`) });
      } catch (error) {
        result.traceError = String(error);
      }
      await context.close().catch(() => {});
    }
    await writeFile(
      join(output, `${name}.json`),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    console.log(
      `${result.status.toUpperCase()}: ${name}${result.error ? `\n${result.error}` : ""}`,
    );
  }
}

try {
  const checkedOutCommit = execFileSync(
    "git",
    ["-C", root, "rev-parse", "HEAD"],
    { encoding: "utf8" },
  ).trim();
  const commitHeaders = execFileSync(
    "git",
    ["-C", root, "cat-file", "-p", "HEAD"],
    { encoding: "utf8" },
  ).split("\n\n", 1)[0];
  const parents = [...commitHeaders.matchAll(/^parent ([0-9a-f]{40})$/gm)].map(
    (match) => match[1],
  );
  assert.equal(
    expectedHistoricalReview(undefined),
    true,
    "Default next-release review requires positive historical coverage",
  );
  assert.throws(() => expectedHistoricalReview("false"));
  assert.equal(
    expectedHistoricalReview("true"),
    true,
    "Explicit review mode must require positive historical coverage",
  );
  assert.throws(() => expectedHistoricalReview("auto"));
  const candidateHead = process.env.SPATIAL_HEAD_SHA ?? process.env.GITHUB_SHA;
  assert.match(candidateHead ?? "", /^[0-9a-f]{40}$/);
  assert.equal(
    checkedOutCommit,
    process.env.GITHUB_SHA,
    "Review checkout does not match the workflow revision",
  );
  assert.ok(
    checkedOutCommit === candidateHead || parents.includes(candidateHead),
    "Checkout is neither the exact candidate nor its integration merge",
  );
  report.revision = {
    checkedOutCommit,
    candidateHead,
    parents,
    mode:
      checkedOutCommit === candidateHead
        ? "exact-head"
        : "exact-head integration merge",
  };
  await build({
    entryPoints: [join(root, "src/model.ts")],
    outfile: join(temporary, "model.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  model = await import(pathToFileURL(join(temporary, "model.mjs")).href);
  for (const name of [
    "geography",
    "geoStyle",
    "displayBudget",
    "semanticZoom",
  ]) {
    await build({
      entryPoints: [join(root, `src/${name}.ts`)],
      outfile: join(temporary, `${name}.mjs`),
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
    });
  }
  geography = await import(
    pathToFileURL(join(temporary, "geography.mjs")).href
  );
  mapStyle = await import(pathToFileURL(join(temporary, "geoStyle.mjs")).href);
  displayBudget = await import(
    pathToFileURL(join(temporary, "displayBudget.mjs")).href
  );
  semanticZoom = await import(
    pathToFileURL(join(temporary, "semanticZoom.mjs")).href
  );
  preview = model.buildPreview();
  registryManifest = JSON.parse(
    await readFile(join(dist, "data/registry/manifest.json"), "utf8"),
  );
  fullRegistry = { updatedAt: registryManifest.metadata.updatedAt };
  for (const group of registryManifest.arrays) {
    fullRegistry[group.key] = [];
    for (const chunk of group.chunks) {
      const bytes = await readFile(join(dist, "data/registry", chunk.file));
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        chunk.sha256,
      );
      fullRegistry[group.key].push(...JSON.parse(bytes));
    }
    assert.equal(fullRegistry[group.key].length, group.count);
  }
  assert.equal(
    createHash("sha256").update(JSON.stringify(fullRegistry)).digest("hex"),
    registryManifest.sourceSnapshot.sha256,
  );
  fullScene = model.buildEvidenceScene(fullRegistry);
  assert.equal(
    fullScene.nodes.length,
    8086,
    "Full registry item baseline changed",
  );
  assert.equal(
    model.factualScene(fullScene).nodes.length,
    7853,
    "Factual exclusion baseline changed",
  );
  await build({
    entryPoints: [join(root, "src/historical-review/adapter.ts")],
    outfile: join(temporary, "historical-adapter.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  historical = await import(
    pathToFileURL(join(temporary, "historical-adapter.mjs")).href
  );
  historicalAdditionsText = await readFile(
    join(root, "src/historical-review/proposed-additions.json"),
    "utf8",
  );
  const provenanceText = await readFile(
    join(root, "src/historical-review/source-provenance.json"),
    "utf8",
  );
  assert.equal(
    sha256(historicalAdditionsText),
    historicalReference.additionsSha256,
  );
  assert.equal(sha256(provenanceText), historicalReference.provenanceSha256);
  assert.equal(
    registryManifest.sourceSnapshot.sha256,
    historicalReference.baseSha256,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(historicalReference.counts).map((key) => [
        key,
        fullRegistry[key].length,
      ]),
    ),
    historicalReference.counts,
  );
  assert.equal(historical.PINNED_BASE_SHA256, historicalReference.baseSha256);
  assert.equal(
    historical.PINNED_ADDITIONS_SHA256,
    historicalReference.additionsSha256,
  );
  assert.equal(
    historical.PINNED_PROVENANCE_SHA256,
    historicalReference.provenanceSha256,
  );
  const baseBeforeReview = JSON.stringify(fullRegistry);
  historicalOverlay = await historical.buildHistoricalReviewOverlay(
    fullRegistry,
    historicalAdditionsText,
    provenanceText,
    "historical-2025",
    await readFile(join(root, "src/historical-review/reader-admission.json"), "utf8"),
  );
  assert.equal(historicalOverlay.readerAdmission.readerStatus, "READER_ADMITTED");
  assert.equal(historicalOverlay.publicPathEligible, false);
  assert.equal(
    JSON.stringify(fullRegistry),
    baseBeforeReview,
    "Review mutated the original registry",
  );
  assert.equal(historicalOverlay.status, "PUBLIC_GRAPH_BLOCKED");
  assert.equal(historicalOverlay.publicGraphEligible, false);
  assert.equal(historicalOverlay.graphRegistry, fullRegistry);
  assert.equal(
    historical.registryForSurface(historicalOverlay, "factual"),
    fullRegistry,
  );
  assert.equal(
    historicalOverlay.reusedEntity,
    fullRegistry.entities.find((row) => row.id === historical.REUSED_IRB_ID),
  );
  assert.equal(
    historicalOverlay.readerRegistry.entities.filter(
      (row) => row.id === historical.REUSED_IRB_ID,
    ).length,
    1,
  );
  const factualBefore = model.factualScene(fullScene);
  const factualReview = model.factualScene(
    model.buildEvidenceScene(historicalOverlay.readerRegistry),
  );
  assert.deepEqual(
    factualReview.nodes,
    factualBefore.nodes,
    "Historical reader guards changed factual entity/record admission",
  );
  assert.deepEqual(
    factualReview.edges,
    factualBefore.edges,
    "Historical reader guards changed factual edge admission",
  );
  for (const row of [
    ...historicalOverlay.additions.entities,
    ...historicalOverlay.additions.records,
    ...historicalOverlay.additions.relationships,
  ]) {
    assert.ok(
      !factualReview.nodes.some((node) => node.id === row.id) &&
        !factualReview.edges.some((edge) => edge.id === row.id),
      `Blocked historical ID admitted: ${row.id}`,
    );
  }
  const gateCases = [
    ["?review=historical-2025", false, "full", false],
    ["?review=historical-2025", true, "full", true],
    ["", true, "full", false],
    ["?review=historical-2025", true, "preview", false],
    ["?review=unknown", true, "full", false],
    ["?review=historical-2025&review=historical-2025", true, "full", false],
  ];
  for (const [query, enabled, dataset, expected] of gateCases)
    assert.equal(
      historical.historicalReviewRequested(query, enabled, dataset),
      expected,
    );
  const entrySource = await readFile(
    join(root, "src/RegistryEntry.tsx"),
    "utf8",
  );
  assert.match(
    entrySource,
    /historicalReviewRequested\(new URL\(href\)\.search, true, dataset\)/,
  );
  assert.match(
    entrySource,
    /<App registry=\{state\.registry\} dataset="full" \/>/,
  );
  assert.doesNotMatch(
    entrySource,
    /readerRegistry|proposed-additions|loadHistoricalReview/,
  );
  report.historicalReview = {
    label: report.reviewLabel,
    status: historicalOverlay.status,
    readerAdmission: historicalOverlay.readerAdmission,
    publicGraphEligible: false,
    publicPathEligible: false,
    snapshot: historicalOverlay.snapshot,
    reference: historicalReference,
    reusedEntityId: historicalOverlay.reusedEntity.id,
    additions: Object.fromEntries(
      ["entities", "records", "relationships", "sources", "held"].map((key) => [
        key,
        historicalOverlay.additions[key].length,
      ]),
    ),
    graph: {
      nodes: factualBefore.nodes.length,
      edges: factualBefore.edges.length,
    },
    staticGateCases: gateCases.map(([query, enabled, dataset, expected]) => ({
      query,
      enabled,
      dataset,
      expected,
    })),
    sourceProvenance: historicalOverlay.provenance,
    note: "Exact-ID reader admission only. PUBLIC_GRAPH_BLOCKED remains graph/path-specific; this CI run does not authorize deployment or factual graph/path admission.",
  };
  const guideText = await readFile(
    join(root, "src/guidance/atlas-guide.json"),
    "utf8",
  );
  assert.equal(
    sha256(guideText),
    atlasGuideHash,
    "The approved atlas tutorial catalogue changed",
  );
  atlasGuide = JSON.parse(guideText);
  assert.equal(atlasGuide.steps.length, 13);
  report.atlasTutorial = {
    label: "next-head atlas-only tutorial review",
    id: atlasGuide.id,
    sha256: atlasGuideHash,
    steps: atlasGuide.steps.map((step) => step.id),
    storageKey: atlasTutorialKey,
    scope:
      "Only the atlas tutorial is exercised; original-route tutorial pages and the wider acceptance matrix remain outside this review.",
  };
  heavyAssetNames = new Set();
  for (const name of await readdir(join(dist, "assets"))) {
    if (/maplibre.*worker.*\.js$/.test(name)) heavyAssetNames.add(name);
    if (!name.endsWith(".js.map")) continue;
    const map = JSON.parse(await readFile(join(dist, "assets", name), "utf8"));
    for (const [sourceName, assign] of [
      [
        "ReviewGate.tsx",
        (asset) => {
          assert.equal(historicalGateAsset, undefined);
          historicalGateAsset = asset;
        },
      ],
      [
        "ReviewPanel.tsx",
        (asset) => {
          assert.equal(historicalPanelAsset, undefined);
          historicalPanelAsset = asset;
        },
      ],
      [
        "loadHistoricalReview.ts",
        (asset) => {
          assert.equal(historicalPayloadAsset, undefined);
          historicalPayloadAsset = asset;
        },
      ],
    ]) {
      if (
        map.sources.some((source) =>
          source.endsWith(`/historical-review/${sourceName}`),
        )
      ) {
        const asset = name.slice(0, -4);
        historicalDeferredAssets.add(asset);
        assign(asset);
      }
    }
    if (map.sources.some((source) => /src\/SpatialWorld\.tsx$/.test(source))) {
      assert.equal(
        spatialAssetName,
        undefined,
        "More than one SpatialWorld entry chunk was emitted",
      );
      spatialAssetName = name.slice(0, -4);
    }
    if (
      map.sources.some((source) =>
        /(?:node_modules\/(?:three|maplibre-gl)\/|src\/(?:scene\.ts|SpatialWorld\.tsx)$)/.test(
          source,
        ),
      )
    ) {
      heavyAssetNames.add(name.slice(0, -4));
    }
  }
  assert.ok(
    heavyAssetNames.size >= 2,
    "Cannot identify deferred WebGL assets from the production source maps",
  );
  assert.ok(
    spatialAssetName,
    "Cannot identify the deferred SpatialWorld entry chunk",
  );
  if (expectHistoricalReview) {
    assert.ok(
      historicalGateAsset && historicalPanelAsset && historicalPayloadAsset,
      "The default build must emit identifiable deferred gate, reader and payload chunks",
    );
    assert.equal(
      new Set([
        historicalGateAsset,
        historicalPanelAsset,
        historicalPayloadAsset,
      ]).size,
      3,
      "Historical payload must remain separately deferred until user opt-in",
    );
  }
  report.historicalReview.expectedEnabled = expectHistoricalReview;
  report.historicalReview.mode = "default build: exact query plus fresh Open; graph/paths blocked";
  report.historicalReview.deferredAssets = [...historicalDeferredAssets];
  report.historicalReview.loadingBudget = JSON.parse(
    await readFile(join(dist, "build-budget.json"), "utf8"),
  );
  report.fullRegistry = {
    counts: registryManifest.counts,
    chunks: registryManifest.totalChunks,
    deferredAssets: [...heavyAssetNames],
  };
  const nodes = new Map(preview.nodes.map((node) => [node.id, node]));
  trailEdge = preview.edges.find((edge) => {
    const from = geography.getNodeAnchor(nodes.get(edge.from));
    const to = geography.getNodeAnchor(nodes.get(edge.to));
    return from && to && from.areaCode !== to.areaCode;
  });
  assert.ok(
    trailEdge,
    "No source-backed cross-area relationship exists for a geographic source trail",
  );
  await startServer();
  // These probes confirm the preview cannot silently serve root-level assets.
  assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404);
  assert.equal(
    (await fetch(`${origin}${prefix}%2e%2e%2findex.html`)).status,
    403,
  );
  browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  report.browserVersion = browser.version();

  await scenario("01-overview-and-source-trail", {}, async (page, result) => {
    await assertSpatial(page);
    await assertCountryBase(page);
    await assertCounts(page);
    const world = await assertSemanticDisplay(
      page,
      result,
      preview,
      preview.nodes[0].id,
      "world",
    );
    assert.equal(world.countryStacks.size, 3);
    assert.equal(world.rendered.length, 2);
    await until(async () => {
      const radius = Number(
        await page
          .locator(".webgl-host")
          .getAttribute("data-thread-radius-pixels"),
      );
      return Number.isFinite(radius) && radius > 0 && radius <= 2.1 + 1e-6;
    }, "World-scale thread radius is missing or exceeds the 2.1 CSS-pixel cap");
    await capture(page, result, "overview-1440x1000");
    const edge = trailEdge.relationship;
    await page.getByRole("button", { name: "Start a source trail" }).click();
    await assertProvenance(page, edge);
    await assertSemanticDisplay(page, result, preview, edge.id);
    await assertCameraControlsClearOfReader(page);
    await journey(page)
      .getByRole("button", { name: "Pause", exact: true })
      .waitFor();
    await until(
      async () =>
        Number(await journey(page).locator("progress").getAttribute("value")) >
        0,
      "Source trail never advanced",
    );
    await capture(page, result, "source-trail-moving");
    await journey(page)
      .getByRole("button", { name: "Pause", exact: true })
      .click();
    await journey(page)
      .getByRole("button", { name: "Resume", exact: true })
      .waitFor();
    const pausedAt = Number(
      await journey(page).locator("progress").getAttribute("value"),
    );
    await delay(350);
    assert.equal(
      Number(await journey(page).locator("progress").getAttribute("value")),
      pausedAt,
      "Paused travel continued advancing",
    );
    await capture(page, result, "source-trail-paused");
    await inspector(page)
      .getByRole("button", { name: "Pin reading panel while travelling" })
      .click();
    await page.keyboard.press("Home");
    await journey(page)
      .getByRole("button", { name: "Pause", exact: true })
      .waitFor();
    await capture(page, result, "persistent-panel-during-camera-travel");
    await page.keyboard.press("Escape");
    await journey(page).waitFor({ state: "hidden" });
    await assertProvenance(page, edge);
    assert.equal(
      await inspector(page)
        .getByRole("button", { name: "Unpin reading panel", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await capture(page, result, "persistent-reading-panel");
    await inspector(page)
      .getByRole("button", { name: "Save this evidence", exact: true })
      .click();
    const downloading = page.waitForEvent("download");
    await inspector(page)
      .getByRole("button", {
        name: "Export casebook with evidence",
        exact: true,
      })
      .click();
    const download = await downloading;
    const filename = join(output, "retained-casebook-export.json");
    await download.saveAs(filename);
    const packet = JSON.parse(await readFile(filename, "utf8"));
    assert.equal(packet.registryUpdatedAt, model.registry.updatedAt);
    assert.ok(
      packet.casebook.pins.some(
        (pin) => pin.kind === "relationship" && pin.id === edge.id,
      ),
    );
    for (const key of ["entities", "relationships", "records", "sources"]) {
      for (const row of packet[key])
        assert.deepEqual(
          row,
          model.registry[key].find((original) => original.id === row.id),
          `${key}: exported object changed or fabricated`,
        );
    }
    assert.ok(packet.relationships.some((row) => row.id === edge.id));
    assert.ok(
      edge.sourceIds.every((id) =>
        packet.sources.some((source) => source.id === id),
      ),
    );
    assert.ok(
      edge.responseIds.every((id) =>
        [...packet.records, ...packet.relationships].some(
          (row) => row.id === id,
        ),
      ),
    );
    result.notes.push(
      "Visible source counts, URLs, titles, publishers and locators match retained IDs; raw IDs were verified in the casebook export.",
    );
  });

  await scenario(
    "02-keyboard-help-and-escape",
    { beforeNavigation: (context) => installTutorialProbe(context) },
    async (page, result) => {
      await assertSpatial(page);
      const beforeTutorial = await tutorialResearchState(page);
      const help = page.getByRole("button", {
        name: "Help exploring the evidence room",
        exact: true,
      });
      await help.focus();
      await page.keyboard.press("Enter");
      const dialog = tutorialDialog(page);
      await assertTutorialStep(page, result, 0);
      await page.keyboard.press("Tab");
      assert.equal(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
        true,
      );
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
        true,
      );
      await page.keyboard.press("Home");
      await assertTutorialUnchanged(
        page,
        result,
        beforeTutorial,
        "keyboard Help and contained camera shortcut",
      );
      await capture(page, result, "keyboard-help");
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(
        await help.evaluate((element) => document.activeElement === element),
        true,
        "Help did not restore focus",
      );
      await assertTutorialProgress(page, 0, "paused");
      await assertTutorialUnchanged(
        page,
        result,
        beforeTutorial,
        "tutorial Escape",
      );
      const record = page.locator(".accessible-node-list > button").nth(1);
      await record.focus();
      await page.keyboard.press("Enter");
      await assertProvenance(page, preview.nodes[0].item);
      await page.keyboard.press("Escape");
      await inspector(page).waitFor({ state: "hidden" });
      assert.equal(
        await record.evaluate((element) => document.activeElement === element),
        true,
        "Reading panel did not restore keyboard focus",
      );
      assert.equal(await journey(page).count(), 0);
    },
  );

  await scenario("03-time-and-facet-lenses", {}, async (page, result) => {
    await assertSpatial(page);
    await page.getByRole("button", { name: "4D · Time", exact: true }).click();
    const filters = page.getByRole("region", {
      name: "Time and facet filters",
    });
    const slider = filters.getByRole("slider");
    await slider.fill(String(preview.yearRange[0]));
    await assertCounts(page, { toYear: preview.yearRange[0] });
    const undated = filters.getByRole("checkbox", {
      name: "Keep records with unknown dates visible",
    });
    await undated.uncheck();
    await assertCounts(page, {
      toYear: preview.yearRange[0],
      includeUndated: false,
    });
    await slider.fill(String(preview.yearRange[1]));
    await undated.check();
    const funding = filters.getByRole("button", {
      name: "Funding & debt",
      exact: true,
    });
    await funding.click();
    assert.equal(await funding.getAttribute("aria-pressed"), "true");
    await assertCounts(page, { layers: ["funding"] });
    await capture(page, result, "timeline-and-facets");
    await funding.click();
    await filters.getByRole("button", { name: "Close lenses" }).click();
    await page
      .getByRole("textbox", { name: "Search retained records" })
      .fill("no-such-entity-zzzz");
    await page
      .getByRole("heading", { name: "No records in this lens" })
      .waitFor();
    await assertCounts(page, { query: "no-such-entity-zzzz" });
    await capture(page, result, "empty-lens");
    await page
      .getByRole("button", { name: "Reset lenses", exact: true })
      .click();
    await assertCounts(page);
    await assertSpatial(page);
  });

  await scenario(
    "04-reduced-motion",
    { reducedMotion: true },
    async (page, result) => {
      await assertSpatial(page);
      assert.equal(
        await page.evaluate(
          () => matchMedia("(prefers-reduced-motion: reduce)").matches,
        ),
        true,
      );
      await page
        .getByRole("button", { name: "4D · Time", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("checkbox", {
            name: "Reduced motion: jump to destinations",
          })
          .isChecked(),
        true,
      );
      await page.getByRole("button", { name: "Close lenses" }).click();
      await page.getByRole("button", { name: "Start a source trail" }).click();
      await assertProvenance(page, trailEdge.relationship);
      const destination = geography.getNodeAnchor(
        preview.nodes.find((node) => node.id === trailEdge.to),
      );
      assert.ok(
        destination,
        "Source-trail destination has no retained geographic anchor",
      );
      await until(async () => {
        const zoom = Number(
          await page.locator(".webgl-host").getAttribute("data-zoom"),
        );
        return Math.abs(zoom - destination.focusZoom) < 0.06;
      }, "Reduced-motion jump did not reach the source-qualified destination zoom");
      assert.equal(
        await journey(page).count(),
        0,
        "Reduced motion started an animated journey",
      );
      assert.ok(
        destination.focusZoom >= 6,
        "The retained source-trail destination must exercise close-up thread suppression",
      );
      await until(
        async () =>
          (await page
            .locator(".webgl-host")
            .getAttribute("data-visible-threads")) === "0",
        "Long-range threads remain visible at the close-up destination zoom",
      );
      await assertCameraControlsClearOfReader(page);
      await assertSemanticDisplay(page, result, preview, trailEdge.id, "areas");
      const destinationLabel = page
        .locator(".world-label")
        .filter({ hasText: destination.label });
      await until(async () => {
        if ((await destinationLabel.count()) !== 1) return false;
        const host = await page.locator(".webgl-host").boundingBox();
        const label = await destinationLabel.boundingBox();
        return Boolean(
          host &&
          label &&
          Math.abs(label.x + label.width / 2 - host.x - host.width / 2) < 40 &&
          Math.abs(label.y + label.height / 2 - host.y - host.height / 2) < 70,
        );
      }, "Destination-area label did not move with the reduced-motion camera jump");
      await capture(page, result, "reduced-motion-destination");
    },
  );

  await scenario("05-reading-mode", {}, async (page, result) => {
    await assertSpatial(page);
    const expected = await assertCounts(page);
    await page
      .getByRole("button", { name: "Start a source trail", exact: true })
      .click();
    await journey(page)
      .getByRole("button", { name: "Pause", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Reading", exact: true }).click();
    const reading = page.getByRole("region", {
      name: "Accessible record reading mode",
    });
    await reading.waitFor({ state: "visible" });
    await journey(page).waitFor({ state: "hidden" });
    assert.equal(await page.locator(".webgl-host canvas").count(), 0);
    if (await inspector(page).count())
      await page.getByRole("button", { name: "Close reading panel" }).click();
    assert.deepEqual(
      await reading.locator(".reading-card h3").allTextContents(),
      expected.nodes.slice(0, 40).map((node) => node.title),
    );
    await reading.getByRole("button", { name: "Next page" }).click();
    assert.deepEqual(
      await reading.locator(".reading-card h3").allTextContents(),
      expected.nodes.slice(40).map((node) => node.title),
    );
    await reading.getByRole("button", { name: "Previous page" }).click();
    await capture(page, result, "reading-records");
    const node = expected.nodes.find(
      (node) =>
        node.kind === "record" &&
        node.item.response &&
        node.item.limitations.length,
    );
    assert.ok(node, "No retained response record is available for review");
    if (expected.nodes.indexOf(node) >= 40)
      await reading.getByRole("button", { name: "Next page" }).click();
    await reading
      .getByRole("button")
      .filter({
        has: page.getByRole("heading", { name: node.title, exact: true }),
      })
      .click();
    await assertProvenance(page, node.item);
    assert.ok(
      normalized(await inspector(page).innerText()).includes(
        normalized(node.item.response),
      ),
    );
    await capture(page, result, "response-and-provenance");
    await page.getByRole("button", { name: "Close reading panel" }).click();
    await page.getByRole("button", { name: "Explore", exact: true }).click();
    await assertSpatial(page);
    await delay(350);
    assert.equal(
      await journey(page).count(),
      0,
      "Returning from reading resumed a cancelled camera journey",
    );
  });

  await scenario(
    "06-webgl-unavailable",
    { unsupported: true },
    async (page, result) => {
      const reading = page.getByRole("region", {
        name: "Accessible record reading mode",
      });
      await reading.waitFor({ state: "visible" });
      assert.match(
        await page.getByRole("alert").innerText(),
        /3D is unavailable/,
      );
      assert.equal(await page.locator(".webgl-host canvas").count(), 0);
      assert.equal(
        await page
          .getByRole("button", { name: "Explore", exact: true })
          .isDisabled(),
        true,
      );
      const expected = await assertCounts(page);
      assert.equal(
        await reading.locator(".reading-card").count(),
        Math.min(40, expected.nodes.length),
      );
      await reading.locator(".reading-card").first().click();
      await assertProvenance(page, expected.nodes[0].item);
      assert.equal(
        await inspector(page)
          .getByRole("button", { name: "Find on felt", exact: true })
          .isDisabled(),
        true,
        "Find on felt must be disabled when WebGL is unavailable",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Follow thread", exact: true })
          .isDisabled(),
        true,
        "Follow thread must be disabled when WebGL is unavailable",
      );
      result.notes.push(
        "WebGL was deliberately unavailable before application startup; the fallback is not counted as a spatial-rendering pass.",
      );
      await capture(page, result, "unsupported-webgl-reading-fallback");
    },
  );

  await scenario("07-city-data-and-attribution", {}, async (page, result) => {
    await assertSpatial(page);
    const metadata = JSON.parse(
      await readFile(join(root, "src/assets/city-metadata.json"), "utf8"),
    );
    const attribution = page.locator(".city-attribution");
    assert.equal(
      await attribution.getByRole("link").getAttribute("href"),
      metadata.attributionUrl,
    );
    assert.ok((await attribution.innerText()).includes(metadata.attribution));
    await attribution.getByRole("button").click();
    const info = page.locator(".city-info");
    await info.waitFor({ state: "visible" });
    assert.match(
      normalized(await info.innerText()),
      /Provider rendering heights may come from tags, storeys or defaults/,
    );
    assert.match(
      normalized(await info.innerText()),
      /No pin or relationship is inferred/,
    );
    assert.match(
      normalized(await info.innerText()),
      /not verified measurements/,
    );
    for (const city of metadata.cities) {
      assert.equal(
        await info
          .getByRole("link", {
            name: `${city.name} · ${city.focus}`,
            exact: true,
          })
          .getAttribute("href"),
        city.sourceUrl,
      );
    }
    assert.equal(
      await info
        .getByRole("link", { name: "Open Database License", exact: true })
        .getAttribute("href"),
      metadata.licenseUrl,
    );
    const dataUrl = new URL(
      await info
        .locator('a[download][href="./data/city-buildings.json"]')
        .getAttribute("href"),
      page.url(),
    );
    assert.equal(dataUrl.pathname, `${prefix}data/city-buildings.json`);
    const dataResponse = await page.request.get(dataUrl.href);
    assert.equal(dataResponse.status(), 200);
    const cityData = await dataResponse.json();
    assert.deepEqual(
      cityData,
      JSON.parse(
        await readFile(join(root, "public/data/city-buildings.json"), "utf8"),
      ),
    );
    assert.equal(cityData.license, "ODbL-1.0");
    for (const city of cityData.cities)
      for (const building of city.buildings) {
        assert.ok(
          building.sourceUrl &&
            building.sourceVersion &&
            building.sourceTimestamp,
        );
        assert.equal(building.contextOnly, true);
        assert.ok(
          ["source-reported", "levels-derived", "assumed"].includes(
            building.heightBasis,
          ),
        );
      }
    const noticeUrl = new URL(
      await info
        .getByRole("link", { name: "Attribution notice", exact: true })
        .getAttribute("href"),
      page.url(),
    );
    assert.equal(noticeUrl.pathname, `${prefix}data/CITY-LICENSE-NOTICE.txt`);
    const notice = await page.request.get(noticeUrl.href);
    assert.equal(notice.status(), 200);
    assert.match(await notice.text(), /OpenStreetMap contributors/);
    assert.match(await notice.text(), /Open Database License/);
    await capture(page, result, "city-attribution-and-height-basis");
    await page.getByRole("button", { name: "Close city information" }).click();
    await page
      .getByRole("button", { name: "3D buildings on", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "3D buildings off", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
    assert.equal(await attribution.count(), 0);
    await page
      .getByRole("button", { name: "3D buildings off", exact: true })
      .click();
    await attribution.waitFor({ state: "visible" });
    await assertSpatial(page);
    result.notes.push(
      "The bounded retained derivative and license notice resolve below the repository subpath; live worldwide buildings use the separately credited OpenFreeMap vector source.",
    );
  });

  const cities = JSON.parse(
    await readFile(join(root, "src/assets/city-metadata.json"), "utf8"),
  ).cities;
  for (const [index, city] of cities.entries()) {
    await scenario(
      `${String(index + 8).padStart(2, "0")}-world-to-${city.id}`,
      {},
      async (page, result) => {
        await assertSpatial(page);
        const host = page.locator(".webgl-host");
        await until(
          async () =>
            Number(await host.getAttribute("data-country-base-features")) > 0,
          "Independent country-base geometry was not observed at world scale",
        );
        const initialCanvas = await page
          .locator(".webgl-host canvas")
          .elementHandle();
        await capture(page, result, "continuous-world-before-flight");
        await page.locator(".city-attribution").getByRole("button").click();
        await page
          .getByRole("button", { name: `Fly to ${city.name}`, exact: true })
          .click();
        await journey(page)
          .getByRole("button", { name: "Pause", exact: true })
          .waitFor();
        await until(
          async () => Number(await host.getAttribute("data-zoom")) > 3,
          "City flight did not leave world scale",
          25000,
        );
        await capture(page, result, "continuous-map-during-flight");
        await until(
          async () => {
            const state = await host.evaluate((element) => ({
              ...element.dataset,
            }));
            return (
              Math.abs(Number(state.zoom) - 16.3) < 0.06 &&
              Math.abs(Number(state.pitch) - 58) < 0.2
            );
          },
          "City destination did not reach zoom 16.3 and pitch 58",
          40000,
        );
        await journey(page).waitFor({ state: "hidden" });
        assert.equal(
          await page.locator(".room-caption").isVisible(),
          false,
          "World-scale introduction still obscures city-scale buildings",
        );
        const sameCanvas = await initialCanvas.evaluate(
          (element) => element === document.querySelector(".webgl-host canvas"),
        );
        assert.equal(
          sameCanvas,
          true,
          "City flight replaced the continuous-map canvas",
        );
        const state = await host.evaluate((element) => ({
          ...element.dataset,
        }));
        assert.ok(
          Math.abs(Number(state.centerLng) - city.center[0]) < 0.0002,
          "City longitude differs from its geographic destination",
        );
        assert.ok(
          Math.abs(Number(state.centerLat) - city.center[1]) < 0.0002,
          "City latitude differs from its geographic destination",
        );
        await until(
          async () =>
            Number(await host.getAttribute("data-building-features")) > 0,
          `No rendered building footprint feature was reported at ${city.name}; inspect tile/network errors`,
          30000,
        );
        assert.ok(
          result.responses.some(
            (response) =>
              response.url.startsWith(new URL(mapStyle.TILE_SOURCE).origin) &&
              response.status === 200,
          ),
          "No successful live vector-source response was observed",
        );
        await capture(page, result, "actual-building-footprints-at-city-scale");
        result.notes.push(
          `Same continuous map canvas, geographic center ${city.center.join(", ")}, tilted city zoom, and positive rendered building-feature count. Buildings remain geographic context, not inferred evidence sites.`,
        );
      },
    );
  }

  await scenario(
    "11-tile-network-unavailable",
    { blockTiles: true },
    async (page, result) => {
      await assertSpatial(page);
      await until(
        async () =>
          (await page
            .locator(".webgl-host")
            .getAttribute("data-tile-status")) === "unavailable",
        "Blocked tile source did not produce a distinct map status",
        25000,
      );
      assert.ok(
        result.blockedTileRequests.length > 0,
        "The tile-blocking control did not intercept a request",
      );
      assert.match(
        normalized(await page.locator(".map-status").innerText()),
        /country base and retained records remain available/,
      );
      await until(
        async () =>
          Number(
            await page
              .locator(".webgl-host")
              .getAttribute("data-country-base-features"),
          ) > 0,
        "Public-domain country geometry did not survive tile-source failure",
      );
      await assertCounts(page);
      assert.equal(
        await page
          .getByRole("button", { name: "Explore", exact: true })
          .isDisabled(),
        false,
      );
      await capture(
        page,
        result,
        "independent-country-base-without-live-tiles",
      );
      await page.getByRole("button", { name: "Reading", exact: true }).click();
      const reading = page.getByRole("region", {
        name: "Accessible record reading mode",
      });
      await reading.waitFor({ state: "visible" });
      const expected = await assertCounts(page);
      assert.equal(
        await reading.locator(".reading-card").count(),
        Math.min(40, expected.nodes.length),
      );
      await reading.locator(".reading-card").first().click();
      await assertProvenance(page, expected.nodes[0].item);
      result.notes.push(
        "The public vector-tile provider was deliberately blocked; retained records and independently bundled Natural Earth country geometry remained available. This does not count as a successful live-building review.",
      );
    },
  );

  let releaseFullChunk;
  let releaseMapChunk;
  await scenario(
    "12-full-default-map-and-counts",
    {
      query: "",
      budgetMs: 110000,
      skipReady: true,
      beforeNavigation: async (context) => {
        const gate = new Promise((resolve) => {
          releaseFullChunk = resolve;
        });
        const path = `${origin}${prefix}data/registry/${registryManifest.arrays[0].chunks[0].file}`;
        await context.route(path, async (route) => {
          await gate;
          await route.continue();
        });
        const mapGate = new Promise((resolve) => {
          releaseMapChunk = resolve;
        });
        await context.route(
          `${origin}${prefix}assets/${spatialAssetName}`,
          async (route) => {
            await mapGate;
            await route.continue();
          },
        );
      },
    },
    async (page, result) => {
      try {
        const progress = page.getByRole("progressbar", {
          name: "Verified registry chunks",
        });
        await progress.waitFor();
        await until(
          async () => Number(await progress.getAttribute("max")) === 96,
          "The complete manifest did not declare 96 chunks in the loading UI",
        );
        assert.equal(
          await page.locator(".evidence-app").count(),
          0,
          "The atlas opened before every declared chunk was verified",
        );
        assert.ok(Number(await progress.getAttribute("value")) < 96);
        await capture(
          page,
          result,
          "complete-registry-verification-in-progress",
        );
      } finally {
        releaseFullChunk();
      }
      try {
        await assertFullLoad(page, result);
        assert.equal(
          await page.locator(".webgl-host").count(),
          0,
          "Map host mounted before its deliberately delayed module loaded",
        );
        await capture(page, result, "full-registry-before-deferred-map-import");
      } finally {
        releaseMapChunk();
      }
      await assertSpatial(page);
      const factual = model.factualScene(fullScene);
      const geographic = geography.getGeographicScene(factual);
      assert.equal(geographic.nodes.length, 3856);
      assert.equal(geographic.unplacedNodes.length, 3997);
      const display = await assertSemanticDisplay(
        page,
        result,
        fullScene,
        fullScene.nodes[0].id,
        "world",
      );
      assert.equal(display.areaGroupCount, 42);
      assert.equal(display.countryStacks.size, 6);
      assert.equal(display.rendered.length, 3);
      assert.ok(
        display.groups.size < display.areaGroupCount,
        "World view did not summarize the 42 original areas into country stacks",
      );
      const heldIds = new Set(fullRegistry.held.map((row) => row.id));
      assert.ok(
        factual.nodes.every(
          (node) => !model.isHeldItem(fullRegistry, node.id) && node.item.status !== "not-drawn",
        ),
      );
      assert.ok(
        factual.edges.every(
          (edge) =>
            !model.isHeldItem(fullRegistry, edge.id) && edge.relationship.status !== "not-drawn",
        ),
      );
      await assertCountryBase(page);
      await capture(
        page,
        result,
        "complete-registry-world-and-explicit-counts",
      );
      await expandIndiaStack(page, display);
      const areas = await assertSemanticDisplay(
        page,
        result,
        fullScene,
        fullScene.nodes[0].id,
        "areas",
      );
      assert.equal(areas.groups.size, 42);
      assert.equal(areas.rendered.length, 60);
      assert.equal(
        await inspector(page).count(),
        0,
        "A UI-only country stack opened as if it were an original evidence item",
      );
      await assertCounts(page, {}, fullScene);
      await capture(page, result, "india-stack-expanded-to-original-areas");
      await page
        .getByRole("button", {
          name: "Search and read the registry",
          exact: true,
        })
        .click();
      const reader = await readerView(page, "items", 8086);
      assert.equal(await reader.locator(".reading-card").count(), 40);
      assert.deepEqual(
        await reader
          .locator("[data-record-id]")
          .evaluateAll((elements) =>
            elements.map((element) => element.dataset.recordId),
          ),
        fullScene.nodes.slice(0, 40).map((node) => node.id),
      );
      await reader.getByRole("button", { name: "Next page" }).click();
      await until(
        async () =>
          (await reader
            .locator("[data-record-id]")
            .first()
            .getAttribute("data-record-id")) === fullScene.nodes[40].id,
        "Reader did not advance to the next 40 retained items",
      );
      assert.deepEqual(
        await reader
          .locator("[data-record-id]")
          .evaluateAll((elements) =>
            elements.map((element) => element.dataset.recordId),
          ),
        fullScene.nodes.slice(40, 80).map((node) => node.id),
      );
      await until(
        async () =>
          reader.evaluate(
            (element) =>
              element.closest(".reading-surface")?.scrollTop === 0 &&
              document.activeElement ===
                element.querySelector(".reader-result-count"),
          ),
        "Next page did not reset the reader scroll and focus the new result range",
      );
      await capture(page, result, "full-reader-page-two");
      await reader.getByRole("button", { name: /^Relationships / }).click();
      const unfiltered = await assertCounts(page, {}, fullScene);
      await readerView(page, "relationships", unfiltered.edges.length);
      const firstPageIds = new Set(
        unfiltered.edges.slice(0, 40).map((edge) => edge.id),
      );
      const selectedEdge = display.candidates.find((edge) =>
        firstPageIds.has(edge.id),
      );
      assert.ok(
        selectedEdge,
        "No original cross-area relationship is available on the first reader page",
      );
      await reader
        .locator(`[data-record-id=${JSON.stringify(selectedEdge.id)}]`)
        .click();
      await assertProvenance(page, selectedEdge.relationship, fullRegistry);
      await page.getByRole("button", { name: "Explore", exact: true }).click();
      await assertSpatial(page);
      const selectedWorld = await assertSemanticDisplay(
        page,
        result,
        fullScene,
        selectedEdge.id,
        "world",
      );
      assert.equal(selectedWorld.counts.selectedAreaDetails, 2);
      assert.equal(selectedWorld.rendered[0].id, selectedEdge.id);
      await assertCountryBase(page);
      await assertProvenance(page, selectedEdge.relationship, fullRegistry);
      await capture(
        page,
        result,
        "selected-original-edge-across-country-stacks",
      );
      await expandIndiaStack(page, selectedWorld);
      const selectedAreas = await assertSemanticDisplay(
        page,
        result,
        fullScene,
        selectedEdge.id,
        "areas",
      );
      assert.equal(selectedAreas.rendered[0].id, selectedEdge.id);
      assert.equal(selectedAreas.groups.size, 42);
      await assertCounts(page, {}, fullScene);
      await assertProvenance(page, selectedEdge.relationship, fullRegistry);
      await capture(
        page,
        result,
        "selected-original-edge-after-stack-expansion",
      );
      await inspector(page)
        .getByRole("button", { name: "Save this evidence", exact: true })
        .click();
      const downloading = page.waitForEvent("download");
      await inspector(page)
        .getByRole("button", {
          name: "Export casebook with evidence",
          exact: true,
        })
        .click();
      const download = await downloading;
      const filename = join(
        output,
        "full-registry-semantic-zoom-casebook.json",
      );
      await download.saveAs(filename);
      const packet = JSON.parse(await readFile(filename, "utf8"));
      assert.equal(packet.registryUpdatedAt, fullRegistry.updatedAt);
      assert.ok(packet.relationships.some((row) => row.id === selectedEdge.id));
      for (const key of ["entities", "relationships", "records", "sources"]) {
        for (const row of packet[key]) {
          assert.deepEqual(
            row,
            fullRegistry[key].find((original) => original.id === row.id),
            `${key}: semantic zoom changed or fabricated an exported original object`,
          );
        }
      }
      assert.ok(
        selectedEdge.relationship.sourceIds.every((id) =>
          packet.sources.some((source) => source.id === id),
        ),
      );
      result.notes.push(
        "Default entry fetched all 96 verified chunks; 8,086 retained items include 7,853 factual-map-eligible items, with 3,856 area-anchored and 3,997 unplaced. Six UI-only country stacks expand to 42 original areas. Exact original rendered-edge IDs follow the 24-world/60-area caps; the selected original relationship, both endpoint details, provenance and exported source objects survive semantic zoom. Full-reader pagination resets scroll and focuses the new result range.",
      );
    },
  );

  await scenario(
    "13-full-reader-only-search-provenance-and-held",
    { query: "?mode=reading", budgetMs: 110000 },
    async (page, result) => {
      await assertFullLoad(page, result);
      await assertReaderOnly(page, result);
      const reader = await readerView(page, "items", 8086);
      const search = page.getByRole("textbox", {
        name: "Search retained records",
      });
      const node = fullScene.nodes[0];
      await search.fill(node.id);
      const searched = await assertCounts(page, { query: node.id }, fullScene);
      assert.ok(
        searched.nodes.some((result) => result.id === node.id),
        "Exact entity-ID search was suppressed by the default temporal lens",
      );
      await readerView(page, "items", searched.nodes.length);
      await reader
        .locator(`[data-record-id=${JSON.stringify(node.id)}]`)
        .click();
      await assertProvenance(page, node.item, fullRegistry);
      assert.equal(
        await inspector(page)
          .locator(".original-item-link")
          .getAttribute("href"),
        `../#${node.item.route}`,
      );
      assert.equal(
        await inspector(page)
          .locator(".original-item-link")
          .evaluate((element) => element.href),
        `${origin}/india-corporate-intelligence/#${node.item.route}`,
      );
      await capture(
        page,
        result,
        "searched-original-item-and-source-provenance",
      );
      await page.getByRole("button", { name: "Close reading panel" }).click();

      const source = fullRegistry.sources.find(
        (source) => source.id === node.item.sourceIds[0],
      );
      await search.fill(source.id);
      await reader.getByRole("button", { name: /^Sources / }).click();
      const sourceMatches = fullRegistry.sources.filter((row) =>
        [row.id, row.title, row.publisher, row.summary, row.url]
          .join(" ")
          .normalize("NFKC")
          .toLocaleLowerCase("en-IN")
          .includes(source.id.toLocaleLowerCase("en-IN")),
      );
      await readerView(page, "sources", sourceMatches.length);
      const card = reader.locator(
        `[data-source-id=${JSON.stringify(source.id)}]`,
      );
      assert.equal(
        await card.getByRole("link").getAttribute("href"),
        source.url,
      );
      await card.locator("summary").click();
      assert.ok((await card.innerText()).includes(source.id));
      assert.ok((await card.innerText()).includes(source.locator));
      await capture(page, result, "source-catalogue-retained-id-and-locator");

      await search.fill("");
      await reader.getByRole("button", { name: /^Relationships / }).click();
      const unfiltered = await assertCounts(page, {}, fullScene);
      await readerView(page, "relationships", unfiltered.edges.length);
      const edge = unfiltered.edges[0];
      await reader
        .locator(`[data-record-id=${JSON.stringify(edge.id)}]`)
        .click();
      await assertProvenance(page, edge.relationship, fullRegistry);
      await page.getByRole("button", { name: "Close reading panel" }).click();

      const heldIds = new Set(fullRegistry.held.map((row) => row.id));
      const held = fullScene.nodes.find(
        (node) =>
          node.kind === "record" &&
          heldIds.has(node.id) &&
          node.item.sourceIds.length > 0,
      );
      assert.ok(
        held,
        "No retained held response is available for the exclusion review",
      );
      await search.fill(held.id);
      await reader
        .getByRole("button", { name: /^Entities & records / })
        .click();
      const heldSearch = await assertCounts(
        page,
        { query: held.id },
        fullScene,
      );
      await readerView(page, "items", heldSearch.nodes.length);
      const heldCard = reader.locator(
        `[data-record-id=${JSON.stringify(held.id)}]`,
      );
      assert.equal(await heldCard.getAttribute("data-held"), "true");
      await heldCard.click();
      await assertProvenance(page, held.item, fullRegistry);
      await inspector(page).locator('[data-held-warning="true"]').waitFor();
      assert.equal(
        await inspector(page)
          .getByRole("button", { name: "Find on felt", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        Number(
          await page
            .locator(".evidence-app")
            .getAttribute("data-factual-items"),
        ),
        0,
        "A held-only record search must not indirectly admit its entity endpoints into the factual map",
      );
      await capture(
        page,
        result,
        "held-counter-context-excluded-from-factual-map",
      );
      await page.getByRole("button", { name: "Close reading panel" }).click();
      await search.fill("");
      await reader.getByRole("button", { name: /^Held review queue / }).click();
      await readerView(page, "held", 316);
      assert.equal(await reader.locator(".held-card").count(), 40);
      await capture(page, result, "held-review-catalogue");
      await assertReaderOnly(page, result);
      result.notes.push(
        "The reading-only route searched original item IDs, inspected original source URLs/IDs/locators and repository HashRouter destinations, retained relationships and held counter-context, without fetching deferred WebGL JavaScript or creating a WebGL context.",
      );
    },
  );

  let blockedRegistryUrl;
  await scenario(
    "14-full-chunk-failure-and-explicit-retry",
    {
      query: "?mode=reading",
      skipReady: true,
      budgetMs: 110000,
      beforeNavigation: async (context, result) => {
        blockedRegistryUrl = `${origin}${prefix}data/registry/${registryManifest.arrays[0].chunks[0].file}`;
        result.expectedFailedRequests.push(blockedRegistryUrl);
        result.blockedRegistryRequests = [];
        await context.route(blockedRegistryUrl, (route) => {
          result.blockedRegistryRequests.push(route.request().url());
          return route.abort("failed");
        });
      },
    },
    async (page, result) => {
      await page
        .getByRole("heading", {
          name: "Full registry is incomplete",
          exact: true,
        })
        .waitFor({ timeout: 30000 });
      assert.ok(result.blockedRegistryRequests.length > 0);
      assert.equal(
        await page.locator(".evidence-app").count(),
        0,
        "A partial registry was silently opened after a chunk failure",
      );
      assert.equal(
        await page.locator('[data-registry-state="error"]').count(),
        1,
      );
      assert.match(
        await page.getByRole("alert").innerText(),
        /Could not fetch registry data/,
      );
      assert.equal(
        await page
          .getByRole("link", { name: "Open preview subset instead" })
          .getAttribute("href"),
        `${prefix}?mode=reading&dataset=preview`,
      );
      await capture(page, result, "incomplete-registry-explicit-recovery");
      await page.context().unroute(blockedRegistryUrl);
      await page
        .getByRole("button", { name: "Retry full registry", exact: true })
        .click();
      await assertFullLoad(page, result);
      await readerView(page, "items", 8086);
      await assertReaderOnly(page, result);
      await capture(page, result, "complete-registry-after-retry");
      result.notes.push(
        "One declared registry chunk was deliberately unavailable. The interface refused a partial result, offered an explicit preview switch, and recovered the full registry only after retrying the now-available chunk.",
      );
    },
  );
  await scenario(
    "15-full-map-chunk-failure-preserves-reader",
    {
      query: "",
      budgetMs: 110000,
      beforeNavigation: async (context, result) => {
        const blocked = `${origin}${prefix}assets/${spatialAssetName}`;
        result.expectedFailedRequests.push(blocked);
        result.blockedMapRequests = [];
        await context.route(blocked, (route) => {
          result.blockedMapRequests.push(route.request().url());
          return route.abort("failed");
        });
      },
    },
    async (page, result) => {
      await assertFullLoad(page, result);
      const reading = page.getByRole("region", {
        name: "Accessible record reading mode",
      });
      await reading.waitFor({ timeout: 30000 });
      assert.ok(
        result.blockedMapRequests.length > 0,
        "The deferred map chunk was not actually blocked",
      );
      assert.match(
        await page.getByRole("alert").innerText(),
        /3D is unavailable/,
      );
      assert.equal(await page.locator(".webgl-host canvas").count(), 0);
      const reader = await readerView(page, "items", 8086);
      assert.equal(await reader.locator(".reading-card").count(), 40);
      assert.equal(
        await page
          .getByRole("button", { name: "Explore", exact: true })
          .isDisabled(),
        true,
      );
      const node = fullScene.nodes[0];
      await reader
        .locator(`[data-record-id=${JSON.stringify(node.id)}]`)
        .click();
      await assertProvenance(page, node.item, fullRegistry);
      assert.equal(
        await inspector(page)
          .getByRole("button", { name: "Find on felt", exact: true })
          .isDisabled(),
        true,
      );
      assert.equal(
        await page.locator('.evidence-app[data-dataset="full"]').count(),
        1,
      );
      assert.equal(new URL(page.url()).searchParams.has("dataset"), false);
      await capture(
        page,
        result,
        "full-reader-survives-deferred-map-chunk-failure",
      );
      result.notes.push(
        "The actual emitted SpatialWorld JavaScript request was deliberately rejected after all registry chunks verified. Its graphics-only boundary preserved full counts, readable provenance, and the original default dataset instead of evicting the reader or substituting preview data.",
      );
    },
  );
  await scenario(
    "16-historical-default-preview-and-invalid-query-gates",
    { query: "?mode=reading", budgetMs: 150000 },
    async (page, result) => {
      const routes = [
        {
          query: "?mode=reading",
          dataset: "full",
          label: "default without opt-in query",
        },
        {
          query: "?mode=reading&dataset=preview&review=historical-2025",
          dataset: "preview",
          label: "preview cannot enable review",
        },
        {
          query: "?mode=reading&review=unknown",
          dataset: "full",
          label: "unknown review rejected",
        },
        {
          query: "?mode=reading&review=historical-2025&review=historical-2025",
          dataset: "full",
          label: "duplicate review query rejected",
        },
      ];
      result.historicalRoutes = [];
      for (const [index, route] of routes.entries()) {
        if (index > 0) {
          const response = await page.goto(`${origin}${prefix}${route.query}`, {
            waitUntil: "domcontentloaded",
          });
          assert.equal(response.status(), 200);
          await page
            .getByRole("heading", { name: "The felt atlas", exact: true })
            .waitFor({ timeout: 45000 });
        }
        if (route.dataset === "full") await assertFullLoad(page, result);
        else await assertCounts(page);
        await assertReaderOnly(page, result);
        assert.equal(await historicalGate(page).count(), 0, route.label);
        assert.equal(await historicalDialog(page).count(), 0, route.label);
        assert.deepEqual(
          assetRequests(result, historicalDeferredAssets),
          [],
          "A disallowed route fetched deferred historical modules",
        );
        result.historicalRoutes.push({
          ...route,
          gateCount: 0,
          historicalRequests: 0,
        });
        await capture(
          page,
          result,
          route.dataset === "preview"
            ? "preview-does-not-enable-review"
            : `closed-gate-${index + 1}`,
        );
      }
      result.notes.push(
        "The default build leaves no-query, preview, unknown and duplicate-query entries base-only. No deferred historical module was requested. The exact-query route still requires a fresh Open before loading the manifest and payload."
      );
    },
  );

  if (expectHistoricalReview) {
    await scenario(
      "17-historical-explicit-reader-provenance-and-unchanged-graph",
      {
        query: "?review=historical-2025",
        budgetMs: 150000,
        beforeNavigation: (context) => installHistoricalDigestProbe(context),
      },
      async (page, result) => {
        await assertFullLoad(page, result);
        await assertSpatial(page);
        await assertCountryBase(page);
        await historicalGate(page).waitFor({ state: "visible" });
        await assertHistoricalBaseUnchanged(
          page,
          result,
          "before-explicit-open",
        );
        assert.deepEqual(
          assetRequests(
            result,
            new Set([historicalPayloadAsset, historicalPanelAsset]),
          ),
          [],
          "URL alone loaded historical payload or reader",
        );
        assert.equal(await historicalDialog(page).count(), 0);
        await page.locator(".webgl-host canvas").evaluate((element) => {
          window.__historicalBaseCanvas = element;
        });
        const opener = historicalGate(page).getByRole("button", {
          name: "Open historical review reader",
          exact: true,
        });
        await opener.focus();
        await page.keyboard.press("Enter");
        const dialog = await assertHistoricalReader(page, result);
        await exerciseReaderScroll(page, dialog, result, "desktop-historical-reader");
        assert.equal(
          await page
            .locator(".webgl-host canvas")
            .evaluate((element) => element === window.__historicalBaseCanvas),
          true,
          "Opening review replaced the existing factual-map canvas",
        );
        assert.ok(
          assetRequests(result, new Set([historicalPayloadAsset])).length > 0,
        );
        assert.ok(
          assetRequests(result, new Set([historicalPanelAsset])).length > 0,
        );
        await captureHistoricalSection(
          page,
          result,
          dialog.locator(".historical-review-content > header"),
          "reader-introduction-and-publication-block",
        );
        await captureHistoricalSection(
          page,
          result,
          dialog.getByRole("region", {
            name: "Historical identities and incorporation context",
          }),
          "identity-reuse-and-incorporation-limits",
        );
        for (const edge of historicalOverlay.additions.relationships) {
          await captureHistoricalSection(
            page,
            result,
            dialog.locator(
              `[data-review-relationship=${JSON.stringify(edge.id)}]`,
            ),
            `claim-${edge.originalId}`,
          );
        }
        for (const source of historicalOverlay.additions.sources) {
          await captureHistoricalSection(
            page,
            result,
            dialog
              .locator(`[data-source-id=${JSON.stringify(source.id)}]`)
              .first(),
            `primary-source-${source.originalId}`,
          );
        }
        await captureHistoricalSection(
          page,
          result,
          dialog.getByRole("region", { name: "Retained packet holds and graph exclusions" }),
          "all-publication-holds-and-overview-only-link",
        );
        await page.keyboard.press("Escape");
        await assertHistoricalFocusReturned(page, result, "Escape");
        await assertHistoricalBaseUnchanged(page, result, "after-Escape");
        assert.equal(
          await page
            .locator(".webgl-host canvas")
            .evaluate((element) => element === window.__historicalBaseCanvas),
          true,
        );
        const checksBefore = await page.evaluate(
          () => window.__historicalReviewVerification.payloadChecks,
        );
        await opener.click();
        await historicalDialog(page).waitFor({ state: "visible" });
        await until(
          async () =>
            (await page.evaluate(
              () => window.__historicalReviewVerification.payloadChecks,
            )) > checksBefore,
          "Reopening did not reverify the pinned historical payload",
        );
        await historicalDialog(page)
          .getByRole("button", { name: "Close review (Escape)", exact: true })
          .click();
        await assertHistoricalFocusReturned(page, result, "Close button");
        await assertHistoricalBaseUnchanged(page, result, "after-Close");
        result.historicalVerification = await page.evaluate(
          () => window.__historicalReviewVerification,
        );
        result.notes.push(
          "In the default build one exact query only revealed an opt-in prompt. A keyboard user click opened nine exact retained claims, their original primary-source destinations, issuer/date attribution, basis/control/payment limits, identity/incorporation cautions and publication holds. IRB remained the existing entity; new additions only offered the investigation overview. The original canvas, factual totals and exact original edge IDs survived. Escape and Close restored focus to the same Open button; reopening reverified the payload.",
        );
      },
    );

    await scenario(
      "18-historical-verification-failure-and-explicit-retry",
      {
        query: "?mode=reading&review=historical-2025",
        budgetMs: 100000,
        beforeNavigation: (context) =>
          installHistoricalDigestProbe(context, true),
      },
      async (page, result) => {
        await assertFullLoad(page, result);
        const beforeVerification = await page.evaluate(
          () => window.__historicalReviewVerification,
        );
        await historicalGate(page)
          .getByRole("button", {
            name: "Open historical review reader",
            exact: true,
          })
          .click();
        const alert = historicalGate(page).getByRole("alert");
        await alert.waitFor();
        assert.match(
          await alert.innerText(),
          /reviewed additions SHA-256 mismatch/,
        );
        assert.equal(await historicalDialog(page).count(), 0);
        assert.deepEqual(
          assetRequests(result, new Set([historicalPanelAsset])),
          [],
          "An unverified payload loaded the historical reader",
        );
        await assertHistoricalBaseUnchanged(
          page,
          result,
          "verification-rejected",
        );
        await assertReaderOnly(page, result);
        await capture(page, result, "hash-failure-keeps-complete-base-reader");
        assert.deepEqual(
          await page.evaluate(() => window.__historicalReviewVerification),
          {
            payloadChecks: 1,
            baseChecks: beforeVerification.baseChecks,
            mismatchesInjected: 1,
          },
        );
        await historicalGate(page)
          .getByRole("button", {
            name: "Retry verified historical review",
            exact: true,
          })
          .click();
        await assertHistoricalReader(page, result);
        await captureHistoricalSection(
          page,
          result,
          historicalDialog(page).getByRole("heading", { level: 1 }),
          "verified-reader-after-explicit-retry",
        );
        const verification = await page.evaluate(
          () => window.__historicalReviewVerification,
        );
        assert.equal(verification.payloadChecks, 2);
        assert.equal(verification.mismatchesInjected, 1);
        assert.equal(
          verification.baseChecks,
          beforeVerification.baseChecks + 1,
        );
        result.historicalVerification = verification;
        await historicalDialog(page)
          .getByRole("button", { name: "Close review (Escape)", exact: true })
          .click();
        await assertHistoricalFocusReturned(page, result, "retry then Close");
        await assertReaderOnly(page, result);
        result.notes.push(
          "One digest result for the exact retained additions bytes was deliberately replaced with a mismatch. The authentic payload file was never edited. Verification failed closed, left the complete base reader intact and did not load the review panel. Explicit retry reran genuine Web Crypto verification and recovered; the public graph remained blocked.",
        );
      },
    );

    for (const navigation of [false, true]) {
      let releasePayload;
      let payloadRequested;
      let payloadRouteFinished;
      const requested = new Promise((resolveRequested) => {
        payloadRequested = resolveRequested;
      });
      const completed = new Promise((resolveCompleted) => {
        payloadRouteFinished = resolveCompleted;
      });
      await scenario(
        navigation
          ? "20-historical-back-forward-cancels-stale-load"
          : "19-historical-cancel-loading-and-preserve-base-url",
        {
          query:
            "?mode=reading&review=historical-2025&case=qualification#reader",
          budgetMs: 100000,
          afterScenario: () => releasePayload?.(),
          beforeNavigation: async (context, result) => {
            await installHistoricalDigestProbe(context);
            const release = new Promise((resolveRelease) => {
              releasePayload = resolveRelease;
            });
            const payloadUrl = `${origin}${prefix}assets/${historicalPayloadAsset}`;
            result.delayedHistoricalRequests = [];
            await context.route(payloadUrl, async (route) => {
              result.delayedHistoricalRequests.push(route.request().url());
              payloadRequested();
              await release;
              try {
                await route.continue();
              } finally {
                payloadRouteFinished();
              }
            });
          },
        },
        async (page, result) => {
          await assertFullLoad(page, result);
          const reviewUrl = page.url();
          const baseHref = historical.withoutHistoricalReview(reviewUrl);
          const gate = historicalGate(page);
          await gate.waitFor({ state: "visible" });
          assert.equal(
            await gate
              .getByRole("link", {
                name: "Return to base-only URL",
                exact: true,
              })
              .getAttribute("href"),
            baseHref,
          );
          if (navigation)
            await page.evaluate(
              ({ baseHref, reviewUrl }) => {
                history.replaceState({ review: "base" }, "", baseHref);
                history.pushState({ review: "candidate" }, "", reviewUrl);
              },
              { baseHref, reviewUrl },
            );
          const baseChecks = await page.evaluate(
            () => window.__historicalReviewVerification.baseChecks,
          );
          const opener = gate.getByRole("button", {
            name: "Open historical review reader",
            exact: true,
          });
          await opener.click();
          await requested;
          await gate.getByRole("status").waitFor();
          assert.equal(
            await opener.isDisabled(),
            true,
            "Repeated opt-in clicks were not disabled while loading",
          );
          await capture(page, result, "bounded-verification-loading-state");
          if (navigation) {
            await page.goBack({ waitUntil: "domcontentloaded" });
            await until(
              () =>
                Promise.resolve(
                  new URL(page.url()).searchParams.has("review") === false,
                ),
              "Back did not restore base-only URL",
            );
          } else
            await gate
              .getByRole("button", { name: "Dismiss review", exact: true })
              .click();
          await gate.waitFor({ state: "detached" });
          releasePayload();
          await completed;
          await until(
            async () =>
              (await page.evaluate(
                () => window.__historicalReviewVerification.baseChecks,
              )) > baseChecks,
            "Released historical verification never completed, so late-result cancellation was not exercised",
          );
          assert.equal(
            await historicalDialog(page).count(),
            0,
            "Canceled late verification opened a historical dialog",
          );
          assert.deepEqual(
            assetRequests(result, new Set([historicalPanelAsset])),
            [],
            "Canceled verification requested the review panel",
          );
          assert.equal(
            result.delayedHistoricalRequests.length,
            1,
            "Repeated loading admitted duplicate payload fetches",
          );
          result.historicalCanceledVerification = await page.evaluate(
            () => window.__historicalReviewVerification,
          );
          await assertHistoricalBaseUnchanged(
            page,
            result,
            navigation
              ? "after-Back-and-late-result"
              : "after-Dismiss-and-late-result",
          );
          if (navigation) {
            await page.goForward({ waitUntil: "domcontentloaded" });
            await until(
              () => Promise.resolve(page.url() === reviewUrl),
              "Forward did not restore the review URL",
            );
            assert.equal(
              await gate.count(),
              0,
              "Forward revived the old opt-in prompt/session",
            );
            assert.equal(
              await historicalDialog(page).count(),
              0,
              "Forward revived canceled historical evidence",
            );
            await capture(page, result, "forward-keeps-canceled-review-closed");
          } else {
            assert.equal(
              page.url(),
              reviewUrl,
              "Dismiss unexpectedly navigated or dropped unrelated query/hash",
            );
            await page.reload({ waitUntil: "domcontentloaded" });
            await assertFullLoad(page, result);
            await gate
              .getByRole("link", {
                name: "Return to base-only URL",
                exact: true,
              })
              .click();
            await until(
              () =>
                Promise.resolve(page.url() === new URL(baseHref, origin).href),
              "Base-only link failed to preserve unrelated query and hash",
            );
            await assertFullLoad(page, result);
            assert.equal(await gate.count(), 0);
            assert.equal(await historicalDialog(page).count(), 0);
            await capture(
              page,
              result,
              "base-only-link-preserves-unrelated-query-and-hash",
            );
          }
          await assertReaderOnly(page, result);
          result.historicalVerification = await page.evaluate(
            () => window.__historicalReviewVerification,
          );
          result.notes.push(
            navigation
              ? "Actual same-document Back/Forward canceled a pending payload import. The late exact-payload verification finished but never mounted the reader or replaced the base, and Forward did not revive the canceled session. This covers browser history, not a synthetic event dispatch."
              : "Dismiss canceled a real pending payload import. Its late valid result did not mount a reader or change the base. The explicit base-only link removed only the review parameter, preserving the case, reading mode and fragment.",
          );
        },
      );
      releasePayload?.();
    }
  }

  await scenario(
    "21-atlas-tutorial-explicit-progress-and-conditional-targets",
    {
      query: "?mode=reading",
      viewport: { width: 1440, height: 900 },
      budgetMs: 140000,
      beforeNavigation: (context) => installTutorialProbe(context),
    },
    async (page, result) => {
      await assertFullLoad(page, result);
      await assertReaderOnly(page, result);
      const before = await tutorialResearchState(page);
      const help = tutorialHelp(page);
      const dialog = tutorialDialog(page);
      await help.click();
      await assertTutorialStep(page, result, 0);
      await assertGuideButtonContrast(page, result, "desktop initial buttons");
      await assertGuideButtonContrast(page, result, "desktop actual Next hover", "pointer-hover");
      await capture(page, result, "desktop-guide-verified-pointer-hover");
      await dialog.getByRole("button", { name: "Next", exact: true }).click();
      await assertTutorialStep(page, result, 1);
      await assertTutorialUnchanged(page, result, before, "Next");
      await dialog.getByRole("button", { name: "Back", exact: true }).click();
      await assertTutorialStep(page, result, 0);
      await assertTutorialUnchanged(page, result, before, "Back");
      for (let index = 1; index < atlasGuide.steps.length; index += 1) {
        await dialog.getByRole("button", { name: "Next", exact: true }).click();
        await assertTutorialStep(
          page,
          result,
          index,
          [
            "inspect",
            "sources",
            "direction",
            "geography",
            "countercontext",
            "casebook",
            "original",
          ].includes(atlasGuide.steps[index].id)
            ? "absent"
            : undefined,
        );
        await assertTutorialUnchanged(
          page,
          result,
          before,
          `read retained step ${atlasGuide.steps[index].id}`,
        );
      }
      const last = atlasGuide.steps.length - 1;
      assert.equal(
        await dialog.getByRole("button", { name: "Next", exact: true }).count(),
        0,
      );
      await assertTutorialProgress(page, last, "active");
      await capture(page, result, "final-step-still-active-until-Finish");
      await dialog
        .getByRole("button", { name: "Close field guide", exact: true })
        .click();
      await assertTutorialFocusReturned(page);
      await assertTutorialProgress(page, last, "paused");
      await assertTutorialUnchanged(
        page,
        result,
        before,
        "Close final note does not complete",
      );
      await help.click();
      await assertTutorialStep(page, result, last);
      await dialog.getByRole("button", { name: "Finish", exact: true }).click();
      await assertTutorialFocusReturned(page);
      await assertTutorialProgress(page, last, "completed");
      await assertTutorialUnchanged(page, result, before, "explicit Finish");
      await help.click();
      await dialog
        .getByRole("button", { name: "Restart", exact: true })
        .click();
      await assertTutorialStep(page, result, 0);
      await assertTutorialProgress(page, 0, "active");
      await assertTutorialUnchanged(page, result, before, "explicit Restart");
      await dialog.getByRole("button", { name: "Next", exact: true }).click();
      await dialog.getByRole("button", { name: "Skip", exact: true }).click();
      await assertTutorialFocusReturned(page);
      await assertTutorialProgress(page, 1, "skipped");
      await assertTutorialUnchanged(page, result, before, "explicit Skip");
      await help.click();
      await assertTutorialStep(page, result, 1);
      await dialog.getByRole("button", { name: "Next", exact: true }).click();
      await dialog.getByRole("button", { name: "Next", exact: true }).click();
      await assertTutorialStep(page, result, 3, "absent");
      await capture(
        page,
        result,
        "missing-inspector-has-central-prerequisite-note",
      );
      await dialog
        .getByRole("button", { name: "Pause to try this", exact: true })
        .click();
      await assertTutorialFocusReturned(page);
      await assertTutorialProgress(page, 3, "paused");
      await assertTutorialUnchanged(
        page,
        result,
        before,
        "Pause leaves the actual exercise to the user",
      );

      const sources = new Map(
        fullRegistry.sources.map((source) => [source.id, source]),
      );
      const candidates = fullScene.nodes.filter(
        (node) => new Set(node.item.sourceIds).size >= 2,
      );
      candidates.sort((a, b) => {
        const length = (node) =>
          node.item.sourceIds.reduce(
            (total, id) =>
              total +
              (sources.get(id)?.title.length ?? 0) +
              (sources.get(id)?.locator.length ?? 0),
            0,
          );
        return length(a) - length(b);
      });
      const item = candidates[0];
      assert.ok(
        item,
        "The retained full registry has no genuine multi-source item for target ambiguity",
      );
      await page
        .getByRole("textbox", { name: "Search retained records" })
        .fill(item.id);
      const filtered = await assertCounts(page, { query: item.id }, fullScene);
      const reader = await readerView(page, "items", filtered.nodes.length);
      await reader
        .locator(`[data-record-id=${JSON.stringify(item.id)}]`)
        .click();
      await assertProvenance(page, item.item, fullRegistry);
      await inspector(page)
        .locator(".source-card")
        .first()
        .scrollIntoViewIfNeeded();
      await until(
        async () =>
          (await tutorialTargetCount(page, atlasGuide.steps[4].target)) >= 2,
        "Two real source cards were not visible; ambiguity cannot be claimed",
      );
      const afterUserChoice = await tutorialResearchState(page);
      await help.click();
      await assertTutorialStep(page, result, 3, "available");
      await assertTutorialUnchanged(
        page,
        result,
        afterUserChoice,
        "Help resumes the paused step after manual item selection",
      );
      await dialog.getByRole("button", { name: "Next", exact: true }).click();
      await assertTutorialStep(page, result, 4, "ambiguous");
      await capture(
        page,
        result,
        "multiple-real-sources-get-no-arbitrary-pointer",
      );
      await assertTutorialUnchanged(
        page,
        result,
        afterUserChoice,
        "ambiguous source note preserves evidence and links",
      );
      await dialog
        .getByRole("button", { name: "Pause to try this", exact: true })
        .click();
      await assertTutorialFocusReturned(page);
      await page
        .getByRole("button", { name: "Close reading panel", exact: true })
        .click();
      const afterManualClose = await tutorialResearchState(page);
      await help.click();
      await assertTutorialStep(page, result, 4, "absent");
      await assertTutorialUnchanged(
        page,
        result,
        afterManualClose,
        "missing source target remains an explanation",
      );
      await page.keyboard.press("Escape");
      await assertTutorialFocusReturned(page);
      await assertTutorialUnchanged(
        page,
        result,
        afterManualClose,
        "Escape after a manual exercise",
      );
      await assertReaderOnly(page, result);
      result.notes.push(
        "Only the 13 approved atlas notes were traversed. Every guide-only action preserved camera/filter/selection/source/casebook/audio/navigation snapshots. Close on the final step stayed paused; Finish, Skip and Restart changed only tutorial progress. Pause let the user open a real retained record, then Help resumed the same step. Missing targets and multiple real source cards produced central explanatory notes rather than selecting an arbitrary target. Original-route tutorials were not exercised.",
      );
    },
  );

  await scenario(
    "22-atlas-tutorial-mobile-reduced-motion-and-storage-fallback",
    {
      query: "?dataset=preview&mode=reading",
      viewport: { width: 390, height: 844 },
      reducedMotion: true,
      touch: true,
      budgetMs: 80000,
      beforeNavigation: (context) => installTutorialProbe(context, true),
    },
    async (page, result) => {
      await assertCounts(page);
      await assertReaderOnly(page, result);
      const before = await tutorialResearchState(page);
      const help = tutorialHelp(page);
      const dialog = tutorialDialog(page);
      const launcher = await help.boundingBox();
      assert.ok(await help.isVisible(), "Mobile Help must be visible");
      assert.ok(await help.isEnabled(), "Mobile Help must be enabled");
      assert.ok(
        launcher &&
          launcher.width >= 44 &&
          launcher.height >= 44 &&
          launcher.x >= 0 &&
          launcher.y >= 0 &&
          launcher.x + launcher.width <= 390 &&
          launcher.y + launcher.height <= 844,
        "Mobile Help must have a viewport-contained touch target of at least 44 CSS pixels",
      );
      assert.equal(
        await help.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return element.contains(
            document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            ),
          );
        }),
        true,
        "Another mobile control covers Help",
      );
      result.mobileHelpBounds = launcher;
      await capture(page, result, "mobile-visible-touch-help-launcher");
      await help.tap();
      await assertTutorialStep(page, result, 0);
      await capture(
        page,
        result,
        "mobile-central-guide-invalid-storage-safe-start",
      );
      const buttonCount = await dialog.locator("button:not(:disabled)").count();
      for (let index = 0; index < buttonCount + 2; index += 1) {
        await page.keyboard.press("Tab");
        assert.equal(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
          true,
          "Tab escaped the mobile tutorial dialog",
        );
      }
      for (let index = 0; index < buttonCount + 2; index += 1) {
        await page.keyboard.press("Shift+Tab");
        assert.equal(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
          true,
          "Shift+Tab escaped the mobile tutorial dialog",
        );
      }
      await dialog.getByRole("button", { name: "Next", exact: true }).click();
      await assertTutorialStep(page, result, 1);
      await dialog
        .getByText(
          "Tutorial progress could not be saved. It remains available in this tab.",
          { exact: true },
        )
        .waitFor();
      await assertTutorialUnchanged(
        page,
        result,
        before,
        "corrupt progress and denied tutorial-only storage",
      );
      await page.keyboard.press("Escape");
      await assertTutorialFocusReturned(page);
      await help.tap();
      await assertTutorialStep(page, result, 1);
      await assertTutorialUnchanged(
        page,
        result,
        before,
        "in-tab progress survives denied storage",
      );
      // Coarse-pointer touch input does not promise a persistent :hover state.
      // The desktop scenario separately requires actual hover; mobile retains
      // normal/focus contrast, touch activation and all focus/navigation gates.
      await assertGuideButtonContrast(page, result, "mobile after touch reopen");
      await assertGuideButtonContrast(page, result, "mobile focused Next", "focus");
      await capture(page, result, "mobile-reopened-progress-and-save-warning");
      await dialog
        .getByRole("button", { name: "Restart", exact: true })
        .click();
      await assertTutorialStep(page, result, 0);
      await dialog.getByRole("button", { name: "Skip", exact: true }).click();
      await assertTutorialFocusReturned(page);
      await assertTutorialUnchanged(
        page,
        result,
        before,
        "mobile Restart and Skip",
      );
      await assertReaderOnly(page, result);
      result.notes.push(
        "At 390×844 with reduced motion and touch emulation, a visible uncovered 44-pixel Help target opened and reopened the guide by tap. Malformed tutorial progress safely began at step one. Tutorial-only storage writes were deliberately denied; an honest warning appeared and in-tab progress survived Escape/reopen. Forward/reverse keyboard focus stayed in the native modal. Camera, audio, filters, selected evidence, original links and non-tutorial storage were unchanged. This is atlas preview-reading coverage, not an original-route tutorial result.",
      );
    },
  );
  await runSectorBrowserCases({ root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, until, report });
  await runSourceCorrectionBrowserCases({ root, output, scenario, capture, assertFullLoad, assertReaderOnly, until, fullRegistry });
  await scenario("29-qualified-readers-reserved-controls-and-reflow", {
    query: "?mode=reading&review=historical-2025", viewport: {width:640,height:450}, reducedMotion:true, budgetMs:120000,
  }, async (page,result) => {
    for (const type of ["historical", "sector"]) {
      if(type === "sector") await page.goto(`${origin}${prefix}?mode=reading&review=sector-2026-10`,{waitUntil:"domcontentloaded"});
      await assertFullLoad(page,result);await assertReaderOnly(page,result);
      const open = type === "historical" ? historicalGate(page).getByRole("button",{name:"Open historical review reader",exact:true}) : page.getByTestId("sector-reader-open");
      await open.click();
      const modal = type === "historical" ? historicalDialog(page) : page.getByTestId("sector-reader-dialog");
      await modal.waitFor({state:"visible"});
      for(const [name,viewport] of [["half-size-desktop",{width:640,height:450}],["narrow-mobile",{width:320,height:640}]]) {
        await page.setViewportSize(viewport);
        await exerciseReaderScroll(page,modal,result,`${type}:${name}`);
        const source = type === "historical" ? modal.locator("[data-review-relationship]").nth(1) : modal.locator('[data-sector-pair="wff-criticism-1"]').first();
        const sourceHeight = await source.evaluate(element => element.getBoundingClientRect().height);
        const bodyHeight = await modal.locator("[data-reader-scroll]").evaluate(element => element.clientHeight);
        assert.ok(sourceHeight > bodyHeight,"Long-source check must span more than one reader viewport");
        for(const [band,offset] of [["start",0],["midpoint",sourceHeight/2]]) {
          await source.evaluate((element,offset) => {const body=element.closest("[data-reader-scroll]");body.scrollTop+=element.getBoundingClientRect().top-body.getBoundingClientRect().top-12+offset;},offset);
          await measureReaderLayout(modal,result,`${type}:${name}:long-source-${band}`);
          await capture(page,result,`${type}-${name}-long-source-${band}-with-clear-controls`);
        }
        if(type === "sector") {
          await modal.getByRole("button",{name:"Thacker Pass · financing and ownership",exact:true}).click();
          const target=modal.locator('#sector-collection-energy-mineral-finance');
          assert.equal(await target.evaluate(element=>document.activeElement===element),true);
          const visible=await target.evaluate(element=>{const body=element.closest("[data-reader-scroll]");const a=element.getBoundingClientRect(),b=body.getBoundingClientRect();return a.top>=b.top-1 && a.top<b.bottom;});
          assert.equal(visible,true,"Collection jump must reveal its heading below the controls");
          await measureReaderLayout(modal,result,`${type}:${name}:collection-jump`);
        }
      }
      await page.keyboard.press("Escape");await modal.waitFor({state:"detached"});
      assert.equal(await open.evaluate(element=>document.activeElement===element),true);
    }
    result.notes.push("Both named keyboard-scroll regions kept Close in a separate non-scrolling row at top/middle/bottom and inside long source text. PageDown, visible focus, Escape/focus return, collection jumps and nested horizontal bounds passed at 320px and a 640×450 effective viewport. The latter covers the layout space of 200% zoom on 1280×900; it is not a browser-chrome zoom automation claim.");
  });

  const caseReviewContext = { root, dist, output, origin, prefix, scenario, capture, assertFullLoad, assertReaderOnly, assertSpatial, assertCountryBase, until, report, temporary };
  await runCaseWorkspaceBrowserCases(caseReviewContext);
  await runCaseGraphicsBrowserCases(caseReviewContext);

} catch (error) {
  report.setupError = error.stack ?? String(error);
  process.exitCode = 1;
  console.error(report.setupError);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server)
    await new Promise((resolveClosed) => {
      server.close(resolveClosed);
      server.closeAllConnections();
    });
  await rm(temporary, { recursive: true, force: true });
  report.finishedAt = new Date().toISOString();
  report.status = process.exitCode ? "failed" : "passed";
  await writeFile(
    join(output, "diagnostics.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  const summary = [
    "# Spatial prototype browser review",
    "",
    `Result: **${report.status}**`,
    `Preview path: ${prefix}`,
    `Review label: ${report.reviewLabel}`,
    `Expected historical mode: default build, exact query plus fresh Open`,
    "All positive and negative historical reader cases are mandatory for this next-release candidate.",
    `Checked out: ${report.revision?.checkedOutCommit ?? "unverified"}`,
    `Candidate head: ${report.revision?.candidateHead ?? "unverified"}`,
    `Revision coverage: ${report.revision?.mode ?? "unverified"}`,
    "",
    ...report.scenarios.map(
      (result) => `- ${result.status.toUpperCase()}: ${result.name}`,
    ),
    "",
    report.setupError
      ? `Setup failed: ${report.setupError.split("\n")[0]}`
      : "",
    "Screenshots, DOM snapshots, traces, source export and per-scenario diagnostics are in the review artifact.",
    "Software-rendered CI captures require visual/interaction inspection. This is not a pixel approval, hardware FPS benchmark, or deployment.",
  ]
    .filter(Boolean)
    .join("\n");
  await writeFile(join(output, "summary.md"), `${summary}\n`);
  console.log(summary);
}
