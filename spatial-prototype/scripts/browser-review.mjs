/** CI-only behavioral review. Deliberately never starts a local browser. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
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

async function assertCounts(page, filters = {}) {
  const expected = model.filterScene(preview, {
    fromYear: preview.yearRange[0],
    toYear: preview.yearRange[1],
    includeUndated: true,
    ...filters,
  });
  const geographic = geography.getGeographicScene(expected);
  const text = `${geographic.nodes.length} area-anchored records · ${geographic.unplacedNodes.length} in reading tray`;
  await until(
    async () =>
      normalized(await page.locator(".scene-overview p").innerText()) === text,
    `Scene counts did not match the retained model: ${text}`,
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
      actualTitles.map(normalized),
      expected.nodes.map((node) => node.title),
    );
  }
  return expected;
}

async function assertProvenance(page, item) {
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
  assert.ok((await panel.innerText()).includes(model.registry.updatedAt));
  const sourceIds = [
    ...new Set([
      ...item.sourceIds,
      ...item.geography.flatMap((geo) => geo.sourceIds),
    ]),
  ];
  assert.equal(await panel.locator(".source-card").count(), sourceIds.length);
  for (const [index, id] of sourceIds.entries()) {
    const source = model.registry.sources.find((source) => source.id === id);
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

async function scenario(name, options, work) {
  const result = {
    name,
    status: "running",
    screenshots: [],
    console: [],
    pageErrors: [],
    requestsFailed: [],
    responses: [],
    notes: [],
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
    await Promise.race([
      (async () => {
        const response = await page.goto(`${origin}${prefix}`, {
          waitUntil: "domcontentloaded",
        });
        assert.equal(response.status(), 200);
        await page
          .getByRole("heading", { name: "The felt atlas", exact: true })
          .waitFor();
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
              !request.error?.includes("ERR_ABORTED"),
          ),
          [],
          "A local app request failed",
        );
      })(),
      new Promise((_, reject) => {
        deadline = setTimeout(
          () =>
            reject(new Error("Scenario exceeded its 80-second review budget")),
          80000,
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
  for (const name of ["geography", "geoStyle"]) {
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
  preview = model.buildPreview();
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
    const record = page.locator(".accessible-node-list > button").first();
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
      expected.nodes.map((node) => node.title),
    );
    await capture(page, result, "reading-records");
    const node = expected.nodes.find(
      (node) =>
        node.kind === "record" &&
        node.item.response &&
        node.item.limitations.length,
    );
    assert.ok(node, "No retained response record is available for review");
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
        expected.nodes.length,
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
        expected.nodes.length,
      );
      await reading.locator(".reading-card").first().click();
      await assertProvenance(page, expected.nodes[0].item);
      result.notes.push(
        "The public vector-tile provider was deliberately blocked; retained records and independently bundled Natural Earth country geometry remained available. This does not count as a successful live-building review.",
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
