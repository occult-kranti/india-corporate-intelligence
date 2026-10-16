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

if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.SPATIAL_BROWSER_REVIEW !== "github-actions"
) {
  throw new Error(
    "Browser review is restricted to the GitHub Actions workflow. No local browser was launched.",
  );
}

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
  viewport,
  basePath: prefix,
  renderer: "Chromium / ANGLE SwiftShader (CI software rendering)",
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
let displayBudget;

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
        const canvas = document.querySelector(".webgl-host canvas");
        return Boolean(
          canvas &&
          canvas.width > 0 &&
          canvas.height > 0 &&
          document.querySelector(".webgl-host")?.dataset.renderer ===
            "maplibre-three-mercator" &&
          window.__spatialReviewGraphics.drawCalls > 0,
        );
      });
    },
    "No successful draw from the continuous MapLibre/Three renderer was observed",
    30000,
  );
  assert.equal(
    await page
      .getByRole("region", { name: "Accessible record reading mode" })
      .count(),
    0,
  );
}

async function assertCounts(page, filters = {}, base = preview) {
  const expected = model.filterScene(base, {
    fromYear: base.yearRange[0],
    toYear: base.yearRange[1],
    includeUndated: true,
    ...filters,
  });
  const factual = model.factualScene(expected);
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
      `${expected.nodes.length.toLocaleString("en-US")} filtered items`,
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
      normalized(await panel.locator(".small-copy").innerText()),
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
  };
  report.scenarios.push(result);
  let context;
  let page;
  let deadline;
  try {
    context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
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
  await build({
    entryPoints: [join(root, "src/model.ts")],
    outfile: join(temporary, "model.mjs"),
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
  });
  model = await import(pathToFileURL(join(temporary, "model.mjs")).href);
  for (const name of ["geography", "geoStyle", "displayBudget"]) {
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
    7859,
    "Factual exclusion baseline changed",
  );
  heavyAssetNames = new Set();
  for (const name of await readdir(join(dist, "assets"))) {
    if (/maplibre.*worker.*\.js$/.test(name)) heavyAssetNames.add(name);
    if (!name.endsWith(".js.map")) continue;
    const map = JSON.parse(await readFile(join(dist, "assets", name), "utf8"));
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
    await assertCounts(page);
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

  await scenario("02-keyboard-help-and-escape", {}, async (page, result) => {
    await assertSpatial(page);
    const help = page.getByRole("button", {
      name: "Help exploring the evidence room",
      exact: true,
    });
    await help.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });
    await capture(page, result, "keyboard-help");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await help.evaluate((element) => document.activeElement === element),
      true,
      "Help did not restore focus",
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
  });

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
    await page.getByRole("button", { name: "Reading", exact: true }).click();
    const reading = page.getByRole("region", {
      name: "Accessible record reading mode",
    });
    await reading.waitFor({ state: "visible" });
    assert.equal(await page.locator(".webgl-host canvas").count(), 0);
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
      await assertFullLoad(page, result);
      await assertSpatial(page);
      const factual = model.factualScene(fullScene);
      const geographic = geography.getGeographicScene(factual);
      assert.equal(geographic.nodes.length, 3856);
      assert.equal(geographic.unplacedNodes.length, 4003);
      const display = displayBudget.planGeographicDisplay(
        factual,
        fullScene.nodes[0].id,
      );
      await until(async () => {
        const state = await page
          .locator(".webgl-host")
          .evaluate((element) => ({ ...element.dataset }));
        return (
          Number(state.areaGroups) === display.groups.size &&
          Number(state.eligibleThreads) === display.candidates.length &&
          Number(state.renderedThreads) === display.rendered.length
        );
      }, "Full map area groups and original-thread budget differ from the factual registry");
      assert.ok(display.rendered.length <= 60);
      const heldIds = new Set(fullRegistry.held.map((row) => row.id));
      assert.ok(
        factual.nodes.every(
          (node) => !heldIds.has(node.id) && node.item.status !== "not-drawn",
        ),
      );
      assert.ok(
        factual.edges.every(
          (edge) =>
            !heldIds.has(edge.id) && edge.relationship.status !== "not-drawn",
        ),
      );
      await capture(
        page,
        result,
        "complete-registry-world-and-explicit-counts",
      );
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
      await capture(page, result, "full-reader-page-two");
      result.notes.push(
        "Default entry fetched all 96 verified chunks; 8,086 retained items include 7,859 factual-map-eligible items, with 3,856 area-anchored and 4,003 unplaced. Held metadata is preserved separately. At most 60 representative original cross-area threads are drawn.",
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
      assert.ok(
        !model
          .factualScene(heldSearch)
          .nodes.some((node) => node.id === held.id),
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
    "",
    ...report.scenarios.map(
      (result) => `- ${result.status.toUpperCase()}: ${result.name}`,
    ),
    "",
    report.setupError
      ? `Setup failed: ${report.setupError.split("\n")[0]}`
      : "",
    "Screenshots, DOM snapshots, traces, source export and per-scenario diagnostics are in the review artifact.",
    "Software-rendered CI captures require human visual review. This is not a pixel approval, hardware FPS benchmark, or deployment.",
  ]
    .filter(Boolean)
    .join("\n");
  await writeFile(join(output, "summary.md"), `${summary}\n`);
  console.log(summary);
}
